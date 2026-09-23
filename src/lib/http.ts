// The JSON API's conventions (spec §4.2): JSON in, JSON out, and errors as
// {error: {code, message}} with a 4xx status. The message is shown to the
// user as written.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Runs a handler, turning an ApiError into its response. Anything else is a real bug and stays a 500. */
export async function handle(run: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiError) return json({ error: { code: err.code, message: err.message } }, err.status);
    throw err;
  }
}

/** A POST body: JSON only, so a cross-site HTML form can't reach the API (spec §4.2). */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    throw new ApiError(415, "unsupported_media_type", "Send the request body as JSON, with Content-Type: application/json.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "bad_json", "The request body isn't valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, "bad_body", "The request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

/** A field naming a session: it must be a session id the calendar has. */
export function sessionIdField(value: unknown, field: string, known: (id: string) => boolean): string {
  if (typeof value !== "string" || value === "") throw new ApiError(400, "bad_field", `${field} must be a session id such as 2027-S1.`);
  if (!known(value)) throw new ApiError(400, "bad_field", `${field}: there's no session ${value.slice(0, 20)} in the prototype's data.`);
  return value;
}
