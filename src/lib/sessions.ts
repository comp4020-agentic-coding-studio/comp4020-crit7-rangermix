import { addDays } from "./format";
import type { Badge } from "./types";

// Session classification and deadlines (spec §5.3). Pure: every function
// takes `today`, so a date change (tests, M2) moves everything at once.

export interface SessionDates {
  id: string;
  kind: "semester" | "intensive";
  startDate: string;
  endDate: string;
  examStart: string | null;
  examEnd: string | null;
}

export interface ClassDates {
  lastDayToEnrol: string;
  endDate: string;
}

export const sessionEnd = (s: SessionDates): string => s.examEnd ?? s.endDate;
export const isPast = (s: SessionDates, today: string): boolean => sessionEnd(s) < today;
export const isCurrent = (s: SessionDates, today: string): boolean => s.startDate <= today && today <= sessionEnd(s);

/** Now: every session under way. Next: the earliest semester still to start (spec D3). Upcoming: other future sessions. Past: the rest. */
export function classify(sessions: SessionDates[], today: string): { badges: Map<string, Badge>; nextId: string | null } {
  const next = sessions.filter((s) => s.kind === "semester" && s.startDate > today).sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0];
  const badges = new Map<string, Badge>();
  for (const s of sessions) {
    badges.set(s.id, isCurrent(s, today) ? "now" : s.id === next?.id ? "next" : s.startDate > today ? "upcoming" : "past");
  }
  return { badges, nextId: next?.id ?? null };
}

/** The class's Last Day to Enrol covers the semester rule and each intensive class's own date (spec D4). */
export const canAdd = (c: ClassDates, today: string): boolean => today <= c.lastDayToEnrol;

/** ANU's self-service drop rule: until exams start for a semester, else until the class ends. */
export function dropDeadline(c: ClassDates, s: SessionDates): string {
  return s.kind === "semester" && s.examStart ? addDays(s.examStart, -1) : c.endDate;
}

export const canDrop = (c: ClassDates, s: SessionDates, today: string): boolean => today <= dropDeadline(c, s);
