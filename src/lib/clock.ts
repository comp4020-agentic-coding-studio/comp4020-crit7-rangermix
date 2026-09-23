// The only place the app reads the date (spec §4.3). Everything else takes
// `today` as an ISO date string, so the tests (APP_TODAY) and M2's date
// setting can move it.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The date in Canberra. Fly's machines run on UTC, so the machine's own date is wrong for up to 11 hours a day. */
export function canberraDate(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The real date the app runs on: APP_TODAY when it is set (the tests), else Canberra's date. */
export function realToday(): string {
  const fixed = process.env.APP_TODAY;
  return fixed && ISO_DATE.test(fixed) ? fixed : canberraDate();
}

/** The date a student's page is computed for. */
export function today(_student?: { today?: string | null }): string {
  return realToday();
}
