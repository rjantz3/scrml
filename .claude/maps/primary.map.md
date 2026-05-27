# primary.map.md
# project: scrmlts
# updated: 2026-05-26T00:00:00Z  commit: 3a660c7c

## Project Fingerprint

Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring + @modelcontextprotocol/sdk (lazy)
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3300 git-tracked files
Watermark:  HEAD 3a660c7c (2026-05-26) — package.json v0.6.1 — S133-S134. Major landings since c2d3f7ae (5 commits): **Iteration Landing 3 `bun scrml promote --each` LANDED (S134 — promote.js 1649L, `applyEachRewrite` + `promoteEachOnFile` + `--shorthand`, closes Iter L3 §56.10 arc)**; **B-prereq Shape 1 per-access lifecycle tracker LANDED (S134 Bug 19 HIGH — `runCellValueLifecycleAccessCheck`, type-system.ts now 15205L, §14.12.10 coverage)**; **A4 §6.6.18 alias-escape gap CLOSED (S134 — `AliasRecord` + PASS 2.c `walkRegisterLocalAliases`, symbol-table.ts now 10445L)**; **Bug 17 JS_HOST_FORBIDDEN categorical walker LANDED (S134 — `checkJsHostGlobals`, meta-checker.ts now 2262L, §22.12 categorical E-META-001 for bun/process/setInterval/fetch etc.)**; **META_BUILTINS narrow + rewriteBunEval retire (S133)**; **SPEC §6.8.3 NEW `reset × lifecycle` + §14.12.10 normative statements (S134 SPEC-ahead-of-impl; SPEC.md now 30552L)**.

## Map Index

| Map | Status | Contents |
|---|---|---|
| structure.map.md | present | directory layout, entry points, native-parser, stdlib (19 top-level), codegen (incl. emit-each), iteration/lifecycle/MCP-V0.D-E key modules, promote-each LANDED, milestone status (updated S134) |
| dependencies.map.md | present | 3 root + 2 compiler runtime deps, internal module graph (emit-each + W-EACH-lint edges), native-parser graph, stdlib shim layout |
| schema.map.md | present | FileAST / ASTNode (12-member union) / synthesized each-block + match-block nodes / lifecycle registry types + Shape 1 tracker (NEW S134) / AliasRecord (NEW S134) / META_BUILTINS narrow + JS_HOST_FORBIDDEN (NEW S134) / MCP descriptor shapes / native catalogs |
| config.map.md | present | env vars (+ NODE_ENV MCP gate) + compiler option flags + McpConfig program-config struct |
| build.map.md | present | bun scripts (unchanged), CLI subcommands (promote --each LANDED S134, promote --engine still deferred), git hooks, MCP-V0.D build behavior |
| error.map.md | present | 11 stage classes, §34.1 81-code catalog (STABLE), lifecycle + W-EACH codes, Shape 1 tracker E-TYPE-001 extension (NEW S134), E-DERIVED-VALUE-MUTATE alias path (NEW S134), JS_HOST_FORBIDDEN E-META-001 fire path (NEW S134), ~snapshot fix, MCP shim errors |
| test.map.md | present | bun test, 780 test files (545/88/105 unit/integ/conf), iteration + lifecycle + snapshot + MCP-D/E + M6.5/M6.7 D-class suites |
| domain.map.md | present | pipeline stages + iteration/lifecycle/MCP-V0 stages, S133-S134 landings (promote-each, Shape 1 tracker, A4, Bug 17, §6.8.3), M6.5/M6.7 status, full invariant set (updated S134) |
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
| types / AST shapes / each-block + match-block nodes / lifecycle registry + Shape 1 tracker / AliasRecord / MCP descriptor shapes | schema.map.md |
| pipeline stages / iteration + lifecycle stages / S133-S134 landings / native parser / M6.5/M6.7 / MCP impl status | domain.map.md |
| native-parser layout / emit-each / lint-w-each / MCP-V0.D-E modules / stdlib shim layout / promote-each LANDED | structure.map.md |
| compiler option flags / env vars / McpConfig program-config | config.map.md |
| build commands / CLI / promote --each LANDED / promote --engine deferred / git hooks / MCP-V0.D build behavior | build.map.md |
| test layout / iteration + lifecycle + snapshot + MCP-D/E + D-class suites / parser-conformance | test.map.md |
| external packages / module graph / shim catalog / mcp-sdk dep | dependencies.map.md |
| diagnostic classes / error codes / Shape 1 E-TYPE-001 extension / alias E-DERIVED-VALUE-MUTATE / JS_HOST_FORBIDDEN / lifecycle + W-EACH codes / V-kill / ~snapshot fix / MCP errors | error.map.md |

## Task-Shape Routing (agents — read this section first)

**Iteration / `<each>` work** (emit-each.ts codegen, lint-w-each-*, `@.` sigil, `<empty>`, key= inference, **`promote --each` CLI LANDED S134**):
1. `structure.map.md` (Key Module — Iteration Codegen + Key Module — `promote --each`; each-block node shape + emit-each exports; promote.js LANDED)
2. `domain.map.md` (Iteration — Implementation Status; Landings 1+2+3 ALL LANDED; Landing 4 kickstarter PENDING)
3. `schema.map.md` (EachBlockNode synthesized shape — NOT in ASTNode union; collectEachBlocks walk)
4. `error.map.md` (W-EACH-KEY-001 / W-EACH-PROMOTABLE emitted; E-SYNTAX-064 / E-EACH-ITER-SHAPE queued, NOT emitted)

**Lifecycle annotation work** (`(A to B)` registry, E-TYPE-001 access-before-transition, transition() marker, `->`→`to` glyph, **Shape 1 tracker B-prereq LANDED S134**):
1. `domain.map.md` (Lifecycle Annotation — Implementation Status; Landings 1+2+2.5 LANDED + B-prereq S134)
2. `error.map.md` (E-TYPE-001 / E-TYPE-LIFECYCLE-ON-ENGINE-CELL / E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED / W-LIFECYCLE-LEGACY-ARROW — all emitted; Shape 1 extension in B-prereq section)
3. `schema.map.md` (Lifecycle Annotation Types — LifecycleFieldSpec / LifecycleRegistry; Shape 1 per-access tracker; findTopLevelArrow glyph detection)
4. `structure.map.md` (Key Module — Lifecycle Annotation; registry build sites in type-system.ts; LOC now 15205)

**§6.6.18 alias-escape / A4 work** (`AliasRecord`, PASS 2.c, L21 alias-mutation extension):
1. `schema.map.md` (AliasRecord type shape + chain-break rules; Scope.aliasProvenanceRecords; symbol-table.ts LOC now 10445)
2. `domain.map.md` (§6.6.18 alias invariant; Stage 3.06 SYM A4 note)
3. `error.map.md` (E-DERIVED-VALUE-MUTATE alias fire path section)
4. `structure.map.md` (Key Symbol Table Modules; PASS 2.c walkRegisterLocalAliases)

**Bug 17 JS_HOST_FORBIDDEN / §22.12 meta categorical work**:
1. `schema.map.md` (JS_HOST_FORBIDDEN set; META_BUILTINS narrow; checkJsHostGlobals)
2. `error.map.md` (JS_HOST_FORBIDDEN E-META-001 fire path section; Bug 17)
3. `domain.map.md` (§22.12 JS_HOST_FORBIDDEN invariant; Stage 6.5 MC note; meta-checker.ts LOC 2262)
4. `structure.map.md` (Key Module — Meta Checker)

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
1. `structure.map.md` (Native-Parser Layout — M6.5/M6.7 productions)
2. `domain.map.md` (M5 swap seam + M6 Wave 1 / M6.5/M6.7 status; D4 EMPTY)
3. `schema.map.md` (FileAST + native StateDecl + Stmt/Expr catalogs; `:>` match-arm, null/undefined primary)
4. `test.map.md` (m65-b* + m67-c*/m67-d* + parser-conformance)

**symbol-table.ts change** (SYM PASS modifications, scope-chain, AliasRecord A4):
1. `domain.map.md` (Stage 3.06 [SYM] + Aggregates)
2. `structure.map.md` (Key Symbol Table Modules + A4 PASS 2.c)
3. `schema.map.md` (AliasRecord + SYMInput/SYMResult/Scope; EngineStateChildEntry)

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
- **Iteration FULLY LANDED (S131-S134)**: `codegen/emit-each.ts` (618L) emits the Tier-1 `<each in=@items>` / `<each of=N>` structural-iteration surface; `@.` is the contextual current-item/index sigil (§3.4); `<empty>` is the empty-state fallback; `key=` auto-infers from the item-type `.id` field (`W-EACH-KEY-001` when inference fails). `lint-w-each-promotable.js` nudges Tier-0 `${for/lift}` sites toward `<each>` (`W-EACH-PROMOTABLE`). **`bun scrml promote --each` CLI (§56.10) is Landing 3 — LANDED S134** (`applyEachRewrite` + `promoteEachOnFile` + `--shorthand` in promote.js 1649L). `E-SYNTAX-064` (`@.` outside `<each>`) is queued in SPEC but NOT yet emitted.
- **Lifecycle annotation LANDED S130-S134**: a struct field typed `(A to B)` carries a pre/post-transition pair; `type-system.ts` (now **15205L**) builds a sparse `LifecycleRegistry` and fires `E-TYPE-001` when a post-transition (`B`) member is accessed before `transition()` (§14.12.6.3). **Shape 1 per-access tracker (B-prereq S134 Bug 19 HIGH)** extends E-TYPE-001 to plain reactive cells (`<state>: (A to B) = init`) per §14.12.10. Legacy `(A -> B)` glyph resolves with `W-LIFECYCLE-LEGACY-ARROW`.
- **§6.6.18 alias-escape CLOSED (S134 A4)**: `AliasRecord` interface + PASS 2.c `walkRegisterLocalAliases` in `symbol-table.ts` (now **10445L**); E-DERIVED-VALUE-MUTATE now fires for aliased mutation forms (`let local = @cell; local.foo = x`).
- **§22.12 JS_HOST_FORBIDDEN CATEGORICAL (S134 Bug 17)**: `meta-checker.ts` (now **2262L**) has a new `JS_HOST_FORBIDDEN` set + `checkJsHostGlobals` walker — fires E-META-001 for JS-host ambient globals (`bun`, `process`, `setInterval`, `fetch`, etc.) regardless of compile-time vs runtime classification. Separate from the existing `META_BUILTINS` E-META-001 path. S133 also narrowed `META_BUILTINS` (retired `bun.eval()` user surface).
- **MCP V0 series COMPLETE (S130-S131)**: all five Sub-units LANDED — A (descriptor extractor `mcp-descriptors.ts`, 922L) + B (runtime read helpers) + C (11-tool surface + stdio boot) + D (`<program mcp>` opt-in: `compute-program-config.ts` McpConfig + build.js boot-import injection; `mode:"dev-only"|"always"`) + E (e2e + adopter docs `docs/adopter/mcp-setup.md` + multi-page fixture). The 11 LOCKED tool names in `mcp.js` are a public-API contract. `@modelcontextprotocol/sdk@1.29.0` is imported lazily only at `startMcpServer()` boot.
- **~snapshot orphan-sigil fix (S131 Bug 15)**: an orphan `~` no longer leaks the literal sigil into emitted JS. Bare-expr Phase 3 fast path skips it (emit-logic.ts:1182); defensive `null` fallback in emitIdent (emit-expr.ts:277).
- The central data structure is `FileAST` (`compiler/src/types/ast.ts:1513`). The `ASTNode` union has 12 members; synthesized `each-block` and `match-block` nodes are NOT union members — they are walked via generic child-array recursion.
- scrml SOURCE has no exceptions, no `null`/`undefined`, no async/await (standing rules). §34.1 catalogs 81 native-parser diagnostics — STABLE through S134. **SPEC.md is now 30552 lines** (last mod 2026-05-26); §6.8.3 NEW (`reset × lifecycle` interaction, SPEC-ahead-of-impl); §14.12.10 normative statements added.
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs unit+integration+conformance, never bypass `--no-verify` without authorization.

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #m6-wave1 #m6-7-dclass #pipeline #iteration #each #at-dot-sigil #lifecycle #to-glyph #transition-marker #lifecycle-shape1-tracker #alias-escape #js-host-forbidden #promote-each-landed #mcp-v0 #mcp-program-attr #mcp-descriptors #mcp-server #snapshot-fix #v-kill #unit-cc #code-segments #s131 #s133 #s134

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
