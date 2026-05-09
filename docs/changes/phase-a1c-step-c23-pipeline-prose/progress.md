# C23 — PIPELINE.md Prose Pass — Progress

**Worktree:** `.claude/worktrees/agent-a2402592dfd975619`
**Session:** S75
**Date:** 2026-05-09
**Baseline tests:** 10535 pass / 69 skip / 1 todo / 3 fail (pre-existing infra/bootstrap fails — unrelated to docs).
**Final tests:** 10535 / 69 / 1 / 3 — unchanged across all 11 commits.

## Phase 0 — Survey — DONE (commit ca941fd)

- SURVEY.md written.
- Addendum inventory mapped: 7 stages with addenda totaling ~445 lines.
- All 7 addenda confirmed to re-flow into main narrative — no keeps.
- Lock-firing locus mapping: top-level table chosen over per-stage callouts.
- Validity-surface synthesis: surfaced as new **Stage 6.7** sub-stage between META and DG.
- IFMC: reorder by detection-stage + new rows planned.

## Phase 1-8 — Implementation log

| # | Commit | Phase | Test result |
|---|---|---|---|
| 1 | ca941fd | Phase 0: SURVEY.md + progress.md | n/a (no compiler change) |
| 2 | 2ee52d1 | Stage 3 (TAB) re-flow | 10535 / 69 / 1 / 3 |
| 3 | e339029 | Stage 3.05 (NR) re-flow | 10535 / 69 / 1 / 3 |
| 4 | 01658ff | Stage 3.1 (MOD) re-flow | 10535 / 69 / 1 / 3 |
| 5 | 9978d59 | Stage 3.3 (UVB) re-flow | 10535 / 69 / 1 / 3 |
| 6 | d28f33c | Stage 6 (TS) re-flow (sans validity-surface) | 10535 / 69 / 1 / 3 |
| 7 | 5c77ff2 | Stage 6.7 (Validity Surface Synthesis) NEW | 10535 / 69 / 1 / 3 |
| 8 | e9e1c70 | Stage 7 (DG) re-flow | 10535 / 69 / 1 / 3 |
| 9 | 5a4f816 | Stage 8 (CG) re-flow — last addendum closed | 10535 / 69 / 1 / 3 |
| 10 | 0595b09 | Lock Enforcement Map (top-level table) NEW | 10535 / 69 / 1 / 3 |
| 11 | c402bd4 | IFMC reorder + 6 new rows | 10535 / 69 / 1 / 3 |
| 12 | (this commit) | Version bump 0.7.0 → 0.7.1 + IMPLEMENTATION-ROADMAP §8.6 #2 status | 10535 / 69 / 1 / 3 |

## Final state

- **PIPELINE.md size:** 2,380 → 2,608 lines (+228 lines / +9.6%).
  - 7 addenda re-flowed into stage sections (~445 lines repositioned, mostly in-place).
  - +110 lines new Stage 6.7 (Validity Surface Synthesis).
  - +39 lines Lock Enforcement Map (top-level table).
  - +35 lines IFMC reorder + 6 new rows.
  - +24 lines version-bump change log entry.
  - net delta after re-flow: addendum framings removed; content stitched into surrounding
    contract structure.
- **Addendum sections remaining:** 0 (all re-flowed).
- **Version:** 0.7.0 → 0.7.1 (prose pass; no normative changes).
- **Files touched:**
  - `compiler/PIPELINE.md` (the prose pass).
  - `docs/changes/phase-a1c-step-c23-pipeline-prose/SURVEY.md` (Phase 0).
  - `docs/changes/phase-a1c-step-c23-pipeline-prose/progress.md` (this file).
  - `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` (§8.6 #2 status update).

## Cross-ref impact

No PIPELINE.md `:NNN`-line citations exist anywhere in the worktree
(`grep -rE "PIPELINE\.md:[0-9]+"` returned zero matches). The narrative references in
`IMPLEMENTATION-ROADMAP.md` §8.6 #2, `progress-dispatch-4.md`, and `changelog.md` describe
the historical state at D4 close and remain factually accurate. §8.6 #2 was updated to mark
the follow-up DONE (S75 / C23) and document the resolution.

No external doc cited any "Stage N v0.next addendum" by name in a way that requires editing
(only the §8.6 #2 itself referenced the framing, and that reference is now historical).

## Lock Enforcement Map — final form

Chosen presentation: **single top-level table after the Stage Index.** Per-stage callouts
were considered and rejected — they would duplicate the same table 7 times across the
stages. The top-level form is one scan to locate enforcement points; readers then trace
into the relevant stage section.

Multi-stage locks (the rule, not the exception): L1, L2, L3, L4, L5, L6, L7, L11, L12, L13,
L15, L17, L18, L20, L22 fire across 2-4 stages each. Single-stage locks: L14 (DG only),
L19 (TAB only), L21 (TS only). Negative-space locks: L9, L16. Superseded: L10 (by L18).

## Deferred items

None. All four scope items (re-flow / lock-locus / validity sub-stage / IFMC) delivered.

## Open questions surfaced — none blocking

All decisions made during SURVEY (Phase 0) held throughout implementation:
- Addendum convention: dropped entirely. No partial keeps.
- Lock map: top-level table.
- Validity surface placement: Stage 6.7 between META and DG.
- IFMC ordering: by detection stage.

No SPEC.md drift surfaced during the prose pass — every claim re-flowed already had a
SPEC § cross-ref. No Rule-4 violations.

