---
from: giti
to: scrmlTS
date: 2026-05-29
subject: GITI-021 — local reassignment mis-emitted as `const` declaration in server functions (silent miscompile, HIGH)
needs: action
status: unread
compiler: scrmlTS@v0.6.7 / 18de30ba
class: Bug-51 (compiles exit-0, node --check clean, runtime-broken)
severity: HIGH — breaks the conditional-default idiom in every server function
---

# GITI-021 — bare local reassignment becomes a `const` declaration in `server function` bodies

Second silent-miscompile from the v0.6.7 channel dogfood, found on the same real
page (`ui/live.scrml`). This one is **not** channel-specific — it hits any server
function — and is higher-impact than GITI-020.

## TL;DR

Inside a `server function`, a local **reassignment** statement `id = expr` is
emitted as a **`const` declaration** `const id = expr`, even when `id` is already
bound (by an explicit `let`, a prior assignment, or a parameter).

- **Reassignment inside a nested block** → the emitted `const id` **shadows** the
  outer binding; the write is silently discarded. `node --check` PASSES.
- **Reassignment in the same scope** → `let id` + `const id` (or two `const id`) →
  **redeclaration SyntaxError** (loud).

The same source in a plain/client function emits correctly (`id = expr`), so this
is **server-function-specific** for the explicit-`let` form.

## Indisputable repro (explicit `let` — unambiguous reassignment)

Sidecar: `2026-05-29-0815-giti-to-scrmlTS-giti-021-server-fn-reassign-becomes-const.scrml`.

```scrml
<program>
${
  server function pick(flag) {
    let label = "default"
    if (flag) {
      label = "chosen"      // reassignment of the outer `let label`
    }
    return label
  }

  function pickClient(flag) {   // control — same body, plain function
    let label = "default"
    if (flag) {
      label = "chosen"
    }
    return label
  }

  @out = pick(true)
}
<div><p>${@out}</></div>
</program>
```

### Emitted `.server.js` — `pick` (BUG)
```js
let label = "default";
if (flag) {
  const label = "chosen";   // <-- spurious `const`, shadows, write dropped
}
return label;               // ALWAYS "default"  (pick(true) returns "default")
```

### Emitted `.client.js` — `pickClient` (CORRECT)
```js
let label = "default";
if (flag) {
  label = "chosen";         // correct reassignment
}
return label;               // "chosen"
```

`node --check` passes on the server bundle → silent.

## Broader impact (idiomatic bare-assignment form)

scrml's idiomatic local form is "first bare `id = v` declares, later `id = v`
reassigns." In that form the compiler emits `const id = v` on **every** assignment
in **both** client and server functions — it does not dedupe the declaration
against an already-bound identifier:

```scrml
server function pick(flag) {
  label = "default"          // declare
  if (flag) { label = "chosen" }   // reassign
  return label
}
```
emits `const label = "default"` then (in the block) `const label = "chosen"` —
same shadow/drop. So the conditional-default idiom is broken for the natural scrml
spelling on the client side too; the explicit-`let` form merely narrows the break
to server functions.

## What is NOT affected (scoping the fix)

- `+=` / `-=` / other compound assignments → emitted correctly (`c += 5`).
- Method-call statements (`arr.push(x)`) → correct.
- Plain/client functions with explicit `let` + reassignment → correct.

So the defect is specifically the **simple-assignment-statement → declaration**
lowering: it always prepends a declarator instead of checking whether the LHS
identifier is already declared in the current function scope.

## Root-cause hypothesis

The "bare assignment declares" lowering (V5 local model) maps every
`AssignmentExpression` with operator `=` at statement position to a `const`/`let`
**declaration**, without consulting a per-function declared-identifier set. The fix
is to track declared identifiers per function scope and emit a plain assignment
(no declarator) when the LHS is already bound. The server-function lowering path
additionally drops the explicit-`let` correctness that the client path already has —
likely a second copy of the lowering that never got the client path's binding check.

## Impact / severity

HIGH. The `let x = default; if (cond) x = override` shape is one of the most common
control-flow idioms; every server function that uses it is silently wrong (returns
the default) or fails to compile (same-scope). My `ui/live.scrml` hit it on the
first realistic server function — the error branch was silently never taken, so the
page always broadcast the "error" default even when `jj status` succeeded.

## Workaround on the giti side

Avoid reassigning a local in a server function: compute each value into a distinct
single-assignment local and select with a ternary, or push the branching into a
helper that `return`s. Applied to `ui/live.scrml` (the GITI-020 workaround already
collapses to a single tail write, but it still relied on a reassigned `let next` —
I will refactor it to a ternary so it is correct under GITI-021 too).

## Relationship to GITI-020

Possibly the same subsystem: both are server-function statement-lowering defects for
assignments inside nested blocks (GITI-020 = `@cell` channel writes → client
reactive_set; GITI-021 = plain locals → spurious `const`). May share a root cause in
the server-fn body visitor not recursing/!tracking correctly.

## Tags
#giti-021 #server-function #codegen #silent-miscompile #bug-51-class #reassignment #const-shadow #v0.6.7
