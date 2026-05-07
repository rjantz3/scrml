---
title: Item C — temporal-rule surface migration from `<machine>` to `<engine>` + computed-delay relaxation — Rule 4 spec-faithfulness audit
date: 2026-05-07
session: S67
authority: PA-direct read against `compiler/SPEC.md` §51.0.F (engine rule= contract), §51.12 (machine temporal transitions), §34 (E-ENGINE-021), and S67 master-PA inbox `2026-05-07-1327-master-to-scrmlTS-hierarchy-likely-locked-tree-shake-reclassification.md` action item C. Driver: pa.md Rule 4. Cross-references B14/B15/B16/B17 audits (engine wave) + scrml-support `user-voice-scrmlTS.md` S67 entry "State-timeout surface migration is engineering."
status: AUDIT — flags 1 SUBSTANTIVE design deliberation point (new rule= form syntax) + 1 spec amendment (extend §51.0.F three-form list) + 1 implementation gate (existing emit-machines.ts + runtime ride alongside)
---

# Item C — Temporal-rule surface migration: `<machine>` → `<engine>` + computed-delay relaxation

## §0 Scope

Item C from the S67 master-PA inbox (action items table):

> "Surface migration of §51.12 temporal rules from `<machine>` to `<engine>` `rule=` form, plus computed-delay relaxation. Class A. Direct engineering, no debate."

User direction (S67 master-PA conversation, summarized): the temporal-transition feature already exists fully in `<machine>` form (§51.12). The actionable gap is bringing it forward into `<engine>` syntax + lifting the literal-only constraint on `after Ns` durations to allow computed expressions. Runtime infrastructure (`_scrml_machine_arm_timer`, etc.) already takes `ms` as a runtime argument; the constraint lives at parse/lower time today.

This audit reads §51.12 (full normative spec for `<machine>` temporal), §51.0.F (current `<engine>` rule= forms), §34 catalog (E-ENGINE-021), and the existing implementation surface (`compiler/src/codegen/emit-machines.ts`, `compiler/src/runtime-template.js`, `compiler/src/type-system.ts:1267,2510,2654`).

## §1 Findings

### §1.1 [SUBSTANTIVE — DESIGN DELIBERATION] Choice of `<engine>` temporal rule syntax

**Master PA proposal (S67 inbox):** `rule="after 30s -> TimedOut"`.

**SPEC §51.0.F current** (line 20220-20269) defines `<engine>` rule= as target-only with three forms:

1. Single-target `rule=.NextVariant`
2. Multi-target `rule=(.A | .B | .C)`
3. Wildcard `rule=*`

The arrow form (`event -> Variant`) is **legacy `<machine>` syntax** (§51.3); `<engine>` does NOT use it today. (Primer §7 had a line 199 paraphrase using legacy syntax — corrected at S67 commit `53825da` — the primer now matches §51.0.F three target-only forms.)

**Three candidate syntaxes for the `<engine>` temporal rule:**

**Candidate A — string-arrow form** (master PA proposal):
```scrml
<Loading rule=.Done rule="after 30s -> .TimedOut">
    Loading...
</>
```
Compact; matches legacy `<machine>` familiarity. BUT introduces a string-quoted form to `<engine>` that conflicts with the corrected target-only rule= grammar; mixes two attribute conventions; complicates parser dispatch (string-quoted forms imply legacy parsing).

**Candidate B — attribute-pair form** (recommended):
```scrml
<Loading rule=.Done rule=.TimedOut after=30s>
    Loading...
</>
```
The `after=` attribute on the state-child binds to the most-recent `rule=` target. Reads naturally; aligns with v0.next attribute discipline. BUT the binding rule "after= binds to most-recent rule=" is non-obvious; requires careful spec wording.

**Candidate C — structural-element form** (paralleling `<onTransition>`):
```scrml
<Loading rule=.Done>
    <onTimeout after=30s to=.TimedOut/>
    Loading...
</>
```
Symmetric with `<onTransition>` element (per §51.0.H). Structural element registry already accommodates `<engine>` family elements per §4 + §24 (primer §9.6). The temporal arming/clearing is a sibling concept to onTransition handlers.

**PA recommendation (audit-level — final design is Bryan's):** **Candidate C — `<onTimeout>` structural element.**

Reasoning:
1. Cleanest separation between "legal target declaration" (`rule=`) and "time-driven mechanics" (`<onTimeout>`).
2. Symmetric with existing `<onTransition>` patterns; primer §9.6 structural-elements registry extends to one new element with no new attribute-binding rule.
3. Composes with multi-target `rule=`: a state-child can have `rule=(.A | .B)` AND multiple `<onTimeout>` children with different durations + targets.
4. The `<onTimeout to=.TimedOut after=30s>` body shape is parser-friendly (attribute-only, self-closing for the simple case).
5. Easy spec amendment — add §51.0.M ("`<onTimeout>` element") parallel to §51.0.H ("`effect=` and `<onTransition>`").

Candidate A is the closest to legacy `<machine>` syntax familiarity but introduces a string-quoted parsing surface that the v0.next `<engine>` form has been deliberately avoiding. Candidate B has subtle binding semantics that require spec wording to disambiguate.

**Surface to Bryan as a deliberation point at dispatch time.** Do NOT silently default; this is a design choice with downstream implications for samples + kickstarter recipes.

### §1.2 [SUBSTANTIVE — SPEC AMENDMENT] Extending §51.0.F to admit temporal rules

Independent of the syntax choice, §51.0.F's three-form table (line 20225-20229) needs an amendment: a temporal rule does NOT fit any of the three target-only forms.

**Amendment shape (Candidate C scenario):**
- §51.0.F three forms remain unchanged for `rule=` itself.
- New §51.0.M (or sibling subsection) introduces `<onTimeout>` as a state-child element.
- §51.12 carries forward as-is (the legacy `<machine>` form), with a cross-ref pointer to §51.0.M for the `<engine>` equivalent.

**Amendment shape (Candidate A scenario — if Bryan picks string-arrow):**
- §51.0.F three forms become four: single-target / multi-target / wildcard / temporal-arrow.
- §51.0.F worked example needs a row showing the new form.
- E-ENGINE-RULE-PARSE-ERROR (or canonical name) for malformed temporal arrows.
- §51.12 §51.12.7 normative statements need a parallel for `<engine>`.

**Amendment shape (Candidate B scenario):**
- §51.0.F three forms remain.
- New attribute `after=` on engine state-children, with binding-rule spec text.
- Arity validation: `after=` requires a paired `rule=.NextVariant` (single-target only); multi-target `rule=` + `after=` is ambiguous (which target does the timer fire toward?).

### §1.3 [SUBSTANTIVE — REUSABILITY] Existing `<machine>` infrastructure rides alongside

**Per master-PA inbox + spec §51.12:** the runtime infrastructure already exists and works:

- **Codegen:** `compiler/src/codegen/emit-machines.ts:478-714` (full lowering for `<machine>` temporal rules)
- **Runtime:** `compiler/src/runtime-template.js:66-146` (`_scrml_machine_arm_timer`, `_scrml_machine_arm_initial`, `_scrml_machine_clear_timer`)
- **Type-system:** `compiler/src/type-system.ts:1267,2510,2654` (E-ENGINE-021 detection)
- **Reset-on-reentry semantics** match XState `after` (§51.12.4 line 21746-21752)

**Implementation guidance:** the `<engine>` temporal feature is a **lowering-shape extension**, not a new runtime. The new surface (whichever Candidate ratifies) lowers to the SAME runtime calls (`_scrml_machine_arm_timer` + `_scrml_machine_clear_timer`).

This is the "shakeable Class B" insight per S67 user-direction signal #2: the runtime cost only ships when an engine declares a temporal rule. Already true today for `<machine>`; the `<engine>` extension inherits the same property.

### §1.4 [SUBSTANTIVE — RELAXATION] Computed-delay support

**Master PA framing (S67 inbox):** "Relax the literal-only constraint on `delay`/`interval`/`after Ns` to allow computed expressions. The runtime function `_scrml_machine_arm_timer(name, ms, ...)` already takes `ms` as a runtime argument; the constraint is at parse/lower time. Lifting it closes the WebSocket-backoff case and is pure type-checker / lowering work."

**Spec context — §51.12.3 Duration Units (line 21731-21743):**
> "The unit suffix is required. Supported units: ms / s / m / h. Fractional numbers are permitted (`0.5s` is 500 ms). The compiler converts to integer milliseconds via `Math.round(n × multiplier)`."

Per §51.12.7 normative: "The duration SHALL be a non-negative number followed by one of `ms`, `s`, `m`, `h`. The compiler SHALL convert to integer milliseconds."

**Current constraint:** the duration is a literal `Ns`/`Nms`/`Nm`/`Nh` form parsed at compile-time. Computed expressions (`@retryDelay s`, `Math.min(1000 * 2**@attempt, 30000)ms`, etc.) are NOT supported.

**Relaxation shape:**

```scrml
<onTimeout after=${@backoffDelay}ms to=.Retry/>     // computed
<onTimeout after=${Math.min(1000 * 2**@attempt, 30000)}ms to=.Retry/>
<onTimeout after=30s to=.TimedOut/>                  // literal still works
```

The interpolated `${...}` form yields a runtime number that the compiler routes to `_scrml_machine_arm_timer`'s `ms` argument with the unit-multiplier applied at the call site. Static analysis (constant-folding when possible) can pre-compute literal-equivalent durations; non-constant expressions emit runtime computation.

**Type-checker concern:** the expression must produce a non-negative number. Compile-time literal cases retain the existing static check; runtime cases need a runtime non-negative guard (or skip the guard and document the negative-duration behavior — likely "fires immediately on next tick" per `setTimeout` semantics).

**WebSocket-backoff case** (one of the audit's worked examples): exponential backoff with `Math.min(1000 * 2**@attempt, 30000)` requires runtime computation. Today's literal-only constraint forces awkward workarounds (multiple temporal rules with different literal delays) or moves the entire timer to manual-userspace.

### §1.5 [BOUNDARY] What this audit does NOT cover

- **Hierarchy / parallel regions** — those are DD-Harel territory (action item A; master PA running debate). Item C is independent of DD-Harel.
- **Event-timeout / named multi-timer** — action items D in the inbox (B-shakeable, OK if pursued); could ride alongside C as a follow-on. Out of C's scope.
- **General effect log / coeffect capture** — items E + F in the inbox (rejected on minimality + non-shakeability). Not in scope.
- **Test-mockability for engines** — action item B (debate ongoing). Independent surface.

### §1.6 [DISPATCH SHAPE] Engineering decomposition

If Bryan ratifies Candidate C (`<onTimeout>` structural element), the engineering decomposition:

| # | Step | Files | Est |
|---|---|---|---|
| C-1 | Spec amendment §51.0.M + §51.12 cross-ref | compiler/SPEC.md | ~30-60min |
| C-2 | Parser support for `<onTimeout>` element + `after=` / `to=` attributes | compiler/src/ast-builder.js (or block-splitter / structural-elements registry) | 2-4h |
| C-3 | Type-system: validate `<onTimeout>` only in engine state-child contexts (E-STRUCTURAL-ELEMENT-MISPLACED elsewhere); verify `to=` references valid variant; verify `after=` accepts literal duration OR `${expr}` form | compiler/src/type-system.ts (or a new symbol-table walker) | 2-3h |
| C-4 | Computed-delay relaxation: extend duration parser to accept `${expr}ms` / `${expr}s` etc., or accept bare `${expr}` interpreted as ms | compiler/src/ast-builder.js + emit-machines.ts | 1.5-2.5h |
| C-5 | Codegen: emit `_scrml_machine_arm_timer` calls for `<onTimeout>` state-children, mirroring §51.12 codegen but on engine-shaped lowering | compiler/src/codegen/emit-machines.ts (extension) | 2-3h |
| C-6 | Tests: per-form fixtures (literal, computed, multiple onTimeouts per state, reset-on-reentry, ineffective `*` from clause if applicable, etc.) | compiler/tests/unit/onTimeout.test.js (new) + parse/integration | 3-4h |
| C-7 | Sample: at least one example file uses `<onTimeout>` (e.g., a fetch-with-timeout demo) | examples/ + samples/compilation-tests/ | 30-60min |

**Total realistic: 11-18h.** Larger than typical A1b steps but smaller than D1/D2 dispatches.

If Bryan ratifies Candidate A or B instead, the decomposition is similar with parser/type-system steps adjusted to the chosen syntax.

---

## §2 Item C dispatch brief — required additions beyond the inbox wording

When PA writes the Item C dispatch brief, the following MUST be in the brief:

1. **Surface deliberation point §1.1** to Bryan FIRST — Candidate A / B / C choice. Do NOT silently pick. PA recommends C (`<onTimeout>` structural element) but this is a design decision with downstream sample/kickstarter implications.

2. **Spec amendment scope** per §1.2 — depends on Candidate. Candidate C amends §51.0.M parallel to §51.0.H; Candidate A extends §51.0.F three-form table to four; Candidate B introduces an attribute-binding rule.

3. **Reuse §51.12 runtime + codegen** per §1.3 — the runtime calls (`_scrml_machine_arm_timer` etc.) are already in place and well-tested. The new surface lowers to the SAME calls; do NOT duplicate runtime infrastructure.

4. **Computed-delay relaxation** per §1.4 — accept literal durations (`30s`) AND interpolated expressions (`${@backoffDelay}ms`). Static cases retain the existing constant-folded path; runtime cases emit a per-arm computation. WebSocket-backoff case is a load-bearing test fixture.

5. **Type-system** must validate the new element/attribute lives in engine state-child contexts only (E-STRUCTURAL-ELEMENT-MISPLACED elsewhere); validate `to=` references valid variant of the engine's type (parallel to B15's `rule=` variant validation per primer §13.7 row B15 once it lands).

6. **Phase-0 survey** must read `compiler/src/codegen/emit-machines.ts:478-714` to understand the existing `<machine>` lowering shape; read `compiler/src/runtime-template.js:66-146` for the runtime API; identify whether existing E-ENGINE-021 translates symmetrically to the `<engine>` form.

7. **Test fixtures** must cover: simple literal, computed via `${expr}`, multiple `<onTimeout>` per state, reset-on-reentry semantics, conflict cases (multi-target rule with onTimeout — per Candidate C, this composes; per Candidate B, it's ambiguous and rejected), interaction with `<onTransition>` siblings.

8. **Cross-cutting:** ensure DD-Harel deep-dive (action item A, master PA running debate) is NOT blocked by Item C; Item C is independent of hierarchy work.

## §3 Cost impact

Inbox framing: "Direct engineering, no debate." Cost depends on Candidate:
- **Candidate C** (recommended): 11-18h realistic per §1.6 decomposition.
- **Candidate A** (string-arrow): similar, possibly slightly less parser work (no new element, just rule= form extension) but more spec wording for the form-vs-three-target-form interaction.
- **Candidate B** (attribute-pair): similar, more careful spec wording for the binding rule.

**Survey-first per primer §12.** Existing `<machine>` infrastructure is mature; depth-of-survey-discount is likely if the new lowering rides cleanly alongside.

## §4 Spec follow-up flagged (small, depending on Candidate)

§51.0.F three-form table may need an amendment OR addition (per §1.2). §51.12 needs a cross-ref pointer to the new `<engine>` form in either case. If Candidate B, careful binding-rule spec text required.

E-ENGINE-021 may extend to cover the new form's invalid-duration case (or remain unchanged if the new form reuses the same parser-level error).

---

## §5 Audit summary

Item C SCOPE/inbox framing has 1 substantive design deliberation (Candidate A/B/C syntax — surface to Bryan), 1 spec amendment (extend §51.0.F + §51.12 cross-ref), 1 reusability win (existing emit-machines.ts + runtime template ride alongside, lowering-only extension). Computed-delay relaxation is purely lifting a parse/lower-time literal-only constraint; runtime already accepts `ms` as a runtime argument.

PA recommendation: dispatch with Candidate C (`<onTimeout>` element) UNLESS Bryan picks differently. ~11-18h realistic. Class A throughout per inbox classification. No debate needed.

Sequencing note: Item C is independent of A1b Wave 4 (engine: B14-B17). It could land before or after engine binding/exhaustiveness. PA-direct or agent-dispatched both valid; agent dispatch is cleaner given the substantial spec + parser + codegen + test surface.

---

## §6 Tags

#item-c #temporal-rule-surface-migration #§51.12-machine-temporal #§51.0.F-engine-rule= #onTimeout-element #computed-delay-relaxation #class-a #engineering-not-design #s67-master-pa-inbox #user-direction-signal-4
