# A1b Step B22 — `reset(@cell)` target shape validation (E-RESET-INVALID-TARGET) — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S69. Ready to dispatch as part of Wave 5 small-bundle parallel (B18 + B19 + B22).

**Estimate:** 1-2h (per audit `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §5.3). Smallest step in A1b.

**Sequencing:** PARALLEL with B18 + B19. File-disjoint (B22 owns reset target validation; B18 owns markup-attribute walker; B19 owns channel checker).

---

## Dispatch instructions for PA

1. Confirm main HEAD matches §"Main HEAD" below; if drift, update.
2. Dispatch via `general-purpose` subagent_type with `isolation: "worktree"` + `model: "opus"`.
3. Pass content below `---DISPATCH---` marker as the agent prompt.
4. Fire B18 + B19 + B22 in same parallel message for concurrent execution.

---DISPATCH---

# Dispatch: A1b Step B22 — `reset(@cell)` target shape validation

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

Commit after each meaningful change. Update `docs/changes/phase-a1b-step-b22-reset-target-shape/progress.md` after each step. WIP commits expected. If you crash, your commits + progress.md are how the next agent picks up.

## CONTEXT — current main state (S69 open, post-S68 wrap)

- **Main HEAD:** `4ac906f` (wrap(s68): close — 11 commits · A5-1 spec amendments + A1b Wave-3-closer + A1b Wave-4 COMPLETE).
- **Phase A1b status:** B1-B17 ✅ all shipped. **B22 — THIS STEP — Wave 5 small-bundle. Closes A1a Step 9 deferral.**
- **Active locks:** L1-L22. Critical for B22: **L18** (`reset(@cell)` keyword + `default=` attribute, supersedes L10).

## SCOPE — B22 step definition

**Source of truth:** `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B22: "Step 9's permissive parser accepts any ExprNode; A1b rejects non-canonical (must be `@cell` or `@compound.field`)".

**Driver:**
- `compiler/SPEC.md` §6.8.2 (line 4844+) — `reset(@cell)` keyword normative source.
- `compiler/SPEC.md` §34 catalog row at line 14223 (E-RESET-NO-ARG already present; B22 adds E-RESET-INVALID-TARGET — canonical naming TBD per Phase 0).

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §5 (B22 audit, ~lines 154-185). Phase-0 survey verifies multi-level compound-nav legality (spec ambiguous) + canonical error-code naming.

**Per pa.md Rule 4:** spec text is normative. SPEC §6.8.2 line 4848-4853 enumerates three valid target shapes:
```
reset(@cell)              // reset a top-level cell
reset(@compound.field)    // reset a field within a compound cell
reset(@compound)          // reset all fields of a compound cell
```

**Spec-silence on multi-level nav:** SPEC §6.8.2 does NOT enumerate `reset(@compound.subCompound.field)`. Per pa.md Rule 4: when spec is silent or ambiguous, **surface as deliberation point** — don't paper over with a derived-doc interpretation. Phase 0 surfaces this for spec-amendment recommendation.

## REQUIRED B22 IMPLEMENTATION

### 1. Three valid target shapes (per §6.8.2 line 4848-4853)

| Shape | Example | Resolution path |
|---|---|---|
| Bare cell | `reset(@cell)` | IdentExpr with `@`-prefix; B3-resolved to top-level StateCellRecord |
| Single-level compound nav | `reset(@compound.field)` | MemberExpr with `@`-prefix root; field-leaf resolves via `lookupQualifiedStateCell` |
| Whole compound | `reset(@compound)` | IdentExpr with `@`-prefix; B3-resolved to compound-parent StateCellRecord |

Anything else fires `E-RESET-INVALID-TARGET` (canonical naming per Phase 0 — see §3 below).

### 2. B3 integration (per audit §5.1 [REUSABILITY])

B3 already resolves `@cell` references and stores `_resolvedStateCell` annotations. B22 reads these:
- For IdentExpr targets: `target._resolvedStateCell !== null` → ALLOWED (was successfully resolved).
- For MemberExpr targets: re-resolve via `lookupQualifiedStateCell(receiverChain)` (per primer §13.7 B3 specifics — "Compound nav: B3 resolves the BASE cell on the `@form` IdentExpr. The `.name` part is a static property string... Consumers needing leaf-level resolution must re-resolve via `lookupQualifiedStateCell`.").
- Anything else (literal, function call, arbitrary expression): fires E-RESET-INVALID-TARGET.

### 3. Phase-0 survey (mandatory, ~30 min)

Critical to confirm:

- (a) **Canonical error-code name.** Audit suggests `E-RESET-INVALID-TARGET` but flags it as "TBD; Phase-0 survey." Search `compiler/SPEC.md` §34 for any existing reset-related error rows beyond E-RESET-NO-ARG. Search `compiler/src/types/diagnostic-codes.ts` (or equivalent) for declared codes. **If no existing canonical name:** Phase 0 recommends one; B22 adds the §34 row.
- (b) **A1a Step 9 parser shape.** Step 9 introduced the `reset-expr` AST kind (per SCOPE §"Dependencies" line 278 — "B22 | Step 9 (`reset-expr` AST kind) + B3 (`@name` resolution)"). Find this AST kind; confirm its `target: ExprNode` shape; confirm whether validation is currently a no-op.
- (c) **Multi-level compound-nav legality.** Spec §6.8.2 enumerates `reset(@compound.field)` (one level) but is silent on `reset(@compound.subCompound.field)`. Three options:
  1. Reject as spec-silent.
  2. Accept (compound-nav is recursive in §6.3).
  3. Surface to PA for spec-amendment recommendation.
  
  Per pa.md Rule 4, **option 3 is the right answer** — surface, don't paper over. Phase 0 reports the recommendation; B22 implements per Phase 0 recommendation OR defers depending on PA decision (the dev agent may choose ACCEPT as the spec-faithful default if §6.3 recursive compound-nav supports it; flag the choice explicitly in progress.md).
- (d) **`.method` form.** Audit §5.2 brief #1 mentions "including `.reset` method-style if applicable." Phase 0 verifies whether `cell.reset()` form exists in source/spec OR is purely the keyword `reset(@cell)` form.
- (e) **Existing test coverage** — search `tests/` for `reset(` invocations + any `.skip` tests referencing target-shape validation. If `.skip` tests exist, they unblock when B22 lands.

### 4. Walker insertion

B22 walker scans every `reset-expr` AST node (or whatever Step 9 produced). Likely a SYM PASS extension after B17's PASS 13. Or fold into an existing pass that already walks reset-expr nodes (Phase 0 verifies).

### 5. Diagnostic messages

For E-RESET-INVALID-TARGET:
- Identify the offending target shape (e.g., "`reset(...)` target must be `@cell` or `@compound.field`").
- Recommend canonical forms with worked examples from §6.8.2.

### 6. §34 catalog row addition

If Phase 0 confirms no existing canonical name, B22 adds a new §34 row:
- Code name: `E-RESET-INVALID-TARGET` (recommended) or per Phase 0 alternative.
- Cross-ref: §6.8.2.
- Severity: Error.
- Description: per spec wording — "The `reset` keyword target must be `@cell` (top-level), `@compound` (whole compound), or `@compound.field` (single-level compound nav). Other expression shapes are not valid reset targets."

## OUT OF SCOPE for B22 (explicit)

- **`reset()` no-arg case** — already handled by E-RESET-NO-ARG (existing §34 row at line 14223).
- **`function reset() { ... }` shadow** — already handled by E-RESERVED-IDENTIFIER.
- **Synthesized-property side-effects of reset** (clearing `errors`, `touched`, `submitted`) — runtime A1c (per §55.13).
- **`default=` attribute evaluation semantics** — runtime A1c.
- **A1c codegen** — emission of reset-call lowering.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md`:
   - §6.8 (lines ~4818+) — `default=` + `reset(@cell)` PRIMARY normative.
   - §6.8.2 (lines ~4844-4872) — `reset(@cell)` keyword detail.
   - §6.3 (compound state) — compound-nav recursion grounds the multi-level question.
   - §34 catalog (lines 14223 — E-RESET-NO-ARG; B22 may add a row here).
   - **Use** `grep -nE "^####? +6\\.8|^####? +6\\.3|reset\\(@" compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §13 (lock L18 row).

3. `compiler/src/types/ast.ts` — find `reset-expr` AST kind shape.

4. `compiler/src/symbol-table.ts` + `compiler/src/ast-builder.js` — find existing reset-expr handling + `lookupQualifiedStateCell` API.

## TEST EXPECTATIONS

- All existing tests remain green.
- Add B22-specific tests:
  - `reset(@cell)` (bare top-level cell): ALLOWED.
  - `reset(@compound)` (whole compound): ALLOWED.
  - `reset(@compound.field)` (single-level compound nav): ALLOWED.
  - `reset(@compound.subCompound.field)` (multi-level): per Phase 0 verdict.
  - `reset(literal)` (e.g., `reset(42)`): fires E-RESET-INVALID-TARGET.
  - `reset(fn())` (call-result): fires E-RESET-INVALID-TARGET.
  - `reset(@cell + 1)` (arbitrary expr): fires E-RESET-INVALID-TARGET.
  - `reset(undefined-cell)` — interaction with B3's resolution: per Phase 0 (likely B3 raises a separate diagnostic; B22 may pass through silently).

## REPORTING — when complete

Write final report block in `docs/changes/phase-a1b-step-b22-reset-target-shape/progress.md` with:

1. WORKTREE_PATH
2. FINAL_SHA
3. FILES_TOUCHED (full paths from repo root)
4. TEST_DELTA (vs S68 baseline 9425/49/1/0 full)
5. DEFERRED_ITEMS (e.g., multi-level compound-nav if deferred)
6. OPEN_QUESTIONS
7. PRIMER §13.7 B22 ROW DRAFT + B22 specifics block
8. SURVEY-NOTE at `docs/changes/phase-a1b-step-b22-reset-target-shape/SURVEY.md`
9. SPEC-PROSE FOLLOW-UPS (likely: §34 catalog row addition for E-RESET-INVALID-TARGET; §6.8.2 multi-level nav clarification footnote per Phase 0)

## METHODOLOGY (carry-forward from pa.md)

- Rule 1: No marketing/article work — stay focused on B22.
- Rule 2: Production-language fidelity — `reset` is a language keyword, not a stdlib helper.
- Rule 3: Right answer beats easy answer 99.999% of the time. **For multi-level nav: do NOT silently accept or reject — surface to PA via progress.md so spec ambiguity is resolved deliberately.**
- Rule 4: Spec is normative; SCOPE/audit are derived. Verify every spec-derivative claim against §6.8.2 directly. **Spec-silence on multi-level nav is itself a Rule 4 finding — surface, don't paper over.**
- No `--no-verify` on pre-commit hook unless explicitly authorized.

## CROSS-REFS for context

- `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §5 — B22 audit (READ FIRST).
- `docs/PA-SCRML-PRIMER.md` §13 — L18 (`reset(@cell)` lock).
- `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B22.
- A1a Step 9 — original `reset-expr` AST-kind landing (deferred validation closed by B22).

You are authorized to land all work in your worktree. PA reviews file-delta and lands via `git checkout <branch> -- <files>` to main. Report when complete.
