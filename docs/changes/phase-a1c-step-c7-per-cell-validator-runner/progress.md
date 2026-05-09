# C7 — Per-cell validator runner: progress log

Append-only timestamped log per global instructions.

## 2026-05-08T00:00Z — startup verification

- `pwd` confirmed: `.claude/worktrees/agent-a9494e3c869c52c2c/`
- `git rev-parse --show-toplevel` matches.
- `git status --short` clean.
- `bun install` ran (114 packages).
- `bun run pretest` ran clean.
- `bun run test` baseline: **10062 pass / 60 skip / 1 todo / 0 fail / 34679 expects** (matches
  brief expected post-C5+C6 land — earlier flake was a network ECONNREFUSED only,
  reproducible-clean on retry).
- BRIEF.md is in main path (untracked) but not in worktree commit. Copied from main
  into worktree dir for in-worktree reading. Brief unchanged.

## 2026-05-08T00:01Z — survey phase

Read brief in full. Read mandatory pre-implementation refs: PA-PRIMER §8/§13.7,
SPEC §55.2/§55.6/§55.7/§55.12, runtime-validators.js, validator-catalog.ts, C6
progress.md (hookpoints), C5 SURVEY.md (chunk-add precedent), emit-logic.ts cell-emission,
runtime-chunks.ts, emit-client.ts detectRuntimeChunks, symbol-table.ts synth records
+ getPerFieldSynthRecords, validator-arg-parser.ts, reactive-deps.ts, emit-expr.ts.

SURVEY.md authored. Verdict: PROCEED-AS-BRIEFED.

Decisions:
- File locus: NEW `compiler/src/codegen/emit-validators.ts` module.
- Runtime wire-in: chunk-add (mirror C5 `reset` chunk pattern) + `readFileSync` at
  module-load to avoid duplication. `runtime-validators.js` stays single source-of-truth.
- Top-level cell with validators: emit no runner (per §55.5 L11 Edge A — no synth surface
  to write to). Brief approved survey-decision; not a STOP-FOR-PA case.
- Test file: `compiler/tests/unit/c7-per-cell-validator-runner.test.js`.

## 2026-05-08T00:02Z — implementation: runtime chunk wiring (commit 1)

- runtime-template.js: import readFileSync + url + path; pull
  runtime-validators.js source at module load with `^export ` strip.
  Inserted new chunk between `reset` and `derived`. Added thin
  `_scrml_validator_fire(name, value, ...args)` alias inside chunk.
- runtime-chunks.ts: `validators` added to RUNTIME_CHUNK_ORDER + CHUNK_MARKERS.
  Chunk count 15 → 16.
- emit-client.ts:detectRuntimeChunks: case "state-decl" gains validators-array
  trigger that adds `validators` + `derived` chunks.
- runtime-tree-shaking.test.js: expected chunk count 15 → 16.
- Smoke test: assembled runtime parses; chunk extraction OK; no-validator
  builds unaffected.

Tests: 10062 / 0 fail / 34681 expects (no delta; trigger-without-callsite).
Commit: `0e826e3`.

## 2026-05-08T00:03Z — implementation: emit-validators module (commit 2)

- NEW `compiler/src/codegen/emit-validators.ts` — `emitValidatorRunnerSidecar`
  + helpers (`emitOneValidatorBlock`, `lowerValidatorArgs`, `lowerOneArg`,
  `expressionContainsReactive`).
- emit-logic.ts wire-in: single sidecar call inside `case "state-decl":`
  threaded into `_appendSidecar` parts list.
- Smoke tests via `bun -e`: compound+req+length composes; cross-field
  eq(@signup.password) emits thunk + wires cross-field dep; runtime-execute
  shows correct semantics including §55.12 short-circuit, declaration-order
  composition, isValid latch.

Tests: 10062 / 0 fail / 34681 expects (no delta; no validator-using fixtures
yet in corpus). Commit: `64c92a0`.

## 2026-05-08T00:04Z — tests phase (commit 3)

- NEW `compiler/tests/unit/c7-per-cell-validator-runner.test.js` — 61 tests
  / 108 expects across §C7.0 to §C7.15. Coverage: emission shape, every
  validator name, declaration-order composition, §55.12 short-circuit
  (witnessed end-to-end with req+length+pattern), cross-field
  eq(@otherCell) re-fire on cross-field change, arg-kind dispatch (relational,
  comparable, equatable, array), skip rules (top-level/derived/compound-
  parent/server/insideFunctionBody/markup-typed), isValid semantic, reactive-
  deps wiring, chunk wiring, chunk detection, inline-override stripped,
  runtime end-to-end (assembleRuntime + new Function), direct API.

Tests: 10123 / 0 fail / 34789 expects (delta +61 tests / +108 expects).
Commit: `383b0e3`.

## 2026-05-08T00:05Z — Wave 2 closure

C5 (S73) ✓ + C6 (S73) ✓ + C7 (S73) ✓. **Wave 2 of A1c CLOSED.**

Hookpoints for C8 (compound rollup):
- Per-field outputs C8 will reduce: `<compound>.<field>.errors` and
  `<compound>.<field>.isValid` for every compound child.
- Synth keys live at `<compound>.errors` (object-of-arrays per §55.5) and
  `<compound>.isValid` (boolean rollup per §55.5).
- Iteration: `getSynthRecords(compoundDecl)` returns `[isValid, errors,
  touched, submitted]` for the parent; for each compound child node, C8
  reads `getPerFieldSynthRecords(childDecl)` to identify the per-field keys
  to reduce. C7's emitted `<field>.errors` is a derived cell — C8's reducer
  reads it via `_scrml_derived_get(...)`.
- Reactive subscriptions: C8's compound-level `<compound>.errors` derivation
  subscribes to each field's `<compound>.<field>.errors` derivation — same
  `_scrml_derived_subscribe` machinery.
- C7's runner returns errors[] in declaration order; C8's compound
  aggregation must preserve that ordering.
- Touched/submitted rollups (C9/C10) are independent of C7's outputs.

C6 runtime catalog wire-in confirmation: `runtime-validators.js` exports
unchanged (NOT edited per sanity check). Source pulled into SCRML_RUNTIME at
module-load via fs.readFileSync + `^export ` strip. The `_scrml_validator_fire`
runtime alias dispatches to the inlined VALIDATOR_RUNTIME map. Verified
end-to-end via §C7.14 runtime tests (req/min/length/pattern/eq all dispatch
correctly through the assembled runtime).
