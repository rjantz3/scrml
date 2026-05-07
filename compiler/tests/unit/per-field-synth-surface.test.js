/**
 * Phase A1b Step B12 — Auto-synthesized validity surface (per-field).
 *
 * Tests the B12 extension to PASS 8 (per-field synth-cell registration) +
 * the per-field-aware E-SYNTHESIZED-WRITE relaxation in PASS 6 added to
 * Stage 3.06 SYM (`compiler/src/symbol-table.ts`).
 *
 * Spec authority:
 *   §55.5  — Compound-level synth surface (B11; cross-ref).
 *   §55.6  — Per-field synth surface (PRIMARY for B12).
 *   §55.7  — Synthesized-property semantics + update-timing table; line
 *            24468 establishes `submitted` as compound-level only.
 *   §55.9  — ValidationError enum (referenced from per-field `errors` shape).
 *   §55.11 — Cross-field validation via predicate args.
 *   §55.13 — `reset` keyword interaction.
 *   §34    — E-SYNTHESIZED-WRITE catalog row.
 *
 * Audit reference:
 *   - `docs/audits/a1b-b12-rule4-audit-2026-05-07.md` — 1 substantive +
 *     1 boundary-clarification finding; 8-point dispatch brief.
 *
 * Coverage (per audit §2 brief + §1 findings):
 *
 *   §B12.1  — Compound-with-validators: every field gets per-field surface.
 *   §B12.2  — No-validator field STILL gets per-field surface (audit §1.1
 *             substantive — predictability per L11 Edge B / §55.6).
 *   §B12.3  — `submitted` NOT registered at per-field scope (audit §1.6 /
 *             §55.7 line 24468).
 *   §B12.4  — Top-level Tier-1 (`<count req>`) gets NO per-field surface
 *             (only compound CHILDREN do; L11 Edge A).
 *   §B12.5  — `lookupQualifiedStateCell` resolves per-field synth via
 *             extended descent (any-`_scope` rule).
 *   §B12.6  — E-SYNTHESIZED-WRITE fires on `@form.email.isValid = false`.
 *   §B12.7  — E-SYNTHESIZED-WRITE fires on `@form.email.errors = []`.
 *   §B12.8  — E-SYNTHESIZED-WRITE fires on `@form.email.touched = true`.
 *   §B12.9  — E-SYNTHESIZED-WRITE does NOT fire on `@form.email.submitted`
 *             (compound-only; per-field write to non-synth member is OOS).
 *   §B12.10 — Runtime-hook annotations on per-field synth records (§55.7
 *             update-timing).
 *   §B12.11 — Nested compound: per-field surface attaches to compound
 *             children at every level; compound-typed children skip per-
 *             field synth (compound-level synth already serves that path).
 *   §B12.12 — Public read APIs (`getPerFieldSynthRecords`,
 *             `PER_FIELD_SYNTH_PROPERTIES`).
 *   §B12.13 — Cross-field validators (`<confirm req eq(@signup.password)>`)
 *             — per-field synth registers; B10 Phase 3 emits the
 *             validator-reads edges; no synth-related cycle errors.
 *   §B12.14 — Per-field synth records carry `parentField` + `parentCompound`
 *             back-pointers; `qualifiedPath` shape is `compound.field.prop`.
 *   §B12.15 — Negative cases: writes to non-synth per-field members do NOT
 *             fire; reads of synth properties do NOT fire.
 *   §B12.16 — Multi-field compound: each field gets its own field-scope
 *             with its own three synth records (independent per-field
 *             surfaces).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import {
  runSYM,
  lookupQualifiedStateCell,
  isSynthesizedCell,
  getSynthRecords,
  getPerFieldSynthRecords,
  COMPOUND_SYNTH_PROPERTIES,
  PER_FIELD_SYNTH_PROPERTIES,
  SYNTH_PROPERTY_NAMES,
} from "../../src/symbol-table.ts";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

function buildAndRun(source) {
  const { ast, errors } = parse(source);
  const sym = runSYM({ filePath: "test.scrml", ast });
  return { ast, errors, sym };
}

function errsByCode(sym, code) {
  return sym.errors.filter((e) => e.code === code);
}

// ===========================================================================
// §B12.1 — Compound-with-validators: each field gets per-field surface
// ===========================================================================

describe("§B12.1 each compound field with validators gets per-field surface", () => {
  test("`<form><name req length(>=2)></>` registers per-field synth on name", () => {
    const src = `<program>\${ <form><name req length(>=2)> = <input type="text"/></> }</program>`;
    const { sym } = buildAndRun(src);

    const formRec = sym.fileScope.stateCells.get("form");
    expect(formRec).toBeDefined();
    const formScope = formRec.declNode._scope;
    const nameRec = formScope.stateCells.get("name");
    expect(nameRec).toBeDefined();
    expect(nameRec.declNode._scope).toBeDefined();
    expect(nameRec.declNode._scope.kind).toBe("field");

    const fieldScope = nameRec.declNode._scope;
    for (const property of PER_FIELD_SYNTH_PROPERTIES) {
      const synthRec = fieldScope.stateCells.get(property);
      expect(synthRec).toBeDefined();
      expect(synthRec.isSynthesized).toBe(true);
      expect(synthRec.synthProperty).toBe(property);
      expect(synthRec.parentField).toBe(nameRec);
      expect(synthRec.parentCompound).toBe(formRec);
      expect(synthRec.qualifiedPath).toBe("form.name." + property);
      expect(synthRec.isConst).toBe(true);
      expect(synthRec.shape).toBe("derived");
    }
  });
});

// ===========================================================================
// §B12.2 — No-validator field STILL gets per-field surface (audit §1.1)
// ===========================================================================

describe("§B12.2 no-validator field gets per-field surface (predictability per L11 Edge B)", () => {
  test("`<form><name>=\"\"</>` (no validators) registers full per-field surface", () => {
    const src = `<program>\${ <form><name>="" </> }</program>`;
    const { sym } = buildAndRun(src);

    const formRec = sym.fileScope.stateCells.get("form");
    const nameRec = formRec.declNode._scope.stateCells.get("name");
    expect(nameRec.hasValidators).toBe(false);
    expect(nameRec.declNode._scope).toBeDefined();
    expect(nameRec.declNode._scope.kind).toBe("field");

    const fieldScope = nameRec.declNode._scope;
    for (const property of PER_FIELD_SYNTH_PROPERTIES) {
      const synthRec = fieldScope.stateCells.get(property);
      expect(synthRec).toBeDefined();
      expect(synthRec.isSynthesized).toBe(true);
    }
  });

  test("mixed: validator-tagged + no-validator fields BOTH get per-field surface", () => {
    const src = `<program>\${
      <signup>
        <name req length(>=2)> = <input type="text"/>
        <somethingElse> = ""
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const signupRec = sym.fileScope.stateCells.get("signup");
    const compoundScope = signupRec.declNode._scope;

    const nameRec = compoundScope.stateCells.get("name");
    expect(nameRec.declNode._scope).toBeDefined();
    expect(nameRec.declNode._scope.stateCells.size).toBe(3);

    const otherRec = compoundScope.stateCells.get("somethingElse");
    expect(otherRec).toBeDefined();
    expect(otherRec.declNode._scope).toBeDefined();
    expect(otherRec.declNode._scope.stateCells.size).toBe(3);
  });
});

// ===========================================================================
// §B12.3 — `submitted` NOT registered at per-field scope (audit §1.6)
// ===========================================================================

describe("§B12.3 `submitted` NOT registered at per-field scope (§55.7 line 24468)", () => {
  test("per-field scope holds {isValid, errors, touched} but NOT `submitted`", () => {
    const src = `<program>\${ <form><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);

    const fieldScope = sym.fileScope.stateCells.get("form")
      .declNode._scope.stateCells.get("name").declNode._scope;
    expect(fieldScope.stateCells.has("isValid")).toBe(true);
    expect(fieldScope.stateCells.has("errors")).toBe(true);
    expect(fieldScope.stateCells.has("touched")).toBe(true);
    expect(fieldScope.stateCells.has("submitted")).toBe(false);
    expect(fieldScope.stateCells.size).toBe(3);
  });

  test("`PER_FIELD_SYNTH_PROPERTIES` excludes `submitted`", () => {
    expect([...PER_FIELD_SYNTH_PROPERTIES]).toEqual([
      "isValid", "errors", "touched",
    ]);
    expect(PER_FIELD_SYNTH_PROPERTIES).not.toContain("submitted");
    // SYNTH_PROPERTY_NAMES still has all 4 (B11 + B12 union).
    expect(SYNTH_PROPERTY_NAMES.has("submitted")).toBe(true);
  });
});

// ===========================================================================
// §B12.4 — Top-level Tier-1 cells get NO per-field surface (L11 Edge A)
// ===========================================================================

describe("§B12.4 top-level Tier-1 cells do NOT get per-field surface (L11 Edge A)", () => {
  test("`<count req>` is top-level; no `_scope` attached by B12", () => {
    const src = `<program>\${ <count req> = 0 }</program>`;
    const { sym } = buildAndRun(src);

    const countRec = sym.fileScope.stateCells.get("count");
    expect(countRec.isCompoundChild).toBe(false);
    // No `_scope` on a top-level non-compound cell.
    expect(countRec.declNode._scope).toBeUndefined();
    expect(getPerFieldSynthRecords(countRec.declNode)).toEqual([]);
  });

  test("`<userName>=\"\"` plain top-level Shape 1 — no per-field surface", () => {
    const src = `<program>\${ <userName> = "" }</program>`;
    const { sym } = buildAndRun(src);
    const rec = sym.fileScope.stateCells.get("userName");
    expect(rec.declNode._scope).toBeUndefined();
    expect(getPerFieldSynthRecords(rec.declNode)).toEqual([]);
  });
});

// ===========================================================================
// §B12.5 — lookupQualifiedStateCell resolves per-field synth
// ===========================================================================

describe("§B12.5 `lookupQualifiedStateCell` resolves per-field synth records", () => {
  test("`@signup.name.isValid` resolves to a synth record", () => {
    const src = `<program>\${ <signup><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);

    for (const property of PER_FIELD_SYNTH_PROPERTIES) {
      const rec = lookupQualifiedStateCell(sym.fileScope, ["signup", "name", property]);
      expect(rec).toBeDefined();
      expect(rec).not.toBeNull();
      expect(rec.isSynthesized).toBe(true);
      expect(rec.synthProperty).toBe(property);
      expect(rec.qualifiedPath).toBe("signup.name." + property);
    }
  });

  test("`@signup.name.submitted` does NOT resolve (compound-level only)", () => {
    const src = `<program>\${ <signup><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);

    const rec = lookupQualifiedStateCell(sym.fileScope, ["signup", "name", "submitted"]);
    expect(rec).toBeNull();
  });
});

// ===========================================================================
// §B12.6 — E-SYNTHESIZED-WRITE on `@form.email.isValid = false`
// ===========================================================================

describe("§B12.6 E-SYNTHESIZED-WRITE fires on per-field `isValid` write", () => {
  test("write to a per-field isValid fires", () => {
    const src = `<program>\${
      <form><email req> = <input type="text"/> </>
      function f() { @form.email.isValid = false }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@form.email.isValid");
    expect(fires[0].message).toContain("READ-ONLY");
    expect(fires[0].severity).toBe("error");
  });
});

// ===========================================================================
// §B12.7 — E-SYNTHESIZED-WRITE on `@form.email.errors = []`
// ===========================================================================

describe("§B12.7 E-SYNTHESIZED-WRITE fires on per-field `errors` write", () => {
  test("write to a per-field errors fires", () => {
    const src = `<program>\${
      <form><email req> = <input type="text"/> </>
      function f() { @form.email.errors = [] }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@form.email.errors");
  });
});

// ===========================================================================
// §B12.8 — E-SYNTHESIZED-WRITE on `@form.email.touched = true`
// ===========================================================================

describe("§B12.8 E-SYNTHESIZED-WRITE fires on per-field `touched` write", () => {
  test("write to a per-field touched fires", () => {
    const src = `<program>\${
      <form><email req> = <input type="text"/> </>
      function f() { @form.email.touched = true }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@form.email.touched");
  });
});

// ===========================================================================
// §B12.9 — `submitted` write at per-field scope does NOT fire
// ===========================================================================

describe("§B12.9 per-field `submitted` write does NOT fire E-SYNTHESIZED-WRITE", () => {
  test("write to `@form.email.submitted` at per-field scope is OOS", () => {
    // `submitted` is COMPOUND-LEVEL ONLY per §55.7 line 24468. A write to
    // `@form.email.submitted` is not a write to a synthesized property — the
    // per-field scope doesn't have `submitted`. The dev's write targets a
    // non-existent member; B12 does NOT fire E-SYNTHESIZED-WRITE here.
    // (Existing infra may surface the property as undefined at runtime;
    // that's not B12's concern.)
    const src = `<program>\${
      <form><email req> = <input type="text"/> </>
      function f() { @form.email.submitted = true }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });
});

// ===========================================================================
// §B12.10 — Runtime-hook annotations per §55.7
// ===========================================================================

describe("§B12.10 per-field synth records carry runtime-hook annotations", () => {
  test("per-field isValid + errors are pure-reactive (runtimeHookKind: null)", () => {
    const src = `<program>\${ <form><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);
    const fieldScope = sym.fileScope.stateCells.get("form")
      .declNode._scope.stateCells.get("name").declNode._scope;
    expect(fieldScope.stateCells.get("isValid").runtimeHookKind).toBeNull();
    expect(fieldScope.stateCells.get("errors").runtimeHookKind).toBeNull();
  });

  test("per-field touched is event-driven (runtimeHookKind: 'touch')", () => {
    const src = `<program>\${ <form><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);
    const fieldScope = sym.fileScope.stateCells.get("form")
      .declNode._scope.stateCells.get("name").declNode._scope;
    expect(fieldScope.stateCells.get("touched").runtimeHookKind).toBe("touch");
  });
});

// ===========================================================================
// §B12.11 — Nested compound: per-field at every level
// ===========================================================================

describe("§B12.11 nested compound — per-field surface attaches at every compound level", () => {
  test("`<form><address><street>=\"\"</></>` registers per-field on street", () => {
    const src = `<program>\${
      <form>
        <address>
          <street>=""
          <city>=""
        </>
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const formRec = sym.fileScope.stateCells.get("form");
    const addressRec = formRec.declNode._scope.stateCells.get("address");
    expect(addressRec.isCompoundParent).toBe(true);

    // address is a COMPOUND-typed child; B12 deliberately skips per-field
    // registration (the compound-level synth on address's compound-scope
    // already serves the per-field view per `registerPerFieldSynthSurface`).
    // address.declNode._scope is the compound scope (kind:"compound"), NOT
    // a kind:"field" scope.
    expect(addressRec.declNode._scope.kind).toBe("compound");

    // The street child (regular field, non-compound) gets per-field surface.
    const streetRec = addressRec.declNode._scope.stateCells.get("street");
    expect(streetRec).toBeDefined();
    expect(streetRec.isCompoundParent).toBe(false);
    expect(streetRec.declNode._scope).toBeDefined();
    expect(streetRec.declNode._scope.kind).toBe("field");
    expect(streetRec.declNode._scope.stateCells.size).toBe(3);

    // The city child likewise.
    const cityRec = addressRec.declNode._scope.stateCells.get("city");
    expect(cityRec.declNode._scope.kind).toBe("field");
    expect(cityRec.declNode._scope.stateCells.size).toBe(3);
  });

  test("`@form.address.street.isValid` resolves via lookupQualifiedStateCell (depth-3)", () => {
    const src = `<program>\${
      <form>
        <address>
          <street>=""
        </>
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const rec = lookupQualifiedStateCell(
      sym.fileScope,
      ["form", "address", "street", "isValid"],
    );
    expect(rec).toBeDefined();
    expect(rec).not.toBeNull();
    expect(rec.isSynthesized).toBe(true);
    expect(rec.qualifiedPath).toBe("form.address.street.isValid");
  });

  test("compound-typed child (address) — `getPerFieldSynthRecords` returns []", () => {
    // address is a compound parent; its synth surface lives at compound-level
    // (B11), not at per-field-level. `getPerFieldSynthRecords` returns [] for
    // compound parents; consumers should use `getSynthRecords` for that case.
    const src = `<program>\${
      <form><address><street>="" </> </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const addressRec = sym.fileScope.stateCells.get("form")
      .declNode._scope.stateCells.get("address");
    expect(getPerFieldSynthRecords(addressRec.declNode)).toEqual([]);
    // But getSynthRecords (compound-level API) returns 4.
    expect(getSynthRecords(addressRec.declNode).length).toBe(4);
  });
});

// ===========================================================================
// §B12.12 — Public read APIs
// ===========================================================================

describe("§B12.12 B12 public read APIs", () => {
  test("`getPerFieldSynthRecords(fieldDecl)` returns three records in order", () => {
    const src = `<program>\${ <signup><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);

    const nameRec = sym.fileScope.stateCells.get("signup")
      .declNode._scope.stateCells.get("name");
    const recs = getPerFieldSynthRecords(nameRec.declNode);
    expect(recs.length).toBe(3);
    expect(recs.map((r) => r.synthProperty)).toEqual([
      "isValid", "errors", "touched",
    ]);
    for (const r of recs) {
      expect(r.isSynthesized).toBe(true);
      expect(r.parentField).toBe(nameRec);
    }
  });

  test("`getPerFieldSynthRecords` returns [] for top-level cells, null, undefined", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { sym } = buildAndRun(src);
    const countRec = sym.fileScope.stateCells.get("count");
    expect(getPerFieldSynthRecords(countRec.declNode)).toEqual([]);
    expect(getPerFieldSynthRecords(null)).toEqual([]);
    expect(getPerFieldSynthRecords(undefined)).toEqual([]);
  });

  test("`isSynthesizedCell` discriminates per-field synth records", () => {
    const src = `<program>\${ <form><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);

    const nameRec = sym.fileScope.stateCells.get("form")
      .declNode._scope.stateCells.get("name");
    const synthRec = nameRec.declNode._scope.stateCells.get("isValid");
    expect(isSynthesizedCell(synthRec)).toBe(true);
    expect(isSynthesizedCell(nameRec)).toBe(false);
  });

  test("`PER_FIELD_SYNTH_PROPERTIES` is a stable export with 3 entries", () => {
    expect(PER_FIELD_SYNTH_PROPERTIES.length).toBe(3);
    expect([...PER_FIELD_SYNTH_PROPERTIES]).toEqual([
      "isValid", "errors", "touched",
    ]);
  });
});

// ===========================================================================
// §B12.13 — Cross-field validators (no synth-related cycles)
// ===========================================================================

describe("§B12.13 cross-field validator deps (B10 Phase 3 + B12 surface)", () => {
  test("`<confirm req eq(@signup.password)>` registers per-field surfaces; no synth-related cycle", () => {
    const src = `<program>\${
      <signup>
        <password req length(>=8)> = <input type="password"/>
        <confirm req eq(@signup.password)> = <input type="password"/>
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const signupRec = sym.fileScope.stateCells.get("signup");
    const compoundScope = signupRec.declNode._scope;

    const passwordRec = compoundScope.stateCells.get("password");
    const confirmRec = compoundScope.stateCells.get("confirm");

    // Both fields get per-field surfaces.
    expect(passwordRec.declNode._scope.stateCells.size).toBe(3);
    expect(confirmRec.declNode._scope.stateCells.size).toBe(3);

    // Per-field synth records resolve via lookupQualifiedStateCell.
    const confirmIsValid = lookupQualifiedStateCell(
      sym.fileScope, ["signup", "confirm", "isValid"],
    );
    expect(confirmIsValid).toBeDefined();
    expect(confirmIsValid.isSynthesized).toBe(true);

    // No false-positive synth-related cycle errors. (B7's
    // E-VALIDATOR-CIRCULAR-DEP fires on TRUE cycles only; this case isn't a
    // cycle — confirm reads password but password doesn't read confirm.)
    const cycles = errsByCode(sym, "E-VALIDATOR-CIRCULAR-DEP");
    expect(cycles.length).toBe(0);
  });
});

// ===========================================================================
// §B12.14 — `parentField` + `parentCompound` back-pointers
// ===========================================================================

describe("§B12.14 per-field synth records carry parentField + parentCompound back-pointers", () => {
  test("each synth record points at field AND compound; qualifiedPath is compound.field.prop", () => {
    const src = `<program>\${
      <signup>
        <name req> = <input type="text"/>
        <email req> = <input type="text"/>
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const signupRec = sym.fileScope.stateCells.get("signup");
    const compoundScope = signupRec.declNode._scope;
    for (const fieldName of ["name", "email"]) {
      const fieldRec = compoundScope.stateCells.get(fieldName);
      const synthRecs = getPerFieldSynthRecords(fieldRec.declNode);
      expect(synthRecs.length).toBe(3);
      for (const synth of synthRecs) {
        expect(synth.parentField).toBe(fieldRec);
        expect(synth.parentCompound).toBe(signupRec);
        expect(synth.qualifiedPath).toBe(`signup.${fieldName}.${synth.synthProperty}`);
        expect(synth.scope).toBe(fieldRec.declNode._scope);
        // declNode anchors at the FIELD's decl (not the compound's).
        expect(synth.declNode).toBe(fieldRec.declNode);
      }
    }
  });

  test("compound-level vs per-field discriminant: parentField present iff per-field", () => {
    const src = `<program>\${ <signup><name req> = <input type="text"/> </> }</program>`;
    const { sym } = buildAndRun(src);

    const signupRec = sym.fileScope.stateCells.get("signup");
    const compoundSynthRec = signupRec.declNode._scope.stateCells.get("isValid");
    expect(compoundSynthRec.parentCompound).toBe(signupRec);
    expect(compoundSynthRec.parentField).toBeUndefined();

    const nameRec = signupRec.declNode._scope.stateCells.get("name");
    const perFieldSynthRec = nameRec.declNode._scope.stateCells.get("isValid");
    expect(perFieldSynthRec.parentField).toBe(nameRec);
    expect(perFieldSynthRec.parentCompound).toBe(signupRec);
  });
});

// ===========================================================================
// §B12.15 — Negative cases (no false fires)
// ===========================================================================

describe("§B12.15 negative — non-synth per-field writes do NOT fire", () => {
  test("write to a regular per-field member (`@form.name.foo = 1`) does NOT fire", () => {
    // The leaf `foo` is not in SYNTH_PROPERTY_NAMES. The dev is writing to
    // a non-synth member; B12 doesn't fire (whatever the runtime semantics
    // of writing to a string field's `.foo` is, that's not B12's concern).
    const src = `<program>\${
      <form><name>="" </>
      function f() { @form.name.foo = 1 }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });

  test("read of `@form.name.isValid` (no assignment) does NOT fire", () => {
    const src = `<program>\${
      <form><name req> = <input type="text"/> </>
      function f() { let valid = @form.name.isValid }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });

  test("write to a non-existent per-field path does NOT fire", () => {
    const src = `<program>\${
      <form><name>="" </>
      function f() { @form.nonexistent.isValid = false }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });

  test("compound-scope writes still fire (B11 behavior preserved)", () => {
    const src = `<program>\${
      <form><name req> = <input type="text"/> </>
      function f() { @form.isValid = false }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain("@form.isValid");
  });

  test("write to a non-compound's child path does NOT fire (no compound resolved)", () => {
    const src = `<program>\${
      function f() { @nonexistent.field.isValid = false }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-SYNTHESIZED-WRITE");
    expect(fires.length).toBe(0);
  });
});

// ===========================================================================
// §B12.16 — Multi-field compound: each field has its own surface
// ===========================================================================

describe("§B12.16 multi-field compound — each field has its own per-field surface", () => {
  test("three fields → three independent field-scopes; nine total per-field synth records", () => {
    const src = `<program>\${
      <signup>
        <name req length(>=2)> = <input type="text"/>
        <email req pattern(/^.+@.+$/)> = <input type="email"/>
        <age min(18)> = <input type="number"/>
      </>
    }</program>`;
    const { sym } = buildAndRun(src);

    const signupRec = sym.fileScope.stateCells.get("signup");
    const compoundScope = signupRec.declNode._scope;

    let totalSynthRecs = 0;
    for (const fieldName of ["name", "email", "age"]) {
      const fieldRec = compoundScope.stateCells.get(fieldName);
      expect(fieldRec).toBeDefined();
      expect(fieldRec.declNode._scope).toBeDefined();
      const fieldScope = fieldRec.declNode._scope;
      expect(fieldScope.kind).toBe("field");
      expect(fieldScope.stateCells.size).toBe(3);
      // Each scope is a DISTINCT object (no aliasing).
      for (const otherFieldName of ["name", "email", "age"]) {
        if (otherFieldName === fieldName) continue;
        const otherFieldRec = compoundScope.stateCells.get(otherFieldName);
        expect(fieldScope).not.toBe(otherFieldRec.declNode._scope);
      }
      totalSynthRecs += getPerFieldSynthRecords(fieldRec.declNode).length;
    }
    expect(totalSynthRecs).toBe(9); // 3 fields × 3 props
  });
});
