import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type BuildInput, buildSnapshot, type CalendarSession, finaliseGroups } from "./build.ts";
import { pageUrl } from "./scope.ts";

const page = (kind: string, code: string): string => readFileSync(`scripts/pc/fixtures/2026/${kind}/${code}.html`, "utf8");
const calendar = (JSON.parse(readFileSync("src/data/calendar.json", "utf8")) as { sessions: CalendarSession[] }).sessions;

function input(patch: Partial<BuildInput> = {}): BuildInput {
  return {
    fetchedOn: "2026-09-24",
    courseLists: {
      2026: [{ CourseCode: "COMP8020", Name: "Advanced Topics in Human-Centred and Creative Computing", Units: 6, Career: "Postgraduate" }],
      2027: [{ CourseCode: "COMP8020", Name: "Advanced Topics in Human-Centred and Creative Computing", Units: 6, Career: "Postgraduate" }],
    },
    planPages: [],
    coursePages: [{ code: "COMP8020", url: pageUrl("course", "COMP8020"), html: page("course", "COMP8020") }],
    calendar,
    overrides: { times: [] },
    anuhub: [
      { classNumber: 9057, courseCode: "COMP8020" },
      { classNumber: 8665, courseCode: "COMP6996" },
    ],
    ...patch,
  };
}

describe("buildSnapshot", () => {
  it("keeps the 2026 and 2027 classes, mapped to calendar sessions, and drops 2028", () => {
    const out = buildSnapshot(input());
    expect(out.errors).toEqual([]);
    const ids = out.classes.map((c) => `${c.sessionId}#${c.classNumber}`);
    expect(ids).toContain("2026-S2#9057");
    expect(ids).toContain("2027-S2#10060");
    expect(out.classes.every((c) => c.sessionId.startsWith("2026") || c.sessionId.startsWith("2027"))).toBe(true);
    expect(out.courses[0]).toMatchObject({ code: "COMP8020", subject: "COMP", catalogue: "8020", level: 8000, career: "PGRD", units: 6 });
  });

  it("fails on a class whose session heading it doesn't know", () => {
    const html = page("course", "COMP8020").replace(/<h3([^>]*)>\s*Second Semester\s*<\/h3>/, "<h3$1>Full Year</h3>");
    const out = buildSnapshot(input({ coursePages: [{ code: "COMP8020", url: pageUrl("course", "COMP8020"), html }] }));
    expect(out.errors.join("\n")).toMatch(/unknown session heading "Full Year"/);
  });

  it("records the ANUHub cross-check, P&C winning", () => {
    const out = buildSnapshot(input());
    expect(out.provenance).toContain("COMP6996 class 8665");
    expect(out.provenance).toMatch(/1\s+agree/);
  });

  it("keeps a course whose classes include TBA dates, and records the classes it leaves out", () => {
    const out = buildSnapshot(input({ coursePages: [...input().coursePages, { code: "REGN8050", url: pageUrl("course", "REGN8050"), html: page("course", "REGN8050") }] }));
    expect(out.errors).toEqual([]);
    expect(out.courses.map((c) => c.code)).toContain("REGN8050");
    expect(out.classes.some((c) => c.classNumber === 1839)).toBe(false);
    expect(out.provenance).toMatch(/REGN8050 class 1839 \(2027[^)]*\): P&C lists its dates as "TBA"/);
  });

  it("fails on an override that matches no requirement group", () => {
    const out = buildSnapshot(input({ overrides: { times: [{ plan: "7722XVCOMP", code: "COMP8800", times: 2, why: "test" }] } }));
    expect(out.errors.join("\n")).toMatch(/override 7722XVCOMP\/COMP8800 matches no requirement group/);
  });
});

describe("finaliseGroups", () => {
  it("drops courses the snapshot lacks, records them, and turns an emptied tracked group into a note", () => {
    const { groups, dead } = finaliseGroups(
      [{ label: "Compulsory", rule: "all", minUnits: null, text: "the following compulsory courses:", courses: [{ code: "COMP0000", times: 1 }] }],
      () => false,
    );
    expect(dead).toEqual(["COMP0000"]);
    expect(groups[0]).toMatchObject({ rule: "note", courses: [] });
  });
});
