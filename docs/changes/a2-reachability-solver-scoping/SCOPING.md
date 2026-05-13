# A-2 — Reachability Solver — Implementation SCOPING

**Status:** DRAFT — awaits PA + user OQ disposition before any A-2.* sub-phase dispatches.
**Authority:** Insight 29 (`scrml-support/design-insights.md` line 1827; 5-voice debate verdict 2026-05-11). SPEC anchor LANDED at `d3deed2` (S86): SPEC.md §40.9.1-.11. PIPELINE.md Stage 7.6 (lines 2332-2412) is the normative pipeline-stage contract. User S88 ratification: full Approach A (A-1..A-5) is in the v0.3.0 cut.
**Predecessor wave:** A-1 closed S89 (commit `376a219`). A-1.7 ceiling re-measurement: **523 markup-read DG nodes + 523 `reads` edges across 61-file corpus** (2.04x the S84 256-edge projection).
**Underwriting empirical study:** S84 diagnostic — 99-100% static-resolvability gate PASS (501 reactive-graph reads/writes / 33 files; runtime-only catalog functionally empty).
**Estimate band per hand-off-88:** ~80-160h for one sub-wave of the 260-560h A-2..A-5 aggregate. This scoping refines that band based on the post-A-1 substrate and PIPELINE Stage 7.6 contract.

---

## §1 Background + Wave Position

### 1.1 A-1 wave outcome (post-S89 close)

A-1 lifted markup-context reactive reads into the Stage 7 Dependency Graph as a new node kind (`MarkupReadDGNode`, `kind: "markup-read"`) and a `reads` edge from each markup-read node to its target `ReactiveDGNode`. Per A-1.7 ceiling re-measurement (`docs/changes/a1-closeout/A1-7-ceiling-remeasurement.md`):

| Metric | S84 baseline | S89 measured (post-A-1) |
|---|---:|---:|
| Corpus size | 33 files | 61 files |
| Markup-read DG nodes | 0 (sentinel-only) | 523 |
| New `reads` edges (markup-read → reactive) | 0 | 523 |
| Node:edge ratio | — | 1.0 |

Shape coverage (A-1.3 / A-1.4 / A-1.5): interp / variable-ref attr / bind:value / if= condition / call-ref args / for-iterable / lift-template body / engine state-child / onTransition / onTimeout / onIdle. The kind-discriminator pattern across DG consumers means new node kinds default-skip cleanly (A-1.6 audit, 5 consumers, 0 flagged).

**The substrate A-2 consumes is now structurally complete** for the reactive-graph half of `reactive_dep_closure(C)` per SPEC §40.9.3.

### 1.2 A-2's role in the A-1 → A-5 sequence

```
A-1 (markup edges) ─┬──> A-2 (RS) ─┬──> A-4 (per-route split) ──> A-5 (E2E tests)
                    │              │
                    └─> A-3 (auth) ─┘
```

A-2 is the **whole-stack closure analysis** that consumes:
- A-1's reactive DG (now with markup-context `reads` edges) — Component 2 input
- The §52 server-fn boundary from RI — Component 3 input
- A-3's AuthGraph + the §40.1.1 role enum — Component 4 input
- The §41 vendor-unit declarations from MOD — Component 5 input
- The §40.8 v0.3 program-shape route enumeration — entry-point list
- BatchPlan from Stage 7.5 (informational only)

A-2 produces `ReachabilityRecord` per PIPELINE Stage 7.6 — the per-entry-point per-role `ChunkPlan`s that A-4 splits into deliverable artifacts.

### 1.3 Downstream dependencies

- **A-3** is parallelizable with A-2's early sub-phases (the AuthGraph schema is a fresh derivation; only Component 4 of A-2 needs to consume it). Hand-off-88 sequencing allows A-3 dispatch concurrent with A-2 once A-1 lands.
- **A-4** (per-route artifact splitter) consumes A-2's `ReachabilityRecord.closures` and emits per-tier chunks (§40.9.7). Strictly sequential post-A-2.
- **A-5** (integration tests) anchors the SPEC §40.9.9 worked example + S84 corpus + trucking-dispatch + TodoMVC + kanban replay against A-2's output. Strictly sequential post-A-2/A-4.
- **W-AUTH-RUNTIME-FALLBACK** lint emission is gated on A-2 (per §34 catalog row; fire-site is either Stage 7.6 RS or Stage 3.3 UVB — A-2 picks).
- **`scrml compile --emit-reachability`** CLI flag exposes `ReachabilityRecord` as JSON (PIPELINE Stage 7.6 line 2396).

---

## §2 Algorithm Sketch

### 2.1 What "Reachability Solver" means concretely

The Reachability Solver computes, for each `(entry_point E, role variant R)` pair, the `playable_surface(E, N)` function per SPEC §40.9.1:

```
playable_surface(E, N) :=
  closure(
    initially_rendered_components(E)
    ∪ reactive_dep_closure(initially_rendered_components(E))
    ∪ server_fn_reachable_within(N, initially_rendered_components(E))
    ∪ auth_gated_boundaries_visible_to(E.viewer_role)
    ∪ vendor_units_used_by(initially_rendered_components(E))
  )
```

Five **component operators** (Components 1-5; SPEC §40.9.2-.6), unioned, then closed under transitive reachability by an **outer fixed-point operator** until no operator adds new elements.

### 2.2 Algorithm shape

**Two-layer fixed-point structure:**

- **Inner layer (per-component closures):** each of the five component operators is itself a graph-walk:
  - Component 2 — forward DFS / BFS over `reads` edges in the DG starting from the rendered-component set. (Plus `validator-reads` + `engine-derived-reads` — see §6 OQ-5.)
  - Component 3 — bounded BFS over the "interaction graph" projection of DG `calls` + `awaits` edges plus event-handler-attachment AST edges, depth-bounded by `N`.
  - Component 4 — set intersection of the role-enum variant with the AuthGraph's role-classification map (closed-form predicates only; non-closed-form gates fall back to runtime — `W-AUTH-RUNTIME-FALLBACK`).
  - Component 5 — set membership: traverse the §41 vendor-unit declaration map for every component currently in the set.
  - Component 1 — partial evaluator over `if=` / `<match>` / `<details>` (etc.) gates using the §22 compile-time-constant-folding pass; gates that are not closed-form admit the worst-case union of all branches.

- **Outer layer (closure operator):** chase the union until fixpoint. Adding a component to the set MAY admit further reactive deps (Component 2 re-runs on the newly admitted component), further server-fn calls (Component 3), further auth gates (Component 4), further vendor units (Component 5). Termination by finiteness of the underlying graphs (§31 DG / §40 auth / §52 server-fn / §41 vendor) per SPEC §40.9.1.

**Forward closure semantics** is the load-bearing direction (which cells/fns/components does a rendered component pull in?). Backward closure (which components read this cell?) is not normatively required by §40.9 but is a natural side-output of the same data structure; see §6 OQ-1.

### 2.3 SPEC citations + silences

**SPEC anchors (load-bearing for A-2):**
- §40.9.1 — `playable_surface(E, N)` formalization; closure-as-fixed-point + monotonicity-in-N + termination + determinism.
- §40.9.2 — Component 1 — `initially_rendered_components(E)`; worst-case-union admission for runtime-gated branches; uses §22 constant-folding pass.
- §40.9.3 — Component 2 — `reactive_dep_closure(C)`; consumes Stage 7 DG with markup-context `reads` edges lifted (A-1 closed this gate).
- §40.9.4 — Component 3 — `server_fn_reachable_within(N, C_set)`; interaction-graph projection over DG `calls` + `awaits` + event-handler-attachment AST shape; N=0/1/2 semantics + N≥3 on-demand.
- §40.9.5 — Component 4 — `auth_gated_boundaries_visible_to(role)`; closed-form predicate over §40.1.1 role enum; runtime-fallback via `W-AUTH-RUNTIME-FALLBACK`.
- §40.9.6 — Component 5 — `vendor_units_used_by(C_set)`; §41 vendor-unit declarations as canonical split-unit set.
- §40.9.7 — Per-tier output structure (`initial_chunk` / `prefetch_tier_1` / `prefetch_tier_2` / `prefetch_tier_N`).
- §40.9.8 — Determinism preservation; all inputs static (NO telemetry in v0.3).
- §40.9.9 — Worked example (Dispatch / Header / Dashboard / ProfileWidget).
- §40.9.11 — Error codes: `E-CLOSURE-001` (error, defensive) + `W-AUTH-RUNTIME-FALLBACK` (info).
- PIPELINE Stage 7.6 (lines 2332-2412) — input/output contract, preconditions, responsibilities, invariants, CLI exposure.

**SPEC silences (LOAD-BEARING — must be surfaced for user disposition):**
1. **Inner fixed-point ordering.** SPEC fixes the OUTER closure as fixpoint but does NOT specify whether the five component operators are applied in a particular order in each fixpoint iteration, or whether they may interleave. (Determinism §40.9.8 requires same output for same input — the implementation MAY commit to a specific order, but SPEC doesn't bind one.) → OQ-A2-A.
2. **N=1 / N=2 / N=3 cap.** §40.9.4 specifies N=0/N=1/N=2 as named tiers and "N≥3 on-demand by default. The compiler MAY surface a per-app override knob in future v0.3.x revisions; v0.3.0 does NOT specify one." A-2 must commit to a hard cap (e.g., N≤2 + on-demand N≥3 surface) but the cap itself is not normatively fixed. → OQ-A2-B.
3. **Interaction-depth backward extension.** §40.9.4 specifies forward-from-rendered-component. It does NOT specify whether `playable_surface(E, N)` includes server-fns reachable BY THE WRITER side of a reactive write that crosses the server boundary (e.g., `@cell` written by client triggers reactive chain that calls server-fn — does that count as N=1?). → OQ-A2-C.
4. **Component-1 evaluator surface.** §40.9.2 references "the §22 constant-folding pass" — but §22 (`^{}`) constant-folding does not currently exist as a callable analysis primitive separated from META-block execution. A-2 must either author this primitive or extract from META. → OQ-A2-D.
5. **Per-route entry-point enumeration on SPA shape.** §40.9.1 says SPAs contribute exactly one entry point. For multi-page shapes, "each `<page>` declaration" is the rule. But: does an `<auth>` block whose `else` branch redirects to a different route create a NEW entry point for the redirect target's role? SPEC §40.9.9 implies "no" (the redirect target is its own page; therefore its own entry point). Confirm. → OQ-A2-E.
6. **Empty-role / no-role-enum-declared application.** PIPELINE Stage 7.6 line 2380: "if the application declares no role enum AND uses no auth gates, RS treats every entry point as having a single anonymous viewer role; if the application uses auth gates without declaring a role enum, RS aborts with a compiler error (subsequent wave; not v0.3.0 normative)." The error-code for this is NOT cataloged. → OQ-A2-F.
7. **`E-CLOSURE-001` fire conditions.** §40.9.1: "defensive — SHOULD NOT fire on valid source." A-2 must decide WHEN exactly the iteration cap fires (e.g., iteration count > some bound) — SPEC doesn't pin the bound. → OQ-A2-G.

### 2.4 Per-source-node reachability set output

The output `ReachabilityRecord.closures: Map<EntryPointId, RolePlayableSurface>` maps each entry point to a per-role `ChunkPlan` (per PIPELINE Stage 7.6 line 2351-2365). The `ChunkContents` shape is per-tier:

```typescript
interface ChunkContents {
  componentNodeIds: Set<NodeId>;       // DG render-nodes + state-children
  reactiveCellNodeIds: Set<NodeId>;    // DG reactive-nodes (via Component 2)
  serverFnNodeIds: Set<NodeId>;        // RI/§52 boundary (via Component 3)
  vendorUnitNames: Set<VendorUnitId>;  // §41 (via Component 5)
}
```

**markup-read nodes** are NOT directly emitted into the chunk — they are the *substrate* edges used by Component 2 to discover which reactive cells a component reads. The chunk contents are the reactive cells themselves (the `to` of the `reads` edge), not the markup-read intermediary (the `from`). This matches the A-1.6 audit finding that markup-read nodes are downstream-invisible to non-RS consumers.

---

## §3 Data Structures

### 3.1 AST kinds

**No new AST kinds.** A-2 is post-typer analysis — it consumes Stage 7 DG + RI output, not AST shape directly. (Caveat: Component 3's interaction-graph projection reads event-handler-attachment AST shape (`onclick=`, `onsubmit=`, etc.); this is read-only AST traversal — no new node kinds.)

### 3.2 DG node kinds

**No new DG node kinds.** A-1 added `MarkupReadDGNode`; A-2 consumes the existing DG node + edge set.

**Potential DG edge-kind addition (FLAGGED for OQ):** SPEC §40.9.4 references "event-handler-attachment AST edges" as part of the interaction graph. Today these are NOT in the DG — they exist only as raw AST `onclick=`/`onsubmit=`/etc. attributes resolved against logic-scope identifiers. A-2 has two options:

- **Option α — pure AST projection.** Compute the interaction graph on the fly inside A-2 by walking the AST + DG; do not pre-materialize as DG edges. Pro: smaller DG; con: A-2 carries the projection logic.
- **Option β — DG extension.** Add a new edge kind (e.g., `event-handler` or `attaches-to`) to the DG in a pre-A-2 sub-phase. Pro: A-2 consumes DG only; con: DG grows; A-1's clean closure is extended.

**Recommendation:** Option α — A-2 computes the projection internally. The interaction-graph projection is an A-2 implementation detail; baking it into the DG would couple A-2's analysis surface into Stage 7's substrate. Option β can be revisited in v0.4 if a second consumer materializes. → OQ-A2-H.

### 3.3 New compiler-internal structures

**New files:**
- `compiler/src/types/reachability.ts` — public types: `ReachabilityRecord`, `RolePlayableSurface`, `ChunkPlan`, `ChunkContents`, `EntryPointId`, `RoleVariant`, `ReachabilityDiagnostic`. Matches PIPELINE Stage 7.6 output contract verbatim.
- `compiler/src/reachability-solver.ts` — the solver entry point: `runReachabilitySolver(input: RSInput): { record: ReachabilityRecord; errors: RSError[] }`.

**Internal-only structures (inside `reachability-solver.ts`):**
- `ReachabilitySet<T> = Set<NodeId>` — typed alias for sets of NodeIds.
- `ComponentClosureBuilder` — per-component-operator interface with `extend(currentSet: ReachabilityMap): ReachabilityMap` semantics for the outer-fixed-point loop.
- `InteractionGraph` — projection over DG + AST for Component 3; `from: ComponentNodeId, to: ServerFnNodeId, depth: number` triples.
- `FixedPointDriver` — bounded-iteration driver: applies the five component operators in order; tracks "set changed this round" sentinel; terminates on quiescence or iteration cap. Cap fires `E-CLOSURE-001`.
- `ReachabilityCache` — per-(entry-point, role) memoization across the outer fixpoint (avoid re-walking Component 2 closure from scratch each iteration).

### 3.4 Memory + time complexity

**A-1.7 ceiling re-measurement (S89):** 523 markup-read nodes + 523 reads edges across the 61-file corpus. Cumulative DG size (post-A-1) is in the low thousands of nodes / edges for the full corpus.

**A-2 memory:**
- Per-entry-point per-role `ChunkPlan` is `O(reachable_nodes_for_(E,R))`. Worst-case = the full DG; typically a small fraction.
- Number of `(E, R)` pairs = `|entry_points| × |role_enum_variants|`. SPEC §40.9.9 example: 4 role variants × 1-N entry points per app. Realistic ceiling for an app like trucking-dispatch: ~50 entry points × ~4 role variants = ~200 `ChunkPlan`s.
- Per ChunkPlan: 3-5 named tiers × `O(reachable_nodes)` for `ChunkContents`.

**Estimated peak A-2 memory ceiling:** ~200 ChunkPlans × ~5 tiers × ~500 NodeIds per tier = ~500K Set entries. Comfortably under 50MB for a realistic Node/Bun heap.

**A-2 time complexity:** Per the PIPELINE Stage 7.6 line 2398 architect estimate, RS is whole-program at 1.5-3× SYM's total cost. SYM's measured budget is ~bounded-large; the corpus-wide measurement target post-A-2 is in the low-100s of ms (no current measurement; A-2.5 establishes baseline).

**Memory concerns:** None foreseen on 61-file corpus. Surface to OQ for larger corpora if/when adopters report friction.

---

## §4 Compiler Touchpoints

### 4.1 Per-stage impact

| Stage | A-2 impact |
|---|---|
| **BS** (block-splitter) | None — A-2 is post-typer. |
| **TAB** (typed AST builder) | None. |
| **NR** (name resolver) | None — A-2 consumes resolvedKind from NR but does not extend it. |
| **MOD** (module resolver) | Indirect — A-2 consumes `VendorUnitDeclarations` per §41 (input from MOD). MOD output schema is stable; no extension needed for A-2. |
| **CE** (component expander) | Indirect — A-2 consumes resolved component graph (CE output) for Component 1 entry-point enumeration. No extension needed. |
| **UVB** (unified validation block) | Possible — `W-AUTH-RUNTIME-FALLBACK` MAY fire from a Stage 3.3 UVB sub-pass per SPEC §40.9.11 footer "the firing-stage choice is a compiler-implementation concern." A-2 disposition: fire from RS (single fire-site, deterministic emission); leave UVB unchanged. → OQ-A2-I. |
| **PA** (protect analyzer) | None. |
| **RI** (route inference) | Indirect — A-2 consumes `RouteMap` + `ServerFnBoundary` from RI. **A-3 extends RI's authMiddleware to derive AuthGraph;** this is A-3's surface, not A-2's. A-2 consumes the A-3-derived AuthGraph. |
| **TS** (type system) | None. |
| **META** (meta checker + eval) | A-2 consumes META's constant-folding output for Component 1's static gate evaluation. § OQ-A2-D below — META today does not expose constant-folding as a separable analysis primitive. A-2 either reuses META's pass internally or authors a thin wrapper. |
| **DG** (dependency graph) | A-2's **primary substrate.** A-1 closed the markup-context lift. A-2 reads `depGraph.nodes` + `depGraph.edges` — does not mutate. |
| **BP** (batch planner, Stage 7.5) | Informational only per PIPELINE Stage 7.6 line 2378. A-2 MAY consume BP's batched-server-fn decisions for Component 3 `N=0` pre-resolution. A-2.5 disposition: skip BP consumption in v0.3.0; revisit in v0.4. |
| **RS** (Stage 7.6 — NEW) | **A-2 IS this stage.** New file `compiler/src/reachability-solver.ts`. Pipeline wiring in `compiler/src/index.ts` (or wherever Stage orchestration lives — confirmed below). |
| **CG** (codegen, Stage 8) | A-2 produces `ReachabilityRecord` for A-4 to consume. A-2 does NOT modify CG; A-4 wires the consumer. |
| **Runtime** | **None.** A-2 is compile-time only. |

### 4.2 Specific files

**NEW files (A-2):**
- `compiler/src/reachability-solver.ts` — the solver implementation.
- `compiler/src/types/reachability.ts` — public output types.

**EXTENDED files (A-2):**
- `compiler/src/api.js` (or `compiler/src/index.ts` depending on orchestration location) — wire Stage 7.6 between Stage 7.5 (BP) and Stage 8 (CG). Existing pipeline: BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → CG. Post-A-2: BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → **RS** → CG.
- `compiler/src/cli.js` — `--emit-reachability` CLI flag (per PIPELINE Stage 7.6 line 2396).
- `compiler/src/codegen/context.ts` — extend `CompileContext` with `reachabilityRecord: ReachabilityRecord | null` (consumed by A-4's `codegen/index.ts`; A-2 only writes — A-4 reads).

**Test files (NEW):**
- `compiler/tests/unit/reachability-solver-component-1.test.ts` — `initially_rendered_components`.
- `compiler/tests/unit/reachability-solver-component-2.test.ts` — `reactive_dep_closure`.
- `compiler/tests/unit/reachability-solver-component-3.test.ts` — `server_fn_reachable_within`.
- `compiler/tests/unit/reachability-solver-component-4.test.ts` — `auth_gated_boundaries_visible_to`.
- `compiler/tests/unit/reachability-solver-component-5.test.ts` — `vendor_units_used_by`.
- `compiler/tests/unit/reachability-solver-fixed-point.test.ts` — outer fixed-point + termination + monotonicity.
- `compiler/tests/unit/reachability-solver-diagnostics.test.ts` — `E-CLOSURE-001` defensive fire + `W-AUTH-RUNTIME-FALLBACK` emission.
- `compiler/tests/integration/closure-analysis/worked-example.test.ts` — SPEC §40.9.9 fixture replay.
- `compiler/tests/integration/closure-analysis/determinism.test.ts` — same source → same `ReachabilityRecord`.
- `compiler/tests/integration/closure-analysis/incremental-empty-corpus.test.ts` — anonymous-only / no-role-enum app.

**FIXTURES (NEW):**
- `compiler/tests/fixtures/closure-analysis/spec-40.9.9-dispatch.scrml` — SPEC §40.9.9 verbatim.
- `compiler/tests/fixtures/closure-analysis/multi-role-cross-product.scrml` — synthetic test for `|role_enum| × |entry_points|` cross product.
- `compiler/tests/fixtures/closure-analysis/runtime-fallback-auth.scrml` — async-check auth gate fixture for `W-AUTH-RUNTIME-FALLBACK`.
- `compiler/tests/fixtures/closure-analysis/runtime-only-branch.scrml` — `<details>` / non-closed-form `if=` fixture for worst-case-union admission.

---

## §5 Sub-Phase Decomposition

A-2 decomposes into 9 sub-phases. Sequencing per dependency below; estimated hours per sub-phase. Cumulative estimate at end (§9).

### A-2.1 — Type-surface + module scaffold (5-10h)

**Scope:** Author `compiler/src/types/reachability.ts` matching PIPELINE Stage 7.6 output contract verbatim. Author empty `compiler/src/reachability-solver.ts` with `runReachabilitySolver` signature + RSInput / RSOutput / RSError shapes. Wire into pipeline via `api.js` as no-op (returns empty `ReachabilityRecord`). Add CLI `--emit-reachability` flag (no-op behavior: emits empty JSON). Add `reachabilityRecord` to `CompileContext`.

**Files:** `compiler/src/types/reachability.ts` (NEW), `compiler/src/reachability-solver.ts` (NEW), `compiler/src/api.js` (extend), `compiler/src/cli.js` (extend), `compiler/src/codegen/context.ts` (extend).

**Tests gating:** Pipeline still passes — 11,153+ tests green. No new test files yet (scaffolding doesn't need tests). Smoke test: `bun run scrml compile examples/02-counter.scrml --emit-reachability` produces an (empty) JSON file.

**Dispatch readiness:** Yes — design-decision OQs A-J resolvable mid-flight without blocking A-2.1 scaffolding.

**Order:** First. A-2.1 establishes the pipeline slot; subsequent components plug in.

### A-2.2 — Component 1: `initially_rendered_components(E)` + entry-point enumeration (8-14h)

**Scope:** Enumerate entry points per v0.3 program shape (§40.8): one per `<page>` decl + the entry-file `<program>` body for SPAs. For each entry point, compute the initial-render set by walking the markup tree, classifying each child block as IN / OUT / WORST-CASE-UNION based on its `if=` / `<match>` / `<details>` gate using a §22-style constant-folding pass.

**Sub-tasks:**
- A-2.2.a — Entry-point enumerator (uses RouteMap + §40.8 shape detection).
- A-2.2.b — Constant-folding analysis primitive (resolves OQ-A2-D — either reuse META's existing folder or extract).
- A-2.2.c — Per-gate classifier (`if=` closed-form / `<match>` static-cell / `<details>` runtime-only-by-default / `<auth>` per-role-classification — delegates to Component 4).
- A-2.2.d — Worst-case-union admission for runtime-gated branches.

**Files:** `compiler/src/reachability-solver.ts` (component-1 implementation), possibly `compiler/src/meta-eval.ts` (extract constant-folding primitive per OQ-A2-D resolution).

**Tests gating:** `reachability-solver-component-1.test.ts` (~10 tests covering: SPA + multi-page entry-point enumeration; closed-form `if=` (in/out); runtime `if=` (worst-case-union); `<details>` admission; `<match>` static-cell evaluation; nested gates).

**Dependencies:** A-2.1 closed.

### A-2.3 — Component 2: `reactive_dep_closure(C)` (6-10h)

**Scope:** Forward closure over DG `reads` edges starting from the component set produced by Component 1. Walk recursively; admit each reached `ReactiveDGNode` to the closure. Compose with `validator-reads` + `engine-derived-reads` edge kinds per SPEC §31 DG edge taxonomy (resolves OQ-A2-J).

**Sub-tasks:**
- A-2.3.a — Forward-DFS walker over `kind === "reads"` edges.
- A-2.3.b — markup-read edge handling: when a markup-read node is reached via a `reads` edge from a component, the edge's `to` (a ReactiveDGNode) is the admission target — markup-read intermediary is not in the chunk.
- A-2.3.c — `validator-reads` + `engine-derived-reads` edge handling per OQ-A2-J disposition.
- A-2.3.d — Dynamic-key recovery semantics (§40.9.3 — admit entire receiver on `@obj[runtimeKey]`).

**Files:** `compiler/src/reachability-solver.ts` (component-2 impl).

**Tests gating:** `reachability-solver-component-2.test.ts` (~12 tests covering: simple reactive read; chained reads (A reads B reads C); validator-reads chain; engine-derived-reads chain; dynamic-key admission; markup-read intermediary not in output; cycle handling).

**Dependencies:** A-2.2 closed.

### A-2.4 — Component 3: `server_fn_reachable_within(N, C_set)` + interaction-graph projection (10-18h)

**Scope:** Build the interaction-graph projection per SPEC §40.9.4: edges from event-handler-attached components to server functions those handlers invoke. Projection sources: DG `calls` + `awaits` edges + event-handler-attachment AST shape (`onclick=`, `onsubmit=`, `bind:value=` write paths, `<onTimeout to=>` firing paths per §51.0.M, `<onIdle>` firing paths per §51.0.R, channel `onserver:message=` per §38). Bounded BFS at depths N=0, N=1, N=2 (N≥3 on-demand per OQ-A2-B).

**Sub-tasks:**
- A-2.4.a — Interaction-graph projection builder (uses DG + AST event-handler traversal).
- A-2.4.b — Bounded BFS at N=0 / N=1 / N=2.
- A-2.4.c — `<onTimeout>` / `<onIdle>` / channel `onserver:message=` firing-path inclusion.
- A-2.4.d — Worst-case-union for generic-typed server-fn (per §40.9.4 normative).
- A-2.4.e — Cascade reachability (N=2 components newly instantiated by N=1 reach further server-fns).

**Files:** `compiler/src/reachability-solver.ts` (component-3 impl). Uses route-inference.ts walkMarkupContext shape catalog as AST-shape precedent.

**Tests gating:** `reachability-solver-component-3.test.ts` (~15 tests covering: N=0 initial-render server-fn invocation; N=1 onclick → server-fn; N=2 onclick → render new component → its initial render calls server-fn; `<onTimeout>` firing-path; `<onIdle>` firing-path; channel onserver:message=; worst-case-union generic-typed server-fn; cascade at N=2).

**Dependencies:** A-2.3 closed. **NOT BLOCKED on A-2.5 / A-2.6** — Components 3 / 4 / 5 are parallelizable across separate dispatches per PIPELINE Stage 7.6 line 2400.

### A-2.5 — Component 4: `auth_gated_boundaries_visible_to(role)` + AuthGraph consumption (10-16h)

**Scope:** Consume the §40.1.1 role enum + the A-3-derived `AuthGraph`. Compute per-role visibility classification per SPEC §40.9.5. Fire `W-AUTH-RUNTIME-FALLBACK` for non-closed-form auth gates.

**Sub-tasks:**
- A-2.5.a — Role enum resolution from `<program>` body or app-scope import.
- A-2.5.b — AuthGraph traversal — for each auth gate, classify per role variant: IN / OUT / RUNTIME-FALLBACK.
- A-2.5.c — `W-AUTH-RUNTIME-FALLBACK` emission (resolves OQ-A2-I — fire from RS).
- A-2.5.d — Empty-role / no-role-enum handling (resolves OQ-A2-F).

**Files:** `compiler/src/reachability-solver.ts` (component-4 impl). **HARD-DEPENDS on A-3's AuthGraph schema.**

**Tests gating:** `reachability-solver-component-4.test.ts` (~10 tests covering: closed-form role predicate (in/out per variant); async-check gate → W-AUTH-RUNTIME-FALLBACK fire; nested auth gates; channel auth predicates; no-role-enum + no-auth-gates app; no-role-enum + auth-gates app error).

**Dependencies:** A-2.4 closed + **A-3 AuthGraph contract ratified.** Can be dispatched in parallel with A-2.4 once A-3.1+A-3.2 (auth-site enumeration + role enum resolution) ship; A-2.5.b consumption is the integration point.

### A-2.6 — Component 5: `vendor_units_used_by(C_set)` (4-7h)

**Scope:** Consume §41 vendor-unit declarations (MOD output). For each component in the current closure, traverse the declared vendor units. Apply opacity rule (§40.9.6 — vendor unit's internal graph is NOT subdivided).

**Sub-tasks:**
- A-2.6.a — VendorUnitDeclarations consumption.
- A-2.6.b — Per-component vendor-unit lookup.
- A-2.6.c — Tree-shake of unreferenced units (§40.9.6 — compiler-side optimization, optional in v0.3.0).

**Files:** `compiler/src/reachability-solver.ts` (component-5 impl).

**Tests gating:** `reachability-solver-component-5.test.ts` (~6 tests covering: `use vendor:X` referenced by initial-render component; `use vendor:X` referenced only at N≥2; unreferenced vendor unit; multiple components share a vendor unit).

**Dependencies:** A-2.3 closed (parallelizable with A-2.4 / A-2.5).

### A-2.7 — Outer fixed-point operator + `E-CLOSURE-001` (8-14h)

**Scope:** Wire the five component operators (A-2.2 through A-2.6) under the outer closure fixpoint per SPEC §40.9.1. Iteration cap with `E-CLOSURE-001` defensive fire. Termination proof rests on finite underlying graphs.

**Sub-tasks:**
- A-2.7.a — `FixedPointDriver` implementation: iteration loop with "set changed" sentinel.
- A-2.7.b — Memoization across iterations (avoid re-running Component 2 closure from scratch).
- A-2.7.c — Iteration cap + `E-CLOSURE-001` emission (resolves OQ-A2-G — cap is `2 × |DG_nodes|` or similar finite bound).
- A-2.7.d — Monotonicity-in-N verification: `playable_surface(E, N) ⊆ playable_surface(E, N+1)`.
- A-2.7.e — ChunkPlan construction per §40.9.7 tier definitions.

**Files:** `compiler/src/reachability-solver.ts` (fixed-point driver + ChunkPlan construction).

**Tests gating:** `reachability-solver-fixed-point.test.ts` (~10 tests covering: termination on small example; monotonicity-in-N; ChunkPlan tier math; component-1 → component-2 → component-3 chain admission; `E-CLOSURE-001` synthetic-cycle fire).

**Dependencies:** A-2.2 through A-2.6 all closed.

### A-2.8 — `--emit-reachability` CLI flag wiring + JSON serialization (3-5h)

**Scope:** Wire the `--emit-reachability` CLI flag (per PIPELINE Stage 7.6 line 2396) to emit `ReachabilityRecord` as JSON. Format analogous to `--emit-batch-plan`. Stable JSON output for determinism per OQ-A2-A (key ordering must be canonical).

**Sub-tasks:**
- A-2.8.a — JSON serializer for `ReachabilityRecord` (Set→Array conversion, NodeId stringification, sorted keys for determinism).
- A-2.8.b — CLI flag plumbing.
- A-2.8.c — Output path conventions.

**Files:** `compiler/src/reachability-solver.ts` (serializer), `compiler/src/cli.js` (flag).

**Tests gating:** `reachability-solver-diagnostics.test.ts` (subset — JSON-shape stability) (~5 tests).

**Dependencies:** A-2.7 closed.

### A-2.9 — Performance + memory characterization + ceiling-baseline (4-7h)

**Scope:** Measure A-2 walltime + memory on the 61-file corpus. Establish baseline ceiling; flag if >50ms walltime or >100MB memory (TBD thresholds per A-2.5 disposition). Compare to PIPELINE Stage 7.6 line 2398 architect estimate (1.5-3× SYM cost).

**Sub-tasks:**
- A-2.9.a — `scripts/measure-reachability-solver.ts` instrumentation script.
- A-2.9.b — Corpus walltime baseline.
- A-2.9.c — Per-component time budget breakdown.

**Files:** `scripts/measure-reachability-solver.ts` (NEW).

**Tests gating:** None (perf measurement, not regression test).

**Dependencies:** A-2.7 + A-2.8 closed.

### Sub-phase totals (summary table — full table in §9)

| Sub-phase | Estimate (h) | Depends on | Parallelizable |
|---|---:|---|---|
| A-2.1 scaffold | 5-10 | — | — |
| A-2.2 component 1 | 8-14 | A-2.1 | — |
| A-2.3 component 2 | 6-10 | A-2.2 | — |
| A-2.4 component 3 | 10-18 | A-2.3 | A-2.5, A-2.6 |
| A-2.5 component 4 | 10-16 | A-2.3 + A-3 AuthGraph contract | A-2.4, A-2.6 |
| A-2.6 component 5 | 4-7 | A-2.3 | A-2.4, A-2.5 |
| A-2.7 outer fixpoint | 8-14 | A-2.2..A-2.6 | — |
| A-2.8 CLI + JSON | 3-5 | A-2.7 | — |
| A-2.9 perf | 4-7 | A-2.7 + A-2.8 | — |
| **Total** | **58-101** | | |

Within hand-off-88's ~80-160h band; lower because the substrate (A-1, RI, MOD, META) is mature and the SPEC anchor is fully landed.

---

## §6 Algorithmic Open Questions

(Re-numbered as OQ-A2-A through OQ-A2-J for cross-reference within this scope.)

### OQ-A2-A — Inner fixed-point ordering of the five component operators

**Question:** SPEC §40.9.1 fixes the OUTER closure as fixpoint. Inside each fixpoint iteration, the five component operators may be applied in any order (or interleaved). Determinism §40.9.8 requires same output for same input, so the implementation MUST commit to a fixed order, but SPEC doesn't bind one.

**Options:**
- (a) **Strict 1→2→3→4→5 order.** Component-numbered order matches SPEC numbering; predictable.
- (b) **Topological — component 1 first (entry points), then 4 (auth — narrows by role), then 2/3/5 (closures over the narrowed set).** Operationally faster — auth-narrowing prunes the closure surface upfront.
- (c) **All-five-in-parallel per iteration, union at end.** Simplest; doesn't exploit narrowing.

**Recommendation:** (b) — topological narrowing. Auth-by-role is a coarse pre-filter; closure operations dominate cost; narrowing first reduces work.

**Surface for user disposition:** Disposition needed before A-2.7.

### OQ-A2-B — N=1 / N=2 hard cap + N≥3 on-demand surface

**Question:** §40.9.4 names N=0, N=1, N=2 tiers and says "N≥3 on-demand by default. The compiler MAY surface a per-app override knob in future v0.3.x revisions; v0.3.0 does NOT specify one."

**Options:**
- (a) **Hard cap at N=2; N≥3 on-demand only.** Matches §40.9.4 "default" — no v0.3.0 override.
- (b) **Hard cap at N=3; N=3 idle-prefetched.** More aggressive; risks blowing perf budget.
- (c) **No hard cap; iterate to fixpoint.** Risks `E-CLOSURE-001` more often; matches general closure semantics.

**Recommendation:** (a) — matches SPEC §40.9.4 v0.3.0 default. A-2 produces `prefetchTierN` array of length 2 (Tier 1 + Tier 2); on-demand N≥3 lookup is in the runtime, not the chunk plan.

**Surface for user disposition:** Disposition needed before A-2.4.

### OQ-A2-C — Reactive-write → server-fn reachability inclusion

**Question:** §40.9.4 specifies forward-from-rendered-component. Does `playable_surface(E, N)` include server-fns reachable BY THE WRITER side of a reactive write that crosses the server boundary (e.g., `@cell` written by client triggers reactive chain via `@cell.derive` that calls server-fn)?

**Options:**
- (a) **Include — reactive chains crossing server boundary at N=0 count as N=0 server-fns.** Matches the §40.9.9 worked example reading (`<state user> = ^server fetchUser()` is N=0 by initial render).
- (b) **Exclude — only event-handler-initiated server-fn calls count.** Tighter; risks under-shipping `N=0` initially-needed server-fn stubs.

**Recommendation:** (a) — include. The worked example §40.9.9 demonstrates the inclusion pattern with `fetchUser()`. A reactive chain crossing the boundary at initial render IS a `N=0` invocation.

**Surface for user disposition:** Confirmation needed before A-2.4.

### OQ-A2-D — Component 1 constant-folding analysis primitive

**Question:** §40.9.2 references "the §22 constant-folding pass" but META's `^{}` evaluator today is coupled to META-block execution, not a separable analysis primitive. A-2 needs to evaluate `if=` / `<match>` / `<details>` gates at compile time.

**Options:**
- (a) **Extract a `partiallyEvaluateExpr(ast, env): ConstResult` primitive from META** — A-2.2.b authors this; META switches to consume it; UVB and other passes may share it later.
- (b) **A-2.2.b internally implements a minimal constant-folder** — duplicate code with META; smaller initial surface.
- (c) **Defer Component 1 closed-form classification to v0.4** — A-2 admits ALL runtime-gated branches as worst-case-union; over-ships but ships fast.

**Recommendation:** (a) — extract from META. Sets up future passes (validator-arg evaluation, lift constant-folding) for reuse. ~3h delta over (b).

**Surface for user disposition:** Disposition needed before A-2.2.

### OQ-A2-E — Entry-point enumeration on auth-redirect

**Question:** §40.9.1 says SPAs contribute one entry point; multi-page apps contribute one per `<page>`. Does an `<auth>` block whose else-branch redirects to a different route create a NEW entry point for the redirect target?

**Implicit answer:** §40.9.9 worked example: "For viewer Anonymous, the `<page auth="required">` gate fails — the playable surface for `/` is empty (the auth redirect to a login route is the analysis's output for that viewer). The login route is a separate entry point with its own playable surface." → The redirect target IS its own entry point per page-enumeration; A-2 does not synthesize a new entry point from the redirect — it relies on the existing entry-point list.

**Recommendation:** Confirm — no entry-point synthesis on auth-redirect. Document explicitly in A-2.2.

**Surface for user disposition:** Confirmation; non-blocking.

### OQ-A2-F — Empty-role + auth-gates application — error code missing

**Question:** PIPELINE Stage 7.6 line 2380: "if the application uses auth gates without declaring a role enum, RS aborts with a compiler error (subsequent wave; not v0.3.0 normative)." No error code is cataloged for this.

**Options:**
- (a) **Author new error code `E-CLOSURE-002` (or similar) in §34 + §40.9.11** — A-2.5.d emits it.
- (b) **Reuse `E-CLOSURE-001`** with a discriminator parameter — semantically wrong (E-CLOSURE-001 is termination-failure, not configuration-error).
- (c) **Defer error code to v0.4** — A-2.5.d silently treats this as "single anonymous viewer role" + emits info-level diagnostic.

**Recommendation:** (a) — author `E-CLOSURE-002` in v0.3.0 spec amendment. Cost: small SPEC §34 + §40.9.11 edit; clean separation from termination error.

**Surface for user disposition:** Disposition needed before A-2.5.

### OQ-A2-G — `E-CLOSURE-001` iteration-cap bound

**Question:** §40.9.1: "defensive — SHOULD NOT fire on valid source." What bound does the iteration counter use?

**Options:**
- (a) **`2 × |DG_nodes|`** — generous; each node could be admitted at most twice per fixpoint iteration; cap is double for safety.
- (b) **`|DG_nodes| + |edges|`** — sum of substrate size; defensive.
- (c) **Fixed magic number (e.g., 1000)** — simplest; risk on huge corpora.

**Recommendation:** (a). Theoretical max iterations for a monotone fixpoint over a finite lattice = `|max_set|`; doubling buffers against compiler-internal-invariant bugs in the component operators.

**Surface for user disposition:** Disposition needed before A-2.7; non-load-bearing if termination proven.

### OQ-A2-H — DG extension for event-handler-attachment edges

**Question:** SPEC §40.9.4 references "event-handler-attachment AST edges" for Component 3. These are not in DG today.

**Options:**
- (a) **Option α — pure AST projection** (A-2 internal). RECOMMENDED.
- (b) **Option β — DG extension** with new edge kind (e.g., `event-handler`).

**Recommendation:** (a). A-2 carries the projection. DG remains A-1-clean.

**Surface for user disposition:** Disposition needed before A-2.4.

### OQ-A2-I — `W-AUTH-RUNTIME-FALLBACK` fire-site

**Question:** SPEC §40.9.11 footer: "the firing-stage choice is a compiler-implementation concern not normative spec text." A-2 can fire from RS (Stage 7.6) or delegate to a Stage 3.3 UVB sub-pass.

**Options:**
- (a) **RS fires** — single fire-site, deterministic emission, no UVB coupling.
- (b) **UVB fires** — closer to source; user sees lint earlier in the pipeline.
- (c) **Both** — risk double-emission.

**Recommendation:** (a). RS has the AuthGraph + role enum; UVB does not (UVB is pre-RI). Closed-form classification requires RI/AuthGraph context.

**Surface for user disposition:** Disposition needed before A-2.5.

### OQ-A2-J — `validator-reads` + `engine-derived-reads` edge inclusion in Component 2

**Question:** SPEC §40.9.3 says "all reactive cells `R` such that there exists a chain of reactive reads / writes / derivations / engine-derived-reads / validator-arg edges" — explicitly names the four edge kinds.

**Disposition:** Include all four — `reads`, `writes` (for reverse reachability? — see OQ-A2-C disposition), `validator-reads`, `engine-derived-reads`. Forward closure over each.

**Sub-question:** Does `writes` count as a reachability edge for Component 2? Per §40.9.3 "reactive reads / writes / derivations / engine-derived-reads / validator-arg edges" the spec NAMES writes. But: a component that *writes* `@x` does not necessarily *read* it; the reactivity dependency runs from reader to writer, not the other way. A-2 interpretation: include writes in the reachability graph but DIRECT the edge such that a writer of `@x` is admitted to the closure when `@x` is in the closure (e.g., if a component reads `@x`, the components that write `@x` are also rendered — to keep the writer wired).

**Recommendation:** Include writes per §40.9.3 literal text; direct edges as outlined above. Validate against §40.9.9 worked example (the button-handler writes `@count`, and `@count` is in the closure for Dashboard which reads `${@count}` — handler IS admitted per the literal spec text).

**Surface for user disposition:** Confirmation; non-blocking for A-2.3 dispatch.

---

## §7 Downstream Consumer Specifications

### 7.1 A-3 contract (input to A-2)

**A-3 provides:**
- `AuthGraph` — schema TBD by A-3 scoping; expected shape: `Map<MarkupNodeId, RoleClassification>` where `RoleClassification` is `{ closed_form: true; gated_for_role: Set<RoleVariant> } | { closed_form: false; gate_expr: ExprNode }`.
- `RoleEnum` — `{ name: string; variants: RoleVariant[] }` from §40.1.1 app-scope declaration.

**A-2 consumes:**
- For each entry point and role, Component 4 walks the AuthGraph and classifies per role: IN / OUT / RUNTIME-FALLBACK.
- For each `RoleClassification.closed_form === false` site, A-2 emits `W-AUTH-RUNTIME-FALLBACK` and admits the gated component to the closure as worst-case (visible to all roles, runtime-checked at render).

**Sequencing constraint:** A-2.5 (Component 4) is the only A-2 sub-phase blocked on A-3 output. A-2.1 through A-2.4 + A-2.6 can dispatch without A-3 if Component 4 is stubbed (returns "all in" for all roles).

### 7.2 A-4 contract (output from A-2)

**A-2 produces:** `ReachabilityRecord` per PIPELINE Stage 7.6 line 2351-2365 (verbatim contract).

**A-4 consumes:**
- For each `EntryPointId` in `closures.keys()`:
  - For each `RoleVariant` in the corresponding `RolePlayableSurface.byRole.keys()`:
    - Read `ChunkPlan.initialChunk` (ChunkContents — components / reactive cells / server-fn stubs / vendor units for tier 0).
    - Read `ChunkPlan.prefetchTier1`, `prefetchTier2`, `prefetchTierN[]`.
- Emit per-tier chunks per §40.9.7.
- Emit `W-AUTH-RUNTIME-FALLBACK` diagnostics (A-4 is fire-site only if OQ-A2-I selects UVB; otherwise A-2 fires).

**Contract stability:** PIPELINE Stage 7.6 line 2351-2365 is the normative output shape. A-2 implements it verbatim — no schema drift.

**No mutation:** A-4 does NOT mutate the `ReachabilityRecord`. Per PIPELINE Stage 7.6 line 2393 "RS produces a fresh ReachabilityRecord and does NOT mutate DG, BatchPlan, RouteMap, AuthGraph, ServerFnBoundary, or VendorUnitDeclarations" — and by symmetry, downstream consumers do not mutate the RS output.

### 7.3 A-5 contract (E2E test consumption)

**A-5 consumes:** the full `ReachabilityRecord` shape + `ChunkPlan` per-tier chunks per role per entry point. A-5 validates:
- **Determinism (§40.9.8):** two builds of the same source produce identical `ReachabilityRecord`. JSON serialization (A-2.8) is the canonical comparison surface.
- **Monotonicity-in-N (§40.9.1):** `initialChunk ⊆ initialChunk ∪ prefetchTier1 ⊆ ...` for every (E, R).
- **§40.9.9 worked example replay:** the Dispatch / Header / Dashboard / ProfileWidget fixture produces the documented chunk-plan output.
- **`E-CLOSURE-001` defensive fire:** synthetic adversarial fixture with cycle.
- **`W-AUTH-RUNTIME-FALLBACK` fire-site:** async-check auth-gate fixture.

**Coverage expectation:** A-5 includes the §40.9.9 worked example as a unit test, the trucking-dispatch corpus + TodoMVC + kanban as integration tests, and a determinism cross-check across two CI builds.

### 7.4 CLI flag contract (`--emit-reachability`)

PIPELINE Stage 7.6 line 2396: "`scrml compile --emit-reachability` SHOULD emit the `ReachabilityRecord` as JSON for debugging and test visibility (analogous to `--emit-batch-plan` at §Stage 7.5)."

**Output path convention:** Analogous to `--emit-batch-plan`. Existing convention TBD by A-2.8 (consult batch-plan output for symmetry).

**Format:** JSON; canonical key ordering; Set→Array conversion; NodeId stringification preserved.

---

## §8 Open Questions for PA / User Disposition

### 8.1 BLOCKING — must resolve before A-2.1 dispatch

- **OQ-A2-D** (constant-folding primitive: extract from META vs duplicate vs defer).

### 8.2 BLOCKING — must resolve before specific sub-phase dispatch

- **OQ-A2-A** (inner ordering of component operators) → before A-2.7.
- **OQ-A2-B** (N hard cap; recommend N=2) → before A-2.4.
- **OQ-A2-C** (reactive-write → server-fn inclusion; recommend include) → before A-2.4.
- **OQ-A2-F** (`E-CLOSURE-002` for no-role-enum-with-auth-gates; recommend author) → before A-2.5.
- **OQ-A2-G** (`E-CLOSURE-001` iteration-cap bound; recommend `2 × |DG_nodes|`) → before A-2.7.
- **OQ-A2-H** (event-handler edges in DG vs A-2 projection; recommend projection) → before A-2.4.
- **OQ-A2-I** (`W-AUTH-RUNTIME-FALLBACK` fire-site; recommend RS) → before A-2.5.

### 8.3 NON-BLOCKING — confirmation/disposition can happen mid-flight

- **OQ-A2-E** (auth-redirect → no entry-point synthesis; confirmation).
- **OQ-A2-J** (validator-reads + engine-derived-reads + writes inclusion; confirmation).

### 8.4 Algorithm-choice surface — ONE OPTION or MULTIPLE VIABLE?

**Verdict: ONE option for the high-level algorithm shape; MULTIPLE viable options for sub-implementation details.**

The high-level shape — **two-layer fixed-point (5 component operators inside an outer closure)** — is normatively pinned by SPEC §40.9.1. There is no other viable algorithm shape that satisfies the SPEC contract.

Sub-implementation alternatives (multiple viable):
- Inner ordering — OQ-A2-A.
- Event-handler edges in DG or projection — OQ-A2-H.
- Constant-folding primitive extraction or duplicate — OQ-A2-D.
- These do not change correctness — only performance, code structure, and refactor reuse for downstream passes.

**Recommendation:** Per pa.md Rule 3 ("the right answer beats the easy answer"), surface all three options for OQ-A2-D + the topological narrowing direction for OQ-A2-A. Sub-implementation choice does not pre-pick the easy path.

### 8.5 SPEC-silent areas list (summary)

(Cross-references to §2.3 silences for traceability.)

1. Inner fixed-point ordering (OQ-A2-A).
2. N hard cap (OQ-A2-B).
3. Reactive-write → server-fn reachability inclusion (OQ-A2-C).
4. Constant-folding primitive surface (OQ-A2-D).
5. Auth-redirect → entry-point synthesis (OQ-A2-E).
6. Empty-role + auth-gates error code (OQ-A2-F).
7. `E-CLOSURE-001` iteration-cap bound (OQ-A2-G).
8. Event-handler edges in DG (OQ-A2-H).
9. `W-AUTH-RUNTIME-FALLBACK` fire-site (OQ-A2-I).

### 8.6 Performance budget

PIPELINE Stage 7.6 line 2398 architect estimate: 1.5-3× SYM cost. SYM's measured budget is not pinned in this scope. A-2.5 establishes baseline.

**Tolerance for v0.3.0:** PA disposition needed — does PA accept up to (say) 100ms walltime increment in `bun run pretest` on 61-file corpus? Surface in OQ-A2-K (added now):
- **OQ-A2-K** — performance budget tolerance: ≤30ms / ≤100ms / no-cap. Recommend ≤100ms for v0.3.0, tighten in v0.4 if needed.

### 8.7 Sequencing — parallel vs sequential sub-phase dispatch

**Parallel:** A-2.4, A-2.5, A-2.6 can dispatch in parallel after A-2.3 closes. A-2.5 additionally depends on A-3.1+A-3.2 (AuthGraph schema).

**Sequential:** A-2.1 → A-2.2 → A-2.3 → {A-2.4 ∥ A-2.5 ∥ A-2.6} → A-2.7 → A-2.8 → A-2.9.

**Critical path:** A-2.1 (5-10h) + A-2.2 (8-14h) + A-2.3 (6-10h) + max(A-2.4, A-2.5, A-2.6) (10-18h) + A-2.7 (8-14h) + A-2.8 (3-5h) + A-2.9 (4-7h) = **44-78h critical path** at parallel cadence.

---

## §9 Estimated Total

### 9.1 Per-sub-phase hour estimates (sequential)

| Sub-phase | Estimate (h) | Cumulative low (h) | Cumulative high (h) |
|---|---:|---:|---:|
| A-2.1 scaffold | 5-10 | 5 | 10 |
| A-2.2 component 1 | 8-14 | 13 | 24 |
| A-2.3 component 2 | 6-10 | 19 | 34 |
| A-2.4 component 3 | 10-18 | 29 | 52 |
| A-2.5 component 4 | 10-16 | 39 | 68 |
| A-2.6 component 5 | 4-7 | 43 | 75 |
| A-2.7 outer fixpoint | 8-14 | 51 | 89 |
| A-2.8 CLI + JSON | 3-5 | 54 | 94 |
| A-2.9 perf | 4-7 | 58 | 101 |
| **Sequential total** | **58-101 h** | | |

### 9.2 Parallel-cadence critical-path estimate

At parallel cadence (A-2.4 ∥ A-2.5 ∥ A-2.6 = max(10-18, 10-16, 4-7) = 10-18h):
- A-2.1 + A-2.2 + A-2.3 + max(A-2.4, A-2.5, A-2.6) + A-2.7 + A-2.8 + A-2.9 = **44-78 h critical path.**

### 9.3 Comparison to hand-off-88 estimate

Hand-off-88 estimate: ~80-160h.

**This SCOPING refines to 58-101h sequential / 44-78h parallel** — below hand-off-88's lower bound. Refinement drivers:
- A-1's substrate (markup-context `reads` edges, MarkupReadDGNode, 523 measured nodes/edges) is mature and audited (A-1.6 / A-1.7 close).
- SPEC §40.9 anchor is fully landed (no spec drafting in A-2 scope).
- PIPELINE Stage 7.6 contract is verbatim — no schema design freedom (and therefore no design-debate cost).
- Existing reads-adjacency infrastructure (`buildDerivedReadsAdj`, `buildValidatorArgsAdj`, `buildEngineDerivedAdj`) reduces Component 2 implementation cost.
- The constant-folding primitive (OQ-A2-D) is a 3-8h delta; not a major component.

**If user picks hand-off-88's upper band (~160h), the delta absorbs:** retry on OQ-A2-D defer (component-1 worst-case-union-all-runtime-gates fallback), additional performance tuning (A-2.9 expansion), retroactive AuthGraph schema mismatches with A-3, or `E-CLOSURE-001` debug rounds.

### 9.4 Walltime estimate at parallel-dispatch cadence

Per the active S88-S89 cadence (4-6 commits/session, sequential dispatches with parallelizable sub-phases), 58-101h sequential ≈ **2-4 sessions** assuming ~25h/session productive throughput. Parallel cadence (with worktree-isolated sub-dispatches) compresses to **1.5-3 sessions** for the critical path.

Calendar estimate: **3-7 days** at active-dispatch tempo if user authorizes parallel sub-phase dispatches.

---

## §10 Test Strategy

### 10.1 Unit test budget

| Component | Unit test count | File |
|---|---:|---|
| Component 1 | ~10 | reachability-solver-component-1.test.ts |
| Component 2 | ~12 | reachability-solver-component-2.test.ts |
| Component 3 | ~15 | reachability-solver-component-3.test.ts |
| Component 4 | ~10 | reachability-solver-component-4.test.ts |
| Component 5 | ~6 | reachability-solver-component-5.test.ts |
| Outer fixpoint | ~10 | reachability-solver-fixed-point.test.ts |
| Diagnostics | ~8 | reachability-solver-diagnostics.test.ts |
| **Total unit** | **~71** | |

### 10.2 Integration test budget

| Suite | Count | File |
|---|---:|---|
| SPEC §40.9.9 worked-example replay | ~3 | closure-analysis/worked-example.test.ts |
| Determinism (same source → same output) | ~2 | closure-analysis/determinism.test.ts |
| Empty-role / anonymous-redirect | ~2 | closure-analysis/incremental-empty-corpus.test.ts |
| Trucking-dispatch closure | ~3 | closure-analysis/trucking-dispatch.test.ts |
| TodoMVC closure | ~2 | closure-analysis/todomvc.test.ts |
| Multi-role cross product | ~3 | closure-analysis/multi-role.test.ts |
| **Total integration** | **~15** | |

### 10.3 Conformance test budget

| Error code | Count | File |
|---|---:|---|
| `E-CLOSURE-001` defensive fire | ~2 | conformance/e-closure-001.test.ts |
| `E-CLOSURE-002` (if OQ-A2-F (a)) no-role-enum + auth | ~2 | conformance/e-closure-002.test.ts |
| `W-AUTH-RUNTIME-FALLBACK` | ~3 | conformance/w-auth-runtime-fallback.test.ts |
| **Total conformance** | **~7** | |

### 10.4 Performance benchmarks

| Benchmark | Target | File |
|---|---|---|
| Corpus walltime | ≤ 100ms on 61-file corpus | scripts/measure-reachability-solver.ts |
| Per-component breakdown | Component 2 ≤ 30ms | (same script) |
| Memory peak | ≤ 50MB heap delta | (same script) |

### 10.5 Regression suite

A-2 adds to the existing 11,153 / 0 fail baseline. Expected post-A-2 baseline: **~11,240 / 0 fail** (adds ~70 unit + ~15 integration + ~7 conformance = ~92 new tests).

Pre-commit hook gate (per S87 install): every A-2.* commit runs `bun test unit + integration + conformance --bail`. Tests must pass before commit; baseline integrity preserved.

### 10.6 Determinism regression check

Cross-build determinism is the load-bearing invariant (§40.9.8). Test plan: a CI job runs two consecutive full-pipeline builds + diffs the `--emit-reachability` JSON output across builds. Any non-empty diff fails. (CI work itself out of A-2 scope; A-2 ships the JSON-determinism test in unit + integration.)

### 10.7 Test gating per sub-phase

| Sub-phase | Tests that gate it |
|---|---|
| A-2.1 | (no new tests — scaffolding) |
| A-2.2 | reachability-solver-component-1.test.ts |
| A-2.3 | reachability-solver-component-2.test.ts |
| A-2.4 | reachability-solver-component-3.test.ts |
| A-2.5 | reachability-solver-component-4.test.ts |
| A-2.6 | reachability-solver-component-5.test.ts |
| A-2.7 | reachability-solver-fixed-point.test.ts + closure-analysis/worked-example.test.ts |
| A-2.8 | reachability-solver-diagnostics.test.ts (JSON-shape subset) + closure-analysis/determinism.test.ts |
| A-2.9 | (no test gating — perf measurement) |

---

## Critical Files for Implementation

- `compiler/src/dependency-graph.ts` — A-2's primary substrate (post-A-1: lines 100-129 `MarkupReadDGNode` interface, lines 245-310 helpers, line 879 `buildDerivedReadsAdj` precedent for Component 2)
- `compiler/src/route-inference.ts` — RouteMap + ServerFnBoundary + authMiddleware (A-3 extends to AuthGraph)
- `compiler/src/meta-eval.ts` — constant-folding primitive source (OQ-A2-D)
- `compiler/src/codegen/context.ts` — extend with `reachabilityRecord` field
- `compiler/src/api.js` (or `compiler/src/index.ts`) — pipeline wiring (insert RS between BP and CG)
- `compiler/src/cli.js` — `--emit-reachability` flag wiring
- `compiler/SPEC.md` — normative contract — §40.9.1-.11 (lines 17621-17888); §40.1.1 role enum (lines 17118-17133)
- `compiler/PIPELINE.md` — Stage 7.6 contract (lines 2332-2412)

---

## Final report

**Executive summary:** A-2 (Reachability Solver) is the second sub-wave of v0.3 Approach A. A-1 closed S89 with 523 markup-read DG nodes + 523 `reads` edges across a 61-file corpus — substrate ready. A-2 consumes the post-A-1 DG plus RI's RouteMap + ServerFnBoundary, A-3's AuthGraph + RoleEnum, MOD's VendorUnitDeclarations, and produces `ReachabilityRecord` per PIPELINE Stage 7.6 verbatim contract. Algorithm shape is normatively pinned by SPEC §40.9.1 (two-layer fixed-point: 5 component operators + outer closure); sub-implementation details have viable alternatives surfaced as 10 OQs (OQ-A2-A through OQ-A2-K).

A-2 decomposes into **9 sub-phases**: A-2.1 scaffold (5-10h) → A-2.2 component 1 (8-14h) → A-2.3 component 2 (6-10h) → {A-2.4 component 3 ∥ A-2.5 component 4 ∥ A-2.6 component 5} (10-18h critical-path) → A-2.7 outer fixpoint (8-14h) → A-2.8 CLI + JSON (3-5h) → A-2.9 perf (4-7h). **Total: 58-101h sequential / 44-78h parallel critical-path.** Below hand-off-88's ~80-160h band — refinement driven by the mature substrate (A-1 closed; SPEC anchor landed; PIPELINE Stage 7.6 contract verbatim).

**Test budget:** ~71 unit + ~15 integration + ~7 conformance = ~93 new tests; baseline 11,153 → ~11,246. Performance ceiling: ≤100ms walltime on 61-file corpus.

**Recommended FIRST DISPATCH:** **A-2.1 (scaffold, 5-10h).** Authors `compiler/src/types/reachability.ts` + `compiler/src/reachability-solver.ts` (no-op) + pipeline wiring + CLI flag (no-op). Requires only OQ-A2-D disposition (constant-folding primitive surface) to unblock A-2.2; all other OQs can resolve during A-2.1.

**Blocker OQs that must resolve before A-2 starts:**
- **OQ-A2-D** (constant-folding primitive) — recommend (a) extract from META.

**Per-sub-phase blocker OQs** (resolve before the specific sub-phase fires):
- A-2.4: OQ-A2-B (N cap), OQ-A2-C (reactive-write→server-fn), OQ-A2-H (DG vs projection).
- A-2.5: OQ-A2-F (`E-CLOSURE-002`), OQ-A2-I (W-AUTH fire-site), AND A-3.1+A-3.2 contract ratified.
- A-2.7: OQ-A2-A (inner ordering), OQ-A2-G (iteration cap).
- Across A-2: OQ-A2-K (perf budget tolerance).

**Non-blocker OQs:** OQ-A2-E (auth-redirect; confirmation), OQ-A2-J (writes inclusion; confirmation).

**Algorithm-choice surface:** ONE option for high-level shape (SPEC-pinned two-layer fixed-point); MULTIPLE viable for sub-implementation details — surfaced verbatim per OQ for user disposition (pa.md Rule 3 compliance: did not pre-pick).

## Tags

#v0.3 #approach-a #a-2 #reachability-solver #closure-analysis #insight-29 #spec-anchor-d3deed2 #pipeline-stage-7.6 #s89-scoping #post-a1-substrate #523-edges-measured #58-101h-band
