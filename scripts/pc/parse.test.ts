import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isSoftNotFound,
  type ParsedGroup,
  parseCoursePage,
  parseDate,
  parsePlanPage,
  type RequirementItem,
  requirementGroups,
  sessionSlug,
} from "./parse.ts";

const fixture = (path: string): string => readFileSync(`scripts/pc/fixtures/2026/${path}.html`, "utf8");

const UNITS: Record<string, number> = {
  COMP6250: 6,
  COMP8260: 6,
  COMP6442: 6,
  COMP6445: 6,
  COMP8800: 12,
  COMP6262: 6,
  COMP6320: 6,
  COMP8620: 6,
  COMP8691: 6,
};
const unitsOf = (code: string): number | undefined => UNITS[code];
const once = (): number => 1;
const tracked = (groups: ParsedGroup[]) =>
  groups
    .filter((g) => g.rule !== "note")
    .map((g) => ({ label: g.label, rule: g.rule, minUnits: g.minUnits, courses: g.courses.map((c) => `${c.code}×${c.times}`) }));

describe("parseDate", () => {
  it("reads P&C's dates as ISO dates", () => {
    expect(parseDate("27 Jul 2026")).toBe("2026-07-27");
    expect(parseDate(" 03 Aug 2026 ")).toBe("2026-08-03");
  });
  it("refuses anything else, so a format change fails the build", () => {
    expect(() => parseDate("2026-07-27")).toThrow(/unrecognised date/);
  });
});

describe("sessionSlug", () => {
  it("maps P&C's session headings to the calendar's slugs", () => {
    expect(sessionSlug("First Semester")).toBe("S1");
    expect(sessionSlug("Second Semester")).toBe("S2");
    expect(sessionSlug("Summer Session")).toBe("SUM");
    expect(sessionSlug("Autumn Session")).toBe("AUT");
    expect(sessionSlug("Winter Session")).toBe("WIN");
    expect(sessionSlug("Spring Session")).toBe("SPR");
    expect(sessionSlug("Full Year")).toBeNull();
  });
});

describe("isSoftNotFound", () => {
  it("spots P&C's HTTP-200 not-found answers", () => {
    expect(isSoftNotFound("https://programsandcourses.anu.edu.au/Error/Index/404?aspxerrorpath=/2026/course/COMP9999", "<html></html>")).toBe(true);
    expect(isSoftNotFound("https://programsandcourses.anu.edu.au/2026/course/COMP9999", "<title>Page not found - ANU</title>")).toBe(true);
  });
  it("passes a real page", () => {
    expect(isSoftNotFound("https://programsandcourses.anu.edu.au/2026/course/COMP8020", fixture("course/COMP8020"))).toBe(false);
  });
});

describe("parseCoursePage (COMP8020)", () => {
  const page = parseCoursePage(fixture("course/COMP8020"));

  it("reads the summary, description and requisites", () => {
    expect(page).toMatchObject({
      code: "COMP8020",
      title: "Advanced Topics in Human-Centred and Creative Computing",
      units: 6,
      career: "PGRD",
      subjectName: "Computer Science",
      mode: "In Person",
    });
    expect(page.description.length).toBeGreaterThan(50);
    expect(page.requisites).toMatch(/^To enrol in this course, you must have completed COMP6390\./);
  });

  it("reads every offering, applying a topic row to the classes under it", () => {
    expect(page.offerings).toContainEqual({
      year: 2026,
      sessionName: "Second Semester",
      classNumber: 9057,
      startDate: "2026-07-27",
      lastDayToEnrol: "2026-08-03",
      censusDate: "2026-08-31",
      endDate: "2026-10-30",
      mode: "In Person",
      topic: "Agentic Coding Studio",
    });
    expect(page.offerings).toContainEqual(
      expect.objectContaining({
        year: 2027,
        sessionName: "Second Semester",
        classNumber: 10060,
        startDate: "2027-07-26",
        lastDayToEnrol: "2027-08-02",
        censusDate: "2027-08-31",
        endDate: "2027-10-29",
      }),
    );
  });
});

describe("parseCoursePage (real-data edge cases from the 2026-09-24 crawl)", () => {
  it("leaves out a class whose enrolment dates are TBA, records it, and keeps the course", () => {
    const page = parseCoursePage(fixture("course/REGN8050"));
    expect(page.code).toBe("REGN8050");
    expect(page.offerings.map((o) => o.classNumber)).not.toContain(1839);
    expect(page.skipped).toContainEqual(expect.objectContaining({ year: 2027, classNumber: 1839, reason: expect.stringContaining("TBA") }));
    expect(page.offerings.length).toBeGreaterThan(0);
  });

  it("doesn't read a delivery group row (On Campus, Online) as a topic", () => {
    for (const code of ["POGO8062", "REGN8050"]) {
      const page = parseCoursePage(fixture(`course/${code}`));
      expect(page.offerings.length).toBeGreaterThan(0);
      expect(page.offerings.map((o) => o.topic)).toEqual(page.offerings.map(() => null));
    }
  });
});

describe("parsePlanPage (7722XVCOMP)", () => {
  const page = parsePlanPage(fixture("program/7722XVCOMP"));

  it("reads the program's identity and its specialisations", () => {
    expect(page).toMatchObject({ code: "7722XVCOMP", name: "Master of Computing (Advanced)", acronym: "MCOMPADV", postNominal: "MCompAdv", units: 96 });
    expect(page.childPlans).toEqual(expect.arrayContaining(["ARTIF-SPEC", "CMSY-SPEC", "DTSC-SPEC", "MCHL-SPEC", "SOFT-SPEC"]));
  });

  it("turns the requirements into VCOMP's three tracked groups (spec §6.1)", () => {
    const groups = requirementGroups(page.requirements, unitsOf, (code) => (code === "COMP8800" ? 2 : 1));
    expect(tracked(groups)).toEqual([
      { label: "6 units from one of", rule: "units", minUnits: 6, courses: ["COMP6250×1", "COMP8260×1"] },
      { label: "Compulsory", rule: "all", minUnits: null, courses: ["COMP6442×1", "COMP6445×1"] },
      { label: "All of", rule: "all", minUnits: null, courses: ["COMP8800×2"] },
    ]);
  });

  it("keeps every other rule verbatim as a note", () => {
    const notes = requirementGroups(page.requirements, unitsOf, once).filter((g) => g.rule === "note");
    expect(notes.some((n) => n.text.includes("A minimum of 48 units must come from completion of 8000-level COMP courses"))).toBe(true);
    expect(notes.some((n) => n.text.includes("12 units from completion of elective courses offered by ANU"))).toBe(true);
    expect(notes.some((n) => n.courses.some((c) => c.code === "COMP8800"))).toBe(true); // the supervisor rule links COMP8800
  });
});

describe("parsePlanPage (ARTIF-SPEC)", () => {
  const page = parsePlanPage(fixture("specialisation/ARTIF-SPEC"));

  it("reads the specialisation's identity and the degrees it belongs to", () => {
    expect(page).toMatchObject({ code: "ARTIF-SPEC", name: "Artificial Intelligence", acronym: "ARTIF", units: 24, career: "PGRD" });
    expect(page.relevantDegrees).toEqual(["7706XMCOMP", "7722XVCOMP"]);
  });

  it("tracks its four listed courses as one group", () => {
    expect(tracked(requirementGroups(page.requirements, unitsOf, once))).toEqual([
      { label: "All of", rule: "all", minUnits: null, courses: ["COMP6262×1", "COMP6320×1", "COMP8620×1", "COMP8691×1"] },
    ]);
  });
});

describe("requirementGroups (R1, spec §8.3)", () => {
  const line = (code: string, also: string[] = []): RequirementItem => ({ text: `${code} A Course (6 units)`, codes: [code, ...also], lead: code });
  const para = (text: string, codes: string[] = []): RequirementItem => ({ text, codes, lead: null });

  it("reads 'N units from … one of the following' as a units group", () => {
    const [g] = requirementGroups([[para("12 units from completion of one of the following courses:"), line("COMP6250"), line("COMP8260"), line("COMP6442")]], unitsOf, once);
    expect(g).toMatchObject({ rule: "units", minUnits: 12, label: "12 units from one of", text: "12 units from completion of one of the following courses:" });
  });

  it("classifies a paragraph with inline course links on its own", () => {
    const [g] = requirementGroups([[para("6 units from completion of COMP6250 or COMP8260", ["COMP6250", "COMP8260"])]], unitsOf, once);
    expect(g).toMatchObject({ rule: "units", minUnits: 6 });
  });

  it("makes a list containing an either/or line a note instead of guessing", () => {
    const [g] = requirementGroups([[para("12 units from completion of the following compulsory courses:"), line("COMP6442", ["COMP6445"]), line("COMP6262")]], unitsOf, once);
    expect(g.rule).toBe("note");
    expect(g.courses.map((c) => c.code)).toEqual(["COMP6442", "COMP6445", "COMP6262"]);
  });

  it("makes 'a maximum of' a note", () => {
    const [g] = requirementGroups([[para("A maximum of 12 units from the following courses:"), line("COMP6442"), line("COMP6445")]], unitsOf, once);
    expect(g.rule).toBe("note");
  });

  it("makes a run of courses with no heading a note", () => {
    const [g] = requirementGroups([[line("COMP6442"), line("COMP6445")]], unitsOf, once);
    expect(g).toMatchObject({ rule: "note", courses: [{ code: "COMP6442", times: 1 }, { code: "COMP6445", times: 1 }] });
  });

  it("makes a sentence that excludes its linked courses a note (SOFT-SPEC)", () => {
    const text = "6 units from completion of an 8000-level course from the subject area COMP Computing, excluding the project courses (COMP8715, COMP8800, COMP8830).";
    const [g] = requirementGroups([[para(text, ["COMP8715", "COMP8800", "COMP8830"])]], (c) => (c === "COMP8800" ? 12 : 6), once);
    expect(g.rule).toBe("note");
  });

  it("makes a paragraph that starts 'Note:' a note (SOFT-SPEC)", () => {
    const [g] = requirementGroups([[para("Note: MCOMP students who complete COMP6120 as part of their program rules need to replace it with 6 units of 6000/8000 COMP.", ["COMP6120"])]], () => 6, once);
    expect(g.rule).toBe("note");
  });

  it("makes a units group its courses can't reach a note, never an unmeetable rule (AACOM's honours options)", () => {
    const text = "24 units from completion of COMP4550 Computing Research Project, which must be completed twice, in consecutive semesters (12+12 units)";
    const [g] = requirementGroups([[{ text, codes: ["COMP4550"], lead: "COMP4550" }]], () => 12, once);
    expect(g.rule).toBe("note");
    const [h] = requirementGroups([[para(text, ["COMP4550"])]], () => 12, once);
    expect(h.rule).toBe("note");
  });

  it("merges consecutive plain paragraphs in a chunk into one note, one line each", () => {
    const groups = requirementGroups([[para("The 96 units must consist of:"), para("Artificial Intelligence"), para("Data Science")]], unitsOf, once);
    expect(groups).toEqual([{ label: "Note", rule: "note", minUnits: null, text: "The 96 units must consist of:\nArtificial Intelligence\nData Science", courses: [] }]);
  });
});
