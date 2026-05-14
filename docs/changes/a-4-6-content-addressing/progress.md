# A-4.6 — content-addressing progress

## 2026-05-14 startup

- Worktree provisioned at base `ff9be0e` (S90 close). Rebased onto `7cac10c` (A-4.3 LANDED on main); worktree now sees A-4.1 + A-4.2 + A-4.3 code.
- `pwd`: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa44b88cf5568d9da` (F4 OK).
- `bun install` + `bun run pretest` clean.
- Baseline test counts:
  - chunk suites (codegen-route-splitter + initial-chunk-emission + tier1-idle-prefetch): 68 pass.
  - Full pre-commit gate (unit + integration + conformance): 11674 pass / 88 skip / 1 todo / 0 fail.
- Identified existing test sites that need updating post-A-4.6 (chunks now carry real hashes):
  - `compiler/tests/unit/codegen-route-splitter.test.js:209-210, 224` — uses `CHUNK_HASH_PLACEHOLDER` literally as the expected value.
  - `compiler/tests/integration/initial-chunk-emission.test.js:309` — `expect(chunk.chunkHash).toBe("00000000")`.
  - `compiler/tests/integration/tier1-idle-prefetch.test.js:238` — same.
- The composer-pass-through tests (lines 813-822 unit, 329-331 tier1-integration) that feed `00000000`-bearing strings directly to `composeInitialChunk` are testing string pass-through; they continue to work.

## Plan — executed

1. Sub-task 1: DONE — `compiler/src/codegen/fnv1a-hash.ts` (NEW, 89 LOC); `type-encoding.ts` re-exports; existing 42 fnv1aHash/type-encoding tests + conf-CG-010 all green.
2. Sub-task 2: DONE — `computeChunkHash(contents, payloadJs)` in `route-splitter.ts` (~165 LOC), canonical 5-field input (`compIds|reactIds|fnIds|vendorIds|payloadJs`) with `,` inner separator + `\x1F` field separator; admission-set canonical sort via `canonicalNodeIdArray`/`canonicalVendorUnitArray` (A-2.8 stratified comparator).
3. Sub-task 3: DONE — `finalizeChunkHash(chunk)` mutates each ChunkOutput with the real hash + rebuilt filename AFTER payload composition; wired for initial / tier1 / tier2 / tierN at each of the 4 hash sites in `emitPerRouteChunks`. Updated 3 placeholder-asserting tests (codegen-route-splitter.test.js x2, initial-chunk-emission.test.js x1, tier1-idle-prefetch.test.js x1).
4. Sub-task 4: DONE — `serializeChunksManifest(manifest, chunks)` now produces URL-style filename JSON for on-disk consumption; in-memory manifest unchanged (ChunkKey-valued) for in-process callers. api.js updated to pass chunks Map. Compiler-version-from-package.json polish DEFERRED (current package.json shows stale `0.2.0` while in-flight cut is v0.3.0; surface as deferred item).
5. Sub-task 5: DONE — api.js write loop verified; no hard-coded `"00000000"` outside doc comments. Doc comments updated to reflect post-A-4.6 state.
6. Sub-task 6: DONE — NEW `compiler/tests/unit/chunk-content-addressing.test.js` (19 tests passing); extended existing `compiler/tests/integration/initial-chunk-emission.test.js` §40.9.8 block with 4 new A-4.6 integration tests (hash byte-identity / 5-run replay / source-change flips hash / no-placeholder leak).
7. Sub-task 7: DONE — PIPELINE.md Stage 8 A-4.6 entry; `.claude/maps/domain.map.md` updated with A-4.6 closure + Task-Shape Routing row + deferred-item note.

## Test result deltas

- Baseline pre-A-4.6: 11674 pass / 88 skip / 1 todo / 0 fail.
- Post-A-4.6: 11697 pass / 88 skip / 1 todo / 0 fail (+23 new tests).
