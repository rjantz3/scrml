# BRIEF (re-dispatch) — g-markup-value-ternary-fnreturn-codegen forms (a)/(b)

**Dispatched:** 2026-06-17 (S201). **Agent:** `scrml-js-codegen-engineer` (isolation:worktree, background, opus). **agentId:** a3e376f63a0f86f1c. **Worktree base:** `268a27c5` (main — has form (c) landed + the salvage artifacts). **change-id:** `markup-value-in-expression-2026-06-17`.

Re-dispatch after the first agent (aa40bcaad11122537) blocked on a mid-dispatch write-permission revocation with form (c) committed (`47d75516`) and forms (a)/(b) parse-layers salvaged-but-unfinished. Archived verbatim per pa.md S136.

---

RESUME + FINISH forms (a)/(b) of `g-markup-value-ternary-fnreturn-codegen` (HIGH). change-id: `markup-value-in-expression-2026-06-17`. This is a RE-DISPATCH: a prior agent did this arc but its write-access was revoked mid-run; **form (c) is ALREADY LANDED on main; forms (a) inline-ternary + (b) derived-ternary remain.**

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If under any OTHER repo, STOP + report (S90 wrong-repo routing). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean. Your base is main `268a27c5` (it HAS form (c) + the salvage artifacts).
3. `bun install`; `bun run pretest` (worktrees don't inherit node_modules / dist).
4. FIRST commit message includes verbatim `pwd` (`WIP(markup-value-ab): start at <pwd>`).
5. **Path discipline (S99/S126):** apply edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths containing the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (they have leaked to MAIN). Never `cd` into the main repo; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only. Echo each path before writing; `git diff` after.

# WHAT'S ALREADY DONE (on main / your base — do NOT redo)
- **Form (c) fn-return markup: LANDED.** `compiler/src/codegen/emit-lift.js` has the **`emitMarkupValueExpr`** IIFE primitive (markup→DOM-node value); `ast-builder.js` has the return-stmt markup hook; `emit-logic.ts` has the return-stmt lowering. `fn f() -> markup { return <m/> }` compiles to a real `createElement` factory. **`emitMarkupValueExpr` is THE lowering target for (a)/(b) too** — reuse it.
- Regression test `compiler/tests/unit/g-markup-value-in-expression.test.js` exists with form-(c) + (d)-control PASSING and **forms (a)/(b) `.skip`** — UN-SKIP them when they pass.

# YOUR TASK — finish forms (a) + (b)
- (a) inline ternary: `<div>${ @n > 0 ? <span>pos</span> : <span>neg</span> }</div>` (PRIMER §6.4(2))
- (b) derived-cell ternary: `const <badge> = @n > 0 ? <span>pos</span> : <span>neg</span>` (PRIMER §6.6.17)
Both currently → `E-CODEGEN-INVALID-JS` (markup arms dropped at parse). They converge on a shared `markup-value` ExprNode emit path.

## The salvaged parse-layer work (apply it first)
The prior agent BUILT + verified the parse layers for (a)/(b) but couldn't commit them. They are saved as a diff in the repo (relative to the form-(c) commit, which == your base's relevant files):
1. **Read `docs/changes/markup-value-in-expression-2026-06-17/progress.md`** — the prior agent's Phase-0 layer diagnosis + exact resume steps.
2. **Apply the salvage:** `git -C "$WORKTREE_ROOT" apply docs/changes/markup-value-in-expression-2026-06-17/SALVAGE-form-ab-uncommitted.diff` (try `--3way` if context drifts; if it still won't apply, hand-re-apply from the diff content + progress.md — the changes are to `block-splitter.js` `scanShape12DeclEnd` [markup-in-expr-RHS scan] + `ast-builder.js` `sawTernaryAtRoot`/`markupRootClosed` guards + `parseExprWithMarkupValues`/`safeParseExprToNode` dispatch). Verify with `git diff --stat`.

## The two remaining fixes (the prior agent's resume steps — the part that was unwritten when write-access was revoked)
1. **The salvaged `ast-builder.js` references an UNDECLARED `_inMarkupValueParse`** (~line 2887) → ReferenceError at parse time (the tree is non-compiling until fixed). Either add `let _inMarkupValueParse = false;` (near the other parse-state flags, ~`let _tildeActive = false;`), OR strip the 3 refs if `parseExprWithMarkupValues` can call `parseExprToNode` directly without re-entry. Pick the correct one by reading the code.
2. **Add `case "markup-value":` to the `emit-expr.ts` `emitExpr` dispatch** → return `emitMarkupValueExpr(node.node, …)` (import from `./emit-lift.js`). This is the EMIT integration that was never written — the parse layers produce a `markup-value` ExprNode leaf; this lowers it via the (already-landed) form-(c) primitive.

**Verify the parse layers + the emit integration END-TO-END** — the prior agent only confirmed "arms reach AST," never got (a)/(b) compiling. Expect to debug the integration; do not assume it's only the 2 fixes above.

# Phase 3 — MANDATORY R26 (S138)
Compile all four forms + assert per-form (exit 0, `node --check` on emitted `*.client.js`, real `createElement` shape NOT raw `< span >` / dropped ternary arm):
- (a) `<div>${ @n > 0 ? <span>pos</span> : <span>neg</span> }</div>`
- (b) `const <badge> = @n > 0 ? <span>pos</span> : <span>neg</span>` + `<div>${@badge}</div>`
- (c) `fn label(n: int) -> markup { return <span>${n}</span> }` + `${label(@n)}` (must STILL pass — regression)
- (d) control `const <x> = <span>${@n}</span>` (must STILL pass)
Then **un-skip the (a)/(b) `.skip` tests** in `compiler/tests/unit/g-markup-value-in-expression.test.js` and make them assert real lowering (no E-CODEGEN-INVALID-JS + a `createElement` shape).

# S198 — within-node + full suite
Run the FULL `bun run test` before DONE. If `[within-node] OVER-BUDGET <relpath>: {CLASS:{raw,allow,residual}}` prints, re-baseline that fixture's `M6.5.b.0` allowlist entry in-place (set per-class values to the printed `raw`, preserve key order — NOT a whole-file re-dump).

# Commit discipline
Commit per layer (salvage-apply / declaration fix / emit-expr case / tests); WIP commits expected; code + coupled test in one commit. `git status` clean before reporting DONE. Update `docs/changes/markup-value-in-expression-2026-06-17/progress.md` append-only after each step.

# OUT OF SCOPE
The free-standing-snippet bug (separate). The board `<each>` blocker (`g-each-inline-component-prop-member-unsubstituted`) — separate gap, do not touch.

# Final report: WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · per-form R26 (exit + node --check + emitted shape) · full-suite pass/fail + within-node re-baseline · whether the salvage applied cleanly or needed hand-reapply · maps feedback. The PA lands via S67 file-delta — keep branch tip = FINAL_SHA.
