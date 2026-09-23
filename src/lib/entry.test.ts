import { describe, expect, it } from "vitest";
import { parseEntry } from "./entry";

describe("parseEntry (spec §6.3, Review Focus 4)", () => {
  it.each([
    [" comp 6320 ", "COMP6320"],
    ["comp6320", "COMP6320"],
    ["COMP 6320", "COMP6320"],
    ["ＣＯＭＰ６３２０", "COMP6320"],
  ])("reads %j as the course %s", (raw, code) => {
    expect(parseEntry(raw)).toEqual({ kind: "course", code });
  });

  it.each([
    ["5099", 5099],
    [" 5099 ", 5099],
    ["10060", 10060],
    ["５０９９", 5099],
  ])("reads %j as class %i", (raw, number) => {
    expect(parseEntry(raw)).toEqual({ kind: "class", number });
  });

  it.each(["", "   ", "0", "1234567", "COMP8800 please", "8707;drop table", "COMP88000", "comp-6320", "hello"])("refuses %j", (raw) => {
    expect(parseEntry(raw)).toEqual({ kind: "invalid" });
  });
});
