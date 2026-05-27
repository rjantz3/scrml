# R25-Bug-38 — `!{}` arm body codegen (broader case; distinct from Bug 36)

You are dispatched to fix known-gaps Bug 38 (gauntlet R25 finding; HIGH severity; 4/4 R25 devs tripped it). This is the BROADER case of R24-BUG-2 (Bug 29 narrow) — the deeper call-site `!{}` handler emission gap that S136's `c7e81962` did NOT close.

Change-id: `r25-bug-38-guarded-expr-arm-body-2026-05-27`

The PA archives this brief to `docs/changes/r25-bug-38-guarded-expr-arm-body-2026-05-27/BRIEF.md` per pa.md S136 addendum.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path: provided by the harness (run `pwd` to learn it).

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If the path is under any other repo (e.g., `scrml-support/.claude/worktrees/`), STOP and report — this is the S90 CWD-routing failure mode. Save the output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit node_modules from main; pre-commit hook's `bun test` will fail otherwise.
5. Run `bun run pretest` via Bash. This populates `samples/compilation-tests/dist/` (browser-test fixtures). Without it the full-suite has ~130 ECONNREFUSED failures.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Echo-pwd-in-first-commit (S99 discipline aid — leak counter is at 20; this would be incident #21)

Your FIRST commit message MUST include the verbatim output of `pwd` from your startup verification, e.g.: `WIP(r25-bug-38): start at $(pwd)`. PA verifies on landing that the recorded `pwd` starts with the `.claude/worktrees/agent-` segment. Mismatch = leak.

## Path discipline (enforce on EVERY edit call)

**S126 mitigation in force — apply file edits via BASH (`perl`/`python`/`sed -i`/`cp`/heredoc), NOT the Edit/Write tools, on worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment.** Rationale: S126 incidents #12-#13 were both Edit/Bash filesystem-divergence — the Edit tool wrote to PRIMARY MAIN while Bash/git saw the worktree. Bash writes go where `pwd` / `git` resolve, sidestepping the divergence.

- Echo the target absolute path before each write.
- Re-verify via `git diff` / `grep` after each write.
- **NEVER `cd` into the main repo from this worktree.** Use `git -C "$WORKTREE_ROOT"` and worktree-absolute paths exclusively. S126 incident #14 (MCP-C) leaked a `bun add` into MAIN via `cd <main-path> &&`.
- If an intake doc references a path like `/home/bryan-maclee/scrmlMaster/scrmlTS/foo/bar.ts`, translate it to `$WORKTREE_ROOT/foo/bar.ts` before writing.

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full. It is ~100 lines.

The §"Task-Shape Routing" section tells you which additional maps to consult based on your task shape. This task is a **compiler-source bug fix** (codegen subsystem). Follow that routing.

Map currency: maps reflect HEAD `27e14c66` as of `2026-05-27T04:14:32Z` (S135 watermark). Current main is at `050e20e8` — 22+ commits ahead. **Critical post-map landing:** commit `c7e81962` (R24-BUG-2; S136) modified `compiler/src/codegen/emit-logic.ts` case `"guarded-expr"`'s `emitArmAssign` closure (added terminating-statement detection). Bug 38 is the direct sequel — treat the `c7e81962` diff as ground truth, NOT the map's pre-S136 file shape.

Run `git log --stat c7e81962 -- compiler/src/codegen/emit-logic.ts` to see the R24-BUG-2 diff in full.

Feedback: in your final report, include either:
- "Maps consulted: [list]; load-bearing finding: <one sentence on what the map content told you>"
- "Maps consulted but not load-bearing — [optional]"

Either answer is fine. It's signal PA needs.

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md` (above)
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — read in full BEFORE writing any code; reread before each major edit. Ghost-pattern mitigation (S136 R25 confirmed adopter agents drift into React/Vue syntax under load; you are writing JS-output codegen so this matters for your test fixtures).
3. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — canonical scrml shape; required for any test fixtures you write.

# THE BUG

## Symptom (R25 4/4-dev cross-confirmed)

`<failable-fn-call>() !{ | .Variant arg -> { @x = "value"; @y = 0 } | .Other -> { ... } }` — **arm bodies do not appear in emitted JS**. Compile exits 0; `node --check` reports `statement boundary not detected` warnings; runtime behavior is wrong (state writes inside arms never fire).

Three reproducer shapes, all FAIL post-S136 `c7e81962` (R24-BUG-2 narrow fix):

1. **Multi-line arm body:**
   ```scrml
   someCall() !{
       | .Variant arg -> { @x = "value"; @y = 0 }
       | .Other       -> { ... }
   }
   ```

2. **Single-line collapsed arm body:**
   ```scrml
   someCall() !{ | .Variant -> @x = 1 }
   ```

3. **`const r = ...` "workaround" form:**
   ```scrml
   const r = someCall() !{
       | .X -> {...}
       | .Y -> {...}
   }
   ```
   Suppresses E-ERROR-002 + emits a resultVar binding, but arm bodies STILL do not emit.

## R25 dev/overseer evidence

Residual statement-boundary warnings after Bug 36 fix (`e1269844`, S136):
- dev-1-react: 7 → 4 (residual 4 = Bug 38)
- dev-2-elixir: ? → 3 (residual = Bug 38)
- dev-3-svelte: 4 → 0 (dev-3 didn't trip Bug 38)
- dev-4-pascal: ? → 0 (dev-4 didn't trip Bug 38)

Cross-references:
- `docs/known-gaps.md` Bug 38 entry (lines 209-223)
- `scrml-support/docs/gauntlets/gauntlet-r25-report.md` Bug 38 entry
- R24-BUG-2 (Bug 29 narrow) RESOLVED `c7e81962` — your direct mechanical precedent
- Bug 36 RESOLVED `e1269844` (function-decl-head parser; CONFIRMED DISTINCT from Bug 38 by R25-Bug-36 agent's investigation)

## Locus hypothesis (verify, don't trust)

PA brief HYPOTHESIS: the call-site `!{}` handler emitter in `compiler/src/codegen/emit-logic.ts` case `"guarded-expr"` is the load-bearing site (same case the R24-BUG-2 fix extended). The R24-BUG-2 `emitArmAssign` extension only added terminating-statement detection for the bare-terminator early-exit shape; it did NOT generalize to the multi-line arm-body / single-line value-producing arm / const-workaround value-binding shapes.

**S136 methodology lesson:** brief-hypothesis suspect-file lists drift. **Grep-driven triage is load-bearing.** Both R24-BUG-2's and R25-Bug-36's PA briefs named wrong files; the agent's `grep`-on-smoking-gun-strings was the load-bearing tool. Apply that here: grep for the failure symptom (e.g., `statement boundary not detected` literal in compiler source), then trace UP from where it fires to the emit path that should have emitted the arm body. Use the maps to confirm file roles, but trust your grep over my hypothesis.

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. **Run the three reproducer shapes** as standalone `.scrml` files and observe the compiled JS output. Confirm:
   - Multi-line arm body produces no arm code (arm-body statements absent from `client.js`)
   - Single-line collapsed arm body produces no arm code
   - `const r = ...` workaround produces resultVar binding but no arm code
2. **Compare** the post-S136-fix emit-logic.ts case `"guarded-expr"` output to what SPEC §19.5 + PRIMER §6 say SHOULD be emitted.
3. **Trace the codegen path** the compiler takes for these three shapes. Use grep on the actual emitted-JS shapes (e.g., `_result =` or the missing arm-body strings) to find the emission site.
4. **Report your root-cause hypothesis** in `docs/changes/r25-bug-38-guarded-expr-arm-body-2026-05-27/progress.md` BEFORE writing any fix code. If your hypothesis disagrees with the brief's suspect-file, surface that — the brief is fallible (per the S136 lesson above).

If `progress.md` is in your worktree, append; otherwise create it.

## Phase 1 — fix

Apply the minimal fix that closes all three reproducer shapes. Likely shape (verify, don't trust):
- Extend `emitArmAssign` (or a sibling emitter in the same `"guarded-expr"` case) to handle the full arm-body emission space:
  - Multi-line bodies with internal `;`-separated statements
  - Single-line value-producing arm bodies (no terminator; pure side-effect or pure value-binding)
  - Mixed: arm bodies that have side-effects AND a value/terminator
- Compose correctly with the existing R24-BUG-2 terminator detection (don't break the narrow case).
- Compose correctly with the `const r = ...` resultVar binding (the workaround shape) — the resultVar should still bind correctly, but arm bodies should also emit.

## Phase 2 — regression tests

Write a regression test file at `compiler/tests/unit/error-handler-arm-body-emission.test.js` (NEW). Required test sites:

1. Multi-line arm body (R25 dev-1-react minimal repro)
2. Single-line collapsed arm body (R25 dev-2-elixir minimal repro)
3. `const r = ...` value-binding form
4. Multi-line arm body with TERMINATOR at end — verify R24-BUG-2 case (`{ return }`) STILL passes (regression-guard the prior fix)
5. Multi-arm mixed (one terminator, one value-producing, one side-effect-only)
6. Nested handler (`a() !{ | .X -> b() !{ | .Y -> @z = 1 } }`)
7. Empty arm body `{ }` — should emit (no-op)
8. Arm body with `if`/branch — should emit the if (regression-guard for Bug 31 / R24-BUG-5 separation; that bug is OUT OF SCOPE — do NOT chase the `let _result = if(...){...}` shape)

Aim for 10-15 tests. **Compose with the R24-BUG-2 regression file** (`compiler/tests/unit/error-handler-terminator-arms.test.js`) — your tests are the BROADER case; check the existing file passes unchanged after your fix.

## Phase 3 — verify

1. `node --check` on emitted JS for each reproducer: must parse clean (no `SyntaxError`).
2. `statement boundary not detected` warnings: confirm Bug 38 residuals on the R25 dev fixtures (dev-1, dev-2) drop. If R25 dev .scrml files are not in your worktree (they live in `gauntlet-r25/` artifacts), you can construct minimal fixtures via the reproducer shapes above.
3. Full suite: `bun run test` must pass with NO regressions on existing tests + your new tests passing. Baseline: 21,834 / 0 fail / 170 skip / 1 todo / 804 files at PA HEAD `050e20e8`.

# COMMIT DISCIPLINE (S83 two-sided rule)

**Coupled code + test = one commit.** Per `feedback_coupled_code_test_commit.md` (S113 precedent), splitting the code change from its test creates a transiently-red window. The code-change commit AND the new regression-test file MUST land in ONE commit. WIP commits before then are fine for crash-recovery.

After every edit: `git diff <file>` to verify; `git add <file>`; commit IMMEDIATELY. Don't batch — commit per sub-bucket / per fix.

Before reporting "DONE": `git status` MUST be clean (no uncommitted changes). `git log --oneline | head -5` should show your commits. "HEAD unchanged — work in worktree, no commits" is NOT acceptable.

# `--no-verify` PROHIBITION (S136 — R24-BUG-2 process violation precedent; banked durable)

**ABSOLUTE: you SHALL NOT use `--no-verify` on any commit.** The pre-commit hook is the load-bearing safety net. If the pre-commit gate fails:

- If failure is pretest-race (dist artifacts being rebuilt by parallel pretest run, etc.): **STOP. Wait 30s. Re-run.** If it STILL fails on the same race, **STOP-and-report to PA** with the exact failure output. DO NOT bypass.
- If failure is a substantive test regression: STOP, investigate, do NOT bypass.
- If failure is environmental (missing node_modules, missing dist): re-run startup verification step 4 (`bun install`) and step 5 (`bun run pretest`) and try again.

R24-BUG-2 agent (`af607ec9bff44bd1b`) used `--no-verify` ×2 without authorization — that was banked as a process violation. R25-Bug-36 agent honored the prohibition cleanly; all 3 commits passed gate. You follow R25-Bug-36's example.

# REPORTING

In your final report, include:

1. **WORKTREE_PATH** (literal output of `pwd` from startup)
2. **BRANCH** (`git rev-parse --abbrev-ref HEAD`)
3. **FINAL_SHA** (`git rev-parse HEAD`)
4. **FILES_TOUCHED** (list of every file you modified, worktree-relative)
5. **TEST_DELTA** (baseline vs final pass / fail / skip / todo counts)
6. **ROOT-CAUSE FINDING** (1-2 paragraphs: what was actually broken + how your fix addresses it; if the brief's hypothesis was wrong, name the actual locus)
7. **REPRODUCER VERIFICATION** (for each of the 3 reproducer shapes: BEFORE shape of compiled output / AFTER shape; node --check exit code; statement-boundary warning count)
8. **MAPS CONSULTED + load-bearing finding** (per maps block above)
9. **DEFERRED ITEMS** (anything you saw but didn't fix; especially the `let _result = if(...){...}` Bug 31 / R24-BUG-5 territory — DO NOT chase it; just file it as deferred if you observed it)
10. **PROCESS VIOLATIONS** (if any — declare them honestly; the R24-BUG-2 precedent showed honest declaration is preferred over silent bypass)

# OUT OF SCOPE

- Bug 31 / R24-BUG-5 `let _result = if(cond){...}` codegen (separate bug; deferred per known-gaps)
- Bug 37 `<each in=...>` arrow truncation (next dispatch)
- Bug 40 `:`-shorthand inside `<each>` (next dispatch)
- Bug 41 `<schema>` HTML leak (next dispatch)
- Any spec changes (this is a codegen-only fix; SPEC §19.5 + PRIMER §6 are authoritative for what arm bodies SHOULD emit)
- Any refactor beyond what the fix requires (Rule 1 of pa.md — bug fix doesn't need surrounding cleanup)

# IF YOU GET STUCK

If after 60-90 minutes of investigation you can't pin the root cause, STOP and produce a partial report. Don't keep grinding — surface the trace to PA. The R25-Bug-36 precedent showed that PA briefs HYPOTHESIZE; your grep + reproducer + trace is the load-bearing tool. If hypothesis is wrong, name the actual structure.

Per the global crash-recovery rule: WIP commit each meaningful step (each grep finding, each trace step, each test added). Append to `progress.md` after each. If you crash, your commits + progress.md are how the next agent picks up.

GO.
