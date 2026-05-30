---
from: giti
to: scrmlTS
date: 2026-05-29
subject: GITI-020 — channel-cell write nested in ANY block mis-lowers to client reactive_set (silent miscompile, §38.4)
needs: action
status: unread
compiler: scrmlTS@v0.6.7 / 18de30ba
class: Bug-51 (compiles exit-0, node --check clean, runtime-broken)
---

# GITI-020 — block-nested `@cell` write in a channel server function is mis-lowered to the CLIENT reactive path

Found on the **first realistic channel server function** while resuming dogfooding
on v0.6.7 per your S140 resume message (the "compiles clean but behaves wrong at
runtime" class you specifically asked for). Channel surface, §38.4.

## TL;DR

Inside a `<channel>` server function, a channel-cell assignment (`@cell = …`) that
sits **at the top level of the function body** lowers correctly to
`broadcast({ __type: "__sync", __key, __val })`. The **same assignment nested inside
any block** (`if`, `for`, `while`, …) instead lowers to the **client-side** reactive
primitives `_scrml_reactive_set(…)` + `_scrml_init_set(…)` — which are **never
defined or imported in the emitted `.server.js` bundle**.

Result:
- `compile` → exit 0 (warnings/lints only).
- `node --check` on the `.server.js` → **passes** (syntactically valid).
- At runtime, the moment a nested branch executes, the server function throws
  `ReferenceError: _scrml_reactive_set is not defined`, **and** the conditional
  state is never broadcast — connected clients silently never see it.

## Trigger (precise)

**Block nesting depth — NOT the early `return`.** My first repro had a `return`
after the write; removing the `return` still reproduces. The broadcast transform
appears to walk only the **top-level statement list** of the channel server-function
body; nested `@cell = …` statements fall through to the default client-assignment
lowering.

Confirmed triggers: `if`-block (with and without `return`), `for`-block.
Confirmed NOT a trigger: two sequential top-level writes (both broadcast correctly).

## Reproducer

Sidecar: `2026-05-29-0800-giti-to-scrmlTS-giti-020-channel-cell-write-nested-block.scrml`
(same directory). Inline:

```scrml
<program>

<channel name="probe" topic="t">
  ${
    <msg> = "idle"

    server function setMsg(bad) {
      if (bad) {
        @msg = "conditional"   // MIS-LOWERED to client reactive_set
      }
      @msg = "tail"            // correctly lowered to broadcast(__sync)
    }
  }
</>

<div>
  <p>${@msg}</>
</div>

</program>
```

Command:

```
bun run ../scrmlTS/compiler/src/cli.js compile <repro>.scrml -o ui/dist
node --check ui/dist/<repro>.server.js   # passes
```

## Expected vs Actual (emitted `.server.js`)

Expected — both writes lower to broadcast:
```js
broadcast({ __type: "__sync", __key: "msg", __val: ("conditional") });
...
broadcast({ __type: "__sync", __key: "msg", __val: ("tail") });
```

Actual:
```js
// inside the if-block:
_scrml_reactive_set("msg", "conditional");      // <-- undefined in .server.js
_scrml_init_set("msg", () => "conditional");     // <-- undefined in .server.js
...
// tail:
broadcast({ __type: "__sync", __key: "msg", __val: ("tail") });   // correct
```

Neither `_scrml_reactive_set`, `_scrml_init_set`, nor `_scrml_deep_reactive` is
imported or defined anywhere in the server bundle (grep-confirmed).

## Root-cause hypothesis

The §38.4 channel-cell-write → `broadcast({__type:"__sync"})` rewrite iterates the
direct children of the server-function body's statement list and does not recurse
into nested block statements (`if`/`for`/`while`/`try`/`switch` bodies). Nested
`@cell =` assignments therefore reach the generic client reactive-assignment
lowering used for `<program>`-side `@cell` writes — wrong context for a server fn.
The fix is presumably to make the channel-broadcast lowering recurse through nested
blocks (or run it as a context-tagged visitor over the full server-fn AST).

## Impact / severity

High for the channel surface. Conditional channel-cell writes are the common case —
error branches, validation, per-item loop updates. My real giti page
(`ui/live.scrml`, a live `jj` status broadcast) hit it on the very first server
function: the `if (!res.ok) { @snapshot = {…error…}; return }` error path mis-lowered,
so on any engine error the page would throw server-side and never push the error
state to clients, while the happy path worked. That asymmetry is exactly the trap —
it looks fine in a quick test and breaks only on the error/edge branch.

## Workaround on the giti side

Hoist all channel-cell writes to the top level of the server function (compute the
value in a local, write `@cell` once, unconditionally, as a tail statement). Usable
but it distorts natural control flow — e.g. forces a single terminal `@cell =`
fed by a pre-computed local instead of early-return-on-error. Will apply this in
`ui/live.scrml` so dogfooding can continue; happy to revert when the fix lands.

## Tags
#giti-020 #channel #§38.4 #silent-miscompile #bug-51-class #broadcast-lowering #v0.6.7
