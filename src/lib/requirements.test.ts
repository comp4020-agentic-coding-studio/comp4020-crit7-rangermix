import { describe, expect, it } from "vitest";
import { evaluateRequirements, type GroupInput, type Offer, type RequirementInput, type RequirementResult, type Take } from "./requirements";

// The template student (spec §8.5) under VCOMP + ARTIF-SPEC's tracked groups.
const units: Record<string, number> = { COMP8800: 12 };
const COURSES = new Map(
  ["COMP6250", "COMP8260", "COMP6442", "COMP6445", "COMP8800", "COMP6262", "COMP6320", "COMP8620", "COMP8691"].map((code) => [code, { title: `${code} title`, units: units[code] ?? 6 }]),
);
const list = (...codes: string[]) => codes.map((code) => ({ code, times: code === "COMP8800" ? 2 : 1 }));
const GROUPS: GroupInput[] = [
  { id: 1, source: "program", rule: "units", minUnits: 6, label: "6 units from one of", text: "6 units from the completion of one of the following courses:", courses: list("COMP6250", "COMP8260") },
  { id: 2, source: "program", rule: "all", minUnits: null, label: "Compulsory", text: "12 units from completion of the following compulsory courses:", courses: list("COMP6442", "COMP6445") },
  { id: 3, source: "program", rule: "all", minUnits: null, label: "All of", text: "24 units from completion of", courses: list("COMP8800") },
  { id: 4, source: "program", rule: "note", minUnits: null, label: "Note", text: "A minimum of 48 units must come from completion of 8000-level COMP courses", courses: [] },
  { id: 5, source: "plan", rule: "all", minUnits: null, label: "All of", text: "The 24 units must consist of:", courses: list("COMP6262", "COMP6320", "COMP8620", "COMP8691") },
];
const done = (code: string, grade: string | null, sessionName = "First Semester 2026"): Take => ({ courseCode: code, sessionId: "2026-S1", sessionName, state: "completed", current: false, grade });
const now = (code: string): Take => ({ courseCode: code, sessionId: "2026-S2", sessionName: "Second Semester 2026", state: "enrolled", current: true, grade: null });
const TAKES = [done("COMP6262", "D"), done("COMP6320", "HD"), done("COMP6445", "D"), now("COMP6442"), now("COMP8620"), now("COMP8691")];
const S1_2027: Offer = { sessionId: "2027-S1", sessionName: "First Semester 2027", current: false };
const S2_2027: Offer = { sessionId: "2027-S2", sessionName: "Second Semester 2027", current: false };

function input(patch: Partial<RequirementInput> = {}): RequirementInput {
  return {
    groups: GROUPS,
    courses: COURSES,
    takes: TAKES,
    offers: new Map([
      ["COMP8800", [S1_2027, S2_2027]],
      ["COMP6442", [S1_2027]],
    ]),
    listed: new Set(["COMP8800", "COMP6442", "COMP6445", "COMP6262", "COMP6320", "COMP8620", "COMP8691"]),
    next: { id: "2027-S1", name: "First Semester 2027" },
    ...patch,
  };
}
const status = (r: RequirementResult, code: string) => [...r.groups.flatMap((g) => g.courses), ...r.notes.flatMap((n) => n.courses)].find((c) => c.code === code);

describe("evaluateRequirements (spec §5.3)", () => {
  it("gives the template student every status, and 18 of 66 done · 18 enrolled", () => {
    const r = evaluateRequirements(input());
    expect(status(r, "COMP6445")).toMatchObject({ icon: "done", text: "Completed · First Semester 2026 · D", add: null });
    expect(status(r, "COMP6442")).toMatchObject({ icon: "enrolled", text: "Enrolled · Second Semester 2026 (now)", add: null });
    expect(status(r, "COMP8800")).toMatchObject({ icon: "todo", text: "Not enrolled", times: 2, add: { sessionId: "2027-S1", label: "Add to First Semester 2027" } });
    expect(status(r, "COMP6250")).toMatchObject({ icon: "todo", text: "Not enrolled · No classes listed in P&C for 2026–2027", add: null });
    expect(r.groups.map((g) => g.state)).toEqual(["not-met", "in-progress", "not-met", "in-progress"]);
    expect(r.notes.map((n) => n.id)).toEqual([4]);
    expect(r.summary).toEqual({ done: 18, enrolled: 18, total: 66 });
  });

  it("counts COMP8800's first take as 1 of 2, and 30 units enrolled", () => {
    const take: Take = { courseCode: "COMP8800", sessionId: "2027-S1", sessionName: "First Semester 2027", state: "enrolled", current: false, grade: null };
    const r = evaluateRequirements(input({ takes: [...TAKES, take] }));
    expect(status(r, "COMP8800")).toMatchObject({ icon: "partial", text: "Enrolled · First Semester 2027 (1 of 2)", add: null });
    expect(r.summary).toEqual({ done: 18, enrolled: 30, total: 66 });
  });

  it("says where a course is next offered when the next semester doesn't offer it", () => {
    const r = evaluateRequirements(input({ offers: new Map([["COMP8800", [S2_2027]]]) }));
    expect(status(r, "COMP8800")).toMatchObject({ text: "Not enrolled · Next offered: Second Semester 2027", add: null });
  });

  it("tells 'no open classes' apart from 'no classes at all'", () => {
    const r = evaluateRequirements(input({ offers: new Map() }));
    expect(status(r, "COMP8800")?.text).toBe("Not enrolled · No more classes listed in P&C for 2026–2027");
  });

  it("marks a satisfied units group's other courses as not needed", () => {
    const r = evaluateRequirements(input({ takes: [...TAKES, done("COMP6250", "P")] }));
    expect(r.groups[0].state).toBe("met");
    expect(status(r, "COMP8260")).toMatchObject({ icon: "none", text: "Not needed (group satisfied)", add: null });
  });

  it("shows a completed take of a twice-needed course ahead of what's left", () => {
    const r = evaluateRequirements(input({ takes: [...TAKES, done("COMP8800", "HD")] }));
    expect(status(r, "COMP8800")).toMatchObject({ icon: "partial", text: "Completed · First Semester 2026 · HD (1 of 2) · Not enrolled" });
  });

  it("shows a completed take without a grade as plain Completed (M2's date moves)", () => {
    const r = evaluateRequirements(input({ takes: [{ ...now("COMP8620"), state: "completed", current: false }] }));
    expect(status(r, "COMP8620")?.text).toBe("Completed · Second Semester 2026");
  });
});
