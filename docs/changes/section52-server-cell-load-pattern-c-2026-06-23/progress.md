# §52 Server-Cell Load — Pattern C (decl-RHS-`?{}` LOAD) — progress

change-id: section52-server-cell-load-pattern-c-2026-06-23
ruling: S216 disposition A (LOAD). Param-FREE core only.
base: main 96745d34 (merged into worktree; INCLUDES ss1 item-3 sqlNode + item-2 generateValueOnlyServerJs)

## 2026-06-23 — startup + survey
- pwd worktree verified; merged main 96745d34 into worktree base 9cd5ae81 (S112 staleness). bun install + pretest OK.
- Read DD section52-server-cell-load-rhs-2026-06-23.md (RATIFIED A=LOAD).
- Surveyed built path:
  - emit-sync.ts:104 emitServerAuthorityLoad(varName, table) — Tier-1 client fetch IIFE → /__serverLoad/<var> POST {} empty body.
  - emit-server.ts:2041 — Tier-1 /__serverLoad/<var> route runs hardcoded `SELECT * FROM <table>`.
  - emit-reactive-wiring.ts:662 — collectServerVarDecls (Tier-2) → emitInitialLoad (returns [] when no `(` → placeholder forever; THE NO-OP).
  - collect.ts:546 collectServerVarDecls (Tier-2, isServer && !serverAuthorityTable); :588 collectServerAuthorityTypes (Tier-1).
  - emit-logic.ts:2686 case "sql" — canonical sqlNode→`_scrml_sql` tagged-template lowering (.get()/.all() terminator, ${} param binding). REUSE for the route.
- AST dump (ss1 item-3): a `<var server> = ?{}` decl carries `sqlNode { kind:"sql", query, chainedCalls:[{method,args}] }`, isServer:true, serverAuthorityTable:undefined. @-form identical. Param-bearing → sqlNode.query contains literal `${`. Non-?{} RHS → no sqlNode.
- TODAY: bare-cell → W-AUTH-001 + placeholder, NO /__serverLoad route, NO leak. Param-bearing → same (graceful, no crash, no leak).

## Approach (param-free)
1. collect.ts: NEW serverVarDeclLoadKind(decl) → "sql-load" (param-free sqlNode) | "param-bearing" (sqlNode.query has `${`) | "none". Shared by client wiring + server route.
2. emit-server.ts: NEW loop over Tier-2 server-var-decls with kind "sql-load" → emit /__serverLoad/<var> route running the ACTUAL query via emitLogicNode(sqlNode,{boundary:"server"}).
3. emit-sync.ts: NEW emitDeclRhsSqlLoad(varName) → client fetch IIFE to /__serverLoad/<var> (POST {} empty body; mirrors emitServerAuthorityLoad sans table).
4. emit-reactive-wiring.ts: for a Tier-2 decl with sqlNode (param-free) emit emitDeclRhsSqlLoad instead of emitInitialLoad.
5. type-system.ts: suppress W-AUTH-001 for param-free sql-load; emit NEW W-AUTH-004 (Info) for param-bearing (steer to param-free / on mount).
6. SPEC: add §52.6.5 Pattern C; reword §52.4.3; §34 catalog W-AUTH-004 row.

## 2026-06-23 — implemented + verified
- Committed feature c402def1 (8 files, 577 ins). Pre-commit blocking gate PASSED.
- Codegen: collect.serverVarDeclLoadKind; emit-sync.emitDeclRhsSqlLoad; emit-server Pattern-C route loop (runs actual ?{} via emitLogicNode case "sql"); emit-reactive-wiring routes sqlNode decls to Pattern-C load; emit-logic accurate decl-site comment; type-system W-AUTH-001 suppress (param-free) + W-AUTH-004 (param-bearing).
- SPEC: §52.6.5 Pattern C added; §52.4.3 reworded; §51.0.E example → param-free + follow-on note; §34 W-AUTH-004 row.
- Test: server-cell-load-pattern-c.test.js (22 pass).
- Param-bearing choice: W-AUTH-004 Info (non-fatal) + NO route + NO leak (graceful). §34 row added.
- R26 (CLI full pipeline): bare-cell route+fetch+no-leak; engine-rides route+fetch+E-leg-subscribe(2)+no-leak; flux-g1 route+fetch+no-leak; giti-f1 route+fetch+E-leg+setDriving-server-only+no-leak; all node --check OK.
- Adversarial: multi-cell (3 routes/3 fetches/0 leak); mixed literal+Pattern-C (Pattern-C loads, literal stays W-AUTH-001 — selective); param-bearing graceful (W-AUTH-004, no route, no leak, valid JS).
- Affected-suite regression check: state-authority/tier1/emit-server-sql/engine-hydration/sync/session-auth/handle-middleware/trucking-smoke/reactive-decl-sql — 0 fail.
- Blocking gate (unit+integration+conformance): 17657 pass / 0 fail / 68 skip.
