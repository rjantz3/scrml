# Phase A1c — Step C8: Validity surface synthesis emission (L11)

**Phase:** A1c (codegen+runtime). Wave 3 (validity surface). **Foundational; C9/C10/C11 dispatch in parallel after C8 lands.**
**Position:** C8 — first of Wave 3 (4 steps total: C8 → {C9, C10, C11}).
**Estimate:** ~5-7 h focused.
**Dispatched:** 2026-05-08 (S73).
**Authority chain:** SPEC §55.5 (compound-level synth surface) + §55.6 (per-field) + §55.7 (synthesized-property semantics) + L11 (auto-synth validity surface). SCOPE-AND-DECOMPOSITION row C8 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:221`). Builds on C7's per-field validator runner outputs and B11/B12's synth-cell registry annotations.

## Goal (one paragraph)

C7 emits per-field `@compound.field.errors` / `.isValid` derived computations from validators. C8 emits the COMPOUND-LEVEL ROLLUP and the EVENT-DRIVEN SYNTH PROPERTIES: `@compound.errors` (object map `{fieldName: [...errorTags], ...}`), `@compound.isValid` (`Object.values(...).every(arr => arr.length === 0)`), `@compound.touched` (per-field first-interaction tracking via `bind:value`/`bind:checked` change OR first focus-out), `@compound.submitted` (compound-level, true on first form-submit attempt). All four properties exist regardless of whether the compound has validators (predictability rule §55.5; no-validator compound has trivially-`true` isValid + empty errors). Plus per-field `touched` is C8's territory too (B12 registered the synth slot; C7 only handled isValid/errors). All synth properties are READ-ONLY (E-SYNTHESIZED-WRITE already wired by B11/B12).

## What's already in place (depth-of-survey signal)

- **B11 synth registry (compound parent):** `_record.engineMeta`-style annotations on the compound's `_scope.stateCells` map for the four synth keys (`isValid`, `errors`, `touched`, `submitted`) with `runtimeHookKind: "touch" | "submit" | null` per §55.7.
- **B12 synth registry (per-field):** kind:`"field"` scope on each non-synth, non-compound-typed child with three synth records (`isValid`, `errors`, `touched`). NO per-field `submitted` (compound-only per §55.7 line 25153).
- **C7 per-field outputs:** `@compound.field.errors` and `.isValid` are derived cells. Read via `_scrml_derived_get(...)` for compound-level rollup. Subscribe via `_scrml_derived_subscribe` for fanout reactivity. The C7 final report explicitly enumerated these hookpoints.
- **C5's runtime helpers:** `_scrml_init_set` / `_scrml_reset` are in place. C8 may need to wire `touched`/`submitted` into the reset machinery (§55.13 — `reset(@compound)` clears the validity state in addition to the underlying value).
- **C3+C4 bind dispatch:** `LogicBinding.kind === "render-by-tag"` entries carry `cellName` + `renderSpecTag` + `renderSpecAttrs` + `declValidators`. The bind:* event listeners (C4) are the natural HOOK POINT for `touched` event-driven update (input event → set touched=true for that field). C8 either extends C4's listener emission OR registers a separate `touched`-update listener pass.
- **No C8 collision with C7:** C7's emit-validators.ts produces per-FIELD derived cells; C8's per-FIELD `touched` and compound-LEVEL `errors`/`isValid`/`touched`/`submitted` are NOT in C7's territory.

## Scope (in / out)

**IN scope (C8):**
1. **Compound-level rollup emission:** for every compound parent (`_cellKind === "compound-parent"`), emit:
   - `@compound.errors` derived cell — reads each child's `@compound.field.errors` (via `_scrml_derived_get`), reduces to `{fieldName: [...errorTags], ...}` map keyed in declaration order (children[] iteration). Subscribes to each child's `errors` cell.
   - `@compound.isValid` derived cell — `Object.values(@compound.errors).every(arr => arr.length === 0)`. Subscribes to `@compound.errors`.
2. **Per-field `touched` emission:** for every per-field synth record with `runtimeHookKind === "touch"`, emit:
   - `@compound.field.touched` reactive cell (NOT derived — event-driven; init to `false`).
   - Event listener wired into C4's bind:* dispatch path: on `input` event (text/textarea/etc.), `change` event (checkbox/radio/file/select), AND on first focus-out — set the cell to `true`. Once `true`, never reverts (until `reset`).
3. **Compound-level `touched` emission:** for every compound parent's `touched` synth, emit a derived map `{fieldName: bool, ...}` reading each child's `.touched` cell.
4. **Compound-level `submitted` emission:** for every compound parent's `submitted` synth (with `runtimeHookKind === "submit"`), emit:
   - `@compound.submitted` reactive cell (init `false`).
   - Event listener on the form's `submit` handler — set to `true` on first submit. Once `true`, never reverts (until `reset`).
   - **The "form" surface:** compound state is typically used inside a `<form>` element (or an effective form-equivalent). C8's submit-handler wiring detects the enclosing form element. If no form element, the `submitted` cell exists but never fires — that's spec-conforming (the developer can manually set it via... wait, NO — synth is read-only. If no form, `submitted` defaults `false` permanently. SURFACE this case in the SURVEY to confirm with PA.)
5. **No-validator compound predictability (§55.5 lines 25110-25113):** even compounds with NO validators get the four synth properties with trivial defaults. C8 emits them unconditionally per compound parent.
6. **No-validator field predictability (§55.6 lines 25139-25142):** per-field surface exists even when the field has no validators; `isValid` trivially `true`, `errors` `[]`, `touched` event-driven from the field's bound input. Trivial cases must work.
7. **Reset integration (§55.13):** when `reset(@compound)` fires, clear `touched` map (all `false`) AND `submitted` (back to `false`). C5's `_scrml_reset` walks compound children — extend it (or register additional reset hooks) so synth cells participate. **VERIFY this is C8's territory and not a C5-extension stop-and-coordinate moment** during survey.
8. **Tests:** unit tests covering: compound rollup with multiple validator-bearing fields; rollup updates when a field's `errors` changes; `isValid` correctly reflects all-fields-pass; no-validator compound has trivially-`true` isValid + `{}` errors; per-field `touched` fires on first input event; per-field `touched` fires on first focus-out; compound `touched` map updates as fields gain interaction; `submitted` fires on form submit; reset clears touched/submitted; no-validator field has trivially-`true` isValid + `[]` errors.

**OUT of scope (deferred):**
- **Cross-field reactive dep refinement** beyond what C7+C8 set up — **C9** (§55.11). C8 just consumes C7's per-field outputs; C9 makes sure cross-field arg changes correctly re-fire the right cells.
- **4-level error message resolution** — **C10**. C8 emits raw `ValidationError` enum tags into the `errors` arrays/maps; C10 renders messages.
- **`<errors of=expr/>` element emission** — **C11**.
- **Engine-state-cell validators** (§55.14) — out of Wave 3.
- **Refinement-type runtime emission** (§53.7.2) — **C16 Wave 5.**
- **`<errorBoundary>` integration** — out of Wave 3.

## Spec verification (pa.md Rule 4)

I (PA) verified against SPEC.md text directly:
- **§55.5 lines 25085-25120** — compound-level synth surface: 4 read-only properties; predictability rule (no-validator compounds get the surface); single-value Tier-1 cells DO NOT get the auto-namespace. ✓
- **§55.6 lines 25122-25142** — per-field synth surface: 3 properties (no `submitted` per-field); reactive recomputation rules; no-validator field still has surface. ✓
- **§55.7 lines 25144-25156** — synth-property semantics table: `isValid`/`errors` reactive; `touched` event-driven (input/change/first focus-out); `submitted` event-driven (first form-submit); read-only with E-SYNTHESIZED-WRITE. ✓
- **§55.13** (reset interaction) — read at survey time for full grounding on what C8 owns vs C5 extension.

## Dispatch protocol

S67 worktree-as-scratch landing.

## Authorized decisions

- **File locus:** Likely a NEW codegen module (`compiler/src/codegen/emit-synth-surface.ts` or similar). Could also be an extension to `emit-validators.ts` if cleaner. Survey-confirm.
- **Reset integration coordination:** if survey reveals C8 needs substantial extension to `_scrml_reset` (C5 territory), surface as POSSIBLE-STOP-FOR-PA — we may want to coordinate the change rather than duplicate the helper.
- **Submit handler wiring:** survey-confirm whether the "form-detection" approach is workable or whether the spec implies a different mechanism (e.g., an explicit `<onSubmit>` handler convention).
- **Test file:** `compiler/tests/unit/c8-validity-surface-synthesis.test.js`.
- **Crash recovery:** WIP commits expected; `progress.md` append-only.

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` if Formik/RHF/VeeValidate/FormKit form-library idioms creep in. The synth surface is NOT a form library; it's compiler-emitted reactive cells.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-synth-surface.ts` (NEW likely) | rollup + touched/submitted emission |
| `compiler/src/codegen/emit-bindings.ts` (likely) | extend bind:* listeners with touched-update hooks |
| `compiler/src/runtime-template.js` (possible) | new helpers if needed (e.g., `_scrml_synth_touched_set`) |
| `compiler/src/codegen/runtime-chunks.ts` (possible) | new chunk if a new helper module added |
| `compiler/src/codegen/emit-client.ts` (possible) | chunk-detection trigger |
| `compiler/tests/unit/c8-validity-surface-synthesis.test.js` (NEW) | unit test coverage |
| `compiler/tests/unit/runtime-tree-shaking.test.js` (possible) | chunk-count adjustment 16→17 if a new chunk added |
| `docs/changes/phase-a1c-step-c8-validity-surface-synthesis/{progress,SURVEY}.md` | crash-recovery + survey |

## Definition of Done

- All §scope IN items shipped.
- 0 regressions vs baseline (10,123 / 60 / 1 / 0 post-C7 land).
- Spec re-verified (§55.5 + §55.6 + §55.7 + §55.13) against SPEC.md text.
- Hookpoints documented for C9 (cross-field deps), C10 (error message rendering will read `errors` arrays), and C11 (`<errors of=expr/>` will read same arrays/maps).
- Reset integration confirmed (touched/submitted clear on reset per §55.13).
