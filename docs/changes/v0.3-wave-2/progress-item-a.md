# v0.3 Wave 2 — Item (a) progress (migrate --program-shape)

Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad9b623edac29ed02`
Branch HEAD at start: `23e6265`
Baseline: 11511 pass / 96 skip / 1 todo / 0 fail / 557 files

## Plan

1. Extract `classifyFile(absPath, sourceText, projectRoot)` returning `{bucket, evidence}` — implement five buckets (entry/route/module/schema-anchor/ambiguous).
2. Add per-bucket rewrite engine (`applyProgramShapeRewrite(source, classification)`) returning `{rewritten, changes, advisories}`.
3. Extend CLI parser with `--program-shape` and `--report` flags; update `--help`.
4. Plumb new flags through `migrateFile` + `runMigrate`. When `--program-shape`, run program-shape pipeline alongside existing migrations.
5. New fixture corpus under `compiler/tests/commands/migrate-program-shape-fixtures/` (5 fixtures).
6. New test file `compiler/tests/commands/migrate-program-shape.test.js` covering classification + rewrite + idempotency + safety + report.
7. Sanity-check on `examples/23-trucking-dispatch/`.

## Log

- 2026-05-12T-start — read brief + maps + existing migrate.js + scrml-migrate.test.js. Plan recorded.
- step 2 — added `classifyFile` + `applyProgramShapeRewrite` + helpers (parseAttrsRaw, findFileTopOpener, rewriteProgramToPage, findMatchingProgramClose, unwrapRedundantLogicBlocks, findMatchingDollarClose, isTopLevelDeclOnly, isRecognizedTopLevelDecl, splitTopLevelStatements). Existing 25 tests still pass. Commit 24d900d.
- step 3 — wired `--program-shape` + `--report` flags through parseArgs, migrateFile, runMigrate; added emitProgramShapeReport. Help text updated. Commit b7edd75.
- step 4 — created fixture corpus (5 fixtures: entry-app.scrml, pages/dashboard.scrml, pages/dashboard-mixed.scrml, components/button.scrml, schema-anchor.scrml). Added migrate-program-shape.test.js with 33 tests covering classification (§1), per-bucket rewrite (§2), fixture snapshots (§3), idempotency (§4), safety harness (§5), --report mode (§6), W-* baseline composition (§7). One failing test ("file-top `${...}` ABOVE <program>") revealed findFileTopOpener needed to skip leading `${...}` — fix added. All 33 new tests pass.
- step 5 — final full suite: 11544 pass / 96 skip / 1 todo / 0 fail / 558 files (delta +33 pass, +1 file). Commit 72ffb2a.
- step 6 — compile-check #4 (trucking-dispatch dry-run --report): 36 files scanned; app.scrml correctly classified schema-anchor; pages/* correctly REWRITE; components/* + channels/* + schema.scrml + seeds.scrml correctly module. 20 "failed" are sanity-parse failures on files with cross-file imports — expected behavior per brief §3.3.4 (do not weaken safety gate); resolved in Wave 3 fixture sweep.

## Final status

DONE. All acceptance criteria met:
1. `--program-shape` flag accepted; `--help` updated.
2. `classifyFile` extracted + 9 unit tests (entry + route + route(routes) + module + schema-anchor + page-already + ambiguous-layout + comments + module-at-root).
3. `--dry-run --report` emits structured advisory output; 5-fixture snapshot tests in `migrate-program-shape-fixtures/`.
4. `--program-shape` (non-dry) rewrites in place; safety harness gate fires (verified in §5 safety test).
5. Idempotency verified for route + entry + schema-anchor (§4 tests).
6. Zero regressions on W-* migrations (§7 tests + existing 25 tests pass).
7. `bun run test`: 11544 pass / 96 skip / 1 todo / 0 fail / 558 files.
