import type { Filters, UrlState } from "../lib/types";

// The SPA's URL state (spec §4.2): a pure mapping between the query string
// and UrlState, in both directions. The server parses it for the first
// render; the client writes it back with replaceState. An unknown value
// falls back to its default with a notice — never a 500 (spec §9).

export const EMPTY_FILTERS: Filters = { q: "", title: "", code: "", class: "", subject: "", career: "", level: "", mode: "", sort: "code", page: 1 };
const TEXT_FIELDS = ["q", "title", "code", "class"] as const;
const SORTS: readonly string[] = ["code", "title", "level"];
const MAX_TEXT = 100;

export interface UrlContext {
  sessionIds: string[];
  nextId: string | null;
  sessionName: (id: string) => string;
  /** The filter values a session's catalogue offers, to check a link against. */
  facets: (sessionId: string) => { subjects: string[]; careers: string[]; levels: number[]; modes: string[] } | null;
  /** Whether the course has classes in the session, so the chooser can open. */
  canChoose: (code: string, sessionId: string) => boolean;
}

const clip = (s: string): string => (s.length > 40 ? `${s.slice(0, 40)}…` : s);
const ignored = (what: string[]): string =>
  `The link named ${what.length === 1 ? "a session" : "sessions"} ${what.map((w) => `“${clip(w)}”`).join(", ")} that ${what.length === 1 ? "isn't" : "aren't"} in the prototype's data, so ${what.length === 1 ? "it was" : "they were"} ignored.`;

export function parseQuery(params: URLSearchParams, ctx: UrlContext): { state: UrlState; problems: string[] } {
  const problems: string[] = [];
  const known = new Set(ctx.sessionIds);
  const sessionParam = (name: string): string | null => {
    const v = params.get(name);
    if (v === null) return null;
    if (known.has(v)) return v;
    problems.push(ignored([v]));
    return null;
  };

  let open: string[] | null = null;
  const rawOpen = params.get("open");
  if (rawOpen !== null) {
    const ids = rawOpen
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const unknown = ids.filter((id) => !known.has(id));
    if (unknown.length > 0) problems.push(ignored(unknown));
    const valid = [...new Set(ids.filter((id) => known.has(id)))];
    // An explicit empty open= closes every row; a list naming only unknown sessions falls back to the default (spec §4.2).
    open = ids.length > 0 && valid.length === 0 ? null : valid;
  }

  let choose: string | null = null;
  let term: string | null = null;
  const rawChoose = params.get("choose");
  if (rawChoose !== null) {
    const code = rawChoose.normalize("NFKC").replace(/\s+/g, "").toUpperCase();
    const where = sessionParam("term") ?? ctx.nextId;
    if (where && /^[A-Z]{4}\d{4}$/.test(code) && ctx.canChoose(code, where)) {
      choose = code;
      term = where;
    } else {
      problems.push(`Couldn't open the class chooser for “${clip(rawChoose)}”${where ? ` in ${ctx.sessionName(where)}` : ""}: it has no classes there in the prototype's data.`);
    }
  }

  const rawBrowse = params.get("browse");
  const browse = rawBrowse === null ? null : (sessionParam("browse") ?? ctx.nextId);
  const filters: Filters = { ...EMPTY_FILTERS };
  if (browse !== null) {
    for (const f of TEXT_FIELDS) {
      const v = params.get(f);
      if (v === null) continue;
      if (v.length > MAX_TEXT) problems.push(`The “${f}” filter was cut to ${MAX_TEXT} characters.`);
      filters[f] = v.slice(0, MAX_TEXT);
    }
    const facets = ctx.facets(browse);
    const name = ctx.sessionName(browse);
    for (const key of ["subject", "career", "mode"] as const) {
      const v = params.get(key);
      if (v === null || v === "") continue;
      const allowed = key === "subject" ? facets?.subjects : key === "career" ? facets?.careers : facets?.modes;
      if (allowed?.includes(v)) filters[key] = v;
      else problems.push(`No ${name} classes have ${key} “${clip(v)}”, so that filter was ignored.`);
    }
    const level = params.get("level");
    if (level !== null && level !== "") {
      if (facets?.levels.map(String).includes(level)) filters.level = level;
      else problems.push(`No ${name} classes are at level “${clip(level)}”, so that filter was ignored.`);
    }
    const sort = params.get("sort");
    if (sort !== null) {
      if (SORTS.includes(sort)) filters.sort = sort as Filters["sort"];
      else problems.push(`Results can be sorted by code, title or level, not “${clip(sort)}”, so they're sorted by code.`);
    }
    const page = params.get("page");
    if (page !== null) {
      if (/^\d{1,6}$/.test(page) && Number(page) >= 1) filters.page = Number(page);
      else problems.push(`“${clip(page)}” isn't a page number, so the results start at page 1.`);
    }
  }
  return { state: { open, choose, term, browse, filters }, problems };
}

/** The query string for a state, "" or "?…", leaving out every default. */
export function toQuery(state: UrlState, nextId: string | null): string {
  const pairs: [string, string][] = [];
  if (state.open !== null && !(state.open.length === 1 && state.open[0] === nextId)) pairs.push(["open", state.open.join(",")]);
  if (state.choose) {
    pairs.push(["choose", state.choose]);
    if (state.term && state.term !== nextId) pairs.push(["term", state.term]);
  }
  if (state.browse) {
    pairs.push(["browse", state.browse]);
    const f = state.filters;
    for (const k of ["q", "title", "code", "class", "subject", "career", "level", "mode"] as const) if (f[k]) pairs.push([k, f[k]]);
    if (f.sort !== "code") pairs.push(["sort", f.sort]);
    if (f.page !== 1) pairs.push(["page", String(f.page)]);
  }
  return pairs.length === 0 ? "" : `?${new URLSearchParams(pairs).toString().replace(/%2C/g, ",")}`;
}

export const withSort = (s: UrlState, sort: Filters["sort"]): UrlState => ({ ...s, filters: { ...s.filters, sort, page: 1 } });
export const withPage = (s: UrlState, page: number): UrlState => ({ ...s, filters: { ...s.filters, page } });

/** The sidebar's course link: the catalogue filtered by that code and nothing else, which keeps the link checker's crawl bounded (spec §13). */
export const catalogueLink = (code: string, browse: string): string => `/?browse=${encodeURIComponent(browse)}&code=${encodeURIComponent(code)}`;

/** The sessions whose details are open: the URL's list, or the next semester by default (spec §6.2). */
export const openSessions = (s: UrlState, nextId: string | null): string[] => s.open ?? (nextId ? [nextId] : []);
