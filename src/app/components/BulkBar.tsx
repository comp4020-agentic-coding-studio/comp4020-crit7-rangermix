import type { Notice } from "../../lib/types";
import { InlineNotices } from "./Notices";

interface Props {
  count: number;
  sessionName: string;
  busy: boolean;
  pending: boolean;
  /** The last bulk add's outcome, shown here until the next selection or Dismiss (spec §15.3). */
  result: Notice[] | null;
  onAdd: () => void;
  onDismiss: () => void;
}

// The sticky bar that appears once anything is selected (spec §6.4). After a
// bulk add it shows the outcome where the student is, instead of the page
// jumping to the notices (spec §15.3).
export function BulkBar({ count, sessionName, busy, pending, result, onAdd, onDismiss }: Props) {
  if (count === 0 && !result) return null;
  return (
    <div className="bulkbar">
      {count > 0 ? (
        <button type="button" className="button" disabled={busy} onClick={onAdd}>
          {pending ? "Adding…" : `Add ${count} selected class${count === 1 ? "" : "es"} to ${sessionName}`}
        </button>
      ) : (
        <div className="bulkbar__result">
          <InlineNotices notices={result} />
          <button id="bulk-dismiss" type="button" className="button button--quiet button--small" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
