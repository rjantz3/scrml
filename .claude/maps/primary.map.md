# primary.map.md
# project: scrmlts
# updated: 2026-05-24T00:00:00Z  commit: dc073b94

## Project Fingerprint

Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3200 git-tracked files
Watermark:  HEAD dc073b94 (2026-05-24) — package.json v0.6.0 — S125 close (MCP-V0.A descriptor extractor + MCP-V0.B runtime helpers + M6.5.b.1 match-arm + M6.5.b.2 structural-decl PARTIAL)

## Map Index

| Map | Status | Contents |
|---|---|---|
| structure.map.md | present | directory layout, entry points, native-parser, stdlib, codegen/SYM/native-walker + MCP-V0.A/B module detail |
| dependencies.map.md | present | 2 root + 2 compiler runtime deps, internal module graph (incl. mcp-descriptors edge), stdlib shim layout (19 incl. mcp) |
| schema.map.md | present | FileAST / ASTNode / native StateDecl / MCP descriptor shapes (Engine/Form/Channel/ServerFn) / SYM types / runtime-chunks |
| config.map.md | present | 2 env vars, compiler option flags |
| build.map.md | present | bun scripts, CLI subcommands, git hooks |
| error.map.md | present | 11 stage classes, §34.1 81-code catalog, W-STDLIB-*, V-kill/Unit-CC codes, MCP shim plain-Error guards |
| test.map.md | present | bun test, 761 test files, MCP-V0.B + M6.5.b.1/b.2 + within-node + regression gates |
| domain.map.md | present | 25-stage pipeline + MCP sidecar emission stage, M5 swap seam, M6 Wave 1 + M6.5.b.1/b.2, native-walker pattern, MCP V0 impl status |
| api.map.md | absent | no HTTP API surface (compiler, not a server) |
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
| types / AST shapes / native StateDecl / MCP descriptor shapes | schema.map.md |
| pipeline stages / native parser / M5/M6 / native-walker / MCP sidecar stage | domain.map.md |
| native-parser layout / assembler / stdlib shim layout / mcp-descriptors + mcp.js module detail | structure.map.md |
| compiler option flags / env vars | config.map.md |
| build commands / CLI / git hooks | build.map.md |
| test layout / parser-conformance / canary / MCP runtime-helper tests | test.map.md |
| external packages / module graph / shim catalog | dependencies.map.md |
| diagnostic classes / error codes / W-STDLIB-* / V-kill / MCP shim errors | error.map.md |

## Task-Shape Routing (agents — read this section first)

**MCP descriptor-extractor work** (mcp-descriptors.ts: engines/forms/channels/serverfns extraction, sidecar shapes, api.js wiring — incl. the next MCP-V0.A-tests dispatch):
1. `structure.map.md` (Key New Module — MCP-V0.A Descriptor Extractor)
2. `schema.map.md` (MCP Descriptor Shapes section — the emitted JSON contracts + the cellKey/compoundKeys gap)
3. `test.map.md` (S125 NEW Test Files — mcp-runtime-helpers pattern + the MCP-V0.A-tests gap-to-close note)
4. `domain.map.md` (MCP V0 — Implementation Status + MCP sidecar emission stage)

**MCP runtime-helper work** (mcp.js: install/loadSidecars/getCurrentVariant/getFormStatus/getChannelState):
1. `structure.map.md` (Key New Module — MCP-V0.B Runtime Shim)
2. `test.map.md` (mcp-runtime-helpers.test.js pattern — install/tmp-dir/_resetForTests)
3. `schema.map.md` (sidecar shapes the helpers READ — note shim reads fields extractor may not emit yet)
4. `error.map.md` (MCP V0 Runtime-Shim Errors — plain-Error guards)

**Native-parser bug fix** (gap-ledger residual, dual-pipeline canary, within-node parity, match-arm, structural-decl, FileAST synthesis):
1. `structure.map.md` (Native-Parser Layout section)
2. `schema.map.md` — FileAST + native StateDecl shape + native catalogs + bridge layer
3. `domain.map.md` (M5 swap section + M6 Wave 1 incl. M6.5.b.1/b.2)
4. `test.map.md` — parser-conformance + within-node + m65-b2 structural-decl tests

**M6 consumer migration** (legacy `splitBlocks`/`buildAST`/`parseEngineStateChildren` call-sites → native):
1. `domain.map.md` (M6 Wave 1 status + Aggregates table + native-walker pattern)
2. `structure.map.md` (Native-Parser Layout — BRIDGE + Native Walker)
3. `schema.map.md` — FileAST + EngineStateChildEntry the consumer touches
4. `test.map.md` — m66-b2 test + parser-conformance gates

**symbol-table.ts change** (SYM PASS modifications, scope-chain, new pass):
1. `domain.map.md` (Stage 3.06 [SYM] entry + Aggregates)
2. `structure.map.md` (Key Symbol Table Modules section)
3. `schema.map.md` (EngineStateChildEntry + SYMInput/SYMResult types)
4. `test.map.md` — symbol-table.test.js integration gate

**V-kill / Unit CC change** (E-STATE-UNDECLARED / E-WRITE-NOT-IN-LOGIC-CONTEXT, exemption list, ReactiveAssignNode):
1. `error.map.md` — V-kill + Unit CC codes section
2. `domain.map.md` (Stage 3.06 [SYM] + Business Invariants)
3. `schema.map.md` (ReactiveAssignNode + LogicStatement union)
4. `test.map.md` — S123 unit test files

**Codegen change** (Stage 8 [CG], emit-* modules, rewrite.ts, runtime-chunks.ts):
1. `structure.map.md` (Key Codegen Modules section)
2. `schema.map.md` (RewriteContext, RuntimeChunkName, CHUNK_DEPENDENCIES)
3. `domain.map.md` (Stage 8 [CG] entry)

**Stdlib-shim authoring** (new scrml:NAME bundling, W-STDLIB-* surface):
1. `dependencies.map.md` (Stdlib runtime shim layout)
2. `structure.map.md` (compiler/runtime/)
3. `error.map.md` — W-STDLIB-SHIM-MISSING + W-STDLIB-COMPILER-DEFERRED

**Spec amendment** (SPEC.md §X.Y, §34 catalog row):
1. `domain.map.md` (Core Concepts + Business Invariants)
2. `error.map.md` — if the amendment touches a code family
3. `schema.map.md` — if the amendment touches a node shape

**Don't know which** (open-ended task brief):
1. Read `primary.map.md` (this file) in full
2. Self-classify via Task-Shape Routing above
3. If genuinely unclear, surface to PA before consuming further context

## Use Feedback Loop

When this map's content was load-bearing for a dispatch outcome, the agent's final report should note **"map content consulted: [list of map files]; load-bearing finding: [one sentence]"**. When not useful, report **"maps consulted but not load-bearing"** so PA can diagnose wrong-map or wrong-granularity issues. 3–5 consecutive "not load-bearing" reports on the same task shape trigger a map-design review.

## Key Facts

- `compileScrml(options)` in `compiler/src/api.js` is the pipeline orchestrator — a 25-stage chain BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG, followed by stdlib bundling + **MCP descriptor-sidecar emission** + the output write loop.
- **MCP-V0.A LANDED-PARTIAL (S125)**: `compiler/src/codegen/mcp-descriptors.ts` (~868L) `buildMcpDescriptors(tabResults)` extracts 4 read-only descriptor surfaces (engines/forms/channels/serverfns); api.js writes them as JSON sidecars to `<outputDir>/` UNCONDITIONALLY (api.js:1996-2010). Tests are the NEXT dispatch (MCP-V0.A-tests).
- **MCP-V0.B LANDED (S125)**: `compiler/runtime/stdlib/mcp.js` (~430L) ships `scrml:mcp` runtime READ helpers (install/loadSidecars/getCurrentVariant/getFormStatus/getChannelState) + `_resetForTests`/`_stateForTests`. Tested by `unit/mcp-runtime-helpers.test.js`. NOT yet in the stdlib bundling allowlist — awaits Sub-unit C/D `<program mcp>` wiring.
- **MCP V0 shape gap (known follow-on)**: the runtime shim reads `cellKey` (engines) and `compoundKeys` (forms) defensively, but the extractor does not yet EMIT those fields — shim degrades gracefully (engineName-as-key; per-field rollup). The MCP-V0.A-tests dispatch must exercise this seam. The "E-MCP-*" tokens are SCOPING labels, NOT §34 codes — the shim throws plain Errors.
- **M6.5.b.1 LANDED (S125)**: `parseMatchExpr` (parse-expr.js:2547) accepts newline / `,` / `;` as match-arm separators (newline is the canonical corpus form); `parseMatchArmPattern` (parse-expr.js:2888) handles Dot+UpperIdent. +16 unit tests in `parser-conformance-expr.test.js`.
- **M6.5.b.2 PARTIAL (S125, Option B; 6 of 8 productions)**: native `StmtKind.StateDecl` + `parseStructuralStateDecl` (parse-stmt.js:3036) parse `<ident> ...> = expr` structural state-decls with attribute-region capture (pinned/server baretokens, default/debounced/throttled named attrs, call-form validators); `translate-stmt.js:785 makeStateDeclNode` bridges to live `state-decl` (`server`→`isServer`).
- M5-swap C2 IS LANDED (S119): `--parser=scrml-native` routes the per-file TAB stage through `nativeParseFile`. Strictly opt-in; `parser` defaults to `null`.
- M6.6.b.2/b.3 LANDED (S124): SYM PASS 11 uses `compiler/src/native-walker/engine-statechild-walker.ts`; legacy `engine-statechild-parser.ts` survives as fallback for synthetic ASTs. M6.7 flag flip STOP — reverted; within-node divergences block re-attempt.
- The central data structure is `FileAST` (`compiler/src/types/ast.ts:1487`). Native catalogs (Stmt[], Expr, Block[]) are PascalCase ESTree-shaped; live FileAST uses lowercase scrml kinds — the bridge translates.
- scrml SOURCE has no exceptions, no `null`/`undefined`, and no async/await (standing rules). §34.1 catalogs 81 native-parser diagnostics (stable through S125 — M6.5.b/MCP-V0 added NO new §34/§34.1 codes).
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs unit+integration+conformance, never bypass `--no-verify` without authorization.
- SPEC.md is normative per pa.md Rule 4 (58 sections; unchanged across this delta).

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #m6-wave1 #pipeline #s125 #v-kill #unit-cc #m6-6-b2 #m6-5-b0 #m6-5-b1 #m6-5-b2 #native-walker #m6-7-stop #mcp-v0 #mcp-descriptors #mcp-runtime-helpers #stdlib-shims

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
