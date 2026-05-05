# Progress: phase-a1a-step-12-existing-test-deltas

**Tier:** T2 (Standard) — bounded test/sample migration; SURVEY pre-staged with Q1+Q2 ratifications eliminates design ambiguity.

**Branch:** `phase-a1a-step-12-existing-test-deltas` (parented from `1e1ac10`).

**Mission:** Migrate first-appearance/decl-form `@x = init` to V5-strict `<x> = init` in samples (top-level + inside-`${...}`). Leave post-decl writes (`@x = newVal`) alone. 0-regression contract.

---

## Phase 1 — Verification (Step 11.5 cleanup completeness)

Phase 1 grep for `reactive-derived-decl` literal:

### compiler/src/ — 11 hits across 11 files

ALL hits are intentional Step 11.5 deprecation memorials/comments:
- `compiler/src/types/ast.ts:573` — `ReactiveDerivedDeclNode` interface retained as `@deprecated` external-consumer artifact. INTENTIONAL.
- All other src hits: `// Phase A1a Step 11.5 — reactive-derived-decl folded into state-decl` documentation comments (component-expander.ts, route-inference.ts, dependency-graph.ts, codegen/*, ast-builder.js, type-system.ts). INTENTIONAL.

### compiler/tests/ — 12 hits across 12 files

Inspection per file:
- `tests/integration/parse-shapes-v0next.test.js` — POSITIVE anti-fold-regression guards (`expect(retired).toEqual([])`). ASSERT absence. INTENTIONAL.
- `tests/unit/tab.test.js` — same anti-regression pattern. INTENTIONAL.
- `tests/integration/expr-node-corpus-invariant.test.js:90` — comment listing kinds. INTENTIONAL.
- `tests/unit/reactive-derived.test.js`, `tests/unit/derived-reactive-markup-wiring.test.js`, `tests/unit/type-encoding-phase2.test.js`, `tests/unit/code-generator.test.js`, `tests/unit/collectexpr-newline-boundary.test.js`, `tests/unit/dependency-graph.test.js`, `tests/self-host/ast.test.js` — all comment memorials. INTENTIONAL.
- `tests/lsp/analysis.test.js:36` — test description string `it("populates analysis.reactiveVars for 'reactive-derived-decl'", ...)`. COSMETIC; describes what the test checks. Currently uses old kind name. UPDATE recommended (low priority).
- `tests/unit/gauntlet-s24/scope-001-logic-expr.test.js:342` — test description string `test("undeclared ident in reactive-derived-decl init → E-SCOPE-001", ...)`. COSMETIC. UPDATE recommended (low priority).

**Phase 1 disposition:** All `reactive-derived-decl` survivors are intentional — Step 11.5 cleanup IS complete in spirit. Two cosmetic test descriptions in `lsp/analysis.test.js` and `gauntlet-s24/scope-001-logic-expr.test.js` use the old kind name in their `it/test` description strings. These are NOT structural — the tests themselves probe `state-decl{shape:"derived"}` post-fold. Will update the description strings as a courtesy in Phase 2.

---

## Baseline test counts

Before Step 12 work:
- Stable run: **8,878 pass / 44 skip / 0 fail / 8,922 tests across 439 files**.
- One run showed 2 ECONNREFUSED browser-test flakes (intermittent — recoverable).

---

## Plan

- [P1] Started — branch `phase-a1a-step-12-existing-test-deltas` created from `1e1ac10`.
- [P1] Phase 1 verification grep complete; survivors documented above.
- [P2] Phase 2 attempted — Top-level Shape 1 rewrite blocked by parser gap (see below).
- [P2] Phase 2 reverted; the 3 top-level samples cannot be mechanically rewritten in Step 12.
- [P3] Next: Phase 3 — inside-`${...}` rewrites (which DO work per Step 11 implementation).

---

## CRITICAL FINDING — Phase 2 parser gap (top-level Shape 1 not implemented)

**Per dispatch §risk-surface "Sample regression" rule, surfaced before continuing.**

### What was attempted

Per SURVEY §3 step 2 + S61 Q2 ratification, rewrite the following 3 top-level decl-form `@x = init`s to V5-strict `<x> = init`:

1. `samples/compilation-tests/test-002-with-logic.scrml`: `@counter = 0` → `<counter> = 0`
2. `samples/compilation-tests/test-009-test-reactive.scrml`: `@value = 42` → `<value> = 42`
3. `samples/compilation-tests/modern-003-full-app.scrml`: `@users = []` → `<users> = []`, `@filter = "all"` → `<filter> = "all"`

### What broke

ALL THREE rewrites compile-fail with **E-CTX-003 (BS stage)**: "Unclosed 'counter' — opened but never closed before end of file."

Root cause: the BS stage (`compiler/src/block-splitter.js`) treats `<count>` (no whitespace after `<`) as an HTML markup tag opener (per SPEC §4.1, lines 1034-1085). The `<count>` opener pushes a markup context that is never closed → E-CTX-003. The `= 0` after the tag does NOT trigger state-decl recognition at top-level. The legacy `@counter = 0` works at top-level because BS treats the `@`-prefixed line as raw text → ast-builder picks it up later.

### Why this is a parser gap, not a Step 12 bug

Every Shape 1 / V5-strict structural test in the codebase places the form inside a `${...}` logic block:

```scrml
<program>${ <count> = 0 }</program>      // EVERY parse-shapes-v0next.test.js Shape 1 case
```

There is **no test, no sample, anywhere**, exercising top-level (file-level outside `${...}`) Shape 1 form. Step 11.0a (decl-form recognizer) and Step 11.0b (sibling separator) both work inside logic blocks. Top-level structural Shape 1 is **documented in SPEC §6.2 as canonical** (lines 1771-1775 show `<count> = 0` at apparent file-top-level), but the parser implementation only honors it inside `${...}`.

This matches BRIEF §4 risk surface: "If the V5-strict form doesn't compile in a context where `@x = init` did, that's a parser gap that surfaces a follow-up task (likely back to A1a Steps 4 / 11.0a or to A1b territory)."

### Disposition for these 3 files

**Step 12 cannot mechanically rewrite these 3 top-level samples.** Options for follow-up:

- **Option F1** — Future A1a Step (a possible Step 11.0d or A1b work): extend BS to recognize top-level `<NAME> = init` as a state-decl block (parallel to existing inside-`${...}` recognition). Maintains zero-restructure migration story.
- **Option F2** — Restructure the 3 samples to wrap state-decls in `<program>${ ... }</program>`. Substantive sample rewrites; arguably out-of-scope for "test-delta cleanup."
- **Option F3** — Leave the 3 top-level `@x = init` legacy forms alone indefinitely; document that file-top-level decls remain on the legacy `@`-form until parser support catches up.

Reverted my 3 attempted edits. Files restored to legacy form.

### Impact on Step 12 scope

- **Phase 2 (top-level rewrites):** 0 of 3 completed. Surfaces follow-up task (P-FUP-1: top-level structural Shape 1 in BS).
- **Phase 3 (inside-`${...}` rewrites):** Still in scope; inside-`${...}` recognition works per Step 11 work and existing test coverage. Proceeding.
- **Phase 4 (anti-html-fragment guard):** Still in scope on Phase 3 rewrites.
- **Effort delta:** Phase 2 abandoned saves time; Phase 3 dynamic classify still needed.

---

## Phase 3 — inside-`${...}` REWRITES

### Tooling built (commit history)

1. `scripts/step12-classify.mjs` — per-file classifier.
2. `scripts/step12-batch-classify.mjs` — recursive batch classifier with category buckets.
3. `scripts/step12-rewrite.mjs` — applies the rewrite mechanically using the classifier.
4. `scripts/step12-compile-snapshot.mjs` — pre/post parse-snapshot.
5. `scripts/step12-validate-batch.mjs` — detects batch-induced AST decl loss (parser-bug regression detector).

### Classifier categories

| Category | Disposition |
|---|---|
| DECL-CANDIDATE | REWRITE — first-appearance/decl `@x = init` inside `${...}` |
| TOPLEVEL-BLOCKED | LEAVE — Phase 2 parser gap (P-FUP-1) |
| LEGACY-COMPLEX | LEAVE — `server`/`shared`/`const` modifier; out of Step 12 scope |
| HAIRY-SELF-REF | LEAVE — degenerate `@x = @x + 1` first-appearance pattern |
| WRITE | LEAVE — post-decl write per SPEC §6.1.2 canonical write form |

Across `samples/compilation-tests/` (786 files): **383 DECL-CANDIDATE sites** in 182 distinct files.

### Batch 1 — pretest samples (commit `f5601e7`)

Rewrote 30 sites in 10 files (the 12 pretest samples from `scripts/compile-test-samples.sh` minus 2 with no DECL-CANDIDATE):
- combined-001-counter (1)
- combined-002-todo (2)
- combined-003-form-validation (4)
- combined-021-component-basic (4)
- control-011-if-reactive (1)
- reactive-014-form-state (4)
- reactive-016-bind-value (6)
- reactive-017-arrays (3)
- reactive-018-class-binding (4)
- transition-001-basic (1)

Pretest: All 12 samples compile cleanly post-rewrite.
Test: 8878 pass / 44 skip / 0 fail (0 regressions).

### Batch 2 — bulk rewrite (commit `42ac133`)

Rewrote 353 sites in 170 files — all of `samples/compilation-tests/` containing DECL-CANDIDATE sites.

Classifier fix landed in this batch: structural-form decls (`<x> = init`) now correctly register as "name decl'd" so subsequent legacy `@x = newval` writes are NOT misclassified as new decls. Critical for files mixing structural decl + legacy writes.

Test: 8878 pass / 44 skip / 0 fail (0 regressions).

### Batch 3 — revert 5 files (commit `e96888a`)

**SECOND CRITICAL FINDING — parser bug P-FUP-2.** 

Discovered batch-2 rewrites in 5 files dropped state-decl AST counts. Root cause: the parser bug `<x> = not\n<y>` boundary in V5-strict structural form loses subsequent siblings (parser stops scanning at `not`). Pre-batch-2 (with legacy `@x = not`), the parser correctly continued across the newline.

Files reverted to legacy `@-form` decls (decl count delta):
- `combined-007-crud.scrml` (-6)
- `gauntlet-r10-go-contacts.scrml` (-8)
- `gauntlet-r10-odin-filebrowser.scrml` (-32)
- `gauntlet-r10-rails-blog.scrml` (-12)
- `integration-001-stripe-mini.scrml` (-11)

These files keep their legacy `@x = init` decl form pending parser fix (separate follow-up: **P-FUP-2** — `<x> = not` newline-as-separator gap in BS or TAB).

`scripts/step12-validate-batch.mjs` formalizes the regression detection mechanism.

Test: 8878 pass / 44 skip / 0 fail (still 0 regressions).

### Batch 4 — cosmetic Phase 1 cleanup

Two cosmetic test description string updates (using legacy `reactive-derived-decl` kind name):
- `compiler/tests/lsp/analysis.test.js:36` — `it("populates analysis.reactiveVars for derived state-decl (const @x; post-Step-11.5 fold)")`.
- `compiler/tests/unit/gauntlet-s24/scope-001-logic-expr.test.js:342` — `test("undeclared ident in derived state-decl init (const @x) → E-SCOPE-001")`.

Tests still pass after edit.

---

## Out-of-scope decisions

### Broader `samples/` directory NOT extended

Initial classifier sweep showed 624 sites in 858 files across the broader `samples/` directory (not just `samples/compilation-tests/`). Attempted broader rewrite encountered the same `<x> = not` parser bug + lacks test coverage to validate correctness. SURVEY §5 also explicitly scoped to `samples/compilation-tests/`.

Decision: **broader `samples/` left in legacy `@-form`.** Step 12 deliberately stops at the SURVEY-scoped boundary. Future migration after P-FUP-2 lands.

### Phase 4 (anti-html-fragment guard sweep) — not separately needed

Per BRIEF §4 / §6.3, anti-html-fragment guards are required on rewritten POSITIVE PARSE TESTS. The Step 12 rewrites land in SAMPLE FILES, not parse tests — sample files don't carry their own assertions. The 12 pretest samples ARE compiled by browser tests, but those tests verify behavior, not AST shape. The structural rewrite IS the V5-strict canon upgrade — there's no AST shape to "upgrade" on the parse-test side. Phase 4 is therefore a NO-OP for Step 12 (no positive parse tests rewritten as part of Step 12).

If future work involves rewriting positive parse tests (e.g., in `compiler/tests/integration/parse-shapes-v0next.test.js`), the BRIEF guidance applies — but no such rewrites were needed for Step 12.

### Transition-decl tests (5 files) — Q1 ratified OUT-OF-SCOPE

Per SURVEY Q1, the 5 unit test files in `compiler/tests/unit/transition-decl-*.test.js` are owned by P3 (deprecation) + A2 (engine impl). Step 12 did NOT touch them.

### Stdlib + self-host — out of scope per SURVEY §2.7

`stdlib/` (42 files) and `compiler/self-host/` are parity-lagged per Step 4-7 policy. Step 12 did NOT touch them.

---

## Final stats

`git diff --stat 1e1ac10..HEAD -- samples/compilation-tests/`:

```
175 files changed, 330 insertions(+), 330 deletions(-)
```

(Each Step 12 rewrite is a 1-line swap `@<name> = init` ↔ `<<name>> = init`. Insert/delete count of 330 each = 330 rewrite sites.)

Plus 2 cosmetic test description edits in `compiler/tests/lsp/analysis.test.js` and `compiler/tests/unit/gauntlet-s24/scope-001-logic-expr.test.js`.

| Metric | Count |
|---|---|
| Files rewritten (samples) | **175** in `samples/compilation-tests/` |
| Sites rewritten | **330** |
| Files reverted (P-FUP-2 parser bug) | 5 (kept legacy `@-form`) |
| Cosmetic test edits | 2 (description strings) |
| Files modified outside samples/compilation-tests/ | 0 (broader `samples/` left in legacy form) |
| Tests added | 0 |
| Tests dropped | 0 |

---

## Test counts

- Baseline: 8,878 pass / 44 skip / 0 fail / 8,922 tests across 439 files.
- Post-Step-12: **8,878 pass / 44 skip / 0 fail / 8,922 tests across 439 files** — IDENTICAL.

Zero regressions. Zero new tests (Step 12 mission was sample/test migration; no behavior changes).

---

## Follow-up tasks surfaced

| ID | Description | Owner |
|---|---|---|
| P-FUP-1 | Top-level structural Shape 1 `<NAME> = init` recognition in BS | Future A1a or A1b |
| P-FUP-2 | `<x> = not\n<y>` newline-as-separator boundary fix in BS or TAB | Future A1a (likely Step 11.0e or follow-on) |

Both are PARSER bugs — not test-delta concerns. They surface real gaps in Step 11's V5-strict structural decl support that this Step 12 work uncovered.
