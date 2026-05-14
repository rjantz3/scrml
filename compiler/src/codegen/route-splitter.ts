/**
 * @module codegen/route-splitter
 *
 * Per-route artifact splitter — wave A-4 (SPEC §40.9.7).
 *
 * Iterates the Stage 7.6 Reachability Solver's per-(entry-point, role)
 * `ChunkPlan` shape and produces per-(EP, role, tier) chunk descriptors.
 * Sits ABOVE the per-file codegen pipeline (Stage 8): per-file codegen
 * produces atoms; the route-splitter composes atoms into chunks.
 *
 * Sub-phase A-4.1 (this file's initial scope):
 *   - Iteration scaffold ONLY. Empty `payloadJs: ""` body per chunk.
 *   - Placeholder 8-character hash `"00000000"` until A-4.6 lands content-
 *     addressing.
 *   - Correctly-shaped `ChunkKey` / `ChunkOutput` / `ChunksManifest` so
 *     A-4.2..A-4.7 can attach to a stable contract.
 *
 * Subsequent sub-phases:
 *   - A-4.2 — populate `payloadJs` for `initialChunk` from per-file
 *     emitter atoms.
 *   - A-4.3/A-4.4 — populate `payloadJs` for `prefetchTier1` /
 *     `prefetchTier2` + idle/hover runtime wiring.
 *   - A-4.5 — `prefetchTierN` (N ≥ 3) dispatch hook.
 *   - A-4.6 — content-addressed `chunkHash` (FNV-1a base36, §47.1.3).
 *   - A-4.7 — per-route HTML augmentation + W-CG-CHUNK-* lints.
 *
 * Output filename convention per SCOPING OQ-A4-C (ratified):
 *
 *   <route-path>/<RoleVariant>.<tier>.<8-char-hash>.js
 *
 * where:
 *   - `<route-path>` mirrors §47.9.2 path-preserve for the entry point's
 *     routePath (or the SPA-program file basename for `shape: "spa-program"`).
 *   - `<RoleVariant>` is the role-enum variant name (or `_anonymous` for
 *     the floor case).
 *   - `<tier>` is one of `initial` / `tier1` / `tier2` / `tierN<N>`.
 *   - `<8-char-hash>` is the content-addressed hash (placeholder
 *     `"00000000"` at A-4.1).
 *
 * Cross-references:
 *   - SPEC.md §40.9.7 (L17774-17793) — per-tier output structure.
 *   - SPEC.md §40.9.8 (L17794-17812) — determinism preservation.
 *   - SPEC.md §47.5 (L19152-19174) — content-addressing scope of application.
 *   - SPEC.md §47.9.2 — output path encoding + path-preserve rule.
 *   - PIPELINE.md Stage 8 (L2414-2495) — codegen orchestrator contract.
 *   - docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md
 *     §3.1 — A-4.1 sub-phase scope (this file).
 *   - docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md
 *     §4.2 — Shape B (RECOMMENDED) architectural pattern.
 */

import type {
  ChunkContents,
  ChunkPlan,
  EntryPointId,
  ReachabilityRecord,
  RoleVariant,
  VendorUnitId,
  NodeId,
} from "../types/reachability.ts";
import type { CompileContext } from "./context.ts";
import type { CgFileOutput } from "./index.ts";
import { CGError } from "./errors.ts";
import {
  emitReactiveCellAtom,
  emitServerFnStubAtom,
  emitVendorUnitRef,
  emitComponentAtom,
  canonicalNodeIdArray,
  canonicalVendorUnitArray,
  findNodeById,
  type RouteInfo,
} from "./atom-emitter.ts";

// ---------------------------------------------------------------------------
// Public types — chunk descriptor shapes (A-4.1)
// ---------------------------------------------------------------------------

/**
 * Canonical per-chunk tier name.
 *
 *   - `"initial"`   → `ChunkPlan.initialChunk`
 *   - `"tier1"`     → `ChunkPlan.prefetchTier1`
 *   - `"tier2"`     → `ChunkPlan.prefetchTier2`
 *   - `"tierN<N>"`  → `ChunkPlan.prefetchTierN[N - 3]` (N ≥ 3)
 *
 * Tier-N is structurally empty in v0.3 per OQ-A2-B Option a — the
 * iteration produces zero `tierN*` entries until RS extends to N ≥ 3.
 */
export type ChunkTier = "initial" | "tier1" | "tier2" | `tierN${number}`;

/**
 * Canonical chunk identifier.
 *
 * Composed from the three iteration axes: entry point × role × tier.
 * Used as the Map key for `EmitPerRouteResult.chunks` AND as the
 * canonical reference label in `ChunksManifest` entries.
 *
 * Format: `${EntryPointId}::${RoleVariant}::${ChunkTier}`.
 *
 * Determinism: the ChunkKey is a pure projection of `(EpId, Role, Tier)`
 * with no compile-time side input. Identical source produces identical
 * key shapes (§40.9.8).
 */
export type ChunkKey = `${EntryPointId}::${RoleVariant}::${ChunkTier}`;

/**
 * The emit-shape for a single per-(entry-point, role, tier) chunk.
 *
 * At A-4.1 `payloadJs` is always `""` (empty placeholder body) and
 * `chunkHash` is always `"00000000"` (placeholder). A-4.2 populates
 * `payloadJs`; A-4.6 populates `chunkHash`.
 *
 * The atom-id sets are pass-through copies from `ChunkContents` so A-4.2
 * (and later) can compose payloads without re-reading the
 * ReachabilityRecord.
 */
export interface ChunkOutput {
  /** Canonical `${EpId}::${Role}::${Tier}` key. */
  key: ChunkKey;
  /** Entry-point id this chunk belongs to. */
  entryPointId: EntryPointId;
  /** Role variant this chunk admits content for. */
  role: RoleVariant;
  /** Tier label per `ChunkTier`. */
  tier: ChunkTier;
  /**
   * Output filename relative to the per-app dist root.
   *
   * Shape (OQ-A4-C): `<route-path>/<RoleVariant>.<tier>.<8-char-hash>.js`.
   *
   * Computed at A-4.1; the `<8-char-hash>` segment is the placeholder
   * `"00000000"` until A-4.6 lands real content-addressing.
   */
  filename: string;
  /**
   * 8-character content-address hash. Placeholder `"00000000"` at A-4.1;
   * real FNV-1a base36 hash (§47.1.3) lands at A-4.6.
   */
  chunkHash: string;
  /**
   * The chunk's JS payload body. Empty string at A-4.1; A-4.2 populates
   * for `tier === "initial"`; A-4.3/A-4.4 for tier1/tier2.
   */
  payloadJs: string;
  /** Component DG node ids admitted to this chunk (pass-through from ChunkContents). */
  componentNodeIds: Set<NodeId>;
  /** Reactive cell DG node ids admitted to this chunk. */
  reactiveCellNodeIds: Set<NodeId>;
  /** Server-fn DG node ids admitted to this chunk. */
  serverFnNodeIds: Set<NodeId>;
  /** Vendor unit names admitted to this chunk (§41 atom set). */
  vendorUnitNames: Set<VendorUnitId>;
}

/**
 * Per-tier manifest entries for a single (entry-point, role) pair.
 *
 * Maps tier → ChunkKey. Missing tier keys indicate the tier produced no
 * chunk (e.g. tierN is unpopulated in v0.3 per OQ-A2-B Option a).
 */
export interface ChunksManifestEntry {
  initial?: ChunkKey;
  tier1?: ChunkKey;
  tier2?: ChunkKey;
  /** Index-aligned with `ChunkPlan.prefetchTierN`; sparse-empty in v0.3. */
  tierN?: ChunkKey[];
}

/**
 * Per-app chunks.json manifest shape.
 *
 * Per OQ-A4-A (ratified) the manifest is ALWAYS emitted when
 * `--emit-per-route` is set. Per §40.9.8 the manifest itself is
 * deterministic-from-source-only — identical source produces identical
 * manifest bytes.
 *
 * `version: 1` is the manifest schema version. The shape MAY extend in
 * v0.4+ (telemetry-PGO hints per Approach B); version bump signals
 * incompatibility.
 *
 * `compiler` is the compiler identity string — diagnostic-only, not
 * a determinism axis (per §40.9.8 the compiler version is NOT an input
 * to chunk content hashes; the manifest field is informational).
 */
export interface ChunksManifest {
  version: 1;
  compiler: string;
  /** entryPoints[<EntryPointId>][<RoleVariant>] = ChunksManifestEntry. */
  entryPoints: Record<EntryPointId, Record<RoleVariant, ChunksManifestEntry>>;
}

/**
 * Input contract for `emitPerRouteChunks`.
 *
 * The function consumes the RS output (`reachabilityRecord`), the
 * per-file CompileContext (for cross-referencing AST + analysis when
 * A-4.2 populates real payloads), and the per-file output map produced
 * by the per-file emit phase (for atom-emitter access at A-4.2).
 *
 * At A-4.1 only `reachabilityRecord` is structurally consumed; the
 * other two fields are reserved for A-4.2+.
 */
export interface EmitPerRouteInput {
  reachabilityRecord: ReachabilityRecord;
  /**
   * Per-file CompileContexts produced during per-file analysis/plan/emit.
   * Map key is the absolute source file path.
   *
   * Reserved for A-4.2 — at A-4.1 this is unused (kept on the input
   * shape so the public contract is stable across sub-phases).
   */
  cgContextByFile?: Map<string, CompileContext>;
  /**
   * Per-file output map from `runCG`'s per-file emit pass.
   *
   * Reserved for A-4.2 — at A-4.1 this is unused for the same stability
   * reason as `cgContextByFile`.
   */
  perFileOutputs?: Map<string, CgFileOutput>;
}

/**
 * Output of `emitPerRouteChunks`.
 *
 *   - `chunks` — per-chunk descriptor map keyed by canonical `ChunkKey`.
 *   - `manifest` — `chunks.json` shape (per OQ-A4-A always-emit).
 *   - `diagnostics` — `CGError[]` for splitter-surfaced lints / errors.
 *     Empty at A-4.1; A-4.7 introduces W-CG-CHUNK-* lints.
 */
export interface EmitPerRouteResult {
  chunks: Map<ChunkKey, ChunkOutput>;
  manifest: ChunksManifest;
  diagnostics: CGError[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Placeholder hash used at A-4.1 before A-4.6 lands content-addressing.
 *
 * Eight zeros — distinct from any real FNV-1a base36 hash so tests can
 * assert the placeholder is present (and A-4.6's tests can assert it is
 * REPLACED).
 */
export const CHUNK_HASH_PLACEHOLDER = "00000000";

/**
 * Anonymous role tag used when the app has no role enum (SPEC §40.1.1).
 *
 * Mirrors `reachability/component-4.ts:ANONYMOUS_ROLE` and the
 * PIPELINE Stage 7.6 L2380 convention.
 */
const ANONYMOUS_ROLE: RoleVariant = "_anonymous";

/**
 * Compiler identity string surfaced in `ChunksManifest.compiler`.
 *
 * Informational only — per §40.9.8 the compiler version is NOT a
 * chunk-hash input. The field exists for adopter tooling (debug
 * inspectors, future telemetry-PGO surfaces) to identify the compiler
 * that produced the manifest.
 */
const COMPILER_IDENTITY = "scrml-0.3.0";

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Emit per-(entry-point, role, tier) chunk descriptors from the Stage 7.6
 * ReachabilityRecord.
 *
 * At A-4.1: iteration scaffold only. Each chunk descriptor carries:
 *   - Correct canonical `key` / `entryPointId` / `role` / `tier`.
 *   - Correct OQ-A4-C filename with `CHUNK_HASH_PLACEHOLDER`.
 *   - Empty `payloadJs: ""`.
 *   - Pass-through atom id sets from the underlying `ChunkContents`.
 *
 * No actual chunk-content emission happens at A-4.1; A-4.2 populates
 * `payloadJs` for `initial` tier; A-4.3/A-4.4 for tier1/tier2.
 *
 * Iteration order:
 *
 *   for each (epId, rps) in reachabilityRecord.closures:
 *     for each (role, plan) in rps.byRole:
 *       for tier in ["initial", "tier1", "tier2", ...tierN]:
 *         emit chunk descriptor
 *
 * Per SPEC §40.9.8 the iteration is deterministic: the underlying RS
 * output uses canonical Map ordering (insertion-order of EpId enumeration
 * + sorted RoleVariant), so iteration here preserves that order without
 * additional sorting.
 *
 * @param input Reachability record + (reserved) per-file context map.
 * @returns ChunkKey-indexed chunk descriptors + manifest + diagnostics.
 */
export function emitPerRouteChunks(
  input: EmitPerRouteInput,
): EmitPerRouteResult {
  const chunks = new Map<ChunkKey, ChunkOutput>();
  const manifest: ChunksManifest = {
    version: 1,
    compiler: COMPILER_IDENTITY,
    entryPoints: {},
  };
  const diagnostics: CGError[] = [];

  const { reachabilityRecord } = input;
  if (!reachabilityRecord) {
    // Defensive: a caller may pass an undefined record when
    // `--emit-per-route` is set but RS produced no output (degenerate
    // pipeline-bypass case). Return the empty result shape.
    return { chunks, manifest, diagnostics };
  }

  // A-4.2 — entry-point filePath resolution so `composeInitialChunk` can
  // look up the right per-file `CompileContext` for atom emission. The
  // EntryPointId encodes the source filepath as a prefix; we extract it
  // once per epId so the composer doesn't have to re-parse the id.
  const ctxByFile = input.cgContextByFile;

  for (const [epId, rps] of reachabilityRecord.closures) {
    const roleMap: Record<RoleVariant, ChunksManifestEntry> = {};
    const epFilePath = filePathFromEntryPointId(epId);
    const epCtx = (ctxByFile && epFilePath) ? ctxByFile.get(epFilePath) : undefined;

    for (const [role, plan] of rps.byRole) {
      const entry: ChunksManifestEntry = {};

      // -- tier1 (A-4.3) -- compose FIRST so the initial-chunk IIFE
      // tail can reference the tier-1 chunk URL when the admission set
      // is non-empty. Empty admission → empty payloadJs (skipped by
      // api.js write loop) + null IIFE-tail (no prefetch call emitted)
      // + `_scrml_prefetch_tier1` tree-shaken from SCRML_RUNTIME.
      //
      // The composer is only invoked when (a) we have a CompileContext
      // (unit-test direct invocations may not) AND (b) the admission
      // set is non-empty. Both checks compose: any of (a)-(b) failing
      // leaves `payloadJs = ""` and `tier1Url = null`.
      const tier1Chunk = makeChunkOutput(epId, role, "tier1", plan.prefetchTier1);
      const tier1NonEmpty = !isChunkContentsEmpty(plan.prefetchTier1);
      if (epCtx && tier1NonEmpty) {
        tier1Chunk.payloadJs = composeTier1Chunk(plan.prefetchTier1, epCtx, epId, role);
      }
      // The IIFE-tail prefetch URL is the tier-1 chunk's filename
      // resolved relative to the per-app dist root. We emit it as an
      // absolute-path URL (`/<filename>`) so the runtime fetch resolves
      // against the same origin as the initial chunk's host page. The
      // tier-1 URL is only passed when the admission is non-empty AND
      // we actually composed a real chunk payload.
      const tier1Url = (epCtx && tier1NonEmpty)
        ? `/${tier1Chunk.filename}`
        : null;

      // -- initial (A-4.2) -- composer optionally appends an IIFE-tail
      // `_scrml_prefetch_tier1(<tier1Url>)` call when `tier1Url` is
      // non-null. When the route-splitter has no CompileContext (unit-
      // test direct invocation with `makeRecord`), the initial-chunk
      // payload falls back to the empty string; the byte-deterministic
      // canonical empty is `""` which composes safely with the manifest
      // determinism contract.
      const initialChunk = makeChunkOutput(epId, role, "initial", plan.initialChunk);
      if (epCtx) {
        initialChunk.payloadJs = composeInitialChunk(
          plan.initialChunk,
          epCtx,
          epId,
          role,
          tier1Url,
        );
      }
      chunks.set(initialChunk.key, initialChunk);
      entry.initial = initialChunk.key;

      chunks.set(tier1Chunk.key, tier1Chunk);
      entry.tier1 = tier1Chunk.key;

      // tier2 — A-4.4 territory; payload remains "" at A-4.2.
      const tier2Chunk = makeChunkOutput(epId, role, "tier2", plan.prefetchTier2);
      chunks.set(tier2Chunk.key, tier2Chunk);
      entry.tier2 = tier2Chunk.key;

      // tierN (N ≥ 3). Empty in v0.3 per OQ-A2-B Option a; iteration is
      // structurally present for v0.4+ compatibility.
      if (plan.prefetchTierN.length > 0) {
        entry.tierN = [];
        for (let i = 0; i < plan.prefetchTierN.length; i++) {
          const nLabel = `tierN${i + 3}` as ChunkTier;
          const tierNChunk = makeChunkOutput(epId, role, nLabel, plan.prefetchTierN[i]);
          chunks.set(tierNChunk.key, tierNChunk);
          entry.tierN.push(tierNChunk.key);
        }
      }

      roleMap[role] = entry;
    }
    manifest.entryPoints[epId] = roleMap;
  }

  return { chunks, manifest, diagnostics };
}

// ---------------------------------------------------------------------------
// composeInitialChunk — A-4.2 §40.9.7 initial_chunk(E) emitter
// composeTier1Chunk   — A-4.3 §40.9.7 prefetch_tier_1(E) emitter
// ---------------------------------------------------------------------------

/**
 * Compose the `payloadJs` body for an `initial`-tier chunk from a
 * `ChunkContents` admission set + the per-file `CompileContext`.
 *
 * **§40.9.7 normative shape:**
 *
 *   `initial_chunk(E)` SHALL contain every component, server-fn stub,
 *   and vendor unit in `playable_surface(E, N=0)`.
 *
 * The composer walks the four admission sets in canonical order
 * (stratified comparator per A-2.8) and calls the matching atom
 * emitter for each id:
 *
 *   1. Vendor units (emit FIRST so subsequent atoms can reference
 *      the bound namespace variable).
 *   2. Server-fn fetch stubs.
 *   3. Reactive cell init lines.
 *   4. Component mount markers (admitted markup nodes).
 *
 * The result is wrapped in an IIFE so the chunk is self-contained when
 * evaluated as a regular `<script>` (no global-scope pollution); the
 * shared `SCRML_RUNTIME` symbols are assumed to be in scope as global
 * declarations from the always-loaded runtime file (which the per-app
 * dist root carries at `scrml-runtime.js` per `index.ts`).
 *
 * **Determinism (§40.9.8):** every set iteration uses the canonical
 * comparator; the output is byte-identical across runs for identical
 * input. Two builds of the same source produce identical chunk-payload
 * bytes — a prerequisite for A-4.6 content-addressed hashing.
 *
 * **`null` for absence (§42.5/§42.8):** any literal absence in the
 * emitted JS is `null`. The atoms here delegate to `atom-emitter.ts`,
 * which enforces this internally.
 *
 * **A-4.3 IIFE-tail prefetch call.** When the corresponding (EP, role)
 * `ChunkPlan` has a non-empty `prefetchTier1` admission set, the
 * initial-chunk IIFE is augmented with a trailing
 * `_scrml_prefetch_tier1("<chunk-url>")` call before the IIFE close so
 * the browser begins fetching tier-1 after first paint. Empty tier-1
 * admission sets produce NO prefetch call (and no tier-1 file —
 * `_scrml_prefetch_tier1` is tree-shaken from `SCRML_RUNTIME` in that
 * case).
 *
 * @param contents The `ChunkContents` admission set for `initial` tier.
 * @param ctx The per-file CompileContext for the entry point's source
 *   file. Used to resolve node ids → AST nodes for atom emission.
 * @param epId Entry-point id (informational; surfaces in the chunk
 *   header comment for adopter debugging).
 * @param role Role variant (informational; surfaces in the chunk
 *   header comment so per-role chunks are visually distinguishable).
 * @param tier1Url When non-null, a `_scrml_prefetch_tier1(<tier1Url>)`
 *   call is appended to the IIFE tail. `null` (default) emits no
 *   prefetch call — used when the (EP, role)'s tier-1 admission set is
 *   empty so the prefetch runtime is tree-shaken.
 * @returns The fully-composed `payloadJs` string.
 */
export function composeInitialChunk(
  contents: ChunkContents,
  ctx: CompileContext,
  epId: EntryPointId,
  role: RoleVariant,
  tier1Url: string | null = null,
): string {
  const lines: string[] = [];

  // Chunk header — adopter-readable, deterministic, role-aware.
  lines.push(`// scrml initial chunk — entryPoint=${epId} role=${role}`);
  lines.push(`// §40.9.7 initial_chunk(E) — admitted set per playable_surface(E, N=0)`);
  lines.push(`(function () {`);
  lines.push(`  "use strict";`);

  appendAtomLines(lines, contents, ctx);

  // -- A-4.3 IIFE-tail tier-1 idle-prefetch call. --
  //
  // When the (EP, role)'s ChunkPlan.prefetchTier1 admits a non-empty
  // set, the route-splitter passes the tier-1 chunk URL here and the
  // initial chunk schedules an idle-callback prefetch after first
  // paint. When the admission set is empty, `tier1Url` is null and no
  // call is emitted — the corresponding tier-1 file is also not
  // written, and the `_scrml_prefetch_tier1` runtime function is
  // tree-shaken from SCRML_RUNTIME (see `runtime-chunks.ts:prefetch`
  // marker + `emit-client.ts:detectRuntimeChunks`).
  //
  // Per SPEC §40.9.7: "prefetch_tier_1(E) SHALL be idle-prefetched
  // after initial render. The implementation SHOULD use
  // `requestIdleCallback` ...". The runtime function implements that
  // SHOULD using `requestIdleCallback` browser-side with a
  // `setTimeout(fn, 1)` Safari fallback (OQ-A4-G ratification S91 —
  // Option γ).
  if (tier1Url !== null) {
    lines.push(``);
    lines.push(`  // --- §40.9.7 tier-1 idle prefetch (OQ-A4-G Option γ) ---`);
    lines.push(`  _scrml_prefetch_tier1(${JSON.stringify(tier1Url)});`);
  }

  lines.push(`})();`);
  // Trailing newline so chunks concatenate cleanly when sequenced into
  // a single SSR-injected `<script>` block (a v1.0 polish target).
  lines.push("");

  return lines.join("\n");
}

/**
 * Compose the `payloadJs` body for a `tier1`-tier chunk from a
 * `ChunkContents` admission set + the per-file `CompileContext`.
 *
 * **§40.9.7 normative shape:**
 *
 *   `prefetch_tier_1(E) := playable_surface(E, N=1) − initial_chunk(E)`
 *
 * The tier-1 chunk is the DELTA over the initial chunk — only the
 * components / server-fn stubs / reactive cells / vendor units that
 * become reachable at interaction depth N=1 but were NOT already
 * admitted to the initial chunk. The RS solver (A-2.5 Component 4)
 * computes this delta and surfaces it as
 * `ChunkPlan.prefetchTier1.{componentNodeIds, reactiveCellNodeIds,
 * serverFnNodeIds, vendorUnitNames}`. The composer here just walks
 * those sets in canonical order and concatenates the atom outputs.
 *
 * **Empty tier-1 contract.** When all four admission sets are empty,
 * the caller (`emitPerRouteChunks`) MUST skip both the prefetch call
 * AND the tier-1 file write (so the tree-shake elides
 * `_scrml_prefetch_tier1` from SCRML_RUNTIME). This composer is NOT
 * called in that case — its non-empty-input contract is enforced at
 * the call site via `isChunkContentsEmpty`.
 *
 * **Determinism (§40.9.8):** byte-identical input → byte-identical
 * output. Reuses the same canonical comparator + atom emitters as
 * `composeInitialChunk` to preserve the §40.9.8 hash-input invariant.
 *
 * **§40.9.9 worked example normative.** For the worked example with
 * viewer=Driver, `prefetch_tier_1(/) = {}` (lines 17873-17874): the
 * RS solver produces an empty tier-1 plan, the composer is not
 * invoked, no file is written, no prefetch call is emitted, and the
 * runtime helper is tree-shaken. The integration test asserts this
 * end-to-end.
 *
 * @param contents The `ChunkContents` admission set for `tier1` tier.
 * @param ctx The per-file CompileContext for the entry point's source
 *   file. Used to resolve node ids → AST nodes for atom emission.
 * @param epId Entry-point id (informational; chunk header comment).
 * @param role Role variant (informational; chunk header comment).
 * @returns The fully-composed `payloadJs` string.
 */
export function composeTier1Chunk(
  contents: ChunkContents,
  ctx: CompileContext,
  epId: EntryPointId,
  role: RoleVariant,
): string {
  const lines: string[] = [];

  // Chunk header — distinct from initial chunk by tier label so adopters
  // can visually verify which file they are inspecting.
  lines.push(`// scrml tier-1 chunk — entryPoint=${epId} role=${role}`);
  lines.push(`// §40.9.7 prefetch_tier_1(E) — playable_surface(E, N=1) − initial_chunk(E)`);
  lines.push(`(function () {`);
  lines.push(`  "use strict";`);

  appendAtomLines(lines, contents, ctx);

  lines.push(`})();`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Shared atom-section emitter used by both `composeInitialChunk` and
 * `composeTier1Chunk`.
 *
 * Walks the four admission sets in canonical order (per A-2.8
 * stratified comparator) and appends the matching atom-emitter output
 * to `lines`. The same section-header comments + indentation are used
 * across tiers so adopter-side visual inspection is consistent.
 *
 * Section ordering:
 *
 *   1. Vendor units (must be first — later atoms may reference the
 *      bound namespace variable).
 *   2. Server-fn fetch stubs.
 *   3. Reactive cell init lines.
 *   4. Component mount markers.
 *
 * Section headers are emitted ONLY when the corresponding admission
 * set is non-empty. Empty sections produce no header (clean output
 * for tier-1 deltas that admit only one section).
 */
function appendAtomLines(
  lines: string[],
  contents: ChunkContents,
  ctx: CompileContext,
): void {
  // -- 1. Vendor unit references (alphabetical-codepoint order). --
  const vendorUnits = canonicalVendorUnitArray(contents.vendorUnitNames);
  if (vendorUnits.length > 0) {
    lines.push(``);
    lines.push(`  // --- vendor units (§41) ---`);
    for (const unitName of vendorUnits) {
      // Vendor units lower to top-level `import` statements; an IIFE
      // body cannot host them, so we surface the import as a chunk-
      // top reference comment. Real `import` emission lives in the
      // per-file `.client.js`; the chunk records the dependency via
      // a runtime `_scrml_vendor_require` call so the bundler can
      // pre-resolve the unit's module ahead of chunk evaluation.
      const atom = emitVendorUnitRef(unitName, ctx.fileAST);
      const specifier = `vendor:${unitName}`;
      lines.push(`  _scrml_vendor_require(${JSON.stringify(specifier)});`);
      // Preserve the import-line as a comment for adopter-debug
      // traceability of the original §41 reference.
      lines.push(`  // ${atom.replace(/\n$/, "")}`);
    }
  }

  // -- 2. Server-fn fetch stubs (canonical node-id order). --
  const serverFnIds = canonicalNodeIdArray(contents.serverFnNodeIds);
  if (serverFnIds.length > 0) {
    lines.push(``);
    lines.push(`  // --- server-fn fetch stubs (§40.9.4 / §52.10) ---`);
    for (const fnId of serverFnIds) {
      const stub = composeServerFnAtom(fnId, ctx);
      if (stub === "") continue;
      // Indent the stub body so the IIFE shell stays well-formed.
      const indented = stub
        .split("\n")
        .map((line) => (line === "" ? "" : `  ${line}`))
        .join("\n");
      lines.push(indented);
    }
  }

  // -- 3. Reactive cell init lines (canonical node-id order). --
  //
  // Reactive cell node ids use the DG `reactive::<filePath>::<span.start>::
  // <counter>` string shape (see `dependency-graph.ts:makeNodeId`). The
  // route-splitter splits on `::` to recover `span.start` and then walks
  // the AST to find the state-decl with that exact span.start.
  const reactiveIds = canonicalNodeIdArray(contents.reactiveCellNodeIds);
  if (reactiveIds.length > 0) {
    lines.push(`  // --- reactive cells (§6) ---`);
    for (const cellId of reactiveIds) {
      const node = resolveReactiveDGNodeIdToAst(cellId, ctx.fileAST);
      if (!node) continue;
      const atom = emitReactiveCellAtom(node, ctx);
      if (atom === "") continue;
      lines.push(`  ${atom.replace(/\n$/, "")}`);
    }
  }

  // -- 4. Component mount markers (admitted markup nodes). --
  const componentIds = canonicalNodeIdArray(contents.componentNodeIds);
  if (componentIds.length > 0) {
    lines.push(`  // --- admitted components (§40.9.2) ---`);
    for (const compId of componentIds) {
      const atom = emitComponentAtom(compId, ctx);
      if (atom === "") continue;
      lines.push(`  ${atom.replace(/\n$/, "")}`);
    }
  }
}

/**
 * Test the four-set admission shape for emptiness.
 *
 * Used by `emitPerRouteChunks` to decide whether to compose a tier-1
 * chunk + emit the IIFE-tail prefetch call. Empty admission across all
 * four sets means:
 *
 *   - NO tier-1 file is written (`payloadJs` stays `""` so api.js's
 *     write loop skips it).
 *   - NO `_scrml_prefetch_tier1` call is emitted in the initial-chunk
 *     IIFE tail.
 *   - The `prefetch` runtime chunk is tree-shaken (no chunk references
 *     `_scrml_prefetch_tier1` so `detectRuntimeChunks` does not add
 *     `prefetch` to the runtime chunk set).
 *
 * Exported so unit tests can pin the empty-detection contract.
 */
export function isChunkContentsEmpty(contents: ChunkContents): boolean {
  return (
    contents.componentNodeIds.size === 0 &&
    contents.reactiveCellNodeIds.size === 0 &&
    contents.serverFnNodeIds.size === 0 &&
    contents.vendorUnitNames.size === 0
  );
}

/**
 * Resolve a reactive-cell DG node id to its AST `state-decl` node.
 *
 * DG node id shape (per `dependency-graph.ts:makeNodeId`):
 *
 *   `reactive::<filePath>::<span.start>::<counter>`
 *
 * The span.start segment is the AUTHORITATIVE link to the AST node —
 * each state-decl in the file has a unique span.start. We parse it and
 * walk the AST for a state-decl whose `span.start` matches.
 *
 * Returns null when:
 *   - The id is not a string (defensive).
 *   - The shape doesn't match (id from a non-reactive DG node kind).
 *   - No state-decl AST node has the parsed span.start.
 */
function resolveReactiveDGNodeIdToAst(
  cellId: NodeId,
  fileAST: unknown,
): Record<string, unknown> | null {
  // Two id shapes are supported:
  //   - Real-pipeline DG ids: `"reactive::<filePath>::<span.start>::
  //     <counter>"` — parse out span.start and walk for a state-decl.
  //   - Synthetic-test ids (numeric or arbitrary string): fall through
  //     to a direct `id ===` match via `findNodeById`.
  if (typeof cellId === "string") {
    const segs = cellId.split("::");
    if (segs.length >= 4 && segs[0] === "reactive") {
      const spanStart = parseInt(segs[segs.length - 2], 10);
      if (Number.isFinite(spanStart)) {
        const found = findStateDeclBySpanStart(fileAST, spanStart);
        if (found) return found;
      }
    }
  }

  // Synthetic id fallback: numeric id or arbitrary string that matches
  // an AST node's `id` field directly. Returns state-decl matches only
  // (defensive: a markup node with the same id would not produce a
  // valid reactive-cell atom).
  const direct = findNodeById(fileAST, cellId) as Record<string, unknown> | null;
  if (direct && direct.kind === "state-decl") return direct;
  return null;
}

/**
 * Walk the AST for the FIRST state-decl whose `span.start` matches.
 */
function findStateDeclBySpanStart(
  fileAST: unknown,
  spanStart: number,
): Record<string, unknown> | null {
  const ast = (fileAST as { ast?: { nodes?: unknown[] } })?.ast;
  const rootNodes: unknown[] = Array.isArray(ast?.nodes)
    ? (ast!.nodes as unknown[])
    : Array.isArray((fileAST as { nodes?: unknown[] })?.nodes)
      ? ((fileAST as { nodes: unknown[] }).nodes)
      : [];

  function visit(nodeList: unknown[]): Record<string, unknown> | null {
    for (const raw of nodeList) {
      if (!raw || typeof raw !== "object") continue;
      const n = raw as Record<string, unknown>;
      if (n.kind === "state-decl") {
        const span = n.span as { start?: number } | undefined;
        if (span && span.start === spanStart) return n;
      }
      if (Array.isArray(n.children)) {
        const sub = visit(n.children as unknown[]);
        if (sub) return sub;
      }
      if (Array.isArray(n.body)) {
        const sub = visit(n.body as unknown[]);
        if (sub) return sub;
      }
    }
    return null;
  }

  return visit(rootNodes);
}

/**
 * Compose a single server-fn fetch stub from a server-fn node id.
 *
 * The id is a stable `${filePath}::${span.start}` shape per
 * `emit-functions.ts:fnNodeId` convention. We split the id on `::` to
 * recover the per-file fnNode (which is keyed by its `span.start`).
 *
 * The route metadata (path + method) lives in `ctx.routeMap.functions`,
 * keyed by the same id. We extract `path` + `method` and hand the pair
 * to `emitServerFnStubAtom`.
 *
 * Returns the empty string when the id cannot be resolved to a
 * function-decl + route entry; the caller skips empties (defensive
 * shape — well-formed RS output should always resolve cleanly).
 */
function composeServerFnAtom(fnId: NodeId, ctx: CompileContext): string {
  const route = ctx.routeMap?.functions?.get(String(fnId));
  if (!route || route.boundary !== "server") return "";

  // The fnId encodes the function-decl's span.start in the file. Find
  // the matching fn node by walking the AST.
  const fnNode = findFunctionNodeByFnId(ctx.fileAST, String(fnId));
  if (!fnNode) return "";

  // Route path: explicit route override OR generated route name as
  // path. Mirror `emit-functions.ts` lines 158-160 routing convention.
  const path: string = (route.explicitRoute as string | undefined)
    ?? (route.generatedRouteName ? `/_scrml/${route.generatedRouteName}` : "");
  if (path === "") return "";
  const method: string = (route.explicitMethod as string | undefined) ?? "POST";

  const routeInfo: RouteInfo = { path, method };
  return emitServerFnStubAtom(fnNode, routeInfo, ctx);
}

/**
 * Walk a FileAST and find a `function-decl` node whose `${filePath}::
 * ${span.start}` matches the target fnId.
 *
 * Mirrors `emit-functions.ts` line 151's fnNodeId construction
 * convention — the RouteMap keys by this same shape.
 */
function findFunctionNodeByFnId(
  fileAST: unknown,
  targetFnId: string,
): Record<string, unknown> | null {
  const ast = (fileAST as { ast?: { nodes?: unknown[] }; filePath?: string });
  const filePath = ast?.filePath ?? "";
  if (!filePath) return null;
  const nodes: unknown[] = Array.isArray(ast?.ast?.nodes)
    ? (ast.ast!.nodes as unknown[])
    : Array.isArray((fileAST as { nodes?: unknown[] })?.nodes)
      ? ((fileAST as { nodes: unknown[] }).nodes)
      : [];

  function visit(nodeList: unknown[]): Record<string, unknown> | null {
    for (const raw of nodeList) {
      if (!raw || typeof raw !== "object") continue;
      const n = raw as Record<string, unknown>;
      if (n.kind === "function-decl") {
        const span = n.span as { start?: number } | undefined;
        if (span && typeof span.start === "number") {
          if (`${filePath}::${span.start}` === targetFnId) return n;
        }
      }
      if (Array.isArray(n.children)) {
        const sub = visit(n.children as unknown[]);
        if (sub) return sub;
      }
      if (Array.isArray(n.body)) {
        const sub = visit(n.body as unknown[]);
        if (sub) return sub;
      }
    }
    return null;
  }

  return visit(nodes);
}

/**
 * Extract the source `filePath` segment from an EntryPointId.
 *
 * EntryPointId encodings supported:
 *
 *   Real pipeline (per `reachability/entry-points.ts` `spaEntryId` /
 *   `pageEntryId`):
 *     - `"<filePath>#program"`         — SPA-program entry.
 *     - `"<filePath>#page@<routePath>"` — per-`<page>` entry by route.
 *     - `"<filePath>#page-<index>"`    — per-`<page>` entry by index.
 *
 *   Legacy / synthetic (A-4.1 test fixtures, route-splitter
 *   `routeSegmentFromEntryPointId`):
 *     - `"<filePath>::#program"`         — synthetic SPA-program.
 *     - `"<filePath>::#page::<routePath>"` — synthetic per-`<page>`.
 *
 * Both formats are recognized so A-4.2 chunk emission works whether
 * fed real-pipeline EpIds or synthetic-test EpIds.
 *
 * Order of attempts:
 *   1. `"::"` separator (legacy / synthetic shape).
 *   2. `"#"` separator (real-pipeline shape).
 *   3. Fallback: the whole id (no separator found).
 */
function filePathFromEntryPointId(epId: EntryPointId): string {
  const idStr = String(epId);
  const dblColonIdx = idStr.indexOf("::");
  if (dblColonIdx !== -1) return idStr.substring(0, dblColonIdx);
  const hashIdx = idStr.indexOf("#");
  if (hashIdx !== -1) return idStr.substring(0, hashIdx);
  return idStr;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a single ChunkOutput descriptor for an (EP, role, tier) triple.
 *
 * At A-4.1 the payload is `""` and the hash is `CHUNK_HASH_PLACEHOLDER`.
 * The atom id sets are FRESH copies (so downstream A-4.2 emission can
 * mutate without aliasing the RS record).
 */
function makeChunkOutput(
  entryPointId: EntryPointId,
  role: RoleVariant,
  tier: ChunkTier,
  contents: ChunkContents,
): ChunkOutput {
  const key = makeChunkKey(entryPointId, role, tier);
  const filename = makeChunkFilename(entryPointId, role, tier, CHUNK_HASH_PLACEHOLDER);
  return {
    key,
    entryPointId,
    role,
    tier,
    filename,
    chunkHash: CHUNK_HASH_PLACEHOLDER,
    payloadJs: "",
    componentNodeIds: new Set(contents.componentNodeIds),
    reactiveCellNodeIds: new Set(contents.reactiveCellNodeIds),
    serverFnNodeIds: new Set(contents.serverFnNodeIds),
    vendorUnitNames: new Set(contents.vendorUnitNames),
  };
}

/**
 * Compose the canonical `${EpId}::${Role}::${Tier}` key.
 */
function makeChunkKey(
  entryPointId: EntryPointId,
  role: RoleVariant,
  tier: ChunkTier,
): ChunkKey {
  return `${entryPointId}::${role}::${tier}` as ChunkKey;
}

/**
 * Compose the OQ-A4-C filename: `<route-path>/<RoleVariant>.<tier>.<hash>.js`.
 *
 * The `<route-path>` segment is derived from the EntryPointId. By
 * convention (RS A-2.2 enumeration) the id encodes either the page's
 * routePath (e.g. `"<file>::#page::/dashboard"`) or the file's
 * SPA-program anchor (`"<file>::#program"`). A-4.1 extracts a
 * filesystem-safe route segment from the id; A-4.7 will refine this with
 * the real `RouteMap` cross-reference at HTML emission time.
 *
 * Filesystem-safety rules:
 *   - Leading `/` is stripped (routes like `/dashboard` → `dashboard`).
 *   - SPA-program entries (`shape: "spa-program"`) use the entry file's
 *     basename as the route segment.
 *   - Empty / root routes (`/`) map to the literal `"_root"` segment so
 *     the filename pattern stays well-formed.
 *   - Any characters outside `[A-Za-z0-9/_-]` are replaced with `_`
 *     (defense-in-depth; well-formed routes don't trigger this).
 */
function makeChunkFilename(
  entryPointId: EntryPointId,
  role: RoleVariant,
  tier: ChunkTier,
  hash: string,
): string {
  const routeSegment = routeSegmentFromEntryPointId(entryPointId);
  return `${routeSegment}/${role}.${tier}.${hash}.js`;
}

/**
 * Extract a filesystem-safe route segment from an EntryPointId.
 *
 * EntryPointId shape (per `reachability/entry-points.ts`):
 *   - `"<absolute-file-path>::#page::<routePath>"` for `<page>` entries.
 *   - `"<absolute-file-path>::#program"` for SPA-program entries.
 *
 * The function partitions on the `::` separator and uses the trailing
 * segment for routing. A-4.7 may refine this once the full RouteMap is
 * threaded through (the current shape suffices for filename derivation).
 */
function routeSegmentFromEntryPointId(epId: EntryPointId): string {
  const idStr = String(epId);
  // Find the LAST `::` group — typical shape ends with `::#program` or
  // `::#page::<routePath>`.
  const pageMarker = "::#page::";
  const programMarker = "::#program";

  let raw: string;
  const pageIdx = idStr.lastIndexOf(pageMarker);
  if (pageIdx !== -1) {
    raw = idStr.substring(pageIdx + pageMarker.length);
  } else if (idStr.endsWith(programMarker)) {
    // SPA-program: use the file's basename (without `.scrml`) as the segment.
    const filePart = idStr.substring(0, idStr.length - programMarker.length);
    raw = basenameOfFile(filePart);
  } else {
    // Fallback: use the whole id, sanitized. Degenerate path — covers
    // synthesized ids in test fixtures that don't match either marker.
    raw = idStr;
  }

  // Strip leading slashes; map empty / "/" to "_root".
  let cleaned = raw.replace(/^\/+/, "");
  if (cleaned === "" || cleaned === "/") {
    cleaned = "_root";
  }
  // Sanitize: keep [A-Za-z0-9/_-], replace anything else with `_`.
  cleaned = cleaned.replace(/[^A-Za-z0-9/_-]/g, "_");
  return cleaned;
}

/**
 * Basename of a file path, stripping `.scrml` if present.
 *
 * Independent of `node:path` to keep this module pure-ts and trivially
 * portable to the eventual self-host scrml rewrite.
 */
function basenameOfFile(filePath: string): string {
  const slashIdx = filePath.lastIndexOf("/");
  const tail = slashIdx === -1 ? filePath : filePath.substring(slashIdx + 1);
  if (tail.endsWith(".scrml")) {
    return tail.substring(0, tail.length - ".scrml".length);
  }
  return tail;
}

// ---------------------------------------------------------------------------
// Manifest serialization
// ---------------------------------------------------------------------------

/**
 * Serialize a ChunksManifest to canonical JSON.
 *
 * Per §40.9.8 the output is deterministic: identical input produces
 * identical bytes. `JSON.stringify` with a 2-space indent suffices —
 * the Map iteration upstream is already in canonical (insertion) order
 * and `Record<>` field insertion order is preserved by ES2015+ engines.
 *
 * Exported so api.js can call it to write `chunks.json` post-codegen
 * without re-implementing the contract.
 */
export function serializeChunksManifest(manifest: ChunksManifest): string {
  return JSON.stringify(manifest, null, 2) + "\n";
}

// Re-export the ANONYMOUS_ROLE constant for test convenience without
// requiring direct imports of `reachability/component-4.ts`. Kept private
// inside this module to avoid creating a parallel canonical declaration.
export { ANONYMOUS_ROLE };
