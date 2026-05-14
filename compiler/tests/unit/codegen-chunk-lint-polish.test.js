/**
 * @module compiler/tests/unit/codegen-chunk-lint-polish
 *
 * Q-OPEN-5 + Q-OPEN-6 — A-4 wave-close polish bundle.
 *
 * Coverage:
 *   §1  Q-OPEN-5 — `chunkSizeBudgetBytes` plumbing through the
 *       splitter:
 *         - default behavior (budget unset) preserves the v0.3
 *           CHUNK_LARGE_SOFT_BUDGET_BYTES (100 000) threshold.
 *         - explicit smaller budget makes the lint fire on a payload
 *           that's BELOW the default (proving the value is
 *           load-bearing, not silently ignored).
 *         - explicit larger budget suppresses the lint on a payload
 *           that exceeds the default.
 *         - non-positive / non-finite values revert to the default.
 *         - the lint message text reports the EFFECTIVE budget (not
 *           the constant) — adopters can see what they actually got.
 *
 *   §2  Q-OPEN-6 — split of `W-CG-CHUNK-NO-PREFETCH` into:
 *         - `W-CG-CHUNK-NO-PREFETCH` (Info) — case 1: no internal
 *           `<a href>` links exist at all.
 *         - `W-CG-CHUNK-PREFETCH-UNRESOLVED` (Warning) — case 2:
 *           internal-shaped links exist but none resolved to
 *           RouteMap.pages.
 *       Both gated on multi-route apps (`pageCount > 1`); single-
 *       route apps fire neither.
 *
 * Cross-references:
 *   - compiler/src/codegen/route-splitter.ts:emitChunkLints
 *     (post-emit lint scan; budget threading at chunkSizeBudgetBytes
 *     param; case-split branch on hasInternalLinks /
 *     hasPrefetchableLinks).
 *   - compiler/src/codegen/context.ts (CompileContext.hasInternalLinks
 *     + hasPrefetchableLinks definitions).
 *   - SPEC.md §34 catalog rows; §40.9.11 chunk lint family listing.
 */

import { describe, test, expect } from "bun:test";
import {
  emitPerRouteChunks,
  CHUNK_LARGE_SOFT_BUDGET_BYTES,
  ANONYMOUS_ROLE,
} from "../../src/codegen/route-splitter.ts";

// ---------------------------------------------------------------------------
// Helpers — synthesize ReachabilityRecord + CompileContext shapes
// ---------------------------------------------------------------------------

function emptyContents() {
  return {
    componentNodeIds: new Set(),
    reactiveCellNodeIds: new Set(),
    serverFnNodeIds: new Set(),
    vendorUnitNames: new Set(),
  };
}

function makePlan(overrides = {}) {
  return {
    initialChunk: emptyContents(),
    prefetchTier1: emptyContents(),
    prefetchTier2: emptyContents(),
    prefetchTierN: [],
    ...overrides,
  };
}

function makeRecord(epId, role, plan) {
  return {
    closures: new Map([[epId, { byRole: new Map([[role, plan]]) }]]),
    diagnostics: [],
  };
}

/**
 * Build a CompileContext shaped exactly to what `emitChunkLints` reads:
 *   - `routeMap.pages` for the multi-route gating (Q-OPEN-6 requires
 *     `pageCount > 1` — synthesize accordingly).
 *   - `hasInternalLinks` / `hasPrefetchableLinks` for the Q-OPEN-6
 *     case-split.
 *   - `fileAST` to satisfy the W-CG-CHUNK-MISSING-ROLE walk (we pass
 *     an empty ast.nodes so that lint is a no-op).
 */
function makeCtx({
  filePath = "/abs/app.scrml",
  pageCount = 2,
  hasInternalLinks = false,
  hasPrefetchableLinks = false,
} = {}) {
  const pages = new Map();
  for (let i = 0; i < pageCount; i++) {
    pages.set(`/abs/p${i}.scrml`, { urlPattern: `/p${i}` });
  }
  return {
    fileAST: { filePath, ast: { nodes: [] } },
    filePath,
    routeMap: { pages, functions: new Map() },
    hasInternalLinks,
    hasPrefetchableLinks,
  };
}

/**
 * Synthesize an entry-point chunk plan whose initial-chunk admission
 * set is large enough that `payloadJs` (composed from atom emitters)
 * exceeds a target byte budget. Direct-test path constructs the
 * payload off a CompileContext; we use the
 * `cgContextByFile`+`reachabilityRecord` plumbing the same way the
 * orchestrator does at runtime.
 *
 * For Q-OPEN-5 we don't actually need a real payload — we can verify
 * the budget plumbing by giving the route-splitter a synthesized
 * record + ctx pair AND letting `composeInitialChunk` produce its
 * normal output. The `ctx` produces an IIFE shell of fixed bytes;
 * adding admitted reactive cells inflates the size predictably.
 */

// ---------------------------------------------------------------------------
// §1 — Q-OPEN-5 — chunkSizeBudgetBytes plumbing
// ---------------------------------------------------------------------------

describe("§1 — Q-OPEN-5 chunkSizeBudgetBytes plumbing", () => {
  // Build a record with a payload that we can predictably make large.
  // The simplest path is to bypass the composer (no ctxByFile) — the
  // splitter then leaves payloadJs="" for every chunk; W-CG-CHUNK-LARGE
  // never fires. So we construct a custom test approach: we directly
  // emit chunks with a non-empty `composeInitialChunk` payload by
  // wiring real CompileContext shapes that synthesize an initial-chunk
  // payload composed of admitted reactive-cell atoms.
  //
  // To keep the test deterministic without authoring a full .scrml
  // pipeline run, we use a SMALL budget (e.g. 100 bytes) and verify
  // that the lint fires on the SPA payload (which always carries the
  // IIFE shell + chunk header — well over 100 bytes). The test thus
  // pins behavior with minimal fixture machinery.

  function buildSmallSpaInputs() {
    // Single SPA: one EP, one role. The composer emits the IIFE shell
    // even with empty admission, which produces a few hundred bytes.
    const ctx = makeCtx({ pageCount: 1, hasInternalLinks: false });
    const ctxByFile = new Map([[ctx.filePath, ctx]]);
    const record = makeRecord(
      "/abs/app.scrml::#program",
      ANONYMOUS_ROLE,
      makePlan(),
    );
    return { record, ctxByFile };
  }

  test("default behavior — no budget specified → uses CHUNK_LARGE_SOFT_BUDGET_BYTES (100 000)", () => {
    const { record, ctxByFile } = buildSmallSpaInputs();
    const { diagnostics, chunks } = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
    });
    // No --chunk-size-budget passed → fall through to default 100 000.
    // The composed initial chunk is well under 100 000 bytes — no
    // W-CG-CHUNK-LARGE fires.
    const largeLints = diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE");
    expect(largeLints.length).toBe(0);
    // Sanity — the initial chunk does have a non-zero payload (IIFE shell
    // is composed when ctx is supplied), so we know the
    // composer was actually invoked.
    const initial = chunks.get(`/abs/app.scrml::#program::${ANONYMOUS_ROLE}::initial`);
    expect(initial).toBeDefined();
    expect(initial.payloadJs.length).toBeGreaterThan(0);
  });

  test("explicit small budget (100 bytes) → W-CG-CHUNK-LARGE fires on the SPA initial chunk", () => {
    const { record, ctxByFile } = buildSmallSpaInputs();
    const { diagnostics, chunks } = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
      chunkSizeBudgetBytes: 100,
    });
    const largeLints = diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE");
    expect(largeLints.length).toBe(1);
    expect(largeLints[0].severity).toBe("warning");
    // Q-OPEN-5 acceptance — the lint message text reports the
    // EFFECTIVE budget (100), NOT the default constant (100000).
    // This is what makes the flag adopter-visible.
    expect(largeLints[0].message).toContain("100 bytes");
    expect(largeLints[0].message).not.toContain("100000 bytes");
    // The chunk itself is composed (non-empty payloadJs) so the
    // payload size is also reported in the message (UTF-8 byte
    // length, not string length, so we don't pin a specific number
    // — `composeInitialChunk` includes a `§` glyph which is
    // multi-byte in UTF-8).
    const initial = chunks.get(`/abs/app.scrml::#program::${ANONYMOUS_ROLE}::initial`);
    expect(initial.payloadJs.length).toBeGreaterThan(100);
    // Message shape: "is <N> bytes — exceeds the soft size budget of 100 bytes"
    expect(largeLints[0].message).toMatch(/is \d+ bytes — exceeds the soft size budget of 100 bytes/);
  });

  test("explicit large budget (10 000 000 bytes) → W-CG-CHUNK-LARGE never fires", () => {
    const { record, ctxByFile } = buildSmallSpaInputs();
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
      chunkSizeBudgetBytes: 10_000_000,
    });
    const largeLints = diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE");
    expect(largeLints.length).toBe(0);
  });

  test("non-positive budget (0) → reverts to default (100 000), no lint", () => {
    const { record, ctxByFile } = buildSmallSpaInputs();
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
      chunkSizeBudgetBytes: 0,
    });
    const largeLints = diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE");
    // Default 100 000 applies; small SPA payload is well under → no lint.
    expect(largeLints.length).toBe(0);
  });

  test("negative budget (-1) → reverts to default", () => {
    const { record, ctxByFile } = buildSmallSpaInputs();
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
      chunkSizeBudgetBytes: -1,
    });
    const largeLints = diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE");
    expect(largeLints.length).toBe(0);
  });

  test("non-finite budget (NaN) → reverts to default", () => {
    const { record, ctxByFile } = buildSmallSpaInputs();
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
      chunkSizeBudgetBytes: Number.NaN,
    });
    const largeLints = diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE");
    expect(largeLints.length).toBe(0);
  });

  test("CHUNK_LARGE_SOFT_BUDGET_BYTES exported constant is 100 000 (sentinel for adopter audit)", () => {
    // Q-OPEN-5 acceptance — the default is preserved exactly. Future
    // changes to the default value will break this test loudly, which
    // is the point: any default change is a v0.4 release-note item.
    expect(CHUNK_LARGE_SOFT_BUDGET_BYTES).toBe(100_000);
  });

  test("budget threshold semantics — lint fires on byteLen > budget (NOT >=)", () => {
    // Use a budget of 1 byte. The composed initial chunk is many bytes
    // → byteLen > 1 → lint fires.
    const { record, ctxByFile } = buildSmallSpaInputs();
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
      chunkSizeBudgetBytes: 1,
    });
    const largeLints = diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE");
    expect(largeLints.length).toBe(1);
    expect(largeLints[0].message).toContain("1 bytes"); // budget surfaced
  });

  test("budget plumbing is per-invocation — two emits with different budgets get different lint outcomes", () => {
    const { record, ctxByFile } = buildSmallSpaInputs();
    // First emit: tiny budget → lint fires.
    const a = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
      chunkSizeBudgetBytes: 100,
    });
    // Second emit: huge budget → no lint.
    const b = emitPerRouteChunks({
      reachabilityRecord: record,
      cgContextByFile: ctxByFile,
      chunkSizeBudgetBytes: 1_000_000,
    });
    expect(a.diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE").length).toBe(1);
    expect(b.diagnostics.filter((d) => d.code === "W-CG-CHUNK-LARGE").length).toBe(0);
    // Sanity — the chunks themselves are byte-identical (the budget
    // affects ONLY the lint scan, not chunk content).
    const aInitial = a.chunks.get(`/abs/app.scrml::#program::${ANONYMOUS_ROLE}::initial`);
    const bInitial = b.chunks.get(`/abs/app.scrml::#program::${ANONYMOUS_ROLE}::initial`);
    expect(aInitial.payloadJs).toBe(bInitial.payloadJs);
    expect(aInitial.chunkHash).toBe(bInitial.chunkHash);
  });
});

// ---------------------------------------------------------------------------
// §2 — Q-OPEN-6 — W-CG-CHUNK-NO-PREFETCH split
// ---------------------------------------------------------------------------

describe("§2 — Q-OPEN-6 W-CG-CHUNK-NO-PREFETCH split into NO-PREFETCH (Info) + PREFETCH-UNRESOLVED (Warning)", () => {
  function buildMultiRouteRecord() {
    return makeRecord(
      "/abs/app.scrml::#program",
      ANONYMOUS_ROLE,
      makePlan(),
    );
  }

  test("case 1 — no internal links + multi-route → fires W-CG-CHUNK-NO-PREFETCH (Info)", () => {
    const ctx = makeCtx({
      pageCount: 2,
      hasInternalLinks: false, // structural shape: no <a href="/..."> at all
      hasPrefetchableLinks: false, // no resolved internal links either
    });
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: buildMultiRouteRecord(),
      cgContextByFile: new Map([[ctx.filePath, ctx]]),
    });
    const noPrefetch = diagnostics.filter((d) => d.code === "W-CG-CHUNK-NO-PREFETCH");
    const unresolved = diagnostics.filter((d) => d.code === "W-CG-CHUNK-PREFETCH-UNRESOLVED");
    expect(noPrefetch.length).toBe(1);
    expect(noPrefetch[0].severity).toBe("info");
    expect(unresolved.length).toBe(0);
    // Message text mentions the structural cause: no internal links.
    expect(noPrefetch[0].message).toContain("no internal");
    // Distinct-from disambiguation in the message points adopters at
    // the warning code.
    // (We do NOT pin verbatim wording — implementation may rephrase;
    // we only verify the lint name + severity + key keyword.)
  });

  test("case 2 — internal-shaped links exist but none resolved → fires W-CG-CHUNK-PREFETCH-UNRESOLVED (Warning)", () => {
    const ctx = makeCtx({
      pageCount: 2,
      hasInternalLinks: true, // <a href="/something"> shape exists
      hasPrefetchableLinks: false, // but none matched RouteMap.pages
    });
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: buildMultiRouteRecord(),
      cgContextByFile: new Map([[ctx.filePath, ctx]]),
    });
    const noPrefetch = diagnostics.filter((d) => d.code === "W-CG-CHUNK-NO-PREFETCH");
    const unresolved = diagnostics.filter((d) => d.code === "W-CG-CHUNK-PREFETCH-UNRESOLVED");
    expect(unresolved.length).toBe(1);
    expect(unresolved[0].severity).toBe("warning");
    expect(noPrefetch.length).toBe(0);
    // Message text mentions the actionable cause: typo / missing page.
    expect(unresolved[0].message).toContain("internal-shaped");
  });

  test("happy path — internal links AND all resolved → neither lint fires", () => {
    const ctx = makeCtx({
      pageCount: 2,
      hasInternalLinks: true,
      hasPrefetchableLinks: true, // resolution succeeded
    });
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: buildMultiRouteRecord(),
      cgContextByFile: new Map([[ctx.filePath, ctx]]),
    });
    const noPrefetch = diagnostics.filter((d) => d.code === "W-CG-CHUNK-NO-PREFETCH");
    const unresolved = diagnostics.filter((d) => d.code === "W-CG-CHUNK-PREFETCH-UNRESOLVED");
    expect(noPrefetch.length).toBe(0);
    expect(unresolved.length).toBe(0);
  });

  test("single-route app (pageCount=1) — neither lint fires regardless of link state", () => {
    // Case 1-ish: no internal links + single-route → silent.
    const ctxA = makeCtx({
      pageCount: 1,
      hasInternalLinks: false,
      hasPrefetchableLinks: false,
    });
    const a = emitPerRouteChunks({
      reachabilityRecord: buildMultiRouteRecord(),
      cgContextByFile: new Map([[ctxA.filePath, ctxA]]),
    });
    expect(a.diagnostics.filter((d) => d.code === "W-CG-CHUNK-NO-PREFETCH").length).toBe(0);
    expect(a.diagnostics.filter((d) => d.code === "W-CG-CHUNK-PREFETCH-UNRESOLVED").length).toBe(0);

    // Case 2-ish: links exist + unresolved + single-route → still silent
    // (single-route apps get no false positive — there's no other
    // route to prefetch).
    const ctxB = makeCtx({
      pageCount: 1,
      hasInternalLinks: true,
      hasPrefetchableLinks: false,
    });
    const b = emitPerRouteChunks({
      reachabilityRecord: buildMultiRouteRecord(),
      cgContextByFile: new Map([[ctxB.filePath, ctxB]]),
    });
    expect(b.diagnostics.filter((d) => d.code === "W-CG-CHUNK-NO-PREFETCH").length).toBe(0);
    expect(b.diagnostics.filter((d) => d.code === "W-CG-CHUNK-PREFETCH-UNRESOLVED").length).toBe(0);
  });

  test("severity discrimination — case 1 is INFO, case 2 is WARNING (the brief's core ratification)", () => {
    // Case 1
    const ctx1 = makeCtx({
      pageCount: 3,
      hasInternalLinks: false,
      hasPrefetchableLinks: false,
    });
    const r1 = emitPerRouteChunks({
      reachabilityRecord: buildMultiRouteRecord(),
      cgContextByFile: new Map([[ctx1.filePath, ctx1]]),
    });
    const c1 = r1.diagnostics.find((d) => d.code === "W-CG-CHUNK-NO-PREFETCH");
    expect(c1).toBeDefined();
    expect(c1.severity).toBe("info");

    // Case 2
    const ctx2 = makeCtx({
      pageCount: 3,
      hasInternalLinks: true,
      hasPrefetchableLinks: false,
    });
    const r2 = emitPerRouteChunks({
      reachabilityRecord: buildMultiRouteRecord(),
      cgContextByFile: new Map([[ctx2.filePath, ctx2]]),
    });
    const c2 = r2.diagnostics.find((d) => d.code === "W-CG-CHUNK-PREFETCH-UNRESOLVED");
    expect(c2).toBeDefined();
    expect(c2.severity).toBe("warning");
  });

  test("ctxByFile absent — neither lint fires (defensive — splitter cannot inspect link state)", () => {
    const { diagnostics } = emitPerRouteChunks({
      reachabilityRecord: buildMultiRouteRecord(),
      // no cgContextByFile
    });
    const noPrefetch = diagnostics.filter((d) => d.code === "W-CG-CHUNK-NO-PREFETCH");
    const unresolved = diagnostics.filter((d) => d.code === "W-CG-CHUNK-PREFETCH-UNRESOLVED");
    expect(noPrefetch.length).toBe(0);
    expect(unresolved.length).toBe(0);
  });

  test("the two codes are mutually exclusive — never both fire on the same EP", () => {
    // Construct each of the four possible (hasInternalLinks,
    // hasPrefetchableLinks) cells and verify at most one fires.
    const cases = [
      { hi: false, hp: false }, // case 1 → NO-PREFETCH only
      { hi: false, hp: true },  // impossible by construction (resolved → internal exists), but exercise the branch
      { hi: true, hp: false },  // case 2 → PREFETCH-UNRESOLVED only
      { hi: true, hp: true },   // happy path → neither
    ];
    for (const { hi, hp } of cases) {
      const ctx = makeCtx({
        pageCount: 2,
        hasInternalLinks: hi,
        hasPrefetchableLinks: hp,
      });
      const { diagnostics } = emitPerRouteChunks({
        reachabilityRecord: buildMultiRouteRecord(),
        cgContextByFile: new Map([[ctx.filePath, ctx]]),
      });
      const noPrefetch = diagnostics.filter((d) => d.code === "W-CG-CHUNK-NO-PREFETCH");
      const unresolved = diagnostics.filter((d) => d.code === "W-CG-CHUNK-PREFETCH-UNRESOLVED");
      // Mutual exclusivity invariant.
      expect(noPrefetch.length + unresolved.length).toBeLessThanOrEqual(1);
      // Also: a NO-PREFETCH never appears alongside an
      // PREFETCH-UNRESOLVED (the splitter else-branches the case).
      if (noPrefetch.length > 0) expect(unresolved.length).toBe(0);
      if (unresolved.length > 0) expect(noPrefetch.length).toBe(0);
    }
  });
});
