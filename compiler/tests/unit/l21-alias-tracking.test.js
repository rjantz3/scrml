/**
 * Phase A4 (S134) — L21 alias-tracking extension for E-DERIVED-VALUE-MUTATE.
 *
 * Tests the PASS 2.c walker (`walkRegisterLocalAliases`) + the alias-aware
 * fallback in PASS 6 (`checkExprNodeForMutations`) that together close the
 * §6.6.18 spec-vs-impl drift the const-deep-freeze DD empirically verified at
 * S134. Per the ratified debate verdict: any write through a local alias of a
 * `const`-derived reactive cell fires `E-DERIVED-VALUE-MUTATE`, just as direct
 * `@cell.foo = x` writes do.
 *
 * Provenance model (per docs/changes/a4-l21-alias-tracking-2026-05-26/progress.md):
 *
 * Forward propagation (init shapes that PRODUCE an alias record):
 *   - `@cell` direct ident → alias of whole cell value
 *   - `@cell.foo` / `@cell.a.b` member chain → path alias
 *   - `@cell[i]` index access → indexed alias (computed-index sentinel)
 *   - `let b = a` where `a` is already an alias → transitive (flattened)
 *   - `let { a, b } = @cell` (destructure-object) → each binding aliases @cell.<field>
 *   - `let [first, second] = @cell` (destructure-array) → each binding aliases @cell[i]
 *
 * Chain breaks (init shapes that DO NOT produce an alias record):
 *   - `[...@cell]` / `{...@cell}` spread → NEW value
 *   - `let { ...rest } = @cell` / `let [...rest] = @cell` → NEW shallow copy
 *   - `{ x: @cell }` / `[@cell]` literal containers → NEW container
 *   - `@cell.foo + 1` binary/unary/conditional → NEW value
 *   - `g(@cell)` function-call result → conservative chain-break
 *   - `@cell.filter(x => x)` method-call return → new array (`.filter` etc. are non-mutating)
 *
 * Function/closure boundary:
 *   - When alias passed as arg to fn call: chain-break at call site (conservative).
 *   - When closure directly references `@cell.foo = y`: existing L21 walker handles via
 *     PASS 6 descent into function-decl bodies. No alias-tracking needed.
 *
 * Spec authority:
 *   §6.6.18 — E-DERIVED-VALUE-MUTATE rule including normative "Forms NOT covered
 *             (legal): Local copies are mutable" (spread-copy chain-break).
 *   §34     — Error catalog row for E-DERIVED-VALUE-MUTATE.
 *   const-deep-freeze DD (2026-05-26) §3 — empirical 5-reproducer verification.
 *   design-insights.md S134 ratification (2026-05-26) — A4 sequenced ratify.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";

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
// §A4.1 — Forward propagation: FIRES E-DERIVED-VALUE-MUTATE through alias
// ===========================================================================

describe("§A4.1 forward propagation — aliased writes fire E-DERIVED-VALUE-MUTATE", () => {
  test("simple alias write: `let local = @score; local.rank = 5`", () => {
    const src = `<program>\${
      <player> = { rank: 0 }
      const <score> = { rank: @player.rank }
      function f() {
        let local = @score
        local.rank = 5
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@score");
    expect(fires[0].message).toContain("local");
    expect(fires[0].message).toContain("Alias chain");
    expect(fires[0].severity).toBe("error");
  });

  test("alias method-call: `let alias = @arr; alias.push(x)` fires", () => {
    const src = `<program>\${
      <items> = []
      const <arr> = @items.filter(i => i)
      function f() {
        let alias = @arr
        alias.push(1)
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@arr");
    expect(fires[0].message).toContain(".push(...)");
    expect(fires[0].message).toContain("alias");
  });

  test("destructured-field write: `const <cfg> = ...; let { host } = @cfg; host.port = 81`", () => {
    const src = `<program>\${
      <raw> = { host: { port: 80 } }
      const <cfg> = { host: @raw.host }
      function f() {
        let { host } = @cfg
        host.port = 81
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@cfg");
    expect(fires[0].message).toContain("host");
  });

  test("indexed-element write: `let item = @items[i]; item.foo = x` fires", () => {
    const src = `<program>\${
      <raw> = [{n:1},{n:2}]
      const <items> = @raw.filter(i => i)
      function f() {
        let item = @items[0]
        item.foo = "x"
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@items");
  });

  test("transitive-alias write: `let a = @cell; let b = a; b.foo = y` fires (flattened)", () => {
    const src = `<program>\${
      <raw> = { foo: 1 }
      const <cell> = { foo: @raw.foo }
      function f() {
        let a = @cell
        let b = a
        b.foo = 2
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@cell");
    // The diagnostic names the LEAF binding (`b`), not the intermediate (`a`).
    expect(fires[0].message).toContain("b");
  });

  test("compound-assignment via alias: `alias.count += 1` fires", () => {
    const src = `<program>\${
      <raw> = { count: 0 }
      const <cell> = { count: @raw.count }
      function f() {
        let alias = @cell
        alias.count += 1
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@cell");
    expect(fires[0].message).toContain("+=");
  });

  test("delete via alias: `delete alias.foo` fires", () => {
    const src = `<program>\${
      <raw> = { foo: 1, bar: 2 }
      const <cell> = { foo: @raw.foo, bar: @raw.bar }
      function f() {
        let alias = @cell
        delete alias.foo
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@cell");
    expect(fires[0].message).toContain("delete");
  });

  test("nested-path via alias: `alias.a.b.c = x` fires", () => {
    const src = `<program>\${
      <raw> = { a: { b: { c: 1 } } }
      const <cell> = { a: @raw.a }
      function f() {
        let alias = @cell
        alias.a.b.c = "x"
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@cell");
  });

  test("dotted-path alias write: `let h = @v.a; h.x = 1` fires", () => {
    const src = `<program>\${
      <raw> = { a: { x: 0 } }
      const <v> = { a: @raw.a }
      function f() {
        let h = @v.a
        h.x = 1
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@v");
  });

  test("array-destructure write: `let [first] = @items; first.x = y` fires", () => {
    const src = `<program>\${
      <raw> = [{x: 0}]
      const <items> = @raw.filter(i => i)
      function f() {
        let [first] = @items
        first.x = 1
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toContain("@items");
  });
});

// ===========================================================================
// §A4.2 — Chain breaks: DOES NOT fire (legitimate chain-break)
// ===========================================================================

describe("§A4.2 chain breaks — these patterns are legal per SPEC §6.6.18", () => {
  test("spread-copy: `let local = [...@cell]; local.push(x)` does NOT fire (per spec)", () => {
    const src = `<program>\${
      <items> = []
      const <cell> = @items.filter(i => i)
      function f() {
        let local = [...@cell]
        local.push(1)
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("object-spread copy: `let copy = {...@cell}; copy.foo = x` does NOT fire", () => {
    const src = `<program>\${
      <raw> = { foo: 1 }
      const <cell> = { foo: @raw.foo }
      function f() {
        let copy = {...@cell}
        copy.foo = 2
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("computed value via alias: `let v = @cell.foo + 1; v.x = y` does NOT fire", () => {
    const src = `<program>\${
      <raw> = { foo: 1 }
      const <cell> = { foo: @raw.foo }
      function f() {
        let v = @cell.foo + 1
        v.x = 1
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("function-call result: `let r = f(@cell); r.foo = x` does NOT fire (conservative)", () => {
    const src = `<program>\${
      <raw> = { foo: 1 }
      const <cell> = { foo: @raw.foo }
      function g(x) { return x }
      function f() {
        let r = g(@cell)
        r.foo = 2
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("object-literal field: `let w = { x: @cell }; w.x = newVal` does NOT fire", () => {
    // `w.x` is a NEW property on a new object literal. Writing `w.x = newVal`
    // replaces the property — it doesn't mutate `@cell`. Conservative chain-break.
    const src = `<program>\${
      <raw> = { foo: 1 }
      const <cell> = { foo: @raw.foo }
      function f() {
        let w = { x: @cell }
        w.x = "newVal"
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("rest destructure: `let { ...rest } = @cell; rest.foo = x` does NOT fire (per JS-spec shallow-copy)", () => {
    const src = `<program>\${
      <raw> = { foo: 1, bar: 2 }
      const <cell> = { foo: @raw.foo, bar: @raw.bar }
      function f() {
        let { ...rest } = @cell
        rest.foo = 99
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });
});

// ===========================================================================
// §A4.3 — Function/closure boundary
// ===========================================================================

describe("§A4.3 function/closure boundary", () => {
  test("function passes alias as arg: chain-break at call site (conservative)", () => {
    const src = `<program>\${
      <items> = []
      const <cell> = @items.filter(i => i)
      function mutate(x) { x.push(1) }
      function f() { mutate(@cell) }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("nested function-decl writes @cell.foo = y: existing L21 path fires", () => {
    // This is the EXISTING L21 direct-path firing — no new behavior. Asserts
    // alias-tracking didn't accidentally break the direct-path case for
    // structured function-decl bodies (which PASS 6 descends via the function
    // scope). NOTE: arrow-function bodies inside let-decl init exprs are
    // represented as `escape-hatch` nodes — neither direct-path NOR alias-
    // tracking fires inside them. That's a pre-existing L21 limitation; out
    // of scope for A4 (alias-tracking only).
    const src = `<program>\${
      <raw> = { foo: 1 }
      const <cell> = { foo: @raw.foo }
      function outer() {
        function inner() { @cell.foo = 2 }
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
  });
});

// ===========================================================================
// §A4.4 — Negative controls: no regression on legitimate code
// ===========================================================================

describe("§A4.4 negative controls — no false positives on legitimate code", () => {
  test("mutable-cell alias write: `<items> = []; let alias = @items; alias.push(x)` does NOT fire", () => {
    // The source cell is mutable (NOT const-derived), so aliasing + push is fine.
    const src = `<program>\${
      <items> = []
      function f() {
        let alias = @items
        alias.push(1)
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("independent let-decl: `let local = computeValue(); local.foo = x` does NOT fire", () => {
    // No alias link — local is independent of any derived cell.
    const src = `<program>\${
      function compute() { return { foo: 1 } }
      function f() {
        let local = compute()
        local.foo = 2
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("plain local with similar name: `let alias = { foo: 1 }; alias.foo = 2` does NOT fire", () => {
    // Name shape resembles an alias but there's no derived cell anywhere.
    const src = `<program>\${
      function f() {
        let alias = { foo: 1 }
        alias.foo = 2
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("alias of mutable cell via path: `let h = @cell.x; h.foo = y` does NOT fire (cell not const)", () => {
    const src = `<program>\${
      <cell> = { x: { foo: 1 } }
      function f() {
        let h = @cell.x
        h.foo = 2
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("alias READ-only: `let local = @cell; let v = local.foo` does NOT fire", () => {
    const src = `<program>\${
      <raw> = { foo: 1 }
      const <cell> = { foo: @raw.foo }
      function f() {
        let local = @cell
        let v = local.foo
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });

  test("alias to non-mutating method: `let local = @cell; let arr = local.filter(x => x)` does NOT fire", () => {
    const src = `<program>\${
      <items> = []
      const <cell> = @items.filter(i => i)
      function f() {
        let local = @cell
        let arr = local.filter(x => x)
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(0);
  });
});

// ===========================================================================
// §A4.5 — Diagnostic shape
// ===========================================================================

describe("§A4.5 alias diagnostic shape", () => {
  test("emits code, severity, span, alias-chain message", () => {
    const src = `<program>\${
      <items> = []
      const <derived> = @items.filter(i => i)
      function f() {
        let local = @derived
        local.push(1)
      }
    }</program>`;
    const { sym } = buildAndRun(src);
    const fires = errsByCode(sym, "E-DERIVED-VALUE-MUTATE");
    expect(fires.length).toBe(1);
    const d = fires[0];
    expect(d.code).toBe("E-DERIVED-VALUE-MUTATE");
    expect(d.severity).toBe("error");
    expect(d.span).toBeTruthy();
    expect(typeof d.span.file).toBe("string");
    expect(d.message).toContain("§6.6.18");
    expect(d.message).toContain("Alias chain");
    expect(d.message).toContain("`local` <- `@derived`");
    // Spread-copy hint surfaced in fix-advice.
    expect(d.message).toContain("[...@derived]");
  });
});
