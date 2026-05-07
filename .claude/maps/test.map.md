# test.map.md
# project: scrmlTS
# updated: 2026-05-06T23:50:00Z  commit: 7334fb0

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

## Baseline (S65 close, commit 7334fb0)
**9,019 pass / 44 skip / 1 todo / 0 fail / 9,064 across 447 files.**
Net +78 in S65 across parseVariant Phase 2 (+18), B3 (+11), api.js (+5), B5 (+11), A+ #1+#2 (+15), ast-builder grammar fixes (+18). Zero regressions across the wave.

## Test Categories

### compiler/tests/unit/  (~307 files)
Per-module unit tests. Largest bucket. Examples: `tokenizer.test.js`, `ast-builder-grammar-fixes.test.js`, `a-plus-verdict.test.js`, `parse-variant-runtime.test.js` (S65), `api-js-stdlib-enum-reexport.test.js` (S65), `arrow-block-body-in-call-arg.test.js`, `animation-frame.test.js`, `allow-atvar-attrs.test.js`. Each compiler-src file typically has one or more matching `<name>.test.js` here.

### compiler/tests/integration/  (~31 files + per-test scratch dirs `_tmp_*`)
Cross-module integration. Examples: `self-compilation.test.js`, `self-host-smoke.test.js`, `cross-file-components.test.js`, `expr-parity.test.js`, `expr-node-corpus-invariant.test.js`, `kickstarter-v2-smoke.test.js`, `oq-2-stdlib-runtime-resolution.test.js`, `parse-variant-runtime.test.js`, `parse-shapes-v0next.test.js`, `parse-import-pinned.test.js`, `parse-mutation-shapes.test.js`, `parse-reset-keyword.test.js`, `symbol-table.test.js`, `lin-decl-emission.test.js`, `lin-enforcement-e2e.test.js`, `program-documentary-attrs.test.js`, `sql-001-bracket-matched.test.js`, `uvb-w1-pipeline.test.js`, p2/p3a/p3b multi-file fixtures, f-auth-002/f-build-002/f-compile-002/f-component-004 feature checks, `_tmp_*` scratch dirs (auto-created per-test).

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
#scrmlTS #map #test #bun-test #happy-dom #puppeteer #self-host #s65 #9019-pass

## Links
- [primary.map.md](./primary.map.md)
- [build.map.md](./build.map.md)
- [structure.map.md](./structure.map.md)
- [master-list.md](../../master-list.md)
