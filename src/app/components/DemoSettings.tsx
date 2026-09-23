import { useEffect, useState } from "react";
import { fmtDate } from "../../lib/format";
import type { DemoView } from "../../lib/types";

interface Props {
  demo: DemoView;
  busy: boolean;
  pending: string | null;
  onApply: (settings: { today: string | null }) => void;
}

// M2's demo settings bar (spec §11.2): crit scaffolding, labelled as not part
// of the redesign. A named region with no heading, so the page keeps one h1.
export function DemoSettings({ demo, busy, pending, onApply }: Props) {
  const [date, setDate] = useState(demo.today);
  useEffect(() => setDate(demo.today), [demo.today]);
  return (
    <section className="demo-bar" aria-label="Demo settings">
      <p className="demo-bar__label">Demo settings — not part of the redesign</p>
      <form
        className="demo-bar__form"
        onSubmit={(e) => {
          e.preventDefault();
          onApply({ today: date });
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
        <button type="submit" className="button" disabled={busy}>
          {pending === "settings" ? "Applying…" : "Apply"}
        </button>
      </form>
    </section>
  );
}
