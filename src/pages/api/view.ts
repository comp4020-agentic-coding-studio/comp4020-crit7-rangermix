import type { APIRoute } from "astro";
import { handle, json } from "../../lib/http";
import { studentFor } from "../../lib/student";
import { buildView } from "../../lib/view";

// The view model for this browser's student (spec §4.2). The client calls
// it when a tab regains focus.
export const GET: APIRoute = ({ cookies }) => handle(() => json(buildView(studentFor(cookies))));
