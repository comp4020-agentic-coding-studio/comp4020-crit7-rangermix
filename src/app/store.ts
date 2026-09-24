import { useMemo, useReducer, useRef } from "react";
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
  | { type: "written"; view: View; notices: Notice[] }
  | { type: "view"; view: View }
  | { type: "notices"; notices: Notice[] }
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
    pending: null,
    chooser: props.chooser,
    entryErrors: {},
    catalogues: props.catalogue ? { [props.catalogue.sessionId]: props.catalogue } : {},
    loadingCatalogue: null,
    catalogueFailed: null,
  };
}

/** A view for another date makes cached catalogues stale, because their canAdd was computed for the old date. */
const keepCatalogues = (state: AppState, view: View): Record<string, Catalogue> => (view.today === state.view.today ? state.catalogues : {});

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
      return { ...state, pending: action.key };
    case "written":
      return { ...state, view: action.view, notices: action.notices, catalogues: keepCatalogues(state, action.view) };
    case "view":
      return { ...state, view: action.view, catalogues: keepCatalogues(state, action.view) };
    case "notices":
      return { ...state, notices: action.notices };
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

/** One notice per class, then its warning, if any (spec §6.3). */
export function outcomeNotices(outcomes: Outcome[]): Notice[] {
  return outcomes.flatMap((o): Notice[] => [{ tone: o.ok ? "ok" : "error", text: o.message }, ...(o.warning ? [{ tone: "warning" as const, text: o.warning }] : [])]);
}

export function useEnrolment(props: AppProps) {
  const [state, dispatch] = useReducer(reducer, props, init);
  const latest = useRef(state);
  latest.current = state;
  const noticesRef = useRef<HTMLElement | null>(null);

  const actions = useMemo(() => {
    // After a write, focus moves to the notices, which list one outcome per class (spec §6.6).
    const focusNotices = (): void => noticesRef.current?.focus();
    const failed = (message: string): void => {
      dispatch({ type: "notices", notices: [{ tone: "error", text: message }] });
      focusNotices();
    };
    const written = (data: WriteResponse): void => {
      dispatch({ type: "written", view: data.view, notices: outcomeNotices(data.outcomes) });
      focusNotices();
    };
    /** Runs one write. Writes are serialised: while one is in flight, another click does nothing (spec §6.6). */
    async function write<T>(key: string, call: () => Promise<api.ApiResult<T>>): Promise<api.ApiResult<T> | null> {
      if (latest.current.pending !== null) return null;
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
            failed(r.message);
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
        written(r.data);
        return "enrolled";
      },

      async enrolClasses(sessionId: string, classNumbers: number[], key: string): Promise<boolean> {
        const r = await write(key, () => api.enrolClasses(sessionId, classNumbers));
        if (!r) return false;
        if (!r.ok) {
          failed(r.message);
          return false;
        }
        if (key.startsWith("choose:")) closeChooser();
        written(r.data);
        return true;
      },

      async drop(sessionId: string, classNumber: number): Promise<void> {
        const r = await write(`drop:${sessionId}:${classNumber}`, () => api.dropClass(sessionId, classNumber));
        if (r?.ok) written(r.data);
        else if (r) failed(r.message);
      },

      async reset(programCode?: string): Promise<void> {
        const r = await write("reset", () => api.resetDemo(programCode));
        if (r?.ok) {
          closeChooser();
          written(r.data);
        } else if (r) {
          failed(r.message);
        }
      },

      async applySettings(settings: { today?: string | null; programCode?: string; planCode?: string }): Promise<void> {
        const r = await write("settings", () => api.saveSettings(settings));
        if (r?.ok) {
          closeChooser();
          written(r.data);
        } else if (r) {
          failed(r.message);
        }
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

  return { state, actions, noticesRef };
}
