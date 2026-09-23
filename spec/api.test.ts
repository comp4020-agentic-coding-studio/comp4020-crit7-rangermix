import { describe, expect, it } from "vitest";
import type { ApiErrorBody, View, WriteResponse } from "../src/lib/types";
import { sandboxCount, singleClassCourses, snapshot, Visitor } from "./helpers";

const S1 = "2027-S1";
const live = (view: View): number[] =>
  view.sessions
    .find((s) => s.id === S1)
    ?.enrolments.filter((e) => e.state === "enrolled")
    .map((e) => e.classNumber) ?? [];

describe("API conventions", () => {
  it.each(["application/x-www-form-urlencoded", "text/plain", "application/xml"])("answers a POST sent as %s with 415", async (type) => {
    const res = await new Visitor().post("/api/enrol", "session=2027-S1&entry=COMP8800", type);
    expect(res.status).toBe(415);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("unsupported_media_type");
  });

  it.each([
    ["/api/enrol", "not JSON", "{", "bad_json", ""],
    ["/api/enrol", "an array", "[]", "bad_body", ""],
    ["/api/enrol", "no session", JSON.stringify({ entry: "COMP8800" }), "bad_field", "session"],
    ["/api/enrol", "an unknown session", JSON.stringify({ session: "2099-S9", entry: "COMP8800" }), "bad_field", "session"],
    ["/api/enrol", "a non-text entry", JSON.stringify({ session: S1, entry: 8800 }), "bad_field", "entry"],
    ["/api/enrol", "bad class numbers", JSON.stringify({ session: S1, classNumbers: ["x"] }), "bad_field", "classNumbers"],
    ["/api/enrol", "an empty class-number list", JSON.stringify({ session: S1, classNumbers: [] }), "bad_field", "classNumbers"],
    ["/api/enrol", "both entry and classNumbers", JSON.stringify({ session: S1, entry: "COMP8800", classNumbers: [1] }), "bad_field", "entry"],
    ["/api/drop", "no class number", JSON.stringify({ session: S1 }), "bad_field", "classNumber"],
    ["/api/demo/reset", "a non-text programCode", JSON.stringify({ programCode: 7 }), "bad_field", "programCode"],
    ["/api/demo/reset", "a program without a demo student", JSON.stringify({ programCode: "NOPE" }), "bad_field", "programCode"],
  ])("%s: answers %s with 400 naming the field", async (path, _what, raw, code, field) => {
    const res = await new Visitor().post(path, raw);
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorBody;
    expect(body.error.code).toBe(code);
    expect(body.error.message).toContain(field);
  });
});

describe("sandbox", () => {
  it("keeps two cookie jars' enrolments apart", async () => {
    const [c] = singleClassCourses(S1, 1);
    const a = new Visitor();
    const b = new Visitor();
    await a.postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: [c.classNumber] });
    await b.postJson<WriteResponse>("/api/demo/reset", {});
    expect(a.sid).not.toBe(b.sid);
    expect(live((await a.getJson<View>("/api/view")).body)).toEqual([c.classNumber]);
    expect(live((await b.getJson<View>("/api/view")).body)).toEqual([]);
  });

  it("writes no student row for a GET without a cookie", async () => {
    const before = sandboxCount();
    const v = new Visitor();
    for (const path of ["/", "/api/view", "/api/catalogue?session=2027-S1"]) {
      const res = await v.get(path);
      expect(res.headers.getSetCookie()).toEqual([]);
    }
    expect(sandboxCount()).toBe(before);
  });

  it("gives a forged or stale cookie a fresh sandbox on its first write (Review Focus 3)", async () => {
    for (const forged of ["not-a-token", "a".repeat(32), "%00", "x".repeat(4000)]) {
      const v = new Visitor(forged);
      expect((await v.get("/api/view")).status).toBe(200);
      const { status } = await v.postJson<WriteResponse>("/api/demo/reset", {});
      expect(status).toBe(200);
      expect(v.sid).not.toBe(forged);
      expect(v.sid).toMatch(/^[A-Za-z0-9_-]{32}$/);
    }
  });
});

describe("D6: every course fact traces to the snapshot", () => {
  it("every course code and class number on / exists in the committed snapshot", async () => {
    const doc = await new Visitor().page("/?open=2026-S1,2026-S2,2027-S1");
    const known = new Set(snapshot.courses.map((c) => c.code));
    // Text node by node: textContent glues neighbouring elements ("2026" + "COMP6240"), which hides codes from \b.
    const found = new Set<string>();
    const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) for (const m of n.textContent?.match(/\b[A-Z]{4}\d{4}\b/g) ?? []) found.add(m);
    const codes = [...found];
    expect(codes).toEqual(expect.arrayContaining(["COMP6240", "COMP8020", "COMP8800", "COMP6250"]));
    expect(codes.filter((c) => !known.has(c))).toEqual([]);
    for (const row of doc.querySelectorAll("details[data-session]")) {
      const sessionId = row.getAttribute("data-session");
      for (const el of row.querySelectorAll("[data-class]")) {
        const n = Number(el.getAttribute("data-class"));
        expect(
          snapshot.classes.some((c) => c.sessionId === sessionId && c.classNumber === n),
          `${sessionId} class ${n}`,
        ).toBe(true);
      }
    }
  });
});
