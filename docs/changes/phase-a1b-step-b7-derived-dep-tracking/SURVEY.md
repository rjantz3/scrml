# A1b B7 — Phase 0 Survey

Date: 2026-05-07
Cost: ~30 min (existing infra is mature; gap is narrow)
Verdict: PROCEED — existing infra extends naturally; estimate near 5h end (low end of audit range).

## (a) Existing §31 dep-graph machinery

**File:** `compiler/src/dependency-graph.ts` (1714 lines).

Substantial. The DG already:
- Collects derived state-decl nodes (`collectAllReactiveDerivedDecls`, line 481+; folded shape from A1a Step 11.5).
- Walks RHS expressions for `@var` reads (`collectReactiveRefsFromExprNode`, line 227) — **direct deps already tracked**, emits `reads` edges for `derived → upstream` (line 1118-1129).
- Walks RHS expressions for callees (`collectCalleesFromExprNode`, line 246) — emits `calls`/`awaits` edges (line 1131-1142).
- Builds a function call graph and propagates **transitive reactive reads via fixed-point** (lines 1278-1392).
- Propagates transitive reads through derived → fn-call edges (lines 1394-1422).
- DFS cycle detection (`detectAwaitsCycle`, line 758) — currently scoped to `awaits` edges only (E-DG-001).

**Gaps for B7:**
1. Transitive read propagation **does NOT distinguish pure `fn` from reactive `function`** — currently EVERY callee propagates its reads to the caller (line 1370-1371). SPEC §31.5 + §48 require pure `fn` to skip implicit deps.
2. **No cycle detection on the derived `reads` subgraph** — only `awaits` cycles are checked. SPEC §6.6.10 requires DFS over derived dep edges to fire `E-DERIVED-CIRCULAR-DEP`.
3. No `E-DERIVED-CIRCULAR-DEP` error code is emitted anywhere yet.
4. The self-edge prevention at line 1120 (`if (varName === dgNode.varName) continue; // no self-edge`) **suppresses the degenerate cycle case** that SPEC §6.6.10 line 2712 says SHALL fire E-DERIVED-CIRCULAR-DEP. We must track self-references separately (to fire the error) without polluting the edge list.

## (b) `fn`-purity recognition

**Available on AST:** `FunctionDeclNode.fnKind: "function" | "fn"` (per `compiler/src/types/ast.ts` line 616).

`type-system.ts` already keys off `fnKind === "fn"` for purity (line 3385, 3932, etc.). Pure detection is `node.fnKind === "fn"`. No new machinery needed; just thread it through dep-graph callee filtering.

`collectAllFunctions` returns `FunctionDeclNode[]` so `fnKind` is reachable inline.

## (c) Function-body recursive walker

`forEachIdentInExprNode` (in `expression-parser.ts`) is the canonical IdentExpr walker, already used in dep-graph and elsewhere. Existing fixed-point propagation in dep-graph (lines 1357-1392) IS the transitive walker we need to extend with pure-fn filtering.

## (d) B5 `_cellKind` annotation

`getCellKind` (symbol-table.ts) and `_cellKind` discriminant per B5. B7 needs to walk `state-decl` where `decl.shape === "derived"` AND `decl.structuralForm === false` (the post-fold representation of `const <name> = expr`). Already covered by `collectAllReactiveDerivedDecls`.

## Reusability constraint (audit §1.4 + §1.5)

The dep-edge structure used (`DGEdge { from, to, kind: "reads" | ... }`) is already generic. B10/B11/B12 (validator-arg deps, §31.4) can build on the same `reads`-edge mechanism. B16 (engine-derived) will need a new node kind in DG but cycle detection will reuse the same DFS algorithm.

**Design decision:** keep the cycle-detection algorithm parameterized on adjacency-map + node-set (mirroring `detectAwaitsCycle`'s shape) so B16 can call it with a different edge filter.

## Implementation plan (revised)

1. **Extract a generic DFS cycle finder** that takes adjacency + start set, returns first cycle. Already mostly there as `detectAwaitsCycle`; rename/generalize.
2. **Build derived-cell `reads` adjacency** for the cycle scan: filter `edges` where `from` and `to` are both `reactive` DG nodes AND `kind === "reads"`. For self-references, capture them separately during dep collection (since line 1120 strips them) and treat as 1-cycles.
3. **Filter pure-fn callees** in the transitive-reads propagation (line 1370-1371) — skip if the callee's `FunctionDeclNode.fnKind === "fn"`. Plumb `fnKind` into `fnCallGraphMap` or a sibling map `fnIsPureMap`.
4. **Fire E-DERIVED-CIRCULAR-DEP** when a cycle is found in the derived-reads subgraph.
5. **Tests** in `compiler/tests/unit/derived-circular-dep.test.js`: direct cycle, self-reference, multi-hop cycle, transitive-via-pure-fn (no false positive — pure `fn` has NO implicit dep), transitive-via-reactive-function (cycle DOES fire), legitimate chain (a→b→c, no cycle).

## STOP triggers — none fire

- (i) §31 machinery is rich and extends cleanly: the gap is narrow (cycle scan + pure-fn filter).
- (ii) `fnKind` purity is already in AST; trivially threadable.
- (iii) Walker changes are local to `dependency-graph.ts`; do not conflict with B5/B6.

Estimated remaining work: 4-5h (low end of audit's 5-7h "extends infra" path).
