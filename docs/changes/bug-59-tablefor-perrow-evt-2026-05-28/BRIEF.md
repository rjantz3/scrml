# DISPATCH BRIEF — Bug 59: tableFor per-row checkbox onchange references undefined `evt` (Bug-50-class residual)

**Change-id:** `bug-59-tablefor-perrow-evt-2026-05-28`
**Severity:** HIGH (silent-miscompile; every per-row checkbox toggle throws `ReferenceError: evt is not defined` at runtime)
**Dispatched:** S140 (2026-05-28). Baseline HEAD at dispatch: `c4d5ef96`.
**Agent:** scrml-js-codegen-engineer · isolation: worktree
**Authority:** `docs/known-gaps.md` Bug 59 · `docs/audits/bug-51-class-corpus-coverage-audit-2026-05-28.md` §3.3 (PA-verified) · Bug 50 (RESOLVED S138 `c89f1176`, partial)

---

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99 leak history: this project has had repeated path-discipline leaks (sub-agent Edit/Write or `cd` leaking into the MAIN checkout). Do not become the next incident.**

Your worktree path will be reported by `pwd`. Before ANY other tool call:

1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP and report (S90). Save as `WORKTREE_ROOT`.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git -C "$WORKTREE_ROOT" merge --no-edit main` — worktree may be branched from a stale session-start commit (S112). Merge `main` for current baseline (`c4d5ef96`). Confirm clean.
4. `git -C "$WORKTREE_ROOT" status --short` — confirm clean.
5. `cd "$WORKTREE_ROOT"` ONCE. **NEVER `cd` into the main repo** (path without `.claude/worktrees/agent-*`) for ANY command (S126 #14/#15). Use `--cwd "$WORKTREE_ROOT"` / `git -C "$WORKTREE_ROOT"` / worktree-absolute paths only.
6. `bun install`.
7. `bun run pretest`.

**Editing discipline (S126):** edits via Bash (`perl`/`python`/heredoc) on WORKTREE-ABSOLUTE paths including `.claude/worktrees/agent-<id>/` — NOT Edit/Write tools (leaked before). Echo target path before each write; re-verify via `git -C "$WORKTREE_ROOT" diff`/`grep`. If you must use Edit/Write, path MUST contain `.claude/worktrees/agent-`.

If ANY startup check fails: DO NOT proceed. Report and exit.

---

## MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` (worktree) first. §"Task-Shape Routing" → maps for a compiler-source codegen bug fix. Watermark `1fed5588` (only docs-only past it). Verify against source via grep. Report maps feedback.

---

## THE BUG (PA-verified)

With `<tableFor selectable=…>`, the emitted PER-ROW checkbox onchange handler is:
```js
_scrml_lift_el_9.addEventListener("change", function(event) { if (evt !== null && evt !== undefined) { ... } });
```
The parameter is `event` but the body references the free var `evt` → `ReferenceError: evt is not defined` on every row toggle. Compile exit 0; `node --check` pass. The MASTER (header) checkbox is CORRECT (`evt => {…}`, delegated path) — only the per-row inline path is broken.

**Root cause (verified):** RESIDUAL of Bug 50 (RESOLVED S138 `c89f1176`), which patched `compiler/src/codegen/emit-event-wiring.ts` ONLY (the delegated Case-B path; its Bug-50 reference is near line 402). The per-row inline path is `compiler/src/codegen/emit-lift.js:531`:
```js
lines.push(`${elVar}.addEventListener(${JSON.stringify(eventName)}, function(event) { ${handlerExpr}; });`);
```
`handlerExpr` already passed through `rewritePresenceGuard` (which emits the `evt`-referencing presence guard) but is NOT routed through `rewriteExprArrowBody`. The SIBLING paths at lines 713 / 731 / 760 rebind to `event` or call `(event)` — line 531 is the odd one out. Bug 50's regression test (`onchange-arrow-fallback-r24-bug-50.test.js`) exercises only the delegated map, never the per-row inline lift handler.

**Reproduce yourself first:** compile `examples/27-type-derived-table.scrml` (or a minimal `<tableFor for=T rows=@cell selectable=@sel/>`); grep emitted JS for `function(event) { if (evt !==` (expect PRESENT pre-fix); run the emitted handler in node to confirm the ReferenceError.

---

## THE FIX (surgical — mirror the Bug-50 fix at the uncovered site)

Mirror the Bug-50 fix at `emit-lift.js:531` (the per-row inline-handler path, ~lines 505-531): route synth-fallback-string arrow handlers through `rewriteExprArrowBody` (skipping `rewritePresenceGuard`), exactly as `emit-event-wiring.ts` Case-B does (read the Bug-50 fix in `emit-event-wiring.ts` near line 402 to mirror its shape). The emitted per-row handler should bind the event param consistently (`evt => {…}` or `function(event){…}` with the body referencing the SAME name). Confirm the OTHER `emit-lift.js` handler paths (713/731/760) are unaffected.

**Scope discipline:** surgical — one inline-handler path. Do NOT change the delegated path (already fixed). Do NOT change `rewritePresenceGuard`/`rewriteExprArrowBody` themselves (other call-sites depend on them). Match the existing Bug-50 fix shape precisely.

---

## ACCEPTANCE GATE (both required)

New test file (model happy-dom portion on an existing happy-dom/browser test; the existing `onchange-arrow-fallback-r24-bug-50.test.js` is the sibling — extend the pattern to the per-row path):
1. **Targeted emit-regression** (FAIL pre-fix, PASS post-fix): compile a `<tableFor selectable=…>` source; assert the emitted PER-ROW handler does NOT contain a free `evt` (i.e. no `function(event) { if (evt !==`); assert it binds the event param consistently. Prove it fails before your fix.
2. **happy-dom runtime drive:** mount the emitted table; dispatch a per-row checkbox `change` event; assert NO throw + the row's selection state (`selectedIds` or equivalent) mutated correctly.

---

## R26 EMPIRICAL VERIFICATION (Phase 3 — mandatory; pa.md S138 doctrine)

HIGH codegen fix relying on emit. Before DONE: re-compile `examples/27-type-derived-table.scrml` AND any other `<tableFor` adopter source in `samples/`/`examples/` (sweep — the bug fires on any `selectable=` table) on the post-fix baseline. For each: `node --check` the emitted JS; grep confirming `function(event) { if (evt !==` is GONE; run the per-row handler to confirm no ReferenceError. **DO NOT mark DONE without empirical R26 verification passing.**

---

## COMMIT DISCIPLINE (two-sided, S83)

- First commit message includes `pwd` verbatim: `WIP(bug-59): start at <pwd>`.
- Commit per edit; don't batch. `git -C "$WORKTREE_ROOT" status` clean before DONE.
- **NEVER `--no-verify`.** Env-race hook failure → STOP and report.
- Run the FULL pre-commit suite at each step (sibling event-wiring/lift tests catch regressions).
- Update `docs/changes/bug-59-tablefor-perrow-evt-2026-05-28/progress.md` after each step (append-only).

## FINAL REPORT SHAPE

`WORKTREE_PATH` · `BRANCH` · `FINAL_SHA` · `FILES_TOUCHED` (worktree-absolute) · pre-fix-repro-confirmed (`evt` free-var present + ReferenceError) · post-fix (gone + happy-dom passes) · sibling handler paths unaffected · targeted-regression fails-before/passes-after · R26 results · full-suite counts · maps feedback · deferred items.
