# D1 BRIEF (archived verbatim per S136) — dispatched S180 2026-06-10, base HEAD 6e83b3dc

agent: scrml-js-codegen-engineer · isolation: worktree · run_in_background: true · agentId af0432d572a189b0c

TASK: Make the `server` keyword non-load-bearing in codegen (keyword → inferred-boundary refactor).
Three codegen/type paths key on `node.isServer` (the deprecated keyword) instead of the RI-inferred
boundary; re-point all three to the inferred boundary so the keyword is behavior-irrelevant for
escalating functions. NO spec change, NO new escalation rules (those are D2).

Pipeline order load-bearing: RI runs before TS before CG — inferred boundary available at all 3 sites.

Site 1 — compiler/src/codegen/emit-client.ts:729 (wire-chunk gate): currently keys on node.isServer;
  re-gate to activate `wire` when ctx.routeMap has any function boundary==="server" (mirror :1578).
Site 2 — compiler/src/codegen/mcp-descriptors.ts:841 (MCP RPC discovery): include inferred-server fns
  (routeMap lookup), not just keyword-marked.
Site 3 — compiler/src/type-system.ts:14497 (§10.4 lift-as-return permission): key the `isServer`
  determination on inferred boundary so inferred-server fns may still lift-as-return. If boundary not
  cleanly available at that check-point, implement what's clean + FLAG residual (E-SYNTAX-002 is a
  CAUGHT failure at compile-verify, acceptable as known residual).

PROOF TEST: a keyless escalating fn (?{} body) behaves identically to the keyword form on wire-chunk +
MCP + lift-permission; pure client fn gets neither; keyword form unchanged.

R26 (S138): recompile trucking-dispatch/admin-dashboard/channel-chat; emitted output identical for the
keyword-marked escalating fns (behavior-preserving); full `bun run test` green.

Full F4 startup-verification + S99/S126 Bash-edit + no-cd + MAPS block + commit-discipline + progress-d1.md
included in the dispatched prompt. Maps watermark d70f6bd8 / main 6e83b3dc.
