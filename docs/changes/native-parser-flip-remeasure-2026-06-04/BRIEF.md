# DISPATCH BRIEF — Native-parser flip-harness RE-MEASURE (Charter B, M6.7 resume)

**change-id:** `native-parser-flip-remeasure-2026-06-04`
**agent:** scrml-js-codegen-engineer · isolation: worktree
**type:** MEASUREMENT ONLY — reversible, throwaway. **Nothing lands.** No fix, no SPEC, no commit-to-main.

> CONTEXT: the scrml-native parser (Charter B) front-end has been parked since S136 (25 sessions).
> Direction (a) ratified S161: drive toward the swap (flip `--parser=scrml-native` to default → delete
> BS+Acorn). The swap was ATTEMPTED + REVERTED once (`404fc619`, M6.7 STOP: 845 test failures). Seven
> fix-levers landed afterward WITHOUT a fresh re-measure, so the **current flip-failure count is
> UNKNOWN** (last measured 567 deterministic, S127). This dispatch re-measures it. Per the banked
> lesson (S128/S129: 5 consecutive wrong bucket-labels), NO fix unit can be scoped until this lands.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)

1. `pwd` via Bash. MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If under any other repo, STOP and report (S90 CWD-routing failure). Save as `$WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `$WORKTREE_ROOT`.
3. `git status --short` — confirm clean.
4. `git rev-parse HEAD` — note it. **The harness branches worktrees from session-start `9f01f6cd`
   (S112), NOT live HEAD.**
4b. **S112 FIX:** `git -C "$WORKTREE_ROOT" merge --ff-only main` — fast-forward to live main
   (`e3680a0d`) so the measurement reflects CURRENT code (incl. the S161 R28-8 fix). MUST ff cleanly;
   if not, STOP + report. Confirm: `git -C "$WORKTREE_ROOT" log --oneline -1` shows a `fix(s161)` or
   `docs(s161)` commit.
5. `bun install`.
6. `bun run pretest` (populates `samples/compilation-tests/dist/`).

## Path discipline
- All edits via Bash (`perl`/`python3`/`cp`/heredoc) on `$WORKTREE_ROOT`-absolute paths. NEVER `cd`
  into main; use `git -C "$WORKTREE_ROOT"` / `bun --cwd "$WORKTREE_ROOT"`. (The step-4b `merge main`
  references main read-only — that is the only allowed `main` reference.)
- This is a THROWAWAY worktree. You do NOT need to commit. Do NOT land anything to main. Do NOT clean
  up the worktree (PA discards it). Just measure + report.

(No maps read required — this is a measurement, not a code-shape task.)

---

# THE TASK — reproduce the flip-harness, re-measure, classify

## Step 1 — find the established flip-harness methodology
Read `scrml-support/docs/deep-dives/m6-joint-retirement-cutover-plan-2026-05-23.md` (the Phase-A /
Phase-B section, ~line 113) for the canonical flip-harness procedure + the S127 baseline (567
deterministic failures) + the A/B/C/D/E failure-bucket definitions. Also check for any flip-harness
SCRIPT under `compiler/native-parser/` / `scripts/` / `docs/changes/` (grep for `flip`, `remeasure`,
`useNativeParser`). **Reproduce the S127 methodology** so this number is COMPARABLE to the 567
baseline — do NOT invent a new measurement shape. If the methodology differs from what you reproduce,
state the difference explicitly.

## Step 2 — temp-flip the parser default (in YOUR worktree only)
The routing is in `compiler/src/api.js`: default param `parser = null` (line ~630) + `const
useNativeParser = parser === "scrml-native"` (~923) + the Stage confirmation (~2343). Flip the DEFAULT
so the native parser is the path WITHOUT requiring the CLI flag — i.e. make `parser` default to
`"scrml-native"` (or whatever the cutover-plan's Phase-A flip specifies — match the plan). Echo the
exact edit + `git -C "$WORKTREE_ROOT" diff compiler/src/api.js` to confirm it's the one-line flip.

## Step 3 — run the full compiler suite under native-default
`bun --cwd "$WORKTREE_ROOT" test compiler/tests/ 2>&1 | tee /tmp/flip-remeasure-$$.log` (the full
suite, NOT just the subset; this is the flip-failure measurement). Capture the total pass/fail count.
If a full run is impractically slow or hangs, fall back to the cutover-plan's specified harness scope
and SAY SO.

## Step 4 — classify EVERY failure
Parse the failure log. For each failing test, capture the FIRST error code / failure signature, the
file/fixture, and the suite. Group into root-cause buckets. Map to the known within-node classes from
the S161 reconciliation (which is the parked-state portfolio):
- **#2f each/match structural-promotion** (KIND-NAME class, 3,362 within-node fires; this is what
  broke Mario at the M6.7 STOP — flag SPECIFICALLY whether each/match-shape failures dominate).
- **MISSING-FIELD** (live FileAST carries fields native doesn't synthesize — the load-bearing
  correctness gap, 32,871 within-node).
- **SPAN-COORD** (span line/col drift — largely cosmetic, 37,980 within-node — flag separately so PA
  can decide tolerance policy).
- **D-class lever gaps** (param-type `(x: T)`, `^{}` host-fence, fn-shorthand, etc.).
- **EXTRA-FIELD / FIELD-SHAPE / other.**

## Report (RETURN as final message — do NOT write a file)
1. **Total flip-failure count** (pass/fail), and the delta vs the S127 baseline (567) — better/worse/unknown-methodology-diff.
2. **Failure histogram** by error-code / signature (top 15-20), each with file-count.
3. **Root-cause bucket breakdown** mapped to the classes above — with #2f each/match called out explicitly (does it still dominate, as at the STOP?).
4. **The single highest-leverage next FIX unit** (the bucket that, if closed, kills the most failures) — with the specific error code + a sample failing fixture + file paths to start from.
5. **SPAN-COORD share** — how much of the residual is pure span drift (informs PA's tolerance-policy design call).
6. **Methodology note** — exactly what you flipped + ran, so the number is reproducible + comparable.

Be precise. This number gates the entire resumed climb — accuracy over speed.
