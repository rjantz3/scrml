# primary.map.md
# project: scrmlts
# updated: 2026-06-03T21:31:18Z  commit: 97fe2199

## Project Fingerprint
Language:   TypeScript / JavaScript (mixed; Bun runtime)
Framework:  Custom compiler pipeline (no web framework)
Runtime:    Bun >=1.3.13
Type:       CLI compiler + language toolchain (single-file full-stack web language compiler)
Size:       ~1400 source files (880+ test + 143+ compiler/src + 30 native-parser + stdlib + lsp)
Version:    v0.7.0 (project-tracked; compiler/package.json reads 0.2.0 — subpackage drift, ignore)

## Map Index

| Map                  | Status  | Contents                                                      |
|----------------------|---------|---------------------------------------------------------------|
| structure.map.md     | present | directory layout, entry points, S148-S158 source changes (engine-graph, source-map, _scrml_modules, dev watcher, Shape 4, S153 each-in-dynamic-context, S154 message-arm parser, S155 #14 typer+codegen, S156 Bug 62 engine-ctx + (d)-A enum-subset 4 batches, S157 Bug 60/63/65/67/68/70/71 + match-exhaustiveness, S158 Bug 64/R28-1c per-item-reactivity + Bug 72 nested-each-in-lift) |
| dependencies.map.md  | present | 9 packages (3 runtime root + 2 compiler + 4 devDeps), internal graph (HEADER STALE — content not touched by S154-S158, last refreshed 4e1f9492) |
| schema.map.md        | present | ~47 AST node types + `acceptsType` on EngineDeclNode (S154) + `subsetVariants` on PredicatedType (S156) + MessageArmEntry + EnumSubsetParse (S155-S156) + `EachEngineCtx` + `EachReconcileCtx` (S156-S158) + `matchExpr` side-field on ReactiveDeclNode (S157 Bug 71) |
| config.map.md        | present | 4 env vars, 3 config files (HEADER STALE — last refreshed 948d3f2f) |
| build.map.md         | present | 12 npm scripts, maintenance scripts, pre-commit hook (HEADER STALE — last refreshed 948d3f2f) |
| error.map.md         | present | 379+ error codes; +5 new S154-S156 codes (E-ENGINE-ACCEPTS-NOT-ENUM, E-ENGINE-MSG-WITHOUT-ACCEPTS, E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE, E-ENGINE-MSG-UNKNOWN, E-MATCH-SUBSET-DEAD-ARM); S157 E-SYNTAX-064 promoted to explicit; E-CODEGEN-INVALID-JS Bug 70 suppression |
| test.map.md          | present | bun:test, ~880 .test.js files; +11 S154-S156 unit+browser+conformance tests; +11 S157-S158 unit+browser tests (bug60/63/64/65/70/71/72/r28-1c) |
| domain.map.md        | present | 12-stage pipeline + sidecar, 30+ domain concepts incl. S153 each-in-dynamic-context, S155 `accepts=`/message-dispatch/#14 plane, S156 Bug 62 engine-ctx threading, S157 Bug 65 CLOSED (lift engine-ctx) + Bug 60 CLOSED (render-by-tag compound) + match-exhaustiveness arc, S158 Bug 64/R28-1c CLOSED (per-item-reactivity + live-keyed) + Bug 72 CLOSED (nested-each-in-lift); codegen each/match/engine emit map |
| api.map.md           | absent  | no HTTP route handlers in compiler source                     |
| state.map.md         | absent  | no client state management (compiler is a pure function)      |
| events.map.md        | absent  | no EventEmitter/pubsub detected in compiler source            |
| auth.map.md          | absent  | auth is a COMPILED FEATURE (auth-graph.ts), not compiler auth |
| style.map.md         | absent  | no design tokens or CSS framework in compiler source          |
| i18n.map.md          | absent  | no i18n detected                                              |
| infra.map.md         | absent  | no Dockerfile, CI workflows, or IaC detected                  |
| migrations.map.md    | absent  | no database migrations (runtime DBs are user-app concerns)    |
| jobs.map.md          | absent  | no job scheduler in compiler source                           |

## File Routing

| Query | Map |
|-------|-----|
| types / interfaces / AST node shapes | schema.map.md |
| error codes / CGError / diagnostic stream / fix-notes | error.map.md |
| environment variables / config keys | config.map.md |
| test patterns / fixtures / conformance / happy-dom canaries | test.map.md |
| build commands / pre-commit hook | build.map.md |
| directory layout / entry points / pipeline stages / per-session source changes | structure.map.md |
| external packages (acorn, astring, MCP SDK, vscode-languageserver) | dependencies.map.md |
| domain concepts (pipeline stages, engine-graph, source-map, each/match emit, enum-subset, message-dispatch, per-item-reactivity, live-keyed, render-by-tag, match-exhaustiveness) | domain.map.md |
| business invariants (null-not-in-scrml, auth-content-not-gated, arm-separator, Shape 4, each-chunk-survival, dep-first-read, engine-ctx-threading, subset-range-forbidden, per-item-live-keyed, _scrml_resolve_item-null-not-undefined, E-CODEGEN-suppressed-on-prior-fatal) | domain.map.md |
| `<each>` / `<match>` / engine codegen emit modules | domain.map.md "Codegen each/match/engine Emit Map" + structure.map.md S154-S158 |

## Task-Shape Routing (agents — read this section first)

This is a COMPILER repo. Task shapes are bug-fix / codegen / parser / new-feature / spec-amendment /
test-authoring / audit. Each shape lists maps in priority order — read in order until oriented.

**compiler-source bug fix (the dominant shape — most dispatches):**
1. `error.map.md` — find the offending code, its family, AND the "Fix Notes" for any prior fix on the same class (the S153 each-in-dynamic-context, S157 Bug 65/Bug 60, S158 Bug 64/R28-1c/Bug 72 notes are pattern templates — read them before re-diagnosing)
2. `domain.map.md` — locate the responsible pipeline stage + its primary source file (Pipeline Source Files table) and any relevant invariant
3. `structure.map.md` — the "Key S154-S158 Source Changes" section gives exact file + function + line for recently-touched code; the codegen directory ownership line names the emit-* module
4. `test.map.md` — find the existing canary for the feature; a behavior fix WITHOUT a happy-dom test is the S140/S152 blind-spot trap — always add one

**codegen (`<each>` / `<match>` / engine / emit-* work — highest-churn area right now):**
1. `domain.map.md` — the **"Codegen `<each>` / `<match>` / engine Emit Map"** table (the single most load-bearing table for codegen work; names every emit module + its role + the S153-S158 runtime helpers and Bug 62/64/65/72 patterns)
2. `structure.map.md` — S154-S158 source-changes section: exact functions + line numbers in emit-each.ts / emit-lift.js / emit-control-flow.ts / emit-engine.ts / emit-html.ts / runtime-template.js / dependency-graph.ts / ast-builder.js / type-system.ts
3. `error.map.md` — E-CODEGEN-INVALID-JS fix notes + chunk-survival / dep-first-read / engine-ctx-threading / per-item-live-keyed invariants (a codegen change that tree-shakes a needed chunk → ReferenceError; engine-ctx absence → silent wrong JS; per-item binding without reconcile-ctx wrap → stale content)
4. `test.map.md` — happy-dom canary list; emit-string-only tests mask runtime miscompiles

**per-item reactivity / reconcile (`<each>` and `${for…lift}` live-keyed bindings — R28-1c closed S158):**
1. `domain.map.md` — Bug 64/R28-1c concept + `_scrml_reconcile_list` key→item map + `_scrml_resolve_item` contract + `maybeWrapEachPerItemEffect`/`maybeWrapLiftPerItemEffect` invariants
2. `schema.map.md` — `EachReconcileCtx` + `EachEngineCtx` shapes
3. `error.map.md` — Bug 64 fix note (three-layer fix: runtime + Tier-1 + Tier-0; `_scrml_resolve_item` returns null not undefined)
4. `structure.map.md` — S158 changes: emit-each.ts (1634L), emit-lift.js (2205L), emit-control-flow.ts (2013L), runtime-template.js (3760L)

**parser / grammar fix (block-splitter / ast-builder / engine-statechild-parser / native-parser):**
1. `domain.map.md` — pipeline stage (BS/TAB) + engine-arm-parsing row; the native-parser M5-swap precondition (does NOT promote each/match → structural nodes)
2. `structure.map.md` — engine-statechild-parser.ts S154 `parseMessageArms()` + S153 `isColonShorthandOpener` change + native-parser directory note; S158 ast-builder `_parseLiftAttrValue` bare-`@` branch
3. `error.map.md` — E-ENGINE-STATE-CHILD-MISSING / E-ENGINE-ACCEPTS-NOT-ENUM / E-ENGINE-MSG-* / E-CTX-* / E-EXPR-* / E-STMT-* / E-SYNTAX-064 families
4. `test.map.md` — parser-conformance within-node allowlist (live-pipeline vs native-parser parity)

**enum-subset refinement work ((d)-A arc follow-up / Bug 69 / batch 5 if confirmed):**
1. `domain.map.md` — enum-subset refinement concept + three consumers (match exhaustiveness, predicate codegen, schemaFor DDL)
2. `structure.map.md` — S156 (d)-A batch descriptions; `enum-subset-refinement.ts` is the shared recognizer
3. `error.map.md` — E-MATCH-SUBSET-DEAD-ARM + E-CONTRACT-002 extension
4. `schema.map.md` — `PredicatedType.subsetVariants`, `EnumSubsetParse`, `parseEnumSubsetAnnotation` shapes

**match-exhaustiveness / match-as-expression (S157 arc follow-up):**
1. `domain.map.md` — match-as-expression exhaustiveness concept + E-SYNTAX-064 / E-CODEGEN suppression
2. `structure.map.md` — S157 match-exhaustiveness arc: ast-builder.js dual-parse hooks (Bug 71 derived, Bug 67 return-match); type-system.ts Bug 63 markup-attr `.advance` check
3. `error.map.md` — E-SYNTAX-064 promoted; E-TYPE-020 exhaustiveness path; E-TYPE-063 markup-attr advance; E-CODEGEN-INVALID-JS Bug 70 suppression
4. `schema.map.md` — `matchExpr` side-field on `ReactiveDeclNode` (Bug 71)

**new feature / spec-amendment:**
1. `domain.map.md` — invariants + concept lexicon (check language cohesion before proposing syntax)
2. `structure.map.md` — where the feature's stage lives
3. `schema.map.md` — AST node shapes (a new construct needs a node type)
4. `error.map.md` — code-family conventions for any new diagnostic

**test-authoring:**
1. `test.map.md` — runner, categories, patterns, cross-stream W-/I- helper requirement
2. `error.map.md` — the code under assertion (and which stream it lands in)

**audit / non-compliance:**
1. `non-compliance.report.md` — current findings + dispositions (Bug 69 NON-GAP tension flagged as uncertain)
2. `structure.map.md` — what's in-scope vs out-of-scope (archive/, handOffs/, samples/)

**Don't know which** (e.g., open-ended task brief from user):
1. Read `primary.map.md` (this file) in full
2. Read the Task-Shape Routing section above and self-classify
3. If genuinely unclear, surface to PA before consuming further context

## Use feedback loop

When this map's content was load-bearing for a dispatch outcome, the agent's final report should
note **"map content consulted: [list of map files]; load-bearing finding: [one sentence]"**. When
the map content was NOT useful, report **"maps consulted but not load-bearing"** so PA can diagnose
whether the wrong maps were named in the brief OR the map content is at the wrong granularity.
3-5 consecutive "not load-bearing" reports on the same task shape trigger a map-design review.

## Key Facts
- Entry point: `compiler/src/cli.js` → subcommand router; public API in `compiler/src/api.js` → `compileScrml()`; `--emit-engine-graph` flag (S149) writes `<base>.engine-graph.json` sidecar
- Pipeline: 12 ordered stages BS → TAB → NR → MOD → CE → PA → RI → TS → META → VSS → DG → CG; stage contracts at `compiler/PIPELINE.md`; engine-graph sidecar runs after CG via lazy getter in compile result
- Spec: `compiler/SPEC.md` (30,704+ lines, 58 sections + appendices); normative per pa.md Rule 4
- Error surface: CGError with `severity: 'error'|'warning'|'info'`; W-*/I-* → result.warnings (non-fatal); all else → result.errors (fatal, CLI exit 1); emitted-JS parse-gate (E-CODEGEN-INVALID-JS) is default-ON BUT suppressed when compilation already has a prior fatal error (Bug 70, api.js)
- `<each>` codegen is the highest-churn area: Bug 62 (S156) closed engine-ctx threading in emit-each.ts; Bug 65 (S157) CLOSED the SAME gap in emit-lift.js; Bug 64/R28-1c (S158) CLOSED per-item content reactivity on reconcile for both tiers; Bug 72 (S158) CLOSED nested `<each>` inside `${for…lift}`. emit-each.ts `EachEngineCtx`/`EachReconcileCtx` + `buildEachEngineCtx`/`maybeWrapEachPerItemEffect` are the SHARED patterns both tiers delegate to. Read domain.map.md "Codegen Emit Map" before touching any of these files.
- S155 runtime contract: `_scrml_engine_dispatch_message(varName, msg, armTable, table, ...)` (runtime-template.js) dispatches `(state × message)` arms; calls `_scrml_engine_advance` for the target transition; handles §51.0.R idle reset on a handled message
- S158 runtime contract: `_scrml_reconcile_list` builds `container._scrml_item_by_key` key→item Map on every pass + calls `_scrml_trigger(container, "_scrml_items")`; `_scrml_resolve_item(container, key)` tracks item slot + returns live item via `_scrml_deep_reactive` or `null` (canonical absence — NOT `undefined`)
- S156 (d)-A runtime contract: `Enum oneOf([.A,.B])` / `notIn([...])` annotated cells carry `subsetVariants: Set<string>` in `PredicatedType`; boundary checks lower to `(["A","B"].includes(v))`; schemaFor fields lower to `CHECK IN ('A','B')`. Range form is forbidden (§53.15.1). `enum-subset-refinement.ts` is the shared dependency-free recognizer.
- S153 runtime contract: `_scrml_each_renderers` registry + `_scrml_remount_each(root)` (runtime-template.js) — each-mount inside a non-`initial=` engine arm registers at module-init and re-renders when the variant-swap dispatcher mounts its arm
- HARD M5-swap precondition (S153, witnessed twice): the native parser does NOT promote `<each>`/`<match>` to structural each-block/match-block nodes; two S153 fixes route around it via legacy BS+TAB; when native becomes default it MUST promote them or every each/match breaks
- null/undefined: BOTH do not exist in scrml (`W-ABSENCE-IN-SCRML-SOURCE`); `""` / `0` / `false` ARE defined values; `async`/`await`/`switch`/`try`/`throw` are forbidden vocabulary
- type-system.ts is 17374 lines (largest single source file); type-checking, linear types, validity-surface synthesis, enum-subset resolution, match-as-expr exhaustiveness, markup-attr `.advance` two-plane check
- symbol-table.ts is 11280 lines; engine state-child walkers, PASS 20 match exhaustiveness (incl. subset dead-arm), message-arm exhaustiveness (S155)
- Native parser: `compiler/native-parser/` paired `.js` + `.scrml` bootstrap; `--parser=scrml-native`; M5-swap incomplete (see precondition above)
- **Bug 69 / NON-GAP tension:** hand-off.md records a conflict: user said "fold Bug 69 in" (tableFor §41.16.6 subset reach) but the S156 CLOSE block called it NON-GAP. Confirm with user before scheduling (d)-A batch 5. See `non-compliance.report.md` Uncertain section.

## Tags
#scrmlts #map #primary #compiler #bun #v0.7.0 #each-in-dynamic-context #codegen #enum-subset #message-dispatch #per-item-reactivity #live-keyed #r28-1c #bug60 #bug62 #bug63 #bug64 #bug65 #bug70 #bug71 #bug72 #s148 #s149 #s150 #s151 #s152 #s153 #s154 #s155 #s156 #s157 #s158

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
