import type { APIRoute } from "astro";
import { today } from "../../lib/clock";
import { dropClass } from "../../lib/enrol";
import { ApiError, handle, json, readBody, sessionIdField } from "../../lib/http";
import { ref } from "../../lib/ref";
import { sandboxFor } from "../../lib/student";
import { buildView } from "../../lib/view";

// POST {session, classNumber} → {outcomes, view} (spec §4.2).
export const POST: APIRoute = ({ request, cookies }) =>
  handle(async () => {
    const body = await readBody(request);
    const sessionId = sessionIdField(body.session, "session", (id) => ref().sessionById.has(id));
    const n = body.classNumber;
    if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) throw new ApiError(400, "bad_field", "classNumber must be a class number.");
    const student = sandboxFor(cookies);
    const outcome = dropClass(student.id, sessionId, n, today(student));
    return json({ outcomes: [outcome], view: buildView(student) });
  });
