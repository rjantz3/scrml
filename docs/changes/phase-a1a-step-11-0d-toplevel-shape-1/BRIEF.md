# Phase A1a Step 11.0d — Top-level structural Shape 1 recognition

**Status:** DRAFT — queued for dispatch after Step 12 lands. Surfaced as P-FUP-1 by Step 12 dispatch (S61, 2026-05-05).
**Estimate:** 3-6h focused work. Likely BS (block-splitter) + body-pre-parser extension matching Step 2's pattern.
**Authority:** SPEC §6.2 documents `<count> = 0` at file top-level as canonical Shape 1. PA-SCRML-PRIMER §3.1 reaffirms. Step 12's dispatch confirmed implementation gap: top-level structural Shape 1 NOT yet implemented in BS — only inside-`${...}` form works.

---

## §1 What lands

The V5-strict structural Shape 1 form `<count> = 0` (and Shape 2 `<x> = <input/>`, Shape 3 `const <x> = expr`) at FILE TOP-LEVEL — outside any `${...}` block — is recognized by the parser and produces `state-decl{shape:"plain"|"decl-with-spec"|"derived", structuralForm:true, ...}`.

**Before Step 11.0d:**
- `<count> = 0` at top-level → BS treats `<count>` as HTML markup tag opener → falls through to html-fragment OR fails compile with `E-CTX-003`. Step 12 reverted 3 samples on this gap (`test-002-with-logic.scrml`, `test-009-test-reactive.scrml`, `modern-003-full-app.scrml` — kept legacy `@x = init`).
- Inside `${...}`: WORKS (Step 2's foundational decl-recognition).

**After Step 11.0d:**
- `<count> = 0` at top-level → parses to `state-decl{shape:"plain", structuralForm:true}`.
- Inside `${...}`: unchanged (still works).
- The 3 reverted samples migrate to V5-strict canon cleanly.

---

## §2 Scope

### §2.1 In-scope
1. **BS top-level scan extension.** Locate the BS top-level statement-scan path. Currently `<IDENT>` at line-start is treated as HTML markup tag opener (per §4.6 PA-001 disambiguation, kicked into `<` Suppression Inside Brace-Delimited Contexts). Extend to recognize `<IDENT> [attrs] > = ...` (Shape 1), `<IDENT> [attrs] > = <markup/>` (Shape 2), `const <IDENT> [attrs] > = expr` (Shape 3) as state-decl pre-AST signals — **same pattern as Step 2's foundational recognition for inside-`${...}`**.
2. **body-pre-parser handoff.** If BS pre-AST signal exists for top-level state-decls, body-pre-parser extracts and ast-builder.js routes to the existing `tryParseStructuralDecl` path. Verify routing.
3. **Compound (Variant C) at top-level** (`<formRes>\n<x> = ""\n</>`) — likely also needs extension; verify Step 11.0a's recognizer handles top-level OR extend.
4. **Typed-decl at top-level** (`<count>: number = 0`) — likely also needs extension; verify Step 11.0c's recognizer handles top-level OR extend.
5. **Restore the 3 reverted Step 12 samples** to V5-strict canon (`@counter = 0` → `<counter> = 0` etc.) once BS recognizes them.
6. Update progress.md + cumulative log.

### §2.2 Out-of-scope
- Engine-state-children Shape 1 inside `<engine>` bodies — that's Tier 2 / A2 territory.
- Component-decl extensions — separate concern (`< userBadge name(string) role(Role)>` syntax is component-def, not Shape 1).
- Self-host parity — defer per Step 4-7 policy.

---

## §3 Survey-first mandate (depth-of-survey discount; **9× pattern likely applies**)

Step 12 surfaced this as P-FUP-1 mid-rewrite. Apply rigorously.

Survey questions:
1. **Where is BS's top-level statement scan?** Step 2 added the inside-`${...}` recognition; was that scan also wired to fire at top-level, or strictly nested? File:line for the entry point.
2. **What does BS currently emit for `<count> = 0` at top-level?** Probe with a minimal test file — does it produce a markup-tag node, an html-fragment, or fail entirely with E-CTX-003 (as Step 12 observed)?
3. **What's the §4.6 PA-001 disambiguation rule's reach?** That rule is for `<` Suppression Inside Brace-Delimited Contexts. Top-level is NOT brace-delimited. Confirm that PA-001 does NOT apply at top-level → top-level `<IDENT>` should be free for state-decl recognition without conflicting with PA-001.
4. **Does Step 11.0a's compound recognizer fire at top-level?** Probe with `<formRes>\n  <x> = ""\n</>` at top-level. May already work; verify.
5. **Are there existing tests asserting top-level html-fragment fall-through?** If so, those become regressions and need updating to assert `state-decl` post-fix.
6. **Self-host parity for top-level Shape 1?** Step 4-7 policy: defer.

**You are AUTHORIZED to correct the touchpoint** if survey reveals divergent locus.

Document findings in `$WORKTREE_ROOT/docs/changes/phase-a1a-step-11-0d-toplevel-shape-1/progress.md` BEFORE source edits.

---

## §4 Test plan

### §4.1 Update existing samples
- `samples/compilation-tests/test-002-with-logic.scrml` — restore: `@counter = 0` → `<counter> = 0`.
- `samples/compilation-tests/test-009-test-reactive.scrml` — restore: `@value = 42` → `<value> = 42`.
- `samples/compilation-tests/modern-003-full-app.scrml` — restore: `@users = []` → `<users> = []`; `@filter = "all"` → `<filter> = "all"`.

### §4.2 New positive cases
Add to `parse-shapes-v0next.test.js` (or new `parse-toplevel-shape1.test.js`):
- §S11D.1: top-level Shape 1 plain — `<count> = 0` outside any `${...}`.
- §S11D.2: top-level Shape 1 with init expression — `<items> = [1,2,3]`.
- §S11D.3: top-level Shape 2 (decl-with-spec) — `<email req email> = <input type="email"/>`.
- §S11D.4: top-level Shape 3 (derived) — `const <doubled> = @count * 2`.
- §S11D.5: top-level Variant C compound — `<formRes>\n  <name> = ""\n</>` at top-level.
- §S11D.6: top-level typed-decl — `<count>: number = 0`.
- §S11D.7: anti-html-fragment guard on every positive case.
- §S11D.8: invariant — top-level state-decl satisfies same shape↔isConst rules as inside-`${...}`.

### §4.3 No-regression check
After source rewire, full `bun run test` MUST pass with 0 regressions. Test count delta: ~6-10 new cases in §S11D + sample restorations.

---

## §5 Definition of done

1. ✅ BS top-level scan recognizes `<IDENT> [attrs] >` followed by `=` / `:` / `{` (or `</>` for compound) as state-decl pre-AST signal.
2. ✅ All 3 reverted Step 12 samples (`test-002-with-logic`, `test-009-test-reactive`, `modern-003-full-app`) restored to V5-strict canon and compile clean.
3. ✅ §S11D test block landed (~6-10 cases covering Shapes 1+2+3 + Variant C + typed-decl + anti-html-fragment guard + invariant).
4. ✅ Pre-commit + full `bun run test`: 0 fail, 44 skip (or fewer; surface count delta), 0 regressions on existing test count.
5. ✅ Branch clean. NO `--no-verify`.
6. ✅ progress.md updated with cumulative log + survey findings.
7. ✅ Self-host parity addressed per Step 4-7 policy (likely no-op).

---

## §6 Risk surface

- **PA-001 §4.6 collision.** PA-001 suppresses `<` inside brace-delimited contexts. Top-level is OUTSIDE braces, so PA-001 should not apply — but verify the BS implementation matches that. If PA-001 is currently firing at top-level by mistake, that's a separate fix.
- **Hidden HTML-fragment fallback.** BS may currently produce `kind: "markup"` for top-level `<count>` and let downstream pass it through as an html-fragment. Identifying these and reclassifying as state-decl needs care to preserve any legitimate top-level markup (which IS legal — `<div>...</>` at top-level is a markup expression).
- **Discrimination from top-level markup.** `<count> = 0` (state-decl) vs `<div>...</>` (top-level markup expression) — the discriminator is the `>` followed by `=` vs `>` followed by content. Step 11.0a's compound recognizer already does this distinguishing for inside-`${...}` compound; confirm same logic applies at top-level.
- **Component-def lookahead.** `< userBadge name(string) role(Role)>` (component-def, leading-space-disambiguated per §4.3) must NOT be misclassified as state-decl. Verify the SPACE inside `< userBadge` (vs no-space `<userBadge`) is preserved as the disambiguation hook.

---

## §7 Branch + commit hygiene

- Per-step branch: `phase-a1a-step-11-0d-toplevel-shape-1`, parented from main HEAD at dispatch time.
- WIP commits expected:
  - `WIP(a1a-step-11-0d): survey + locus-confirm`
  - `WIP(a1a-step-11-0d): BS top-level scan extension`
  - `WIP(a1a-step-11-0d): sample restorations + tests`
  - Final: `compile(a1a-step-11-0d): top-level structural Shape 1 recognition`

---

## §8 Tags

#phase-a1a #step-11-0d #p-fup-1 #toplevel-shape-1 #v5-strict #bs-extension #shape-1
