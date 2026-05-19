# structure.map.md
# project: scrmlts
# updated: 2026-05-18T18:37:27-06:00  commit: 84c736e

## Entry Points

compiler/src/cli.js            — CLI entry; routes compile/dev/build/serve/migrate/promote/init/generate subcommands
compiler/src/api.js            — programmatic API; orchestrates full BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→RS→CG pipeline (includes Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED + Stage 7.55 AuthGraph + Stage 7.6 Reachability Solver)
compiler/bin/scrml.js          — installed binary (points to cli.js via package.json `bin`)
lsp/server.js                  — Language Server Protocol server; started via `scrml lsp --stdio`
compiler/src/codegen/index.ts  — Stage 8 CG entry point; runCG() exported; emitPerRouteChunks() wired; PGO P3.A regex collapse + P3.B detect-runtime-chunks deferred assembly (S102)

## Directory Ownership

compiler/                      — workspace root; compiler/package.json declares acorn + astring deps
compiler/src/                  — all pipeline stage implementations: tokenizer, block-splitter, ast-builder, type-system, etc.
compiler/src/codegen/          — Stage 8 (CG) emitters; 35+ emit-*.ts files + IR, BindingRegistry, CompileContext, errors; route-splitter.ts, atom-emitter.ts, fnv1a-hash.ts; NEW S102: emit-form-for.ts (§41.14 formFor expander)
compiler/src/codegen/compat/   — integration shim: parser-workarounds.js (setBPPOverrides hook for self-hosted BPP modules)
compiler/src/commands/         — CLI subcommand implementations: compile.js, dev.js, build.js, serve.js, migrate.js, init.js, promote.js, generate.js
compiler/src/types/            — AST type definitions (ast.ts, ~1,858 LOC); reachability.ts (A-2.1); auth-graph.ts (A-3.1, ~354 LOC)
compiler/src/validators/       — UVB sub-passes: post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts, ast-walk.ts, lint-try-catch.ts, lint-async-user-source.ts
compiler/src/reachability/     — Components 1-5 + entry-points.ts + gate-classifier.ts + outer-fixpoint.ts (A-2.7)
compiler/native-parser/        — bottom-up scrml-native JS lexer (M1.1..M1.4 complete, M1.5 template-mode tracking S102). 17 .scrml/.js shadow pairs + README. NOT self-host; NOT Acorn port. Replaces Acorn pre-v1.0.
compiler/runtime/              — server-side runtime JS shims; copied to dist/_scrml/ at compile time
compiler/runtime/stdlib/       — hand-written ES modules for stdlib (auth.js, crypto.js, store.js, host.js)
compiler/tests/                — 696 test files (bun test, S103 pre-commit subset); organized by category
compiler/tests/unit/           — unit tests (~484 files) covering individual pipeline passes
compiler/tests/conformance/    — conformance tests (~105 files); NEW S102: conf-COMPOUND-STATE-DECL-AUTOLIFT.test.js + conf-form-for-canonical.test.js
compiler/tests/integration/    — integration tests (~52 files)
compiler/tests/parser-conformance/ — parser conformance infrastructure: bench corpus, parsers.js, tier-diff.js
compiler/tests/browser/        — browser-environment tests (11 files, happy-dom)
compiler/tests/lsp/            — LSP server protocol tests (10 files)
compiler/tests/self-host/      — compiler self-host tests (4 files); ast.test.js updated S102 (strip hasResetExpr + _p3aExport fields)
compiler/tests/commands/       — CLI command tests (6 files)
compiler/tests/fixtures/       — shared test fixtures
compiler/tests/helpers/        — test utilities (expr.ts, extract-user-fns.js)
compiler/self-host/            — self-hosted compiler; dist/ artifacts gitignored (built locally)
compiler/self-host/cg-parts/   — code-generation partials for self-host compiler
lsp/                           — LSP server (hover, diagnostics, completion, workspace management)
stdlib/                        — scrml standard library source .scrml files (auth, crypto, data, format, fs, http, etc.)
stdlib/auth/templates/         — adopter-owned login template (login.scrml, emitted by `scrml generate auth`)
samples/                       — sample .scrml programs; samples/compilation-tests/ has ~311 .scrml fixtures
scripts/                       — build, test, and maintenance scripts (shell + .ts); scripts/git-hooks/ pre-commit + pre-push hooks
benchmarks/                    — performance benchmarks; benchmarks/perf-baseline.json (PGO P1.4 baseline capture, S102)
docs/                          — project documentation: articles, audits, changelog, changes dirs, curation, pinned-discussions
docs/changes/                  — active dispatch directories; 50+ entries total; NEW S102: pgo-scoping/, pgo-phase-2-scoping/, pgo-phase-3-scoping/, formFor-scoping/, formFor-impl/, runtime-perf-scoping/
docs/audits/                   — audit snapshots; articles-currency-table, wave-3-7-corpus-ouroboros, etc.
editors/                       — editor integrations (VSCode extension, neovim)
examples/                      — standalone scrml usage examples
e2e/                           — Playwright e2e test suite (3-browser)
handOffs/                      — historical hand-offs (read-only; current hand-off at hand-off.md)

## Notable New Additions (S102-S103, since S101 baseline)

**compiler/src/codegen/emit-form-for.ts (NEW S102 — §41.14 formFor):**
- Exports: `expandFormFor(expansion: FormForExpansion, ctx): ASTNode[]`
- Exports interfaces: `FormForStructLike`, `FieldInfo`, `FormForValidator`, `FormForExpansion`
- Source-level AST expansion; produces compound state-decl (Variant C, §6.3.2) + `<form>` markup tree

**compiler/src/type-system.ts §41.14 pass (updated S102):**
- formFor recognition + import tracking (formForLocals Set)
- validateFormForNode() — 8 E-FORMFOR-* codes; calls expandFormFor() on success
- Splices expanded AST nodes in-place replacing original `<formFor>` node

**compiler/src/codegen/emit-client.ts (updated S102 — PGO P3.A + P3.B + P3.B-followup):**
- P3.A: single alternation regex replaces per-name regex loop (~−44% pipeline alone)
- P3.B: fused iterative ExprNode probe with structural skip; assembleRuntime deferred + placeholder splice
- P3.B-followup: O(1) `FileAST.hasResetExpr` gate replaces per-node descent

**compiler/src/codegen/rewrite.ts (updated S103 — paren-form `is not`/`is some` fix):**
- `_rewriteParenthesizedIsOp()` — handles `(expr) is not`, `(expr) is some`, `(expr) is not not` without tmpvar interposition
- Prior `(_scrml_tmp_N = (expr))` pattern removed — undeclared tmpvar threw ReferenceError in ES-module strict mode

**compiler/src/dependency-graph.ts (updated S102 — PGO P3.C):**
- P3.C owner-stack: AST-walk-derived owner-stack Map replaces per-call O(n) findOwningRenderDGNode scan
- 99.7% reduction on findOwningRenderDGNode hotspot

**compiler/src/ast-builder.js (updated S102 — PGO P3.B-followup + formFor tokenizer):**
- `detectResetExprPresence(nodes)`: single-pass DFS with first-hit sentinel; caches boolean to `FileAST.hasResetExpr`
- `liftBareDeclarations`: `_p3aSynthCounter` + `_p3aChannelExport`/`_p3aIsExport`/`_p3aExportName` fields

**compiler/src/tokenizer.ts (updated S102 — formFor pick=/omit= array-literal):**
- Recognizes `omit=["c"]` / `pick=["a","b"]` array-literal form normative for §41.14.5

**compiler/src/html-elements.js (updated S102 — formFor element registration):**
- `<formFor>` element spec: `for=` (required struct-type ident), `onsubmit=`, `as=`, `pick=`, `omit=`, `partial=`, `error-strategy=`; error codes noted in comments

**compiler/src/attribute-registry.js (updated S102 — formFor attribute registration):**
- formFor attribute surface registered (pick=, omit=, partial=, error-strategy=, as=)

**scripts/ new files (S102):**
- scripts/benchmark-perf-baseline.ts — per-stage baseline capture (PGO P1.4); writes benchmarks/perf-baseline.json
- scripts/perf-regression-check.ts — reads baseline, re-runs harness, diffs per stage; exit 1 on regression
- scripts/extract-readme-scrml.js — compile-gate for `scrml` fenced blocks in README.md; runs on release-tag push via pre-push hook
- scripts/git-hooks/pre-push — full test suite + gauntlet check + README gate on `refs/tags/v*` push

**benchmarks/ (updated S102):**
- benchmarks/perf-baseline.json — versioned baseline JSON written by benchmark-perf-baseline.ts (PGO P1.4 tooling)

**Test additions (S102-S103):**
- compiler/tests/unit/form-for.test.js — §41.14 E-FORMFOR-* error code tests (+58 tests)
- compiler/tests/unit/form-for-expander.test.js — expandFormFor() unit tests
- compiler/tests/conformance/conf-form-for-canonical.test.js — end-to-end formFor compile conformance
- compiler/tests/conformance/conf-COMPOUND-STATE-DECL-AUTOLIFT.test.js — AUTOLIFT conformance
- compiler/tests/unit/bare-variant-sequential-writes-bug2.test.js — regression guard
- compiler/tests/unit/html-elements.test.js — updated for formFor element
- compiler/tests/unit/p3-follow-no-isComponent-routing.test.js — PGO P3.B-followup regression
- compiler/tests/unit/type-system.test.js — updated for formFor validation pass
- compiler/tests/unit/not-keyword.test.js — updated §42.2.4 Phase A paren-form tests (S103)
- compiler/tests/self-host/ast.test.js — updated: strip hasResetExpr + _p3aExport fields for parity

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/self-host/, compiler/self-host/dist/,
build/, .git/, .jj/, samples/compilation-tests/dist/, handOffs/, stdlib/*/dist/

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #s103 #v0.3.3 #formfor #emit-form-for #native-parser #m1-4 #m1-5 #m1-ladder-complete #raw-content #typography #approach-a #route-splitter #fnv1a-hash #generate-auth #pgo-phase-3 #hasResetExpr #paren-form-fix #perf-baseline #pre-push

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [dependencies.map.md](./dependencies.map.md)
- [build.map.md](./build.map.md)
