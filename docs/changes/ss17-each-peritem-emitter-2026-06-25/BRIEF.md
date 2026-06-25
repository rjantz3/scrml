# Dispatch BRIEF — ss17 each per-item emitter completeness (3 MED gaps)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus · **change-id:** ss17-each-peritem-emitter-2026-06-25
**Branch to land on (sPA-side):** `spa/ss17` (you commit on your own agent worktree branch; the sPA file-deltas your changes onto `spa/ss17`).
**Base:** `2a4bf8af` (== origin/main at dispatch).

Three independent gaps in the Tier-1 `<each>` per-item emitter, all in `compiler/src/codegen/emit-each.ts`. They live in DIFFERENT functions — low intra-file conflict — but are ONE shared-understanding cluster (the per-item render/reconcile machinery). **Commit each item SEPARATELY** (one logical fix = one commit; crash-recovery + clean attribution). Reproduce RED first, then fix to green, for every item.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: the `isolation: "worktree"` path the harness assigns you (under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<id>/`).

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If the path is under any other repo (e.g. `scrml-support/.claude/worktrees/` or `scrml-spa-ss17/...`), STOP and report — CWD-routing failure. Save as WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Tree clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules`; the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise.
5. Run `bun run pretest` via Bash. Populates `samples/compilation-tests/dist/` (gitignored; ~130 ECONNREFUSED-shaped browser failures without it). Use `bun run test` (chains pretest) for full-suite baselines, NOT `bun test`.

If ANY check fails: DO NOT proceed. Report and exit.

## Path discipline (enforce on EVERY edit)

- **S126 (in force):** apply file edits via **Bash** (`perl`/`python3`/heredoc/`cp`) on **worktree-absolute paths** that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools. Echo the target path before each write; re-verify via `git diff`/`grep` after. Edit/Write have leaked into MAIN's checkout repeatedly (incidents #12–#15).
- **NEVER `cd` into the main repo** (or anywhere outside WORKTREE_ROOT). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd` into main leaks compile/run/install ops too.
- Reading from main via absolute path gives WRONG content (main may differ). Read only under WORKTREE_ROOT.
- If any path here points at `/home/bryan-maclee/scrmlMaster/scrml/...` (no `.claude/worktrees/agent-X/`), translate to `$WORKTREE_ROOT/...` before writing.

## Commit discipline (S83 / S113)

- Commit INCREMENTALLY — one commit per item (3 commits expected). `git status --short` clean before you report DONE.
- Coupled code+test = ONE commit (the fix and its happy-dom test land together).
- NEVER `git commit --no-verify` (the pre-commit hook runs the full ~17.6k test suite, ~108–124s; foreground commits are fine).

---

## Shared context — the per-item each emitter

`emit-each.ts` builds each `<each>` item's DOM imperatively in a per-item factory (no static-HTML placeholder + querySelector handoff — that's the top-level path). `_scrml_reconcile_list` (`compiler/src/runtime-template.js`) keyed-diffs the list and REUSES DOM nodes for same-key items WITHOUT re-running the factory. To keep reused nodes live, per-item bindings are wrapped in a fire-time re-resolution:
- Display bindings (text/class/attr): `maybeWrapEachPerItemEffect` (emit-each.ts:1393) → `_scrml_effect` + `let <iter> = _scrml_resolve_item(<mount>, <key>); if (===null) return;`.
- Handlers: `maybeWrapEachPerItemHandler` (emit-each.ts:1510) → same prelude inside the listener.
- The reconcile ctx (mount/key/iterVar) is on a stack: `currentEachReconcileCtx()` (emit-each.ts:1348).

The CANONICAL top-level handler shape to mirror for item 1 is `buildHandlerExpr` in `compiler/src/codegen/emit-variant-guard.ts:721` (the S216 Family-A Half-1 locus, commit `f4bef40f`). It routes through `emitExprField` / `rewriteBlockBody` and distinguishes fn-shorthand / arrow / plain-expr / bare-ref — INVOKING functions, handling assignment LHS via the structured emitter.

---

## ITEM 1 — `g-expr-event-handler-dead-in-each` (Family-A Half-2)

**Locus:** `emit-each.ts` → `renderTemplateAttrToJs`, event-handler case (2), the `valKind === "expr"` branch at **L971-985** (specifically the non-engine fallback L982-984: `handlerBody = rewriteIterValueExpr(raw) + ";"`).

**Confirmed (R26, sPA reproduced):**
- `onclick=${() => mark(@.id)}` (arrow) emits inside the listener: `…; () => _scrml_mark_1(_scrml_each_item.id);` — a **dead arrow-expression statement**. The arrow is created and discarded; the click is a silent no-op.
- `onclick=${() => @clicked = @.id}` (arrow w/ assignment) emits `() => _scrml_reactive_get("clicked") = …` → **E-CODEGEN-INVALID-JS** ("Assigning to rvalue"). `rewriteIterValueExpr` lowers the assignment LHS `@clicked` to a getter, AND the arrow is a dead statement.
- Control `onclick=mark(@.id)` (call-ref, L953-970) correctly invokes — leave that path unchanged.

**Why:** the `expr` branch treats the whole expression as a STATEMENT body and lowers it with the string-rewriter `rewriteIterValueExpr`, which (a) never invokes a function-valued expression and (b) mishandles assignment LHS. The engine sub-path already shows the right pipeline: `preLowered = rewriteIterScopeOnly(raw)` (lowers `@.field` → iter binding, preserves `@cell`) → structured emit.

**Fix direction (converge, don't band-aid — mirror Half-1):** in the `expr` non-engine fallback, lower iter-scope first (`rewriteIterScopeOnly`), then route through the structured emitter (`emitExprField`/`rewriteBlockBody`, the same machinery `buildHandlerExpr` uses) so:
- arrow `(…) => body` / fn-shorthand → the function IS the handler → invoke with the event: `(<lowered-fn>)(event)`.
- bare cell ref in `${…}` (e.g. `${@h}`) → invoke: `<ref>(event)`.
- plain expr / assignment → structured statement (assignment-aware → `_scrml_reactive_set`, NOT getter-on-LHS).
- Keep the existing engine path (L979-981) intact; keep `variable-ref` (L986-990, `onclick=@handler`) and `call-ref` (L953-970) intact.
- The Bug-73 `maybeWrapEachPerItemHandler` live-keying wrapper (L999) MUST still apply, so `@.field` reads resolve to the LIVE item at fire time. Verify the arrow's `@.id` resolves through the prelude (the arrow must close over the fire-time `_scrml_each_item`).
- **Cross-check the Half-1 `buildHandlerExpr` for dedupable logic** — if a shared shape-detection/lowering helper is extractable without contorting either site, extract it; if forcing a dedup distorts the each path (iter-scope is each-specific), a parallel-but-separate implementation is acceptable. Note your decision in the commit body.

**Test (value-asserting happy-dom, RED first):** mount an `<each>`; click a button with an arrow handler that mutates a cell reading `@.field`; assert the cell updated (handler fired) AND the correct item's data was used. Cover: arrow-calls-fn, arrow-with-assignment (the E-CODEGEN case → must now compile AND fire), bare-cell-in-`${}`. Adversarial (S215): fire after a keyed reconcile (array-replace same key / reorder) — the handler must use the LIVE item, not the create-time snapshot. Regression: the existing call-ref + engine-transition + bare-`@handler` each tests stay green.

---

## ITEM 2 — `g-each-peritem-markup-value-ternary` (GITI-032 follow-on)

**Locus:** `emit-each.ts` → `renderTemplateChildToJs`, the `child.kind === "logic"` / `bare-expr` path, the markup-value guard at **L549-552**:
```
if (exprNodeHasMarkupValue((stmt as any).exprNode)) {
  lines.push(`${indent}// each: markup-as-value in per-item interpolation not yet lowered (GITI-032 follow-on) — skipped`);
  return;
}
```

**Confirmed (R26, sPA reproduced):** `${ @.active ? <span>ON</span> : "" }` inside an `<each>` item emits ONLY the skip comment — the markup-value is silently NOT rendered (clean compile, non-render).

**Why:** `emitCreateElementFromMarkup` / the markup-value DOM build does not rewrite `@.` to the iter binding, so the each path bails rather than emit a markup-value whose `@.` refs would be unbound (or fail the E-CODEGEN gate).

**Fix direction:** thread the `@.` iter-var scope INTO the markup-value lowering so a markup-value nested in a per-item ternary builds its DOM with `@.` refs bound to the current item. The match/engine arm paths already lower this via `emitMarkupValueExpr` (grep it) — bring the each path to parity, adding iter-scope threading. **DEP-AWARE:** the S201 "markup-value-in-expression" path is the sibling — keep parity (find it; do not diverge its semantics). Live-key it (per-item effect) so the markup-value re-evaluates on reconcile, matching the text/attr paths. Remove the skip-comment early-return only once the real lowering is in.

**Test (value-asserting happy-dom, RED first):** mount an `<each>` whose item body is `${ @.active ? <markup>…@.label…</markup> : "" }`; assert the markup renders for active items, is absent for inactive, AND its nested `@.` refs resolve to the item's data. Adversarial: reconcile (toggle `active` in place / array-replace) and assert the markup-value updates.

---

## ITEM 3 — `g-nested-each-outer-key-reuse-inner-frozen` (Bug-72 / S212 Approach-C residual)

**Locus:** `emit-each.ts` → `renderTemplateChildToJs`, the `child.kind === "each-block"` (nested each) branch at **L671-737**, specifically the inner `_scrml_effect` emission at **L730-735**:
```
lines.push(`${indent}_scrml_effect(() => {`);
lines.push(`${indent}  const ${innerItemsVar} = ${innerItemsExpr};`);   // innerItemsExpr = rewriteIterValueExpr(@.field) = _scrml_each_item.field
for (… emitEachReconcileLines …) …
lines.push(`${indent}});`);
```
Runtime: `_scrml_reconcile_list` + `_scrml_resolve_item` in `compiler/src/runtime-template.js` (L1541, L1763).

**The gap (code-confirmed; reproduce RED at runtime first):** the inner-each `_scrml_effect` is emitted DIRECTLY — it does NOT go through `maybeWrapEachPerItemEffect`, so `innerItemsExpr` reads `_scrml_each_item.field` off the **create-time OUTER closure param**, never re-resolved by key. The text/class/handler paths re-resolve via `_scrml_resolve_item` on outer-row REUSE; the inner-each source read does not. So when the OUTER row node is REUSED on a keyed reconcile (same outer key) AND the outer item's iterated field changes (array-replace / push into `@.subitems`), the inner `<each>` stays FROZEN at the create-time outer value.

**Distinct from** the S212-RESOLVED `g-nested-each-no-own-subscription` (that was NO subscription at all — the load-on-demand empty→populated case; the Approach-C `_scrml_effect` wrap fixed it). THIS is reuse-not-rebound: the effect exists but reads the stale outer item.

**Fix direction:** re-resolve the OUTER item by key at effect-fire time so `innerItemsExpr` reads the LIVE outer item. Inject the live-keying prelude (the `maybeWrapEachPerItemEffect`-style `let <outerIter> = _scrml_resolve_item(<outerMount>, <outerKey>); if (===null) return;`) into the inner-each `_scrml_effect` body, using the OUTER reconcile ctx (`currentEachReconcileCtx()` at L730 is the OUTER each's ctx — capture it BEFORE the inner each pushes its own). Prefer reusing the existing helper/prelude over hand-rolling. `_scrml_resolve_item` already exists in the runtime — a runtime-template.js change may NOT be needed; if you DO touch runtime-template.js, the full browser suite + a within-node re-baseline is mandatory (load-bearing shared file).

**Test (adversarial value-asserting happy-dom, RED first):** outer `<each key=@.id>` with an inner `<each in=@.subitems>`; mutate an outer item's `subitems` (array-replace / push) WITHOUT changing its key (forces outer-row REUSE); assert the inner list re-renders with the new subitems. Model on the existing `g-nested-each-no-own-subscription.browser.test.js` harness (same `_scrml_reconcile_list` machinery), but exercise REUSE (same outer key + inner field mutation), not fresh inner mounts. Regression: the S212 no-own-subscription test + the 6nz Bug-AI nested-each test stay green.

---

## Verification (all three)

- `bun run test` (full suite incl. browser) GREEN, **0 regressions** vs the startup baseline. Report the baseline count and the post-fix count.
- R26: each fix re-compiles its reproducer and emits the corrected JS (no E-CODEGEN-INVALID-JS; handler invokes; markup renders; inner each re-renders on outer-row reuse).
- If you touched `runtime-template.js` (item 3): within-node re-baseline + confirm no fixture-shape drift.
- Each item's happy-dom test FAILS pre-fix (paste the red output in your report) and PASSES post-fix.

## Scope boundaries

- ONLY these three gaps. Do NOT refactor the broader each emitter, change the call-ref/engine/bare-`@handler` handler paths (item 1 leaves them intact), or alter top-level (non-each) handler/markup emission.
- If a fix's blast radius exceeds the each per-item machinery, or an item needs a SPEC ruling, STOP that item, report, and continue with the others.

## Report back

Per item: the commit SHA, the red→green test output, the emitted-JS before/after snippet, and any dedup/convergence decision (item 1) or runtime-template.js touch (item 3). Confirm `git status --short` clean and the agent branch name + tip SHA.
