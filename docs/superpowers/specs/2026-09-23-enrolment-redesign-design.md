# Enrolment redesign — design spec

Status: **approved, revision 3** · 2026-09-24 · crit 7 ("Build the ANU
system you wish existed"). The implementation plan is
[`docs/superpowers/plans/2026-09-24-enrolment-redesign.md`](../plans/2026-09-24-enrolment-redesign.md).

Research behind this spec:

- [`docs/research/2026-09-23-anuhub-enrolment.md`](../../research/2026-09-23-anuhub-enrolment.md)
  covers the current ANUHub flow, from public guides plus a read-only look at
  the live pages (§8).
- [`docs/research/2026-09-24-programs-and-courses.md`](../../research/2026-09-24-programs-and-courses.md)
  covers Programs & Courses (P&C): its programs, majors, specialisations,
  requirement wording, JSON endpoints and page structure.

Every claim in both cites an ANU URL.

Revision 2 folded in the answers to revision 1's open questions and three
new requirements: P&C is the source of truth, a demo settings bar (M2), and
a crawl of all COMP courses plus five programs.

Revision 3 applies the answers to revision 2's open questions (§14) and two
changes from the user:

- the page is built as a **single-page application** (D13, §4.1);
- **the agent builds and runs the crawler** (D14, §8.2).

An M2 Reset now loads a separate demo history for each program (§11.3).

## 1. Intent

### What was asked (the user's words, condensed)

Redesign ANU's class enrolment page (ISIS, now **ANUHub**), keeping its
purpose but fixing the flow:

1. **Add a class by class number *or* course code** (e.g. `COMP8020`). If
   the course has exactly one class in the session, add it directly;
   otherwise show its classes and let the student pick one or several.
2. **Browse every offered class as a filterable table**: class number,
   course code, subject area, academic career, title keyword, full-text
   search, and similar. Then add several classes from it at once.
3. **Choose a session**: show each session's start and end dates, which
   session is current, and which is next (the one the student is enrolling
   for).
4. **One page, not a multi-page PWA.** "Enrolment Details" unfolds in place
   instead of navigating away.
5. **A side list of compulsory courses** for the student's program and major,
   each with its status: completed (in which session), enrolled (in which
   session), or not enrolled yet.

Added on 2026-09-24:

6. **The source of truth for course information is Programs & Courses**
   (programsandcourses.anu.edu.au).
7. **Crawl all COMP courses and five computing programs**, each with five
   majors or specialisations. A major may be shared between programs.
8. **M2, a pinned settings bar above the real demo**, to set the current
   date, the program and the major. It is built after this spec's M1.

Added later on 2026-09-24:

9. **Build it as a single-page application.**
10. **The agent creates and runs the crawler.**

### What "good" means here

- A student can go from "I need COMP8800 next semester" to enrolled
  **without leaving the page and without looking up a class number**.
- At every moment the page answers three questions at a glance: *which
  session am I enrolling in? what am I enrolled in? what do I still need?*
- **Every course fact on the page traces to a P&C URL** recorded in the
  data's provenance file. The only invented data is the demo student.
- The crit spec holds: the app loads at its `*.fly.dev` URL, models a real
  ANU slice wired end to end, and **the core flow (enrol) survives a
  reload**.
- It behaves as a single-page application. The page loads once, and every
  later change happens in place without a page load. The first response is
  already the full page, rendered on the server, and reload or a shared link
  restores the same view.

### Decisions

D2, D3, D8 and D9 are the user's answers to revision 1's questions, and
D11's program and plan picks confirm revision 2's. D6, D10, D11, D13 and D14
are the user's requirements. The rest are design choices, open to
correction.

| # | Decision | Why |
|---|---|---|
| D1 | The session list **is the page's spine**: one row per session, and each row's **Enrolment details** unfolds in place. There is no separate route. | ANUHub already starts from a session list whose "Enrolment Details" button opens a new view. Requirement 4 asks for exactly that button to unfold instead. |
| D2 | **Add enrols directly** after server-side validation. There is no confirm step and no undo: the reverse of an add is a drop. | User decision. The Add → Continue → Save wizard is the documented friction. |
| D3 | **"Next" means the next *semester*.** Upcoming intensive sessions (Summer, Autumn, Winter, Spring) get an "Upcoming" badge instead. | User decision. |
| D4 | The prototype enforces each class's **Last Day to Enrol** and the drop deadline, but not the enrolment *opening* date. The opening date is shown and marked indicative. | ANU hasn't published when 2027 enrolment opens. Enforcing a guess would block the crit demo. |
| D5 | There is no ANU login. Each browser gets its own **demo student sandbox**, cloned from a seeded template on its first change (§5.2). | The crit is judged on a public URL, and visitors must not overwrite each other. |
| D6 | **P&C is the source of truth for all course information**: courses, classes (numbers, dates, modes, topics), programs, majors, specialisations and their requirement lists. The university calendar supplies only the session-level dates P&C doesn't publish (session span, exam period). Where ANUHub and P&C differ, **P&C wins** and the difference is recorded. Seats and campus are left out, since neither source publishes them. | User requirement. It also keeps the prototype honest: nothing about a course is made up. |
| D7 | The sidebar tracks **course lists**. `all` means every listed course; `units` means N units from a list (P&C's "one of" is 6 units from a list). A course can be required **more than once** (COMP8800, 12+12). Other rules are shown **verbatim and not tracked**: levels, subject-area units, tags, electives, either/or pathways. | Requirement 5 asks for compulsory courses. List rules are how P&C phrases most of them; the rest is prose that would need a rule engine. |
| D8 | The demo student is in **7722XVCOMP, Master of Computing (Advanced)** ("VCOMP"), with the **ARTIF-SPEC Artificial Intelligence** specialisation, under the 2026 rules. | User decision. P&C doesn't know the bare code `VCOMP`, so plans are stored by their full P&C code. |
| D9 | The README's "before" images are **unblurred crops of the live ANUHub pages**, added at P6. | User decision. Nothing else from the signed-in session is committed. |
| D10 | Two milestones. **M1** is F1–F5 (this spec's core). **M2** is the demo settings bar (§11), built only after M1 ships. M1 keeps the seams M2 needs (§11.4), so M2 adds code without reworking M1. | User requirement. |
| D11 | **Data scope**: all COMP courses offered in 2026–2027; five programs with up to five plans each (§8.1); every course their requirements name; three multi-class examples. | User requirement. 2025 is left out because the demo student commenced in 2026. The programs, plans and years were confirmed on 2026-09-24 (§14). |
| D12 | Sessions are keyed by a readable slug (`2027-S1`), not ANUHub's PeopleSoft term codes. | P&C doesn't publish term codes, and the 2027 codes could only be guessed. A slug also makes URLs readable (`/?open=2027-S1`). |
| D13 | The page is a **single-page application** in React 19. `/` server-renders the React app with the initial state; React then hydrates it and handles every later interaction through a JSON API, without page loads. Session, filter and chooser state stays in the URL. | User decision (2026-09-24), replacing revision 2's server-rendered page with region swaps. The server-rendered first paint is what the invariant tests and link checker see, since they run with scripts disabled (§4.1). |
| D14 | **The agent builds and runs the crawler** during P1, and anyone can re-run it. The app and CI never run it. | User decision (2026-09-24). |

## 2. Grounding — the current system

There are three sources:

- ANU's public guides.
- A read-only look at the live pages in a signed-in student session on
  24 Sep 2026 (ANUHub notes §8). Only structure and labels were recorded,
  and nothing was submitted.
- Programs & Courses, which holds the public data the prototype uses (P&C
  notes).

**The current flow**

1. **Enrolment** (tile, or `NavBar › Menu › ANUHub › Enrolment ›
   Enrolment`): a table of this year's sessions ("Second Semester, 2026"),
   each with its program and an **Enrolment Details** button. There are no
   dates and no current or next marker, and on 24 Sep there is no 2027 row
   yet.
2. **Enrolment Details** replaces the list with the *Enrolment Class
   List*: class number, course (the title cut at about 40 characters),
   mode, census date, units, status ("Enroled" or "Dropped") and a
   **Drop** button. There is no unit total and there are no class dates.
   Changing session means going back to the list.
3. **Add** opens *Add Class*: a **Class Number** box with its own **Add
   Class** button, and **Search**. The box takes class numbers only.
4. **Search** requires an **Academic Career** and a **Subject Area** (two
   synced selects, one by name and one by code). Catalogue Number and
   Course Title Keyword are optional. Results show class number, course,
   mode, and start and end dates, sorted by class number, with one **Add
   Class** button per row. Each add returns to step 3; a course in another
   subject means another search.
5. Repeat steps 3–4 for each class, then **Continue**.
6. Enter a permission number if prompted. CBE notes that "the entry box
   always appears".
7. **Save**, then check for "Successfully Added!".

Steps 1–5 were observed live. Steps 6–7 come from the guides, because
running them would have changed a real enrolment. Every view renders in
one iframe under the same URL, so no view has an address that can be
bookmarked or shared. The guides also describe a **Swap** button, but none
showed in the live class list.

**Pain points this redesign targets**

| Today | Redesign |
|---|---|
| Class number only. The student looks it up on the P&C *Class* tab, which warns to "check the correct class number is chosen for delivery mode". | Class number **or** course code. A course with several classes opens a chooser that shows each class's mode (F1). |
| Six or more screens to add one class, each replacing the last. Enrolment Details is a separate view, and changing session means backing out to the list. | One page. Each session's details unfold in place, and results appear inline (F4). |
| Class Search demands a career and a subject area. It can't search by class number, mode, level or description, it truncates titles, and it adds one class per click. P&C's public catalogue search has no subject-area, class-number or level filter either. | A filterable class table in which every filter is optional, with full-text search and multi-add (F2). |
| The session list shows no dates and no current or next session, and next year's sessions aren't listed yet. Deadlines and the 24-unit cap sit on calendar and help pages. | Every session row states its dates and deadlines and is marked Now, Next or Upcoming, and the cap is enforced with an explanation (F3, F1). |
| The class list shows each class's census date and units, but no unit total and no class dates. | Enrolment details show class dates, the census date and the unit total against the cap (F4). |
| Program requirements live in P&C, separately from enrolment, as prose. | A requirements sidebar with a live status for each listed course and one-click add (F5). |
| "Some homepage tiles don't work well on small screens." | Single-column phone layout (§6.1). |

Also confirmed but **not** addressed here: ANUHub doesn't check
prerequisites at add time, and every add reaches the permission-number box
even when no code is needed. The first is a non-goal (§3): P&C publishes
prerequisites only as prose, so the prototype shows that text but doesn't
enforce it. The second disappears because there is no permission step.

**What P&C gives the prototype** (P&C notes §D–E)

- **Course lists**: JSON from `/data/CourseSearch/GetCourses`, covering code,
  name, session, career and units.
- **Program and plan lists**: JSON from the `/data/ProgramSearch/*`,
  `/data/MajorSearch/GetMajors` and
  `/data/SpecialisationSearch/GetSpecialisations` endpoints.
- **Classes**: each course page's "Offerings, Dates and Class Summary
  Links" table, which gives class number, start date, last day to enrol,
  census date, end date, mode and topic.
- **Requirements**: prose on each program and plan page, in which course
  codes are mostly links.
- **Prerequisites**: free text on each course page.
- **Not published**: seats, campus and term codes.

## 3. Goals and non-goals

**Goals (M1)**:

- the five functions
- persistence across reload
- a single-page app whose first response is the full server-rendered page
- accessibility: keyboard, screen reader, axe clean
- usable at phone width
- a re-runnable, polite P&C crawl whose snapshot is committed with its
  provenance

**Goals (M2)**: the demo settings bar (§11).

**Non-goals (YAGNI)**:

- real SSO
- permission codes
- *enforcing* prerequisites, incompatibilities or co-taught rules (e.g.
  COMP6120 ↔ COMP2120); the prerequisite text is shown, not checked
- **Undo** (D2)
- **Swap** (Drop + Add covers it)
- working without JavaScript: the server-rendered page is readable, and a
  `<noscript>` note says changes need JavaScript
- pushing changes between tabs live: a tab re-fetches its state when it
  regains focus
- overload requests
- the international-student minimum load
- tutorial allocation (MyTimetable's job)
- fees
- late-drop consequences. The calendar's "last day to drop without
  failure" is shown in the session row but not applied. Self-service drop
  follows ANU's rule: until exams start, or the class end date for
  non-semester sessions.
- seats, waitlists and campus
- tracking non-list requirement rules (D7)
- checking program rules at add time (the sidebar informs; it doesn't block)
- 2025 and 2028 data
- PeopleSoft term codes (D12)
- editing the catalogue in the UI
- keeping a catalogue selection across pages

## 4. Architecture

### 4.1 Approaches, reconsidered

The user has chosen a single-page application (D13). That replaces revision
2's recommendation of a server-rendered page with region swaps. (a) weighs
the choices left inside an SPA; (b)–(d) are unchanged from revision 2,
except that the agent now runs the crawler. Each table leads with the
recommendation.

**(a) Inside the SPA**

(a1) *Rendering*: what the first response contains.

| | Approach | For | Against |
|---|---|---|---|
| **SSR + hydrate (recommended)** | `index.astro` computes the initial view on the server and renders `<EnrolmentApp client:load view={…} />`. The response is the full page, and React hydrates it in place. | The invariant tests and axe run on the served HTML with scripts disabled (`runScripts: "outside-only"`), so they check the real page. The link checker sees real links. First paint needs no API round trip. The page is readable without JavaScript. | Server and client output must match exactly, so dates are formatted by a pure function over ISO strings, and the client never reads its own clock. |
| Client-only (`client:only="react"`) | The server sends a shell; the browser fetches the state and renders. | Nothing to hydrate. | The invariant tests would see only the shell, so their axe pass would check nothing that matters. There's an extra round trip before anything shows, and the link checker finds no links. |

(a2) *Framework*.

| | Approach | For | Against |
|---|---|---|---|
| **React 19 via `@astrojs/react` 7 (recommended)** | Components in `.tsx`, `useReducer` state, Testing Library tests. | The framework agents write most reliably. Mature accessibility and testing tools (`@testing-library/react` 16). The integration supports React 19. | The largest runtime of the options (tens of kB gzipped), which doesn't matter at this size. |
| Svelte 5 via `@astrojs/svelte` 9 | Runes, compiled components. | Small bundle; concise code; declares Astro ^7 support. | Runes are newer, so agent output is less reliable. Smaller testing ecosystem. |
| Preact + signals | A React-like API. | A tiny runtime. | `preact/compat` quirks with React-oriented libraries. |
| Vanilla TS | No framework. | No dependency. | Hand-rolled rendering and state for a page with this much of both. |

(a3) *Where status is derived*.

| | Approach | For | Against |
|---|---|---|---|
| **Server view model (recommended)** | Every API response returns the whole view: classified sessions, enrolments, requirement statuses, summary and settings. It is built by the same `buildView(student, today)` the SSR uses. The client renders what it's given and never derives status. | Validation and display can't disagree. An M2 date change needs no client-side invalidation. | Each response is a few kB larger than a minimal diff. |
| Client derivation | The API returns raw rows, and the client runs `classify` and `requirements` itself. | Smaller responses. | Two derivations: the server still validates. Under M2, every derived value must be recomputed when the date changes. |

(a4) *Catalogue filtering*.

| | Approach | For | Against |
|---|---|---|---|
| **In the browser (recommended)** | The browser fetches one session's classes once (a few hundred rows at most, with descriptions) and filters, sorts and pages them in memory. | Instant results with no debounce, and no FTS5 virtual table or custom migration. `search.ts` is a pure, unit-tested function. | The payload grows with the catalogue, but scope is fixed at about 180 courses (D11). |
| On the server | A query per filter change, with SQLite FTS5. | Scales to the full ANU catalogue. | A round trip per keystroke, plus a custom FTS5 migration, for data that fits in one response. |

**(b) Data pipeline**: how P&C data reaches the app.

| | Approach | For | Against |
|---|---|---|---|
| **D1 (recommended)** | **Snapshot crawler.** `pnpm data:fetch` is run by the agent in P1 (D14), or by anyone later, but never by the app or CI. It caches raw responses in a gitignored directory. `pnpm data:build` normalises them offline into committed JSON plus a provenance file, and the app seeds from that JSON at boot. | Deterministic tests. The app never depends on P&C being up (curl hangs were observed). One polite crawl of about 200 requests. Data changes are reviewable as git diffs. | The data ages until someone re-runs the crawl. The UI states the snapshot date. |
| D2 | Crawl at deploy or boot. | Always fresh at deploy. | Boot depends on P&C, the results can't be reproduced, and every deploy or machine restart loads ANU's site again. |
| D3 | Live read-through with a cache. | Always fresh. | Every request depends on P&C, whose HTML has no API contract. Tests need the network or mocks. |

**(c) Requirement encoding**: turning P&C prose into sidebar groups.

| | Approach | For | Against |
|---|---|---|---|
| **R1 (recommended)** | **Phrase-rule parser + a small overrides file.** Each requirement paragraph yields its linked course codes and a rule taken from its phrasing: "compulsory" → `all`; "one of" or "N units from" → `units`. **Anything unrecognised becomes a verbatim `note` and is never guessed.** `overrides.json` holds the facts prose can't carry, such as COMP8800 counting twice. A golden test pins the parsed shape of all 20 pages. | Traceable to P&C; drift shows up as a test diff; small. | Unusual phrasing ends up as an untracked note until someone adds an override. |
| R2 | Hand-encode all 20 plans. | Exact on day one. | Transcription errors, and drift from P&C goes unnoticed. |
| R3 | A general rule engine for levels, subject areas, tags and either/or pathways. | Complete. | Large; F5 asks for compulsory courses (D7). |

**(d) M2 settings state**: where the simulated date and program live.

| | Approach | For | Against |
|---|---|---|---|
| **S1 (recommended)** | **Columns on the sandbox student** (`today`, `programCode`, its plans). | One source for both validation and display; survives reload; Reset loads a template. | None at this scale. |
| S2 | Query parameters (`?asOf=…&program=…`). | Shareable links. | Every link and form must carry them, and forgetting one silently snaps the page back. |
| S3 | A separate cookie. | Works without a sandbox. | A second store to keep in step with the sandbox. Apply is a POST, so a sandbox exists anyway. |

### 4.2 Routes

| Route | Kind | Purpose |
|---|---|---|
| `GET /` | page (SSR) | Renders the whole app for this browser's student, with the view state taken from the query parameters below, then hydrates. POSTs render the same page, as the CI POST probe needs (below). |
| `GET /api/view` | JSON | The view model for this browser's student, as in §4.1 (a3). The client calls it when the tab regains focus. |
| `GET /api/catalogue?session=2027-S1` | JSON | Every class in that session, with its course fields (code, title, description, career, level, units, subject, requisites, P&C URL) and class fields (number, mode, dates, topic). This is the data the catalogue filters in the browser. |
| `POST /api/enrol` | JSON | The body is `{session, entry}` or `{session, classNumbers: [...]}`, where `entry` is free text (a class number or course code). If `entry` names a course with more than one class in the session, the response is `{choose: {course, classes}}` and nothing changes. Otherwise the server validates each class, enrols the valid ones, and returns `{outcomes, view}`. |
| `POST /api/drop` | JSON | `{session, classNumber}` → `{outcomes, view}`. |
| `POST /api/demo/reset` | JSON | `{programCode?}` → `{view}`. It resets this browser's sandbox to that program's template student. M1 has only the 7722XVCOMP template, which is the default. |
| `POST /api/demo/settings` | JSON | **M2 only** (§11). |
| `GET /api/events` | SSE | **Kept, with its heartbeat**, because the deploy CI checks that it streams. The guestbook's message events go when the guestbook does. |
| `GET /readme/` | page | Unchanged (starter contract). |

**API conventions**

- POSTs must send `Content-Type: application/json`; anything else gets 415.
  A cross-site HTML form therefore can't reach them. A cross-site script
  would need a CORS preflight, which the server never grants. The `sid`
  cookie is also `SameSite=Lax`.
- Errors come back as `{error: {code, message}}` with a 4xx status. The
  message is shown to the user as written.
- Every successful write returns the new view, so the client replaces its
  state in one step.

**Query parameters on `/`.** These are the SPA's URL state: the client
keeps them in step with `history.replaceState`, and the server reads them
for the first render. Session values are slugs such as `2027-S1`.

- **`open`**: the sessions whose details are expanded. Defaults to the next
  semester.
- **`choose`** and **`term`**: the course being picked from, and the
  session to pick it in.
- **Catalogue state**:
  - `browse`: the catalogue's own session. Defaults to the next semester.
  - `q, title, code, class, subject, career, level, mode, sort, page`.

The two session parameters (`term` and `browse`) are kept separate so a
chooser and a filtered catalogue can be open at once. An unknown value falls
back to its default (§9).

Constraint carried from CI: **`/` must stay server-rendered**, never
prerendered. The deploy job POSTs a form to `/` and expects any status but
403 from its own origin, and exactly 403 from a foreign one. Astro's origin
check gives that for form content types.

### 4.3 Modules (each small, with one job)

**Server and shared logic** (`src/lib/`, pure where possible)

- `src/lib/schema.ts`: tables (§5).
- `src/lib/types.ts`: the view model and API types, shared by the server
  and the client.
- `src/lib/view.ts`: `buildView(student, today)` returns the view model.
  `/`, `/api/view` and every write use it. When the URL asks for a chooser
  or the catalogue, `index.astro` also passes that course's classes or that
  session's catalogue as initial props, so those states render on the
  server too.
- `src/lib/clock.ts`: `today(student)`, **the only way code reads the
  date**. In M1 it returns `APP_TODAY` (tests) or the Canberra-local date.
  M2 puts the sandbox's override first.
- `src/lib/sessions.ts`: pure functions.
  - `classify(sessions, today)` returns the current, next, upcoming and
    past sessions.
  - `canAdd(class, today)` and `canDrop(class, session, today)` answer the
    deadline questions.
- `src/lib/entry.ts`: a pure function.
  - `parseEntry(" comp 6320 ")` returns `{kind: "course", code:
    "COMP6320"}`.
  - `"5099"` returns `{kind: "class", number: 5099}`.
  - Anything else is invalid.
- `src/lib/enrol.ts`: the validation rules and the enrol/drop
  transaction. It returns one outcome per class.
- `src/lib/search.ts`: a pure function over (classes, filters) that returns
  the filtered, sorted page of the catalogue. It runs in the browser; the
  server uses it only for the first render of `/?browse=…`.
- `src/lib/format.ts`: pure en-AU date formatting over ISO date strings,
  shared so that server and client render the same text.
- `src/lib/requirements.ts`: a pure function over (groups, history,
  classes, today) that returns course and group statuses.
- `src/lib/student.ts`: sandbox lookup, clone and cookie handling.

**Data**

- `src/data/pc/*.json`, `src/data/calendar.json` and
  `src/data/templates/<programCode>.json` are committed. M1 ships one
  template, `7722XVCOMP.json`, and M2 adds the other four (§11.3).
- `src/data/seed.ts` imports them, so Vite bundles them into `dist` and the
  Docker image carries them. It upserts them idempotently at boot.

**Crawler** (never runs in the app or CI)

- `scripts/pc/scope.ts`: what to crawl (§8.1).
- `scripts/pc/fetch.ts`: the polite fetcher with its cache (§8.2).
- `scripts/pc/parse.ts`: jsdom parsers for course, program and plan pages.
  jsdom is already a dev dependency.
- `scripts/pc/build.ts`: cache → normalised JSON + provenance.
- `scripts/pc/overrides.json`: facts the requirement prose can't carry.

**Client** (`src/app/`, React)

- `EnrolmentApp.tsx`: the root. It owns the store and renders the regions
  below. `index.astro` hydrates it with `client:load`.
- `store.ts`: a `useReducer` over `{view, urlState, pending, notices}`. Its
  actions are the API calls, and each successful write replaces `view` with
  the one the server returns.
- `api.ts`: typed `fetch` wrappers for §4.2, sharing their types with the
  server through `src/lib/types.ts`.
- `url.ts`: a pure mapping between the query string and `urlState`, in both
  directions, used by the server and the client.
- Components:
  - `SessionList`, `SessionRow`, `EnrolmentDetails`, `ClassRow`
  - `AddClass`, `ClassChooser`, `Catalogue` (`Filters`, `Results`,
    `BulkBar`)
  - `RequirementsSidebar`, `Notices`
  - (M2) `DemoSettings`

## 5. Data model

### 5.1 Tables (Drizzle / SQLite)

**Reference data** (seeded, read-only at runtime):

- **`sessions`**: from the university calendar.
  - `id` (PK slug: `2026-S2`, `2027-S1`, `2026-WIN`, `2026-SPR`, `2027-SUM`,
    `2027-AUT`, …)
  - `name` ("First Semester 2027"), `kind` (`semester` | `intensive`),
    `year`
  - `startDate`, `endDate`
  - `examStart`, `examEnd` (both nullable)
  - `lastDayToAdd`, `dropNoFailDate` (both semesters only), `censusDate`
  - `enrolOpens` (nullable; display only; indicative)
- **`subjects`**: `code` (`COMP`), `name` ("Computer Science").
- **`courses`**
  - `code` (PK, `COMP6320`), `subject` → subjects
  - `catalogue` (`6320`), `level` (1000 … 9000, from the first digit)
  - `title`, `career` (`UGRD` | `PGRD` | `RSCH`), `units`
  - `description` (P&C's introduction text; the catalogue searches it)
  - `requisites` (P&C's free text; display only)
  - `maxTakes` (default 1; raised by the seeder from requirement data, e.g.
    COMP8800 → 2)
  - `pcUrl`
- **`classes`**: the columns of P&C's offerings table.
  - Composite PK (`sessionId` → sessions, `classNumber`). Class numbers are
    unique only within a session; e.g. COMP1100's S2 2027 class is 10101,
    and numbers get reused across years.
  - `courseCode` → courses, `mode`
  - `startDate`, `endDate`, `lastDayToEnrol`, `censusDate`
  - `topic` (nullable, e.g. "Agentic Coding Studio" on COMP8020 9057)
- **`plans`**
  - `code` (PK, the full P&C code: `7722XVCOMP`, `ARTIF-SPEC`, `ARIN-SPEC`,
    `CSEC-MAJ`), `name`
  - `kind` (`program` | `major` | `specialisation`), `career`, `units`
  - `acronym` (nullable, e.g. `MCOMPADV`, from the page's `program-acronym`
    meta)
  - `pcUrl`
- **`program_plans`**: `programCode` → plans, `planCode` → plans. This is
  which majors or specialisations each program offers within scope. **A
  shared plan has one row per program.** For example, ARTIF-SPEC belongs to
  both 7706XMCOMP and 7722XVCOMP.
- **`requirement_groups`**
  - `id`, `planCode` → plans, `rulesYear` (2026), `position`
  - `label` (short, e.g. "Compulsory courses")
  - `rule` (`all` | `units` | `note`)
  - `minUnits` (for `units`)
  - `text` (P&C's sentence, verbatim, always kept)
- **`requirement_courses`**: `groupId` → requirement_groups, `courseCode` →
  courses, `times` (default 1; 2 for COMP8800).

**Student data** (written at runtime):

- **`students`**
  - `id`
  - `token` (random; held in an httpOnly cookie; null for a template,
    and there is one template per program)
  - `name`, `uid`
  - `programCode` → plans, `rulesYear`, `commencedSessionId`
  - `createdAt`
  - M2 adds a nullable `today`.
- **`student_plans`**: `studentId`, `planCode` (the major or
  specialisation).
- **`enrolments`**
  - `id`, `studentId`
  - (`sessionId`, `classNumber`) → classes
  - `status` (`enrolled` | `dropped`)
  - `grade` (nullable; template history only)
  - `enrolledOn`, `droppedOn`: dates from `today(student)`
  - A partial unique index on (`studentId`, `sessionId`, `classNumber`)
    where status = `enrolled`.
  - There is no `completed` status. Completion is derived from the clock
    (§5.3), so M2 can move the date without rewriting rows.

**Removed**: the guestbook's `messages` table (a drop migration) and
`spec/guestbook.test.ts`, which the starter's README says goes when the
starter does.

### 5.2 Demo sandbox (D5)

- A **GET without a cookie** renders the default template student
  (7722XVCOMP) read-only. It writes nothing to the database, so crawlers,
  the CI link checker and the invariant tests create no rows.
- The **first API write** clones the template (the student row, its plans
  and its enrolment history) and sets the cookie
  `sid=<token>; HttpOnly; SameSite=Lax; Path=/`, adding `Secure` in
  production.
- **Reset** replaces the sandbox's rows with a fresh clone of the chosen
  program's template, and keeps the cookie (§11.3). In M1 the only template
  is 7722XVCOMP.
- An unknown or stale token counts as no cookie.
- Sandboxes share nothing mutable, so there are no cross-visitor effects.

### 5.3 Derived values (computed from `today(student)`, never stored)

**Session classification**

- **Current**: every session with `startDate ≤ today ≤ (examEnd ??
  endDate)`. There can be more than one. On 2026-09-24 that is **Second
  Semester 2026** *and* **Winter Session 2026**.
- **Next**: the earliest `kind = semester` session starting after today. On
  2026-09-24 that is **First Semester 2027** (D3). If the data has none,
  the page says "No next semester in the loaded data (2026–2027)".
- **Upcoming**: any other future session.
- **Past**: the rest.

**Enrolment states**

- **Completed enrolment**: status `enrolled` and the session is past.
  - The grade is shown if one is stored.
  - It doesn't count as completed when the grade is a fail (`N` or `NCN`).
- **Can add a class**: `today ≤ class.lastDayToEnrol`. This covers the
  semester rule (Monday of week 2) and each intensive class's own dates
  (D4).
- **Can drop**: `today < session.examStart` for semesters, otherwise
  `today ≤ class.endDate`. This is ANU's published rule.
- **Dropped before the start**: when `today < class.startDate` the drop
  deletes the enrolment instead of marking it dropped, so it leaves no
  history.

**Course status in the sidebar.** A course is needed `times` times.
Completed takes are counted first, then enrolled takes, and the text is
built from those counts:

1. All takes completed: "Completed · First Semester 2026 · D".
2. Any take enrolled in a current session: "Enrolled · Second Semester
   2026 (now)". "(1 of 2)" is appended when `times` is 2.
3. Any take enrolled in a future session: "Enrolled · First Semester 2027".
4. Otherwise "Not enrolled", followed by the first of these that applies:
   - **Add**, if the next semester has a class and the student has no
     enrolment in it;
   - "Next offered: Second Semester 2027";
   - "No classes listed in P&C for 2026–2027".

**Group status**

- **`all`**
  - *Met* when every course is completed.
  - *In progress* when every remaining take is enrolled.
  - Otherwise *not met*.
- **`units`**
  - The units of completed (then enrolled) listed courses count toward
    `minUnits`.
  - Once the group is satisfied, its other courses read "Not needed (group
    satisfied)".
- **`note`**: no status. It shows the verbatim text, and lists any linked
  courses with their statuses.

**Summary line.** "Tracked: *x* of *y* units done · *z* enrolled".

- *y* is Σ (units × times) over `all` groups, plus Σ `minUnits` over
  `units` groups. Notes don't count.
- For the template, this reads "18 of 66 units done · 18 enrolled" before
  any change.

## 6. Page design

### 6.1 Layout

The state shown is illustrative: the template student after typing
`COMP8800` into First Semester 2027 (added directly, assuming the snapshot
lists one class there, as in Second Semester 2026's 8721),
then typing `POGO8062`, which has two 2027 classes, 5354 and 5355, both
verified on P&C.

- `####` marks class numbers that the snapshot supplies; the wireframe
  doesn't invent them.
- The S2 2026 class numbers were seen in ANUHub (ANUHub notes §8e), and
  the crawler checks them against P&C.

```
Desktop (≥ 960px)
┌ nav: Enrolment · About ──── Demo Student · u7000001 · MCompAdv (AI) · Reset demo ┐
│ h1  Enrolment                                                                    │
│ [notices — aria-live]  Enrolled: COMP8800 Advanced Computing Research Project    │
│                        (class ####, 12 units)                                    │
├──────────────────────────────────────────────────────┬───────────────────────────┤
│ h2 Sessions                         [Show earlier ▸] │ aside: Your requirements  │
│ 2026                                                 │ Master of Computing (Adv.)│
│ Winter Session 2026    1 Jul–30 Sep     NOW       ▸  │ · Artificial Intelligence │
│ Second Semester 2026   27 Jul–30 Oct    NOW       ▸  │ Tracked: 18 of 66 units   │
│   exams 5–21 Nov · add closed 3 Aug · drop to 4 Nov  │ done · 30 enrolled        │
│ Spring Session 2026    1 Oct–31 Dec     UPCOMING  ▸  │                           │
│ 2027                                                 │ Program · compulsory      │
│ Summer Session 2027    1 Jan–31 Mar     UPCOMING  ▸  │ ● COMP6442 Enrolled S2 26 │
│ First Semester 2027    22 Feb–28 May    NEXT      ▾  │ ✓ COMP6445 Completed S1 26│
│   exams 3–19 Jun · add until 1 Mar · census 31 Mar   │ ◐ COMP8800 ×2 Enrolled    │
│   ┌ Enrolment details · 1 class · 12 of 24 units ──┐ │     S1 27 (1 of 2)        │
│   │ ▾ COMP8800 Advanced Computing Research… · #### │ │ Program · 6 units, one of │
│   │     12u · In Person · 22 Feb–28 May ·          │ │ ○ COMP6250 No classes     │
│   │     census 31 Mar · enrolled 24 Sep 2026 [Drop]│ │     listed 2026–27        │
│   │ Add a class                                    │ │ ○ COMP8260 No classes     │
│   │ [Class number or course code ______ ] [Add]    │ │     listed 2026–27        │
│   │ ┌ POGO8062 has 2 classes in S1 2027 ────────┐  │ │ Specialisation · AI · all │
│   │ │ ☐ 5354 In Person  ☐ 5355 Online           │  │ │ ✓ COMP6262 Completed S1 26│
│   │ │ [Add selected] [Cancel]                   │  │ │ ✓ COMP6320 Completed S1 26│
│   │ └───────────────────────────────────────────┘  │ │ ● COMP8620 Enrolled S2 26 │
│   └────────────────────────────────────────────────┘ │ ● COMP8691 Enrolled S2 26 │
│ Autumn Session 2027 …                             ▸  │ ▸ Other rules, not tracked│
│                                                      │   (5)                     │
│ ▸ h2 Browse classes  [session: First Semester 2027 ▾]│                           │
│     filters + results table + "Add N selected"       │                           │
│ footer: course data from Programs & Courses,         │                           │
│         snapshot <date>                              │                           │
└──────────────────────────────────────────────────────┴───────────────────────────┘

Phone (< 960px), single column:
  notices → Requirements (collapsed, summary "18 of 66 units done") →
  Sessions (the next semester expanded) → Browse classes (collapsed).
```

How the sidebar numbers add up after adding COMP8800 (12 units):

- **Done (18 units)**: COMP6445, COMP6262 and COMP6320.
- **Enrolled (30 units)**: COMP6442, COMP8620 and COMP8691 (6 each), plus
  COMP8800's first take (12).
- **Still needed (18 units)**: COMP8800's second take (12) and the one-of
  group (6).
- **Total**: 18 + 30 + 18 = 66.

The one-of group is real P&C data. VCOMP requires one of COMP6250 or
COMP8260, and P&C lists no classes for either in 2026 or 2027. The sidebar
says so rather than hiding it (§13).

### 6.2 F3 + F4 — Sessions and in-place Enrolment details

- **One row per session**, grouped by academic year. Past sessions, and
  intensive sessions with none of the student's classes, fold away (§15.1).
- **Each row** shows:
  - the session name, the start–end dates and a badge (**Now**, **Next**,
    **Upcoming**, **Past**);
  - a line of key dates: the exam period, the add deadline ("add until
    1 Mar" / "add closed 3 Aug"), the census date, the last day to drop
    without failure, and the drop deadline.
    Intensive sessions say "dates vary by class". Sessions not yet open
    show "enrolment usually opens early December (indicative)".
- Each row is a native **`<details>`** whose summary *is* the row. Opening
  it reveals that session's **Enrolment details**, with no navigation:
  - **Heading line**: "1 class · 12 of 24 units", where 24 is the
    self-enrol cap for semesters.
  - **Classes**: one nested `<details>` per class. The summary shows code ·
    title · class number · mode · units, plus the topic when P&C gives one.
    Expanded, it shows the class dates, census date, the date enrolled, the
    grade (for completed classes), and **Drop** when `canDrop`.
  - **Dropped classes** stay listed, marked "Dropped · 12 Oct 2026" and
    without actions, as ANUHub does. A class dropped before its start
    date leaves no record and disappears from the list.
  - **Add a class** (F1) shows when the session has any class that can
    still be added. Otherwise the section says why ("Adding closed on
    3 Aug").
  - **Empty state**: "No classes in First Semester 2027 yet. Add one below,
    use your requirements list, or browse classes."
- **Which rows are open**:
  - By default, the **next** semester's row is open.
  - Rows the user opens are kept in `?open=`, so a reload or a shared link
    reopens them.
  - Several rows can be open at once, e.g. to compare the current and next
    semesters.

### 6.3 F1 — Add by class number or course code

**The input.** One input, labelled "Class number or course code", with the
hint "e.g. 5099 or COMP1100". It sits inside a session, so the session is
implicit. The server parses it (`entry.ts`).

**A class number** must belong to this session. Otherwise the message
names the session or sessions it does belong to: "8707 is a Second
Semester 2026 class number, not First Semester 2027". Then the class is
validated and enrolled.

**A course code** finds that course's classes in this session:

- **0 classes**, one of:
  - "COMP8020 isn't offered in First Semester 2027. Next offered: Second
    Semester 2027." (COMP8020 runs in Semester 2 only; its indicative 2027
    class is 10060.)
  - "No classes listed in P&C for 2026–2027".
  - "COMP9999 isn't in the prototype's catalogue", if the code is unknown.
- **1 class**: enrol directly. "Enrolled in COMP1100 (class 5099)", plus
  the career warning for a PGRD student.
- **More than 1**: an inline **chooser** in place of the input
  (`?choose=CODE&term=…`).
  - It has one checkbox per class, showing its mode, dates and topic, for
    example POGO8062's 5354 (In Person) and 5355 (Online).
  - It also shows P&C's requisite text, labelled "Requisites (from P&C, not
    checked here)".
  - Then **Add selected** or **Cancel**.

**Anything else**: "Enter a class number (digits) or a course code like
COMP1100."

**Validation** runs server-side on every class and gives one outcome per
class.

**Refuse** when:

- the class's Last Day to Enrol has passed;
- the student is already enrolled in the course this session;
- they have already completed the course `maxTakes` times (the notice shows
  the session and grade);
- it would take a semester above **24 units** ("Going over 24 units needs
  an Overload request through Manage my Degree").

**Warn**, without blocking, when the class's career doesn't match the
student's program (e.g. a PGRD student adding a UGRD course).

**Outcomes** appear as a list in the notices region and beside the control
that made the write, and focus stays in place (§15.3):
"Enrolled: COMP8800 (class ####)" / "Not added: COMP8020 — not offered in
First Semester 2027".

### 6.4 F2 — Browse classes

- **Placement**: a section below the sessions, collapsed by default. It has
  its own **session select**, which defaults to the next semester. Opening
  the section, or changing the session, fetches that session's classes once
  and keeps them for the visit. When the URL already has `browse`, they
  arrive with the page instead (§4.3).
- **Scope note**: the caption states the scope: "All COMP classes, plus
  courses named in the five programs' requirements."
- **Filters** apply as the user types, and Clear resets them:
  - **Search**: every word must prefix-match a word in the code, title,
    topic or description, ignoring case (`search.ts`).
  - **Title contains**.
  - **Course code**: a prefix, so `COMP8` works.
  - **Class number**.
  - **Subject area**: a select showing code and name.
  - **Academic career**: UGRD/PGRD.
  - **Level**: 1000–9000.
  - **Mode of delivery**.
- **Results table**
  - Columns: select, class number, course code, title (with topic), career,
    level, units, mode, dates.
  - Sortable by code, title or level.
  - 50 rows per page.
  - Sort and paging controls are real `?sort=` and `?page=` links. The
    client handles them in place, and the server-rendered page follows
    them too.
  - The `<caption>` states the count, session and active filters ("37 First
    Semester 2027 classes · subject COMP · level 8000").
- **Row annotations**
  - "**Required**" on courses in the student's tracked requirement groups,
    which ties the table to the sidebar.
  - "Enrolled", or "Completed · First Semester 2026", with the checkbox
    disabled.
  - "Indicative" on 2027 offerings, since P&C says "the list of offerings
    for future years is indicative only".
- **Bulk add**: a sticky bar appears once anything is selected: "**Add 3
  selected classes to First Semester 2027**". It sends their class
  numbers in one request, and the outcomes show exactly as in F1.
- **URL**: filter changes update the URL with `history.replaceState`, so a
  reload restores the same filtered view. The result count in the caption
  is announced politely once typing pauses (500 ms).

### 6.5 F5 — Requirements sidebar

**Structure.** An `<aside aria-labelledby>` headed "Your requirements",
naming the program and the student's major or specialisation. The blocks
come in this order:

1. The program's tracked groups (`all`, then `units`), in P&C order.
2. The chosen major's or specialisation's tracked groups.
3. **"Other rules, not tracked"**: a collapsed `<details>` listing every
   `note` verbatim, such as "A minimum of 48 units must come from
   completion of 8000-level COMP courses", along with the GPA-6 rule.

Each course shows its code, its title (from `courses`, not the requirement
prose, which is sometimes stale) and its **status text** (§5.3). A course
needed twice shows "×2". Each group shows its rule in P&C's words ("6
units from one of") and its state.

**Summary**: the line from §5.3.

**Actions**

- **Add to First Semester 2027** appears when the next semester offers the
  course. It sends `entry: CODE`, so a course with several classes opens the
  chooser in that session's row.
- The course code links to the catalogue, pre-filtered to that code. A
  small "P&C" link opens the plan's P&C page.

**Accessibility.** Status is carried by text. The icons (✓ ● ◐ ○ –) are
decorative (`aria-hidden`), and colour is never the only signal.

**Updates.** The sidebar renders from the view the server returns, so it
updates on every enrol and drop.

### 6.6 Client behaviour

- **Writes wait for the server.** There are no optimistic updates. The
  button that started a write shows "Adding…" or "Dropping…", and further
  writes are blocked until the response arrives. The response's view then
  replaces the client's state.
- **Focus.** After a write, focus stays where the student was and the
  outcome shows beside the control (§15.3). The notices region announces
  it. Opening the chooser focuses its first checkbox; Cancel returns focus
  to the input.
- **URL.** `url.ts` keeps the open sessions, the chooser and the catalogue
  filters in the query string with `replaceState`, so reload and shared
  links restore the view. There is only one page, so there's no client
  router.
- **Stale tabs.** On `visibilitychange` to visible, the client re-fetches
  `/api/view`, so a second tab catches up when the user returns to it.
- **Hydration.** The server passes the full initial view, including
  `today`, as props. `format.ts` renders every date from ISO strings, so
  the server and the browser produce identical text.
- **Without JavaScript**, the served page shows the full state, and a
  `<noscript>` note says changes need JavaScript.

## 7. Accessibility and responsiveness

- **Structure**
  - One `<h1>` ("Enrolment").
  - `<h2>`s for Sessions, Browse classes and Your requirements; an `<h3>`
    inside each session row's summary.
  - `<nav>` and `<aside>` landmarks; `lang="en-AU"`.
- **Forms**
  - A real `<label>` on every input.
  - Each checkbox is named in context: "Select POGO8062 class 5354, In
    Person".
  - Input errors are linked to their input with `aria-describedby`.
- **Notices** sit in an `aria-live="polite"` region.
- **Table**
  - `<th scope>` headers and a `<caption>`.
  - At narrow widths it sits in a horizontally scrollable, focusable region
    labelled "Class results".
- **Checks**
  - The invariant suite (with axe) covers every page state listed in
    `spec/routes.ts` (§10).
  - Contrast and layout are checked by hand in a real browser, since jsdom
    can't.

## 8. Reference data: the P&C pipeline (D6, D11)

### 8.1 Scope (`scripts/pc/scope.ts`)

**Years**: 2026 and 2027. Requirements come from the **2026** rules (the
template student's commencement year).

**Courses**

- Every `COMP` + 4-digit course in P&C's 2026 or 2027 course list. That is
  123 codes: 2027's 122 are 2026's minus COMP1710. A course listed only in
  2027 would be fetched at `/2027/course/<code>`, but none is today.
- Every course code linked from the 20 program and plan pages below. This
  brings in, for example, MATH6005, ENGN8100, INFS8004 and the BCOMP ICT
  list.
- Three multi-class examples so the chooser has real cases: SCOM8014,
  POGO8062 and REGN8050.
- In total that is about 180 courses.

**Programs and plans**

| Program | Plans in scope (≤ 5) | Left out |
|---|---|---|
| BCOMP, Bachelor of Computing (UG, majors) | COMS-MAJ, CSEC-MAJ, DTSC-MAJ, INSY-MAJ, SOFT-MAJ | HCCC-MAJ, INFS-MAJ |
| AACOM, Bachelor of Advanced Computing (Honours) (UG) | ARIN-SPEC, HCCC-SPEC, MACL-SPEC, SYAR-SPEC, THCS-SPEC | none |
| AACRD, Bachelor of Advanced Computing (R&D) (Honours) (UG) | the same five as AACOM, **shared** | none |
| 7706XMCOMP, Master of Computing (PG) | ARTIF-SPEC, CMSY-SPEC, DTSC-SPEC, MCHL-SPEC, SOFT-SPEC | COMP-SPEC, HCCM-SPEC |
| 7722XVCOMP, Master of Computing (Advanced) (PG) | the same five as MCOMP, **shared** | COMP-SPEC, HCCM-SPEC, CSEC-SPEC |

That is 5 program pages and 15 distinct plan pages. **Shared plans are
stored once** and joined through `program_plans`. UG and PG codes differ
even on the same topic (ARIN-SPEC vs ARTIF-SPEC), so plans are keyed by
their full code.

MACL-SPEC and MCHL-SPEC are 2026 plans that P&C drops in 2027. That's
fine, since requirements use the 2026 rules.

AACRD replaces MMLCV, which the research suggested, because MMLCV has no
specialisations and the user asked for five plans per program. The user
confirmed this list on 2026-09-24 (§14).

### 8.2 Fetching (`pnpm data:fetch`)

**Politeness**

- The agent runs it during P1, at the user's direction (D14). Anyone can
  re-run it later. The app and CI never do.
- It sends an honest User-Agent naming the project and its repo URL, and
  saying that an AI coding agent runs it for a student project.
- Requests are **serial at about 1 per second**, with a 30 s timeout and 3
  retries with backoff. Curl hangs were observed on first contact.
- Every response is **cached on disk** in `.cache/pc/`, which is gitignored,
  so a re-run fetches only what's missing.
- About 200 requests in total, or roughly 4 minutes.
- robots.txt has no `User-agent: *` rule. It disallows ClaudeBot, which is
  Anthropic's training crawler. This crawl is a user-directed fetch, a
  different agent that the file doesn't list, and the script's own
  User-Agent isn't listed either.

**Correctness**

- Every URL includes the year. Year-less URLs serve 2027.
- A **soft 404** (a redirect to `/Error/Index/404…`, or the title "Page not
  found", with HTTP 200) counts as missing. It is recorded, not parsed.
- The **full HTML** is parsed, because program sections are hidden tabs.

**Requests**

1. **Course lists**: `GET /data/CourseSearch/GetCourses?SearchText=COMP&SelectedYear=<y>&ShowAll=true`
   for each year.
   - Keep codes matching `^COMP[0-9]{4}$`.
   - Count `Items`, since `TotalCount` is unreliable.
2. **Program and plan lists**:
   - `GetProgramsUnderGraduate` and `GetProgramsPostGraduate`;
   - `GetMajors` and `GetSpecialisations`;
   - all with `CollegeName=CECS&SelectedYear=2026&ShowAll=true`.
3. **Program and plan pages**:
   - `/2026/program/<code>` gives the requirements section, the
     "Minimum N Units" line and the `program-acronym` meta.
   - `/2026/major/<code>` and `/2026/specialisation/<code>` give the
     requirements section and the "Relevant Degrees" list.
4. **Course pages**: `/2026/course/<code>` for every course in scope.
   - The header gives units, career and subject.
   - `#introduction` gives the description.
   - `div.requisite` gives the requisite text.
   - `#class` holds the year tabs. Under each session `h3`, every
     `table.table-terms` row gives class number, start, last day to enrol,
     census, end and mode, plus a topic row where present.
   - The 2026 and 2027 tabs are kept; 2028 is dropped.

### 8.3 Building (`pnpm data:build`)

It works offline, from the cache. Its outputs:

- `src/data/pc/courses.json`, `classes.json`, `plans.json` and
  `requirements.json`.
- `src/data/pc/README.md`, the provenance file, which records:
  - the snapshot date and the URL behind every file;
  - counts per year;
  - every override applied;
  - every soft 404 and dead link (e.g. a requirement linking a course P&C
    doesn't have);
  - every paragraph that fell back to `note`;
  - the **ANUHub cross-check**: the snapshot's Second Semester 2026
    postgraduate COMP classes against the 28 seen live (ANUHub notes §8e).
    P&C wins, and each difference is listed. One is already known: ANUHub
    lists COMP6996 (class 8665), which isn't a P&C course.

**Precedence for course fields**: the JSON (name, units, career) first,
then the course page. The page supplies what the JSON lacks.

**Requirement parsing (R1)**

- Each requirement paragraph or list item becomes one group.
- **Linked course codes** become the group's courses. Links to other years
  (e.g. an absolute 2023 URL) are resolved by code.
- **The rule comes from the phrasing:**
  - "compulsory" or "the following courses:" with no unit choice → `all`;
  - "one of the following", "N units from" or "a minimum of N units from" →
    `units` with `minUnits = N`;
  - a paragraph with no course links, or one that says "a maximum of" → a
    `note`, which still lists any linked courses.
- **Overrides** carry the rest. They start with the courses P&C says are
  taken twice, each given `times: 2`:
  - COMP8800 (12+12) in 7722XVCOMP;
  - COMP3500 (6+6) in SOFT-MAJ;
  - COMP3770 (6+6) and COMP4550 (12+12) in AACRD.

  AACOM's honours pathway is a choice of three, so it stays a note.
- A **golden test** pins the parsed shape of all 20 pages: each group's
  rule, `minUnits` and codes.

**Data checks** fail the build:

- every requirement course exists in `courses`;
- every class's session exists;
- no two classes share (session, class number).

A class whose dates fall outside its session is only flagged in the
provenance file, since intensive classes vary.

### 8.4 Sessions (`src/data/calendar.json`)

- Hand-curated from the 2026 and 2027 university calendars, with the source
  URL on each row.
- It covers every session: the semesters and the Summer, Autumn, Winter and
  Spring sessions.
- Each row gives the session span, exam period, add deadline, census date
  and the indicative opening date.
- P&C session names ("First Semester", "Winter Session") map to slugs
  (`S1`, `WIN`).
- The seeder refuses a class whose session name has no calendar row.

### 8.5 Demo student (the only invented data)

**Who.** "Demo Student", `u7000001`, 7722XVCOMP with ARTIF-SPEC,
commenced First Semester 2026, rules year 2026. It is stored in
`src/data/templates/7722XVCOMP.json`. M2 adds one template for each of the
other four programs, built by the same rules (§11.3).

**History** (real offerings only; the grades are invented):

- **First Semester 2026, completed**: COMP6262, COMP6320, COMP6445, and one
  further 6000-level COMP course that P1 picks from the snapshot. Grades
  are D, HD, D and CR.
- **Second Semester 2026, enrolled now** (24 units):
  - COMP6442 (class 8707);
  - COMP8620 (8695);
  - COMP8691 (8699);
  - COMP8020 (9057, topic "Agentic Coding Studio").
- **First Semester 2027**: nothing yet.

**What the first page load shows.** Every status: completed, enrolled now,
not enrolled with **Add**, a course needed twice, and "No classes listed"
(the one-of group).

**Grounding the history.** P1 checks each named class against the
snapshot. If P&C disagrees, P1 swaps in a real offering with the same role
and records the swap in the provenance file.

**Idempotent seeding.** At boot, `seed.ts` **upserts** by natural key and
never deletes. A redeploy with refreshed data therefore never orphans a
sandbox's enrolments.

## 9. Error handling

- **Validation failures**: each gets a notice specific to that class. In a
  batch, one failure never blocks the others.
- **Concurrency**: each enrol or drop runs in a single SQLite transaction,
  re-checking the duplicate and 24-unit rules inside it, so two tabs can't
  double-enrol.
- **Malformed input**: an unknown session slug, filter value or `choose`
  code falls back to the default, and the page says so. **A malformed query
  string must never produce a 500.**
- **Cross-site requests**: form POSTs to `/` are refused by Astro's origin
  check (the CI verifies this). The API accepts only JSON (§4.2).
- **Network failures**: the notice reads "Couldn't reach the server, so
  nothing changed. Try again." The client state stays as it was, and the
  buttons are enabled again.
- **Malformed API bodies** get a 400 with a message naming the bad field.
  They never get a 500.
- **Crawler failures** never reach the app, which runs only on the
  committed snapshot:
  - timeouts and soft 404s are retried or recorded;
  - a page that won't parse is listed in the provenance file.

## 10. Testing

**Contract tests** run over HTTP against the built server, in the same
harness as the starter (`spec/*.test.ts`). They check the JSON API and the
server-rendered HTML of `/`, which is what the SPA hydrates, so they
survive any change inside the client.

- `APP_TODAY=2026-09-24` is set in `global-setup.ts`.
- Tests pin the **committed snapshot**, never live P&C.
- Fixtures that the snapshot supplies (e.g. COMP8800's First Semester 2027
  class number) are looked up from `src/data/pc/*.json` by course code
  rather than hard-coded.

| Test | Proves |
|---|---|
| `/` shows every session with its start and end dates. Second Semester 2026 and Winter 2026 are **Now**; First Semester 2027 is **Next** and its details are open by default. | F3 |
| Session details are `<details>` elements on `/`, not links to another page. | F4 |
| `POST /api/enrol {entry: <class number>}` enrols the class, and a **fresh `GET /` with the same cookie** renders it under First Semester 2027. | F1, **crit: persists across reload** |
| `entry: <code with one class>` enrols it directly, with no confirm step. | F1, D2 |
| `entry: <code with several classes>` returns `choose`, listing each class, and changes nothing. Sending two class numbers then enrols both. | F1 |
| `entry` with a code not offered, an unknown code, a class from another session, or garbage returns the matching message and enrols nothing. | F1 |
| Refusals: the Last Day to Enrol has passed (Second Semester 2026); the course was already completed; a semester would exceed 24 units. COMP8800 can be enrolled for a second take. | rules |
| `GET /api/catalogue?session=2027-S1` returns only First Semester 2027 classes, with descriptions. `/?browse=2027-S1&subject=COMP&career=PGRD&level=8000` renders only matching rows. Bulk-adding 3 enrols 3. | F2 |
| The template's sidebar shows **Completed · First Semester 2026**, **Enrolled · Second Semester 2026 (now)**, **Not enrolled** with Add, and "No classes listed" for COMP6250. After adding COMP8800, the returned view shows it as "Enrolled … (1 of 2)" with 30 units enrolled in the summary. | F5 |
| A drop removes the class and the sidebar reverts. A drop after the exam start is refused. | drop |
| A POST without `Content-Type: application/json` gets 415. A malformed body gets 400, never 500. | API |
| Two cookie jars don't see each other's enrolments. A GET without a cookie writes no student row. | sandbox |
| Every course code and class number on `/` exists in the committed snapshot. | D6 |

**Unit tests** (`src/**/*.test.ts`, `scripts/**/*.test.ts`):

- the pure modules: `sessions.ts`, `entry.ts`, `requirements.ts`,
  `search.ts`, `url.ts` and `format.ts`;
- the crawler's parsers, on saved HTML fixtures of one course page, one
  program page and one specialisation page;
- soft-404 detection;
- the requirement golden test for the 20 pages.

**Component tests** (`src/app/**/*.test.tsx`, jsdom + Testing Library,
with `fetch` stubbed by recorded API responses):

- typing a course code with several classes opens the chooser and focuses
  it, and Add selected sends both class numbers;
- catalogue filters narrow the rows as the user types, and the URL
  follows;
- a failed request shows the network notice and leaves the state as it
  was;
- hydrating over the server's HTML logs no mismatch warning.

Both new test globs need adding to `vitest.config.ts`. Component tests use
jsdom per file (`// @vitest-environment jsdom`).

**Routes**: `spec/routes.ts` gains the key server-rendered states, so the
invariants and axe cover them:

- `/`
- `/?open=2026-S2`
- `/?choose=POGO8062&term=2027-S1`
- `/?browse=2027-S1&subject=COMP`

**Browser pass** before each ship, with the Playwright browser tools:

- the core flow in a real browser: add by class number, add through the
  chooser, bulk add, drop, then reload;
- phone width;
- keyboard-only enrolment;
- axe in a real browser, for the contrast rules jsdom can't check;
- screenshots for `PROCESS.md` and the README.

## 11. M2 — demo settings bar

Built after M1 ships (D10). It is scaffolding for the crit, not part of
the redesigned ANU page, and it says so on screen.

### 11.1 Purpose

It lets a visitor, such as the tutor at the crit, see the redesign **at
another date** or **as a student in another program or major**, without
editing any data. For example:

- the week before First Semester 2027 opens;
- the day after its Last Day to Enrol;
- as a BCOMP student with the Cyber Security major.

### 11.2 UI

```
┌ Demo settings — not part of the redesign ────────────────────────────────────────┐
│ Date [2026-09-24] (real date)  [Use real date]                                   │
│ Program [7722XVCOMP Master of Computing (Advanced) ▾]                            │
│ Major / specialisation [ARTIF-SPEC Artificial Intelligence ▾]                    │
│ [Apply]  [Reset to 7722XVCOMP demo student]                                      │
└──────────────────────────────────────────────────────────────────────────────────┘
┌ nav: Enrolment · About ───────────────── Demo Student · u7000001 · MCompAdv (AI) ┐
```

**Placement and markup**

- A full-width bar **pinned** with `position: sticky; top: 0`, above the
  site nav.
- Visually distinct: a dashed border and a muted background.
- It is a `<section aria-label="Demo settings">` with no heading, so the
  page keeps exactly one `<h1>`.

**Controls**

- **Date**: `<input type="date">`, limited to 2026-01-01 … 2027-12-31, the
  span of the loaded sessions. "Use real date" clears the override.
- **Program**: the five programs in scope.
- **Major / specialisation**: only the chosen program's plans. Changing the
  program selects that program's first plan. The server still validates
  the pair: "ARIN-SPEC isn't offered in 7722XVCOMP".
- **Apply** saves the date, program and plan.
- **Reset** moves here from the nav. Its label names the program currently
  selected: "Reset to BCOMP demo student".

**Behaviour**

- Apply sends `{today, programCode, planCode}` to
  `POST /api/demo/settings`. Reset sends `{programCode}` to
  `POST /api/demo/reset`. Either way, the returned view replaces the whole
  page's state at once.
- Visitors without a sandbox get one on their first Apply or Reset, like
  any write.

### 11.3 Semantics

Settings are stored per sandbox (S1).

**Date.** It changes everything derived from `today(student)`:

- the Now/Next/Upcoming/Past badges and the default open session;
- the add and drop deadlines;
- the completed vs enrolled status;
- the requirement statuses;
- the catalogue's default session;
- the `enrolledOn` stamped on new enrolments.

**History is fixed.** A date change adds or removes no enrolments.

- Enrolments in sessions after the chosen date show as future enrolments.
- Past enrolments without a grade show "Completed", with no grade.

**Program and major.** A change keeps the enrolment history and recomputes
the sidebar for the new program and plan.

- Career warnings follow the new program's career. A PG history under BCOMP
  warns on PG classes.
- `rulesYear` stays 2026.

**Reset** loads the demo student of the program selected in the bar: that
program's template, with its own plan and enrolment history (user decision,
2026-09-24). It keeps the date setting, which only "Use real date" clears.
Reset with 7722XVCOMP selected gives the M1 state back.

**Per-program templates** (`src/data/templates/<programCode>.json`), one
for each of the five programs:

| Program | Template student | Plan |
|---|---|---|
| 7722XVCOMP | u7000001 (the M1 template, §8.5) | ARTIF-SPEC |
| 7706XMCOMP | u7000002 | DTSC-SPEC |
| BCOMP | u7000003 | SOFT-MAJ |
| AACOM | u7000004 | ARIN-SPEC |
| AACRD | u7000005 | THCS-SPEC |

Each follows §8.5's rules:

- commenced First Semester 2026, under the 2026 rules;
- 24 units completed in First Semester 2026, and 24 enrolled in Second
  Semester 2026, all real offerings from the snapshot;
- at least two completed and two enrolled courses in its tracked groups,
  and at least one tracked course that's not yet enrolled but offered in
  First Semester 2027, so every status shows.

M2-P2 picks the courses from the snapshot and records them in
`src/data/templates/README.md`. Grades are invented and labelled as such.

### 11.4 Seams M1 keeps so M2 is additive

| Seam | In M1 | M2 change |
|---|---|---|
| **Clock**: every date read goes through `today(student)`. | env or real date | `student.today ?? …` first |
| **Completion is derived** from the session end, not stored. | yes | none |
| **`enrolledOn` stamps** use `today(student)`. | yes | none |
| **Program and plans live on the student row**, not in config. | yes | the settings form writes them |
| **Data**: all five programs and their plans are crawled and seeded in P1. | seeded, and only the template's program is shown | the selects read `program_plans` |
| **Schema** | `students` without `today` | one migration adds nullable `today` |
| **Templates are keyed by program**, and reset takes `programCode`. | one template (7722XVCOMP) | four more template files |

### 11.5 M2 tests

| Test | Proves |
|---|---|
| Setting the date to 2026-12-10 makes Spring 2026 **Now** while First Semester 2027 stays **Next**, and survives a reload. | date |
| Setting it to 2027-03-02 makes First Semester 2027 **Now**, its add closed (last day 1 Mar) and Second Semester 2027 **Next**. COMP8620 then reads "Completed · Second Semester 2026" with no grade. | date, derived completion |
| Switching to AACOM + ARIN-SPEC lists AACOM's compulsory courses and ARIN-SPEC's listed courses, keeps the enrolment history, and warns on a PG class. | program |
| A pair the program doesn't offer is refused with a notice. | validation |
| "Use real date" clears the override, and the badges follow the real date again. | date |
| With BCOMP selected, Reset loads u7000003's history with SOFT-MAJ and keeps the date setting. Reset with 7722XVCOMP selected restores the M1 template. | reset |
| The bar has an accessible name, and the page still has one `<h1>`. | a11y |

## 12. Build order

Each phase ends green (`pnpm check`), committed and pushed, and deployable.

**M1**

| Phase | Delivers |
|---|---|
| P0 Harness | Proposed `CLAUDE.md` rules for the user to accept or rewrite, since the harness is theirs and is marked (see below). The §10 contract-test stubs. |
| P1 Data | The agent builds the crawler (`scope`, `fetch`, `parse`, `build`) with its parser and golden tests, **then runs it** (D14). The committed snapshot and provenance file; `calendar.json`; the schema and migrations (drop `messages`, add the new tables); the seeder; the 7722XVCOMP template student. |
| P2 View + API | `buildView`, `/api/view`, `/api/catalogue`; the sandbox cookie; `/api/enrol` (class number, course code, `choose`), `/api/drop`, `/api/demo/reset`; the rules; the contract tests for all of them, including the persistence test. |
| P3 SPA shell | The React integration; `EnrolmentApp` server-rendered and hydrated; the session list with Now/Next and dates; in-place enrolment details; the requirements sidebar; notices; `url.ts`. Read-only at first, then wired to the P2 API. |
| P4 Add & drop | `AddClass`, `ClassChooser`, Drop, the sidebar's Add, pending states, focus handling, network errors; the component tests. |
| P5 Browse | The catalogue: `search.ts`, filters, sort, paging, bulk add, the Required and Enrolled annotations, URL sync. |
| P6 Polish & ship | Phone layout; the real-browser pass (§10); the README (served at `/readme/`, with the D9 before crops and after screenshots); `PROCESS.md`; `reflections/crit-7.md`; deploy and verify on Fly. |

P0's proposed rules:

- P&C is the source of truth for course data, and no course data is
  invented;
- provenance is recorded for every data file;
- the crawler is polite, cached, and never runs in the app or CI;
- contract tests come before features;
- the server derives all status, and the client only renders it;
- never prerender `/`;
- keep `/api/events` streaming;
- schema changes only through `db:generate`;
- nothing from the signed-in ANUHub session is committed except the crops
  the user approved.

**M2** (starts after M1 is deployed)

| Phase | Delivers |
|---|---|
| M2-P1 Clock | The `students.today` migration; the bar with Date and "Use real date"; `POST /api/demo/settings` for the date; the date tests. |
| M2-P2 Program | The program and plan selects, pair validation, sidebar recompute, career warnings; the four more template students and the per-program Reset; the program and reset tests. |
| M2-P3 Ship | Bar styling at phone width, an accessibility pass, a README section on the settings bar, deploy. |

## 13. Risks

- **P&C markup changes, or the crawl hangs.**
  - Mitigation: raw responses are cached, requests are retried, and the
    snapshot is committed, so the app never needs P&C at runtime.
  - Pages that won't parse are listed in the provenance file. If one
    matters, the answer is an override, not invented data.
- **2027 data is indicative.** P&C: "the list of offerings for future years
  is indicative only". Its 2027 pages already disagree with themselves: the
  VCOMP page drops Machine Learning from its links but keeps it in the
  prose.
  - The UI labels 2027 offerings "Indicative".
  - The tests pin the snapshot.
- **Some courses list no session.** 28 of 2026's COMP courses (27 in
  2027) have an empty Session in P&C's JSON, among them COMP6250, COMP8260,
  COMP8490 and COMP8539. It's unverified whether that means "not offered".
  - The prototype reads classes only from each course page's offerings
    table, never from the JSON's Session field. A course with no rows
    there shows "No classes listed in P&C for 2026–2027".
  - The provenance file lists every such course.
- **Requirement prose resists parsing.**
  - R1 turns anything unrecognised into a verbatim note, so the sidebar may
    track less than a human would, but it never tracks something wrong.
  - The golden test makes every change to the parsed shape visible in
    review.
- **P&C's own inconsistencies become visible.**
  - VCOMP requires one of COMP6250 or COMP8260, and P&C lists no classes
    for either in 2026–2027. Its sample plan uses COMP8280 instead.
  - Requirement prose sometimes names a course by an old title (COMP7710
    "Structured Programming").
  - Decision: show P&C's catalogue data as it is, take titles from
    `courses`, and let the sidebar say "No classes listed". This is a real
    finding worth raising at the crit.
- **M2's time travel over a fixed history can look odd**, for example
  future enrolments at a date before the student commenced.
  - Mitigation: the bar is labelled demo-only, the date range is limited to
    2026–2027, and §11.3 defines the behaviour.
- **Hydration mismatches, or a heavy bundle.**
  - Mitigation: the client never reads its own clock or locale.
    `format.ts` renders dates from ISO strings, and a component test fails
    on any hydration warning.
  - The bundle is React plus the app (tens of kB gzipped). The browser pass
    checks first paint at phone width.
- **The CI link checker follows every server-rendered link**, including
  sort, paging and the sidebar's pre-filtered catalogue links.
  - The set is bounded: 3 sorts × a few pages, plus one filtered page per
    tracked course. Sort and paging links keep the current filters and add
    none, and each sidebar link sets only a course code on an otherwise
    unfiltered catalogue, so the checker can't wander into endless
    combinations.
  - P6 records how long the deploy job's link check takes.
- **The README crops come from a real signed-in ANUHub session** (D9).
  - They are cropped to the view being compared.
  - The user can still ask for blurring before P6 commits them.

## 14. Open questions

Revision 2's questions were answered on 2026-09-24:

1. **Programs**: BCOMP, AACOM, AACRD, 7706XMCOMP and 7722XVCOMP. Yes.
2. **Plans**: the §8.1 picks. Yes.
3. **M2 program switch**: keep the enrolment history and recompute the
   sidebar, plus a Reset that loads each program's own demo history
   (§11.3).
4. **Years**: 2026–2027 only. Yes.

Revision 3's questions were answered on 2026-09-24, when the user
approved this spec:

1. **Framework**: React 19 (§4.1 a2). User decision.
2. **M2 templates**: the §11.3 picks stay. The user left the choice to the
   agent, and the agent kept them.

No questions are open.

### Clarifications from planning (2026-09-24)

Writing the implementation plan surfaced gaps and one conflict in this
spec. Each is resolved as below. The plan's "Spec clarifications" section
holds the detail.

1. **Two classes of one course in one session.** §6.3 refuses a class when
   the student is already enrolled in the course that session, while §10
   expects two class numbers of one course to "enrol both". The resolution
   refuses the second class unless the two classes have different topics
   (a topics course such as COMP8020). The chooser says when only one can
   be taken. §10's "enrols both" is tested with a course whose classes
   differ by topic; for POGO8062, one class enrols and the other is
   refused.
2. **Entry problems answer HTTP 422** and show under the input. These are
   garbage, an unknown course, a course not offered in the session, and a
   class number from another session. Per-class refusals come back as
   outcomes, with the view, in a 200.
3. **The nav names the plan**, as in "Demo Student · u7000001 · MCompAdv ·
   Artificial Intelligence". `MCompAdv` is P&C's "Post Nominal", stored in
   a new `plans.postNominal` column. There is no invented "(AI)".
4. **Landmarks are siblings**, in this order: header (nav, h1, notices),
   aside (requirements), main (sessions, browse), footer. CSS moves the
   aside right of main at 960px. axe's `landmark-complementary-is-top-level`
   and `region` rules require this, and it is also §6.1's phone order.
5. **Consecutive plain paragraphs** in one chunk of a requirements section
   (between empty paragraphs) merge into one note. A course line that
   links two courses (an either/or) makes its group a note.
6. **Catalogue annotations** (Enrolled, Completed, Adding closed) come from
   server data. The client doesn't compare dates.
7. **Component-test fixtures** are typed builders, not recorded responses.
8. **The seeder rewrites** template students' plans and enrolments, and the
   requirement tables, on every boot. It only upserts rows that enrolments
   point at (§8.5's "never deletes").
9. **`enrolOpens` is an ISO date** used to decide whether to show the note.
   A new `enrolOpensText` holds the words shown: "early December
   (indicative)".
10. **A class number repeated** in one request is processed once.
11. **Units are stored as REAL.**
12. **The session heading's counts**, and which years sit behind "Show
    earlier sessions", come from server fields.

## 15. Improvements after M2 (2026-09-27)

The user picked six improvements from a list the agent measured on the
build: "add 1-6, ask first for all drop except for sessions not started,
and add drop consequence explaining for other sessions." Each rule below
supersedes the earlier text it names.

### 15.1 Past and quiet sessions fold away

Supersedes §6.2's "earlier years sit behind 'Show earlier sessions'".

- Every **past** session, from any year, sits behind one "Past sessions
  (*n*)" fold at the top of the list.
- An **intensive** session that isn't past and has none of the student's
  classes (dropped ones count as classes) sits behind its year's
  "Intensive sessions (*n*): Winter, Spring" fold, after that year's other
  rows.
- Everything else stays in the main list, grouped by year. On 2026-09-24
  that is Second Semester 2026, First Semester 2027 and Second Semester
  2027. Measured after hydration, the next semester's add box moves from
  1,129 px to 775 px down on a 1280×800 laptop, and from 1,889 px to
  1,335 px on a 390×844 phone. 374 px of the phone figure is the M2 demo bar.
- A fold opens when it holds a session the URL (`?open=`) or the chooser
  opened.
- The server derives each row's `fold`; the client only groups by it.

### 15.2 Drop asks first once a class has started

Supersedes the one-click **Drop** of §6.2.

- **A class that hasn't started** (`today < class.startDate`, the same line
  as §5.3's "dropped before the start") still drops in one click. A note
  beside Drop says why that's safe: "It hasn't started, so dropping it
  leaves no record; you can add it back until Mon 1 Mar."
- **Any other droppable class** shows "Drop…". It opens a confirmation in
  place, "Drop COMP6442 Software Construction (class 8707)?", with **Keep
  COMP6442** and **Drop COMP6442**. Escape and Keep return focus to Drop…
- The confirmation lists what dropping now means, from the dates the page
  already has and ANU's census rules (census-dates page, checked
  2026-09-27):
  - **Re-adding**: "You can add it back until Mon 1 Mar" or "You can't add
    it back: adding closed on Mon 3 Aug."
  - **On or before the class's census date**: "No fee and no grade on your
    transcript if you drop by Wed 31 Mar, the census date."
  - **After census**: "You'll still be charged for it: the census date was
    Mon 31 Aug." Then one of:
    - WD (withdrawal without failure) until the session's last day to drop
      without failure: "…if you drop by Fri 9 Oct; after that it's WN
      (withdrawn with failure)";
    - WN once that day has passed;
    - WD for intensive classes, which ANU grades WD up to their last day.
  - **International students**, when the drop would leave the half-year
    under 24 units (Summer, Autumn and Semester 1, or Winter, Spring and
    Semester 2): "International students need a Reduced Study Load
    Application in ANUHub to drop below 24 units in a half-year; this would
    leave 18 units in the second half of 2026." The prototype doesn't know
    who is international, so the line is conditional in its wording.
  - A link to ANU's census-dates page.
- Countdowns follow §15.4. The server writes every line (`dropConfirm`,
  `dropConsequences`).

### 15.3 The student keeps their place after a write

Supersedes §6.6's "after a write, focus moves to the notices region" and
§6.3's "focus moves there". Moving focus scrolled the page to the top: adding
from the catalogue at 1,705 px left the student at 0.

- **Focus stays** on the control that made the write. If the result
  removed that control, focus goes to what replaced it:
  - the add input, after an add or a chooser add;
  - the course's link in the sidebar, after its Add;
  - the bulk bar's Dismiss, after a bulk add;
  - the class row, now "Dropped", after a drop (or the add input, if the
    drop removed the row).
  - Focus moves without scrolling.
- **The outcome shows beside the control** as well as in the notices
  region:
  - under the add input, or in a chooser that stayed open;
  - under the sidebar course;
  - in the bulk bar, until Dismiss or the next selection;
  - in the session's details, after a drop;
  - in the demo bar, after Apply or Reset.
- The next write clears it.
- **The notices region stays the one live region.** It announces each
  outcome politely without taking focus. Each result renders new list items,
  so a repeated message is announced again.
- A 422 entry problem still returns focus to the input, where it is read
  with its linked message.

### 15.4 Deadlines count down

Supersedes §6.2's fixed key-date wording within a fortnight of a deadline.

- A key date 0–14 days away reads as a countdown with its weekday:
  - "adding closes in 3 days (Mon 1 Mar, 11:59pm)", "…tomorrow (…)" and
    "adding closes today at 11:59pm". ANU's pages give 11:59pm for the
    semester add deadline (research §1d), and no other deadline gets a time.
  - "census in 5 days (Wed 31 Mar)", "census tomorrow (…)", "census today".
  - "drop without failure closes in 7 days (Fri 7 May)".
  - "drop closes in 3 days (Wed 2 Jun)".
- Further out, or once passed, the key dates keep their plain form ("add
  until 1 Mar", "add closed 3 Aug").
- The server writes the text from `today(student)`, so the M2 date moves it
  too.

### 15.5 Permission codes, flagged only where they apply

ANUHub shows its permission-number box to everyone (research §7). The page
flags a class only when ANUHub would actually want a code from this student.
It still doesn't ask for or check codes (§3 non-goals).

- **Two sources** (`permission.ts`):
  - **Career**: a class from another career, e.g. an undergraduate class for
    a postgraduate program (research §8d).
  - **P&C's requisites**: a sentence that mentions a permission code, read
    with P&C's two conditions:
    - "in intensive mode" applies only to classes in intensive sessions
      (COMP8430);
    - "previously completed COMP3710 or COMP6470" applies only when the
      student has completed one of them (COMP4712, COMP8712);
    - every other wording asks unconditionally. There are 15 such courses
      in the snapshot, including COMP8800 and COMP8020.
- **Where it shows**:
  - a "Permission code" tag on catalogue rows;
  - "Needs a permission code: …" in the chooser and on a live enrolment;
  - an info notice after enrolling: "COMP8800 needs a permission code in
    ANUHub: P&C's requisites ask for one. This prototype doesn't ask for
    one."
  - Each links to ANU's permission-codes page.
- The server computes the notes per student. A cached catalogue is dropped
  when the view's date, student or program changes.

### 15.6 Class pages, timetables and tutorials

Tutorials are a separate system (MyTimetable), which research §7 lists as a
pain point.

- **Every class links to its P&C class page**:
  `https://programsandcourses.anu.edu.au/{year}/course/{code}/{session name
  without the year}/{class}`, for example `/2027/course/COMP8800/First%20Semester/5048`.
  The address was checked on 2026-09-27 for a 2027 semester class and a
  2026 Autumn class. The page carries P&C's own "View Class Timetable"
  link.
  - An enrolment's details say "Class page and timetable (P&C)".
  - Each chooser class has a "class page" link.
  - In the catalogue, the class number is the link.
  - Each link is named in context: "COMP6442 class 8707: class page and
    timetable on Programs & Courses".
- **A session with a current or upcoming class** says, under its classes:
  "Tutorials and labs are chosen separately, in MyTimetable, once allocation
  opens." It links to ANU's timetabling pages, which give each semester's
  MyTimetable dates. MyTimetable itself answers automated requests with 410,
  so the page links ANU's information page rather than the app.

## Sources

The research notes hold the full lists, with a URL on every claim. These
are the sources the spec leans on most:

**ANUHub and ANU guides**

- Live pages, signed in and read-only on 24 Sep 2026: ANUHub notes §8
  (https://selfservice.sas.anu.edu.au/psp/sscsprod/EMPLOYEE/SA/c/ANU_ISIS.ANU_ENROLMENT.GBL)
- Add flow: https://www.anu.edu.au/students/program-administration/enrolment/enrol-for-the-first-time-as-a-coursework-student
- Swap and drop deadlines: https://www.anu.edu.au/students/program-administration/enrolment/swapping-or-dropping-a-course
- 24-unit cap and Overload: https://www.anu.edu.au/students/program-administration/enrolment/overload-your-enrolment
- Permission codes: https://www.anu.edu.au/students/program-administration/enrolment/permission-codes
- ANUHub rename: https://services.anu.edu.au/information-technology/software-systems/anuhub
- Calendars: https://www.anu.edu.au/directories/university-calendar?year=2026 and `?year=2027`

**Framework**

- `@astrojs/react` 7.0.0, with React 19 as a peer dependency:
  https://www.npmjs.com/package/@astrojs/react (checked 2026-09-24)

**Programs & Courses**

- P&C catalogue and its JSON endpoints: https://programsandcourses.anu.edu.au/catalogue
  (the `data-action` attributes list all eight `/data/*` endpoints)
- robots.txt: https://programsandcourses.anu.edu.au/robots.txt
- Classes, dates, modes and topics:
  - https://programsandcourses.anu.edu.au/2026/course/COMP8020
  - https://programsandcourses.anu.edu.au/2027/course/COMP1100
  - https://programsandcourses.anu.edu.au/2026/course/POGO8062
- Requirements:
  - https://programsandcourses.anu.edu.au/2026/program/7722XVCOMP
  - https://programsandcourses.anu.edu.au/2026/specialisation/ARTIF-SPEC
  - https://programsandcourses.anu.edu.au/2026/program/7706XMCOMP
  - https://programsandcourses.anu.edu.au/2026/program/BCOMP
  - https://programsandcourses.anu.edu.au/2026/program/AACOM
  - https://programsandcourses.anu.edu.au/2026/program/AACRD
