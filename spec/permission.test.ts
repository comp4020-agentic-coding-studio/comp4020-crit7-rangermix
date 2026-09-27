import { describe, expect, it } from "vitest";
import type { Catalogue, CatalogueClass, ChooseResponse, WriteResponse } from "../src/lib/types";
import { classesOf, Visitor } from "./helpers";

// Permission codes are flagged only where ANUHub would ask for one (spec §15.5).
const catalogue = async (session: string): Promise<Catalogue> => (await new Visitor().getJson<Catalogue>(`/api/catalogue?session=${session}`)).body;
const mentions = (c: CatalogueClass): boolean => /permission code/i.test(c.requisites ?? "");

describe("permission codes, only where they apply (spec §15.5)", () => {
  it("flags COMP8800 in the catalogue, in the add outcome and on the enrolment", async () => {
    const [cls] = classesOf("COMP8800", "2027-S1");
    expect((await catalogue("2027-S1")).classes.find((c) => c.classNumber === cls.classNumber)?.permission).toBe("Needs a permission code: P&C's requisites ask for one.");
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2027-S1", entry: "COMP8800" });
    expect(body.outcomes[0].permission).toBe("COMP8800 needs a permission code in ANUHub: P&C's requisites ask for one. This prototype doesn't ask for one.");
    expect(body.view.sessions.find((s) => s.id === "2027-S1")?.enrolments[0].permission).toBe("Needs a permission code: P&C's requisites ask for one.");
  });

  it("flags a class from the other career, and leaves an ordinary postgraduate class alone", async () => {
    const { classes } = await catalogue("2027-S1");
    expect(classes.find((c) => c.career === "UGRD" && !mentions(c))?.permission).toBe("Needs a permission code: it's an undergraduate course and your program is postgraduate.");
    expect(classes.find((c) => c.career === "PGRD" && !mentions(c))?.permission).toBeNull();
  });

  it("reads P&C's conditions: COMP8430 asks only in intensive mode, so its semester class needs none", async () => {
    const [cls] = classesOf("COMP8430", "2026-S2");
    expect((await catalogue("2026-S2")).classes.find((c) => c.classNumber === cls.classNumber)?.permission).toBeNull();
  });

  it("says nothing on the chooser of a course that needs no code", async () => {
    const { body } = await new Visitor().postJson<ChooseResponse>("/api/enrol", { session: "2027-S1", entry: "POGO8062" });
    expect(body.choose.permission).toBeNull();
  });

  it("names the code on the add outcome of a class from the other career", async () => {
    const ug = (await catalogue("2027-S1")).classes.find((c) => c.career === "UGRD" && !mentions(c));
    const { body } = await new Visitor().postJson<WriteResponse>("/api/enrol", { session: "2027-S1", classNumbers: [ug?.classNumber] });
    expect(body.outcomes[0].permission).toBe(`${ug?.courseCode} needs a permission code in ANUHub: it's an undergraduate course and your program is postgraduate. This prototype doesn't ask for one.`);
  });
});
