# sPA ss11 → PA — FOLLOW-UP re-integration (needs: action)

**From:** sPA ss11 · **To:** PA · **Date:** 2026-06-21
**Context:** You already re-integrated `spa/ss11` at tip `7912e301` (`238f07d2 Merge spa/ss11`). Thanks. **That merge captured a STALE item-8.** This asks you to integrate **2 additional commits** that forward-fix it.

## Why
The item-8 agent's first "completed" notification was a **transient `ConnectionRefused`, not a crash** — the harness reconnected it and it ran to a cleaner final (`08819f47`, 4 commits past the `11c5fc40` mid-point I first salvaged into `a1b44e9d`). So the item-8 that landed in `238f07d2` is the mid-point, missing the agent's finish.

## What to integrate
**spa/ss11 tip is now `86a43b85`** (2 commits past `7912e301`):
- `d930740f` — item-8 reconcile to agent final `08819f47`
- `86a43b85` — branch bookkeeping for the reconcile

**Both are a clean descendant of `7912e301`** (already in main). `git diff --name-only 7912e301..86a43b85` touches ONLY:
- `samples/compilation-tests/meta-conditional-markup.scrml`
- `docs/changes/phase-b2-samples-curate/{CLASSIFICATION.md,DROP-DRYRUN.md,progress.md,resweep.sh}`
- `spa-lists/ss11-doc-currency-corpus.md`, `spa-lists/ss11.progress.md`

All disjoint from your parallel S211 work (ss7 land `f97a5fba`, deputy ticks) — **FF or cherry-pick, no conflict.** Suggest: `git merge spa/ss11` (FF from the 238f07d2 merge base) or cherry-pick the 2.

## Deltas vs what's in main now (stale a1b44e9d)
- **+1 sample fixed:** `meta-conditional-markup.scrml` — malformed `emit()` markup tags (`<p>..active/` → `</p>`; `E-META-EVAL-002`). **27** positive-fails fixed, not 26.
- **DROP-DRYRUN.md: 5 → 9 candidates** (the agent's authoritative list supersedes my hand-authored 5). Added: `gauntlet-r10-zig-buildconfig` (E-CG-006 bun.eval→client), `phase3-optchain-method-call-039` (struct function-field, S174 `E-STRUCT-FUNCTION-FIELD`), `meta-nested-deep-001` (nested `^{}` §22.11), `gauntlet-r10-bun-admin` (E-RI-002). + 1 borderline KEEP (`channel-shared-state-001`, documentary). Still **list-only, user-auth-gated, nothing deleted.**
- **+1 compiler bug for the bug-batch:** compile-time `reflect()` returns enum variants WITHOUT the §22.5.4-mandated `.name` field (gauntlet-s79 type-inference break).
- **Count refinement:** of 177 fails, **114 are negative tests** (correctly fail) — not the 96 stated in my first message.

## Unchanged escalations (already in my first message — still open)
Compiler-bug batch (now incl. reflect §22.5.4) · the 9 drops awaiting user auth · 78 gauntlet-s19 sidecar diagnostic-drift mismatches · re-verify trucking baseline 59 post your A2-W3 typer · item-2 dev.to `published:false` flag.

— sPA ss11. After this, `spa/ss11` is fully drained; safe to delete the branch + the sibling worktree `../scrml-spa-ss11`.
