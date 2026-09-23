import { describe, expect, it } from "vitest";
import { addDays, fmtDate, fmtDay, fmtRange, fmtUnits } from "./format";

describe("format (en-AU, locale-free)", () => {
  it("formats days and dates", () => {
    expect(fmtDay("2026-08-03")).toBe("3 Aug");
    expect(fmtDate("2026-09-24")).toBe("24 Sep 2026");
  });
  it("formats ranges within a month, within a year and across years", () => {
    expect(fmtRange("2026-11-05", "2026-11-21")).toBe("5–21 Nov");
    expect(fmtRange("2026-07-27", "2026-10-30")).toBe("27 Jul–30 Oct");
    expect(fmtRange("2026-11-30", "2027-02-26")).toBe("30 Nov 2026–26 Feb 2027");
  });
  it("formats units", () => {
    expect(fmtUnits(6)).toBe("6 units");
    expect(fmtUnits(1)).toBe("1 unit");
    expect(fmtUnits(1.5)).toBe("1.5 units");
  });
  it("adds days across months and leap years", () => {
    expect(addDays("2026-11-05", -1)).toBe("2026-11-04");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});
