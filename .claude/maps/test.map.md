# test.map.md
# project: scrmlts
# updated: 2026-05-12T21:42:04Z  commit: f1555b4

## Test Framework

| Field | Value |
|-------|-------|
| Runner | bun:test (built-in) |
| Config | bunfig.toml (`root = "compiler/tests/"`, `timeout = 10000`) |
| Pretest | `bash scripts/compile-test-samples.sh` — compiles ~795 sample fixtures |
| Run all | `bun test compiler/tests/` |
| Run subset | `bun test compiler/tests/unit` / `compiler/tests/integration` / `compiler/tests/conformance` |
| Run single | `bun test compiler/tests/unit/<file>.test.js` |
| With bail | `bun test ... --bail` (used by pre-commit hook) |
| Coverage | `bun test compiler/tests/ --coverage` |

## Test Counts (S87 close, 2026-05-12)
554 files; **11,153 pass / 85 skip / 1 todo / 0 fail**
(HEAD `15850d0` — untagged; v0.2.6 `efbd1e8` is the current shipped tag)

Note: HEAD has 1 pre-existing failing test (Bug 3a §1 SQL round-trip); that test was added as
a repro-anchor that fails until the SQL round-trip is fully exercised. Zero regressions introduced.

## New tests since S84 baseline (28cd2ac)

**S85 / v0.2.5 (Wave 2 launch):**
- migrate-program-shape.test.js: +33 tests / 5 bucket-fixtures
- Wave 2 item (b) TAB extension: +14 tests
- bs-layer-program-page-state-decl.test.js: +8 tests
- promote-safety-harness.test.js: +7 tests
- Wave 3 Playwright dispatch 1: e2e/tests/02-counter.spec.ts (+5 ACs)

**S86 / v0.2.6 (Wave 2+3 completion):**
- p3a-* channel cross-file tests: +6 files
- channel-placement-shared-b19.test.js: 15 pass (rewrite)
- Various Wave 3 integration tests: +~30

**S87 (37 commits — all on v0.3.0 cut path):**
- engine-self-write-option-d.test.js: +14 tests (Option (d) synthesis)
- emit-expr-engine-routing-option-a.test.js: +9 tests (Option A comprehensive engine-routing)
- emit-server-sql-emission.test.js: +7 tests (Bug 3a SQL emission + integration)
- method-chain-callback-emission.test.js: +7 tests (Bug 5 callback preservation)
- bs-comment-skip.test.js: +28 tests (BS comment-skip + dep-graph call-ref-args + reactive-deps engine-var)
- migrate-program-shape-wave-3.5-bundle.test.js: +17 tests (Wave 3.5 migrate bundle)
- stdlib-canonical-form-cleanup.test.js: +28 tests (stdlib Phase 1 guard)
- match-arm-codegen-bundle-bug-1.6-1.7.test.js: regression guards
- match-arm-inline-markup-payload.test.js: regression guard (Bug 6.5)
- match-arm-named-binding-parser.test.js: regression guard (Bug 6.5.1)
- lift-li-text-template.test.js: Bug 6 closure + LIFT-1..5 broken-output anchor tests
- todomvc-fixture-edit-mode.test.js: +7 tests (Bug 5 anchors + LIFT repro anchors §B.1-4)
- dep-graph-call-ref-args.test.js: regression guard
- dg-engine-cell-self-credit.test.js: regression guard
- dg-projected-var-reader-credit.test.js: regression guard
- p3a-cross-file-multi-page-broadcast.test.js + p3a-pure-channel-file.test.js: integration
- sql-server-fn-runtime.test.js: real compile+invoke integration test
- cross-file-components.test.js + cross-file-channel-import-emit.test.js: updated

## Test Categories

| Category | Path | Approx Count |
|----------|------|--------------|
| Unit | compiler/tests/unit/ | ~417 files |
| Integration | compiler/tests/integration/ | ~53 files |
| Conformance | compiler/tests/conformance/ | ~17 files |
| E2E (Playwright) | e2e/tests/ | 5 spec files (3-browser) |

## Unit Test Coverage Highlights

Key test files grouped by domain:

**AST / Tokenizer / Parser**
ast-builder-*.test.js, tokenizer-*.test.js, expression-parser.test.js, block-splitter.test.js,
body-pre-parser (implicit), regex-tokenize.test.js, bs-comment-skip.test.js [S87]

**Pipeline Stages**
code-generator.test.js, type-system.test.js, dependency-graph.test.js, protect-analyzer.test.js,
route-inference.test.js, batch-planner.test.js, symbol-table.test.js, binding-registry.test.js,
name-resolver (p1e-name-resolver.test.js), module-resolver.test.js,
dep-graph-call-ref-args.test.js [S87], dg-engine-cell-self-credit.test.js [S87],
dg-projected-var-reader-credit.test.js [S87]

**Codegen Emitters**
emit-html.test.js (implicit), emit-match.test.js, emit-test.test.js, emit-library.test.js,
emit-lift.test.js, emit-logic.test.js, emit-logic-nested-fn.test.js,
engine-body-render.test.js, engine-body-children.test.js [Phase A10 S78],
engine-ontimeout-codegen.test.js, engine-onIdle-watchdog.test.js [S77],
emit-expr-engine-routing-option-a.test.js [S87], emit-server-sql-emission.test.js [S87],
method-chain-callback-emission.test.js [S87], match-arm-codegen-bundle-bug-1.6-1.7.test.js [S87],
match-arm-inline-markup-payload.test.js [S87], match-arm-named-binding-parser.test.js [S87],
lift-li-text-template.test.js [S87]

**Engine / State Machines**
machine-codegen.test.js, machine-parsing.test.js, machine-guards-integration.test.js,
machine-types.test.js, engine-*.test.js (8 files), computed-delay.test.js, timeout.test.js,
engine-ontimeout-end-to-end.test.js [integration, S77],
engine-self-write-option-d.test.js [S87]

**Validators / Type System**
validator-catalog.test.js, validator-arg-parsing.test.js, validator-type-check.test.js,
type-encoding.test.js (4 files), type-system.test.js

**SQL / Database**
db-driver.test.js, sql-batching-*.test.js, sql-batch-*.test.js, sql-params.test.js,
sql-write-ops.test.js, reactive-decl-sql-chained-call.test.js,
emit-server-sql-emission.test.js [S87 Bug 3a], sql-server-fn-runtime.test.js [integration S87]

**Auth / CSRF**
csrf-baseline.test.js, csrf-bootstrap.test.js, session-auth.test.js, stdlib-auth.test.js, stdlib-oauth.test.js

**Channels / SSE / WebSockets**
channel.test.js, server-function-sse.test.js, p3a-*.test.js (channel cross-file, 8+ files),
channel-placement-shared-b19.test.js [S86 rewrite], p3a-pure-channel-file.test.js [S87 integration]

**Stdlib** (Phase 1 canonical-form sweep S87: 20 modules; stdlib-canonical-form-cleanup.test.js guards)
stdlib-cron.test.js, stdlib-format.test.js, stdlib-fs.test.js, stdlib-http.test.js,
stdlib-path.test.js, stdlib-process.test.js, stdlib-redis.test.js, stdlib-regex.test.js,
stdlib-router.test.js, stdlib-store.test.js, stdlib-time.test.js

**Reactivity**
reactive-arrays.test.js, reactive-deps.test.js, reactive-derived.test.js, runtime-reactivity.test.js

**Components**
component-expander.test.js, component-tags.test.js, cross-file-components.test.js, snippet-slot.test.js

**Lint**
lint-ghost-patterns.test.js, lint-i-match-promotable.test.js, lint-w-lint-013-*.test.js

**CSS**
css-at-rules.test.js, css-scope.test.js, css-variable-bridge.test.js, css-brace-stripping.test.js

**Meta**
meta-checker.test.js, meta-eval.test.js, meta-effect.test.js, meta-integration.test.js

**Migrate / Promote**
scrml-migrate.test.js, migrate-program-shape.test.js [S85 Wave 2],
migrate-program-shape-wave-3.5-bundle.test.js [S87 Wave 3.5],
promote-match.test.js, promote-safety-harness.test.js [S87]

**LIFT (open bug anchors — fail until fixed)**
lift-li-text-template.test.js §B.* — LIFT-1..5 broken-output anchors (§B tests assert CURRENT BROKEN OUTPUT; flip to pass when gap is fixed)
todomvc-fixture-edit-mode.test.js §B.1-4 — LIFT-1..4 repro anchors

## Conformance Tests

Located in `compiler/tests/conformance/`. Test SPEC §34 error codes:

conf-AUTH-003.test.js, conf-AUTH-004.test.js, conf-AUTH-005.test.js,
conf-CG-001-warn.test.js, conf-CG-010.test.js, conf-CG-014.test.js,
conf-CTRL-011.test.js, conf-ERROR-008.test.js, conf-IMPORT-007.test.js,
conf-LIFECYCLE-015.test.js, conf-LOOP-005.test.js, conf-LOOP-006.test.js, conf-LOOP-007.test.js,
conf-META-EVAL-002.test.js

Subdir conformance: `s32-fn-state-machine/` (with REGISTRY.md), `tab/`, `block-grammar/`

## Fixtures & Factories

| Path | Contents |
|------|----------|
| compiler/tests/fixtures/ | promote-match-canonical.scrml, expr.ts (ExprNode builders), extract-user-fns.js |
| compiler/tests/helpers/ | expr.ts — structured ExprNode test construction utilities |
| compiler/tests/unit/__fixtures__/ | per-test scrml/JS snippet fixtures |
| compiler/tests/unit/_tmp_*/ | temporary snapshot directories (bug regression fixtures) |
| compiler/tests/commands/migrate-program-shape-fixtures/ | 7 bucket-classification fixtures for migrate --program-shape |
| samples/compilation-tests/ | ~795 .scrml fixtures compiled by pretest; dist/ output gitignored |
| e2e/ | Playwright e2e suite: fixtures/dev-server-fixture.ts + db-fixture.ts; tests/02-counter.spec.ts, 03-contact-book.spec.ts, 05-multi-step-form.spec.ts, 14-mario.spec.ts, todomvc.spec.ts |

## Pattern

Tests use `bun:test` (`describe`, `it`, `expect`). Unit tests for pipeline passes typically:
1. Construct a minimal scrml source string or AST fragment
2. Run the target stage function directly (e.g. `splitBlocks(src)`, `buildAST(blocks)`, `runTS(ast, ...)`)
3. Assert on the returned structure using `expect().toEqual()`, `expect().toContain()`, `expect().toMatchObject()`

Integration tests run the full `compile()` API from `api.js` on a .scrml source string and assert on:
- The output HTML string (structure, data attributes)
- The output client JS string (reactive wiring, event delegation)
- The output server JS string (route handlers, SQL)

Conformance tests assert that a given scrml input produces a specific error code (`E-AUTH-003`, etc.) from the pipeline error array.

S87 introduces broken-output anchor tests (§B-prefix): these assert the CURRENT broken output and
are expected to FAIL when the underlying bug is fixed, prompting test upgrade to assert correct output.

## Tags
#scrmlts #map #test #bun #conformance #unit #integration #s87 #lift-bugs #playwright #e2e

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
