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

- **State:** LIVE — steady-state, RE-HYDRATED instance. **S209 active** (sPA ss1 FIRST LIVE RUN landed [7]; dock-health surfaces ratified). flogence (renamed from flogeance S206). On tick **91**.
- **Self-poke loop:** `/loop 30m` → **cron `e5b76890` (`7,37 * * * *`), session-only, armed T89.** (OLD cron `39fed15c` died with the prior instance — CronList empty at boot, no CronDelete needed. A future re-hydration: CronDelete `e5b76890` if still alive, then re-arm its own.)
- **Last-absorbed delta seq:** S209 **[9]** ([7] ss1 re-integrated · [8] ss1 batch pushed · [9] sPA AUTONOMY CORRECTION → spa-scrml.md §Standing-autonomy + §close-without-wrap [next-sPA-boot, NOT running ss11]). All informational/contract — no `(vpa:)`, no deputy action. (Deputy appended the S205 F3 entry [22].)
- **`deputy-maint` branch:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (scrmlMaster sibling, OUTSIDE `.claude/worktrees/`). **Tip:** `git rev-parse deputy-maint`. FF onto main at boot.
- **node_modules:** the worktree already has the symlinks (re-create if missing): `ln -s …/scrml/node_modules ./node_modules` · `…/scrml/compiler/node_modules ./compiler/node_modules`.
- **Owed maintenance:** **MAPS (batching).** ss1 landed `emit-server.ts` + `var-counter.ts` (compiler/src = mapped) — FIRST mapped landing since watermark `9afc746e`. 1 landing → BATCH per the cadence rule (not wrap · not ≥2 landings · not ≥10 ticks owed). Refresh on the 2nd mapped landing (ss11 may land more) OR at the next wrap-with-src-owed. (digest REGEN'd current stamp=df62b44f delta-seq 7; §0 + recent-sessions PASS [PA regen'd at gap-reconcile]; §3c green.)
- **Coherence:** the PA integrated my T89 commits at the ss1 re-integration (deputy-maint FF'd 0/0 with main @df62b44f); this T91 tick re-advances deputy-maint (digest + deputy-state) awaiting the PA's next integration — clean FF.

## The deputy tick (steady-state — what each `/loop` fire does)

1. `cd` the worktree; `git merge --ff-only main` (if NOT clean FF → `git rebase main`; a cross-cutting rename → reset+rebuild per "Lessons").
2. Re-check the delta-log + `bun scripts/state.ts` oracle AFTER syncing (a pre-sync read misses new entries).
3. Absorb new PA-source delta entries; act on `(vpa: …)` only if maintenance-shaped; DECLINE/route anything deliberation-shaped.
4. Owed maintenance: `state.ts --write` (§0 if stale) · `state.ts --digest` (if a projected source moved) · maps refresh (see cadence) · re-emit flograph.
5. **§3c health check** (every tick): `flograph.ts --check --with-support --with-archive` · `dock.ts --check` · `dock.ts --coverage` → record a one-line snapshot; route only NEW findings (new currency-sweep hit · dock ERROR · new load-bearing dangling decided-by/cites · flograph dup-id). A drift ERROR you FIX by re-emitting.
6. **F3** (monitor agents): `ls .claude/worktrees/` + `git -C <agent-wt> log/status`. Append a `(deputy) state` delta entry ONLY when an agent COMPLETED CLEANLY and the PA is absent/rebooting/deferred-to-F3. A crashed/partial agent is NOT a completion. NEVER land (PA S67 file-delta).
7. Commit each to `deputy-maint` (never main); update this file (heartbeat + ACK + watch + owed); report "absorbed through [M]; deputy-maint at <SHA>; owed: <list|none>".

## PA↔vPA protocol — ACK + HEARTBEAT (S205 [19], each tick)

- **heartbeat:** tick **T91** · last-absorbed **[S209 9]** · deputy-maint tip = `git rev-parse deputy-maint`. (main moved 2× mid-tick: df62b44f→a99246e2; rebased deputy-maint, re-absorbed.)
- **ACK (vpa:) [S205 10]** → §3c health-check each tick (standing). **ACK (vpa:) [S205 19]** → ACK+heartbeat each tick (standing). No new `(vpa:)` in S206-S209 (S209 [7] is informational `disp/land`).

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

- **Snapshot @ tick 91 (PASS):** flograph 439n/154e (--with-support --with-archive; +1 node = the newly-filed `g-const-only-module-no-server-emit` gap) · currency-sweep **0 (clean)** · 36 unverified · 29 dangling · 0 dup · 0 err. dock --check PASS (1 INFO, self-dock) · coverage 0/628 (0.0%) · 0 orphans. **Re-emitted graph at T91 to clear a known-gaps-change drift** (deputy-owned projection). No NEW finding to route.
- **Snapshot @ tick 89 (PASS):** flograph 438n/154e · currency-sweep 0 · 36 unverified · 29 dangling · 0 dup · 0 err. dock PASS · coverage 0/628 · 0 orphans.
- **Snapshot @ tick 86 (PASS):** flograph ~428n/103e · currency-sweep 0 · ~30 unverified · ~29 dangling · 0 dup · 0 err. dock PASS · coverage 0/628 · 0 orphans.
- **route to PA (open nit):** §3 plain `flograph --emit` vs §3c `--check --with-support --with-archive` → graph.json drifts to the 190n default; the deputy compensates by emitting with the matching flags. Align §3 with §3c (or make --check corpus-aware).

## In-flight dispatches (F3 watch list)

- **ss11 `../scrml-spa-ss11` IN-FLIGHT (T91 watch):** the parallel-safe pair (disjoint docs surface). Tip `e8b3b8ac` fix(ss11): r28-c2 kickstarter despace `< db>`→`<db>`; `cab3e8a3` item 3 PARK+escalate (SPEC self-contradiction on canonical opener). NO re-integration msg to the PA yet (per [7]) → still running; PA-tracked. Watch+record only; never land.
- **ss1 `a6eb2c2fd9ba6086b` LANDED + RESOLVED (T91, by the PA — no deputy action needed):** the PA FF-merged spa/ss1 → main `37a9a8c9` and gap-reconciled (item 1 `g-route-mis-inference` resolved via `795704c1`; filed sibling `g-const-only-module-no-server-emit`). Recorded in delta-log [7] (PA-source, NOT a deputy reboot-gap entry — PA was alive). Worktree `agent-a6eb2c2fd9ba6086b` still present → PA 6b-cleanup (not a deputy act).
- (All prior S205-S208 agents landed + cleaned; g-pure-module crash→S208-salvage loop closed.)

## Currency snapshot (@ tick 91)

- **maps:** watermark `9afc746e` — **OWED (batching):** ss1's `emit-server.ts`+`var-counter.ts` (compiler/src) is the first mapped change since the watermark; refresh on the 2nd mapped landing or at wrap. **digest:** current (stamp `df62b44f`, delta-seq 7 — REGEN'd T91). **§0:** gap-counts + recent-sessions PASS (PA regen'd). **§3c:** PASS (439n/154e). board MED 9 net (g-route-mis-inference −1, g-const-only-module +1).

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` into the worktree + main-clean verify; watermark `.claude/maps/primary.map.md` (`9afc746e`).
- `docs/changelog.md` · `@generated` §0 (`docs/known-gaps.md`) + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1). · flograph `scripts/flograph.ts` · dock `scripts/dock.ts` + `scripts/dock-health.ts` (§3c) · block-lease (groundwork built; not wired).

## Cross-refs

- `scrml/vpa.md` (root stub → boot phrase) · `scrml-support/vpa-scrml.md` — the deputy contract (§3 steady-state + §3c + S205 ACK+heartbeat + "Operating the live system"). · `pa-scrml.md` §"S199 addendum" — PA-side (gate, ACK/heartbeat read at boot+integration).
- `handOffs/delta-log.md` — the live PA-state stream. · `docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — the design.
