import type { APIRoute } from "astro";
import { fmtDate } from "../../../lib/format";
import { ApiError, handle, json, readBody } from "../../../lib/http";
import { ref } from "../../../lib/ref";
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
    if ("programCode" in body || "planCode" in body) {
      const r = ref();
      const program = body.programCode;
      const plan = body.planCode;
      if (typeof program !== "string" || !r.programPlans.has(program)) throw new ApiError(400, "bad_field", "programCode must be one of the demo's five programs.");
      if (typeof plan !== "string" || r.plans.get(plan)?.kind === "program" || !r.plans.has(plan)) throw new ApiError(400, "bad_field", "planCode must be a major or specialisation code.");
      if (!r.programPlans.get(program)!.includes(plan)) throw new ApiError(422, "settings", `${plan} isn't offered in ${program}`);
      settings.programCode = program;
      settings.planCode = plan;
    }
    if (Object.keys(settings).length === 0) throw new ApiError(400, "bad_field", "Send today, or programCode with planCode.");
    const student = applySettings(sandboxFor(cookies), settings);
    const view = buildView(student);
    // Only the parts that were sent: "Demo settings applied: 10 Dec 2026 · AACOM · ARIN-SPEC."
    const parts: string[] = [];
    if (settings.today !== undefined) parts.push(settings.today === null ? `the real date (${fmtDate(view.today)})` : fmtDate(settings.today));
    if (settings.programCode !== undefined) parts.push(settings.programCode, settings.planCode as string);
    const message = `Demo settings applied: ${parts.join(" · ")}.`;
    return json({ outcomes: [{ ok: true, message, warning: null, permission: null, courseCode: null, classNumber: null }], view });
  });
