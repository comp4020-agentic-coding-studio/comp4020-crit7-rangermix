# Process overview

## What I built

A one-page redesign of ANU's class enrolment page, running on a crawled
snapshot of Programs & Courses. The README says what it does and what good
means here.

## How I got here

I started with five functions and a limit:

> let's redesign the enrollment page. check opened chrome page to see the
> current enrolment page. … create a detailed redesign plan. do not start
> other works yet.

The agent read my signed-in ANUHub session read-only first
([`01e0d7d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/01e0d7d)).
My answers to its questions fixed the data and the scope:

> The source of truth of course info is the program and course website
> programsandcourses.anu.edu.au

> above the real demo, pin a setting bar to set current date, different
> major or program. this should be built after current spec, call it M2 …

I overruled its server-rendered approach:

> use single page application for implementation approach instead. you will
> create and run the crawler.

The first render stays on the server, since the course's CI checks run
without JavaScript
([`cc2f01b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/cc2f01b)).
When it asked whether each program needed its own demo history, I answered:

> keep current but provide reset button to load separate demo history

Then:

> approved, write the plan, then do the implementation for M1 first, then M2.

The plan broke the spec into fifteen tasks and listed twelve places where the
spec was silent or contradicted itself, each resolved before building
([`c52cce1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/c52cce1)).
`CLAUDE.md` rules and stubbed contract tests came before any feature
([`3d20cf6`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/3d20cf6)).
The agent crawled P&C once, politely, and committed the snapshot with its
provenance
([`049ac3d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/049ac3d)).
M2's date, program and per-program Reset went in only after M1 was live
([`ebeb18e...90f1643`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/compare/ebeb18e...90f1643)).
Failures became tests, not retries:

- Real P&C data broke the parser three ways; unclear requirement prose now
  becomes a note, never a wrong rule
  ([`512f506`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/512f506)).
- A live link check found README images returning 500
  ([`2793d54`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/2793d54)).
- A fresh reviewer's findings were fixed test-first
  ([`446c317`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/446c317)).

Using the live page, I corrected it
([`6138b2b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/commit/6138b2b)):

> before semester start dropping class should no remain in history.

I asked for improvements, then chose six and changed one
([`6138b2b...4c47140`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix/compare/6138b2b...4c47140)):

> add 1-6, ask first for all drop except for sessions not started, and add
> drop consequence explaining for other sessions.

The change was mine: a class that hasn't started still drops in one click and
leaves no record, but any other drop now asks first and says what it costs,
using ANU's census rules (no fee before census, then WD, then WN).

Each change's test failed first, `pnpm check` stayed green, and CI verified
the live site when I shipped.
