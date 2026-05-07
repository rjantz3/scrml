/**
 * E-DERIVED-CIRCULAR-DEP — derived-cell circular dependency detection.
 *
 * Phase A1b Step B7 — exercises the cycle detection + pure-fn filter wired
 * into Stage 7 (Dependency Graph Builder, `compiler/src/dependency-graph.ts`).
 *
 * Spec references:
 *   - SPEC §6.6.10 (Circular Derived Dependencies)
 *   - SPEC §31.5  (Derived-state expression dependency tracking)
 *   - SPEC §48    (`fn` purity)
 *   - SPEC §34    (E-DERIVED-CIRCULAR-DEP catalog row)
 *
 * Audit reference:
 *   - docs/audits/a1b-b7-rule4-audit-2026-05-07.md
 *
 * Coverage:
 *   - Direct deps (no cycle)
 *   - Self-reference 1-cycle (degenerate; SPEC §6.6.10 line 2712)
 *   - Two-node cycle (a depends on b, b depends on a)
 *   - Multi-hop cycle (a -> b -> c -> a)
 *   - Transitive through reactive `function` — cycle DOES fire
 *   - Transitive through pure `fn` — NO cycle (pure has no implicit deps)
 *   - Legitimate chain (a -> b -> c, no cycle) — no false positive
 *   - Non-derived chain (plain state-decl read) — not a derived-cycle
 */

import { describe, test, expect } from "bun:test";
import { runDG } from "../../src/dependency-graph.ts";

// ---------------------------------------------------------------------------
// Helpers (mirroring dependency-graph.test.js shapes for consistency)
// ---------------------------------------------------------------------------

function span(start, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeFnDecl({
  name,
  body = [],
  spanStart = 0,
  file = "/test/app.scrml",
  isServer = false,
  fnKind = "function", // "function" (reactive) | "fn" (pure)
}) {
  return {
    kind: "function-decl",
    name,
    params: [],
    body,
    isServer,
    fnKind,
    span: span(spanStart, file),
  };
}

function makeBareExpr(expr, spanStart = 0, file = "/test/app.scrml") {
  return { kind: "bare-expr", expr, span: span(spanStart, file) };
}

function makeReactiveDecl(name, init = "", spanStart = 0, file = "/test/app.scrml") {
  return { kind: "state-decl", name, init, span: span(spanStart, file) };
}

function makeDerivedDecl(name, init, spanStart = 0, file = "/test/app.scrml") {
  return {
    kind: "state-decl",
    shape: "derived",
    isConst: true,
    structuralForm: false,
    name,
    init,
    span: span(spanStart, file),
  };
}

function makeLogicBlock(body, spanStart = 0, file = "/test/app.scrml") {
  return {
    kind: "logic",
    body,
    bodyKind: "logic",
    typeDecls: [],
    components: [],
    span: span(spanStart, file),
  };
}

function makeFileAST(nodes, filePath = "/test/app.scrml") {
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    spans: new Map(),
  };
}

function makeRouteMap(entries = []) {
  const functions = new Map();
  for (const e of entries) {
    const file = e.file || "/test/app.scrml";
    const fnNodeId = `${file}::${e.spanStart}`;
    functions.set(fnNodeId, {
      functionNodeId: fnNodeId,
      boundary: e.boundary || "client",
      escalationReasons: [],
      generatedRouteName: e.boundary === "server" ? `__ri_route_${e.name}_1` : null,
      serverEntrySpan: e.boundary === "server" ? span(e.spanStart, file) : null,
    });
  }
  return { functions };
}

function getCircularErrors(errors) {
  return errors.filter((e) => e.code === "E-DERIVED-CIRCULAR-DEP");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("E-DERIVED-CIRCULAR-DEP — direct deps (control: no cycle)", () => {
  test("plain derived chain: const <doubled> = @count * 2 — no error", () => {
    const count = makeReactiveDecl("count", "0", 0);
    const doubled = makeDerivedDecl("doubled", "@count * 2", 20);
    const logic = makeLogicBlock([count, doubled]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("derived chain a -> b -> c — no cycle, no error", () => {
    const a = makeReactiveDecl("a", "1", 0);
    const b = makeDerivedDecl("b", "@a + 1", 10);
    const c = makeDerivedDecl("c", "@b + 1", 20);
    const logic = makeLogicBlock([a, b, c]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("longer linear chain a -> b -> c -> d -> e — no cycle", () => {
    const a = makeReactiveDecl("a", "1", 0);
    const b = makeDerivedDecl("b", "@a", 10);
    const c = makeDerivedDecl("c", "@b", 20);
    const d = makeDerivedDecl("d", "@c", 30);
    const e = makeDerivedDecl("e", "@d", 40);
    const logic = makeLogicBlock([a, b, c, d, e]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("diamond DAG (b and c both depend on a; d depends on b and c) — no cycle", () => {
    const a = makeReactiveDecl("a", "1", 0);
    const b = makeDerivedDecl("b", "@a + 1", 10);
    const c = makeDerivedDecl("c", "@a * 2", 20);
    const d = makeDerivedDecl("d", "@b + @c", 30);
    const logic = makeLogicBlock([a, b, c, d]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(0);
  });
});

describe("E-DERIVED-CIRCULAR-DEP — degenerate self-reference (1-cycle)", () => {
  test("const <x> = @x + 1 — fires E-DERIVED-CIRCULAR-DEP", () => {
    const x = makeDerivedDecl("x", "@x + 1", 0);
    const logic = makeLogicBlock([x]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    const circ = getCircularErrors(errors);
    expect(circ.length).toBe(1);
    expect(circ[0].message).toContain("@x");
    expect(circ[0].message).toContain("references itself");
  });

  test("const <counter> = @counter + 1 (SPEC §6.6.10 line 2741 example)", () => {
    const counter = makeDerivedDecl("counter", "@counter + 1", 0);
    const logic = makeLogicBlock([counter]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    const circ = getCircularErrors(errors);
    expect(circ.length).toBe(1);
    expect(circ[0].message).toContain("@counter");
  });

  test("self-ref in compound expression: const <y> = @y * 2 + 5", () => {
    const y = makeDerivedDecl("y", "@y * 2 + 5", 0);
    const logic = makeLogicBlock([y]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(1);
  });
});

describe("E-DERIVED-CIRCULAR-DEP — multi-node cycles", () => {
  test("two-cycle: const <a> = @b, const <b> = @a", () => {
    const a = makeDerivedDecl("a", "@b", 0);
    const b = makeDerivedDecl("b", "@a", 20);
    const logic = makeLogicBlock([a, b]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    const circ = getCircularErrors(errors);
    expect(circ.length).toBeGreaterThanOrEqual(1);
    // Cycle message should reference both vars
    const msg = circ.map((e) => e.message).join(" ");
    expect(msg).toContain("@a");
    expect(msg).toContain("@b");
  });

  test("three-cycle: a -> b -> c -> a", () => {
    const a = makeDerivedDecl("a", "@b", 0);
    const b = makeDerivedDecl("b", "@c", 20);
    const c = makeDerivedDecl("c", "@a", 40);
    const logic = makeLogicBlock([a, b, c]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBeGreaterThanOrEqual(1);
  });

  test("cycle embedded in compound expressions", () => {
    const a = makeDerivedDecl("a", "@b + 1", 0);
    const b = makeDerivedDecl("b", "@a * 2", 20);
    const logic = makeLogicBlock([a, b]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBeGreaterThanOrEqual(1);
  });

  test("cycle blocks codegen: fail-fast — no E-DG-002 follow-on errors", () => {
    // E-DERIVED-CIRCULAR-DEP must short-circuit before E-DG-002 runs.
    const a = makeDerivedDecl("a", "@b", 0);
    const b = makeDerivedDecl("b", "@a", 20);
    const logic = makeLogicBlock([a, b]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBeGreaterThanOrEqual(1);
    // E-DG-002 must NOT fire (we returned early)
    expect(errors.filter((e) => e.code === "E-DG-002").length).toBe(0);
  });
});

describe("E-DERIVED-CIRCULAR-DEP — pure `fn` filter (§31.5, §48)", () => {
  test("derived through pure `fn` that body-reads upstream — no cycle", () => {
    // const <a> = formatA(@b) where `fn formatA(...)` is pure.
    // Even if fn body somehow read @a (shouldn't per §48 enforcement, but
    // defense-in-depth), pure callees never propagate reactive deps.
    // Here `formatA` body has no reactive read; just covers the "pure call"
    // path doesn't introduce a phantom dep.
    const b = makeReactiveDecl("b", "0", 0);
    const formatA = makeFnDecl({
      name: "formatA",
      spanStart: 10,
      fnKind: "fn", // pure
      body: [makeBareExpr("return n", 15)],
    });
    const a = makeDerivedDecl("a", "formatA(@b)", 30);
    const logic = makeLogicBlock([b, formatA, a]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({
      files: [fileAST],
      routeMap: makeRouteMap([{ name: "formatA", spanStart: 10, boundary: "client" }]),
    });
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("pure `fn` with malformed reactive read does NOT introduce cycle", () => {
    // Defensive case: even if the pure-fn rule is violated upstream
    // (shouldn't happen — E-FN-001..E-FN-005 catch it), DG must not
    // propagate that read into a transitive dep that creates a cycle.
    // Setup: const <a> = pureLeak(@b); fn pureLeak() reads @a.
    // Without the pure filter this would form a cycle a -> a (via pureLeak's
    // body reading @a). With the filter, no edge propagates, no cycle.
    const a = makeReactiveDecl("placeholder", "0", 0); // dummy to satisfy DG
    const pureLeak = makeFnDecl({
      name: "pureLeak",
      spanStart: 10,
      fnKind: "fn", // pure
      body: [makeBareExpr("return @derivedA", 15)], // reads @derivedA in body
    });
    const derivedA = makeDerivedDecl("derivedA", "pureLeak(1)", 30);
    const logic = makeLogicBlock([a, pureLeak, derivedA]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({
      files: [fileAST],
      routeMap: makeRouteMap([{ name: "pureLeak", spanStart: 10, boundary: "client" }]),
    });
    // Pure fn skips dep propagation — no E-DERIVED-CIRCULAR-DEP.
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("reactive `function` body-reads upstream — DOES form cycle", () => {
    // const <a> = reactiveLeak(...); function reactiveLeak() { @a }
    // Reactive function inherits its body's reactive reads, so this IS a cycle.
    const reactiveLeak = makeFnDecl({
      name: "reactiveLeak",
      spanStart: 10,
      fnKind: "function", // reactive (default)
      body: [makeBareExpr("return @derivedA", 15)],
    });
    const derivedA = makeDerivedDecl("derivedA", "reactiveLeak(1)", 30);
    const logic = makeLogicBlock([reactiveLeak, derivedA]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({
      files: [fileAST],
      routeMap: makeRouteMap([{ name: "reactiveLeak", spanStart: 10, boundary: "client" }]),
    });
    expect(getCircularErrors(errors).length).toBeGreaterThanOrEqual(1);
  });

  test("audit §1.1 worked example: pure fn vs reactive function", () => {
    // From audit §1.1:
    //   fn formatCount(n) -> string { ... }    // pure
    //   function reactiveLog(n) { @lastSeen }  // reactive, reads @lastSeen
    //   const <fmt1> = formatCount(@count)     // dep: @count only
    //   const <fmt2> = reactiveLog(@count)     // dep: @count + @lastSeen
    // Neither forms a cycle on its own. We verify the pure-fn filter works
    // by ensuring NO cycle is reported; transitive-deps semantics are
    // already covered in dependency-graph.test.js T15.
    const count = makeReactiveDecl("count", "0", 0);
    const lastSeen = makeReactiveDecl("lastSeen", "0", 10);
    const formatCount = makeFnDecl({
      name: "formatCount",
      spanStart: 20,
      fnKind: "fn",
      body: [makeBareExpr("return n", 25)],
    });
    const reactiveLog = makeFnDecl({
      name: "reactiveLog",
      spanStart: 40,
      fnKind: "function",
      body: [makeBareExpr("@lastSeen", 45)],
    });
    const fmt1 = makeDerivedDecl("fmt1", "formatCount(@count)", 60);
    const fmt2 = makeDerivedDecl("fmt2", "reactiveLog(@count)", 80);
    const logic = makeLogicBlock([count, lastSeen, formatCount, reactiveLog, fmt1, fmt2]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({
      files: [fileAST],
      routeMap: makeRouteMap([
        { name: "formatCount", spanStart: 20, boundary: "client" },
        { name: "reactiveLog", spanStart: 40, boundary: "client" },
      ]),
    });
    expect(getCircularErrors(errors).length).toBe(0);
  });
});

describe("E-DERIVED-CIRCULAR-DEP — transitive cycles through reactive functions", () => {
  test("derived -> reactive function -> reads same derived = cycle", () => {
    // const <total> = compute(); function compute() { return @total }
    const compute = makeFnDecl({
      name: "compute",
      spanStart: 10,
      fnKind: "function",
      body: [makeBareExpr("return @total", 15)],
    });
    const total = makeDerivedDecl("total", "compute()", 30);
    const logic = makeLogicBlock([compute, total]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({
      files: [fileAST],
      routeMap: makeRouteMap([{ name: "compute", spanStart: 10, boundary: "client" }]),
    });
    expect(getCircularErrors(errors).length).toBeGreaterThanOrEqual(1);
  });

  test("two-hop transitive: derived -> fn1 -> fn2 -> reads derived", () => {
    const fn2 = makeFnDecl({
      name: "fn2",
      spanStart: 10,
      fnKind: "function",
      body: [makeBareExpr("return @t", 15)],
    });
    const fn1 = makeFnDecl({
      name: "fn1",
      spanStart: 30,
      fnKind: "function",
      body: [makeBareExpr("return fn2()", 35)],
    });
    const t = makeDerivedDecl("t", "fn1()", 50);
    const logic = makeLogicBlock([fn2, fn1, t]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({
      files: [fileAST],
      routeMap: makeRouteMap([
        { name: "fn1", spanStart: 30, boundary: "client" },
        { name: "fn2", spanStart: 10, boundary: "client" },
      ]),
    });
    expect(getCircularErrors(errors).length).toBeGreaterThanOrEqual(1);
  });
});

describe("E-DERIVED-CIRCULAR-DEP — no false positives (regression guard)", () => {
  test("plain (non-derived) state-decls do not participate in derived cycle scan", () => {
    // Plain state-decls aren't `const <x> = expr` — they're mutable cells.
    // Even if a function reads/writes them in patterns that look cyclic,
    // we only care about derived-cell cycles.
    const counter = makeReactiveDecl("counter", "0", 0);
    const logic = makeLogicBlock([counter]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("derived references plain state-decl — no cycle", () => {
    const a = makeReactiveDecl("a", "0", 0);
    const b = makeDerivedDecl("b", "@a + 1", 10);
    const logic = makeLogicBlock([a, b]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("multiple independent derived cells — no cycle", () => {
    const a = makeReactiveDecl("a", "0", 0);
    const b = makeReactiveDecl("b", "0", 10);
    const da = makeDerivedDecl("da", "@a", 20);
    const db = makeDerivedDecl("db", "@b", 30);
    const logic = makeLogicBlock([a, b, da, db]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("derived cell with no @-refs (constant init) — no cycle", () => {
    const x = makeDerivedDecl("x", "42", 0);
    const logic = makeLogicBlock([x]);
    const fileAST = makeFileAST([logic]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    expect(getCircularErrors(errors).length).toBe(0);
  });

  test("error code matches catalog name (NOT old E-REACTIVE-005)", () => {
    // SPEC §34 catalog (line 14235) + §31.5 line 13697 use the canonical
    // E-DERIVED-CIRCULAR-DEP. Audit §1.2 documents the deprecation of the
    // old §6.6.10 placeholder name `E-REACTIVE-005`. This test guards
    // against accidental regression to the old code.
    const x = makeDerivedDecl("x", "@x", 0);
    const fileAST = makeFileAST([makeLogicBlock([x])]);
    const { errors } = runDG({ files: [fileAST], routeMap: makeRouteMap([]) });
    const codes = errors.map((e) => e.code);
    expect(codes).toContain("E-DERIVED-CIRCULAR-DEP");
    expect(codes).not.toContain("E-REACTIVE-005");
  });
});
