# Phase A1a Step 11.5 — Fold `reactive-derived-decl` into `state-decl`

**Status:** DRAFT — queued for dispatch AFTER Step 11 lands, BEFORE Step 12. Per ADR ratification S60 (`docs/changes/reactive-derived-decl-divergence/ADR.md` Option A).
**Estimate:** 3-5 h focused work. Multi-file (single subsystem boundary at the parser; sweep at consumer sites).
**Authority:** ADR ratified 2026-05-05 user verbatim "ratify the ADR — Option A"; SPEC §6.6 (derived as a state-decl shape per the conceptual model). AST contract: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` §1.1.

---

## §1 What lands

The legacy expression-form `const @doubled = @count * 2` (inside `${...}` blocks) currently produces an AST node of kind `reactive-derived-decl`. Step 11.5 retires that kind: the parser path is rewired to produce `state-decl` with `shape: "derived"`, `isConst: true`, `structuralForm: false`, and `initExpr` populated.

**Before Step 11.5:**

| Source form | AST kind |
|---|---|
| `<count> = 0` | `state-decl` (shape:"plain", structuralForm:true) |
| `const <doubled> = @count * 2` | `state-decl` (shape:"derived", isConst:true, structuralForm:true) |
| `@count = 0` (legacy expression-form, `${...}`) | `state-decl` (shape:"plain", structuralForm:false) [Step 4 mirrored] |
| `const @doubled = @count * 2` (legacy expression-form, `${...}`) | **`reactive-derived-decl`** [the divergence] |

**After Step 11.5:** the fourth row collapses to `state-decl` (shape:"derived", isConst:true, structuralForm:false). The `reactive-derived-decl` kind is retired (deleted from the AST kind enum).

---

## §2 Scope

### §2.1 In-scope
1. **Parser rewire.** Locate the parser path that produces `reactive-derived-decl` (likely a sibling case alongside the `@NAME = init` parser; survey will confirm). Rewire to construct `state-decl` with the discriminants set per Step 4's contract.
2. **Consumer-site sweep.** Grep `reactive-derived-decl` literal across the entire compiler source. Each consumer either:
   - Switches to `kind === "state-decl" && shape === "derived"` (the discriminator change), OR
   - Was a legacy compat path that's no longer needed and is deleted.
3. **AST kind enum cleanup.** Remove `"reactive-derived-decl"` from `compiler/src/types/ast.ts` kind union.
4. **Tests asserting old kind.** Mass-update tests asserting `kind === "reactive-derived-decl"` to assert `kind === "state-decl"` AND the proper shape/isConst discriminants. Step 4's §S4.5 test (which DOCUMENTED the divergence) gets updated to assert the unified kind, OR removed if it no longer adds coverage beyond §S4.6.
5. **Self-host parity.** If `compiler/self-host/ast.scrml` references the old kind, mirror. (Step 4 found 4 mirror sites; Step 11.5's overlap is unknown — survey.)
6. Update progress.md cumulative log.

### §2.2 Out-of-scope
- L21 firing — A1b. Step 11.5 makes A1b's walker simpler (one path), but does NOT fire the lock.
- Codegen behavior change — A1c. Step 11.5 is shape-renaming only; the JavaScript output should be byte-identical for `const @x = expr` forms post-fold (verify via existing codegen tests; if NOT byte-identical, that's a regression and surfaces a hidden coupling — investigate).

---

## §3 Survey-first mandate (depth-of-survey discount; **6× confirmed**)

Steps 6 + 7 each surfaced unexpected design constraints via survey (Step 6: KEYWORD-vs-IDENT for `default`; Step 7: regex-driven-vs-token-walker for import parser). Apply rigorously.

Survey questions:
1. **Where is `reactive-derived-decl` constructed?** Grep in `compiler/src/`. Document file:line for every construction site.
2. **Where is `reactive-derived-decl` consumed?** Grep across the entire compiler source. Document each consumer with one-line description (resolver-walker, codegen-emitter, validator, etc.).
3. **What's the shape difference between `reactive-derived-decl` and the new `state-decl{shape:"derived",isConst:true,structuralForm:false}`?** Field-by-field comparison. Step 4's mirror at `state-decl{shape:"derived",structuralForm:false}` likely already exists for the legacy `@x = init` form — verify, then check whether Step 4 explicitly avoided wiring `isConst:true` on the `const @x` path (which would have been the original divergence).
4. **What does Step 4's §S4.5 test actually assert?** Update plan should match its current shape.
5. **Are there codegen tests asserting byte-output for `const @x` forms?** If so, run them mentally before edits — fold should preserve byte-output.
6. **Self-host parity:** does `compiler/self-host/ast.scrml` reference `reactive-derived-decl`? Steps 4-7 mostly skipped self-host parity at this phase; confirm that policy applies to Step 11.5.

**You are AUTHORIZED to correct the touchpoint** if survey reveals divergent locus.

Document findings in `$WORKTREE_ROOT/docs/changes/phase-a1a-step-11-5-fold-derived/progress.md` BEFORE source edits.

---

## §4 Test plan

### §4.1 Update existing tests
- `compiler/tests/integration/parse-shapes-v0next.test.js` §S4.5 — currently documents the divergence by asserting `kind === "reactive-derived-decl"` for `const @doubled = @count * 2`. Update to assert `kind === "state-decl"`, `shape === "derived"`, `isConst === true`, `structuralForm === false`.
- Any other tests asserting the old kind — sweep + update.

### §4.2 New invariant tests
Add to `parse-shapes-v0next.test.js` (or a new file `parse-fold-derived.test.js`):
- §F11.5.1: `const @doubled = @count * 2` (legacy expression-form, `${...}`) — assert `state-decl`, shape derived, isConst true, structuralForm false.
- §F11.5.2: `const <doubled> = @count * 2` (V5-strict structural derived, Step 4 baseline) — assert `state-decl`, shape derived, isConst true, structuralForm true. Regression baseline; should already pass.
- §F11.5.3: Mixed file with both forms — both produce the unified kind; differ only on `structuralForm`.
- §F11.5.4: Anti-html-fragment guard on every positive case.
- §F11.5.5: Invariant battery — for both legacy and structural derived forms, assert every state-decl satisfies the shape↔isConst rule (`shape:"derived"` ⇒ `isConst:true`).

### §4.3 No-regression check
After source rewire, full `bun run test` MUST pass with 0 regressions. The Step 12 long-tail cleanup is separate; Step 11.5 does NOT delete legacy tests, only updates the kind assertions.

Aim: ~5-8 new cases + ~2-5 updated existing cases.

---

## §5 Definition of done

1. ✅ Parser path producing `reactive-derived-decl` rewired to produce `state-decl` with correct discriminants.
2. ✅ All consumer sites swept; `reactive-derived-decl` literal does NOT appear in `compiler/src/` (verify via `grep -r reactive-derived-decl compiler/src/` returning empty).
3. ✅ `compiler/src/types/ast.ts` kind enum no longer includes `"reactive-derived-decl"`.
4. ✅ Test sweep complete; no test asserts the retired kind.
5. ✅ Self-host parity: addressed per Step 4-7 policy (likely no-op; confirm in progress.md).
6. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip, 0 regressions on existing test count. Delta within ±5 from §4 plan (some old tests merged, some new tests added).
7. ✅ Codegen byte-output for `const @x = expr` forms unchanged (verify via any existing codegen-byte-test, or quickly emit + diff).
8. ✅ Branch clean. NO `--no-verify`.
9. ✅ progress.md updated with cumulative log + survey findings + per-consumer-site dispositions.

---

## §6 Risk surface

- **Hidden coupling.** A consumer site might be doing something subtly different on `reactive-derived-decl` vs `state-decl` (e.g., dependency wiring, codegen ordering). Sweep MUST verify per-site behavior, not just kind matching.
- **Test count drift.** If §S4.5 is merged into §S4.6, count goes down by 1 (then up by 5-8 from new cases — net positive).
- **Codegen byte-shift.** If codegen distinguishes the kinds today (e.g., different runtime helper), fold may shift byte output. Surface in progress.md if detected — may require a second WIP commit to align codegen, OR document deferral to A1c.

---

## §7 Branch + commit hygiene

- Per-step branch: `phase-a1a-step-11-5-fold-derived`, parented from main HEAD at dispatch time (post-Step-11).
- WIP commits expected:
  - `WIP(a1a-step-11-5): survey + consumer-site inventory`
  - `WIP(a1a-step-11-5): parser rewire`
  - `WIP(a1a-step-11-5): consumer-site sweep`
  - `WIP(a1a-step-11-5): types update + kind-enum cleanup`
  - `WIP(a1a-step-11-5): test updates + new cases`
  - Final: `compile(a1a-step-11-5): fold reactive-derived-decl into state-decl`

---

## §8 Tags

#phase-a1a #step-11-5 #fold-derived #adr-option-a #L21-substrate #ast-kind-cleanup
