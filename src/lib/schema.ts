import { sql } from "drizzle-orm";
import { foreignKey, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
//
// The tables follow spec §5.1. Reference data is seeded at boot from the
// committed P&C snapshot (src/data/seed.ts); student data is written at
// runtime.

const CAREERS = ["UGRD", "PGRD", "RSCH"] as const;

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["semester", "intensive"] }).notNull(),
  year: integer("year").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  examStart: text("exam_start"),
  examEnd: text("exam_end"),
  lastDayToAdd: text("last_day_to_add"),
  censusDate: text("census_date"),
  dropNoFailDate: text("drop_no_fail_date"),
  /** Indicative, shown only (spec D4). */
  enrolOpens: text("enrol_opens"),
  enrolOpensText: text("enrol_opens_text"),
});

export const subjects = sqliteTable("subjects", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});

export const courses = sqliteTable("courses", {
  code: text("code").primaryKey(),
  subject: text("subject")
    .notNull()
    .references(() => subjects.code),
  catalogue: text("catalogue").notNull(),
  level: integer("level").notNull(),
  title: text("title").notNull(),
  career: text("career", { enum: CAREERS }).notNull(),
  units: real("units").notNull(),
  description: text("description").notNull(),
  requisites: text("requisites"),
  maxTakes: integer("max_takes").notNull().default(1),
  pcUrl: text("pc_url").notNull(),
});

export const classes = sqliteTable(
  "classes",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    classNumber: integer("class_number").notNull(),
    courseCode: text("course_code")
      .notNull()
      .references(() => courses.code),
    mode: text("mode").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    lastDayToEnrol: text("last_day_to_enrol").notNull(),
    censusDate: text("census_date").notNull(),
    topic: text("topic"),
  },
  // Class numbers are unique only within a session (spec §5.1).
  (t) => [primaryKey({ columns: [t.sessionId, t.classNumber] }), index("classes_course_idx").on(t.courseCode)],
);

export const plans = sqliteTable("plans", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["program", "major", "specialisation"] }).notNull(),
  career: text("career", { enum: CAREERS }).notNull(),
  units: real("units"),
  acronym: text("acronym"),
  /** P&C's "Post Nominal", e.g. MCompAdv (plan clarification 3). */
  postNominal: text("post_nominal"),
  pcUrl: text("pc_url").notNull(),
});

export const programPlans = sqliteTable(
  "program_plans",
  {
    programCode: text("program_code")
      .notNull()
      .references(() => plans.code),
    planCode: text("plan_code")
      .notNull()
      .references(() => plans.code),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.programCode, t.planCode] })],
);

export const requirementGroups = sqliteTable(
  "requirement_groups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planCode: text("plan_code")
      .notNull()
      .references(() => plans.code),
    rulesYear: integer("rules_year").notNull(),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    rule: text("rule", { enum: ["all", "units", "note"] }).notNull(),
    minUnits: real("min_units"),
    /** P&C's sentence, verbatim, always kept. */
    text: text("text").notNull(),
  },
  (t) => [uniqueIndex("requirement_groups_plan_uq").on(t.planCode, t.rulesYear, t.position)],
);

export const requirementCourses = sqliteTable(
  "requirement_courses",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => requirementGroups.id, { onDelete: "cascade" }),
    courseCode: text("course_code")
      .notNull()
      .references(() => courses.code),
    times: integer("times").notNull().default(1),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.courseCode] })],
);

export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** The sandbox's cookie token; null for a template student (spec §5.2). */
  token: text("token").unique(),
  name: text("name").notNull(),
  uid: text("uid").notNull(),
  programCode: text("program_code")
    .notNull()
    .references(() => plans.code),
  rulesYear: integer("rules_year").notNull(),
  commencedSessionId: text("commenced_session_id")
    .notNull()
    .references(() => sessions.id),
  createdAt: text("created_at").notNull(),
  /** M2's date setting (spec §11.3); null means the real date. */
  today: text("today"),
});

export const studentPlans = sqliteTable(
  "student_plans",
  {
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    planCode: text("plan_code")
      .notNull()
      .references(() => plans.code),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.planCode] })],
);

export const enrolments = sqliteTable(
  "enrolments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    classNumber: integer("class_number").notNull(),
    status: text("status", { enum: ["enrolled", "dropped"] }).notNull(),
    grade: text("grade"),
    enrolledOn: text("enrolled_on").notNull(),
    droppedOn: text("dropped_on"),
  },
  (t) => [
    foreignKey({ columns: [t.sessionId, t.classNumber], foreignColumns: [classes.sessionId, classes.classNumber] }),
    // One live enrolment per class per student; rows dropped after the class started stay as history.
    uniqueIndex("enrolments_live_uq").on(t.studentId, t.sessionId, t.classNumber).where(sql`status = 'enrolled'`),
    index("enrolments_student_idx").on(t.studentId),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;
export type CourseRow = typeof courses.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type PlanRow = typeof plans.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type EnrolmentRow = typeof enrolments.$inferSelect;
