import { describe, it } from "vitest";

// API conventions and the sandbox (spec §4.2, §5.2, §10). Filled in by Task 8.
describe("API conventions", () => {
  it.todo("answers a POST without Content-Type: application/json with 415");
  it.todo("answers malformed bodies with 400 naming the field, never 500");
});
describe("sandbox", () => {
  it.todo("keeps two cookie jars' enrolments apart");
  it.todo("writes no student row for a GET without a cookie");
  it.todo("gives a forged or stale cookie a fresh sandbox on its first write");
});
describe("D6: every course fact traces to the snapshot", () => {
  it.todo("every course code and class number on / exists in the committed snapshot");
});
