# Bug 71 — top-level derived `const <x> = match @cell {...}` is NOT exhaustiveness-checked

> **S136 archival.** Verbatim `prompt:` dispatched to `scrml-js-codegen-engineer`
> (isolation:worktree, bg, model:opus) at S157, 2026-06-03. Worktree base = session-start
> `57edc794`; brief mandates `git merge main` (→ `f28d8128`) at startup to inherit landed
> Bug 63/65/67/68. DIRECT sibling of Bug 67 (RESOLVED `f28d8128`) — same hook pattern.

Change-id: `bug-71-derived-const-match-exhaustiveness-2026-06-03`

You are fixing a parser/typer gap in the scrml compiler. A derived state cell whose RHS is a value-return `match` — `const <label> = match @phase { ... }` at file/program scope — is NOT exhaustiveness-checked: a missing enum variant compiles clean. This is the DIRECT sibling of the just-landed Bug 67 (`return match`), which the Bug 67 agent diagnosed: the derived-state-decl builder lacks the structural match-as-expr hook that the `let-decl` / `const-decl` / (now) `return-stmt` builders have.

**One critical difference from Bug 67:** a derived `const <x> = match @cell` is a REACTIVE cell — it recomputes when `@cell` changes. Bug 67's `return match` was a fn-body return (evaluated on call). So your fix must (a) ADD the exhaustiveness check AND (b) KEEP the derived cell's reactive recompute + render working. Do NOT break rendering for a diagnostic.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. `git status --short` clean; note `git rev-parse --short HEAD` (likely stale session-start `57edc794`).
4. **MERGE CURRENT MAIN (S112 — MANDATORY).** Your worktree branched from the session-start commit, PREDATING five landed S157 fixes (Bug 63/65/67/68 + maps). Run `git -C "$WORKTREE_ROOT" merge main` (LOCAL main at `f28d8128`; clean fast-forward). Confirm `f28d8128` in ancestry. **Why:** Bug 71 edits `ast-builder.js` / `type-system.ts` / `emit-logic.ts` — the SAME files Bug 67 just touched; editing on the stale base would make the file-delta landing REVERT Bug 67 (and the others). If the merge conflicts, STOP and report.
5. `bun install`. 6. `bun run pretest`.
If ANY check fails: STOP and report.

## Path discipline (S99/S126)
- **Apply ALL edits via Bash** (`perl -i`/`python`/heredoc) on **worktree-absolute paths including `.claude/worktrees/agent-<id>/`**, NOT Edit/Write tools (they leak to MAIN). Echo path before each write; re-verify after.
- **NEVER `cd` into the main repo** / outside `WORKTREE_ROOT`. Use `git -C`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
- First commit embeds pwd: `WIP(bug71): start at $(pwd)`. Commit per edit; `git status` clean before DONE. Update `docs/changes/bug-71-derived-const-match-exhaustiveness-2026-06-03/progress.md` (append-only) per step.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full (in your worktree, AFTER the merge). Follow **"Task-Shape Routing"** → **"parser / grammar fix"** + **"compiler-source bug fix"** + the codegen `<each>`/`<match>` block (for the derived-cell reactive emit). Feedback line in your report.

---

# THE BUG (confirmed reproduced by PA on HEAD f28d8128)

**Reproducer A — derived const match, MISSING `.Done` (the bug — silent):**
```scrml
${
    type Phase:enum = { Idle, Loading, Done }
    <phase>: Phase = .Idle
    const <label> = match @phase { .Idle => "i" .Loading => "l" }
}
<div>${@label}</div>
```
Compile (`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <tmp>/A.scrml -o <tmp>/distA`) → **exit 0, NO error** (the bug; `.Done` missing). Currently compiles + (presumably) emits a working derived cell — VERIFY the current emitted-JS shape for `@label` BEFORE you change anything, so you can confirm codegen parity after.

# THE TEMPLATE — Bug 67 (RESOLVED `f28d8128`)

`git show f28d8128 -- compiler/src/ast-builder.js compiler/src/type-system.ts compiler/src/codegen/emit-logic.ts` shows the exact return-stmt fix. The `let-decl` / `const-decl` builders (`ast-builder.js ~4985/~5095`) ALREADY have the match-as-expr hook (`parseOneMatchAsExpr` → structural match-expr stored on the node). The DERIVED-state-decl builder (a `state-decl` with `shape:"derived"`, `structuralForm:false`) is the one missing it. Mirror the pattern:
1. **ast-builder.js** — the derived-state-decl builder, when the RHS is a `match`, builds a STRUCTURAL match-expr (`parseOneMatchAsExpr`) stored on the decl node (e.g. `.matchExpr`), like the let-decl/const-decl/return-stmt hooks.
2. **type-system.ts** — the typer's derived-state-decl case visits `node.matchExpr` → `checkMatchDiagnostics` (exhaustiveness, E-TYPE-020). Also route it through `checkLinear` walkNode if the derived RHS can carry lin (mirror Bug 67's E-LIN-003 coupling — verify whether derived-cell match RHS needs it; the derived-cell reactive-deps walk must also still see the match's `@`-reads so the cell recomputes — DO NOT drop the dependency edges).
3. **emit-logic.ts / the derived-cell emit** — the derived cell's recompute must still emit the match value (via the shared `emitMatchExpr` IIFE or the existing derived-match emit), reactively. **Codegen parity is REQUIRED** — the derived cell must recompute on `@phase` change exactly as before.

# PHASE 0 — STOP CONDITION (codegen entanglement)
Before implementing, dump the AST + emitted JS for Reproducer A. Confirm: (a) does the derived-cell `= match` currently produce a `match-expr` ExprNode with `rawArms` (parallel to Bug 67's return-stmt before-state)? (b) does switching to the structural matchExpr REQUIRE reworking the derived-cell reactive recompute emit, or can the recompute keep emitting the same value via emitMatchExpr? **If adding the exhaustiveness hook would require restructuring the reactive derived-cell recompute (risk of breaking rendering), STOP and report** the entanglement + a minimal-risk option (e.g. run exhaustiveness off the parsed match without changing the emit path). If it's a clean parallel to Bug 67 (add the hook; typer visits it; emit unchanged), proceed.

# Verification
Do NOT mark DONE without:
1. Reproducer A → now fires `E-TYPE-020` naming `::Done`. Report the diagnostic.
2. **Exhaustive** derived const match (all 3 variants) → compiles CLEAN (no over-fire).
3. **CODEGEN PARITY (load-bearing):** the exhaustive derived cell still emits a working reactive `@label` — the recompute function evaluates the match + `node --check` clean + the `@label` derived cell is still subscribed to `@phase` (grep the emitted derived recompute + dep wiring; compare to the pre-fix emit you captured in Phase 0). If feasible, a happy-dom canary asserting `@label` updates when `@phase` changes is the gold standard — add it if the existing derived-cell browser test infra supports it.
4. **Regression:** the canonical forms still check — `let x = match` (in-fn), `return match` (Bug 67), `<match for=T>` block-form, JS-style `match` statement — all unchanged. And Bug 63/65/68 untouched (you merged them; don't perturb).
5. Full suite `bun run test` — `0 fail`, baseline 22,794 pass (post-Bug-67). Report delta + any sample/example newly-errored (a real latent non-exhaustive derived match the check now catches — report, don't suppress). Watch within-node parity (if the derived-match node shape changes, the live-vs-native allowlist may need a documented bump like Bug 67 — native is M5-swap-out-of-scope).

# Tests to author
- Unit: `compiler/tests/unit/derived-const-match-exhaustiveness-bug71.test.js` — derived const match missing-variant fires E-TYPE-020; exhaustive clean + emits a working reactive derived cell; parity with Bug 67's return-match. Mirror Bug 67's test (`return-match-exhaustiveness-bug67.test.js`) + a codegen-shape assertion for the derived recompute.

# Commit discipline
- Code + coupled test SAME commit. Pre-commit = unit+integration+conformance; pre-push = full+browser. **No `--no-verify`** without authorization (you don't have it). Branch name irrelevant (PA lands via S67 file-delta).

# Final report MUST include
- `WORKTREE_PATH`, `FINAL_SHA`, post-merge HEAD (confirm `f28d8128` in ancestry), `FILES_TOUCHED`, deferred items.
- Phase-0 outcome (clean parallel vs entanglement-STOP) + the before/after emitted-JS for `@label` (codegen parity proof).
- Verification verbatim (A diagnostic + exhaustive-clean + codegen-parity grep + regression).
- Full-suite pass/fail/skip + delta + within-node parity + any newly-errored sample/example.
- Maps feedback line. Confirmation `git status` clean + all committed.
