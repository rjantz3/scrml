# Engine hydration (Approach F): dynamic `initial=@cell`

change-id: engine-hydration-f-initial-cell-2026-06-15
worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad7d1973a65298b4c

## 2026-06-15T23:56Z — Phase 0 SURVEY + STOP GATE

**Startup verification**: pwd == worktree root (agent-ad7d1973a65298b4c); toplevel matches;
tree clean; bun install OK (204 pkgs); bun run pretest OK (13 samples).

**Maps**: read `.claude/maps/primary.map.md` (Task-Shape Routing). No engine-hydration-specific
routing entry exists (feature is new). Load-bearing routing: codegen each/match/engine emit shape
(map lines 118-122) + engine var-name S192 + the each-render-before-cell-init ordering precedent.

### Phase 0 check 1 — construction-time init ordering (THE load-bearing risk)
emit-client.ts emits in this order at module-init:
  1. `engineLines` (emitEngineSubstrate → emitEngineVariantCellInit, the
     `_scrml_reactive_set("varName", <init>)` construction set) — EARLY (emit-client.ts:1409).
  2. `reactiveLines` (emitReactiveWiring → user `@cell = init` inits) — LATE (emit-client.ts:1661).

=> The engine construction set runs BEFORE user reactive cell inits. A naive
`_scrml_reactive_set("varName", _scrml_reactive_get("cell"))` placed in
emitEngineVariantCellInit would read `cell` BEFORE it is initialized -> undefined/placeholder.
This is EXACTLY the each-render hazard already documented + fixed via the
`eachDispatchers` deferral (emit-client.ts:1664-1679, change-id each-render-before-cell-init-2026-06-01).

**RESOLUTION (no STOP needed)**: the ordering CAN support a construction-time cell read by
DEFERRING the `initial=@cell` construction set to AFTER reactiveLines, mirroring the
eachDispatchers precedent. The static-literal case (`initial=.Variant`) stays where it is
(order-independent — emits a bare string). Plan: emit-engine.ts splits the cell-init into a
deferred-construction emitter; emit-client.ts emits it post-reactiveLines (alongside / before
the onTimeout initial-arms which ALSO already defer for the same reason, emit-client.ts:1681-1690).

### Phase 0 check 2 — bare guard-free construction hook
emitEngineVariantCellInit (emit-engine.ts:1578-1590) emits a bare
`_scrml_reactive_set(varName, <value>)` — does NOT route through _scrml_engine_direct_set.
Confirmed by Decision 5 (emit-engine.ts:3701-3704): "Engine construction
(emitEngineVariantCellInit) does NOT fire hooks ... initial state is not transitioned-into."
The transition guard _scrml_engine_direct_set (runtime-template.js:3767) hard-throws
E-ENGINE-INVALID-TRANSITION (runtime-template.js:3798-3804) on a disallowed move — which is
why hydration MUST NOT route through it. Confirmed.

### Phase 0 check 3 — existing compile-time E-ENGINE-INITIAL-INVALID-VARIANT fires
symbol-table.ts:6205-6217 — B15 fires E-ENGINE-INITIAL-INVALID-VARIANT COMPILE-TIME when
`initial=.X` names a variant not in the for=T enum. The new RUNTIME counterpart (for the
@cell case, where the value isn't known until runtime) is ADDITIVE, not a duplicate. Confirmed.

**ALL THREE CHECKS HOLD. PROCEEDING TO BUILD.**

## Plan
1. Parser/ast-builder + SYM: recognize `initial=@cell` -> engineMeta.initialCell (cell name).
   B15: cell must EXIST + be type-compatible (for=T enum OR string). Mutual-exclusion with
   initial=.Variant; forbidden on derived.
2. Codegen (emit-engine.ts): when initialCell set, emit deferred construction set reading the
   cell, guard-free, ordered after reactiveLines.
3. Runtime guard: at construction, throw E-ENGINE-INITIAL-INVALID-VARIANT if resolved cell value
   is not/absence/not-a-for=T-variant (decoder-boundary). Parallel to derived INITIAL-ABSENT.
4. SPEC §51.0.E amendment + §34 row.
5. Tests + R26 dog-food (trucking HOS string-cell shape).

## 2026-06-16T00:17Z — Phase 1 (parser+SYM) DONE, Phase 2 (codegen) + Phase 3 (runtime) + DG-credit DONE

Phase 1 committed (a753b5cb). Phases 2/3:
- emit-engine.ts: emitEngineVariantCellInit SKIPS the cell case (no early static set);
  NEW emitEngineCellHydrationInit(meta) -> deferred guard-free
  `_scrml_engine_hydrate_init(varName, _scrml_reactive_get(cell), [variants], forType)`;
  NEW per-file emitEngineCellHydrationInitsForFile.
- emit-client.ts: call emitEngineCellHydrationInitsForFile AFTER reactiveLines (deferred,
  before onTimeout arms) — per Phase 0 ordering finding.
- runtime-template.js: NEW _scrml_engine_hydrate_init (engine chunk) — absence -> throw
  E-ENGINE-INITIAL-INVALID-VARIANT; tag not in valid set -> throw same; else guard-free
  _scrml_reactive_set. Decoder boundary, parallel to derived INITIAL-UNDEFINED-RT.
- dependency-graph.ts: credit initialCell as a reader (E-DG-002 no longer false-fires on a
  persisted-status cell whose only consumer is engine hydration).

R26 dog-food (trucking HOS string-cell): compile exit 0; emits hydrate_init reading the cell;
does NOT route through _scrml_engine_direct_set; ordering hydration AFTER persistedStatus init;
emitted client JS parses (node --check). Only residual warning is W-PROGRAM-001 (bare fixture).

## 2026-06-16T00:21Z — Phase 4 (SPEC §51.0.E amendment + §34 rows) DONE

- §51.0.E: broadened intro (two mutually-exclusive value forms); NEW "Runtime-cell
  hydration (initial=@cell)" subsection — HOS worked example; construction-not-transition
  semantics; snapshot-at-construction/boot-only; SSR note (value resolved at construction;
  async-fetch-on-mount is the deferred <engine server> E-leg §52); cell-type rule (for=T OR
  string); compile + runtime validation; DD + debate + design-insight authority citation.
- §34: E-ENGINE-INITIAL-INVALID-VARIANT row gains the RUNTIME extension note; NEW rows
  E-ENGINE-INITIAL-BOTH-FORMS, E-ENGINE-INITIAL-CELL-UNDECLARED, E-ENGINE-INITIAL-CELL-TYPE.

## 2026-06-16T00:26Z — Phase 5 (tests + R26) DONE

NEW compiler/tests/unit/engine-hydration-initial-cell.test.js (16 cases / 30 expects):
- §1 parser: initial=@cell -> initialCell capture; distinct slots; absent.
- §2 SYM B15: string-cell OK; for=T-enum cell OK; non-existent -> CELL-UNDECLARED;
  number cell -> CELL-TYPE; both forms -> BOTH-FORMS; derived -> NO-INITIAL; no spurious MISSING.
- §3 codegen: emitEngineVariantCellInit skips cell case; emitEngineCellHydrationInit emits
  guard-free hydrate_init reading the cell + variant set + forType; NOT direct_set; variant-set
  fallback to stateChildren tags.
- §4 runtime: _scrml_engine_hydrate_init present in SCRML_RUNTIME; decoder-boundary throw +
  guard-free bare set; never CALLS direct_set.

All 16 pass. R26 dog-food (HOS string cell): exit 0; hydrate_init reads cell; NOT direct_set;
ordered after cell init; emitted JS parses; E-DG-002 no longer false-fires (DG credit).
Engine suites (c12 + b14 + c14 + derived-rejections + integration onTimeout): 170 pass / 0 fail.

## 2026-06-16T00:36Z — Phase 6 (native-parser within-node parity baseline) DONE

Full `bun run test` (incl. browser/native) surfaced 8 within-node parity-gate failures:
engine/example fixtures over MISSING-FIELD budget by exactly +1 per engine-decl node. ROOT
CAUSE: the NEW live-parser engine-decl field `initialCell` (S198) is absent from the native
parser's engine-decl nodes (native parser not re-synced — it's a separate parity-grind track,
FEATURE-stale per S162; live is the canonical enforcer). Bumped each affected fixture's
MISSING-FIELD allowlist budget by its residual (the documented baseline-update mechanism;
allowlist header lines 24-32). 8 fixtures, +1 MISSING-FIELD each per engine-decl. Gate green.
This is native-parser parity backlog, NOT a live-pipeline defect.

## 2026-06-16T00:42Z — DONE. Final verification

- Pre-commit gate (unit+integration+conformance): 17110 pass / 0 fail (baseline 17094 / 0; +16 new).
- Full `bun run test` (incl. browser/native/lsp/commands/self-host): 24354 pass / 225 skip / 0 fail
  across 1008 files. Zero regressions.
- R26 HOS dog-food: compile exit 0; emits _scrml_engine_hydrate_init reading the cell; NOT
  _scrml_engine_direct_set; ordered after cell init; emitted JS parses.
- git status clean; FINAL_SHA 42b03b0f; no leak into main checkout.

DEFERRED (out of scope, surfaced):
- <engine server> E-leg (§52 fetch-on-mount) — NOT touched. The 'server' flag swallow gap was
  NOT adjacent to this work; left as-is per brief.
- Native-parser re-sync to populate engine-decl.initialCell (parity backlog; allowlist budgeted).
- Teaching lint-hover (graft #3) — skipped per brief (optional/deferred).
- Trucking HOS corpus rewrite (slice 1b proper) — separate downstream dispatch consuming this primitive.
