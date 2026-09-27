// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, enrolment, makeView, S1_2027, urlState } from "./fixtures";

const reply = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const dropped = { ok: true, message: "Dropped: COMP6442 Software Construction (class 8707)", warning: null, courseCode: "COMP6442", classNumber: 8707 };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("drop asks first once a class has started (spec §15.2)", () => {
  it("shows what dropping costs before anything is sent; Keep returns focus to Drop", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps({ url: urlState({ open: ["2026-S2"] }) })} />);
    await user.click(screen.getByRole("button", { name: "Drop COMP6442 class 8707" }));
    const panel = screen.getByRole("group", { name: "Drop COMP6442 Software Construction (class 8707)?" });
    expect(within(panel).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "You can't add it back: adding closed on Mon 3 Aug.",
      "You'll still be charged for it: the census date was Mon 31 Aug.",
    ]);
    expect(document.activeElement).toBe(panel);
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(within(panel).getByRole("button", { name: "Keep COMP6442" }));
    expect(screen.queryByRole("group", { name: /^Drop COMP6442/ })).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Drop COMP6442 class 8707" })));
  });

  it("closes on Escape without dropping", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps({ url: urlState({ open: ["2026-S2"] }) })} />);
    await user.click(screen.getByRole("button", { name: "Drop COMP6442 class 8707" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("group", { name: /^Drop COMP6442/ })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops once the student confirms", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply({ outcomes: [dropped], view: makeView() }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps({ url: urlState({ open: ["2026-S2"] }) })} />);
    await user.click(screen.getByRole("button", { name: "Drop COMP6442 class 8707" }));
    await user.click(within(screen.getByRole("group", { name: /^Drop COMP6442/ })).getByRole("button", { name: "Drop COMP6442" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ session: "2026-S2", classNumber: 8707 });
  });

  it("drops a class that hasn't started in one click, with a note that it leaves no record", async () => {
    const note = "It hasn't started, so dropping it leaves no record; you can add it back until Mon 1 Mar.";
    const upcoming = enrolment({ sessionId: "2027-S1", classNumber: 5048, courseCode: "COMP8800", title: "Advanced Computing Research Project", units: 12, dropConfirm: false, dropConsequences: [note] });
    const view = makeView({ sessions: [{ ...S1_2027, classCount: 1, units: 12, enrolments: [upcoming] }] });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply({ outcomes: [{ ...dropped, courseCode: "COMP8800", classNumber: 5048 }], view: makeView() }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps({ view })} />);
    expect(screen.getByText(note)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Drop COMP8800 class 5048" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ session: "2027-S1", classNumber: 5048 });
  });
});
