# ANU student enrolment system: current state (research notes)

Researched 2026-09-23 using public web sources only (WebSearch/WebFetch).
§8 adds read-only observations of the live pages from a signed-in student
session on 2026-09-24. Every other claim cites a URL. Anything not confirmed by an ANU page is marked
**UNVERIFIED** or **INFERRED**.

Tooling limitation: several ANU PDFs could not be decoded here. These were
the "Navigating new ANUHub" guide, the Feb 2024 Enrolment Guide and the 2022
Student Central Enrolment Guide. Where their content is quoted, it comes from
search-engine snippets of those PDFs.

---

## 0. Headline: ISIS is now "ANUHub" (since 26 May 2025)

- "As of Monday 26 May 2025, the Interactive Student Information System
  (previously known as ISIS) has been renamed ANUHub."
  https://services.anu.edu.au/information-technology/software-systems/anuhub
- ANU announced it as "Goodbye ISIS. Hello ANUHub - your new self-service
  portal is now live". The guide PDF says "ISIS is now ANUHub with a new
  user-interface."
  https://services.anu.edu.au/files/2025-05/Navigating%20new%20ANUHub_0.pdf (search snippet)
- New login: https://selfservice.sas.anu.edu.au/ (titled "Student Self Service
  Sign-in"). The old isis.anu.edu.au redirected there until Friday 22 Aug 2025.
  https://isis.anu.edu.au/psp/sscsprod (search snippet)
- ANUHub is the student-facing layer. The Student Administration System (SAS)
  is the staff back end and the system of record for enrolments, results, the
  program/course catalogue and fees.
  https://services.anu.edu.au/information-technology/software-systems/student-administration-system
- Platform: **INFERRED PeopleSoft Campus Solutions.** The evidence is the URL
  patterns `/psp/sscsprod/` (self-service) and `admin.sas.anu.edu.au/psp/csprod/`
  (SAS), plus PeopleSoft Fluid vocabulary in ANU's guide ("Tiles", "NavBar",
  "Recently Visited", "Favorites"). No ANU page names the vendor.
- Every current ANU student page says "ANUHub". Older pages and PDFs still say
  "ISIS". Both names refer to the same flow.

## 1. The enrolment flow as ANU documents it

### 1a. ANUHub homepage (Fluid tiles)

Source: "Navigating new ANUHub" PDF (May 2025), via search snippet:
https://services.anu.edu.au/files/2025-05/Navigating%20new%20ANUHub_0.pdf

- **Student Homepage**: "houses different Tiles which can be used to access
  information or action a requirement."
- **Attention section** (collapsible) has two tiles:
  - **Announcements**
  - **Tasks**: holds the Task Wizard and the eCAF guided process.
- **Academic section** has five tiles:
  - **Enrolment**: "access enrolment-based information and actions like enrol,
    drop, and swap". The menu path is `NavBar > Menu > ANUHub > Enrolment
    (Folder) > Enrolment (Link)`.
  - **Allocate to Your Class**: opens MyTimetable in a new browser tab.
    Tutorial allocation is a separate system.
  - **Research**: shown to research students only.
  - **Academic Records**
  - **Manage my Degree**: eForms. The path is `NavBar > Menu > ANUHub > Degree
    Management > Manage my Degree`.
- **Personal section** has **Charges to Pay**, **Account Details** and
  **Personal Data**.
- **NavBar** gives Recently Visited, Favorites and Menu. A Home button returns
  to the Student Homepage.
- Small screens: "Some homepage tiles don't work well on small screens."
  https://services.anu.edu.au/information-technology/software-systems/anuhub

### 1b. Gating steps before a student can enrol

The first four steps come from
https://www.anu.edu.au/students/program-administration/enrolment/enrol-for-the-first-time-as-a-coursework-student

1. **Log in** with your ANU ID (e.g. `u1234567`).
2. **Task Wizard.** It appears at first login and is "mandatory yearly". It
   collects:
   - contact details, including an emergency contact
   - agreement to ANU policies and the Student Code of Conduct
   - the USI
   - Commonwealth Assistance Forms (eCAF), for eligible domestic students
3. **Student messages** must be acknowledged before anything else can be done.
   https://services.anu.edu.au/information-technology/software-systems/anuhub
4. **USI block.** A student without a USI is blocked from enrolling. The path
   to add one is `NavBar (compass icon) > Menu > ANUHub > Personal Data >
   Unique Student Identifier`.

### 1c. Adding courses: the official sequence

Source: "Enrol for the first time as a coursework student" (current, ANUHub
wording):
https://www.anu.edu.au/students/program-administration/enrolment/enrol-for-the-first-time-as-a-coursework-student

1. Go to `NavBar (compass icon) > Menu > ANUHub > Enrolment > Enrolment`.
   The online-student page says instead: "Click the **Enrolment** tile and
   follow the prompts."
   https://www.anu.edu.au/students/program-administration/enrolment/enrol-for-the-first-time-as-an-online-student
2. Click the **"Enrolment Details"** button beside the relevant **session**.
   This is how the student chooses the term/session. It opens a separate page.
3. Click **"Add"** to add (enrol in) new courses.
4. **Type the class number** and click **"Add"**. Alternatively, click
   **"Search"** to find the course. The class number is on the *Class* tab of
   the course page in Programs and Courses. The page never asks for a course
   code.
5. Repeat step 4 for each course.
6. Click **"Continue"** to save.
7. Enter a **permission number** if ANUHub asks for one.
   - CBE: "The box to enter a permission number shows up every time, so
     please try to complete the enrolment process first."
     https://cbe.anu.edu.au/current-students/student-guides-and-forms/enrolment-guides
8. Click **"Save"**. Look for the status **"Successfully Added!"**. If it does
   not appear, follow the prompts or contact Student Hubs.

To confirm enrolment, the 2022 ISIS guide says to return to the home page and
scroll to **"Current Enrolment"** (search snippet; the label may have changed
in ANUHub).
https://orientation.anu.edu.au/files/guidance/documents/Student%20Central%20-%20Enrolment%20Guide%202022.pdf

Rules that apply to self-enrolment:
- The self-enrol cap is **24 units (4 courses) per semester/half-year session**.
  Going over needs an **Overload** request through the Manage My Degree eForm.
  https://www.anu.edu.au/students/program-administration/enrolment/overload-your-enrolment
- Restricted courses need a **permission code**, requested via the Cognito form
  "Application for Permission Code (Coursework)". The code is valid only until
  the "Last Day to Enrol".
  https://www.anu.edu.au/students/program-administration/enrolment/permission-codes
  https://www.anu.edu.au/students/program-administration/enrolment
- CASS says session-based courses (Summer, Autumn, Winter, Spring) need a
  permission code.
  https://cass.anu.edu.au/current-students/enrolment
- The absolute limit is 36 units per study period. Taking a non-standard
  session course that does not overlap the semester is not an overload.
  (Same overload page.)
- A second attempt at a failed course: "you can re-enrol yourself in the
  course through ANUHub, accepting the warning notice that will pop up." A
  third attempt goes through Manage my Degree.
  https://cbe.anu.edu.au/current-students/student-guides-and-forms/enrolment-guides
- **Prerequisites are not enforced at add time**: "ANUHub will let you enrol
  into Course B before you meet the pre-requisite requirement." (Same CBE
  page.)
- UNVERIFIED (PDF snippet only): classes appear in Canvas within about 24
  hours, and a timetable snapshot appears in ANUHub once enrolled.
  https://cbe.anu.edu.au/files/2026-01/Enrolment-Fast-Track-checklist.pdf

### 1d. Swap and drop

Source: https://www.anu.edu.au/students/program-administration/enrolment/swapping-or-dropping-a-course

- **Drop** (domestic students): `NavBar > Menu > ANUHub > Enrolment >
  Enrolment` > select the Semester or Session > **'Drop'** beside the course.
- **Swap**: same path > select the Semester or Session > **'Swap'** beside the
  course. Allowed before the census date. If the swap fails in ANUHub, submit
  "Application for Enrolment Change (Coursework)".
- **International students** cannot self-drop below 24 units in either half of
  the year (a visa rule). They must lodge a "Reduced Study Load Application"
  through Manage My Degree instead.
- **Deadlines**:
  - Add/swap in ANUHub until Monday of Week 2 of each semester, 11:59pm.
    - The ANU enrolment page and the Law School page both say 11:59pm.
      https://www.anu.edu.au/students/program-administration/enrolment
      https://law.anu.edu.au/enrolment-information-and-guideline
    - CBE says 11:50pm.
  - Late requests are accepted until Monday of Week 3. None are approved from
    Tuesday of Week 3.
  - Drop (Semesters 1 and 2): until the start of the exam period.
  - Drop (other sessions): until the "Class End Date".

### 1e. What "Enrolment Details" shows

**Superseded by the live observation in §8b.** Kept as found.

**Partly UNVERIFIED.** No public ANU guide lists its columns. What the sources
imply:

- It is a **per-session page**, reached from a session list on the Enrolment
  page.
- It lists the student's current enrolled courses in that session. Each course
  has **Swap** and **Drop** actions, and the page has an **Add** button.
  - Evidence: the drop/swap wording "select the Semester or Session > select
    'Drop'/'Swap' beside the relevant course" (source above).
  - Evidence: a third-party guide says "From the enrolment list, to switch the
    registered course with another course, click Swap. To withdraw… Drop; to
    enroll in another course, click Add."
    https://collegesniche.com/anu-isis-how-to-anu-student-portal/
- The exact session labels on the Enrolment page are UNVERIFIED. They are
  probably of the form "2026 First Semester".

### 1f. The "Search" option inside Add

**Superseded by the live observation in §8d–8e.** Kept as found.

**UNVERIFIED for ANUHub.** Third-party ISIS-era guides describe these search
criteria:

- **Academic Career**: undergraduate or postgraduate.
- **Subject Area**
- **Subject**
- **Catalog Number**: optional.
- Then **Search**, then **Add Class**, then **Continue**, then an authorization
  (permission) number, then **Save**.

Source: https://collegesniche.com/anu-isis-how-to-anu-student-portal/
(third-party; its field descriptions are confused).

### 1g. Older ISIS flow, for contrast (2022 and earlier)

- The 2022 guide says to click "Course Enrolment under Useful Links", then
  "enter each class number".
  https://orientation.anu.edu.au/files/guidance/documents/Student%20Central%20-%20Enrolment%20Guide%202022.pdf (snippet)
- The older path was `Main Menu (compass) > Navigation > ISIS > Enrolment >
  Enrolment` > "Enrolment Details for the session" > Add > class number, or
  Search.
  https://www.anu.edu.au/students/program-administration/enrolment/enrol-for-the-first-time-as-a-non-award-student (search snippet of older version)

### 1h. Not found

- **No shopping cart, "Validate" step or waitlist** is mentioned anywhere in
  ANU's student documentation.
  https://www.anu.edu.au/students/program-administration/enrolment
- For comparison, standard PeopleSoft Fluid does offer these, but ANU's
  documented flow does not use them:
  - **Manage Classes** tile (SSR_START_PAGE_FL)
  - **Class Search and Enroll** (SSR_TERM_STA2_FL): keyword search with
    filters on meeting days, times and units
  - **Shopping Cart** (SSR_TERM_STA3_FL): "validate classes prior to
    enrollment"
  - Drop, Swap and Update Classes pages
  - An admin option, **"Enrollment Only"**, disables the cart.
  https://docs.oracle.com/en/applications/peoplesoft/campus-solutions/9.2.038/campus-self-service/managing-classes-using-peoplesoft-fluid-user-interface.html
- ANU's flow is **class-number first**: the "Enrolment" tile, then "Enrolment
  Details", then "Add". It appears to be a **customised** page rather than
  delivered Fluid Class Search and Enroll (**INFERRED**).

## 2. Course code vs class number

- ANU's definition: "each course will have a course code which stays the same
  each time the course is offered, and a class number which is different for
  each teaching session it's offered in."
  https://www.anu.edu.au/students/program-administration/enrolment/enrol-for-the-first-time-as-a-non-award-student (snippet)
- **Course code** = 4-letter subject alpha code + 4-digit catalogue number,
  e.g. `COMP1100`, `COMP8020`.
  - The first digit is the level:
    - 1000–4000: undergraduate (4000 is Honours)
    - 6000: graduate, co-taught with 1000–3000 courses
    - 7000/8000: graduate
    - 9000: graduate
  - "Alpha codes for courses are University-wide."
  - ANU Accreditation Handbook, Course design PDF (snippet):
    https://d1zkbwgd2iyy9p.cloudfront.net/files/2025-04/5.%20Course%20design.pdf
- **Class number** = a 4- or 5-digit integer, unique per class per session.
  - The leading digit roughly tracks the session, but not reliably:
    1xxx Summer, 5xxx Autumn, 6xxx Winter, 9xxx/10xxx Spring. Semester numbers
    range widely (2xxx–10xxx).
  - Class numbers change every year.
- **COMP1100** class numbers by session (URL pattern
  `…/2026/course/COMP1100/First%20Semester/3695`):

  | Year | First Semester | Second Semester |
  |---|---|---|
  | 2026 | 3695 | 8670 |
  | 2027 | 5099 | 10101 |
  | 2028 | 6679 | 11051 |

  https://programsandcourses.anu.edu.au/2026/course/COMP1100
- **One course can have several classes in one session** (verified examples):
  - **Mode of delivery**: SCOM8014, 2026 First Semester, class **3419 In
    Person** and **3420 Online**. The page says "Check that the correct class
    number is chosen for delivery mode (in-person, online) when enrolling."
    https://programsandcourses.anu.edu.au/2026/course/SCOM8014
  - **Mode of delivery**: POGO8062, 2026 First Semester, **3900 In Person** and
    **3901 Online**; 2027: 5354 and 5355.
    https://programsandcourses.anu.edu.au/2026/course/POGO8062
  - **Mode of delivery, non-standard dates**: REGN8050, 2026 Summer Session,
    **1437 "On Campus"** and **1438 "Online"**. Both run 27 Feb – 24 Apr 2026,
    with Last Day to Enrol 13 Mar.
    https://programsandcourses.anu.edu.au/2026/course/REGN8050
  - **Same mode, reason unstated**: PHYS8207 (6–18 units) has 2 or 3 identical
    in-person classes per session, e.g. First Semester 2026: 2705, 2706, 2707.
    The reason is **UNVERIFIED**; it is possibly the variable unit value.
    https://programsandcourses.anu.edu.au/2026/course/PHYS8207
  - **Different careers use separate course codes, not separate classes**:
    - COMP8020 (PGRD, class 9057) is co-taught with COMP4020 (UGRD, class
      9056). Both are titled "Advanced Topics in Human-Centred and Creative
      Computing", 2026 S2, and the 2026 class is themed "Agentic Coding
      Studio". The indicative COMP8020 S2 class numbers are 10060 for 2027
      and 10824 for 2028.
      https://programsandcourses.anu.edu.au/2026/course/COMP8020
      https://programsandcourses.anu.edu.au/2026/course/COMP4020
    - Likewise COMP6120 (PGRD, 8708) is co-taught with COMP2120 and marked
      "Incompatible with COMP2120".
      https://programsandcourses.anu.edu.au/2026/course/COMP6120
  - **Campus**: no public ANU class page shows a campus field. There is **no
    verified example** of multiple classes split by campus.
- **Public class summary page fields** (e.g. `…/COMP1100/First%20Semester/3695`):
  - Session, Academic Year, **Class Number**, **Term Code**, Unit Value,
    Mode of Delivery
  - Course Convener, Lecturer
  - Class Start Date, Class End Date, Census Date, Last Date to Enrol
  - "View Class Timetable" link, Tutorial Registration (MyTimetable) link
  - Assessment summary
  - **No** capacity, seats or waitlist status is shown publicly.
  https://programsandcourses.anu.edu.au/2026/course/COMP1100/First%20Semester/3695

## 3. Sessions, dates and term codes

**Six teaching periods per academic year.** Official calendar names:

| Session | 2026 | 2027 | Timetable suffix | P&C filter label |
|---|---|---|---|---|
| Summer Session | 1 Jan – 31 Mar 2026 | 1 Jan – 31 Mar 2027 | `_X1` | Summer/Quarter 1 |
| Semester 1 ("First Semester") | 23 Feb – 29 May 2026; exams 4–20 Jun | 22 Feb – 28 May 2027; exams 3–19 Jun | `_S1` | First Semester |
| Autumn Session | 1 Apr – 30 Jun 2026 | 1 Apr – 30 Jun 2027 | `_X2` | Autumn/Quarter 2 |
| Winter Session | 1 Jul – 30 Sep 2026 | 1 Jul – 30 Sep 2027 | `_X3` | Winter/Quarter 3 |
| Semester 2 ("Second Semester") | 27 Jul – 30 Oct 2026; exams 5–21 Nov | 26 Jul – 29 Oct 2027; exams 4–20 Nov | `_S2` | Second Semester |
| Spring Session | 1 Oct – 31 Dec 2026 | 1 Oct – 31 Dec 2027 | `_X4` | Spring/Quarter 4 |

Sources:
- 2026 calendar: https://www.anu.edu.au/directories/university-calendar?year=2026
- 2027 calendar: https://www.anu.edu.au/directories/university-calendar?year=2027
- Timetable suffixes: https://timetabling.anu.edu.au/sws2026/
- P&C filter labels: https://programsandcourses.anu.edu.au/catalogue

Notes on the table:
- The four non-semester sessions are nominal windows. Individual classes
  inside them have their own dates. For example, the REGN8050 "Summer Session"
  class runs 27 Feb – 24 Apr 2026, with Last Day to Enrol 13 Mar. The
  indicative 2027 classes (1839/1840) run 9 Mar – 30 Apr 2027. ASTR1003
  Winter 2026 runs 1–26 Jul, with census and Last Date to Enrol both on
  10 Jul.
  https://programsandcourses.anu.edu.au/2026/course/REGN8050
  https://programsandcourses.anu.edu.au/2026/course/astr1003/winter%20session/6303
- **"Summer 2026-27" at ANU = Summer Session 2027** (1 Jan – 31 Mar 2027). It
  belongs to academic year 2027.

**Key 2026 semester dates**
(https://www.anu.edu.au/directories/university-calendar?year=2026):

| | Semester 1 | Semester 2 |
|---|---|---|
| Last day to add on ANUHub | 2 Mar | 3 Aug |
| Census date | 31 Mar | 31 Aug |
| Teaching break | 6–20 Apr | 7–21 Sep |
| Last day to drop without failure | 8 May | 9 Oct |
| Last day to drop with failure | 29 May | 30 Oct |

The recommended re-enrol date is 31 Jan. The recommended date to enrol in
Semester 2 is 30 Jun.

**Key 2027 dates**
(https://www.anu.edu.au/directories/university-calendar?year=2027):

| | Semester 1 | Semester 2 |
|---|---|---|
| Last day to add via ANUHub | 1 Mar | 2 Aug |
| Census date | 31 Mar | 31 Aug |

- O-Week 2027 starts 15 Feb.
- The 2027 calendar also lists "18 Oct: Enrolments open for Summer Session"
  and "09 Dec: Enrolments open for remaining Sessions for the following year".
  These refer to enrolment for 2028.

**Non-standard session deadlines** are per class. For example, SCNC8820 2026
has these Last Day to Enrol dates:
- Summer: 23 Jan
- Autumn: 24 Apr
- Winter: 24 Jul
- Spring: 23 Oct

https://programsandcourses.anu.edu.au/2026/course/SCNC8820

**When 2027 enrolment opens: UNVERIFIED.** The 2026 calendar has no
"enrolments open" entry. The patterns below suggest **Semester 1 2027 opens
in early December 2026** and **Summer Session 2027 in about October 2026**.
- The 2025 calendar had "04 Dec: Enrolments for 2026 open on ANUHub".
  https://www.anu.edu.au/directories/university-calendar?year=2025
- The 2027 calendar has the October (Summer) and December (remaining
  sessions) entries quoted above.
- A Crawford page (now 404) said enrolment "generally opens in early December
  of the previous year" and Summer "from October" (search snippet).

**PeopleSoft term codes** are shown as "Term Code" on public class pages.
Their format is `3` + (year − 1990, two digits) + session digit + `0`.

| Session | Code pattern | Verified examples |
|---|---|---|
| Summer | x20 | 2025 = **3520**, 2026 = **3620** |
| First Semester | x30 | 2025 = **3530**, 2026 = **3630** |
| Autumn | x40 | 2020 = **3040** (2026 = 3640 inferred) |
| Winter | x50 | 2026 = **3650** |
| Second Semester | x60 | 2026 = **3660** |
| Spring | x70 | 2026 = **3670** |

Verified from:
- https://programsandcourses.anu.edu.au/2025/course/asia6220/summer%20session/1398
- https://programsandcourses.anu.edu.au/2026/course/REGN8050/Summer%20Session/1438
- https://programsandcourses.anu.edu.au/2025/course/INDG1001/First%20Semester/2301 (snippet)
- https://programsandcourses.anu.edu.au/2026/course/COMP1100/First%20Semester/3695
- https://programsandcourses.anu.edu.au/2020/course/stst8106/autumn%20session/5256
- https://programsandcourses.anu.edu.au/2026/course/astr1003/winter%20session/6303
- https://programsandcourses.anu.edu.au/2026/course/COMP1100/Second%20Semester/8670
- https://programsandcourses.anu.edu.au/course/BPHB2114/Spring%20Session/9314 (snippet)

**2027 codes by the same pattern (INFERRED)**: 3720, 3730, 3740, 3750, 3760,
3770.

## 4. Public class and course search

- **`classes.anu.edu.au` does not exist** (DNS lookup fails, ENOTFOUND). There
  is **no public guest PeopleSoft Class Search** for ANU that I could find.
  Live class search appears to be inside ANUHub only (UNVERIFIED).
- **Programs and Courses "Catalogue Search"**
  (https://programsandcourses.anu.edu.au/catalogue ,
  https://programsandcourses.anu.edu.au/search):
  - Tabs: **Programs**, **Courses**, **Majors, minors & specialisations**.
  - Filters:

    | Filter | Options |
    |---|---|
    | Commencement Year | none shown |
    | Career | Undergraduate, Postgraduate, Research, Non-Award |
    | Session | Summer/Quarter 1, First Semester, Autumn/Quarter 2, Winter/Quarter 3, Second Semester, Spring/Quarter 4 |
    | Study as | Single, Flexible Double, Vertical Double |
    | Type | Majors, Minors, Specialisations |
    | College | none shown |
    | Mode of delivery | none shown |
    | Graduate Attributes | Critical Thinking, Indigenous Perspectives, Transdisciplinary Problem-Solving |
    | Other Criteria | Work Integrated Learning, STEM Course |

  - **Course result columns**: Code, Title, Term, Career, Units, Delivery.
  - Program result columns: Code, Title, Study As, Career, Selection Rank,
    Years, Delivery.
  - The only keyword input is the main search box. There is **no subject-area,
    catalogue-number, class-number or campus filter**.
- **Course page structure** (e.g. COMP6120):
  - Top tabs: **Overview, Study, Fees, Class**.
  - Header fields:
    - Academic career (UGRD/PGRD)
    - Course subject (e.g. "Computer Science")
    - Offered by
    - Mode of delivery ("In Person", "Online", "Online or In Person")
    - Co-taught course
    - Offered in
    - Course convener
  - Sections include "Requisite and Incompatibility".
  - **"Offerings, Dates and Class Summary Links"** is a table with year tabs.
    Columns: Class number, Class start date, Last day to enrol, Census date,
    Class end date, Mode Of Delivery, Class Summary (View / N/A).
  - Future years are "indicative only".
  https://programsandcourses.anu.edu.au/2026/course/COMP6120
- **Class Timetable web publisher** (Scientia Syllabus Plus, INFERRED):
  https://timetabling.anu.edu.au/sws2026/
  - Browse by **College/School**, **Courses** (course code plus session
    suffix, e.g. `COMP1100_S1`) or **Locations**.
  - Filters: weeks/session, day, time.
  - Output formats: "List timetables" or "Grid timetables".
  - Delivery-type labels: online live, on campus, livestream, dual delivery,
    prerecorded, recordings.
- **MyTimetable** (https://mytimetable.anu.edu.au/) handles tutorial
  self-allocation after enrolment. This is a separate step and system.

## 5. How programs, majors and specialisations present requirements

Programs and Courses uses a consistent pattern:
- It opens with "The <Program> requires the completion of N units, of which:".
  Level and unit rules follow.
- Then "The N units must include:".
- Then blocks in the form "X units from completion of the following
  compulsory courses:" / "…a course from the following list:" / "one of the
  following specialisations".

### Master of Computing (MCOMP), plan code 7706XMCOMP, 2026

Source: https://programsandcourses.anu.edu.au/2026/program/7706XMCOMP

- Two years full time, 96 units. Offered by the College of Systems and Society.
- It "requires the completion of 96 units, of which" a minimum of 24 units
  must be 8000-level COMP courses.
- **"30 units from completion of the following compulsory courses:"**
  - COMP6120 Software Engineering (6)
  - COMP6442 Software Construction (6)
  - COMP7710 Structured Programming (12). The Study Options table calls it
    "Programming Fundamentals".
  - COMP8280 Responsible Practice, Innovation and Leadership (6)
- At least 6 units from: MATH6005 Discrete Mathematics Models; COMP6260
  Foundations of Computing.
- Up to 12 units from: COMP8715 Advanced Computing Team Project (6+6, taken in
  consecutive semesters); COMP8830 Computing Internship (12). These are the
  capstones.
- **One 24-unit specialisation** from:
  - ARTIF-SPEC Artificial Intelligence
  - CMSY-SPEC Computer Systems
  - COMP-SPEC Computational Foundations
  - DTSC-SPEC Data Science
  - HCCM-SPEC Human-Centred and Creative Computing
  - MCHL-SPEC Machine Learning
  - SOFT-SPEC Software Development
- 18 units of 6000/7000/8000-level COMP or ENGN courses, plus a 6-unit
  university elective.
- Example specialisation, **ARTIF-SPEC**: "requires the completion of 24
  units, which must consist of a minimum of 12 units of 8000 level courses.
  The 24 units must consist of:"
  - COMP6262 Logic
  - COMP6320 Artificial Intelligence
  - COMP8620 Advanced Topics in Artificial Intelligence
  - COMP8691 Optimisation

  https://programsandcourses.anu.edu.au/2026/specialisation/ARTIF-SPEC

### Bachelor of Advanced Computing (Honours), AACOM, 2026

Source: https://programsandcourses.anu.edu.au/2026/program/AACOM

- Four years, 192 units.
- Rules: at most 60 units at 1000 level; at least 48 units of 4000-level COMP;
  at least 12 units of Transdisciplinary Problem-Solving tagged courses.
- "The 192 units must include":
  - **One of** COMP1100 Programming as Problem Solving / COMP1130 Programming
    as Problem Solving (Advanced)
  - **One of** COMP1110 Structured Programming / COMP1140 Structured
    Programming (Advanced)
  - **One of** MATH1005 Discrete Mathematical Models / MATH2222 Introduction to
    Mathematical Thinking: Problem-Solving and Proofs
  - **48 units of compulsory courses**:
    - COMP2100 Software Design Methodologies (called "Software Construction"
      elsewhere on the page)
    - COMP2120 Software Engineering
    - COMP2300 Computer Architecture
    - COMP2310 Systems, Networks and Concurrency
    - COMP2400 Relational Databases
    - COMP3600 Algorithms
    - COMP3630 Theory of Computation
    - COMP4450 Computing Research Methods
  - 24 units from one specialisation:
    - ARIN-SPEC Artificial Intelligence
    - HCCC-SPEC Human-Centred and Creative Computing
    - MACL-SPEC Machine Learning
    - SYAR-SPEC Systems and Architecture
    - THCS-SPEC Theoretical Computer Science
  - 18 units of 3000/4000-level COMP
  - 12 units from an ICT-related list (e.g. INFS2024, MATH2301, STAT1008)
  - **Capstone**, one of:
    - COMP4550 Computing Research Project (12+12)
    - COMP4500 Software Engineering Team Project (6+6) plus 12 units of
      4000-level COMP
    - COMP4820 Advanced Computing Internship (12) plus 12 units of 4000-level
      COMP
  - 48 or more units of electives
- Optional 48-unit majors, taken in elective space:
  - COMS-MAJ Computer Systems
  - CSEC-MAJ Cyber Security
  - HCCC-MAJ Human-Centred and Creative Computing
  - INFS-MAJ Information Systems
- Example major, **CSEC-MAJ** (UG, 48 units; at least 18 units at 3000/4000
  level):
  https://programsandcourses.anu.edu.au/2026/major/CSEC-MAJ
  - Compulsory (36 units):
    - COMP2120
    - COMP2310
    - COMP2700 Cyber Security Foundations
    - COMP3300 Operating Systems Implementation
    - COMP3310 Computer Networks
    - COMP3704 Network Security
  - At least 6 units from: COMP4130, COMP4703.
  - At most 6 units from: COMP4011, COMP4045, COMP4712, CRIM2010, MATH3301.

### Other undergraduate computing programs (brief)

- The **Bachelor of IT** appears to have been superseded by the **Bachelor of
  Computing (BCOMP)**: 144 units, 7 compulsory courses plus 9 computing
  courses. The full 2026 compulsory list is **UNVERIFIED**; the 2024 list
  included COMP1600, COMP2100, COMP2300 and COMP2420.
  https://programsandcourses.anu.edu.au/program/bcomp
- **AACRD**, Bachelor of Advanced Computing (Research and Development)
  (Honours), 192 units. Its 78 units of compulsory courses include:
  - COMP1130, COMP1140, COMP2100, COMP2300
  - COMP2550 Computing R&D Methods
  - COMP3600, COMP3630
  - COMP3770 (6+6)
  - COMP4550 (12+12)

  https://programsandcourses.anu.edu.au/2026/program/AACRD

## 6. Academic careers and subject areas

- **Careers as students see them**:
  - The P&C Career filter offers Undergraduate, Postgraduate, Research and
    Non-Award. https://programsandcourses.anu.edu.au/catalogue
  - Course pages show the code **UGRD** (e.g. COMP1100, COMP4020) or **PGRD**
    (e.g. COMP8020, COMP6120, SCOM8014).
  - The ANU Curriculum Management guide says "Research courses do not display
    on programs and courses website… it will need to be given the PGRD
    career".
    https://services.anu.edu.au/business-units/division-of-student-administration-and-academic-services/academic-standards-quality-office/curriculum-management-system
  - The HDR Add/Drop eForm asks students to set the type to "Postgraduate" or
    "Research". https://cass.anu.edu.au/current-students/enrolment
  - Non-award plan codes end in `XNAWD`, e.g. 5092XNAWD, 5097XNAWD,
    5160XNAWD.
    https://programsandcourses.anu.edu.au/2016/program/5092xnawd
  - The codes **RSCH** (Research) and **NAWD** (Non-Award) follow the standard
    Australian PeopleSoft set (UGRD/PGRD/RSCH/NAWD, per Griffith's glossary:
    https://policies.griffith.edu.au/glossary). They are **not confirmed on an
    ANU page**; NAWD is only evidenced by the plan-code suffix.
- **Program codes**:
  - Some are 4 digits + X + a code, e.g. `7706XMCOMP`. The first digit is the
    qualification level; the second is the College (Accreditation Handbook
    snippet).
  - Undergraduate programs use alpha codes, e.g. `AACOM`, `AACRD`, `BCOMP`.
  - Majors, minors and specialisations use `XXXX-MAJ`, `XXXX-MIN` and
    `XXXX-SPEC`.
- **Subject area (alpha) codes** seen on 2026 pages include:
  - Computing and engineering: COMP (Computer Science), ENGN (Engineering),
    INFS, DESN
  - Mathematics and statistics: MATH, STAT
  - Sciences: PHYS, ASTR, EMSC, ENVS, SCNC, SCOM
  - Policy and business: POGO, IDEC, REGN, BUSI, MKTG, MGMT
  - Social sciences, arts and other: SOCY, SOCR, CRIM, INDG, ASIA, ARTH,
    MUSI, BPHB

  The course page field is labelled "Course subject", e.g. COMP = "Computer
  Science". No public master list of subject codes was found (UNVERIFIED).

## 7. Pain points the sources confirm (facts only)

- **Input is class-number-only.**
  - The Add step asks for a class number, which students must look up
    separately in Programs and Courses. The *Class* tab lists one class number
    per session and mode.
  - Choosing the wrong one is a documented risk: SCOM8014 warns "Check that
    the correct class number is chosen for delivery mode."
- **Multi-page navigation.** The documented path is: Tile/Menu → Enrolment →
  **Enrolment Details** (separate page per session) → Add → type class number
  → Add → Continue → [permission number] → Save → status message. Swap and
  Drop also start from the session page.
- **Permission numbers**: CBE says "The entry box always appears", even when
  it is not needed.
- **Scattered rules and deadlines**: the 24-unit cap, Monday of Week 2 for
  semesters and per-class Last Day to Enrol for sessions. The deadline is
  11:59pm on ANU pages and 11:50pm on CBE pages.
- **Small screens**: "Some homepage tiles don't work well on small screens."
- **Tutorials are a separate system** (MyTimetable), reached through the
  "Allocate to Your Class" tile.

## 8. Live ANUHub observations (2026-09-24)

These were seen read-only in a signed-in postgraduate student session, at
https://selfservice.sas.anu.edu.au/psp/sscsprod/EMPLOYEE/SA/c/ANU_ISIS.ANU_ENROLMENT.GBL.
Only structure, labels and public class data are recorded here. There is no
name, student ID, program, grade or enrolment. Nothing was added, dropped or
submitted. The screenshots taken show personal data and are not committed.

The component name `ANU_ISIS.ANU_ENROLMENT.GBL` confirms the §1h inference:
this is an ANU-built page, not delivered Fluid Class Search and Enroll.
Every view renders inside one iframe (`TargetContent`) under the same URL,
so no view has its own address.

### 8a. Enrolment (the session list)

- Notes at the top: sessions from prior years aren't shown (use Academic
  History), and a student should contact their College if a term or session
  is missing.
- A career heading ("Postgraduate") above a table with the columns
  **Semester / Session** | **Academic Program** | an **Enrolment Details**
  button.
- Rows seen: First Semester, 2026; Autumn Session, 2026; Winter Session,
  2026; Second Semester, 2026; Spring Session, 2026. Labels take the form
  "<Session>, <year>".
- **No dates, no current-session marker and no "next" marker.** There was no
  Summer Session 2026 row and **no 2027 row yet**.
- Footer: "Select the Enrolment Details button to enrol in the corresponding
  program for the semester/session."

### 8b. Enrolment Class List (behind "Enrolment Details")

- It replaces the session list in the same iframe. A NavBar back arrow
  returns.
- Warnings: dropping every class makes "you academic load" (sic) zero;
  international students must keep a full-time load; to change session,
  "select the Enrolment option from the menu above".
- Context line: career, program code and name, session.
- Table columns: **Class Number** | **Course** ("CODE - Title", truncated to
  about 40 characters) | **Mode** | **Census Date** (DD/MM/YYYY) | **Units
  Taken** (e.g. 6.00) | **Enrolment Status** ("Enroled" (sic) or "Dropped") |
  a **Drop** button.
- Dropped classes stay in the list, without a button.
- No Swap button was visible, although §1d's guides describe one. There is
  no unit total and there are no class start or end dates.
- An **Add** button sits below the table.

### 8c. Add Class

- Heading "Add Class", with the warning "Adding classes to your enrolment is
  a two step process. You must complete both steps to add the classes."
- Instruction: "Enter a class number in the field below, or click Search to
  search for the appropriate class. Repeat for each class you wish to add.
  When you have selected all of the classes in which you wish to enrol,
  click Continue." This paragraph was missing after returning from Search.
- Controls: a **Class Number:** text box with an **Add Class** button, a
  **Search** button, then **Continue** and **Cancel**. A reminder says
  enrolment isn't complete until Continue.
- The box takes class numbers only; there is no course-code input.
- Not observed, because it would change enrolment: Continue, then the
  permission number, then Save. The §1c sequence stands for those steps.

### 8d. Class Search

- Notes: undergraduates need a permission code for postgraduate classes and
  vice versa, and non-award students need one for any class.
- "*Academic Career and Subject Area are required to perform all searches."
- Fields:
  - **Academic Career*** (select): Non Award, Postgraduate, Research,
    Undergraduate.
  - **Subject Area Description*** and **Subject Area*** (selects): the same
    list twice, by name and by code, kept in sync. They fill only after a
    career is chosen, with 71 subject areas for Postgraduate.
  - **Catalogue Number** (text) and **Course Title Keyword** (text).
- There is no search across subject areas, and none by class number, mode,
  level or description.

### 8e. Class Search Results

- The heading "Class Search Results", the context line, a count ("1-28 of
  28" for Postgraduate COMP, Second Semester 2026) and a grid.
- Columns: **Class Number** | **Course** (truncated as in 8b) | **Mode** |
  **Start Date** | **End Date**, with an **Add Class** button on each row.
- Sorted by class number; the column headers don't sort. There are no
  units, career, census date, last day to enrol or description.
- One class per click: Add Class returns to the Add Class page, and a
  course in another subject needs a new search.

Public class numbers for Postgraduate COMP in Second Semester 2026. All are
In Person, 27/07/2026–30/10/2026, and titles are as ANUHub truncates them.

| Class | Course |
|---|---|
| 8665 | COMP6996 - Unspecified credit non-Computi |
| 8693 | COMP6390 - Human-Computer Interaction |
| 8695 | COMP8620 - Advanced Topics in AI - Planning and Le |
| 8697 | COMP6490 - Document Analysis |
| 8699 | COMP8691 - Optimisation |
| 8702 | COMP6710 - Structured Programming |
| 8703 | COMP6260 - Foundations of Computing |
| 8706 | COMP6730 - Programming for Scientists |
| 8707 | COMP6442 - Software Construction |
| 8708 | COMP6120 - Software Engineering |
| 8709 | COMP6310 - Systems Networks & Concurrency |
| 8710 | COMP6240 - Relational Databases |
| 8711 | COMP6261 - Information Theory |
| 8712 | COMP6330 - Operating Systems |
| 8713 | COMP6464 - High Performance Scientific Co |
| 8714 | COMP8430 - Data Wrangling |
| 8716 | COMP8715 - Advanced Computing Team Projec |
| 8718 | COMP6466 - Algorithms |
| 8719 | COMP6670 - Intro to Machine Learning |
| 8721 | COMP8800 - Advanced Computing Research Pr |
| 8722 | COMP8830 - Computing Internship |
| 8725 | COMP8820 - Exchange Program for Computer |
| 9010 | COMP6034 - Network Security |
| 9012 | COMP8011 - Advanced Topics in Formal Meth - Softwa |
| 9013 | COMP8045 - Advanced Topics in Computer Sy - System |
| 9055 | COMP7710 - Programming Fundamentals |
| 9057 | COMP8020 - Advanced Topics in Human-Centr - Agenti |
| 9072 | COMP8280 - Responsible Practice, Innovati |
