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
