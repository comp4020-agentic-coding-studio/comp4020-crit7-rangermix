// What the P&C crawl covers (spec §8.1). Changing this file changes the
// snapshot: re-run `pnpm data:fetch && pnpm data:build`.

export const BASE = "https://programsandcourses.anu.edu.au";
export const YEARS = [2026, 2027] as const;
/** Requirements follow the template students' commencement year. */
export const RULES_YEAR = 2026;

export const USER_AGENT =
  "comp4020-crit7-enrolment-crawler/0.1 (+https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rangermix; student project; fetched by an AI coding agent at a student's direction; about 1 request per second)";

export interface ProgramScope {
  code: string;
  career: "UGRD" | "PGRD";
  plans: string[];
}

export const PROGRAMS: ProgramScope[] = [
  { code: "BCOMP", career: "UGRD", plans: ["COMS-MAJ", "CSEC-MAJ", "DTSC-MAJ", "INSY-MAJ", "SOFT-MAJ"] },
  { code: "AACOM", career: "UGRD", plans: ["ARIN-SPEC", "HCCC-SPEC", "MACL-SPEC", "SYAR-SPEC", "THCS-SPEC"] },
  { code: "AACRD", career: "UGRD", plans: ["ARIN-SPEC", "HCCC-SPEC", "MACL-SPEC", "SYAR-SPEC", "THCS-SPEC"] },
  { code: "7706XMCOMP", career: "PGRD", plans: ["ARTIF-SPEC", "CMSY-SPEC", "DTSC-SPEC", "MCHL-SPEC", "SOFT-SPEC"] },
  { code: "7722XVCOMP", career: "PGRD", plans: ["ARTIF-SPEC", "CMSY-SPEC", "DTSC-SPEC", "MCHL-SPEC", "SOFT-SPEC"] },
];

/** Multi-class examples, so the chooser has real cases (spec §8.1). */
export const EXTRA_COURSES = ["SCOM8014", "POGO8062", "REGN8050"];

export const COMP_CODE = /^COMP\d{4}$/;

export type PlanKind = "program" | "major" | "specialisation";

export function planKind(code: string): PlanKind {
  if (code.endsWith("-MAJ")) return "major";
  if (code.endsWith("-SPEC")) return "specialisation";
  return "program";
}

/** The fifteen distinct majors and specialisations; a shared plan appears once. */
export function planCodes(): string[] {
  return [...new Set(PROGRAMS.flatMap((p) => p.plans))];
}

export function courseListUrl(year: number): string {
  return `${BASE}/data/CourseSearch/GetCourses?SearchText=COMP&SelectedYear=${year}&ShowAll=true&PageIndex=0&MaxPageSize=10&PageSize=Infinity&AppliedFilter=FilterByCourses`;
}

const LIST_QUERY = `CollegeName=CECS&SelectedYear=${RULES_YEAR}&ShowAll=true`;
export const planListUrls = [
  `${BASE}/data/ProgramSearch/GetProgramsUnderGraduate?${LIST_QUERY}`,
  `${BASE}/data/ProgramSearch/GetProgramsPostGraduate?${LIST_QUERY}`,
  `${BASE}/data/MajorSearch/GetMajors?${LIST_QUERY}`,
  `${BASE}/data/SpecialisationSearch/GetSpecialisations?${LIST_QUERY}`,
];

export function pageUrl(kind: PlanKind | "course", code: string, year: number = RULES_YEAR): string {
  return `${BASE}/${year}/${kind}/${code}`;
}
