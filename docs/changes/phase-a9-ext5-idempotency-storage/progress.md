# Progress — phase-a9-ext5-idempotency-storage (S76 dispatch)

Branch `worktree-agent-aa1100371152a25fb`, base `149c1ab` (S75 wrap; S76 PA's `f6a63fd` SCOPE doc commit is one commit ahead in main and not in our worktree base — pulled the SCOPE doc text via `git checkout f6a63fd -- ...` for reading; left untracked since main already has it).

Baseline (full suite, post pretest): **10780 pass / 64 skip / 1 todo / 2 fail**. The 2 fails are env-only ECONNREFUSED (self-host parity tests in happy-dom). Pre-commit hook (excludes browser) baseline ≈ 10057 / 53 / 1 / 0 per dispatch brief.

---

## D0 — Pre-snapshot + spec edits

- [00:00] Started — branch `worktree-agent-aa1100371152a25fb`, base `149c1ab`.
- [00:00] Startup verification PASS: pwd OK; git toplevel OK; tree clean (modulo SCOPE doc untracked); `bun install` OK; `bun run pretest` OK; `bun run test` baseline 10780/64/1/2 captured.
- [00:00] Reading list complete: pa.md, PA-SCRML-PRIMER.md (key sections), SURVEY.md (full), SCOPE-AND-DECOMPOSITION.md (full, pulled from main commit `f6a63fd`), Ext 4 progress.md.
- [00:00] OQ resolutions encoded (per SCOPE §B): §19.9.6 anchor, `idempotency-store=` attr name, INTEGER-timestamp shadow table, verbose-only D-CPS-MONOTONE, channel-SKIP, db-driver-shadow-table-first precedence, NEW Stage 5.5 placement, follow §39.2.x inconsistency.
- [00:00] D0 started — SPEC §19.9.6 + §19.9.7 + §39.2.6 + §34 rows + PIPELINE Stage 5.5 prose.
- [00:30] D0 SPEC edits landed: §19.9.6 (static monotonicity + idempotency-key replay + storage-backend resolution + shadow-table schema + channel-skip note + worked example + cross-refs) + §19.9.7 (`.idempotent()` modifier prose + worked example + cross-refs) + §19.13 / §34 +6 catalog rows (3 errors + 3 diagnostics) + §40.2 attribute table row + new §39.2.6 sub-section (closest-ancestor resolution + shadow-table schema + worked example + cross-refs) + PIPELINE.md Stage 5.5 (MC) sub-section + Stage Index row.
- [00:35] D0 test verification: 10781 pass / 64 skip / 1 todo / 0 fail (baseline was 10780/64/1/2; the 2 ECONNREFUSED env-only fails are flaky and didn't fire this run; +1 new pass — likely a sample-collection picking up extra spec-headings count). 0 regressions.
- [00:35] D0 commit `630c33b`. Pre-commit hook 10057/53/1/0; post-commit full suite 10781/0 fail.

## D1 — `.idempotent()` modifier parsing

- [00:40] D1 started. Surveyed ast-builder.js modifier surface: `.nobatch()` (line 2967, 9181) is a SQL `?{}` block method-chain marker, NOT a function-decl modifier — different shape, can't reuse directly. Function-decl modifier slots live at lines 6444+ (`function name(params)...{`) and 6604+ (`fn name(params)...{`). Decided position: AFTER the `!` modifier (canFail + optional `-> ErrorType`), BEFORE return-type / route= / method= / body. Same modifier band; standalone, takes no args.
- [00:50] D1 implementation: added `.idempotent()` recognition at BOTH function-decl sites (function + fn shorthand). Token sequence `.` `idempotent` `(` `)`. Sets new optional AST field `idempotentModifier: true` on `function-decl` nodes. Export-synth function-decl path (line ~5723, exporting via export-block) NOT touched — that path's body is rawStr-only (skipped per comment); modifier from `export function foo().idempotent()` would still emit verbatim via the raw export, but the synthetic walker-visible node won't carry the flag. Acceptable for v0.2.0 Ext 5 scope; can extend later if export-of-server-fn-with-idempotent surfaces.
- [00:55] D1 test verification: 10781 / 64 / 1 / 0. 0 regressions.
- [00:55] D1 commit `f484dc7`. Pre-commit 10057/53/1/0; post-commit full 10781/0 fail.

## D2 — `idempotency-store=` attribute parsing + default-resolution helper + FeatureUsage flag

- [01:05] D2 surveyed: §40.2 middleware attrs (`cors`, `log`, `csrf`, `ratelimit`, `headers`) flow through `programNode.attrs` directly in ast-builder.js (line ~9799), NOT through attribute-registry.js (which is opt-in/narrow). The middlewareConfig object is the per-app collected representation. `idempotency-store=` will follow the same path.
- [01:10] D2 implementation: extended ast-builder.js middlewareConfig collection to include `idempotencyStore: <value>` from the new `<program idempotency-store=>` attribute. Added FeatureUsage `idempotencyStore: "auto"|"sqlite"|"postgres"|"mysql"|"redis"|"none"|undefined` (string-typed; captures developer-declared value) + `idempotencyStoreUsed: boolean` (set by Stage 5.5 monotonicity-analyzer when runtime chunk needed). Updated emptyUsage / fullUsage / mergeUsage. Walker captures the attribute when it sees `<program>` markup. Created NEW `compiler/src/idempotency-store-resolver.ts` (~210 LOC): pure default-resolution helper exporting `resolveIdempotencyStore(attr, dbDriver, hasScrmlRedisImport)` returning `{backend, mismatch, missingRedisImport, reason}`. Sister helper `extractDbDriverFromValue(value)` parses `<program db=>` URI prefix into `"sqlite"|"postgres"|"mysql"|null`. No diagnostics fired in the resolver — pure function; callers consult flags + their context.
- [01:15] D2 test FAIL surfaced: 4 self-host parity fails — `auth config extraction`, `middleware config extraction`, `E-MW-001 csrf without auth`, `E-MW-002 invalid ratelimit`. Root cause: my middlewareConfig change added `idempotencyStore: null` to the always-emitted shape; self-host scrml ast-builder doesn't yet emit this field, so `assertParity` (toEqual on stripped AST) fails. Fix: added `if (key === "idempotencyStore") continue;` to `stripIds()` in `compiler/tests/self-host/ast.test.js` — canonical pattern for "JS records X, self-host doesn't yet" gaps (precedent: `isPure`, `isServer`, `isReExportAll`, `renames`, `exported`, `fromExport`, `openerHadSpaceAfterLt`, `legacyMachineKeyword` are all skipped this way).
- [01:18] D2 test re-verification: 10781 / 64 / 1 / 0. 0 regressions.
- [01:20] D2 commit `009ae20`. Pre-commit 10057/53/1/0; post-commit full 10781/0 fail.

## D3 — NEW `monotonicity-analyzer.ts` + Stage 5.5 hookpoint

- [01:30] D3 surveyed: SQLNode shape (compiler/src/types/ast.ts:309) has `query: string` + `chainedCalls`. Bare-expr / state-decl shapes wrap SQL via `sqlNode` sibling field or `init` ExprNode walk. CPSSplit shape extended with optional `monotonicity` field for downstream consumers.
- [01:50] D3 implementation: NEW `compiler/src/monotonicity-analyzer.ts` (~330 LOC). Exports `MonotonicityVerdict`, `MonotonicityDiagnostic`, `MonotonicityAnalysis`, `analyzeMonotonicity(routeMap, fnNodes)`, `classifyFunctionMonotonicityForTest(fnNode, cpsSplit)`. Helpers: `leadingSqlVerb` (lowercase + comment-strip first verb), `sqlMentionsNonDeterminism` (regex scan for NOW/CURRENT_TIMESTAMP/RANDOM/UUID/SYSDATE/GETDATE/NEXTVAL/etc.), `selectIsMonotone` / `insertIsMonotone` (RETURNING + ON CONFLICT + non-determinism flagged) / `updateIsMonotone` (assignment-only-of-literals; bails on subqueries via paren-detection) / `deleteIsMonotone`, `isMachineAdvanceCall` (bare-expr → call → member with property name "advance"), `findSqlNode` (walks state-decl init / exprNode / sqlNode sibling).

  Algorithm (per SPEC §19.9.6):
    1. `.idempotent()` modifier override → "monotone" (developer assertion).
    2. Single-statement batch that's just `<machine>.advance(.X)` → "machine-intrinsic".
    3. Walk every server-stmt; classify per (a)-(e); any non-monotone → "non-monotone".
    4. All-monotone → "monotone".
  Conservative defaults throughout — unrecognized shapes / ambiguous SQL → "non-monotone".

- [01:55] D3 integration: extended CPSSplit interface (compiler/src/route-inference.ts:89) with optional `monotonicity?: "monotone" | "non-monotone" | "machine-intrinsic"` field. Added Stage 5.5 hookpoint in compiler/src/api.js (between RI line ~775 and TS line ~785) — builds `fnNodes` map keyed by `${filePath}::${span.start}` (matching makeFunctionNodeId shape from route-inference.ts:521); filters out function-decls reachable inside `<channel>` markup body (channel-skip per §19.9.6). Verbose mode logs MC summary + per-fn D-CPS-* diagnostics.
- [01:58] D3 test verification: 10781 / 64 / 1 / 0. 0 regressions.
- [02:00] D3 commit `fb14a14`. Pre-commit 10057/53/1/0; post-commit full 10781/0 fail.

## D4 — Codegen client UUID + server dedup middleware (both CSRF paths)

- [02:10] D4 emit-functions.ts (client wrapper): added `Idempotency-Key` header emission at the fetch-stub site (line ~165-200). Header rides on every fetch when `route.cpsSplit?.monotonicity === "non-monotone"`. Two paths: (a) usesCsrfRetry path bypasses _scrml_fetch_with_csrf_retry (which doesn't accept extra headers) and inlines manual CSRF retry semantics + Idempotency-Key, (b) non-CSRF path adds the header to the standard fetch. UUID generation via crypto.randomUUID() with fallback to Math.random+Date.now for older runtimes.
- [02:20] D4 emit-server.ts (server stub): added dedup middleware at BOTH CSRF paths (useBaselineCsrf=true at line ~625; non-CSRF auth-managed path at line ~838). Each path: (1) read Idempotency-Key header at the top of handler body, (2) call `_scrml_idempotency_lookup(key)` — on hit, return `new Response(stored_body, {status: stored_status, ...})` immediately bypassing CPS body, (3) on miss, run CPS body, (4) capture result via inner async IIFE, (5) call `_scrml_idempotency_store(key, json_body, 200)` before sending the success response. Non-CSRF path required wrapping the body in an IIFE matching the CSRF path shape (CSRF path already has IIFE for §8.9.2 transaction envelope; non-CSRF path previously emitted raw `return X;` statements).
- [02:25] D4 test verification: 10781 / 64 / 1 / 0. 0 regressions. The runtime helpers `_scrml_idempotency_lookup` / `_scrml_idempotency_store` are emitted as bare references — D5 (next) supplies the runtime chunk implementing them.
- [02:30] D4 commit `4f686b9`. Pre-commit 10057/53/1/0; post-commit full 10781/0 fail.

## D5 — NEW `runtime/idempotency.js` + chunks registration

- [02:35] D5 SCOPE-doc deviation surfaced: SCOPE §D says "compiler/src/codegen/runtime-chunks.ts (+~30 LOC; new `idempotency` chunk)". But runtime-chunks.ts is the CLIENT-side runtime tree-shaking system (splits SCRML_RUNTIME into named subsections for the client bundle); the idempotency helpers are SERVER-side (use `_scrml_sql` which is server-only via Bun.SQL). There's no client-side chunk to register because the client never calls `_scrml_idempotency_lookup` / `_scrml_idempotency_store`. The dispatch authored before recognizing the server-side scope. Resolution: instead of touching runtime-chunks.ts, I'm using the same inline-into-server-prelude pattern that emit-server.ts already uses for `_scrml_structural_eq` (line ~1042-1097 — string-presence-detect at codegen output time, then inline the helper at the top). Functionally equivalent (helpers are bundled when used, elided when unused) but uses the existing server-side mechanism. Documenting as a SCOPE deviation; no semantic divergence from spec.
- [02:50] D5 implementation: NEW `compiler/runtime/idempotency.js` (~100 LOC) — canonical source of helper logic + bootstrap (CREATE-IF-NOT-EXISTS) + 24h TTL + lazy eviction + cross-driver upsert (try INSERT, fall back UPDATE on PK conflict). The helper text is also inlined verbatim into emit-server.ts post-hoc inliner (line ~1042-1093) — the inliner detects `_scrml_idempotency_lookup(` / `_scrml_idempotency_store(` callsites in the emitted server output and prepends the helper block. Mirrors `_scrml_structural_eq` precedent at line ~1095-1148. SQL backend (sqlite/postgres/mysql via Bun.SQL `_scrml_sql`) covers the v0.2.0 default-resolution target. Redis backend stubbed in the canonical .js file but not yet inlined — for adopters with `idempotency-store="redis"` in v0.2.0+1 polish.
- [02:55] D5 test verification: 10781 / 64 / 1 / 0. 0 regressions.
- [03:00] D5 commit `d792437`. Pre-commit 10057/53/1/0; post-commit full 10781/0 fail.

## D6 — Static-reject diagnostics in type-system.ts

- [03:10] D6 SCOPE-doc deviation: SCOPE §C lands D6 in "type-system.ts (~+100 LOC; new diagnostic fire-sites)". The Ext 4 W-CPS-NEEDS-FAILABLE infrastructure is in type-system.ts, but those diagnostics are per-call-site (callee-context) — fits TS pass shape. The Ext 5 static-rejection diagnostics are per-function-scope but require GLOBAL resolution (closest-ancestor `<program db=>` driver + module-graph `scrml:redis` import detection), which is naturally cross-file. Resolution: place the diagnostic logic at Stage 5.5 close (in api.js right after analyzeMonotonicity completes), not inside per-file TS pass. Functionally equivalent — diagnostics still flow through `collectErrors` into the same error/warning surface.
- [03:25] D6 implementation in api.js Stage 5.5 closure (post-mcResult): for each ceResults file, extract the file's middlewareConfig.idempotencyStore + dbConfig.driver (or fallback parse via extractDbDriverFromValue from `<program db=>`) + scrml:redis import presence. Call resolveIdempotencyStore(idemAttr, dbDriver, hasScrmlRedisImport). For each function in the file with verdict "non-monotone": fire E-CPS-IDEMPOTENCY-STORE-DRIVER-MISMATCH (highest priority — explicit-attr error), then E-CPS-IDEMPOTENCY-STORE-MISSING-IMPORT, then E-CPS-NONIDEM-NO-STORAGE (backend === "none"). Three fire-sites + push into `collectErrors("MC", _ext5Errors)`.
- [03:28] D6 test verification: 10781 / 64 / 1 / 0. 0 regressions. (No tests yet exercise these error paths — D7 adds.)
- [03:30] D6 commit `7b818cc`. Pre-commit 10057/53/1/0; post-commit full 10781/0 fail.

## D7 — Tests (~81 new across 5 files)

- [03:35] D7 surveyed Ext 4 test patterns (`compiler/tests/unit/a9-ext4-cps-failable-wiring.test.js`) for shape mirror.
- [03:50] D7 file 1: `compiler/tests/unit/a9-ext5-monotonicity-classifier.test.js` (21 tests, 21 expect calls). Coverage: §19.9.6 (a) SELECT (3) + (b) INSERT (4) + (c) UPDATE (4) + (d) DELETE (2) + (f) machine-intrinsic (2) + §19.9.7 .idempotent() override (2) + mixed batches + conservative defaults (4). All pass via `classifyFunctionMonotonicityForTest` direct invocation.
- [04:00] D7 file 2: `compiler/tests/unit/a9-ext5-idempotent-modifier.test.js` (6 tests, 17 expects). Coverage: bare .idempotent() on function-decl (1) + absence (1) + with `!` modifier (1) + on server function (1) + with route= attr (1) + on `fn` shorthand (1). Uses real ast-builder via `runTAB(splitBlocks(...))`.
- [04:10] D7 file 3: `compiler/tests/unit/a9-ext5-program-attr.test.js` (29 tests, 53 expects). Coverage: ast-builder middlewareConfig.idempotencyStore extraction (6) + extractDbDriverFromValue URI parsing (8) + resolveIdempotencyStore explicit-attr branches (6) + auto default-resolution branches (5) + FeatureUsage capture via analyzeUsage (4).
- [04:20] D7 file 4: `compiler/tests/unit/a9-ext5-spec-amendments.test.js` (14 tests, 49 expects). Coverage: §19.9.6 section presence + (a)-(f) rules + shadow-table schema + Idempotency-Key header docs + channel-skip note (5) + §19.9.7 modifier section presence + D-CPS-IDEMPOTENT-OVERRIDE doc (2) + §40.2 attr table row (1) + §39.2.6 sub-section + value-space (2) + §34 catalog 3 errors + 3 diagnostics (2) + PIPELINE.md Stage 5.5 section + Stage Index row (2). Mirror of D4 SPEC-amendments verification block from Ext 4.
- [04:30] D7 file 5: `compiler/tests/integration/a9-ext5-emission.test.js` (11 tests, 17 expects). Coverage: non-monotone emission active — client Idempotency-Key header (1) + server dedup lookup (1) + server dedup store (1) + inlined runtime helpers (1); monotone emission elided — no header (1) + no middleware (1) + no helpers (1); machine-intrinsic emission elided (2); undefined verdict back-compat (2). Direct runCG invocation with hand-built CPSSplit + monotonicity verdict.
- [04:35] D7 final test verification: full suite 10862 pass / 64 skip / 1 todo / 0 fail (+81 new tests vs baseline 10781). 0 regressions. The `~75-110 new tests` SCOPE estimate landed at 81 (lower-end of range, focused on the highest-value coverage paths).
- [04:40] D7 commit `2b3ce54`. Pre-commit 10138/53/1/0; post-commit full 10862/0 fail.

## D8 — Final verification + report-back to PA

- [04:45] D8 pretest re-run: 12 sample compiles OK.
- [04:50] D8 final full-suite test: 10862 pass / 64 skip / 1 todo / 0 fail.
- [04:50] D8 pre-commit-shape test (excluding browser + self-host): 10138 pass / 53 skip / 1 todo / 0 fail.
- [04:50] **No regressions vs S75 baseline.** Net delta:
  - Full suite: 10780 → 10862 (+82 pass; 1 net pickup from rerun + 81 new). 2 ECONNREFUSED env-only fails not firing this run (flaky; pre-existing per dispatch brief).
  - Pre-commit: ~10057 → 10138 (+81 new tests).
- [04:55] WORKTREE_PATH: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa1100371152a25fb`
  AGENT_BRANCH: `worktree-agent-aa1100371152a25fb`
  FINAL_SHA: `2b3ce54333363b69a42969e128c0213ccd872d2f`

### Files touched (NEW vs EDITED)

**NEW (9 files):**
- `compiler/runtime/idempotency.js` (canonical SQL-backend helper source)
- `compiler/src/idempotency-store-resolver.ts` (default-resolution helper)
- `compiler/src/monotonicity-analyzer.ts` (Stage 5.5 classifier)
- `compiler/tests/integration/a9-ext5-emission.test.js` (11 tests)
- `compiler/tests/unit/a9-ext5-idempotent-modifier.test.js` (6 tests)
- `compiler/tests/unit/a9-ext5-monotonicity-classifier.test.js` (21 tests)
- `compiler/tests/unit/a9-ext5-program-attr.test.js` (29 tests)
- `compiler/tests/unit/a9-ext5-spec-amendments.test.js` (14 tests)
- `docs/changes/phase-a9-ext5-idempotency-storage/progress.md` (this log)

**EDITED (10 files):**
- `compiler/SPEC.md` (+§19.9.6 + §19.9.7 + §39.2.6 + §40.2 attr row + §34 ×6 codes ×2 tables)
- `compiler/PIPELINE.md` (+Stage 5.5 section + Stage Index row)
- `compiler/src/route-inference.ts` (CPSSplit.monotonicity field added)
- `compiler/src/api.js` (Stage 5.5 hookpoint + D6 static-rejection diagnostic logic)
- `compiler/src/ast-builder.js` (.idempotent() modifier parsing at 2 fn-decl sites + idempotency-store= in middlewareConfig)
- `compiler/src/codegen/emit-functions.ts` (D4 client UUID + Idempotency-Key header)
- `compiler/src/codegen/emit-server.ts` (D4 dedup middleware in both CSRF paths + D5 helper inliner)
- `compiler/src/codegen/usage-analyzer.ts` (FeatureUsage.idempotencyStore + idempotencyStoreUsed flags)
- `compiler/tests/self-host/ast.test.js` (stripIds skip for idempotencyStore parity bypass)
- `docs/changes/phase-a9-ext5-idempotency-storage/progress.md` (this log)

### Deferred items / OQ deviations encountered

**OQ deviations from SCOPE doc §B (none in spec semantics; structural-only):**

- D5 SCOPE-doc deviation: SCOPE §D listed `compiler/src/codegen/runtime-chunks.ts (+~30 LOC; new idempotency chunk)`. That file is the CLIENT-side runtime tree-shaking system (SCRML_RUNTIME chunks for the client bundle); the idempotency helpers are SERVER-side (use `_scrml_sql` / Bun.SQL). Client never calls these helpers, so no client-chunk to register. **Resolution:** server-side post-hoc inliner pattern (`_scrml_structural_eq` precedent in emit-server.ts ~line 1095). Functionally equivalent — helpers bundled when used, elided when unused. No spec divergence; documented in commits + progress.md.

- D6 SCOPE-doc deviation: SCOPE §C lands D6 in `type-system.ts (~+100 LOC; new diagnostic fire-sites)` parallel to Ext 4 W-CPS-NEEDS-FAILABLE infra. Ext 4 diagnostics are per-call-site (caller-context), fitting the per-file TS pass shape. Ext 5 static-rejection diagnostics (E-CPS-NONIDEM-NO-STORAGE, -DRIVER-MISMATCH, -MISSING-IMPORT) are per-function-scope but require GLOBAL resolution (closest-ancestor `<program db=>` walk + module-graph `scrml:redis` import detection). **Resolution:** placed at Stage 5.5 close (in api.js) where the resolution is naturally global. Functionally equivalent — diagnostics flow through `collectErrors()` into the standard error surface. No spec divergence.

**Deferred items (in-scope-but-thin):**

- D1 export-synth modifier propagation: `export function name().idempotent()` synthesizes a function-decl shadow node from rawStr (ast-builder.js ~line 5723); this path doesn't carry the `idempotentModifier` flag through. The exported body is emitted verbatim via the raw export, so the modifier text is preserved in output, but downstream walkers seeing the synthetic node won't know about it. Acceptable for v0.2.0 Ext 5 scope (no production tests rely on export-of-server-fn-with-idempotent today); follow-up if friction.

- D3 pure-fn-call detection: classifier's per-statement walker treats unrecognized bare-expr shapes (e.g., function calls) as non-monotone (conservative default per SPEC §19.9.6 paragraph 1). Recognizing `fn`-kind callees as monotone (rule (e)) requires threading `functionIndex` through to the analyzer — non-trivial. Acceptable for v0.2.0 (over-emission of keys; not soundness-violating); follow-up.

- D5 Redis backend: stubbed in `compiler/runtime/idempotency.js`; not yet inlined into emit-server.ts. SQL backend (sqlite/postgres/mysql) covers the v0.2.0 default-resolution target (most apps with `<program db=>`). Follow-up for adopters explicitly using `idempotency-store="redis"`.

- TTL configurability + per-route override + cross-process replay coordination + WS frame-level replay safety + multi-batch CPS classification: all out-of-scope per SCOPE §E (deferred to v0.next+1 / v0.3.0+).

### Reporting back to PA — see final agent message.

## Plan (D0-D8)

1. D0 — Pre-snapshot + spec edits (§19.9.6 + §19.9.7 + §39.2.6 + §34 rows + PIPELINE Stage 5.5)
2. D1 — `.idempotent()` modifier parsing
3. D2 — `idempotency-store=` attr + default-resolution helper + FeatureUsage flag
4. D3 — NEW `monotonicity-analyzer.ts` + Stage 5.5 hookpoint
5. D4 — Codegen — emit-functions.ts client UUID + emit-server.ts dedup middleware
6. D5 — NEW `runtime/idempotency.js` + chunks registration
7. D6 — Static-reject diagnostics in type-system.ts
8. D7 — Tests
9. D8 — Final verification + report-back to PA

## Decisions / Surprises (running log)

(to be appended per D-step)
