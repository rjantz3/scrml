# §13.2 Sub-Phase B — Typer extension for Promise<T> classification

## 2026-05-13T... start

- Worktree rebased onto main `38d1ef1` (was at `9b98118`, +14 commits behind).
- Maps consulted: primary, domain, schema, error.
- SPEC §13.2 Sub-Phase A landed at `67a6a81`.
- Pre-flight: `bun install` + `bun run pretest` clean.

## Findings (pre-implementation)

1. **`async function` is silently ignored today.** `compiler/src/ast-builder.js` line ~6018 `export` handler consumes `pure`/`server` prefixes but NOT `async`. Result: `export async function foo` → export-decl with `exportKind: null` + `raw: "export async"`, followed by function-decl with `name: "foo"` but NO `isAsync` field.
2. **`async fn` (shorthand) IS handled** at line ~7087 — `isAsync: true` is set on the function-decl.
3. **`async` IS a KEYWORD** per tokenizer (`compiler/src/tokenizer.ts:62`).
4. **FunctionDeclNode interface** at `compiler/src/types/ast.ts:714` has NO `isAsync` field today.
5. **`LambdaExpr.isAsync`** exists at `ast.ts:1671`.
6. **Stdlib path detection**: `STDLIB_ROOT = compiler/../../stdlib` per `module-resolver.js:558`.
7. **exportRegistry**: `Map<absolutePath, Map<name, {kind, category, isComponent}>>` populated by `buildExportRegistry` in `module-resolver.js:369`. Function exports have `kind: "function"` or `"fn"`.
8. **Auto-await fire site**: `compiler/src/codegen/scheduling.ts:96-115` `isServerCallExpr` + lines 285/292/314/316 emit `await`.
9. **Predicate signal**: today reads only from `routeMap.functions[i].boundary === "server"`. To extend: add stdlib Promise lookup.

## Plan

- Step 1a: Add `isAsync` to `function` declaration parser (line ~6887 ast-builder.js) — mirror the `async fn` pattern at line ~7087.
- Step 1b: Extend `export` parser to consume `async` modifier and propagate to synthesized function-decl.
- Step 1c: Q5 enforcement — detect non-stdlib file with `async function` and emit info diagnostic.
- Step 2: Symbol-table or context: track exported async fn names per stdlib module.
- Step 3: Extend `isServerCallExpr` to also fire on stdlib Promise-returning fns via exportRegistry lookup.
- Step 4: Tests — unit tests for classifier; integration tests via compiled output.

## 2026-05-13 — CONTINUATION (Wave 4.3) start

Steps 1a-b already landed at `503c3b4` (worktree rebased onto current main with that commit applied). Resuming with Step 1c.

- Verified `compiler/src/types/ast.ts` `FunctionDeclNode.isAsync?: boolean` present with JSDoc.
- Verified `compiler/src/ast-builder.js` parser handles `async function` at line ~6970 + `export async function` at line ~6053 (via decl-shape boundary guard at line ~1965).
- Pre-flight: `bun install` + `bun run pretest` clean. Baseline tests not yet run; will use pre-commit gate after each commit.

## 2026-05-13 — Step 1c LANDED at `87daae1`

- compiler/src/validators/lint-async-user-source.ts NEW (~125 LOC) — `runAsyncUserSourceLint(ast)` walks function-decl with isAsync:true, fires `I-ASYNC-USER-SOURCE` when file path NOT under `<repo>/stdlib/`. Uses validators/ast-walk.ts.
- compiler/src/api.js Stage 3.008 LINT-ASYNC-USER-SOURCE wired (post-LINT-TRY-CATCH).
- SPEC §34 catalog row added; severity Info.
- Pre-commit gate clean: 11,198 / 88 / 1 / 0.

## 2026-05-13 — Step 2 LANDED

- ast-builder.js export handler — peek-ahead for `export async function|fn name` shape when collectExpr returns empty (decl-shape boundary breaks at `async`). Harvest name/kind onto export-decl + carry `isAsync:true`. Guard added: only fires when `expr === ""` (otherwise normal `export function foo {...}` followed by `async function bar()` would mis-harvest).
- F1 synthetic function-decl path skipped for async case (real function-decl produced by main loop, body parsed once).
- module-resolver.js `buildExportRegistry`: per-name value shape extended with optional `isAsync` field. Re-export resolution inherits `isAsync` from source.
- module-resolver.js NEW exports: `isStdlibFilePath(absPath)` + `isPromiseReturningStdlibFn(name, sourceModule, exportRegistry)` — Q5-gated classifier query helper.
- Pre-commit gate clean: 11,198 / 88 / 1 / 0.

## 2026-05-13 — Step 4 LANDED

- compiler/tests/unit/auto-await-promise-stdlib.test.js (NEW) — 9 tests covering 8 sections:
  §1 positive: safeCallAsync !{} collapse + auto-await on guarded init
  §2 positive: stdlib host module classified (canonical probe)
  §3 negative: stdlib non-Promise function (safeCall) does NOT auto-await
  §4 negative: user async function does NOT classify in caller (Q5 carve-out)
  §5 positive: user async function fires I-ASYNC-USER-SOURCE info lint + stdlib does NOT
  §6 edge: !{} works without explicit await (Q4)
  §7 idempotency: emitted JS never contains `await await` (Q2 Position C regression guard)
  §8 edge: STDLIB-EXPORT-SEED isolates stdlib TAB so SYM/TS host-globals don't leak
- All 9 new tests pass on first run.
- Pre-commit gate: 11,207 / 88 / 1 / 0 (+9 from Step 4).

## 2026-05-13 — Step 3 LANDED

- scheduling.ts: NEW `buildCalleeImportMap(fileAST)` — per-file `name → absSource` resolver built from fileAST.imports.
- scheduling.ts: NEW `isPromiseReturningCallExpr` — extended classifier covering server fns + stdlib Promise<T> (delegates to `isPromiseReturningStdlibFn`).
- scheduling.ts: `hasServerCallees` extended (optional `calleeMap` + `exportRegistry` params). Walks bare-expr + let/const-decl + guarded-expr (stdlib Promise<T> can appear as init or as guarded-expr's guardedNode). Backwards-compatible default-null params.
- scheduling.ts: `scheduleStatements` extended with optional `calleeMap` + `exportRegistry` params; threads into emitOpts for emit-logic.ts consumption.
- scheduling.ts: Promise.all dependency-graph gate narrowed to server-only classification (passing null/null to hasServerCallees) so the stdlib auto-await extension doesn't accidentally engage the Promise.all coalescing path for non-server functions.
- emit-functions.ts: builds calleeMap once per file via `buildCalleeImportMap(ctx.fileAST.ast)` (correct TABResult wrapper unwrap). Threads calleeMap+exportRegistry into hasServerCallees + scheduleStatements.
- emit-logic.ts: EmitLogicOpts extended with `asyncRouteMap` / `asyncCalleeMap` / `asyncExportRegistry` / `asyncFilePath`. `case "guarded-expr"` auto-awaits when classifier inputs are threaded AND `isPromiseReturningCallExpr(guardedNode, ...)` returns true. Emits `let _scrml_result = await initExpr;` (vs. pre-S89 no-await form).
- api.js: NEW Stage 3.105 STDLIB-EXPORT-SEED — TAB-only pre-pass that scans the import graph for `scrml:*` imports, parses each stdlib `.scrml` source once, and seeds `moduleResult.exportRegistry` with the export surface (including `isAsync`). Does NOT add stdlib files to the main compile set (avoids SYM/TS host-global errors).
- p3-follow-no-isComponent-routing.test.js: allowlist updated for `codegen/scheduling.ts` (3) + `codegen/emit-logic.ts` (1) — type-signature-only mentions of `isComponent` (no routing reads).
- Verified live: `fetchData()` with `safeCallAsync(thunk) !{ ... }` emits as `async function _scrml_fetchData_3()` with `let _scrml_result = await safeCallAsync(...)`. Two-step pattern collapse confirmed.
- Pre-commit gate clean: 11,198 / 88 / 1 / 0.
