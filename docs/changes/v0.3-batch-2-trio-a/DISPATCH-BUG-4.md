# DISPATCH — Bug 4 — TodoMVC form-submit + edit-mode + W-DEAD-FUNCTION + E-DG-002

**Status:** READY-TO-FIRE. Paste this entire prompt into Agent tool when dispatching.
**Subagent:** general-purpose
**Model:** opus
**Isolation:** worktree
**Background:** yes
**Walltime band:** 4-8h
**Dependencies:** none (file-disjoint with Bug 1 + Bug 6 + active SPEC §38.1 dispatch)

---

# Bug 4 — TodoMVC form-submit + edit-mode + W-DEAD-FUNCTION + E-DG-002 false-fire

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

Read `$WORKTREE_ROOT/.claude/maps/primary.map.md` in full. Task shape: **compiler-source bug fix (codegen event-wiring + dependency-graph "has-readers" accounting).** Consult `structure.map.md` + `error.map.md`.

Map currency: maps reflect HEAD `28cd2ac` (S84, 2026-05-11). Current HEAD post-S87. Treat as starting hypothesis.

In final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# REQUIRED FIRST READS — scrml authoring context

Read these in full before authoring any scrml fixture:

1. `$WORKTREE_ROOT/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
2. `$WORKTREE_ROOT/docs/articles/llm-kickstarter-v1-2026-04-25.md`
3. `$WORKTREE_ROOT/docs/PA-SCRML-PRIMER.md` §5.2 (event handlers), §31 (dep-graph).

**S87 ratifications (load-bearing):**
- Idiomatic-examples styling rule (no file-top `#{}`).
- Corpus-ouroboros warning.

# COMMIT DISCIPLINE — two-sided rule (pa.md S83)

After EVERY edit: `git diff` to verify; `git add`; commit IMMEDIATELY. WIP commits fine. **DO NOT use `--no-verify`** unless explicit user authorization.

Before reporting DONE: `git status` MUST be clean.

Update `$WORKTREE_ROOT/docs/changes/v0.3-batch-2-trio-a/progress-bug-4.md` (create) per step.

# FILE-DELTA LANDING (pa.md S67)

PA lands via `git checkout <branch> -- <files>` from main.

# TASK BRIEF

## Context — the bug (multi-symptom)

**Surfaced by:** Wave 3 D2 (S86 commit `f32bd00`) — Playwright e2e for TodoMVC failed. Per S86 hand-off Phase 14:

> "TodoMVC: form-submit handler not propagating; edit-mode UI never rendered; 4 W-DEAD-FUNCTION + E-DG-002 in source."

Four distinct symptoms (likely SINGLE root cause):

1. **Form-submit handler not propagating** — submitting new-todo form doesn't add an item. Either the handler isn't wired OR the `@todos = [...@todos, ...]` write doesn't trigger reactive update.
2. **Edit-mode UI never renders** — double-click on a todo should enter edit mode (set `@editingId = todo.id` + render edit input). Edit input never appears.
3. **4 W-DEAD-FUNCTION warnings** at compile time on functions that ARE called from event handlers. Indicates compiler's call-detection walker misses event-handler call references.
4. **E-DG-002 false-fire** — reactive variables with no readers detected on cells that ARE read from event handlers / for/lift blocks. Indicates dep-graph "has-readers" walker misses some read sites.

**Hypothesis (per S87 Task #5 survey):** the call-detection walker AND read-detection walker share a missing recognizer for event-handler call/read references. Single root-cause shape.

## Surface analysis (from S87 Task #5 survey)

Per dependency-graph.ts existing comments at lines 1719-1747 + 1857:
- Comment at 1719: "counts as a read of @order for the purposes of E-DG-002 ('has readers')"
- Comment at 1727: "the post-walk E-DG-002 sweep would false-fire on every projected var that..."
- Comment at 1857: "E-DG-002 — even though the cell IS consumed by the engine's own body..."

So there's existing precedent for adding read-recognizer hooks. Pattern: extend the same walker.

For W-DEAD-FUNCTION: locate the function-call-detection walker (likely in dependency-graph.ts or a separate dead-function pass).

For form-submit + edit-mode: locate the event-wiring codegen at `$WORKTREE_ROOT/compiler/src/codegen/emit-event-wiring.ts:354` ("Group event bindings by event type — onclick / onsubmit / onchange").

## Required reads (verbatim)

- `compiler/SPEC.md` §5.2 (event handlers — bare-call / bare-assignment / bare-single-expression forms) + §31 (dep-graph + E-DG-001/002) + §34 (E-DG-002 + W-DEAD-FUNCTION rows).
- `compiler/src/dependency-graph.ts` lines 1500-1960 (existing "has-readers" logic).
- `compiler/tests/browser/playwright/04-todomvc.spec.ts` (or wherever the TodoMVC e2e lives) — canonical failing AC.
- `compiler/src/codegen/emit-event-wiring.ts` lines 350-450 (event-binding group + dispatch).

## Acceptance criteria

1. **Wave 3 D2 TodoMVC e2e test PASSES** on all 3 browsers.
2. **W-DEAD-FUNCTION false-fires resolved:** TodoMVC compilation produces 0 W-DEAD-FUNCTION warnings on the fixture.
3. **E-DG-002 false-fires resolved:** TodoMVC compilation produces 0 E-DG-002 warnings on the fixture.
4. **Regression guard:** test suite has 0 fail; existing W-DEAD-FUNCTION + E-DG-002 fire-sites still work for genuine dead code / unread cells. Add specific regression-guard tests for the genuine fire-cases (e.g., a fixture with a truly-dead function should STILL fire W-DEAD-FUNCTION).
5. **Add unit tests** covering the call-detection + read-detection corner cases that landed (event-handler call refs / for-lift body reads / etc.). Test count target: +6 to +12.

## Walltime band

4-8h. Dual-issue (codegen + dep-graph). If you find a SINGLE root cause that explains all 4 symptoms, surface that as the WIN in progress.md. If you hit 6h without converging, STOP and surface to PA.

## Files in scope

- `$WORKTREE_ROOT/compiler/src/codegen/emit-event-wiring.ts` (event-binding codegen)
- `$WORKTREE_ROOT/compiler/src/dependency-graph.ts` (has-readers + dead-function walkers)
- `$WORKTREE_ROOT/compiler/tests/unit/` — new test file(s) or extensions
- `$WORKTREE_ROOT/docs/changes/v0.3-batch-2-trio-a/progress-bug-4.md` (create + maintain)

## Out of scope

- TodoMVC fixture source (`benchmarks/todomvc/app.scrml` was updated S87 for the unrelated `.filter(cb).length` bug — do NOT edit it).
- Bug 1 (14-mario), Bug 2 (05-multi-step), Bug 3 (03-contact-book), Bug 5 (.filter callback strip), Bug 6 (load-detail).
- The 5th latent compiler bug `.filter(cb).<member>` — separate dispatch (Bug 5 / Trio B).

## Final report shape

```
DONE / PARTIAL / BLOCKED
WORKTREE_PATH
FINAL_SHA
FILES_TOUCHED
git status (must be clean)
Maps consulted: [...]; load-bearing finding: <one sentence>
Test suite delta: <pass/skip/fail at start vs end>
Test additions: +N tests / +N expect calls
Root-cause discovery: <single root cause OR separate fixes>
Verdict
Surfaced findings (out-of-scope follow-ups)
Open questions for PA
```
