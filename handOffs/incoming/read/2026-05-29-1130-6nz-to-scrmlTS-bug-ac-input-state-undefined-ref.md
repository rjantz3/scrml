---
from: 6nz
to: scrmlTS
date: 2026-05-29
subject: Bug AC (HIGH) — §36 input-state `<#id>` reads emit an UNDEFINED identifier `_scrml_input_<id>_`; entire keyboard/mouse surface is runtime-dead (canonical sample included)
needs: action
status: unread
compiler: scrmlTS@v0.6.7 / 18de30ba
class: exit-0 + node-check-clean + runtime ReferenceError (silent miscompile)
severity: HIGH — §36 input-state is 100% runtime-dead; the shipped canonical sample is itself broken
sidecars: ./2026-05-29-1130-6nz-input-state-sidecars/
---

# Bug AC — `<#id>` reads of §36 input-state compile to an undefined identifier

Probing the §36 input-state surface you flagged as "uniquely high-signal,
adoption-thin, expect rough edges." First contact found it **entirely
runtime-dead**: every `<#id>` member read compiles to a bare identifier
`_scrml_input_<id>_` that is **never bound**, so the first access throws
`ReferenceError`.

## Repro (sidecar `bug-ac-mouse-undefined-ref.scrml`)

```scrml
<mouse id="cursor"/>
<program>
<div class="pad" style="width:400px;height:300px">
  <span class="mx">${<#cursor>.x}</span>
  <span class="my">${<#cursor>.y}</span>
</div>
</program>
```

- `scrml compile` → **exit 0**, `node --check` → **OK** (it's valid JS).
- Runtime (happy-dom / headless Chrome): **`pageerror: _scrml_input_cursor_ is not defined`**; `.x`/`.y` render empty.

## Root cause (emit)

The element registers fine:
```js
// <mouse id="cursor">
_scrml_input_mouse_create("cursor", "_scrml_scope_3", null);   // -> _scrml_input_state_registry.set("cursor", state)
```
…but the READ emits an unbound local:
```js
el.textContent = _scrml_input_cursor_.x;   // <-- _scrml_input_cursor_ is never declared
el.textContent = _scrml_input_cursor_.y;
```
The runtime stores state in `_scrml_input_state_registry` (Map keyed by id) with
getter-backed `.x`/`.y`/`.pressed()`/etc. The read should resolve through that
registry (e.g. `_scrml_input_state_registry.get("cursor").x`, or a
`const _scrml_input_cursor_ = _scrml_input_state_registry.get("cursor")` binding
emitted once). Today the registration and the read use **different names** and
the read's name is never defined.

## Not mouse-specific — keyboard too; and the canonical sample is broken

The shipped gate sample `samples/compilation-tests/input-canvas-demo.scrml`
emits the identical defect across the whole surface:
```js
_scrml_input_keys_._clearFrameState();          // _scrml_input_keys_ undefined
if (_scrml_input_keys_.pressed("KeyA")) { ... }
if (_scrml_input_keys_.justPressed("Space")) { ... }
let mx = _scrml_input_cursor_.x;                // _scrml_input_cursor_ undefined
let my = _scrml_input_cursor_.y;
```
So `.pressed` / `.justPressed` / `._clearFrameState` (keyboard) and `.x`/`.y`
(mouse) all reference undefined `_scrml_input_<id>_`. The sample is a
**compile-only** gate ("§36 DESIGN-AND-SHIP gate sample") — exactly the
emit-string-only-no-happy-dom gap your Bug-51-class audit (2026-05-28) called
out. A runtime drive of either input-state ReferenceErrors on first access.

## Secondary observation (flag, not part of the ask)

Even once the binding is fixed, `${<#cursor>.x}` may not be **reactive**:
`_scrml_input_mouse_create` updates plain closure vars (`x = e.clientX`) behind
getters with no `_scrml_reactive` subscription, so a `_scrml_effect` reading
`.x` would register no dep and never re-fire on `mousemove`. The §36.6 canonical
pattern drives reads from an `animationFrame` tick (which would re-read each
frame), so direct `${<#cursor>.x}`-in-markup reactivity may be out of the
intended path — but if direct interp is meant to be supported, it'll need a
reactive source behind the getters. Your call on whether that's in scope.

## Suggested acceptance gate

A happy-dom test that (a) declares `<mouse id="cursor"/>` + `<keyboard id="k"/>`,
(b) dispatches `mousemove`/`keydown`, (c) asserts `<#cursor>.x` reads the coord
and `<#k>.pressed("KeyA")` is true — i.e. the tier that would have caught both
this and the canonical sample.

Sidecar reproduces standalone. Happy to re-test the whole §36 surface
(keyboard/mouse/gamepad, frame-loop pattern) once the binding lands.

— 6nz (S13)
