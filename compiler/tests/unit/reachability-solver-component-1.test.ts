/**
 * Reachability Solver — Component 1 conformance suite.
 *
 * S89 wave A-2.2 — exercises `initially_rendered_components` per
 * SPEC §40.9.2 + §40.9.9 worked example via the full
 * `runReachabilitySolver` entry point (covers A-2.2.a entry-point
 * enumeration, A-2.2.c per-gate classification, A-2.2.d worst-case-
 * union admission acting in concert).
 *
 * Each test constructs a synthetic FileAST directly (bypassing the
 * BS/TAB pipeline) so the Component 1 path is exercised in isolation.
 *
 * Coverage:
 *   §1  SPA entry-point enumeration produces one record entry.
 *   §2  Multi-page entry-point enumeration produces one entry per <page>.
 *   §3  Closed-form `if=` IN classification.
 *   §4  Closed-form `if=` OUT classification (subtree dropped).
 *   §5  Runtime `if=` WORST-CASE-UNION admission (both arms admitted).
 *   §6  <details> worst-case admission (per §40.9.9 worked example).
 *   §7  <match> static-cell evaluation (constant on-expr → admit).
 *   §8  Nested gates (if inside details, etc.).
 *   §9  Empty markup body → empty initial-render set.
 *   §10 <auth> placeholder treatment (worst-case at A-2.2; A-2.5 refines).
 */

import { describe, test, expect } from "bun:test";
import { runReachabilitySolver } from "../../src/reachability-solver.ts";
import type {
  ASTNode,
  AttrNode,
  ExprNode,
  ExprSpan,
  FileAST,
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
    id: nid(), span: SPAN, kind: "markup", tag, attrs, children,
    selfClosing: false, closerForm: `</${tag}>`, isComponent: false,
  };
}

function file(filePath: string, nodes: ASTNode[]): FileAST {
  return {
    filePath, nodes,
    imports: [], exports: [], components: [], typeDecls: [],
    spans: {},
    hasProgramRoot: nodes.some(n => n && (n as MarkupNode).tag === "program"),
    authConfig: null, middlewareConfig: null,
  };
}

function runOne(files: FileAST[]) {
  return runReachabilitySolver({ depGraph: null, files });
}

function firstPlan(record: ReturnType<typeof runOne>["record"]) {
  const [, rps] = record.closures.entries().next().value;
  return rps.byRole.get("_anonymous")!;
}

// ---------------------------------------------------------------------------
// §1 — SPA enumeration
// ---------------------------------------------------------------------------

describe("§1 SPA entry-point enumeration", () => {
  test("single SPA file → one closure entry", () => {
    const program = markup("program", [], [markup("body", [], [markup("h1")])]);
    const { record, errors } = runOne([file("/abs/spa.scrml", [program])]);
    expect(errors).toEqual([]);
    expect(record.closures.size).toBe(1);
    const [id] = record.closures.keys();
    expect(id).toBe("/abs/spa.scrml#program");
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.size).toBe(2); // <body> + <h1>
  });
});

// ---------------------------------------------------------------------------
// §2 — Multi-page enumeration
// ---------------------------------------------------------------------------

describe("§2 multi-page entry-point enumeration", () => {
  test("two <page> children → two closure entries (each isolated)", () => {
    const pageA = markup("page", [stringAttr("path", "/a")], [markup("div")]);
    const pageB = markup("page", [stringAttr("path", "/b")], [markup("span"), markup("nav")]);
    const program = markup("program", [], [pageA, pageB]);
    const { record } = runOne([file("/abs/m.scrml", [program])]);
    expect(record.closures.size).toBe(2);
    const planA = record.closures.get("/abs/m.scrml#page@/a")!.byRole.get("_anonymous")!;
    const planB = record.closures.get("/abs/m.scrml#page@/b")!.byRole.get("_anonymous")!;
    expect(planA.initialChunk.componentNodeIds.size).toBe(1);
    expect(planB.initialChunk.componentNodeIds.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// §3 — Closed-form if= IN
// ---------------------------------------------------------------------------

describe("§3 closed-form if= IN classification", () => {
  test("<div if=true> → admitted to initial set", () => {
    const gated = markup("div", [exprAttr("if", lit(true, "bool"))]);
    const program = markup("program", [], [gated]);
    const { record } = runOne([file("/abs/t.scrml", [program])]);
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.has(gated.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §4 — Closed-form if= OUT
// ---------------------------------------------------------------------------

describe("§4 closed-form if= OUT classification — subtree dropped", () => {
  test("<div if=false><span/></div> → both ids absent from initial set", () => {
    const dropped = markup("span");
    const gated = markup("div", [exprAttr("if", lit(false, "bool"))], [dropped]);
    const sibling = markup("p");
    const program = markup("program", [], [gated, sibling]);
    const { record } = runOne([file("/abs/t.scrml", [program])]);
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.has(gated.id)).toBe(false);
    expect(plan.initialChunk.componentNodeIds.has(dropped.id)).toBe(false);
    // The sibling without an if= attribute IS admitted.
    expect(plan.initialChunk.componentNodeIds.has(sibling.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §5 — Runtime if= → WORST-CASE-UNION
// ---------------------------------------------------------------------------

describe("§5 runtime if= → worst-case-union admission", () => {
  test("<div if=@count><span/></div> + sibling → BOTH admitted (over-include)", () => {
    const inner = markup("span");
    const runtime = markup("div", [exprAttr("if", ident("@count"))], [inner]);
    const sibling = markup("p");
    const program = markup("program", [], [runtime, sibling]);
    const { record } = runOne([file("/abs/t.scrml", [program])]);
    const plan = firstPlan(record);
    // Worst-case: both the gated branch AND the sibling are admitted.
    expect(plan.initialChunk.componentNodeIds.has(runtime.id)).toBe(true);
    expect(plan.initialChunk.componentNodeIds.has(inner.id)).toBe(true);
    expect(plan.initialChunk.componentNodeIds.has(sibling.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6 — <details> worst-case admission (§40.9.9)
// ---------------------------------------------------------------------------

describe("§6 <details> worst-case admission per §40.9.9 worked example", () => {
  test("<details><ProfileWidget/></details> → admitted", () => {
    const widget = markup("ProfileWidget");
    const details = markup("details", [], [widget]);
    const program = markup("program", [], [details]);
    const { record } = runOne([file("/abs/dash.scrml", [program])]);
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.has(details.id)).toBe(true);
    expect(plan.initialChunk.componentNodeIds.has(widget.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §7 — <match on=constant> evaluation
// ---------------------------------------------------------------------------

describe("§7 <match> static-cell evaluation", () => {
  test("<match on=constant> → admitted (block-level IN)", () => {
    const arm = markup("div");
    const match = markup("match", [exprAttr("on", lit("A", "string"))], [arm]);
    const program = markup("program", [], [match]);
    const { record } = runOne([file("/abs/m.scrml", [program])]);
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.has(match.id)).toBe(true);
    expect(plan.initialChunk.componentNodeIds.has(arm.id)).toBe(true);
  });
  test("<match on=@cell> → worst-case-admitted (runtime)", () => {
    const arm = markup("div");
    const match = markup("match", [exprAttr("on", ident("@cell"))], [arm]);
    const program = markup("program", [], [match]);
    const { record } = runOne([file("/abs/m.scrml", [program])]);
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.has(match.id)).toBe(true);
    expect(plan.initialChunk.componentNodeIds.has(arm.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §8 — Nested gates
// ---------------------------------------------------------------------------

describe("§8 nested gates", () => {
  test("if=false outside, details inside → all dropped (outer kills)", () => {
    const inner = markup("widget");
    const details = markup("details", [], [inner]);
    const outer = markup("div", [exprAttr("if", lit(false, "bool"))], [details]);
    const program = markup("program", [], [outer]);
    const { record } = runOne([file("/abs/n.scrml", [program])]);
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.has(outer.id)).toBe(false);
    expect(plan.initialChunk.componentNodeIds.has(details.id)).toBe(false);
    expect(plan.initialChunk.componentNodeIds.has(inner.id)).toBe(false);
  });
  test("details outside, if=false inside → outer admitted, inner subtree dropped", () => {
    const innerDropped = markup("widget");
    const innerOut = markup("div", [exprAttr("if", lit(false, "bool"))], [innerDropped]);
    const innerKept = markup("p");
    const details = markup("details", [], [innerOut, innerKept]);
    const program = markup("program", [], [details]);
    const { record } = runOne([file("/abs/n.scrml", [program])]);
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.has(details.id)).toBe(true);
    expect(plan.initialChunk.componentNodeIds.has(innerOut.id)).toBe(false);
    expect(plan.initialChunk.componentNodeIds.has(innerDropped.id)).toBe(false);
    expect(plan.initialChunk.componentNodeIds.has(innerKept.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §9 — Empty body
// ---------------------------------------------------------------------------

describe("§9 empty markup body", () => {
  test("<program/> with no children → entry exists, initial set empty", () => {
    const program = markup("program", [], []);
    const { record } = runOne([file("/abs/e.scrml", [program])]);
    expect(record.closures.size).toBe(1);
    const plan = firstPlan(record);
    expect(plan.initialChunk.componentNodeIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §10 — <auth> placeholder (A-2.5 will refine)
// ---------------------------------------------------------------------------

describe("§10 <auth> placeholder — worst-case until A-2.5", () => {
  test("<auth role=admin><a/></auth> → admitted (over-include placeholder)", () => {
    const link = markup("a");
    const auth = markup("auth", [stringAttr("role", "admin")], [link]);
    const program = markup("program", [], [auth]);
    const { record } = runOne([file("/abs/a.scrml", [program])]);
    const plan = firstPlan(record);
    // Per A-2.2 placeholder semantics: auth is worst-case admitted.
    // A-2.5 Component 4 refines this to per-role visibility.
    expect(plan.initialChunk.componentNodeIds.has(auth.id)).toBe(true);
    expect(plan.initialChunk.componentNodeIds.has(link.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §11 — Determinism
// ---------------------------------------------------------------------------

describe("§11 determinism — identical input → identical output", () => {
  test("two runs over the same files produce identical entry-id order", () => {
    const program = markup("program", [], [
      markup("page", [stringAttr("path", "/x")]),
      markup("page", [stringAttr("path", "/y")]),
    ]);
    const f = file("/abs/d.scrml", [program]);
    const r1 = runOne([f]);
    const r2 = runOne([f]);
    expect(Array.from(r1.record.closures.keys())).toEqual(
      Array.from(r2.record.closures.keys()),
    );
  });
});
