// `pnpm data:build`: turns the crawl cache into the committed snapshot
// (spec §8.3). It is offline: it reads only .cache/pc/ and the hand-curated
// files. The data checks fail the build; everything else it notices goes
// into the provenance file, src/data/pc/README.md.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { CACHE_DIR, type CacheEntry } from "./fetch.ts";
import { type Career, careerOf, type CoursePage, type ParsedGroup, parseCoursePage, parsePlanPage, type PlanPage, requirementGroups, sessionSlug } from "./parse.ts";
import { BASE, COMP_CODE, courseListUrl, pageUrl, planCodes, planKind, PROGRAMS, RULES_YEAR, YEARS } from "./scope.ts";

const OUT_DIR = "src/data/pc";

export interface PcCourse {
  code: string;
  subject: string;
  subjectName: string;
  catalogue: string;
  level: number;
  title: string;
  career: Career;
  units: number;
  description: string;
  requisites: string | null;
  pcUrl: string;
}
export interface PcClass {
  sessionId: string;
  classNumber: number;
  courseCode: string;
  mode: string;
  startDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  endDate: string;
  topic: string | null;
}
export interface PcPlan {
  code: string;
  name: string;
  kind: "program" | "major" | "specialisation";
  career: Career;
  units: number | null;
  acronym: string | null;
  postNominal: string | null;
  pcUrl: string;
}
export interface PcProgramPlan {
  programCode: string;
  planCode: string;
  position: number;
}
export interface PcRequirements {
  planCode: string;
  rulesYear: number;
  groups: (ParsedGroup & { position: number })[];
}
export interface CalendarSession {
  id: string;
  name: string;
  kind: "semester" | "intensive";
  year: number;
  startDate: string;
  endDate: string;
  examStart: string | null;
  examEnd: string | null;
  lastDayToAdd: string | null;
  censusDate: string | null;
  dropNoFailDate: string | null;
  enrolOpens: string | null;
  enrolOpensText: string | null;
  source: string;
}
export interface Overrides {
  times: { plan: string; code: string; times: number; why: string }[];
}
interface CourseListItem {
  CourseCode: string;
  Name: string;
  Units: number | string;
  Career: string;
}
export interface Page {
  code: string;
  url: string;
  /** null when P&C had no page (404 or soft 404). */
  html: string | null;
}
export interface BuildInput {
  fetchedOn: string;
  courseLists: Record<number, CourseListItem[]>;
  planPages: Page[];
  coursePages: Page[];
  calendar: CalendarSession[];
  overrides: Overrides;
  anuhub: { classNumber: number; courseCode: string }[];
}
export interface BuildOutput {
  courses: PcCourse[];
  classes: PcClass[];
  plans: PcPlan[];
  programPlans: PcProgramPlan[];
  requirements: PcRequirements[];
  snapshot: { fetchedOn: string; source: string; years: number[]; rulesYear: number; counts: Record<string, number> };
  provenance: string;
  errors: string[];
}

export function timesFor(overrides: Overrides, planCode: string): (code: string) => number {
  const mine = overrides.times.filter((o) => o.plan === planCode);
  return (code) => mine.find((o) => o.code === code)?.times ?? 1;
}

/** Drops courses the snapshot lacks from each group, recording them. A tracked group left with no courses becomes a note. */
export function finaliseGroups(groups: ParsedGroup[], known: (code: string) => boolean): { groups: ParsedGroup[]; dead: string[] } {
  const dead: string[] = [];
  const out = groups.map((g): ParsedGroup => {
    const courses = g.courses.filter((c) => {
      if (known(c.code)) return true;
      dead.push(c.code);
      return false;
    });
    return g.rule !== "note" && courses.length === 0 ? { ...g, label: "Note", rule: "note", minUnits: null, courses } : { ...g, courses };
  });
  return { groups: out, dead };
}

export function buildSnapshot(input: BuildInput): BuildOutput {
  const errors: string[] = [];
  const found = {
    missing: [] as string[],
    parseFailures: [] as string[],
    skipped: [] as string[],
    noClasses: [] as string[],
    outside: [] as string[],
    dead: [] as string[],
    notes: [] as string[],
    overrides: [] as string[],
    planLinks: [] as string[],
  };

  // 1. The COMP course lists: name, units and career come from here first (spec §8.3).
  const listed = new Map<string, CourseListItem>();
  const perYear: Record<number, number> = {};
  for (const year of YEARS) {
    const comp = (input.courseLists[year] ?? []).filter((i) => COMP_CODE.test(i.CourseCode));
    perYear[year] = comp.length;
    for (const item of comp) if (year === RULES_YEAR || !listed.has(item.CourseCode)) listed.set(item.CourseCode, item);
  }

  // 2. Course pages → courses and classes.
  const sessions = new Map(input.calendar.map((s) => [s.id, s]));
  const courses: PcCourse[] = [];
  const classes: PcClass[] = [];
  const seen = new Map<string, PcClass>();
  for (const page of input.coursePages) {
    if (page.html === null) {
      found.missing.push(`${page.code} — ${page.url}`);
      continue;
    }
    let parsed: CoursePage;
    try {
      parsed = parseCoursePage(page.html);
    } catch (err) {
      found.parseFailures.push(`${page.code} — ${page.url}: ${String(err)}`);
      continue;
    }
    const json = listed.get(parsed.code);
    const units = json ? Number(json.Units) : parsed.units;
    const career = (json ? careerOf(json.Career) : null) ?? parsed.career;
    if (units === null || !Number.isFinite(units)) {
      errors.push(`${parsed.code}: no unit value on ${page.url}`);
      continue;
    }
    if (!career) {
      errors.push(`${parsed.code}: no academic career on ${page.url}`);
      continue;
    }
    courses.push({
      code: parsed.code,
      subject: parsed.code.slice(0, 4),
      subjectName: parsed.subjectName ?? parsed.code.slice(0, 4),
      catalogue: parsed.code.slice(4),
      level: Number(parsed.code[4]) * 1000,
      title: json?.Name.trim() || parsed.title,
      career,
      units,
      description: parsed.description,
      requisites: parsed.requisites,
      pcUrl: page.url,
    });
    for (const s of parsed.skipped) {
      if ((YEARS as readonly number[]).includes(s.year)) found.skipped.push(`${parsed.code} class ${s.classNumber} (${s.year} ${s.sessionName}): ${s.reason}`);
    }
    let kept = 0;
    for (const o of parsed.offerings) {
      if (!(YEARS as readonly number[]).includes(o.year)) continue;
      const slug = sessionSlug(o.sessionName);
      if (!slug) {
        errors.push(`${parsed.code}: unknown session heading "${o.sessionName}" in its ${o.year} offerings`);
        continue;
      }
      const sessionId = `${o.year}-${slug}`;
      const session = sessions.get(sessionId);
      if (!session) {
        errors.push(`${parsed.code}: class ${o.classNumber} is in ${sessionId}, which calendar.json doesn't have`);
        continue;
      }
      const cls: PcClass = {
        sessionId,
        classNumber: o.classNumber,
        courseCode: parsed.code,
        mode: o.mode,
        startDate: o.startDate,
        lastDayToEnrol: o.lastDayToEnrol,
        censusDate: o.censusDate,
        endDate: o.endDate,
        topic: o.topic,
      };
      const key = `${sessionId}#${o.classNumber}`;
      const prior = seen.get(key);
      if (prior) {
        if (JSON.stringify(prior) !== JSON.stringify(cls)) errors.push(`${key} is listed for both ${prior.courseCode} and ${cls.courseCode}`);
        continue;
      }
      seen.set(key, cls);
      classes.push(cls);
      kept++;
      if (cls.startDate < session.startDate || cls.endDate > session.endDate) {
        found.outside.push(`${parsed.code} class ${cls.classNumber} (${sessionId}) runs ${cls.startDate} to ${cls.endDate}; the session runs ${session.startDate} to ${session.endDate}`);
      }
    }
    if (kept === 0) found.noClasses.push(parsed.code);
  }
  const unitsByCode = new Map(courses.map((c) => [c.code, c.units]));
  const known = (code: string): boolean => unitsByCode.has(code);

  // 3. Plan pages → plans and requirements.
  const programsOf = new Map<string, string[]>();
  for (const p of PROGRAMS) for (const plan of p.plans) programsOf.set(plan, [...(programsOf.get(plan) ?? []), p.code]);
  const careerOfScope = (code: string): Career =>
    PROGRAMS.find((p) => p.code === code)?.career ?? PROGRAMS.find((p) => p.code === programsOf.get(code)?.[0])?.career ?? "UGRD";
  const pages = new Map<string, PlanPage>();
  const plans: PcPlan[] = [];
  const requirements: PcRequirements[] = [];
  for (const page of input.planPages) {
    if (page.html === null) {
      errors.push(`${page.code}: P&C has no page at ${page.url}`);
      continue;
    }
    const parsed = parsePlanPage(page.html);
    if (parsed.code !== page.code) errors.push(`${page.url} is ${parsed.code}, not ${page.code}`);
    pages.set(page.code, parsed);
    plans.push({
      code: page.code,
      name: parsed.name,
      kind: planKind(page.code),
      career: parsed.career ?? careerOfScope(page.code),
      units: parsed.units,
      acronym: parsed.acronym,
      postNominal: parsed.postNominal,
      pcUrl: page.url,
    });
    const raw = requirementGroups(parsed.requirements, (c) => unitsByCode.get(c), timesFor(input.overrides, page.code));
    const { groups, dead } = finaliseGroups(raw, known);
    for (const code of dead) found.dead.push(`${page.code} links ${code}, which has no P&C course page in the snapshot`);
    for (const g of groups) if (g.rule === "note") found.notes.push(`${page.code}: “${g.text.split("\n")[0]}”${g.text.includes("\n") ? " …" : ""}`);
    requirements.push({ planCode: page.code, rulesYear: RULES_YEAR, groups: groups.map((g, i) => ({ position: i + 1, ...g })) });
  }
  const programPlans: PcProgramPlan[] = PROGRAMS.flatMap((p) => p.plans.map((planCode, i) => ({ programCode: p.code, planCode, position: i + 1 })));
  for (const { programCode, planCode } of programPlans) {
    const byProgram = pages.get(programCode)?.childPlans.includes(planCode) ?? false;
    const byPlan = pages.get(planCode)?.relevantDegrees.includes(programCode) ?? false;
    if (!byProgram || !byPlan) {
      found.planLinks.push(`${programCode} ↔ ${planCode}: the program page ${byProgram ? "links" : "doesn't link"} the plan; the plan page ${byPlan ? "lists" : "doesn't list"} the program under Relevant Degrees`);
    }
  }
  for (const o of input.overrides.times) {
    const hit = requirements.find((r) => r.planCode === o.plan)?.groups.some((g) => g.courses.some((c) => c.code === o.code));
    if (hit) found.overrides.push(`${o.plan}: ${o.code} × ${o.times} — ${o.why}`);
    else errors.push(`override ${o.plan}/${o.code} matches no requirement group`);
  }

  // 4. Data checks (spec §8.3). Session existence and uniqueness were checked above.
  for (const r of requirements) for (const g of r.groups) for (const c of g.courses) if (!known(c.code)) errors.push(`${r.planCode} requires ${c.code}, which isn't in courses`);

  // 5. The ANUHub cross-check: P&C wins, and every difference is listed.
  const careerByCode = new Map(courses.map((c) => [c.code, c.career]));
  const snap = new Map(
    classes.filter((c) => c.sessionId === "2026-S2" && c.courseCode.startsWith("COMP") && careerByCode.get(c.courseCode) === "PGRD").map((c) => [c.classNumber, c.courseCode]),
  );
  const live = new Map(input.anuhub.map((c) => [c.classNumber, c.courseCode]));
  const cross: string[] = [];
  let agree = 0;
  for (const [n, code] of live) {
    const ours = snap.get(n);
    if (ours === code) agree++;
    else if (ours) cross.push(`class ${n} is ${code} in ANUHub but ${ours} in P&C`);
    else cross.push(`ANUHub lists ${code} class ${n}; P&C doesn't${known(code) ? ` (P&C has ${code}, but not this class in Second Semester 2026)` : ` (${code} isn't a P&C course)`}`);
  }
  for (const [n, code] of snap) if (!live.has(n)) cross.push(`P&C lists ${code} class ${n}; ANUHub's live list didn't show it`);

  courses.sort((a, b) => (a.code < b.code ? -1 : 1));
  classes.sort((a, b) => (a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : a.classNumber - b.classNumber));
  requirements.sort((a, b) => (a.planCode < b.planCode ? -1 : 1));
  const counts = { courses: courses.length, classes: classes.length, plans: plans.length, requirementGroups: requirements.reduce((n, r) => n + r.groups.length, 0) };
  const classesPerYear = Object.fromEntries(YEARS.map((y) => [y, classes.filter((c) => c.sessionId.startsWith(String(y))).length]));

  const list = (items: string[]): string => (items.length > 0 ? items.map((i) => `- ${i}`).join("\n") : "- none");
  const provenance = `# P&C snapshot — provenance

Fetched on **${input.fetchedOn}** from Programs & Courses (${BASE}) by
\`pnpm data:fetch\` (\`scripts/pc/fetch.ts\`), then normalised offline by
\`pnpm data:build\` (\`scripts/pc/build.ts\`). The app seeds from these files
at boot. Nothing in them is invented: every value is P&C's, and the few
facts its prose can't carry are overrides, listed below.

## Files

| File | Holds | Source |
|---|---|---|
| \`courses.json\` | ${counts.courses} courses | \`${BASE}/<year>/course/<code>\`: title, units, career, subject, description (the introduction) and requisites. For COMP courses, name, units and career come first from the course-list JSON (\`/data/CourseSearch/GetCourses?SearchText=COMP&SelectedYear=<year>…\`). |
| \`classes.json\` | ${counts.classes} classes | The "Offerings, Dates and Class Summary Links" table on each course page. Only the ${YEARS.join(" and ")} tabs are kept. Session names map to \`src/data/calendar.json\`. |
| \`plans.json\` | ${counts.plans} plans | \`${BASE}/${RULES_YEAR}/program|major|specialisation/<code>\`: name, acronym, post-nominal and units. Program-to-plan links come from the crawl's scope (\`scripts/pc/scope.ts\`). |
| \`requirements.json\` | ${counts.requirementGroups} groups | The requirements section of each plan page, parsed by R1 (\`scripts/pc/parse.ts\`). Every group keeps P&C's sentence verbatim. |

## Counts per year

| Year | COMP courses in P&C's course list | Classes in the snapshot |
|---|---|---|
${YEARS.map((y) => `| ${y} | ${perYear[y]} | ${classesPerYear[y]} |`).join("\n")}

## Overrides applied (\`scripts/pc/overrides.json\`)

${list(found.overrides)}

## Requirement text kept as untracked notes

R1 tracks only course lists (spec D7). These paragraphs are shown verbatim
under "Other rules, not tracked":

${list(found.notes)}

## Missing pages and dead links

${list([...found.missing.map((m) => `no page: ${m}`), ...found.dead, ...found.parseFailures.map((p) => `didn't parse: ${p}`)])}

## Classes left out

A class whose enrolment dates P&C hasn't published can't be enrolled in,
so it's left out until P&C lists its dates. Its course and its other
classes stay. (One-cell group rows in the offerings tables that only name a
delivery mode, such as "On Campus" or "Online", aren't read as topics.)

${list(found.skipped)}

## Courses with no classes listed for ${YEARS.join("–")}

These show "No classes listed in P&C for 2026–2027" in the sidebar (spec §13):
${found.noClasses.length > 0 ? found.noClasses.join(", ") : "none"}.

## Classes outside their session's dates

Flagged only, since intensive classes vary (spec §8.3):

${list(found.outside)}

## Program ↔ plan links

${list(found.planLinks)}

## ANUHub cross-check (Second Semester 2026, postgraduate COMP)

The snapshot is compared with the ${input.anuhub.length} classes seen live
in ANUHub on 24 Sep 2026 (\`scripts/pc/anuhub-s2-2026.json\`). ${agree}
agree. P&C wins every difference:

${list(cross)}
`;

  return {
    courses,
    classes,
    plans,
    programPlans,
    requirements,
    snapshot: { fetchedOn: input.fetchedOn, source: BASE, years: [...YEARS], rulesYear: RULES_YEAR, counts },
    provenance,
    errors,
  };
}

function main(): void {
  const index = JSON.parse(readFileSync(`${CACHE_DIR}/index.json`, "utf8")) as { fetchedOn: string; entries: CacheEntry[] };
  const byUrl = new Map(index.entries.map((e) => [e.url, e]));
  const body = (url: string): string | null => {
    const e = byUrl.get(url);
    return !e || e.missing ? null : readFileSync(e.file, "utf8");
  };
  const courseLists = Object.fromEntries(
    YEARS.map((y) => [y, (JSON.parse(body(courseListUrl(y)) ?? '{"Items":[]}') as { Items: CourseListItem[] }).Items]),
  );
  const planPages = [...PROGRAMS.map((p) => p.code), ...planCodes()].map((code) => {
    const url = pageUrl(planKind(code), code);
    return { code, url, html: body(url) };
  });
  const byCourse = new Map<string, Page>();
  for (const e of index.entries) {
    const m = e.url.match(/\/course\/([A-Z]{4}\d{4})$/);
    if (!m) continue;
    const prior = byCourse.get(m[1]);
    if (!prior || prior.html === null) byCourse.set(m[1], { code: m[1], url: e.url, html: e.missing ? null : readFileSync(e.file, "utf8") });
  }
  const calendar = (JSON.parse(readFileSync("src/data/calendar.json", "utf8")) as { sessions: CalendarSession[] }).sessions;
  const overrides = JSON.parse(readFileSync("scripts/pc/overrides.json", "utf8")) as Overrides;
  const anuhub = (JSON.parse(readFileSync("scripts/pc/anuhub-s2-2026.json", "utf8")) as { classes: BuildInput["anuhub"] }).classes;

  const out = buildSnapshot({ fetchedOn: index.fetchedOn, courseLists, planPages, coursePages: [...byCourse.values()], calendar, overrides, anuhub });
  if (out.errors.length > 0) {
    for (const e of out.errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, data: unknown): void => writeFileSync(`${OUT_DIR}/${name}`, `${JSON.stringify(data, null, 2)}\n`);
  write("courses.json", out.courses);
  write("classes.json", out.classes);
  write("plans.json", { plans: out.plans, programPlans: out.programPlans });
  write("requirements.json", out.requirements);
  write("snapshot.json", out.snapshot);
  writeFileSync(`${OUT_DIR}/README.md`, out.provenance);
  console.log(`✓ snapshot: ${JSON.stringify(out.snapshot.counts)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
