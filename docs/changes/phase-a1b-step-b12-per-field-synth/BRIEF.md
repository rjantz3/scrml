# A1b Step B12 — Auto-synthesized validity surface (per-field) — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S68 open. Ready to dispatch once B11 lands. PA must update §"Main HEAD" + ensure B11 specifics in primer §13.7 are landed before firing.

**Estimate:** 3-5h (per audit; depth-of-survey-discount possible if B11's API is well-shaped).

**Sequencing:** STRICT SEQUENTIAL after B11. Extends B11's synth-cell registry to per-field scope.

**Parallelism note:** B12 + B13 may run in parallel after B11 lands (different code regions per B12 audit §1.7). When dispatching, fire B12 + B13 in the same message.

---

## Dispatch instructions for PA

When ready to dispatch:

1. Confirm B11 has landed (check `git log --oneline -5` for `feat(a1b-b11)`).
2. Confirm primer §13.7 has B11 row added with B11 specifics block.
3. Update §"Main HEAD" below to current main tip.
4. Dispatch via `general-purpose` (scrml-dev-pipeline fallback per pa.md) with `isolation: "worktree"` + `model: "opus"`.
5. Pass the entire content below the `---DISPATCH---` marker as the agent prompt.

---DISPATCH---

# Dispatch: A1b Step B12 — Auto-synthesized validity surface (per-field) + per-field E-SYNTHESIZED-WRITE

You are implementing **A1b Step B12** of the v0.2.0 migration. This is a COMPILER SOURCE dispatch (not spec-text-only). You are running as the substitute for `scrml-dev-pipeline` (per pa.md fallback rule; unavailable in this session).

Single-step dispatch. Returns a single PA-authored commit landing point per the file-delta protocol (your worktree branch is the scratch space; PA pulls files into main via `git checkout <your-branch> -- <files>`).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is provided by the harness. Before any other tool call:

1. Run `pwd` via Bash. Save the output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules` from main.
5. Run `bun run pretest` via Bash. This populates `samples/compilation-tests/dist/` for browser tests.
6. Run `bun run test` (chains pretest) to confirm baseline. Expected: post-B11 baseline. If different from main's last-recorded count, surface the delta but proceed.

If ANY check (1-3) fails: DO NOT proceed. Report the mismatch and exit.

**Path discipline — enforce on EVERY Read/Write/Edit call:**
- For Write/Edit: ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.
- NEVER use absolute paths starting with the main repo root directly.
- If a doc references `/home/bryan-maclee/scrmlMaster/scrmlTS/foo/bar.ts`, translate to `$WORKTREE_ROOT/foo/bar.ts` before writing.

## CRASH RECOVERY

Commit after each meaningful change — don't batch. Update `docs/changes/phase-a1b-step-b12-per-field-synth/progress.md` after each step. WIP commits are expected. If you crash, your commits and progress file are how the next agent picks up.

Branch name suggestion: `phase-a1b-step-b12-per-field-synth` (the harness may name it differently — that's fine; PA lands by file-delta, not branch name).

## CONTEXT — current state (post-B11)

- **Main HEAD:** `e4a12fd` (feat(a1b-b11): SHIP — auto-synthesized validity surface (compound rollup) + E-SYNTHESIZED-WRITE compound scope)
- **Phase A1a:** ✅ COMPLETE (S61).
- **Phase A1b:** IN FLIGHT.
  - **B1-B10** ✅ all shipped (see `master-list.md` §0.1 + primer §13.7 for details)
  - **B11** ✅ shipped at `e4a12fd` (S68). Synth-cell registry born via SYM PASS 8 (`walkRegisterSynthSurface`); compound-scope rollup; E-SYNTHESIZED-WRITE compound-scope dispatch joined to B8's PASS 6 walker. NO new DG edges (Phase 0 finding — B10 Phase 3 already wired cross-field validator-reads). Public read APIs `isSynthesizedCell(record)` + `getSynthRecords(compoundDecl)` exported from `compiler/src/symbol-table.ts`. See primer §13.7 B11 specifics block for full integration guide.
  - **B12 — THIS STEP**
  - B13 queued (parallel with B12; different code region — see B12 audit §1.7)
  - B14-B22 (Wave 4 + Wave 5) audited; not yet shipped

- **Locks active:** L1-L22. Critical for B12: L11 (auto-synth validity surface — compound + per-field, errors as enum tags).

## SCOPE — B12 step definition

Source of truth: `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.3 row B12.

**Locks:** L11.

**Estimate:** 3-5h (post-audit expansion).

**Driver:** `compiler/SPEC.md` §55.6 (per-field surface), §55.7 (synthesized-property semantics), §55.11 (cross-field validation), §6.11 (forward stub — superseded by §55).

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b12-rule4-audit-2026-05-07.md` (full file, ~166 lines).

The audit identified 1 substantive drift + 1 boundary-clarification. The 8-point brief expansion below incorporates them.

**Per pa.md Rule 4:** spec text is normative; SCOPE doc is derived. The audit reconciled SCOPE wording against §55.6 canonical. Trust the audit's reconciled brief, not the SCOPE row alone. If you encounter a divergence between the audit and §55 spec text during implementation, the spec wins — surface it via progress.md.

## REQUIRED B12 IMPLEMENTATION (per audit §2 — 8-point brief)

### 1. Per-field surface unconditional for ALL fields of compound parents

NOT just "validator-tagged child cells." Walk every CHILD of every compound parent (B5 `_cellKind === "compound-parent"`). For each field:
- Synthesize per-field synth cells: `isValid`, `errors`, `touched`.
- No-validator field gets TRIVIALLY-VALID defaults per §55.6 line 24444-24447 (L11 Edge B):
  - `isValid: true`
  - `errors: []` (empty array)
  - `touched: false`

### 2. Three properties per field, NOT four

B12 synthesizes `{isValid, errors, touched}` per field. **`submitted` is compound-level only** per §55.7 line 24458 — do NOT extend to per-field. (B11 already synthesizes the compound-level `submitted`.)

### 3. Type shapes per §55, NOT §6.11 stub

§55.6 canonical (line 24432-24435):
```
@signup.name.isValid     : boolean
@signup.name.errors      : [...errorTags]      // array of ValidationError tags
@signup.name.touched     : boolean
```

NOT §6.11 stub's `@x.field.error : string | not` (singular + string-typed). Use plural `errors` (array of `ValidationError` enum tags per §55.9).

### 4. E-SYNTHESIZED-WRITE walker extension — per-field receiver chain

B11 added the dispatch path at compound scope. B12 extends the SAME walker dispatch with per-field receiver-chain resolution:
- A write to `@signup.name.isValid = true` resolves through the receiver chain:
  - `@signup` → resolves to compound parent (B5 `_cellKind: "compound-parent"`).
  - `.name` → static property; resolves to compound child cell.
  - `.isValid` → synth-property name in dispatch set.
- B8's `findDeepestRegisteredOnPrefix` (per primer §13.7 B8 specifics) walks prefixes longest→shortest. B12's per-field synth-cells are registered at depth-2 (compound + field-name); the prefix walk will find them automatically once registered.

Walker reuse: B8's case 3 (in-compound derived sub-cell) already handles "receiver chain extends through compound parent." B12 reuses this exact pattern.

### 5. Cross-field deps consume B7's dep-graph

Per §55.6 line 24437-24443 (reactive recomputation):
- A change to `@signup.name` recomputes that field's surface.
- A change to a cell referenced in a cross-field predicate arg (e.g., `@signup.password` referenced from `<confirm req eq(@signup.password)>`) recomputes the dependent field's surface.
- The compound's `@signup.isValid` recomputes whenever ANY field's surface changes.

B12 emits dep-edges into B7's existing dep-graph; no new walker logic.

Per-field `isValid` reactive deps:
- The field's own cell value + the field's validator chain output.

Per-field cross-field deps:
- When a field's validator has a predicate arg referencing another cell (`eq(@signup.password)`), B12 emits a dep-edge from THIS field's surface to the referenced cell.

B11 already emits the compound-rollup dep-edge (compound `isValid` ← every field's `isValid`); B12 emits the per-field dep-edge (field `isValid` ← validator output ± cross-field deps).

### 6. `touched` runtime-hook annotations on per-field synth-cells

Same shape as B11's compound-level annotations (per primer §13.7 B11 specifics — to be added once B11 lands), but the hook target is the per-field cell, not the compound:
- Hook source: the field's bind:value or bind:checked target (if any) + the field's focus-out event.
- Latch behavior: elevate to `true` exactly once.
- Reset target: `reset(@signup.name)` reverts; `reset(@signup)` reverts the whole compound (each child resets transitively).

A1c codegen consumes these annotations. B12 (A1b) does NOT emit the actual runtime hooks.

### 7. Sequential after B11

B12 dispatch fires only after B11 lands. Survey gate verifies B11's synth-cell registry API supports per-field extension.

### 8. Phase-0 survey gate (mandatory, ~30-60min — likely shorter than B11's survey since B11 set the path)

Confirm:
- (a) B11's synth-cell registry exposes a "register child cell's synth-properties" API, or extension thereof.
- (b) B8's PASS 6 walker extension by B11 covers compound scope cleanly + supports the B12 per-field extension via deeper receiver-chain resolution.
- (c) B7's dep-graph public API supports B12 emitting cross-field edges (B11 confirmed; B12 reuses).
- (d) Existing test fixtures cover per-field case shapes (per-field-with-validator, per-field-no-validator, cross-field-via-eq-arg-on-field).

Survey may surface a depth-of-survey-discount per primer §12. Document findings in progress.md + SURVEY.md.

## OUT OF SCOPE for B12 (explicit)

- **Compound-level synth surface** — B11.
- **Compound-level E-SYNTHESIZED-WRITE** — B11.
- **E-DERIVED-WITH-VALIDATORS** — B13 (parallel with B12; do not touch derived-cell rejection).
- **Engine state-cell synth** — B14 territory.
- **A1c codegen** — runtime hook emission. B12 records annotations only.
- **`submitted` extension to per-field** — explicitly NOT B12's territory; §55.7 boundary.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md` §55 sections (canonical):
   - §55.6 (per-field surface) — primary normative source for B12
   - §55.7 (synthesized-property semantics)
   - §55.9 (ValidationError enum)
   - §55.11 (cross-field validation)
   - §55.13 (reset interaction)
   - **NOTE:** Use `grep -n "^### 55\." compiler/SPEC.md` to find current line numbers (shifted post-S68 A5-1 amendments).

2. `docs/PA-SCRML-PRIMER.md` §13.7 — annotated-AST contracts table; B7/B8/B11 specifics blocks.

3. `compiler/src/symbol-table.ts` — find B11's synth-cell registry + extend.

4. `compiler/src/dependency-graph.ts` — B7's API for emitting edges.

5. `compiler/src/validator-arg-parser.ts` — B9's `forEachIdentInValidators` for cross-field dep walking.

## TEST EXPECTATIONS

- All existing tests must remain green (post-B11 baseline; 0-fail is the contract).
- Add B12-specific tests:
  - Per-field surface registered for compound-with-validators on each field.
  - Per-field surface registered for compound-no-validators (trivially-valid defaults).
  - Per-field `submitted` NOT registered (boundary check).
  - E-SYNTHESIZED-WRITE fires on `@form.name.isValid = false` (per-field scope).
  - E-SYNTHESIZED-WRITE fires on `@form.name.errors = []` (per-field scope).
  - E-SYNTHESIZED-WRITE fires on `@form.name.touched = false` (per-field scope).
  - Cross-field predicate-arg dep emits per-field edge (e.g., `<confirm req eq(@form.password)>` → dep-edge from confirm.isValid to password cell).
  - Per-field rollup: compound `isValid` recomputes when ANY field's `isValid` changes.

## REPORTING — when complete

Write a final report block in `docs/changes/phase-a1b-step-b12-per-field-synth/progress.md` with:

1. **WORKTREE_PATH** (the absolute path).
2. **FINAL_SHA** (your branch's tip commit).
3. **FILES_TOUCHED** (list every file you modified or created — full paths from repo root).
4. **TEST_DELTA** (full-suite pass/skip/fail/todo counts; pre-commit subset counts).
5. **DEFERRED_ITEMS** (anything you noticed but consciously left out of B12's scope).
6. **OPEN_QUESTIONS** (anything you couldn't resolve).
7. **PRIMER §13.7 ROW DRAFT** — proposed row for B12 in the annotated-AST contracts table + B12 specifics block.
8. **SURVEY-NOTE** — file at `docs/changes/phase-a1b-step-b12-per-field-synth/SURVEY.md` with Phase-0 findings.

## METHODOLOGY RULES IN FORCE

- **pa.md Rule 1:** No marketing/article work — stay focused on B12.
- **pa.md Rule 2:** Production-language fidelity, not MVP.
- **pa.md Rule 3:** Right answer beats easy answer 99.999% of the time.
- **pa.md Rule 4:** Spec is normative; derived docs are NOT. Verify every spec-derivative claim against §55.6 directly.
- **No `--no-verify` on pre-commit hook unless explicitly authorized.**
- **Tree-shake-shakeable cost is acceptable** (S67 user-direction signal #2).

## CROSS-REFS for context

- `docs/audits/a1b-b12-rule4-audit-2026-05-07.md` — full audit (READ FIRST).
- `docs/audits/a1b-b11-rule4-audit-2026-05-07.md` — B11 audit (the registry B12 extends).
- `docs/audits/a1b-b8-rule4-audit-2026-05-07.md` — B8 audit (the walker B11/B12 extend).
- `docs/audits/a1b-b7-rule4-audit-2026-05-07.md` — B7 audit (the dep-graph B11/B12 emit into).
- `compiler/PIPELINE.md` — Stage SYM + Stage DG contracts.

You are authorized to land all work in your worktree. PA will review your file delta and land via `git checkout <branch> -- <files>` to main, single PA-authored commit. Report when complete.
