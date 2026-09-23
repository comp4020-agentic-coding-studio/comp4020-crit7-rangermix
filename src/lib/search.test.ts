import { describe, expect, it } from "vitest";
import { CATALOGUE } from "../app/fixtures";
import { EMPTY_FILTERS } from "../app/url";
import { caption, PAGE_SIZE, search, tokens } from "./search";
import type { CatalogueClass, Filters } from "./types";

const f = (patch: Partial<Filters> = {}): Filters => ({ ...EMPTY_FILTERS, ...patch });
const codes = (patch: Partial<Filters> = {}): string[] => search(CATALOGUE.classes, f(patch)).rows.map((c) => c.courseCode);

describe("search (spec §6.4)", () => {
  it("needs every search word to prefix-match a word in the code, title, topic or description", () => {
    expect(codes({ q: "optim" })).toEqual(["COMP8691"]);
    expect(codes({ q: "comp8" })).toEqual(["COMP8620", "COMP8691"]);
    expect(codes({ q: "8620" })).toEqual(["COMP8620"]);
    expect(codes({ q: "search plan" })).toEqual(["COMP8620"]);
    expect(codes({ q: "search banana" })).toEqual([]);
  });

  it("filters by title, code prefix, class number, subject, career, level and mode", () => {
    expect(codes({ title: "artificial" })).toEqual(["COMP8620"]);
    expect(codes({ code: "comp 8" })).toEqual(["COMP8620", "COMP8691"]);
    expect(codes({ class: "510" })).toEqual(["COMP1100", "COMP8620", "COMP8691"]);
    expect(codes({ subject: "POGO" })).toEqual(["POGO8062"]);
    expect(codes({ career: "UGRD" })).toEqual(["COMP1100"]);
    expect(codes({ level: "8000", mode: "Online" })).toEqual(["POGO8062"]);
  });

  it("sorts by code, title or level", () => {
    expect(codes()).toEqual(["COMP1100", "COMP8620", "COMP8691", "POGO8062"]);
    expect(codes({ sort: "title" })).toEqual(["POGO8062", "COMP8620", "COMP8691", "COMP1100"]);
    expect(codes({ sort: "level" })).toEqual(["COMP1100", "COMP8620", "COMP8691", "POGO8062"]);
  });

  it("pages 50 rows at a time and clamps the page", () => {
    const many: CatalogueClass[] = Array.from({ length: 120 }, (_, i) => ({ ...CATALOGUE.classes[0], classNumber: 6000 + i }));
    expect(search(many, f()).rows).toHaveLength(PAGE_SIZE);
    expect(search(many, f({ page: 3 }))).toMatchObject({ total: 120, page: 3, pages: 3 });
    expect(search(many, f({ page: 3 })).rows).toHaveLength(20);
    expect(search(many, f({ page: 99 })).page).toBe(3);
  });

  it("states the count, session and active filters in the caption", () => {
    expect(caption(37, "First Semester 2027", f({ subject: "COMP", level: "8000" }))).toBe("37 First Semester 2027 classes · subject COMP · level 8000");
    expect(caption(1, "First Semester 2027", f())).toBe("1 First Semester 2027 class");
  });

  it("splits text into lower-case words on anything that isn't a letter or digit", () => {
    expect(tokens("Human-Centred & Creative (COMP8020)")).toEqual(["human", "centred", "creative", "comp8020"]);
  });
});
