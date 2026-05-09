# Progress — TS state-child `rule=` recognition (S75)

## Phase 0 — Survey (DONE — awaiting PA approval)

**Date:** 2026-05-09
**Worktree:** `agent-a19a090a55016837d`
**Branch:** `main` (worktree on direct-commit policy)
**Baseline:** 10702 / 69 / 1 / 3 (3 fails are pre-existing self-host parity)

### Steps completed

1. Startup verification: pwd / git rev-parse / git status / bun install /
   bun run pretest / bun run test — baseline confirmed.
2. Located `parseMachineRules` at `compiler/src/type-system.ts:2500-2716`.
   Read end-to-end. Confirmed it accepts arrow-rule grammar only.
3. Located `parseEngineStateChildren` at
   `compiler/src/engine-statechild-parser.ts:1017`. Read end-to-end.
   Confirmed it accepts the §51.0.B + §51.0.F modern state-child grammar.
4. Mapped buildMachineRegistry call sites — `parseMachineRules` is invoked from
   both projection (line 2095) and non-projection (line 2125) paths in
   `buildMachineRegistry`.
5. Mapped downstream `MachineType.rules` consumers:
   - `emit-machines.ts:emitTransitionTable` — emits transition lookup table
   - `emit-machines.ts:emitProjectionFunction` — derived-engine projection
   - `emit-reactive-wiring.ts:buildMachineBindingsMap` — binds
     transition-guards to assignments
   - `validateDerivedMachines` — derived exhaustiveness
   - All harmless when `rules` is empty (iteration over empty array).
6. Confirmed `engine-decl.legacyMachineKeyword` is the keyword discriminator
   (ast-builder.js:9015). Confirmed `<engine>` keyword is permitted over the
   LEGACY arrow body shape (existing samples). Body-shape dispatch is the
   correct boundary — keyword alone is insufficient.
7. Reproduced the bug via
   `docs/changes/phase-ts-state-child-rule-recognition/repro.test.ts` —
   modern `<engine for=Phase initial=.Idle>` with `<Idle rule=.Loading>` etc.
   fires `E-ENGINE-005: Machine 'phase' has no transition rules.`
   Legacy `<machine name=PhaseM for=Phase>` with `.Idle => .Loading` etc.
   compiles cleanly.
8. Surveyed why the bug never surfaced in tests:
   - Zero modern-form `<engine for=>` samples exist in `samples/`.
   - B15 unit tests (`engine-statechild-b15.test.js`) use `runUpToSYM` —
     they NEVER invoke runTS. End-to-end engine tests (`c12`, `c14`, `c15`)
     all use the legacy keyword/body form.
9. Drafted `SURVEY.md` with option matrix (A / B / C / D), recommendation
   (Option A — body-shape dispatch in `buildMachineRegistry`), and Phase 1
   implementation outline.

### Recommendation

**Option A — body-shape dispatch in buildMachineRegistry.** Smallest blast
radius, re-uses B15's existing `isLegacyArrowRulesBody` helper, preserves
`MachineType` shape for downstream codegen, fully aligned with §51.0 vs §51.3
normative split.

### Estimated revised scope

**~1-1.5h for Phase 1+** (below S74 hand-off estimate of 3-5h). Depth-of-survey
discount: B15 already does the modern-form parsing work; we just need to wire
one dispatch in TS-stage `buildMachineRegistry`.

### STOP — awaiting PA approval

Per dispatch instructions: STOP after Phase 0, surface for PA approval before
Phase 1.

## Phase 1 — Implementation (PENDING APPROVAL)

(Will populate when PA approves.)
