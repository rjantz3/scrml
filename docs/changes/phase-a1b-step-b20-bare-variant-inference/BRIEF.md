# A1b Step B20 — Bare-variant inference (§14.10, M9, E-VARIANT-AMBIGUOUS) — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S69. Wave 5 closer (1 of 2). Ready to dispatch.

**Estimate:** 3-5h (per audit `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §3.3; SCOPE was 3-4h, audit added ~1h for type-inference integration).

**Sequencing:** SEQUENTIAL after Wave 5 small-bundle (B18 + B19 + B22 SHIPPED). Type-system.ts territory; sequential before B21 to avoid stale-base conflicts on the same file (per S68 surgical-extraction precedent).

---

## Dispatch instructions for PA

1. Confirm main HEAD matches §"Main HEAD" below; if drift, update.
2. Dispatch via `general-purpose` subagent_type with `isolation: "worktree"` + `model: "opus"`.
3. Pass content below `---DISPATCH---` marker as the agent prompt.

---DISPATCH---

# Dispatch: A1b Step B20 — Bare-variant inference (§14.10, M9)

You are running as the substitute for `scrml-dev-pipeline` (per pa.md fallback rule for compiler TS dispatches).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (run FIRST)

1. Run `pwd` via Bash. Save WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `git log --oneline -5` via Bash. Confirm HEAD is `87cbd36` or later (post-B18 SHIP).
5. Run `bun install` via Bash. (Worktrees do NOT inherit `node_modules` from main.)
6. Run `bun run pretest` via Bash. (Populates `samples/compilation-tests/dist/` for browser tests.)
7. Run `bun run test` (chains pretest) to confirm baseline matches expected pre-commit subset (~8794 pass / 49 skip / 1 todo / 0 fail).

**If any step fails, STOP and report.**

## Path discipline

ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for every Write/Edit. Translate any intake-doc path that starts with `/home/bryan-maclee/scrmlMaster/scrmlTS/...` into `$WORKTREE_ROOT/...` before writing. The S58/S68 path-discipline rule is load-bearing.

## CRASH RECOVERY

**Commit after each meaningful change — don't batch.** Per pa.md global directive + S69 first-B18-dispatch failure precedent: WIP commits are how the next agent picks up if you crash. Recommended chunks: Phase 0 survey complete; helper / inference utility added; first inference position fired; subsequent positions; tests; SHIP.

Update `docs/changes/phase-a1b-step-b20-bare-variant-inference/progress.md` after each step. WIP commits expected.

## CONTEXT — current main state (S69, post-Wave-5 small-bundle)

- **Main HEAD:** `87cbd36` (feat(a1b-b18): SHIP — L19 multi-statement event-handler validation).
- **Phase A1b status:** B1-B19 + B22 ✅ all shipped. **B20 — THIS STEP — Wave 5 closer (1 of 2).** B21 follows sequentially.
- **Wave 5 small-bundle (B18 + B19 + B22) complete.** A1b is now 17/22 steps. Wave 5 closes A1b after B20 + B21 land.
- **Active locks:** L1-L22. Critical for B20: **M9** (bare-variant inference; § ratified Stage 0b D4 / 2026-05-04).

## SCOPE — B20 step definition

**Source of truth:** `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B20.

**Driver:**
- `compiler/SPEC.md` §14.10 (line 7149+) — PRIMARY normative for bare-variant inference (the six inference positions).
- `compiler/SPEC.md` §18.0.3 — bare-variant inference in match arm patterns (cross-ref).
- `compiler/SPEC.md` §51.0.B — engine `initial=.Variant` canonical bare-variant locus.
- `compiler/SPEC.md` §34 catalog row at line 14233 — `E-VARIANT-AMBIGUOUS` (currently §18.0.3 only; B20 may need to extend cross-ref to also cite §14.10).

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §3 (B20 audit, ~lines 82-117). The audit identified:

- Six inference positions enumerated in §14.10 line 7172 (single normative sentence).
- E-VARIANT-AMBIGUOUS fire conditions: union with shared variants OR no type context.
- S66 parser fix (commit `cb167b1`) makes `.Variant` parseable as a primary expression everywhere — B20 rides on top.
- Phase 0 survey: locate type-system.ts type-inference entry points + downward type-context propagation.

**Per pa.md Rule 4:** spec text is normative. SPEC §14.10 line 7172 is the canonical wording listing all six inference positions in a single normative sentence.

## REQUIRED B20 IMPLEMENTATION

### 1. Six inference positions (per §14.10 line 7172)

| # | Position | Example | Type source |
|---|---|---|---|
| 1 | LHS type annotation | `<x>: T = .V` | The annotation `T` |
| 2 | Previously-declared cell with known type | `@cell = .V` where `@cell: T` | The cell's declared type |
| 3 | Function parameter type | `fn(.V)` where param typed `T` | The function signature |
| 4 | Function return type | `return .V` where return typed `T` | The function signature |
| 5 | Match on-expression type | `<match for=T> | .V => ...` | The match `for=` type |
| 6 | Engine `for=T` qualifier | `<engine for=T initial=.V>` | The engine `for=` type |

§14.10 line 7172 closes with "or any other position where the type is fixed by the surrounding declaration" — open-ended in spec wording. Phase 0 verifies whether positions beyond the six are present in source today (e.g., type assertions, type-annotated `let`).

### 2. E-VARIANT-AMBIGUOUS fire conditions (per §14.10 line 7173-7174)

- **Union with shared variants:** position type is a union and multiple union members declare the same variant name. (Cross-ref §18.0.3 has the same shape.)
- **No type context at all:** `let x = .Small` without annotation; the compiler cannot pick which enum has `.Small`.

A bare variant reference IS NOT supported in expression positions where no type context exists (per §14.10 line 7174).

### 3. S66 parser fix is the precondition (per primer §13.8 + commit `cb167b1`)

S66 made `.Variant` parseable as a primary expression in any operator context (so `==` recognition works). B20's typer rides this — does NOT re-implement parsing. The bare-variant nodes already exist in the AST as some form (likely `member-expr` with no object OR a dedicated `bare-variant` kind — Phase 0 verifies).

### 4. Phase-0 survey (mandatory, ~30-90min)

Critical to confirm before main implementation:

- (a) **AST shape of bare-variant references.** Run `grep -nE "bare.variant|bareVariant|BareVariant|\\.Variant" compiler/src/types/ast.ts compiler/src/expression-parser.ts compiler/src/ast-builder.js` and inspect. The S66 commit (`cb167b1`) makes them parseable; Phase 0 catalogs the AST kind name(s).
- (b) **Existing type-inference entry points.** type-system.ts is ~9000 lines. Find where type inference begins (e.g., `inferType`, `typeOf`, expression-typing dispatcher). Identify how downward type context propagates from LHS / param / return / match-for / engine-for through the recursive type-checking walker.
- (c) **Existing E-VARIANT-AMBIGUOUS fire path.** The §34 catalog row references §18.0.3 (match-arm pattern). If a match-arm-side fire site already exists, B20 may be extending that one walker to additionally cover the §14.10 expression positions. Otherwise B20 is net-new for expression positions and shares the diagnostic name.
- (d) **Six inference positions — coverage matrix.** Some may already be covered partially:
  - Engine `initial=.Variant` (position 6) — B14/B15 work — verify how it's currently handled.
  - Match `for=T` arm patterns (position 5) — §18.0.3 territory; Phase 0 verifies.
  - LHS type annotations (position 1), assignment to typed cell (position 2), function param/return (positions 3-4) — likely net-new.
- (e) **Type lookup utility.** When the typer encounters `.Variant`, it needs to know the candidate enum type. With the inference position's type known, the typer looks up the variant in that enum's declaration. Phase 0 finds the existing enum-variant lookup (likely `parseEnumBody` or `getEnumVariants` in type-system.ts).
- (f) **`::` qualifier interchangeability** (per §14.10 line 7176). `MarioState.Small` and `MarioState::Small` and bare `.Small` are interchangeable when type is statically known. Phase 0 verifies parser produces uniform AST or whether bare-variant node distinguishes itself.
- (g) **Existing test coverage.** Search `tests/` for bare-variant tests. Likely some §18.0.3 match-arm tests already exist; B20 expands to cover the other 5 positions.

Survey may surface depth-of-survey-discount potential.

### 5. Walker placement decision

Per Phase 0 findings, decide whether B20 fires at:
- **Type-system pass time** (the canonical typer that already walks expressions). Likely the right home — bare-variant resolution IS type inference.
- **A new SYM PASS** like B18/B19/B22. Less likely — type info isn't fully populated until type-system runs.

The audit §3.1 [INTEGRATION] specifically notes type-system.ts as the locus.

### 6. Diagnostic message quality

For E-VARIANT-AMBIGUOUS fires, message must:
- Identify the bare-variant reference (the `.Variant` text).
- State whether the failure is "no type context" or "union with shared variants" with concrete enum names listed when union-shared.
- Recommend the fix: fully-qualify (`MarioState.Small` or `MarioState::Small`) or add a type annotation.

## OUT OF SCOPE for B20 (explicit)

- **§18.0.3 match-arm pattern bare-variants** — that's `<match>` parser + match-arm typer territory; if existing E-VARIANT-AMBIGUOUS fire-site lives there, leave it. B20 is the §14.10 expression-position equivalent.
- **`::` qualifier syntax handling** — already parses; B20 doesn't change that.
- **Engine `initial=.Variant`** — covered by B14/B15. B20 doesn't re-implement; verify Phase 0 doesn't regress it.
- **Type assertions / casts** — separate concern.
- **A1c codegen** — runtime emission of bare-variant lowering.
- **Top-level expressions / untyped contexts** — per §14.10 line 7174, bare variants ARE NOT supported there. Fire E-VARIANT-AMBIGUOUS or the appropriate "no type context" diagnostic. Phase 0 verifies which exact code applies.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md`:
   - §14.10 (lines 7149-7183) — PRIMARY normative source.
   - §18.0.3 — match-arm bare-variant cross-reference.
   - §51.0.B — engine `initial=.Variant` cross-reference.
   - §34 catalog (line 14233) — E-VARIANT-AMBIGUOUS row (currently §18.0.3-cited; may need amendment).
   - **Use** `grep -nE "^####? +14\\.10|^####? +18\\.0\\.3" compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §13.8 (S66 parser fix grounding); primer §11 (anti-pattern row 9 — `<x>: SomeEnum = SomeEnum.Variant` → `.Variant`).

3. `compiler/src/type-system.ts` — main implementation locus (~9000 lines).

4. `compiler/src/expression-parser.ts` + `compiler/src/ast-builder.js` — bare-variant AST shape (Phase 0 finding).

5. `compiler/src/types/ast.ts` — bare-variant AST kind declaration.

## TEST EXPECTATIONS

- All existing tests remain green.
- Add B20-specific tests covering all six inference positions with positive (resolves cleanly) + negative (E-VARIANT-AMBIGUOUS or no-context) cases:
  - Position 1: `<x>: MarioState = .Small` ALLOWED; `<x> = .Small` (no annotation) fires.
  - Position 2: `<m>: MarioState = .Small; @m = .Big` ALLOWED on the assignment.
  - Position 3: `function f(s: MarioState) {}; f(.Small)` ALLOWED.
  - Position 4: `function f() -> MarioState { return .Small }` ALLOWED.
  - Position 5: `<match for=MarioState on=@m> | .Small => ...` — verify per Phase 0 (existing §18.0.3 path).
  - Position 6: `<engine for=Phase initial=.Idle>` — verify existing B14/B15 path.
  - Union ambiguity: enum-A and enum-B both define `.Small`, position type is union → fires E-VARIANT-AMBIGUOUS.
  - No type context: `let x = .Small` (top-level let, no annotation) → fires the appropriate code (per Phase 0 — E-VARIANT-AMBIGUOUS OR a separate code if spec requires).

## REPORTING — when complete

Write final report block in `docs/changes/phase-a1b-step-b20-bare-variant-inference/progress.md` with:

1. WORKTREE_PATH
2. FINAL_SHA
3. FILES_TOUCHED (full paths from repo root)
4. TEST_DELTA (vs S69 post-B18 baseline 9518/60/1/0 full; 8794 pre-commit subset)
5. DEFERRED_ITEMS
6. OPEN_QUESTIONS
7. PRIMER §13.7 B20 ROW DRAFT + B20 specifics block
8. SURVEY-NOTE at `docs/changes/phase-a1b-step-b20-bare-variant-inference/SURVEY.md`
9. SPEC-PROSE FOLLOW-UPS (likely: §34 row cross-ref expansion to cite §14.10 alongside §18.0.3 if both fire-sites share the code; any other normative drift)

## METHODOLOGY (carry-forward from pa.md)

- Rule 1: No marketing/article work — stay focused on B20.
- Rule 2: Production-language fidelity — bare-variant inference is a high-frequency ergonomic; correctness > minimal scope.
- Rule 3: Right answer beats easy answer 99.999% of the time. Surface ambiguity (e.g., the open-ended "any other position" phrasing in §14.10 line 7172) explicitly to PA via progress.md if Phase 0 finds inference positions beyond the six.
- Rule 4: Spec is normative; SCOPE/audit are derived. Verify every spec-derivative claim against §14.10 directly. The §34 catalog row's §18.0.3-only cross-ref is itself a Rule-4 finding to surface.
- No `--no-verify` on pre-commit hook unless explicitly authorized.

## CROSS-REFS for context

- `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §3 — B20 audit (READ FIRST).
- `docs/PA-SCRML-PRIMER.md` §13.8 — S66 parser fix + bare-dot grounding.
- `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B20.
- S66 commit `cb167b1` — parser fix that makes `.Variant` parseable as primary expression everywhere.

You are authorized to land all work in your worktree. PA reviews file-delta and lands via `git checkout <branch> -- <files>` to main. Report when complete.
