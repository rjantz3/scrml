# channel-codegen-fixes-2026-06-12 — progress

## 2026-06-12T13:18:55Z — Startup + Phase 0
- WORKTREE_ROOT: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a06f1df4c51155e5e
- Startup verified: pwd OK, toplevel OK, clean, merge main (up to date), bun install OK, pretest OK.
- Maps: read primary.map.md fully; routed compiler-source-bug-fix → error/domain/structure/test maps. S180 channel facts (Trigger 7/8) load-bearing.
- SPEC read directly: §38.1-§38.11, §12.2 (Trigger 7), §12.5.3.
- Phase-0 confirmed parsed kinds:
  - reconnect=2000 → kind:"variable-ref", name:"2000", exprNode lit number. (Bug 1)
  - onserver:message=handleMessage(msg) / onclient:* → kind:"call-ref", name, args:[...] array, argExprNodes. (Bug 2)
- §38.10-vs-Trigger-7 precedence: RESOLVED (not ambiguous). §38.10.2 "onclient:* SHALL execute on client only; SHALL NOT emit server-side code" + §12.2 Trigger-7 scope note "NOT to onclient:/onserver: attribute handlers" → §38.10 wins; onclient handlers stay CLIENT.
- ARCHITECTURAL FINDING (deeper than brief assumed): server functions are emitted HTTP-route-only (_scrml_handler_X(_scrml_req)). There is NO bare callable 'handleMessage' symbol. So onserver:message=handleMessage(msg) invoked from WS message() needs the handler emitted as a PLAIN callable server function + route suppressed. This is Bug 2b's load-bearing core.

## 2026-06-12T13:21:36Z — Bug 1 done
- type-system.ts visitAttr: exempt 'reconnect' + 'channel-reconnect' from scope-check (mirror 'ref' guard).
- Verified: bare reconnect=2000 clean + setTimeout(_connect, 2000); quoted "2000" clean; <input value=42> STILL E-SCOPE-001; bare <program channel-reconnect=500> clean (no E-SCOPE-001).
- NOTE (pre-existing, out of Bug-1 scope): <program channel-reconnect=N> project-default does NOT thread into the onclose cadence (emits 2000). Bug 1 only covers the scope-check exemption; the project-default plumbing is a separate pre-existing gap. Surfacing in report.

## 2026-06-12T13:25:24Z — Bug 2a done (codegen)
- emit-channel.ts: shared channelAttrToCall + channelAttrParam helpers recognize kind:"call-ref" (array args) alongside legacy call/variable-ref/string-literal. extractChannelHandlers + extractClientHandlers route through it.
- ChannelHandlers gains messageParam; WS message() binds 'const <param> = d;' per §38.6.1 before calling handler.
- Verified: client onopen/onclose now reference handlers (but still resolve to FETCH STUB — Bug 2b pending); server message() emits 'const msg = d; handleMessage(msg)' (handleMessage still route-only — Bug 2b pending).

## 2026-06-12T13:40:02Z — Bug 2b done
- emit-channel.ts: new collectChannelAttrHandlerNames(nodes) -> { onclient, onserver } name sets.
- route-inference.ts: per-file onclient/onserver sets; +channel-ws-handler escalation reason; onclient names SKIP Trigger-7 (stay client, §38.10); onserver names FORCE-escalate + isChannelWsHandler flag -> generatedRouteName null (no HTTP route, no fetch stub). FunctionRoute gains functionName + isChannelWsHandler. dedup key cwh; W-DEPRECATED switch fallthrough safe.
- emit-server.ts: onserver WS handlers emit as PLAIN callable 'function name(params){ broadcast-inject; body }', no route. _scrml_body={} fallback guard against bare ReferenceError.
- emit-functions.ts: explicit skip of client fetch stub for isChannelWsHandler.
- R26 (board + m-handlers): all 4 checks PASS. server message() -> JSON.parse(raw); const msg=d; handleUpdate(msg). client onopen/onclose call LOCAL onclient fns (no fetch). onclient fns: no server route, no client fetch stub. node --check exit 0 on all 4 files. postUpdate (normal publisher) KEEPS route+fetch (not over-suppressed). No server leak in client.js.
- DEFERRED (SPEC-silent, out of scope): onserver handler that READS a channel cell server-side (e.g. handleUpdate(msg){ @updates=[...@updates,msg] }) lowers the read to _scrml_body["updates"]; the WS path has no request body + §38.4 defines client-held+__sync state, NOT a server authoritative cell store. Guarded with _scrml_body={} (no ReferenceError, node-check clean) but [...undefined] would throw at runtime. The SPEC-canonical §38.6.1 form (broadcast from msg, no cell read) is fully correct. Needs a server-side-channel-cell-state SPEC ruling.

## 2026-06-12T13:45:45Z — Tests + Bug 2c done
- channel.test.js: makeCallAttr now emits real kind:"call-ref" (array args) — Bug 2c R26 canary close; existing synthetic tests now exercise the production parse path.
- §27 (Bug 1, 5 tests): bare reconnect=2000 no E-SCOPE-001 + setTimeout(_connect,2000); quoted clean; bare <program channel-reconnect=500> clean; NO-OVER-RELAX <input value=42> STILL errors.
- §28 (Bug 2, 6 tests): real-source compileScrml end-to-end — server message() binds param + calls plain onserver fn (§38.6.1); no HTTP route for onserver; client onopen/onclose call onclient LOCALLY no fetch (§38.10); onclient no server route/leak; both bundles parse as ESM (acorn module mode); SPEC-canonical §38.6.1 (broadcast from msg) clean.
- channel.test.js: 98 pass / 8 skip (pre-existing v0.3-deferred) / 0 fail.
