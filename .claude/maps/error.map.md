# error.map.md
# project: scrmlts
# updated: 2026-05-26T00:00:00Z  commit: c2d3f7ae

scrml's own language error model is values-not-exceptions (SPEC §19.1 — no try/catch,
no exceptions in scrml SOURCE). Entries below are the COMPILER's own (host-side,
JavaScript/TypeScript) diagnostic infrastructure.

## Per-Stage Diagnostic Classes

| Class | File | Stage | Notes |
|---|---|---|---|
| `BSError` | block-splitter.js:59 | Stage 2 (BS) | extends Error; `bsSpan` lifted to `span` by api.js |
| `TABError` | ast-builder.js | Stage 3 (TAB) | extends Error |
| `ModuleError` | module-resolver.js:33 | Stage 3.1 (MOD) | module resolution |
| `GauntletError` | gauntlet-phase1-checks.js:44 | Gauntlet Phase 1 | |
| `PAError` | protect-analyzer.ts:126 | Stage 4 (PA) | |
| `RIError` | route-inference.ts:326 | Stage 5 (RI) | |
| `TSError` | type-system.ts | Stage 6 (TS) | |
| `MetaError` | meta-checker.ts:67 | Stage 6.5 (MC) | |
| `MetaEvalError` | meta-eval.ts:49 | Stage 6.5 (ME) | |
| `DGError` | dependency-graph.ts:233 | Stage 7 (DG) | |
| `CGError` | codegen/errors.ts:11 | Stage 8 (CG) | `{ code, message, span, severity }` |

## NEW Diagnostic Codes Since Watermark (S130-S131) — all host-side (TS / lint)

The S130-S131 wave (iteration + lifecycle) added the FIRST new emitted diagnostic codes since
S123. All are host-side (type-system / dedicated lint files); NO new native-parser §34.1 codes.

### Lifecycle annotation (SPEC §14.3 / §14.12) — emitted by type-system.ts

| Code | Severity | When |
|---|---|---|
| `E-TYPE-001` | error | access-before-transition — a `(A to B)` field's post-transition (`B`) member accessed before the variant-discriminating `transition()` (§14.3). Emitted at type-system.ts (×22) + emit-logic.ts |
| `E-TYPE-LIFECYCLE-ON-ENGINE-CELL` | error | lifecycle annotation applied to an engine-cell position (not a struct field) — §14.12 Landing 2 |
| `E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED` | error | variant-progression missing `transition()` — Landing 2.5 fn-return transition-marker |
| `W-LIFECYCLE-LEGACY-ARROW` | info | legacy `(A -> B)` glyph detected; migrate to `(A to B)` (§14.12.5). Emitted at the lifecycle-registry build site (type-system.ts:2216) |

### Iteration (`<each>`, SPEC §17.7 / §34) — emitted by dedicated lint files

| Code | Severity | Source | When |
|---|---|---|---|
| `W-EACH-KEY-001` | info | lint-w-each-key.js (218L) | `key=` inference failed on a `<each in=>` (item-type has no `.id`); `<each of=N>` defaults `key=@.` and never fires |
| `W-EACH-PROMOTABLE` | info | lint-w-each-promotable.js (213L) | a Tier-0 `${ for/lift }` site is mechanically promotable to a Tier-1 `<each>` (§17.4); informational only — adopters MAY stay on Tier 0 |

### Iteration codes SPEC'd / queued but NOT yet emitted at HEAD (comment/§34-row only)

- `E-SYNTAX-064` — `@.` used outside an `<each>` body scope (§17.7.3 / §17.7.4 / §17.7.6). Queued in SPEC §34; comment-only in source.
- `E-EACH-ITER-SHAPE` — missing-or-both `in=`/`of=` on `<each>` (§34 row noted at ast-builder.js:11117). Comment-only.
- `E-STRUCTURAL-ELEMENT-MISPLACED` — comment-only.

## Native-Parser Parse Diagnostics (SPEC §34.1)

81 codes: 79 hard `E-` errors + 2 info-level `I-NATIVE-BLOCK-*` codes. **STABLE through S131** — the M6.5/M6.7 C/D-class parity work (S127-S129: server/pure on `function`, `given` guard, `-> ReturnType` annotation, `:>` match-arm, null/undefined primary, string-literal import) reused EXISTING codes; the iteration + lifecycle work is host-side (TS/lint), not native-parser; NO new §34.1 codes landed.

B-wave codes (S118): E-STMT-LIN-* / E-STMT-TYPE-* / E-STMT-FN-* / E-STMT-TILDE-* / E-EXPR-GUARDED-UNCLOSED / E-THROW-NOT-IN-SCRML / E-TRY-NOT-IN-SCRML.

Match-arm path: `E-EXPR-MATCH-BRACE` (parse-expr.js) — existing code, exercised by the newline-separator + `:>` colon-arrow (M6.7-D3) paths; no new code introduced.

FileAST-assembler info codes (S119 C2 — `nativeParseFile`):
- `I-NATIVE-BLOCK-DROPPED` — BlockKind with no live ASTNode dropped; severity info → `result.warnings`
- `I-NATIVE-BLOCK-UNMAPPED` — unknown BlockKind dropped; forward-compat guard; severity info → `result.warnings`

## S123 Host-Pipeline Codes (SPEC §34)

| Code | Source | When |
|---|---|---|
| `E-STATE-UNDECLARED` | symbol-table.ts PASS 3 | bare `@name = expr` write inside fn/function/user `${...}` without structural `<name>` decl in scope (V-kill) |
| `E-WRITE-NOT-IN-LOGIC-CONTEXT` | symbol-table.ts PASS 3 | bare `@name = expr` at `<program>`/`<page>`/`<channel>` immediate body-top (Unit CC); per-file exemption via `unit-cc-exemption-list.json` |

## Stdlib-Shim Warnings (SPEC §34)

| Code | When |
|---|---|
| `W-STDLIB-SHIM-MISSING` | bundleStdlibForRun: `scrml:NAME` has no runtime shim at `compiler/runtime/stdlib/<name>.js` |
| `W-STDLIB-COMPILER-DEFERRED` | bundleStdlibForRun: any name matching `"compiler"` or `"compiler/..."` — fires regardless of shim presence |

## Silent-Correctness Bugs CLOSED at emit time (no diagnostic — printer-enforced correctness)

These had/have NO diagnostic — emitted JS stayed syntactically valid but was semantically wrong. Each is fixed at emit time:
- **Bug W** (codegen/emit-expr.ts `emitBinary`, S127) — acorn drops `ParenthesizedExpression` nodes; `binaryOperandNeedsParens` re-inserts dropped grouping parens (`(2+3)*4` no longer prints as `2+3*4`).
- **GITI-017-residual** (code-segments.ts + expression-parser.ts, S125-S127) — second `not`-lowering site fenced via shared `rewriteCodeSegments`.
- **GITI-018** (api.js, S127) — library-mode rewrites ALL `scrml:` imports (was first-only).
- **GITI-019** (codegen/emit-lift.js, S127) — lift-loop interp parenthesized before `?? ""`.
- **6nz-S** (expression-parser.ts + codegen/rewrite.ts, S127) — bare-`not`-negation uses `[ \t]+` + keyword-exclusion (`return not` no longer glues).
- **~snapshot orphan-sigil leak (Bug 15, S131)** — an orphan `~` (no preceding `~ IDENT = expr` initializer) leaked the literal sigil into emitted JS. Now: the bare-expr Phase 3 fast path skips the orphan `~` at statement position (emit-logic.ts:1182); a defensive fallback in emitIdent (emit-expr.ts:277) emits `null /* ~ orphaned — codegen-fallback */` if a bare `~` still reaches it. Per HU-5 Q-W35-1 (a) ratification.

## MCP V0 Runtime-Shim Errors (NOT §34 diagnostic codes)

`compiler/runtime/stdlib/mcp.js` runtime guards throw plain `Error` (not registered §34 codes); these surface inside the long-lived MCP server (Sub-units C/D LANDED), not in the compile pipeline:
- install() with no/invalid arg → `/install() requires a runtime object/`
- READ helper before install() → `/runtime not connected/`
- READ helper before loadSidecars() → `/engines.json not loaded/` (+ forms/channels equivalents)
- `startMcpServer` with no `config.outputDir` → `/startMcpServer requires config.outputDir/`

Tool-resolver throw handling: `_registerOneTool` wraps every resolver call in try/catch and converts a thrown resolver into an `{ isError:true, content:[{type:"text", text: JSON.stringify({error: msg})}] }` MCP content response (a thrown handler would otherwise surface as a protocol-level JSON-RPC error). `shutdownMcpServer` swallows transport-close errors (idempotent).

The "E-MCP-RUNTIME-NOT-INSTALLED" / "E-MCP-NO-CHUNKS-MANIFEST" tokens appear only as SCOPING-doc labels and shim-header comments; NOT in the §34 catalog at HEAD.

## Promotion / Info Lints (SPEC §34 + §56)

| Code | Source | When |
|---|---|---|
| `I-MATCH-PROMOTABLE` | lint-i-match-promotable.js | promotable plain-match → match-block opportunity |
| `I-FN-PROMOTABLE` | lint-i-fn-promotable.js (S122) | `function`-keyword decl eligible for `fn` rename per §48.3 |
| `W-EACH-PROMOTABLE` | lint-w-each-promotable.js (S131) | Tier-0 `${ for/lift }` promotable to Tier-1 `<each>` (§17.4) |
| `W-EACH-KEY-001` | lint-w-each-key.js (S131) | `key=` inference failed on `<each in=>` |
| `I-PARSER-NATIVE-SHADOW` | api.js | `--parser=scrml-native` flag is active |
| `I-ASYNC-USER-SOURCE` | validators/lint-async-user-source.ts | async in user source |
| `I-AUTH-REDIRECT-UNRESOLVED` | route-inference.ts | auth redirect target not resolvable |

## Runtime Error Classes (emitted INTO user output — compiler/src/runtime-template.js)

All extend `_ScrmlError` (extends Error):
`NetworkError [2028]` | `ValidationError [2036]` | `SQLError [2044]` | `AuthError [2052]` | `TimeoutError [2060]` | `ParseError [2068]` | `NotFoundError [2076]` | `ConflictError [2084]`

## Error Code Families (selected — host-side, by prefix)

| Family | ~Count | Key codes |
|---|---|---|
| E-TYPE | 160+ | type mismatch / kind errors; NOW incl. E-TYPE-001 (lifecycle access-before-transition) + E-TYPE-LIFECYCLE-* (S130-S131) |
| E-ENGINE | 118 | state machine violations |
| E-DERIVED | 106 | derived-cell constraint violations |
| E-LIN | 75 | lin-token errors |
| E-FN | 74 | fn/function declaration violations |
| E-COMPONENT | 71 | component expansion errors |
| E-IMPORT | 68 | module resolution errors |
| E-META | 64 | meta-programming errors (E-META-001 phase-separation) |
| E-CG | 54 | codegen errors |
| W-LINT | 24 | lint codes W-LINT-001..W-LINT-024 |

Warning families: `W-CG-CHUNK-*`, `W-AUTH-*`, `W-LINT-*`, `W-ENGINE-*` (incl. `W-ENGINE-NON-EXHAUSTIVE` referenced by mcp-descriptors rules-map derivation), `W-DEPRECATED-*`, `W-STDLIB-*`, `W-DEAD-FUNCTION`, `W-PROGRAM-*`, **`W-EACH-*` (S131), `W-LIFECYCLE-*` (S131), `W-ATTR-002`**.
Info families: `I-PARSER-NATIVE-SHADOW`, `I-NATIVE-BLOCK-*`, `I-MATCH-PROMOTABLE`, `I-FN-PROMOTABLE`, `I-ASYNC-USER-SOURCE`, `I-AUTH-REDIRECT-UNRESOLVED`.

## Error Handling Patterns

- `collectErrors(stageName, errors, filePath?)` in api.js — normalizes all stage diagnostics, stamps filePath, lifts BSError `bsSpan`→`span`, pushes to `allErrors`.
- Diagnostic-stream partition — api.js: `isNonFatal(e)` routes W-*/I- prefixed or severity warning/info to `result.warnings`; everything else to `result.errors` (CLI exits 1 on non-empty errors). Tests asserting on W-/I- codes MUST use a cross-stream helper — `result.errors.filter(e => e.code === "W-...")` silently passes (S92 false-negative class). NOTE: `E-TYPE-001` + the lifecycle/E-TYPE-LIFECYCLE-* codes ARE errors → assert on `result.errors`; `W-EACH-*` + `W-LIFECYCLE-LEGACY-ARROW` are warnings → assert on `result.warnings`.
- Native-parser modules record errors as VALUES — `recordError(ctx, code, message, span)`; no throws.
- MCP descriptor extractor (`codegen/mcp-descriptors.ts`) is total/non-throwing — defensive guards; malformed rules degrade to `[]`; never throws into the compile pipeline.
- MCP server tool layer (`mcp.js` `_registerOneTool`) try/catches each resolver and converts throws to `isError` content responses.

## Global Error Boundaries

No host-side global error boundary — compiler is a batch process; fatal errors surface via `result.errors` and non-zero CLI exit. Generated apps embed `_ScrmlError`-based runtime handling per SPEC §19. The MCP stdio server (Sub-units C/D) has its own boundary: per-tool try/catch + idempotent `shutdownMcpServer`.

## Unhandled Error Risks

- api.js BS-stage catch swallows non-BSError throws into a generic `E-BS-000` with no span.
- `component-expander.ts` M6.2b live-path fallback (`sourceNeedsLiveFallback`) — errors on the legacy `splitBlocks`+`buildAST` path surface through the legacy CE diagnostic channel.
- MCP shim fs.watch reload errors (`_startWatcher`) are intentionally swallowed so an in-flight malformed sidecar rewrite cannot crash the MCP server — cache stays stale until next clean reload.

## Tags
#scrmlts #map #error #diagnostics #pipeline #native-parser #stdlib-shims #v-kill #unit-cc #e-type-001 #lifecycle #w-each #iteration #snapshot-fix #mcp-v0 #mcp-server #s131

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
