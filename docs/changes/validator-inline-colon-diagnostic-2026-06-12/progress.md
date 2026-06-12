# progress — validator-inline-colon-diagnostic-2026-06-12

Gap: g-validator-inline-msg-colon-form (MED). Emit E-VALIDATOR-INLINE-COLON at the
decl for the colon-form inline-message override `<name req:"…">`, AND recover so the
misleading downstream E-SCOPE-001 cascade does not fire.

## 2026-06-12 — startup
- Worktree verified (pwd under .claude/worktrees/agent-, toplevel==pwd, clean, base 37abb1d2 == HEAD).
- bun install + pretest OK.
- Maps: read primary.map.md (compiler-source bug-fix routing).

## 2026-06-12 — Phase 0 survey
- Locus CONFIRMED: scanStructuralDeclLookahead (ast-builder.js:5048). The colon-form
  validator `req:"…"` reads `req` as a BAREWORD validator (next tok is `:` PUNCT not `(`),
  pushes it, then the loop hits `:` and falls to the final `return null` (line ~5532).
  The whole structural-decl scan declines → cell never registers for @-access → downstream
  @cell / @parent.field fires misleading E-SCOPE-001.
- validator-catalog.ts: isUniversalCorePredicate / UNIVERSAL_CORE_PREDICATES (14 names incl. multi-word `is some`).
- Repro CONFIRMED pre-fix: repro-1 (top-level) + repro-2 (compound) → E-SCOPE-001=1, COLON=0.
  control-a (paren form) + control-b (typed cell `<count>: number`) → clean (0/0, exit 0).

## next
- Import isUniversalCorePredicate into ast-builder.js.
- In the bareword-validator branch (or just before the final `return null`): if a known
  validator name is immediately followed by `:` STRING (inside the opener, before `>`),
  push E-VALIDATOR-INLINE-COLON + recover (treat the colon-message as the inline override
  arg so the cell still registers). Then continue the scan past the string.
- SPEC §34 row + SPEC-INDEX footer regen if ranges shift.
- Unit tests mirroring any-type-forbidden.test.js (compileScrml from source).

## 2026-06-12 — implementation DONE
- SPEC §34 catalog row + §55 summary row for E-VALIDATOR-INLINE-COLON (paren-canonical) — committed.
- ast-builder.js: imported isUniversalCorePredicate; added tryRecoverColonInlineMessage helper
  inside scanStructuralDeclLookahead; wired into BOTH validator push sites (call-form + bareword).
  Recovery choice: parse the colon-message AS the paren-arg override (JSON.stringify → trailing
  string-literal arg on the just-pushed validator). The cell registers WITH the override.
- New unit test compiler/tests/unit/validator-inline-colon.test.js (10 tests, cross-stream):
  positive (top-level / compound / call-form colon fires + recovers, message names paren form);
  negative (paren form, paren+trailing-string, typed-cell `<count>: number`, typed compound
  `<userInfo>: UserInfo`, bare validators — none false-fire). 10/10 pass.
- Existing validator suite (8 files, 315 tests) — 0 regressions.
- R26 POST-FIX: repro-1/2 → COLON=1 SCOPE=0; control-a/b → 0/0. PASS.
- Original dogfood reproducers (primer-verbatim, bisect-h, dispatch-form) → 1 COLON, 0 SCOPE each.

## next
- Pre-commit gate (full unit+integration+conformance) on the code+test commit.
- SPEC-INDEX footer line-count regen check (SPEC.md grew 2 rows).

## 2026-06-12 — DONE
- Pre-commit gate on the code+test commit (6abde77e): 16715 pass / 90 skip / 1 todo / 0 fail (911 files). 0 new fails.
- SPEC-INDEX regen committed (7186da37): Sections-table 34 rows updated (line-shift only) + footer 32,239→32,241.
- known-gaps.md: g-validator-inline-msg-colon-form status open→resolved + RESOLVED S185 note.
- All 4 commits clean; final status clean.
