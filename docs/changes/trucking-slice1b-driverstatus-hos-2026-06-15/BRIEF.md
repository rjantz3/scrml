# BRIEF — Trucking slice 1b: DriverStatus enum-wiring (HOS engine showcase DEFERRED to the E-leg)

**Change-id:** `trucking-slice1b-driverstatus-hos-2026-06-15`
**Dispatched:** S198 (2026-06-16), PA → `scrml-js-codegen-engineer`, `isolation: "worktree"`.
**Task shape:** corpus rewrite (writing canonical scrml in `examples/23-trucking-dispatch/`). NOT a compiler-source change — do NOT touch `compiler/src/**`.

---

## WHAT YOU ARE DOING (one paragraph + the scope decision)

Wire the EXISTING `DriverStatus:enum` (`OffDuty, OnDuty, Driving, SleeperBerth`, already declared in `schema.scrml`) into the driver pages — replace the snake_case status string if-chains with exhaustive `match`, and migrate `drivers.current_status` storage to the **variant name** (`"OffDuty"`). This mirrors the LANDED slice 1a (LoadStatus). **SCOPE DECISION (user-ratified S198):** the HOS `<engine for=DriverStatus>` SHOWCASE is **DEFERRED** — HOS loads `current_status` client-side `on mount` (cookie session token), but the engine-hydration primitive (`initial=@cell`) snapshots at CONSTRUCTION, so it doesn't fit HOS as architected; the actual engine needs the deferred E-leg (`<engine server>` fetch-on-mount, §52). So this slice does the **enum-wiring + a `match`-based transition validator** (NOT a live engine). You will REMOVE the dead `<engine for=DriverStatus initial=.OffDuty>` decl in `hos.scrml` (it's declared-then-bypassed today — never read/written — misleading teaching) and replace its role with the clean `match`-based transition validation, plus a short comment documenting the deferral.

## THE RATIFIED DECISION (do not re-litigate — same as slice 1a)
**Store the variant name; match directly; no mapper.** `drivers.current_status` seed/writes store the variant name (`"OffDuty"` was `"off_duty"`); `match for=DriverStatus on=<status-string>` (block-form markup) and value-return `match status { .OffDuty :> ... }` (helpers) dispatch directly against variant names; an enum-typed cell binds into SQL as its variant-name string. Empirically verified in slice 1a — rely on it.

## EMPIRICAL FACTS (verified in slice 1a — do not re-derive)
1. **Value-return `match status { .OffDuty :> "..." ... }` is exhaustive ONLY when the param is typed as the enum** (`status: DriverStatus`) → missing arm fires `E-TYPE-020`. A `string` param has NO exhaustiveness on value-return match. So type the helper params `DriverStatus` (the stored variant-name string flows into a `DriverStatus` param with no error + no mapper — the slice-1a `<match for=Enum on=@stringCell>` precedent). This RESTORES the compile-time forcing-function.
2. **`|`-pattern-alternation arms (`.A | .B :> v`) are REJECTED in value-return `match`** (`E-SYNTAX-011`, the slice-1a finding `g-match-alternation-value-vs-derived`) — use one-arm-per-variant (still exhaustive). (They ARE accepted in `derived=match`, but you're not using that here.)
3. **`examples/23-trucking-dispatch/components/load-status-badge.scrml` + `status-picker.scrml` (LANDED slice 1a) are your in-repo reference shapes** — the badge/label helpers + the `validNextStates` transition table are exactly the DriverStatus shapes you mirror.

## CONSISTENCY GATE (load-bearing — compile-clean is NECESSARY BUT NOT SUFFICIENT)
After the rewrite, grep `examples/23-trucking-dispatch/` for residual snake_case DRIVER-status literals — `"off_duty"`, `"on_duty"`, `"driving"`, `"sleeper_berth"` — in `.scrml` code, SQL strings, AND hos_change payloads. After migration this MUST be ZERO (variant names `"OffDuty"`/`"OnDuty"`/`"Driving"`/`"SleeperBerth"` only). Report before/after counts. **OUT OF SCOPE — do NOT migrate:** tractor `status` (`"active"`/`"maintenance"`), customer `account_status`, and the LOAD status (`LoadStatus` — already migrated in slice 1a; leave it). Only the DRIVER status (`DriverStatus` variant set) migrates here.

## SCOPE — files (DriverStatus only)
1. `components/driver-card.scrml` — `driverStatusClasses(status)` + `driverStatusLabel(status)` string if-chains → value-return `match` over a `DriverStatus`-typed param. (These are imported by `hos.scrml` + `home.scrml`.)
2. `pages/driver/hos.scrml` — (a) REMOVE the dead `<engine for=DriverStatus initial=.OffDuty>` decl (lines ~71-76) — it's never read/written; add a short comment: "HOS state machine is a `match`-based transition validator here; the `<engine>` form is deferred pending engine-hydration-from-persisted-state (the E-leg, `<engine server>` §52 fetch-on-mount) — HOS loads `current_status` client-side `on mount`, which the construction-snapshot `initial=@cell` A-leg does not fit." (b) The `changeHosServer` string transition if-chain (lines ~146-153) → a clean `match`-based transition validator (`fn isValidHosTransition(from: DriverStatus, to: DriverStatus) -> boolean` or a `validNextStates(current: DriverStatus) -> DriverStatus[]`, mirroring `status-picker.validNextStates`). (c) the `setStatus("off_duty")` buttons + markup `@currentDriver.current_status` reads → variant names; `driverStatusClasses`/`Label` now take `DriverStatus`.
3. `pages/driver/home.scrml` — DUPLICATE HOS transition logic (~lines 109-116) → collapse to the shared validator from hos.scrml (or a shared helper); driver-status reads → the rewritten helpers.
4. `seeds.scrml` — `drivers.current_status` `'off_duty'`→`'OffDuty'` (the INSERT/SELECT at ~line 324 + any driver seed status). Leave the LOAD status (already `"Tendered"` etc. from 1a) + tractor/customer status UNCHANGED.
5. **Write/compare SQL + payloads:** `UPDATE drivers SET current_status = '<snake>'`, `WHERE current_status = '<snake>'`, the `hos_change` payload `{"from":"<snake>","to":"<snake>"}` (the `parseFromPayload`/`parseToPayload` consumers feed `driverStatusLabel` — make the payload store variant names so the labels resolve) → variant names.

If you find a DriverStatus string if-chain in a file not listed, migrate it too (the consistency grep is the backstop). If a file balloons or you hit a real compiler gap, STOP and report.

## STARTUP — MERGE MAIN FIRST (S112 stale-base; seeds.scrml overlaps slice 1a)
Your worktree branches from the SESSION-START commit (`23fbca78`), which PRE-DATES the landed slice-1a (`d18ac83a`) + F-primitive (`7532bd8f`) commits. **`seeds.scrml` was migrated by slice 1a (loads status) and you migrate it again (drivers status) — an overlap.** So AFTER the startup verification + `bun install`, run `git -C "$WORKTREE_ROOT" merge main` (main = local, has 1a+F unpushed) to fast-forward your worktree onto `7532bd8f`. Confirm `git -C "$WORKTREE_ROOT" log --oneline -2` shows the F-primitive + 1a commits. Then `seeds.scrml` already has 1a's loads-status migration and you ADD the drivers migration on top — no clobber. (If the merge surfaces a conflict, STOP + report.)

## MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; §"Task-Shape Routing" for a corpus/scrml-writing task. Currency: watermark `471cbb34`; HEAD `7532bd8f` (post-1a/F; corpus + engine-codegen, not the driver files). This is example-writing — the kickstarter + the LANDED slice-1a reference files are the load-bearing inputs, not the compiler-navigation maps. Report the maps-consulted line.

## MANDATORY READS BEFORE WRITING SCRML
1. `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL (reread before each file). 2. `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`. 3. The LANDED slice-1a reference shapes: `examples/23-trucking-dispatch/components/load-status-badge.scrml` + `status-picker.scrml` (after the merge-main, these are present). 4. `examples/23-trucking-dispatch/schema.scrml` (DriverStatus decl) + the target files.

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Worktree path harness-assigned under `.claude/worktrees/agent-<id>/`. BEFORE any other tool call: 1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP — S90). Save as WORKTREE_ROOT. 2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. **`git -C "$WORKTREE_ROOT" merge main`** (the S112 step above). 6. `bun run pretest`.
Path discipline: ALL edits via **Bash** (`perl`/`python3`/heredoc) on worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (S126). Echo path before each write; re-verify with `git diff`/`grep`. NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.

## COMMIT DISCIPLINE
Commit per file/sub-bucket — do NOT batch. First commit message includes verbatim `pwd`. After each edit: `git -C "$WORKTREE_ROOT" diff`; add; commit. Before DONE: `git status` clean. Update `docs/changes/trucking-slice1b-driverstatus-hos-2026-06-15/progress.md` (append-only). Code rewrite + seed/write migration are ONE logical unit (a half-migrated app breaks at runtime).

## VERIFICATION — R26 (MANDATORY before DONE)
1. Per-file compile (baseline each file BEFORE your edit so you own only NEW diagnostics). 2. Whole-example: compile the driver pages (`pages/driver/*.scrml`) + `app.scrml` clean; `node --check` emitted JS. 3. The consistency-grep gate — ZERO residual snake DRIVER-status literals; report before/after. 4. Report per-file results, consistency-grep counts, FINAL_SHA, FILES_TOUCHED, deferred items.

## FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · the merge-main confirmation (log shows 1a+F) · per-file compile results · consistency-grep before/after · maps-consulted line · any compiler gaps · deferred items (the HOS engine showcase = E-leg). Your final message IS the return value — data, not prose.
