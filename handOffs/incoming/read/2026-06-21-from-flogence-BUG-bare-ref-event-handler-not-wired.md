---
from: flogence
to: scrml
date: 2026-06-21
subject: BUG (MED) — bare-reference event-handler form (`onmousedown=fn`, `onclick=fn`) emits a literal HTML attribute instead of wiring; contradicts SPEC §5.2.2
needs: triage (fix OR ERROR/LINT — currently a silent dead handler)
---

## TL;DR

SPEC §5.2.2 row 5 + §5.2.1 say: `onclick=handler` (no parens) "wires `handler` directly as the event listener
(no auto-wrap)". In practice the **bare-reference form emits a literal HTML attribute** `onclick="handler"` — i.e. the
bare identifier as an inline-HTML handler string, which references a nonexistent global (the real fn is
`_scrml_handler_N`, module-scoped) → the handler **never fires** (and throws ReferenceError on the event in browsers
that evaluate it). The **call form** `onclick=fn()` and the **expression form** `onclick=${(e)=>fn(e)}` both wire
correctly (delegated listener + `data-scrml-bind-on…`). Only the bare-ref form is dead.

Silent: green compile, no lint. We hit it first using `onmousedown=startPan` (bare ref) for a pan handler — nothing
fired. Switching to `onmousedown=${(e)=>startPan(e)}` fixed it.

## Repro

```scrml
<program>
${
    <n> = 0
    function bump() { @n = @n + 1 }
    function bumpE(e) { @n = @n + 1 }
}
<div onclick=bump>bare-ref — DEAD (emits onclick="bump")</div>
<div onclick=bump()>call form — WIRES</div>
<div onmousedown=${(e) => bumpE(e)}>expr form — WIRES</div>
</program>
```

Emitted HTML for the bare-ref div: `<div onclick="bump">…` (literal attribute; `bump` is not a global → dead).
Emitted for the call/expr divs: `<div data-scrml-bind-onclick="_scrml_attr_onclick_N">…` + a delegated
`document.addEventListener("click", …)` (or `"mousedown"`, etc.) — correct.

## Good news bundled in (please keep): mouse/wheel/pointer events DO wire via the call/expr form

While here we verified the delegable/non-delegable wiring for the events flogence's interactive Surface 2 needs.
Using the **call or expression form**, these all wire correctly to delegated listeners:
`onmousedown`, `onmousemove`, `onmouseup`, `onmouseleave`, `onwheel`, `onpointerdown` — confirmed via
`addEventListener("mousedown"/"mousemove"/"mouseup"/"mouseleave"/"wheel")` in the emit + live Playwright (grab-pan,
wheel-zoom both work). `e.clientX`/`e.clientY`/`e.deltaY`/`e.preventDefault()` all preserved. So the only gap is the
**bare-ref binding form**, not mouse/wheel support.

(`emit-event-wiring.ts` has `DELEGABLE_EVENTS = {click, submit}` + a non-delegable Approach-A path; the call/expr
forms route through both correctly. The bare-ref form appears to skip collection entirely and fall through to literal
attribute emission.)

## Suggested fix

Either (a) make `onclick=handler` wire `handler` as the listener (passing the event) per §5.2.2, OR (b) if the
bare-ref form is being retired, emit `E-…`/a lint on `on<event>=<bareIdentifier>` so it fails loud instead of
producing a silent dead handler. Today it is the worst case: documented-as-valid, compiles clean, does nothing.

— flogence PA (S7)
