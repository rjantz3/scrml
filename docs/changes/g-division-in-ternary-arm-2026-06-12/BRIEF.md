DISPATCH BRIEF — g-division-in-ternary-arm (MED): `/` division inside a ternary arm → E-CODEGEN-INVALID-JS (scrml-js-codegen-engineer, isolation:worktree, opus)

# TASK
Fix `g-division-in-ternary-arm` (MED, `docs/known-gaps.md`). A `/` division operator inside EITHER arm of a ternary — `@e > 0 ? @h / @e : @h` — emits invalid JS (`E-CODEGEN-INVALID-JS`, "compiler defect, please report"). The divide-with-guard idiom `cond ? a/b : fallback` (guard divide-by-zero — a textbook pattern) breaks everywhere it is idiomatically written.

# SYMPTOM + EMPIRICAL ROOT (PA-verified S188 — read before diagnosing)
- Compile `const <ratio> = @e > 0 ? @h / @e : @h` (derived cell) → the malformed emit is:
  `... 0 ? _scrml_reactive_get("h") /); _scrml_derived_subscribe(...` — i.e. the expression **TRUNCATES AT THE `/`**: `@h` lowered correctly to `_scrml_reactive_get("h")`, then a bare `/` leaks, then the derived wrapper closes (`/);`), and the `@e : @h` AFTER the `/` is DROPPED. Parse error at the `/)`.
- **ROOT IS NOT the `/`-vs-regex fence `code-segments.ts` (verified S188, do NOT chase it):** `regexAllowedAfter("@e > 0 ? @h")` correctly returns `false` (last char `h` = operand → division). The shared fence classifies the `/` as division correctly. The truncation is DOWNSTREAM in the expression-extraction / emission path — likely a `/`-sensitive scan (a `//`-comment check mis-firing on a single `/`, a closer/`/>`-detection, or a string-based expression-boundary scan) somewhere in the derived-cell / interpolation / logic-const emission. **Phase 0 MUST pin the exact locus empirically before fixing — my hypothesis-naming above is the symptom, not a confirmed locus.**

# ISOLATION (PA-verified — the fix must preserve all CLEAN cases)
| Case | Current | Want |
|---|---|---|
| `@e > 0 ? @h / @e : @h` (`/` in CONSEQUENT arm) — derived/interp/const | **FAIL** | clean, correct division |
| `@e == 0 ? @h : @h / @e` (`/` in ALTERNATIVE arm) | **FAIL** | clean |
| `@h / @e` standalone (no ternary) | clean | stays clean |
| `@e > 0 ? 1 : 2` / `@e>0 ? "a":"b"` (ternary, literal arms) | clean | stays clean |
| `@a > 0 ? @a * 2 : @a` (`*` in ternary arm — no regex ambiguity) | clean | stays clean |
| regex `@names.filter(n => /not found/i.test(n))` (GITI-017 guard) | clean | **MUST stay clean — do NOT regress regex handling** |

Broad across positions — FAILS in: a DERIVED cell (`const <ratio> = …`), a markup interpolation (`${ … }`), AND a local `const x = …` in a `${}` block. The fix must close all three.

# PHASE 0 — DIAGNOSE (mandatory, empirical; my locus is a hypothesis only)
Pin where the `/` in a ternary arm truncates the expression. Trace the derived-cell RHS / interpolation expression from source → emitted JS; find the `/`-sensitive boundary (single-`/`-as-comment misfire? closer-detection? string-scan boundary?). Confirm it is NOT code-segments.ts (already ruled out). Report the exact locus + mechanism BEFORE implementing.

# FIX (Phase 1 — after diagnosis)
Handle a `/` division correctly in ternary-arm context across ALL emission paths (derived / interpolation / logic-const), WITHOUT regressing regex-literal handling (the GITI-017 `/not found/i` fence) or any clean case above. The `/` whose preceding token is an operand (`@e`, `)`, `]`, identifier, literal, `.prop`) is DIVISION — the same operand-precedes-`/` rule that already works outside ternaries.

# TESTS (Phase 2)
Add a unit test (`compiler/tests/unit/division-in-ternary-arm.test.js` or fold into an existing expr-codegen test): `/` in a ternary CONSEQUENT and ALTERNATIVE arm compiles + emits correct division JS, in derived-cell / interpolation / logic-const positions; regression-guard the regex case (`/not found/i` in a `.filter` survives verbatim). Keep all existing tests green.

# GAP (Phase 3)
known-gaps.md: flip `g-division-in-ternary-arm` `status=open` → `status=resolved`; **CORRECT the gap body** — the current body's "`code-segments.ts` / `rewriteCodeSegments` mis-classifies the arm-position `/` as a regex-literal start" hypothesis is WRONG (verified S188); replace with the diagnosed real root + locus. Do NOT touch the other gaps.

# Phase 4 — R26 EMPIRICAL (mandatory)
Compile via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile`: all the FAIL-cases above now compile 0-error + emit correct division (`node --check` clean); all the CLEAN-cases stay clean; the regex `/not found/i` case still works (grep the emitted JS — the regex body is verbatim, NOT corrupted). Report per-case results. DO NOT mark DONE without this.

# DO NOT
- Touch `code-segments.ts` `regexAllowedAfter` unless Phase-0 PROVES (against my finding) it is the root — it is verified-correct for `@h /`.
- Regress regex-literal handling (GITI-017 / 6nz-s fences).
- Touch `compiler/native-parser/` (separate; not this fix).
- Touch the other dog-food gaps.

# STARTUP + PATH DISCIPLINE (worktree)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` — else STOP (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean; `git merge main` (base MUST contain `5a4a132b`); `bun install`; `bun run pretest`.
3. Edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment; NOT Edit/Write (S126). Never `cd` into main; use `git -C "$WORKTREE_ROOT"` + worktree-absolute paths. First commit msg includes verbatim `pwd`.
4. Read `.claude/maps/primary.map.md` first (maps reflect HEAD ~5a4a132b / 2026-06-12).

# COMMIT DISCIPLINE
Commit incrementally per phase (crash-recovery); update `docs/changes/g-division-in-ternary-arm-2026-06-12/progress.md` (append-only). ONE coupled change (fix + test + gap-flip). No `--no-verify`. `git status` clean before DONE; run full `bun run test` (zero new fails).

# FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · the diagnosed root locus + mechanism (Phase 0) · per-case R26 results (the FAIL→clean cases + the CLEAN-stays-clean + regex-survives) · full-suite pass/fail/skip · maps feedback. If my symptom/ruled-out finding proved wrong on the worktree, say so explicitly.
