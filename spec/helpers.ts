import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { expect, inject } from "vitest";

// Shared by the contract tests. They talk to the BUILT server over HTTP
// (spec/global-setup.ts boots it with APP_TODAY=2026-09-24) and take their
// fixtures from the committed snapshot, never from live P&C (spec §10).

export const baseUrl = inject("baseUrl");

export interface SnapClass {
  sessionId: string;
  classNumber: number;
  courseCode: string;
  mode: string;
  startDate: string;
  endDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  topic: string | null;
}
export interface SnapCourse {
  code: string;
  subject: string;
  title: string;
  career: "UGRD" | "PGRD" | "RSCH";
  units: number;
  level: number;
  description: string;
}

const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

// Lazy, so test files load before Task 4 has written src/data/pc/.
let classesCache: SnapClass[] | null = null;
let coursesCache: SnapCourse[] | null = null;
export const snapshot = {
  get classes(): SnapClass[] {
    classesCache ??= read<SnapClass[]>("src/data/pc/classes.json");
    return classesCache;
  },
  get courses(): SnapCourse[] {
    coursesCache ??= read<SnapCourse[]>("src/data/pc/courses.json");
    return coursesCache;
  },
};

export function course(code: string): SnapCourse {
  const found = snapshot.courses.find((c) => c.code === code);
  if (!found) throw new Error(`${code} isn't in the snapshot`);
  return found;
}

export function classesOf(code: string, sessionId: string): SnapClass[] {
  return snapshot.classes
    .filter((c) => c.courseCode === code && c.sessionId === sessionId)
    .sort((a, b) => a.classNumber - b.classNumber);
}

/** Every course in the M1 template student's history. */
export function templateCourses(): string[] {
  const t = read<{ enrolments: { courseCode: string }[] }>("src/data/templates/7722XVCOMP.json");
  return t.enrolments.map((e) => e.courseCode);
}

/**
 * The first `count` 6-unit postgraduate courses (by code) with exactly one
 * class in the session, outside the template's history and COMP8800.
 * Deterministic for a given snapshot, so no test hard-codes a class number.
 */
export function singleClassCourses(sessionId: string, count: number, exclude: string[] = []): SnapClass[] {
  const skip = new Set([...templateCourses(), ...exclude, "COMP8800"]);
  const picked = snapshot.courses
    .filter((c) => c.career === "PGRD" && c.units === 6 && !skip.has(c.code))
    .map((c) => classesOf(c.code, sessionId))
    .filter((cs) => cs.length === 1)
    .map((cs) => cs[0])
    .sort((a, b) => (a.courseCode < b.courseCode ? -1 : 1))
    .slice(0, count);
  expect(picked, `the snapshot needs ${count} single-class PG courses in ${sessionId}`).toHaveLength(count);
  return picked;
}

/** Sandboxes (students with a token) in the test database. */
export function sandboxCount(): number {
  const db = new Database(inject("dbPath"), { readonly: true, fileMustExist: true });
  try {
    return (db.prepare("select count(*) as n from students where token is not null").get() as { n: number }).n;
  } finally {
    db.close();
  }
}

/** A browser stand-in with its own cookie jar (just the sid). */
export class Visitor {
  sid: string | null;
  constructor(sid: string | null = null) {
    this.sid = sid;
  }
  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return this.sid ? { cookie: `sid=${this.sid}`, ...extra } : extra;
  }
  private remember(res: Response): void {
    for (const c of res.headers.getSetCookie()) {
      const m = c.match(/^sid=([^;]*)/);
      if (m) this.sid = m[1];
    }
  }
  async get(path: string): Promise<Response> {
    const res = await fetch(new URL(path, baseUrl), { headers: this.headers() });
    this.remember(res);
    return res;
  }
  async getJson<T>(path: string): Promise<{ status: number; body: T }> {
    const res = await this.get(path);
    return { status: res.status, body: (await res.json()) as T };
  }
  async page(path = "/"): Promise<Document> {
    const res = await this.get(path);
    expect(res.status, `GET ${path}`).toBe(200);
    return parse(await res.text());
  }
  /** A same-origin POST, as a browser sends it: Astro's origin check refuses form-type POSTs without an Origin header. */
  async post(path: string, body: unknown, contentType = "application/json"): Promise<Response> {
    const res = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: this.headers({ "content-type": contentType, origin: new URL(baseUrl).origin }),
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    this.remember(res);
    return res;
  }
  async postJson<T>(path: string, body: unknown): Promise<{ status: number; body: T }> {
    const res = await this.post(path, body);
    return { status: res.status, body: (await res.json()) as T };
  }
}

export const parse = (html: string): Document => new JSDOM(html).window.document;

export function sessionRow(doc: Document, sessionId: string): HTMLDetailsElement {
  const row = doc.querySelector<HTMLDetailsElement>(`details[data-session="${sessionId}"]`);
  if (!row) throw new Error(`no session row for ${sessionId}`);
  return row;
}

export const badgeOf = (doc: Document, sessionId: string): string =>
  sessionRow(doc, sessionId).querySelector(".badge")?.textContent?.trim() ?? "";
