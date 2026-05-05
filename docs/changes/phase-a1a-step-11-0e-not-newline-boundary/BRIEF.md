# Phase A1a Step 11.0e — `<x> = not\n<y>` newline-as-separator boundary fix

**Status:** DRAFT — queued for dispatch after Step 11.0d (or in parallel with). Surfaced as P-FUP-2 by Step 12 dispatch (S61, 2026-05-05).
**Estimate:** 1-3h focused work. Narrow patch — likely a single-line or small extension at the locus where `not` is consumed.
**Authority:** Step 11.0b (S60) added newline-as-statement-separator at `collectExpr` ASI-NEWLINE branch (L1985-2030); the gap is that `not` (M11 — pinned-style modifier; SPEC §42) consumes the trailing newline that should be a statement separator.

---

## §1 What lands

The V5-strict structural form `<x> = not\n<y>` (where `not` is the meaning-marker for "no value" per SPEC §42 / Move 11) parses correctly with BOTH state-decl siblings preserved.

**Before Step 11.0e:**
- `<x> = not\n<y>` → parser stops scanning at `not`; `<y>` is dropped from the AST.
- Step 12 batch 2 caught this in 5 files via decl-count regression (`scripts/step12-validate-batch.mjs`).
- Pre-V5-strict form `@x = not\n@y` doesn't trigger (legacy expression-form decl path treats it differently).

**After Step 11.0e:**
- `<x> = not\n<y>` parses to two `state-decl` siblings: `state-decl{name:"x", initExpr:not}` followed by `state-decl{name:"y", ...}`.
- The 5 reverted Step 12 samples migrate to V5-strict canon cleanly.

---

## §2 Scope

### §2.1 In-scope
1. **Locate the `not` consumption locus.** Likely in `collectExpr` (ast-builder.js) or in expression parsing where `not` is recognized as a literal-value-meaning-marker. Determine whether `not` swallows the trailing newline or whether ASI-NEWLINE simply doesn't fire for `not`-initialized state-decls.
2. **Fix the boundary.** Two likely shapes:
   - Add `not` to the set of valid RHS-terminator-respecting forms in the ASI-NEWLINE branch.
   - OR adjust the `not` consumption to NOT eat the trailing newline.
3. **Restore the 5 reverted Step 12 samples** to V5-strict canon.
4. **Verify Step 11.0b's universal-fix property holds** — the fix should be in `collectExpr` ASI-NEWLINE if at all possible, not in a `not`-specific branch (Step 11.0b's strength was universality).
5. Update progress.md cumulative log.

### §2.2 Out-of-scope
- Changes to `not` semantics — this is purely a parse-boundary fix, not a meaning change.
- The legacy `@x = not\n@y` path — that already works (Step 4 mirror handles it differently); leave alone.
- Other M11-related work (`pinned`, etc. — already handled by Steps 6 and 7).

---

## §3 Survey-first mandate (depth-of-survey discount; **9× pattern likely applies**)

Step 12 surfaced this as P-FUP-2 mid-rewrite. Apply rigorously.

Survey questions:
1. **Where is `not` consumed?** Grep `compiler/src/ast-builder.js` and `compiler/src/expression-parser.ts` for `not` keyword / `kind: "not"` / "no-value" / similar. File:line.
2. **What does Step 11.0b's ASI-NEWLINE branch (L1985-2030) check?** Does it inspect the right-edge token for newline-respecting termination? `not` may be a literal-value form that ASI doesn't currently recognize.
3. **Does the `<x> = not\n<y>` case fail at BS, body-pre-parser, or ast-builder.js?** Probe with a minimal test: which stage drops `<y>`?
4. **Does the legacy `@x = not\n@y` form preserve both decls?** If yes (which Step 12's revert evidence suggests), what's different? The answer pinpoints the V5-strict-only gap.
5. **Self-host parity?** Defer per Step 4-7 policy.

**You are AUTHORIZED to correct the touchpoint** if survey reveals divergent locus.

Document findings in `$WORKTREE_ROOT/docs/changes/phase-a1a-step-11-0e-not-newline-boundary/progress.md` BEFORE source edits.

---

## §4 Test plan

### §4.1 Update existing samples
Restore the 5 reverted Step 12 samples to V5-strict canon:
- `samples/compilation-tests/combined-007-crud.scrml` (delta -6 decls reverted)
- `samples/compilation-tests/gauntlet-r10-go-contacts.scrml` (delta -8 decls reverted)
- `samples/compilation-tests/gauntlet-r10-odin-filebrowser.scrml` (delta -32 decls reverted)
- `samples/compilation-tests/gauntlet-r10-rails-blog.scrml` (delta -12 decls reverted)
- `samples/compilation-tests/integration-001-stripe-mini.scrml` (delta -11 decls reverted)

For each: convert `@x = not` style decls to `<x> = not` AND verify decl-count parity using `scripts/step12-validate-batch.mjs` (or equivalent) post-edit.

### §4.2 New positive cases
Add to `parse-shapes-v0next.test.js` (or `collectexpr-newline-boundary.test.js` — Step 11.0b's home):
- §S11E.1: `<x> = not\n<y> = 0` — both siblings preserved.
- §S11E.2: `<x> = not\n@y = 0` — V5-strict + legacy mix.
- §S11E.3: `<x> = not` followed by markup (`<x> = not\n<div>...`) — unambiguous next decl after `not` then a markup-only line.
- §S11E.4: `<x> = not\nconst <y> = expr` — `not` + derived sibling.
- §S11E.5: `<x> = not\n<formRes>\n  <a> = 0\n</>` — `not` + Variant C compound sibling (Step 11.0a interaction).
- §S11E.6: anti-html-fragment guard.
- §S11E.7: regression — legacy `@x = not\n@y = 0` STILL parses (don't break the legacy path).

### §4.3 No-regression check
After source rewire, full `bun run test` MUST pass with 0 regressions. Test count delta: ~5-8 new cases in §S11E + sample restorations (no test count change from sample restorations — they don't add tests).

---

## §5 Definition of done

1. ✅ Locus identified + minimal patch applied.
2. ✅ All 5 reverted Step 12 samples restored to V5-strict canon and compile clean with correct decl-count.
3. ✅ §S11E test block landed (~5-8 cases covering all interactions).
4. ✅ Legacy `@x = not\n@y` form regression test passes (don't break legacy path).
5. ✅ Pre-commit + full `bun run test`: 0 fail, 44 skip (or fewer), 0 regressions.
6. ✅ Branch clean. NO `--no-verify`.
7. ✅ progress.md updated with cumulative log + survey findings.

---

## §6 Risk surface

- **Step 11.0b interaction.** The fix should preserve Step 11.0b's universal-fix property (newline-as-separator at `collectExpr` ASI-NEWLINE fires for ALL ASI gaps). If the `not` fix needs a `not`-specific branch, that's a regression of universality — surface in progress.md.
- **Legacy path preservation.** `@x = not\n@y` MUST continue to parse correctly post-fix. Legacy path uses different code; the fix should not affect it. Regression test §S11E.7 enforces.
- **Subtle keyword/identifier ambiguity.** `not` is both a keyword (M11 modifier per SPEC §42) AND can appear in expression position (`not @x`-style? — verify). If the ambiguity affects parse, the fix must distinguish.
- **Other modifier keywords with same shape.** Check whether `pinned`, other M11-family modifiers have similar boundary issues. May be a wider class of bug. Surface in progress.md if found.

---

## §7 Branch + commit hygiene

- Per-step branch: `phase-a1a-step-11-0e-not-newline-boundary`, parented from main HEAD at dispatch time.
- WIP commits expected:
  - `WIP(a1a-step-11-0e): survey + locus-confirm`
  - `WIP(a1a-step-11-0e): newline-boundary patch`
  - `WIP(a1a-step-11-0e): sample restorations + tests`
  - Final: `compile(a1a-step-11-0e): <x> = not newline-as-separator boundary fix`

---

## §8 Tags

#phase-a1a #step-11-0e #p-fup-2 #not-keyword #newline-as-separator #step-11-0b-extension #v5-strict
