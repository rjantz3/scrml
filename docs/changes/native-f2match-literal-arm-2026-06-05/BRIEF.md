NATIVE-PARSER PARITY FIX — F2-match literal-arm patterns (change-id: native-f2match-literal-arm-2026-06-05)

# Context
The scrml compiler has two front-ends: legacy default (block-splitter "BS" + Acorn + TAB) and the scrml-native parser (`compiler/native-parser/` + `compiler/src/native-walker/`), selected via `--parser=scrml-native`. We are closing native↔default parity, family by family, toward an eventual default-flip. A "flip-failure" = a fixture clean on default but failing/miscompiling on native.

This dispatch closes the **F2-match family**: value-return / JS-style `match EXPR { ... }` blocks with **string-literal** (and boolean-literal) arm patterns fail under the native parser. A PA-run read-only Phase-0 survey already ran and returned **PROCEED (single-root)** — the survey-STOP gate is CLEARED. The loci below are survey-VERIFIED on current HEAD c02e2860 (not triage hypotheses). SPEC §18.16 (SPEC.md:11772-11859) normatively defines `literal-arm-pattern ::= string-literal | number-literal | boolean-literal` — native is the enforcer that drifted from spec; bringing it to parity is Rule-4 clean.

# MAPS — REQUIRED FIRST READ
Before other context, read `.claude/maps/primary.map.md` in full (~100 lines); follow its Task-Shape Routing for "compiler-source bug fix" / native-parser.
Map currency: maps reflect HEAD f11db672 (2026-06-05T02:08Z). HEAD is now c02e2860 — **11 native-parser commits ahead of the map**. The survey below supersedes the map for THIS fix's loci; treat any map claim about the native match/parse path as a starting hypothesis to verify against current source.
Feedback: in your final report, include "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Your worktree is assigned by the harness. S99 has had repeated path-discipline leaks; this would be the next incident if you leak — do not.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any other repo (e.g. scrml-support), STOP and report (S90 CWD-routing failure). Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git merge --ff-only main` (S112 — the worktree branches from origin/main; pull in the latest local landings; this should fast-forward cleanly since origin==local HEAD c02e2860). If it does NOT fast-forward, STOP and report.
4. `git status --short` — confirm clean.
5. `bun install` — worktrees do NOT inherit node_modules; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise.
6. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; empty in fresh worktrees → ~130 ECONNREFUSED browser-test failures without it). Use `bun run test` (chains pretest), NOT `bun test` directly, for baseline.
If ANY check fails: STOP, report, do not proceed.

## Path discipline (EVERY edit)
- Apply ALL file edits via **Bash** (`perl`/`python`/heredoc/`cp`) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment**, NOT the Edit/Write tools (S126 interim mitigation — Edit/Write have leaked to MAIN). Echo the target path before each write; re-verify with `git diff`/`grep` after.
- NEVER `cd` into the main repo (or anywhere) from the worktree — use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively (S126 — `cd` leaks bun installs + compile/run target resolution to MAIN).
- Read from WORKTREE_ROOT (main may be ahead with parallel work).

# THE FIX (survey-verified — single-root, 3 small edits, ZERO codegen/walker work)

**Root:** `compiler/native-parser/parse-expr.js : parseMatchArmPattern` (lines ~3136-3235) dispatches on the first token kind with branches ONLY for `KwElse`/`_` (wildcard), `KwIs` (is-pattern), bare-variant, `Dot+Ident`, `DoubleColon`, `Ident` (qualified variant). A `StringLit` / `KwTrue` / `KwFalse` token matches no branch → falls to the catch-all at ~3233 (`recordError(ctx, "E-EXPR-MATCH-PATTERN", ...); return null`) → parser loses sync → cascade. One shared path (`parseMatchArmPattern` ← `parseMatchArm` ~2698 ← `parseMatchExpr` ~2661) covers BOTH statement- and expression-position match. All arrow forms (`=>`/`:>`/`->`) are already handled — the arrow is NOT the problem.

**The downstream bridge needs no codegen work:** `translate-expr.js : translateMatch` (~998) emits a live `match-expr` carrying `rawArms: string[]` (reconstructed SOURCE TEXT) which the live emitter (`emit-control-flow.ts : parseMatchArm` ~971) re-parses and lowers. The live `parseMatchArm` ALREADY handles string-literal arms (Forms 3/4/8/9 at emit-control-flow.ts:1008-1048, `kind:"string"`) and boolean arms. So you only need the native parser to RECOGNIZE the literal pattern and the bridge to RE-SERIALIZE it back to source text.

**The 3 edits (verify each line/function against current source first — the survey gave approximate line numbers):**
1. `compiler/native-parser/ast-expr.js` — add a `MatchArmPatternKind.Literal` enum value (alongside the existing `Variant`/`Wildcard`/`Is` at ~125) + a `makeLiteralPattern(...)` factory (alongside the existing factories ~355-375). Carry whatever the literal needs to re-serialize (e.g. the literal kind + raw/value text).
2. `compiler/native-parser/parse-expr.js : parseMatchArmPattern` — add branches for `StringLit`, `KwTrue`, `KwFalse` BEFORE the catch-all at ~3233 that build a literal-pattern node via `makeLiteralPattern`. Token kinds (`TokenKind.StringLit`/`KwTrue`/`KwFalse`) and factories (`makeStringLit`/`makeBoolLit`) are already imported at parse-expr.js:52.
3. `compiler/native-parser/translate-expr.js : reconstructArmPattern` (~1030-1064) — add a `Literal` case that serializes the literal pattern back to its source text (string → `"..."` with quotes; boolean → `true`/`false`), so the live emitter's re-parse sees the original arm.

**OUT OF SCOPE — DO NOT implement number-literal arms.** Number-literal match arms (`match x { 1 => ... }`) fail on the DEFAULT path TOO (no number form in live `parseMatchArm` → E-CODEGEN-INVALID-JS). They are a separate dual-front-end SPEC §18.16 backlog item, NOT a native-parity flip-failure, and none of the 4 affected fixtures use them. Including them would require a live-side codegen addition and is gold-plating. String + boolean only.

# THE 4 AFFECTED FIXTURES (all string-literal; the parity targets)
- samples/compilation-tests/control-013-switch.scrml  (`"Monday" =>` expr-position)
- samples/compilation-tests/gauntlet-s19-phase3-operators/phase3-match-literal-arm-101.scrml  (`"admin" ->` stmt-position)
- samples/compilation-tests/gauntlet-s19-phase3-operators/phase3-match-literal-no-wildcard-102.scrml  (`"admin" ->` stmt-position)
- samples/compilation-tests/gauntlet-s20-meta/meta-match-in-meta-001.scrml  (`"Circle" =>` inside `^{}` meta)

# COMMIT DISCIPLINE
- After EACH meaningful edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`; commit IMMEDIATELY. Don't batch. WIP commits expected.
- The FIRST commit message MUST include the verbatim `pwd` output from startup, e.g. `WIP(f2match): start at <pwd>` (S99 leak-detection aid).
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status --short` MUST be clean. "work in worktree, no commits" is NOT an acceptable terminal report.
- **NEVER use `--no-verify`.** The pre-commit hook (`bun test {unit,integration,conformance}`) is the gate; if it fails, fix the cause, do not bypass.
- Update `docs/changes/native-f2match-literal-arm-2026-06-05/progress.md` after each step (append-only, timestamped: what was done / what's next / blockers).

# PHASE 3 — R26 EMPIRICAL VERIFICATION (MANDATORY before reporting DONE)
Regression tests alone do NOT close this. Empirically verify native==default on the 4 real fixtures at your post-fix baseline:
```
for f in \
  samples/compilation-tests/control-013-switch.scrml \
  samples/compilation-tests/gauntlet-s19-phase3-operators/phase3-match-literal-arm-101.scrml \
  samples/compilation-tests/gauntlet-s19-phase3-operators/phase3-match-literal-no-wildcard-102.scrml \
  samples/compilation-tests/gauntlet-s20-meta/meta-match-in-meta-001.scrml ; do
  bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$f" --output-dir /tmp/f2m-d/$(basename "$f") > /tmp/f2m-d.log 2>&1; dflt=$?
  bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$f" --parser=scrml-native --output-dir /tmp/f2m-n/$(basename "$f") > /tmp/f2m-n.log 2>&1; nat=$?
  echo "$f: default=$dflt native=$nat"
  # native must now exit 0; emitted JS should match default byte-for-byte (or be functionally identical); node --check the native output
done
```
Required outcome: every fixture native exit 0; emitted JS byte-identical (or, if a benign SPAN-COORD/ordering diff, explicitly characterize it); `node --check` exit 0 on the native-emitted JS. DO NOT mark DONE without Phase-3 R26 passing.

Also add/extend a unit test for the new native literal-arm recognition (conformance-style if a native-parser conformance suite exists; otherwise a parse-level unit test). Run the FULL suite (`bun run test`) and report pass/skip/fail — 0 regressions required.

# FINAL REPORT (return as your final message — this is data for the PA, not a human-facing summary)
- WORKTREE_PATH (your pwd) + FINAL_SHA (your branch tip)
- FILES_TOUCHED (exact paths)
- The 3-edit diff summary (what changed in each of ast-expr.js / parse-expr.js / translate-expr.js)
- Phase-3 R26 table: per-fixture default/native exit codes + byte-identical? + node --check
- Full-suite test delta (pass/skip/fail before vs after)
- Maps feedback line
- Any deferred/out-of-scope items hit (esp. if number-literal or any other shape surfaced)
- Confirm `git status` clean + first-commit-pwd-echo done
