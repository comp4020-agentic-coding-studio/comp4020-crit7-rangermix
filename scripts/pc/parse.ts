// Parsers for Programs & Courses (P&C) pages: HTML in, plain data out. The
// crawler (fetch.ts) and the snapshot build (build.ts) call them; the tests
// run them on the saved pages in scripts/pc/fixtures/.
import { JSDOM } from "jsdom";

export type Career = "UGRD" | "PGRD" | "RSCH";

export const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "27 Jul 2026" → "2026-07-27". Throws on anything else, so a format change fails the build loudly. */
export function parseDate(text: string): string {
  const m = squash(text).match(/^(\d{1,2}) ([A-Za-z]{3})[A-Za-z]* (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2].toLowerCase()) + 1 : 0;
  if (!m || month === 0) throw new Error(`unrecognised date "${text}"`);
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** P&C's session heading ("First Semester", "Winter Session") → the calendar's slug (spec §8.4). */
export function sessionSlug(heading: string): string | null {
  const h = heading.toLowerCase();
  if (h.includes("first semester")) return "S1";
  if (h.includes("second semester")) return "S2";
  if (/summer|quarter 1\b/.test(h)) return "SUM";
  if (/autumn|quarter 2\b/.test(h)) return "AUT";
  if (/winter|quarter 3\b/.test(h)) return "WIN";
  if (/spring|quarter 4\b/.test(h)) return "SPR";
  return null;
}

/** P&C answers a missing page with HTTP 200: a redirect to its error page, or a "Page not found" title (spec §8.2). */
export function isSoftNotFound(finalUrl: string, html: string): boolean {
  return /\/Error\/Index\/404/i.test(finalUrl) || /<title>[^<]*page not found/i.test(html);
}

export function careerOf(text: string | null | undefined): Career | null {
  const t = squash(text).toUpperCase();
  if (t.startsWith("UGRD") || t.startsWith("UNDERGRADUATE")) return "UGRD";
  if (t.startsWith("PGRD") || t.startsWith("POSTGRADUATE")) return "PGRD";
  if (t.startsWith("RSCH") || t.startsWith("RESEARCH")) return "RSCH";
  return null;
}

const load = (html: string): Document => new JSDOM(html).window.document;

/** The page's summary box ("Unit Value", "Academic career", …), keyed by lower-cased heading. P&C renders it twice; the desktop copy wins. */
function summary(d: Document): Map<string, string> {
  const box = d.querySelector(".degree-summary.hide-mobile") ?? d.querySelector(".degree-summary");
  const out = new Map<string, string>();
  for (const li of box?.querySelectorAll("li") ?? []) {
    const heading = li.querySelector(".degree-summary__requirements-heading, .degree-summary__code-heading");
    if (!heading) continue;
    const key = squash(heading.textContent).toLowerCase();
    if (!out.has(key)) out.set(key, squash((li.textContent ?? "").replace(heading.textContent ?? "", "")));
  }
  return out;
}

function unitsIn(text: string | undefined): number | null {
  const m = (text ?? "").match(/(\d+(?:\.\d+)?)\s*units?/i);
  return m ? Number(m[1]) : null;
}

function paragraphsOf(el: Element | null): string {
  if (!el) return "";
  const ps = [...el.querySelectorAll("p")].map((p) => squash(p.textContent)).filter(Boolean);
  return ps.length > 0 ? ps.join("\n\n") : squash(el.textContent);
}

export interface Offering {
  year: number;
  sessionName: string;
  classNumber: number;
  startDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  endDate: string;
  mode: string;
  topic: string | null;
}

/** A class row P&C lists without usable dates (e.g. "TBA"): left out of the snapshot and recorded. */
export interface SkippedClass {
  year: number;
  sessionName: string;
  classNumber: number;
  reason: string;
}

export interface CoursePage {
  code: string;
  title: string;
  units: number | null;
  career: Career | null;
  subjectName: string | null;
  mode: string | null;
  description: string;
  requisites: string | null;
  offerings: Offering[];
  skipped: SkippedClass[];
}

export function parseCoursePage(html: string): CoursePage {
  const d = load(html);
  const s = summary(d);
  const code = (s.get("code") ?? "").toUpperCase();
  if (!/^[A-Z]{4}\d{4}$/.test(code)) throw new Error(`no course code in the page's summary (found "${code}")`);
  return {
    code,
    title: squash(d.querySelector("h1.intro__degree-title")?.textContent),
    units: unitsIn(s.get("unit value")),
    career: careerOf(s.get("academic career")),
    subjectName: s.get("course subject") || null,
    mode: s.get("mode of delivery") || null,
    description: paragraphsOf(d.getElementById("introduction")),
    requisites: squash(d.querySelector("div.requisite")?.textContent) || null,
    ...offerings(d, code),
  };
}

const DATE = /^\d{1,2} [A-Za-z]{3,} \d{4}$/;
/** Group rows that name a delivery mode rather than a topic: P&C uses them to group a course's classes by mode. */
const DELIVERY_GROUP = /^(on[ -]?campus|off[ -]?campus|online|in[ -]?person|remote|hybrid)$/i;

/**
 * The "Offerings, Dates and Class Summary Links" tables: one tab per year,
 * an h3 per session, a table of classes under it. A one-cell row names the
 * topic of the classes below it, unless it only names their delivery mode.
 * A class whose dates aren't published ("TBA") is left out and recorded.
 */
function offerings(d: Document, code: string): { offerings: Offering[]; skipped: SkippedClass[] } {
  const tabYears = new Map<string, number>();
  for (const a of d.querySelectorAll('.course-tab a[href^="#course-tab-"]')) {
    const year = Number(squash(a.textContent));
    if (Number.isInteger(year) && year > 2000) tabYears.set((a.getAttribute("href") ?? "").slice(1), year);
  }
  const out: Offering[] = [];
  const skipped: SkippedClass[] = [];
  for (const [tabId, year] of tabYears) {
    const tab = d.getElementById(tabId);
    if (!tab) continue;
    let sessionName = "";
    for (const el of tab.querySelectorAll("h3, table.table-terms")) {
      if (el.tagName === "H3") {
        sessionName = squash(el.textContent);
        continue;
      }
      const heads = [...el.querySelectorAll("thead th")].map((th) => squash(th.textContent).toLowerCase());
      const col = (word: string, fallback: number): number => {
        const i = heads.findIndex((h) => h.includes(word));
        return i >= 0 ? i : fallback;
      };
      const at = { number: col("class number", 0), start: col("start", 1), enrol: col("last day", 2), census: col("census", 3), end: col("end date", 4), mode: col("mode", 5) };
      let topic: string | null = null;
      for (const tr of el.querySelectorAll("tbody tr")) {
        const cells = [...tr.querySelectorAll("td")];
        if (cells.length === 1) {
          const label = squash(cells[0].textContent);
          topic = label && !DELIVERY_GROUP.test(label) ? label : null;
          continue;
        }
        if (cells.length < 6) continue;
        const cell = (i: number): string => squash(cells[i]?.textContent);
        const classNumber = Number(cell(at.number));
        if (!Number.isInteger(classNumber) || classNumber <= 0) throw new Error(`${code}: bad class number "${cell(at.number)}"`);
        const dates = [cell(at.start), cell(at.enrol), cell(at.census), cell(at.end)];
        const unpublished = [...new Set(dates.filter((t) => !DATE.test(t)))];
        if (unpublished.length > 0) {
          skipped.push({ year, sessionName, classNumber, reason: `P&C lists its dates as ${unpublished.map((t) => `"${t}"`).join(", ")}` });
          continue;
        }
        out.push({
          year,
          sessionName,
          classNumber,
          startDate: parseDate(cell(at.start)),
          lastDayToEnrol: parseDate(cell(at.enrol)),
          censusDate: parseDate(cell(at.census)),
          endDate: parseDate(cell(at.end)),
          mode: cell(at.mode),
          topic,
        });
      }
    }
  }
  return { offerings: out, skipped };
}

export interface RequirementItem {
  text: string;
  /** Course codes the paragraph links to, in order, deduplicated. */
  codes: string[];
  /** For a course line — a paragraph that starts with a linked course code — that code. */
  lead: string | null;
}

export interface PlanPage {
  code: string;
  name: string;
  acronym: string | null;
  postNominal: string | null;
  units: number | null;
  career: Career | null;
  /** Programs a major or specialisation page lists under "Relevant Degrees". */
  relevantDegrees: string[];
  /** Majors and specialisations a program page links to. */
  childPlans: string[];
  /** The requirements section, as chunks: the paragraphs between empty <p>s. */
  requirements: RequirementItem[][];
}

function metaContent(d: Document, suffix: string): string | null {
  for (const kind of ["program", "major", "specialisation", "minor"]) {
    const value = squash(d.querySelector(`meta[name="${kind}-${suffix}"]`)?.getAttribute("content"));
    if (value) return value;
  }
  return null;
}

function linked(root: Element | Document | null, pattern: RegExp): string[] {
  const out = new Set<string>();
  for (const a of root?.querySelectorAll("a[href]") ?? []) {
    const m = (a.getAttribute("href") ?? "").match(pattern);
    if (m) out.add(m[1].toUpperCase());
  }
  return [...out];
}

export function parsePlanPage(html: string): PlanPage {
  const d = load(html);
  const s = summary(d);
  const code = metaContent(d, "code") ?? s.get("academic plan") ?? s.get("specialisation code") ?? s.get("major code") ?? "";
  if (!code) throw new Error("no plan code on the page");
  return {
    code: code.toUpperCase(),
    name: metaContent(d, "name") ?? squash(d.querySelector("h1.intro__degree-title")?.textContent),
    acronym: metaContent(d, "acronym"),
    postNominal: s.get("post nominal") || null,
    units: unitsIn(s.get("minimum") ?? s.get("total units")),
    career: careerOf(s.get("academic career")),
    relevantDegrees: linked(d.getElementById("relevant-degrees"), /\/program\/([A-Za-z0-9]+)/),
    childPlans: linked(d, /\/(?:major|specialisation)\/([A-Za-z0-9]+-(?:MAJ|SPEC))\b/),
    requirements: requirementChunks(d),
  };
}

const COURSE_HREF = /\/course\/([A-Za-z]{4}\d{4})\b/;

function requirementChunks(d: Document): RequirementItem[][] {
  const start =
    d.getElementById("program-requirements") ??
    d.getElementById("requirements") ??
    [...d.querySelectorAll("h2")].find((h) => /requirements/i.test(h.textContent ?? "")) ??
    null;
  if (!start) return [];
  const flat: (RequirementItem | null)[] = [];
  for (let el = start.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
    if (el.matches("a.back-to-top") || el.querySelector("a.back-to-top")) break;
    collect(el, flat);
  }
  const chunks: RequirementItem[][] = [[]];
  for (const item of flat) {
    if (item) chunks[chunks.length - 1].push(item);
    else if (chunks[chunks.length - 1].length > 0) chunks.push([]);
  }
  return chunks.filter((c) => c.length > 0);
}

/** Flattens the section into paragraphs (P, LI, table rows, headings). An empty <p> is a chunk break (null). A <p> split by <br>s yields one item per line. */
function collect(el: Element, out: (RequirementItem | null)[]): void {
  const tag = el.tagName;
  if (tag === "THEAD" || tag === "SCRIPT" || tag === "STYLE") return;
  if (["UL", "OL", "DIV", "SECTION", "TABLE", "TBODY"].includes(tag)) {
    for (const child of el.children) collect(child, out);
    return;
  }
  if (tag === "P" && el.querySelector("br")) {
    for (const part of el.innerHTML.split(/<br\s*\/?>/i)) {
      const holder = el.ownerDocument.createElement("p");
      holder.innerHTML = part;
      collect(holder, out);
    }
    return;
  }
  const text = squash(el.textContent);
  if (!text) {
    if (tag === "P") out.push(null);
    return;
  }
  const anchors = el.matches("a[href]") ? [el] : [...el.querySelectorAll("a[href]")];
  const codes = [...new Set(anchors.map((a) => (a.getAttribute("href") ?? "").match(COURSE_HREF)?.[1]?.toUpperCase()).filter((c): c is string => Boolean(c)))];
  const first = text.match(/^([A-Z]{4}\d{4})\b/)?.[1] ?? null;
  out.push({ text, codes, lead: first && codes.includes(first) ? first : null });
}

export interface ParsedCourse {
  code: string;
  times: number;
}

export interface ParsedGroup {
  label: string;
  rule: "all" | "units" | "note";
  minUnits: number | null;
  text: string;
  courses: ParsedCourse[];
}

/**
 * R1 (spec §8.3). A course line joins a run, and the run's heading is the
 * plain paragraph just before it. A paragraph with inline course links is
 * classified on its own. Other plain paragraphs in the same chunk merge into
 * one note. Anything R1 can't read with certainty becomes a verbatim note:
 * it never guesses.
 */
export function requirementGroups(
  chunks: RequirementItem[][],
  unitsOf: (code: string) => number | undefined,
  timesOf: (code: string) => number,
): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  const note = (text: string, codes: string[]): ParsedGroup => ({
    label: "Note",
    rule: "note",
    minUnits: null,
    text,
    courses: [...new Set(codes)].map((code) => ({ code, times: timesOf(code) })),
  });
  for (const chunk of chunks) {
    let plain: RequirementItem[] = [];
    const flush = (): void => {
      if (plain.length > 0) groups.push(note(plain.map((p) => p.text).join("\n"), []));
      plain = [];
    };
    let i = 0;
    while (i < chunk.length) {
      const item = chunk[i];
      if (item.lead) {
        const run: RequirementItem[] = [];
        while (i < chunk.length && chunk[i].lead) run.push(chunk[i++]);
        const heading = plain.pop()?.text ?? "";
        flush();
        const eitherOr = run.some((r) => r.codes.length > 1);
        if (!heading || eitherOr) {
          groups.push(note([heading, ...run.map((r) => r.text)].filter(Boolean).join("\n"), run.flatMap((r) => r.codes)));
        } else {
          groups.push(classify(heading, run.map((r) => r.lead as string), unitsOf, timesOf));
        }
        continue;
      }
      i++;
      if (item.codes.length > 0) {
        flush();
        groups.push(classify(item.text, item.codes, unitsOf, timesOf));
      } else {
        plain.push(item);
      }
    }
    flush();
  }
  return groups;
}

/** The rule a heading states over its courses (spec §8.3, R1). */
function classify(
  heading: string,
  codes: string[],
  unitsOf: (code: string) => number | undefined,
  timesOf: (code: string) => number,
): ParsedGroup {
  const courses = [...new Set(codes)].map((code) => ({ code, times: timesOf(code) }));
  const note: ParsedGroup = { label: "Note", rule: "note", minUnits: null, text: heading, courses };
  if (courses.length === 0 || /a maximum of/i.test(heading)) return note;
  // A note by its own words, or a sentence whose links are exclusions ("excluding COMP8715 …"): never a course list.
  if (/^note\b/i.test(heading) || /\bexclud|\bexcept\b|\bother than\b/i.test(heading)) return note;
  const n = Number(heading.match(/(\d+)\s*units/i)?.[1] ?? Number.NaN);
  const units = courses.map((c) => unitsOf(c.code));
  const total = units.every((u) => u !== undefined) ? courses.reduce((sum, c, k) => sum + (units[k] as number) * c.times, 0) : Number.NaN;
  const all = (label: string): ParsedGroup => ({ label, rule: "all", minUnits: null, text: heading, courses });
  if (/compulsory/i.test(heading)) return all("Compulsory");
  if (n === total) return all("All of");
  if (Number.isFinite(n) && /one of the following|a minimum of|units from/i.test(heading)) {
    // The listed courses can't make up N units, so this isn't a plain course list (AACOM's "completed twice" honours options).
    if (total < n) return note;
    return { label: /one of/i.test(heading) ? `${n} units from one of` : `${n} units from`, rule: "units", minUnits: n, text: heading, courses };
  }
  if (/the following courses/i.test(heading)) return all("All of");
  return note;
}
