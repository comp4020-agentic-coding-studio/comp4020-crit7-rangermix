import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import { BUNDLED, seed } from "./seed";

function fresh() {
  const client = new Database(":memory:");
  client.pragma("foreign_keys = ON");
  const db = drizzle(client);
  migrate(db, { migrationsFolder: "./drizzle" });
  return { client, db };
}
const count = (client: Database.Database, table: string): number => (client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;

describe("seed (spec §8.5)", () => {
  it("loads the snapshot, the calendar and the template student", () => {
    const { client, db } = fresh();
    seed(db);
    expect(count(client, "sessions")).toBe(12);
    expect(count(client, "courses")).toBe(BUNDLED.courses.length);
    expect(count(client, "classes")).toBe(BUNDLED.classes.length);
    expect(count(client, "plans")).toBe(20);
    expect(count(client, "program_plans")).toBe(25);
    expect(count(client, "students")).toBe(1);
    expect(count(client, "enrolments")).toBe(8);
    expect(client.prepare("select max_takes from courses where code = 'COMP8800'").get()).toEqual({ max_takes: 2 });
    expect(client.prepare("pragma foreign_key_check").all()).toEqual([]);
  });

  it("is idempotent: a second boot changes nothing", () => {
    const { client, db } = fresh();
    seed(db);
    seed(db);
    expect(count(client, "classes")).toBe(BUNDLED.classes.length);
    expect(count(client, "students")).toBe(1);
    expect(count(client, "enrolments")).toBe(8);
    expect(count(client, "requirement_groups")).toBe(BUNDLED.requirements.reduce((n, r) => n + r.groups.length, 0));
  });

  it("never touches a sandbox's rows on a re-seed", () => {
    const { client, db } = fresh();
    seed(db);
    const cls = BUNDLED.classes.find((c) => c.sessionId === "2027-S1");
    expect(cls).toBeDefined();
    client
      .prepare("insert into students (token, name, uid, program_code, rules_year, commenced_session_id, created_at) values ('t' || hex(randomblob(16)), 'X', 'u1', '7722XVCOMP', 2026, '2026-S1', '2026-09-24')")
      .run();
    const sid = (client.prepare("select id from students where token is not null").get() as { id: number }).id;
    client.prepare("insert into enrolments (student_id, session_id, class_number, status, enrolled_on) values (?, ?, ?, 'enrolled', '2026-09-24')").run(sid, cls?.sessionId, cls?.classNumber);
    seed(db);
    expect(count(client, "enrolments")).toBe(9);
  });

  it("refuses a class whose session has no calendar row", () => {
    const { db } = fresh();
    const stray = { ...BUNDLED.classes[0], sessionId: "2025-S1" };
    expect(() => seed(db, { ...BUNDLED, classes: [...BUNDLED.classes, stray] })).toThrow(/calendar/);
  });

  it("refuses a template class that isn't the course the template names", () => {
    const { db } = fresh();
    const [tpl] = BUNDLED.templates;
    const wrong = { ...tpl, enrolments: [{ ...tpl.enrolments[0], courseCode: "COMP1100" }] };
    expect(() => seed(db, { ...BUNDLED, templates: [wrong] })).toThrow(/template u7000001/);
  });
});
