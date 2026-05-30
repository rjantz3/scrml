# Progress: s144-ontransition-dispatch-and-body-write

Two related engine/onTransition defects.

## Confirmed on HEAD (505f4ace)
- Defect 1 (ab1): `_scrml_toggle_4()` emits bare `_scrml_reactive_set("mode","Edit")` — NO routing through `_scrml_engine_direct_set` / fire_hooks. onTransition body never invoked. `@transitions` never increments. Also: `__scrml_transitions_mode = {}` empty, fire_hooks NOT emitted in ab1 at all.
- Defect 2 (ab2): compile FAILS — phantom `E-ENGINE-VAR-DUPLICATE` on `phase` (no `<phase>` cell exists) + false `E-DG-002` on `@count`.

## Landed
- (pending)

## Defect 1 FIX (codegen — if-body engine-context threading)
- ROOT: `if-stmt` case in emit-logic.ts (L2328) only threaded FULL opts to the
  if-body when `tildeContext||continueBehavior` set; else called `emitIfStmt`
  with a NARROW opt subset (derivedNames/synthCellKeys/declaredNames/insideFunctionBody),
  DROPPING engineBindings/engineVarNames/enginesWithHooks/... So a nested
  `@engineVar = .X` or `@engineVar.advance(.X)` inside a free `function`'s
  if-body emitted bare `_scrml_reactive_set` / method-on-value (no dispatch).
- FIX: extend IfOpts + emitIfStmt bodyOpts (emit-control-flow.ts) to carry the
  engine+machine context; pass it from the if-stmt case in emit-logic.ts.
- VERIFIED: SPEC-canonical onTransition (inside FROM state-child) now produces
  full dispatch: direct-write → `_scrml_engine_direct_set` + capture
  `__scrml_engine_from` + `__scrml_engine_mode_fire_hooks`; `.advance()` inside
  if → `_scrml_engine_advance` + fire_hooks.
- NOTE on Repro-1 placement: the brief's ab1 places `<onTransition from=.Nav
  to=.Edit>` at ENGINE level (sibling-to-states). Per SPEC §51.0.H the firing
  model attaches onTransition to a STATE-CHILD (to= in FROM-state, from= in
  TARGET-state); engine-level placement is not collected by collectEngineHooks
  (walks meta.stateChildren.onTransitionElements only) → fire_hooks not emitted
  for that form. Dispatch routing (the stated Defect-1 bug) is fixed; the happy-
  dom test uses the SPEC-canonical state-child placement (ab1b).

## Defect 2 FIX (analyzer — phantom decl + dep-graph)
- ROOT (probe-confirmed): the ast-builder builds engine bodyChildren in MARKUP
  context (ast-builder.js ~L12073, parentContextKind="markup"), so an onTransition
  body's `${ @count = 42; @phase = .Ready }` parses each `@x = expr` as a
  state-decl with structuralForm:false and WITHOUT the V-kill `_isReactiveAssign`
  tag. SYM PASS 1 walk descends into engine-decl.bodyChildren (symbol-table.ts
  L1468) and REGISTERS those non-structural writes as NEW cells:
    - `@phase = .Ready` → phantom `phase` cell → collides with the engine's
      auto-declared `phase` → phantom E-ENGINE-VAR-DUPLICATE.
    - `@count = 42` → phantom `count` cell shadows the real top-level `<count>`
      (read in `<Ready>`) → false E-DG-002 "never consumed".
- FIX (single root, closes BOTH): symbol-table.ts PASS-1 `walk` gains an
  `inEngineBody` flag (default false), set true when descending into
  engine-decl.bodyChildren and propagated through container recursion. When
  set, a non-structural `state-decl` (structuralForm:false, shape!="derived")
  is walked-through (RHS @-refs still visited) but NOT registered — it is a
  WRITE, not a declaration. Structural `<x> = init` (structuralForm:true) and
  derived decls still register normally.
- The two defects DID share a root: both stem from onTransition-body writes
  being mis-registered as phantom decls. One fix closes both.
- VERIFIED: valid-transition fixture (onTransition to=.Ready in <Loading
  rule=.Ready>) compiles EXIT 0 — no E-ENGINE-VAR-DUPLICATE, no E-DG-002.
  `@count` written in onTransition body + read in <Ready> is consumed.

## NEW FINDING (distinct — needs PA design call, NOT silenced by me)
- The brief's literal ab2 + scratch/probe1-controlB-no-fn.scrml + the README
  Stage-3 flagship ALL use `<onTransition to=.Loading>` placed INSIDE
  `<Loading rule=.Ready>` (or rule= not containing .Loading). Per §51.0.H
  `to=.X` = "fires when LEAVING toward .X"; a self-target `to=.Loading` in
  `<Loading rule=.Ready>` is NOT a legal transition → E-ENGINE-INVALID-TRANSITION
  (B17.3 / SYM PASS 17, symbol-table.ts ~L9084).
- This error was MASKED on HEAD because the PASS-16 E-ENGINE-VAR-DUPLICATE hard
  error short-circuited before PASS 17. My fix removes that phantom, so the
  REAL (always-correct) PASS-17 diagnostic now surfaces. I did NOT touch
  transition-legality semantics (out of brief scope; §51.0.H is a design call).
- The author's INTENT for `<onTransition to=.SameState>` appears to be an
  "on-enter / on-mount" effect (fetch + decide next state). The SPEC has no
  clean on-enter form. Whether `to=.SameState` should be legal as on-enter is a
  SPEC §51.0.H design question → filed for PA. Defect-2 regression test uses a
  VALID transition (to=.Ready) to prove the phantom-error fix in isolation.

## Landed (final)
- f5dc2b17 — WIP: branch start + repros + progress.md.
- e3cf0819 — Defect 1 fix: thread engine ctx into emitIfStmt body (emit-control-flow.ts
  IfOpts + bodyOpts; emit-logic.ts if-stmt case) + Defect-1 integration test (+2).
- 379ea96e — Defect 2 fix: SYM PASS 1 walk `inEngineBody` flag skips phantom
  engine-body write registration (symbol-table.ts) + Defect-2 regression test (+3).
- R26 DONE: ab1b → _scrml_engine_direct_set + fire_hooks in toggle();
  ab2valid → exit 0, fire_hooks runs @count=42, @count read in <Ready>.
- Pre-commit gate green on every commit (15204 pass / 0 fail at tip).
