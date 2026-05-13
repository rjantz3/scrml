# Progress: v0.3 engine self-write Option (d) synthesis

Tracks: idempotent runtime no-op + W-ENGINE-SELF-WRITE-DETECTED info lint + SPEC §51.0.F amendment.

Pattern reference: Insight 30 / §40.8.1 OQ closure (filesystem-inferred + lint synthesis).

## Log

- T+0 (startup): worktree verified clean; bun install + pretest green. Maps consulted: primary, structure, error.
- T+0 (context): read SPEC §51.0.F (line 21391), §34 catalog row for E-ENGINE-INVALID-TRANSITION (line 14642), runtime helpers `_scrml_engine_direct_set` (line 2478) + `_scrml_engine_advance` (line 2402) in runtime-template.js. Existing self-loop precedent confirmed at `_scrml_engine_history_capture_on_exit:2388` (line 2390 `if (current === target) return`).
- T+0 (test patterns): existing tests at `compiler/tests/unit/c13-advance-write-hook.test.js` provide the canonical runtime-test scaffolding (chunk eval via `RUNTIME_CHUNKS.engine`).
- T+1 (D1 commit `7a72a7c`): runtime no-op semantics landed in `compiler/src/runtime-template.js` — early-return `false` when `current === target` for both `_scrml_engine_advance` and `_scrml_engine_direct_set`. Verified no regression on c13 (40/40), engine-a7 suite (82/82), c12/c14/c15 + b15 (167/167).
- T+2 (D2 part A — inside-state-child fire-site #10): `validateEngineA5Extensions` (PASS 16) extended to fire `W-ENGINE-SELF-WRITE-DETECTED` (severity: info) when the cascade-miss scanner detects a self-write (`dw.target === sc.tag`). Cascade-miss check (fire-site #9) is now SKIPPED for self-writes — runtime no-op shape means it's not a rule= violation under v0.3 §51.0.F. Widened SYMDiagnostic.severity to "error"|"warning"|"info" and `fireA5Diagnostic` 6th-arg type to match. Updated `engine-a7-hierarchy.test.js §7.3` "multi-target framing" case (the prior test exercised `@phase = .Active` from `<Active>` — now classified as self-write info, NOT cross-state error). Test suite delta: 9125 unit pass, 1727 integration+conformance pass, 0 fail.
