import { describe, expect, it } from "vitest";
import type { ApiErrorBody, View, WriteResponse } from "../src/lib/types";
import { badgeOf, Visitor } from "./helpers";

const badge = (view: View, id: string) => view.sessions.find((s) => s.id === id)?.badge;
const status = (view: View, code: string) => view.requirements.blocks.flatMap((b) => b.groups).flatMap((g) => g.courses).find((c) => c.code === code);

describe("M2: the date setting (spec §11.3)", () => {
  it("makes Spring 2026 Now at 2026-12-10, keeps First Semester 2027 Next, and survives a reload", async () => {
    const v = new Visitor();
    const { status: code, body } = await v.postJson<WriteResponse>("/api/demo/settings", { today: "2026-12-10" });
    expect(code).toBe(200);
    expect(body.view.demo).toMatchObject({ today: "2026-12-10", override: "2026-12-10", realToday: "2026-09-24", minDate: "2026-01-01", maxDate: "2027-12-31" });
    expect(badge(body.view, "2026-SPR")).toBe("now");
    expect(badge(body.view, "2027-S1")).toBe("next");
    const doc = await new Visitor(v.sid).page("/");
    expect(badgeOf(doc, "2026-SPR")).toBe("Now");
    expect(badgeOf(doc, "2027-S1")).toBe("Next");
  });

  it("at 2027-03-02 makes First Semester 2027 Now with adding closed, Second Semester 2027 Next, and COMP8620 completed without a grade", async () => {
    const { body } = await new Visitor().postJson<WriteResponse>("/api/demo/settings", { today: "2027-03-02" });
    const s1 = body.view.sessions.find((s) => s.id === "2027-S1");
    expect(s1?.badge).toBe("now");
    expect(s1?.keyDates).toContain("add closed 1 Mar");
    expect(body.view.nextSemesterId).toBe("2027-S2");
    expect(status(body.view, "COMP8620")?.text).toBe("Completed · Second Semester 2026");
    expect(body.view.sessions.find((s) => s.id === "2026-S1")?.earlier).toBe(true);
  });

  it("stamps new enrolments with the demo date", async () => {
    const v = new Visitor();
    await v.postJson<WriteResponse>("/api/demo/settings", { today: "2026-12-10" });
    const { body } = await v.postJson<WriteResponse>("/api/enrol", { session: "2027-S1", entry: "COMP8800" });
    expect(body.view.sessions.find((s) => s.id === "2027-S1")?.enrolments[0].enrolledOn).toBe("2026-12-10");
  });

  it("clears the setting with today: null, so the badges follow the real date again", async () => {
    const v = new Visitor();
    await v.postJson<WriteResponse>("/api/demo/settings", { today: "2027-03-02" });
    const { body } = await v.postJson<WriteResponse>("/api/demo/settings", { today: null });
    expect(body.view.today).toBe("2026-09-24");
    expect(body.view.demo.override).toBeNull();
    expect(badge(body.view, "2027-S1")).toBe("next");
  });

  it.each([["2025-12-31"], ["2028-01-01"], ["2026-02-30"], ["soon"], [20261210]])("refuses today = %j with 400", async (today) => {
    const { status: code, body } = await new Visitor().postJson<ApiErrorBody>("/api/demo/settings", { today });
    expect(code).toBe(400);
    expect(body.error.message).toContain("today");
  });

  it("puts the bar in a named region with no heading, so the page keeps one h1", async () => {
    const doc = await new Visitor().page("/");
    const bar = doc.querySelector('section[aria-label="Demo settings"]');
    expect(bar?.textContent).toContain("Demo settings — not part of the redesign");
    expect(bar?.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(bar?.querySelector('input[type="date"]')?.getAttribute("max")).toBe("2027-12-31");
  });
});
