/* SPDX-License-Identifier: MIT
 * g-engine-autodecl-bare-variant-write (S205) — bare-variant inference at a
 * comparison position INSIDE a `return` expression in a sibling `function`
 * body. Closes the gap filed S195 (the 16-remote-data wave-1a grounding
 * surfaced "why 16 went <match>, not <engine>").
 *
 * Root (R26 verify): the gap was scoped engine-specific, but the real root is
 * BROADER. The `return-stmt` case in type-system.ts visitNode wired the
 * return-TYPE-context walker (`inferBareVariantsInExpr`, S84 Gap B.3) and the
 * call-arg walker (Gap B.4) but NOT the comparison-site pre-pass
 * (`inferBareVariantsAtComparisonSites`) that the if/while-condition (line
 * ~9786) and reactive-init (line ~9037) sites already thread. So a
 * `return @cell == .V` fed the bare `.V` straight to the return-type walker
 * with the FN RETURN type as context (`-> bool`), which is not the variant's
 * enum → spurious E-VARIANT-AMBIGUOUS ("position type is not an enum"). This
 * was explicitly logged as OUT-OF-SCOPE in
 * bare-variant-binary-expr-inference.test.js's S84 header ("return-stmt ...
 * these positions do not currently invoke the bare-variant inference walker").
 *
 * SPEC ruling:
 *   - §14.10 — a bare `.V` resolves against "a previously-declared cell or
 *     local with a known type (`@cell = .V` where `@cell: T`)" AND names an
 *     engine `for=T` qualifier as a resolving locus. The implicit seventh
 *     position ("any other position where the type is fixed by the surrounding
 *     declaration") covers a `@cell == .V` comparison — the cell's enum fixes
 *     the variant context.
 *   - §51.0.C — the engine auto-declared variable IS a reactive state cell
 *     typed to the engine's enum; "readable everywhere via canonical access."
 *   - §7.6.1 — file-level cells are reachable from every subsequent `${}`
 *     block and fn body in the file; the engine auto-cell participates in file
 *     scope identically, so a sibling fn body sees its type via the scopeChain.
 *
 * Fix: add `inferBareVariantsAtComparisonSites(retExprNode, scopeChain, ...)`
 * to the return-stmt case BEFORE the return-type walker. The helper stamps
 * `_bareVariantInferredAtBinaryExpr` so the contextType walker SKIPS resolved
 * idents — no double-fire. A bare `.V` NOT at a comparison position (`return
 * .V`) stays unstamped; a genuinely-ambiguous comparison still errors.
 */

import { describe, test, expect } from "bun:test";
import { runTS } from "../../src/type-system.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function compile(source, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
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
// §1 — positive: `return @cell == .V` resolves vs the cell's enum
// ===========================================================================

describe("§1 positive — bare variant at return-stmt comparison position", () => {
  test("§1.1 engine auto-cell, `return @phase == .Loading` — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      function isLoading() -> bool { return @phase == .Loading }
    }
    <engine for=Phase initial=.Idle>
      <Idle    rule=.Loading></>
      <Loading rule=.Done></>
      <Done></>
    </>
    <p>\${ isLoading() }</p></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
    expect(errsByCode(errors, "E-STATE-UNDECLARED").length).toBe(0);
  });

  test("§1.2 plain typed cell, `return @phase == .Loading` — no fire", () => {
    // Confirms the root is NOT engine-specific: any typed cell works.
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      <phase>: Phase = .Idle
      function isLoading() -> bool { return @phase == .Loading }
    }
    <p>\${ isLoading() }</p></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§1.3 `is`-operator comparison in return — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      function isIdle() -> bool { return @phase is .Idle }
    }
    <engine for=Phase initial=.Idle>
      <Idle    rule=.Loading></>
      <Loading rule=.Done></>
      <Done></>
    </>
    <p>\${ isIdle() }</p></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
  });

  test("§1.4 every declared variant resolves cleanly via `return == `", () => {
    for (const v of ["Idle", "Loading", "Done"]) {
      const src = `<program>\${
        type Phase:enum = { Idle, Loading, Done }
        function chk() -> bool { return @phase == .${v} }
      }
      <engine for=Phase initial=.Idle>
        <Idle    rule=.Loading></>
        <Loading rule=.Done></>
        <Done></>
      </>
      <p>\${ chk() }</p></program>`;
      const { errors } = compile(src);
      expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
      expect(errsByCode(errors, "E-TYPE-063").length).toBe(0);
    }
  });
});

// ===========================================================================
// §2 — negatives: the fix must NOT over-relax
// ===========================================================================

describe("§2 negatives — no over-relax at the return-stmt site", () => {
  test("§2.1 `return .Loading` (NOT a comparison) where ret is bool — STILL errors", () => {
    // The bare variant is at a return-VALUE position, not a comparison; the
    // fn's `-> bool` return type is not the variant's enum.
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      function bad() -> bool { return .Loading }
    }
    <engine for=Phase initial=.Idle>
      <Idle    rule=.Loading></>
      <Loading rule=.Done></>
      <Done></>
    </>
    <p>\${ bad() }</p></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBeGreaterThan(0);
  });

  test("§2.2 `return @phase == .Bogus` (typo, not in enum) — E-TYPE-063", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      function chk() -> bool { return @phase == .Bogus }
    }
    <engine for=Phase initial=.Idle>
      <Idle    rule=.Loading></>
      <Loading rule=.Done></>
      <Done></>
    </>
    <p>\${ chk() }</p></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-TYPE-063").length).toBeGreaterThan(0);
  });

  test("§2.3 union-shared `.V` comparison in return — STILL ambiguous", () => {
    const src = `<program>\${
      type A:enum = { Open, Shut }
      type B:enum = { Open, Locked }
      <thing>: A | B = .Open
      function chk() -> bool { return @thing == .Open }
    }
    <p>\${ chk() }</p></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBeGreaterThan(0);
  });

  test("§2.4 `return @count == .Loading` (cell is int, no enum context) — STILL errors", () => {
    const src = `<program>\${
      <count>: int = 0
      function chk() -> bool { return @count == .Loading }
    }
    <p>\${ chk() }</p></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// §3 — write-path regression (BUG-2 S102 + §14.10 position #2 still hold)
// ===========================================================================

describe("§3 write-path — bare-variant WRITES to the engine auto-cell still clean", () => {
  test("§3.1 sequential `@phase = .V` writes in a sibling fn — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      function load() {
        @phase = .Loading
        @phase = .Done
      }
    }
    <engine for=Phase initial=.Idle>
      <Idle    rule=.Loading></>
      <Loading rule=.Done></>
      <Done></>
    </>
    <button onclick=load()>x</button></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-STATE-UNDECLARED").length).toBe(0);
  });

  test("§3.2 `if (@phase == .Idle) { @phase = .Loading }` in a sibling fn — no fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Loading, Done }
      function toggle() { if (@phase == .Idle) { @phase = .Loading } }
    }
    <engine for=Phase initial=.Idle>
      <Idle    rule=.Loading></>
      <Loading rule=.Done></>
      <Done></>
    </>
    <button onclick=toggle()>x</button></program>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});
