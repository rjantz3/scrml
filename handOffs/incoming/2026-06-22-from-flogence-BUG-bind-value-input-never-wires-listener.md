# BUG — `bind:value` emits the bind attribute but NO input/change listener → typed input never reaches the cell

**From:** flogence (dogfood) · **Date:** 2026-06-22 · **Severity:** HIGH (silent runtime; green compile)
**Class:** the standing lesson — green compile + correct-looking emit, broken at runtime (caught by RUNNING it, not by the compiler).

## TL;DR

A two-way `bind:value=@cell` on an `<input>` compiles clean and emits the
`data-scrml-bind-value="_scrml_bind_bind_value_N"` attribute on the element — but the compiler/runtime
wires **no `input` (or `change`) event listener** to read it back. So **typing into the input never updates
the bound cell**. The cell stays at its initial value; any server fn that reads `@cell` sees the stale value.
This silently breaks every text input that uses `bind:value` for its data.

In flogence's cockpit this killed BOTH prompt boxes (the main "voice relay" + a new per-node route box): the
user types a prompt, submits, and the router fn early-returns because `@promptText`/`@nodePrompt` is still `""`.

## Minimal repro

```scrml
<program db="./x.db">
  ${
    <text> = ""
    function submit() { /* reads @text */ append(@text) ... }   // @text is ALWAYS "" no matter what's typed
  }
  <form onsubmit=submit()>
    <input type="text" bind:value=@text placeholder="type here"/>
    <button type="submit">go</button>
  </form>
  <p>cell = ${@text}</p>      // never changes while typing
</program>
```

Type into the input → `${@text}` never updates; `submit()` sees `@text == ""`.

## Evidence (from flogence's emit, src/dist/app.client.js + scrml-runtime.*.js)

1. The element emits the bind attribute, as expected:
   `<input ... data-scrml-bind-value="_scrml_bind_bind_value_71" ...>`
2. **The bind id `_scrml_bind_bind_value_71` is referenced NOWHERE else** — only in that template string. No
   handler, no registry entry, no hydration reads it. (`grep -c "bind_value_71"` → 1, the template only.)
3. **`data-scrml-bind-value` is queried NOWHERE** — `grep -rco data-scrml-bind-value src/dist/*.js` → only the
   2 template attributes; **0 hits in any runtime chunk** (contrast `data-scrml-each-mount`, which the runtime
   DOES `querySelectorAll` + hydrate).
4. **No input/change listener exists in the whole app.** Every `addEventListener(...)` emitted:
   `mousedown, mousemove, mouseup, mouseleave, wheel, click, submit, beforeunload, DOMContentLoaded` — **no
   `input`, no `change`.**

### Contrast — `onclick` (which works)
`onclick` emits `data-scrml-bind-onclick="_scrml_attr_onclick_N"` AND a `_scrml_click` registry mapping each id
to its handler, hydrated via a delegated document-level `click` listener
(`t.getAttribute("data-scrml-bind-onclick")` → call handler). `bind:value` has the attribute but **no equivalent
read-side registry/listener** — the cell→DOM direction may exist (clearing `@cell=""` blanks the field), but the
**DOM→cell direction is entirely missing.**

## Confirmed empirically (live, headless Chromium against the running dev server)

- Type into the input (real key events, `keyboard.type`) → `window._scrml_reactive_get("nodePrompt")` returns
  `""`. Blurring (Tab → would fire `change`) — still `""`.
- Directly `window._scrml_reactive_set("nodePrompt", "…")` then click submit → the router runs correctly and
  routes/creates the task. So the bug is **purely the input→cell binding**, nothing downstream.

## Workaround (in flogence now; revert when fixed)

An explicit `oninput` handler DOES wire (it emits a real `addEventListener("input")`), so we write the cell by
hand alongside the (display-only) `bind:value`:

```scrml
function setText(e) { @text = e.target.value }
...
<input type="text" bind:value=@text oninput=${(e) => setText(e)} .../>
```

Verified: with this, real typing updates `@text` and the round-trip works end-to-end.

## Ask

Make `bind:value` wire the DOM→cell direction — emit an `input`-event hydration for `data-scrml-bind-value`
(parallel to the `_scrml_click` registry for `onclick`), so the bound cell stays in sync with what's typed.
When it lands, flogence will drop the two `oninput` workarounds (a 2-line revert per box) — same adoption loop
as the S212 match-arm fixes.

**Acceptance:** the minimal repro above — typing updates `${@text}` live and `submit()` reads the typed value —
with NO explicit `oninput` handler.
