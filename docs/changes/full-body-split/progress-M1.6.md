# M1.6 — SPEC §19.9.9 ratification — progress log

Append-only timestamped log. Brief: docs/changes/full-body-split/EXT-1-IMPL-BRIEF.md §M1.6.

- 2026-05-21 — Startup verification PASSED. Worktree
  /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-abac7a5b33ed14113.
  `git merge main --no-edit` fast-forward to e72e41c8 (M1.1-M1.5 present). Clean status.
  `bun install` OK (117 packages).
- 2026-05-21 — Read EXT-1-IMPL-BRIEF.md §M1.6, SPEC-INDEX.md, SPEC §19.9.3-§19.9.8
  neighbourhood + §19.6.7 + §34 CPS rows, cps-batch-planner.ts + body-dg-builder.ts
  (the landed M1.2/M1.3 code), progress-M1.3/M1.4/M1.5.md. Grounded §19.9.9 in the
  actual algorithm, not the brief's pre-implementation sketch.
- 2026-05-21 — NEW SPEC §19.9.9 "Multi-Batch CPS — Reorder + Static Reject" added
  after §19.9.8 (the brief said "after §19.9.7" but §19.9.8 now exists; placed at the
  end of the §19.9 block). Six sub-subsections: §19.9.9.1 body-DG construction;
  §19.9.9.2 the five-step planner algorithm; §19.9.9.3 per-batch monotonicity +
  batchIndex; §19.9.9.4 emission shape; §19.9.9.5 worked example; §19.9.9.6 S1-S5
  soundness. Committed 1f6ec9e5.
- 2026-05-21 — §19.6.7 forward-ref promoted "future code" → "implemented in §19.9.9".
  CORRECTED: §19.6.7 said "S4 reorder verdict" — the landed cps-batch-planner.ts and
  §19.9.9 attribute the reorder verdict to S3 (monotonicity-preserving-ordering), not
  S4 (failure-mode-preservation). Changed to S3 to match the landed code.
  §34 catalog: registered E-CPS-MULTIBATCH-REORDER + E-CPS-MULTIBATCH-MACHINE-CROSSING
  after W-LEAK-010. Committed cf4951e6.
- 2026-05-21 — SPEC-INDEX.md: ran `bun run scripts/regen-spec-index.ts` (44 rows
  updated, 0 missing). Updated §19 row note + §34 row note + Total-lines header
  (28,489 → 28,723, +234L). Pre-commit gate run + final commit.
</content>
