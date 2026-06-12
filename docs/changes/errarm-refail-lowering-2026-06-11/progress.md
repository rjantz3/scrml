# progress — errarm-refail-lowering-2026-06-11

## 2026-06-11 — Phase 0 survey (startup + diagnosis confirmed)

Startup: pwd=/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a94ae3585e5085474
Base HEAD a250348a (carries 7fe7044f Gaps-1+2). bun install + pretest done.

Baseline reproducers (confirmed EXACTLY as SCOPE diagnoses):
- repro-1 (!{} legacy block arm `{ fail … }`): E-SCOPE-001 x2 (TYPER)
- repro-2 (JS-style match value-arm `:> fail …`): E-CODEGEN-INVALID-JS (CODEGEN)
- repro-3 (const v = inner()?): E-CODEGEN-INVALID-JS (CODEGEN/PARSE)
- control (statement `if (x) fail …`): clean

### Survey result — loci confirmed/corrected

SHARED ROOT: `fail` in arm contexts is captured as a STRING + ExprNode where `fail`
is a leading IDENT, never a `fail-expr` node. parseFailStmt (ast-builder.js:4211) is
reached ONLY at statement contexts (5580, 9398).

Shape A — `!{}` legacy arm `{ fail … }`:
  parse: parseErrorTokens (ast-builder.js:11609) -> arm.handler string + arm.handlerExpr
         via _parseHandlerExpr (:11881) -> safeParseExprToNodeGlobal.
  typer FIRE: type-system.ts:9363 checkLogicExprIdents(handlerExpr) -> E-SCOPE-001.
  codegen: emit-logic.ts:emitArmBody (:455) -> handler.startsWith("{") path ->
           rewriteBlockBody (emit-control-flow.ts:1421) -> emitExprField literal.

Shape B — JS-style match value-arm `:> fail …`:
  parse: parseOneMatchAsExpr (ast-builder.js:7891) -> match-arm-inline w/ result string +
         resultExpr ExprNode (Inline Form 1, :7258 collectExpr).
  codegen FIRE: emit-control-flow.ts:emitMatchExpr (:1621) -> arm.result emitted via
         emitExprField(null, arm.result) (:1833-1834) -> `return fail ...` literal.

Shape C — `const v = inner()?`:
  ROOT CORRECTED vs SCOPE framing: NOT a "? desugaring rewrap" codegen issue. The
  const-decl parse path (ast-builder.js:5729-5730) LACKS the `?` propagate-expr handling
  that the let-decl path HAS (ast-builder.js:5628-5641). So `const v = inner()?` keeps
  init="inner()?" -> emits `?` literally. `let v = inner()?` WORKS (verified). Fix =
  mirror the let `?`-propagate hook into the const path. Pure parser fix.

Working fail-expr emitter: emit-logic.ts:2618 (case "fail-expr") -> line 2651
  `return { __scrml_error: true, type, variant, data };`.
Working propagate-expr emitter: emit-logic.ts:2654.
NS-1 gate: type-system.ts:8085-8102 (visitStmt fail-expr + bare-expr fail-string).

### Plan
Part 1 (recognition) + Part 3 (codegen):
  - Shape A: detect leading `fail TYPE::V(args)` in `!{}` arm handler and lower to the
    fail-expr emission (return {__scrml_error}). Suppress the E-SCOPE-001 by making the
    typer recognize a fail-handler arm and route through the NS-1 gate (canFail) instead
    of checkLogicExprIdents.
  - Shape B: detect leading `fail …` in a match-arm-inline result; emit the fail-expr
    shape (return {__scrml_error}) so it escapes the match IIFE -> enclosing fn.
  - Shape C: add the `?` propagate hook to the const-decl path (parser).
Part 2 (typer NS-1): arm-position fail must fire E-ERROR-001 when enclosing fn is non-`!`.

Next: implement Shape C (smallest), then Shape A typer+codegen, then Shape B codegen.

## 2026-06-11 — Implementation complete (all 3 shapes + NS-1)

Shape C (const `?`-propagate): ast-builder.js const-decl path — added the `?`
propagate-expr hook mirroring the let-decl path. DONE, repro-3 green.

Shape A (`!{}` arm re-fail):
  - Parser: ast-builder.js — new `_parseFailExprString(text,...)` helper (string ->
    fail-expr node); post-pass in parseErrorTokens attaches `arm.failExpr`.
  - Typer: type-system.ts guarded-expr arm loop — when arm.failExpr, skip the
    ident walker on the mis-parsed handlerExpr; scope-check the fail ARGS instead.
    NS-1 enforced by the function-body visitStmt walker (added `failExpr` +
    `matchExpr` to recurse keys -> E-ERROR-001 in non-! enclosing fn).
  - Codegen: emit-logic.ts — extracted shared `emitFailExpr()` (used by case
    "fail-expr" + the arm paths); emitArmBody emits it when arm.failExpr present.
  DONE, repro-1 green.

Shape B (JS-style match value-arm re-fail):
  - Parser: ast-builder.js parseOneMatchAsExpr — post-pass attaches `failExpr` to
    match-arm-inline whose `result` is a bare re-fail.
  - Typer: match-arm-inline result is not scope-checked (no spurious E-SCOPE);
    NS-1 reached via `matchExpr` recurse key.
  - Codegen: emit-control-flow.ts matchArmInlineToMatchArm threads `failExpr` onto
    MatchArm; emitMatchExpr (IIFE path) emits the envelope. emit-logic.ts
    emitMatchExprDecl (the `const v = match …` in-function path, the ACTUAL repro-2
    path — NOT the IIFE) emits `return {__scrml_error}` instead of `tildeVar = …`.
  DONE, repro-2 green.

R26 empirical (post-fix): repro-1/2/3 -> E-SCOPE-001=0 E-CODEGEN=0 node--check OK;
control clean; NS-1 negatives both fire E-ERROR-001; route-to-state clean.

New test: compiler/tests/unit/errarm-refail-lowering.test.js (13 tests, full-pipeline).
Touched-area suites green (error-handler-arm-body, emit-logic-s19, type-system,
error-arm-multifield, match-block-form-payload all pass).
Full suite: 2 fail = TodoMVC browser tests (dist race in ad-hoc full-glob run;
pass in isolation; NOT in pre-commit gate scope; unrelated to change).

Next: commit; run the exact pre-commit gate.
