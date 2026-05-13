# §13.2 Sub-Phase C — CG transform (auto-await emission)

## 2026-05-13 — Rule-4 reconnaissance

- Worktree merged main (`9b98118` → `39eba45`, +17 S89 commits).
- Maps consulted: primary, domain, structure, test.
- Pre-flight: `bun install` + `bun run pretest` clean.

### Sub-Phase B Step 3 (landed `39eba45`) — CG work inventory

Reviewed `git show 39eba45` in full. Sub-Phase B Step 3 already shipped the
entire CG-side scope described in SCOPING §6 Sub-Phase C:

1. **`isServerCallExpr` → `isPromiseReturningCallExpr`** — DONE. New predicate
   added at `scheduling.ts:252` alongside the existing `isServerCallExpr` (kept
   as a delegate; both coexist for backwards-compat).
2. **`hasServerCallees` → `hasPromiseReturningCallees`** — DONE (extended
   in-place at `scheduling.ts:105`). Optional `calleeMap` + `exportRegistry`
   params; functionally generalizes when threaded, falls back to pre-S89
   server-only behavior when null.
3. **Predicate consults stdlib classification annotation** — DONE via
   different mechanism. SCOPING proposed `_returnsPromise` on CallExpr;
   landed mechanism is exportRegistry's `isAsync` flag consulted via
   `isPromiseReturningStdlibFn(name, sourceModule, exportRegistry)`. Same
   outcome — predicate broadens to cover stdlib Promise<T> callees.
4. **Detect explicit `await` and skip double-emission** — NOT APPLICABLE.
   scrml source forbids `await` (§13.1). Stdlib `.scrml` files (which DO
   contain explicit `await` per the two-step pattern) are TAB-only parsed
   via STDLIB-EXPORT-SEED (api.js Stage 3.105) and never reach scheduling.ts
   codegen — only the JS shims (`compiler/runtime/stdlib/*.js`) are bundled.
   Regression guard in test §7 (`auto-await §7: idempotency`) asserts emitted
   JS contains no `\bawait\s+await\b` token sequence.

### Two await-emission paths in scheduling.ts (post-`39eba45`)

- **Sequential single-stmt branch** (`scheduling.ts:501`) — uses broad
  `isPromiseReturningCallExpr(stmt, routeMap, filePath, calleeMap, exportRegistry)`.
  Covers `bare-expr`, `let-decl`, `const-decl` with stdlib Promise<T> callees.
- **Promise.all coalescing branch** (`scheduling.ts:473,480`) — gated on narrow
  `hasServerCallees(fnNode, routeMap, filePath, null, null)` (line 371). Pre-S89
  behavior preserved exactly: only actual server-fn fetch call sites trigger
  Promise.all coalescing. Stdlib parallelization is deliberately deferred to a
  follow-on (DG has no awaits edges between stdlib calls; broadening would
  emit invalid Promise.all groupings).

### emit-logic.ts `case "guarded-expr"` auto-await

- DONE at `emit-logic.ts:2295-2311` — opts threaded via
  `asyncRouteMap`/`asyncCalleeMap`/`asyncExportRegistry`/`asyncFilePath`.
- Delegates to `scheduling.ts:isPromiseReturningCallExpr` (single source of
  truth).
- Emits `let _scrml_result = await initExpr;` when classifier matches; emits
  `let _scrml_result = initExpr;` (pre-S89) otherwise.

### emit-functions.ts integration

- DONE at `emit-functions.ts:91-92,431,481` —
  `buildCalleeImportMap(ctx.fileAST.ast)` built ONCE per file; threaded into
  `hasServerCallees` (line 431) and `scheduleStatements` (line 481).
- Wires `async function` prefix (line 432) when stdlib Promise<T> is detected.

### Test coverage (already landed)

`compiler/tests/unit/auto-await-promise-stdlib.test.js` — 9 tests across 8
sections; all pass at HEAD `39eba45`:

- §1 collapse `safeCallAsync(thunk) !{ ... }` to one-line auto-await ✓
- §2 stdlib host module classifier probe ✓
- §3 stdlib non-Promise (`safeCall`) does NOT auto-await ✓
- §4 user `async function` does NOT classify in caller (Q5 carve-out) ✓
- §5 I-ASYNC-USER-SOURCE info lint fires on user source ✓
- §6 `!{}` works without explicit `await` (Q4) ✓
- §7 idempotency — no `await await` ever emitted (Q2) ✓
- §8 STDLIB-EXPORT-SEED isolates stdlib TAB ✓

Verified via `bun test compiler/tests/unit/auto-await-promise-stdlib.test.js`:
9 pass / 0 fail.

## Disposition: Case A (scope-already-done)

All four items of SCOPING §6 Sub-Phase C closed by `39eba45`. Closure doc:
`CLOSURE.md` in this directory.

## Residual scope (NOT v0.3.0-blocking)

1. **Stdlib Promise.all parallelization.** Independent stdlib Promise<T> calls
   in the same function body are NOT coalesced into Promise.all (sequential
   `await x; await y;` emission). Deliberate per scheduling.ts:364-370 — DG
   has no awaits edges between stdlib calls; broadening the Promise.all gate
   would emit invalid groupings. Future work: extend DG to emit awaits edges
   for stdlib Promise<T> calls, then narrow the gate at scheduling.ts:371.

2. **Non-failable Promise<T> sites without `!{}`.** `const x = hashPassword(pw)`
   without a `!{}` guard does NOT auto-await today (the function isn't even
   wrapped in `async function` — verified via spot-check compile of
   `<button onclick=caller()>` with `const x = hashPassword("test")`). The
   same behavior holds for server functions (pre-S89 invariant): only
   `bare-expr` server calls auto-await in the sequential path; `const x = fn()`
   leaves the Promise dangling. This is a pre-existing gap (NOT a Sub-Phase C
   regression) and would require extending the sequential path's emit-logic
   `case "let-decl"`/`case "const-decl"` to inspect the classifier.

Both residuals fall outside SCOPING Sub-Phase C scope and are recommended
follow-ons.
