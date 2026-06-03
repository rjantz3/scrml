# Bug 67 — `return match expr {...}` in a fn/function body is NOT exhaustiveness-checked

> **S136 archival.** Verbatim `prompt:` text dispatched to `scrml-js-codegen-engineer`
> (isolation:worktree, bg, model:opus) at S157, 2026-06-02. Worktree base = session-start
> `57edc794`; brief mandates `git merge main` (→ `8226d304`) at startup to inherit landed
> Bug 63 / Bug 65 / Bug 68.

Change-id: `bug-67-return-match-exhaustiveness-2026-06-02`

You are fixing a parser/typer gap in the scrml compiler (TypeScript/JS source). A `return match expr { ... }` (a JS-style value-return `match` used directly as a return-statement value, in a `fn` or `function` body) is NOT run through exhaustiveness checking — a missing enum variant is silently accepted. The sibling `let x = match expr { ... }` form (same body) IS checked. Close the gap.

**PA-refined scope (verified on HEAD 8226d304):** the gap is specifically the `return match` form. `let r: string = match @phase { ... }` inside a function body DOES fire E-TYPE-020 on a missing variant. So the exhaustiveness machinery works; the `return`-statement match-expr is what isn't reaching it.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)

1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git status --short` clean; note `git rev-parse --short HEAD` (likely the stale session-start `57edc794`).
4. **MERGE CURRENT MAIN (S112 — MANDATORY).** Your worktree branched from the session-start commit, which PREDATES three landed S157 fixes (Bug 63 + Bug 65 + Bug 68 in `type-system.ts` / `emit-*.js`). Run `git -C "$WORKTREE_ROOT" merge main` (LOCAL main at `8226d304`; clean fast-forward — your branch has no commits). Confirm HEAD now shows `8226d304` in ancestry. If it conflicts or main is unreachable, STOP and report. **Why:** editing `type-system.ts` / `ast-builder.js` on the stale base would make the PA's file-delta landing REVERT Bug 63/68.
5. `bun install`. 6. `bun run pretest`.

If ANY check fails: STOP and report.

## Path discipline (S99/S126)
- **Apply ALL edits via Bash** (`perl -i`/`python`/heredoc) on **worktree-absolute paths including `.claude/worktrees/agent-<id>/`**, NOT Edit/Write tools (they leak to MAIN). Echo path before each write; re-verify after.
- **NEVER `cd` into the main repo** / outside `WORKTREE_ROOT`. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
- First commit message embeds pwd: `WIP(bug67): start at $(pwd)`. Commit per meaningful edit; `git status` clean before DONE. Update `docs/changes/bug-67-return-match-exhaustiveness-2026-06-02/progress.md` (append-only) per step.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full (in your worktree, AFTER the merge). Follow **"Task-Shape Routing"** → **"parser / grammar fix"** + **"compiler-source bug fix"**. Key maps: `domain.map.md` (pipeline stages BS/TAB + match concept), `error.map.md` (E-TYPE-020 / E-MATCH-NOT-EXHAUSTIVE fire sites). Feedback line in your report.

---

# THE BUG (confirmed reproduced by PA on HEAD 8226d304)

**Reproducer A — `return match` (the bug — silent; SHOULD fire E-TYPE-020):**
```scrml
${
    type Phase:enum = { Idle, Loading, Done }
    <phase>: Phase = .Idle
    fn label() -> string {
        return match @phase { .Idle => "i" .Loading => "l" }
    }
}
<div>${@phase} ${label()}</div>
```
Compile (`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <tmp>/A.scrml -o <tmp>/distA`) → **exit 0, NO error** (the bug — `.Done` is missing but no E-TYPE-020).

**Reproducer B — `let x = match` (the working sibling — fires correctly):**
```scrml
${
    type Phase:enum = { Idle, Loading, Done }
    <phase>: Phase = .Idle
    function go() {
        let r: string = match @phase { .Idle => "i" .Loading => "l" }
        return r
    }
}
<div>${@phase}</div>
```
→ fires `E-TYPE-020: Non-exhaustive match over enum type 'Phase'. Missing variants: ::Done.` (this is the TARGET behavior A must also reach).

**Also check the fn-PARAM case** (known-gaps mentions it): a `match` over a fn parameter (`fn label(p: Phase) -> string { return match p { ... } }` or `match p` as a statement). Determine whether it's the same `return match` root or a separate fn-param-typing issue; cover it if same-root, NOTE it if separate.

# SURVEY DIRECTION (depth-of-survey authorized — correct the locus if the survey points elsewhere)

The `let r = match` path produces a match-expr node that the value-return exhaustiveness walker (`checkEnumExhaustiveness`, §18.8.1, in `type-system.ts`) visits and fires E-TYPE-020. The `return match` path does NOT reach that check. Determine WHICH layer drops it:
- **Parser hypothesis:** the return-statement value (`return match {...}`) isn't parsed into a `match-expr` node (it collapses to a bare-expr / string), so the typer never sees a match to check. Look at how `return`-statements are parsed in `ast-builder.js` (and `expression-parser.ts` `match`-expression parsing) vs how `let x = <init>` parses its initializer — the let path clearly parses the match-expr; find why the return path doesn't.
- **Walker hypothesis:** the match-expr IS parsed at the return position but the exhaustiveness walker doesn't visit return-statement values. Check whether `checkEnumExhaustiveness` / the value-return match walker recurses into `return-stmt` nodes.
Confirm which (a quick AST-dump of Reproducer A's `label` fn body settles it). Fix at the right layer so `return match` is exhaustiveness-checked identically to `let x = match`.

**Scope guard (Rule 3):** this is enforcement-parity for the `return match` shape — do NOT redesign match parsing. The minimal correct fix routes the return-position match-expr through the same node-construction + exhaustiveness check the let-binding path already uses.

# Verification (compile-level canary)
Do NOT mark DONE without:
1. Reproducer A → now fires `E-TYPE-020` naming the missing `::Done` variant. Report the exact diagnostic.
2. Reproducer B → still fires (no regression on the let-binding form).
3. **Exhaustive `return match`** (all 3 variants covered) → compiles CLEAN (no over-fire; no spurious E-TYPE-020). Report.
4. **Canonical forms still work:** a `${}`-block `const <x> = match` AND a `<match for=Type on=expr>` block-form still check exhaustiveness as before (no regression — grep your full-suite for match tests).
5. fn-PARAM case result (covered or noted-separate).
6. Full suite `bun run test` — `0 fail`, baseline 22,787 pass (post-Bug-68). Report delta + any sample/example newly-errored (a real latent non-exhaustive `return match` the check now catches — report, don't suppress).

# Tests to author
- Unit: `compiler/tests/unit/return-match-exhaustiveness-bug67.test.js` — `return match` missing-variant fires E-TYPE-020; exhaustive `return match` clean; let-binding still fires (parity); fn-param case. Mirror the assertion style of an existing match-exhaustiveness test (e.g. `compiler/tests/unit/api-js-stdlib-enum-reexport.test.js` §C or `type-system.test.js`).

# Commit discipline
- Code + coupled test in the SAME commit. Pre-commit = unit+integration+conformance; pre-push = full+browser. **No `--no-verify`** on commit OR push without authorization (you don't have it). Branch name irrelevant (PA lands via S67 file-delta).

# Final report MUST include
- `WORKTREE_PATH`, `FINAL_SHA`, post-merge HEAD (confirm `8226d304` in ancestry), `FILES_TOUCHED` (exact), deferred items (esp. fn-param disposition).
- Layer finding (parser vs walker) + the AST-dump evidence.
- Verification verbatim (diagnostics for A/B + exhaustive-clean + canonical-forms-unaffected).
- Full-suite pass/fail/skip + delta + any newly-errored sample/example.
- Maps feedback line. Confirmation `git status` clean + all committed.
