# D4c progress — migrate `server function` out of DOCS worked-examples

Change-id: server-keyword-eliminate-2026-06-10 (D4c of 5).
Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad93e40f2f5511e24
Base: e1d4f88c (== origin/main; merge "Already up to date").

## 2026-06-11 — startup
- pwd / toplevel / status verified; merge already up to date; bun install + pretest OK.
- maps/primary.map.md read in full (compiler-internal nav; largely not load-bearing for docs-migration).
- D4-INVENTORY.md §Docs read.
- Baseline grep:
  - SPEC.md: 234 `server function`; 30 `server function*` (SSE); 81 decl-shaped `server function NAME(`.
  - kickstarter: 33 / 6 SSE / 21 decl-shaped.
  - PRIMER: 12 / 0 SSE / 5 decl-shaped.
- NB: inventory said SPEC ~70 decls; live grep shows 81 decl-shaped — lines shifted + possible new sites post-D2; re-verifying every site against actual text.

## Plan
1. Enumerate every decl-shaped site per file; classify per inventory + actual body.
2. Migrate SPEC.md first (commit), then kickstarter (commit), then PRIMER (commit).
3. Spot-compile 4-6 representative migrated examples.
4. Grep-gate residuals; regen SPEC-INDEX if headings shifted.

## 2026-06-11 — execution complete
### SPEC.md (commit 0692c43b)
- 49 SQL/trigger-bodied + 8 channel(T7) + 4 handle(T8, incl §39.3.2 signature) = 61 strip -> function. (60 same-line strips + loadUser body-expand.)
- computeDouble 28709 -> server fn (E-AUTH-002 teaching pure-server-pin).
- Illustrative: processEvent 12428 strip; badFn 18177 strip (E-SSE-001 preserved); submitRequest 17338 + loadUser 12915 given ?{} bodies to escalate (loadUser CPS example expanded 1->4 body lines, +4 net file lines).
- LEAVE: getProfile 13968 + checkAuth 14006 (session-only E-SCOPE-012); handleOpen 18810 (E-CHANNEL-006 negative, server IS subject); §52.10 28875/28878 + §34 16648 + Insight-26 teaching; prose 3297/7044/8211/12567/12615/14023/19567/19735/20729; logEdit 28690 (compiler error-output suggestion, not in inventory — FLAGGED); all 30 SSE function*.

### kickstarter-v2 (commit 2e8ce9ca)
- 11 SQL + 1 channel(1338) + 1 handle(1544) + 2 oauth(1295/1300, escalate via scrml:oauth/scrml:redis server-only imports per SPEC §12.2 L6956) + 2 worker stubs(1767/1814, FLAGGED) = 17 strip.
- redeem 1563 -> server fn (lin example pure-server-pin).
- LEAVE: row 109 + prose 1124/1539 + SSE liveCount(1833,6 function*).

### PRIMER (commit 7ddf5e40)
- 4 strip: fetchItems 143, loadUser 596, publish 631, postMessage 819(channel T7).
- LEAVE: form-overview block 186-196 (S175 quote + g-server-keyword-drift); table row 517; prose 833/1004/1007.

### SPEC-INDEX (commit 864cc88a)
- Regenerated after +4 SPEC line shift; 46 row ranges updated, 0 missing. Summaries preserved.

### Spot-compiles (all stayed server-boundary)
- SQL (getUser ?{}): SELECT in .server.js, 0 in .client.js.
- handle: X-Response-Time in .server.js(1), .client.js(0); woven via Trigger 8.
- channel postMessage: __sync/postMessage in .server.js(7); client gets WS mirror.
- serverfn computeDouble: server handler + __ri_route in .server.js; client has CPS fetch wrapper.
- kickstarter redeem(server fn lin): body in .server.js(1), client(0), lin enforced.
- kickstarter contacts(SQL): INSERT in .server.js(1), client(0).

### FLAGGED (surface to PA)
1. logEdit 28690 SPEC + getUser-prose 14023 SPEC: compiler error-OUTPUT suggestion text still shows `server function` (deprecated). NOT in inventory (inventory only listed computeDouble). LEFT untouched per scope-discipline. PA decision: should compiler-emitted fix-suggestions migrate too?
2. compressImage 1767 + indexNewDocs 1814 (kickstarter worker/sidecar stubs, elided bodies): stripped to `function` (run server-side inside worker `<program>`; keyword redundant there). Could alternatively get a real trigger body. Chose strip (least-invasive).
3. processEvent 12428 + badFn 18177 (SPEC illustrative): stripped to plain `function` (stay client; their teaching points — partial-match / E-SSE-001 — hold regardless). submitRequest 17338 + loadUser 12915: given ?{} bodies (must demonstrate server-escalation / CPS).

### Residual grep-gate (all LEAVE-legitimate)
- SPEC: 16 prose/teaching/session-only/negative + 30 SSE.
- kickstarter: 3 prose + 6 SSE.
- PRIMER: 1 table-row + (186-196/833/1004/1007 prose, non-decl-shaped) + 0 SSE.
