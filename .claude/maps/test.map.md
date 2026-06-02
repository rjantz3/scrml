# test.map.md
# project: scrmlts
# updated: 2026-06-02T03:40:05-06:00  commit: c665714c

## Test Framework
Runner: bun test (built-in Bun test runner)
Config: bunfig.toml (timeout + happy-dom preload settings)
Run all: `bun test compiler/tests/`
Run single: `bun test compiler/tests/unit/<filename>.test.js`
Coverage: `bun test compiler/tests/ --coverage`
Full suite at S153 close: 22,586 pass / 0 fail / 220 skip (873 files counted by the runner)

## Test Categories

| Category | Location | Count |
|----------|----------|-------|
| Unit | compiler/tests/unit/ | ~600 files |
| Browser (DOM) | compiler/tests/browser/ | ~21 files (+3 S153 each-in-dynamic-context canaries) |
| Conformance | compiler/tests/conformance/ | ~40 files |
| Integration | compiler/tests/integration/ | ~30 files |
| Parser conformance | compiler/tests/parser-conformance*.test.js | 10 files |
| LSP | compiler/tests/lsp/ | ~8 files |
| Self-host | compiler/tests/self-host/ | ~5 files |
| CLI commands | compiler/tests/commands/ | ~5 files |
| **Total** | compiler/tests/ | **~858 .test.js files** |

## S153 New Test Files (each-in-dynamic-context sweep)

| File | Covers |
|------|--------|
| compiler/tests/browser/nested-each-in-enclosing-scope.browser.test.js | nested `<each>` (the `as` pattern) renders end-to-end (e6870f25) |
| compiler/tests/browser/component-each-in-prop-scope.browser.test.js | `<each>` in a component body over a prop-scope binding (e6870f25) |
| compiler/tests/browser/each-in-block-form-match.browser.test.js | `<each>` w/ `@.` inside a block-form `<match>` arm (3429b385) |
| compiler/tests/unit/engine-statechild-colon-shorthand-child.test.js | `:`-shorthand child inside an engine arm parses (c89c1cb1) |
| compiler/tests/unit/each-block.test.js | updated for the S153 emit-each dep-first read + reconcile-lines refactor |

## Fixtures & Factories

| Path | Contents |
|------|----------|
| compiler/tests/fixtures/ | shared .scrml test fixtures and multi-file app stubs |
| compiler/tests/helpers/ | compile harness utilities (compileSrc, expectError, cross-stream helpers) |
| compiler/tests/conformance/block-grammar/ | block-grammar conformance fixtures |
| compiler/tests/conformance/s32-fn-state-machine/ | fn-as-state-machine conformance + REGISTRY.md |
| compiler/tests/conformance/tab/ | TAB-stage conformance fixtures |
| compiler/tests/integration/fixtures/ | integration test .scrml inputs |
| compiler/tests/parser-conformance-within-node-allowlist.json | native-parser parity allowlist (updated GITI-024) |

## Pattern

Tests are written as Bun test files using `describe` / `test` / `expect` from `bun:test`.
Unit tests invoke individual compiler passes (block-splitter, ast-builder, type-system, codegen
emit-* modules) directly via `compileSrc(source)` helpers or direct pass calls.
Conformance tests assert that specific E-/W-/I- codes appear in compile output; they use
a cross-stream helper because W-*/I-* codes land in result.warnings, not result.errors —
tests that check `result.errors.filter(e => e.code === "W-...")` silently false-pass.
Browser tests use happy-dom via `@happy-dom/global-registrator` to run emitted client JS
in a DOM environment and assert reactive behavior. The S153 each-in-dynamic-context fixes are
gated by happy-dom canaries (not emit-string-only checks) — the S140/S152 lesson that
emit-string tests mask runtime miscompiles applies directly to the each-in-dynamic-mount class.
Parser conformance tests compare live-pipeline (block-splitter + ast-builder) output to
native-parser output for a large corpus; parity gaps are tracked in the within-node allowlist.

## Tags
#scrmlts #map #test #bun #conformance #parser-parity #happy-dom #each-in-dynamic-context #s153

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
