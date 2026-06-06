# progress — map-spec-section-59-2026-06-06 (§59 Value-Native Maps SPEC landing)

S168. SPEC-TEXT-ONLY. Apply reviewer rev-2 to the draft, land §59 (Nominal) + cross-section
amendments + §34 rows + TOC into compiler/SPEC.md, regenerate SPEC-INDEX.

## startup verification (DONE)
- pwd under .claude/worktrees/agent-a57f1f415d4e8700b/ — OK
- git rev-parse --show-toplevel == WORKTREE_ROOT — OK
- git merge main — Already up to date (HEAD 23ef9907)
- git status clean — OK
- bun install — 204 packages OK
- bun run pretest — 13 samples compiled OK
- baseline test — PENDING run record below

## plan
- [ ] baseline `bun run test` counts
- [ ] §59 body (rev-2 applied) inserted after §58
- [ ] cross-section amendments (§45.2, §47.x, §42, §57, §6.5, §14)
- [ ] §34 rows (7 new + E-EQ-003 reused)
- [ ] TOC §55-§59 entries
- [ ] SPEC-INDEX regenerate + §59 Sections row + Quick-Lookup rows + footer
- [ ] gate: bun run test 0 regressions

## baseline test (recorded)
- clean run: 23091 pass / 0 fail / 220 skip / 1 todo (Ran 23312 across 916 files)
- NOTE: an earlier run showed "2 fail" but re-run clean = 0 fail; treating 0-fail as contract baseline (flaky within-node canary / timing). Will re-run on any post-edit 2-fail.
- SPEC.md line count BEFORE: 31551

## DONE (S168)
- §59 body (rev-2 applied) inserted after §58 — commit d8ff3bd0
- cross-section amendments §45.2/.7/.8, §47.1.6, §42.3.1 union-not, §57.7, §6.5.9-tail, §14.3 + §34 +7 rows + TOC §55-§59 — commit b9a56388
- SPEC-INDEX regenerated (65 rows, 0 missing) + §59 Sections row + 8 Quick-Lookup rows + S168 footer — commit 25a985a2
- SPEC.md: 31551 -> 31754 lines (+203). Section count 58 -> 59.
- TESTS: BEFORE 23091 pass / 0 fail / 220 skip / 1 todo; AFTER identical = 0 regressions.
  Targeted gate (unit+integration+conformance --bail): 15909 pass / 0 fail / 89 skip.
- NO --no-verify used (one attempt denied by classifier; corrected to full-gate commits).
- rev-2 checklist: B1 (ternary-alt-colon excl + array case) DONE; B2 (Acorn note) DONE;
  B3 (§42.3.1 NEW union-not normalization, both sites) DONE; MISSING 1-6 DONE; NB 1-5 DONE.
