import type { ApiErrorBody, Catalogue, ChooseResponse, View, WriteResponse } from "../lib/types";

// Typed fetch wrappers for the JSON API (spec §4.2). A network failure or a
// server error becomes the one message that promises nothing changed; a 4xx
// carries the server's own message, which is shown as written.

export const NETWORK_MESSAGE = "Couldn't reach the server, so nothing changed. Try again.";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function call<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(
      path,
      body === undefined
        ? { headers: { accept: "application/json" } }
        : { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body) },
    );
  } catch {
    return { ok: false, status: 0, message: NETWORK_MESSAGE };
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // not JSON: handled below
  }
  if (res.ok && data !== null) return { ok: true, data: data as T };
  const message = (data as ApiErrorBody | null)?.error?.message;
  return { ok: false, status: res.status, message: res.status >= 400 && res.status < 500 && message ? message : NETWORK_MESSAGE };
}

export const getView = () => call<View>("/api/view");
export const getCatalogue = (session: string) => call<Catalogue>(`/api/catalogue?session=${encodeURIComponent(session)}`);
export const enrolEntry = (session: string, entry: string) => call<WriteResponse | ChooseResponse>("/api/enrol", { session, entry });
export const enrolClasses = (session: string, classNumbers: number[]) => call<WriteResponse>("/api/enrol", { session, classNumbers });
export const dropClass = (session: string, classNumber: number) => call<WriteResponse>("/api/drop", { session, classNumber });
export const resetDemo = (programCode?: string) => call<WriteResponse>("/api/demo/reset", programCode ? { programCode } : {});
export const saveSettings = (settings: { today?: string | null; programCode?: string; planCode?: string }) => call<WriteResponse>("/api/demo/settings", settings);
