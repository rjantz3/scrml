# A1b Step B19 — Channels file-level placement + `@shared` modifier rejection (E-CHANNEL-INSIDE-PROGRAM + E-CHANNEL-SHARED-MODIFIER) — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S69. Ready to dispatch as part of Wave 5 small-bundle parallel (B18 + B19 + B22).

**Estimate:** 2-3h (per audit `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §2.3).

**Sequencing:** PARALLEL with B18 + B22. File-disjoint (B19 owns channel checker territory; B18 owns markup-attribute walker; B22 owns reset target).

---

## Dispatch instructions for PA

1. Confirm main HEAD matches §"Main HEAD" below; if drift, update.
2. Dispatch via `general-purpose` subagent_type with `isolation: "worktree"` + `model: "opus"`.
3. Pass content below `---DISPATCH---` marker as the agent prompt.
4. Fire B18 + B19 + B22 in same parallel message for concurrent execution.

---DISPATCH---

# Dispatch: A1b Step B19 — Channels file-level placement + `@shared` modifier rejection

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

Commit after each meaningful change. Update `docs/changes/phase-a1b-step-b19-channel-placement-shared-removal/progress.md` after each step. WIP commits expected. If you crash, your commits + progress.md are how the next agent picks up.

## CONTEXT — current main state (S69 open, post-S68 wrap)

- **Main HEAD:** `4ac906f` (wrap(s68): close — 11 commits · A5-1 spec amendments + A1b Wave-3-closer + A1b Wave-4 COMPLETE).
- **Phase A1b status:** B1-B17 ✅ all shipped. **B19 — THIS STEP — Wave 5 small-bundle.**
- **Active locks:** L1-L22. Critical for B19: **M19** (channels file-level placement + `@shared` removal — D3 / 2026-05-04).

## SCOPE — B19 step definition

**Source of truth:** `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B19.

**Driver:**
- `compiler/SPEC.md` §38.1 (file-level placement; line 15337+) — E-CHANNEL-INSIDE-PROGRAM normative source.
- `compiler/SPEC.md` §38.4 (V5-strict body, auto-sync from placement; line 15444+) — E-CHANNEL-SHARED-MODIFIER normative source.
- `compiler/SPEC.md` §34 catalog rows at line 14251-14252.

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §2 (B19 audit, ~lines 56-78). Two errors enumerated; survey for existing channel-handling code that may already enforce one or both — extend, don't duplicate.

**Per pa.md Rule 4:** spec text is normative. SPEC §38.1 line 15377 + §38.4 line 15378 are canonical:
- "A `<channel>` element nested inside `<program>` (or any other element) SHALL emit `E-CHANNEL-INSIDE-PROGRAM`."
- "Use of `@shared` SHALL emit `E-CHANNEL-SHARED-MODIFIER`."

## REQUIRED B19 IMPLEMENTATION

### 1. E-CHANNEL-INSIDE-PROGRAM — placement check (§38.1)

Walk markup tree. For each `<channel>` element:
- If file-level (sibling of `<program>` or top-level): ALLOWED.
- If ancestor chain contains `<program>` or any other non-top-level element: fire `E-CHANNEL-INSIDE-PROGRAM`.

§38.1 line 15422 wording: "A `<channel>` element SHALL appear at file top level only. A `<channel>` nested inside `<program>` (or any other element) SHALL emit `E-CHANNEL-INSIDE-PROGRAM` (§34)."

### 2. E-CHANNEL-SHARED-MODIFIER — modifier rejection (§38.4)

Walk channel bodies. For any state-decl carrying `@shared` modifier in source:
- Fire `E-CHANNEL-SHARED-MODIFIER`.

§38.4 line 15424 wording: "The `@shared` modifier SHALL NOT appear inside any channel body in v0.next. Any occurrence SHALL emit `E-CHANNEL-SHARED-MODIFIER` (§34)."

The audit §2.1 explicitly notes: scope is the modifier rejection only. B19 does NOT need to re-validate access-via-`@`-prefix — B3 already resolves cross-scope `@cellName` access (per primer §13.7 B3 specifics).

### 3. Phase-0 survey (mandatory, ~30 min)

Critical to avoid duplicating existing infrastructure:

- (a) **Locate existing channel-handling code.** Likely in `compiler/src/symbol-table.ts` (channel-decl recognition) or a dedicated `channel-*.ts` / `channel-*.js` file. Check whether E-CHANNEL-INSIDE-PROGRAM is already fired anywhere (existence guard #1).
- (b) **`@shared` token recognition.** Search source for `"@shared"` and `"shared"` token handling. The retired §34 row `~~E-CHANNEL-002~~` (line 14136) was the v1 code; check whether the parser still emits any related diagnostics that need updating to the v0.next code.
- (c) **AST shape — does `@shared` make it through the parser?** Per V5-strict, `@shared` would be unusual in source. Phase 0 verifies whether `@shared` is rejected at parse time (in which case B19 retrofits the check at SYM-pass) OR slips through to SYM (where B19 owns the check directly).
- (d) **Channel ancestry resolution** — the placement check needs walker access to ancestor chain. Verify whether existing markup walker exposes this or whether a stack-based approach is needed.
- (e) **Existing test coverage** — search `tests/` for both error codes. If tests exist as `.skip` placeholders, they unblock when B19 lands.

### 4. Walker insertion

Likely a SYM PASS extension after B17's PASS 13. Phase 0 verifies the right pass; could fold into existing channel-pass if one exists. **Reuse existing infra over building new.**

### 5. Diagnostic messages

Per §34 catalog rows + spec wording:
- E-CHANNEL-INSIDE-PROGRAM: "Channels are file-level in v0.next (M19); migrate the `<channel>` declaration to be a sibling of `<program>`, not a descendant."
- E-CHANNEL-SHARED-MODIFIER: "The `@shared` modifier is removed in v0.next (M19); reactive cells declared inside a channel body auto-sync by virtue of being declared in the channel body. Remove the `@shared` keyword and use `<name> = init` (V5-strict)."

## OUT OF SCOPE for B19 (explicit)

- **V5-strict access validation inside channel body** — B3 already resolves `@cellName`. Channel-declared cells are reachable cross-scope via canonical `@` access (per §38.4 line 15425).
- **Server function auto-injected scope** (`broadcast`, `disconnect`) — A1c runtime; B19 only validates placement + modifier rejection.
- **`onserver:message` parameter binding** (§38.6.1) — separate concern.
- **Cross-file channel inline expansion** (§38.12) — separate concern.
- **`topic="not"` semantics** (§38.6.2) — runtime; out of scope.
- **A1c codegen** — runtime emission of WS endpoint.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md`:
   - §38.1 (file-level placement; line ~15337-15382) — PRIMARY normative for placement.
   - §38.4 (V5-strict body / no `@shared`; line ~15444-15490) — PRIMARY normative for modifier rejection.
   - §34 catalog (lines 14251-14252) — error-code wording.
   - **Use** `grep -nE "^####? +38\\." compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §9.1 (channel summary).

3. `compiler/src/symbol-table.ts` + any `channel-*` source — find existing channel-handling code.

4. `compiler/src/types/ast.ts` — channel-decl AST shape.

## TEST EXPECTATIONS

- All existing tests remain green.
- Add B19-specific tests:
  - `<channel>` at file-level (alongside `<program>`): ALLOWED.
  - `<channel>` nested inside `<program>`: fires E-CHANNEL-INSIDE-PROGRAM.
  - `<channel>` nested inside other element (e.g., `<div>`): fires E-CHANNEL-INSIDE-PROGRAM.
  - V5-strict cell inside channel body (`<x> = init`): ALLOWED.
  - Cell with `@shared` modifier inside channel body (`<x> @shared = init` or whatever the source-shape looks like — Phase 0 verifies): fires E-CHANNEL-SHARED-MODIFIER.
  - Cross-scope `@cellName` access from `<program>` (already B3): unchanged.

## REPORTING — when complete

Write final report block in `docs/changes/phase-a1b-step-b19-channel-placement-shared-removal/progress.md` with:

1. WORKTREE_PATH
2. FINAL_SHA
3. FILES_TOUCHED (full paths from repo root)
4. TEST_DELTA (vs S68 baseline 9425/49/1/0 full)
5. DEFERRED_ITEMS
6. OPEN_QUESTIONS
7. PRIMER §13.7 B19 ROW DRAFT + B19 specifics block
8. SURVEY-NOTE at `docs/changes/phase-a1b-step-b19-channel-placement-shared-removal/SURVEY.md`
9. SPEC-PROSE FOLLOW-UPS (none expected — both error codes already in §34)

## METHODOLOGY (carry-forward from pa.md)

- Rule 1: No marketing/article work — stay focused on B19.
- Rule 2: Production-language fidelity — channels are first-class, not optional.
- Rule 3: Right answer beats easy answer 99.999% of the time.
- Rule 4: Spec is normative; SCOPE/audit are derived. Verify every spec-derivative claim against §38.1 / §38.4 directly.
- No `--no-verify` on pre-commit hook unless explicitly authorized.

## CROSS-REFS for context

- `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §2 — B19 audit (READ FIRST).
- `docs/PA-SCRML-PRIMER.md` §9.1 — Channels summary.
- `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B19.
- D3 dispatch at S58 close — landed `<channel>` v0.next surface; B19 closes the validation gate.

You are authorized to land all work in your worktree. PA reviews file-delta and lands via `git checkout <branch> -- <files>` to main. Report when complete.
