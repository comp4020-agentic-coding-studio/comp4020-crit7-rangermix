import { useState } from "react";
import type { SessionView } from "../../lib/types";

interface Props {
  session: SessionView;
  error: string | null;
  busy: boolean;
  pending: boolean;
  onSubmit: (entry: string) => Promise<"enrolled" | "choose" | "error">;
}

// F1's one input (spec §6.3). The session is implicit; the server reads the entry.
export function AddClass({ session, error, busy, pending, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const id = `entry-${session.id}`;
  return (
    <form
      className="add"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if ((await onSubmit(value)) === "enrolled") setValue("");
      }}
    >
      <h4 className="add__heading">Add a class</h4>
      <label htmlFor={id}>Class number or course code</label>
      <div className="add__row">
        <input
          id={id}
          name="entry"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
          aria-invalid={error ? true : undefined}
        />
        <button type="submit" className="button" disabled={busy}>
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      <p id={`${id}-hint`} className="hint">
        e.g. 5099 or COMP1100
      </p>
      {error && (
        <p id={`${id}-error`} className="error">
          {error}
        </p>
      )}
    </form>
  );
}
