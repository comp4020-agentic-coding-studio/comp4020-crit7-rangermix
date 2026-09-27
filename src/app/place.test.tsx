// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CourseStatusView, Outcome, View } from "../lib/types";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, CATALOGUE, enrolment, makeView, S1_2027, S2_2026, urlState } from "./fixtures";

// After a write the student keeps their place (spec §15.3): focus stays on the control they
// used, or the nearest thing that replaced it, and the outcome shows beside it as well as in
// the notices region, which announces it without taking focus.
const reply = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const enrolled = (courseCode: string, classNumber: number, title: string): Outcome => ({ ok: true, message: `Enrolled: ${courseCode} ${title} (class ${classNumber}, 6 units)`, warning: null, permission: null, courseCode, classNumber });
const notices = () => screen.getByRole("region", { name: "Notices" });

function withCourse(code: string, patch: Partial<CourseStatusView>): View {
  const view = structuredClone(makeView());
  for (const g of view.requirements.blocks.flatMap((b) => b.groups)) g.courses = g.courses.map((c) => (c.code === code ? { ...c, ...patch } : c));
  return view;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("keeping the student's place after a write (spec §15.3)", () => {
  it("after adding from the requirements, focus stays on that course and the outcome shows beside it", async () => {
    const outcome = enrolled("COMP8800", 5048, "Advanced Computing Research Project");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply({ outcomes: [outcome], view: withCourse("COMP8800", { add: null, icon: "partial", text: "Enrolled · First Semester 2027 (1 of 2)" }) })));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.click(screen.getByRole("button", { name: /^Add to First Semester 2027 ?\(COMP8800\)$/ }));
    const row = document.querySelector<HTMLElement>('[data-course="COMP8800"]');
    await vi.waitFor(() => expect(document.activeElement).toBe(row?.querySelector("a")));
    expect(row?.textContent).toContain(outcome.message);
    expect(within(notices()).getByText(outcome.message)).toBeTruthy();
  });

  it("after adding by course code, focus stays on Add and the outcome shows under the input", async () => {
    const outcome = enrolled("COMP8800", 5048, "Advanced Computing Research Project");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply({ outcomes: [outcome], view: makeView() })));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.type(screen.getByLabelText("Class number or course code"), "COMP8800");
    await user.click(screen.getByRole("button", { name: "Add" }));
    const form = screen.getByLabelText("Class number or course code").closest("form");
    await vi.waitFor(() => expect(form?.textContent).toContain(outcome.message));
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add" })));
  });

  it("after a bulk add, the bar shows the outcome and takes focus; Dismiss clears it", async () => {
    const outcome = enrolled("COMP8691", 5101, "Optimisation");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply({ outcomes: [outcome], view: makeView() })));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps({ url: urlState({ browse: "2027-S1" }), catalogue: CATALOGUE })} />);
    await user.click(screen.getByRole("checkbox", { name: "Select COMP8691 class 5101, In Person" }));
    await user.click(screen.getByRole("button", { name: "Add 1 selected class to First Semester 2027" }));
    const dismiss = await screen.findByRole("button", { name: "Dismiss" });
    await vi.waitFor(() => expect(document.activeElement).toBe(dismiss));
    expect(dismiss.closest(".bulkbar")?.textContent).toContain(outcome.message);
    await user.click(dismiss);
    expect(document.querySelector(".bulkbar")).toBeNull();
  });

  it("after a drop, focus lands on the class row, which now reads Dropped, with the outcome in the session", async () => {
    const outcome: Outcome = { ok: true, message: "Dropped: COMP6442 Software Construction (class 8707)", warning: null, permission: null, courseCode: "COMP6442", classNumber: 8707 };
    const gone = enrolment({ state: "dropped", droppedOn: "2026-09-24", canDrop: false, dropConfirm: false, dropConsequences: [] });
    const view = makeView({ sessions: [{ ...S2_2026, classCount: 0, units: 0, enrolments: [gone] }, S1_2027] });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply({ outcomes: [outcome], view })));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps({ url: urlState({ open: ["2026-S2"] }) })} />);
    await user.click(screen.getByRole("button", { name: "Drop COMP6442 class 8707" }));
    await user.click(within(screen.getByRole("group", { name: /^Drop COMP6442/ })).getByRole("button", { name: "Drop COMP6442" }));
    const summary = document.querySelector('[data-session="2026-S2"] [data-class="8707"] > summary');
    await vi.waitFor(() => expect(document.activeElement).toBe(summary));
    expect(summary?.textContent).toContain("Dropped");
    expect(document.querySelector('[data-session="2026-S2"] .details')?.textContent).toContain(outcome.message);
  });
});
