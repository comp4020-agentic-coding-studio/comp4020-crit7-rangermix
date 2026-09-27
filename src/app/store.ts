import { useEffect, useMemo, useReducer, useRef } from "react";
import { PERMISSION_CODES_URL } from "../lib/links";
import type { AppProps, Catalogue, Chooser, Notice, Outcome, UrlState, View, WriteResponse } from "../lib/types";
import * as api from "./api";
import { EMPTY_FILTERS, openSessions } from "./url";

// The client's state (spec §4.3): the server's view, the URL state, the
// write in flight and the notices. Writes wait for the server, with no
// optimistic updates (spec §6.6), and each successful write replaces the
// view with the one the server returns.

export interface AppState {
  view: View;
  url: UrlState;
  notices: Notice[];
  /** Counts results, so the notices region announces a repeated message again (spec §15.3). */
  seq: number;
  /** The last write's outcome, shown beside the control that made it (spec §15.3); cleared when the next write starts. */
  result: { key: string; notices: Notice[] } | null;
  /** The control whose write is in flight ("add:2027-S1", "choose:2027-S1", "drop:2027-S1:5354", "req:COMP8800", "bulk", "reset"); null when idle. */
  pending: string | null;
  chooser: Chooser | null;
  /** Per session, the message under its "Class number or course code" input. */
  entryErrors: Record<string, string>;
  /** Catalogues fetched this visit, by session (spec §6.4). */
  catalogues: Record<string, Catalogue>;
  loadingCatalogue: string | null;
  catalogueFailed: string | null;
}

export type Action =
  | { type: "url"; patch: Partial<UrlState> }
  | { type: "toggleSession"; sessionId: string; open: boolean }
  | { type: "pending"; key: string | null }
  | { type: "written"; view: View; notices: Notice[]; key: string }
  | { type: "view"; view: View }
  | { type: "notices"; notices: Notice[]; key: string }
  | { type: "dismissResult" }
  | { type: "chooser"; chooser: Chooser | null }
  | { type: "entryError"; sessionId: string; message: string | null }
  | { type: "loadingCatalogue"; sessionId: string }
  | { type: "catalogue"; catalogue: Catalogue }
  | { type: "catalogueFailed"; sessionId: string | null };

export function init(props: AppProps): AppState {
  return {
    view: props.view,
    url: props.url,
    notices: props.notices,
    seq: 0,
    result: null,
    pending: null,
    chooser: props.chooser,
    entryErrors: {},
    catalogues: props.catalogue ? { [props.catalogue.sessionId]: props.catalogue } : {},
    loadingCatalogue: null,
    catalogueFailed: null,
  };
}

/** A view for another date or student makes cached catalogues stale: their canAdd and permission notes were computed for the old ones. */
const keepCatalogues = (state: AppState, view: View): Record<string, Catalogue> =>
  view.today === state.view.today && view.student.uid === state.view.student.uid && view.student.programCode === state.view.student.programCode ? state.catalogues : {};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "url": {
      const url = { ...state.url, ...action.patch };
      return { ...state, url, catalogueFailed: url.browse === state.url.browse ? state.catalogueFailed : null };
    }
    case "toggleSession": {
      const open = openSessions(state.url, state.view.nextSemesterId);
      const next = action.open ? [...new Set([...open, action.sessionId])] : open.filter((id) => id !== action.sessionId);
      return { ...state, url: { ...state.url, open: next } };
    }
    case "pending":
      return { ...state, pending: action.key, result: action.key === null ? state.result : null };
    case "written":
      return {
        ...state,
        view: action.view,
        notices: action.notices,
        seq: state.seq + 1,
        result: { key: action.key, notices: action.notices },
        catalogues: keepCatalogues(state, action.view),
      };
    case "view":
      return { ...state, view: action.view, catalogues: keepCatalogues(state, action.view) };
    case "notices":
      return { ...state, notices: action.notices, seq: state.seq + 1, result: { key: action.key, notices: action.notices } };
    case "dismissResult":
      return { ...state, result: null };
    case "chooser":
      return { ...state, chooser: action.chooser };
    case "entryError": {
      const entryErrors = { ...state.entryErrors };
      if (action.message) entryErrors[action.sessionId] = action.message;
      else delete entryErrors[action.sessionId];
      return { ...state, entryErrors };
    }
    case "loadingCatalogue":
      return { ...state, loadingCatalogue: action.sessionId };
    case "catalogue":
      return { ...state, catalogues: { ...state.catalogues, [action.catalogue.sessionId]: action.catalogue }, loadingCatalogue: null };
    case "catalogueFailed":
      return { ...state, catalogueFailed: action.sessionId, loadingCatalogue: null };
  }
}

/** One notice per class, then its warning and permission-code note, if any (spec §6.3, §15.5). */
export function outcomeNotices(outcomes: Outcome[]): Notice[] {
  return outcomes.flatMap((o): Notice[] => [
    { tone: o.ok ? "ok" : "error", text: o.message },
    ...(o.warning ? [{ tone: "warning" as const, text: o.warning }] : []),
    ...(o.permission ? [{ tone: "info" as const, text: o.permission, link: { href: PERMISSION_CODES_URL, text: "How to get a permission code" } }] : []),
  ]);
}

/**
 * Where focus goes when the control that made a write is gone (spec §15.3): the add input for an
 * add or a chooser, the course's link for a sidebar add, the bulk bar's Dismiss, and the class
 * row (or, if the drop removed it, the add input) for a drop.
 */
function placeFor(key: string): HTMLElement | null {
  const [kind, a, b] = key.split(":");
  const q = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);
  const entry = (): HTMLElement | null => document.getElementById(`entry-${a}`) ?? q(`details[data-session="${a}"] > summary`);
  switch (kind) {
    case "add":
    case "choose":
      return entry();
    case "req":
      return q(`[data-course="${a}"] a`);
    case "drop":
      return q(`details[data-session="${a}"] details[data-class="${b}"] > summary`) ?? entry();
    case "bulk":
      return document.getElementById("bulk-dismiss");
    default:
      return null;
  }
}

export function useEnrolment(props: AppProps) {
  const [state, dispatch] = useReducer(reducer, props, init);
  const latest = useRef(state);
  latest.current = state;
  /** The write in flight and the control that started it, so focus can come back to it (spec §15.3). */
  const place = useRef<{ key: string; origin: HTMLElement | null } | null>(null);

  // After a write the student keeps their place (spec §15.3): focus returns to the control they
  // used, or, when the result removed it, to what replaced it. It never jumps to the notices,
  // which announce the outcome politely; the outcome also shows beside the control.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per result
  useEffect(() => {
    const was = place.current;
    if (!was) return;
    place.current = null;
    // A tick later, so updates that follow the result (a cleared selection) have rendered too.
    const id = setTimeout(() => {
      const origin = was.origin;
      const kept = origin?.isConnected && !(origin instanceof HTMLButtonElement && origin.disabled);
      (kept ? origin : placeFor(was.key))?.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(id);
  }, [state.seq]);

  const actions = useMemo(() => {
    const failed = (message: string, key: string): void => dispatch({ type: "notices", notices: [{ tone: "error", text: message }], key });
    const written = (data: WriteResponse, key: string): void => dispatch({ type: "written", view: data.view, notices: outcomeNotices(data.outcomes), key });
    /** Runs one write. Writes are serialised: while one is in flight, another click does nothing (spec §6.6). */
    async function write<T>(key: string, call: () => Promise<api.ApiResult<T>>): Promise<api.ApiResult<T> | null> {
      if (latest.current.pending !== null) return null;
      place.current = { key, origin: document.activeElement instanceof HTMLElement ? document.activeElement : null };
      latest.current = { ...latest.current, pending: key };
      dispatch({ type: "pending", key });
      try {
        return await call();
      } finally {
        dispatch({ type: "pending", key: null });
      }
    }
    const closeChooser = (): void => {
      dispatch({ type: "chooser", chooser: null });
      dispatch({ type: "url", patch: { choose: null, term: null } });
    };

    return {
      setUrl(patch: Partial<UrlState>): void {
        dispatch({ type: "url", patch });
      },
      toggleSession(sessionId: string, open: boolean): void {
        dispatch({ type: "toggleSession", sessionId, open });
      },

      /** Add by class number or course code (F1). Resolves to what happened, so the input knows whether to clear. */
      async enrolEntry(sessionId: string, entry: string, key = `add:${sessionId}`): Promise<"enrolled" | "choose" | "error"> {
        dispatch({ type: "entryError", sessionId, message: null });
        const r = await write(key, () => api.enrolEntry(sessionId, entry));
        if (!r) return "error";
        if (!r.ok) {
          if (r.status === 422 && key.startsWith("add:")) {
            dispatch({ type: "entryError", sessionId, message: r.message });
            // Back to the field, so it's read with the problem: the Add button was disabled mid-request (spec §6.6).
            setTimeout(() => document.getElementById(`entry-${sessionId}`)?.focus(), 0);
          } else {
            failed(r.message, key);
          }
          return "error";
        }
        if ("choose" in r.data) {
          const { choose } = r.data;
          dispatch({ type: "chooser", chooser: choose });
          dispatch({ type: "toggleSession", sessionId: choose.sessionId, open: true });
          dispatch({ type: "url", patch: { choose: choose.course.code, term: choose.sessionId } });
          return "choose";
        }
        written(r.data, key);
        return "enrolled";
      },

      async enrolClasses(sessionId: string, classNumbers: number[], key: string): Promise<boolean> {
        const r = await write(key, () => api.enrolClasses(sessionId, classNumbers));
        if (!r) return false;
        if (!r.ok) {
          failed(r.message, key);
          return false;
        }
        if (key.startsWith("choose:")) closeChooser();
        written(r.data, key);
        return true;
      },

      async drop(sessionId: string, classNumber: number): Promise<void> {
        const key = `drop:${sessionId}:${classNumber}`;
        const r = await write(key, () => api.dropClass(sessionId, classNumber));
        if (r?.ok) written(r.data, key);
        else if (r) failed(r.message, key);
      },

      async reset(programCode?: string): Promise<void> {
        const r = await write("reset", () => api.resetDemo(programCode));
        if (r?.ok) {
          closeChooser();
          written(r.data, "reset");
        } else if (r) {
          failed(r.message, "reset");
        }
      },

      async applySettings(settings: { today?: string | null; programCode?: string; planCode?: string }): Promise<void> {
        const r = await write("settings", () => api.saveSettings(settings));
        if (r?.ok) {
          closeChooser();
          written(r.data, "settings");
        } else if (r) {
          failed(r.message, "settings");
        }
      },

      /** The bulk bar's Dismiss (spec §15.3). */
      dismissResult(): void {
        dispatch({ type: "dismissResult" });
      },

      /** Cancel returns focus to the session's input (spec §6.6). */
      cancelChooser(): void {
        const sessionId = latest.current.chooser?.sessionId;
        closeChooser();
        if (sessionId) setTimeout(() => document.getElementById(`entry-${sessionId}`)?.focus(), 0);
      },

      /** A stale tab catches up when it's shown again (spec §6.6). */
      async refresh(): Promise<void> {
        if (latest.current.pending !== null) return;
        const r = await api.getView();
        if (r.ok && latest.current.pending === null) dispatch({ type: "view", view: r.data });
      },

      openCatalogue(sessionId: string): void {
        dispatch({ type: "url", patch: { browse: sessionId, filters: { ...latest.current.url.filters, page: 1 } } });
      },

      /** The sidebar's course link, handled in place: the catalogue filtered to that code (spec §6.5). */
      browseCode(code: string, sessionId: string): void {
        dispatch({ type: "url", patch: { browse: sessionId, filters: { ...EMPTY_FILTERS, code } } });
        setTimeout(() => document.getElementById("browse")?.scrollIntoView?.({ block: "start" }), 0);
      },

      async loadCatalogue(sessionId: string): Promise<void> {
        if (latest.current.loadingCatalogue === sessionId) return;
        latest.current = { ...latest.current, loadingCatalogue: sessionId };
        dispatch({ type: "loadingCatalogue", sessionId });
        const r = await api.getCatalogue(sessionId);
        if (r.ok) dispatch({ type: "catalogue", catalogue: r.data });
        else dispatch({ type: "catalogueFailed", sessionId });
      },

      retryCatalogue(): void {
        dispatch({ type: "catalogueFailed", sessionId: null });
      },
    };
  }, []);

  return { state, actions };
}
