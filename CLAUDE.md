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
