# domain.map.md
# project: scrmlts
# updated: 2026-05-24T00:00:00Z  commit: 3a909c1d

The domain is the scrml COMPILER pipeline. scrml is a single-file, full-stack reactive
web language; the compiler splits server from client, wires reactivity, routes HTTP, and
emits HTML/CSS/JS. Normative authority: `compiler/SPEC.md` (58 sections) + `compiler/PIPELINE.md`.
Per pa.md Rule 4, SPEC.md is normative.

## Core Concepts

| Concept | Definition |
|---|---|
| `FileAST` | typed AST for one .scrml file; central data structure (types/ast.ts:1487); output of TAB |
| Pipeline stage | a discrete transform; each has its own diagnostic class and optional `selfHostModules` override |
| Native parser | scrml-native composed-engines front-end (compiler/native-parser/); replaces BS+Acorn+BPP per charter B; routed at TAB seam behind `--parser=scrml-native` since C2 (S119) |
| Native walker | structured walk over native block trees (compiler/src/native-walker/); replaces text-rescanners for structured AST consumers |
| M5 SWAP seam | C2 API routing point; `--parser=scrml-native` swaps `_buildAST` to `nativeParseFile` |
| MCP descriptor sidecar | compile-time JSON introspection surface (engines/forms/channels/serverfns) emitted unconditionally to `<outputDir>/` by api.js; read by the `scrml:mcp` runtime helpers; MCP-V0 (S125) |
| Build Story | SPEC §58; spec-ahead — no implementation exists yet |
| `scrml:compiler` | KNOWN-DEFERRED stdlib family (SPEC §41.17) |

## Pipeline Stages — orchestrated by `compileScrml` in compiler/src/api.js

| Stage | Label | File | Notes |
|---|---|---|---|
| Auto-gather pre-pass | — | api.js | expand inputFiles to transitive .scrml import closure (§21.7) |
| Ghost-lint pre-pass | — | lint-ghost-patterns.js + lints | non-fatal; W-LINT-013 scope-gate (S122) |
| Stage 2 | BS | block-splitter.js | Block[] from .scrml; Unit CC: `TOPLEVEL_AT_WRITE_RE` lifts bare `@x = expr` at body-top |
| Stage 3 | TAB | ast-builder.js | Block[] → FileAST; C2: `--parser=scrml-native` routes through `nativeParseFile` |
| Stage 3.004–3.008 | PRECG/GCP1/GCP3/LINT-* | api.js | PGO flags, gauntlet checks, lint-try-catch, lint-async-user-source |
| Stage 3.1 | MOD | module-resolver.js | module resolution; S122 aliased imports |
| Stage 3.05 | NR | name-resolver.ts | name resolution; `spec.local` |
| Stage 3.06 | SYM | symbol-table.ts | symbol table; 21 PASSes; V-kill E-STATE-UNDECLARED + Unit CC E-WRITE-NOT-IN-LOGIC-CONTEXT; PASS 11 now uses `engine-statechild-walker.ts` (M6.6.b.2) |
| Stage 3.2 | CE | component-expander.ts | M6.2b LANDED (S123): `reparseSynthesizedFile` → `nativeParseFile` (progressive) |
| Stage 3.3 | VP | validators/ | post-CE invariant, attr-interp, allowlist |
| Stage 4 | PA | protect-analyzer.ts | protect analyzer |
| Stage 5 | RI | route-inference.ts | route inference |
| Stage 5.5 | MC | monotonicity-analyzer.ts | monotonicity classifier (§19.9.6) + E-CPS-* |
| Stage 6 | TS | type-system.ts | cross-file type registry |
| Stage 6.4 | LINT | lint-i-match-promotable.js / lint-i-fn-promotable.js | I-MATCH-PROMOTABLE + I-FN-PROMOTABLE |
| Stage 6.5 | MC/ME | meta-checker.ts / meta-eval.ts | M6.1 LANDED: meta-eval → nativeParseFile |
| Stage 7 | DG | dependency-graph.ts | dependency graph |
| Stage 7.5 | BP | batch-planner.ts | batch planner (§8.9–§8.11) |
| Stage 7.55 | AG | auth-graph.ts | auth graph derivation (§40) |
| Stage 7.6 | RS | reachability-solver.ts | reachability solver (5 components) |
| Stage 8 | CG | code-generator.js → codegen/index.ts | HTML/CSS/server JS/client JS; M6.3 emit-match → nativeParseFile; GITI-017; 6nz Bug P |
| Stdlib bundling | — | api.js `bundleStdlibForRun` | copy runtime shims into `<out>/_scrml/*.js` (scrml:mcp NOT yet in the bundling allowlist) |
| MCP sidecar emission | — | api.js (output write loop, ~api.js:1996) | **MCP-V0.A (S125)**: `buildMcpDescriptors(tabResults)` → writes engines/forms/channels/serverfns .json to `<outputDir>/` unconditionally |
| Output write loop | — | api.js | F-COMPILE-001 Option A preserved source tree |

## The M5 Pipeline-Swap Seam (C2 — routed, S119)

- `--parser=scrml-native` routes per-file TAB through `nativeParseFile` (parse-file.js). Strictly OPT-IN. BS still runs; every downstream stage runs unchanged.
- Bridge layer (native → live FileAST):
  - `translate-stmt.js` (R1) — native Stmt[] → live LogicStatement[]. **R4 translateExpr wiring COMPLETE (S123)**: U1 bare-expr/return/throw, U2 for-stmt, U3 condExpr, U4 initExpr, U5 lift/fail/propagate, U6.b CE heuristic. **M6.5.b.2 (S125): `makeStateDeclNode` StateDecl arm** — native `StateDecl{...}` → live `state-decl`.
  - `translate-expr.js` (A2) — native Expr → live ExprNode. Complete S118.
  - `collect-hoisted.js` (A3) — M6.4a P2-Form1 + cross-file shapes; M6.6.b.1.5 attr tokenizer extensions.
  - `translateMarkupValueToLiveNode` (M6.2a, S122) — lift-expr.expr.node bridge.
  - `parse-file.js` (C1) — `nativeParseFile`; 12 per-BlockKind synth* builders; 1037L.
- Dual-pipeline canary (`parser-conformance-canary.test.js`) — updated M6.7 STOP; corpus migrations landed.

## M6 Wave 1 + S125 Status

| Milestone | Status |
|---|---|
| M6.1 meta-eval | LANDED |
| M6.2a markup-value bridge | LANDED |
| M6.2b component-expander | LANDED (S123) |
| M6.3 emit-match | LANDED |
| M6.4a P2-Form1 | LANDED |
| M6.5 no-op proof | PROVEN |
| M6.5.b.0 within-node canary | LANDED (Wave 2 unblocked, S124) |
| **M6.5.b.1 match-arm newline-separator + Dot-UpperIdent pattern** | **LANDED (S125)** — `parseMatchExpr` accepts newline/comma/semi; `parseMatchArmPattern` Dot+UpperIdent; +16 unit tests |
| **M6.5.b.2 structural-decl `<ident>` LHS** | **PARTIAL (S125)** — Option B; 6 of 8 productions; `StmtKind.StateDecl` + `parseStructuralStateDecl` + attribute-region capture + translate-stmt StateDecl arm |
| M6.6.b.1 attr tokenizer | LANDED |
| M6.6.b.1.5 attr tokenizer extension | LANDED (S124) |
| M6.6.b.2 engine-statechild-walker | LANDED (S124) — SYM PASS 11 swapped from text-rescanner to native walker |
| M6.6.b.3 legacy helper migration | LANDED (S124) — `isLegacyArrowRulesBody` + `scanForOnIdleEntries` migrated |
| M6.7 flag flip | STOP — flag flip REVERTED; corpus migrations + canary close landed |
| M6.6.b.4..b.6, M6.8 | PENDING |

## MCP V0 — Implementation Status (S125)

The 11-tool MCP DevTools surface (SCOPING'd S124) is now PARTIALLY IMPLEMENTED.

| Sub-unit | Status | Surface |
|---|---|---|
| Sub-unit A (descriptor extractor) | **LANDED-PARTIAL (S125)** — `compiler/src/codegen/mcp-descriptors.ts` (~868L) + api.js wiring (~37L). Tests are the NEXT dispatch (MCP-V0.A-tests). | `buildMcpDescriptors` emits engines/forms/channels/serverfns .json sidecars |
| Sub-unit B (runtime read helpers) | **LANDED (S125)** — `compiler/runtime/stdlib/mcp.js` (~430L) + `unit/mcp-runtime-helpers.test.js` | `install`/`loadSidecars`/`getCurrentVariant`/`getFormStatus`/`getChannelState` |
| Sub-unit C/D (11-tool surface + MCP server boot + sidecar-loader wiring + `<program mcp>` opt-in) | PENDING | `scrml:mcp` shim is NOT yet registered in the stdlib bundling allowlist |

Authority: `docs/changes/mcp-v0-devtools-scoping/SCOPING.md` §3. Known v0 follow-on: extractor does not yet emit `cellKey` (engines) / `compoundKeys` (forms) fields the runtime shim reads defensively — shim degrades gracefully (engineName-as-key; per-field rollup). The MCP-V0.A-tests dispatch will exercise this seam.

## Native-Walker Pattern (M6.6.b.2 precedent)

The M6.6.b.2 migration establishes the pattern for subsequent native consumer migrations:
1. Author `compiler/src/native-walker/<walker>.ts` with structured walk over native block stream.
2. Discriminated branch at the call site: native path when block stream available; legacy text-rescanner as fallback for synthetic ASTs.
3. Import `parseRuleAttrValue` (the canonical rule= parser) from legacy module verbatim — the helper is reused, not replaced.
4. Dual-pipeline parity test in `compiler/tests/unit/m66-b2-engine-statechild-walker.test.js`.
5. M6.6.b.3+ = deletion-only follow-ons retiring the unused legacy paths.

## Business Invariants

- scrml SOURCE has no exceptions / no try-catch (§19.1) — values-not-exceptions.
- `null` and `undefined` do not exist in scrml; both map to `not`. `""` / `0` / `false` / `[]` / `{}` are DEFINED values, not absence (memory S89, absolute).
- No async/await in scrml SOURCE; `!{}` is the call-site error handler.
- Native FileAST id discipline: ONE `idGen` threaded through all synthesizers.
- §58 Build Story: given `(source, buildStory)`, bit-identical artifact. SPEC-AHEAD.
- **V-kill invariant (S123)**: `@name = expr` inside fn/function/user `${...}` is a WRITE. Compiler SHALL NOT synthesise phantom cells. E-STATE-UNDECLARED on miss.
- **Unit CC invariant (S123)**: bare `@name = expr` at default-logic body-top fires E-WRITE-NOT-IN-LOGIC-CONTEXT; migration via `unit-cc-exemption-list.json`.
- **6nz Bug P invariant (S123)**: `scope` chunk always pulls `timers` + `animation` via `CHUNK_DEPENDENCIES`.
- **M6.6.b.2 invariant (S124)**: SYM PASS 11 produces structurally identical `EngineStateChildEntry[]` via native walker (verified by parity test) — the output shape contract is unchanged.
- **M6.7 STOP invariant (S124)**: the flag flip was attempted but reverted; flag flip blocked pending resolution of remaining within-node divergences (`parser-conformance-within-node.test.js`).
- **MCP V0 invariant (S125)**: descriptor sidecars are emitted UNCONDITIONALLY (every adopter app gets the four .json files); empty-app graceful degradation (`[]` for zero-engine/form/channel/server-fn). `dispatchable: false` is a PERMANENT v0 marker — V0 MCP is read-only enumeration; the LLM agent cannot invoke server fns.

## Aggregates / Key Modules

| Module | Notes |
|---|---|
| `compiler/src/api.js` | pipeline orchestrator; `compileScrml`; MCP sidecar emission in output write loop |
| `compiler/src/symbol-table.ts` | 9730+ LOC; 21 PASSes; PASS 11 now uses native-walker |
| `compiler/src/codegen/mcp-descriptors.ts` | MCP-V0.A NEW (S125) — 4 descriptor extractors; local emit-chain mirrors |
| `compiler/runtime/stdlib/mcp.js` | MCP-V0.B NEW (S125) — scrml:mcp runtime READ helpers |
| `compiler/src/native-walker/engine-statechild-walker.ts` | M6.6.b.2 — native EngineStateChildEntry walker |
| `compiler/src/native-parser-canary/within-node-classifier.ts` | M6.5.b.0 extended — 7-class parity classifier |
| `compiler/native-parser/parse-file.js` | C1 assembler (1037L); imported by CE, emit-match, meta-eval |
| `compiler/native-parser/parse-stmt.js` | M6.5.b.2 — `parseStructuralStateDecl` + structuralStateDeclLeadFollows predicates |
| `compiler/native-parser/parse-expr.js` | M6.5.b.1 — `parseMatchExpr` newline separator + `parseMatchArmPattern` Dot+UpperIdent |
| `compiler/native-parser/{translate-stmt,translate-expr,collect-hoisted}.js` | bridge; R4 COMPLETE; M6.5.b.2 makeStateDeclNode |
| `codegen/rewrite.ts` | GITI-017: `rewriteNotKeyword` regex-literal aware |
| `codegen/runtime-chunks.ts` | 6nz Bug P: `CHUNK_DEPENDENCIES` + `applyChunkDependencies` |
| `codegen/emit-match.ts` | M6.3 → nativeParseFile |
| `meta-eval.ts` | M6.1 → nativeParseFile |
| `component-expander.ts` | M6.2b → nativeParseFile (progressive) |
| `lint-i-fn-promotable.js` | S122 Unit EE I-FN-PROMOTABLE info lint |

## Tags
#scrmlts #map #domain #pipeline #native-parser #m5-swap #m6-wave1 #compiler #build-story #s125 #v-kill #unit-cc #r4-continuation #giti-017 #6nz-bug-p #m6-2b #m6-6-b2 #m6-5-b0 #m6-5-b1 #m6-5-b2 #native-walker #m6-7-stop #mcp-v0 #mcp-descriptors

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [schema.map.md](./schema.map.md)
