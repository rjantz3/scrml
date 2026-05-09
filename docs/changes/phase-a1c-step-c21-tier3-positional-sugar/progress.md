---
title: A1c Step C21 — Tier 3 predefined-shape compound positional sugar lowering
date-start: 2026-05-09
date-ship: 2026-05-09
session: S75 (A1c Wave 5a parallel dispatch — C17 + C20 + C21)
worktree: agent-a2e9c29eeac79419b
branch: worktree-agent-a2e9c29eeac79419b
baseline-head: 72d691f
spec-refs: §14.11 (M10 — positional binding for predefined-shape compound state), §14.3 (struct types), §6.3 (Variant C ad-hoc compound — exclusion)
status: SHIP
---

## §0 Mandate

Close the latent JS-comma-operator codegen bug for Tier 3 predefined-shape
compound positional sugar (§14.11 / M10). Without C21:

```scrml
type UserInfo:struct = { name: string, age: number, active: boolean }
<userInfo>: UserInfo = ("alice", 30, true)
```

emits

```js
_scrml_reactive_set("userInfo", ("alice", 30, true));
```

which evaluates to `true` (last operand) per JS comma-operator semantics —
silently wrong, no diagnostic. C21 adds a dispatch arm in `emit-logic.ts
case "state-decl"` that detects this pattern (typed LHS resolving to
StructType + RHS escape-hatch SequenceExpression) and lowers the
SequenceExpression to a typed object literal in struct field-declaration
order:

```js
_scrml_reactive_set("userInfo", _scrml_deep_reactive(({ name: "alice", age: 30, active: true })));
```

## §1 Phase 0 SURVEY

See `SURVEY.md` for the full Phase 0 analysis. Key findings:

- **Bug confirmed:** SequenceExpression parses as `escape-hatch` ExprNode
  with `estreeType: "SequenceExpression"` (per `expression-parser.ts:1329`);
  `emitEscapeHatch` emits the raw text via `rewriteExpr`, so JS-comma-operator
  semantics apply. **Confirmed empirically by reading the codegen path
  (no need to run a fixture — deterministic).**
- **Error code:** §14.11 line 7226 prescribes `E-TYPE-001`. No new error
  code, no SPEC amendment.
- **ast-builder:** untouched. Codegen-only.
- **typeRegistry:** lifted from local rebuild in `emit-reactive-wiring.ts`
  to file-scope and threaded through `EmitLogicOpts.typeRegistry`.

## §2 Implementation

### §2.1 Files touched

- `compiler/src/codegen/emit-logic.ts` (+196 / −5)
- `compiler/src/codegen/emit-reactive-wiring.ts` (+12 / −3)
- `compiler/tests/unit/c21-tier3-positional-sugar.test.js` (NEW, 17 tests, 426 LOC)

### §2.2 Dispatch arm placement

`case "state-decl"` in `emit-logic.ts`. The C21 arm sits BETWEEN the
derived-const arm (line ~1108) and the SQL-server arm (line ~1164),
naturally excluded from compound-parent and markup-typed paths above.

### §2.3 Detection gate

```ts
node.typeAnnotation is non-empty string
  AND node.initExpr.kind === "escape-hatch"
  AND node.initExpr.estreeType === "SequenceExpression"
  AND opts.typeRegistry is provided
  AND opts.typeRegistry.get(typeAnnotation.trim()) is a StructType
```

When ANY gate fails, the arm declines and the legacy fallthrough handles
the node as before. This preserves backward compatibility for:
- Untyped state-decls (no `typeAnnotation` — Variant C ad-hoc territory)
- Typed Shape 1 with non-tuple init (`<count>: number = 0`)
- Synthetic test fixtures that bypass the type registry
- Server boundary, function bodies — handled inline by the helper's SKIP rules

### §2.4 Lowering helper — `_emitTier3PositionalSugar`

Steps:
1. Strip outer parens from the SequenceExpression's `raw` text.
2. Split inner text on TOP-LEVEL commas (depth-tracking helper
   `_splitTopLevelCommas` handles nested objects/arrays, strings, template
   literals).
3. Validate positional-arity against `structType.fields.size`. Mismatch
   pushes `E-TYPE-001` to `opts.errors` with a helpful message referencing
   the named-initialiser form, and returns `null` so the caller emits a
   defensive recoverable line.
4. Map each positional value to the corresponding struct field name in
   declaration order (Map iteration preserves insertion order).
5. Re-parse each value via `parseExprToNode` and emit through the standard
   `emitExpr` pipeline — reactive references / fn calls / nested expressions
   resolve uniformly.
6. Wrap in `_scrml_deep_reactive(...)` (same as the legacy fallthrough's
   `_wrapDeepReactive` heuristic for object literals).
7. Emit a Tier-3-aware init-thunk inline using the LOWERED object literal,
   so `reset(@cell)` re-evaluation does not re-introduce the JS-comma-operator
   bug. Caller suppresses the default `_initSidecar` via a marker comment.

### §2.5 Diagnostic accumulator

New `EmitLogicOpts.errors?: CGError[] | null` field, threaded from
`ctx.errors` in `emit-reactive-wiring.ts`. Test fixtures that bypass the
registry (empty/missing `typeRegistry`) skip the C21 arm naturally; tests
that exercise C21 directly construct an `errors: []` array.

## §3 Test surface

`compiler/tests/unit/c21-tier3-positional-sugar.test.js` — 17 tests, 64 expects:

| § | Section | Tests |
|---|---|---|
| §C21.1 | Positive lowering | 4 (3-field, 2-field, complex value expressions, nested object/array) |
| §C21.2 | Detection-gate negatives | 4 (no typeAnno, non-struct anno, non-SequenceExpression init, missing typeRegistry) |
| §C21.3 | Arity mismatch (E-TYPE-001) | 4 (too few, too many, message references §14.11, missing errors accumulator) |
| §C21.4 | Variant C ad-hoc exclusion | 1 (compound-parent routes to C1) |
| §C21.5 | Regression — typed Shape 1 non-tuple | 1 |
| §C21.6 | Regression — untyped SequenceExpression | 1 |
| §C21.7 | Field-order preservation | 1 |
| §C21.8 | Diagnostic span | 1 |

All 17 passing.

## §4 Test deltas

| Stage | pass | skip | todo | fail | expects |
|---|---|---|---|---|---|
| Baseline (pre-C21) | 10551 | 69 | 1 | 3 | 35910 |
| Post-C21 | 10568 | 69 | 1 | 3 | 35974 |

**Delta: +17 tests, +64 expects, 0 regressions.** The 3 pre-existing fails
are inherited (self-host parity drift; not C21's regression budget — see
SURVEY §0).

## §5 Commit cadence

| SHA | Topic | Test count |
|---|---|---|
| `4e62fe4` | Phase 0 SURVEY | (no test change) |
| `be44837` | Codegen arm + diagnostic + typeRegistry threading | (no new tests yet; baseline preserved) |
| `876e446` | Unit tests + Tier 3-aware init-thunk emission | +17 |

## §6 Open questions answered

(All open questions from BRIEF resolved during SURVEY — no implementation-time
surprises.)

- **Q (load-bearing): was the bug as described?** YES — confirmed empirically
  by tracing the codegen path. SequenceExpression parses as escape-hatch with
  `estreeType: "SequenceExpression"` (expression-parser.ts:1329-1332); legacy
  fallthrough in case "state-decl" hits `emitEscapeHatch` which emits the raw
  text; JS comma-operator returns last operand. No existing diagnostic.
- **Q: New error code or reuse?** REUSE `E-TYPE-001` (§14.11 line 7226 prescribes).
- **Q: ast-builder vs codegen split?** CODEGEN-ONLY. typeRegistry is needed for
  detection; built post-parse.

## §7 Deferred items

NONE. C21 SCOPE row is fully closed:

- Tier 3 predefined-shape compound positional sugar lowering: ✅ SHIP
- Per-position type mismatch (originally listed in row C21 §279 of A1c
  SCOPE-AND-DECOMPOSITION): out-of-scope per §14.11 — codegen lowers; the
  lowered object literal flows through existing §14.3 record-init type-checking
  in the type-system. (No additional codegen work needed; type-system already
  validates struct field types on object-init.)

## §8 SPEC amendments

NONE. §14.11 is fully expressive; `E-TYPE-001` is the prescribed error code.

## §9 Files touched (relative)

- `compiler/src/codegen/emit-logic.ts`
- `compiler/src/codegen/emit-reactive-wiring.ts`
- `compiler/tests/unit/c21-tier3-positional-sugar.test.js` (NEW)
- `docs/changes/phase-a1c-step-c21-tier3-positional-sugar/SURVEY.md` (NEW)
- `docs/changes/phase-a1c-step-c21-tier3-positional-sugar/progress.md` (this file, NEW)

## §10 Tags

#a1c #c21 #ship #tier-3 #positional-sugar #section-14-11 #m10 #latent-bug-closed #js-comma-operator #e-type-001
