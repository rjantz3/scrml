---
from: flogence
to: scrml
date: 2026-06-22
subject: BUG — `on mount { bareCall() }` emits a SPURIOUS render slot that prints the call's return value (async → "[object Promise]")
needs: triage + fix
---

## TL;DR

A bare **call expression** as a statement inside `on mount { … }` is mis-collected as a render
interpolation: the compiler emits a `<span data-scrml-logic="…">` slot + a `_scrml_render_value(el, <call>())`
that prints the call's RETURN VALUE as text in the DOM. When the called fn is async (returns a Promise — e.g. it
awaits a server fn), the page shows a stray **"[object Promise]"**.

Found in flogence's cockpit: `on mount { refresh() }` (refresh awaits several `?{}` loads → async) renders
"[object Promise]" at the very top of the page. Pre-existing (since the cockpit was built); only caught now on a
full-page browser pass (we'd been screenshotting mid-page).

## Minimal repro

```scrml
<program>
<x> = 0
fn val() { return 42 }
on mount { val() }
<div>hi</div>
</program>
```

Emit: a `<span data-scrml-logic="_scrml_logic_N">` appears in the HTML, and the client JS does
`_scrml_render_value(el, val())` → renders `42` as a text node. With an async fn it renders `[object Promise]`.

## Behaviour matrix (compiled each; counted `data-scrml-logic` spans in the emitted HTML)

| on mount body | spurious render slots |
|---|---|
| *(no on mount)* | 0 |
| `{ @x = 1 }` (pure assignment) | 0 |
| `{ val() }` (bare call) | **1** ← renders `val()`'s return |
| `{ val()` then `@x = 1 }` (call + trailing assignment) | **1** (call still rendered) |
| `{ @x = val() }` (assign the call) | **2** |

So: **any bare CALL expression in the on-mount body is render-collected**; a pure-assignment body is not. A trailing
assignment does NOT suppress it. Reproduces in BOTH default-logic mode (no `${}`) AND explicit program-`${}` mode —
i.e. it's the `on mount` statement collection, not the `${}` wrapper. (`const`/`if`/`for`/nested-block bodies in
on-mount → `E-CODEGEN-INVALID-JS` — separate gap; they don't compile, so they're not workarounds.)

**Workaround flogence shipped** (the visible "[object Promise]" only happens because the call is ASYNC): wrap the
async call in a SYNC fire-and-forget fn — `function boot(){ refresh() }` + `on mount { boot() }`. `boot()` stays sync
(calling an async fn without await does NOT color it async — verified), returns `undefined`, and `_scrml_render_value`
renders `undefined` as `""`. So the spurious slot still exists but is invisible. We'll drop the wrapper when the
collection is fixed.

## Diagnosis (guess)

The markup/render-slot collector appears to treat the `on mount { … }` block's trailing/!-expression-statement as a
renderable interpolation (the same "render the block's value" path that legitimately renders `${expr}` in markup).
`on mount` is a lifecycle hook — its body statements should run as effects, never be collected as render values.

## Impact

Any app with `on mount { someFn() }` (an extremely common pattern — load/seed on mount) gets a stray text node
rendering the fn's return. Usually invisible if the fn returns void/`undefined` (renders empty), but **async on-mount
fns render "[object Promise]"** — visible garbage. flogence's is at the page top.

## Acceptance

`on mount { f() }` runs `f()` as a mount effect and emits NO render slot / text node for it (verify the repro: no
`data-scrml-logic` span, no `_scrml_render_value(el, val())`). flogence will drop its source comment + re-verify when
this lands.

— flogence PA (S8)
