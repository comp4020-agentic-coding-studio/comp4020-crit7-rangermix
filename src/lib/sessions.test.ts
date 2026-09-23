import { describe, expect, it } from "vitest";
import calendar from "../data/calendar.json";
import { canAdd, canDrop, classify, dropDeadline, isPast, type SessionDates } from "./sessions";

const sessions = calendar.sessions as SessionDates[];
const session = (id: string): SessionDates => {
  const s = sessions.find((x) => x.id === id);
  if (!s) throw new Error(`no session ${id}`);
  return s;
};
const badges = (today: string): Record<string, string> => Object.fromEntries(classify(sessions, today).badges);

describe("classify (spec §5.3)", () => {
  it("on 2026-09-24: Second Semester and Winter 2026 are Now, First Semester 2027 is Next", () => {
    expect(classify(sessions, "2026-09-24").nextId).toBe("2027-S1");
    expect(badges("2026-09-24")).toMatchObject({
      "2026-SUM": "past",
      "2026-S1": "past",
      "2026-AUT": "past",
      "2026-WIN": "now",
      "2026-S2": "now",
      "2026-SPR": "upcoming",
      "2027-SUM": "upcoming",
      "2027-S1": "next",
      "2027-S2": "upcoming",
    });
  });
  it("keeps a semester Now until its exams end", () => {
    expect(badges("2026-11-21")["2026-S2"]).toBe("now");
    expect(badges("2026-11-22")["2026-S2"]).toBe("past");
  });
  it("on 2026-12-10: Spring 2026 is Now and First Semester 2027 is still Next", () => {
    expect(badges("2026-12-10")).toMatchObject({ "2026-SPR": "now", "2027-S1": "next" });
  });
  it("on 2027-03-02: First Semester 2027 is Now and Second Semester 2027 is Next", () => {
    expect(badges("2027-03-02")).toMatchObject({ "2027-S1": "now", "2027-S2": "next" });
  });
  it("has no next semester after the last one in the data", () => {
    expect(classify(sessions, "2027-12-31").nextId).toBeNull();
  });
});

describe("deadlines (spec §5.3)", () => {
  const cls = { lastDayToEnrol: "2027-03-01", endDate: "2027-05-28" };
  it("allows adding up to and including the last day to enrol", () => {
    expect(canAdd(cls, "2027-03-01")).toBe(true);
    expect(canAdd(cls, "2027-03-02")).toBe(false);
  });
  it("allows dropping a semester class until the day before exams start", () => {
    expect(dropDeadline(cls, session("2026-S2"))).toBe("2026-11-04");
    expect(canDrop(cls, session("2026-S2"), "2026-11-04")).toBe(true);
    expect(canDrop(cls, session("2026-S2"), "2026-11-05")).toBe(false);
  });
  it("allows dropping an intensive class until its own end date", () => {
    expect(dropDeadline({ lastDayToEnrol: "2026-07-10", endDate: "2026-07-26" }, session("2026-WIN"))).toBe("2026-07-26");
  });
  it("counts a semester as past only after its exams end", () => {
    expect(isPast(session("2026-S1"), "2026-06-20")).toBe(false);
    expect(isPast(session("2026-S1"), "2026-06-21")).toBe(true);
  });
});
