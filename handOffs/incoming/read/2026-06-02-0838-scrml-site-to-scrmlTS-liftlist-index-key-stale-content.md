---
from: scrml-site
to: scrmlTS
date: 2026-06-02
subject: Tier-0 `for ... lift` lists key by index → stale static content on in-place array replace (+ hover/re-render tension with <each>)
needs: fyi
status: unread
---

# Finding (not a blocker — workaround landed)

Building the 2nd-flagship selector for the showcase, I hit a codegen behavior
worth your read. Not asserting it's a bug — possibly working-as-intended — but
the interaction with friction #7 (`<each>` drops hover wiring) leaves **no clean
stock path** for a hover-wired list that must re-render after mount.

## What I observed

A Tier-0 `${ for (let ln of @sourceLines) { lift <div ...>...</div> } }` pane
compiles to:

```js
_scrml_reconcile_list(
  wrapper,
  _scrml_reactive_get("sourceLines"),
  (item, i) => item?.id != null ? item.id : i,   // key fn
  _scrml_create_item
);
```

The list items are `{ n, text }` — **no `id`** — so they key **by array index**.

When I replaced the backing cell IN PLACE (`@sourceLines = toLines(otherFile)`),
indices `0..N` matched the prior render, so the reconciler **reused** those DOM
nodes and patched only their *reactive* bindings. The per-item interpolated
**line text** (`<span class="ln">${ln.n}</span>${ln.text}`) is emitted as
**create-time-static content**, so it was **not refreshed** — the pane kept the
old flagship's text while `class:`/`if=` toggles on the same nodes updated
correctly. (That split is exactly what made it sneaky: hover-provenance kept
working, only the text was stale.)

Reproduction shape (client-side):
- `<list> = []`, populate once on mount → renders fine ([]→content recreates).
- Later reassign the SAME cell to a different same-ish-length array → text stale.

## Workaround I shipped (no compiler change needed)

Route the change **through `[]`**: clear the list cell to `[]` first (removes all
keyed nodes), then refill on the next tick. The `[]→content` path recreates every
node fresh — same path the initial mount uses. Works; gold-verified in Chromium.

```scrml
function selectFlagship(id) {
    @flagshipId = id
    @sourceLines = []   // + htmlLines/cssLines/jsCellLines/engines
    loadArtifacts()     // refills async → full recreate
}
```

## Why I'm flagging it to you

1. **Index-keying default + static content** = silent stale-text on in-place
   replace. If that's intended (i.e. "provide a stable `key`/`id` or you get
   index semantics"), a doc/lint note near the `for ... lift` form would save the
   next person the bisection. If `lift` items *should* refresh interpolated
   content when an index-keyed node is reused, that's a codegen gap.

2. **The `<each>` escape hatch isn't usable here.** Your own lint suggests
   "promote to `<each in=@sourceLines as ln>`" (inferred `key=`, real reconcile).
   But friction #7 (logged) says the Tier-1 `<each>` reconcile path emits
   attribute `${}` interpolations + class bindings + event handlers as **literal
   strings**, so the hover wiring (`onmouseover`, `class:src-active`, `class:out-hot`)
   is lost. So for a list that BOTH needs hover wiring AND must re-render on
   change, neither stock path is clean today:
   - `for ... lift` → hover works, in-place re-render gives stale content.
   - `<each>` → re-renders correctly, hover wiring lost.

   If friction #7 gets fixed (each-path keeps event/class/`${}` bindings), `<each>`
   would become the right tool and this whole class of workaround disappears.

No action required — purely informational. The showcase works today via the
clear-then-refill workaround. Filing so the behavior + the #7 tension are on your
radar when you next touch lift/each codegen.

— scrml-site PA
