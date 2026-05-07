# ast-builder grammar fixes — Survey Note

Three bundled grammar findings, all in `compiler/src/ast-builder.js` export
handler around lines 5377–5466.

## Finding 1 — `export function` swallows function-decl

### Where
`compiler/src/ast-builder.js:5410` — the EXPORT branch calls `collectExpr()`
on everything after `export [pure] [server]`. The captured string contains
`function foo ( ) { ... }` but no `function-decl` node is emitted; only a
single `export-decl` with `exportKind: "function"` and a stringy `raw`.

The dispatch comment at line 5446–5448 ("Mirrors how `export function
helper() {}` produces both function-decl AND export-decl") was aspirational
— that mirroring exists for `export type` (line 5443–5463 synthesizes a
`type-decl`) but NOT for `export function`.

### Probe (current)
```
"${ export function foo() { return 1 } }"
  EXPORT: {raw:"export function foo ( ) { return 1 }", exportedName:"foo", exportKind:"function"}
  (no FN-DECL emitted)
```

### Approach (chosen)
Mirror the existing `export type` synthesis pattern (line 5443–5463): when
`exportKind === "function" || "fn"`, ALSO push a synthetic `function-decl`
with `exported: true, fromExport: true`. Pushed BEFORE the export-decl so
hoisting + walker order match `export type`.

The synthetic node carries name + a flat `raw` body string (the full
`function foo() { ... }` source). Body parsing is deferred — downstream
walkers that need params/body can re-tokenize the `raw`. This keeps the
patch surgical (no second tokenizer pass during export handling).

`emit-library.ts` (lines 397–429) handles export-decl and function-decl
separately. To avoid double-emission, skip `function-decl` nodes with
`fromExport: true` (the export-decl raw still emits the full source).

### Backward-compat
- export-decl shape unchanged → module-resolver, type-system, codegen
  emit-library, component-expander all keep working.
- Any walker that previously couldn't see export-wrapped functions now
  CAN; this is purely additive.

## Finding 2 — `export *` not parsed

### Where
`compiler/src/ast-builder.js:5428` — the re-export regex
`/^\s*\{\s*([^}]*)\}\s*from\s+["']([^"']+)["']/` only matches the brace
form. `export * from './x.scrml'` falls through and produces
`exportedName:null, exportKind:null`.

### Approach
Add a sibling regex BEFORE the brace regex:
```js
const reExportAllMatch = expr.match(/^\s*\*\s*from\s+["']([^"']+)["']/);
```
On match: set `exportedName: "*"`, `exportKind: "re-export-all"`,
`reExportSource: <path>`, and a new flag `isReExportAll: true`.

### Downstream propagation
- `module-resolver.js:165–178` already iterates `astExports`. Extend the
  branch: if `exp.isReExportAll`, push a `{ name: "*",
  kind: "re-export-all", reExportSource, isReExportAll: true, span }` entry.
- `api.js:828–853` `resolveTypeThroughReExport`: after the named-match
  loop fails, do a second pass over re-export-all entries and recurse into
  each `reExportSource`. Cycle-break already in place via `visited` set.

## Finding 3 — `export { A as B } from '...'` and `export { A as B }` not parsed

### Where
Same regex at line 5428. Currently captures `A as B` as a literal
`exportedName: "A as B"` — wrong; the outward-facing name is `B`, source
name is `A`.

### Approach
Replace the simple split with a name-spec parser:
```js
function parseNameSpec(s) {
  // "A as B" → { exported: "B", local: "A" }
  // "A"      → { exported: "A", local: "A" }
}
```
Store a `renames` array on the export-decl: `[{exported, local}, ...]`.
Set `exportedName` to the comma-joined OUTWARD names (B, D), preserving
the existing module-resolver contract.

Also handle the NON-from variant `export { A as B }` — local rename
without re-export. Same approach but `reExportSource: null`,
`exportKind: "rename"` (new) and `renames` carries the local→exported
mapping.

### Downstream propagation
- `module-resolver.js`: when expanding comma-joined `exportedName` into
  per-name entries, also attach the corresponding `local` name from the
  `renames` map. New entry shape: `{ name: <exported>, localName: <local>,
  kind, reExportSource, span }`.
- `api.js:828–853` `resolveTypeThroughReExport`: when chasing a re-export,
  use `exp.localName` (fallback to `exp.name`) as the type-name lookup
  key in the source file.

## Out-of-scope (won't fix here)

- Default re-exports (`export { default as X } from '...'`) — scrml has no
  default export concept.
- `export type { X } from '...'` (TypeScript-style type-only re-export) —
  no current need.
- Inline declarations under `export *` (impossible — `*` only re-exports).

## Existing-test risk

Snapshot of all 47 `export function`/`export pure function`/`export server
function` usages in tests: most check codegen output (`bpp.test.js`,
`self-host-smoke.test.js`) or post-resolution semantics. Adding a
synthetic `function-decl` is additive; the regression risk is in walkers
that count nodes by kind — none observed in survey.

The existing `f-auth-002-export-modifiers.test.js` checks `exp.exportKind
=== "function"` and `exp.exportedName === "..."` — both preserved.
