# DISPATCH BRIEF — Bug 57: `<each>` reconcile_list tree-shaken out of runtime bundle

**Change-id:** `bug-57-each-reconcile-chunk-2026-05-28`
**Severity:** HIGH (silent-miscompile; broadest blast radius — every `<each>`-only adopter file ships a runtime-dead list)
**Dispatched:** S140 (2026-05-28). Baseline HEAD at dispatch: `c4d5ef96`.
**Agent:** scrml-js-codegen-engineer · isolation: worktree
**Authority:** `docs/known-gaps.md` Bug 57 · `docs/audits/bug-51-class-corpus-coverage-audit-2026-05-28.md` §3.1 (PA-verified)

---

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99 leak history: this project has had repeated path-discipline leaks (sub-agent Edit/Write or `cd` leaking into the MAIN checkout). Do not become the next incident.**

Your worktree path will be reported by `pwd`. Before ANY other tool call:

1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing failure). Save it as `WORKTREE_ROOT`.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git -C "$WORKTREE_ROOT" merge --no-edit main` — the worktree may be branched from a stale session-start commit (S112). Merge `main` to pick up the current baseline (`c4d5ef96`, includes the maps commit + the dispatch artifacts). Confirm clean.
4. `git -C "$WORKTREE_ROOT" status --short` — confirm clean after merge.
5. `cd "$WORKTREE_ROOT"` ONCE at startup so all relative ops resolve in the worktree. **NEVER `cd` into the main repo** (`/home/bryan-maclee/scrmlMaster/scrmlTS` without the `.claude/worktrees/agent-*` segment) for ANY command — edits, compiles, `bun add`, anything (S126 incidents #14/#15). Use `--cwd "$WORKTREE_ROOT"` / `git -C "$WORKTREE_ROOT"` / worktree-absolute paths exclusively.
6. `bun install` (worktrees don't inherit node_modules; pre-commit `bun test` fails without it).
7. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests; gitignored, empty in fresh worktrees).

**Editing discipline (S126):** apply file edits via Bash (`perl`/`python`/heredoc/`cp`) on WORKTREE-ABSOLUTE paths that include the `.claude/worktrees/agent-<id>/` segment — NOT via the Edit/Write tools (which have leaked to MAIN in prior sessions). Echo the target path before each write; re-verify with `git -C "$WORKTREE_ROOT" diff` / `grep` after. If you must use Edit/Write, the absolute path MUST contain `.claude/worktrees/agent-`.

If ANY startup check fails: DO NOT proceed. Report and exit.

---

## MAPS — REQUIRED FIRST READ

Before consuming other context, read `.claude/maps/primary.map.md` (in your worktree) in full (~100 lines). Its §"Task-Shape Routing" tells you which maps to consult for a compiler-source codegen bug fix. Map currency: maps reflect HEAD `1fed5588` as of 2026-05-28 (watermark; the only commits past it are docs-only — `e1630e93` + `c4d5ef96`). Treat map content as a starting hypothesis to verify via grep/Read against current source.

In your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing."

---

## THE BUG (PA-verified)

A Tier-1 `<each>` list compiles to client JS that **calls** `_scrml_reconcile_list(...)` but the runtime bundle **never defines** it → `ReferenceError: _scrml_reconcile_list is not defined` at runtime on the first `_scrml_each_render_N()`. Compile exits 0; `node --check` passes. Every adopter file whose ONLY iteration is `<each>` (no Tier-0 `${for…lift}`) ships a runtime-dead list.

**Root cause (verified):** `compiler/src/codegen/emit-client.ts` chunk-selection walk has NO `case "each-block"`. The only `chunks.add("reconciliation")` is at **line 684**, gated inside `case "for-stmt"` (line ~663). So a Tier-1-`<each>`-only file never pulls the `reconciliation` chunk → `_scrml_reconcile_list` (+ helpers) are tree-shaken out.

**Control proof (run it yourself to confirm before fixing):** compile a Tier-0 `${for…lift}` file → emitted runtime DOES define `function _scrml_reconcile_list`. Compile a Tier-1 `<each>`-only file → it does NOT. Minimal `<each>`-only repro:
```scrml
<program>
type Contact:struct = { id: string, name: string }
<contacts>: Contact[] = []
<ul>
    <each in=@contacts key=@.id>
        <li : @.name>
        <empty>none</>
    </each>
</ul>
</program>
```
Compile with `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <src> --output-dir /tmp/bug57/out`; grep the emitted `scrml-runtime.*.js` for `function _scrml_reconcile_list` (expect MISSING pre-fix).

---

## THE FIX (bounded)

Add a `case "each-block"` to the `emit-client.ts` chunk-selection walk that does `chunks.add("reconciliation")` AND `chunks.add("deep_reactive")` (the latter for `_scrml_effect_static` — a `<each of=N>` with no `@`-state decl could otherwise also lose it). Alternatively/additionally have `emitEachBodyRenderForFile` (in `emit-each.ts`) signal its required chunks if that is the cleaner factoring — but the minimal correct fix is the chunk-walk case. Read the surrounding `for-stmt` case (lines ~663-700) to match the exact node-kind discriminator + chunk-add idiom the walk uses. Confirm the `<each>` AST node kind name by grepping (`each-block` is the expected kind, but verify against `emit-each.ts` + the AST types).

**Scope discipline:** this is a surgical chunk-gating fix. Do NOT refactor the chunk walk. Do NOT touch `emit-each.ts` render logic (it already emits correct call-sites). Verify the fix does not over-pull chunks for non-`<each>` files (the `for-stmt` path must still work).

---

## ACCEPTANCE GATE (both required — this is the point of the fix)

The bug shipped because the test tier was emit-string-only and never checked the runtime bundle. Add BOTH, in a new test file (`compiler/tests/browser/each-runtime-bug-57.test.js` or the closest-matching existing convention — check where `<each>` tests + happy-dom tests live; model the happy-dom test on an existing browser/happy-dom test such as the engine-body-render suite):

1. **Targeted emit-regression** (must FAIL on the pre-fix baseline, PASS after): compile a Tier-1-`<each>`-only file via the real compile path; assert the emitted runtime bundle CONTAINS `function _scrml_reconcile_list` AND the client calls it. Confirm it fails before your fix (run it against the pre-fix state to prove it catches the bug).
2. **happy-dom runtime drive:** mount the emitted module in happy-dom, populate `@contacts`, assert the `<li>` rows render + reconcile on data change, and `<empty>` renders when the list is empty — asserting NO `ReferenceError`.

---

## R26 EMPIRICAL VERIFICATION (Phase 3 — mandatory; pa.md S138 doctrine)

This is a HIGH codegen fix relying on emit. Before reporting DONE, re-compile real `<each>`-bearing adopter source on your post-fix baseline and confirm the symptom is gone:
- Compile the minimal repro above AND grep `samples/`/`examples/` for any `<each` adopter source; compile those too. For each: `node --check` the emitted JS AND grep the runtime bundle for `function _scrml_reconcile_list` (expect PRESENT post-fix).
- **DO NOT mark DONE without empirical R26 verification passing.**

---

## COMMIT DISCIPLINE (two-sided, S83)

- First commit message MUST include your `pwd` output verbatim: `WIP(bug-57): start at <pwd>` (S99 echo-pwd discipline). PA verifies the path on landing.
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit immediately. Don't batch.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "HEAD unchanged — work in worktree, no commits" is NOT acceptable.
- **NEVER use `--no-verify`.** If the pre-commit hook fails on an env race (pretest dist mid-rebuild), STOP and report — do not bypass.
- Run the FULL pre-commit suite at each iteration step (S139 multi-iteration-scanner lesson: adjacent shapes catch over-broad chunk-gating). The chunk-walk touches all files' chunk selection — verify zero regressions across the suite.
- Update `docs/changes/bug-57-each-reconcile-chunk-2026-05-28/progress.md` (worktree-absolute) after each step — append-only, timestamped.

## FINAL REPORT SHAPE

`WORKTREE_PATH` · `BRANCH` · `FINAL_SHA` · `FILES_TOUCHED` (worktree-absolute) · pre-fix-repro-confirmed (reconcile_list MISSING) · post-fix (reconcile_list PRESENT + happy-dom passes) · targeted-regression-fails-before/passes-after confirmed · R26 results · full-suite pass/fail/skip counts · maps feedback · any deferred items.
