# test.map.md
# project: scrmlts
# updated: 2026-05-18T18:37:27-06:00  commit: 84c736e

## Test Framework

| Field | Value |
|-------|-------|
| Runner | bun:test (built-in) |
| Config | bunfig.toml (`root = "compiler/tests/"`, `timeout = 10000`) |
| Pretest | `bash scripts/compile-test-samples.sh` — compiles ~311 sample fixtures |
| Run all | `bun test compiler/tests/` |
| Run subset | `bun test compiler/tests/unit` / `compiler/tests/integration` / `compiler/tests/conformance` |
| Run single | `bun test compiler/tests/unit/<file>.test.js` |
| Run native-parser lexer | `bun test compiler/tests/parser-conformance-lexer.test.js` |
| With bail | `bun test ... --bail` (used by pre-commit hook) |
| Coverage | `bun test compiler/tests/ --coverage` |

## Test Counts (S103 / v0.3.3 era, 2026-05-18)

Pre-commit subset (unit + integration + conformance): **12,719 pass / 88 skip / 1 todo / 0 fail / 696 files**
Full suite (`bun run test`): See pre-commit subset; S102 close addendum notes 12,718 pass at `08d05b3`
Native-parser conformance: **97 pass / 0 skip / 0 fail** (parser-conformance-lexer.test.js, M1.4 / M1.5 template-mode tracking)

Prior watermarks: S101 close — 12,645 pass / 88 skip / 1 todo / 0 fail / 658 files (pre-commit); S100 close — 15,444 pass / 172 skip / 1 todo / 0 fail / 689 files (full); S92 close — 12,694 pass / 638 files (pre-commit subset)

## New Tests Since S101 Baseline (S102-S103)

**§41.14 formFor (NEW S102):**
- compiler/tests/unit/form-for.test.js — 8 E-FORMFOR-* error codes; all validation error paths (TYPE-NOT-STRUCT, SLOT-UNKNOWN, PICK-INVALID-FIELD, OMIT-INVALID-FIELD, PICK-OMIT-CONFLICT, ONSUBMIT-SIGNATURE, ERROR-STRATEGY-INVALID, NESTED-STRUCT-NO-SLOT); +58 tests
- compiler/tests/unit/form-for-expander.test.js — expandFormFor() unit tests; expansion plan + slot-override merge + partial mode
- compiler/tests/conformance/conf-form-for-canonical.test.js — end-to-end conformance: `<formFor for=Signup onsubmit=fn/>` compiles to full `<form>` with PE-default `action=/api/<route>`, CSRF auto-injection, per-field render with shape-dispatched inputs (text/checkbox), title-case labels, error-rendering anchors, submit button

**§42.2.4 paren-form `is some` / `is not` fix (S103):**
- compiler/tests/unit/not-keyword.test.js — updated (§42.2.4 Phase A describe block, DQ-12); S103 fix removes tmpvar interposition: `(expr) is not` → `((expr) == null)` without `_scrml_tmp_N` lift; 6 tests covering absence/presence/double-negation/array-index/addition

**COMPOUND-STATE-DECL-AUTOLIFT (S102):**
- compiler/tests/conformance/conf-COMPOUND-STATE-DECL-AUTOLIFT.test.js — conformance test for compound state declaration auto-lift behavior

**M1.5 native-parser template-mode tracking (S102):**
- compiler/tests/parser-conformance-lexer.test.js — updated: M1.5 template-mode tracking in `tokenizeWithAcorn`; opening backtick/brace drop (enter template mode); Acorn regex-token normalizer surface vs native `RegexLit` gap documented; `expr-literals.js` retains `"M1.2-string-template-regex"` skip pending M1.5 full flip

**Self-host AST parity (S102):**
- compiler/tests/self-host/ast.test.js — updated: strip `hasResetExpr` + `_p3aExport` fields before parity comparison; needed after PGO P3.B-followup adds `hasResetExpr` to FileAST and TAB adds `_p3aIsExport`/`_p3aExportName` flags

**Misc S102:**
- compiler/tests/unit/bare-variant-sequential-writes-bug2.test.js — bare-variant sequential-writes regression test
- compiler/tests/unit/html-elements.test.js — updated for formFor element registration
- compiler/tests/unit/p3-follow-no-isComponent-routing.test.js — P3.B follow-up regression: no isComponent routing breakage
- compiler/tests/unit/type-system.test.js — updated for formFor type-system validation pass

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
| Unit (named) | compiler/tests/unit/ (top-level .test.*) | ~484 files |
| Integration | compiler/tests/integration/ | ~52 files |
| Conformance (top-level) | compiler/tests/conformance/ (top-level) | ~28 files (conf-COMPOUND-STATE-DECL-AUTOLIFT + conf-form-for-canonical added S102) |
| Conformance (subtrees) | compiler/tests/conformance/block-grammar, s32-fn-state-machine, tab | ~77 files |
| Parser conformance | compiler/tests/parser-conformance-lexer.test.js + parser-conformance.test.js | 2 test files + bench corpus |
| Browser | compiler/tests/browser/ | 11 files |
| LSP | compiler/tests/lsp/ | 10 files |
| Self-host | compiler/tests/self-host/ | 4 files |
| Commands | compiler/tests/commands/ | 6 files |
| E2E (Playwright) | e2e/tests/ | 5 spec files (3-browser) |

## Unit Test Coverage Highlights (S102-S103 additions over S101)

**§41.14 formFor [NEW S102]**
form-for.test.js (8 error-code validation tests + edge cases) + form-for-expander.test.js (AST expansion unit tests) + conf-form-for-canonical.test.js (end-to-end compile conformance). expandFormFor() is type-system-stage expansion — no codegen-stage changes. Source-level AST expansion; output rides §6.2 Shape 2 + §55 validity surface + §16 slots pipelines unchanged.

**§42.2.4 paren-form fix [S103]**
not-keyword.test.js §42.2.4 Phase A describe (DQ-12): paren-form `is not` / `is some` / `is not not` lower without `_scrml_tmp_N` tmpvar. Prior implementation's undeclared tmpvar threw `ReferenceError` in ES-module strict mode; surfaced when regenerated self-host `meta-checker.js` was executed. Tests assert tmpvar-free shape: `(regex.exec(str)) is not` → `((regex.exec(str)) == null)`.

**PGO P3.B follow-up [S102]**
self-host/ast.test.js strips `hasResetExpr` (FileAST cache field from PGO P3.B-followup) and `_p3aExport*` fields before AST parity comparison so the self-host shape-diff test remains clean.

**M1.5 native-parser template-mode tracking [S102]**
parser-conformance-lexer.test.js tokenizer helper updated; template-mode tracking in Acorn oracle disambiguates regex-vs-division at template interpolation sites. `expr-literals.js` bench-corpus retains "skip" pending M1.5 normalizer flip.

## M1.x Native Parser Conformance [S99-S103]

parser-conformance-lexer.test.js [M1.1 skeleton → M1.2 strings+templates+§51.0.Q.1 → M1.3 comments → M1.4 regex → M1.5 template-mode-tracking; 97 pass at M1.4+M1.5; Acorn bench-corpus token-by-token comparison; DD §D4 P3 regex-vs-division discrimination at Ident/RParen/return sites included]

## Pipeline Stage Coverage

| File | Stage / Area |
|------|-------------|
| code-generator.test.js | Stage 8 CG |
| type-system.test.js | Stage 6 TS (updated S102 for formFor) |
| dependency-graph.test.js | Stage 7 DG |
| protect-analyzer.test.js | Stage 4 PA |
| route-inference.test.js | Stage 5 RI |
| batch-planner.test.js | Stage 7.5 BP |
| symbol-table.test.js | Symbol resolution |
| binding-registry.test.js | CG binding tracking |
| ast-builder-*.test.js | Stage 1 TAB (multiple files) |
| tokenizer-*.test.js | Tokenizer |
| not-keyword.test.js | §42 absence/presence rewrites (updated S103 — paren-form fix) |
| html-elements.test.js | html-elements registry (updated S102 for formFor element) |
| form-for.test.js | §41.14 formFor error codes (NEW S102) |
| form-for-expander.test.js | §41.14 expand pass (NEW S102) |
| emit-match.test.js, emit-test.test.js, emit-library.test.js, emit-lift.test.js | CG emitters |
| auth-graph-*.test.ts | Stage 7.55 AuthGraph (A-3) |
| reachability-solver-*.test.js | Stage 7.6 RS (A-2) |
| codegen-route-splitter*.test.js, chunk-*.test.js | A-4 per-route artifact splitter |

## Tags
#scrmlts #map #test #bun-test #s103 #v0.3.3 #formfor #spec-41-14 #e-formfor #paren-form-fix #dq-12 #native-parser #m1-5 #template-mode #pgo-p3 #hasResetExpr #self-host-ast-parity #approach-a #approach-a5

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [error.map.md](./error.map.md)
- [domain.map.md](./domain.map.md)
