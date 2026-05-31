# structure.map.md
# project: scrmlts
# updated: 2026-05-31T05:32:43-06:00  commit: 09f74bee

## Entry Points
compiler/bin/scrml.js — CLI binary registered as `scrml`; thin Bun launcher
compiler/src/cli.js — subcommand router: compile / dev / build / migrate / promote / --help / --version
compiler/src/index.js — legacy thin wrapper; delegates pipeline to api.js; kept for backward compat
compiler/src/api.js — public compiler API: compileScrml(), scanDirectory(), bundleStdlibForRun()
compiler/src/codegen/index.ts — codegen subsystem entry; re-exports all emit-* modules

## Directory Ownership

compiler/  — Bun workspace; the entire compiler toolchain plus tests
compiler/src/  — compiler pipeline source (33 .js + 107 .ts files): block-splitter, ast-builder, tokenizer, type-system, auth-graph, dependency-graph, etc.
compiler/src/codegen/  — 60+ emit-*.ts modules; errors.ts (CGError class + code catalog); ir.ts (IR shapes); emit-error-boundary.ts (+320L §19.6); emit-client.ts (GITI-026 SSE wiring); emit-server.ts
compiler/src/codegen/compat/  — compatibility shims for legacy pipeline shapes
compiler/src/commands/  — CLI subcommand implementations: build.js compile.js dev.js generate.js init.js migrate.js promote.js serve.js
compiler/src/types/  — pure TypeScript declarations: ast.ts (1983L AST node shapes), reachability.ts
compiler/src/reachability/  — reachability sub-passes (5 component passes, entry-points, gate-classifier, outer-fixpoint)
compiler/src/validators/  — attribute validation and lint passes: ast-walk.ts, attribute-allowlist.ts, attribute-interpolation.ts, lint-async-user-source.ts, lint-try-catch.ts, post-ce-invariant.ts
compiler/src/native-parser-canary/  — canary harness for native-parser pipeline parity checks
compiler/src/native-walker/  — walker utilities for native-parser output traversal
compiler/native-parser/  — bootstrap native parser (.js + .scrml paired files); replaces block-splitter+ast-builder at M5-swap
compiler/tests/  — 852 test files total across all categories
compiler/tests/unit/  — unit tests (~600 files) covering individual compiler passes
compiler/tests/integration/  — full compile-to-output verification tests
compiler/tests/browser/  — browser runtime tests via happy-dom (~18 files)
compiler/tests/conformance/  — conformance tests for E-/W-/I- code surface (block-grammar, s32-fn-state-machine, tab subdirs)
compiler/tests/parser-conformance*.test.js  — 10 native-parser parity test files at tests/ root
compiler/tests/lsp/  — LSP protocol tests (completions, hover, code-actions, diagnostics, workspace)
compiler/tests/helpers/  — shared test utilities and compile harnesses
compiler/tests/fixtures/  — shared fixtures and multi-file app stubs
compiler/tests/self-host/  — self-host compiler conformance tests
compiler/tests/commands/  — CLI subcommand integration tests
compiler/runtime/  — embedded client runtime JS (stdlib/idempotency.js; stdlib/ modules)
compiler/self-host/  — experimental scrml-native self-hosting compiler output (cg-parts/ + dist/)
compiler/samples/  — MCP v0 fixture sample app with routes/
stdlib/  — scrml standard library (server-side modules): auth, cron, crypto, data, format, fs, host, http, mcp, oauth, path, process, redis, regex, router, store, test, time
lsp/  — Language Server Protocol implementation (server.js, handlers.js, workspace.js, l4.js)
e2e/  — Playwright end-to-end tests (tests/, fixtures/, playwright.config.ts)
benchmarks/  — performance comparison suites (fullstack-react, fullstack-scrml, todomvc-* variants, sql-batching, llm-efficiency)
samples/  — compilation-test samples and gauntlet suites (individual files not enumerated)
docs/  — project documentation: changelog, known-gaps, tutorial, adopter guides, design-ratification logs
docs/changes/  — per-dispatch progress.md + BRIEF.md archives (~80+ change directories)
docs/heads-up/  — design-ratification decision logs (spec-consolidation, iteration-design, lifecycle-annotation, const-deep-freeze)
docs/audits/  — historical audit artifacts
docs/articles/  — dev.to articles and outreach content
scripts/  — maintenance scripts: regen-spec-index.ts, compile-test-samples.sh, git-hooks/
editors/  — editor extension stubs (VS Code etc.)
scratch/  — throwaway working files

## Key S147 Source Changes
- compiler/src/ast-builder.js — added `matchArrowGlyphAt()` helper; glyph-preservation (`armArrow` field) across all match-arm (`match-arm-inline`, `match-arm-block`) and `!{}`-handler-arm sites; `:>` is canonical arm separator; `=>` / `->` are deprecated aliases that still parse; `->` arms are now STRUCTURED (were bare-expr); `->` stays two PUNCT tokens to protect the `fn ... -> ReturnType` path
- compiler/src/commands/migrate.js — added `rewriteMatchArmArrows()` export (AST-driven, not regex); `--fix` flag added to migrate subcommand; rewrites `=>`/`->` arm separators → `:>` at recorded arm-span offsets only; safe: never touches lambda arrows or fn-return arrows
- compiler/src/dependency-graph.ts — E-DG-002 false-positive fix: credits lambda-body `@var` reads (SB1) + `<match on=@cell>` block-form headers (SB2) to `reactiveVarReaders`
- compiler/src/protect-analyzer.ts — `extractCreateTableStatements` rewritten as generic cycle-safe depth-first walk (max depth 64); finds CREATE TABLE in `body`/`?{}` under fn-decl bodies and top-level `${}` logic blocks; fixes spurious E-PA-002 (R28-4)
- compiler/src/type-system.ts — added `W-MATCH-ARROW-LEGACY` emission (info-level) in `checkMatchDiagnostics` (match-arm path) and `!{}`-handler-arm walk; shared message builder `matchArrowLegacyMessage()`

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/, compiler/native-parser/dist/,
compiler/self-host/dist/, stdlib/*/dist/, .git/, handOffs/,
benchmarks/todomvc-react/, benchmarks/todomvc-vue/, benchmarks/todomvc-svelte/

## Tags
#scrmlts #map #structure #compiler #cli #bun #match-arrow #migrate

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
