// Outside pages the enrolment page points to (spec §15). Each was checked on 2026-09-27.

/** ANU's census dates, with the WD and WN withdrawal grades. */
export const CENSUS_DATES_URL = "https://www.anu.edu.au/students/program-administration/program-management/census-dates";

/** How to request a permission code: the Application for Permission Code (Coursework). */
export const PERMISSION_CODES_URL = "https://www.anu.edu.au/students/program-administration/enrolment/permission-codes";

/** ANU's timetabling pages: when MyTimetable opens for tutorial and lab allocation each semester. */
export const TIMETABLING_URL = "https://www.anu.edu.au/students/program-administration/timetabling";

/** A class's own P&C page, which carries its timetable link: /2027/course/COMP8800/First%20Semester/5048. */
export function classPageUrl(session: { name: string; year: number }, courseCode: string, classNumber: number): string {
  const label = session.name.replace(/ \d{4}$/, "");
  return `https://programsandcourses.anu.edu.au/${session.year}/course/${courseCode}/${encodeURIComponent(label)}/${classNumber}`;
}
