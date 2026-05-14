# primary.map.md
# project: scrmlts
# updated: 2026-05-14  commit: b28f493

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 21-module stdlib
Size:       ~1,800+ source files (excluding node_modules/dist/.git); compiler/src ~111 .ts/.js files;
            SPEC.md ~27,200+ lines; SPEC-INDEX.md; PIPELINE.md v0.7.1 (2,758 lines);
            samples/compilation-tests: ~311 .scrml fixtures;
            Tests: 629 files — **12,517 pass / ~117 skip / 1 todo / 0 FAIL** (S91 close)

## Key Facts (S91 CLOSE — 2026-05-14, commit b28f493)

**Current shipped version: v0.2.6** — HEAD `b28f493` is NOT tagged; v0.3.0 cut path active.

**A-2 Reachability Solver FULLY CLOSED S91 (A-2.1..A-2.8):**
- A-2.7: outer fixed-point operator + E-CLOSURE-001 fire-site (`reachability/outer-fixpoint.ts`, ~463 LOC; 29 tests)
- A-2.8: canonical JSON serialization for `--emit-reachability` — stratified comparator, 21 determinism tests (10-run replay + CLI two-spawn diff)
- All 5 components (C1..C5) + outer-fixpoint + canonical JSON wired. Solver produces real per-role ChunkPlans.

**A-3 AuthGraph FULLY CLOSED S91 (A-3.1..A-3.5):**
- A-3.5 wired runAuthGraph() into api.js pipeline (Stage 7.55); RS Component 4 now receives real AuthGraph
- W-AUTH-LOGIN-MISSING two-tier severity added; `scrml generate auth` CLI subcommand added; `stdlib/auth/templates/login.scrml` template added (03-contact-book v0.2.x latent bug CLOSED)
- §40.9.9 case-fix landed

**A-4 Per-Route Artifact Splitter FULLY CLOSED S91 (A-4.1..A-4.7):**
- NEW `compiler/src/codegen/route-splitter.ts` (~1,100+ LOC): orchestrator + composeInitialChunk + composeTier1Chunk + composeTier2Chunk + computeChunkHash + finalizeChunkHash + emitChunkLints
- NEW `compiler/src/codegen/atom-emitter.ts` (~414 LOC): per-id atom helpers (emitReactiveCellAtom / emitServerFnStubAtom / emitVendorUnitRef / emitComponentAtom)
- NEW `compiler/src/codegen/fnv1a-hash.ts`: shared FNV-1a 32-bit base36 primitive (SPEC §47.1.3 normative; re-exported from type-encoding.ts)
- NEW runtime helpers in `compiler/src/runtime-template.js`: `_scrml_prefetch_tier1` + `_scrml_prefetch_tier2` + `_scrml_fetch_chunk` + `_scrml_chunk_mount` + `_scrml_vendor_require` + manifest scaffolds
- NEW `prefetch` + `mount` + `vendor-ref` runtime chunk markers in `runtime-chunks.ts`
- NEW per-route HTML augmentation (`augmentHtmlForChunks`) in `emit-html.ts` (~295 LOC): `_SCRML_CHUNKS` inline + `<link rel="modulepreload">` + role-detection bootstrap
- Per-route codegen orchestrator wire-in in `codegen/index.ts` (`emitPerRoute` opt-in flag per OQ-A4-F)
- SPEC §34 + §40.9.11 catalog rows: W-CG-CHUNK-EMPTY + W-CG-CHUNK-LARGE + W-CG-CHUNK-NO-PREFETCH + W-CG-CHUNK-MISSING-ROLE + W-AUTH-LOGIN-MISSING + A-3 codes
- NEW `compiler/src/commands/generate.js` (`scrml generate auth` CLI)
- NEW `stdlib/auth/templates/login.scrml` (adopter-owned login template)
- 12 new test files: 7 unit + 4 integration + 1 command tests; +242 vs S90 close

**Chunks ACTIVATE in adopter browsers (A-4 wave-close status).**

**Test suite growth S91:** 12,275 → 12,517 (+242 passing tests; +12 new test files across 30 PA-authored commits)

## Map Index

| Map                      | Status  | Contents |
|--------------------------|---------|----------|
| structure.map.md         | present | directory layout, entry points, S91 new/modified files (118 lines) |
| dependencies.map.md      | present | 5 runtime + 5 dev packages; pipeline graph with full A-2/A-3/A-4 wiring (119 lines) |
| schema.map.md            | present | ~80+ AST node kinds; AuthGraph/AuthGate/RoleEnum types; reachability types; NEW ChunkKey/ChunkOutput/ChunksManifest/fnv1aHash; wire-format exports; IR; CompileContext (240 lines) |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags including --emit-per-route [NEW S91]; generate subcommand options [NEW S91] (55 lines) |
| build.map.md             | present | 11 npm scripts; `scrml generate auth` subcommand [NEW S91]; pre-commit hook; CLI subcommands (86 lines) |
| error.map.md             | present | CGError + 9 runtime error classes; 4 new W-CG-CHUNK-* codes + E-CLOSURE-001 + W-AUTH-LOGIN-MISSING [NEW S91]; full E-/W-/I- families (178 lines) |
| test.map.md              | present | bun:test, 629 files, 12,517 pass; S91 new test files enumerated; A-4 wave test anchors (148 lines) |
| domain.map.md            | present | 35+ domain concepts; S91: A-2 FULLY CLOSED, A-3 FULLY CLOSED, A-4 FULLY CLOSED; diagnostic fire-site table updated; Task-Shape Routing (178 lines) |
| events.map.md            | present | no compiler EventEmitter; channel placement rules; WebSocket pub/sub; A-4 chunk prefetch signals [NEW S91] (65 lines) |
| api.map.md               | absent  | not applicable — compiler tool, not web API |
| state.map.md             | absent  | not applicable — compiler, not a frontend app |
| auth.map.md              | absent  | not applicable — auth lives in stdlib/auth and user .scrml programs |
| style.map.md             | absent  | not detected |
| i18n.map.md              | absent  | not detected |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no migrations dir |
| jobs.map.md              | absent  | stdlib/cron exists but compiler itself does not run jobs |
| non-compliance.report.md | present | 4 non-compliant (unchanged from S90); 3 uncertain (+1 new: A-4 SCOPING status line); 131 compliant (S91 scan) |

## File Routing

types / interfaces / AST node kinds             → schema.map.md
auth-graph types (AuthGraph/AuthGate/RoleEnum)   → schema.map.md
reachability types (RSInput/RSOutput/ChunkPlan)  → schema.map.md
per-route splitter types (ChunkKey/ChunkOutput)  → schema.map.md
fnv1a-hash primitive (FNV_OFFSET/FNV_PRIME)      → schema.map.md
wire-format types + helpers                      → schema.map.md
environment variables / config keys              → config.map.md
CLI flags (--emit-per-route, --emit-reachability) → config.map.md + build.map.md
generate subcommand options                      → config.map.md
test patterns / fixtures / runner                → test.map.md
build commands / CLI subcommands / hooks         → build.map.md
directory layout / entry points                  → structure.map.md
external packages / internal pipeline graph      → dependencies.map.md
business rules / pipeline stages / spec          → domain.map.md
error codes / warning families / handlers        → error.map.md
event bus / channel placement / chunk prefetch   → events.map.md
null/absence migration tasks                     → domain.map.md (Task-Shape Routing)
Approach A continuation (A-5)                    → domain.map.md (Task-Shape Routing)
W-AUTH-LOGIN-MISSING resolution                  → domain.map.md (scrml generate auth)

## Key Facts
- Entry point is `compiler/src/cli.js` → `compiler/src/api.js` which orchestrates 15+ pipeline stages (BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→AuthGraph→RS→CG plus Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED)
- SPEC.md (~27,200+ lines) is normative; PIPELINE.md (v0.7.1, 2,758 lines) is the implementation contract. §34 + §40.9.11 catalog extended S91 with W-CG-CHUNK-* + W-AUTH-LOGIN-MISSING
- Test suite: 629 files, 12,517 pass / ~117 skip / 1 todo / 0 fail at S91 close (b28f493); pre-commit hook gates on unit+integration+conformance subsets
- `null` and `undefined` do NOT exist in scrml at any level — SPEC §42 + §42.1.1 normative; `""` / `0` / `false` are DEFINED values; canonical absence is `not`; wire encoding is `{"__scrml_absent": true}` (SPEC §57)
- A-2 Reachability Solver (A-2.1..A-2.8) FULLY CLOSED: all 5 components + outer fixed-point (A-2.7) + canonical JSON (A-2.8) + real-AuthGraph feed (A-3.5). Solver produces real per-role ChunkPlans.
- A-3 AuthGraph (A-3.1..A-3.5) FULLY CLOSED: runAuthGraph() wired into api.js at Stage 7.55; W-AUTH-LOGIN-MISSING + `scrml generate auth` + login.scrml template closes 03-contact-book v0.2.x latent bug
- A-4 Per-Route Artifact Splitter (A-4.1..A-4.7) FULLY CLOSED: chunks ACTIVATE in adopter browsers; FNV-1a content-addressing (§47.5 normative); role-detection bootstrap; W-CG-CHUNK-* lint family; --emit-per-route opt-in (default-on at v0.3.0 cut per OQ-A4-F)
- Next priority: A-5 integration tests (end-to-end adopter scenarios); stdlib/http async migration (4 W-TRY-CATCH sites)

## Tags
#scrmlts #map #primary #s91 #v0.3 #approach-a #approach-a2 #approach-a3 #approach-a4 #wire-format #auth-graph #null-eradication #reachability #m-7c-d-12 #route-splitter #fnv1a-hash #generate-auth #chunk-prefetch

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
