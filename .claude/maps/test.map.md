# test.map.md
# project: scrmlTS
# updated: 2026-05-07T20:31:48Z  commit: a4eed93

## Test Framework
Runner:        Bun's built-in test runner (`bun test`).
Config:        `bunfig.toml` → `[test] root = "compiler/tests/"`, `timeout = 10000`.
Browser DOM:   `@happy-dom/global-registrator@^20.8.9` + `happy-dom@^20.8.9` (registered globally for browser tests).
E2E browser:   `puppeteer@^24.40.0` (used by `browser-todomvc.test.js`, `todomvc-e2e.test.js`).

Run all:           `bun test compiler/tests/`
Run single file:   `bun test compiler/tests/unit/<file>.test.js`
Run by name:       `bun test --test-name-pattern "<substring>" compiler/tests/`
Coverage:          `bun test compiler/tests/ --coverage`
Pre-test compile:  `bash scripts/compile-test-samples.sh` (auto-runs as `pretest` hook).

## Baseline (S67 close, commit a4eed93)
**9,241 pass / 54 skip / 1 todo / 0 fail (full suite) across 457 files.**
**8,470 pass (pre-commit subset).**
Net +222 from S66 close (e557e30): B7 +22 (derived-circular-dep), B8 +39 pass +8 skip (derived-value-mutate), B9 validator-arg-parsing tests, B10 +26 (validator-catalog + validator-type-check + validator-circular-dep).

## Test Categories

### compiler/tests/unit/  (~307 files)
Per-module unit tests. Largest bucket. Examples: `tokenizer.test.js`, `ast-builder-grammar-fixes.test.js`, `a-plus-verdict.test.js`, `parse-variant-runtime.test.js` (S65), `api-js-stdlib-enum-reexport.test.js` (S65), `arrow-block-body-in-call-arg.test.js`, `animation-frame.test.js`, `allow-atvar-attrs.test.js`.
S67 new test files:
- `derived-circular-dep.test.js` (450 LOC) — E-DERIVED-CIRCULAR-DEP, 1-cycles and multi-node DFS cycles in derived-cell DAG.
- `derived-value-mutate.test.js` (474 LOC) — E-DERIVED-VALUE-MUTATE, three mutation forms: method-call, property-assignment/compound-assign, delete.
- `validator-arg-parsing.test.js` (385 LOC) — B9 ValidatorArg parsing: 14 universal-core predicates, relational forms, dep-walker.
- `validator-catalog.test.js` (227 LOC) — UNIVERSAL_CORE_PREDICATES catalog contents and PredicateSignature shape.
- `validator-circular-dep.test.js` (242 LOC) — E-VALIDATOR-CIRCULAR-DEP, validator-dep subgraph cycle detection.
- `validator-type-check.test.js` (251 LOC) — E-TYPE-031 four shapes: bareword-only-with-arg, too-many-args, wrong-arg-type, arity-mismatch.

### compiler/tests/integration/  (~31 files + per-test scratch dirs `_tmp_*`)
Cross-module integration. Examples: `self-compilation.test.js`, `self-host-smoke.test.js`, `cross-file-components.test.js`, `expr-parity.test.js`, `expr-node-corpus-invariant.test.js`, `kickstarter-v2-smoke.test.js`, `oq-2-stdlib-runtime-resolution.test.js`, `parse-variant-runtime.test.js`, `parse-shapes-v0next.test.js` (updated S67 — args now structured ExprNodes, not raw strings), `parse-import-pinned.test.js`, `parse-mutation-shapes.test.js`, `parse-reset-keyword.test.js`, `symbol-table.test.js`, `lin-decl-emission.test.js`, `lin-enforcement-e2e.test.js`, `program-documentary-attrs.test.js`, `sql-001-bracket-matched.test.js`, `uvb-w1-pipeline.test.js`, p2/p3a/p3b multi-file fixtures, f-auth-002/f-build-002/f-compile-002/f-component-004 feature checks, `_tmp_*` scratch dirs (auto-created per-test).

### compiler/tests/conformance/  (81 files)
- `block-grammar/` — block grammar conformance (largest sub-bucket).
- `s32-fn-state-machine/` — §54.6 / §33.6 fn purity inside state-machine transitions (S33 close baseline).
- `tab/` — TAB conformance fixtures.

### compiler/tests/browser/  (11 files)
happy-dom + puppeteer tests: `browser-bind-value`, `browser-class-binding`, `browser-components`, `browser-conditionals`, `browser-forms`, `browser-reactive-arrays`, `browser-todomvc`, `browser-todo`, `browser-transitions`, `runtime-behavior`, `todomvc-e2e`.

### compiler/tests/lsp/  (10 files)
LSP coverage L1+L2+L3+L4: `analysis`, `completions`, `document-symbols`, `hover`, `l3-component-prop-completions`, `l3-import-completions`, `l3-sql-completions`, `l4-code-actions`, `l4-signature-help`, `workspace-l2`.

### compiler/tests/self-host/  (4 files)
Self-host conformance tests that compile + run `compiler/self-host/*.scrml` mirrors: `ast.test.js`, `bpp.test.js`, `bs.test.js`, `tab.test.js`.

### compiler/tests/commands/  (3 files)
CLI subcommand tests: `build-adapters`, `init`, `library-mode-types`.

### compiler/tests/helpers/  (2 files)
Shared helpers: `expr.ts` (expression-fixture helper), `extract-user-fns.js` (test-input scrubber).

## Fixtures & Factories

samples/                          — `.scrml` programs used by integration + bench compiles.
samples/compilation-tests/        — large bucket of compile-only fixtures (counted only, not enumerated).
samples/gauntlet-r{11,13,14,15,18,19}/, samples/gauntlet-s19-phase4/  — gauntlet sample sets.
benchmarks/                       — perf-bench inputs.
compiler/tests/integration/_tmp_*/ — per-test scratch dirs (auto-created; not committed if .gitignored).

## Pattern

Tests use Bun's `test()` / `describe()` / `expect()` API. A typical compile-then-assert test imports `compileSource` (or similar) from `compiler/src/api.js`, runs the full pipeline against an inline `.scrml` source string or a `samples/` fixture, then asserts on the returned diagnostics, AST shape, or emitted JS/HTML/CSS strings. Browser tests register happy-dom globally via `@happy-dom/global-registrator` and exercise the runtime template against the emitted client bundle. Self-host tests build `compiler/self-host/dist/*` first, then assert that scrml-source-of-the-compiler produces the same outputs as the JS-source compiler against fixtures.

Two persistent self-host smoke failures (historical, deferred per user) — see master-list.md.

## Tags
#scrmlTS #map #test #bun-test #happy-dom #puppeteer #self-host #s65 #s66 #s67 #9241-pass #b7 #b8 #b9 #b10 #derived-circular-dep #validator-catalog

## Links
- [primary.map.md](./primary.map.md)
- [build.map.md](./build.map.md)
- [structure.map.md](./structure.map.md)
- [master-list.md](../../master-list.md)
