# primary.map.md
# project: scrmlts
# updated: 2026-05-18T18:37:27-06:00  commit: 84c736e

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server + native lexer (Mn series)
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 21-module stdlib + native lexer (M1 ladder complete)
Size:       ~1,850+ source files (excluding node_modules/dist/.git);
            compiler/src ~115 .ts/.js files (includes NEW emit-form-for.ts, S102);
            compiler/native-parser/ 17 .scrml/.js shadow pairs + README (M1.1-M1.4 complete);
            SPEC.md ~27,700+ lines (§41.14 formFor +~638L at S102); SPEC-INDEX.md; PIPELINE.md v0.7.2 (S101);
            samples/compilation-tests: ~311 .scrml fixtures;
            Tests: 696 files (pre-commit subset) — **12,719 pass / 88 skip / 1 todo / 0 FAIL** (S103 HEAD);
            v0.3.3 tag cut at S102 `5815cf6`

## Key Facts (S103 / v0.3.3 era — 2026-05-18, commit 84c736e)

**Current shipped version: v0.3.3** (tag `5815cf6` at S102 close). v0.3.0 stable baseline at `13154ba`.

**S102-S103 major additions:**
- NEW `compiler/src/codegen/emit-form-for.ts` — §41.14 formFor source-level AST expander. `expandFormFor()` produces compound state-decl (Variant C §6.3.2) + `<form>` tree; rides existing §6.2 Shape 2 + §55 + §16 slots pipelines. 8 E-FORMFOR-* error codes wired in type-system.ts §41.14 pass. +58 tests / 0 regressions. formFor is the SECOND general-position L22 type-as-argument family member after parseVariant (§53.14).
- PGO Phase 3 wave: P3.A single-alternation regex collapse (−44% pipeline); P3.B detect-runtime-chunks fused probe + deferred assembleRuntime (−72% cumulative); P3.C owner-stack replaces O(n) findOwningRenderDGNode (−99.7% hotspot); P3.B-followup `FileAST.hasResetExpr` TAB cache (−71% additional residual). Trucking-dispatch: 2326ms → ~880ms = **−62% reduction**.
- S103: paren-form `is not` / `is some` codegen fix — `(expr) is not` → `((expr) == null)` without `_scrml_tmp_N` tmpvar lift. Prior undeclared tmpvar threw ReferenceError in ES-module strict mode. not-keyword.test.js §42.2.4 Phase A updated.
- M1.5 template-mode tracking — Acorn oracle updated in parser-conformance-lexer.test.js for template-interpolation regex-vs-division disambiguation. `expr-literals.js` bench-corpus retains "skip" pending M1.5 normalizer flip.
- NEW scripts: benchmark-perf-baseline.ts, perf-regression-check.ts, extract-readme-scrml.js, pre-push hook (release-tag README compile-gate).

**All Approach A sub-waves remain FULLY CLOSED (v0.3.0 baseline):**
- A-2 Reachability Solver (S91), A-3 AuthGraph (S91), A-4 Per-Route Splitter (S91), A-5 Integration Tests (S92). Q-OPEN-4/5/6 closed S92.

## Map Index

| Map                      | Status  | Contents |
|--------------------------|---------|----------|
| structure.map.md         | present | directory layout, entry points; NEW emit-form-for.ts + PGO P3 file changes + scripts + 696 test files (124 lines) |
| dependencies.map.md      | present | 5 runtime + 5 dev packages; pipeline graph with full A-2/A-3/A-4 wiring; v0.3.3 noted (128 lines) — NOT REGENERATED (deps unchanged) |
| schema.map.md            | present | ~85+ AST node kinds; FormForExpansion/FieldInfo/FormForValidator types (NEW S102); FileAST.hasResetExpr (PGO P3); RewriteContext; AuthGraph/RoleEnum; reachability types; ChunkKey/ChunkOutput; native-parser Token/TokenKind catalog (318 lines) |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags including --emit-per-route + --chunk-size-budget; generate subcommand options (64 lines) — NOT REGENERATED (config unchanged) |
| build.map.md             | present | 13 npm scripts; pre-push hook (S102 release-tag README gate); PGO tooling scripts; --chunk-size-budget flag; `scrml generate auth` subcommand; pre-commit hook; CLI subcommands (127 lines) |
| error.map.md             | present | CGError + 9 runtime error classes; 8 NEW E-FORMFOR-* codes (§41.14, S102); W-CG-CHUNK-* family; E-ENGINE-PAYLOAD-* (§51.0.B.1); E-TIMER-NAME-* (§51.0.M.1); full E-/W-/I- families (204 lines) |
| test.map.md              | present | bun:test, 696 files (pre-commit); 12,719 pass / 88 skip / 1 todo / 0 fail; formFor + paren-form-fix + M1.5 + AUTOLIFT + PGO P3 self-host parity tests enumerated (127 lines) |
| native-parser.map.md     | present | M1.x ladder status (M1.1-M1.4 COMPLETE, M1.5 pending); file catalog; TokenKind catalog; §51.0.Q.1 NESTED-ENGINE exemplar; D4 P3 heuristic; conformance test (101 lines) — NOT REGENERATED |
| domain.map.md            | present | 40+ domain concepts; formFor + PGO Phase 3 + paren-form fix + runtime-perf SCOPING concepts; v0.3.3 status; diagnostic fire-site table updated with 8 E-FORMFOR-* + 3 E-ENGINE-PAYLOAD-* (227 lines) |
| events.map.md            | present | no compiler EventEmitter; channel placement rules; WebSocket pub/sub; A-4 chunk prefetch signals (74 lines) — NOT REGENERATED (events unchanged) |
| non-compliance.report.md | present | updated S103 — 4 non-compliant (3 carried + 1 TIER-C-SCOPE); 2 uncertain (3 carried - 1 resolved + PGO SCOPING docs noted); ~175+ compliant; new S102 docs (pgo-scoping, formFor-scoping, runtime-perf-scoping) assessed |
| api.map.md               | absent  | not applicable — compiler tool, not web API |
| state.map.md             | absent  | not applicable — compiler, not a frontend app |
| auth.map.md              | absent  | not applicable — auth lives in stdlib/auth and user .scrml programs |
| style.map.md             | absent  | not detected |
| i18n.map.md              | absent  | not detected |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no migrations dir |
| jobs.map.md              | absent  | stdlib/cron exists but compiler itself does not run jobs |

## File Routing
types / interfaces / AST node kinds              → schema.map.md
formFor types (FormForExpansion/FieldInfo)        → schema.map.md
native-parser TokenKind / Token / QuoteKind      → schema.map.md + native-parser.map.md
auth-graph types (AuthGraph/AuthGate/RoleEnum)    → schema.map.md
reachability types (RSInput/RSOutput/ChunkPlan)   → schema.map.md
per-route splitter types (ChunkKey/ChunkOutput)   → schema.map.md
hasInternalLinks / hasPrefetchableLinks flags     → schema.map.md + domain.map.md
hasResetExpr cache field (PGO P3.B-followup)      → schema.map.md + domain.map.md
formFor AST expansion (expandFormFor)             → schema.map.md + domain.map.md + error.map.md
fnv1a-hash primitive (FNV_OFFSET/FNV_PRIME)       → schema.map.md
getCompilerIdentity() / chunks.json `compiler`    → schema.map.md + domain.map.md
environment variables / config keys               → config.map.md
CLI flags (--emit-per-route, --emit-reachability, --chunk-size-budget) → config.map.md + build.map.md
generate subcommand options                       → config.map.md
test patterns / fixtures / runner / formFor tests → test.map.md
native-parser M1.x ladder / file catalog         → native-parser.map.md
native-parser conformance test infrastructure    → test.map.md + native-parser.map.md
build commands / CLI subcommands / hooks          → build.map.md
PGO tooling scripts / perf-baseline.json          → build.map.md
directory layout / entry points                   → structure.map.md
external packages / internal pipeline graph       → dependencies.map.md
business rules / pipeline stages / spec           → domain.map.md
error codes / E-FORMFOR-* / warning families      → error.map.md
event bus / channel placement / chunk prefetch    → events.map.md
null/absence migration tasks                      → domain.map.md (Task-Shape Routing)
Approach A continuation status                   → domain.map.md (FULLY CLOSED S92)
§4.17 raw-content elements                        → domain.map.md + error.map.md (E-CTX-001)
§26.6 Tailwind typography plugin                  → domain.map.md
§41.14 formFor spec + impl                        → domain.map.md + error.map.md + schema.map.md + test.map.md
§51.0.B.1 payload-binding on state-children      → domain.map.md + error.map.md
§51.0.M.1 named timers / cancelTimer             → domain.map.md + error.map.md
§48.6.4 fn mutual-recursion / hoisting            → domain.map.md
paren-form `is not`/`is some` fix (S103)          → domain.map.md + error.map.md + test.map.md
PGO Phase 3 (S102)                               → domain.map.md + structure.map.md + schema.map.md

## Key Facts
- Entry point is `compiler/src/cli.js` → `compiler/src/api.js` which orchestrates 15+ pipeline stages (BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→AuthGraph→RS→CG plus Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED); PIPELINE.md v0.7.2 is the implementation contract
- SPEC.md (~27,700+ lines) is normative; §41.14 formFor NEW S102 (~638 additional lines); §34 + §40.9.11 catalog includes all E-FORMFOR-* (8 codes, S102) + W-CG-CHUNK-* + E-ENGINE-PAYLOAD-* (§51.0.B.1) + E-TIMER-NAME-* (§51.0.M.1)
- `null` and `undefined` do NOT exist in scrml at any level — SPEC §42 + §42.1.1 normative; `""` / `0` / `false` are DEFINED values; canonical absence is `not`; wire encoding is `{"__scrml_absent": true}` (SPEC §57)
- All Approach A sub-waves FULLY CLOSED: A-2 (S91) + A-3 (S91) + A-4 (S91) + A-5 (S92). v0.3.0 STABLE; v0.3.3 tag at S102 `5815cf6`
- `compiler/native-parser/` — bottom-up scrml-native JS lexer, M1 LADDER COMPLETE at M1.4 (S103). 17 .scrml/.js shadow pairs. 7 LexMode state-children active. 97 conformance tests pass. M1.5 template-mode tracking (oracle-side) landed S102; normalizer flip pending
- PGO Phase 3 trucking-dispatch: 2326ms → ~880ms (−62%); P3.A regex collapse + P3.B detect-runtime-chunks fused + P3.C owner-stack + P3.B-followup hasResetExpr — all CLOSED S102
- §41.14 formFor SHIPPED S102: type-system.ts §41.14 pass + emit-form-for.ts expandFormFor() + 8 E-FORMFOR-* codes + 3 test files (conf-form-for-canonical end-to-end verified); formFor is SECOND L22 family member; stdlib + sample-app + scrml.dev refresh → v0.4 anchor (per S101 user direction)
- S103 fix: `(expr) is not` / `(expr) is some` paren-form codegen drops undeclared `_scrml_tmp_N` tmpvar — was ReferenceError in ES-module strict mode; now `((expr) == null)` directly

## Tags
#scrmlts #map #primary #s103 #v0.3.3 #approach-a #approach-a2 #approach-a3 #approach-a4 #approach-a5 #wire-format #auth-graph #null-eradication #reachability #route-splitter #fnv1a-hash #generate-auth #chunk-prefetch #q-open-4 #q-open-5 #q-open-6 #native-parser #m1-4 #m1-5 #m1-ladder-complete #raw-content #typography #payload-binding #spec-51-0-b-1 #spec-4-17 #spec-26-6 #spec-48-6-4 #formfor #spec-41-14 #e-formfor #pgo-phase-3 #hasResetExpr #paren-form-fix #dq-12 #perf-baseline #pre-push #runtime-perf

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
- [native-parser.map.md](./native-parser.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
