import type { Notice } from "../../lib/types";

export function NoticeItem({ notice: n }: { notice: Notice }) {
  return (
    <li className={`notice notice--${n.tone}`}>
      {n.text}
      {n.link && (
        <>
          {" "}
          <a href={n.link.href}>{n.link.text}</a>
        </>
      )}
    </li>
  );
}

// The notices region (spec §6.3, §7, §15.3): polite live announcements that
// don't take focus. `seq` counts results, so a repeated message is new DOM and
// is announced again.
export function Notices({ notices, seq }: { notices: Notice[]; seq: number }) {
  return (
    <section className="notices" aria-label="Notices" aria-live="polite">
      {notices.length > 0 && (
        <ul>
          {notices.map((n, i) => (
            <NoticeItem key={`${seq}:${i}`} notice={n} />
          ))}
        </ul>
      )}
    </section>
  );
}

// A write's outcome beside the control that made it (spec §15.3). Not a live
// region: the notices region announces it once.
export function InlineNotices({ notices }: { notices: Notice[] | null }) {
  if (!notices || notices.length === 0) return null;
  return (
    <ul className="inline-notices">
      {notices.map((n, i) => (
        <NoticeItem key={`${i}:${n.text}`} notice={n} />
      ))}
    </ul>
  );
}
