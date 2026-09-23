# ANU Programs and Courses (P&C) research for the enrolment prototype

Researched 2026-09-24 using public pages only, at about 1 request per second, through WebFetch, curl and a Playwright browser.
The base URL is `https://programsandcourses.anu.edu.au` (shortened to `P&C` below).
Every path below is relative to that base.
Anything I could not confirm is marked UNVERIFIED.

General site behaviour:

- **Missing pages don't return a 404 status.** A missing page redirects to `/Error/Index/404?aspxerrorpath=...` and comes back as HTTP 200 with the title "Page not found".
  - A crawler has to check the final URL or the page title.
  - Example: `/2026/program/VCOMP`.
- **URLs without a year show 2027.** For example, `/course/COMP1100` and `/specialisation/ARTIF-SPEC` both resolve to the 2027 content, which is the site's default year.
- **Program page sections are hidden tabs.** The sections are `#overview`, `#study` (which contains `#program-requirements`, `#specialisations` and `#studyoptions`) and `#admission-and-fees`.
  - Scraping innerText misses them, so parse the whole HTML.
- **Curl sometimes hangs.** Over HTTPS, the first requests connected but received 0 bytes and timed out after 30–120 s. Later, identical requests finished in about 1 s with no special headers. One more timeout happened on 2026-09-24.
  - The cause is UNVERIFIED (a transient problem, or a WAF or rate limiting on first contact).
  - A harvester needs timeouts and retries.

## A. Computing programs

**Source.** The JSON endpoint `/data/ProgramSearch/GetProgramsUnderGraduate` and the matching `...PostGraduate` endpoint, called with `CollegeName=CECS&SelectedYear=2026&ShowAll=true`, together with each program's page `/2026/program/<code>`.

**CECS programs in 2026 (from the JSON):**

- **Undergraduate (13):** AACOM, AACRD, BADAN, HADAN, BCOMP, HCOMP, AENGI, AENSE, AENRD, BENSU, HIT, BMASC, HMASC.
- **Postgraduate (23):** CACYB, 6659XGCENV, CFORS, GCSCM, 6706XGDCP, DENVI, MACYB, VACYB, 7706XMCOMP, 7722XVCOMP, MENCH, VENCH, NELENG, MENVI, VENVI, MFORS, VFORS, MMLCV, VMASC, 7670XVSCAI, MSCOM, 7670XNSCAI, 7670XNSCMS.

**Changes in 2027:**

- 12 undergraduate programs, because HIT is dropped.
- 25 postgraduate programs, because NMENG and NEMENG are added.

**Changes back to 2025:**

- BIT, the Bachelor of Information Technology, has a page at `/2025/program/BIT`.
- `/2026/program/BIT` returns 404, so BIT is not offered in 2026.

**JSON program fields.** MoleculeHexColour, AcademicPlanCode, ProgramName, ShortProgramName, Atar, AtarText, SelectionRank, SelectionRankText, CareerText, AcademicCareer, ProgramAcademicYear, DegreeIdentifiers, Duration, Categories, AnchorDegree, Year, ModeOfDelivery, CanCombine, CanCombineVertical, StudyAsText, StudyAsHelpText.
The total units are not in the JSON. They appear only on the page, as "Minimum N Units".

**Programs with computing at their core, 2026.** Each code links to `/2026/program/<code>`.

| Code | Name | Career | Units | Notes |
|---|---|---|---|---|
| AACOM | Bachelor of Advanced Computing (Honours) | UG | 192 | 4 years, selection rank 85 |
| AACRD | Bachelor of Advanced Computing (Research and Development) (Honours) | UG | 192 | selection rank 98 |
| BCOMP | Bachelor of Computing | UG | 144 | 3 years, selection rank 80 |
| HCOMP | Bachelor of Computing (Honours) | UG | 48 | 1-year honours |
| HIT | Bachelor of Information Technology (Honours) | UG | 48 | 2026 only |
| AENSE | Bachelor of Engineering (Honours) in Software Engineering | UG | 192 | COMP and ENGN mix |
| BADAN | Bachelor of Applied Data Analytics | UG | 144 | COMP, STAT and SOCR mix; only partly computing |
| 6706XGDCP | Graduate Diploma of Computing | PG | 48 | |
| 7706XMCOMP | Master of Computing | PG | 96 | 2 years |
| 7722XVCOMP | Master of Computing (Advanced) | PG | 96 | 2 years |
| MMLCV | Master of Machine Learning and Computer Vision | PG | 96 | CRICOS 099247C |

There is also a flexible double degree, 4850FDD, for Advanced Computing (Honours), which takes 5 years.

### What is "VCOMP"?

VCOMP is the **Master of Computing (Advanced)**. P&C doesn't recognise the bare code. The program's academic plan code is **`7722XVCOMP`**, where 7722 is the program number.

- `/2026/program/VCOMP` returns 404.
- The real page is https://programsandcourses.anu.edu.au/2026/program/7722XVCOMP. Its page metadata includes:

  ```html
  <meta name="program-acronym" content="MCOMPADV" />
  <meta name="program-code" content="7722XVCOMP" />
  ```

  - The page's "molecule" label shows MCOMPADV.
  - Header details:
    - Post-nominal: MCompAdv
    - CRICOS 085934F
    - Mode: In Person
    - Field of education: Computer Science
    - Contact: Dylan Campbell
  - The overview adds:
    - The program is ACS accredited and AQF level 9 with research.
    - Students can receive "up to 48 units of credit".
- The Master of Computing and the Graduate Diploma work the same way:
  - MCOMP is `7706XMCOMP`, and the bare `/2026/program/MCOMP` returns 404.
  - GDCP is `6706XGDCP`.

So the prototype should store the P&C code (`7722XVCOMP`) and show "VCOMP" or "MCOMPADV" only as an alias.

### Recommended 5 programs for the prototype

| # | Code | Why |
|---|---|---|
| 1 | BCOMP | UG program that uses majors and has one minor |
| 2 | AACOM | UG honours program that uses specialisations |
| 3 | 7706XMCOMP | PG program; shares 7 specialisations with VCOMP |
| 4 | 7722XVCOMP | PG program, requested; research project; GPA gate |
| 5 | MMLCV | PG program with no specialisations and an "Either/Or" pathway rule |

AACRD would also work in place of MMLCV. It shares AACOM's 5 specialisations.

## B. Majors, specialisations and minors (2026)

**Sources:**

- The JSON endpoints `/data/MajorSearch/GetMajors`, `/data/SpecialisationSearch/GetSpecialisations` and `/data/MinorSearch/GetMinors`, called with `CollegeName=CECS&SelectedYear=2026&ShowAll=true`.
- The #specialisations or majors section of each program page.
- Each plan's page at `/2026/major/<code>`, `/2026/specialisation/<code>` or `/2026/minor/<code>`, which includes a "Relevant Degrees" list.

### BCOMP: 7 majors (48 units each) and 1 minor

**Majors:**

| Code | Name |
|---|---|
| COMS-MAJ | Computer Systems |
| CSEC-MAJ | Cyber Security |
| DTSC-MAJ | Data Science |
| HCCC-MAJ | Human-Centred and Creative Computing |
| INFS-MAJ | Information Systems |
| INSY-MAJ | Intelligent Systems |
| SOFT-MAJ | Software Development |

**Minor:** HCCC-MIN, Human-Centred and Creative Computing, 24 units.

Where these plans are used:

- The "Relevant Degrees" list on each major page names only BCOMP.
- Whether the majors can also be taken as elective majors in other degrees is UNVERIFIED.

The 5 most central majors are COMS, CSEC, DTSC, INSY and SOFT.

Example requirements:

- **CSEC-MAJ:** 36 compulsory units, including COMP2120, COMP2310, COMP2700, COMP3300, COMP3310 and COMP3704.
- **SOFT-MAJ:** COMP2120, COMP3500 (taken as 6+6) and COMP4130, among others.
- **DTSC-MAJ:** COMP3425 and COMP3430, plus 36 units from a list.
- Majors also carry notes such as "incompatible with" another plan and "not available to BADAN students".

Other CECS minors in 2026 include CSFN-MIN (Computer Science Foundations) and COMF-MIN (Computing & Mathematical Foundations). The JSON also lists the specialisation COMP-HSPC, Computer Science Honours (UG, 48 units).

### AACOM and AACRD: 5 specialisations (UG, 24 units each), shared by both programs

| Code | Name |
|---|---|
| ARIN-SPEC | Artificial Intelligence |
| HCCC-SPEC | Human-Centred and Creative Computing |
| MACL-SPEC | Machine Learning |
| SYAR-SPEC | Systems and Architecture |
| THCS-SPEC | Theoretical Computer Science |

- The specialisation pages say they are "only available to students studying BAC (AACOM) and BACR&D (AACRD)".
- ARIN-SPEC's compulsory courses are COMP2620, COMP3620, COMP4620 and COMP4691.

### MCOMP (7706XMCOMP) and VCOMP (7722XVCOMP): PG specialisations, 24 units each

| Code | Name | MCOMP | VCOMP |
|---|---|---|---|
| ARTIF-SPEC | Artificial Intelligence | yes | yes |
| COMP-SPEC | Computational Foundations | yes | yes |
| CMSY-SPEC | Computer Systems | yes | yes |
| DTSC-SPEC | Data Science | yes | yes |
| HCCM-SPEC | Human-Centred and Creative Computing | yes | yes |
| MCHL-SPEC | Machine Learning | yes | yes |
| SOFT-SPEC | Software Development | yes | yes |
| CSEC-SPEC | Cyber Security | no | yes (its Relevant Degrees list names only VCOMP) |

- The 5 most central for VCOMP are ARTIF, MCHL, CMSY, SOFT, and DTSC or CSEC.
- **MMLCV has no specialisations.**
- Every PG specialisation requires at least 12 units at 8000 level.

Short requirement summaries for the PG specialisations, from `/2026/specialisation/<code>`:

- **COMP-SPEC:**
  - At least 12 units from COMP6361, COMP6363, COMP8011, COMP8460, MATH6114 and MATH8343.
  - At most 12 units from COMP6261, COMP6262, COMP6466 and COMP8712.
- **CMSY-SPEC:**
  - At least 12 units from COMP8300, COMP8045 and COMP8712.
  - At most 12 units from COMP6300, COMP6310, COMP6330, COMP6331, COMP6361, COMP6464 and ENGN6213.
- **CSEC-SPEC:**
  - Compulsory: COMP6034 and COMP6800.
  - At least 6 units from COMP8131 and COMP8703.
  - At most 6 units from COMP8011, COMP8045 and COMP8712.
- **DTSC-SPEC:**
  - Compulsory: COMP6240, COMP8410 and COMP8430.
  - 6 units from COMP6490, COMP6670, COMP8600, COMP8650 and COMP8880.
- **HCCM-SPEC:**
  - COMP6390.
  - At least 12 units from COMP8350, COMP8539 and COMP8610.
  - At most 6 units from COMP6528, COMP6540, COMP6720 and COMP6780.
- **MCHL-SPEC:**
  - 24 units from COMP6261, COMP6490, COMP6528, COMP6670, COMP8600, COMP8650 and COMP8880.
- **SOFT-SPEC:**
  - Compulsory: COMP6120 and ENGN8100.
  - 6 units of 8000-level COMP, excluding COMP8715, COMP8800 and COMP8830.
  - At most 12 units from COMP6240, COMP6331, COMP6390, INFS8004, INFS8205, LAWS8445, MGMT7020 and REGN8014.
  - It also has a substitution rule: "MCOMP students who complete COMP6120 ... replace it with 6 units of 6000/8000 COMP".

### Codes that look shared but aren't

UG and PG plans on the same topic use different codes:

| Topic | UG | PG |
|---|---|---|
| AI | ARIN-SPEC | ARTIF-SPEC |
| Machine learning | MACL-SPEC | MCHL-SPEC |
| Human-centred and creative computing | HCCC-SPEC (and HCCC-MAJ, HCCC-MIN) | HCCM-SPEC |

The same stem is also reused across plan types:

- DTSC-MAJ (UG major) and DTSC-SPEC (PG specialisation).
- SOFT-MAJ and SOFT-SPEC.
- CSEC-MAJ and CSEC-SPEC.

The data model should therefore key plans by their full code, including the suffix.

### Changes in 2027

- **Machine learning specialisations removed.** MCHL-SPEC and MACL-SPEC are absent from the 2027 specialisation JSON, and `/2027/specialisation/MCHL-SPEC` returns 404.
- **VCOMP page is inconsistent.** At https://programsandcourses.anu.edu.au/2027/program/7722XVCOMP:
  - The Specialisations link list leaves out Machine Learning and uses year-less links (`/specialisation/ARTIF-SPEC`).
  - The requirement text still lists "Machine Learning".
- **BCOMP majors unchanged.** The 2027 majors are the same 7.

## C. Requirement phrasing

### VCOMP (7722XVCOMP), 2026

Source: https://programsandcourses.anu.edu.au/2026/program/7722XVCOMP (#program-requirements). The 2027 wording is the same.

> The Master of Computing (Advanced) requires the completion of 96 units, of which:
> A minimum of 48 units must come from completion of 8000-level COMP courses.
> The 96 units must consist of:
> - 6 units from the completion of one of the following courses: COMP6250 Professional Practice: Holistic Thinking and Communication (6) / COMP8260 Professional Practice: Responsible Innovation & Leadership (6)
> - 12 units from completion of the following compulsory courses: COMP6442 Software Construction (6), COMP6445 Computing Research Methods (6)
> - 24 units from completion of COMP8800 Advanced Computing Research Project, which must be taken twice, in consecutive semesters (12+12)
> - 24 units from the completion of one of the following Specialisations: Artificial Intelligence, Computer Systems, Cyber Security, Computational Foundations, Data Science, Human Centred and Creative Computing, Machine Learning, Software Development
> - 18 units from completion of further 6000, 7000 or 8000 level courses from the subject area COMP Computer Science or ENGN Engineering
> - 12 units from completion of elective courses offered by ANU

The quote is close to verbatim. Whitespace is collapsed and list markers are added.

**Compulsory courses:**

- COMP6442 and COMP6445.
- COMP8800, taken twice (12+12 units).
- One of COMP6250 or COMP8260.

**Rules on the same page:**

- **GPA gate.** "Students who do not achieve a GPA of 6 in the first 48 units ... [are] automatically transferred to the Master of Computing."
- **Supervisor deadline.** A student without supervisor approval for COMP8800 by week 1 of their final two semesters is also transferred to MCOMP.
- **Registration form.** "Other Requirements" says COMP8800 needs a project registration form.
- **Capstone:** COMP8800.

**Inconsistency on the page.** The Study Options sample plan puts COMP8280 in Year 1 instead of COMP6250 or COMP8260.

### The VCOMP AI specialisation: ARTIF-SPEC "Artificial Intelligence"

Source: https://programsandcourses.anu.edu.au/2026/specialisation/ARTIF-SPEC

**Details:**

- 24 units, Postgraduate.
- Contact: Jochen Renz.
- Relevant Degrees: 7706XMCOMP and 7722XVCOMP.

**2026 wording:**

> This Specialization requires the completion of 24 units, which must consist of a minimum of 12 units of 8000 level courses. The 24 units must consist of: COMP6262 Logic, COMP6320 Artificial Intelligence, COMP8620 Advanced Topics in Artificial Intelligence, COMP8691 Optimisation.

In effect, all four courses are compulsory.

**2027 changes the rule.** Source: https://programsandcourses.anu.edu.au/2027/specialisation/ARTIF-SPEC

- It still needs 24 units, including at least 12 units at 8000 level.
- **A maximum of 12 units** from COMP6262, COMP6320, COMP6242 (Deep Learning), COMP6670 and COMP6528.
- **A minimum of 12 units** from COMP8490, COMP8539, COMP8600, COMP8620, COMP8650 and COMP8691.

### MCOMP (7706XMCOMP), 2026, for comparison

Source: https://programsandcourses.anu.edu.au/2026/program/7706XMCOMP

- **Total:** 96 units, with at least 24 units of 8000-level COMP.
- **30 compulsory units:** COMP6120, COMP6442, COMP7710 and COMP8280.
  - The page calls COMP7710 "Structured Programming (12 units)".
  - Its catalogue title is actually "Programming Fundamentals".
- **"A minimum of 6 units from":** MATH6005 or COMP6260.
- **"A maximum of 12 units from":** COMP8715 (6+6) or COMP8830 (12).
- **Specialisation:** one 24-unit specialisation from 7 options (Cyber Security is not one of them).
- **Further COMP/ENGN:** 18 units of 6000–8000-level COMP or ENGN.
- **Electives:** 6 units.

### MMLCV, 2026

Source: https://programsandcourses.anu.edu.au/2026/program/MMLCV

- **Compulsory:** COMP6710.
- **Professional practice:** 6 units from COMP6250 or COMP8260.
- **Core list:** 24 units from COMP6528, COMP6670, COMP8536, COMP8539, COMP8600 and COMP8650.
- **CV/ML list:** 18 more units from a list that includes ENGN6627.
- **Either/Or pathway:**
  - Either COMP6442, plus 12 units from COMP8715 (6+6) or COMP8830, plus 12 units of 6000–8000-level COMP or ENGN.
  - Or COMP6445, plus COMP8800 (12+12).
- **Electives:** 12 units of PG electives.

### Undergraduate example: BCOMP, 2026

Source: https://programsandcourses.anu.edu.au/2026/program/BCOMP

> The Bachelor of Computing requires completion of 144 units, of which:
> - A minimum of 12 units must come from completion of courses tagged as Transdisciplinary Problem-Solving
> - A minimum of 24 units must come from completion of 3000 and 4000-level COMP courses
> - A maximum of 60 units may come from completion of 1000-level courses
>
> A minimum of 96 units from completion of courses from the following lists:
> - 6 units from COMP1100 / COMP1130
> - 6 units from COMP1110 / COMP1140
> - 6 units from MATH1005 / MATH2222
> - 24 units from the compulsory courses COMP1600, COMP2100, COMP2300, COMP2400
> - 48 units from courses in the subject area COMP, OR completion of one of the computing majors
>   - [This option also requires] 6 units of ICT-related courses from the list: ARTH2181, ASIA3032, DESN2010, ENGN1211, ENVS2015, INFS2024, INFS3002, INFS3024, MATH1013, MATH1115, MATH2301, MATH2307, MGMT2009, MUSI3309, SCOM3029, SOCY2038, SOCY2166, STAT1003, STAT1008
>
> A minimum of 48 units of electives.

This is a structural paraphrase with close wording. The major codes in the requirement text are plain text, not links.

**What the prototype's rule engine needs to model:**

- A total unit count.
- Level caps and minimums, such as "a maximum of 60 units at 1000 level".
- Minimums by subject area.
- Tag-based minimums (Transdisciplinary Problem-Solving).
- "One of" choices.
- Compulsory sets.
- "A major OR N units from subject area X" choices.
- Electives.

### AACOM (UG honours), 2026

Source: https://programsandcourses.anu.edu.au/2026/program/AACOM

- **Unit rules:**
  - 192 units in total.
  - At most 60 units at 1000 level.
  - At least 48 units of 4000-level COMP.
  - 12 units of Transdisciplinary Problem-Solving.
- **One course from each pair:** COMP1100 or COMP1130; COMP1110 or COMP1140; MATH1005 or MATH2222.
- **48 compulsory units:** COMP2100, COMP2120, COMP2300, COMP2310, COMP2400, COMP3600, COMP3630 and COMP4450. The page calls COMP2100 "Software Design Methodologies".
- **Specialisation:** one 24-unit specialisation from the 5 listed.
- **Further COMP:** 18 units of 3000- or 4000-level COMP.
- **ICT list:** 12 units.
- **Honours pathway, one of three:**
  - COMP4550 (12+12).
  - COMP4500 (6+6) plus 12 units of 4000-level COMP.
  - COMP4820 plus 12 units of 4000-level COMP.
- **Electives:** 48 units.
- **Honours mark:** the class is calculated from the APM, 0.1·A1 + 0.2·A2 + 0.3·A3 + 0.4·A4 (the program also mentions COMP4801).

### AACRD, 2026

Source: https://programsandcourses.anu.edu.au/2026/program/AACRD

- **78 compulsory units:** COMP1130, COMP1140, COMP2100, COMP2300, COMP2550, COMP3600, COMP3630, COMP3770 (6+6) and COMP4550 (12+12).
- **Maths:** 18 units from MATH and STAT courses.
- **Progression gates:** WAM thresholds of 75% and 80%.

## D. Data access

### robots.txt, quoted in full

Source: https://programsandcourses.anu.edu.au/robots.txt

```
User-agent: ChatGPT-User
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Twitterbot
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: cohere-ai
Disallow: /

User-agent: omgilibot
Disallow: /

User-agent: omgili
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: YouBot
Disallow: /

User-agent: OAI-SearchBot
Disallow: /
```

The file has one `User-agent: X` / `Disallow: /` block for each of the bots above. Blank lines between blocks are as I observed them, and their exact spacing is UNVERIFIED.

**Reading it:**

- There is no `User-agent: *` rule, so crawlers not listed are unrestricted.
- ClaudeBot is disallowed. Claude-User is not listed. How this applies to user-directed Claude fetches is an interpretation, so it is UNVERIFIED.
- Recommendation: the prototype's harvester should run as a human-triggered script with its own honest User-Agent. It should make about 1 request per second, cache the results as a committed fixture, and not re-fetch at runtime.

### JSON endpoints

All endpoints are HTTP GET and return `application/json`. The search pages call them through jQuery `$.ajax`. Their URLs are in the `data-action` attributes of the tab divs on https://programsandcourses.anu.edu.au/catalogue, which lists all 8 (checked 2026-09-24).

| Endpoint | Returns |
|---|---|
| `/data/CourseSearch/GetCourses` | courses |
| `/data/ProgramSearch/GetProgramsUnderGraduate` | undergraduate programs |
| `/data/ProgramSearch/GetProgramsPostGraduate` | postgraduate programs |
| `/data/ProgramSearch/GetProgramsResearch` | research programs |
| `/data/ProgramSearch/GetProgramsNonAward` | non-award programs |
| `/data/MajorSearch/GetMajors` | majors |
| `/data/SpecialisationSearch/GetSpecialisations` | specialisations |
| `/data/MinorSearch/GetMinors` | minors |

**Query parameters:**

- **Year and search text:**
  - `SelectedYear`: 2014–2027; the default is 2027.
  - `SearchText`: a full-text search.
- **Paging and sorting:**
  - `ShowAll=true` returns every result.
  - With `ShowAll=false`, results come 10 at a time, in relevance order, using `PageIndex`, `MaxPageSize=10` and `PageSize=Infinity`.
  - `SortColumn` and `SortDirection`.
- **Filters:**
  - `AppliedFilter`, for example FilterByCourses, FilterByPrograms or FilterByMajors.
  - `CollegeName`: All Colleges, CASS, CAP, CBE, COL, CPS, CECS or ANUONE.
  - `ModeOfDelivery`: All Modes, In Person, Online or Multi-modal.
  - `Careers[0..3]`; for example, `Careers[0]=Postgraduate` works.
  - `Sessions[0..5]`, `DegreeIdentifiers[0..2]`, `GraduateAttributes[0..2]` and `OtherCriteria[0..1]`.
  - `FilterByMajors`, `FilterByMinors` and `FilterBySpecialisations`.
- **Other parameters the page sends:** `Source`, `InitailSearchRequestedFromExternalPage` (misspelled on the site) and `initialSearch`.

**Minimal working query:** `?SearchText=COMP&SelectedYear=2026&ShowAll=true`

**Response shapes:**

- **Courses:**

  ```
  { TotalCount, Items: [ { CourseCode, Name, Session, Career, Units, ModeOfDelivery, Year } ], Suggestion }
  ```

  - `Session` is a value such as `"First Semester/Second Semester"`, or `""` when the course isn't offered that year.
  - `Career` is Undergraduate, Postgraduate or Research.
  - `Units` is 6.0, 12.0 or 3.0.
- **Majors, specialisations and minors:**

  ```
  { Name, Units, SubPlanCode, SubplanType (MAJ | SPC | MIN), Year, Career }
  ```

- **Programs:** see section A for the field list.

**Quirks:**

- **`TotalCount` can't be trusted.** An empty 2026 course search reported TotalCount 500 but returned 3012 items. The CECS majors query reported 35 but returned 26 items. Count `Items` instead.
- **`SearchText=COMP` is full-text.** It also matches non-COMP courses (for example ASTR4004) and HDR codes (COMP8900P/F, COMP9000F/P, COMP8901F, COMP9001F).
  - Filter with `^COMP[0-9]{4}$`.
  - Cross-check: the unfiltered 2026 search reports TotalCount 194, or 92 with `Careers[0]=Postgraduate`.
- **Units are in the JSON, but prerequisites are not.** They are only on the course pages (see E).

### Listing COMP courses for 2026 and 2027

Verified on 2026-09-24. The command is polite, with a 1.5 s gap between requests.

```sh
for y in 2026 2027; do
  curl -s --max-time 60 "https://programsandcourses.anu.edu.au/data/CourseSearch/GetCourses?SearchText=COMP&SelectedYear=$y&ShowAll=true&PageIndex=0&MaxPageSize=10&PageSize=Infinity&AppliedFilter=FilterByCourses" \
  | jq '[.Items[] | select(.CourseCode|test("^COMP[0-9]{4}$"))] | length'
  sleep 1.5
done
```

Running it with `CollegeName=CECS` and an empty `SearchText` for 2026 also gives the same 123 COMP courses.

**Counts:**

| Year | COMP#### courses | UG | PG | Research | Empty `Session` (not offered that year) |
|---|---|---|---|---|---|
| 2026 | 123 | 61 | 61 | 1 (COMP8999) | 28 |
| 2027 | 122 | 60 | 61 | 1 (COMP8999) | 27 |

The only difference between the two years is COMP1710 (Web Development and Design, UG), which is absent in 2027.

**2026 undergraduate (61):** COMP1100 1110 1130 1140 1600 1710 1720 1730 2100 2120 2300 2310 2400 2550 2610 2620 2700 2710 3242 3300 3310 3320 3425 3430 3500 3540 3600 3610 3620 3630 3670 3703 3704 3710 3740 3770 3820 3900 4011 4020 4045 4130 4300 4350 4425 4450 4500 4528 4550 4600 4610 4620 4650 4670 4680 4691 4703 4712 4820 4880 5920

**Postgraduate (61, the same in 2026 and 2027):** COMP6034 6120 6240 6242 6250 6260 6261 6262 6300 6310 6320 6330 6331 6361 6363 6390 6434 6442 6445 6464 6466 6470 6490 6528 6540 6670 6710 6720 6730 6780 6800 7710 8011 8020 8045 8131 8260 8280 8300 8350 8410 8430 8460 8490 8500 8535 8536 8539 8600 8610 8620 8650 8691 8703 8712 8715 8800 8820 8830 8880 8980

**Courses with an empty Session in 2026:** COMP1710 1720 3540 3610 3703 3710 3820 4300 4350 4425 4880 6250 6361 6434 6540 6720 6780 8131 8260 8300 8350 8490 8500 8536 8539 8703 8880 8980

**Courses with an empty Session in 2027:** COMP1720 2710 3425 3540 3703 3710 3820 4600 4691 4712 4880 6250 6470 6490 6540 6720 6780 8260 8430 8460 8500 8536 8691 8712 8880 8980 8999

**Why the empty-Session lists matter.** Several courses that requirements name as compulsory or listed have an empty Session in a given year:

- COMP8260 and COMP6250 have none in either year.
- COMP8691, which the 2027 ARTIF-SPEC names, has none in 2027.

The prototype should surface this as "not offered in <year>". Whether an empty Session always means the course isn't offered is UNVERIFIED; it may just mean the offering hasn't been published yet.

## E. Course page structure

The examples are:

- https://programsandcourses.anu.edu.au/2026/course/COMP8020, titled "Advanced Topics in Human-Centred and Creative Computing - ANU".
- https://programsandcourses.anu.edu.au/2027/course/COMP1100.

### Header (`.degree-summary`)

| Field | Example |
|---|---|
| Code | COMP8020 |
| Unit Value | "6 units" |
| Offered by | School of Computing |
| ANU College | ANU College of Systems and Society |
| Course subject | Computer Science |
| Academic career | PGRD (COMP1100 shows UGRD) |
| Course convener | Dr Ben Swift |
| Mode of delivery | In Person |
| Co-taught Course | COMP4020 |
| Offered in | "Second Semester 2026" |
| Other | STEM Course flag; COMP1100 also has "Areas of interest" |

So the page gives the units, the career (UGRD/PGRD) and the subject. The JSON gives Units and Career as Undergraduate or Postgraduate. The subject can be taken from the code prefix.

### Body sections, by element id

- `#overview`, `#introduction` and `#learning-outcomes`.
- `#study`.
- `#indicative-assessment` and `#workload`.
- `#incompatibility`, headed "Requisite and Incompatibility". Its free text sits in `div.requisite`, for example "To enrol in this course, you must have completed COMP6390 ...", along with a note about permission codes.
  - **The prerequisites are prose, not structured data.** Parsing them would need heuristics, or a hand-curated table.
- `#prescribed-texts`.
- `#offerings-and-fees`:
  - A Units | EFTSL table, for example 6.00 | 0.12500.
  - Indicative fees: for COMP8020 in 2026, $5520 for domestic students and $7020 for international students.
- `#class`, covered in the next section.

### Offerings table (`#class`)

- **Heading:** `h2#terms`, "Offerings, Dates and Class Summary Links".
- **Notice:** "The list of offerings for future years is indicative only."
- **Year tabs:** `#tabs-container` holds one tab per year. On the 2026 COMP8020 page these are `course-tab-1/2/3`, for 2026, 2027 and 2028. On the 2027 COMP1100 page the tabs are 2027 and 2028.
- **Inside each tab:**
  - An `h3` with the session name, for example "Second Semester" or "First Semester".
  - A `table.table-terms` with these columns:

    | Class number | Class start date | Last day to enrol | Census date | Class end date | Mode Of Delivery | Class Summary |
    |---|---|---|---|---|---|---|

  - Some tables start with a topic row that spans all 7 columns. On COMP8020 in 2026, that row is "Agentic Coding Studio".

**Example rows:**

| Page | Year | Session | Class number | Start | Last day to enrol | Census | End | Mode | Class summary |
|---|---|---|---|---|---|---|---|---|---|
| COMP8020 | 2026 | S2 | 9057 | 27 Jul 2026 | 03 Aug 2026 | 31 Aug 2026 | 30 Oct 2026 | In Person | View (`/2026/course/COMP8020/Second%20Semester/9057`) |
| COMP8020 | 2027 | S2 | 10060 | 26 Jul 2027 | 02 Aug 2027 | 31 Aug 2027 | 29 Oct 2027 | In Person | N/A |
| COMP8020 | 2028 | S2 | 10824 | 24 Jul 2028 | 31 Jul 2028 | 31 Aug 2028 | 27 Oct 2028 | | |
| COMP1100 | 2027 | S1 | 5099 | 22 Feb 2027 | 01 Mar 2027 | 31 Mar 2027 | 28 May 2027 | | |
| COMP1100 | 2027 | S2 | 10101 | 26 Jul 2027 | 02 Aug 2027 | 31 Aug 2027 | 29 Oct 2027 | | |
| COMP1100 | 2028 | S1 | 6679 | 21 Feb 2028 | | | 26 May 2028 | | |
| COMP1100 | 2028 | S2 | 11051 | | | | | | |

Blank cells were not recorded.

**Class summary page** (https://programsandcourses.anu.edu.au/2026/course/COMP8020/Second%20Semester/9057) shows:

- Class Number and Class Info.
- Topic ("Agentic Coding Studio").
- Mode of Delivery and Course Convener.
- Class Dates: Start, End, Census and Last Date to Enrol.
- A "View Class Timetable" link.

### Are 2027 pages indicative?

- There is **no page-level "indicative" or "provisional" banner** on the 2027 pages I sampled (2027 COMP1100, 2027 VCOMP, 2027 ARTIF-SPEC).
- The only "indicative" markers are:
  - The offerings sentence, "future years is indicative only".
  - The "Indicative Assessment" and "Indicative Fees" headings, which also appear on 2026 pages.
- Whether 2027 content as a whole is final is UNVERIFIED. The 2027 pages already contain inconsistencies (see B), which suggests the data is still changing.

### Do requirement lists link course codes?

Mostly yes. In program, specialisation and major requirement lists, course codes are usually links of the form `<a href="/2026/course/CODE">`. So a crawler can find non-COMP courses the rules name, such as:

- MATH6005, MATH6114, MATH8343, MATH1005 and MATH2222.
- ENGN6627, ENGN6213 and ENGN8100.
- INFS8004, INFS8205, LAWS8445, MGMT7020 and REGN8014.
- The BCOMP/AACOM ICT list.

**Caveats:**

- **Plan names are plain text.** Specialisation and major names inside requirement text aren't links; the links are in the separate Specialisations or Majors section. Examples are the specialisation names in the VCOMP requirement and the computing majors in BCOMP.
- **Some links use old or no years:**
  - HCOMP links to absolute 2023 URLs, for example `https://programsandcourses.anu.edu.au/2023/course/COMP4450`.
  - The 2027 VCOMP specialisation links have no year.
- **Some linked courses don't exist.** HIT lists COMP4330, COMP4630 and COMP4660, and `/2026/course/COMP4330` returns 404 ("Page not found").
- **Course names in requirement text can be stale:**
  - COMP7710 is "Structured Programming" in MCOMP but "Programming Fundamentals" in the catalogue.
  - AACOM calls COMP2100 "Software Design Methodologies".
  - AENSE calls COMP2300 "Computer Organisation and Program Execution".
- **Rules aren't links.** Rules such as "units from the subject area COMP", level rules, and tag rules like Transdisciplinary Problem-Solving are prose.

**Recommendation for the harvester:**

- Take course metadata (name, units, career, session) from the `/data` JSON.
- Take only codes and structure from the requirement HTML.
- Hand-encode the rule structure for the 5 chosen programs, because the requirement text is semi-structured prose.
