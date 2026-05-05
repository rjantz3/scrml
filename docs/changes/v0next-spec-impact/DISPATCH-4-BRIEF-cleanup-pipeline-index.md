# Stage 0b — Dispatch 4 Brief: Cleanup + PIPELINE.md + SPEC-INDEX Final Regen

**Target agent:** `scrml-dev-pipeline` (T3 tier, worktree-isolated)
**Scope:** Tiers 8-12 of `IMPACT-ASSESSMENT.md` §6 — the small-edit sections (§4, §5, §7, §10, §13, §14, §15, §16, §21, §24, §31, §41, §50) + reviews (§22, §28, §47, §52) + PIPELINE.md (~30-40% rewrite) + SPEC-INDEX final regen + §34 consolidation
**Output:** rewritten SPEC.md sections + rewritten PIPELINE.md + final SPEC-INDEX.md
**Authorization:** scoped to this brief; "no holds barred" carries forward from S56 deliberation phase per user re-confirmation.
**Date drafted:** 2026-05-04 (S56)
**Drafted by:** PA (this conversation)
**Depends on:** Dispatches 1, 2, AND 3 — MUST be committed and pushed before this dispatch starts. This dispatch finalizes cross-references that the prior dispatches established forward-stubs for.

---

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: `<ABSOLUTE-WORKTREE-PATH-FILL-AT-DISPATCH-TIME>`

### Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal worktree path.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Verify Dispatches 1, 2, AND 3 have landed: run `git log --oneline | head -50` and confirm all three foundation/engines/channels commits exist. If any is missing, DO NOT proceed.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

### Path discipline (enforce on EVERY Read/Write/Edit call)

Standard pa.md F4 path discipline. See Dispatch 1 brief for full text.

---

## §1 What this dispatch is

The FINAL of 4 staged dispatches. Cleanup-and-finalize: the smaller cross-section edits that thread cross-references across the rewrite, four sections that need REVIEW (likely no change but verify), PIPELINE.md rewrite (~30-40%), §34 final consolidation pass, SPEC-INDEX final regen.

**Smallest scope** of the four dispatches (~5,000-10,000 line net changes total, but spread thin across many sections). Most edits are small (1-3 paragraphs added per section); the bulk of the dispatch is the PIPELINE.md rewrite.

This dispatch CANNOT begin until Dispatches 1, 2, AND 3 have landed.

**You are NOT changing compiler source code.** Test breakage is EXPECTED.

### Sources you must read in full before any edit

1. `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md` — your master plan. §2 disposition table covers all your scope. §4 PIPELINE.md impact. §5 SPEC-INDEX impact. §6 ordering rules.
2. `docs/changes/v0next-spec-impact/DISPATCH-1-BRIEF-foundation.md`, `-2-`, `-3-` — for shape; mirror their dispatch shape.
3. `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` — locks L1-L20 (especially L1 markup-as-value pillar — threads through MANY of this dispatch's small-edit sections).
4. `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md` — moves M1-M20.
5. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — the LOCKED kickstarter. Tiebreaker.
6. `compiler/SPEC.md` — current spec, AS REWRITTEN BY DISPATCHES 1-3.
7. `compiler/SPEC-INDEX.md`, `compiler/PIPELINE.md` — current versions.
8. `pa.md` — repo conventions.

### Anti-patterns brief (mandatory)

- `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- `docs/articles/llm-kickstarter-v2-2026-05-04.md` §7

---

## §2 Crash recovery directives (PERMANENT — pa.md global rules)

Standard:
1. Commit after each meaningful change with WIP messages
2. Update `docs/changes/v0next-spec-impact/progress-dispatch-4.md`
3. WIP commits expected
4. Crash recovery via commits + progress.md

---

## §3 Scope — what to do, in order

The order respects dependencies: small SPEC.md edits first (Tier 8); then reviews (Tier 10 — verify only); then §34 final consolidation (Tier 9); then PIPELINE.md (Tier 11); finally SPEC-INDEX regen (Tier 12).

### §3.1 Tier 8 — Small SPEC.md edits

Each item below is a small additive edit (1-3 paragraphs, occasionally a small subsection). Read each section in current SPEC.md, identify where to insert per the IMPACT-ASSESSMENT.md §2 disposition table, make the edit, commit, move on.

#### §4 Block Grammar (PARTIAL REWRITE per IMPACT)

- Add subsection on `:`-shorthand for single-expression body (M15, cross-ref §51.11). 3-4 paragraphs covering: closer-presence override, mandatory whitespace, three legitimate body forms (self-closing / bare-body / shorthand).
- Register `<errors>` element as scrml-defined structural element with `of=` attribute slot (cross-ref §55.8 from Dispatch 2).
- Register `<onTransition>` element as scrml-defined structural element with `to=`/`from=`/`once`/`if=` attribute slots (cross-ref §51.10 from Dispatch 2).
- Register `<engine>`, `<match>` as scrml-defined structural elements with their attribute slots (cross-ref §51.2, §18.X+1 from Dispatch 2).
- Verify M7 (multi-close shorthand `<///>`) is removed/never-introduced. Negative-space check.

Estimated lines added: 100-150.

#### §5 Attribute Quoting (PARTIAL REWRITE)

- Add §5.X attribute-binding dispatch table (L17): bind:value vs bind:checked vs bind:files vs custom component bind: by render-spec shape. Cross-ref §6 from Dispatch 1 for the underlying decl-coupled-with-render-spec.
- Update §5.2.2 event handler binding section: add the bare-call / bare-assignment / bare-single-expression rule (L19). Multi-statement handlers force named function. Cross-ref §6.7 (Dispatch 1 — multi-statement event handlers) and §50 (assignment-as-expression).

Estimated lines added: 60-100.

#### §7 Logic Contexts (PARTIAL REWRITE)

- Reframe §7.X (markup-as-expression) under the L1 markup-as-value pillar. The pillar makes markup-as-expression a special case, not the only special case.
- Update §7.6 (file-level scope sharing) per V5-strict + hoisting + `pinned` (cross-ref §6.9, §6.10 from Dispatch 1).
- Add brief subsection on logic-markup interleaving (M8) being the canonical form for colocating logic with markup.

Estimated lines added: 50-80.

#### §10 The `lift` Keyword (SMALL EDIT)

- Reframe lift semantics under markup-as-value pillar (cross-ref §1.4 from Dispatch 1). lift is no longer "the special form for accumulating markup-as-value" — it's the operator that explicitly lifts data/markup into the surrounding context. Subsection-level reframe; existing semantics preserved.

Estimated lines added: 10-20.

#### §13 Async Model (PARTIAL REWRITE)

- Update §13.5 (RemoteData enum) to add an explicit cross-ref: "The engine recipe (§51) is the v0.next idiom for state-driven loading flows that previously used RemoteData enum + match. Match-based RemoteData remains valid for value-return contexts (server logic, derivations); the engine form gives compile-time exhaustiveness on transitions." Don't delete RemoteData; cross-ref to engine recipe.

Estimated lines added: 20-30.

#### §14 Type System (PARTIAL REWRITE)

- Add subsection on bare-variant inference (M9): when LHS or parameter type is statically known, RHS variant qualifier may be omitted. `marioState = .Big` → `marioState = MarioState.Big`. Edge: union-typed contexts → ambiguous → require qualification.
- Add subsection on positional binding for predefined-shape compound state (M10): tuple-positional binding `<x> = (a, b, c)` legal when type is fixed. Cross-ref §6 (compound state).

Estimated lines added: 80-120.

#### §15 Component System (SMALL EDIT)

- Add subsection: "Components stay distinct from engines" (M20). One-paragraph statement of the distinction:
  - Engines are SINGLETON-by-design; declared as `<engine for=Type ...>`; render at decl position.
  - Components are MULTI-INSTANCE; declared as `const Card = <article props={...}>...</>`; instantiated by tag at use sites.
  - If you want many of them, use a component. If you want one, use an engine.
- Add the E-COMPONENT-ENGINE-SCOPE constraint (cross-ref §34 + Dispatch 2 §3.6): a component body cannot instantiate an engine (singleton-vs-instance conflict).
- Reaffirm component reactive scope (§15.13) under V5-strict.

Estimated lines added: 30-50.

#### §16 Component Slots (SMALL EDIT)

- Reaffirm slots under markup-as-value pillar (L1, cross-ref §1.4). Slots take markup; markup is first-class; this is consistent.

Estimated lines added: 10-20.

#### §21 Module and Import System (SMALL EDIT)

- Add subsection on cross-file engine import (M18, cross-ref §51.6). Pattern: `import { MarioMachine } from './engines.scrml'` then `<MarioMachine/>` use-site renders the imported engine. Singleton semantics across all use-sites in the importer's file.
- Confirm `pinned` works on imports: `import { MarioMachine pinned } from './engines.scrml'` (cross-ref §6.10).

Estimated lines added: 30-50.

#### §24 HTML Spec Awareness (SMALL EDIT)

- Update element registry to include scrml-defined structural elements (cross-ref §4): `<errors>`, `<onTransition>`, `<engine>`, `<match>`. These are NOT HTML; the registry must distinguish.

Estimated lines added: 20-30.

#### §31 Dependency Graph (SMALL EDIT)

- Add subsection on validator predicate-arg dependency tracking (L14, cross-ref §55.11). The compiler tracks dependencies through expressions in predicate args; when any referenced cell changes, the validator recomputes. Cycle detection emits E-VALIDATOR-CIRCULAR-DEP.
- Add subsection on derived state expression dependency tracking (L15 + L20, cross-ref §6.6 + §51.12). Same dependency-tracker machinery for `const <derived>` cells and `derived=expr` engines.

Estimated lines added: 40-60.

#### §41 Import System — `use`/`import` (SMALL EDIT)

- Add subsection on `scrml:data` `registerMessages` (L12, cross-ref §55.10). API: `data.registerMessages(map)` where map is `{ .ErrorTag: (field, ...args) => string, ... }`. Project-wide; called once at app boot. This is the i18n + brand-voice hook.
- Cross-ref `messageFor(errorTag)` helper.

Estimated lines added: 30-50.

#### §50 Assignment as Expression (SMALL EDIT)

- Reaffirm under markup-as-value pillar (L1). Assignment-as-expression composes with markup expressions: `${@x = newval}` is legal where the assignment expression evaluates to the new value (or void per the assignment-as-expr semantics). Cross-ref §1.4.
- Add cross-ref to §5.2.2 (event handlers) where bare-assignment is the canonical inline form (L19).

Estimated lines added: 20-30.

### §3.2 Tier 10 — Reviews (likely no change, verify)

For each:
1. Read the section in current SPEC.md (post Dispatches 1-3).
2. Verify post-S56 framing doesn't contradict the section.
3. If contradictions found, propose specific edits in progress.md and apply (small).
4. If no contradictions, add a brief "Reviewed for v0.next consistency" footnote at the section start with date.

#### §22 Metaprogramming
- Verify `^{}` meta-context interactions with markup-as-value pillar are consistent. Markup-as-value means `^{}` blocks may RETURN markup that becomes a first-class value. Likely consistent; verify.

#### §28 Compiler Settings
- Verify whether new lint settings warrant additions (e.g., suppression configs for W-LIFECYCLE-CANDIDATE, W-MATCH-RULE-INERT, W-ENGINE-INITIAL-MISSING). Likely small additions if any.

#### §47 Output Name Encoding
- Verify auto-synthesized properties (`@x.isValid`, `@x.errors`, etc.) are encoded coherently. Verify auto-declared engine variables (M6) and derived engines (L20) get correct encoded names. Likely small additions.

#### §52 State Authority Declarations
- Verify two-tier authority composes with auto-synthesized validity surface. Verify `protect=` on state cells composes with V5-strict. Should be intact; verify.

Estimated lines added across reviews: 40-100.

### §3.3 Tier 9 — §34 Error Codes Consolidation

Final pass on §34. Goal: every error/warning code from Dispatches 1-3 is documented; the section is internally consistent; cross-refs to other sections resolve.

Tasks:
1. Verify all codes from Dispatches 1-3 §34 contributions are present and correctly formatted.
2. Resolve any duplicates or inconsistencies.
3. Update the §34 error-code summary tables (the existing format).
4. Verify SPEC-INDEX has correct cross-refs to §34.

Estimated work: cross-checking and small fixes; 20-40 lines net change.

### §3.4 Tier 11 — PIPELINE.md (~30-40% rewrite)

Current PIPELINE.md: 1,941 lines. Target: ~2,400 lines. This is the largest single piece of this dispatch.

Per IMPACT-ASSESSMENT §4, the affected stages:

#### Tokenizer / Lexer stage
- `<x>` decl-vs-render-by-tag-vs-engine-statechild disambiguation
- `:`-shorthand body recognition
- `is some` and `is not` as composite operators

#### Parser stage
- `<engine for=Type initial=...>` block
- `<match for=Type [on=expr]>` block
- `<errors of=expr/>` element
- `<onTransition>` element
- `pinned` keyword
- `default=` attribute
- render-spec-RHS in declarations
- bare-variant inference
- positional binding for predefined-shape
- multi-statement-handler restriction (parse-time validation)

#### Resolver stage
- auto-declared engine variable per type-name
- auto-derived var name (lowercase-first-run-strip-Machine)
- compound state Variant C field resolution
- `pinned` forward-ref detection
- cross-cell expression dependency tracking

#### Typer stage
- auto-synthesized validity surface type-checking
- `ValidationError` enum + `.Custom(tag)` extension
- render-spec validity (bindable vs display-only)
- engine `derived=expr` type compatibility
- bare-variant inference type completion

#### Codegen stage
- `<x/>` render-by-tag expansion to bound input element with `bind:value`/`bind:checked`/`bind:files` dispatch
- engine state-child rendering as conditional-on-engine-variant
- transition validation (rule= contract) including compile-time check inside state-child bodies
- auto-synthesized validity property emission
- `<errors of=expr/>` rendering
- `reset()` keyword expansion
- `default=` attribute capture and reset-time evaluation

#### Optimization stage
- Verify SQL coalescing (existing) — no regression
- Reactive dependency graph for validator predicate args

#### Output stage
- auto-name encoding (cross-ref §47) for synthesized properties + auto-declared engine variables

Per-stage updates: rewrite the affected stage's contract description; preserve unchanged stages verbatim. Each stage gets its own commit (`WIP: PIPELINE.md tokenizer stage v0.next updates`, etc.).

Estimated wall-time for PIPELINE.md alone: 6-12 hours.

### §3.5 Tier 12 — SPEC-INDEX final regen

After ALL of the above lands:
1. Run `bash scripts/update-spec-index.sh`
2. Verify line numbers align with all rewrites
3. Add Quick Lookup entries that span across dispatches (combining Dispatch 1/2/3 contributions plus Dispatch 4):
   - All entries from Dispatch 1, 2, 3 individually-recommended Quick Lookups
   - Plus Dispatch 4's:
     - "components vs engines" → §15.X
     - "cross-file engine import" → §21.X
     - "registerMessages" → §41.X (already in Dispatch 2 prep but verify)
     - "validator dependency tracking" → §31.X
     - "auto-synthesized property encoding" → §47
4. Verify "Topic → Section" map is complete and accurate.

---

## §4 Cross-cutting work

### §4.1 Final cross-reference sweep

Across the entire SPEC.md, verify:
- No `<machine>` references (all should be `<engine>`)
- No `@shared` references (only the deprecation note in §38.6)
- No `const @x` declarations in examples (all should be `const <x>` per L15 + S56 alignment)
- No `let count = ...` reactive-intent patterns (all should be `<count> = ...`)
- All `§N.X` cross-refs resolve to actual sections
- All error codes referenced in body text exist in §34

### §4.2 Test posture verification

The dispatch produces a SPEC + PIPELINE engineering target that the compiler doesn't yet implement. `bun test` will continue to fail. The dispatch's success metric is spec quality, not test parity.

After all the above, run `bun test` once and capture the pass/skip/fail count in progress.md. This is informational only — confirm the failure pattern is EXPECTED (spec ahead of compiler), not an unexpected break.

---

## §5 What you do NOT do in this dispatch

- **DO NOT** rewrite §1, §3, §6, §11 (Dispatch 1 work).
- **DO NOT** rewrite §17, §18, §51, §54, §55 (Dispatch 2 work).
- **DO NOT** rewrite §38, §39, §42, §53 (Dispatch 3 work).
- **DO NOT** modify compiler source code. Test breakage is EXPECTED.
- **DO NOT** modify tests, kickstarter v2, or PA-only files.

---

## §6 Success criteria

The dispatch is DONE when:

1. **All Tier 8 small edits applied** to §4, §5, §7, §10, §13, §14, §15, §16, §21, §24, §31, §41, §50.
2. **Tier 10 reviews complete** for §22, §28, §47, §52 — either small-edit applied or "reviewed-for-v0.next" footnote added.
3. **§34 consolidation pass complete** — all codes from all dispatches present, no duplicates, summary tables updated.
4. **PIPELINE.md rewrite complete** — all affected stages updated; unchanged stages preserved verbatim; line target met (~2,400 lines).
5. **SPEC-INDEX final regen complete** — line numbers align; Quick Lookup entries comprehensive.
6. **Cross-reference sweep complete** — no `<machine>`, no `@shared`, no `const @x` declarations, no broken refs.
7. **Test count captured** in progress.md (informational; spec-ahead-of-compiler failure is expected).
8. **Each section/stage committed independently.** Progress.md captures the timeline.
9. **Final commit message:** "spec(dispatch-4): cleanup + PIPELINE.md + SPEC-INDEX final regen — Tiers 8-12 of impact assessment, +13 small-edit sections, 4 reviews, §34 consolidation, PIPELINE.md ~30-40% rewrite, SPEC-INDEX regen" or similar.

The dispatch is NOT required to make `bun test` pass. After Dispatch 4, the spec is the engineering target; Phase A1+ implementation dispatches bring the compiler into compliance.

---

## §7 Open questions (resolve during rewrite)

Most open questions were resolved by Dispatches 1-3. Remaining for this dispatch:

### §7.1 §52 State Authority — does anything need updating?
PA leans NO under V5-strict + auto-synth validity surface. But verify: server @var semantics (§52) use `@` access form which is unchanged. `protect=` on state cells composes with V5-strict; the existing `protect=` mechanism doesn't conflict with V5-strict's `<x>`/`@x` forms (the `protect=` is on the DB block / state cell, not on the syntactic form).

### §7.2 §22 Metaprogramming and markup-as-value
PA leans no significant change. `^{}` blocks return markup or values; markup-as-value pillar makes that uniform. Verify no contradictions.

### §7.3 PIPELINE.md stage ordering
If you find that v0.next changes require a NEW stage (e.g., a dedicated validator-synthesis stage that didn't exist before), surface in progress.md and propose. Most likely: existing stages absorb the new work; no new stages needed.

---

## §8 Estimated wall-time

- §4, §5, §7 small edits: 1-2 hours each = 3-6 hours
- §10, §13 small edits: 30-60 min each = 1-2 hours
- §14, §15, §16, §21, §24, §31, §41, §50 small edits: 30-60 min each = 4-8 hours
- §22, §28, §47, §52 reviews: 30 min each = 2 hours
- §34 consolidation: 30-60 min = 1 hour
- PIPELINE.md rewrite: 6-12 hours
- SPEC-INDEX regen + cross-ref sweep: 1-2 hours

**Total: 18-33 hours of focused dispatch work.** Smaller than Dispatch 1; substantially smaller than Dispatch 2; comparable to Dispatch 3. PIPELINE.md is the bulk; everything else is spread thin.

---

## §9 Dispatch authorization

- Worktree-isolated per pa.md F4.
- Pre-commit hook NOT bypassed without explicit authorization.
- No destructive operations without prompting per S56 user directive.

---

## §10 Cross-references

- **Master plan:** `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md`
- **Dispatch 1, 2, 3 briefs:** in same directory
- **S56 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`
- **S55 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md`
- **Kickstarter v2:** `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- **Anti-patterns brief:** `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- **Repo PA directives:** `pa.md`
- **Progress.md target:** `docs/changes/v0next-spec-impact/progress-dispatch-4.md`

---

## §11 Tags

#stage-0b #dispatch-4 #cleanup-pipeline-spec-index-final #tier-8-small-edits #tier-9-error-code-consolidation #tier-10-reviews #tier-11-pipeline-rewrite #tier-12-spec-index-regen #scrml-dev-pipeline-T3 #worktree-isolated #depends-on-dispatches-1-2-3
