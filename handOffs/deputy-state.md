# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — the small file the
deputy re-boots off when its transcript grows (cheap + lossless because the deputy does projection,
not deliberation; see `scrml-support/vpa-scrml.md` §"Re-hydration"). **Deputy-owned** (write-surface
partition); the deputy maintains it on the `deputy-maint` branch. The PA reads it but does not edit it.

---

## Deputy status

- **State:** LIVE — **REBOOT-GAP MODE (F3)**. The S203 PA wrapped (`69172d25 wrap(s203)`) with #3 in-flight + rebooted; the deputy keeps looping across the gap. First deputy instance, booted S203. On tick 6.
- **Self-poke loop:** `/loop 30m` — cron job `39fed15c`, `7,37 * * * *`. CronDelete `39fed15c` to cancel.
- **Last-absorbed delta seq:** S203 **[15]** (`scrml/handOffs/delta-log.md` — absorbed [S199 1] … [S203 15]).
- **`deputy-maint` branch:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint`. Base FF'd to the settled wrap HEAD `69172d25` (tick 6). **Tip:** `git rev-parse deputy-maint` (tick-6 commit: digest+recent-sessions regen `f7bf75de` + this).
- **Owed maintenance:** none (digest + recent-sessions current @ wrap HEAD).

## ⚠ FOR THE FRESH PA ON BOOT (reboot-gap hand-back)

1. **`git merge deputy-maint`** first — picks up the **current digest** (`head 69172d25 / delta-seq 15` → step-0 reads `digest: current` and thins) + the regen'd `@generated:recent-sessions` (added the `69172d25` wrap anchor; it was post-wrap one-behind).
2. **The wrap is COMMITTED but NOT PUSHED** — main was `ahead 7` of origin at `69172d25` (recent-sessions marks it `LOCAL-ONLY`). Finish the wrap: push (after merging deputy-maint so the maint rides the same push).
3. **#3 agent `af88c53a8985b37fb` is STILL IN-FLIGHT** (see watch list) — re-attach + monitor it, or read this anchor / the delta-log for a `(deputy) state` entry if the deputy recorded its completion during the gap. Landing #3 is the fresh PA's first task (S67 file-delta + R26 dual-verify + expected-error reclassification + e2e baseline regen + flip g-raw-interp) per [15]'s directive — NOT the deputy's (substantive).

## In-flight dispatches (F3 watch list)

- **`af88c53a8985b37fb`** — bare-control-flow-in-markup diagnostic ([13], #3 ruling (a) reject+recover). **Status @ tick 6 (reboot-gap):** worktree `.claude/worktrees/agent-af88c53a8985b37fb` present (locked); branch tip `342640b3 "WIP(ctrl-flow-diag): bump within-node parity allowlist..."` (3 WIP commits: start → SPEC §34 row+§17.4 note → within-node allowlist) + DIRTY working tree (`M e2e-render-map-baseline.json`) → **actively running, NOT completed**. No `(deputy) state` re-attach entry yet (the [15] directive says append ON COMPLETION). **Watching each tick:** completion ≈ branch settles (clean tree, a non-WIP/final commit, deliverables present — SPEC §34 + recovery + baseline regen + R26). On completion → append `[N] (deputy) state · agent af88c53a completed @ <FINAL_SHA>, files: <list>; NOT landed (PA file-delta)` to the delta-log (the one narrow single-writer exception).
- ~~`abcf64f7198fe9cf3`~~ — CLOSED tick 5 (stop-surfaced [11]).

## Tick log

**Tick 1 (boot):** absorbed [1]…[5]; recent-sessions regen; init. **Tick 2:** [6]+[7] (F1 LIVE); first digest. **Tick 3:** [8]+[9] (source-freshness + GO-LIVE F3/self-drive). **Tick 4:** [10] (e2e backlog; abcf64f7 dispatched); rebased. **Tick 5:** [11]+[12]+[13] (abcf64f7 closed; board MED→12/LOW→23; af88c53a dispatched); FF. **Tick 6 (REBOOT-GAP):** absorbed [14] (flograph filter) + [15] (WRAP with #3 in-flight — F3's first real reboot-bridge use + explicit (vpa:) directive). FF'd onto wrap HEAD `69172d25`; regen digest (→ current, seq 15) + recent-sessions (post-wrap one-behind) → `f7bf75de`. af88c53a still WIP+dirty → watching, no re-attach entry yet.

## Currency snapshot (@ tick 6)

- **Board:** HIGH 0 · MED 12 · LOW 23 · Nominal 8.
- **maps:** watermark `60d547e1` — N behind HEAD but ALL docs/tooling/test-fixture (no `compiler/src`·`stdlib`·`.scrml`), CURRENT for compiler-source. WARN-only. **WATCH:** af88c53a [13] WILL land `compiler/src` (new §34 diagnostic) + SPEC.md — on its landing a project-mapper maps refresh becomes genuinely owed (flag to the PA; SPEC.md is PA-owned so maps-vs-spec is a PA-wrap concern, but the source-map refresh is the deputy seam).
- **digest:** current (head `69172d25`, delta-seq 15).
- **recent-sessions / gap-counts:** PASS (recent-sessions just regen'd; wrap anchor LOCAL-ONLY until pushed).
- **flograph:** tool gained `--mmd`/`--filter`/`--focus` [14]; `--emit`/`--check` round-trip intact; deputy artifact-commit cadence not yet established (only the board-state digest is committed today).

## Function 3 — agent monitoring (LIVE)

Each tick: `ls .claude/worktrees/` + `git -C <agent-worktree> log/status` for branch tip + dirty state; scan delta-log for `disp` without matching `land`/`find`-close. **Append a `(deputy) state` delta-log entry ONLY when** an agent COMPLETED **and the PA is absent/rebooting** (the narrow single-writer exception — observation-only) so the fresh PA re-attaches. NEVER land (substantive → PA S67 file-delta). Detection of "completed": branch stops advancing + worktree clean + deliverables present (no reliable task-notification — it went to the dead PA instance, so poll git-state).

## Sync rule (each tick)

`git merge --ff-only main`; if NOT a clean FF (deputy diverged) → `git rebase main` (clean on the disjoint surface; surface a real conflict = partition breach). Main may move mid-tick (PA actively committing) — absorb up to the HEAD seen at tick start; the next tick gets later commits.

## Operational notes (for re-hydration)

- **node_modules:** fresh worktree has NONE → symlink main's in (survives FF+rebase): `ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules` · `ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules`
- **CWD slip:** Bash CWD resets to MAIN after each command — `cd` the worktree (or `git -C`) before worktree ops.
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
