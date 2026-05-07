# A1b B13 — Survey note (pre-implementation)

**Date:** 2026-05-07
**Session:** S68
**Worktree:** `agent-ad053017066bcb9de` (branched from `a4eed93` = S67 close)
**Audit primary:** `docs/audits/a1b-b13-rule4-audit-2026-05-07.md`

## §1 Phase-0 survey items (per audit §2 point 9)

### §1.1 §34 catalog has E-DERIVED-WITH-VALIDATORS (✓)

`compiler/SPEC.md:14237` — row already present:
> `E-DERIVED-WITH-VALIDATORS | §55.14 | Validators applied to a derived cell (`const <x ...>`). Derived cells are read-only; validators imply gating which is incoherent on a computed value. Use a refinement type instead.`

§55.14 line 24691 also lists `E-DERIVED-WITH-VALIDATORS` as the canonical name. **No new row needed for the rejection error.**

### §1.2 §34 catalog row for "dynamic inline override" (✗ — must add)

Searched SPEC for `INLINE-DYNAMIC`, `MESSAGE-DYNAMIC`, `VALIDATOR-MESSAGE`, `inline.*dynamic`. **Zero hits.** The audit §1.4 flagged this as a Phase-0 survey item — recommend B13 add a new row:

- **Code:** `E-VALIDATOR-INLINE-DYNAMIC` (per audit §1.4 recommendation; consistent with `E-VALIDATOR-CIRCULAR-DEP` naming pattern at §34 line 14236).
- **Section:** §55.10
- **Severity:** Error
- **Message:** "The inline message override on `\`<predicate>\`` must be a static string literal (SPEC §55.10 / L12 Edge F — no expression interpolation; messages are statically extractable for i18n tooling)."

This new row is added to §34 catalog as part of B13. Spec-prose follow-up only — no separate dispatch.

### §1.3 §55.14 "parse-time" timing wording (recommend small footnote)

`compiler/SPEC.md:24691`: "The compiler emits `E-DERIVED-WITH-VALIDATORS` (§34) at parse-time."

Operationally imprecise — A1b is the firing point (post-shape-discrimination). Audit recommends footnote-style amendment per §6.6.8 / §6.6.10 precedent. **Drafted** in §3 below; PA decides whether to land in this dispatch or queue separately.

### §1.4 B14 sequencing for engine-derived case

**Current state:** This worktree branched from S67-close; B14 has not been dispatched. Engine-derived cells (`<engine for=Phase derived=expr>` with validators) require an engine-decl annotation that does not exist today.

**Disposition:** Defer the engine-derived case to a B13.5 / B14 follow-up. The B13 walker's predicate is `decl.kind === "state-decl" && decl.isConst === true && decl.validators?.length > 0` — engine-decls do not match this shape, so they pass through silently. When B14 introduces engine annotations, a sibling check can be added to fire the same error.

### §1.5 Per-arg-split status

**Critical finding:** B9 today produces joined-raw single-element arrays for multi-arg forms. `length(>=2, "too short")` arrives as `args: [<RelationalPredicateNode op=">=" value=2>]` because B9's `parseRelationalPredicate` peels the leading op and parses the rest (`2 , "too short"`) as one ExprNode (becomes a SequenceExpression escape-hatch).

**Implication:** B13 cannot extract the inline-override from a single joined arg without first splitting at top-level commas. The B10 audit deferred this; B13 owns it (per audit §1.4 + §3).

**Approach chosen:** Extend `compiler/src/ast-builder.js:scanStructuralDeclLookahead` to emit per-arg raw-text strings (split at top-level commas) instead of one joined string. B9's `decorateValidatorsWithExprNodes` already loops over `v.args as string[]`; making each element a separate raw string flows naturally into the existing parse loop.

This activates B10's already-wired `args.length > 2` and trailing-arg-shape branches (per `validator-type-check.test.js:172` + `:196` skipped tests — those become passing once split lands).

### §1.6 Trigger predicate for E-DERIVED-WITH-VALIDATORS

Per audit §1.1 + §1.5 + §1.6, the walker condition is:

```
node.kind === "state-decl"
  && node.isConst === true
  && Array.isArray(node.validators)
  && node.validators.length > 0
```

This catches both Shape-3 (`const <x req> = expr`) and bareword/call-form variants. Engine-decls are skipped because they are not `state-decl` kind today.

## §2 Implementation plan

1. **Phase A — Per-arg split** in `ast-builder.js:scanStructuralDeclLookahead` (call-form validator branch). Split on top-level commas; preserve current single-arg behavior when no commas are present.
2. **Phase B — E-VALIDATOR-INLINE-DYNAMIC catalog** in `compiler/src/validator-catalog.ts` — no change, already declares `inline-message-override` slot. Walker fires the new error code.
3. **Phase C — B13 walker (PASS 8 in this worktree)** in `compiler/src/symbol-table.ts`:
   - For each `state-decl` with `isConst:true` AND non-empty validators → fire `E-DERIVED-WITH-VALIDATORS` (skip rest of validator processing).
   - Else for each validator: extract `inlineOverride: string | null` (from trailing string-literal arg, if catalog says slot is `inline-message-override` and present).
   - If trailing inline-override slot present but arg is non-string-literal → fire `E-VALIDATOR-INLINE-DYNAMIC`.
4. **Phase D — Validator-record extension** — add `inlineOverride?: string | null` to `ValidatorEntry` in `compiler/src/types/ast.ts`. Field is set by B13 walker (annotation-style).
5. **Phase E — §34 catalog row + §55.14 timing footnote** in `compiler/SPEC.md`.
6. **Phase F — Tests** — new file `compiler/tests/unit/derived-with-validators.test.js` covering:
   - Shape-3 with bareword validator: `const <x req> = @count` → fires.
   - Shape-3 with call-form validator: `const <x min(0)> = @y` → fires.
   - Shape-2 (non-const) with validators: no fire.
   - Engine cell pass-through: no fire (engine cells not yet annotated; check predicate skips).
   - Refinement-type alternative in error message text.
   - Activate B10's previously-skipped tests (`length(>=2, "too short")` accepts; `min(18, @minAge)` fires E-VALIDATOR-INLINE-DYNAMIC).
   - Multi-validator on derived cell: single E-DERIVED-WITH-VALIDATORS, not per-validator (or: one per validator, tbd).
7. **Phase G — Primer §13.7 row + B13 specifics block** — drafted at REPORTING time, PA lands on main.

## §3 Spec-prose follow-up draft (§55.14 timing footnote)

Drafted (per audit §1.1):

> **Footnote A (added S68 audit clarification):** The "parse-time" wording above is operational shorthand. The compiler enforces this via the A1b resolve-type stage (specifically, the validator-walking pass after shape-discrimination has set `decl.isConst`). The intent is "compile-time, before code generation"; the precise stage is A1b. Parallel to the §6.6.8 / §6.6.10 footnote convention.

PA disposition: include in B13 commit OR defer to a separate spec-prose commit.

## §4 Sequencing locked

Per audit §1.8 — B13 strictly after B10 (catalog) ✓, B9 (ExprNode args) ✓, B5 (cellKind) ✓. Independent of B11/B12 (B11 has not landed in this worktree; PA file-delta merge on land).
