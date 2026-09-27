import { useEffect, useRef } from "react";
import { fmtDate } from "../lib/format";
import type { AppProps, Notice } from "../lib/types";
import { AddClass } from "./components/AddClass";
import { Catalogue } from "./components/Catalogue";
import { ClassChooser } from "./components/ClassChooser";
import { DemoSettings } from "./components/DemoSettings";
import { EnrolmentDetails } from "./components/EnrolmentDetails";
import { Notices } from "./components/Notices";
import { RequirementsSidebar } from "./components/RequirementsSidebar";
import { SessionList } from "./components/SessionList";
import { SiteNav } from "./components/SiteNav";
import { useEnrolment } from "./store";
import { openSessions, toQuery } from "./url";

/** The fewest milliseconds between two history writes: 5 a second at most, well inside every browser's throttle. */
const URL_WRITE_GAP = 200;

// The whole enrolment page as one React island (spec D13): server-rendered
// with the view, then hydrated. The landmarks are siblings, in the phone
// reading order: header (nav, h1, notices), requirements, sessions and
// browse, footer. CSS moves the requirements to the right at 960px (plan
// clarification 4).
export default function EnrolmentApp(props: AppProps) {
  const { state, actions } = useEnrolment(props);
  // The last write's outcome, for the control that made it (spec §15.3).
  const resultFor = (match: (key: string) => boolean): Notice[] | null => (state.result && match(state.result.key) ? state.result.notices : null);
  const { view, url } = state;
  const busy = state.pending !== null;
  const browseSession = view.nextSemesterId ?? view.sessions[view.sessions.length - 1]?.id ?? "";

  // The URL follows the state, so reload and shared links restore the view (spec §6.6). Typing in a filter
  // changes the state per keystroke and browsers throttle history writes (Safari throws past 100 in 10 s),
  // so writes are spaced (the first at once, a burst folded into one trailing write) and a refused one is ignored.
  const lastUrlWrite = useRef(-URL_WRITE_GAP);
  useEffect(() => {
    const target = `/${toQuery(url, view.nextSemesterId)}`;
    const write = (): void => {
      if (window.location.pathname + window.location.search === target) return;
      lastUrlWrite.current = performance.now();
      try {
        window.history.replaceState(window.history.state, "", target + window.location.hash);
      } catch {
        // Refused by the browser's throttle; the next change writes the URL again.
      }
    };
    const wait = lastUrlWrite.current + URL_WRITE_GAP - performance.now();
    if (wait <= 0) {
      write();
      return;
    }
    const timer = setTimeout(write, wait);
    return () => clearTimeout(timer);
  }, [url, view.nextSemesterId]);

  // A stale tab catches up when it's shown again (spec §6.6).
  useEffect(() => {
    const onShow = (): void => {
      if (document.visibilityState === "visible") void actions.refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [actions]);

  // A session's classes are fetched once per visit, when the catalogue shows that session (spec §6.4).
  useEffect(() => {
    const id = url.browse;
    if (id && !state.catalogues[id] && state.loadingCatalogue !== id && state.catalogueFailed !== id) void actions.loadCatalogue(id);
  }, [url.browse, state.catalogues, state.loadingCatalogue, state.catalogueFailed, actions]);

  return (
    <div className="app">
      {/* The demo bar and the requirements come before the sessions in reading order (phone layout), so keyboard users can skip them. */}
      <a className="skip-link" href="#sessions-heading">
        Skip to sessions
      </a>
      <DemoSettings
        demo={view.demo}
        student={view.student}
        busy={busy}
        pending={state.pending}
        result={resultFor((k) => k === "settings" || k === "reset")}
        onApply={(s) => void actions.applySettings(s)}
        onReset={(code) => void actions.reset(code)}
      />
      <header className="site-header">
        <SiteNav student={view.student} busy={busy} resetPending={state.pending === "reset"} onReset={null} />
        <h1>Enrolment</h1>
        <noscript>
          <p className="noscript">Changes need JavaScript. Without it you can still read your enrolment.</p>
        </noscript>
        <Notices notices={state.notices} seq={state.seq} />
      </header>
      <RequirementsSidebar
        requirements={view.requirements}
        browseSession={browseSession}
        busy={busy}
        pending={state.pending}
        result={state.result}
        onAdd={(c) => {
          if (c.add) void actions.enrolEntry(c.add.sessionId, c.code, `req:${c.code}`);
        }}
        onBrowse={(code) => actions.browseCode(code, browseSession)}
      />
      <main className="primary">
        <SessionList
          sessions={view.sessions}
          nextSemesterId={view.nextSemesterId}
          open={openSessions(url, view.nextSemesterId)}
          onToggle={actions.toggleSession}
          renderDetails={(s) => (
            <EnrolmentDetails
              session={s}
              busy={busy}
              pending={state.pending}
              result={resultFor((k) => k.startsWith(`drop:${s.id}:`))}
              onDrop={(e) => void actions.drop(e.sessionId, e.classNumber)}
            >
              {state.chooser?.sessionId === s.id ? (
                <ClassChooser
                  // A new course's chooser starts with nothing picked.
                  key={`${state.chooser.sessionId}:${state.chooser.course.code}`}
                  chooser={state.chooser}
                  busy={busy}
                  pending={state.pending === `choose:${s.id}`}
                  result={resultFor((k) => k === `choose:${s.id}`)}
                  onAdd={(classNumbers) => void actions.enrolClasses(s.id, classNumbers, `choose:${s.id}`)}
                  onCancel={actions.cancelChooser}
                />
              ) : s.add.open ? (
                <AddClass
                  session={s}
                  error={state.entryErrors[s.id] ?? null}
                  busy={busy}
                  pending={state.pending === `add:${s.id}`}
                  result={resultFor((k) => k === `add:${s.id}` || k === `choose:${s.id}`)}
                  onSubmit={(entry) => actions.enrolEntry(s.id, entry)}
                />
              ) : (
                <p className="add__closed">{s.add.reason}</p>
              )}
            </EnrolmentDetails>
          )}
        />
        <Catalogue
          view={view}
          browse={url.browse}
          defaultSession={browseSession}
          filters={url.filters}
          data={url.browse ? (state.catalogues[url.browse] ?? null) : null}
          loading={state.loadingCatalogue !== null}
          failed={url.browse !== null && state.catalogueFailed === url.browse}
          busy={busy}
          pending={state.pending}
          hrefFor={(filters) => `/${toQuery({ ...url, browse: url.browse ?? browseSession, filters }, view.nextSemesterId)}`}
          onOpen={(isOpen) => (isOpen ? actions.openCatalogue(url.browse ?? browseSession) : actions.setUrl({ browse: null }))}
          onSession={actions.openCatalogue}
          onFilters={(filters) => actions.setUrl({ filters })}
          onRetry={actions.retryCatalogue}
          onAdd={(sessionId, classNumbers) => actions.enrolClasses(sessionId, classNumbers, "bulk")}
          result={resultFor((k) => k === "bulk")}
          onDismiss={actions.dismissResult}
        />
      </main>
      <footer className="site-footer">
        <p>
          Course data from <a href="https://programsandcourses.anu.edu.au/">Programs &amp; Courses</a>, snapshot {fmtDate(view.snapshotDate)}; session dates from the ANU university
          calendar. A COMP4020 student prototype, not an ANU service. <a href="/readme/">About this prototype</a>.
        </p>
      </footer>
    </div>
  );
}
