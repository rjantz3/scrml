// CONF-045 | §4.9
// W-MACRO-001 was RETIRED 2026-06-19 (S209 — state-as-primary unification follow-through).
// Under Name Resolution (§15.15.6), whitespace after `<` never reclassifies an opener
// (Phase P1, 2026-04-30), so a macro expansion cannot alter block type at a `<` boundary —
// the W-MACRO-001 trigger is impossible. A macro-inserted leading whitespace instead produces
// the deprecated opener form and surfaces W-WHITESPACE-001 (§15.15.5); classification
// (state vs HTML) is by the identifier, not by whitespace.
//
// STATUS: Retired. The preprocessor/macro pass was never implemented and W-MACRO-001 is
// removed from the §34 catalog. The observable whitespace-opener behavior (a `< db>` opener
// emits W-WHITESPACE-001 and still classifies by NR) is covered by the W-WHITESPACE-001 tests.
import { describe, test, expect } from "bun:test";

describe("CONF-045 (retired): W-MACRO-001 — macro-induced block-type change is impossible under NameRes", () => {
  test("retired — whitespace after `<` never reclassifies an opener (NR §15.15.6); macro whitespace surfaces W-WHITESPACE-001, not W-MACRO-001", () => {
    expect(true).toBe(true);
  });
});
