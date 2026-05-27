# R25-Bug-38 progress

Change-id: r25-bug-38-guarded-expr-arm-body-2026-05-27
Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a5b5a455a54766662
Worktree base before merge: ef9833f9 (S135 close)
Main HEAD at startup: 050e20e8 (S137 within-node rebump)

## Step 0 — startup + setup

- pwd = /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a5b5a455a54766662 (correct worktree segment)
- git toplevel matches
- tree clean
- bun install OK
- bun run pretest OK (samples/compilation-tests/dist populated)
- **MERGED MAIN** (worktree base predated R24-BUG-2 fix `c7e81962` and S137 rebumps);
  fast-forward, no conflicts. Now at 050e20e8.

## Step 1 — surface trace (no code reads done besides emit-logic.ts case "guarded-expr")

Confirmed the `case "guarded-expr"` block at lines 2417-2540 of `compiler/src/codegen/emit-logic.ts`.
The R24-BUG-2 `splitTopLevelStmts` + `isTerminatorStmt` helpers are present (lines 2479-2515)
exactly as described in the c7e81962 patch.

## Step 2 — root-cause hypothesis (BEFORE writing fix code)

The bug is in `emitArmAssign` (lines 2517-2543) interacting with `emitArmBody` /
`rewriteBlockBody`.

`emitArmBody` (line 348-361) routes `{ ... }` arm bodies through `rewriteBlockBody`.
`rewriteBlockBody` (emit-control-flow.ts:1275-1361) does:

  - splits the body on top-level `;` AND `\n` (line 1287 — `(ch === ";" || ch === "\n") && depth === 0`)
  - rewrites each stmt (e.g. `@x = "value"` → `_scrml_reactive_set("x", "value")`)
  - joins with **`"; "` (semicolon + space) — NO newline** (line 1360 `return results.join("; ")`)

So `{ @x = "value"; @y = 0 }` arrives at `emitArmAssign` as a SINGLE-LINE string:

  `_scrml_reactive_set("x", "value"); _scrml_reactive_set("y", 0)`

Then `emitArmAssign`:
  - `trimmed.includes("\n")` → **false** (no `\n` in the joined output)
  - falls into the single-line branch (lines 2527-2542)
  - `splitTopLevelStmts(trimmed)` → 2 statements
  - `isTerminatorStmt(last)` → false (it's a `_scrml_reactive_set(...)` call)
  - falls through to the final return: emits `${resultVar} = ${bare};` where
    `bare` is `_scrml_reactive_set("x", "value"); _scrml_reactive_set("y", 0)`

So the emitted JS is:
  `    _scrml_result = _scrml_reactive_set("x", "value"); _scrml_reactive_set("y", 0);`

The FIRST statement is `_result = _scrml_reactive_set("x", "value");` (legal but wrong —
binds the return value of reactive_set to _result, side-effect runs).
The SECOND is bare `_scrml_reactive_set("y", 0);` (fine on its own at statement level).

This is NOT a SyntaxError for the multi-side-effect case — but it IS wrong because:
  1. Only the LAST reactive_set's value lands in `_result` (the others land as dropped exprs)
  2. The "arm assigns to result" contract is broken — `_result` is now a function-call return, not a value
  3. The dev's "statement boundary not detected" warning aligns with this confused shape

For the **single-line collapsed `| .Variant -> @x = 1`** shape, `emitArmBody` goes through
the non-block branch (line 359 `emitExprField`). That returns something like
`_scrml_reactive_set("x", 1);` and `emitArmAssign` falls into the SAME single-line branch
and emits `${resultVar} = _scrml_reactive_set("x", 1);`. Again — legal JS but the wrong shape;
"_result = side-effect-call-return" is meaningless. The dev expected the arm-body to fire
as a STATEMENT, not as a value-binding.

For the **multi-line shape with `\n` separator** (R25 dev fixtures), if the body comes through
with a literal `\n` (e.g. `{ @x = "value";\n  @y = 0 }`), `rewriteBlockBody` strips the `\n`
during split AND joins with `"; "` — no newline in output. So this collapses to the same
single-line shape. CONFIRMED via re-read of rewriteBlockBody.

For the **`const r = ...` workaround**, the resultVar wire-up still emits `var r = _scrml_result;`,
but the inner arm body STILL goes through the broken `emitArmAssign` path → same shape.

### FIX SHAPE

The current code conflates two concerns:
  - "arm body is statement-shaped" (side-effects / reactive-sets / terminators)
  - "arm body is expression-shaped" (a value to bind to _result)

The clean fix is: arm bodies that ARE statement-shaped should emit as statements
(NO `_result = ...` wrap, MAY emit `_result = null` post-side-effect if `bindingName`
is wired so subsequent code sees a defined value; or just let _result remain undefined
since the wildcard-less propagator returns `_result` directly).

PRIMER §6 / SPEC §19.5 canon: an arm body is a SIDE-EFFECT handler. The shape is
"handle the error case, then either propagate or return." The body produces no value
for the success-path binding. The current `_result = ...` wrap is the LEGACY shape from
when arm bodies were treated as value-producing — but the canonical scrml shape per
PRIMER §6 is statement-bodied.

Specifically:
  - Multi-statement reactive-write body (`@x = "value"; @y = 0`):
    Emit AS-IS, no `_result =` wrap. The `if (...__scrml_error)` block already returns
    via the wildcard-less propagator OR continues to the no-wildcard `return _result`
    fall-through. Side-effects fire before that return.
  - Single-line reactive-write body (`@x = 1` collapsed form):
    Same — emit as a bare statement.
  - Value-producing arm body (`| .X -> "fallback"`):
    THIS is the value-shaped arm. `_result = "fallback";` IS correct here.
    Detection: the body is a single expression that is NOT a function call AND NOT a
    reactive_set. Simpler detection: if the rewritten body starts with
    `_scrml_reactive_set(` or `_scrml_engine_` or similar side-effect call, treat as
    statement.

But a more robust detection: split on top-level `;`. For each statement, classify:
  - terminator (return/throw/break/continue) → statement-shape
  - reactive_set / engine write / void call (`fn(...)`) → statement-shape
  - bare expression (literal / variable / non-call expr) → value-shape

When ALL statements are statement-shaped, emit as statements (no `_result =` wrap).
When the LAST statement is value-shape (and not a void call), wrap that one as
`_result = <last>;` and emit the preceding ones as statements.

Actually — even simpler. Let me read SPEC §19.5 to confirm canonical shape.

(Now reading SPEC + PRIMER + writing fix.)

## Step 3 — fix landed at 56bfbe76

emit-logic.ts:emitArmAssign extended with two new branches:

  - `splitTopLevelStmts(trimmed).length > 1` → emit each stmt as bare,
    no `_result =` wrap. (Multi-stmt body = always statement-shape.)
  - `stmts.length === 1 && isStatementShapeStmt(stmts[0])` → emit bare.
    (Single-line collapsed reactive-write / engine-write / navigate.)

The `isStatementShapeStmt` helper detects known side-effect-emitting prefixes:
`_scrml_reactive_set(`, `_scrml_engine_*(`, `_scrml_navigate(`,
`_scrml_register_cleanup(`, `_scrml_effect(`, `_scrml_init_set(`.

R24-BUG-2 terminator path preserved unchanged.

## Step 4 — tests added at 56bfbe76

NEW: compiler/tests/unit/error-handler-arm-body-emission.test.js — 18 tests
across 12 sections (§1-§12; see file header for the coverage matrix).

UPDATED: compiler/tests/unit/error-handler-terminator-arms.test.js §7 — the
two failing test expectations were encoding the R25-Bug-38 BUG SHAPE.
Updated to assert the new correct behavior. The §7 narrative + body fixed
to point at R25-Bug-38 instead of "wrap stays" claim.

## Step 5 — pre-commit gate result

  TESTS_BEFORE: 14815 pass / 88 skip / 1 todo / 0 fail / 762 files
  TESTS_AFTER:  14833 pass / 88 skip / 1 todo / 0 fail / 763 files

Delta: +18 tests (all new R25-Bug-38 regression tests in NEW file), +1 file.
Zero regressions. Pre-commit gate passed cleanly on the fix commit.

## Step 6 — reproducer verification (e2e via real compileScrml)

  BEFORE (HEAD~ at c52aeeeb, R24-BUG-2 in place but R25-Bug-38 still open):
    `_scrml_result_5 = _scrml_reactive_set("x", "missing"); _scrml_reactive_set("y", 0);`

  AFTER (HEAD at 56bfbe76):
    `_scrml_reactive_set("x", "missing");
        _scrml_reactive_set("y", 0);`

  node --check on emitted client.js: EXIT=0 (parses)
  statement-boundary-warning count on bug38.scrml fixture: 0

## Final state

  FINAL_SHA:  56bfbe76
  BRANCH:     worktree-agent-a5b5a455a54766662
  WORKTREE:   /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a5b5a455a54766662

  FILES_TOUCHED:
    - compiler/src/codegen/emit-logic.ts (+36L emitArmAssign extension)
    - compiler/tests/unit/error-handler-arm-body-emission.test.js (NEW, 18 tests)
    - compiler/tests/unit/error-handler-terminator-arms.test.js (§7 expectations updated)
    - docs/changes/r25-bug-38-guarded-expr-arm-body-2026-05-27/progress.md (this file)

  TASK_STATUS: complete
