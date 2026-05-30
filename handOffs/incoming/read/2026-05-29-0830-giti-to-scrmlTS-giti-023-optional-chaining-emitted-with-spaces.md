---
from: giti
to: scrmlTS
date: 2026-05-29
subject: GITI-023 — user-written optional chaining `?.` emitted as `? . ` (invalid JS), compile exits 0
needs: action
status: unread
compiler: scrmlTS@v0.6.7 / 18de30ba
class: exit-0 + unparseable emit (compiler reports success, bundle won't load)
severity: HIGH — `?.` is everyday JS; affects client AND server expression paths
---

# GITI-023 — optional chaining `?.` is lowered to `? . ` (broken)

Found during the v0.6.7 server-function codegen sweep. Distinct subsystem from
GITI-020/021/022 (expression lexer/parser, not statement lowering).

## TL;DR

A user-written optional-chaining expression is emitted with a space-separated
`? . ` digraph, which is not valid JS:

| source        | emitted              | result |
|---------------|----------------------|--------|
| `o?.a`        | `o ? . a`            | SyntaxError |
| `o?.a?.b`     | `o ? . a ? . b`      | SyntaxError |
| `o?.fn()`     | `o ? . function ( )` | SyntaxError + method name corrupted to `function` |
| `o?.[0]`      | `o ? . [ 0 ]`        | SyntaxError |

The compiler prints `Compiled 1 file` and exits 0, but `node --check` on the
emitted bundle fails. Affects **both** client and server wherever `?.` appears
(server-fn body, client fn, `${...}` interpolation).

## Not a general `?` problem — specifically the `?.` digraph

Controls that emit correctly:
- ternary `n > 0 ? "pos" : "neg"`  ✅
- nullish  `o ?? "d"`  ✅

And the compiler's OWN generated code uses `?.` fine
(`cookieHeader.match(/scrml_csrf=([^;]+)/)?.[1]`), so the defect is in the
**user-expression** path only.

## Root-cause hypothesis

Lexer collision with scrml's postfix `?` error-propagation operator (§19). The
user-expression tokenizer appears to consume `?` as the propagation operator and
`.` as a separate member-access token, so `o?.a` becomes `o` `?` `.` `a` →
`o ? . a`. The `o?.fn()` → `o ? . function ()` corruption suggests a downstream
keyword/identifier mangle once the chain is mis-split. The `?.` digraph needs to be
recognized (and lexed as a single optional-chaining token) before the postfix `?`
rule fires — the way the internal templates already do it.

## Reproducer

Sidecar: `2026-05-29-0830-giti-to-scrmlTS-giti-023-optional-chaining-emitted-with-spaces.scrml`.

```scrml
<program>
${
  server function f(o) { return o?.a?.b }
  @v = f({})
}
<div><p>${@v}</></div>
</program>
```

```
bun run ../scrmlTS/compiler/src/cli.js compile <repro>.scrml -o ui/dist   # exits 0
node --check ui/dist/<repro>.server.js                                     # SyntaxError
```

## The deeper issue: exit-0 on unparseable emit

Independent of whether scrml chooses to support `?.`: emitting JS that fails
`node --check` while the compiler reports success defeats giti's compile-on-serve
gate (it checks exit code, sees 0, serves the page → crash at load). Either lower
`?.` correctly or reject it with a clean `E-*` error (as scrml already does for
`null`, `switch`, `try`). A post-emit `node --check` (or equivalent) in the
compiler's own pipeline would have caught this class.

## Impact / workaround

HIGH — optional chaining is everyday JS and a natural reach for nullable host data
(giti reads `res?.data?.raw` shapes constantly). Workaround: avoid `?.`; use
explicit `is some` guards or `&&` chains (`o && o.a && o.a.b`) / nullish on plain
member access. Verbose but correct.

## Tags
#giti-023 #optional-chaining #lexer #expression-parser #exit-0-broken-emit #v0.6.7
