# C8 — Validity surface synthesis: SURVEY

Date: 2026-05-08 (S73 close → C8 dispatch)
Worktree: `agent-a28d8066d58a87cfc`
Verdict: **PROCEED-AS-BRIEFED** (no scope correction; no STOP-FOR-PA).

## File-locus decision

**NEW module:** `compiler/src/codegen/emit-synth-surface.ts`

Rationale: C7's `emit-validators.ts` is squarely PER-FIELD validator-runner emission. C8 is COMPOUND-LEVEL rollup + per-field touched + compound-level submitted/touched. Different responsibilities:
- C7's API: `emitValidatorRunnerSidecar(node, qualifiedName, opts) -> string | null` — one cell, one runner.
- C8's API: `emitCompoundSynthSurface(parentNode, qualifiedName, childNames[], opts) -> string | null` — compound-level rollup over multiple children.

Mixing them would muddy the file's responsibility. Keep `emit-validators.ts` C7-only. NEW `emit-synth-surface.ts` for C8.

**emit-logic.ts wire-in:** in the compound-parent dispatch arm (emit-logic.ts:902-948), AFTER child-emit + parent-derived-declare lines, append a single call to `emitCompoundSynthSurface(...)`. The parent's `_appendSidecar` already contains the per-field validator output (C7) — C8 emission goes into the parent's sidecar tail.

**emit-bindings.ts extension:** for touched-event wiring on per-field cells. The render-by-tag bind dispatch loop (emit-bindings.ts:579-680) is the surgical extension point. We add a `touched`-update event listener inside the same `if (elem)` block as the bind:* listener — same DOM-element selector, same event type as the bind dispatch's `inputEvent`. The per-field `touched` cell key is `<compound>.<field>.touched`. Same-event-listener-wiring style avoids a second querySelectorAll pass. We also need a focus-out listener on the same element (per §55.7 — first focus-out also fires touched).

**Submit-handler wiring decision (form-detection approach):**

Per the brief's open question — surveyed and resolved INLINE (no STOP needed):

The spec at §55.5 / §55.7 / §55.8 describes `<form onsubmit=submit()>` as the conventional usage. The submit handler is a regular event-handler attribute — already routed through `emit-event-wiring.ts` Approach D (delegated `submit` listener at document level). C8 does NOT detect or modify the form; it ALSO listens to `submit` events at document level via the same delegation pattern, AND fires the `submitted` cell update at THAT time.

Cleanest approach: emit a single document-level listener at module load that walks UP from event.target to the nearest `<form>` element, and matches the form against the registered compound's "submit-target" — but scrml does NOT carry a form-to-compound mapping. Instead: per compound parent with `submitted` synth, emit a `document.addEventListener("submit", ...)` listener that sets `<compound>.submitted = true` UNCONDITIONALLY on first submit anywhere in the document. This is simple but not selective — if the page has multiple forms, all compound-`submitted` cells fire on any form's submit. For Wave 3's foundational step, this is acceptable: the predictability rule says `submitted` exists everywhere and fires on first submit; multi-form discrimination is a refinement (potentially C11/C12 territory).

ALTERNATIVE (tighter): emit per-form `submit` listeners by walking the markup AST for `<form>` elements that contain bind:* references to compound children, matching forms by enclosed-cells. But this requires a markup-AST scan + form-binding inference — heavier than appropriate for C8 foundational step.

**DECISION: simple document-level submit listener per compound's `submitted` synth.** Document this approach in code comments + BRIEF as a Wave 3 simplification with refinement deferred to C11-or-later if needed.

## Reset coordination decision

Per §55.13: `reset(@compound)` clears synth state — `touched` map all-`false`, `submitted` `false`, per-field `touched` `false`. Two ways to integrate:

**Option A (NO C5 extension):** at C8 emit time, register init-thunks for the per-field `touched` cells and the compound `submitted` cell pointing to `() => false`. C5's `_scrml_reset(name)` already walks `_scrml_init_fns[name]` and re-evaluates. So if we register `_scrml_init_set("compound.field.touched", () => false)` and `_scrml_init_set("compound.submitted", () => false)`, `_scrml_reset(compound)` walks compound prefix and resets each. The compound-level `errors` and `isValid` are derived (no init needed — recompute lazily). Per-field `errors`/`isValid` are also derived (C7 emitted them as `_scrml_derived_declare` — no init thunk; their staleness handled by reactive propagation when the field value resets).

**This is C8's territory — NO C5 extension needed.** C5's `_scrml_reset` walks any cell prefix; we just need to register init thunks for the event-driven cells (touched/submitted) so the walker resets them. Pure additive.

**Option B (rejected):** extend `_scrml_reset` to special-case synth cells. Adds runtime complexity and a second source of truth.

## Test delta estimate

Following C7's pattern (61 tests / 108 expects):

- §C8.0 — emission shape (compound has 4 synth derived cells)
- §C8.1 — compound `errors` rollup (object map keyed by field name)
- §C8.2 — compound `isValid` (Object.values(...).every(arr => arr.length === 0))
- §C8.3 — compound `touched` (object map of per-field touched booleans)
- §C8.4 — compound `submitted` (boolean cell, document-level submit listener)
- §C8.5 — per-field `touched` reactive cell wiring + event listener (input/change/focus-out)
- §C8.6 — predictability: no-validator compound emits trivially-`true` isValid + `{}` errors
- §C8.7 — predictability: no-validator field has trivially-`true` isValid + `[]` errors (this is mostly C7's territory; C8 adds the per-field touched even with no validators)
- §C8.8 — reset clears touched/submitted via init-thunk registration (§55.13)
- §C8.9 — multi-field rollup composes correctly
- §C8.10 — chunk wiring (deep_reactive needed for event listener auto-tracking; reset chunk needed for init-thunk reset; derived chunk for the rollup derivations)
- §C8.11 — top-level non-compound cells DO NOT emit synth surface (§55.5 L11 Edge A)
- §C8.12 — runtime end-to-end (assemble runtime, execute compiled output, verify rollup updates, touched fires on input event, submitted fires on submit, reset clears state)

Estimate: ~50-70 tests / ~80-110 expects. Brief expected baseline 10,123 → ~10,180-10,200 final.

## Implementation plan (5 phases)

1. **Phase 0** (~30 min): Set up emit-synth-surface.ts skeleton. Define `emitCompoundSynthSurface(node, qualifiedName, childNames, opts)` returning JS-statement string. Inputs: parent decl, qualified name, list of child decl names + their own `_cellKind` (compound vs non-compound), opts (boundary, derivedNames, encodingCtx).

2. **Phase 1** (~1.5 h): Compound-level `errors` + `isValid` derived cells. `errors` reads each child's `<compound>.<field>.errors` via `_scrml_derived_get(...)` and reduces to object-map. `isValid` reads `errors` via `_scrml_derived_get(...)` and tests `.every(arr => arr.length === 0)`. Subscribe edges: errors→each-field's-errors-derived; isValid→errors-derived.

3. **Phase 2** (~1 h): Per-field `touched` reactive cell + compound-level `touched` derived map. Each field's touched cell init `false` via `_scrml_reactive_set(...)`. Compound's touched is a derived map reading each child's touched.

4. **Phase 3** (~1 h): Compound-level `submitted` reactive cell + document-level submit listener. Init `false`. Listener: `document.addEventListener("submit", () => _scrml_reactive_set("<compound>.submitted", true))`. One per compound.

5. **Phase 4** (~1 h): emit-bindings.ts extension — for each render-by-tag binding whose `cellName` matches a compound child with a `touched` synth, add `addEventListener(<inputEvent>, () => set-touched=true)` + `addEventListener("focusout", () => set-touched=true)` on the SAME elem. Idempotent: setting touched-true when already true is a cheap reactive-set; for safety we can guard with an early-return-if-true. Plus init-thunk registration for touched/submitted so reset clears them (§55.13).

6. **Phase 5** (~1.5 h): Tests covering §C8.0 → §C8.12.

## Files-touched expected

| File | Purpose |
|---|---|
| `compiler/src/codegen/emit-synth-surface.ts` (NEW) | compound-level rollup + touched/submitted emission |
| `compiler/src/codegen/emit-logic.ts` | wire emit-synth-surface call into compound-parent arm |
| `compiler/src/codegen/emit-bindings.ts` | extend render-by-tag listener with touched-event wiring |
| `compiler/tests/unit/c8-validity-surface-synthesis.test.js` (NEW) | unit tests |
| `docs/changes/phase-a1c-step-c8-validity-surface-synthesis/{progress,SURVEY}.md` | crash-recovery |

NO new runtime chunks needed — `derived` (C7), `deep_reactive` (existing), `reset` (C5 init-thunks) all already wired. C8 reuses them all. NO new helpers in runtime-template.js.

NO change to runtime-tree-shaking.test.js chunk count (16 stays at 16).

## Predictability-rule confirmation plan

§C8.6 test: emit a compound with NO validators on any field. Verify:
- `_scrml_derived_declare("compound.errors"` emitted, returns `{}` empty object (or per-field-empty depending on rollup details — `{name: [], email: []}` is fine).
- `_scrml_derived_declare("compound.isValid"` emitted, returns `true` trivially.
- All four synth derivations exist regardless.

§C8.7 test: per-field surface for no-validator fields:
- C7 already emits no per-field errors/isValid runner for no-validator fields. C8 needs to emit them ANYWAY for predictability — `errors` derived `[]`, `isValid` derived `true`. **This is a C8 SCOPE REFINEMENT: C8 emits per-field errors/isValid TRIVIAL DEFAULTS for no-validator fields too.** Per §55.6 line 25139-25142 + brief §scope IN item 6.

This means C8 also needs to emit per-field `errors` + `isValid` derived defaults when C7 didn't emit them. Strategy: `emit-synth-surface.ts` walks the compound's children; for each non-compound, non-synth child, if C7 emitted no validator runner (validators array empty), emit trivial-default derivations.

To distinguish "C7 already emitted" vs "C7 skipped because validators empty", check `validators?.length > 0` on the child node — same predicate C7 uses.

## Reset integration confirmation plan

§C8.8 test: register a `default=` for each touched/submitted via `_scrml_init_set("<compound>.<field>.touched", () => false)` etc. Then call `_scrml_reset("compound")`. Walk the registered prefixes, set each back to `false`. Verify each per-field touched cell + compound submitted cell becomes `false` again.

NO C5 extension needed.

## Hookpoints for downstream

After C8 lands, C9/C10/C11 can:
- **C9 (cross-field deps):** read C7's per-field errors derivations as the consumers of cross-field cell reads. Already wired by C7's `_scrml_derived_subscribe` per cross-field arg dep. C9 may need to refine to reduce double-subscribe-storms; not blocking C8.
- **C10 (error message rendering):** read `<compound>.<field>.errors` derived value (array of ValidationError tags). Use `messageFor(errorTag, fieldName, ...args)` to produce human-readable strings. The 4-level resolution chain.
- **C11 (`<errors of=>` element):** read from `<compound>.errors` (object map) when `of=@compound`, or `<compound>.<field>.errors` (array) when `of=@compound.field`. Render based on `all` attribute presence.

## Sanity

No SPEC.md edits. No validator-catalog.ts edits. No runtime-validators.js edits. No 4-level message resolution. No `<errors>` element. No engine-state validators. No C5 extension. No --no-verify.

PROCEED.
