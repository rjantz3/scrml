// =============================================================================
// exprtext-backfill-walker.ts — native string-`.expr`/`.init`/`.condition`
// backfill from the structured `exprNode`/`initExpr`/`condExpr` siblings.
//
// THE GAP this closes
//   The native parser (compiler/native-parser/translate-stmt.js) DELIBERATELY
//   sets the legacy runtime string fields empty on Expr-bearing nodes:
//     makeBareExpr   (L457) -> `{ expr: "", exprNode }`
//     makeReturnStmt (L1689) -> `{ expr: "", exprNode? }`
//     makeYieldStmt  (L1724) -> `{ expr: "", exprNode? }`
//     makeThrowStmt  (L2048) -> `{ expr: "", exprNode? }`
//     decl builders  (L881/924/963/1005) -> `{ init: "", initExpr }`
//     if/while       (L1336/1357...) -> `{ condition: "", condExpr }`
//   "native does not retain raw source text on Expr nodes, and codegen prefers
//   exprNode" (translate-stmt.js:451-453). Codegen IS migrated — it reads the
//   structured siblings. But the type-system's lifecycle / bare-variant /
//   enum-subset enforcement is 100% REGEX-OVER-TEXT and is a SEPARATE,
//   un-migrated consumer:
//
//     checkLifecycleBindingAccess (type-system.ts:16920) walks logic bodies and
//     calls its inner `statementText(node)` (type-system.ts:17108), which reads
//     ONLY the STRING fields:
//         node.value / node.expr / node.text / node.raw / node.init /
//         node.condition
//     then scans that joined text with FIELD_ACCESS_RE / TRANSITION_CALL_RE.
//     It has ZERO `exprNode` references.
//
//   Under native, a `bare-expr` carrying `@phase.publishedAt` has `expr: ""`, so
//   `statementText` returns "" -> the lifecycle access is INVISIBLE -> E-TYPE-001
//   never fires (live fires 1, native fires 0). Same blind-spot for the
//   enum-subset fn-return text-pass. (Note the OTHER `statementText` overload at
//   type-system.ts:15993 was already migrated — it reads `exprNode`/`initExpr`
//   via emitStringFromTree. This walker closes the 17108 overload's gap WITHOUT
//   editing the type-system: we backfill the string field the un-migrated reader
//   already looks at.)
//
// THE FIX (this walker)
//   Recurse the assembled native FileAST and, for any node that carries a
//   populated structured Expr sibling but a missing/empty string field, stamp
//   the string field by reconstructing it from the ExprNode via
//   `emitStringFromTree` (expression-parser.ts:2382), which rebuilds e.g.
//   "@phase.publishedAt" exactly (member: object="@phase", sep=".",
//   property="publishedAt"). Three pairings, mirroring the native field shapes:
//       exprNode  -> expr
//       initExpr  -> init
//       condExpr  -> condition
//   These are EXACTLY the three structured siblings native leaves empty AND the
//   string fields the 17108 text-reader scans.
//
// WHY HERE (placement, not in translate-stmt.js)
//   `emitStringFromTree` is an `import("./expression-parser.ts")` from the live
//   compiler/src/ pipeline. Native-parser modules import ONLY native-parser
//   siblings; pulling a compiler/src/ symbol into the native tree would invert
//   the M6 self-host layering (native is the front-end; it must not depend on
//   the live pipeline). So the backfill runs on the compiler/src/ side, in the
//   SAME native->live bridge home as attrvalue-exprnode-walker.ts, over the
//   assembled native FileAST. api.js invokes it on the native path right after
//   `populateNativeAttrValueExprNodes` (the live path already populates these
//   string fields inline in ast-builder.js, so this is native-ONLY — the
//   default pipeline never invokes it and is untouched).
//
// INERTNESS FOR CODEGEN (verified — see the dispatch report)
//   Native left `.expr`/`.init`/`.condition` empty FOR A CODEGEN REASON
//   ("codegen prefers exprNode"). Codegen reading PATHS prefer the structured
//   sibling and IGNORE the string field whenever the sibling is present (e.g.
//   emit-logic dispatches on `exprNode.kind`; type-system.ts:11792 reads
//   `node.expr` ONLY `!nodeAny.exprNode`). Because this walker NEVER overwrites a
//   non-empty existing string AND only stamps where a structured sibling is
//   present, populating the previously-empty string is INERT for codegen emit:
//   every consumer that has the sibling keeps reading the sibling. The string
//   field newly carries the round-tripped text purely for the un-migrated
//   text-readers. (Verified empirically: byte-identical native emit before/after
//   on previously-empty-`.expr` fixtures + conformance/within-node parity.)
//
// SCOPE DISCIPLINE
//   - Backfill ONLY when (a) the structured sibling is a non-null object with a
//     `.kind` (a real ExprNode) AND (b) the paired string field is missing or
//     the empty string. Never overwrite a non-empty existing string.
//   - Touch ONLY nodes that have a structured sibling. A node with no sibling is
//     left exactly as-is (e.g. SQL-form return/yield carry `sqlNode` + omit
//     `exprNode` -> no `.expr` backfill -> correct, there is no lifecycle text to
//     recover from SQL).
//   - Idempotent: a re-walk, or a value already carrying a non-empty string, is
//     a no-op.
// =============================================================================

import { emitStringFromTree } from "../expression-parser.ts";
import type { ExprNode } from "../types/ast.ts";

// The structured-sibling -> string-field pairings native leaves empty. Each
// entry is `[exprNodeKey, stringKey]`. These mirror the native translate-stmt.js
// builders AND the fields the type-system.ts:17108 `statementText` reader scans.
const BACKFILL_PAIRINGS: ReadonlyArray<readonly [string, string]> = [
  ["exprNode", "expr"],
  ["initExpr", "init"],
  ["condExpr", "condition"],
];

// isExprNode — a value qualifies as a structured ExprNode sibling when it is a
// non-null object carrying a `.kind` discriminant (the ExprNode contract). null
// (the native "no argument" sentinel, e.g. bare `return`) does NOT qualify.
function isExprNode(v: unknown): v is ExprNode {
  return v !== null && v !== undefined && typeof v === "object"
    && typeof (v as { kind?: unknown }).kind === "string";
}

// isMissingOrEmptyString — the paired string field is a backfill candidate when
// it is absent OR the empty string. Any non-empty string is left untouched
// (native never produces a partial string here, but this guards a re-walk and a
// value the bridge may already have populated).
function isMissingOrEmptyString(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

// backfillNodeExprText — stamp the legacy string field(s) on ONE node from its
// structured Expr sibling(s) when the string is missing/empty. Mutates in place
// (the node objects are freshly assembled by the native make*/translate*
// builders; the string field is purely additive for the un-migrated text-reader
// and is never read by any consumer that already has the structured sibling).
function backfillNodeExprText(node: Record<string, unknown>): void {
  for (const [exprKey, stringKey] of BACKFILL_PAIRINGS) {
    const sibling = node[exprKey];
    if (!isExprNode(sibling)) continue;
    if (!isMissingOrEmptyString(node[stringKey])) continue;
    try {
      node[stringKey] = emitStringFromTree(sibling);
    } catch {
      // emitStringFromTree is total over well-formed ExprNodes; a malformed
      // sibling falls through leaving the string empty (the pre-walk state) so a
      // backfill failure can never corrupt the node.
    }
  }
}

// backfillNativeExprText — walk an assembled native FileAST and backfill the
// legacy `.expr`/`.init`/`.condition` string fields from their structured
// `exprNode`/`initExpr`/`condExpr` siblings on every node that left them empty.
//
// The walk mirrors `populateNativeAttrValueExprNodes` (attrvalue-exprnode-walker
// .ts) discipline: an iterative stack walk over the FileAST node collections +
// every nested object/array, with a `seen` set guarding shared references
// (engine bodies reach the same node objects via `machineDecls[].bodyChildren`).
// Descending the whole tree (rather than gating on a `kind` allowlist) reaches
// nodes inside logic bodies / if-branches / match-arms / lift / for-expr
// subtrees — exactly where the lifecycle / enum-subset text-passes look.
export function backfillNativeExprText(ast: unknown): unknown {
  if (ast === null || ast === undefined || typeof ast !== "object") return ast;
  const fileAst = ast as Record<string, unknown>;

  const roots = [
    fileAst.nodes,
    fileAst.imports,
    fileAst.exports,
    fileAst.components,
    fileAst.typeDecls,
    fileAst.machineDecls,
    fileAst.channelDecls,
  ];

  const stack: unknown[] = [];
  for (const root of roots) {
    if (Array.isArray(root)) {
      for (const item of root) stack.push(item);
    }
  }

  const seen = new Set<unknown>();
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === null || cur === undefined || typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    if (Array.isArray(cur)) {
      for (const item of cur) {
        if (item !== null && typeof item === "object") stack.push(item);
      }
      continue;
    }

    const node = cur as Record<string, unknown>;

    // Backfill the legacy string fields from their structured siblings.
    backfillNodeExprText(node);

    // Descend every object/array field so nested children / body / if-branch /
    // match-arm / lift-expr / for-expr subtrees are reached. The raw native
    // escape hatches are NOT descended (their PascalCase-`kind` blocks are the
    // engine walker's source; the translated FileAST nodes carry the backfill
    // targets, and a double-visit would be a no-op via the missing/empty guard
    // anyway, but pruning keeps the walk aligned with the attr-value walker).
    for (const k of Object.keys(node)) {
      if (k === "_nativeEngineBlock" || k === "_source") continue;
      const v = node[k];
      if (v !== null && typeof v === "object") stack.push(v);
    }
  }

  return ast;
}
