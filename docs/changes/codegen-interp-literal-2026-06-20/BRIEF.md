# BRIEF — codegen-interp-literal-2026-06-20 (S210 dispatch, verbatim per S136)

**Agent:** scrml-js-codegen-engineer · opus · isolation:worktree · background · agentId ac894d93280bac7c8
**Bugs:** g-attr-interp-fn-name-not-renamed (HIGH, AD) + g-literal-arg-expr-serializer-wrong-span (HIGH, regex) — bundled (same emit subsystem)

---

You are `scrml-js-codegen-engineer` fixing TWO HIGH silent-miscompile bugs in the scrml compiler codegen (TS source). They are the same subsystem (expression / interpolation emit correctness), bundled so ONE owner avoids an emit-expr race. Change-id: `codegen-interp-literal-2026-06-20`. Fix them as TWO separate logical units (separate commit groups, separate R26 verification).

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first (~100 lines); follow its §"Task-Shape Routing" for a compiler-source bug fix.
Map currency: maps reflect HEAD 85d9e958 as of 2026-06-20; current HEAD is 41422726 (21 commits behind). Treat map content as a hypothesis to verify via grep/Read, NOT ground truth.
Report: "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had multiple leaks; do not be the next)
Before ANY other tool call:
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If under any other repo, STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` clean.
4. `bun install`.
5. `bun run pretest`.
6. `git merge main` (pull current main 41422726; should be no-op/trivial).
If any check fails: STOP + report.

PATH DISCIPLINE — every write:
- Apply ALL edits via Bash (perl/python3/cp/heredoc) on WORKTREE-ABSOLUTE paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools (S126). Echo path before each write; re-verify via `git diff`/`grep` after.
- NEVER `cd` into main or anywhere; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only (S126 #14/#15).
- FIRST commit message embeds `$(pwd)` from step 1.

# BUG 1 (HIGH — g-attr-interp-fn-name-not-renamed)
A user `function` called inside an HTML ATTRIBUTE-VALUE interpolation emits the BARE name (not the encoded name) → runtime ReferenceError. Compile-clean, silently broken.
Reproducer (write to `$WORKTREE_ROOT/tmp-ad.scrml`, compile, inspect emitted client.js):
```
<program>
${
function tag() { return "hi" }
@n = 1
}
<div class="box box-${tag()}">attr interp — BREAKS (ReferenceError: tag)</>
<p>${tag()}</>
<span class="c-${@n}">cell interp in attr — fine</>
</>
```
PA-confirmed on HEAD 41422726: emitted client.js class-attr line emits BARE `tag()` inside the class template literal (WRONG; should be the encoded `_scrml_tag_N()`). SAME FILE: the `@n` attr-interp correctly emits `_scrml_reactive_get("n")`, and the textContent interp `${tag()}` correctly emits `_scrml_tag_4()`. So the @cell-rewrite AND the textContent fn-name-rewrite both work; ONLY the attribute-value template-literal path misses the user-fn-name encoding.
Likely locus: `compiler/src/codegen/emit-html.ts` (the class/attr template-literal build, ~lines 1099-1130) and/or `compiler/src/codegen/emit-event-wiring.ts` (the attr-interpolation rewrite, ~lines 1210-1215 do `_scrml_reactive_get("name")`→encoded string-replace). Survey: find where textContent `${fn()}` gets `fn`→`_scrml_fn_N` and apply the SAME user-fn-name encoding on the attribute-value interpolation path. Adjacent precedent: Bug Z (rename-pass interpolation coverage; string-literal half fixed S144 `88071273`). You're authorized to correct the locus if the survey points elsewhere.

# BUG 2 (HIGH — g-literal-arg-expr-serializer-wrong-span)
A regex/string LITERAL in method-call-argument position re-serializes the WHOLE enclosing expression (space-tokenized) instead of just the literal → silent miscompile.
Reproducer (write to `$WORKTREE_ROOT/tmp-regex.scrml`, compile, inspect):
```
<program>
${
  type Row:struct = { tok: text }
  <rows>: Row[] = []
  <raw> = "a b c"
  function splitLiteral(s) { return s.split(/[^a-z0-9]+/).map(t => ({ tok: t })) }
  on mount { @rows = splitLiteral(@raw) }
}
<ul><each in=@rows as r key=r.tok><li>${r.tok}</li></each></ul>
</program>
```
PA-confirmed on HEAD 41422726: the emitted `_scrml_splitLiteral_N` body = `return s.split(s . split ( /[^a-z0-9]+/ ) . map ( t => ( { tok : t } ) )).map(...)` — the `.split()` ARGUMENT is the re-serialized WHOLE enclosing expression; it should be just `/[^a-z0-9]+/`. SECONDARY symptom (same root): a STRING literal in call-arg position loses its quotes — `splitLiteral("a-b-c")` → `splitLiteral(a - b - c)` → loud `E-SCOPE-001` (a/b/c undeclared). So this bug is path-sensitive: silent (regex) or loud (string), one root.
Likely locus: `compiler/src/codegen/emit-expr.ts` — the call-argument emit / literal-node handling (emitCall + a fallback that re-serializes the wrong source span). PROOF of root: binding the regex/string to a `const` and passing by NAME serializes correctly (an identifier in arg position works). Fix the literal-node serialization to emit the literal itself with the correct span, for BOTH regex AND string literals in call-arg position. Survey emit-expr.ts's call/arg/literal/fallback path first.

# SPEC note
Both bugs are codegen-CORRECTNESS fixes ("emit the right thing") — neither should need a SPEC amendment. If you believe a SPEC change is required, STOP and report — do NOT amend SPEC for a codegen-correctness fix without flagging.

# COMMIT DISCIPLINE (S83 two-sided)
After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>`; `add`; commit IMMEDIATELY (code + coupled test in ONE commit). TWO bugs = TWO commit groups (don't intermix). Before DONE: `git -C "$WORKTREE_ROOT" status` clean.
Append to `$WORKTREE_ROOT/docs/changes/codegen-interp-literal-2026-06-20/progress.md` after each step. Commits + progress.md are crash-recovery.

# VERIFICATION (R26 mandatory for BOTH — S138; these are silent-miscompile bugs)
- Bug 1: recompile tmp-ad.scrml post-fix → the class-attr emit line MUST become the encoded `_scrml_tag_N()` (NOT bare `tag()`); `node --check` clean; grep-assert no bare `tag(` inside the attr template-literal. Record before/after.
- Bug 2: recompile tmp-regex.scrml post-fix → `_scrml_splitLiteral_N` body MUST emit `s.split(/[^a-z0-9]+/).map(...)` (NOT the whole-expr re-serialization); AND a string-literal-in-call-arg repro (`splitLiteral("a-b-c")`) MUST keep its quotes (no `a - b - c`); `node --check` clean. Record before/after.
- Add VALUE-asserting regression tests for both (assert the emitted shape, not merely "it compiled").
- Delete tmp-*.scrml before final commit.
- FULL suite: `bun --cwd "$WORKTREE_ROOT" run test` (NOT the subset — parity canary + browser/lsp are full-suite-only). These are codegen output changes → HIGH within-node fixture-shift risk: re-baseline the M6.5.b.0 within-node allowlist IN THE SAME LANDING (over-budget test prints `[within-node] OVER-BUDGET <relpath>: {...}` → set the allowlist entry per-class values to the printed `raw`, in-place, preserving key order). 0 failures before DONE.
DO NOT mark DONE without BOTH R26 verifications passing.

# .scrml reproducer-form note
Canonical V5-strict decl form (`<x> = 0` top-level; `@x` reads/writes) per the PRIMER. Don't mix decl forms.

# REPORT (final message IS the PA's landing input — raw facts)
WORKTREE_ROOT · FINAL_SHA · branch · FILES_TOUCHED (worktree-absolute) · per-bug before/after R26 result · full-suite pass/skip/fail · within-node touched? (which fixtures) · Maps line · deferred items.
