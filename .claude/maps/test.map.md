# test.map.md
# project: scrmlts
# updated: 2026-05-21T15:00:00Z  commit: 67a17dc5

## Test Framework
Runner: bun test (Bun >=1.3.13 built-in; uses `bun:test` API)
Config: bunfig.toml — [test] root="compiler/tests/", timeout=10000ms
Browser tests: @happy-dom/global-registrator + happy-dom; e2e via @playwright/test
Run all: `bun test compiler/tests/`  (preceded by `pretest` sample compilation)
Run single: `bun test compiler/tests/unit/<file>.test.js`
Run a name: `bun test compiler/tests/<file>.test.js -t "<test name>"`

## Test Categories  (738 test files total)
Unit:         compiler/tests/unit/**          — ~519 files
Integration:  compiler/tests/integration/**   — ~75 files
Conformance:  compiler/tests/conformance/**   — ~105 files (SPEC-section behavior)
Browser:      compiler/tests/browser/**       — 12 files (happy-dom; excluded from pre-commit)
Commands:     compiler/tests/commands/**      — 6 files (CLI subcommand tests)
LSP:          compiler/tests/lsp/**           — 10 files
Self-host:    compiler/tests/self-host/**     — 4 files
E2E:          e2e/**                          — Playwright (separate runner)

## Parser-Conformance Suite  (load-bearing for the M5 swap)
Top-level files at compiler/tests/:
  parser-conformance.test.js                  — overall harness
  parser-conformance-lexer.test.js            — native lexer vs Acorn (M1.x)
  parser-conformance-expr.test.js             — native Expr AST vs Acorn (M2.x, 614+ tests)
  parser-conformance-stmt.test.js             — native Stmt AST vs Acorn (M3.x, 499+ tests)
  parser-conformance-markup.test.js           — native markup BlockNode tree (MKx)
  parser-conformance-corpus.test.js           — bench corpus + ~900-file .scrml smoke pass
  parser-conformance-collect-hoisted.test.js  — hoisted-collection extraction
Support dir: compiler/tests/parser-conformance/ (parsers.js — Acorn-oracle adapter).
These tests ARE the source of truth for native-parser pass/skip/fail status.

## Pre-commit Test Gate
`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail`
Browser tests are NOT in the pre-commit gate (run separately / in pre-push).

## Fixtures & Factories
compiler/tests/fixtures/  — promote-match-canonical.scrml, promote-multi-file-app/
compiler/tests/helpers/   — expr.ts (expression test helpers), extract-user-fns.js
samples/compilation-tests/ — 318 test-case directories driven by pretest
                             (compile-test-samples.sh); counted, not enumerated.

## Pattern
Tests use `bun:test` (`describe` / `test` / `expect`). Compiler tests drive
`compileScrml()` from compiler/src/api.js and assert on `result.errors` /
`result.warnings` / `result.outputs`. Diagnostic-stream partition rule (memory
S92/S93): W-* / I-* + severity warning/info → `result.warnings`; tests asserting
on W-/I- codes MUST use a cross-stream helper, not `result.errors.filter`.
Parser-conformance tests diff native-parser output against the Acorn oracle.

## Tags
#scrmlts #map #test #bun-test #parser-conformance #native-parser

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
