# A-4.3 — tier-1 idle-prefetch — progress log

Dispatched: 2026-05-14 (S91 → potentially close S92 wave).
Worktree: `.claude/worktrees/agent-ab32eb087d35bd925`.
Base: `d7773a4` (post-A-4.2 rebase).

## Plan (per BRIEF)

1. composeTier1Chunk in route-splitter.ts — reuses atom-emitters
2. _scrml_prefetch_tier1 in runtime-template.js
3. prefetch marker in runtime-chunks.ts
4. IIFE-tail prefetch call in composeInitialChunk
5. Write-loop tier-1 elision in api.js
6. Tests (10-14)
7. PIPELINE.md + domain.map.md polish

## Log

- 2026-05-14 startup: pwd verified under worktree; bun install; bun run pretest green; rebased on main `d7773a4`. Prior reading: SCOPING §3.3, route-splitter.ts (full), atom-emitter.ts (full), runtime-template.js (overview + §22.5 anchor), runtime-chunks.ts (full), §40.9.7 + §40.9.9 SPEC normative.
- Sub-task 1+4 landed `6528a86`: composeTier1Chunk + shared appendAtomLines refactor + IIFE-tail `_scrml_prefetch_tier1(<url>)` wiring via `composeInitialChunk(..., tier1Url)` parameter; isChunkContentsEmpty exported; emitPerRouteChunks composes tier-1 FIRST then threads URL into initial chunk. +201 LOC -18 LOC.
- Sub-task 2+3 landed `55ff91b`: `_scrml_prefetch_tier1` function in runtime-template.js (inside SCRML_RUNTIME template literal; backticks in comments escaped per existing pattern at L16); `prefetch` chunk marker in CHUNK_MARKERS + RUNTIME_CHUNK_ORDER between `utilities` and `meta`; emit-client.ts `detectRuntimeChunks` scans `reachabilityRecord.closures` for non-empty tier-1 admission and adds `'prefetch'` to `usedRuntimeChunks` when triggered. Two pre-existing chunk-count assertions updated (c10 + runtime-tree-shaking) from 18 → 19.
- Sub-task 5 landed `78311f2`: api.js write loop skips empty-payload non-initial chunks (tier-1 empty file elision); verbose log now surfaces "Tier-1 idle-prefetch chunks: N file(s), B B total" aggregate at the end.
- Sub-task 6 landed `c0aac4d`: 7 new unit tests in §11 of codegen-route-splitter.test.js (composeTier1Chunk shape + delta atoms + determinism; isChunkContentsEmpty 4-set coverage; IIFE-tail wiring with/without tier1Url; end-to-end emitPerRouteChunks with synthetic non-empty tier-1 plan); 9 new integration tests in tier1-idle-prefetch.test.js (§40.9.9 worked-example empty-tier-1 normative + tree-shake DEAD verification under embed mode + determinism + filename pattern + .client.js byte-regression + synthetic LIVE-path echo). Full pre-commit gate ran: 11674 pass / 88 skip / 1 todo / 0 fail.
- Sub-task 7 in flight: PIPELINE.md Stage 8 wire-in addendum + domain.map.md Task-Shape Routing entry update.

## Done

All 7 sub-tasks complete. Ready for terminal report.
</content>
</invoke>