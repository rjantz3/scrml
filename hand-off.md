# scrmlTS — Session 60 (OPEN)

**Date opened:** 2026-05-05
**Previous:** `handOffs/hand-off-59.md` (S59 close — 7/13 of A1a done + program-attrs + L21 + 3 audits + dashboard rewrite)

**Baseline at S60 open:**
- scrmlTS HEAD: `4ee360f` — clean, in sync with origin
- scrml-support HEAD: `f7b935a` — clean, in sync with origin
- Tests: **8,784 pass / 43 skip / 0 fail / 8,827 across 435 files** (verified via `bun run test`)
- Inbox: empty
- Worktrees: S59 leftover worktrees may be present (auto-cleanup if no changes)

---

## Session-start checklist — DONE

- [x] Read `pa.md`
- [x] Read `docs/PA-SCRML-PRIMER.md` in full (last updated S59 — §12 depth-of-survey discount × 4 + bun-run-pretest + brief-locus correction)
- [x] Read `handOffs/hand-off-59.md` (S59 close snapshot)
- [x] Read last contentful entries from `../scrml-support/user-voice-scrmlTS.md` (S59 entries: L21 lock; major-breaking-change framing; depth-of-survey discount; do-not-pause directive; program documentary attrs; article truthfulness; "go on all 5"; "split A1a (b)"; wrap timing pattern)
- [x] Cross-machine sync check: scrmlTS 0/0; scrml-support 0/0
- [x] Inbox check: empty
- [x] Test baseline confirmed: 8,784 / 43 / 0 / 8,827 / 435

---

## Open questions to surface immediately (from S59 close §6)

1. **Push posture.** Both repos clean+pushed at S59 close. No unpushed work.
2. **Article truthfulness audit dispositions** — 15 articles classified; user must cross-reference public state and decide edit/retract/take-down.
3. **scrml.dev v0.2.0 announce publishing** — draft at `docs/website/v0.2.0-announce-2026-05-05.md`; user-controlled timing.
4. **`tier-ladder-promotion` article** — `published: false`; gated on A2 (engines).
5. **Step 5 path-discipline leak root cause** — investigate; consider pa.md F4 addendum. **Update S60:** Step 6 + Step 7 BOTH had zero leaks, suggesting the leak was specific to Step 5's progress.md write pattern; concrete diagnostic deferred unless recurrence.
6. **~~`reactive-derived-decl` divergence~~** — **RESOLVED S60.** ADR ratified Option A: FOLD into `state-decl` standalone, sequenced AFTER Step 11 BEFORE Step 12. Inserted as Step 11.5 in decomposition. BRIEF at `docs/changes/phase-a1a-step-11-5-fold-derived/BRIEF.md`.

---

## Phase A1a — 11/17 done; Steps 11.0a/b/c + 11.5 + 12 + 13 remain

| # | Step | Status |
|---|---|---|
| 1 | Lexer: reserve `reset` | ✅ S59 (`9cd7779`) |
| 2 | Foundational: `<NAME>` decl-site recognition | ✅ S59 (`d28f6f7`) |
| 3 | AST kind rename `reactive-decl` → `state-decl` | ✅ S59 (`8fa26e1`) |
| 4 | Parser: state-decl `shape` discriminant | ✅ S59 (`96dbe92`) |
| 5 | Parser: Shape 2 `renderSpec` + bareword validators | ✅ S59 (`505531f`) |
| 6 | Parser: `default=` + `pinned` on state-decl | ✅ S60 (`2754940`, +10 tests) |
| 7 | Parser: `pinned` on import items | ✅ S60 (`556de93`, +10 tests) |
| 8 | E-RESERVED-IDENTIFIER trigger | ✅ S59 (`af4a0da`) |
| 9 | Expression parser: `reset(@cell)` keyword + E-RESET-NO-ARG | ✅ S60 (`fded36a`, +8 tests) |
| 10 | Expression parser: mutation shape verification | ✅ S60 (`226a2dd`, +10 tests; ZERO source — discount #8) |
| 11 | Kickstarter v2 §3 smoke + Variant C + render-by-tag | ✅ S60 (`bcca1e6`, +23 tests; surfaced 11.0a/b/c gaps) |
| **11.0a** | **Variant C compound recognizer** (Step 11 escalation) | ⏸ NEXT (BRIEF drafted; ~2-3h) |
| **11.0b** | **Newline-as-statement-separator** in `parseLogicBody` (Step 11 escalation) | ⏸ (~1-2h) |
| **11.0c** | **Typed-decl recognizer** `<count>: number = 0` (Step 11 escalation) | ⏸ (~2-3h) |
| **11.5** | **Fold `reactive-derived-decl` into `state-decl{shape:"derived",isConst:true}`** (ADR Option A) | ⏸ (~3-5h) |
| 12 | Existing-test deltas: rewrite + drop | ⏸ (~4-8h) |
| 13 | Final commit + CHANGELOG draft | ⏸ (~0.5h) |

**Tests at S60-mid: 8,845 / 43 / 0 / 8,888 / 439. Remaining ~13-22h focused work** across 11.0a/b/c + 11.5 + 12 + 13.

**A1b SCOPE-AND-DECOMPOSITION drafted** at `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` (22 steps B1-B22, ~85-120h, 5 waves, 7 ranked open Qs).

**A1c SCOPE-AND-DECOMPOSITION drafted** at `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` (23 steps C1-C23, ~93-131h, 6 waves, 8 ranked open Qs).

---

## S60 entry — proposed next priority

User to choose between:
- **(a)** Step 6 dispatch (`default=` + `pinned` on state-decl) — small, single-file work in `tryParseStructuralDecl`
- **(b)** Investigate Step 5 path-discipline leak first (forensic + pa.md F4 addendum)
- **(c)** Address `reactive-derived-decl` divergence (fold-in step ~3-5h)

PA lean: **(a) Step 6** — keep A1a momentum; (b) and (c) can be folded into a later step or run in parallel.

---

## Things NOT to screw up (carried from S59 close §7)

1. AST kind is `state-decl`, NOT `reactive-decl` — Step 3 done.
2. `reactive-derived-decl` is a SEPARATE kind until folded in. Touch both kinds.
3. Validator args are `string[]` for now (Step 5 deferred ExprNode[] conversion to A1b).
4. `<program>` documentary attrs (`title=`, `description=`, `version=`, `author=`, `license=`) at SPEC §40.7. Don't conflate with §43 nested-program `name=`.
5. Brief-locus errors are routine (4th occurrence S59) — agents must verify via survey + correct.
6. Path-discipline regression risk — verify `git status --short` in main BEFORE cherry-pick.
7. Anti-html-fragment guard non-negotiable on every Shape-1/2/3 positive test.
8. Test invariant: 8,784 / 43 / 0 / 8,827 / 435 baseline; each step adds tests with 0-regression contract.
9. README v0.2.0 banner is live public signal.

---

## Tags

#session-60 #open #phase-a1a #7-of-13-done #l21-locked #depth-of-survey-discount
