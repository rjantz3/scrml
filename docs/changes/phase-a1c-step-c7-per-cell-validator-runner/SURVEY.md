# A1c Step C7 — Survey

**Date:** 2026-05-08 (S73)
**Author:** general-purpose pipeline agent (worktree-a9494e3c869c52c2c)
**Brief:** `docs/changes/phase-a1c-step-c7-per-cell-validator-runner/BRIEF.md`
**Status:** PROCEED-AS-BRIEFED — no spec drift; one survey-decided clarification on top-level cells.

## Verdict

Brief scope is correct. The runner is a derived computation that walks `validators[]`, calls C6's
`VALIDATOR_RUNTIME` fire-functions per entry, applies §55.12 short-circuit on `req`/`is some`,
and writes two outputs (`errors`, `isValid`) into B12's per-field synth-cell registry.

## Pre-implementation reads completed

1. `docs/PA-SCRML-PRIMER.md` §8 + §13.7 B11/B12/B13 (validator + auto-synth + per-field surface).
2. `compiler/SPEC.md` §55.2 (lines 24996-25028), §55.6 (25122-25143), §55.7 (25144-25157),
   §55.12 (25331-25347).
3. `compiler/src/runtime-validators.js` — C6's runtime catalog (~430 LOC, 14 fire fns +
   `VALIDATOR_RUNTIME` map + `fireValidator(name, value, ...args)` dispatch + thunk-arg
   unwrap helpers).
4. `compiler/src/validator-catalog.ts` — compile-time signature catalog (290 LOC); arg-kinds
   are `relational-predicate` / `numeric` / `regex` / `comparable-with-cell` /
   `any-equatable-with-cell` / `array-of-cell-type` / `inline-message-override`.
5. `docs/changes/phase-a1c-step-c6-validator-runtime-catalog/progress.md` — confirmed: runtime
   wire-in deferred to C7; short-circuit is C7's job.
6. `docs/changes/phase-a1c-step-c5-reset-default/SURVEY.md` — chunk-add precedent
   (`reset` chunk in `runtime-template.js`).
7. `compiler/src/codegen/emit-logic.ts:823-1142` — `case "state-decl":` dispatch arms;
   `_emitDefaultSidecar` + `_emitInitThunkSidecar` precedent for sidecar emission;
   `_appendSidecar` is the established merge pattern.
8. `compiler/src/codegen/runtime-chunks.ts` — chunk markers + `RUNTIME_CHUNK_ORDER`
   (currently 15 chunks; C7 adds one → 16).
9. `compiler/src/codegen/emit-client.ts:60-195` — `detectRuntimeChunks` walker with the
   existing `state-decl` switch arm + `defaultExpr` trigger; C7 adds a
   `validators?.length > 0` trigger.
10. `compiler/src/symbol-table.ts:6789-6805` — `getPerFieldSynthRecords(fieldDecl)` returns
    `[isValid, errors, touched]` per-field synth records; **returns `[]` for top-level cells**
    (B12 only attaches `kind:"field"` scope to compound CHILDREN).
11. `compiler/src/validator-arg-parser.ts:213-248` — `forEachIdentInValidatorArg` /
    `forEachIdentInValidators`; reuse for cross-field reactive-deps collection.
12. `compiler/src/codegen/reactive-deps.ts:284-299` — `extractReactiveDepsFromExprNode`;
    reuse for arg-tree dep collection.
13. `compiler/src/codegen/emit-expr.ts:175-198` — `emitIdent` lowers `@cell` → `_scrml_reactive_get("cell")`;
    wrapping the emitted arg expression in `() => ...` produces the thunk shape C6's
    `_unwrapArg` expects.
14. `compiler/tests/unit/c5-reset-default.test.js` (full file) — emit-test fixture pattern
    (synthetic AST nodes + `emitLogicNode` + `expect(result).toContain(...)`).

## File-locus decision

**NEW module:** `compiler/src/codegen/emit-validators.ts` (TS).

Rationale:
- The validator-runner emission is a self-contained transform from a `state-decl`'s
  `validators[]` array to a runtime-derived computation. It deserves its own module
  for testability and to keep `emit-logic.ts` (already 2,346 LOC) from growing further.
- Mirrors the C5 `emit-expr.ts` carve-out — small, focused module that `emit-logic.ts`
  imports via a `_emitValidatorRunnerSidecar(node, qualifiedName, opts)` helper invoked
  from the `case "state-decl":` arm alongside `_emitDefaultSidecar` + `_emitInitThunkSidecar`.
- Keeps the symmetry with C6's pure-functional runtime-catalog file — codegen lives in
  `codegen/`, runtime lives at `compiler/src/runtime-*`.

`emit-logic.ts` change is a single-line addition inside `case "state-decl":`:

```ts
const _validatorSidecar = _emitValidatorRunnerSidecar(node, _qualifiedName, opts);
// ... and added to _appendSidecar's parts list:
if (_validatorSidecar) parts.push(_validatorSidecar);
```

The new module exports one function: `emitValidatorRunnerSidecar(node, qualifiedName, opts)`.

## Runtime wire-in route

**Chunk-add (mirror C5's `reset` chunk pattern), plus a fileread-at-module-load to avoid duplication.**

Concrete plan:

1. In `compiler/src/runtime-template.js`, near the top:

   ```js
   import { readFileSync } from "fs";
   import { fileURLToPath } from "url";
   import { dirname, join } from "path";
   const __runtime_template_dir = dirname(fileURLToPath(import.meta.url));
   const _VALIDATOR_RUNTIME_SOURCE = readFileSync(
     join(__runtime_template_dir, "runtime-validators.js"),
     "utf8"
   ).replace(/^export /gm, "");
   ```

   (The `^export ` strip is safe — every `export` in `runtime-validators.js` appears at
   column 0; verified by grep. The result is plain JS suitable for inlining inside the
   runtime template literal.)

2. Insert a chunk delimiter inside the `SCRML_RUNTIME` template before `§6.6 Derived`
   (right after the existing `reset` chunk closes, before `§6.6 Derived reactive runtime`):

   ```
   // ---------------------------------------------------------------------------
   // §55.1 Validator predicate runtime catalog (chunk: 'validators')
   // ---------------------------------------------------------------------------
   ${_VALIDATOR_RUNTIME_SOURCE}
   ```

3. In `compiler/src/codegen/runtime-chunks.ts`:
   - Add `'validators'` to `RUNTIME_CHUNK_ORDER` between `'reset'` and `'derived'`.
   - Add the marker `validators: "§55.1 Validator predicate runtime catalog (chunk: 'validators')"`
     to `CHUNK_MARKERS`.

4. In `compiler/src/codegen/emit-client.ts:detectRuntimeChunks`:
   - Add a trigger inside `case "state-decl":` (mirrors the existing `defaultExpr`
     trigger): `if (Array.isArray((node as any).validators) && (node as any).validators.length > 0) chunks.add("validators");`

This keeps `runtime-validators.js` as the **single source of truth** (NOT edited per
the sanity check) and pulls its source verbatim into the chunked runtime at compile-time.
Tests already imported from the module (`bun:test` happily reads ESM); the chunk-inlined
copy is a string view of the same bytes, sans `export ` keywords.

The `readFileSync` import-time cost is one disk read at compiler-module load (~430 LOC,
~13KB). Acceptable; runtime-template.js already runs at module init regardless.

## Synth-cell registry write target (B11/B12 consumer surface)

**Per-field synth records (B12) are C7's primary write target.** Per `getPerFieldSynthRecords`:

- Top-level non-compound cell with validators → returns `[]` (no `kind:"field"` scope attached).
- Compound CHILD cell (any type, validators or not) → returns `[isValidRec, errorsRec, touchedRec]`.
- Compound PARENT (a child that is itself compound) → returns `[]` (B12 skips; B11 handles compound-level synth).
- Synth records carry encoded `qualifiedPath`: `parentField.qualifiedPath + "." + property`,
  e.g., `signup.email.errors`, `signup.email.isValid`.

C7 emits writes:
- `_scrml_reactive_set("signup.email.errors", errors)`
- `_scrml_reactive_set("signup.email.isValid", isValid)`

These keys correspond directly to the synth records' `qualifiedPath` (which IS the storage
key — same as how C1's compound child cells use qualified paths).

`touched` is NOT C7's responsibility — it's event-driven (`bind:value` change / focus-out)
and B12 marks it with `runtimeHookKind:"touch"`. C9/C10 wires it.

## Top-level-cell-with-validators disposition (Brief §scope item OUT — survey clarified)

**Per SPEC §55.5 line 25115-25120 + B12 invariants:** top-level non-compound cells with
validators DO NOT synthesize a per-field surface. The validator on such a cell "still fires;
failure is tracked via the type-system (refinement type) or via the parent compound if any."

**C7 disposition:** **emit no runner** when `getPerFieldSynthRecords(node) === []`. The
predicate is exactly equivalent to `node.isCompoundChild === true` AND not a compound parent.
At codegen time, the StateCellRecord for a node is reachable via the symbol-table
`_resolvedStateCell` stamp; cleaner: detect by the surrogate `opts.compoundPathPrefix`
(non-empty implies we're inside a compound parent's recursion, which means this state-decl
IS a compound child). For C7 emission we use the `compoundPathPrefix` proxy plus a
defensive `Array.isArray(node.children) === false` (compound parents skip too).

This is **NOT a STOP-FOR-PA case** — the top-level cell's validators are accepted at decl
time (B10 type-checks them), but they have no observable runtime surface today. They will
become reachable when the type-level refinement-predicate path lands (C-future); for C7
they're a degenerate "no synth target = no runner" pass-through.

If a developer expects `<count req min(0)>` at top level to populate something, that's a
documentation gap, not a C7 gap. Per primer's own guidance ("For form cells, a one-field
compound is the conventional pattern — `<form><name req/></>`"), the convention sidesteps
this entirely.

**OUT-of-scope deferral filed:** "Top-level cell validators emit no observable runtime
surface; this is per §55.5 L11 Edge A. Future C-step OR type-system C-step will handle
type-level enforcement; if validator-OBSERVABILITY at top-level is desired, requires
spec amendment — not a C7 gap."

## Per-validator dispatch shape (the code C7 emits)

For a state-decl with validators, C7 emits the following derived-computation skeleton
(showing inlined, but emitted as actual generated JS):

```js
// For <signup><email req length(>=2) eq(@confirmEmail)/></>
_scrml_derived_declare("signup.email.errors", () => {
  const value = _scrml_reactive_get("signup.email");
  const errors = [];
  // validator 1: req
  {
    const error = _scrml_validator_fire("req", value);
    if (error !== null) {
      errors.push(error);
      // §55.12 short-circuit: req fails on empty/null → skip remaining
      return errors;
    }
  }
  // validator 2: length(>=2)
  {
    const error = _scrml_validator_fire("length", value, { op: ">=", value: 2 });
    if (error !== null) errors.push(error);
  }
  // validator 3: eq(@confirmEmail)
  {
    const error = _scrml_validator_fire("eq", value, () => _scrml_reactive_get("confirmEmail"));
    if (error !== null) errors.push(error);
  }
  return errors;
});
_scrml_derived_subscribe("signup.email.errors", "signup.email");
_scrml_derived_subscribe("signup.email.errors", "confirmEmail");

_scrml_derived_declare("signup.email.isValid", () => {
  return _scrml_derived_get("signup.email.errors").length === 0;
});
_scrml_derived_subscribe("signup.email.isValid", "signup.email.errors");
```

Notes on the shape:

- `_scrml_validator_fire(name, value, ...args)` — exported by the `validators` chunk;
  thin wrapper around C6's `fireValidator` (name preserved for runtime catalog match).
- Per-validator block is wrapped in a JS block (`{ ... }`) so `const error` doesn't
  shadow across iterations.
- **§55.12 short-circuit:** when the validator name is `"req"` or `"is some"` AND
  `error !== null`, the runner does `return errors;` to terminate. This is the
  **early-return** pattern; equivalent to `break` but cleaner inside the closure.
  Confirmed against §55.12 lines 25337-25339 verbatim.
- **Arg kind dispatch:**
  - `relational-predicate` → emit `{ op: "<op>", value: <emittedExpr> }` (object literal,
    inner ExprNode lowered via `emitExpr`).
  - `comparable-with-cell` / `any-equatable-with-cell` — if the arg's expression contains
    any `@cell` ident (detected via `extractReactiveDepsFromExprNode`), emit
    `() => <emittedExpr>` (thunk). Otherwise emit the literal expression.
  - `array-of-cell-type` (`oneOf([...])` / `notIn([...])`) — emit array literal; if any
    inner element references `@cell`, that element gets a thunk; the array itself can be
    a thunk if the whole array reference is a `@cell`.
  - `numeric` / `regex` — emit literal expression. Regex literals stay as-is (`/regex/flags`).
  - `inline-message-override` — STRIPPED at emission time (B13 already extracted onto
    `validator.inlineOverride`); C10 consumes that field. C7 ignores the trailing
    string-literal arg slot.
- **`isValid` computation** depends only on `errors` (the per-field errors derivation).
  Emitted as a separate derived-declare so the dirty-propagation graph is fine-grained.
- **Reactive deps wired** via `_scrml_derived_subscribe` for the field's own value AND every
  cross-field `@cell` referenced in args.

## Where the runner gets emitted

In `emit-logic.ts:case "state-decl":`, after `_emitDefaultSidecar` + `_emitInitThunkSidecar`
are computed (line 858-859), add:

```ts
const _validatorSidecar = _emitValidatorRunnerSidecar(node, _qualifiedName, opts);
```

And in `_appendSidecar`:
```ts
if (_validatorSidecar) parts.push(_validatorSidecar);
```

The runner emits AFTER the cell's `_scrml_reactive_set` (so the cell is registered before
the derived computation tries to read it). C5 already established this ordering invariant
(init-thunk + default-thunk emit AFTER the main reactive_set). C7 follows the same convention.

## Skip rules (`_emitValidatorRunnerSidecar` returns `null`)

1. `node.validators` is null/undefined or empty array.
2. `opts.boundary === "server"` — validator runner is client-only.
3. `opts.insideFunctionBody` — reassignments don't re-register the runner.
4. `node.shape === "derived" && node.isConst === true` — E-DERIVED-WITH-VALIDATORS already
   fired by B13; defensive skip.
5. `node._cellKind === "compound-parent" || Array.isArray(node.children)` — compound parents
   don't run validators directly; their fields do (recursion handles those).
6. `_cellKind === "markup-typed"` — same as derived (E-DERIVED-WITH-VALIDATORS).
7. `compoundPathPrefix` is empty (top-level cell): per the §55.5 L11 Edge A clarification
   above, top-level non-compound cells get NO synth surface — skip.

## Estimated test delta

`compiler/tests/unit/c7-per-cell-validator-runner.test.js` — NEW.

Test sections (estimate ~60-80 expects across ~25-35 test() blocks):

- §C7.0 emission shape (5 tests) — basic structure of the emitted runner
- §C7.1 single bareword validator (`req`, `is some`) — pass + fail (4 tests)
- §C7.2 single call-form validator (`length(>=2)`, `pattern(/.../)`, `min(N)`, etc.) (6 tests)
- §C7.3 multi-validator compose (in declaration order) (3 tests)
- §C7.4 §55.12 short-circuit on `req` fail (3 tests)
- §C7.5 §55.12 short-circuit on `is some` fail (2 tests)
- §C7.6 cross-field validator (`eq(@otherCell)`) — re-fires on cross-field change (3 tests)
- §C7.7 arg-kind dispatch — relational-predicate, comparable, equatable, array (5 tests)
- §C7.8 skip rules — top-level cell, derived, compound-parent, server, function-body (6 tests)
- §C7.9 `isValid` = `errors.length === 0` (2 tests)
- §C7.10 reactive-deps wired for cell value + cross-field args (3 tests)
- §C7.11 chunk wiring — `validators` chunk in `RUNTIME_CHUNK_ORDER`, marker, source content (4 tests)
- §C7.12 chunk-detection — `state-decl` with `validators[]` adds `validators` chunk (2 tests)
- §C7.13 `runtime-tree-shaking` regression — chunk count goes 15 → 16 (1 test update)

Plus a runtime-execution test verifying `_scrml_validator_fire` dispatches to C6's catalog
correctly when the chunk is loaded.

Approximate total: ~50 tests, ~150 expects. Brief estimated 3-5h; mostly test authoring time.

## Spec verification (pa.md Rule 4)

Reading SPEC.md offsets directly:

- **§55.2 lines 25011-25025:** firing semantics (reactive recompute, failure populates
  errors, form-validity gating) + req short-circuit edge. C7 implements all four bullets.
- **§55.6 lines 25132-25143:** per-field reactive recompute on cell change OR cross-field
  arg change. C7's `_scrml_derived_subscribe` calls wire both. No-validator field
  (line 25139) gets `errors=[]`, `isValid=true` trivially — handled by the "no validators
  → no runner" path; consumers reading `@signup.someUnvalidated.errors` get `undefined`,
  which `_scrml_reactive_get` defaults to `[]` per the registry's reactive-set policy.
  **WAIT — verify this:** B12 registers per-field synth records but does NOT emit a default
  value; C7 only emits a runner when validators[] is non-empty. The "trivially true / empty
  array" semantics for no-validator fields needs C7 to emit a degenerate runner OR rely on
  the registry default. Survey decision: emit a degenerate runner only when there ARE
  validators. The trivially-true case is handled by the registry's defaults +
  `_scrml_reactive_get("compound.field.errors") ?? []`-style use-site reads. **OUT-of-scope
  defer filed:** "Per-field surface defaults for no-validator fields — confirm in C8 or
  C10 whether use-sites need explicit defaults emitted." This matches §55.6 line 25139's
  "trivially `true`; `errors` is `[]`" without C7 emitting anything; consumers read defaults.
- **§55.7 lines 25148-25153:** `isValid` and `errors` are **reactive** (recompute on input
  change). `touched` (event-driven) and `submitted` (compound-only event) are NOT C7's
  responsibility (out of brief scope).
- **§55.12 lines 25337-25344:** **short-circuit** — `req`/`is some` failure on empty/null
  cell → SKIP remaining; report only `.Required` / `.NotSome`. **Composition** — when
  multiple validators fail, order matches source-declaration order. C7 implements both
  via the early-return pattern + the natural for-loop iteration order.

All scope items match SPEC. No drift.

## Implementation plan (sequenced for incremental commits)

1. **Commit 1 — runtime-template chunk + validators chunk wiring.** Add `readFileSync`
   import + `_VALIDATOR_RUNTIME_SOURCE` extraction. Insert the `// §55.1 Validator
   predicate runtime catalog (chunk: 'validators')` marker into `SCRML_RUNTIME` between
   the `reset` chunk and the `§6.6 Derived` chunk. Add `_scrml_validator_fire` thin wrapper
   inside the chunk (it dispatches by name to the inlined `VALIDATOR_RUNTIME` map).
   Update `runtime-chunks.ts`: add `'validators'` to `RUNTIME_CHUNK_ORDER` + `CHUNK_MARKERS`.
   Smoke test by loading the runtime + extracting the chunk.

2. **Commit 2 — emit-validators.ts module.** Author `_emitValidatorRunnerSidecar(node,
   qualifiedName, opts)`. Skip rules + arg-kind dispatch + short-circuit + reactive-deps
   collection. Returns null OR `{statements: string}` joined.

3. **Commit 3 — emit-logic wire-in.** Single `_emitValidatorRunnerSidecar` call inside
   `case "state-decl":` + appended to `_appendSidecar` parts.

4. **Commit 4 — emit-client chunk-detection.** Add `validators?.length > 0` trigger inside
   `case "state-decl":` of `detectRuntimeChunks`.

5. **Commit 5 — c7-per-cell-validator-runner.test.js.** Full test file authoring.

6. **Commit 6 — runtime-tree-shaking.test.js bump.** Chunk count 15 → 16; add `validators`
   to expected order.

7. **Commit 7 — final regression check.** `bun run test`. Expect ~10,062 + ~50 = ~10,112+
   pass / 0 fail. Reconcile expects count.

## Risk + STOP gates

- **Cross-machine sync:** NOT touching `runtime-validators.js`, `validator-catalog.ts`,
  or `SPEC.md`. C6 territory unaffected.
- **Engine-state validators:** §55.14 territory; STOP gate observed — out of Wave 2.
- **Compound-level rollup:** C8 territory; STOP gate observed — C7 emits per-field
  outputs only.
- **Error message rendering:** C10 territory; STOP gate observed — `inlineOverride`
  is stripped from arg-emission but NOT consumed.
- **`<errors of=>` element:** C11 territory; STOP gate observed.
- **Pre-commit hook:** NOT bypassing.
- **`readFileSync` at module-load:** the path is computed via `import.meta.url` so it
  resolves correctly regardless of working directory. Verified pattern is used by
  `compiler/src/api.js` already (different shape but same fs.readFileSync usage at
  module-level). The `runtime-validators.js` file is part of the compiler distribution
  alongside `runtime-template.js` — they're sibling files in the same directory.

## File-touched diff vs brief

| File | Brief | Actual plan |
|---|---|---|
| `compiler/src/codegen/emit-validators.ts` (NEW) | YES (likely) | YES |
| `compiler/src/runtime-template.js` | YES (likely) | YES — new chunk wired via fs.readFileSync |
| `compiler/src/codegen/runtime-chunks.ts` | possible | YES — new `validators` chunk added to ORDER + MARKERS |
| `compiler/src/codegen/emit-client.ts` | possible | YES — new chunk-detection trigger |
| `compiler/src/codegen/emit-logic.ts` | YES (extension) | YES — single sidecar call |
| `compiler/tests/unit/c7-per-cell-validator-runner.test.js` (NEW) | YES | YES |
| `compiler/tests/unit/runtime-tree-shaking.test.js` | possible | YES — chunk count bump |
| `docs/changes/phase-a1c-step-c7-per-cell-validator-runner/{progress,SURVEY}.md` | YES | YES |
