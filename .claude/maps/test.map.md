# test.map.md
# project: scrmlts
# updated: 2026-05-28T00:00:00Z  commit: 1fed5588

## Test Framework

Runner: `bun:test` (built-in Bun test runner; no separate package)
Config: `bunfig.toml` — `[test] root = "compiler/tests/"`, `timeout = 10000`
Run all: `bun test`
Run single: `bun test compiler/tests/<path>/<file>.test.js`
Run with coverage: `bun test compiler/tests/ --coverage`
Pretest hook: `bash scripts/compile-test-samples.sh` (compiles browser-test .scrml fixtures)

Current baseline: **~22,055 pass / 0 fail / 219 skip / 1 todo / ~783 files** (v0.6.6 close)

## Test Categories

| Category | Path | Count | Notes |
|---|---|---|---|
| Unit | `compiler/tests/unit/` | 588 files | per-stage unit tests; most use `compileScrml()` with inline source |
| Conformance | `compiler/tests/conformance/` | 105 files | conf-*.test.js; per-feature spec-conformance |
| Integration | `compiler/tests/integration/` | 88 files | multi-stage + output inspection |
| Browser | `compiler/tests/browser/` | 12 files | happy-dom + GlobalRegistrator; tests DOM mutation |
| LSP | `compiler/tests/lsp/` | 10 files | Language Server Protocol handler tests |
| Commands | `compiler/tests/commands/` | 6 files | CLI subcommand tests |
| Self-host | `compiler/tests/self-host/` | 4 files | bpp/ast/bs/tab self-host stage parity tests |
| Parser conformance (root) | `compiler/tests/parser-conformance*.test.js` | 10 files | native-parser (M5) conformance suite |

## Fixtures and Factories

`compiler/tests/fixtures/` — shared `.scrml` source fixtures (canonical test programs)
`compiler/tests/helpers/` — `compileScrml` wrappers, happy-dom setup, cross-stream diagnostic helpers
`samples/compilation-tests/` — 804 `.scrml` compilation-test inputs; not individually enumerated
`compiler/tests/parser-conformance-within-node-allowlist.json` — M5 within-node conformance allowlist

## Pattern

Tests import `compileScrml` from `../../src/api.js` (or `../../src/cli.js` for command tests). Unit tests compile inline `.scrml` source strings, inspect `result.errors`, `result.warnings`, `result.outputs`, or the generated JS/HTML/CSS text. Browser tests use `@happy-dom/global-registrator` to register a DOM environment, then load the compiled `client.js` and assert on DOM state. Assertion style is `expect(value).toBe()` / `expect(value).toContain()` / `expect(value).toMatchObject()` via Bun's built-in `expect`. Non-fatal (W-*/I-*) codes MUST be checked in `result.warnings`, not `result.errors` (S92/S93 partition rule — see error.map.md).

## Notable Test Files Added Since S135 Watermark

| File | Session | Coverage |
|---|---|---|
| `compiler-managed-async-bug-9-and-55.test.js` | S138 | Bug 9 L1+L2 (direct-caller + CPS shape gate) |
| `structural-body-closer-r24-bug-4.test.js` | S138 | `<match>`+`<each>` `</>` generic closer (23 tests) |
| `emit-match-bug52-bare-variant.test.js` | S138 | `<match on=.BareVariant>` codegen |
| `emit-match-bug53-shorthand-body.test.js` | S138 | `<match>` `:`-shorthand arm body markup |
| `emit-event-wiring-bug50.test.js` | S138 | `<tableFor>` synthetic onchange fallback-string |
| `class-binding-on-for-lift-bug-11.test.js` | S139 | `class:NAME` on for-lift runtime fix (+252L, 9 tests) |
| `cps-scheduler-bug56.test.js` | S139 | CPS scheduler TDZ + non-decl-in-Promise.all (5 tests) |
| `shape2-render-by-tag-bug51.test.js` | S139 | Shape 2 + render-by-tag end-to-end (6 tests) |

## Tags
#scrmlts #map #test #unit #conformance #browser #bun #happy-dom

## Links
- [primary.map.md](./primary.map.md)
- [error.map.md](./error.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
