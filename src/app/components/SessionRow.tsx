import type { ReactNode } from "react";
import { fmtRange } from "../../lib/format";
import type { Badge, SessionView } from "../../lib/types";

const BADGE: Record<Badge, string> = { now: "Now", next: "Next", upcoming: "Upcoming", past: "Past" };

interface Props {
  session: SessionView;
  open: boolean;
  onToggle: (sessionId: string, open: boolean) => void;
  children: ReactNode;
}

// One session: a native <details> whose summary is the row (spec §6.2, D1).
export function SessionRow({ session, open, onToggle, children }: Props) {
  return (
    <details
      className={`session session--${session.badge}`}
      data-session={session.id}
      open={open}
      onToggle={(e) => {
        const isOpen = e.currentTarget.open;
        if (isOpen !== open) onToggle(session.id, isOpen);
      }}
    >
      <summary className="session__summary">
        <h3 className="session__name">{session.name}</h3>
        <span className="session__dates">{fmtRange(session.startDate, session.endDate)}</span>
        <span className={`badge badge--${session.badge}`}>{BADGE[session.badge]}</span>
        <span className="session__key-dates">{session.keyDates}</span>
      </summary>
      <div className="session__body">{children}</div>
    </details>
  );
}
