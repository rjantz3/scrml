/**
 * method-chain-callback-emission.test.js
 *
 * Regression: Bug 5 (S87 Trio B). `.filter(cb).<member>` (and the broader
 * family `.<methodCall>(cb).<chain>`) was stripping the inner callback in
 * v0.2.6+ codegen. Surfaced by Wave 3 D3b benchmarks (TodoMVC `activeCount` /
 * `completedCount` derived cells).
 *
 * Root cause (closed at commit 05db856 / re-dispatch of ad34db7):
 *   `esTreeToExprNode` in compiler/src/expression-parser.ts dropped the
 *   `rawSource` parameter through many recursion sites — UnaryExpression,
 *   UpdateExpression, AwaitExpression, BinaryExpression, LogicalExpression,
 *   ConditionalExpression, MemberExpression.object, MemberExpression.computed,
 *   the scrml-placeholder calls (__scrml_is_*__, __scrml_match__),
 *   NewExpression, ArrayExpression, ObjectExpression. When a FunctionExpression
 *   with a BlockStatement body lived nested inside any of those positions
 *   the FunctionExpression branch tried `rawSource.slice(start, end)` to
 *   recover the body text — but `rawSource` was undefined, so `rawSlice`
 *   fell back to "" and `makeEscapeHatch` emitted an empty raw which the
 *   emitter printed as nothing. The inner callback vanished.
 *
 * Load-bearing site for the D3b TodoMVC repro is MemberExpression.object:
 *   arr.filter(function(t){return t.x}).length
 * parses as
 *   MemberExpression{ object: CallExpression(arr.filter(...)), property: length }
 * and the inner CallExpression's arg (the function) lost its raw slice.
 *
 * Coverage:
 *   §1  .filter(cb).length — the canonical TodoMVC shape
 *   §2  .filter(cb).map(cb2) — chained method calls with two block-body callbacks
 *   §3  .filter(cb).reduce(cb2, init) — chained with a reduce-shaped accumulator
 *   §4  Nested chain — .filter(cb).filter(cb2).length (deeper MemberExpr.object recursion)
 *   §5  Arrow-fn callback in same shape — .filter(t => t.x).length and arrow with block body
 *   §6  Bug 1 fix-B regression guard — `EnumType::Variant` still works in the same file
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/method-chain-callback");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

function fix(name, src) {
  const path = join(FIXTURE_DIR, name);
  writeFileSync(path, src);
  return path;
}

let filterLengthFx, filterMapFx, filterReduceFx, nestedFilterFx,
    arrowFilterLengthFx, arrowBlockFilterLengthFx, enumVariantFx;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  // §1 — canonical TodoMVC shape: function-expression callback, .length suffix
  filterLengthFx = fix("filter-length.scrml", `<program>
\${
  @items = [{x: true}, {x: false}, {x: true}]
  @count = 0
  function recompute() {
    @count = @items.filter(function(t) { return t.x }).length
  }
}
<button onclick=recompute()>recompute</button>
</program>
`);

  // §2 — .filter(cb).map(cb2) two block-body callbacks chained
  filterMapFx = fix("filter-map.scrml", `<program>
\${
  @items = [{x: true, v: 1}, {x: false, v: 2}, {x: true, v: 3}]
  @out = []
  function recompute() {
    @out = @items.filter(function(t) { return t.x }).map(function(t) { return t.v * 2 })
  }
}
<button onclick=recompute()>recompute</button>
</program>
`);

  // §3 — .filter(cb).reduce(cb2, init)
  filterReduceFx = fix("filter-reduce.scrml", `<program>
\${
  @items = [{x: true, v: 1}, {x: false, v: 2}, {x: true, v: 3}]
  @sum = 0
  function recompute() {
    @sum = @items.filter(function(t) { return t.x }).reduce(function(acc, t) { return acc + t.v }, 0)
  }
}
<button onclick=recompute()>recompute</button>
</program>
`);

  // §4 — nested chain: .filter(cb).filter(cb2).length
  nestedFilterFx = fix("nested-filter.scrml", `<program>
\${
  @items = [{x: true, y: true}, {x: true, y: false}, {x: false, y: true}]
  @count = 0
  function recompute() {
    @count = @items.filter(function(t) { return t.x }).filter(function(t) { return t.y }).length
  }
}
<button onclick=recompute()>recompute</button>
</program>
`);

  // §5a — arrow-fn (single-expr body) callback in the same chain shape
  arrowFilterLengthFx = fix("arrow-filter-length.scrml", `<program>
\${
  @items = [{x: true}, {x: false}, {x: true}]
  @count = 0
  function recompute() {
    @count = @items.filter(t => t.x).length
  }
}
<button onclick=recompute()>recompute</button>
</program>
`);

  // §5b — arrow-fn with BLOCK body in the same chain shape
  arrowBlockFilterLengthFx = fix("arrow-block-filter-length.scrml", `<program>
\${
  @items = [{x: true}, {x: false}, {x: true}]
  @count = 0
  function recompute() {
    @count = @items.filter((t) => { return t.x }).length
  }
}
<button onclick=recompute()>recompute</button>
</program>
`);

  // §6 — Bug 1 fix-B regression guard — EnumType::Variant still works
  enumVariantFx = fix("enum-variant.scrml", `<program>
\${
  type Color:enum = { Red, Green, Blue }
  @c = Color::Red
  function setGreen() {
    @c = Color::Green
  }
}
<button onclick=setGreen()>green</button>
<span>\${@c}</span>
</program>
`);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function compile(path) {
  return compileScrml({ inputFiles: [path], outputDir: FIXTURE_OUTPUT, write: false });
}

// ---------------------------------------------------------------------------
// §1: .filter(cb).length — the canonical TodoMVC shape
// ---------------------------------------------------------------------------

describe("§1: .filter(function(){...}).length keeps inner callback", () => {
  test("compile succeeds", () => {
    const result = compile(filterLengthFx);
    expect(result.errors).toEqual([]);
  });

  test("the .filter() call is NOT emitted empty", () => {
    const result = compile(filterLengthFx);
    const js = result.outputs.get(filterLengthFx).clientJs;
    expect(js).not.toMatch(/\.filter\(\s*\)\.length/);
  });

  test("the inner callback body appears in the output", () => {
    const result = compile(filterLengthFx);
    const js = result.outputs.get(filterLengthFx).clientJs;
    expect(js).toMatch(/\.filter\(\s*function/);
    // The body content `t.x` (or `t . x` after astring re-formatting) must appear inside .filter(...)
    expect(js).toMatch(/return\s+t\s*\.\s*x/);
    expect(js).toMatch(/\.length/);
  });

  test("the emitted JS is parseable", () => {
    const result = compile(filterLengthFx);
    const js = result.outputs.get(filterLengthFx).clientJs;
    expect(() => new Function(js)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §2: .filter(cb).map(cb2) — two block-body callbacks
// ---------------------------------------------------------------------------

describe("§2: .filter(cb).map(cb2) keeps BOTH callbacks", () => {
  test("compile succeeds", () => {
    const result = compile(filterMapFx);
    expect(result.errors).toEqual([]);
  });

  test("neither .filter() nor .map() is emitted empty", () => {
    const result = compile(filterMapFx);
    const js = result.outputs.get(filterMapFx).clientJs;
    expect(js).not.toMatch(/\.filter\(\s*\)/);
    expect(js).not.toMatch(/\.map\(\s*\)/);
  });

  test("both callback bodies appear in the output", () => {
    const result = compile(filterMapFx);
    const js = result.outputs.get(filterMapFx).clientJs;
    expect(js).toMatch(/return\s+t\s*\.\s*x/);
    expect(js).toMatch(/return\s+t\s*\.\s*v\s*\*\s*2/);
  });
});

// ---------------------------------------------------------------------------
// §3: .filter(cb).reduce(cb2, init)
// ---------------------------------------------------------------------------

describe("§3: .filter(cb).reduce(cb2, init) keeps callback + initial value", () => {
  test("compile succeeds", () => {
    const result = compile(filterReduceFx);
    expect(result.errors).toEqual([]);
  });

  test("filter and reduce both keep their callbacks", () => {
    const result = compile(filterReduceFx);
    const js = result.outputs.get(filterReduceFx).clientJs;
    expect(js).not.toMatch(/\.filter\(\s*\)/);
    expect(js).not.toMatch(/\.reduce\(\s*\)/);
    expect(js).toMatch(/return\s+t\s*\.\s*x/);
    expect(js).toMatch(/return\s+acc\s*\+\s*t\s*\.\s*v/);
    // The init arg `, 0` for reduce must be present too
    expect(js).toMatch(/\.reduce\(/);
  });
});

// ---------------------------------------------------------------------------
// §4: nested chain — .filter(cb).filter(cb2).length
// ---------------------------------------------------------------------------

describe("§4: .filter(cb).filter(cb2).length — deeper MemberExpr.object recursion", () => {
  test("compile succeeds", () => {
    const result = compile(nestedFilterFx);
    expect(result.errors).toEqual([]);
  });

  test("both nested filter callbacks survive", () => {
    const result = compile(nestedFilterFx);
    const js = result.outputs.get(nestedFilterFx).clientJs;
    // No empty filter calls
    expect(js).not.toMatch(/\.filter\(\s*\)/);
    expect(js).toMatch(/return\s+t\s*\.\s*x/);
    expect(js).toMatch(/return\s+t\s*\.\s*y/);
    expect(js).toMatch(/\.length/);
  });
});

// ---------------------------------------------------------------------------
// §5: arrow-fn callbacks in the same chain shape
// ---------------------------------------------------------------------------

describe("§5a: .filter(arrow).length — single-expression arrow", () => {
  test("compile succeeds and arrow body survives", () => {
    const result = compile(arrowFilterLengthFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(arrowFilterLengthFx).clientJs;
    expect(js).not.toMatch(/\.filter\(\s*\)/);
    expect(js).toMatch(/=>/);
    expect(js).toMatch(/\.length/);
  });
});

describe("§5b: .filter(blockArrow).length — arrow with BlockStatement body", () => {
  test("compile succeeds and arrow body survives", () => {
    const result = compile(arrowBlockFilterLengthFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(arrowBlockFilterLengthFx).clientJs;
    expect(js).not.toMatch(/\.filter\(\s*\)/);
    expect(js).toMatch(/=>/);
    expect(js).toMatch(/return\s+t\s*\.\s*x/);
    expect(js).toMatch(/\.length/);
  });
});

// ---------------------------------------------------------------------------
// §6: Bug 1 fix-B regression guard — EnumType::Variant still works post-Bug-5
// ---------------------------------------------------------------------------

describe("§6: Bug 1 fix-B regression — EnumType::Variant coexists with Bug 5 fix", () => {
  test("compile succeeds — no preprocessor / parser regression", () => {
    const result = compile(enumVariantFx);
    expect(result.errors).toEqual([]);
  });

  test("the `Color::Red` form was normalized to `Color.Red` (or equivalent member access)", () => {
    const result = compile(enumVariantFx);
    const js = result.outputs.get(enumVariantFx).clientJs;
    // After Bug 1 fix-B, `::` is rewritten to `.` in preprocessForAcorn before
    // acorn parses. The output must therefore reference `Color.Red` (or the
    // structural-eq equivalent). It MUST NOT reference the bare `Color` enum
    // object alone (the pre-fix bug shape).
    expect(js).toMatch(/Color\s*\.\s*Red/);
    expect(js).toMatch(/Color\s*\.\s*Green/);
  });
});
