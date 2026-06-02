# structure.map.md
# project: scrmlts
# updated: 2026-06-02T03:40:05-06:00  commit: c665714c

## Entry Points
compiler/bin/scrml.js — CLI binary registered as `scrml`; thin Bun launcher
compiler/src/cli.js — subcommand router: compile / dev / build / migrate / promote / --help / --version; documents `--emit-engine-graph` flag (S149)
compiler/src/index.js — legacy thin wrapper; delegates pipeline to api.js; kept for backward compat
compiler/src/api.js — public compiler API: compileScrml(), scanDirectory(), bundleStdlibForRun(); plumbs engineGraphJson lazy getter into compile result (S149)
compiler/src/codegen/index.ts — codegen subsystem entry; re-exports CgInput/CgOutput/runCG; imports srcmap-provenance, build-source-map, source-map (S149-S150)

## Directory Ownership

compiler/  — Bun workspace; the entire compiler toolchain plus tests
compiler/src/  — compiler pipeline source (33 .js + 107+ .ts files): block-splitter, ast-builder, tokenizer, type-system, auth-graph, dependency-graph, engine-graph (S149), component-expander (CE stage), engine-statechild-parser (custom raw-text engine-arm parser), runtime-template (client runtime JS source), etc.
compiler/src/codegen/  — 60+ emit-*.ts modules; errors.ts (CGError class + code catalog); ir.ts (IR shapes); emit-error-boundary.ts (+320L §19.6); emit-client.ts (_scrml_modules cross-file registry S152 #6; detectRuntimeChunks descends into engine bodyChildren + each-block bodyChildren, S153); emit-each.ts (Tier-1 `<each>` render fns + dep-first read + `_scrml_each_renderers` registration, S153); emit-match.ts (block-form match arms re-parsed via splitBlocks+buildAST for each-bearing arms, S153); emit-variant-guard.ts (engine/match arm-swap dispatcher; calls `_scrml_remount_each`, S153); build-source-map.ts + source-map.ts + srcmap-provenance.ts (source-map provenance subsystem, S149-S150)
compiler/src/codegen/compat/  — compatibility shims for legacy pipeline shapes
compiler/src/commands/  — CLI subcommand implementations: build.js compile.js dev.js (per-file watcher rewrite, S152) generate.js init.js migrate.js promote.js serve.js
compiler/src/types/  — pure TypeScript declarations: ast.ts (1983L AST node shapes), reachability.ts
compiler/src/reachability/  — reachability sub-passes (5 component passes, entry-points, gate-classifier, outer-fixpoint)
compiler/src/validators/  — attribute validation and lint passes: ast-walk.ts, attribute-allowlist.ts, attribute-interpolation.ts, lint-async-user-source.ts, lint-try-catch.ts, post-ce-invariant.ts
compiler/src/native-parser-canary/  — canary harness for native-parser pipeline parity checks
compiler/src/native-walker/  — walker utilities for native-parser output traversal
compiler/native-parser/  — bootstrap native parser (.js + .scrml paired files); replaces block-splitter+ast-builder at M5-swap. NOTE (S153 hard M5-swap precondition): does NOT promote `<each>`/`<match>` to structural each-block/match-block nodes (leaves them as generic `markup tag="each"`); two S153 fixes route around it via legacy BS+TAB
compiler/tests/  — 858+ .test.js files total across all categories
compiler/tests/unit/  — unit tests (~600 files) covering individual compiler passes
compiler/tests/integration/  — full compile-to-output verification tests
compiler/tests/browser/  — browser runtime tests via happy-dom (~21 files; +3 S153 each-in-dynamic-context canaries)
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
docs/changes/  — per-dispatch progress.md + BRIEF.md archives (~94+ change directories; +4 S153 each-in-dynamic-context dispatch dirs)
docs/heads-up/  — design-ratification decision logs (spec-consolidation, iteration-design, lifecycle-annotation, const-deep-freeze)
docs/audits/  — historical audit artifacts and findings trackers
docs/articles/  — dev.to articles and outreach content
docs/website-viewer/  — C1 self-demo scrml app (viewer shell + real provenance, S151); app.scrml + pages/ + components/ + data/
scripts/  — maintenance scripts: regen-spec-index.ts, compile-test-samples.sh, git-hooks/
editors/  — editor extension stubs (VS Code etc.)
scratch/  — throwaway working files

## Key S148-S153 Source Changes (since watermark 09f74bee)

### S148 — engine on-enter opener `effect=` + standalone `given` guard `:>`
- compiler/src/codegen/emit-engine.ts — `emitEngineOpenerEffect()` + `emitEngineOpenerEffectsForFile()` (§51.0.H Form 3 boot-only opener effect); `EngineRuleForm` union extended with `"legacy-arrow"` kind; `emitEngineWriteGuard()` updated for C13 seam
- compiler/src/ast-builder.js — standalone `given` guard form (§42.2.3 presence guard) now produces `kind: "given-guard"` AST nodes at both top-level and function-body positions

### S149 — engine "what-comes-next" graph sidecar + source-map real provenance (B2)
- compiler/src/engine-graph.ts (NEW, 378L) — `buildEngineGraphJson()` / `buildEngineGraph()` / `buildEngineGraphForFile()` / `serializeEngineGraph()`; exported types: `EngineGraph`, `EngineGraphEngine`, `EngineGraphState`, `EngineGraphTransition`, `EngineGraphStateLifecycle`; written to `<base>.engine-graph.json` by compile.js under `--emit-engine-graph`
- compiler/src/api.js — imports `buildEngineGraphJson`; plumbs `engineGraphJson: () => buildEngineGraphJson(metaFiles)` lazy getter into compile result (Stage 6.4c area)
- compiler/src/commands/compile.js — `--emit-engine-graph` CLI flag; writes `<base>.engine-graph.json` sidecar when enabled
- compiler/src/codegen/srcmap-provenance.ts (246L) — `SRCMAP_MARK_TOKEN`, `srcmapMark()`, `formatSrcmapMark()`, `findSrcmapMarks()`, `stripSrcmapMarks()`; enable/disable/query provenance mode; `SrcmapMarkHit` interface
- compiler/src/codegen/build-source-map.ts (246L) — `buildSourceMap()`, `collectAuthorBindings()`, `AuthorBinding`, `BuildSourceMapResult`; uses srcmap-provenance marks to compute real per-line source mappings (kills the 0:0 stub)
- compiler/src/codegen/source-map.ts — `SourceMapBuilder`, `LineIndex`, `encodeVlq()`, `encodeVlqGroup()`, `appendSourceMappingUrl()`, `MappingKind`; honest-synthetic validation at mapping resolution
- compiler/src/codegen/context.ts — `CompileContext` extended: `outputBaseDir?: string | null` (cross-file module key derivation, S152 #6)

### S150 — source-map line-lie fix
- compiler/src/codegen/build-source-map.ts — honest-synthetic validate-at-resolution; synthetic mappings now validated against actual source lines before emission

### S151 — C4/R28-5 + R28-C2 + C1 self-demo website inc1
- compiler/src/type-system.ts — E-TYPE-001 dormancy fix for object-literal lifecycle contexts (C4)
- compiler/src/codegen/emit-channel.ts — `<channel>` inside `<program>` + SSE sleep import (R28-C2)
- docs/website-viewer/ — C1 self-demo scrml app scaffold (app.scrml, pages/, components/, data/, README.md)

### S152 — known-gaps multi-fix
- compiler/src/codegen/emit-each.ts — HIGH crash fix: `<each>` body render fn guarded against undefined `_items` at module-init when cell-init `_scrml_reactive_set` fires later; `_scrml_effect_static` subscription re-runs once cell-init fires; class:/handler/@.-value attribute wiring (Landing-2, #7)
- compiler/src/codegen/emit-client.ts — cross-file CLIENT module-loading via `_scrml_modules` registry (Approach B, §21.3); `moduleRegistryKey()` derives stable dist-relative key; `buildModuleRegistryFooter()` emits `_scrml_modules[key] = { ... }` footer on exporter; importer reads via `const { x } = _scrml_modules[key]`; `modules` chunk activated when cross-file local link detected
- compiler/src/runtime-template.js — `var _scrml_modules` idempotent global init (mirrors `_SCRML_MOUNTS` guard pattern)
- compiler/src/codegen/runtime-chunks.ts — `modules: "§21.3 cross-file module registry (chunk: 'modules')"` chunk marker added
- compiler/src/codegen/emit-control-flow.ts — inline `?{}` SQL in a conditional branch now CPS-split; coupled match-server-emit fix
- compiler/src/ast-builder.js — Shape 4 (§6.2): typed-array decl with no RHS (`<todos>: Todo[]`) defaults to `[]`; non-array typed decl with no RHS fires `E-DECL-NEEDS-INITIALIZER`
- compiler/src/commands/dev.js — per-file watcher rewrite (fs.watch per-file not recursive-dir); avoids inotify exhaustion; degrades gracefully on ENOSPC; entry-preference fix (no stale serve); `emitEngineGraph` flag threaded into arg-parse result
- compiler/src/commands/compile.js — `emitEngineGraph` parsed and threaded; engine-graph JSON write site

### S153 — `<each>`-in-dynamic-context fix sweep (every place an `<each>` lives inside a dynamic mount)
- compiler/src/codegen/emit-each.ts (1106L) — engine-gated `<each>` populate (54d54d4d, ancestor of efcd5536 — confirmed mapped now): the render fn reads `_items` (the dep) BEFORE the `if (!_mount) return;` early-return so `_scrml_effect_static`'s one-shot dep pass always records the dependency even when the mount is absent at module-init; registers itself in the `_scrml_each_renderers` registry keyed `each_${node.id}` for arm-entry remount; shared `emitEachReconcileLines()` helper (`emit-each.ts:927`) factors the reconcile-list emission so nested `<each>` can emit inline in the outer factory (e6870f25); `emitEachBodyRenderForFile()` (`emit-each.ts:990`), `collectEachBlocks()`, `emitEachMountHtml()` are the public exports
- compiler/src/codegen/emit-match.ts (948L) — `<each>` inside a block-form `<match>` arm now emits valid JS (3429b385): each-bearing arms re-parse via `splitBlocks`+`buildAST` (not nativeParseFile, which leaves a generic `markup tag="each"`); `restampEachBlockIds()` (`emit-match.ts:783`) namespaces lifted each-block ids by `matchId`+`armTag`; lifted each-blocks attach to `matchBlock.bodyChildren` so `collectEachBlocks` emits the render fn with the `@.` sigil rewrite; `__scrmlCachedArms` memoizes arms across the two emit passes; exports `emitMatchMountHtml()` (`:839`), `emitMatchBodyRenderForFile()` (`:884`)
- compiler/src/codegen/emit-variant-guard.ts (S153 caller of remount) — the shared engine/match arm-swap dispatcher; after writing an arm's innerHTML + wiring it, calls `_scrml_remount_each(_mount)` (`:918`, `:953`) so each-mounts inside a newly-mounted arm render; `emitVariantGuardedRender()` (`:696`), `emitInitialArmHtmlForMount()` (`:1095`), `filterRenderableChildren()` (`:1132`), `extractPayloadBindingsFromAttrs()` (`:1052`)
- compiler/src/codegen/emit-client.ts (2416L) — `detectRuntimeChunks` (`:260`) now descends into engine `bodyChildren` AND each-block `bodyChildren` (case `each-block` `:901`; engine bodyChildren walk `:980`) so the `reconciliation` / `effect-static` / `_scrml_remount_each` chunks are NOT tree-shaken out when an `<each>` lives only inside an engine arm (was → ReferenceError)
- compiler/src/runtime-template.js — `_scrml_each_renderers = {}` registry + `_scrml_remount_each(root)` helper (`:1467`-`:1480`): `querySelectorAll('[data-scrml-each-mount]')` walk re-invokes each registered renderer directly (not its effect wrapper → no new dep edge / no leak); idempotent across engine re-entry
- compiler/src/engine-statechild-parser.ts (2148L) — `:`-shorthand child inside an engine arm no longer breaks state-child parsing (c89c1cb1): new attr-aware `isColonShorthandOpener(bodyRaw, j, openerEnd)` (whitespace-preceded depth-0 non-string `:`; tracks string/paren/brace/bracket/`${}` so `bind:`/`on:`/`style="x:y"`/`${a?b:c}` aren't mis-detected) wired into all 3 closer-finders (`findOnTransitionCloser` `:1027`, `findEngineCloser` `:1155`, + the 3rd state-child closer-finder) — a `:`-shorthand opener has no closer so it is excluded from `lowerDepth` like void/self-close, eliminating the phantom unbalanced opener that absorbed the state-child `</>` (was → E-ENGINE-STATE-CHILD-MISSING)
- compiler/src/component-expander.ts (3767L) — `<each>` over an enclosing-scope binding in a component body (e6870f25): 3 roots — (1) `reparseSynthesizedFile` falls back to the legacy `splitBlocks`+`buildAST` path when the component body contains each/match (native parser doesn't promote them); (2) `substituteProps` now covers each-block string fields (was missed → `.name` leak); (3) tokenized-sigil collapse `@ . id` → `@.id` so the re-parsed each-block carries a clean `keyExprRaw` (`component-expander.ts:537`-`548`)

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/, compiler/native-parser/dist/,
compiler/self-host/dist/, stdlib/*/dist/, .git/, handOffs/,
benchmarks/todomvc-react/, benchmarks/todomvc-vue/, benchmarks/todomvc-svelte/

## Tags
#scrmlts #map #structure #compiler #cli #bun #engine-graph #source-map #each #each-in-dynamic-context #match #engine-statechild #cross-file-modules #s149 #s150 #s151 #s152 #s153

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
