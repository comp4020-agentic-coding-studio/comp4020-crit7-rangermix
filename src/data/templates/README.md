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
