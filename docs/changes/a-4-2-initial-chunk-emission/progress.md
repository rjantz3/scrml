# A-4.2 progress

## 2026-05-14 (start)

- F4 startup verification: pass (worktree path validated; tree clean; bun install + bun run pretest ok).
- Worktree base was `ff9be0e` (S90 close); merged main fast-forward to `ea6d9d3` (A-4.1 landed) so the route-splitter.ts scaffold is present.
- Read brief (BRIEF.md), maps (primary/domain/schema/structure/dependencies), route-splitter.ts, A-4.1 test file, emit-client.ts (1372 LOC), runtime-template.js, reachability-solver flow, SPEC §40.9.7 + §40.9.9, auth-graph integration test (uses same fixture).
- Pipeline understanding confirmed: ChunkContents.componentNodeIds are markup-node ids (post-CE inlined spine); reactiveCellNodeIds are state-decl ids; serverFnNodeIds are function-decl ids of server boundary fns; vendorUnitNames are §41 vendor-unit names.

## Plan

1. Sub-task 1 — Extract atom-emitters from emit-client.ts (additive):
   - `emitReactiveCellAtom(stateDecl, ctx)` — single state-decl runtime registration
   - `emitServerFnStubAtom(fnNode, ctx)` — single fetch stub (delegate to existing emitFunctions logic)
   - `emitVendorUnitRef(name, ctx)` — vendor-unit import-line emission per §41
   - `emitComponentAtom(markupNodeId, ctx)` — collects event-wiring + reactive-display lines for the single admitted markup node
   Goal: helpers are PURE (no side effects on ctx) and IDEMPOTENT. Existing per-file emitter behavior unchanged.

2. Sub-task 2 — `composeInitialChunk(initialContents, ctx-by-file, entryPoint)` in route-splitter.ts:
   - Iterate componentNodeIds (canonical order — number < string, codepoint for strings).
   - For each id, resolve to the right per-file ctx via entryPoint.filePath, then look up the AST node.
   - Call emitComponentAtom(nodeId, ctx).
   - Iterate reactiveCellNodeIds, serverFnNodeIds, vendorUnitNames similarly.
   - Concatenate with a chunk preamble (// scrml chunk header) and return.

3. Sub-task 3 — wire payload into ChunkOutput for tier === "initial". Tier1/Tier2/TierN remain empty at A-4.2.

4. Sub-task 4 — compile.js verbose log: surface byte count per chunk.

5. Sub-task 5 — tests:
   - Extend codegen-route-splitter.test.js with atom-emitter idempotency tests.
   - NEW integration/initial-chunk-emission.test.js: §40.9.9 worked-example viewer=Driver + viewer=Admin replay; determinism (2-build byte-identity); single-file path regression (existing .client.js byte-identical baseline).

6. Sub-task 6 — PIPELINE.md Stage 8 addendum + domain.map.md A-4.2 closure entry.

## 2026-05-14 (close)

All 6 sub-tasks complete.

- Sub-task 1: `compiler/src/codegen/atom-emitter.ts` (NEW, 414 LOC) — `emitReactiveCellAtom` / `emitServerFnStubAtom` / `emitVendorUnitRef` / `emitComponentAtom` / canonical comparator + helpers. Idempotent, additive (no changes to emit-client.ts).
- Sub-task 2: `composeInitialChunk` + `composeServerFnAtom` + `resolveReactiveDGNodeIdToAst` + `findStateDeclBySpanStart` + `findFunctionNodeByFnId` + `filePathFromEntryPointId` added to `compiler/src/codegen/route-splitter.ts` (~260 LOC additions).
- Sub-task 3: payload wire-in done in `emitPerRouteChunks` body — initial-tier `payloadJs` populated when `cgContextByFile` is threaded through; tier1/tier2/tierN stay empty per A-4.3+ deferred scope.
- Sub-task 4: verbose log in `compiler/src/api.js` now surfaces `(N B)` byte counts per chunk + manifest.
- Sub-task 5: 21 new unit tests + 16 new integration tests; bugs fixed during integration:
  - `filePathFromEntryPointId` was using `::` separator (A-4.1 fixture shape) but real-pipeline IDs use `#program` / `#page@<route>` — fixed to handle both formats.
  - `resolveReactiveDGNodeIdToAst` handles the DG `reactive::<filePath>::<span.start>::<counter>` shape AND falls back to direct id lookup for synthetic-test ids.
  - LitExpr kind is `"lit"` not `"literal"` (per AST type surface).
- Sub-task 6: PIPELINE.md Stage 8 A-4.2 addendum + domain.map.md task-shape routing entry + closure timeline entry.

Total LOC delta:
- NEW: `compiler/src/codegen/atom-emitter.ts` (~414 LOC)
- NEW: `compiler/tests/integration/initial-chunk-emission.test.js` (~250 LOC)
- ADDITIONS: `compiler/src/codegen/route-splitter.ts` (+~330 LOC)
- ADDITIONS: `compiler/tests/unit/codegen-route-splitter.test.js` (+296 LOC; 13 → 34 tests)
- ADDITIONS: `compiler/src/api.js` (+12 LOC, verbose log shape)
- ADDITIONS: `compiler/PIPELINE.md` (+12 LOC, Stage 8 addendum)
- ADDITIONS: `.claude/maps/domain.map.md` (+10 LOC)

Test counts post-A-4.2 (pre-commit gate baseline):
- 11619 pass / 0 fail at A-4.2 dispatch start.
- All A-4.2 changes survive the full pre-commit suite cleanly (verified at each commit via the post-commit gate hook).

