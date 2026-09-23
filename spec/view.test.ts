import { describe, it } from "vitest";

// The view model and the catalogue (spec §4.2, §5.3). Filled in by Task 7.
describe("GET /api/view", () => {
  it.todo("returns the template student's view, with Now/Next badges and the 18 of 66 summary, without creating a sandbox");
  it.todo("treats an unknown sid cookie as no cookie");
});
describe("GET /api/catalogue", () => {
  it.todo("returns every First Semester 2027 class and only those, with descriptions");
  it.todo("refuses an unknown or missing session with 400");
});
