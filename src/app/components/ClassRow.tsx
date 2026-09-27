import { useEffect, useRef, useState } from "react";
import { fmtDate, fmtUnits } from "../../lib/format";
import { CENSUS_DATES_URL, PERMISSION_CODES_URL } from "../../lib/links";
import type { EnrolmentView } from "../../lib/types";

function stateText(e: EnrolmentView): string {
  switch (e.state) {
    case "dropped":
      return `Dropped · ${fmtDate(e.droppedOn ?? e.enrolledOn)}`;
    case "completed":
      return e.grade ? `Completed · ${e.grade}` : "Completed";
    case "failed":
      return `Grade ${e.grade}`;
    default:
      return "Enrolled";
  }
}

interface Props {
  enrolment: EnrolmentView;
  busy: boolean;
  pending: boolean;
  onDrop: (e: EnrolmentView) => void;
}

// One class in a session's enrolment details: a nested <details> (spec §6.2).
export function ClassRow({ enrolment: e, busy, pending, onDrop }: Props) {
  return (
    <details className={`class class--${e.state}`} data-class={e.classNumber}>
      <summary>
        <span className="class__code">{e.courseCode}</span> <span className="class__title">{e.title}</span>
        <span className="class__meta">
          {" "}
          · class {e.classNumber} · {e.mode} · {fmtUnits(e.units)}
          {e.topic ? ` · ${e.topic}` : ""}
        </span>{" "}
        <span className="class__state">{stateText(e)}</span>
      </summary>
      <dl className="class__facts">
        <div>
          <dt>Class dates</dt>
          <dd>
            {fmtDate(e.startDate)} – {fmtDate(e.endDate)}
          </dd>
        </div>
        <div>
          <dt>Census date</dt>
          <dd>{fmtDate(e.censusDate)}</dd>
        </div>
        <div>
          <dt>Enrolled</dt>
          <dd>{fmtDate(e.enrolledOn)}</dd>
        </div>
        {e.grade && (
          <div>
            <dt>Grade</dt>
            <dd>{e.grade}</dd>
          </div>
        )}
      </dl>
      {e.permission && (
        <p className="class__note">
          {e.permission} <a href={PERMISSION_CODES_URL}>How to get a permission code</a>
        </p>
      )}
      {e.canDrop && <DropControl enrolment={e} busy={busy} pending={pending} onDrop={onDrop} />}
      {e.dropNote && <p className="class__note">{e.dropNote}</p>}
    </details>
  );
}

// Drop (spec §15.2): one click for a class that hasn't started; otherwise it asks first, in
// place, listing what dropping now costs. Keep and Escape return focus to Drop.
function DropControl({ enrolment: e, busy, pending, onDrop }: Props) {
  const [asking, setAsking] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (asking) panel.current?.focus();
  }, [asking]);
  const name = `${e.courseCode} class ${e.classNumber}`;
  const label = pending ? `Dropping ${name}` : `Drop ${name}`;
  if (!e.dropConfirm) {
    return (
      <>
        <button type="button" className="button button--danger" disabled={busy} onClick={() => onDrop(e)} aria-label={label}>
          {pending ? "Dropping…" : "Drop"}
        </button>
        {e.dropConsequences.map((line) => (
          <p key={line} className="class__note">
            {line}
          </p>
        ))}
      </>
    );
  }
  const keep = (): void => {
    setAsking(false);
    setTimeout(() => button.current?.focus(), 0);
  };
  if (!asking) {
    return (
      <button ref={button} type="button" className="button button--danger" disabled={busy} onClick={() => setAsking(true)} aria-label={label}>
        Drop…
      </button>
    );
  }
  const id = `drop-${e.sessionId}-${e.classNumber}`;
  return (
    <div
      ref={panel}
      className="drop-confirm"
      role="group"
      aria-labelledby={`${id}-question`}
      aria-describedby={`${id}-consequences`}
      tabIndex={-1}
      onKeyDown={(ev) => {
        if (ev.key === "Escape") keep();
      }}
    >
      <p id={`${id}-question`} className="drop-confirm__question">
        Drop {e.courseCode} {e.title} (class {e.classNumber})?
      </p>
      <ul id={`${id}-consequences`} className="drop-confirm__consequences">
        {e.dropConsequences.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="drop-confirm__more">
        <a href={CENSUS_DATES_URL}>ANU census dates and withdrawal grades</a>
      </p>
      <div className="drop-confirm__actions">
        <button type="button" className="button button--quiet" onClick={keep}>
          Keep {e.courseCode}
        </button>
        <button type="button" className="button button--danger" disabled={busy} onClick={() => onDrop(e)}>
          {pending ? "Dropping…" : `Drop ${e.courseCode}`}
        </button>
      </div>
    </div>
  );
}
