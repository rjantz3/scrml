# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — a fresh deputy re-boots
off THIS file + the delta-log + the maintenance read-list (cheap + lossless: the deputy does projection,
not deliberation, so nothing irreplaceable lives in its transcript; `scrml-support/vpa-scrml.md`
§"Re-hydration"). **Deputy-owned** (write-surface partition); maintained on the `deputy-maint` branch.

> **RE-HYDRATED at tick 96 (S209) — fresh deputy after the tick-95 death.** The prior deputy DIED at tick 95
> (delta-log [18]: the session-only cron `e5b76890` died with the crashed PA instance; the PA reset
> `deputy-maint`→main + PA-drove the digest regen). This instance booted via "read vpa.md and boot", confirmed
> the delta-log WINS over the stale tick-91 anchor (absorbed [10]–[18]), FF'd `deputy-maint` onto current main,
> ran a boot tick (oracle + §3c + F3), and re-armed its own `/loop 30m` (CronList empty at boot, as predicted —
> NEW cron `50e233bd`). A future fresh deputy repeats this off the resume point below.

---

## Deputy status (RESUME POINT)

- **State:** LIVE — steady-state, RE-HYDRATED instance. **S209 active.** The live PA is running a **4-agent burst** off `c734ec35`: the **§4 despace corpus-migration** (delta-log [16]-escalated; `bf390560` Part A prose + `c734ec35` Part B examples; agent `a087942d` actively WIP through SPEC §19/§48/§52/§53) **+ sPA ss2 engine-codegen** (agent `a1125279`, `feat(ss2)` §51.0.H opener-effect) **+ 2 just-provisioned** (`a58c1007`, `a91d0c9f`). flogence (renamed from flogeance S206). On tick **97**.
- **Self-poke loop:** `/loop 30m` → **cron `50e233bd` (`9,39 * * * *`), session-only, armed T96.** (OLD crons `39fed15c`→`e5b76890` both died with their instances — CronList empty at boot, no CronDelete needed. A future re-hydration: CronDelete `50e233bd` if still alive, then re-arm its own.)
- **Last-absorbed delta seq:** S209 **[18]** ([10] cPA DD disp · [11] work-per-token tracking directive [FUTURE deputy ledger, NOT yet operationalized — see Standing facts] · [12] cPA DD land · [13] cPA MV built · [14] sPA ss3 autonomous run re-integrated +3 MED filed · [15] crash-recovery reconcile · [16] sPA ss11 re-integrated [doc-currency 1-3; despace ESCALATED to PA-track] · [17] giti-006 re-sent · [18] DEPUTY DIED tick-95 + deputy-maint reset). All informational/contract — NO maintenance-shaped `(vpa:)`, no deputy action owed beyond this re-hydration.
- **`deputy-maint` branch:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (scrmlMaster sibling, OUTSIDE `.claude/worktrees/`). **Tip:** `git rev-parse deputy-maint` (FF'd to `c734ec35` at boot; +1 with the deputy-state update this tick). FF onto main each tick.
- **node_modules:** the worktree has the symlinks (verified at boot; re-create if missing): `ln -s …/scrml/node_modules ./node_modules` · `…/scrml/compiler/node_modules ./compiler/node_modules`.
- **Owed maintenance:** **MAPS (DUE but DEFERRED — live PA burst, now LARGER).** ≥2 mapped landings since watermark `9afc746e`: ss1 `emit-server.ts`+`var-counter.ts` · ss3 codegen (g-bare-literal-attr-value etc.) · `c734ec35` `hos.scrml`. Threshold crossed → refresh IS due, BUT a 4-agent burst (despace corpus-migration + ss2 engine-codegen) is actively producing more compiler/src + examples/samples .scrml that will land imminently → a refresh now would re-run. DEFER to burst-settle / next wrap-with-src-owed (token economy — ~100-130k sub-agent tokens/run). (digest **current** stamp `20eb6e39`; §0 + recent-sessions PASS; §3c green.)
- **Coherence:** main quiescent at `c734ec35` (boot→T97 — the burst's commits live in the agent worktrees, not main yet); deputy-maint re-advances with the deputy-state update, 1-ahead/0-behind, awaiting the PA's next integration — clean FF by construction.

## The deputy tick (steady-state — what each `/loop` fire does)

1. `cd` the worktree; `git merge --ff-only main` (if NOT clean FF → `git rebase main`; a cross-cutting rename → reset+rebuild per "Lessons").
2. Re-check the delta-log + `bun scripts/state.ts` oracle AFTER syncing (a pre-sync read misses new entries).
3. Absorb new PA-source delta entries; act on `(vpa: …)` only if maintenance-shaped; DECLINE/route anything deliberation-shaped.
4. Owed maintenance: `state.ts --write` (§0 if stale) · `state.ts --digest` (if a projected source moved) · maps refresh (see cadence) · re-emit flograph.
5. **§3c health check** (every tick): `flograph.ts --check --with-support --with-archive` · `dock.ts --check` · `dock.ts --coverage` → record a one-line snapshot; route only NEW findings (new currency-sweep hit · dock ERROR · new load-bearing dangling decided-by/cites · flograph dup-id). A drift ERROR you FIX by re-emitting.
6. **F3** (monitor agents): `ls .claude/worktrees/` + `git -C <agent-wt> log/status`. Append a `(deputy) state` delta entry ONLY when an agent COMPLETED CLEANLY and the PA is absent/rebooting/deferred-to-F3. A crashed/partial agent is NOT a completion. NEVER land (PA S67 file-delta).
7. Commit each to `deputy-maint` (never main); update this file (heartbeat + ACK + watch + owed); report "absorbed through [M]; deputy-maint at <SHA>; owed: <list|none>".

## PA↔vPA protocol — ACK + HEARTBEAT (S205 [19], each tick)

- **heartbeat:** tick **T97** · last-absorbed **[S209 18]** (no new delta entries T96→T97 — the PA's burst is in agent worktrees, not yet delta-logged) · deputy-maint tip = `git rev-parse deputy-maint` (main quiescent @ `c734ec35`; re-FF each tick).
- **ACK (vpa:) [S205 10]** → §3c health-check each tick (standing). **ACK (vpa:) [S205 19]** → ACK+heartbeat each tick (standing). **No new maintenance-shaped `(vpa:)` in [10]–[18]** (all disp/land/rule/state informational). **[11] work-per-token ledger DECLINED-as-not-yet-actionable** (FUTURE deputy responsibility; the work-proxy numerator + token-measurement feasibility are UNRESOLVED + PA/design-owned — not operationalized, so nothing to maintain yet).

## Standing facts (durable)

- **Merge-before-push gate (S205 [15], pa.md S199 + wrap step 7):** the PA asserts `deputy-maint ^main == 0` before any push — integrates the deputy each cycle. Working (the [18] reset + the [8] 5-tick merge are recent instances).
- **F1 dilation REALIZED:** F1 ~8.3k start-thinning when the digest boots current; total deputy dilation ~14-15k/cycle ≈ 1.5%/1M (NOT the design-time 7-10% — frame-conflation corrected S204/S205). Net-positive. S209 cold-boot was digest-thinned ([S209 1]); S208 was NOT (PA misread the deputy as down → skipped the boot-merge → stale digest → read the heartbeat to know the deputy is alive).
- **work-per-token ledger (S209 [11], FUTURE deputy responsibility — NOT yet live):** user directive — once the PA has wrap-timing autonomy, track wrap + session-start context draws + optimize for WORK-DONE-PER-TOKEN (wrap+start EXCLUDED from "work"). "deputy maintains the ledger." BLOCKED on the PA/design-track resolving the work-PROXY (numerator) + token-measurement feasibility (no clean token API; byte/4 + harness-% estimates; needs a hook or wrap-time capture). S209 = datapoint #1 (PA-captured at the wrap, estimate-flagged). The deputy operationalizes this ONLY after the measurement mechanism is ratified — until then, nothing to maintain.
- **S42 WRAP-THINNING (S205 [19]):** PA wraps reference digest/delta-log/deputy-state for mechanical content (deputy-enabled).
- **cPA (Concierge PA) role + MV BUILT (S209 [10]-[13]):** role DD landed (scrml-support `4edafc2`); MV contract `cpa-scrml.md` + pointer `cpa.md` + templates `handOffs/cpa-{roster,queue,state}.md`. Haiku, N=1, stow-and-feed + launch/monitor-sPA. NOT a deputy surface (distinct role); noted for re-hydration awareness only.
- **Block-analysis-emit v1 arc COMPLETE (S206-S208):** D1 footprint + D2 builder + D3 emit-wiring + D4 dock-consumer + D5 span-fix; block-lease groundwork. dock-health.ts (codebase-health surface) built S209 ([4]).

## Lessons (operational — avoid re-learning)

- **Maps mechanism (T12, user-ruled no-consent):** dispatch `project-mapper` INTO the deputy-maint worktree (CWD-pinned, worktree-only-path brief, NO isolation) + independently verify `git -C <main> status --porcelain -- .claude/maps/` is EMPTY before committing. project-mapper > manual (it catches new E-/W-codes a manual edit misses — T76/T82).
- **Maps refresh RULE (firm):** refresh when — a WRAP boundary with any compiler-src/example-.scrml owed · OR ≥2 mapped changes accumulate AND main is quiescent · OR an owed change has sat ≥10 ticks. Else BATCH (each run ~100-130k sub-agent tokens; PA-window saving only ~6-7k → minimize runs; NEVER fire mid live-PA-burst — the moving main + imminent more-src make it re-run).
- **maps-owed scope:** `examples/**/*.scrml` + `samples/**/*.scrml` + `compiler/src/**` — NOT bare `**/*.scrml` (catches docs/changes/ fixtures = false signal, T37).
- **Digest:** regen ONLY when a projected source (known-gaps/delta-log/maps/version) moved; regen the tick AFTER a bundled maps+digest commit (the stamp lags its own commit otherwise — T51/T77). SPEC/test/example-.scrml landings do NOT stale the digest.
- **Partition-breach (T44):** a cross-cutting text-rename touches deputy-owned files → rebase conflict. Resolve by reset deputy-maint to the renamed main + rebuild (deputy commits are regenerable — no info loss).
- **PA fast-burst:** the PA may skip §0/maps and may not delta-log a burst → deputy regens §0 + git-infers agent/landing state (T54/T76). **Observed at T96: PA advanced main 2 commits + dispatched agent `a087942d` mid-deputy-boot with no delta entry yet — git-state is ground truth, not the delta-log tail.**
- **perl -e:** NO apostrophes in replacement text (a single-quote terminates the `perl -e '...'` string — T52); use `{}` delimiters; escape `/`; heredoc-rewrite is the reliable fallback. **delta-log edits:** use python (backticks break the shell).
- **CWD slip:** Bash CWD resets to MAIN after each command — `cd` the worktree (or `git -C`) before worktree ops. **Untracked new file:** `git add` before commit. `docs/graph/` is gitignored.
- **Commit gate:** pre-commit WARNS on non-main + runs the ~17k subset (~75-120s); deputy commits are derived-only → always pass; never `--no-verify`. `git rebase` does NOT run the gate.

## Graph/dock health (§3c)

- **Snapshot @ tick 97 (PASS):** unchanged from T96 — flograph 0 dup · currency-sweep **0** · 40 unverified · 32 dangling · 0 err (no drift → no re-emit) · dock --check PASS (1 INFO self-dock) · coverage 0/628 · 0 orphans. No NEW finding to route. (corpus quiescent on main since boot.)
- **Snapshot @ tick 96 (PASS):** flograph 443n/168e (--with-support --with-archive; +4 nodes vs T91 = the new S209 DD docs [cpa-concierge-pa · dock-for-codebase-health] + filed gaps) · currency-sweep **0 (clean)** · 40 unverified · 32 dangling · 0 dup · 0 err. dock --check PASS (1 INFO, self-dock `flograph.ts:391`) · coverage 0/628 (0.0%) · 0 orphans. **Re-emitted graph at T96 to clear the boot drift** (graph.json/mmd stale ERROR — deputy-owned projection; FIX-not-route). No NEW finding to route.
- **Snapshot @ tick 91 (PASS):** flograph 439n/154e · currency-sweep 0 · 36 unverified · 29 dangling · 0 dup · 0 err. dock PASS · coverage 0/628 · 0 orphans.
- **Snapshot @ tick 89 (PASS):** flograph 438n/154e · currency-sweep 0 · 36 unverified · 29 dangling · 0 dup · 0 err. dock PASS · coverage 0/628 · 0 orphans.
- **route to PA (open nit, standing):** §3 plain `flograph --emit` vs §3c `--check --with-support --with-archive` → graph.json drifts to the 190n default; the deputy compensates by emitting with the matching flags (`--emit --with-support --with-archive`). Align §3 with §3c (or make --check corpus-aware).

## In-flight dispatches (F3 watch list)

**4 agents in flight (T97 watch) — PA ALIVE (actively dispatching) → WATCH ONLY, no `(deputy) state` entries; never land. All base `c734ec35`.**
- **`a087942d525452e0e`** — §4 despace SPEC corpus-migration; actively WIP (`dda3a754` despace §19/§48/§54/§52/§53). worktree locked.
- **`a1125279d9fe597f6`** — **sPA ss2** engine-codegen ([14]-recommended next sPA); actively WIP (`cc26748f feat(ss2) §51.0.H opener-effect boot write-validation`). branch `worktree-agent-a1125279…`.
- **`a58c10079a8745823`** + **`a91d0c9f13ac99acb`** — just-provisioned at base `c734ec35`, no commits yet.
- F3 reminder: record a `(deputy) state` delta entry ONLY if one of these COMPLETES CLEANLY *while the PA is absent/rebooting*. A WIP/crashed/partial worktree is NOT a completion.
- (All prior S205-S209 agents landed + cleaned: ss1 `37a9a8c9` [7], ss3 `f9ccd275` [14], ss11 `b2a63c70` [16] — all PA-merged + 6b-cleaned. g-pure-module crash→S208-salvage loop closed.)

## Currency snapshot (@ tick 97)

- **maps:** watermark `9afc746e` — **OWED + DUE but DEFERRED** (≥2 mapped landings: ss1 + ss3 + `c734ec35` hos.scrml; refresh deferred through the live 4-agent despace+ss2 burst → burst-settle or next wrap-with-src-owed). **digest:** current (stamp `20eb6e39`; despace SPEC/test/example landings are non-projected-sources → not staled). **§0:** gap-counts + recent-sessions PASS. **§3c:** PASS (no drift since T96). board **HIGH 0 · MED 12 · LOW 19 · Nom 8** (ground-truth oracle @ HEAD).

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` into the worktree + main-clean verify; watermark `.claude/maps/primary.map.md` (`9afc746e`).
- `docs/changelog.md` · `@generated` §0 (`docs/known-gaps.md`) + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1). · flograph `scripts/flograph.ts` · dock `scripts/dock.ts` + `scripts/dock-health.ts` (§3c) · block-lease (groundwork built; not wired).

## Cross-refs

- `scrml/vpa.md` (root stub → boot phrase) · `scrml-support/vpa-scrml.md` — the deputy contract (§3 steady-state + §3c + S205 ACK+heartbeat + "Operating the live system"). · `pa-scrml.md` §"S199 addendum" — PA-side (gate, ACK/heartbeat read at boot+integration).
- `handOffs/delta-log.md` — the live PA-state stream. · `docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — the design.
