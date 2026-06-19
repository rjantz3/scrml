# ss1 — emit pure-module VALUE exports into `.server.js`

Gap: g-route-mis-inference-server-called-pure-helper (known-gaps.md:1494).

## 2026-06-19 — Step 1: emit-server value-export emission (code)
- WORKTREE startup verified (worktree-agent-a6eb2c2fd9ba6086b, base 72dc4fdb), bun install + pretest ran.
- Empirical baseline reproduced: trucking compile = 80 warnings, 6 W-SERVER-IMPORT-UNEMITTED;
  auth.server.js exports only __ri_route_rolePath_7, routes, fetch.
- ROOT investigation: export-decl nodes carry exportKind {const,function,fn,re-export,type,...},
  exportedName, raw (UNLOWERED source). Functions have a paired synthetic function-decl
  (fromExport:true) with full params+body (S99 ANOMALY-2-FIX). Consts have NO paired decl —
  only raw text. emitLogicNode skips fromExport nodes → must emit fn bodies via emitFnShortcutBody.
- Added `emitModuleValueExportLines(fileAST, filePath, assembledBody)` in emit-server.ts:
  - const: split raw initializer, parseExprToNode + emitExprField(mode:server) → `export const NAME = ...`.
  - function/fn: emit via emitFnShortcutBody with **boundary:"client"** (sync body — server-mode
    match wraps in `await (async function(){})()` which would (a) await-outside-async SyntaxError
    and (b) silently make a sync match-helper Promise-returning, breaking `if(!isValidHosTransition())`).
  - SKIP: type/re-export (no runtime export), markup-valued consts (components, leading `<`),
    server-only fn bodies (`?{}`/transaction recursively — e.g. runSeeds), `?{`-init consts,
    already-declared names (no double-decl).
  - Appended to `lines` BEFORE the helper-inline scans so a `_scrml_structural_eq(` introduced
    only by an exported helper still triggers top-of-file inlining (driver-card cdlExpiresClass).
  - Mangling counter snapshot+restore (var-counter getVarCounter/setVarCounter) so handler
    `_scrml_*_<N>` suffixes stay byte-stable globally.
- VERIFIED (R26): trucking 80→74 warnings, W-SERVER-IMPORT-UNEMITTED 6→0; auth.server.js now
  exports all 9 expected value bindings + the route trio (byte-identical route prefix).
  All 25 emitted server.js parse clean (node --check). Components/runSeeds correctly skipped.
- NEXT: re-baseline trucking-dispatch-smoke-integration.test.js; add regression test; full `bun run test`.

## 2026-06-19 — Step 2: re-baseline + regression tests (coupled)
- trucking-dispatch-smoke-integration.test.js: REMOVED W-SERVER-IMPORT-UNEMITTED:6 from
  EXPECTED_BASELINE (now resolved); aggregate 80->74; header aggregate comment updated.
- w-server-import-unemitted.test.js: §1 (MISSING-EXPORT, server-called route-inferring helper)
  was the ss1 bug — now asserts NO-FIRE + log.server.js exports entryLine. §4 partition switched
  to the still-firing §3 const-only MISSING-FILE shape. Header doc: branch (b) marked RESOLVED.
  §3 (MISSING-FILE, const-only module emits no .server.js) STILL fires — separate gap, unchanged.
- g-pure-module-server-emit.test.js: +§3 ss1 regression — exported const + route-inferring pure
  fn → .server.js exports BOTH the value bindings AND the route handler (additive); consumer
  by-name server import resolves; plain export fn is SYNC (no async leak); no `not`/`<` leak.
- FULL gate (unit+integration+conformance, --bail): 17249 pass / 90 skip / 1 todo / 0 fail.
- NEXT: full `bun run test` incl. browser.

## 2026-06-19 — Step 3: full suite green
- Committed code + coupled tests (one unit): HEAD 4a19ae98.
- FULL `bun run test` (incl. browser — 1031 files): 24529 pass / 237 skip / 1 todo / 0 fail, exit 0.
- ss1 COMPLETE. git status clean.
