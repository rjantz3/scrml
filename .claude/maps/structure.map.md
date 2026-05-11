# structure.map.md
# project: scrmlts
# updated: 2026-05-10T19:30:00Z  commit: f182f44

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
compiler/src/types/           — AST type definitions (ast.ts — single source of truth, 1,793 LOC)
compiler/src/validators/      — UVB sub-passes: post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts
compiler/runtime/             — server-side runtime JS shims; copied to dist/_scrml/ at compile time
compiler/runtime/stdlib/      — hand-written ES modules for stdlib (auth.js, crypto.js, store.js)
compiler/tests/               — 530 test files (bun test); organized by category
compiler/tests/unit/          — unit tests (~420 files) covering individual pipeline passes
compiler/tests/integration/   — integration tests (~75 files) covering multi-stage scenarios
compiler/tests/conformance/   — conformance tests (~35 files) testing SPEC error-code compliance per §34
compiler/tests/fixtures/      — shared test fixtures (promote-match-canonical.scrml, expr.ts, extract-user-fns.js)
compiler/tests/helpers/       — test utilities (expr.ts — ExprNode construction helpers)
compiler/self-host/           — self-hosted compiler; dist/tab.js is gitignored (built locally per machine)
compiler/dist/self-host/      — self-host dist output (gitignored; rebuild via scripts/rebuild-self-host-dist.ts)
compiler/SPEC.md              — authoritative language spec (~24,382 lines); use SPEC-INDEX.md for navigation
compiler/SPEC-INDEX.md        — spec section index (~288 lines); read this first for navigation
compiler/PIPELINE.md          — stage pipeline contracts v0.7.1 (authoritative)
lsp/                          — LSP server (hover, diagnostics, completion, workspace management)
stdlib/                       — scrml standard library source .scrml files organized by module name
samples/                      — sample .scrml programs; samples/compilation-tests/ has ~788 fixtures
scripts/                      — build, test, and maintenance scripts (shell + .ts)
scripts/git-hooks/            — pre-commit hook (source-controlled; activate via git config core.hooksPath scripts/git-hooks)
docs/                         — project documentation: articles, audits, changelog, changes, deep-dives
editors/                      — editor integrations (VSCode extension)
examples/                     — standalone scrml usage examples
benchmarks/                   — performance benchmarks (todomvc-react, todomvc-svelte, fullstack-react, sql-batching)
dist/                         — gitignored top-level compiler distribution artifacts

## Notable New Files (S78 / 2026-05-10)
compiler/src/codegen/emit-variant-guard.ts  — Phase A10 variant-guarded render helper (830 LOC); emitVariantGuardedRender()
compiler/src/engine-statechild-parser.ts    — parses engine state-child body into walkable AST (1,341 LOC)
scripts/rebuild-tab-dist.ts                 — omnibus TAB dist regenerator
scripts/rebuild-self-host-dist.ts           — omnibus self-host dist regenerator

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/self-host/, compiler/self-host/dist/,
build/, .git/, .jj/, samples/compilation-tests/dist/

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #phase-a10

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [dependencies.map.md](./dependencies.map.md)
- [build.map.md](./build.map.md)
