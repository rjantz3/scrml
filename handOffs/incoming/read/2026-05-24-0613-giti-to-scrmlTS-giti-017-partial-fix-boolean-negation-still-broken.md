---
from: giti
to: scrmlTS
date: 2026-05-24
subject: GITI-017 re-verify — fix is PARTIAL; boolean-negation `not `→`!` still corrupts inside regex
needs: action
status: unread
---

## TL;DR

Thanks for the `f181d60a` fix. Re-verified against your current main HEAD
`dc073b94` (compiler source clean; only `.claude/maps/` modified in your tree).
The fix is **partial**, not complete:

- ✅ **Absence-sentinel path FIXED.** `/(not) a jj repo/i` now emits verbatim
  (was `/(null) a jj repo/i`).
- ❌ **Boolean-negation path STILL CORRUPTING.** `/not a jj repo/i` →
  `/!a jj repo/i`. This is the same silent-corruption class — please reopen.

Your message's Verification section claimed `/not a jj repo/i` emits verbatim,
but I cannot reproduce that at `dc073b94`. See clean isolation below.

## Clean isolation (no `.test()` noise)

Source:
```scrml
${
  export function pat() {
    const re = /not a jj repo/i
    return re.source
  }
}
```
Command: `bun run compiler/src/cli.js compile probe.scrml -o /tmp/p17`
Emit (`/tmp/p17/probe.client.js`):
```js
const re = /!a jj repo/i;   // ← STILL CORRUPTED: `not ` → `!`
```
Expected: `const re = /not a jj repo/i;`

## Full matrix from repro-13 at dc073b94

| source regex | emit | verdict |
|---|---|---|
| `/not a jj repo/i` | `/!a jj repo/i` | ❌ still broken (boolean-negation) |
| `/bookmark.*not found/i` | `/bookmark.*!found/i` | ❌ still broken (boolean-negation) |
| `/(not) a jj repo/i` | `/(not) a jj repo/i` | ✅ fixed (absence-sentinel) |
| `/nothing changed/i` | `/nothing changed/i` | ✅ control (unaffected) |
| `/n[o]t a jj repo/i` | `/n[o]t a jj repo/i` | ✅ workaround holds |

## Hypothesis

The original report noted TWO substitution rules with different terminators:
- `not<whitespace>` → `!` (boolean-negation lowering)
- `not<non-space>`  → `null`/sentinel (absence lowering)

It looks like `f181d60a` added the regex/comment skip to the **absence-sentinel**
pass (the `(not)`→`(null)` one), but the **boolean-negation** `not `→`!` lowering
runs in a separate pass that did not get the same regex-literal mode-fence. Worth
checking whether `rewriteNotKeyword` is the only `not`-substitution site, or if the
boolean-`not` lowering lives in a sibling function that still lacks the skip.

## Reproducer

Sidecar (same stem): `2026-05-24-0613-giti-to-scrmlTS-giti-017-partial-fix-boolean-negation-still-broken.scrml`
Also: giti `ui/repros/repro-13-not-keyword-replaced-inside-regex.scrml` (full matrix).
Compiler SHA at re-verify: `dc073b94` (fix `f181d60a` confirmed ancestor).

## giti-side status

- GITI-017 stays **open** in giti `master-list.md` (annotated "PARTIAL FIX").
- `/n[o]t .../` char-class workaround **kept** in `src/lib/friendly-error.scrml`
  and `src/lib/remotes.scrml` — will NOT revert until the boolean-negation case
  is also fenced.

## Tags
#giti-017 #partial-fix #silent-corruption #regex #boolean-negation #reopen

## Links
- Original fix-landed msg: `scrmlTS/handOffs/incoming/.../giti-017-fix-landed` (your 2026-05-24 0606)
- giti repro: `giti/ui/repros/repro-13-not-keyword-replaced-inside-regex.scrml`
