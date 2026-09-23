import { describe, expect, it } from "vitest";
import type { ApiErrorBody, Catalogue, View } from "../src/lib/types";
import { sandboxCount, snapshot, Visitor } from "./helpers";

describe("GET /api/view", () => {
  it("returns the template student's view, with Now/Next badges and the 18 of 66 summary, without creating a sandbox", async () => {
    const before = sandboxCount();
    const res = await new Visitor().get("/api/view");
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()).toEqual([]);
    const view = (await res.json()) as View;
    expect(view.today).toBe("2026-09-24");
    expect(view.nextSemesterId).toBe("2027-S1");
    expect(view.student).toMatchObject({
      name: "Demo Student",
      uid: "u7000001",
      programCode: "7722XVCOMP",
      programShort: "MCompAdv",
      planCode: "ARTIF-SPEC",
      planName: "Artificial Intelligence",
    });
    const s = (id: string) => view.sessions.find((x) => x.id === id);
    expect(s("2026-S2")).toMatchObject({
      badge: "now",
      keyDates: "exams 5–21 Nov · add closed 3 Aug · census 31 Aug · drop without failure until 9 Oct · drop to 4 Nov",
      add: { open: false, reason: "Adding closed on 3 Aug" },
      cap: 24,
      classCount: 4,
      units: 24,
    });
    expect(s("2026-WIN")?.badge).toBe("now");
    expect(s("2027-S1")).toMatchObject({ badge: "next", add: { open: true }, classCount: 0 });
    expect(s("2027-S1")?.keyDates).toContain("enrolment usually opens early December (indicative)");
    expect(s("2026-SPR")?.badge).toBe("upcoming");
    expect(s("2026-S1")?.badge).toBe("past");
    expect(s("2026-S1")?.enrolments.every((e) => e.state === "completed" && !e.canDrop)).toBe(true);
    expect(view.requirements.summary).toEqual({ done: 18, enrolled: 18, total: 66 });
    expect(view.marks.COMP6445).toEqual({ completed: "Completed · First Semester 2026", enrolledIn: [] });
    expect(view.marks.COMP6442).toEqual({ completed: null, enrolledIn: ["2026-S2"] });
    expect(sandboxCount()).toBe(before);
  });

  it("treats an unknown sid cookie as no cookie", async () => {
    const res = await new Visitor("a".repeat(32)).get("/api/view");
    expect(res.status).toBe(200);
    expect(((await res.json()) as View).student.uid).toBe("u7000001");
  });
});

describe("GET /api/catalogue", () => {
  it("returns every First Semester 2027 class and only those, with descriptions", async () => {
    const { status, body } = await new Visitor().getJson<Catalogue>("/api/catalogue?session=2027-S1");
    expect(status).toBe(200);
    const expected = snapshot.classes
      .filter((c) => c.sessionId === "2027-S1")
      .map((c) => c.classNumber)
      .sort((a, b) => a - b);
    expect(body.classes.map((c) => c.classNumber).sort((a, b) => a - b)).toEqual(expected);
    expect(body).toMatchObject({ sessionId: "2027-S1", sessionName: "First Semester 2027", indicative: true, today: "2026-09-24" });
    expect(body.classes.filter((c) => c.description.length > 40).length).toBeGreaterThan(body.classes.length * 0.9);
    expect(body.classes.every((c) => c.canAdd)).toBe(true);
    expect(body.facets.subjects.map((s) => s.code)).toContain("COMP");
  });

  it("refuses an unknown or missing session with 400", async () => {
    for (const path of ["/api/catalogue?session=2099-S9", "/api/catalogue"]) {
      const { status, body } = await new Visitor().getJson<ApiErrorBody>(path);
      expect(status).toBe(400);
      expect(body.error.message).toContain("session");
    }
  });
});
