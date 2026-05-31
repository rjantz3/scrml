# Progress — engine-graph-sidecar-2026-05-31

Builder: `--emit-engine-graph` -> `<base>.engine-graph.json` static compile-time projection of engine metadata.

## 2026-05-31 — startup + recon
- pwd = /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-afea5a24295cd07f8 (verified worktree, branch worktree-agent-afea5a24295cd07f8, base 25e89cbb, clean).
- `bun install` OK; `bun run pretest` OK (13 samples).
- Baseline `bun run test`: 22375 pass / 2 fail / 220 skip / 1 todo. The 2 fails are PRE-EXISTING (value-indexed-subscribers "throwing subscriber" — unrelated; throws inside a test, not my code).

## Brief-fact corrections (verified against current source 25e89cbb)
- NO `reachability.ts`/`reachability.js`. Solver = `reachability-solver.ts`; serializer = `serializeReachabilityRecord`; result key = `result.reachabilityRecordJson` (a FUNCTION, lazy).
- Engine metadata interfaces live in `symbol-table.ts` (NOT engine-metadata.ts):
  - `EngineMetadata` @326: basics `forType`, `variants:string[]`, `initialVariant: string|null` (NOT `initialState`), `varName`, `derivedExpr`, `isExported`, `isPinned`.
  - Deferred/populated-later: `stateChildren?: EngineStateChildEntry[]`, `engineOnTransitions?: OnTransitionEntry[]`, `openerEffect?: string|null`, `idleWatchdog?: OnIdleEntry|null`, `internalRules?`, `onTimeoutElements?`.
  - `EngineStateChildEntry` @596: `tag`, `rule: EngineRuleForm`, `payloadBindings?`, `bodyRaw`, `historyAttr?`, `internalRule`, `onTimeoutElements?`, `onTransitionElements?`, `onEnterRaw?: string|null`, `effectRaw?: string|null`.
  - `EngineRuleForm` @441: absent | single{target} | multi{targets[]} | wildcard | legacy-arrow{raw} | parse-error{raw,reason}.
  - `OnTransitionEntry` @554: from, to, bodyRaw?, rawOffset.
- Engine collection walk (canonical, in `codegen/emit-engine.ts:39 collectEngineRecords(symbolTable, typeRegistry)`):
  iterate `symbolTable.fileScope?.cells ?? symbolTable.cells`; filter `cell._cellKind === "engine" && cell._engineMeta`; meta = cell._engineMeta; resolve variants from typeRegistry when meta.variants empty; push `{ ...meta, variants, cell }`.
- api.js integration handle: `symResultsByKey` (Map canonicalKey->SYM result, decl @670), each value `.symbolTable` + `.typeRegistry`. Iterated @2148. Result object @~2335-2390 (reachabilityRecordJson @2347).
- collectEngineRecords is dynamically imported in api.js (`await import("./codegen/emit-engine.ts")`) inside the CG loop. I will NOT touch codegen/index.ts.

## Plan
1. NEW `compiler/src/engine-graph.ts` — self-contained builder. Mirrors collectEngineRecords walk internally (no codegen/index.ts dep). Exports buildEngineGraphJson(symResultsByKey, typeRegistry?) + pure helpers for unit test.
2. api.js — add `engineGraphJson: () => buildEngineGraphJson(symResultsByKey)` to result object + import.
3. compile.js — emitEngineGraph flag parse + write `<base>.engine-graph.json`.
4. cli.js — register `--emit-engine-graph` + help line.
5. Tests: unit (synthetic symbol table) + integration (examples/14-mario-state-machine.scrml via API emitEngineGraph).

## Decisions
- `next` = wildcard-EXPANDED (concrete reachable targets incl. inherited `*:To`), per brief preference. Also emit `transitions[]` flat edge list with `wildcard:true` markers so consumers can distinguish.

## 2026-05-31 — implementation complete
- engine-graph.ts builder written + committed (2802ba1d). Reuses collectC12EngineDecls / collectC14DerivedEngineDecls / resolveEngineInitialVariant from emit-engine.ts (NO codegen/index.ts touch). Exports: buildEngineGraph, buildEngineGraphForFile, buildEngineGraphJson, serializeEngineGraph + projection interfaces.
- Wiring committed: api.js import + `engineGraphJson: () => buildEngineGraphJson(metaFiles)` result key; compile.js `--emit-engine-graph`/`--engine-graph` flag parse + `<base>.engine-graph.json` write loop (mirrors --emit-reachability) + [EG] verbose log; cli.js help entries.
- Unit test compiler/tests/unit/engine-graph.test.js — 19 pass (shape, sorted transitions, sorted/dedup next, §51.0.E initial resolution incl. first-variant fallback + null, wildcard target-expand, inherited *:To, terminal absent, hasEffect, lifecycle flags, hasOpenerEffect, derived flag + ordering, honest-empty, multi-file concat, pretty-print+trailing-nl, determinism).
- Integration test compiler/tests/integration/emit-engine-graph-integration.test.js — 9 pass. R26 empirical table over REAL examples/14-mario-state-machine.scrml + examples/18-state-authority.scrml: (a) valid JSON, (b) real variants Small/Big/Fire/Cape, (c) initialState=Small matches initial=.Small, (d) Small->Big/Fire/Cape + Fire->Small edges + Small.next=[Big,Cape,Fire], (e) honest-empty engineless file, (f) byte-determinism. Plus TrafficLight initial=Red + Red.hasEffect=true (effect=${ log("going") }).
- CLI verified end-to-end: `scrml compile examples/14-... -o /tmp --emit-engine-graph` writes 14-mario-state-machine.engine-graph.json (1547 bytes); without flag no file; --verbose fires [EG] log.

## wildcard `next` decision: EXPANDED (per brief preference)
- states[].next = concrete reachable targets incl. inherited *:To wildcard edges and tag:*/`*:*` expansion (excludes self on catch-all). transitions[] retains the literal edge list WITH a `wildcard:true` marker as the lossless source-of-truth so consumers can distinguish authored vs inherited.

## EngineMetadata fields: AVAILABLE vs ABSENT in this projection
- AVAILABLE + projected: varName, forType, variants, initialVariant (-> initialState via resolveEngineInitialVariant §51.0.E), derivedExpr (-> derived bool), openerEffect (-> hasOpenerEffect), stateChildren[].{tag, rule, effectRaw -> hasEffect, onTransitionElements/onTimeoutElements/internalRule/historyAttr -> lifecycle}.
- NOT projected (present on meta but out of scope / not website-relevant for static graph): idleWatchdog, onTimeoutElements file-scope aggregate (per-state onTimeout is captured via lifecycle.onTimeout instead), payloadBindings, isPinned, isExported, span/rawOffset. The C-suffixed `<onEnter>`/`<onIdle>` per-state lifecycle is NOT a per-state-child field on EngineStateChildEntry today; only onTransition/onTimeout/internalRule/history are per-state-child, so those four are the lifecycle flags exposed.

## DERIVED ENGINE CAPTURE (corrected — earlier note was wrong)
- examples/14's DERIVED `HealthRisk` engine (derived=@marioState) DOES appear in the sidecar, captured via collectC14DerivedEngineDecls (the canonical codegen collector the sidecar reuses). Final mario engine-graph.json carries BOTH marioState (derived:false, full graph) AND healthRisk (derived:true, variants [AtRisk, Safe], transitions [], states [], initialState null — derived engines project upstream so have no authored rule= edges and no initial=).
- (My earlier grep of client.js for `_scrml_project_HealthRisk` returned false; that was a red herring — codegen lowers this inline-match derived engine via a different emission path, NOT the legacy projection-fn naming. The sidecar correctly surfaces it regardless because it reads engineMeta via the C14 collector. sidecar==codegen-collector fidelity holds.)
- initialState:null for the derived engine is CORRECT and honest: §51.0.J derived engines carry no `initial=` (they reflect the upstream engine's current state via projection), and resolveEngineInitialVariant returns null with no initial= and no state-children.

## maps: NOT load-bearing (stale codegen per brief; read source directly).
## SPEC: no normative change needed (non-normative build-artifact flag, like --emit-reachability). Did NOT author SPEC text.
