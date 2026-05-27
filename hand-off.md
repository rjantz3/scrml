# scrmlTS — Session 136 (OPEN)

**Date:** 2026-05-27
**Previous:** `handOffs/hand-off-138.md` (S135 CLOSE — Q6-narrow impl + lifecycle Shape 1 source-form + structural-element silent-swallow class CLOSED + all 7 Phase-1c clusters + S115 frontmatter sweep on 192 DDs + DD Rec #14 banked + README L5 cascade closure).

**HEAD at OPEN:**
- scrmlTS: `ef9833f9` (S135 wrap)
- scrml-support: `1977539` (S115 normalization)
- pkg.json: 0.6.1 (unchanged S133→S135)

**Tests at S135 CLOSE:** 21,762 pass / 0 fail / 170 skip / 1 todo / 801 files.

**S99 path-discipline counter:** 20 (held throughout S135; zero leaks across 3 worktree dispatches).

**Worktrees:** main only.

**Inbox:** empty (one stale `dist/` from pre-S43; not actionable).

**Cross-machine sync:** scrmlTS + scrml-support both 0/0 with origin/main (clean).

**PA auto-memory:** 42 rule files.

**S135 user-voice gap:** the wrap commit notes mention DD Rec #14 banked + Phase-1c cluster work, but no S135 entries exist in `scrml-support/user-voice-scrmlTS.md` (last header S134). DD Rec #14 came from S133 DD; the S135 work was procedural follow-through on prior ratifications — likely no NEW user-voice-worthy directives. Surfaced for awareness; not actionable to backfill per S132 "here and gone."

---

## Open questions to surface immediately at S136 OPEN

1. **DD Rec #15 gauntlet round** — operationalize when? Phase-1c canon-coverage clear S135 means canon now reflects post-S130 SPEC landings; a gauntlet round would empirically test whether adopter dev agents reading the refreshed canon write correct scrml. Likely substantive (~3-8h).
2. **Pa.md amendment for DD Rec #14** — formalize cross-session? Memory file is single-machine; pa.md is cross-machine carrier.
3. **Description cascade 8 articles** — leave per PA lean (artifact fidelity — link text matches dev.to article title) or sweep?
4. **Maps refresh** — last refresh at S135 wrap to HEAD `ef9833f9`. Current. No incremental needed this session unless work moves significantly.

**S135-hand-off carry-forward item 4 ("Phase 2 amendment items still queued from HU-3/HU-4/HU-5") VERIFIED STALE at S136 OPEN.** All HU-3/4/5 ratifications landed across S131-S135 (HU-3 Q5.B.1/2/3 → §6.10.6/§55.16/§52.14 in `1a37af60` S131; HU-4 Q-W3-3 generator → §13.6 in `1a37af60` S131; HU-4 Q-W3-4 §29 → `5ec5af56` S132; HU-5 Q-W35-1 ~snapshot → `3ae76826` S131; HU-5 Q-W35-2 state-dynamics-DD → `0829ead` S131-support; Q-W3-1/Q-W3-2/Q-W35-3 were no-op/DD-DROP/MOOT). Removed from carry-forward. Stale-text pattern is exactly [[feedback_verify_before_claim]] + [[feedback_restate_prerequisites_not_conclusions]].

## Carry-forward standing watches (no action unless trigger)

- **A5 refinement-type freeze extension** — ≥2 adopter reports of JS-host boundary mutation re-opens
- **§29 vanilla-interop** — Nominal/spec-ahead per S131 Q-W3-4 + S132 reaffirmed; ≥2 friction reports re-trigger
- **B3 P3** — 8 missing stdlib builders; ≥2 friction reports re-trigger
- **A4 alias-tracking** — Phase 1 simplification limitation (cross-file alias tracking deferred); extend if friction surfaces

## 7 LOW deferred items filed S135 (canonical scrml usage unblocked; extend on friction)

- Bug 21 (Q6-narrow deep multi-level reset uses fieldPath[0])
- Bug 22 (Q6-narrow cross-cell `default=@otherCell` classification heuristic)
- Bug 23 (W-LIFECYCLE-LEGACY-ARROW Shape 1 emission gap)
- Bug 24 (qualified-form discrim regex tolerance — `is Article.Draft` unmatched)
- Bug 25 (`transition()` deeper-expression regex tolerance)
- Bug 26 (`${...}` inside `function` body E-SCOPE-001)
- Bug 27 (`tryParseStructuralDecl` extra-lookahead cleanup)

## Phase-1c cluster O (deferred per HU-6)

- F-036 `_{}` foreign code
- F-041 input states `<keyboard>`/`<mouse>`/`<gamepad>`

Both sliver-empty; `status: deferred` until empirical adopter signal.

---

## Tags
#session-136 #OPEN
