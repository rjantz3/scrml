# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — the small file the
deputy re-boots off when its transcript grows (cheap + lossless because the deputy does projection,
not deliberation; see `scrml-support/vpa-scrml.md` §"Re-hydration"). **Deputy-owned** (write-surface
partition); the deputy maintains it on the `deputy-maint` branch. The PA reads it but does not edit it.

---

## Deputy status

- **State:** BOOTED — warm (maintenance boot). First deputy instance, booted S203 (2026-06-17).
- **Last-absorbed delta seq:** S203 **[5]** (`scrml/handOffs/delta-log.md` — absorbed [S199 1] … [S203 5]).
- **`deputy-maint` branch:** worktree at `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (scrmlMaster sibling, deliberately OUTSIDE `.claude/worktrees/` so the PA's wrap-6b agent-worktree sweep never collides). Booted off main `3491eddd`. **Tip after boot maintenance:** see `git rev-parse deputy-maint` (boot commits: recent-sessions regen `e6e47736` + this deputy-state update).
- **Owed maintenance:** none. (Boot tick cleared the one owed item — see below.)

## Boot tick (S203) — what was done

- Absorbed delta-log [S199 1] … [S203 5]. No `(vpa: …)` directive in-range was maintenance-actionable beyond the standing surface.
- **state.ts currency:** `--check` at boot flagged `@generated:recent-sessions` (master-list.md) STALE — the wrap(s202) commit `1bcf5c71` became a new wrap-anchor after its own `--write` ran (post-wrap drift). Regenerated via `state.ts --write` (only the @generated block changed; prose untouched), committed to deputy-maint `e6e47736`. `@generated:gap-counts` was already current.
- **maps:** watermark `60d547e1` — 3 commits behind HEAD but all 3 are docs/meta-only (no compiler/src · stdlib · .scrml since the watermark), so maps are CURRENT. The `--check` maps line is WARN-only / benign.
- **changelog:** S202 block is top; S203 has landed no compiler work (deputy-spec authoring only), nothing owed.
- **flograph:** current (no gap-token changes since the S202 build).

## Operational notes (for re-hydration)

- **node_modules:** a fresh `deputy-maint` worktree has NO `node_modules` (gitignored, not carried into worktrees), so the pre-commit test gate can't resolve deps. Fix on (re)boot: symlink main's into the worktree —
  `ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules`
  `ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules`
  (both show untracked — the gitignore `node_modules/` pattern is dir-only; harmless, explicit-pathspec commits never sweep them).
- **CWD slip:** the Bash shell CWD resets to the MAIN checkout after each command (observed every tick). Always `cd /home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (or `git -C`) before any worktree op; never assume CWD persisted.
- **Commit gate:** the pre-commit hook only WARNS (does not block) on non-main branches, and runs the unit+integration+conformance subset (~17k, ~80s). Deputy commits are docs/derived-only so it always passes — honest, never `--no-verify`.
- **FRICTION for the PA (deliberation-shaped → NOT a deputy call):** the full ~17k-test subset runs on every deputy maintenance commit even though the deputy never touches code. Pure overhead. Whether the deputy commit protocol wants a lighter derived-surface-only gate is a PA design question — flagged, not decided.

## Maintenance seams (Function 2 — the deputy's live surface)

- `.claude/maps/*` — `project-mapper` incremental on the session's changed files; watermark in `.claude/maps/primary.map.md` (currently `60d547e1`).
- `docs/changelog.md` — append/extend the current session block.
- `@generated` §0 rollup in `docs/known-gaps.md` + `master-list.md` §0.6 `@generated:recent-sessions` — `bun scripts/state.ts --write` (gate with `--check`).
- flograph + dock projection — `scripts/flograph.ts`.
- block-lease registry — (the dock's parallelism follow-on; not built yet).

## Cross-refs

- `scrml-support/vpa-scrml.md` — the deputy contract (boot, surface partition, commit protocol, re-hydration, narrow-role rule).
- `scrml-support/pa-scrml.md` §"S199 addendum — vPA deputy (PA side)" — the PA-side contract.
- `handOffs/delta-log.md` — the live PA-state stream the deputy absorbs.
- `scrml-support/docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — the design.
