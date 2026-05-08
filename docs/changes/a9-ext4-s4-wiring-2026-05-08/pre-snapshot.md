# Pre-Snapshot — a9-ext4-s4-wiring-2026-05-08

**Date:** 2026-05-08
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a7d0d371cdfdaf640`
**Branch:** `worktree-agent-a7d0d371cdfdaf640`
**Base SHA:** `479ec1a` (S72 ratification)
**Tier classification:** **T3** — multi-file (route-inference.ts + emit-functions.ts + emit-server.ts + spec amendments + new error codes); substantially restructures CPS error semantics; introduces new caller-context dataflow direction extending Insight 26 Trigger 5.

## Test baseline

- `bun run pretest`: 12 test samples compiled successfully
- `bun run test`:
  - **9822 pass**
  - **64 skip**
  - **1 todo**
  - **3 fail** (pre-existing; out-of-scope for Ext 4)
  - 34106 expect() calls

### Pre-existing failures (NOT regressions; not in scope)

1. `F-BUILD-002 §3: generated entry parses without SyntaxError`
2. `Bootstrap L3: self-hosted API compiles compiler` (timeout-related)
3. `Self-host: tokenizer parity > compiled tab.js exists`

These match the dispatch-stated baseline of 9822/64/1/3.

## Trigger 5 verification (Ext 4 substrate)

- `compiler/src/route-inference.ts` line count: **2487**
- Trigger 5 (caller-context propagation) implemented at lines **1810-1914** (Step 5c block).
- Forward fixed-point: function with NO direct triggers and NO capture taint, called ONLY from server-classified callers (and never from any client-classified function), escalates to server.
- Algorithm shape: monotonic, lattice-bounded; terminates in at most `analysisMap.size` iterations.

## CPS substrate (existing, unchanged today)

- `compiler/src/route-inference.ts:842` — `analyzeCPSEligibility()` returns `CPSResult | null`.
- `compiler/src/route-inference.ts:2150-2249` — Step 6 finalizes RouteMap with cpsSplit per function.
- `compiler/src/codegen/emit-functions.ts:147-227` — CPS client wrapper emission (Step 2 of the file).
- `compiler/src/codegen/emit-server.ts:600-749` — CPS server endpoint emission (twin paths for `useBaselineCsrf` true/false).

### Existing CPS client-wrapper code (the floor for D1 always-`!`-wrap)

```js
async function ${wrapperName}(${paramNames.join(", ")}) {
  // for stmt in body, emit server-call-replacement OR client stmt
  const _scrml_server_result = await ${stubName}(${paramNames.join(", ")});
  // ... reactive_set + tail
}
```

NO try/catch around the `await fetch(...)`. NO error handler synthesis. **This is where D1 lands.**

## Failable function detection (existing)

- `compiler/src/type-system.ts:3418-3445` — `fnErrorTypes`, `fnCanFail` maps built from AST nodes with `canFail === true`.
- `compiler/src/ast-builder.js:4601, 6477-6482, 6640-6645` — `canFail` flag set on function-decl AST nodes when `!` modifier present.

## `<errorBoundary>` recognition (existing)

- `compiler/src/name-resolver.ts:61` — element name registered.
- `compiler/src/codegen/emit-html.ts:330` — emit handler.
- `compiler/src/type-system.ts:3960, 4362` — diagnostic resolutions reference the boundary.

## SPEC.md sections of interest

- §19.6 (line 10811) — `<errorBoundary>` state type. EXISTS.
- §19.9 (line 10962) — Server Function Errors. EXISTS; covers CPS preservation. THIS is the actual locus for the worked example (NOT §47 — design dive line 849 said "§47 server functions" but §47 is "Output Name Encoding"; the integration design dive cited the wrong section number; correct locus is §19.9).
- §34 (line 14002) — Error Codes registry. EXISTS.
- §47 (line 17644) — Output Name Encoding. UNRELATED to server functions despite design dive citation.

### Surprise surfaced

The dispatch + integration design dive both cited "§47 (server functions)" as the worked-example locus. **This is incorrect.** §47 is "Output Name Encoding"; the actual server-functions-and-CPS section is §19.9. **Will route the worked-example amendment to §19.9 instead** and document the reroute in the SHIP report. This is NOT a contradiction of the design dive verdict (worked example IS still doc-only; cross-ref is still §19.6 → server-functions); only the section number is corrected.

## Existing CPS error codes / warnings

- `E-RI-002` (§12) — server-escalated function mutates `@` reactive variable. The CPS-eligibility bail-out path.
- No existing `W-CPS-*` or `E-CPS-*` codes. Ext 4 introduces:
  - `W-CPS-NEEDS-FAILABLE` (warning, transitional, v0.next)
  - `E-CPS-NEEDS-FAILABLE` (error, post-deprecation, v0.next+1)

## Coordination with parallel dispatches

- **Insight-26-Batch-2** (parallel) is amending §11.4, §52.10, §47.10, §34, §12.2 + stdlib `server { }` cleanup. Its §34 entries are `W-DEPRECATED-SERVER-MODIFIER` + `E-DEPRECATED-SERVER-MODIFIER` (DIFFERENT codes from this dispatch's W/E-CPS-NEEDS-FAILABLE).
- **Insight-27 §8.4** (parallel) is amending §8.4. No file-level overlap with this dispatch.

This dispatch's §34 amendments are append-only at table boundaries — no line-level conflict expected even when both branches land.

## Plan

D1, D2, D3, D4 in that order. Test corpus added inline per deliverable. Self-classify final tier in SHIP report.

## Files-to-touch (anticipated)

- `compiler/src/route-inference.ts` (D2 + D3 — extend Trigger 5)
- `compiler/src/codegen/emit-functions.ts` (D1 — always-`!`-wrap CPS stubs)
- `compiler/src/codegen/emit-server.ts` (D1 — server-side error serialization for CPS)
- `compiler/SPEC.md` (D4 — §19.6 cross-ref + §19.9 worked example + §34 W/E-CPS-NEEDS-FAILABLE)
- `compiler/tests/unit/cps-failable-wiring.test.{js,ts}` (new — D1+D2+D3 tests)

## Tags

#agent-output #pre-snapshot #a9-ext4 #s4-failure-mode-preservation #cps-wiring

## Links

- Dispatch brief: in conversation
- Body-split soundness design dive: `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/body-split-soundness-design-2026-05-08.md` §3.4
- Body-split integration design dive: `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/body-split-integration-and-residual-design-2026-05-08.md` Q3 + Q4
- Soundness analysis: `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/soundness-analysis-for-body-split-2026-05-08.md`
- Insight 26 substrate: `compiler/src/route-inference.ts:1810-1914`
- Existing CPS client wrapper: `compiler/src/codegen/emit-functions.ts:147-227`
- Existing CPS server endpoint: `compiler/src/codegen/emit-server.ts:600-749`
