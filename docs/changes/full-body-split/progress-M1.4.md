# M1.4 — per-batch monotonicity classifier lift — progress

## 2026-05-21 — start
- Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aeff549cf776b2975
- merge main (9f1b4daa) clean; bun install + pretest OK.
- Pre-commit gate baseline: 13419 pass / 88 skip / 0 fail (unit+integration+conformance).
- Phase-0 surface verified:
  - monotonicity-analyzer.ts: classifyFunctionMonotonicity @344; analyzeMonotonicity @486;
    MonotonicityAnalysis @81; batchVerdicts mirror-fill @517.
  - route-inference.ts: CPSBatch.monotonicity @117 (unset by planner); CPSSplit.monotonicity @166.
  - cps-batch-planner.ts:197-202 — batches emit idempotencyTag:"" + monotonicity unset.
  - emit-server.ts:812 _ext5Dedup; :1034 _ext5DedupNonCsrf — gate on cpsSplit.monotonicity (fn-level).
  - emit-functions.ts:212-213 — gates on cpsSplit?.monotonicity (fn-level).

## 2026-05-21 — M1.4 implementation complete
- monotonicity-analyzer.ts: classifyBatchMonotonicity (per-batch core) +
  classifyFunctionMonotonicity (back-compat aggregate wrapper, conservative max).
  analyzeMonotonicity populates CPSBatch.monotonicity + per-batch batchVerdicts +
  per-batch diagnostics with batchIndex. classifyBatchMonotonicityForTest exported.
  MonotonicityDiagnostic extended with optional batchIndex.
- emit-server.ts: cpsNeedsIdempotencyDedup helper; _ext5Dedup + _ext5DedupNonCsrf
  gates lifted to per-batch (some-batch-non-monotone).
- emit-functions.ts: cpsNeedsIdempotencyKey helper; local CpsSplit interface
  extended with monotonicity + serverBatches; client-wrapper key gate lifted.
- Test corpus: ext1-m1-4-per-batch-monotonicity.test.js — 18 fixtures, all pass.
- Pre-commit gate: 13437 pass / 88 skip / 1 todo / 0 fail. Zero regressions
  (baseline 13419 + 18 new).
- Committed: 1809bd80 (code + test, one logical unit).
- M1.4 COMPLETE.
