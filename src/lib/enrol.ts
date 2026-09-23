import { and, eq } from "drizzle-orm";
import { chooserFor } from "./catalogue";
import { db } from "./db";
import { parseEntry } from "./entry";
import { fmtDate, fmtUnits } from "./format";
import { classKey, ref } from "./ref";
import * as t from "./schema";
import { canAdd, canDrop, dropDeadline } from "./sessions";
import type { Career, Chooser, Outcome } from "./types";
import { enrolmentRecords, SEMESTER_CAP, takeState } from "./view";

// Enrol and drop (spec §6.3, §9). Every class gets its own outcome. A batch
// runs in one SQLite transaction that re-checks the rules against the rows
// as they stand, so one failure never blocks the others, and two tabs can't
// double-enrol.

export type EntryResolution = { kind: "classes"; classNumbers: number[] } | { kind: "choose"; chooser: Chooser } | { kind: "error"; message: string };

function sessionNames(ids: string[]): string {
  const r = ref();
  const names = ids.map((id) => r.sessionById.get(id)?.name ?? id);
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Turns what was typed into the classes to enrol, a chooser, or the message to show under the input. */
export function resolveEntry(raw: string, sessionId: string, today: string): EntryResolution {
  const r = ref();
  const session = r.sessionById.get(sessionId);
  if (!session) throw new Error(`resolveEntry: no session ${sessionId}`);
  const entry = parseEntry(raw);
  if (entry.kind === "invalid") return { kind: "error", message: "Enter a class number (digits) or a course code like COMP1100." };
  if (entry.kind === "class") {
    if (r.classByKey.has(classKey(sessionId, entry.number))) return { kind: "classes", classNumbers: [entry.number] };
    const elsewhere = r.sessionsOfClassNumber.get(entry.number) ?? [];
    return {
      kind: "error",
      message: elsewhere.length > 0 ? `${entry.number} is a ${sessionNames(elsewhere)} class number, not ${session.name}` : `There's no class ${entry.number} in the prototype's catalogue`,
    };
  }
  if (!r.courseByCode.has(entry.code)) return { kind: "error", message: `${entry.code} isn't in the prototype's catalogue` };
  const all = r.classesByCourse.get(entry.code) ?? [];
  const here = all.filter((c) => c.sessionId === sessionId);
  if (here.length === 1) return { kind: "classes", classNumbers: [here[0].classNumber] };
  const chooser = here.length > 1 ? chooserFor(entry.code, sessionId, today) : null;
  if (chooser) return { kind: "choose", chooser };
  const next = all.find((c) => canAdd(c, today));
  const tail = next
    ? `Next offered: ${r.sessionById.get(next.sessionId)?.name ?? next.sessionId}.`
    : all.length > 0
      ? "No other open classes listed in P&C for 2026–2027."
      : "No classes listed in P&C for 2026–2027.";
  return { kind: "error", message: `${entry.code} isn't offered in ${session.name}. ${tail}` };
}

const CAREER: Record<Career, string> = { UGRD: "undergraduate", PGRD: "postgraduate", RSCH: "research" };
const refused = (courseCode: string | null, classNumber: number, message: string): Outcome => ({ ok: false, courseCode, classNumber, message, warning: null });

/** Enrols each class in turn, in one transaction (spec §9). Repeated class numbers are processed once. */
export function enrolClasses(student: { id: number; programCareer: Career }, sessionId: string, classNumbers: number[], today: string): Outcome[] {
  const r = ref();
  const session = r.sessionById.get(sessionId);
  if (!session) throw new Error(`enrolClasses: no session ${sessionId}`);
  return db.transaction(() =>
    [...new Set(classNumbers)].map((n): Outcome => {
      const cls = r.classByKey.get(classKey(sessionId, n));
      if (!cls) {
        const elsewhere = r.sessionsOfClassNumber.get(n) ?? [];
        return refused(null, n, `Not added: class ${n} — ${elsewhere.length > 0 ? `it's a ${sessionNames(elsewhere)} class number, not ${session.name}` : "it isn't in the prototype's catalogue"}`);
      }
      const course = r.courseByCode.get(cls.courseCode) as t.CourseRow;
      const label = `${course.code} (class ${n})`;
      if (!canAdd(cls, today)) return refused(course.code, n, `Not added: ${label} — the last day to enrol was ${fmtDate(cls.lastDayToEnrol)}`);
      const mine = enrolmentRecords(student.id, r);
      const here = mine.filter((e) => e.status === "enrolled" && e.sessionId === sessionId);
      if (here.some((e) => e.classNumber === n)) return refused(course.code, n, `Not added: ${label} — you're already enrolled in this class`);
      if (here.some((e) => e.course.code === course.code && (e.cls.topic ?? "") === (cls.topic ?? ""))) {
        return refused(course.code, n, `Not added: ${label} — you're already enrolled in ${course.code} in ${session.name}`);
      }
      const completed = mine.filter((e) => e.course.code === course.code && takeState(e, today) === "completed");
      if (completed.length >= course.maxTakes) {
        const last = completed[completed.length - 1];
        return refused(course.code, n, `Not added: ${label} — you've already completed ${course.code} (${last.session.name}${last.grade ? `, ${last.grade}` : ""})`);
      }
      if (session.kind === "semester" && here.reduce((sum, e) => sum + e.course.units, 0) + course.units > SEMESTER_CAP) {
        return refused(course.code, n, `Not added: ${label} — Going over 24 units needs an Overload request through Manage my Degree`);
      }
      try {
        db.insert(t.enrolments).values({ studentId: student.id, sessionId, classNumber: n, status: "enrolled", grade: null, enrolledOn: today, droppedOn: null }).run();
      } catch (err) {
        // The partial unique index is the backstop behind the check above.
        if (String(err).includes("UNIQUE")) return refused(course.code, n, `Not added: ${label} — you're already enrolled in this class`);
        throw err;
      }
      const warning =
        course.career === student.programCareer
          ? null
          : `${course.code} is a ${CAREER[course.career]} course and your program is ${CAREER[student.programCareer]}, so it may not count towards your degree.`;
      return { ok: true, courseCode: course.code, classNumber: n, message: `Enrolled: ${course.code} ${course.title} (class ${n}, ${fmtUnits(course.units)})`, warning };
    }),
  );
}

/** Drops one class, if ANU's self-service rule still allows it (spec §5.3). */
export function dropClass(studentId: number, sessionId: string, classNumber: number, today: string): Outcome {
  const r = ref();
  const session = r.sessionById.get(sessionId);
  if (!session) throw new Error(`dropClass: no session ${sessionId}`);
  return db.transaction(() => {
    const row = db
      .select()
      .from(t.enrolments)
      .where(and(eq(t.enrolments.studentId, studentId), eq(t.enrolments.sessionId, sessionId), eq(t.enrolments.classNumber, classNumber), eq(t.enrolments.status, "enrolled")))
      .get();
    if (!row) return refused(null, classNumber, `Not dropped: you aren't enrolled in class ${classNumber} in ${session.name}`);
    const cls = r.classByKey.get(classKey(sessionId, classNumber)) as t.ClassRow;
    const course = r.courseByCode.get(cls.courseCode) as t.CourseRow;
    if (!canDrop(cls, session, today)) {
      return refused(course.code, classNumber, `Not dropped: ${course.code} (class ${classNumber}) — self-service drop closed on ${fmtDate(dropDeadline(cls, session))}`);
    }
    db.update(t.enrolments).set({ status: "dropped", droppedOn: today }).where(eq(t.enrolments.id, row.id)).run();
    return { ok: true, courseCode: course.code, classNumber, message: `Dropped: ${course.code} ${course.title} (class ${classNumber})`, warning: null };
  });
}
