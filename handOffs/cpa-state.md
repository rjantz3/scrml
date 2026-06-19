# cPA state — heartbeat + in-flight relays + sPA-monitor (re-hydration anchor)

**Created S209 (2026-06-19).** The cPA's durable working state — its entire memory beyond the roster
+ queue. cPA-owned, **write-before-act**. Re-hydrate from this file at boot (cheapest of any role —
zero project context; DD Fork G). Mirrors `deputy-state.md` for the deputy.

## cPA status

- **State:** NOT YET RUN — this is the seed template (built S209 alongside the MV contract; like
  `deputy-state.md` was seeded at the S203 deputy stand-up). The first live cPA boot (`read cpa.md`)
  populates the heartbeat + flips this to LIVE.
- **Model tier:** Haiku (MV — DD Fork C; Sonnet is the deferred Fork-C debate).
- **Heartbeat:** _(none yet)_ — `tick N · last-action · timestamp-via-args`.

## PA liveness (warm/cold flag — drives stow-vs-relay)

- **scrml-PA:** WARM (the live S209 PA authored this file). When the PA emits wrap-readiness, the cPA
  flips this to COLD and begins stowing; on the fresh PA's warm signal it flips back + feeds the queue.

## In-flight relays (`needs: relay-to-user` — PA→cPA→user framed Qs)

- _(none)_

## sPA-monitor list (sPAs the cPA launched + is watching for their re-integration message)

- _(none — the cPA has not launched any; ss11/etc. currently in flight are PA-tracked F3, not cPA)_

## Standing facts (durable)

- **Boundary (B1-b-pure):** act front-of-house ONLY on an explicit cPA function; everything else →
  passthrough (relay if PA warm, stow if cold). Never mediate design; never answer substance from
  own context; when in doubt, pass through.
- **Honest spawn limit (DD OQ #2):** the cPA cannot spawn a fresh PA instance — it orchestrates the
  GAP (stow / keep-sPAs-alive / feed-on-warm); the user or a cron does the actual PA boot.
- **Work/token (DD Fork H):** read `session-economics.md` for the restart-timing trend once it has
  data (seeded S209 datapoint #1); inert until then.

## Cross-refs

`../../scrml-support/cpa-scrml.md` (contract) · `cpa-roster.md` + `cpa-queue.md` (sibling memory) ·
`docs/deep-dives/cpa-concierge-pa-2026-06-19.md` (the DD).
