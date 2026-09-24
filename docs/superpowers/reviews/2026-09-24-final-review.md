# Whole-branch review: ANU enrolment redesign (c52cce1..995e184)

I reviewed this read-only, in six passes:

1. The spec, the plan's Global Constraints, clarifications, Review Focus and progress log, `CLAUDE.md`, and every `Ruling:` line.
2. The server: `src/lib`, `src/pages`, the schema, the migrations and the seeder.
3. The React client.
4. The contract, unit and component tests.
5. The crawler, plus targeted queries of the committed snapshot. I read the JSON with python and wrote nothing.
6. CI and config.

I didn't build or run anything. I skipped the generated data except for those targeted queries.

### Strengths

- **The architecture matches D13 and §4.1 closely.**
  - One `buildView(student)` feeds `/`, `/api/view` and every write, so the page, validation and the sidebar can't disagree.
  - The client only combines server flags (`canAdd`, `marks`, `requiredCodes`). A grep of `src/app` finds only equality checks on `today`, never date ordering.
  - Only `clock.ts` derives the business date.
- **The core logic is pure and well tested.** `clock`, `entry`, `sessions`, `requirements`, `search`, `format` and `url` each have focused unit tests.
  - `clock` is tested at Canberra midnight in both AEST and AEDT.
  - `entry` covers NFKC folding, spaces, fullwidth digits, five-digit class numbers and garbage.
  - The contract tests go over HTTP to the built server. They take fixtures from the snapshot by course code rather than hard-coding class numbers.
- **Review Focus 3 and 5 hold by construction, not only by test.**
  - better-sqlite3 is synchronous, and each batch runs in one transaction that reloads the student's rows per class. A double submit therefore sees the first insert.
  - The partial unique index is a backstop, and its error becomes a refusal outcome.
  - Repeated class numbers go through a `Set`.
  - A cookie token must match `^[A-Za-z0-9_-]{32}$` before it reaches a query.
  - GETs never clone a sandbox.
- **Input validation is thorough.**
  - The API answers 415 before parsing a non-JSON body.
  - Every malformed body gets a 400 that names the field. That includes the settings route's check that the date is a real calendar day within range.
  - Entry problems and a mismatched program/plan pair get 422.
  - Every query parameter on `/` is checked against the calendar or the facets, with a notice.
  - I could not build a query string, body or cookie that reaches a 500. The only non-200 on `/` is the Node adapter's 400 for broken percent-encoding (see the rulings).
  - `checkOrigin` is on: Astro 7's default is `true` and nothing overrides it. `allowedDomains` is kept, `/` isn't prerendered, and `/api/events` still streams.
- **The data pipeline is honest and reproducible.**
  - The fetcher is polite: the User-Agent is verbatim, requests are ≥ 1 s apart, with a 30 s timeout, 2/4/8 s backoff and a cache.
  - Soft 404s are detected, and the data checks fail the build.
  - The provenance file lists every override, note, dead link, skipped TBA class and ANUHub difference, and a golden test pins the requirement shapes.
  - R1 errs toward notes. I checked every tracked group's rule and `minUnits` against its courses' unit totals, and all are consistent.
  - The templates are validated against the snapshot at boot and follow P&C's printed requisites.
- **The accessibility basics are solid and tested.**
  - The landmarks are siblings in phone order, and there's one h1 and a clean heading outline.
  - Inputs are labelled, and each checkbox is named in context.
  - Status icons are `aria-hidden`.
  - The notices region is live and takes focus after writes.
  - The skip link is the first Tab stop.
  - The results table sits in a focusable, labelled region with a caption, `scope` and `aria-sort`.
  - Three hydration tests pass with no mismatch warnings.
- **M2 is cleanly additive.** It adds one nullable column, the `today(student)` seam and `resetSandbox(cookies, programCode)`. The details are careful:
  - Apply doesn't turn an untouched real date into a pinned demo date.
  - Reset keeps the date setting.
  - Catalogues cached for an old date are dropped when the view's date changes.
- **The rulings are specific.** Each states what it costs if wrong. The one plan expectation that proved impossible (percent-encoding) was investigated rather than papered over.

### Issues

#### Critical (Must Fix)

None found.

#### Important (Should Fix)

1. **Entry problems are silent for screen-reader users.** `src/app/store.ts:144`, `src/app/components/AddClass.tsx:37-51`.
   - **What's wrong:**
     - A 422 is the commonest failure: a typo, an unknown code, a course not offered, or another session's class number. It only sets `entryErrors`. The message goes into a plain `<p>`, which is added to the input's `aria-describedby`.
     - Nothing is announced. The `<p>` isn't a live region, and screen readers don't re-read a focused field when its description changes.
     - Focus isn't managed on this path. If the user submitted with the Add button, that button is disabled during the request. Browsers that apply the HTML focus-fixup rule then drop focus to the document. The success path recovers by focusing the notices; the 422 path doesn't.
   - **Why it matters:** F1 is the core flow, and §3 names screen-reader use as a goal. A screen-reader user who types `COMP9999` hears nothing and can't tell whether the add is still running.
   - **Fix:**
     - Render the error with `role="alert"`, which is announced when it's inserted.
     - On a 422, move focus back to `#entry-<session>` so the field is read with its new description.
     - Extend the "shows an entry problem under the input" test in `chooser.test.tsx` to assert the alert role and `document.activeElement`.

2. **URL sync calls `history.replaceState` on every keystroke, with no try/catch and no error boundary.** `src/app/EnrolmentApp.tsx:28-33`, driven by `src/app/components/Filters.tsx:22`, which changes the URL state once per character.
   - **What's wrong:**
     - Each filter keystroke re-runs the effect and calls `replaceState`.
     - WebKit throttles this API: in the versions I know of, it throws a `SecurityError` past about 100 calls in a short window ("Attempt to use history.replaceState() more than 100 times per … seconds"). Chrome and Firefox throttle too, but with console warnings.
     - The throw happens inside a passive effect, and nothing catches it. React unmounts a root on an uncaught error, so the island would go blank mid-demo.
   - **Why it matters:** it needs Safari plus a burst of filter typing (or a held Backspace), so it's unlikely. But the outcome is the worst possible one for a live crit, and the fix is a few lines. The code comes straight from the plan (plan line 5953).
   - **Fix:**
     - Wrap the call in try/catch.
     - Debounce URL writes for the text filters. `useSettled` already debounces the caption announcement by 500 ms and can be reused.
     - Optionally add a top-level error boundary with a "reload" message.

#### Minor (Nice to Have)

1. **A link whose `open` names only unknown sessions closes every row instead of falling back to the default.** `src/app/url.ts:38-48`.
   - `/?open=2099-S9` gives `open = []`, so no row is open. That includes the next semester, which holds the Add input. Meanwhile the notice says the session "was ignored".
   - The client then rewrites the URL to `/?open=`. A reload keeps every row closed and no longer shows the notice.
   - Spec §4.2 and §9 say an unknown value falls back to its default, and Review Focus 1 expects "default state". `spec/urls.test.ts:9-10` checks only the notice text.
   - The plan's own `url.ts` has the same logic (plan line 5171), so the implementation inherited plan-level drift.
   - **Fix:** use `null` when every id is unknown, and keep `[]` only for an explicitly empty `open=`. Add an assertion that `/?open=2099-S9` opens First Semester 2027.

2. **The chooser keeps stale ticks when another chooser replaces it in the same session.** `src/app/EnrolmentApp.tsx:84-90` (no `key`), `src/app/components/ClassChooser.tsx:15,56`.
   - `picked` survives the prop change. To reproduce:
     1. As a SOFT-SPEC student, type `POGO8062` into First Semester 2027 and tick 5354.
     2. Click the sidebar's "Add to First Semester 2027" for REGN8014. It is the only multi-class tracked course there.
     3. REGN8014's chooser appears with nothing ticked, but "Add selected" is enabled.
     4. "Add selected" sends 5354 along with anything the user ticks.
   - A student can end up in POGO8062 without seeing it selected. It's hard to reach, since today's data has only this one pair. The plan's code has the same shape (plan line 6813).
   - **Fix:** add ``key={`${chooser.sessionId}:${chooser.course.code}`}`` to `<ClassChooser>`.

3. **Catalogue selection and filters can disagree with what's shown.**
   - **Blocked rows still count as selected.** `src/app/components/Catalogue.tsx:45`.
     - `picked` counts selected rows that have since become blocked: a class added through the session input, or one closed by a date change.
     - Their checkboxes render unchecked and disabled (`Results.tsx:62-69`), yet the bulk bar still says "Add 1 selected class". It sends the class, and the server refuses it.
     - **Fix:** filter `picked` with the same `blocked` test.
   - **Filters survive a session change.** `Catalogue.tsx:62` → `openCatalogue`.
     - Changing the catalogue's session keeps any subject, level or mode value the new session may not offer.
     - React then shows the first option ("Any") while the filter still applies, so the table can be empty under selects that all read "Any". The caption does still name the filter.
     - On reload the server drops such values (`url.ts:76-87`), so the client and server disagree until then.
     - **Fix:** drop unknown facet values on a session change, with a notice, as the server does.

4. **The summary counts a course twice when two tracked groups list it.** `src/lib/requirements.ts:117-141`.
   - These pairs in the snapshot overlap:
     - 7706XMCOMP + SOFT-SPEC: COMP6120 is in both `all` groups.
     - BCOMP + DTSC-MAJ: MATH2307 and STAT1003 are in two `units` groups.
     - BCOMP + SOFT-MAJ: INFS3024 is in two `units` groups.
   - Completing COMP6120 moves "done" by 12 units, and the total counts it twice, so "Tracked: x of y units" is wrong.
   - No default template hits this, but M2's program switch reaches it.
   - It follows §5.3's formula, which sums per group, so it's a gap in the spec.
   - **Fix:** count each (course, take) once in the summary.

5. **A grade shows on classes that aren't completed.** `src/lib/view.ts:87`, `src/app/components/ClassRow.tsx:52-57`.
   - With an M2 date before 21 Jun 2026, the graded First Semester 2026 history reads "Enrolled", but its details still show "Grade D".
   - §6.2 shows the grade only for completed classes, and §11.3 says such classes read as future enrolments.
   - **Fix:** send `grade` only for the `completed` and `failed` states.

6. **The plan contradicts itself on `page=999`.** `src/app/url.ts:93-97`, `src/lib/search.ts:58`, `spec/urls.test.ts:24-27`.
   - Review Focus 1 (plan line 138) lists `page=999` among the cases that get a notice and the default state.
   - The plan's Task 11 test (plan line 7541) asserts a silent clamp, and that's what shipped: the last page, no notice, and `page=999` left in the URL.
   - Clamping is friendly, but the plan should pick one. Either add a notice ("page 999 is past the end; showing page 5 of 5") and write the clamped page back to the URL, or amend the Review Focus.

7. **The sidebar's course-code link doesn't move focus.** `src/app/store.ts:216-219`.
   - It filters the catalogue in place and scrolls to it, but focus stays in the sidebar. A keyboard user's next Tab continues through the requirements, far from the results. A real navigation would have reset focus.
   - **Fix:** after the scroll, focus `#browse-heading` with `tabIndex={-1}`, or the Course code filter.

8. **An AACOM and AACRD requirement paragraph is lost from the snapshot.** `scripts/pc/parse.ts:342-348,373`, `scripts/pc/build.ts:114-122`.
   - When `classify` turns a run of course lines into a note, the group keeps only the heading as its `text` and drops the lines. That's normally fine, because the linked courses are listed with their titles.
   - Here the one line under "Honours Calculation" links COMP4801, which has no P&C page, so `finaliseGroups` drops the course. The whole APM paragraph goes with it.
   - AACOM #16 and AACRD #11 now read only "Honours Calculation". The next note ("The APM will then be used…") refers to a definition that isn't there.
   - This breaks the rule that `text` keeps P&C's sentence verbatim.
   - **Fix:** keep the heading plus the lines in that case, as the either/or branch already does. Then re-run `data:build`; the golden test will show the diff.

9. **Nothing warns about a second take of a course in another session.** `src/lib/enrol.ts:74-87`, `src/lib/requirements.ts:68`.
   - Adding COMP6442 to First Semester 2027 while currently enrolled in it succeeds silently.
   - The sidebar caps enrolled takes at `times`, so it keeps showing only "Enrolled · Second Semester 2026 (now)". The duplicate shows only in the 2027 row.
   - The spec is silent, but a reasonable student would expect a warning that doesn't block, like the career warning: "You're already enrolled in COMP6442 in Second Semester 2026."

10. **`spec/readme.test.ts` was changed, but the Global Constraints (plan line 41) say it stays as shipped.** `spec/readme.test.ts:33-46`.
    - The new image test is additive and sound.
    - **Fix:** move it to its own file, for example `spec/readme-images.test.ts`, so the shipped file stays pristine if the template is re-synced. The Task 12 ruling didn't mention the constraint.

11. **Nits:**
    - `createdAt` reads the machine clock outside `clock.ts` (`src/lib/student.ts:104`, `src/data/seed.ts:116`). As an audit stamp it's harmless, but rule 6 is literal. Route it through `clock.ts`, or scope the rule to "the business date".
    - Every 5xx shows as "Couldn't reach the server, so nothing changed" (`src/app/api.ts:31`). That isn't true if the write committed before a later step failed.
    - An entry over 100 characters gets a technical 400 in the notices (`src/pages/api/enrol.ts:22`) instead of the entry message under the input. Add `maxLength={100}` to the input, or answer 422 with the standard message.
    - The input is cleared even when a 200 comes back with a refusal (`store.ts:155-156` → `AddClass.tsx:23`).
    - The copy disagrees: `requirements.ts:105` says "No more classes listed", while `enrol.ts:50` says "No other open classes listed". The second is the accurate one.
    - A `?choose=` link for a course with one class renders "has 1 classes" (`ClassChooser.tsx:26`).
    - If a chooser's first class is closed, the focus effect targets a disabled checkbox and focus goes nowhere (`ClassChooser.tsx:19-21,34`).
    - The Drop button's `aria-label` still says "Drop …" while its text reads "Dropping…" (`ClassRow.tsx:60`).
    - After a switch to a program the student never had, the reset message says "you're Demo Student (u7000003) again" (`src/pages/api/demo/reset.ts:15`).
    - In theory `refresh()` can apply an older `/api/view` over a newer write's view if the responses arrive out of order (`store.ts:205-209`). A request sequence number would close that.
    - The client never reads `Catalogue.today`. `loading` is true while any session loads, not just the one shown (`EnrolmentApp.tsx:105`).
    - Two small layering leaks: `lib/student.ts` throws an HTTP `ApiError`, and the app imports its types from `scripts/pc/build.ts`.

**Test gaps:**
- No component test covers `DemoSettings`' payload logic: an unchanged date isn't sent, a program change selects its first plan, and Reset is labelled with the selected program. A regression there would silently pin the date.
- No test covers how an entry error is announced or where focus goes.
- No test checks that an unknown `open` keeps the default row open.
- No test covers one chooser replacing another.

#### On the executor's rulings

I weighed every `Ruling:` line and agree with all of them. Notes on four:

- **Task 9, broken percent-encoding: confirmed.** `@astrojs/node`'s standalone handler runs `decodeURI(req.url)` and answers "Bad request." before the app or any middleware runs (`node_modules/@astrojs/node/dist/standalone.js:36-41`). Accepting a 400 is right; fixing it would mean replacing the adapter's server.
- **Task 12, README images: the fix is right.** But its test landed in a file the Global Constraints freeze (Minor 10).
- **Task 15, the bar pins only from 960px: a justified departure from §11.2's "pinned".** Pinned, the bar took 44% of a phone screen.
- **Task 4, the data rulings: all err toward R1's safe side.** They are the skipped TBA rows, mode rows not read as topics, and the three extra note rules, and the provenance file records each.

### Declined to judge

- **Headings inside `<summary>`** (the session h3, and the h2s for requirements and browse): §7 prescribes them. Some screen readers flatten headings inside a summary, but that's the spec's call.
- **Focus jumps to the notices at the top after every write**, losing the user's scroll position: §6.6 prescribes it.
- **Checkboxes rather than radios for courses where only one class can be taken:** §6.3 prescribes checkboxes with a note, and the server refuses the second class.
- **Chooser checkbox names omit the topic and dates shown in their labels:** §7 gives the exact name ("Select POGO8062 class 5354, In Person").
- **The bar's accessible name "Demo settings" omits "not part of the redesign":** §11.2 gives that exact `aria-label`.
- **Broken percent-encoding gets the adapter's 400:** outside the app's reach (see the rulings).
- **No sandbox cleanup, POST rate limit or JSON body-size limit:** outside a crit prototype's scope, and only POSTs create rows.
- **No `Cache-Control: private` on `/`:** Fly's proxy doesn't cache, and the pages carry no validators.
- **Time-travel oddities** (a future `enrolledOn`, or Drop offered on graded history after moving the date back): §13 accepts them, and the bar is labelled demo-only.
- **After 2027-12-31, browser validation blocks Apply:** the real date falls outside the date input's range, but the data spans 2026–27 and 2028 is a non-goal.
- **Search splits on `[^a-z0-9]`, so non-ASCII letters are dropped:** P&C text in scope is essentially ASCII.
- **A URL facet value in the wrong case (`subject=comp`) gets a notice rather than being normalised:** only reachable by editing the URL, and the notice explains.
- **An empty `choose=` or `browse=` gives a notice with empty quotes:** cosmetic, and only reachable by editing the URL.
- **Intensive sessions have no unit cap:** the spec defines the 24-unit cap for semesters only.
- **The production build sets a `Secure` cookie on http://127.0.0.1 in tests:** browsers treat localhost as secure, and production is HTTPS.
- **The chooser autofocuses on page load for `?choose=` links:** §6.6 says opening the chooser focuses it, and arriving by link is an opening.
- **URL-problem notices on first load aren't announced:** that's normal for a live region, and they're visible at the top of the header.
- **A `?choose=` session can stay hidden inside the closed "Show earlier sessions":** it needs an M2 date plus a crafted link.
- **Submitting the Add form before hydration reloads `/?entry=…`:** working without JavaScript is a non-goal, and the `<noscript>` note says so.
- **`scripts/pc/fetch.ts` has its own `canberraDate`:** the crawler isn't the app, and rule 6 governs the app.
- **Visual design and wording beyond the verbatim copy table:** judgement calls for the user, already checked in the browser pass.
- **Process rulings** (deploying from the worktree through mise, TDD step order): process, not product.

### Recommendations

- **Before the crit:** fix both Important items (each is a few lines), plus Minor 1, 2 and 5, which are one-liners. Add the four missing tests with them.
- **In the plan:** reconcile the Review Focus with its tests for `page=999` and unknown `open`, so the next reviewer isn't grading against two standards.
- **In the spec:** amend §5.3's summary formula to count a course once across groups (Minor 4).
- **Before the repo goes public:** consider a simple cap or expiry for sandboxes, and a request-body size limit. Either is cheap insurance against someone scripting POSTs at the Fly volume.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The branch implements the spec, the plan's clarifications and M2 faithfully, with strong server-side validation and contract tests over HTTP. I found no security, data-integrity or crash problems. Two small should-fix items remain (silent entry errors for screen-reader users, and unguarded per-keystroke `replaceState` with no error boundary), plus a handful of one-line Minor fixes, and they should land before the crit.
