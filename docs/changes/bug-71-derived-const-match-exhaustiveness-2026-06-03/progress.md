# Bug 71 — derived `const <x> = match @cell {...}` exhaustiveness

Change-id: bug-71-derived-const-match-exhaustiveness-2026-06-03
Started at: worktree agent-a7fcebe91449e1549; base merged main f28d8128 (carries Bug 63/65/67/68).

## Phase 0 (codegen entanglement check) — OUTCOME: CLEAN PARALLEL to Bug 67
- Pre-fix AST for `const <label> = match @phase {...}`:
  state-decl shape:derived isConst:true structuralForm:true;
  init = "match @phase { . Idle => \"i\" . Loading => \"l\" }";
  initExpr.kind = match-expr with `rawArms:[". Idle => \"i\" . Loading => \"l\""]`;
  NO matchExpr side-field. Exact parallel to Bug 67 pre-fix return-stmt.
- Pre-fix emit (Reproducer A, missing .Done): `_scrml_derived_declare("label", () => (function(){ ... if/else if IIFE ... })())` + `_scrml_derived_subscribe("label", "phase")`.
- Decision: derived-cell reactive emit (emit-logic.ts shape:"derived") reads node.init/node.initExpr.
  Adding the typer hook WITHOUT touching emit = DUAL-PARSE: collectExpr first (init/initExpr byte-identical),
  reset cursor, parseOneMatchAsExpr for the structural matchExpr (typer-only side-field). NO emit rework needed.
  Proceed (not entanglement-STOP).

## Steps
- [done] ast-builder.js: derived-state-decl RHS match hook → node.matchExpr (dual-parse; init/initExpr unchanged).
- [done] type-system.ts: state-decl case visits node.matchExpr → checkMatchDiagnostics (E-TYPE-020).
- [done] Verified Reproducer A fires E-TYPE-020 (::Done); Reproducer B (exhaustive) clean; codegen parity proven.
- [pending] Unit test; full-suite regression.

## Unit test + within-node parity bump (commit 2)
- compiler/tests/unit/derived-const-match-exhaustiveness-bug71.test.js — 9 tests, all pass:
  derived const-match missing-variant fires E-TYPE-020 (::Done); exhaustive clean;
  CODEGEN PARITY (derived_declare + derived_subscribe dep edge + per-arm returns);
  parity with let-decl + return-stmt (Bug 67); legacy `=>` arms; PLAIN `<x> = match`
  init-time form (also gets exhaustiveness; init-value emit unchanged);
  payload-binding + wildcard derived match.
- Within-node parity: 3 fixtures bumped (MISSING-FIELD, native is M5-swap-out-of-scope,
  doesn't promote match → structural, so the new live-pipeline matchExpr field shows missing):
    examples/14-mario-state-machine.scrml      186 -> 188 (2 derived const-match cells)
    samples/.../gauntlet-s79-theme-settings.scrml 105 -> 107 (2 plain <x>=match cells)
    samples/.../match-pipe-alternation.scrml      4 -> 5   (1 derived const-match cell)
  Documented pattern — same as Bug 67's 5-fixture bump. parity 1005/0 after.
- Regression: Bug 63/65/67/68 green; broad match codegen+exhaustiveness 162/0.
