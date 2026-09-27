import { describe, expect, it } from "vitest";
import type { EnrolmentView, View, WriteResponse } from "../src/lib/types";
import { Visitor } from "./helpers";

// Drop asks first once a class has started, and says what dropping then costs (spec §15.2).
const enrolmentIn = (view: View, sessionId: string, courseCode: string): EnrolmentView | undefined =>
  view.sessions.find((s) => s.id === sessionId)?.enrolments.find((e) => e.courseCode === courseCode && e.state === "enrolled");

/** A sandbox enrolled in COMP8800 for First Semester 2027 (while it can still be added), then moved to `today`. */
async function comp8800On(today: string): Promise<View> {
  const v = new Visitor();
  await v.postJson<WriteResponse>("/api/demo/settings", { today: "2026-12-10" });
  const added = await v.postJson<WriteResponse>("/api/enrol", { session: "2027-S1", entry: "COMP8800" });
  expect(added.body.outcomes[0].ok).toBe(true);
  return (await v.postJson<WriteResponse>("/api/demo/settings", { today })).body.view;
}

describe("drop asks first once a class has started (spec §15.2)", () => {
  it("explains a drop after census: no re-add, still charged, WD until the no-fail date, and the international load rule", async () => {
    const { body } = await new Visitor().getJson<View>("/api/view");
    const e = enrolmentIn(body, "2026-S2", "COMP6442");
    expect(e).toMatchObject({ canDrop: true, dropConfirm: true });
    expect(e?.dropConsequences).toEqual([
      "You can't add it back: adding closed on Mon 3 Aug.",
      "You'll still be charged for it: the census date was Mon 31 Aug.",
      "Your transcript will show WD (withdrawal without failure), not a fail, if you drop by Fri 9 Oct; after that it's WN (withdrawn with failure).",
      "International students need a Reduced Study Load Application in ANUHub to drop below 24 units in a half-year; this would leave 18 units in the second half of 2026.",
    ]);
  });

  it("drops a class that hasn't started in one click, noting it leaves no record", async () => {
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2027-S1", entry: "COMP8800" });
    expect(enrolmentIn(body.view, "2027-S1", "COMP8800")).toMatchObject({
      canDrop: true,
      dropConfirm: false,
      dropConsequences: ["It hasn't started, so dropping it leaves no record; you can add it back until Mon 1 Mar."],
    });
  });

  it("before census: no fee and no grade on the transcript", async () => {
    const e = enrolmentIn(await comp8800On("2027-03-10"), "2027-S1", "COMP8800");
    expect(e?.dropConfirm).toBe(true);
    expect(e?.dropConsequences).toEqual([
      "You can't add it back: adding closed on Mon 1 Mar.",
      "No fee and no grade on your transcript if you drop by Wed 31 Mar, the census date.",
      "International students need a Reduced Study Load Application in ANUHub to drop below 24 units in a half-year; this would leave 0 units in the first half of 2027.",
    ]);
  });

  it("counts down to census when it's close, and says a drop after the no-fail date shows WN", async () => {
    expect(enrolmentIn(await comp8800On("2027-03-28"), "2027-S1", "COMP8800")?.dropConsequences[1]).toBe(
      "No fee and no grade on your transcript if you drop by Wed 31 Mar, the census date (in 3 days).",
    );
    const late = enrolmentIn(await comp8800On("2027-05-20"), "2027-S1", "COMP8800");
    expect(late?.dropConsequences.slice(1, 3)).toEqual([
      "You'll still be charged for it: the census date was Wed 31 Mar.",
      "Your transcript will show WN (withdrawn with failure): the last day to drop without failure was Fri 7 May.",
    ]);
  });

  it("offers nothing to confirm when there's no Drop", async () => {
    const { body } = await new Visitor().getJson<View>("/api/view");
    const done = body.sessions.find((s) => s.id === "2026-S1")?.enrolments[0];
    expect(done).toMatchObject({ canDrop: false, dropConfirm: false, dropConsequences: [] });
  });
});
