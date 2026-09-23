import { describe, expect, it } from "vitest";
import type { WriteResponse } from "../src/lib/types";
import { badgeOf, classesOf, sessionRow, singleClassCourses, Visitor } from "./helpers";

const openRows = (doc: Document): (string | null)[] => [...doc.querySelectorAll("details[data-session][open]")].map((d) => d.getAttribute("data-session"));

describe("F3: sessions show dates and Now/Next", () => {
  it("lists every session with its dates; Second Semester 2026 and Winter 2026 are Now, First Semester 2027 is Next", async () => {
    const doc = await new Visitor().page("/");
    expect([...doc.querySelectorAll("details[data-session]")].map((d) => d.getAttribute("data-session"))).toEqual([
      "2026-SUM",
      "2026-S1",
      "2026-AUT",
      "2026-WIN",
      "2026-S2",
      "2026-SPR",
      "2027-SUM",
      "2027-S1",
      "2027-AUT",
      "2027-WIN",
      "2027-S2",
      "2027-SPR",
    ]);
    expect(badgeOf(doc, "2026-S2")).toBe("Now");
    expect(badgeOf(doc, "2026-WIN")).toBe("Now");
    expect(badgeOf(doc, "2027-S1")).toBe("Next");
    expect(badgeOf(doc, "2026-SPR")).toBe("Upcoming");
    expect(badgeOf(doc, "2026-S1")).toBe("Past");
    const summary = (id: string): string => (sessionRow(doc, id).querySelector("summary")?.textContent ?? "").replace(/\s+/g, " ");
    expect(summary("2026-S2")).toContain("27 Jul–30 Oct");
    expect(summary("2026-S2")).toContain("exams 5–21 Nov · add closed 3 Aug · census 31 Aug · drop without failure until 9 Oct · drop to 4 Nov");
    expect(summary("2027-S1")).toContain("22 Feb–28 May");
    expect(summary("2027-S1")).toContain("enrolment usually opens early December (indicative)");
    expect(summary("2026-WIN")).toContain("dates vary by class");
  });

  it("opens only the next semester's details by default", async () => {
    expect(openRows(await new Visitor().page("/"))).toEqual(["2027-S1"]);
  });

  it("reopens the sessions named in ?open=", async () => {
    expect(openRows(await new Visitor().page("/?open=2026-S2,2027-S2"))).toEqual(["2026-S2", "2027-S2"]);
  });
});

describe("keyboard", () => {
  it("starts with a link that skips past the requirements to the sessions", async () => {
    const doc = await new Visitor().page("/");
    const first = doc.querySelector("a[href], button, input, select, summary");
    expect(first?.textContent).toBe("Skip to sessions");
    const target = doc.getElementById((first?.getAttribute("href") ?? "").slice(1));
    expect(target?.textContent).toBe("Sessions");
    expect(target?.getAttribute("tabindex")).toBe("-1");
  });
});

describe("F4: enrolment details unfold in place", () => {
  it("renders each session's details as a <details> element on /, not a link to another page", async () => {
    const doc = await new Visitor().page("/");
    const s2 = sessionRow(doc, "2026-S2");
    expect(s2.tagName).toBe("DETAILS");
    expect(s2.querySelector("summary h3")?.textContent).toBe("Second Semester 2026");
    expect(s2.textContent).toContain("4 classes · 24 of 24 units");
    expect(s2.querySelector('[data-class="8707"]')?.textContent).toContain("COMP6442");
    expect(s2.textContent).toContain("Adding closed on 3 Aug");
    expect(sessionRow(doc, "2027-S1").textContent).toContain("No classes in First Semester 2027 yet. Add one below, use your requirements list, or browse classes.");
  });

  it("keeps words apart in row and class summaries, so screen readers don't read '202627' or '6 unitsEnrolled'", async () => {
    const doc = await new Visitor().page("/");
    const s2 = sessionRow(doc, "2026-S2");
    expect(s2.querySelector("summary")?.textContent).toMatch(/Second Semester 2026\s+27 Jul–30 Oct\s+Now\s+exams 5–21 Nov/);
    expect(s2.querySelector('[data-class="8707"] summary')?.textContent).toMatch(/6 units\s+Enrolled$/);
  });

  it("shows a sandbox's new enrolment under its session on a fresh page load (crit: persists across reload)", async () => {
    const [target] = singleClassCourses("2027-S1", 1);
    const v = new Visitor();
    await v.postJson<WriteResponse>("/api/enrol", { session: "2027-S1", classNumbers: [target.classNumber] });
    const doc = await new Visitor(v.sid).page("/");
    const row = sessionRow(doc, "2027-S1");
    expect(row.querySelector(`[data-class="${target.classNumber}"]`)?.textContent).toContain(target.courseCode);
    expect(row.textContent).toContain("1 class · 6 of 24 units");
  });
});

describe("F1: the chooser from a link (spec §4.2)", () => {
  it("server-renders the chooser for /?choose=POGO8062&term=2027-S1, with each class named in context", async () => {
    const doc = await new Visitor().page("/?choose=POGO8062&term=2027-S1");
    const row = sessionRow(doc, "2027-S1");
    expect(row.hasAttribute("open")).toBe(true);
    const pogo = classesOf("POGO8062", "2027-S1");
    expect(row.querySelector("fieldset legend")?.textContent).toContain(`has ${pogo.length} classes in First Semester 2027`);
    expect([...row.querySelectorAll("fieldset input[type=checkbox]")].map((b) => b.getAttribute("aria-label"))).toEqual(
      pogo.map((c) => `Select POGO8062 class ${c.classNumber}, ${c.mode}`),
    );
  });
});
