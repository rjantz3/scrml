# DISPATCH BRIEF — re-`fail` from a handler/match arm (typer scope-check + codegen lowering)

change-id: `errarm-refail-lowering-2026-06-11`
gap: `g-errarm-fail-and-parsevariant-handler` (MED)

You are fixing a TWO-LAYER compiler bug: re-`fail` from a `!{}` / `match` arm is canonical scrml (SPEC
§19.5.2 / §41.13 / §19.3) but (Layer 1) fires a spurious `E-SCOPE-001` from a `!{}` arm body and (Layer 2)
emits invalid JS (`E-CODEGEN-INVALID-JS`) from a `:> fail` value-arm and the `?` propagation desugaring.

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). The
§"Task-Shape Routing" section tells you which additional maps to consult for a compiler-source bug fix
(error.map, structure, test). Follow that routing.

Map currency: maps reflect HEAD `7fe7044f` as of `2026-06-11`. Current HEAD is `a250348a` — exactly ONE
commit ahead, and that commit is the S184 wrap (doc/maps/state-only, NO source drift). The maps are
CURRENT for compiler source. Treat map content as a starting hypothesis; verify against live source via
grep/Read for anything you edit.

In your final report include either:
- "Maps consulted: [list]; load-bearing finding: <one sentence>", or
- "Maps consulted but not load-bearing — [which you expected to help but didn't]".
The second answer is fine and valuable.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

S99 has had path-discipline leaks where agent edits landed in MAIN instead of the worktree. This would be
the next incident if you slip. Hold the line.

## Startup verification (do this BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If it is under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the
   S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `git merge main` (or confirm your base is at/after `a250348a`) — your worktree base may be the
   session-start commit; ensure you build on `a250348a` which carries the Gaps-1+2 landing `7fe7044f`
   (the `case "match-block"` typer path + emit-match.ts companion you will extend).
5. `bun install` (worktrees do NOT inherit node_modules; the pre-commit `bun test` fails without it).
6. `bun run pretest` (populates `samples/compilation-tests/dist/`; full `bun test` needs it).
7. Baseline: `bun run test` subset green before you start (or note the pre-existing baseline).

## Path discipline (EVERY edit)
- Write/Edit ONLY to ABSOLUTE paths under WORKTREE_ROOT that include the `.claude/worktrees/agent-<id>/`
  segment. NEVER write to a path starting with the bare main repo root
  (`/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/...`) — that leaks into MAIN.
- S126 interim mitigation: apply edits via Bash (`perl`/`python3`/`cp`/heredoc) on worktree-absolute
  paths, echoing the target path before each write and re-verifying via `git diff`/`grep` after — Bash
  writes go where `pwd`/`git` resolve, sidestepping the Edit/Write-tool MAIN-divergence class. (The
  Edit/Write tools are also acceptable IF every path is the full worktree-absolute path; Bash-edit is the
  safer default.)
- NEVER `cd` into the main repo (or anywhere outside WORKTREE_ROOT). Use `git -C "$WORKTREE_ROOT"`,
  `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths. A `cd` into main leaks installs + compiles
  (S126 incident #14/#15).
- Your FIRST commit message MUST embed your startup `pwd`: `WIP(errarm-refail): start at $(pwd)`.

# CRASH RECOVERY (global directive)
Commit after each meaningful change — don't batch. Update
`docs/changes/errarm-refail-lowering-2026-06-11/progress.md` after each step (append-only, timestamped:
what you just did / what's next / blockers). WIP commits are expected. Before reporting DONE, `git status`
MUST be clean (everything committed) — "work in worktree, no commits" is NOT an acceptable terminal report.

# THE TASK

**Read `docs/changes/errarm-refail-lowering-2026-06-11/SCOPE.md` in full first.** It carries the SPEC
cross-check verdict, the 2-layer empirical diagnosis, the working-path-to-mirror loci, and the 4
reproducers under `repro/`. This brief is the dispatch envelope; the SCOPE is the technical spec.

**Canonical (verified S185, Rule 4):** re-`fail` from a `!{}` / `match` arm IS canonical scrml — it is the
literal desugaring of the `?` operator (SPEC §19.5.2:12669) and is used by the §41.13 worked example.
`fail` ≡ `return ErrorType::Variant` (§19.3.2). **Invariant you MUST preserve (§19.3.3 NS-1):** `fail` is
valid ONLY inside a `!`-declared function body → re-`fail` from an arm whose enclosing function is non-`!`
MUST still fire `E-ERROR-001` (the existing statement-position gate at `type-system.ts:8085-8102`). The
route-to-state idiom (`load() !{ … @phase = .Error(msg) … }`, non-`!` function, no re-fail) MUST stay
valid — do not regress it.

## The fix (3 parts — confirm/correct the decomposition + loci in a Phase-0 survey)

Loci below are a STARTING HYPOTHESIS (line numbers post-date the Gaps-1+2 landing `7fe7044f`). You are
AUTHORIZED to correct touchpoints when the survey shows the real surface differs (depth-of-survey
discount — PRIMER §12; do NOT stick rigidly to a named file/line if survey says otherwise). Report what
you found vs. what this brief named.

**Working path to MIRROR (statement-position `fail`, which WORKS):**
- Parser: `parseFailStmt()` `ast-builder.js:4211` → `{ kind: "fail-expr", enumType, variant, args,
  argsExpr, span }`; reached at `ast-builder.js:5579`/`:9397` (statement contexts only). `fail` is a
  tokenizer KEYWORD (`tokenizer.ts:64`).
- Typer NS-1 gate: `type-system.ts:8085-8102` (`if (k === "fail-expr" && !canFail) … E-ERROR-001`).
- Codegen emitter: `emit-logic.ts:2618` (`case "fail-expr"` → `return { __scrml_error: true, type,
  variant, data };`, line 2651).

**Part 1 — recognition.** Make `fail` in arm contexts parse/resolve as a `fail-expr` (not a bare
call/ident). Arm contexts: `!{}` handler arm bodies (block form `{ fail … }`), `<match>` block-form arm
bodies, JS-style `match` value-arms (`:> fail …`). The shared root is that arm-body/arm-value parse paths
never reach `parseFailStmt` (or the arm re-parse never recognizes the keyword).

**Part 2 — typer.** Arm-body `fail-expr` nodes route through the NS-1 gate (`type-system.ts:8085-8102`),
NOT through `checkLogicExprIdents` (`type-system.ts:6165`, which mis-reads `fail` as an undeclared ident →
the spurious E-SCOPE-001). Legal when `canFail` (enclosing `!`); `E-ERROR-001` when non-`!`. The arm-body
scope walks to touch: the `!{}` handler arm path, the `<match>` block-form `case "match-block"` (added at
`7fe7044f`), and the JS-style `match-arm-block` path. The payload-binding scope (Gap-1/2 fix) is already
correct — do not disturb it; only `fail` recognition is missing.

**Part 3 — codegen.** Arm-position `fail` lowers via the `fail-expr` emitter (`emit-logic.ts:2618`) →
`return { __scrml_error: … }`. Covers: `!{}` arm bodies (statement `{ fail … }`), match value-arms
(`:> fail …`), and the `?` desugaring. Emission lives in `emit-match.ts` (block-form + JS-style match
arms) + the `!{}` error-handler arm-body emitter (cf. tests `error-handler-arm-body-emission.test.js`,
`nested-error-handler-no-invalid-js.test.js`). `node --check` clean on emitted JS.

## OUT OF SCOPE (do NOT bundle)
- The §41.13 SPEC doc fix — PA lands it AFTER your fix (the corrected four-variant example then compiles).
- (3) `:`-shorthand block-form match-arm interpolation literal-emit — separate pre-existing gap.
- §19.5.3 error-type compatibility (E-TYPE-001 on incompatible re-failed variant) is EXISTING behavior —
  don't rebuild it, just don't regress it.

# COMMIT DISCIPLINE (S83 two-sided)
- After EVERY edit: `git diff <file>` to verify; `git add`; commit IMMEDIATELY (per sub-part). Don't batch.
- Code + its coupled test land in ONE commit (no transiently-red window).
- Before DONE: `git status` clean. Report FINAL_SHA + FILES_TOUCHED + WORKTREE_PATH + deferred items.

# PHASE 3 — R26 EMPIRICAL VERIFICATION (MANDATORY — S138 doctrine; this is a codegen fix relying on AST)

Regression tests that synthesize AST will pass even if the real parser/typer path is still broken.
EMPIRICAL re-compilation of the reproducers on your post-fix baseline is REQUIRED before claiming DONE.

Run from WORKTREE_ROOT for each reproducer in `docs/changes/errarm-refail-lowering-2026-06-11/repro/`:
```
for f in repro-1-errarm-block-refail repro-2-match-arm-refail repro-3-propagation-rewrap; do
  bun compiler/bin/scrml.js compile docs/changes/errarm-refail-lowering-2026-06-11/repro/$f.scrml \
    --output-dir /tmp/r26-errarm/$f > /tmp/r26-errarm/$f.log 2>&1
  echo "$f: E-SCOPE-001=$(grep -c E-SCOPE-001 /tmp/r26-errarm/$f.log) E-CODEGEN=$(grep -c E-CODEGEN-INVALID-JS /tmp/r26-errarm/$f.log)"
  node --check /tmp/r26-errarm/$f/*.client.js && echo "  node --check OK"
done
```
PASS criteria: all three → `E-SCOPE-001=0`, `E-CODEGEN=0`, `node --check OK`.
Plus the control (`repro/control-stmt-fail-WORKS.scrml`) STILL compiles clean (no regression).
Plus a NEGATIVE check: re-`fail` from a `!{}` arm in a NON-`!` enclosing function STILL fires E-ERROR-001
(author a small reproducer for this; NS-1 must hold). And the route-to-state arm idiom
(`function load() { … !{ | ::X msg :> { @phase = .Error(msg) } } }`, non-`!`) STILL compiles clean.

**DO NOT mark DONE without empirical R26 verification passing.**

# TESTS
- New unit tests (typer recognition + NS-1 gate fire/no-fire) + codegen emission tests for all three
  positive shapes + the NS-1 negative. Mirror the existing `error-handler-arm-body-emission.test.js` /
  `multifield-failable-arm-binding.test.js` shapes.
- Pre-commit subset (unit+integration+conformance) green, 0 new fails. Run `bun run test` (chains pretest)
  for the broader gate before reporting.

# FINAL REPORT SHAPE
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · the Phase-0 survey result (loci confirmed
vs corrected) · R26 table (the 3 reproducers + control + NS-1 negative) · test count delta · maps feedback
(load-bearing or not) · any deferred items.
