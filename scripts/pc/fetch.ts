// `pnpm data:fetch`: the polite, cached P&C crawl (spec §8.2). The agent runs
// it at the user's direction and anyone can re-run it; the app and CI never
// do. Every response is cached in .cache/pc/, so a re-run fetches only what
// is missing. `pnpm data:build` then works offline from the cache.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { isSoftNotFound, parsePlanPage } from "./parse.ts";
import { COMP_CODE, courseListUrl, EXTRA_COURSES, pageUrl, planCodes, planKind, planListUrls, PROGRAMS, USER_AGENT, YEARS } from "./scope.ts";

export const CACHE_DIR = ".cache/pc";

export interface CacheEntry {
  url: string;
  status: number;
  finalUrl: string;
  fetchedAt: string;
  /** HTTP 404, or P&C's soft 404 (spec §8.2). */
  missing: boolean;
  /** Where the body is cached, relative to the repo root. */
  file: string;
}

/** Where a URL's response is cached: its path under .cache/pc/, plus a file-safe form of any query string. */
export function cachePath(url: string): string {
  const u = new URL(url);
  const query = u.search ? `_${u.search.slice(1).replace(/[^A-Za-z0-9=.-]+/g, "_")}` : "";
  return join(CACHE_DIR, decodeURIComponent(u.pathname).slice(1) + query);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
let lastRequest = 0;

/** Fetches one URL at most once, at least 1 s after the previous request, with a 30 s timeout and 3 retries. */
async function fetchOnce(url: string): Promise<CacheEntry> {
  const base = cachePath(url);
  const metaFile = `${base}.meta.json`;
  if (existsSync(metaFile)) return JSON.parse(readFileSync(metaFile, "utf8")) as CacheEntry;
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequest + 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/json;q=0.9" },
        signal: AbortSignal.timeout(30_000),
      });
      const body = await res.text();
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
      const file = `${base}.${url.includes("/data/") ? "json" : "html"}`;
      const entry: CacheEntry = {
        url,
        status: res.status,
        finalUrl: res.url,
        fetchedAt: new Date().toISOString(),
        missing: res.status === 404 || isSoftNotFound(res.url, body),
        file,
      };
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, body);
      writeFileSync(metaFile, `${JSON.stringify(entry, null, 2)}\n`);
      console.log(`${res.status}${entry.missing ? " (missing)" : ""} ${url}`);
      return entry;
    } catch (err) {
      if (attempt > 3) throw new Error(`giving up on ${url}: ${String(err)}`);
      const backoff = 2000 * 2 ** (attempt - 1);
      console.warn(`attempt ${attempt} failed for ${url} (${String(err)}); retrying in ${backoff / 1000} s`);
      await sleep(backoff);
    }
  }
}

function canberraDate(when: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(when)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function main(): Promise<void> {
  const entries: CacheEntry[] = [];
  const get = async (url: string): Promise<CacheEntry> => {
    const entry = await fetchOnce(url);
    entries.push(entry);
    return entry;
  };
  const read = (entry: CacheEntry): string => readFileSync(entry.file, "utf8");

  // 1. The COMP course lists, one per year. Count Items, not TotalCount.
  const listed = new Map<number, Set<string>>();
  for (const year of YEARS) {
    const items = (JSON.parse(read(await get(courseListUrl(year)))) as { Items: { CourseCode: string }[] }).Items;
    listed.set(year, new Set(items.map((i) => i.CourseCode).filter((c) => COMP_CODE.test(c))));
  }
  // 2. The program and plan lists, kept for the provenance file.
  for (const url of planListUrls) await get(url);
  // 3. The 5 program and 15 plan pages, and every course their requirements link.
  const linked = new Set<string>();
  for (const code of [...PROGRAMS.map((p) => p.code), ...planCodes()]) {
    const entry = await get(pageUrl(planKind(code), code));
    if (entry.missing) continue;
    for (const chunk of parsePlanPage(read(entry)).requirements) {
      for (const item of chunk) for (const c of item.codes) linked.add(c);
    }
  }
  // 4. Every course page: /2026/ unless the course is listed only in 2027.
  const in2026 = listed.get(2026) ?? new Set<string>();
  const in2027 = listed.get(2027) ?? new Set<string>();
  const courses = [...new Set([...in2026, ...in2027, ...linked, ...EXTRA_COURSES])].sort();
  for (const code of courses) {
    const year = in2026.has(code) || !in2027.has(code) ? 2026 : 2027;
    const entry = await get(pageUrl("course", code, year));
    if (entry.missing && year === 2026) await get(pageUrl("course", code, 2027));
  }

  const firstFetch = entries.map((e) => e.fetchedAt).sort()[0] ?? new Date().toISOString();
  const index = { fetchedOn: canberraDate(new Date(firstFetch)), userAgent: USER_AGENT, entries };
  writeFileSync(join(CACHE_DIR, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`done: ${entries.length} URLs, ${entries.filter((e) => e.missing).length} missing, ${courses.length} courses`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
