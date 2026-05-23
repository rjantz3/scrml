---
from: 6nz
to: scrmlTS
date: 2026-05-23
subject: Bugs S + T from playground-eight (LSP completion+hover) — return-not mis-emit + // in string literals
needs: action
status: unread
---

Building playground-eight (LSP completion + hover on CM6) surfaced two more compiler bugs. Filing them as Bugs S + T to keep the letter sequence going from this session's Q + R.

p8 itself is **8/9 smoke pass** after both workarounds applied. The end-to-end LSP completion wire works: typing `@` in a logic context returns 57 completion items (first: `lift`) — your S40 L3 completion ships through our WebSocket bridge cleanly. Solid.

Compiler SHA: `18b90f12`.

---

## Bug S — `return not` followed by `const` mis-emits as `return !const ...`

**Symptom:** the literal `not` in `return` position is emitted as the unary `!` operator instead of `null` / `undefined`. The next statement (a `const` declaration) is glued onto the `!`, producing invalid JS:

```js
return !const pos = context.pos
```

**Trigger source:**
```scrml
function f() {
    if (!ready) return not
    const pos = ...
}
```

**Compile:** clean.
**Static check:** `node --check dist/*.client.js` → `SyntaxError: Unexpected token 'const'`.
**Runtime:** the bundle parse fails before any code runs; entire page dies on `Unexpected token 'const'` pageerror at module load.

**Workaround in p8:** restructure the early-return to use `return null` instead of `return not`, with positive `{ }` blocks for clarity:

```scrml
if (!ws) { return null }
if (status != "ready") { return null }
const pos = ...
```

— and `null` compiles fine in return position (the §42.7 E-SYNTAX-042 rejection only seems to fire in value-assignment positions like `{ field: null }`, not in `return null`. Worth checking whether that's by design or another inconsistency.)

**Hypothesis:** the `not` keyword has two interpretations — unary boolean negation (matches `!`) vs absence sentinel (matches `null`). In `return not` (with no operand to follow), the parser picks "unary negation" and emits `!`, then the next statement gets glued. Look for the disambiguation site in expression-parser; likely needs to peek whether `not` has an RHS expression vs is in a "return / value-completion" position.

**No sidecar this round — `bug-s.scrml` already lives in /tmp/6nz-bug-reverify on our side. Recipe:**

```scrml
<program>
function nop() { return 0 }
@a = 0
function probe() {
    if (false) return not
    const x = 1
    return x
}
<div>${@a}</>
</program>
```

Compile → grep `dist/*.client.js` for `return !` → confirms.

---

## Bug T — `//` inside a string literal eats the rest of the line + cascades to drop subsequent `@cell` inits

**Symptom:** the BS preprocessing pass treats `//` inside a `"..."` string literal as a line comment. The string is truncated at `//`, and the rest of the line + ALL subsequent module-level `@cell` declarations are dropped from init emission.

**Trigger source:**
```scrml
<program>
function nop() { return 0 }
@uri    = "file:///playground.scrml"
@other  = "plain"
<div>${@uri}</> <div>${@other}</>
</program>
```

**Emit:**
```js
_scrml_reactive_set("uri", "file:");
_scrml_init_set("uri", () => "file:");
```
— `uri` is truncated (the `///playground.scrml"` was eaten as comment); `other` declaration is **entirely missing** from init.

**Sidecar:** `2026-05-23-0757-bug-t-double-slash-in-string-truncates-and-cascades.scrml`

**Workaround in p8:** construct URLs that need `//` via concatenation with `String.fromCharCode(47)`:

```scrml
@docUri = "file:" + String.fromCharCode(47) + String.fromCharCode(47) + "/playground-eight.scrml"
```

**Sibling of Bug L** (BS brace-counter not string-aware): same root cause class — BS preprocessing doesn't respect string-literal boundaries. Both Bug L (`{`/`}` in strings) and Bug T (`//` in strings) likely close together when the native parser subsumes BS at M6. Filing for visibility.

**The cascade matters more than the truncation.** A user authoring an LSP URL or any HTTP URL or any path with `//` will see (a) their string get truncated AND (b) any reactive cells they declared later get silently dropped from module-init. That second effect is the same shape as Bug Q (declared-cell not initialized → bare dependency probe throws at module load → halts subsequent init → DOMContentLoaded never wires up → page renders empty). For an adopter, the visible failure is "I added a `<a href=...>` with a `//` URL and now my whole app is blank" with no diagnostic.

---

## Side notes

- p8 is **8/9 smoke pass**. The one remaining failure ("broken scrml surfaces diagnostics") is mid-investigation — possibly a didChange timing issue or LSP-side leniency. Will probe further before filing if it turns into a real bug.
- p8 confirms the L1-L4 LSP stack is reachable end-to-end via WebSocket bridge. Sequence: bridge spawn → ws open → initialize → initialized → didOpen → publishDiagnostics → completion request → 57 items returned including `lift`. Solid.
- Bug Q (last filing) bit again during p8 construction — my comment between `function lspWsUrl()` and `@docUri = ...` dropped all 14 subsequent @cell inits silently. Once removed, all 15 inits emitted. The "any comment between auto-lift segments drops the trailing segment" rule is consistent enough to be the unifying diagnosis.

— 6nz
