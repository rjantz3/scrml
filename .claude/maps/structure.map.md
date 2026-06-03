# structure.map.md
# project: scrmlts
# updated: 2026-06-03T21:31:18Z  commit: 97fe2199

## Entry Points
compiler/bin/scrml.js — CLI binary registered as `scrml`; thin Bun launcher
compiler/src/cli.js — subcommand router: compile / dev / build / migrate / promote / --help / --version; documents `--emit-engine-graph` flag (S149)
compiler/src/index.js — legacy thin wrapper; delegates pipeline to api.js; kept for backward compat
compiler/src/api.js — public compiler API: compileScrml(), scanDirectory(), bundleStdlibForRun(); plumbs engineGraphJson lazy getter into compile result (S149); `scandir` skip-dirs updated (S156); Bug 70 (S157): E-CODEGEN-INVALID-JS gate suppressed when compilation already has a prior fatal error (redundant-CODEGEN-on-bad-source false-alarm class)
compiler/src/codegen/index.ts — codegen subsystem entry; re-exports CgInput/CgOutput/runCG; imports srcmap-provenance, build-source-map, source-map (S149-S150)

## Directory Ownership

compiler/  — Bun workspace; the entire compiler toolchain plus tests
compiler/src/  — compiler pipeline source (33 .js + 107+ .ts files): block-splitter, ast-builder, tokenizer, type-system, auth-graph, dependency-graph, engine-graph (S149), component-expander (CE stage), engine-statechild-parser (custom raw-text engine-arm parser), runtime-template (client runtime JS source), etc.
compiler/src/codegen/  — 60+ emit-*.ts modules; errors.ts (CGError class + code catalog); ir.ts (IR shapes); emit-error-boundary.ts (+320L §19.6); emit-client.ts (_scrml_modules cross-file registry S152 #6; detectRuntimeChunks descends into engine bodyChildren + each-block bodyChildren, S153); emit-each.ts (Tier-1 `<each>` render fns + dep-first read + `_scrml_each_renderers` registration + Bug 62 engine-ctx threading, S153-S156; Bug 64/R28-1c S158: `EachReconcileCtx` stack + `maybeWrapEachPerItemEffect` + `pushEachReconcileCtx`/`popEachReconcileCtx`/`currentEachReconcileCtx` for live-keyed per-item TEXT/class: bindings); emit-lift.js (Tier-0 `${for…lift}`; Bug 65 S157 engine-ctx threading via `buildLiftEngineCtx`/`buildLiftEngineCtxFromExtras`/`tryLowerLiftEngineHandler` + `pushLiftReconcileCtx`/`popLiftReconcileCtx` per Bug 64; Bug 72 S158 `tryEmitNestedLiftEach` routes nested `<each>` through shared emit-each machinery); emit-engine.ts (engine substrate codegen; S155 message-arm dispatch table `emitEngineMessageArmTable`; S156 Bug 62 `collectEnginesWithMessageArms` + `collectEngineMessageVariants`); emit-match.ts (block-form match arms re-parsed via splitBlocks+buildAST for each-bearing arms, S153); emit-variant-guard.ts (engine/match arm-swap dispatcher; calls `_scrml_remount_each`, S153); build-source-map.ts + source-map.ts + srcmap-provenance.ts (source-map provenance subsystem, S149-S150); emit-html.ts (Bug 60 S157: `enclosingCompoundStack` + `lookupQualifiedStateCell` fallback for render-by-tag inside nested compound wrappers)
compiler/src/codegen/compat/  — compatibility shims for legacy pipeline shapes
compiler/src/commands/  — CLI subcommand implementations: build.js compile.js dev.js (per-file watcher rewrite, S152) generate.js init.js migrate.js promote.js serve.js
compiler/src/types/  — pure TypeScript declarations: ast.ts (1983L+ AST node shapes; S154 `acceptsType?` on EngineDeclNode), reachability.ts
compiler/src/reachability/  — reachability sub-passes (5 component passes, entry-points, gate-classifier, outer-fixpoint)
compiler/src/validators/  — attribute validation and lint passes: ast-walk.ts, attribute-allowlist.ts, attribute-interpolation.ts, lint-async-user-source.ts, lint-try-catch.ts, post-ce-invariant.ts
compiler/src/native-parser-canary/  — canary harness for native-parser pipeline parity checks
compiler/src/native-walker/  — walker utilities for native-parser output traversal; engine-statechild-walker.ts updated S154 to expose `messageArms` array on state-child walk results
compiler/native-parser/  — bootstrap native parser (.js + .scrml paired files); replaces block-splitter+ast-builder at M5-swap. NOTE (S153 hard M5-swap precondition): does NOT promote `<each>`/`<match>` to structural each-block/match-block nodes (leaves them as generic `markup tag="each"`); two S153 fixes route around it via legacy BS+TAB
compiler/tests/  — 869+ .test.js files total across all categories
compiler/tests/unit/  — unit tests covering individual compiler passes; +11 S157-S158 files (each-in-tier0-lift-bug72, per-item-live-keyed-effect-bug64, reconcile-list-same-keys-fast-path, render-by-tag-nested-compound-bug60, each-sigil-outside-each-bug70, derived-const-match-exhaustiveness-bug71, return-match-exhaustiveness-bug67, schemafor-positional-payload-enum-bug68, lift-engine-advance-bug65, markup-attr-advance-typecheck-bug63 + prior S154-S156 files)
compiler/tests/integration/  — full compile-to-output verification tests
compiler/tests/browser/  — browser runtime tests via happy-dom (31 files; +4 S157-S158: each-per-item-reactivity-bug64, each-in-tier0-lift-bug72, render-by-tag-nested-compound-bug60, lift-engine-advance-bug65)
compiler/tests/conformance/  — conformance tests for E-/W-/I- code surface; +1 S155: conf-engine-message-dispatch-s155.test.js
compiler/tests/parser-conformance*.test.js  — 10 native-parser parity test files at tests/ root; parser-conformance-within-node-allowlist.json updated S156
compiler/tests/lsp/  — LSP protocol tests (completions, hover, code-actions, diagnostics, workspace)
compiler/tests/helpers/  — shared test utilities and compile harnesses
compiler/tests/fixtures/  — shared fixtures and multi-file app stubs; +1 S155: engine-message-dispatch-s6.scrml
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
docs/changes/  — per-dispatch progress.md + BRIEF.md archives (~103+ change directories; +9 S154-S156 dispatch dirs; +4 S157-S158 dispatch dirs)
docs/heads-up/  — design-ratification decision logs (spec-consolidation, iteration-design, lifecycle-annotation, const-deep-freeze)
docs/audits/  — historical audit artifacts and findings trackers
docs/articles/  — dev.to articles and outreach content
docs/website-viewer/  — C1 self-demo scrml app (viewer shell + real provenance, S151); app.scrml + pages/ + components/ + data/
scripts/  — maintenance scripts: regen-spec-index.ts, compile-test-samples.sh, git-hooks/
editors/  — editor extension stubs (VS Code etc.)
scratch/  — throwaway working files

## Key S154-S158 Source Changes (since watermark c665714c)

### S154 — #14 event-payload-transition (parser batch 1: engine-statechild-parser)
- compiler/src/engine-statechild-parser.ts (2418L) — `accepts=MsgType` attribute recognized on `<engine>` opener; per-state message-arm lexer (`parseMessageArms()`) recognizes `| .Variant(bindings) :> body` form; produces `MessageArmEntry[]` array on each state-child result; `renderBodyStart` offset accounts for the message-arm prefix. Engine-decls with message arms wired into typer batch 2 via `EngineStateChildEntry.messageArms`.
- compiler/src/native-walker/engine-statechild-walker.ts — `messageArms` field exposed on state-child walk results to give the native-walker parity with the live-pipeline parser.
- compiler/src/types/ast.ts — `EngineDeclNode.acceptsType?: string | null` field added (§51.0.S.2.2); records raw identifier from `accepts=MsgType` opener attribute verbatim for typer resolution.

### S155 — #14 event-payload-transition (typer batch 2 + codegen batch 3)
- compiler/src/symbol-table.ts (11280L) — SYM PASS 11 resolves `acceptsType` against `fileAst.typeDecls`; fires `E-ENGINE-ACCEPTS-NOT-ENUM` when the type is absent or non-`:enum`; PASS 20 block-form `<match>` exhaustiveness now carries `E-MATCH-SUBSET-DEAD-ARM`; per-state message-arm exhaustiveness fires `E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE` and `E-ENGINE-MSG-WITHOUT-ACCEPTS`. Exports `MessageArmEntry` interface and `EngineStateChildEntry.messageArms`.
- compiler/src/type-system.ts (17070L) — two-plane `.advance(.X)` resolution (§51.0.G.1): state-plane via `_scrml_engine_advance`, message-plane via `_scrml_engine_dispatch_message`; `parseEnumSubsetRefinement()` materializes `PredicatedType` with `subsetVariants: Set<string>` for `Role oneOf([.A,.B])` / `notIn([...])` (§53.15.1); three-zone exhaustiveness pass for enum-subset `<match>` (§18.8.1 / §18.0.1): in-subset arms, out-of-subset dead arms (→ `E-MATCH-SUBSET-DEAD-ARM`), absent arms; `E-ENGINE-MSG-UNKNOWN` fires when `.advance(.X)` targets a variant in NEITHER the state plane NOR the message plane.
- compiler/src/codegen/emit-engine.ts (4398L) — `emitEngineMessageArmTable()` (§51.0.S batch 3): emits per-engine `__scrml_engine_<varName>_arm_table` keyed by (from-state-tag, message-tag); `engineMessageArmTableName()`, `engineHasMessageArms()`, `collectEnginesWithMessageArms()`, `collectEngineMessageVariants()` exported for threading into emit-each and emit-event-wiring; `parseEnumVariantFieldsForType()` resolves payload-binding field names at codegen time.
- compiler/src/runtime-template.js (+78L at S155) — `_scrml_engine_dispatch_message(varName, msg, armTable, table, timersTable, idleEntry, internalTable, historyMap)` runtime helper (§51.0.S.2); resolves message tag + payload, dispatches to per-state arm fn, calls `_scrml_engine_advance` for the target transition, handles idle-reset on handled message.

### S156 — Bug 62 (`<each>` engine-ctx threading) + (d)-A enum-subset (4 batches)

#### Bug 62 — each-render engine-ctx threading
- compiler/src/codegen/emit-each.ts (1345L at S156) — **Bug 62 fix (the pattern-to-mirror for Bug 65)**:
  `buildEachEngineCtx(fileAST)` collects file-scope engine metadata ONCE (via `collectEnginesWithMessageArms` + `collectEngineMessageVariants` from emit-engine.ts) and threads an `EachEngineCtx` through every `renderTemplateAttrToJs` / `renderTemplateChildToJs` / `emitEachReconcileLines` call. Inside the per-item template lowering, `emitEngineHandlerBody(callText, engineCtx)` intercepts (A) `.advance(.X)` call-refs and (B) `@engine = .X` assign-refs and routes both to the correct plane (`_scrml_engine_advance` or `_scrml_engine_dispatch_message`) via `rewriteBlockBody` / `emitExprField`.
- compiler/src/codegen/emit-engine.ts — `collectEnginesWithMessageArms()` + `collectEngineMessageVariants()` exported specifically to feed `buildEachEngineCtx`; both are file-scope collectors used by emit-each + emit-event-wiring.

#### (d)-A — enum-subset refinement (§53.15.1/.2/.3 — four batches)
- compiler/src/enum-subset-refinement.ts (143L, **NEW FILE**) — shared pure recognizer for both match loci. `parseEnumSubsetAnnotation(expr, enumVariantsOf)` returns `EnumSubsetParse` (null | error | subset); enforces: no range form `.A .. .B` (§53.15.1 union-evolution hazard); no empty set; entries must be `.VariantName`; `notIn` is complemented to positive IN-SET. Dependency-free (no type-system.ts import) to allow circular-safe import by symbol-table.ts.
- compiler/src/type-system.ts — `parseEnumSubsetRefinement()` calls the shared recognizer; `makeEnumSubsetPredicatedType()` materializes a `PredicatedType` with `baseType: "enum"`, `subsetVariants: Set<string>` (already complemented for `notIn`), and a `predicate` of kind `"variant-set"`. Error markers lower to `E-CONTRACT-002` at declaration time.
- compiler/src/symbol-table.ts — PASS 20 `validateMatchBlock()` uses `parseEnumSubsetAnnotation` from the shared recognizer against its file-scope enum registry; dead arms (variant outside the subset) → `E-MATCH-SUBSET-DEAD-ARM`; same locus wired for constructor-form match (member-access) per batch 4.
- compiler/src/codegen/emit-predicates.ts (518L) — `predicateToJsExpr()` handles `kind: "variant-set"`: emits `(["A","B"].includes(valueExpr))` (string `.includes` — enum variants lower to plain strings at runtime; §53.15.2 boundary check).
- compiler/src/codegen/emit-schema-for.ts (516L) — `classifyFieldForSql()` handles `predicated` type with `subsetVariants`: emits `CHECK IN` over the subset's ordered variant names (§41.15.6 + §41.15.8a); preserves base-enum declaration order for stable DDL.

### S157 — match-exhaustiveness arc + Bug 60/63/65/67/68/70/71 (multi-bug pass)

#### Bug 65 — Tier-0 `${for…lift}` engine-ctx threading (S157)
- compiler/src/codegen/emit-lift.js (1861L at S156 → 2205L at S157) — **Bug 65 fix** (sibling of Bug 62): `buildLiftEngineCtx(fileAST)` delegates to `buildEachEngineCtx` via `require("./emit-each.ts")` to build the per-file engine ctx ONCE; `buildLiftEngineCtxFromExtras(extras)` is a thin re-pack adapter that assembles the same `EachEngineCtx` carrier shape from engine extras already threaded via emit-logic opts (avoids re-walking the AST); `tryLowerLiftEngineHandler(rawHandlerText, engineCtx)` delegates to `emitEngineHandlerBody` (emit-each.ts) — NO duplicated `.advance` lowering logic. Engine-ctx is threaded into `emitSetAttrs`, `emitCreateElementFromMarkup`, and all `emitLiftExpr` call sites. Tree-shaken when the file has no engine. `pushLiftReconcileCtx`/`popLiftReconcileCtx` wired into the `for`-loop `createFn` body for Bug 64 per-item reactivity (see S158 below for the Tier-0 side of Bug 64).
- compiler/src/codegen/emit-logic.ts (3884L) — Bug 65: `for-stmt` case in `emitLogicNode` now threads all engine extras (engineBindings, engineVarNames, enginesWithHooks, enginesWithOnTimeout, enginesWithIdleWatchdog, enginesWithInternalRules, enginesWithHistory, enginesWithMessageArms, engineMessageVariants) into `emitForStmt`; previously these were silently dropped → `_scrml_reactive_get(...).advance(...)` silent miscompile.

#### Bug 60 — render-by-tag nested compound field expansion (S157)
- compiler/src/codegen/emit-html.ts (2432L) — **Bug 60 fix**: `enclosingCompoundStack: string[]` tracks the active compound-parent namespace wrapper tag during the markup walk; when a self-closing tag `<field/>` fails a bare `lookupStateCell` but `enclosingCompoundStack` is non-empty, a fallback `lookupQualifiedStateCell(fileScope, [enclosing, tag])` resolves it as a nested field. The compound-parent block-form opener pushes onto the stack; its paired closer pops. Self-closing `<compound/>` form bypasses the push (it is a render-by-tag use, not a namespace wrapper).
- compiler/src/dependency-graph.ts (3354L) — **Bug 60 structural-read credit**: render-by-tag markup tag matches against `reactiveVarNodeIds` now credit the cell as a reader for E-DG-002 purposes, mirroring the each-block / engine-cell / match-block structural-read credits; clears the false-positive E-DG-002 class for cells consumed ONLY through render-by-tag.

#### Bug 72 — nested `<each>` inside Tier-0 `${for…lift}` (S158 fix, landed here)
- compiler/src/codegen/emit-lift.js — `tryEmitNestedLiftEach(eachMarkupNode, scopeVar, fragmentVar, engineCtx)` routes a `{kind:"markup", tag:"each"}` child through `emit-each.emitNestedEachFromMarkup`, emitting inline reconcile JS. Pre-fix: `parseLiftTag` (ast-builder.js) produces generic `markup` nodes recursively and never promotes `<each>` → the literal `<each>` DOM element was emitted and the inner `@.` sigil leaked raw → E-CODEGEN-INVALID-JS.
- compiler/src/ast-builder.js (13897L) — `_parseLiftAttrValue` bare-`@` branch: a `PUNCT "@"` token (the `<each>`-contextual `@.` sigil) is now collected as a balanced `@...` token run and returned as an `{kind:"expr"}` value, keeping the lift on the structured `{kind:"markup"}` path. Pre-fix: the `@` fell through to `return null`, forcing the whole tag to the string-fallback path which lost the structured each routing.

#### Match-exhaustiveness arc (S157) — ast-builder.js + type-system.ts
- compiler/src/ast-builder.js — Bug 71 (S157): derived `const <x> = match @cell { ... }` exhaustiveness: dual-parse hook — `collectExpr()` first (reactive emit unchanged), then `parseOneMatchAsExpr` builds a structural match-expr on the same token range as a pure typer side-field; `annotateNodes`' state-decl walker visits it for exhaustiveness (E-TYPE-020). Bug 67: `return match expr { ... }` match-as-expr hook mirroring let/const hooks. Both hooks attach `matchExpr` to the AST node for the typer's exhaustiveness pass.
- compiler/src/type-system.ts (17374L) — Bug 63: bare-variant `.advance(.V)` checking extended to markup event-handler attribute positions (`onclick=@phase.advance(.V)`); `handlerAttrToExprNode` synthesizes equivalent ExprNode for both bare call-ref and interpolation forms; routes both through `inferReactiveSiteBareVariants` → E-TYPE-063 on invalid variants / two-plane resolution for `accepts=`-bearing engines. Bug 67 (S157): `return match expr { ... }` → exhaustiveness via `checkMatchDiagnostics`. Bug 71 (S157): derived `const <x> = match @cell { ... }` → exhaustiveness check wired via dual-parse side-field. E-SYNTAX-064 (`@.` outside `<each>` body scope) upgraded from fall-through to explicit diagnostic at both the attr-walk site and the markup-attr-value walk site — suppresses the confusing E-CODEGEN-INVALID-JS downstream.

#### S157 emit-client.ts + api.js
- compiler/src/codegen/emit-client.ts (2427L) — minor Bug 64/65 binding-threading adjustments; no new exports.
- compiler/src/api.js (2456L) — Bug 70: E-CODEGEN-INVALID-JS gate (default-ON) is suppressed when compilation already has a prior fatal error (`hasPriorFatalError` check uses the same W-/I-/severity partition as the final result split); codegen-of-invalid-source is EXPECTED, not a compiler defect.

### S158 — Bug 64/R28-1c per-item content reactivity on reconcile + Bug 72 (see also S157 above)

#### Bug 64 / R28-1c — live-keyed per-item content reactivity
- compiler/src/codegen/emit-each.ts (1634L) — **Bug 64 fix (Tier-1)**:
  `EachReconcileCtx { mountVar, keyVar, iterVar }` interface; module-level `_eachReconcileCtxStack: EachReconcileCtx[]`; `pushEachReconcileCtx`/`popEachReconcileCtx`/`currentEachReconcileCtx` functions. `maybeWrapEachPerItemEffect(bodyLines, iterVarName, indent)` checks the active ctx: when the iter var matches, wraps the body in a `_scrml_effect(() => { let iterVar = _scrml_resolve_item(mount, keyVar); if (iterVar === null) return; ... })` so TEXT and class: bindings re-resolve the live item each reconcile. Called at every per-item TEXT-binding and class: binding emission site in `renderTemplateChildToJs` and `renderTemplateAttrToJs`. `pushEachReconcileCtx` is pushed in `emitEachReconcileLines` after the `_scrml_reconcile_list(...)` call; popped after the createFn body.
- compiler/src/codegen/emit-control-flow.ts (2013L) — **Bug 64 fix (Tier-0 control-flow path)**: `pushLiftReconcileCtx` called inside the `for`-loop `createFn` builder with `{ wrapperVar, keyVar: keyVar, iterVar: varName }` (key captured as `item?.id != null ? item.id : _scrml_idx`, mirroring the `_scrml_reconcile_list` keyFn); `popLiftReconcileCtx` called after the createFn body. Engine ctx threaded into all `emitConsolidatedLift` / `emitLiftExpr` / `emitIfStmtWithContainer` / `emitForStmtWithContainer` calls inside the body.
- compiler/src/runtime-template.js (3760L) — **Bug 64 runtime support**: `_scrml_reconcile_list` now builds a fresh key→item `Map` on EVERY reconcile pass (`container._scrml_item_by_key`) and calls `_scrml_trigger(container, "_scrml_items")` (skipping the very first pass) to re-fire per-item effects after the map is rebuilt. `_scrml_resolve_item(container, key)` reads `container._scrml_item_by_key`, tracks `(container, "_scrml_items")` via `_scrml_track`, and returns the live item wrapped in `_scrml_deep_reactive` (so field reads through the Proxy subscribe the per-item effect); returns `null` (canonical absence, SPEC §42.5) when the key is gone.

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/, compiler/native-parser/dist/,
compiler/self-host/dist/, stdlib/*/dist/, .git/, handOffs/,
benchmarks/todomvc-react/, benchmarks/todomvc-vue/, benchmarks/todomvc-svelte/

## Tags
#scrmlts #map #structure #compiler #cli #bun #engine-graph #source-map #each #each-in-dynamic-context #match #engine-statechild #cross-file-modules #enum-subset #message-dispatch #s154 #s155 #s156 #s157 #s158 #bug60 #bug62 #bug63 #bug64 #bug65 #bug70 #bug71 #bug72 #r28-1c #per-item-reactivity #live-keyed

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
