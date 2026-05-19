---
title: tableFor — L22 family member #4 SCOPING + 4-gate walk
date: 2026-05-19
session: S105
status: SCOPING — 4-gate walk PASS; deep-dive recommended next
authority:
  - SPEC §53.14 (type-as-argument primitives + 4-gate discipline)
  - SPEC §41.13 (parseVariant family-precedent — S65)
  - SPEC §41.14 (formFor — S102 — sibling markup-element-emitting member)
  - SPEC §41.15 (schemaFor — S103/S104 — sibling output-kind-match precedent + Form B function-call verdict)
  - L22 lock (S65 debate-05 verdict)
  - `scrml-support/docs/type-as-argument-family-2026-05-06.md` (gate-keeping reference)
related:
  - `docs/changes/parsevariant-impl/SCOPE.md` (Path-A architectural commit)
  - `docs/changes/formFor-scoping/SCOPING.md` (sibling-member SCOPING precedent)
  - `docs/changes/schemaFor-scoping/SCOPING.md` (sibling-member SCOPING precedent + Path-B pivot precedent)
  - `docs/changes/serialize-scoping/SCOPING.md` (STASH precedent — Gate 2 synonym-risk failure mode)
---

# tableFor — SCOPING

## Headline

`tableFor(StructType, rows)` is the FOURTH active general-position member of the L22 type-as-argument family. PA-direct 4-gate walk per §53.14.4 discipline: **all four gates PASS**, Gate 4 surfaces sufficient design ambiguity to mandate a deep-dive before SPEC authorship. Initial OQ list 9 questions; surface-form question is DEBATE-MANDATORY per S103 rule (output-kind-match cross-check non-trivial vs `formFor` markup-element vs `schemaFor` function-call).

## §1. Authority + family context

§53.14.3 family roster at S105 OPEN:

| Member | Status | Output kind | Surface form |
|---|---|---|---|
| `parseVariant(json, EnumType)` | ✅ shipped S65 | value (typed enum instance) | function-call |
| `formFor(StructType)` | ✅ shipped S102-S103 | markup `<form>` tree | markup-element |
| `schemaFor(StructType)` | ✅ shipped S104 | DDL string (interpolated in `<schema>`) | function-call |
| `serialize(value, EnumType)` | 🟡 STASHED S103 (Gate 2 synonym-risk) | string (would be wire-format envelope) | function-call (proposed) |
| **`tableFor(StructType, rows)`** | **this SCOPING** | **markup `<table>` tree** | **DEBATE-MANDATORY (PA lean markup-element)** |
| `variantNames(EnumType)` / reflective metadata | planned | value (string[]) | function-call (precedent: parseVariant) |

Discipline-health datum at S105 OPEN: 3 debate-05 rejections + 1 STASH vs 4 advancements (parseVariant + formFor + schemaFor + this candidate, conditional on gate-walk pass + deep-dive verdict).

## §2. Problem statement + DON'T-SHIP forfeit evidence

scrml currently has NO automated path from struct definition to `<table>` rendering. Adopters who want type-derived table rendering must either:

1. **Hand-roll** with `lift <tr>` per row + manual `<thead>` + per-column dispatch per field shape:
   ```scrml
   <table class="data-table">
     <thead><tr><th>Name</th><th>Status</th><th>Created</th></tr></thead>
     <tbody>
       for (let row of @rows) {
         lift <tr>
           <td>${row.name}</td>
           <td><Badge variant=${row.status}/></td>
           <td>${formatDate(row.created)}</td>
         </tr>
       }
     </tbody>
   </table>
   ```
   Cost per table: O(N fields × M cell shapes) of duplicated code. Field-name labels duplicate the struct's field-name set; type-aware rendering (date, enum, numeric) reinvents per-call-site.

2. **Drop into `^{}` meta-blocks** with `reflect()` + emit-string templating (the canonical signal — `examples/11-meta-programming.scrml:109-122`). This is the SAME mechanism `parseVariant` / `formFor` / `schemaFor` were designed to replace at the general position. Adopters who need struct-walk table rendering today are paying the meta-block tax.

**Concrete evidence of the forfeit cost in current corpus:**
- `examples/07-admin-dashboard.scrml:127-150` — hand-rolled `<table class="data-table">` with manual `<thead>` + `lift <tr>` per row + per-column dispatch.
- `examples/23-trucking-dispatch/` — multiple admin-UI table renders hand-rolled (verified in dist HTML: `pages/dispatch/customers.html:38-50`, `pages/customer/loads.html:74-`).
- `examples/11-meta-programming.scrml:109-122` — `^{}` + `reflect()` + emit-string struct-field table (the only adopter-accessible struct-walk path today).

**The DON'T-SHIP-and-wrong cost is concrete and load-bearing.** Every admin UI in scrml's lifetime pays the boilerplate tax unless tableFor lands.

## §3. 4-gate walk (per SPEC §53.14.4 discipline)

### Gate 1 — Per-shape sliver test

**Question:** does `tableFor(StructType, rows)` produce a distinct semantic shape vs every existing primitive?

**Existing primitives that render struct data:**
- Hand-rolled `<table>` + `for (let row of @rows) { <tr>...</tr> }` + per-column dispatch — adopter does field→column mapping manually + reinvents per-call-site
- `formFor(StructType)` — emits INPUT form (creation/editing flow), NOT display; different output kind
- `schemaFor(StructType)` — emits SQL DDL, NOT markup; different output kind
- `^{}` meta-block + `reflect(StructType)` + emit-string-templating — accessible only inside meta context; not a general-position primitive
- Inline iteration with manual per-cell `<tr>${row.field}</tr>` — N-field × M-cell-shape duplication per call site

**What tableFor adds (semantic shape distinct from all above):**
1. Compile-time walks struct fields → emits `<table><thead><tr><th>` per field + `<tbody><tr><td>` per (row, field).
2. Per-column rendering dispatch based on field type (string → text, date → formatted, enum → label, numeric → formatted).
3. Per-column slot overrides via §16 slots (sibling of formFor's slot-style customization per OQ-FF-1 verdict).
4. Sort/select/filter state surface auto-synthesized (e.g., `@table.sortedBy: TableSort` cell + `<th sortable>` click handlers).
5. Empty-state default (`<tr><td colspan=N>No rows</td></tr>`) automatically present.

This is NOT expressible by 1-2 line composition of existing predicates/refinement-types/family-members. The compile-time struct-walk + per-field dispatch + auto-synth state surface is the irreducible sliver.

**Verdict: ✅ PASS** — distinct sliver.

### Gate 2 — Synonym-detection precondition

**Question:** is `tableFor` structurally a synonym for an existing primitive or shipped surface?

**Candidate synonyms tested:**

| Candidate | Verdict | Reasoning |
|---|---|---|
| `for (let row of @rows) { <tr>${row.field}</tr> }` + manual `<thead>` + per-column dispatch | NOT synonym | Requires the adopter to write per-column code N times. tableFor's compile-time struct-walk is what's missing — adopters cannot get per-field automation without it. |
| A `<DataTable rows=@items columns=[{field:"name",label:"Name",render:...},...]/>` component | **closest synonym** (medium risk) | The column spec duplicates information the struct ALREADY carries (field names + types). tableFor's load-bearing value is the **derive-from-type** property; component approach requires re-stating the field list. ~70% of value covered by component approach; 30% (struct-walk automation, per-column dispatch from field types, sort surface auto-synth from struct) is the differentiator. |
| `formFor` | NOT synonym | Different output kind (input vs display); formFor produces `<form>`, tableFor produces `<table>`. |
| `schemaFor` | NOT synonym | Different output kind (DDL string vs markup). |
| Zod/standard-schema → table-renderer adapter | NOT applicable | Not in scrml ecosystem currently; would have to be invented. |
| `^{}` + `reflect()` + emit-string-templating | NOT a general-position synonym | Confined to meta-blocks; this is exactly the gap §53.14 was designed to close at general position. |

**The DataTable-component synonym is real but does NOT cover the load-bearing 30%** — the struct-walk + type-driven dispatch + auto-synth state are the differentiator. Synonym risk is LOWER than serialize (which was stashed S103 because wire-format covered ~99% of value) but HIGHER than schemaFor (whose synonym candidates all fell to <50% coverage).

**Verdict: ✅ PASS** — with note that the DataTable-component-as-synonym question is real and SHOULD be deliberated in deep-dive (potentially as a dedicated OQ).

### Gate 3 — Asymmetric-forfeit-cost decomposition

| Cell | Cost class | Reasoning |
|---|---|---|
| **SHIP-and-wrong** | LOW-MEDIUM | tableFor's slot grammar / sort surface / select surface bakes adopter-facing behavior. If wrong, walltime + backwards-compat shim cost (~10-20h to deprecate + v1.next migration brief). Output kind is markup (composes with §16 slots which have v0.next-stable shape); error-code surface is per-call-site. Recoverable. |
| **DON'T-SHIP-and-wrong** | MEDIUM-HIGH | Every admin UI hand-rolls table rendering with manual column-spec arrays. Trucking-dispatch + future adopters carry boilerplate forever. The L22 family discipline becomes incomplete (4 of 6 stays at 4 with serialize stashed + tableFor missing). Marketing claim "type-as-argument family covers admin-UI lift" loses substance. |
| **HYBRID-and-wrong** | HIGH | Ship a minimal tableFor (markup-element form, NO slot overrides, NO sort surface) → adopters DO use it for simple cases + hand-roll for complex → "I started with tableFor and now I can't get column dispatch" friction class. Worse than either pure path. |

**Asymmetry:** DON'T-SHIP cost dominates as L22 family ergonomics scale. SHIP-and-wrong is recoverable; DON'T-SHIP is forever-tax. **Verdict: ✅ PASS** — ship with sufficient surface that v1.0-out-of-scope items are listed explicitly (à la formFor / schemaFor patterns; defer auto-recurse / advanced sorts / pagination to v1.next).

### Gate 4 — Per-feature deep-dive when convener has any doubt

**Convener (PA) has doubt on the following axes — deep-dive REQUIRED:**

1. **Surface form** — markup-element `<tableFor for=Users rows=@items/>` (formFor precedent) vs function-call `${ tableFor(Users, @items) }` (schemaFor precedent) vs block-attribute `<table for=Users rows=@items>`. Output-kind-match per S103 verdict: tableFor's output IS markup (a `<table>` tree). PA lean: **markup-element form** based on output-kind match with formFor (also produces markup). BUT — per S103 surface-form-DEBATED rule, this MUST be debated, not PA-leaned-and-carried-forward. **DEBATE-MANDATORY.**
2. **Sort surface** — opt-in via `<th sortable>` attribute? Or auto-derive from `Sortable<T>` shape on struct? Default-on or default-off? What auto-synth state cell name? Does the sort state survive route navigation?
3. **Selection surface** — Gmail-style checkbox column auto-synth? `<tableFor selectable=@selectedIds/>` external binding? `<column select/>` per-column opt-in? What's the auto-synth cell shape?
4. **Filtering surface** — auto-synth filter-by-column UI? Or stay out of filter territory (adopter renders filter inputs separately + passes filtered `rows=`)? Risk: filter scope creep blows v1.0 deadline.
5. **Pagination** — auto-synth pagination controls? Or out-of-v1.0 (adopter handles pagination by slicing @rows)? PA lean: **out-of-v1.0**.
6. **Empty-state** — default markup (`<tr><td colspan=N>No rows</td></tr>`)? Custom override via slot `<empty>...</empty>`? What's the slot name?
7. **Per-column rendering dispatch** — text/date/enum/numeric primitives all have natural defaults; what's the override mechanism? §16 slots `<column field="status">...</column>` (formFor precedent OQ-FF-1)? `data.registerRenderer(...)` for type-driven defaults (OQ-FF-1 carry)?
8. **Field-set transforms** — `pick:`/`omit:` (schemaFor precedent §41.15.4). PA lean: **YES, family-vocabulary symmetry.**
9. **Cross-cutting with formFor + schemaFor** — should there be a unified `pick:`/`omit:` resolver shared across all three? Or each member implements independently? PA lean: **independent for v1.0; shared helper extraction is post-3rd-caller per S104 schemaFor precedent.**

Surface-form (OQ-TF-1) is DEBATE-MANDATORY per S103 rule. The other 8 OQs are deep-dive disposition territory (HIGH/MED-HIGH closes-in-deep-dive per S102 OQ-FF-7-skip rule; MEDIUM/LOW fires sub-debates).

**Verdict: ✅ PASS gates 1-3 + DEEP-DIVE REQUIRED per Gate 4.**

## §4. Initial OQ list (deep-dive starting set)

| ID | Question | PA lean | Confidence | Status |
|---|---|---|---|---|
| OQ-TF-1 | Surface form — markup-element vs function-call vs block-attribute? | markup-element (output-kind match with formFor) | MEDIUM (debate-mandatory per S103) | **DEBATE-MANDATORY** |
| OQ-TF-2 | Sort surface — opt-in `<th sortable>` vs auto-derive vs out-of-v1.0? | opt-in per-column `<column sortable>` slot attribute | MEDIUM | deep-dive |
| OQ-TF-3 | Selection surface — auto-synth Gmail-style checkbox column? | opt-in via `selectable=@cell` outer attribute (no auto-synth without explicit user wire-in) | MEDIUM | deep-dive |
| OQ-TF-4 | Filtering surface — in or out of v1.0? | OUT (adopter passes filtered rows) | MED-HIGH | deep-dive (no debate; user can ratify) |
| OQ-TF-5 | Pagination — in or out of v1.0? | OUT (adopter slices @rows) | MED-HIGH | deep-dive (no debate; user can ratify) |
| OQ-TF-6 | Empty-state default + slot override mechanism? | default markup + `<empty>` slot per §16 | HIGH | deep-dive close |
| OQ-TF-7 | Per-column rendering dispatch — slot grammar (formFor precedent) | `<column field="X">...</column>` slot syntax (OQ-FF-1 precedent 51.5/60) | MED-HIGH | deep-dive close |
| OQ-TF-8 | Field-set transforms — `pick:`/`omit:` family-vocabulary symmetry? | YES (sibling-vocabulary symmetry with schemaFor) | HIGH | deep-dive close |
| OQ-TF-9 | v1.0 scope — what's IN vs out (deferral list)? | IN: struct-walk + slot dispatch + pick/omit + empty-state + opt-in sortable. OUT: filtering / pagination / auto-recurse nested struct fields / `@label`/`@column` annotations | MED-HIGH | deep-dive (final close gate) |

Newly-surfaced OQs during the deep-dive itself are expected (schemaFor surfaced 2 newly-surfaced beyond the initial 10 per S103 deep-dive metrics).

## §5. Recommended next step

**Deep-dive dispatch** via `scrml-deep-dive` agent (model: opus, isolation: worktree, run_in_background). Mirrors schemaFor precedent (S103 deep-dive landed at `scrml-support/docs/deep-dives/schemaFor-design-2026-05-19.md`, 1581 lines).

**Deliverable:** `scrml-support/docs/deep-dives/tableFor-design-2026-05-XX.md` containing:
1. Per-OQ verdict with HIGH / MED-HIGH / MEDIUM / LOW confidence
2. OQ-TF-1 (surface form) presented in debate-ready form (3 positions: markup-element / function-call / block-attribute; OQ-FF-1 + OQ-SCH-1 judging precedents)
3. v1.0 scope list (IN vs OUT)
4. Anticipated SPEC §41.16 outline (sub-sections per formFor + schemaFor precedent shape)
5. Anticipated 6-10 `E-TABLEFOR-*` error codes for §34
6. Cost estimate for impl dispatch (likely ~10-20h based on formFor + schemaFor delivery shapes)

**Cost class:** ~6-10h deep-dive walltime + the surface-form debate (~2-4h) → ~10-14h total to spec-ready state. Impl dispatch follows (~10-20h estimated based on family precedent).

**Sequencing:** can run PARALLEL with Phase 3.B B2/B4 work (runtime-perf is orthogonal; tableFor is type-system + codegen). PA-direct B2 (~2-3h) can fire while the deep-dive runs in background.

## §6. Cross-references

- SPEC §53.14 — type-as-argument family discipline (this SCOPING's authority)
- SPEC §41.14 — formFor (markup-element sibling member)
- SPEC §41.15 — schemaFor (function-call sibling member + Form B precedent + Path-B pivot precedent)
- `docs/changes/formFor-scoping/SCOPING.md` — sibling SCOPING shape precedent
- `docs/changes/schemaFor-scoping/SCOPING.md` — sibling SCOPING shape precedent + 4-gate walk precedent
- `docs/changes/serialize-scoping/SCOPING.md` — STASH precedent (Gate 2 synonym-risk failure mode; useful contrast)
- `scrml-support/docs/type-as-argument-family-2026-05-06.md` — gate-keeping reference
- `examples/11-meta-programming.scrml:109-122` — DON'T-SHIP evidence (current `^{}` + reflect adopter path)
- `examples/07-admin-dashboard.scrml:127-150` — DON'T-SHIP evidence (hand-rolled admin table)
- S103 surface-form-DEBATED methodology rule (user-voice S103)
- S102 OQ-FF-7-skip methodology rule (HIGH/MED-HIGH closes-in-deep-dive)

## §7. Tags

#L22-family #tableFor #scoping #4-gate-walk-PASS #deep-dive-required #surface-form-debate-mandatory #s105 #admin-UI-lift #output-kind-markup #pick-omit-vocabulary-symmetry #s103-surface-form-rule
