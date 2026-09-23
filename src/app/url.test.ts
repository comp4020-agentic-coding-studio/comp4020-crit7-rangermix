import { describe, expect, it } from "vitest";
import type { UrlState } from "../lib/types";
import { catalogueLink, EMPTY_FILTERS, parseQuery, toQuery, type UrlContext, withPage, withSort } from "./url";

const NAMES: Record<string, string> = { "2026-S2": "Second Semester 2026", "2027-S1": "First Semester 2027", "2027-S2": "Second Semester 2027" };
const ctx: UrlContext = {
  sessionIds: Object.keys(NAMES),
  nextId: "2027-S1",
  sessionName: (id) => NAMES[id] ?? id,
  facets: () => ({ subjects: ["COMP", "POGO"], careers: ["PGRD", "UGRD"], levels: [1000, 8000], modes: ["In Person", "Online"] }),
  canChoose: (code, term) => code === "POGO8062" && term === "2027-S1",
};
const parse = (q: string) => parseQuery(new URLSearchParams(q), ctx);
const base: UrlState = { open: null, choose: null, term: null, browse: null, filters: EMPTY_FILTERS };

describe("parseQuery (spec §4.2)", () => {
  it("reads the defaults from an empty query", () => {
    expect(parse("")).toEqual({ state: base, problems: [] });
  });

  it("reads open sessions, the chooser and the catalogue's filters", () => {
    const { state, problems } = parse("open=2026-S2,2027-S1&choose=pogo8062&browse=2027-S1&subject=COMP&career=PGRD&level=8000&mode=Online&q=optim&sort=title&page=2");
    expect(problems).toEqual([]);
    expect(state).toEqual({
      open: ["2026-S2", "2027-S1"],
      choose: "POGO8062",
      term: "2027-S1",
      browse: "2027-S1",
      filters: { ...EMPTY_FILTERS, subject: "COMP", career: "PGRD", level: "8000", mode: "Online", q: "optim", sort: "title", page: 2 },
    });
  });

  it.each([
    ["open=2099-S9", "isn't in the prototype's data"],
    ["browse=nope", "isn't in the prototype's data"],
    ["browse=2027-S1&page=abc", "isn't a page number"],
    ["browse=2027-S1&page=-1", "isn't a page number"],
    ["browse=2027-S1&level=7", "level"],
    ["browse=2027-S1&sort=bogus", "sorted by code"],
    ["browse=2027-S1&subject=ZZZZ", "subject"],
    ["choose=garbage", "class chooser"],
    ["choose=COMP8020&term=2027-S1", "class chooser"],
  ])("falls back from %s with a notice (Review Focus 1)", (q, words) => {
    expect(parse(q).problems.join(" ")).toContain(words);
  });

  it("cuts a long text filter to 100 characters", () => {
    const { state, problems } = parse(`browse=2027-S1&q=${"x".repeat(5000)}`);
    expect(state.filters.q).toHaveLength(100);
    expect(problems).toHaveLength(1);
  });

  it("falls back to the next semester for an unknown catalogue session", () => {
    expect(parse("browse=nope").state.browse).toBe("2027-S1");
  });
});

describe("toQuery", () => {
  it("omits every default", () => {
    expect(toQuery(base, "2027-S1")).toBe("");
    expect(toQuery({ ...base, open: ["2027-S1"] }, "2027-S1")).toBe("");
  });

  it("round-trips through parseQuery", () => {
    const state: UrlState = {
      open: ["2026-S2", "2027-S1"],
      choose: "POGO8062",
      term: "2027-S1",
      browse: "2027-S1",
      filters: { ...EMPTY_FILTERS, q: "optim", subject: "COMP", sort: "level", page: 2 },
    };
    const q = toQuery(state, "2027-S1");
    expect(q).toBe("?open=2026-S2,2027-S1&choose=POGO8062&browse=2027-S1&q=optim&subject=COMP&sort=level&page=2");
    expect(parse(q.slice(1)).state).toEqual(state);
  });

  it("keeps the filters in sort and paging links and adds none (spec §13)", () => {
    const state: UrlState = { ...base, browse: "2027-S1", filters: { ...EMPTY_FILTERS, subject: "COMP", page: 3 } };
    expect(toQuery(withSort(state, "title"), "2027-S1")).toBe("?browse=2027-S1&subject=COMP&sort=title");
    expect(toQuery(withPage(state, 2), "2027-S1")).toBe("?browse=2027-S1&subject=COMP&page=2");
  });

  it("links the catalogue to one course code and nothing else", () => {
    expect(catalogueLink("COMP8800", "2027-S1")).toBe("/?browse=2027-S1&code=COMP8800");
  });
});
