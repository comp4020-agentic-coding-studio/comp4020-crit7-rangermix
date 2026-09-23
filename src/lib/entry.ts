// What a student typed into "Class number or course code" (spec §6.3).

export type Entry = { kind: "course"; code: string } | { kind: "class"; number: number } | { kind: "invalid" };

export function parseEntry(raw: string): Entry {
  // NFKC folds fullwidth digits and letters (５０９９ → 5099); spaces anywhere are ignored.
  const s = raw.normalize("NFKC").replace(/\s+/g, "").toUpperCase();
  if (/^\d{1,6}$/.test(s) && Number(s) > 0) return { kind: "class", number: Number(s) };
  if (/^[A-Z]{4}\d{4}$/.test(s)) return { kind: "course", code: s };
  return { kind: "invalid" };
}
