---
from: giti
to: scrmlTS
date: 2026-05-23
subject: GITI-015 — `is some` in ternary with computed-member LHS is not lowered
needs: action
status: unread
---

## Bug

`x is some ? a : b` lowers correctly when `x` is a plain identifier. It does **not** lower when `x` is a computed member access — the token sequence `is some` is left literal in the compiled JS, producing invalid output.

## Failure isolation

| Form | Lowered? | Notes |
|---|---|---|
| `x is some ? a : b` | ✅ | plain identifier (control) |
| `if (x is some) ...` | ✅ | if-predicate position |
| `if (arr[i] is some) ...` | ✅ | if-predicate position + computed access |
| `arr[i + 1] is some ? a : b` | ❌ | **ternary + computed-member LHS — broken** |

## Surfaced from

Slice 9 of giti S10 dogfood — porting `parseSyncArgs` from sync.js. The natural translation of the JS `args[i + 1] || null` idiom is `args[i + 1] is some ? args[i + 1] : not`. Author worked around by hoisting:

```scrml
const next = args[i + 1]
remote = next is some ? next : not
```

Hoisting works, but doesn't help in expression position (object-literal value, function argument, return expression) where the author can't introduce a statement.

## Minimal repro

Sidecar attached as `2026-05-23-0703-giti-015-is-some-ternary-with-computed-lhs.scrml` (also lives at `giti/ui/repros/repro-11-is-some-ternary.scrml`).

```scrml
${
    // BROKEN — ternary + computed-member LHS
    export function v1(args, i) {
        return args[i + 1] is some ? args[i + 1] : "fb"
    }

    // CONTROL — plain identifier, lowers fine
    export function control(x) {
        return x is some ? "has" : "none"
    }

    // CONTROL — computed access in if-predicate, lowers fine
    export function controlIfPred(args) {
        if (args[0] is some) return "has"
        return "none"
    }
}
```

Repro against `scrmlTS@cbfefef`:

```bash
bun run compiler/src/cli.js compile repro.scrml -o /tmp/r --mode library
bun --check /tmp/r/repro.js
# → error: Expected ";" but found "is"
#   at line 5: return args[i + 1] is some ? args[i + 1] : "fb"
```

Compiled output for the failing function:

```js
return args[i + 1] is some ? args[i + 1] : "fb"
```

The `is some` is emitted literally. The `control` and `controlIfPred` functions in the same file lower correctly to `(x !== null && x !== undefined) ? ... : ...` and `if ((args[0] !== null && args[0] !== undefined)) ...` respectively.

## Expected emit

```js
return ((args[i + 1] !== null && args[i + 1] !== undefined)) ? args[i + 1] : "fb"
```

Or with deduplication via temp:

```js
const _t = args[i + 1]
return ((_t !== null && _t !== undefined)) ? _t : "fb"
```

(The temp-var form is what an author would hand-write; the inline-expression form is what the existing controls compile to and is also fine.)

## Severity

Author-level. `is some` is the spec-canonical absence-presence check (§42.7). With ternary + computed-LHS not lowering, authors lose the most natural expression-position absence check for any array/object-indexed value. The `if`-statement workaround can't substitute in expression contexts.

## Side context

Discovered in same session as: scrml stdlib is broader than giti had realized — `scrml:path` works end-to-end in library mode, generating `_scrml/path.js` sibling. That validates the stdlib-import path. Filing this is the first **real** compiler bug giti has hit in scrml-as-logic dogfooding (slices 6–9 ported `parseDuration`, `parseStatus`, glob-helpers, `extractSince`, `parseSyncArgs` — ~185 LOC of scrml shipping in giti's runtime path).

## Tags
#bug #compiler #giti-015 #is-some #ternary #computed-member #library-mode

## Links
- Repro: `giti/ui/repros/repro-11-is-some-ternary.scrml`
- Sidecar attached
- Verifying scrmlTS SHA: `cbfefef`
- giti S10 slice 9 commit (incoming): drops the workaround once GITI-015 ships
