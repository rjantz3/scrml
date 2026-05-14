# A-4.7 progress

## Setup
- 2026-05-14 — Startup verification passed. Worktree at `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a3e023d192f34c982`. Branch worktree-agent-a3e023d192f34c982. Worktree base updated to main HEAD `07e9795`.
- `bun install` + `bun run pretest` ran clean.
- Read BRIEF.md in full; read primary.map.md; spot-checked emit-html.ts (1686 lines) generateHtml at L401 + index.ts HTML wrapper at L724-771; route-splitter.ts emitPerRouteChunks + composeInitialChunk + routeSegmentFromEntryPointId; runtime-template.js prefetch section L1200-1340; atom-emitter.ts emitComponentAtom L417 emits `_scrml_chunk_mount`; appendAtomLines (route-splitter.ts L869) emits `_scrml_vendor_require`.
- Severity decision: CGError type supports 'error' | 'warning' only (no 'info'). All four W-CG-CHUNK-* codes emit severity='warning'. SPEC §34 catalog rows mirror W-AUTH-LOGIN-MISSING shape.

## Sub-task 1 — runtime helpers + section markers (commit `68e4b97`)
- Added `_scrml_chunk_mount(id, tag)` + `_scrml_vendor_require(unit)` in runtime-template.js (~47 LOC).
- Both use `Object.create(null)` registries; record-keeping only; zero adopter overhead.
- Added `mount` + `vendor-ref` section markers in runtime-chunks.ts (~18 LOC).
- Extended detectRuntimeChunks in emit-client.ts to activate per-tier (~30 LOC).
- Updated chunk-count tests in c10-error-message-resolution.test.js + runtime-tree-shaking.test.js (19 → 21).

## Sub-task 2 — HTML augmentation (commit `96a5c6c`)
- New `augmentHtmlForChunks` export in emit-html.ts (~290 LOC).
- Injects three surfaces before `</head>`: `_SCRML_CHUNKS` inline manifest (route-keyed for runtime compatibility), `<link rel="modulepreload">` for non-empty tier-1, role-detection bootstrap (localStorage > cookie > meta > `_anonymous`).
- Wired into runCG orchestrator post-emitPerRouteChunks pass in index.ts (~120 LOC).
- EpId → routePath resolver handles three real-pipeline shapes + synthetic fallback.

## Sub-task 3 — routeSegmentFromEntryPointId fix (commit `c787c50`)
- Real-pipeline EpId shapes (`#program` / `#page@<route>` / `#page-<N>`) now handled explicitly.
- Synthetic shapes (`::#page::` / `::#program`) preserved for A-4.1 test fixture stability.
- Positional `#page-<N>` uses `<basename>_page<N>` segment to avoid collision when a file has multiple positional pages.

## Sub-task 4 — W-CG-CHUNK-* lints (commit `8393ab0`)
- Added emitChunkLints helper (~250 LOC) running post-iteration scan per EP.
- 4 lints emitted as CGError severity='warning':
  - W-CG-CHUNK-EMPTY (zero non-empty admission sets)
  - W-CG-CHUNK-LARGE (initial chunk > 100KB soft budget; CHUNK_LARGE_SOFT_BUDGET_BYTES exported)
  - W-CG-CHUNK-NO-PREFETCH (multi-route app with no data-scrml-prefetch)
  - W-CG-CHUNK-MISSING-ROLE (`<auth role="X">` references unmapped role)
- collectAuthRoleReferences + utf8ByteLength helpers (pure-ts; self-host portable).
- SPEC §34 + §40.9.11 catalog rows added.

## Sub-task 5 — tests (commit `5f31dfe`)
- NEW `compiler/tests/unit/codegen-html-augmentation.test.js`.
- 31 tests / 60 expects, all passing.
- Coverage: bootstrap shape (4) + inline manifest (3) + modulepreload (3) + degenerate inputs (2) + end-to-end §40.9.9 (5) + chunks-disabled mode (1) + runtime-helper defs + tree-shake (8) + atom-emitter resolution (1) + determinism (1) + lints (3).

## Sub-task 6 — PIPELINE.md + maps + master-list (in flight)
- PIPELINE.md Stage 8 amendment: A-4 wave wave-close prose block describing the splitter passes + W-CG-CHUNK-* lint family.
- domain.map.md: A-4.7 row added to "CLOSED at S91" + Task-Shape Routing row updated to reflect FULL closure + 31 new test count.
- master-list.md: NEW S91 mid-session addendum 2 entry above the previous S91 mid-session entry.

## A-4 wave FULLY CLOSED
The per-route artifact splitter is end-to-end runnable. Adopter chunks are activatable in actual browsers (atom-emitter output resolves to real runtime helpers). Per-route HTML emits the role-detection bootstrap. W-CG-CHUNK-* lint family in place. v0.3.0 critical path substantively complete.
