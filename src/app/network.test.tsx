// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, makeView } from "./fixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("writes wait for the server (spec §6.6, §9)", () => {
  it("shows the network notice, keeps the state, and re-enables the buttons when a request fails", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.type(screen.getByLabelText("Class number or course code"), "COMP8800");
    await user.click(screen.getByRole("button", { name: "Add" }));
    const message = "Couldn't reach the server, so nothing changed. Try again.";
    expect(await within(screen.getByRole("region", { name: "Notices" })).findByText(message)).toBeTruthy();
    expect(screen.getByLabelText("Class number or course code").closest("form")?.textContent).toContain(message);
    expect((screen.getByRole("button", { name: "Add" }) as HTMLButtonElement).disabled).toBe(false);
    // The student keeps their place (spec §15.3): focus returns to Add, not to the notices.
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add" })));
    expect(document.querySelector('[data-session="2026-S2"] [data-class="8707"]')).not.toBeNull();
  });

  it("blocks other writes while one is in flight, and says what it's doing", async () => {
    let answer: (r: Response) => void = () => {};
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(
      new Promise<Response>((resolve) => {
        answer = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.type(screen.getByLabelText("Class number or course code"), "COMP8800");
    await user.click(screen.getByRole("button", { name: "Add" }));
    const busy = screen.getByRole("button", { name: "Adding…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Add to First Semester 2027/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    answer(new Response(JSON.stringify({ outcomes: [], view: makeView() }), { status: 200, headers: { "content-type": "application/json" } }));
    await screen.findByRole("button", { name: "Add" });
  });
});
