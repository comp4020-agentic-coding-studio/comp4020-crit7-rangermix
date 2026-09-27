# Process overview

## What I built

A one-page redesign of ANU's class enrolment (ANUHub): add by class number or
course code, a filterable class catalogue with multi-add, sessions with dates
and Now/Next markers, enrolment details that unfold in place, and a
requirements sidebar. It runs on a crawled, committed snapshot of Programs &
Courses. The README says what it is and what good means here; this file is how
it got built.

## How I got here

### Grounding: the real flow first

I started from the system I actually use. The agent read ANU's enrolment
guides, and then, with my permission, looked at my live, signed-in ANUHub
session read-only:

> the enrolment page is opened in my chrome. if you can't access it, you can
> open https://selfservice.sas.anu.edu.au/psp/sscsprod/EMPLOYEE/SA/c/ANU_ISIS.ANU_ENROLMENT.GBL
> and I'll handle sign in

It recorded structure and labels only, and never clicked Add, Drop, Continue
or Save. That changed the spec: the session list turned out to have no dates
and no 2027 rows yet, the class list cuts titles at about forty characters, and
Add Class takes class numbers only
([`01e0d7d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/01e0d7d)).
For the README's before images I decided:

> crops of the live page. no need to blur unless I further specify

### Directing the spec: three revisions

The first draft
([`3d1b9c1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/3d1b9c1))
invented nothing, but it left the data source open. My answers to its
questions made Programs & Courses the source of truth, split the work into two
milestones, and set the crawl's scope:

> The source of truth of course info is the program and course website
> programsandcourses.anu.edu.au

> above the real demo, pin a setting bar to set current date, different major
> or program. this should be built after current spec, call it M2, the current
> plan/spec M1.

> crawl all COMP courses, total 5 comp program and 5 majors each.

The agent researched P&C's pages and JSON endpoints before rewriting
([`b68d12b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/b68d12b),
revision 2
[`0c305a7`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/0c305a7)).
It had recommended server-rendered pages with region swaps; I overruled that:

> use single page application for implementation approach instead. you will
> create and run the crawler.

Revision 3
([`cc2f01b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/cc2f01b))
kept the first response server-rendered, because the course's invariant tests
and link checker run with scripts off. I picked React, left the M2 template
picks to the agent, and approved it
([`e84f846`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/e84f846)):

> approved, write the plan, then do the implementation for M1 first, then M2.

### Harness and plan

The plan
([`c52cce1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/c52cce1))
turned the spec into fifteen tasks with exact code and tests, and wrote down
twelve places where the spec was silent or contradicted itself. One example:
§6.3 refused a second class of the same course while §10 expected two class
numbers to "enrol both". It resolved each one before building, and the same
list went into the spec. The P0 harness
([`3d20cf6`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/3d20cf6))
proposed the rules in `CLAUDE.md`: P&C is the truth, provenance for every data
file, a polite crawler that never runs in the app, contract tests before
features, and the server derives every status. It also stubbed every contract
test the spec lists, so the contract existed before any code did.

### Building: data first, tests before code

- **Parsers, then a real crawl.** Parsers were tested against saved pages
  ([`4ead7f7`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/4ead7f7)).
  Then the agent ran the crawl once, at about one request a second with an
  honest User-Agent: 194 requests, 167 courses
  ([`049ac3d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/049ac3d)).
- **The snapshot, with its provenance and a golden test.** The build writes
  the normalised JSON and a provenance file, and a golden test pins how all 20
  program and plan pages parse
  ([`512f506`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/512f506)).
  Its cross-check against the 28 classes seen live in ANUHub agreed on 27; the
  28th, COMP6996, isn't a P&C course.
- **Schema, seeding and the demo student**
  ([`8efc307`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/8efc307)).
- **The rules, the view model and the API**, each contract test failing
  before its code
  ([`6204973...1ac35b4`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/compare/6204973...1ac35b4)).
- **The React page**, server-rendered and hydrated, with a test that fails on
  any hydration mismatch
  ([`ad984f4...4bf5e8b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/compare/ad984f4...4bf5e8b)).

### Where the work was corrected

- **Real data broke the parser three ways**, all fixed test-first
  ([`512f506`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/512f506)).
  - A "TBA" date sank whole course pages, including REGN8050, one of the
    spec's multi-class examples.
  - "On Campus" / "Online" group rows were read as topics, which would have
    let a student enrol in both modes of one course.
  - Three requirement sentences were misread:
    - SOFT-SPEC's "excluding the project courses (COMP8715, COMP8800,
      COMP8830)" had become a list to choose from, the opposite of its meaning;
    - SOFT-SPEC's "Note: …" paragraph had become a tracked rule;
    - two of AACOM's honours options had become rules that could never be met.

  The rule I held the agent to was that the sidebar may track less than a human
  would, but never something wrong: unclear prose becomes a verbatim note.
- **A real-browser pass caught what jsdom couldn't.**
  - Every session summary's accessible name ran its words together ("Second
    Semester 202627 Jul–30 OctNow")
    ([`4670ccf`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/4670ccf)).
  - Keyboard users crossed 26 tab stops to reach the add box.
  - The catalogue made the page scroll sideways on a phone.
  - The career warning said "a undergraduate"
    ([`108567a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/108567a)).

  Each got a failing test before the fix. After them, axe with contrast on
  reports no violations.
- **The live link check caught what local tests couldn't.**
  - After the first deploy, every README image on `/readme/` returned 500.
  - Astro had sent them through its image optimiser, which needs `sharp`, and
    the Dockerfile prunes `sharp` away. Locally it resolves, so every local
    test passed.
  - Now they're plain files from `public/`, pinned by a test that fails on any
    optimiser URL
    ([`2793d54`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/2793d54)).

### M2: the demo settings bar

M2 started only once M1 was live, as the plan ordered. It's the bar I asked
for so a crit can see the page on any date, in any of the five programs. When
the agent asked whether each program should get its own demo student, I said:

> keep current but provide reset button to load separate demo history

- **The date setting**
  ([`ebeb18e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/ebeb18e)).
  - Since M1, one function has been the only source of "today". The bar's date
    goes in there first.
  - The badges, the add and drop windows, completion and the date new
    enrolments are stamped with all follow it. None of that code changed.
- **Program, plan and Reset per program**
  ([`90f1643`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/90f1643)).
  - The agent picked the four new demo students from the snapshot by the
    spec's rules.
  - It also held each history to P&C's printed requisites. No student takes
    COMP1110 before COMP1100, for example.
- **What the checks caught.**
  - The plan put the bar first on the page. The skip-link test from the M1
    browser pass failed, because keyboard users would now Tab through the
    bar before reaching "Skip to sessions". The skip link moved ahead of the
    bar.
  - On a phone the pinned bar was 374 pixels tall, 44% of the screen, all the
    time. Now it pins only on wide screens and fits one row from 1280 pixels.
    A skipped-to heading scrolls clear of it.
  - The §11.5 scenarios all worked from the keyboard, and axe with contrast
    on found no violations.

M2 was deployed the same way, and the probes and a live date check passed.

### A fresh review before the crit

A reviewer with fresh context read the whole branch against the spec and the
plan. It found no critical issues and two important ones:

- entry problems weren't announced to screen readers;
- fast typing in a filter could make Safari refuse a URL write and blank the
  page.

The agent re-graded three minor findings up, judging by what a student would
actually get:

- A stale `open=` link collapsed every session row.
- A chooser that replaced another kept its ticks, which could enrol a class
  nobody saw ticked.
- The README image test had landed in a file the course ships frozen.

All five were fixed, each behaviour change test-first
([`446c317`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/446c317)).
The remaining minors are listed for me to decide on.

### After M2: six improvements I chose from measurements

Trying the live page myself, I found a class dropped before the semester
started still sat in the history:

> before semester start dropping class should no remain in history.

That became
[`6138b2b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/6138b2b).
Then I asked:

> other improvements you can think of on the enrolling page?

The agent measured the build before suggesting anything:
- the next semester's add box was 1,129 px down on a laptop;
- adding from the catalogue threw the page back to the top;
- Drop acted in one click on classes that could no longer be added back;
- 18 courses' requisites mention a permission code.

I picked six and changed one of them:

> add 1-6, ask first for all drop except for sessions not started, and add
> drop consequence explaining for other sessions.

Each change was test-first, in its own commit:

- **Past and quiet sessions fold away**
  ([`94cca85`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/94cca85)).
  The add box moved from 1,129 to 775 px down on a laptop, and from 1,889 to
  1,335 px on a phone.
- **Deadlines count down** within a fortnight
  ([`6be009c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/6be009c)).
- **Drop asks first once a class has started**, and says what it costs
  ([`b3c0a06`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/b3c0a06)).
  The wording comes from ANU's census-dates page: no fee or grade on or
  before census, then WD until the drop-without-failure date, then WN. It
  also covers re-adding and the international 24-unit half-year rule.
- **Permission codes are flagged only where ANUHub would ask**
  ([`d0c8c37`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/d0c8c37)).
  That covers a class from the other career, and P&C sentences read with
  their conditions: COMP8430 needs one only in intensive mode, and COMP8712
  only after COMP3710.
- **Each class links to its P&C class page and timetable**, and sessions
  with classes point to MyTimetable
  ([`dec62cd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/dec62cd)).
- **The student keeps their place after a write**
  ([`4c47140`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/4c47140)).
  Focus stays on the control used, and the outcome shows beside it; the
  notices region announces it without taking focus.

The checks caught three things along the way:
- The agent's first phone measurement was taken before the sidebar
  collapsed, so it said 3.4 screens. The fair figure was 2.24.
- A hand count of permission-code courses was one off; running the rule
  itself gave the real number.
- MyTimetable refuses automated requests, so the page links ANU's
  timetabling information instead of a URL it couldn't check.

### How I know it works

`pnpm check` runs a type check, the build, and every test: parsers, the golden
test, the rules, contract tests over HTTP against the built server, and
component tests. The contract tests cover persistence across a reload, every
add path and its message, the 24-unit cap, drop deadlines, sandbox isolation,
malformed links (never a 500) and a racing double submit. The real-browser pass
repeated the core flow, keyboard-only use and the phone layout by hand.

The repo stays private until the cutoff, and CI only runs once it's public, so
M1 was deployed from the worktree with `flyctl`. Then the checks CI would run
were repeated against the live site on 24 September 2026:

- `/` answers 200.
- `/api/events` streams `: connected`.
- A same-origin form POST isn't refused; a cross-site one gets 403.
- An enrolment made with a cookie jar was still there after a reload, and after
  a redeploy.
- The link check (`linkinator --recurse`, same-origin only) scanned 39 links in
  1.2 seconds, so it adds seconds, not minutes, to the deploy job.
