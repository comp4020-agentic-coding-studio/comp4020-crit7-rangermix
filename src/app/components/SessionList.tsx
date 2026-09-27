import type { ReactNode } from "react";
import type { SessionView } from "../../lib/types";
import { SessionRow } from "./SessionRow";

interface Props {
  sessions: SessionView[];
  nextSemesterId: string | null;
  open: string[];
  onToggle: (sessionId: string, open: boolean) => void;
  renderDetails: (session: SessionView) => ReactNode;
}

/** "Winter Session 2026" → "Winter". */
const shortName = (s: SessionView): string => s.name.replace(/ Session \d{4}$/, "");

// The page's spine (spec D1, §15.1): sessions grouped by year. Past sessions,
// and intensive sessions with none of the student's classes, fold away, so the
// current and next semesters lead.
export function SessionList({ sessions, nextSemesterId, open, onToggle, renderDetails }: Props) {
  const row = (s: SessionView) => (
    <SessionRow key={s.id} session={s} open={open.includes(s.id)} onToggle={onToggle}>
      {renderDetails(s)}
    </SessionRow>
  );
  // A fold opens when it holds a session the URL (or the chooser) opened.
  const fold = (kind: "past" | "intensive", label: string, rows: SessionView[]) => (
    <details className={`fold fold--${kind}`} open={rows.some((s) => open.includes(s.id))}>
      <summary>{label}</summary>
      {rows.map(row)}
    </details>
  );
  const past = sessions.filter((s) => s.fold === "past");
  const byYear = new Map<number, SessionView[]>();
  for (const s of sessions) if (s.fold !== "past") byYear.set(s.year, [...(byYear.get(s.year) ?? []), s]);
  return (
    <section className="sessions" aria-labelledby="sessions-heading">
      <h2 id="sessions-heading" tabIndex={-1}>
        Sessions
      </h2>
      {nextSemesterId === null && <p className="sessions__note">No next semester in the loaded data (2026–2027)</p>}
      {past.length > 0 && fold("past", `Past sessions (${past.length})`, past)}
      {[...byYear].map(([year, rows]) => {
        const quiet = rows.filter((s) => s.fold === "intensive");
        return (
          <div key={year} className="year-group">
            <p className="year-group__label">{year}</p>
            {rows.filter((s) => s.fold === null).map(row)}
            {quiet.length > 0 && fold("intensive", `Intensive sessions (${quiet.length}): ${quiet.map(shortName).join(", ")}`, quiet)}
          </div>
        );
      })}
    </section>
  );
}
