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
