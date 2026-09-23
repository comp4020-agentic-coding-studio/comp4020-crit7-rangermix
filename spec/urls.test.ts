import { describe, it } from "vitest";

// Review Focus 1: a malformed link must never produce a 500 (spec §9).
// Filled in by Tasks 9–11.
describe("malformed links to /", () => {
  it.todo("renders 200 with a notice for unknown sessions, bad paging and bad filters");
});
