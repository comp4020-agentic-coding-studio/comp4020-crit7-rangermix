import type { Ref } from "react";
import type { Notice } from "../../lib/types";

// The notices region (spec §6.3, §7): polite live announcements, and
// focusable, so focus can move here after a write.
export function Notices({ notices, ref }: { notices: Notice[]; ref: Ref<HTMLElement> }) {
  return (
    <section ref={ref} className="notices" aria-label="Notices" aria-live="polite" tabIndex={-1}>
      {notices.length > 0 && (
        <ul>
          {notices.map((n, i) => (
            <li key={`${i}:${n.text}`} className={`notice notice--${n.tone}`}>
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
