# BRIEF — giti-024-server-split-braceless-continue-2026-05-30

> Archived verbatim per pa.md S136 addendum. Dispatched S145 (2026-05-30) via `scrml-dev-pipeline`, `isolation: "worktree"`, `model: opus`, background. Agent ID `ae9d4d4e7f0e8920a`. Dispatched from main HEAD `6e832615` (v0.7.0).

---

You are fixing a scrml COMPILER codegen bug (TypeScript source). Change-id: `giti-024-server-split-braceless-continue-2026-05-30`. This is a surgical, well-localized fix — keep scope tight.

# MAPS — REQUIRED FIRST READ
Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which additional maps to consult for a compiler-source codegen bug fix — follow that routing.
Map currency: maps reflect HEAD commit `9ab7aa38` as of 2026-05-29. **HEAD is now 30 commits ahead.** CRITICAL post-map landing you MUST factor in: commit `8e7f18fe` (S144 "A+B") threaded per-function context (boundary / channelOwnedCells / declaredNames) into the SAME server-split body emitter you are about to touch — `emit-control-flow.ts` (IfOpts), `emit-logic.ts`, `emit-server.ts`. Read `git show 8e7f18fe` to understand the current shape of that code before editing. Treat map content about these files as a starting hypothesis to verify against current source via grep/Read, NOT ground truth.
Feedback in your final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (read fully before any other tool call)

Your worktree path is assigned by the harness. S99 has had 20 path-discipline leaks across history; do NOT make this incident #21.

## Startup verification (do this BEFORE any other tool call)
1. Run `pwd`. Output MUST start with `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that's the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` — MUST equal WORKTREE_ROOT.
3. Run `git status --short` — confirm clean.
4. Run `bun install` (worktrees do NOT inherit node_modules; pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
5. Run `bun run pretest` (populates `samples/compilation-tests/dist/`; full `bun test` produces ~130 ECONNREFUSED failures otherwise). For baseline checks use `bun run test`, NOT `bun test` directly.
If ANY check fails: STOP, report, exit.

## Path + edit discipline (S126 interim mitigation — IN FORCE)
- **Apply ALL file edits via Bash** (`perl -i` / `python` / heredoc / `cp`) on WORKTREE-ABSOLUTE paths that include the `.claude/worktrees/agent-<id>/` segment. Do NOT use the Edit/Write tools (they have leaked to PRIMARY MAIN — incidents #12/#13). Echo the target path before each write; re-verify via `git diff` / `grep` after.
- **NEVER `cd` into the main repo (or anywhere outside WORKTREE_ROOT).** Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"` (or run bun from within WORKTREE_ROOT), and worktree-absolute paths exclusively. `cd` leaks (S90 cwd-routing class — incidents #14/#15) even for compile/run commands.
- For Read: paths under WORKTREE_ROOT are safe. Reading main via absolute path gives WRONG content (main may be ahead).

# THE BUG — GITI-024 (verified GENUINE on HEAD by PA)

In the **server-split body emitter**, a brace-less single-statement `if (cond) continue` whose following statement begins with an identifier is mis-emitted: the next statement's leading identifier is swallowed as a labeled-`continue` target, and the rest is orphaned → invalid JS. The `--validate-emit` gate (default-ON since v0.6.11) catches it as `E-CODEGEN-INVALID-JS`; it was silent-latent before the gate.

**Reproducer (committed at this worktree-relative path):** `handOffs/incoming/2026-05-30-1037-giti-to-scrmlTS-giti-024-server-split-braceless-continue.scrml`

**Minimal inline form (a real `server function`, no fs import — PA confirmed this hits the SAME defect):**
```
${
  export server function readLines(items) {
    const out = []
    for (const line of items) {
      if (line == "skip") continue
      out.push(line)
    }
    return out
  }
}
```

**Observed emit (`.server.js`):** `...legal_eq(line, "skip")) { continue out; } . push ( line );` — note the space-separated token stream: the boundary between `continue` and the next statement's leading identifier `out` is LOST, so JS reads `continue out` (labeled continue), the `;` lands after `out`, and `.push(line)` is orphaned. The PA-observed root: the server-split body re-serialization does not insert a statement boundary (`;`/newline) after a brace-less `continue`.

**Expected emit:** `... { continue; } out.push(line);` (or equivalent valid JS — a `;` after `continue`, then the next statement intact).

**Repro command (from WORKTREE_ROOT):**
```
bun run compiler/src/cli.js compile <sidecar-or-inline>.scrml -o /tmp/giti024-fix --mode library
```
With the gate ON it FAILS with `E-CODEGEN-INVALID-JS` citing `Unsyntactic continue`. Add `--no-validate-emit` to inspect the raw emit.

# SCOPE — PRIMARY DEFECT ONLY

1. Fix the statement-boundary loss in the server-split body emitter so a brace-less `continue` is terminated before the next statement.
2. **Generalize the fix** to the sibling brace-less single-statement bodies that share the same re-serialization path: `break`, `return`, and any single-statement `if`-body whose statement is followed by an identifier-led next statement. Verify each shape emits valid JS. (giti's lead, PA concurs — the boundary-detection gap is not unique to `continue`.)
3. **OUT OF SCOPE — do NOT touch:** the "spurious `.server.js` emitted for plain `export function`s that import scrml:fs" question (that's a separate design decision the PA is handling separately). Your fix targets the boundary-emission defect only, which is reachable by real `server function`s independent of that question.

Leads (verify, don't trust blindly): `compiler/src/codegen/emit-server.ts` (server-fn body re-serialization), `compiler/src/codegen/emit-control-flow.ts` (the for/if lowering A+B touched at `8e7f18fe`). The `statement boundary not detected` warning emits from `expression-parser.ts:2056` (ASI-merge guard) — that's a SYMPTOM surface, likely not your fix site; the fix is in the emitter that produces the space-separated token stream. Per the depth-of-survey-discount: you are AUTHORIZED to correct the touchpoint if the real fix site differs from these leads — grep + trace the emit, don't anchor on the named files.

# ACCEPTANCE (mandatory — R26 empirical, per pa.md S138 doctrine)

- The committed sidecar repro AND the inline `server function` form above BOTH compile **exit-0 with `--validate-emit` ON** (the default), and `node --check` PASSES on the emitted `.server.js`.
- No regressions: full `bun run test` green (same pass count as baseline you captured at startup, modulo +N for your new test). NB: 3 tests may flake under parallel load — `self-compilation.test.js` + `trucking-dispatch-smoke-integration.test.js` (two-compile-determinism). If one of those fails, re-run it in ISOLATION to confirm it passes alone (NOT a regression); do not bypass the gate over it. If a NON-flake test fails, that's a real regression — fix or report.
- **Write a regression test** (write-test-always rule): a new test under `compiler/tests/` (integration or codegen tier) that compiles the brace-less `continue`/`break`/`return`-followed-by-identifier shapes in a server-split body and asserts the emitted `.server.js` is valid (parse it / `node --check` it, or assert the boundary token is present). The test MUST FAIL on the pre-fix code and PASS after.

# COMMIT DISCIPLINE (S83 + S99 — two-sided rule)

- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify, then `git -C "$WORKTREE_ROOT" add <file>` + commit IMMEDIATELY. Don't batch.
- **Your FIRST commit message MUST include the verbatim `pwd` output from startup** (S99 discipline aid), e.g. `WIP(giti-024): start at <pwd-output>`. PA verifies on landing that it starts with the worktree prefix.
- **Do NOT use `--no-verify`** on any commit. If the pre-commit hook fails on an env race (pretest dist mid-rebuild), STOP and report — do not bypass.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean (no uncommitted changes). "work in worktree, no commits" is NOT an acceptable terminal state.

# FINAL REPORT must include
WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED (list) · the fix summary (what re-serialization site dropped the boundary + how you fixed it) · which brace-less shapes you verified (continue/break/return/if-body) · R26 acceptance results (both repros exit-0 gate-ON + node --check) · test count delta · maps feedback line · any deferred items.
