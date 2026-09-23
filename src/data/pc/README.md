# P&C snapshot — provenance

Fetched on **2026-09-24** from Programs & Courses (https://programsandcourses.anu.edu.au) by
`pnpm data:fetch` (`scripts/pc/fetch.ts`), then normalised offline by
`pnpm data:build` (`scripts/pc/build.ts`). The app seeds from these files
at boot. Nothing in them is invented: every value is P&C's, and the few
facts its prose can't carry are overrides, listed below.

## Files

| File | Holds | Source |
|---|---|---|
| `courses.json` | 166 courses | `https://programsandcourses.anu.edu.au/<year>/course/<code>`: title, units, career, subject, description (the introduction) and requisites. For COMP courses, name, units and career come first from the course-list JSON (`/data/CourseSearch/GetCourses?SearchText=COMP&SelectedYear=<year>…`). |
| `classes.json` | 341 classes | The "Offerings, Dates and Class Summary Links" table on each course page. Only the 2026 and 2027 tabs are kept. Session names map to `src/data/calendar.json`. |
| `plans.json` | 20 plans | `https://programsandcourses.anu.edu.au/2026/program|major|specialisation/<code>`: name, acronym, post-nominal and units. Program-to-plan links come from the crawl's scope (`scripts/pc/scope.ts`). |
| `requirements.json` | 114 groups | The requirements section of each plan page, parsed by R1 (`scripts/pc/parse.ts`). Every group keeps P&C's sentence verbatim. |

## Counts per year

| Year | COMP courses in P&C's course list | Classes in the snapshot |
|---|---|---|
| 2026 | 123 | 178 |
| 2027 | 122 | 163 |

## Overrides applied (`scripts/pc/overrides.json`)

- 7722XVCOMP: COMP8800 × 2 — P&C: "COMP8800 Advanced Computing Research Project, which must be taken twice, in consecutive semesters (12+12 units)"
- SOFT-MAJ: COMP3500 × 2 — P&C lists COMP3500 as 6+6 units: taken twice
- AACRD: COMP3770 × 2 — P&C lists COMP3770 as 6+6 units: taken twice
- AACRD: COMP4550 × 2 — P&C lists COMP4550 as 12+12 units: taken twice

## Requirement text kept as untracked notes

R1 tracks only course lists (spec D7). These paragraphs are shown verbatim
under "Other rules, not tracked":

- BCOMP: “The Bachelor of Computing requires completion of 144 units, of which:” …
- BCOMP: “A minimum of 96 units from completion of courses from the following lists:”
- BCOMP: “48 units from completion of courses from the subject area COMP Computer Science” …
- BCOMP: “AND”
- BCOMP: “A minimum of 48 units from completion of elective courses offered by ANU”
- AACOM: “The Bachelor of Advanced Computing (Honours) requires completion of 192 units, of which:” …
- AACOM: “6 units from completion of a course from the following list:” …
- AACOM: “6 units from completion of a course from the following list:” …
- AACOM: “6 units from completion of a course from the following list:” …
- AACOM: “24 units from the completion of one of the following specialisations:” …
- AACOM: “18 units from the completion of 3000 or 4000-level courses from the subject area COMP Computer Science”
- AACOM: “Either:”
- AACOM: “24 units from completion of COMP4550 Computing Research Project, which must be completed twice, in consecutive semesters (12+12 units)”
- AACOM: “OR”
- AACOM: “12 units from COMP4500 Software Engineering Team Project, which must be completed twice, in consecutive semesters (6+6 units)”
- AACOM: “AND 12 units from the completion of further 4000-level courses from the subject area COMP Computer Science”
- AACOM: “OR”
- AACOM: “AND 12 units from the completion of further 4000-level courses from the subject area COMP Computer Science” …
- AACOM: “Honours Calculation”
- AACOM: “The APM will then be used to determine the final grade according to the ANU Honours grading scale, found at http://www.anu.edu.au/students/program-administration/assessments-exams/grading-scale.”
- AACRD: “The Bachelor of Advanced Computing (Research and Development) (Honours) requires completion of 192 units, of which:” …
- AACRD: “The 192 units must include:”
- AACRD: “24 units from the completion of 4000-level courses from the subject area COMP Computer Science”
- AACRD: “12 units of Transdisciplinary Problem-Solving tagged courses”
- AACRD: “12 units from completion of elective courses offered by ANU, which may include courses in the subject area COMP Computer Science” …
- AACRD: “After the first four periods of enrolment students must achieve a minimum 75% Weighted Average Mark in Computing courses. Students who do not achieve a minimum 75% Weighted Average Mark will be transferred to the Bachelor of Advanced Computing (Honours).”
- AACRD: “To continue into the final year of the program students must have completed 144 units and achieved a minimum 80% Weighted Average Mark calculated from the courses that contribute to the final Honours grade calculation. Students who do not achieve this 80% Weighted Average Mark will be automatically transferred to the Bachelor of Advanced Computing (Honours) degree.”
- AACRD: “To graduate with the Bachelor of Advanced Computing (Research and Development) (Honours) students must achieve a minimum 80% final Honours mark. Students who do not achieve a minimum 80% final Honours mark will be transferred to the Bachelor of Advanced Computing (Honours) degree program prior to graduating.”
- AACRD: “Honours Calculation”
- AACRD: “The APM will then be used to determine the final grade according to the ANU Honours grading scale, found at http://www.anu.edu.au/students/program-administration/assessments-exams/grading-scale.”
- 7706XMCOMP: “The Master of Computing requires the completion of 96 units, of which:”
- 7706XMCOMP: “A minimum of 24 units must come from completion of 8000-level COMP courses.”
- 7706XMCOMP: “A maximum of 12 units from completion of project courses from the following list:”
- 7706XMCOMP: “24 units from the completion of one of the following Specialisations:” …
- 7722XVCOMP: “The Master of Computing (Advanced) requires the completion of 96 units, of which:”
- 7722XVCOMP: “A minimum of 48 units must come from completion of 8000-level COMP courses” …
- 7722XVCOMP: “24 units from the completion of one of the following Specialisations:” …
- 7722XVCOMP: “18 units from completion of further 6000, 7000 or 8000 level courses from the subject area COMP Computer Science or ENGN Engineering”
- 7722XVCOMP: “12 units from completion of elective courses offered by ANU”
- 7722XVCOMP: “Students who do not achieve a GPA of 6 in the first 48 units of courses attempted will be automatically transferred to the Master of Computing.”
- 7722XVCOMP: “Students who do not have the approval of an identified supervisor for COMP8800 by week 1 of their final two semesters will be automatically transferred to the Master of Computing.”
- COMS-MAJ: “The COMS major requires the completion of 48 units, of which:” …
- COMS-MAJ: “A maximum of 18 units from completion of courses from the following list:”
- COMS-MAJ: “This Major is incompatible with the Systems and Architecture Specialisation.”
- CSEC-MAJ: “This major requires the completion of 48 units, including,”
- CSEC-MAJ: “A minimum of 18 units from completion of 3000 or 4000 level courses.”
- CSEC-MAJ: “A maximum of 6 units from completion of courses from the following list:”
- DTSC-MAJ: “The DTSC major requires the completion of 48 units, of which:” …
- DTSC-MAJ: “This major is not available to BADAN students.”
- INSY-MAJ: “The INSY major requires the completion of 48 units, of which:” …
- INSY-MAJ: “A maximum of 18 units from completion of courses from the following list:”
- INSY-MAJ: “This Major is incompatible with the Artificial Intelligence Specialisation and the Machine Learning Specialisation.”
- SOFT-MAJ: “The SOFT major requires the completion of 48 units, which must consist of:” …
- SOFT-MAJ: “A maximum of 12 units from the following list:”
- SOFT-MAJ: “The SOFT-MAJ is not available to Bachelor of Engineering in Software Engineering(AENSE/ASENG) or Bachelor of Advanced Computing(AACOM) or Bachelor of Advanced Computing Research and Development (AACRD) students.”
- ARIN-SPEC: “This specialisation requires the completion of 24 units, which must consist of a minimum of 12 units of 4000 level courses.”
- ARIN-SPEC: “This Specialisation is incompatible with the Computing and Mathematical Foundations minor, the Intelligent Systems major, and the Advanced Intelligent Systems major.” …
- HCCC-SPEC: “Advice to Students” …
- HCCC-SPEC: “The 24 units must consist of:”
- HCCC-SPEC: “AND”
- HCCC-SPEC: “AND”
- HCCC-SPEC: “A maximum of 6 units from completion of courses from the following list:”
- MACL-SPEC: “This specialisation requires the completion of 24 units, which must consist of a minimum of 12 units of 4000-level courses.”
- MACL-SPEC: “This Specialisation is incompatible with the Intelligent Systems major, and the Advanced Intelligent Systems major.” …
- SYAR-SPEC: “This specialisation requires the completion of 24 units, which must consist of a minimum of 12 units of 4000 level courses.”
- SYAR-SPEC: “A maximum of 12 units from completion of courses from the following list:”
- SYAR-SPEC: “This specialisation is incompatible with the Computer Systems (COMS) Major.” …
- THCS-SPEC: “This specialisation requires the completion of 24 units, of which:” …
- THCS-SPEC: “A maximum of 12 units from completion of courses from the following list:”
- THCS-SPEC: “This specialisation is only available to students studying Bachelor of Advanced Computing (AACOM) and Bachelor of Advanced Computing Research & Development (AACRD).”
- ARTIF-SPEC: “This Specialization requires the completion of 24 units, which must consist of a minimum of 12 units of 8000 level courses.”
- CMSY-SPEC: “This specialisation requires the completion of 24 units, which must consist of a minimum of 12 units of 8000-level courses.” …
- CMSY-SPEC: “A maximum of 12 units from completion of courses from the following list:”
- DTSC-SPEC: “This specialisation requires the completion of 24 units, which must consist of 12 units of 8000-level courses”
- MCHL-SPEC: “This Specialisation requires the completion of 24 units from the following list which must include:” …
- MCHL-SPEC: “COMP6261 Information Theory” …
- SOFT-SPEC: “This specialisation requires the completion of 24 units, which must consist of a minimum of 12 units of 8000-level courses.” …
- SOFT-SPEC: “6 units from completion of an 8000-level course from the subject area COMP Computing, excluding the project courses (COMP8715, COMP8800, COMP8830).”
- SOFT-SPEC: “A maximum of 12 units from completion of courses from the following list:”
- SOFT-SPEC: “Note: MCOMP students who complete COMP6120 as part of their program rules need to replace it with 6 units of 6000/8000 COMP.”

## Missing pages and dead links

- no page: COMP4801 — https://programsandcourses.anu.edu.au/2027/course/COMP4801
- AACOM links COMP4801, which has no P&C course page in the snapshot
- AACRD links COMP4801, which has no P&C course page in the snapshot

## Classes left out

A class whose enrolment dates P&C hasn't published can't be enrolled in,
so it's left out until P&C lists its dates. Its course and its other
classes stay. (One-cell group rows in the offerings tables that only name a
delivery mode, such as "On Campus" or "Online", aren't read as topics.)

- CRIM2010 class 6747 (2027 Winter Session): P&C lists its dates as "TBA"
- MATH1014 class 9623 (2027 Spring Session): P&C lists its dates as "TBA"
- REGN8050 class 1839 (2027 Summer Session): P&C lists its dates as "TBA"
- REGN8050 class 1840 (2027 Summer Session): P&C lists its dates as "TBA"

## Courses with no classes listed for 2026–2027

These show "No classes listed in P&C for 2026–2027" in the sidebar (spec §13):
COMP1710, COMP1720, COMP3540, COMP3703, COMP3710, COMP3820, COMP4880, COMP6250, COMP6540, COMP6720, COMP6780, COMP8260, COMP8500, COMP8536, COMP8880, COMP8980.

## Classes outside their session's dates

Flagged only, since intensive classes vary (spec §8.3):

- COMP8999 class 3693 (2026-S1) runs 2026-01-01 to 2026-06-30; the session runs 2026-02-23 to 2026-05-29
- COMP8999 class 3694 (2026-S1) runs 2026-01-01 to 2026-06-30; the session runs 2026-02-23 to 2026-05-29
- COMP8999 class 8668 (2026-S2) runs 2026-07-01 to 2026-12-31; the session runs 2026-07-27 to 2026-10-30
- COMP8999 class 8669 (2026-S2) runs 2026-07-01 to 2026-12-31; the session runs 2026-07-27 to 2026-10-30
- REGN8014 class 1439 (2026-SUM) runs 2026-03-10 to 2026-04-30; the session runs 2026-01-01 to 2026-03-31
- REGN8014 class 1440 (2026-SUM) runs 2026-03-10 to 2026-04-30; the session runs 2026-01-01 to 2026-03-31
- REGN8050 class 1437 (2026-SUM) runs 2026-02-27 to 2026-04-24; the session runs 2026-01-01 to 2026-03-31
- REGN8050 class 1438 (2026-SUM) runs 2026-02-27 to 2026-04-24; the session runs 2026-01-01 to 2026-03-31
- STAT1008 class 9395 (2026-SPR) runs 2026-09-21 to 2026-12-04; the session runs 2026-10-01 to 2026-12-31

## Program ↔ plan links

- none

## ANUHub cross-check (Second Semester 2026, postgraduate COMP)

The snapshot is compared with the 28 classes seen live
in ANUHub on 24 Sep 2026 (`scripts/pc/anuhub-s2-2026.json`). 27
agree. P&C wins every difference:

- ANUHub lists COMP6996 class 8665; P&C doesn't (COMP6996 isn't a P&C course)
