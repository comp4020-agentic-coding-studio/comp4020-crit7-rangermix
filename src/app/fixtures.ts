import type { AppProps, Catalogue, CatalogueClass, Chooser, EnrolmentView, RequirementsView, SessionView, UrlState, View } from "../lib/types";
import { EMPTY_FILTERS } from "./url";

// Typed fixtures for the component tests (plan clarification 7). They follow
// the API's types, so they can't drift from what the server sends. The
// course and class values here are test data, not the app's data.

export const enrolment = (patch: Partial<EnrolmentView> = {}): EnrolmentView => ({
  id: 1,
  sessionId: "2026-S2",
  classNumber: 8707,
  courseCode: "COMP6442",
  title: "Software Construction",
  units: 6,
  mode: "In Person",
  topic: null,
  startDate: "2026-07-27",
  endDate: "2026-10-30",
  censusDate: "2026-08-31",
  state: "enrolled",
  grade: null,
  enrolledOn: "2026-07-13",
  droppedOn: null,
  canDrop: true,
  dropConfirm: true,
  dropConsequences: ["You can't add it back: adding closed on Mon 3 Aug.", "You'll still be charged for it: the census date was Mon 31 Aug."],
  dropNote: null,
  ...patch,
});

export const S2_2026: SessionView = {
  id: "2026-S2",
  name: "Second Semester 2026",
  kind: "semester",
  year: 2026,
  startDate: "2026-07-27",
  endDate: "2026-10-30",
  badge: "now",
  fold: null,
  keyDates: "exams 5–21 Nov · add closed 3 Aug · census 31 Aug · drop without failure until 9 Oct · drop to 4 Nov",
  add: { open: false, reason: "Adding closed on 3 Aug" },
  cap: 24,
  classCount: 1,
  units: 6,
  enrolments: [enrolment()],
};

export const S1_2027: SessionView = {
  id: "2027-S1",
  name: "First Semester 2027",
  kind: "semester",
  year: 2027,
  startDate: "2027-02-22",
  endDate: "2027-05-28",
  badge: "next",
  fold: null,
  keyDates: "exams 3–19 Jun · add until 1 Mar · census 31 Mar · drop to 2 Jun",
  add: { open: true },
  cap: 24,
  classCount: 0,
  units: 0,
  enrolments: [],
};

const REQUIREMENTS: RequirementsView = {
  programCode: "7722XVCOMP",
  programName: "Master of Computing (Advanced)",
  programUrl: "https://programsandcourses.anu.edu.au/2026/program/7722XVCOMP",
  planCode: "ARTIF-SPEC",
  planName: "Artificial Intelligence",
  planUrl: "https://programsandcourses.anu.edu.au/2026/specialisation/ARTIF-SPEC",
  summary: { done: 18, enrolled: 18, total: 66 },
  blocks: [
    {
      source: "program",
      title: "Program",
      groups: [
        {
          id: 3,
          rule: "all",
          label: "All of",
          text: "24 units from completion of",
          state: "not-met",
          courses: [
            {
              code: "COMP8800",
              title: "Advanced Computing Research Project",
              units: 12,
              times: 2,
              icon: "todo",
              text: "Not enrolled",
              add: { sessionId: "2027-S1", label: "Add to First Semester 2027" },
            },
          ],
        },
      ],
    },
  ],
  notes: [],
};

export function makeView(patch: Partial<View> = {}): View {
  return {
    today: "2026-09-24",
    snapshotDate: "2026-09-24",
    student: {
      name: "Demo Student",
      uid: "u7000001",
      programCode: "7722XVCOMP",
      programName: "Master of Computing (Advanced)",
      programShort: "MCompAdv",
      career: "PGRD",
      planCode: "ARTIF-SPEC",
      planName: "Artificial Intelligence",
    },
    sessions: [S2_2026, S1_2027],
    nextSemesterId: "2027-S1",
    requirements: REQUIREMENTS,
    marks: { COMP6442: { completed: null, enrolledIn: ["2026-S2"] } },
    requiredCodes: ["COMP8800", "COMP6442"],
    demo: {
      today: "2026-09-24",
      override: null,
      realToday: "2026-09-24",
      minDate: "2026-01-01",
      maxDate: "2027-12-31",
      programs: [{ code: "7722XVCOMP", name: "Master of Computing (Advanced)", plans: [{ code: "ARTIF-SPEC", name: "Artificial Intelligence" }] }],
    },
    ...patch,
  };
}

export const urlState = (patch: Partial<UrlState> = {}): UrlState => ({ open: null, choose: null, term: null, browse: null, filters: EMPTY_FILTERS, ...patch });

export const appProps = (patch: Partial<AppProps> = {}): AppProps => ({ view: makeView(), url: urlState(), notices: [], catalogue: null, chooser: null, ...patch });

export const POGO_CHOOSER: Chooser = {
  sessionId: "2027-S1",
  sessionName: "First Semester 2027",
  course: { code: "POGO8062", title: "A course with two classes", units: 6, career: "PGRD", requisites: null, pcUrl: "https://programsandcourses.anu.edu.au/2026/course/POGO8062" },
  classes: [
    { classNumber: 5354, mode: "In Person", topic: null, startDate: "2027-02-22", endDate: "2027-05-28", lastDayToEnrol: "2027-03-01", censusDate: "2027-03-31", canAdd: true },
    { classNumber: 5355, mode: "Online", topic: null, startDate: "2027-02-22", endDate: "2027-05-28", lastDayToEnrol: "2027-03-01", censusDate: "2027-03-31", canAdd: true },
  ],
  note: "You can enrol in one class of POGO8062 per session, unless the classes have different topics.",
};

const cls = (patch: Partial<CatalogueClass>): CatalogueClass => ({
  classNumber: 5000,
  courseCode: "COMP6000",
  subject: "COMP",
  catalogue: "6000",
  level: 6000,
  title: "A course",
  career: "PGRD",
  units: 6,
  mode: "In Person",
  topic: null,
  startDate: "2027-02-22",
  endDate: "2027-05-28",
  lastDayToEnrol: "2027-03-01",
  censusDate: "2027-03-31",
  description: "",
  requisites: null,
  pcUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP6000",
  canAdd: true,
  ...patch,
});

export const CATALOGUE: Catalogue = {
  sessionId: "2027-S1",
  sessionName: "First Semester 2027",
  indicative: true,
  today: "2026-09-24",
  classes: [
    cls({ classNumber: 5101, courseCode: "COMP8691", catalogue: "8691", level: 8000, title: "Optimisation", description: "Linear and integer optimisation methods." }),
    cls({ classNumber: 5102, courseCode: "COMP8620", catalogue: "8620", level: 8000, title: "Advanced Topics in Artificial Intelligence", description: "Search, planning and learning." }),
    cls({ classNumber: 5103, courseCode: "COMP1100", catalogue: "1100", level: 1000, career: "UGRD", title: "Programming as Problem Solving", description: "Functional programming." }),
    cls({ classNumber: 5354, courseCode: "POGO8062", subject: "POGO", catalogue: "8062", level: 8000, title: "A policy course", mode: "Online", description: "Public policy." }),
  ],
  facets: {
    subjects: [
      { code: "COMP", name: "Computer Science" },
      { code: "POGO", name: "Policy and Governance" },
    ],
    careers: ["PGRD", "UGRD"],
    levels: [1000, 8000],
    modes: ["In Person", "Online"],
  },
};
