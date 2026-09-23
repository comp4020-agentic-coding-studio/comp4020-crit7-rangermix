import type { APIRoute } from "astro";
import { catalogueFor } from "../../lib/catalogue";
import { today } from "../../lib/clock";
import { handle, json, sessionIdField } from "../../lib/http";
import { ref } from "../../lib/ref";
import { studentFor } from "../../lib/student";

// Every class in one session, with its course fields (spec §4.2). The
// browser filters it in memory (spec §4.1 a4).
export const GET: APIRoute = ({ cookies, url }) =>
  handle(() => {
    const sessionId = sessionIdField(url.searchParams.get("session"), "session", (id) => ref().sessionById.has(id));
    return json(catalogueFor(sessionId, today(studentFor(cookies))));
  });
