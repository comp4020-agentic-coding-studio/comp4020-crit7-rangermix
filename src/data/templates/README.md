# Template students

The demo students are the prototype's only invented data (spec §8.5). Each
browser's sandbox starts as a copy of one of them (spec §5.2).

**What is real**: every class a template names is a real Programs & Courses
offering in the snapshot fetched on 2026-09-24 (`src/data/pc/`). The seeder
refuses to boot if a template names a class the snapshot doesn't have, or
names it under the wrong course.

**What is invented**: the student (name, uid), the grades, and the dates
they enrolled.

## u7000001 — 7722XVCOMP Master of Computing (Advanced), ARTIF-SPEC Artificial Intelligence

Commenced First Semester 2026, under the 2026 rules. The M1 template
(spec §8.5), and the default for a browser without a sandbox.

| Session | Class | Course | Grade | Why this course |
|---|---|---|---|---|
| First Semester 2026 | 3733 | COMP6262 | D (invented) | ARTIF-SPEC's list (spec §8.5) |
| First Semester 2026 | 3740 | COMP6320 | HD (invented) | ARTIF-SPEC's list (spec §8.5) |
| First Semester 2026 | 3732 | COMP6445 | D (invented) | VCOMP's compulsory pair (spec §8.5) |
| First Semester 2026 | 3730 | COMP6240 | CR (invented) | The "further 6000-level COMP course" P1 picks (spec §8.5): the first, by code, 6-unit postgraduate COMP 6000-level course with exactly one First Semester 2026 class that isn't in VCOMP's or ARTIF-SPEC's lists and isn't COMP6442 |
| Second Semester 2026 | 8707 | COMP6442 | — (enrolled) | VCOMP's compulsory pair |
| Second Semester 2026 | 8695 | COMP8620 | — (enrolled) | ARTIF-SPEC's list |
| Second Semester 2026 | 8699 | COMP8691 | — (enrolled) | ARTIF-SPEC's list |
| Second Semester 2026 | 9057 | COMP8020 | — (enrolled) | Topic "Agentic Coding Studio" (spec §8.5) |

Every class number the spec named (8707, 8695, 8699, 9057) is in the
snapshot under the course the spec gave, so no swaps were needed.
Enrolment dates are 9 Feb 2026 for First Semester and 13 Jul 2026 for
Second Semester.

What the first page load shows (spec §8.5): Completed (COMP6445, COMP6262,
COMP6320), Enrolled now (COMP6442, COMP8620, COMP8691), Not enrolled with
Add (COMP8800, needed twice, one class in First Semester 2027), and
"No classes listed" (COMP6250 and COMP8260, VCOMP's one-of group).

## M2's four more students (spec §11.3)

One per program, so Reset in the demo settings bar can load each program's
own student. Each is picked from the snapshot by spec §8.5's rules, applied
per program:

- **First Semester 2026, completed.** Four 6-unit classes (24 units), at
  least two of them tracked courses.
- **Second Semester 2026, enrolled.** Four 6-unit classes (24 units), at least
  two of them tracked, and no course repeated.
- **Left open.** At least one tracked course left unenrolled that has a First
  Semester 2027 class.
- **Career.** Undergraduate programs take undergraduate courses; postgraduate
  programs take postgraduate courses.
- **Padding.** Any other place goes to a single-class COMP course of the same
  career.

Each history also follows the requisites P&C prints, so no course comes before
the course it needs. All four commenced in First Semester 2026 under the 2026
rules. They enrolled on 9 Feb 2026 (First Semester) and 13 Jul 2026 (Second
Semester), and the grades are invented. "Tracked" means the course is in one
of the program's or plan's course lists that the sidebar tracks.

## u7000002 — 7706XMCOMP Master of Computing, DTSC-SPEC Data Science

| Session | Class | Course | Grade | Why this course |
|---|---|---|---|---|
| First Semester 2026 | 3724 | COMP6710 | D (invented) | Padding: the programming course COMP6442, COMP8410 and COMP8430 require |
| First Semester 2026 | 2491 | MATH6005 | CR (invented) | 7706XMCOMP's one-of group (MATH6005 or COMP6260) |
| First Semester 2026 | 3730 | COMP6240 | HD (invented) | DTSC-SPEC's compulsory list |
| First Semester 2026 | 4131 | COMP8280 | D (invented) | 7706XMCOMP's compulsory list |
| Second Semester 2026 | 8707 | COMP6442 | — (enrolled) | 7706XMCOMP's compulsory list |
| Second Semester 2026 | 8708 | COMP6120 | — (enrolled) | 7706XMCOMP's compulsory list (its requisite allows studying it alongside COMP6442) |
| Second Semester 2026 | 8714 | COMP8430 | — (enrolled) | DTSC-SPEC's compulsory list |
| Second Semester 2026 | 8719 | COMP6670 | — (enrolled) | DTSC-SPEC's 6-unit choice |

Left open with a First Semester 2027 class: COMP8410 (DTSC-SPEC) and
COMP7710 (7706XMCOMP).

## u7000003 — BCOMP Bachelor of Computing, SOFT-MAJ Software Development

| Session | Class | Course | Grade | Why this course |
|---|---|---|---|---|
| First Semester 2026 | 3695 | COMP1100 | CR (invented) | BCOMP's one-of group (COMP1100 or COMP1130) |
| First Semester 2026 | 3412 | MATH1005 | D (invented) | BCOMP's one-of group (MATH1005 or MATH2222) |
| First Semester 2026 | 2941 | STAT1008 | HD (invented) | BCOMP's 6-unit elective list |
| First Semester 2026 | 3409 | MATH1013 | P (invented) | BCOMP's 6-unit elective list (no first-year COMP course is left to pad with) |
| Second Semester 2026 | 8671 | COMP1110 | — (enrolled) | BCOMP's one-of group (COMP1110 or COMP1140) |
| Second Semester 2026 | 8673 | COMP1600 | — (enrolled) | BCOMP's compulsory list |
| Second Semester 2026 | 8679 | COMP2400 | — (enrolled) | BCOMP's compulsory list |
| Second Semester 2026 | 8680 | COMP2610 | — (enrolled) | Padding |

Left open with a First Semester 2027 class: COMP2100 and COMP2300 (BCOMP's
compulsory list).

## u7000004 — AACOM Bachelor of Advanced Computing (Honours), ARIN-SPEC Artificial Intelligence

| Session | Class | Course | Grade | Why this course |
|---|---|---|---|---|
| First Semester 2026 | 3696 | COMP1130 | HD (invented) | Padding: AACOM's first-year programming course, which its lists leave to prose |
| First Semester 2026 | 3452 | MATH1115 | D (invented) | AACOM's 12-unit elective list |
| First Semester 2026 | 3358 | STAT1003 | CR (invented) | AACOM's 12-unit elective list |
| First Semester 2026 | 4014 | ENGN1211 | D (invented) | AACOM's 12-unit elective list |
| Second Semester 2026 | 8672 | COMP1140 | — (enrolled) | Padding: follows COMP1130 |
| Second Semester 2026 | 8673 | COMP1600 | — (enrolled) | Padding |
| Second Semester 2026 | 8679 | COMP2400 | — (enrolled) | AACOM's compulsory list |
| Second Semester 2026 | 8416 | MATH2301 | — (enrolled) | AACOM's 12-unit elective list |

Left open with a First Semester 2027 class: COMP2100 and COMP2300 (AACOM's
compulsory list) and COMP2620 (ARIN-SPEC's list).

## u7000005 — AACRD Bachelor of Advanced Computing (Research and Development) (Honours), THCS-SPEC Theoretical Computer Science

| Session | Class | Course | Grade | Why this course |
|---|---|---|---|---|
| First Semester 2026 | 3696 | COMP1130 | HD (invented) | AACRD's compulsory list |
| First Semester 2026 | 3452 | MATH1115 | D (invented) | AACRD's 18-unit maths list |
| First Semester 2026 | 3412 | MATH1005 | HD (invented) | AACRD's 18-unit maths list |
| First Semester 2026 | 3358 | STAT1003 | CR (invented) | AACRD's 18-unit maths list |
| Second Semester 2026 | 8672 | COMP1140 | — (enrolled) | AACRD's compulsory list |
| Second Semester 2026 | 8408 | MATH1116 | — (enrolled) | AACRD's 18-unit maths list (follows MATH1115) |
| Second Semester 2026 | 8673 | COMP1600 | — (enrolled) | Padding |
| Second Semester 2026 | 8680 | COMP2610 | — (enrolled) | Padding |

Left open with a First Semester 2027 class: COMP2100, COMP2300 and COMP2550
(AACRD's compulsory list).
