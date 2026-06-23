# sPA ss1 — progress log (append-only)

Branch: spa/ss1 · Worktree: ../scrml-spa-ss1 · provisioned off origin/main 72dc4fdb (S208).

## 2026-06-19 (S208 continuation)
- BOOT: spa/ss1 worktree created off origin/main (72dc4fdb); node_modules symlinked; status clean.
- ITEM 1 `g-route-mis-inference-server-called-pure-helper` [in-flight]:
  - Reproduced on examples/23-trucking-dispatch: 6 W-SERVER-IMPORT-UNEMITTED (MISSING-EXPORT) warnings; 80 total warnings.
  - Diagnosis (sPA-verified, corrects known-gaps.md:1494 framing):
    * auth.server.js emits ONLY __ri_route_rolePath_7 + routes + fetch.
    * rolePath escalates via route-inference Step 5c caller-context propagation (LOAD-BEARING, ss9-adjacent — NOT a bug; do not touch).
    * Constants (SESSION_TTL_SECONDS/SESSION_DB_PATH/...) never route-infer — .server.js simply has no value-export emission path in browser mode.
    * Fix = emit-server.ts value-export emission (Option 1 broadened); mirror emit-client.ts:114/193 §21.3 collector as native ESM exports.
  - Dispatched scrml-js-codegen-engineer (agent a13ffe30048e19246, isolation:worktree, opus). BRIEF.md archived.
  - DISPATCH MISS: first Agent() call (a13ffe30048e19246) omitted explicit isolation:"worktree" → ran in MAIN; F4 startup-verification gate halted it, zero damage. Re-dispatched WITH isolation:"worktree" (agent a6eb2c2fd9ba6086b). [S88: isolation must be explicit on every dev dispatch.]

## ITEM 2 `server-generator-yield-serializability` [scoped, held]
- Root: type-system.ts:3872-3873 — RETURN-direction E-ROUTE-003 check is `if (!isGenerator)`, so SSE generators are SKIPPED entirely. Bug = a non-serializable YIELD-ELEMENT type is never gated.
- Test: compiler/tests/unit/route-wire-serializability.test.js:312 is `test.skip("DEFERRED: ...")` asserting e003 count == 1 on a generator yielding a non-serializable value.
- Deferral reason (real): the AST does not expose a resolved yield-element type at the decl-site pass; needs body-walk inference of each `yield <expr>`. NOTE: the skipped test's `yield buildSnippet()` has an UNDEFINED callee → return type unknown → asIs → ALLOW; canonical fire-shape needs a KNOWN non-serializable yield (markup / fn-typed value / annotated non-serializable type). SPEC §12.5.3 + §37.4 (yielded frames JSON-serialized) govern.
- Classification: buildable execution item (behavior is SPEC'd; LOW priority), but a real type-inference follow-on — NOT a gate-flip. HELD until item 1 lands (both touch the codegen/type-system area; sequence verification). Needs SPEC §37.4 yield-frame confirm + expression-typing availability at this pass before brief.

## ITEM 6 `phase-a4-schema-refinement-pinned` [verified-shipped, close held for PA]
- Verified live (R26 both-directions): refinement = 46 hits in type-system.ts (three-zone, S69 shipped); schemaFor = present in emit-html.ts (walker+migration) + protect-analyzer.ts (lowering, S104 shipped).
- Premise holds: legacy S58 A4 phase row is stale → closeable. NO code work.
- HELD: the master-list.md §0.1 A4 close-edit is PA-owned backlog reconcile + parallel ss11 may touch master-list — propose the close in the PA hand-off batch, do NOT edit the PA backlog from spa/ss1 mid-flight.

## ITEM 1 LANDED [landed-on-branch spa/ss1]
- Agent a6eb2c2fd9ba6086b @254346e0; file-delta'd 6 files onto spa/ss1.
- Independent R26 re-verify (sPA, on spa/ss1 working tree): trucking warnings 80→74; W-SERVER-IMPORT-UNEMITTED 6→0; auth.server.js exports now include SESSION_COOKIE_NAME/SESSION_TTL_SECONDS/SESSION_DB_PATH/DISPATCH_DB_PATH/readCookieValue/readSessionCookie/buildSessionSetCookie/checkRole/rolePath + __ri_route_rolePath_7/routes/fetch. compile errors 0 (Approach-A parse gate green).
- Agent surfaced 3 extra correctness fixes my auth-only repro missed: (1) markup-valued consts (`export const DriverCard=<markup/>`) skipped; (2) server-`match` async-wrapper → exported pure-fn bodies lowered boundary:"client" (sync IIFE); (3) `?{}`-body operation fns (seeds runSeeds) skipped via recursive server-only-body check. route-inference.ts untouched (constraint honored). Full `bun run test` 24529 pass / 237 skip / 0 fail.
- RESIDUAL for PA (NOT ss1 scope): MISSING-FILE branch — a CONST-ONLY module with NO server content emits no .server.js, so a server-USED const import still dangles + still fires W-SERVER-IMPORT-UNEMITTED. Option-1 force-emit-.server.js rejected by sibling g-pure-module Fix A (link-errors on erased TYPE imports). Distinct residual; flag in known-gaps.

## ITEMS 2-5 PARKED → PA (verified dispositions, not assumptions)
- ITEM 2 `server-generator-yield-serializability` [parked]: real bug (E-ROUTE-003 hole on SSE `server function*` yields, type-system.ts:3872 `if (!isGenerator)` skips return-dir). BUT `yield-stmt.expr` is a RAW STRING (ast-builder.js:7427+) and NO value-expression typer exists (only resolveTypeExpr on annotation strings). Fix needs a value-expr typer (blast-radius > the list's server-emit/RI/wire triangle) + a normative decision on the canonical non-serializable-yield fixture (the existing test.skip at route-wire-serializability.test.js:312 uses an undefined `buildSnippet()` → asIs → wouldn't fire). → focused follow-on / small DD. SPEC §37.4 (yielded frames JSON-serialized) is the basis.
- ITEM 3 `g-sql-row-protect-leak` [parked]: SPEC.md §14.8 (8018-8030) EXPLICITLY marks the protected-column-projection leak "DEFERRED ... a data-flow / server-fn-return concern for a follow-on (return-boundary / E-ROUTE-003)." Net-new HIGH-tier static data-flow analysis, no specced algorithm → needs design pass, not an sPA dispatch.
- ITEM 4 `bunsql-postgres-mysql-phases` [parked]: protect-analyzer.ts:190-201/787-795 — postgres/mysql URIs use a SHADOW sqlite DB; "Phase 2 does NOT add a real Postgres connection; that is Phase 2.5"; "real driver introspection at compile time is deferred." Needs the async protect-analyzer migration (architectural arc). MySQL real introspection = same blocker.
- ITEM 5 `p4-sql-batching-deferred-complexity` [parked]: the list itself labels these "Five named POST-V1 extensions." Prioritization-deferred; building post-v1 work now violates ordering. (Note: `--show-batch-plan` is the one small self-contained debug-flag slice if ever pulled forward.)

## ITEM 6 `phase-a4-schema-refinement-pinned` [landed-on-branch spa/ss1] — A4 row CLOSED
- Verified ALL THREE A4 parts shipped (verify-before-claim, not just the 2 named): pinned (A1a Step 6 bareword + A1c hoisting, SPEC §6.10/§6.9.3, E-STATE-PINNED-FORWARD-REF, importBindings.pinned plumbed) · refinement three-zone (A1b B21 `c5f9dcf` S69, §53, 46 type-system.ts hits) · schema/schemaFor (S104, emit-html.ts + protect-analyzer.ts). master-list.md §0.1 A4 status `⏸️ pending A3` → `✅ CLOSED`. A5's "pending A4" blocker now moot (noted, A5 not edited — not an ss1 item).

## ss1 SESSION DISPOSITION (S208): 6/6 items dispositioned
- Item 1 INTEGRATED-PENDING (landed spa/ss1 @795704c1, code fix). Item 6 LANDED (doc close). Items 2/3/4/5 PARKED→PA (design-deferred / async-blocked / post-v1). PA re-integrates spa/ss1 → main + routes 2/3/4/5 to the design track.

## 2026-06-23 (S215 REFRESH RUN — new 5-item list)
- BOOT: prior S208 run fully re-integrated by PA (795704c1 in main; old worktree+branch cleaned). Fresh worktree spa/ss1 provisioned off LIVE main HEAD `0d4ba428` (session-start snapshot df6f747b was stale; 0d4ba428 includes the S215 list refresh + typer render-allowlist). node_modules symlinked; status clean; lineage sane.
- ITEM 1 `g-route-001-local-computed-write` [DISPATCHED]:
  - R26 REPRODUCED: examples/28-flux.scrml `bumpLeftVision()` — `let result = nonce.slice()` then `result[idx]=result[idx]+1` over-fires E-ROUTE-001 (1 fire, 2 warnings total). Fire site route-inference.ts:953 `COMPUTED_MEMBER_REGEX.test(expr)` — zero receiver-reachability check.
  - Root: walkBodyForTriggers warns on ANY `ident[` outside worker bodies. Fix = function-body-scoped localArrayBindings set (populated in let/const/tilde-decl branch when init is array-COW + references no protected field), suppress E-ROUTE-001 when ALL computed receivers are known-safe locals. Walker visits decl before nested use → ordering works.
  - Dispatched scrml-js-codegen-engineer (agent af0f8f7618ba19be4, isolation:worktree, opus). BRIEF.md archived docs/changes/route001-local-array-suppress-2026-06-23/. Scope-guarded to route-inference.ts + its unit test.
- ITEM 2 `g-const-only-module-no-server-emit` [SCOPED, brief drafted, held for sequencing]:
  - Code-path proof: emit-server.ts:761-768 short-circuits `return ""` for const-only modules BEFORE emitModuleValueExportLines (called 1997) is reached → no .server.js. api.js:2145 MISSING-FILE branch then fires when server-imported. emitModuleValueExportLines (340-541) already filters to value-only (no erased types).
  - Fix decision (R3): on-import emission (cross-file, only for actually-server-imported const-only modules) NOT always-emit (corpus churn). BRIEF.md drafted docs/changes/const-only-module-server-emit-2026-06-23/. Agent builds the repro in Phase 0.
- ITEM 3 `g-section52-server-cell-load-codegen` [SPEC located, light-touch]:
  - R4: §52 = SPEC.md 28914-29798 (READ-authority + reactive-wiring; persist-write is dev's explicit ?{} server fn — matches item-3 READ/LOAD-only scope). §51.0.E = 25318. Full read deferred to brief-time (after items 1-2 land; emit-server surface shifts under item 2).
- SEQUENCING: running items SEQUENTIALLY (not parallel) — items 1/4/5 all edit route-inference.ts (line-disjoint but same file), items 2/3 share emit-server.ts; S211 shared-baseline collision lesson. Item 5 blocked-by item 3 (dependency). Order: 1 → 2 → 3 → 4 → 5.

### ITEM 1 LANDED [landed-on-branch spa/ss1]
- Agent af0f8f7618ba19be4 @d2da0729 (base ff-merged to 0d4ba428). File-delta'd route-inference.ts + route-inference.test.js onto spa/ss1.
- Independent R26 (sPA, on spa/ss1 working tree): flux E-ROUTE-001 1→0; flux total warnings 2→1 (remaining = info W-PROGRAM-SPA-INFERRED, unrelated). route-inference.test.js 180→188 pass (+8 g-route-001), 0 fail.
- Fix: receiver-reachability gate — localArrayBindings (body-scoped, COW-init + no-protected-provenance) suppresses E-ROUTE-001 when ALL computed receivers are known-safe locals; fires if any receiver is param/unknown (row[fieldKey]). Warning-scope only; escalation/route logic untouched.
- Adversarial review (S215): controls cover param-receiver / protected-provenance-slice / member-protected-slice / mixed-receiver / worker-body / direct-only — all fire-correct. Noted exotic over-suppression residual (a COW local later REASSIGNED to protected data via bare assignment stays in safe set) — accepted: E-ROUTE-001 is advisory-only, never escalates routing, so a missed advisory there is harmless.
- spa/ss1 commit SHA recorded next append.

## ITEM 3 PRE-SCOPE (R4 SPEC read + dpa-005 ruling + R26) — done during item-2 wait
- R4 SPEC read: §52.4.2/§52.4.3 (Tier-2 <var server>; RHS = client placeholder for STATIC forms []/0/not), §52.6.1 (initial load = compiler-generated server fetch on mount), §52.6.5 (load patterns A=assignment-inferred, B=on-mount), §51.0.E (E-leg server=@source; its CANONICAL example uses `<driver server> : Driver = ?{...}.get()` — RHS-?{} as the fetch-on-mount load).
- dpa-005 ruling (server-authoritative-engine-2026-06-23.md): item 3 = "build the EXISTING spec, not a new primitive." Approach A≡B (server-owns-truth/client-derives); Approach C (new primitive + auto-fan-out) debated-DOWN (S174 Q3). 3 experts converge. The §52 read/load codegen IS the build. → SETTLED CODEGEN, NOT an escalate.
- Required behavior: lower decl-RHS-?{} server-cell load to a SERVER fetch-on-mount; client cell placeholder = absence (not) until resolve; NO ?{} in client bundle. The §51.0.E engine-hydration (emitEngineVariantCellInit emit-engine.ts:1578-1590, BUILT) RIDES the cell — fixing the cell-load fixes both bare <driver server>=?{} AND <engine server=@source>.
- R26 REPRODUCED (sPA, spa/ss1 worktree): bare `<driver server> = ?{`SELECT * FROM drivers WHERE id=1`}.get()` (NO engine) → E-CODEGEN-INVALID-JS, exact byte `reactive_set("driver", await (?{ /* sql */ }.get()))`. Matches dpa-005-VERIFIED df6f747b. Emit gate aborts writes (no client.js).
- SPEC-CURRENCY RESIDUAL for PA (R4 surface, NOT blocking): §52.4.3 (RHS=placeholder) vs §51.0.E (RHS-?{}=load) are in tension; §52.6.5 enumerates only Pattern A/B, not the decl-RHS-?{} load form §51.0.E uses. Fix DIRECTION is unambiguous (make §51.0.E compile per §52.4.2/§52.6.1 + dpa-005), but SPEC text should be reconciled (add decl-RHS-?{} as a recognized §52.6.5 load pattern, OR migrate §51.0.E to on-mount). PA owns SPEC reconciliation.
- Emit-surface scoping + brief DEFERRED to post-item-2 (emit-server.ts shifts under item 2). Files: emit-server.ts · codegen/index.ts · emit-reactive-wiring.ts · emit-engine.ts. OUT OF SCOPE: §52 WRITE-BACK (flux G1) — separate bigger arc.

### ITEM 2 LANDED [landed-on-branch spa/ss1]
- Agent a8a0240fff036e118 @03c489f0 (base b307c332, 0-behind clean-ff). File-delta'd api.js + emit-server.ts + w-server-import-unemitted.test.js + repro/ + progress.md onto spa/ss1.
- Layer: on-import cross-file pre-pass in api.js (emitValueOnlyServerJsForDanglingImports) BEFORE checkServerImportInvariant — matches the R3 recommended approach (only emits for ACTUAL dangling server-imports w/ value exports; client-only const modules untouched). New generateValueOnlyServerJs in emit-server.ts reuses emitModuleValueExportLines + extracted SERVER_STRUCTURAL_EQ_HELPER/injectAfterHeader (byte-identical, 66 server-eq tests + dedicated server-eq-helper-import.test.js 11-pass green).
- Independent R26 (sPA, spa/ss1 worktree): repro W-SERVER-IMPORT-UNEMITTED >=1->0; config.server.js emitted with `export const MAX_ROWS=100` + `export const DB_PATH="./repro.db"`, NO ?{ leak, node --check CLEAN; w-server-import-unemitted.test.js 4->5 pass; trucking W=0 unchanged (no corpus churn).
- ADVERSARIAL test-inversion review (S215): §3 OLD asserted MISSING-FILE FIRES for a value-const module (`export const TTL=3600`) = LOCKING THE BUG; fix resolves it; §3 inverted to assert no-fire + emitted value export = LEGITIMATE. §4 re-pointed from the now-fixed value-const shape to a genuinely-still-dangling markup-component-const (correctly skipped by markup filter) to preserve the partition test. §5 NEW scope-guard (client-only const -> no dead .server.js). Inversion is correct re-baselining, NOT weaken-to-green.
- spa/ss1 commit SHA recorded next.

## ITEM 3 DISPATCHED + ITEM 4 LIGHT-SCOPE (during item-3 wait)
- ITEM 3 `g-section52-server-cell-load-codegen` [DISPATCHED agent aeddf7ab5015bc5d4, base 886bc178]:
  - Root cause (sPA-verified): emit-sync.ts:58 emitInitialLoad wraps any callable initExpr in CLIENT `_scrml_reactive_set("var", await (initExpr))`; for inline-?{} init the raw ?{} leaks client-side. Fix mirrors the BUILT Tier-1 path (emit-sync.ts:104 emitServerAuthorityLoad client fetch + emit-server.ts:1996 /__serverLoad/<var> server route) for Tier-2 inline-?{} cells. Server-fn-call init (Pattern A) already works (fetch-stub). Engine rides for free (emit-engine.ts:1578 read-only).
  - Param disposition (param-bearing inline ?{...${@cell}...}) left to agent Phase 0: E-AUTH-001 (→ dev uses server fn) vs CPS param-passing. BRIEF.md archived docs/changes/section52-server-cell-load-2026-06-23/.
- ITEM 4 `g-route-attr-for-server-generator-app-mode` [LIGHT-SCOPED, sequential-after-3]:
  - dpa-002 plumbing CONFIRMED present: explicitRoute/explicitMethod are RouteInfo fields (route-inference.ts:258-259); :3700-3701 sets them incl. explicitMethod:"GET" for isSSE; emit-server.ts:1237 uses explicitRoute for path; :1244 `if(route.isSSE)` SSE handler exists. Footprint L1099/L1205 are STALE (file shifted under item 2 + S215). Gap is narrow — the route= author-path for `server function*` in APP mode (likely parser/hasExplicitRoute for generators). Tier-low; agent Phase-0 pinpoints via dpa-002 artifact serve-side-raw-route-2026-06-23.md. Edits route-inference.ts + emit-server.ts → sequential after item 3 (shares emit-server.ts) + items 1/4/5 share route-inference.ts.
- ITEM 5 ready: dpa-005 supplies exact replacement text for route-inference.ts:3534-3542 (message-only); blocked-by item 3.

### ITEM 3 PARTIAL-LANDED + PARKED [partial-landed spa/ss1 + escalate-to-PA]
- Agent aeddf7ab5015bc5d4 @2454fab2 (base 886bc178). REFRAME: the briefed codegen-load-fix was the WRONG LAYER. Actual root cause = a PARSER contract gap: the V5-strict markup-form decl (`<x> = ?{}` / `<x server> = ?{}` / `const <x> = ?{}`) was the ONLY decl form not routing inline-?{} through tryConsumeSqlInit → no sqlNode → unresolved sql-ref ExprNode (nodeId:-1) → codegen leaked raw ?{} into client (server form, E-CODEGEN-INVALID-JS) OR emitted a false `null /* sql-ref unresolved...upstream parser/AST bug */` comment (non-server form, a SIBLING bug). type-system.ts:8894 already ASSUMED this site attaches sqlNode.
- FIX LANDED (ast-builder.js + parse-shapes-v0next.test.js §S11F): markup form now attaches sqlNode (init:"") like every sibling form. STOPS the crash + the security-relevant client ?{} leak + the false-bug comment, across ALL markup-form ?{} decls. File-delta'd onto spa/ss1 (ast-builder.js untouched by items 1/2 — conflict-free).
- Independent R26 (sPA): bare-cell E-CODEGEN-INVALID-JS 1→0, client ?{ leak 0, client node --check CLEAN (W-AUTH-001 fires = expected partial state); engine-rides §51.0.E compiles no-leak; server-fn-call CONTROL no regression; non-server <cards>=?{} now emits honest "declare as server @cards" E-CG-006 steer (was false-parser-bug comment); corpus combined-007-crud.scrml compiles clean. Full suite 17619→17625 pass / 0 fail.
- ADVERSARIAL test review (S215): §S11F.1-6 OLD asserted `init=="?{`SELECT 1`}"` = LOCKING THE BUG (raw ?{} string in init, the leak cause); fix attaches sqlNode; tests re-baselined to assert sqlNode.kind/query (STRENGTHENED, boundary asserts preserved). Legitimate, not weaken-to-green.
- *** PARKED → ESCALATE TO PA (the load-wiring half) ***: the actual §52 LOAD (server /__serverLoad/<var> route + client fetch) is BLOCKED on a real SPEC CONFLICT (sPA flagged it pre-dispatch; agent confirmed it's load-bearing):
  * §52.4.3 (SPEC.md:29156): `<var server> = expr` RHS is "the CLIENT PLACEHOLDER ... NOT sent to the server."
  * §51.0.E (SPEC.md:25431,25450): `<driver server> = ?{}.get()` — the ?{} IS the server load (canonical, PARAM-BEARING).
  * §52.6.5 enumerates only Pattern A (assignment-inferred) + Pattern B (on mount) — NOT the decl-RHS-?{} form.
  A ?{} RHS cannot be BOTH "client placeholder, not sent to server" AND "the server load." Codegen direction (build /__serverLoad route+fetch vs REJECT inline-?{} RHS as invalid placeholder→error) cannot be chosen without PA reconciliation. **PA RULING NEEDED.**
  * Phase-0 finding: E-AUTH-001 does NOT exist in compiler source for SELECT read-params (SPEC §52.11 scopes it to INSERT/UPDATE/DELETE). So a param-bearing inline `?{...${@cell}...}` is NOT deflected to a server fn — it's the same bug; §51.0.E's canonical IS param-bearing → if "load", needs POST-body param-passing (server-fn-CPS-like, larger scope).
  * Same load-wiring no-op affects the `@`-form `server @x = ?{}` (W-AUTH-001 drops sqlNode) — load fix should cover both forms now they share sqlNode shape.
- DEPENDENCY IMPACT: item 5 (E-RI-002 steers to `<engine server=@source>`) — that form now COMPILES but does NOT LOAD (W-AUTH-001). dpa-005 caveat "don't steer to a form that still codegen-fails" → item-5 disposition needs reconsideration (steer to fully-working channel+<match> Pattern A; qualify or omit the engine form until load-wiring lands). Decide at item 5.
- spa/ss1 commit SHA recorded next.
