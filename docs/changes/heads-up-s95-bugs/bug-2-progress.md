# Bug 2 — Variant constructor at engine direct-write emits string-as-function call

## Status: In Progress (S95)

## Investigation

### Bug surface
Engine direct-write (`@engineVar = .Variant(payload)`) and `.advance(.Variant(payload))` emit:
```js
_scrml_engine_direct_set("dragPhase", "Dragging"(taskId), __scrml_engine_dragPhase_transitions);
```
The `"Dragging"(taskId)` calls a string as a function → TypeError at runtime.

### Root cause
`compiler/src/codegen/emit-expr.ts:emitIdent` line 286-288: any bare-dot uppercase ident (`.Variant`) is lowered to a JSON-stringified tag (`"Variant"`). This is correct for unit variants — the cell value IS the bare string tag. But when `.Variant` appears as the CALLEE of a `CallExpr` (payload-bearing constructor), the same lowering gives `"Variant"(args)` — calling a string as a function.

### Bug 1 overlap check
Bug 1 (just landed `5d0e8bd`) touched emit-control-flow.ts (match-arm codegen) and rewrite.ts (parseMatchArm, splitMultiArmString). It explicitly stayed AWAY from engine direct-set codegen. No shared helper conflict expected.

### Bug 13 + 16 + 17 + 18 overlap check
All non-overlapping with engine direct-write codegen.

### Runtime cell shape — SPEC §51.3.2 (Implementation notes S22)
SPEC explicitly states the cell value for a payload-bearing variant is `{ variant: "X", data: { fieldName: value } }` (matches the constructor return shape). Unit variants stay bare strings. The runtime helpers must extract the tag for `_scrml_engine_check_transition` comparison.

### Pre-existing runtime fault in dispatcher
`emit-variant-guard.ts:730-731` reads `_v.tag` / `_v.payload` — wrong keys. The canonical shape is `_v.variant` / `_v.data`. This is a dormant bug — never triggered today because no engine cell currently holds a payload-bearing variant (the codegen bug makes that crash earlier). Will be fixed alongside.

## Fix plan

### Phase 1 — Codegen: emit constructor call for payload-variant engine writes
At `emit-expr.ts:emitCall`, when:
- the callee is a bare-dot ident `.Variant` AND
- the variant has a known field schema (registry says it has fields)

Emit `EnumName.Variant(args)` — invoking the runtime constructor. The enum name resolves from the variant registry (the same one used in `hasPayloadBindingOrTaggedVariant` and `emitVariantBindingPrelude`).

Alternative: emit the structured object inline `{ variant: "Variant", data: { fieldName: arg } }`. Cleaner — no dependence on the global `EnumName` constant.

### Phase 2 — Runtime: extract tag for transition check
`_scrml_engine_direct_set` + `_scrml_engine_advance` extract tag via `(target != null && typeof target === "object" && target.variant != null) ? target.variant : target` for the `_scrml_engine_check_transition` call. The cell stores the full target (structured or bare). Self-write idempotent check (`current === target`) needs the same normalization — use both tags.

### Phase 3 — Dispatcher: fix tag-key
`emit-variant-guard.ts:730-731` — replace `_v.tag` / `_v.payload` reads with `_v.variant` / `_v.data` so the dispatcher correctly extracts the tag from a payload-bearing engine cell.

### Phase 4 — Tests
Integration tests:
- payload-bearing direct-write (the reproducer)
- no-payload direct-write (regression guard for unit variants)
- payload `.advance()`
- match-arm on payload-bearing engine cell (verifies dispatcher fix)
- mixed file (unit + payload variants in same engine)

## Progress log

### 2026-05-16 — Initial investigation
- Confirmed bug via reproducer at /tmp/bug2-repro/repro.scrml. Output line:
  `_scrml_engine_direct_set("dragPhase", "Dragging"(taskId), ...)` — calling a string as a function.
- Root cause located: `emit-expr.ts:emitIdent` line 286-288 (bare-dot variant always lowers to JSON.stringify tag).
- SPEC §51.3.2 (Implementation notes S22) confirmed the canonical runtime shape: `{ variant: "X", data: { fieldName: value } }`.
- Pre-existing dispatcher bug found at `emit-variant-guard.ts:730-731` (reads `_v.tag` / `_v.payload` — wrong keys; should be `.variant` / `.data`).
- Pre-existing `_scrml_engine_check_transition` and self-write comparison work in tag space, so structured-object target values fail comparison.

### 2026-05-16 — Phase 1: codegen + runtime + dispatcher (commit 7ef8634)
- `emit-expr.ts:emitCall` — detect bare-dot `.Variant(args)` callee form, emit `{ variant: "X", data: { fieldName: arg } }` literal using new `emit-control-flow.ts:getVariantFieldSchema` export.
- `runtime-template.js` — new `_scrml_engine_variant_tag(value)` helper, used in `_scrml_engine_direct_set` + `_scrml_engine_advance` + `_scrml_engine_check_transition` for tag-space comparisons. Cell write preserves the full target value.
- `emit-variant-guard.ts` dispatcher — replaced `_v.tag` / `_v.payload` reads with `.variant` / `.data` (the canonical SPEC §51.3.2 shape). Dispatcher arg passing changed from positional `_payload[<index>]` to named `_data[<bindingName>]`.
- Updated 1 unit test (engine-body-render.test.js Phase 3 §6) for the new emission shape.

### 2026-05-16 — Phase 2: is operator + integration tests (commit adc830b)
- `emit-expr.ts:emitBinary case "is"` — wrap left side in tag-extraction IIFE so `(@cell) is .Variant` works for both bare-string and tagged-object cells.
- New file `compiler/tests/integration/s95-bug-2-engine-payload-variant.test.js` — 10 integration tests covering canonical reproducer, unit-variant regression, `.advance()` payload form, mixed variants, qualified `Enum.Variant(args)`, dispatcher shape, runtime helper presence.

### 2026-05-16 — Phase 3: string-rewrite path (commit 1671446)
- Found that the escape-hatch `${...}` event-handler path goes through the string-rewrite pipeline (`rewriteExpr` / `rewriteServerExpr`), not the structured AST. `rewriteEnumVariantAccess` line 1372 regex was matching `.Variant` even when followed by `(`, producing `"Variant"(args)` — same Bug 2 surface.
- Added `_rewritePayloadVariantConstructorCalls` helper in `rewrite.ts` — paren-balanced argument scanning, quoted-string aware, splits args at top-level commas. Uses new module-level `_rewriterVariantFields` registry set via new `setVariantFieldsForRewriter` export.
- Updated `rewriteEnumVariantAccess` unit-variant regex with `(?!\s*\()` negative lookahead so it skips the constructor-call form.
- Wired `setVariantFieldsForRewriter` into BOTH `generateClientJs` and `generateServerJs` (server runs first per codegen/index.ts pipeline ordering).

### 2026-05-16 — Phase 4: expanded integration tests (commit 5af847d)
- §8: escape-hatch event-handler path — 3 tests (bare reproducer, nested function-call args, multi-field variant).
- §9: AST-path `is .Variant` tag normalization — synthesized AST node test (bypasses a separate pre-existing parser issue where bare-dot identifiers don't reliably reach the ExprNode AST in some user-facing contexts; tracked outside Bug 2 scope).

## Test results
- Baseline: 12054 pass / 88 skip / 1 todo / 0 fail (12143 total across 619 files)
- Final: 12068 pass / 88 skip / 1 todo / 0 fail (12157 total across 620 files)
- Delta: +14 new integration tests, 0 regressions.

## Followups not in scope
- `rewriteIsOperator` (string-rewrite path) still emits `=== "Variant"` shape — fix when an adopter is reached via that path. The structured AST path is correct.
- Bare-dot `.Variant` ident in some user-facing contexts (e.g. inside ternary inside `${}` inside markup interpolation) doesn't reach the ExprNode AST — a pre-existing parser-level issue separate from Bug 2.
- PA-side post-Bug-2 follow-up: refactor `examples/25-triage-board.scrml` from no-payload workaround to canonical payload-variant.
