/**
 * constant-folder — Pure partial-evaluation primitive tests.
 *
 * S89 wave A-2.2.b — exercises `partiallyEvaluateExpr` against
 * hand-built ExprNode shapes that mirror the OQ-A2-D disposition
 * surface (literals + arithmetic + comparison + ternary + member +
 * index + identifier + absence operators).
 *
 * Tests assert both the constant cases and the runtime-fallback cases
 * Component 1 will lean on for §40.9.2 worst-case-union admission.
 */

import { describe, test, expect } from "bun:test";
import {
  partiallyEvaluateExpr,
  type ConstFoldEnv,
} from "../../src/codegen/constant-folder.ts";
import type { ExprNode, ExprSpan } from "../../src/types/ast.ts";

const SPAN: ExprSpan = { start: 0, end: 0 };

function envOf(bindings: Record<string, unknown> = {}): ConstFoldEnv {
  const m = new Map<string, unknown>();
  for (const k of Object.keys(bindings)) m.set(k, bindings[k]);
  return { constBindings: m as ConstFoldEnv["constBindings"] };
}

// Tiny ExprNode constructors for ergonomic test authoring.
function lit(value: string | number | boolean | null, litType: "number" | "string" | "bool" | "null" | "undefined" | "not" | "template" = inferLitType(value)): ExprNode {
  return { kind: "lit", span: SPAN, raw: String(value), value, litType };
}
function inferLitType(v: unknown): "number" | "string" | "bool" | "null" | "undefined" {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "number") return "number";
  if (typeof v === "string") return "string";
  if (typeof v === "boolean") return "bool";
  return "string";
}
function ident(name: string): ExprNode {
  return { kind: "ident", span: SPAN, name };
}
function bin(op: any, left: ExprNode, right: ExprNode): ExprNode {
  return { kind: "binary", span: SPAN, op, left, right };
}
function un(op: any, argument: ExprNode, prefix = true): ExprNode {
  return { kind: "unary", span: SPAN, op, argument, prefix };
}
function tern(c: ExprNode, a: ExprNode, b: ExprNode): ExprNode {
  return { kind: "ternary", span: SPAN, condition: c, consequent: a, alternate: b };
}
function mem(object: ExprNode, property: string, optional = false): ExprNode {
  return { kind: "member", span: SPAN, object, property, optional };
}
function idx(object: ExprNode, index: ExprNode, optional = false): ExprNode {
  return { kind: "index", span: SPAN, object, index, optional };
}
function arr(...elements: ExprNode[]): ExprNode {
  return { kind: "array", span: SPAN, elements };
}
function obj(props: Record<string, ExprNode>): ExprNode {
  const entries = Object.keys(props).map(k => ({
    kind: "prop" as const,
    key: k,
    value: props[k],
    computed: false,
    span: SPAN,
  }));
  return { kind: "object", span: SPAN, props: entries };
}

// ---------------------------------------------------------------------------
// §1 — Literals
// ---------------------------------------------------------------------------

describe("§1 literals fold to their primitive values", () => {
  test("number lit", () => {
    expect(partiallyEvaluateExpr(lit(42), envOf())).toEqual({ kind: "constant", value: 42 });
  });
  test("string lit", () => {
    expect(partiallyEvaluateExpr(lit("hi"), envOf())).toEqual({ kind: "constant", value: "hi" });
  });
  test("bool lit", () => {
    expect(partiallyEvaluateExpr(lit(true), envOf())).toEqual({ kind: "constant", value: true });
  });
  test("null lit", () => {
    expect(partiallyEvaluateExpr(lit(null), envOf())).toEqual({ kind: "constant", value: null });
  });
  test("undefined lit", () => {
    expect(partiallyEvaluateExpr(lit(null, "undefined"), envOf())).toEqual({ kind: "constant", value: undefined });
  });
  test("§42 `not` keyword folds to null when allowed", () => {
    expect(partiallyEvaluateExpr(lit(null, "not"), envOf())).toEqual({ kind: "constant", value: null });
  });
  test("`not` blocked when env.allowNot = false", () => {
    const r = partiallyEvaluateExpr(lit(null, "not"), { constBindings: new Map(), allowNot: false });
    expect(r.kind).toBe("runtime");
  });
});

// ---------------------------------------------------------------------------
// §2 — Identifiers
// ---------------------------------------------------------------------------

describe("§2 identifiers resolve via env.constBindings only", () => {
  test("ident in const-bindings → constant", () => {
    expect(partiallyEvaluateExpr(ident("MAX"), envOf({ MAX: 100 })))
      .toEqual({ kind: "constant", value: 100 });
  });
  test("ident absent from bindings → runtime", () => {
    expect(partiallyEvaluateExpr(ident("missing"), envOf())).toEqual({ kind: "runtime" });
  });
  test("reactive ref @count is always runtime", () => {
    expect(partiallyEvaluateExpr(ident("@count"), envOf({ "@count": 7 }))).toEqual({ kind: "runtime" });
  });
});

// ---------------------------------------------------------------------------
// §3 — Unary ops
// ---------------------------------------------------------------------------

describe("§3 unary ops fold under prefix-only and arithmetic constraints", () => {
  test("!true → false", () => {
    expect(partiallyEvaluateExpr(un("!", lit(true)), envOf()))
      .toEqual({ kind: "constant", value: false });
  });
  test("-(3) → -3", () => {
    expect(partiallyEvaluateExpr(un("-", lit(3)), envOf()))
      .toEqual({ kind: "constant", value: -3 });
  });
  test("postfix ++ → runtime", () => {
    expect(partiallyEvaluateExpr(un("++", ident("x"), false), envOf({ x: 1 })))
      .toEqual({ kind: "runtime" });
  });
  test("typeof → runtime (out of subset)", () => {
    expect(partiallyEvaluateExpr(un("typeof", lit(3)), envOf())).toEqual({ kind: "runtime" });
  });
});

// ---------------------------------------------------------------------------
// §4 — Binary ops
// ---------------------------------------------------------------------------

describe("§4 binary arithmetic + comparison + logical", () => {
  test("2 + 3 → 5", () => {
    expect(partiallyEvaluateExpr(bin("+", lit(2), lit(3)), envOf()))
      .toEqual({ kind: "constant", value: 5 });
  });
  test("\"hello\" + \" world\" → \"hello world\"", () => {
    expect(partiallyEvaluateExpr(bin("+", lit("hello"), lit(" world")), envOf()))
      .toEqual({ kind: "constant", value: "hello world" });
  });
  test("mixed string + number → runtime (no JS coercion)", () => {
    expect(partiallyEvaluateExpr(bin("+", lit("x"), lit(1)), envOf())).toEqual({ kind: "runtime" });
  });
  test("2 == 2 → true", () => {
    expect(partiallyEvaluateExpr(bin("==", lit(2), lit(2)), envOf()))
      .toEqual({ kind: "constant", value: true });
  });
  test("&& short-circuits on falsy left", () => {
    const node = bin("&&", lit(false), ident("unknown"));
    expect(partiallyEvaluateExpr(node, envOf())).toEqual({ kind: "constant", value: false });
  });
  test("|| short-circuits on truthy left", () => {
    const node = bin("||", lit("ok"), ident("unknown"));
    expect(partiallyEvaluateExpr(node, envOf())).toEqual({ kind: "constant", value: "ok" });
  });
  test("?? short-circuits on non-null left", () => {
    expect(partiallyEvaluateExpr(bin("??", lit("a"), ident("unknown")), envOf()))
      .toEqual({ kind: "constant", value: "a" });
  });
});

// ---------------------------------------------------------------------------
// §5 — §42 absence operators
// ---------------------------------------------------------------------------

describe("§5 §42 absence operators", () => {
  test("null is not → true", () => {
    expect(partiallyEvaluateExpr(bin("is-not", lit(null), lit(null)), envOf()))
      .toEqual({ kind: "constant", value: true });
  });
  test("\"x\" is some → true", () => {
    expect(partiallyEvaluateExpr(bin("is-some", lit("x"), lit(null)), envOf()))
      .toEqual({ kind: "constant", value: true });
  });
  test("\"x\" is not not → true (presence)", () => {
    expect(partiallyEvaluateExpr(bin("is-not-not", lit("x"), lit(null)), envOf()))
      .toEqual({ kind: "constant", value: true });
  });
  test("undefined is not → true", () => {
    expect(partiallyEvaluateExpr(bin("is-not", lit(null, "undefined"), lit(null)), envOf()))
      .toEqual({ kind: "constant", value: true });
  });
});

// ---------------------------------------------------------------------------
// §6 — Ternary
// ---------------------------------------------------------------------------

describe("§6 ternary short-circuits", () => {
  test("cond=true → consequent (alternate not folded)", () => {
    expect(partiallyEvaluateExpr(tern(lit(true), lit(1), ident("nope")), envOf()))
      .toEqual({ kind: "constant", value: 1 });
  });
  test("cond=false → alternate", () => {
    expect(partiallyEvaluateExpr(tern(lit(false), ident("nope"), lit(2)), envOf()))
      .toEqual({ kind: "constant", value: 2 });
  });
  test("runtime cond → runtime", () => {
    expect(partiallyEvaluateExpr(tern(ident("x"), lit(1), lit(2)), envOf())).toEqual({ kind: "runtime" });
  });
});

// ---------------------------------------------------------------------------
// §7 — Array / object literals
// ---------------------------------------------------------------------------

describe("§7 array + object literals", () => {
  test("[1, 2, 3] → constant array", () => {
    expect(partiallyEvaluateExpr(arr(lit(1), lit(2), lit(3)), envOf()))
      .toEqual({ kind: "constant", value: [1, 2, 3] });
  });
  test("array with runtime element → runtime", () => {
    expect(partiallyEvaluateExpr(arr(lit(1), ident("x")), envOf())).toEqual({ kind: "runtime" });
  });
  test("{a:1,b:2} → constant object", () => {
    expect(partiallyEvaluateExpr(obj({ a: lit(1), b: lit(2) }), envOf()))
      .toEqual({ kind: "constant", value: { a: 1, b: 2 } });
  });
});

// ---------------------------------------------------------------------------
// §8 — Member and index access
// ---------------------------------------------------------------------------

describe("§8 member + index access on constant receivers", () => {
  test("({a:7}).a → 7", () => {
    expect(partiallyEvaluateExpr(mem(obj({ a: lit(7) }), "a"), envOf()))
      .toEqual({ kind: "constant", value: 7 });
  });
  test("missing prop → undefined", () => {
    expect(partiallyEvaluateExpr(mem(obj({ a: lit(7) }), "z"), envOf()))
      .toEqual({ kind: "constant", value: undefined });
  });
  test("null?.prop → undefined (optional chain)", () => {
    expect(partiallyEvaluateExpr(mem(lit(null), "x", true), envOf()))
      .toEqual({ kind: "constant", value: undefined });
  });
  test("null.prop → runtime (non-optional, would throw)", () => {
    expect(partiallyEvaluateExpr(mem(lit(null), "x", false), envOf()))
      .toEqual({ kind: "runtime" });
  });
  test("[10,20,30][1] → 20", () => {
    expect(partiallyEvaluateExpr(idx(arr(lit(10), lit(20), lit(30)), lit(1)), envOf()))
      .toEqual({ kind: "constant", value: 20 });
  });
  test("out-of-bounds → undefined", () => {
    expect(partiallyEvaluateExpr(idx(arr(lit(10)), lit(5)), envOf()))
      .toEqual({ kind: "constant", value: undefined });
  });
});

// ---------------------------------------------------------------------------
// §9 — Refusals (out-of-subset)
// ---------------------------------------------------------------------------

describe("§9 out-of-subset kinds → runtime", () => {
  test("call expr → runtime", () => {
    const call: ExprNode = { kind: "call", span: SPAN, callee: ident("f"), args: [], optional: false };
    expect(partiallyEvaluateExpr(call, envOf())).toEqual({ kind: "runtime" });
  });
  test("assignment → runtime", () => {
    const assign: ExprNode = {
      kind: "assign", span: SPAN, op: "=", target: ident("x"), value: lit(1),
    };
    expect(partiallyEvaluateExpr(assign, envOf())).toEqual({ kind: "runtime" });
  });
});

// ---------------------------------------------------------------------------
// §10 — Pure / non-throwing guarantee
// ---------------------------------------------------------------------------

describe("§10 defensive — never throws", () => {
  test("malformed node → runtime (no throw)", () => {
    // Intentionally pass a malformed node — primitive must catch.
    const bad = { kind: "wat" } as unknown as ExprNode;
    expect(partiallyEvaluateExpr(bad, envOf())).toEqual({ kind: "runtime" });
  });
});
