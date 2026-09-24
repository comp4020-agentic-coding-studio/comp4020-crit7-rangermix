import { JSDOM } from "jsdom";
import { existsSync } from "node:fs";
import { describe, expect, inject, it } from "vitest";

// spec/readme.test.ts stays as shipped, so the README images get their own file.
// The deployed image has no image service: the Dockerfile prunes to production
// dependencies and sharp isn't one, so an /_image URL answers 500 there even
// though it works locally. README images are files in public/.
const baseUrl = inject("baseUrl");

describe("readme images", () => {
  it("serves every README image as a static file from public/", async () => {
    const doc = new JSDOM(await (await fetch(new URL("/readme/", baseUrl))).text()).window.document;
    const srcs = [...doc.querySelectorAll("main img")].map((img) => img.getAttribute("src") ?? "");
    expect(srcs.length, "README.md shows no images").toBeGreaterThan(0);
    for (const src of srcs) {
      expect(existsSync(`public${decodeURI(src)}`), `${src} isn't a file in public/`).toBe(true);
      const res = await fetch(new URL(src, baseUrl));
      expect(res.status, src).toBe(200);
      expect(res.headers.get("content-type"), src).toMatch(/^image\//);
    }
  });
});
