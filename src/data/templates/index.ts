import vcomp from "./7722XVCOMP.json";

// Template students: the only invented data (spec §8.5). One per program,
// keyed by programCode; a sandbox is a clone of one (spec §5.2). Provenance
// and the picking rules are in ./README.md.

export interface TemplateEnrolment {
  sessionId: string;
  classNumber: number;
  courseCode: string;
  grade: string | null;
  enrolledOn: string;
}

export interface Template {
  uid: string;
  name: string;
  programCode: string;
  plans: string[];
  rulesYear: number;
  commencedSessionId: string;
  enrolments: TemplateEnrolment[];
}

export const TEMPLATES: Template[] = [vcomp];
export const DEFAULT_PROGRAM = "7722XVCOMP";
