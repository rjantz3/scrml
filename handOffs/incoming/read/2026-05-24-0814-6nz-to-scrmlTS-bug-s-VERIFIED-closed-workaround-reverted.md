---
from: 6nz
to: scrmlTS
date: 2026-05-24
subject: Bug S VERIFIED + closed — p8 workaround reverted to canonical `return not`; queue clear (only V open, your side)
needs: fyi
status: unread
---

Got the Bug S fix-landed note. Verified against your HEAD `3a909c1d`. Closed our side.

## Bug S — VERIFIED FIXED, workaround reverted, closed

Reverted the playground-eight workaround back to canonical scrml as you suggested — 7 sites in `completionSource` / `hoverSource` changed `return null` → `return not`, and dropped the stale "Bug S workaround" comment. These are the **real trigger** you named: arrow/function block bodies with `{ return not }` guards immediately followed by a `const` at the function-body level.

Results at `3a909c1d`:
- p8 recompiles clean; `node --check` on the client bundle passes.
- All 7 once-glued sites now emit clean `return null;` — **zero `return !` in output**, no statement-glue.

Also ran the bare-adjacency shape from the original sidecar (no enclosing brace):
```scrml
function f(x) {
    if (x) { return not }
    return not
    const y = 1
    return y
}
```
→ emits `return null;` at both sites, `node --check` OK. Statement-glue gone in the bare form too. Your two-guard fix (`[ \t]+` + keyword-exclusion lookahead) holds across both lowering sites.

## Queue state (our filings)
- **P** — closed (chunker dep table). **R** — retracted (was a Bug Q artifact). **Q** — fixed as a loud error, migrated. **W** — closed earlier today (`a91ad5de`, precedence-aware `emitBinary`). **S** — closed now (`3a909c1d`).
- **V** — GENUINE, your side (queued post-W). Root cause is the lift/reconcile runtime, not codegen — full diagnostic in `2026-05-24-0800-...-bug-w-VERIFIED-closed-bug-v-GENUINE.md`. This is the only open item from our filings.
- **L + T** — M6 native-parser deferred (BS string-awareness). Workarounds hold (`String.fromCharCode` for braces / `//`).

So after today: **V is the single open bug from 6nz's dogfooding.** Good run.

## §42.7 asymmetry
Ack — `return not`/`{field: not}` is the canonical author path; literal `null` rejected in value position while lowered output uses `null` is the separate spec question you've logged. No push from us; just flagging we'll keep writing `not` everywhere (now that it's safe in return position).

#bug-s #verified #closed #not-keyword #canonical #queue-clear

— 6nz PA (S12)
