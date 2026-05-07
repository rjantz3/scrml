# A1b B14 — Phase-0 survey notes

## Audit Phase-0 items + findings

### (a) Engine AST shape — `kind: "engine-decl"`

`compiler/src/ast-builder.js:8367-8458` parses both `<engine ...>` and legacy `<machine ...>`
into a node:

```ts
{
  kind: "engine-decl",
  engineName: string,         // value of `name=NAME` attribute (LEGACY form)
  governedType: string,       // value of `for=TYPE` attribute (REQUIRED)
  rulesRaw: string,           // raw textual body — NOT walkable
  sourceVar: string | null,   // value of `derived=@NAME` attribute (NAME without @)
  legacyMachineKeyword: bool, // true for `<machine ...>` form
  openerHadSpaceAfterLt: bool,
  span: Span,
}
```

**Material gap vs §51.0.B:** the canonical §51.0 form is `<engine for=Type [initial=.X]
[derived=expr] [pinned] [var=name]>` — the auto-declared variable is DERIVED from `for=` per
§51.0.C, NOT separately specified via `name=`. The current parser:

- Hard-requires `name=` (§51.0 form would fail with `E-ENGINE-020` "pre-S25 sentence form" or
  the bareword regex would simply produce empty engineName).
- Does not parse `initial=` (§51.0.E)
- Does not parse `pinned` (§51.0.B)
- Does not parse `var=` (§51.0.C)
- `derived=` only accepts `@varname` syntax (legacy single-var derived); the §51.0.J form
  accepts arbitrary expressions including `match` blocks.

**Decision:** B14 needs to extend the parser to accept the §51.0 syntax. This is a
substantive AST-builder addition. The change is additive (legacy form continues working when
`name=` is present); modern form works when `name=` absent.

The body of `engine-decl` is RAW TEXT (`rulesRaw`). State-children are not walkable AST nodes.
This means B14 cannot walk for nested engine decls (no inside-component-body detection via the
SYM walker tree). The component-body-detection check must be done at file-scope visibility.

### (b) MOD's exportRegistry

`compiler/src/module-resolver.js:308-368` builds `Map<filePath, Map<name, {kind, category,
isComponent}>>`. Categories: `channel | user-component | type | function | const | other`.

`kind` derives from `exportKind` on `export-decl`: one of `type | function | fn | const | let
| channel | re-export | re-export-all | rename | local | unknown`.

**Engine-export gap:** no parser path for `export <engine ...>`. The `export <ComponentName>`
Form 1 (ast-builder.js:690) requires `block.isComponent === true` — uppercase first char —
which excludes `engine`. So `export <engine ...>` is silently UNRECOGNIZED today; the engine
decl appears at file scope but the `export` keyword preceding it is dropped.

**B14 MOD enhancement requirement:** to support `export <engine ...>`, the parser needs:
1. Recognition of `export <engine ...>` Form 1 in ast-builder, AND/OR
2. Recognition of an explicit `export const xxx` form where the RHS is an engine declaration.

Per primer §13.7 B4 specifics, "`export <engine var=…>` desugars to `export const`,
indistinguishable from arbitrary const today." The natural path: extend the ast-builder's Form
1 detection to ALSO accept `export <engine ...>` (lowercase opener); produce a synthetic
`export-decl` with `exportKind: "engine"` and `exportedName: <engine.varName>`.

### (c) §34 catalog — engine error rows

Verified at `compiler/SPEC.md:14230-14239`:

| Code | Status |
|---|---|
| `E-ENGINE-INVALID-TRANSITION` | EXISTS |
| `E-ENGINE-EFFECT-AMBIGUOUS` | EXISTS |
| `E-ENGINE-VAR-DUPLICATE` | EXISTS — wired to §51.0.C |
| `W-ENGINE-INITIAL-MISSING` | EXISTS |
| `E-DERIVED-ENGINE-NO-RULES` | EXISTS |
| `E-DERIVED-ENGINE-NO-INITIAL` | EXISTS |
| `E-DERIVED-ENGINE-NO-WRITE` | EXISTS |
| `E-DERIVED-ENGINE-INITIAL-UNDEFINED` | EXISTS |
| `E-DERIVED-ENGINE-CIRCULAR` | EXISTS |
| `E-COMPONENT-ENGINE-SCOPE` | EXISTS — wired to §51.0.K |

**MISSING:** `E-ENGINE-MOUNT-NOT-ENGINE` is NOT in §34. B14 either:
- Adds the catalog row, OR
- Reuses an existing code, OR
- Defers cross-file-mount validation to a later step (B17 already owns "residual
  components-vs-engines distinction").

**Decision:** add the catalog row. The wave-ordering audit specifically expected this; the
cleanest approach is to add the §34 row as a small spec amendment and wire B14's mount
validator to it.

### (d) B5 `_cellKind` extension

`compiler/src/symbol-table.ts:186` declares `CellKind = "plain" | "bindable" | "markup-typed"
| "compound-parent"`. The classifier `classifyStateDecl` (line 1233) is straightforward — a
`"engine"` value is naturally additive.

The classifier reads `ReactiveDeclNode.shape` etc. to bucket — engines won't reach
`classifyStateDecl` because they're a DIFFERENT AST kind (`engine-decl` not `state-decl`).
B14 instead needs a NEW walker pass that handles `engine-decl` nodes; that pass calls
`createScope` / a new engine-record creator that yields a StateCellRecord-shaped object with
`_cellKind: "engine"` and the `_engineMeta` annotation.

### (e) B14 + B5 integration

The existing classifier targets `state-decl` only. Engine cells will not flow through
`classifyStateDecl`. Per audit §1.6, this is fine — the `_cellKind` discriminant is the
contract for downstream consumers; B14 stamps `"engine"` directly via a dedicated walker
without touching B5's prong.

`StateCellRecord.declNode` is typed as `ReactiveDeclNode`. Engine decls are
`EngineDeclNode`-shaped (a different node kind). B14 will need to either:
- Widen `StateCellRecord.declNode` to a union, OR
- Treat the engine-decl as the `declNode` field via type assertion.

Option B is pragmatic — the type assertion at registration time + a guard on
`declNode.kind === "engine-decl"` for engine-specific reads.

## Decision summary

1. EXTEND `ast-builder.js` to accept §51.0 engine syntax fields:
   - `var=NAME` → `engineDecl.varNameOverride: string | null`
   - `initial=.Variant` → `engineDecl.initialVariant: string | null`
   - `pinned` bareword → `engineDecl.pinned: boolean`
   - `derived=expr` (already partial) → keep current `sourceVar`; add a richer field for §51.0.J expressions later (B16 owns derived engines).
   - `isExported` flag + `export <engine ...>` Form 1 — synthesize a virtual export-decl matching component Form 1 pattern.

2. EXTEND `symbol-table.ts`:
   - Widen `CellKind` to include `"engine"`.
   - Define `EngineMetadata` interface per audit §2 brief (forward-compat for A7).
   - Add `_engineMeta` to StateCellRecord shape (optional field).
   - New SYM PASS 10 walker (`walkRegisterEngines`) that creates engine records.
   - Auto-derived var-name function per §51.0.C lowercase-first-character rule.
   - `var=` override + collision check.
   - `E-ENGINE-VAR-DUPLICATE` fire on collision with non-engine state-decl.
   - `E-COMPONENT-ENGINE-SCOPE` fire when engine-decl is inside a component-def body.

3. EXTEND `module-resolver.js`:
   - Recognize `kind: "engine"` exports in `buildExportRegistry`.
   - Map to `category: "engine"`.

4. SPEC: add §34 row for `E-ENGINE-MOUNT-NOT-ENGINE`.

5. Cross-file mount walker — at file scope, walks markup for self-closing PascalCase /
   variable-name tags, looks them up via `lookupImportBinding`, and validates the source
   export's category.

## Out of scope (explicit deferrals)

- A7 hierarchy fields (`parentEngine`, `innerEngines`, `historyAttr`, `internalRules`,
  `parallelAttr`, `onTimeoutElements`) — DECLARE shape, leave undefined.
- `derived=expr` rich-form parsing (match blocks, function calls) — B16.
- `initial=` validation against `Type` variants — B15.
- `rule=` contract validation — B15.
- `effect=` / `<onTransition>` walking (engine body is raw text today; structural
  re-parsing into walkable children is its own dispatch).

## Test strategy

- New unit test file `compiler/tests/unit/engine-binding-b14.test.js` covering registration,
  auto-derive, var override, var-duplicate, _engineMeta records, MOD export-kind annotation.
- Cross-file mount test in integration directory using API harness.
