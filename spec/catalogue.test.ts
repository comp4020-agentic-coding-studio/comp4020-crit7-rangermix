import { describe, expect, it } from "vitest";
import type { WriteResponse } from "../src/lib/types";
import { course, singleClassCourses, snapshot, Visitor } from "./helpers";

describe("F2: browse classes", () => {
  it("server-renders only matching rows for /?browse=2027-S1&subject=COMP&career=PGRD&level=8000", async () => {
    const doc = await new Visitor().page("/?browse=2027-S1&subject=COMP&career=PGRD&level=8000");
    const expected = snapshot.classes.filter((c) => c.sessionId === "2027-S1" && /^COMP8/.test(c.courseCode) && course(c.courseCode).career === "PGRD");
    const rows = [...doc.querySelectorAll(".results tbody tr")];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBe(Math.min(50, expected.length));
    for (const row of rows) {
      const cells = [...row.querySelectorAll("td")].map((td) => td.textContent?.trim());
      expect(cells[2]).toMatch(/^COMP8/);
      expect(cells[4]).toBe("PGRD");
      expect(cells[5]).toBe("8000");
    }
    expect(doc.querySelector(".results caption")?.textContent).toBe(`${expected.length} First Semester 2027 classes · subject COMP · career PGRD · level 8000`);
    expect(doc.querySelector("#browse > details")?.hasAttribute("open")).toBe(true);
  });

  it("keeps the current filters in sort and paging links and adds none", async () => {
    const doc = await new Visitor().page("/?browse=2027-S1&subject=COMP");
    const hrefs = [...doc.querySelectorAll(".results thead a, .pager a")].map((a) => a.getAttribute("href") ?? "");
    expect(hrefs).toContain("/?browse=2027-S1&subject=COMP&sort=title");
    expect(hrefs).toContain("/?browse=2027-S1&subject=COMP&sort=level");
    for (const href of hrefs) expect(href).toMatch(/^\/\?browse=2027-S1&subject=COMP(&sort=(title|level))?(&page=\d+)?$/);
  });

  it("marks completed and required courses on the server-rendered rows", async () => {
    const comp6445 = snapshot.classes.find((c) => c.courseCode === "COMP6445" && c.sessionId.startsWith("2027"));
    expect(comp6445).toBeDefined();
    const doc = await new Visitor().page(`/?browse=${comp6445?.sessionId}&code=COMP6445`);
    const row = doc.querySelector(`tr[data-class="${comp6445?.classNumber}"]`);
    expect(row?.textContent).toContain("Completed · First Semester 2026");
    expect(row?.textContent).toContain("Required");
    expect(row?.querySelector("input")?.hasAttribute("disabled")).toBe(true);
  });

  it("bulk-adds three classes in one request", async () => {
    const three = singleClassCourses("2027-S1", 3);
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2027-S1", classNumbers: three.map((c) => c.classNumber) });
    expect(body.outcomes.map((o) => o.ok)).toEqual([true, true, true]);
  });
});
