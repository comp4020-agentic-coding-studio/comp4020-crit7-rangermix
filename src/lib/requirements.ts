import type { CourseStatusView, GroupState, GroupView, Icon, NoteView } from "./types";

// Requirement statuses (spec §5.3). Pure: the view layer passes the
// student's takes and the offers, and gets back what the sidebar shows.

/** A live enrolment that counts towards a requirement. Dropped and failed enrolments aren't takes. */
export interface Take {
  courseCode: string;
  sessionId: string;
  sessionName: string;
  state: "completed" | "enrolled";
  /** The session is Now. */
  current: boolean;
  grade: string | null;
}

/** A session in which the course has a class that can still be added. */
export interface Offer {
  sessionId: string;
  sessionName: string;
  current: boolean;
}

export interface GroupInput {
  id: number;
  source: "program" | "plan";
  rule: "all" | "units" | "note";
  minUnits: number | null;
  label: string;
  text: string;
  courses: { code: string; times: number }[];
}

export interface RequirementInput {
  /** In P&C order: the program's groups, then the plan's. */
  groups: GroupInput[];
  courses: Map<string, { title: string; units: number }>;
  /** In session order. */
  takes: Take[];
  /** Per course, the sessions with an addable class, in session order. */
  offers: Map<string, Offer[]>;
  /** Courses with any class in the snapshot. */
  listed: Set<string>;
  /** The next semester (spec D3). */
  next: { id: string; name: string } | null;
}

export interface RequirementResult {
  groups: (GroupView & { source: "program" | "plan" })[];
  notes: NoteView[];
  summary: { done: number; enrolled: number; total: number };
}

interface Counts {
  done: Take[];
  enrolled: Take[];
  /** Completed takes that count, capped at `times`. */
  doneN: number;
  /** Enrolled takes that count towards the takes still needed. */
  enrolledN: number;
}

function counts(code: string, times: number, input: RequirementInput): Counts {
  const takes = input.takes.filter((t) => t.courseCode === code);
  const done = takes.filter((t) => t.state === "completed");
  const enrolled = takes.filter((t) => t.state === "enrolled");
  const doneN = Math.min(done.length, times);
  return { done, enrolled, doneN, enrolledN: Math.min(enrolled.length, times - doneN) };
}

const withGrade = (t: Take): string => `${t.sessionName}${t.grade ? ` · ${t.grade}` : ""}`;

/** One course's status text (spec §5.3): completed takes count first, then enrolled takes. */
export function courseStatus(course: { code: string; times: number }, input: RequirementInput, groupSatisfied = false): CourseStatusView {
  const info = input.courses.get(course.code);
  const base = { code: course.code, title: info?.title ?? course.code, units: info?.units ?? 0, times: course.times };
  const c = counts(course.code, course.times, input);
  const take = (k: number): string => (course.times > 1 ? ` (${k} of ${course.times})` : "");

  // 1. Every take completed.
  if (c.doneN >= course.times) {
    return { ...base, icon: "done", text: `Completed · ${withGrade(c.done[course.times - 1])}`, add: null };
  }
  const prefix = c.doneN > 0 ? `Completed · ${withGrade(c.done[c.doneN - 1])}${take(c.doneN)} · ` : "";

  // 2 and 3. Enrolled takes, current sessions first (takes are in session order).
  if (c.enrolledN > 0) {
    const shown = c.enrolled.slice(0, c.enrolledN).map((t, i) => `${t.sessionName}${t.current ? " (now)" : ""}${take(c.doneN + i + 1)}`);
    const icon: Icon = c.doneN + c.enrolledN >= course.times ? "enrolled" : "partial";
    return { ...base, icon, text: `${prefix}Enrolled · ${shown.join(", ")}`, add: null };
  }

  // 4. Not enrolled.
  if (groupSatisfied && c.doneN === 0) return { ...base, icon: "none", text: "Not needed (group satisfied)", add: null };
  const icon: Icon = c.doneN > 0 ? "partial" : "todo";
  const offers = input.offers.get(course.code) ?? [];
  const next = input.next;
  if (next && offers.some((o) => o.sessionId === next.id)) {
    return { ...base, icon, text: `${prefix}Not enrolled`, add: { sessionId: next.id, label: `Add to ${next.name}` } };
  }
  const first = offers[0];
  const tail = first
    ? `Next offered: ${first.sessionName}${first.current ? " (now)" : ""}`
    : input.listed.has(course.code)
      ? "No more classes listed in P&C for 2026–2027"
      : "No classes listed in P&C for 2026–2027";
  return { ...base, icon, text: `${prefix}Not enrolled · ${tail}`, add: null };
}

/** Every group's state and courses, the untracked notes, and the summary line's numbers (spec §5.3). */
export function evaluateRequirements(input: RequirementInput): RequirementResult {
  const groups: RequirementResult["groups"] = [];
  const notes: NoteView[] = [];
  const summary = { done: 0, enrolled: 0, total: 0 };
  const unitsOf = (code: string): number => input.courses.get(code)?.units ?? 0;

  for (const g of input.groups) {
    if (g.rule === "note") {
      notes.push({ id: g.id, source: g.source, text: g.text, courses: g.courses.map((c) => courseStatus(c, input)) });
      continue;
    }
    const cs = g.courses.map((course) => ({ course, n: counts(course.code, course.times, input) }));
    let done = cs.reduce((sum, x) => sum + unitsOf(x.course.code) * x.n.doneN, 0);
    let enrolled = cs.reduce((sum, x) => sum + unitsOf(x.course.code) * x.n.enrolledN, 0);
    let total: number;
    let state: GroupState;
    if (g.rule === "all") {
      total = g.courses.reduce((sum, c) => sum + unitsOf(c.code) * c.times, 0);
      state = cs.every((x) => x.n.doneN >= x.course.times) ? "met" : cs.every((x) => x.n.doneN + x.n.enrolledN >= x.course.times) ? "in-progress" : "not-met";
    } else {
      total = g.minUnits ?? 0;
      state = done >= total ? "met" : done + enrolled >= total ? "in-progress" : "not-met";
      done = Math.min(done, total);
      enrolled = Math.min(enrolled, total - done);
    }
    const satisfied = g.rule === "units" && state !== "not-met";
    groups.push({ id: g.id, source: g.source, rule: g.rule, label: g.label, text: g.text, state, courses: g.courses.map((c) => courseStatus(c, input, satisfied)) });
    summary.done += done;
    summary.enrolled += enrolled;
    summary.total += total;
  }
  return { groups, notes, summary };
}
