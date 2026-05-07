---
title: A1b B18-B22 (cross-cutting wave 5) — Rule 4 spec-faithfulness audit
date: 2026-05-07
session: S67
authority: PA-direct read of `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 rows B18-B22 against `compiler/SPEC.md` §5.2.3, §38, §14.10, §53, §6.8, §34. Driver: pa.md Rule 4. Cross-references B7 (dep-graph) audit.
status: AUDIT — bundles 5 cross-cutting audits in one doc; each step small and self-contained
---

# A1b Wave 5 (B18-B22) — Rule 4 audit (pre-dispatch, bundled)

## §0 Bundling rationale

Wave 5 contains 5 small cross-cutting steps (B18-B22), each 1-6h estimate, with mostly independent spec authorities and modest finding surfaces. Bundling into a single audit doc is more efficient than 5 separate files; each step gets its own §X subsection with the full audit shape (findings + brief additions + cost).

**Wave 5 is the A1b closer.** After B22, A1b (resolve+type) is functionally complete.

---

## §1 B18 — Multi-statement event handler (L19, E-MULTI-STATEMENT-HANDLER)

**SCOPE row:** "L19 — Multi-statement event handler (E-MULTI-STATEMENT-HANDLER) — bare-form attr value: bare-call OR bare-assignment OR bare-single-expression. Anything with `;` outside expression-internal: error" (est 2-3h, locks L19).

**SPEC §5.2.3 (line 1140):**
> "Multi-statement intent (two or more semicolon-separated expressions, or a block) SHALL force a named function. The compiler emits `E-MULTI-STATEMENT-HANDLER` when a bare-form handler attribute value contains a `;` outside of expression-internal contexts (e.g., string literals, nested function bodies)."

**§4.14 (`:`-shorthand body)** — same constraint per primer §9.6 D4 line "Multi-statement handler restriction".

### §1.1 Findings

**[SPOT-CHECK PASS] Three legal bare-form shapes:**
- bare call: `onclick=startGame()`
- bare assignment: `onclick=@count = @count + 1`
- bare single-expression: `onclick=@phase = .Loading`

Anything with `;` outside expression-internal contexts → fire E-MULTI-STATEMENT-HANDLER with "use a named function" suggestion.

**[BOUNDARY] Expression-internal `;`:**
- String literals: `onclick=log("hi; bye")` — `;` inside string is fine.
- Nested function body: `onclick=arr.forEach(x => { x.a; x.b })` — `;` inside arrow body is fine.
- Spec is unambiguous on these per §5.2.3 wording.

**[REUSABILITY] Walker location:** B18 walks every event-handler attribute on every markup element AND every `:`-shorthand body. Could ride existing markup-attribute walker. Phase-0 survey item.

### §1.2 B18 brief additions

1. Three legal forms enumerated; anything else fires E-MULTI-STATEMENT-HANDLER.
2. Expression-internal `;` exception (string literals + nested function bodies).
3. Survey: locate the existing markup-attribute walker; extend rather than build new.

### §1.3 Cost

SCOPE 2-3h → realistic 2-3h. Small.

---

## §2 B19 — Channels file-level + `@shared` removal (E-CHANNEL-INSIDE-PROGRAM, E-CHANNEL-SHARED-MODIFIER)

**SCOPE row:** "Channels (§38) — E-CHANNEL-INSIDE-PROGRAM + E-CHANNEL-SHARED-MODIFIER — channels at file-level only; `@shared` modifier rejected" (est 2-3h).

**SPEC §38.1, §38.4** + §34 catalog rows confirm both errors.

### §2.1 Findings

**[SPOT-CHECK PASS] Two errors enumerated:**
- E-CHANNEL-INSIDE-PROGRAM (§38.1, §34): `<channel>` element appears as descendant of `<program>` instead of file-level sibling. M19 lock.
- E-CHANNEL-SHARED-MODIFIER (§38.4, §34): `@shared` modifier in source. Removed in v0.next per M19; auto-sync comes from channel-body placement.

**[BOUNDARY] V5-strict access inside channel body:** channel-declared cells use V5-strict (`<x> = init`) per §38.4. Access from `<program>` via canonical `@cellName`. B19 doesn't need to validate access (B3 already resolves `@`-prefix); B19 just owns the placement + modifier rejection.

### §2.2 B19 brief additions

1. Walk markup tree for `<channel>` elements; if any ancestor is `<program>`, fire E-CHANNEL-INSIDE-PROGRAM.
2. Walk channel bodies for `@shared` modifier; fire E-CHANNEL-SHARED-MODIFIER.
3. Survey: existing channel-handling code may already enforce one or both — extend, don't duplicate.

### §2.3 Cost

SCOPE 2-3h → realistic 2-3h. Small.

---

## §3 B20 — Bare-variant inference (M9, §14.10, E-VARIANT-AMBIGUOUS)

**SCOPE row:** "Bare-variant inference (§14.10, M9) — when LHS or param type statically known, accept `.Variant` without qualification; union-typed contexts force qualification" (est 3-4h).

**SPEC §14.10 line 7164-7178:** comprehensive normative list.

### §3.1 Findings

**[SPOT-CHECK PASS] Six inference positions enumerated** per §14.10 line 7167:
1. LHS type annotation: `<x>: T = .V`
2. Previously-declared cell with known type: `@cell = .V` where `@cell: T`
3. Function parameter type: `fn(.V)` where param typed `T`
4. Function return type: `return .V` where return typed `T`
5. Match on-expression type: `<match for=T> | .V => ...`
6. Engine `for=T` qualifier: `<engine for=T initial=.V>`

**[BOUNDARY] E-VARIANT-AMBIGUOUS fires:**
- Position type is union with multiple enums sharing `.V`: ambiguous.
- No type context at all: `let x = .Small` with no annotation.
- Cross-ref §18.0.3 for match-arm pattern integration.

**[REUSABILITY — S66 PARSER FIX PRECONDITION] Bare-dot variants parseable everywhere** per primer §13.8 + S66 commit `cb167b1`. B20's typer rides the parser fix; doesn't re-implement.

**[INTEGRATION] Type inference today:** type-system.ts has substantial machinery (~9000 lines). B20 extends type inference to recognize `.Variant` form when type is statically known. Phase-0 survey: locate the current type-inference entry points + how they propagate type context downward to expression positions.

### §3.2 B20 brief additions

1. Six inference positions per §14.10 line 7167; enumerate in test fixtures.
2. E-VARIANT-AMBIGUOUS fire conditions (union with shared variants + no type context).
3. Reuse S66 parser fix (bare-dot parseable as primary expression); don't re-parse.
4. Survey: type-system.ts type-inference entry points + downward type-context propagation.

### §3.3 Cost

SCOPE 3-4h → realistic 3-5h. Type-inference integration is the variable cost.

---

## §4 B21 — Refinement-type predicates (§53) basic three-zone

**SCOPE row:** "Refinement-type predicates (§53) basic three-zone — static-zone literal-conformance check; boundary-zone runtime hook recorded; trusted-zone elision marker" (est 4-6h).

**SPEC §53** (large; refinement type subsystem).

### §4.1 Findings

**[SUBSTANTIVE — REUSABILITY] B21 consumes B10's catalog** (per B10 audit §1.1: "the predicate-type-signature catalog SHOULD be a single source of truth, exported as a module, consumed by ... B21 (refinement-type predicates basic three-zone)").

**[SUBSTANTIVE — EXISTING INFRA] type-system.ts has refinement-type predicate machinery already** — `parsePredicateExpr` (line 718), `evaluatePredicateOnLiteral` (line 909), `formatPredicateExpr` (line 1405), `checkPredicateLiteral` (line 1431), `predicateImplies` (line 1585), `classifyPredicateZone` (line 1629).

The `classifyPredicateZone` function suggests three-zone classification is partially or fully implemented. **Phase-0 survey item:** what's the current state of three-zone classification — is B21 net-new or extension?

**[BOUNDARY] B21 records, A1c emits.** Static-zone literal-conformance check is B21 (compile-time); boundary-zone runtime hook is RECORDED in B21 + emitted in A1c codegen; trusted-zone elision marker is RECORDED in B21 + consumed in A1c codegen.

**[INTEGRATION] Three-zone framing per §53:** static / boundary / trusted are the three contexts where refinement predicates fire (or don't):
- Static: compile-time provable, no runtime check.
- Boundary: runtime check at function entry, deserialization, etc.
- Trusted: elided (caller asserts compliance).

### §4.2 B21 brief additions

1. **Consume B10's catalog** for predicate signatures + cell-type compatibility. No duplicate catalog.
2. **Survey existing infra** — `parsePredicateExpr` + `classifyPredicateZone` are already present; B21 may be a substantial extension or a tightening, not net-new.
3. **Record three-zone classification on each refinement predicate** — annotation consumed by A1c codegen.
4. **B21 fires at compile-time** for static-zone violations (literal cannot satisfy predicate). Boundary + trusted are codegen-time concerns.

### §4.3 Cost

SCOPE 4-6h → realistic **3-6h** with depth-of-survey-discount potential (existing infra may be more substantial than expected).

---

## §5 B22 — `reset(@cell)` target shape validation (E-RESET-INVALID-TARGET)

**SCOPE row:** "reset(@cell) target shape validation — Step 9's permissive parser accepts any ExprNode; A1b rejects non-canonical (must be `@cell` or `@compound.field`)" (est 1-2h).

**SPEC §6.8** + §34 (E-RESET-NO-ARG already exists for the no-arg case; B22's target-shape error needs naming).

### §5.1 Findings

**[SPOT-CHECK PASS] Three valid target shapes:**
- `reset(@cell)` — bare cell.
- `reset(@compound.field)` — compound-nav (one level).
- (Multi-level compound-nav like `reset(@compound.subCompound.field)` — Phase-0 survey verifies legality; spec ambiguous.)

**[REUSABILITY — B3 INTEGRATION] B3 resolves `@cell` references already** (per primer §13.7 B3 specifics). B22 reads B3's `_resolvedStateCell` annotation on the target ExprNode; if NOT a state-cell IdentExpr or compound-nav MemberExpr → fire E-RESET-INVALID-TARGET (or canonical name per §34 — Phase-0 survey).

**[BOUNDARY] B22 vs A1a Step 9:** Step 9 (parser) was permissive; B22 (typer) tightens. Closes the deferred validation per SCOPE row "Step 9's permissive parser accepts any ExprNode; A1b rejects non-canonical".

**[INTEGRATION] B22 + B11 + B12 + reset's synth-side-effects** — per §55.13, reset has synthesized-property side-effects (clears `errors`, `touched`, `submitted`). That's runtime A1c; B22 just validates the target shape.

### §5.2 B22 brief additions

1. Walker over every `reset(target)` call in source (including `.reset` method-style if applicable).
2. Validate target ExprNode shape: must be IdentExpr with `@`-prefix OR MemberExpr with `@`-prefix root.
3. Verify B3 resolved the target to a `StateCellRecord` (or via `lookupQualifiedStateCell` for compound-nav leaves).
4. Fire E-RESET-INVALID-TARGET (canonical name TBD; Phase-0 survey).
5. Multi-level compound-nav: spec ambiguous; survey verifies (likely legal — compound-nav is recursive).

### §5.3 Cost

SCOPE 1-2h → realistic 1-2h. Smallest step in A1b.

---

## §6 Wave 5 summary + dispatch sequencing

**Wave 5 audit roster: B18 ✅ B19 ✅ B20 ✅ B21 ✅ B22 ✅** (all in this doc).

**Dispatch sequencing:**
- B18, B19, B22: independent; can run in parallel with each other and with Wave 3/4 once their dependencies clear.
- B20: depends on type-system.ts inference machinery; sequential after type-context-propagation infra is confirmed.
- B21: consumes B10 catalog; sequential after B10 lands.

**Smallest steps in A1b:** B22 (1-2h), B18 (2-3h), B19 (2-3h). Could be a single bundled small-dispatches wave.

**Largest residual step:** B21 (3-6h). Depth-of-survey-discount may apply heavily.

**Wave 5 cumulative estimate:** 11-18h (was 10-15h SCOPE; modest expansion across the 5 steps).

**A1b closer:** after Wave 5, A1b (resolve+type) is functionally complete. A1c (codegen+runtime) is next.

---

## §7 Tags

#a1b-b18 #a1b-b19 #a1b-b20 #a1b-b21 #a1b-b22 #wave-5 #rule-4-audit #bundled-audit #cross-cutting #l19-multi-statement-handler #channel-file-level #m9-bare-variant-inference #refinement-type-three-zone #reset-target-shape #b10-catalog-consumer #b3-cross-field-resolution-consumer #s67
