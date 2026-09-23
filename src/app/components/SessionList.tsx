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

// The page's spine (spec D1): sessions grouped by year, earlier years folded away.
export function SessionList({ sessions, nextSemesterId, open, onToggle, renderDetails }: Props) {
  const years = (list: SessionView[]) => {
    const byYear = new Map<number, SessionView[]>();
    for (const s of list) byYear.set(s.year, [...(byYear.get(s.year) ?? []), s]);
    return [...byYear].map(([year, rows]) => (
      <div key={year} className="year-group">
        <p className="year-group__label">{year}</p>
        {rows.map((s) => (
          <SessionRow key={s.id} session={s} open={open.includes(s.id)} onToggle={onToggle}>
            {renderDetails(s)}
          </SessionRow>
        ))}
      </div>
    ));
  };
  const earlier = sessions.filter((s) => s.earlier);
  return (
    <section className="sessions" aria-labelledby="sessions-heading">
      <h2 id="sessions-heading" tabIndex={-1}>
        Sessions
      </h2>
      {nextSemesterId === null && <p className="sessions__note">No next semester in the loaded data (2026–2027)</p>}
      {earlier.length > 0 && (
        <details className="earlier">
          <summary>Show earlier sessions</summary>
          {years(earlier)}
        </details>
      )}
      {years(sessions.filter((s) => !s.earlier))}
    </section>
  );
}
