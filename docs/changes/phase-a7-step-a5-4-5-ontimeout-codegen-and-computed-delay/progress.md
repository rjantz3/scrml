# Progress: phase-a7-step-a5-4-5-ontimeout-codegen-and-computed-delay

Worktree: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a07c10f3c25603c26`
Branch: `worktree-agent-a07c10f3c25603c26`
Dispatch: A5-4 + A5-5 BUNDLED per S77 user authorization.

## Baseline (pre-change)

`bun run test`:
- 10868 pass
- 64 skip
- 1 todo
- 8 fail (~6 environmental: 3 self-host artifacts not built; 3 test-bind A6-5 with hard-coded `bryan-maclee` cwd; the last 2 are sub-failures of the same root causes)
- 36625 expect() calls
- 509 files

## Phase 0 — Survey + audit (DONE)

Verified preconditions per SCOPE §3:

- `OnTimeoutEntry` shape at symbol-table.ts:348 — `{after: string, to: string, rawOffset: number}`. `after` is raw text (literal `Nms`/`Ns`/etc. OR computed `${expr}<unit>`).
- `engineMeta.onTimeoutElements: Array<{stateChildTag, entry: OnTimeoutEntry}>` populated by SYM PASS 16 (A5-3) at symbol-table.ts:6109+.
- `engineMeta.stateChildren[i].onTimeoutElements: OnTimeoutEntry[]` populated per state-child at symbol-table.ts:470.
- `_scrml_machine_arm_timer` (runtime-template.js:140) currently calls `_scrml_reactive_set(name, target)` directly at line 164 — bypasses engine write-guard. Per SCOPE §3 decision #1 + §6 risk #1 mitigation: implement `setterFn` parameter (Option A).
- `_scrml_engine_direct_set` and `_scrml_engine_advance` are at runtime-template.js:2161+/2173+ — both end with `_scrml_reactive_set(varName, target)`.
- `parseMachineRules` literal-only regex at type-system.ts:2603. 4 `rules.push` sites at lines 2640, 2653, 2670, 2764. `TransitionRule.afterMs: number | null` at type-system.ts:314.
- `emit-machines.ts` afterMs fire-sites at lines 491 + 711 (both `${r.afterMs}` template interpolation; only the literal value flows in).
- `engine-statechild-parser.ts:scanForOnTimeoutEntries` at lines ~250-299 confirms `OnTimeoutEntry.after` raw-text shape.
- No existing tests exercise `<onTimeout>` from compileScrml end-to-end (A5-4 is the first dispatch to wire it).

**Decision (Phase 0 risk #1 resolution):** Implement the `setterFn` pattern via a new `_scrml_machine_arm_timer_with_setter` helper OR extend `_scrml_machine_arm_timer` to accept an OPTIONAL `setterFn` parameter (Option A). After examining the existing function, EXTENDING with an optional 5th parameter preserves the 4-arg call shape from legacy `<machine>` codegen while letting engine codegen route through `_scrml_engine_direct_set`. Going with Option A.

## Phase 1 — A5-4 implementation (DONE)

- 1a: parse-after-duration.ts (~138 LOC). Exports parseAfterDuration() returning
  {literal | computed | invalid} discriminator. Smoke-tested manually.
- 1b: emitEngineTimersTable + engineTimersTableName + engineHasOnTimeoutElements
  in emit-engine.ts. Per-state timer-config tables emit ONLY when the engine
  has at least one <onTimeout> (tree-shake). Both literal+computed forms emit.
- 1c: runtime-template.js — added _scrml_engine_arm_state_timers and
  _scrml_engine_clear_state_timers in the 'engine' chunk; extended
  _scrml_machine_arm_timer with optional meta.setterFn for engine-aware setter
  (Option A); extended _scrml_engine_advance + _scrml_engine_direct_set with
  optional 4th arg `timersTable` (no-op when null).
- 1d: emitEngineWriteGuard + emitEngineAdvanceCall pass the timer-table
  identifier when binding.hasOnTimeoutElements is true. Added
  collectEnginesWithOnTimeout helper plumbed through emit-reactive-wiring,
  emit-functions, scheduling, and emit-expr.
- 1e: emitEngineVariantCellInit emits initial-arm at module-init when the
  engine has <onTimeout> entries.

## Phase 2 — A5-5 implementation (DONE)

- 2b: TransitionRule extended with afterExpr; parseMachineRules uses
  parseAfterDuration; literal preserves the constant-folded path,
  computed-form populates afterExpr with `(expr) * <multiplier>` text.
- 2c: emitDurationLiteral helper in emit-machines.ts; both fire-sites
  (491, 711) emit IIFE-wrapped clamp+round for computed, bare number for
  literal. emit-logic.ts machine-init path arms computed-form rules inline
  alongside the legacy _scrml_machine_arm_initial scan.

Test invariant after Phase 2: 10869 pass (+1 from baseline), 6 fail (all
environmental — same set as baseline).

## Phase 3 — Tests (DONE)

3 new test files, 73 new tests total:
- engine-ontimeout-codegen.test.js: 36 unit tests (timer table emission,
  tree-shake, write-guard wiring, initial-arm helper, collectEnginesWithOnTimeout).
- computed-delay.test.js: 28 unit tests (parseAfterDuration discriminator + unit
  multipliers + invalid rejection + literal preserves constant-fold + computed
  via engine + helper-level coverage for legacy machine + wildcard rejection +
  multi-rule chain).
- engine-ontimeout-end-to-end.test.js: 9 integration tests (timer fires after
  expected ms; multiple <onTimeout>; computed expression with arithmetic; negative
  clamp; initial-arm; tree-shake confirmation).

**Initial-arm ordering fix (discovered during integration test §4):** the engine
substrate emit was placing the arm-state-timers call BEFORE user reactive cells
were initialized, breaking computed-form `${@var}<unit>` at module-init. Fix:
split `emitEngineVariantCellInit` so the cell-init stays at substrate position
but a NEW `emitEngineInitialArmsForFile` helper emits the arm calls AFTER
`emitReactiveWiring` in `emit-client.ts`. Verified by integration tests + 4
existing unit tests adjusted for the new shape.

## Phase 4 — Documentation + SHIP (DONE)

- Updated `docs/PA-SCRML-PRIMER.md` §7.1 — marked A5-4 + A5-5 as SHIPPED with
  links to the timer-config table + initial-arm ordering details. Documented
  the legacy-<machine> body-parser limitation as a follow-on dispatch.
- Updated `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` §2.5 —
  marked A5-4 + A5-5 as SHIPPED; documented limitation + remaining sub-steps
  (hierarchy desugar / history-cell / internal:rule / parallel still deferred).

## Final regression sweep

`bun run test`:
- BASELINE: 10868 pass, 64 skip, 1 todo, 8 fail
- FINAL:    10940 pass, 64 skip, 1 todo, 6 fail
- Delta:    +72 tests pass, -2 fails (all environmental fails preserved; one
  pre-existing fail eliminated via the comment scrub for the C13 tree-shake
  test).

All 6 final fails are environmental (3 self-host artifacts not built; 3
test-bind A6-5 with hard-coded `bryan-maclee` cwd).

## Files touched (PA file-delta landing reference)

**NEW source files:**
- `compiler/src/codegen/parse-after-duration.ts` — shared duration parser

**MODIFIED source files:**
- `compiler/src/runtime-template.js` — _scrml_engine_arm_state_timers +
  _scrml_engine_clear_state_timers + setterFn extension on
  _scrml_machine_arm_timer + 4th-arg timersTable on _scrml_engine_advance +
  _scrml_engine_direct_set
- `compiler/src/codegen/emit-engine.ts` — engineTimersTableName +
  engineHasOnTimeoutElements + emitEngineTimersTable + emitEngineInitialArm +
  emitEngineInitialArmsForFile + collectEnginesWithOnTimeout +
  EngineBindingInfo extension + emitEngineWriteGuard + emitEngineAdvanceCall
  4th-arg threading
- `compiler/src/codegen/emit-machines.ts` — emitDurationLiteral helper +
  TransitionRule.afterExpr field + temporalRules filter + per-rule fire-site
  duration emission + chained re-arm rulesPayload literal-only filter
- `compiler/src/codegen/emit-machine-property-tests.ts` — TransitionRule
  shape + hasTemporalRule + temporalSuffix recognize afterExpr
- `compiler/src/codegen/emit-logic.ts` — machine init-arm path threads
  afterExpr through inline arm calls (since rulesPayload can't carry
  computed-form text)
- `compiler/src/codegen/emit-reactive-wiring.ts` — collectEnginesWithOnTimeout
  plumbed through emitOpts
- `compiler/src/codegen/emit-functions.ts` — same for fn-body opts +
  scheduleStatements
- `compiler/src/codegen/scheduling.ts` — enginesWithOnTimeout parameter
- `compiler/src/codegen/emit-expr.ts` — EmitExprContext.enginesWithOnTimeout
  field + .advance() call site threads through
- `compiler/src/codegen/emit-client.ts` — emitEngineInitialArmsForFile call
  inserted after emitReactiveWiring
- `compiler/src/type-system.ts` — TransitionRule.afterExpr field +
  parseMachineRules calls parseAfterDuration + 4 rules.push sites updated +
  wildcard-from rejection extended

**NEW test files:**
- `compiler/tests/unit/engine-ontimeout-codegen.test.js` (36 tests)
- `compiler/tests/unit/computed-delay.test.js` (28 tests)
- `compiler/tests/integration/engine-ontimeout-end-to-end.test.js` (9 tests)

**MODIFIED docs:**
- `docs/PA-SCRML-PRIMER.md` — §7.1 updated
- `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` — §2.5 updated
- `docs/changes/phase-a7-step-a5-4-5-ontimeout-codegen-and-computed-delay/progress.md` — this file
