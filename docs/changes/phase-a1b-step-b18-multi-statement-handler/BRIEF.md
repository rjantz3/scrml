# A1b Step B18 — L19 multi-statement event-handler validation (E-MULTI-STATEMENT-HANDLER) — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S69. Ready to dispatch as part of Wave 5 small-bundle parallel (B18 + B19 + B22).

**Estimate:** 2-3h (per audit `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §1.3).

**Sequencing:** PARALLEL with B19 + B22. File-disjoint (markup-attribute walker territory; B19 owns channel checker; B22 owns reset target).

---

## Dispatch instructions for PA

1. Confirm main HEAD matches §"Main HEAD" below; if drift, update.
2. Dispatch via `general-purpose` subagent_type with `isolation: "worktree"` + `model: "opus"`.
3. Pass content below `---DISPATCH---` marker as the agent prompt.
4. Fire B18 + B19 + B22 in same parallel message for concurrent execution.

---DISPATCH---

# Dispatch: A1b Step B18 — L19 multi-statement event-handler validation

You are running as the substitute for `scrml-dev-pipeline` (per pa.md fallback rule for compiler TS dispatches).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (run FIRST)

1. Run `pwd` via Bash. Save WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. (Worktrees do NOT inherit `node_modules` from main.)
5. Run `bun run pretest` via Bash. (Populates `samples/compilation-tests/dist/` for browser tests.)
6. Run `bun run test` (chains pretest) to confirm baseline matches expected pre-commit subset.

**Path discipline:** ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit. Translate any intake-doc path that starts with `/home/bryan-maclee/scrmlMaster/scrmlTS/...` into `$WORKTREE_ROOT/...` before writing. Hit S58/S68 multiple times — the rule is load-bearing.

## CRASH RECOVERY

Commit after each meaningful change. Update `docs/changes/phase-a1b-step-b18-multi-statement-handler/progress.md` after each step. WIP commits expected. If you crash, your commits + progress.md are how the next agent picks up.

## CONTEXT — current main state (S69 open, post-S68 wrap)

- **Main HEAD:** `4ac906f` (wrap(s68): close — 11 commits · A5-1 spec amendments + A1b Wave-3-closer + A1b Wave-4 COMPLETE).
- **Phase A1b status:** B1-B17 ✅ all shipped. **B18 — THIS STEP — Wave 5 small-bundle.**
- **Active locks:** L1-L22. Critical for B18: **L19** (multi-statement event-handler restriction).

## SCOPE — B18 step definition

**Source of truth:** `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B18.

**Driver:** `compiler/SPEC.md` §5.2.3 (line 1127+; bare-form event-handler rule, L19/M11), §4.14 (`:`-shorthand body — same single-expression discipline applies). §34 catalog row at line 14256.

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §1 (B18 audit, ~lines 19-53). The audit identified three legal bare-form shapes + expression-internal `;` exception + survey item to extend the existing markup-attribute walker rather than build new infrastructure.

**Per pa.md Rule 4:** spec text is normative. SPEC §5.2.3 line 1142 is the canonical wording: "Multi-statement intent (two or more semicolon-separated expressions, or a block) SHALL force a named function. The compiler emits `E-MULTI-STATEMENT-HANDLER` when a bare-form handler attribute value contains a `;` outside of expression-internal contexts (e.g., string literals, nested function bodies)."

## REQUIRED B18 IMPLEMENTATION

### 1. Three legal bare-form shapes (per §5.2.3 table at line 1131-1138)

| Shape | Example |
|---|---|
| Bare call | `onclick=fn()` or `onclick=fn(literal)` |
| Bare assignment | `onclick=@phase = .Loading` (assignment-as-expression per §50) |
| Bare single-expression | `onclick=@count++` or `onclick=@items.push(item)` |

Anything else with `;` outside expression-internal context fires `E-MULTI-STATEMENT-HANDLER`.

### 2. Expression-internal `;` exception (per §5.2.3 line 1142)

Exception cases — `;` is FINE inside:
- **String literals:** `onclick=log("hi; bye")` — `;` inside string body is fine.
- **Nested function bodies:** `onclick=arr.forEach(x => { x.a; x.b })` — `;` inside arrow body / nested block is fine.

The walker must distinguish top-level (outside any nesting) `;` from expression-internal `;`. Likely cleanest: parser-level depth tracking (paren/brace/bracket/quote depth) or AST-level "is this attr value a single ExprNode vs a BlockExpr/SequenceExpr?"

### 3. Walker location — Phase-0 survey (mandatory, ~30 min)

Locate the existing markup-attribute walker(s) — likely in `compiler/src/symbol-table.ts` (B6 PASS 5 walks every MarkupNode) or `compiler/src/ast-builder.js` (where attribute-value parsing happens). **Extend rather than build new.** Audit §1.1 [REUSABILITY] flags this explicitly.

Phase 0 also verifies:
- (a) Whether `:`-shorthand body validation (§4.14) is already implemented somewhere — if yes, extend that path; if no, B18 owns both event-handler attrs AND `:`-shorthand bodies (per §5.2.3 line 1141 cross-ref).
- (b) Whether existing parser/AST already detects multi-statement attribute values (likely yes — bare-call vs ExprNode-with-semicolon is a parsing distinction).
- (c) Whether `${...}` arrow form `onclick=${() => { stmt1; stmt2 }}` is correctly EXEMPT (per §5.2.3 line 1144 — explicit `${}` wrapper is valid; the rule only applies to bare-form).

### 4. Diagnostic message

Per §34 catalog row + §5.2.3 line 1180, message must:
- Identify the offending attribute name + element tag.
- Suggest the named-function pattern explicitly: `function name() { ... }` then `onclick=name()`.

### 5. Cross-cutting: `:`-shorthand body (§4.14)

§5.2.3 line 1141 cross-refs §4.14 — the same single-expression discipline applies to engine state-children and match arms. SPEC §6.6.1 line 980 also references E-MULTI-STATEMENT-HANDLER for `<Idle : startGame(); track()>` form. Phase 0 verifies whether B18 walker covers this case OR whether it's already handled elsewhere.

### 6. Phase-0 survey gate (mandatory, ~30-60min before main impl)

Confirm:
- (a) Existing walker locus + extension point.
- (b) Whether AST already distinguishes single-expression from multi-statement attribute values.
- (c) `:`-shorthand body coverage — extend B18 OR scope to event-handler attrs only with `:`-shorthand as a follow-up step.
- (d) `${...}` arrow form is exempt path-distinguished.
- (e) Existing test coverage of E-MULTI-STATEMENT-HANDLER (search `tests/` for the error code).

## OUT OF SCOPE for B18 (explicit)

- **`onserver:*` / `onclient:*` channel attribute handlers** — those have their own argument-binding semantics (§38.6.1). Same single-expression rule SHOULD apply but if scope is unclear at survey, scope-restrict B18 to standard `on*` attributes and surface as follow-up.
- **Compile-time validation of the named function's existence** — that's resolver territory (B3-style); B18 only validates the bare-form shape.
- **A1c codegen** — bare-form lowering to `function(event){ ... }` wrapper is codegen concern (§5.2.1).
- **Spec amendments** — §5.2.3 + §34 row already exist; no spec-prose work expected unless Phase 0 surfaces a drift.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md`:
   - §5.2.3 (lines ~1127-1188) — PRIMARY normative source.
   - §4.14 (`:`-shorthand body) — cross-reference for body-form rule.
   - §50 (assignment-as-expression) — bare-assignment shape grounding.
   - §34 catalog (line 14256) — error-code wording.
   - **Use** `grep -nE "^####? +5\\.2\\.3|^####? +4\\.14|^####? +50" compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §9.6 + §11 (anti-patterns row 12 — multi-statement handler).

3. `compiler/src/symbol-table.ts` + `compiler/src/ast-builder.js` — likely walker insertion / extension points.

4. `compiler/src/types/ast.ts` — attribute-value AST shapes.

## TEST EXPECTATIONS

- All existing tests remain green.
- Add B18-specific tests:
  - `onclick=startGame()` (bare call): ALLOWED.
  - `onclick=@phase = .Loading` (bare assignment): ALLOWED.
  - `onclick=@count++` (bare single-expression): ALLOWED.
  - `onclick=startGame(); track()` (multi-statement): fires `E-MULTI-STATEMENT-HANDLER`.
  - `onclick=log("hi; bye")` (string-internal `;`): ALLOWED.
  - `onclick=arr.forEach(x => { x.a; x.b })` (nested-body `;`): ALLOWED.
  - `onclick=${() => { stmt1; stmt2 }}` (`${}` arrow form): ALLOWED.
  - `:`-shorthand body multi-statement (e.g., `<Idle : startGame(); track()>`): per Phase 0 verdict — likely ALLOWED via separate E-MULTI-STATEMENT-HANDLER fire OR already covered.

## REPORTING — when complete

Write final report block in `docs/changes/phase-a1b-step-b18-multi-statement-handler/progress.md` with:

1. WORKTREE_PATH
2. FINAL_SHA
3. FILES_TOUCHED (full paths from repo root)
4. TEST_DELTA (pass / skip / fail / todo deltas vs S68 baseline 9425/49/1/0 full)
5. DEFERRED_ITEMS (e.g., `onserver:*` handlers if scoped out)
6. OPEN_QUESTIONS
7. PRIMER §13.7 B18 ROW DRAFT + B18 specifics block
8. SURVEY-NOTE at `docs/changes/phase-a1b-step-b18-multi-statement-handler/SURVEY.md`
9. SPEC-PROSE FOLLOW-UPS (any §34 wording polish; §5.2.3 / §4.14 cross-ref tightening)

## METHODOLOGY (carry-forward from pa.md)

- Rule 1: No marketing/article work — stay focused on B18.
- Rule 2: Production-language fidelity — multi-statement-handler is high-frequency; correctness > minimal scope.
- Rule 3: Right answer beats easy answer 99.999% of the time.
- Rule 4: Spec is normative; SCOPE/audit are derived. Verify every spec-derivative claim against §5.2.3 directly.
- No `--no-verify` on pre-commit hook unless explicitly authorized.

## CROSS-REFS for context

- `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §1 — B18 audit (READ FIRST).
- `docs/PA-SCRML-PRIMER.md` §9.6 D4 highlights — Multi-statement handler restriction summary.
- `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B18.

You are authorized to land all work in your worktree. PA reviews file-delta and lands via `git checkout <branch> -- <files>` to main. Report when complete.
