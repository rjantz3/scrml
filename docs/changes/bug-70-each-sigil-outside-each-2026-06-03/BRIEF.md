# Bug 70 — `@.` used OUTSIDE an `<each>` body leaks raw → confusing E-CODEGEN-INVALID-JS instead of the spec'd E-SYNTAX-064

> **S136 archival.** Verbatim `prompt:` dispatched to `scrml-js-codegen-engineer`
> (isolation:worktree, bg, model:opus) at S157, 2026-06-03. Worktree base = session-start
> `57edc794`; brief mandates `git merge main` (→ `fe4ca941`) at startup to inherit landed
> Bug 63/65/67/68/71.

Change-id: `bug-70-each-sigil-outside-each-2026-06-03`

You are wiring a spec'd-but-unwired diagnostic in the scrml compiler. `@.` is the `<each>`-only iteration sigil (§17.7.3). When `@.` is used OUTSIDE an `<each>` body, it should fire **`E-SYNTAX-064`** ("the `@.` contextual sigil is only legal inside an `<each>` body scope") — but that diagnostic is QUEUED/unwired (PRIMER §6.3 "Implementation status"; SPEC §17.7.3). Currently `@.`-outside-`<each>` leaks raw into codegen → the confusing `E-CODEGEN-INVALID-JS` ("the compiler emitted JavaScript it cannot itself parse"). Replace the confusing leak with the clear diagnostic.

**This is a Rule-4 spec-faithful fix.** Do NOT make `@.` silently lower in a Tier-0 `for`-lift (that would contradict §17.7.3, where Tier-0 uses the bare loop variable, not `@.`). The fix is to EMIT E-SYNTAX-064.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. `git status --short` clean; note `git rev-parse --short HEAD` (likely stale session-start `57edc794`).
4. **MERGE CURRENT MAIN (S112 — MANDATORY).** Your worktree branched from session-start, PREDATING six landed S157 commits (Bug 63/65/67/68/71 + maps). Run `git -C "$WORKTREE_ROOT" merge main` (LOCAL main at `fe4ca941`; clean fast-forward). Confirm `fe4ca941` in ancestry. **Why:** Bug 70 edits `type-system.ts` (+ possibly `ast-builder.js` / `§34`) — files Bug 63/67/68/71 just touched; editing on the stale base would REVERT them. If merge conflicts, STOP and report.
5. `bun install`. 6. `bun run pretest`.
If ANY check fails: STOP and report.

## Path discipline (S99/S126)
- **Apply ALL edits via Bash** (`perl -i`/`python`/heredoc) on **worktree-absolute paths including `.claude/worktrees/agent-<id>/`**, NOT Edit/Write tools (they leak to MAIN). Echo path before each write; re-verify after.
- **NEVER `cd` into the main repo** / outside `WORKTREE_ROOT`. Use `git -C`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.
- First commit embeds pwd: `WIP(bug70): start at $(pwd)`. Commit per edit; `git status` clean before DONE. Update `docs/changes/bug-70-each-sigil-outside-each-2026-06-03/progress.md` (append-only) per step.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full (in your worktree, AFTER the merge). Follow **"Task-Shape Routing"** → **"compiler-source bug fix"** + **"parser/grammar fix"**. Key maps: `error.map.md` (E-SYNTAX-* / E-CODEGEN-INVALID-JS fire sites), `domain.map.md` (`<each>` / `@.` sigil concept). Feedback line in your report.

---

# THE BUG (confirmed reproduced + characterized by PA on HEAD fe4ca941)

`@.` outside an `<each>` body is not diagnosed; it leaks to codegen.

**Reproducer A — `@.` in a handler-call arg in a Tier-0 for-lift (expression position):**
```scrml
<program>
${
    type Item:struct = { id: int, name: string }
    <items>: Item[] = []
    function ping(x) { x }
}
<ul>${ for (it of @items) { lift <li onclick=ping(@.id)>${it.name}</li> } }</ul>
</program>
```
Compile → emits `_scrml_ping_N(@.id)` (raw `@.`) → `error [E-CODEGEN-INVALID-JS]`. The bare loop var `ping(it.id)` works (PA-verified). `@.` is `<each>`-only; here it's outside any `<each>` → should be E-SYNTAX-064.

**Reproducer B — bare `@.field` attr-value outside `<each>`:** construct a `class:done=@.done` (or similar `@.`-attr) outside any `<each>` body and confirm the current behavior (likely a fall-through E-SCOPE-001 on base `@`, or a leak). It should also be E-SYNTAX-064.

# PA SURVEY (your starting point — verify + extend)

`type-system.ts:7362` defines `inEachBodyScope()` (walks the scope chain for a `each:`-labelled scope). `type-system.ts:7395` (`visitAttr`) already gates the bare `@.`-attr-value SKIP on `inEachBodyScope()`, and the comment at :7393 explicitly says "`@.` OUTSIDE an each body remains E-SYNTAX-064 territory" — but there is NO else-branch firing E-SYNTAX-064. AND the reproducer-A `@.` is nested inside a CALL expression in a handler (`ping(@.id)`), an EXPRESSION position that likely does not even reach `visitAttr` — it flows through the handler/expression resolution path.

So the fix is: **wherever `@.` is recognized, gate it on `inEachBodyScope()` and fire E-SYNTAX-064 when false.** Survey the `@.` positions:
- (1) bare `@.`/`@.field` attr-value (`visitAttr` :7395) — add the else-fire.
- (2) `@.` inside expressions — interpolation (`${@.name}`), handler-call args (`ping(@.id)`), bare-expr. These reach `checkLogicExprIdents` / `forEachIdentInExprNode` / the markup-attr handler path (the Bug 63 `handlerAttrToExprNode` route is now in this file — `@.` could be checked there too). Find where an `@.`-rooted ident is resolvable and gate it.

Use `forEachIdentInExprNode` (or the existing ident walkers) to find `@.`-prefixed idents; reuse `inEachBodyScope()` for the gate.

# PHASE 0 — SCOPE STOP CONDITION
Map ALL the positions `@.` can appear and where each is resolved. **If covering the expression positions requires touching many disjoint resolution paths (a sprawling change), STOP and report** the map + propose a scoped subset (at minimum: the attr-value else-fire (1) + the handler-call-arg path (2, the reproducer-A case), which are the concrete adopter-hit positions). Cover what's clean; NOTE the rest as a follow-up. Do NOT expand unboundedly. If it's a tight gate-and-fire at 1-2 sites, do all of it.

# §34 catalog (Rule 4 — SPEC §34 is normative)
E-SYNTAX-064 is "queued" — check `grep -n 'E-SYNTAX-064' compiler/SPEC.md` and whether a §34 catalog ROW exists. If the §34 row is missing, ADD it (severity Error, cross-ref §17.7.3 / §34) in the SAME change that wires the fire (a routed code with no §34 row is a spec-vs-impl divergence). Message text: name the `@.` sigil + "only legal inside an `<each>` body" + suggest the bare loop variable (Tier-0) / `as name` alias.

# Verification (compile-level canary)
Do NOT mark DONE without:
1. Reproducer A → now fires `E-SYNTAX-064` (clear message); `E-CODEGEN-INVALID-JS` NO LONGER fires for it. Report the exact diagnostic.
2. Reproducer B (bare `@.` attr-value outside each) → fires E-SYNTAX-064.
3. **No regression on legitimate `@.` INSIDE `<each>`:** the Bug 65 reproducer (`<each in=@cols as col>` with `@.`-free handlers) + the `<each>` corpus tests + a `<each in=@items><li : @.name></each>` (bare `@.` inside each) all still compile clean. Run the each test suite.
4. Bug 63/65/67/68/71 untouched (you merged them).
5. Full suite `bun run test` — `0 fail`, baseline 22,803 pass. Report delta + any sample/example newly-errored (a real latent `@.`-outside-each the check now catches — report, don't suppress).

# Tests to author
- Unit: `compiler/tests/unit/each-sigil-outside-each-bug70.test.js` — `@.` outside `<each>` (handler-arg + bare attr-value) fires E-SYNTAX-064; `@.` inside `<each>` body stays clean; the §34 row exists. Mirror an existing diagnostic-firing unit test.

# Commit discipline
- Code + coupled test SAME commit. Pre-commit = unit+integration+conformance; pre-push = full+browser. **No `--no-verify`** without authorization (you don't have it). Branch name irrelevant (PA lands via S67 file-delta).

# Final report MUST include
- `WORKTREE_PATH`, `FINAL_SHA`, post-merge HEAD (confirm `fe4ca941` in ancestry), `FILES_TOUCHED`, deferred items (the `@.` positions you did NOT cover, if any, + why).
- Phase-0 scope map (the `@.` positions + which you covered).
- Whether the §34 row existed or you added it.
- Verification verbatim (A/B diagnostics + inside-each-clean + no-E-CODEGEN-INVALID-JS).
- Full-suite pass/fail/skip + delta + any newly-errored sample/example.
- Maps feedback line. Confirmation `git status` clean + all committed.
