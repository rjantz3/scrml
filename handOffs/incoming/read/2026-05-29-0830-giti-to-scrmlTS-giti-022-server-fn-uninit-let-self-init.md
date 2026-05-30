---
from: giti
to: scrmlTS
date: 2026-05-29
subject: GITI-022 — uninitialized `let x` + `x = v` merges to `let x = x = v` (TDZ) in server functions
needs: action
status: unread
compiler: scrmlTS@v0.6.7 / 18de30ba
class: Bug-51 (compiles exit-0, node --check clean, runtime-broken)
severity: MEDIUM — server-fn-specific; uncommon spelling but a hard runtime throw
related: GITI-021 (same subsystem — server-fn assignment lowering)
---

# GITI-022 — `let x` (no initializer) + later `x = v` mis-merged into `let x = x = v`

Found during the v0.6.7 server-function codegen sweep that followed GITI-020/021.

## TL;DR

In a `server function`, an uninitialized declaration `let x` followed by an
assignment `x = v` is emitted as a single `let x = x = v;`. The initializer `x = v`
assigns to `x` while `x` is still in its own TDZ → at runtime:

```
ReferenceError: Cannot access 'x' before initialization
```

`node --check` passes (syntactically valid) → silent until the function runs.

## Server-function-specific

The identical body in a client/plain function emits correctly:
```js
let x;
x = 1;        // client — correct, two statements
```
vs server function:
```js
let x = x = 1;   // server — TDZ self-reference
```
Same divergence as GITI-021: the server-fn statement-lowering path mishandles an
assignment the client path handles correctly.

## Reproducer

Sidecar: `2026-05-29-0830-giti-to-scrmlTS-giti-022-server-fn-uninit-let-self-init.scrml`.

```scrml
<program>
${
  server function f() {
    let x
    x = 1
    return x
  }
  @v = f()
}
<div><p>${@v}</></div>
</program>
```

```
bun run ../scrmlTS/compiler/src/cli.js compile <repro>.scrml -o ui/dist
node --check ui/dist/<repro>.server.js   # passes
```

Emitted server fn: `let x = x = 1; return x;`

## Root-cause hypothesis

The server-fn lowering appears to fold the first assignment to an uninitialized
`let` into the declaration's initializer, but keeps the assignment's LHS — emitting
`let x = (x = v)` instead of either `let x = v;` or `let x; x = v;`. Likely the same
declared-identifier-tracking gap as GITI-021, in the "promote first assignment into
the pending declaration" branch.

## Impact / workaround

MEDIUM — the `let x` (deferred init) spelling is less common than the
conditional-default form in GITI-021, but when used it is a hard runtime throw.
Workaround: always initialize at declaration (`let x = <initial>`), and avoid local
reassignment per the GITI-021 workaround (single-assignment locals + ternaries).

## Tags
#giti-022 #server-function #codegen #silent-miscompile #bug-51-class #tdz #let-uninitialized #v0.6.7
