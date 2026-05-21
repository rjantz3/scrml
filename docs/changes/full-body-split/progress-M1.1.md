# M1.1 — CPSSplit type lift to multi-batch — progress

Append-only timestamped log.

## 2026-05-21 — startup
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-adcbd90f92d256baf
- merged main (fast-forward to 65157654), bun install, bun run pretest — all clean.
- Phase-0 surface verification:
  - route-inference.ts: CPSSplit interface at 90-110 (brief said 86-110 — drift +4).
  - route-inference.ts: analyzeCPSEligibility at 1155-1250 (matches; returns CPSResult, not CPSSplit).
  - route-inference.ts: CPSSplit construction site at 2691 (brief M1.3 cites 2666-2768).
  - monotonicity-analyzer.ts: MonotonicityAnalysis at 81-86 (matches).
  - Consumers verified: emit-functions.ts (local structural CpsSplit), emit-server.ts (route:any),
    monotonicity-analyzer.ts classifyFunctionMonotonicity:325 + analyzeMonotonicity:467, api.js:1102-1180.

## 2026-05-21 — implementation complete
- route-inference.ts: CPSSplit interface → class. Added CPSBatch interface
  ({indices, monotonicity?, idempotencyTag}). Added CPSSplit.singleBatch() static
  factory + serverStmtIndices derived getter (flattens batches, ascending sort).
  Construction site (formerly :2691, now :2792) switched to CPSSplit.singleBatch.
  Type-only `import type { MonotonicityVerdict }` added (cycle-safe).
  Header docstring updated.
- monotonicity-analyzer.ts: MonotonicityAnalysis extended with batchVerdicts
  Map<fnId, MonotonicityVerdict[]> (additive; verdicts kept per-function for
  back-compat — api.js consumers untouched). analyzeMonotonicity populates
  batchVerdicts with single-element mirror arrays (one per serverBatches entry).
- a9-ext5-monotonicity-classifier.test.js: makeCpsSplit helper now uses
  CPSSplit.singleBatch (coupled test update).
- NEW ext1-m1-1-cpssplit-type-lift.test.js: 11 tests — back-compat getter,
  multi-batch flatten/sort, idempotencyTag default, monotonicity field mutation.
- emit-server.ts / emit-functions.ts: NOT touched. emit-functions has a local
  structural CpsSplit (serverStmtIndices+returnVarName only) — getter satisfies it.
  emit-server types route as `any`. No surgery needed; getter is transparent.
- Tests: full `bun run test` 17911 pass / 169 skip / 1 todo / 0 fail.
  Pre-commit subset baseline was 13362 pass / 0 fail at startup.
- Soundness S1-S5: CLEAN at all five — type lift records no semantic change.
  No emission decision, no reorder, no failure-mode change.
