# Progress — tutorial-staleness-remediation-2026-06-12

Executes `docs/audits/tutorial-staleness-audit-2026-06-12.md` remediation items A1–E21.
DOCS-only (docs/tutorial.md + docs/tutorial-snippets/*). No compiler-source changes.

This change-id was completed across **two agent crashes + a PA-direct finish** (S186 session
crashed unexpectedly mid-dispatch; S187 recovery session salvaged and completed it).

## Phase 1 — predecessor agent `adef19e06cca3374b` (crashed mid-Group-B)
Branch `worktree-agent-adef19e06cca3374b`. Committed: Group A (A1–A4) snippet fixes
(`c4e5f734`) + Group B5/B6 prose migrations salvaged by PA after crash (`f87fc116`).
- A1 02b `<schema>` moved inside `<program>` (E-SCHEMA-003 cleared)
- A2 glossary `rule=(.A|.B)` parens; A3 dropped file-top `${...}` wrappers (03/04a/04b/05/06 + §3.3 inline)
- A4 `<engine>` placement aligned; B5 arm-arrows `=>`/`->` → `:>`; B6 §7 `not`-as-negation → `!`
- All 11 snippets PASS verify-tutorial.sh after Group A.

## Phase 2 — continuation agent `a867a96979f7c725d` (crashed mid-Group-B-tail)
Branch `worktree-agent-a867a96979f7c725d` (FF-merged Phase-1 work at startup, landed at `f87fc116`).
Committed B7+B8 (`16a80e21`) + B9/B10 salvaged by PA after crash (`2af72d6b`).
- B5/B6 completeness re-grep VERIFIED: 0 arm-context arrows, 0 negation-`not` sites remain
- B7 (HIGH) `scrml init` scaffold prose → `src/app.scrml` + `.gitignore`, `scrml dev src/app.scrml`
- B8 (HIGH) block-form `<match for=Type on=expr>` documented as SHIPPED (§4.2 Note + §5.6 prose)
- B9 `<onTransition>` directional `to=`/`from=` model; B10 `server function` → `function` (07 + §8)

## Phase 3 — PA-direct finish (S187, crash-proof) — B11–E21 + verification + landing
Two consecutive socket-crashes (environmental API instability, not task failure) → PA finished
the small mechanical remainder directly on main, compile-verifying each edit.
- B11 §6 auto-await prose → compiler-managed body-split/CPS (§19.9.3); E-PROG-004 corrected to
  compile **error** (§40.4), not Info-lint; §13.1 → §19.9.8 (D19)
- B12 `.get()` "single row or null" → "single row, or `not` if no rows match"
- B13 `is some`/`is not` framing reworded off runtime null/undefined
- C14 line-9 version → v0.7.0; C15 §5 "v0.3 surface"/glossary heading → v0.7.0; footer refreshed
- C16 SPEC line-count 26,000 → 32,000 (wc -l = 32,241); C17 verify-tutorial.sh header → v0.7.0
- D18 `E-SYNTAX-042` cross-ref §7 → §42
- E20 added `<each in=@coll as x key=x.id>` as canonical Tier-1 iteration (§1 list + §3.2 + glossary;
  compile-verified `<each in=@items as t key=t.id>` clean; kept `for`/`lift` as Tier-0)
- E21 added block-form `<match>` glossary entry

## Final verification (PA, on main)
- verify-tutorial.sh: **11 pass / 0 fail / 11 total**
- Residual-staleness re-grep: arm-arrows 0 · negation-`not` 0 · v0.2.6/v0.3.0-alpha/26,000/future-release 0 ·
  `<each` 6 (was 0). The 2 remaining `v0.3` hits are historical attribution (line-82 code comment + footer S93 note), not current-version claims.
- Verified-clean untouched: projection `=>` (Mario, 2) · fn-return `->` (5) · `if=`/`else-if=` chain (4) — all intact.

## DONE — landed to main as one clean commit; `538fe2d2` (S186 audit) + this remediation pushed together.
