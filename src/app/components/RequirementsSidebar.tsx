import { useEffect, useState } from "react";
import type { CourseStatusView, GroupState, Icon, RequirementsView } from "../../lib/types";
import { catalogueLink } from "../url";

// "Your requirements" (spec §6.5, F5). Status is carried by text; the icons
// are decorative.

const ICON: Record<Icon, string> = { done: "✓", enrolled: "●", partial: "◐", todo: "○", none: "–" };
const STATE: Record<GroupState, string> = { met: "Met", "in-progress": "In progress", "not-met": "Not met" };

interface Props {
  requirements: RequirementsView;
  browseSession: string;
  busy: boolean;
  pending: string | null;
  onAdd: (course: CourseStatusView) => void;
  onBrowse: (code: string) => void;
}

function Courses({ courses, browseSession, busy, pending, onAdd, onBrowse }: Omit<Props, "requirements"> & { courses: CourseStatusView[] }) {
  return (
    <ul className="req-courses">
      {courses.map((c) => (
        <li key={c.code} className={`req-course req-course--${c.icon}`} data-course={c.code}>
          <span className="req-course__icon" aria-hidden="true">
            {ICON[c.icon]}
          </span>
          <span className="req-course__name">
            <a
              href={catalogueLink(c.code, browseSession)}
              onClick={(e) => {
                e.preventDefault();
                onBrowse(c.code);
              }}
            >
              {c.code}
            </a>
            {c.times > 1 && <span className="req-course__times"> ×{c.times}</span>}
            <span className="req-course__title"> {c.title}</span>
          </span>
          <span className="req-course__status">{c.text}</span>
          {c.add && (
            <button type="button" className="button button--small" disabled={busy} onClick={() => onAdd(c)}>
              {pending === `req:${c.code}` ? "Adding…" : c.add.label}
              <span className="visually-hidden"> ({c.code})</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function RequirementsSidebar({ requirements: req, ...rest }: Props) {
  const [open, setOpen] = useState(true);
  // Collapsed on phones (spec §6.1). This runs after hydration, so the server's HTML and the first client render agree.
  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 959px)").matches) setOpen(false);
  }, []);
  const s = req.summary;
  return (
    <aside className="requirements" aria-labelledby="requirements-heading">
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="requirements__summary">
          <h2 id="requirements-heading">Your requirements</h2>
          <span className="requirements__tally">
            Tracked: {s.done} of {s.total} units done · {s.enrolled} enrolled
          </span>
        </summary>
        <p className="requirements__who">
          {req.programName}{" "}
          <a href={req.programUrl} className="pc-link">
            P&amp;C<span className="visually-hidden"> page for {req.programName}</span>
          </a>
          {req.planName && req.planUrl && (
            <>
              {" "}
              · {req.planName}{" "}
              <a href={req.planUrl} className="pc-link">
                P&amp;C<span className="visually-hidden"> page for {req.planName}</span>
              </a>
            </>
          )}
        </p>
        {req.blocks.map((block) => (
          <div key={block.source} className="req-block">
            <h3>{block.title}</h3>
            {block.groups.map((g) => (
              <div key={g.id} className="req-group">
                <p className="req-group__rule">
                  <strong>{g.label}</strong> · <span className={`state state--${g.state}`}>{STATE[g.state]}</span>
                </p>
                <p className="req-group__text">{g.text}</p>
                <Courses courses={g.courses} {...rest} />
              </div>
            ))}
          </div>
        ))}
        {req.notes.length > 0 && (
          <details className="requirements__notes">
            <summary>Other rules, not tracked ({req.notes.length})</summary>
            {req.notes.map((n) => (
              <div key={n.id} className="req-note">
                {n.text.split("\n").map((line, i) => (
                  <p key={`${n.id}:${i}`}>{line}</p>
                ))}
                {n.courses.length > 0 && <Courses courses={n.courses} {...rest} />}
              </div>
            ))}
          </details>
        )}
      </details>
    </aside>
  );
}
