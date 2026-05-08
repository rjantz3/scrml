---
title: A1c C0 Phase 0 SURVEY — feature-usage analysis pass
date: 2026-05-08
session: post-S69 close (S70 prep)
worktree: agent-a4dbc8fa820c77d64
worktree-base: rebased from f59bbcc (S69 close) onto a8a6bdf (post-A5-3 SHIP) — matches BRIEF §3 stated baseline
status: SURVEY COMPLETE — awaiting PA acknowledgment before implementation
predecessor: C0-DISPATCH-BRIEF.md (drafted S65, baseline 36a2d88; rebased reference baseline a8a6bdf)
---

## §0 Survey methodology + worktree state

Read in full: BRIEF, SCOPE-AND-DECOMPOSITION (esp. §4.0 + §11), `compiler/src/codegen/analyze.ts`, `compiler/src/codegen/collect.ts`, `compiler/src/codegen/emit-channel.ts:collectChannelNodes`, `compiler/src/codegen/index.ts:170-185`, `compiler/src/symbol-table.ts:200-470` + `5833-6280` (PASS 16 + runSYM), `compiler/src/types/ast.ts:425-518` (state-decl), `compiler/src/types/ast.ts:1660-1700` (reset-expr + channel-decl), `compiler/src/dependency-graph.ts:520-555` (engine-decl walker model), primer §13.7 (B-step + A5-2/A5-3 specifics), A5-2/A5-3 SHIP commits.

Cross-checked the brief's HEAD `36a2d88` references against current HEAD `a8a6bdf`: every load-bearing locus the brief cites still exists, with line numbers shifted (analyze.ts grew from 124 → 124 lines exactly; the pre-A5-3 line ranges in the brief still hold for analyze.ts but symbol-table line numbers have shifted significantly).

**Worktree state at survey time:**
- WORKTREE_ROOT: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4dbc8fa820c77d64`
- AGENT_BRANCH: `worktree-agent-a4dbc8fa820c77d64`
- HEAD: `a8a6bdf` (rebased onto main; brief's stated baseline matches verbatim)
- Tree: clean
- `bun install`: 114 packages
- `bun run pretest`: 12 samples compiled, 0 errors
- Baseline `bun run test`: **9,682 pass / 60 skip / 1 todo / 0 fail** — exact match with BRIEF §11 stated baseline

**Heads-up on dispatch instructions:** the dispatch said baseline = `9,682 / 60 / 1 / 0` at `a8a6bdf`, but the worktree spawned at `f59bbcc` (the S69 close, 8 commits behind main). Rebase onto main was required to reach the brief's baseline. Now at `a8a6bdf`. A1b-COMPLETE + A5-2 + A5-3 all landed; the brief's §4 "WAIT for A1b-COMPLETE vs Option (b)/(c) PARTIAL" trilemma is moot — Option (a) (the brief's recommendation) is what's actually happening now: every B-step decoration C0 reads has shipped.

---

## §1 Locus confirmation — BRIEF §3 vs current HEAD

### §1.1 BRIEF §3.1 attachment point — `analyze.ts` — **CONFIRMED**

`compiler/src/codegen/analyze.ts` (124 lines, exactly as brief says).

- `analyzeFile(fileAST)` lives at lines 69-93 — confirmed.
- `analyzeAll(input)` lives at lines 102-124 — confirmed.
- `FileAnalysis` interface at lines 49-60 — confirmed (8 fields: filePath / nodes / fnNodes / markupNodes / topLevelLogic / cssBridges / cssBlocks / channelNodes / ir / testGroups; the docstring undercounts).

`fileAnalyses` is consumed by `runCG()` at `compiler/src/codegen/index.ts:177` and `:378`. The `Map<string, FileAnalysis>` shape is the canonical handle. **Recommendation:** add `usage: FeatureUsage` to `FileAnalysis` (per-file bitmap) AND a top-level `featureUsage: FeatureUsage` (cross-file-merged bitmap) to `analyzeAll`'s return shape. Per-file matters for cache reuse + future per-module elision; per-app is what downstream emitters consume.

**Cross-file traversal — RESOLVED IN-FAVOR-OF EXISTING INFRA.** `analyzeAll`'s `files` array carries the FULL transitively-resolved set already. CHX (channel inlining) + MOD (module resolution) populate the `files[]` array with every reachable file via the import graph. **No import-graph traversal needed inside C0** — walking each `files[i]` and OR-merging the bitmaps produces the per-app result. (Risk callout: C0 must verify `files[]` is post-CHX-inlined before merging — the channel exporter file's channel decl is filtered out by `_p3aIsExport` already; consumers carry their inlined copy. Both per-file bitmaps will agree on `channels: true` for the consumer; OR-merge is sound.)

### §1.2 BRIEF §3.2 collection helpers — `collect.ts` — **CONFIRMED + FOUR HELPERS REUSABLE**

All four collect helpers (`collectFunctions`, `collectMarkupNodes`, `collectTopLevelLogicStatements`, `collectChannelNodes`, `collectCssVariableBridges`, `collectCssBlocks`, `collectProtectedFields`, `collectServerVarDecls`) walk **deep** via children (and `body` for logic). Confirmed: the recursion correctly descends into `node.children` and `logic-block.body`, which is what C0 needs.

**However**, none of the existing collectors target the AST shapes C0 needs:
- No collector for `state-decl` (state-decls live as logic-block children — `collectTopLevelLogicStatements` returns ALL logic statements; C0 will filter to state-decls).
- No collector for `engine-decl` (lives as markup-children). `dependency-graph.ts:537-552` has a private `collectAllEngineDecls` that's the right shape — C0 should write its own copy (it's 14 LOC; importing across module boundaries breaks the analyze.ts isolation).
- No collector for `reset-expr` (these are ExprNodes embedded in init expressions, function bodies, etc.). Walking via `forEachResetExprInExprNode` (`expression-parser.ts:2538`) gives the canonical fire-site enumeration B22 already uses.

**Verdict:** C0 implements its own deep walker (`walkUsage(nodes, bitmap)`). No additive change to collect.ts is needed — clean boundary.

### §1.3 BRIEF §3.3 canonical walk pattern — `emit-machines.ts` — **APPLIES**

The first ~150 lines of `emit-machines.ts` use the typed-record-accumulation pattern: walk AST, dispatch on `kind`, accumulate into a typed result object. C0's `walkUsage` mirrors this shape exactly. Standard.

### §1.4 BRIEF §3.4 orchestrator hook — `index.ts` — **MINIMAL TOUCH**

`index.ts:177-182` calls `analyzeAll(...)` and destructures `{fileAnalyses, protectedFields}`. C0's per-app `featureUsage` is added to the return shape:

```ts
const { fileAnalyses, protectedFields, featureUsage } = analyzeAll({...});
```

**index.ts surface-area: 1-line touch** (the destructure), assuming downstream emitters will consume `featureUsage` directly (later C-steps' work). For C0-landing alone, the destructure is optional; the field rides on `analyzeAll`'s return and downstream picks it up when needed. **Per BRIEF §7.3 concurrency note:** this minimal-touch shape eliminates the only conflict surface with parseVariant Phase 2. (parseVariant Phase 2 status at HEAD `a8a6bdf` unconfirmed — survey did not investigate. C0's index.ts touch is so minimal that branch-state is moot.)

### §1.5 BRIEF §3.5 A1b decoration table — **ALL 22 B-STEPS LANDED + A5-2/A5-3**

Every annotation C0 needs is now populated. Mapping table (verified against `symbol-table.ts` + primer §13.7):

| Brief decoration source | Field/annotation C0 reads | Status |
|---|---|---|
| B5 (cell classifier) | `state-decl._cellKind` (5 values: plain/bindable/markup-typed/compound-parent/engine) + `state-decl._isBindable` | LANDED |
| B5 (shape) | `state-decl.shape` ("plain"/"decl-with-spec"/"derived") | LANDED (A1a Step 4) |
| B5 (renderSpec) | `state-decl.renderSpec` non-null iff Shape 2 | LANDED (A1a Step 5) |
| B5 (defaultExpr) | `state-decl.defaultExpr` non-null iff `default=` was set | LANDED (A1a Step 6) |
| B5 (validators) | `state-decl.validators[]` non-empty | LANDED (A1a Step 5) |
| B7 (derived-DAG) | `state-decl.shape === "derived"` (Shape 3) | derived sufficient — B7 doesn't decorate the decl (DG-only); decl-shape is the trigger |
| B11 (compound-rollup synthesis) | `state-decl._cellKind === "compound-parent"` AND `validators.length > 0` somewhere in subtree | trigger via B5 + walk children |
| B14 (engine-decl) | `engine-decl.kind` + `engine-decl._record.engineMeta` (post-PASS 10) | LANDED |
| B14 (`derivedExpr`) | `engineMeta.derivedExpr !== null` | LANDED |
| B19 (channel) | `MarkupNode.kind === "markup" && tag === "channel"` (B19 fires diagnostics; the AST shape is what C0 reads) | LANDED |
| B21 (zone decision) | `state-decl.predicateCheck.zone` (3-zone classification; "boundary"/"trusted"/"static") | LANDED (B21 ships this) |
| B22 (reset target) | `reset-expr` AST nodes via `forEachResetExprInExprNode` | LANDED |
| A5-2 (parser) | `engineMeta.{historyAttr, parallelAttr}` + `EngineStateChildEntry.{historyAttr, internalRule, onTimeoutElements, innerEngines}` | LANDED |
| A5-3 (typer) | `engineMeta.{internalRules, onTimeoutElements}` aggregations | LANDED |

### §1.6 The brief's §4.3 trilemma — **MOOT**

The brief asked: (a) WAIT for A1b-COMPLETE; (b) fire NOW with conservative-everything; (c) PARTIAL C0 covering only landed B-steps. **Reality at `a8a6bdf`:** option (a) has happened. Every B-step + A5-2 + A5-3 has landed. C0 fires sound.

---

## §2 Bitmap shape vs current AST — RECOMMENDED `FeatureUsage` SHAPE

The brief §1 specifies a tentative bitmap. The survey extends it with A5-2/A5-3 fields and tightens the soundness story:

```ts
export interface FeatureUsage {
  // -------- Validators (per-predicate flags; L4 catalog) --------
  // Per BRIEF §1: bitmap-by-predicate-name across the 14-predicate universal-core
  // catalog. Per primer §13.7 B10 specifics: 14 names: req, is some, length,
  // pattern, min, max, gt, lt, gte, lte, eq, neq, oneOf, notIn.
  // (NOT in catalog: email/url/numeric/integer — stdlib `scrml:data`; custom — §55.9 enum tag.)
  validators: {
    req: boolean;
    "is some": boolean;       // V5-strict: "is some" is a 2-word predicate
    length: boolean;
    pattern: boolean;
    min: boolean;
    max: boolean;
    gt: boolean;
    lt: boolean;
    gte: boolean;
    lte: boolean;
    eq: boolean;
    neq: boolean;
    oneOf: boolean;
    notIn: boolean;
  };

  // -------- Engines + temporal (B14 + A5-2/A5-3) --------
  engines: boolean;              // any engine-decl present?
  derivedEngines: boolean;       // any engine-decl with engineMeta.derivedExpr !== null
  engineHistory: boolean;        // any engineMeta.historyAttr === true (file-scope OR-reduce — A5-3 aggregates)
  engineParallel: boolean;       // any engineMeta.parallelAttr === true
  engineInternalRules: boolean;  // any engineMeta.internalRules?.length > 0 (A5-3 file-scope aggregation)
  engineOnTimeout: boolean;      // any engineMeta.onTimeoutElements?.length > 0 (A5-3 file-scope aggregation)
  engineNested: boolean;         // any engineMeta.innerEngines?.length > 0
  onTransitionHooks: boolean;    // any <onTransition from=A to=B>...</> markup element

  // -------- Channels --------
  channels: boolean;             // any MarkupNode {kind:"markup", tag:"channel"} (file-level only post-B19; nested rejected)

  // -------- Refinement types (§53, three-zone) --------
  refinementTypes: boolean;      // any decl with predicateCheck.zone === "boundary"
                                 //   (boundary = the only zone that emits runtime; static + trusted both elide)
  refinementTypesAny: boolean;   // any decl with predicateCheck (regardless of zone — useful for output-budgeting)

  // -------- Validity surface (B11 + B12) --------
  validitySurface: boolean;      // any compound-parent state-decl whose subtree has validators (anywhere)
                                 //   OR any per-field state-decl with validators (B12 always synthesizes
                                 //   per-field surface even sans validators; this flag captures actual USE).
                                 //   Conservative: any compound-parent OR any cell with validators.

  // -------- Render-spec / markup-typed --------
  renderSpec: boolean;           // any state-decl with shape === "decl-with-spec" (Shape 2)
  markupTypedDerived: boolean;   // any state-decl with _cellKind === "markup-typed" (Shape 3 markup-derived)

  // -------- Reset + default --------
  reset: boolean;                // any reset-expr AST node (post-B22 walker enumeration)
  defaultExpr: boolean;          // any state-decl with defaultExpr !== null (the L18 γ runtime path)

  // -------- Variant C compound (Tier 2 reactive proxy) --------
  variantCCompound: boolean;     // any state-decl with children !== undefined (compound parent)

  // -------- Bare-variant inference (M9 / B20) --------
  bareVariantInference: boolean; // any IdentExpr with name starting "." (.Variant) OR
                                 //   simpler: any state-decl/let-decl/const-decl with typeAnnotation
                                 //   referencing an enum that has bare-variant-position usage
                                 //   (per BRIEF §8 + audit §13.7 B20: B20 stamps a hint —
                                 //   survey to verify the exact field).

  // -------- typeAsArgument (parseVariant — BRIEF §7.5/§8) --------
  typeAsArgument: boolean;       // any parseVariant<T>(...) call site (B23/parseVariant work).
                                 //   NOT-CRITICAL — flag is included for forward-compat per BRIEF §13 Q4
                                 //   (PA's lean: include, additive cost trivial). May be `false` always
                                 //   in the C0-landing if parseVariant Phase 2 hasn't shipped yet.

  // -------- Server functions / channels broadcast --------
  // (Server-side runtime for broadcast/disconnect; per SCOPE §3.9 these are
  //  auto-injected. C18 emits the runtime; C0 records "any channel" via channels flag.)
  // NO new flag — channels covers it.

  // -------- <program> documentary attrs (§40.7 / C19) --------
  programDocAttrs: boolean;      // any <program> markup with title/description/version/author/license attrs

  // -------- Schema (§39 / C17) --------
  // Schema lowering driven by ?{...} blocks + <schema> markup. Survey defers
  // bitmap inclusion to C17 — schema lowering happens at server-emit time and
  // is gated by SQL block presence, which is already detected by isServerOnlyNode.
  // If C17 needs a flag, add at C17 fire-time.
}
```

**Coverage gap notes (per BRIEF §7.4 stability):** every bitmap flag above maps to either an AST kind (which is structural and won't move) or an `_record`/`_cellKind`/`engineMeta` field (which is immutable post-A5-3). C0 is stable.

**Soundness contract:** every flag uses **conservative inclusion** — when the trigger is structurally present (e.g., `engine-decl` exists), the flag fires `true` regardless of any later A1b decoration completeness. This means even mid-flight A1b in a hypothetical future world (B-step decorations missing) wouldn't crash C0; it would just over-mark, which is acceptable per §11.2 (false-positives bloat; false-negatives crash).

---

## §3 Soundness > completeness check — **CONFIRMED**

Per SCOPE §11.2: ratified ordering is **soundness > completeness > minimal-output-size**. Survey confirms this is the only viable policy:

- **Validators:** trigger is `state-decl.validators[v].name === "<predicate-name>"`. Even if the type-checker (B10) silently ignored a malformed validator, C0 still sees the validator entry and includes the predicate. A1c's downstream catalog emit is then over-emitted (one unused predicate per ignored validator) — bloat, not crash.

- **Engines:** trigger is `kind === "engine-decl"`. Even if `engineMeta` is somehow null (it shouldn't be post-PASS 10.A), C0 fires `engines: true` based on the AST kind alone. The fields read for finer flags (`derivedEngines`, etc.) are guarded by `engineMeta?.field` accessors — `undefined` → `false` for sub-flags, but `engines: true` always wins on structural presence.

- **Channels:** trigger is `kind === "markup" && tag === "channel"`. B19 may have fired E-CHANNEL-INSIDE-PROGRAM rejecting nested channels, but the AST node still exists; C0 fires `channels: true` (defensive — even if codegen would refuse to emit, the runtime helper presence doesn't harm and matches the user's stated intent).

- **Reset:** trigger is `kind === "reset-expr"`. B22 may have fired E-RESET-INVALID-TARGET rejecting the call, but the node still exists in the AST. C0 fires `reset: true`. Defensive.

- **Refinement types:** the load-bearing flag is `boundary` zone (the only zone emitting runtime). Survey: when B21 cannot classify (e.g., type info missing), the `predicateCheck` annotation is absent; without `predicateCheck`, no refinement-runtime is needed for that decl. Conservative: include `refinementTypes` whenever ANY `predicateCheck.zone === "boundary"` is observed; if B21 missed a fire-site (false-negative for B21), C0 doesn't see it but the user-visible type also isn't refined → no runtime needed → soundness preserved.

**Verdict:** Soundness > completeness is the only sound policy and is achievable via the structural-AST-kind triggers above.

---

## §4 Walker placement — RECOMMENDED PLACEMENT

**Recommendation: dedicated module `compiler/src/codegen/usage-analyzer.ts` (NEW), invoked from `analyzeAll`.**

Rationale:
- Keeps `analyze.ts` lean (it's already the consolidation point — per its own docstring "the analysis layer wraps existing collection functions"; adding usage-analysis there bloats it).
- Single export `analyzeUsage(fileAST: FileAST): FeatureUsage` for per-file analysis; `mergeUsage(a, b): FeatureUsage` for cross-file OR-merge.
- `analyzeAll` calls `analyzeUsage` per file, OR-merges into a top-level bitmap, returns BOTH `fileAnalyses` (with per-file bitmap on `FileAnalysis.usage`) AND `featureUsage` (the cross-file merged bitmap).
- Tests live at `compiler/tests/unit/usage-analyzer.test.js`.

**Interface contract:**
```ts
// usage-analyzer.ts (NEW)
export function analyzeUsage(fileAST: FileAST): FeatureUsage;
export function mergeUsage(a: FeatureUsage, b: FeatureUsage): FeatureUsage;
export function emptyUsage(): FeatureUsage;  // all flags false
export function fullUsage(): FeatureUsage;   // all flags true (debug / safety-net)
```

`analyze.ts` change is small (3 LOC: import, call per-file, OR-merge into top-level result):
```ts
import { analyzeUsage, mergeUsage, emptyUsage, type FeatureUsage } from "./usage-analyzer.ts";

// inside analyzeAll, in the for-loop:
const usage = analyzeUsage(fileAST);
analysis.usage = usage;
fileAnalyses.set(...);
crossFileUsage = mergeUsage(crossFileUsage, usage);

// at return:
return { fileAnalyses, protectedFields, featureUsage: crossFileUsage };
```

`FileAnalysis` gains optional field `usage?: FeatureUsage` (avoid breaking existing callers); `analyzeAll` return shape gains `featureUsage: FeatureUsage`.

---

## §5 Cost decomposition — sub-steps + WIP-commit boundaries

Brief §6 estimated 3.5-7.5h. Survey adjusts to **3.5-5h** (existing-infra coverage is excellent — collect.ts deep-walks, MOD/CHX import graph, reset-expr enumerator, all in place). No new infra needed.

| # | Sub-step | Est | WIP commit boundary |
|---|---|---|---|
| 1 | Survey + progress.md | 1h | (this commit) `WIP(a1c-c0): startup verify + Phase 0 SURVEY` |
| 2 | `FeatureUsage` type + skeleton | 0.5h | `WIP(a1c-c0): FeatureUsage type + emptyUsage/fullUsage/mergeUsage skeletons` |
| 3 | Per-flag walker — validators (14 predicates) | 0.75h | `WIP(a1c-c0): validator-predicate flag detection (14 predicates)` |
| 4 | Per-flag walker — engines + temporal (A5-2/A5-3) | 0.5h | `WIP(a1c-c0): engine + temporal flag detection (history/parallel/internalRules/onTimeout/nested)` |
| 5 | Per-flag walker — channels + refinements + reset + render-spec + compound + bare-variant | 0.5h | `WIP(a1c-c0): remaining flag detection (channels/refinement/reset/renderSpec/compound)` |
| 6 | Wire into `analyzeAll` + cross-file merge | 0.25h | `WIP(a1c-c0): wire usage analyzer into analyzeAll + cross-file merge` |
| 7 | Unit tests (per-flag positive + negative) | 1h | `WIP(a1c-c0): unit tests — per-flag positive + negative` |
| 8 | Cross-file merge fixture test | 0.25h | `WIP(a1c-c0): cross-file merge integration test` |
| 9 | TodoMVC + kickstarter byte-output stability check + final SHIP | 0.25h | `feat(a1c-c0): SHIP — usage-analyzer pass + per-app FeatureUsage bitmap` |

**Total: 3.75-4.25h.** Soundness over completeness keeps detection logic simple per-flag (one `kind ===` check or one field read each).

---

## §6 Test plan

**Per-flag tests:** for each of ~22 flags (14 validator predicates + 8 feature flags), one positive test (feature present → flag set) and one negative test (feature absent → flag clear). Skeleton: 44 unit tests minimum, plus extra coverage for the 14 predicate names within the validators map.

**Cross-file merge tests:**
- Two-file fixture: file A has `engines: true`; file B has `channels: true`. Cross-file bitmap has BOTH. Per-file bitmap on each has only its own.
- Empty-file fixture: all flags `false`.
- Synth-record validity-surface fixture: compound-parent with validator-bearing children → `validitySurface: true`.

**Output-byte-shape stability tests** (per BRIEF §11 D7):
- Compile TodoMVC sample at C0-landing; assert byte-output unchanged from pre-C0 baseline. (C0 emits NO runtime; this just sanity-checks no codegen path was disturbed.)
- Compile kickstarter v2 §3 corpus (or smaller representative — the gauntlet-* samples are good fixtures); same assertion.
- Document the bitmap output for each fixture in the C0 progress.md (per SCOPE §11.3 DoD).

**Integration regression:** the standing 9682-pass invariant must hold after C0-landing. C0 is a pure analysis pass; zero behavior change to compile output. New test count target: **+45 to +55 tests** (44 per-flag + 3-4 cross-file + 2-3 integration).

**Test invariant strengthening:** add a "bitmap completeness probe" test: compile a kitchen-sink fixture that uses every v0.next feature, and assert ALL relevant bitmap flags are `true`. This is the canonical defense against B-step-decoration drift (per BRIEF §7.4 risk).

---

## §7 SCOPE CORRECTIONS to BRIEF §1 / §2

**Confirmed CORRECTIONS / ADDITIONS** (relative to BRIEF §1):

1. **A5-2/A5-3 fields the BRIEF missed.** BRIEF §1's bitmap shape lists `engines`, `derivedEngines` only. Survey adds: `engineHistory`, `engineParallel`, `engineInternalRules`, `engineOnTimeout`, `engineNested`, `onTransitionHooks`. These ride on `engineMeta` aggregations populated by A5-3 PASS 16.

2. **`refinementTypesAny` vs `refinementTypes` distinction.** BRIEF §1 says `refinementTypes: bool` (any §53 zone-bound predicate). Survey splits: `refinementTypes` (boundary-zone only — the runtime-emitting case) vs `refinementTypesAny` (any §53 predicate, regardless of zone — useful for output-budgeting). The boundary-only flag is what C16 actually consults.

3. **`bareVariantInference` flag added.** Per BRIEF §13 Q4 PA-lean: include `typeAsArgument` flag. By analogy: bare-variant inference (§14.10 / M9 / B20) is a similar "compile-time desugar" — include `bareVariantInference` for forward-compat with C22.

4. **`programDocAttrs` flag added.** Per SCOPE §3.10 / C19: documentary attrs to HTML head. Adding this flag is essentially free (one MarkupNode-walk match) and unblocks C19's elision policy if any.

5. **`onTransitionHooks` as a separate flag** (not just rolled into `engines`). C13 emits `<onTransition>` registration plumbing. Apps that use engines but never use onTransition (rule= only) can elide the hook-registration code path.

6. **`validitySurface` trigger refined.** BRIEF §1 says "any compound-with-validators or per-field-with-validators". Survey: the trigger is more conservative — fire `true` whenever ANY compound-parent exists, since B11/B12 unconditionally synthesize the surface. (Per primer §13.7 B11 specifics: synthesis is unconditional per §55.5/§55.6 predictability rule.) The compound-parent-without-any-child-validators case still synthesizes trivially-valid defaults; the runtime IS used. Conservative: any `_cellKind === "compound-parent"` → `validitySurface: true`.

7. **Channels flag — ignore `_p3aIsExport` filter or not?** Survey: `collectChannelNodes` filters out `_p3aIsExport: true` nodes (the exporter-side channel decl whose code lands at consumer sites via CHX). For C0 bitmap purposes, BOTH the exporter AND consumer files should have `channels: true` (the exporter has a channel, even if the runtime is emitted at consumer sites; the per-file bitmap should reflect "uses channels" correctly). **Recommendation:** C0 walks raw `MarkupNode` matches without the `_p3aIsExport` filter — the bitmap is about feature usage at the AST level, not codegen attribution.

**No CORRECTIONS to §2 (downstream consumer table).** That table reads correctly; survey adds no new consumers (downstream C-steps not yet decomposed enough to map).

---

## §8 Risks surfaced by survey

### §8.1 Predicate-name string identity

Validator predicate names are strings on `ValidatorEntry.name`. The 14-predicate catalog (`compiler/src/validator-catalog.ts`) is the single source of truth. C0 must use the exact same string keys. Mitigation: import the catalog constants from `validator-catalog.ts` and use them as the map keys. Avoids drift.

### §8.2 Bare-variant inference flag definition

B20 doesn't decorate a single AST field; bare-variant inference is detected by walking ExprNodes for `IdentExpr` with `name.startsWith(".")` AND uppercase first non-dot char. C0 will need a small ExprNode walker. Library helper `forEachIdentInExprNode` already exists (`expression-parser.ts`) and is reusable — same pattern B22's `forEachResetExprInExprNode` uses.

### §8.3 typeAsArgument (parseVariant) flag — not blocker

parseVariant Phase 2 not confirmed shipped at HEAD `a8a6bdf`. C0 includes the flag with detection-stub returning `false` always; later parseVariant Phase 2 adds the actual detector (one-line change). Per BRIEF §7.5: no architectural collision.

### §8.4 Recursion correctness — engine-decl placement

`engine-decl` nodes live as **markup children** (per `dependency-graph.ts:537-552` comment), NOT logic-block children. C0's walker must descend through `markup.children` AND `logic.body` AND `state-decl.children` (compound) AND `match-arm-block.body` AND `if-stmt.consequent/alternate` etc. Reuse the recursion shape from `collectChannelNodes` + `collectAllEngineDecls` in dependency-graph.ts (which has the right model). Mitigation: a single recursive `walkUsage(nodeList, bitmap)` that descends into every container shape (children/body/defChildren/consequent/alternate/arms[].body/state-decl.children).

### §8.5 No new diagnostics

Per dispatch instructions: ZERO new diagnostics fired by C0. ZERO AST mutation. ZERO emission. Survey confirms this is achievable — every flag is a structural read; no "is this legal?" decision is C0's. If a question arises, C0 conservatively includes (sets the flag) and lets downstream emitters (or already-ran A1b) flag the error.

### §8.6 Per-file vs per-app shape

`FileAnalysis.usage` (per-file) is included for forward-compat (cache reuse) but not strictly required by SCOPE §11. `featureUsage` (cross-file merged) IS what downstream emitters consume. Both shapes share the same `FeatureUsage` interface. Storing per-file gives debug introspection (`why does my app have engines? → check file X's bitmap`) at near-zero cost.

---

## §9 Verdict + recommendation

**Recommendation: PROCEED-AS-BRIEFED with minor scope augmentation.**

The brief's intent matches the survey's findings 1:1. The augmentations are additive: more bitmap fields (mostly A5-2/A5-3 awareness the brief couldn't have known about, since brief was drafted S65 pre-A5-2/A5-3); minor structural correction (separate module `usage-analyzer.ts` not in `analyze.ts`); confirmation that all dependencies are met (every B-step + A5-2/A5-3 has shipped — option (a) from §4.3 is what happened).

**Cost:** 3.5-4.25h (slight reduction from BRIEF §6's 3.5-5h) because existing-infra coverage is excellent and no new collect.ts entries are needed.

**Risks:** all manageable — see §8.

**Ready for PA acknowledgment + implementation authorization.**

---

## §10 Tags

#a1c-c0 #usage-analyzer #feature-elision #compile-time-elision-option-c #t2-tier #depth-of-survey-discount #survey-complete #proceed-as-briefed-with-scope-augmentation #a5-2-a5-3-aware
