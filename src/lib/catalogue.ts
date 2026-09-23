import snapshot from "../data/pc/snapshot.json";
import { ref } from "./ref";
import type { CourseRow } from "./schema";
import { canAdd } from "./sessions";
import type { Catalogue, CatalogueClass, Chooser, Facets } from "./types";

// One session's classes for the catalogue (spec §6.4), and one course's
// classes for the chooser (spec §6.3). canAdd is computed here, on the
// server, so the client never compares dates.

const SNAPSHOT_YEAR = Number(snapshot.fetchedOn.slice(0, 4));

function facetsOf(classes: { subject: string; career: CourseRow["career"]; level: number; mode: string }[]): Facets {
  const r = ref();
  return {
    subjects: [...new Set(classes.map((c) => c.subject))].sort().map((code) => ({ code, name: r.subjects.get(code) ?? code })),
    careers: [...new Set(classes.map((c) => c.career))].sort(),
    levels: [...new Set(classes.map((c) => c.level))].sort((a, b) => a - b),
    modes: [...new Set(classes.map((c) => c.mode))].sort(),
  };
}

export function catalogueFor(sessionId: string, today: string): Catalogue {
  const r = ref();
  const session = r.sessionById.get(sessionId);
  if (!session) throw new Error(`catalogueFor: no session ${sessionId}`);
  const classes: CatalogueClass[] = (r.classesBySession.get(sessionId) ?? []).map((c) => {
    const course = r.courseByCode.get(c.courseCode) as CourseRow;
    return {
      classNumber: c.classNumber,
      courseCode: c.courseCode,
      subject: course.subject,
      catalogue: course.catalogue,
      level: course.level,
      title: course.title,
      career: course.career,
      units: course.units,
      mode: c.mode,
      topic: c.topic,
      startDate: c.startDate,
      endDate: c.endDate,
      lastDayToEnrol: c.lastDayToEnrol,
      censusDate: c.censusDate,
      description: course.description,
      requisites: course.requisites,
      pcUrl: course.pcUrl,
      canAdd: canAdd(c, today),
    };
  });
  return { sessionId, sessionName: session.name, indicative: session.year > SNAPSHOT_YEAR, today, classes, facets: facetsOf(classes) };
}

/** The filter options a session's classes offer, used to check a URL's filter values (spec §9). */
export function facetsFor(sessionId: string): Facets | null {
  const r = ref();
  if (!r.sessionById.has(sessionId)) return null;
  return facetsOf(
    (r.classesBySession.get(sessionId) ?? []).map((c) => {
      const course = r.courseByCode.get(c.courseCode) as CourseRow;
      return { subject: course.subject, career: course.career, level: course.level, mode: c.mode };
    }),
  );
}

export function chooserFor(code: string, sessionId: string, today: string): Chooser | null {
  const r = ref();
  const course = r.courseByCode.get(code);
  const session = r.sessionById.get(sessionId);
  if (!course || !session) return null;
  const classes = (r.classesByCourse.get(code) ?? []).filter((c) => c.sessionId === sessionId);
  if (classes.length === 0) return null;
  const topics = new Set(classes.map((c) => c.topic ?? ""));
  return {
    sessionId,
    sessionName: session.name,
    course: { code, title: course.title, units: course.units, career: course.career, requisites: course.requisites, pcUrl: course.pcUrl },
    classes: classes.map((c) => ({
      classNumber: c.classNumber,
      mode: c.mode,
      topic: c.topic,
      startDate: c.startDate,
      endDate: c.endDate,
      lastDayToEnrol: c.lastDayToEnrol,
      censusDate: c.censusDate,
      canAdd: canAdd(c, today),
    })),
    note: topics.size < classes.length ? `You can enrol in one class of ${code} per session, unless the classes have different topics.` : null,
  };
}
