/**
 * @module reachability-solver
 *
 * Reachability Solver — PIPELINE Stage 7.6 (SPEC §40.9).
 *
 * Runs between Stage 7.5 (Batch Planner) and Stage 8 (Code Generator)
 * on the finalized, lift-checked dependency graph. Consumes DG +
 * RouteMap + AuthGraph + ServerFnBoundary + VendorUnitDeclarations +
 * RoleEnum + (informational) BatchPlan and produces a per-entry-point
 * per-role ChunkPlan tree per SPEC §40.9.7.
 *
 * **A-2.1 SCAFFOLD ONLY.** This module is the pipeline slot; the
 * algorithm lands across A-2.2 through A-2.7:
 *
 *   - A-2.2 — Component 1: initially_rendered_components + entry-point
 *             enumeration (§40.9.2).
 *   - A-2.3 — Component 2: reactive_dep_closure (§40.9.3).
 *   - A-2.4 — Component 3: server_fn_reachable_within +
 *             interaction-graph projection (§40.9.4).
 *   - A-2.5 — Component 4: auth_gated_boundaries_visible_to +
 *             AuthGraph consumption (§40.9.5).
 *   - A-2.6 — Component 5: vendor_units_used_by (§40.9.6).
 *   - A-2.7 — outer fixed-point operator + E-CLOSURE-001 (§40.9.1).
 *   - A-2.8 — JSON serialization for --emit-reachability (A-2.1 wires
 *             a minimal serializer here so the CLI flag is functional;
 *             A-2.8 upgrades it to canonical key-ordering).
 *
 * The current body returns an empty `ReachabilityRecord` for every
 * input. Determinism + monotonicity (PIPELINE Stage 7.6 lines 2391-2392)
 * are trivially satisfied — the empty record IS the deterministic
 * floor; subsequent waves extend rather than replace.
 *
 * Cross-references:
 *   - SPEC.md §40.9 — Closure Analysis (Minimal Playable Surface).
 *   - SPEC.md §40.9.1 — five-component union + closure fixed point.
 *   - SPEC.md §40.9.11 — E-CLOSURE-001 + W-AUTH-RUNTIME-FALLBACK codes.
 *   - PIPELINE.md Stage 7.6 (lines 2332-2412) — verbatim contract.
 *   - docs/changes/a2-reachability-solver-scoping/SCOPING.md §5 — A-2 wave decomposition.
 */

import {
  type ChunkContents,
  type ChunkPlan,
  type EntryPointId,
  type NodeId,
  type ReachabilityRecord,
  type RolePlayableSurface,
  type RoleVariant,
  type RSInput,
  type RSOutput,
  type RSError,
  emptyReachabilityRecord,
} from "./types/reachability.ts";
import type { FileAST } from "./types/ast.ts";
import { enumerateEntryPoints } from "./reachability/entry-points.ts";
import { computeInitiallyRenderedComponents } from "./reachability/component-1.ts";
import {
  computeReactiveDepClosure,
  type ReadOnlyDependencyGraph,
} from "./reachability/component-2.ts";
import { computeVendorUnitsUsed } from "./reachability/component-5.ts";
import type { VendorUnitId } from "./types/reachability.ts";
import type { ConstFoldEnv } from "./codegen/constant-folder.ts";

// ---------------------------------------------------------------------------
// Anonymous-viewer role
// ---------------------------------------------------------------------------

/**
 * Canonical role variant emitted when no role enum is present.
 *
 * PIPELINE Stage 7.6 line 2380 — when an application has no role enum
 * declared and no auth gates, the solver synthesizes a single
 * anonymous viewer variant under this name. Component 4 (A-2.5) will
 * replace this with proper per-role classification once AuthGraph
 * lands.
 */
const ANONYMOUS_ROLE: RoleVariant = "_anonymous";

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Run the Stage 7.6 Reachability Solver.
 *
 * **A-2.6 (S90):** Component 5 (`vendor_units_used_by`) lands.
 * Subsequent waves (A-2.4 + A-2.5 + A-2.7) extend the body —
 * Component 3 server-fn reachability, Component 4 auth-gated
 * boundaries, then the outer fixpoint operator.
 *
 * Current scope:
 *   1. Enumerate entry points from `input.files` per §40.8 shapes.
 *   2. For each entry point, compute `initially_rendered_components`
 *      per §40.9.2 (Component 1) — populates `ChunkContents.componentNodeIds`.
 *   3. For each entry point, compute `reactive_dep_closure` per
 *      §40.9.3 (Component 2) — populates `ChunkContents.reactiveCellNodeIds`.
 *      Walks the post-A-1 DG forward from the markup-read substrate
 *      across `reads`/`validator-reads`/`engine-derived-reads` edges
 *      (per OQ-A2-J disposition).
 *   4. For each entry point, compute `vendor_units_used_by` per
 *      §40.9.6 (Component 5) — populates `ChunkContents.vendorUnitNames`.
 *      Opacity rule: each §41 vendor unit is admitted as a whole
 *      atom (no internal graph subdivision).
 *   5. Emit a single-role ChunkPlan keyed `_anonymous` (PIPELINE
 *      Stage 7.6 line 2380 placeholder).
 *   6. `serverFnNodeIds` remains empty (A-2.4 lands it).
 *
 * **Determinism:** entry points + walked nodes are emitted in source
 * order (PIPELINE Stage 7.6 line 2391).
 *
 * **No mutation:** does not mutate `input`. PIPELINE Stage 7.6 line 2393.
 *
 * **Termination:** Component 1 is O(markup-nodes); Component 2 is
 * O(|C| × |MarkupReads| + |reactive-edges|) with a visited-set
 * cycle guard. Component 5 is O(|files| × imports + |C|) — single
 * pass per file + per-component file lookup. No fixed-point
 * iteration at this wave; that lands at A-2.7.
 */
export function runReachabilitySolver(input: RSInput): RSOutput {
  const record: ReachabilityRecord = emptyReachabilityRecord();
  const errors: RSError[] = [];

  // `files` is the list of typed file ASTs from META. When the field
  // is missing (e.g. unit tests bypassing the pipeline) we degrade
  // gracefully to the empty record — matches A-2.1 scaffold behavior.
  const files = (input.files as FileAST[] | undefined) ?? [];
  if (files.length === 0) {
    return { record, errors };
  }

  // Component 1 — entry-point enumeration + initially-rendered set.
  const entryPoints = enumerateEntryPoints(files);
  const env: ConstFoldEnv = { constBindings: new Map() };
  const irc = computeInitiallyRenderedComponents(entryPoints, files, env);

  // Component 2 — reactive-dep closure over the post-A-1 DG. The DG
  // is duck-typed at the boundary; when absent (tests bypassing the
  // full pipeline) Component 2 returns empty closures per entry point.
  const dg = input.depGraph as ReadOnlyDependencyGraph | null | undefined;
  const reactiveClosures = computeReactiveDepClosure(irc, dg);

  // Component 5 — §41 vendor units referenced by each entry point's
  // component set. Opacity rule (§40.9.6): the vendor unit's internal
  // module graph is NOT subdivided; Component 5 admits the unit as a
  // whole by VendorUnitId. Per-unit chunking is A-4's concern.
  const vendorUnits = computeVendorUnitsUsed(irc, files);

  // Materialize per-entry-point per-role ChunkPlans.
  for (const ep of entryPoints) {
    const componentIds: Set<NodeId> = irc.get(ep.id) ?? new Set();
    const reactiveCellIds: Set<NodeId> =
      reactiveClosures.get(ep.id) ?? new Set();
    const vendorUnitNames: Set<VendorUnitId> =
      vendorUnits.get(ep.id) ?? new Set();
    const plan = makeChunkPlan(componentIds, reactiveCellIds, vendorUnitNames);
    const rps: RolePlayableSurface = { byRole: new Map() };
    rps.byRole.set(ANONYMOUS_ROLE, plan);
    record.closures.set(ep.id satisfies EntryPointId, rps);
  }

  return { record, errors };
}

// ---------------------------------------------------------------------------
// ChunkPlan construction
// ---------------------------------------------------------------------------

/**
 * Build the per-tier ChunkPlan for a single (entry-point, role) pair.
 *
 * At A-2.6 (Components 1 + 2 + 5), the `initialChunk` admits the
 * initially-rendered component set (Component 1), the transitive
 * reactive-dep closure (Component 2), AND the vendor units referenced
 * by the component set (Component 5). prefetchTier1 / prefetchTier2
 * remain empty — those tiers consume Component 3's interaction-graph
 * projection (A-2.4) which is not yet wired.
 *
 * Monotonicity (PIPELINE Stage 7.6 line 2392): trivially satisfied —
 * `initialChunk ⊆ initialChunk ∪ ∅ ∪ ∅ ∪ ...`.
 */
function makeChunkPlan(
  componentNodeIds: Set<NodeId>,
  reactiveCellNodeIds: Set<NodeId>,
  vendorUnitNames: Set<VendorUnitId>,
): ChunkPlan {
  return {
    initialChunk: {
      componentNodeIds: new Set(componentNodeIds),
      reactiveCellNodeIds: new Set(reactiveCellNodeIds),
      serverFnNodeIds: new Set(),
      vendorUnitNames: new Set(vendorUnitNames),
    },
    prefetchTier1: emptyChunkContents(),
    prefetchTier2: emptyChunkContents(),
    prefetchTierN: [],
  };
}

function emptyChunkContents(): ChunkContents {
  return {
    componentNodeIds: new Set(),
    reactiveCellNodeIds: new Set(),
    serverFnNodeIds: new Set(),
    vendorUnitNames: new Set(),
  };
}

// ---------------------------------------------------------------------------
// JSON serialization — A-2.1 minimal scaffold + A-2.8 canonicalization target
// ---------------------------------------------------------------------------

/**
 * Serialize a `ReachabilityRecord` to JSON for the `--emit-reachability`
 * CLI flag.
 *
 * **A-2.1 scaffold:** emits a well-formed empty-shape JSON document.
 * Maps are serialized as objects with sorted string keys; Sets as
 * sorted arrays. The shape mirrors the TypeScript surface verbatim
 * so downstream tests can assert structure without depending on the
 * algorithm.
 *
 * **A-2.8 will replace this body** with the canonical-key-ordering
 * serializer per PIPELINE Stage 7.6 line 2391 determinism invariant.
 * The signature is stable.
 */
export function serializeReachabilityRecord(record: ReachabilityRecord): string {
  const closures: Record<string, unknown> = {};
  // Sort entry-point keys for deterministic output.
  const epKeys = Array.from(record.closures.keys()).sort();
  for (const ep of epKeys) {
    const rps = record.closures.get(ep);
    if (!rps) continue;
    const byRole: Record<string, unknown> = {};
    const roleKeys = Array.from(rps.byRole.keys()).sort();
    for (const role of roleKeys) {
      const plan = rps.byRole.get(role);
      if (!plan) continue;
      byRole[role] = {
        initialChunk: serializeChunkContents(plan.initialChunk),
        prefetchTier1: serializeChunkContents(plan.prefetchTier1),
        prefetchTier2: serializeChunkContents(plan.prefetchTier2),
        prefetchTierN: plan.prefetchTierN.map(serializeChunkContents),
      };
    }
    closures[ep] = { byRole };
  }

  const diagnostics = record.diagnostics.map((d) => ({
    code: d.code,
    severity: d.severity,
    message: d.message,
    ...(d.entryPoint !== undefined ? { entryPoint: d.entryPoint } : {}),
    ...(d.role !== undefined ? { role: d.role } : {}),
  }));

  return JSON.stringify({ closures, diagnostics }, null, 2);
}

function serializeChunkContents(cc: {
  componentNodeIds: Set<unknown>;
  reactiveCellNodeIds: Set<unknown>;
  serverFnNodeIds: Set<unknown>;
  vendorUnitNames: Set<unknown>;
}): Record<string, unknown> {
  return {
    componentNodeIds: sortedArrayFromSet(cc.componentNodeIds),
    reactiveCellNodeIds: sortedArrayFromSet(cc.reactiveCellNodeIds),
    serverFnNodeIds: sortedArrayFromSet(cc.serverFnNodeIds),
    vendorUnitNames: sortedArrayFromSet(cc.vendorUnitNames),
  };
}

function sortedArrayFromSet(set: Set<unknown>): unknown[] {
  return Array.from(set).sort((a, b) => {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
}
