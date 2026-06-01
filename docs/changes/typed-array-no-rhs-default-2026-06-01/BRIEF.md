# BRIEF — typed-array declaration with no RHS defaults to `[]`

> Archived per pa.md S136 (verbatim). Dispatched S152 2026-06-01, `isolation:worktree` + `run_in_background`, scrml-js-codegen-engineer (opus). Agent `a1d9dba2ad69ce9f4`. User-ratified ("1 cool") off the req.scrml dogfood. Normative §6.2 grammar amendment + impl; Phase-0 drafts the SPEC wording for PA review at landing.

---

# TASK: typed-array declaration with no RHS defaults to `[]` (+ close the no-init-undefined hole) (change-id: `typed-array-no-rhs-default-2026-06-01`)

User-ratified S152 (dogfooding the todo). Two coupled changes — a SPEC §6.2 amendment + compiler impl. This is a **normative grammar change**, so Phase 0 drafts the SPEC wording for PA review.

## THE CHANGE
**Today (the bug):** a state-cell declaration with NO right-hand side — e.g. `<todos>: Todo[]` — is NOT one of the SPEC §6.2 three RHS shapes (Shape 1 literal/expr, Shape 2 render-spec, Shape 3 `const` derived; all RHS-bearing). The compiler currently **accepts it silently and emits no initializer** → `@todos` is `undefined` at runtime → `<each in=@todos>` crashes `_scrml_reconcile_list`. Verify this first (compile `<todos>: Todo[]` no-RHS, grep the emitted client.js for any `_scrml_reactive_set("todos", …)` — there is none today).

**The fix (two prongs):**
1. **Array-typed no-RHS → default `[]`.** A state-cell decl whose type annotation is an array type (`T[]`) and which has no RHS initializes to `[]` (the empty array — a DEFINED value per §42.1.1, distinct from `not`). The explicit `<todos>: Todo[] = []` stays valid; the no-RHS form is sugar for it. `reset(@todos)` / the `default=` target for such a cell is `[]` (consistent with §6.8).
2. **Non-array typed no-RHS → compile error.** `<x>: int`, `<x>: string`, `<x>: SomeStruct` (any non-array type) with no RHS → a NEW §34 code **`E-DECL-NEEDS-INITIALIZER`** (Error). This closes the silent-`undefined` hole for the non-array case. (Scalar zero-defaults — `int`→`0`, `string`→`""` — are explicitly OUT OF SCOPE / a separate open design question; do NOT implement them. Non-array no-RHS errors.)

**OUT OF SCOPE:** scalar/struct zero-defaults; the `default=` syntax itself; Shape 1/2/3 (unchanged); anything touching DQ-2 array-reactivity (reassignment stays canonical).

## PHASE 0 (MANDATORY — normative change; report the wording, don't free-style the SPEC)
1. Reproduce the bug (no-RHS array cell → no init emitted → undefined).
2. Read SPEC §6.2 (the three RHS shapes — find the exact lines; `grep -n "Shape 1\|Shape 2\|Shape 3\|RHS" compiler/SPEC.md` around §6.2) + §42.1.1 (defined-values) + §6.8 (default=/reset).
3. **Draft the §6.2 amendment text** — a 4th declaration shape ("typed-array, no RHS → `[]`") + the non-array-no-RHS → `E-DECL-NEEDS-INITIALIZER` rule + a §34 row for the new code. Put the proposed normative wording in your progress.md AND your final report so PA can review it before it lands. Keep it minimal + in the existing §6.2 voice.
4. Locate the impl sites: where a state-decl's RHS/init is parsed + emitted (ast-builder.js + type-system.ts + the cell-emit codegen — `emit-client.ts` / the `_scrml_reactive_set` init emission). Confirm whether a no-RHS decl reaches codegen as a state-decl with a null/absent init.
- **If the change turns out to require more than (a) synthesizing a `[]` init for array-typed no-RHS decls + (b) firing an error for non-array no-RHS — STOP and report.** It should be a localized init-synthesis + a validation fire.

## MAPS — REQUIRED FIRST READ
`.claude/maps/primary.map.md` in full; §"Task-Shape Routing" for a decl-grammar + codegen change. Maps reflect `09f74bee`; verify against HEAD `893872e3` (type-system.ts + emit-client.ts + ast-builder.js moved this session).

## CRITICAL — STARTUP + PATH DISCIPLINE (S99/S126)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`; else STOP (S90). Save WORKTREE_ROOT. 2. `git rev-parse --show-toplevel`==WORKTREE_ROOT. 3. `git status --short` clean. 4. `git merge main` if base stale (base should be `893872e3`). 5. `bun install`. 6. `bun run pretest`.
- ALL edits via Bash (perl/python/heredoc) on WORKTREE_ROOT-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools (they leak to MAIN). Echo path before each write; `git diff` after. NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`.
- First commit msg includes verbatim `pwd`: `WIP(array-default): start at <pwd>`. Commit per-step; `git status` clean before DONE; write `docs/changes/typed-array-no-rhs-default-2026-06-01/progress.md` per step (incl. the drafted SPEC wording).

## VERIFICATION (R26 — pa.md S138)
1. `<todos>: Todo[]` (no RHS) compiles + emits `_scrml_reactive_set("todos", [])` (or the deep-reactive equivalent) + `<each in=@todos>` renders an empty list (NO `_scrml_reconcile_list` crash — load it in happy-dom or at least confirm the init is `[]` not undefined).
2. `<x>: int` (no RHS) → `E-DECL-NEEDS-INITIALIZER` (clean error, not silent-undefined, not a crash).
3. Explicit `<todos>: Todo[] = []` still compiles identically (no regression). `reset(@todos)` → `[]`.
4. **Corpus regression:** grep the corpus (`examples/`, `samples/`) for any existing no-RHS typed decls that would now error; confirm none regress (or report them). Full pre-commit subset — 0 regressions.

## TESTS
- Codegen/parse unit tests: array-no-RHS → `[]` init (assert emitted shape); non-array-no-RHS → `E-DECL-NEEDS-INITIALIZER`; explicit `= []` unchanged; reset→[]. A happy-dom test that an empty defaulted array renders (and a subsequent `@todos = [...]` populates it).

## REPORT
- WORKTREE_PATH + BRANCH + FINAL_SHA. FILES_TOUCHED.
- **The drafted §6.2 SPEC amendment wording + the §34 E-DECL-NEEDS-INITIALIZER row** (verbatim, for PA review).
- Phase-0 finding (localized init-synthesis + validation, or ballooned → stopped).
- R26 results (the 4 checks). Corpus-regression result.
- Test counts before/after + new tests. Maps feedback.
- Any path-discipline incident (self-report).
