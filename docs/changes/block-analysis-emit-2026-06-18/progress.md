# D1 progress — block-analysis-footprint.ts (the BREAK-1 fix, ADD-ALONGSIDE)

2026-06-18 — D1 start. Worktree-absolute writes (S126). body-dg-builder.ts MUST stay zero-diff.

- Startup verified: pwd under worktrees/agent-, toplevel == WORKTREE_ROOT, status clean, bun install, bun run pretest OK.
- Read SCOPE-AND-DECOMPOSITION.md (main path; created ahead of worktree base 83ac74a3) §1/§2/§4/§7.
- Read primary.map.md (codegen task-shape routing). Load-bearing: dotted resolution ALREADY BUILT in reactive-deps.ts (_deepSetLeafKey via stampCompoundDeepSetTargets) — D1 READS it, does not re-resolve.
- Read reactive-deps.ts (collectCompoundLeafTargets / stampCompoundDeepSetTargets / extractReactiveDepsFromExprNode), body-dg-builder.ts (addAssignTargetWrites 534-553, reactive-nested-assign 398-417, index-reads 409-416), types/ast.ts node shapes.
- PROBE (R26): real BS+TAB compile of a quoteForm fixture → after stampCompoundDeepSetTargets, the two RNA nodes carry DISTINCT _deepSetLeafKey (quoteForm.originCity != quoteForm.weightLbs), residual []. Stamp works post-buildAST (relies on compound `children`, no SYM needed). function-decl bodies hold the RNA nodes directly.
- NOTE: brief filename is block-analysis-footprint.ts (not SCOPE's block-analysis.ts); brief is the dispatch wrapper + names D2's import path ./block-analysis-footprint.ts — following the brief.

2026-06-18 — D1 COMPLETE.
- Wrote compiler/src/block-analysis-footprint.ts (450L). footprintForBlock(node, fileAST?) -> {reads, writes}. Committed 07c3f762.
- Wrote compiler/tests/unit/block-analysis-footprint.test.js (328L, 13 tests / 40 assertions). Committed 17e59808.
- Both commits passed the full pre-commit gate (17274 tests / 944 files).
- R26 verify: new test 13 pass / 0 fail; body-dg-builder.ts diff EMPTY (add-alongside invariant held); BREAK-1 canary on a REAL compiled quote-form AST asserts quoteForm.originCity != quoteForm.weightLbs (distinct dotted grain, not root-cell collapse).
- Export contract for D2: footprintForBlock(node, fileAST?) -> {reads: string[]; writes: string[]} from ./block-analysis-footprint.ts. STABLE.
