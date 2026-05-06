# Phase 4d completion sweep — progress log

Append-only timestamped log. Each line: timestamp + what was just done + what's next + any blockers.

## Baseline (Phase 1 step 1)

- 2026-05-06T00:00 — Working dir: `/home/bryan-maclee/scrmlMaster/scrmlTS/`
- 2026-05-06T00:00 — `git status --short`: clean
- 2026-05-06T00:00 — Baseline HEAD SHA: `df7d6d4f15f7b0af139a346cd809fde2b5c1194c` (`dfd0f3d` short — main)
- 2026-05-06T00:00 — Baseline test counts: **8928 pass, 44 skip, 1 todo, 0 fail; 31599 expect calls; 8973 tests / 440 files**
- 2026-05-06T00:00 — Note: ECONNREFUSED stderr noise from one test that does live HTTP; not a failing test.

## Survey

### Phase 1 step 2 — `@deprecated Phase 4d` field inventory in `compiler/src/types/ast.ts`

Audit said ~32 markers; current count is **19** (Phase 4d sweep partially landed already). Mapping:

| # | Interface | Field | Replacement | Line |
|---|---|---|---|---|
| 1 | LetDeclNode | `init?: string` | `initExpr?: ExprNode` | 372 |
| 2 | ConstDeclNode | `init?: string` | `initExpr?: ExprNode` | 389 |
| 3 | TildeDeclNode | `init?: string` | `initExpr?: ExprNode` | 409 |
| 4 | LinDeclNode | `init?: string` | `initExpr?: ExprNode` | 423 |
| 5 | ReactiveDeclNode (state-decl) | `init?: string` | `initExpr?: ExprNode` | 436 |
| 6 | ReactiveDerivedDeclNode | `init?: string` | `initExpr?: ExprNode` | 576 |
| 7 | ReactiveDebouncedDeclNode | `init?: string` | `initExpr?: ExprNode` | 587 |
| 8 | ReactiveNestedAssignNode | `value?: string` | `valueExpr?: ExprNode` | 605 |
| 9 | IfStmtNode | `condition?: string` | `condExpr?: ExprNode` | 684 |
| 10 | IfExprNode | `condition?: string` | `condExpr?: ExprNode` | 697 |
| 11 | ForExprNode | `iterable?: string` | `iterExpr?: ExprNode` | 712 |
| 12 | MatchExprNode | `header?: string` | `headerExpr?: ExprNode` | 723 |
| 13 | ForStmtNode | `iterable?: string` | `iterExpr?: ExprNode` | 736 |
| 14 | WhileStmtNode | `condition?: string` | `condExpr?: ExprNode` | 749 |
| 15 | ReturnStmtNode | `expr?: string` | `exprNode?: ExprNode` | 760 |
| 16 | ThrowStmtNode | `expr?: string` | `exprNode?: ExprNode` | 769 |
| 17 | SwitchStmtNode | `header?: string` | `headerExpr?: ExprNode` | 778 |
| 18 | MatchStmtNode | `header?: string` | `headerExpr?: ExprNode` | 808 |
| 19 | PropagateExprNode | `expr?: string` | `exprNode?: ExprNode` | 902 |

### Phase 1 step 3 — Retired reactive-* AST kinds

**MAJOR FINDING: Audit was wrong on retirement count.** Only `reactive-derived-decl` is truly retired (folded into state-decl at S60, parser no longer constructs it). The other 4 are STILL ACTIVELY CONSTRUCTED by `ast-builder.js`:

| AST kind | Truly retired? | ast-builder.js construction sites | Walker handlers |
|---|---|---|---|
| `reactive-derived-decl` | YES — only `ast.ts:573` defines kind; all other refs are comments | NONE | NONE (only comments referencing the fold) |
| `reactive-debounced-decl` | NO — still constructed | lines 3799, 5567 | component-expander, emit-logic, emit-client, route-inference, type-system |
| `reactive-array-mutation` | NO — still constructed | lines 3900, 5685 | route-inference, emit-logic, type-system, component-expander |
| `reactive-explicit-set` | NO — still constructed | lines 3979, 5819 | route-inference, emit-client, emit-logic, component-expander |
| `reactive-nested-assign` | NO — still constructed | lines 3915, 5701 | component-expander, emit-logic, emit-client, route-inference, type-system |

**Scope correction:** Cluster A drops only `ReactiveDerivedDeclNode` interface (1 of 5). The other 4 nodes have `@deprecated Phase 4d` fields (table rows 7, 8) that are part of Cluster B; they're still live AST kinds.

### Phase 1 step 4 — Read-site classification for deprecated string fields

Sampled `node.init` / `(n as ASTNodeLike).init` accesses. Findings:

- `compiler/src/codegen/emit-logic.ts:490, 511, 518, 553, 580, 655, 1177, 1304` — class (a) **walker fallback branches** using `node.init ?? ""` with `emitExprField(node.initExpr, fallback, ctx)`. The fallback is reachable when ast-builder produces `init: ""` + no initExpr (sql-init case, if/for/match-as-expression case where init is empty placeholder).
- `compiler/src/codegen/scheduling.ts:102, 125`, `collect.ts:376, 479`, `meta-eval.ts:507, 521` — class (a) using `typeof ... === "string"` defensive reads. Fall back to `""` when missing.
- `compiler/src/dependency-graph.ts:945, 958, 1178, 1233` — class (a) walker fallback.
- `compiler/src/type-system.ts:3932, 3951, 3970, 4104-4107, 4349, 4537, 4547, 4561, 6390-6392, 6857, 7343, 7452` — mostly class (a) ASTNodeLike-cast reads.
- `compiler/src/meta-checker.ts:737, 1189` — class (b) **active consumers** reading `node.init` directly without ASTNodeLike cast.
- `compiler/src/codegen/reactive-deps.ts:397` — class (a) `(n.init as string) ?? ""`.

Similar pattern for `.condition`, `.iterable`, `.header`, `.expr`, `.value`, etc. — predominantly class (a) walker fallbacks.

**`safeParseExprToNode` returns `undefined` for empty/whitespace expr.** This means `initExpr` is **NOT always populated** as the doc claim suggests. Specifically, when ast-builder emits `init: ""` (placeholder cases like ifExpr/forExpr/matchExpr/sqlNode shapes), there's no `initExpr` either — consumer must check both for the alternative branch (ifExpr/forExpr/etc.) AND defaultable fallback.

**Conclusion on field-drop strategy:**
1. The deprecated string field declarations CAN safely be dropped from `ast.ts` (TypeScript types only). At runtime, ast-builder.js still writes the fields (they're untyped properties post-drop). Consumers using `(n as ASTNodeLike).init` work unchanged. Consumers reading `node.init` directly on a typed discriminant would surface a TS-only error, but `bun test` does type erasure — only runtime matters for the test suite. Pre-commit hook is `bun test`, no `tsc --noEmit`.
2. The runtime fallback path `node.init ?? ""` STILL WORKS post-drop because ast-builder.js continues to populate `init: ""`/`init: expr` at runtime. We can choose later (out of scope) to also drop the runtime field.
3. **Therefore: this dispatch's safe scope is the TypeScript field declaration drop.** Fully cleaning the runtime field would require the consumer migrations to use `*Expr` exclusively, which is a separate larger sweep.

### Phase 1 step 5 — Dual-shape fallback at type-system.ts:7909

Audit-referenced comment "the dual-shape fallback that buildOverloadRegistry uses at line 4060" is GONE — `buildOverloadRegistry` was deleted in Stage 0c.A. Current type-system.ts:7909 is innocuous prose about `importedTypesByFile`.

A different "dual-shape" exists at type-system.ts:4990, 7583, 7606, 7859 — but it refers to `fileAST.nodes` vs `fileAST.ast.nodes` (CE output vs raw shape), which is unrelated to the `@deprecated Phase 4d` cluster. NOT IN SCOPE.

**Result:** Chunk 3 (drop dual-shape fallback) has nothing to remove — already gone post-Stage 0c.A.

### Strategy

Adjusted plan based on survey findings:

- **Chunk 1 (consumer migration):** SKIP — too large; class (a) walker fallbacks are correct as-is, will survive the field drop because ast-builder.js still populates the runtime field.
- **Chunk 2 (drop deprecated TS field declarations):** core action. 19 fields removed from ast.ts.
- **Chunk 3 (dual-shape fallback):** SKIP — already removed in Stage 0c.A.
- **Chunk 4 (prune walker arms for retired reactive-* AST kinds):** narrowed to the single `reactive-derived-decl` kind. The other 4 stay (still constructed).
- **Chunk 5 (drop the retired AST kind interface):** narrowed to `ReactiveDerivedDeclNode`.
- **Chunk 6 (docs/cleanup):** primer §12 update.

