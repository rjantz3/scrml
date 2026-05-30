# Pre-Snapshot — s144-bs-comment-scanner-string-aware

Recorded BEFORE any code change. Baseline HEAD: 505f4ace (v0.7.0).

## Full suite (bun test)
- 22207 pass / 5 fail / 223 skip / 1 todo
- 65337 expect() calls; 22436 tests across 841 files
- The 5 fails are PRE-EXISTING (recorded for anomaly comparison; see baseline-fails below).

## Reproducer (Bug X) — pre-fix
- `/tmp/bugx.scrml` → `scrml compile` EXIT 1
- Errors: E-CTX-003 Unclosed 'logic' (line 2), E-CTX-003 Unclosed 'program' (line 1), stage BS
- Minimal sub-case `/tmp/bugx_min.scrml` (only bare ` // ` mid-string) → same EXIT 1.

## Pretest
- `bun run pretest` PASSES (compiles 13 test samples; ghost-pattern lints present, pre-existing).

## Baseline failing tests (pre-existing, NOT regressions)
Run 1 (5 fail) and Run 2 (3 fail) — count is FLAKY (timing-sensitive self-host + manifest tests).
Stable/observed pre-existing failures, ALL unrelated to block-splitter / comment scanning:
- Bootstrap: bootstrap: ts.scrml — self-hosted output matches standard (self-host, slow ~11s)
- Bootstrap: bootstrap: ast.scrml — self-hosted output matches standard (self-host, slow ~29s)
- trucking-dispatch — chunks.json structure > manifest.compiler field is stable across two compiles
(Run 1's extra 2 fails were additional flaky self-host/manifest variance; none in BS.)

## Anomaly baseline rule
Any NEW failure in block-splitter.test.js or any tightened error in BS-driven compiles = regression.
The 3 listed self-host/manifest fails are flaky and pre-existing; ignore for this change.
