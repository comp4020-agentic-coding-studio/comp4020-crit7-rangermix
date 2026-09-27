import type { Career } from "./types";

// Permission codes (spec §15.5). ANUHub asks for one only on some classes,
// so the page flags only those: a class outside the program's career (ANUHub's
// class search notes), or a course whose P&C requisites mention a code, read
// with the two conditions P&C uses ("in intensive mode", "previously completed
// …"). Nothing here blocks an enrolment; the prototype doesn't ask for codes.

export interface PermissionContext {
  programCareer: Career;
  /** Courses the student has completed. */
  completed: Set<string>;
}

const CAREER: Record<Career, string> = { UGRD: "undergraduate", PGRD: "postgraduate", RSCH: "research" };
const A_CAREER: Record<Career, string> = { UGRD: "an undergraduate", PGRD: "a postgraduate", RSCH: "a research" };

/** Why ANUHub would ask this student for a permission code for the course in this kind of session, or null. */
export function permissionReason(course: { career: Career; requisites: string | null }, sessionKind: "semester" | "intensive", ctx: PermissionContext): string | null {
  if (course.career !== ctx.programCareer) return `it's ${A_CAREER[course.career]} course and your program is ${CAREER[ctx.programCareer]}`;
  const sentence = course.requisites?.match(/[^.]*permission code[^.]*/i)?.[0];
  if (!sentence) return null;
  if (/intensive mode/i.test(sentence)) return sessionKind === "intensive" ? "P&C's requisites ask for one in intensive mode" : null;
  const after = sentence.match(/previously completed ([A-Z]{4}\d{4}(?:\s*(?:,|or|and)\s*[A-Z]{4}\d{4})*)/);
  if (after) {
    const done = (after[1].match(/[A-Z]{4}\d{4}/g) ?? []).find((code) => ctx.completed.has(code));
    return done ? `you've completed ${done}, and P&C's requisites ask for one then` : null;
  }
  return "P&C's requisites ask for one";
}

/** "Needs a permission code: …", shown on the chooser, the catalogue and an enrolment. */
export const permissionNote = (reason: string | null): string | null => (reason ? `Needs a permission code: ${reason}.` : null);
