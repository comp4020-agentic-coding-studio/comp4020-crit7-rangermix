import { describe, expect, it } from "vitest";
import type { View, WriteResponse } from "../src/lib/types";
import { Visitor } from "./helpers";

const status = (view: View, code: string) =>
  view.requirements.blocks
    .flatMap((b) => b.groups)
    .flatMap((g) => g.courses)
    .find((c) => c.code === code);

describe("F5: requirements sidebar", () => {
  it("shows Completed, Enrolled (now), Not enrolled with Add, and No classes listed for COMP6250", async () => {
    const { body: view } = await new Visitor().getJson<View>("/api/view");
    expect(status(view, "COMP6445")?.text).toBe("Completed · First Semester 2026 · D");
    expect(status(view, "COMP6442")?.text).toBe("Enrolled · Second Semester 2026 (now)");
    expect(status(view, "COMP8800")).toMatchObject({ text: "Not enrolled", times: 2, add: { sessionId: "2027-S1", label: "Add to First Semester 2027" } });
    expect(status(view, "COMP6250")?.text).toBe("Not enrolled · No classes listed in P&C for 2026–2027");
    expect(view.requirements.summary).toEqual({ done: 18, enrolled: 18, total: 66 });
  });

  it("renders the sidebar on the page, with the summary, ×2, an Add button and a catalogue link", async () => {
    const doc = await new Visitor().page("/");
    const aside = doc.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(doc.getElementById(aside?.getAttribute("aria-labelledby") ?? "")?.textContent).toBe("Your requirements");
    expect(aside?.textContent).toContain("Tracked: 18 of 66 units done · 18 enrolled");
    expect(aside?.textContent).toContain("Master of Computing (Advanced)");
    expect(aside?.textContent).toContain("Artificial Intelligence");
    const comp8800 = aside?.querySelector('[data-course="COMP8800"]');
    expect(comp8800?.textContent).toContain("×2");
    expect(comp8800?.querySelector("button")?.textContent).toContain("Add to First Semester 2027");
    expect(comp8800?.querySelector("a")?.getAttribute("href")).toBe("/?browse=2027-S1&code=COMP8800");
    expect(comp8800?.querySelector('[aria-hidden="true"]')?.textContent).toBe("○");
    expect(aside?.querySelector(".requirements__notes > summary")?.textContent).toMatch(/^Other rules, not tracked \(\d+\)$/);
  });

  it("shows COMP8800 Enrolled (1 of 2) and 30 units enrolled after adding it", async () => {
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2027-S1", entry: "COMP8800" });
    expect(status(body.view, "COMP8800")?.text).toBe("Enrolled · First Semester 2027 (1 of 2)");
    expect(body.view.requirements.summary).toEqual({ done: 18, enrolled: 30, total: 66 });
  });
});
