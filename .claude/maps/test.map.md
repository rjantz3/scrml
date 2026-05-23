# test.map.md
# project: scrmlts
# updated: 2026-05-23T09:52:00-06:00  commit: c2d93544

## Test Framework
Runner: bun test (Bun >=1.3.13 built-in; uses `bun:test` API)
Config: bunfig.toml — [test] root="compiler/tests/", timeout=10000ms
Browser tests: @happy-dom/global-registrator + happy-dom; e2e via @playwright/test
Run all: `bun test compiler/tests/`  (preceded by `pretest` sample compilation)
Run single: `bun test compiler/tests/unit/<file>.test.js`
Run a name: `bun test compiler/tests/<file>.test.js -t "<test name>"`

## Volume (S122 wrap)
19,907 pass / 0 fail / 175 skip / 1 todo across 740 .test.js files
(S121 wrap was 13,773 / ~702 files — S122 marathon added ~6,100 assertions across
26+ new test files via M6 / R4 / EE / BB / DD / AA / W / U / X / Y / Z arcs).

## Test Categories  (740 .test.js files total, recursive)
Unit:         compiler/tests/unit/**          — 517 files
Integration:  compiler/tests/integration/**   — 77 files
Conformance:  compiler/tests/conformance/**   — 105 files (SPEC-section behavior)
Browser:      compiler/tests/browser/**       — happy-dom; excluded from pre-commit
Commands:     compiler/tests/commands/**      — CLI subcommand tests
LSP:          compiler/tests/lsp/**
Self-host:    compiler/tests/self-host/**
E2E:          e2e/**                          — Playwright (separate runner)

## Parser-Conformance Suite  (load-bearing for the M5 swap / C1+C2 / M6 Wave 1)
Top-level files at compiler/tests/:
  parser-conformance-lexer.test.js            — native lexer vs Acorn (M1.x)
  parser-conformance-expr.test.js             — native Expr AST vs Acorn (M2.x)
  parser-conformance-stmt.test.js             — native Stmt AST vs Acorn (M3.x).
                                                S121: tests for B7 throw/try rejection;
                                                P5-7 match-block coverage at parse-file level.
  parser-conformance-markup.test.js           — native markup Block tree (MKx);
                                                S121 expanded for Wave 6-A tag-name `_` admission.
                                                S122 NEW assertions for Unit X @-sigil cleanup.
  parser-conformance-corpus.test.js           — bench corpus + .scrml smoke pass
  parser-conformance-canary.test.js           — dual-pipeline-canary harness; 12+
                                                describe blocks covering nodeKindSequence,
                                                diffFileASTs deep axis, classifyDivergence
                                                verdict logic, sourceHasPhantomStateAdmission,
                                                LIVE-PHANTOM branch, isLiveDegenerate ratio
                                                guard (Wave 8-G W8-CANARY-DEGEN-GUARD —
                                                3.0x → 1.5x), GAP-NEB shape absorption,
                                                countSourceExportLines / ImportDeclLines,
                                                liveImportsHaveDynamicCallShape, isLiveHoistMisclassify,
                                                and LIVE-HOIST-MISCLASSIFY branch.
                                                Strict-pass 998/1000 unchanged through S122.
  parser-conformance-collect-hoisted.test.js  — collectHoisted hoist-synthesis (A3);
                                                S122 expanded for M6.4a P2-Form1 +
                                                cross-file Export/Import shape.
  parser-conformance-parse-file.test.js       — `nativeParseFile` FileAST assembler (C1);
                                                S121 P5-7 added match-block synthesis coverage.

Native-parser bridge unit tests (compiler/tests/unit/):
  translate-stmt-bridge.test.js               — R1 native Stmt[] → live LogicStatement[].
                                                S122 NEW regression gate for R4-U1
                                                (bare-expr/return-stmt/throw-stmt translateExpr
                                                wiring) and R4-U2 (for-stmt iterExpr +
                                                cStyleParts translateExpr wiring).
  translate-expr-bridge.test.js               — A2 native Expr → live ExprNode
  native-parser-core-decl-keywords.test.js    — B4/B5/B6 lin/type/fn productions
  native-parser-scrml-extension-exprs.test.js — B1/B2/B3/B7 ?/!{}/~/throw-try productions

S121 unit test files (compiler/tests/unit/):
  lint-ghost-patterns-context-aware.test.js   — Wave 11-T context-aware brace counter +
                                                broadened skipIf coverage (regression gate
                                                for 26 closed W-LINT FPs).
  import-scope-registration.test.js           — Wave 11-S import-decl scope-chain
                                                `spec.local` binding (TS L5502 fix).
  route-inference.test.js                     — Wave 10-P walkBodyForTriggers callee
                                                collection across EXPR_NODE_CALLEE_FIELDS
                                                (regression gate for 20 closed W-DEAD-FUNCTION FPs).
  stdlib-shim-resolution.test.js              — Bug 8 + Wave 8-F bundleStdlibForRun
                                                W-STDLIB-SHIM-MISSING + W-STDLIB-COMPILER-DEFERRED.

S122 NEW unit test files (compiler/tests/unit/):
  m6-2a-markupvalue-bridge-source-aware.test.js  — M6.2a `translateMarkupValueToLiveNode`
                                                   bridge (Wave 1; native lift-expr.expr.node
                                                   consumer gap closure).
  m6-3-emit-match-native-bareBody.test.js        — M6.3 emit-match per-arm bare-body
                                                   re-parse via nativeParseFile (Wave 1).
  m6.4a-native-p2-form1.test.js                  — M6.4a P2-Form1 synthesis + cross-file
                                                   Export/Import shape (closes 1+2
                                                   E-COMPONENT-035 fires).
  m6-5-parser-workarounds-noop-under-native.test.js — M6.5 path-a regression gate proving
                                                       parser-workarounds helpers no-op under
                                                       native upstream (pre-M6.8 deletion gate).
  i-fn-promotable.test.js                        — Unit EE — new I-FN-PROMOTABLE info lint
                                                   (sibling to I-MATCH-PROMOTABLE); structural
                                                   skip-list (§56.9.1) coverage.
  lint-ghost-patterns.test.js                    — Unit AA — W-LINT-013 markup-attribute
                                                   opener scope-gate regression (Vue `@click`
                                                   FP closed).
  reactive-compound-assign-and-postfix.test.js   — Unit BB / BB-followup — postfix
                                                   @x++/@x-- emit correct setter form +
                                                   emitUnary postfix-reactive lowering restore.
  arrow-object-literal-init-thunks.test.js       — Unit DD — GITI-014 zero-arg arrow
                                                   returning object literal: paren-wrap at
                                                   5 thunk emit sites in emit-logic.ts.
  arrow-object-literal-body.test.js              — Unit DD sibling.
  aliased-imports-local-name.test.js             — Wave 12 Unit W — aliased imports use
                                                   `spec.local` across module-resolver +
                                                   name-resolver + api 3 sites.
  parser-conformance-collect-hoisted.test.js     — expanded for M6.4a.
  parser-conformance-markup.test.js              — expanded for Unit X @-sigil cleanup.

Support dir: compiler/tests/parser-conformance/
  dual-pipeline-canary.js — the C2 proof instrument. Runs LIVE (splitBlocks→buildAST)
    AND NATIVE (nativeParseFile) on a source; structurally diffs the two FileASTs along
    the top-level node-kind sequence, the RECURSIVE node-kind sequence (deep axis), the
    6 hoist counts, hasProgramRoot, and the diagnostic streams. `classifyDivergence`
    tags EXACT / DIFF-top-seq / DIFF-deep-seq / DEFERRAL-* classes plus three
    "credit native" classes:
      LIVE-DEGENERATE       — corpus-stale: liveMarkup===0, nativeMarkup>=1 with
                              ratio guard (Wave 8-G: 1.5x cutoff).
      LIVE-PHANTOM          — Wave 6-B: live admitted a malformed `< Ident>` state
                              opener that native correctly rejects (DIFF-deep-seq +
                              source phantom admission).
      LIVE-HOIST-MISCLASSIFY — Wave 9-H: only hoist counts differ; native correctly
                              hoists what live mis-classifies (import-decl shapes).
    True EXACT requires both the top-level AND recursive sequences to match.
    Strict-pass 998/1000 unchanged through S122.
  corpus-enumerator.js, parsers.js (Acorn-oracle adapter), tier-diff.js, bench/, markup-bench/.
These tests ARE the source of truth for native-parser pass/skip/fail status.

## Pre-commit Test Gate
`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail`
Browser tests are NOT in the pre-commit gate (run separately / in pre-push).

## Fixtures & Factories
compiler/tests/fixtures/  — promote-match-canonical.scrml, promote-multi-file-app/
compiler/tests/helpers/   — expr.ts (expression test helpers), extract-user-fns.js
samples/compilation-tests/ — ~318 test-case directories driven by pretest
                             (compile-test-samples.sh); counted, not enumerated.

## Pattern
Tests use `bun:test` (`describe` / `test` / `expect`). Compiler tests drive
`compileScrml()` from compiler/src/api.js and assert on `result.errors` /
`result.warnings` / `result.outputs`. Diagnostic-stream partition rule (memory
S92/S93): W-* / I-* + severity warning/info → `result.warnings`; tests asserting
on W-/I- codes (including the S119 `I-NATIVE-BLOCK-*` codes, the S121 W-STDLIB-*
codes, and the S122 NEW `I-FN-PROMOTABLE` code) MUST use a cross-stream helper,
not `result.errors.filter`. Parser-conformance tests diff native-parser output
against the Acorn oracle; the dual-pipeline canary diffs the native `nativeParseFile`
FileAST against the live `buildAST` FileAST. M6 Wave 1 consumer-migration tests
(m6-2a / m6-3 / m6.4a / m6-5) assert that the new `nativeParseFile` call-site
preserves the consumer's behavioral contract.

## Tags
#scrmlts #map #test #bun-test #parser-conformance #native-parser #dual-pipeline-canary #m6-wave1

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
