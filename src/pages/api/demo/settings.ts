import type { APIRoute } from "astro";
import { fmtDate } from "../../../lib/format";
import { ApiError, handle, json, readBody } from "../../../lib/http";
import { applySettings, sandboxFor, type Settings } from "../../../lib/student";
import { buildView, demoRange } from "../../../lib/view";

// POST {today?, programCode?, planCode?} → {outcomes, view} (spec §11.2).
// The settings live on this browser's sandbox (spec §11.3, S1).
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isCalendarDate = (v: string): boolean => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export const POST: APIRoute = ({ request, cookies }) =>
  handle(async () => {
    const body = await readBody(request);
    const settings: Settings = {};
    if ("today" in body) {
      const v = body.today;
      const { min, max } = demoRange();
      if (v !== null && (typeof v !== "string" || !ISO_DATE.test(v) || !isCalendarDate(v) || v < min || v > max)) {
        throw new ApiError(400, "bad_field", `today must be null (the real date) or a date from ${min} to ${max}.`);
      }
      settings.today = v as string | null;
    }
    if (Object.keys(settings).length === 0) throw new ApiError(400, "bad_field", "Send today: a date, or null for the real date.");
    const student = applySettings(sandboxFor(cookies), settings);
    const view = buildView(student);
    const message = student.today ? `Demo date set to ${fmtDate(student.today)}.` : `The demo follows the real date again (${fmtDate(view.today)}).`;
    return json({ outcomes: [{ ok: true, message, warning: null, courseCode: null, classNumber: null }], view });
  });
