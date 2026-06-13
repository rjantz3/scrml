# g-attr-if-fn-chain-head-call-misroute — Tier-2 scope notes (S191 dog-food find)

Sibling of `g-attr-if-fn-call-misroute` (the parent, in-flight fix). SEPARATE code path — a
**fast-follow** dispatch after the parent lands (or PA-direct; the locus is pinned below).

## Symptom (R26-confirmed S191, HEAD ed4b49af)
`if=fn()` used as an if-CHAIN HEAD (`<div if=isHigh()>…</div> <div else-if=@x>…</div> <div else>…</div>`)
emits `_scrml_reactive_get("isHigh")` — reading the fn NAME as a nonexistent reactive CELL — instead
of CALLING `isHigh()`. `isHigh` is a `fn` (0 `_scrml_reactive_set("isHigh")` in emitted JS) → the
head condition is always `undefined` → the head branch NEVER activates; chain falls through to
else-if/else. Silent-wrong-behavior, no diagnostic. Paren form `if=(isHigh())` head = correct (control).

## Locus (pinned)
- **Consumer:** `emit-event-wiring.ts:1280-1302` — the `_update_chain_*` condition cascade. For each
  positive branch it computes `condCode`:
  - `if (branch.condition?.raw)` → `emitExprField(...)` (the EXPR path — correct for calls).
  - `else if (branch.condition?.name)` → `condCode = _scrml_reactive_get(JSON.stringify(varName))`
    (the VARIABLE-REF path). **A call-ref head's `branch.condition` carries `.name = "isHigh"` →
    hits this path → reads the fn name as a cell. THE BUG.**
- **`branch.condition`** is an AST-level object on the `if-chain` node's `branches[]` (set by the
  parser / ast-builder, registered through `emit-html.ts:733/749` unchanged). For a call-ref head it
  is variable-ref-shaped (`{name}`), losing the "it's a CALL" info.

## Fix shape (two clean options — agent/PA picks)
1. **Consumer-side (smallest):** at `emit-event-wiring.ts:1296`, before the `?.name` variable-ref
   path, add a call-ref case — if `branch.condition` is a call-ref (has `.name` + is a call shape /
   carries `args`/`argExprNodes`), emit `condCode = `${name}(${(args ?? []).join(", ")})`` (a real
   call), mirroring the parent's standalone fix. The surrounding `_update_chain_*` is ALREADY wrapped
   in `_scrml_effect` → dynamic tracking handles the fn's internal cell reads (NO interprocedural
   analysis — same survey correction as the parent).
2. **Upstream (parallels the parent):** where the if-chain branch condition is built from the
   `if=`/`else-if=` attr value, store a call-ref as expr-form `{raw: "name(args)", exprNode: <CallExpr>}`
   so the existing `branch.condition?.raw` → `emitExprField` path compiles it as a call. Confirm the
   exact build site in `ast-builder.js` (the `if-chain` node `branches[].condition` construction).

Option 1 is the tighter change; option 2 unifies the call-ref representation with the standalone fix.
Determine which after the parent lands (the parent fix may introduce a reusable call-ref→condExpr
helper that option 2 can share).

## Tests
- `if=fn()` as a CHAIN head (with else-if + else) → the head's `condCode` is `fn()` (a call), NOT
  `_scrml_reactive_get("fn")`; assert the head branch activates when the fn returns true.
- Control: `if=(fn())` chain head still correct; `if=@cell` / `else-if=@cell` chain branches unchanged.
- R26: compile a chain with a `if=isHigh()` head; assert `_scrml_reactive_get("isHigh")` is ABSENT and
  `isHigh()` (call) present in `_update_chain_*`; `node --check` clean.

## Survey correction (do NOT build interprocedural analysis)
Same as the parent: the runtime `_scrml_effect` (which already wraps `_update_chain_*`) dynamic-tracks
the cells the fn reads. The naive `condExpr: "isHigh()"` does NOT render-once — the effect re-runs on
any tracked read change. Empty compile-time refs are fine.
