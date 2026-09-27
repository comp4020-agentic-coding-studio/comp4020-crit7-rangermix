import { describe, expect, it } from "vitest";
import { permissionReason } from "./permission";

const pg = { programCareer: "PGRD" as const, completed: new Set<string>() };
const course = (requisites: string | null, career: "UGRD" | "PGRD" = "PGRD") => ({ code: "COMP8000", career, requisites });

describe("permissionReason (spec §15.5)", () => {
  it("asks for a code when the class is from the other career", () => {
    expect(permissionReason(course(null, "UGRD"), "semester", pg)).toBe("it's an undergraduate course and your program is postgraduate");
    expect(permissionReason(course(null, "PGRD"), "semester", { ...pg, programCareer: "UGRD" })).toBe("it's a postgraduate course and your program is undergraduate");
  });

  it("asks for a code when P&C's requisites do, in any of their wordings", () => {
    for (const text of [
      "Students who meet the prerequisites can request a permission code from the College.",
      "Students will receive a permission code by completing the steps listed on Enrolling in student projects.",
      "To enrol you must: find a project/supervisor AND receive a permission code by completing the steps listed.",
    ]) {
      expect(permissionReason(course(text), "semester", pg)).toBe("P&C's requisites ask for one");
    }
  });

  it("asks only in intensive mode when P&C says so", () => {
    const text = "Incompatible with COMP3430. A permission code is needed to take this course in intensive mode.";
    expect(permissionReason(course(text), "semester", pg)).toBeNull();
    expect(permissionReason(course(text), "intensive", pg)).toBe("P&C's requisites ask for one in intensive mode");
  });

  it("asks only after the courses P&C names, when the student has completed one", () => {
    const text = "Students who have previously completed COMP3710 or COMP6470 - please contact CSS Student Services for a Permission Code.";
    expect(permissionReason(course(text), "semester", pg)).toBeNull();
    expect(permissionReason(course(text), "semester", { ...pg, completed: new Set(["COMP6470"]) })).toBe("you've completed COMP6470, and P&C's requisites ask for one then");
  });

  it("asks for nothing otherwise", () => {
    expect(permissionReason(course("To enrol in this course you must have completed COMP6710."), "semester", pg)).toBeNull();
    expect(permissionReason(course(null), "intensive", pg)).toBeNull();
  });
});
