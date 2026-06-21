# ss4 item 2 — native-parser 3 byte-identical lexer residuals

**Dispatched:** 2026-06-21 (sPA ss4) · **Agent:** scrml-js-codegen-engineer · isolation:worktree · model:opus
**Land target:** branch `spa/ss4` (sPA file-deltas; agent does NOT touch main)

## Task

Close the 3 remaining byte-identical native-vs-Acorn lexer residuals so each bench file passes
the strict `full` gate. These are the genuine residuals the S209 ss4 run could not flip (5/8
M1.2-* files already flipped via the M1.3 comment-aware + M1.5 template/regex normalizers):

| bench file | current disposition | residual |
|---|---|---|
| `compiler/tests/parser-conformance/bench/decl-class.js` | `M1.2-string` | class-body token shape (`computed_` + `method`) |
| `compiler/tests/parser-conformance/bench/expr-optional-chain.js` | `M1.2-string` | `?.` token split |
| `compiler/tests/parser-conformance/bench/expr-template-literal.js` | `M1.2-template` | template token shape |

## Acceptance criteria

1. In `compiler/tests/parser-conformance-lexer.test.js` the disposition map (≈ lines 405–429) flips
   all three entries to `"full"`.
2. The `(full) byte-identical token stream vs Acorn` test passes for each of the three files — i.e.
   `compareFull(tokenizeWithAcorn(source), tokenizeWithNative(source))` succeeds (gate at ≈ line 510).
3. Update / remove the residual note in the now-dead `test.skip("(M1.3+) byte-identical…")` block
   (≈ lines 581–590) — those three files are no longer residual.
4. `cd compiler && bun test tests/parser-conformance-lexer.test.js` is fully green, AND the full
   pre-commit gate passes on commit.

## HARD constraint — fix the lexer, do NOT game the gate (R2/R3)

The fix MUST be in the **native lexer** (`compiler/native-parser/lex.js` + `compiler/native-parser/token.js`)
so the native token stream genuinely matches Acorn's (modulo the already-encoded intentional
scrml-extension divergences the comparator normalizes). Do NOT weaken `compareFull`,
`normalizeNativeToken`, or `normalizeAcornToken` to force a pass unless you find a NEW *intentional*
scrml-extension divergence — and if you do, justify it in the commit message + a code comment, the
same way the existing normalizer divergences are documented. The point of this item is real lexer
fidelity, not a green checkmark.

## Prior art (read these — the pattern to follow)

- The 5 files flipped in S209 ss4 (`decl-destructure`, `expr-async-await`, `expr-yield-generator`,
  `stmt-import-export`, `stmt-try-catch`) — same disposition-flip + lexer-normalizer shape.
- `?.` is already a single `TokenKind.OptionalChain` token (token.js ≈ line 62, "S114 K4"); the
  residual is about how that compares to Acorn's `?.` emission — see `normalizeAcornToken` (≈ line 164).
- Template tokens: native emits `TemplateChunk` + `TemplateInterpStart`/`TemplateInterpEnd`; Acorn
  emits template-boundary tokens differently. A normalizing comparator path may already exist for the
  flipped template cases — extend it, don't special-case.

## Scope guard

ONLY these files: `compiler/native-parser/lex.js`, `compiler/native-parser/token.js`, and
`compiler/tests/parser-conformance-lexer.test.js`. If a fix requires touching anything else
(block-splitter, ast-builder, etc.), STOP and report — that is a mis-scope to flag, not to push through.
This is the bounded lexer-fidelity item, NOT the big M2-M6 native-parser flip arc (that is parked,
Bucket B).

## Startup verification (F4 — MANDATORY, do FIRST)

1. `pwd` — confirm you are in YOUR isolation worktree (a `.claude/worktrees/agent-*` path), NOT
   `/home/bryan-maclee/scrmlMaster/scrml` (main) and NOT `../scrml-spa-ss4`.
2. `git rev-parse --abbrev-ref HEAD` — confirm your own agent branch; `git rev-parse --short HEAD`
   should be `3d311fc9` (the base).
3. Symlink deps so the test/pre-commit gate resolves (fresh worktree has no node_modules):
   ```
   ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules
   ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules
   rm -rf ./samples/compilation-tests/dist 2>/dev/null; ln -s /home/bryan-maclee/scrmlMaster/scrml/samples/compilation-tests/dist ./samples/compilation-tests/dist
   ```
4. ALL file writes use paths INSIDE your worktree (relative paths, or your worktree-absolute path).
   NEVER write to a `/home/bryan-maclee/scrmlMaster/scrml/...` (main) absolute path — that is the
   S99 leak class. Verify with `stat` + read-back after each write.

## Commit discipline

- Commit after each meaningful unit (incremental — crash recovery). WIP commits fine.
- Coupled code+test = ONE commit (the disposition flip + the lexer fix land together).
- Update `docs/changes/ss4-item2-lexer-residuals-2026-06-21/progress.md` after each step
  (append-only, timestamped).
- `git status` clean before you report DONE.
- NEVER `--no-verify`. The pre-commit hook is the gate; run it honestly.

## Report back

The agent branch name + tip SHA, the exact files changed, per-file confirmation each of the 3 flipped
to `full` and passes `compareFull`, and the full-gate result. If any of the 3 cannot be made
byte-identical without an intentional-divergence normalizer, report it as a residual with the reason
(do NOT force it) — that becomes a parked sub-finding.
