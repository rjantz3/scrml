# M6.5.b.0 — within-node parity canary extension

## Dispatch

- Sub-unit: M6.5.b.0 (Wave 1 — sole gating unit)
- Branch: `worktree-agent-a4fd75f09bee7f145`
- Worktree base: 5be5ff34 (post-merge from main)
- Baseline tests: 20041 pass / 0 fail / 170 skip / 1 todo / 758 files

## Deliverables

1. `compiler/src/native-parser-canary/within-node-classifier.ts` — production-hardened
   per-class divergence classifier (iterative walk, PARSE-FAILURE handling,
   allowlist subtraction).
2. `compiler/tests/parser-conformance-within-node.test.js` — sister canary
   to the existing pipeline-shape canary, asserts per-class thresholds.
3. `compiler/tests/parser-conformance-within-node-allowlist.json` — baked
   residual baseline (each per-fixture entry shrinks as Wave 2 lands).
4. SCOPING.md — Wave 1 landed section with actual vs predicted baseline counts.

## Timeline

- T+0  startup verification + merge main + bun install + pretest + baseline run
       (20041/0/170/1, 758 files)
- T+5m read SCOPING.md (the 7-class taxonomy + empirical counts)
- T+10m read m65-ast-diff.js (the SCOPING agent's diagnostic walker — 309 LOC)
- T+15m read parser-conformance-corpus.test.js (the sister canary I mirror)
- T+20m start production-hardened classifier — write progress + initial commit
- T+30m classifier landed (compiler/src/native-parser-canary/within-node-classifier.ts)
       - smoke-tested against all 11 SCOPING fixtures — 10/11 exact match,
         1 (sql-in-logic) partial match (27 vs 39 — SCOPING row included
         supplemental count per §1.1)
       - iterative walk + PARSE-FAILURE handling + allowlist subtraction API
       - commit: 0210b482
- T+35m allowlist baseline generated (full 1000-file corpus run, 1.46s)
       - 133054 total divergences across 1000 files
       - 0 PARSE-FAILURE, 0 NESTED-SHAPE (every divergence falls into the
         6 catalogued non-empty classes)
       - max per-file: 113ms on compiler/self-host/ast.scrml (acceptable;
         only outlier; avg 1.45ms)
- T+40m test harness landed (compiler/tests/parser-conformance-within-node.test.js)
       - 1004 tests: 1000 per-file + 4 aggregate/hygiene
       - all green against the baked allowlist
       - commit: 9036da04
- T+45m pre-commit gate (unit/integration/conformance --bail): 14046 pass / 0 fail
- T+50m full suite (bun run test): 21045 pass / 0 fail / 170 skip / 1 todo
       - baseline was 20041; delta is +1004 (the new canary tests)
- T+55m SCOPING.md Wave 1 section + progress.md final timeline
- T+60m final commit + report

## Final test deltas

| Metric | Baseline | After Wave 1 | Delta |
|---|---|---|---|
| Pass | 20041 | 21045 | +1004 |
| Fail | 0 | 0 | 0 |
| Skip | 170 | 170 | 0 |
| Todo | 1 | 1 | 0 |
| Files | 758 | 759 | +1 |
| Expect calls | ~61030 | 62034 | +1004 |

## STOP conditions evaluated

- Performance: avg 1.45ms/file, max 113ms (single outlier ast.scrml) — PASS
- Allowlist size: 1000 file-entries (well below 3000 STOP); 133054 cumulative
  divergences (matches SCOPING extrapolation; 0 uncatalogued NESTED-SHAPE or
  PARSE-FAILURE confirms no missing class) — PASS
- Parse-crash: 0 corpus crashes either pipeline — PASS

## Wave 2 gate ready

The .b.1-.b.6 dispatches now have a regression detector. Each landing:
1. Runs the FIX-NATIVE fix
2. Re-classifies the corpus
3. Shrinks the relevant allowlist entries
4. Commits the allowlist shrink alongside the fix
5. Pre-commit gate fails loud on unexpected regressions
