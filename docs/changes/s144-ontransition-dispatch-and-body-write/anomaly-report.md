# Anomaly Report: s144-ontransition-dispatch-and-body-write

## Test-count delta (pre-commit gate, authoritative)
- Baseline (HEAD f5dc2b17): 15199 pass, 92 skip, 1 todo, 0 fail
- After Defect 1 (e3cf0819): 15201 pass, 0 fail  (+2 — Defect-1 test)
- After Defect 2 (379ea96e): 15204 pass, 0 fail  (+3 — Defect-2 test)
- Net: +5 tests added, 0 regressions.

## Behavioral changes
### Expected
- Program-scope `function` bodies (and `if`/`else` blocks therein) now route
  engine direct-writes (`@e = .X`) through `_scrml_engine_direct_set` + capture
  `__scrml_engine_from` + fire `__scrml_engine_<var>_fire_hooks`; `.advance(.X)`
  through `_scrml_engine_advance` + fire_hooks. (Defect 1 — codegen.)
- onTransition-body / engine-body `@x = expr` writes are no longer registered as
  phantom state cells → phantom E-ENGINE-VAR-DUPLICATE + false E-DG-002 gone.
  (Defect 2 — analyzer.)

### Surfaced-but-correct (NOT a regression)
- E-ENGINE-INVALID-TRANSITION now fires on `<onTransition to=.X>` placed in a
  FROM-state-child whose `rule=` lacks `.X` (e.g. the brief's literal ab2,
  scratch/probe1-controlB-no-fn.scrml, README Stage-3 `<onTransition to=.Loading>`).
  This is an always-correct B17.3 diagnostic that was MASKED on HEAD by the
  PASS-16 phantom E-ENGINE-VAR-DUPLICATE short-circuit. Removing the phantom
  reveals it. NOT suppressed (it is genuinely correct per §51.0.H `to=` semantics).
  Whether `to=.SameState` should be legal as an on-enter form is a §51.0.H
  design question filed for the PA.

## Full `bun test compiler/tests/` runs
- One exhaustive run showed 3-5 transient failures in self-compilation.test.js
  (bootstrap self-host) + trucking-dispatch-smoke (manifest stability across two
  compiles). Verified order/timing flakes: PASS standalone on BOTH the clean
  baseline (stash) AND with the change; the authoritative pre-commit gate (full
  `bun test`) reports 0 fail on every commit. Not caused by this change.

## Targeted suites run (0 fail)
- Engine guard trio (c13-advance-write-hook, engine-self-write-option-d,
  machine-codegen): 62 pass.
- Engine-body + dep-graph + symbol-table subset: 174 pass.
- Broader engine/machine suite (c12/c13/c14/c15, b17-4, a7-*, event-handler-
  writes, body-typecheck): 308 pass.

## Anomaly Count: 0
## Status: CLEAR FOR MERGE
