import type { StudentView } from "../../lib/types";

interface Props {
  student: StudentView;
  busy: boolean;
  resetPending: boolean;
  /** Null once M2's settings bar holds Reset (spec §11.2). */
  onReset: (() => void) | null;
}

export function SiteNav({ student, busy, resetPending, onReset }: Props) {
  return (
    <nav aria-label="Site" className="site-nav">
      <ul className="site-nav__links">
        <li>
          <a href="/" aria-current="page">
            Enrolment
          </a>
        </li>
        <li>
          <a href="/readme/">About</a>
        </li>
      </ul>
      <p className="site-nav__who">
        {student.name} · {student.uid} · {student.programShort}
        {student.planName ? ` · ${student.planName}` : ""}
      </p>
      {onReset && (
        <button type="button" className="button button--quiet" disabled={busy} onClick={onReset}>
          {resetPending ? "Resetting…" : "Reset demo"}
        </button>
      )}
    </nav>
  );
}
