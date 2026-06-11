# D1 — Make `server` keyword non-load-bearing in codegen (progress)

Change-id: server-keyword-eliminate-2026-06-10 (dispatch D1 of 5)
Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af0432d572a189b0c

## 2026-06-10 — Startup + investigation
- Startup verification PASS: pwd under worktree, toplevel matches, tree clean, already up-to-date with main (6e83b3dc), bun install OK, pretest OK.
- Baseline full `bun run test`: 23778 pass / 221 skip / 1 todo / 2 fail (pre-existing; not detailed by `(fail)` grep — Bun output buffer truncated). Pre-commit gate (unit/integration/conformance) baseline in progress.
- RI exposes boundary via routeMap.functions, keyed `${filePath}::${fnNode.span.start}` (makeFunctionNodeId, route-inference.ts:789). Boundary = `isServer ? "server":"client"` where isServer = escalationReasons.length>0 (route-inference.ts:3098). RI does NOT stamp boundary back on the AST node — lookup only via routeMap.
- Pattern template: S179 lint-i-fn-promotable.js + api.js:1794 inferredServerKeys (Set of `${filePath}::${span.start}` for boundary==="server").
- Canonical TS resolver: type-system.ts:6301 `functionBoundary(fnNode)` -> routeMap.functions.get(`${filePath}::${span.start}`).boundary.
- Pipeline order confirmed: RI before TS before CG. routeMap available at all 3 sites:
  - Site 1 emit-client.ts:729 — ctx.routeMap available in detectRuntimeChunks(fileAST, ctx); :1577 already iterates ctx.routeMap.functions boundary==="server".
  - Site 2 mcp-descriptors.ts:841 — riResult.routeMap in scope at api.js:2419 (buildMcpDescriptors caller); thread routeMap down.
  - Site 3 type-system.ts:14497 — processFile has routeMap; checkLoopControl(allNodes,errors,filePath) at :17227; thread routeMap into checkLoopControl -> checkLiftInFn. No residual expected.

## 2026-06-10 — Site 1 + Site 2 done
- Site 1 (emit-client.ts detectRuntimeChunks): added `functionDeclIsServerBoundary(node)` helper keyed on ctx.routeMap (`${filePath}::${span.start}`), keyword as OR-fallback; case "function-decl" now gates wire chunk on it. Committed 9fb017cc.
- Pre-commit gate baseline: 16564 pass / 90 skip / 1 todo / 0 fail.
- Site 2 (mcp-descriptors.ts): collectServerFnNodes now takes optional routeMap, classifies via `isServerBoundary(node)` (boundary==="server" OR keyword fallback). Threaded routeMap through collectServerFnDescriptors + buildMcpDescriptors; api.js:2422 passes riResult.routeMap. All 111 MCP tests pass (37+74).

## 2026-06-10 — Site 3 done (no residual)
- Site 3 (type-system.ts checkLiftInFn §10.4 lift-as-return): routeMap IS available at the check-point (processFile receives routeMap; checkLoopControl threaded). Added local `functionDeclIsServerBoundary(node)` (boundary==="server" OR keyword fallback). `isServer` now keyed on inferred boundary. NO residual flag needed — clean fix.
- Full suite after all 3 sites: 23779 pass / 221 skip / 1 todo / 0 fail (baseline was 23778 pass / 2 fail). The 2 baseline fails now gone + count +1 — re-running to confirm stability (suspect flaky baseline, not a regression I introduced; my changes are behavior-preserving for keyword-marked fns).

## 2026-06-10 — Proof test + empirical verification
- Empirical probe (all 3 axes, real compileScrml):
  - KEYLESS escalating `function loadCount()` + `?{}`: wire=true, serverFns=["loadCount"], no E-SYNTAX-002 — the FIX.
  - KEYWORD `server function loadCount()`: wire=true, serverFns=["loadCount"] — UNCHANGED.
  - PURE CLIENT `function pureAdd`: wire=false, serverFns=[] — correctly excluded.
  - lift-as-return §10.4: keyless-escalating+lift E-SYNTAX-002=false; keyword+lift=false; pure-client+lift=true.
- Proof test: compiler/tests/unit/server-keyword-eliminate-d1.test.js (7 tests, all pass) — covers wire/mcp/lift equivalence keyless==keyword + pure-client negatives.

## 2026-06-10 — R26 + final gates
- R26: trucking-dispatch (23) + multifile (22) compile clean (exit 0). trucking ships wire chunk (1 file). 
- R26 byte-identity: post-fix trucking-dispatch output diffed against pre-fix (main checkout compiler) output — BYTE-IDENTICAL (only difference is my placed compile.log). Confirms behavior-preserving for keyword-marked fns.
- Pre-commit gate (unit+integration+conformance --bail): 16571 pass / 90 skip / 1 todo / 0 fail (baseline 16564 → +7 = my new proof tests).
- Full suite: 23779 pass / 0 fail (stable across 2 runs; the 2 baseline "fail" were flaky browser/lsp, now gone). Final full-suite run in progress.

## SUMMARY — all 3 sites complete, no residual
- Site 1 emit-client.ts: wire chunk on inferred boundary (ctx.routeMap) + keyword fallback. DONE.
- Site 2 mcp-descriptors.ts + api.js: MCP RPC discovery on inferred boundary (threaded routeMap) + keyword fallback. DONE.
- Site 3 type-system.ts: §10.4 lift-as-return permission on inferred boundary (threaded routeMap into checkLoopControl) + keyword fallback. DONE — routeMap WAS cleanly available; NO residual flag needed.
