/**
 * c2-derived-reactive-computation.test.js — A1c Step C2 unit tests
 *
 * Tests the derived-cell reactive computation emission added in C2:
 *
 *   §C2.1  Plain Shape-3 derived: direct @var refs (regression guard from C1)
 *   §C2.2  Plain Shape-3 derived: transitive deps through function call
 *   §C2.3  Plain Shape-3 derived: NESTED function calls (transitive recursion)
 *   §C2.4  Plain Shape-3 derived: no fnBodyRegistry → falls back to direct extraction
 *   §C2.5  Markup-typed derived: factory body emits createElement chain
 *   §C2.6  Markup-typed derived: subscribe edges for ${@var} interpolations
 *   §C2.7  Markup-typed derived: static markup (no interpolation) → 0 subscribe edges
 *   §C2.8  Markup-typed derived: nested markup interpolations collect deps from all levels
 *   §C2.9  In-compound derived with fn-call init: transitive deps + qualified path
 *   §C2.10 Output stability: existing C1 emissions unchanged on Shape 1/2
 *   §C2.11 Markup-typed derived: reactive attribute references (variable-ref attr value)
 *   §C2.12 Markup-typed derived: malformed renderSpec → defensive null shell
 *   §C2.13 Derived-of-derived: per-edge subscribe (runtime BFS handles cascade)
 *
 * SCOPE: per A1c BRIEF §1 + Phase 0 SURVEY §10 — closes the §6.6.3 line 2470-2482
 * normative gap (transitive deps through fn calls) + lifts C1's `return null`
 * markup-typed factory shell to a real DOM-builder.
 *
 * The three C2-SURVEY clarifications baked into this test suite:
 *   1. extractReactiveDepsTransitive (NOT B7's DAG) is the implementation primitive
 *   2. derived-of-derived cascade is RUNTIME (BFS in _scrml_propagate_dirty);
 *      C2 emits per-edge subscribes, runtime composes the chain
 *   3. in-compound derived auto-handled by C1's recursion + compoundPathPrefix;
 *      C2 transitive change applies uniformly (no separate code path)
 */

import { describe, test, expect } from "bun:test";
import { emitLogicNode } from "../../src/codegen/emit-logic.js";
import { buildFunctionBodyRegistry } from "../../src/codegen/reactive-deps.ts";

// ---------------------------------------------------------------------------
// Helpers — construct AST shapes consistent with what ast-builder.js produces
// ---------------------------------------------------------------------------

/** Plain Shape-3 derived: `const <name> = init`. Init given as a string
 *  (the Phase 4 fallback path used by tests since they don't go through
 *  the expression-parser to produce ExprNodes). */
function shape3Derived(name, init, { structuralForm = true } = {}) {
  return {
    kind: "state-decl",
    name,
    init,
    initExpr: undefined,
    shape: "derived",
    structuralForm,
    isConst: true,
    _cellKind: "plain",
    span: { start: 0, end: 0 },
  };
}

/** Markup-typed derived: `const <name> = <markup>`. The markup tree is
 *  passed as `renderSpec.element`. */
function markupTypedDerived(name, markupRoot) {
  return {
    kind: "state-decl",
    name,
    init: "",
    initExpr: null,
    shape: "decl-with-spec",
    structuralForm: true,
    isConst: true,
    _cellKind: "markup-typed",
    renderSpec: { kind: "render-spec", element: markupRoot },
    span: { start: 0, end: 0 },
  };
}

/** Build a FunctionBodyRegistry directly from a list of {name, body, params}
 *  fixtures. Mirrors what buildFunctionBodyRegistry produces but without
 *  needing to wrap in a fileAST. The body uses simple `expr`-string nodes
 *  which extractReactiveDepsFromBody walks correctly via the
 *  emitStringFromTreeSafe → fallback path. */
function makeRegistry(functions) {
  const registry = new Map();
  for (const fn of functions) {
    if (!registry.has(fn.name)) registry.set(fn.name, []);
    registry.get(fn.name).push({ body: fn.body, params: fn.params ?? [] });
  }
  return registry;
}

/** Markup leaf builder: a `<tag>...</tag>` with optional children. */
function mk(tag, attributes = [], children = []) {
  return { kind: "markup", tag, attributes, children };
}

/** Logic-block child for `${expr}` interpolations inside markup. Mirrors
 *  the tokenizer/parser shape: kind:"logic" wrapping a bare-expr body. */
function logicInterp(exprStr) {
  return {
    kind: "logic",
    body: [{ kind: "bare-expr", expr: exprStr, exprNode: undefined }],
  };
}

// ---------------------------------------------------------------------------
// §C2.1 Plain Shape-3 derived: direct @var refs (regression guard from C1)
// ---------------------------------------------------------------------------

describe("C2 §C2.1 — Plain Shape-3 derived: direct @var refs (regression)", () => {
  test("emits _scrml_derived_declare + subscribe per direct @var dep (no registry)", () => {
    const node = shape3Derived("doubled", "@count * 2");
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_declare("doubled"');
    expect(result).toContain('_scrml_derived_subscribe("doubled", "count")');
  });

  test("emits one subscribe per unique direct @var (multi-dep case)", () => {
    const node = shape3Derived("total", "@price * @quantity");
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_declare("total"');
    expect(result).toContain('_scrml_derived_subscribe("total", "price")');
    expect(result).toContain('_scrml_derived_subscribe("total", "quantity")');
  });

  test("with empty registry, behavior matches no-registry case (transitive walker degenerates)", () => {
    const node = shape3Derived("doubled", "@count * 2");
    const opts = { boundary: "client", fnBodyRegistry: makeRegistry([]) };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_declare("doubled"');
    expect(result).toContain('_scrml_derived_subscribe("doubled", "count")');
  });
});

// ---------------------------------------------------------------------------
// §C2.2 Plain Shape-3 derived: transitive deps through a function call
// (closes SPEC §6.6.3 line 2470-2482 normative gap)
// ---------------------------------------------------------------------------

describe("C2 §C2.2 — Plain Shape-3 derived: transitive deps through fn call", () => {
  test("getName() reads @name → derived has subscribe edge to name", () => {
    // function getName() { return @name }
    // const <displayName> = getName()
    const registry = makeRegistry([
      { name: "getName", body: [{ kind: "return-stmt", expr: "@name" }] },
    ]);
    const node = shape3Derived("displayName", "getName()");
    const opts = { boundary: "client", fnBodyRegistry: registry };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_declare("displayName"');
    expect(result).toContain('_scrml_derived_subscribe("displayName", "name")');
  });

  test("function reading multiple @vars contributes all as transitive deps", () => {
    // function fullName() { return @first + @last }
    const registry = makeRegistry([
      { name: "fullName", body: [{ kind: "return-stmt", expr: "@first + @last" }] },
    ]);
    const node = shape3Derived("display", "fullName()");
    const opts = { boundary: "client", fnBodyRegistry: registry };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_subscribe("display", "first")');
    expect(result).toContain('_scrml_derived_subscribe("display", "last")');
  });

  test("function with no reactive reads contributes no extra deps", () => {
    // function pure() { return 42 }
    // const <x> = pure() + @y   → only @y is a dep
    const registry = makeRegistry([
      { name: "pure", body: [{ kind: "return-stmt", expr: "42" }] },
    ]);
    const node = shape3Derived("x", "pure() + @y");
    const opts = { boundary: "client", fnBodyRegistry: registry };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_subscribe("x", "y")');
    // pure() reads no @vars; only @y should appear.
    expect(result).not.toContain('_scrml_derived_subscribe("x", "pure")');
  });

  test("direct @var + transitive deps both registered (union)", () => {
    // function helper() { return @z }
    // const <q> = @x + helper()
    const registry = makeRegistry([
      { name: "helper", body: [{ kind: "return-stmt", expr: "@z" }] },
    ]);
    const node = shape3Derived("q", "@x + helper()");
    const opts = { boundary: "client", fnBodyRegistry: registry };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_subscribe("q", "x")');
    expect(result).toContain('_scrml_derived_subscribe("q", "z")');
  });
});

// ---------------------------------------------------------------------------
// §C2.3 Plain Shape-3 derived: NESTED function calls (transitive recursion)
// ---------------------------------------------------------------------------

describe("C2 §C2.3 — Plain Shape-3 derived: nested fn calls", () => {
  test("f(g(...)) — both f's body and g's body contribute deps", () => {
    // function inner() { return @a }
    // function outer() { return inner() + @b }
    // const <r> = outer()
    const registry = makeRegistry([
      { name: "inner", body: [{ kind: "return-stmt", expr: "@a" }] },
      { name: "outer", body: [{ kind: "return-stmt", expr: "inner() + @b" }] },
    ]);
    const node = shape3Derived("r", "outer()");
    const opts = { boundary: "client", fnBodyRegistry: registry };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_subscribe("r", "a")');
    expect(result).toContain('_scrml_derived_subscribe("r", "b")');
  });

  test("call-graph cycle does not infinite-loop (visited set guards BFS)", () => {
    // function a() { return b() + @x }
    // function b() { return a() + @y }   // cyclic; not realistic but registry tolerates
    // const <r> = a()
    const registry = makeRegistry([
      { name: "a", body: [{ kind: "return-stmt", expr: "b() + @x" }] },
      { name: "b", body: [{ kind: "return-stmt", expr: "a() + @y" }] },
    ]);
    const node = shape3Derived("r", "a()");
    const opts = { boundary: "client", fnBodyRegistry: registry };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_subscribe("r", "x")');
    expect(result).toContain('_scrml_derived_subscribe("r", "y")');
  });
});

// ---------------------------------------------------------------------------
// §C2.4 Plain Shape-3 derived: no fnBodyRegistry → direct-extraction fallback
// (test-fixture compatibility for synthetic state-decls without registry)
// ---------------------------------------------------------------------------

describe("C2 §C2.4 — Plain Shape-3 derived: no-registry fallback", () => {
  test("when opts.fnBodyRegistry is absent, only direct @vars are deps", () => {
    // const <r> = getName()  with no registry → fn body is opaque, no transitive
    const node = shape3Derived("r", "getName() + @z");
    const result = emitLogicNode(node);
    // Only @z should be tracked; getName's body is invisible without registry.
    expect(result).toContain('_scrml_derived_subscribe("r", "z")');
    // No subscribe for getName-internal deps because we never looked.
    expect(result).not.toContain('_scrml_derived_subscribe("r", "name")');
  });

  test("when opts.fnBodyRegistry is null explicit, also falls back to direct", () => {
    const node = shape3Derived("r", "@x + @y");
    const opts = { boundary: "client", fnBodyRegistry: null };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_subscribe("r", "x")');
    expect(result).toContain('_scrml_derived_subscribe("r", "y")');
  });
});

// ---------------------------------------------------------------------------
// §C2.5 Markup-typed derived: factory body emits createElement chain
// ---------------------------------------------------------------------------

describe("C2 §C2.5 — Markup-typed derived: factory body shape", () => {
  test("emits document.createElement(tag) inside the factory function", () => {
    const node = markupTypedDerived("badge", mk("span"));
    const result = emitLogicNode(node);
    expect(result).toMatch(/function _scrml_markup_factory_badge\w*\(\)/);
    expect(result).toContain('document.createElement("span")');
  });

  test("factory body returns the root element variable", () => {
    const node = markupTypedDerived("badge", mk("div"));
    const result = emitLogicNode(node);
    expect(result).toMatch(/return _scrml_lift_el_\d+;/);
  });

  test("nested markup tree builds appendChild chain", () => {
    // <div><span></span></div>
    const node = markupTypedDerived("nested", mk("div", [], [mk("span")]));
    const result = emitLogicNode(node);
    expect(result).toContain('document.createElement("div")');
    expect(result).toContain('document.createElement("span")');
    expect(result).toMatch(/_scrml_lift_el_\d+\.appendChild\(_scrml_lift_el_\d+\)/);
  });

  test("static text child emits createTextNode", () => {
    // <span>hello</span>
    const node = markupTypedDerived("greeting", mk("span", [], [
      { kind: "text", value: "hello" },
    ]));
    const result = emitLogicNode(node);
    expect(result).toContain('createTextNode("hello")');
  });

  test("declares the cell via _scrml_derived_declare with the factory id", () => {
    const node = markupTypedDerived("badge", mk("span"));
    const result = emitLogicNode(node);
    expect(result).toMatch(/_scrml_derived_declare\("badge", _scrml_markup_factory_badge_\d+\)/);
  });
});

// ---------------------------------------------------------------------------
// §C2.6 Markup-typed derived: subscribe edges for ${@var} interpolations
// ---------------------------------------------------------------------------

describe("C2 §C2.6 — Markup-typed derived: interpolation subscribe edges", () => {
  test("single ${@x} interpolation emits one subscribe edge", () => {
    // <span>${@x}</span>
    const node = markupTypedDerived("v", mk("span", [], [logicInterp("@x")]));
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_subscribe("v", "x")');
  });

  test("multiple ${@var} interpolations emit unique subscribe edges", () => {
    // <span>${@first} ${@last}</span>
    const node = markupTypedDerived("name", mk("span", [], [
      logicInterp("@first"),
      { kind: "text", value: " " },
      logicInterp("@last"),
    ]));
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_subscribe("name", "first")');
    expect(result).toContain('_scrml_derived_subscribe("name", "last")');
  });

  test("duplicate @var refs collapsed to one subscribe edge", () => {
    // <span>${@x} - ${@x}</span>
    const node = markupTypedDerived("v", mk("span", [], [
      logicInterp("@x"),
      { kind: "text", value: " - " },
      logicInterp("@x"),
    ]));
    const result = emitLogicNode(node);
    const matches = result.match(/_scrml_derived_subscribe\("v", "x"\)/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBe(1);
  });

  test("transitive: ${helper()} where helper reads @y", () => {
    // function helper() { return @y }
    // <span>${helper()}</span>
    const registry = makeRegistry([
      { name: "helper", body: [{ kind: "return-stmt", expr: "@y" }] },
    ]);
    const node = markupTypedDerived("v", mk("span", [], [logicInterp("helper()")]));
    const opts = { boundary: "client", fnBodyRegistry: registry };
    const result = emitLogicNode(node, opts);
    expect(result).toContain('_scrml_derived_subscribe("v", "y")');
  });
});

// ---------------------------------------------------------------------------
// §C2.7 Markup-typed derived: static markup → 0 subscribe edges
// ---------------------------------------------------------------------------

describe("C2 §C2.7 — Markup-typed derived: static markup is legal", () => {
  test("static markup (no interpolation) emits factory + 0 subscribe edges", () => {
    // <span>hello</span>
    const node = markupTypedDerived("greeting", mk("span", [], [
      { kind: "text", value: "hello" },
    ]));
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_declare("greeting"');
    expect(result).not.toContain('_scrml_derived_subscribe("greeting"');
  });

  test("empty markup (no children) emits factory + 0 subscribe edges", () => {
    const node = markupTypedDerived("blank", mk("div"));
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_declare("blank"');
    expect(result).not.toContain('_scrml_derived_subscribe("blank"');
  });
});

// ---------------------------------------------------------------------------
// §C2.8 Markup-typed derived: nested interpolations collect from all levels
// ---------------------------------------------------------------------------

describe("C2 §C2.8 — Markup-typed derived: nested-tree dep collection", () => {
  test("interpolations inside nested children are collected", () => {
    // <div><span>${@inner}</span><p>${@outer}</p></div>
    const node = markupTypedDerived("v", mk("div", [], [
      mk("span", [], [logicInterp("@inner")]),
      mk("p", [], [logicInterp("@outer")]),
    ]));
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_subscribe("v", "inner")');
    expect(result).toContain('_scrml_derived_subscribe("v", "outer")');
  });

  test("deeply-nested interpolation is still collected", () => {
    // <a><b><c>${@deep}</c></b></a>
    const node = markupTypedDerived("v", mk("a", [], [
      mk("b", [], [
        mk("c", [], [logicInterp("@deep")]),
      ]),
    ]));
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_subscribe("v", "deep")');
  });
});

// ---------------------------------------------------------------------------
// §C2.9 In-compound derived with fn-call init: transitive deps + qualified path
// (verifies SURVEY clarification 3 — C1 recursion + C2 transitive compose)
// ---------------------------------------------------------------------------

describe("C2 §C2.9 — In-compound derived: transitive + qualified-path", () => {
  test("compound child derived with fn-call init records transitive deps under qualified key", () => {
    // function getFirst() { return @first }
    // <signup>
    //   const <displayName> = getFirst()
    // </signup>
    const registry = makeRegistry([
      { name: "getFirst", body: [{ kind: "return-stmt", expr: "@first" }] },
    ]);
    const compoundNode = {
      kind: "state-decl",
      name: "signup",
      init: "",
      initExpr: null,
      shape: "plain",
      structuralForm: true,
      isConst: false,
      _cellKind: "compound-parent",
      children: [shape3Derived("displayName", "getFirst()")],
      span: { start: 0, end: 0 },
    };
    const opts = { boundary: "client", fnBodyRegistry: registry };
    const result = emitLogicNode(compoundNode, opts);
    // Compound recursion writes the child under the qualified name.
    expect(result).toContain('_scrml_derived_declare("signup.displayName"');
    // Transitive walker brought `first` in through getFirst's body.
    expect(result).toContain('_scrml_derived_subscribe("signup.displayName", "first")');
  });
});

// ---------------------------------------------------------------------------
// §C2.10 Output stability: existing C1 emissions unchanged on Shape 1/2
// ---------------------------------------------------------------------------

describe("C2 §C2.10 — Output stability for non-derived cells", () => {
  test("Shape 1 plain unchanged: <count> = 0 still emits _scrml_reactive_set", () => {
    const node = {
      kind: "state-decl",
      name: "count",
      init: "0",
      initExpr: undefined,
      shape: "plain",
      structuralForm: true,
      isConst: false,
      _cellKind: "plain",
      span: { start: 0, end: 0 },
    };
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_reactive_set("count"');
    expect(result).not.toContain("_scrml_derived_declare");
  });

  test("Shape 2 bindable cell unchanged (no derived-declare, no markup factory)", () => {
    const node = {
      kind: "state-decl",
      name: "userName",
      init: "",
      initExpr: undefined,
      shape: "decl-with-spec",
      structuralForm: true,
      isConst: false,
      _cellKind: "bindable",
      _isBindable: true,
      renderSpec: { kind: "render-spec", element: { kind: "markup", tag: "input" } },
      validators: [],
      span: { start: 0, end: 0 },
    };
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_reactive_set("userName"');
    expect(result).not.toContain("_scrml_derived_declare");
    expect(result).not.toContain("_scrml_markup_factory");
  });
});

// ---------------------------------------------------------------------------
// §C2.11 Markup-typed derived: reactive attribute references
// ---------------------------------------------------------------------------

describe("C2 §C2.11 — Markup-typed derived: reactive attribute deps", () => {
  test("variable-ref attribute value emits subscribe edge", () => {
    // <span class=@theme></span>
    const node = markupTypedDerived("v", mk("span", [
      { name: "class", value: { kind: "variable-ref", name: "@theme" } },
    ]));
    const result = emitLogicNode(node);
    expect(result).toContain('_scrml_derived_subscribe("v", "theme")');
  });
});

// ---------------------------------------------------------------------------
// §C2.12 Markup-typed derived: malformed renderSpec → defensive null shell
// ---------------------------------------------------------------------------

describe("C2 §C2.12 — Markup-typed derived: defensive fallback", () => {
  test("missing renderSpec.element → C1-style placeholder + explanatory comment", () => {
    const node = {
      kind: "state-decl",
      name: "broken",
      init: "",
      initExpr: null,
      shape: "decl-with-spec",
      structuralForm: true,
      isConst: true,
      _cellKind: "markup-typed",
      renderSpec: { kind: "render-spec", element: undefined },
      span: { start: 0, end: 0 },
    };
    const result = emitLogicNode(node);
    expect(result).toContain("return null;");
    expect(result).toContain("A1b should have rejected");
    expect(result).toContain('_scrml_derived_declare("broken"');
  });

  test("renderSpec.element with non-markup kind → defensive shell", () => {
    const node = {
      kind: "state-decl",
      name: "broken",
      init: "",
      initExpr: null,
      shape: "decl-with-spec",
      structuralForm: true,
      isConst: true,
      _cellKind: "markup-typed",
      renderSpec: { kind: "render-spec", element: { kind: "text", value: "wrong" } },
      span: { start: 0, end: 0 },
    };
    const result = emitLogicNode(node);
    expect(result).toContain("return null;");
  });
});

// ---------------------------------------------------------------------------
// §C2.13 Derived-of-derived: per-edge subscribe (runtime BFS handles cascade)
// ---------------------------------------------------------------------------

describe("C2 §C2.13 — Derived-of-derived chain: per-edge subscribe", () => {
  test("a depends on x; b depends on a — each edge recorded", () => {
    // const <a> = @x  → subscribe(a, x)
    // const <b> = @a  → subscribe(b, a)
    // Runtime _scrml_propagate_dirty BFS makes the chain transitive at write time.
    const aNode = shape3Derived("a", "@x");
    const bNode = shape3Derived("b", "@a");
    const aResult = emitLogicNode(aNode);
    const bResult = emitLogicNode(bNode);
    expect(aResult).toContain('_scrml_derived_subscribe("a", "x")');
    expect(bResult).toContain('_scrml_derived_subscribe("b", "a")');
  });
});
