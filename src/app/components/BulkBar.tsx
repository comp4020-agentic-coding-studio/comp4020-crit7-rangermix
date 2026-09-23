interface Props {
  count: number;
  sessionName: string;
  busy: boolean;
  pending: boolean;
  onAdd: () => void;
}

// The sticky bar that appears once anything is selected (spec §6.4).
export function BulkBar({ count, sessionName, busy, pending, onAdd }: Props) {
  if (count === 0) return null;
  return (
    <div className="bulkbar">
      <button type="button" className="button" disabled={busy} onClick={onAdd}>
        {pending ? "Adding…" : `Add ${count} selected class${count === 1 ? "" : "es"} to ${sessionName}`}
      </button>
    </div>
  );
}
