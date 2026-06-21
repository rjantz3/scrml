# sPA ss3 → PA — re-integration (needs: action)

**From:** sPA ss3 (codegen-expr-attr) · **To:** PA · **Date:** 2026-06-20
**Action:** re-integrate branch `spa/ss3` → main (single-writer, S147 coherence-gated), then push.

## LIST COMPLETE — both open items landed

| item | known-gap | sev | landing SHA |
|------|-----------|-----|-------------|
| 1 | `g-paren-binary-group-dropped-before-method` | HIGH | `aae34c26` |
| 2 | `g-isop-call-tail-lhs-paren-miscompile` | MED | `d004e6b9` |

- **Branch tip:** `a99962d9` (the bookkeeping commit; the progress.md disposition line says tip `d004e6b9` — stale self-reference, the real tip is `a99962d9`).
- **Parked / dropped:** none. List is fully dispositioned.

## What landed

- **item1** (CLIENT ExprNode serializer): `(a + " " + b).toUpperCase()` was dropping the grouping parens → `a + " " + b.toUpperCase()` (method binds to `b`, silent precedence miscompile; flogence TF-IDF router killer). Added a `receiverNeedsParens` guard at `emitMember`/`emitIndex`/`emitCall`/`emitNew` (emit-expr.ts) — the receiver-position sibling of Bug W + S205. ALSO closed the identical gap in `emitStringFromTree` (expression-parser.ts round-trip printer) as defense-in-depth. Files: `compiler/src/codegen/emit-expr.ts`, `compiler/src/expression-parser.ts`, +1 integration test, +emit-string-tree-precedence receiver cases.
- **item2** (LIBRARY string-rewrite): `re.exec(s) is some` → `re.exec((s) != null)` (receiver swallowed; silent-WRONG, valid JS). `_rewriteParenthesizedIsOp` now distinguishes a grouping paren from a call paren (keyword-aware) and captures the whole call chain single-eval via `_scanChainStartLeft`. Files: `compiler/src/codegen/rewrite.ts`, +9 `not-keyword.test.js` tests.

Both R26 value-asserted (item2: 14 runtime assertions + node --check; item1: emit-string + e2e). Each commit passed the full pre-commit gate (suite + browser).

## Base / conflict status (clean re-integration)

- My base was `8c27805e` (session-start origin/main). Main has since advanced to `1a4a3fec` (deputy ticks + §60 `<api>` feature W1/W2).
- **No conflict:** `git diff --stat 8c27805e..1a4a3fec` over my 5 touched files (emit-expr.ts · expression-parser.ts · rewrite.ts · not-keyword.test.js · emit-string-tree-precedence.test.js) is EMPTY — none were touched main-side. File-delta or merge re-integrates clean.
- **No leak:** my 3 commits are contained ONLY by `spa/ss3` (verified `git branch --contains`).

## Residuals (track — not items)

1. Dead each-sigil band-aid in `expr-node-corpus-invariant.test.js` (always-0 after the prior run's item3 — test-hygiene removal owed; masks future `@.`-parse regressions). _Carried from the prior run._
2. Native-parser (M2.x) `@.` structuring NOT verified (separate pipeline). _Carried._
3. **NEW:** the `emitStringFromTree` receiver-paren fix was defense-in-depth — no empirical miscompile found through that round-trip path, only the identical gap in the same serializer cluster. If a corpus probe later surfaces a real round-trip miscompile, the regression home is `emit-string-tree-precedence.test.js`.

## PA owns (at re-integration)

known-gaps reconciliation — close `g-paren-binary-group-dropped-before-method` + `g-isop-call-tail-lhs-paren-miscompile`; INDEX ss3 row → at-ceiling/empty (both open items drained); worktree `../scrml-spa-ss3` cleanup; changelog/master-list. Also move the flogence repro `handOffs/incoming/read/2026-06-20-from-flogence-BUG-paren-grouping-dropped-before-method.md` to resolved if appropriate (item1 closed it).
