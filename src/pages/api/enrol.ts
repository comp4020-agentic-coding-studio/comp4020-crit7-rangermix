import type { APIRoute } from "astro";
import { today } from "../../lib/clock";
import { enrolClasses, resolveEntry } from "../../lib/enrol";
import { ApiError, handle, json, readBody, sessionIdField } from "../../lib/http";
import { ref } from "../../lib/ref";
import { sandboxFor, studentFor } from "../../lib/student";
import { buildView, permissionContext } from "../../lib/view";

// POST {session, entry} or {session, classNumbers} (spec §4.2). A course
// with several classes answers {choose} and changes nothing; a problem with
// the entry itself answers 422; otherwise {outcomes, view}.
export const POST: APIRoute = ({ request, cookies }) =>
  handle(async () => {
    const body = await readBody(request);
    const r = ref();
    const sessionId = sessionIdField(body.session, "session", (id) => r.sessionById.has(id));
    const hasEntry = body.entry !== undefined;
    if (hasEntry === (body.classNumbers !== undefined)) throw new ApiError(400, "bad_field", "Send either entry (text) or classNumbers (a list), not both.");

    let classNumbers: number[];
    if (hasEntry) {
      if (typeof body.entry !== "string" || body.entry.length > 100) throw new ApiError(400, "bad_field", "entry must be text: a class number or a course code.");
      const viewer = studentFor(cookies);
      const resolved = resolveEntry(body.entry, sessionId, today(viewer), permissionContext(viewer));
      if (resolved.kind === "error") throw new ApiError(422, "entry", resolved.message);
      if (resolved.kind === "choose") return json({ choose: resolved.chooser });
      classNumbers = resolved.classNumbers;
    } else {
      const ns = body.classNumbers;
      if (!Array.isArray(ns) || ns.length === 0 || ns.length > 50 || !ns.every((n) => Number.isInteger(n) && n > 0 && n < 1_000_000)) {
        throw new ApiError(400, "bad_field", "classNumbers must be a list of 1 to 50 class numbers.");
      }
      classNumbers = ns as number[];
    }

    const student = sandboxFor(cookies);
    const outcomes = enrolClasses({ id: student.id, context: permissionContext(student) }, sessionId, classNumbers, today(student));
    return json({ outcomes, view: buildView(student) });
  });
