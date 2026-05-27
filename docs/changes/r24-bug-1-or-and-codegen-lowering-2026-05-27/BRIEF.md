# R24-BUG-1 — `or` / `and` boolean operators not lowered to `||` / `&&` in derived-cell codegen

**Change-id:** `r24-bug-1-or-and-codegen-lowering-2026-05-27`

**Severity:** HIGH (known-gaps Bug 28 / S136). Adopter-visible: compile exits 0 but emitted client JS contains raw `or` / `and` identifiers → `SyntaxError: Unexpected identifier 'or'` at runtime. Surfaced in gauntlet R24 by 2 of 4 devs (dev-1-react + dev-4-pascal), confirmed by 2 independent overseers. Highest blast radius of all R24 findings — affects every derived cell with mixed boolean operators.

## Bug summary

scrml uses word-form boolean operators (`or` / `and`) per SPEC §45 + §7. These should lower to JS `||` / `&&` at codegen. They currently pass through verbatim.

**Concrete reproducer** — `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-1-react.scrml` lines 134-135:

```scrml
const <visibleTickets> = @tickets.filter(t =>
    (@statusFilter is .All or t.status == @statusFilter)
    and (@searchTerm == "" or t.title.toLowerCase().includes(@searchTerm.toLowerCase()))
)
```

Emitted JS (current behavior, `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dist/dev-1-react.client.js` lines 378-379):

```javascript
( _scrml_reactive_get("statusFilter") === "All" or t . status === _scrml_reactive_get("statusFilter") )
and ( _scrml_reactive_get("searchTerm") === "" or t . title . toLowerCase ( ) . includes ( _scrml_reactive_get("searchTerm") . toLowerCase ( ) ) )
```

Expected: `or` → `||`, `and` → `&&`. Other operators on the same line (`==` → `===`, `is .All` → `=== "All"`) lower correctly, so the operator-lowering machinery EXISTS — `or`/`and` are just missing from it.

## Spec references (verify against current SPEC.md; don't trust paraphrase)

- **SPEC §45** — Equality / boolean operator semantics. `or` and `and` are scrml word-form boolean operators (not JS `||` / `&&`); compiler must lower at JS-host emission.
- **SPEC §7** — Logic contexts. Boolean expressions inside `${...}` blocks and inside derived-cell expressions.

Per pa.md Rule 4 (SPEC is normative; derived planning docs drift): cross-check this brief's spec claims against the current SPEC.md text before encoding the fix. If the spec says something different, the spec wins.

## Suspect files (PA-side initial scope)

Two strong candidates from grep:

- `compiler/src/codegen/emit-expr.ts` — most likely location; expression emission for derived cells passes through here
- `compiler/src/codegen/emit-predicates.ts` — possible secondary site; validator-predicate emission may share a path

Plus check `compiler/src/codegen/lint-undefined-interpolation.ts` (tangential, but appeared in grep — might inform context).

Look for the binary-operator translation table (where `==` becomes `===`, etc.) — that's where `or` → `||` and `and` → `&&` should be added. The presence of working `==` → `===` lowering on the SAME line as broken `or` passthrough proves the machinery exists; it's missing two entries.

DO NOT assume the fix is just two table rows — verify by reading the actual code path. If the tokenizer or parser is treating `or`/`and` as IDENTIFIERS (not as binary operators) at any prior stage, the fix may need to span tokenizer → parser → emitter. Triage end-to-end before patching.

## MAPS — REQUIRED FIRST READ

Before consuming any other context (kickstarter / anti-patterns / SPEC sections / source files),
read `.claude/maps/primary.map.md` in full. It is ~100 lines.

The §"Task-Shape Routing" section in that file tells you which additional maps to consult based
on your task shape. For this task, the shape is **compiler-source bug fix** — follow that routing.

Map currency: maps reflect HEAD `27e14c66` as of 2026-05-27. The only commits since are docs-only
(S136 wrap-up + gauntlet artifacts). No compiler-source files have changed. Maps are reliable.

Feedback: in your final report, include either:
- "Maps consulted: [list]; load-bearing finding: <one sentence on what the map content told you>"
- "Maps consulted but not load-bearing — [optional: which map you expected to help but didn't]"

The second answer is fine and valuable. It's signal PA needs.

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (F4 + S99 + S126)

Your worktree path is whatever the harness assigns — confirm it via Step 1 below.

### Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If the path is under any other repo (e.g., `scrml-support/.claude/worktrees/`), STOP and report
   — this is the S90 CWD-routing failure mode. Save the output as your WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` — MUST equal WORKTREE_ROOT.
3. Run `git status --short` — confirm tree is clean.
4. Run `bun install` — worktrees do NOT inherit node_modules. The pre-commit hook will fail otherwise.
5. Run `bun run pretest` — populates `samples/compilation-tests/dist/` for browser tests.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

### S99 first-commit pwd echo (mandatory)

Your FIRST commit message MUST include the verbatim output of `pwd` from your startup
verification, e.g.: `WIP(r24-bug-1): start at $(pwd)`. PA verifies on landing.

### Path discipline (enforce on EVERY edit) — S126 Bash-edit requirement

The Edit/Write tools have a known filesystem-divergence bug in worktree dispatches (S126
incidents #12, #13). Until the platform-level hook lands, **use Bash-based edits exclusively**:

- For surgical edits: `perl -i -pe 's|...|...|g' "$WORKTREE_ROOT/path/file.ts"` (escape pipes carefully)
- For new files: `cat > "$WORKTREE_ROOT/path/file.ts" <<'EOF' ... EOF`
- For multi-line splice: use `perl` with multi-line mode or `python3` with `Path().read_text()` / `write_text()`
- ALWAYS use the worktree-absolute path (including the `.claude/worktrees/agent-<id>/` segment)
- ALWAYS echo the target path before each write: `echo "writing to $WORKTREE_ROOT/path/file.ts"`
- AFTER each write: verify via `git diff "$WORKTREE_ROOT/path/file.ts"` + `grep -c '<expected>' "$WORKTREE_ROOT/path/file.ts"`

### Never `cd` into the main repo (S126 strengthening)

The main repo is at `/home/bryan-maclee/scrmlMaster/scrmlTS/`. NEVER `cd` into it from this
dispatch — even for compile / test runs. Instead:

- For `bun` commands: use `--cwd "$WORKTREE_ROOT"` (e.g., `bun --cwd "$WORKTREE_ROOT" install`)
- For `git` commands: use `git -C "$WORKTREE_ROOT" <subcmd>`
- For file ops: use worktree-absolute paths

If you `cd` into the main repo even once, subsequent operations resolve there — leaks into
main are guaranteed. Don't.

## Commit discipline (S83 two-sided rule)

- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY.
- Don't batch — commit per sub-fix (one for the lowering table, one for the regression test, etc.).
- Before reporting "DONE": `git -C "$WORKTREE_ROOT" status` MUST be clean. If non-clean, commit before reporting. "HEAD unchanged — work in worktree, no commits" is NOT an acceptable terminal report.

## The fix

1. **Triage** — read `compiler/src/codegen/emit-expr.ts` (most likely site) + check the operator-translation path. Identify exactly where `==` becomes `===` (working case). Verify whether `or`/`and` are:
   (a) absent from the table (simplest fix — add two rows), or
   (b) present but with wrong RHS, or
   (c) treated as identifiers at the parser stage (more invasive fix).
   Report your triage finding before patching.

2. **Patch** — add `or` → `||` and `and` → `&&` lowering. Match the existing style in the file.

3. **Regression test** — author a test that pins the fix. Likely location: `compiler/tests/unit/` (look for sibling derived-cell or expression-codegen tests). Coverage must include:
   - `const <x> = a or b` (single `or`)
   - `const <x> = a and b` (single `and`)
   - `const <x> = a or b and c` (mixed precedence — `and` binds tighter)
   - `const <x> = arr.filter(t => t.x == 1 or t.y == 2 and t.z == 3)` (filter-callback shape from the reproducer)
   - Negative-control: confirm the existing `==`→`===` lowering still works alongside

4. **Run the full test suite** via `bun --cwd "$WORKTREE_ROOT" run test` and verify 0 regressions.

5. **Verify the reproducer**: compile dev-1-react.scrml via the path-aware command — your fix should produce client.js with `||` and `&&` instead of `or`/`and`. (Note: dev-1-react.scrml has OTHER bugs from R24 — Bugs 29/31/32 — so it may still fail `node --check`; just verify `or`/`and` are gone.)

## Required tests

- Regression test for the fix in `compiler/tests/unit/` (see step 3 above)
- Full `bun run test` suite: 0 fail required (current baseline 14,743 pass / 0 fail / 88 skip / 1 todo from S136 pre-commit gate)

## Final report shape

When done, report back with:

- **WORKTREE_ROOT:** <full path>
- **BRANCH:** <agent branch name>
- **FINAL_SHA:** <tip SHA of your branch>
- **FILES_TOUCHED:** <list with line counts>
- **TRIAGE_FINDING:** which of (a)/(b)/(c) above; exact site of the bug
- **FIX_DESCRIPTION:** what you changed and why
- **TEST_RESULTS:**
  - new tests added: <N>
  - full-suite delta: <pre-counts> → <post-counts>
  - dev-1-react.scrml reproducer: `or`/`and` still present (FAIL) | now `||`/`&&` (PASS)
- **MAPS_CONSULTED:** [list with load-bearing finding per the maps block above]
- **DEFERRED_ITEMS:** anything you noticed but didn't fix (with severity)

If you hit a Phase-0 STOP (e.g., the fix is much broader than expected, the bug isn't where the triage suggests, etc.), STOP and report the surface area + recommended scoping before any code changes.

## What this dispatch is NOT

- NOT a broader codegen audit. Fix `or`/`and`, add the regression test, ship.
- NOT a refactor opportunity. If you see other operator-translation issues, file them as deferred items but DO NOT widen scope.
- NOT a chance to migrate the file's style. Match existing style.

## Acknowledgments — context this dispatch composes with

- Companion bug **R24-BUG-2** (Bug 29 in known-gaps) — `!{}` handler `{ return }` arm codegen — will be a SEPARATE dispatch. Don't touch error-handler codegen here.
- R24-BUG-4 (`<match>` `</>` closer) is parser, not codegen — out of scope.
- The R24 round report at `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24-report.md` is the primary source of context if you need to triangulate the bug's surface.

Good luck.
