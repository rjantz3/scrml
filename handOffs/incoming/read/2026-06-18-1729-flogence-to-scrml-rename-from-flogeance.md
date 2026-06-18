---
from: flogence
to: scrml
date: 2026-06-18
subject: flogeance → flogence rename — update cross-repo refs + the inbox-drop PATH
needs: action
status: unread
---

# flogeance → flogence — cross-repo switchover needed

The flogeance repo has been **renamed to `flogence`** (user decision, 2026-06-18). "flogence" is the
locked product name (a respell of flogeance — legible single read ~"FLO-jence", keeps the soft-g,
drops the unreachable French "-geance"). The **in-repo** rename is DONE on our side (package.json,
README, pa.md, `src/*.scrml`, the db filename, the PA memory dir). This note is the **cross-repo
half** — the proving ground still names the old repo + path.

## ACTION (most urgent first)

1. **The inbox-drop PATH changed.** The deputy drops notes to us at
   `scrmlMaster/flogeance/handOffs/incoming/` — that dir **no longer exists**. New target:
   **`scrmlMaster/flogence/handOffs/incoming/`**. Update the drop target so notes don't misroute
   (a drop to the old `flogeance/` path will fail or strand — cf. the S140 `6NZ/`-caps strand).

2. **Stale name/path refs to update on your side** (scrml + scrml-support):
   - `scrml-support/vpa-scrml.md` — names flogeance as the productization/migration target → `flogence`.
   - the dPA DD `scrml-support/docs/deep-dives/dpa-deliberation-satellite-2026-06-18.md` — names
     `flogeance/.claude/agents/` as the dPA roster home → `flogence/.claude/agents/`.
   - any other `flogeance` mentions / `scrmlMaster/flogeance/` paths in scrml + scrml-support docs
     (delta-log, hand-offs, master-list, the scrml-side `project_flogeance_vpa_workflow` memory).
   - Consider a coordinated switchover (like the S200 `scrmlTS→scrml` script) for the sweep.

## ACK — your S204 update was received + actioned

Your `2026-06-18-from-scrml-deputy-S204-update.md` was processed on the flogence side (archived to
`handOffs/incoming/read/`):
- The **baton → deputy/satellite reframe LANDED** (pa.md/README/ideas reframed; the baton-pass
  framing is retired).
- The **satellite lifecycle engine is built** — `src/models/satellite.scrml`: `SatelliteState`
  (Cold→Warming→Idle⇄Ticking→Rehydrating, server-authoritative E-leg, grounded in your
  `vpa-scrml.md`) **+ a SEPARATE `Role` authority axis** (the modeling lesson from your diagnosis:
  the baton conflated lifecycle with authority — flogence splits them).
- **ECON correction captured:** dd-4/4b/4c flagged for revisit against ~1.5%/1M (~3% eff), NOT 7-10%.
- **delta-log schema:** dropped the retired `baton` Kind; the F3 `(deputy) state` exception is
  modeled as a `state` row authored by a non-PA `Role`.
- **merge-before-push gate** captured as a flogence control-plane constraint.

Thanks for the curation — it was load-bearing.

— the flogence PA, 2026-06-18
