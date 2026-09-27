import { useEffect, useState } from "react";
import { fmtDate } from "../../lib/format";
import type { DemoView, Notice, StudentView } from "../../lib/types";
import { InlineNotices } from "./Notices";

export interface DemoChange {
  today?: string | null;
  programCode?: string;
  planCode?: string;
}

interface Props {
  demo: DemoView;
  student: StudentView;
  busy: boolean;
  pending: string | null;
  /** The outcome of the last Apply or Reset (spec §15.3). */
  result: Notice[] | null;
  onApply: (change: DemoChange) => void;
  onReset: (programCode: string) => void;
}

// M2's demo settings bar (spec §11.2): crit scaffolding, labelled as not part
// of the redesign. A named region with no heading, so the page keeps one h1.
export function DemoSettings({ demo, student, busy, pending, result, onApply, onReset }: Props) {
  const [date, setDate] = useState(demo.today);
  const [programCode, setProgramCode] = useState(student.programCode);
  const [planCode, setPlanCode] = useState(student.planCode ?? "");
  useEffect(() => setDate(demo.today), [demo.today]);
  useEffect(() => {
    setProgramCode(student.programCode);
    setPlanCode(student.planCode ?? "");
  }, [student.programCode, student.planCode]);
  const plans = demo.programs.find((p) => p.code === programCode)?.plans ?? [];
  return (
    <section className="demo-bar" aria-label="Demo settings">
      <p className="demo-bar__label">Demo settings — not part of the redesign</p>
      <form
        className="demo-bar__form"
        onSubmit={(e) => {
          e.preventDefault();
          // Only a changed date becomes a demo date, so applying a program alone keeps "real date".
          const dateChanged = date !== demo.today || demo.override !== null;
          onApply({ ...(dateChanged ? { today: date } : {}), programCode, planCode });
        }}
      >
        <div className="field">
          <label htmlFor="demo-date">Date</label>
          <input id="demo-date" type="date" required min={demo.minDate} max={demo.maxDate} value={date} onChange={(e) => setDate(e.target.value)} aria-describedby="demo-date-note" />
          <span id="demo-date-note" className="demo-bar__note">
            {demo.override === null ? "(real date)" : `(demo date; the real date is ${fmtDate(demo.realToday)})`}
          </span>
        </div>
        <button type="button" className="button button--quiet" disabled={busy || demo.override === null} onClick={() => onApply({ today: null })}>
          Use real date
        </button>
        <div className="field">
          <label htmlFor="demo-program">Program</label>
          <select
            id="demo-program"
            value={programCode}
            onChange={(e) => {
              setProgramCode(e.target.value);
              // Changing the program selects that program's first plan (spec §11.2).
              setPlanCode(demo.programs.find((p) => p.code === e.target.value)?.plans[0]?.code ?? "");
            }}
          >
            {demo.programs.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="demo-plan">Major / specialisation</label>
          <select id="demo-plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="button" disabled={busy}>
          {pending === "settings" ? "Applying…" : "Apply"}
        </button>
        <button type="button" className="button button--quiet" disabled={busy} onClick={() => onReset(programCode)}>
          {pending === "reset" ? "Resetting…" : `Reset to ${programCode} demo student`}
        </button>
      </form>
      <InlineNotices notices={result} />
    </section>
  );
}
