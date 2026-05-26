# primary.map.md
# project: scrmlts
# updated: 2026-05-26T00:00:00Z  commit: c2d3f7ae

## Project Fingerprint

Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring + @modelcontextprotocol/sdk (lazy)
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3300 git-tracked files
Watermark:  HEAD c2d3f7ae (2026-05-26) — package.json v0.6.0 — S130-S131. Major landings since 3a909c1d (62 commits): **Iteration `<each>` (emit-each.ts + W-EACH lints + `@.` sigil + `<empty>` + key= inference; §17.7/§3.4)**; **Lifecycle annotation `(A to B)` (E-TYPE-001 + E-TYPE-LIFECYCLE-* + `->`→`to` glyph + transition() marker; §14.3/§14.12)**; **MCP V0 series COMPLETE (Sub-units D `<program mcp>` opt-in + E e2e LANDED)**; **native-parser M6.5/M6.7 C/D-class parity** (server @var, null/undefined primary, `:>` match-arm, string-literal import, `given` guard, `-> ReturnType`); **~snapshot orphan-sigil fix (Bug 15)**; **SPEC grammar-lockdown +1795 lines**.

## Map Index

| Map | Status | Contents |
|---|---|---|
| structure.map.md | present | directory layout, entry points, native-parser, stdlib (19 top-level), codegen (incl. NEW emit-each), iteration/lifecycle/MCP-V0.D-E key modules, milestone status |
| dependencies.map.md | present | 3 root + 2 compiler runtime deps, internal module graph (NEW emit-each + W-EACH-lint edges), native-parser graph (CHANGED this delta), stdlib shim layout |
| schema.map.md | present | FileAST / ASTNode (12-member union) / synthesized each-block + match-block nodes / lifecycle registry types / MCP descriptor shapes / native catalogs |
| config.map.md | present | env vars (+ NODE_ENV MCP gate) + compiler option flags + NEW McpConfig program-config struct |
| build.map.md | present | bun scripts (unchanged), CLI subcommands (promote --each PENDING), git hooks, MCP-V0.D build behavior |
| error.map.md | present | 11 stage classes, §34.1 81-code catalog (STABLE), NEW lifecycle + W-EACH emitted codes, ~snapshot fix, MCP shim errors |
| test.map.md | present | bun test, 780 test files (545/88/105 unit/integ/conf), iteration + lifecycle + snapshot + MCP-D/E + M6.5/M6.7 D-class suites |
| domain.map.md | present | pipeline stages + iteration/lifecycle stages, M6.5/M6.7 status, iteration/lifecycle/MCP-V0 impl status, invariants |
| api.map.md | absent | no HTTP API surface (compiler). NB: the MCP stdio server is a tool surface, not HTTP — documented in structure.map.md |
| state.map.md | absent | no app state store (compiler) |
| events.map.md | absent | no event bus |
| auth.map.md | absent | auth is a scrml LANGUAGE feature, not app infra |
| migrations.map.md | absent | no DB migration tooling (test *.db throwaway) |
| jobs.map.md | absent | no job/queue scheduler |
| infra.map.md | absent | no Docker / CI / IaC (.github holds only FUNDING.yml) |
| style.map.md | absent | no design-token system |
| i18n.map.md | absent | no i18n |

## File Routing

| Task | Map |
|---|---|
| types / AST shapes / each-block + match-block nodes / lifecycle registry / MCP descriptor shapes | schema.map.md |
| pipeline stages / iteration + lifecycle stages / native parser / M6.5/M6.7 / MCP impl status | domain.map.md |
| native-parser layout / emit-each / lint-w-each / MCP-V0.D-E modules / stdlib shim layout | structure.map.md |
| compiler option flags / env vars / McpConfig program-config | config.map.md |
| build commands / CLI / promote --each status / git hooks / MCP-V0.D build behavior | build.map.md |
| test layout / iteration + lifecycle + snapshot + MCP-D/E + D-class suites / parser-conformance | test.map.md |
| external packages / module graph / shim catalog / mcp-sdk dep | dependencies.map.md |
| diagnostic classes / error codes / lifecycle + W-EACH codes / V-kill / ~snapshot fix / MCP errors | error.map.md |

## Task-Shape Routing (agents — read this section first)

**Iteration / `<each>` work** (emit-each.ts codegen, lint-w-each-*, `@.` sigil, `<empty>`, key= inference, `promote --each` CLI):
1. `structure.map.md` (Key Module — Iteration Codegen; each-block node shape + emit-each exports)
2. `domain.map.md` (Iteration — Implementation Status; Landing 1+2 LANDED, Landing 3 `promote --each` PENDING)
3. `schema.map.md` (EachBlockNode synthesized shape — NOT in ASTNode union; collectEachBlocks walk)
4. `error.map.md` (W-EACH-KEY-001 / W-EACH-PROMOTABLE emitted; E-SYNTAX-064 / E-EACH-ITER-SHAPE queued, NOT emitted)

**Lifecycle annotation work** (`(A to B)` registry, E-TYPE-001 access-before-transition, transition() marker, `->`→`to` glyph):
1. `domain.map.md` (Lifecycle Annotation — Implementation Status; Landings 1+2+2.5 LANDED)
2. `error.map.md` (E-TYPE-001 / E-TYPE-LIFECYCLE-ON-ENGINE-CELL / E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED / W-LIFECYCLE-LEGACY-ARROW — all emitted by type-system.ts)
3. `schema.map.md` (Lifecycle Annotation Types — LifecycleFieldSpec / LifecycleRegistry; findTopLevelArrow glyph detection)
4. `structure.map.md` (Key Module — Lifecycle Annotation; registry build sites in type-system.ts)

**MCP `<program mcp>` / V0.D-E work** (compute-program-config McpConfig, build.js boot injection, e2e):
1. `structure.map.md` (Key Module — MCP-V0; compute-program-config + build.js injection)
2. `domain.map.md` (MCP V0 — Implementation Status; Sub-units A-E ALL LANDED)
3. `config.map.md` (McpConfig program-config struct + NODE_ENV dev-only gate + emitPerRoute auto-flip)
4. `test.map.md` (mcp-program-attr + mcp-v0-e2e suites)

**MCP descriptor-extractor work** (mcp-descriptors.ts engines/forms/channels/serverfns):
1. `structure.map.md` (Key Module — MCP-V0)
2. `schema.map.md` (MCP Descriptor Shapes — compoundKeys nested + cellKey; encoding caveat)
3. `test.map.md` (mcp-descriptors-* suites + compileAndReadSidecars helper)

**MCP runtime / server work** (mcp.js 11-tool surface, startMcpServer/shutdownMcpServer stdio boot):
1. `structure.map.md` (Key Module — MCP-V0; the 11 LOCKED tool names + boot sequence)
2. `dependencies.map.md` (@modelcontextprotocol/sdk lazy-import site + zod)
3. `error.map.md` (MCP shim plain-Error guards + tool isError-wrap)

**Codegen correctness / expression-emission** (emit-expr precedence, code-segments fence, rewrite.ts, ~snapshot orphan-sigil):
1. `structure.map.md` (Key Codegen Modules + ~snapshot Bug 15 fix sites)
2. `schema.map.md` (BinaryExpr precedence printer tables + Code-Segment Fence + orphan-~ fallback)
3. `error.map.md` (Silent-Correctness Bugs — Bug W / GITI-* / 6nz-S / ~snapshot Bug 15)
4. `test.map.md` (tilde-snapshot-codegen-fix / bug-w / giti-019 tests)

**Native-parser bug fix** (M6.5/M6.7 D-class parity, within-node, match-arm, structural-decl, FileAST synthesis):
1. `structure.map.md` (Native-Parser Layout — CHANGED this delta; M6.5/M6.7 productions)
2. `domain.map.md` (M5 swap seam + M6 Wave 1 / M6.5/M6.7 status; D4 EMPTY)
3. `schema.map.md` (FileAST + native StateDecl + Stmt/Expr catalogs; `:>` match-arm, null/undefined primary)
4. `test.map.md` (m65-b* + m67-c*/m67-d* + parser-conformance)

**symbol-table.ts change** (SYM PASS modifications, scope-chain, new pass):
1. `domain.map.md` (Stage 3.06 [SYM] + Aggregates)
2. `structure.map.md` (Key Symbol Table Modules)
3. `schema.map.md` (EngineStateChildEntry + SYMInput/SYMResult)

**V-kill / Unit CC change** (E-STATE-UNDECLARED / E-WRITE-NOT-IN-LOGIC-CONTEXT, exemption list):
1. `error.map.md` (V-kill + Unit CC codes)
2. `domain.map.md` (Stage 3.06 [SYM] + Business Invariants)
3. `schema.map.md` (ReactiveAssignNode + LogicStatement union)

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

- `compileScrml(options)` in `compiler/src/api.js` is the pipeline orchestrator — a ~25-stage chain BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG, followed by stdlib bundling + MCP descriptor-sidecar emission + the output write loop. `<program mcp>` (MCP-V0.D) auto-flips `emitPerRoute:true` and surfaces `mcpAutoActivated`/`mcpMode` (api.js:622).
- **Iteration LANDED (S131)**: `codegen/emit-each.ts` (618L) emits the Tier-1 `<each in=@items>` / `<each of=N>` structural-iteration surface; `@.` is the contextual current-item/index sigil (§3.4); `<empty>` is the empty-state fallback; `key=` auto-infers from the item-type `.id` field (`W-EACH-KEY-001` when inference fails). `lint-w-each-promotable.js` nudges Tier-0 `${for/lift}` sites toward `<each>` (`W-EACH-PROMOTABLE`). The `bun scrml promote --each` CLI (§56.10) is Landing 3 — **PENDING (SPEC-ahead; CLI help says "impl pending")**. `E-SYNTAX-064` (`@.` outside `<each>`) is queued in SPEC but NOT yet emitted.
- **Lifecycle annotation LANDED (S130-S131)**: a struct field typed `(A to B)` carries a pre/post-transition pair; `type-system.ts` (now 14556L) builds a sparse `LifecycleRegistry` and fires `E-TYPE-001` when a post-transition (`B`) member is accessed before the variant-discriminating `transition()` (§14.12.6.3). Legacy `(A -> B)` glyph still resolves with the `W-LIFECYCLE-LEGACY-ARROW` info-lint nudging migration to `to`. Also `E-TYPE-LIFECYCLE-ON-ENGINE-CELL` (annotation on a non-field engine cell) + `E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED` (Landing 2.5 fn-return marker).
- **MCP V0 series COMPLETE (S130-S131)**: all five Sub-units LANDED — A (descriptor extractor `mcp-descriptors.ts`, 922L) + B (runtime read helpers) + C (11-tool surface + stdio boot) + **D (`<program mcp>` opt-in: `compute-program-config.ts` McpConfig + build.js boot-import injection; `mode:"dev-only"|"always"`)** + **E (e2e + adopter docs `docs/adopter/mcp-setup.md` + multi-page fixture)**. The 11 LOCKED tool names in `mcp.js` are a public-API contract — adopter agent configs depend on them. `@modelcontextprotocol/sdk@1.29.0` is imported lazily only at `startMcpServer()` boot.
- **~snapshot orphan-sigil fix (S131 Bug 15)**: an orphan `~` (no preceding `~ IDENT = expr` initializer) no longer leaks the literal sigil into emitted JS — the bare-expr Phase 3 fast path skips it (`emit-logic.ts:1182`) + a defensive `null` fallback in emitIdent (`emit-expr.ts:277`). Silent-correctness class; no diagnostic, printer-enforced.
- **Native-parser CHANGED this delta** (was "unchanged" at the prior watermark): M6.5.b.2.1/b.3/b.4/b.5/b.6 + M6.7 C1/C2 + D1/D2/D3/D6/D7/D8a-i parity-completeness — `server @var`, null/undefined primary, `:>` match-arm, string-literal import specifier, `given` guard, `-> ReturnType` annotation, bare `?{}` → kind:"sql", native→live FileAST shape + span.file. M6.7-D4 (object-literal bucket) is EMPTY at HEAD. parse-file.js grew 1037→1280L. The M6.7 phase-A flag flip remains REVERTED (STOP).
- The central data structure is `FileAST` (`compiler/src/types/ast.ts:1513`). The `ASTNode` union has 12 members; synthesized `each-block` and `match-block` nodes are NOT union members — they are walked via generic child-array recursion.
- scrml SOURCE has no exceptions, no `null`/`undefined`, no async/await (standing rules). §34.1 catalogs 81 native-parser diagnostics — STABLE through S131 (the iteration/lifecycle codes are host-side TS/lint, NOT native-parser). The first new emitted diagnostic codes since S123 are the lifecycle + W-EACH families.
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs unit+integration+conformance, never bypass `--no-verify` without authorization.
- SPEC.md is normative per pa.md Rule 4 — now 30477 lines (last mod 2026-05-25), §58 Build Story is the highest-numbered section; §17.7 (iteration) + §3.4 (`@.`) + §14.3/§14.12 (lifecycle) reflect LANDED features; §56.10 `promote --each` is honest SPEC-ahead.

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #m6-wave1 #m6-7-dclass #pipeline #iteration #each #at-dot-sigil #lifecycle #to-glyph #transition-marker #mcp-v0 #mcp-program-attr #mcp-descriptors #mcp-server #snapshot-fix #v-kill #unit-cc #code-segments #s131

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
