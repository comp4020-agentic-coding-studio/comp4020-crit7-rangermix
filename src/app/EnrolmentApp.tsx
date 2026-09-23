import { useEffect } from "react";
import { fmtDate } from "../lib/format";
import type { AppProps } from "../lib/types";
import { AddClass } from "./components/AddClass";
import { ClassChooser } from "./components/ClassChooser";
import { EnrolmentDetails } from "./components/EnrolmentDetails";
import { Notices } from "./components/Notices";
import { RequirementsSidebar } from "./components/RequirementsSidebar";
import { SessionList } from "./components/SessionList";
import { SiteNav } from "./components/SiteNav";
import { useEnrolment } from "./store";
import { openSessions, toQuery } from "./url";

// The whole enrolment page as one React island (spec D13): server-rendered
// with the view, then hydrated. The landmarks are siblings, in the phone
// reading order: header (nav, h1, notices), requirements, sessions and
// browse, footer. CSS moves the requirements to the right at 960px (plan
// clarification 4).
export default function EnrolmentApp(props: AppProps) {
  const { state, actions, noticesRef } = useEnrolment(props);
  const { view, url } = state;
  const busy = state.pending !== null;
  const browseSession = view.nextSemesterId ?? view.sessions[view.sessions.length - 1]?.id ?? "";

  // The URL follows the state, so reload and shared links restore the view (spec §6.6).
  useEffect(() => {
    const target = `/${toQuery(url, view.nextSemesterId)}`;
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState(window.history.state, "", target + window.location.hash);
    }
  }, [url, view.nextSemesterId]);

  // A stale tab catches up when it's shown again (spec §6.6).
  useEffect(() => {
    const onShow = (): void => {
      if (document.visibilityState === "visible") void actions.refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [actions]);

  return (
    <div className="app">
      <header className="site-header">
        <SiteNav student={view.student} busy={busy} resetPending={state.pending === "reset"} onReset={() => void actions.reset()} />
        <h1>Enrolment</h1>
        <noscript>
          <p className="noscript">Changes need JavaScript. Without it you can still read your enrolment.</p>
        </noscript>
        <Notices ref={noticesRef} notices={state.notices} />
      </header>
      <RequirementsSidebar
        requirements={view.requirements}
        browseSession={browseSession}
        busy={busy}
        pending={state.pending}
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
            <EnrolmentDetails session={s} busy={busy} pending={state.pending} onDrop={(e) => void actions.drop(e.sessionId, e.classNumber)}>
              {state.chooser?.sessionId === s.id ? (
                <ClassChooser
                  chooser={state.chooser}
                  busy={busy}
                  pending={state.pending === `choose:${s.id}`}
                  onAdd={(classNumbers) => void actions.enrolClasses(s.id, classNumbers, `choose:${s.id}`)}
                  onCancel={actions.cancelChooser}
                />
              ) : s.add.open ? (
                <AddClass session={s} error={state.entryErrors[s.id] ?? null} busy={busy} pending={state.pending === `add:${s.id}`} onSubmit={(entry) => actions.enrolEntry(s.id, entry)} />
              ) : (
                <p className="add__closed">{s.add.reason}</p>
              )}
            </EnrolmentDetails>
          )}
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
