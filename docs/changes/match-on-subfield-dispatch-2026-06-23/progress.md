# GITI-031 — match on=@cell.subfield dispatches on whole cell

change-id: match-on-subfield-dispatch-2026-06-23
worktree: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a9cdf450da00e91d0

## Phase 0 — repro + root-cause (DONE)
- Repro: `<match for=P on=@cell.state>` emitted `dispatch(_scrml_reactive_get("cell"))`
  (whole cell) in BOTH the subscribe trigger AND the DOMContentLoaded init-fire;
  the `.state` sub-path was dropped. Dispatcher's `_tag = _v.variant ?? _v` received
  `{state,n}` (no `.variant`) -> matched no arm -> mount blank (even initial seed).
- Root cause: emit-match.ts `resolveOnExpr` member-access branch returns a NON-NULL
  `variantSubscribeName` (rootCell) -> routed Shape A (subscribe-only). Shape A in
  emit-variant-guard.ts reads the WHOLE cell via `_scrml_reactive_get(name)` and the
  subscribe callback receives the whole cell value; the `variantExprAccessor` (which
  DID carry `.state`) is only used by Shape B (effect mode). So Shape-A member-access
  dropped the sub-path on both trigger paths.

## Phase 1 — fix (DONE)
- emit-match.ts: `OnExprResolution.subscribeSubPath` field added; member-access return
  sets it to the dotted path (e.g. ".state"); all other returns set "". Passed into
  emitVariantGuardedRender opts.
- emit-variant-guard.ts: `VariantGuardOptions.subscribeSubPath` added. Shape-A subscribe
  trigger now wraps the dispatch in `function(_cv){ dispatch((_cv)<path>); }` when subPath
  is non-empty; DOMContentLoaded init-fire appends `<path>` to the cell read. Bare `@cell`
  (subPath "") and engine auto-implied paths UNCHANGED (pass dispatchFn directly).
- Verified emit: `on=@cell.state` -> subscribe `function(_cv){ dispatch((_cv).state); }`
  + init `dispatch(_scrml_reactive_get("cell").state)`. Deep `on=@a.b.c` -> `.b.c`.
  Bare `@cell` unchanged. node-check OK on all.

## JS-style value-match — NOT affected
- `match @cell.state { ... }` lowers the FULL scrutinee via emitExprField:
  `const _scrml_match_N = _scrml_reactive_get("cell").state;` then dispatches on the tag.
  Empirically verified correct. No fix needed (different code path).

## Phase 3 — tests + R26 (next)

## Phase 3 — tests + R26 adversarial (DONE)
- NEW compiler/tests/browser/g-match-on-subfield-dispatch.browser.test.js (9 tests, 3 describe):
  §1 emit-regression (subscribe wraps `.state`; init-fire reads `.state`; bug shapes absent),
  §2 happy-dom runtime (initial seed .Idle renders Idle arm; reactive sub-path write -> Ok arm),
  §3 deep sub-path `on=@cell.inner.phase` (emit + runtime).
- R26 adversarial: reverted the two source files to HEAD~1 -> 7/9 FAIL (incl. the runtime
  "initial seed renders" -> null, the exact bug symptom). Restored fix -> 9/9 pass. Proves
  the suite genuinely catches GITI-031, not a tautology.
- Repro fixtures under repro/ (single + deep sub-path).
- Pre-commit gate at Phase-1 commit: 17664 pass / 0 fail / 68 skip / 1 todo (974 files).

## WITHIN-NODE (S211)
- No M6.5.b.0 within-node fixture change: the fix adds NO new AST field exposed to the
  within-node classifier (subscribeSubPath is a codegen-internal OnExprResolution/options
  field derived at emit time from the EXISTING onExprRaw; no FileAST shape change, no
  STRIP_KEYS entry needed). Native-parser swap-class unaffected.
