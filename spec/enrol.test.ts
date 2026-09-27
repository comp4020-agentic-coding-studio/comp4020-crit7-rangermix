import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ApiErrorBody, ChooseResponse, View, WriteResponse } from "../src/lib/types";
import { classesOf, type SnapClass, singleClassCourses, snapshot, Visitor } from "./helpers";

const S1 = "2027-S1";
const live = (view: View, sessionId: string): number[] =>
  view.sessions
    .find((s) => s.id === sessionId)
    ?.enrolments.filter((e) => e.state === "enrolled")
    .map((e) => e.classNumber) ?? [];
const sidebar = (view: View, code: string) =>
  view.requirements.blocks
    .flatMap((b) => b.groups)
    .flatMap((g) => g.courses)
    .find((c) => c.code === code);
const template = JSON.parse(readFileSync("src/data/templates/7722XVCOMP.json", "utf8")) as { enrolments: { courseCode: string; classNumber: number }[] };

/** A course with two classes of different topics in one open 2027 session (plan clarification 1). */
const topical = (() => {
  for (const sessionId of ["2027-S1", "2027-S2"]) {
    const byCourse = new Map<string, SnapClass[]>();
    for (const c of snapshot.classes.filter((x) => x.sessionId === sessionId && x.topic)) byCourse.set(c.courseCode, [...(byCourse.get(c.courseCode) ?? []), c]);
    for (const [, cs] of byCourse) {
      const distinct = [...new Map(cs.map((c) => [c.topic, c])).values()];
      if (distinct.length >= 2) return { sessionId, classes: distinct.slice(0, 2) };
    }
  }
  return null;
})();

describe("F1: add by class number or course code", () => {
  it("the snapshot supports these fixtures", () => {
    expect(classesOf("POGO8062", S1).length).toBeGreaterThan(1);
    expect(classesOf("COMP8020", S1)).toEqual([]);
    expect(classesOf("COMP8020", "2027-S2").length).toBeGreaterThan(0);
    expect(snapshot.classes.filter((c) => c.classNumber === 8707).map((c) => c.sessionId)).toEqual(["2026-S2"]);
    expect(classesOf("COMP8800", S1)).toHaveLength(1);
    expect(classesOf("COMP8800", "2027-S2")).toHaveLength(1);
  });

  it("enrols a class number, and a fresh request with the same cookie still has it (persists across reload)", async () => {
    const [target] = singleClassCourses(S1, 1);
    const v = new Visitor();
    const { status, body } = await v.postJson<WriteResponse>("/api/enrol", { session: S1, entry: String(target.classNumber) });
    expect(status).toBe(200);
    expect(body.outcomes).toEqual([expect.objectContaining({ ok: true, classNumber: target.classNumber, courseCode: target.courseCode })]);
    expect(body.outcomes[0].message).toMatch(new RegExp(`^Enrolled: ${target.courseCode} .+ \\(class ${target.classNumber}, 6 units\\)$`));
    expect(v.sid).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const fresh = await new Visitor(v.sid).getJson<View>("/api/view");
    expect(live(fresh.body, S1)).toEqual([target.classNumber]);
  });

  it("enrols a course code with one class directly, with no confirm step", async () => {
    const [target] = singleClassCourses(S1, 1);
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: S1, entry: ` ${target.courseCode.toLowerCase()} ` });
    expect(body.outcomes).toEqual([expect.objectContaining({ ok: true, classNumber: target.classNumber })]);
    expect(live(body.view, S1)).toEqual([target.classNumber]);
  });

  it("answers a course with several classes with choose, changing nothing; two of its class numbers then get one outcome each", async () => {
    const pogo = classesOf("POGO8062", S1);
    const v = new Visitor();
    const chose = await v.postJson<ChooseResponse>("/api/enrol", { session: S1, entry: "POGO8062" });
    expect(chose.status).toBe(200);
    expect(chose.body.choose.classes.map((c) => c.classNumber)).toEqual(pogo.map((c) => c.classNumber));
    expect(chose.body.choose.note).toContain("one class of POGO8062");
    expect(v.sid, "a choose answer changes nothing, so no sandbox yet").toBeNull();
    const { body } = await v.postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: pogo.slice(0, 2).map((c) => c.classNumber) });
    expect(body.outcomes.map((o) => o.ok)).toEqual([true, false]);
    expect(body.outcomes[1].message).toContain("you're already enrolled in POGO8062 in First Semester 2027");
  });

  it.runIf(topical !== null)("enrols two classes of one course when their topics differ", async () => {
    const { sessionId, classes } = topical as NonNullable<typeof topical>;
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: sessionId, classNumbers: classes.map((c) => c.classNumber) });
    expect(body.outcomes.map((o) => o.ok)).toEqual([true, true]);
  });

  it.each([
    ["a code not offered this session", "COMP8020", "COMP8020 isn't offered in First Semester 2027. Next offered: Second Semester 2027."],
    ["an unknown code", "COMP9999", "COMP9999 isn't in the prototype's catalogue"],
    ["another session's class number", "8707", "8707 is a Second Semester 2026 class number, not First Semester 2027"],
    ["garbage", "enrol me please", "Enter a class number (digits) or a course code like COMP1100."],
  ])("answers %s with its message and enrols nothing", async (_what, entry, message) => {
    const v = new Visitor();
    const { status, body } = await v.postJson<ApiErrorBody>("/api/enrol", { session: S1, entry });
    expect(status).toBe(422);
    expect(body.error).toEqual({ code: "entry", message });
    expect(v.sid).toBeNull();
  });
});

describe("rules", () => {
  it("refuses a class whose last day to enrol has passed", async () => {
    const [cls] = classesOf("COMP8800", "2026-S2");
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2026-S2", classNumbers: [cls.classNumber] });
    expect(body.outcomes[0]).toMatchObject({ ok: false, message: `Not added: COMP8800 (class ${cls.classNumber}) — the last day to enrol was 3 Aug 2026` });
  });

  it("refuses a course already completed, naming the session and grade", async () => {
    const offered = snapshot.classes.find((c) => c.courseCode === "COMP6445" && c.sessionId.startsWith("2027"));
    expect(offered, "COMP6445 has a 2027 class").toBeDefined();
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: offered?.sessionId, classNumbers: [offered?.classNumber] });
    expect(body.outcomes[0].ok).toBe(false);
    expect(body.outcomes[0].message).toContain("you've already completed COMP6445 (First Semester 2026, D)");
  });

  it("keeps the classes before a batch crosses 24 units and refuses the rest", async () => {
    const five = singleClassCourses(S1, 5);
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: five.map((c) => c.classNumber) });
    expect(body.outcomes.map((o) => o.ok)).toEqual([true, true, true, true, false]);
    expect(body.outcomes[4].message).toContain("Going over 24 units needs an Overload request through Manage my Degree");
    expect(body.view.sessions.find((s) => s.id === S1)).toMatchObject({ classCount: 4, units: 24 });
  });

  it("allows COMP8800 a second take", async () => {
    const v = new Visitor();
    const first = await v.postJson<WriteResponse>("/api/enrol", { session: S1, entry: "COMP8800" });
    const second = await v.postJson<WriteResponse>("/api/enrol", { session: "2027-S2", entry: "COMP8800" });
    expect(first.body.outcomes[0].ok).toBe(true);
    expect(second.body.outcomes[0].ok).toBe(true);
    expect(sidebar(second.body.view, "COMP8800")?.text).toBe("Enrolled · First Semester 2027 (1 of 2), Second Semester 2027 (2 of 2)");
  });

  it("warns, without refusing, when the course's career differs from the program's", async () => {
    const ug = snapshot.classes.find((c) => c.sessionId === S1 && snapshot.courses.find((k) => k.code === c.courseCode)?.career === "UGRD" && classesOf(c.courseCode, S1).length === 1);
    expect(ug, "an undergraduate course with one First Semester 2027 class").toBeDefined();
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: [ug?.classNumber] });
    expect(body.outcomes[0]).toMatchObject({ ok: true });
    expect(body.outcomes[0].warning).toContain("is an undergraduate course and your program is postgraduate");
  });
});

describe("drop", () => {
  it("drops a class, and the requirement status reverts", async () => {
    const v = new Visitor();
    const added = await v.postJson<WriteResponse>("/api/enrol", { session: S1, entry: "COMP8800" });
    const n = added.body.outcomes[0].classNumber;
    expect(sidebar(added.body.view, "COMP8800")?.text).toBe("Enrolled · First Semester 2027 (1 of 2)");
    const dropped = await v.postJson<WriteResponse>("/api/drop", { session: S1, classNumber: n });
    expect(dropped.body.outcomes[0]).toMatchObject({ ok: true, courseCode: "COMP8800" });
    expect(sidebar(dropped.body.view, "COMP8800")).toMatchObject({ text: "Not enrolled", add: { sessionId: S1, label: "Add to First Semester 2027" } });
  });

  it("leaves no trace of a class dropped before it starts", async () => {
    const v = new Visitor();
    const added = await v.postJson<WriteResponse>("/api/enrol", { session: S1, entry: "COMP8800" });
    const n = added.body.outcomes[0].classNumber;
    const dropped = await v.postJson<WriteResponse>("/api/drop", { session: S1, classNumber: n });
    expect(dropped.body.outcomes[0]).toMatchObject({ ok: true });
    expect(dropped.body.view.sessions.find((s) => s.id === S1)?.enrolments).toEqual([]);
    const fresh = await new Visitor(v.sid).getJson<View>("/api/view");
    expect(fresh.body.sessions.find((s) => s.id === S1)?.enrolments).toEqual([]);
  });

  it("keeps a class dropped after it started, marked Dropped", async () => {
    const started = template.enrolments.find((e) => e.courseCode === "COMP8620");
    expect(started).toBeDefined();
    const { body } = await new Visitor().postJson<WriteResponse>("/api/drop", { session: "2026-S2", classNumber: started?.classNumber });
    expect(body.outcomes[0]).toMatchObject({ ok: true, courseCode: "COMP8620" });
    expect(body.view.sessions.find((s) => s.id === "2026-S2")?.enrolments.find((e) => e.classNumber === started?.classNumber)).toMatchObject({
      state: "dropped",
      droppedOn: "2026-09-24",
      canDrop: false,
    });
  });

  it("refuses a drop after the exam period has started", async () => {
    const done = template.enrolments.find((e) => e.courseCode === "COMP6445");
    expect(done).toBeDefined();
    const { body } = await new Visitor().postJson<WriteResponse>("/api/drop", { session: "2026-S1", classNumber: done?.classNumber });
    expect(body.outcomes[0]).toMatchObject({ ok: false, message: `Not dropped: COMP6445 (class ${done?.classNumber}) — self-service drop closed on 3 Jun 2026` });
  });
});

describe("batches and double submits (Review Focus 5)", () => {
  it("processes a repeated class number once", async () => {
    const [c] = singleClassCourses(S1, 1);
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: [c.classNumber, c.classNumber] });
    expect(body.outcomes).toHaveLength(1);
    expect(body.outcomes[0].ok).toBe(true);
  });

  it("enrols exactly once when two identical requests race", async () => {
    const [c] = singleClassCourses(S1, 1);
    const v = new Visitor();
    await v.postJson("/api/demo/reset", {});
    const [a, b] = await Promise.all([
      v.post("/api/enrol", { session: S1, classNumbers: [c.classNumber] }),
      v.post("/api/enrol", { session: S1, classNumbers: [c.classNumber] }),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const outcomes = [...((await a.json()) as WriteResponse).outcomes, ...((await b.json()) as WriteResponse).outcomes];
    expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
    expect(live((await v.getJson<View>("/api/view")).body, S1)).toEqual([c.classNumber]);
  });
});
