# C23 — PIPELINE.md Prose Pass — SURVEY

**Date:** 2026-05-09
**Session:** S75
**Worktree:** `.claude/worktrees/agent-a2402592dfd975619`
**Target file:** `compiler/PIPELINE.md` (currently 2,380 lines)
**Scope dispatch:** SCOPE-AND-DECOMPOSITION §4.6
**Deferred-work source:** `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` §8.6 #2

## §1 Why this pass exists

PIPELINE.md was rewritten in D2-D4 (S57-S58) to encode v0.next pipeline contracts. The agent
chose **stitched addenda** — append a `### Stage N v0.next addendum` block to the end of each
affected stage section — rather than re-flow the existing v0 prose. That kept D4 in scope and
preserved the v1 prose verbatim, but it left the reader with a fragmented experience: open a
stage, read the v0 prose, jump to the addendum at the bottom, mentally merge.

This pass eliminates the bolt-on framing where the addendum content can fold into the main
narrative, and adds three reader-facing additions the brief calls out:

1. **Lock-firing locus per stage** — for each lock L1-L22, name the stage(s) that fire it.
2. **Validity-surface synthesis as a named (sub-)stage** — surface B11/B12/C8 as one
   reader-discoverable section, not three addenda fragments.
3. **Integration Failure Mode Catalog (IFMC)** — confirm v0.next entries are properly
   ordered and cross-referenced; add missing entries surfaced post-D4.

## §2 Addendum inventory

| Stage | Addendum line range | Topic |
|---|---|---|
| Stage 3 (TAB) | 548-630 | New tokens (`pinned`, `is some`, `default=`); structural-element recognition; `:`-shorthand; V5-strict ReactiveDecl AST shape; render-spec classification; bare-variant + positional inference parsing; multi-statement-handler restriction; new error codes |
| Stage 3.05 (NR) | 728-777 | Auto-declared engine variable resolution (M6); auto-derive algorithm; resolvedCategory extensions for v0.next structural elements; `pinned` forward-reference detection; cross-cell expression dependency tracking |
| Stage 3.1 (MOD) | 867-890 | Export registry `category` extension (engine, user-state-type); engine export validation; `pinned` import validation |
| Stage 3.3 (UVB) | 1146-1183 | VP-1 attribute-allowlist for v0.next structural elements; VP-2 v0.next invariants (onTransition outside engine, etc.); VP-3 v0.next interpolation rules |
| Stage 6 (TS) | 1629-1718 | ResolvedType extensions (engine, validity-surface); auto-synthesized validity surface type-checking; ValidationError enum; render-spec validity classification; engine `derived=` type compatibility; bare-variant inference resolution; positional binding for predefined shape; validators-on-derived rejection |
| Stage 7 (DG) | 1972-2031 | New DGNode kinds (engine-decl, engine-variant, validity, derived-cell, validator-pred); new DGEdge kinds (derives-from, engine-derives, validator-arg, rule-source, transition-effect); validator predicate-arg dep tracking; derived-state dep tracking; engine state-child rule edges; `<onTransition>` / `effect=` edges |
| Stage 8 (CG) | 2230-2300 | `<x/>` render-by-tag expansion table; engine state-child rendering; validity property emission; `<errors of=expr/>` rendering; `reset(@cell)` keyword expansion; auto-name encoding; new CG error codes |

Total addendum prose: ~445 lines (across 7 stages).

## §3 Re-flow plan per stage

**Plan:** every addendum re-flows. Each addendum's content fits naturally into the existing
section's contract substructure (Input contract / Output contract / Error contract / Transformation
/ Performance budget). The "v0.next addendum" framing is the artifact of D4's compositional
choice, not a structural property of the content.

**Strategy per stage:**

| Stage | Re-flow strategy |
|---|---|
| Stage 3 (TAB) | Merge new tokens into Transformation; merge structural-element recognition into Output contract / invariants; merge V5-strict AST shape into the LogicNode definition block; append v0.next error codes to the Error codes list; absorb performance-budget delta into the existing budget line. |
| Stage 3.05 (NR) | Merge auto-declared-engine-variable algorithm into Transformation; extend resolvedCategory table inline in Output contract; merge `pinned` forward-ref detection into Error contract; absorb cross-cell dep tracking into "What is NOT done" list (clarifies handoff to DG). |
| Stage 3.1 (MOD) | Extend exportRegistry shape inline in Output contract; merge engine export validation + `pinned` import validation into Error codes list. |
| Stage 3.3 (UVB) | Merge VP-1 attribute-allowlist additions into the VP-1 bullet; merge VP-2 v0.next invariants into the VP-2 bullet; merge VP-3 v0.next rules into the VP-3 bullet; absorb perf-budget delta. |
| Stage 6 (TS) | Merge ResolvedType v0.next variants into the existing ResolvedType code block; merge auto-synthesized validity surface into Output invariants and Transformation; merge ValidationError enum + render-spec classification + bare-variant resolution + positional binding + validators-on-derived into Transformation and Error codes. The validity-surface synthesis content lifts into a dedicated **Stage 6.7** sub-stage (see §5 below). |
| Stage 7 (DG) | Merge new DGNode/DGEdge kinds into the existing DGNode/DGEdge type definitions inline; merge validator predicate-arg + derived-state + rule-source + transition-effect edge derivation into Transformation; absorb new error codes (`E-VALIDATOR-CIRCULAR-DEP`, `E-DERIVED-CIRCULAR-DEP`, `E-DERIVED-ENGINE-CIRCULAR`) into Error codes list. |
| Stage 8 (CG) | Merge render-by-tag expansion table into the existing Transformation prose; merge engine state-child rendering, validity property emission, `<errors>` rendering, `reset(@cell)` expansion, auto-name encoding into Transformation as numbered sub-blocks under existing structure; merge new CG error codes into the Error codes list. |

**Cross-stage:** the auto-synthesized validity-surface narrative is fragmented across Stage 6
TS addendum (synthesis/typing), Stage 7 DG addendum (validator-arg edges), Stage 8 CG addendum
(emission). Per the brief, these are surfaced together as **Stage 6.7: Validity Surface Synthesis**
between Stage 6 (TS) and Stage 6.5 (META) — actually Stage 6.7 fits naturally **after** META
since synth-cell registry ordering is independent of meta evaluation. See §5 below for the
final placement decision.

**No partial keeps.** Every addendum re-flows. The "engineering content complete" property is
preserved because no content is dropped; the change is purely re-flow.

## §4 Lock-firing locus mapping

Locks L1-L22 originate from S56 deliberation (L1-L20), S59 (L21), and S65 (L22). Each lock is
implemented at one or more pipeline stages. The final form chosen is **a top-level "Lock Enforcement
Map" section inserted just after the Stage Index** — readers searching for "where does L11 fire?"
hit this table first; per-stage callouts duplicate without adding signal.

| Lock | One-line statement | Firing stage(s) |
|---|---|---|
| L1 | Markup-as-first-class-value (pillar) | Cross-cutting — no single firing locus; manifests as Stage 3 (TAB render-spec parsing), Stage 6 (TS render-spec validity classification), Stage 8 (CG render-by-tag expansion) |
| L2 | Compound state — Variant C canonical `@compound.field` access | Stage 3 (TAB compound-rollup AST shape) + Stage 6 (TS field-type resolution) |
| L3 | Decl-coupled-with-render-spec (`<name req> = <input/>`) | Stage 3 (TAB rhsShape classification) + Stage 6 (TS bindable/non-bindable classification) |
| L4 | Declarative validators with partial vocabulary unification | Stage 3.3 (VP-1 attribute allowlist) + Stage 6 (TS validator-vocabulary check) |
| L5 | `is some` reused from existing existence primitive | Stage 3 (TAB token recognition) + Stage 6 (TS optional-typing semantics) |
| L6 | Match unification — Tier 0/1/2 ladder | Stage 3 (TAB match-block-decl AST shape) + Stage 6 (TS exhaustiveness) + Stage 8 (CG conditional dispatch) |
| L7 | Match attribute semantics (rules legal-but-inert; `effect=`/`<onTransition>` engine-only) | Stage 3.3 (VP-2 `E-STRUCTURAL-ELEMENT-MISPLACED` for `<onTransition>` outside engine) + Stage 6 (TS attribute semantics) |
| L8 | Two match shapes coexist (block-form vs JS-style) | Stage 3 (TAB classifies by parent context) |
| L9 | `loose` flag dropped | N/A — negative-space lock; no firing site (absence) |
| L10 | `reset()` as primitive (superseded by L18) | superseded — see L18 |
| L11 | Auto-derived validity surface per compound | **Stage 6.7 (Validity Surface Synthesis)** — NEW sub-stage; fires across TS synthesis (sub-pass), DG `validator-arg` edges, CG accessor emission |
| L12 | Validator error-message origin (4-level hybrid + `.Custom(tag)`) | Stage 6 (TS message-resolution chain) + Stage 8 (CG `messageFor(...)` emission) |
| L13 | Per-field error UI rendering (`<errors of=expr/>`) | Stage 3 (TAB errors-elem AST shape) + Stage 3.3 (VP-2 of= required) + Stage 8 (CG `<errors>` rendering) |
| L14 | Cross-field validation via predicate args (no separate category) | Stage 7 (DG `validator-arg` edges + cycle detection → `E-VALIDATOR-CIRCULAR-DEP`) |
| L15 | `const <derived> = expr` in-compound derived form | Stage 3 (TAB rhsShape `derived-expr`) + Stage 6 (TS derived-cell typing) + Stage 7 (DG `derives-from` edges + cycle detection) + Stage 8 (CG reactive computed emission) |
| L16 | Multi-render via existing access paths (no override syntax) | N/A — negative-space lock |
| L17 | Bind-attribute dispatch by render-spec shape | Stage 6 (TS bindable/non-bindable classification) + Stage 8 (CG bind-flavor dispatch table) |
| L18 | `reset(@cell)` keyword (γ-semantics with `default=` fallback to β init re-eval) | Stage 3 (TAB `default=` capture; `reset` as keyword) + Stage 8 (CG `reset(@cell)` expansion) |
| L19 | Multi-statement event handler restriction | Stage 3 (TAB `E-MULTI-STATEMENT-HANDLER` at parse time) |
| L20 | `derived=expr` on engines | Stage 3 (TAB `derived=` attribute) + Stage 6 (TS engine-type compatibility) + Stage 7 (DG `engine-derives` + `E-DERIVED-ENGINE-CIRCULAR`) + Stage 8 (CG derived-engine reactive subscription) |
| L21 | Derived-cell value-mutation forbidden | Stage 6 (TS `E-DERIVED-VALUE-MUTATE`) |
| L22 | Type-as-argument as first-class primitive (`parseVariant` first member) | Stage 3 (TAB type-token recognition in expression position) + Stage 6 (TS type-as-argument resolution) + Stage 8 (CG `parseVariant` runtime emission) |

**Multi-stage locks (the rule, not the exception):** most locks fire across 2-4 stages.
L1, L9, L10, L16 are the exceptions (cross-cutting / superseded / negative-space).
**Decision:** present as a **single top-level table** after the Stage Index. Per-stage callouts
would duplicate this table 7 times; the top-level form lets readers locate enforcement points
and trace from there into the relevant stage section.

## §5 Validity-surface synthesis as a named sub-stage

**Today:** the synth-cell narrative is split across:
- Stage 6 TS addendum lines 1640-1654 (synthesis + typing of `@x.isValid`/`@x.errors`/`@x.touched`/`@x.submitted`).
- Stage 7 DG addendum lines 1996-2002 (`validator-arg` edges feeding the synth-cell node).
- Stage 8 CG addendum lines 2253-2265 (computed-property accessor emission).

**Reader's problem:** "Where does the validity surface get built?" requires reading three
addenda in three different sections and merging them.

**Proposal:** insert a new **Stage 6.7: Validity Surface Synthesis** section between Stage 6.5
(META) and Stage 7 (DG). This is a TS sub-pass in implementation (B11 + B12 SYM PASS 8 inside
type-system; B17.x adds `<onTransition>` walker; C8 emits the surface) but a reader-discoverable
distinct stage in the pipeline narrative.

**Rationale for the placement (after META, before DG):**
- TS in implementation has the synth-cell registry construction (B11) and the per-field synth-surface
  walker (B12). Both run as TS sub-passes.
- META does not touch validity surfaces (orthogonal — meta operates on `^{}` blocks).
- DG consumes the synth-cells: validator-arg edges fire INTO the synth-cell node; cross-field
  cycle detection requires the synth-cell graph to be complete before DG runs.
- CG emits the accessors using the synth-cell registry.

So the chain is: TS → (validity surface complete inside TS) → META → DG (uses surface) → CG (emits surface).

**The sub-stage section is illustrative-not-implementation.** B11/B12 remain TS sub-passes in
the implementation. The Stage 6.7 narrative is a reader-accessible composite view that explains
"the validity surface" as a single concept rather than as 3 fragmented addenda.

**Section content:**
1. Inputs: TS-typed cells with validators (from Stage 6 sub-pass output).
2. Synth-cell registry construction (B11 — per-cell synth-surface entry + per-field sub-entry).
3. Per-field synth-surface walker (B12 — propagate touched/submitted/errors/isValid down to fields).
4. `<onTransition>` walker integration (B17 fire-site identification).
5. Type-checking the synth-cells (rejection of writes via `E-SYNTHESIZED-WRITE`).
6. Output: typed AST with synth-cells registered as readable computed cells; consumed by DG and CG.
7. Performance budget: ≤ 5 ms per file (already absorbed into Stage 6's 30 ms budget; called out
   here for the sub-stage view).

The section also cross-refs L11 (auto-validity-surface lock).

## §6 IFMC delta plan

Current IFMC at line 2335. **Entry count:** 26 (15 v1-era + 11 v0.next).

**Audit findings:**

1. **Order:** v0.next entries are clustered at the bottom (lines 2357-2367). Per-stage ordering
   is loose — lifecycle order (TAB → NR → MOD → UVB → ... → CG) is not strict. Recommend
   ordering ALL entries (v1 + v0.next) by detection-stage to make scanning by stage easier.
2. **Cross-refs:** v0.next entries cite SPEC sections inconsistently (some include §, some
   omit; some mention test ID, most don't). Unify: every entry cites SPEC § + the test ID
   (or "test forthcoming, see <step>" if pre-implementation).
3. **Missing entry surfaced post-D4:** `B14 PASS 10.B path-shape mismatch` (engine binding
   path-shape inconsistency surfaced in S74 wrap). File as IFMC entry; cite step.
4. **Missing entry: derived-cell value mutation (L21).** L21 was locked S59 with
   `E-DERIVED-VALUE-MUTATE` but no IFMC row. Add.
5. **Missing entry: parseVariant non-enum-arg (L22-related).** `parseVariant(json, NonEnumType)`
   produces `E-PARSEVARIANT-001` (TS, post-S65). Add.
6. **No duplicates.** Manual cross-check of the 26 entries — none duplicate (validator-circular,
   derived-circular, derived-engine-circular are correctly three distinct rows).

**Proposed deltas:**
- Reorder all 26 + 3 new = 29 entries by detection-stage (TAB → BS → ... → CG → cross-cutting).
- Unify cross-ref format: `Detection Point` column always cites stage error code + SPEC §.
- Add 3 new rows: derived-cell value mutation, parseVariant non-enum-arg, B14 path-shape mismatch.

## §7 Cross-ref impact

PIPELINE.md is cited from many docs. Renumbering risks:
- **Stage section additions:** new Stage 6.7 inserted between Stage 6.5 and Stage 7. Stages 7, 7.5, 8
  do NOT renumber (Stage 6.7 is a fractional insert; Stage 7 stays Stage 7).
- **Addendum sections:** removed entirely. Any external doc citing
  `PIPELINE.md "Stage N v0.next addendum"` by name needs updating. Search shows
  `IMPLEMENTATION-ROADMAP.md` §8.6 #2 itself references the addendum framing in prose; that
  reference becomes informational ("addenda were re-flowed in C23").
- **Line-number citations:** any external doc citing PIPELINE.md by line number is at risk.
  Audit `docs/changes/**/*.md` and `docs/reviews/**/*.md` for `PIPELINE.md:NNNN` patterns.

The line-number audit will be run as part of the implementation phase to surface affected docs;
findings reported in `progress.md`.

## §8 Estimated revised scope

| Phase | Effort | Ouptut |
|---|---|---|
| 0 Survey (this doc) | done | SURVEY.md |
| 1 Stage 3 (TAB) re-flow | 1.0h | Stage 3 section coherent, addendum removed |
| 2 Stage 3.05 (NR) re-flow | 0.5h | Stage 3.05 section coherent |
| 3 Stage 3.1 (MOD) re-flow | 0.3h | Stage 3.1 section coherent |
| 4 Stage 3.3 (UVB) re-flow | 0.5h | Stage 3.3 section coherent |
| 5 Stage 6 (TS) re-flow + sub-stage extract | 1.5h | Stage 6 section coherent; Stage 6.7 surfaces |
| 6 Stage 6.7 (Validity Surface Synthesis) NEW | 0.5h | New sub-stage section |
| 7 Stage 7 (DG) re-flow | 1.0h | Stage 7 section coherent |
| 8 Stage 8 (CG) re-flow | 1.5h | Stage 8 section coherent |
| 9 Lock Enforcement Map | 0.5h | New top-level table after Stage Index |
| 10 IFMC reorder + 3 new rows | 0.5h | IFMC table refreshed |
| 11 Cross-ref audit + line-number sweep | 0.5h | Findings in progress.md |
| 12 Final pass + version bump 0.7.0 → 0.7.1 | 0.3h | Change log entry |

**Total:** ~8.6h estimated. May absorb into 6-7h with reuse of in-place text.

**Test impact:** zero. Markdown only. Pre-commit hook runs; expected 0 regression.

## §9 Open questions / surfaces

None blocking. Decisions made:
- Lock map: **top-level table after Stage Index** (not per-stage callouts).
- Validity surface placement: **Stage 6.7** (between META and DG, after Stage 6.5).
- Addendum convention: **drop entirely**; every addendum re-flows.
- Version bump: **0.7.0 → 0.7.1** (prose-only change log entry).

If implementation surfaces a place where re-flow forces a normative claim drift from SPEC.md,
will halt and surface as Rule-4 violation per dispatch §HARDLY-EVER.
