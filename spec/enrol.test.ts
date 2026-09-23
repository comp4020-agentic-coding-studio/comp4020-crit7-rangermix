import { describe, it } from "vitest";

// F1, the rules and drop (spec §10). Filled in by Task 8.
describe("F1: add by class number or course code", () => {
  it.todo("enrols a class number, and a fresh GET / with the same cookie shows it (persists across reload)");
  it.todo("enrols a course code with one class directly");
  it.todo("answers a course with several classes with choose, changing nothing; two class numbers then get one outcome each");
  it.todo("answers a code not offered, an unknown code, another session's class number and garbage with their messages");
});
describe("rules", () => {
  it.todo("refuses a class whose last day to enrol has passed");
  it.todo("refuses a course already completed");
  it.todo("refuses a class that takes a semester over 24 units");
  it.todo("allows COMP8800 a second take");
});
describe("drop", () => {
  it.todo("drops a class, and the requirement status reverts");
  it.todo("refuses a drop after the exam period has started");
});
describe("batches and double submits", () => {
  it.todo("processes a repeated class number once");
  it.todo("keeps the classes before a batch crosses 24 units and refuses the rest");
  it.todo("enrols exactly once when two identical requests race");
});
