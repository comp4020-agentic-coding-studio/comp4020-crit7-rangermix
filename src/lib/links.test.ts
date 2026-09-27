import { describe, expect, it } from "vitest";
import { classPageUrl } from "./links";

describe("classPageUrl (spec §15.6)", () => {
  it("builds P&C's class page address from the session's year and name", () => {
    expect(classPageUrl({ name: "First Semester 2027", year: 2027 }, "COMP8800", 5048)).toBe("https://programsandcourses.anu.edu.au/2027/course/COMP8800/First%20Semester/5048");
    expect(classPageUrl({ name: "Autumn Session 2026", year: 2026 }, "COMP8999", 5406)).toBe("https://programsandcourses.anu.edu.au/2026/course/COMP8999/Autumn%20Session/5406");
  });
});
