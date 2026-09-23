// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import EnrolmentApp from "./EnrolmentApp";
import { appProps, CATALOGUE, POGO_CHOOSER, urlState } from "./fixtures";

// This test drives act() itself, without Testing Library (which would set this flag), so it declares the act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

// Server and client must render identical markup (spec §6.6): dates come
// from format.ts over ISO strings, and the client never reads its own clock.
describe("hydration", () => {
  it.each([
    ["the default page", appProps()],
    ["a page with the chooser open", appProps({ chooser: POGO_CHOOSER, url: urlState({ choose: "POGO8062", term: "2027-S1" }) })],
    ["a page with the catalogue open", appProps({ catalogue: CATALOGUE, url: urlState({ browse: "2027-S1" }) })],
  ])("hydrates %s without a mismatch warning", async (_what, props) => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<EnrolmentApp {...props} />);
    document.body.append(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <EnrolmentApp {...props} />, { onRecoverableError: (e) => recoverable.push(e) });
    });
    expect(recoverable).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  });
});
