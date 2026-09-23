# Enrolment Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the starter guestbook with a one-page ANU enrolment prototype, built as a React SPA. It supports adding by class number or course code, browsing every class, choosing a session, unfolding enrolment details in place, and a requirements sidebar. All course data comes from a committed Programs & Courses snapshot. M2 then adds a demo settings bar for the date, program and plan.

**Architecture:**

- **Astro 7 SSR** renders `/`: it builds the view model on the server and hydrates one React 19 island (`client:load`).
- **Every later interaction** goes through a small JSON API. Each write returns the whole new view, so the client never derives status.
- **Data and state:**
  - reference data comes from a polite, offline P&C crawl (committed JSON plus provenance), seeded into SQLite at boot;
  - each browser gets a cookie sandbox cloned from a template student on its first write.

**Tech Stack:**

- Astro 7.3 (`output: "server"`, `@astrojs/node` standalone) and `@astrojs/react` 7 with React 19;
- Drizzle 0.45 and better-sqlite3;
- Vitest 4, jsdom and Testing Library;
- Node 24 (it runs the `.ts` crawler scripts directly) and pnpm 11;
- Fly.io.

**Spec:** [`docs/superpowers/specs/2026-09-23-enrolment-redesign-design.md`](../specs/2026-09-23-enrolment-redesign-design.md), revision 3, approved 2026-09-24. Read it with this plan. Section numbers below (§6.3 and so on) are the spec's.

## Global Constraints

Every task's requirements include these.

**Stack and deployment**

- Node 24, pnpm 11.9.0, Astro 7.3 with `output: "server"` and `adapter: node({ mode: "standalone" })`, React 19 through `@astrojs/react`.
- `react`, `react-dom` and `@astrojs/react` go in `dependencies`, not `devDependencies`. The Dockerfile runs `pnpm prune --prod`, and the runtime server-renders React.
- The Docker runtime copies only `node_modules`, `dist` and `drizzle`. Runtime data must therefore be bundled into `dist`: import the JSON statically, never read it with `fs`.
- `fly.toml`, the `Dockerfile` and `.github/workflows/checks.yml` stay unchanged.

**What CI probes**

- `/` is never prerendered and must render on POST: the deploy job POSTs a form to it.
- Keep `security.allowedDomains` in `astro.config.ts` and Astro's default origin check.
- `/api/events` keeps streaming: an immediate `": connected\n\n"`, then `": ping\n\n"` every 30 s.
- `spec/invariants.test.ts` and `spec/readme.test.ts` stay as shipped. Every route in `spec/routes.ts` must pass them:
  - 200, `lang`, a title, a viewport meta, a `<nav>` and exactly one `<h1>`;
  - axe with every default rule except `color-contrast` and `link-in-text-block`.
- The link checker (`linkinator --recurse`) follows every link that `/` server-renders. The set of reachable URLs must stay small (§13).

**Lockfile and schema**

- `pnpm install --frozen-lockfile` must pass, so commit `pnpm-lock.yaml` with every dependency change.
- Schema changes go only through `pnpm db:generate`, and the generated `drizzle/*.sql` is committed.

**Clock and client rules**

- Tests run with `APP_TODAY=2026-09-24`.
- Only `src/lib/clock.ts` reads the date. The real date is Canberra's (`Australia/Sydney` via `Intl`), never the machine's UTC date.
- The client never compares dates or evaluates rules. Anything that depends on `today` arrives computed in the view.
- Dates travel as ISO `YYYY-MM-DD` strings and are formatted only by `src/lib/format.ts`.

**Crawler**

- User-Agent, exactly: `comp4020-crit7-enrolment-crawler/0.1 (+https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix; student project; fetched by an AI coding agent at a student's direction; about 1 request per second)`.
- Requests are serial and at least 1000 ms apart, with a 30 s timeout, 3 retries with backoff (2 s, 4 s, 8 s), and a cache in `.cache/pc/` (gitignored).
- Every URL carries the year.
- The app and CI never run it.

**Copy strings**, used verbatim (spec §5.3, §6, §9):

| Situation | Text |
|---|---|
| Entry hint | `e.g. 5099 or COMP1100` |
| Entry label | `Class number or course code` |
| Bad entry | `Enter a class number (digits) or a course code like COMP1100.` |
| Unknown course | `COMP9999 isn't in the prototype's catalogue` |
| Not offered | `COMP8020 isn't offered in First Semester 2027. Next offered: Second Semester 2027.` |
| Not offered, and no classes anywhere | `… isn't offered in First Semester 2027. No classes listed in P&C for 2026–2027.` |
| Class from another session | `8707 is a Second Semester 2026 class number, not First Semester 2027` |
| Over the cap | `Going over 24 units needs an Overload request through Manage my Degree` |
| Network failure | `Couldn't reach the server, so nothing changed. Try again.` |
| No next semester | `No next semester in the loaded data (2026–2027)` |
| Summary line | `Tracked: 18 of 66 units done · 18 enrolled` |
| Adding closed | `Adding closed on 3 Aug` |
| Empty session | `No classes in First Semester 2027 yet. Add one below, use your requirements list, or browse classes.` |
| Chooser requisites label | `Requisites (from P&C, not checked here)` |
| Catalogue scope caption | `All COMP classes, plus courses named in the five programs' requirements.` |

**Accessibility**

- `lang="en-AU"`; one `<h1>Enrolment</h1>`.
- `<h2>` for Sessions, Browse classes and Your requirements; an `<h3>` inside each session row's `<summary>`.
- Real labels on every input.
- Checkboxes named like `Select POGO8062 class 5354, In Person`.
- Status icons (✓ ● ◐ ○ –) are `aria-hidden`.
- Notices sit in an `aria-live="polite"` region.

**Process**

- Every task ends with `pnpm check` green, a commit and `git push origin HEAD:main`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Never commit secrets: `.claude/settings.json` holds a token, and `mise.local.toml` holds the Fly token.
- Nothing from the signed-in ANUHub session is committed except the README crops the user approved.

## Spec clarifications made while planning

Planning surfaced these gaps and conflicts in the spec. Each is resolved here, and Task 1 adds the same list to spec §14 so the spec and the plan agree.

1. **Two classes of one course in one session.**
   - The conflict: §6.3 refuses a class when "the student is already enrolled in the course this session", but §10 says sending two of a course's class numbers "enrols both".
   - Resolution: a second class of the same course in the same session is refused, **unless the two classes have different topics** (a topics course such as COMP8020). The user's own ask was "pick one or several", and topics are the case where several makes sense.
   - The server tells the chooser which case applies (`Chooser.note`).
   - §10's "enrols both" test uses a course whose classes differ by topic. POGO8062, whose classes differ only by mode, returns one Enrolled and one Not added.
2. **Entry problems return HTTP 422** (`{error: {code: "entry", message}}`) and show under the input. These are garbage, an unknown course, a course not offered in the session, and a class number from another session.
   - Per-class refusals come back as `outcomes` in a 200, alongside the view.
   - A malformed body is still a 400 that names the field (§9).
3. **Nav identity.** The nav reads `Demo Student · u7000001 · MCompAdv · Artificial Intelligence`.
   - `MCompAdv` is P&C's "Post Nominal", stored in a new nullable `plans.postNominal` column.
   - The plan name replaces the wireframe's invented "(AI)".
4. **Landmarks.** The page's landmarks are `<header>` (nav, h1, notices), then `<aside>` (requirements), then `<main>` (sessions, browse), then `<footer>`, all siblings.
   - At ≥ 960px a CSS grid puts the aside to the right of main.
   - Why: axe's `landmark-complementary-is-top-level` rule forbids an aside inside main, and its `region` rule requires all content to sit in landmarks.
   - This DOM order is also §6.1's phone order: notices → requirements → sessions → browse.
5. **Requirement notes.** Consecutive plain paragraphs within one chunk of a requirements section merge into one note, one line per paragraph.
   - A chunk is the paragraphs between empty `<p>`s.
   - §8.3 said each paragraph becomes a group, which would have made eight notes of VCOMP's specialisation names.
   - A course line that links two courses (an either/or) turns its group into a note.
6. **Catalogue annotations are server data.** Enrolled, Completed and Adding closed come from `view.marks` and from `canAdd` on each catalogue class. The client looks them up; it never compares dates.
7. **Component-test fixtures** are typed builders (`src/app/fixtures.ts`), not recorded responses. `src/lib/types.ts` keeps them in step with the API.
8. **What the seeder replaces.** Template students' plans and enrolments, and the requirement tables, are rewritten on every boot, because no sandbox row points at them. Rows that enrolments point at (sessions, subjects, courses, classes, plans) are only upserted, never deleted, as §8.5 requires.
9. **Opening dates.** `sessions.enrolOpens` is an ISO date. It is compared with today to decide whether to show the note. A new `enrolOpensText` column holds the words shown: "early December (indicative)".
10. **Duplicates in a batch.** A class number repeated within one request is processed once.
11. **Units** are stored as REAL, since P&C publishes 6.0, 12.0 and 3.0.
12. **Where the heading counts come from.** The session heading's counts, and the year grouping ("Show earlier sessions"), use server fields: `classCount`, `units`, `cap` and `earlier`.

## Review Focus

These are the five input classes a user is most likely to hit that the spec implies but §10 doesn't test, most likely first. Each has its test in the task that owns the code.

1. **Malformed or stale links to `/`.** Expected: the page renders 200 with an explanatory notice and default state, never a 500. Cases:
   - an unknown session in `open`, `term` or `browse`;
   - `page=abc`, `page=-1` or `page=999`;
   - `level=7`, `sort=bogus`;
   - `choose=garbage`, or a course not offered in that session;
   - a 5,000-character `q`;
   - broken percent-encoding.

   Test: `spec/urls.test.ts`, in Task 9. The chooser cases are added in Task 10 and the catalogue cases in Task 11.
2. **The date around Canberra midnight and daylight saving.** Fly runs in UTC, so between 00:00 and 10:00 (or 11:00) Canberra time a naive `new Date().toISOString()` gives yesterday. Expected: the Canberra date.
   Test: `src/lib/clock.test.ts`, in Task 6.
3. **Stale, forged or missing `sid` cookies.** Expected:
   - an unknown or garbage token counts as no cookie;
   - a GET renders the template and writes nothing;
   - the first write creates a fresh sandbox with a new token;
   - the server never 500s on a strange cookie.

   Test: `spec/api.test.ts`, in Task 8.
4. **How people actually type an entry.** Expected to normalise:
   - `" comp 6320 "`, `comp6320`, `COMP 6320`;
   - fullwidth digits `５０９９`;
   - five-digit class numbers such as `10060`.

   Expected to get the "Enter a class number…" message, never a crash or a wrong match:
   - an empty string;
   - `COMP8800 please`;
   - `8707;drop table`.

   Test: `src/lib/entry.test.ts`, in Task 6.
5. **Batches and double submits.** Expected:
   - the same class number twice in one request is processed once;
   - two classes of the same course (same topic) enrol one and refuse one;
   - a batch that crosses 24 units part-way keeps the earlier classes and refuses the later ones;
   - two identical enrol requests fired at once enrol exactly once, with no 500 from the unique index.

   Test: `spec/enrol.test.ts`, in Task 8.

---

## File structure

**Created**

| Path | Responsibility |
|---|---|
| `scripts/pc/scope.ts` | What the crawl covers: years, programs and plans, extra courses, URL builders, the User-Agent. |
| `scripts/pc/parse.ts` | Pure jsdom parsers for course and plan pages, soft-404 detection, requirement grouping (R1). |
| `scripts/pc/fetch.ts` | The polite, cached fetcher (`pnpm data:fetch`). |
| `scripts/pc/build.ts` | Cache → normalised JSON, provenance and data checks (`pnpm data:build`). |
| `scripts/pc/overrides.json` | Facts the prose can't carry (`times: 2`). |
| `scripts/pc/anuhub-s2-2026.json` | The 28 postgraduate COMP classes seen live in ANUHub, for the cross-check. |
| `scripts/pc/fixtures/**` | Saved P&C pages for parser and golden tests, with a provenance README. |
| `scripts/pc/*.test.ts` | Parser, fetcher-path and golden tests. |
| `src/data/calendar.json` | Hand-curated sessions, with a source URL on each row. |
| `src/data/pc/{courses,classes,plans,requirements,snapshot}.json`, `src/data/pc/README.md` | The committed snapshot and its provenance. |
| `src/data/templates/7722XVCOMP.json`, `index.ts`, `README.md` | Template students. M2 adds four JSON files. |
| `src/data/seed.ts` | Idempotent boot seeding. |
| `src/lib/types.ts` | View model, API and URL-state types, shared by server and client. |
| `src/lib/clock.ts` | `today(student)`: the only date source. |
| `src/lib/format.ts` | en-AU date and unit formatting over ISO strings. |
| `src/lib/sessions.ts` | `classify`, `isPast`, `canAdd`, `dropDeadline`, `canDrop`. |
| `src/lib/entry.ts` | `parseEntry`. |
| `src/lib/requirements.ts` | Pure requirement evaluation: statuses, group states, the summary. |
| `src/lib/search.ts` | Pure catalogue filtering, sorting and paging, plus the caption text. |
| `src/lib/ref.ts` | Memoised reference data (sessions, courses, classes, plans, groups) read from SQLite. |
| `src/lib/student.ts` | Sandbox lookup, clone, reset and the cookie. |
| `src/lib/view.ts` | `buildView(student)`. |
| `src/lib/catalogue.ts` | `catalogueFor`, `chooserFor`, `facetsFor`. |
| `src/lib/enrol.ts` | `resolveEntry`, `enrolClasses`, `dropClass`: rules plus transactions. |
| `src/lib/http.ts` | JSON responses, `ApiError`, body and field validation. |
| `src/pages/api/{view,catalogue,enrol,drop}.ts`, `src/pages/api/demo/reset.ts` | The JSON API. M2 adds `demo/settings.ts`. |
| `src/app/url.ts` | Query string ↔ `UrlState`, links for sort, paging and catalogue. |
| `src/app/api.ts` | Typed `fetch` wrappers. |
| `src/app/store.ts` | Reducer and the `useEnrolment` hook (actions, pending, focus). |
| `src/app/EnrolmentApp.tsx` | The root island. |
| `src/app/components/*.tsx` | SiteNav, Notices, SessionList, SessionRow, EnrolmentDetails, ClassRow, AddClass, ClassChooser, RequirementsSidebar, Catalogue, Filters, Results, BulkBar; `DemoSettings` in M2. |
| `src/app/fixtures.ts` | Typed test fixtures. |
| `spec/helpers.ts` and `spec/*.test.ts` | Contract tests over HTTP. |

**Modified**

- `package.json` and `pnpm-lock.yaml`;
- `astro.config.ts`, `tsconfig.json`, `vitest.config.ts`;
- `spec/global-setup.ts`, `spec/routes.ts`;
- `src/lib/schema.ts`, `src/lib/db.ts`;
- `src/pages/index.astro`, `src/pages/readme.astro`, `src/pages/api/events.ts`;
- `src/styles.css`, `.gitignore`;
- `CLAUDE.md`, `README.md`, `PROCESS.md`, `reflections/crit-7.md`.

**Deleted**

- `src/pages/api/messages.ts`;
- `src/lib/events.ts`;
- `spec/guestbook.test.ts`.

## Conventions

- **Running tests.** `pnpm test` builds, then runs every test.
  - `spec/global-setup.ts` boots the **built** server even for unit tests. To iterate on one file, run `pnpm build` once, then `pnpm vitest run <file>`. Rebuild after any change to server code.
- **Full check.** `pnpm check` runs `astro check` and then `pnpm test`.
- **Commits.** End every commit message with the co-author line.

  ```bash
  git add <files>
  git commit -m "<type>: <summary>" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
  git push origin HEAD:main
  ```

- **Imports.** Scripts under `scripts/` run under plain Node (type stripping), so their relative imports carry the `.ts` extension and use only erasable TypeScript. That means no enums and no parameter properties. Code under `src/` follows Astro's resolver: extensionless imports.

---

### Task 1: P0 — harness, React toolchain and contract-test stubs

**Files:**
- Modify: `package.json` and `pnpm-lock.yaml` (via `pnpm add`), `pnpm-workspace.yaml` (only if minimum-release-age blocks), `astro.config.ts`, `tsconfig.json`, `vitest.config.ts`, `spec/global-setup.ts`, `.gitignore`, `CLAUDE.md`, and the spec's §14.
- Create: `spec/helpers.ts`, `spec/view.test.ts`, `spec/sessions.test.ts`, `spec/enrol.test.ts`, `spec/requirements.test.ts`, `spec/catalogue.test.ts`, `spec/api.test.ts`, `spec/urls.test.ts`.

**Interfaces:**
- Consumes: the starter harness (`spec/global-setup.ts`, `spec/invariants.test.ts`).
- Produces:
  - `inject("baseUrl")` and `inject("dbPath")` in tests;
  - `spec/helpers.ts` exports `Visitor`, `snapshot`, `course`, `classesOf`, `templateCourses`, `singleClassCourses`, `sandboxCount`, `parse`, `sessionRow`, `badgeOf`;
  - the §10 test names as `it.todo`, filled in by Tasks 7–11.

- [ ] **Step 1: Check the React packages and the release-age gate**

Run: `pnpm view @astrojs/react@7 version peerDependencies dependencies --json` and `pnpm view react@19 version --json | tail -3`

Expected: `@astrojs/react` 7.x, whose peers are react and react-dom `^19` and whose `astro` range covers 7.3. Note the exact versions.

- [ ] **Step 2: Install**

```bash
pnpm add @astrojs/react react react-dom
pnpm add -D @types/react @types/react-dom @testing-library/react @testing-library/dom @testing-library/user-event
```

If pnpm refuses a version as "too new" (minimum release age), add each blocked `name@exact-version` to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, with a comment like the existing one, and re-run. Then run `pnpm why vite`. If two Vite versions appear, run `pnpm dedupe` so Astro and `@astrojs/react` share one.

- [ ] **Step 3: Wire React into Astro, TypeScript and Vitest**

`astro.config.ts`: import the integration and add `integrations: [react()]`. Keep the comments and `security` block as they are.

```ts
import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// Server-rendered output: pages render per request so they can read the
// database, and `astro build` emits the Node server the Dockerfile runs.
// React renders the enrolment page on the server and hydrates it (spec D13).
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  security: {
    // Fly's proxy terminates TLS, so naming the deploy domain is what lets
    // Astro trust x-forwarded-proto and accept same-origin form POSTs.
    allowedDomains: [{ hostname: "**.fly.dev", protocol: "https" }],
  },
});
```

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules", ".cache"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

`vitest.config.ts`. The contract tests share one built server and one database, so test files run one at a time. That keeps the exact sandbox-count checks ("a GET writes no row") deterministic.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "spec/**/*.test.ts",
      "scripts/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    globalSetup: ["./spec/global-setup.ts"],
    // One shared server and database: files run in turn so row counts are exact.
    fileParallelism: false,
  },
});
```

- [ ] **Step 4: Pin the test clock and expose the test database path**

Make three edits in `spec/global-setup.ts`:

1. Extend `ProvidedContext` with `dbPath: string`.
2. Hoist the temporary path into a `dbPath` constant, and add `APP_TODAY: "2026-09-24"` to the server's `env`.
3. Call `project.provide("dbPath", dbPath)` next to the `baseUrl` provide.

```ts
declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
    dbPath: string;
  }
}
// …
  const dbPath = join(mkdtempSync(join(tmpdir(), "spec-db-")), "test.db");
  const server = spawn("node", [entry], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DATABASE_PATH: dbPath,
      // The contract tests pin the snapshot's world to one day (spec §10).
      APP_TODAY: "2026-09-24",
    },
    stdio: "ignore",
  });
// …
  project.provide("baseUrl", baseUrl);
  project.provide("dbPath", dbPath);
```

Append to `.gitignore`:

```
# the P&C crawler's raw cache (scripts/pc/fetch.ts); only the normalised snapshot is committed
.cache/
```

- [ ] **Step 5: Propose the harness rules in `CLAUDE.md`**

Replace the file with:

```markdown
# Harness

The rules below were **proposed by the agent at P0 (2026-09-24)** from the
approved spec (§12). This file is yours: accept, rewrite or delete any rule.
Until you do, the agent follows them as written.

## Rules for the agent

1. **P&C is the source of truth.** Every course, class, date and
   requirement comes from programsandcourses.anu.edu.au, through the
   committed snapshot in `src/data/pc/`, or from the university calendar
   (`src/data/calendar.json`). Never invent course data. The demo students
   are the only invented data.
2. **Record provenance** for every data file: `src/data/pc/README.md` for
   the snapshot, the `source` on each calendar row, and
   `src/data/templates/README.md` for the demo students.
3. **The crawler is polite and never part of the app.** `pnpm data:fetch`
   sends its honest User-Agent, waits at least 1 s between requests and
   caches everything in `.cache/pc/`. The app and CI never run it.
4. **Contract tests first.** A behaviour gets its `spec/*.test.ts` test
   (over HTTP, against the built server) before its code.
5. **The server derives every status; the client only renders it.** No
   date comparisons or rule checks in `src/app/`.
6. **Only `src/lib/clock.ts` reads the date.** Dates travel as ISO strings
   and are formatted by `src/lib/format.ts`.
7. **Never prerender `/`**, and keep it rendering on POST (the deploy CI
   probes it). **Keep `/api/events` streaming.**
8. **Schema changes only through `pnpm db:generate`**, and commit the
   migration.
9. **Nothing from the signed-in ANUHub session is committed** except the
   README crops the user approved.
10. **Every task ends green** (`pnpm check`), committed and pushed to `main`.

The spec is `docs/superpowers/specs/2026-09-23-enrolment-redesign-design.md`
and the plan is `docs/superpowers/plans/2026-09-24-enrolment-redesign.md`.
```

- [ ] **Step 6: Record the planning clarifications in the spec**

In spec §14, after "No questions are open.", add a subsection **"Clarifications from planning (2026-09-24)"**. It lists this plan's "Spec clarifications" items 1–12, each in one or two sentences, and says the plan holds the detail.

- [ ] **Step 7: Write `spec/helpers.ts`**

```ts
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { expect, inject } from "vitest";

// Shared by the contract tests. They talk to the BUILT server over HTTP
// (spec/global-setup.ts boots it with APP_TODAY=2026-09-24) and take their
// fixtures from the committed snapshot, never from live P&C (spec §10).

export const baseUrl = inject("baseUrl");

export interface SnapClass {
  sessionId: string;
  classNumber: number;
  courseCode: string;
  mode: string;
  startDate: string;
  endDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  topic: string | null;
}
export interface SnapCourse {
  code: string;
  subject: string;
  title: string;
  career: "UGRD" | "PGRD" | "RSCH";
  units: number;
  level: number;
  description: string;
}

const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

// Lazy, so test files load before Task 4 has written src/data/pc/.
let classesCache: SnapClass[] | null = null;
let coursesCache: SnapCourse[] | null = null;
export const snapshot = {
  get classes(): SnapClass[] {
    return (classesCache ??= read<SnapClass[]>("src/data/pc/classes.json"));
  },
  get courses(): SnapCourse[] {
    return (coursesCache ??= read<SnapCourse[]>("src/data/pc/courses.json"));
  },
};

export function course(code: string): SnapCourse {
  const found = snapshot.courses.find((c) => c.code === code);
  if (!found) throw new Error(`${code} isn't in the snapshot`);
  return found;
}

export function classesOf(code: string, sessionId: string): SnapClass[] {
  return snapshot.classes
    .filter((c) => c.courseCode === code && c.sessionId === sessionId)
    .sort((a, b) => a.classNumber - b.classNumber);
}

/** Every course in the M1 template student's history. */
export function templateCourses(): string[] {
  const t = read<{ enrolments: { courseCode: string }[] }>("src/data/templates/7722XVCOMP.json");
  return t.enrolments.map((e) => e.courseCode);
}

/**
 * The first `count` 6-unit postgraduate courses (by code) with exactly one
 * class in the session, outside the template's history and COMP8800.
 * Deterministic for a given snapshot, so no test hard-codes a class number.
 */
export function singleClassCourses(sessionId: string, count: number, exclude: string[] = []): SnapClass[] {
  const skip = new Set([...templateCourses(), ...exclude, "COMP8800"]);
  const picked = snapshot.courses
    .filter((c) => c.career === "PGRD" && c.units === 6 && !skip.has(c.code))
    .map((c) => classesOf(c.code, sessionId))
    .filter((cs) => cs.length === 1)
    .map((cs) => cs[0])
    .sort((a, b) => (a.courseCode < b.courseCode ? -1 : 1))
    .slice(0, count);
  expect(picked, `the snapshot needs ${count} single-class PG courses in ${sessionId}`).toHaveLength(count);
  return picked;
}

/** Sandboxes (students with a token) in the test database. */
export function sandboxCount(): number {
  const db = new Database(inject("dbPath"), { readonly: true, fileMustExist: true });
  try {
    return (db.prepare("select count(*) as n from students where token is not null").get() as { n: number }).n;
  } finally {
    db.close();
  }
}

/** A browser stand-in with its own cookie jar (just the sid). */
export class Visitor {
  sid: string | null;
  constructor(sid: string | null = null) {
    this.sid = sid;
  }
  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return this.sid ? { cookie: `sid=${this.sid}`, ...extra } : extra;
  }
  private remember(res: Response): void {
    for (const c of res.headers.getSetCookie()) {
      const m = c.match(/^sid=([^;]*)/);
      if (m) this.sid = m[1];
    }
  }
  async get(path: string): Promise<Response> {
    const res = await fetch(new URL(path, baseUrl), { headers: this.headers() });
    this.remember(res);
    return res;
  }
  async getJson<T>(path: string): Promise<{ status: number; body: T }> {
    const res = await this.get(path);
    return { status: res.status, body: (await res.json()) as T };
  }
  async page(path = "/"): Promise<Document> {
    const res = await this.get(path);
    expect(res.status, `GET ${path}`).toBe(200);
    return parse(await res.text());
  }
  /** A same-origin POST, as a browser sends it: Astro's origin check refuses form-type POSTs without an Origin header. */
  async post(path: string, body: unknown, contentType = "application/json"): Promise<Response> {
    const res = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: this.headers({ "content-type": contentType, origin: new URL(baseUrl).origin }),
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    this.remember(res);
    return res;
  }
  async postJson<T>(path: string, body: unknown): Promise<{ status: number; body: T }> {
    const res = await this.post(path, body);
    return { status: res.status, body: (await res.json()) as T };
  }
}

export const parse = (html: string): Document => new JSDOM(html).window.document;

export function sessionRow(doc: Document, sessionId: string): HTMLDetailsElement {
  const row = doc.querySelector<HTMLDetailsElement>(`details[data-session="${sessionId}"]`);
  if (!row) throw new Error(`no session row for ${sessionId}`);
  return row;
}

export const badgeOf = (doc: Document, sessionId: string): string =>
  sessionRow(doc, sessionId).querySelector(".badge")?.textContent?.trim() ?? "";
```

- [ ] **Step 8: Write the contract-test stubs**

Each file names its §10 rows as `it.todo`, so the contract is visible before any code exists. Later tasks replace each `it.todo` with a real test **before** writing the code it tests.

`spec/view.test.ts`:

```ts
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
```

`spec/sessions.test.ts`:

```ts
import { describe, it } from "vitest";

// F3 + F4 on the server-rendered page (spec §10). Filled in by Task 9.
describe("F3: sessions show dates and Now/Next", () => {
  it.todo("lists every session with its dates; Second Semester 2026 and Winter 2026 are Now, First Semester 2027 is Next");
  it.todo("opens only the next semester's details by default");
  it.todo("reopens the sessions named in ?open=");
});
describe("F4: enrolment details unfold in place", () => {
  it.todo("renders each session's details as a <details> element on /, not a link to another page");
});
```

`spec/enrol.test.ts`:

```ts
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
```

`spec/requirements.test.ts`:

```ts
import { describe, it } from "vitest";

// F5 (spec §10). Filled in by Task 8 (view JSON) and Task 9 (page).
describe("F5: requirements sidebar", () => {
  it.todo("shows Completed, Enrolled (now), Not enrolled with Add, and No classes listed for COMP6250");
  it.todo("shows COMP8800 Enrolled (1 of 2) and 30 units enrolled after adding it");
});
```

`spec/catalogue.test.ts`:

```ts
import { describe, it } from "vitest";

// F2 (spec §10). Filled in by Task 11.
describe("F2: browse classes", () => {
  it.todo("server-renders only matching rows for /?browse=2027-S1&subject=COMP&career=PGRD&level=8000");
  it.todo("keeps the current filters in sort and paging links and adds none");
  it.todo("bulk-adds three classes in one request");
});
```

`spec/api.test.ts`:

```ts
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
```

`spec/urls.test.ts`:

```ts
import { describe, it } from "vitest";

// Review Focus 1: a malformed link must never produce a 500 (spec §9).
// Filled in by Tasks 9–11.
describe("malformed links to /", () => {
  it.todo("renders 200 with a notice for unknown sessions, bad paging and bad filters");
});
```

- [ ] **Step 9: Run the full check**

Run: `pnpm check`

Expected: PASS. `astro check` reports 0 errors. Vitest runs the invariants, the readme test, the guestbook test (still present) and the check-evidence tests, and reports the new files as todo. The React integration builds even though no component uses it yet.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml astro.config.ts tsconfig.json vitest.config.ts spec/ .gitignore CLAUDE.md docs/superpowers/specs/2026-09-23-enrolment-redesign-design.md
git commit -m "chore: P0 harness — React toolchain, proposed CLAUDE.md rules, contract-test stubs" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

### Task 2: P1 — P&C parsers (course, program and plan pages; R1 requirements)

**Files:**
- Create: `scripts/pc/parse.ts`, `scripts/pc/parse.test.ts`, `scripts/pc/fixtures/README.md`
- Create (copied): `scripts/pc/fixtures/2026/course/COMP8020.html`, `scripts/pc/fixtures/2026/program/7722XVCOMP.html`, `scripts/pc/fixtures/2026/specialisation/ARTIF-SPEC.html`

**Interfaces:**
- Consumes: jsdom (already a dev dependency).
- Produces (`scripts/pc/parse.ts`):
  - `squash(s): string`
  - `parseDate(text): string`
  - `sessionSlug(heading): string | null`
  - `isSoftNotFound(finalUrl, html): boolean`
  - `careerOf(text): Career | null`
  - `parseCoursePage(html): CoursePage`
  - `parsePlanPage(html): PlanPage`
  - `requirementGroups(chunks, unitsOf, timesOf): ParsedGroup[]`
  - types `Career`, `Offering`, `CoursePage`, `RequirementItem`, `PlanPage`, `ParsedCourse`, `ParsedGroup`

- [ ] **Step 1: Save the three pages already captured as fixtures**

The one-off capture script sent the crawler's User-Agent on 2026-09-24 and saved three pages into `$CLAUDE_JOB_DIR/tmp/fixtures`. Task 3's crawl re-saves them.

```bash
mkdir -p scripts/pc/fixtures/2026/course scripts/pc/fixtures/2026/program scripts/pc/fixtures/2026/specialisation
cp "$CLAUDE_JOB_DIR/tmp/fixtures/2026_course_COMP8020.html" scripts/pc/fixtures/2026/course/COMP8020.html
cp "$CLAUDE_JOB_DIR/tmp/fixtures/2026_program_7722XVCOMP.html" scripts/pc/fixtures/2026/program/7722XVCOMP.html
cp "$CLAUDE_JOB_DIR/tmp/fixtures/2026_specialisation_ARTIF-SPEC.html" scripts/pc/fixtures/2026/specialisation/ARTIF-SPEC.html
```

`scripts/pc/fixtures/README.md`:

```markdown
# P&C page fixtures

Saved Programs & Courses pages that the parser tests (`parse.test.ts`) and
the requirement golden test (`golden.test.ts`) run against. Each file is
the page at `https://programsandcourses.anu.edu.au/<path>` (the same path
as the file, without `.html`), fetched with the crawler's User-Agent. See
`src/data/pc/README.md` for the snapshot they belong to.

They are committed because the crawler's cache (`.cache/pc/`) is not:
without them the tests would need the network. Refresh them by re-running
`pnpm data:fetch` and copying the pages over (plan Task 3, Step 6).
```

- [ ] **Step 2: Write the failing parser tests**

`scripts/pc/parse.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isSoftNotFound,
  type ParsedGroup,
  parseCoursePage,
  parseDate,
  parsePlanPage,
  type RequirementItem,
  requirementGroups,
  sessionSlug,
} from "./parse.ts";

const fixture = (path: string): string => readFileSync(`scripts/pc/fixtures/2026/${path}.html`, "utf8");

const UNITS: Record<string, number> = {
  COMP6250: 6, COMP8260: 6, COMP6442: 6, COMP6445: 6, COMP8800: 12,
  COMP6262: 6, COMP6320: 6, COMP8620: 6, COMP8691: 6,
};
const unitsOf = (code: string): number | undefined => UNITS[code];
const once = (): number => 1;
const tracked = (groups: ParsedGroup[]) =>
  groups
    .filter((g) => g.rule !== "note")
    .map((g) => ({ label: g.label, rule: g.rule, minUnits: g.minUnits, courses: g.courses.map((c) => `${c.code}×${c.times}`) }));

describe("parseDate", () => {
  it("reads P&C's dates as ISO dates", () => {
    expect(parseDate("27 Jul 2026")).toBe("2026-07-27");
    expect(parseDate(" 03 Aug 2026 ")).toBe("2026-08-03");
  });
  it("refuses anything else, so a format change fails the build", () => {
    expect(() => parseDate("2026-07-27")).toThrow(/unrecognised date/);
  });
});

describe("sessionSlug", () => {
  it("maps P&C's session headings to the calendar's slugs", () => {
    expect(sessionSlug("First Semester")).toBe("S1");
    expect(sessionSlug("Second Semester")).toBe("S2");
    expect(sessionSlug("Summer Session")).toBe("SUM");
    expect(sessionSlug("Autumn Session")).toBe("AUT");
    expect(sessionSlug("Winter Session")).toBe("WIN");
    expect(sessionSlug("Spring Session")).toBe("SPR");
    expect(sessionSlug("Full Year")).toBeNull();
  });
});

describe("isSoftNotFound", () => {
  it("spots P&C's HTTP-200 not-found answers", () => {
    expect(isSoftNotFound("https://programsandcourses.anu.edu.au/Error/Index/404?aspxerrorpath=/2026/course/COMP9999", "<html></html>")).toBe(true);
    expect(isSoftNotFound("https://programsandcourses.anu.edu.au/2026/course/COMP9999", "<title>Page not found - ANU</title>")).toBe(true);
  });
  it("passes a real page", () => {
    expect(isSoftNotFound("https://programsandcourses.anu.edu.au/2026/course/COMP8020", fixture("course/COMP8020"))).toBe(false);
  });
});

describe("parseCoursePage (COMP8020)", () => {
  const page = parseCoursePage(fixture("course/COMP8020"));

  it("reads the summary, description and requisites", () => {
    expect(page).toMatchObject({
      code: "COMP8020",
      title: "Advanced Topics in Human-Centred and Creative Computing",
      units: 6,
      career: "PGRD",
      subjectName: "Computer Science",
      mode: "In Person",
    });
    expect(page.description.length).toBeGreaterThan(50);
    expect(page.requisites).toMatch(/^To enrol in this course, you must have completed COMP6390\./);
  });

  it("reads every offering, applying a topic row to the classes under it", () => {
    expect(page.offerings).toContainEqual({
      year: 2026,
      sessionName: "Second Semester",
      classNumber: 9057,
      startDate: "2026-07-27",
      lastDayToEnrol: "2026-08-03",
      censusDate: "2026-08-31",
      endDate: "2026-10-30",
      mode: "In Person",
      topic: "Agentic Coding Studio",
    });
    expect(page.offerings).toContainEqual(
      expect.objectContaining({ year: 2027, sessionName: "Second Semester", classNumber: 10060, startDate: "2027-07-26", lastDayToEnrol: "2027-08-02", censusDate: "2027-08-31", endDate: "2027-10-29" }),
    );
  });
});

describe("parsePlanPage (7722XVCOMP)", () => {
  const page = parsePlanPage(fixture("program/7722XVCOMP"));

  it("reads the program's identity and its specialisations", () => {
    expect(page).toMatchObject({ code: "7722XVCOMP", name: "Master of Computing (Advanced)", acronym: "MCOMPADV", postNominal: "MCompAdv", units: 96 });
    expect(page.childPlans).toEqual(expect.arrayContaining(["ARTIF-SPEC", "CMSY-SPEC", "DTSC-SPEC", "MCHL-SPEC", "SOFT-SPEC"]));
  });

  it("turns the requirements into VCOMP's three tracked groups (spec §6.1)", () => {
    const groups = requirementGroups(page.requirements, unitsOf, (code) => (code === "COMP8800" ? 2 : 1));
    expect(tracked(groups)).toEqual([
      { label: "6 units from one of", rule: "units", minUnits: 6, courses: ["COMP6250×1", "COMP8260×1"] },
      { label: "Compulsory", rule: "all", minUnits: null, courses: ["COMP6442×1", "COMP6445×1"] },
      { label: "All of", rule: "all", minUnits: null, courses: ["COMP8800×2"] },
    ]);
  });

  it("keeps every other rule verbatim as a note", () => {
    const notes = requirementGroups(page.requirements, unitsOf, once).filter((g) => g.rule === "note");
    expect(notes.some((n) => n.text.includes("A minimum of 48 units must come from completion of 8000-level COMP courses"))).toBe(true);
    expect(notes.some((n) => n.text.includes("12 units from completion of elective courses offered by ANU"))).toBe(true);
    expect(notes.some((n) => n.courses.some((c) => c.code === "COMP8800"))).toBe(true); // the supervisor rule links COMP8800
  });
});

describe("parsePlanPage (ARTIF-SPEC)", () => {
  const page = parsePlanPage(fixture("specialisation/ARTIF-SPEC"));

  it("reads the specialisation's identity and the degrees it belongs to", () => {
    expect(page).toMatchObject({ code: "ARTIF-SPEC", name: "Artificial Intelligence", acronym: "ARTIF", units: 24, career: "PGRD" });
    expect(page.relevantDegrees).toEqual(["7706XMCOMP", "7722XVCOMP"]);
  });

  it("tracks its four listed courses as one group", () => {
    expect(tracked(requirementGroups(page.requirements, unitsOf, once))).toEqual([
      { label: "All of", rule: "all", minUnits: null, courses: ["COMP6262×1", "COMP6320×1", "COMP8620×1", "COMP8691×1"] },
    ]);
  });
});

describe("requirementGroups (R1, spec §8.3)", () => {
  const line = (code: string, also: string[] = []): RequirementItem => ({ text: `${code} A Course (6 units)`, codes: [code, ...also], lead: code });
  const para = (text: string, codes: string[] = []): RequirementItem => ({ text, codes, lead: null });

  it("reads 'N units from … one of the following' as a units group", () => {
    const [g] = requirementGroups([[para("12 units from completion of one of the following courses:"), line("COMP6250"), line("COMP8260"), line("COMP6442")]], unitsOf, once);
    expect(g).toMatchObject({ rule: "units", minUnits: 12, label: "12 units from one of", text: "12 units from completion of one of the following courses:" });
  });

  it("classifies a paragraph with inline course links on its own", () => {
    const [g] = requirementGroups([[para("6 units from completion of COMP6250 or COMP8260", ["COMP6250", "COMP8260"])]], unitsOf, once);
    expect(g).toMatchObject({ rule: "units", minUnits: 6 });
  });

  it("makes a list containing an either/or line a note instead of guessing", () => {
    const [g] = requirementGroups([[para("12 units from completion of the following compulsory courses:"), line("COMP6442", ["COMP6445"]), line("COMP6262")]], unitsOf, once);
    expect(g.rule).toBe("note");
    expect(g.courses.map((c) => c.code)).toEqual(["COMP6442", "COMP6445", "COMP6262"]);
  });

  it("makes 'a maximum of' a note", () => {
    const [g] = requirementGroups([[para("A maximum of 12 units from the following courses:"), line("COMP6442"), line("COMP6445")]], unitsOf, once);
    expect(g.rule).toBe("note");
  });

  it("makes a run of courses with no heading a note", () => {
    const [g] = requirementGroups([[line("COMP6442"), line("COMP6445")]], unitsOf, once);
    expect(g).toMatchObject({ rule: "note", courses: [{ code: "COMP6442", times: 1 }, { code: "COMP6445", times: 1 }] });
  });

  it("merges consecutive plain paragraphs in a chunk into one note, one line each", () => {
    const groups = requirementGroups([[para("The 96 units must consist of:"), para("Artificial Intelligence"), para("Data Science")]], unitsOf, once);
    expect(groups).toEqual([{ label: "Note", rule: "note", minUnits: null, text: "The 96 units must consist of:\nArtificial Intelligence\nData Science", courses: [] }]);
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `pnpm build && pnpm vitest run scripts/pc/parse.test.ts`

Expected: FAIL. Vitest can't resolve `./parse.ts`.

- [ ] **Step 4: Write `scripts/pc/parse.ts`**

```ts
// Parsers for Programs & Courses (P&C) pages: HTML in, plain data out. The
// crawler (fetch.ts) and the snapshot build (build.ts) call them; the tests
// run them on the saved pages in scripts/pc/fixtures/.
import { JSDOM } from "jsdom";

export type Career = "UGRD" | "PGRD" | "RSCH";

export const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "27 Jul 2026" → "2026-07-27". Throws on anything else, so a format change fails the build loudly. */
export function parseDate(text: string): string {
  const m = squash(text).match(/^(\d{1,2}) ([A-Za-z]{3})[A-Za-z]* (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2].toLowerCase()) + 1 : 0;
  if (!m || month === 0) throw new Error(`unrecognised date "${text}"`);
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** P&C's session heading ("First Semester", "Winter Session") → the calendar's slug (spec §8.4). */
export function sessionSlug(heading: string): string | null {
  const h = heading.toLowerCase();
  if (h.includes("first semester")) return "S1";
  if (h.includes("second semester")) return "S2";
  if (/summer|quarter 1\b/.test(h)) return "SUM";
  if (/autumn|quarter 2\b/.test(h)) return "AUT";
  if (/winter|quarter 3\b/.test(h)) return "WIN";
  if (/spring|quarter 4\b/.test(h)) return "SPR";
  return null;
}

/** P&C answers a missing page with HTTP 200: a redirect to its error page, or a "Page not found" title (spec §8.2). */
export function isSoftNotFound(finalUrl: string, html: string): boolean {
  return /\/Error\/Index\/404/i.test(finalUrl) || /<title>[^<]*page not found/i.test(html);
}

export function careerOf(text: string | null | undefined): Career | null {
  const t = squash(text).toUpperCase();
  if (t.startsWith("UGRD") || t.startsWith("UNDERGRADUATE")) return "UGRD";
  if (t.startsWith("PGRD") || t.startsWith("POSTGRADUATE")) return "PGRD";
  if (t.startsWith("RSCH") || t.startsWith("RESEARCH")) return "RSCH";
  return null;
}

const load = (html: string): Document => new JSDOM(html).window.document;

/** The page's summary box ("Unit Value", "Academic career", …), keyed by lower-cased heading. P&C renders it twice; the desktop copy wins. */
function summary(d: Document): Map<string, string> {
  const box = d.querySelector(".degree-summary.hide-mobile") ?? d.querySelector(".degree-summary");
  const out = new Map<string, string>();
  for (const li of box?.querySelectorAll("li") ?? []) {
    const heading = li.querySelector(".degree-summary__requirements-heading, .degree-summary__code-heading");
    if (!heading) continue;
    const key = squash(heading.textContent).toLowerCase();
    if (!out.has(key)) out.set(key, squash((li.textContent ?? "").replace(heading.textContent ?? "", "")));
  }
  return out;
}

function unitsIn(text: string | undefined): number | null {
  const m = (text ?? "").match(/(\d+(?:\.\d+)?)\s*units?/i);
  return m ? Number(m[1]) : null;
}

function paragraphsOf(el: Element | null): string {
  if (!el) return "";
  const ps = [...el.querySelectorAll("p")].map((p) => squash(p.textContent)).filter(Boolean);
  return ps.length > 0 ? ps.join("\n\n") : squash(el.textContent);
}

export interface Offering {
  year: number;
  sessionName: string;
  classNumber: number;
  startDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  endDate: string;
  mode: string;
  topic: string | null;
}

export interface CoursePage {
  code: string;
  title: string;
  units: number | null;
  career: Career | null;
  subjectName: string | null;
  mode: string | null;
  description: string;
  requisites: string | null;
  offerings: Offering[];
}

export function parseCoursePage(html: string): CoursePage {
  const d = load(html);
  const s = summary(d);
  const code = (s.get("code") ?? "").toUpperCase();
  if (!/^[A-Z]{4}\d{4}$/.test(code)) throw new Error(`no course code in the page's summary (found "${code}")`);
  return {
    code,
    title: squash(d.querySelector("h1.intro__degree-title")?.textContent),
    units: unitsIn(s.get("unit value")),
    career: careerOf(s.get("academic career")),
    subjectName: s.get("course subject") || null,
    mode: s.get("mode of delivery") || null,
    description: paragraphsOf(d.getElementById("introduction")),
    requisites: squash(d.querySelector("div.requisite")?.textContent) || null,
    offerings: offerings(d, code),
  };
}

/**
 * The "Offerings, Dates and Class Summary Links" tables: one tab per year,
 * an h3 per session, a table of classes under it. A one-cell row names the
 * topic of the classes below it.
 */
function offerings(d: Document, code: string): Offering[] {
  const tabYears = new Map<string, number>();
  for (const a of d.querySelectorAll('.course-tab a[href^="#course-tab-"]')) {
    const year = Number(squash(a.textContent));
    if (Number.isInteger(year) && year > 2000) tabYears.set((a.getAttribute("href") ?? "").slice(1), year);
  }
  const out: Offering[] = [];
  for (const [tabId, year] of tabYears) {
    const tab = d.getElementById(tabId);
    if (!tab) continue;
    let sessionName = "";
    for (const el of tab.querySelectorAll("h3, table.table-terms")) {
      if (el.tagName === "H3") {
        sessionName = squash(el.textContent);
        continue;
      }
      const heads = [...el.querySelectorAll("thead th")].map((th) => squash(th.textContent).toLowerCase());
      const col = (word: string, fallback: number): number => {
        const i = heads.findIndex((h) => h.includes(word));
        return i >= 0 ? i : fallback;
      };
      const at = { number: col("class number", 0), start: col("start", 1), enrol: col("last day", 2), census: col("census", 3), end: col("end date", 4), mode: col("mode", 5) };
      let topic: string | null = null;
      for (const tr of el.querySelectorAll("tbody tr")) {
        const cells = [...tr.querySelectorAll("td")];
        if (cells.length === 1) {
          topic = squash(cells[0].textContent) || null;
          continue;
        }
        if (cells.length < 6) continue;
        const cell = (i: number): string => squash(cells[i]?.textContent);
        const classNumber = Number(cell(at.number));
        if (!Number.isInteger(classNumber) || classNumber <= 0) throw new Error(`${code}: bad class number "${cell(at.number)}"`);
        out.push({
          year,
          sessionName,
          classNumber,
          startDate: parseDate(cell(at.start)),
          lastDayToEnrol: parseDate(cell(at.enrol)),
          censusDate: parseDate(cell(at.census)),
          endDate: parseDate(cell(at.end)),
          mode: cell(at.mode),
          topic,
        });
      }
    }
  }
  return out;
}

export interface RequirementItem {
  text: string;
  /** Course codes the paragraph links to, in order, deduplicated. */
  codes: string[];
  /** For a course line — a paragraph that starts with a linked course code — that code. */
  lead: string | null;
}

export interface PlanPage {
  code: string;
  name: string;
  acronym: string | null;
  postNominal: string | null;
  units: number | null;
  career: Career | null;
  /** Programs a major or specialisation page lists under "Relevant Degrees". */
  relevantDegrees: string[];
  /** Majors and specialisations a program page links to. */
  childPlans: string[];
  /** The requirements section, as chunks: the paragraphs between empty <p>s. */
  requirements: RequirementItem[][];
}

function metaContent(d: Document, suffix: string): string | null {
  for (const kind of ["program", "major", "specialisation", "minor"]) {
    const value = squash(d.querySelector(`meta[name="${kind}-${suffix}"]`)?.getAttribute("content"));
    if (value) return value;
  }
  return null;
}

function linked(root: Element | Document | null, pattern: RegExp): string[] {
  const out = new Set<string>();
  for (const a of root?.querySelectorAll("a[href]") ?? []) {
    const m = (a.getAttribute("href") ?? "").match(pattern);
    if (m) out.add(m[1].toUpperCase());
  }
  return [...out];
}

export function parsePlanPage(html: string): PlanPage {
  const d = load(html);
  const s = summary(d);
  const code = metaContent(d, "code") ?? s.get("academic plan") ?? s.get("specialisation code") ?? s.get("major code") ?? "";
  if (!code) throw new Error("no plan code on the page");
  return {
    code: code.toUpperCase(),
    name: metaContent(d, "name") ?? squash(d.querySelector("h1.intro__degree-title")?.textContent),
    acronym: metaContent(d, "acronym"),
    postNominal: s.get("post nominal") || null,
    units: unitsIn(s.get("minimum") ?? s.get("total units")),
    career: careerOf(s.get("academic career")),
    relevantDegrees: linked(d.getElementById("relevant-degrees"), /\/program\/([A-Za-z0-9]+)/),
    childPlans: linked(d, /\/(?:major|specialisation)\/([A-Za-z0-9]+-(?:MAJ|SPEC))\b/),
    requirements: requirementChunks(d),
  };
}

const COURSE_HREF = /\/course\/([A-Za-z]{4}\d{4})\b/;

function requirementChunks(d: Document): RequirementItem[][] {
  const start =
    d.getElementById("program-requirements") ??
    d.getElementById("requirements") ??
    [...d.querySelectorAll("h2")].find((h) => /requirements/i.test(h.textContent ?? "")) ??
    null;
  if (!start) return [];
  const flat: (RequirementItem | null)[] = [];
  for (let el = start.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
    if (el.matches("a.back-to-top") || el.querySelector("a.back-to-top")) break;
    collect(el, flat);
  }
  const chunks: RequirementItem[][] = [[]];
  for (const item of flat) {
    if (item) chunks[chunks.length - 1].push(item);
    else if (chunks[chunks.length - 1].length > 0) chunks.push([]);
  }
  return chunks.filter((c) => c.length > 0);
}

/** Flattens the section into paragraphs (P, LI, table rows, headings). An empty <p> is a chunk break (null). A <p> split by <br>s yields one item per line. */
function collect(el: Element, out: (RequirementItem | null)[]): void {
  const tag = el.tagName;
  if (tag === "THEAD" || tag === "SCRIPT" || tag === "STYLE") return;
  if (["UL", "OL", "DIV", "SECTION", "TABLE", "TBODY"].includes(tag)) {
    for (const child of el.children) collect(child, out);
    return;
  }
  if (tag === "P" && el.querySelector("br")) {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    for (const part of parts) {
      const holder = el.ownerDocument.createElement("p");
      holder.innerHTML = part;
      collect(holder, out);
    }
    return;
  }
  const text = squash(el.textContent);
  if (!text) {
    if (tag === "P") out.push(null);
    return;
  }
  const anchors = el.matches("a[href]") ? [el] : [...el.querySelectorAll("a[href]")];
  const codes = [...new Set(anchors.map((a) => (a.getAttribute("href") ?? "").match(COURSE_HREF)?.[1]?.toUpperCase()).filter((c): c is string => Boolean(c)))];
  const first = text.match(/^([A-Z]{4}\d{4})\b/)?.[1] ?? null;
  out.push({ text, codes, lead: first && codes.includes(first) ? first : null });
}

export interface ParsedCourse {
  code: string;
  times: number;
}

export interface ParsedGroup {
  label: string;
  rule: "all" | "units" | "note";
  minUnits: number | null;
  text: string;
  courses: ParsedCourse[];
}

/**
 * R1 (spec §8.3). A course line joins a run, and the run's heading is the
 * plain paragraph just before it. A paragraph with inline course links is
 * classified on its own. Other plain paragraphs in the same chunk merge into
 * one note. Anything R1 can't read with certainty becomes a verbatim note:
 * it never guesses.
 */
export function requirementGroups(
  chunks: RequirementItem[][],
  unitsOf: (code: string) => number | undefined,
  timesOf: (code: string) => number,
): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  const note = (text: string, codes: string[]): ParsedGroup => ({
    label: "Note",
    rule: "note",
    minUnits: null,
    text,
    courses: [...new Set(codes)].map((code) => ({ code, times: timesOf(code) })),
  });
  for (const chunk of chunks) {
    let plain: RequirementItem[] = [];
    const flush = (): void => {
      if (plain.length > 0) groups.push(note(plain.map((p) => p.text).join("\n"), []));
      plain = [];
    };
    let i = 0;
    while (i < chunk.length) {
      const item = chunk[i];
      if (item.lead) {
        const run: RequirementItem[] = [];
        while (i < chunk.length && chunk[i].lead) run.push(chunk[i++]);
        const heading = plain.pop()?.text ?? "";
        flush();
        const eitherOr = run.some((r) => r.codes.length > 1);
        if (!heading || eitherOr) {
          groups.push(note([heading, ...run.map((r) => r.text)].filter(Boolean).join("\n"), run.flatMap((r) => r.codes)));
        } else {
          groups.push(classify(heading, run.map((r) => r.lead as string), unitsOf, timesOf));
        }
        continue;
      }
      i++;
      if (item.codes.length > 0) {
        flush();
        groups.push(classify(item.text, item.codes, unitsOf, timesOf));
      } else {
        plain.push(item);
      }
    }
    flush();
  }
  return groups;
}

/** The rule a heading states over its courses (spec §8.3, R1). */
function classify(
  heading: string,
  codes: string[],
  unitsOf: (code: string) => number | undefined,
  timesOf: (code: string) => number,
): ParsedGroup {
  const courses = [...new Set(codes)].map((code) => ({ code, times: timesOf(code) }));
  const note: ParsedGroup = { label: "Note", rule: "note", minUnits: null, text: heading, courses };
  if (courses.length === 0 || /a maximum of/i.test(heading)) return note;
  const n = Number(heading.match(/(\d+)\s*units/i)?.[1] ?? Number.NaN);
  const units = courses.map((c) => unitsOf(c.code));
  const total = units.every((u) => u !== undefined)
    ? courses.reduce((sum, c, k) => sum + (units[k] as number) * c.times, 0)
    : Number.NaN;
  const all = (label: string): ParsedGroup => ({ label, rule: "all", minUnits: null, text: heading, courses });
  if (/compulsory/i.test(heading)) return all("Compulsory");
  if (n === total) return all("All of");
  if (Number.isFinite(n) && /one of the following|a minimum of|units from/i.test(heading)) {
    return { label: /one of/i.test(heading) ? `${n} units from one of` : `${n} units from`, rule: "units", minUnits: n, text: heading, courses };
  }
  if (/the following courses/i.test(heading)) return all("All of");
  return note;
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `pnpm vitest run scripts/pc/parse.test.ts`

Expected: PASS, all tests.

- If a fixture assertion fails because P&C's markup differs from the one captured, read the fixture and fix the **parser**, never the expectation. The expectations restate P&C's published text.
- If the VCOMP group order differs, print `requirementGroups(...)` and check each group against the requirements section by eye.

- [ ] **Step 6: Commit**

```bash
git add scripts/pc/parse.ts scripts/pc/parse.test.ts scripts/pc/fixtures/
git commit -m "feat(data): P&C page parsers and the R1 requirement grouping, tested on saved pages" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 3: P1 — polite fetcher, and running the crawl

**Files:**
- Create: `scripts/pc/scope.ts`, `scripts/pc/fetch.ts`, `scripts/pc/fetch.test.ts`
- Modify: `package.json` (add the `data:fetch` script)
- Create (copied from the crawl): `scripts/pc/fixtures/2026/{program,major,specialisation}/*.html` (20 pages), and `scripts/pc/fixtures/2026/course/{COMP8020,POGO8062,REGN8050}.html`

**Interfaces:**
- Consumes: `parsePlanPage` and `isSoftNotFound` from Task 2.
- Produces:
  - `scope.ts` exports:
    - `BASE`, `YEARS` (`[2026, 2027]`), `RULES_YEAR` (2026), `USER_AGENT`
    - `PROGRAMS: {code, career, plans}[]`, `EXTRA_COURSES`, `COMP_CODE`
    - `planKind(code)`, `planCodes()`
    - `courseListUrl(year)`, `planListUrls`, `pageUrl(kind, code, year?)`
  - `fetch.ts` exports `CACHE_DIR`, `cachePath(url)` and the type `CacheEntry {url, status, finalUrl, fetchedAt, missing, file}`.
  - On disk: `.cache/pc/index.json`, holding `{fetchedOn, userAgent, entries: CacheEntry[]}`.

- [ ] **Step 1: Write the failing test**

`scripts/pc/fetch.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cachePath } from "./fetch.ts";
import { courseListUrl, pageUrl, planCodes, PROGRAMS } from "./scope.ts";

describe("scope (spec §8.1)", () => {
  it("covers five programs and fifteen distinct plans, shared plans once", () => {
    expect(PROGRAMS.map((p) => p.code)).toEqual(["BCOMP", "AACOM", "AACRD", "7706XMCOMP", "7722XVCOMP"]);
    expect(planCodes()).toHaveLength(15);
  });
  it("puts the year in every page URL (year-less URLs serve 2027)", () => {
    expect(pageUrl("course", "COMP8020")).toBe("https://programsandcourses.anu.edu.au/2026/course/COMP8020");
    expect(pageUrl("course", "COMP8020", 2027)).toBe("https://programsandcourses.anu.edu.au/2027/course/COMP8020");
  });
});

describe("cachePath", () => {
  it("mirrors a page's URL path under .cache/pc/", () => {
    expect(cachePath(pageUrl("specialisation", "ARTIF-SPEC"))).toBe(".cache/pc/2026/specialisation/ARTIF-SPEC");
  });
  it("keeps query strings apart and file-safe", () => {
    expect(cachePath(courseListUrl(2026))).not.toBe(cachePath(courseListUrl(2027)));
    expect(cachePath(courseListUrl(2026))).toMatch(/^\.cache\/pc\/data\/CourseSearch\/GetCourses_[A-Za-z0-9=._-]+$/);
  });
});
```

Run: `pnpm vitest run scripts/pc/fetch.test.ts`. Expected: FAIL, because the modules are missing.

- [ ] **Step 2: Write `scripts/pc/scope.ts`**

```ts
// What the P&C crawl covers (spec §8.1). Changing this file changes the
// snapshot: re-run `pnpm data:fetch && pnpm data:build`.

export const BASE = "https://programsandcourses.anu.edu.au";
export const YEARS = [2026, 2027] as const;
/** Requirements follow the template students' commencement year. */
export const RULES_YEAR = 2026;

export const USER_AGENT =
  "comp4020-crit7-enrolment-crawler/0.1 (+https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix; student project; fetched by an AI coding agent at a student's direction; about 1 request per second)";

export interface ProgramScope {
  code: string;
  career: "UGRD" | "PGRD";
  plans: string[];
}

export const PROGRAMS: ProgramScope[] = [
  { code: "BCOMP", career: "UGRD", plans: ["COMS-MAJ", "CSEC-MAJ", "DTSC-MAJ", "INSY-MAJ", "SOFT-MAJ"] },
  { code: "AACOM", career: "UGRD", plans: ["ARIN-SPEC", "HCCC-SPEC", "MACL-SPEC", "SYAR-SPEC", "THCS-SPEC"] },
  { code: "AACRD", career: "UGRD", plans: ["ARIN-SPEC", "HCCC-SPEC", "MACL-SPEC", "SYAR-SPEC", "THCS-SPEC"] },
  { code: "7706XMCOMP", career: "PGRD", plans: ["ARTIF-SPEC", "CMSY-SPEC", "DTSC-SPEC", "MCHL-SPEC", "SOFT-SPEC"] },
  { code: "7722XVCOMP", career: "PGRD", plans: ["ARTIF-SPEC", "CMSY-SPEC", "DTSC-SPEC", "MCHL-SPEC", "SOFT-SPEC"] },
];

/** Multi-class examples, so the chooser has real cases (spec §8.1). */
export const EXTRA_COURSES = ["SCOM8014", "POGO8062", "REGN8050"];

export const COMP_CODE = /^COMP\d{4}$/;

export type PlanKind = "program" | "major" | "specialisation";

export function planKind(code: string): PlanKind {
  if (code.endsWith("-MAJ")) return "major";
  if (code.endsWith("-SPEC")) return "specialisation";
  return "program";
}

/** The fifteen distinct majors and specialisations; a shared plan appears once. */
export function planCodes(): string[] {
  return [...new Set(PROGRAMS.flatMap((p) => p.plans))];
}

export function courseListUrl(year: number): string {
  return `${BASE}/data/CourseSearch/GetCourses?SearchText=COMP&SelectedYear=${year}&ShowAll=true&PageIndex=0&MaxPageSize=10&PageSize=Infinity&AppliedFilter=FilterByCourses`;
}

const LIST_QUERY = `CollegeName=CECS&SelectedYear=${RULES_YEAR}&ShowAll=true`;
export const planListUrls = [
  `${BASE}/data/ProgramSearch/GetProgramsUnderGraduate?${LIST_QUERY}`,
  `${BASE}/data/ProgramSearch/GetProgramsPostGraduate?${LIST_QUERY}`,
  `${BASE}/data/MajorSearch/GetMajors?${LIST_QUERY}`,
  `${BASE}/data/SpecialisationSearch/GetSpecialisations?${LIST_QUERY}`,
];

export function pageUrl(kind: PlanKind | "course", code: string, year: number = RULES_YEAR): string {
  return `${BASE}/${year}/${kind}/${code}`;
}
```

- [ ] **Step 3: Write `scripts/pc/fetch.ts`**

```ts
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
```

Add to `package.json` `scripts`: `"data:fetch": "node scripts/pc/fetch.ts"`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `pnpm vitest run scripts/pc/fetch.test.ts`

Expected: PASS.

- [ ] **Step 5: Run the crawl (spec D14)**

Run it in the background and log to the job directory. It takes about 4–6 minutes for about 210 requests.

```bash
pnpm data:fetch > "$CLAUDE_JOB_DIR/tmp/crawl.log" 2>&1
```

Expected: the log ends with `done: N URLs, M missing, K courses`, where K is about 180 and M is small. Read every `(missing)` and `giving up` line.

- A timeout: re-run the command, and the cache skips everything already fetched.
- Repeated 403s or 429s: **stop**, and don't retry harder. Report it to the user, because it means P&C is refusing the crawler.

- [ ] **Step 6: Refresh the fixtures from the crawl**

```bash
mkdir -p scripts/pc/fixtures/2026/major
cp .cache/pc/2026/program/*.html scripts/pc/fixtures/2026/program/
cp .cache/pc/2026/major/*.html scripts/pc/fixtures/2026/major/
cp .cache/pc/2026/specialisation/*.html scripts/pc/fixtures/2026/specialisation/
cp .cache/pc/2026/course/COMP8020.html .cache/pc/2026/course/POGO8062.html .cache/pc/2026/course/REGN8050.html scripts/pc/fixtures/2026/course/
ls scripts/pc/fixtures/2026/*/ | wc -l
du -sh scripts/pc/fixtures
pnpm vitest run scripts/pc/parse.test.ts
```

Expected: 5 program pages, 5 major pages, 10 specialisation pages and 3 course pages. The parser tests still pass on the fresh copies.

If `du` shows more than about 3 MB, keep the files anyway. They are the evidence the golden test pins.

- [ ] **Step 7: Commit (the code and fixtures; the cache stays local)**

```bash
git add scripts/pc/scope.ts scripts/pc/fetch.ts scripts/pc/fetch.test.ts scripts/pc/fixtures/ package.json
git commit -m "feat(data): polite cached P&C crawler, run once; 20 plan pages saved as fixtures" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 4: P1 — calendar, snapshot build, provenance and the golden test

**Files:**
- Create: `src/data/calendar.json`, `scripts/pc/overrides.json`, `scripts/pc/anuhub-s2-2026.json`, `scripts/pc/build.ts`, `scripts/pc/build.test.ts`, `scripts/pc/golden.test.ts`
- Create (generated, then committed): `src/data/pc/courses.json`, `classes.json`, `plans.json`, `requirements.json`, `snapshot.json`, `README.md`
- Modify: `package.json` (add the `data:build` script)

**Interfaces:**
- Consumes:
  - from `parse.ts`: `parseCoursePage`, `parsePlanPage`, `requirementGroups`, `careerOf`, `sessionSlug`;
  - from `scope.ts`: `YEARS`, `RULES_YEAR`, `PROGRAMS`, `planCodes`, `planKind`, `pageUrl`, `courseListUrl`, `COMP_CODE`, `BASE`;
  - from `fetch.ts`: `CACHE_DIR` and the type `CacheEntry`.
- Produces:
  - `build.ts` exports:
    - `buildSnapshot(input: BuildInput): BuildOutput`
    - `timesFor(overrides, planCode)`, `finaliseGroups(groups, known)`
    - types `PcCourse`, `PcClass`, `PcPlan`, `PcProgramPlan`, `PcRequirements`, `CalendarSession`, `Overrides`, `BuildInput`, `BuildOutput`
  - The committed JSON shapes, which the seeder (Task 5) and the tests read:
    - `courses.json: PcCourse[]`
    - `classes.json: PcClass[]`
    - `plans.json: {plans: PcPlan[], programPlans: PcProgramPlan[]}`
    - `requirements.json: PcRequirements[]`
    - `snapshot.json: {fetchedOn, source, years, rulesYear, counts}`
    - `calendar.json: {note, sources, sessions: CalendarSession[]}`

- [ ] **Step 1: Write the calendar**

`src/data/calendar.json`. The values are ANUHub notes §3, from the university calendars. `enrolOpens` is indicative and shown only (spec D4).

```json
{
  "note": "Hand-curated from the ANU university calendars (spec §8.4). P&C doesn't publish session spans or exam periods. enrolOpens is indicative: shown, never enforced (spec D4). Intensive sessions have no session-wide add or census date; their classes carry their own.",
  "sources": [
    "https://www.anu.edu.au/directories/university-calendar?year=2026",
    "https://www.anu.edu.au/directories/university-calendar?year=2027"
  ],
  "sessions": [
    { "id": "2026-SUM", "name": "Summer Session 2026", "kind": "intensive", "year": 2026, "startDate": "2026-01-01", "endDate": "2026-03-31", "examStart": null, "examEnd": null, "lastDayToAdd": null, "censusDate": null, "dropNoFailDate": null, "enrolOpens": null, "enrolOpensText": null, "source": "https://www.anu.edu.au/directories/university-calendar?year=2026" },
    { "id": "2026-S1", "name": "First Semester 2026", "kind": "semester", "year": 2026, "startDate": "2026-02-23", "endDate": "2026-05-29", "examStart": "2026-06-04", "examEnd": "2026-06-20", "lastDayToAdd": "2026-03-02", "censusDate": "2026-03-31", "dropNoFailDate": "2026-05-08", "enrolOpens": "2025-12-04", "enrolOpensText": "4 December 2025", "source": "https://www.anu.edu.au/directories/university-calendar?year=2026" },
    { "id": "2026-AUT", "name": "Autumn Session 2026", "kind": "intensive", "year": 2026, "startDate": "2026-04-01", "endDate": "2026-06-30", "examStart": null, "examEnd": null, "lastDayToAdd": null, "censusDate": null, "dropNoFailDate": null, "enrolOpens": "2025-12-04", "enrolOpensText": "4 December 2025", "source": "https://www.anu.edu.au/directories/university-calendar?year=2026" },
    { "id": "2026-WIN", "name": "Winter Session 2026", "kind": "intensive", "year": 2026, "startDate": "2026-07-01", "endDate": "2026-09-30", "examStart": null, "examEnd": null, "lastDayToAdd": null, "censusDate": null, "dropNoFailDate": null, "enrolOpens": "2025-12-04", "enrolOpensText": "4 December 2025", "source": "https://www.anu.edu.au/directories/university-calendar?year=2026" },
    { "id": "2026-S2", "name": "Second Semester 2026", "kind": "semester", "year": 2026, "startDate": "2026-07-27", "endDate": "2026-10-30", "examStart": "2026-11-05", "examEnd": "2026-11-21", "lastDayToAdd": "2026-08-03", "censusDate": "2026-08-31", "dropNoFailDate": "2026-10-09", "enrolOpens": "2025-12-04", "enrolOpensText": "4 December 2025", "source": "https://www.anu.edu.au/directories/university-calendar?year=2026" },
    { "id": "2026-SPR", "name": "Spring Session 2026", "kind": "intensive", "year": 2026, "startDate": "2026-10-01", "endDate": "2026-12-31", "examStart": null, "examEnd": null, "lastDayToAdd": null, "censusDate": null, "dropNoFailDate": null, "enrolOpens": "2025-12-04", "enrolOpensText": "4 December 2025", "source": "https://www.anu.edu.au/directories/university-calendar?year=2026" },
    { "id": "2027-SUM", "name": "Summer Session 2027", "kind": "intensive", "year": 2027, "startDate": "2027-01-01", "endDate": "2027-03-31", "examStart": null, "examEnd": null, "lastDayToAdd": null, "censusDate": null, "dropNoFailDate": null, "enrolOpens": "2026-10-15", "enrolOpensText": "mid-October (indicative)", "source": "https://www.anu.edu.au/directories/university-calendar?year=2027" },
    { "id": "2027-S1", "name": "First Semester 2027", "kind": "semester", "year": 2027, "startDate": "2027-02-22", "endDate": "2027-05-28", "examStart": "2027-06-03", "examEnd": "2027-06-19", "lastDayToAdd": "2027-03-01", "censusDate": "2027-03-31", "dropNoFailDate": null, "enrolOpens": "2026-12-01", "enrolOpensText": "early December (indicative)", "source": "https://www.anu.edu.au/directories/university-calendar?year=2027" },
    { "id": "2027-AUT", "name": "Autumn Session 2027", "kind": "intensive", "year": 2027, "startDate": "2027-04-01", "endDate": "2027-06-30", "examStart": null, "examEnd": null, "lastDayToAdd": null, "censusDate": null, "dropNoFailDate": null, "enrolOpens": "2026-12-01", "enrolOpensText": "early December (indicative)", "source": "https://www.anu.edu.au/directories/university-calendar?year=2027" },
    { "id": "2027-WIN", "name": "Winter Session 2027", "kind": "intensive", "year": 2027, "startDate": "2027-07-01", "endDate": "2027-09-30", "examStart": null, "examEnd": null, "lastDayToAdd": null, "censusDate": null, "dropNoFailDate": null, "enrolOpens": "2026-12-01", "enrolOpensText": "early December (indicative)", "source": "https://www.anu.edu.au/directories/university-calendar?year=2027" },
    { "id": "2027-S2", "name": "Second Semester 2027", "kind": "semester", "year": 2027, "startDate": "2027-07-26", "endDate": "2027-10-29", "examStart": "2027-11-04", "examEnd": "2027-11-20", "lastDayToAdd": "2027-08-02", "censusDate": "2027-08-31", "dropNoFailDate": null, "enrolOpens": "2026-12-01", "enrolOpensText": "early December (indicative)", "source": "https://www.anu.edu.au/directories/university-calendar?year=2027" },
    { "id": "2027-SPR", "name": "Spring Session 2027", "kind": "intensive", "year": 2027, "startDate": "2027-10-01", "endDate": "2027-12-31", "examStart": null, "examEnd": null, "lastDayToAdd": null, "censusDate": null, "dropNoFailDate": null, "enrolOpens": "2026-12-01", "enrolOpensText": "early December (indicative)", "source": "https://www.anu.edu.au/directories/university-calendar?year=2027" }
  ]
}
```

Before committing, fetch the two calendar pages once (with the crawler's User-Agent) and check every date against them. The research recorded these values, but the calendar is this file's only source. Fix any date that differs, and note the check in the Step 8 commit message.

- [ ] **Step 2: Write the overrides and the ANUHub cross-check list**

`scripts/pc/overrides.json` (spec §8.3):

```json
{
  "times": [
    { "plan": "7722XVCOMP", "code": "COMP8800", "times": 2, "why": "P&C: \"COMP8800 Advanced Computing Research Project, which must be taken twice, in consecutive semesters (12+12 units)\"" },
    { "plan": "SOFT-MAJ", "code": "COMP3500", "times": 2, "why": "P&C lists COMP3500 as 6+6 units: taken twice" },
    { "plan": "AACRD", "code": "COMP3770", "times": 2, "why": "P&C lists COMP3770 as 6+6 units: taken twice" },
    { "plan": "AACRD", "code": "COMP4550", "times": 2, "why": "P&C lists COMP4550 as 12+12 units: taken twice" }
  ]
}
```

`scripts/pc/anuhub-s2-2026.json` holds the 28 postgraduate COMP classes seen live on 24 Sep 2026 (ANUHub notes §8e). It is structure only, not the user's enrolment.

```json
{
  "source": "ANUHub Class Search, Second Semester 2026, Postgraduate, COMP — read-only view on 2026-09-24 (docs/research/2026-09-23-anuhub-enrolment.md §8e)",
  "classes": [
    { "classNumber": 8665, "courseCode": "COMP6996" }, { "classNumber": 8693, "courseCode": "COMP6390" },
    { "classNumber": 8695, "courseCode": "COMP8620" }, { "classNumber": 8697, "courseCode": "COMP6490" },
    { "classNumber": 8699, "courseCode": "COMP8691" }, { "classNumber": 8702, "courseCode": "COMP6710" },
    { "classNumber": 8703, "courseCode": "COMP6260" }, { "classNumber": 8706, "courseCode": "COMP6730" },
    { "classNumber": 8707, "courseCode": "COMP6442" }, { "classNumber": 8708, "courseCode": "COMP6120" },
    { "classNumber": 8709, "courseCode": "COMP6310" }, { "classNumber": 8710, "courseCode": "COMP6240" },
    { "classNumber": 8711, "courseCode": "COMP6261" }, { "classNumber": 8712, "courseCode": "COMP6330" },
    { "classNumber": 8713, "courseCode": "COMP6464" }, { "classNumber": 8714, "courseCode": "COMP8430" },
    { "classNumber": 8716, "courseCode": "COMP8715" }, { "classNumber": 8718, "courseCode": "COMP6466" },
    { "classNumber": 8719, "courseCode": "COMP6670" }, { "classNumber": 8721, "courseCode": "COMP8800" },
    { "classNumber": 8722, "courseCode": "COMP8830" }, { "classNumber": 8725, "courseCode": "COMP8820" },
    { "classNumber": 9010, "courseCode": "COMP6034" }, { "classNumber": 9012, "courseCode": "COMP8011" },
    { "classNumber": 9013, "courseCode": "COMP8045" }, { "classNumber": 9055, "courseCode": "COMP7710" },
    { "classNumber": 9057, "courseCode": "COMP8020" }, { "classNumber": 9072, "courseCode": "COMP8280" }
  ]
}
```

- [ ] **Step 3: Write the failing build tests**

`scripts/pc/build.test.ts`. It runs `buildSnapshot` on the saved pages plus a two-course list, with no cache needed.

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type BuildInput, buildSnapshot, type CalendarSession, finaliseGroups } from "./build.ts";
import { pageUrl } from "./scope.ts";

const page = (kind: string, code: string): string => readFileSync(`scripts/pc/fixtures/2026/${kind}/${code}.html`, "utf8");
const calendar = (JSON.parse(readFileSync("src/data/calendar.json", "utf8")) as { sessions: CalendarSession[] }).sessions;

function input(patch: Partial<BuildInput> = {}): BuildInput {
  return {
    fetchedOn: "2026-09-24",
    courseLists: {
      2026: [{ CourseCode: "COMP8020", Name: "Advanced Topics in Human-Centred and Creative Computing", Units: 6, Career: "Postgraduate" }],
      2027: [{ CourseCode: "COMP8020", Name: "Advanced Topics in Human-Centred and Creative Computing", Units: 6, Career: "Postgraduate" }],
    },
    planPages: [],
    coursePages: [{ code: "COMP8020", url: pageUrl("course", "COMP8020"), html: page("course", "COMP8020") }],
    calendar,
    overrides: { times: [] },
    anuhub: [{ classNumber: 9057, courseCode: "COMP8020" }, { classNumber: 8665, courseCode: "COMP6996" }],
    ...patch,
  };
}

describe("buildSnapshot", () => {
  it("keeps the 2026 and 2027 classes, mapped to calendar sessions, and drops 2028", () => {
    const out = buildSnapshot(input());
    expect(out.errors).toEqual([]);
    const ids = out.classes.map((c) => `${c.sessionId}#${c.classNumber}`);
    expect(ids).toContain("2026-S2#9057");
    expect(ids).toContain("2027-S2#10060");
    expect(out.classes.every((c) => c.sessionId.startsWith("2026") || c.sessionId.startsWith("2027"))).toBe(true);
    expect(out.courses[0]).toMatchObject({ code: "COMP8020", subject: "COMP", catalogue: "8020", level: 8000, career: "PGRD", units: 6 });
  });

  it("fails on a class whose session heading it doesn't know", () => {
    const html = page("course", "COMP8020").replace(/<h3([^>]*)>\s*Second Semester\s*<\/h3>/, "<h3$1>Full Year</h3>");
    const out = buildSnapshot(input({ coursePages: [{ code: "COMP8020", url: pageUrl("course", "COMP8020"), html }] }));
    expect(out.errors.join("\n")).toMatch(/unknown session heading "Full Year"/);
  });

  it("records the ANUHub cross-check, P&C winning", () => {
    const out = buildSnapshot(input());
    expect(out.provenance).toContain("COMP6996 class 8665");
    expect(out.provenance).toMatch(/9057[^\n]*COMP8020|COMP8020[^\n]*9057/);
  });

  it("fails on an override that matches no requirement group", () => {
    const out = buildSnapshot(input({ overrides: { times: [{ plan: "7722XVCOMP", code: "COMP8800", times: 2, why: "test" }] } }));
    expect(out.errors.join("\n")).toMatch(/override 7722XVCOMP\/COMP8800 matches no requirement group/);
  });
});

describe("finaliseGroups", () => {
  it("drops courses the snapshot lacks, records them, and turns an emptied tracked group into a note", () => {
    const { groups, dead } = finaliseGroups(
      [{ label: "Compulsory", rule: "all", minUnits: null, text: "the following compulsory courses:", courses: [{ code: "COMP0000", times: 1 }] }],
      () => false,
    );
    expect(dead).toEqual(["COMP0000"]);
    expect(groups[0]).toMatchObject({ rule: "note", courses: [] });
  });
});
```

Run: `pnpm vitest run scripts/pc/build.test.ts`. Expected: FAIL, because `./build.ts` is missing.

- [ ] **Step 4: Write `scripts/pc/build.ts`**

```ts
// `pnpm data:build`: turns the crawl cache into the committed snapshot
// (spec §8.3). It is offline: it reads only .cache/pc/ and the hand-curated
// files. The data checks fail the build; everything else it notices goes
// into the provenance file, src/data/pc/README.md.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { CACHE_DIR, type CacheEntry } from "./fetch.ts";
import { type Career, careerOf, type CoursePage, type ParsedGroup, parseCoursePage, parsePlanPage, type PlanPage, requirementGroups, sessionSlug } from "./parse.ts";
import { BASE, COMP_CODE, courseListUrl, pageUrl, planCodes, planKind, PROGRAMS, RULES_YEAR, YEARS } from "./scope.ts";

const OUT_DIR = "src/data/pc";

export interface PcCourse {
  code: string;
  subject: string;
  subjectName: string;
  catalogue: string;
  level: number;
  title: string;
  career: Career;
  units: number;
  description: string;
  requisites: string | null;
  pcUrl: string;
}
export interface PcClass {
  sessionId: string;
  classNumber: number;
  courseCode: string;
  mode: string;
  startDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  endDate: string;
  topic: string | null;
}
export interface PcPlan {
  code: string;
  name: string;
  kind: "program" | "major" | "specialisation";
  career: Career;
  units: number | null;
  acronym: string | null;
  postNominal: string | null;
  pcUrl: string;
}
export interface PcProgramPlan {
  programCode: string;
  planCode: string;
  position: number;
}
export interface PcRequirements {
  planCode: string;
  rulesYear: number;
  groups: (ParsedGroup & { position: number })[];
}
export interface CalendarSession {
  id: string;
  name: string;
  kind: "semester" | "intensive";
  year: number;
  startDate: string;
  endDate: string;
  examStart: string | null;
  examEnd: string | null;
  lastDayToAdd: string | null;
  censusDate: string | null;
  dropNoFailDate: string | null;
  enrolOpens: string | null;
  enrolOpensText: string | null;
  source: string;
}
export interface Overrides {
  times: { plan: string; code: string; times: number; why: string }[];
}
interface CourseListItem {
  CourseCode: string;
  Name: string;
  Units: number | string;
  Career: string;
}
export interface Page {
  code: string;
  url: string;
  /** null when P&C had no page (404 or soft 404). */
  html: string | null;
}
export interface BuildInput {
  fetchedOn: string;
  courseLists: Record<number, CourseListItem[]>;
  planPages: Page[];
  coursePages: Page[];
  calendar: CalendarSession[];
  overrides: Overrides;
  anuhub: { classNumber: number; courseCode: string }[];
}
export interface BuildOutput {
  courses: PcCourse[];
  classes: PcClass[];
  plans: PcPlan[];
  programPlans: PcProgramPlan[];
  requirements: PcRequirements[];
  snapshot: { fetchedOn: string; source: string; years: number[]; rulesYear: number; counts: Record<string, number> };
  provenance: string;
  errors: string[];
}

export function timesFor(overrides: Overrides, planCode: string): (code: string) => number {
  const mine = overrides.times.filter((o) => o.plan === planCode);
  return (code) => mine.find((o) => o.code === code)?.times ?? 1;
}

/** Drops courses the snapshot lacks from each group, recording them. A tracked group left with no courses becomes a note. */
export function finaliseGroups(groups: ParsedGroup[], known: (code: string) => boolean): { groups: ParsedGroup[]; dead: string[] } {
  const dead: string[] = [];
  const out = groups.map((g): ParsedGroup => {
    const courses = g.courses.filter((c) => known(c.code) || (dead.push(c.code), false));
    return g.rule !== "note" && courses.length === 0 ? { ...g, label: "Note", rule: "note", minUnits: null, courses } : { ...g, courses };
  });
  return { groups: out, dead };
}

export function buildSnapshot(input: BuildInput): BuildOutput {
  const errors: string[] = [];
  const found = {
    missing: [] as string[],
    parseFailures: [] as string[],
    noClasses: [] as string[],
    outside: [] as string[],
    dead: [] as string[],
    notes: [] as string[],
    overrides: [] as string[],
    planLinks: [] as string[],
  };

  // 1. The COMP course lists: name, units and career come from here first (spec §8.3).
  const listed = new Map<string, CourseListItem>();
  const perYear: Record<number, number> = {};
  for (const year of YEARS) {
    const comp = (input.courseLists[year] ?? []).filter((i) => COMP_CODE.test(i.CourseCode));
    perYear[year] = comp.length;
    for (const item of comp) if (year === RULES_YEAR || !listed.has(item.CourseCode)) listed.set(item.CourseCode, item);
  }

  // 2. Course pages → courses and classes.
  const sessions = new Map(input.calendar.map((s) => [s.id, s]));
  const courses: PcCourse[] = [];
  const classes: PcClass[] = [];
  const seen = new Map<string, PcClass>();
  for (const page of input.coursePages) {
    if (page.html === null) {
      found.missing.push(`${page.code} — ${page.url}`);
      continue;
    }
    let parsed: CoursePage;
    try {
      parsed = parseCoursePage(page.html);
    } catch (err) {
      found.parseFailures.push(`${page.code} — ${page.url}: ${String(err)}`);
      continue;
    }
    const json = listed.get(parsed.code);
    const units = json ? Number(json.Units) : parsed.units;
    const career = (json ? careerOf(json.Career) : null) ?? parsed.career;
    if (units === null || !Number.isFinite(units)) {
      errors.push(`${parsed.code}: no unit value on ${page.url}`);
      continue;
    }
    if (!career) {
      errors.push(`${parsed.code}: no academic career on ${page.url}`);
      continue;
    }
    courses.push({
      code: parsed.code,
      subject: parsed.code.slice(0, 4),
      subjectName: parsed.subjectName ?? parsed.code.slice(0, 4),
      catalogue: parsed.code.slice(4),
      level: Number(parsed.code[4]) * 1000,
      title: json?.Name.trim() || parsed.title,
      career,
      units,
      description: parsed.description,
      requisites: parsed.requisites,
      pcUrl: page.url,
    });
    let kept = 0;
    for (const o of parsed.offerings) {
      if (!(YEARS as readonly number[]).includes(o.year)) continue;
      const slug = sessionSlug(o.sessionName);
      if (!slug) {
        errors.push(`${parsed.code}: unknown session heading "${o.sessionName}" in its ${o.year} offerings`);
        continue;
      }
      const sessionId = `${o.year}-${slug}`;
      const session = sessions.get(sessionId);
      if (!session) {
        errors.push(`${parsed.code}: class ${o.classNumber} is in ${sessionId}, which calendar.json doesn't have`);
        continue;
      }
      const cls: PcClass = { sessionId, classNumber: o.classNumber, courseCode: parsed.code, mode: o.mode, startDate: o.startDate, lastDayToEnrol: o.lastDayToEnrol, censusDate: o.censusDate, endDate: o.endDate, topic: o.topic };
      const key = `${sessionId}#${o.classNumber}`;
      const prior = seen.get(key);
      if (prior) {
        if (JSON.stringify(prior) !== JSON.stringify(cls)) errors.push(`${key} is listed for both ${prior.courseCode} and ${cls.courseCode}`);
        continue;
      }
      seen.set(key, cls);
      classes.push(cls);
      kept++;
      if (cls.startDate < session.startDate || cls.endDate > session.endDate) {
        found.outside.push(`${parsed.code} class ${cls.classNumber} (${sessionId}) runs ${cls.startDate} to ${cls.endDate}; the session runs ${session.startDate} to ${session.endDate}`);
      }
    }
    if (kept === 0) found.noClasses.push(parsed.code);
  }
  const unitsByCode = new Map(courses.map((c) => [c.code, c.units]));
  const known = (code: string): boolean => unitsByCode.has(code);

  // 3. Plan pages → plans and requirements.
  const programsOf = new Map<string, string[]>();
  for (const p of PROGRAMS) for (const plan of p.plans) programsOf.set(plan, [...(programsOf.get(plan) ?? []), p.code]);
  const careerOfScope = (code: string): Career =>
    PROGRAMS.find((p) => p.code === code)?.career ?? PROGRAMS.find((p) => p.code === programsOf.get(code)?.[0])?.career ?? "UGRD";
  const pages = new Map<string, PlanPage>();
  const plans: PcPlan[] = [];
  const requirements: PcRequirements[] = [];
  for (const page of input.planPages) {
    if (page.html === null) {
      errors.push(`${page.code}: P&C has no page at ${page.url}`);
      continue;
    }
    const parsed = parsePlanPage(page.html);
    if (parsed.code !== page.code) errors.push(`${page.url} is ${parsed.code}, not ${page.code}`);
    pages.set(page.code, parsed);
    plans.push({ code: page.code, name: parsed.name, kind: planKind(page.code), career: parsed.career ?? careerOfScope(page.code), units: parsed.units, acronym: parsed.acronym, postNominal: parsed.postNominal, pcUrl: page.url });
    const raw = requirementGroups(parsed.requirements, (c) => unitsByCode.get(c), timesFor(input.overrides, page.code));
    const { groups, dead } = finaliseGroups(raw, known);
    for (const code of dead) found.dead.push(`${page.code} links ${code}, which has no P&C course page in the snapshot`);
    for (const g of groups) if (g.rule === "note") found.notes.push(`${page.code}: “${g.text.split("\n")[0]}”${g.text.includes("\n") ? " …" : ""}`);
    requirements.push({ planCode: page.code, rulesYear: RULES_YEAR, groups: groups.map((g, i) => ({ position: i + 1, ...g })) });
  }
  const programPlans: PcProgramPlan[] = PROGRAMS.flatMap((p) => p.plans.map((planCode, i) => ({ programCode: p.code, planCode, position: i + 1 })));
  for (const { programCode, planCode } of programPlans) {
    const byProgram = pages.get(programCode)?.childPlans.includes(planCode) ?? false;
    const byPlan = pages.get(planCode)?.relevantDegrees.includes(programCode) ?? false;
    if (!byProgram || !byPlan) found.planLinks.push(`${programCode} ↔ ${planCode}: the program page ${byProgram ? "links" : "doesn't link"} the plan; the plan page ${byPlan ? "lists" : "doesn't list"} the program under Relevant Degrees`);
  }
  for (const o of input.overrides.times) {
    const hit = requirements.find((r) => r.planCode === o.plan)?.groups.some((g) => g.courses.some((c) => c.code === o.code));
    if (hit) found.overrides.push(`${o.plan}: ${o.code} × ${o.times} — ${o.why}`);
    else errors.push(`override ${o.plan}/${o.code} matches no requirement group`);
  }

  // 4. Data checks (spec §8.3). Session existence and uniqueness were checked above.
  for (const r of requirements) for (const g of r.groups) for (const c of g.courses) if (!known(c.code)) errors.push(`${r.planCode} requires ${c.code}, which isn't in courses`);

  // 5. The ANUHub cross-check: P&C wins, and every difference is listed.
  const careerByCode = new Map(courses.map((c) => [c.code, c.career]));
  const snap = new Map(classes.filter((c) => c.sessionId === "2026-S2" && c.courseCode.startsWith("COMP") && careerByCode.get(c.courseCode) === "PGRD").map((c) => [c.classNumber, c.courseCode]));
  const live = new Map(input.anuhub.map((c) => [c.classNumber, c.courseCode]));
  const cross: string[] = [];
  let agree = 0;
  for (const [n, code] of live) {
    const ours = snap.get(n);
    if (ours === code) agree++;
    else if (ours) cross.push(`class ${n} is ${code} in ANUHub but ${ours} in P&C`);
    else cross.push(`ANUHub lists ${code} class ${n}; P&C doesn't${known(code) ? ` (P&C has ${code}, but not this class in Second Semester 2026)` : ` (${code} isn't a P&C course)`}`);
  }
  for (const [n, code] of snap) if (!live.has(n)) cross.push(`P&C lists ${code} class ${n}; ANUHub's live list didn't show it`);

  courses.sort((a, b) => (a.code < b.code ? -1 : 1));
  classes.sort((a, b) => (a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : a.classNumber - b.classNumber));
  requirements.sort((a, b) => (a.planCode < b.planCode ? -1 : 1));
  const counts = { courses: courses.length, classes: classes.length, plans: plans.length, requirementGroups: requirements.reduce((n, r) => n + r.groups.length, 0) };
  const classesPerYear = Object.fromEntries(YEARS.map((y) => [y, classes.filter((c) => c.sessionId.startsWith(String(y))).length]));

  const list = (items: string[]): string => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- none");
  const provenance = `# P&C snapshot — provenance

Fetched on **${input.fetchedOn}** from Programs & Courses (${BASE}) by
\`pnpm data:fetch\` (\`scripts/pc/fetch.ts\`), then normalised offline by
\`pnpm data:build\` (\`scripts/pc/build.ts\`). The app seeds from these files
at boot. Nothing in them is invented: every value is P&C's, and the few
facts its prose can't carry are overrides, listed below.

## Files

| File | Holds | Source |
|---|---|---|
| \`courses.json\` | ${counts.courses} courses | \`${BASE}/<year>/course/<code>\`: title, units, career, subject, description (the introduction) and requisites. For COMP courses, name, units and career come first from the course-list JSON (\`/data/CourseSearch/GetCourses?SearchText=COMP&SelectedYear=<year>…\`). |
| \`classes.json\` | ${counts.classes} classes | The "Offerings, Dates and Class Summary Links" table on each course page. Only the ${YEARS.join(" and ")} tabs are kept. Session names map to \`src/data/calendar.json\`. |
| \`plans.json\` | ${counts.plans} plans | \`${BASE}/${RULES_YEAR}/program|major|specialisation/<code>\`: name, acronym, post-nominal and units. Program-to-plan links come from the crawl's scope (\`scripts/pc/scope.ts\`). |
| \`requirements.json\` | ${counts.requirementGroups} groups | The requirements section of each plan page, parsed by R1 (\`scripts/pc/parse.ts\`). Every group keeps P&C's sentence verbatim. |

## Counts per year

| Year | COMP courses in P&C's course list | Classes in the snapshot |
|---|---|---|
${YEARS.map((y) => `| ${y} | ${perYear[y]} | ${classesPerYear[y]} |`).join("\n")}

## Overrides applied (\`scripts/pc/overrides.json\`)

${list(found.overrides)}

## Requirement text kept as untracked notes

R1 tracks only course lists (spec D7). These paragraphs are shown verbatim
under "Other rules, not tracked":

${list(found.notes)}

## Missing pages and dead links

${list([...found.missing.map((m) => `no page: ${m}`), ...found.dead, ...found.parseFailures.map((p) => `didn't parse: ${p}`)])}

## Courses with no classes listed for ${YEARS.join("–")}

These show "No classes listed in P&C for 2026–2027" in the sidebar (spec §13):
${found.noClasses.length ? found.noClasses.join(", ") : "none"}.

## Classes outside their session's dates

Flagged only, since intensive classes vary (spec §8.3):

${list(found.outside)}

## Program ↔ plan links

${list(found.planLinks)}

## ANUHub cross-check (Second Semester 2026, postgraduate COMP)

The snapshot is compared with the ${input.anuhub.length} classes seen live
in ANUHub on 24 Sep 2026 (\`scripts/pc/anuhub-s2-2026.json\`). ${agree}
agree. P&C wins every difference:

${list(cross)}
`;

  return {
    courses,
    classes,
    plans,
    programPlans,
    requirements,
    snapshot: { fetchedOn: input.fetchedOn, source: BASE, years: [...YEARS], rulesYear: RULES_YEAR, counts },
    provenance,
    errors,
  };
}

function main(): void {
  const index = JSON.parse(readFileSync(`${CACHE_DIR}/index.json`, "utf8")) as { fetchedOn: string; entries: CacheEntry[] };
  const byUrl = new Map(index.entries.map((e) => [e.url, e]));
  const body = (url: string): string | null => {
    const e = byUrl.get(url);
    return !e || e.missing ? null : readFileSync(e.file, "utf8");
  };
  const courseLists = Object.fromEntries(
    YEARS.map((y) => [y, (JSON.parse(body(courseListUrl(y)) ?? '{"Items":[]}') as { Items: CourseListItem[] }).Items]),
  );
  const planPages = [...PROGRAMS.map((p) => p.code), ...planCodes()].map((code) => {
    const url = pageUrl(planKind(code), code);
    return { code, url, html: body(url) };
  });
  const byCourse = new Map<string, Page>();
  for (const e of index.entries) {
    const m = e.url.match(/\/course\/([A-Z]{4}\d{4})$/);
    if (!m) continue;
    const prior = byCourse.get(m[1]);
    if (!prior || prior.html === null) byCourse.set(m[1], { code: m[1], url: e.url, html: e.missing ? null : readFileSync(e.file, "utf8") });
  }
  const calendar = (JSON.parse(readFileSync("src/data/calendar.json", "utf8")) as { sessions: CalendarSession[] }).sessions;
  const overrides = JSON.parse(readFileSync("scripts/pc/overrides.json", "utf8")) as Overrides;
  const anuhub = (JSON.parse(readFileSync("scripts/pc/anuhub-s2-2026.json", "utf8")) as { classes: BuildInput["anuhub"] }).classes;

  const out = buildSnapshot({ fetchedOn: index.fetchedOn, courseLists, planPages, coursePages: [...byCourse.values()], calendar, overrides, anuhub });
  if (out.errors.length > 0) {
    for (const e of out.errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, data: unknown): void => writeFileSync(`${OUT_DIR}/${name}`, `${JSON.stringify(data, null, 2)}\n`);
  write("courses.json", out.courses);
  write("classes.json", out.classes);
  write("plans.json", { plans: out.plans, programPlans: out.programPlans });
  write("requirements.json", out.requirements);
  write("snapshot.json", out.snapshot);
  writeFileSync(`${OUT_DIR}/README.md`, out.provenance);
  console.log(`✓ snapshot: ${JSON.stringify(out.snapshot.counts)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

Add to `package.json` `scripts`: `"data:build": "node scripts/pc/build.ts"`.

- [ ] **Step 5: Run the build tests and see them pass**

Run: `pnpm vitest run scripts/pc/build.test.ts`

Expected: PASS.

- [ ] **Step 6: Build the snapshot and read its provenance**

Run: `pnpm data:build`

Expected: `✓ snapshot: {"courses":~180,"classes":…,"plans":20,…}`.

If it fails:

- **Unknown session heading.** Extend `sessionSlug` (with a test in `parse.test.ts`).
- **A class listed for two courses.** Read both pages. If P&C really lists one class number under two co-taught courses, key the duplicate by course and record it in the provenance file; never drop data silently.
- **A stale override.** Fix `overrides.json`.

Then read `src/data/pc/README.md` top to bottom and check three things:

1. The VCOMP and ARTIF groups in `requirements.json` match `parse.test.ts`.
2. COMP6250 and COMP8260 are listed with no classes.
3. The cross-check names COMP6996 / 8665.

- [ ] **Step 7: Write the golden test (spec §8.3)**

`scripts/pc/golden.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { finaliseGroups, type Overrides, type PcCourse, type PcRequirements, timesFor } from "./build.ts";
import { type ParsedGroup, parsePlanPage, requirementGroups } from "./parse.ts";
import { planKind } from "./scope.ts";

// Pins the parsed shape of every plan page: each group's rule, minUnits and
// courses. A parser change or a P&C wording change shows up here as a diff.
const json = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const units = new Map(json<PcCourse[]>("src/data/pc/courses.json").map((c) => [c.code, c.units]));
const committed = json<PcRequirements[]>("src/data/pc/requirements.json");
const overrides = json<Overrides>("scripts/pc/overrides.json");
const shape = (groups: ParsedGroup[]) =>
  groups.map((g) => ({ rule: g.rule, minUnits: g.minUnits, courses: g.courses.map((c) => `${c.code}×${c.times}`) }));

describe("requirements golden test: the parsed shape of every plan page", () => {
  it("covers the 20 program and plan pages", () => {
    expect(committed).toHaveLength(20);
  });

  for (const plan of committed) {
    it(plan.planCode, () => {
      const html = readFileSync(`scripts/pc/fixtures/2026/${planKind(plan.planCode)}/${plan.planCode}.html`, "utf8");
      const parsed = requirementGroups(parsePlanPage(html).requirements, (c) => units.get(c), timesFor(overrides, plan.planCode));
      expect(shape(finaliseGroups(parsed, (c) => units.has(c)).groups)).toEqual(shape(plan.groups));
    });
  }

  it("tracks 66 units for 7722XVCOMP with ARTIF-SPEC (spec §5.3)", () => {
    const groups = ["7722XVCOMP", "ARTIF-SPEC"].flatMap((code) => committed.find((r) => r.planCode === code)?.groups ?? []);
    const total = groups.reduce((sum, g) => {
      if (g.rule === "all") return sum + g.courses.reduce((s, c) => s + (units.get(c.code) ?? 0) * c.times, 0);
      if (g.rule === "units") return sum + (g.minUnits ?? 0);
      return sum;
    }, 0);
    expect(total).toBe(66);
  });
});
```

Run: `pnpm vitest run scripts/pc/golden.test.ts`

Expected: PASS, 22 tests.

- [ ] **Step 8: Commit the snapshot**

```bash
git add src/data/calendar.json src/data/pc/ scripts/pc/build.ts scripts/pc/build.test.ts scripts/pc/golden.test.ts scripts/pc/overrides.json scripts/pc/anuhub-s2-2026.json package.json
git commit -m "feat(data): P&C snapshot (courses, classes, plans, requirements) with provenance, calendar, golden test" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 5: P1 — schema, migrations, seeder and the template student

**Files:**
- Modify: `src/lib/schema.ts` (replace), `src/lib/db.ts`, `src/pages/api/events.ts`, `src/pages/readme.astro`, `src/pages/index.astro` (an interim page until Task 9)
- Create: `drizzle/0001_*.sql` and `drizzle/0002_*.sql` (generated), `src/data/seed.ts`, `src/data/seed.test.ts`, `src/data/templates/7722XVCOMP.json`, `src/data/templates/index.ts`, `src/data/templates/README.md`
- Delete: `src/pages/api/messages.ts`, `src/lib/events.ts`, `spec/guestbook.test.ts`

**Interfaces:**
- Consumes: the Task 4 JSON (`PcCourse`, `PcClass`, `PcPlan`, `PcProgramPlan`, `PcRequirements`, `CalendarSession`).
- Produces:
  - `schema.ts` exports the tables:
    - `sessions`, `subjects`, `courses`, `classes`, `plans`, `programPlans`
    - `requirementGroups`, `requirementCourses`
    - `students`, `studentPlans`, `enrolments`
  - and the row types `SessionRow`, `CourseRow`, `ClassRow`, `PlanRow`, `StudentRow`, `EnrolmentRow`.
  - `seed.ts` exports `seed(db, data?)`, `BUNDLED: SeedData` and the type `SeedData`.
  - `templates/index.ts` exports `TEMPLATES: Template[]`, `DEFAULT_PROGRAM = "7722XVCOMP"`, and the types `Template`, `TemplateEnrolment`.
  - `db.ts` exports `db`; it migrates and seeds at import.

- [ ] **Step 1: Generate the drop of the guestbook table on its own**

Why a separate step: `drizzle-kit generate` asks interactively about renames when one diff both drops and creates tables, and it can't answer in a non-TTY shell. So the drop goes first.

Replace `src/lib/schema.ts` with its header comment only:

```ts
// The app's tables (spec §5.1). Reference data is seeded at boot from the
// committed P&C snapshot (src/data/seed.ts); student data is written at
// runtime. Change this file, run `pnpm db:generate`, commit the migration.
export {};
```

Run: `pnpm db:generate --name drop_guestbook`

Expected: `drizzle/0001_drop_guestbook.sql` containing `DROP TABLE \`messages\`;`.

- [ ] **Step 2: Write the schema and generate its migration**

`src/lib/schema.ts`:

```ts
import { sql } from "drizzle-orm";
import { foreignKey, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The app's tables (spec §5.1). Reference data is seeded at boot from the
// committed P&C snapshot (src/data/seed.ts); student data is written at
// runtime. Change this file, run `pnpm db:generate`, commit the migration.

const CAREERS = ["UGRD", "PGRD", "RSCH"] as const;

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["semester", "intensive"] }).notNull(),
  year: integer("year").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  examStart: text("exam_start"),
  examEnd: text("exam_end"),
  lastDayToAdd: text("last_day_to_add"),
  censusDate: text("census_date"),
  dropNoFailDate: text("drop_no_fail_date"),
  /** Indicative, shown only (spec D4). */
  enrolOpens: text("enrol_opens"),
  enrolOpensText: text("enrol_opens_text"),
});

export const subjects = sqliteTable("subjects", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});

export const courses = sqliteTable("courses", {
  code: text("code").primaryKey(),
  subject: text("subject").notNull().references(() => subjects.code),
  catalogue: text("catalogue").notNull(),
  level: integer("level").notNull(),
  title: text("title").notNull(),
  career: text("career", { enum: CAREERS }).notNull(),
  units: real("units").notNull(),
  description: text("description").notNull(),
  requisites: text("requisites"),
  maxTakes: integer("max_takes").notNull().default(1),
  pcUrl: text("pc_url").notNull(),
});

export const classes = sqliteTable(
  "classes",
  {
    sessionId: text("session_id").notNull().references(() => sessions.id),
    classNumber: integer("class_number").notNull(),
    courseCode: text("course_code").notNull().references(() => courses.code),
    mode: text("mode").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    lastDayToEnrol: text("last_day_to_enrol").notNull(),
    censusDate: text("census_date").notNull(),
    topic: text("topic"),
  },
  // Class numbers are unique only within a session (spec §5.1).
  (t) => [primaryKey({ columns: [t.sessionId, t.classNumber] }), index("classes_course_idx").on(t.courseCode)],
);

export const plans = sqliteTable("plans", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["program", "major", "specialisation"] }).notNull(),
  career: text("career", { enum: CAREERS }).notNull(),
  units: real("units"),
  acronym: text("acronym"),
  /** P&C's "Post Nominal", e.g. MCompAdv (plan clarification 3). */
  postNominal: text("post_nominal"),
  pcUrl: text("pc_url").notNull(),
});

export const programPlans = sqliteTable(
  "program_plans",
  {
    programCode: text("program_code").notNull().references(() => plans.code),
    planCode: text("plan_code").notNull().references(() => plans.code),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.programCode, t.planCode] })],
);

export const requirementGroups = sqliteTable(
  "requirement_groups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    planCode: text("plan_code").notNull().references(() => plans.code),
    rulesYear: integer("rules_year").notNull(),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    rule: text("rule", { enum: ["all", "units", "note"] }).notNull(),
    minUnits: real("min_units"),
    /** P&C's sentence, verbatim, always kept. */
    text: text("text").notNull(),
  },
  (t) => [uniqueIndex("requirement_groups_plan_uq").on(t.planCode, t.rulesYear, t.position)],
);

export const requirementCourses = sqliteTable(
  "requirement_courses",
  {
    groupId: integer("group_id").notNull().references(() => requirementGroups.id, { onDelete: "cascade" }),
    courseCode: text("course_code").notNull().references(() => courses.code),
    times: integer("times").notNull().default(1),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.courseCode] })],
);

export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** The sandbox's cookie token; null for a template student (spec §5.2). */
  token: text("token").unique(),
  name: text("name").notNull(),
  uid: text("uid").notNull(),
  programCode: text("program_code").notNull().references(() => plans.code),
  rulesYear: integer("rules_year").notNull(),
  commencedSessionId: text("commenced_session_id").notNull().references(() => sessions.id),
  createdAt: text("created_at").notNull(),
});

export const studentPlans = sqliteTable(
  "student_plans",
  {
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    planCode: text("plan_code").notNull().references(() => plans.code),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.planCode] })],
);

export const enrolments = sqliteTable(
  "enrolments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    classNumber: integer("class_number").notNull(),
    status: text("status", { enum: ["enrolled", "dropped"] }).notNull(),
    grade: text("grade"),
    enrolledOn: text("enrolled_on").notNull(),
    droppedOn: text("dropped_on"),
  },
  (t) => [
    foreignKey({ columns: [t.sessionId, t.classNumber], foreignColumns: [classes.sessionId, classes.classNumber] }),
    // One live enrolment per class per student; dropped rows stay as history.
    uniqueIndex("enrolments_live_uq").on(t.studentId, t.sessionId, t.classNumber).where(sql`status = 'enrolled'`),
    index("enrolments_student_idx").on(t.studentId),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;
export type CourseRow = typeof courses.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type PlanRow = typeof plans.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type EnrolmentRow = typeof enrolments.$inferSelect;
```

Run: `pnpm db:generate --name enrolment_schema`

Expected: `drizzle/0002_enrolment_schema.sql` with eleven `CREATE TABLE`s and the partial unique index `... WHERE status = 'enrolled'`. Read the SQL once.

- [ ] **Step 3: Pick and write the template student (spec §8.5)**

Look up the named classes in the snapshot, then pick the fourth First Semester 2026 course.

```bash
node -e '
const c = require("./src/data/pc/classes.json"), k = require("./src/data/pc/courses.json");
const r = require("./src/data/pc/requirements.json");
const req = new Set(r.filter(x => ["7722XVCOMP","ARTIF-SPEC"].includes(x.planCode)).flatMap(x => x.groups.flatMap(g => g.courses.map(y => y.code))));
for (const code of ["COMP6262","COMP6320","COMP6445"]) console.log("S1-2026", code, c.filter(x => x.courseCode===code && x.sessionId==="2026-S1").map(x => x.classNumber+" "+x.mode));
for (const [code,n] of [["COMP6442",8707],["COMP8620",8695],["COMP8691",8699],["COMP8020",9057]]) console.log("S2-2026", code, n, c.some(x => x.courseCode===code && x.sessionId==="2026-S2" && x.classNumber===n));
const fourth = k.filter(x => /^COMP6\d{3}$/.test(x.code) && x.units===6 && x.career==="PGRD" && !req.has(x.code) && x.code!=="COMP6442")
  .filter(x => c.filter(y => y.courseCode===x.code && y.sessionId==="2026-S1").length===1)[0];
console.log("fourth", fourth && fourth.code, c.find(y => y.courseCode===fourth.code && y.sessionId==="2026-S1").classNumber);
console.log("COMP8800 in 2027-S1", c.filter(x => x.courseCode==="COMP8800" && x.sessionId==="2027-S1").map(x => x.classNumber));
'
```

Expected:

- COMP6262, COMP6320 and COMP6445 each have exactly one First Semester 2026 class.
- The four Second Semester 2026 classes all print `true`.
- A fourth course is printed.
- COMP8800 has exactly one First Semester 2027 class.

If any named class isn't in the snapshot, swap in a real offering with the same role (a completed requirement course, or an enrolled one) and record the swap in `src/data/templates/README.md` (spec §8.5).

`src/data/templates/7722XVCOMP.json`. Put the printed class numbers where the placeholders say `<…>`; the file must contain only real numbers.

```json
{
  "uid": "u7000001",
  "name": "Demo Student",
  "programCode": "7722XVCOMP",
  "plans": ["ARTIF-SPEC"],
  "rulesYear": 2026,
  "commencedSessionId": "2026-S1",
  "enrolments": [
    { "sessionId": "2026-S1", "classNumber": <COMP6262 S1 2026 class>, "courseCode": "COMP6262", "grade": "D", "enrolledOn": "2026-02-09" },
    { "sessionId": "2026-S1", "classNumber": <COMP6320 S1 2026 class>, "courseCode": "COMP6320", "grade": "HD", "enrolledOn": "2026-02-09" },
    { "sessionId": "2026-S1", "classNumber": <COMP6445 S1 2026 class>, "courseCode": "COMP6445", "grade": "D", "enrolledOn": "2026-02-09" },
    { "sessionId": "2026-S1", "classNumber": <fourth course's class>, "courseCode": "<fourth course>", "grade": "CR", "enrolledOn": "2026-02-09" },
    { "sessionId": "2026-S2", "classNumber": 8707, "courseCode": "COMP6442", "grade": null, "enrolledOn": "2026-07-13" },
    { "sessionId": "2026-S2", "classNumber": 8695, "courseCode": "COMP8620", "grade": null, "enrolledOn": "2026-07-13" },
    { "sessionId": "2026-S2", "classNumber": 8699, "courseCode": "COMP8691", "grade": null, "enrolledOn": "2026-07-13" },
    { "sessionId": "2026-S2", "classNumber": 9057, "courseCode": "COMP8020", "grade": null, "enrolledOn": "2026-07-13" }
  ]
}
```

`src/data/templates/index.ts`:

```ts
import vcomp from "./7722XVCOMP.json";

// Template students: the only invented data (spec §8.5). One per program,
// keyed by programCode; a sandbox is a clone of one (spec §5.2). Provenance
// and the picking rules are in ./README.md.

export interface TemplateEnrolment {
  sessionId: string;
  classNumber: number;
  courseCode: string;
  grade: string | null;
  enrolledOn: string;
}

export interface Template {
  uid: string;
  name: string;
  programCode: string;
  plans: string[];
  rulesYear: number;
  commencedSessionId: string;
  enrolments: TemplateEnrolment[];
}

export const TEMPLATES: Template[] = [vcomp];
export const DEFAULT_PROGRAM = "7722XVCOMP";
```

`src/data/templates/README.md` covers:

- who each template is;
- that every class is a real P&C offering (with the snapshot's date);
- that the grades are invented;
- how the fourth course was picked (the rule above);
- any swaps.

- [ ] **Step 4: Write the failing seeder tests**

`src/data/seed.test.ts`:

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import { BUNDLED, seed } from "./seed";

function fresh() {
  const client = new Database(":memory:");
  client.pragma("foreign_keys = ON");
  const db = drizzle(client);
  migrate(db, { migrationsFolder: "./drizzle" });
  return { client, db };
}
const count = (client: Database.Database, table: string): number =>
  (client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;

describe("seed (spec §8.5)", () => {
  it("loads the snapshot, the calendar and the template student", () => {
    const { client, db } = fresh();
    seed(db);
    expect(count(client, "sessions")).toBe(12);
    expect(count(client, "courses")).toBe(BUNDLED.courses.length);
    expect(count(client, "classes")).toBe(BUNDLED.classes.length);
    expect(count(client, "plans")).toBe(20);
    expect(count(client, "program_plans")).toBe(25);
    expect(count(client, "students")).toBe(1);
    expect(count(client, "enrolments")).toBe(8);
    expect(client.prepare("select max_takes from courses where code = 'COMP8800'").get()).toEqual({ max_takes: 2 });
    expect(client.prepare("pragma foreign_key_check").all()).toEqual([]);
  });

  it("is idempotent: a second boot changes nothing", () => {
    const { client, db } = fresh();
    seed(db);
    seed(db);
    expect(count(client, "classes")).toBe(BUNDLED.classes.length);
    expect(count(client, "students")).toBe(1);
    expect(count(client, "enrolments")).toBe(8);
    expect(count(client, "requirement_groups")).toBe(BUNDLED.requirements.reduce((n, r) => n + r.groups.length, 0));
  });

  it("never touches a sandbox's rows on a re-seed", () => {
    const { client, db } = fresh();
    seed(db);
    const cls = BUNDLED.classes.find((c) => c.sessionId === "2027-S1")!;
    client.prepare("insert into students (token, name, uid, program_code, rules_year, commenced_session_id, created_at) values ('t'||hex(randomblob(16)), 'X', 'u1', '7722XVCOMP', 2026, '2026-S1', '2026-09-24')").run();
    const sid = (client.prepare("select id from students where token is not null").get() as { id: number }).id;
    client.prepare("insert into enrolments (student_id, session_id, class_number, status, enrolled_on) values (?, ?, ?, 'enrolled', '2026-09-24')").run(sid, cls.sessionId, cls.classNumber);
    seed(db);
    expect(count(client, "enrolments")).toBe(9);
  });

  it("refuses a class whose session has no calendar row", () => {
    const { db } = fresh();
    const stray = { ...BUNDLED.classes[0], sessionId: "2025-S1" };
    expect(() => seed(db, { ...BUNDLED, classes: [...BUNDLED.classes, stray] })).toThrow(/calendar/);
  });

  it("refuses a template class that isn't the course the template names", () => {
    const { db } = fresh();
    const [tpl] = BUNDLED.templates;
    const wrong = { ...tpl, enrolments: [{ ...tpl.enrolments[0], courseCode: "COMP1100" }] };
    expect(() => seed(db, { ...BUNDLED, templates: [wrong] })).toThrow(/template u7000001/);
  });
});
```

Run: `pnpm build && pnpm vitest run src/data/seed.test.ts`. Expected: FAIL, because `./seed` is missing.

- [ ] **Step 5: Write `src/data/seed.ts`**

```ts
import { and, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { CalendarSession, PcClass, PcCourse, PcPlan, PcProgramPlan, PcRequirements } from "../../scripts/pc/build.ts";
import * as t from "../lib/schema";
import calendar from "./calendar.json";
import classesFile from "./pc/classes.json";
import coursesFile from "./pc/courses.json";
import plansFile from "./pc/plans.json";
import requirementsFile from "./pc/requirements.json";
import { type Template, TEMPLATES } from "./templates";

// Boot-time seeding (spec §8.5). The JSON is imported, so Vite bundles it
// into dist/ and the Docker image carries it. Rows that enrolments point at
// (sessions, subjects, courses, classes, plans) are upserted by natural key
// and never deleted, so a refreshed snapshot never orphans a sandbox. Rows
// nothing else points at — requirements, and the template students' plans
// and history — are rewritten (plan clarification 8).

export interface SeedData {
  sessions: CalendarSession[];
  courses: PcCourse[];
  classes: PcClass[];
  plans: PcPlan[];
  programPlans: PcProgramPlan[];
  requirements: PcRequirements[];
  templates: Template[];
}

export const BUNDLED: SeedData = {
  sessions: calendar.sessions as CalendarSession[],
  courses: coursesFile as PcCourse[],
  classes: classesFile as PcClass[],
  plans: plansFile.plans as PcPlan[],
  programPlans: plansFile.programPlans as PcProgramPlan[],
  requirements: requirementsFile as PcRequirements[],
  templates: TEMPLATES,
};

type Db = BetterSQLite3Database;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** INSERT … ON CONFLICT (target) DO UPDATE SET every other column, 100 rows at a time. */
function upsert<T extends SQLiteTable>(tx: Tx, table: T, rows: T["$inferInsert"][], target: SQLiteColumn[]): void {
  if (rows.length === 0) return;
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  const keys = new Set(target.map((c) => c.name));
  const set = Object.fromEntries(
    Object.keys(rows[0])
      .filter((k) => !keys.has(columns[k].name))
      .map((k) => [k, sql.raw(`excluded."${columns[k].name}"`)]),
  );
  for (let i = 0; i < rows.length; i += 100) {
    tx.insert(table).values(rows.slice(i, i + 100)).onConflictDoUpdate({ target, set }).run();
  }
}

export function seed(db: Db, data: SeedData = BUNDLED): void {
  const sessionIds = new Set(data.sessions.map((s) => s.id));
  for (const c of data.classes) {
    if (!sessionIds.has(c.sessionId)) throw new Error(`seed: class ${c.classNumber} (${c.courseCode}) is in ${c.sessionId}, which the calendar doesn't have`);
  }
  const classCourse = new Map(data.classes.map((c) => [`${c.sessionId}#${c.classNumber}`, c.courseCode]));
  for (const tpl of data.templates) {
    for (const e of tpl.enrolments) {
      const actual = classCourse.get(`${e.sessionId}#${e.classNumber}`);
      if (actual !== e.courseCode) throw new Error(`seed: template ${tpl.uid} names ${e.courseCode} class ${e.classNumber} in ${e.sessionId}, but the snapshot has ${actual ?? "no such class"}`);
    }
  }
  const maxTakes = new Map<string, number>();
  for (const r of data.requirements) for (const g of r.groups) for (const c of g.courses) maxTakes.set(c.code, Math.max(maxTakes.get(c.code) ?? 1, c.times));

  db.transaction((tx) => {
    upsert(tx, t.sessions, data.sessions.map(({ source: _source, ...s }) => s), [t.sessions.id]);
    const subjects = new Map(data.courses.map((c) => [c.subject, c.subjectName]));
    upsert(tx, t.subjects, [...subjects].map(([code, name]) => ({ code, name })), [t.subjects.code]);
    upsert(tx, t.courses, data.courses.map(({ subjectName: _name, ...c }) => ({ ...c, maxTakes: maxTakes.get(c.code) ?? 1 })), [t.courses.code]);
    upsert(tx, t.classes, data.classes, [t.classes.sessionId, t.classes.classNumber]);
    upsert(tx, t.plans, data.plans, [t.plans.code]);
    upsert(tx, t.programPlans, data.programPlans, [t.programPlans.programCode, t.programPlans.planCode]);

    tx.delete(t.requirementCourses).run();
    tx.delete(t.requirementGroups).run();
    for (const r of data.requirements) {
      for (const g of r.groups) {
        const { id } = tx
          .insert(t.requirementGroups)
          .values({ planCode: r.planCode, rulesYear: r.rulesYear, position: g.position, label: g.label, rule: g.rule, minUnits: g.minUnits, text: g.text })
          .returning({ id: t.requirementGroups.id })
          .get();
        if (g.courses.length > 0) {
          tx.insert(t.requirementCourses).values(g.courses.map((c, i) => ({ groupId: id, courseCode: c.code, times: c.times, position: i + 1 }))).run();
        }
      }
    }

    for (const tpl of data.templates) {
      const row = { name: tpl.name, uid: tpl.uid, programCode: tpl.programCode, rulesYear: tpl.rulesYear, commencedSessionId: tpl.commencedSessionId };
      const existing = tx.select({ id: t.students.id }).from(t.students).where(and(isNull(t.students.token), eq(t.students.uid, tpl.uid))).get();
      let id: number;
      if (existing) {
        tx.update(t.students).set(row).where(eq(t.students.id, existing.id)).run();
        id = existing.id;
      } else {
        id = tx.insert(t.students).values({ ...row, token: null, createdAt: new Date().toISOString() }).returning({ id: t.students.id }).get().id;
      }
      tx.delete(t.studentPlans).where(eq(t.studentPlans.studentId, id)).run();
      tx.delete(t.enrolments).where(eq(t.enrolments.studentId, id)).run();
      tx.insert(t.studentPlans).values(tpl.plans.map((planCode) => ({ studentId: id, planCode }))).run();
      tx.insert(t.enrolments)
        .values(tpl.enrolments.map((e) => ({ studentId: id, sessionId: e.sessionId, classNumber: e.classNumber, status: "enrolled" as const, grade: e.grade, enrolledOn: e.enrolledOn, droppedOn: null })))
        .run();
    }
  });
}
```

If TypeScript rejects the generic `tx.insert(table)` inside `upsert`, don't reach for `any`. Drop the generic helper and write the six upserts inline, each with the same `excluded."column"` `set` construction. The behaviour is identical.

- [ ] **Step 6: Run the seeder tests and see them pass**

Run: `pnpm vitest run src/data/seed.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 7: Boot the app on the new schema, and retire the guestbook**

`src/lib/db.ts`:

```ts
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { seed } from "../data/seed";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");
client.pragma("foreign_keys = ON");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// Reference data (the P&C snapshot, the calendar, the template students) is
// upserted on every boot, so a redeploy with a refreshed snapshot needs no
// separate step (spec §8.5).
seed(db);
```

`src/pages/api/events.ts`: keep the stream and its heartbeat, and drop the bus.

```ts
import type { APIRoute } from "astro";

// The minimal server-sent-events (SSE) pattern: a long-lived streaming
// response the browser consumes with `new EventSource("/api/events")`.
// Nothing pushes on it now that the guestbook is gone, but the deploy CI
// checks it streams, so it keeps its opening comment and heartbeat.
export const GET: APIRoute = () => {
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<string>({
    start(controller) {
      // an opening comment so the client (and the post-deploy CI probe) sees
      // bytes immediately, and a periodic one so proxies don't drop the
      // connection as idle
      controller.enqueue(": connected\n\n");
      heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 30_000);
    },
    cancel() {
      clearInterval(heartbeat);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
};
```

In `src/pages/readme.astro`, change the nav to `<nav aria-label="Site"><a href="/">Enrolment</a> <a href="/readme/">About</a></nav>`.

`src/pages/index.astro` is an interim page that proves the seeded data is wired. Task 9 replaces it.

```astro
---
import { asc } from "drizzle-orm";
import { db } from "../lib/db";
import { sessions } from "../lib/schema";
import "../styles.css";

const rows = db.select().from(sessions).orderBy(asc(sessions.startDate)).all();
---

<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Enrolment · ANU enrolment redesign (prototype)</title>
  </head>
  <body>
    <nav aria-label="Site"><a href="/">Enrolment</a> <a href="/readme/">About</a></nav>
    <main>
      <h1>Enrolment</h1>
      <p>The enrolment page is being rebuilt. The sessions it will cover:</p>
      <ul>{rows.map((s) => <li>{s.name}: {s.startDate} to {s.endDate}</li>)}</ul>
    </main>
  </body>
</html>
```

Delete the guestbook:

```bash
git rm src/pages/api/messages.ts src/lib/events.ts spec/guestbook.test.ts
```

- [ ] **Step 8: Run the full check**

Run: `pnpm check`

Expected: PASS. The server boots on a fresh database, migrates, seeds, and passes the invariants on `/` and `/readme/`. The parser, build, golden and seed tests pass. The contract tests are still todo.

- [ ] **Step 9: Commit**

```bash
git add src/lib/schema.ts src/lib/db.ts drizzle/ src/data/seed.ts src/data/seed.test.ts src/data/templates/ src/pages/ spec/
git commit -m "feat(data): enrolment schema and migrations, idempotent boot seeding, template student u7000001; guestbook retired" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

### Task 6: P2 — pure rules: types, clock, format, sessions, entry, requirements

**Files:**
- Create: `src/lib/types.ts`, `src/lib/clock.ts`, `src/lib/format.ts`, `src/lib/sessions.ts`, `src/lib/entry.ts`, `src/lib/requirements.ts`
- Test: `src/lib/clock.test.ts`, `src/lib/format.test.ts`, `src/lib/sessions.test.ts`, `src/lib/entry.test.ts`, `src/lib/requirements.test.ts`

**Interfaces:**
- Consumes: `src/data/calendar.json` (tests only).
- Produces:
  - `types.ts` exports every type the view, the API and the client share. These are the names later tasks use:
    - view: `View`, `StudentView`, `SessionView`, `AddState`, `EnrolmentView`, `EnrolmentState`, `Badge`;
    - requirements: `CourseStatusView`, `Icon`, `GroupView`, `GroupState`, `BlockView`, `NoteView`, `RequirementsView`, `CourseMark`;
    - chooser and catalogue: `Chooser`, `ChooserClass`, `CatalogueClass`, `Facets`, `Catalogue`;
    - API: `Outcome`, `WriteResponse`, `ChooseResponse`, `ApiErrorBody`;
    - client: `Filters`, `UrlState`, `Notice`, `AppProps`, `Career`.
  - `clock.ts`: `canberraDate(now?)`, `realToday()`, `today(student?)`.
  - `format.ts`: `fmtDay`, `fmtDate`, `fmtRange`, `fmtUnits`, `addDays`.
  - `sessions.ts`: `SessionDates`, `ClassDates`, `sessionEnd`, `isPast`, `isCurrent`, `classify(sessions, today) → {badges: Map<string, Badge>, nextId}`, `canAdd`, `dropDeadline`, `canDrop`.
  - `entry.ts`: `Entry`, `parseEntry(raw)`.
  - `requirements.ts`: `Take`, `Offer`, `GroupInput`, `RequirementInput`, `RequirementResult`, `courseStatus`, `evaluateRequirements`.

- [ ] **Step 1: Write the shared types**

`src/lib/types.ts`:

```ts
// The view model and API types (spec §4.3). The server builds these
// (src/lib/view.ts and friends); the React client only renders them.
// Dates are ISO "YYYY-MM-DD" strings throughout.

export type Career = "UGRD" | "PGRD" | "RSCH";
export type Badge = "now" | "next" | "upcoming" | "past";

export interface View {
  /** The date the view is computed for: today(student). */
  today: string;
  /** When the P&C snapshot was fetched. */
  snapshotDate: string;
  student: StudentView;
  /** Every session in the calendar, in start-date order. */
  sessions: SessionView[];
  /** The next semester (spec D3), or null when the data has none. */
  nextSemesterId: string | null;
  requirements: RequirementsView;
  /** Per course the student has history in: what the catalogue marks on its rows. */
  marks: Record<string, CourseMark>;
  /** Courses in the student's tracked requirement groups ("Required" in the catalogue). */
  requiredCodes: string[];
}

export interface StudentView {
  name: string;
  uid: string;
  programCode: string;
  programName: string;
  /** P&C's post-nominal ("MCompAdv"), else the acronym, else the code. */
  programShort: string;
  career: Career;
  planCode: string | null;
  planName: string | null;
}

export type AddState = { open: true } | { open: false; reason: string };

export interface SessionView {
  id: string;
  name: string;
  kind: "semester" | "intensive";
  year: number;
  startDate: string;
  endDate: string;
  badge: Badge;
  /** Before today's year: shown behind "Show earlier sessions" (spec §6.2). */
  earlier: boolean;
  /** "exams 5–21 Nov · add closed 3 Aug · census 31 Aug · …" (spec §6.2). */
  keyDates: string;
  add: AddState;
  /** The self-enrol cap: 24 for a semester, null for an intensive session. */
  cap: number | null;
  /** Live (not dropped) classes and their units. */
  classCount: number;
  units: number;
  /** Live enrolments by course code, then dropped ones. */
  enrolments: EnrolmentView[];
}

export type EnrolmentState = "enrolled" | "completed" | "failed" | "dropped";

export interface EnrolmentView {
  id: number;
  sessionId: string;
  classNumber: number;
  courseCode: string;
  title: string;
  units: number;
  mode: string;
  topic: string | null;
  startDate: string;
  endDate: string;
  censusDate: string;
  state: EnrolmentState;
  grade: string | null;
  enrolledOn: string;
  droppedOn: string | null;
  canDrop: boolean;
  /** Why an enrolled class offers no Drop: "Self-service drop closed on 4 Nov 2026". */
  dropNote: string | null;
}

export type Icon = "done" | "enrolled" | "partial" | "todo" | "none";

export interface CourseStatusView {
  code: string;
  title: string;
  units: number;
  times: number;
  icon: Icon;
  /** "Completed · First Semester 2026 · D", "Enrolled · Second Semester 2026 (now)", … (spec §5.3). */
  text: string;
  /** "Add to First Semester 2027": the next semester offers the course, and the student isn't enrolled in it. */
  add: { sessionId: string; label: string } | null;
}

export type GroupState = "met" | "in-progress" | "not-met";

export interface GroupView {
  id: number;
  rule: "all" | "units";
  label: string;
  text: string;
  state: GroupState;
  courses: CourseStatusView[];
}

export interface BlockView {
  source: "program" | "plan";
  /** "Program", "Specialisation · Artificial Intelligence", "Major · Software Development". */
  title: string;
  groups: GroupView[];
}

export interface NoteView {
  id: number;
  source: "program" | "plan";
  text: string;
  courses: CourseStatusView[];
}

export interface RequirementsView {
  programCode: string;
  programName: string;
  programUrl: string;
  planCode: string | null;
  planName: string | null;
  planUrl: string | null;
  summary: { done: number; enrolled: number; total: number };
  blocks: BlockView[];
  notes: NoteView[];
}

export interface CourseMark {
  /** "Completed · First Semester 2026" once the course can't be taken again (its maxTakes are used). */
  completed: string | null;
  /** Sessions with a live enrolment in the course that isn't completed yet. */
  enrolledIn: string[];
}

export interface ChooserClass {
  classNumber: number;
  mode: string;
  topic: string | null;
  startDate: string;
  endDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  canAdd: boolean;
}

export interface Chooser {
  sessionId: string;
  sessionName: string;
  course: { code: string; title: string; units: number; career: Career; requisites: string | null; pcUrl: string };
  classes: ChooserClass[];
  /** Set when the classes don't differ by topic, so only one can be enrolled (plan clarification 1). */
  note: string | null;
}

export interface CatalogueClass {
  classNumber: number;
  courseCode: string;
  subject: string;
  catalogue: string;
  level: number;
  title: string;
  career: Career;
  units: number;
  mode: string;
  topic: string | null;
  startDate: string;
  endDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  description: string;
  requisites: string | null;
  pcUrl: string;
  canAdd: boolean;
}

export interface Facets {
  subjects: { code: string; name: string }[];
  careers: Career[];
  levels: number[];
  modes: string[];
}

export interface Catalogue {
  sessionId: string;
  sessionName: string;
  /** P&C: "the list of offerings for future years is indicative only". */
  indicative: boolean;
  /** The date canAdd was computed for: the client refetches when the view's date changes. */
  today: string;
  classes: CatalogueClass[];
  facets: Facets;
}

export interface Outcome {
  ok: boolean;
  message: string;
  warning: string | null;
  courseCode: string | null;
  classNumber: number | null;
}

export interface WriteResponse {
  outcomes: Outcome[];
  view: View;
}

export interface ChooseResponse {
  choose: Chooser;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface Filters {
  q: string;
  title: string;
  code: string;
  class: string;
  subject: string;
  career: string;
  level: string;
  mode: string;
  sort: "code" | "title" | "level";
  page: number;
}

/** The SPA's URL state (spec §4.2), kept in the query string with replaceState. */
export interface UrlState {
  /** Sessions whose details are open; null means the default, the next semester. */
  open: string[] | null;
  choose: string | null;
  term: string | null;
  /** The catalogue's session; null means the catalogue is collapsed. */
  browse: string | null;
  filters: Filters;
}

export interface Notice {
  tone: "ok" | "error" | "warning" | "info";
  text: string;
}

/** What index.astro passes to the island. */
export interface AppProps {
  view: View;
  url: UrlState;
  notices: Notice[];
  catalogue: Catalogue | null;
  chooser: Chooser | null;
}
```

- [ ] **Step 2: Write the failing tests for clock, format, sessions and entry**

`src/lib/clock.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { canberraDate, realToday, today } from "./clock";

describe("canberraDate (Review Focus 2: Fly runs on UTC)", () => {
  it("rolls over at Canberra's midnight, not UTC's", () => {
    expect(canberraDate(new Date("2026-09-24T13:59:00Z"))).toBe("2026-09-24"); // 23:59 AEST
    expect(canberraDate(new Date("2026-09-24T14:00:00Z"))).toBe("2026-09-25"); // 00:00 AEST
  });
  it("follows daylight saving", () => {
    expect(canberraDate(new Date("2026-12-31T12:59:00Z"))).toBe("2026-12-31"); // 23:59 AEDT
    expect(canberraDate(new Date("2026-12-31T13:00:00Z"))).toBe("2027-01-01"); // 00:00 AEDT
  });
});

describe("today", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("uses APP_TODAY when it is a date", () => {
    vi.stubEnv("APP_TODAY", "2026-09-24");
    expect(realToday()).toBe("2026-09-24");
    expect(today()).toBe("2026-09-24");
  });
  it("ignores a malformed APP_TODAY and uses Canberra's date", () => {
    vi.stubEnv("APP_TODAY", "tomorrow");
    expect(realToday()).toBe(canberraDate(new Date()));
  });
});
```

`src/lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addDays, fmtDate, fmtDay, fmtRange, fmtUnits } from "./format";

describe("format (en-AU, locale-free)", () => {
  it("formats days and dates", () => {
    expect(fmtDay("2026-08-03")).toBe("3 Aug");
    expect(fmtDate("2026-09-24")).toBe("24 Sep 2026");
  });
  it("formats ranges within a month, within a year and across years", () => {
    expect(fmtRange("2026-11-05", "2026-11-21")).toBe("5–21 Nov");
    expect(fmtRange("2026-07-27", "2026-10-30")).toBe("27 Jul–30 Oct");
    expect(fmtRange("2026-11-30", "2027-02-26")).toBe("30 Nov 2026–26 Feb 2027");
  });
  it("formats units", () => {
    expect(fmtUnits(6)).toBe("6 units");
    expect(fmtUnits(1)).toBe("1 unit");
    expect(fmtUnits(1.5)).toBe("1.5 units");
  });
  it("adds days across months and leap years", () => {
    expect(addDays("2026-11-05", -1)).toBe("2026-11-04");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});
```

`src/lib/sessions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import calendar from "../data/calendar.json";
import { canAdd, canDrop, classify, dropDeadline, isPast, type SessionDates } from "./sessions";

const sessions = calendar.sessions as SessionDates[];
const session = (id: string): SessionDates => sessions.find((s) => s.id === id)!;
const badges = (today: string): Record<string, string> => Object.fromEntries(classify(sessions, today).badges);

describe("classify (spec §5.3)", () => {
  it("on 2026-09-24: Second Semester and Winter 2026 are Now, First Semester 2027 is Next", () => {
    expect(classify(sessions, "2026-09-24").nextId).toBe("2027-S1");
    expect(badges("2026-09-24")).toMatchObject({
      "2026-SUM": "past", "2026-S1": "past", "2026-AUT": "past",
      "2026-WIN": "now", "2026-S2": "now",
      "2026-SPR": "upcoming", "2027-SUM": "upcoming", "2027-S1": "next", "2027-S2": "upcoming",
    });
  });
  it("keeps a semester Now until its exams end", () => {
    expect(badges("2026-11-21")["2026-S2"]).toBe("now");
    expect(badges("2026-11-22")["2026-S2"]).toBe("past");
  });
  it("on 2026-12-10: Spring 2026 is Now and First Semester 2027 is still Next", () => {
    expect(badges("2026-12-10")).toMatchObject({ "2026-SPR": "now", "2027-S1": "next" });
  });
  it("on 2027-03-02: First Semester 2027 is Now and Second Semester 2027 is Next", () => {
    expect(badges("2027-03-02")).toMatchObject({ "2027-S1": "now", "2027-S2": "next" });
  });
  it("has no next semester after the last one in the data", () => {
    expect(classify(sessions, "2027-12-31").nextId).toBeNull();
  });
});

describe("deadlines (spec §5.3)", () => {
  const cls = { lastDayToEnrol: "2027-03-01", endDate: "2027-05-28" };
  it("allows adding up to and including the last day to enrol", () => {
    expect(canAdd(cls, "2027-03-01")).toBe(true);
    expect(canAdd(cls, "2027-03-02")).toBe(false);
  });
  it("allows dropping a semester class until the day before exams start", () => {
    expect(dropDeadline(cls, session("2026-S2"))).toBe("2026-11-04");
    expect(canDrop(cls, session("2026-S2"), "2026-11-04")).toBe(true);
    expect(canDrop(cls, session("2026-S2"), "2026-11-05")).toBe(false);
  });
  it("allows dropping an intensive class until its own end date", () => {
    expect(dropDeadline({ lastDayToEnrol: "2026-07-10", endDate: "2026-07-26" }, session("2026-WIN"))).toBe("2026-07-26");
  });
  it("counts a semester as past only after its exams end", () => {
    expect(isPast(session("2026-S1"), "2026-06-20")).toBe(false);
    expect(isPast(session("2026-S1"), "2026-06-21")).toBe(true);
  });
});
```

`src/lib/entry.test.ts`:

```ts
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
```

Run: `pnpm build && pnpm vitest run src/lib/clock.test.ts src/lib/format.test.ts src/lib/sessions.test.ts src/lib/entry.test.ts`

Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Write clock, format, sessions and entry**

`src/lib/clock.ts`:

```ts
// The only place the app reads the date (spec §4.3). Everything else takes
// `today` as an ISO date string, so the tests (APP_TODAY) and M2's date
// setting can move it.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The date in Canberra. Fly's machines run on UTC, so the machine's own date is wrong for up to 11 hours a day. */
export function canberraDate(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The real date the app runs on: APP_TODAY when it is set (the tests), else Canberra's date. */
export function realToday(): string {
  const fixed = process.env.APP_TODAY;
  return fixed && ISO_DATE.test(fixed) ? fixed : canberraDate();
}

/** The date a student's page is computed for. */
export function today(_student?: { today?: string | null }): string {
  return realToday();
}
```

`src/lib/format.ts`:

```ts
// en-AU date and unit formatting over ISO strings (spec §4.3). Pure and
// locale-free, so the server and the browser render identical text and
// hydration never mismatches.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** "3 Aug" */
export function fmtDay(iso: string): string {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "3 Aug 2026" */
export function fmtDate(iso: string): string {
  return `${fmtDay(iso)} ${parts(iso).y}`;
}

/** "5–21 Nov", "27 Jul–30 Oct", "30 Nov 2026–26 Feb 2027" */
export function fmtRange(from: string, to: string): string {
  const a = parts(from);
  const b = parts(to);
  if (a.y !== b.y) return `${fmtDate(from)}–${fmtDate(to)}`;
  if (a.m === b.m) return `${a.d}–${b.d} ${MONTHS[b.m - 1]}`;
  return `${fmtDay(from)}–${fmtDay(to)}`;
}

/** "6 units", "1 unit" */
export function fmtUnits(n: number): string {
  return `${n} unit${n === 1 ? "" : "s"}`;
}

/** The ISO date `n` days after (or, for negative n, before) `iso`. */
export function addDays(iso: string, n: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
```

`src/lib/sessions.ts`:

```ts
import { addDays } from "./format";
import type { Badge } from "./types";

// Session classification and deadlines (spec §5.3). Pure: every function
// takes `today`, so a date change (tests, M2) moves everything at once.

export interface SessionDates {
  id: string;
  kind: "semester" | "intensive";
  startDate: string;
  endDate: string;
  examStart: string | null;
  examEnd: string | null;
}

export interface ClassDates {
  lastDayToEnrol: string;
  endDate: string;
}

export const sessionEnd = (s: SessionDates): string => s.examEnd ?? s.endDate;
export const isPast = (s: SessionDates, today: string): boolean => sessionEnd(s) < today;
export const isCurrent = (s: SessionDates, today: string): boolean => s.startDate <= today && today <= sessionEnd(s);

/** Now: every session under way. Next: the earliest semester still to start (spec D3). Upcoming: other future sessions. Past: the rest. */
export function classify(sessions: SessionDates[], today: string): { badges: Map<string, Badge>; nextId: string | null } {
  const next = sessions
    .filter((s) => s.kind === "semester" && s.startDate > today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0];
  const badges = new Map<string, Badge>();
  for (const s of sessions) {
    badges.set(s.id, isCurrent(s, today) ? "now" : s.id === next?.id ? "next" : s.startDate > today ? "upcoming" : "past");
  }
  return { badges, nextId: next?.id ?? null };
}

/** The class's Last Day to Enrol covers the semester rule and each intensive class's own date (spec D4). */
export const canAdd = (c: ClassDates, today: string): boolean => today <= c.lastDayToEnrol;

/** ANU's self-service drop rule: until exams start for a semester, else until the class ends. */
export function dropDeadline(c: ClassDates, s: SessionDates): string {
  return s.kind === "semester" && s.examStart ? addDays(s.examStart, -1) : c.endDate;
}

export const canDrop = (c: ClassDates, s: SessionDates, today: string): boolean => today <= dropDeadline(c, s);
```

`src/lib/entry.ts`:

```ts
// What a student typed into "Class number or course code" (spec §6.3).

export type Entry = { kind: "course"; code: string } | { kind: "class"; number: number } | { kind: "invalid" };

export function parseEntry(raw: string): Entry {
  // NFKC folds fullwidth digits and letters (５０９９ → 5099); spaces anywhere are ignored.
  const s = raw.normalize("NFKC").replace(/\s+/g, "").toUpperCase();
  if (/^\d{1,6}$/.test(s) && Number(s) > 0) return { kind: "class", number: Number(s) };
  if (/^[A-Z]{4}\d{4}$/.test(s)) return { kind: "course", code: s };
  return { kind: "invalid" };
}
```

Run the four test files again. Expected: PASS.

- [ ] **Step 4: Write the failing requirement tests**

`src/lib/requirements.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateRequirements, type GroupInput, type Offer, type RequirementInput, type RequirementResult, type Take } from "./requirements";

// The template student (spec §8.5) under VCOMP + ARTIF-SPEC's tracked groups.
const units: Record<string, number> = { COMP8800: 12 };
const COURSES = new Map(
  ["COMP6250", "COMP8260", "COMP6442", "COMP6445", "COMP8800", "COMP6262", "COMP6320", "COMP8620", "COMP8691"].map((code) => [code, { title: `${code} title`, units: units[code] ?? 6 }]),
);
const list = (...codes: string[]) => codes.map((code) => ({ code, times: code === "COMP8800" ? 2 : 1 }));
const GROUPS: GroupInput[] = [
  { id: 1, source: "program", rule: "units", minUnits: 6, label: "6 units from one of", text: "6 units from the completion of one of the following courses:", courses: list("COMP6250", "COMP8260") },
  { id: 2, source: "program", rule: "all", minUnits: null, label: "Compulsory", text: "12 units from completion of the following compulsory courses:", courses: list("COMP6442", "COMP6445") },
  { id: 3, source: "program", rule: "all", minUnits: null, label: "All of", text: "24 units from completion of", courses: list("COMP8800") },
  { id: 4, source: "program", rule: "note", minUnits: null, label: "Note", text: "A minimum of 48 units must come from completion of 8000-level COMP courses", courses: [] },
  { id: 5, source: "plan", rule: "all", minUnits: null, label: "All of", text: "The 24 units must consist of:", courses: list("COMP6262", "COMP6320", "COMP8620", "COMP8691") },
];
const done = (code: string, grade: string | null, sessionName = "First Semester 2026"): Take => ({ courseCode: code, sessionId: "2026-S1", sessionName, state: "completed", current: false, grade });
const now = (code: string): Take => ({ courseCode: code, sessionId: "2026-S2", sessionName: "Second Semester 2026", state: "enrolled", current: true, grade: null });
const TAKES = [done("COMP6262", "D"), done("COMP6320", "HD"), done("COMP6445", "D"), now("COMP6442"), now("COMP8620"), now("COMP8691")];
const S1_2027: Offer = { sessionId: "2027-S1", sessionName: "First Semester 2027", current: false };
const S2_2027: Offer = { sessionId: "2027-S2", sessionName: "Second Semester 2027", current: false };

function input(patch: Partial<RequirementInput> = {}): RequirementInput {
  return {
    groups: GROUPS,
    courses: COURSES,
    takes: TAKES,
    offers: new Map([["COMP8800", [S1_2027, S2_2027]], ["COMP6442", [S1_2027]]]),
    listed: new Set(["COMP8800", "COMP6442", "COMP6445", "COMP6262", "COMP6320", "COMP8620", "COMP8691"]),
    next: { id: "2027-S1", name: "First Semester 2027" },
    ...patch,
  };
}
const status = (r: RequirementResult, code: string) =>
  [...r.groups.flatMap((g) => g.courses), ...r.notes.flatMap((n) => n.courses)].find((c) => c.code === code);

describe("evaluateRequirements (spec §5.3)", () => {
  it("gives the template student every status, and 18 of 66 done · 18 enrolled", () => {
    const r = evaluateRequirements(input());
    expect(status(r, "COMP6445")).toMatchObject({ icon: "done", text: "Completed · First Semester 2026 · D", add: null });
    expect(status(r, "COMP6442")).toMatchObject({ icon: "enrolled", text: "Enrolled · Second Semester 2026 (now)", add: null });
    expect(status(r, "COMP8800")).toMatchObject({ icon: "todo", text: "Not enrolled", times: 2, add: { sessionId: "2027-S1", label: "Add to First Semester 2027" } });
    expect(status(r, "COMP6250")).toMatchObject({ icon: "todo", text: "Not enrolled · No classes listed in P&C for 2026–2027", add: null });
    expect(r.groups.map((g) => g.state)).toEqual(["not-met", "in-progress", "not-met", "in-progress"]);
    expect(r.notes.map((n) => n.id)).toEqual([4]);
    expect(r.summary).toEqual({ done: 18, enrolled: 18, total: 66 });
  });

  it("counts COMP8800's first take as 1 of 2, and 30 units enrolled", () => {
    const take: Take = { courseCode: "COMP8800", sessionId: "2027-S1", sessionName: "First Semester 2027", state: "enrolled", current: false, grade: null };
    const r = evaluateRequirements(input({ takes: [...TAKES, take] }));
    expect(status(r, "COMP8800")).toMatchObject({ icon: "partial", text: "Enrolled · First Semester 2027 (1 of 2)", add: null });
    expect(r.summary).toEqual({ done: 18, enrolled: 30, total: 66 });
  });

  it("says where a course is next offered when the next semester doesn't offer it", () => {
    const r = evaluateRequirements(input({ offers: new Map([["COMP8800", [S2_2027]]]) }));
    expect(status(r, "COMP8800")).toMatchObject({ text: "Not enrolled · Next offered: Second Semester 2027", add: null });
  });

  it("tells 'no open classes' apart from 'no classes at all'", () => {
    const r = evaluateRequirements(input({ offers: new Map() }));
    expect(status(r, "COMP8800")?.text).toBe("Not enrolled · No more classes listed in P&C for 2026–2027");
  });

  it("marks a satisfied units group's other courses as not needed", () => {
    const r = evaluateRequirements(input({ takes: [...TAKES, done("COMP6250", "P")] }));
    expect(r.groups[0].state).toBe("met");
    expect(status(r, "COMP8260")).toMatchObject({ icon: "none", text: "Not needed (group satisfied)", add: null });
  });

  it("shows a completed take of a twice-needed course ahead of what's left", () => {
    const r = evaluateRequirements(input({ takes: [...TAKES, done("COMP8800", "HD")] }));
    expect(status(r, "COMP8800")).toMatchObject({ icon: "partial", text: "Completed · First Semester 2026 · HD (1 of 2) · Not enrolled" });
  });

  it("shows a completed take without a grade as plain Completed (M2's date moves)", () => {
    const r = evaluateRequirements(input({ takes: [{ ...now("COMP8620"), state: "completed", current: false }] }));
    expect(status(r, "COMP8620")?.text).toBe("Completed · Second Semester 2026");
  });
});
```

Run: `pnpm vitest run src/lib/requirements.test.ts`. Expected: FAIL, because the module is missing.

- [ ] **Step 5: Write `src/lib/requirements.ts`**

```ts
import type { CourseStatusView, GroupState, GroupView, Icon, NoteView } from "./types";

// Requirement statuses (spec §5.3). Pure: the view layer passes the
// student's takes and the offers, and gets back what the sidebar shows.

/** A live enrolment that counts towards a requirement. Dropped and failed enrolments aren't takes. */
export interface Take {
  courseCode: string;
  sessionId: string;
  sessionName: string;
  state: "completed" | "enrolled";
  /** The session is Now. */
  current: boolean;
  grade: string | null;
}

/** A session in which the course has a class that can still be added. */
export interface Offer {
  sessionId: string;
  sessionName: string;
  current: boolean;
}

export interface GroupInput {
  id: number;
  source: "program" | "plan";
  rule: "all" | "units" | "note";
  minUnits: number | null;
  label: string;
  text: string;
  courses: { code: string; times: number }[];
}

export interface RequirementInput {
  /** In P&C order: the program's groups, then the plan's. */
  groups: GroupInput[];
  courses: Map<string, { title: string; units: number }>;
  /** In session order. */
  takes: Take[];
  /** Per course, the sessions with an addable class, in session order. */
  offers: Map<string, Offer[]>;
  /** Courses with any class in the snapshot. */
  listed: Set<string>;
  /** The next semester (spec D3). */
  next: { id: string; name: string } | null;
}

export interface RequirementResult {
  groups: (GroupView & { source: "program" | "plan" })[];
  notes: NoteView[];
  summary: { done: number; enrolled: number; total: number };
}

interface Counts {
  done: Take[];
  enrolled: Take[];
  /** Completed takes that count, capped at `times`. */
  doneN: number;
  /** Enrolled takes that count towards the takes still needed. */
  enrolledN: number;
}

function counts(code: string, times: number, input: RequirementInput): Counts {
  const takes = input.takes.filter((t) => t.courseCode === code);
  const done = takes.filter((t) => t.state === "completed");
  const enrolled = takes.filter((t) => t.state === "enrolled");
  const doneN = Math.min(done.length, times);
  return { done, enrolled, doneN, enrolledN: Math.min(enrolled.length, times - doneN) };
}

const withGrade = (t: Take): string => `${t.sessionName}${t.grade ? ` · ${t.grade}` : ""}`;

/** One course's status text (spec §5.3): completed takes count first, then enrolled takes. */
export function courseStatus(course: { code: string; times: number }, input: RequirementInput, groupSatisfied = false): CourseStatusView {
  const info = input.courses.get(course.code);
  const base = { code: course.code, title: info?.title ?? course.code, units: info?.units ?? 0, times: course.times };
  const c = counts(course.code, course.times, input);
  const take = (k: number): string => (course.times > 1 ? ` (${k} of ${course.times})` : "");

  // 1. Every take completed.
  if (c.doneN >= course.times) {
    return { ...base, icon: "done", text: `Completed · ${withGrade(c.done[course.times - 1])}`, add: null };
  }
  const prefix = c.doneN > 0 ? `Completed · ${withGrade(c.done[c.doneN - 1])}${take(c.doneN)} · ` : "";

  // 2 and 3. Enrolled takes, current sessions first (takes are in session order).
  if (c.enrolledN > 0) {
    const shown = c.enrolled.slice(0, c.enrolledN).map((t, i) => `${t.sessionName}${t.current ? " (now)" : ""}${take(c.doneN + i + 1)}`);
    const icon: Icon = c.doneN + c.enrolledN >= course.times ? "enrolled" : "partial";
    return { ...base, icon, text: `${prefix}Enrolled · ${shown.join(", ")}`, add: null };
  }

  // 4. Not enrolled.
  if (groupSatisfied && c.doneN === 0) return { ...base, icon: "none", text: "Not needed (group satisfied)", add: null };
  const icon: Icon = c.doneN > 0 ? "partial" : "todo";
  const offers = input.offers.get(course.code) ?? [];
  const next = input.next;
  if (next && offers.some((o) => o.sessionId === next.id)) {
    return { ...base, icon, text: `${prefix}Not enrolled`, add: { sessionId: next.id, label: `Add to ${next.name}` } };
  }
  const first = offers[0];
  const tail = first
    ? `Next offered: ${first.sessionName}${first.current ? " (now)" : ""}`
    : input.listed.has(course.code)
      ? "No more classes listed in P&C for 2026–2027"
      : "No classes listed in P&C for 2026–2027";
  return { ...base, icon, text: `${prefix}Not enrolled · ${tail}`, add: null };
}

/** Every group's state and courses, the untracked notes, and the summary line's numbers (spec §5.3). */
export function evaluateRequirements(input: RequirementInput): RequirementResult {
  const groups: RequirementResult["groups"] = [];
  const notes: NoteView[] = [];
  const summary = { done: 0, enrolled: 0, total: 0 };
  const unitsOf = (code: string): number => input.courses.get(code)?.units ?? 0;

  for (const g of input.groups) {
    if (g.rule === "note") {
      notes.push({ id: g.id, source: g.source, text: g.text, courses: g.courses.map((c) => courseStatus(c, input)) });
      continue;
    }
    const cs = g.courses.map((course) => ({ course, n: counts(course.code, course.times, input) }));
    let done = cs.reduce((sum, x) => sum + unitsOf(x.course.code) * x.n.doneN, 0);
    let enrolled = cs.reduce((sum, x) => sum + unitsOf(x.course.code) * x.n.enrolledN, 0);
    let total: number;
    let state: GroupState;
    if (g.rule === "all") {
      total = g.courses.reduce((sum, c) => sum + unitsOf(c.code) * c.times, 0);
      state = cs.every((x) => x.n.doneN >= x.course.times)
        ? "met"
        : cs.every((x) => x.n.doneN + x.n.enrolledN >= x.course.times)
          ? "in-progress"
          : "not-met";
    } else {
      total = g.minUnits ?? 0;
      state = done >= total ? "met" : done + enrolled >= total ? "in-progress" : "not-met";
      done = Math.min(done, total);
      enrolled = Math.min(enrolled, total - done);
    }
    const satisfied = g.rule === "units" && state !== "not-met";
    groups.push({ id: g.id, source: g.source, rule: g.rule, label: g.label, text: g.text, state, courses: g.courses.map((c) => courseStatus(c, input, satisfied)) });
    summary.done += done;
    summary.enrolled += enrolled;
    summary.total += total;
  }
  return { groups, notes, summary };
}
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `pnpm vitest run src/lib/`

Expected: PASS, all five files.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/clock.ts src/lib/format.ts src/lib/sessions.ts src/lib/entry.ts src/lib/requirements.ts src/lib/*.test.ts
git commit -m "feat: shared view types and the pure rules — Canberra clock, formatting, session classification, entry parsing, requirement statuses" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 7: P2 — sandbox, view model, `/api/view` and `/api/catalogue`

**Files:**
- Create: `src/lib/ref.ts`, `src/lib/http.ts`, `src/lib/student.ts`, `src/lib/catalogue.ts`, `src/lib/view.ts`, `src/pages/api/view.ts`, `src/pages/api/catalogue.ts`
- Test: `spec/view.test.ts` (replace the todos)

**Interfaces:**
- Consumes:
  - `db` and the schema tables (Task 5);
  - `TEMPLATES` and `DEFAULT_PROGRAM` (Task 5);
  - the Task 6 modules.
- Produces:
  - `ref.ts`: `ref(): Ref`, `classKey(sessionId, classNumber)`, types `Ref` and `GroupRef`.
  - `http.ts`:
    - `ApiError` (`status`, `code`, `message`);
    - `json(body, status?)`, `handle(run)`, `readBody(request)`;
    - `sessionIdField(value, field, known)`.
  - `student.ts`:
    - `COOKIE = "sid"`, type `StudentRecord`;
    - `templateFor(programCode)`, `studentFor(cookies)`, `sandboxFor(cookies)`, `resetSandbox(cookies, programCode)`.
  - `catalogue.ts`: `catalogueFor(sessionId, today): Catalogue`, `facetsFor(sessionId): Facets | null`, `chooserFor(code, sessionId, today): Chooser | null`.
  - `view.ts`:
    - `SEMESTER_CAP = 24`, type `EnrolmentRecord`;
    - `enrolmentRecords(studentId, r?)`, `takeState(record, today)`;
    - `buildView(student): View`.
  - Routes: `GET /api/view` and `GET /api/catalogue?session=`.

- [ ] **Step 1: Write the failing contract tests**

`spec/view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ApiErrorBody, Catalogue, View } from "../src/lib/types";
import { Visitor, sandboxCount, snapshot } from "./helpers";

describe("GET /api/view", () => {
  it("returns the template student's view, with Now/Next badges and the 18 of 66 summary, without creating a sandbox", async () => {
    const before = sandboxCount();
    const res = await new Visitor().get("/api/view");
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()).toEqual([]);
    const view = (await res.json()) as View;
    expect(view.today).toBe("2026-09-24");
    expect(view.nextSemesterId).toBe("2027-S1");
    expect(view.student).toMatchObject({ name: "Demo Student", uid: "u7000001", programCode: "7722XVCOMP", programShort: "MCompAdv", planCode: "ARTIF-SPEC", planName: "Artificial Intelligence" });
    const s = (id: string) => view.sessions.find((x) => x.id === id);
    expect(s("2026-S2")).toMatchObject({
      badge: "now",
      keyDates: "exams 5–21 Nov · add closed 3 Aug · census 31 Aug · drop without failure until 9 Oct · drop to 4 Nov",
      add: { open: false, reason: "Adding closed on 3 Aug" },
      cap: 24,
      classCount: 4,
      units: 24,
    });
    expect(s("2026-WIN")?.badge).toBe("now");
    expect(s("2027-S1")).toMatchObject({ badge: "next", add: { open: true }, classCount: 0 });
    expect(s("2027-S1")?.keyDates).toContain("enrolment usually opens early December (indicative)");
    expect(s("2026-SPR")?.badge).toBe("upcoming");
    expect(s("2026-S1")?.badge).toBe("past");
    expect(s("2026-S1")?.enrolments.every((e) => e.state === "completed" && !e.canDrop)).toBe(true);
    expect(view.requirements.summary).toEqual({ done: 18, enrolled: 18, total: 66 });
    expect(view.marks.COMP6445).toEqual({ completed: "Completed · First Semester 2026", enrolledIn: [] });
    expect(view.marks.COMP6442).toEqual({ completed: null, enrolledIn: ["2026-S2"] });
    expect(sandboxCount()).toBe(before);
  });

  it("treats an unknown sid cookie as no cookie", async () => {
    const res = await new Visitor("a".repeat(32)).get("/api/view");
    expect(res.status).toBe(200);
    expect(((await res.json()) as View).student.uid).toBe("u7000001");
  });
});

describe("GET /api/catalogue", () => {
  it("returns every First Semester 2027 class and only those, with descriptions", async () => {
    const { status, body } = await new Visitor().getJson<Catalogue>("/api/catalogue?session=2027-S1");
    expect(status).toBe(200);
    const expected = snapshot.classes.filter((c) => c.sessionId === "2027-S1").map((c) => c.classNumber).sort((a, b) => a - b);
    expect(body.classes.map((c) => c.classNumber).sort((a, b) => a - b)).toEqual(expected);
    expect(body).toMatchObject({ sessionId: "2027-S1", sessionName: "First Semester 2027", indicative: true, today: "2026-09-24" });
    expect(body.classes.filter((c) => c.description.length > 40).length).toBeGreaterThan(body.classes.length * 0.9);
    expect(body.classes.every((c) => c.canAdd)).toBe(true);
    expect(body.facets.subjects.map((s) => s.code)).toContain("COMP");
  });

  it("refuses an unknown or missing session with 400", async () => {
    for (const path of ["/api/catalogue?session=2099-S9", "/api/catalogue"]) {
      const { status, body } = await new Visitor().getJson<ApiErrorBody>(path);
      expect(status).toBe(400);
      expect(body.error.message).toContain("session");
    }
  });
});
```

Run: `pnpm test`. Expected: the new tests FAIL (404s), and everything else passes.

- [ ] **Step 2: Write `src/lib/ref.ts` and `src/lib/http.ts`**

`src/lib/ref.ts`:

```ts
import { asc } from "drizzle-orm";
import { db } from "./db";
import * as t from "./schema";

// Reference data (sessions, courses, classes, plans, requirements) is seeded
// at boot and never changes while the server runs, so it is read from SQLite
// once and kept in memory, indexed the ways the app asks.

export interface GroupRef {
  id: number;
  planCode: string;
  rulesYear: number;
  position: number;
  label: string;
  rule: "all" | "units" | "note";
  minUnits: number | null;
  text: string;
  courses: { code: string; times: number }[];
}

export interface Ref {
  /** In start-date order. */
  sessions: t.SessionRow[];
  sessionById: Map<string, t.SessionRow>;
  courseByCode: Map<string, t.CourseRow>;
  classByKey: Map<string, t.ClassRow>;
  /** Each list in class-number order. */
  classesBySession: Map<string, t.ClassRow[]>;
  /** Each list in session order, then class number. */
  classesByCourse: Map<string, t.ClassRow[]>;
  /** Class numbers repeat across sessions (spec §5.1). */
  sessionsOfClassNumber: Map<number, string[]>;
  subjects: Map<string, string>;
  plans: Map<string, t.PlanRow>;
  /** Program → its plans, in scope order. */
  programPlans: Map<string, string[]>;
  /** Plan → its requirement groups, in P&C order. */
  groupsByPlan: Map<string, GroupRef[]>;
}

export const classKey = (sessionId: string, classNumber: number): string => `${sessionId}#${classNumber}`;

let cache: Ref | null = null;

export function ref(): Ref {
  cache ??= load();
  return cache;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function load(): Ref {
  const sessions = db.select().from(t.sessions).orderBy(asc(t.sessions.startDate), asc(t.sessions.id)).all();
  const order = new Map(sessions.map((s, i) => [s.id, i]));
  const classes = db
    .select()
    .from(t.classes)
    .all()
    .sort((a, b) => (order.get(a.sessionId) ?? 0) - (order.get(b.sessionId) ?? 0) || a.classNumber - b.classNumber);
  const classesBySession = new Map<string, t.ClassRow[]>();
  const classesByCourse = new Map<string, t.ClassRow[]>();
  const sessionsOfClassNumber = new Map<number, string[]>();
  for (const c of classes) {
    push(classesBySession, c.sessionId, c);
    push(classesByCourse, c.courseCode, c);
    push(sessionsOfClassNumber, c.classNumber, c.sessionId);
  }
  const programPlans = new Map<string, string[]>();
  for (const pp of db.select().from(t.programPlans).orderBy(asc(t.programPlans.programCode), asc(t.programPlans.position)).all()) {
    push(programPlans, pp.programCode, pp.planCode);
  }
  const coursesOf = new Map<number, { code: string; times: number }[]>();
  for (const rc of db.select().from(t.requirementCourses).orderBy(asc(t.requirementCourses.groupId), asc(t.requirementCourses.position)).all()) {
    push(coursesOf, rc.groupId, { code: rc.courseCode, times: rc.times });
  }
  const groupsByPlan = new Map<string, GroupRef[]>();
  for (const g of db.select().from(t.requirementGroups).orderBy(asc(t.requirementGroups.planCode), asc(t.requirementGroups.position)).all()) {
    push(groupsByPlan, g.planCode, { ...g, courses: coursesOf.get(g.id) ?? [] });
  }
  return {
    sessions,
    sessionById: new Map(sessions.map((s) => [s.id, s])),
    courseByCode: new Map(db.select().from(t.courses).all().map((c) => [c.code, c])),
    classByKey: new Map(classes.map((c) => [classKey(c.sessionId, c.classNumber), c])),
    classesBySession,
    classesByCourse,
    sessionsOfClassNumber,
    subjects: new Map(db.select().from(t.subjects).all().map((s) => [s.code, s.name])),
    plans: new Map(db.select().from(t.plans).all().map((p) => [p.code, p])),
    programPlans,
    groupsByPlan,
  };
}
```

`src/lib/http.ts`:

```ts
// The JSON API's conventions (spec §4.2): JSON in, JSON out, and errors as
// {error: {code, message}} with a 4xx status. The message is shown to the
// user as written.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Runs a handler, turning an ApiError into its response. Anything else is a real bug and stays a 500. */
export async function handle(run: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiError) return json({ error: { code: err.code, message: err.message } }, err.status);
    throw err;
  }
}

/** A POST body: JSON only, so a cross-site HTML form can't reach the API (spec §4.2). */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    throw new ApiError(415, "unsupported_media_type", "Send the request body as JSON, with Content-Type: application/json.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "bad_json", "The request body isn't valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, "bad_body", "The request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

/** A field naming a session: it must be a session id the calendar has. */
export function sessionIdField(value: unknown, field: string, known: (id: string) => boolean): string {
  if (typeof value !== "string" || value === "") throw new ApiError(400, "bad_field", `${field} must be a session id such as 2027-S1.`);
  if (!known(value)) throw new ApiError(400, "bad_field", `${field}: there's no session ${value.slice(0, 20)} in the prototype's data.`);
  return value;
}
```

- [ ] **Step 3: Write `src/lib/student.ts`**

```ts
import { randomBytes } from "node:crypto";
import type { AstroCookies } from "astro";
import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_PROGRAM, TEMPLATES } from "../data/templates";
import { db } from "./db";
import { ApiError } from "./http";
import * as t from "./schema";

// The demo sandbox (spec §5.2). A GET without a cookie sees the default
// template student, read-only. The first write clones that template into a
// sandbox and sets `sid`. An unknown or malformed token counts as no cookie.

export const COOKIE = "sid";
const TOKEN = /^[A-Za-z0-9_-]{32}$/;

export interface StudentRecord {
  id: number;
  token: string | null;
  name: string;
  uid: string;
  programCode: string;
  rulesYear: number;
  commencedSessionId: string;
  /** M2's date setting; always null in M1. */
  today: string | null;
  /** The student's major or specialisation (one in scope). */
  plans: string[];
}

function load(row: t.StudentRow | undefined): StudentRecord | null {
  if (!row) return null;
  const plans = db.select({ planCode: t.studentPlans.planCode }).from(t.studentPlans).where(eq(t.studentPlans.studentId, row.id)).all();
  return {
    id: row.id,
    token: row.token,
    name: row.name,
    uid: row.uid,
    programCode: row.programCode,
    rulesYear: row.rulesYear,
    commencedSessionId: row.commencedSessionId,
    today: null,
    plans: plans.map((p) => p.planCode),
  };
}

const byId = (id: number): StudentRecord => load(db.select().from(t.students).where(eq(t.students.id, id)).get()) as StudentRecord;

export function templateFor(programCode: string): StudentRecord | null {
  const tpl = TEMPLATES.find((x) => x.programCode === programCode);
  if (!tpl) return null;
  return load(db.select().from(t.students).where(and(isNull(t.students.token), eq(t.students.uid, tpl.uid))).get());
}

function sandbox(cookies: AstroCookies): StudentRecord | null {
  const token = cookies.get(COOKIE)?.value;
  if (!token || !TOKEN.test(token)) return null;
  return load(db.select().from(t.students).where(eq(t.students.token, token)).get());
}

function defaultTemplate(): StudentRecord {
  const tpl = templateFor(DEFAULT_PROGRAM);
  if (!tpl) throw new Error(`the ${DEFAULT_PROGRAM} template student wasn't seeded`);
  return tpl;
}

/** The student a request sees: its sandbox, else the default template (read-only). */
export function studentFor(cookies: AstroCookies): StudentRecord {
  return sandbox(cookies) ?? defaultTemplate();
}

/** The request's sandbox. On the first write it's cloned from the default template, and the cookie is set. */
export function sandboxFor(cookies: AstroCookies): StudentRecord {
  return sandbox(cookies) ?? clone(defaultTemplate(), cookies);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function copyHistory(tx: Tx, fromId: number, toId: number): void {
  const plans = tx.select().from(t.studentPlans).where(eq(t.studentPlans.studentId, fromId)).all();
  if (plans.length > 0) tx.insert(t.studentPlans).values(plans.map((p) => ({ studentId: toId, planCode: p.planCode }))).run();
  const rows = tx.select().from(t.enrolments).where(eq(t.enrolments.studentId, fromId)).all();
  if (rows.length > 0) {
    tx.insert(t.enrolments)
      .values(rows.map((e) => ({ studentId: toId, sessionId: e.sessionId, classNumber: e.classNumber, status: e.status, grade: e.grade, enrolledOn: e.enrolledOn, droppedOn: e.droppedOn })))
      .run();
  }
}

function clone(tpl: StudentRecord, cookies: AstroCookies): StudentRecord {
  const token = randomBytes(24).toString("base64url");
  const id = db.transaction((tx) => {
    const row = tx
      .insert(t.students)
      .values({ token, name: tpl.name, uid: tpl.uid, programCode: tpl.programCode, rulesYear: tpl.rulesYear, commencedSessionId: tpl.commencedSessionId, createdAt: new Date().toISOString() })
      .returning({ id: t.students.id })
      .get();
    copyHistory(tx, tpl.id, row.id);
    return row.id;
  });
  cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: import.meta.env.PROD, maxAge: 60 * 60 * 24 * 365 });
  return byId(id);
}

/** Replaces the sandbox's rows with a fresh clone of the program's template, keeping the cookie (spec §5.2, §11.3). */
export function resetSandbox(cookies: AstroCookies, programCode: string): StudentRecord {
  const tpl = templateFor(programCode);
  if (!tpl) throw new ApiError(400, "bad_field", `programCode: there's no demo student for ${programCode.slice(0, 20)}.`);
  const mine = sandbox(cookies);
  if (!mine) return clone(tpl, cookies);
  db.transaction((tx) => {
    tx.delete(t.enrolments).where(eq(t.enrolments.studentId, mine.id)).run();
    tx.delete(t.studentPlans).where(eq(t.studentPlans.studentId, mine.id)).run();
    tx.update(t.students)
      .set({ name: tpl.name, uid: tpl.uid, programCode: tpl.programCode, rulesYear: tpl.rulesYear, commencedSessionId: tpl.commencedSessionId })
      .where(eq(t.students.id, mine.id))
      .run();
    copyHistory(tx, tpl.id, mine.id);
  });
  return byId(mine.id);
}
```

- [ ] **Step 4: Write `src/lib/catalogue.ts`**

```ts
import snapshot from "../data/pc/snapshot.json";
import { ref } from "./ref";
import type { CourseRow } from "./schema";
import { canAdd } from "./sessions";
import type { Catalogue, CatalogueClass, Chooser, Facets } from "./types";

// One session's classes for the catalogue (spec §6.4), and one course's
// classes for the chooser (spec §6.3). canAdd is computed here, on the
// server, so the client never compares dates.

const SNAPSHOT_YEAR = Number(snapshot.fetchedOn.slice(0, 4));

function facetsOf(classes: { subject: string; career: CourseRow["career"]; level: number; mode: string }[]): Facets {
  const r = ref();
  return {
    subjects: [...new Set(classes.map((c) => c.subject))].sort().map((code) => ({ code, name: r.subjects.get(code) ?? code })),
    careers: [...new Set(classes.map((c) => c.career))].sort(),
    levels: [...new Set(classes.map((c) => c.level))].sort((a, b) => a - b),
    modes: [...new Set(classes.map((c) => c.mode))].sort(),
  };
}

export function catalogueFor(sessionId: string, today: string): Catalogue {
  const r = ref();
  const session = r.sessionById.get(sessionId)!;
  const classes: CatalogueClass[] = (r.classesBySession.get(sessionId) ?? []).map((c) => {
    const course = r.courseByCode.get(c.courseCode)!;
    return {
      classNumber: c.classNumber,
      courseCode: c.courseCode,
      subject: course.subject,
      catalogue: course.catalogue,
      level: course.level,
      title: course.title,
      career: course.career,
      units: course.units,
      mode: c.mode,
      topic: c.topic,
      startDate: c.startDate,
      endDate: c.endDate,
      lastDayToEnrol: c.lastDayToEnrol,
      censusDate: c.censusDate,
      description: course.description,
      requisites: course.requisites,
      pcUrl: course.pcUrl,
      canAdd: canAdd(c, today),
    };
  });
  return { sessionId, sessionName: session.name, indicative: session.year > SNAPSHOT_YEAR, today, classes, facets: facetsOf(classes) };
}

/** The filter options a session's classes offer, used to check a URL's filter values (spec §9). */
export function facetsFor(sessionId: string): Facets | null {
  const r = ref();
  if (!r.sessionById.has(sessionId)) return null;
  return facetsOf(
    (r.classesBySession.get(sessionId) ?? []).map((c) => {
      const course = r.courseByCode.get(c.courseCode)!;
      return { subject: course.subject, career: course.career, level: course.level, mode: c.mode };
    }),
  );
}

export function chooserFor(code: string, sessionId: string, today: string): Chooser | null {
  const r = ref();
  const course = r.courseByCode.get(code);
  const session = r.sessionById.get(sessionId);
  if (!course || !session) return null;
  const classes = (r.classesByCourse.get(code) ?? []).filter((c) => c.sessionId === sessionId);
  if (classes.length === 0) return null;
  const topics = new Set(classes.map((c) => c.topic ?? ""));
  return {
    sessionId,
    sessionName: session.name,
    course: { code, title: course.title, units: course.units, career: course.career, requisites: course.requisites, pcUrl: course.pcUrl },
    classes: classes.map((c) => ({ classNumber: c.classNumber, mode: c.mode, topic: c.topic, startDate: c.startDate, endDate: c.endDate, lastDayToEnrol: c.lastDayToEnrol, censusDate: c.censusDate, canAdd: canAdd(c, today) })),
    note: topics.size < classes.length ? `You can enrol in one class of ${code} per session, unless the classes have different topics.` : null,
  };
}
```

- [ ] **Step 5: Write `src/lib/view.ts`**

```ts
import { eq } from "drizzle-orm";
import snapshot from "../data/pc/snapshot.json";
import { today as todayFor } from "./clock";
import { db } from "./db";
import { addDays, fmtDate, fmtDay, fmtRange } from "./format";
import { classKey, type Ref, ref } from "./ref";
import { evaluateRequirements, type GroupInput, type Offer, type Take } from "./requirements";
import * as t from "./schema";
import { canAdd, canDrop, classify, dropDeadline, isPast } from "./sessions";
import type { StudentRecord } from "./student";
import type { AddState, Badge, BlockView, CourseMark, EnrolmentState, EnrolmentView, RequirementsView, SessionView, View } from "./types";

// buildView(student): the whole page state for one student (spec §4.1 a3).
// `/`, `/api/view` and every write return it, so what the page shows, what
// validation enforces and what the sidebar counts can never disagree.

export const SEMESTER_CAP = 24;
const FAIL_GRADES = new Set(["N", "NCN"]);

export interface EnrolmentRecord extends t.EnrolmentRow {
  cls: t.ClassRow;
  course: t.CourseRow;
  session: t.SessionRow;
}

/** A student's enrolments with their class, course and session, in session order, then course code. */
export function enrolmentRecords(studentId: number, r: Ref = ref()): EnrolmentRecord[] {
  const order = new Map(r.sessions.map((s, i) => [s.id, i]));
  return db
    .select()
    .from(t.enrolments)
    .where(eq(t.enrolments.studentId, studentId))
    .all()
    .map((e) => {
      const cls = r.classByKey.get(classKey(e.sessionId, e.classNumber))!;
      return { ...e, cls, course: r.courseByCode.get(cls.courseCode)!, session: r.sessionById.get(e.sessionId)! };
    })
    .sort((a, b) => (order.get(a.sessionId) ?? 0) - (order.get(b.sessionId) ?? 0) || (a.course.code < b.course.code ? -1 : a.course.code > b.course.code ? 1 : a.id - b.id));
}

/** Completion is derived, never stored (spec §5.3): a live enrolment in a finished session is completed, unless its grade is a fail. */
export function takeState(e: EnrolmentRecord, today: string): EnrolmentState {
  if (e.status === "dropped") return "dropped";
  if (!isPast(e.session, today)) return "enrolled";
  return e.grade !== null && FAIL_GRADES.has(e.grade) ? "failed" : "completed";
}

function keyDates(s: t.SessionRow, today: string): string {
  const parts: string[] = [];
  if (s.kind === "intensive") {
    parts.push("dates vary by class");
  } else {
    if (s.examStart && s.examEnd) parts.push(`exams ${fmtRange(s.examStart, s.examEnd)}`);
    if (s.lastDayToAdd) parts.push(today <= s.lastDayToAdd ? `add until ${fmtDay(s.lastDayToAdd)}` : `add closed ${fmtDay(s.lastDayToAdd)}`);
    if (s.censusDate) parts.push(`census ${fmtDay(s.censusDate)}`);
    if (s.dropNoFailDate) parts.push(`drop without failure until ${fmtDay(s.dropNoFailDate)}`);
    if (s.examStart) parts.push(`drop to ${fmtDay(addDays(s.examStart, -1))}`);
  }
  if (s.enrolOpens && s.enrolOpensText && today < s.enrolOpens) parts.push(`enrolment usually opens ${s.enrolOpensText}`);
  return parts.join(" · ");
}

function addState(s: t.SessionRow, today: string, r: Ref): AddState {
  const classes = r.classesBySession.get(s.id) ?? [];
  if (classes.length === 0) return { open: false, reason: `No classes are listed in P&C for ${s.name}.` };
  if (classes.some((c) => canAdd(c, today))) return { open: true };
  const last = classes.map((c) => c.lastDayToEnrol).sort().at(-1)!;
  return { open: false, reason: `Adding closed on ${fmtDay(last)}` };
}

function enrolmentView(e: EnrolmentRecord, today: string): EnrolmentView {
  const state = takeState(e, today);
  const droppable = state === "enrolled" && canDrop(e.cls, e.session, today);
  return {
    id: e.id,
    sessionId: e.sessionId,
    classNumber: e.classNumber,
    courseCode: e.course.code,
    title: e.course.title,
    units: e.course.units,
    mode: e.cls.mode,
    topic: e.cls.topic,
    startDate: e.cls.startDate,
    endDate: e.cls.endDate,
    censusDate: e.cls.censusDate,
    state,
    grade: e.grade,
    enrolledOn: e.enrolledOn,
    droppedOn: e.droppedOn,
    canDrop: droppable,
    dropNote: state === "enrolled" && !droppable ? `Self-service drop closed on ${fmtDate(dropDeadline(e.cls, e.session))}` : null,
  };
}

function sessionView(s: t.SessionRow, badge: Badge, records: EnrolmentRecord[], today: string, r: Ref): SessionView {
  const enrolments = records.map((e) => enrolmentView(e, today));
  const live = enrolments.filter((e) => e.state !== "dropped");
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    year: s.year,
    startDate: s.startDate,
    endDate: s.endDate,
    badge,
    earlier: s.year < Number(today.slice(0, 4)),
    keyDates: keyDates(s, today),
    add: addState(s, today, r),
    cap: s.kind === "semester" ? SEMESTER_CAP : null,
    classCount: live.length,
    units: live.reduce((sum, e) => sum + e.units, 0),
    enrolments: [...live, ...enrolments.filter((e) => e.state === "dropped")],
  };
}

function requirementsView(student: StudentRecord, records: EnrolmentRecord[], badges: Map<string, Badge>, next: t.SessionRow | null, today: string, r: Ref): { view: RequirementsView; required: string[] } {
  const program = r.plans.get(student.programCode)!;
  const plan = student.plans.length > 0 ? (r.plans.get(student.plans[0]) ?? null) : null;
  const groupsOf = (code: string, source: "program" | "plan"): GroupInput[] =>
    (r.groupsByPlan.get(code) ?? [])
      .filter((g) => g.rulesYear === student.rulesYear)
      .map((g) => ({ id: g.id, source, rule: g.rule, minUnits: g.minUnits, label: g.label, text: g.text, courses: g.courses }));
  const groups = [...groupsOf(program.code, "program"), ...(plan ? groupsOf(plan.code, "plan") : [])];
  const codes = [...new Set(groups.flatMap((g) => g.courses.map((c) => c.code)))];

  const takes: Take[] = records.flatMap((e): Take[] => {
    const state = takeState(e, today);
    if (state !== "enrolled" && state !== "completed") return [];
    return [{ courseCode: e.course.code, sessionId: e.sessionId, sessionName: e.session.name, state, current: badges.get(e.sessionId) === "now", grade: e.grade }];
  });
  const offers = new Map<string, Offer[]>();
  const listed = new Set<string>();
  for (const code of codes) {
    const classes = r.classesByCourse.get(code) ?? [];
    if (classes.length > 0) listed.add(code);
    const sessionIds = [...new Set(classes.filter((c) => canAdd(c, today)).map((c) => c.sessionId))];
    offers.set(code, sessionIds.map((id) => ({ sessionId: id, sessionName: r.sessionById.get(id)!.name, current: badges.get(id) === "now" })));
  }
  const courses = new Map(codes.map((code) => {
    const c = r.courseByCode.get(code)!;
    return [code, { title: c.title, units: c.units }] as const;
  }));
  const result = evaluateRequirements({ groups, courses, takes, offers, listed, next: next ? { id: next.id, name: next.name } : null });

  const blocks: BlockView[] = [
    { source: "program" as const, title: "Program", groups: result.groups.filter((g) => g.source === "program") },
    ...(plan ? [{ source: "plan" as const, title: `${plan.kind === "major" ? "Major" : "Specialisation"} · ${plan.name}`, groups: result.groups.filter((g) => g.source === "plan") }] : []),
  ].filter((b) => b.groups.length > 0);
  return {
    view: {
      programCode: program.code,
      programName: program.name,
      programUrl: program.pcUrl,
      planCode: plan?.code ?? null,
      planName: plan?.name ?? null,
      planUrl: plan?.pcUrl ?? null,
      summary: result.summary,
      blocks,
      notes: result.notes,
    },
    required: [...new Set(result.groups.flatMap((g) => g.courses.map((c) => c.code)))],
  };
}

function marks(records: EnrolmentRecord[], today: string): Record<string, CourseMark> {
  const out: Record<string, CourseMark> = {};
  const completed = new Map<string, EnrolmentRecord[]>();
  for (const e of records) {
    const state = takeState(e, today);
    if (state !== "enrolled" && state !== "completed") continue;
    const mark = (out[e.course.code] ??= { completed: null, enrolledIn: [] });
    if (state === "enrolled") mark.enrolledIn.push(e.sessionId);
    else completed.set(e.course.code, [...(completed.get(e.course.code) ?? []), e]);
  }
  for (const [code, takes] of completed) {
    if (takes.length >= takes[0].course.maxTakes) out[code].completed = `Completed · ${takes[takes.length - 1].session.name}`;
  }
  return out;
}

export function buildView(student: StudentRecord): View {
  const r = ref();
  const today = todayFor(student);
  const { badges, nextId } = classify(r.sessions, today);
  const records = enrolmentRecords(student.id, r);
  const program = r.plans.get(student.programCode)!;
  const plan = student.plans.length > 0 ? (r.plans.get(student.plans[0]) ?? null) : null;
  const requirements = requirementsView(student, records, badges, nextId ? r.sessionById.get(nextId)! : null, today, r);
  return {
    today,
    snapshotDate: snapshot.fetchedOn,
    student: {
      name: student.name,
      uid: student.uid,
      programCode: program.code,
      programName: program.name,
      programShort: program.postNominal ?? program.acronym ?? program.code,
      career: program.career,
      planCode: plan?.code ?? null,
      planName: plan?.name ?? null,
    },
    sessions: r.sessions.map((s) => sessionView(s, badges.get(s.id)!, records.filter((e) => e.sessionId === s.id), today, r)),
    nextSemesterId: nextId,
    requirements: requirements.view,
    marks: marks(records, today),
    requiredCodes: requirements.required,
  };
}
```

- [ ] **Step 6: Write the two GET routes**

`src/pages/api/view.ts`:

```ts
import type { APIRoute } from "astro";
import { handle, json } from "../../lib/http";
import { studentFor } from "../../lib/student";
import { buildView } from "../../lib/view";

// The view model for this browser's student (spec §4.2). The client calls
// it when a tab regains focus.
export const GET: APIRoute = ({ cookies }) => handle(() => json(buildView(studentFor(cookies))));
```

`src/pages/api/catalogue.ts`:

```ts
import type { APIRoute } from "astro";
import { catalogueFor } from "../../lib/catalogue";
import { today } from "../../lib/clock";
import { handle, json, sessionIdField } from "../../lib/http";
import { ref } from "../../lib/ref";
import { studentFor } from "../../lib/student";

// Every class in one session, with its course fields (spec §4.2). The
// browser filters it in memory (spec §4.1 a4).
export const GET: APIRoute = ({ cookies, url }) =>
  handle(() => {
    const sessionId = sessionIdField(url.searchParams.get("session"), "session", (id) => ref().sessionById.has(id));
    return json(catalogueFor(sessionId, today(studentFor(cookies))));
  });
```

- [ ] **Step 7: Run the full check**

Run: `pnpm check`

Expected: PASS, including the four `spec/view.test.ts` tests.

- If `add` for `2026-S2` comes out open, some Second Semester 2026 class in the snapshot has a later Last Day to Enrol. Look it up in `classes.json`. The rule is right; fix the test's premise only if P&C really publishes that date.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ src/pages/api/view.ts src/pages/api/catalogue.ts spec/view.test.ts
git commit -m "feat: view model, cookie sandbox, /api/view and /api/catalogue with contract tests" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 8: P2 — enrol, drop and reset API

**Files:**
- Create: `src/lib/enrol.ts`, `src/pages/api/enrol.ts`, `src/pages/api/drop.ts`, `src/pages/api/demo/reset.ts`
- Test: `spec/enrol.test.ts`, `spec/requirements.test.ts`, `spec/api.test.ts` (replace their todos; the D6 todo stays for Task 9)

**Interfaces:**
- Consumes: from Task 7, `ref`, `classKey`, `enrolmentRecords`, `takeState`, `SEMESTER_CAP`, `chooserFor`, `sandboxFor`, `studentFor`, `resetSandbox`, `buildView`, and the `http.ts` helpers; `parseEntry`, `canAdd`, `canDrop`, `dropDeadline`, `fmtDate`, `fmtUnits` and `today` from Task 6.
- Produces:
  - `enrol.ts` exports:
    - `resolveEntry(raw, sessionId, today): EntryResolution`, where `EntryResolution` is `{kind:"classes", classNumbers} | {kind:"choose", chooser} | {kind:"error", message}`;
    - `enrolClasses(student: {id, programCareer}, sessionId, classNumbers, today): Outcome[]`;
    - `dropClass(studentId, sessionId, classNumber, today): Outcome`.
  - Routes (spec §4.2):
    - `POST /api/enrol` answers `{outcomes, view}` or `{choose}`, or 422 `{error:{code:"entry"}}`;
    - `POST /api/drop` answers `{outcomes, view}`;
    - `POST /api/demo/reset` answers `{outcomes, view}`.

- [ ] **Step 1: Write the failing contract tests**

`spec/enrol.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ApiErrorBody, ChooseResponse, View, WriteResponse } from "../src/lib/types";
import { type SnapClass, Visitor, classesOf, singleClassCourses, snapshot } from "./helpers";

const S1 = "2027-S1";
const live = (view: View, sessionId: string): number[] =>
  view.sessions.find((s) => s.id === sessionId)!.enrolments.filter((e) => e.state === "enrolled").map((e) => e.classNumber);
const sidebar = (view: View, code: string) =>
  view.requirements.blocks.flatMap((b) => b.groups).flatMap((g) => g.courses).find((c) => c.code === code)!;
const template = JSON.parse(readFileSync("src/data/templates/7722XVCOMP.json", "utf8")) as { enrolments: SnapClass[] };

/** A course with two classes of different topics in one open 2027 session (plan clarification 1). */
const topical = (() => {
  for (const sessionId of ["2027-S1", "2027-S2"]) {
    const byCourse = new Map<string, SnapClass[]>();
    for (const c of snapshot.classes.filter((x) => x.sessionId === sessionId && x.topic)) byCourse.set(c.courseCode, [...(byCourse.get(c.courseCode) ?? []), c]);
    for (const [, cs] of byCourse) {
      const distinct = [...new Map(cs.map((c) => [c.topic, c])).values()];
      if (distinct.length >= 2) return { sessionId, classes: distinct.slice(0, 2) };
    }
  }
  return null;
})();

describe("F1: add by class number or course code", () => {
  it("the snapshot supports these fixtures", () => {
    expect(classesOf("POGO8062", S1).length).toBeGreaterThan(1);
    expect(classesOf("COMP8020", S1)).toEqual([]);
    expect(classesOf("COMP8020", "2027-S2").length).toBeGreaterThan(0);
    expect(snapshot.classes.filter((c) => c.classNumber === 8707).map((c) => c.sessionId)).toEqual(["2026-S2"]);
    expect(classesOf("COMP8800", S1)).toHaveLength(1);
    expect(classesOf("COMP8800", "2027-S2")).toHaveLength(1);
  });

  it("enrols a class number, and a fresh request with the same cookie still has it (persists across reload)", async () => {
    const [target] = singleClassCourses(S1, 1);
    const v = new Visitor();
    const { status, body } = await v.postJson<WriteResponse>("/api/enrol", { session: S1, entry: String(target.classNumber) });
    expect(status).toBe(200);
    expect(body.outcomes).toEqual([expect.objectContaining({ ok: true, classNumber: target.classNumber, courseCode: target.courseCode })]);
    expect(body.outcomes[0].message).toMatch(new RegExp(`^Enrolled: ${target.courseCode} .+ \\(class ${target.classNumber}, 6 units\\)$`));
    expect(v.sid).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const fresh = await new Visitor(v.sid).getJson<View>("/api/view");
    expect(live(fresh.body, S1)).toEqual([target.classNumber]);
  });

  it("enrols a course code with one class directly, with no confirm step", async () => {
    const [target] = singleClassCourses(S1, 1);
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: S1, entry: ` ${target.courseCode.toLowerCase()} ` });
    expect(body.outcomes).toEqual([expect.objectContaining({ ok: true, classNumber: target.classNumber })]);
    expect(live(body.view, S1)).toEqual([target.classNumber]);
  });

  it("answers a course with several classes with choose, changing nothing; two of its class numbers then get one outcome each", async () => {
    const pogo = classesOf("POGO8062", S1);
    const v = new Visitor();
    const chose = await v.postJson<ChooseResponse>("/api/enrol", { session: S1, entry: "POGO8062" });
    expect(chose.status).toBe(200);
    expect(chose.body.choose.classes.map((c) => c.classNumber)).toEqual(pogo.map((c) => c.classNumber));
    expect(chose.body.choose.course.requisites === null || typeof chose.body.choose.course.requisites === "string").toBe(true);
    expect(v.sid, "a choose answer changes nothing, so no sandbox yet").toBeNull();
    const { body } = await v.postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: pogo.slice(0, 2).map((c) => c.classNumber) });
    expect(body.outcomes.map((o) => o.ok)).toEqual([true, false]);
    expect(body.outcomes[1].message).toContain("you're already enrolled in POGO8062 in First Semester 2027");
  });

  it.runIf(topical !== null)("enrols two classes of one course when their topics differ", async () => {
    const { sessionId, classes } = topical!;
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: sessionId, classNumbers: classes.map((c) => c.classNumber) });
    expect(body.outcomes.map((o) => o.ok)).toEqual([true, true]);
  });

  it.each([
    ["a code not offered this session", "COMP8020", "COMP8020 isn't offered in First Semester 2027. Next offered: Second Semester 2027."],
    ["an unknown code", "COMP9999", "COMP9999 isn't in the prototype's catalogue"],
    ["another session's class number", "8707", "8707 is a Second Semester 2026 class number, not First Semester 2027"],
    ["garbage", "enrol me please", "Enter a class number (digits) or a course code like COMP1100."],
  ])("answers %s with its message and enrols nothing", async (_what, entry, message) => {
    const v = new Visitor();
    const { status, body } = await v.postJson<ApiErrorBody>("/api/enrol", { session: S1, entry });
    expect(status).toBe(422);
    expect(body.error).toEqual({ code: "entry", message });
    expect(v.sid).toBeNull();
  });
});

describe("rules", () => {
  it("refuses a class whose last day to enrol has passed", async () => {
    const [cls] = classesOf("COMP8800", "2026-S2");
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2026-S2", classNumbers: [cls.classNumber] });
    expect(body.outcomes[0]).toMatchObject({ ok: false, message: `Not added: COMP8800 (class ${cls.classNumber}) — the last day to enrol was 3 Aug 2026` });
  });

  it("refuses a course already completed, naming the session and grade", async () => {
    const offered = snapshot.classes.find((c) => c.courseCode === "COMP6445" && c.sessionId.startsWith("2027"));
    expect(offered, "COMP6445 has a 2027 class").toBeDefined();
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: offered!.sessionId, classNumbers: [offered!.classNumber] });
    expect(body.outcomes[0].ok).toBe(false);
    expect(body.outcomes[0].message).toContain("you've already completed COMP6445 (First Semester 2026, D)");
  });

  it("keeps the classes before a batch crosses 24 units and refuses the rest", async () => {
    const five = singleClassCourses(S1, 5);
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: five.map((c) => c.classNumber) });
    expect(body.outcomes.map((o) => o.ok)).toEqual([true, true, true, true, false]);
    expect(body.outcomes[4].message).toContain("Going over 24 units needs an Overload request through Manage my Degree");
    expect(body.view.sessions.find((s) => s.id === S1)).toMatchObject({ classCount: 4, units: 24 });
  });

  it("allows COMP8800 a second take", async () => {
    const v = new Visitor();
    const first = await v.postJson<WriteResponse>("/api/enrol", { session: S1, entry: "COMP8800" });
    const second = await v.postJson<WriteResponse>("/api/enrol", { session: "2027-S2", entry: "COMP8800" });
    expect(first.body.outcomes[0].ok).toBe(true);
    expect(second.body.outcomes[0].ok).toBe(true);
    expect(sidebar(second.body.view, "COMP8800").text).toBe("Enrolled · First Semester 2027 (1 of 2), Second Semester 2027 (2 of 2)");
  });

  it("warns, without refusing, when the course's career differs from the program's", async () => {
    const ug = snapshot.classes.find((c) => c.sessionId === S1 && snapshot.courses.find((k) => k.code === c.courseCode)?.career === "UGRD" && classesOf(c.courseCode, S1).length === 1);
    expect(ug, "an undergraduate course with one First Semester 2027 class").toBeDefined();
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: [ug!.classNumber] });
    expect(body.outcomes[0]).toMatchObject({ ok: true });
    expect(body.outcomes[0].warning).toContain("undergraduate");
  });
});

describe("drop", () => {
  it("drops a class, and the requirement status reverts", async () => {
    const v = new Visitor();
    const added = await v.postJson<WriteResponse>("/api/enrol", { session: S1, entry: "COMP8800" });
    const n = added.body.outcomes[0].classNumber!;
    expect(sidebar(added.body.view, "COMP8800").text).toBe("Enrolled · First Semester 2027 (1 of 2)");
    const dropped = await v.postJson<WriteResponse>("/api/drop", { session: S1, classNumber: n });
    expect(dropped.body.outcomes[0]).toMatchObject({ ok: true, courseCode: "COMP8800" });
    expect(sidebar(dropped.body.view, "COMP8800")).toMatchObject({ text: "Not enrolled", add: { sessionId: S1, label: "Add to First Semester 2027" } });
    expect(dropped.body.view.sessions.find((s) => s.id === S1)!.enrolments.find((e) => e.classNumber === n)).toMatchObject({ state: "dropped", droppedOn: "2026-09-24", canDrop: false });
  });

  it("refuses a drop after the exam period has started", async () => {
    const done = template.enrolments.find((e) => e.courseCode === "COMP6445")!;
    const { body } = await new Visitor().postJson<WriteResponse>("/api/drop", { session: "2026-S1", classNumber: done.classNumber });
    expect(body.outcomes[0]).toMatchObject({ ok: false, message: `Not dropped: COMP6445 (class ${done.classNumber}) — self-service drop closed on 3 Jun 2026` });
  });
});

describe("batches and double submits (Review Focus 5)", () => {
  it("processes a repeated class number once", async () => {
    const [c] = singleClassCourses(S1, 1);
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: [c.classNumber, c.classNumber] });
    expect(body.outcomes).toHaveLength(1);
    expect(body.outcomes[0].ok).toBe(true);
  });

  it("enrols exactly once when two identical requests race", async () => {
    const [c] = singleClassCourses(S1, 1);
    const v = new Visitor();
    await v.postJson("/api/demo/reset", {});
    const [a, b] = await Promise.all([
      v.post("/api/enrol", { session: S1, classNumbers: [c.classNumber] }),
      v.post("/api/enrol", { session: S1, classNumbers: [c.classNumber] }),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const outcomes = [...((await a.json()) as WriteResponse).outcomes, ...((await b.json()) as WriteResponse).outcomes];
    expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
    expect(live((await v.getJson<View>("/api/view")).body, S1)).toEqual([c.classNumber]);
  });
});
```

`spec/requirements.test.ts`. Task 9 adds the page half.

```ts
import { describe, expect, it } from "vitest";
import type { View, WriteResponse } from "../src/lib/types";
import { Visitor } from "./helpers";

const status = (view: View, code: string) =>
  view.requirements.blocks.flatMap((b) => b.groups).flatMap((g) => g.courses).find((c) => c.code === code)!;

describe("F5: requirements sidebar", () => {
  it("shows Completed, Enrolled (now), Not enrolled with Add, and No classes listed for COMP6250", async () => {
    const { body: view } = await new Visitor().getJson<View>("/api/view");
    expect(status(view, "COMP6445").text).toBe("Completed · First Semester 2026 · D");
    expect(status(view, "COMP6442").text).toBe("Enrolled · Second Semester 2026 (now)");
    expect(status(view, "COMP8800")).toMatchObject({ text: "Not enrolled", times: 2, add: { sessionId: "2027-S1", label: "Add to First Semester 2027" } });
    expect(status(view, "COMP6250").text).toBe("Not enrolled · No classes listed in P&C for 2026–2027");
    expect(view.requirements.summary).toEqual({ done: 18, enrolled: 18, total: 66 });
  });

  it("shows COMP8800 Enrolled (1 of 2) and 30 units enrolled after adding it", async () => {
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2027-S1", entry: "COMP8800" });
    expect(status(body.view, "COMP8800").text).toBe("Enrolled · First Semester 2027 (1 of 2)");
    expect(body.view.requirements.summary).toEqual({ done: 18, enrolled: 30, total: 66 });
  });
});
```

`spec/api.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ApiErrorBody, View, WriteResponse } from "../src/lib/types";
import { Visitor, sandboxCount, singleClassCourses } from "./helpers";

const S1 = "2027-S1";
const live = (view: View): number[] => view.sessions.find((s) => s.id === S1)!.enrolments.filter((e) => e.state === "enrolled").map((e) => e.classNumber);

describe("API conventions", () => {
  it.each(["application/x-www-form-urlencoded", "text/plain", "application/xml"])("answers a POST sent as %s with 415", async (type) => {
    const res = await new Visitor().post("/api/enrol", "session=2027-S1&entry=COMP8800", type);
    expect(res.status).toBe(415);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("unsupported_media_type");
  });

  it.each([
    ["/api/enrol", "not JSON", "{", "bad_json", ""],
    ["/api/enrol", "an array", "[]", "bad_body", ""],
    ["/api/enrol", "no session", JSON.stringify({ entry: "COMP8800" }), "bad_field", "session"],
    ["/api/enrol", "an unknown session", JSON.stringify({ session: "2099-S9", entry: "COMP8800" }), "bad_field", "session"],
    ["/api/enrol", "a non-text entry", JSON.stringify({ session: S1, entry: 8800 }), "bad_field", "entry"],
    ["/api/enrol", "bad class numbers", JSON.stringify({ session: S1, classNumbers: ["x"] }), "bad_field", "classNumbers"],
    ["/api/enrol", "an empty class-number list", JSON.stringify({ session: S1, classNumbers: [] }), "bad_field", "classNumbers"],
    ["/api/enrol", "both entry and classNumbers", JSON.stringify({ session: S1, entry: "COMP8800", classNumbers: [1] }), "bad_field", "entry"],
    ["/api/drop", "no class number", JSON.stringify({ session: S1 }), "bad_field", "classNumber"],
    ["/api/demo/reset", "a non-text programCode", JSON.stringify({ programCode: 7 }), "bad_field", "programCode"],
    ["/api/demo/reset", "a program without a demo student", JSON.stringify({ programCode: "NOPE" }), "bad_field", "programCode"],
  ])("%s: answers %s with 400 naming the field", async (path, _what, raw, code, field) => {
    const res = await new Visitor().post(path, raw);
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorBody;
    expect(body.error.code).toBe(code);
    expect(body.error.message).toContain(field);
  });
});

describe("sandbox", () => {
  it("keeps two cookie jars' enrolments apart", async () => {
    const [c] = singleClassCourses(S1, 1);
    const a = new Visitor();
    const b = new Visitor();
    await a.postJson<WriteResponse>("/api/enrol", { session: S1, classNumbers: [c.classNumber] });
    await b.postJson<WriteResponse>("/api/demo/reset", {});
    expect(a.sid).not.toBe(b.sid);
    expect(live((await a.getJson<View>("/api/view")).body)).toEqual([c.classNumber]);
    expect(live((await b.getJson<View>("/api/view")).body)).toEqual([]);
  });

  it("writes no student row for a GET without a cookie", async () => {
    const before = sandboxCount();
    const v = new Visitor();
    for (const path of ["/", "/api/view", "/api/catalogue?session=2027-S1"]) {
      const res = await v.get(path);
      expect(res.headers.getSetCookie()).toEqual([]);
    }
    expect(sandboxCount()).toBe(before);
  });

  it("gives a forged or stale cookie a fresh sandbox on its first write (Review Focus 3)", async () => {
    for (const forged of ["not-a-token", "a".repeat(32), "%00", "x".repeat(4000)]) {
      const v = new Visitor(forged);
      expect((await v.get("/api/view")).status).toBe(200);
      const { status } = await v.postJson<WriteResponse>("/api/demo/reset", {});
      expect(status).toBe(200);
      expect(v.sid).not.toBe(forged);
      expect(v.sid).toMatch(/^[A-Za-z0-9_-]{32}$/);
    }
  });
});

describe("D6: every course fact traces to the snapshot", () => {
  it.todo("every course code and class number on / exists in the committed snapshot");
});
```

Run: `pnpm test`. Expected: the new tests FAIL (404s from the missing routes), and everything else passes.

- [ ] **Step 2: Write `src/lib/enrol.ts`**

```ts
import { and, eq } from "drizzle-orm";
import { chooserFor } from "./catalogue";
import { db } from "./db";
import { parseEntry } from "./entry";
import { fmtDate, fmtUnits } from "./format";
import { classKey, ref } from "./ref";
import * as t from "./schema";
import { canAdd, canDrop, dropDeadline } from "./sessions";
import type { Career, Chooser, Outcome } from "./types";
import { enrolmentRecords, SEMESTER_CAP, takeState } from "./view";

// Enrol and drop (spec §6.3, §9). Every class gets its own outcome. A batch
// runs in one SQLite transaction that re-checks the rules against the rows
// as they stand, so one failure never blocks the others, and two tabs can't
// double-enrol.

export type EntryResolution =
  | { kind: "classes"; classNumbers: number[] }
  | { kind: "choose"; chooser: Chooser }
  | { kind: "error"; message: string };

function sessionNames(ids: string[]): string {
  const names = ids.map((id) => ref().sessionById.get(id)!.name);
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Turns what was typed into the classes to enrol, a chooser, or the message to show under the input. */
export function resolveEntry(raw: string, sessionId: string, today: string): EntryResolution {
  const r = ref();
  const session = r.sessionById.get(sessionId)!;
  const entry = parseEntry(raw);
  if (entry.kind === "invalid") return { kind: "error", message: "Enter a class number (digits) or a course code like COMP1100." };
  if (entry.kind === "class") {
    if (r.classByKey.has(classKey(sessionId, entry.number))) return { kind: "classes", classNumbers: [entry.number] };
    const elsewhere = r.sessionsOfClassNumber.get(entry.number) ?? [];
    return {
      kind: "error",
      message: elsewhere.length > 0 ? `${entry.number} is a ${sessionNames(elsewhere)} class number, not ${session.name}` : `There's no class ${entry.number} in the prototype's catalogue`,
    };
  }
  if (!r.courseByCode.has(entry.code)) return { kind: "error", message: `${entry.code} isn't in the prototype's catalogue` };
  const all = r.classesByCourse.get(entry.code) ?? [];
  const here = all.filter((c) => c.sessionId === sessionId);
  if (here.length === 1) return { kind: "classes", classNumbers: [here[0].classNumber] };
  if (here.length > 1) return { kind: "choose", chooser: chooserFor(entry.code, sessionId, today)! };
  const next = all.find((c) => canAdd(c, today));
  const tail = next
    ? `Next offered: ${r.sessionById.get(next.sessionId)!.name}.`
    : all.length > 0
      ? "No other open classes listed in P&C for 2026–2027."
      : "No classes listed in P&C for 2026–2027.";
  return { kind: "error", message: `${entry.code} isn't offered in ${session.name}. ${tail}` };
}

const CAREER: Record<Career, string> = { UGRD: "undergraduate", PGRD: "postgraduate", RSCH: "research" };
const refused = (courseCode: string | null, classNumber: number, message: string): Outcome => ({ ok: false, courseCode, classNumber, message, warning: null });

/** Enrols each class in turn, in one transaction (spec §9). Repeated class numbers are processed once. */
export function enrolClasses(student: { id: number; programCareer: Career }, sessionId: string, classNumbers: number[], today: string): Outcome[] {
  const r = ref();
  const session = r.sessionById.get(sessionId)!;
  return db.transaction(() =>
    [...new Set(classNumbers)].map((n): Outcome => {
      const cls = r.classByKey.get(classKey(sessionId, n));
      if (!cls) {
        const elsewhere = r.sessionsOfClassNumber.get(n) ?? [];
        return refused(null, n, `Not added: class ${n} — ${elsewhere.length > 0 ? `it's a ${sessionNames(elsewhere)} class number, not ${session.name}` : "it isn't in the prototype's catalogue"}`);
      }
      const course = r.courseByCode.get(cls.courseCode)!;
      const label = `${course.code} (class ${n})`;
      if (!canAdd(cls, today)) return refused(course.code, n, `Not added: ${label} — the last day to enrol was ${fmtDate(cls.lastDayToEnrol)}`);
      const mine = enrolmentRecords(student.id, r);
      const here = mine.filter((e) => e.status === "enrolled" && e.sessionId === sessionId);
      if (here.some((e) => e.classNumber === n)) return refused(course.code, n, `Not added: ${label} — you're already enrolled in this class`);
      if (here.some((e) => e.course.code === course.code && (e.cls.topic ?? "") === (cls.topic ?? ""))) {
        return refused(course.code, n, `Not added: ${label} — you're already enrolled in ${course.code} in ${session.name}`);
      }
      const completed = mine.filter((e) => e.course.code === course.code && takeState(e, today) === "completed");
      if (completed.length >= course.maxTakes) {
        const last = completed[completed.length - 1];
        return refused(course.code, n, `Not added: ${label} — you've already completed ${course.code} (${last.session.name}${last.grade ? `, ${last.grade}` : ""})`);
      }
      if (session.kind === "semester" && here.reduce((sum, e) => sum + e.course.units, 0) + course.units > SEMESTER_CAP) {
        return refused(course.code, n, `Not added: ${label} — Going over 24 units needs an Overload request through Manage my Degree`);
      }
      try {
        db.insert(t.enrolments).values({ studentId: student.id, sessionId, classNumber: n, status: "enrolled", grade: null, enrolledOn: today, droppedOn: null }).run();
      } catch (err) {
        // The partial unique index is the backstop behind the check above.
        if (String(err).includes("UNIQUE")) return refused(course.code, n, `Not added: ${label} — you're already enrolled in this class`);
        throw err;
      }
      const warning = course.career === student.programCareer
        ? null
        : `${course.code} is a ${CAREER[course.career]} course and your program is ${CAREER[student.programCareer]}, so it may not count towards your degree.`;
      return { ok: true, courseCode: course.code, classNumber: n, message: `Enrolled: ${course.code} ${course.title} (class ${n}, ${fmtUnits(course.units)})`, warning };
    }),
  );
}

/** Drops one class, if ANU's self-service rule still allows it (spec §5.3). */
export function dropClass(studentId: number, sessionId: string, classNumber: number, today: string): Outcome {
  const r = ref();
  const session = r.sessionById.get(sessionId)!;
  return db.transaction(() => {
    const row = db
      .select()
      .from(t.enrolments)
      .where(and(eq(t.enrolments.studentId, studentId), eq(t.enrolments.sessionId, sessionId), eq(t.enrolments.classNumber, classNumber), eq(t.enrolments.status, "enrolled")))
      .get();
    if (!row) return refused(null, classNumber, `Not dropped: you aren't enrolled in class ${classNumber} in ${session.name}`);
    const cls = r.classByKey.get(classKey(sessionId, classNumber))!;
    const course = r.courseByCode.get(cls.courseCode)!;
    if (!canDrop(cls, session, today)) {
      return refused(course.code, classNumber, `Not dropped: ${course.code} (class ${classNumber}) — self-service drop closed on ${fmtDate(dropDeadline(cls, session))}`);
    }
    db.update(t.enrolments).set({ status: "dropped", droppedOn: today }).where(eq(t.enrolments.id, row.id)).run();
    return { ok: true, courseCode: course.code, classNumber, message: `Dropped: ${course.code} ${course.title} (class ${classNumber})`, warning: null };
  });
}
```

- [ ] **Step 3: Write the three POST routes**

`src/pages/api/enrol.ts`:

```ts
import type { APIRoute } from "astro";
import { today } from "../../lib/clock";
import { enrolClasses, resolveEntry } from "../../lib/enrol";
import { ApiError, handle, json, readBody, sessionIdField } from "../../lib/http";
import { ref } from "../../lib/ref";
import { sandboxFor, studentFor } from "../../lib/student";
import { buildView } from "../../lib/view";

// POST {session, entry} or {session, classNumbers} (spec §4.2). A course
// with several classes answers {choose} and changes nothing; a problem with
// the entry itself answers 422; otherwise {outcomes, view}.
export const POST: APIRoute = ({ request, cookies }) =>
  handle(async () => {
    const body = await readBody(request);
    const r = ref();
    const sessionId = sessionIdField(body.session, "session", (id) => r.sessionById.has(id));
    const hasEntry = body.entry !== undefined;
    if (hasEntry === (body.classNumbers !== undefined)) throw new ApiError(400, "bad_field", "Send either entry (text) or classNumbers (a list), not both.");

    let classNumbers: number[];
    if (hasEntry) {
      if (typeof body.entry !== "string" || body.entry.length > 100) throw new ApiError(400, "bad_field", "entry must be text: a class number or a course code.");
      const resolved = resolveEntry(body.entry, sessionId, today(studentFor(cookies)));
      if (resolved.kind === "error") throw new ApiError(422, "entry", resolved.message);
      if (resolved.kind === "choose") return json({ choose: resolved.chooser });
      classNumbers = resolved.classNumbers;
    } else {
      const ns = body.classNumbers;
      if (!Array.isArray(ns) || ns.length === 0 || ns.length > 50 || !ns.every((n) => Number.isInteger(n) && n > 0 && n < 1_000_000)) {
        throw new ApiError(400, "bad_field", "classNumbers must be a list of 1 to 50 class numbers.");
      }
      classNumbers = ns as number[];
    }

    const student = sandboxFor(cookies);
    const outcomes = enrolClasses({ id: student.id, programCareer: r.plans.get(student.programCode)!.career }, sessionId, classNumbers, today(student));
    return json({ outcomes, view: buildView(student) });
  });
```

`src/pages/api/drop.ts`:

```ts
import type { APIRoute } from "astro";
import { today } from "../../lib/clock";
import { dropClass } from "../../lib/enrol";
import { ApiError, handle, json, readBody, sessionIdField } from "../../lib/http";
import { ref } from "../../lib/ref";
import { sandboxFor } from "../../lib/student";
import { buildView } from "../../lib/view";

// POST {session, classNumber} → {outcomes, view} (spec §4.2).
export const POST: APIRoute = ({ request, cookies }) =>
  handle(async () => {
    const body = await readBody(request);
    const sessionId = sessionIdField(body.session, "session", (id) => ref().sessionById.has(id));
    const n = body.classNumber;
    if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) throw new ApiError(400, "bad_field", "classNumber must be a class number.");
    const student = sandboxFor(cookies);
    const outcome = dropClass(student.id, sessionId, n, today(student));
    return json({ outcomes: [outcome], view: buildView(student) });
  });
```

`src/pages/api/demo/reset.ts`:

```ts
import type { APIRoute } from "astro";
import { DEFAULT_PROGRAM } from "../../../data/templates";
import { ApiError, handle, json, readBody } from "../../../lib/http";
import { resetSandbox } from "../../../lib/student";
import { buildView } from "../../../lib/view";

// POST {programCode?} → {outcomes, view}: this browser's sandbox becomes a
// fresh copy of that program's template student (spec §4.2, §11.3).
export const POST: APIRoute = ({ request, cookies }) =>
  handle(async () => {
    const body = await readBody(request);
    const programCode = body.programCode ?? DEFAULT_PROGRAM;
    if (typeof programCode !== "string") throw new ApiError(400, "bad_field", "programCode must be a program code such as 7722XVCOMP.");
    const student = resetSandbox(cookies, programCode);
    const message = `Demo reset: you're ${student.name} (${student.uid}) again, with the starting enrolments.`;
    return json({ outcomes: [{ ok: true, message, warning: null, courseCode: null, classNumber: null }], view: buildView(student) });
  });
```

- [ ] **Step 4: Run the full check**

Run: `pnpm check`

Expected: PASS, including `spec/enrol.test.ts`, `spec/requirements.test.ts` and `spec/api.test.ts`. The D6 test stays todo.

Premise failures are fixed where they point:

- **"the snapshot supports these fixtures" fails.** P&C disagrees with the spec's examples. Pick the real equivalent from the snapshot, update the test and the spec's example, and record it in the plan's Progress notes.
- **The topic test is skipped.** No 2027 course has classes of different topics. That's acceptable; say so in PROCESS.md.

- [ ] **Step 5: Commit**

```bash
git add src/lib/enrol.ts src/pages/api/ spec/
git commit -m "feat: enrol (class number, course code, chooser), drop and reset API, with the rules and contract tests" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

### Task 9: P3 — the SPA shell: server-rendered, hydrated, sessions and sidebar

**Files:**
- Create:
  - `src/app/url.ts`, `src/app/url.test.ts`, `src/app/api.ts`, `src/app/store.ts`, `src/app/EnrolmentApp.tsx`
  - `src/app/components/{SiteNav,Notices,SessionList,SessionRow,EnrolmentDetails,ClassRow,RequirementsSidebar}.tsx`
  - `src/app/fixtures.ts`, `src/app/hydration.test.tsx`
- Modify: `src/pages/index.astro` (replace), `src/pages/readme.astro` (body class), `src/styles.css` (replace), `spec/routes.ts`
- Test: `spec/sessions.test.ts` (replace the todos), `spec/requirements.test.ts` (add the page test), `spec/api.test.ts` (replace the D6 todo), `spec/urls.test.ts` (replace the todo)

**Interfaces:**
- Consumes:
  - all the Task 6 types;
  - `buildView`, `studentFor`, `catalogueFor`, `chooserFor` and `facetsFor` (Task 7);
  - `fmtDate`, `fmtRange`, `fmtUnits` (Task 6).
- Produces:
  - `url.ts`:
    - `EMPTY_FILTERS`, the type `UrlContext`;
    - `parseQuery(params, ctx) → {state, problems}`, `toQuery(state, nextId)`;
    - `withSort`, `withPage`, `catalogueLink(code, browse)`, `openSessions(state, nextId)`.
  - `api.ts`:
    - `NETWORK_MESSAGE`, the type `ApiResult<T>`;
    - `getView`, `getCatalogue`, `enrolEntry`, `enrolClasses`, `dropClass`, `resetDemo`.
  - `store.ts`:
    - the types `AppState` and `Action`;
    - `init`, `reducer`, `outcomeNotices`;
    - `useEnrolment(props) → {state, actions, noticesRef}`. The actions are `setUrl`, `toggleSession`, `enrolEntry`, `enrolClasses`, `drop`, `reset`, `cancelChooser`, `refresh`, `openCatalogue`, `browseCode`, `loadCatalogue`, `retryCatalogue`.
  - `EnrolmentApp` is the default export, taking `AppProps`.
  - `fixtures.ts`: `makeView`, `urlState`, `appProps`, `S2_2026`, `S1_2027`, `POGO_CHOOSER`, `CATALOGUE`.

- [ ] **Step 1: Write the failing URL-state tests**

`src/app/url.test.ts`:

```ts
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
    const state: UrlState = { open: ["2026-S2", "2027-S1"], choose: "POGO8062", term: "2027-S1", browse: "2027-S1", filters: { ...EMPTY_FILTERS, q: "optim", subject: "COMP", sort: "level", page: 2 } };
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
```

Run: `pnpm build && pnpm vitest run src/app/url.test.ts`. Expected: FAIL, because the module is missing.

- [ ] **Step 2: Write `src/app/url.ts`**

```ts
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
    const ids = rawOpen.split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = ids.filter((id) => !known.has(id));
    if (unknown.length > 0) problems.push(ignored(unknown));
    open = [...new Set(ids.filter((id) => known.has(id)))];
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
```

Run: `pnpm vitest run src/app/url.test.ts`. Expected: PASS.

- [ ] **Step 3: Write the API client and the store**

`src/app/api.ts`:

```ts
import type { ApiErrorBody, Catalogue, ChooseResponse, View, WriteResponse } from "../lib/types";

// Typed fetch wrappers for the JSON API (spec §4.2). A network failure or a
// server error becomes the one message that promises nothing changed; a 4xx
// carries the server's own message, which is shown as written.

export const NETWORK_MESSAGE = "Couldn't reach the server, so nothing changed. Try again.";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function call<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, body === undefined
      ? { headers: { accept: "application/json" } }
      : { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, status: 0, message: NETWORK_MESSAGE };
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // not JSON: handled below
  }
  if (res.ok && data !== null) return { ok: true, data: data as T };
  const message = (data as ApiErrorBody | null)?.error?.message;
  return { ok: false, status: res.status, message: res.status >= 400 && res.status < 500 && message ? message : NETWORK_MESSAGE };
}

export const getView = () => call<View>("/api/view");
export const getCatalogue = (session: string) => call<Catalogue>(`/api/catalogue?session=${encodeURIComponent(session)}`);
export const enrolEntry = (session: string, entry: string) => call<WriteResponse | ChooseResponse>("/api/enrol", { session, entry });
export const enrolClasses = (session: string, classNumbers: number[]) => call<WriteResponse>("/api/enrol", { session, classNumbers });
export const dropClass = (session: string, classNumber: number) => call<WriteResponse>("/api/drop", { session, classNumber });
export const resetDemo = (programCode?: string) => call<WriteResponse>("/api/demo/reset", programCode ? { programCode } : {});
```

`src/app/store.ts`:

```ts
import { useMemo, useReducer, useRef } from "react";
import type { AppProps, Catalogue, Chooser, Notice, Outcome, UrlState, View, WriteResponse } from "../lib/types";
import * as api from "./api";
import { EMPTY_FILTERS, openSessions } from "./url";

// The client's state (spec §4.3): the server's view, the URL state, the
// write in flight and the notices. Writes wait for the server, with no
// optimistic updates (spec §6.6), and each successful write replaces the
// view with the one the server returns.

export interface AppState {
  view: View;
  url: UrlState;
  notices: Notice[];
  /** The control whose write is in flight ("add:2027-S1", "choose:2027-S1", "drop:2027-S1:5354", "req:COMP8800", "bulk", "reset"); null when idle. */
  pending: string | null;
  chooser: Chooser | null;
  /** Per session, the message under its "Class number or course code" input. */
  entryErrors: Record<string, string>;
  /** Catalogues fetched this visit, by session (spec §6.4). */
  catalogues: Record<string, Catalogue>;
  loadingCatalogue: string | null;
  catalogueFailed: string | null;
}

export type Action =
  | { type: "url"; patch: Partial<UrlState> }
  | { type: "toggleSession"; sessionId: string; open: boolean }
  | { type: "pending"; key: string | null }
  | { type: "written"; view: View; notices: Notice[] }
  | { type: "view"; view: View }
  | { type: "notices"; notices: Notice[] }
  | { type: "chooser"; chooser: Chooser | null }
  | { type: "entryError"; sessionId: string; message: string | null }
  | { type: "loadingCatalogue"; sessionId: string }
  | { type: "catalogue"; catalogue: Catalogue }
  | { type: "catalogueFailed"; sessionId: string | null };

export function init(props: AppProps): AppState {
  return {
    view: props.view,
    url: props.url,
    notices: props.notices,
    pending: null,
    chooser: props.chooser,
    entryErrors: {},
    catalogues: props.catalogue ? { [props.catalogue.sessionId]: props.catalogue } : {},
    loadingCatalogue: null,
    catalogueFailed: null,
  };
}

/** A view for another date makes cached catalogues stale, because their canAdd was computed for the old date. */
const keepCatalogues = (state: AppState, view: View): Record<string, Catalogue> => (view.today === state.view.today ? state.catalogues : {});

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "url": {
      const url = { ...state.url, ...action.patch };
      return { ...state, url, catalogueFailed: url.browse === state.url.browse ? state.catalogueFailed : null };
    }
    case "toggleSession": {
      const open = openSessions(state.url, state.view.nextSemesterId);
      const next = action.open ? [...new Set([...open, action.sessionId])] : open.filter((id) => id !== action.sessionId);
      return { ...state, url: { ...state.url, open: next } };
    }
    case "pending":
      return { ...state, pending: action.key };
    case "written":
      return { ...state, view: action.view, notices: action.notices, catalogues: keepCatalogues(state, action.view) };
    case "view":
      return { ...state, view: action.view, catalogues: keepCatalogues(state, action.view) };
    case "notices":
      return { ...state, notices: action.notices };
    case "chooser":
      return { ...state, chooser: action.chooser };
    case "entryError": {
      const entryErrors = { ...state.entryErrors };
      if (action.message) entryErrors[action.sessionId] = action.message;
      else delete entryErrors[action.sessionId];
      return { ...state, entryErrors };
    }
    case "loadingCatalogue":
      return { ...state, loadingCatalogue: action.sessionId };
    case "catalogue":
      return { ...state, catalogues: { ...state.catalogues, [action.catalogue.sessionId]: action.catalogue }, loadingCatalogue: null };
    case "catalogueFailed":
      return { ...state, catalogueFailed: action.sessionId, loadingCatalogue: null };
  }
}

/** One notice per class, then its warning, if any (spec §6.3). */
export function outcomeNotices(outcomes: Outcome[]): Notice[] {
  return outcomes.flatMap((o): Notice[] => [
    { tone: o.ok ? "ok" : "error", text: o.message },
    ...(o.warning ? [{ tone: "warning" as const, text: o.warning }] : []),
  ]);
}

export function useEnrolment(props: AppProps) {
  const [state, dispatch] = useReducer(reducer, props, init);
  const latest = useRef(state);
  latest.current = state;
  const noticesRef = useRef<HTMLElement | null>(null);

  const actions = useMemo(() => {
    // After a write, focus moves to the notices, which list one outcome per class (spec §6.6).
    const focusNotices = (): void => noticesRef.current?.focus();
    const failed = (message: string): void => {
      dispatch({ type: "notices", notices: [{ tone: "error", text: message }] });
      focusNotices();
    };
    const written = (data: WriteResponse): void => {
      dispatch({ type: "written", view: data.view, notices: outcomeNotices(data.outcomes) });
      focusNotices();
    };
    /** Runs one write. Writes are serialised: while one is in flight, another click does nothing (spec §6.6). */
    async function write<T>(key: string, call: () => Promise<api.ApiResult<T>>): Promise<api.ApiResult<T> | null> {
      if (latest.current.pending !== null) return null;
      latest.current = { ...latest.current, pending: key };
      dispatch({ type: "pending", key });
      try {
        return await call();
      } finally {
        dispatch({ type: "pending", key: null });
      }
    }
    const closeChooser = (): void => {
      dispatch({ type: "chooser", chooser: null });
      dispatch({ type: "url", patch: { choose: null, term: null } });
    };

    return {
      setUrl(patch: Partial<UrlState>): void {
        dispatch({ type: "url", patch });
      },
      toggleSession(sessionId: string, open: boolean): void {
        dispatch({ type: "toggleSession", sessionId, open });
      },

      /** Add by class number or course code (F1). Resolves to what happened, so the input knows whether to clear. */
      async enrolEntry(sessionId: string, entry: string, key = `add:${sessionId}`): Promise<"enrolled" | "choose" | "error"> {
        dispatch({ type: "entryError", sessionId, message: null });
        const r = await write(key, () => api.enrolEntry(sessionId, entry));
        if (!r) return "error";
        if (!r.ok) {
          if (r.status === 422 && key.startsWith("add:")) dispatch({ type: "entryError", sessionId, message: r.message });
          else failed(r.message);
          return "error";
        }
        if ("choose" in r.data) {
          const { choose } = r.data;
          dispatch({ type: "chooser", chooser: choose });
          dispatch({ type: "toggleSession", sessionId: choose.sessionId, open: true });
          dispatch({ type: "url", patch: { choose: choose.course.code, term: choose.sessionId } });
          return "choose";
        }
        written(r.data);
        return "enrolled";
      },

      async enrolClasses(sessionId: string, classNumbers: number[], key: string): Promise<boolean> {
        const r = await write(key, () => api.enrolClasses(sessionId, classNumbers));
        if (!r) return false;
        if (!r.ok) {
          failed(r.message);
          return false;
        }
        if (key.startsWith("choose:")) closeChooser();
        written(r.data);
        return true;
      },

      async drop(sessionId: string, classNumber: number): Promise<void> {
        const r = await write(`drop:${sessionId}:${classNumber}`, () => api.dropClass(sessionId, classNumber));
        if (r?.ok) written(r.data);
        else if (r) failed(r.message);
      },

      async reset(programCode?: string): Promise<void> {
        const r = await write("reset", () => api.resetDemo(programCode));
        if (r?.ok) {
          closeChooser();
          written(r.data);
        } else if (r) {
          failed(r.message);
        }
      },

      /** Cancel returns focus to the session's input (spec §6.6). */
      cancelChooser(): void {
        const sessionId = latest.current.chooser?.sessionId;
        closeChooser();
        if (sessionId) setTimeout(() => document.getElementById(`entry-${sessionId}`)?.focus(), 0);
      },

      /** A stale tab catches up when it's shown again (spec §6.6). */
      async refresh(): Promise<void> {
        if (latest.current.pending !== null) return;
        const r = await api.getView();
        if (r.ok && latest.current.pending === null) dispatch({ type: "view", view: r.data });
      },

      openCatalogue(sessionId: string): void {
        dispatch({ type: "url", patch: { browse: sessionId, filters: { ...latest.current.url.filters, page: 1 } } });
      },

      /** The sidebar's course link, handled in place: the catalogue filtered to that code (spec §6.5). */
      browseCode(code: string, sessionId: string): void {
        dispatch({ type: "url", patch: { browse: sessionId, filters: { ...EMPTY_FILTERS, code } } });
        setTimeout(() => document.getElementById("browse")?.scrollIntoView?.({ block: "start" }), 0);
      },

      async loadCatalogue(sessionId: string): Promise<void> {
        if (latest.current.loadingCatalogue === sessionId) return;
        latest.current = { ...latest.current, loadingCatalogue: sessionId };
        dispatch({ type: "loadingCatalogue", sessionId });
        const r = await api.getCatalogue(sessionId);
        if (r.ok) dispatch({ type: "catalogue", catalogue: r.data });
        else dispatch({ type: "catalogueFailed", sessionId });
      },

      retryCatalogue(): void {
        dispatch({ type: "catalogueFailed", sessionId: null });
      },
    };
  }, []);

  return { state, actions, noticesRef };
}
```

- [ ] **Step 4: Write the components**

`src/app/components/SiteNav.tsx`:

```tsx
import type { StudentView } from "../../lib/types";

interface Props {
  student: StudentView;
  busy: boolean;
  resetPending: boolean;
  /** Null once M2's settings bar holds Reset (spec §11.2). */
  onReset: (() => void) | null;
}

export function SiteNav({ student, busy, resetPending, onReset }: Props) {
  return (
    <nav aria-label="Site" className="site-nav">
      <ul className="site-nav__links">
        <li>
          <a href="/" aria-current="page">Enrolment</a>
        </li>
        <li>
          <a href="/readme/">About</a>
        </li>
      </ul>
      <p className="site-nav__who">
        {student.name} · {student.uid} · {student.programShort}
        {student.planName ? ` · ${student.planName}` : ""}
      </p>
      {onReset && (
        <button type="button" className="button button--quiet" disabled={busy} onClick={onReset}>
          {resetPending ? "Resetting…" : "Reset demo"}
        </button>
      )}
    </nav>
  );
}
```

`src/app/components/Notices.tsx`:

```tsx
import type { Ref } from "react";
import type { Notice } from "../../lib/types";

// The notices region (spec §6.3, §7): polite live announcements, and
// focusable, so focus can move here after a write.
export function Notices({ notices, ref }: { notices: Notice[]; ref: Ref<HTMLElement> }) {
  return (
    <section ref={ref} className="notices" aria-label="Notices" aria-live="polite" tabIndex={-1}>
      {notices.length > 0 && (
        <ul>
          {notices.map((n, i) => (
            <li key={`${i}:${n.text}`} className={`notice notice--${n.tone}`}>
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`src/app/components/SessionRow.tsx`:

```tsx
import type { ReactNode } from "react";
import { fmtRange } from "../../lib/format";
import type { Badge, SessionView } from "../../lib/types";

const BADGE: Record<Badge, string> = { now: "Now", next: "Next", upcoming: "Upcoming", past: "Past" };

interface Props {
  session: SessionView;
  open: boolean;
  onToggle: (sessionId: string, open: boolean) => void;
  children: ReactNode;
}

// One session: a native <details> whose summary is the row (spec §6.2, D1).
export function SessionRow({ session, open, onToggle, children }: Props) {
  return (
    <details
      className={`session session--${session.badge}`}
      data-session={session.id}
      open={open}
      onToggle={(e) => {
        const isOpen = e.currentTarget.open;
        if (isOpen !== open) onToggle(session.id, isOpen);
      }}
    >
      <summary className="session__summary">
        <h3 className="session__name">{session.name}</h3>
        <span className="session__dates">{fmtRange(session.startDate, session.endDate)}</span>
        <span className={`badge badge--${session.badge}`}>{BADGE[session.badge]}</span>
        <span className="session__key-dates">{session.keyDates}</span>
      </summary>
      <div className="session__body">{children}</div>
    </details>
  );
}
```

`src/app/components/SessionList.tsx`:

```tsx
import type { ReactNode } from "react";
import type { SessionView } from "../../lib/types";
import { SessionRow } from "./SessionRow";

interface Props {
  sessions: SessionView[];
  nextSemesterId: string | null;
  open: string[];
  onToggle: (sessionId: string, open: boolean) => void;
  renderDetails: (session: SessionView) => ReactNode;
}

// The page's spine (spec D1): sessions grouped by year, earlier years folded away.
export function SessionList({ sessions, nextSemesterId, open, onToggle, renderDetails }: Props) {
  const years = (list: SessionView[]) => {
    const byYear = new Map<number, SessionView[]>();
    for (const s of list) byYear.set(s.year, [...(byYear.get(s.year) ?? []), s]);
    return [...byYear].map(([year, rows]) => (
      <div key={year} className="year-group">
        <p className="year-group__label">{year}</p>
        {rows.map((s) => (
          <SessionRow key={s.id} session={s} open={open.includes(s.id)} onToggle={onToggle}>
            {renderDetails(s)}
          </SessionRow>
        ))}
      </div>
    ));
  };
  const earlier = sessions.filter((s) => s.earlier);
  return (
    <section className="sessions" aria-labelledby="sessions-heading">
      <h2 id="sessions-heading">Sessions</h2>
      {nextSemesterId === null && <p className="sessions__note">No next semester in the loaded data (2026–2027)</p>}
      {earlier.length > 0 && (
        <details className="earlier">
          <summary>Show earlier sessions</summary>
          {years(earlier)}
        </details>
      )}
      {years(sessions.filter((s) => !s.earlier))}
    </section>
  );
}
```

`src/app/components/ClassRow.tsx`:

```tsx
import { fmtDate, fmtUnits } from "../../lib/format";
import type { EnrolmentView } from "../../lib/types";

function stateText(e: EnrolmentView): string {
  switch (e.state) {
    case "dropped":
      return `Dropped · ${fmtDate(e.droppedOn ?? e.enrolledOn)}`;
    case "completed":
      return e.grade ? `Completed · ${e.grade}` : "Completed";
    case "failed":
      return `Grade ${e.grade}`;
    default:
      return "Enrolled";
  }
}

interface Props {
  enrolment: EnrolmentView;
  busy: boolean;
  pending: boolean;
  onDrop: (e: EnrolmentView) => void;
}

// One class in a session's enrolment details: a nested <details> (spec §6.2).
export function ClassRow({ enrolment: e, busy, pending, onDrop }: Props) {
  return (
    <details className={`class class--${e.state}`} data-class={e.classNumber}>
      <summary>
        <span className="class__code">{e.courseCode}</span> <span className="class__title">{e.title}</span>
        <span className="class__meta">
          {" "}
          · class {e.classNumber} · {e.mode} · {fmtUnits(e.units)}
          {e.topic ? ` · ${e.topic}` : ""}
        </span>
        <span className="class__state">{stateText(e)}</span>
      </summary>
      <dl className="class__facts">
        <div>
          <dt>Class dates</dt>
          <dd>{fmtDate(e.startDate)} – {fmtDate(e.endDate)}</dd>
        </div>
        <div>
          <dt>Census date</dt>
          <dd>{fmtDate(e.censusDate)}</dd>
        </div>
        <div>
          <dt>Enrolled</dt>
          <dd>{fmtDate(e.enrolledOn)}</dd>
        </div>
        {e.grade && (
          <div>
            <dt>Grade</dt>
            <dd>{e.grade}</dd>
          </div>
        )}
      </dl>
      {e.canDrop && (
        <button type="button" className="button button--danger" disabled={busy} onClick={() => onDrop(e)} aria-label={`Drop ${e.courseCode} class ${e.classNumber}`}>
          {pending ? "Dropping…" : "Drop"}
        </button>
      )}
      {e.dropNote && <p className="class__note">{e.dropNote}</p>}
    </details>
  );
}
```

`src/app/components/EnrolmentDetails.tsx`:

```tsx
import type { ReactNode } from "react";
import type { EnrolmentView, SessionView } from "../../lib/types";
import { ClassRow } from "./ClassRow";

interface Props {
  session: SessionView;
  busy: boolean;
  pending: string | null;
  onDrop: (e: EnrolmentView) => void;
  /** The add area: the input, the chooser, or why adding is closed. */
  children: ReactNode;
}

// "Enrolment details", unfolded in place inside the session row (spec §6.2, F4).
export function EnrolmentDetails({ session, busy, pending, onDrop, children }: Props) {
  const units = session.cap === null ? `${session.units} units` : `${session.units} of ${session.cap} units`;
  return (
    <div className="details">
      <h4 className="details__heading">
        Enrolment details{" "}
        <span className="details__count">
          · {session.classCount} class{session.classCount === 1 ? "" : "es"} · {units}
        </span>
      </h4>
      {session.enrolments.length === 0 ? (
        <p className="details__empty">
          {session.add.open ? `No classes in ${session.name} yet. Add one below, use your requirements list, or browse classes.` : `No classes in ${session.name}.`}
        </p>
      ) : (
        <ul className="classes">
          {session.enrolments.map((e) => (
            <li key={e.id}>
              <ClassRow enrolment={e} busy={busy} pending={pending === `drop:${e.sessionId}:${e.classNumber}`} onDrop={onDrop} />
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
```

`src/app/components/RequirementsSidebar.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { CourseStatusView, GroupState, Icon, RequirementsView } from "../../lib/types";
import { catalogueLink } from "../url";

// "Your requirements" (spec §6.5, F5). Status is carried by text; the icons
// are decorative.

const ICON: Record<Icon, string> = { done: "✓", enrolled: "●", partial: "◐", todo: "○", none: "–" };
const STATE: Record<GroupState, string> = { met: "Met", "in-progress": "In progress", "not-met": "Not met" };

interface Props {
  requirements: RequirementsView;
  browseSession: string;
  busy: boolean;
  pending: string | null;
  onAdd: (course: CourseStatusView) => void;
  onBrowse: (code: string) => void;
}

function Courses({ courses, browseSession, busy, pending, onAdd, onBrowse }: Omit<Props, "requirements"> & { courses: CourseStatusView[] }) {
  return (
    <ul className="req-courses">
      {courses.map((c) => (
        <li key={c.code} className={`req-course req-course--${c.icon}`} data-course={c.code}>
          <span className="req-course__icon" aria-hidden="true">
            {ICON[c.icon]}
          </span>
          <span className="req-course__name">
            <a
              href={catalogueLink(c.code, browseSession)}
              onClick={(e) => {
                e.preventDefault();
                onBrowse(c.code);
              }}
            >
              {c.code}
            </a>
            {c.times > 1 && <span className="req-course__times"> ×{c.times}</span>}
            <span className="req-course__title"> {c.title}</span>
          </span>
          <span className="req-course__status">{c.text}</span>
          {c.add && (
            <button type="button" className="button button--small" disabled={busy} onClick={() => onAdd(c)}>
              {pending === `req:${c.code}` ? "Adding…" : c.add.label}
              <span className="visually-hidden"> ({c.code})</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function RequirementsSidebar({ requirements: req, ...rest }: Props) {
  const [open, setOpen] = useState(true);
  // Collapsed on phones (spec §6.1). This runs after hydration, so the server's HTML and the first client render agree.
  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 959px)").matches) setOpen(false);
  }, []);
  const s = req.summary;
  return (
    <aside className="requirements" aria-labelledby="requirements-heading">
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="requirements__summary">
          <h2 id="requirements-heading">Your requirements</h2>
          <span className="requirements__tally">
            Tracked: {s.done} of {s.total} units done · {s.enrolled} enrolled
          </span>
        </summary>
        <p className="requirements__who">
          {req.programName}{" "}
          <a href={req.programUrl} className="pc-link">
            P&amp;C<span className="visually-hidden"> page for {req.programName}</span>
          </a>
          {req.planName && req.planUrl && (
            <>
              {" "}· {req.planName}{" "}
              <a href={req.planUrl} className="pc-link">
                P&amp;C<span className="visually-hidden"> page for {req.planName}</span>
              </a>
            </>
          )}
        </p>
        {req.blocks.map((block) => (
          <div key={block.source} className="req-block">
            <h3>{block.title}</h3>
            {block.groups.map((g) => (
              <div key={g.id} className="req-group">
                <p className="req-group__rule">
                  <strong>{g.label}</strong> · <span className={`state state--${g.state}`}>{STATE[g.state]}</span>
                </p>
                <p className="req-group__text">{g.text}</p>
                <Courses courses={g.courses} {...rest} />
              </div>
            ))}
          </div>
        ))}
        {req.notes.length > 0 && (
          <details className="requirements__notes">
            <summary>Other rules, not tracked ({req.notes.length})</summary>
            {req.notes.map((n) => (
              <div key={n.id} className="req-note">
                {n.text.split("\n").map((line, i) => (
                  <p key={`${n.id}:${i}`}>{line}</p>
                ))}
                {n.courses.length > 0 && <Courses courses={n.courses} {...rest} />}
              </div>
            ))}
          </details>
        )}
      </details>
    </aside>
  );
}
```

- [ ] **Step 5: Write the root island and the page**

`src/app/EnrolmentApp.tsx`:

```tsx
import { useEffect } from "react";
import { fmtDate } from "../lib/format";
import type { AppProps } from "../lib/types";
import { EnrolmentDetails } from "./components/EnrolmentDetails";
import { Notices } from "./components/Notices";
import { RequirementsSidebar } from "./components/RequirementsSidebar";
import { SessionList } from "./components/SessionList";
import { SiteNav } from "./components/SiteNav";
import { useEnrolment } from "./store";
import { openSessions, toQuery } from "./url";

// The whole enrolment page as one React island (spec D13): server-rendered
// with the view, then hydrated. The landmarks are siblings, in the phone
// reading order: header (nav, h1, notices), requirements, sessions and
// browse, footer. CSS moves the requirements to the right at 960px (plan
// clarification 4).
export default function EnrolmentApp(props: AppProps) {
  const { state, actions, noticesRef } = useEnrolment(props);
  const { view, url } = state;
  const busy = state.pending !== null;
  const browseSession = view.nextSemesterId ?? view.sessions[view.sessions.length - 1]?.id ?? "";

  // The URL follows the state, so reload and shared links restore the view (spec §6.6).
  useEffect(() => {
    const target = `/${toQuery(url, view.nextSemesterId)}`;
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState(window.history.state, "", target + window.location.hash);
    }
  }, [url, view.nextSemesterId]);

  // A stale tab catches up when it's shown again (spec §6.6).
  useEffect(() => {
    const onShow = (): void => {
      if (document.visibilityState === "visible") void actions.refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [actions]);

  return (
    <div className="app">
      <header className="site-header">
        <SiteNav student={view.student} busy={busy} resetPending={state.pending === "reset"} onReset={() => void actions.reset()} />
        <h1>Enrolment</h1>
        <noscript>
          <p className="noscript">Changes need JavaScript. Without it you can still read your enrolment.</p>
        </noscript>
        <Notices ref={noticesRef} notices={state.notices} />
      </header>
      <RequirementsSidebar
        requirements={view.requirements}
        browseSession={browseSession}
        busy={busy}
        pending={state.pending}
        onAdd={(c) => {
          if (c.add) void actions.enrolEntry(c.add.sessionId, c.code, `req:${c.code}`);
        }}
        onBrowse={(code) => actions.browseCode(code, browseSession)}
      />
      <main className="primary">
        <SessionList
          sessions={view.sessions}
          nextSemesterId={view.nextSemesterId}
          open={openSessions(url, view.nextSemesterId)}
          onToggle={actions.toggleSession}
          renderDetails={(s) => (
            <EnrolmentDetails session={s} busy={busy} pending={state.pending} onDrop={(e) => void actions.drop(e.sessionId, e.classNumber)}>
              {!s.add.open && <p className="add__closed">{s.add.reason}</p>}
            </EnrolmentDetails>
          )}
        />
      </main>
      <footer className="site-footer">
        <p>
          Course data from <a href="https://programsandcourses.anu.edu.au/">Programs &amp; Courses</a>, snapshot {fmtDate(view.snapshotDate)}; session dates from
          the ANU university calendar. A COMP4020 student prototype, not an ANU service. <a href="/readme/">About this prototype</a>.
        </p>
      </footer>
    </div>
  );
}
```

`src/pages/index.astro`:

```astro
---
import EnrolmentApp from "../app/EnrolmentApp";
import { openSessions, parseQuery } from "../app/url";
import { catalogueFor, chooserFor, facetsFor } from "../lib/catalogue";
import { studentFor } from "../lib/student";
import type { AppProps } from "../lib/types";
import { buildView } from "../lib/view";
import "../styles.css";

// The whole app, server-rendered for this browser's student and hydrated
// (spec D13). It stays server-rendered, and renders the same page on POST,
// which the deploy CI's origin probe needs (spec §4.2).
const view = buildView(studentFor(Astro.cookies));
const names = new Map(view.sessions.map((s) => [s.id, s.name]));
const { state: url, problems } = parseQuery(Astro.url.searchParams, {
  sessionIds: view.sessions.map((s) => s.id),
  nextId: view.nextSemesterId,
  sessionName: (id) => names.get(id) ?? id,
  facets: (id) => {
    const f = facetsFor(id);
    return f && { subjects: f.subjects.map((s) => s.code), careers: f.careers, levels: f.levels, modes: f.modes };
  },
  canChoose: (code, term) => chooserFor(code, term, view.today) !== null,
});
const chooser = url.choose && url.term ? chooserFor(url.choose, url.term, view.today) : null;
if (chooser) url.open = [...new Set([...openSessions(url, view.nextSemesterId), chooser.sessionId])];
const props: AppProps = {
  view,
  url,
  notices: problems.map((text) => ({ tone: "info" as const, text })),
  catalogue: url.browse ? catalogueFor(url.browse, view.today) : null,
  chooser,
};
---

<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="A redesign of ANU's class enrolment page: add by class number or course code, browse every class, and see your program requirements, on one page." />
    <title>Enrolment · ANU enrolment redesign (prototype)</title>
  </head>
  <body>
    <EnrolmentApp client:load {...props} />
  </body>
</html>
```

In `src/pages/readme.astro`, change `<body>` to `<body class="readme">`.

- [ ] **Step 6: Replace the stylesheet**

`src/styles.css`:

```css
/* One stylesheet for the enrolment page and /readme/. Colours pass WCAG AA on white (checked in the browser pass, Task 12). */
:root {
  --ink: #1b1b1f;
  --muted: #53565c;
  --line: #d6d7dc;
  --paper: #ffffff;
  --wash: #f4f5f7;
  --accent: #0b5cad;
  --now: #0f5132;
  --next: #7a4e00;
  --next-wash: #fff4d6;
  --ok: #0f5132;
  --ok-wash: #e6f4ec;
  --bad: #9b1c1c;
  --bad-wash: #fdecec;
  --warn: #6b4600;
  --radius: 6px;
  color-scheme: light;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.45;
  color: var(--ink);
  background: var(--paper);
}

* { box-sizing: border-box; }
body { margin: 0; }
a { color: var(--accent); }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
h1, h2, h3, h4 { line-height: 1.2; margin: 0; }
h1 { font-size: 1.75rem; margin: 0.75rem 0 0.5rem; }
h2 { font-size: 1.25rem; }
h3 { font-size: 1.05rem; }
h4 { font-size: 0.95rem; }
.visually-hidden { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* Layout: one column in reading order; at 960px the requirements take a right-hand column (plan clarification 4). */
.app { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-areas: "demo" "header" "aside" "main" "footer"; gap: 1rem; max-width: 78rem; margin: 0 auto; padding: 0 1rem 2rem; }
.demo-bar { grid-area: demo; }
.site-header { grid-area: header; }
.requirements { grid-area: aside; }
.primary { grid-area: main; min-width: 0; display: grid; gap: 1.5rem; align-content: start; }
.site-footer { grid-area: footer; color: var(--muted); font-size: 0.875rem; border-top: 1px solid var(--line); padding-top: 0.75rem; }
@media (min-width: 960px) {
  .app { grid-template-columns: minmax(0, 1fr) 22rem; grid-template-areas: "demo demo" "header header" "main aside" "footer footer"; }
  .requirements { position: sticky; top: 1rem; align-self: start; max-height: calc(100vh - 2rem); overflow: auto; }
}

/* Nav */
.site-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--line); }
.site-nav__links { display: flex; gap: 1rem; list-style: none; margin: 0; padding: 0; font-weight: 600; }
.site-nav__links a { text-decoration: none; }
.site-nav__links a[aria-current="page"] { text-decoration: underline; text-underline-offset: 0.3em; }
.site-nav__who { margin: 0 0 0 auto; color: var(--muted); font-size: 0.9rem; }

/* Buttons */
.button { font: inherit; font-weight: 600; padding: 0.45rem 0.9rem; border-radius: var(--radius); border: 1px solid var(--accent); background: var(--accent); color: #fff; cursor: pointer; }
.button:disabled { opacity: 0.6; cursor: not-allowed; }
.button--quiet { background: var(--paper); color: var(--accent); }
.button--danger { background: var(--paper); color: var(--bad); border-color: var(--bad); }
.button--small { font-size: 0.85rem; padding: 0.25rem 0.6rem; }

/* Notices */
.notices ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
.notice { padding: 0.5rem 0.75rem; border-radius: var(--radius); border-left: 4px solid; }
.notice--ok { background: var(--ok-wash); border-color: var(--ok); }
.notice--error { background: var(--bad-wash); border-color: var(--bad); }
.notice--warning { background: var(--next-wash); border-color: var(--warn); }
.notice--info { background: var(--wash); border-color: var(--muted); }
.noscript { background: var(--next-wash); padding: 0.5rem 0.75rem; border-radius: var(--radius); }

/* Sessions */
.sessions { display: grid; gap: 0.5rem; }
.sessions__note { color: var(--muted); }
.year-group { display: grid; gap: 0.5rem; }
.year-group__label { margin: 0.75rem 0 0; font-weight: 700; color: var(--muted); }
.earlier > summary { cursor: pointer; color: var(--accent); }
.session { border: 1px solid var(--line); border-radius: var(--radius); background: var(--paper); }
.session--now { border-left: 5px solid var(--now); }
.session--next { border-left: 5px solid var(--next); }
.session__summary { cursor: pointer; padding: 0.6rem 0.75rem; }
.session__name { display: inline; margin-right: 0.5rem; }
.session__dates { color: var(--muted); margin-right: 0.5rem; }
.session__key-dates { display: block; font-size: 0.875rem; color: var(--muted); margin-top: 0.2rem; }
.session__body { padding: 0 0.75rem 0.75rem; }
.badge { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.15rem 0.5rem; border-radius: 999px; border: 1px solid; white-space: nowrap; }
.badge--now { background: var(--now); border-color: var(--now); color: #fff; }
.badge--next { background: var(--next-wash); border-color: var(--next); color: var(--next); }
.badge--upcoming { background: var(--paper); border-color: #6b6f78; color: #3f434a; }
.badge--past { background: var(--wash); border-color: var(--line); color: var(--muted); }

/* Enrolment details */
.details { display: grid; gap: 0.6rem; border-top: 1px solid var(--line); padding-top: 0.6rem; }
.details__count { font-weight: 400; color: var(--muted); }
.details__empty { margin: 0; color: var(--muted); }
.classes { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
.class { border: 1px solid var(--line); border-radius: var(--radius); padding: 0.4rem 0.6rem; background: var(--wash); }
.class > summary { cursor: pointer; }
.class__code { font-weight: 700; }
.class__meta { color: var(--muted); }
.class__state { margin-left: 0.5rem; font-size: 0.85rem; font-weight: 600; }
.class--completed .class__state { color: var(--ok); }
.class--dropped .class__state, .class--failed .class__state { color: var(--bad); }
.class__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.25rem 1rem; margin: 0.5rem 0; }
.class__facts dt { font-size: 0.8rem; color: var(--muted); }
.class__facts dd { margin: 0; }
.class__note { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--muted); }

/* Add a class and the chooser */
.add { display: grid; gap: 0.3rem; }
.add__row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.add input, .field input, .field select { font: inherit; padding: 0.4rem 0.5rem; border: 1px solid #8a8f98; border-radius: var(--radius); min-width: 0; background: var(--paper); color: var(--ink); }
.add input { flex: 1 1 14rem; }
.hint { margin: 0; font-size: 0.85rem; color: var(--muted); }
.error { margin: 0; color: var(--bad); font-weight: 600; }
.add__closed { margin: 0; color: var(--muted); }
.chooser { border: 1px solid var(--accent); border-radius: var(--radius); padding: 0.6rem 0.75rem; display: grid; gap: 0.5rem; margin: 0; }
.chooser legend { font-weight: 700; padding: 0 0.25rem; }
.chooser__classes { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
.chooser__class { display: flex; gap: 0.5rem; align-items: baseline; }
.chooser__requisites { margin: 0; font-size: 0.875rem; }
.chooser__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

/* Requirements */
.requirements { border: 1px solid var(--line); border-radius: var(--radius); padding: 0.75rem; background: var(--paper); }
.requirements__summary { cursor: pointer; }
.requirements__summary h2 { display: inline; }
.requirements__tally { display: block; font-size: 0.9rem; color: var(--muted); margin-top: 0.2rem; }
.requirements__who { font-size: 0.9rem; }
.pc-link { font-size: 0.8rem; }
.req-block { display: grid; gap: 0.5rem; margin-top: 0.75rem; }
.req-block h3 { font-size: 0.95rem; }
.req-group { display: grid; gap: 0.25rem; }
.req-group__rule, .req-group__text { margin: 0; font-size: 0.875rem; }
.req-group__text { color: var(--muted); }
.state { font-weight: 600; }
.state--met { color: var(--ok); }
.state--in-progress { color: var(--next); }
.state--not-met { color: var(--bad); }
.req-courses { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
.req-course { display: grid; grid-template-columns: 1.25rem 1fr; gap: 0 0.4rem; font-size: 0.9rem; }
.req-course > :not(.req-course__icon) { grid-column: 2; }
.req-course__icon { grid-row: 1; font-weight: 700; }
.req-course--done .req-course__icon { color: var(--ok); }
.req-course--enrolled .req-course__icon, .req-course--partial .req-course__icon { color: var(--next); }
.req-course__title { color: var(--muted); }
.req-course__status { font-size: 0.85rem; }
.req-course .button { justify-self: start; margin-top: 0.2rem; }
.requirements__notes { margin-top: 0.75rem; font-size: 0.875rem; }
.requirements__notes > summary { cursor: pointer; color: var(--accent); }
.req-note { border-top: 1px dashed var(--line); padding-top: 0.4rem; margin-top: 0.4rem; }
.req-note p { margin: 0.2rem 0; }

/* Browse */
.browse > details > summary { cursor: pointer; }
.browse > details > summary h2 { display: inline; }
.browse__scope { color: var(--muted); font-size: 0.9rem; }
.field { display: grid; gap: 0.2rem; }
.field label { font-size: 0.85rem; font-weight: 600; }
.browse__session { max-width: 20rem; margin-bottom: 0.75rem; }
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.6rem; align-items: end; margin-bottom: 0.75rem; }
.results { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); }
.results table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
.results caption { text-align: left; padding: 0.5rem 0.6rem; font-weight: 600; }
.results th, .results td { padding: 0.4rem 0.6rem; border-top: 1px solid var(--line); text-align: left; vertical-align: top; }
.results thead th { background: var(--wash); white-space: nowrap; }
.results th[aria-sort] a { font-weight: 700; }
.topic { color: var(--muted); }
.tags { display: inline-flex; flex-wrap: wrap; gap: 0.25rem; margin-left: 0.35rem; }
.tag { font-size: 0.72rem; padding: 0.05rem 0.4rem; border-radius: 999px; background: var(--wash); border: 1px solid var(--line); }
.tag--required { background: var(--next-wash); border-color: var(--next); color: var(--next); font-weight: 700; }
.tag--quiet { color: var(--muted); }
.pager { display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem; }
.bulkbar { position: sticky; bottom: 0; background: var(--paper); border-top: 2px solid var(--accent); padding: 0.6rem 0; margin-top: 0.5rem; }
.browse__failed { color: var(--bad); }

/* /readme/ */
.readme nav { max-width: 48rem; margin: 0 auto; padding: 0.75rem 1rem; display: flex; gap: 1rem; font-weight: 600; }
.readme main { max-width: 48rem; margin: 0 auto; padding: 0 1rem 2rem; }
.readme main img { max-width: 100%; height: auto; border: 1px solid var(--line); }
```

- [ ] **Step 7: Write the fixtures and the hydration test**

`src/app/fixtures.ts`:

```ts
import type { AppProps, Catalogue, CatalogueClass, Chooser, EnrolmentView, RequirementsView, SessionView, UrlState, View } from "../lib/types";
import { EMPTY_FILTERS } from "./url";

// Typed fixtures for the component tests (plan clarification 7). They follow
// the API's types, so they can't drift from what the server sends. The
// course and class values here are test data, not the app's data.

const enrolment = (patch: Partial<EnrolmentView> = {}): EnrolmentView => ({
  id: 1, sessionId: "2026-S2", classNumber: 8707, courseCode: "COMP6442", title: "Software Construction", units: 6, mode: "In Person", topic: null,
  startDate: "2026-07-27", endDate: "2026-10-30", censusDate: "2026-08-31", state: "enrolled", grade: null, enrolledOn: "2026-07-13", droppedOn: null,
  canDrop: true, dropNote: null, ...patch,
});

export const S2_2026: SessionView = {
  id: "2026-S2", name: "Second Semester 2026", kind: "semester", year: 2026, startDate: "2026-07-27", endDate: "2026-10-30", badge: "now", earlier: false,
  keyDates: "exams 5–21 Nov · add closed 3 Aug · census 31 Aug · drop without failure until 9 Oct · drop to 4 Nov",
  add: { open: false, reason: "Adding closed on 3 Aug" }, cap: 24, classCount: 1, units: 6, enrolments: [enrolment()],
};

export const S1_2027: SessionView = {
  id: "2027-S1", name: "First Semester 2027", kind: "semester", year: 2027, startDate: "2027-02-22", endDate: "2027-05-28", badge: "next", earlier: false,
  keyDates: "exams 3–19 Jun · add until 1 Mar · census 31 Mar · drop to 2 Jun", add: { open: true }, cap: 24, classCount: 0, units: 0, enrolments: [],
};

const REQUIREMENTS: RequirementsView = {
  programCode: "7722XVCOMP", programName: "Master of Computing (Advanced)", programUrl: "https://programsandcourses.anu.edu.au/2026/program/7722XVCOMP",
  planCode: "ARTIF-SPEC", planName: "Artificial Intelligence", planUrl: "https://programsandcourses.anu.edu.au/2026/specialisation/ARTIF-SPEC",
  summary: { done: 18, enrolled: 18, total: 66 },
  blocks: [{
    source: "program", title: "Program",
    groups: [{ id: 3, rule: "all", label: "All of", text: "24 units from completion of", state: "not-met", courses: [
      { code: "COMP8800", title: "Advanced Computing Research Project", units: 12, times: 2, icon: "todo", text: "Not enrolled", add: { sessionId: "2027-S1", label: "Add to First Semester 2027" } },
    ] }],
  }],
  notes: [],
};

export function makeView(patch: Partial<View> = {}): View {
  return {
    today: "2026-09-24",
    snapshotDate: "2026-09-24",
    student: { name: "Demo Student", uid: "u7000001", programCode: "7722XVCOMP", programName: "Master of Computing (Advanced)", programShort: "MCompAdv", career: "PGRD", planCode: "ARTIF-SPEC", planName: "Artificial Intelligence" },
    sessions: [S2_2026, S1_2027],
    nextSemesterId: "2027-S1",
    requirements: REQUIREMENTS,
    marks: { COMP6442: { completed: null, enrolledIn: ["2026-S2"] } },
    requiredCodes: ["COMP8800", "COMP6442"],
    ...patch,
  };
}

export const urlState = (patch: Partial<UrlState> = {}): UrlState => ({ open: null, choose: null, term: null, browse: null, filters: EMPTY_FILTERS, ...patch });

export const appProps = (patch: Partial<AppProps> = {}): AppProps => ({ view: makeView(), url: urlState(), notices: [], catalogue: null, chooser: null, ...patch });

export const POGO_CHOOSER: Chooser = {
  sessionId: "2027-S1",
  sessionName: "First Semester 2027",
  course: { code: "POGO8062", title: "A course with two classes", units: 6, career: "PGRD", requisites: null, pcUrl: "https://programsandcourses.anu.edu.au/2026/course/POGO8062" },
  classes: [
    { classNumber: 5354, mode: "In Person", topic: null, startDate: "2027-02-22", endDate: "2027-05-28", lastDayToEnrol: "2027-03-01", censusDate: "2027-03-31", canAdd: true },
    { classNumber: 5355, mode: "Online", topic: null, startDate: "2027-02-22", endDate: "2027-05-28", lastDayToEnrol: "2027-03-01", censusDate: "2027-03-31", canAdd: true },
  ],
  note: "You can enrol in one class of POGO8062 per session, unless the classes have different topics.",
};

const cls = (patch: Partial<CatalogueClass>): CatalogueClass => ({
  classNumber: 5000, courseCode: "COMP6000", subject: "COMP", catalogue: "6000", level: 6000, title: "A course", career: "PGRD", units: 6, mode: "In Person", topic: null,
  startDate: "2027-02-22", endDate: "2027-05-28", lastDayToEnrol: "2027-03-01", censusDate: "2027-03-31", description: "", requisites: null,
  pcUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP6000", canAdd: true, ...patch,
});

export const CATALOGUE: Catalogue = {
  sessionId: "2027-S1",
  sessionName: "First Semester 2027",
  indicative: true,
  today: "2026-09-24",
  classes: [
    cls({ classNumber: 5101, courseCode: "COMP8691", catalogue: "8691", level: 8000, title: "Optimisation", description: "Linear and integer optimisation methods." }),
    cls({ classNumber: 5102, courseCode: "COMP8620", catalogue: "8620", level: 8000, title: "Advanced Topics in Artificial Intelligence", description: "Search, planning and learning." }),
    cls({ classNumber: 5103, courseCode: "COMP1100", catalogue: "1100", level: 1000, career: "UGRD", title: "Programming as Problem Solving", description: "Functional programming." }),
    cls({ classNumber: 5354, courseCode: "POGO8062", subject: "POGO", catalogue: "8062", level: 8000, title: "A policy course", mode: "Online", description: "Public policy." }),
  ],
  facets: {
    subjects: [{ code: "COMP", name: "Computer Science" }, { code: "POGO", name: "Policy and Governance" }],
    careers: ["PGRD", "UGRD"],
    levels: [1000, 8000],
    modes: ["In Person", "Online"],
  },
};
```

`src/app/hydration.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, CATALOGUE, POGO_CHOOSER, urlState } from "./fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

// Server and client must render identical markup (spec §6.6): dates come
// from format.ts over ISO strings, and the client never reads its own clock.
describe("hydration", () => {
  it.each([
    ["the default page", appProps()],
    ["a page with the chooser open", appProps({ chooser: POGO_CHOOSER, url: urlState({ choose: "POGO8062", term: "2027-S1" }) })],
    ["a page with the catalogue open", appProps({ catalogue: CATALOGUE, url: urlState({ browse: "2027-S1" }) })],
  ])("hydrates %s without a mismatch warning", async (_what, props) => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<EnrolmentApp {...props} />);
    document.body.append(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <EnrolmentApp {...props} />, { onRecoverableError: (e) => recoverable.push(e) });
    });
    expect(recoverable).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm vitest run src/app/`

Expected: PASS: `url.test.ts` and the three hydration cases. The chooser and catalogue cases render nothing extra yet; they start earning their keep in Tasks 10 and 11.

If Vitest can't compile the TSX, the automatic runtime isn't configured. Add `oxc: { jsx: { runtime: "automatic", importSource: "react" } }` to the root of `vitest.config.ts`'s `defineConfig({...})` (Vite 8's transformer option), and re-run.

- [ ] **Step 8: Write the contract tests for the page**

`spec/sessions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { WriteResponse } from "../src/lib/types";
import { badgeOf, sessionRow, singleClassCourses, Visitor } from "./helpers";

const openRows = (doc: Document): (string | null)[] => [...doc.querySelectorAll("details[data-session][open]")].map((d) => d.getAttribute("data-session"));

describe("F3: sessions show dates and Now/Next", () => {
  it("lists every session with its dates; Second Semester 2026 and Winter 2026 are Now, First Semester 2027 is Next", async () => {
    const doc = await new Visitor().page("/");
    expect([...doc.querySelectorAll("details[data-session]")].map((d) => d.getAttribute("data-session"))).toEqual([
      "2026-SUM", "2026-S1", "2026-AUT", "2026-WIN", "2026-S2", "2026-SPR", "2027-SUM", "2027-S1", "2027-AUT", "2027-WIN", "2027-S2", "2027-SPR",
    ]);
    expect(badgeOf(doc, "2026-S2")).toBe("Now");
    expect(badgeOf(doc, "2026-WIN")).toBe("Now");
    expect(badgeOf(doc, "2027-S1")).toBe("Next");
    expect(badgeOf(doc, "2026-SPR")).toBe("Upcoming");
    expect(badgeOf(doc, "2026-S1")).toBe("Past");
    const summary = (id: string): string => (sessionRow(doc, id).querySelector("summary")?.textContent ?? "").replace(/\s+/g, " ");
    expect(summary("2026-S2")).toContain("27 Jul–30 Oct");
    expect(summary("2026-S2")).toContain("exams 5–21 Nov · add closed 3 Aug · census 31 Aug · drop without failure until 9 Oct · drop to 4 Nov");
    expect(summary("2027-S1")).toContain("22 Feb–28 May");
    expect(summary("2027-S1")).toContain("enrolment usually opens early December (indicative)");
    expect(summary("2026-WIN")).toContain("dates vary by class");
  });

  it("opens only the next semester's details by default", async () => {
    expect(openRows(await new Visitor().page("/"))).toEqual(["2027-S1"]);
  });

  it("reopens the sessions named in ?open=", async () => {
    expect(openRows(await new Visitor().page("/?open=2026-S2,2027-S2"))).toEqual(["2026-S2", "2027-S2"]);
  });
});

describe("F4: enrolment details unfold in place", () => {
  it("renders each session's details as a <details> element on /, not a link to another page", async () => {
    const doc = await new Visitor().page("/");
    const s2 = sessionRow(doc, "2026-S2");
    expect(s2.tagName).toBe("DETAILS");
    expect(s2.querySelector("summary h3")?.textContent).toBe("Second Semester 2026");
    expect(s2.textContent).toContain("4 classes · 24 of 24 units");
    expect(s2.querySelector('[data-class="8707"]')?.textContent).toContain("COMP6442");
    expect(s2.textContent).toContain("Adding closed on 3 Aug");
    expect(sessionRow(doc, "2027-S1").textContent).toContain("No classes in First Semester 2027 yet. Add one below, use your requirements list, or browse classes.");
  });

  it("shows a sandbox's new enrolment under its session on a fresh page load (crit: persists across reload)", async () => {
    const [target] = singleClassCourses("2027-S1", 1);
    const v = new Visitor();
    await v.postJson<WriteResponse>("/api/enrol", { session: "2027-S1", classNumbers: [target.classNumber] });
    const doc = await new Visitor(v.sid).page("/");
    const row = sessionRow(doc, "2027-S1");
    expect(row.querySelector(`[data-class="${target.classNumber}"]`)?.textContent).toContain(target.courseCode);
    expect(row.textContent).toContain("1 class · 6 of 24 units");
  });
});
```

Add to `spec/requirements.test.ts`, inside the describe:

```ts
  it("renders the sidebar on the page, with the summary, ×2, an Add button and a catalogue link", async () => {
    const doc = await new Visitor().page("/");
    const aside = doc.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(doc.getElementById(aside?.getAttribute("aria-labelledby") ?? "")?.textContent).toBe("Your requirements");
    expect(aside?.textContent).toContain("Tracked: 18 of 66 units done · 18 enrolled");
    expect(aside?.textContent).toContain("Master of Computing (Advanced)");
    expect(aside?.textContent).toContain("Artificial Intelligence");
    const comp8800 = aside?.querySelector('[data-course="COMP8800"]');
    expect(comp8800?.textContent).toContain("×2");
    expect(comp8800?.querySelector("button")?.textContent).toContain("Add to First Semester 2027");
    expect(comp8800?.querySelector("a")?.getAttribute("href")).toBe("/?browse=2027-S1&code=COMP8800");
    expect(comp8800?.querySelector('[aria-hidden="true"]')?.textContent).toBe("○");
    expect(aside?.querySelector(".requirements__notes > summary")?.textContent).toMatch(/^Other rules, not tracked \(\d+\)$/);
  });
```

In `spec/api.test.ts`, replace the D6 describe block, and add `snapshot` to its helpers import:

```ts
describe("D6: every course fact traces to the snapshot", () => {
  it("every course code and class number on / exists in the committed snapshot", async () => {
    const doc = await new Visitor().page("/?open=2026-S1,2026-S2,2027-S1");
    const known = new Set(snapshot.courses.map((c) => c.code));
    const codes = [...new Set(doc.body.textContent?.match(/\b[A-Z]{4}\d{4}\b/g) ?? [])];
    expect(codes.length).toBeGreaterThan(10);
    expect(codes.filter((c) => !known.has(c))).toEqual([]);
    for (const row of doc.querySelectorAll("details[data-session]")) {
      const sessionId = row.getAttribute("data-session");
      for (const el of row.querySelectorAll("[data-class]")) {
        const n = Number(el.getAttribute("data-class"));
        expect(snapshot.classes.some((c) => c.sessionId === sessionId && c.classNumber === n), `${sessionId} class ${n}`).toBe(true);
      }
    }
  });
});
```

`spec/urls.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Visitor } from "./helpers";

// Review Focus 1: a malformed or stale link must never produce a 500 (spec §9).
const notices = (doc: Document): string => doc.querySelector('[aria-label="Notices"]')?.textContent ?? "";

describe("malformed links to /", () => {
  it.each([
    ["/?open=2099-S9", "isn't in the prototype's data"],
    ["/?open=2026-S2,nope", "isn't in the prototype's data"],
    ["/?open=%E0%A4%A", "isn't in the prototype's data"],
  ])("renders %s with a notice", async (path, words) => {
    expect(notices(await new Visitor().page(path))).toContain(words);
  });

  it("renders an empty open list with every session closed", async () => {
    const doc = await new Visitor().page("/?open=");
    expect(doc.querySelectorAll("details[data-session][open]")).toHaveLength(0);
  });
});
```

`spec/routes.ts`:

```ts
// The routes the invariants (and axe) visit: the key server-rendered states
// of the page (spec §10). Tasks 10 and 11 add the chooser and catalogue states.
export const ROUTES = ["/", "/?open=2026-S2", "/readme/"];
```

- [ ] **Step 9: Run the full check**

Run: `pnpm check`

Expected: PASS.

- If axe flags anything on `/` or `/?open=2026-S2`, fix the markup, not the test.
- If the D6 test finds a code outside the snapshot, trace where the page got it and fix the source.

- [ ] **Step 10: Commit**

```bash
git add src/app/ src/pages/ src/styles.css spec/
git commit -m "feat: server-rendered, hydrated enrolment SPA — sessions with Now/Next, in-place details, requirements sidebar, URL state" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 10: P4 — add, choose and drop in the browser

**Files:**
- Create: `src/app/components/AddClass.tsx`, `src/app/components/ClassChooser.tsx`, `src/app/chooser.test.tsx`, `src/app/network.test.tsx`
- Modify: `src/app/EnrolmentApp.tsx` (the add area), `spec/routes.ts`, `spec/urls.test.ts`, `spec/sessions.test.ts`

**Interfaces:**
- Consumes: `useEnrolment`'s `enrolEntry`, `enrolClasses` and `cancelChooser` (Task 9); `Chooser` and `SessionView` (Task 6).
- Produces:
  - `AddClass({session, error, busy, pending, onSubmit})`, where `onSubmit(entry) → Promise<"enrolled" | "choose" | "error">`;
  - `ClassChooser({chooser, busy, pending, onAdd, onCancel})`.

- [ ] **Step 1: Write the failing component tests**

`src/app/chooser.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, makeView, POGO_CHOOSER } from "./fixtures";

const reply = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("the class chooser (F1, spec §6.3)", () => {
  it("opens for a course with several classes, takes focus, and sends both picks", async () => {
    const outcome = { ok: true, message: "Enrolled: POGO8062 A course with two classes (class 5354, 6 units)", warning: null, courseCode: "POGO8062", classNumber: 5354 };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ choose: POGO_CHOOSER })).mockResolvedValueOnce(reply({ outcomes: [outcome], view: makeView() }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);

    await user.type(screen.getByLabelText("Class number or course code"), "POGO8062");
    await user.click(screen.getByRole("button", { name: "Add" }));
    const chooser = await screen.findByRole("group", { name: /POGO8062 .* has 2 classes in First Semester 2027/ });
    const boxes = within(chooser).getAllByRole("checkbox");
    expect(boxes.map((b) => b.getAttribute("aria-label"))).toEqual(["Select POGO8062 class 5354, In Person", "Select POGO8062 class 5355, Online"]);
    expect(document.activeElement).toBe(boxes[0]);
    expect(window.location.search).toContain("choose=POGO8062");

    await user.click(boxes[0]);
    await user.click(boxes[1]);
    await user.click(within(chooser).getByRole("button", { name: "Add selected" }));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ session: "2027-S1", classNumbers: [5354, 5355] });
    expect(await screen.findByText(outcome.message)).toBeTruthy();
    expect(screen.queryByRole("group", { name: /POGO8062/ })).toBeNull();
    expect(window.location.search).not.toContain("choose=");
  });

  it("Cancel closes the chooser and returns focus to the input", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply({ choose: POGO_CHOOSER })));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.type(screen.getByLabelText("Class number or course code"), "POGO8062");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Class number or course code")));
  });

  it("shows an entry problem under the input, linked to it", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply({ error: { code: "entry", message: "COMP9999 isn't in the prototype's catalogue" } }, 422)));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    const input = screen.getByLabelText("Class number or course code");
    await user.type(input, "COMP9999");
    await user.click(screen.getByRole("button", { name: "Add" }));
    const message = await screen.findByText("COMP9999 isn't in the prototype's catalogue");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(message.id);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
```

`src/app/network.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, makeView } from "./fixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("writes wait for the server (spec §6.6, §9)", () => {
  it("shows the network notice, keeps the state, and re-enables the buttons when a request fails", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.type(screen.getByLabelText("Class number or course code"), "COMP8800");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Couldn't reach the server, so nothing changed. Try again.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Add" }) as HTMLButtonElement).disabled).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Notices" }));
    expect(document.querySelector('[data-session="2026-S2"] [data-class="8707"]')).not.toBeNull();
  });

  it("blocks other writes while one is in flight, and says what it's doing", async () => {
    let answer: (r: Response) => void = () => {};
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(new Promise<Response>((resolve) => { answer = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.type(screen.getByLabelText("Class number or course code"), "COMP8800");
    await user.click(screen.getByRole("button", { name: "Add" }));
    const busy = screen.getByRole("button", { name: "Adding…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Add to First Semester 2027/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    answer(new Response(JSON.stringify({ outcomes: [], view: makeView() }), { status: 200, headers: { "content-type": "application/json" } }));
    await screen.findByRole("button", { name: "Add" });
  });
});
```

Run: `pnpm vitest run src/app/chooser.test.tsx src/app/network.test.tsx`

Expected: FAIL, because the page has no "Class number or course code" input yet.

- [ ] **Step 2: Write `AddClass` and `ClassChooser`**

`src/app/components/AddClass.tsx`:

```tsx
import { useState } from "react";
import type { SessionView } from "../../lib/types";

interface Props {
  session: SessionView;
  error: string | null;
  busy: boolean;
  pending: boolean;
  onSubmit: (entry: string) => Promise<"enrolled" | "choose" | "error">;
}

// F1's one input (spec §6.3). The session is implicit; the server reads the entry.
export function AddClass({ session, error, busy, pending, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const id = `entry-${session.id}`;
  return (
    <form
      className="add"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if ((await onSubmit(value)) === "enrolled") setValue("");
      }}
    >
      <h4 className="add__heading">Add a class</h4>
      <label htmlFor={id}>Class number or course code</label>
      <div className="add__row">
        <input
          id={id}
          name="entry"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
          aria-invalid={error ? true : undefined}
        />
        <button type="submit" className="button" disabled={busy}>
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      <p id={`${id}-hint`} className="hint">e.g. 5099 or COMP1100</p>
      {error && (
        <p id={`${id}-error`} className="error">
          {error}
        </p>
      )}
    </form>
  );
}
```

`src/app/components/ClassChooser.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { fmtRange } from "../../lib/format";
import type { Chooser } from "../../lib/types";

interface Props {
  chooser: Chooser;
  busy: boolean;
  pending: boolean;
  onAdd: (classNumbers: number[]) => void;
  onCancel: () => void;
}

// A course's classes in one session, in place of the input (spec §6.3).
export function ClassChooser({ chooser, busy, pending, onAdd, onCancel }: Props) {
  const [picked, setPicked] = useState<number[]>([]);
  const first = useRef<HTMLInputElement>(null);
  const { code, title } = chooser.course;
  // Opening the chooser moves focus to its first class (spec §6.6).
  useEffect(() => {
    first.current?.focus();
  }, [code, chooser.sessionId]);
  const toggle = (n: number, on: boolean): void => setPicked((p) => (on ? [...p, n] : p.filter((x) => x !== n)));
  return (
    <fieldset className="chooser">
      <legend>
        {code} {title} has {chooser.classes.length} classes in {chooser.sessionName}
      </legend>
      {chooser.note && <p className="hint">{chooser.note}</p>}
      <ul className="chooser__classes">
        {chooser.classes.map((c, i) => (
          <li key={c.classNumber}>
            <label className="chooser__class">
              <input
                ref={i === 0 ? first : undefined}
                type="checkbox"
                checked={picked.includes(c.classNumber)}
                disabled={!c.canAdd}
                onChange={(e) => toggle(c.classNumber, e.target.checked)}
                aria-label={`Select ${code} class ${c.classNumber}, ${c.mode}`}
              />
              <span>
                <strong>{c.classNumber}</strong> · {c.mode} · {fmtRange(c.startDate, c.endDate)}
                {c.topic ? ` · ${c.topic}` : ""}
                {c.canAdd ? "" : " · adding closed"}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {chooser.course.requisites && (
        <p className="chooser__requisites">
          <strong>Requisites (from P&amp;C, not checked here):</strong> {chooser.course.requisites}
        </p>
      )}
      <div className="chooser__actions">
        <button type="button" className="button" disabled={busy || picked.length === 0} onClick={() => onAdd([...picked].sort((a, b) => a - b))}>
          {pending ? "Adding…" : "Add selected"}
        </button>
        <button type="button" className="button button--quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 3: Put them in the session rows**

In `src/app/EnrolmentApp.tsx`, import `AddClass` and `ClassChooser`, and replace the `EnrolmentDetails` children with:

```tsx
              {state.chooser?.sessionId === s.id ? (
                <ClassChooser
                  chooser={state.chooser}
                  busy={busy}
                  pending={state.pending === `choose:${s.id}`}
                  onAdd={(classNumbers) => void actions.enrolClasses(s.id, classNumbers, `choose:${s.id}`)}
                  onCancel={actions.cancelChooser}
                />
              ) : s.add.open ? (
                <AddClass
                  session={s}
                  error={state.entryErrors[s.id] ?? null}
                  busy={busy}
                  pending={state.pending === `add:${s.id}`}
                  onSubmit={(entry) => actions.enrolEntry(s.id, entry)}
                />
              ) : (
                <p className="add__closed">{s.add.reason}</p>
              )}
```

Run: `pnpm vitest run src/app/`. Expected: PASS, including the chooser and network tests.

- [ ] **Step 4: Cover the chooser's link state on the server**

Add to `spec/sessions.test.ts`, importing `classesOf` from `./helpers`:

```ts
describe("F1: the chooser from a link (spec §4.2)", () => {
  it("server-renders the chooser for /?choose=POGO8062&term=2027-S1, with each class named in context", async () => {
    const doc = await new Visitor().page("/?choose=POGO8062&term=2027-S1");
    const row = sessionRow(doc, "2027-S1");
    expect(row.hasAttribute("open")).toBe(true);
    const pogo = classesOf("POGO8062", "2027-S1");
    expect(row.querySelector("fieldset legend")?.textContent).toContain(`has ${pogo.length} classes in First Semester 2027`);
    expect([...row.querySelectorAll("fieldset input[type=checkbox]")].map((b) => b.getAttribute("aria-label"))).toEqual(
      pogo.map((c) => `Select POGO8062 class ${c.classNumber}, ${c.mode}`),
    );
  });
});
```

Add these cases to the `it.each` table in `spec/urls.test.ts`:

```ts
    ["/?choose=garbage", "class chooser"],
    ["/?choose=COMP8020&term=2027-S1", "class chooser"],
    ["/?choose=POGO8062&term=nope", "isn't in the prototype's data"],
```

In `spec/routes.ts`, add `"/?choose=POGO8062&term=2027-S1"` to `ROUTES`.

- [ ] **Step 5: Run the full check**

Run: `pnpm check`

Expected: PASS. The invariants and axe now also cover the chooser state.

- [ ] **Step 6: Commit**

```bash
git add src/app/ spec/
git commit -m "feat: add by class number or course code in place, the class chooser, drop; focus, pending and network handling with component tests" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 11: P5 — browse classes

**Files:**
- Create:
  - `src/lib/search.ts`, `src/lib/search.test.ts`
  - `src/app/components/{Catalogue,Filters,Results,BulkBar}.tsx`
  - `src/app/catalogue.test.tsx`
- Modify: `src/app/EnrolmentApp.tsx`, `spec/catalogue.test.ts` (replace the todos), `spec/urls.test.ts`, `spec/routes.ts`

**Interfaces:**
- Consumes:
  - `Catalogue`, `CatalogueClass`, `Filters`, `Facets` and `View` (Task 6);
  - from Task 9: `EMPTY_FILTERS` and `toQuery`, the store's `openCatalogue`, `loadCatalogue`, `retryCatalogue`, `setUrl` and `enrolClasses`, and `CATALOGUE`.
- Produces:
  - `search.ts`:
    - `PAGE_SIZE = 50`, the type `SearchResult {rows, total, page, pages}`;
    - `tokens(text)`, `matches(c, f)`, `search(classes, f)`;
    - `describeFilters(f)`, `caption(total, sessionName, f)`.
  - The components `Catalogue`, `Filters`, `Results` and `BulkBar`.

- [ ] **Step 1: Write the failing search tests**

`src/lib/search.test.ts`:

```ts
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
```

Run: `pnpm vitest run src/lib/search.test.ts`. Expected: FAIL, because the module is missing.

- [ ] **Step 2: Write `src/lib/search.ts`**

```ts
import type { CatalogueClass, Filters } from "./types";

// Catalogue filtering (spec §6.4, §4.1 a4). Pure; it runs in the browser on
// one session's classes, and on the server only for the first render of
// /?browse=…. Comparisons avoid locale-aware collation, so the server and
// the browser sort identically.

export const PAGE_SIZE = 50;

export function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
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
```

Run: `pnpm vitest run src/lib/search.test.ts`. Expected: PASS.

- [ ] **Step 3: Write the failing catalogue component test**

`src/app/catalogue.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, CATALOGUE, makeView, urlState } from "./fixtures";

const reply = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const browsing = (patch = {}) => appProps({ url: urlState({ browse: "2027-S1" }), catalogue: CATALOGUE, ...patch });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("browse classes (F2, spec §6.4)", () => {
  it("narrows the rows as the user types, and the URL follows", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
    const user = userEvent.setup();
    render(<EnrolmentApp {...browsing()} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + CATALOGUE.classes.length);
    await user.type(screen.getByLabelText("Search"), "optim");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(table.querySelector("caption")?.textContent).toBe("1 First Semester 2027 class · search “optim”");
    expect(window.location.search).toBe("?browse=2027-S1&q=optim");
  });

  it("adds the selected classes in one request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply({ outcomes: [], view: makeView() }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...browsing()} />);
    await user.click(screen.getByRole("checkbox", { name: "Select COMP8691 class 5101, In Person" }));
    await user.click(screen.getByRole("checkbox", { name: "Select COMP1100 class 5103, In Person" }));
    await user.click(screen.getByRole("button", { name: "Add 2 selected classes to First Semester 2027" }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ session: "2027-S1", classNumbers: [5103, 5101] });
  });

  it("marks what the student already has, and disables it", () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
    const view = makeView({ marks: { COMP8620: { completed: null, enrolledIn: ["2027-S1"] }, COMP1100: { completed: "Completed · First Semester 2026", enrolledIn: [] } }, requiredCodes: ["COMP8691"] });
    render(<EnrolmentApp {...browsing({ view })} />);
    const row = (n: number) => document.querySelector(`tr[data-class="${n}"]`) as HTMLTableRowElement;
    expect(row(5102).textContent).toContain("Enrolled");
    expect((within(row(5102)).getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect(row(5103).textContent).toContain("Completed · First Semester 2026");
    expect((within(row(5103)).getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect(row(5101).textContent).toContain("Required");
    expect(row(5101).textContent).toContain("Indicative");
  });

  it("fetches a session's classes when the catalogue opens", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply(CATALOGUE));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.click(screen.getByText("Browse classes"));
    expect(await screen.findByRole("table")).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/catalogue?session=2027-S1");
  });
});
```

Run: `pnpm vitest run src/app/catalogue.test.tsx`. Expected: FAIL, because there is no table yet.

- [ ] **Step 4: Write the catalogue components**

`src/app/components/Filters.tsx`:

```tsx
import type { Facets, Filters as FilterState } from "../../lib/types";
import { EMPTY_FILTERS } from "../url";

interface Props {
  filters: FilterState;
  facets: Facets;
  onChange: (filters: FilterState) => void;
}

// Every filter is optional and applies as the user types (spec §6.4).
export function Filters({ filters, facets, onChange }: Props) {
  const set = (patch: Partial<FilterState>): void => onChange({ ...filters, ...patch, page: 1 });
  const text = (key: "q" | "title" | "code" | "class", label: string, type = "text") => (
    <div className="field">
      <label htmlFor={`filter-${key}`}>{label}</label>
      <input id={`filter-${key}`} type={type} autoComplete="off" inputMode={key === "class" ? "numeric" : undefined} value={filters[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<FilterState>)} />
    </div>
  );
  const select = (key: "subject" | "career" | "level" | "mode", label: string, options: { value: string; label: string }[]) => (
    <div className="field">
      <label htmlFor={`filter-${key}`}>{label}</label>
      <select id={`filter-${key}`} value={filters[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<FilterState>)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="filters" role="search" aria-label="Filter classes">
      {text("q", "Search", "search")}
      {text("title", "Title contains")}
      {text("code", "Course code")}
      {text("class", "Class number")}
      {select("subject", "Subject area", facets.subjects.map((s) => ({ value: s.code, label: `${s.code} ${s.name}` })))}
      {select("career", "Academic career", facets.careers.map((c) => ({ value: c, label: c })))}
      {select("level", "Level", facets.levels.map((l) => ({ value: String(l), label: String(l) })))}
      {select("mode", "Mode of delivery", facets.modes.map((m) => ({ value: m, label: m })))}
      <button type="button" className="button button--quiet" onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}>
        Clear filters
      </button>
    </div>
  );
}
```

`src/app/components/Results.tsx`:

```tsx
import type { MouseEvent } from "react";
import { fmtRange } from "../../lib/format";
import { caption, type SearchResult } from "../../lib/search";
import type { Catalogue, Filters, View } from "../../lib/types";

interface Props {
  result: SearchResult;
  data: Catalogue;
  filters: Filters;
  view: View;
  selected: Set<number>;
  onSelect: (classNumber: number, on: boolean) => void;
  hrefFor: (filters: Filters) => string;
  onNavigate: (filters: Filters) => void;
}

const SORTS = { code: "Course", title: "Title", level: "Level" } as const;

// The results table (spec §6.4, §7). Sort and paging are real links that
// keep the current filters and add none; the client follows them in place.
export function Results({ result, data, filters, view, selected, onSelect, hrefFor, onNavigate }: Props) {
  const required = new Set(view.requiredCodes);
  const go = (next: Filters) => (e: MouseEvent) => {
    e.preventDefault();
    onNavigate(next);
  };
  const sortHeader = (key: keyof typeof SORTS) => {
    const next: Filters = { ...filters, sort: key, page: 1 };
    return (
      <th scope="col" aria-sort={filters.sort === key ? "ascending" : undefined}>
        <a href={hrefFor(next)} onClick={go(next)}>
          {SORTS[key]}
        </a>
      </th>
    );
  };
  const page = (n: number): Filters => ({ ...filters, page: n });
  return (
    <>
      <div className="results" role="region" aria-label="Class results" tabIndex={0}>
        <table>
          <caption>{caption(result.total, data.sessionName, filters)}</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Select</span>
              </th>
              <th scope="col">Class</th>
              {sortHeader("code")}
              {sortHeader("title")}
              <th scope="col">Career</th>
              {sortHeader("level")}
              <th scope="col">Units</th>
              <th scope="col">Mode</th>
              <th scope="col">Dates</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((c) => {
              const mark = view.marks[c.courseCode];
              const enrolledHere = mark?.enrolledIn.includes(data.sessionId) ?? false;
              const blocked = !c.canAdd || Boolean(mark?.completed) || enrolledHere;
              return (
                <tr key={c.classNumber} data-class={c.classNumber}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(c.classNumber) && !blocked}
                      disabled={blocked}
                      onChange={(e) => onSelect(c.classNumber, e.target.checked)}
                      aria-label={`Select ${c.courseCode} class ${c.classNumber}, ${c.mode}`}
                    />
                  </td>
                  <td>{c.classNumber}</td>
                  <td>
                    <a href={c.pcUrl}>{c.courseCode}</a>
                  </td>
                  <td>
                    {c.title}
                    {c.topic && <span className="topic"> — {c.topic}</span>}
                    <span className="tags">
                      {required.has(c.courseCode) && <span className="tag tag--required">Required</span>}
                      {mark?.completed && <span className="tag">{mark.completed}</span>}
                      {!mark?.completed && enrolledHere && <span className="tag">Enrolled</span>}
                      {!c.canAdd && <span className="tag">Adding closed</span>}
                      {data.indicative && <span className="tag tag--quiet">Indicative</span>}
                    </span>
                  </td>
                  <td>{c.career}</td>
                  <td>{c.level}</td>
                  <td>{c.units}</td>
                  <td>{c.mode}</td>
                  <td>{fmtRange(c.startDate, c.endDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {result.pages > 1 && (
        <nav className="pager" aria-label="Result pages">
          {result.page > 1 && (
            <a href={hrefFor(page(result.page - 1))} onClick={go(page(result.page - 1))}>
              Previous page
            </a>
          )}
          <span>
            Page {result.page} of {result.pages}
          </span>
          {result.page < result.pages && (
            <a href={hrefFor(page(result.page + 1))} onClick={go(page(result.page + 1))}>
              Next page
            </a>
          )}
        </nav>
      )}
    </>
  );
}
```

`src/app/components/BulkBar.tsx`:

```tsx
interface Props {
  count: number;
  sessionName: string;
  busy: boolean;
  pending: boolean;
  onAdd: () => void;
}

// The sticky bar that appears once anything is selected (spec §6.4).
export function BulkBar({ count, sessionName, busy, pending, onAdd }: Props) {
  if (count === 0) return null;
  return (
    <div className="bulkbar">
      <button type="button" className="button" disabled={busy} onClick={onAdd}>
        {pending ? "Adding…" : `Add ${count} selected class${count === 1 ? "" : "es"} to ${sessionName}`}
      </button>
    </div>
  );
}
```

`src/app/components/Catalogue.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { caption, search } from "../../lib/search";
import type { Catalogue as CatalogueData, Filters as FilterState, View } from "../../lib/types";
import { BulkBar } from "./BulkBar";
import { Filters } from "./Filters";
import { Results } from "./Results";

interface Props {
  view: View;
  /** The catalogue's session; null while the section is collapsed. */
  browse: string | null;
  defaultSession: string;
  filters: FilterState;
  data: CatalogueData | null;
  loading: boolean;
  failed: boolean;
  busy: boolean;
  pending: string | null;
  hrefFor: (filters: FilterState) => string;
  onOpen: (open: boolean) => void;
  onSession: (sessionId: string) => void;
  onFilters: (filters: FilterState) => void;
  onRetry: () => void;
  onAdd: (sessionId: string, classNumbers: number[]) => Promise<boolean>;
}

function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

// "Browse classes" (spec §6.4, F2): a collapsed section with its own session.
export function Catalogue(props: Props) {
  const { view, browse, filters, data } = props;
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  useEffect(() => setSelected(new Set()), [browse]);
  const result = useMemo(() => (data ? search(data.classes, filters) : null), [data, filters]);
  // The count is announced politely once typing pauses (spec §6.4).
  const announced = useSettled(data && result ? caption(result.total, data.sessionName, filters) : "", 500);
  const picked = result ? result.rows.filter((r) => selected.has(r.classNumber)).map((r) => r.classNumber) : [];
  const open = browse !== null;
  return (
    <section className="browse" id="browse" aria-labelledby="browse-heading">
      <details
        open={open}
        onToggle={(e) => {
          const isOpen = e.currentTarget.open;
          if (isOpen !== open) props.onOpen(isOpen);
        }}
      >
        <summary>
          <h2 id="browse-heading">Browse classes</h2>
        </summary>
        <p className="browse__scope">All COMP classes, plus courses named in the five programs' requirements.</p>
        <div className="field browse__session">
          <label htmlFor="browse-session">Session</label>
          <select id="browse-session" value={browse ?? props.defaultSession} onChange={(e) => props.onSession(e.target.value)}>
            {view.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {props.loading && !data && <p role="status">Loading classes…</p>}
        {props.failed && !data && (
          <p className="browse__failed">
            Couldn't load the classes.{" "}
            <button type="button" className="button button--small" onClick={props.onRetry}>
              Try again
            </button>
          </p>
        )}
        {data && result && (
          <>
            <Filters filters={filters} facets={data.facets} onChange={props.onFilters} />
            <p className="visually-hidden" aria-live="polite">
              {announced}
            </p>
            <Results
              result={result}
              data={data}
              filters={filters}
              view={view}
              selected={selected}
              onSelect={(n, on) =>
                setSelected((s) => {
                  const next = new Set(s);
                  if (on) next.add(n);
                  else next.delete(n);
                  return next;
                })
              }
              hrefFor={props.hrefFor}
              onNavigate={props.onFilters}
            />
            <BulkBar
              count={picked.length}
              sessionName={data.sessionName}
              busy={props.busy}
              pending={props.pending === "bulk"}
              onAdd={async () => {
                if (await props.onAdd(data.sessionId, picked)) setSelected(new Set());
              }}
            />
          </>
        )}
      </details>
    </section>
  );
}
```

- [ ] **Step 5: Mount the catalogue**

In `src/app/EnrolmentApp.tsx`:

1. Import `Catalogue`.
2. Add the loading effect after the other two effects.
3. Render `<Catalogue>` after `<SessionList>` inside `<main>`.

```tsx
  // A session's classes are fetched once per visit, when the catalogue shows that session (spec §6.4).
  useEffect(() => {
    const id = url.browse;
    if (id && !state.catalogues[id] && state.loadingCatalogue !== id && state.catalogueFailed !== id) void actions.loadCatalogue(id);
  }, [url.browse, state.catalogues, state.loadingCatalogue, state.catalogueFailed, actions]);
```

```tsx
        <Catalogue
          view={view}
          browse={url.browse}
          defaultSession={browseSession}
          filters={url.filters}
          data={url.browse ? (state.catalogues[url.browse] ?? null) : null}
          loading={state.loadingCatalogue !== null}
          failed={url.browse !== null && state.catalogueFailed === url.browse}
          busy={busy}
          pending={state.pending}
          hrefFor={(filters) => `/${toQuery({ ...url, browse: url.browse ?? browseSession, filters }, view.nextSemesterId)}`}
          onOpen={(isOpen) => (isOpen ? actions.openCatalogue(url.browse ?? browseSession) : actions.setUrl({ browse: null }))}
          onSession={actions.openCatalogue}
          onFilters={(filters) => actions.setUrl({ filters })}
          onRetry={actions.retryCatalogue}
          onAdd={(sessionId, classNumbers) => actions.enrolClasses(sessionId, classNumbers, "bulk")}
        />
```

Run: `pnpm vitest run src/app/ src/lib/`. Expected: PASS.

- [ ] **Step 6: Write the catalogue's contract tests**

`spec/catalogue.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { WriteResponse } from "../src/lib/types";
import { course, singleClassCourses, snapshot, Visitor } from "./helpers";

describe("F2: browse classes", () => {
  it("server-renders only matching rows for /?browse=2027-S1&subject=COMP&career=PGRD&level=8000", async () => {
    const doc = await new Visitor().page("/?browse=2027-S1&subject=COMP&career=PGRD&level=8000");
    const expected = snapshot.classes.filter((c) => c.sessionId === "2027-S1" && /^COMP8/.test(c.courseCode) && course(c.courseCode).career === "PGRD");
    const rows = [...doc.querySelectorAll(".results tbody tr")];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBe(Math.min(50, expected.length));
    for (const row of rows) {
      const cells = [...row.querySelectorAll("td")].map((td) => td.textContent?.trim());
      expect(cells[2]).toMatch(/^COMP8/);
      expect(cells[4]).toBe("PGRD");
      expect(cells[5]).toBe("8000");
    }
    expect(doc.querySelector(".results caption")?.textContent).toBe(`${expected.length} First Semester 2027 classes · subject COMP · career PGRD · level 8000`);
    expect(doc.querySelector("#browse > details")?.hasAttribute("open")).toBe(true);
  });

  it("keeps the current filters in sort and paging links and adds none", async () => {
    const doc = await new Visitor().page("/?browse=2027-S1&subject=COMP");
    const hrefs = [...doc.querySelectorAll(".results thead a, .pager a")].map((a) => a.getAttribute("href") ?? "");
    expect(hrefs).toContain("/?browse=2027-S1&subject=COMP&sort=title");
    expect(hrefs).toContain("/?browse=2027-S1&subject=COMP&sort=level");
    for (const href of hrefs) expect(href).toMatch(/^\/\?browse=2027-S1&subject=COMP(&sort=(title|level))?(&page=\d+)?$/);
  });

  it("marks completed and required courses on the server-rendered rows", async () => {
    const comp6445 = snapshot.classes.find((c) => c.courseCode === "COMP6445" && c.sessionId.startsWith("2027"));
    expect(comp6445).toBeDefined();
    const doc = await new Visitor().page(`/?browse=${comp6445?.sessionId}&code=COMP6445`);
    const row = doc.querySelector(`tr[data-class="${comp6445?.classNumber}"]`);
    expect(row?.textContent).toContain("Completed · First Semester 2026");
    expect(row?.textContent).toContain("Required");
    expect(row?.querySelector("input")?.hasAttribute("disabled")).toBe(true);
  });

  it("bulk-adds three classes in one request", async () => {
    const three = singleClassCourses("2027-S1", 3);
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2027-S1", classNumbers: three.map((c) => c.classNumber) });
    expect(body.outcomes.map((o) => o.ok)).toEqual([true, true, true]);
  });
});
```

Add these cases to the `it.each` table in `spec/urls.test.ts`:

```ts
    ["/?browse=nope", "isn't in the prototype's data"],
    ["/?browse=2027-S1&page=abc", "isn't a page number"],
    ["/?browse=2027-S1&page=-1", "isn't a page number"],
    ["/?browse=2027-S1&level=7", "level"],
    ["/?browse=2027-S1&sort=bogus", "sorted by code"],
    [`/?browse=2027-S1&q=${"x".repeat(5000)}`, "cut to 100 characters"],
```

Then add:

```ts
  it("clamps a page past the end without an error", async () => {
    const doc = await new Visitor().page("/?browse=2027-S1&page=999");
    expect(doc.querySelectorAll(".results tbody tr").length).toBeGreaterThan(0);
  });
```

In `spec/routes.ts`, set:

```ts
export const ROUTES = ["/", "/?open=2026-S2", "/?choose=POGO8062&term=2027-S1", "/?browse=2027-S1&subject=COMP", "/readme/"];
```

- [ ] **Step 7: Run the full check**

Run: `pnpm check`

Expected: PASS. axe now also covers the table, filters and pager.

- [ ] **Step 8: Commit**

```bash
git add src/lib/search.ts src/lib/search.test.ts src/app/ spec/
git commit -m "feat: browse classes — in-browser search, filters, sort and paging links, annotations, bulk add, URL sync" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 12: P6 — polish and ship M1

**Files:**
- Modify: `README.md` (replace), `PROCESS.md` (replace), `src/styles.css` (fixes found in the browser pass), and components only as the browser pass requires
- Create: `reflections/crit-7.md`, `public/readme/*.png` (before crops and after screenshots)

**Interfaces:**
- Consumes: the whole of M1.
- Produces: the deployed app at `https://comp4020-crit7-rangermix.fly.dev`, plus the process evidence.

- [ ] **Step 1: Browser pass on a local production build**

```bash
pnpm build
DATABASE_PATH="$CLAUDE_JOB_DIR/tmp/browser.db" PORT=4400 HOST=127.0.0.1 node dist/server/entry.mjs > "$CLAUDE_JOB_DIR/tmp/server.log" 2>&1 &
```

Leave `APP_TODAY` unset: this pass runs on the real Canberra date. Using the Playwright browser tools at `http://127.0.0.1:4400/`, check each of these:

1. **Core flow.**
   - Add a class by number in First Semester 2027.
   - Add POGO8062 through the chooser.
   - Open Browse classes and bulk-add two classes.
   - Drop one class.
   - Reload, and check everything is still there.
2. **Keyboard only.**
   - Tab to the First Semester 2027 input, type a code and press Enter.
   - Reach the chooser, pick with Space, add, and check focus lands on the notices.
3. **Phone width** (390 × 844). Check the order is notices → Requirements (collapsed) → Sessions → Browse, with no horizontal page scroll. The results table scrolls inside its own region.
4. **axe in a real browser**, with contrast on, on `/`, `/?browse=2027-S1` and `/?choose=POGO8062&term=2027-S1`. Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })`, then run `axe.run()`. Fix every violation.
5. **Screenshots** into `public/readme/`: `after-sessions.png`, `after-chooser.png`, `after-browse.png` and `after-phone.png`.

Stop the server afterwards.

- [ ] **Step 2: Add the "before" crops (spec D9)**

View each `.playwright-mcp/anuhub-0*.png` in the main checkout with the Read tool first, then crop each to the view being compared:

- the session list;
- the class list;
- Add Class;
- Class Search.

Keep the signed-in header (name, student ID) out of every crop. Save them as `public/readme/before-*.png`. The user approved unblurred crops of the views; nothing else from that session is committed.

- [ ] **Step 3: Rewrite the README**

`README.md` is served at `/readme/`, and `spec/readme.test.ts` checks that all of its text is there. Sections:

1. **What it is.** One paragraph, and the live URL.
2. **What changed and why.** The five functions, each against the ANUHub pain point (spec §2's table, condensed), with the before and after images.
3. **Where the data comes from.**
   - The P&C crawl: polite, cached, and run by the agent at the user's direction.
   - The provenance file (`src/data/pc/README.md`).
   - The snapshot date.
   - What's indicative.
4. **The demo student** is the only invented data, and each browser gets its own sandbox. Say how to reset it.
5. **Running it.** `pnpm install`, `pnpm dev`, `pnpm check`, and `pnpm data:fetch && pnpm data:build`.
6. **How it's built and tested**, with links to the spec, the plan, `spec/`, and the requirement golden test.

Images use `public/readme/…` paths, which `readme.astro` rewrites.

- [ ] **Step 4: Write PROCESS.md and draft the reflection**

`PROCESS.md` replaces the template.

- Keep the template's two headings: "What I built" and "How I got here".
- Tell how the work was directed:
  - brief → research;
  - spec revisions 1–3 and the user's answers, quoted;
  - plan → the tasks.
- Tell how it was grounded:
  - the read-only ANUHub look;
  - the P&C crawl and its provenance;
  - the golden test.
- Tell how it was corrected: planning clarifications 1–12, and every test that caught a real bug.
- Cite each step with links of the form ``[`<sha7>`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/<sha7>)``.

`reflections/crit-7.md` is a draft of 150–300 words answering the two prompts in `reflections/README.md`. It opens with the HTML comment `<!-- Draft by the agent from the session record: rewrite it in your own words before the cutoff. -->`, and the final report tells the user it's a draft.

Run: `pnpm check:evidence`. Expected: `✓` for CLAUDE.md, the reflection and every citation.

- [ ] **Step 5: Full check and commit**

```bash
pnpm check
git add README.md PROCESS.md reflections/crit-7.md public/readme/ src/
git commit -m "docs: README with before/after, PROCESS.md, reflection draft; browser-pass fixes" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

- [ ] **Step 6: Deploy and verify on Fly**

The Fly token is in the main checkout's `mise.local.toml`, which is gitignored and never printed. Run the deploy with that environment loaded, for example `mise exec -C <main checkout> -- flyctl deploy --remote-only --ha=false -a comp4020-crit7-rangermix`. If mise can't load it, ask the user to run the one deploy command with `!`.

Then verify with the same probes CI runs:

```bash
APP=https://comp4020-crit7-rangermix.fly.dev
curl -s -o /dev/null -w "%{http_code}\n" "$APP/"                                  # 200
curl -sN -m 15 "$APP/api/events" | head -c 12                                    # ": connected"
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Origin: $APP" -H "Content-Type: application/x-www-form-urlencoded" --data "probe=1" "$APP/"   # not 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Origin: https://cross-site.example.com" -H "Content-Type: application/x-www-form-urlencoded" --data "probe=1" "$APP/"   # 403
```

Then run the crit flow by hand:

1. Enrol through the API with a cookie jar.
2. Reload `/` with the same jar.
3. Check the class is still there.

Time the link check CI runs (spec §13), and note the time in PROCESS.md:

```bash
time pnpm dlx linkinator "$APP" --recurse --silent --skip "^(?!$APP)"
```

- [ ] **Step 7: Commit the recorded link-check time**

```bash
git add PROCESS.md
git commit -m "docs: record the deploy verification and link-check time" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

## M2 — the demo settings bar (spec §11)

Starts only after Task 12 has deployed M1 (spec D10).

### Task 13: M2-P1 — the date setting

**Files:**
- Modify:
  - server: `src/lib/schema.ts`, `src/lib/student.ts`, `src/lib/clock.ts`, `src/lib/clock.test.ts`, `src/lib/types.ts`, `src/lib/view.ts`
  - client: `src/app/api.ts`, `src/app/store.ts`, `src/app/EnrolmentApp.tsx`, `src/app/fixtures.ts`, `src/styles.css`
- Create: `drizzle/0003_*.sql` (generated), `src/pages/api/demo/settings.ts`, `src/app/components/DemoSettings.tsx`, `spec/demo.test.ts`

**Interfaces:**
- Consumes: the M1 seams (spec §11.4):
  - `today(student)` is the only date source;
  - completion is derived;
  - `enrolledOn` comes from `today(student)`;
  - the program and plan live on the student row.
- Produces:
  - `students.today` (nullable);
  - in `student.ts`: `StudentRecord.today` loaded from the row, the type `Settings {today?, programCode?, planCode?}`, and `applySettings(student, settings)`;
  - `today(student)` returns `student.today ?? realToday()`;
  - the type `DemoView`, and `View.demo`;
  - `demoRange()` in `view.ts`;
  - `POST /api/demo/settings`, taking `{today}` and answering `{outcomes, view}`;
  - `saveSettings` in `api.ts`, the store's `applySettings`, and `DemoSettings`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/clock.test.ts`, inside `describe("today")`:

```ts
  it("puts a student's demo date first (spec §11.4)", () => {
    vi.stubEnv("APP_TODAY", "2026-09-24");
    expect(today({ today: "2027-03-02" })).toBe("2027-03-02");
    expect(today({ today: null })).toBe("2026-09-24");
  });
```

`spec/demo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ApiErrorBody, View, WriteResponse } from "../src/lib/types";
import { badgeOf, Visitor } from "./helpers";

const badge = (view: View, id: string) => view.sessions.find((s) => s.id === id)?.badge;
const status = (view: View, code: string) => view.requirements.blocks.flatMap((b) => b.groups).flatMap((g) => g.courses).find((c) => c.code === code);

describe("M2: the date setting (spec §11.3)", () => {
  it("makes Spring 2026 Now at 2026-12-10, keeps First Semester 2027 Next, and survives a reload", async () => {
    const v = new Visitor();
    const { status: code, body } = await v.postJson<WriteResponse>("/api/demo/settings", { today: "2026-12-10" });
    expect(code).toBe(200);
    expect(body.view.demo).toMatchObject({ today: "2026-12-10", override: "2026-12-10", realToday: "2026-09-24", minDate: "2026-01-01", maxDate: "2027-12-31" });
    expect(badge(body.view, "2026-SPR")).toBe("now");
    expect(badge(body.view, "2027-S1")).toBe("next");
    const doc = await new Visitor(v.sid).page("/");
    expect(badgeOf(doc, "2026-SPR")).toBe("Now");
    expect(badgeOf(doc, "2027-S1")).toBe("Next");
  });

  it("at 2027-03-02 makes First Semester 2027 Now with adding closed, Second Semester 2027 Next, and COMP8620 completed without a grade", async () => {
    const { body } = await new Visitor().postJson<WriteResponse>("/api/demo/settings", { today: "2027-03-02" });
    const s1 = body.view.sessions.find((s) => s.id === "2027-S1");
    expect(s1?.badge).toBe("now");
    expect(s1?.keyDates).toContain("add closed 1 Mar");
    expect(body.view.nextSemesterId).toBe("2027-S2");
    expect(status(body.view, "COMP8620")?.text).toBe("Completed · Second Semester 2026");
    expect(body.view.sessions.find((s) => s.id === "2026-S1")?.earlier).toBe(true);
  });

  it("stamps new enrolments with the demo date", async () => {
    const v = new Visitor();
    await v.postJson<WriteResponse>("/api/demo/settings", { today: "2026-12-10" });
    const { body } = await v.postJson<WriteResponse>("/api/enrol", { session: "2027-S1", entry: "COMP8800" });
    expect(body.view.sessions.find((s) => s.id === "2027-S1")?.enrolments[0].enrolledOn).toBe("2026-12-10");
  });

  it("clears the setting with today: null, so the badges follow the real date again", async () => {
    const v = new Visitor();
    await v.postJson<WriteResponse>("/api/demo/settings", { today: "2027-03-02" });
    const { body } = await v.postJson<WriteResponse>("/api/demo/settings", { today: null });
    expect(body.view.today).toBe("2026-09-24");
    expect(body.view.demo.override).toBeNull();
    expect(badge(body.view, "2027-S1")).toBe("next");
  });

  it.each([["2025-12-31"], ["2028-01-01"], ["2026-02-30"], ["soon"], [20261210]])("refuses today = %j with 400", async (today) => {
    const { status: code, body } = await new Visitor().postJson<ApiErrorBody>("/api/demo/settings", { today });
    expect(code).toBe(400);
    expect(body.error.message).toContain("today");
  });

  it("puts the bar in a named region with no heading, so the page keeps one h1", async () => {
    const doc = await new Visitor().page("/");
    const bar = doc.querySelector('section[aria-label="Demo settings"]');
    expect(bar?.textContent).toContain("Demo settings — not part of the redesign");
    expect(bar?.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(bar?.querySelector('input[type="date"]')?.getAttribute("max")).toBe("2027-12-31");
  });
});
```

Run: `pnpm test`. Expected: the new tests FAIL; everything else passes.

- [ ] **Step 2: Add the column and its migration**

In `src/lib/schema.ts`'s `students`, after `createdAt`:

```ts
  /** M2's date setting (spec §11.3); null means the real date. */
  today: text("today"),
```

Run: `pnpm db:generate --name student_date_setting`

Expected: `drizzle/0003_student_date_setting.sql`, containing ``ALTER TABLE `students` ADD `today` text;``.

- [ ] **Step 3: Carry the setting through the student, clock and view**

`src/lib/clock.ts`: replace `today`.

```ts
/** The date a student's page is computed for: M2's date setting first, else the real date (spec §11.4). */
export function today(student?: { today?: string | null }): string {
  return student?.today ?? realToday();
}
```

In `src/lib/student.ts`:

- In `load`, set `today: row.today` and delete the "always null in M1" comment on `StudentRecord.today`.
- Add:

```ts
export interface Settings {
  today?: string | null;
  programCode?: string;
  planCode?: string;
}

/** Stores the demo settings on the sandbox (spec §11.3, S1). The enrolment history is never touched. */
export function applySettings(student: StudentRecord, settings: Settings): StudentRecord {
  db.transaction((tx) => {
    const set: { today?: string | null; programCode?: string } = {};
    if (settings.today !== undefined) set.today = settings.today;
    if (settings.programCode !== undefined) set.programCode = settings.programCode;
    if (Object.keys(set).length > 0) tx.update(t.students).set(set).where(eq(t.students.id, student.id)).run();
    if (settings.planCode !== undefined) {
      tx.delete(t.studentPlans).where(eq(t.studentPlans.studentId, student.id)).run();
      tx.insert(t.studentPlans).values({ studentId: student.id, planCode: settings.planCode }).run();
    }
  });
  return byId(student.id);
}
```

`resetSandbox` already leaves `today` alone, which gives the spec's "Reset keeps the date setting".

In `src/lib/types.ts`, add `demo: DemoView;` to `View`, and:

```ts
export interface DemoView {
  /** The date the view is computed for. */
  today: string;
  /** The sandbox's date setting; null means the real date. */
  override: string | null;
  realToday: string;
  /** The span of the loaded sessions: the date input's limits (spec §11.2). */
  minDate: string;
  maxDate: string;
  programs: { code: string; name: string; plans: { code: string; name: string }[] }[];
}
```

In `src/lib/view.ts`:

- import `realToday` from `./clock`;
- add `demoRange`;
- add `demo` to `buildView`'s result.

```ts
/** The dates the demo can be set to: the span of the loaded sessions (spec §11.2). */
export function demoRange(r: Ref = ref()): { min: string; max: string } {
  return { min: r.sessions[0].startDate, max: r.sessions.map((s) => s.endDate).sort()[r.sessions.length - 1] };
}
```

```ts
    demo: {
      today,
      override: student.today,
      realToday: realToday(),
      minDate: demoRange(r).min,
      maxDate: demoRange(r).max,
      programs: [...r.programPlans].map(([code, plans]) => ({
        code,
        name: r.plans.get(code)!.name,
        plans: plans.map((p) => ({ code: p, name: r.plans.get(p)!.name })),
      })),
    },
```

- [ ] **Step 4: Write the settings endpoint**

`src/pages/api/demo/settings.ts`:

```ts
import type { APIRoute } from "astro";
import { fmtDate } from "../../../lib/format";
import { ApiError, handle, json, readBody } from "../../../lib/http";
import { applySettings, sandboxFor, type Settings } from "../../../lib/student";
import { buildView, demoRange } from "../../../lib/view";

// POST {today?, programCode?, planCode?} → {outcomes, view} (spec §11.2).
// The settings live on this browser's sandbox (spec §11.3, S1).
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isCalendarDate = (v: string): boolean => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export const POST: APIRoute = ({ request, cookies }) =>
  handle(async () => {
    const body = await readBody(request);
    const settings: Settings = {};
    if ("today" in body) {
      const v = body.today;
      const { min, max } = demoRange();
      if (v !== null && (typeof v !== "string" || !ISO_DATE.test(v) || !isCalendarDate(v) || v < min || v > max)) {
        throw new ApiError(400, "bad_field", `today must be null (the real date) or a date from ${min} to ${max}.`);
      }
      settings.today = v as string | null;
    }
    if (Object.keys(settings).length === 0) throw new ApiError(400, "bad_field", "Send today: a date, or null for the real date.");
    const student = applySettings(sandboxFor(cookies), settings);
    const view = buildView(student);
    const message = student.today ? `Demo date set to ${fmtDate(student.today)}.` : `The demo follows the real date again (${fmtDate(view.today)}).`;
    return json({ outcomes: [{ ok: true, message, warning: null, courseCode: null, classNumber: null }], view });
  });
```

- [ ] **Step 5: Add the bar to the page**

In `src/app/api.ts`:

```ts
export const saveSettings = (settings: { today?: string | null; programCode?: string; planCode?: string }) => call<WriteResponse>("/api/demo/settings", settings);
```

In `src/app/store.ts`, add to the actions:

```ts
      async applySettings(settings: { today?: string | null; programCode?: string; planCode?: string }): Promise<void> {
        const r = await write("settings", () => api.saveSettings(settings));
        if (r?.ok) {
          closeChooser();
          written(r.data);
        } else if (r) {
          failed(r.message);
        }
      },
```

`src/app/components/DemoSettings.tsx`:

```tsx
import { useEffect, useState } from "react";
import { fmtDate } from "../../lib/format";
import type { DemoView } from "../../lib/types";

interface Props {
  demo: DemoView;
  busy: boolean;
  pending: string | null;
  onApply: (settings: { today: string | null }) => void;
}

// M2's demo settings bar (spec §11.2): crit scaffolding, labelled as not part
// of the redesign. A named region with no heading, so the page keeps one h1.
export function DemoSettings({ demo, busy, pending, onApply }: Props) {
  const [date, setDate] = useState(demo.today);
  useEffect(() => setDate(demo.today), [demo.today]);
  return (
    <section className="demo-bar" aria-label="Demo settings">
      <p className="demo-bar__label">Demo settings — not part of the redesign</p>
      <form
        className="demo-bar__form"
        onSubmit={(e) => {
          e.preventDefault();
          onApply({ today: date });
        }}
      >
        <div className="field">
          <label htmlFor="demo-date">Date</label>
          <input id="demo-date" type="date" required min={demo.minDate} max={demo.maxDate} value={date} onChange={(e) => setDate(e.target.value)} aria-describedby="demo-date-note" />
          <span id="demo-date-note" className="demo-bar__note">
            {demo.override === null ? "(real date)" : `(demo date; the real date is ${fmtDate(demo.realToday)})`}
          </span>
        </div>
        <button type="button" className="button button--quiet" disabled={busy || demo.override === null} onClick={() => onApply({ today: null })}>
          Use real date
        </button>
        <button type="submit" className="button" disabled={busy}>
          {pending === "settings" ? "Applying…" : "Apply"}
        </button>
      </form>
    </section>
  );
}
```

In `src/app/EnrolmentApp.tsx`, import `DemoSettings` and render it as the first child of `<div className="app">`:

```tsx
      <DemoSettings demo={view.demo} busy={busy} pending={state.pending} onApply={(s) => void actions.applySettings(s)} />
```

In `src/app/fixtures.ts`, add to `makeView`'s defaults:

```ts
    demo: {
      today: "2026-09-24",
      override: null,
      realToday: "2026-09-24",
      minDate: "2026-01-01",
      maxDate: "2027-12-31",
      programs: [{ code: "7722XVCOMP", name: "Master of Computing (Advanced)", plans: [{ code: "ARTIF-SPEC", name: "Artificial Intelligence" }] }],
    },
```

Append to `src/styles.css`:

```css
/* M2: the demo settings bar (spec §11.2): pinned, dashed, muted, and visibly not part of the redesign. */
.demo-bar { position: sticky; top: 0; z-index: 10; margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: #eef0f3; border: 2px dashed #6b6f78; border-radius: var(--radius); }
.demo-bar__label { margin: 0 0 0.35rem; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #3f434a; }
.demo-bar__form { display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; align-items: end; }
.demo-bar__note { font-size: 0.8rem; color: var(--muted); }
@media (min-width: 960px) {
  /* The pinned bar would cover a pinned sidebar, so the sidebar scrolls with the page once the bar exists. */
  .requirements { position: static; max-height: none; }
}
```

- [ ] **Step 6: Run the full check**

Run: `pnpm check`

Expected: PASS, including `spec/demo.test.ts`, the hydration tests (with the bar) and the invariants (the bar is a named region).

- [ ] **Step 7: Commit**

```bash
git add src/ drizzle/ spec/demo.test.ts
git commit -m "feat(m2): demo date setting — students.today, settings API, the pinned demo bar" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 14: M2-P2 — program, plan and per-program reset

**Files:**
- Modify: `src/pages/api/demo/settings.ts`, `src/app/components/DemoSettings.tsx` (replace), `src/app/EnrolmentApp.tsx`, `src/data/templates/index.ts`, `src/data/templates/README.md`, `spec/demo.test.ts`
- Create: `src/data/templates/7706XMCOMP.json`, `BCOMP.json`, `AACOM.json`, `AACRD.json`

**Interfaces:**
- Consumes:
  - `applySettings`, `resetSandbox(cookies, programCode)` and `ref().programPlans`;
  - the store's `applySettings` and `reset(programCode)`;
  - `DemoView.programs`.
- Produces:
  - `POST /api/demo/settings` also takes `{programCode, planCode}`, and answers 422 `{error: {code: "settings"}}` for a pair the program doesn't offer;
  - five template students, keyed by program (spec §11.3);
  - `DemoSettings({demo, student, busy, pending, onApply, onReset})`.

- [ ] **Step 1: Write the failing tests**

Add to `spec/demo.test.ts`, extending the helpers import with `singleClassCourses`:

```ts
describe("M2: program and plan (spec §11.3)", () => {
  it("switches to AACOM + ARIN-SPEC: their groups, the same history, and a career warning on a PG class", async () => {
    const v = new Visitor();
    const { status: code, body } = await v.postJson<WriteResponse>("/api/demo/settings", { programCode: "AACOM", planCode: "ARIN-SPEC" });
    expect(code).toBe(200);
    expect(body.view.student).toMatchObject({ programCode: "AACOM", planCode: "ARIN-SPEC", career: "UGRD" });
    expect(body.view.requirements).toMatchObject({ programCode: "AACOM", planCode: "ARIN-SPEC" });
    expect(body.view.requirements.blocks.map((b) => b.source)).toEqual(["program", "plan"]);
    expect(body.view.sessions.find((s) => s.id === "2026-S2")?.classCount).toBe(4);
    const [pg] = singleClassCourses("2027-S1", 1);
    const enrol = await v.postJson<WriteResponse>("/api/enrol", { session: "2027-S1", classNumbers: [pg.classNumber] });
    expect(enrol.body.outcomes[0].warning).toContain("postgraduate course and your program is undergraduate");
  });

  it("refuses a pair the program doesn't offer", async () => {
    const { status: code, body } = await new Visitor().postJson<ApiErrorBody>("/api/demo/settings", { programCode: "7722XVCOMP", planCode: "ARIN-SPEC" });
    expect(code).toBe(422);
    expect(body.error).toEqual({ code: "settings", message: "ARIN-SPEC isn't offered in 7722XVCOMP" });
  });

  it.each([
    [{ programCode: "NOPE", planCode: "ARIN-SPEC" }, "programCode"],
    [{ programCode: "AACOM" }, "planCode"],
    [{ programCode: "AACOM", planCode: "AACRD" }, "planCode"],
  ])("refuses %j with 400", async (settings, field) => {
    const { status: code, body } = await new Visitor().postJson<ApiErrorBody>("/api/demo/settings", settings);
    expect(code).toBe(400);
    expect(body.error.message).toContain(field);
  });
});

describe("M2: per-program reset (spec §11.3)", () => {
  it("loads BCOMP's demo student with SOFT-MAJ and keeps the date setting", async () => {
    const v = new Visitor();
    await v.postJson<WriteResponse>("/api/demo/settings", { today: "2026-12-10" });
    const { body } = await v.postJson<WriteResponse>("/api/demo/reset", { programCode: "BCOMP" });
    expect(body.view.student).toMatchObject({ uid: "u7000003", programCode: "BCOMP", planCode: "SOFT-MAJ" });
    expect(body.view.today).toBe("2026-12-10");
  });

  it("restores the M1 template for 7722XVCOMP", async () => {
    const v = new Visitor();
    await v.postJson<WriteResponse>("/api/demo/reset", { programCode: "AACOM" });
    const { body } = await v.postJson<WriteResponse>("/api/demo/reset", { programCode: "7722XVCOMP" });
    expect(body.view.student).toMatchObject({ uid: "u7000001", planCode: "ARTIF-SPEC" });
    expect(body.view.requirements.summary).toEqual({ done: 18, enrolled: 18, total: 66 });
  });

  it.each(["7722XVCOMP", "7706XMCOMP", "BCOMP", "AACOM", "AACRD"])("gives %s's demo student every status", async (programCode) => {
    const { body } = await new Visitor().postJson<WriteResponse>("/api/demo/reset", { programCode });
    const courses = body.view.requirements.blocks.flatMap((b) => b.groups).flatMap((g) => g.courses);
    expect(courses.filter((c) => c.icon === "done").length).toBeGreaterThanOrEqual(2);
    expect(courses.filter((c) => c.text.startsWith("Enrolled")).length).toBeGreaterThanOrEqual(2);
    expect(courses.some((c) => c.add?.sessionId === "2027-S1")).toBe(true);
    expect(["2026-S1", "2026-S2"].map((id) => body.view.sessions.find((s) => s.id === id)?.units)).toEqual([24, 24]);
  });
});
```

Run: `pnpm test`. Expected: the new tests FAIL. The programs 400 because the endpoint ignores program fields, and the resets 400 with "no demo student for BCOMP".

- [ ] **Step 2: Accept program and plan in the settings endpoint**

In `src/pages/api/demo/settings.ts`:

- import `ref` from `../../../lib/ref`;
- add this block after the `today` block;
- change the "nothing sent" message to `"Send today, or programCode with planCode."`.

```ts
    if ("programCode" in body || "planCode" in body) {
      const r = ref();
      const program = body.programCode;
      const plan = body.planCode;
      if (typeof program !== "string" || !r.programPlans.has(program)) throw new ApiError(400, "bad_field", "programCode must be one of the demo's five programs.");
      if (typeof plan !== "string" || r.plans.get(plan)?.kind === "program" || !r.plans.has(plan)) throw new ApiError(400, "bad_field", "planCode must be a major or specialisation code.");
      if (!r.programPlans.get(program)!.includes(plan)) throw new ApiError(422, "settings", `${plan} isn't offered in ${program}`);
      settings.programCode = program;
      settings.planCode = plan;
    }
```

Make the success message say what changed. For example: `Demo settings applied: 10 Dec 2026 · AACOM · ARIN-SPEC.`, listing only the parts that were sent.

- [ ] **Step 3: Pick the four template students from the snapshot (spec §11.3)**

For each of 7706XMCOMP + DTSC-SPEC, BCOMP + SOFT-MAJ, AACOM + ARIN-SPEC and AACRD + THCS-SPEC, list the program's and plan's tracked courses with their classes:

```bash
node -e '
const [program, plan] = process.argv.slice(1);
const k = require("./src/data/pc/courses.json"), c = require("./src/data/pc/classes.json"), r = require("./src/data/pc/requirements.json");
const tracked = new Set(r.filter(x => x.planCode === program || x.planCode === plan).flatMap(x => x.groups.filter(g => g.rule !== "note").flatMap(g => g.courses.map(y => y.code))));
const units = new Map(k.map(x => [x.code, x.units]));
for (const s of ["2026-S1", "2026-S2", "2027-S1"]) {
  const here = c.filter(x => x.sessionId === s);
  const single = code => here.filter(x => x.courseCode === code).length === 1;
  console.log(s, [...tracked].filter(code => here.some(x => x.courseCode === code)).map(code => `${code}(${units.get(code)}u${single(code) ? "" : ",multi"})`).join(" "));
}
' <program> <plan>
```

Pick by these rules, which are spec §8.5's applied per program:

- **First Semester 2026, completed.** Four 6-unit classes (24 units), at least two of them tracked courses. Grades: invented, e.g. D, CR, HD, P.
- **Second Semester 2026, enrolled.** Four 6-unit classes (24 units), at least two of them tracked. No course repeated from S1.
- **Left open.** At least one tracked course left unenrolled that has a First Semester 2027 class.
- **Career.** Undergraduate programs take UGRD courses; postgraduate programs take PGRD courses.
- **Padding.** Fill the rest with same-career COMP courses from those sessions, preferring single-class ones.

Write each file in the same shape as `7722XVCOMP.json`:

| File | uid | Name | Plan |
|---|---|---|---|
| `7706XMCOMP.json` | u7000002 | Demo Student | DTSC-SPEC |
| `BCOMP.json` | u7000003 | Demo Student | SOFT-MAJ |
| `AACOM.json` | u7000004 | Demo Student | ARIN-SPEC |
| `AACRD.json` | u7000005 | Demo Student | THCS-SPEC |

Each has `rulesYear: 2026` and `commencedSessionId: "2026-S1"`. Use the enrolment dates 2026-02-09 (S1) and 2026-07-13 (S2).

In `src/data/templates/index.ts`, import the four files and list them in `TEMPLATES` after `vcomp`. In `README.md`, add one section per template giving its courses, the tracked groups they hit, and the rule each pick satisfies.

The seeder's template check (Task 5) rejects any class that isn't what the file says, so a typo fails the boot and the tests.

- [ ] **Step 4: Replace the bar with the full settings**

`src/app/components/DemoSettings.tsx`:

```tsx
import { useEffect, useState } from "react";
import { fmtDate } from "../../lib/format";
import type { DemoView, StudentView } from "../../lib/types";

export interface DemoChange {
  today?: string | null;
  programCode?: string;
  planCode?: string;
}

interface Props {
  demo: DemoView;
  student: StudentView;
  busy: boolean;
  pending: string | null;
  onApply: (change: DemoChange) => void;
  onReset: (programCode: string) => void;
}

// M2's demo settings bar (spec §11.2): crit scaffolding, labelled as not part
// of the redesign. A named region with no heading, so the page keeps one h1.
export function DemoSettings({ demo, student, busy, pending, onApply, onReset }: Props) {
  const [date, setDate] = useState(demo.today);
  const [programCode, setProgramCode] = useState(student.programCode);
  const [planCode, setPlanCode] = useState(student.planCode ?? "");
  useEffect(() => setDate(demo.today), [demo.today]);
  useEffect(() => {
    setProgramCode(student.programCode);
    setPlanCode(student.planCode ?? "");
  }, [student.programCode, student.planCode]);
  const plans = demo.programs.find((p) => p.code === programCode)?.plans ?? [];
  return (
    <section className="demo-bar" aria-label="Demo settings">
      <p className="demo-bar__label">Demo settings — not part of the redesign</p>
      <form
        className="demo-bar__form"
        onSubmit={(e) => {
          e.preventDefault();
          // Only a changed date becomes a demo date, so applying a program alone keeps "real date".
          const dateChanged = date !== demo.today || demo.override !== null;
          onApply({ ...(dateChanged ? { today: date } : {}), programCode, planCode });
        }}
      >
        <div className="field">
          <label htmlFor="demo-date">Date</label>
          <input id="demo-date" type="date" required min={demo.minDate} max={demo.maxDate} value={date} onChange={(e) => setDate(e.target.value)} aria-describedby="demo-date-note" />
          <span id="demo-date-note" className="demo-bar__note">
            {demo.override === null ? "(real date)" : `(demo date; the real date is ${fmtDate(demo.realToday)})`}
          </span>
        </div>
        <button type="button" className="button button--quiet" disabled={busy || demo.override === null} onClick={() => onApply({ today: null })}>
          Use real date
        </button>
        <div className="field">
          <label htmlFor="demo-program">Program</label>
          <select
            id="demo-program"
            value={programCode}
            onChange={(e) => {
              setProgramCode(e.target.value);
              // Changing the program selects that program's first plan (spec §11.2).
              setPlanCode(demo.programs.find((p) => p.code === e.target.value)?.plans[0]?.code ?? "");
            }}
          >
            {demo.programs.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="demo-plan">Major / specialisation</label>
          <select id="demo-plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="button" disabled={busy}>
          {pending === "settings" ? "Applying…" : "Apply"}
        </button>
        <button type="button" className="button button--quiet" disabled={busy} onClick={() => onReset(programCode)}>
          {pending === "reset" ? "Resetting…" : `Reset to ${programCode} demo student`}
        </button>
      </form>
    </section>
  );
}
```

In `src/app/EnrolmentApp.tsx`:

- Render the bar with the student and Reset:

  ```tsx
  <DemoSettings demo={view.demo} student={view.student} busy={busy} pending={state.pending} onApply={(s) => void actions.applySettings(s)} onReset={(code) => void actions.reset(code)} />
  ```

- Pass `onReset={null}` to `SiteNav`, because Reset moves to the bar (spec §11.2).

- [ ] **Step 5: Run the full check**

Run: `pnpm check`

Expected: PASS, including every `spec/demo.test.ts` case.

- A template fails "gives … every status": it breaks a §11.3 rule, so fix the picks, not the test.

- [ ] **Step 6: Commit**

```bash
git add src/ spec/demo.test.ts
git commit -m "feat(m2): program and plan settings with pair validation; four more template students and per-program reset" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

---

### Task 15: M2-P3 — ship M2

**Files:**
- Modify: `src/styles.css` (bar fixes from the browser pass), `README.md` (a settings-bar section), `PROCESS.md` (M2 citations)

**Interfaces:**
- Consumes: Tasks 13–14.
- Produces: M2 deployed.

- [ ] **Step 1: Browser pass on the bar**

On a local production build (as in Task 12 Step 1), check:

1. **Phone width.** The bar wraps without a horizontal scroll, and it stays pinned without hiding the h1 for long.
2. **Keyboard.** Every control is reachable in order, and Apply and Reset work from the keyboard.
3. **Scenarios.** Run the §11.5 scenarios by hand: 2026-12-10, 2027-03-02, AACOM + ARIN-SPEC, BCOMP Reset, and Use real date.
4. **axe** with contrast on, on `/` with the bar.

Save `public/readme/after-demo-bar.png`.

- [ ] **Step 2: Document the bar**

Add a README section, "The demo settings bar (M2)", covering:

- what the bar is for (spec §11.1);
- that it isn't part of the redesign;
- what each setting changes;
- that history is fixed;
- that Reset loads each program's demo student;
- the screenshot.

In PROCESS.md, add the M2 account with its commit citations.

- [ ] **Step 3: Check, commit, deploy and verify**

```bash
pnpm check && pnpm check:evidence
git add README.md PROCESS.md public/readme/ src/styles.css
git commit -m "docs(m2): settings bar in the README; M2 in PROCESS.md; bar fixes from the browser pass" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin HEAD:main
```

Deploy as in Task 12 Step 6. Re-run the four CI probes, then one M2 scenario against the live URL:

1. Set the date to 2026-12-10 with a cookie jar.
2. Reload `/` with the same jar.
3. Check Spring Session 2026 reads Now.

---

## After Task 15: whole-branch review

- [ ] Dispatch one fresh reviewer on the most capable model over `git diff e84f846..HEAD`, with this plan and the spec. Ask for bugs, spec drift, security (cookies, input validation, the origin check) and accessibility.
- [ ] Fix every confirmed finding, test-first where it's behaviour. Re-run `pnpm check` and `pnpm check:evidence`, then redeploy if anything shipped changed.
- [ ] Final report to the user:
  - what shipped, with the URL;
  - the planning clarifications;
  - that `reflections/crit-7.md` is a draft for them to rewrite;
  - that the repo stays private until they choose to run the ship step;
  - the command to pull the work into the main checkout: `! git -C /Volumes/External/Users/rangermix/workspaces/comp4020-crit7-rangermix pull --ff-only`.

---

## Progress log

Execution notes: what each task found that the plan didn't expect, and where the work stands. Append one short entry per task as it lands, with its commit.

- **Task 1** (`3d20cf6`): React 19.3 + `@astrojs/react` 7.0 installed as runtime deps; Vite deduped to 8.3.0. `pnpm check` green.
- **Task 2** (`4ead7f7`): parsers green on the first run; the VCOMP groups came out exactly as predicted.
- **Task 3** (`049ac3d`): crawl run on 2026-09-24 — 194 requests, no retries, 167 courses; COMP4801 (linked from AACOM/AACRD) has no page in 2026 or 2027.
- **Task 4** (`512f506`): snapshot 166 courses / 341 classes / 20 plans / 114 groups. Real data forced three parser fixes (TBA-dated rows left out and recorded; "On Campus"/"Online" group rows aren't topics; R1 notes for "Note:", exclusion lists and unreachable unit groups). The 2027 drop-without-failure dates are now published and in `calendar.json`. ANUHub cross-check: 27 of 28 agree (COMP6996 isn't a P&C course). No 2027 course has classes of different topics, so the topic test in Task 8 will be skipped.
- **Task 5** (`8efc307`): schema + two migrations, boot seeding, template u7000001 (fourth S1 course by rule: COMP6240, class 3730).
- **Task 6**: types and pure rules green (41 tests).
- **Task 7** (`2c0c2df`): view model, sandbox, GET routes; view contract tests green first run.
- **Task 8**: enrol/drop/reset API green first run (166 tests). The topic-course test is skipped: no 2027 course has classes of different topics.
- **Task 9**: the React SPA shell renders on the server and hydrates cleanly (three hydration cases, no warnings); axe passes on `/` and `/?open=2026-S2` with the sibling-landmark layout. Broken percent-encoding in a link gets Astro's 400 (accepted: never a 500).
- **Task 10**: add by class number or course code, the chooser (focus in, Cancel back to the input), drop, pending and network handling; component tests green; axe covers the chooser state.
- **Task 11**: browse classes — in-browser search, filters, sort and paging links, annotations, bulk add, URL sync, live count; 253 tests, no todos left; axe covers the catalogue state.
- **Task 12** (`108567a`, `410cf8e`, `2793d54`):
  - Browser pass: a skip link, the phone-width table overflow, the career-warning article and a favicon.
  - Docs: the README with before/after crops, PROCESS.md, and a reflection draft.
  - Deploy: the first deploy went to Fly from the worktree, because CI waits for the repo to go public. flyctl came through mise.
  - Live link check: every README image answered 500. Astro's `/_image` needs `sharp`, and the Dockerfile prunes it away. The images are now raw `<img>` tags served from `public/`.
  - Live checks: the probes pass, an enrolment survives a reload and a redeploy, and the link check covers 39 links in 1.2 s.
- **Task 13**: the date setting.
  - `students.today` (migration 0003); `today(student)` puts it first.
  - `POST /api/demo/settings` and the pinned bar.
  - The skip link moved ahead of the bar, so it's still the first Tab stop.
  - 266 tests.
