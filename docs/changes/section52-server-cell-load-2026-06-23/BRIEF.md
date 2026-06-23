# DISPATCH BRIEF — §52 Tier-2 `<var server> = ?{}.get()` server-cell LOAD codegen (stop the `?{}` client leak)

change-id: `section52-server-cell-load-2026-06-23`
gap: `g-section52-server-cell-load-codegen` (HIGH · tier med) — sPA ss1 item 3.
branch base: `spa/ss1` tip `886bc178` (items 1+2 landed; item 2 touched emit-server.ts + api.js). You edit
emit-server.ts TOO — you MUST base on 886bc178 or you clobber item 2. `git merge spa/ss1` in startup;
confirm `git merge-base --is-ancestor 886bc178 HEAD`.

## THE BUG (sPA-verified R26 @886bc178)
A Tier-2 `<var server>` whose initial value is an INLINE `?{}` SQL leaks the UNLOWERED `?{}` into the CLIENT
bundle → `E-CODEGEN-INVALID-JS`. **Reproduced (bare cell, NO engine):**
```
<program db="sqlite:./test.db">
<driver server> = ?{ `SELECT * FROM drivers WHERE id = 1` }.get()
<main><p>loaded</p></main>
</program>
```
→ `error [E-CODEGEN-INVALID-JS]: the compiler emitted JavaScript it cannot itself parse`, failing byte
`reactive_set("driver", await (?{ /* sql */ }.get()))`. The `?{}` is a SERVER-ONLY SQL placeholder; the
client cannot evaluate it.

**Root cause (precise):** `emit-reactive-wiring.ts:679` calls `emitInitialLoad(varName, initExpr)`
(`emit-sync.ts:58`). `emitInitialLoad` wraps ANY callable initExpr (`initExpr.includes("(")`) in a
CLIENT-side `_scrml_reactive_set("var", await (initExpr))`. For an inline-`?{}` init, `initExpr` is
`?{...}.get()` (has `(` from `.get()`), so the raw `?{}` is emitted client-side.

**Why the SERVER-FN-call form already works (do NOT touch it):** `<cards server> = loadCards()` where
`loadCards` is a `?{}` server fn (§52.6.5 Pattern A) — `loadCards` route-infers SERVER-side and lowers to a
CLIENT fetch-stub, so `_scrml_reactive_set("cards", await (loadCards()))` is correct (loadCards() IS a
client fetch). ONLY the INLINE `?{}` (no server fn to route-infer) leaks.

## THE FIX — mirror the Tier-1 server-load mechanism for Tier-2 inline-`?{}`
The Tier-1 (`<Type authority="server" table="…">`) read-authority path is the TEMPLATE and is ALREADY BUILT:
- `emit-sync.ts:104 emitServerAuthorityLoad(varName, table)` — CLIENT-side `fetch("/__serverLoad/<var>", {POST})`
  then `_scrml_reactive_set(var, await res.json())`.
- `emit-server.ts:1996-2015` — SERVER-side `/__serverLoad/<var>` route handler running the query (`SELECT *
  FROM <table>`) and returning JSON.
- `emit-reactive-wiring.ts:701` wires the client load.

Extend this to **Tier-2 `<var server>` cells whose init is an inline `?{}`**:
1. **emit-server.ts** — for each Tier-2 `<var server>` with an inline-`?{}` init, emit a `/__serverLoad/<var>`
   route whose handler runs the cell's ACTUAL `?{}` query server-side (NOT `SELECT * FROM table` — the real
   `?{}` from the decl, lowered the same way a server fn's `?{}` body is) and returns the `.get()`/`.all()`
   result as JSON. Mirror the `_serverAuthorityInstances` loop at 1996; collect the Tier-2 inline-`?{}` cells
   alongside it.
2. **emit-sync.ts / emit-reactive-wiring.ts** — in `emitInitialLoad`, detect an inline `?{` in initExpr →
   emit the CLIENT fetch form (POST `/__serverLoad/<var>`, like `emitServerAuthorityLoad`) INSTEAD of
   `_scrml_reactive_set(await (?{...}))`. Keep the existing `_scrml_reactive_set(await (initExpr))` for the
   server-fn-call case (no `?{`). The cell's client placeholder is absence (`not`) until the fetch lands
   (§52.4.3).
3. The §51.0.E engine-hydration (`<engine server=@source>`) RIDES this cell — `emitEngineVariantCellInit`
   (emit-engine.ts:1578-1590, BUILT) subscribes to the cell. Fixing the cell-load fixes BOTH the bare
   `<driver server>=?{}` AND `<engine for=T server=@driver.current_status>`. Verify both in R26; you should
   NOT need to change emit-engine.ts (confirm it just works once the cell loads).

## PARAM DISPOSITION (Phase-0 decision — do NOT guess)
The §51.0.E canonical example uses a PARAM-BEARING inline `?{ … where id = ${@driverId} }`. Determine in
Phase 0:
- **(a)** Does a client-local `${@cell}` inside an inline `<var server>`-init `?{}` fire **E-AUTH-001**
  (§52.4.6 — client-local in a `?{}` outside a server fn)? If so, the param-bearing inline form is an ERROR
  steering the dev to the server-fn form (`<driver server> = loadDriver(@driverId)`, already-works Pattern A)
  — then your fix correctly covers ONLY the param-FREE inline `?{}` (the verified repro), and the
  param-bearing inline case is a deliberate E-AUTH-001, not your concern.
- **(b)** If a `${@cell}` in a `<var server>`-init SELECT is ALLOWED (read, not persist), the server-load
  route must accept the bound params (POST body, like server-fn CPS). If that param-passing is bounded,
  implement it; if it balloons the blast radius, implement the param-FREE core + FLAG the param-bearing
  inline case as a documented follow-on residual (do NOT silently half-do it).
Report which branch (a)/(b) you found and what you implemented.

## R4 — SPEC IS NORMATIVE (read before coding; surfaced residual)
Read §52.4.2/§52.4.3 (SPEC.md ~29142-29163), §52.6.1 (29287), §52.6.5 (29353), §51.0.E (25414-25495) in
full. The fix direction is settled (§51.0.E's own example uses `<driver server> = ?{}.get()`; §52.4.2 +
§52.6.1 mandate the compiler generate the fetch-on-mount; dpa-005
`scrml-support/docs/deep-dives/server-authoritative-engine-2026-06-23.md` ruled "build the existing spec").
**Known SPEC-currency tension (the sPA flagged it for the PA — do NOT try to resolve it):** §52.4.3 calls
the RHS "the client placeholder," yet §51.0.E uses a `?{}` RHS as the load, and §52.6.5 enumerates only
Pattern A (assignment-inferred) + Pattern B (`on mount`) — NOT the decl-RHS-`?{}` form. Your job is the
CODEGEN (make §51.0.E compile). The SPEC-text reconciliation is PA-owned. If your fix needs a NEW error code
or a SPEC normative change, STOP and report (escalate) — do not amend SPEC.

## OUT OF SCOPE (do NOT pull in)
The §52 WRITE-BACK path (flux G1 write — `emit-sync.ts` had an `emitServerSyncStub` no-op; Tier-1
server-route write gen) is a SEPARATE bigger arc. This item is the READ/LOAD half ONLY.

## R26 EMPIRICAL VERIFICATION (mandatory — do NOT mark DONE without it)
Repros under `docs/changes/section52-server-cell-load-2026-06-23/repro/`:
- `bare-cell.scrml` — the param-free `<driver server> = ?{`SELECT * FROM drivers WHERE id = 1`}.get()` above:
  compile → NO `E-CODEGEN-INVALID-JS`, NO `?{` in any `.client.js`, a `/__serverLoad/driver` route IS emitted
  in `.server.js`, the client `.client.js` POSTs to it on mount; `node --check` clean on both bundles.
- `engine-rides.scrml` — the §51.0.E shape: `<driver server> = ?{...}.get()` + `<engine for=DriverStatus
  server=@driver.current_status initial=.OffDuty>` (+ the DriverStatus enum + a Driver type w/
  current_status field): compile → no E-CODEGEN-INVALID-JS, no `?{` client leak, engine hydrates from the
  loaded cell.
- CONTROL — server-FN-call init still works: `<cards server> = []` + `on mount { @cards = loadCards() }` (or
  `@cards = loadCards()`) where `loadCards` is a `?{}` server fn → still lowers to the client fetch-stub form,
  no regression, no new `/__serverLoad` route for it.
- Full `bun run test` green (incl. browser for load-bearing emit files); re-baseline any integration snapshot
  that legitimately changes ONLY if it's the intended fix (log each — S211 no-silent-baseline-churn).

## TESTS (coupled — same commit)
Add unit/integration tests: (1) inline-`?{}` `<var server>` → `/__serverLoad/<var>` route emitted + no client
`?{` leak + no E-CODEGEN-INVALID-JS; (2) the engine-rides case compiles; (3) server-fn-call init regression
(still the fetch-stub form). Find the existing §52 test home: `grep -rln "serverLoad\|emitInitialLoad\|var server\|§52" compiler/tests`.

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S90/S99/S126)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-` (repo is `scrml`,
   NOT scrmlTS). Else STOP. Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean.
4. `git merge spa/ss1` to reach base `886bc178`; confirm `git merge-base --is-ancestor 886bc178 HEAD`.
5. node_modules resolves — if absent, symlink from main (`ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules` + `.../compiler/node_modules ./compiler/node_modules`); verify a sample compile.
6. Baseline: compile the bare-cell repro, CONFIRM the E-CODEGEN-INVALID-JS + `?{` leak BEFORE changing anything.
- Edits ONLY to worktree-absolute paths incl. `.claude/worktrees/agent-<id>/`. NEVER the bare main root.
  Prefer Bash edits (perl/python3/heredoc); echo path before + `git diff` after. NEVER `cd` into main; use
  `git -C "$WORKTREE_ROOT"`. First commit msg embeds startup `pwd`: `WIP(s52-load): start at $(pwd)`.

## CRASH RECOVERY — commit per sub-part; update this change-id's progress.md each step; status clean before DONE.
## COMMIT DISCIPLINE — code + coupled test ONE commit; NEVER `--no-verify` (hook runs full suite ~108-124s,
foreground, timeout 300000ms); report FINAL_SHA + FILES_TOUCHED (worktree-absolute) + WORKTREE_PATH.

## SCOPE GUARD
Expected surface: `emit-server.ts` · `emit-sync.ts` · `emit-reactive-wiring.ts` · maybe `codegen/index.ts` ·
`collect.ts` (if you collect Tier-2 inline-`?{}` cells there) + tests + repro + progress.md. Do NOT touch
route-inference.ts (items 1/4/5). emit-engine.ts SHOULD be read-only (the engine rides for free — if you
find it needs a change, report it). If the fix needs SPEC changes / a new error code / files beyond this
surface → STOP and report (blast-radius / escalation).

## FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · Phase-0 repro outcome + the (a)/(b) param
disposition you found + implemented · R26 table (bare-cell, engine-rides, server-fn-call control) · whether
emit-engine.ts needed any change · test delta · every baseline re-touched + why · SPEC-currency note (did you
need any SPEC/error-code change → if so you should have STOPPED) · any blast-radius surprise. Raw report —
your final message IS the return value.
