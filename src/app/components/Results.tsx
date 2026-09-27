import type { MouseEvent } from "react";
import { fmtRange } from "../../lib/format";
import { caption, type SearchResult } from "../../lib/search";
import type { Catalogue, Filters, View } from "../../lib/types";

interface Props {
  result: SearchResult;
  data: Catalogue;
  filters: Filters;
  view: View;
  selected: Set<number>;
  onSelect: (classNumber: number, on: boolean) => void;
  hrefFor: (filters: Filters) => string;
  onNavigate: (filters: Filters) => void;
}

const SORTS = { code: "Course", title: "Title", level: "Level" } as const;

// The results table (spec §6.4, §7). Sort and paging are real links that
// keep the current filters and add none; the client follows them in place.
export function Results({ result, data, filters, view, selected, onSelect, hrefFor, onNavigate }: Props) {
  const required = new Set(view.requiredCodes);
  const go = (next: Filters) => (e: MouseEvent) => {
    e.preventDefault();
    onNavigate(next);
  };
  const sortHeader = (key: keyof typeof SORTS) => {
    const next: Filters = { ...filters, sort: key, page: 1 };
    return (
      <th scope="col" aria-sort={filters.sort === key ? "ascending" : undefined}>
        <a href={hrefFor(next)} onClick={go(next)}>
          {SORTS[key]}
        </a>
      </th>
    );
  };
  const page = (n: number): Filters => ({ ...filters, page: n });
  return (
    <>
      <div className="results" role="region" aria-label="Class results" tabIndex={0}>
        <table>
          <caption>{caption(result.total, data.sessionName, filters)}</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Select</span>
              </th>
              <th scope="col">Class</th>
              {sortHeader("code")}
              {sortHeader("title")}
              <th scope="col">Career</th>
              {sortHeader("level")}
              <th scope="col">Units</th>
              <th scope="col">Mode</th>
              <th scope="col">Dates</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((c) => {
              const mark = view.marks[c.courseCode];
              const enrolledHere = mark?.enrolledIn.includes(data.sessionId) ?? false;
              const blocked = !c.canAdd || Boolean(mark?.completed) || enrolledHere;
              return (
                <tr key={c.classNumber} data-class={c.classNumber}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(c.classNumber) && !blocked}
                      disabled={blocked}
                      onChange={(e) => onSelect(c.classNumber, e.target.checked)}
                      aria-label={`Select ${c.courseCode} class ${c.classNumber}, ${c.mode}`}
                    />
                  </td>
                  <td>{c.classNumber}</td>
                  <td>
                    <a href={c.pcUrl}>{c.courseCode}</a>
                  </td>
                  <td>
                    {c.title}
                    {c.topic && <span className="topic"> — {c.topic}</span>}{" "}
                    <span className="tags">
                      {required.has(c.courseCode) && <span className="tag tag--required">Required</span>}
                      {mark?.completed && <span className="tag">{mark.completed}</span>}
                      {!mark?.completed && enrolledHere && <span className="tag">Enrolled</span>}
                      {!c.canAdd && <span className="tag">Adding closed</span>}
                      {c.permission && (
                        <span className="tag tag--permission" title={c.permission}>
                          Permission code
                        </span>
                      )}
                      {data.indicative && <span className="tag tag--quiet">Indicative</span>}
                    </span>
                  </td>
                  <td>{c.career}</td>
                  <td>{c.level}</td>
                  <td>{c.units}</td>
                  <td>{c.mode}</td>
                  <td>{fmtRange(c.startDate, c.endDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {result.pages > 1 && (
        <nav className="pager" aria-label="Result pages">
          {result.page > 1 && (
            <a href={hrefFor(page(result.page - 1))} onClick={go(page(result.page - 1))}>
              Previous page
            </a>
          )}
          <span>
            Page {result.page} of {result.pages}
          </span>
          {result.page < result.pages && (
            <a href={hrefFor(page(result.page + 1))} onClick={go(page(result.page + 1))}>
              Next page
            </a>
          )}
        </nav>
      )}
    </>
  );
}
