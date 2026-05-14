# structure.map.md
# project: scrmlts
# updated: 2026-05-14  commit: b28f493

## Entry Points

compiler/src/cli.js            — CLI entry; routes compile/dev/build/serve/migrate/promote/init/generate subcommands
compiler/src/api.js            — programmatic API; orchestrates full BS→TAB→NR→MOD→CE→PA→RI→TS→META→DG→BP→RS→CG pipeline (includes Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED + Stage 7.6 Reachability Solver + Stage 7.55 AuthGraph)
compiler/bin/scrml.js          — installed binary (points to cli.js via package.json `bin`)
lsp/server.js                  — Language Server Protocol server; started via `scrml lsp --stdio`
compiler/src/codegen/index.ts  — Stage 8 CG entry point; runCG() exported; A-4 emitPerRouteChunks() wired

## Directory Ownership

compiler/                      — workspace root; compiler/package.json declares acorn + astring deps
compiler/src/                  — all pipeline stage implementations: tokenizer, block-splitter, ast-builder, type-system, etc.
compiler/src/codegen/          — Stage 8 (CG) emitters; 35+ emit-*.ts files + IR, BindingRegistry, CompileContext, errors; NEW S91: route-splitter.ts, atom-emitter.ts, fnv1a-hash.ts
compiler/src/codegen/compat/   — integration shim: parser-workarounds.js (setBPPOverrides hook for self-hosted BPP modules)
compiler/src/commands/         — CLI subcommand implementations: compile.js, dev.js, build.js, serve.js, migrate.js, init.js, promote.js; NEW S91: generate.js
compiler/src/types/            — AST type definitions (ast.ts, ~1,858 LOC); reachability.ts (A-2.1); auth-graph.ts (A-3.1, ~354 LOC)
compiler/src/validators/       — UVB sub-passes: post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts, ast-walk.ts, lint-try-catch.ts, lint-async-user-source.ts
compiler/src/reachability/     — Components 1-5 + entry-points.ts + gate-classifier.ts + outer-fixpoint.ts [S91 A-2.7]
compiler/runtime/              — server-side runtime JS shims; copied to dist/_scrml/ at compile time
compiler/runtime/stdlib/       — hand-written ES modules for stdlib (auth.js, crypto.js, store.js, host.js)
compiler/tests/                — 629 test files (bun test); organized by category
compiler/tests/unit/           — unit tests (~451 files) covering individual pipeline passes
compiler/tests/conformance/    — conformance tests (~102 files) testing SPEC §34 error-code compliance
compiler/tests/integration/    — integration tests (~46 files)
compiler/tests/browser/        — browser-environment tests (11 files, happy-dom)
compiler/tests/lsp/            — LSP server protocol tests (10 files)
compiler/tests/self-host/      — compiler self-host tests (4 files)
compiler/tests/commands/       — CLI command tests (5 files); NEW S91: generate-auth.test.js
compiler/tests/fixtures/       — shared test fixtures
compiler/tests/helpers/        — test utilities (expr.ts, extract-user-fns.js)
compiler/self-host/            — self-hosted compiler; dist/ artifacts gitignored (built locally)
compiler/self-host/cg-parts/   — code-generation partials for self-host compiler
lsp/                           — LSP server (hover, diagnostics, completion, workspace management)
stdlib/                        — scrml standard library source .scrml files (auth, crypto, data, format, fs, http, etc.)
stdlib/auth/templates/         — NEW S91: adopter-owned login template (login.scrml, emitted by `scrml generate auth`)
samples/                       — sample .scrml programs; samples/compilation-tests/ has ~311 .scrml fixtures
scripts/                       — build, test, and maintenance scripts (shell + .ts); scripts/git-hooks/ pre-commit hook
docs/                          — project documentation: articles, audits, changelog, changes dirs, curation, pinned-discussions
docs/changes/                  — active dispatch directories; A-4 wave: a-4-per-route-artifact-splitter-SCOPING, a-4-2..a-4-7 dispatch dirs (50+ entries total)
docs/audits/                   — audit snapshots; articles-currency-table, wave-3-7-corpus-ouroboros, etc.
editors/                       — editor integrations (VSCode extension, neovim)
examples/                      — standalone scrml usage examples
benchmarks/                    — performance benchmarks (todomvc-react, todomvc-svelte, fullstack-react, sql-batching)
e2e/                           — Playwright e2e test suite (3-browser)
handOffs/                      — historical hand-offs (read-only; current hand-off at hand-off.md)

## Notable New Files (S91 — 2026-05-14, commit b28f493)

**A-2 Reachability Solver — outer fixpoint + canonical JSON (FULLY CLOSED):**
compiler/src/reachability/outer-fixpoint.ts           — A-2.7 outer fixed-point operator + E-CLOSURE-001 fire-site (~463 LOC)
compiler/tests/unit/reachability-solver-outer-fixpoint.test.js — A-2.7 outer-fixpoint tests (29 tests)
compiler/tests/unit/reachability-record-determinism.test.js    — A-2.8 canonical determinism tests (21 tests, 10-run replay + CLI two-spawn diff)

**A-3 AuthGraph — wired + §40.9.9 case-fix (FULLY CLOSED):**
compiler/tests/unit/auth-graph-login-missing.test.ts  — W-AUTH-LOGIN-MISSING / W-AUTH-PAGE-INFERRED tests (10 tests)
compiler/tests/integration/auth-graph-spec-40-9-9-worked-example.test.js — §40.9.9 worked-example replay (13 tests)

**03-contact-book v0.2.x latent bug — CLOSED:**
compiler/src/commands/generate.js                     — `scrml generate auth` CLI subcommand (adopter scaffold)
stdlib/auth/templates/login.scrml                     — adopter-owned login template (emitted by `scrml generate auth`)
compiler/tests/commands/generate-auth.test.js         — generate-auth command tests (12 tests)

**A-4 per-route artifact splitter — FULLY CLOSED (A-4.1..A-4.7):**
compiler/src/codegen/route-splitter.ts                — per-route orchestrator: iteration scaffold + composeInitialChunk + composeTier1Chunk + composeTier2Chunk + computeChunkHash + finalizeChunkHash + emitChunkLints + routeSegmentFromEntryPointId (~1,100+ LOC)
compiler/src/codegen/atom-emitter.ts                  — per-id atom helpers: emitReactiveCellAtom + emitServerFnStubAtom + emitVendorUnitRef + emitComponentAtom + canonicalNodeIdArray + canonicalVendorUnitArray (~414 LOC)
compiler/src/codegen/fnv1a-hash.ts                    — FNV-1a 32-bit base36 shared primitive; extracted from type-encoding.ts (re-exported there for callers); SPEC §47.1.3 normative
compiler/tests/unit/codegen-route-splitter.test.js    — A-4.1/A-4.2/A-4.3 route-splitter tests (43 tests)
compiler/tests/unit/codegen-route-splitter-tier-n.test.js — A-4.5 tier-N dispatch tests (14 tests)
compiler/tests/unit/chunk-content-addressing.test.js  — A-4.6 content-addressing tests (19 tests)
compiler/tests/unit/codegen-html-augmentation.test.js — A-4.7 HTML augmentation + W-CG-CHUNK-* lints (31 tests)
compiler/tests/integration/initial-chunk-emission.test.js — A-4.2/A-4.6 initial chunk emission (20 tests)
compiler/tests/integration/tier1-idle-prefetch.test.js — A-4.3 idle-prefetch (9 tests)
compiler/tests/integration/tier2-hover-prefetch.test.js — A-4.4 hover-prefetch (21 tests)

## Notable Modified Files (S91)

compiler/src/codegen/emit-html.ts       — augmentHtmlForChunks() (~295 LOC added): `_SCRML_CHUNKS` inline manifest + `<link rel="modulepreload">` + role-detection bootstrap (localStorage > cookie > meta > `"_anonymous"`); `<a data-scrml-prefetch>` wiring for cross-route hover-prefetch
compiler/src/codegen/runtime-chunks.ts  — NEW `prefetch` chunk (tier-1 idle + tier-2 hover + tier-N dispatch); NEW `mount` chunk (_scrml_chunk_mount); NEW `vendor-ref` chunk (_scrml_vendor_require)
compiler/src/runtime-template.js        — _scrml_prefetch_tier1 + _scrml_prefetch_tier2 + _scrml_fetch_chunk + _scrml_chunk_mount + _scrml_vendor_require + _SCRML_CHUNKS + _SCRML_MOUNTS + _SCRML_VENDOR_REFS manifest scaffolds
compiler/src/codegen/index.ts           — emitPerRouteChunks wired post-emit when emitPerRoute=true; ChunkKey/ChunkOutput/ChunksManifest exported; emitPerRoute flag default false (OQ-A4-F)
compiler/src/api.js                     — AuthGraph now wired into pipeline (A-3.5); RS receives real AuthGraph; serializeReachabilityRecord from A-2.8 active; generate subcommand routing
compiler/src/reachability-solver.ts     — outer fixpoint wired (A-2.7); serializeReachabilityRecord canonical JSON (A-2.8)
compiler/SPEC.md                        — §34 + §40.9.11 catalog rows: W-CG-CHUNK-EMPTY + W-CG-CHUNK-LARGE + W-CG-CHUNK-NO-PREFETCH + W-CG-CHUNK-MISSING-ROLE + W-AUTH-LOGIN-MISSING + 6 A-3 codes; §40.9.9 case-fix; §47.5 content-addressing

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/self-host/, compiler/self-host/dist/,
build/, .git/, .jj/, samples/compilation-tests/dist/, handOffs/, stdlib/*/dist/

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #s91 #v0.3 #approach-a #approach-a2 #approach-a3 #approach-a4 #reachability #auth-graph #route-splitter #fnv1a-hash #atom-emitter #generate-auth

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [dependencies.map.md](./dependencies.map.md)
- [build.map.md](./build.map.md)
