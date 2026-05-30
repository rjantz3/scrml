# Progress: s144-match-codegen-comma-and-bare-tail (RE-DISPATCH)

- [start] startup pwd = /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a88b7b23ba2d8c787
- branch = worktree-agent-a88b7b23ba2d8c787 ; base HEAD = 505f4ace
- pretest GREEN (13 samples). bun install OK.

## Established (verified on baseline)
- Bug Y: comma arms -> match-arm-inline.result ends with ' ,' (e.g. '"a" ,'), resultExpr.kind=escape-hatch.
  Both decl + markup currently fail with E-CODEGEN-INVALID-JS (validate-emit gate). Verified.
- Bug AA: plain function bare match-stmt -> (function(){...returns...})() with NO outer return (silent discard).
  fn/return-typed correctly emit `return (IIFE)()`. return-stmt -> not a bare match-stmt. Verified.

## Layer decisions
- Bug Y ERROR (E-MATCH-ARM-SEPARATOR): typer layer = type-system.ts:checkMatchDiagnostics (covers BOTH
  markup + decl in one detection; source-anchored span). PLUS codegen sanitization in
  emit-control-flow.ts:matchArmInlineToMatchArm (strip trailing comma -> valid JS, no E-CODEGEN-INVALID-JS).
- Bug AA WARNING (W-MATCH-VALUE-UNUSED): emit-functions.ts else-branch (plain-function path, ~L881);
  detect LAST body stmt == match-stmt that is value-producing (>=1 match-arm-inline w/ non-empty result).

## Decomposition (single-file, upstream->downstream)
- Step 1: SPEC.md §34 + §18.2 + §48.11 notes (codes added with the change, Rule 4)
- Step 2: type-system.ts — E-MATCH-ARM-SEPARATOR detection in checkMatchDiagnostics
- Step 3: emit-control-flow.ts — comma sanitization in matchArmInlineToMatchArm (+ emit-logic.ts shares it)
- Step 4: emit-functions.ts — W-MATCH-VALUE-UNUSED detection
- Step 5: tests (both bugs, both forms + regressions)
- Step 6: R26 recompile + full gate

## Landed (all steps complete)
- c496f709 docs: SPEC §34 + §18.2 + §48.13 codes/notes + pre-snapshot
- 1316ed2a feat: TS E-MATCH-ARM-SEPARATOR detection (checkMatchDiagnostics)
- f31714b4 fix: CG comma sanitization (matchArmInlineToMatchArm — shared mk+decl)
- b2fa1f82 feat: CG W-MATCH-VALUE-UNUSED (emit-functions else-branch)
- 963b7996 test: 12 unit tests (both bugs, both forms + regressions)

## R26 (post-fix recompile) — ALL PASS
- bugy.scrml (markup): E-MATCH-ARM-SEPARATOR x2, NO E-CODEGEN-INVALID-JS
- bugy_let.scrml (decl): E-MATCH-ARM-SEPARATOR x2, NO E-CODEGEN-INVALID-JS
- bugaa.scrml: W-MATCH-VALUE-UNUSED for bare(); withReturn() emits return(IIFE)(); output VALID
- pretest: 13 samples clean; full samples/*.scrml scan: zero new diagnostics (no false positives)
- pre-commit hook on every code commit: 0 fail (15304 tests post-test-add)
