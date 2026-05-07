---
title: A1c roadmap — Rule 4 spec-faithfulness audit
date: 2026-05-07
session: S66
authority: PA-direct read of `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` against `compiler/SPEC.md`. Driver: pa.md "Design discipline" Rule 4 (spec is normative; derived planning docs are NOT).
status: AUDIT — flags drift only; no rewrite executed
---

# A1c roadmap — Rule 4 spec-faithfulness audit

## §0 Purpose

Pre-emptive Rule-4 application to the A1c (codegen+runtime) roadmap. A1c is the next major phase wave (24 steps, ~96-136h, ratified S60). Per the new pa.md Rule 4 — derived planning docs drift from spec; PA must verify spec-derivative claims before encoding them into briefs — the A1c SCOPE doc is read against `compiler/SPEC.md` to flag any drift now, before per-step dispatches anchor on derived-doc wording.

This audit produced:
- 1 substantive drift (validator catalog enumeration)
- 1 minor incompleteness (schema lowering table)
- Spot-checks on §51 (engines), §53 (refinement types), §6 (reset/default), §40.7 (program documentary attrs) — all consistent

PA writes; Bryan reviews. Drift items become per-step survey-must-resolve gates when the corresponding C-step dispatches fire.

---

## §1 Drift findings

### §1.1 [SUBSTANTIVE DRIFT] Validator catalog (SCOPE §3.4 / C6 vs SPEC §55.1)

**Claim in A1c SCOPE §3.4:**

> 14-predicate catalog (§55.1, L4) — `req`, `is some`, `length`, `pattern`, `min`, `max`, `gte`, `lte`, `eq`, `oneOf`, `email`, `url`, `numeric`, `integer`, `custom`. Each is a runtime function with documented semantics.

(Lists 15, despite saying 14 — counting error in the SCOPE doc.)

**Spec text (SPEC §55.1, lines 24267-24287):**

The "Universal-core predicates" table at SPEC §55.1 enumerates exactly 14 predicates:

1. `req`
2. `is some`
3. `length(predicate)`
4. `pattern(regex)`
5. `min(n)`
6. `max(n)`
7. `gt(expr)`
8. `lt(expr)`
9. `gte(expr)`
10. `lte(expr)`
11. `eq(expr)`
12. `neq(expr)`
13. `oneOf([...])`
14. `notIn([...])`

**Drift analysis:**

| Predicate | In SPEC §55.1 | In SCOPE / primer |
|---|---|---|
| req | ✓ | ✓ |
| is some | ✓ | ✓ |
| length | ✓ | ✓ |
| pattern | ✓ | ✓ |
| min | ✓ | ✓ |
| max | ✓ | ✓ |
| gt | ✓ | ✗ (missing from SCOPE list) |
| lt | ✓ | ✗ (missing from SCOPE list) |
| gte | ✓ | ✓ |
| lte | ✓ | ✓ |
| eq | ✓ | ✓ |
| neq | ✓ | ✗ (missing from SCOPE list) |
| oneOf | ✓ | ✓ |
| notIn | ✓ | ✗ (missing from SCOPE list) |
| email | ✗ (not in §55.1) | ✓ (in SCOPE) |
| url | ✗ (not in §55.1) | ✓ (in SCOPE) |
| numeric | ✗ (not in §55.1) | ✓ (in SCOPE) |
| integer | ✗ (not in §55.1) | ✓ (in SCOPE) |
| custom | ✗ (not in §55.1) | ✓ (in SCOPE) |

**Cross-check §55.9 ValidationError enum** (lines 24515-24533): the enum's tags align with SPEC §55.1's predicates — `Required`, `NotSome`, `LengthFailed`, `PatternMismatch`, `MinFailed`, `MaxFailed`, `GtFailed`, `LtFailed`, `GteFailed`, `LteFailed`, `EqFailed`, `NeqFailed`, `OneOfFailed`, `NotInFailed`, `Custom` — 14 + Custom (which §55.9 doc-line 24532 explicitly notes is "for developer-defined custom validators (Edge G)"). NO `EmailFailed`, `UrlFailed`, `NumericFailed`, `IntegerFailed` tags.

**Repo-wide grep** for `email validator|email predicate|url validator|numeric validator|integer validator|extended.predicate|domain.specific` against SPEC.md returns zero matches. Those predicates are NOT in the spec.

**Where the drift came from:** primer §10 stdlib catalog mentions `scrml:data` exports `email`, `url`, `numeric`, `integer` as PREDICATE BUILDERS in stdlib. They're stdlib helpers (data validators), NOT universal-core compile-time predicates. The SCOPE doc conflated the two surfaces. The primer §8 also has the conflation (lists `email, url, numeric, integer, custom` in the universal-core paragraph). Both derived docs drift the same way.

**Resolution path (Rule 4 per-step survey gate, when C6 fires):**
- Authoritative scope: SPEC §55.1's 14 predicates exactly. C6 emits runtime functions for those 14.
- `email`/`url`/`numeric`/`integer`/`custom` are SEPARATE surface — stdlib `scrml:data` helpers (already exist for v0.1.0; carry forward). They're not universal-core; they're library predicate-builders. C6 does NOT emit runtime support for them as universal-core entries.
- `custom` deserves its own treatment — SPEC §55.9 mentions `Custom(tag: string)` as a ValidationError tag for "developer-defined custom validators (Edge G)." Edge G is a separate spec section to find before C6 ships. **Survey requirement at C6 dispatch.**
- Primer §8 needs to be corrected to match SPEC §55.1 — separate cleanup commit.

### §1.2 [MINOR INCOMPLETENESS] Schema shared-core lowering (SCOPE §3.8 vs SPEC §55.4)

**Claim in A1c SCOPE §3.8:**

> req → NOT NULL, length(>=N) → CHECK ..., pattern(re) → CHECK ... REGEXP/~, min/max/gt/lt/gte/lte/eq/neq → CHECK, oneOf([...]) → CHECK ... IN(...).

**Spec text (SPEC §55.4 lines 24375-24385):**

| Shared-core predicate | Lowers to SQL DDL |
|---|---|
| `req` | `NOT NULL` |
| `length(>=N)` | `CHECK (length(col) >= N)` |
| `length(<=N)` | `CHECK (length(col) <= N)` |
| `pattern(re)` | `CHECK (col REGEXP '...')` (driver-dependent) |
| `min(n)` / `max(n)` | `CHECK (col >= n)` / `CHECK (col <= n)` |
| `oneOf([...])` | `CHECK (col IN (...))` |

**Drift analysis:**

SPEC §55.4 omits lowering rules for `gt`, `lt`, `gte`, `lte`, `eq`, `neq`, `notIn`. SCOPE §3.8 includes `gt/lt/gte/lte/eq/neq` (and matches §39 on REGEXP-driver-dependence — `~` in Postgres, `REGEXP` in SQLite/MySQL). The SCOPE addition is reasonable since the missing predicates are in §55.1's universal-core; they SHOULD lower. But spec text doesn't say.

**Resolution path:** at C17 dispatch, surface this gap. Either:
- (a) Spec amendment landing the full lowering table at §55.4 / §39.5.8 (right answer per Rule 3).
- (b) Document via a survey note that C17 implements the SCOPE-specified lowering until spec catches up.

Path (a) is cleaner. Path (b) keeps spec faithful + flags the spec as the bottleneck.

### §1.3 [SPOT-CHECK PASS] §51 engines (SCOPE §3.6 vs SPEC §51.0)

**SCOPE §3.6 claims:** state-machine runtime, current variant cell, transition table, initial state from `initial=` (or first variant if missing), `.advance(.event)` method, `<onTransition>` hook firing, `derived=expr` engine reactive variant, M16 auto-declared engine variable, M18 cross-file singleton mount, M20 components-vs-engines distinction.

**SPEC §51.0** (lines 19997-20050) confirms each: singleton state machine, `initial=` required (defaults to first variant — matches `W-ENGINE-INITIAL-MISSING`), wrapper-swap promotion preserves state-children, components-vs-engines (E-COMPONENT-ENGINE-SCOPE).

**No drift** at the surveyed depth. Per-step dispatches at C12-C15 should still survey-first per primer §12 + Rule 4, but the SCOPE doc is faithful at the architectural level.

### §1.4 [NOT YET AUDITED] §6.8 reset + default= γ semantics (SCOPE §3.3)

The §6.8 subsection numbering didn't surface in this pass (PA's grep targeted `^### §6.8` but the actual heading style differs). Surveyed via line scan. **Survey at C5 dispatch fully verifies.** Soft flag: SCOPE §3.3 lists 3 γ-semantic steps (defaultExpr, fall-back to init-expr, recursive compound) — these need cross-check against SPEC §6.8 prose at C5 time.

### §1.5 [SPOT-CHECK PASS] §53.4 three-zone model (SCOPE §3.7)

**SCOPE §3.7 claims:** static-zone elision, boundary-zone hook (server-fn entry, fetch result, file read), trusted-zone elision after first check.

**SPEC §53.4** ("Three-Zone Enforcement (SPARK Model)" line 23082): exists. Section title matches. SCOPE §9 ratified-decision #6 carved trusted-zone elision OUT of v0.2.0 (deferred to v0.3.0); only static-zone elision + boundary-zone hook in C16 scope. **Consistent.**

### §1.6 [SPOT-CHECK PASS] §40.7 `<program>` documentary attributes (SCOPE §3.10)

**SCOPE §3.10 claims:** `title`, `description`, `version`, `author`, `license` to HTML head; W-PROGRAM-TITLE-NESTED on nested `<program>` blocks (§43).

**SPEC §40.7** landed S59 (commit `4620290`) per master-list §0.4. Five documentary attributes ratified, W-PROGRAM-TITLE-NESTED warning added. **Consistent.**

---

## §2 Cross-doc drift propagation surface

The validator-catalog drift (§1.1) appears in multiple docs. Per Rule 4's "spec wins" rule, these all need correction (separately from C6 dispatch — they're doc cleanup, not implementation):

| Doc | Drift location | Action |
|---|---|---|
| `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §3.4 + §4.2 C6 | Lists `email/url/numeric/integer/custom` in the universal-core 14 | C6 dispatch brief must override SCOPE; emit only SPEC §55.1's actual 14 |
| `docs/PA-SCRML-PRIMER.md` §8 (line ~234) | Same conflation in the universal-core paragraph | Primer correction commit (separate, S66 housekeeping) |
| `compiler/SPEC.md` §55.4 lowering table | Missing `gt/lt/gte/lte/eq/neq/notIn` rows | Spec amendment at C17 dispatch (or now if Bryan authorizes) |

**No B-step or A1a doc was checked in this audit.** The Rule 4 audit is forward-looking against A1c. Past phases (A1a, A1b) are already substantially shipped; auditing them retroactively isn't load-bearing for upcoming work.

---

## §3 Per-step Rule-4 survey gates (pre-emptively documented)

For each C-step that touches a spec-derivative claim, the per-step survey MUST verify:

| C-step | Claim to verify | Spec section to consult |
|---|---|---|
| C0 | "feature-usage bitmap categories" — primer + SCOPE list bitmap fields; verify each maps to a real spec feature | §6, §51, §53, §55, §38, §39 (broad) |
| C1 | shape discriminator values (`plain` / `decl-with-spec` / `derived`) | §6.2 |
| C2 | derived-cell reactive computation (single dep tracking model) | §6.6 |
| C3 | `<x/>` use-site expansion semantics (multi-render L16) | §6.4, §6.6.17 |
| C4 | bind:* dispatch element-type matrix (input types, contenteditable, etc.) | §6.2 + §17 (Shape 2 details) |
| C5 | reset γ semantics (defaultExpr + init-expr fallback + compound recursion) | §6.8 |
| **C6** | **predicate catalog (the 14 of §55.1, NOT including email/url/numeric/integer)** | **§55.1 (load-bearing, drift §1.1)** |
| C7 | per-cell validator runner output shape (.isValid, .errors) | §55.5 + §55.9 (ValidationError enum) |
| C8 | compound rollup synthesis fields | §55.5 |
| C9 | cross-field dep wiring | §55.11 |
| C10 | 4-level message resolution chain | §55.10 |
| C11 | `<errors of=expr/>` element shape | §55.8 |
| C12 | engine state-machine runtime; initial state from `initial=` (or first variant) | §51.0 |
| C13 | `.advance(.event)` semantics + `<onTransition>` hook firing order | §51.0 |
| C14 | `derived=expr` engine | §51.0 + L20 |
| C15 | cross-file engine mount singleton; auto-declared engine variable (M16) | §21.8 + §51.0.D + M18 |
| C16 | refinement-type three-zone (static + boundary; trusted deferred to v0.3.0) | §53.4 |
| **C17** | **schema additive lowering — full table** | **§55.4 + §39.5.8 (incompleteness §1.2)** |
| C18 | channel WebSocket emission + auto-injected helpers | §38 |
| C19 | `<program>` head emission + W-PROGRAM-TITLE-NESTED | §40.7 + §43 |
| C20 | `pinned` import hoisting | §21.8 |
| C21 | Variant C compound + markup-typed derived | §6.3 + §6.6.17 |
| C22 | bare-variant inference resolved-form codegen | §14.10 (M9) |
| C23 | (docs only — no spec-derivative; describes shipped behavior) | (independent) |

This table is the per-step Rule-4 checklist for A1c dispatches.

---

## §4 Methodology note

This audit fired in ~30 minutes of PA-direct read time. Cost vs benefit:
- Cost: ~30min PA read + audit-doc commit
- Benefit: pre-empts at minimum the C6 dispatch error (would have shipped 5 fictitious universal-core predicates with runtime support for them, while missing 4 actual predicates `gt/lt/neq/notIn` — net error in both directions).

If Rule 4 had been in play in S65 dispatching the predicate-narrowing work, the same ~30min audit-against-spec would have caught the narrowing-error before it landed. Pre-empting one S65-class reversal saves an order of magnitude more time than the audit costs. **Recommended: PA-runs Rule 4 audit before EACH new dispatch wave.** Per pa.md operational rule for dispatch briefs: "Locate the spec section. Read the spec text. Confirm match. If mismatch: rewrite brief; the spec wins."

---

## §5 Tags

#a1c-roadmap #rule-4-audit #spec-faithfulness #drift-flagging #validator-catalog-drift #schema-lowering-incompleteness #pre-dispatch-survey-gates #s66
