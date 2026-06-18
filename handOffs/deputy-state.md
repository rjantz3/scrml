# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — the small file the
deputy re-boots off when its transcript grows (cheap + lossless because the deputy does projection,
not deliberation; see `scrml-support/vpa-scrml.md` §"Re-hydration"). **Deputy-owned** (write-surface
partition); the deputy maintains it on the `deputy-maint` branch. The PA reads it but does not edit it.

---

## Deputy status

- **State:** LIVE — steady-state (S205 active, PA in a multi-agent dispatch burst). First deputy instance, booted S203. On tick 33.
- **Self-poke loop:** `/loop 30m` — cron job `39fed15c`, `7,37 * * * *`. CronDelete `39fed15c` to cancel.
- **Last-absorbed delta seq:** S205 **[10]** (the S205 landings aren't logged as delta entries past [10]).
- **`deputy-maint` branch:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint`, descends main (PA integrates via the pre-push merge gate). **Tip:** `git rev-parse deputy-maint`.
- **Owed maintenance:** **maps REFRESHED this tick** (`cc765a5a`→`492b4bb9`, the 3-change batch). maps refresh `ccd3c511` PENDING PA integration (clean FF). **2nd maps batch** owed (slice2 + engine-autodecl + block-splitter in flight) → batch on their landings.

## Standing facts (durable)

- **Merge-before-push gate (RESOLVED + ratified S205 [2]):** PA asserts `deputy-maint ^main == 0` before any push (pa.md S199 addendum + wrap step 7); fired in practice (`f07f8406`/`e14462a6`/`a650619e`).
- **F1 dilation REALIZED (S205 [3]):** F1 ~8.3k (was 0 in S204); total ~14-15k/cycle ≈ 1.5%/1M. Net-positive.
- **Maps mechanism (RESOLVED T12, user no-consent):** `project-mapper` into the deputy-maint worktree (CWD-pinned, worktree-only brief, NO isolation) + verify `git -C <main> status --porcelain -- .claude/maps/` EMPTY before committing. Ran T12 + T32, both leak-verified clean.
- **Maps cadence:** BATCH compiler-src/.scrml changes into one project-mapper run (each is ~110-130k sub-agent tokens; in the PA-context-WINDOW frame the deputy doing it saves the PA only ~6-7k → minimize invocations). Trigger: a coherent batch lands + a settling point (T32 ran on the emit+slice-3+g-match batch when g-match landed).

## Graph/dock health (§3c — per-tick standing step, S205 [10])

- **Snapshot @ tick 32 (PASS, unchanged):** flograph 428n/103e (--with-support --with-archive) · currency-sweep **0 (clean)** · 14 unverified · 15 dangling · 0 dup · 0 err. dock --check PASS · dock --coverage 0/628 (0.0%) · 0 orphans. **No NEW finding.**
- **route to PA (open, tooling nit):** §3 plain `flograph --emit` vs §3c `--check --with-support --with-archive` → graph.json drifts to the 190n default; deputy emits with the matching flags. Align §3 with §3c (or make --check corpus-aware).

## In-flight dispatches (F3 watch list — PA alive, tracking only, no `(deputy)` entries)

- **LANDED (in the T32 maps batch; worktrees 6b-cleanup PA-pending):** `a3a475168766ceba8` trucking slice-3 (`f4fae410`) · `a634857265ed2b578` g-match-alternation (`9a7bc3a5`).
- **`aeca43607dd011a51`** — trucking **slice-2** (advanced to customer/quote 10-field `<quoteForm>`). @ tick 33: WIP + dirty → in-flight. `.scrml` corpus → 2nd batch.
- **`ab4fe40551c515110`** — **block-splitter angleDepth** (`:`-shorthand fix). @ tick 33: `708b07bc` WIP + dirty → in-flight (NEW). compiler/src → 2nd batch.
- **`af5ed82479580631c`** — **engine-autodecl** (auto-declare engine state). @ tick 33: `ca43c723` flipping g-engine-autodecl-bare-variant-write gap, clean → **near-complete**. compiler/src → 2nd batch.

## Tick log (compressed)

- **T1** boot. **T2-T8** F1+GO-LIVE+e2e/flograph; reboot-gap (#3 bridged → re-attached+LANDED, zero loss).
- **T9-T14** S204 [1-6] (#3 landed; dilation ~3% frame-corrected); maps REFRESHED 60d547e1→cc765a5a (user ruling); 2nd merge-before-push miss flagged → PA caught up.
- **T15** S205 [1-6] — gate RATIFIED + F1 realized ~8.3k + dock built. **T16-25** PA idle (10 no-ops).
- **T26** S205 [7-9] (corpus deref + flograph --with-archive + harness capstone; gate fired). **T27** S205 [10] — §3c guardrail wired. **T28** no-op. **T29-31** trucking burst: slice-3 + g-match dispatched→complete→LANDED (f4fae410/9a7bc3a5); maps batched.
- **T32** maps REFRESHED cc765a5a→492b4bb9 (3-change batch: emit + slice-3 + g-match; leak-verified clean); 2 NEW agents dispatched (slice2 + engine-autodecl) → 2nd batch owed; digest regen; §3c green.
- **T33** maps `ccd3c511` pending integration; digest regen (my maps commit staled it); 5 agents (2 landed + 3 in-flight: slice2/block-splitter/engine-autodecl) → 2nd batch held; §3c unchanged.

## Currency snapshot (@ tick 32)

- **Board:** HIGH 0 · gap-counts + recent-sessions PASS (PA regen'd §0 across the S205 landings).
- **maps:** watermark **`492b4bb9`** (REFRESHED T32) — current for the 3-change batch; 2nd batch (slice2/engine-autodecl) pending their landing.
- **digest:** current (head `ccd3c511`, delta-seq S205 [10]).
- **flograph/dock:** §3c PASS (snapshot above).

## Function 3 — agent monitoring (LIVE)

Each tick: `ls .claude/worktrees/` + `git -C <agent-wt> log/status`; scan delta-log for `disp` without `land`/`find`-close. **Append a `(deputy) state` entry ONLY when** an agent COMPLETED **and the PA is absent/rebooting** (narrow single-writer exception — observation-only). NEVER land (PA S67 file-delta). Poll git-state.

## Sync rule (each tick)

`git merge --ff-only main`; if NOT clean FF → `git rebase main` (clean on the disjoint surface; real conflict = partition breach to surface). **Re-check delta-log + state.ts oracle AFTER syncing** (T15 lesson). Main may move/push mid-tick.

## Operational notes (for re-hydration)

- **node_modules:** fresh worktree has NONE → symlink main's in (survives FF+rebase): `ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules` · `ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules`
- **CWD slip:** Bash CWD resets to MAIN — `cd` the worktree (or `git -C`) before worktree ops.
- **Untracked new file:** `git add` before commit; tracked mods commit by plain pathspec. `docs/graph/` is gitignored.
- **Digest cadence:** regen ONLY when a projected source (known-gaps/delta-log/maps/version) moved — discard a no-op stamp-bump.
- **perl edits:** use `{}` delimiters or escape `/` (slashes collide with `s///`); heredoc-rewrite is the reliable fallback.
- **Commit gate:** pre-commit WARNS on non-main; runs ~17k subset (~75-120s); deputy commits derived-only → pass; never `--no-verify`. `git rebase` does NOT run the gate.

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` into the worktree + main-clean verify; watermark `.claude/maps/primary.map.md` (`492b4bb9`).
- `docs/changelog.md` — session block. · `@generated` §0 rollup + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1).
- flograph `scripts/flograph.ts` · dock `scripts/dock.ts` (§3c) · block-lease registry (DD landed; not built).

## Cross-refs

- `scrml-support/vpa-scrml.md` — deputy contract (+ §3 + §3c). · `scrml-support/pa-scrml.md` §"S199 addendum" — PA-side (+ merge-before-push gate).
- `handOffs/delta-log.md` — live stream. · `scrml-support/docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — design (+ S204/S205 addenda).
