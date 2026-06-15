# scrmlTS — Session 193 (CLOSE)

**Date:** 2026-06-14.
**Previous:** `handOffs/hand-off-197.md` (S192 CLOSE, rotated at this session's OPEN).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-198.md` at next OPEN.
**Profile:** A — FULL ("read pa.md and start session" → default A). Plan-mode → build.

## What this session was
**Built Flux v1** — a complete, playable, tested single-player canonical-scrml game (`examples/28-flux.scrml`), the S191 next-purpose dog-food. Then the user **reframed Flux into an MMORPG** (one shared persistent server-authoritative world) and commissioned a **deep-dive on the MMORPG architecture** (dispatched, running at close). v1 is the rendering/UX spike; the real game's architecture inverts (server-side world).

## Session-close state
- **HEAD `02dcd3ff` — PUSHED, origin/main in sync (0/0), tree clean** (except session bookkeeping: this hand-off + handOffs/hand-off-197.md untracked + a pending user-voice append; finalize at wrap). 9 commits this session (all PA-direct, no worktrees), coherence verified (all 9 mine, no leaks).
- **Board:** HIGH 0 · **MED 5** · LOW 16 · Nominal 9 (3 Flux dog-food gaps filed S193). Live: `bun scripts/state.ts`.
- **Tests:** pre-commit subset green; full pre-push suite PASSED (the push gate ran clean after the within-node fix). Flux runtime-sim 6/6.
- **Maps:** refreshed at 6c this session (`a939fcaa`, watermark `0cafe665`); now 9 commits behind HEAD but those 9 are EXAMPLE/DOC/TEST-only (no compiler source) — maps content unaffected; a no-op-ish refresh at next wrap is fine.
- **Version:** v0.7.0, no cut. **Inbox:** empty. **Commit-gate:** Config B.

## The 9 commits (Flux v1 arc)
1. `a939fcaa` maps 6c refresh (owed S192).
2. `f7435c9c` keystone — derived ASCII board re-renders on move (the gate question; PROVEN).
3. `2f0c12fc` terrain — hand-rolled deterministic hash (no seeded PRNG exists) + corridor labyrinth + collision.
4. `4adeeb7b` fog/vision — Chebyshev sight bubble; out-of-vision = flux void.
5. `39e6c047` flux core — per-cell re-roll on re-entry + 2-tier memory (world-lock/home-pin).
6. `01b54057` game loop — seed-fixed exit + compass + XP/level/vision progression + win.
7. `b51a5be7` filed 3 dog-food gaps + regen counts (MED 4→5, LOW 14→16).
8. `6b76ce4f` runtime-sim test (6/6) + example docs (README 25-28 / VERIFIED / master-list).
9. `02dcd3ff` within-node allowlist regen for 28-flux (native-lag, live correct — the pre-push gate caught it).

## 3 dog-food findings filed (docs/known-gaps.md §S193)
- `g-emit-string-tree-paren-drop` (MED) — Phase-1 ExprNode round-trip drops `(a+b)%c` parens; corpus-invariant gate catches it; REAL codegen unaffected. Worked around with named intermediates.
- `g-interp-in-raw-content` (LOW) — `${...}` in `<pre>`/`<code>` (§4.17) emits literally, silent. W-INTERP-IN-RAW-CONTENT candidate.
- `g-route-001-local-computed-write` (LOW) — E-ROUTE-001 over-fires on a pure-`fn` local computed-index write.

## ⭐ THE BIG REFRAME — Flux is an MMORPG (S193 user ruling, the next-session driver)
v1 was a deliberately-thin single-player CLIENT render spike. The user clarified Flux's real nature:
- **Fundamentally multiplayer, ONE shared persistent SERVER-AUTHORITATIVE world** (an MMORPG). The flux happens server-side; clients are thin synced views.
- **World = a network of tunnels & caverns that shift/change when no one is looking.** (Dropped the Floor/Wall/Mountain palette.)
- **Memory = an ANCHOR, not permanent terrain.** Locking captures a small internally-fixed cluster that floats "loosely relationally to the global map (always in flux)." Holding ≥2 anchors → real-time direction+distance to each, and the numbers **continuously drift** as the world flows. Navigation = triangulating off drifting anchors. (v1's goal-compass was the accidental seed.)
- **Shared-memory landmarks** = clusters locked by collective memory (quest entrances / hubs); findable by all, also drift.
- **Co-op quests, often mandatory.** D&D progression; persistent player + world.
- **User's pointed feedback:** "this was supposed to replace the canonical ENGINE example, I'm not seeing much of that." CORRECT — v1 uses ZERO `<engine>`. The MMORPG fixes this: engines become central (player-phase FSM, quest-phase FSM, party FSM, connection FSM, render-mode FSM) — a richer §51 showcase than Mario.

## Both deep-dives COMPLETE (committed + pushed in scrml-support 5a3b1d6)
- **DD #1 MMORPG architecture** (`scrml-support/docs/deep-dives/flux-mmorpg-architecture-2026-06-14.md`, committed `84c211f`): **Readiness = PARTIAL** (source-verified). Buildable NOW: single-player + SQLite + ASCII + anchor-math. **BLOCKED on G1** (`emit-sync.ts:124-156` `emitServerSyncStub` = no-op; §52 writes never persist) — filed as NEW HIGH `g-server-sync-codegen-noop`. Channel spatial-sharding CONFIRMED (§38.6.2). Engine fork (2B parameterized-engine vs 2C components+plain-cells; §51.0.K prescribes 2C; 2B = new language work vs the singleton invariant; S174 vs §1.5 tension) = a real DEBATE. Forged `threejs-webgl-integration-expert`. 5 more gaps (G2/G4/G5/G6/G7) detailed IN THE DOC — file when the §52/MMORPG arc is scoped. CAVEAT: engine-fork dev signal is SYNTHESIZED (14 dev-persona agents not registered) — re-poll if the debate must anchor on live votes.
- **DD #2 corpus idiomatic audit** (`scrml-support/docs/deep-dives/example-corpus-idiomatic-audit-2026-06-14.md`): the corpus "teaches the spelling of scrml and the grammar of React" — 0 files use `<each>`/§55-validators/clean-errors-as-states; 25 boolean-flag-soup vs 1 idiomatic engine. KEEP 8 / LIGHT-EDIT 9 / REWRITE 7+trucking+triage + rewrite plan + 6 pedagogical gaps + ~5 new examples + a re-sequenced teaching arc. Cross-flag: 14-mario is the ONLY idiomatic engine teacher — don't retire it until MMORPG-Flux (built engine-first) earns the slot.

## NEXT SESSION (the pickup) — 3 arcs, all big
1. **The 2B-vs-2C engine debate** (`@debate-curator`; FOR-2B elm+rust, FOR-2C solid+react+§51.0.K; weight S174 don't-god-ify vs §1.5 state-machine-north-star). Gates the MMORPG engine model AND the corpus's engine-teaching. (If anchoring on live dev votes matters, re-poll the dev personas first — they weren't registered this session.) A 2nd smaller debate rec exists: 16-remote-data `<match for=>` vs `<engine for=>` (corpus DD).
2. **§52 server-sync codegen (G1 HIGH — the gate).** The compiler work that unblocks server-authoritative state + the MMORPG shared world. This is real codegen (emit-sync.ts + Tier-1 server-route gen), not "write scrml." File G2/G4/G5/G6/G7 from the MMORPG DD when scoping this.
3. **The corpus rewrite** (DD #2 plan): Tier-0 `<each>` sweep → flagship Tier-1 rewrites (09/05/16/04 — each currently teaches the inverse of its lesson) → 06/03/08/25 → trucking re-conception + ~5 new architecture-pillar examples + fix the README lines that advertise anti-patterns as features.
- v1 `28-flux.scrml` stays as-is (render/fog/compass substrate carries; client world-gen replaced by the server model). Game server was served at localhost:8099 this session (ephemeral; gone next session).

## Wrap (S193 — EXECUTED)
scrmlTS: 9 Flux commits pushed (gate-clean) · maps 6c (`a939fcaa`) · 3 Flux gaps + G1 HIGH filed + state.ts regen (board **HIGH 1 · MED 5 · LOW 16 · Nominal 9**, --check PASS) · runtime-sim 6/6 · example docs (README 25-28 / VERIFIED / master-list) · changelog S193 · this hand-off + handoff-197 rotation · final wrap commit + push (this commit). scrml-support: both DD docs + user-voice S193 committed+pushed (`5a3b1d6`, 0/0). Memory `project_flux_game_dogfood` + MEMORY.md hook updated (MMORPG reframe). Worktrees: none (all PA-direct). Maps now N behind HEAD but the post-6c commits are example/doc/test-only — content unaffected; refresh next session if source changes.

## pa.md directives in force
Rules R1–R5 · `---` delimiter · Profile A/B · wrap 8-step · standing commit-authorization granted this session (incremental commits to main; surfaced before push; push authorized + done) · S88/F4/S90/S99/S126 dispatch discipline · S138 R26 dual-verify · S147 coherence (verified 0/0) · S164 bg-commit-race (waited for notifications) · S180 waiting-time (deep-dive dispatched + maintenance during waits).

## Tags
#session-193 #flux-v1-built-pushed #mmorpg-reframe #deep-dive-dispatched #engine-showcase-gap #3-dogfood-gaps #profile-a
