# test.map.md
# project: scrmlts
# updated: 2026-05-11T17:00:00Z  commit: b6c8e1c

## Test Framework

| Field | Value |
|-------|-------|
| Runner | bun:test (built-in) |
| Config | bunfig.toml (`root = "compiler/tests/"`, `timeout = 10000`) |
| Pretest | `bash scripts/compile-test-samples.sh` — compiles ~788 sample fixtures |
| Run all | `bun test compiler/tests/` |
| Run subset | `bun test compiler/tests/unit` / `compiler/tests/integration` / `compiler/tests/conformance` |
| Run single | `bun test compiler/tests/unit/<file>.test.js` |
| With bail | `bun test ... --bail` (used by pre-commit hook) |
| Coverage | `bun test compiler/tests/ --coverage` |

## Test Counts (S81 close, 2026-05-11)
535 files; 11,163 pass / 77 skip / 1 todo / 0 fail

## New tests since S78 baseline
- S79: a5-6-feature-1-named-timer (~28); hardcoded-thresholds-bucket-a-injection; hardcoded-thresholds-bucket-bc-injection; debounce-throttle-attribute; a9-ext5-program-attr (~+88 net)
- S80: 4 A5-7 sample fixtures (engine-005 through engine-008) loaded via pretest
- S81: engine-body-typecheck-a10-followon (+7); F.1+F.2 program-attribute coverage (+21 across middleware-handle.test.js + channel.test.js)

## Test Categories

| Category | Path | Approx Count |
|----------|------|--------------|
| Unit | compiler/tests/unit/ | ~430 files |
| Integration | compiler/tests/integration/ | ~75 files |
| Conformance | compiler/tests/conformance/ | ~35 files |

## Unit Test Coverage Highlights

Key test files grouped by domain:

**AST / Tokenizer / Parser**
ast-builder-*.test.js, tokenizer-*.test.js, expression-parser.test.js, block-splitter.test.js,
body-pre-parser (implicit), regex-tokenize.test.js

**Pipeline Stages**
code-generator.test.js, type-system.test.js, dependency-graph.test.js, protect-analyzer.test.js,
route-inference.test.js, batch-planner.test.js, symbol-table.test.js, binding-registry.test.js,
name-resolver (p1e-name-resolver.test.js), module-resolver.test.js

**Codegen Emitters**
emit-html.test.js (implicit), emit-match.test.js, emit-test.test.js, emit-library.test.js,
emit-lift.test.js, emit-logic.test.js, emit-logic-nested-fn.test.js,
engine-body-render.test.js, engine-body-children.test.js [Phase A10 S78],
engine-ontimeout-codegen.test.js, engine-onIdle-watchdog.test.js [S77]

**Engine / State Machines**
machine-codegen.test.js, machine-parsing.test.js, machine-guards-integration.test.js,
machine-types.test.js, engine-*.test.js (8 files), computed-delay.test.js, timeout.test.js,
engine-ontimeout-end-to-end.test.js [integration, S77]

**Validators / Type System**
validator-catalog.test.js, validator-arg-parsing.test.js, validator-type-check.test.js,
type-encoding.test.js (4 files), type-system.test.js

**SQL / Database**
db-driver.test.js, sql-batching-*.test.js, sql-batch-*.test.js, sql-params.test.js,
sql-write-ops.test.js, reactive-decl-sql-chained-call.test.js

**Auth / CSRF**
csrf-baseline.test.js, csrf-bootstrap.test.js, session-auth.test.js, stdlib-auth.test.js, stdlib-oauth.test.js

**Channels / SSE / WebSockets**
channel.test.js, server-function-sse.test.js, p3a-*.test.js (channel cross-file, 6 files)

**Stdlib**
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
| samples/compilation-tests/ | ~788 .scrml fixtures compiled by pretest; dist/ output gitignored |

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

## Tags
#scrmlts #map #test #bun #conformance #unit #integration

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
