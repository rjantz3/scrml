change-id: `g1-server-sync-codegen-2026-06-14`. HIGH-severity codegen + COUPLED SPEC amendment, ratified S194 (gap `g-server-sync-codegen-noop`). You are scrml-js-codegen-engineer.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (do BEFORE any other tool call)
S99 had FIVE+ path-discipline leaks; this would be the next. Defend against it.
1. `pwd` via Bash. MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under `scrml-support/.claude/worktrees/` or anywhere else, STOP + report (S90 cwd-routing failure). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. `git rev-parse --abbrev-ref HEAD` (note the branch). Base is HEAD `46377508`.
3. `git status --short` clean.
4. `bun install` (worktrees don't inherit node_modules — the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise).
5. `bun run pretest` (populates `samples/compilation-tests/dist/` — gitignored; full `bun test` produces ~130 ECONNREFUSED failures without it).
6. **S126 edit discipline — MANDATORY:** apply ALL file edits via Bash (`perl -0pi`/`python3`/heredoc/`cp`) on **WORKTREE-ABSOLUTE paths that include the `.claude/worktrees/agent-<id>/` segment**, echoing the target path before each write + re-verifying via `git diff`/`grep` after. Do NOT use the Edit/Write tools (they have leaked to MAIN). NEVER `cd` into the main repo or anywhere — use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"` for bun, and worktree-absolute paths exclusively.
If ANY check fails: STOP and report. Do not proceed.

# MAPS — REQUIRED FIRST READ
Read `$WORKTREE_ROOT/.claude/maps/primary.map.md` in full (~100 lines) before other context. Follow its §"Task-Shape Routing" for "compiler-source bug fix / codegen". Map currency: maps reflect HEAD `0cafe665` as of 2026-06-14; HEAD is 10 commits ahead but those are EXAMPLE/DOC/TEST-only (no compiler source) — the codegen maps are current; verify any file you find was not modified after. In your final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "consulted but not load-bearing".

# READ-ONLY CONTEXT (at MAIN absolute paths — these are UNCOMMITTED, so they are NOT in your worktree; read them where they live, never edit them)
- **The ratified scope (read FIRST):** `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/g1-server-sync-codegen-2026-06-14/SCOPING.md` §8 — the ratified model + the exact amendment directions + the re-scoped fix + the empirical §7 findings.
- **The design-dive (the WHY + evidence):** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/server-state-persist-semantics-2026-06-14.md` (Q1=C, Q2=WF).
- **SPEC §52 is normative (Rule 4):** read `$WORKTREE_ROOT/compiler/SPEC.md` §52 (lines ~28641-29348) — esp. §52.6, §52.4.5, §52.5, §52.12 — IN YOUR WORKTREE.

# The ratified model (Q1=C / Q2=WF — S194, user-ratified)
§52 is a READ-AUTHORITY + reactive-wiring layer. The DEVELOPER owns the persist write (an explicit `?{}` server fn) at BOTH tiers. §52 does NOT auto-persist. The "auto-persist route" never existed — `emitServerSyncStub` is a `console.warn` no-op; corpus + every spec example + the founding debate already do dev-owned writes.

# PHASE 0 — SURVEY + HARD STOP GATE (do FIRST; commit a survey note; STOP if any item is a judgment call, do NOT guess)
1. **The optimistic-update-under-C disposition (load-bearing — pin this first; it drives BOTH the spec wording AND the codegen).** `emit-sync.ts:emitOptimisticUpdate` (97-118) emits a reactive subscriber whose ENTIRE body is `try { await _scrml_server_sync_<var>(next) } catch { rollback }`. Under Q1=C the sync route is DELETED — so the subscriber's sole purpose is gone. Resolve: **(i)** DELETE `emitOptimisticUpdate` entirely → §52 = load + SSR + E-AUTH only (the assignment is a normal reactive set; the dev's server-fn `!{}` owns errors); OR **(ii)** a real case exists to retain a repurposed true-optimistic mode. NOTE: the DD's amendment-#1 prose says "keep optimistic-local + rollback," but the SOURCE shows they only wrap the now-deleted sync route — VERIFY against source + SPEC §52.6.2/§52.6.3 which is correct. If it's a clean source-derived answer (likely (i)), proceed. **If it's a genuine judgment call, STOP and report both options with your lean.**
2. **Tier-1 sizing.** Tier-1 (`< Type authority="server" table=>`) has ZERO sync codegen (`collect.ts` has only `collectServerVarDecls`). Under C, Tier-1 needs only the READ-authority half: a collector + initial-load (`SELECT *` from `table=`) + SSR pre-render + E-AUTH (the WRITE is the dev's `?{}`). Survey whether that's a bounded extension of the Tier-2 + `/__mountHydrate` machinery (`emit-server.ts:1540-1580`) or larger. If larger than a clean single unit, you're AUTHORIZED to land Phase 1 + the Tier-2 changes + the honesty findings and SPLIT Tier-1 read-authority into a committed follow-on (note it in progress.md). Don't force a too-big unit.
3. Confirm the server-file emission gate (`emit-server.ts:526-533`) — under C, determine whether any server-side output is still needed for server-authority cells.
Commit the survey note to `$WORKTREE_ROOT/docs/changes/g1-server-sync-codegen-2026-06-14/progress.md` before Phase 1.

# PHASE 1 — SPEC amendment (normative half — coupled with Phase 2)
In `$WORKTREE_ROOT/compiler/SPEC.md`:
1. **§52.6.2 — RETRACT auto-persist.** Reword per the Phase-0 disposition; remove "a generated server route receives the new value and persists it."
2. **§52.6.3 (Rollback)** — reconcile with Phase-0 (under (i), the auto-sync rollback no longer exists; the dev's `!{}` owns errors).
3. **§52.4.5** comment `// optimistic update + server write (auto-generated)` → correct it (the write was `createCard()`'s explicit INSERT).
4. **§52.5** summary table "Sync Generated" column, server rows → drop the implied auto-write; state what §52 actually generates.
5. **§52.6.5 — ADD a symmetric WRITE convention** for Tier-2 (mirror Pattern A/B load): writes flow through a dev server fn; if neither load nor write convention detected → local placeholder (warning).
6. **§52.12 SPEC-ISSUE-026 — mark RESOLVED.**
7. **§52.6** "the developer SHALL NOT write any of this manually" — soften for the write verb.
Then `bun --cwd "$WORKTREE_ROOT" run scripts/regen-spec-index.ts` (regen the Sections line ranges). **Do NOT touch the §52↔§38 server-push bridge — that's a separate debate-settled (P1) amendment, OUT OF SCOPE.**

# PHASE 2 — codegen (implements the model)
1. **Delete `emitServerSyncStub`** (`emit-sync.ts:145`) + its call (`emit-reactive-wiring.ts:595`).
2. **`emitOptimisticUpdate`** — per Phase-0 disposition (delete entirely if (i), or repurpose if (ii)); remove the `_scrml_server_sync_<var>` call regardless.
3. **Tier-1 read-authority codegen** (full, or split-as-follow-on per Phase-0): collector for `< Type authority="server" table=>` + instances `< Type> @var`; `SELECT *` initial-load from `table=`; SSR pre-render; E-AUTH. NO write route (dev's `?{}`).
4. **Honesty findings (SCOPING §7):** (a) Tier-1 currently compiles CLEAN with zero sync + no diagnostic → add an interim W-AUTH-class warning surfacing the residual gap; (b) the server-file emission gate fires on server-authority cells where server output is needed.
5. **Tests coupled (S113):** codegen + its tests are ONE logical unit — commit together. Invert/update any locked tests asserting the old stub/auto-persist behavior (they locked the no-op).

# PHASE 3 — R26 EMPIRICAL VERIFY (MANDATORY — S138; do NOT mark DONE without it passing)
```
mkdir -p /tmp/r26-g1
bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/examples/18-state-authority.scrml --output-dir /tmp/r26-g1/18 > /tmp/r26-g1/18.log 2>&1
```
Plus a fresh Tier-2 (`<clicks server> = 0` + a write) and Tier-1 (`< Task authority="server" table="tasks">` + `< Task> @tasks`) reproducer (NB: the state-TYPE decl needs the leading space `< Task …>` per §52.3.1 EBNF — `<Task>` parses as a component). Confirm: NO `console.warn("scrml: server sync stub` and NO `_scrml_server_sync_` in any emitted client JS; Tier-1 emits the `SELECT *` initial-load (if landed) OR the interim warning fires (if split); `node --check` exit 0 on every emitted `.js`; pre-commit subset `bun test compiler/tests/{unit,integration,conformance}` GREEN.

# Commit discipline (S83)
After EVERY edit: `git -C "$WORKTREE_ROOT" diff`, `git add`, commit IMMEDIATELY (WIP fine; don't batch). Before DONE: `git status` clean ("work in worktree, no commits" is NOT acceptable). First commit message includes your verbatim startup `pwd`: `WIP(g1): start at <pwd>`. Append to progress.md after each step.

# Report back
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the Phase-0 optimistic-under-C disposition (i/ii) + why · whether Tier-1 read-authority landed fully or split · the R26 grep results · deferred items · the maps feedback line.

---
**Dispatch metadata:** agentId `a779b14a01b6258de` · isolation:worktree (base `46377508`, allocated `scrmlTS/.claude/worktrees/agent-a779b14a01b6258de`) · model opus · run_in_background · dispatched S194 2026-06-14.
