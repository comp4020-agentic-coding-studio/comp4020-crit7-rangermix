import { and, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { SQLiteColumn, SQLiteTable, SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core";
import type { CalendarSession, PcClass, PcCourse, PcPlan, PcProgramPlan, PcRequirements } from "../../scripts/pc/build.ts";
import * as t from "../lib/schema";
import calendar from "./calendar.json";
import classesFile from "./pc/classes.json";
import coursesFile from "./pc/courses.json";
import plansFile from "./pc/plans.json";
import requirementsFile from "./pc/requirements.json";
import { type Template, TEMPLATES } from "./templates";

// Boot-time seeding (spec §8.5). The JSON is imported, so Vite bundles it
// into dist/ and the Docker image carries it. Rows that enrolments point at
// (sessions, subjects, courses, classes, plans) are upserted by natural key
// and never deleted, so a refreshed snapshot never orphans a sandbox. Rows
// nothing else points at — requirements, and the template students' plans
// and history — are rewritten (plan clarification 8).

export interface SeedData {
  sessions: CalendarSession[];
  courses: PcCourse[];
  classes: PcClass[];
  plans: PcPlan[];
  programPlans: PcProgramPlan[];
  requirements: PcRequirements[];
  templates: Template[];
}

export const BUNDLED: SeedData = {
  sessions: calendar.sessions as CalendarSession[],
  courses: coursesFile as PcCourse[],
  classes: classesFile as PcClass[],
  plans: plansFile.plans as PcPlan[],
  programPlans: plansFile.programPlans as PcProgramPlan[],
  requirements: requirementsFile as PcRequirements[],
  templates: TEMPLATES,
};

type Db = BetterSQLite3Database;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** INSERT … ON CONFLICT (target) DO UPDATE SET every other column, 100 rows at a time. */
function upsert<T extends SQLiteTable>(tx: Tx, table: T, rows: T["$inferInsert"][], target: SQLiteColumn[]): void {
  if (rows.length === 0) return;
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  const keys = new Set(target.map((c) => c.name));
  // Built from the table's own columns, so it has exactly the update-set shape drizzle types can't infer from a dynamic key list.
  const set = Object.fromEntries(
    Object.keys(rows[0])
      .filter((k) => !keys.has(columns[k].name))
      .map((k) => [k, sql.raw(`excluded."${columns[k].name}"`)]),
  ) as SQLiteUpdateSetSource<T>;
  for (let i = 0; i < rows.length; i += 100) {
    tx.insert(table).values(rows.slice(i, i + 100)).onConflictDoUpdate({ target, set }).run();
  }
}

export function seed(db: Db, data: SeedData = BUNDLED): void {
  const sessionIds = new Set(data.sessions.map((s) => s.id));
  for (const c of data.classes) {
    if (!sessionIds.has(c.sessionId)) throw new Error(`seed: class ${c.classNumber} (${c.courseCode}) is in ${c.sessionId}, which the calendar doesn't have`);
  }
  const classCourse = new Map(data.classes.map((c) => [`${c.sessionId}#${c.classNumber}`, c.courseCode]));
  for (const tpl of data.templates) {
    for (const e of tpl.enrolments) {
      const actual = classCourse.get(`${e.sessionId}#${e.classNumber}`);
      if (actual !== e.courseCode) {
        throw new Error(`seed: template ${tpl.uid} names ${e.courseCode} class ${e.classNumber} in ${e.sessionId}, but the snapshot has ${actual ?? "no such class"}`);
      }
    }
  }
  const maxTakes = new Map<string, number>();
  for (const r of data.requirements) for (const g of r.groups) for (const c of g.courses) maxTakes.set(c.code, Math.max(maxTakes.get(c.code) ?? 1, c.times));

  db.transaction((tx) => {
    upsert(tx, t.sessions, data.sessions.map(({ source: _source, ...s }) => s), [t.sessions.id]);
    const subjects = new Map(data.courses.map((c) => [c.subject, c.subjectName]));
    upsert(tx, t.subjects, [...subjects].map(([code, name]) => ({ code, name })), [t.subjects.code]);
    upsert(tx, t.courses, data.courses.map(({ subjectName: _name, ...c }) => ({ ...c, maxTakes: maxTakes.get(c.code) ?? 1 })), [t.courses.code]);
    upsert(tx, t.classes, data.classes, [t.classes.sessionId, t.classes.classNumber]);
    upsert(tx, t.plans, data.plans, [t.plans.code]);
    upsert(tx, t.programPlans, data.programPlans, [t.programPlans.programCode, t.programPlans.planCode]);

    tx.delete(t.requirementCourses).run();
    tx.delete(t.requirementGroups).run();
    for (const r of data.requirements) {
      for (const g of r.groups) {
        const { id } = tx
          .insert(t.requirementGroups)
          .values({ planCode: r.planCode, rulesYear: r.rulesYear, position: g.position, label: g.label, rule: g.rule, minUnits: g.minUnits, text: g.text })
          .returning({ id: t.requirementGroups.id })
          .get();
        if (g.courses.length > 0) {
          tx.insert(t.requirementCourses)
            .values(g.courses.map((c, i) => ({ groupId: id, courseCode: c.code, times: c.times, position: i + 1 })))
            .run();
        }
      }
    }

    for (const tpl of data.templates) {
      const row = { name: tpl.name, uid: tpl.uid, programCode: tpl.programCode, rulesYear: tpl.rulesYear, commencedSessionId: tpl.commencedSessionId };
      const existing = tx
        .select({ id: t.students.id })
        .from(t.students)
        .where(and(isNull(t.students.token), eq(t.students.uid, tpl.uid)))
        .get();
      let id: number;
      if (existing) {
        tx.update(t.students).set(row).where(eq(t.students.id, existing.id)).run();
        id = existing.id;
      } else {
        id = tx
          .insert(t.students)
          .values({ ...row, token: null, createdAt: new Date().toISOString() })
          .returning({ id: t.students.id })
          .get().id;
      }
      tx.delete(t.studentPlans).where(eq(t.studentPlans.studentId, id)).run();
      tx.delete(t.enrolments).where(eq(t.enrolments.studentId, id)).run();
      tx.insert(t.studentPlans)
        .values(tpl.plans.map((planCode) => ({ studentId: id, planCode })))
        .run();
      tx.insert(t.enrolments)
        .values(
          tpl.enrolments.map((e) => ({
            studentId: id,
            sessionId: e.sessionId,
            classNumber: e.classNumber,
            status: "enrolled" as const,
            grade: e.grade,
            enrolledOn: e.enrolledOn,
            droppedOn: null,
          })),
        )
        .run();
    }
  });
}
