import { randomBytes } from "node:crypto";
import type { AstroCookies } from "astro";
import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_PROGRAM, TEMPLATES } from "../data/templates";
import { db } from "./db";
import { ApiError } from "./http";
import * as t from "./schema";

// The demo sandbox (spec §5.2). A GET without a cookie sees the default
// template student, read-only. The first write clones that template into a
// sandbox and sets `sid`. An unknown or malformed token counts as no cookie.

export const COOKIE = "sid";
const TOKEN = /^[A-Za-z0-9_-]{32}$/;

export interface StudentRecord {
  id: number;
  token: string | null;
  name: string;
  uid: string;
  programCode: string;
  rulesYear: number;
  commencedSessionId: string;
  /** M2's date setting (spec §11.3); null means the real date. */
  today: string | null;
  /** The student's major or specialisation (one in scope). */
  plans: string[];
}

function load(row: t.StudentRow | undefined): StudentRecord | null {
  if (!row) return null;
  const plans = db.select({ planCode: t.studentPlans.planCode }).from(t.studentPlans).where(eq(t.studentPlans.studentId, row.id)).all();
  return {
    id: row.id,
    token: row.token,
    name: row.name,
    uid: row.uid,
    programCode: row.programCode,
    rulesYear: row.rulesYear,
    commencedSessionId: row.commencedSessionId,
    today: row.today,
    plans: plans.map((p) => p.planCode),
  };
}

const byId = (id: number): StudentRecord => load(db.select().from(t.students).where(eq(t.students.id, id)).get()) as StudentRecord;

export function templateFor(programCode: string): StudentRecord | null {
  const tpl = TEMPLATES.find((x) => x.programCode === programCode);
  if (!tpl) return null;
  return load(
    db
      .select()
      .from(t.students)
      .where(and(isNull(t.students.token), eq(t.students.uid, tpl.uid)))
      .get(),
  );
}

function sandbox(cookies: AstroCookies): StudentRecord | null {
  const token = cookies.get(COOKIE)?.value;
  if (!token || !TOKEN.test(token)) return null;
  return load(db.select().from(t.students).where(eq(t.students.token, token)).get());
}

function defaultTemplate(): StudentRecord {
  const tpl = templateFor(DEFAULT_PROGRAM);
  if (!tpl) throw new Error(`the ${DEFAULT_PROGRAM} template student wasn't seeded`);
  return tpl;
}

/** The student a request sees: its sandbox, else the default template (read-only). */
export function studentFor(cookies: AstroCookies): StudentRecord {
  return sandbox(cookies) ?? defaultTemplate();
}

/** The request's sandbox. On the first write it's cloned from the default template, and the cookie is set. */
export function sandboxFor(cookies: AstroCookies): StudentRecord {
  return sandbox(cookies) ?? clone(defaultTemplate(), cookies);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function copyHistory(tx: Tx, fromId: number, toId: number): void {
  const plans = tx.select().from(t.studentPlans).where(eq(t.studentPlans.studentId, fromId)).all();
  if (plans.length > 0) {
    tx.insert(t.studentPlans)
      .values(plans.map((p) => ({ studentId: toId, planCode: p.planCode })))
      .run();
  }
  const rows = tx.select().from(t.enrolments).where(eq(t.enrolments.studentId, fromId)).all();
  if (rows.length > 0) {
    tx.insert(t.enrolments)
      .values(rows.map((e) => ({ studentId: toId, sessionId: e.sessionId, classNumber: e.classNumber, status: e.status, grade: e.grade, enrolledOn: e.enrolledOn, droppedOn: e.droppedOn })))
      .run();
  }
}

function clone(tpl: StudentRecord, cookies: AstroCookies): StudentRecord {
  const token = randomBytes(24).toString("base64url");
  const id = db.transaction((tx) => {
    const row = tx
      .insert(t.students)
      .values({ token, name: tpl.name, uid: tpl.uid, programCode: tpl.programCode, rulesYear: tpl.rulesYear, commencedSessionId: tpl.commencedSessionId, createdAt: new Date().toISOString() })
      .returning({ id: t.students.id })
      .get();
    copyHistory(tx, tpl.id, row.id);
    return row.id;
  });
  cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: import.meta.env.PROD, maxAge: 60 * 60 * 24 * 365 });
  return byId(id);
}

/** Replaces the sandbox's rows with a fresh clone of the program's template, keeping the cookie (spec §5.2, §11.3). */
export function resetSandbox(cookies: AstroCookies, programCode: string): StudentRecord {
  const tpl = templateFor(programCode);
  if (!tpl) throw new ApiError(400, "bad_field", `programCode: there's no demo student for ${programCode.slice(0, 20)}.`);
  const mine = sandbox(cookies);
  if (!mine) return clone(tpl, cookies);
  db.transaction((tx) => {
    tx.delete(t.enrolments).where(eq(t.enrolments.studentId, mine.id)).run();
    tx.delete(t.studentPlans).where(eq(t.studentPlans.studentId, mine.id)).run();
    tx.update(t.students)
      .set({ name: tpl.name, uid: tpl.uid, programCode: tpl.programCode, rulesYear: tpl.rulesYear, commencedSessionId: tpl.commencedSessionId })
      .where(eq(t.students.id, mine.id))
      .run();
    copyHistory(tx, tpl.id, mine.id);
  });
  return byId(mine.id);
}

export interface Settings {
  today?: string | null;
  programCode?: string;
  planCode?: string;
}

/** Stores the demo settings on the sandbox (spec §11.3, S1). The enrolment history is never touched. */
export function applySettings(student: StudentRecord, settings: Settings): StudentRecord {
  db.transaction((tx) => {
    const set: { today?: string | null; programCode?: string } = {};
    if (settings.today !== undefined) set.today = settings.today;
    if (settings.programCode !== undefined) set.programCode = settings.programCode;
    if (Object.keys(set).length > 0) tx.update(t.students).set(set).where(eq(t.students.id, student.id)).run();
    if (settings.planCode !== undefined) {
      tx.delete(t.studentPlans).where(eq(t.studentPlans.studentId, student.id)).run();
      tx.insert(t.studentPlans).values({ studentId: student.id, planCode: settings.planCode }).run();
    }
  });
  return byId(student.id);
}
