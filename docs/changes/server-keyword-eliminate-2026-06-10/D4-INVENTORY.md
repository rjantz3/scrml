# D4 corpus-migration inventory (from the S180 6-agent investigation, wf_e84a6dce-19d)

> Captured at arc-open so it survives across sessions. RE-VERIFY at D4 time against live source (per-file
> compile-verify is mandatory) — counts/lines reflect base `6e83b3dc`. After D1+D2 land, the channel + handle
> sites RECLASSIFY from "danger" to "escalates" (Trigger 7/8), so they become migratable.

## .scrml corpus — 172 `server function` decl sites / 71 files (examples + samples; stdlib = comments only, 0 real decls)
- **CLASS-ESCALATES = 151** — body has `?{}` SQL / Bun / fetch / IO → safe to drop `server` (auto-escalates). Migration 4 strips these.
- **CLASS-FN (`server fn`) = 2** — PRESERVE: `samples/compilation-tests/server-009-server-fn.scrml:6 getData`; `samples/compilation-tests/gauntlet-s19-phase1-decls/phase1-fn-server-prefix-013.scrml:4 computeKey`.
- **CLASS-SSE = 0** in this corpus (SSE deferred regardless).
- **CLASS-DANGER = 19** (no body trigger). Post-D2 reclassification + disposition:

| # | site | post-D2 class | D4 disposition |
|---|---|---|---|
| 1 | examples/09-error-handling.scrml:45 `submit()` | stub (email API) | ADD real body (e.g. `scrml:http` POST) → escalates → drop `server` |
| 2 | examples/15-channel-chat.scrml:42 `postMessage()` | **Trigger 7** (channel) | drop `server` (escalates via D2) |
| 3 | examples/19-lin-token.scrml:41 `mintTicket()` | SECURITY (token mint) | ADD real body (server token store / `?{}`) → drop `server` |
| 4 | examples/20-middleware.scrml:30 `handle()` | **Trigger 8** (handle) | drop `server` (escalates via D2) |
| 5 | examples/23-trucking-dispatch/channels/customer-events.scrml:25 `publishCustomerEvent` | **Trigger 7** | drop `server` |
| 6 | examples/23-trucking-dispatch/channels/dispatch-board.scrml:24 `publishBoardEvent` | **Trigger 7** | drop `server` |
| 7 | examples/23-trucking-dispatch/channels/driver-events.scrml:27 `publishDriverEvent` | **Trigger 7** | drop `server` |
| 8 | examples/23-trucking-dispatch/channels/load-events.scrml:30 `publishLoadEvent` | **Trigger 7** | drop `server` |
| 9 | samples/compilation-tests/func-010-server.scrml:6 `fetchData()` | pure stub (returns literal) | → `server fn` (pure-server-pin) |
| 10 | samples/compilation-tests/gauntlet-r10-zig-buildconfig.scrml:224 `saveConfig()` | comment-only stub | ADD real body (`?{}` persist) → drop `server` |
| 11 | samples/compilation-tests/gauntlet-s19-phase1-decls/phase1-navigate-server-003.scrml:4 `checkAuth()` | auth gate (navigate) | ADD real body OR → server fn; SECURITY — verify |
| 12 | samples/gauntlet-r11-zig-buildconfig.scrml:224 `exportTargetsToFile()` | name/behavior mismatch (returns json) | ADD `scrml:fs` write → escalates → drop `server` |
| 13 | samples/gauntlet-r13/go-api-service.scrml:6 `handle()` | **Trigger 8** | drop `server` |
| 14 | samples/gauntlet-r14/go-api-service.scrml:6 `handle()` | **Trigger 8** | drop `server` |
| 15 | samples/gauntlet-r14/react-auth-dashboard.scrml:24 `login()` | SECURITY (calls `hash(@password)`) | `hash` from `scrml:auth` is T3 → likely ALREADY escalates; verify, then drop `server` |
| 16 | samples/rust-dev-lin-lift-pipeline.scrml:35 `validateOrder()` | pure logic | → `server fn` (or `fn` if no server-pin need) |
| 17 | samples/rust-dev-lin-lift-pipeline.scrml:44 `fetchPaymentToken()` | SECURITY (payment, stub) | ADD real body (`scrml:http`) → drop `server` |
| 18 | samples/rust-dev-lin-lift-pipeline.scrml:51 `submitCharge()` | SECURITY (payment, stub) | ADD real body (`scrml:http`) → drop `server` |
| 19 | samples/rust-dev-lin-lift-pipeline.scrml:84 `runPipeline()` | transitive (calls 17/18) | T5 caller-context once callees server; verify, drop `server` |

**Net after D1+D2:** channel (2,5,6,7,8) + handle (4,13,14) = 8 escalate via new triggers; security/stub (1,3,10,12,15,17,18) get real bodies; pure (9,16) → `server fn`; (11,19) verify. ZERO `server function` should remain post-D4.

## Docs — allow / deny (verify lines at D4; post-D2 handle+channel become migratable)
**SPEC.md** (70 line-leading `server function NAME(` decls; ~133 prose mentions LEAVE):
- MIGRATE (~54 SQL-bodied clean candidates): 821,838,843,1367,3285,5413,5972,6019-6257(range),7030,7137,7143,7211,7272,7900,8287,8352,13562,13628,13668,13934,15752,17336,20608,20682,28480,28486,28555,28638,28642,28776,29009,29040,29655,29679,29821,30184,31145 (re-verify).
- POST-D2 MIGRATE: handle() 19736/19755/19787/19809 → `function handle(...)`; channel postMessage 18375/18428/18503/18965, postEvent 18863 → `function`.
- → `server fn`: computeDouble 28707 (E-AUTH-002 teaching, pure-server-pin).
- LEAVE (session-only, demote would fire E-SCOPE-012): getProfile 13962, checkAuth 14000.
- LEAVE (deprecation-TEACHING — intentionally show deprecated form): §52.10 block 28865-28886; §20.5 session-fix prose 14017; §34 catalog rows 16642/16643; Insight-26 cross-refs 16516/16560/16778/17152.
- LEAVE: all `server function*` SSE (deferred); all `server fn` (17 prose refs, no decls).

**kickstarter (llm-kickstarter-v2):** MIGRATE 50,61,65,785,802,986,1194,1240,1246,1589,1593. POST-D2: handle 1544; postMessage 1338 (channel). → `server fn`: redeem 1563 (lin example, pure-server-pin). VERIFY: googleSigninStart 1295 (T5), compressImage 1767 + indexNewDocs 1814 (worker, elided body — may need real body). LEAVE: deprecation prose 319/326 + table row 109; SSE liveCount 1833.

**PRIMER:** MIGRATE 143,596,631 (all `?{}`). POST-D2: postMessage 819 (channel). LEAVE: deprecation form-overview block 186-196 (incl. S175 user-intent quote + g-server-keyword-drift callout).

## D5 doc-teach follow-up
PRIMER §6 + kickstarter §3.3 already reframed to inferred-server (S179 `67789409`). D5 ADDS: channel-cell-write (Trigger 7) + handle-name (Trigger 8) to the escalation-trigger list, so the inferred-server teaching is complete.
