# Enrolment redesign — design spec

Status: **draft for review, revision 2** (no implementation yet) ·
2026-09-24 · crit 7 ("Build the ANU system you wish existed")

Research behind this spec:

- [`docs/research/2026-09-23-anuhub-enrolment.md`](../../research/2026-09-23-anuhub-enrolment.md)
  covers the current ANUHub flow, from public guides plus a read-only look at
  the live pages (§8).
- [`docs/research/2026-09-24-programs-and-courses.md`](../../research/2026-09-24-programs-and-courses.md)
  covers Programs & Courses (P&C): its programs, majors, specialisations,
  requirement wording, JSON endpoints and page structure.

Every claim in both cites an ANU URL.

Revision 2 folds in the answers to revision 1's open questions and three
new requirements: P&C is the source of truth, a demo settings bar (M2), and
a crawl of all COMP courses plus five programs. It also re-weighs the
approach options against them (§4.1).

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
- It works with JavaScript off (full-page POST/redirect) and is better with
  it on (in-place updates).

### Decisions

D2, D3, D8 and D9 are the user's answers to revision 1's questions. D6, D10
and D11 are the user's new requirements. The rest are design choices,
open to correction.

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
| D11 | **Data scope**: all COMP courses offered in 2026–2027; five programs with up to five plans each (§8.1); every course their requirements name; three multi-class examples. | User requirement. 2025 is left out because the demo student commenced in 2026 (open question 4). |
| D12 | Sessions are keyed by a readable slug (`2027-S1`), not ANUHub's PeopleSoft term codes. | P&C doesn't publish term codes, and the 2027 codes could only be guessed. A slug also makes URLs readable (`/?open=2027-S1`). |

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
- a working no-JS baseline
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

Revision 1 weighed only the page architecture. The new requirements add
three more choices: where the data comes from, how requirement prose
becomes something the sidebar can track, and where M2's settings live.
Each table leads with the recommendation.

**(a) Page architecture**: how the one page updates.

| | Approach | For | Against |
|---|---|---|---|
| **A (recommended)** | **Server-rendered single page + region swap.** Astro renders the whole page from SQLite. Every action is a plain `<form>`: GET for view state and filters, POST + 303 redirect for changes. A ~60-line script intercepts those forms, fetches the resulting page, and swaps the `data-region` elements in place. | One render path. Works with JS off. Every state is a URL, so it can be tested over HTTP like the starter's guestbook test. No new dependencies. **M2 strengthens it**: a date or program change alters every region at once, and the server already derives everything from (student, today), so there is no client state to invalidate. | The server re-renders the whole page per interaction (trivial at this size). Focus and `<details>` state need care after a swap. |
| A′ | Same server, with Astro's built-in `<ClientRouter />` doing the swap. | No custom script; it handles forms and history. | It swaps the whole body and resets scroll and focus on each submit. The page jumps away from the session the student was working in, which is what F4 exists to avoid. |
| B | Astro + a client framework island (React/Svelte) calling JSON endpoints. | Instant filtering; rich widgets. | Two render paths and a new dependency; tests need a browser; nothing works with JS off. Under M2, status would be derived twice (server for validation, client for display), and every client store would need invalidating on a date change. |
| C | Astro partials + htmx. | Small responses. | A new dependency, plus one partial per region to keep consistent with the full page. An M2 settings change refetches every partial, which is the full page anyway. |

**(b) Data pipeline**: how P&C data reaches the app.

| | Approach | For | Against |
|---|---|---|---|
| **D1 (recommended)** | **Snapshot crawler.** `pnpm data:fetch` is run by a person. It caches raw responses in a gitignored directory. `pnpm data:build` normalises them offline into committed JSON plus a provenance file, and the app seeds from that JSON at boot. | Deterministic tests. The app never depends on P&C being up (curl hangs were observed). One polite crawl of about 200 requests. Data changes are reviewable as git diffs. | The data ages until someone re-runs the crawl. The UI states the snapshot date. |
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
| **S1 (recommended)** | **Columns on the sandbox student** (`today`, `programCode`, its plans). | One source for both validation and display; survives reload; Reset restores the template. | None at this scale. |
| S2 | Query parameters (`?asOf=…&program=…`). | Shareable links. | Every link and form must carry them, and forgetting one silently snaps the page back. |
| S3 | A separate cookie. | Works without a sandbox. | A second store to keep in step with the sandbox. Apply is a POST, so a sandbox exists anyway. |

### 4.2 Routes

| Route | Kind | Purpose |
|---|---|---|
| `GET /` | page | The single page. See the query parameters below. |
| `POST /api/enrol` | action | Takes `term` (a session slug) plus either `entry` or one or more `classNumber`. `entry` is free text: a class number or course code. `classNumber` values come from the chooser, the catalogue or the sidebar. It validates each class, enrols the valid ones, stores the outcomes as a flash notice, and redirects 303 back to `/?…` with the view state kept. If `entry` names a course with more than one class, it redirects to `/?choose=CODE&term=…`. |
| `POST /api/drop` | action | Takes `term` and `classNumber`, drops the class, and redirects 303. |
| `POST /api/demo/reset` | action | Resets this browser's sandbox to the template student. |
| `POST /api/demo/settings` | action | **M2 only** (§11). |
| `GET /api/events` | SSE | **Kept as is**: the deploy CI checks that it streams. No new use planned. |
| `GET /readme/` | page | Unchanged (starter contract). |

Query parameters on `GET /`. Session values are slugs such as `2027-S1`.

- **`open`**: the sessions whose details are expanded. Defaults to the next
  semester.
- **`choose`** and **`term`**: the course being picked from, and the
  session to pick it in.
- **Catalogue state**:
  - `browse`: the catalogue's own session. Defaults to the next semester.
  - `q, title, code, class, subject, career, level, mode, sort, page`.

The two session parameters (`term` and `browse`) are kept separate so a
chooser and a filtered catalogue can be open at once.

Constraint carried from CI: **`/` must stay server-rendered**, never
prerendered. The deploy job POSTs to `/` to check that same-origin posts are
accepted and cross-origin posts are refused with 403.

### 4.3 Modules (each small, with one job)

**App**

- `src/lib/schema.ts`: tables (§5).
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
- `src/lib/catalogue.ts`: turns filters into a SQL query, including FTS5.
- `src/lib/requirements.ts`: a pure function over (groups, history,
  classes, today) that returns course and group statuses.
- `src/lib/student.ts`: sandbox lookup, clone and cookie handling.

**Data**

- `src/data/pc/*.json`, `src/data/calendar.json` and
  `src/data/template-student.json` are committed.
- `src/data/seed.ts` imports them, so Vite bundles them into `dist` and the
  Docker image carries them. It upserts them idempotently at boot.

**Crawler** (never runs in the app or CI)

- `scripts/pc/scope.ts`: what to crawl (§8.1).
- `scripts/pc/fetch.ts`: the polite fetcher with its cache (§8.2).
- `scripts/pc/parse.ts`: jsdom parsers for course, program and plan pages.
  jsdom is already a dev dependency.
- `scripts/pc/build.ts`: cache → normalised JSON + provenance.
- `scripts/pc/overrides.json`: facts the requirement prose can't carry.

**UI**

- `src/components/`:
  - `SessionList`, `SessionDetails`, `ClassRow`
  - `AddClass`, `ClassChooser`, `Catalogue`
  - `RequirementsSidebar`, `Notices`
  - (M2) `DemoSettings`
- `src/scripts/enhance.ts`: the region-swap script.

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
  - `description` (P&C's introduction text)
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
- **`course_fts`**: an FTS5 virtual table (external content = `courses`)
  over code, title and description.
  - It is created in a hand-written migration (`drizzle-kit generate
    --custom`) and rebuilt after seeding.
  - FTS5 is confirmed available in the bundled better-sqlite3 (SQLite
    3.53.4).

**Student data** (written at runtime):

- **`students`**
  - `id`
  - `token` (random; held in an httpOnly cookie; null for the template)
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

- A **GET without a cookie** renders the template student read-only. It
  writes nothing to the database, so crawlers, the CI link checker and the
  invariant tests create no rows.
- The **first POST** clones the template (the student row, its plans and
  its enrolment history) and sets the cookie
  `sid=<token>; HttpOnly; SameSite=Lax; Path=/`, adding `Secure` in
  production.
- **Reset** deletes the sandbox's rows and clears the cookie.
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

- **One row per session**, grouped by academic year. Only years at or after
  today's year are shown by default; earlier years sit behind "Show earlier
  sessions".
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
    without actions, as ANUHub does.
  - **Add a class** (F1) shows when the session has any class that can
    still be added. Otherwise the section says why ("Adding closed on
    3 Aug").
  - **Empty state**: "No classes in First Semester 2027 yet. Add one below,
    use your requirements list, or browse classes."
- **Which rows are open**:
  - By default, the **next** semester's row is open.
  - Rows the user opens are kept in `?open=` for no-JS round trips, and
    restored after a region swap.
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

**Outcomes** appear as a list in the notices region, and focus moves there:
"Enrolled: COMP8800 (class ####)" / "Not added: COMP8020 — not offered in
First Semester 2027".

### 6.4 F2 — Browse classes

- **Placement**: a section below the sessions, collapsed by default. It has
  its own **session select**, which defaults to the next semester.
- **Scope note**: the caption states the scope: "All COMP classes, plus
  courses named in the five programs' requirements."
- **Filters** (a GET form), then Apply or Clear:
  - **Search**: full text over code, title and description (FTS5 with
    prefix matching).
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
  - Sortable by code, title or level through links.
  - 50 rows per page, with paging links.
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
  selected classes to First Semester 2027**". It posts the `classNumber`
  values, and the outcomes show exactly as in F1.
- **With JS**: filter changes submit after a 300 ms pause, only the table
  region is swapped, and the URL updates with `history.replaceState`.

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
  course. It posts `entry=CODE`, so a course with several classes opens the
  chooser in that session's row.
- The course code links to the catalogue, pre-filtered to that code. A
  small "P&C" link opens the plan's P&C page.

**Accessibility.** Status is carried by text. The icons (✓ ● ◐ ○ –) are
decorative (`aria-hidden`), and colour is never the only signal.

**Updates.** The sidebar is a swapped region, so it updates on every enrol
and drop.

### 6.6 Progressive enhancement (`enhance.ts`)

1. Intercept `submit` on `form[data-enhance]`.
2. `fetch` the form, following the 303, and parse the returned HTML with
   `DOMParser`.
3. Replace each `[data-region]` on the page with its counterpart in the
   response, matched by `id`. Re-apply the `open` state of any `<details>`
   the user had open.
4. Update the URL: `pushState` after writes, `replaceState` after filter
   changes. Move focus to the notices region after writes.
5. On any error, fall back to normal navigation.

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
specialisations and the user asked for five plans per program (open
question 1).

### 8.2 Fetching (`pnpm data:fetch`)

**Politeness**

- It is run by a person, never by the app or CI.
- It sends an honest User-Agent naming the project and its repo URL.
- Requests are **serial at about 1 per second**, with a 30 s timeout and 3
  retries with backoff. Curl hangs were observed on first contact.
- Every response is **cached on disk** in `.cache/pc/`, which is gitignored,
  so a re-run fetches only what's missing.
- About 200 requests in total, or roughly 4 minutes.
- robots.txt has no `User-agent: *` rule, and this script's agent isn't
  listed.

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
commenced First Semester 2026, rules year 2026.

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
- **Cross-origin POSTs** are refused by Astro's origin check (the CI
  verifies this).
- **Crawler failures** never reach the app, which runs only on the
  committed snapshot:
  - timeouts and soft 404s are retried or recorded;
  - a page that won't parse is listed in the provenance file.

## 10. Testing

**Contract tests** run over HTTP against the built server, in the same
harness as the starter (`spec/*.test.ts`).

- `APP_TODAY=2026-09-24` is set in `global-setup.ts`.
- Tests pin the **committed snapshot**, never live P&C.
- Fixtures that the snapshot supplies (e.g. COMP8800's First Semester 2027
  class number) are looked up from `src/data/pc/*.json` by course code
  rather than hard-coded.

| Test | Proves |
|---|---|
| Every session row shows its start and end dates. Second Semester 2026 and Winter 2026 are **Now**; First Semester 2027 is **Next** and open by default. | F3 |
| Session details are `<details>` on `/`, with no link to another page. | F4 |
| `entry=<class number>` → 303, and a **fresh GET with the same cookie** lists the class under First Semester 2027. | F1, **crit: persists across reload** |
| `entry=<code with one class>` → enrolled directly, with no confirm step. | F1, D2 |
| `entry=<code with several classes>` → the chooser lists each class. Posting two `classNumber` values enrols both. | F1 |
| `entry=` with a code not offered, an unknown code, a class from another session, or garbage → the matching message, and nothing enrolled. | F1 |
| Refusals: the Last Day to Enrol has passed (Second Semester 2026); the course was already completed; a semester would exceed 24 units. COMP8800 can be enrolled for a second take. | rules |
| Catalogue: `subject=COMP&career=PGRD&level=8000` returns only matching rows; `q=<word only in a description>` finds that course; bulk-adding 3 enrols 3. | F2 |
| The template's sidebar shows **Completed · First Semester 2026**, **Enrolled · Second Semester 2026 (now)**, **Not enrolled** with Add, and "No classes listed" for COMP6250. Adding COMP8800 flips it to "Enrolled … (1 of 2)" and the summary to 30 enrolled. | F5 |
| Drop removes the class and the sidebar reverts; a drop after the exam start is refused. | drop |
| Two cookie jars don't see each other's enrolments. A GET without a cookie writes no student row. | sandbox |
| Every course code and class number on `/` exists in the committed snapshot. | D6 |

**Unit tests** cover the pure modules (`sessions.ts`, `entry.ts` and
`requirements.ts`) and the crawler's parsers:

- Saved HTML fixtures of one course page, one program page and one
  specialisation page give the expected rows.
- Soft-404 detection.
- The requirement golden test for the 20 pages.

These need `src/**/*.test.ts` and `scripts/**/*.test.ts` added to
`vitest.config.ts`.

**Routes**: `spec/routes.ts` gains the key states, so the invariants and
axe cover them:

- `/`
- `/?open=2026-S2`
- `/?choose=POGO8062&term=2027-S1`
- `/?browse=2027-S1&subject=COMP`

**Manual browser pass** before shipping (Playwright):

- the region swap with JS on, and the no-JS fallback;
- phone width;
- keyboard-only enrolment;
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
│ Date [2026-09-24 📅] (real date ✓)  Program [7722XVCOMP Master of Computing (Adv.) ▾]│
│ Major / specialisation [ARTIF-SPEC Artificial Intelligence ▾]  [Apply] [Use real  │
│ date] [Reset demo]                                                               │
└──────────────────────────────────────────────────────────────────────────────────┘
┌ nav: Enrolment · About ─────────────────── Demo Student · u7000001 · MCompAdv (AI) ┐
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
- **Major / specialisation**: the plans offered by the chosen program,
  grouped by program in `<optgroup>`s.
  - With JS, only the chosen program's group is shown.
  - Without JS, the server validates the pair: "ARIN-SPEC isn't offered in
    7722XVCOMP".
- **Reset demo** moves here from the nav.

**Behaviour**

- The controls form one POST form (`POST /api/demo/settings` → 303, with
  the view state kept).
- Visitors without a sandbox get one on Apply, like any POST.
- The bar is a `data-region`, so an Apply swaps every region at once.

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

**Reset** restores the template, including the real date.

### 11.4 Seams M1 keeps so M2 is additive

| Seam | In M1 | M2 change |
|---|---|---|
| **Clock**: every date read goes through `today(student)`. | env or real date | `student.today ?? …` first |
| **Completion is derived** from the session end, not stored. | yes | none |
| **`enrolledOn` stamps** use `today(student)`. | yes | none |
| **Program and plans live on the student row**, not in config. | yes | the settings form writes them |
| **Data**: all five programs and their plans are crawled and seeded in P1. | seeded, and only the template's program is shown | the selects read `program_plans` |
| **Schema** | `students` without `today` | one migration adds nullable `today` |

### 11.5 M2 tests

| Test | Proves |
|---|---|
| Setting the date to 2026-12-10 makes Spring 2026 **Now** while First Semester 2027 stays **Next**, and survives a reload. | date |
| Setting it to 2027-03-02 makes First Semester 2027 **Now**, its add closed (last day 1 Mar) and Second Semester 2027 **Next**. COMP8620 then reads "Completed · Second Semester 2026" with no grade. | date, derived completion |
| Switching to AACOM + ARIN-SPEC lists AACOM's compulsory courses and ARIN-SPEC's listed courses, keeps the enrolment history, and warns on a PG class. | program |
| A pair the program doesn't offer is refused with a notice. | validation |
| "Use real date" and Reset restore the defaults. | reset |
| The bar has an accessible name, and the page still has one `<h1>`. | a11y |

## 12. Build order

Each phase ends green (`pnpm check`), committed and pushed, and deployable.

**M1**

| Phase | Delivers |
|---|---|
| P0 Harness | Proposed `CLAUDE.md` rules for the user to accept or rewrite, since the harness is theirs and is marked (see below). The §10 test stubs. |
| P1 Data | The crawler (`scope`, `fetch`, `parse`, `build`) with its parser tests and golden test. **The first crawl runs only with the user's go-ahead.** The committed snapshot and provenance file; `calendar.json`; the schema and migrations (drop `messages`, the new tables, the custom FTS5 migration); the seeder; the template student. |
| P2 Read-only page | The single-page shell; the session list with Now/Next and dates; in-place enrolment details; the requirements sidebar. All read-only from the seed. |
| P3 Enrol | Sandbox cookie; `/api/enrol` (class number, course code, chooser); `/api/drop`; notices; the rules; the persistence test. |
| P4 Browse | Catalogue filters, FTS, level, sort, paging, bulk add, the Required and Enrolled annotations. |
| P5 Enhance | `enhance.ts` region swap, focus and `<details>` restore, debounced filters. |
| P6 Polish & ship | Phone layout; real-browser accessibility pass; the README (served at `/readme/`, with the D9 before crops and after screenshots); `PROCESS.md`; `reflections/crit-7.md`; deploy and verify on Fly. |

P0's proposed rules:

- P&C is the source of truth for course data, and no course data is
  invented;
- provenance is recorded for every data file;
- the crawler is polite and human-run;
- contract tests come before features;
- never prerender `/`;
- keep `/api/events`;
- schema changes only through `db:generate`;
- nothing from the signed-in ANUHub session is committed except the crops
  the user approved.

**M2** (starts after M1 is deployed)

| Phase | Delivers |
|---|---|
| M2-P1 Clock | The `students.today` migration; the bar with Date, "Use real date" and Reset; `POST /api/demo/settings`; the date tests. |
| M2-P2 Program | The program and plan selects, pair validation, sidebar recompute, career warnings; the program tests. |
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
- **The README crops come from a real signed-in ANUHub session** (D9).
  - They are cropped to the view being compared.
  - The user can still ask for blurring before P6 commits them.

## 14. Open questions

Each has a recommended default, which the spec already assumes.

1. **Programs**: BCOMP, AACOM, AACRD, 7706XMCOMP and 7722XVCOMP. AACRD is
   in place of MMLCV, because MMLCV has no majors or specialisations.
   Keep this set?
2. **Plans**: the §8.1 picks leave out HCCC-MAJ and INFS-MAJ (BCOMP), and
   COMP-SPEC, HCCM-SPEC and VCOMP's CSEC-SPEC (Masters). Keep these picks?
3. **M2 program switch**: keep the enrolment history and recompute the
   sidebar (recommended)? Or load a separate template history for each
   program?
4. **Years**: 2026–2027 only (recommended, since the demo student commenced
   in 2026)? Or also crawl 2025, so M2's date can reach back a year?

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
