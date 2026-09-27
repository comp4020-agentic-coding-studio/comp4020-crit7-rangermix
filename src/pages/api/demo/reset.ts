import type { APIRoute } from "astro";
import { DEFAULT_PROGRAM } from "../../../data/templates";
import { ApiError, handle, json, readBody } from "../../../lib/http";
import { resetSandbox } from "../../../lib/student";
import { buildView } from "../../../lib/view";

// POST {programCode?} → {outcomes, view}: this browser's sandbox becomes a
// fresh copy of that program's template student (spec §4.2, §11.3).
export const POST: APIRoute = ({ request, cookies }) =>
  handle(async () => {
    const body = await readBody(request);
    const programCode = body.programCode ?? DEFAULT_PROGRAM;
    if (typeof programCode !== "string") throw new ApiError(400, "bad_field", "programCode must be a program code such as 7722XVCOMP.");
    const student = resetSandbox(cookies, programCode);
    const message = `Demo reset: you're ${student.name} (${student.uid}) again, with the starting enrolments.`;
    return json({ outcomes: [{ ok: true, message, warning: null, permission: null, courseCode: null, classNumber: null }], view: buildView(student) });
  });
