# B1 — native parser reset(@cell) -> reset-expr node

Change-id: native-reset-builtin-b1-2026-06-04
Started at pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a25fe207467224724
Worktree base after merge main: dace3f5b (current main)

## 2026-06-04 — startup
- Startup verification PASSED: pwd under worktree, toplevel matches, merged main (72c30b60 -> dace3f5b), clean tree, bun install OK, pretest OK.
- Reproduced baseline: native --parser=scrml-native fires spurious E-SCOPE-001 on `reset` in:
  - examples/14-mario-state-machine.scrml:100 `reset(@coins)`  -> E-SCOPE-001 on `reset`
  - examples/02-counter.scrml:16 `reset(@count)`  -> E-SCOPE-001 on `reset` (cleaner single-reset reproducer)
- Default pipeline compiles mario clean and emits `_scrml_reset("coins")` + pulls the 'reset' runtime chunk.
- BRIEF PATH CORRECTION: the second reproducer cited as `samples/compilation-tests/25-triage-board.scrml` does NOT exist; the file is `examples/25-triage-board.scrml` and it contains NO `reset` — its native failures are F3 (if-as-expr) + F5 (`const @name` derived-decl) + E-EXPR-UNEXPECTED, OUT of scope for B1. The real reset reproducers are mario + 02-counter (+ 03/08/15/17/18).

## Diagnosis
- Live: expression-parser.ts:1727 intercepts CallExpression whose callee is bare Identifier "reset" -> builds reset-expr node {kind,span,target,diagnostic?}. Three shapes: zero-arg (E-RESET-NO-ARG + synthetic 'not' target), multi-arg/spread (E-RESET-NO-ARG + first-arg target), happy single-arg.
- The live tokenizer.ts:78 KEYWORD reservation of `reset` is for SHADOWING diagnostics (E-RESERVED-IDENTIFIER) + so acorn-callee can be pattern-matched; the actual reset-expr PRODUCTION gates purely on the callee NAME string (calleeName === "reset"), NOT a token-kind check (acorn sees `reset` as a plain Identifier).
- Native produces a plain `call` {callee: ident "reset", args:[ident "@count"]} (probe confirmed). Downstream type-system scope-check flags `reset` as undeclared -> E-SCOPE-001.
- FIX ROUTE: pattern-match the bare-`reset`-callee in translate-expr.js ExprKind.Call case (mirrors live callee-name interception), NOT a lexer keyword reservation. Smaller correct change + faithful architectural mirror.

## cleanup/upload sweep disposition
- cleanup-registration + upload-call ARE special node kinds BUT are produced in the ast-builder.js STATEMENT layer (TAB), gated on KEYWORD tokens — NOT the expression-parser callee path. Different production path entirely (LogicStatement kinds, not ExprNode kinds).
- Native probe: `cleanup(() => {})` (dnd-setup.scrml) compiles CLEAN under native (default pipeline actually fails it with its own pre-existing E-SCOPE-001 — unrelated). cleanup does NOT exhibit the mario-style native E-SCOPE-001 failure.
- DISPOSITION: cleanup/upload are OUT of scope for this expression-level fix (different layer + not native-mishandled the reset way). Noted, not fixed. Do NOT blanket-allowlist.

## 2026-06-04 — fix landed + R26 verification
- FIX: translate-expr.js ExprKind.Call case now calls isBareResetCallee(callee) -> translateResetCall(nativeExpr) which builds a live reset-expr node {kind,span,target,diagnostic?}. Three §6.8.2 arg shapes mirror expression-parser.ts:1727-1785 exactly. Member call obj.reset(x) stays a plain call. Helpers inserted after makeCall.
- Route taken: callee-NAME pattern-match in the bridge (NOT a lexer keyword reservation). Faithful mirror of live (live reset-expr production gates on calleeName==="reset", not a token-kind check; the tokenizer.ts:78 KEYWORD reservation is for SHADOWING diagnostics only). Smaller correct change. NOT the LOGIC_SCOPE_GLOBAL_ALLOWLIST shortcut (S139 trap).
- +7 unit tests (§5b in translate-expr-bridge.test.js) driven through the REAL native lexer+parser+bridge (source -> lex -> parseProgram -> translateExpr). 117/117 pass in that file.

### R26 emitted-JS verification (the correctness gate)
- mario native: Compiled clean, E-SCOPE-001 GONE, client emits `_scrml_reset("coins")` (NOT bare reset(...)), node --check OK.
- mario native runtime md5 == default runtime md5 (9916a2ede3b45100a911d568a7c281ce) — reset chunk pulled + byte-identical.
- 02-counter native vs default client.js diff = ONLY a uniform node-id numbering offset (pre-existing native/default difference); the _scrml_reset("count") emission + clearCount fn are semantically identical. node --check OK.
- R26 sweep across all reset(@cell) example files (02/03/08/14/15/17/18): reset-scope-err=0 EVERYWHERE; _scrml_reset emitted at every reset site.
- Remaining native FAILED on 08/15/17/18 are DIFFERENT sibling families (E-STMT-EXPECT-RPAREN / E-STMT-MISSING-SEMICOLON on if-heads + `on mount` lifecycle, E-CODEGEN-INVALID-JS template-literal, E-SCOPE-001 on `on`/`mount` lifecycle keywords) — NONE reset-related; default pipeline compiles all four clean. Out of scope.

### Malformed-reset diagnostic parity
- reset() / reset(@a,@b) under native produce a reset-expr with the E-RESET-NO-ARG diagnostic field, byte-identical to live. In the function-body contexts tested, BOTH native AND default compile clean (the live forEachResetExprInExprNode surfacer fires only at specific ast-builder logic-body/reactive-decl wrapper sites, not function-body stmts). No parity REGRESSION — native==default behavior in every context tested. The native bridge does not run the ast-builder diagnostic surfacer; surfacing malformed-reset diagnostics under native in the contexts where live does is a separate native-bridge diagnostic-collection concern (deferred).

### Test deltas (full unit+integration+conformance gate, --bail)
- BEFORE: 15829 pass / 89 skip / 1 todo / 0 fail (841 files)
- AFTER:  15835 pass / 89 skip / 1 todo / 0 fail (841 files)  [+6 net, new tests]
- Zero regressions on the default pipeline.

### cleanup/upload sweep — FINAL disposition (OUT of scope)
- cleanup-registration + upload-call are special node kinds BUT produced in ast-builder.js STATEMENT layer (TAB, lines 10066/10283), gated on KEYWORD tokens — NOT the expression-parser callee path that produces reset-expr.
- Native does NOT exhibit the mario-style E-SCOPE-001 failure for cleanup: bare cleanup(()=>{}) (dnd-setup.scrml) compiles CLEAN under native (the DEFAULT pipeline actually fails it with its own pre-existing E-SCOPE-001 — unrelated).
- DISPOSITION: not native-mishandled the reset way -> OUT of scope, noted, NOT fixed. Did NOT blanket-allowlist.

## DONE
