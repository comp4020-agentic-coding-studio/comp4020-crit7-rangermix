// The view model and API types (spec §4.3). The server builds these
// (src/lib/view.ts and friends); the React client only renders them.
// Dates are ISO "YYYY-MM-DD" strings throughout.

export type Career = "UGRD" | "PGRD" | "RSCH";
export type Badge = "now" | "next" | "upcoming" | "past";

export interface View {
  /** The date the view is computed for: today(student). */
  today: string;
  /** When the P&C snapshot was fetched. */
  snapshotDate: string;
  student: StudentView;
  /** Every session in the calendar, in start-date order. */
  sessions: SessionView[];
  /** The next semester (spec D3), or null when the data has none. */
  nextSemesterId: string | null;
  requirements: RequirementsView;
  /** Per course the student has history in: what the catalogue marks on its rows. */
  marks: Record<string, CourseMark>;
  /** Courses in the student's tracked requirement groups ("Required" in the catalogue). */
  requiredCodes: string[];
  demo: DemoView;
}

export interface DemoView {
  /** The date the view is computed for. */
  today: string;
  /** The sandbox's date setting; null means the real date. */
  override: string | null;
  realToday: string;
  /** The span of the loaded sessions: the date input's limits (spec §11.2). */
  minDate: string;
  maxDate: string;
  programs: { code: string; name: string; plans: { code: string; name: string }[] }[];
}

export interface StudentView {
  name: string;
  uid: string;
  programCode: string;
  programName: string;
  /** P&C's post-nominal ("MCompAdv"), else the acronym, else the code. */
  programShort: string;
  career: Career;
  planCode: string | null;
  planName: string | null;
}

export type AddState = { open: true } | { open: false; reason: string };

export interface SessionView {
  id: string;
  name: string;
  kind: "semester" | "intensive";
  year: number;
  startDate: string;
  endDate: string;
  badge: Badge;
  /** Before today's year: shown behind "Show earlier sessions" (spec §6.2). */
  earlier: boolean;
  /** "exams 5–21 Nov · add closed 3 Aug · census 31 Aug · …" (spec §6.2). */
  keyDates: string;
  add: AddState;
  /** The self-enrol cap: 24 for a semester, null for an intensive session. */
  cap: number | null;
  /** Live (not dropped) classes and their units. */
  classCount: number;
  units: number;
  /** Live enrolments by course code, then dropped ones. */
  enrolments: EnrolmentView[];
}

export type EnrolmentState = "enrolled" | "completed" | "failed" | "dropped";

export interface EnrolmentView {
  id: number;
  sessionId: string;
  classNumber: number;
  courseCode: string;
  title: string;
  units: number;
  mode: string;
  topic: string | null;
  startDate: string;
  endDate: string;
  censusDate: string;
  state: EnrolmentState;
  grade: string | null;
  enrolledOn: string;
  droppedOn: string | null;
  canDrop: boolean;
  /** Why an enrolled class offers no Drop: "Self-service drop closed on 4 Nov 2026". */
  dropNote: string | null;
}

export type Icon = "done" | "enrolled" | "partial" | "todo" | "none";

export interface CourseStatusView {
  code: string;
  title: string;
  units: number;
  times: number;
  icon: Icon;
  /** "Completed · First Semester 2026 · D", "Enrolled · Second Semester 2026 (now)", … (spec §5.3). */
  text: string;
  /** "Add to First Semester 2027": the next semester offers the course, and the student isn't enrolled in it. */
  add: { sessionId: string; label: string } | null;
}

export type GroupState = "met" | "in-progress" | "not-met";

export interface GroupView {
  id: number;
  rule: "all" | "units";
  label: string;
  text: string;
  state: GroupState;
  courses: CourseStatusView[];
}

export interface BlockView {
  source: "program" | "plan";
  /** "Program", "Specialisation · Artificial Intelligence", "Major · Software Development". */
  title: string;
  groups: GroupView[];
}

export interface NoteView {
  id: number;
  source: "program" | "plan";
  text: string;
  courses: CourseStatusView[];
}

export interface RequirementsView {
  programCode: string;
  programName: string;
  programUrl: string;
  planCode: string | null;
  planName: string | null;
  planUrl: string | null;
  summary: { done: number; enrolled: number; total: number };
  blocks: BlockView[];
  notes: NoteView[];
}

export interface CourseMark {
  /** "Completed · First Semester 2026" once the course can't be taken again (its maxTakes are used). */
  completed: string | null;
  /** Sessions with a live enrolment in the course that isn't completed yet. */
  enrolledIn: string[];
}

export interface ChooserClass {
  classNumber: number;
  mode: string;
  topic: string | null;
  startDate: string;
  endDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  canAdd: boolean;
}

export interface Chooser {
  sessionId: string;
  sessionName: string;
  course: { code: string; title: string; units: number; career: Career; requisites: string | null; pcUrl: string };
  classes: ChooserClass[];
  /** Set when the classes don't differ by topic, so only one can be enrolled (plan clarification 1). */
  note: string | null;
}

export interface CatalogueClass {
  classNumber: number;
  courseCode: string;
  subject: string;
  catalogue: string;
  level: number;
  title: string;
  career: Career;
  units: number;
  mode: string;
  topic: string | null;
  startDate: string;
  endDate: string;
  lastDayToEnrol: string;
  censusDate: string;
  description: string;
  requisites: string | null;
  pcUrl: string;
  canAdd: boolean;
}

export interface Facets {
  subjects: { code: string; name: string }[];
  careers: Career[];
  levels: number[];
  modes: string[];
}

export interface Catalogue {
  sessionId: string;
  sessionName: string;
  /** P&C: "the list of offerings for future years is indicative only". */
  indicative: boolean;
  /** The date canAdd was computed for: the client refetches when the view's date changes. */
  today: string;
  classes: CatalogueClass[];
  facets: Facets;
}

export interface Outcome {
  ok: boolean;
  message: string;
  warning: string | null;
  courseCode: string | null;
  classNumber: number | null;
}

export interface WriteResponse {
  outcomes: Outcome[];
  view: View;
}

export interface ChooseResponse {
  choose: Chooser;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface Filters {
  q: string;
  title: string;
  code: string;
  class: string;
  subject: string;
  career: string;
  level: string;
  mode: string;
  sort: "code" | "title" | "level";
  page: number;
}

/** The SPA's URL state (spec §4.2), kept in the query string with replaceState. */
export interface UrlState {
  /** Sessions whose details are open; null means the default, the next semester. */
  open: string[] | null;
  choose: string | null;
  term: string | null;
  /** The catalogue's session; null means the catalogue is collapsed. */
  browse: string | null;
  filters: Filters;
}

export interface Notice {
  tone: "ok" | "error" | "warning" | "info";
  text: string;
}

/** What index.astro passes to the island. */
export interface AppProps {
  view: View;
  url: UrlState;
  notices: Notice[];
  catalogue: Catalogue | null;
  chooser: Chooser | null;
}
