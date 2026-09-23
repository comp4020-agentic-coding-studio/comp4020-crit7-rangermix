import { useEffect, useMemo, useState } from "react";
import { caption, search } from "../../lib/search";
import type { Catalogue as CatalogueData, Filters as FilterState, View } from "../../lib/types";
import { BulkBar } from "./BulkBar";
import { Filters } from "./Filters";
import { Results } from "./Results";

interface Props {
  view: View;
  /** The catalogue's session; null while the section is collapsed. */
  browse: string | null;
  defaultSession: string;
  filters: FilterState;
  data: CatalogueData | null;
  loading: boolean;
  failed: boolean;
  busy: boolean;
  pending: string | null;
  hrefFor: (filters: FilterState) => string;
  onOpen: (open: boolean) => void;
  onSession: (sessionId: string) => void;
  onFilters: (filters: FilterState) => void;
  onRetry: () => void;
  onAdd: (sessionId: string, classNumbers: number[]) => Promise<boolean>;
}

function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

// "Browse classes" (spec §6.4, F2): a collapsed section with its own session.
export function Catalogue(props: Props) {
  const { view, browse, filters, data } = props;
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new session starts with nothing selected
  useEffect(() => setSelected(new Set()), [browse]);
  const result = useMemo(() => (data ? search(data.classes, filters) : null), [data, filters]);
  // The count is announced politely once typing pauses (spec §6.4).
  const announced = useSettled(data && result ? caption(result.total, data.sessionName, filters) : "", 500);
  const picked = result ? result.rows.filter((r) => selected.has(r.classNumber)).map((r) => r.classNumber) : [];
  const open = browse !== null;
  return (
    <section className="browse" id="browse" aria-labelledby="browse-heading">
      <details
        open={open}
        onToggle={(e) => {
          const isOpen = e.currentTarget.open;
          if (isOpen !== open) props.onOpen(isOpen);
        }}
      >
        <summary>
          <h2 id="browse-heading">Browse classes</h2>
        </summary>
        <p className="browse__scope">All COMP classes, plus courses named in the five programs' requirements.</p>
        <div className="field browse__session">
          <label htmlFor="browse-session">Session</label>
          <select id="browse-session" value={browse ?? props.defaultSession} onChange={(e) => props.onSession(e.target.value)}>
            {view.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {props.loading && !data && <p role="status">Loading classes…</p>}
        {props.failed && !data && (
          <p className="browse__failed">
            Couldn't load the classes.{" "}
            <button type="button" className="button button--small" onClick={props.onRetry}>
              Try again
            </button>
          </p>
        )}
        {data && result && (
          <>
            <Filters filters={filters} facets={data.facets} onChange={props.onFilters} />
            <p className="visually-hidden" aria-live="polite">
              {announced}
            </p>
            <Results
              result={result}
              data={data}
              filters={filters}
              view={view}
              selected={selected}
              onSelect={(n, on) =>
                setSelected((s) => {
                  const next = new Set(s);
                  if (on) next.add(n);
                  else next.delete(n);
                  return next;
                })
              }
              hrefFor={props.hrefFor}
              onNavigate={props.onFilters}
            />
            <BulkBar
              count={picked.length}
              sessionName={data.sessionName}
              busy={props.busy}
              pending={props.pending === "bulk"}
              onAdd={async () => {
                if (await props.onAdd(data.sessionId, picked)) setSelected(new Set());
              }}
            />
          </>
        )}
      </details>
    </section>
  );
}
