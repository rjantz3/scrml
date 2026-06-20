# BRIEF — engine-name-attr-reject-2026-06-20 (S210 dispatch, verbatim per S136)

**Agent:** scrml-js-codegen-engineer · opus · isolation:worktree · background · agentId acf01716d7d465ba0
**Bug:** g-engine-name-attr-swallows-var-duplicate (HIGH) · ruling (a) reject name= on <engine>

---

You are `scrml-js-codegen-engineer` fixing ONE HIGH compile-clean-but-runtime-broken bug in the scrml compiler (TypeScript/JS source). Change-id: `engine-name-attr-reject-2026-06-20`.

# MAPS — REQUIRED FIRST READ
Before any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which additional maps to consult for a compiler-source bug fix — follow it.
Map currency: maps reflect HEAD 85d9e958 as of 2026-06-20, but current HEAD is 41422726 (maps are 21 commits behind). Treat map content as a starting hypothesis to verify via grep/Read against current source, NOT ground truth.
In your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had multiple path-discipline leaks; do not be the next)
Before ANY other tool call:
1. Run `pwd`. It MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it is under any other repo (e.g. scrml-support), STOP and report (S90 CWD-routing failure). Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `bun install` (worktrees don't inherit node_modules; the pre-commit hook's `bun test` needs it).
5. `bun run pretest` (populates samples/compilation-tests/dist/; full `bun test` ~130 ECONNREFUSED without it).
6. `git merge main` (pull current main 41422726 in case your base is stale; should be a no-op/trivial). Resolve trivially or report.
If any check fails: STOP and report.

PATH DISCIPLINE — enforce on EVERY write:
- Apply ALL file edits via Bash (perl/python3/cp/heredoc) on WORKTREE-ABSOLUTE paths that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools (S126 — the Edit/Write tool has leaked to MAIN twice). Echo the target path before each write; re-verify via `git diff`/`grep` after.
- NEVER `cd` into the main repo or anywhere; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths exclusively (S126 #14/#15 — `cd`/cwd-reset leaked installs+compiles into MAIN).
- Your FIRST commit message MUST embed `$(pwd)` from step 1 (e.g. `WIP(engine-name-reject): start at <pwd>`) so the PA can verify no leak on landing.

# THE BUG (HIGH — g-engine-name-attr-swallows-var-duplicate)
`name=` is NOT a valid `<engine>` attribute. SPEC §51.0.B engine attribute set = `for=` / `initial=` / `var=` / `derived=`. `name=` belongs to nested `<program>`, `<onTimeout>`, workers — and legacy `<machine>`. Today the compiler SILENTLY consumes `<engine name=X for=T>`: it derives the engine cell from the name (lowercase-first-char) instead of from `for=`, AND a separately-declared cell of the same governed name does NOT trip the `E-ENGINE-VAR-DUPLICATE` collision gate that the canonical `var=`/auto-derive path DOES trip. Result: a runtime-broken transition write-guard (two mismatched transition tables) with NO compile-time diagnostic — the compile-clean/runtime-broken silent-break class.

Reproducer (write this to a worktree temp file `$WORKTREE_ROOT/tmp-ae.scrml` and compile it):
```
<program>
${
type Mode:enum = { Nav, Edit }
@mode: ModeMachine = Mode.Nav
function toggle() { if (@mode == Mode.Nav) { @mode = .Edit } else { @mode = .Nav } }
}
<engine name=ModeMachine for=Mode initial=.Nav>
  <Nav  rule=.Edit />
  <Edit rule=.Nav />
  <onTransition from=.Nav to=.Edit>${ @mode = @mode }</onTransition>
  <onTransition from=.Edit to=.Nav>${ @mode = @mode }</onTransition>
</engine>
<div><button class="tg" onclick=toggle()>toggle</button><span class="m">${@mode}</span></>
</>
```
PA-confirmed on HEAD 41422726: this compiles EXIT 0 today; the emitted client.js builds `__scrml_engine_modeMachine_transitions` but the `@mode` write-guard looks up a DIFFERENT table `__scrml_transitions_ModeMachine` → runtime `E-ENGINE-001-RT` on every legal transition.
CONTROL (proves the root): the canonical `var=mode` form + a separate `@mode` cell correctly fires `E-ENGINE-VAR-DUPLICATE` (exit 1); the `name=` form bypasses that exact gate (exit 0).

Likely locus: `compiler/src/ast-builder.js` engine-opener attribute parse (~lines 14260-14741; line ~14440 literally comments "§51.0 canonical form: `<engine for=Type ...>` (no name=)" — the parser KNOWS engines take no `name=`, but doesn't enforce it; var= override extraction ~14528-14542). The collision gate `E-ENGINE-VAR-DUPLICATE` lives in `compiler/src/symbol-table.ts` (walkRegisterEngines / PASS 10.A). VERIFY the actual mechanism by which `name=` becomes the var source — it likely leaks through a shared engine/machine attr parser (legacy `<machine name=>` IS valid). Per the depth-of-survey discipline, survey the real fire-site before assuming; you are authorized to correct the locus if the survey points elsewhere.

# THE FIX (ruling (a), PA-decided + user-aware — do NOT choose differently)
REJECT `name=` on `<engine>` at the earliest clean point (parse or SYM) with a clear diagnostic that NAMES THE ROOT and hints the canonical form, e.g.: "`name=` is not a valid `<engine>` attribute; the engine's variable name is auto-derived from `for=` or overridden with `var=`. Did you mean `var=`?" Do NOT make `name=` a silent alias for `var=` (rejected fork — proliferates a confusing cross-element meaning; Pillar-5 keyword discipline).
- Add the new error code to SPEC §34 in the SAME change (pa.md Rule 4 — SPEC is normative). Choose an `E-ENGINE-*` name consistent with the family (e.g. `E-ENGINE-NAME-ATTR-INVALID`; confirm no §34 collision). Add a one-line normative note to SPEC §51.0.B that `name=` is rejected on `<engine>` (canonical override is `var=`). Apply SPEC.md edits via Bash on the worktree-absolute path.
- Confirm the canonical forms STILL behave: no-name `<engine for=Mode initial=.Nav>` (engine owns var) compiles; `var=X` override works; `var=mode` + separate `@mode` cell STILL fires `E-ENGINE-VAR-DUPLICATE`.
- Legacy `<machine name=...>` must be UNAFFECTED (name= stays valid there). Scope your rejection to `<engine>` openers only.

# COMMIT DISCIPLINE (S83 two-sided — both halves mandatory)
After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>`; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY (code + its coupled test in ONE commit). Don't batch. WIP commits expected.
Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "work in worktree, no commits" is NOT acceptable.
Append to `$WORKTREE_ROOT/docs/changes/engine-name-attr-reject-2026-06-20/progress.md` after each step (what done / what next / blockers). Your commits + progress.md are how the PA recovers if you crash.

# VERIFICATION (R26 mandatory — S138)
1. Regression test: assert `<engine name=X for=T>` now fires the new diagnostic; assert the canonical no-name + var= forms still compile; assert `var=mode` + separate `@mode` still fires E-ENGINE-VAR-DUPLICATE.
2. R26 empirical: compile the reproducer above on your post-fix baseline (`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT/tmp-ae.scrml" --output-dir /tmp/ae-verify`). It MUST now FAIL with your clear diagnostic (NOT exit-0). Record before (exit 0) / after (exit 1 + message) in the report. Delete tmp-ae.scrml before final commit (don't leave it in the tree).
3. FULL suite: `bun --cwd "$WORKTREE_ROOT" run test` (NOT just the pre-commit subset — parity canary + browser/lsp live only in the full suite). If your change shifts any within-node fixture, re-baseline the M6.5.b.0 within-node allowlist IN THE SAME LANDING (the over-budget test prints `[within-node] OVER-BUDGET <relpath>: {...}` → set the allowlist entry's per-class values to the printed `raw`, in-place, preserving key order). 0 failures before DONE.
DO NOT mark DONE without R26 passing.

# .scrml reproducer-form note
Use canonical V5-strict decl form (`<x> = 0` at top level; `@x` reads/writes) per the PRIMER. Don't mix decl forms.

# REPORT (your final message IS the PA's landing input, not a human message — return raw facts)
WORKTREE_ROOT · FINAL_SHA (`git -C "$WORKTREE_ROOT" rev-parse HEAD`) · branch name · FILES_TOUCHED (worktree-absolute) · the new §34 code name · before/after R26 result · full-suite pass/skip/fail · within-node touched? · Maps line · any deferred items.
