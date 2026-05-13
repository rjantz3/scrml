# §36 Impl Phase 2 — Progress

## 2026-05-13 START

- Worktree rebased onto current main `38d1ef1`.
- pretest green; baseline 47 tests pass in `input-state-types.test.js`.
- Maps consulted: primary, error, schema, test.
- SPEC §36.5.1 nested-scope normative (just-landed Phase 1 `b1848f9`) ratifies
  "immediately enclosing scope" lifecycle for E-INPUT-005 scope semantics.

## 2.A — Type-system verification — DONE (commit `9a34f25`)

- `compiler/src/type-system.ts` has NO `input-state-ref` arm — confirmed grep clean.
- `forEachIdentInExprNode` (expression-parser.ts:2313-2317) treats `input-state-ref`
  as a leaf and does not recurse. This is the correct behavior: input-state objects
  resolve via runtime `_scrml_input_state_registry.get("X")` and present a property
  bag that varies by tag. The leaf-as-opaque approach means member access on `<#X>`
  (e.g. `<#keys>.pressed("Space")`, `<#cursor>.x`, `<#pad>.modifiers.ctrl`) flows
  cleanly through the type-system with no E-SCOPE-001 / no E-TYPE-* firing.
- **Outcome:** already-typed. No type-system source change needed.
- Added 5 regression tests at §17 of `input-state-types.test.js` (47 → 52).

## 2.B — E-INPUT-005 duplicate-id detection — DONE

- Implemented dedicated pre-walk function `checkInputStateDuplicateIds` in
  `compiler/src/codegen/emit-html.ts` (after `INPUT_STATE_TAGS` definition).
- One-pass walker with scope-stack: pushes a new frame on `<program>` or any
  element carrying `if=` (per §6.7.2 lifecycle-scope rules + §36.5.1 nested-scope
  ratification).
- Per-occurrence emission: 2nd, 3rd, ... duplicates each fire E-INPUT-005,
  mirroring E-INPUT-001..004 emission pattern.
- Cross-tag duplicate detected: `<keyboard id="x">` + `<mouse id="x">` in same
  scope fires E-INPUT-005 (single id namespace per §34 catalog).
- Recurses into `<program name="...">` worker-bundle bodies (HTML emitter skips
  them, but the static uniqueness check applies).
- Walker invoked at top of `generateHtml` right after signature unwrap; uses
  the existing `errors` array.
- Added 7 unit tests at §18 of `input-state-types.test.js` (52 → 59):
  - 2× same-tag duplicates within program scope
  - 2× cross-tag duplicates (keyboard+mouse, gamepad+mouse)
  - distinct ids: no fire
  - nested `<program name="sub">`: same id NOT a duplicate
  - 3× identical: fires on 2nd AND 3rd (per-decl pattern)
  - nested `if=` scopes with same id: NOT duplicates

## Final test counts

- Unit: 9458 pass (+7 §18 cross-cuts new tests) / 0 fail.
- Integration: 1420 pass / 0 fail.
- Conformance: 320 pass / 0 fail.
- Zero regressions.
