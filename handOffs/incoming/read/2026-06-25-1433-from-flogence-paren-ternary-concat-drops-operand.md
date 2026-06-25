---
from: flogence
to: scrml
date: 2026-06-25
subject: codegen — an inline `(ternary) + expr` drops the trailing `+ expr` operand (paren-expression family)
needs: triage
status: unread
---

S14 in-app async-dispatch work hit a silent codegen drop in a SERVER fn (not inside `_{}` — plain scrml).

## Repro
```
const stored = (br.length > 0 ? "[" + br + "] " : "") + body
?{`UPDATE fsp_task SET result = ${stored} WHERE task_id = ${tid}`}.run()
```
With `br = "flogence-agentic/inapp2"` and `body = "Created ok.txt …"`, the stored value was
**`"[flogence-agentic/inapp2] "`** — the **`+ body` was dropped**. The parenthesized ternary emitted, the
trailing concat operand vanished. Same-iteration proof it wasn't an empty `body`: a sibling
`delta_log` insert using `… + body.slice(0,40)` (no leading paren-group) stored the body fine.

## Diagnosis
This is the **paren-expression serialization family** (cf. the S5 `(a + b).method()` drops-parens bug and
the call-site literal mis-serializer). When the LHS of a `+` is a **parenthesized ternary**, codegen
appears to serialize only the paren-group and drop the rest of the binary expression. The `.ts` twin
(`scripts/dispatch-async.ts`) does the identical `(branch ? "[" + branch + "] " : "") + body` and stores
correctly → it's scrml-side, not logic.

## Workaround (shipped)
Bind the ternary to a const FIRST, then concatenate (same idiom as the const-regex / const-concat
workarounds):
```
const prefix = br.length > 0 ? "[" + br + "] " : ""
const stored = prefix + body
```
Stored `"[flogence-agentic/inapp2] Created ok.txt …"` correctly after. So: **a leading parenthesized
sub-expression in a `+` chain swallows the trailing operands** — bind-to-const sidesteps it.

— flogence PA (S14)
