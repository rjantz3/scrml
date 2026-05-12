# Bug 1 — 14-mario bare-`n` enum-payload destructuring fix

## Dispatch
- Branch: main (worktree agent-a79d3c99097c6c68a)
- Brief: §Two-symptom fix — (A) payload binding from `match-arm-block`, (B) `EnumType::Variant` access dropped at acorn-parse time
- Baseline: post-S87, HEAD 7a00b1b

## Timeline

### 2026-05-12T23:00Z — startup + survey complete
- pwd / git status clean; pretest pass.
- Read primary.map, structure.map, error.map.
- Compiled 14-mario, confirmed two distinct symptoms:
  1. **A (payload binding):** Function-body `match` with `match-arm-block` arms (`.Mushroom(n) => { ... }`) emits `_scrml_reactive_set("coins", _scrml_reactive_get("coins") + n)` where `n` is never bound → `ReferenceError` at runtime.
  2. **B (structural-eq):** `let wasSmall = @marioState == MarioState::Small` compiles to `_scrml_structural_eq(_scrml_reactive_get("marioState"), MarioState)` — the `::Small` suffix is silently dropped.

### Root causes

**A.** In `compiler/src/codegen/emit-control-flow.ts:1256-1265` (`emitMatchExpr`), when handling structured `match-arm-block` nodes (parsed by ast-builder.js Form 1b, which captures `payloadBindings: ["n"]`), the conversion to `MatchArm` sets `binding: null` — payload bindings from the AST node are never carried through. Consequently `emitVariantBindingPrelude` returns `""` and `n` is unbound in the emitted body.

**B.** `compiler/src/expression-parser.ts` — the acorn plugin `scrmlEnumPlugin` reads `::Variant` and emits a STRING token, but the IDENT before `::` was already emitted. Acorn's `parseExpressionAt` returns just the `MarioState` IdentExpr and stops; the trailing string `"Small"` is silent dropped (trailing-content guard only fires when content includes `\n`). The downstream `rewriteEnumVariantAccess` regex never sees `::` again because the AST was successful — only escape-hatch paths route through the string rewriter.

### Plan
- **A fix:** propagate `payloadBindings` from `match-arm-block` → MatchArm.binding (encoded as comma-joined "n" / "n, m" string for `parseBindingList`).
- **B fix:** rewrite `EnumType::Variant` to `"Variant"` in `preprocessForAcorn` BEFORE acorn parsing, so the AST path captures it as a `Literal` node. The plugin remains as a fallback (or is retired).
- Unit tests in `compiler/tests/unit/engine-arm-payload-binding-codegen.test.js` (new).

### 2026-05-12T23:30Z — fix-A applied
- emit-control-flow.ts:1256-1265 now joins `child.payloadBindings` into MatchArm.binding.
- Mario fixture verified: `if (_scrml_tag_20 === "Mushroom") { const n = _scrml_match_19.data.coins; ... }` — `n` is now bound.
- Committed: 6d67052.

### 2026-05-12T23:35Z — fix-B applied
- expression-parser.ts:preprocessForAcorn rewrites `::` → `.` BEFORE acorn parse.
- Surfaces both read shape (`MarioState::Small`) and call shape (`PowerUp::Mushroom(1)`) correctly.
- Mario fixture verified: `MarioState.Small`, `PowerUp.Mushroom(1)`.
- Committed: 2fb82a7.

### 2026-05-12T23:40Z — added unit tests
- compiler/tests/unit/engine-arm-payload-binding-codegen.test.js — 7 tests covering A1-3, B1-3, INT1.
- Full suite: 11600 pass / 0 fail (pre-fix baseline 11593 + 7 new = 11600).
- Committed: d3afead.

### 2026-05-12T23:50Z — discovered + fixed C (engine routing)
- e2e revealed match-arm-block bodies emitting bare `_scrml_reactive_set("marioState", ...)` instead of `_scrml_engine_direct_set`. Root cause: emitMatchExpr never received `opts` from emit-logic.ts:case "match-stmt", so engineBindings/machineBindings/declaredNames couldn't reach _emitReactiveSet inside arm bodies.
- Fix: emitMatchExpr accepts opaque `opts`, threads to emitLogicBody for structuredBody path. emit-logic.ts forwards opts on dispatch.
- Mario fixture: lines 53/57/59 now use `_scrml_engine_direct_set("marioState", X, transitions)`. Engine guard + timer/history/onTransition hooks honored.
- Committed: 7b72d6c.

### 2026-05-12T23:55Z — discovered + fixed D (derived effect tracking)
- Runtime sim (happy-dom) revealed: marioName derived effect did NOT re-run after marioState transition. DOM textContent stayed "SMALL MARIO".
- Root cause: file-level eager preload `_scrml_derived_get("marioName")` clears dirty flag BEFORE the DOMContentLoaded effect's first run. Effect calls _scrml_derived_get → dirty=false → IIFE skipped → upstream @-refs never tracked. Effect's deps map empty. Subsequent `_scrml_trigger(_scrml_state, "marioName")` from propagate has nothing to wake.
- Fix: runtime-template.js:_scrml_derived_get now calls `_scrml_track(_scrml_state, name)` BEFORE the dirty check. Subscribes the current effect to the derived name itself, completing the wake contract.
- 14-mario-runtime-sim.test.js — happy-dom unit-level test that catches this class of bug at unit-test speed.
- Committed: 285b8e0.

### 2026-05-12T00:05Z (next day, UTC) — e2e verification
- All 3 browsers (chromium / firefox / webkit): **18 passed / 6 failed** (24 total = 8 ACs × 3 browsers).
- Passing ACs: AC1, AC2, AC3, AC4, AC5, AC8 (6/8).
- Failing ACs: AC6, AC7 — both fail with **same root cause**: `getHurt()` writes `@marioState = .Small`, but engine rule= contract for Small does NOT include Small in the legal-target list (`Small: ["Big", "Fire", "Cape"]`). Runtime throws E-ENGINE-INVALID-TRANSITION.

### Surfaced finding (fixture-bug, OUT OF SCOPE per brief)

**Fixture bug:** `examples/14-mario-state-machine.scrml` line 89 (`@marioState = .Small` inside `getHurt`) violates the engine's own rule= contract when the current state is already Small. The rule= for Small is `(.Big | .Fire | .Cape)` — no self-loop.

**Resolution options for PA:**
1. **Fixture fix:** add `internal:rule=.Small` to the `<Small>` state-child (canonical opt-in self-loop per SPEC §51.0.O):
   ```
   <Small rule=(.Big | .Fire | .Cape) internal:rule=.Small></>
   ```
2. **Spec change:** declare that `_scrml_engine_direct_set(varName, current)` is always a no-op (every variant implicitly self-loops). This avoids requiring `internal:rule=` boilerplate for the common idempotent-write idiom.
3. **Source-level guard:** rewrite getHurt to `if (@marioState != .Small) { @marioState = .Small }`.

The runtime side already treats self-loops specially in `_scrml_engine_history_capture_on_exit` (line 2404 — "self-loop, do not capture"). Extending the no-op semantics to `_scrml_engine_direct_set` would be consistent and unblock this class of fixture pattern. PA's call.

### Final state
- 4 codegen/runtime fixes (A, B, C, D) committed.
- 8 new unit tests (7 codegen + 1 runtime sim).
- Full suite: 11601 pass / 114 skip / 1 todo / 0 fail / 565 files. Net delta +8 tests.
- 14-mario e2e: 18/24 passing across 3 browsers (6 ACs green, 2 ACs blocked by fixture-bug surfaced above).

