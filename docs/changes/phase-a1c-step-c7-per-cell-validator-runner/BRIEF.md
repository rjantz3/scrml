# Phase A1c — Step C7: Per-cell validator runner

**Phase:** A1c (codegen+runtime). Wave 2 (reset + validators). **CLOSES Wave 2.**
**Position:** C7 — third and final step of Wave 2 (C5 ✓ S73, C6 ✓ S73, **C7 = closer**).
**Estimate:** ~3-5 h focused.
**Dispatched:** 2026-05-08 (S73).
**Authority chain:** SPEC §55.2 (validators on state-cell decls) + §55.12 (multiple errors + short-circuit rule) + L11 (auto-synth validity surface). Builds directly on C6's runtime catalog (`compiler/src/runtime-validators.js`) and B11/B12's synth-cell registry. SCOPE-AND-DECOMPOSITION row C7 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:215`).

## Goal (one paragraph)

For every state-cell declaration carrying a non-empty `validators[]` array (B9-shaped `ValidatorEntry` objects), C7 emits a derived computation that walks the validator entries in declaration order, calls C6's `fireValidator(name, value, ...args)` per entry, accumulates a `ValidationError` enum-tag list with the §55.12 short-circuit rule (req/is some fail → skip remaining), and produces TWO output values: `errors: ValidationError[]` and `isValid: boolean` (= `errors.length === 0`). The runner wires those outputs into the **per-field synth cells** B12 already registered (`@compound.field.errors` / `@compound.field.isValid`). The COMPOUND-LEVEL rollup (`@compound.errors` / `@compound.isValid`) is the rollup of the per-field surfaces — that is **C8 territory**, not C7's. C7 emits the per-field validator computations only; C8 wires the rollup.

## What's already in place (depth-of-survey signal)

- **C6 runtime catalog:** `compiler/src/runtime-validators.js` exports `VALIDATOR_RUNTIME` map + `fireValidator(name, value, ...args)` dispatch + relational-predicate runner + thunk-arg unwrapping. Each fire function returns `null` (pass) or a `ValidationError`-shaped object (fail).
- **B9 validator-arg parsing:** `decl.validators[]` entries already have `args: ValidatorArg[] | null` parsed into structured form (`ExprNode` for standard preds, `RelationalPredicateNode` for `length(>=N)`-style). C7 just needs to LOWER each ExprNode → JS expression OR thunk for codegen.
- **B11 synth-cell registry (compound-parent):** `@compound.{isValid, errors, touched, submitted}` registered with `runtimeHookKind` annotation. C7 does NOT populate compound-level synth (that's C8 rollup).
- **B12 synth-cell registry (per-field):** `@compound.field.{isValid, errors, touched}` registered. **C7's primary write target.**
- **B13 inline-message override:** `validator.inlineOverride: string | null` already extracted from trailing string-literal arg. C7 records the override per `(cell, validator)` for C10 to consume; C7 does NOT render messages.
- **C2's derived-cell reactive computation:** the runner is structurally a derived computation (recomputes when cell value changes OR cross-field args change). Reuse C2's emission shape rather than inventing parallel infrastructure.

## CRITICAL — short-circuit rule (§55.12)

Per SPEC §55.12 lines 25337-25339 verbatim:

> **Short-circuit rule:** when `req` (or `is some`) FAILS on an empty / null cell, the remaining validators are SKIPPED. Only `.Required` (or `.NotSome`) is reported.

C7's runner MUST implement this. When `req` is in declaration order BEFORE `length(>=N)` and `req` fails on `""`, the runner returns `[.Required]` — not `[.Required, .LengthFailed(...)]`. Otherwise, validators COMPOSE in declaration order (§55.12 lines 25341-25344).

## Scope (in / out)

**IN scope (C7):**
1. **Per-cell runner emission:** for every state-decl with `validators.length > 0`, emit a derived computation that:
   - Reads the cell's current value (`_scrml_reactive_get("cellName")`).
   - Walks `validators[]` in source-declaration order.
   - For each validator: `const fire = VALIDATOR_RUNTIME[validator.name]; const args = <evaluated args>; const error = fire(value, ...args); if (error !== null) errors.push(error); if (validator.name === "req" || validator.name === "is some") { if (error !== null) break; }` (or equivalent short-circuit).
   - Writes the resulting `errors[]` to the per-field synth cell B12 registered (`_scrml_reactive_set("compound.field.errors", errors)`) and `isValid = errors.length === 0` similarly.
2. **Arg evaluation per kind:**
   - `relational-predicate` (e.g., `length(>=N)`): emit `{op: ">=", value: <evaluated inner expr>}` object literal.
   - `comparable-with-cell` / `any-equatable-with-cell` (e.g., `eq(@otherCell)`): emit `() => _scrml_reactive_get("otherCell")` thunk so C6's runtime can re-read at fire time.
   - `array-of-cell-type` (e.g., `oneOf([.Admin, .Editor])`): emit array literal; for cross-field array refs, emit thunk-of-array.
   - `numeric` / `regex` / `inline-message-override`: emit literal expression (regex literals retain `/.../[flags]` shape).
3. **Reactive deps:** the derived computation depends on the cell's value AND on every cross-field cell referenced in args. Cross-field deps are L14 — reuse Stage 7 dep-graph wiring (C9 will refine; C7's emission MUST set up the deps so the runner re-fires on cross-field changes).
4. **Tests:** unit tests covering: single-validator pass + fail; multi-validator compose (in declaration order); short-circuit on `req` fail; short-circuit on `is some` fail; relational-predicate (`length(>=N)`); cross-field validator (`eq(@other)`) re-fires when `@other` changes; pattern + min + max + oneOf + notIn at minimum coverage; `isValid` correctly reflects `errors.length === 0`.

**OUT of scope (deferred):**
- **Compound-level rollup** (`@compound.{isValid, errors, touched, submitted}`) — **C8** consumes per-field outputs.
- **Cross-field reactive deps refinement** (the dep-graph wiring beyond what C7 needs) — **C9**.
- **4-level error message resolution** (inline → registered → scrml:data default → match escape) — **C10**. C7 records `validator.inlineOverride` per `(cell, validator)` but does NOT render messages.
- **`<errors of=expr/>` element emission** — **C11**.
- **Top-level non-compound cells with validators** — per primer §13.7 B11 ("Single-value Tier-1 cells get NO surface — the compound-parent check filters them naturally") AND per B12 (per-field synth fires only on compound children). If you encounter a top-level cell with validators during survey, surface the case to PA — likely it's spec-legal at decl time but the synth surface lives only in compound contexts; the validators on a top-level cell may fire as a degenerate degenerate-shape OR the language may require the cell be inside a compound. **Survey-first MUST clarify this case before implementation.**
- **`<errorBoundary>` integration** — out of C7 scope.
- **Engine-state-cell validators** — §55.14 territory; out of Wave 2.

## Spec verification (pa.md Rule 4)

I (PA) verified against SPEC.md text directly:
- **§55.2 lines 25009-25025:** firing semantics (reactive recompute, failure populates errors, form-validity gating); req short-circuit edge. ✓
- **§55.12 lines 25337-25347:** short-circuit rule + composition order. ✓
- **§55.6 / §55.7:** per-field synth surface + property semantics. ✓ (read at survey time for full grounding)

## Dispatch protocol

S67 worktree-as-scratch landing. Agent commits incrementally; PA lands via `git checkout <branch> -- <files>` from main.

## Authorized decisions

- **File locus:** Most likely a NEW codegen module (e.g., `compiler/src/codegen/emit-validators.ts`) OR an extension to `emit-logic.ts` cell-emission flow. Survey-confirm; agent authorized to choose the cleaner home.
- **Runtime wire-in:** C6 deferred runtime-template.js wire-in to C7 explicitly. C7 needs to ensure `compiler/src/runtime-validators.js`'s exports are accessible at runtime — likely either (a) add a `validators` chunk to `runtime-template.js` mirroring C6's content, or (b) inject as a sibling const string concatenated by `emit-client.ts`. SURVEY confirms which.
- **Test file:** `compiler/tests/unit/c7-per-cell-validator-runner.test.js`.
- **Crash recovery:** WIP commits expected; `progress.md` append-only.

## Anti-patterns reading

Compiler TS dispatch. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — relevant if Zod/Yup/Joi/Vest/Vuelidate idioms creep in (the per-cell runner is NOT a Zod-like validation library; it's a compiler-emitted derived computation).

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-validators.ts` (NEW likely) OR `emit-logic.ts` extension | per-cell validator runner emission |
| `compiler/src/runtime-template.js` (likely) | wire C6's runtime catalog into output runtime (deferred from C6) |
| `compiler/src/codegen/runtime-chunks.ts` (possible) | new `validators` chunk if going chunk-route |
| `compiler/src/codegen/emit-client.ts` (possible) | chunk-detection trigger for validators chunk |
| `compiler/tests/unit/c7-per-cell-validator-runner.test.js` (NEW) | unit test coverage |
| `compiler/tests/unit/runtime-tree-shaking.test.js` (possible) | chunk-count adjustment if a new chunk is added (15→16) |
| `docs/changes/phase-a1c-step-c7-per-cell-validator-runner/{progress,SURVEY}.md` | crash-recovery + survey |

## Definition of Done

- All §scope IN items shipped.
- 0 regressions vs baseline (10,062 / 60 / 1 / 0 post-C5+C6 land).
- Spec re-verified (§55.2 + §55.6 + §55.7 + §55.12) against SPEC.md text.
- Hookpoints documented for C8 (compound rollup will consume per-field outputs).
- **Wave 2 declared closed** in the final report (C5 + C6 + C7 all shipped).
- C6's runtime catalog is reachable at runtime (the deferred wire-in completes).

## Cross-refs

- C5 brief + survey: `docs/changes/phase-a1c-step-c5-reset-default/`
- C6 brief + survey: `docs/changes/phase-a1c-step-c6-validator-runtime-catalog/`
- B11/B12 specifics: PA-PRIMER §13.7
- C6 hookpoints (read C6's progress.md): per-validator dispatch shape, thunk-arg unwrapping, short-circuit-as-C7's-responsibility note
