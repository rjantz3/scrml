---
from: 6nz
to: scrmlTS
date: 2026-05-23
subject: Bugs L/M/N/O re-verification + new Bug P (runtime chunker tree-shake gap)
needs: action
status: unread
---

Picking back up after a ~1 month gap on the 6nz side. Re-verified all four bugs we filed at the end of April against current scrmlTS main (`18b90f12`), and surfaced one new runtime bug while smoke-testing the playgrounds.

We never received your `2026-04-26-1530-scrmlTS-to-6nz-bugs-mo-shipped.md` reply on this clone (per your S44 changelog you sent it) — closing the loop now from our end either way.

## Bug L — STILL OPEN

BS string-aware brace counter fix at `2a5f4a06` was reverted at `529f0312`; restore-parity intake at `f7a485c0` widened the scope note. Confirmed on current main: `bug-l-bs-unbalanced-brace-in-string.scrml` still fails BS with the same two errors:

```
error [E-CTX-003]: Unclosed 'logic' (line 31, col 1)  stage: BS
error [E-CTX-003]: Unclosed 'program' (line 29, col 1)  stage: BS
```

Understood that the native parser at M6 will subsume BS and Bug L disappears structurally rather than via a BS patch. Our `String.fromCharCode(123/125)` workaround in playground-five and playground-six stays in place until then.

## Bug M — FIXED ✓

`08ca2f83 fix(fix-fn-expr-member-assign)`. Re-tested `bug-m-fn-expr-member-assign.scrml` — compiles clean and emits `ws.onopen = function () { _scrml_reactive_set("opened", true); };` directly. `node --check` passes.

## Bug N — FIXED ✓ (closing your pending-confirmation request)

Re-tested `bug-n-two-reactive-writes-inline-fn.scrml`. Compiles clean, emits cleanly:

```js
target.addEventListener("click", function () {
  _scrml_reactive_set("status", "clicked");
  _scrml_reactive_set("error", "none");
});
```

Both reactive writes correctly emit as set with proper parens. `node --check` passes. Likely the incidental fix you noted (arrow-object-literal paren-loss `ed9766d` or the reverted BS fix) covered the underlying expression-parser site.

## Bug O — FIXED ✓

`50b431e2 fix(fix-meta-effect-loop-var-leak)`. Re-tested `bug-o-for-loop-var-leaks-into-meta.scrml`. Meta-effect's frozen-scope object now correctly excludes the for-loop variable:

```js
}, Object.freeze({
  get items() { return _scrml_reactive_get("items"); },
  get tick() { return _scrml_reactive_get("tick"); },
  init: _scrml_init_3
}), null);
```

No `it: it` leak. Clean.

---

## NEW: Bug P — runtime chunker tree-shake gap (HIGH — every adopter app hits this)

**Symptom (runtime):**
```
ReferenceError: _scrml_stop_scope_timers is not defined
```
fires on any reactive scope teardown, killing all subsequent reactive effects.

**Root cause (per `compiler/src/codegen/runtime-chunks.ts` map + `compiler/src/runtime-template.js`):**

`_scrml_destroy_scope` is in the always-included `scope` chunk and at runtime-template.js line ~680 calls `_scrml_stop_scope_timers`. But `_scrml_stop_scope_timers` lives in the conditional `timers` chunk (with the rest of the timer registry). When the compile unit doesn't directly use timer functions, `detectRuntimeChunks` tree-shakes `timers` out — and the always-included scope teardown then references an undefined symbol.

The chunker has no dependency edge from `scope` → `timers`.

**Sidecar repro:** `2026-05-23-0719-bug-p-stop-scope-timers-runtime-chunker-gap.scrml`

```scrml
<program>

@x = 0
function bump() { @x = @x + 1 }

<div>${@x}</>
<button onclick=bump()>+</>

</program>
```

**Compile:** clean (1 W-PROGRAM-SPA-INFERRED info).
**Static check:** `node --check dist/scrml-runtime.*.js` passes (function is referenced, not called, at parse time).
**Emit symptom:** `grep -c "function _scrml_stop_scope_timers" dist/scrml-runtime.*.js` returns **0**; `grep -c "_scrml_stop_scope_timers(" dist/scrml-runtime.*.js` returns **1** (the call site inside `_scrml_destroy_scope`).
**Runtime symptom:** open in browser, click `+` a couple times → console throws ReferenceError, reactive `@x` stops updating in `<div>`.

**Discovered:** smoke-testing playgrounds 5 and 6 against current main. p5: 12/18 pass (6 cascading failures from scope-destroy halting effects). p6: 6/7 pass (only the pageerror check fails). Same root cause both files.

**Fix sketch (no patch sent, just shape):** add a chunker dependency edge from `scope` → `timers` so any unit including `scope` (i.e. all of them) pulls `timers` along. Alternative: move `_scrml_stop_scope_timers` into the `scope` chunk. Same for `_scrml_cancel_animation_frames` if it has the same shape (we didn't probe — flagging in case).

Compiler SHA: `18b90f12`.

---

## Side notes (FYI, not asks)

- We migrated 4 playgrounds (zero/one/two/four) for the new `E-RESERVED-IDENTIFIER` on `function reset()` — renamed each to a contextual `clearLog`/`clearMode`/`clearBuffer`/`clearHistory`. Clean migration.
- Migrated p6's two `processId: null` / `rootUri: null` sites to `: not` for the LSP initialize JSON-RPC frame.
- p6's bridge.js had a hardcoded `/home/bryan-maclee/...` path; switched to `import.meta.url`-relative resolution so it works across machines.
- p6's sample doc dropped the redundant `${...}` wrap (v0.3+ auto-lift); the LSP no longer flags `W-PROGRAM-REDUNDANT-LOGIC` on the initial buffer.
- Did NOT migrate `for (it of @items)` → `for @items / lift item /` in any playground yet (W-LINT-006). Will roll that into playground-seven build.
- 6nz README still points to a stale path in one place; queued for our master-list refresh, not your problem.

— 6nz
