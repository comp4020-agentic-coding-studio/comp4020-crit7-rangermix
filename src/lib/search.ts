import type { CatalogueClass, Filters } from "./types";

// Catalogue filtering (spec §6.4, §4.1 a4). Pure; it runs in the browser on
// one session's classes, and on the server only for the first render of
// /?browse=…. Comparisons avoid locale-aware collation, so the server and
// the browser sort identically.

export const PAGE_SIZE = 50;

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const haystacks = new WeakMap<CatalogueClass, string[]>();
function words(c: CatalogueClass): string[] {
  let found = haystacks.get(c);
  if (!found) {
    found = tokens(`${c.courseCode} ${c.catalogue} ${c.title} ${c.topic ?? ""} ${c.description}`);
    haystacks.set(c, found);
  }
  return found;
}

export function matches(c: CatalogueClass, f: Filters): boolean {
  const q = tokens(f.q);
  if (q.length > 0 && !q.every((w) => words(c).some((h) => h.startsWith(w)))) return false;
  if (f.title.trim() && !c.title.toLowerCase().includes(f.title.trim().toLowerCase())) return false;
  const code = f.code.replace(/\s+/g, "").toUpperCase();
  if (code && !c.courseCode.startsWith(code)) return false;
  if (f.class.trim() && !String(c.classNumber).startsWith(f.class.trim())) return false;
  if (f.subject && c.subject !== f.subject) return false;
  if (f.career && c.career !== f.career) return false;
  if (f.level && String(c.level) !== f.level) return false;
  if (f.mode && c.mode !== f.mode) return false;
  return true;
}

const cmp = (a: string | number, b: string | number): number => (a < b ? -1 : a > b ? 1 : 0);
const ORDER: Record<Filters["sort"], (a: CatalogueClass, b: CatalogueClass) => number> = {
  code: (a, b) => cmp(a.courseCode, b.courseCode) || a.classNumber - b.classNumber,
  title: (a, b) => cmp(a.title.toLowerCase(), b.title.toLowerCase()) || cmp(a.courseCode, b.courseCode) || a.classNumber - b.classNumber,
  level: (a, b) => a.level - b.level || cmp(a.courseCode, b.courseCode) || a.classNumber - b.classNumber,
};

export interface SearchResult {
  rows: CatalogueClass[];
  total: number;
  page: number;
  pages: number;
}

export function search(classes: CatalogueClass[], f: Filters): SearchResult {
  const hits = classes.filter((c) => matches(c, f)).sort(ORDER[f.sort]);
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(f.page) || 1), pages);
  return { rows: hits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: hits.length, page, pages };
}

/** The active filters as the caption states them: "subject COMP · level 8000". */
export function describeFilters(f: Filters): string {
  const parts: string[] = [];
  if (f.q.trim()) parts.push(`search “${f.q.trim()}”`);
  if (f.title.trim()) parts.push(`title “${f.title.trim()}”`);
  if (f.code.trim()) parts.push(`code ${f.code.replace(/\s+/g, "").toUpperCase()}`);
  if (f.class.trim()) parts.push(`class ${f.class.trim()}`);
  if (f.subject) parts.push(`subject ${f.subject}`);
  if (f.career) parts.push(`career ${f.career}`);
  if (f.level) parts.push(`level ${f.level}`);
  if (f.mode) parts.push(`mode ${f.mode}`);
  return parts.join(" · ");
}

/** "37 First Semester 2027 classes · subject COMP · level 8000" (spec §6.4). */
export function caption(total: number, sessionName: string, f: Filters): string {
  const filters = describeFilters(f);
  return `${total} ${sessionName} class${total === 1 ? "" : "es"}${filters ? ` · ${filters}` : ""}`;
}
