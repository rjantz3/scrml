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

# BUG R28-2 (HIGH) — tableFor <column> row-access broken BOTH ways (= un-defer Bug 54)
**Symptom (PA-verified):**
- `<column field="status" :let={(r) => <span>${r.status}</span>}/>` — the SPEC §41.16.3-MANDATED parametric-slot form — is forwarded as a plain HTML attribute (`W-ATTR-001`) and the slot body is discarded (gate-fires `E-CODEGEN-INVALID-JS` in full-file contexts where the arrow lands in JS statement position).
- `<column field="status"><span>${@row.status}</span></column>` — the SPEC §41.16.10-DEFERRED implicit form — compiles but emits `_scrml_reactive_get("row").status`, reading a NONEXISTENT reactive cell named "row" instead of the per-row binding (silent wrong lowering).

**Result:** tableFor column slots are non-functional for row data via EITHER documented path.

**Fix-locus:** `compiler/src/codegen/emit-table-for.ts`. Prior art: Bug 32 (S137 `68bfb4a4`) added `rewriteAtDot*` helpers for `@.` inside column slots — the per-row substitution machinery partly exists. 
- PRIMARY: implement the `:let={(name) => <markup>}` parametric-slot per §16.6 — substitute the bound name (`r`/`row`/adopter-chosen) → the per-row variable in the emitted `<td>` body; do NOT treat `:let` as an HTML attribute.
- SECONDARY: `@row` must NOT lower to `_scrml_reactive_get("row")`. Either resolve `@row` to the per-row variable, OR (if §41.16.10 truly defers it) emit a clean diagnostic instead of silent-wrong codegen. Per SPEC §41.16.3 the `:let` form is canonical — prioritize making it work.

**SPEC (Rule 4):** §41.16.3 (slot body SHALL expose row via `:let={(row)=>...}` per §16.6) · §16.6 (parametric-slot `:let` scope) · §41.16.10 (defers implicit @row to v1.next).

**R26 Phase 3:** re-compile the R28 tableFor users from scrml-support (READ-ONLY): /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r28/dev-1-react.scrml, /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r28/dev-3-elixir.scrml, /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r28/dev-5-pascal.scrml — plus a minimal repro with a `:let` column slot. Confirm: the `:let` slot emits the row-field access (not W-ATTR-001), `@row` no longer emits `_scrml_reactive_get("row")`, node --check passes. Add regression tests (emit-shape assertions on the `<td>` body).

**Note:** this RE-OPENS the DEFERRED Bug 54 (`tableFor :let` parse-layer). If the parametric-slot wiring is large/multi-stage, land what you can + STOP-and-report a survey of the remainder.
