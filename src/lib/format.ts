// en-AU date and unit formatting over ISO strings (spec §4.3). Pure and
// locale-free, so the server and the browser render identical text and
// hydration never mismatches.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** "3 Aug" */
export function fmtDay(iso: string): string {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "3 Aug 2026" */
export function fmtDate(iso: string): string {
  return `${fmtDay(iso)} ${parts(iso).y}`;
}

/** "5–21 Nov", "27 Jul–30 Oct", "30 Nov 2026–26 Feb 2027" */
export function fmtRange(from: string, to: string): string {
  const a = parts(from);
  const b = parts(to);
  if (a.y !== b.y) return `${fmtDate(from)}–${fmtDate(to)}`;
  if (a.m === b.m) return `${a.d}–${b.d} ${MONTHS[b.m - 1]}`;
  return `${fmtDay(from)}–${fmtDay(to)}`;
}

/** "6 units", "1 unit" */
export function fmtUnits(n: number): string {
  return `${n} unit${n === 1 ? "" : "s"}`;
}

/** The ISO date `n` days after (or, for negative n, before) `iso`. */
export function addDays(iso: string, n: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
