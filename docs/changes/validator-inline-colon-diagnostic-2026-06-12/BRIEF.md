# DISPATCH BRIEF — clear diagnostic for the validator inline-message COLON form

change-id: `validator-inline-colon-diagnostic-2026-06-12`
gap: `g-validator-inline-msg-colon-form` (MED) — the OPEN compiler half (doc migration already landed S185 `37abb1d2`).

A cell declared with the COLON-form inline-message override — `<name req:"…msg…">` — silently CORRUPTS the
cell's `@`-access registration; every later `@cell` / `@parent.field` ref then fires a MISLEADING
`E-SCOPE-001` ("Undeclared identifier `@cell` … did you mean `@@cell`?"), pointing at the cell rather than
the malformed validator. Your job: emit a CLEAR, EARLY diagnostic at the decl, AND recover so the
misleading `E-SCOPE-001` cascade does NOT fire.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow its Task-Shape Routing for a compiler-source bug fix
(error.map / structure / test). Map currency: watermark `7fe7044f`; HEAD is `37abb1d2` — **`ast-builder.js`
was modified at `37abb1d2`** (the errarm `_parseFailExprString` addition), so treat map content for
ast-builder as a starting hypothesis and verify against live source via grep/Read. Report maps load-bearing
or not in your final report.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 leak history — hold the line)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP
   (S90 CWD-routing). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean.
4. `git merge main` (or confirm base at/after `37abb1d2`). 5. `bun install`. 6. `bun run pretest`.
7. Baseline `bun run test` subset green.
- Edits ONLY to worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment. NEVER the
  bare main root. Prefer Bash edits (perl/python3/heredoc) on worktree-absolute paths, echo the path before
  + `git diff`/`grep` after. NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"` + `bun --cwd`.
- First commit message embeds your startup `pwd`: `WIP(validator-colon): start at $(pwd)`.

# CRASH RECOVERY
Commit per sub-part (don't batch). Update `docs/changes/validator-inline-colon-diagnostic-2026-06-12/progress.md`
each step. `git status` clean before DONE.

# THE TASK

**The bug (verified S185, HEAD `37abb1d2`).** The §55.10-NORMATIVE inline-message override is the PAREN form
— a trailing string-literal ARG inside the validator parens: `<name req("…") length(>=2, "…")>` (SPEC
§55.10 body + §34 `E-VALIDATOR-INLINE-DYNAMIC`). The colon form `req:"…"` is NOT valid scrml (user-ruled
S185 paren-canonical). The `:`-after-validator inside the decl opener is mis-consumed (likely by the
`collectTypeAnnotation` / typed-annotation path in `scanStructuralDeclLookahead`, `ast-builder.js`),
corrupting the state-decl so it never registers for `@`-access → the misleading `E-SCOPE-001` cascade.
NOT compound-specific (top-level cells break too); the field render-by-tag `<name/>` still resolves.

**Fix goal.** Detect the colon-form inline override at decl-scan time and emit a NEW clear diagnostic
**`E-VALIDATOR-INLINE-COLON`** (Error) — message names the paren form as the fix (e.g. *"inline message
override uses the paren form `req(\"…\")`, not the colon form `req:\"…\"` (§55.10). Move the message inside
the validator's parens."*). **AND recover so the cell still registers** — so the adopter sees ONE clear
error at the decl, NOT the cell + a misleading downstream `E-SCOPE-001` ("undeclared `@cell`"). You choose
the cleanest recovery in Phase 0: parse the colon-message as if it were the paren-arg override (register
the cell with the inline override), OR drop the message and register the cell with the bare validator.
Either is fine as long as the cell registers + the misleading E-SCOPE-001 does not cascade.

**Locus hint (STARTING HYPOTHESIS — survey + correct per depth-of-survey-discount, PRIMER §12).**
`scanStructuralDeclLookahead()` (`ast-builder.js` ~3180/4441) scans the decl opener (name + validators +
the `>:` typed-annotation). `collectTypeAnnotation` (~4593) "consumes `:` + balanced type expression."
The validator catalog is `compiler/src/validator-catalog.ts` (`UNIVERSAL_CORE_PREDICATES` — the 14 names).
The misleading downstream fire is the `@`-access path in `type-system.ts` (~6165 `checkLogicExprIdents` /
the `@name` resolution PASS).

**Detection — the distinguisher (load-bearing; do NOT regress legit `:`):**
- COLON-FORM (fire): a `:` followed by a string literal **INSIDE the opener** (before the `>`), immediately
  after a **known validator name** (per `validator-catalog.ts`). Shape `<name req:"…">`, `<name length(>=2):"…">`.
- LEGIT typed-cell annotation (MUST NOT fire): `<name>: Type` — the `:` is **AFTER the `>`** (the `>:` shape
  the existing typed-annotation path handles). control-b below is exactly this — it MUST stay clean.
- LEGIT paren form (MUST NOT fire): `<name req("…")>` — no inside-opener `:`. control-a MUST stay clean.

# SPEC
Add a **`E-VALIDATOR-INLINE-COLON`** row to SPEC §34 (Error; cross-ref §55.10 / §41.12; "the colon-form
inline message override `req:\"…\"` is not valid scrml — use the paren form `req(\"…\")`"). The doc sites
(SPEC §41.12, PRIMER §8) already warn the colon form is invalid (landed S185) — you add the §34 catalog row
+ wire the fire. No §55.10 body change needed (already paren-normative). Regenerate the SPEC-INDEX footer
line-count if SPEC.md grew (`bun scripts/regen-spec-index.ts` if §34 row shifts ranges — or note it for PA).

# COMMIT DISCIPLINE (S83) — code + coupled test in ONE commit; `git status` clean before DONE; report
FINAL_SHA + FILES_TOUCHED (worktree-absolute) + WORKTREE_PATH.

# PHASE 3 — R26 EMPIRICAL VERIFICATION (mandatory)
Reproducers at `docs/changes/validator-inline-colon-diagnostic-2026-06-12/repro/`:
```
for f in repro-1-toplevel-colon repro-2-compound-colon; do
  bun compiler/bin/scrml.js compile docs/changes/validator-inline-colon-diagnostic-2026-06-12/repro/$f.scrml --output-dir /tmp/r26-colon/$f > /tmp/r26-colon/$f.log 2>&1
  echo "$f: E-VALIDATOR-INLINE-COLON=$(grep -c E-VALIDATOR-INLINE-COLON /tmp/r26-colon/$f.log) E-SCOPE-001=$(grep -c E-SCOPE-001 /tmp/r26-colon/$f.log)"
done
for f in control-a-paren-form-WORKS control-b-typed-cell-colon-WORKS; do
  bun compiler/bin/scrml.js compile docs/changes/validator-inline-colon-diagnostic-2026-06-12/repro/$f.scrml --output-dir /tmp/r26-colon/$f > /tmp/r26-colon/$f.log 2>&1
  echo "$f: COLON=$(grep -c E-VALIDATOR-INLINE-COLON /tmp/r26-colon/$f.log) SCOPE=$(grep -c E-SCOPE-001 /tmp/r26-colon/$f.log) (both must be 0)"
done
```
PASS: repro-1/2 → `E-VALIDATOR-INLINE-COLON >= 1` AND `E-SCOPE-001 = 0` (no misleading cascade). control-a
+ control-b → 0 / 0 (no false fire on the paren form or the legit typed-cell `:` decl). **DO NOT mark DONE
without R26 passing.**

# TESTS
New unit tests: colon-form fires E-VALIDATOR-INLINE-COLON + cell registers (no E-SCOPE-001); paren form
clean; typed-cell `<name>: Type` clean; compound + top-level both covered. Mirror
`compiler/tests/unit/c10-error-message-resolution.test.js` / validator test shapes. Pre-commit subset
green, 0 new fails (`bun run test`).

# FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · Phase-0 survey (locus confirmed vs corrected; recovery choice) ·
R26 table (2 repros + 2 controls) · test delta · SPEC §34 + SPEC-INDEX note · maps feedback.
