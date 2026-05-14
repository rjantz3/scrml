# test.map.md
# project: scrmlts
# updated: 2026-05-14  commit: b28f493

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

## Test Counts (S91 close, 2026-05-14)

629 files; **12,517 pass / ~117 skip / 1 todo / 0 fail** (+242 pass, +12 files vs S90 close at ff9be0e)
HEAD `b28f493` on v0.3.0 cut path (untagged). Current shipped tag: v0.2.6.

## New Tests Since S90 Baseline (ff9be0e)

**A-2 Reachability Solver — outer fixpoint + canonical determinism (FULLY CLOSED):**
- compiler/tests/unit/reachability-solver-outer-fixpoint.test.js — A-2.7 outer-fixpoint + E-CLOSURE-001 (29 tests)
- compiler/tests/unit/reachability-record-determinism.test.js    — A-2.8 canonical JSON determinism (21 tests, 10-run replay + CLI two-spawn diff)

**A-3 AuthGraph — wired + §40.9.9 case-fix:**
- compiler/tests/unit/auth-graph-login-missing.test.ts           — W-AUTH-LOGIN-MISSING / W-AUTH-PAGE-INFERRED two-tier (10 tests)
- compiler/tests/integration/auth-graph-spec-40-9-9-worked-example.test.js — §40.9.9 worked example (13 tests)

**03-contact-book / generate-auth CLI (NEW S91):**
- compiler/tests/commands/generate-auth.test.js                  — `scrml generate auth` command (12 tests)

**A-4 per-route artifact splitter (FULLY CLOSED):**
- compiler/tests/unit/codegen-route-splitter.test.js             — A-4.1/A-4.2/A-4.3 route-splitter orchestrator + atom-emitter (43 tests)
- compiler/tests/unit/codegen-route-splitter-tier-n.test.js      — A-4.5 tier-N dispatch (14 tests)
- compiler/tests/unit/chunk-content-addressing.test.js           — A-4.6 FNV-1a content-addressing (19 tests)
- compiler/tests/unit/codegen-html-augmentation.test.js          — A-4.7 HTML augmentation + W-CG-CHUNK-* lints (31 tests)
- compiler/tests/integration/initial-chunk-emission.test.js      — A-4.2/A-4.6 initial chunk emission (20 tests)
- compiler/tests/integration/tier1-idle-prefetch.test.js         — A-4.3 idle-prefetch (9 tests)
- compiler/tests/integration/tier2-hover-prefetch.test.js        — A-4.4 hover-prefetch (21 tests)

## Test Categories

| Category | Path | Approx Count |
|----------|------|--------------|
| Unit (named) | compiler/tests/unit/ (top-level .test.*) | ~387 files |
| Unit (gauntlet-s*) | compiler/tests/unit/gauntlet-s*/ | ~64 files |
| Integration | compiler/tests/integration/ | ~46 files |
| Conformance (top-level) | compiler/tests/conformance/ (top-level) | ~25 files |
| Conformance (subtrees) | compiler/tests/conformance/block-grammar, s32-fn-state-machine, tab | ~77 files |
| Browser | compiler/tests/browser/ | 11 files |
| LSP | compiler/tests/lsp/ | 10 files |
| Self-host | compiler/tests/self-host/ | 4 files |
| Commands | compiler/tests/commands/ | 5 files |
| E2E (Playwright) | e2e/tests/ | 5 spec files (3-browser) |

## Unit Test Coverage Highlights (S91 additions in brackets)

**A-2 Reachability — S91 additions [NEW S91]**
reachability-solver-outer-fixpoint.test.js [A-2.7 outer fixed-point + E-CLOSURE-001 fire-site],
reachability-record-determinism.test.js [A-2.8 canonical JSON, 10-run + CLI-spawn replay]

**A-2 Reachability Components [S90 baseline]**
reachability-solver-component-2.test.ts [A-2.3 reactive_dep_closure],
reachability-solver-component-3.test.ts [A-2.4 server_fn_reachable_within],
reachability-solver-component-4.test.ts [A-2.5 auth_gated_boundaries_visible_to],
reachability-solver-component-5.test.ts [A-2.6 vendor_units_used_by]

**A-3 AuthGraph [S91 additions]**
auth-graph-login-missing.test.ts [W-AUTH-LOGIN-MISSING + W-AUTH-PAGE-INFERRED two-tier severity NEW S91],
auth-graph-spec-40-9-9-worked-example.test.js [§40.9.9 Driver/Admin/viewer per-role worked-example NEW S91]

**A-3 AuthGraph [S90 baseline]**
auth-graph-site-enumerator.test.ts [A-3.1],
auth-graph-role-enum-resolution.test.ts [A-3.2],
auth-graph-classifier.test.ts [A-3.3 + W-AUTH-PAGE-INFERRED],
auth-graph-redirect-crossref.test.ts [A-3.4 + I-AUTH-REDIRECT-UNRESOLVED]

**A-4 Route Splitter [NEW S91]**
codegen-route-splitter.test.js [A-4.1/A-4.2/A-4.3 orchestrator + atom-emitter, 43 tests],
codegen-route-splitter-tier-n.test.js [A-4.5 tier-N dispatch, 14 tests],
chunk-content-addressing.test.js [A-4.6 FNV-1a hash, 19 tests],
codegen-html-augmentation.test.js [A-4.7 HTML augmenter + W-CG-CHUNK-* lints, 31 tests],
initial-chunk-emission.test.js [A-4.2/A-4.6 initial chunk emission, 20 integration tests],
tier1-idle-prefetch.test.js [A-4.3 idle-prefetch, 9 integration tests],
tier2-hover-prefetch.test.js [A-4.4 hover-prefetch, 21 integration tests]

**Generate Auth [NEW S91]**
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
| samples/compilation-tests/ | ~311 .scrml fixtures compiled by pretest; dist/ gitignored |
| e2e/ | Playwright: dev-server-fixture.ts; 02-counter, 03-contact-book, 05-multi-step-form, 14-mario, todomvc specs |

## Pattern

Tests use `bun:test` (`describe`, `test`, `expect`). Unit tests for pipeline passes:
1. Construct a minimal scrml source string or AST fragment
2. Run the target stage function directly (`splitBlocks`, `buildAST`, `runDG`, `runAuthGraph`, `computeAuthGatedBoundariesVisibleTo`, `runOuterFixpoint`, `emitPerRouteChunks`, etc.)
3. Assert on the returned structure using `expect().toEqual()`, `expect().toContain()`, `expect().toMatchObject()`

Integration tests run `compileScrml()` from `api.js` and assert on output HTML, client JS, server JS, and (when `--emit-per-route`) chunk payloads. Conformance tests assert that a given input produces a specific SPEC §34 error code from the pipeline error array. Route-splitter tests assert per-(EP, role, tier) chunk payloads, content-address hashes, HTML augmentation markers, and W-CG-CHUNK-* lint emissions.

## Tags
#scrmlts #map #test #bun #conformance #unit #integration #s91 #approach-a2 #approach-a3 #approach-a4 #reachability #auth-graph #wire-format #playwright #e2e #route-splitter #generate-auth

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
