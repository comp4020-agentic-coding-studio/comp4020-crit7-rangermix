import { describe, expect, it } from "vitest";
import type { Catalogue, ChooseResponse, View } from "../src/lib/types";
import { classesOf, sessionRow, Visitor } from "./helpers";

// Each class links to its P&C class page, which carries the timetable link; sessions with
// current or upcoming classes point to MyTimetable for tutorials (spec §15.6).
const PC = "https://programsandcourses.anu.edu.au";

describe("class pages and tutorials (spec §15.6)", () => {
  it("gives every enrolment, catalogue row and chooser class its P&C class page", async () => {
    const { body: view } = await new Visitor().getJson<View>("/api/view");
    expect(view.sessions.find((s) => s.id === "2026-S2")?.enrolments.find((e) => e.courseCode === "COMP6442")?.classUrl).toBe(`${PC}/2026/course/COMP6442/Second%20Semester/8707`);
    const [comp8800] = classesOf("COMP8800", "2027-S1");
    const { body: cat } = await new Visitor().getJson<Catalogue>("/api/catalogue?session=2027-S1");
    expect(cat.classes.find((c) => c.classNumber === comp8800.classNumber)?.classUrl).toBe(`${PC}/2027/course/COMP8800/First%20Semester/${comp8800.classNumber}`);
    const { body } = await new Visitor().postJson<ChooseResponse>("/api/enrol", { session: "2027-S1", entry: "POGO8062" });
    expect(body.choose.classes.map((c) => c.classUrl)).toEqual(classesOf("POGO8062", "2027-S1").map((c) => `${PC}/2027/course/POGO8062/First%20Semester/${c.classNumber}`));
  });

  it("links each class's page on the page, and points a session with current classes to MyTimetable", async () => {
    const doc = await new Visitor().page("/?open=2026-S2");
    const s2 = sessionRow(doc, "2026-S2");
    expect(s2.querySelector(`a[href="${PC}/2026/course/COMP6442/Second%20Semester/8707"]`)?.getAttribute("aria-label")).toBe("COMP6442 class 8707: class page and timetable on Programs & Courses");
    expect(s2.querySelector(".details__tutorials")?.textContent).toContain("Tutorials and labs are chosen separately, in MyTimetable, once allocation opens.");
    expect(s2.querySelector('.details__tutorials a[href="https://www.anu.edu.au/students/program-administration/timetabling"]')).not.toBeNull();
    expect(sessionRow(doc, "2027-S1").querySelector(".details__tutorials")).toBeNull();
    expect(sessionRow(doc, "2026-S1").querySelector(".details__tutorials")).toBeNull();
  });
});
