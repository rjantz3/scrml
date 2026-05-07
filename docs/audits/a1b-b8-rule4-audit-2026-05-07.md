---
title: A1b B8 (L21 walker — E-DERIVED-VALUE-MUTATE + E-SYNTHESIZED-WRITE) — Rule 4 spec-faithfulness audit
date: 2026-05-07
session: S66
authority: PA-direct read of `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.2 B8 row against `compiler/SPEC.md` §6.6.18, §55.7, §6.11, §34. Driver: pa.md Rule 4.
status: AUDIT PASS — no substantive drift; one design-constraint note for the dispatch brief
---

# A1b B8 — Rule 4 audit (pre-dispatch)

## §0 Scope

B8 = "L21 walker — E-DERIVED-VALUE-MUTATE + E-SYNTHESIZED-WRITE — walks ExprNode trees; for each MemberCall/MemberAssignment/UnaryDelete with derived-cell or synthesized-cell as root, fire" (SCOPE §4.2 row B8, est 4-6h, locks L21).

This audit reads SPEC §6.6.18 (E-DERIVED-VALUE-MUTATE / L21), §55.7 (synthesized-property write rule), §6.11 (forward stub for synthesized validity surface), §34 catalog rows for both error codes.

## §1 Findings

### §1.1 [SPOT-CHECK PASS] AST shape coverage matches spec

**SCOPE row:** "MemberCall/MemberAssignment/UnaryDelete with derived-cell or synthesized-cell as root"

**SPEC §6.6.18 (line ~3037 normative statements area):**
> "The check SHALL run during the same pass that checks E-DERIVED-WRITE (§6.6.8). The AST nodes that participate are `MemberCall` (for case 1) and `MemberAssignment` / `UnaryDelete` (for cases 2-3) whose receiver chain begins at a `const <name>` cell reference."

**Match.** The three AST shapes named in SCOPE row (`MemberCall`, `MemberAssignment`, `UnaryDelete`) are exactly what §6.6.18 specifies. Receiver-chain root resolution is the load-bearing test.

### §1.2 [SPOT-CHECK PASS] E-DERIVED-VALUE-MUTATE forms covered

**§6.6.18 enumerates 3 forbidden form classes:**

1. **Array mutating methods:** `push`, `pop`, `shift`, `unshift`, `splice`, `reverse`, `sort`, `fill`, `copyWithin` (per §6.5.1) — receiver = derived cell. → MemberCall AST shape.
2. **Object property writes:** `@derivedObj.foo = x`, all compound-assignment forms (`+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `&=`, `|=`, `^=`, `<<=`, `>>=`, `>>>=`, `??=`, `||=`, `&&=`), `delete @derivedObj.foo`. → MemberAssignment + UnaryDelete AST shapes.
3. **In-compound derived sub-cell:** `@form.derivedField.method(...)`, `@form.derivedField.foo = x`. → Same AST shapes; receiver chain extends through compound parent.

**B8 implementation guidance:** for case 1, walker maintains a list of mutating method names from §6.5.1 (the 9 methods). For case 2, walker fires on ANY property write/compound-assignment/delete with derived root. Exhaustive list in §6.6.18 normative statements.

### §1.3 [SPOT-CHECK PASS] E-SYNTHESIZED-WRITE coverage

**SPEC §55.7 (line 24449+):** lists 4 synthesized properties: `isValid`, `errors`, `touched`, `submitted` (compound + per-field scope). All read-only. Writing to any → E-SYNTHESIZED-WRITE.

**SPEC §6.11 (line 4974+):** forward stub explicitly enumerates the per-field synthesized properties (`@x.field.isValid`, `@x.field.error`, `@x.field.touched`).

**B8 implementation guidance:** walker fires E-SYNTHESIZED-WRITE on any property write/compound-assignment/delete where the property name is one of the 4 synthesized names AND the receiver chain root is a compound-parent cell with a registered synthesized validity surface.

**Soft dependency on B11/B12:** the synthesized-property registry is built by B11 (compound rollup) and B12 (per-field). B8 needs to query that registry to know which receivers are synth-bearing. Either (a) B8 lands BEFORE B11/B12 with a forward-extending hook, OR (b) B8 implements registry-querying logic that gracefully degrades to no-fire if registry hasn't been populated yet.

**Per SCOPE §4.6 step-to-error-code mapping (line 233):** B8 fires E-DERIVED-VALUE-MUTATE + E-SYNTHESIZED-WRITE; B11 fires nothing (synthesizes cells; "powers B8" per row note line 198). This implies the intended order is **B11 BEFORE B8** so the synth registry exists when B8 runs.

But the SCOPE §4.5 wave assignment (line 218 area) puts B8 in Wave 1 (B5-B8) and B11 in Wave 3 (B9-B13). That's a contradiction — B8 in Wave 1 cannot consume B11 from Wave 3.

**Resolution paths:**
- (a) B8 ships in Wave 1 covering ONLY E-DERIVED-VALUE-MUTATE; E-SYNTHESIZED-WRITE deferred to a B11.5 dispatch (or folded into B11 itself).
- (b) B8 ships in Wave 1 with a placeholder synth-cell registry (empty until B11/B12 populate); B11/B12 wire the registration; future test surface verifies E-SYNTHESIZED-WRITE fires once registry is populated.
- (c) B8 splits into B8a (E-DERIVED-VALUE-MUTATE, Wave 1) + B8b (E-SYNTHESIZED-WRITE, after B11/B12).

**PA recommendation: Path (a)** — cleanest. B8 ships derived-value-mutate only; E-SYNTHESIZED-WRITE folds into B11 (where the synth registry is born) OR a dedicated small B-step. Surface to dispatch brief as a Phase-0 STOP-trigger candidate (B8 dispatch should verify whether B11 is in place; if not, scope to E-DERIVED-VALUE-MUTATE only).

### §1.4 [SPOT-CHECK PASS] Sibling error distinctions

**§6.6.18 explicitly distinguishes B8's two errors from siblings:**
- **E-DERIVED-WRITE** (§6.6.8) — REASSIGNMENT (`@derived = newval`), not mutation. Fires in B7 territory or earlier.
- **E-DERIVED-WITH-VALIDATORS** (§55.14) — applying validators to a derived cell. B13 territory.
- **E-DERIVED-VALUE-MUTATE** (B8 here) — in-place value mutation. Distinct from E-DERIVED-WRITE.

These distinctions are spec-grounded and clear; B8 needs to ensure its diagnostic doesn't overlap with E-DERIVED-WRITE's territory (which fires on `@derived = ...`, not `.method(...)`).

### §1.5 [NOT-DRIFT, ARCHITECTURAL NOTE] Markup-typed derived cells

**§6.6.18 (last paragraph of forms-covered):**
> "Markup-typed derived cells (§6.6.17) carry markup values whose API surface contains no mutating methods; in practice this rule is non-firing on markup-typed derived cells, but the rule applies if a future markup API exposes a mutator."

**B8 implementation guidance:** the rule is uniform; markup-typed derived cells fall under the same MemberCall/MemberAssignment guard as numeric/string/array derived cells. Walker doesn't need a special markup-typed exemption. If a markup API gains a mutator someday, B8 fires automatically.

### §1.6 [REUSABILITY] Same pass as E-DERIVED-WRITE check

**§6.6.18 normative:** "The check SHALL run during the same pass that checks E-DERIVED-WRITE (§6.6.8)."

The E-DERIVED-WRITE check is a sibling of B7's derived-cell handling. B8's walker SHOULD run in the same pipeline pass to keep the resolved-cell-reference walker invocations efficient (one tree-walk fires multiple checks).

**B8 implementation guidance:** integrate into the SYM PASS-3 walker if that's where E-DERIVED-WRITE fires today; otherwise consider sequencing PASS-3 sub-stages so all derived-cell-receiver checks run together.

---

## §2 B8 dispatch brief — required additions beyond SCOPE row

When PA writes the B8 dispatch brief, the following MUST be in the brief beyond the SCOPE row's wording:

1. **Mutating method list (9 names per §6.5.1):** `push`, `pop`, `shift`, `unshift`, `splice`, `reverse`, `sort`, `fill`, `copyWithin`. B8 should expose this as a constant (likely importable from a shared module so future consumers stay in sync if §6.5.1 grows).

2. **Compound-assignment exhaustive list:** 14 forms per §6.6.18 (`+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `&=`, `|=`, `^=`, `<<=`, `>>=`, `>>>=`, `??=`, `||=`, `&&=`). B8 must cover all; tests should verify each.

3. **In-compound derived sub-cell receiver chain:** B8 walker resolves receivers like `@form.derivedField.method(...)` — the receiver chain extends through compound parent. Test surface: nested compound + derived sub-cell + mutation on sub-cell.

4. **Wave-ordering surface for E-SYNTHESIZED-WRITE:** SCOPE assigns B8 to Wave 1 (B5-B8) but E-SYNTHESIZED-WRITE depends on B11/B12 (Wave 3) for the synth-cell registry. **Phase-0 STOP-trigger:** if B11 isn't in place, scope B8 to E-DERIVED-VALUE-MUTATE only; defer E-SYNTHESIZED-WRITE to B11 or a dedicated follow-up.

5. **Same-pass-as-E-DERIVED-WRITE:** integrate with existing derived-cell-receiver walker per §6.6.18 line. Locate the pass that fires E-DERIVED-WRITE today and extend.

6. **Markup-typed derived cells:** uniform handling — no special exemption.

## §3 Cost impact

SCOPE estimate: 4-6h. With wave-ordering caveat (E-SYNTHESIZED-WRITE deferred):
- B8 = E-DERIVED-VALUE-MUTATE only: **3-4h** (smaller surface; mutating-method list + compound-assignment list + receiver chain through compound — all mechanical).
- E-SYNTHESIZED-WRITE: **+1-2h** when paired with B11 (the synth registry is built there; check is one walker extension).

**Net total across B8 + B11-folded-synth-write:** still 4-6h, just split across two dispatches.

## §4 Spec follow-up flagged (none)

§6.6.18 + §55.7 + §6.11 all internally consistent and authoritative. §34 catalog rows (E-DERIVED-VALUE-MUTATE line 14202 area, E-SYNTHESIZED-WRITE line 14206) match. No spec rename or amendment needed.

## §5 Audit summary

B8 SCOPE row is spec-faithful at the architectural level. One non-drift design-constraint surfaced: **Wave-ordering inconsistency** between SCOPE row's "B8 fires E-DERIVED-VALUE-MUTATE + E-SYNTHESIZED-WRITE both" and the wave assignment that puts B8 in Wave 1 + B11 (synth-cell registry source) in Wave 3. PA recommendation: split B8 to ship E-DERIVED-VALUE-MUTATE only in Wave 1; fold E-SYNTHESIZED-WRITE into B11 or a dedicated B11.5.

---

## §6 Tags

#a1b-b8 #rule-4-audit #l21-walker #e-derived-value-mutate #e-synthesized-write #wave-ordering-caveat #spot-check-pass #s66
