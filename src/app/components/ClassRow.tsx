import { fmtDate, fmtUnits } from "../../lib/format";
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
        </span>
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
      {e.canDrop && (
        <button type="button" className="button button--danger" disabled={busy} onClick={() => onDrop(e)} aria-label={`Drop ${e.courseCode} class ${e.classNumber}`}>
          {pending ? "Dropping…" : "Drop"}
        </button>
      )}
      {e.dropNote && <p className="class__note">{e.dropNote}</p>}
    </details>
  );
}
