# A1b Step B13 — E-DERIVED-WITH-VALIDATORS + Level-1 inline-override extraction — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S68 open. Ready to dispatch once B11 lands. PA must update §"Main HEAD" before firing.

**Estimate:** 4-6h (per audit; depth-of-survey-discount possible if existing parse-Step-5 already extracts string-literal trailing args).

**Sequencing:** Sequential after B10 (B10 catalog needed for predicate-name-to-type-signature lookups). Independent of B11/B12 in code region — can run **PARALLEL with B12** post-B11-land.

**Parallelism note:** B12 + B13 may run in parallel after B11 lands (different code regions per B12 audit §1.7; B13 walks derived state-decls with validators — different walker territory from B12's per-field synth).

---

## Dispatch instructions for PA

When ready to dispatch (typically same time as B12):

1. Confirm B11 has landed (check `git log --oneline -5` for `feat(a1b-b11)`).
2. Update §"Main HEAD" below to current main tip post-B11.
3. Dispatch via `general-purpose` (scrml-dev-pipeline fallback per pa.md) with `isolation: "worktree"` + `model: "opus"`.
4. Pass the entire content below the `---DISPATCH---` marker as the agent prompt.
5. Fire B12 + B13 dispatches in the same message for parallel execution.

---DISPATCH---

# Dispatch: A1b Step B13 — E-DERIVED-WITH-VALIDATORS + 4-level error-message resolution-chain Level-1 recording

You are implementing **A1b Step B13** of the v0.2.0 migration. This is a COMPILER SOURCE dispatch (not spec-text-only). You are running as the substitute for `scrml-dev-pipeline` (per pa.md fallback rule; unavailable in this session).

Single-step dispatch. Returns a single PA-authored commit landing point per the file-delta protocol (your worktree branch is the scratch space; PA pulls files into main via `git checkout <your-branch> -- <files>`).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is provided by the harness. Before any other tool call:

1. Run `pwd` via Bash. Save the output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash.
5. Run `bun run pretest` via Bash.
6. Run `bun run test` (chains pretest) to confirm baseline.

If ANY check (1-3) fails: DO NOT proceed. Report the mismatch and exit.

**Path discipline — enforce on EVERY Read/Write/Edit call:**
- For Write/Edit: ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.
- NEVER use absolute paths starting with the main repo root directly.
- If a doc references `/home/bryan-maclee/scrmlMaster/scrmlTS/foo/bar.ts`, translate to `$WORKTREE_ROOT/foo/bar.ts`.

## CRASH RECOVERY

Commit after each meaningful change — don't batch. Update `docs/changes/phase-a1b-step-b13-derived-with-validators/progress.md` after each step. WIP commits expected. If you crash, your commits and progress file are how the next agent picks up.

Branch name suggestion: `phase-a1b-step-b13-derived-with-validators` (the harness may name it differently — that's fine; PA lands by file-delta).

## CONTEXT — current state (post-B11)

- **Main HEAD:** `e4a12fd` (feat(a1b-b11): SHIP — auto-synthesized validity surface (compound rollup) + E-SYNTHESIZED-WRITE compound scope)
- **Phase A1a:** ✅ COMPLETE (S61).
- **Phase A1b:** IN FLIGHT.
  - **B1-B10** ✅ all shipped
  - **B11** ✅ shipped (synth-cell registry + compound-rollup + E-SYNTHESIZED-WRITE compound-scope)
  - **B12** in flight in parallel (per-field synth surface — different code region from B13)
  - **B13 — THIS STEP**
  - B14-B22 (Wave 4 + Wave 5) audited; not yet shipped

**Parallelism with B12:** B13 walks derived state-decls with validators (B5 `isConst: true` + `validators.length > 0` predicate); B12 walks compound-parents per-field. Different code regions. Both may touch `compiler/src/symbol-table.ts` but in distinct walker passes/regions. File-delta landing handles the merge.

- **Locks active:** L1-L22. Critical for B13: L4 (partial validator vocabulary unification), L11 (auto-synth validity surface — derived cells excluded), L12 (4-level error-message resolution chain).

## SCOPE — B13 step definition

Source of truth: `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.3 row B13.

**Bundled work items (the audit confirms keeping bundled):**
1. `E-DERIVED-WITH-VALIDATORS` rejection (derived cells reject validator attrs).
2. 4-level error-message resolution-chain Level-1 recording (per-validator inline-override extraction).

**Locks:** none (closes Wave 3).

**Estimate:** 4-6h (per audit).

**Driver:** `compiler/SPEC.md` §55.14 (derived-cell rejection + engine-cell coexistence), §55.10 (4-level resolution chain), §55.7, §55.9, §53 (refinement types — alternative for derived cells), §41.12 (registerMessages API), §34 catalog.

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b13-rule4-audit-2026-05-07.md` (full file, ~187 lines).

The audit identified 1 substantive scope-clarification + 1 SCOPE-vs-spec timing drift + 1 boundary clarification. The 9-point brief expansion below incorporates them.

**Per pa.md Rule 4:** spec text is normative; SCOPE doc is derived. The audit reconciled SCOPE wording against §55.14 + §55.10 canonical. Trust the audit's reconciled brief.

## REQUIRED B13 IMPLEMENTATION (per audit §2 — 9-point brief)

### 1. Fire E-DERIVED-WITH-VALIDATORS at A1b (NOT parse-time)

**Spec §55.14 line 24691** says "parse-time" — operationally imprecise. The shape-discriminant logic at parse-time is intentionally permissive (Step 5 collected validators on every Shape-2-shaped decl, including derived ones).

**B13 fires the rejection at A1b** (resolve-type stage) per the operational reality:
- Walk every state-decl.
- Dispatch on `decl.isConst === true` AND `decl.validators?.length > 0`.
- Per primer §13.7 B6 specifics: `decl.isConst:true` is the canonical derived-cell discriminator.
- Fire `E-DERIVED-WITH-VALIDATORS` (§34 catalog).

### 2. Bundle remains as ONE walker pass

Single visit per state-decl handles both:
- (a) Derived-with-validators rejection.
- (b) Inline-override extraction (Level 1 of §55.10 chain) for non-derived cells.

Walker dispatches:
- If decl is derived (`isConst: true`) AND has validators → fire `E-DERIVED-WITH-VALIDATORS`, skip rest of validator processing on this decl.
- Else, for each validator: record inline-override if present (Level 1); record level-2-fallback marker for A1c.

Single B13 dispatch; no split.

### 3. Inline-override extraction (Level-1 of §55.10 chain)

Per §55.10 line 24565+:
```scrml
<name req("Please enter your name") length(>=2, "Name must be at least 2 chars")> = <input/>
```
Per-field, per-validator. Static-string only.

Implementation:
- Walk each `validator: ValidatorEntry` on each state-decl.
- If the validator has an inline string-literal trailing argument (per §55.10 convention — last arg is the override string when present), extract onto the validator record as `inlineOverride: string | null`.
- Annotation feeds A1c codegen, which emits the `messageFor` lookup logic.

The B9 + B10 work shaped `ValidatorEntry.args` as `ValidatorArg[] | null` (where each arg is `ExprNode` or `RelationalPredicateNode`). For B13's purpose:
- Inspect the last arg of each validator's `args` array.
- If it's a string literal (`{kind:"lit", litType:"string"}` per primer §13.7 B9 specifics' AST shape recognition map), extract its value as `inlineOverride`.
- If it's anything else (number, regex, expression, identifier ref, etc.), `inlineOverride: null` for that validator.

### 4. Static-string-only enforcement (L12 Edge F)

Per §55.10 line 24569-24570:
> "Static-string only (per L12 Edge F — no expression interpolation; no `${}` inside the message). Reasoning: messages should be statically extractable for i18n tooling; expressions defeat that."

If the inline override (last arg in a context where Level-1 override is expected) is anything OTHER than a string literal — i.e., a dynamic expression — fire an error.

**Phase-0 survey item:** `grep -n "E-VALIDATOR-\|E-MESSAGE-\|L12 Edge F" compiler/SPEC.md`. If §34 has no row for "dynamic inline message override," B13 needs to add one (likely `E-VALIDATOR-INLINE-DYNAMIC` or similar — verify §34 catalog naming convention).

If the catalog row needs to be added, include the §34 amendment as part of B13's spec-prose commit (cite §55.10 as the source-of-truth normative wording).

**Concrete behavior:** the override-arg position is the LAST positional arg of a validator. The validator's catalog signature (B10's `validator-catalog.ts`) defines arity:
- `arity: "0+inline"` (e.g., `req`) — bareword OR with inline string-literal override.
- `arity: "1+inline"` (e.g., `length(>=2)`) — one required arg + optional inline override.

Per primer §13.7 B10 specifics. B13 reads the catalog signature to determine which arg position is the inline-override slot, then validates static-string-only at that position.

### 5. Engine state-cell exception

Engine auto-declared cells are NOT `isConst` (they're not `const <x>`). The walker check `isConst: true && validators.length > 0` already skips them silently per §55.14.

If B14 (engine binding, downstream) introduces a `_cellKind: "engine"` annotation, the walker should still skip those — engine validators are LEGAL but typically REDUNDANT per §55.14 line 24681-24687, and `rule=` is the canonical engine-state constraint. No B13 enforcement on engine cells.

### 6. Engine-derived rejection — defer if B14 not yet shipped

Per §55.14 line 24689:
> "Validators on derived cells (`const <x ...>` or `<engine derived=>`): REJECTED."

Both forms are rejected:
- `const <x req> = expr` — Shape-3 derived with validator attr (covered by B13's `isConst: true` check).
- `<engine for=Phase derived=expr>` with validator attrs — engine-derived case; rarer.

**Phase-0 survey item:** check if engine-derived state-decls are reachable at A1b stage (i.e., does the parser produce a state-decl-shaped node for engine-derived cells, or is engine-derived a different AST kind reachable only post-B14?).

If engine-derived requires B14 annotations to detect, defer the engine-derived case to B13.5 or B14 follow-up. Document the deferral in progress.md.

### 7. Error message includes refinement-type alternative

Per §55.14 line 24692-24694:
> "If the developer wants validation on a derived value, they should add a refinement type (`const <x>: number(>=0) = ...`) — that is the type-level invariant equivalent."

The error message for `E-DERIVED-WITH-VALIDATORS` SHOULD suggest the refinement-type alternative:
> "E-DERIVED-WITH-VALIDATORS at line N: derived cell `<derivedName>` cannot have validators. Did you mean `const <derivedName>: <type>(<predicate>) = ...`? Refinement-type predicates are the type-level invariant for derived values. (Cross-ref §55.14, §53.)"

User-facing message quality. Modest implementation; brief addition.

### 8. Sequencing

B13 strictly after:
- B5 (cellKind annotation) ✅
- B9 (validator-arg ExprNode shape) ✅
- B10 (validator catalog — for inline-override slot lookup) ✅

Independent of B11/B12 in code region. **Can run parallel with B12** (different walker territory).

Wave-3 closer: after B13 lands, Wave 3 (validator + surface) is functionally complete pending engine-derived edge case (B14 follow-up if deferred per §1.6).

### 9. Phase-0 survey gate (mandatory, ~30-60min)

Confirm:
- (a) §34 catalog row for "dynamic inline message override" (§1.4 above) — exists? OR B13 needs to add one.
- (b) §55.14 line 24691 "parse-time" wording — is consistent with A1b implementation? Recommend small spec-prose footnote follow-up parallel to §6.6.8/§6.6.10 footnote precedents (small commit; not blocking B13).
- (c) B14 sequencing — engine-derived state-decls reachable at A1b? Defer if not.
- (d) `decl.isConst` annotation reliability across parser test corpus.
- (e) String-literal extraction from validator args — does B9's `decorateValidatorsWithExprNodes` already preserve string-literal args in a way that B13 can read directly? Per primer §13.7 B9 specifics, strings parse to `{kind:"lit", litType:"string"}`. Confirm fixture coverage.

Survey may surface a depth-of-survey-discount per primer §12. Document findings in progress.md + SURVEY.md.

## OUT OF SCOPE for B13 (explicit)

- **Levels 2/3/4 of the resolution chain** (project-registered / data-defaults / match-escape) — A1c codegen reads B13's annotations and emits the lookup logic. B13 only records Level 1 (inline override).
- **Compound-rollup synth** — B11.
- **Per-field synth** — B12.
- **Engine binding** — B14.
- **A1c codegen** for the messageFor lookup — downstream.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md` §55 sections (canonical):
   - §55.7 (synthesized-property semantics)
   - §55.9 (ValidationError enum)
   - §55.10 (4-level message resolution chain) — primary normative source for Level 1 recording
   - §55.14 (engine + derived cells) — primary normative source for derived-with-validators rejection
   - §53 (refinement types — alternative for derived cells; for error-message wording)
   - §41.12 (registerMessages API — Level 2 of chain; context only)
   - **NOTE:** Use `grep -n "^### 55\." compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §13.7 — annotated-AST contracts; B5/B6/B9/B10 specifics blocks.

3. `compiler/src/symbol-table.ts` — find appropriate location for the new walker pass.

4. `compiler/src/validator-catalog.ts` — B10's catalog with arity signatures (`"0+inline"`, `"1+inline"`).

5. `compiler/src/validator-arg-parser.ts` — B9's `ValidatorArg` types + arg-walking infrastructure.

## TEST EXPECTATIONS

- All existing tests must remain green.
- Add B13-specific tests:
  - `const <x req> = expr` → fires `E-DERIVED-WITH-VALIDATORS`.
  - `const <x length(>=2)> = expr` → fires `E-DERIVED-WITH-VALIDATORS`.
  - `const <x>: number(>=0) = expr` (refinement-type form) → ALLOWED (predicate is on type, not on cell decl).
  - Plain non-derived `<name req("...")>` → records `inlineOverride: "..."`.
  - Plain non-derived `<name req>` (no inline override) → records `inlineOverride: null`.
  - Plain non-derived `<name length(>=2, "Too short")>` → records `inlineOverride: "Too short"` for the length validator.
  - Dynamic inline override (`req(${msg})`) → fires `E-VALIDATOR-INLINE-DYNAMIC` (or per-survey naming).
  - Engine state-cell with validator (e.g., engine cell + `oneOf([...])`) → silently passes (NOT derived, validators legal).
  - Refinement-type alternative is mentioned in error message text.

## REPORTING — when complete

Write a final report block in `docs/changes/phase-a1b-step-b13-derived-with-validators/progress.md` with:

1. **WORKTREE_PATH** (the absolute path).
2. **FINAL_SHA** (your branch's tip commit).
3. **FILES_TOUCHED** (list every file you modified or created — full paths from repo root).
4. **TEST_DELTA** (full-suite pass/skip/fail/todo counts; pre-commit subset counts).
5. **DEFERRED_ITEMS** (engine-derived case if deferred; spec-prose §55.14 timing footnote if recommended).
6. **OPEN_QUESTIONS** (anything you couldn't resolve).
7. **PRIMER §13.7 ROW DRAFT** — proposed row for B13 in the annotated-AST contracts table + B13 specifics block.
8. **SURVEY-NOTE** — file at `docs/changes/phase-a1b-step-b13-derived-with-validators/SURVEY.md` with Phase-0 findings.
9. **SPEC-PROSE FOLLOW-UPS** — if §34 row added or §55.14 footnote written, list them; PA reviews and lands.

## METHODOLOGY RULES IN FORCE

- **pa.md Rule 1:** No marketing/article work — stay focused on B13.
- **pa.md Rule 2:** Production-language fidelity, not MVP.
- **pa.md Rule 3:** Right answer beats easy answer 99.999% of the time.
- **pa.md Rule 4:** Spec is normative; derived docs are NOT. Verify every claim against §55.10 + §55.14 directly.
- **No `--no-verify` on pre-commit hook unless explicitly authorized.**

## CROSS-REFS for context

- `docs/audits/a1b-b13-rule4-audit-2026-05-07.md` — full audit (READ FIRST).
- `docs/audits/a1b-b10-rule4-audit-2026-05-07.md` — B10 audit (catalog B13 reads).
- `docs/audits/a1b-b9-rule4-audit-2026-05-07.md` — B9 audit (validator-arg ExprNode shape).
- `compiler/PIPELINE.md` — Stage SYM contracts.

You are authorized to land all work in your worktree. PA will review your file delta and land via `git checkout <branch> -- <files>` to main, single PA-authored commit. Report when complete.
