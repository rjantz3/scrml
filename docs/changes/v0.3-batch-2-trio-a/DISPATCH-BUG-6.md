# DISPATCH — Bug 6 — load-detail `<li>` text-template lift inline

**Status:** READY-TO-FIRE. Paste this entire prompt into Agent tool when dispatching.
**Subagent:** general-purpose
**Model:** opus
**Isolation:** worktree
**Background:** yes
**Walltime band:** 2-4h
**Dependencies:** none (file-disjoint with Bug 1 + Bug 4 + active SPEC §38.1 dispatch)

---

# Bug 6 — load-detail `<li>` text-template lift inline codegen

PA is the supervisor. Background dispatch. Worktree-isolated.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)

1. Run `pwd`. Save as WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel`. MUST equal WORKTREE_ROOT.
3. Run `git status --short`. Confirm tree clean.
4. Run `bun install`.
5. Run `bun run pretest`.

If ANY check fails: DO NOT proceed. Report and exit.

## Path discipline

- ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit.
- NEVER use absolute paths starting with `/home/bryan-maclee/scrmlMaster/scrmlTS/` directly.

# MAPS — REQUIRED FIRST READ

Read `$WORKTREE_ROOT/.claude/maps/primary.map.md` in full. Task shape: **compiler-source bug fix (codegen lift + text-template emission).** Consult `structure.map.md`.

Map currency: maps reflect HEAD `28cd2ac` (S84, 2026-05-11). Current HEAD post-S87.

In final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# REQUIRED FIRST READS — scrml authoring context

Read these before authoring any scrml fixture:

1. `$WORKTREE_ROOT/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
2. `$WORKTREE_ROOT/docs/articles/llm-kickstarter-v1-2026-04-25.md`
3. `$WORKTREE_ROOT/docs/PA-SCRML-PRIMER.md` §29 (text-template interpolation) + §32 (lift / for-lift semantics).

**S87 ratifications:** idiomatic-examples styling rule + corpus-ouroboros warning.

# COMMIT DISCIPLINE — two-sided rule (pa.md S83)

After EVERY edit: `git diff` to verify; `git add`; commit IMMEDIATELY. **DO NOT use `--no-verify`** unless explicit user authorization.

Before reporting DONE: `git status` MUST be clean.

Update `$WORKTREE_ROOT/docs/changes/v0.3-batch-2-trio-a/progress-bug-6.md` per step.

# FILE-DELTA LANDING (pa.md S67)

PA lands via `git checkout <branch> -- <files>` from main.

# TASK BRIEF

## Context — the bug

**Surfaced by:** S86 scrml-dev codegen fix dispatch (commit `41f7fe9`). Per S86 hand-off Phase 6:

> "load-detail.client.js:285 lift-`<li>` text-template inline bug → separate small fix."

The compiler-generated client JS at `$WORKTREE_ROOT/examples/23-trucking-dispatch/dist/load-detail.client.js` line ~285 has invalid output around a `<li>` inside a `for/lift` block carrying a text-template (`${@expr}` interpolation).

## Reproduction

```bash
cd $WORKTREE_ROOT
bun scrml compile examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml
# Inspect generated load-detail.client.js around line 285 (or wherever the <li> lift lands)
node --check examples/23-trucking-dispatch/dist/load-detail.client.js
# Should fail OR emit malformed output near the <li> + text-template site.
```

Find the SOURCE site in `$WORKTREE_ROOT/examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` that lowers to client.js:285. Typically a `${ lift <li>${@field}</li> }` shape or for/lift body containing inline text-template interpolation.

## Surface analysis (from S87 Task #5 survey)

Candidate territory:
- `$WORKTREE_ROOT/compiler/src/codegen/emit-lift.js` (lift codegen — likely primary)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-control-flow.ts` (lift-as-control-flow may share territory)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-html` or `emit-html.ts` (HTML element + text-template emission)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-reactive-wiring.ts` (text-template subscription wiring)

Per emit-lift.js doc: lift codegen routes lifted elements to DOM placeholder spans (per S30-era fix `75f37cb` "route lifted elements to DOM placeholder spans, fix state display"). The `<li>` text-template lift may have a corner case where the placeholder-span + text-template wiring collide.

## Required reads (verbatim)

- `compiler/SPEC.md` §29 (text-template interpolation `${...}`) + §32 (lift / for-lift semantics).
- `compiler/src/codegen/emit-lift.js` — current lift codegen.
- `compiler/src/codegen/emit-reactive-wiring.ts` — text-template reactive subscription emission.
- The actual generated `load-detail.client.js` line ~285 — diagnose the malformed output.

## Acceptance criteria

1. **`bun scrml compile examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` produces valid JS** (Node syntax-check passes via `node --check`).
2. **Add unit test** for the `<li>` + text-template lift shape. Place in `$WORKTREE_ROOT/compiler/tests/unit/lift-li-text-template.test.js` (new file).
3. **Regression guard:** 0 test failures; existing lift tests still pass.
4. **Run the load-detail page end-to-end via `bun scrml dev`** (or compile + Node serve) and confirm the page renders the lift contents.
5. **Idiomatic-examples styling rule** applied to any fixture you author.

## Walltime band

2-4h. Small targeted fix. If the bug is more architectural than a small lowering miss (e.g., for/lift body parser drops text-templates structurally — unlikely given S87 happy-dom benchmarks worked, but possible), surface to PA for re-scoping.

## Files in scope

- `$WORKTREE_ROOT/compiler/src/codegen/emit-lift.js` (primary candidate)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-reactive-wiring.ts` (secondary — text-template subscription)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-control-flow.ts` (if for-lift body lowering involved)
- `$WORKTREE_ROOT/compiler/tests/unit/lift-li-text-template.test.js` (new)
- `$WORKTREE_ROOT/docs/changes/v0.3-batch-2-trio-a/progress-bug-6.md` (create + maintain)

## Out of scope

- `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` — DO NOT EDIT (fixture). Per S87 Wave 3 sweep this file was migrated; further edits should not happen in this dispatch.
- Bug 1 (14-mario), Bug 2 (05-multi-step), Bug 3 (03-contact-book), Bug 4 (TodoMVC), Bug 5 (.filter(cb).<member>) — separate dispatches.
- Wider for-lift refactoring — focus on the specific `<li>` + text-template shape.

## Final report shape

```
DONE / PARTIAL / BLOCKED
WORKTREE_PATH
FINAL_SHA
FILES_TOUCHED
git status (must be clean)
Maps consulted: [...]; load-bearing finding: <one sentence>
Test suite delta: <pass/skip/fail at start vs end>
Test additions: +N tests
Generated JS before/after: <line-N text before vs after>
Verdict
Surfaced findings (out-of-scope follow-ups)
Open questions for PA
```
