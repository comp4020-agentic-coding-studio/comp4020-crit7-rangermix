// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Chooser } from "../lib/types";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, makeView, POGO_CHOOSER } from "./fixtures";

const reply = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("the class chooser (F1, spec §6.3)", () => {
  it("opens for a course with several classes, takes focus, and sends both picks", async () => {
    const outcome = { ok: true, message: "Enrolled: POGO8062 A course with two classes (class 5354, 6 units)", warning: null, courseCode: "POGO8062", classNumber: 5354 };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply({ choose: POGO_CHOOSER }))
      .mockResolvedValueOnce(reply({ outcomes: [outcome], view: makeView() }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);

    await user.type(screen.getByLabelText("Class number or course code"), "POGO8062");
    await user.click(screen.getByRole("button", { name: "Add" }));
    const chooser = await screen.findByRole("group", { name: /POGO8062 .* has 2 classes in First Semester 2027/ });
    const boxes = within(chooser).getAllByRole("checkbox");
    expect(boxes.map((b) => b.getAttribute("aria-label"))).toEqual(["Select POGO8062 class 5354, In Person", "Select POGO8062 class 5355, Online"]);
    expect(document.activeElement).toBe(boxes[0]);
    await vi.waitFor(() => expect(window.location.search).toContain("choose=POGO8062"));

    await user.click(boxes[0]);
    await user.click(boxes[1]);
    await user.click(within(chooser).getByRole("button", { name: "Add selected" }));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ session: "2027-S1", classNumbers: [5354, 5355] });
    expect(await screen.findByText(outcome.message)).toBeTruthy();
    expect(screen.queryByRole("group", { name: /POGO8062/ })).toBeNull();
    await vi.waitFor(() => expect(window.location.search).not.toContain("choose="));
  });

  it("starts a chooser that replaces another in the same session with nothing picked", async () => {
    const other: Chooser = {
      ...POGO_CHOOSER,
      course: { ...POGO_CHOOSER.course, code: "COMP8800", title: "Advanced Computing Research Project", units: 12 },
      classes: POGO_CHOOSER.classes.map((c, i) => ({ ...c, classNumber: 6001 + i })),
      note: null,
    };
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValueOnce(reply({ choose: POGO_CHOOSER })).mockResolvedValueOnce(reply({ choose: other })));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.type(screen.getByLabelText("Class number or course code"), "POGO8062");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(within(await screen.findByRole("group", { name: /POGO8062/ })).getAllByRole("checkbox")[0]);
    await user.click(screen.getByRole("button", { name: /^Add to First Semester 2027 ?\(COMP8800\)$/ }));
    const second = await screen.findByRole("group", { name: /COMP8800/ });
    expect(within(second).getAllByRole("checkbox").some((b) => (b as HTMLInputElement).checked)).toBe(false);
    expect((within(second).getByRole("button", { name: "Add selected" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Cancel closes the chooser and returns focus to the input", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply({ choose: POGO_CHOOSER })));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.type(screen.getByLabelText("Class number or course code"), "POGO8062");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Class number or course code")));
  });

  it("shows an entry problem under the input, linked to it, announced, with focus back on the input", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(reply({ error: { code: "entry", message: "COMP9999 isn't in the prototype's catalogue" } }, 422)));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    const input = screen.getByLabelText("Class number or course code");
    await user.type(input, "COMP9999");
    await user.click(screen.getByRole("button", { name: "Add" }));
    const message = await screen.findByText("COMP9999 isn't in the prototype's catalogue");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(message.id);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(message.getAttribute("role")).toBe("alert");
    await vi.waitFor(() => expect(document.activeElement).toBe(input));
  });
});
