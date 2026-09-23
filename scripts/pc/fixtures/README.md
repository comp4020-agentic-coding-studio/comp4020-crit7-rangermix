# P&C page fixtures

Saved Programs & Courses pages that the parser tests (`parse.test.ts`) and
the requirement golden test (`golden.test.ts`) run against. Each file is
the page at `https://programsandcourses.anu.edu.au/<path>` (the same path
as the file, without `.html`), fetched with the crawler's User-Agent. See
`src/data/pc/README.md` for the snapshot they belong to.

They are committed because the crawler's cache (`.cache/pc/`) is not:
without them the tests would need the network. Refresh them by re-running
`pnpm data:fetch` and copying the pages over (plan Task 3, Step 6).
