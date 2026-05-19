# primary.map.md
# project: scrmlts
# updated: 2026-05-19T12:00:00-06:00  commit: d8427f2

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server + native lexer (Mn series)
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 21-module stdlib + native lexer (M1 ladder complete)
Size:       ~1,860+ source files (excluding node_modules/dist/.git);
            compiler/src ~117 .ts/.js files (includes NEW emit-form-for.ts S102 + NEW emit-table-for.ts S105);
            compiler/native-parser/ 17 .scrml/.js shadow pairs + README (M1.1-M1.5 complete);
            SPEC.md ~27,800+ lines (§41.16 tableFor +~210L at S105 + §34 +13 E-TABLEFOR-* rows); SPEC-INDEX.md; PIPELINE.md v0.7.2 (S101);
            samples/compilation-tests: ~311 .scrml fixtures;
            Tests: 708 files (full pre-push gate) — **15,841 pass / 173 skip / 1 todo / 0 FAIL** (S105 HEAD);
            pre-commit subset: **12,998 pass / 92 skip / 1 todo / 0 fail / 675 files**;
            v0.3.3 tag at S102 `5815cf6`; pkg.json at 0.3.0 (no new tag cut S103-S105)

## Key Facts (S105 / post-v0.3.3 era — 2026-05-19, commit d8427f2)

**Current shipped version: v0.3.3** (tag `5815cf6` at S102 close). v0.3.0 stable baseline at `13154ba`.

**S104-S105 major additions (the 34-commit window since the S103 maps watermark `84c736e`):**

- **§41.16 tableFor SHIPPED end-to-end (S105 `1fdeef8` + `a834e38`)** — FOURTH general-position L22 type-as-argument family member after parseVariant + formFor + schemaFor. Markup-element form `<tableFor for=StructType rows=@cell/>` per OQ-TF-1 synthesis-mode verdict 53/60 (vs Form B function-call 34/60 vs Form C block-attribute 29/60; 19-point margin). NEW `compiler/src/codegen/emit-table-for.ts` source-level AST expander; `compiler/src/type-system.ts` collectTableForImports + walkAndExpandTableForNodes pattern (mirror of formFor + schemaFor). 13 `E-TABLEFOR-*` codes in §34. 84 new tests (68 unit + 16 integration). stdlib re-export `stdlib/data/table-for.scrml` + `TableSort:struct` type. 1452L deep-dive at scrml-support `67fe2b8`. 3 documented SPEC deviations + 7 v1.next follow-ups.
- **§41.15 schemaFor SHIPPED (S104 `8a6cd85`)** — THIRD L22 family member; FUNCTION-CALL form `${ schemaFor(Users) }` per OQ-SCH-1 debate verdict (Form B 50/60). NEW `compiler/src/codegen/emit-schema-for.ts` 386L; 8 `E-SCHEMAFOR-*` codes; flagship OQ-SCH-12 enum lowering (`status: Status req` → `text req oneOf([variants...])` → SQL `CHECK (col IN (...))`). 62 tests.
- **§48.6.4 pinned fn SHIPPED end-to-end (S105 `dc3c460` + `7910162`)** — SPEC §48.6.4 normative semantics landed S98; parser recognition + symbol-table forward-ref enforcement BOTH landed S105. AST `FunctionDeclNode.isPinned?: boolean` field; 6 form variants supported (`pinned fn` / `pinned async fn` / `pinned pure fn` / `pinned server fn` / `pinned async server fn` / `pinned pure server fn`); NEW SYM PASS 19 in `compiler/src/symbol-table.ts` walks every CallExpr in every ExprNode payload, fires E-STATE-PINNED-FORWARD-REF when readPos < declSpan.start. **Important distinction vs B4 cell-pinned-forward-ref**: A4 uses `declSpan.start` (not `.end` like B4) because fn semantics admit self-recursion. 30 unit tests (16 parser + 14 forward-ref).
- **Reactive Boolean attr wiring SHIPPED (S105 `4956a02`)** — closes §41.14 formFor follow-on (`disabled=!@cell` was silently dropping). Added `REACTIVE_BOOL_ATTRS = new Set(["disabled", "readonly", "required"])` to `compiler/src/codegen/emit-html.ts:41`; dispatch at `:1508`; runtime `_scrml_effect` toggles attribute presence via setAttribute/removeAttribute. 13 unit tests + emit-form-for.ts comment block updated.
- **G1 bug-18 §5 happy-dom env reset SHIPPED (S105 `5a7441b`)** — closed pre-existing test-isolation failure. Root cause: runtime IIFE effect leak across closures (browser-components.test.js's runtime IIFE writes effects to closure-held DOM refs; effects persist across tests + re-fire when bug-18 §5 sets body.innerHTML). Fix: GlobalRegistrator.unregister + register at top of bug-18 §5. **v0.4 follow-up filed: structural cleanup of browser-test effect-leak pattern.**
- **Phase 3 select-row chip-away SHIPPED (S103 `91fcc72` + `47d3bb8`)** — runtime-perf Phase 2 attribution dive identified LEGACY `_scrml_subscribers` O(n) walk; Candidate A value-indexed predicate-bind subscription -80% wall + `!=` detector extension cumulative -98% wall. select-row 4.97ms → **0.12ms happy-dom + 0.30ms Chrome** (vs 168.2ms v0.3.0 STABLE = **561× faster**).
- **Playwright Chrome bench port SHIPPED (S103 `129fcbe`)** — closed Q-RUNTIME-OPEN-2; vanilla 5th baseline + new dated Chrome row at `benchmarks/RESULTS.md`; v0.3.0 STABLE row preserved as Historical.

**L22 family roster at S105 close:** parseVariant ✓ S65 · formFor ✓ S102-S103 · schemaFor ✓ S104 · serialize ✗ STASHED S103 (§53.14.4 Gate 2 synonym-risk) · **tableFor ✓ S105** · variantNames / reflective planned. Discipline-health datum: 3 debate-05 rejections + 1 STASHED vs **4** advancements — §53.14.4 filter empirically working.

**All Approach A sub-waves remain FULLY CLOSED (v0.3.0 baseline):**
- A-2 Reachability Solver (S91), A-3 AuthGraph (S91), A-4 Per-Route Splitter (S91), A-5 Integration Tests (S92). Q-OPEN-4/5/6 closed S92.

## Map Index

| Map                      | Status  | Contents |
|--------------------------|---------|----------|
| structure.map.md         | present | directory layout, entry points; emit-form-for.ts + emit-table-for.ts (NEW S105) + emit-schema-for.ts (NEW S104) + PGO P3 file changes + 708 test files (124 lines) |
| dependencies.map.md      | present | 5 runtime + 5 dev packages; pipeline graph with full A-2/A-3/A-4 wiring (128 lines) — NOT REGENERATED (deps unchanged) |
| schema.map.md            | present | ~85+ AST node kinds; FormForExpansion/FieldInfo/FormForValidator types; SchemaForExpansion + 5 helpers; **TableForExpansion + TableForColumnInfo + TableForSelectionInfo (NEW S105)**; FunctionDeclNode.isPinned (NEW S105); FileAST.hasResetExpr (PGO P3); RewriteContext; AuthGraph/RoleEnum; reachability types; ChunkKey/ChunkOutput; native-parser Token/TokenKind catalog |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags including --emit-per-route + --chunk-size-budget; generate subcommand options (64 lines) — NOT REGENERATED (config unchanged) |
| build.map.md             | present | 13 npm scripts; pre-push hook (S102 release-tag README gate); PGO tooling scripts; --chunk-size-budget flag; `scrml generate auth` subcommand; pre-commit hook; CLI subcommands (127 lines) |
| error.map.md             | present | CGError + 9 runtime error classes; **13 NEW E-TABLEFOR-* codes (§41.16, S105)**; 8 E-SCHEMAFOR-* (§41.15, S104); 8 E-FORMFOR-* (§41.14, S102); **PASS 19 pinned-fn-forward-ref (S105)**; W-CG-CHUNK-* family; E-ENGINE-PAYLOAD-* (§51.0.B.1); E-TIMER-NAME-* (§51.0.M.1); REACTIVE_BOOL_ATTRS dispatch (S105); full E-/W-/I- families |
| test.map.md              | present | bun:test, 708 files (full pre-push); 15,841 pass / 173 skip / 1 todo / 0 fail; pre-commit subset 12,998 / 675 files; **tableFor + pinned-fn-parser + pinned-fn-forward-ref + reactive-bool-attrs (NEW S105)**; schemaFor (S104); formFor + paren-form-fix + M1.5 + AUTOLIFT + PGO P3 self-host parity |
| native-parser.map.md     | present | M1.x ladder status (M1.1-M1.5 COMPLETE); file catalog; TokenKind catalog; §51.0.Q.1 NESTED-ENGINE exemplar; D4 P3 heuristic; conformance test (101 lines) — NOT REGENERATED |
| domain.map.md            | present | 40+ domain concepts; **tableFor (§41.16) + TableSort struct + PASS 19 pinned-fn + REACTIVE_BOOL_ATTRS (NEW S105)**; schemaFor (§41.15, S104); formFor + PGO Phase 3 + paren-form fix + Phase 3 select-row chip-away; v0.3.3 status; diagnostic fire-site table updated with 13 E-TABLEFOR-* + 8 E-SCHEMAFOR-* + 8 E-FORMFOR-* + 3 E-ENGINE-PAYLOAD-* |
| events.map.md            | present | no compiler EventEmitter; channel placement rules; WebSocket pub/sub; A-4 chunk prefetch signals (74 lines) — NOT REGENERATED (events unchanged) |
| non-compliance.report.md | present | updated S105 — runtime-perf SCOPING status flipped (Phase 1-3 SHIPPED S103); §48.6.4 SPEC "implementation-pending" sentence flipped (S105 commits `dc3c460`+`7910162`); 5 S104-derefed items now archived to scrml-support |
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
schemaFor types (SchemaForExpansion + helpers)    → schema.map.md
**tableFor types (TableForExpansion / TableForColumnInfo / TableForSelectionInfo)** → schema.map.md
**FunctionDeclNode.isPinned field (S105 pinned-fn parser)** → schema.map.md + domain.map.md
native-parser TokenKind / Token / QuoteKind      → schema.map.md + native-parser.map.md
auth-graph types (AuthGraph/AuthGate/RoleEnum)    → schema.map.md
reachability types (RSInput/RSOutput/ChunkPlan)   → schema.map.md
per-route splitter types (ChunkKey/ChunkOutput)   → schema.map.md
hasInternalLinks / hasPrefetchableLinks flags     → schema.map.md + domain.map.md
hasResetExpr cache field (PGO P3.B-followup)      → schema.map.md + domain.map.md
formFor AST expansion (expandFormFor)             → schema.map.md + domain.map.md + error.map.md
schemaFor AST expansion (expandSchemaFor)         → schema.map.md + domain.map.md + error.map.md
**tableFor AST expansion (expandTableForElement)** → schema.map.md + domain.map.md + error.map.md
fnv1a-hash primitive (FNV_OFFSET/FNV_PRIME)       → schema.map.md
getCompilerIdentity() / chunks.json `compiler`    → schema.map.md + domain.map.md
environment variables / config keys               → config.map.md
CLI flags (--emit-per-route, --emit-reachability, --chunk-size-budget) → config.map.md + build.map.md
generate subcommand options                       → config.map.md
test patterns / fixtures / runner / formFor tests / **tableFor tests** → test.map.md
native-parser M1.x ladder / file catalog         → native-parser.map.md
native-parser conformance test infrastructure    → test.map.md + native-parser.map.md
build commands / CLI subcommands / hooks          → build.map.md
PGO tooling scripts / perf-baseline.json          → build.map.md
directory layout / entry points                   → structure.map.md
external packages / internal pipeline graph       → dependencies.map.md
business rules / pipeline stages / spec           → domain.map.md
error codes / E-FORMFOR-* / E-SCHEMAFOR-* / **E-TABLEFOR-*** / warning families → error.map.md
event bus / channel placement / chunk prefetch    → events.map.md
null/absence migration tasks                      → domain.map.md (Task-Shape Routing)
Approach A continuation status                   → domain.map.md (FULLY CLOSED S92)
§4.17 raw-content elements                        → domain.map.md + error.map.md (E-CTX-001)
§26.6 Tailwind typography plugin                  → domain.map.md
§41.14 formFor spec + impl                        → domain.map.md + error.map.md + schema.map.md + test.map.md
§41.15 schemaFor spec + impl                      → domain.map.md + error.map.md + schema.map.md + test.map.md
**§41.16 tableFor spec + impl (S105)**            → domain.map.md + error.map.md + schema.map.md + test.map.md
§51.0.B.1 payload-binding on state-children      → domain.map.md + error.map.md
§51.0.M.1 named timers / cancelTimer             → domain.map.md + error.map.md
**§48.6.4 fn mutual-recursion / pinned fn (SHIPPED S105)** → domain.map.md + schema.map.md (isPinned field) + error.map.md (PASS 19)
**REACTIVE_BOOL_ATTRS dispatch (disabled/readonly/required; S105)** → error.map.md + domain.map.md + test.map.md
paren-form `is not`/`is some` fix (S103)          → domain.map.md + error.map.md + test.map.md
PGO Phase 3 (S102)                               → domain.map.md + structure.map.md + schema.map.md
Phase 3 select-row chip-away (S103; -98% wall)   → domain.map.md
Phase 3.B partial-update + swap-rows (SCOPING S104; OQs ratified S105) → docs/changes/runtime-perf-phase-3-partial-update-and-swap/

## Task-Shape Routing

When a dev agent receives a task, the agent reads `primary.map.md` first then consults the maps below per shape:

| Task shape | Read these maps |
|------------|-----------------|
| Codegen bug-fix (HTML/CSS/JS emit) | structure.map.md + domain.map.md + error.map.md |
| **tableFor follow-on (v1.next or v1.0 bugfix)** | schema.map.md (TableForExpansion shape) + error.map.md (13 E-TABLEFOR-*) + domain.map.md (§41.16 concept) + test.map.md |
| **pinned-fn follow-on / SYM pass extension** | schema.map.md (FunctionDeclNode.isPinned) + error.map.md (PASS 19) + domain.map.md |
| **Reactive Boolean attr extension (checked/selected/hidden)** | error.map.md (REACTIVE_BOOL_ATTRS Set + dispatch site) + domain.map.md + test.map.md |
| schemaFor follow-on | schema.map.md (SchemaForExpansion) + error.map.md (8 E-SCHEMAFOR-*) + domain.map.md + test.map.md |
| formFor follow-on | schema.map.md (FormForExpansion) + error.map.md (8 E-FORMFOR-*) + domain.map.md + test.map.md |
| Phase 3.B B2 same-keys-in-same-order fast-path | docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md + dist/scrml-runtime.js |
| Phase 3.B B4 count-derived dep precision | docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md + dep graph instrumentation |
| OQ-TF-13 helper extraction (validateTypeArgument) | schema.map.md (3 callers: formFor/schemaFor/tableFor/parseVariant) + L22 family-vocabulary refactor pattern |
| Native parser M2 expression parser | native-parser.map.md + DD §D7 §D8 |
| Self-host bootstrap broken-import | compiler/scripts/build-self-host.js + compiler/self-host/meta-checker.scrml |
| SPEC amendment | SPEC-INDEX.md FIRST, then SPEC.md offset+limit; Rule 4 mandates spec text wins over derived docs |
| Stage contract change (PIPELINE.md) | PIPELINE.md FIRST, then per-stage README in compiler/src/ |

## Key Facts
- Entry point is `compiler/src/cli.js` → `compiler/src/api.js` which orchestrates 15+ pipeline stages (BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→AuthGraph→RS→CG plus Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED); PIPELINE.md v0.7.2 is the implementation contract
- SPEC.md (~27,800+ lines) is normative; §41.16 tableFor NEW S105 (~210L) + §41.15 schemaFor NEW S104 (~170L) + §41.14 formFor NEW S102 (~638L); §34 catalog includes 13 E-TABLEFOR-* (S105) + 8 E-SCHEMAFOR-* (S104) + 8 E-FORMFOR-* (S102) + W-CG-CHUNK-* + E-ENGINE-PAYLOAD-* + E-TIMER-NAME-*
- `null` and `undefined` do NOT exist in scrml at any level — SPEC §42 + §42.1.1 normative; `""` / `0` / `false` are DEFINED values; canonical absence is `not`; wire encoding is `{"__scrml_absent": true}` (SPEC §57)
- All Approach A sub-waves FULLY CLOSED: A-2 (S91) + A-3 (S91) + A-4 (S91) + A-5 (S92). v0.3.0 STABLE; v0.3.3 tag at S102 `5815cf6`
- `compiler/native-parser/` — bottom-up scrml-native JS lexer, M1 LADDER COMPLETE through M1.5 (S103). 17 .scrml/.js shadow pairs. 7 LexMode state-children active. 97 conformance tests pass
- PGO Phase 3 trucking-dispatch: 2326ms → ~880ms (−62%); P3.A regex collapse + P3.B detect-runtime-chunks fused + P3.C owner-stack + P3.B-followup hasResetExpr — all CLOSED S102
- Phase 3 select-row chip-away (S103): -98% wall on select-row; 4.97ms → 0.12ms happy-dom + 0.30ms Chrome; 561× faster than v0.3.0 STABLE
- §41.14 formFor SHIPPED S102; §41.15 schemaFor SHIPPED S104; **§41.16 tableFor SHIPPED S105**: type-system.ts §41.16 pass + emit-table-for.ts expandTableForElement() + 13 E-TABLEFOR-* codes + 84 tests; stdlib re-export `stdlib/data/table-for.scrml` + `TableSort:struct` type
- **§48.6.4 pinned fn SHIPPED end-to-end S105**: AST `FunctionDeclNode.isPinned?: boolean` + parser recognition `dc3c460` + SYM PASS 19 forward-ref enforcement `7910162` + 30 unit tests
- **REACTIVE_BOOL_ATTRS dispatch S105**: `disabled` / `readonly` / `required` use setAttribute/removeAttribute toggle via `_scrml_effect`; closes §41.14 formFor follow-on; +13 tests

## Tags
#scrmlts #map #primary #s105 #v0.3.3 #approach-a #approach-a2 #approach-a3 #approach-a4 #approach-a5 #wire-format #auth-graph #null-eradication #reachability #route-splitter #fnv1a-hash #generate-auth #chunk-prefetch #q-open-4 #q-open-5 #q-open-6 #native-parser #m1-5 #m1-ladder-complete #raw-content #typography #payload-binding #spec-51-0-b-1 #spec-4-17 #spec-26-6 #spec-48-6-4 #pinned-fn-shipped #formfor #spec-41-14 #e-formfor #schemafor #spec-41-15 #e-schemafor #tablefor #spec-41-16 #e-tablefor #l22-4-of-6 #reactive-bool-attrs #pgo-phase-3 #hasResetExpr #paren-form-fix #phase-3-select-row #dq-12 #perf-baseline #pre-push #runtime-perf #561x-chrome

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
