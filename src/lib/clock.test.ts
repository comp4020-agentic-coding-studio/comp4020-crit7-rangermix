import { afterEach, describe, expect, it, vi } from "vitest";
import { canberraDate, realToday, today } from "./clock";

describe("canberraDate (Review Focus 2: Fly runs on UTC)", () => {
  it("rolls over at Canberra's midnight, not UTC's", () => {
    expect(canberraDate(new Date("2026-09-24T13:59:00Z"))).toBe("2026-09-24"); // 23:59 AEST
    expect(canberraDate(new Date("2026-09-24T14:00:00Z"))).toBe("2026-09-25"); // 00:00 AEST
  });
  it("follows daylight saving", () => {
    expect(canberraDate(new Date("2026-12-31T12:59:00Z"))).toBe("2026-12-31"); // 23:59 AEDT
    expect(canberraDate(new Date("2026-12-31T13:00:00Z"))).toBe("2027-01-01"); // 00:00 AEDT
  });
});

describe("today", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("uses APP_TODAY when it is a date", () => {
    vi.stubEnv("APP_TODAY", "2026-09-24");
    expect(realToday()).toBe("2026-09-24");
    expect(today()).toBe("2026-09-24");
  });
  it("ignores a malformed APP_TODAY and uses Canberra's date", () => {
    vi.stubEnv("APP_TODAY", "tomorrow");
    expect(realToday()).toBe(canberraDate(new Date()));
  });
  it("puts a student's demo date first (spec §11.4)", () => {
    vi.stubEnv("APP_TODAY", "2026-09-24");
    expect(today({ today: "2027-03-02" })).toBe("2027-03-02");
    expect(today({ today: null })).toBe("2026-09-24");
  });
});
