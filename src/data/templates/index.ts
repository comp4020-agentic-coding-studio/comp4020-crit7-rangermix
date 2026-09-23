import mcomp from "./7706XMCOMP.json";
import vcomp from "./7722XVCOMP.json";
import aacom from "./AACOM.json";
import aacrd from "./AACRD.json";
import bcomp from "./BCOMP.json";

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

export const TEMPLATES: Template[] = [vcomp, mcomp, bcomp, aacom, aacrd];
export const DEFAULT_PROGRAM = "7722XVCOMP";
