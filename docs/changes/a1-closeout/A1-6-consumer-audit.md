# A-1.6 — MarkupReadDGNode consumer audit

**Date:** 2026-05-13 (S89)
**Audit scope:** every DG-node consumer in `compiler/src/`. Verifies how each
consumer handles the new `MarkupReadDGNode` (kind: `"markup-read"`) added in
A-1.2 and emitted from 5 shape categories by A-1.3 / A-1.4 / A-1.5.

## Method

1. Located the producer (`compiler/src/dependency-graph.ts`).
2. Enumerated every file that imports `depGraph` / iterates `depGraph.nodes` /
   iterates `depGraph.edges`. Sources:
   - `grep -rn "depGraph" compiler/src/ --include="*.ts" --include="*.js"`
   - `grep -rn "DGNode\|dgNode" compiler/src/ --include="*.ts" --include="*.js"`
3. For each consumer, classified its handling of `MarkupReadDGNode`:
   - **explicit** — discriminates by `kind` and processes it
   - **skip-by-comment** — discriminates by `kind` and skips with justification
   - **implicit-skip** — kind-discriminator switch silently filters it out
     (acceptable; documented below)
   - **passthrough** — never touches DG contents; only re-emits the reference
4. Flagged any consumer that could crash on or silently mishandle the new node.

## Consumer inventory (5 consumers)

| # | File | Function / call site | Touches DG how | Disposition |
|---|------|---------------------|----------------|-------------|
| 1 | `compiler/src/codegen/scheduling.ts` | `findDGNodeForStmt` (line 77) iterates `depGraph.nodes`, matches by `span.start`. `scheduleStatements` (line 149) iterates `depGraph.edges`, filters `edge.kind !== "awaits"`. | iterates both nodes + edges | **implicit-skip** (SAFE) |
| 2 | `compiler/src/batch-planner.ts` | `runBatchPlanner` (line 614+) iterates `depGraph.nodes`, filters `kind === "sql-query" && nobatch === true`. | iterates nodes | **implicit-skip** (SAFE) |
| 3 | `compiler/src/codegen/index.ts` | `runCG` (line 202) iterates `depGraph.edges`, validates both endpoints exist in `depGraph.nodes`. | iterates edges, no kind discrimination | **passthrough** (SAFE — markup-read nodes are registered via `nodes.set` in `dependency-graph.ts:1901`, so edges to/from them resolve) |
| 4 | `compiler/src/meta-eval.ts` | `runMetaEval` (line 610-633) accepts `depGraph` in input, never iterates, returns it in output. | passthrough | **passthrough** (SAFE) |
| 5 | `compiler/src/codegen/emit-functions.ts` | `emitFunctions` (line 90, line 466) destructures `depGraph` from context, forwards to `scheduleStatements`. | passthrough | **passthrough** (covered by #1) |

Other files that touch `depGraph` only as an opaque pass-through field
(`codegen/context.ts`, `codegen/analyze.ts`, `api.js`) are not separate
consumers — they propagate the reference without iterating it.

## Per-consumer disposition detail

### Consumer 1 — `compiler/src/codegen/scheduling.ts`

**Site A — `findDGNodeForStmt` (line 77-87):**
```ts
for (const [nodeId, dgNode] of depGraph.nodes) {
  if (dgNode.span && (dgNode.span as { start?: number }).start === stmtSpan.start &&
      ((dgNode.span as { file?: string }).file === stmtSpan.file || ...)) {
    return nodeId;
  }
}
```
Matches a logic-block statement to a DG node by exact `span.start` collision.
Caller is gated by `hasServerCallees(fnNode)` (line 183) — only function
bodies containing server-fn calls invoke `findDGNodeForStmt`.

A `MarkupReadDGNode.span` is the interpolation site (a bare-expr inside
markup children, or an attr/condition span). Statement spans live in logic
blocks `${...}`. The two regions do not overlap structurally — a markup-read
span lies inside markup children, never inside `<server function ...>` bodies.

Even if a hypothetical span collision occurred, the function returns the
matched node id and the caller passes it into `depSets`-based scheduling.
The `awaits` edge filter at line 220 means only `"awaits"` edges are
consulted — `markup-read` edges (kind: `"reads"`) are dropped.

**Verdict: implicit-skip, SAFE.** No code path can mis-classify a
MarkupReadDGNode as a logic statement.

**Site B — edge iteration (line 219-226):**
```ts
for (const edge of (depGraph.edges ?? [])) {
  if (edge.kind !== "awaits") continue;
  ...
}
```
All new `markup-read` edges are kind: `"reads"` — filtered out at line 220.
**Verdict: implicit-skip, SAFE.**

### Consumer 2 — `compiler/src/batch-planner.ts`

**Site — `runBatchPlanner` (line 614-623):**
```ts
const dg = input.depGraph;
if (dg && dg.nodes) {
  for (const [nodeId, node] of dg.nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as { kind?: string; nobatch?: boolean };
    if (n.kind === "sql-query" && n.nobatch === true) {
      batchPlan.nobatchSites.add(nodeId);
    }
  }
}
```
Filters strictly on `kind === "sql-query"`. MarkupReadDGNode falls through
silently. **Verdict: implicit-skip, SAFE.**

### Consumer 3 — `compiler/src/codegen/index.ts`

**Site — edge validation (line 202-219):**
```ts
for (const edge of safeDepGraph.edges) {
  if (!safeDepGraph.nodes.has(edge.from)) {
    errors.push(new CGError("E-CG-003", ...));
  }
  if (!safeDepGraph.nodes.has(edge.to)) {
    errors.push(new CGError("E-CG-003", ...));
  }
}
```
Validates that every edge endpoint exists as a registered node. The producer
(`dependency-graph.ts:1901`) calls `nodes.set(mrNodeId, mrDGNode)` before
emitting any edge referencing that id, so this validation passes.

**Verdict: passthrough, SAFE.** No regression risk — A-1.7 measurement
confirms 523 new edges land without E-CG-003 firing (test suite passes).

### Consumer 4 — `compiler/src/meta-eval.ts`

Accepts `depGraph?: unknown` in input, returns it unchanged in output. Never
inspects contents. **Verdict: passthrough, SAFE.**

### Consumer 5 — `compiler/src/codegen/emit-functions.ts`

Destructures `depGraph` from `CompileContext` and forwards to
`scheduleStatements`. Covered by Consumer 1. **Verdict: passthrough, SAFE.**

## Flagged issues

**None.** All 5 consumers handle `MarkupReadDGNode` safely via implicit-skip
or passthrough. The full test suite passes (11,912 pass / 0 fail) with 523
markup-read nodes and 523 markup-read → reactive `reads` edges live in the
DG across the corpus.

## Map references

- Producer location confirmed via `schema.map.md` (predates A-1; the entry
  for `MarkupReadDGNode` is missing — flagged for next `/map incremental`).
- No `error.map.md` entries needed (no new error codes, no E-CG-003 fires).
- `test.map.md` predates the dg-markup-read-emission-a13/a14/a15 + node-a12
  tests — also flagged for `/map incremental`.

## Conclusion

5 consumers audited; **0 flagged**. The kind-discriminator pattern across DG
consumers means new DG node kinds default-skip cleanly without per-consumer
updates — this is a property of the design, not coincidence. No follow-on
work required for A-1.6.
