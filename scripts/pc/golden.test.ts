import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { finaliseGroups, type Overrides, type PcCourse, type PcRequirements, timesFor } from "./build.ts";
import { type ParsedGroup, parsePlanPage, requirementGroups } from "./parse.ts";
import { planKind } from "./scope.ts";

// Pins the parsed shape of every plan page: each group's rule, minUnits and
// courses. A parser change or a P&C wording change shows up here as a diff.
const json = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const units = new Map(json<PcCourse[]>("src/data/pc/courses.json").map((c) => [c.code, c.units]));
const committed = json<PcRequirements[]>("src/data/pc/requirements.json");
const overrides = json<Overrides>("scripts/pc/overrides.json");
const shape = (groups: ParsedGroup[]) => groups.map((g) => ({ rule: g.rule, minUnits: g.minUnits, courses: g.courses.map((c) => `${c.code}×${c.times}`) }));

describe("requirements golden test: the parsed shape of every plan page", () => {
  it("covers the 20 program and plan pages", () => {
    expect(committed).toHaveLength(20);
  });

  for (const plan of committed) {
    it(plan.planCode, () => {
      const html = readFileSync(`scripts/pc/fixtures/2026/${planKind(plan.planCode)}/${plan.planCode}.html`, "utf8");
      const parsed = requirementGroups(parsePlanPage(html).requirements, (c) => units.get(c), timesFor(overrides, plan.planCode));
      expect(shape(finaliseGroups(parsed, (c) => units.has(c)).groups)).toEqual(shape(plan.groups));
    });
  }

  it("tracks 66 units for 7722XVCOMP with ARTIF-SPEC (spec §5.3)", () => {
    const groups = ["7722XVCOMP", "ARTIF-SPEC"].flatMap((code) => committed.find((r) => r.planCode === code)?.groups ?? []);
    const total = groups.reduce((sum, g) => {
      if (g.rule === "all") return sum + g.courses.reduce((s, c) => s + (units.get(c.code) ?? 0) * c.times, 0);
      if (g.rule === "units") return sum + (g.minUnits ?? 0);
      return sum;
    }, 0);
    expect(total).toBe(66);
  });
});
