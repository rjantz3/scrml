# progress — const-only-module-server-emit-2026-06-23

gap: g-const-only-module-no-server-emit (sPA ss1 item 2). base spa/ss1 tip b307c332.

## 2026-06-23 — startup
- Worktree verified, fast-forward-merged spa/ss1 (b307c332 ancestor of HEAD confirmed).
- node_modules symlinked from main; sample compile runs (cli --version 0.7.0).

## 2026-06-23 — Phase 0 REPRODUCE (PASS-TO-PROCEED met)
- Built repro/ : config.scrml (const-only: MAX_ROWS=100 + DB_PATH="./repro.db", NO fns/?{}/channels)
  + app.scrml (server fn listItems interpolates MAX_ROWS into a ?{} SELECT; CREATE TABLE so PA validates;
  markup caller so not dead).
- `bun run compiler/src/cli.js compile .../repro` → W-SERVER-IMPORT-UNEMITTED MISSING-FILE FIRES:
  "Server bundle 'app.server.js' imports from './config.server.js', but 'config.scrml' has no server
  content and emits no .server.js". Bug confirmed.

## Layer decision
- Cross-file pass lands in api.js, immediately BEFORE checkServerImportInvariant() (~line 2189).
  Rationale: that function ALREADY has the importer regex, the `./X.server.js`→`./X.scrml` source-path
  resolution, cgResult.outputs (keyed by source path), AND metaFiles (file ASTs by .filePath) are in
  scope. emit-server.generateServerJs can't know cross-file import facts; index.ts second-pass would
  duplicate the resolution logic api.js already has. New exported helper
  `generateValueOnlyServerJs(fileAST)` in emit-server.ts produces the minimal value-only .server.js
  (value-export lines + the same helper-inline scans generateServerJs runs) by reusing
  emitModuleValueExportLines + factoring the helper-inline post-pass.

## DONE
- [x] emit-server.ts (commit 4386da32): export generateValueOnlyServerJs(fileAST); extract
  SERVER_STRUCTURAL_EQ_HELPER + injectAfterHeader() so route-handler + value-only paths inline the
  IDENTICAL helper. Route-handler structural-eq output byte-identical (66 server-eq tests pass).
- [x] api.js (commit 0938e4ae): emitValueOnlyServerJsForDanglingImports() pre-pass, runs BEFORE
  checkServerImportInvariant() AND the validate-emit gate. Emits value-only .server.js ONLY for
  targets ACTUALLY server-imported by-name with no .server.js + a server-importable value export.
- [x] coupled test (same commit 0938e4ae): w-server-import-unemitted.test.js §3 inverted (no-fire +
  asserts consts.server.js exports TTL), §4 partition now markup-component-only (still fires), §5 new
  scope-guard (client-only const module → no dead .server.js). §1/§2 stay green. 5 pass.

## R26 VERIFICATION (empirical)
- repro/ compile: W-SERVER-IMPORT-UNEMITTED 1 → 0. config.server.js emitted:
  `export const MAX_ROWS = 100;` + `export const DB_PATH = "./repro.db";`. node --check CLEAN.
  No type exports, no ?{}. app.server.js `import { MAX_ROWS } from "./config.server.js"` resolves.
  --validate-emit gate passes (Acorn-parsed).
- MISSING-EXPORT branch (S208) still fires on its own shape: §1 no-fire test green; markup/type-only
  modules (no value export) STILL warn (§4 + probes).
- trucking-dispatch: W-SERVER-IMPORT-UNEMITTED stays 0; 36 files compile; warning count 57 unchanged;
  no NEW .server.js (models/auth.server.js already emitted by route path → pre-pass skips it). smoke
  integration test 13 pass.
- helper-inline through the value-only path verified: a const init `[1,2] == [1,2]` → value-only file
  inlines _scrml_structural_eq above `export const SAME = _scrml_structural_eq([1,2],[1,2])`, node --check CLEAN.
- Full pre-commit suite (17,693 tests / 971 files) green on both feature commits.
