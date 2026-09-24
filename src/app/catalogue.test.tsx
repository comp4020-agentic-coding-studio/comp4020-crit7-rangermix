// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppProps } from "../lib/types";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, CATALOGUE, makeView, urlState } from "./fixtures";

const reply = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const browsing = (patch: Partial<AppProps> = {}): AppProps => appProps({ url: urlState({ browse: "2027-S1" }), catalogue: CATALOGUE, ...patch });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("browse classes (F2, spec §6.4)", () => {
  it("narrows the rows as the user types, and the URL follows", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
    const user = userEvent.setup();
    render(<EnrolmentApp {...browsing()} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + CATALOGUE.classes.length);
    await user.type(screen.getByLabelText("Search"), "optim");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(table.querySelector("caption")?.textContent).toBe("1 First Semester 2027 class · search “optim”");
    await vi.waitFor(() => expect(window.location.search).toBe("?browse=2027-S1&q=optim"));
  });

  // Browsers throttle history writes; Safari throws past 100 in 10 seconds.
  it("writes the URL a few times as the user types, not once per keystroke", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
    const spy = vi.spyOn(window.history, "replaceState");
    const user = userEvent.setup();
    render(<EnrolmentApp {...browsing()} />);
    spy.mockClear();
    await user.type(screen.getByLabelText("Search"), "optimisation");
    await vi.waitFor(() => expect(window.location.search).toBe("?browse=2027-S1&q=optimisation"));
    expect(spy.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("keeps the page up when the browser refuses a URL write", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {
      throw new DOMException("Attempt to use history.replaceState() more than 100 times per 10 seconds", "SecurityError");
    });
    const user = userEvent.setup();
    render(<EnrolmentApp {...browsing()} />);
    await user.type(screen.getByLabelText("Search"), "optim");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
  });

  it("adds the selected classes in one request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply({ outcomes: [], view: makeView() }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...browsing()} />);
    await user.click(screen.getByRole("checkbox", { name: "Select COMP8691 class 5101, In Person" }));
    await user.click(screen.getByRole("checkbox", { name: "Select COMP1100 class 5103, In Person" }));
    await user.click(screen.getByRole("button", { name: "Add 2 selected classes to First Semester 2027" }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ session: "2027-S1", classNumbers: [5103, 5101] });
  });

  it("marks what the student already has, and disables it", () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
    const view = makeView({
      marks: { COMP8620: { completed: null, enrolledIn: ["2027-S1"] }, COMP1100: { completed: "Completed · First Semester 2026", enrolledIn: [] } },
      requiredCodes: ["COMP8691"],
    });
    render(<EnrolmentApp {...browsing({ view })} />);
    const row = (n: number): HTMLTableRowElement => document.querySelector(`tr[data-class="${n}"]`) as HTMLTableRowElement;
    expect(row(5102).textContent).toContain("Enrolled");
    expect((within(row(5102)).getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect(row(5103).textContent).toContain("Completed · First Semester 2026");
    expect((within(row(5103)).getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect(row(5101).textContent).toContain("Required");
    expect(row(5101).textContent).toContain("Indicative");
  });

  it("fetches a session's classes when the catalogue opens", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply(CATALOGUE));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EnrolmentApp {...appProps()} />);
    await user.click(screen.getByText("Browse classes"));
    expect(await screen.findByRole("table")).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/catalogue?session=2027-S1");
  });
});
