# Bug 32 — `@.` not lowered inside tableFor column slot

## Phase 0 — Diagnose

### Reproducer verified

Compiled `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-1-react.scrml` against current worktree HEAD. Output `dev-1-react.client.js` line 438:

```
_scrml_lift_el_64.appendChild(document.createTextNode(String((@ . status) ?? "")));
```

`node --check` fails: `SyntaxError: Invalid or unexpected token`.

### Root cause

The `<tableFor>` codegen at `emit-table-for.ts:expandTableForElement` synthesizes a `for-stmt` AST with `variable: <unifiedRowBinding>` (e.g. `row`). The `<column>` slot body (e.g. `<span class="status-badge">${@.status}</span>`) is captured at the type-system stage as raw children and spliced into the synth `<td>` unchanged. The downstream emit (emit-control-flow → emit-lift → emit-html → bare-expr) emits the slot body's interpolations verbatim. The `${@.status}` interpolation's expression text is `@.status` — and NO pass rewrites `@.` to the row-binding name `row`.

The `<each>` codegen at `emit-each.ts:rewriteContextualSigil` DOES rewrite `@.` → iterVar, but only because emit-each walks template children directly to emit JS lines. The tableFor expander defers downstream emit and never invokes that pass.

### Bug 31 deferred line-438 finding == Bug 32

Bug 31 dispatch agent reported a "DIFFERENT bug" at dev-1-react line 438 inside what they called an `<each>` body. Empirical: dev-1-react.scrml line 331 `<span class="status-badge">${@.status}</span>` is inside a `<column field="status">` block (line 330) which sits inside `<tableFor for=Ticket rows=@visibleTickets>` (line 311). It is NOT an `<each>` block. The `<each in=comment.tags>` at line 376 with `${@.}` at 377 compiles correctly (no orphan `@` token observed in output). So the line-438 site IS Bug 32. Same root.

### SPEC reading

- §41.16.3 line 20441: column slot body exposes row via `:let={(row) => ...}`; bound name (`row`, `user`, `u`, etc.) is adopter-chosen.
- §41.16.10 line 20512: implicit `@row` magic variable RESERVED v1.next.
- §17.7 / anti-patterns doc: `@.` is "the iteration sigil" — adopter mental model.
- §41.16.11 line 20528: "default-rendered or `<column>` slot body emission with `:let={(row) => ...}` substitution" — i.e., tableFor DOES perform substitution on slot body (the row-binding-name substitution path is mentioned).

The implicit-`@row` reservation is about NOT having to write `:let={...}`. It does NOT prevent `@.` (the iteration sigil) from being lowered to the row binding. tableFor IS an iteration locus — it iterates rows.

## Phase 1 — Fix design

Site 1 (chosen): at expander time, walk `col.slotBody` recursively and rewrite `@.` and `@.field` in all `bare-expr` nodes' `expr` text + re-parse `exprNode`. Target = the unified row binding name. Contained to `emit-table-for.ts`. Mirrors emit-each's `rewriteContextualSigil` regex (text-level pass), but applied to bare-expr children rather than template-child raw text.

Test coverage planned:
1. Minimal repro — `${@.status}` lowers to `row.status`
2. Multi-column with `@.field` in each slot
3. Mixed `${row.field}` + `${@.field}` in same slot
4. `<each>` regression-guard (still emits)
5. `<each>` `:`-shorthand regression-guard (still emits)
6. Nested `<each>` inside tableFor column slot
7. Adopter custom binding name (`:let={(user) => ${@.name}}` → `user.name`)
8. node --check on emitted JS clean for each test
9. R24 dev-1-react FULL build: orphan `@` count 0 (was 1)

## Phase 1 — Fix LANDED

- Patch: `emit-table-for.ts` `+170/-3L`. New helper functions:
  - `rewriteAtDotInExprText(text, rowVar)` — regex pass with space-padded-dot tolerance (mirrors emit-each.ts line 259 + Bug 35 precedent).
  - `rewriteAtDotInSlotBody(children, rowVar)` — top-level walker entry.
  - `rewriteAtDotInNode(node, rowVar)` — recursive walker for bare-expr / logic / markup / generic child-bearing shapes. Returns NEW immutable nodes (no mutation).
  - `rewriteAtDotInAttr(attr, rowVar)` — attribute value rewriter for string-literal / expr / call-ref kinds.
- Call site: `buildBodyCell` line 700 — replaced `children = col.slotBody` with `children = rewriteAtDotInSlotBody(col.slotBody, rowBindingName)`.
- Commit `8e52bfd4`.

### Diagnostic ouroboros (logged for posterity)

During fix iteration I misread the output filename (compiled into `/tmp/r24-bug32-repro/canon-out/r24-bug32-dump.client.js` but was inspecting stale `canon.client.js` from an earlier run) and thought my patch wasn't firing. Spent ~10 minutes tracing emit-lift / emit-client / api.js code paths before noticing the filename mismatch. The fresh-file inspection confirmed the patch works first-shot.

LESSON: when reading "the fix isn't firing" telemetry, ALWAYS `ls -la <output-dir>` first to confirm filename + mtime; never trust prior inspection paths after changing input file shape.

## Phase 2 — Regression tests LANDED

- 13 tests in `compiler/tests/unit/r24-bug-32-at-dot-tablefor-column-slot.test.js`
- Coverage matches brief's planned shape (1-9 sections):
  1. Minimal reproducer + default-rendered columns unchanged
  2. Multi-column slot bodies + mixed @./row. compositions
  3. Implicit row binding
  4. Bare @. (no member access)
  5. <each> regression-guard (bare, as-name, :-shorthand)
  6. Nested <each> inside tableFor column slot
  7. Attribute interpolation with @.field
  8. R24 dev-1-react replay (Bug 31 deferred line-438 same root)
  9. Space-padded dot tolerance assertion
- All 13 pass; existing 68 table-for.test.js tests still pass.
- Commit `eee7d963`.

## Phase 3 — Empirical R26 verification

- Orphan `@ .` count in dev-1-react.client.js: 1 → 0 (Bug 32 site closed)
- Bug 31 dispatch agent's deferred line-438 IS the same root — closed by this fix (verified empirically: dev-1-react.scrml line 331 `${@.status}` was inside `<tableFor>` `<column field=status>`, NOT inside `<each>` as misclassified)
- Remaining `node --check` failure at line 646 (`if (evt !== null && evt !== undefined) { ... }`) is a separate `selectable=` `onchange` handler emit bug — NOT Bug 32 scope. Deferred filing.
