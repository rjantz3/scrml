# Progress: r4-u2-for-stmt-iter-cstyle

WORKTREE_PATH: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a449aa8800e3bdd25
HEAD (initial): 136678e5 → rebased onto main 2d2fe5bb (to pick up R4-U1 + M6 prereqs)
FINAL_SHA: see git log (final fix(...) commit + WIP chain)

## Sites (4 wraps + 2 header refreshes in compiler/native-parser/translate-stmt.js)

| Site | Function | Native field | Live slot |
|---|---|---|---|
| 1 | makeForStmtCStyle | stmt.init | cStyleParts.initExpr |
| 2 | makeForStmtCStyle | stmt.test | cStyleParts.condExpr |
| 3 | makeForStmtCStyle | stmt.update | cStyleParts.updateExpr |
| 4 | makeForStmtInOf | stmt.right | iterExpr |

All four follow the R4-U1 mechanical pattern:
  `stmt.X === undefined || stmt.X === null ? null : translateExpr(stmt.X)`

The explicit null-check preserves the "empty clause → null" sentinel for
`for (;;) {}` (cStyle empty clauses) and degenerate `for(of)` shapes.

## Edge case: declaration-form C-style init

`for(let i=0; ...)` has `stmt.init = VarDecl Stmt` (not an Expr). The VarDecl
falls to `translateExpr`'s default arm → returns an `escape-hatch` ExprNode
with `raw=""`. Downstream `emit-control-flow.ts:312 emitExprField` short-
circuits to `emitExpr(escape-hatch)` → returns "". PRE-R4-U2 this case already
emitted "" (PascalCase VarDecl hit `emit-expr.ts:emitExpr` default arm). So
R4-U2 is no-worse for the declaration-form edge case — that's a SEPARATE
downstream gap (likely picked up alongside R4-U4 let-decl initExpr handling).

## Tests

- §5c (R4-U1 block): lock test "LOCK: for-of iterExpr still leaks PascalCase
  Ident (R4-U2 NOT done)" was FLIPPED to its closed-state form. R4-U1 author
  designed this lock to flip when R4-U2 lands; the flip captures the moment.
- §5d (new R4-U2 block): +4 tests covering for-of (Call iterExpr), for-in
  (Ident iterExpr), C-style condExpr (Binary), C-style initExpr + updateExpr
  (Assignment). One NEW LOCK test guards an as-yet-unwired site (if-stmt
  condExpr → still PascalCase Binary, R4-U3 scope).
- Bridge test count: 85 → 90.

## bug-5 verification

Applied `docs/changes/m6-2-component-expander/wip-migration.patch`. With
R4-U1 + R4-U2 wired, **bug-5 stays 5/5 pass** (R4-U1 already brought it
from 4/5 → 5/5; R4-U2 closes the for-iterExpr path which was the second
sub-failure noted in the R4 survey).

Patch reverted in-worktree before commit (clean status preserved).

## M6.2b-gated tests (12 still failing)

`compiler/tests/unit/f-component-004-substituteProps-logic-block.test.js`
and `compiler/tests/unit/component-prop-substitution-call-ref.test.js` still
fail 12/13 with R4-U1+R4-U2+patch. The failure surface is identical to what
R4-U1's landing notes documented — all 12 are downstream ride-through gaps
NOT in R4-U2 scope:

  Expected: "lit"     Received: "Ident"      (let-decl initExpr → R4-U4)
  Expected: "ident"   Received: "Ident"      (let-decl initExpr → R4-U4)
  Expected: "member"  Received: "Member"     (let-decl initExpr → R4-U4)
  Expected: "lit"     Received: "StringLit"  (let-decl initExpr → R4-U4)
  Expected: "lit"     Received: "Ident"      (let-decl initExpr → R4-U4)
  Expected: "ternary" Received: "Conditional"(let-decl initExpr → R4-U4)
  Expected: "object"  Received: "Object"     (let-decl initExpr → R4-U4)

The dominant failure cause is `const name = ...` in component-expander prop
substitution — let-decl / const-decl initExpr ride-through which is R4-U4
scope. M6.2b unblock STILL gated on R4-U3 + R4-U4 + R4-U5.

## Test suite

- Bridge: 85 → 90 (R4-U1 lock flipped + §5d added)
- Full unit + integration + conformance: 13932 pass / 92 skip / 1 todo / 0 fail
  (baseline 13927 pass; +5 = my new tests). Zero regressions.

## Maps load-bearing finding

`.claude/maps/primary.map.md` was current enough — directly pointed to
domain.map.md / structure.map.md as needed. No map refresh required for
R4-U2; the file translate-stmt.js is in its mapped location and grew
~10 LOC (header refresh + null-checks). Maps will need refresh after
R4-U3..U5 because then ~10 more sites convert + the R1 ride-through
surface collapses.

## Deferred items

- R4-U3 (if/while/do-while condExpr) — next mechanical wrap, ~1.5h
- R4-U4 (let/const/lin/tilde-decl initExpr) — ~2h, will unblock the 12
  remaining f-component-004 / component-prop-substitution failures
- R4-U5 (lift-expr non-MV / propagate-expr / guarded-expr / fail-expr) — ~3h
- R4-U6 (M6.2b re-apply + final bug-5 close) — gates on U3+U4+U5
