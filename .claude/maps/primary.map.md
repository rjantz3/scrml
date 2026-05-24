# primary.map.md
# project: scrmlts
# updated: 2026-05-24T00:00:00Z  commit: 3a909c1d

## Project Fingerprint

Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring + (NEW) @modelcontextprotocol/sdk
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3300 git-tracked files
Watermark:  HEAD 3a909c1d (2026-05-24) — package.json v0.6.0 — S127 (MCP-V0.A tests + A↔B contract fix; MCP-V0.C 11-tool stdio server LANDED; codegen-correctness wave: Bug W precedence printer, GITI-017/018/019, 6nz-S). Native-parser sources UNCHANGED since prior watermark.

## Map Index

| Map | Status | Contents |
|---|---|---|
| structure.map.md | present | directory layout, entry points, native-parser, stdlib, codegen (incl. code-segments + emit-binary) / SYM / native-walker + MCP-V0.A/B/C module detail |
| dependencies.map.md | present | 2 root + 2 compiler runtime deps + NEW @modelcontextprotocol/sdk, internal module graph, stdlib shim layout (20 incl. mcp) |
| schema.map.md | present | FileAST / ASTNode / native StateDecl / MCP descriptor shapes (cellKey + compoundKeys S127) / emit-binary precedence tables / code-segments fence / SYM types |
| config.map.md | present | env vars + compiler option flags (UNCHANGED this delta) |
| build.map.md | present | bun scripts, CLI subcommands, git hooks (UNCHANGED this delta) |
| error.map.md | present | 11 stage classes, §34.1 81-code catalog, S126/S127 silent-correctness fixes, MCP shim plain-Error guards + tool isError-wrap |
| test.map.md | present | bun test, 757 test files, MCP-V0.A/C suites + Bug W / GITI-019 / 6nz-S + parser-conformance gates |
| domain.map.md | present | 25-stage pipeline + MCP sidecar stage, M5 swap seam, M6 Wave 1, native-walker pattern, MCP V0 impl status (UNCHANGED this delta) |
| api.map.md | absent | no HTTP API surface (compiler, not a server). NB: the MCP stdio server is a tool surface, not an HTTP API — documented in structure.map.md |
| state.map.md | absent | no app state store (compiler) |
| events.map.md | absent | no event bus |
| auth.map.md | absent | auth is a scrml LANGUAGE feature, not app infra |
| migrations.map.md | absent | no DB migration tooling (test *.db throwaway) |
| jobs.map.md | absent | no job/queue scheduler |
| infra.map.md | absent | no Docker / CI / IaC |
| style.map.md | absent | no design-token system |
| i18n.map.md | absent | no i18n |

## File Routing

| Task | Map |
|---|---|
| types / AST shapes / native StateDecl / MCP descriptor shapes / emit-binary precedence | schema.map.md |
| pipeline stages / native parser / M5/M6 / native-walker / MCP sidecar stage | domain.map.md |
| native-parser layout / assembler / stdlib shim layout / mcp-descriptors + mcp.js / code-segments | structure.map.md |
| compiler option flags / env vars | config.map.md |
| build commands / CLI / git hooks | build.map.md |
| test layout / parser-conformance / canary / MCP test suites | test.map.md |
| external packages / module graph / shim catalog / mcp-sdk dep | dependencies.map.md |
| diagnostic classes / error codes / W-STDLIB-* / V-kill / MCP shim+tool errors / silent-correctness fixes | error.map.md |

## Task-Shape Routing (agents — read this section first)

**MCP descriptor-extractor work** (mcp-descriptors.ts: engines/forms/channels/serverfns; sidecar shapes; api.js wiring):
1. `structure.map.md` (Key Module — MCP-V0.A Descriptor Extractor)
2. `schema.map.md` (MCP Descriptor Shapes — note S127 A↔B fix: `compoundKeys` nested + `cellKey` emitted; encoding caveat)
3. `test.map.md` (S127 NEW Test Files — mcp-descriptors-* suites + `compileAndReadSidecars` helper)
4. `domain.map.md` (MCP V0 — Implementation Status)

**MCP runtime / server work** (mcp.js: install/loadSidecars/read helpers; the 11 tool resolvers; `startMcpServer`/`shutdownMcpServer` stdio boot):
1. `structure.map.md` (Key Module — MCP-V0.B/C Runtime Shim; the 11 LOCKED tool names + boot sequence)
2. `dependencies.map.md` (@modelcontextprotocol/sdk lazy-import site + zod)
3. `test.map.md` (mcp-runtime-helpers + mcp-server-tools patterns)
4. `error.map.md` (MCP shim plain-Error guards + tool isError-wrap)

**Codegen correctness / expression-emission** (emit-expr precedence, code-segments fence, rewrite.ts `not`-lowering, emit-lift coalesce, expression-parser preprocessForAcorn):
1. `structure.map.md` (Key Codegen Modules + Recent Correctness Fixes table)
2. `schema.map.md` (BinaryExpr precedence printer tables + Code-Segment Fence section)
3. `error.map.md` (Silent-Correctness Bugs CLOSED — Bug W / GITI-017/019 / 6nz-S)
4. `test.map.md` (bug-w / giti-019 / not-return-statement-glue tests)

**Stdlib-import / library-mode work** (rewriteStdlibImports, --mode library, bundleStdlibForRun):
1. `dependencies.map.md` (Internal Module Graph — rewriteStdlibImports edge + GITI-018 note)
2. `structure.map.md` (Entry Points — api.js GITI-018)
3. `test.map.md` (emit-library.test.js)
4. `error.map.md` (W-STDLIB-SHIM-MISSING / W-STDLIB-COMPILER-DEFERRED)

**Native-parser bug fix** (gap-ledger residual, dual-pipeline canary, within-node parity, match-arm, structural-decl, FileAST synthesis):
1. `structure.map.md` (Native-Parser Layout — UNCHANGED since prior watermark)
2. `schema.map.md` (FileAST + native StateDecl shape + native catalogs + bridge layer)
3. `domain.map.md` (M5 swap section + M6 Wave 1 incl. M6.5.b.1/b.2)
4. `test.map.md` (parser-conformance + within-node + m65-b2 tests)

**M6 consumer migration** (legacy `splitBlocks`/`buildAST`/`parseEngineStateChildren` → native):
1. `domain.map.md` (M6 Wave 1 status + Aggregates + native-walker pattern)
2. `structure.map.md` (Native-Parser Layout — Bridge + Native Walker)
3. `schema.map.md` (FileAST + EngineStateChildEntry)
4. `test.map.md` (m66-b2 test + parser-conformance gates)

**symbol-table.ts change** (SYM PASS modifications, scope-chain, new pass):
1. `domain.map.md` (Stage 3.06 [SYM] + Aggregates)
2. `structure.map.md` (Key Symbol Table Modules)
3. `schema.map.md` (EngineStateChildEntry + SYMInput/SYMResult)
4. `test.map.md` (symbol-table integration gate)

**V-kill / Unit CC change** (E-STATE-UNDECLARED / E-WRITE-NOT-IN-LOGIC-CONTEXT, exemption list, ReactiveAssignNode):
1. `error.map.md` (V-kill + Unit CC codes)
2. `domain.map.md` (Stage 3.06 [SYM] + Business Invariants)
3. `schema.map.md` (ReactiveAssignNode + LogicStatement union)
4. `test.map.md` (S123 unit test files)

**Spec amendment** (SPEC.md §X.Y, §34 catalog row):
1. `domain.map.md` (Core Concepts + Business Invariants)
2. `error.map.md` (if the amendment touches a code family)
3. `schema.map.md` (if the amendment touches a node shape)

**Don't know which** (open-ended task brief):
1. Read `primary.map.md` (this file) in full
2. Self-classify via Task-Shape Routing above
3. If genuinely unclear, surface to PA before consuming further context

## Use Feedback Loop

When this map's content was load-bearing for a dispatch outcome, the agent's final report should note **"map content consulted: [list of map files]; load-bearing finding: [one sentence]"**. When not useful, report **"maps consulted but not load-bearing"** so PA can diagnose wrong-map or wrong-granularity issues. 3–5 consecutive "not load-bearing" reports on the same task shape trigger a map-design review.

## Key Facts

- `compileScrml(options)` in `compiler/src/api.js` is the pipeline orchestrator — a 25-stage chain BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG, followed by stdlib bundling + MCP descriptor-sidecar emission + the output write loop.
- **MCP-V0.A LANDED + TESTED (S127)**: `codegen/mcp-descriptors.ts` extracts 4 read-only descriptor surfaces; api.js writes them as JSON sidecars unconditionally. The S127 A↔B contract fix nests the 4 form rollup keys under `FormDescriptor.compoundKeys` (was flat — flattening broke `submitted` decode) and emits `EngineDescriptor.cellKey`. Full unit (mcp-descriptors-* x5) + integration test coverage landed; the "shape gap" recorded at the prior watermark is now CLOSED.
- **MCP-V0.C LANDED (S127)**: `compiler/runtime/stdlib/mcp.js` (~870L) now ships the full 11-tool MCP surface + `startMcpServer(config)` / `shutdownMcpServer(handle)` over a `StdioServerTransport`. The 11 LOCKED tool names are a public contract (adopter agent configs depend on them): get_app_topology, list_engines, get_engine, list_forms, get_form_status, list_routes, get_route_chunks, list_server_functions, list_channels, get_channel_state, get_reachable_server_fns. All read-only; the two server-fn tools are enumeration-only (`dispatchable:false`). STDIO discipline: stdout is JSON-RPC only; diagnostics → stderr.
- **MCP SDK dep**: `@modelcontextprotocol/sdk@1.29.0` is a NEW root runtime dependency, imported LAZILY (dynamic `import()`) only inside `startMcpServer` (with `zod`); the descriptor extractor and B-helpers never touch it. The shim is NOT in the default stdlib bundling allowlist — it bundles only on `<program mcp>` opt-in (Sub-unit D, PENDING).
- **Codegen-correctness wave (S126/S127)**: silent-correctness fixes with NO diagnostic — Bug W (`emitBinary` re-inserts precedence parens acorn drops); GITI-017-residual (second `not`-lowering site fenced via shared `code-segments.ts`); GITI-018 (library-mode rewrites ALL `scrml:` imports, was first-only); GITI-019 (lift-loop interp parenthesized before `?? ""`); 6nz-S (`not`-negation uses `[ \t]+` + keyword-exclusion so `return not` no longer glues).
- `codegen/code-segments.ts` (NEW S125, leaf module, no project imports) is the single shared regex/comment/string fence — both `rewrite.ts::rewriteNotKeyword` and `expression-parser.ts::preprocessForAcorn` route their `not`-lowering through `rewriteCodeSegments`.
- M5-swap C2 IS LANDED (S119): `--parser=scrml-native` routes per-file TAB through `nativeParseFile`. Strictly opt-in; `parser` defaults to `null`. Native-parser sources are UNCHANGED across this delta.
- M6.5.b.1 LANDED (S125): match-arm newline/`,`/`;` separators + Dot+UpperIdent patterns. M6.5.b.2 PARTIAL (Option B, 6 of 8 productions): native `StmtKind.StateDecl` + bridge to live `state-decl`. M6.6.b.2/b.3 LANDED: SYM PASS 11 uses `native-walker/engine-statechild-walker.ts`. M6.7 flag flip STOP — reverted.
- The central data structure is `FileAST` (`compiler/src/types/ast.ts:1487`). Native catalogs (Stmt[], Expr, Block[]) are PascalCase ESTree-shaped; live FileAST uses lowercase scrml kinds — the bridge translates.
- scrml SOURCE has no exceptions, no `null`/`undefined`, and no async/await (standing rules). §34.1 catalogs 81 native-parser diagnostics — STABLE through S127 (the S126/S127 wave + MCP-V0 added NO new §34/§34.1 codes; all fixes are emit-time or runtime-Error).
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs unit+integration+conformance, never bypass `--no-verify` without authorization.
- SPEC.md is normative per pa.md Rule 4 (58 sections; unchanged across this delta).

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #m6-wave1 #pipeline #s127 #v-kill #unit-cc #m6-6-b2 #m6-5-b1 #m6-5-b2 #native-walker #m6-7-stop #mcp-v0 #mcp-descriptors #mcp-server #mcp-sdk #bug-w #giti-018 #giti-019 #6nz-s #code-segments #stdlib-shims

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
