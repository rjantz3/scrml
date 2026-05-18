# formFor impl — progress

## 2026-05-18 — start

WORKTREE: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a6cfaac4787c0085b

- Cherry-picked SPEC commit 0c16f58 (§41.14 source of truth) onto worktree base (was at Phase 2.1 baseline).
- Read SPEC §41.14 (lines 18399-18535) — 11 normative subsections.
- Read SPEC §41.13 (parseVariant precedent), §53.14 (type-as-argument family).
- Read SPEC §34 rows for 8 new E-FORMFOR-* error codes.
- Read existing parseVariant impl: type-system.ts (lines 3900-3970, 9620-9788), emit-parse-variant.ts (220 lines).
- Read Shape 2 spec (§6.2), validity surface (§55.5-55.8), state-decl AST shape (compound + structuralForm).

## Implementation plan (Approach A — source-level expansion)

**Stage**: type-system.ts (per SPEC §53.14.5 — type-as-argument family recognized at TS stage).

**Pass shape** (mirrors parseVariant pattern at lines 3924-3971):
1. Collect formFor local names from `import { formFor } from 'scrml:data'` imports.
2. Walk top-level AST nodes; find every `<formFor>` markup-element node.
3. Validate per §41.14.1-41.14.8 (8 error codes).
4. **Rewrite the AST in place**: replace `<formFor for=Signup .../>` with:
   - A synthesized compound `state-decl` node (structuralForm: true, name: lowercased struct name) with per-field Shape 2 children (input render-spec + validators).
   - A `<form>` markup node containing per-field `<label>` + `<varname/>` + `<errors of=...>` blocks + submit button.
5. Annotate the new nodes so downstream stages see hand-authored-equivalent shape.

**Auto-synth surface** rides through naturally — emit-synth-surface.ts already handles compound state-decls with validators.

**Codegen** rides existing pipelines: emit-logic.ts (state-decl), emit-html.ts (markup), emit-bindings.ts (Shape 2 bind:), emit-synth-surface.ts (validity surface).

**Error codes** fired at TS stage (parser stage E-FORMFOR-SLOT-UNKNOWN / E-FORMFOR-ERROR-STRATEGY-INVALID can stay at TS too — they need typeRegistry).

## Files to touch

- compiler/src/type-system.ts — recognition + validation + AST rewrite
- compiler/src/codegen/emit-form-for.ts — NEW; helper that constructs the synth AST nodes (called from type-system.ts)
- compiler/src/html-elements.js — register `formFor` as a recognized structural element (so attr-grammar is permissive)
- compiler/tests/unit/form-for.test.js — NEW; happy-path + 8 error-code tests
- (maybe) compiler/src/attribute-registry.js — register formFor attributes

## Out of scope (per brief)

- stdlib/data/ formFor + registerLabels exports — separate dispatch
- Sample + example app — separate
- README/scrml.dev refresh — separate

## 2026-05-18 — implementation status

**Complete:**
- §41.14 SPEC cherry-picked from 0c16f58
- emit-form-for.ts AST expander (parseValidatorClauses, mechanicalLabel,
  camelizeStructName, inputShapeForFieldType, pickBindAttrName, expandFormFor)
- Type-system stage: collectFormForImports + walkAndExpandFormForNodes
- All 8 E-FORMFOR-* error codes wired with normative messages
- AST rewrite splices synthesized [compoundDecl, formElement] in place of
  the original <formFor> node
- Tokenizer extended for `[...]` array-literal attribute values
  (`pick=["a", "b"]`, `omit=["c"]`)
- 26 expander unit tests pass
- 20 form-for end-to-end tests pass (full pipeline, per-error-code coverage)
- Canonical example compiles cleanly + emits expected shape:
  - `<form data-scrml-formfor=... data-scrml-bind-onsubmit=... action=... method="POST">`
  - Per-field `<div data-scrml-formfor-field=...>` + `<label>` + `<input
    type="..."  data-scrml-bind-...="...">` + `<errors>` anchor
  - Submit `<button type="submit" data-scrml-formfor-submit=...>` (with
    `data-scrml-formfor-submit=cellName` selector)
- PE-default `action="/api/<route>" method="POST"` for server-fn handlers
- Per-field bind:value / bind:checked / bind:valueAsNumber per type
- Pick / omit / partial transforms all behaviorally verified
- All 12,707 pre-existing tests still pass

**Known gaps (FOLLOWUP, not in v1.0 scope per §41.14.9):**
- `disabled=!@signup.isValid` on submit button — silently dropped at codegen
  (reactive Boolean expression attrs other than `if=`/`show=` are not
  wired by emit-html.ts; this is an existing compiler-wide gap, not
  formFor-specific). Workaround: adopters provide submit slot override.
  Surface for v1.next dispatch.
- Pre-resolved type-info for `string req length(>=2)` shape — the existing
  buildTypeRegistry's resolveTypeExpr falls through to asIs for the
  validator-suffix form; my code parses validators from the raw clause and
  extracts the leading bare-type token. SPEC §41.14.5/§55 doesn't normatively
  describe how struct field validators integrate with the typeRegistry; the
  resolution is correct semantically (the validators ARE attached to the
  synth Shape 2 sub-cells, which the §55 auto-synth surface fires on).

**Diverged-from-SPEC items:**
- None. All emit decisions trace back to §41.14.* subsections.
