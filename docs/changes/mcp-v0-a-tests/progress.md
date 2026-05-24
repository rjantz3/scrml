# Progress: mcp-v0-a-tests

MCP-V0 Sub-unit A test follow-on + A↔B form/engine descriptor contract fix.

## Startup verification
- pwd: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ab36f664061920895` ✓ (worktree)
- `git rev-parse --show-toplevel` == pwd ✓
- `git merge main` → fast-forward `dc073b94` → `16042a30` (maps refresh) ✓ clean
- `bun install` ✓ (117 pkgs)
- `bun run pretest` ✓ (13 test samples compiled)
- Baseline `bun run test`: **21110 pass / 0 fail / 174 skip / 1 todo** (stable across 3 runs; the brief-noted ~2 browser-fixture flakes did not reproduce on re-run). Baseline = 0 fail.

## Maps consulted
primary.map.md (in full), schema.map.md (MCP Descriptor Shapes + cellKey/compoundKeys gap), test.map.md (mcp-runtime-helpers pattern + A-tests gap), structure.map.md (MCP-V0.A/B module detail).

## VERIFIED CONTRACT GAP (probed against real compile output)
- `forms.json` emits FLAT: `{ formName, errorsKey, isValidKey, touchedKey, submittedKey, fields }`.
- B `getFormStatus` reads NESTED: `descriptor.compoundKeys.{isValidKey,errorsKey,touchedKey,submittedKey}` (mcp.js:311-323).
  → `descriptor.compoundKeys` undefined → B falls back to per-field rollup → `submitted` UNDECODEABLE.
- `engines.json` emits NO `cellKey`; B reads `descriptor.cellKey || descriptor.name` (mcp.js:249). In dev `encodeKey` identity so name===key works, but production per-file encoding needs `cellKey`.
- BONUS extractor defect found during probe: `collectChannelAutoSyncedCells` only descends `node.children`, but channel V5-strict cells live inside a `${}` logic block (`logic.body`), so `autoSyncedCells` is ALWAYS `[]`. Integration test (Task 2.5) requires channel decode → fix the walk to descend logic-block bodies (Sub-unit A scope).

## Fixture authoring notes (probed)
- Engines must be top-level OR inside `<program>` as proper `<engine>` nodes; `:`-shorthand state-children inside `<program>` markup did NOT parse as engine-decl in probe — use `</>`-body state-children. machineDecls populated → extractor finds them.
- Channels must live INSIDE `<program>` (v0.3 `E-CHANNEL-OUTSIDE-PROGRAM`); kickstarter v2's file-level form is NOT accepted by current compiler. Cells go in a `${}` block inside the channel body.
- forms: compound `<signup> <name req length(>=2)> = <input/> ... </>` inside a `${}` block. Emits per-field + compound keys.
- serverfns: `server function f(x: int) { ... }` — params + types emit; returnType "unknown" unless annotated.

## Timeline
- [start] Startup verified, maps + docs + source read, contract gap + channel defect confirmed by probe compiles.
- [task1] Contract fix in mcp-descriptors.ts: FormDescriptor.compoundKeys nested object; EngineDescriptor.cellKey emitted (identity in dev); collectChannelAutoSyncedCells descends logic-block body + dedup. A progress.md false-claim corrected. Commit b4651c42. B helper tests 25/25 still pass. Gate 14095/0.
- [task2-units] 4 per-sidecar unit tests + shared helper compiler/tests/helpers/mcp-sidecar-compile.js. Commit 72d0d08d. Gate 14115/0.
- [task2-int+spa] Degenerate-SPA unit test + A->B runtime integration test. Commit 1b93568d. Gate 14125/0.
- [proof] Verified the integration test FAILS on the pre-fix flat form shape (2 submitted-decode assertions fail) and PASSES with nested compoundKeys — the load-bearing proof.
- [regression] Full `bun run test`: 21140 pass / 0 fail / 174 skip / 1 todo. Baseline 21110 → +30 (exactly the new MCP-A cases), 0 regressions.

## Final state
- Files touched (worktree-absolute):
  - compiler/src/codegen/mcp-descriptors.ts (Task 1 contract fix)
  - compiler/tests/helpers/mcp-sidecar-compile.js (NEW shared helper)
  - compiler/tests/unit/mcp-descriptors-engines.test.js (NEW)
  - compiler/tests/unit/mcp-descriptors-forms.test.js (NEW)
  - compiler/tests/unit/mcp-descriptors-channels.test.js (NEW)
  - compiler/tests/unit/mcp-descriptors-serverfns.test.js (NEW)
  - compiler/tests/unit/mcp-descriptors-degenerate-spa.test.js (NEW)
  - compiler/tests/integration/mcp-descriptors-runtime-integration.test.js (NEW)
  - docs/changes/mcp-v0-devtools-scoping/progress.md (A false-claim correction + tests-landed)
  - docs/changes/mcp-v0-a-tests/progress.md (this file)
- B (compiler/runtime/stdlib/mcp.js) NOT touched — confirmed correct, A was wrong.
- getFormStatus().submitted now decodes (load-bearing assertion green).

## Deferred / follow-on
- Engine + form + channel `cellKey`/`compoundKeys`/cell `key` are RAW names (dev identity encoding). Production §47 per-file encoding pass-through is a documented follow-on: the per-file encoding ctx is constructed inside CG and not threaded to the post-CG extractor. Out of this dispatch's scope (matches the existing v0 posture documented in the extractor header + forms extractor inline comment).
- Channel auto-synced-cell collection fix (logic-body descent) was beyond the brief's narrow Task-1 channel clause ("fix only if shape mismatched") but required for the integration test's getChannelState decode; it is a Sub-unit A extractor concern and additive. Flagged here for PA awareness.

## STATUS: COMPLETE
