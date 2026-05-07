# A1b B14 — engine binding + auto-declared variable + cross-file mount

Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a6f0c507006476b69`
Branch: `worktree-agent-a6f0c507006476b69`
Dispatch: S68 — substitute for `scrml-dev-pipeline`

## 2026-05-07 STARTUP

- Verified WORKTREE_ROOT, status clean.
- Worktree was at `a4eed93` (S67 close). Local main at `0671286` (B12 SHIP). Rebased onto main; HEAD now `0671286`.
- `bun install` ran clean.
- Baseline test run: 9321 pass / 0 fail / 52 skip / 1 todo (matches dispatch contract; skip count diverges from 41 — noted but not blocking, count drift across S67/S68 work).
- Note: a transient `serve.test.js` ECONNREFUSED failure on first run; resolved on re-run (port-collision flake, not B14-related).

## 2026-05-07 PHASE 0 — survey

- Read SPEC §51.0.A-K, §21.8, §34, primer §13.7 (B1-B13), `compiler/src/symbol-table.ts`, `compiler/src/types/ast.ts`, `compiler/src/module-resolver.js`, `compiler/src/ast-builder.js` engine-decl construction (~line 8367).
- Findings written to `SURVEY.md`. Key gaps:
  - Engine AST shape is `kind: "engine-decl"` (legacy `<engine name=N for=T>` only); §51.0 form (`<engine for=T>` no `name=`) not parsed.
  - Engine body is RAW TEXT (`rulesRaw: string`) — not walkable.
  - MOD's exportRegistry has no `engine` kind; `export <engine ...>` Form 1 unrecognized.
  - `E-ENGINE-MOUNT-NOT-ENGINE` missing from §34.
- Decision summary: extend ast-builder for §51.0 syntax, extend symbol-table with new `_cellKind: "engine"` + `engineMeta`, extend MOD with engine-aware exportRegistry, add §34 row.
- Committed: `94058f0` WIP(a1b-b14): Phase-0 survey + progress scaffold.

## 2026-05-07 PHASE 1 — ast-builder extensions

- Extended `compiler/src/ast-builder.js` engine-decl parser to accept §51.0 syntax:
  - `<engine for=Type>` (no `name=`) — auto-derives var name per §51.0.C.
  - `var=NAME` override — supersedes auto-derive.
  - `initial=.Variant` — recorded as `engine-decl.initialVariant`.
  - `pinned` bareword modifier — recorded as `engine-decl.pinned: boolean`.
  - New AST fields: `varName`, `varNameOverride`, `initialVariant`, `pinned`, `isExported`.
  - Legacy `name=` form preserved verbatim.
- Path discipline incident: discovered I had been editing `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/...` (MAIN repo) instead of the worktree path. Copied edits to worktree, restored main repo files. Lesson: ABSOLUTE paths starting with worktree root only — checked at each Read/Write/Edit.

## 2026-05-07 PHASE 2 — symbol-table.ts extensions

- Widened `CellKind` with `"engine"` value (5th value).
- Added `EngineMetadata` interface — forward-compat shape per audit §2 brief #1 (BASIC fields populated; A7 hierarchy fields declared/null/undefined).
- Added `engineMeta?: EngineMetadata` field to `StateCellRecord`.
- Exported `autoDeriveEngineVarName(typeName)` — §51.0.C lowercase-first-character literal rule.
- Implemented PASS 10.A `walkRegisterEngines` — registers engine-decls as StateCellRecord with `_cellKind: "engine"`. Fires `E-ENGINE-VAR-DUPLICATE` on collision with state-decl OR another engine.
- Implemented PASS 10.B `walkValidateCrossFileEngineMounts` — walks markup for self-closing tags matching import-bindings; fires `E-ENGINE-MOUNT-NOT-ENGINE` for non-engine source exports (with user-component suppression for CE/NR territory).
- Wired both passes into `runSYM`.
- Tests: baseline 9321 / 0 fail preserved.
- Committed: `f5ea668` WIP(a1b-b14): engine cell registration + cross-file mount validation.

## 2026-05-07 PHASE 3 — MOD engine-awareness + Form 1 export

- Extended `compiler/src/module-resolver.js` `buildImportGraph` to walk `file.ast.machineDecls` for engines with `isExported: true`, pushing them as `{kind: "engine"}` exports.
- Extended `buildExportRegistry` to recognize `kind === "engine"` → `category: "engine"`.
- Added `export <engine ...>` Form 1 detection in `liftBareDeclarations` mirroring channel-export Form 1: pairs trailing-`export` text block with following engine block, tags with `_b14IsExport: true`. Flag flows to engine-decl as `isExported: true`.
- Updated B4 docstring + table to reflect engine-aware MOD.
- Tests: baseline 9321 / 0 fail preserved.
- Committed: `6c202b4` WIP(a1b-b14): MOD engine-aware exportRegistry + export <engine> Form 1.

## 2026-05-07 PHASE 4 — unit tests + §34 catalog row

- Wrote `compiler/tests/unit/engine-binding-b14.test.js` — 36 unit tests:
  - 9 AST-builder syntax acceptance tests
  - 8 `autoDeriveEngineVarName` edge-case tests
  - 6 SYM PASS 10.A registration tests
  - 4 E-ENGINE-VAR-DUPLICATE tests
  - 6 PASS 10.B cross-file mount validation tests
  - 3 engineMeta surface tests
- Initial 2 failures (Form 1 detection only checked `block.type === "state"` but BS classifies engines as `markup` initially); fixed by accepting both types in `liftBareDeclarations`.
- Added `E-ENGINE-MOUNT-NOT-ENGINE` row to SPEC §34 (line 14240).
- Tests: 9321 → 9357 pass / 0 fail / 52 skip / 1 todo (delta +36).
- Committed: `b619127` test(a1b-b14): 36 unit tests + §34 catalog row + Form 1 detection fix.

## 2026-05-07 PHASE 5 — primer §13.7 update

- Added B14 row to primer §13.7 annotated-AST contracts table.
- Added B14 specifics block (~10 bullets covering Option C registration, EngineMetadata shape, autoDeriveEngineVarName, var= override, syntax extensions, Form 1 detection, MOD engine-awareness, pinned policy, PASS 10.B mount validation, B17 deferral note, test summary).

## FINAL REPORT

### 1. WORKTREE_PATH

`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a6f0c507006476b69`

### 2. FINAL_SHA

`51e1093` (worktree branch tip; rebased onto current main `1023744` post-record-update).

Commit chain on this branch after rebase (oldest → newest):
- `6010ce5` WIP(a1b-b14): Phase-0 survey + progress scaffold
- `b641923` WIP(a1b-b14): engine cell registration + cross-file mount validation
- `7053602` WIP(a1b-b14): MOD engine-aware exportRegistry + export <engine> Form 1
- `4d2605e` test(a1b-b14): 36 unit tests + §34 catalog row + Form 1 detection fix
- `78be916` docs(a1b-b14): primer §13.7 B14 row + specifics block + progress final
- `51e1093` docs(a1b-b14): record FINAL_SHA + commit chain in progress.md

### 3. FILES_TOUCHED

- `compiler/SPEC.md` — added §34 row for `E-ENGINE-MOUNT-NOT-ENGINE`.
- `compiler/src/ast-builder.js` — §51.0 engine syntax extension (var=, initial=, pinned, auto-derive); `export <engine>` Form 1 detection.
- `compiler/src/module-resolver.js` — engine-aware exportRegistry (`kind: "engine"` → `category: "engine"`).
- `compiler/src/symbol-table.ts` — `CellKind: "engine"`; `EngineMetadata` interface; `autoDeriveEngineVarName` export; PASS 10.A `walkRegisterEngines`; PASS 10.B `walkValidateCrossFileEngineMounts`.
- `compiler/tests/unit/engine-binding-b14.test.js` — 36 new unit tests (NEW FILE).
- `docs/PA-SCRML-PRIMER.md` — §13.7 B14 row + B14 specifics block.
- `docs/changes/phase-a1b-step-b14-engine-binding/progress.md` (THIS FILE).
- `docs/changes/phase-a1b-step-b14-engine-binding/SURVEY.md`.

### 4. TEST_DELTA

- Pre-B14 baseline (post-rebase to main `0671286`): 9321 pass / 0 fail / 52 skip / 1 todo.
- Post-B14: 9357 pass / 0 fail / 52 skip / 1 todo (delta +36 from new B14 unit tests).
- Pre-commit subset: 8639 pass at PASS 0 phase commit; should be ~8675 post-B14 (the +36 test file is in the pre-commit set).

### 5. DEFERRED_ITEMS

- **`initial=` validation against the type's variant set** — B15.
- **`W-ENGINE-INITIAL-MISSING` lint** — B15.
- **`rule=` contract validation (three target-only forms)** — B15.
- **State-child exhaustiveness over engine variants** — B15.
- **Compile-time `E-ENGINE-INVALID-TRANSITION`** inside state-child bodies — B15.
- **Derived-engine specific rejections (E-DERIVED-ENGINE-NO-*)** — B16.
- **`E-DERIVED-ENGINE-CIRCULAR` via B7 reuse** — B16.
- **`<onTransition>` + `effect=` validation** — B17.
- **Residual component-vs-engine cases** (specifically `E-COMPONENT-ENGINE-SCOPE` fire-site when engine is inside a component body) — B17. The audit §1.5 recommended B14 fire it; today's `component-def.raw: string` (non-walkable) blocks it. Walker shape ready.
- **A7 hierarchy implementation** (nested engines, `history`, `internal:rule`, `parallel`, `<onTimeout>`) — A5-2 / A5-3 / A5-4 dispatches.
- **A1c codegen** for engine cells (runtime emission, transitions, `.advance()`, `<onTransition>` wiring) — A1c.
- **`derived=expr` rich-form parsing** (match blocks, function calls, arbitrary expressions per §51.0.J) — B16. B14 stamps `engineMeta.derivedExpr` from the legacy `sourceVar` field; B16 will widen to the §51.0.J expression-tree form.
- **Spec-amendment edge case for §51.0.C all-uppercase rule** — `URL → uRL` follows the literal spec; whether the spec should enumerate a contiguous-uppercase-run rule is a non-blocking footnote follow-up. Audit §1.2 flagged.

### 6. OPEN_QUESTIONS

- **`pinned` semantics on derived engines** — §51.0.J describes `pinned` as moot on derived engines (no writes). B14 records `isPinned: true` regardless. Validation deferred to B16.
- **Cross-file mount of same-file-only engine** — engines with `isExported: false` shouldn't be importable; today the import is allowed if the name string matches anything in the source file's `kind: "engine"` exports. The check is correct (only `isExported: true` engines reach exportRegistry), but multi-file integration tests for this scenario aren't in the unit test set; integration coverage deferred.
- **`E-ENGINE-VAR-DUPLICATE` between engine and an imported state-cell binding** — collision check today examines `fileScope.stateCells` (state-cell records). An imported binding via `importBindings` with the same name as an engine's auto-derived var is NOT detected as duplicate. The §51.0.C wording is "separately declared in scope"; an import is a different kind of declaration. Defer to B17 if explicit.

### 7. PRIMER §13.7 B14 ROW DRAFT + B14 specifics block

LANDED in `docs/PA-SCRML-PRIMER.md`. See lines 555-after (table row inserted at table; specifics block inserted after B13 specifics, before §13.8).

### 8. SURVEY-NOTE

`docs/changes/phase-a1b-step-b14-engine-binding/SURVEY.md` — Phase-0 findings landed at the Phase-0 commit (`94058f0`).

### 9. SPEC-PROSE FOLLOW-UPS

- **§34 catalog row added:** `E-ENGINE-MOUNT-NOT-ENGINE` (S68 — A1b B14). Wired to §51.0.D + §21.8.
- **§51.0.C all-uppercase footnote (NON-BLOCKING):** B14 implements the literal lowercase-first-character rule per spec; `URL → uRL` follows. If the project decides to enumerate a contiguous-uppercase-run rule (`URL → url`), a small footnote enhancement to §51.0.C would clarify. Defer.

### 10. MOD-EXPORTREGISTRY-EXTENSION SUMMARY

- **Extension:** `module-resolver.js:buildExportRegistry` now recognizes `kind: "engine"` → `category: "engine"` (added to the kind→category mapping).
- **Source:** `module-resolver.js:buildImportGraph` walks `file.ast.machineDecls` for engines with `isExported: true` and pushes them into the file's exports as `{name: <varName>, kind: "engine", localName: <varName>}`.
- **API change:** the per-name shape `{kind, category, isComponent}` gains a new `kind` enumeration value (`"engine"`) and a corresponding `category` value (`"engine"`). `isComponent` remains `false` for engines (engines are NOT components per §51.0.K).
- **Consumer:** SYM PASS 10.B `walkValidateCrossFileEngineMounts` reads the registry and validates self-closing tag mounts against the source export's category.
- **Back-compat:** existing consumers (NR, CE, B4 fireImportPinnedInvalid) see new entries under the `engine` kind and pass through their existing checks unchanged.
