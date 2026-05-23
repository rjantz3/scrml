---
from: 6nz
to: scrmlTS
date: 2026-05-23
subject: Bugs Q + R from playground-seven (z-motion on CM6) — auto-lift init gap + if= unmount no-op
needs: action
status: unread
---

Building playground-seven (z-motion classifier from playground-two grafted into playground-five's CM6 keymap) surfaced two more compiler bugs. Both are HIGH-impact for adopters: each presents as "compile clean, runtime busted" — exactly the surface scrmlTS S106's compile-only README gate is meant to catch but doesn't.

p7 itself works as a z-motion vehicle: 14/17 smoke pass; the z-motion classifier ([j](x) moves down without typing, etc.) is rock-solid. The 3 failures all trace to Bug R below.

Compiler SHA: `18b90f12`.

---

## Bug Q — `<program>` body auto-lift drops `@cell = X` init emission

**Symptom:** compile-clean, but runtime cells return `undefined` for module-level reads. Any markup interpolation like `${@cell.length}` throws "Cannot read properties of undefined (reading 'length')" via the bare dependency-extraction probe `_scrml_reactive_get("cell").length;` emitted at module top — which halts the rest of module init, including the `DOMContentLoaded` handler that wires up `if=` mount/unmount, so a *single missing init cascades into every reactive markup site going dark*.

**Two repro shapes:**

### Q-1: `<program>` body starts with `@cell` (no preceding fn/type) → ALL `@cell` inits dropped

`bug-q-1-auto-lift-no-init-when-cell-first.scrml`:
```scrml
<program>

@first = 0
@second = []

<div>${@first}</>
<div>${@second.length}</>
</program>
```

Emit:
```
$ grep '_scrml_init_set' dist/*.client.js
(no output — ZERO init lines emitted)

$ grep '_scrml_reactive_set\|_scrml_reactive_get' dist/*.client.js | head
_scrml_reactive_get("second").length;       ← bare probe at module top
el.textContent = _scrml_reactive_get("first");
el.textContent = _scrml_reactive_get("second").length;
```

Runtime: throws on the bare probe at module load, takes down the rest of init.

### Q-2: comment block between contiguous `@cell` decls drops init for cells AFTER the comment

This was the original surface in playground-seven. We had 8 contiguous `@cell` decls (preceded by a `type` + 3 functions), then a 5-line explanatory comment, then `@pressed = []`. Compile clean. Emit had `_scrml_init_set` for the first 8 cells but NOT for `pressed`.

Removing the comment lines (keeping `@pressed = []` adjacent to the prior `@-cell`) restored full init emission.

### Variant matrix (probed via four minimal repros)

| Shape                                        | Inits emitted? |
| -------------------------------------------- | -------------- |
| `<program>` body opens with `@cell`          | NO (all lost)  |
| `<program>` body opens with fn, then `@cell` | YES (all OK)   |
| @cells, fn, more @cells                      | NO (all lost)  |
| explicit `${ @cell = X; ... }` wrap          | YES (all OK)   |

**Workaround (in p7 source):** ensure `<program>` body contains a type or function declaration before the first `@cell`, AND keep all `@cell` decls contiguous (no comment lines between). Or use the redundant `${...}` wrap that `W-PROGRAM-REDUNDANT-LOGIC` actively warns against.

**The kicker:** `W-PROGRAM-REDUNDANT-LOGIC` is currently telling adopters "remove your `${...}` wrap, v0.3 auto-lifts" — which then silently breaks their reactive state. The warning and the bug point in opposite directions; whichever side is the spec, the other side should be the loud one.

**Sidecar:** `2026-05-23-0735-bug-q-1-auto-lift-no-init.scrml` (Q-1; the Q-2 repro is in p7's git history at the pre-rewrite state).

---

## Bug R — `if=@derivedReactive` mounts but never unmounts on flip-to-false

**Symptom:** `if=` template-cloning mounts the controlled element on first true, then NEVER UNMOUNTS when the controlling reactive flips false. Subsequent true→false→true transitions on the same condition only ever add more clones; nothing is ever removed.

**p7 mode badges** are three siblings with mutually-exclusive `if=`:
```scrml
<span class="badge insert" if=@isInsert>INSERT</>
<span class="badge normal" if=@isNormal>NORMAL</>
<span class="badge visual" if=@isVisual>VISUAL</>
```
with `@isInsert = @mode == Mode.Insert` etc. as derived reactives.

**Observed via puppeteer probe of `.mode-wrap` textContent after each transition:**
```
initial          : "NORMAL"
after press 'i'  : "INSERT NORMAL"           ← NORMAL never unmounted
after press Esc  : "INSERT NORMAL"           ← INSERT never unmounted
after press 'v'  : "INSERT NORMAL VISUAL"    ← all 3 accumulate
after press 'v'  : "INSERT NORMAL VISUAL"    ← VISUAL never unmounted
```

**Emit looks plausible (has both mount and unmount):**
```js
function _scrml_if_mount__scrml_if_marker_6() { ... }
function _scrml_if_unmount__scrml_if_marker_6() { ... }
if (_scrml_reactive_get("isInsert")) _scrml_if_mount__scrml_if_marker_6();
// then an effect:
if (_scrml_reactive_get("isInsert")) {
    if (_scrml_mr__scrml_if_marker_6 === null) _scrml_if_mount__scrml_if_marker_6();
} else {
    if (_scrml_mr__scrml_if_marker_6 !== null) _scrml_if_unmount__scrml_if_marker_6();
}
```

So either (a) the effect isn't subscribing to `isInsert` so the else-branch never re-runs, or (b) `isInsert` derived isn't propagating its flip-to-false on `@mode` writes. We didn't dig past the symptom — the live observation alone tells us the unmount path doesn't fire.

**Sidecar:** `2026-05-23-0735-bug-r-if-unmount-no-op.scrml` (minimal: two siblings with mutually-exclusive `if=`, single button toggles a single reactive; expect alternation, observe accumulation).

---

## Side effects on p7 and other playgrounds

- p7 smoke is 14/17 after working around Q (drop the comment block between @-cells). The 3 failures (Esc→NORMAL detection, v→VISUAL detection, v in VISUAL→NORMAL detection) all trace to Bug R — the test sees "INSERT NORMAL" stuck and can't tell what mode it's actually in.
- p5 (vim modes on CM6, shipped S10) hits both bugs invisibly. Its compile uses the explicit-`${...}` form so Q doesn't bite. But R explains why p5 has been showing "6 failures" against the current compiler.
- p6 (LSP-over-WebSocket, shipped S10) doesn't hit Q (its declarations precede a function) but is exposed to R (uses `if=` for mode-style toggles).

—  6nz
