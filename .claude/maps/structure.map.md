# structure.map.md
# project: scrmlts
# updated: 2026-05-24T00:00:00Z  commit: 3a909c1d

## Entry Points

`compiler/bin/scrml.js` — CLI executable shim; re-exports src/cli.js.
`compiler/src/cli.js` — subcommand router; dispatches compile/dev/build/migrate/promote/generate/init/serve; falls through to compile when arg 0 is a .scrml file or directory.
`compiler/src/api.js` — programmatic compiler API; `compileScrml(options)` runs the full BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG pipeline; the M5 native-parser swap seam (`--parser=scrml-native` routes per-file TAB through `nativeParseFile`). MCP-V0.A: emits four descriptor sidecars unconditionally during the output write loop (`buildMcpDescriptors(tabResults)` writes engines/forms/channels/serverfns .json). **GITI-018 (S127): `rewriteStdlibImports` (api.js:462) now rewrites ALL `scrml:` import specifiers in `--mode library` (was first-only) — `^([ \t]*)` leading-indent capture group round-trips per-import indentation.**
`compiler/native-parser/parse-file.js` — `nativeParseFile(filePath, source)` — the C1 FileAST assembler; 1037 LOC; 12 per-BlockKind synth* builders; imported by meta-eval.ts, codegen/emit-match.ts, component-expander.ts.
`lsp/server.js` — Language Server Protocol entry.
`docs/build.ts` — docs-site builder.
`compiler/runtime/stdlib/mcp.js` (~870L) — secondary runtime entry: `startMcpServer(config)` boots a long-lived stdio MCP server (MCP-V0.C). Not invoked by the compile pipeline; called by the compiler-generated `<program mcp>` boot code (Sub-unit D, PENDING).

## Directory Ownership

`compiler/src/` — JS+TS compiler pipeline stages (BS, TAB, CE, PA, RI, MC, TS, META, DG, BP, AG, RS, CG) plus lints and validators.
`compiler/src/codegen/` — Stage 8 code generation; ~55 emit-* modules + index.ts (runCG), route-splitter, IR, source-map, runtime-chunks, rewrite; `mcp-descriptors.ts` (MCP-V0.A descriptor sidecar extractor); **`code-segments.ts` (NEW S125) — shared regex/comment/string fence leaf module**.
`compiler/src/codegen/compat/` — parser-workaround shims (BPP-override compatibility layer).
`compiler/src/commands/` — CLI subcommand implementations (compile, dev, build, migrate, promote, generate, init, serve).
`compiler/src/types/` — TypeScript type declarations: `ast.ts` (all AST node shapes), `auth-graph.ts`, `reachability.ts`.
`compiler/src/reachability/` — Reachability Solver sub-components (component-1..5, entry-points, gate-classifier, outer-fixpoint).
`compiler/src/native-parser-canary/` — M6.5 within-node divergence classifier (`within-node-classifier.ts`); 7-class taxonomy for parity testing.
`compiler/src/native-walker/` — Native-pipeline AST walkers; `engine-statechild-walker.ts` (M6.6.b.2) — walks native engine block child stream → live `EngineStateChildEntry[]`, replacing legacy `parseEngineStateChildren` text-rescanner in SYM PASS 11.
`compiler/src/validators/` — Post-CE validators: attribute-allowlist, attribute-interpolation, post-ce-invariant, lint-try-catch, lint-async-user-source, ast-walk.
`compiler/native-parser/` — Self-hosted scrml native parser (`.scrml` sources + compiled `.js` outputs); M5 SWAP target; M6 Wave 1 consumer migrations active; M6.5.b.1/b.2 — match-arm newline-separator + structural-decl `<ident>` LHS. **UNCHANGED since the prior watermark.**
`compiler/runtime/` — Hand-written ES-module runtime shims; copied into emitted output as `_scrml/*.js`.
`compiler/runtime/stdlib/` — Per-module runtime shims: 19 top-level + oauth/ providers + compiler/ 13-shim family + **`mcp.js` (MCP-V0.B/C, GROWN to ~870L S127) — `scrml:mcp` runtime READ helpers + full 11-tool surface + `startMcpServer`/`shutdownMcpServer` stdio boot**.
`compiler/self-host/` — From-scratch scrml self-host compiler prototype (`.scrml` sources); separate post-v1.0 effort.
`compiler/self-host/cg-parts/` — CG sub-unit scrml sources.
`compiler/tests/unit/` — Unit tests (529 files at HEAD); `bun:test` framework.
`compiler/tests/integration/` — Integration tests (81 files).
`compiler/tests/conformance/` — Conformance tests (105 files): block-grammar suite + S32 fn-state-machine suite + tab.
`compiler/tests/browser/` — Browser runtime tests (12 files); happy-dom sandbox.
`compiler/tests/commands/` — CLI command tests (6 files).
`compiler/tests/lsp/` — LSP integration tests (10 files).
`compiler/tests/parser-conformance/` — Parser conformance canary tests; plus top-level `parser-conformance-*.test.js` files (10 at compiler/tests root) including `parser-conformance-within-node.test.js` (M6.5.b.0) and the M6.5.b.1-extended `parser-conformance-expr.test.js`.
`compiler/tests/self-host/` — Self-host compiler smoke tests (4 files).
`compiler/tests/helpers/` — Test helper utilities: `expr.ts`, `extract-user-fns.js`, **`mcp-sidecar-compile.js` (NEW S127) — `makeSidecarTmpRoot`/`cleanupSidecarTmpRoot`/`compileAndReadSidecars` for driving compileScrml + reading the emitted .json sidecars in MCP-V0.A tests**.
`compiler/tests/fixtures/` — Test fixtures: promote-match-canonical, promote-multi-file-app.
`samples/compilation-tests/` — ~318 compilation test sample directories (counted only, not enumerated).
`samples/gauntlet-r*/` — Gauntlet round samples (r11, r13–r15, r18–r19); regression anchors.
`stdlib/` — scrml stdlib module SOURCE stubs (auth, compiler, cron, crypto, data, format, fs, host, http, oauth, path, process, redis, regex, router, store, test, time) + **`mcp/index.scrml` (NEW S127) — `scrml:mcp` source stub exporting `startMcpServer`/`shutdownMcpServer`; compiler-internal, adopters opt in via `<program mcp>` not a direct import; bundled from compiler/runtime/stdlib/mcp.js**.
`examples/` — 23 canonical scrml example apps (01-hello through 23-trucking-dispatch).
`benchmarks/` — Performance benchmarks: browser, fullstack-react, fullstack-scrml, llm-efficiency, per-route-roles, sql-batching, todomvc variants.
`lsp/` — Language server (vscode-languageserver); entry at `lsp/server.js`.
`editors/neovim/` — Neovim editor plugin.
`e2e/` — Playwright end-to-end test suite.
`scripts/` — Utility scripts + git-hooks (pre-commit runs unit+integration+conformance; pre-push runs full suite).
`docs/` — PA-SCRML-PRIMER, tutorial, known-gaps, lin, changelog, changes/, audits/, articles/, website/.
`docs/changes/` — Per-change SCOPING, BRIEF, and progress tracking documents (120+ subdirs).

## Native-Parser Layout

Front-end flow: lex → parse-stmt/parse-expr → parse-markup → bridge layer → nativeParseFile → live FileAST. (UNCHANGED since prior watermark.)

| Sub-system | Files |
|---|---|
| Lexing | lex.js + lex-mode.js + 7 lex-in-* dispatchers; token.js, token-cursor.js, cursor.js |
| Statements | parse-stmt.js (~3500L; M6.5.b.2 structural-decl), ast-stmt.js (StmtKind incl. `StateDecl`), parse-ctx.js, parse-mode.js, parse-seam.js, block-context.js, body-mode.js |
| Expressions | parse-expr.js (M6.5.b.1 match-arm separator + Dot+UpperIdent pattern), ast-expr.js (40 ExprKind variants) |
| Markup | parse-markup.js, tag-frame.js (M6.6.b.1.5: attr tokenizer extensions), display-text-literal.js, parse-css-body.js, parse-sql-body.js, parse-state-body.js, parse-error-body.js, delegation-frame.js |
| Bridge | translate-stmt.js (R4 COMPLETE; M6.5.b.2 `makeStateDeclNode` StateDecl arm); translate-expr.js (A2 complete S118); collect-hoisted.js (A3; M6.6.b.1.5 updates) |
| Assembler | parse-file.js — `nativeParseFile` (1037L); 12 per-BlockKind synth* builders |
| Support | span.js, bracket-stack.js, error-recovery.js, char-classify.js |
| Docs | README.md, M5-ast-bridge-scoping.md, M5-divergence-ledger.md, M5-SWAP-residual-decomposition.md, M6.6-CONTRACT-DERIVATION.md (540L cookbook) |

## Key Module — MCP-V0.A Descriptor Extractor

`compiler/src/codegen/mcp-descriptors.ts` (~930L) — compile-time extractor producing the four read-only descriptor surfaces `scrml:mcp` v0 consumes. **S127 A↔B contract fix: FormDescriptor nests the 4 rollup keys under `compoundKeys`; EngineDescriptor emits `cellKey`. Full unit + integration test coverage landed (MCP-V0.A-tests, S127).**

| Exported fn | Output | Notes |
|---|---|---|
| `buildMcpDescriptors(tabResults)` | `McpDescriptors` (engines/forms/channels/serverFns) | top-level; one pass over per-file tabResults |
| `collectEngineDescriptors(tabResults)` | `EngineDescriptor[]` | dedupes by `varName`; skips legacy `<machine>`; derived vs primary; emits `cellKey` (S127) |
| `collectFormDescriptors(tabResults)` | `FormDescriptor[]` | walks compound state-decls; mirrors `emit-synth-surface.ts` predicate; `compoundKeys` nested (S127) |
| `collectChannelDescriptors(tabResults)` | `ChannelDescriptor[]` | walks `<channel>` markup; §38.4 auto-synced cells; channel extractor descends logic-body (S127) |
| `collectServerFnDescriptors(tabResults)` | `ServerFnDescriptor[]` | walks `function-decl` with `isServer===true`; dedupes by `file::name`; `dispatchable:false` permanent v0 marker |
| `parseEnumVariantsWithFields(raw)` | `EngineVariantDescriptor[]` | enum-body parser; mirrors `parseEnumVariantsFromRaw` + payload-field annotations |

Local mirrors (to avoid circular import into the full emit chain): `collectAllEngineDeclsFromAST`, `collectChannelNodesFromAST`, `isCompoundParent`/`isValidatableField`. Authority: `docs/changes/mcp-v0-devtools-scoping/SCOPING.md` §3 Sub-unit A.

## Key Module — MCP-V0.B/C Runtime Shim (MCP-V0.C LANDED, S127)

`compiler/runtime/stdlib/mcp.js` (~870L) — hand-written ES-module `scrml:mcp` shim. B-helpers (read) + C-surface (11 tools + stdio boot). **NOT registered in any stdlib bundling allowlist by default — bundles only when an adopter opts in via `<program mcp>` (Sub-unit D, PENDING).**

| Section | Exports |
|---|---|
| Runtime wiring (B) | `install({reactive_get, derived_get})`, `uninstall()`, `loadSidecars(outputDir, {watch})`, `stopWatchers()` |
| Read helpers (B) | `getCurrentVariant(engineName)`, `getFormStatus(formName)`, `getChannelState(channelName)` |
| Test hooks (B) | `_stateForTests()`, `_resetForTests()` |
| Tool resolvers (C) | `toolGetAppTopology`, `toolListEngines`, `toolGetEngine`, `toolListForms`, `toolGetFormStatus`, `toolListRoutes`, `toolGetRouteChunks`, `toolListServerFunctions`, `toolListChannels`, `toolGetChannelState`, `toolGetReachableServerFns` |
| Tool table (C) | `TOOL_NAMES` (the 11 LOCKED names, registration order), `buildToolSpecs(z)`, `registerMcpTools(server, z)` |
| Server boot (C) | `startMcpServer(config)` — install → loadSidecars → new McpServer + registerMcpTools → StdioServerTransport.connect; lazy `import()` of `@modelcontextprotocol/sdk` + `zod`. `shutdownMcpServer(handle)` — idempotent stop/close. |

The 11 LOCKED tool names (public API — adopter agent configs depend on these): `get_app_topology`, `list_engines`, `get_engine`, `list_forms`, `get_form_status`, `list_routes`, `get_route_chunks`, `list_server_functions`, `list_channels`, `get_channel_state`, `get_reachable_server_fns`. All read-only; `list_server_functions` + `get_reachable_server_fns` enumeration-only (`dispatchable:false`). STDIO discipline: nothing writes to stdout (JSON-RPC framing owns it); diagnostics → stderr. `loadSidecars` also reads `chunks.json` (a ChunksManifest OBJECT, not array) for the routes/topology/reachable tools.

## Key Codegen Modules (Stage 8)

`codegen/code-segments.ts` (NEW S125, ~206L) — shared regex/comment/string fence (`rewriteCodeSegments`, `regexAllowedAfter`); leaf module with NO project imports so rewrite.ts AND expression-parser.ts share one fence. `REGEX_PERMISSIVE_KEYWORDS` set drives regex-vs-division disambiguation.
`codegen/rewrite.ts` — string-rewrite helpers; `rewriteNotKeyword` now delegates to `rewriteCodeSegments` (GITI-017). 6nz-S (S127): the bare-`not`-negation rewrites use `[ \t]+`/`[ \t]*` (horizontal whitespace only, never bridge a statement boundary) + a JS-reserved-keyword exclusion lookahead so standalone `return not` no longer glues to `return !`.
`codegen/emit-expr.ts` — `emitBinary` (Bug W, S127): precedence-aware paren re-insertion (`BINARY_PRECEDENCE` / `RIGHT_ASSOCIATIVE` / `binaryOperandNeedsParens`) — re-inserts grouping parens acorn drops; CRITICAL silent-arithmetic-correctness fix.
`codegen/emit-lift.js` — GITI-019 (S127): lift-loop text-interp parenthesizes the inner expr before the `?? ""` coalesce guard (ES2020 `??`-mixed-with-`||` SyntaxError class).
`codegen/runtime-chunks.ts` — runtime chunk detection; 6nz Bug P: `CHUNK_DEPENDENCIES = { scope: ['timers','animation'] }` + `applyChunkDependencies`.
`codegen/mcp-descriptors.ts` — MCP-V0.A descriptor extractor (see Key Module above).

`compiler/src/expression-parser.ts` — `preprocessForAcorn` (expression-parser.ts:1000) routes its `not`-lowering (the GITI-017 residual half) through `rewriteCodeSegments` (S125) and applies the same 6nz-S `[ \t]+` + keyword-exclusion guards (expression-parser.ts:1131-1175) as rewrite.ts.

## Key Symbol Table Modules (Stage 3.06)

`compiler/src/symbol-table.ts` — 9730+ LOC; Stage 3.06 SYM orchestrator; 21 PASSes.
- PASS 11 (`validateEngineStateChildrenAndRules`) — M6.6.b.2 LANDED: calls `walkEngineStateChildren` from `native-walker/engine-statechild-walker.ts` when native block stream is available; legacy fallback retained.
- M6.6.b.3 LANDED: `isLegacyArrowRulesBody` + `scanForOnIdleEntries` migrated to native walker.
- V-kill: PASS 3 fires E-STATE-UNDECLARED + E-WRITE-NOT-IN-LOGIC-CONTEXT.
- Per-file exemption: `compiler/src/unit-cc-exemption-list.json`.

## M6 / MCP Status at HEAD (3a909c1d — S127)

| Milestone | Status |
|---|---|
| M6.1..M6.4a | LANDED |
| M6.5 no-op proof | PROVEN |
| M6.5.b.0 within-node canary | LANDED (Wave 2 unblocked, S124) |
| M6.5.b.1 match-arm newline-separator + Dot-UpperIdent pattern | LANDED (S125) |
| M6.5.b.2 structural-decl `<ident>` LHS | PARTIAL (S125 — Option B; 6 of 8 productions) |
| M6.6.b.1 / b.1.5 attr tokenizer | LANDED (S124) |
| M6.6.b.2 engine-statechild-walker | LANDED (S124) |
| M6.6.b.3 legacy helper migration | LANDED (S124) |
| M6.7 flag flip | STOP — flag flip REVERTED; canary closed |
| M6.6.b.4..b.6, M6.8 | PENDING |
| MCP V0 Sub-unit A (descriptor extractor) | LANDED + TESTED (S127; A↔B contract fixed) |
| MCP V0 Sub-unit B (runtime read helpers) | LANDED |
| MCP V0 Sub-unit C (11-tool surface + stdio server boot) | LANDED (S127) |
| MCP V0 Sub-unit D (`<program mcp>` opt-in wiring) | PENDING |
| MCP V0 Sub-unit E | PENDING |

## Recent Correctness Fixes at HEAD (S126/S127 codegen wave)

| ID | File | Fix |
|---|---|---|
| Bug W | codegen/emit-expr.ts | precedence-aware paren re-insertion (silent arithmetic) |
| GITI-017-residual | codegen/code-segments.ts + expression-parser.ts | second `not`-lowering site fenced |
| GITI-018 | api.js rewriteStdlibImports | library-mode rewrites ALL scrml: imports |
| GITI-019 | codegen/emit-lift.js | lift-loop interp parenthesized before `?? ""` |
| 6nz-S | expression-parser.ts + codegen/rewrite.ts | `[ \t]+` + keyword-exclusion on `not`-negation (standalone `return not` no longer glues) |

## Compiler Spec / Pipeline References

`compiler/SPEC.md` — normative scrml language spec (58 sections; §34 catalog growing).
`compiler/SPEC-INDEX.md` — navigation map into SPEC.md.
`compiler/PIPELINE.md` — pipeline-stage reference.
`docs/PA-SCRML-PRIMER.md` — adopter-side primer.

## Ignored / Generated Paths

`node_modules/`, `compiler/node_modules/`, `compiler/dist/`, `compiler/native-parser/dist/`,
`compiler/self-host/dist/`, `stdlib/*/dist/`, `samples/dist/`, `benchmarks/*/dist/`,
`.git/`, `.claude/`, `archive/`, `handOffs/`

## Monorepo Note

`package.json` declares a Bun workspace `["compiler"]`. `compiler/package.json` is the sub-package manifest (acorn + astring). Single map set covers the whole repo.

## Tags
#scrmlts #map #structure #compiler #native-parser #pipeline #m5-swap #m6-wave1 #m6-6-b2 #m6-5-b1 #m6-5-b2 #stdlib-shims #native-walker #mcp-v0 #mcp-descriptors #mcp-server #code-segments #emit-binary #giti-018 #s127

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [domain.map.md](./domain.map.md)
