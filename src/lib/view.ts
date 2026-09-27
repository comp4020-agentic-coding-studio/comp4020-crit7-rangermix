import { eq } from "drizzle-orm";
import snapshot from "../data/pc/snapshot.json";
import { realToday, today as todayFor } from "./clock";
import { db } from "./db";
import { addDays, countdown, fmtDate, fmtDay, fmtRange, fmtWeekday } from "./format";
import { classKey, type Ref, ref } from "./ref";
import { evaluateRequirements, type GroupInput, type Offer, type Take } from "./requirements";
import * as t from "./schema";
import { canAdd, canDrop, classify, dropDeadline, isPast } from "./sessions";
import type { StudentRecord } from "./student";
import type { AddState, Badge, BlockView, CourseMark, EnrolmentState, EnrolmentView, RequirementsView, SessionView, View } from "./types";

// buildView(student): the whole page state for one student (spec §4.1 a3).
// `/`, `/api/view` and every write return it, so what the page shows, what
// validation enforces and what the sidebar counts can never disagree.

export const SEMESTER_CAP = 24;
const FAIL_GRADES = new Set(["N", "NCN"]);

export interface EnrolmentRecord extends t.EnrolmentRow {
  cls: t.ClassRow;
  course: t.CourseRow;
  session: t.SessionRow;
}

/** A student's enrolments with their class, course and session, in session order, then course code. */
export function enrolmentRecords(studentId: number, r: Ref = ref()): EnrolmentRecord[] {
  const order = new Map(r.sessions.map((s, i) => [s.id, i]));
  return db
    .select()
    .from(t.enrolments)
    .where(eq(t.enrolments.studentId, studentId))
    .all()
    .map((e) => {
      const cls = r.classByKey.get(classKey(e.sessionId, e.classNumber)) as t.ClassRow;
      return { ...e, cls, course: r.courseByCode.get(cls.courseCode) as t.CourseRow, session: r.sessionById.get(e.sessionId) as t.SessionRow };
    })
    .sort((a, b) => (order.get(a.sessionId) ?? 0) - (order.get(b.sessionId) ?? 0) || (a.course.code < b.course.code ? -1 : a.course.code > b.course.code ? 1 : a.id - b.id));
}

/** Completion is derived, never stored (spec §5.3): a live enrolment in a finished session is completed, unless its grade is a fail. */
export function takeState(e: EnrolmentRecord, today: string): EnrolmentState {
  if (e.status === "dropped") return "dropped";
  if (!isPast(e.session, today)) return "enrolled";
  return e.grade !== null && FAIL_GRADES.has(e.grade) ? "failed" : "completed";
}

/**
 * A deadline that closes at the end of its day. Within a fortnight it reads as a countdown
 * (spec §15.4): "drop closes in 3 days (Wed 2 Jun)", "drop closes today"; further out it keeps
 * its plain form, "drop to 2 Jun".
 */
function deadline(today: string, iso: string, closes: string, plain: string, time = ""): string {
  const when = countdown(today, iso);
  if (when === null) return plain;
  if (when === "today") return `${closes} today${time ? ` at ${time}` : ""}`;
  return `${closes} ${when} (${fmtWeekday(iso)}${time ? `, ${time}` : ""})`;
}

function keyDates(s: t.SessionRow, today: string): string {
  const parts: string[] = [];
  if (s.kind === "intensive") {
    parts.push("dates vary by class");
  } else {
    if (s.examStart && s.examEnd) parts.push(`exams ${fmtRange(s.examStart, s.examEnd)}`);
    // ANU's pages give 11:59pm for the semester add deadline (research §1d).
    if (s.lastDayToAdd) {
      parts.push(today <= s.lastDayToAdd ? deadline(today, s.lastDayToAdd, "adding closes", `add until ${fmtDay(s.lastDayToAdd)}`, "11:59pm") : `add closed ${fmtDay(s.lastDayToAdd)}`);
    }
    if (s.censusDate) {
      const when = countdown(today, s.censusDate);
      parts.push(when === null ? `census ${fmtDay(s.censusDate)}` : when === "today" ? "census today" : `census ${when} (${fmtWeekday(s.censusDate)})`);
    }
    if (s.dropNoFailDate) parts.push(deadline(today, s.dropNoFailDate, "drop without failure closes", `drop without failure until ${fmtDay(s.dropNoFailDate)}`));
    if (s.examStart) {
      const last = addDays(s.examStart, -1);
      parts.push(deadline(today, last, "drop closes", `drop to ${fmtDay(last)}`));
    }
  }
  if (s.enrolOpens && s.enrolOpensText && today < s.enrolOpens) parts.push(`enrolment usually opens ${s.enrolOpensText}`);
  return parts.join(" · ");
}

function addState(s: t.SessionRow, today: string, r: Ref): AddState {
  const classes = r.classesBySession.get(s.id) ?? [];
  if (classes.length === 0) return { open: false, reason: `No classes are listed in P&C for ${s.name}.` };
  if (classes.some((c) => canAdd(c, today))) return { open: true };
  const last = classes.map((c) => c.lastDayToEnrol).sort()[classes.length - 1];
  return { open: false, reason: `Adding closed on ${fmtDay(last)}` };
}

function enrolmentView(e: EnrolmentRecord, today: string): EnrolmentView {
  const state = takeState(e, today);
  const droppable = state === "enrolled" && canDrop(e.cls, e.session, today);
  return {
    id: e.id,
    sessionId: e.sessionId,
    classNumber: e.classNumber,
    courseCode: e.course.code,
    title: e.course.title,
    units: e.course.units,
    mode: e.cls.mode,
    topic: e.cls.topic,
    startDate: e.cls.startDate,
    endDate: e.cls.endDate,
    censusDate: e.cls.censusDate,
    state,
    grade: e.grade,
    enrolledOn: e.enrolledOn,
    droppedOn: e.droppedOn,
    canDrop: droppable,
    dropNote: state === "enrolled" && !droppable ? `Self-service drop closed on ${fmtDate(dropDeadline(e.cls, e.session))}` : null,
  };
}

function sessionView(s: t.SessionRow, badge: Badge, records: EnrolmentRecord[], today: string, r: Ref): SessionView {
  const enrolments = records.map((e) => enrolmentView(e, today));
  const live = enrolments.filter((e) => e.state !== "dropped");
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    year: s.year,
    startDate: s.startDate,
    endDate: s.endDate,
    badge,
    fold: badge === "past" ? "past" : s.kind === "intensive" && records.length === 0 ? "intensive" : null,
    keyDates: keyDates(s, today),
    add: addState(s, today, r),
    cap: s.kind === "semester" ? SEMESTER_CAP : null,
    classCount: live.length,
    units: live.reduce((sum, e) => sum + e.units, 0),
    enrolments: [...live, ...enrolments.filter((e) => e.state === "dropped")],
  };
}

function requirementsView(
  student: StudentRecord,
  records: EnrolmentRecord[],
  badges: Map<string, Badge>,
  next: t.SessionRow | null,
  today: string,
  r: Ref,
): { view: RequirementsView; required: string[] } {
  const program = r.plans.get(student.programCode) as t.PlanRow;
  const plan = student.plans.length > 0 ? (r.plans.get(student.plans[0]) ?? null) : null;
  const groupsOf = (code: string, source: "program" | "plan"): GroupInput[] =>
    (r.groupsByPlan.get(code) ?? [])
      .filter((g) => g.rulesYear === student.rulesYear)
      .map((g) => ({ id: g.id, source, rule: g.rule, minUnits: g.minUnits, label: g.label, text: g.text, courses: g.courses }));
  const groups = [...groupsOf(program.code, "program"), ...(plan ? groupsOf(plan.code, "plan") : [])];
  const codes = [...new Set(groups.flatMap((g) => g.courses.map((c) => c.code)))];

  const takes: Take[] = records.flatMap((e): Take[] => {
    const state = takeState(e, today);
    if (state !== "enrolled" && state !== "completed") return [];
    return [{ courseCode: e.course.code, sessionId: e.sessionId, sessionName: e.session.name, state, current: badges.get(e.sessionId) === "now", grade: e.grade }];
  });
  const offers = new Map<string, Offer[]>();
  const listed = new Set<string>();
  for (const code of codes) {
    const classes = r.classesByCourse.get(code) ?? [];
    if (classes.length > 0) listed.add(code);
    const sessionIds = [...new Set(classes.filter((c) => canAdd(c, today)).map((c) => c.sessionId))];
    offers.set(
      code,
      sessionIds.map((id) => ({ sessionId: id, sessionName: (r.sessionById.get(id) as t.SessionRow).name, current: badges.get(id) === "now" })),
    );
  }
  const courses = new Map(
    codes.map((code) => {
      const c = r.courseByCode.get(code) as t.CourseRow;
      return [code, { title: c.title, units: c.units }] as const;
    }),
  );
  const result = evaluateRequirements({ groups, courses, takes, offers, listed, next: next ? { id: next.id, name: next.name } : null });

  const blocks: BlockView[] = [
    { source: "program" as const, title: "Program", groups: result.groups.filter((g) => g.source === "program") },
    ...(plan ? [{ source: "plan" as const, title: `${plan.kind === "major" ? "Major" : "Specialisation"} · ${plan.name}`, groups: result.groups.filter((g) => g.source === "plan") }] : []),
  ].filter((b) => b.groups.length > 0);
  return {
    view: {
      programCode: program.code,
      programName: program.name,
      programUrl: program.pcUrl,
      planCode: plan?.code ?? null,
      planName: plan?.name ?? null,
      planUrl: plan?.pcUrl ?? null,
      summary: result.summary,
      blocks,
      notes: result.notes,
    },
    required: [...new Set(result.groups.flatMap((g) => g.courses.map((c) => c.code)))],
  };
}

function marks(records: EnrolmentRecord[], today: string): Record<string, CourseMark> {
  const out: Record<string, CourseMark> = {};
  const completed = new Map<string, EnrolmentRecord[]>();
  for (const e of records) {
    const state = takeState(e, today);
    if (state !== "enrolled" && state !== "completed") continue;
    out[e.course.code] ??= { completed: null, enrolledIn: [] };
    if (state === "enrolled") out[e.course.code].enrolledIn.push(e.sessionId);
    else completed.set(e.course.code, [...(completed.get(e.course.code) ?? []), e]);
  }
  for (const [code, takes] of completed) {
    if (takes.length >= takes[0].course.maxTakes) out[code].completed = `Completed · ${takes[takes.length - 1].session.name}`;
  }
  return out;
}

/** The dates the demo can be set to: the span of the loaded sessions (spec §11.2). */
export function demoRange(r: Ref = ref()): { min: string; max: string } {
  return { min: r.sessions[0].startDate, max: r.sessions.map((s) => s.endDate).sort()[r.sessions.length - 1] };
}

export function buildView(student: StudentRecord): View {
  const r = ref();
  const today = todayFor(student);
  const { badges, nextId } = classify(r.sessions, today);
  const records = enrolmentRecords(student.id, r);
  const program = r.plans.get(student.programCode) as t.PlanRow;
  const plan = student.plans.length > 0 ? (r.plans.get(student.plans[0]) ?? null) : null;
  const requirements = requirementsView(student, records, badges, nextId ? (r.sessionById.get(nextId) ?? null) : null, today, r);
  return {
    today,
    snapshotDate: snapshot.fetchedOn,
    student: {
      name: student.name,
      uid: student.uid,
      programCode: program.code,
      programName: program.name,
      programShort: program.postNominal ?? program.acronym ?? program.code,
      career: program.career,
      planCode: plan?.code ?? null,
      planName: plan?.name ?? null,
    },
    sessions: r.sessions.map((s) => sessionView(s, badges.get(s.id) ?? "past", records.filter((e) => e.sessionId === s.id), today, r)),
    nextSemesterId: nextId,
    requirements: requirements.view,
    marks: marks(records, today),
    requiredCodes: requirements.required,
    demo: {
      today,
      override: student.today,
      realToday: realToday(),
      minDate: demoRange(r).min,
      maxDate: demoRange(r).max,
      programs: [...r.programPlans].map(([code, plans]) => ({
        code,
        name: r.plans.get(code)!.name,
        plans: plans.map((p) => ({ code: p, name: r.plans.get(p)!.name })),
      })),
    },
  };
}
