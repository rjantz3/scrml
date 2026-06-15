FIX FOUR ERROR-DISPLAY-SEAM BUGS (the prerequisites that gate the render-expression primitive build, S196). You are scrml-js-codegen-engineer working in an isolated worktree. change-id: `render-expr-prereq-bugs-2026-06-15`.

# MAPS — REQUIRED FIRST READ
Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its "Task-Shape Routing" section tells you which additional maps to consult for a compiler-source bug fix (error map + structure map at minimum). Map currency: maps reflect HEAD `4646ec13` as of 2026-06-15. HEAD is `8e5cab33` which is +1 commit = the S195 maps-refresh commit ONLY (no source change) — so the maps are current. If your work touches files modified after `4646ec13`, treat map content as a starting hypothesis to verify via grep/Read against current source.
Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing — [which map you expected to help]".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had repeated path-discipline leaks; do not be the next one)
## Startup verification (BEFORE any other tool call)
1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `bun install` — worktrees do NOT inherit node_modules; the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise.
5. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; empty in fresh worktrees → ~130 browser-test failures without it). Use `bun run test` (chains pretest) for baseline, NOT bare `bun test`.
If ANY check fails: STOP, report, exit.
## Path discipline (EVERY edit)
- Apply ALL file edits via Bash (`perl -0pi`/`python3`/heredoc/`cp`) on WORKTREE_ROOT-absolute paths that INCLUDE the `.claude/worktrees/agent-<id>/` segment. Do NOT use the Edit/Write tools (S126 — Edit/Write have leaked to MAIN). Echo the target path before each write; re-verify via `git diff`/`grep` after.
- NEVER `cd` into the main repo or anywhere else. Use `git -C "$WORKTREE_ROOT"`, `--cwd "$WORKTREE_ROOT"` (bun), and worktree-absolute paths exclusively. A `cd` leaks ALL subsequent relative ops + tool installs into MAIN (S126 #14/#15).
- If an intake path looks like `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/...` (no worktrees segment), translate to `$WORKTREE_ROOT/compiler/...` before writing.

# COMMIT DISCIPLINE (two-sided rule, S83)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY. Don't batch — commit per sub-bucket. WIP commits expected. First commit message must include your verbatim startup `pwd`: `WIP(prereq): start at <pwd>`.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
- Final report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED list, per-bucket pass/fail, deferred items.

# CONTEXT — what this is
The render-expression primitive (RATIFIED S195, build queued) closes the held-error-display gap. Before that build, four bugs/seams on the error-display path must be fixed. Authority: `scrml-support/docs/deep-dives/error-handling-holistic-2026-06-15.md` §1.4 + §6 "Prerequisite bugs" + `scrml-support/docs/debates/error-handling-display-gap-2026-06-15.md` §6. These are independent correctness/diagnostic fixes — you are NOT building the primitive in this dispatch.

Per pa.md Rule 4 (SPEC is normative): Read the relevant SPEC sections IN FULL before each fix — §19 (12510-13813), §4.18.4 (display-text-literal interpolation, in §4 308-1329), §18.0.1 (match block-form arm bodies). Do not rely on this brief's paraphrase where the SPEC text is authoritative.

# THE FOUR BUCKETS (commit each separately)

## Bucket 1 — Bug 1 `g-failable-arm-nested-constructor-crash` (HIGH — the gate). known-gaps.md §G-FAILABLE-ARM-NESTED-CONSTRUCTOR-CRASH.
A payload-bearing variant constructor NESTED as an arg inside an `!{}` (or held-error-routing) arm crashes at runtime.
- **Repro:** `@phase = .Failed(LoadError::NotFound(id))` inside an `!{}` arm lowers to `data: { err: "NotFound" ( id ) }` — a string invoked as a function → runtime crash `"NotFound" is not a function`.
- **Control:** the SAME nested constructor `LoadError::NotFound(id)` in a plain `function` body lowers CORRECTLY (to `Inner.A("hi")`-shape). So the bug is specific to the `!{}` arm-body rewriter.
- **Site:** `compiler/src/codegen/emit-logic.ts` ~515-570 — the `!{}` arm-body emit path (`_emitNestedGuardedArmBody` / `rewriteBlockBody` / `emitGuardedArmBinding`). The arm-body rewriter mangles a qualified `EnumType::Variant(args)` constructor into a bare-string-call. Compare against how a plain `function` body lowers the same construct and make the arm path consume the same correct lowering.
- **A/B verify:** build a reproducer with the nested constructor in an `!{}` arm; confirm pre-fix it emits `"NotFound" ( id )` (or crashes at runtime), post-fix it emits the correct constructor call (e.g. `LoadError.NotFound(id)` / `{ variant: "NotFound", data: { id } }` per the established enum-constructor lowering). Confirm the plain-`function`-body control is unchanged.
- **HIGH-CODEGEN R26 MANDATE (S138):** this fix touches codegen + relies on AST construction → regression tests alone do NOT close it. Phase-3 empirical verification REQUIRED: compile a real `.scrml` source exercising the errors-as-states `.Failed(EnumType::Variant(args))` form via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <repro> --output-dir /tmp/r26-bug1/`, grep the emitted JS for the `"Variant" (` string-call mangle (must be ABSENT), and `node --check` the emitted JS (exit 0). DO NOT mark Bucket 1 DONE without empirical R26 passing.

## Bucket 2 — Bug 2 `g-match-arm-apostrophe-bs` (MED, block-splitter). known-gaps.md §G-MATCH-ARM-APOSTROPHE-BS.
An apostrophe in `<match>`-arm FREE-TEXT prose breaks the block-splitter.
- **Repro:** `<Failed> <p>We'll try again later.</p> </>` inside a `<match>` → `E-CTX-001` "Unclosed `<match>`". Control `We will` compiles clean.
- **Root:** the block-splitter scanner reads the apostrophe as a string delimiter. Site: `compiler/src/block-splitter.js` (string-delimiter scan). Same family as the S144 `//`-in-string disambiguation cluster + S195 `g-blocksplitter-comment-span-not-opaque`. The BS must NOT treat a lone `'` in markup-ish free-text as opening a string span. Be surgical — verify you do not regress legitimate string handling (check the existing BS string-scan tests + add a regression test for the apostrophe-in-arm-prose case).

## Bucket 3 — H1 steer-to-block-form diagnostic (Seams 1+2 → ONE clear lint).
Today the natural reflex `${match err { .V(p) :> <markup with ${p}> }}` (a JS-style value-match arm RETURNING MARKUP) hits one of three wrong-altitude failures: Seam 1 → `E-CODEGEN-INVALID-JS` / `E-CG-003` (CG-stage "compiler defect, please report it" — WRONG altitude for a user error), Seam 2 → `E-SCOPE-001` "Undeclared identifier" (payload not in scope for `${...}` inside a markup arm body). Replace these with ONE early TYPER-stage steer: *"a JS-style match arm returns a value, not markup — use a `<match for=>` block (structural), or fire a variant's display via the render-expression."* Pure docs/diagnostics — no new primitive, no codegen change to value-match (do NOT widen value-match to emit markup). The diagnostic floor for the whole error-display surface. Verify it fires at the right stage (typer, not codegen) with the steer message; confirm legitimate string-returning value-match arms (`:> "Failed: "+reason`) still compile clean (no false fire).

## Bucket 4 — H2 `g-shorthand-interp-match-arm-codegen` (MED, silent wrong output). known-gaps.md §G-SHORTHAND-INTERP-MATCH-ARM-CODEGEN.
`${...}` interpolation inside a `<match>`-arm `:`-shorthand display-text literal (§4.18.4) emits LITERALLY.
- **Repro:** `<Failed reason : "Failed: ${reason}">` COMPILES CLEAN but emits `return "Failed: ${reason}"` literally (no `data-scrml-logic` span). The bare-body form `<Failed reason><p>${reason}</p></>` lowers correctly.
- **SPEC:** §4.18.4 normatively specifies `${...}` interpolation inside a `"..."` display-text literal. It is NOT lowered for the match-arm `:`-shorthand locus. Read §4.18.3/§4.18.4/§4.18.6 in full and wire the interpolation lowering at the `:`-shorthand codegen path so the `${reason}` substitution + HTML-escape happens (matching the bare-body behavior, byte-equivalent display).
- **INVESTIGATE (report, do not necessarily fix this dispatch):** is the same literal-emission gap present in the OTHER code-default-body `:`-shorthand loci — engine state-child bodies (§51.0) and §4.14 element `:`-shorthand? If yes, note whether the fix you land for the match-arm locus generalizes to a shared shorthand-interpolation-lowering helper, or whether each locus needs separate wiring. This determines whether a follow-on gap is needed.

# REGRESSION + LANDING
- After all four buckets, run `bun --cwd "$WORKTREE_ROOT" run test` (full suite, chains pretest). Zero new failures. The within-node parity test may need NO rebump here (these are codegen/BS/typer fixes, not new-idiom parser-shape changes) — but if a parser-shape canary moves, report it; do NOT rebump the allowlist yourself without flagging.
- PA lands via S67 file-delta + S147 coherence. Leave the worktree intact for PA review.
