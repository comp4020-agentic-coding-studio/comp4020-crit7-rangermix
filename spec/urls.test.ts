import { describe, expect, it } from "vitest";
import { Visitor } from "./helpers";

// Review Focus 1: a malformed or stale link must never produce a 500 (spec §9).
const notices = (doc: Document): string => doc.querySelector('[aria-label="Notices"]')?.textContent ?? "";

describe("malformed links to /", () => {
  it.each([
    ["/?open=2099-S9", "isn't in the prototype's data"],
    ["/?open=2026-S2,nope", "isn't in the prototype's data"],
  ])("renders %s with a notice", async (path, words) => {
    expect(notices(await new Visitor().page(path))).toContain(words);
  });

  it("answers a link with broken percent-encoding with Astro's 400, never a 500", async () => {
    expect((await new Visitor().get("/?open=%E0%A4%A")).status).toBe(400);
  });

  it("renders an empty open list with every session closed", async () => {
    const doc = await new Visitor().page("/?open=");
    expect(doc.querySelectorAll("details[data-session][open]")).toHaveLength(0);
  });
});
