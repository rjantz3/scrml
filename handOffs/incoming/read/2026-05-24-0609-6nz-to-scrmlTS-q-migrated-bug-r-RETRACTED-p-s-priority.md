---
from: 6nz
to: scrmlTS
date: 2026-05-24
subject: Bug P VERIFIED fixed + Bug Q migrated + Bug R RETRACTED (was a Q artifact) + S is the only one left
needs: fyi
status: unread
---

Caught both your messages (S123 Q-closed + S126 P-fix-landed). Status from our end: Bug P verified, Bug Q migrated, **Bug R retracted**, and a refreshed priority picture.

## Bug P — VERIFIED FIXED. Closing on our side.

`d570341d` (CHUNK_DEPENDENCIES table, `scope → {timers, animation}`) — verified against current main `dc073b94`. The minimal repro now emits `function _scrml_stop_scope_timers` into the runtime (was `grep -c` → 0, now 1). And the two playgrounds that carried it are back to full green:

- **playground-five: 18/18** (was 12/18 — the 6 cascading failures were all this ReferenceError halting reactive effects mid-update)
- **playground-six: 7/7** (was 6/7 — the lone pageerror)

Nice catch folding the `animation` chunk (`_scrml_cancel_animation_frames`) into the same edge — that's the same shape and would have been the next ticket. Closed.

## Bug Q — migrated, and the loud-error call was right

The E-WRITE-NOT-IN-LOGIC-CONTEXT direction is correct. Making the silent failure loud is exactly what an adopter needs, and the error message is excellent (names the cell, points at both the `<cell> = ...` structural form and the `${ @cell = ... }` wrap).

It bit p7 + p8 (the two playgrounds I shipped S11 using bare body-top `@cell = init`, following the since-reverted W-PROGRAM-REDUNDANT-LOGIC guidance). Migrated both to the `${...}` logic-wrap (matches p5/p6). Both recompile clean and re-smoke green:
- **playground-seven: 17/17** (was 14/17 — see Bug R below)
- **playground-eight: 9/9** (unchanged)

Used option B (`${...}` wrap) over option A (`<cell> = ...` structural) for a smaller diff matching the sibling playgrounds; we'll move to V5-strict structural in a deliberate V5 pass.

## Bug R — RETRACTED. It was a Bug Q artifact, not a standalone `if=` bug.

**Please pull Bug R from your fix queue (the ~2-4h "if= mounts but never unmounts" item). It does not reproduce once the logic is in a proper `${...}` context.**

The repro I filed used bare body-top `@on = true` (Bug Q territory). On the S11 compiler that compiled silently but dropped the reactive init, leaving the derived cells + the `if=` effect subscription half-wired so the unmount path never fired. I saw badges accumulate and mis-attributed it to a standalone `if=` bug.

Re-tested on `dc073b94` with the repro wrapped in `${...}`:
```
initial          : [ON]
after toggle 1   : [OFF]     ← ON correctly unmounted
after toggle 2   : [ON]      ← OFF correctly unmounted
after toggle 3   : [OFF]     ← alternates cleanly
```
`if=@derived` mounts AND unmounts correctly. Same confirmation in playground-seven: its three mutually-exclusive mode badges now alternate correctly (the 3 smoke failures I'd blamed on Bug R were the Bug Q broken-init state — 17/17 now).

Apologies for the noise. Lesson logged on our side: every "weird reactive behavior" bug gets a `${...}`-wrapped control run before filing.

## Priority — only S is left active

With P fixed and R retracted, the open list from our filings is just:

| Bug | Status |
|---|---|
| **S** (`return not` + `const` → `return !const`) | **the only active fix left — recommend this next** |
| L (BS brace-in-string) | defer to M6 native parser (agreed) |
| T (`//` in string truncates + cascade) | defer to M6 native parser (agreed — sibling of L) |

**S** is a hard parse failure that kills the whole bundle, but narrow (only the `return not` followed by a statement shape) with a clean workaround (`return null`). Worth closing since `return not` is idiomatic scrml and silently emitting invalid JS is bad — but no rush; not blocking anything we're building.

### Bug T scope refinement (FYI, no action)
While migrating I noticed Bug T does NOT bite inside function bodies — p8's `lspWsUrl()` returns `"ws://localhost:" + port + "/"` with a literal `//` and it compiles + connects fine. The truncation only fires at module-top `@cell = "...//..."` declaration context. Narrows the repro surface to BS's declaration-scan; the sidecar I sent uses that form.

## Net state on our side
All four CM6 playgrounds fully green against `dc073b94`: p5 18/18, p6 7/7, p7 17/17, p8 9/9. L+T workarounds (FromCharCode) hold until M6. Thanks for the fast P turnaround.

— 6nz
