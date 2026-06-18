/**
 * @module block-analysis-footprint
 *
 * D1 — the SHALLOW, dotted-path read/write footprint of a single block node
 * (function-decl / component-def / engine-decl body). This is the BREAK-1 fix
 * for the block-analysis sidecar (change-id `block-analysis-emit-2026-06-18`):
 * flogence's block-lease / dock tooling needs a DOTTED-grain footprint
 * (`quoteForm.originCity` distinct from `quoteForm.weightLbs`) so two fns that
 * each write a different field of the same compound cell can run as DISJOINT
 * leases. The body-DG's `reads`/`writes` collapse every field write to the ROOT
 * cell (`quoteForm`) — correct for the reorder DG (two field writes to one COW
 * value MUST stay ordered) but too coarse for the lease.
 *
 * ADD-ALONGSIDE: this module is the SECOND consumer of the already-stamped
 * dotted resolution. It does NOT re-resolve and it does NOT touch
 * `body-dg-builder.ts` — the body-DG's root-cell `reads`/`writes` + edges stay
 * byte-identical (SCOPE §2, the zero-fixture-delta guarantee).
 *
 * SHALLOW (SCOPE §4): a write is in `writes` iff its assignment node is
 * lexically inside the block's own body — NO call-graph. `@x = sendMessage()`
 * records a write to `x` and reads of the call's argument idents, but does NOT
 * pull `sendMessage`'s writes. Control-flow bodies (if / for / while / match /
 * try) ARE lexically inside the block, so we recurse into them; nested
 * function / component / engine declarations have their OWN span (their own
 * block), so we do NOT descend into them.
 *
 * The dotted resolution this READS is built by `reactive-deps.ts`:
 *   - `stampCompoundDeepSetTargets` stamps `_deepSetLeafKey` on every
 *     `reactive-nested-assign` whose target is a structural compound parent.
 *   - `extractReactiveDepsFromExprNode` extracts `@var` reads from an ExprNode
 *     tree (string-literal-aware — `@x` inside `"…@x…"` is NOT a read).
 */

import {
  stampCompoundDeepSetTargets,
  extractReactiveDepsFromExprNode,
} from "./codegen/reactive-deps.ts";

/** A loosely-typed AST node. */
type AnyNode = Record<string, unknown>;

/** A loosely-typed ExprNode. */
type AnyExpr = Record<string, unknown>;

/**
 * The SHALLOW dotted-path footprint of a single block.
 *
 * Both arrays are SORTED, de-duplicated, and carry NO `@` prefix
 * (`messageForm.draft`, `errorMessage`).
 */
export interface BlockFootprint {
  reads: string[];
  writes: string[];
}

// ---------------------------------------------------------------------------
// Statement-list discovery
// ---------------------------------------------------------------------------

/**
 * The statement list of a block node, when it carries a STRUCTURED one.
 *
 * `function-decl` carries `body: LogicStatement[]` — the shallow footprint
 * walks it. `component-def` (only `.raw` template text) and `engine-decl`
 * (raw `rulesRaw` body text; `bodyChildren` are markup state-children, not
 * logic statements with field writes) have no structured logic-statement body
 * at v1 → honest-empty footprint (SCOPE §3). The builder (D2) decides which
 * node to hand us; we extract whatever structured statements the node carries
 * and otherwise return nothing.
 */
function blockBodyStatements(node: AnyNode | undefined): unknown[] {
  if (!node || typeof node !== "object") return [];
  const body = node.body;
  if (Array.isArray(body)) return body;
  return [];
}

// ---------------------------------------------------------------------------
// Member-chain dotted-path extraction (the INVERSE of body-dg-builder.ts
// `addAssignTargetWrites`, KEEPING the segments instead of collapsing to base)
// ---------------------------------------------------------------------------

/**
 * Resolve the dotted write path of an assignment LHS ExprNode, KEEPING the
 * member segments (the inverse of `body-dg-builder.ts addAssignTargetWrites`,
 * which walks to the base ident and discards the path).
 *
 * `@obj.prop = v`     → `{ path: "obj.prop", indexReads: [] }`
 * `@obj = v`          → `{ path: "obj", indexReads: [] }`
 * `@grid[@sel] = v`   → `{ path: "grid", indexReads: [<@sel ExprNode>] }`
 *                       (the dotted path stops at the first COMPUTED index,
 *                        which cannot extend a static leaf key; the index
 *                        expression itself is a READ — mirrors the
 *                        `_deepSetLeafKey` static-prefix rule)
 *
 * Returns `null` when the LHS is not an `@`-prefixed reactive write target
 * (e.g. a plain local `let x` reassignment) — those are not lease footprint.
 */
function dottedWriteFromExprTarget(
  target: AnyExpr | undefined,
): { path: string; indexReads: AnyExpr[] } | null {
  if (!target || typeof target !== "object") return null;

  // Collect the static member segments from the OUTSIDE in, then reverse.
  const segmentsReversed: string[] = [];
  const indexReads: AnyExpr[] = [];
  let cur: AnyExpr | undefined = target;

  while (cur && typeof cur === "object") {
    const kind = cur.kind;
    if (kind === "member") {
      const property = cur.property;
      if (typeof property === "string") segmentsReversed.push(property);
      cur = cur.object as AnyExpr | undefined;
      continue;
    }
    if (kind === "index") {
      // A computed index (`[@sel]`) cannot join into a static dotted leaf key —
      // it terminates the dotted path (everything BELOW the index stays the
      // base path) and the index expression rides into reads.
      const index = cur.index as AnyExpr | undefined;
      if (index) indexReads.push(index);
      // Discard the segments collected ABOVE the computed index: the write
      // path resolves only to the base + static-below-the-index portion, and
      // we keep walking down to the base ident so `path` is the base cell.
      segmentsReversed.length = 0;
      cur = cur.object as AnyExpr | undefined;
      continue;
    }
    break;
  }

  if (!cur || typeof cur !== "object" || cur.kind !== "ident") return null;
  const rawName = cur.name;
  if (typeof rawName !== "string" || !rawName.startsWith("@")) return null;

  const base = rawName.slice(1); // strip @
  segmentsReversed.reverse();
  const path = segmentsReversed.length > 0 ? `${base}.${segmentsReversed.join(".")}` : base;
  return { path, indexReads };
}

// ---------------------------------------------------------------------------
// reactive-nested-assign dotted-write resolution (READS the stamped leaf key)
// ---------------------------------------------------------------------------

/**
 * The dotted write target of a `reactive-nested-assign` node.
 *
 * Prefers the stamped `_deepSetLeafKey` (the deepest statically-resolvable
 * backing leaf, e.g. `quoteForm.originCity`). When UNstamped (a flat-object
 * field write, or `stampCompoundDeepSetTargets` left it alone because the
 * target is not a compound parent), falls back to `target` joined with the
 * STATIC string prefix of `path` — stopping at the first computed `{ index }`
 * segment, which cannot join a dotted key (mirrors the stamp's own resolution).
 */
function dottedWriteFromNestedAssign(node: AnyNode): string {
  const leaf = node._deepSetLeafKey;
  if (typeof leaf === "string" && leaf.length > 0) return leaf;

  const target = typeof node.target === "string" ? node.target : "";
  if (!target) return "";

  const path = Array.isArray(node.path) ? (node.path as unknown[]) : [];
  const segments: string[] = [];
  for (const seg of path) {
    if (typeof seg === "string") {
      segments.push(seg);
    } else {
      // computed `{ index }` — terminates the static dotted prefix.
      break;
    }
  }
  return segments.length > 0 ? `${target}.${segments.join(".")}` : target;
}

// ---------------------------------------------------------------------------
// Read collection
// ---------------------------------------------------------------------------

/** Add every `@var` read in an ExprNode tree to `reads` (string-literal-aware). */
function addExprReads(expr: unknown, reads: Set<string>): void {
  if (!expr || typeof expr !== "object") return;
  for (const name of extractReactiveDepsFromExprNode(expr)) {
    reads.add(name);
  }
}

/** Add the computed index-segment reads of a `reactive-nested-assign` path. */
function addNestedAssignIndexReads(node: AnyNode, reads: Set<string>): void {
  const path = Array.isArray(node.path) ? (node.path as unknown[]) : [];
  for (const seg of path) {
    if (seg && typeof seg === "object") {
      addExprReads((seg as { index?: unknown }).index, reads);
    }
  }
}

// ---------------------------------------------------------------------------
// Statement walk (SHALLOW — recurse control-flow, NOT nested declarations)
// ---------------------------------------------------------------------------

/**
 * Kinds whose presence opens a NEW block (own span) — the shallow footprint
 * does NOT descend into them. A nested function/component/engine declaration
 * is its own lease anchor; pulling its writes into the enclosing block's
 * footprint would be transitive (BREAK-2), not shallow.
 */
const NESTED_BLOCK_KINDS = new Set<string>([
  "function-decl",
  "component-def",
  "engine-decl",
]);

/** Walk one statement, contributing its reads / writes to the accumulators. */
function walkStatement(stmt: unknown, reads: Set<string>, writes: Set<string>): void {
  if (!stmt || typeof stmt !== "object") return;
  const node = stmt as AnyNode;
  const kind = typeof node.kind === "string" ? node.kind : "";

  // A nested declaration opens its own block — do NOT descend (SHALLOW).
  if (NESTED_BLOCK_KINDS.has(kind)) return;

  switch (kind) {
    case "state-decl": {
      // `<x> = expr` / `@x = expr` — declares (writes) the bare cell name.
      // A compound parent declaration writes the parent name; its field
      // children are separate decls the walk visits via `children`.
      const name = typeof node.name === "string" ? node.name : "";
      if (name) writes.add(name);
      addExprReads(node.initExpr, reads);
      break;
    }

    case "reactive-assign": {
      // V-kill bare `@name = value` — writes the bare cell name.
      const target = typeof node.target === "string" ? node.target : "";
      if (target) writes.add(target);
      addExprReads(node.valueExpr, reads);
      break;
    }

    case "let-decl":
    case "const-decl":
    case "tilde-decl":
    case "lin-decl": {
      // Plain local declarations — the RHS contributes reads. Local binding
      // names are NOT reactive-cell writes, so they are not lease footprint.
      addExprReads(node.initExpr, reads);
      break;
    }

    case "reactive-nested-assign": {
      // `@obj.path = value` — dotted write via the stamped leaf key.
      const dotted = dottedWriteFromNestedAssign(node);
      if (dotted) writes.add(dotted);
      addExprReads(node.valueExpr, reads);
      addNestedAssignIndexReads(node, reads);
      break;
    }

    case "reactive-array-mutation": {
      // `@arr.push(x)` — mutates (writes) the cell. Args are a raw string at
      // this node; the shallow footprint records the bare cell write. (Arg
      // reads are unavailable without re-parse — conservative omit; the lease
      // already orders on the cell write.)
      const target = typeof node.target === "string" ? node.target : "";
      if (target) writes.add(target);
      break;
    }

    case "bare-expr": {
      // May be an assignment `@x = expr` / `@obj.prop = v`, a server-fn call,
      // or any expression. Inspect the structured ExprNode.
      walkBareExpr(node.exprNode as AnyExpr | undefined, reads, writes);
      break;
    }

    case "return-stmt":
    case "throw-stmt": {
      addExprReads(node.exprNode, reads);
      break;
    }

    case "propagate-expr": {
      // `const x = expr?` — binds a LOCAL `x` (not a reactive cell), reads RHS.
      addExprReads(node.exprNode, reads);
      break;
    }

    case "if-stmt": {
      addExprReads(node.condExpr, reads);
      walkBody(node.consequent, reads, writes);
      walkBody(node.alternate, reads, writes);
      break;
    }

    case "while-stmt": {
      addExprReads(node.condExpr, reads);
      walkBody(node.body, reads, writes);
      break;
    }

    case "for-stmt": {
      addExprReads(node.iterExpr, reads);
      const cParts = node.cStyleParts as
        | { initExpr?: unknown; condExpr?: unknown; updateExpr?: unknown }
        | undefined;
      if (cParts) {
        addExprReads(cParts.initExpr, reads);
        addExprReads(cParts.condExpr, reads);
        addExprReads(cParts.updateExpr, reads);
      }
      // The loop variable is a body-local binding — not a top-level write.
      walkBody(node.body, reads, writes);
      break;
    }

    case "switch-stmt":
    case "match-stmt": {
      addExprReads(node.headerExpr, reads);
      walkBody(node.body, reads, writes);
      break;
    }

    case "match-arm-inline": {
      // `.Variant => resultExpr` — the result expression contributes reads.
      addExprReads(node.resultExpr, reads);
      break;
    }

    case "try-stmt": {
      walkBody(node.body, reads, writes);
      const catchNode = node.catchNode as { body?: unknown } | undefined;
      if (catchNode) walkBody(catchNode.body, reads, writes);
      const finallyNode = node.finallyNode as { body?: unknown } | undefined;
      if (finallyNode) walkBody(finallyNode.body, reads, writes);
      break;
    }

    default:
      // Unknown / unmodelled statement — conservatively contributes nothing.
      // A generic `children`/`arms`/`body` array is still walked below so a
      // structural wrapper (markup/logic) does not hide its statements.
      break;
  }

  // Structural wrappers (markup / logic) hold their statements in `children`
  // or `body`; match-arm-block holds arm statements in `body`. Walk any
  // generic statement array a known case did not already consume so a block
  // node handed to us wrapped (e.g. a logic node) still yields its footprint.
  if (!HANDLED_BODY_KINDS.has(kind)) {
    if (Array.isArray(node.children)) walkBody(node.children, reads, writes);
    if (Array.isArray(node.body)) walkBody(node.body, reads, writes);
    if (Array.isArray(node.arms)) {
      for (const arm of node.arms as unknown[]) {
        if (arm && typeof arm === "object" && Array.isArray((arm as AnyNode).body)) {
          walkBody((arm as AnyNode).body, reads, writes);
        }
      }
    }
  }
}

/**
 * Kinds whose `body`/`children` the explicit `switch` above already walked.
 * The generic fall-through walk skips these to avoid double-visiting (which
 * is harmless for a Set, but the explicit cases also handle their headers /
 * branch-specific shapes, so the generic pass would only re-traverse).
 */
const HANDLED_BODY_KINDS = new Set<string>([
  "if-stmt",
  "while-stmt",
  "for-stmt",
  "switch-stmt",
  "match-stmt",
  "try-stmt",
  "function-decl",
  "component-def",
  "engine-decl",
]);

/** Walk a `bare-expr`'s ExprNode (an assignment or a plain expression). */
function walkBareExpr(exprNode: AnyExpr | undefined, reads: Set<string>, writes: Set<string>): void {
  if (!exprNode || typeof exprNode !== "object") return;
  if (exprNode.kind === "assign") {
    const target = exprNode.target as AnyExpr | undefined;
    const value = exprNode.value as AnyExpr | undefined;
    const dotted = dottedWriteFromExprTarget(target);
    if (dotted) {
      writes.add(dotted.path);
      for (const idx of dotted.indexReads) addExprReads(idx, reads);
    }
    // A compound-assignment (`+=` etc.) also READS the target.
    const op = typeof exprNode.op === "string" ? exprNode.op : "=";
    if (op !== "=") addExprReads(target, reads);
    addExprReads(value, reads);
  } else {
    // Non-assignment bare expression (e.g. a bare server-fn call). All
    // `@var` references are reads.
    addExprReads(exprNode, reads);
  }
}

/** Walk a statement list (a function body, a control-flow branch). */
function walkBody(body: unknown, reads: Set<string>, writes: Set<string>): void {
  if (!Array.isArray(body)) return;
  for (const stmt of body) walkStatement(stmt, reads, writes);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The SHALLOW dotted-path read/write footprint of a single block node.
 *
 * @param node    A block node — `function-decl` / `component-def` /
 *                `engine-decl`. Only `function-decl` carries a structured
 *                logic body at v1; the others yield an honest-empty footprint
 *                (SCOPE §3).
 * @param fileAST The enclosing FileAST (`{ nodes }` or `{ ast: { nodes } }`).
 *                Optional. When provided, `stampCompoundDeepSetTargets` is run
 *                idempotently so `_deepSetLeafKey` is present on the block's
 *                `reactive-nested-assign` nodes — the dotted-grain distinction
 *                (`quoteForm.originCity` vs `quoteForm.weightLbs`, BREAK-1)
 *                depends on it. The stamp is in-place on the shared AST nodes
 *                and guarded by a WeakSet, so re-running it is a no-op.
 * @returns       `{ reads, writes }` — SORTED, de-duplicated, NO `@` prefix.
 */
export function footprintForBlock(
  node: AnyNode,
  fileAST?: Record<string, unknown>,
): BlockFootprint {
  // Ensure the dotted leaf keys are stamped on the shared AST. Idempotent
  // (WeakSet-guarded) and a no-op when the file declares no compound parents.
  if (fileAST && typeof fileAST === "object") {
    stampCompoundDeepSetTargets(fileAST);
  }

  const reads = new Set<string>();
  const writes = new Set<string>();

  walkBody(blockBodyStatements(node), reads, writes);

  return {
    reads: [...reads].sort(),
    writes: [...writes].sort(),
  };
}
