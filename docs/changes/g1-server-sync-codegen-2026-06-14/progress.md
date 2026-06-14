# Progress — g1-server-sync-codegen-2026-06-14

Change-id: `g1-server-sync-codegen-2026-06-14`. HIGH codegen + coupled SPEC amendment (Q1=C / Q2=WF, S194).
Agent: scrml-js-codegen-engineer. Base HEAD `46377508`.

---

## 2026-06-14 — Startup verification (PASS)
- pwd = `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a779b14a01b6258de` (worktree OK).
- `git rev-parse --show-toplevel` == pwd; branch `worktree-agent-a779b14a01b6258de`; HEAD `46377508`; tree clean.
- `bun install` OK (204 pkgs). `bun run pretest` OK (13 samples compiled).
- Read primary.map.md (§"Task-Shape Routing" → codegen). No dedicated §52/server-sync routing entry (new work). Maps current for codegen.

## 2026-06-14 — PHASE 0 SURVEY + DISPOSITION

### Item 1 — optimistic-update-under-C disposition: **(i) DELETE `emitOptimisticUpdate` entirely.**
Source-derived, NOT a judgment call. Reasoning:
- `emitOptimisticUpdate` (emit-sync.ts:97-118) body is ENTIRELY the sync-route driver:
  `let prev=get(); subscribe(var, async next => { rollback=prev; prev=next; try{ await _scrml_server_sync_<var>(next) }catch{ set(rollback); prev=rollback } })`.
  Every line exists only to drive the now-deleted `_scrml_server_sync_<var>` route. Remove the sync call → empty `try{}` wrapping nothing, dead prev-tracker, no-op subscriber.
- §52.6.2 step 1 "immediate local update: @cards is set client-side" == a PLAIN reactive set (the assignment IS the local update; `_scrml_reactive_set` already does it). No special codegen.
- §52.6.2 step 2 "a generated server route receives the new value and persists it" == the auto-persist route → RETRACTED under C.
- §52.6.3 rollback is defined "if a server write FOR AN OPTIMISTIC UPDATE returns an error" — under C there is no auto server-write, so the rollback TRIGGER is gone. The dev's `?{}` server fn is awaited at the ASSIGNMENT call site (server-fn client stub = `await fetch(...)`, verified emit-functions.ts:678+); its errors are owned by the dev's `!{}` / handler / `on error`.
- DD prose "keep optimistic-local + rollback" (amendment-#1) refers to the CONCEPTUAL property (responsive UI). Mechanically: "optimistic-local" = the plain reactive set (assignment); "rollback" has no auto-trigger left. There is NO separate emitted subscriber to retain. Verified against SPEC §52.6.2/§52.6.3 + source — (i) is the clean answer. NOT (ii); no real true-optimistic case exists that the deleted route didn't own.

### Item 2 — Tier-1 sizing: **SPLIT.** Land Tier-1 INTERIM HONESTY WARNING now; full SELECT*-load/SSR read-authority codegen = committed follow-on.
- Tier-1 (`< Type authority="server" table=>` state-constructor-def + instances `< Type> @cards`) has ZERO sync codegen. `collectServerVarDecls` only matches `state-decl` with `isServer===true` (Tier-2 `<x server>`). Tier-1 instances bind to a registered type (authority on `state-constructor-def.attrs`), NOT a flag on the instance — needs a registry-join collector.
- Full Tier-1 read-authority = a `collectServerAuthorityTypeInstances` (registry-join) + synthetic `SELECT * FROM <table>` initial-load route (implicit load, distinct from Tier-2's dev loadFn) + SSR pre-render + gate. This is materially LARGER than the Tier-2 changes (which are deletions + 1 warning + 1 gate condition). Per brief Phase-0 authorization: SPLIT. Land the interim W-AUTH-class warning (surfaces the silent no-op, §7 finding 1) in THIS dispatch; the SELECT*-load + SSR codegen is a committed follow-on.

### Item 3 — server-file emission gate (emit-server.ts:526-533): under C, server output IS still needed for server-authority cells with a write path — but the WRITE is the dev's `?{}` server fn (which already triggers `serverFns.length>0` → gate opens). A Tier-2 server cell with a dev write fn already emits a server file. The §7-finding-2 gate gap (`hasServerAuthorityCells`) is only reachable when a server-authority cell exists with NO server fn at all — under C that cell has no persist path anyway (warning territory). Adding a `hasServerAuthorityCells` condition is defensive for the Tier-1 SELECT*-load follow-on (which WILL need a server file even with zero dev server fns). Landing it now as forward-prep, gated to not change current output where no Tier-1 load route exists yet.

### Tier-1 honesty: today `< Task authority="server" table>` + `< Task> @tasks` compiles CLEAN with zero codegen + zero diagnostic (SCOPING §7 — worse than Tier-2's stub+W-AUTH-001). Interim warning lands here.

---
## Next: Phase 1 (SPEC amendment) → Phase 2 (codegen) → Phase 3 (R26 verify).

## 2026-06-14 — PHASE 1 (SPEC amendment) — DONE, committed `22e8af2c`
- §52.6 intro: softened "SHALL NOT write any of this manually" for the write verb; §52 = read-authority layer.
- §52.6.2 (now "Assignment Semantics — Local Landing, Developer-Owned Persist"): RETRACTED auto-persist (retraction banner) → immediate-local landing = ordinary reactive set; persist = dev's `?{}`; no `_scrml_server_sync_<var>` stub, no auto-rollback subscriber.
- §52.6.3 (now "Error Handling on a Failed Write"): no auto-rollback; failure owned by dev's `!{}`/`on error`. + "Why no auto-rollback" rationale.
- §52.6.4: no compiler re-fetch; dev's fn re-fetches.
- §52.6.6 (NEW): symmetric dev WRITE-fn convention (Q2=WF), mirror of §52.6.5 load; W-AUTH-001 extended to name missing write path; no synthetic KV table.
- §52.4.5 comment + expected-output; §52.4.2 semantics 2-4; §52.4.4 normative; §52.5 summary table; §52.3.3 query-gen bullet; §52.3.5 expected-output.
- §52.12 SPEC-ISSUE-026 → RESOLVED (consequence of Q1=C/Q2=WF).
- §52.1 motivation bullet; §52.7 protect bullet; §52.9 interaction table + closing; §52.10 deprecation note.
- Cross-refs reconciled: §6.x (2091), §6.10 (5443/5446), §8 batch (6480), §8.11.1 + §8.11.3 (load-coalescing stands; no auto-write routes to isolate).
- §52↔§38 bridge NOT touched (out of scope — Q3 debate). Regen SPEC-INDEX (8 rows). Fences balanced (38).

## Next: Phase 2 codegen.

## 2026-06-14 — PHASE 2 (codegen, Tier-2 + tests) — coupled unit
- emit-sync.ts: DELETED `emitServerSyncStub` + `emitOptimisticUpdate` (disposition (i)). Retained `emitInitialLoad` + `emitUnifiedMountHydrate` (READ path). Rewrote header doc + the load-IIFE comment (`<var server>` form, was `server @var`).
- emit-reactive-wiring.ts: removed the 2 deleted imports; Step 4c now emits READ path only (no stub call, no optimistic call). Section comment → "<var server> read-authority sync".
- Tests (coupled, S113 — committed WITH the code): inverted the locked stub/optimistic/rollback assertions in state-authority-codegen.test.js (§3 now asserts emitters NOT exported + no `_scrml_server_sync_` in client JS; §7/§8 flipped to not.toContain), sync-codegen.test.js (SC2/SC3/SC5/SC6/multi/header), mount-hydrate-coalescing.test.js (§6 + the per-var IIFE comment form). codegen/README.md emit-sync row updated.
- 3 target files: 58 pass / 0 fail.
- NOTE: the earlier background commit of the Phase-1 progress note FAILED the pre-commit hook (transiently-red: emit-sync edited but tests not yet inverted) — the hook correctly refused (S113 protection). Folding that note into this coupled commit.
- Tier-1 read-authority SELECT*-load/SSR codegen = SPLIT to committed follow-on (Phase-0 item 2). Interim honesty warning lands in Phase 2b (type-system.ts) + server-file gate forward-prep.

## Next: Phase 2b (Tier-1 interim warning + server-file gate) → Phase 3 (R26 verify).

## 2026-06-14 — PHASE 2b (Tier-1 interim honesty warning + gate finding) — coupled unit
- type-system.ts: NEW W-AUTH-002 (severity "warning") fires once per recognized `state-constructor-def` with authority="server" + table=. Surfaces the residual read-authority codegen gap (SELECT* load + SSR not yet generated). Negative: local-authority / no-authority types do NOT fire it. Verified via runTS: lands with severity "warning" (non-fatal).
- NEW test tier1-authority-interim-warning.test.js (6 cases, cross-stream findDiag + severity assertion per the diagnostic-stream-partition memory). 6/6 pass.

### DEEPER FINDING (honesty — surface to PA): the colon-field Tier-1 shape does NOT parse as a state type.
- The §52.3.5 SPEC worked-example shape `< Card authority="server" table="cards"> id: number ... </>` (colon-field form, inside `<program>${...}`) parses as a `kind:"html-fragment"` (raw markup text), NOT a `state-constructor-def`. So W-AUTH-002 CANNOT fire on the exact SCOPING §7 silent-no-op reproducer — the type decl is swallowed upstream at parse before it ever reaches the type pass.
- The PAREN-typed-attr form `< Card authority="server" table="cards" id(int) title(string)>` DOES parse as a state-constructor-def (the §S11D.9 discrimination shape) → W-AUTH-002 fires correctly.
- This is the core Tier-1 PARSE gap underlying the silent no-op. It belongs to the Tier-1 SPLIT follow-on: the follow-on must FIRST make the colon-field `< Type ...> field: T </>` form inside `${...}` parse as a state-constructor-def (or reconcile §52.3.5 to the paren-typed-attr form), THEN add the collector + SELECT* load + SSR. W-AUTH-002 is correctly placed at the recognition site and will light up for the colon form once the parse gap closes.

### SERVER-FILE GATE (§7 finding 2) — DEFERRED to the SPLIT follow-on, deliberately NOT flipped now (Rule 3).
- Verified: under Q1=C a Tier-2 `<x server>` WITH a dev write fn already emits a `.server.js` (the dev fns make serverFns.length>0 → gate opens naturally). The §7 gate gap (early-return when serverFns===0 && !needsMountHydrate) only bites a server-authority cell with ZERO server fn — which under C has NO server-side artifact to emit yet (the SELECT* load route is the SPLIT follow-on). Adding `hasServerAuthorityCells` NOW would emit EMPTY server files (no routes) → a regression. The gate condition MUST be added TOGETHER with the SELECT* route emission in the SPLIT follow-on, not before.

## Next: Phase 3 R26 empirical verify + pre-commit gate.

## 2026-06-14 — PHASE 3 (R26 empirical verify) — PASS
- `examples/18-state-authority.scrml`: exit 0 (W-AUTH-001 fires as before; expected). NO `_scrml_server_sync_` / no stub / no `_scrml_prev_` / no `_scrml_rollback_` in client JS. node --check OK on all emitted JS.
- Fresh Tier-2 (`<clicks server> = 0` + dev loadClicks/bumpClicks write fns): exit 0. `.server.js` emitted (dev fns → gate opens). client.js: READ-path load IIFE present (`_scrml_reactive_set("clicks", await _scrml_fetch_loadClicks_5())`) + the new `// --- <var server> read-authority sync` comment; ZERO write-path artefacts. node --check OK.
- Tier-1 reproducers: the recognized PAREN-typed-attr form fires W-AUTH-002; the colon-field §52.3.5 form parses as html-fragment (the parse gap → SPLIT follow-on). Both documented above.
- Final R26 sweep across all reproducers: NO `_scrml_server_sync_` / `server sync stub` / `_scrml_prev_` / `_scrml_rollback_` in any client JS; node --check exit 0 on every emitted .js.
- Pre-commit subset (unit/integration/conformance): 17032 pass / 0 fail / 90 skip (was 17039/0/90 at base — net -7 reflects the inverted/replaced stub+optimistic test cases; +6 new W-AUTH-002 cases). GREEN.

## DEFERRED ITEMS (committed follow-on: Tier-1 read-authority codegen)
1. **Tier-1 PARSE gap (blocks the rest):** make the colon-field `< Type ...> field: T </>` form inside `${...}` parse as a `state-constructor-def` (today → html-fragment), OR reconcile §52.3.5 to the paren-typed-attr form. Until this, W-AUTH-002 + any Tier-1 codegen cannot reach the §52.3.5 shape.
2. **`collectServerAuthorityTypeInstances`** collector (registry-join: state-constructor-def authority="server"+table= ↔ instances `< Type> @var`).
3. **SELECT * initial-load** synthetic route from `table=` (server-side) + SSR pre-render.
4. **Server-file emission gate:** add `hasServerAuthorityCells` to the early-return (emit-server.ts:526-533) — MUST land WITH #3 (flipping it alone emits empty server files = regression).
5. Flip the §9 scaffold assertion in state-authority-codegen.test.js (`SELECT * FROM cards`) when #3 lands.

## STATUS: Phase 1 (SPEC) + Phase 2/2b (Tier-2 codegen + Tier-1 interim warning) COMPLETE. Tier-1 read-authority SELECT*/SSR = SPLIT to follow-on (above). G2 §52↔§38 bridge = out of scope (Q3 debate).
