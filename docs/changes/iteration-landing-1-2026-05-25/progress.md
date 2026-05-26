# Iteration Landing 1 — `<each>` impl progress

**Dispatch:** S130 Phase 2 Landing 1 of 5 — compiler-source impl of `<each>` per HU-1 ratifications.
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a3d63c84a0ce87e87`
**Branch:** main (worktree-local)
**HU source:** `docs/heads-up/iteration-design-2026-05-25.md` Phase 2 amendment scope, Landing 1 enumeration.

## Step log (append-only, timestamped)

- 2026-05-25T??:??Z — startup verification clean (pwd matches worktree, git toplevel matches, tree clean). `bun install` 204 packages OK. `bun run pretest` compiled 13 test samples OK.
- 2026-05-25T??:??Z — mandatory pre-reads complete:
  - primary.map.md (notes parser/codegen/ast-builder maps likely STALE; will verify via grep)
  - HU doc full read — 8 ratifications, 4 canonical shapes, 5-landing Phase 2 scope
  - PRIMER §1-§6 (iteration is NOT yet a flagship subsection; Landing 4 adds it)
  - SPEC-INDEX full read — §17.4 `for/lift` (Tier 0), §18.0.1 match block-form (Tier 1 precedent), §51.0.I engine `:`-shorthand precedent, §4.14 universal `:`-shorthand body grammar, §4.15 structural element registry
  - SPEC §4.14 line 949-1013 read in full — confirmed actual `:`-shorthand form per Q3 RE-RATIFICATION (`:` INSIDE the opener, mandatory whitespace, no closer)
  - SPEC §17.4/17.4a/17.4b — Tier 0 `for/lift` + `else` empty + `key=` (current state)
  - SPEC §34 catalog format (lines 15102+, table grid format)
  - SPEC §51.0.I engine `:`-shorthand canonical example
  - SPEC §18.0.1 match block-form canonical example
  - SPEC §56.2 I-MATCH-PROMOTABLE fire conditions (precedent for W-EACH-PROMOTABLE)
  - attribute-registry.js / html-elements.js (note: `<empty>` is ALREADY registered for tableFor §41.16.9; will extend, not duplicate)
  - block-splitter.js STRUCTURAL_RAW_BODY_ELEMENTS pattern (currently `match` only)
  - ast-builder.js match-block dispatch (lines 10780-10925) — pattern reference for `each-block`
  - codegen/emit-control-flow.ts emitForStmt (line 282+) — pattern for reactive iteration

## Plan

Implementation order (per HU Landing 1 enumeration; each step is one logical commit):

1. **Registration**: add `<each>` + `<empty>` (extend; already exists for tableFor) to:
   - `attribute-registry.js` — each attrs (`in=`, `of=`, `as=`, `key=`)
   - `html-elements.js` — REGISTRY entries for `each`; `empty` already there
2. **Block-splitter**: add `each` to STRUCTURAL_RAW_BODY_ELEMENTS (mirrors `match` — body re-tokenized by ast-builder dispatch)
3. **AST shape**: add `each-block` node kind to types/ast.ts mirroring `match-block`
4. **AST builder**: dispatch `<each>` into `each-block` node (mirrors match-block at lines 10780-10925)
5. **Body parser**: per-arm-body walker for `<each>` body — handles `:`-shorthand body composition (§4.14 leverage), `<empty>` sub-element, `@.` contextual sigil
6. **Type system**: `@.` resolution in `<each>` body scope; `key=` inference from item type
7. **Codegen**: `emit-each.ts` — both shapes (`in=` and `of=`); reactive collection sub; `<empty>` empty-state; `as name` override
8. **W-EACH-KEY-001 info-lint**: fires when items lack inferable identity
9. **W-EACH-PROMOTABLE info-lint**: fires on Tier-0 `${for/lift}` sites (mirrors I-MATCH-PROMOTABLE)
10. **§34 catalog rows**: add W-EACH-PROMOTABLE + W-EACH-KEY-001 (DO NOT collide with Lifecycle Landing 2 sibling)
11. **Test surface**: unit tests for each canonical shape + nested + reactive + empty-state + `:`-shorthand + lint fires

## Decisions surfaced

- `<empty>` is ALREADY registered (`html-elements.js` REGISTRY line 751 + `attribute-registry.js` line 374). Will EXTEND (not duplicate) its acceptance to `<each>` body, mirroring its current tableFor acceptance.
- §34 row insertion: append at end of existing rows (table format permits append-only; sibling Lifecycle Landing 2 adds E-TYPE-LIFECYCLE-ON-ENGINE-CELL; I'll append my 2 rows separately so any conflict is line-additive, not overlap).
- `each-block` AST node mirrors `match-block` shape: `kind: "each-block"`, fields `iterShape` (`"in"` / `"of"`), `inExprRaw`/`ofExprRaw`, `asName`, `keyExprRaw`, `bodyChildren` (per-item template), `templateChildren` (bodyChildren minus `<empty>`), `emptyChild` (the `<empty>` body), `bodyRaw`, `span`.

## SHIPPED — all 11 enumerated items + tests landed

1. ✓ Element registration (`html-elements.js` + `attribute-registry.js`) — `<each>` with `in=` / `of=` / `as=` / `key=` attrs; `<empty>` extended to acknowledge `<each>` parent locus.
2. ✓ Block-splitter (`block-splitter.js`) — `<each>` added to STRUCTURAL_RAW_BODY_ELEMENTS + COMPOUND_LIFT_EXEMPT_TAGS. Depth-tracking for nested same-kind openers (per HU-1 Q6 nested-iteration canonical example).
3. ✓ AST builder (`ast-builder.js`) — `each-block` dispatch at the matching pattern of `match-block`; produces `iterShape` / `inExprRaw` / `ofExprRaw` / `asName` / `keyExprRaw` / `bodyChildren` / `templateChildren` / `emptyChild` / `bodyRaw`. Attribute-value capture handles `in=`/`of=`/`key=` (=-form) and `as name` (whitespace-separated bareword).
4. ✓ Body parser — re-`splitBlocks` of body raw text recovers walkable structural children for `<empty>` sub-element extraction.
5. ✓ Codegen (`codegen/emit-each.ts` NEW, ~400L) — `collectEachBlocks` walker, `emitEachMountHtml` (static placeholder), `emitEachBodyRenderForFile` (render fns + dispatchers using `_scrml_reconcile_list` + `_scrml_effect_static`).
6. ✓ `@.` contextual sigil resolution — `rewriteContextualSigil` in emit-each.ts substitutes `@.` → iter var; `@.field` → iter var.field.
7. ✓ `<empty>` sub-element grammar + codegen — empty-state path emitted before reconcile when `<empty>` sub-element present.
8. ✓ `key=` inference logic — explicit `key=expr` overrides; `key=__index__` sentinel returns `i`; default for `in=` is runtime guard `(item?.id != null ? item.id : i)`; default for `of=` is `i`.
9. ✓ `<each of=N>` count codegen — `Array.from({length: Number(N) || 0}, (_v, _i) => _i)` range factory.
10. ✓ `as name` override — bound in TS scope; threaded as factory closure arg name in codegen.
11. ✓ §4.14 `:`-shorthand body composition — `detectShorthandOpener` + `extractShorthandExpr` recognize the per-item `<li : @.name>` form per Q3 RE-RATIFICATION; emit as `textContent = String(expr)`.
12. ✓ W-EACH-PROMOTABLE info-lint (`lint-w-each-promotable.js` NEW, ~190L) — fires on `${for/lift}` Tier-0 sites with @cell iterable + lift-bearing body. Names mechanical promotion target.
13. ✓ W-EACH-KEY-001 info-lint (`lint-w-each-key.js` NEW, ~200L) — fires on `<each in=>` without inferable `.id` key. Names three legitimate causes + suppress sentinel.
14. ✓ §34 catalog rows for both new codes (added at end of §34, before §34.1 sub-section).
15. ✓ Test surface (`compiler/tests/unit/each-block.test.js` NEW, ~440L) — 24 tests covering all 4 canonical shapes, nested iteration, `<empty>` composition, `key=` inference + explicit override + suppress sentinel, `:`-shorthand body, both info-lints, tree-shake, TS scope plumbing, DG credit. 24/24 pass.
16. ✓ TS pass scope plumbing (`type-system.ts`) — `each-block` visitor case mirrors `for-stmt` at line 6274. Pushes `each:` scope and binds `as name` so logic interpolations don't false-fire E-SCOPE-001.
17. ✓ DG pass credit (`dependency-graph.ts`) — `each-block` scans `inExprRaw` / `ofExprRaw` / `keyExprRaw` + `bodyRaw` for `@cellName` refs and credits each as a reader, preventing false E-DG-002 on `<each in=@contacts>`.

## Out-of-scope (deferred per brief)

- **SPEC §17.X subsection** — Landing 2 SPEC amendment dispatch.
- **`bun scrml promote --each` CLI** — Landing 3 dispatch.
- **PRIMER + kickstarter updates** — Landing 4 dispatch.
- **Corpus migration (113 sites)** — Landing 5 gradual via CLI.
- **`<if>` element** — explicitly held out of HU-1 per Q8 close.

## SPEC-vs-HU contradictions

None found. The HU doc faithfully aligns with SPEC §4.14, §51.0.I, §18.0.1 precedents. Q3 RE-RATIFICATION correctly reflects §4.14 line 965-977 (`:`-shorthand body grammar with `:` INSIDE the opener, mandatory whitespace before, no closer).

## Sibling-dispatch coordination

The Lifecycle Landing 2 sibling dispatch (parallel) is also touching §34 — adding `E-TYPE-LIFECYCLE-ON-ENGINE-CELL`. I added W-EACH-PROMOTABLE + W-EACH-KEY-001 just before the `---` rule that separates §34 from §34.1, AFTER `W-AUTH-LOGIN-MISSING`. The sibling will likely add its row in a similar adjacent spot. PA will need to merge-resolve if the rows interleave; the table format is append-friendly so the resolution is mechanical. No code overlap.

