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
