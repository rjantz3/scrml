# test.map.md
# project: scrmlts
# updated: 2026-05-14T16:19:26-06:00  commit: 13154ba

## Test Framework

| Field | Value |
|-------|-------|
| Runner | bun:test (built-in) |
| Config | bunfig.toml (`root = "compiler/tests/"`, `timeout = 10000`) |
| Pretest | `bash scripts/compile-test-samples.sh` — compiles ~311 sample fixtures |
| Run all | `bun test compiler/tests/` |
| Run subset | `bun test compiler/tests/unit` / `compiler/tests/integration` / `compiler/tests/conformance` |
| Run single | `bun test compiler/tests/unit/<file>.test.js` |
| With bail | `bun test ... --bail` (used by pre-commit hook) |
| Coverage | `bun test compiler/tests/ --coverage` |

## Test Counts (S92 / v0.3.0 STABLE, 2026-05-14)

638 files; **12,694 pass / ~117 skip / 1 todo / 0 fail** (+177 pass, +9 files vs S91 close at b28f493)
HEAD `13154ba` — v0.3.0 STABLE. Tagged release.

## New Tests Since S91 Baseline (b28f493)

**A-5 integration tests — end-to-end adopter scenarios (FULLY CLOSED):**
- compiler/tests/integration/multipage-multirole-integration.test.js — A-5.1 multi-EP + multi-role §40.9.9 cornerstone (FX-1 fixture)
- compiler/tests/integration/cross-file-expansion-integration.test.js — A-5.2 cross-file MOD+CE+AG+RS+CG path (FX-2 fixture)
- compiler/tests/integration/negative-cascade-integration.test.js — A-5.3 intentional diagnostic cascades (FX-3 + FX-4 inline)
- compiler/tests/integration/lint-family-e2e-integration.test.js — A-5.4 W-* lint family end-to-end (FX-5 + FX-7 + FX-8a + FX-8b fixtures)
- compiler/tests/integration/determinism-integration.test.js — A-5.5 cross-wave determinism (FX-1 reuse, 10-run + explicit budget)
- compiler/tests/integration/trucking-dispatch-smoke-integration.test.js — A-5.5 trucking-dispatch reference-app compile-smoke (Family F-6)

**A-5 unit tests — wave-close polish (NEW S92):**
- compiler/tests/unit/codegen-chunk-lint-polish.test.js — Q-OPEN-5 chunkSizeBudgetBytes plumbing + Q-OPEN-6 W-CG-CHUNK-PREFETCH-UNRESOLVED split
- compiler/tests/unit/codegen-chunk-manifest-compiler-identity.test.js — Q-OPEN-4 getCompilerIdentity() chunks.json `compiler` field sourcing from package.json

**A-5 command tests:**
- compiler/tests/commands/compile-chunk-size-budget.test.js — `--chunk-size-budget=N` CLI flag parsing + propagation (Q-OPEN-5)

## A-5 Integration Fixtures  [compiler/tests/integration/fixtures/a5/]

| Fixture | Used by |
|---------|---------|
| fixtures/a5/multipage-multirole/routes/{index,loads,admin}.scrml | A-5.1 FX-1 cornerstone |
| fixtures/a5/cross-file/app.scrml + components/header.scrml | A-5.2 FX-2 cross-file |
| fixtures/a5/lint-large-initial-chunk.scrml | A-5.4 FX-7 W-CG-CHUNK-LARGE fixture |
| fixtures/a5/lint-no-prefetch/routes/{index,other}.scrml | A-5.4 FX-8a W-CG-CHUNK-NO-PREFETCH |
| fixtures/a5/lint-prefetch-unresolved/routes/{about,index}.scrml | A-5.4 FX-8b W-CG-CHUNK-PREFETCH-UNRESOLVED |
| fixtures/a5/runtime-fallback-async-gate.scrml | A-5.4 FX-5 W-AUTH-RUNTIME-FALLBACK |

## Test Categories

| Category | Path | Approx Count |
|----------|------|--------------|
| Unit (named) | compiler/tests/unit/ (top-level .test.*) | ~390 files |
| Unit (gauntlet-s*) | compiler/tests/unit/gauntlet-s*/ | ~64 files |
| Integration | compiler/tests/integration/ | ~52 files |
| Conformance (top-level) | compiler/tests/conformance/ (top-level) | ~25 files |
| Conformance (subtrees) | compiler/tests/conformance/block-grammar, s32-fn-state-machine, tab | ~77 files |
| Browser | compiler/tests/browser/ | 11 files |
| LSP | compiler/tests/lsp/ | 10 files |
| Self-host | compiler/tests/self-host/ | 4 files |
| Commands | compiler/tests/commands/ | 6 files |
| E2E (Playwright) | e2e/tests/ | 5 spec files (3-browser) |

## Unit Test Coverage Highlights (S92 additions in brackets)

**A-5 Wave-Close Polish [NEW S92]**
codegen-chunk-lint-polish.test.js [Q-OPEN-5 chunkSizeBudgetBytes + Q-OPEN-6 W-CG-CHUNK-PREFETCH-UNRESOLVED split],
codegen-chunk-manifest-compiler-identity.test.js [Q-OPEN-4 getCompilerIdentity() + fallback contract],
compile-chunk-size-budget.test.js [--chunk-size-budget CLI flag, command-level]

**A-5 Integration [NEW S92]**
multipage-multirole-integration.test.js [A-5.1 3-EP × 3-role FX-1 cornerstone],
cross-file-expansion-integration.test.js [A-5.2 cross-file MOD+CE end-to-end],
negative-cascade-integration.test.js [A-5.3 diagnostic cascade FX-3 + FX-4],
lint-family-e2e-integration.test.js [A-5.4 W-AUTH-RUNTIME-FALLBACK + W-CG-CHUNK-* family],
determinism-integration.test.js [A-5.5 cross-wave determinism 10-run + explicit budget],
trucking-dispatch-smoke-integration.test.js [A-5.5 reference-app compile-smoke F-6]

**A-2 Reachability — S91 additions**
reachability-solver-outer-fixpoint.test.js [A-2.7 outer fixed-point + E-CLOSURE-001 fire-site, 29 tests],
reachability-record-determinism.test.js [A-2.8 canonical JSON, 10-run + CLI-spawn replay, 21 tests]

**A-2 Reachability Components [S90 baseline]**
reachability-solver-component-2.test.ts [A-2.3 reactive_dep_closure],
reachability-solver-component-3.test.ts [A-2.4 server_fn_reachable_within],
reachability-solver-component-4.test.ts [A-2.5 auth_gated_boundaries_visible_to],
reachability-solver-component-5.test.ts [A-2.6 vendor_units_used_by]

**A-3 AuthGraph [S91 additions]**
auth-graph-login-missing.test.ts [W-AUTH-LOGIN-MISSING + W-AUTH-PAGE-INFERRED two-tier severity],
auth-graph-spec-40-9-9-worked-example.test.js [§40.9.9 Driver/Admin/viewer per-role worked-example]

**A-3 AuthGraph [S90 baseline]**
auth-graph-site-enumerator.test.ts [A-3.1],
auth-graph-role-enum-resolution.test.ts [A-3.2],
auth-graph-classifier.test.ts [A-3.3 + W-AUTH-PAGE-INFERRED],
auth-graph-redirect-crossref.test.ts [A-3.4 + I-AUTH-REDIRECT-UNRESOLVED]

**A-4 Route Splitter [S91]**
codegen-route-splitter.test.js [A-4.1/A-4.2/A-4.3 orchestrator + atom-emitter, 43 tests],
codegen-route-splitter-tier-n.test.js [A-4.5 tier-N dispatch, 14 tests],
chunk-content-addressing.test.js [A-4.6 FNV-1a hash, 19 tests],
codegen-html-augmentation.test.js [A-4.7 HTML augmenter + W-CG-CHUNK-* lints, 31 tests],
initial-chunk-emission.test.js [A-4.2/A-4.6 initial chunk emission, 20 integration tests],
tier1-idle-prefetch.test.js [A-4.3 idle-prefetch, 9 integration tests],
tier2-hover-prefetch.test.js [A-4.4 hover-prefetch, 21 integration tests]

**Generate Auth [S91]**
generate-auth.test.js [scrml generate auth CLI, 12 tests]

**Codegen / Wire Format [S90 baseline]**
wire-format-encoder-decoder.test.js [integration], conf-WIRE-FORMAT-DECODER.test.js [conformance]

**AST / Tokenizer / Parser**
ast-builder-*.test.js, tokenizer-*.test.js, expression-parser.test.js, block-splitter.test.js

**Pipeline Stages**
code-generator.test.js, type-system.test.js, dependency-graph.test.js, protect-analyzer.test.js,
route-inference.test.js, batch-planner.test.js, symbol-table.test.js, binding-registry.test.js,
name-resolver (p1e-name-resolver.test.js), module-resolver.test.js,
dg-markup-read-node-a12.test.js, dg-markup-read-emission-a13.test.js,
dg-markup-read-emission-a14.test.js, dg-markup-read-emission-a15.test.js

**Auth / Session**
session-auth.test.js, state-authority-codegen.test.js, state-authority-parsing.test.js,
stdlib-auth.test.js, stdlib-oauth.test.js, stdlib-oauth-presets.test.js
f-auth-002-export-modifiers.test.js [integration]

**Codegen Emitters**
emit-match.test.js, emit-test.test.js, emit-library.test.js, emit-lift.test.js,
emit-logic.test.js, engine-body-render.test.js, engine-body-children.test.js,
emit-expr-engine-routing-option-a.test.js, match-arm-*.test.js

**Conformance (§34 error codes)**
conf-AUTH-003..005, conf-CG-001-warn, conf-CG-010, conf-CG-014,
conf-WIRE-FORMAT-DECODER, conf-INPUT-001..005, conf-CTRL-011,
conf-ERROR-008, conf-IMPORT-007, conf-LIFECYCLE-015, conf-LOOP-005..007, conf-META-EVAL-002,
conf-TRY-CATCH-IN-SCRML-SOURCE; block-grammar/conf-001..047 (47 files); s32-fn-state-machine/; tab/

**Stdlib**
stdlib-auth.test.js, stdlib-cron.test.js, stdlib-format.test.js, stdlib-fs.test.js,
stdlib-http.test.js, stdlib-oauth.test.js, stdlib-path.test.js, stdlib-process.test.js,
stdlib-redis.test.js, stdlib-regex.test.js, stdlib-router.test.js, stdlib-store.test.js, stdlib-time.test.js

## Fixtures & Factories

| Path | Contents |
|------|----------|
| compiler/tests/fixtures/ | promote-match-canonical.scrml, expr.ts (ExprNode builders), extract-user-fns.js |
| compiler/tests/helpers/ | expr.ts — structured ExprNode test construction utilities |
| compiler/tests/unit/__fixtures__/ | per-test scrml/JS snippet fixtures |
| compiler/tests/unit/_tmp_*/ | temporary snapshot directories (bug regression fixtures) |
| compiler/tests/commands/migrate-program-shape-fixtures/ | 7 bucket-classification fixtures |
| compiler/tests/integration/fixtures/a5/ | A-5 integration fixtures: multipage-multirole, cross-file, lint-large-initial-chunk, lint-no-prefetch, lint-prefetch-unresolved, runtime-fallback-async-gate |
| samples/compilation-tests/ | ~311 .scrml fixtures compiled by pretest; dist/ gitignored |
| e2e/ | Playwright: dev-server-fixture.ts; 02-counter, 03-contact-book, 05-multi-step-form, 14-mario, todomvc specs |

## Pattern

Tests use `bun:test` (`describe`, `test`, `expect`). Unit tests for pipeline passes:
1. Construct a minimal scrml source string or AST fragment
2. Run the target stage function directly (`splitBlocks`, `buildAST`, `runDG`, `runAuthGraph`, `computeAuthGatedBoundariesVisibleTo`, `runOuterFixpoint`, `emitPerRouteChunks`, `getCompilerIdentity`, etc.)
3. Assert on the returned structure using `expect().toEqual()`, `expect().toContain()`, `expect().toMatchObject()`

Integration tests run `compileScrml()` from `api.js` and assert on output HTML, client JS, server JS, and (when `emitPerRoute: true`) chunk payloads, chunks.json manifest, and diagnostic arrays. A-5 integration tests exercise full-pipeline end-to-end coherence: AG derivation → RS per-role ChunkPlans → CG splitter → HTML augmentation → lint codes — across multi-EP, multi-role, cross-file, negative-cascade, and determinism scenarios.

## Tags
#scrmlts #map #test #bun #conformance #unit #integration #s92 #v0.3.0 #approach-a5 #approach-a2 #approach-a3 #approach-a4 #reachability #auth-graph #wire-format #playwright #e2e #route-splitter #generate-auth #q-open-4 #q-open-5 #q-open-6

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
