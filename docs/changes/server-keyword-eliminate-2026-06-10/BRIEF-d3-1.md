# D3.1 BRIEF (archived per S136) — dispatched S180 2026-06-11, base 7f641010 · agentId a0bef1c6ab34e5d90
agent: scrml-js-codegen-engineer · isolation: worktree · run_in_background: true
TASK: Fix 2 Migration-4 tool gaps D4a surfaced. Gap A (route-inference.ts:3172): remove the stale S93
`!hasLiftInFunctionBody` suppression of W-DEPRECATED-SERVER-MODIFIER (D1 made lift-as-return valid in
inferred-server fns → suppression stale → Migration 4 skips SQL-lift class); keep the has-another-reason
guard (lift-pure still no fire). Gap B: handle's W-DEPRECATED span starts 2 bytes into `server` → fix
the span anchor. Tests (lift-SQL fires + strips · lift-pure untouched · handle span correct + strips ·
server fn untouched) + R26. Full F4+S99/S126+MAPS+commit-discipline. Merge main 7f641010.
OUTCOME: Gap B SCOPE-CORRECTED (Rule 3) — the off-by-2 is the GENERAL bare-decl auto-lift bodyOffset
bug in ast-builder.js (fictional `${` prepend over-advanced child spans), not handle-specific; Gap A
was masking the SQL-lift sites. Approach-2 final (bodyOffset-only fix, within-node 1008/0). +7 tests,
full suite 23816/0. Deferred: native-parser bare-decl W-DEPRECATED parity gap (shadow, backlog).
