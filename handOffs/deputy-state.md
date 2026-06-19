# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — a fresh deputy re-boots
off THIS file + the delta-log + the maintenance read-list (cheap + lossless: the deputy does projection,
not deliberation, so nothing irreplaceable lives in its transcript; `scrml-support/vpa-scrml.md`
§"Re-hydration"). **Deputy-owned** (write-surface partition); maintained on the `deputy-maint` branch.

> **RE-HYDRATED at tick 89 (S209).** This instance IS the reboot the tick-86 anchor prepared for: a fresh
> deputy booted via "read vpa.md and boot", FF'd the existing `deputy-maint` worktree (already current —
> main idle @72dc4fdb), confirmed last-absorbed S209 [6], ran a boot tick (oracle + §3c + F3), re-armed its
> own `/loop 30m` (the old cron `39fed15c` died with the prior instance — CronList empty, as predicted).
> A future fresh deputy repeats this off the resume point below.

---

## Deputy status (RESUME POINT)

- **State:** LIVE — steady-state, RE-HYDRATED instance. **S209 active** (S208 wrapped: g-pure-module HIGH closed; sPA execution-agent role + dock-health tool built). flogence (renamed from flogeance S206). On tick **89**.
- **Self-poke loop:** `/loop 30m` → **cron `e5b76890` (`7,37 * * * *`), session-only, armed T89.** (OLD cron `39fed15c` died with the prior instance — CronList empty at boot, no CronDelete needed. A future re-hydration: CronDelete `e5b76890` if still alive, then re-arm its own.)
- **Last-absorbed delta seq:** S209 **[6]** (current — [6] is the latest PA-source entry; the deputy itself appended the S205 F3 entry [22]).
- **`deputy-maint` branch:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (scrmlMaster sibling, OUTSIDE `.claude/worktrees/`). **Tip:** `git rev-parse deputy-maint`. FF onto main at boot.
- **node_modules:** the worktree already has the symlinks (re-create if missing): `ln -s …/scrml/node_modules ./node_modules` · `…/scrml/compiler/node_modules ./compiler/node_modules`.
- **Owed maintenance:** none. (digest current stamp=72dc4fdb sources-unchanged; maps watermark `9afc746e` = 11 commits behind by raw count but ZERO mapped-corpus change since [S209 = DD/debate/dock-health/deputy-tick commits only] → NOT owed per the scope rule; §0 + recent-sessions PASS; §3c green.)
- **Coherence:** deputy-maint **4 ahead** of main after this tick (ticks 86/86-wrap/88/89), 0 behind — clean FF, awaiting the PA's next integration.

## The deputy tick (steady-state — what each `/loop` fire does)

1. `cd` the worktree; `git merge --ff-only main` (if NOT clean FF → `git rebase main`; a cross-cutting rename → reset+rebuild per "Lessons").
2. Re-check the delta-log + `bun scripts/state.ts` oracle AFTER syncing (a pre-sync read misses new entries).
3. Absorb new PA-source delta entries; act on `(vpa: …)` only if maintenance-shaped; DECLINE/route anything deliberation-shaped.
4. Owed maintenance: `state.ts --write` (§0 if stale) · `state.ts --digest` (if a projected source moved) · maps refresh (see cadence) · re-emit flograph.
5. **§3c health check** (every tick): `flograph.ts --check --with-support --with-archive` · `dock.ts --check` · `dock.ts --coverage` → record a one-line snapshot; route only NEW findings (new currency-sweep hit · dock ERROR · new load-bearing dangling decided-by/cites · flograph dup-id). A drift ERROR you FIX by re-emitting.
6. **F3** (monitor agents): `ls .claude/worktrees/` + `git -C <agent-wt> log/status`. Append a `(deputy) state` delta entry ONLY when an agent COMPLETED CLEANLY and the PA is absent/rebooting/deferred-to-F3. A crashed/partial agent is NOT a completion. NEVER land (PA S67 file-delta).
7. Commit each to `deputy-maint` (never main); update this file (heartbeat + ACK + watch + owed); report "absorbed through [M]; deputy-maint at <SHA>; owed: <list|none>".

## PA↔vPA protocol — ACK + HEARTBEAT (S205 [19], each tick)

- **heartbeat:** tick **T89** (re-hydrated instance) · last-absorbed **[S209 6]** · deputy-maint tip = `git rev-parse deputy-maint`.
- **ACK (vpa:) [S205 10]** → §3c health-check each tick (standing). **ACK (vpa:) [S205 19]** → ACK+heartbeat each tick (standing). No new `(vpa:)` in S206-S209.

## Standing facts (durable)

- **Merge-before-push gate (S205 [15], pa.md S199 + wrap step 7):** the PA asserts `deputy-maint ^main == 0` before any push — integrates the deputy each cycle. Working.
- **F1 dilation REALIZED:** F1 ~8.3k start-thinning when the digest boots current; total deputy dilation ~14-15k/cycle ≈ 1.5%/1M (NOT the design-time 7-10% — frame-conflation corrected S204/S205). Net-positive. S209 cold-boot was digest-thinned ([S209 1]); S208 was NOT (PA misread the deputy as down → skipped the boot-merge → stale digest → read the heartbeat to know the deputy is alive).
- **S42 WRAP-THINNING (S205 [19]):** PA wraps reference digest/delta-log/deputy-state for mechanical content (deputy-enabled).
- **Block-analysis-emit v1 arc COMPLETE (S206-S208):** D1 footprint + D2 builder + D3 emit-wiring + D4 dock-consumer + D5 span-fix; block-lease groundwork. dock-health.ts (codebase-health surface) built S209.

## Lessons (operational — avoid re-learning)

- **Maps mechanism (T12, user-ruled no-consent):** dispatch `project-mapper` INTO the deputy-maint worktree (CWD-pinned, worktree-only-path brief, NO isolation) + independently verify `git -C <main> status --porcelain -- .claude/maps/` is EMPTY before committing. project-mapper > manual (it catches new E-/W-codes a manual edit misses — T76/T82).
- **Maps refresh RULE (firm):** refresh when — a WRAP boundary with any compiler-src owed · OR ≥2 changes accumulate · OR an owed change has sat ≥10 ticks. Else BATCH (each run ~100-130k sub-agent tokens; PA-window saving only ~6-7k → minimize runs).
- **maps-owed scope:** `examples/**/*.scrml` + `samples/**/*.scrml` — NOT bare `**/*.scrml` (catches docs/changes/ fixtures = false signal, T37).
- **Digest:** regen ONLY when a projected source (known-gaps/delta-log/maps/version) moved; regen the tick AFTER a bundled maps+digest commit (the stamp lags its own commit otherwise — T51/T77).
- **Partition-breach (T44):** a cross-cutting text-rename touches deputy-owned files → rebase conflict. Resolve by reset deputy-maint to the renamed main + rebuild (deputy commits are regenerable — no info loss).
- **PA fast-burst:** the PA may skip §0/maps and may not delta-log a burst → deputy regens §0 + git-infers agent/landing state (T54/T76).
- **perl -e:** NO apostrophes in replacement text (a single-quote terminates the `perl -e '...'` string — T52); use `{}` delimiters; escape `/`; heredoc-rewrite is the reliable fallback. **delta-log edits:** use python (backticks break the shell).
- **CWD slip:** Bash CWD resets to MAIN after each command — `cd` the worktree (or `git -C`) before worktree ops. **Untracked new file:** `git add` before commit. `docs/graph/` is gitignored.
- **Commit gate:** pre-commit WARNS on non-main + runs the ~17k subset (~75-120s); deputy commits are derived-only → always pass; never `--no-verify`. `git rebase` does NOT run the gate.

## Graph/dock health (§3c)

- **Snapshot @ tick 89 (PASS):** flograph 438n/154e (--with-support --with-archive) · currency-sweep **0 (clean — the ouroboros catch holds)** · 36 unverified · 29 dangling · 0 dup · 0 err. dock --check PASS (1 INFO, the self-dock) · coverage 0/628 (0.0%) · 0 orphans. **Re-emitted graph.json/.mmd at boot to clear a 2-ERROR drift** (deputy-owned untracked projection; emitted with --with-support --with-archive to match §3c). unverified 30→36 = the fresh S209 `dock-for-codebase-health` DD cites (asserted-not-verified, expected) — no NEW actionable finding.
- **Snapshot @ tick 86 (PASS):** flograph ~428n/103e · currency-sweep 0 · ~30 unverified · ~29 dangling · 0 dup · 0 err. dock PASS · coverage 0/628 · 0 orphans.
- **route to PA (open nit):** §3 plain `flograph --emit` vs §3c `--check --with-support --with-archive` → graph.json drifts to the 190n default; the deputy compensates by emitting with the matching flags. Align §3 with §3c (or make --check corpus-aware).

## In-flight dispatches (F3 watch list)

- **ss1 `a6eb2c2fd9ba6086b` COMPLETED CLEANLY (T89, awaiting PA/sPA landing):** `ss1-route-misinference-server-value-export` (the S208-filed trucking route-mis-inference gap). 2 commits ahead of base 72dc4fdb — `4a19ae98` feat(codegen): emit pure-module VALUE exports into .server.js (ss1) + tests · `254346e0` docs(ss1): progress — full suite green (24529/0 incl browser); worktree CLEAN. **NOT delta-log-recorded** — PA alive (S209 active) → watch+record-in-deputy-state only; the `(deputy) state` delta-append is the reboot-gap exception, not for a live PA. The PA/sPA lands via S67 file-delta (substantive — never the deputy). compiler/src (emit-server.ts) → maps batch on landing. **IF a later tick shows a PA cold-boot delta entry without ss1 landed → THEN append the `(deputy) state` reboot-gap entry.**
- (All prior S205-S208 agents landed + cleaned; g-pure-module crash→S208-salvage loop closed.)

## Currency snapshot (@ tick 89)

- **maps:** watermark `9afc746e` (REFRESHED T82) — current (no mapped-corpus change since; 11-commits-behind by raw count is benign — all S209 non-mapped). **digest:** current (stamp `72dc4fdb`, sources-unchanged @ HEAD). **§0:** gap-counts + recent-sessions PASS. **§3c:** PASS (438n/154e). **Next maps refresh** will be triggered by the ss1 landing (emit-server.ts = compiler/src) per the refresh rule.

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` into the worktree + main-clean verify; watermark `.claude/maps/primary.map.md` (`9afc746e`).
- `docs/changelog.md` · `@generated` §0 (`docs/known-gaps.md`) + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1). · flograph `scripts/flograph.ts` · dock `scripts/dock.ts` + `scripts/dock-health.ts` (§3c) · block-lease (groundwork built; not wired).

## Cross-refs

- `scrml/vpa.md` (root stub → boot phrase) · `scrml-support/vpa-scrml.md` — the deputy contract (§3 steady-state + §3c + S205 ACK+heartbeat + "Operating the live system"). · `pa-scrml.md` §"S199 addendum" — PA-side (gate, ACK/heartbeat read at boot+integration).
- `handOffs/delta-log.md` — the live PA-state stream. · `docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — the design.
