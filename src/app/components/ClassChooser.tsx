import { useEffect, useRef, useState } from "react";
import { fmtRange } from "../../lib/format";
import { PERMISSION_CODES_URL } from "../../lib/links";
import type { Chooser } from "../../lib/types";

interface Props {
  chooser: Chooser;
  busy: boolean;
  pending: boolean;
  onAdd: (classNumbers: number[]) => void;
  onCancel: () => void;
}

// A course's classes in one session, in place of the input (spec §6.3).
export function ClassChooser({ chooser, busy, pending, onAdd, onCancel }: Props) {
  const [picked, setPicked] = useState<number[]>([]);
  const first = useRef<HTMLInputElement>(null);
  const { code, title } = chooser.course;
  // Opening the chooser moves focus to its first class (spec §6.6).
  useEffect(() => {
    first.current?.focus();
  }, [code, chooser.sessionId]);
  const toggle = (n: number, on: boolean): void => setPicked((p) => (on ? [...p, n] : p.filter((x) => x !== n)));
  return (
    <fieldset className="chooser">
      <legend>
        {code} {title} has {chooser.classes.length} classes in {chooser.sessionName}
      </legend>
      {chooser.note && <p className="hint">{chooser.note}</p>}
      {chooser.permission && (
        <p className="hint">
          {chooser.permission} <a href={PERMISSION_CODES_URL}>How to get a permission code</a>
        </p>
      )}
      <ul className="chooser__classes">
        {chooser.classes.map((c, i) => (
          <li key={c.classNumber}>
            <label className="chooser__class">
              <input
                ref={i === 0 ? first : undefined}
                type="checkbox"
                checked={picked.includes(c.classNumber)}
                disabled={!c.canAdd}
                onChange={(e) => toggle(c.classNumber, e.target.checked)}
                aria-label={`Select ${code} class ${c.classNumber}, ${c.mode}`}
              />
              <span>
                <strong>{c.classNumber}</strong> · {c.mode} · {fmtRange(c.startDate, c.endDate)}
                {c.topic ? ` · ${c.topic}` : ""}
                {c.canAdd ? "" : " · adding closed"}
              </span>
            </label>{" "}
            <a className="chooser__page" href={c.classUrl} aria-label={`${code} class ${c.classNumber}: class page and timetable on Programs & Courses`}>
              class page
            </a>
          </li>
        ))}
      </ul>
      {chooser.course.requisites && (
        <p className="chooser__requisites">
          <strong>Requisites (from P&amp;C, not checked here):</strong> {chooser.course.requisites}
        </p>
      )}
      <div className="chooser__actions">
        <button type="button" className="button" disabled={busy || picked.length === 0} onClick={() => onAdd([...picked].sort((a, b) => a - b))}>
          {pending ? "Adding…" : "Add selected"}
        </button>
        <button type="button" className="button button--quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </fieldset>
  );
}
