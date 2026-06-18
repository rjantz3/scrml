# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — the small file the
deputy re-boots off when its transcript grows (cheap + lossless because the deputy does projection,
not deliberation; see `scrml-support/vpa-scrml.md` §"Re-hydration"). **Deputy-owned** (write-surface
partition); the deputy maintains it on the `deputy-maint` branch. The PA reads it but does not edit it.

---

## Deputy status

- **State:** BOOTED — warm (maintenance boot). First deputy instance, booted S203 (2026-06-17). On tick 2.
- **Last-absorbed delta seq:** S203 **[7]** (`scrml/handOffs/delta-log.md` — absorbed [S199 1] … [S203 7]).
- **`deputy-maint` branch:** worktree at `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (scrmlMaster sibling, OUTSIDE `.claude/worktrees/` so wrap-6b never collides — codified by the PA in [6]). Base FF'd to main `ab8b5758` on tick 2. **Tip:** `git rev-parse deputy-maint` (tick-2 commits: digest.md `e85d5f0d` + this deputy-state update).
- **Owed maintenance:** none.

## Tick log

**Tick 1 (boot, S203):** absorbed [S199 1]…[S203 5]; regen `@generated:recent-sessions` (caught the wrap-s202 post-wrap one-behind drift) → `e6e47736`; init deputy-state → `68ce0ee1`. All 4 invariants held; PA FF-merged → main.

**Tick 2 (S203):** PA had merged tick-1 + added [6] (first-run validated, contract refined `9822ae4`) + [7] (Function 1 digest LIVE, tool `state.ts --digest` at `ab8b5758`). FF'd deputy-maint `68ce0ee1`→`ab8b5758` to acquire the tool. **Generated the first canonical `handOffs/digest.md`** (deputy-owned artifact — PA built the tool, deputy commits the projection) → `e85d5f0d`. `--check` GREEN (gap-counts · recent-sessions PASS; digest current; maps WARN-only/benign). **F1 digest regen is now a per-tick maintenance step.**

## Currency snapshot (@ tick 2)

- **Board:** HIGH 0 · MED 14 · LOW 21 · Nominal 8.
- **maps:** watermark `60d547e1` — N commits behind HEAD but ALL docs/tooling-only (no `compiler/src`·`stdlib`·`.scrml` since the watermark), so maps are CURRENT for compiler-source. WARN-only; PA wrap-6c sweeps the `scripts/state.ts` tooling extension at close. NOT owed mid-session.
- **digest:** current (head `ab8b5758`, delta-seq 7).
- **changelog:** S202 top; S203 has landed no compiler work (deputy infra only) — nothing owed.
- **flograph:** current (no gap-token changes since the S202 build).

## Operational notes (for re-hydration)

- **node_modules:** a fresh `deputy-maint` worktree has NO `node_modules` (gitignored, not carried into worktrees) → the pre-commit gate can't resolve deps. Symlink main's in on (re)boot (survives FF):
  `ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules`
  `ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules`
  (both show untracked — gitignore `node_modules/` is dir-only; harmless, explicit-pathspec commits never sweep them).
- **CWD slip:** the Bash shell CWD resets to the MAIN checkout after each command. Always `cd /home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (or `git -C`) before any worktree op.
- **New untracked files (e.g. first digest.md):** `git commit -- <path>` fails on an untracked file ("pathspec did not match") — `git add <path>` first, then commit. Stage explicitly so the untracked node_modules symlinks never get swept.
- **Commit gate:** pre-commit hook only WARNS (no block) on non-main branches; runs the unit+integration+conformance subset (~17k, ~80s). Deputy commits are docs/derived-only → always passes. Never `--no-verify`.
- **Full-subset-gate-on-derived-commits friction:** raised tick 1, PA-acknowledged in [6] as a **deferred path-scoped gate-skip** (not built yet) → keep running the full gate until built.

## Maintenance seams (Function 2 — the deputy's live surface)

- `.claude/maps/*` — `project-mapper` incremental on the session's changed source; watermark in `.claude/maps/primary.map.md` (currently `60d547e1`).
- `docs/changelog.md` — append/extend the current session block.
- `@generated` §0 rollup in `docs/known-gaps.md` + `master-list.md` §0.6 `@generated:recent-sessions` — `bun scripts/state.ts --write` (gate with `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (Function 1, LIVE; regen per tick; deputy-owned artifact).
- flograph + dock projection — `scripts/flograph.ts`.
- block-lease registry — (the dock's parallelism follow-on; not built yet).

## Cross-refs

- `scrml-support/vpa-scrml.md` — the deputy contract (boot, surface partition, commit protocol, re-hydration, narrow-role rule).
- `scrml-support/pa-scrml.md` §"S199 addendum — vPA deputy (PA side)" — the PA-side contract (incl. session-start digest step 0).
- `handOffs/delta-log.md` — the live PA-state stream the deputy absorbs.
- `scrml-support/docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — the design.
