import { asc } from "drizzle-orm";
import { db } from "./db";
import * as t from "./schema";

// Reference data (sessions, courses, classes, plans, requirements) is seeded
// at boot and never changes while the server runs, so it is read from SQLite
// once and kept in memory, indexed the ways the app asks.

export interface GroupRef {
  id: number;
  planCode: string;
  rulesYear: number;
  position: number;
  label: string;
  rule: "all" | "units" | "note";
  minUnits: number | null;
  text: string;
  courses: { code: string; times: number }[];
}

export interface Ref {
  /** In start-date order. */
  sessions: t.SessionRow[];
  sessionById: Map<string, t.SessionRow>;
  courseByCode: Map<string, t.CourseRow>;
  classByKey: Map<string, t.ClassRow>;
  /** Each list in class-number order. */
  classesBySession: Map<string, t.ClassRow[]>;
  /** Each list in session order, then class number. */
  classesByCourse: Map<string, t.ClassRow[]>;
  /** Class numbers repeat across sessions (spec §5.1). */
  sessionsOfClassNumber: Map<number, string[]>;
  subjects: Map<string, string>;
  plans: Map<string, t.PlanRow>;
  /** Program → its plans, in scope order. */
  programPlans: Map<string, string[]>;
  /** Plan → its requirement groups, in P&C order. */
  groupsByPlan: Map<string, GroupRef[]>;
}

export const classKey = (sessionId: string, classNumber: number): string => `${sessionId}#${classNumber}`;

let cache: Ref | null = null;

export function ref(): Ref {
  cache ??= load();
  return cache;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function load(): Ref {
  const sessions = db.select().from(t.sessions).orderBy(asc(t.sessions.startDate), asc(t.sessions.id)).all();
  const order = new Map(sessions.map((s, i) => [s.id, i]));
  const classes = db
    .select()
    .from(t.classes)
    .all()
    .sort((a, b) => (order.get(a.sessionId) ?? 0) - (order.get(b.sessionId) ?? 0) || a.classNumber - b.classNumber);
  const classesBySession = new Map<string, t.ClassRow[]>();
  const classesByCourse = new Map<string, t.ClassRow[]>();
  const sessionsOfClassNumber = new Map<number, string[]>();
  for (const c of classes) {
    push(classesBySession, c.sessionId, c);
    push(classesByCourse, c.courseCode, c);
    push(sessionsOfClassNumber, c.classNumber, c.sessionId);
  }
  const programPlans = new Map<string, string[]>();
  for (const pp of db.select().from(t.programPlans).orderBy(asc(t.programPlans.programCode), asc(t.programPlans.position)).all()) {
    push(programPlans, pp.programCode, pp.planCode);
  }
  const coursesOf = new Map<number, { code: string; times: number }[]>();
  for (const rc of db.select().from(t.requirementCourses).orderBy(asc(t.requirementCourses.groupId), asc(t.requirementCourses.position)).all()) {
    push(coursesOf, rc.groupId, { code: rc.courseCode, times: rc.times });
  }
  const groupsByPlan = new Map<string, GroupRef[]>();
  for (const g of db.select().from(t.requirementGroups).orderBy(asc(t.requirementGroups.planCode), asc(t.requirementGroups.position)).all()) {
    push(groupsByPlan, g.planCode, { ...g, courses: coursesOf.get(g.id) ?? [] });
  }
  return {
    sessions,
    sessionById: new Map(sessions.map((s) => [s.id, s])),
    courseByCode: new Map(
      db
        .select()
        .from(t.courses)
        .all()
        .map((c) => [c.code, c]),
    ),
    classByKey: new Map(classes.map((c) => [classKey(c.sessionId, c.classNumber), c])),
    classesBySession,
    classesByCourse,
    sessionsOfClassNumber,
    subjects: new Map(
      db
        .select()
        .from(t.subjects)
        .all()
        .map((s) => [s.code, s.name]),
    ),
    plans: new Map(
      db
        .select()
        .from(t.plans)
        .all()
        .map((p) => [p.code, p]),
    ),
    programPlans,
    groupsByPlan,
  };
}
