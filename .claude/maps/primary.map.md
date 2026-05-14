# primary.map.md
# project: scrmlts
# updated: 2026-05-14T16:19:26-06:00  commit: 13154ba

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 21-module stdlib
Size:       ~1,800+ source files (excluding node_modules/dist/.git); compiler/src ~111 .ts/.js files;
            SPEC.md ~27,200+ lines; SPEC-INDEX.md; PIPELINE.md v0.7.1 (2,758 lines);
            samples/compilation-tests: ~311 .scrml fixtures;
            Tests: 638 files — **12,694 pass / ~117 skip / 1 todo / 0 FAIL** (S92 / v0.3.0 STABLE)

## Key Facts (S92 / v0.3.0 STABLE — 2026-05-14, commit 13154ba)

**Current shipped version: v0.3.0 STABLE** — HEAD `13154ba`. v0.3.0 cut complete. All Approach A sub-waves CLOSED.

**A-5 Integration Tests FULLY CLOSED S92 (final Approach A sub-wave):**
- A-5.1: multipage-multirole cornerstone — 3 EP × 3 role §40.9.9 end-to-end (FX-1 fixture)
- A-5.2: cross-file MOD+CE+AG+RS+CG path (FX-2 two-file fixture with `<auth role="Admin">` component)
- A-5.3: negative-cascade diagnostic chain — E-AUTH-GRAPH-002 + E-CLOSURE-002 + W-CG-CHUNK-MISSING-ROLE cascade (FX-3 + FX-4 inline)
- A-5.4: W-* lint family end-to-end — W-AUTH-RUNTIME-FALLBACK + W-CG-CHUNK-EMPTY + W-CG-CHUNK-LARGE + W-CG-CHUNK-NO-PREFETCH + W-CG-CHUNK-PREFETCH-UNRESOLVED
- A-5.5: cross-wave determinism 10-run + explicit budget; trucking-dispatch reference-app compile-smoke (F-6)

**Q-OPENs closed at S92:**
- Q-OPEN-4: `getCompilerIdentity()` sources `chunks.json` `compiler` field from package.json `version` (not hard-coded); cached; fallback `"scrml-unknown"` on read failure
- Q-OPEN-5: `--chunk-size-budget=N` CLI flag + `chunkSizeBudgetBytes` propagation through compileScrml → runCG → emitPerRouteChunks
- Q-OPEN-6: W-CG-CHUNK-NO-PREFETCH (Info, case 1: no internal links) vs W-CG-CHUNK-PREFETCH-UNRESOLVED (Warning, case 2: links exist but unresolved); discriminated by `ctx.hasInternalLinks` NEW S92

**Schema updates at S92:**
- `CGError.severity` now includes `'info'` (errors.ts line 15 — prior maps noted info excluded, now stale)
- `CompileContext.hasInternalLinks: boolean` — Q-OPEN-6 structural-existence flag (context.ts:139)
- `CgInput.chunkSizeBudgetBytes?: number` — Q-OPEN-5 budget override (codegen/index.ts)
- `EmitPerRouteInput.chunkSizeBudgetBytes?: number` — Q-OPEN-5 route-splitter param

**Test suite growth S92:** 12,517 → 12,694 (+177 passing tests; +9 new test files across 30+ commits)

## Map Index

| Map                      | Status  | Contents |
|--------------------------|---------|----------|
| structure.map.md         | present | directory layout, entry points, S91 new/modified files (118 lines) |
| dependencies.map.md      | present | 5 runtime + 5 dev packages; pipeline graph with full A-2/A-3/A-4 wiring; v0.3.0 version noted (119 lines) |
| schema.map.md            | present | ~80+ AST node kinds; AuthGraph/AuthGate/RoleEnum types; reachability types; ChunkKey/ChunkOutput/ChunksManifest/fnv1aHash; hasInternalLinks + chunkSizeBudgetBytes NEW S92; CGError.severity includes 'info' S92 (245 lines) |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags including --emit-per-route + --chunk-size-budget NEW S92; generate subcommand options (55 lines) |
| build.map.md             | present | 11 npm scripts; `--chunk-size-budget=N` flag NEW S92; `scrml generate auth` subcommand; pre-commit hook; CLI subcommands (90 lines) |
| error.map.md             | present | CGError + 9 runtime error classes; 4 W-CG-CHUNK-* codes + W-CG-CHUNK-PREFETCH-UNRESOLVED NEW S92 + E-CLOSURE-001 + W-AUTH-LOGIN-MISSING; CGError.severity updated to include 'info'; full E-/W-/I- families (185 lines) |
| test.map.md              | present | bun:test, 638 files, 12,694 pass; A-5 new test files enumerated + fixtures/a5/ fixtures (160 lines) |
| domain.map.md            | present | 35+ domain concepts; A-5 FULLY CLOSED S92; v0.3.0 STABLE status; Q-OPEN-4/5/6 closed; diagnostic fire-site table updated (210 lines) |
| events.map.md            | present | no compiler EventEmitter; channel placement rules; WebSocket pub/sub; A-4 chunk prefetch signals (65 lines) |
| api.map.md               | absent  | not applicable — compiler tool, not web API |
| state.map.md             | absent  | not applicable — compiler, not a frontend app |
| auth.map.md              | absent  | not applicable — auth lives in stdlib/auth and user .scrml programs |
| style.map.md             | absent  | not detected |
| i18n.map.md              | absent  | not detected |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no migrations dir |
| jobs.map.md              | absent  | stdlib/cron exists but compiler itself does not run jobs |
| non-compliance.report.md | present | 4 non-compliant (unchanged from S91); 3 uncertain (v0.3-approach-a-impl/SCOPING.md now more clearly superseded); ~141 compliant (S92 scan) |

## File Routing

types / interfaces / AST node kinds              → schema.map.md
auth-graph types (AuthGraph/AuthGate/RoleEnum)    → schema.map.md
reachability types (RSInput/RSOutput/ChunkPlan)   → schema.map.md
per-route splitter types (ChunkKey/ChunkOutput)   → schema.map.md
hasInternalLinks / hasPrefetchableLinks flags     → schema.map.md + domain.map.md (Q-OPEN-6)
fnv1a-hash primitive (FNV_OFFSET/FNV_PRIME)       → schema.map.md
getCompilerIdentity() / chunks.json `compiler`    → schema.map.md + domain.map.md (Q-OPEN-4)
environment variables / config keys               → config.map.md
CLI flags (--emit-per-route, --emit-reachability, --chunk-size-budget) → config.map.md + build.map.md
generate subcommand options                       → config.map.md
test patterns / fixtures / runner / A-5 suites   → test.map.md
build commands / CLI subcommands / hooks          → build.map.md
directory layout / entry points                   → structure.map.md
external packages / internal pipeline graph       → dependencies.map.md
business rules / pipeline stages / spec           → domain.map.md
error codes / warning families / handlers         → error.map.md
event bus / channel placement / chunk prefetch    → events.map.md
null/absence migration tasks                      → domain.map.md (Task-Shape Routing)
Approach A continuation (A-5) status             → domain.map.md (FULLY CLOSED S92)

## Key Facts
- Entry point is `compiler/src/cli.js` → `compiler/src/api.js` which orchestrates 15+ pipeline stages (BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→AuthGraph→RS→CG plus Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED)
- SPEC.md (~27,200+ lines) is normative; PIPELINE.md (v0.7.1, 2,758 lines) is the implementation contract. §34 + §40.9.11 catalog now includes W-CG-CHUNK-PREFETCH-UNRESOLVED (Q-OPEN-6 S92)
- Test suite: 638 files, 12,694 pass / ~117 skip / 1 todo / 0 fail at S92 close (13154ba); pre-commit hook gates on unit+integration+conformance subsets
- `null` and `undefined` do NOT exist in scrml at any level — SPEC §42 + §42.1.1 normative; `""` / `0` / `false` are DEFINED values; canonical absence is `not`; wire encoding is `{"__scrml_absent": true}` (SPEC §57)
- All Approach A sub-waves FULLY CLOSED: A-2 Reachability Solver (S91) + A-3 AuthGraph (S91) + A-4 Per-Route Splitter (S91) + A-5 Integration Tests (S92). v0.3.0 STABLE cut at 13154ba.
- chunks.json `compiler` field sourced from package.json `version` via `getCompilerIdentity()` (Q-OPEN-4 S92); format: `"scrml-0.3.0"`
- W-CG-CHUNK-NO-PREFETCH (Info) and W-CG-CHUNK-PREFETCH-UNRESOLVED (Warning) are mutually exclusive Q-OPEN-6 split (S92); discriminated by `CompileContext.hasInternalLinks`
- `--chunk-size-budget=N` CLI flag (Q-OPEN-5 S92) overrides CHUNK_LARGE_SOFT_BUDGET_BYTES (default 100,000 bytes) for W-CG-CHUNK-LARGE lint threshold

## Tags
#scrmlts #map #primary #s92 #v0.3.0 #approach-a #approach-a2 #approach-a3 #approach-a4 #approach-a5 #wire-format #auth-graph #null-eradication #reachability #m-7c-d-12 #route-splitter #fnv1a-hash #generate-auth #chunk-prefetch #q-open-4 #q-open-5 #q-open-6

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [events.map.md](./events.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
