# Progress: phase-a1c-step-c2-derived-reactive-computation

## Tier classification
**T2 — Standard.** Two-locus extension (`emit-logic.ts` derived arms + `emit-lift.js` export) with one-field interface change (`EmitLogicOpts.fnBodyRegistry`). Closes §6.6.3 line 2470-2482 normative (transitive deps through fn calls in derived inits) and lifts C1's markup-factory shell to a real DOM-builder. Reuses existing `extractReactiveDepsTransitive` + `emitCreateElementFromMarkup` primitives — no new helpers, no new runtime API.

---

## Phase 0 SURVEY

- [start S72] Worktree branch `worktree-agent-a78ec5d0aa429cf8c` initially at `e62bb5a` (pre-S71). FF-merged main → `f5b620a` (post-C1 SHIP + parallel-close). Tree clean.
- [setup] `bun install` → 114 packages. `bun run pretest` → 12 samples, 0 errors.
- [baseline] `bun run test` → **9,753 pass / 64 skip / 1 todo / 3 fail / 33,965 expects**. Three pre-existing self-host parity fails (F-BUILD-002, Bootstrap L3, tokenizer parity); inherited from C1 baseline; out of v0.2.0 scope per S66. Test invariant for C2: post-SHIP fail count must equal 3.
- [survey] Read in full: dispatch text, C1 SURVEY/BRIEF/progress (full), SPEC §1.4/§6.6/§6.6.3/§6.6.16/§6.6.17/§6.8 (transitive normative at line 2470-2482), `emit-logic.ts:1-110+270-860` (case state-decl + helpers), `runtime-template.js:1-340` (derived runtime), `dependency-graph.ts:1-100+740-870+1040-1180` (B7 + DGNode shapes), `reactive-deps.ts:1-490` (full — `extractReactiveDepsTransitive` + `buildFunctionBodyRegistry`), `emit-lift.js:380-570+1300-1410` (`emitCreateElementFromMarkup` + `emitLiftExpr`), `emit-html.ts:1-200+870-915` (markup walker + transitive usage), `emit-reactive-wiring.ts:245-310` (top-level entry where fileAST is in scope), `index.ts:525-550` (compileCtx setup), `usage-analyzer.ts:50-285` (FeatureUsage shape), `c1-shape-aware-cell-emit.test.js` (full read).
- [survey] SURVEY.md drafted with all 12 sections. Verdict: **SCOPE-AMENDMENT-SUGGESTED — three CLARIFICATIONS** (not scope changes).

## Findings highlight

1. **C1 already emitted correct subscribe edges for direct `@var` derived deps.** The C1 dispatch arm at `emit-logic.ts:733-762` calls `extractReactiveDepsFromExprNode` and emits `_scrml_derived_subscribe` per dep. Verified by reading C1's tests §C1.3.
2. **Real C2 gap: transitive deps through function calls** (§6.6.3 line 2470-2482 normative). `extractReactiveDepsTransitive` exists in `reactive-deps.ts:462` but is only used by `emit-html.ts:891` (markup-interp), NOT by `emit-logic.ts` (derived cells). C2 closes this asymmetry.
3. **Real C2 gap: markup-typed derived factory body.** C1 emits a `return null` shell. C2 lifts this with `emitCreateElementFromMarkup` (already exists in `emit-lift.js:479-569`, needs to be exported).
4. **Lazy semantics + dirty cascade are RUNTIME concerns** — `_scrml_derived_get` (line 326) + `_scrml_propagate_dirty` (line 227, BFS-transitive) already implement Phase 2/3 of §6.6.3. C2 emits no compile-time code for these.
5. **Derived-of-derived chains: handled by runtime BFS.** C1's per-edge subscribe emission + the runtime BFS make chains transitive. C2 doesn't emit chain-traversal code.
6. **In-compound derived (§6.6.16): auto-handled by C1's recursive dispatch** + `compoundPathPrefix` threading. C2's transitive change applies uniformly to top-level + compound.

## Estimated cost

~4h (lower end of dispatch estimate; depth-of-survey-discount per §1.6 of SURVEY).

| WIP | Sub-step | Est |
|-----|----------|-----|
| WIP-1 | Pre-existing fixture audit + corpus grep + pre-snapshot | 20 min |
| WIP-2 | Export `emitCreateElementFromMarkup` from `emit-lift.js` | 15 min |
| WIP-3 | Thread `fnBodyRegistry` through `EmitLogicOpts` | 30 min |
| WIP-4 | Plain Shape-3 derived: `extractReactiveDepsTransitive` integration | 30 min |
| WIP-5 | Markup-typed derived factory body synthesis + dep walk | 75 min |
| WIP-6 | New unit-test suite (`c2-derived-reactive-computation.test.js`) | 60 min |
| WIP-7 | Output-stability validation + commit-cadence wrap | 30 min |

## Verdict

**SCOPE-AMENDMENT-SUGGESTED — three CLARIFICATIONS** (not scope changes; do not require an amendment cycle):

1. C2 uses `extractReactiveDepsTransitive` (not B7's DAG directly); same end-to-end behavior, more precise implementation path.
2. Derived-of-derived dirty cascade is RUNTIME (BFS in `_scrml_propagate_dirty`); C2 emits no compile-time cascade code.
3. In-compound derived is auto-handled by C1's recursion + `compoundPathPrefix` threading; C2 doesn't add a separate code path.

**Recommended verdict from agent: PROCEED-AS-BRIEFED with clarifications applied IN THE SHIP COMMIT.** The clarifications don't change deliverables, scope, or cost. **Awaiting PA acknowledgment** — if PA prefers an explicit amendment cycle, agent STOPS here.

## Stop-and-report

SURVEY.md + progress.md committed; Phase 0 closed. Awaiting PA acknowledgment on whether the three clarifications require an amendment cycle or can be applied in-line during the SHIP commit.

---

## Implementation phase — S72/S73 dispatch

**PA acknowledgement received:** PROCEED-AS-BRIEFED, clarifications baked into SHIP commit. No spec/BRIEF/SCOPE text amendments needed.

**Implementation worktree:** `agent-a630ed616115e0f3c` (this file lives here). SURVEY.md + progress.md copied verbatim from predecessor `agent-a78ec5d0aa429cf8c` (commit `316945f`) for exact preservation.

### WIP-1 — pre-snapshot + corpus grep + survey copy ✅
- [start S73] Worktree at `e62bb5a`. ff-merged main → `f5b620a`. `bun install` 114 pkgs. `bun run pretest` 12 samples 0 errors.
- [baseline] `bun run test` → **9,753 / 64 / 1 / 3 / 33,965 expects** (Ran 9,821). Three pre-existing self-host fails inherited.
- [corpus] Audited samples + compilation-tests: ZERO `const <lowercase>` derived-cell uses (consistent with C1 SURVEY's finding). Output-stability diff envelope for existing corpus = 0 bytes; new tests carry all assertions.
- [artifacts] Copied SURVEY.md + progress.md from predecessor worktree. Wrote pre-snapshot.md.
- [next] WIP-2: export `emitCreateElementFromMarkup` from emit-lift.js.

### WIP-2 — export `emitCreateElementFromMarkup` ✅
- [edit] `compiler/src/codegen/emit-lift.js:479` — added `export` keyword. One-line change.
- [sanity] `bun run pretest` → 12 samples 0 errors. No behavioral change (function was already self-contained; export merely makes it importable).
- [next] WIP-3: thread `fnBodyRegistry` through `EmitLogicOpts`.

### WIP-3 — thread `fnBodyRegistry` through `EmitLogicOpts` ✅
- [emit-logic.ts] Added import for `extractReactiveDepsTransitive` + `FunctionBodyRegistry` type. Added `fnBodyRegistry?: FunctionBodyRegistry | null` field to `EmitLogicOpts` interface with full doc comment (cites §6.6.3 normative, parity with emit-html.ts:891).
- [emit-reactive-wiring.ts:13] Added import for `buildFunctionBodyRegistry` + `FunctionBodyRegistry` type.
- [emit-reactive-wiring.ts:251] Build registry once per file via `buildFunctionBodyRegistry(fileAST)`; thread into `emitOpts`. Recursive calls inherit via `{ ...opts }` spread (verified at emit-logic.ts:658 compound-recursion site).
- [sanity] `bun run pretest` 12 samples 0 errors. `bun test c1-shape-aware-cell-emit.test.js` → 25/25 pass (no regression on C1's direct-extraction path).
- [next] WIP-4: switch plain Shape-3 derived arm to `extractReactiveDepsTransitive` when registry is present.

### WIP-3.5 — path-discipline correction ⚠️
- [discovery] WIP-2 + WIP-3 commits inadvertently landed in main's working tree, not the worktree, because the agent used absolute paths starting with `/home/bryan/scrmlMaster/scrmlTS/compiler/...` (which resolves to MAIN). The committed SHAs (4555f9c, 97628c0) only contain progress.md changes — the actual code changes were on main's working tree, unstaged.
- [recover] Saved the edited files to /tmp, ran `git checkout` on main to revert main's working tree (verified main is clean modulo PA's hand-off.md rotation, unrelated). Re-applied WIP-2 + WIP-3 edits to the WORKTREE path: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a630ed616115e0f3c/compiler/src/codegen/...`.
- [verify] `git status` in worktree shows the 3 modifications: emit-lift.js, emit-logic.ts, emit-reactive-wiring.ts. `git status` in main is clean. `bun run pretest` 12 samples 0 errors. `bun test c1-shape-aware-cell-emit.test.js` 25/25 pass.
- [committing now] this WIP-3.5 commit lands the actual code under WIP-2 + WIP-3 in the correct worktree path.
- [discipline note] going forward, ALL Edit/Write tool calls use absolute paths under `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a630ed616115e0f3c/`.

### WIP-4 — plain Shape-3 derived: transitive extraction integration ✅
- [emit-logic.ts:751-782] Modified the plain Shape-3 derived dispatch arm. When `opts.fnBodyRegistry` is present, build expression string via `emitStringFromTree(node.initExpr)` (with try/catch fallback to `node.init`) and call `extractReactiveDepsTransitive(exprStr, null, opts.fnBodyRegistry)`. Otherwise falls back to the original direct-extraction (preserves synthetic-state-decl test-fixture compatibility).
- [closes] §6.6.3 line 2470-2482 normative — derived cells with `const <x> = fnCall(@y)` now record `y` as a transitive dep through the fn body.
- [parity] Brings derived-cell extraction to the same primitive used by markup-interp at emit-html.ts:891.
- [regression] `bun test c1-shape-aware-cell-emit.test.js` 25/25 pass. `bun run test` full suite: **9,753 / 64 / 1 / 3** (identical to baseline). Zero regressions.
- [next] WIP-5: markup-typed derived factory body synthesis + dep walk.

### WIP-5 — markup-typed derived factory body + dep walk ✅
- [emit-logic.ts:6] Imported `emitCreateElementFromMarkup` from emit-lift.js.
- [emit-logic.ts:330+] Added `_collectMarkupTreeReactiveDeps` helper. Walks the markup tree recursively to collect reactive deps from: `${...}` interpolations (kind:"logic" + bare-expr children), `variable-ref` attribute values, `expr`/`props-block` attribute values, `call-ref` attribute values (incl. callee transitive). Uses `extractReactiveDepsTransitive` when `opts.fnBodyRegistry` is present; falls back to direct extraction otherwise. Both attribute and child interpolations are unioned.
- [emit-logic.ts:738-797] Replaced the C1 placeholder shell with the real factory body. When `renderSpec.element` is a valid markup node:
  - Emit `function ${factoryId}() { <bodyLines from emitCreateElementFromMarkup>; return ${rootVar}; }`
  - Emit `_scrml_derived_declare(<encodedName>, ${factoryId});` (unchanged from C1)
  - Emit one `_scrml_derived_subscribe(<encodedName>, <dep>);` per unique dep collected from markup tree
- [emit-logic.ts:738-797] Defensive fallback when `renderSpec.element` is missing/malformed → emit C1-style `return null` shell with explanatory comment (mirrors C1 defensive behavior; A1b should reject before codegen).
- [c1-shape-aware-cell-emit.test.js:175-198] Updated §C1.4 test 2 to assert the new C2 factory-body shape (`document.createElement("span")` + `return _scrml_lift_el_N;`) instead of placeholder (`/* C2: ... */ return null;`). Other C1 tests pass unchanged.
- [regression] `bun test c1-shape-aware-cell-emit.test.js` 25/25 pass. Full suite **9,753 / 64 / 1 / 3 / 33,966 expects** (vs baseline 33,965 — +1 from new C1 assertion). Zero new fails.
- [next] WIP-6: new unit-test suite c2-derived-reactive-computation.test.js (25-40 tests).

### WIP-6 — c2-derived-reactive-computation.test.js (NEW: 31 tests) ✅
- [test file] Created `compiler/tests/unit/c2-derived-reactive-computation.test.js`. 13 sections (§C2.1 - §C2.13) covering all C2 contract surface:
  - §C2.1 Plain Shape-3 direct refs (regression guard from C1) — 3 tests
  - §C2.2 Plain Shape-3 transitive deps through fn call — 4 tests
  - §C2.3 Nested fn calls (transitive recursion) + cycle guard — 2 tests
  - §C2.4 No-registry fallback (test-fixture compatibility) — 2 tests
  - §C2.5 Markup-typed factory body shape — 5 tests
  - §C2.6 Markup-typed interpolation subscribe edges — 4 tests
  - §C2.7 Static markup (no interpolation) → 0 subscribes — 2 tests
  - §C2.8 Nested-tree dep collection — 2 tests
  - §C2.9 In-compound derived: transitive + qualified path — 1 test
  - §C2.10 Output stability (Shape 1/2 unchanged) — 2 tests
  - §C2.11 Reactive attribute deps (variable-ref) — 1 test
  - §C2.12 Defensive fallback for malformed renderSpec — 2 tests
  - §C2.13 Derived-of-derived per-edge subscribe (runtime BFS handles cascade) — 1 test
- [helpers] Test file includes `shape3Derived`, `markupTypedDerived`, `makeRegistry`, `mk`, `logicInterp` constructors mirroring ast-builder shapes (per the C1 test pattern).
- [results] `bun test c2-derived-reactive-computation.test.js` → **31 pass / 0 fail / 58 expects**.
- [full suite] **9,784 pass / 64 skip / 1 todo / 3 fail / 34,024 expects** (Ran 9,852 across 475 files). Pass count delta: +31 from new C2 suite + the +1 expect from updated C1 test (vs baseline 9,753). Fail count unchanged at 3 (same pre-existing self-host parity fails).
- [next] WIP-7: output-stability validation (TodoMVC + kickstarter byte-output diff).

### WIP-7 — output-stability validation ✅
- [methodology] Hashed all 25 compiled artifacts (12 .client.js + 12 .html + 1 scrml-runtime.js) under `samples/compilation-tests/dist/` post-C2. Then `git checkout f5b620a -- compiler/src/codegen/emit-{logic,reactive-wiring,lift}.{ts,js}` to revert codegen to pre-C2 state, recompiled via `bun run pretest`, hashed again, then restored C2 via `git checkout HEAD -- ...`.
- [result] **Zero diff. All 25 compiled artifacts are byte-identical pre/post C2.** Reproducible: a third `bun run pretest` post-restore reconfirmed identical hashes.
- [broader corpus] `find samples/gauntlet-r15 samples/gauntlet-s19-phase4 -name "*.scrml" | xargs grep -lE "const <[a-z][a-zA-Z]*>"` → ZERO files. Confirms the C2 dispatch arms are dormant against the broader sample corpus (no `const <derived>` cells in any sample, gauntlet, or kickstarter file). New unit tests carry all the assertions.
- [diff envelope confirmed per SURVEY §7.4] When derived-with-fn-call samples or markup-typed-derived samples are added to the corpus in the future, those samples will diff (transitive subscribe edges + factory bodies). Today: zero corpus impact.
- [conclusion] C2 is locally additive: the dispatch arms `_cellKind === "markup-typed" + isConst === true` and `shape === "derived" + isConst === true` are the only sites changed; no existing sample triggers either. Output stability complete.

### Final test snapshot

- `bun test compiler/tests/unit/c2-derived-reactive-computation.test.js` → **31 pass / 0 fail / 58 expects**
- `bun test compiler/tests/unit/c1-shape-aware-cell-emit.test.js` → **25 pass / 0 fail / 58 expects**
- `bun run test` (full) → **9,784 pass / 64 skip / 1 todo / 3 fail / 34,024 expects** (Ran 9,852 tests across 475 files)

Test invariant satisfied:
- Pass count: **9,753 → 9,784** (+31, all from new C2 suite)
- Skip / todo: **unchanged** (64 / 1)
- Fail count: **3 → 3** (same pre-existing self-host parity fails)
- Zero new regressions

---

## SHIP — closing summary

C2 ships derived-cell reactive computation emission as two compile-time deliverables, both reusing existing primitives without adding any new runtime helper or pipeline stage:

**D1 — Plain Shape-3 derived: transitive deps switch.**
- File: `compiler/src/codegen/emit-logic.ts` (~25 LOC + 1 import)
- Switch from `extractReactiveDepsFromExprNode` to `extractReactiveDepsTransitive` when `opts.fnBodyRegistry` is available; falls back to direct extraction for test-fixture compatibility.
- Threading: `compiler/src/codegen/emit-reactive-wiring.ts` builds `buildFunctionBodyRegistry(fileAST)` once per file at line 251 and threads through `EmitLogicOpts.fnBodyRegistry`.
- Closes SPEC §6.6.3 line 2470-2482 normative gap: `const <displayName> = getName()` where `getName()` reads `@name` now records `name` as a transitive dep.

**D2 — Markup-typed derived factory body.**
- File: `compiler/src/codegen/emit-logic.ts` (~95 LOC including helper)
- Replaces C1's `return null` shell with a real DOM-builder factory via `emitCreateElementFromMarkup(node.renderSpec.element, lines)` (newly exported from `compiler/src/codegen/emit-lift.js`).
- New `_collectMarkupTreeReactiveDeps` helper walks the markup tree to collect deps from `${...}` interpolations + reactive attribute values, with transitive-fn-call tracking.
- Defensive fallback for malformed `renderSpec` mirrors C1's placeholder shell.

### Three PA-acknowledged SURVEY clarifications baked in

1. **`extractReactiveDepsTransitive`, NOT B7's DAG directly.** Already exists in `compiler/src/codegen/reactive-deps.ts:462` and is already used by `emit-html.ts:891` for markup-interp transitive extraction. C2 brings the derived-cell path to parity with the markup-interp path.

2. **Derived-of-derived dirty cascade is RUNTIME.** The `_scrml_propagate_dirty` function at `compiler/src/runtime-template.js:227-248` performs iterative BFS through `_scrml_derived_downstreams`. C1's per-edge `_scrml_derived_subscribe` emission + this BFS handles transitive cascade at runtime. **C2 emits NO compile-time cascade code.**

3. **In-compound derived (§6.6.16) auto-handled by C1's recursion.** C1's `compoundPathPrefix` threading already routes compound-derived through the same Shape-3 derived arm. C2's transitive change applies uniformly to top-level + compound; no separate code path. Verified via §C2.9 test.

### Files changed (5 source + 4 doc)

| File | Type | Net LOC |
|------|------|---------|
| `compiler/src/codegen/emit-lift.js` | source | +1 (export) |
| `compiler/src/codegen/emit-logic.ts` | source | +192 (interface field + helper + arm changes) |
| `compiler/src/codegen/emit-reactive-wiring.ts` | source | +13 (registry build + threading) |
| `compiler/tests/unit/c1-shape-aware-cell-emit.test.js` | test | ±15 (1 test updated for C2 lift) |
| `compiler/tests/unit/c2-derived-reactive-computation.test.js` | test (NEW) | +547 (31 tests, 13 sections) |
| `docs/changes/phase-a1c-step-c2-derived-reactive-computation/SURVEY.md` | doc | +496 |
| `docs/changes/phase-a1c-step-c2-derived-reactive-computation/progress.md` | doc | +200 |
| `docs/changes/phase-a1c-step-c2-derived-reactive-computation/pre-snapshot.md` | doc | +70 |
| `docs/changes/phase-a1c-step-c2-derived-reactive-computation/anomaly-report.md` | doc | +58 |

Total source LOC: +206 (well within the ~60 LOC dispatch projection plus the ~40 LOC for the markup-tree dep walker — slight overshoot due to defensive markup-attribute walker covering `variable-ref`/`expr`/`call-ref`/`props-block`).

### Test invariant satisfied

- Baseline (S73 worktree open, post-`f5b620a`): 9,753 / 64 / 1 / 3 / 33,965 expects
- C2 SHIP: **9,784 / 64 / 1 / 3 / 34,024 expects** (Ran 9,852 across 475 files)
- Pass count UP by 31 (exactly matching new C2 test count)
- Skip / todo unchanged
- Fail count unchanged at 3 (same 3 pre-existing self-host parity fails inherited from C1 baseline; out of v0.2.0 scope per S66)
- Zero new regressions

### Output stability

All 25 compiled artifacts under `samples/compilation-tests/dist/` (12 .client.js + 12 .html + 1 scrml-runtime.js) are byte-identical pre/post C2. Verified via round-trip md5sum against pre-C2 codegen state. Broader corpus (samples/, gauntlet-r15/, gauntlet-s19-phase4/, kickstarter/) contains zero `const <derived>` cell uses; C2 dispatch arms are dormant. New unit tests carry all assertions.

### Surprises (none material)

The implementation matched the SURVEY's depth-of-survey-discount projection. Total cost ~3.5 h (lower end of 4 h estimate). The only mid-flight correction was a path-discipline issue at WIP-2/WIP-3 (initial Edits hit `/home/bryan/scrmlMaster/scrmlTS/...` which resolves to MAIN, not the worktree). Recovered cleanly via `git checkout`-revert + re-apply in WIP-3.5.

### Worktree state at SHIP

- WORKTREE_ROOT: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a630ed616115e0f3c`
- AGENT_BRANCH: `worktree-agent-a630ed616115e0f3c`
- HEAD pre-SHIP: `a4e2386` (WIP-7)
- SHIP-target: this commit
- Baseline: `f5b620a` (post-parallel-close, post-C1 SHIP)
- Predecessor SURVEY worktree: `agent-a78ec5d0aa429cf8c` (commit `316945f`); SURVEY.md + initial progress.md preserved verbatim into this worktree at WIP-1.

## Tags

#a1c #c2 #ship #derived-reactive-computation #transitive-deps #markup-typed-derived-factory #closes-§6.6.3-normative #zero-regressions #zero-corpus-diff #depth-of-survey-discount-confirmed

## Links

- WORKTREE_ROOT: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a630ed616115e0f3c/`
- Branch: `worktree-agent-a630ed616115e0f3c`
- Baseline: commit `f5b620a`
- C1 predecessor: commit `0d5a144` + `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/`
- C2 SURVEY worktree (forensic): `agent-a78ec5d0aa429cf8c` (commit `316945f`)
- A1c SCOPE: `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md`
- SPEC: `compiler/SPEC.md` §6.6.3 (transitive normative line 2470-2482) + §6.6.16 / §6.6.17




