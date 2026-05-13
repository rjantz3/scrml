/**
 * reachability/gate-classifier — Per-gate classification tests.
 *
 * S89 wave A-2.2.c — exercises `detectGate` + `classifyGate` against
 * synthesized markup-node fixtures covering the four gate families
 * (none / if / details / match / auth) plus the constant-folding
 * decision table.
 */

import { describe, test, expect } from "bun:test";
import {
  detectGate,
  classifyGate,
  type GateKind,
} from "../../src/reachability/gate-classifier.ts";
import type { ConstFoldEnv } from "../../src/codegen/constant-folder.ts";
import type {
  ASTNode,
  AttrNode,
  ExprNode,
  ExprSpan,
  MarkupNode,
  Span,
} from "../../src/types/ast.ts";

const SPAN: Span = { file: "t.scrml", start: 0, end: 0, line: 1, col: 1 };
const ESPAN: ExprSpan = { start: 0, end: 0 };

let nextId = 1;
function nid(): number { return nextId++; }

function lit(value: any, litType: any = "number"): ExprNode {
  return { kind: "lit", span: ESPAN, raw: String(value), value, litType };
}
function ident(name: string): ExprNode {
  return { kind: "ident", span: ESPAN, name };
}

function exprAttr(name: string, exprNode: ExprNode): AttrNode {
  return {
    name,
    value: { kind: "expr", raw: "<synthetic>", refs: [], exprNode, span: SPAN },
    span: SPAN,
  };
}
function stringAttr(name: string, value: string): AttrNode {
  return {
    name,
    value: { kind: "string-literal", value, span: SPAN },
    span: SPAN,
  };
}

function markup(tag: string, attrs: AttrNode[] = [], children: ASTNode[] = []): MarkupNode {
  return {
    id: nid(), span: SPAN, kind: "markup",
    tag, attrs, children, selfClosing: false,
    closerForm: `</${tag}>`, isComponent: false,
  };
}

function emptyEnv(): ConstFoldEnv {
  return { constBindings: new Map() };
}

// ---------------------------------------------------------------------------
// §1 — Gate detection
// ---------------------------------------------------------------------------

describe("§1 detectGate identifies the gate family", () => {
  test("regular markup with no gating attrs → none", () => {
    const div = markup("div");
    expect(detectGate(div)).toEqual({ kind: "none" });
  });
  test("<details> → details (tag-level)", () => {
    expect(detectGate(markup("details"))).toEqual({ kind: "details" });
  });
  test("<auth role=admin> → auth", () => {
    expect(detectGate(markup("auth", [stringAttr("role", "admin")]))).toEqual({ kind: "auth" });
  });
  test("<match on=@x> → match (on-expr captured)", () => {
    const node = markup("match", [exprAttr("on", ident("@x"))]);
    const g = detectGate(node);
    expect(g.kind).toBe("match");
    if (g.kind === "match") expect(g.onExpr).not.toBeNull();
  });
  test("<div if=expr> → if (cond captured)", () => {
    const node = markup("div", [exprAttr("if", lit(true, "bool"))]);
    const g = detectGate(node);
    expect(g.kind).toBe("if");
    if (g.kind === "if") expect(g.cond).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §2 — classifyGate decision table
// ---------------------------------------------------------------------------

describe("§2 classifyGate decision table", () => {
  test("none → in", () => {
    expect(classifyGate({ kind: "none" }, emptyEnv())).toBe("in");
  });
  test("details → worst-case", () => {
    expect(classifyGate({ kind: "details" }, emptyEnv())).toBe("worst-case");
  });
  test("auth (placeholder) → worst-case", () => {
    expect(classifyGate({ kind: "auth" }, emptyEnv())).toBe("worst-case");
  });

  test("if cond=true (closed-form) → in", () => {
    const g: GateKind = { kind: "if", cond: lit(true, "bool") };
    expect(classifyGate(g, emptyEnv())).toBe("in");
  });
  test("if cond=false (closed-form) → out", () => {
    const g: GateKind = { kind: "if", cond: lit(false, "bool") };
    expect(classifyGate(g, emptyEnv())).toBe("out");
  });
  test("if cond=runtime ident → worst-case", () => {
    const g: GateKind = { kind: "if", cond: ident("@count") };
    expect(classifyGate(g, emptyEnv())).toBe("worst-case");
  });
  test("if cond=null → worst-case", () => {
    expect(classifyGate({ kind: "if", cond: null }, emptyEnv())).toBe("worst-case");
  });

  test("if cond uses const-bound ident → resolved", () => {
    const env: ConstFoldEnv = { constBindings: new Map([["IS_DEV", true]]) };
    expect(classifyGate({ kind: "if", cond: ident("IS_DEV") }, env)).toBe("in");
    const env2: ConstFoldEnv = { constBindings: new Map([["IS_DEV", false]]) };
    expect(classifyGate({ kind: "if", cond: ident("IS_DEV") }, env2)).toBe("out");
  });

  test("match on=constant → in (block admitted)", () => {
    const g: GateKind = { kind: "match", onExpr: lit("A", "string") };
    expect(classifyGate(g, emptyEnv())).toBe("in");
  });
  test("match on=runtime → worst-case", () => {
    const g: GateKind = { kind: "match", onExpr: ident("@cell") };
    expect(classifyGate(g, emptyEnv())).toBe("worst-case");
  });
});

// ---------------------------------------------------------------------------
// §3 — Composition: detect + classify in one shot
// ---------------------------------------------------------------------------

describe("§3 detect-then-classify integration", () => {
  test("<div if=true> → in", () => {
    const node = markup("div", [exprAttr("if", lit(true, "bool"))]);
    expect(classifyGate(detectGate(node), emptyEnv())).toBe("in");
  });
  test("<div if=false> → out", () => {
    const node = markup("div", [exprAttr("if", lit(false, "bool"))]);
    expect(classifyGate(detectGate(node), emptyEnv())).toBe("out");
  });
  test("<details>...</details> → worst-case", () => {
    expect(classifyGate(detectGate(markup("details")), emptyEnv())).toBe("worst-case");
  });
  test("string-literal if attr is NOT foldable → worst-case", () => {
    // if="false" (string literal, not expression form) — the classifier
    // refuses to coerce string literals to booleans.
    const node = markup("div", [stringAttr("if", "false")]);
    expect(classifyGate(detectGate(node), emptyEnv())).toBe("worst-case");
  });
});
