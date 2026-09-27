import type { ReactNode } from "react";
import { TIMETABLING_URL } from "../../lib/links";
import type { EnrolmentView, Notice, SessionView } from "../../lib/types";
import { ClassRow } from "./ClassRow";
import { InlineNotices } from "./Notices";

interface Props {
  session: SessionView;
  busy: boolean;
  pending: string | null;
  /** The outcome of the last drop in this session (spec §15.3). */
  result: Notice[] | null;
  onDrop: (e: EnrolmentView) => void;
  /** The add area: the input, the chooser, or why adding is closed. */
  children: ReactNode;
}

// "Enrolment details", unfolded in place inside the session row (spec §6.2, F4).
export function EnrolmentDetails({ session, busy, pending, result, onDrop, children }: Props) {
  const units = session.cap === null ? `${session.units} units` : `${session.units} of ${session.cap} units`;
  return (
    <div className="details">
      <h4 className="details__heading">
        Enrolment details{" "}
        <span className="details__count">
          · {session.classCount} class{session.classCount === 1 ? "" : "es"} · {units}
        </span>
      </h4>
      {session.enrolments.length === 0 ? (
        <p className="details__empty">
          {session.add.open ? `No classes in ${session.name} yet. Add one below, use your requirements list, or browse classes.` : `No classes in ${session.name}.`}
        </p>
      ) : (
        <ul className="classes">
          {session.enrolments.map((e) => (
            <li key={e.id}>
              <ClassRow enrolment={e} busy={busy} pending={pending === `drop:${e.sessionId}:${e.classNumber}`} onDrop={onDrop} />
            </li>
          ))}
        </ul>
      )}
      <InlineNotices notices={result} />
      {/* Tutorials live in a separate system; point there once there's a class to go to (spec §15.6). */}
      {session.enrolments.some((e) => e.state === "enrolled") && (
        <p className="details__tutorials">
          Tutorials and labs are chosen separately, in MyTimetable, once allocation opens. <a href={TIMETABLING_URL}>Timetabling dates and MyTimetable</a>
        </p>
      )}
      {children}
    </div>
  );
}
