# B1 — native parser must produce `reset-expr` for `reset(@cell)` (F1 family, real bug)

**Dispatch:** S163, 2026-06-04. **Agent:** scrml-js-codegen-engineer. **Model:** opus. **Isolation:** worktree.
**Change-id:** native-reset-builtin-b1-2026-06-04.

## The bug (confirmed by PA recon + the F1 survey)

Under `--parser=scrml-native`, a `reset(@cell)` call in scrml logic fires a spurious **`E-SCOPE-001`** (`examples/14-mario-state-machine.scrml`, `25-triage-board.scrml`). The default (live BS+TAB) pipeline compiles these clean. Root cause: `reset` is a scrml KEYWORD with a special AST node + codegen lowering; the native parser does not recognize it and emits a plain CallExpr with callee Identifier `reset`, which the type-system's scope-check then flags as an undefined identifier.

## The CORRECT fix (do NOT take the allowlist shortcut — it's the S139 trap)

There are two routes; ONE is correct, ONE is a silent-miscompile trap:

- **WRONG (do not do this):** add `reset` to `type-system.ts:4095 LOGIC_SCOPE_GLOBAL_ALLOWLIST`. This SUPPRESSES E-SCOPE-001 but native still emits `reset(@cell)` as a plain function CallExpr → codegen has no `reset-expr` node to lower → the emitted JS calls an undefined `reset(...)` (or no-ops) and the `_scrml_reset` runtime chunk is never pulled in. Compile passes, runtime is broken. This is the S139 "node --check clean ≠ correct" trap. **Forbidden.**
- **CORRECT:** the native parser must PRODUCE a `reset-expr` AST node for `reset(@cell)`, byte-for-byte the same node shape the live pipeline produces, so the EXISTING codegen (`emit-expr.ts:239` `case "reset-expr"` → `_scrml_reset(...)`) and the EXISTING downstream passes (usage-analyzer reset-chunk pull, B22 target validation) work unchanged.

## Verified loci (starting hypotheses — verify against current source per Rule 4)

**Live pipeline (the pattern to mirror):**
- `compiler/src/tokenizer.ts:78` — reserves `"cleanup", "upload", "reset"` as KEYWORD tokens (see the comment block lines 66-78 explaining the §6.8.2 reset reservation).
- `compiler/src/expression-parser.ts:1727` — `if (calleeName === "reset")` builds the `reset-expr` node. Three target shapes at lines ~1745 / ~1772 / ~1785 per §6.8.2 (bare cell `reset(@x)`, compound-nav `reset(@x.field)`, and the no-arg / error path). Read this block IN FULL — it is the canonical construction logic to mirror.
- `compiler/src/codegen/emit-expr.ts:239` — `case "reset-expr"` → `_scrml_reset(JSON.stringify(name))` (three shapes, lines ~252-285). This is the consumer that already works; your job is to feed it the right node from native.
- `compiler/src/codegen/usage-analyzer.ts:381-386` — `forEachResetExprInExprNode` pulls the `reset` runtime chunk when a `reset-expr` is present. If native produces a plain CallExpr, this chunk is NEVER pulled → runtime `_scrml_reset is not defined`.

**Native parser (where the fix goes):**
- `compiler/native-parser/translate-expr.js` (~50KB) — the native expr-translation that builds the FileAST ExprNode from native tokens. When it translates a call whose callee is the bare identifier `reset` (NOT a member call `obj.reset(...)`), it must emit a `reset-expr` node mirroring `expression-parser.ts:1727-1785` instead of a plain CallExpr. This is the primary fix site.
- `compiler/native-parser/token.js` (~11KB) / `compiler/native-parser/lex-in-code.js` — the native lexer keyword set. Determine whether `reset` needs to be a reserved keyword token at the lex layer (as live does at tokenizer.ts:78) for the translate layer to recognize it, OR whether translate-expr can pattern-match the bare-`reset`-callee on the already-produced call node. Pick whichever mirrors the live architecture most faithfully and is the smaller correct change. Native produces ZERO `reset-expr` nodes today (confirmed by grep).

## Scope

- **Primary:** `reset(@cell)` → `reset-expr` node, all three §6.8.2 target shapes (bare, compound-nav, no-arg/error). This is the confirmed bug (mario + triage-board).
- **Sweep the sibling keyword-builtins** reserved alongside `reset` at `tokenizer.ts:78` — `cleanup`, `upload`. Check whether the native parser also mishandles them (do they produce special AST nodes in the live pipeline like `reset` does, or are they ordinary?). If they produce special nodes and native mishandles them → fix the same way. If they're ordinary identifiers/globals → out of scope for B1 (note it, don't fix). Do NOT blanket-allowlist.
- **Out of scope:** `transition` (§14.12 compile-time no-op — correctly belongs in the allowlist, leave it), `broadcast`/`disconnect` (real channel globals — plain CallExpr is correct), `req` (validator predicate, different context), the §51.0.S message-arm parser (that is B2, a separate L-sized dispatch). The §4.18 bare-display-text enforcement is a RULED-deferred corpus migration (NOT a code fix) — out of scope.

## MANDATORY VERIFICATION (R26 — the correctness gate; "tests pass" is NOT sufficient)

Per the S138 R26 doctrine + the S139 "node-check-clean ≠ correct" rule, you MUST empirically verify the EMITTED JS is correct, not just that E-SCOPE-001 stopped firing:

1. Compile the real reproducers under native: `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile examples/14-mario-state-machine.scrml --output-dir /tmp/b1-mario --parser=scrml-native` and same for `samples/compilation-tests/25-triage-board.scrml` (use absolute worktree paths).
2. Confirm E-SCOPE-001 is GONE.
3. **Confirm the emitted JS contains `_scrml_reset(...)` for each `reset(@cell)` site** (grep the output) — NOT a bare `reset(...)` call. This is the load-bearing check that distinguishes the correct fix from the allowlist trap.
4. `node --check` the emitted JS (exit 0).
5. **Byte/semantic-compare native-emitted vs default-emitted** for the reset call site: compile the same file WITHOUT `--parser=scrml-native` and diff the `_scrml_reset` emission — they should be identical (or semantically equivalent).
6. Add a unit/conformance test asserting native produces a `reset-expr` node (or that native+default emit identical `_scrml_reset` output) for `reset(@cell)`. A behavior fix WITHOUT a test is the S140/S152 blind-spot trap.
7. Run the relevant test subset to confirm 0 regressions on the default pipeline.

DO NOT mark DONE without the R26 emitted-JS verification passing (steps 3-5).

## MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~170 lines). The §"Task-Shape Routing → parser / grammar fix (native-parser)" entry routes you; the "Native-Parser File Table (S162)" in `structure.map.md` names the native files + sizes.

Map currency: maps reflect HEAD `dace3f5b` as of 2026-06-04. They were just refreshed this session with the S162 native-parser arc + the native-parser-swap orientation. If your work touches files modified after that point, treat map content as a starting hypothesis to verify via grep/Read.

Feedback: in your final report, include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing."

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (isolation: worktree)

Your worktree path is assigned by the harness. Capture it as WORKTREE_ROOT.

### Startup (BEFORE any other tool call)
1. `pwd` via Bash. It MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. **S112 merge-startup:** your worktree base is the session-start commit, which may be behind current main. Run `git -C "$WORKTREE_ROOT" merge --ff-only main 2>/dev/null || git -C "$WORKTREE_ROOT" merge main` to bring the worktree up to current main (`dace3f5b` or later) BEFORE surveying — otherwise you survey stale source. Confirm clean tree after.
4. `bun install` (worktrees don't inherit node_modules; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
5. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser-test fixtures; gitignored, empty in fresh worktrees).
6. Baseline: confirm the relevant test subset is green before you start.

If ANY check fails: STOP and report.

### Path discipline (S99/S126 — every edit)
- **Edit via Bash on worktree-ABSOLUTE paths that include the `.claude/worktrees/agent-<id>/` segment** (`perl`/`python`/`cp`/heredoc), NOT the Edit/Write tools. Echo the target path before each write; re-verify via `git -C "$WORKTREE_ROOT" diff` / grep after. The S100 path-discipline hook will REJECT Edit/Write calls that resolve into MAIN; Bash-on-absolute-worktree-paths sidesteps the divergence by construction.
- **NEVER `cd` into the main repo** (or anywhere) — use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd <main>` leaks installs/edits/compiles into main (S126 incidents #14/#15).
- Never write to a path starting with the main repo root directly.

## COMMIT DISCIPLINE + CRASH RECOVERY
- Commit after EACH meaningful change (don't batch). `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit immediately. WIP commits expected.
- Your FIRST commit message MUST include the verbatim `pwd` output (S99 echo-pwd discipline): e.g. `WIP(b1): start at <pwd>`.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
- Update `docs/changes/native-reset-builtin-b1-2026-06-04/progress.md` (in your worktree) after each step — append-only, timestamped. If you crash, your commits + progress.md are how the next agent picks up.
- Code change + its coupled test = ONE commit (don't split — that creates a transiently-red window).

## FINAL REPORT
Report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, the fix route you took (and why allowlist was NOT it), the R26 emitted-JS verification results (steps 3-5 above with the actual grep output showing `_scrml_reset`), test deltas, the `cleanup`/`upload` sweep disposition, deferred items, and the maps-feedback line.
