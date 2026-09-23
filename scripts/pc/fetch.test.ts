import { describe, expect, it } from "vitest";
import { cachePath } from "./fetch.ts";
import { courseListUrl, pageUrl, planCodes, PROGRAMS } from "./scope.ts";

describe("scope (spec §8.1)", () => {
  it("covers five programs and fifteen distinct plans, shared plans once", () => {
    expect(PROGRAMS.map((p) => p.code)).toEqual(["BCOMP", "AACOM", "AACRD", "7706XMCOMP", "7722XVCOMP"]);
    expect(planCodes()).toHaveLength(15);
  });
  it("puts the year in every page URL (year-less URLs serve 2027)", () => {
    expect(pageUrl("course", "COMP8020")).toBe("https://programsandcourses.anu.edu.au/2026/course/COMP8020");
    expect(pageUrl("course", "COMP8020", 2027)).toBe("https://programsandcourses.anu.edu.au/2027/course/COMP8020");
  });
});

describe("cachePath", () => {
  it("mirrors a page's URL path under .cache/pc/", () => {
    expect(cachePath(pageUrl("specialisation", "ARTIF-SPEC"))).toBe(".cache/pc/2026/specialisation/ARTIF-SPEC");
  });
  it("keeps query strings apart and file-safe", () => {
    expect(cachePath(courseListUrl(2026))).not.toBe(cachePath(courseListUrl(2027)));
    expect(cachePath(courseListUrl(2026))).toMatch(/^\.cache\/pc\/data\/CourseSearch\/GetCourses_[A-Za-z0-9=._-]+$/);
  });
});
