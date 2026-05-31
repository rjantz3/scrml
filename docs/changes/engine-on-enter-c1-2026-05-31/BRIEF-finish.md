# BRIEF (FINISH) — Engine on-enter opener `effect=` C1 — complete a crash-recovered dispatch

Change-id: `engine-on-enter-c1-2026-05-31` (continuation). Agent: scrml-js-codegen-engineer · isolation: worktree · model: opus.

## Situation — a prior agent crashed mid-codegen. You are FINISHING its work.
A prior dispatch (transient socket crash after 97 tool-uses) implemented this feature through
codegen but **never wrote tests, never ran R26, never gated the codegen**. Its work is on
branch `worktree-agent-a0e864eeba0e8c568` (all committed there now): parser + SYM + the codegen
(emit-engine.ts + emit-client.ts). The codegen is UNVERIFIED — it was authored but never
compiled or test-driven. Your job: inherit it, VERIFY/FIX it, write the tests, run R26, gate.

The feature (fully ratified, SPEC core at base): `effect=${...}` on the `<engine>` OPENER runs
ONCE at module-init (boot-only Elm init+Cmd); forbidden on derived engines
(`E-ENGINE-EFFECT-ON-DERIVED`); writes inside checked against `.<initial>.rule` (DEFERRED by the
prior agent per B15 raw-text precedent — keep deferred with a `.skip` test). Read SPEC §51.0.H
"Form 3" + §51.0.J + §51.0.R for the ratified semantics. The README Stage-3 flagship (`README.md`
~L239) is the canonical shape.

================================================================================
# STARTUP (S99: 20 prior leaks; this would be #21) + INHERIT THE PRIOR WORK
================================================================================
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   Save as WORKTREE_ROOT. (Wrong repo → STOP, S90.)
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean.
3. **INHERIT:** `git -C "$WORKTREE_ROOT" merge worktree-agent-a0e864eeba0e8c568 --no-edit`.
   Then confirm: `grep -c "emitEngineOpenerEffect" "$WORKTREE_ROOT/compiler/src/codegen/emit-engine.ts"`
   MUST be >= 1, and `grep -c "openerEffect" "$WORKTREE_ROOT/compiler/src/symbol-table.ts"` >= 1.
   If the merge fails or those greps are 0, STOP and report.
4. `bun install` ; `bun run pretest`.

PATH DISCIPLINE (S99 + S126): ALL edits via Bash (`perl`/`python`/`cp`/heredoc) on
WORKTREE-ABSOLUTE paths incl. the `.claude/worktrees/agent-<id>/` segment. NO Edit/Write tool on
source. NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"` + `bun --cwd "$WORKTREE_ROOT"`. First
commit message embeds `pwd`.

Maps: `.claude/maps/primary.map.md` reflects `09f74bee`; current for compiler-source (no
compiler-source landed since). Report maps-consulted feedback.

================================================================================
# WORK — verify, then test, then R26, then gate
================================================================================
## Step A — VERIFY/FIX the inherited codegen (it was never run)
Read the prior agent's codegen: `emit-engine.ts` `emitEngineOpenerEffect` +
`emitEngineOpenerEffectsForFile`, and the `emit-client.ts` wire-in. Sanity-check its API usage —
the prior agent GUESSED these without running them:
- `require("../block-splitter.js").runBlockSplitter({filePath, source})` — confirm the real export
  name + signature (it may be `splitBlocks` / a different shape). FIX to the real API.
- `require("../ast-builder.js").buildAST(bsOut)` — confirm real export + the shape of `built.ast.nodes`.
- `require("./emit-logic.ts").emitLogicBody(stmts, opts)` — confirm real export name + opts shape
  (`EmitLogicOptsLike`, `boundary`, `engineBindings`). FIX as needed.
- `rewriteHookExprText` — confirm it's imported/in-scope in emit-engine.ts.
Compile a minimal opener-effect engine and a derived+opener-effect engine; iterate until the
codegen emits valid JS. The acceptance bar is the R26 flagship (Step C), not just "no throw".

## Step B — Tests (`compiler/tests/unit/engine-opener-effect-c1.test.js` + browser acceptance)
- PARSE: opener `effect=${...}` → engine-decl.openerEffect populated; absent → null; existing
  engines unchanged.
- SYM: derived + opener effect → `E-ENGINE-EFFECT-ON-DERIVED` fires (test BOTH derived forms —
  `derived=@x` legacy-source-var AND inline-match `derived=match @x {...}`); non-derived → no error.
- SYM write-validation: `.skip` test documenting the deferred `.initial.rule` check (B15-style).
- CODEGEN: non-derived opener effect emits a module-init fire; `node --check`-clean; boot-only (the
  effect body appears ONCE on module-init, NOT inside a per-arm re-entry handler); tree-shake when
  absent (engine with no opener effect emits zero opener-effect code).
- HAPPY-DOM ACCEPTANCE (load-bearing, S139 `node --check`≠correct): the README-flagship shape
  boots, the boot effect runs ONCE, `@tasks` loads, and the engine transitions out of `.Loading`
  to `.Empty`/`.Editing`. Put it where existing engine browser/happy-dom acceptance tests live.

## Step C — R26 empirical (MANDATORY, S138 — codegen fix)
1. Reproducer `/tmp/r26-c1-verify/flagship.scrml` = the README Stage-3 engine, standalone-compilable.
2. `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/r26-c1-verify/flagship.scrml --output-dir /tmp/r26-c1-verify/out > /tmp/r26-c1-verify/log 2>&1`
3. Report exact greps: (a) the boot effect's `loadTasks` call appears at module-init, NOT inside a
   per-arm handler; (b) `node --check` exit 0 on the emitted JS; (c) a derived+opener-effect
   reproducer FAILS with `E-ENGINE-EFFECT-ON-DERIVED` (not a silent accept).
4. DO NOT mark DONE without R26 passing.

## Step D — Gate + clean terminal state
- Commit per unit (codegen-fixes / each test file). Update progress.md Phase-2/3 checkboxes.
- Run FULL `bun --cwd "$WORKTREE_ROOT" run test` (chains pretest) before final commit. If the
  within-node parity test trips (the parser/codegen changed engine-decl shape — pre-commit
  EXCLUDES within-node, full suite includes it), investigate: if the parity move is BENIGN (live
  moved to a correct shape), surgically rebump the allowlist; do NOT mass-rebump.
- `git -C "$WORKTREE_ROOT" status --short` MUST be clean before reporting DONE.

# FINAL REPORT: WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the Step-A codegen-API fixes you made ·
# R26 exact results · test counts · full-suite pass/fail/skip · any within-node rebump · deferrals.
