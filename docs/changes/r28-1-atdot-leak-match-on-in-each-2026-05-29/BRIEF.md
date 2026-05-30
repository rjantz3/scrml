# DISPATCH CONTEXT
You are a scrml compiler-source bug fix (gauntlet R28 fix-wave, S143). Baseline: scrmlTS HEAD `eda211f2` (v0.6.11; emitted-JS parse gate DEFAULT-ON). You work in an `isolation: "worktree"` checkout.

# MAPS — currency note
Maps at `.claude/maps/primary.map.md` reflect HEAD `9ab7aa38`; current HEAD `eda211f2` is 12 commits ahead (S142 errorBoundary/gate-flip + R28 docs — NONE touched your fix file). Read primary.map.md §Task-Shape Routing (compiler-source bug fix) as a STARTING HYPOTHESIS; verify against current source via grep/Read.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
S99 has had FOUR path-discipline leaks + S126 had FOUR Edit/Bash-divergence leaks; a leak here would be the next incident. Hold the line.
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo (e.g. scrml-support) → STOP and report (S90 CWD-routing failure). Save as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" status --short` clean.
4. `git -C "$WORKTREE_ROOT" merge main` (your base may be a session-start snapshot; merge current main — should be clean/fast-forward).
5. `cd "$WORKTREE_ROOT" && bun install` (worktrees don't inherit node_modules).
6. `bun run pretest` (populates samples dist for browser tests).
7. Your FIRST commit message MUST include the verbatim `pwd` output: `WIP(<task>): start at <pwd>`.

## Path discipline (MANDATORY — S126):
- Apply ALL file edits via Bash (`perl -i -pe` / `python3` / `cat > heredoc`) on WORKTREE-ABSOLUTE paths containing the `.claude/worktrees/agent-<id>/` segment. Do NOT use the Edit/Write tools for source files (they leaked to MAIN — S126). Echo the target path before each write; re-verify with `git -C "$WORKTREE_ROOT" diff` after.
- NEVER `cd` into the main repo or anywhere outside WORKTREE_ROOT for writes/installs/compiles. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths. Reading docs from main (e.g. the R28 dev sources in scrml-support) is READ-ONLY and fine.

# COMMIT DISCIPLINE (S83 two-sided)
After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>`; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY. Don't batch. Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. Do NOT use `--no-verify` — if the pre-commit gate fails on an env race, STOP and report, never bypass.

# PHASE 3 — R26 EMPIRICAL VERIFICATION (S138 — MANDATORY before DONE)
This fix relies on the real compile path; AST-synthesizing regression tests can pass while the real path stays broken. Before claiming DONE you MUST re-compile the real R28 adopter source(s) + a minimal repro on your POST-FIX baseline and confirm the symptom is gone AND no new symptom appears (see per-bug commands). Compile via `cd "$WORKTREE_ROOT" && bun compiler/bin/scrml.js compile <file> --output-dir /tmp/r28fix-<id>/out` (gate is ON). DO NOT mark DONE without R26 passing.

# REPORT (final message, structured)
WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED · REGRESSION-TESTS-ADDED (file + count) · R26-RESULT (the compile/grep evidence) · STOPPED? (if the fix risks regressing other shapes, STOP and report the survey rather than force it) · MAPS-FEEDBACK (load-bearing finding, or "not load-bearing").

# BUG R28-1 (HIGH, gate-caught) — @. each-sigil leaks raw into emitted JS for <match on=@.field> inside <each as alias>
**Symptom (overseer + gate confirmed):** a block-form `<match for=T on=@.field>` nested inside `<each ... as alias>` emits `_scrml_match_match_NNN_dispatch(@.field)` — raw `@.` survives into client.js → `E-CODEGEN-INVALID-JS` (gate-caught; pascal byte 3171). The `@.`-to-loop-var lowering is dropped for the match dispatch expression specifically when an `as`-alias is active on the enclosing `<each>`. Both `<each as>` and `<match on=@.>` are individually canonical; only the COMBINATION fails.

**CONTEXT-DEPENDENT — does NOT reproduce in a minimal isolated file** (the `match_NNN` dispatch-counter interaction with many matches in a full file). **Your reproducers are the dev sources** (READ-ONLY from scrml-support): /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r28/dev-2-go.scrml · /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r28/dev-3-elixir.scrml · /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r28/dev-5-pascal.scrml. Each ORIGINALLY had `<match on=@.field>` inside `<each as>`; the devs WORKED AROUND it by changing to `on=alias.field`. To reproduce, copy a dev source into /tmp and revert the workaround (`on=alias.field` → `on=@.field`) at the offending site, then compile → the gate fires.

**Fix-locus:** `compiler/src/codegen/emit-match.ts` — the `on=` expression lowering (Bug 52 `resolveOnExpr` prior art at `a30d86d1`; Bug 32 `rewriteAtDot*` in emit-table-for.ts is the `@.`-in-each-context analog). The `@.` / `@.field` in the match `on=` attribute must lower to the enclosing `<each>`'s current-iteration variable (the `as`-alias name, or the synthetic loop var) — the same lowering tableFor column slots got in Bug 32.

**SPEC (Rule 4):** §17.7 (each `@.` current-iteration sigil + `as`-alias) · §18.0.1 (block-form `<match on=expr>`).

**R26 Phase 3:** with the reverted-to-`@.` dev sources → confirm the gate NO LONGER fires, node --check passes, and the dispatch call uses the loop var (grep: no raw `dispatch(@.` in client.js). Then compile the dev sources AS-IS (with their `alias.field` workaround) → no regression. Add a regression test (you may need a multi-match fixture to reproduce the context-dependence — note this in your report if a single-match fixture won't trigger it).
