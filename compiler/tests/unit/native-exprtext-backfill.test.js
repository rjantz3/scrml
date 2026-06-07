// native-exprtext-backfill.test.js — native-parser-swap parity-closer.
//
// THE GAP (S170 native-flip TYPE-MATCH bucket CASE-1): under
// `--parser=scrml-native`, the native make*/translate* builders
// (compiler/native-parser/translate-stmt.js) DELIBERATELY set the legacy string
// fields empty on Expr-bearing nodes (`makeBareExpr` -> `expr: ""` + `exprNode`;
// decl builders -> `init: ""` + `initExpr`; if/while -> `condition: ""` +
// `condExpr`), because "codegen prefers exprNode" (translate-stmt.js:451). But
// the type-system's lifecycle / bare-variant / enum-subset enforcement is
// regex-over-TEXT: `checkLifecycleBindingAccess`'s inner `statementText`
// (type-system.ts:17108) reads ONLY node.value/expr/text/raw/init/condition
// strings — ZERO `exprNode` references. Under native, a `bare-expr` carrying
// `@phase.publishedAt` has `expr: ""`, so the access is INVISIBLE and E-TYPE-001
// never fires (live fires 1, native 0).
//
// THE FIX: compiler/src/native-walker/exprtext-backfill-walker.ts
// (`backfillNativeExprText`) walks the assembled native FileAST and backfills the
// legacy string field(s) from the structured sibling(s) via emitStringFromTree:
//   exprNode -> expr ; initExpr -> init ; condExpr -> condition
// only when the structured sibling is present AND the string is missing/empty
// (never overwrites a non-empty existing string; never touches a node without a
// sibling). api.js runs it on the native `_buildAST` path only, right after
// populateNativeAttrValueExprNodes; the default pipeline is untouched.
//
// These tests assert (1) the walker stamps each pairing directly on synthetic
// nodes, (2) the scope-discipline guards (idempotence, no-sibling no-op,
// non-empty preserved), and (3) the end-to-end native parse round-trips the
// expression text so the type-system text-passes can read it.

import { describe, test, expect } from "bun:test";
import { backfillNativeExprText } from "../../src/native-walker/exprtext-backfill-walker.ts";
import { nativeParseFile } from "../../native-parser/parse-file.js";

// wrapFileAST — minimal FileAST shell the walker recurses (it reads the standard
// root collections; only `nodes` is needed here).
function wrapFileAST(nodes) {
  return { nodes, imports: [], exports: [], components: [], typeDecls: [], machineDecls: [], channelDecls: [] };
}

// memberExpr — a structured ExprNode for `@obj.field` (the member form the
// lifecycle text-pass needs to see).
function memberExpr(objName, field) {
  return { kind: "member", object: { kind: "ident", name: objName }, property: field, optional: false };
}

describe("exprtext-backfill-walker — direct field stamping", () => {
  test("exprNode -> expr: stamps an empty .expr from a member exprNode", () => {
    const node = { kind: "bare-expr", expr: "", exprNode: memberExpr("@phase", "publishedAt") };
    backfillNativeExprText(wrapFileAST([node]));
    expect(node.expr).toBe("@phase.publishedAt");
  });

  test("initExpr -> init: stamps an empty .init from a structured initExpr", () => {
    const node = {
      kind: "state-decl", name: "phase", init: "",
      initExpr: { kind: "member", object: { kind: "ident", name: "Article" }, property: "Published", optional: false },
    };
    backfillNativeExprText(wrapFileAST([node]));
    expect(node.init).toBe("Article.Published");
  });

  test("condExpr -> condition: stamps an empty .condition from a binary condExpr", () => {
    const node = {
      kind: "if-stmt", condition: "",
      condExpr: { kind: "binary", op: "is", left: { kind: "ident", name: "@phase" }, right: { kind: "ident", name: ".Draft" } },
      consequent: [], alternate: [],
    };
    backfillNativeExprText(wrapFileAST([node]));
    expect(node.condition).toBe("@phase is .Draft");
  });

  test("backfills nested nodes inside a logic body (recursive descent)", () => {
    const inner = { kind: "bare-expr", expr: "", exprNode: memberExpr("@phase", "publishedAt") };
    const logic = { kind: "logic", body: [inner] };
    backfillNativeExprText(wrapFileAST([logic]));
    expect(inner.expr).toBe("@phase.publishedAt");
  });
});

describe("exprtext-backfill-walker — scope discipline", () => {
  test("never overwrites a non-empty existing string field", () => {
    const node = { kind: "bare-expr", expr: "already.here", exprNode: memberExpr("@phase", "publishedAt") };
    backfillNativeExprText(wrapFileAST([node]));
    expect(node.expr).toBe("already.here");
  });

  test("no-op on a node with no structured sibling", () => {
    const node = { kind: "bare-expr", expr: "" };
    backfillNativeExprText(wrapFileAST([node]));
    expect(node.expr).toBe("");
  });

  test("no-op when the sibling is null (the native bare-return sentinel)", () => {
    // makeReturnStmt: a bare `return` has `argument: null` -> exprNode omitted /
    // null. The string must stay "" (there is no expression to recover).
    const node = { kind: "return-stmt", expr: "", exprNode: null };
    backfillNativeExprText(wrapFileAST([node]));
    expect(node.expr).toBe("");
  });

  test("idempotent: a second walk does not change an already-backfilled node", () => {
    const node = { kind: "bare-expr", expr: "", exprNode: memberExpr("@phase", "publishedAt") };
    backfillNativeExprText(wrapFileAST([node]));
    const first = node.expr;
    backfillNativeExprText(wrapFileAST([node]));
    expect(node.expr).toBe(first);
  });

  test("backfills all three pairings on a single node when each string is empty", () => {
    // A synthetic node carrying all three structured siblings + all three empty
    // string fields (each pairing is independent).
    const node = {
      kind: "synthetic-multi",
      expr: "", exprNode: memberExpr("@a", "x"),
      init: "", initExpr: { kind: "ident", name: "seed" },
      condition: "", condExpr: { kind: "ident", name: "@flag" },
    };
    backfillNativeExprText(wrapFileAST([node]));
    expect(node.expr).toBe("@a.x");
    expect(node.init).toBe("seed");
    expect(node.condition).toBe("@flag");
  });

  test("graceful on non-object input (returns the argument)", () => {
    expect(backfillNativeExprText(null)).toBe(null);
    expect(backfillNativeExprText(undefined)).toBe(undefined);
    expect(backfillNativeExprText(42)).toBe(42);
  });
});

describe("exprtext-backfill-walker — end-to-end native parse round-trip", () => {
  // After the native parser builds the FileAST, the backfill must make the
  // bare-expr READ text visible to the type-system text-passes. We assert the
  // round-tripped string equals the source expression.
  test("native bare-expr `@phase.publishedAt` round-trips into .expr", () => {
    const src = `type Article:enum = { Draft(body: string), Published(body: string, publishedAt: number) }

<phase>: (.Draft to .Published) = Article.Draft

\${
    @phase.publishedAt
}`;
    const res = nativeParseFile("/test/backfill.scrml", src);
    backfillNativeExprText(res.ast);
    // Find the bare-expr carrying the member read.
    let found = null;
    const stack = [...res.ast.nodes];
    const seen = new Set();
    while (stack.length > 0) {
      const n = stack.pop();
      if (!n || typeof n !== "object" || seen.has(n)) continue;
      seen.add(n);
      if (Array.isArray(n)) { for (const x of n) stack.push(x); continue; }
      if (n.kind === "bare-expr" && n.exprNode && n.exprNode.kind === "member") found = n;
      for (const k of Object.keys(n)) { const v = n[k]; if (v && typeof v === "object") stack.push(v); }
    }
    expect(found).not.toBeNull();
    expect(found.expr).toBe("@phase.publishedAt");
  });
});
