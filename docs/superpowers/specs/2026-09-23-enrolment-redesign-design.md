# Enrolment redesign — design spec

Status: **draft for review** (no implementation yet) · 2026-09-23 · crit 7
("Build the ANU system you wish existed")

Research behind this spec: [`docs/research/2026-09-23-anuhub-enrolment.md`](../../research/2026-09-23-anuhub-enrolment.md)
(every claim there cites an ANU URL).

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

### What "good" means here

- A student can go from "I need COMP6320 next semester" to enrolled
  **without leaving the page and without looking up a class number** in
  Programs & Courses.
- At every moment the page answers three questions at a glance: *which
  session am I enrolling in? what am I enrolled in? what do I still need?*
- The crit spec holds: the app loads at its `*.fly.dev` URL, models a real
  ANU slice wired end to end, and **the core flow (enrol) survives a
  reload**.
- It works with JavaScript off (full-page POST/redirect) and is better with
  it on (in-place updates).

### Assumptions I made (please correct)

| # | Assumption | Why |
|---|---|---|
| A1 | The "choose session page" **is the page's spine**: a list of sessions in which each row's **Enrolment details** unfolds in place. There is no separate route. | ANUHub already starts from a session list with an "Enrolment Details" button per session that opens a new page. Requirement 4 asks for exactly that button to unfold instead. |
| A2 | Add **enrols directly** after inline validation. There is no Add → Continue → Save wizard. A drop shows an inline **Undo** when re-adding is still allowed. | "Add that class directly" (requirement 1). The wizard is the documented multi-page friction. |
| A3 | **"Next" means the next *semester*.** Upcoming intensive sessions (Summer, Autumn, Winter, Spring) get an "Upcoming" badge instead. | Every student enrols for the next semester; intensive sessions are optional and at some colleges need a permission code. |
| A4 | The prototype enforces each class's **Last Day to Enrol** and the drop deadline, but **not** the enrolment *opening* date. The opening date is shown and marked indicative. | ANU hasn't published when 2027 enrolment opens (pattern: early December). Enforcing an opening date would block the crit demo. |
| A5 | There is no ANU login. Each browser gets its own **demo student sandbox**, cloned from a seeded template on its first change (§5.2). | The crit is judged on a public URL, and visitors must not overwrite each other's enrolments. |
| A6 | **Reference data is real**: sessions, dates, term codes, course codes, titles, careers, units, class numbers, delivery modes and per-class dates all come from ANU's public calendar and Programs & Courses (P&C). The only invented data is the **demo student's history**. **Seats and campus are left out**: ANU doesn't publish them, so they would have to be made up. | Keeps the prototype honest. P&C's 2027 offerings are "indicative only", and the UI says so. |
| A7 | The sidebar handles **compulsory** courses and simple **"one of"** groups (e.g. MATH6005 *or* COMP6260). Unit-count rules ("18 units from any 6000–8000 COMP") are out. | Requirement 5 asks for compulsory courses; "one of" groups are how P&C phrases many of them, and cost almost nothing to support. |

## 2. Grounding — the current system

Two sources: ANU's public guides, and a read-only look at the live pages
in a signed-in student session on 24 Sep 2026 (research notes §8). Only
structure and labels were recorded, and nothing was submitted.

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
| Program requirements live in P&C, separately from enrolment. | A requirements sidebar with a live status for each course and one-click add (F5). |
| "Some homepage tiles don't work well on small screens." | Single-column phone layout (§6.1). |

Also confirmed but **not** addressed here: ANUHub doesn't check
prerequisites at add time, and every add reaches the permission-number box
even when no code is needed. Both are non-goals (§3). The first needs
requirement data this prototype doesn't model; the second disappears
because there is no permission step.

## 3. Goals and non-goals

**Goals**: the five functions; persistence across reload; a working no-JS
baseline; accessible (keyboard, screen reader, axe clean); usable at phone
width.

**Non-goals (YAGNI)**:

- real SSO
- permission codes
- prerequisite, incompatibility and co-taught checks (e.g. COMP6120 ↔
  COMP2120)
- **Swap** (Drop + Add covers it for now)
- overload requests
- the international-student minimum load
- tutorial allocation (MyTimetable's job)
- fees
- seats, waitlists and campus
- unit-count requirement rules (A7)
- editing the catalogue in the UI
- keeping a catalogue selection across pages

## 4. Architecture

### 4.1 Approaches considered

| | Approach | For | Against |
|---|---|---|---|
| **A (recommended)** | **Server-rendered single page + region swap.** Astro renders the whole page from SQLite. Every action is a plain `<form>`: GET for view state and filters, POST + 303 redirect for changes. A ~60-line script intercepts those forms, fetches the resulting page, and swaps the `data-region` elements in place. | One render path; works with JS off; every state is a URL, so it can be tested over HTTP like the starter's guestbook test; no new dependencies. | The server re-renders the whole page per interaction (trivial at this size). Focus and `<details>` state need care after a swap. |
| B | Astro + a client framework island (React/Svelte) calling JSON endpoints. | Instant filtering; rich widgets. | Two render paths, client state to keep in sync with the database, a new dependency, tests that need a browser; nothing works with JS off. |
| C | Astro partials + htmx. | Small responses. | A new dependency, plus one partial per region to keep consistent with the full page. |

Approach A matches the starter's own pattern (POST → 303 → re-render from
SQLite).

### 4.2 Routes

| Route | Kind | Purpose |
|---|---|---|
| `GET /` | page | The single page. Query parameters carry view state: `open` (sessions whose details are expanded; the next semester by default), `choose` + `term` (the course being picked from, and the session to pick it in), and catalogue state `browse` (the catalogue's own session; the next semester by default), `q, title, code, class, subject, career, level, mode, sort, page`. The two session parameters are kept separate so a chooser and a filtered catalogue can be open at once. |
| `POST /api/enrol` | action | `term` plus either `entry` (free text: a class number or course code) or one or more `classNumber` (from the chooser, the catalogue or the sidebar). Validates each class, enrols the valid ones, stores the outcomes as a flash notice, and redirects 303 back to `/?…` with view state kept. If `entry` names a course with more than one class, redirects to `/?choose=CODE&term=…`. |
| `POST /api/drop` | action | `classNumber` → drop → 303. The notice carries an **Undo** form while re-adding is still allowed. |
| `POST /api/demo/reset` | action | Resets this browser's sandbox to the template student. |
| `GET /api/events` | SSE | **Kept as is**: the deploy CI checks that it streams. No new use planned. |
| `GET /readme/` | page | Unchanged (starter contract). |

Constraint carried from CI: **`/` must stay server-rendered**, never
prerendered. The deploy job POSTs to `/` to check that same-origin posts are
accepted and cross-origin posts are refused with 403.

### 4.3 Modules (each small, with one job)

- `src/lib/schema.ts` — tables (§5).
- `src/lib/clock.ts` — `today()`: the Canberra-local date, overridable with
  the `APP_TODAY` environment variable for tests and demos.
- `src/lib/sessions.ts` — pure functions. `classify(sessions, today)` returns
  the current, next, upcoming and past sessions. `canAdd(class, today)` and
  `canDrop(class, session, today)` answer the deadline questions.
- `src/lib/entry.ts` — pure function. `parseEntry(" comp 6320 ")` returns
  `{kind: "course", code: "COMP6320"}`; `"5099"` returns
  `{kind: "class", number: 5099}`; anything else is invalid.
- `src/lib/enrol.ts` — the validation rules and the enrol/drop transaction.
  Returns one outcome per class.
- `src/lib/catalogue.ts` — turns filters into a SQL query, including FTS5.
- `src/lib/requirements.ts` — joins requirement groups to the student's
  history and derives each course's status.
- `src/lib/student.ts` — sandbox lookup, clone and cookie handling.
- `src/data/` — curated reference data as committed JSON, plus `seed.ts`,
  which upserts it idempotently at boot.
- `scripts/fetch-catalogue.ts` — a one-off, polite fetch from public P&C
  pages that writes `src/data/*.json`. It never runs in the app.
- `src/components/` — `SessionList`, `SessionDetails`, `ClassRow`,
  `AddClass`, `ClassChooser`, `Catalogue`, `RequirementsSidebar`, `Notices`.
- `src/scripts/enhance.ts` — the region-swap script.

## 5. Data model

### 5.1 Tables (Drizzle / SQLite)

**Reference data** (seeded, read-only at runtime):

- **`sessions`** — `termCode` (PK, the real PeopleSoft code, e.g. `3730` =
  First Semester 2027), `name` ("First Semester 2027"), `kind` (`semester` |
  `intensive`), `year`, `startDate`, `endDate`, `examStart`, `examEnd`
  (both nullable), `lastDayToAdd` (semesters), `censusDate`, `enrolOpens`
  (nullable; display only; indicative).
- **`subjects`** — `code` (`COMP`), `name` ("Computer Science").
- **`courses`** — `code` (PK, `COMP6320`), `subject` → subjects,
  `catalogue` (`6320`), `level` (1000 … 9000, from the first digit),
  `title`, `career` (`UGRD` | `PGRD`), `units`, `description`,
  `modeSummary`.
- **`classes`** — `classNumber` (PK), `courseCode` → courses, `termCode` →
  sessions, `mode` (In Person / Online / …), `startDate`, `endDate`,
  `lastDayToEnrol`, `censusDate`. These are the real columns of P&C's
  "Offerings, Dates and Class Summary" table.
- **`plans`** — `code` (PK: `7706XMCOMP`, `ARTIF-SPEC`, `CSEC-MAJ`), `name`,
  `kind` (`program` | `major` | `specialisation`).
- **`requirement_groups`** — `id`, `planCode` → plans, `label` ("Compulsory
  courses"), `rule` (`all` | `oneOf`), `position`.
- **`requirement_courses`** — `groupId` → requirement_groups, `courseCode`
  → courses.
- **`course_fts`** — an FTS5 virtual table (external content = `courses`)
  over code, title and description. It is created in a hand-written
  migration (`drizzle-kit generate --custom`) and rebuilt after seeding.
  FTS5 is confirmed available in the bundled better-sqlite3 (SQLite 3.53.4).

**Student data** (written at runtime):

- **`students`** — `id`, `token` (random; held in an httpOnly cookie; null
  for the template), `name`, `uid`, `programCode` → plans, `createdAt`.
- **`student_plans`** — `studentId`, `planCode` (a major or
  specialisation).
- **`enrolments`** — `id`, `studentId`, `classNumber` → classes, `status`
  (`enrolled` | `completed` | `dropped`), `grade` (nullable), `enrolledAt`,
  `droppedAt`. Partial unique index on (`studentId`, `classNumber`) where
  status ≠ `dropped`.

**Removed**: the guestbook's `messages` table (a drop migration) and
`spec/guestbook.test.ts`, which the starter's README says goes when the
starter does.

### 5.2 Demo sandbox (A5)

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

### 5.3 Derived values (computed, never stored)

- **Current**: every session with `startDate ≤ today ≤ (examEnd ??
  endDate)`. There can be more than one. On 2026-09-23 that is **Second
  Semester 2026** *and* **Winter Session 2026**.
- **Next**: the earliest `kind = semester` session starting after today,
  which on 2026-09-23 is **First Semester 2027** (A3). **Upcoming**: any
  other future session (Spring 2026, Summer 2027, …). **Past**: the rest.
- **Can add a class**: `today ≤ class.lastDayToEnrol`. This covers the
  semester rule (Monday of week 2) and the intensive sessions' own dates
  (A4).
- **Can drop**: `today < session.examStart` for semesters, otherwise
  `today ≤ class.endDate`. This is ANU's published rule.
- **Requirement status**, for each course in a group, in precedence order:
  1. Completed → "Completed · First Semester 2025 · HD"
  2. Enrolled in a current session → "Enrolled · Second Semester 2026
     (now)"
  3. Enrolled in a future session → "Enrolled · First Semester 2027"
  4. Otherwise "Not enrolled", plus either **Add** (if the next semester
     offers the course) or "Next offered: Second Semester 2027".

  A `oneOf` group is satisfied once any of its courses is completed or
  enrolled. Its other courses then show "Not needed (group satisfied)".

## 6. Page design

### 6.1 Layout

State shown: the template student after adding COMP6320 and COMP8280 to
First Semester 2027, then typing `POGO8062`, which has two 2027 classes
(verified on P&C). `####` marks class numbers the fetch script fills in
from P&C; the wireframe doesn't invent them.

```
Desktop (≥ 960px)
┌ nav: Enrolment · About ─────────── Demo Student · u7000001 · MComp (AI) · Reset ┐
│ h1  Enrolment                                                                   │
│ [notices — aria-live]  Enrolled: COMP8280 (class ####)                          │
├──────────────────────────────────────────────────────┬──────────────────────────┤
│ h2 Sessions                         [Show earlier ▸] │ aside: Your requirements │
│ 2026                                                 │ Master of Computing · AI │
│ Winter Session 2026    1 Jul–30 Sep     NOW       ▸  │ 4 of 9 complete ·        │
│ Second Semester 2026   27 Jul–30 Oct    NOW       ▸  │ 3 enrolled               │
│   exams 5–21 Nov · add closed 3 Aug · drop to 4 Nov  │                          │
│ Spring Session 2026    1 Oct–31 Dec     UPCOMING  ▸  │ Program · compulsory     │
│ 2027                                                 │ ✓ COMP7710 Completed S1 25│
│ Summer Session 2027    1 Jan–31 Mar     UPCOMING  ▸  │ ✓ COMP6120 Completed S2 25│
│ First Semester 2027    22 Feb–28 May    NEXT      ▾  │ ● COMP6442 Enrolled S2 26│
│   exams 3–19 Jun · add until 1 Mar · census 31 Mar   │ ● COMP8280 Enrolled S1 27│
│   ┌ Enrolment details · 2 classes · 12 of 24 units ┐ │ Program · one of         │
│   │ ▸ COMP6320 Artificial Intelligence · #### · 6u │ │ ✓ MATH6005 Completed S1 25│
│   │ ▾ COMP8280 Responsible Practice… · #### · 6u   │ │ – COMP6260 Not needed    │
│   │     In Person · 22 Feb–28 May · census 31 Mar  │ │ Specialisation · AI      │
│   │     enrolled 23 Sep 2026            [Drop]     │ │ ✓ COMP6262 Completed S2 25│
│   │ Add a class                                    │ │ ● COMP6320 Enrolled S1 27│
│   │ [Class number or course code ______ ] [Add]    │ │ ○ COMP8620 Not enrolled  │
│   │ ┌ POGO8062 has 2 classes in S1 2027 ────────┐  │ │    [Add to S1 2027] or   │
│   │ │ ☐ 5354 In Person  ☐ 5355 Online           │  │ │    "next offered …"      │
│   │ │ [Add selected] [Cancel]                   │  │ │ ○ COMP8691 Not enrolled  │
│   │ └───────────────────────────────────────────┘  │ │                          │
│   └────────────────────────────────────────────────┘ │                          │
│ Autumn Session 2027 …                             ▸  │                          │
│                                                      │                          │
│ ▸ h2 Browse classes  [session: First Semester 2027 ▾]│                          │
│     filters + results table + "Add N selected"       │                          │
└──────────────────────────────────────────────────────┴──────────────────────────┘

Phone (< 960px), single column:
  notices → Requirements (collapsed, summary "4 of 9 complete") →
  Sessions (the next semester expanded) → Browse classes (collapsed).
```

### 6.2 F3 + F4 — Sessions and in-place Enrolment details

- **One row per session**, grouped by academic year. The current and next
  year are shown; earlier years sit behind "Show earlier sessions", which
  is where the history lives.
- Each row shows the session name, start–end dates and a badge (**Now**,
  **Next**, **Upcoming**, **Past**), plus a line of key dates: the exam
  period, the add deadline ("add until 1 Mar" / "add closed 3 Aug"), the
  drop deadline and the census date. Intensive sessions say "dates vary by
  class". Sessions not yet open show "enrolment usually opens early
  December (indicative)".
- Each row is a native **`<details>`** whose summary *is* the row. Opening
  it reveals that session's **Enrolment details**, with no navigation:
  - The heading line: "2 classes · 12 of 24 units", where 24 is the
    self-enrol cap for semesters.
  - One nested `<details>` per class, with a summary of code · title · class
    number · mode · units. Expanded, it shows the class dates, census date,
    the date enrolled, the grade (for completed classes), and **Drop** when
    `canDrop`.
  - **Add a class** (F1), shown when the session has any class that can
    still be added; otherwise it explains why ("Adding closed on 3 Aug").
  - An empty state: "No classes in First Semester 2027 yet. Add one below,
    use your requirements list, or browse classes."
- Defaults: the **next** semester's row is open. Rows the user opens are
  kept in `?open=` for no-JS round trips, and restored after a region swap.
  Several rows can be open at once, e.g. to compare the current and next
  semesters.

### 6.3 F1 — Add by class number or course code

- One input, labelled "Class number or course code", with the hint "e.g.
  5099 or COMP1100". It sits inside a session, so the session is implicit.
  The server parses it (`entry.ts`):
  - **Class number**: it must belong to this session, otherwise "Class 8670
    is in Second Semester 2026, not First Semester 2027". Then validate and
    enrol.
  - **Course code**: find that course's classes in this session.
    - **0 classes**: "COMP8020 isn't offered in First Semester 2027. Next
      offered: Second Semester 2027." (COMP8020 runs in Semester 2 only; its
      indicative 2027 class is 10060.) Or "No course COMP9999" if the course
      doesn't exist.
    - **1 class**: enrol directly. "Enrolled in COMP1100 (class 5099)"
      (plus the career warning for a PGRD student).
    - **More than 1**: an inline **chooser** in place of the input
      (`?choose=CODE&term=…`). One checkbox per class shows its mode and
      dates, for example POGO8062's 5354 (In Person) and 5355 (Online). Then **Add
      selected** or **Cancel**.
  - Anything else: "Enter a class number (digits) or a course code like
    COMP1100."
- **Validation** runs server-side on every class and gives one outcome per
  class. **Refuse** when:
  - the class's Last Day to Enrol has passed;
  - the student is already enrolled in the course this session;
  - they have already completed the course (the notice shows the session
    and grade);
  - it would take a semester above **24 units** ("Going over 24 units
    needs an Overload request through Manage my Degree").

  **Warn**, without blocking, when the class's career doesn't match the
  student's (e.g. a PGRD student adding a UGRD course).
- Outcomes appear as a list in the notices region, and focus moves there:
  "Enrolled: COMP6320 (class ####)" / "Not added: COMP8020 — not offered in
  First Semester 2027".

### 6.4 F2 — Browse classes

- A section below the sessions, collapsed by default. It has its own
  **session select**, which defaults to the next semester.
- **Filters** (a GET form): **Search** (full text over code, title and
  description; FTS5 with prefix matching); **Title contains**; **Course
  code** (a prefix, so `COMP8` works); **Class number**; **Subject area**
  (a select showing code and name); **Academic career** (UGRD/PGRD);
  **Level** (1000–9000); **Mode of delivery**. Then Apply or Clear.
- **Results table**: select, class number, course code, title, career,
  level, units, mode, dates. Sortable by code, title or level through
  links. 50 rows per page with paging links. The `<caption>` states the
  count, session and active filters ("37 First Semester 2027 classes ·
  subject COMP · level 8000").
- Row annotations:
  - "**Required**" on courses in the student's requirement groups, which
    ties the table to the sidebar.
  - "Enrolled" or "Completed · First Semester 2025", with the checkbox
    disabled.
  - "Indicative (2027)" on future-year offerings.
- A sticky bar appears once anything is selected: "**Add 3 selected
  classes to First Semester 2027**". It posts the `classNumber` values, and
  the outcomes show exactly as in F1.
- With JS: filter changes submit after a 300 ms pause, only the table
  region is swapped, and the URL updates with `history.replaceState`.

### 6.5 F5 — Requirements sidebar

- An `<aside aria-labelledby>` headed "Your requirements", naming the
  program and the student's major or specialisation. It has one block per
  requirement group, in P&C order: program compulsory → program "one of"
  groups → specialisation or major compulsory. Each course shows its code,
  title and **status text** (§5.3).
- A progress line: "4 of 9 required courses complete · 3 enrolled". A
  satisfied "one of" group counts as one course.
- Actions:
  - **Add to First Semester 2027** when the next semester offers the course.
    It posts `entry=CODE`, so a course with several classes opens the
    chooser in that session's row.
  - The course code links to the catalogue, pre-filtered to that code.
- Status is carried by text. The icons (✓ ● ○ –) are decorative
  (`aria-hidden`), and colour is never the only signal.
- The sidebar is a swapped region, so it updates on every enrol and drop.

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

- One `<h1>` ("Enrolment"). `<h2>`s for Sessions, Browse classes and Your
  requirements; `<h3>` inside each session row's summary. `<nav>` and
  `<aside>` landmarks; `lang="en-AU"`.
- A real `<label>` on every input. Each checkbox is named in context:
  "Select SCOM8014 class 3419, In Person".
- Notices sit in an `aria-live="polite"` region. Input errors are linked to
  their input with `aria-describedby`.
- The table has `<th scope>` headers and a `<caption>`. At narrow widths it
  sits in a horizontally scrollable, focusable region labelled "Class
  results".
- The invariant suite (with axe) covers every page state listed in
  `spec/routes.ts` (§10). Contrast and layout are checked by hand in a real
  browser, since jsdom can't.

## 8. Reference data

**Scope.** Enough to be real without scraping the university:

- the sessions for 2025–2027 (all six kinds);
- all **COMP** courses;
- every course named in the demo program and its specialisation
  (**7706XMCOMP** + **ARTIF-SPEC**), and in **AACOM** + **CSEC-MAJ** if a
  second template student is added later;
- a few multi-class examples from other subjects (SCOM8014, POGO8062,
  REGN8050), so the chooser has real cases;
- the classes for 2025–2027 as P&C lists them.

**Source and pipeline.**

- `scripts/fetch-catalogue.ts` reads public P&C course pages at a
  rate-limited pace. It extracts the title, career, units, description and
  the offerings table (class number, dates, mode) and writes
  `src/data/catalogue.json`, which is committed.
- The session dates come from the 2025–2027 university calendars. Their
  term codes follow the verified pattern (`3` + year−1990 + session digit +
  `0`, e.g. 3660). The **2027 codes are inferred** and marked as such.
- The fetched Second Semester 2026 COMP classes are checked against the 28
  postgraduate classes seen live in ANUHub (research notes §8e). A mismatch
  is flagged for a human, not silently fixed.
- `src/data/README.md` records the provenance: the source URL for each
  file, the fetch date, and which fields are inferred.
- At boot, `seed.ts` **upserts** by natural key and never deletes, so a
  redeploy with refreshed data never orphans a sandbox's enrolments.

**Demo student (the only invented data).**

- "Demo Student", `u7000001`, Master of Computing, specialisation ARTIF-SPEC,
  started First Semester 2025.
- History uses only real offerings:
  - some program compulsory courses completed in 2025, with grades;
  - enrolled in Second Semester 2026 (e.g. COMP8020 class 9057, the
    user's own example);
  - nothing yet in First Semester 2027.
- So every status (completed, enrolled now, not enrolled, not offered next
  semester, "one of" satisfied) shows on the first page load.

## 9. Error handling

- Each validation failure gets a notice specific to that class. In a batch,
  one failure never blocks the others.
- Each enrol or drop runs in a single SQLite transaction, re-checking the
  duplicate and 24-unit rules inside it, so two tabs can't double-enrol.
- An unknown `term` or `browse` session, filter value or `choose` code falls back to the
  default, and the page says so. **A malformed query string must never
  produce a 500.**
- Cross-origin POSTs are refused by Astro's origin check (the CI verifies
  this).

## 10. Testing

**Contract tests** run over HTTP against the built server, in the same
harness as the starter (`spec/*.test.ts`). `APP_TODAY=2026-09-23` is set in
`global-setup.ts`.

| Test | Proves |
|---|---|
| Every session row shows its start and end dates. Second Semester 2026 and Winter 2026 are **Now**; First Semester 2027 is **Next** and open by default. | F3 |
| Session details are `<details>` on `/`, with no link to another page. | F4 |
| `entry=<class number>` → 303, and a **fresh GET with the same cookie** lists the class under First Semester 2027. | F1, **crit: persists across reload** |
| `entry=<code with one class>` → enrolled directly. | F1 |
| `entry=<code with several classes>` → the chooser lists each class. Posting two `classNumber` values enrols both. | F1 |
| `entry=` with a code not offered, an unknown code, a class from another session, or garbage → the matching message, and nothing enrolled. | F1 |
| Refusals: the Last Day to Enrol has passed (Second Semester 2026); the course was already completed; a semester would exceed 24 units. | rules |
| Catalogue: `subject=COMP&career=PGRD&level=8000` returns only matching rows; `q=<word only in a description>` finds that course; bulk-adding 3 enrols 3. | F2 |
| The sidebar shows **Completed · <session>**, **Enrolled · <session>** and **Not enrolled** for the template, and flips a course to Enrolled after adding it. A "one of" group reads as satisfied. | F5 |
| Drop removes the class; Undo re-adds it; drop after the exam start is refused. | drop |
| Two cookie jars don't see each other's enrolments. A GET without a cookie writes no student row. | sandbox |

**Unit tests** cover the pure modules (`sessions.ts`, `entry.ts`,
`requirements.ts`). This means adding `src/**/*.test.ts` to
`vitest.config.ts`.

**Routes**: `spec/routes.ts` gains the key states so the invariants and axe
cover them: `/`, `/?open=3660`, `/?choose=POGO8062&term=3730` and `/?browse=3730&subject=COMP`.

**Manual browser pass** before shipping (Playwright): the region swap with
JS on, the no-JS fallback, phone width, keyboard-only enrolment, and
screenshots for `PROCESS.md` and the README.

## 11. Build order

Each phase ends green (`pnpm check`), committed and pushed, and deployable.

| Phase | Delivers |
|---|---|
| P0 Harness | Proposed `CLAUDE.md` rules for you to accept or rewrite, since the harness is yours and is marked (real data only, with its provenance recorded; contract tests before features; never prerender `/`; keep `/api/events`; schema changes only through `db:generate`). The §10 test stubs. |
| P1 Data | `fetch-catalogue.ts` and the committed JSON; the schema and migrations (drop `messages`, the new tables, the custom FTS5 migration); the seeder; the template student. |
| P2 Read-only page | The single-page shell; the session list with Now/Next and dates; in-place enrolment details; the requirements sidebar. All read-only from the seed. |
| P3 Enrol | Sandbox cookie; `/api/enrol` (class number, course code, chooser); `/api/drop` + Undo; notices; the rules; the persistence test. |
| P4 Browse | Catalogue filters, FTS, level, sort, paging, bulk add, the Required and Enrolled annotations. |
| P5 Enhance | `enhance.ts` region swap, focus and `<details>` restore, debounced filters. |
| P6 Polish & ship | Phone layout; real-browser accessibility pass; the README (served at `/readme/`, with before/after screenshots); `PROCESS.md`; `reflections/crit-7.md`; deploy and verify on Fly. |

## 12. Risks

- **The "before" screenshots carry personal data.** The live pages show a
  real student's name, program and enrolments, so the screenshots stay out
  of git. Mitigation: for the README (P6), use crops of the Add Class and
  Class Search views with the context line blurred, or a labelled
  wireframe of them.
- **P&C markup may resist scraping.** Mitigation: the fetch script is
  one-off and its output is committed. If a page won't parse, curate that
  course by hand and record it in the provenance README. Scope stays at
  about 150–250 courses.
- **2027 data is indicative** (P&C's wording, and inferred term codes). The
  UI labels it; the tests pin it via the committed data, not the live site.

## 13. Open questions

1. **A2**: direct enrolment with Undo (recommended), or keep a single
   "Confirm" step?
2. **A3**: should "Next" be the next *semester* (recommended), or the next
   session of any kind (Spring 2026, which starts 1 Oct)?
3. **Demo student**: Master of Computing + Artificial Intelligence
   specialisation (recommended, since `COMP8020` suggests a postgraduate
   student)? Or an undergraduate, e.g. AACOM + the Cyber Security major, to
   exercise "major"?
4. **README "before" images**: redacted crops of the live Add Class and
   Class Search pages (recommended), or a wireframe of them?

## Sources

The research notes hold the full list, with a URL on every claim. These
are the sources the spec leans on most:

- Live pages, signed in and read-only on 24 Sep 2026: research notes §8
  (https://selfservice.sas.anu.edu.au/psp/sscsprod/EMPLOYEE/SA/c/ANU_ISIS.ANU_ENROLMENT.GBL)
- Add flow: https://www.anu.edu.au/students/program-administration/enrolment/enrol-for-the-first-time-as-a-coursework-student
- Swap and drop deadlines: https://www.anu.edu.au/students/program-administration/enrolment/swapping-or-dropping-a-course
- 24-unit cap and Overload: https://www.anu.edu.au/students/program-administration/enrolment/overload-your-enrolment
- Permission codes: https://www.anu.edu.au/students/program-administration/enrolment/permission-codes
- ANUHub rename: https://services.anu.edu.au/information-technology/software-systems/anuhub
- Calendars: https://www.anu.edu.au/directories/university-calendar?year=2026 and `?year=2027`
- Class numbers, modes and class dates:
  https://programsandcourses.anu.edu.au/2026/course/COMP1100,
  …/COMP8020, …/SCOM8014, …/POGO8062, …/REGN8050, and the class page
  https://programsandcourses.anu.edu.au/2026/course/COMP1100/First%20Semester/3695
- Requirements: https://programsandcourses.anu.edu.au/2026/program/7706XMCOMP,
  https://programsandcourses.anu.edu.au/2026/specialisation/ARTIF-SPEC,
  https://programsandcourses.anu.edu.au/2026/program/AACOM,
  https://programsandcourses.anu.edu.au/2026/major/CSEC-MAJ
- Public catalogue search: https://programsandcourses.anu.edu.au/catalogue
