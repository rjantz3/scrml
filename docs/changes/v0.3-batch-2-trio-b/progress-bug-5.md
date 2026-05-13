# Bug 5 progress — `.filter(cb).<member>` strips inner callback

**Dispatch:** Re-dispatch after agent a66ab148b9eed24a6 hit API Internal server error mid-flight.

## Timeline

- **2026-05-12 (re-dispatch start)** — startup verification clean. Branch HEAD = `7a00b1b` (S86 close, pre-Trio-A). Worktree from before Bug 1 fix-B landed.

- **Root cause confirmed** — Previous worktree (a66ab148b9eed24a6) identified root cause at commit `3c4c914`:
  `esTreeToExprNode` in `compiler/src/expression-parser.ts` drops `rawSource` parameter through many recursion sites
  (MemberExpr.object, Unary/Update/Await/Binary/Logical/Conditional/MemberExpr.computed, scrml-placeholder calls
  __scrml_is_*__, __scrml_match__ subject, NewExpression, ArrayExpression, ObjectExpression). When a FunctionExpression
  with a BlockStatement body lives nested inside any of those positions, the FunctionExpression branch tries to slice
  `rawSource.slice(start, end)` but rawSource is undefined → falls back to `""` → `makeEscapeHatch` emits empty raw
  → emitter prints nothing → the whole callback vanishes.

  Load-bearing site for D3b's TodoMVC repro: `MemberExpression.object`. `arr.filter(function(t){return t.x}).length`
  parses as `MemberExpression{ object: CallExpression(arr.filter(...)), property: length }` — the inner CallExpr's
  arg (the function) loses its raw slice and emits as nothing.

- **Reproduced bug** — `arr.filter(function(t){return t.x}).length` compiled to `arr.filter().length`. Confirmed.

- **Fix already authored** — Previous worktree commit `ad34db7` threaded rawSource through every remaining
  recursion site (54 insertions / 25 deletions in expression-parser.ts).

- **Bug 1 fix-B coexistence handled** — My branch (7a00b1b) is from before S87 Trio A landings. Main (547566a)
  has Bug 1 fix-B (d8ea41c, the `::(?=\s*[A-Z])` rewrite in preprocessForAcorn). Bug 5 fix touches
  esTreeToExprNode (line 1027+), Bug 1 fix-B touches preprocessForAcorn (line 686). Non-overlapping. To produce
  a file PA can FILE-DELTA-LAND alongside other Trio B fixes, I (a) checked out main's expression-parser.ts
  (includes Bug 1 fix-B), (b) applied the ad34db7 Bug 5 patch on top via `git apply --3way` — applied cleanly.

- **Repro verified after fix** — `arr.filter(function(t){return t.x}).length` now emits
  `arr.filter(function ( t ) { return t . x }).length;`. The slight spacing is astring re-formatting, not
  emitter-strip.

## Completed

- **Unit tests landed** — `compiler/tests/unit/method-chain-callback-emission.test.js` with 15 tests across
  7 fixtures covering 6 sections: §1 .filter(fn).length canonical, §2 .filter(fn).map(fn2), §3
  .filter(fn).reduce(fn2, init), §4 nested .filter(fn).filter(fn2).length (deeper MemberExpr.object recursion),
  §5a .filter(arrow).length (single-expr arrow), §5b .filter((t)=>{block}).length (arrow with BlockStatement),
  §6 Bug 1 fix-B regression guard (EnumType::Variant). All 15 pass; +34 expect calls. Brief target was +5 to
  +10 tests; landed +15 with stronger nested-chain coverage.

- **TodoMVC e2e** — `bun test compiler/tests/browser/todomvc-e2e.test.js` passes 10/10. Fresh compile from
  source verifies `_scrml_activeCount_25()` emits `.filter(function(t){return !t.completed}).length` with
  the inner callback fully present. The downstream Bug 4 symptom (top-level `_scrml_activeCount_25()` throws
  TypeError before DOMContentLoaded wiring runs because the chain emitted `.filter().length`) should now
  resolve via this fix. Larger test `compiler/tests/browser/browser-todomvc.test.js` 39 pass / 8 skip / 0 fail.

- **TodoMVC fixture revert (AC2)** — My branch HEAD (7a00b1b) is BEFORE the workaround commits 149c979 +
  5762069 landed on main. So `benchmarks/todomvc/app.scrml` in my worktree is ALREADY in the canonical
  single-statement `.filter(cb).length` form. PA's FILE-DELTA-LAND of my version effectively reverts the
  workaround on main. I did not edit the file — its current state IS the desired AC2 outcome. Verified via
  `Read` and via the compiled output containing the inline single-statement shape.

- **Test suite delta (AC1, AC3, AC4)** — full unit + integration + conformance + browser run:
  11082 pass / 93 skip / 1 todo / 0 fail (vs S78 baseline 11051; net +31 tests including +15 from this
  dispatch and +16 from intermediate Trio A landings). 0 regressions.

## Files touched

- `compiler/src/expression-parser.ts` — main's expression-parser.ts (carries Bug 1 fix-B) merged with the
  ad34db7 Bug 5 patch (threads rawSource through every esTreeToExprNode recursion site). Net +77 / -25.
- `compiler/tests/unit/method-chain-callback-emission.test.js` — new file, 15 tests / 7 fixtures.
- `docs/changes/v0.3-batch-2-trio-b/progress-bug-5.md` — this file.

## Out-of-scope but worth noting

- The `tmp-repro/` directory was created during diagnosis. Cleaning up before final report.
- The W-PROGRAM-001 / W-DEAD-FUNCTION warnings on TodoMVC compile are unrelated and pre-existing
  (TodoMVC fixture intentionally has no `<program>` root for benchmark-isolation reasons).
