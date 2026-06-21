# ss4 item 3 — fn-decl block-analysis span overshoot

**Dispatched:** 2026-06-21 (sPA ss4) · **Agent:** scrml-js-codegen-engineer · isolation:worktree · model:opus
**Land target:** branch `spa/ss4` (sPA file-deltas; agent does NOT touch main)

## Bug (reproduced on HEAD 3d311fc9)

Every LOCAL function-decl parsed inside a `${…}` logic body gets a `span.end` pointing at the END of
the NEXT token (the next decl's opener), so its `endLine` lands on the next function's opening line
instead of its own closing `}`. Adjacent functions share a boundary line. This breaks
block-analysis.ts's per-block spans (consumed by flogence block-lease / dock tooling). NOT
adopter-facing, but blocks clean block-lease assignment.

Repro (real BS+AST path) over `examples/23-trucking-dispatch/pages/driver/messages.scrml`:
`getCurrentUser` 30..**38** (38 = `function fetchMessages`), `fetchMessages` 38..**69**, … all 11
adjacent fn pairs share a boundary line.

## Root cause (already located — verify, then fix)

`compiler/src/ast-builder.js`, inside `parseLogicBody`. The cursor helper:
```
function spanOf(startTok, endTok) { return { ... start: startTok.span.start, end: endTok.span.end, ... }; }
```
Both function-decl creation sites set `span: spanOf(startTok, peek())`. After the body is parsed by
`parseRecursiveBody()` — which CONSUMES the closing `}` (`_parseRecursiveBodyInner`, line ~4862
`consume(); break;`) — `peek()` is the token AFTER `}` (the next decl's opener), so
`endTok.span.end` overshoots. The last-CONSUMED token (`peek(-1)` = `tokens[i-1]`) is the `}`.

Two sites:
- `fnKind: "function"` site — `span: spanOf(startTok, peek())` at ~line 7870 (the `function name(){}` handler).
- `fnKind: "fn"` site — `span: spanOf(startTok, peek())` at line 8120 (the `fn name(){}` handler).

In both, no token is consumed between `parseRecursiveBody()` and the node return.

## The fix

At BOTH function-decl sites, change the span end-anchor from the next token to the last-consumed
token (the `}`):
```
span: spanOf(startTok, peek(-1)),
```
After `parseRecursiveBody()` returns, `peek(-1)` is the consumed `}`. In the rare bodyless case
(`peek().text !== "{"`, no `parseRecursiveBody` call), `peek(-1)` is still the last real decl token
(params `)` / return-type) — strictly better than `peek()` (the overshoot). Confirm by reading both
sites that `peek(-1)` resolves to the `}` after a normal body parse before committing.

## Scope guard (IMPORTANT)

ONLY the two function-decl sites in `ast-builder.js` + the regression test. Do NOT mass-rewrite the
~40 other `spanOf(startTok, peek())` decl sites (let/const/state/lin/bare-expr) — they overshoot too
but are NOT block-analysis-projected and changing them is a large, separate blast-radius concern
(note it in your report, do NOT fix it). Do NOT touch block-analysis.ts `projectSpan` — fix the root,
not the downstream `end-1` band-aid. If the function-decl fix requires touching anything beyond the 2
sites + the test, STOP and report.

## Regression test (drive the REAL path — no synthetic AST)

Add a unit test (extend `compiler/tests/unit/block-analysis.test.js` or a sibling) that compiles a
multi-function fixture through the REAL `buildAST(splitBlocks(path, src))` path (NOT a hand-built
node — synthetic ASTs would miss this upstream parser bug; see R26/S138). Use a small synthetic
source with ≥3 adjacent local functions inside a `<program>`/`<page>` `${…}` body, then assert via
`buildBlockAnalysisForFile`:
- each function block's `span.endLine` is < the next function block's `span.line` (no shared
  boundary line), AND
- each function's `endLine` equals the source line of its OWN closing `}`.

## Blast-radius safety net

Run the FULL pre-commit gate. The function-decl `span` is consumed by other passes (SYM, footprint,
diagnostics). If the 2-line change breaks span-dependent tests broadly, STOP and report the failing
tests — that signals the overshoot is load-bearing somewhere and we fall back to a block-analysis-side
fix (an escalate, not a push-through). A handful of tests that assert the OLD (overshooting) fn-span
and just need their expected value corrected is fine — fix those expectations and note them.

## Startup verification (F4 — MANDATORY, do FIRST)

1. `pwd` — confirm you are in YOUR isolation worktree (`.claude/worktrees/agent-*`), NOT main and NOT `../scrml-spa-ss4`.
2. `git rev-parse --short HEAD` should be `3d311fc9` (the base). If not, STOP and report a base mismatch.
3. Symlink deps:
   ```
   ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules
   ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules
   rm -rf ./samples/compilation-tests/dist 2>/dev/null; ln -s /home/bryan-maclee/scrmlMaster/scrml/samples/compilation-tests/dist ./samples/compilation-tests/dist
   ```
4. ALL writes use paths INSIDE your worktree. NEVER write to a `/home/bryan-maclee/scrmlMaster/scrml/...` (main) absolute path (S99 leak class). `stat` + read-back after each write.

## Commit discipline

- Coupled code+test = ONE commit. Incremental commits fine (crash recovery). WIP commits ok.
- Update `docs/changes/ss4-item3-fn-span-overshoot-2026-06-21/progress.md` after each step (append-only).
- `git status` clean before DONE. NEVER `--no-verify`.

## Report back

Agent branch + tip SHA, files changed, the before/after fn-span table for the messages.scrml repro
(proving the overshoot is gone), the new test's result, the full-gate result, and any locked-test
expectations you corrected. If the gate breaks broadly → report the failures, do NOT force.
