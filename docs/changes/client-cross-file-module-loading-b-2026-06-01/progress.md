# Progress — client-cross-file-module-loading-b-2026-06-01

Approach B: global `_scrml_modules` registry mirroring `_scrml_stdlib`. Fix known-gaps #6.

## 2026-06-01 — startup
- Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa6b1298537be002e
- Merged main (fast-forward) to b08f44df. bun install + pretest OK.
- Read DD in full. Read primary.map.md.
- BEFORE-state reproduced: examples/22-multifile -> app.client.js + components.client.js FAIL vm.Script ("Cannot use import statement outside a module"); types.client.js PARSES. No export side at all. HTML emits only entry script.
- Next: read touch-point source (emit-client.ts imports stage, emit-functions.ts fnNameMap return, index.ts script emission, runtime-template.js stdlib registry).

## 2026-06-01 — touch-points 1-3 + tests landed
- TP1: `modules` runtime chunk (idempotent var) in runtime-template.js + runtime-chunks.ts order/marker; bumped 26->27 chunk-count assertions.
- Plumbing: threaded importGraph + outputBaseDir through context.ts/index.ts/api.js (computed via computeOutputBaseDir from metaFiles).
- TP2 exporter footer: `_scrml_modules[key] = { public: emitted, ... }`; registers ONLY exports with a real emitted JS binding (scan emittedLines for `function|const|let|var NAME`); markup-only components + type-only + engines + channels skipped; footer ALWAYS emitted (={} when empty) so importer never destructures undefined.
- TP3 importer read: local .scrml import -> `const { x } = _scrml_modules[key]` (mirrors scrml:); stableKey via moduleRegistryKey(absSource, outputBaseDir) [fallback specifier-derived]; defensive isDefault path.
- Chunk gate in detectRuntimeChunks: activate `modules` when file imports a local .scrml OR is imported by another .scrml.
- 22-multifile: all client.js PARSE as classic vm.Script; zero raw import/export; single-file tree-shakes the chunk out.
- Updated 15 bug-locking tests (4 files) to registry-read shape. Full subset 15450 pass / 0 fail.
- Next: TP4 — topo-ordered dependency <script> tags BEFORE entry in index.ts HTML emission.

## 2026-06-01 — TP4 + R26 + browser test surfaced a REAL design gap in Approach B
- R26 Phase 3 checks 1-6 PASS on app/22-multifile, req.scrml (single-file regression), trucking board.scrml (subdir page importing subdir components — keys agree across dirs, ../../ relative script paths correct), all vm.Script parse, zero raw import/export.
- TP4 stdlib-exclusion fix: dep-script helper filters on LOCAL relative ./|../ .scrml source (scrml: stdlib was emitting dangling .../stdlib/store/index.client.js 404).
- BROWSER TEST SURFACED: the DD's Approach B emitted-example COLLIDES. types.client.js declares top-level `const UserRole`; app.client.js declares top-level `const { UserRole } = _scrml_modules[...]`. In the real browser, classic <script>s SHARE the global LEXICAL env, so two top-level `const UserRole` across scripts → "Identifier 'UserRole' has already been declared" (verified via vm separate-context). var doesn't help (var-vs-const cross-script also collides).
- FIX (matches DD "per-file namespacing" intent + the _scrml_stdlib IIFE precedent): wrap the body of each CROSS-FILE-LINKED .client.js (imports a local .scrml OR is imported by one) in an IIFE so its top-level const/function decls are IIFE-local; only the `_scrml_modules[key]={...}` footer escapes to the global registry. Single-file apps stay unwrapped (zero behavior change). Runtime shared-globals (_scrml_lift_target etc.) are ASSIGNMENTS not declarations — unaffected by the IIFE.
- Next: implement IIFE wrap for cross-file files; re-run browser test + R26.

## 2026-06-01 — IIFE fix + full test plan landed
- IIFE-wrap fix for cross-file-linked client.js (gated !embedRuntime + isCrossFileLinked); single-file unwrapped. Browser test 6/6 pass incl. faithful separate-script regression guard.
- Codegen unit test (cross-file-module-registry-emit.test.js): §2 vm.Script parse + §3 exporter footer + §4 importer read — 7/7 pass.
- Full pre-commit subset: 15457 pass / 0 fail / 815 files. Browser suite: 286 pass / 0 fail.
- R26 Phase 3 (final, IIFE-wrapped): all 6 checks pass on app/22-multifile + req.scrml (single-file regression) + trucking board.scrml (subdir page importing subdir components, keys agree across dirs).
- All 5 touch-points complete + the surfaced IIFE-collision fix. DONE pending final clean-status verification.

## 2026-06-01 — final verification
- Full pre-commit gate (unit+integration+conformance --bail): 15457 pass / 0 fail / 815 files.
- This commit goes through the REAL pre-commit hook (no --no-verify) to confirm the gate passes cleanly.
- Touch-points 1-5 + IIFE-collision fix complete. Ready for PA file-delta landing.
