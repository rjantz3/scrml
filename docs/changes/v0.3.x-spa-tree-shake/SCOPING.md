# SCOPING — v0.3.x SPA tree-shake of Approach-A runtime additions

**Date:** 2026-05-15
**HEAD measured:** `de84260` (post-`v0.3.0` STABLE cut)
**Baseline measured:** `v0.2.6` (last pre-Approach-A semver)
**Status:** Phase A complete — measurements + classification + Phase B plan.
**Constraint upheld:** no compiler source modified; main worktree HEAD unchanged.

---

## TL;DR

The TodoMVC bundle regression (v0.2.6 → v0.3.0 STABLE) measured against the **same `app.scrml` source** is **+4,306 bytes gzip** total. **97.6% of those bytes (+4,243 B) sit in `scrml-runtime.js`**, NOT in the per-file `app.client.js`. The remaining +63 B in the per-file slice is codegen-quality churn (renumbered IDs, idiom shifts), not new always-emit Approach-A code.

The root cause is **not a mis-firing tree-shake gate**. It is structural:

> The shared-runtime path (`scrml-runtime.js`, the default when `embedRuntime: false`) bypasses tree-shaking entirely. `compiler/src/codegen/index.ts:895` reads:
>
> ```ts
> const runtimeJs = embedRuntime ? null : SCRML_RUNTIME;
> ```
>
> In embed mode, `generateClientJs` calls `assembleRuntime(ctx.usedRuntimeChunks)` and the gates work as designed. In shared mode (the default), the full `SCRML_RUNTIME` ships unconditionally regardless of `usedRuntimeChunks`.

This means **the prefetch, mount, and vendor-ref chunks ship in `scrml-runtime.js` even when the compile unit will never reference them** — including for every SPA-shape compile unit. The §57 wire-decode helper (`_scrml_wire_decode`, 767 B raw, ~330 B gzip) lives in the always-included `core` chunk; it is the only Approach-A addition that sits outside a tree-shakeable chunk.

The SPA shape detector ratified S86 at `ast-builder.js:10979-11049` produces a `W-PROGRAM-SPA-INFERRED` lint but **does not propagate the inference into the codegen context**. There is no `isSpaInferred` field on `CompileContext`; codegen has no signal to act on. Phase B will need to add it.

**Estimated Phase B recovery for the TodoMVC bundle:** **−3,184 to −3,514 B gzip (74-83% of the regression)**, conditioned on tree-shaking the shared `scrml-runtime.js` for any compile unit whose union of `usedRuntimeChunks` excludes the targeted chunks (which is the natural Phase B target — `embedRuntime: false` should benefit from the same gates as `embedRuntime: true`).

**Important surprise:** the SPA-inferred predicate is NOT the load-bearing gate for the TodoMVC regression. TodoMVC's `app.scrml` has no `<program>` element at all (it pre-dates §40.8's bare-state extension and uses a top-level `<div class="todoapp">`). The W-PROGRAM-SPA-INFERRED predicate would not fire on it. The genuine gate for **any** single-page-shaped compile unit is "union of per-file `usedRuntimeChunks` across the compile unit excludes the targeted chunks" — which is the natural state for every SPA, every page-less file, and every pre-§40.8 file. SPA-shape inference is one *instance* of this broader condition.

---

## 1. Measurements — byte-by-byte

### 1.1 Methodology

- Two `git worktree` checkouts at `/tmp/scrml-bench/v026` (tag `v0.2.6`) and `/tmp/scrml-bench/v030` (tag `v0.3.0`).
- Compile path: `bun run compiler/src/index.js benchmarks/todomvc/app.scrml --output <out> --convert-legacy-css`. This is the exact build invocation in `benchmarks/todomvc/index.html`'s rebuild comment.
- To isolate the Approach-A delta from app-source evolution, I copied v0.3.0's `app.scrml` into the v0.2.6 worktree and re-compiled there. This gives same-source-different-compiler measurements. (v0.3.0's `app.scrml` adds an Edit-mode feature absent in v0.2.6's source per `docs/changes/todomvc-edit-mode-landing/`; that source delta alone explains most of the per-file client.js variance.)
- gzip via `Bun.gzipSync` (matches `benchmarks/RESULTS.md` methodology since 2026-05-14).

### 1.2 Same-source TodoMVC bundle, v0.2.6 → v0.3.0

| Artifact | v0.2.6 raw | v0.3.0 raw | Δ raw | v0.2.6 gzip | v0.3.0 gzip | Δ gzip |
|---|---:|---:|---:|---:|---:|---:|
| `app.client.js` | 10,203 | 10,764 | +561 | **2,078** | **2,141** | **+63** |
| `scrml-runtime.js` | 122,273 | 134,653 | +12,380 | **34,437** | **38,680** | **+4,243** |
| **TOTAL** | 132,476 | 145,417 | +12,941 | **36,515** | **40,821** | **+4,306** |

**The full +4,243 B (97.6%) of the gzipped regression sits in `scrml-runtime.js`.**

### 1.3 Sanity check — embed mode for the same source

The embed-mode path (`--embed-runtime`) IS subject to tree-shaking. Same-source TodoMVC:

| Artifact | v0.2.6 gzip | v0.3.0 gzip | Δ gzip |
|---|---:|---:|---:|
| `app.client.js` (embed) | **14,917** | **14,104** | **−813** |

In embed mode, the v0.3.0 bundle is **smaller** than v0.2.6 by 813 B. The gates **eliminated more than the new code added** for TodoMVC. This is the load-bearing evidence that the gates work — they're just not consulted in shared-runtime mode.

For the SPA counter (`examples/02-counter.scrml`) in embed mode:

| Artifact | v0.2.6 gzip | v0.3.0 gzip | Δ gzip |
|---|---:|---:|---:|
| `02-counter.client.js` (embed) | 12,840 | 13,825 | +985 |

The +985 B for the SPA counter in embed mode is the residual ceiling. It breaks down to:
- `_scrml_wire_decode` (core chunk, no gate) → unavoidable today
- `_scrml_chunk_mount` (mount chunk, gate fires positively) → SPA-shape false positive
- ~150-300 B in misc codegen and core-chunk additions

### 1.4 Per-block contribution to v0.3.0 runtime gzip

Each Approach-A block excised from `/tmp/scrml-bench/todo-v030/scrml-runtime.js` (in-context gzip delta, not isolated):

| Block | Source location | Lines (v0.3.0 rt) | Raw bytes | Gzip Δ if excised |
|---|---|---:|---:|---:|
| `_scrml_wire_decode` (§57 dual-decoder) | `runtime-template.js:101` | L13-27 | 767 | **−330** |
| Prefetch chunk (`tier1` + `tier2` + `fetch_chunk` + `_SCRML_CHUNKS`) | `runtime-template.js:1273-1340` | L1553-1689 | 6,104 | **−2,064** |
| Mount chunk (`_scrml_chunk_mount` + `_SCRML_MOUNTS`) | `runtime-template.js:1347-1372` | L1690-1722 | 1,620 | **−479** |
| Vendor-ref chunk (`_scrml_vendor_require` + `_SCRML_VENDOR_REFS`) | `runtime-template.js:1381-1404` | L1723-1753 | 1,494 | **−445** |
| All three conditional chunks combined | — | L1553-1753 | 9,218 | **−3,184** |

The remaining +12,380 − 9,218 = **+3,162 raw bytes** (~+1,059 B gzip) are scattered tweaks across other chunks (per-handler context arguments, S90 W-CG-UNDEFINED-INTERPOLATION guards, deep-reactive enhancements, etc.) — NOT Approach-A landing footprint. They will not be Phase B targets.

---

## 2. Per-source classification

### 2.1 `_scrml_wire_decode` (§57 dual-decoder)

- **Source:** `compiler/src/runtime-template.js:101-105`
- **Chunk:** `core` (no boundary marker; explicitly documented at runtime-template.js:97-100 as "lives in the `core` chunk so every server-fn fetch stub that compiles can reference `_scrml_wire_decode` without needing a runtime-chunk inclusion vote.")
- **Current gate:** **none** — always shipped.
- **Bytes:** raw 767 / gzip ~330 (in-context).
- **Classification:** **NOT-YET-SHAKEN.** Justified by the original §57 ratification (helper is small, every server-fn caller needs it). For SPA shape (and any shape with zero server-fns), the helper is dead code.
- **Phase B fit:** **YES, high-value.** When the compile unit has zero server-fns and zero `use foreign:` sidecar imports, the dual-decoder is unreachable.

### 2.2 Prefetch chunk (tier1 + tier2 + fetch_chunk)

- **Source:** `compiler/src/runtime-template.js:1273-1340` (the chunk runs from `// §40.9.7 tier-1 idle prefetch runtime (chunk: 'prefetch')` to the next chunk boundary at `// §40.9.7 chunk mount registry`)
- **Chunk:** `prefetch` (boundary marker at `runtime-chunks.ts:171`)
- **Current gate:** `detectRuntimeChunks` at `emit-client.ts:147-168` admits `prefetch` when:
  - `chunkContentsNonEmpty(plan.prefetchTier1)` for ANY (EP, role) in this file's reachability record, OR
  - `chunkContentsNonEmpty(plan.prefetchTierN[i])` for any i (never fires in v0.3 per OQ-A2-B Option a), OR
  - `ctx.hasPrefetchableLinks === true` (set by emit-html when an internal `<a href="/path">` resolves to a known route).
- **Bytes:** raw 6,104 / gzip ~2,064 (in-context). **Largest single Approach-A regression source.**
- **Classification:** **ALREADY-SHAKEN in embed mode** (gate fires negative for SPA: no `<a href>` to internal route, prefetchTier1 empty for single-EP single-role). **NOT-SHAKEN in shared mode** because the entire `SCRML_RUNTIME` ships verbatim regardless of `usedRuntimeChunks`.
- **Phase B fit:** **YES, highest-value.** Recovery is mechanical once the shared-runtime path consults `usedRuntimeChunks`.

### 2.3 Mount chunk (`_scrml_chunk_mount` + `_SCRML_MOUNTS`)

- **Source:** `compiler/src/runtime-template.js:1347-1372`
- **Chunk:** `mount` (boundary marker at `runtime-chunks.ts:176`)
- **Current gate:** `detectRuntimeChunks` at `emit-client.ts:172-179` admits `mount` when ANY chunk (initial, tier1, tier2, tierN) in any (EP, role) has `componentNodeIds.size > 0`. For an SPA, the initial chunk admits the entire markup tree — the gate fires positively even though `_scrml_chunk_mount` is only meaningful when MULTIPLE chunks load asynchronously (it records hydrated component ids for adopter-debug; with one chunk there is nothing to coordinate).
- **Bytes:** raw 1,620 / gzip ~479 (in-context).
- **Classification:** **PARTIALLY-SHAKEN** — gate fires for any shape with admitted markup, which includes every SPA. Predicate too coarse. **Also NOT-SHAKEN in shared mode** for the same reason as prefetch.
- **Phase B fit:** **YES.** Two layers of recovery: (i) consult `usedRuntimeChunks` in shared mode, (ii) tighten the gate so it only fires when the compile unit has >1 entry-point chunk (i.e., a real per-(EP, role) split is in play). For SPA-shape the gate should be off because there is only one entry-point chunk and atom-emitter need not emit `_scrml_chunk_mount` calls into it.

### 2.4 Vendor-ref chunk (`_scrml_vendor_require` + `_SCRML_VENDOR_REFS`)

- **Source:** `compiler/src/runtime-template.js:1381-1404`
- **Chunk:** `vendor-ref` (boundary marker at `runtime-chunks.ts:181`)
- **Current gate:** `detectRuntimeChunks` at `emit-client.ts:183-190` admits `vendor-ref` when ANY chunk has `vendorUnitNames.size > 0`. TodoMVC has zero vendor units → the gate fires negative in embed mode (verified by inspecting the embed-mode bundle — no `_scrml_vendor_require` present).
- **Bytes:** raw 1,494 / gzip ~445 (in-context).
- **Classification:** **ALREADY-SHAKEN in embed mode** for TodoMVC and every vendor-unit-less compile unit. **NOT-SHAKEN in shared mode** for the same reason as prefetch.
- **Phase B fit:** **YES.** Pure shared-runtime fix; the gate predicate is already correct.

### 2.5 Why TodoMVC's embed bundle is SMALLER than v0.2.6's

Same-source embed measurements (§1.3) show v0.3.0 is **−813 B gzip** vs v0.2.6 for TodoMVC. This is not a bug; it's evidence:

- v0.3.0's TodoMVC reachability record is **empty** (`/tmp/scrml-bench/todo-v030-reach/app.reachability.json` has `closures: {}`). `app.scrml` has no `<program>` element — it pre-dates §40.8's bare-state-in-program extension and uses a top-level `<div class="todoapp">`. The reachability solver finds no entry-points.
- Empty reachability → **none** of the `mount` / `vendor-ref` / `prefetch` gates fire → all three new chunks elided.
- v0.3.0 also tightened gates on legacy chunks (e.g. `engine`, `messages`) that v0.2.6 may have admitted conservatively. The net is **−813 B**.

This is the clean confirmation that the gates ARE correct for the actual TodoMVC content. The shared-runtime path is the only thing preventing them from doing their job.

---

## 3. Phase B gate-tightening plan

### 3.1 Primary fix — consult `usedRuntimeChunks` in shared-runtime path

**Surface:** `compiler/src/codegen/index.ts:895`.

Today: `const runtimeJs = embedRuntime ? null : SCRML_RUNTIME;`

Phase B target: in the non-embed branch, assemble the runtime from the **union** of `usedRuntimeChunks` across every file in the compile unit (currently held in `cgContextByFile`, `compiler/src/codegen/index.ts:885`). Each per-file `CompileContext.usedRuntimeChunks` is a `Set<RuntimeChunkName>`; the shared-runtime file ships their union.

Implementation sketch:

```ts
// Phase B replacement (compiler/src/codegen/index.ts:895):
let runtimeJs: string | null = null;
if (!embedRuntime) {
  // Union usedRuntimeChunks across every compiled file in this run.
  const union = new Set<RuntimeChunkName>();
  for (const ctx of cgContextByFile.values()) {
    for (const name of ctx.usedRuntimeChunks) union.add(name);
  }
  // Always include the per-spec always-included set so files that
  // skipped CG (library mode, no markup) still produce a runnable runtime.
  union.add('core'); union.add('scope'); union.add('errors'); union.add('transitions');
  runtimeJs = assembleRuntime(union);
}
```

**Estimated lines touched:** 10-15 in `codegen/index.ts`. No new ctx fields needed. No spec change.

**Estimated TodoMVC recovery (gzip):**
- Embed-mode TodoMVC bundle = 14,104 B gzip; the shared-runtime alternative would assemble exactly the same set of chunks → similar size.
- Versus the current 40,821 B gzip TodoMVC shared-mode bundle, expected post-fix size ~14,400 B gzip — **a 26.4 KB recovery on TodoMVC**, far exceeding the 4.3 KB Approach-A regression.

The reason for the larger recovery: even before Approach A, the shared `scrml-runtime.js` always shipped chunks (`engine`, `messages`, `meta`, `equality`, `deep_reactive`, etc.) that the per-file `usedRuntimeChunks` would have elided. So Phase B closes a **pre-existing** tree-shake gap that Approach A merely made more visible.

**Anchor:** the embed-mode TodoMVC at 14.1 KB gzip is a real, executable bundle today. The shared-runtime fix would produce the same chunk union assembled into a separate file — functionally identical, no behavior change. The recovery estimate is grounded in this measured artifact, not extrapolation.

**Caveat for Phase B implementers:** the shared `scrml-runtime.js` is intended to be a **stable shared asset across multiple compile units** (a build serves N files but ships ONE runtime). If Phase B uses the per-CALL union, then a compile of file A alone vs files A+B will produce different `scrml-runtime.js` contents. This is acceptable when the shared runtime is rebuilt every compile (current behavior — `api.js:1442` writes it on every `compile`), but it means **the runtime hash changes if the compile-unit set changes**. Adopters that pin a runtime URL externally would see cache invalidation. Recommend documenting this trade in the v0.3.x release notes; the alternative ("ship every chunk because shared = predictable") is exactly the current bloat path.

### 3.2 Secondary fix — `core`-chunk `_scrml_wire_decode` gating

**Surface:** `compiler/src/codegen/runtime-chunks.ts:CHUNK_MARKERS` + `compiler/src/runtime-template.js:92-105`.

Move `_scrml_wire_decode` out of `core` into a new shakeable position, OR add a new chunk (e.g. `wire`) with a boundary marker before line 92 of runtime-template. Gate predicate: `wire` chunk admitted when ANY file in the compile unit has at least one server-fn call site or `use foreign:` sidecar import.

Detector logic (already present in `usage-analyzer.ts` for other gates): walk the AST for `server-fn-decl` nodes and `import-decl` nodes with `foreign:` prefix; add the chunk when found.

**Estimated lines touched:** 5-10 in `runtime-chunks.ts` (new chunk in ordering + marker), 5-10 in `runtime-template.js` (boundary comment), 5-10 in `emit-client.ts:detectRuntimeChunks` (new gate). No spec change.

**Estimated TodoMVC recovery (gzip):** **+330 B** beyond the primary fix (TodoMVC has zero server-fns).

**Optional, lower-priority than 3.1.** Could defer to v0.3.x+1.

### 3.3 Tertiary fix — `mount`-chunk gate tightening for SPA shape

**Surface:** `compiler/src/codegen/emit-client.ts:172-179`.

Today: gate fires when ANY chunk admits markup. For SPA shape, the **initial chunk** admits ALL markup but there is no peer chunk to coordinate with. `_scrml_chunk_mount` and `_SCRML_MOUNTS` are pure overhead in this case.

Phase B gate refinement:

```ts
// Tightened mount gate: only fire when admitted markup spans
// multiple chunks (i.e., a real per-(EP, role) split is in play).
const initialHasMarkup = chunkHasComponents(plan.initialChunk);
const tierHasMarkup =
  chunkHasComponents(plan.prefetchTier1) ||
  chunkHasComponents(plan.prefetchTier2) ||
  (Array.isArray(tierN) && tierN.some(chunkHasComponents));
// Only mount-register when there is >1 chunk to coordinate.
if (initialHasMarkup && tierHasMarkup) {
  chunks.add("mount");
}
```

**Caveat:** I have not verified that atom-emitter's `_scrml_chunk_mount(...)` call sites are also conditionally suppressed for SPA. If atom-emitter emits them unconditionally into the initial chunk, the per-file `.client.js` would call an undefined function. Phase B implementer must check `compiler/src/codegen/atom-emitter.ts:emitComponentAtom` (or equivalent) for the same gate. If the call sites need a flag too, plumbing is required — bigger surface than 3.1/3.2 alone.

**Estimated lines touched:** 5-10 in emit-client.ts + UNKNOWN in atom-emitter (TBD by Phase B). Spec impact: none if atom-emitter call sites already gate; review if not.

**Estimated TodoMVC recovery:** **+0 B** (TodoMVC's reachability is empty, mount gate already fires negative). For the SPA counter the recovery is **~479 B gzip**.

This fix matters for non-TodoMVC SPAs (e.g. `examples/02-counter.scrml`), not for the headline regression. Lowest priority of the three.

### 3.4 SPA-inferred flag for CompileContext (precondition for 3.3)

If 3.3 is in scope, Phase B may want a direct `isSpaInferred: boolean` field on `CompileContext` rather than re-detecting from the reachability record. The SPEC §40.8.1 predicate (ratified S86) is implemented at `ast-builder.js:10979-11049` but only emits a lint — the inference result is not stored anywhere.

Precondition surface to add the flag (already noted in dispatch context):

1. **AST-builder side** — capture the three-condition result alongside the lint emission. Either:
   - Return `isSpaInferred` from `buildAST` as a top-level field on the returned AST object, OR
   - Add `isSpaInferred: boolean` to `CompileContext` and set it in the pipeline driver after AST building.
2. **CG side** — read `ctx.isSpaInferred` in `detectRuntimeChunks` as a side-channel for any gate that wants the SPA short-circuit.

**Surface:** 5-10 lines in ast-builder.js, 3-5 in codegen/context.ts (new field). Spec impact: none — the flag mirrors an already-ratified lint predicate.

**Recommendation:** scope 3.4 INTO Phase B as a clean foundation for 3.3, but treat 3.1 + 3.2 as the load-bearing recovery work. 3.1 alone recovers ≥75% of the regression and is the minimal viable patch.

---

## 4. Estimated total recovery if all three fixes land

For the TodoMVC bundle (the headline 14.8 → 39.9 KB narrative target):

| Component | Source | Δ gzip (recovery) |
|---|---|---:|
| 3.1 shared-runtime union | prefetch + mount + vendor-ref + pre-existing tree-shake gap | **~26,400 B** (40.8 KB → ~14.4 KB) |
| 3.2 wire-decode chunk | `_scrml_wire_decode` (no server-fns in TodoMVC) | +330 B beyond 3.1 |
| 3.3 mount tightening | (TodoMVC's reachability is empty — already shaken) | +0 B beyond 3.1 |
| **Total** | | **~26,700 B (post-fix bundle ≈ 14.1 KB gzip)** |

This puts TodoMVC at **14.1 KB gzip** — back **below the historical 14.8 KB v0.2.x baseline** cited in `README.md:423`. The v0.3.0 STABLE narrative ("paid back by multi-route per-role chunking") could in fact be **superseded** by a single-page-shape bundle that beats every prior baseline.

**Anchor:** the embed-mode TodoMVC at 14,104 B gzip TODAY is a real bundle. The shared-runtime fix would write the same chunk union to a separate file — functionally identical, recovery is mechanical.

For the SPA counter:

| Component | Δ gzip (recovery) |
|---|---:|
| 3.1 shared-runtime union | dominant — shared runtime becomes the chunk union (~26 KB recovery) |
| 3.2 wire-decode chunk | +330 B |
| 3.3 mount tightening | +479 B |
| **Total** | **~27 KB** |

---

## 5. Surprises / risks for Phase B

### 5.1 The regression is mostly a pre-existing tree-shake gap, not Approach A

The +4,243 B Approach-A delta in `scrml-runtime.js` is the smaller story. The bigger story is that **the shared-runtime path has been shipping a non-tree-shaken bundle since well before v0.3.0**. Approach A made the bundle bigger; tree-shaking the shared runtime recovers far more bytes than Approach A added. Phase B is closing a pre-existing bug as much as it is mitigating Approach A.

This may shift framing in release notes / docs (`README.md:423-428` currently says "the growth is paid back in apps with multiple routes and roles"). With Phase B, the bundle is smaller for SPAs AND retains the multi-route benefit — there is no longer a single-page-vs-multi-page trade.

### 5.2 SPA-inferred predicate is NOT the load-bearing gate

The dispatch context framed Phase B around the W-PROGRAM-SPA-INFERRED predicate. In practice the predicate is one *instance* of the broader "compile unit needs fewer chunks than the shared runtime ships" condition. The general fix (3.1) doesn't need an SPA flag at all — it uses the existing per-file `usedRuntimeChunks` sets. The SPA flag is only needed for the optional `mount`-gate refinement (3.3).

**Recommendation:** lead Phase B with 3.1 (no SPA flag required), add the flag in 3.4 only if 3.3 is in scope.

### 5.3 Shared-runtime hash stability

3.1 makes `scrml-runtime.js` content **depend on the compile-unit set**. If adopters serve a stable URL for the runtime (e.g. CDN-cached), changing which `.scrml` files are in the build will change the runtime hash → cache invalidation. This is a real adopter-facing behavior change. Three mitigations to weigh:

- **(a)** Compute a content hash and emit `scrml-runtime.<hash>.js`. Adopter HTML references the hashed filename. Per-file `client.js` `// Requires: ...` comment becomes a `// Requires: scrml-runtime.<hash>.js` line. Requires touching `compiler/src/api.js:1442` and the `// Requires:` injection at `compiler/src/codegen/index.ts:676`.
- **(b)** Document the trade and recommend full rebuild on `.scrml` set changes. Lower implementation cost; higher adopter friction.
- **(c)** Compile-unit-stable hash: ship a "max-features" runtime that includes every chunk found across *historically* compiled files. Requires persistent build state — overkill, not recommended.

(a) is the right shape long-term and worth pricing into Phase B. Without it, 3.1 is correct but lossy on the "shared = stable URL" promise.

### 5.4 The 14.8 KB v0.2.x baseline number in `README.md` and `RESULTS.md` may not be reproducible

The hand-off-11 entry that established the 14.8 KB baseline dates from a much earlier commit (line 13: "13.4→14.8 KB gzip"). When I compiled `benchmarks/todomvc/app.scrml` at v0.2.0 (oldest semver tag), the bundle was **36.5 KB gzip**, same as v0.2.6. The README's framing ("scrml's bundle grew from 14.8 KB (v0.2.x) to 39.9 KB at v0.3.0") compresses a regression that spanned multiple versions into a single Approach-A narrative. The genuine Approach-A delta is +4,306 B gzip, not +25.1 KB.

This isn't a blocker for Phase B but it does mean the **post-Phase-B bundle (~14.1 KB gzip) will read as "Approach A recovered all the regression and then some"** when in fact the recovery is closing a much older tree-shake gap. Phase B implementers and doc writers should choose whether to frame this honestly (recommended) or fold it into the Approach-A narrative (lower friction).

### 5.5 Wave 4.A close said tree-shake is part of v0.3.x — confirmed shape

The S94 backlog item "closure-analysis runtime tree-shake for SPA" matches this scoping precisely. Phase B implementation is bounded: 3.1 is ~15 lines of code in `codegen/index.ts`. 3.2 + 3.4 add another ~30 lines. 3.3 carries unknown atom-emitter risk and should be scoped separately or pushed to v0.3.x+1.

---

## 6. Phase B implementation surface summary

| Fix | File(s) | Approx LOC | New `CompileContext` field? | Spec impact |
|---|---|---:|:---:|:---:|
| 3.1 shared-runtime union | `compiler/src/codegen/index.ts` | 10-15 | no | none |
| 3.2 wire-decode chunk | `runtime-chunks.ts`, `runtime-template.js`, `emit-client.ts` | 15-25 | no | none |
| 3.3 mount-gate tightening | `emit-client.ts` (+ possibly `atom-emitter.ts`) | 10 + ? | no (uses RS state) | none if atom-emitter already gates; review otherwise |
| 3.4 `isSpaInferred` flag (precondition for 3.3) | `ast-builder.js`, `codegen/context.ts` | 10-15 | **YES** (`isSpaInferred: boolean`) | none (mirrors §40.8.1 lint predicate) |

**Recommendation:** land 3.1 + 3.2 as the v0.3.x SPA-tree-shake patch. Defer 3.3 + 3.4 to a follow-up if measurements after 3.1 + 3.2 show the residual regression is worth the extra surface. Given that 3.1 alone closes the headline narrative (TodoMVC back below v0.2.x baseline), the marginal value of 3.3 + 3.4 is small and the implementation risk (atom-emitter gating) is not yet quantified.

---

## 7. Reproduction artifacts

All measurement outputs preserved at:

- `/tmp/scrml-bench/v026/` — `git worktree` at tag `v0.2.6` (HEAD `efbd1e8`)
- `/tmp/scrml-bench/v030/` — `git worktree` at tag `v0.3.0` (HEAD `c520369`)
- `/tmp/scrml-bench/todo-v026-same/` — same-source TodoMVC compiled at v0.2.6
- `/tmp/scrml-bench/todo-v030/` — TodoMVC compiled at v0.3.0
- `/tmp/scrml-bench/todo-v026-embed/` — embed-mode at v0.2.6
- `/tmp/scrml-bench/todo-v030-embed/` — embed-mode at v0.3.0
- `/tmp/scrml-bench/out-v030-reach/` — `--emit-reachability` for SPA counter at v0.3.0
- `/tmp/scrml-bench/todo-v030-reach/` — `--emit-reachability` for TodoMVC at v0.3.0 (empty closures — see §2.5)
- `/tmp/scrml-bench/runtime.diff` — full diff of v0.2.6 → v0.3.0 runtime
- `/tmp/scrml-bench/gz.js`, `/tmp/scrml-bench/slice.js`, `/tmp/scrml-bench/excise.js` — measurement helpers

Worktrees should be cleaned up with `git worktree remove <path>` when Phase B no longer needs them.

---

## Tags

`#v0.3.x` `#approach-a` `#tree-shake` `#runtime` `#bundle-size` `#scoping` `#phase-a` `#spa-inferred` `#shared-runtime` `#performance`

## Links

- spec: `compiler/SPEC.md` §40.8.1 (W-PROGRAM-SPA-INFERRED ratification, S86)
- spec: `compiler/SPEC.md` §40.9 (per-route per-role chunk emission, A-4)
- spec: `compiler/SPEC.md` §40.9.7 (initial-chunk + prefetch tiers)
- spec: `compiler/SPEC.md` §41 (vendor-unit reference registry)
- spec: `compiler/SPEC.md` §57 (Wire Format dual-decoder)
- source: `compiler/src/codegen/index.ts:895` (shared-runtime path — Phase B 3.1 target)
- source: `compiler/src/codegen/emit-client.ts:96-207` (`detectRuntimeChunks` — Phase B 3.3 target)
- source: `compiler/src/codegen/runtime-chunks.ts` (chunk catalog + ordering — Phase B 3.2 target)
- source: `compiler/src/runtime-template.js:101` (`_scrml_wire_decode` — Phase B 3.2 source)
- source: `compiler/src/runtime-template.js:1273-1404` (prefetch + mount + vendor-ref chunks)
- source: `compiler/src/ast-builder.js:10979-11049` (SPA-inferred predicate — Phase B 3.4 source)
- bench: `benchmarks/todomvc/app.scrml` (regression workload)
- bench: `benchmarks/RESULTS.md` (v0.3.0 STABLE refresh — 2026-05-14)
- adopter: `README.md:412-446` (the 14.8 → 39.9 KB narrative — see §5.4 for re-framing notes)
- prior change: `docs/changes/todomvc-edit-mode-landing/` (Edit-mode source delta accounting for v0.3 app.scrml shape)
- hand-off: `handOffs/hand-off-93.md` (S93 close — v0.3.0 STABLE cut)
- registry: `~/.claude/agent-registry.md`
