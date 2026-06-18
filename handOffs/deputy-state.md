# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — the small file the
deputy re-boots off when its transcript grows (cheap + lossless because the deputy does projection,
not deliberation; see `scrml-support/vpa-scrml.md` §"Re-hydration"). **Deputy-owned** (write-surface
partition); the deputy maintains it on the `deputy-maint` branch. The PA reads it but does not edit it.

---

## Deputy status

- **State:** LIVE — steady-state (reboot-gap ENDED tick 8; fresh PA S204 booted, merged deputy-maint, re-attached #3). First deputy instance, booted S203. On tick 8.
- **Self-poke loop:** `/loop 30m` — cron job `39fed15c`, `7,37 * * * *`. CronDelete `39fed15c` to cancel.
- **Last-absorbed delta seq:** S203 **[15]** (committed). S204 **[1][2] are UNCOMMITTED** in main's working tree (fresh PA mid-landing) — absorb when committed.
- **`deputy-maint` branch:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint`. Synced to main `73c7e688` (== main; the fresh PA FF-merged the reboot-gap maintenance). **Tip:** `git rev-parse deputy-maint`.
- **Owed maintenance:** none (digest current @ 69172d25/seq15; recent-sessions/gap-counts PASS). **Next tick will be substantive** — see below.

## Reboot-gap outcome (F3's first real use — CLOSED)

The S203 PA wrapped (`69172d25`) with #3 in-flight + rebooted. Deputy bridged the gap (ticks 6-7): kept the digest current at the wrap HEAD + watched agent `af88c53a`. Fresh PA **S204 booted, `git merge deputy-maint` (FF to `73c7e688`), re-attached #3** (wrote S204 [2] "#3 RE-ATTACH READY") and is now LANDING it (uncommitted in main: `SPEC.md` §34 row · `ast-builder.js` diagnostic · `e2e-render-map-baseline.json` · within-node allowlist · `control-flow-in-markup-reject.test.js` · `known-gaps.md` g-raw-interp flip). **af88c53a is PA-owned now** — deputy appended NO `(deputy) state` entry (the exception is PA-ABSENT only; the PA re-attached while alive). Net: the bridge worked — no agent work lost across the reboot, digest was current for the fresh PA's step-0.

## In-flight dispatches (F3 watch list)

- _(empty)_ — `af88c53a8985b37fb` handed to the live PA (landing #3); `abcf64f7198fe9cf3` closed tick 5.

## Next-tick expectations

When the fresh PA commits the #3 landing + the S204 delta entries, the next tick will:
- FF/rebase onto the new main; absorb S204 [1][2][3…];
- regen the digest (delta-log + known-gaps will have moved — projected sources);
- **MAPS REFRESH becomes genuinely owed** — #3 touches `compiler/src/ast-builder.js` (+ `SPEC.md`, PA-owned). First non-benign maps-staleness since boot → run `project-mapper` incremental on the changed source, advance the watermark off `60d547e1`, commit `.claude/maps/`. (If the PA's own wrap-6c already refreshed maps, the deputy's run is a no-op / FF.)

## Tick log

**T1 (boot):** [1]…[5]; recent-sessions regen; init. **T2:** [6]+[7] (F1 LIVE); first digest. **T3:** [8]+[9] (source-freshness + GO-LIVE). **T4:** [10] (abcf64f7 dispatched); rebased. **T5:** [11..13] (abcf64f7 closed; board MED→12/LOW→23; af88c53a dispatched). **T6 (reboot-gap):** [14]+[15] (WRAP #3-in-flight); FF→wrap HEAD; digest+recent-sessions. **T7 (reboot-gap):** wrap pushed → recent-sessions push-flip; af88c53a advanced; flagged unmerged-before-push. **T8 (gap END):** fresh PA S204 merged deputy-maint (main==`73c7e688`) + re-attached #3; af88c53a→PA-owned; watch cleared; no owed maint (digest current, S204 deltas still uncommitted).

## Currency snapshot (@ tick 8)

- **Board:** HIGH 0 · MED 12 · LOW 23 · Nominal 8 (committed; the in-flight #3 will flip g-raw-interp once landed).
- **maps:** watermark `60d547e1` — CURRENT for compiler-source as of committed HEAD; **WILL go owed** on the #3 landing (ast-builder.js).
- **digest:** current (head `69172d25`, delta-seq 15).
- **recent-sessions / gap-counts:** PASS.
- **flograph:** `--mmd`/`--filter`/`--focus` [14]; round-trip intact.

## Function 3 — agent monitoring (LIVE)

Each tick: `ls .claude/worktrees/` + `git -C <agent-wt> log/status` for branch tip + dirty state; scan delta-log for `disp` without `land`/`find`-close. **Append a `(deputy) state` delta-log entry ONLY when** an agent COMPLETED **and the PA is absent/rebooting** (the narrow single-writer exception — observation-only). NEVER land (PA S67 file-delta). No reliable task-notification (it went to the dead PA) → poll git-state.

## Sync rule (each tick)

`git merge --ff-only main`; if NOT clean FF → `git rebase main` (clean on the disjoint surface; a real conflict = partition breach to surface). Main may move/push mid-tick independent of deputy-maint — absorb up to the HEAD seen at tick start.

## Operational notes (for re-hydration)

- **node_modules:** fresh worktree has NONE → symlink main's in (survives FF+rebase): `ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules` · `ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules`
- **CWD slip:** Bash CWD resets to MAIN — `cd` the worktree (or `git -C`) before worktree ops.
- **Untracked new file:** `git add` before commit; tracked modifications commit by plain pathspec.
- **Commit gate:** pre-commit WARNS on non-main; runs ~17k subset (~80-120s); deputy commits derived-only → always passes; never `--no-verify`. `git rebase` does NOT run the gate.

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` incremental; watermark `.claude/maps/primary.map.md` (`60d547e1`).
- `docs/changelog.md` — session block. · `@generated` §0 rollup (`docs/known-gaps.md`) + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1; per tick when a projected source moved).
- flograph — `scripts/flograph.ts`. · block-lease registry — (not built yet).

## Cross-refs

- `scrml-support/vpa-scrml.md` — deputy contract. · `scrml-support/pa-scrml.md` §"S199 addendum" — PA-side contract.
- `handOffs/delta-log.md` — the live PA-state stream. · `scrml-support/docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — design.
