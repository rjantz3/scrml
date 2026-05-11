/* SPDX-License-Identifier: MIT
 * Phase A1b Step B20 — Bare-variant inference (§14.10, M9, E-VARIANT-AMBIGUOUS).
 *
 * Source-of-truth: SPEC §14.10 (line 7149-7183) — six inference positions +
 * E-VARIANT-AMBIGUOUS fire conditions. §34 catalog row at line 14233 (currently
 * §18.0.3-only; B20 surfaces this as a SPEC-PROSE follow-up).
 *
 * **What B20 SHIPS:**
 *   - Helper `inferBareVariantsInExpr` walks ExprNode trees and resolves bare-variant
 *     IdentExprs (`name: ".Variant"`) against an LHS-driven contextType.
 *   - Wired into:
 *       * `state-decl` case (position 1: `<x>: T = .V`).
 *       * `let-decl` / `const-decl` case (position 1b: `let x: T = .V`).
 *   - Fires `E-VARIANT-AMBIGUOUS` when:
 *       * No type context (no annotation): `<x> = .Small` / `let x = .Small`.
 *       * Position type is a UNION with multiple enum members declaring the
 *         same variant name (`MarioState | HealthRisk` both have `.Small`).
 *       * Position type is `asIs` / `unknown` / non-enum / non-union.
 *   - Fires `E-TYPE-063` when:
 *       * Variant exists in the position's enum context but is NOT declared in
 *         that enum (typo / unknown).
 *       * Variant is not declared in any enum member of a position-type union.
 *
 * **OUT OF SCOPE for B20** (per BRIEF):
 *   - §18.0.3 match-arm pattern bare-variants (handled by exhaustiveness today;
 *     ambiguity check in arm patterns deferred).
 *   - Engine `initial=.Variant` (§51.0.B / position 6) — B14/B15 already cover.
 *   - Function param type (position 3) — requires FunctionType.params upgrade.
 *   - Function return type (position 4) — requires return-type capture.
 *   - Compound-nav `@compound.field = .V` — depends on compound-nav typing.
 *
 * Spec authority:
 *   §14.10 — Bare-variant inference (M9), normative statements + six positions.
 *   §34    — error catalog (row at line 14233 — E-VARIANT-AMBIGUOUS).
 */

import { describe, test, expect } from "bun:test";
import { runTS } from "../../src/type-system.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compile a scrml source string up to TS and return the diagnostics.
 * Mirrors the B22 / B19 / B18 test scaffolding (block-splitter → buildAST → runTS).
 */
function compile(source, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  // runTS expects a FileAST. Build a minimal one with empty maps.
  const fileAST = {
    filePath,
    source,
    nodes: ast.nodes ?? [],
    machineDecls: ast.machineDecls ?? [],
    typeDecls: ast.typeDecls ?? [],
    components: ast.components ?? [],
    imports: ast.imports ?? [],
    exports: ast.exports ?? [],
    ast,
  };
  const result = runTS({
    files: [fileAST],
    protectAnalysis: { views: new Map() },
    routeMap: { functions: new Map() },
  });
  return { ast, errors: result.errors };
}

function errsByCode(errors, code) {
  return (errors ?? []).filter((e) => e?.code === code);
}

// ===========================================================================
// §B20.1 — POSITIVE: Position 1 (state-decl LHS annotation) — bare variant resolves
// ===========================================================================

describe("§B20.1 positive — state-decl `<x>: T = .V` resolves bare variant", () => {
  test("§B20.1.1 enum LHS — bare variant matches a declared variant", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire, Cape }
      <state>: MarioState = .Small
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.1.2 enum LHS — every declared variant resolves cleanly", () => {
    // Run separately for each variant — combining them in one decl would
    // reuse the same name and conflict.
    for (const v of ["Small", "Big", "Fire", "Cape"]) {
      const src = `<program>\${
        type MarioState:enum = { Small, Big, Fire, Cape }
        <state>: MarioState = .${v}
      }</program>`;
      const { errors } = compile(src);
      expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
      expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
    }
  });
});

// ===========================================================================
// §B20.2 — NEGATIVE: Position 1 — bare variant unknown to enum
// ===========================================================================

describe("§B20.2 negative — `.UnknownVariant` fires E-TYPE-063", () => {
  test("§B20.2.1 unknown variant → E-TYPE-063 with known list", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire, Cape }
      <state>: MarioState = .Tanooki
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Tanooki/);
    expect(e063[0].message).toMatch(/MarioState/);
  });

  test("§B20.2.2 unknown variant → silent on E-VARIANT-AMBIGUOUS (different code)", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      <state>: MarioState = .Bogus
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §B20.3 — NEGATIVE: Position 1 — no annotation = no type context
// ===========================================================================

describe("§B20.3 negative — `<x> = .V` (no annotation) fires E-VARIANT-AMBIGUOUS", () => {
  test("§B20.3.1 state-decl without annotation, bare variant → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      <state> = .Small
    }</program>`;
    const { errors } = compile(src);
    const e = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(e.length).toBeGreaterThanOrEqual(1);
    expect(e[0].message).toMatch(/\.Small/);
    expect(e[0].message).toMatch(/no.*type context|no resolvable/);
  });
});

// ===========================================================================
// §B20.4 — POSITIVE: Position 1b (let/const-decl LHS annotation) — resolves
// ===========================================================================

describe("§B20.4 positive — `let x: T = .V` resolves bare variant", () => {
  test("§B20.4.1 let-decl with enum annotation — bare variant clean", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      let p: Phase = .Idle
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.4.2 const-decl with enum annotation — bare variant clean", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      const p: Phase = .Loading
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });
});

// ===========================================================================
// §B20.5 — NEGATIVE: Position 1b — let with bare variant + unknown
// ===========================================================================

describe("§B20.5 negative — let with annotation, `.Bogus` fires E-TYPE-063", () => {
  test("§B20.5.1 unknown variant in known enum → E-TYPE-063", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading }
      let p: Phase = .Done
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Done/);
  });
});

// ===========================================================================
// §B20.6 — NEGATIVE: Position 1b — let without annotation = no context
// ===========================================================================

describe("§B20.6 negative — `let x = .V` (no annotation) fires E-VARIANT-AMBIGUOUS", () => {
  test("§B20.6.1 let-decl without annotation → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      let x = .Small
    }</program>`;
    const { errors } = compile(src);
    const e = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(e.length).toBeGreaterThanOrEqual(1);
    expect(e[0].message).toMatch(/\.Small/);
  });

  test("§B20.6.2 const-decl without annotation → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      const x = .Big
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// §B20.7 — NEGATIVE: union with shared variant name — E-VARIANT-AMBIGUOUS
// ===========================================================================

describe("§B20.7 negative — union with shared variant fires E-VARIANT-AMBIGUOUS", () => {
  test("§B20.7.1 union of two enums sharing `.Small` → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire }
      type HealthRisk:enum = { Small, Critical }
      let v: MarioState | HealthRisk = .Small
    }</program>`;
    const { errors } = compile(src);
    const e = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(e.length).toBeGreaterThanOrEqual(1);
    expect(e[0].message).toMatch(/\.Small/);
    expect(e[0].message).toMatch(/MarioState/);
    expect(e[0].message).toMatch(/HealthRisk/);
  });

  test("§B20.7.2 union with unique variant resolves cleanly (only one declarer)", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire }
      type HealthRisk:enum = { Critical }
      let v: MarioState | HealthRisk = .Big
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.7.3 union with no declarer fires E-TYPE-063 listing all enum names", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      type HealthRisk:enum = { Critical }
      let v: MarioState | HealthRisk = .Bogus
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Bogus/);
  });
});

// ===========================================================================
// §B20.8 — POSITIVE: bare variant in non-leaf positions (ternary, array, call arg)
// ===========================================================================

describe("§B20.8 positive — bare variant resolves in nested expressions", () => {
  test("§B20.8.1 ternary branch — bare variants resolve from LHS context", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      <state>: Phase = (1 > 0) ? .Idle : .Loading
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.8.2 ternary with one unknown variant → E-TYPE-063 only", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      <state>: Phase = (1 > 0) ? .Idle : .Bogus
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Bogus/);
  });
});

// ===========================================================================
// §B20.9 — NEGATIVE: position type is non-enum primitive — fires
// ===========================================================================

describe("§B20.9 negative — non-enum context fires E-VARIANT-AMBIGUOUS", () => {
  test("§B20.9.1 `let x: number = .Small` (impossible) → E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      let x: number = .Small
    }</program>`;
    const { errors } = compile(src);
    // The non-enum context branch fires E-VARIANT-AMBIGUOUS per the helper's
    // last-resort fallback (per §14.10 line 7174's wording).
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// §B20.10 — POSITIVE: fully-qualified form remains legal (no false fire)
// ===========================================================================

describe("§B20.10 positive — fully-qualified `T.Variant` does not fire", () => {
  test("§B20.10.1 `MarioState.Small` form (no leading dot) — no fire", () => {
    // Note: this form parses as MemberExpr(Ident("MarioState"), "Small")
    // which is NOT a bare-variant IdentExpr, so the helper is silent on it.
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      <state>: MarioState = MarioState.Small
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §B20.11 — POSITIVE: regression — no spurious fires on plain idents starting `.`
//
// The helper's regex `^[A-Z][A-Za-z0-9_]*$` on the post-dot tail ensures we
// only fire on properly-cased variant names. Defensive coverage.
// ===========================================================================

describe("§B20.11 regression — non-bare-variant idents are skipped", () => {
  test("§B20.11.1 reactive ref `@cell` (no leading dot) is silent", () => {
    const src = `<program>\${
      type Phase:enum = { Idle }
      <state>: Phase = .Idle
      <other>: Phase = @state
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });

  test("§B20.11.2 numeric literal in init is silent", () => {
    const src = `<program>\${
      let x: number = 42
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §B20.12 — Engine `initial=` (position 6) regression — B15 still owns this
// ===========================================================================

describe("§B20.12 regression — engine `initial=.V` (B15 territory) unchanged", () => {
  test("§B20.12.1 engine with valid initial= variant — no B20 fires", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big }
      <engine for=MarioState initial=.Small>
        <Small></>
        <Big></>
      </>
    }</program>`;
    const { errors } = compile(src);
    // B20 does not interfere with engine attributes — its scope is state-decl
    // and let/const-decl init expressions only.
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §B20.13 — Bug 7 (M9): reassignment position uses scope-chain type context
//
// `<phase>: Phase = .Idle` declares the cell with enum type. A subsequent
// `@phase = .Loading` inside a function body parses as a fresh `state-decl`
// node with NO typeAnnotation, but §14.10 normative position #2 says the
// LHS cell's already-known type IS the context. The state-decl visitor must
// look up `@phase` in the scope chain and use the prior reactive entry's
// resolvedType as contextType — falling back to null only on lookup miss.
// ===========================================================================

describe("§B20.13 Bug 7 — reassignment `@cell = .V` infers from prior decl type", () => {
  test("§B20.13.1 reassignment with enum-typed cell — bare variant resolves cleanly", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Loaded }
      <phase>: Phase = .Idle
      function go() {
        @phase = .Loading
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.13.2 qualified-form reassignment continues to pass (backward compat)", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Loaded }
      <phase>: Phase = .Idle
      function go() {
        @phase = Phase.Loading
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });

  test("§B20.13.3 unknown variant on reassignment fires E-TYPE-063 (not E-VARIANT-AMBIGUOUS)", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading }
      <phase>: Phase = .Idle
      function go() {
        @phase = .Loaded
      }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Loaded/);
    expect(e063[0].message).toMatch(/Phase/);
  });

  test("§B20.13.4 ambiguous union reassignment fires E-VARIANT-AMBIGUOUS", () => {
    const src = `<program>\${
      type MarioState:enum = { Small, Big, Fire }
      type HealthRisk:enum = { Small, Critical }
      <picker>: MarioState | HealthRisk = MarioState.Big
      function go() {
        @picker = .Small
      }
    }</program>`;
    const { errors } = compile(src);
    const e = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(e.length).toBeGreaterThanOrEqual(1);
    expect(e[0].message).toMatch(/\.Small/);
  });

  test("§B20.13.5 reassignment of non-enum cell still fires E-VARIANT-AMBIGUOUS (scope-miss kind)", () => {
    // A `let x = .Small` style top-level decl would itself fire on declare.
    // Here a cell typed `number` is reassigned to a bare variant — the prior
    // entry exists but its resolvedType is not enum/union, so the lookup
    // does not supply a context, and the helper's non-enum fallback fires.
    const src = `<program>\${
      <count>: number = 0
      function bump() {
        @count = .Small
      }
    }</program>`;
    const { errors } = compile(src);
    // We accept either E-VARIANT-AMBIGUOUS (helper's no-context fallback)
    // OR another upstream diagnostic; the contract is "not a silent pass".
    const ambiguous = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(ambiguous.length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// §B20.14 — Bug 7 (M9): engine-transition call `@cell.advance(.V)`
//
// Companion fire-site to §B20.13: a bare-expr whose root is a CallExpr with
// a member callee on a reactive ident. `inferReactiveSiteBareVariants` looks
// up the cell, and if its resolvedType is enum or union, walks the args with
// that contextType. Method name is not constrained — the engine transition
// legality check (`checkTransitionCallsInExpr`) gates which methods are valid.
// ===========================================================================

describe("§B20.14 Bug 7 — `@cell.advance(.V)` infers from cell type", () => {
  test("§B20.14.1 valid bare variant on reactive method call — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Loaded }
      <phase>: Phase = .Idle
      function go() {
        @phase.advance(.Loading)
      }
    }</program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§B20.14.2 unknown bare variant on reactive method call fires E-TYPE-063", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading }
      <phase>: Phase = .Idle
      function go() {
        @phase.advance(.Loaded)
      }
    }</program>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Loaded/);
    expect(e063[0].message).toMatch(/Phase/);
  });

  test("§B20.14.3 method call on non-enum cell — silent fall-through (existing diagnostic owns it)", () => {
    // A cell typed `number` calls a method with a bare variant arg. The
    // reactive-site helper finds no enum/union context and silently falls
    // through. Upstream diagnostics (transition legality, type checks) are
    // responsible — `inferReactiveSiteBareVariants` itself does not fire.
    const src = `<program>\${
      <count>: number = 0
      function bump() {
        @count.advance(.Small)
      }
    }</program>`;
    const { errors } = compile(src);
    // Whatever upstream fires, this helper itself must not synthesize a
    // duplicate E-VARIANT-AMBIGUOUS or E-TYPE-063 — the test asserts the
    // helper's silent-fallthrough contract by allowing zero variant-resolved
    // diagnostics if the upstream path doesn't surface one. We do not assert
    // a specific upstream code; this is a no-spurious-fire regression test.
    const variantFires = (errors ?? []).filter(
      (e) => e?.code === "E-VARIANT-AMBIGUOUS" || e?.code === "E-TYPE-063",
    );
    // Helper must not invent diagnostics on non-enum cell. Some upstream
    // checks (e.g. transition legality) may still flag separately; those
    // surface under different codes. Accept 0 variant-codes.
    expect(variantFires.length).toBe(0);
  });
});
