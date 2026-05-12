# DISPATCH — Bug 1 — 14-mario bare-`n` enum-payload destructuring

**Status:** READY-TO-FIRE. Paste this entire prompt into Agent tool when dispatching.
**Subagent:** general-purpose
**Model:** opus
**Isolation:** worktree
**Background:** yes
**Walltime band:** 3-6h
**Dependencies:** none (file-disjoint with Bug 4 + Bug 6 + active SPEC §38.1 dispatch)

---

# Bug 1 — 14-mario bare-`n` enum-payload destructuring fix

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
- Translate intake-doc paths to `$WORKTREE_ROOT/...` before writing.

# MAPS — REQUIRED FIRST READ

Read `$WORKTREE_ROOT/.claude/maps/primary.map.md` in full. Task shape: **compiler-source bug fix (codegen — engine codegen + match-arm payload binding).** Consult `structure.map.md` + `error.map.md`.

Map currency: maps reflect HEAD `28cd2ac` (S84, 2026-05-11). Current HEAD post-S87. Treat as starting hypothesis; verify via grep/Read.

In final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# REQUIRED FIRST READS — scrml authoring context

You may author test fixtures during this dispatch. **Read these in full BEFORE generating any scrml code:**

1. `$WORKTREE_ROOT/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — Ghost-Pattern mitigation.
2. `$WORKTREE_ROOT/docs/articles/llm-kickstarter-v1-2026-04-25.md` — canonical scrml shape.
3. `$WORKTREE_ROOT/docs/PA-SCRML-PRIMER.md` §7 (engines), §13.7 B20 specifics (match-arm payload binding).

**S87 ratifications (load-bearing):**
- **Idiomatic-examples styling rule:** any test fixture you author uses inline `class=` Tailwind-style. NO file-top `#{}` for ordinary element styling.
- **Corpus-ouroboros warning:** corpus state is ARTIFACT not EVIDENCE. SPEC + user-voice + pa.md are normative.

# COMMIT DISCIPLINE — two-sided rule (pa.md S83)

After EVERY edit: `git diff <file>` to verify; `git add <file>`; commit IMMEDIATELY. Don't batch. WIP commits fine. **DO NOT use `--no-verify`** unless explicit user authorization (Wave 3 agent violated this S87 — do not repeat).

Before reporting DONE: `git status` MUST be clean.

Update `$WORKTREE_ROOT/docs/changes/v0.3-batch-2-trio-a/progress-bug-1.md` (create if missing) after each step. Append-only timestamped.

# FILE-DELTA LANDING (pa.md S67)

PA lands via `git checkout <branch> -- <files>` from main. Keep your branch tip ahead-of-main with changes committed.

# TASK BRIEF

## Context — the bug

**Surfaced by:** Wave 3 D2 (S86 commit `f32bd00`) — Playwright e2e for 14-mario failed. Per S86 hand-off Phase 14:

> "14-mario: bare `n` reference from enum-payload variant destructuring; structural-eq compares to whole enum object (`MarioState`) instead of variant (`MarioState.Small`)."

## Reproduction context

Fixture: `$WORKTREE_ROOT/examples/14-mario-state-machine.scrml`

The `<engine for=MarioState>` declaration has state-children with payload-destructuring rule= shapes. Inside arm bodies, references like `n` should refer to the destructured payload binding (per B20 typer pass, primer §13.7).

Two distinct symptoms (verify both during your survey):
1. **Bare `n` reference inside `.Mushroom(n) => { @coins = @coins + n }` body** doesn't resolve correctly at codegen time — emits invalid JS OR uses wrong scope.
2. **Structural-eq comparison** compares whole enum object instead of variant when matching `MarioState.Small` vs `MarioState.Big` etc.

## Surface analysis (from S87 Task #5 survey)

Per primer §13.7 B20 specifics: B20 fixed PARSING + TYPER for match-arm payload bindings at S69. **B20 did NOT fix CODEGEN.** Codegen gaps:

- `$WORKTREE_ROOT/compiler/src/codegen/emit-engine.ts` — engine state-child body codegen
- `$WORKTREE_ROOT/compiler/src/codegen/emit-variant-guard.ts` (~830 LOC factored Phase A10) — per-arm body dispatch helper (variant-source-agnostic; reusable)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-control-flow.ts` — match-arm codegen (block-form `<match>` paths)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-expr.ts` — `_scrml_structural_eq` emission for variant comparison

**Survey-first approach (depth-of-survey-discount per S87 Task #5):** before architecting a fix, locate the actual emission site for `.Variant(payload) => body` in the dispatcher emit. Likely the codegen emits an arm-body wrapper that doesn't bind `payload` to a local variable.

## Required reads (verbatim)

- `compiler/SPEC.md` §14.10 (M9 bare-variant inference) + §18.0 (match-arm patterns) + §51.0.F (engine state-child rule= forms) — use SPEC-INDEX.md for line ranges.
- `docs/PA-SCRML-PRIMER.md` §13.7 B20 specifics (match-arm-block payload binding contract).
- `compiler/tests/browser/playwright/14-mario.spec.ts` (or wherever the e2e lives) — for canonical failing AC.

## Acceptance criteria

1. **Wave 3 D2 14-mario e2e test PASSES** under Chromium + Firefox + WebKit.
2. **Test suite delta:** 0 regressions; pass-count >= 11600 + N (N counts new unit tests added). Baseline post-S87 commits: 11593 / 114 skip / 1 todo / 0 fail / 563 files (or higher if SPEC §38.1 dispatch landed first).
3. **Add unit tests** covering both symptoms: payload binding in engine state-child body + structural-eq variant comparison. Place in `compiler/tests/unit/engine-arm-payload-binding-codegen.test.js` (new file) OR extend existing engine codegen tests.
4. **No SPEC text changes** unless spec is silent on payload-extraction semantics (surface to PA before encoding).
5. **Idiomatic-examples styling rule** applied to any fixture you author.

## Walltime band

3-6h. If you hit 5h without converging on the fix, STOP and surface to PA for re-scoping (depth-of-survey-discount mitigation).

## Files in scope

- `$WORKTREE_ROOT/compiler/src/codegen/emit-engine.ts` (primary candidate)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-variant-guard.ts` (likely)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-control-flow.ts` (if block-form match arms also affected)
- `$WORKTREE_ROOT/compiler/src/codegen/emit-expr.ts` (if structural-eq emission needs fix)
- `$WORKTREE_ROOT/compiler/tests/unit/` — new test file or extension
- `$WORKTREE_ROOT/docs/changes/v0.3-batch-2-trio-a/progress-bug-1.md` (create + maintain)

## Out of scope

- `examples/14-mario-state-machine.scrml` — DO NOT EDIT. Wave 3 sweep migrated it S87; if you find genuine fixture-shape bugs surface them but don't fix in this dispatch.
- Bug 2 (05-multi-step), Bug 3 (03-contact-book), Bug 4 (TodoMVC), Bug 5 (.filter(cb).<member>), Bug 6 (load-detail) — separate dispatches.

## Final report shape

```
DONE / PARTIAL / BLOCKED
WORKTREE_PATH: <pwd output>
FINAL_SHA: <git rev-parse HEAD on your branch>
FILES_TOUCHED: <list>
git status (must be clean): <output>
Maps consulted: [...]; load-bearing finding: <one sentence>
Test suite delta: <pass/skip/fail at start vs end>
Test additions: +N tests / +N expect calls
Verdict: <one line — fix landed cleanly OR friction surfaced>
Surfaced findings (out-of-scope follow-ups): <list>
Open questions for PA: <list>
```
