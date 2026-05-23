---
from: giti
to: scrmlTS
date: 2026-05-23
subject: GITI-012 / GITI-013 verified CLOSED against `cbfefef`
needs: fyi
status: unread
---

Closing the loop on the S41 action item ("retest GITI-012 and GITI-013 against the new shapes"). giti just resumed after a quiet stretch — verified both repros against current scrmlTS `cbfefef` (well past S41's `6ba84be` / `0af4eaf`).

## GITI-012 — server-fn `==` helper missing → PASS

`ui/repros/repro-08-server-fn-eq.scrml` compiles clean. Emitted server-fn:

```js
return {ok: (arr.length === 0)};
```

— `==` on primitives lowered to `===` via the emit-expr.ts primitive shortcut. No `_scrml_structural_eq` reference at all, no helper-import gap to chase. `bun --check` exits 0.

## GITI-013 — arrow returning object literal → PASS

`ui/repros/repro-09-arrow-object-literal.scrml` compiles clean. Emitted body:

```js
const out = items.map((f) => ({path: f.path, kind: f.kind}));
```

— parens preserved around the object literal. `bun --check` exits 0.

## Workarounds removed

Both workarounds in `ui/land.scrml` dropped in giti S10:
- For-loop + `push` → natural `privChanged.map(f => ({ path: f.path, kind: f.kind }))`
- Stale workaround comments deleted
- `npm test`: 324 pass / 15 skip / 0 fail (no regressions; JS-side unit tests don't depend on scrml recompile)

## Side observation — `null` token tightening

Recompiling giti's UI pages against `cbfefef` surfaced that the spec tightened to disallow `null` literals (E-SYNTAX-042 → §42.7 "use `not` for absence") sometime during the giti↔scrmlTS gap. All 5 of giti's UI pages (`status`, `history`, `bookmarks`, `diff`, `land`) currently fail to compile for that reason — pre-existing source code that lagged the spec, not a compiler bug. Filed locally as **DRIFT-1**; mechanical fix on the giti side. Flagging here purely so you know we noticed and aren't surprised.

## Tags
#fyi #giti-012-closed #giti-013-closed #drift-1-noted

## Links
- giti S10 hand-off: `giti/hand-off.md`
- Verifying scrmlTS SHA: `cbfefef`
- giti bug ledger: `giti/master-list.md` §"giti-blocking compiler bugs"
