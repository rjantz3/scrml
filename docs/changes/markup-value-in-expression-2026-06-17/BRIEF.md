# BRIEF — g-markup-value-ternary-fnreturn-codegen (HIGH)

**Dispatched:** 2026-06-17 (S201). **Agent:** `scrml-js-codegen-engineer` (isolation:worktree, background, opus). **agentId:** aa40bcaad11122537. **Worktree base:** `7d3855a6`. **change-id:** `markup-value-in-expression-2026-06-17`.

Archived verbatim per pa.md S136 (BRIEF.md archival). Companion to the agent's `progress.md`.

---

Fix `g-markup-value-ternary-fnreturn-codegen` (HIGH) — markup-as-first-class-value (Pillar 1) fails to codegen in three documented forms. change-id: `markup-value-in-expression-2026-06-17`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (do this BEFORE any other tool call)

1. Run `pwd`. It MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it is under any OTHER repo (e.g. `scrml-native/`, `scrml-support/`), STOP and report — that is the S90 wrong-repo routing failure. Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT. `git status --short` clean.
3. `bun install` (worktrees do NOT inherit node_modules — the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
4. `bun run pretest` (populates `samples/compilation-tests/dist/` — gitignored; without it the full suite throws ~130 ECONNREFUSED).
5. Your FIRST commit message MUST include the verbatim `pwd` output (e.g. `WIP(markup-value): start at <pwd>`). PA verifies it starts with the worktree prefix.

## Path discipline (S99/S126 — there have been repeated leaks of this class):
- Apply ALL edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (they have leaked to MAIN). Echo the target path before each write; `git diff` after.
- NEVER `cd` into the main repo (or anywhere outside WORKTREE_ROOT). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd` into main leaks `bun add`/compile/edits into MAIN.
- If an intake path looks like `/home/bryan-maclee/scrmlMaster/scrml/compiler/...` (main), translate it to `$WORKTREE_ROOT/compiler/...` before touching it.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full (~100 lines), then follow its §"Task-Shape Routing" for a compiler-source codegen bug (likely structure + domain maps).
Map currency: maps reflect HEAD `b1f5f8bf` (2026-06-16). Live HEAD is `24cdc4dd` — the only post-watermark code change is the S200 member-arg fix to `component-expander.ts` (irrelevant here) + docs. The codegen-emit surface you'll touch is current as of the watermark; still grep/Read to confirm against current source.
In your final report include: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# THE BUG (3 forms, all → E-CODEGEN-INVALID-JS, exit 1, no output)

Markup-as-value (SPEC §1.4 / §7.4; PRIMER §2 Pillar 1, §6.4, §6.6.17) must work anywhere an expression goes. It does NOT in these three documented forms:

(a) **inline ternary in interpolation** — `<div>${ @n > 0 ? <span>pos</span> : <span>neg</span> }</div>` (PRIMER §6.4(2))
(b) **derived-cell ternary** — `const <badge> = @n > 0 ? <span>pos</span> : <span>neg</span>` (PRIMER §6.6.17)
(c) **fn-return markup** — `fn label(n: int) -> markup { return <span>${n}</span> }` then `${ label(@n) }` (kickstarter §6.4)

CONTROL that ALREADY WORKS: (d) plain markup-typed derived `const <x> = <span>${@n}</span>` — compiles + renders.

## PA root analysis (verify in Phase 0 — it is a hypothesis, not ground truth):
- The markup→DOM-builder primitive `emitCreateElementFromMarkup` (`compiler/src/codegen/emit-lift.js` ~line 479) EXISTS and is correct. The working (d) path is `compiler/src/codegen/emit-logic.ts` ~line 1983 (`_cellKind === "markup-typed" && isConst` → emits a `_scrml_markup_factory_*` via `emitCreateElementFromMarkup` + `_scrml_derived_declare` + `_scrml_derived_subscribe` per reactive dep).
- The lowering is **shape-specific**: the ast-builder routes a BARE markup RHS into `renderSpec.element`; a TERNARY RHS goes to `initExpr` and never hits the markup-factory path.
- The forms break in DIFFERENT layers (from the emitted broken JS):
  - **(b) ternary** emits `..._scrml_reactive_get("n") > 0 ?);` — the markup consequent/alternate are **dropped** (look like a PARSE-time loss — confirm whether `parseExprToNode`/`preprocessForAcorn` captures markup nodes in ternary arms at all).
  - **(c) fn-return** emits `function _scrml_label_3(n) { return < span >; }` — the markup is emitted **raw** (`< span >`), not lowered.
  - **(a) inline ternary** — same family as (b).

## The fix (general markup-in-expression lowering)
Markup nodes appearing in expression position — ternary consequent/alternate, `return` value, and (a)'s inline-interpolation ternary — must be lowered to a markup **value** (a DOM node the runtime can use), routed through `emitCreateElementFromMarkup` (or an inline equivalent producing a node expression), with reactive `${...}` deps inside that markup tracked the same way (d) tracks them. Determine in Phase 0 whether the gap is at the parse layer (markup dropped from the ExprNode), the emit layer (captured but emitted raw), or both — and fix at the right layer(s). Phase 0 may correct any touchpoint above; you are AUTHORIZED to follow the real surface (depth-of-survey discount — the real locus is often different from the named file).

# Phase 3 — MANDATORY R26 empirical verification (S138 doctrine; HIGH codegen fix)
Recreate the 3 forms + control in your worktree (or /tmp) and re-compile on your post-fix baseline. For EACH: assert exit 0, `node --check` passes on the emitted `*.client.js`, AND the emitted JS actually builds the markup (a `document.createElement("span")` / markup-factory shape — NOT raw `< span >`, NOT a dropped ternary arm). Control (d) MUST still pass. **DO NOT mark DONE without R26 passing on all three forms.**
If the deferred `examples/32-markup-as-value` example does not exist, do NOT author it — that is a separate corpus task (note it as unblocked).

# S198 — within-node + full suite
Your change touches codegen emit, which can shift corpus fixture output. Run the FULL `bun run test` (NOT just the pre-commit subset — the within-node parity canary + browser/lsp live only there) before reporting DONE. If the `M6.5.b.0` within-node allowlist prints `[within-node] OVER-BUDGET <relpath>: {CLASS:{raw,allow,residual}}`, re-baseline that fixture's allowlist entry IN THE SAME LANDING (set the per-class values to the printed `raw`, in-place, preserving key order — NOT a whole-file re-dump).

# OUT OF SCOPE (do NOT fix here; note if you encounter)
A separate reviewer finding: a free-standing `snippet name(){}` decl + file-scope `${render name()}` emitting two different undefined-function names → runtime ReferenceError (exit-0-but-broken). That is a DISTINCT free-standing-snippet codegen bug — leave it; just note it in your report if you trip over it.

# Commit discipline (crash-recovery)
- Commit after EACH meaningful unit (Phase 0 findings, each layer of the fix, the test). Don't batch. WIP commits expected. Code + its coupled test land in ONE commit (no transiently-red window).
- Before reporting DONE: `git status` clean (everything committed). "work in worktree, no commits" is NOT an acceptable terminal report.
- Update `docs/changes/markup-value-in-expression-2026-06-17/progress.md` after each step (append-only, timestamped: what was done / what's next / blockers).
- Add a regression test (unit or browser) covering all 3 forms — model it on existing markup/lift codegen tests (`compiler/tests/unit/each-block.test.js`, or grep for `emitCreateElementFromMarkup` / markup-factory tests).

# Final report MUST include:
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the R26 results (per-form: exit code + node --check + the emitted markup shape) · full-suite pass/fail + any within-node re-baseline · which layer(s) the fix landed in · deferred items · maps feedback.

The PA lands via S67 file-delta from your branch — keep your branch tip = FINAL_SHA.
