# Progress: m66-engine-statechild-adapter (M6 Wave 1, unit M6.6)

- [SURVEY] Started at $(pwd) — branch `m66-engine-statechild-adapter`
- [SURVEY] pretest baseline: 13912 tests passing across 705 files (commit 15cad1ed)
- [SURVEY] Confirmed exports of engine-statechild-parser.ts (8 functions):
  - parsePayloadBindings, isLegacyArrowRulesBody, parseRuleAttrValue,
    scanForOnTimeoutEntries, scanForOnIdleEntries, scanForNestedEngineEntries,
    scanForOnTransitionEntries, parseEngineStateChildren
- [SURVEY] Confirmed direct importers in src/: ONLY symbol-table.ts:128-131
  (3 functions imported: parseEngineStateChildren, isLegacyArrowRulesBody,
   scanForOnIdleEntries). match-statechild-parser.ts is a sibling parser with
  its own MatchArmEntry type — NOT a consumer of EngineStateChildEntry.
- [SURVEY] EngineStateChildEntry type LIVES in symbol-table.ts:498 (not in
  engine-statechild-parser.ts itself) and is RE-IMPORTED into the parser via
  the dependency-inverted `import type { EngineStateChildEntry, ... } from
  "./symbol-table"` at engine-statechild-parser.ts:66-74. M6.8 deletion will
  need to relocate this type, NOT introduce it.
- [SURVEY] Field-access survey of EngineStateChildEntry across 7 src/ files:
  - symbol-table.ts: all 12 top-level fields used + nested sub-type fields
  - codegen/emit-engine.ts: 9 top-level fields + nested sub-type fields
  - codegen/emit-control-flow.ts: payloadBindings
  - codegen/emit-variant-guard.ts: payloadBindings (comment-only, retire path)
  - codegen/usage-analyzer.ts: historyAttr, internalRule, onTimeoutElements,
    innerEngines
  - dependency-graph.ts: bodyRaw, onTransitionElements, onTimeoutElements
    + nested OnTransitionEntry.bodyRaw + OnTimeoutEntry.after
  - reachability/component-3.ts: bodyRaw, onTimeoutElements, onTransitionElements
  - type-system.ts: only `engineMeta.stateChildren` presence check (no field
    access)
- [SURVEY] Union of TOP-LEVEL fields consumed: 12 of 12 declared fields
  (tag, rule, bodyRaw, isColonShorthand, rawOffset, historyAttr,
   internalRule, onTimeoutElements, innerEngines, effectRaw,
   onTransitionElements, payloadBindings).
- [SURVEY] Nested sub-types ALSO field-accessed by transitive consumers:
  - EngineRuleForm (6 discriminated kinds, §51.0.F)
  - OnTimeoutEntry (after, to, rawOffset)
  - OnTransitionEntry (to, from, once, ifExprRaw, bodyRaw, isColonShorthand,
    rawOffset)
  - PayloadBinding (positional/named discriminator)
  - NestedEngineEntry (innerEngines)
- [STOP] STOP-condition triggered: adapter surface = 12 top-level fields
  + ≥20 nested-sub-type leaf fields, far exceeding the M6 plan's 3-field
  threshold. Path (a) adapter approach is wrong; path (b) consumer-migration
  is required.

## STOP-condition report

Per M6 cutover plan §6.6 STOP-conditions and §M6.6 Surveys-first:
> "if the EngineStateChildNode adapter surface exceeds ~3 fields, the adapter
>  approach is wrong — escalate to PA for consumer-migration path (b)
>  decomposition."

Field-count exceeds threshold by 4x at the top level alone, and the nested
sub-types (EngineRuleForm/OnTimeoutEntry/OnTransitionEntry/PayloadBinding)
multiply the actual adapter populate-surface roughly 2-3x. The native parser
would need to synthesize the full PascalCase-to-raw-text-keeper roundtrip
for every entry — defeating the M5 swap's goal of replacing the legacy
re-tokenizer with native walkable structure.

## Path (b) cost estimate

Path (b) — migrate the 7 src/ consumer files to walk native blocks directly
— requires:

1. Define the NEW native-side replacement shape (or a Block[] walker
   convention) that supersedes EngineStateChildEntry. This needs SPEC §51.0
   reconciliation because the native shape carries PascalCase Block payload
   with composite-state-child decomposition rather than raw-text-keeper.
2. Migrate symbol-table.ts B15 PASS 11 (~150 LOC at lines 4811-5290) to
   walk native engine-body Block[] instead of consuming
   parseEngineStateChildren output. This is the largest consumer; must
   preserve all B15 diagnostics (E-ENGINE-STATE-CHILD-MISSING, -INVALID-
   VARIANT, -RULE-INVALID-VARIANT, -RULE-LEGACY-SYNTAX, -PAYLOAD-ON-UNIT-
   VARIANT, -PAYLOAD-ARITY-MISMATCH, -PAYLOAD-RESERVED-COLLISION + the
   B18 E-MULTI-STATEMENT-HANDLER fire-site #2 + all A5/B17 typer
   diagnostics) and exhaustiveness checks.
3. Migrate symbol-table.ts B17.3 SYM PASS at lines 7820+ that consumes the
   B17.2 parser annotations on EngineStateChildEntry (effectRaw,
   onTransitionElements, internalRule).
4. Migrate codegen/emit-engine.ts (~9 fields × multiple emit functions:
   emitEngineHistoryMap, emitEngineHistoryCellInits, emitEngineTimersTable,
   emitEngineInternalTransitionTable, the rule-encode helpers, the
   onTransition-effect emit path) — ~500 LOC across the file.
5. Migrate codegen/usage-analyzer.ts — small (~10 LOC).
6. Migrate codegen/emit-control-flow.ts payloadBindings access — small
   (~5 LOC).
7. Migrate dependency-graph.ts A-1.5 Shape 1/2/2b regex-scan path (~50
   LOC) — preserve all reactive-edge wiring.
8. Migrate reachability/component-3.ts engine-decl cascade scan (~40 LOC
   across 3 sites at 440-450, 644-680, 816-870) — preserve all
   reachability invariants.
9. Decision on how native blocks should carry the analogues of:
   - rawOffset (does native block carry source spans?)
   - effectRaw (does native parse ${...} verbatim?)
   - bodyRaw (does native preserve verbatim body text for regex-scan
     consumers like dependency-graph and component-3?)
   - PayloadBinding positional vs named discrimination
   - the 6 EngineRuleForm discriminated kinds (legacy-arrow, single,
     multi, internal-target, history-target, parse-error, etc.)
10. SPEC §51.0 amendment + §34 codes catalog update for any diagnostic
    code-text changes that follow from native-side shape changes.
11. Migrate ~30+ unit tests under compiler/tests/unit/ that import
    parseEngineStateChildren / scanFor* directly (engine-a5-*, engine-a7-*,
    engine-onIdle, engine-statechild-payload-bindings, b17-* test surfaces,
    a5-2-parser-support — 9 fields populated assertions).
12. Native parser may need amendment to produce the data downstream
    consumers need (e.g., rawOffset preservation, body-text verbatim
    capture for the regex-scan paths) — this is a native-parser-side
    contract addition that crosses into M5 ground.

**Rough cost estimate:** 40-80h (much higher than the M6 plan's 15-30h
budget for M6.6, which assumed adapter path). Path (b) is comparable to
M6.5 path (b) in scope and shares the same MD/R1-ladder dependency
concern — the native parser side may need fresh contracts to expose
the data the regex-scan consumers need.
