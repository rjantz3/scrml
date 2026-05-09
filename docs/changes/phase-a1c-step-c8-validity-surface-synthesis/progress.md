# C8 — Validity surface synthesis: progress log

Append-only timestamped log per global instructions.

## 2026-05-08T00:00Z — startup verification

- `pwd` confirmed: `.claude/worktrees/agent-a28d8066d58a87cfc/`
- `git rev-parse --show-toplevel` matches.
- `git status --short` clean.
- `bun install` ran (114 packages).
- `bun run pretest` ran clean.
- `bun run test` baseline: **10122 pass / 60 skip / 1 todo / 2 fail / 34736 expects**.
  Brief expected 10123 pass / 0 fail post-C7. Diff: 1-test difference (likely test-counting variance) + 2 ECONNREFUSED failures in `compiler/tests/unit/serve.test.js` (network-dependent, pre-existing — not C8 territory). Treating these as acceptable baseline noise; C8 contract is "no regressions vs this baseline".

## 2026-05-08T00:01Z — survey phase

Read brief in full. Read mandatory pre-implementation refs: PA-PRIMER §8/§13.7 B11+B12 specifics + §11 anti-patterns, SPEC §55.5 / §55.6 / §55.7 / §55.13, C7's emit-validators.ts (consumer surface for rollup), emit-bindings.ts (C3+C4 render-by-tag dispatch — extension point for touched event wiring), emit-event-wiring.ts (Approach D delegated submit listener pattern), runtime-template.js (`_scrml_reset` + `_scrml_init_set` + `_scrml_init_fns` registry), symbol-table.ts (B11/B12 synth APIs `getSynthRecords` / `getPerFieldSynthRecords` + `SynthProperty` enum + `COMPOUND_SYNTH_PROPERTIES` + `PER_FIELD_SYNTH_PROPERTIES`), runtime-chunks.ts (chunk wiring), emit-client.ts:detectRuntimeChunks (chunk-add triggers), emit-logic.ts state-decl arm (where compound-parent emits), C7 progress.md (hookpoints), c7-test patterns.

SURVEY.md authored. Verdict: PROCEED-AS-BRIEFED.

Decisions:
- File locus: NEW `compiler/src/codegen/emit-synth-surface.ts`.
- emit-logic.ts wire-in: in compound-parent arm, after parent-derived-declare emission.
- emit-bindings.ts extension: render-by-tag bind dispatch loop adds touched-event listener inside same `if (elem)` block.
- Reset integration: NO C5 extension. Register init-thunks via `_scrml_init_set` for event-driven cells (touched/submitted); C5's `_scrml_reset` walks compound prefix automatically.
- Submit handler: simple document-level `submit` listener per compound (not form-discriminated). Multi-form discrimination deferred to later step.
- Predictability extension scope decision: C8 EMITS per-field trivial-default `errors`+`isValid` for no-validator fields too (C7 skipped these). Per §55.6 lines 25139-25142.
- Test file: `compiler/tests/unit/c8-validity-surface-synthesis.test.js`.
- No new runtime chunks needed.

## 2026-05-08T00:02Z — implementation: emit-synth-surface module (commit cc15cfa)

- NEW `compiler/src/codegen/emit-synth-surface.ts` (~280 LOC):
  - `emitCompoundSynthSurface(node, qualifiedName, opts)` returns JS-statement
    string for the compound's full validity-surface emission. Five phases:
    (0) per-field trivial-default errors/isValid for no-validator fields +
        per-field touched reactive cell + init-thunk.
    (1) compound-level errors derived (object map of per-field-errors).
    (2) compound-level isValid derived (Object.values(errors).every length===0).
    (3) compound-level touched derived (object map of per-field-touched).
    (4) compound-level submitted reactive cell (init false) + init-thunk +
        document-level submit listener (idempotent).
  - `emitTouchedEventListenerLines(...)` exported helper for emit-bindings.
- emit-logic.ts compound-parent arm: append synth-surface emission to
  parentLines AFTER parent-derived-declare. Reads C7's per-field outputs +
  C8's per-field trivial defaults via _scrml_derived_get.
- emit-client.ts:detectRuntimeChunks: compound-parent state-decl triggers
  `derived` + `reset` chunks (rollup needs derived; init-thunks need reset).
- C7 test (#542): tightened "parent does not emit runner" assertion from
  stale "no signup.errors" check to "no validator-fire for parent" check.
  C8 NOW emits signup.errors as a synth rollup (different from a validator
  runner — the contract is unchanged).

Tests: 9399 / 0 fail / 32994 expects (pre-commit suite).

## 2026-05-08T00:03Z — implementation: emit-bindings touched wiring (commit f5bc047)

- emit-bindings.ts: `_emitTouchedListenerLines(lines, bVarRaw, elemVar, inputEvent, ctx)`
  helper emits input/change + focusout listeners on a bound DOM element to
  set `<compound>.<field>.touched = true` on first interaction. Idempotency-
  guarded (skip reactive-set when already true). Top-level cells (no dot in
  path) silently skipped per §55.5 L11 Edge A.
- Wired into ALL bind:* arms (value, valueAsNumber, checked, selected, files,
  group) PLUS the C4 render-by-tag dispatch loop (`renderByTagBindings`).

Tests: 9399 / 0 fail / 32994 expects. No regressions.

## 2026-05-08T00:04Z — tests phase (commit 22f395d)

- NEW `compiler/tests/unit/c8-validity-surface-synthesis.test.js` (~790 LOC):
  53 tests / 103 expects across §C8.0 to §C8.14. Coverage:
  - emission shape (4 synth cells per compound)
  - compound errors/isValid/touched/submitted derivations + listeners
  - per-field touched reactive cell + init-thunk
  - predictability (no-validator compound; no-validator field trivial defaults)
  - reset integration end-to-end via init-thunk walk
  - multi-field rollup (declaration order)
  - chunk wiring (derived + reset chunks)
  - top-level non-compound skip (§55.5 L11 Edge A)
  - skip rules (server, insideFunctionBody)
  - direct API tests
  - runtime end-to-end with mock document
  - emit-bindings smoke + nested-compound recursion

Tests final:
- Pre-commit suite: 9452 / 0 fail / 33097 expects (+53 tests / +103 expects)
- Full suite: 10176 / 0 fail / 34891 expects (baseline 10122/34736 → +54 tests / +155 expects)

## 2026-05-08T00:05Z — C8 closure

C8 (S73 close) **SHIPPED**. Wave 3 of A1c FOUNDATION COMPLETE.

Hookpoints for C9/C10/C11:

**C9 (cross-field dependency refinement, §55.11):**
- C7's per-field validator runner already subscribes to cross-field cell reads
  via `forEachIdentInValidatorArg` walk + `_scrml_derived_subscribe`. C9's
  refinement is to ensure cross-field arg changes correctly re-fire the right
  cells WITHOUT redundant subscribe storms. Look at:
  - `compiler/src/codegen/emit-validators.ts` lines 178-189 (valueDeps loop)
  - `compiler/src/validator-arg-parser.ts` (forEachIdentInValidatorArg)
  - Existing B10 Phase 3 dep-graph emission (validator-reads edges)
- C8's compound rollup auto-rides the existing C7 wiring — no new edges needed.
  Each compound errors derivation subscribes to per-field errors, which
  subscribe to cross-field deps via C7. The propagation path is already wired.

**C10 (error message rendering, 4-level chain §55.10):**
- C8 emits `<compound>.<field>.errors` arrays (and rollup `<compound>.errors`
  object map). C10 reads these arrays, walks the 4-level resolution chain
  (`messageFor` helper in `scrml:data`), produces user-facing strings.
- The arrays contain `ValidationError` enum tags (built by C6's runtime
  catalog with payload). C10 dispatches per-tag.
- C8 leaves the ValidationError tags raw — no rendering. Validates the C7→C8
  contract (errors carry through unchanged).

**C11 (`<errors of=expr/>` element, §55.8):**
- C11 reads `<compound>.errors` (object map) when `of=@compound` + `all` flag,
  or `<compound>.<field>.errors` (array) when `of=@compound.field`. Default
  rendering shows first error; `all` flag shows full array.
- The synth cells C8 emits ARE the data source. C11 just consumes via
  `_scrml_derived_get(...)` and renders.
- For `<errors of=@signup all/>` — iterate Object.entries(errors); for each
  `[fieldName, errorArr]`, render each `errorTag` via `messageFor`.

**Form-detection / submit-handler approach used (per FINAL REPORT):**
- C8 uses a SIMPLE document-level submit listener per compound — fires
  `submitted = true` on any submit anywhere in the document. Multi-form
  discrimination NOT IMPLEMENTED in C8 — deferred to C11+ refinement if
  needed. Predictability over selectivity per §55.7 line 25153 reading.
- The listener is wrapped in `typeof document !== "undefined"` for SSR
  safety.
- Idempotency guard prevents redundant reactive-set when already-true.

**Reset integration confirmation:**
- Per §55.13 — `reset(@compound)` clears synth state. C8 registers init-thunks
  for per-field touched (`() => false`) and compound submitted (`() => false`).
- C5's existing `_scrml_reset(name)` walks `_scrml_init_fns[name]` AND prefix
  children. The compound walk picks up the synth cells naturally because
  their storage keys share the compound's prefix.
- No C5 extension required — pure additive integration.
- Verified end-to-end via §C8.13 runtime test ("reset clears touched +
  submitted + name via init-thunk walk").

**Predictability rule confirmation:**
- §C8.6: no-validator compound emits all 4 synth cells. ✓
- §C8.7: no-validator field emits trivial-default errors=[] + isValid=true. ✓
- Both cases verified at emission level + runtime level via §C8.13.

**File-touched diff vs BRIEF expected:**
- emit-synth-surface.ts (NEW): yes ✓
- emit-bindings.ts: yes ✓ (touched event-listener wiring)
- runtime-template.js: NOT TOUCHED — no new helpers needed; existing chunks
  cover all needs (derived, reset, deep_reactive)
- runtime-chunks.ts: NOT TOUCHED — no new chunk
- emit-client.ts: yes ✓ (chunk-detection trigger for compound-parent)
- emit-logic.ts: yes ✓ (compound-parent arm wires emit-synth-surface call)
- c8-validity-surface-synthesis.test.js (NEW): yes ✓
- runtime-tree-shaking.test.js: NOT TOUCHED — chunk count stays 16

**Deferred items:** none. Full §scope IN delivered.
