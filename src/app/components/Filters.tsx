import type { Facets, Filters as FilterState } from "../../lib/types";
import { EMPTY_FILTERS } from "../url";

interface Props {
  filters: FilterState;
  facets: Facets;
  onChange: (filters: FilterState) => void;
}

// Every filter is optional and applies as the user types (spec §6.4).
export function Filters({ filters, facets, onChange }: Props) {
  const set = (patch: Partial<FilterState>): void => onChange({ ...filters, ...patch, page: 1 });
  const text = (key: "q" | "title" | "code" | "class", label: string, type = "text") => (
    <div className="field">
      <label htmlFor={`filter-${key}`}>{label}</label>
      <input
        id={`filter-${key}`}
        type={type}
        autoComplete="off"
        inputMode={key === "class" ? "numeric" : undefined}
        value={filters[key]}
        onChange={(e) => set({ [key]: e.target.value } as Partial<FilterState>)}
      />
    </div>
  );
  const select = (key: "subject" | "career" | "level" | "mode", label: string, options: { value: string; label: string }[]) => (
    <div className="field">
      <label htmlFor={`filter-${key}`}>{label}</label>
      <select id={`filter-${key}`} value={filters[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<FilterState>)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="filters" role="search" aria-label="Filter classes">
      {text("q", "Search", "search")}
      {text("title", "Title contains")}
      {text("code", "Course code")}
      {text("class", "Class number")}
      {select(
        "subject",
        "Subject area",
        facets.subjects.map((s) => ({ value: s.code, label: `${s.code} ${s.name}` })),
      )}
      {select(
        "career",
        "Academic career",
        facets.careers.map((c) => ({ value: c, label: c })),
      )}
      {select(
        "level",
        "Level",
        facets.levels.map((l) => ({ value: String(l), label: String(l) })),
      )}
      {select(
        "mode",
        "Mode of delivery",
        facets.modes.map((m) => ({ value: m, label: m })),
      )}
      <button type="button" className="button button--quiet" onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}>
        Clear filters
      </button>
    </div>
  );
}
