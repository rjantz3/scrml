# progress — channel-cell-write-client-side-A-2026-06-12

change-id: channel-cell-write-client-side-A-2026-06-12
RULING A (user S189): channel state is CLIENT-HELD (§38.4). A channel-cell WRITE runs CLIENT-SIDE
(mutate locally → existing __sync effect distributes). Drop §12.2 Trigger 7a (channel-cell-write
no longer escalates). Diagnose a channel-cell READ in SERVER context (new E-CHANNEL-008 /
E-CHANNEL-SERVER-CELL-READ).

Closes: g-channel-publisher-server-cell-read (HIGH) + g-channel-onserver-cell-read (MED) — same root.

## Step log
- [DONE] Startup verification: pwd = WORKTREE_ROOT, tree clean, bun install, bun run pretest.
- [DONE] Read maps primary.map.md, SPEC §12.2 Trigger 7, §38.4/§38.6/§38.6.1/§38.10, §34 E-CHANNEL rows.
- [DONE] Empirically confirmed bug at HEAD 0e234bae:
    15-channel-chat.server.js:47 → broadcast({... __val: ([..._scrml_body["messages"], ...]) })
    postMessage escalated to _scrml_handler_postMessage_1 with HTTP route + client fetch stub.
    _scrml_body has only author/body args → _scrml_body["messages"] undefined → [...undefined] TypeError.
- [DONE] Corpus survey: ALL publishers pure cell-write, NO actual broadcast()/disconnect() calls.
  emit-server.ts:1624 already carries a DEFERRED note about the onserver server-side-read hole.

## Part 1 — DROP Trigger 7a (channel-cell write no longer escalates) — DONE
- route-inference.ts detectChannelBroadcastReason: removed sub-clause (a) cell-write + channelCells param.
  Docstring + trigger-assembly comment rewritten for RULING A. onclient-skip kept (§38.10 invariant).
- SPEC §12.2 Trigger 7 amended (broadcast/disconnect only; cell-write client-side; E-CHANNEL-SERVER-CELL-READ fwd-ref).
- SPEC §38.4 normative: client-held (no server store); pure cell-write publisher stays client; server-context cell READ rejected.
- SPEC §38.6 normative: cell-write does NOT escalate, only broadcast/disconnect.
- Trigger-7 test inverted: §1 pure cell-write STAYS CLIENT; §5 keyword still escalates via explicit-annotation; +§7 broadcast+write escalates.
- R26 Step 1: 15-channel-chat postMessage now CLIENT (_scrml_reactive_set("messages",...)), NO _scrml_body["messages"],
  NO _scrml_handler_postMessage_1, NO route. server.js routes=[ws only]. node --check both PASS.
- R26 Step 2: all 4 trucking channels client-side, _scrml_body[ count 0, reactive_set(cell) present, --validate-emit clean.
