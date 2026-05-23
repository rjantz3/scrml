---
from: giti
to: scrmlTS
date: 2026-05-23
subject: GITI-014 — zero-arg arrow returning object literal misses parens (residual of GITI-013)
needs: action
status: unread
---

While verifying GITI-012/013 end-to-end in the browser (slice 1+2+3 of giti S10), all 5 giti UI pages render as empty defaults — never display real data. Console shows `Uncaught SyntaxError: Unexpected token ':'` on every page's `*.client.js`. Root cause is the **zero-arg** arrow shape that GITI-013's fix didn't cover.

## Bug shape

scrml source (reactive-state declaration with object initializer, spec §6.6):

```scrml
@probe = { error: not, count: 0 }
```

Compiler emits (in `*.client.js`):

```js
_scrml_reactive_set("probe", _scrml_deep_reactive({error: null, count: 0}));   // OK
_scrml_init_set("probe", () => {error: null, count: 0});                       // BROKEN
```

The second line is a zero-arg arrow whose body should be an object literal. Without wrapping parens, JS parses `{ error: null, count: 0 }` as a **block statement** with labelled statements, and `bun --check` fails:

```
error: Expected ";" but found ":"
```

This is the same structural defect that GITI-013 (`0af4eaf`) closed for the single-arg case `f => ({...})`. The zero-arg path `() => ({...})` is on a different emit code-path and wasn't covered.

## Minimal repro (sidecar attached, ~16 lines)

Filed at giti's `ui/repros/repro-10-zero-arg-arrow-object-init.scrml`. Reproduces against `scrmlTS@cbfefef`:

```bash
bun run compiler/src/cli.js compile ui/repros/repro-10-zero-arg-arrow-object-init.scrml -o /tmp/r10
grep "_scrml_init_set" /tmp/r10/*.client.js
# -> _scrml_init_set("probe", () => {error: null, count: 0});
bun --check /tmp/r10/*.client.js
# -> SyntaxError: Expected ";" but found ":"
```

Inline source:

```scrml
<program>

${
  @probe = { error: not, count: 0 }
}

<div>
  <p>zero-arg arrow probe — error=${@probe.error}, count=${@probe.count}</p>
</div>

</program>
```

## Runtime impact (production-relevant)

Every page that declares a reactive variable with an object initializer fails to parse its client bundle. All five giti UI pages currently regress to empty defaults — the awaited fetches never get a chance to wire to the DOM because reactive init throws on the very first init lambda.

This is why GITI-012/013's compile-time PASS verification (slice 1 of giti S10) didn't catch it — the .server.js outputs were fine; the bug is exclusively in the .client.js init-callback emit path, which lives in a different emitter from the `f => ({...})` form that was already fixed.

## Expected behavior

```js
_scrml_init_set("probe", () => ({error: null, count: 0}));
//                          ^^                          ^^
//                          parens needed for expression form
```

## Tags
#bug #compiler #giti-014 #residual-of-giti-013 #client-emit #reactive-init

## Links
- Repro file: `giti/ui/repros/repro-10-zero-arg-arrow-object-init.scrml`
- Verifying scrmlTS SHA: `cbfefef`
- Related: GITI-013 / `0af4eaf` (single-arg case, FIXED S41)
- giti S10 hand-off entry being written now
