# Progress: r4-expression-catalog-continuation-survey

- [start] WORKTREE_PATH=/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a09514afba6a5f89a
- [start] HEAD (initial) = 136678e5 (S121 wrap)
- [rebase] rebased onto main 30327bd1 to pick up M6.2a (9d64ff4c) + M6.4a (30327bd1)
- [phase-1] inventory of translate-expr.js R4 surface complete
- [phase-2] reproduced 4/5 bug-5 with wip-migration.patch — 3 distinct expression-emit blanks in one fixture, not 1
- [phase-3] expression-catalog gap is NOT just "task.title text-interpolation" — it is the entire R1 ride-through chain
- [phase-4] wrote 6-unit decomposition plan
- [phase-5] survey doc only; patch reverted; clean git status

## Phase 1 — R4 surface inventory (escape-hatches + ride-throughs)

`translate-expr.js` (the A2 bridge) is a fully implemented module (1041 LOC,
40 ExprKind cases handled). The **escape-hatches** it surfaces explicitly are
7 (all documented in the file header L97-115):

| Native ExprKind | Escape-hatch nativeKind | Notes |
|---|---|---|
| `This`            | `"This"`            | no live equivalent |
| `Super`           | `"Super"`           | no live equivalent |
| `TaggedTemplate`  | `"TaggedTemplate"`  | no live equivalent |
| `Sequence`        | `"Sequence"`        | no live equivalent |
| `Yield`           | `"Yield"`           | scrml has no generators |
| `Render`          | `"Render"`          | live has `render` but not as ExprNode |
| `MarkupValue`     | `"MarkupValue"`     | RESOLVED for `lift` arg by M6.2a `translateMarkupValueToLiveNode`; still escape-hatched at A2 if it lands at any OTHER expression position |

Statement-shaped escape-hatches when reaching A2 at expr-position (rare; the
statement bridge normally intercepts):
`Lift`, `Fail`, `Propagate`, `GuardedExpr`.

Defensive escape-hatches (malformed AST):
`RestElement`, `AssignmentPattern`, `BlockStub`, unrecognized kind.

**Lambda block body is empty-stubbed**: `translateLambdaBody` (L719) returns
`{ kind:"block", stmts: [] }` for a `BlockStub` body — A2 explicitly defers the
re-parse to C1. `emit-expr.ts` falls back to `/* block body */` comment.

**SQL nodeId is -1**: `translateSql` (L860) emits unresolved sentinel. C1 is
documented to re-stamp at FileAST assembly.

## Phase 1.5 — THE MISSING WIRING (load-bearing finding)

**`translateExpr` is implemented + unit-tested (149 tests) but never invoked
from the pipeline.** `grep -rn translateExpr compiler/{native-parser,src}/`
returns ONLY references inside `translate-expr.{js,scrml}` itself and the
unit-test file. Neither `parse-file.js` (C1, the FileAST assembler) nor
`translate-stmt.js` (R1, the statement bridge) calls it.

A2 was tracked as "COMPLETE" because the module is implemented. The
**INTEGRATION** of A2 with R1+C1 — the wiring that would make A2 functional
under `--parser=scrml-native` — was never landed. This is the
"expression-catalog reconciliation gap" the M6.2a agent identified.

## Phase 2 — bug-5 failure cataloged

With wip-migration.patch applied (M6.2's `parseComponentBody` →
`nativeParseFile` swap), the failing test is `5a — nested component inside
another component's lift body expands cleanly`. The TaskCard expansion's
emitted JS contains **three** distinct expression blanks, NOT one:

```js
// Column body — `<h2>${name}</h2>` emits:
_scrml_lift_el_3.appendChild(document.createTextNode(String( ?? "")));
//                                                          ^^^^ name lost
// Column body — `for (let task of @tasks.filter(...))` emits:
for (const task of ) {
//                  ^ @tasks.filter(name) lost
// TaskCard body — `${task.title}` emits:
_scrml_lift_el_5.appendChild(document.createTextNode(String( ?? "")));
//                                                          ^^^^ task.title lost
```

All three failures share ONE root cause: the M6.2 patch routes synthesized
component-body source through `nativeParseFile`. `nativeParseFile` calls
`parse-file.js:synthLogicNode` (L722) which calls `translateStmtList` (R1
bridge). R1's `makeBareExpr` (L366), `for-stmt iterExpr` (L1033), and the
other 10 expr-passthroughs DO NOT translate the native PascalCase Expr to a
live lowercase ExprNode — they pass it through verbatim. Downstream
`emit-expr.ts:emitExpr` (L148) switches on lowercase `node.kind`; a
PascalCase `Ident`/`Member`/`Call` hits the `default` arm and falls to
`(_exhaustive as EscapeHatchExpr).raw ?? ""` (L228) — the empty string.

## Phase 3 — gap-surface catalog

### 3a. Live ExprNode slots receiving NATIVE Exprs verbatim (R1 ride-throughs)

These are the 12 live ExprNode slots where R1 stores `stmt.X` directly
(translate-stmt.js):

| Live slot                                | translate-stmt.js line | Source field       |
|------------------------------------------|------------------------|--------------------|
| `bare-expr.exprNode`                     | L371                   | `nativeExpr`       |
| `lift-expr.expr.exprNode` (non-MV arg)   | L558                   | `nativeLift.argument` |
| `propagate-expr.exprNode`                | L604                   | `nativePropagate.argument` |
| `let-decl.initExpr` / `const-decl`       | L651                   | `init`             |
| `lin-decl.initExpr`                      | L674                   | `stmt.init`        |
| `tilde-decl.initExpr`                    | L712                   | `stmt.init`        |
| `if-stmt.condExpr`                       | L936                   | `stmt.test`        |
| `while-stmt.condExpr`                    | L950                   | `stmt.test`        |
| `do-while-stmt.condExpr`                 | L970                   | `stmt.test`        |
| `for-stmt.cStyleParts.{init,cond,update}Expr` | L993-L995         | `stmt.{init,test,update}` |
| `for-stmt.iterExpr` (for-in/of)          | L1033                  | `stmt.right`       |
| `return-stmt.exprNode`                   | L1054                  | `stmt.argument`    |
| `throw-stmt.exprNode`                    | L1362                  | `stmt.argument`    |
| `fail-expr.variantExpr`                  | L584                   | `nativeFail.variant` |
| `guarded-expr.arms[].handler`            | L627                   | `nativeGuarded.arms[]` (handler) |

### 3b. Native ExprKind kinds requiring reconciliation downstream

40 native ExprKind members. **A2 already handles 40** (every case implemented).
The gap is NOT "more native kinds need to be added to A2." The gap is **the
A2 bridge is not wired into the pipeline**. Once invoked at the 15 R1 slots
above, the catalog reconciliation is COMPLETE — A2 already covers the full
40-kind native catalog.

**Estimate: 0 net new translation logic needed.** ~15 ride-through sites
need a one-line wrap: `stmt.X → translateExpr(stmt.X)`.

### 3c. Secondary integration points

| Site | What needs `translateExpr` |
|---|---|
| `parse-file.js synthLogicNode` (L722) | Calls `translateStmtList` — covered when R1 sites are fixed |
| `lambda body translation` (translate-expr.js L719) | Block-body re-parse via `translateStmtList` from BlockStub tokens — orthogonal C1 work |
| `match-expr arms` (translate-expr.js L883) | Already uses string reconstruction; emit-control-flow re-parses |
| `fail-expr` triple `(enumType, variant, args)` derivation | Currently empty strings (translate-stmt.js L580-582); requires walking the native Member/Call shape |

### 3d. Consumer-facing breakage (what M6.2 patch exposes)

`emit-expr.ts:emitExpr` (L148) and `emit-lift.js:801, 1126, etc.` all read the
live ExprNode-typed slots. They will silently emit `""` for any PascalCase
native Expr that survives. The breakage surfaces wherever native parser
output reaches an emit-* consumer:

- **emit-lift.js** L800 (text-interp), L1126 (for iterable), L650/689/745/763 (attribute expr)
- **emit-logic.js** (logic-block bodies) — all bare-expr / if-cond / return / throw paths
- **emit-control-flow.ts** — match arms, ternaries
- **dependency-graph.ts** L2729 — lift-expr.expr.node walks
- **name-resolver.ts** L375 — same
- **component-expander.ts** L2498 — `expr.node as MarkupNode`

M6.2a fixed ONLY the markup-value side (L2498). The expression-side gaps remain.

## Phase 4 — decomposed dispatch plan

### Sequencing constraint
All 6 sub-units share the same trivial mechanical pattern:
**wrap a `stmt.X` field with `translateExpr(stmt.X)` at the R1 callsite.**
They can be done in ANY order; ordering choice is determined by which
consumer is most painful.

### Sub-units (each ~1-3h — smaller than the brief's 2-6h estimate because the
work is mechanical wrap-and-test, not new logic)

**R4-U1 — bare-expr + return-stmt + throw-stmt (the text-interpolation triad)**
- Sites: `makeBareExpr` (L366), return-stmt arm (L1054), throw-stmt arm (L1362)
- Wrap: `nativeExpr → translateExpr(nativeExpr, ...)` in each
- Tests: extend `translate-stmt-bridge.test.js` §5b to assert live-kind on `exprNode`
- Unblocks: `${expr}` text-interpolation under M6.2b (closes the bug-5 task.title fail)
- Dependencies: import `translateExpr` from `./translate-expr.js` (need to verify no circular import — translate-expr.js currently imports nothing from translate-stmt; safe)
- Estimate: 2h

**R4-U2 — for-stmt iterExpr + cStyleParts**
- Sites: `makeForStmtCStyle` (L986-1003), `makeForStmtInOf` (L1015-1041)
- Wrap each of the 4 ExprNode-typed slots
- Tests: assert `for (let x of @list)` produces live `ident` on iterExpr
- Unblocks: `for (let task of @tasks.filter(...))` under M6.2b (closes bug-5 sub-failure)
- Estimate: 1.5h

**R4-U3 — if-stmt / while-stmt / do-while-stmt condExpr**
- Sites: L936, L950, L970
- Tests: assert `if (cond)` produces live `binary`/`ident` on condExpr
- Unblocks: `${if (cond) { ... }}` text-interp emission under M6.2b
- Estimate: 1.5h

**R4-U4 — let-decl / const-decl / lin-decl / tilde-decl initExpr**
- Sites: `makeVarDeclNode` (L651), `appendTranslatedStmt` LinDecl arm (L674), TildeDecl arm (L712)
- Tests: assert `let x = expr` produces live ExprNode on initExpr
- Unblocks: component-body decls with initializers reaching emit-logic
- Estimate: 2h

**R4-U5 — lift-expr / propagate-expr / guarded-expr / fail-expr expression fields**
- Sites: L558 (lift-expr non-MV branch), L604 (propagate-expr), L627 (guarded-expr arms), L584 (fail-expr variantExpr)
- The fail-expr branch should ALSO derive `(enumType, variant, args)` triple from the translated MemberExpr/CallExpr — but that can defer; the bare wrap is enough for emit consumers that read variantExpr structurally
- Tests: extend translate-stmt-bridge.test.js with one assertion per
- Unblocks: scrml-extension expr children under M6.2b
- Estimate: 3h

**R4-U6 — M6.2b re-apply + bug-5 regression close**
- Re-apply wip-migration.patch
- Re-run bug-5 — should be 5/5
- Run full bun test — should be 19872+/0 (no regressions beyond pre-existing)
- Commit as "feat(M6.2b): component-expander migration to nativeParseFile — 5/5 bug-5 under R4-closed bridge"
- Estimate: 1.5h

### Recommended sequencing

1. **R4-U1** FIRST — single fix, exercised by both bug-5 task.title and many other tests
2. **R4-U2** SECOND — closes the for-stmt iterExpr branch of bug-5 5a
3. **R4-U3 + R4-U4 + R4-U5** can be done IN PARALLEL (independent files, all in translate-stmt.js — best done as one batched dispatch since the file is shared, or as 3 sequential commits in one dispatch)
4. **R4-U6 LAST** — gates on U1+U2+U3+U4+U5

Total: ~12h to close R4 fully and unblock M6.2b.

### What this DOES NOT touch

- The translateLambdaBody BlockStub re-parse (orthogonal C1 work — the
  emit-expr `/* block body */` placeholder is acceptable for component bodies
  because components route through nativeParseFile, not through A2's lambda
  body path)
- The SQL nodeId resolution (orthogonal C1 work)
- The 7 native escape-hatches (These/Super/TaggedTemplate/Sequence/Yield/
  Render/MarkupValue-at-non-lift-positions) — they remain escape-hatched as
  documented; they are out-of-scope native kinds for scrml semantics

## Phase 5 — STOP-condition check

The brief's STOP-condition: "if the gap is much larger than the M6.2a agent's
framing suggested (e.g., dozens of ExprNode kinds need reconciliation), STOP
+ escalate." **Survey result: the gap is SMALLER than the framing.** All 40
native ExprKind kinds are already handled in `translate-expr.js`. The remaining
work is wiring (~15 callsites in translate-stmt.js), not new translation logic.
**This is continuation territory, NOT M5-redo.**

## Files touched

- `docs/changes/r4-expression-catalog-continuation-survey/progress.md` (this file)

## Source files inspected (read-only)

- `compiler/native-parser/translate-expr.js` (1041 LOC) — header L1-131, switch L149-309
- `compiler/native-parser/translate-stmt.js` (1248 LOC) — header L26-87, R1 sites
- `compiler/native-parser/parse-file.js` (1023 LOC) — synthLogicNode L722
- `compiler/native-parser/ast-expr.js` (470 LOC) — ExprKind enumeration
- `compiler/src/codegen/emit-expr.ts` — emitExpr L148, emitExprField L246
- `compiler/src/codegen/emit-lift.js` — text-interp L800, for-iter L1126
- `compiler/src/types/ast.ts` — ExprNode union L1937
- `compiler/tests/integration/bug-5-nested-component-ce-phantom-dom.test.js` — repro fixture
- `docs/changes/m6-2-component-expander/wip-migration.patch` — M6.2 patch
