# sPA ss1 — server-emit-route-inference

**Launch:** `read spa.md ss1` · **Branch:** `spa/ss1` · **Worktree:** `../scrml-spa-ss1`
**Merged from (S208):** pure-module-server-emit-arc · type-system-route-server-boundary · sql-batching-multidriver

## Shared ingestion (read once — reuse for every item)

The server-bundle emission / route-inference / wire-serializability triangle: how `.server.js`
emission is gated (api.js per-file write gate) vs how cross-file server imports are emitted; how
route-inference promotes server-called helpers into `__ri_route_*` handlers; the E-ROUTE-003/004
wire-serializability boundary (`type-system.ts checkRouteWireSerializability`) + §14.8 typed-SQL-row
+ protectAnalysis; and the `?{}` SQL pipeline (db-driver URI resolution, batch-planner Stage 7.5).

## Core files

- `compiler/src/codegen/emit-server.ts` · `compiler/src/api.js` · `compiler/src/route-inference.ts`
- `compiler/src/type-system.ts` (E-ROUTE-003 family, `case sql`, protectAnalysis)
- `compiler/src/codegen/db-driver.ts` · `compiler/src/batch-planner.ts`
- `compiler/SPEC.md` §21 / §12 / §14.8 / §44 (targeted via SPEC-INDEX) · `docs/known-gaps.md`

## Items — work in `order` (least-ingestion-first)

### ✅ DONE this session (S208) — context for the residual
- `g-pure-module-server-emit-missing` (HIGH) — **RESOLVED** (Fix A tree-shake, emit-server.ts `432c28b6`).
- `g-server-import-unemitted-warning-fix-b` — **DONE** (`W-SERVER-IMPORT-UNEMITTED`, api.js `05b88433`).
These warmed the whole triangle; the residual items below reuse that understanding.

### 1. `g-route-mis-inference-server-called-pure-helper` — fix the route-mis-inference
`[landed-on-branch]` (spa/ss1; agent a6eb2c2fd9ba6086b) · bug · **MED** · tier **med**
A server-CALLED exported helper route-infers into a `__ri_route_*` HANDLER, so its `.server.js` emits
the route, not the value `export` the consumer imports by-name → runtime missing-export. **Filed S208**
(surfaced by Fix B's MISSING-EXPORT warning — 6 distinct shapes across trucking auth/status-picker/
driver-card). Fix: when an exported helper is route-inferred AND imported by-name into a sibling server
bundle, ALSO emit `export const <name>` (or don't route-infer an exported-and-by-name-imported helper).
**Entry:** route-inference.ts Step 5b/5d (`__ri_route_` ~838). Verify Fix B's warnings drop to 0 on
trucking after (R26 + rebaseline trucking-smoke 80→74).

### 2. `server-generator-yield-serializability` — wire E-ROUTE-003 on `server function*` yields
`[parked → PA]` (needs value-expr typer + canonical-fixture decision; blast-radius > list) · bug · LOW · tier med
E-ROUTE-003 not fired on a non-serializable yield-element type of an SSE generator.
**Entry:** type-system.ts `checkRouteWireSerializability` + `route-wire-serializability.test.js:306-322`.

### 3. `g-sql-row-protect-leak` — protected-column-projection leak (static data-flow)
`[parked → PA]` (SPEC §14.8 DEFERRED follow-on; net-new HIGH-tier data-flow, needs design) · feature · LOW · tier high
A server fn SELECTing a protected column and returning the row isn't statically caught. New §14.8
SELECT-projection → struct-return/wire data-flow analysis. **Entry:** type-system.ts E-ROUTE-003 gate
(:3667-3882) + `case sql` (:9326) + protectAnalysis (:6701); SPEC §14.8 deferral (SPEC.md:8024-8026).

### 4. `bunsql-postgres-mysql-phases` — Postgres URI introspection (in progress) + MySQL driver
`[parked → PA]` (Phase 2.5 real introspection needs async protect-analyzer migration; architectural arc) · feature · n-a · tier med
Complete Postgres real compile-time introspection (Phase 2.5 — needs async PA migration) + add the
MySQL branch. **Entry:** db-driver.ts §44.2 URI resolution + protect-analyzer.ts.

### 5. `p4-sql-batching-deferred-complexity` — P4 batcher post-v1 extensions
`[parked → PA]` (explicitly POST-V1 per list; prioritization-deferred) · feature · n-a · tier med
Five named post-v1 extensions to the shipped batcher (writes×transitions, optimistic rollback,
tuple-WHERE, F9-in-tx, `--show-batch-plan`). **Entry:** batch-planner.ts (Stage 7.5) + master-list.md
+ the sql-batching DD.

### 6. `phase-a4-schema-refinement-pinned` — STALE phase-row, currency-correct then close
`[landed-on-branch]` (spa/ss1; A4 row closed — all 3 parts verified shipped) · feature · n-a · tier high
Legacy S58 phase row; substance already shipped (refinement three-zone S69, schemaFor S104).
**Entry:** master-list.md §0.1 row A4 — verify shipped, mark closed (not real build work).

## Progress

See `ss1.progress.md`. Land on `spa/ss1`; ping the PA inbox when a batch is ready. Do not advance main / do not push.
