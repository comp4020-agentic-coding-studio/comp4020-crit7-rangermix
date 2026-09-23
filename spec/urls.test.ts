import { describe, expect, it } from "vitest";
import { Visitor } from "./helpers";

// Review Focus 1: a malformed or stale link must never produce a 500 (spec §9).
const notices = (doc: Document): string => doc.querySelector('[aria-label="Notices"]')?.textContent ?? "";

describe("malformed links to /", () => {
  it.each([
    ["/?open=2099-S9", "isn't in the prototype's data"],
    ["/?open=2026-S2,nope", "isn't in the prototype's data"],
    ["/?choose=garbage", "class chooser"],
    ["/?choose=COMP8020&term=2027-S1", "class chooser"],
    ["/?choose=POGO8062&term=nope", "isn't in the prototype's data"],
    ["/?browse=nope", "isn't in the prototype's data"],
    ["/?browse=2027-S1&page=abc", "isn't a page number"],
    ["/?browse=2027-S1&page=-1", "isn't a page number"],
    ["/?browse=2027-S1&level=7", "level"],
    ["/?browse=2027-S1&sort=bogus", "sorted by code"],
    [`/?browse=2027-S1&q=${"x".repeat(5000)}`, "cut to 100 characters"],
  ])("renders %s with a notice", async (path, words) => {
    expect(notices(await new Visitor().page(path))).toContain(words);
  });

  it("clamps a page past the end without an error", async () => {
    const doc = await new Visitor().page("/?browse=2027-S1&page=999");
    expect(doc.querySelectorAll(".results tbody tr").length).toBeGreaterThan(0);
  });

  it("answers a link with broken percent-encoding with Astro's 400, never a 500", async () => {
    expect((await new Visitor().get("/?open=%E0%A4%A")).status).toBe(400);
  });

  it("renders an empty open list with every session closed", async () => {
    const doc = await new Visitor().page("/?open=");
    expect(doc.querySelectorAll("details[data-session][open]")).toHaveLength(0);
  });
});
