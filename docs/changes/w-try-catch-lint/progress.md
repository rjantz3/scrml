## W-TRY-CATCH-IN-SCRML-SOURCE — Phase 3a regression guard lint

### 2026-05-13 — start
- Verified worktree (`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2b47d1532b413803`); `bun install` + `bun run pretest` clean.
- Maps consulted: primary, domain, error, schema, test.
- AST kind located: `kind: "try-stmt"` in `compiler/src/types/ast.ts:920` (`TryStmtNode`).
- Shared walker `walkFileAst` (`compiler/src/validators/ast-walk.ts`) already recurses into `try-stmt.body`, `catch.body`, `finally.body`.
- Precedent: W-PROGRAM-SPA-INFERRED (TAB-pushed) + W-ENGINE-SELF-WRITE-DETECTED (SYM-pushed). Both auto-classify into `result.warnings` via `api.js` filter on `W-*` prefix.
- Stdlib remaining try/catch sites confirmed at `stdlib/http/index.scrml:65` (`_request`) and `:264` (retry helper) per S89 hand-off.

### Plan
1. Create `compiler/src/validators/lint-try-catch.ts` — uses shared walker; pushes diagnostics.
2. Wire into `compiler/src/api.js` post-TAB (no need for type system).
3. Add SPEC §34 row using `W-PROGRAM-SPA-INFERRED` format precedent.
4. Conformance test: `compiler/tests/conformance/conf-TRY-CATCH-IN-SCRML-SOURCE.test.js` (pos + neg + stdlib regression-fire).

### 2026-05-13 — step 1 commit (9450ef9)
- Walker file + api.js wiring committed.
- Test count: 11,170 pass (up from 11,153 baseline — pre-test compile-test-samples count climb is noise; no regressions).

### 2026-05-13 — step 2 SPEC + step 3 tests
- SPEC §34 row inserted right after `W-PROGRAM-SPA-INFERRED` (line ~14704). Format precedent observed: leading `(v0.3 ...)`, semicolon-separated descriptive prose, trailing `(Catalog addition S89 ... 2026-05-13)` provenance.
- §X.Y reference resolved: SPEC §19.1 — the exact line "There is NO try/catch. There are NO exceptions." is the load-bearing normative anchor.
- Conformance tests: 7 cases — 3 POS (fn-body / server-fn with try/catch/finally / nested), 3 NEG (safeCall / clean / literal-string false-positive guard), 1 stdlib/http regression-fire verifying both line 65 and line 264 fire.
- Full pre-commit suite: 11,177 pass / 88 skip / 1 todo / 0 fail. +7 tests, zero regressions.
- Stdlib/http confirmation: 2 fires exactly, at lines 65 + 264 as expected per S89 hand-off inventory.
