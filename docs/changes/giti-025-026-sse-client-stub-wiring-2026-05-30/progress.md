# Progress: giti-025-026-sse-client-stub-wiring-2026-05-30

Startup pwd: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-abc4d5eacc97fad6b
Base (FF to main tip per brief): 3b825808

- [start] Worktree was 2 commits behind main; FF-reset to 3b825808 (brief's stated HEAD; emit-server.ts library-mode work landed). Sidecars untracked in main wt; copied into worktree for compile.
- [start] Baseline compiled both sidecars on 3b825808 — BOTH BUGS CONFIRMED GENUINE:
  - GITI-025 server: gen body refs `from` free (no `const from = route.query.from`).
  - GITI-025 client: stub `(_scrml_onMessage,_scrml_onEvent)`, EventSource no `?from=`; call `_scrml_sse_countdown_5(5)` → 5 lands in onMessage slot.
  - GITI-026: `_scrml_reactive_set("latest", _scrml_sse_ticks_6())` stores EventSource in cell; no callback; only onmessage (no addEventListener).
- Plan:
  1. emit-server.ts SSE branch (~832): emit coercion-aware `const <p> = route.query["<p>"]` per param.
  2. emit-functions.ts SSE branch (~454): compute fnParamNames; stub sig = (params..., _scrml_onMessage); build EventSource URL query from params; keep onmessage callback wiring; add addEventListener for named events.
  3. emit-client.ts GITI-001 stage (~1442): add SSE branch rewriting `_scrml_reactive_set(N, _scrml_sse_X(args))` → `_scrml_sse_X(args, (d)=>_scrml_reactive_set(N,d))` + seed absence; same for _scrml_init_set thunk.
  4. Regression tests for both bugs.

## Implementation complete
- Fix 1 (emit-server.ts): commit 4f3cd628 — coercion-aware route.query param bind.
- Fix 2 (emit-functions.ts): commit 43c88f45 — stub params lead + URL query + collectSSEEventNames + addEventListener for named events.
- Fix 3 (emit-client.ts): commit 808c6b8e — post-sse-reactive-bind stage rewrites reactive_set/init_set to subscribe via callback + seed absence.
- Tests (giti-025-026-sse-client-stub-wiring.test.js): commit bfebccef — 13 tests, all pass.
- R26 runtime: countdown(5) drains 6 frames [5,4,3,2,1,0] (was ZERO); ticks() [0,1,2] unchanged. Named-event stub registers addEventListener("activity"/"ping").
- node --check clean on both sidecars' client+server bundles.
- Baseline (3b825808): 22270 pass / 5 fail (known flakes: 2x M6.5 native-parity [for-continue-055, self-host/ast], 2x bootstrap self-host [ts.scrml, ast.scrml], 1x trucking-dispatch two-compile-determinism).

## Anomaly finding + convention fix
- Anomaly detected: the new wiring emitted bare `undefined` keyword (6 sites) -> W-CG-UNDEFINED-INTERPOLATION (SPEC §42.5/§42.8; absence is canonical JS null).
- Fix (commit 830eb66e): all emitted absence -> `null`; single-sided `=== undefined` route.query presence check paired with `=== null` (lint-exempt form). +2 lint-cleanliness tests. Runtime drain re-verified: countdown(5)=[5,4,3,2,1,0], ticks()=[0,1,2]. node --check clean on all bundles. No W-CG-UNDEFINED-INTERPOLATION on either sidecar.
- Test delta: +15 new tests (giti-025-026-sse-client-stub-wiring.test.js), all pass. Existing server-function-sse.test.js + server-fn-star-sql-r25-bug-42.test.js (43) still green.
