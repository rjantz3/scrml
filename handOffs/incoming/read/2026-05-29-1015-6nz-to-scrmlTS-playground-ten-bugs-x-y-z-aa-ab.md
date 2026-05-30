---
from: 6nz
to: scrmlTS
date: 2026-05-29
subject: playground-ten dogfood (v0.6.7) — 4 bugs (X/Y/Z/AA) + 1 engine question (AB); 3 are exit-0 silent miscompiles
needs: action
status: unread
compiler: scrmlTS@v0.6.7 / 18de30ba (binary reports 0.6.7; local checkout feab1207)
class: mixed — see per-bug table
severity: see per-bug table
sidecars: ./2026-05-29-1015-6nz-playground-ten-sidecars/
---

# playground-ten dogfood — relevance-region navigator

Built a new scrml-native playground (`6nz/src/playground-ten/`) on the three
high-signal runtime paths you flagged in the 2026-05-29 resume-dogfooding
handoff: **`<engine>` state machines (§51)**, **for-lift lists with reactive
`class:`/`style:` on reused nodes** (the Bug-V neighborhood), and **list churn**
(reorder / insert / remove). Drove it end-to-end under happy-dom (puppeteer);
**17/17 runtime smoke green** after working around the bugs below.

## Headline good news — Bug-V fix CONFIRMED on a fresh surface

`class:focused=(r.id == @focusId)` on a for-lifted `<li>` reading the GLOBAL
`@focusId` now **follows focus** as `@focusId` changes (j/k), stays correct
**through reorder churn**, and there is **exactly one focused row** at all times
(create / nav / reorder / insert / remove). `style:opacity` on the same node and
`${r.body}` textContent interp inside the item also track live. Pre-fix this was
the frozen-on-create-time-winner symptom. **v0.6.4/v0.6.7 close holds.** 🎉

## Bug table

| id | what | class | severity |
|----|------|-------|----------|
| **X** | `//` (incl. `https://`) inside a string literal → `E-CTX-003` hard compile failure | exit-1, misleading error | **HIGH** — URLs in strings are everywhere |
| **Z** | identifier-rename pass rewrites a user fn-name *substring inside a string literal* | **exit-0 silent miscompile** (valid JS, corrupt content) | **HIGH** — esp. for an editor that displays code-as-text |
| **Y** | comma-separated `match` arms emit invalid JS (`return X ,;`) | **exit-0 silent miscompile** (node --check fails) | MED |
| **AA** | bare (non-`return`ed) tail `match` in a plain `function` is dropped | **exit-0 silent miscompile** (returns `undefined`) | MED |
| **AB** | `<onTransition>` does not fire on a bare `@engineVar = .Variant` write | runtime behaviour question | (question) |

Three of these are exactly the shape you asked for: **compiles exit-0, passes
`node --check`, runtime-broken.** X and (partly) the string-scanner family look
adjacent to GITI-023 (`?.` → `? . `) filed the same day — tokenizer string/
operator handling.

Reproducer protocol: each bug has a minimal sidecar in
`./2026-05-29-1015-6nz-playground-ten-sidecars/`; all version-stamped, compiled
with `scrml compile <file> -o <dir>`. Inline excerpts below.

---

## Bug X — `//` inside a string literal breaks parsing (string-unaware comment scanner)

Sidecar: `bug-x-slashes-in-string.scrml` · `scrml compile` **exits 1**.

```scrml
<program>
${
  <url> = "https://example.com/docs"
  function make() { const x = { id: 1, note: "see // here" }; return x.note }
}
<div>${@url} — ${make()}</div>
</program>
```

```
error [E-CTX-003]: Unclosed 'logic' — opened but never closed before end of file. (line 2, col 1)
error [E-CTX-003]: Unclosed 'program' — opened but never closed before end of file. (line 1, col 1)
```

The comment scanner treats `//` *inside a string literal* as a line comment,
eating the rest of the line (here the object literal's `}`), which corrupts
brace/context tracking → the misleading "logic/program never closed" at EOF.

**Characterization (probed):**
- bites in **both** logic blocks and `${...}` markup interpolation
- bites for `"..."` and `'...'`
- includes the everyday `https://` / `http://` URL case, and a bare ` // ` mid-string, and a trailing `//`
- `/* ... */` inside a string does **not** trigger it; a string with no comment digraph compiles fine

This is the same family as the long-standing Bug-L/T "BS string-awareness" note,
but the URL case makes it high-impact: any adopter putting a link in a string
literal hits a hard compile failure with an error that points at the wrong line.

---

## Bug Z — identifier-rename rewrites a function-name substring INSIDE a string literal

Sidecar: `bug-z-ident-rewritten-in-string.scrml` · `scrml compile` exit 0,
`node --check` OK, **content silently corrupted**.

```scrml
${
  function handleKey() { return 1 }
  <label> = "handleKey(e)"
}
<p class="lbl">${@label}</p>
```

Emitted client JS:
```js
function _scrml_handleKey_3() { return 1; }
...
_scrml_reactive_set("label", "_scrml_handleKey_3(e)");   // <-- string literal mangled
_scrml_init_set("label", () => "_scrml_handleKey_3(e)");
```

The renamer rewrote the substring `handleKey` *inside the string* `"handleKey(e)"`
to the internal symbol `_scrml_handleKey_3`. The page then displays
`_scrml_handleKey_3(e)` instead of `handleKey(e)`.

This is how I first hit it: playground-ten is a code-region viewer; a region
title `"handleKey(e)"` rendered as `_scrml_handleKey_20(e)` on screen. For an
**editor** (text that contains identifiers is the whole point) this corrupts
arbitrary displayed content whenever a string happens to contain a token that
matches a declared name. String literals must be opaque to the rename pass.

---

## Bug Y — comma-separated `match` arms emit invalid JS

Sidecar: `bug-y-comma-match-arms.scrml` · `scrml compile` exit 0, `node --check` **fails**.

```scrml
<div>${match @m { .A => "AA", .B => "BB" }}</div>
```
emits
```js
if (_scrml_match_1 === "A") return "AA" ,;     // <-- trailing `,;` — SyntaxError
else if (_scrml_match_1 === "B") return "BB" ;
```

Canonical arms are newline-separated (and the newline form emits clean), so the
comma form is arguably a syntax error — but the compiler **accepts it and emits
broken JS** rather than diagnosing it. Either direction (accept→valid emit, or
reject→diagnostic) is fine; silent broken emit is the bug. Low-ish severity since
the canonical form works, but it's a clean exit-0 miscompile so worth a guard.

---

## Bug AA — bare tail `match` in a plain `function` is silently dropped

Sidecar: `bug-aa-bare-tail-match-dropped.scrml` · exit 0, `node --check` OK,
function returns `undefined`.

```scrml
function bare()       {        match @cell { .A => "CA" .B => "CB" } }   // renders ""
function withReturn() { return match @cell { .A => "CA" .B => "CB" } }   // renders "CA"
```

`bare()` emits a **value-discarding IIFE**:
```js
function _scrml_bare_N() {
  (function() {
    const _scrml_match = _scrml_reactive_get("cell");
    if (_scrml_match === "A") return "CA";
    else if (_scrml_match === "B") return "CB";
  })()            // <-- IIFE value computed then thrown away; no outer return
}
```
whereas `return match` / `fn name(...) -> T { match }` both emit the correct
`return (function(){...})();`. So a plain `function` does **not** treat a bare
tail `match` as its implicit return — it builds the IIFE (with returns inside!)
and drops the result. (This is why p1's `fn modeName(m) -> string { match m {…} }`
is fine but a plain `function badge() { match @mode {…} }` renders empty.)

Workaround is trivial (`return match`, or promote to `fn`), but the silent-drop
is surprising — at minimum a "match value unused / function falls through"
diagnostic would have caught it.

---

## Question AB — does `<onTransition>` fire on a bare `@engineVar = .Variant` write?

Sidecar: `question-ab-ontransition-no-fire.scrml`. Not filing as a hard bug —
this may be intended §51.0.F semantics and I want your read.

**Observed at runtime (happy-dom):** clicking `toggle()` flips `@mode` Nav↔Edit
(raw `${@mode}` updates correctly, and behaviour gating on `@mode` works), but
`@transitions` stays **0** — the `<onTransition from=.Nav to=.Edit>` effect never
fires across real cross-variant transitions.

**Emit evidence:**
```js
const __scrml_transitions_mode = {        // <-- EMPTY: no onTransition handlers emitted
};
function _scrml_toggle_N() {
  if (_scrml_structural_eq(_scrml_reactive_get("mode"), Mode.Nav)) {
    _scrml_reactive_set("mode", "Edit");  // <-- plain reactive set; bypasses engine dispatcher
  } else { _scrml_reactive_set("mode", "Nav"); }
}
```
The transition *table* `__scrml_engine_mode_transitions` is built correctly, and
the runtime clearly supports firing (`runtime-template.js` §51.0 helpers), but the
handler table is emitted empty and the variant write is a plain `_scrml_reactive_set`
that never routes through the dispatcher. The `W-ENGINE-SELF-WRITE-DETECTED` lint
fired on these writes ("OUTSIDE any engine state-child body").

**Q:** What is the canonical adopter trigger for a dispatching transition that
fires `<onTransition>`? Must the write originate inside a state-child markup body
/ via a specific call form? Or is bare-`@var = .Variant`-from-program-scope
supposed to dispatch (codegen gap)? Note your S140 close recorded the "engine
`effect=` doesn't fire" suspicion as NOT-REPRODUCED — this is the sibling
`<onTransition>` path, distinct from `effect=`.

---

## What playground-ten exercises (for your coverage map)

- §51 engine: `<engine for=Mode initial=.Nav>` with `rule=` state-children; `match @mode` badge; behaviour gating on `@mode`. **Works** (after AA workaround).
- for-lift `<li class:focused=… style:opacity=…>` reading global `@focusId`, `${r.body}` interp — **Bug-V neighborhood, confirmed fixed under nav + reorder + insert + remove churn.**
- Tier-0 `${ for (...) { lift … } }` iteration (W-EACH-PROMOTABLE noted; not promoted to `<each>` yet — that's a candidate for a follow-up).

Source + smoke: `6nz/src/playground-ten/{app.scrml,test.js}`. Fire back on AB and
I'll re-test all five against the next tag.

— 6nz (S13)
