# Progress — derived-engine-expression-form-2026-06-13

## 2026-06-13T15:30:27Z — Phase 0 survey complete
- WORKTREE: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a52be30f9cc11223c
- HEAD at start: 11c648c7b828e376d28dbf4ffc9bddbfa19855cf
- Startup verification PASS (pwd/toplevel/clean/bun install/pretest).
- Wrote SURVEY.md. Key findings:
  - Brief's symptom table CORRECTED via R26: `derived=match` fires E-ENGINE-004 (not E-ENGINE-018); legacy 1:1 over a plain enum cell ALSO fires E-ENGINE-004 through the full pipeline (only "works" in codegen-unit-tests that skip validateDerivedMachines).
  - inline-match form is ALREADY wired through SYM(5191)/B16(6841)/DG(1567,1577)/codegen(3054,3095). ONLY type-system buildMachineRegistry(5124) mis-routes it through §51.9.
  - Genuinely-working legacy full-pipeline form: examples/14-mario (derived=@marioState where @marioState is an ENGINE var).
- Decision: scope (A) match form = mechanical disentanglement. Scope (B) ternary/call = real parser+codegen work (opener-end finder + parsed-ExprNode). Both in scope per "full feature build now". Proceeding (A) then (B).
- NOT stopping for design ruling: the discrimination is clean, codegen reuses C14 substrate, exhaustiveness is the match's own. The opener-end-finder guard mirrors S188 discipline.

## 2026-06-13T16:16:39Z — Phases A + B + 3 complete
- Phase A (match form disentangle): type-system buildMachineRegistry skips §51.9 for inlineMatchBody/derivedExprNode forms; symbol-table NO-RULES now catches state-child rule= attr. +10 tests. COMMITTED 0f6eeef4.
- Phase B part 1 (parser operator-aware): block-splitter scanAttributes + scanOpenerBody + ast-builder _findOpenerEnd skip comparison >/< inside derived= expr values. COMMITTED a13efce7.
- Phase B part 2 (expr form end-to-end): ast-builder classifies bare-ident/match/expr + parses derivedExprNode; symbol-table tags kind:"expr" + enumerates upstreams; emit-engine lowers via rewriteExpr; DG draws per-upstream edges. COMMITTED 82969f9e. +6 tests COMMITTED 08851e8f.
- Phase 3 R26: all repros verified (match clean+recompute, ternary clean+subscribe, call clean, multi-cell subscribes both, legacy unchanged, NO-RULES/NO-INITIAL/NO-WRITE/CIRCULAR/EFFECT-ON-DERIVED fire). node --check OK on all emitted JS. mario+trucking+triage+state-authority compile clean. Full suite 24089 pass / 0 fail after within-node STRIP_KEYS reconciliation (11 engine-fixture residuals from new derivedExprText/derivedExprNode fields → STRIP_KEYS).
- Docs: SPEC §51.0.J expr-form worked example + PRIMER §13.7 B16 landed + STRIP_KEYS. COMMITTING now.
