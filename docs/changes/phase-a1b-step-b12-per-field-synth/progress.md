# A1b Step B12 — per-field synth surface — progress

Append-only log; timestamped lines.

## 2026-05-07 — Phase 0 — Survey + worktree alignment

- Worktree created at `agent-a87f0ff3917079b49` from origin/main (`a4eed93`).
  Local main was at `e4a12fd` (B11 SHIP) — rebased my worktree branch onto
  local main to start from B11.
- `bun install` clean. `bun run pretest` clean.
- Baseline test run on B11 SHIP: 9268 / 54 / 1 / 0 (matches dispatch's
  expected pass count; skip count differs from dispatch text 43→54 — non-
  blocking; test counts have drifted with the post-S67 fixture sweeps).
- Read mandatory inputs in full:
  - `docs/audits/a1b-b12-rule4-audit-2026-05-07.md` (8-point brief is normative).
  - `compiler/SPEC.md` §55.5–§55.7, §55.11 (per-field surface + cross-field).
  - `docs/PA-SCRML-PRIMER.md` §13.7 — B7 / B8 / B11 specifics blocks.
- Survey of B11 implementation surface in `compiler/src/symbol-table.ts`:
  - PASS 8 (`walkRegisterSynthSurface`) registers compound-level synth
    cells into the compound's `_scope`. Recurses into compound children
    so nested compounds get their own surface.
  - PASS 6 extension (`checkSynthAssignFire`, `checkSynthNestedAssignFire`)
    fires E-SYNTHESIZED-WRITE on writes to `@compound.{synthProp}` —
    explicitly REQUIRES `hit.path.length === receiverPath.length` so per-
    field paths are NOT fired today (B12's domain).
  - `lookupQualifiedStateCell` requires every intermediate segment to be
    `isCompoundParent` — won't descend through a regular field. B12 needs
    EITHER a per-field scope on each child decl OR a relaxed lookup
    descent rule.

## 2026-05-07 — Decision on per-field scope shape

Adopt: every COMPOUND CHILD that is NOT itself a compound parent gets a
fresh `Scope { kind:"field" }` attached as `declNode._scope`. B12 PASS 8
extension registers `{isValid, errors, touched}` (NOT `submitted`) into
that field-scope. `lookupQualifiedStateCell` extends to descend through
ANY cell that has `_scope` (not just compound parents) — clean and
matches the audit §1.4 hint that the prefix walk "will find them".

Why `kind:"field"`: aligns with existing ScopeKind enum semantics. The
field scope is a leaf — nothing else registers into it (only PASS 8's
B12 extension). Imports map empty; stateCells holds 3 synth records.

Compound-CHILD-that-IS-also-a-compound case: REVISED on closer reading
of B11's existing compound recursion + audit §1.1. B11 attaches a
`kind:"compound"` scope (NOT `kind:"field"`) on a compound-typed child;
that scope already holds the four compound-level synth records, which
serve as the per-field surface for that path (`@form.address.isValid`
resolves to a compound-level synth on `address`'s compound scope —
the per-field view IS the compound view here). To avoid duplicate /
conflicting synth registrations, B12 SKIPS per-field registration on
compound-typed children. Documented in `registerPerFieldSynthSurface`
+ tested in §B12.11.

## 2026-05-07 — Implementation landed (commits 3d4022b + 6e891a6)

- `compiler/src/symbol-table.ts`:
  - New `ScopeKind: "field"` (per-field synth scope discriminant).
  - New `PER_FIELD_SYNTH_PROPERTIES: ["isValid", "errors", "touched"]`.
  - `StateCellRecord.parentField?: StateCellRecord` (B12 discriminant).
  - `makePerFieldSynthRecord` + `registerPerFieldSynthSurface` helpers.
  - `registerCompoundSynthSurface` extended: after registering compound-
    level synth (B11), iterates non-synth children and calls
    `registerPerFieldSynthSurface` for each.
  - `lookupQualifiedStateCell` relaxed: descend through ANY cell with
    `_scope` (compound + field scopes uniformly).
  - `checkSynthAssignFire` + `checkSynthNestedAssignFire`: relaxed
    compound-parent guard; added `submitted` boundary skip for per-
    field receivers.
  - `getPerFieldSynthRecords(fieldDecl)` exported (sibling of
    `getSynthRecords`).
- `compiler/tests/unit/per-field-synth-surface.test.js`: 31 new tests
  covering 16 §B12 scenarios (pass).
- `compiler/tests/unit/synth-validity-surface.test.js`: §B11.11 boundary
  test rewritten (was "field has no _scope"; now "field has kind:'field'
  scope with 3 synth cells, no submitted") — preserves test intent.
- `docs/PA-SCRML-PRIMER.md` §13.7: B12 row added; B12 specifics block
  added.

Test deltas (FULL SUITE, post-B12):
- Pre-commit subset:    8544 → 8575 pass (+31), 0 fail.
- Full suite (post-commit hook): 9268 → 9299 pass (+31), 0 fail.
- Skip count: 54 (unchanged); todo: 1 (unchanged).

Time spent: ~2h total (survey 20min, impl 1h, tests 30min, docs 15min).
Within audit §3 estimate of 3-5h.

## 2026-05-07 — Final report scaffolding ready

- SURVEY.md drafted at `docs/changes/phase-a1b-step-b12-per-field-synth/SURVEY.md`.
- progress.md (this file) closed for B12.
- Ready for PA file-delta landing.
