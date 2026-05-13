# structure.map.md
# project: scrmlts
# updated: 2026-05-12T21:42:04Z  commit: f1555b4

## Entry Points
compiler/src/cli.js            — CLI entry; routes compile/dev/build/serve/migrate/promote/init subcommands
compiler/src/api.js            — programmatic API; orchestrates full BS→TAB→NR→MOD→CE→PA→RI→TS→META→DG→CG pipeline
compiler/bin/scrml.js          — installed binary (points to cli.js via package.json `bin`)
lsp/server.js                  — Language Server Protocol server; started via `scrml lsp --stdio`
compiler/src/codegen/index.ts  — Stage 8 CG entry point; runCG() exported

## Directory Ownership

compiler/                     — workspace root; compiler/package.json declares acorn + astring deps
compiler/src/                 — all pipeline stage implementations: tokenizer, block-splitter, ast-builder, type-system, etc.
compiler/src/codegen/         — Stage 8 (CG) emitters; 30+ emit-*.ts files + IR, BindingRegistry, CompileContext, errors
compiler/src/codegen/compat/  — integration shim: parser-workarounds.js (setBPPOverrides hook for self-hosted BPP modules)
compiler/src/commands/        — CLI subcommand implementations: compile.js, dev.js, build.js, serve.js, migrate.js, init.js, promote.js
compiler/src/types/           — AST type definitions (ast.ts — single source of truth, 1,828 LOC)
compiler/src/validators/      — UVB sub-passes: post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts, ast-walk.ts
compiler/runtime/             — server-side runtime JS shims; copied to dist/_scrml/ at compile time
compiler/runtime/stdlib/      — hand-written ES modules for stdlib (auth.js, crypto.js, store.js)
compiler/tests/               — 554 test files (bun test); organized by category
compiler/tests/unit/          — unit tests (~417 files) covering individual pipeline passes
compiler/tests/integration/   — integration tests (~53 files) covering multi-stage scenarios
compiler/tests/conformance/   — conformance tests (~17 files) testing SPEC error-code compliance per §34
compiler/tests/fixtures/      — shared test fixtures (promote-match-canonical.scrml, expr.ts, extract-user-fns.js)
compiler/tests/helpers/       — test utilities (expr.ts — ExprNode construction helpers)
compiler/self-host/           — self-hosted compiler; dist/tab.js is gitignored (built locally per machine)
compiler/dist/self-host/      — self-host dist output (gitignored; rebuild via scripts/rebuild-self-host-dist.ts)
compiler/SPEC.md              — authoritative language spec (26,942 lines); use SPEC-INDEX.md for navigation
compiler/SPEC-INDEX.md        — spec section index (308 lines); read this first for navigation
compiler/PIPELINE.md          — stage pipeline contracts (2,758 lines; authoritative)
lsp/                          — LSP server (hover, diagnostics, completion, workspace management)
stdlib/                       — scrml standard library source .scrml files organized by module name (20 modules; Phase 1 canonical-form sweep S87)
samples/                      — sample .scrml programs; samples/compilation-tests/ has ~795 fixtures
scripts/                      — build, test, and maintenance scripts (shell + .ts)
scripts/git-hooks/            — pre-commit hook (source-controlled; activate via git config core.hooksPath scripts/git-hooks)
docs/                         — project documentation: articles, audits, changelog, changes, deep-dives
docs/changes/                 — active dispatch directories; ~35 subdirs post-S87 (see non-compliance.report.md for archival candidates)
docs/audits/                  — audit snapshots: hardcoded-thresholds, self-host-spec-conformance, happy-dom-perf, scope-c-findings-tracker
editors/                      — editor integrations (VSCode extension)
examples/                     — standalone scrml usage examples; 23-trucking-dispatch fully migrated to v0.3
benchmarks/                   — performance benchmarks (todomvc-react, todomvc-svelte, fullstack-react, sql-batching)
e2e/                          — Playwright e2e test suite (3-browser; fixtures/dev-server-fixture.ts + db-fixture.ts; 5 spec files)
dist/                         — gitignored top-level compiler distribution artifacts

## Notable New Files (S85–S87 / 2026-05-12)

compiler/src/validators/ast-walk.ts                          — shared read-only AST walker for UVB validators; channel placement pre-check (§38.1 Insight 30, S87)
compiler/src/codegen/emit-channel.ts                         — updated S87: channel module-file dispensation (Insight 30 Option b); E-CHANNEL-OUTSIDE-PROGRAM enforcement
compiler/src/codegen/emit-expr.ts                            — updated S87 Option A: comprehensive engine-routing across ALL expr contexts; W-ENGINE-SELF-WRITE-DETECTED lint
compiler/src/codegen/emit-server.ts                          — updated S87 Bug 3a: `_scrml_sql` declaration emission — scoped DB variable declaration hoisting
compiler/src/symbol-table.ts                                 — updated S87: PASS 12.B (W-ENGINE-SELF-WRITE-DETECTED outside-state-child) + PASS 16 (inside-state-child fire-site)
compiler/src/commands/migrate.js                             — updated S87 Wave 3.5: container-aware + scope-safe + comment-safe unwrap; 4 bug families closed; ~1,940 LOC
compiler/src/commands/promote.js                             — updated S87: Option β safety-harness port; transactional in-place rewrite + verify + restore
compiler/src/block-splitter.js                               — updated S87: `<!-- -->` HTML comment skip (§4.7 extension; S87 BS-layer comment-skip dispatch)
compiler/src/ast-builder.js                                  — updated S87: `<page>` container support + top-level decl regex extensions + W-PROGRAM-REDUNDANT-LOGIC
compiler/src/dependency-graph.ts                             — updated S87 Bug 4.5: call-ref args graph tracking
compiler/src/codegen/reactive-deps.ts                        — updated S87 Bug 1.5: engine-var markup-binding fix
compiler/src/codegen/emit-control-flow.ts                    — updated S87: match-arm bundle Bug 1.6+1.7; inline-arm engine-write routing
compiler/src/codegen/emit-lift.js                            — updated S87 Bug 6: structured-markup path wired to emitForStmtWithContainer; silent data-loss closure
compiler/src/codegen/emit-event-wiring.ts                    — updated S87 S86: event wiring fixes
compiler/src/codegen/emit-logic.ts                           — updated S87: Bug 1.5 enginesWithHistory forward fixes
compiler/tests/unit/engine-self-write-option-d.test.js       — Option (d) engine self-write synthesis (+14 tests, S87)
compiler/tests/unit/emit-expr-engine-routing-option-a.test.js — emit-expr comprehensive engine-routing (+9 tests, S87)
compiler/tests/unit/emit-server-sql-emission.test.js         — Bug 3a SQL emission + real integration test (+7 tests, S87)
compiler/tests/unit/method-chain-callback-emission.test.js   — Bug 5 method-chain callback preservation (+7 tests, S87)
compiler/tests/unit/bs-comment-skip.test.js                  — BS comment-skip + call-ref-args + engine-var markup (+28 tests, S87)
compiler/tests/unit/migrate-program-shape-wave-3.5-bundle.test.js — Wave 3.5 migrate bundle (+17 tests, S87)
compiler/tests/unit/stdlib-canonical-form-cleanup.test.js    — stdlib Phase 1 canonical form guard (+28 tests, S87)
compiler/tests/unit/match-arm-codegen-bundle-bug-1.6-1.7.test.js — match-arm bundle regression guards, S87
compiler/tests/unit/lift-li-text-template.test.js            — Bug 6 lift codegen closure + LIFT-1..5 broken-output anchors, S87
compiler/tests/unit/todomvc-fixture-edit-mode.test.js        — TodoMVC Bug 5 anchors + LIFT repro anchors (+7 tests, S87)
compiler/tests/unit/promote-safety-harness.test.js           — promote.js Option β safety-harness (+7 tests, S87)
e2e/tests/todomvc.spec.ts                                    — Playwright e2e TodoMVC spec (Chromium+Firefox+WebKit), S87
e2e/tests/14-mario.spec.ts                                   — Playwright e2e 14-mario spec (AC delta 1/8→8/8 after Bug 1+1.6+1.7, S87)
docs/audits/happy-dom-perf-regression-s87-2026-05-12.md      — happy-dom perf-regression analysis; NOT a v0.3.0 blocker

## Notable New Files (S78–S84 / 2026-05-10 to 2026-05-11)
compiler/src/codegen/emit-variant-guard.ts  — Phase A10 variant-guarded render helper (830 LOC); emitVariantGuardedRender()
compiler/src/engine-statechild-parser.ts    — parses engine state-child body into walkable AST (1,341 LOC)
scripts/rebuild-tab-dist.ts                 — omnibus TAB dist regenerator
scripts/rebuild-self-host-dist.ts           — omnibus self-host dist regenerator (gated: exits 1 on non-warning errors, S81)
scripts/regen-spec-index.ts                 — TS rewrite of SPEC-INDEX regen (S81; idempotent)
scripts/git-hooks/pre-commit                — per-machine pre-commit test gate (S78 install)

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/self-host/, compiler/self-host/dist/,
build/, .git/, .jj/, samples/compilation-tests/dist/

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #phase-a10 #s87 #v0.3 #lift-bugs-surfaced #insight-30

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [dependencies.map.md](./dependencies.map.md)
- [build.map.md](./build.map.md)
