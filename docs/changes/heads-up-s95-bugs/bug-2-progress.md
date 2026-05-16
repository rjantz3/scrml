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
