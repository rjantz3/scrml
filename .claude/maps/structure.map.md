# structure.map.md
# project: scrmlts
# updated: 2026-05-21T15:00:00Z  commit: 67a17dc5

## Entry Points
compiler/bin/scrml.js — CLI executable shim; re-exports src/cli.js so `bun run scrml` / `npx scrml` / direct invocation all work.
compiler/src/cli.js — subcommand router; dispatches compile / dev / build / migrate / promote / generate / init / serve; falls through to compile when arg 0 is a .scrml file or directory.
compiler/src/api.js — programmatic compiler API; `compileScrml(options)` runs the full BS→TAB→PRECG→…→CG pipeline; the seam the M5 native-parser swap targets.
lsp/server.js — Language Server Protocol entry; `bun run lsp`.
docs/build.ts — docs-site builder; `bun run docs:build`.

## Directory Ownership
compiler/src/                  — JS+TS compiler pipeline stages (BS, TAB, CE, PA, RI, MC, TS, META, DG, BP, AG, RS, CG) plus lints and validators.
compiler/src/codegen/          — Stage 8 code generation; ~55 emit-* modules + index.ts (runCG), route-splitter, IR, source-map.
compiler/src/codegen/compat/   — parser-workaround shims (BPP overrides via parser-workarounds.js).
compiler/src/commands/         — CLI subcommand implementations (compile.js, dev.js, build.js, migrate.js, promote.js, generate.js, init.js, serve.js).
compiler/src/reachability/     — Stage 7.6 Reachability Solver components (component-1..5, entry-points, gate-classifier, outer-fixpoint).
compiler/src/types/            — shared TypeScript type declarations (ast.ts, auth-graph.ts, reachability.ts).
compiler/src/validators/       — post-CE / lint validators (attribute-allowlist, attribute-interpolation, post-ce-invariant, lint-try-catch, lint-async-user-source, ast-walk).
compiler/native-parser/        — the scrml-native composed-engines front-end (lexer M1 complete; expr/stmt/markup parsers in flight); .scrml canonical sources + 1:1 .js shadow files; M5 swap target behind `--parser=scrml-native`.
compiler/native-parser/dist/   — compiled native-parser artifacts (client.js + html); generated.
compiler/self-host/            — from-scratch scrml self-host compiler sources (.scrml) + JS bridge; separate post-v1.0 effort.
compiler/runtime/              — hand-written ES-module runtime shims; runtime/stdlib/*.js bundled into emitted output as _scrml/*.js; idempotency.js.
compiler/tests/                — 738 test files: unit, integration, conformance, parser-conformance, browser, commands, lsp, self-host, fixtures, helpers.
compiler/bin/                  — CLI executable shim.
compiler/dist/                 — compiled compiler artifacts; generated.
stdlib/                        — scrml standard library .scrml sources (auth, crypto, data, host, store, etc.).
lsp/                           — Language Server Protocol implementation.
editors/                       — editor integrations / syntax files.
examples/                      — 27 numbered example .scrml apps + multifile dirs (22-multifile, 23-trucking-dispatch).
samples/                       — ad-hoc sample apps + gauntlet repro sets; samples/compilation-tests/ holds 318 test-case dirs.
benchmarks/                    — perf + LLM-efficiency + framework-comparison benchmarks.
e2e/                           — Playwright end-to-end tests + configs.
docs/                          — articles, audits, changes (166 BRIEF/SCOPING/progress files), website, tutorial, PA-SCRML-PRIMER.
scripts/                       — build/maintenance scripts (compile-test-samples, regen-spec-index, rebuild-*-dist, git-hooks).
handOffs/                      — historical session hand-off docs (out of scope).

## Compiler Spec / Pipeline References
compiler/SPEC.md         — normative scrml language spec (~1.68 MB, 57 sections).
compiler/SPEC-INDEX.md   — navigation map into SPEC.md (~288 lines of section anchors).
compiler/PIPELINE.md     — pipeline-stage reference (~190 KB).

## Ignored / Generated Paths
node_modules, dist, compiler/dist, compiler/native-parser/dist, build, target, .git, .jj, .claude, vendor, *.db (SQLite test DBs), examples/dist, samples/dist

## Monorepo Note
package.json declares a Bun workspace `["compiler"]`. compiler/package.json is the
sub-package manifest (acorn + astring). Single map set covers the whole repo.

## Tags
#scrmlts #map #structure #compiler #native-parser #pipeline

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [dependencies.map.md](./dependencies.map.md)
