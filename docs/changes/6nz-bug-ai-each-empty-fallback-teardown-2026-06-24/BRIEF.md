# DISPATCH BRIEF — 6nz Bug AI (MED): `<each>`/`<empty>` fallback not torn down on empty→non-empty

change-id: `6nz-bug-ai-each-empty-fallback-teardown-2026-06-24`
agent: scrml-js-codegen-engineer · model: opus · isolation: worktree · background
dispatched by PA, S218, 2026-06-24, against main HEAD `82f76085` (v0.7.0)

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (execute BEFORE any other tool call)

S99 had FOUR path-discipline leaks in one session; S126 added two more (Edit/Bash filesystem divergence). Do NOT become the next incident.

## Startup verification (in order)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing failure). Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git merge main` (or confirm base is `82f76085` / descendant) — no-op if current; report on conflict.
4. `git status --short` clean.
5. `bun install` — worktrees don't inherit node_modules (pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` — populates gitignored `samples/compilation-tests/dist/` (else ~130 ECONNREFUSED browser-test failures). Use `bun run test` (chains pretest) for full-suite baselines.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY write)
- Apply ALL edits via **Bash** (`perl`/`python3`/heredoc/`cp`) on **worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment** — NOT Edit/Write (S126: Edit/Write wrote to MAIN while Bash/git saw the worktree). Echo the path before each write; re-verify with `git diff`/`grep`.
- NEVER `cd` into the main repo. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.
- First commit message embeds the verbatim startup `pwd`: `WIP(6nz-bug-ai): start at $(pwd)`.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full, then follow §"File Routing" for a **runtime + codegen `<each>` fix** (domain.map.md "Codegen each/match/engine Emit Map" + structure.map.md each-block rows).

Map currency: maps reflect commit **489951aa** (~several commits behind HEAD `82f76085` — the S218 GITI-032 landing `e493bace` touched `emit-each.ts`). **Treat maps as a starting hypothesis; verify against current source via grep/Read.**

Feedback in your report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "not load-bearing."

---

# THE BUG (MED — broad-adopter render bug; 6nz Bug AI; clean general repro)

`<each in=@items>` with an `<empty>` fallback does **not remove the fallback** when the list goes empty → non-empty. The first real item is appended **next to** the leftover fallback. Reverse (non-empty → empty) is correct; only the empty→non-empty edge is broken. PA has confirmed the root structurally at HEAD `82f76085`.

## Repro (6nz, minimal — verified compiles clean; the bug is RUNTIME)

```scrml
<program>
<items>: string[] = []
${
    function add() { @items = [...@items, "item " + (@items.length + 1)] }
    function clear() { @items = [] }
}
<div class="app">
    <button class="add" onclick=add()>Add</button>
    <button class="clear" onclick=clear()>Clear</button>
    <ol class="list">
        <each in=@items key=__index__>
            <li : @.>
            <empty : "EMPTY-FALLBACK">
        </each>
    </ol>
</div>
</program>
```

Observed `<ol class="list">` innerHTML: initial `EMPTY-FALLBACK` ✓ → after Add: `EMPTY-FALLBACK<li>item 1</li>` ✗ (fallback should be gone) → after 2nd Add: `EMPTY-FALLBACK<li>item 1</li><li>item 2</li>` ✗ → after Clear: `EMPTY-FALLBACK` ✓.

## ROOT CAUSE (PA-confirmed — verify; you may correct the locus, depth-of-survey-discount applies)

The emitted per-each render fn (`_scrml_each_render_NN`) has TWO branches:
- **empty** (`!_items || _items.length === 0`): `_mount.replaceChildren()` then appends the `<empty>` fallback fragment. Correct.
- **non-empty**: calls `_scrml_reconcile_list(_mount, _items, keyFn, createFn)` directly — it does NOT clear the leftover fallback first.

The defect is in the **runtime helper `_scrml_reconcile_list`** at `compiler/src/runtime-template.js` (~L1541; the relevant branch ~L1605-1615): it builds `oldNodes` from container children that carry a `_scrml_key`. On empty→non-empty the container still holds the `<empty>` fallback **text node, which has NO `_scrml_key`** → `oldNodes.size === 0` → the **bulk-create-from-empty fast path** (~L1612) runs `createFn` for each item and **appends** them **without clearing the container first** → the stale fallback text node survives beside the new `<li>`s.

**Fix direction (verify + implement the clean version):** in the `oldNodes.size === 0` bulk-create branch, **clear stray non-keyed content from the container before appending** (e.g. `container.replaceChildren()` at the top of that branch — safe because `oldNodes.size === 0` means there are NO keyed children to preserve; any content is stray non-keyed [the fallback, or nothing on first render]). Confirm this does NOT touch the `oldNodes.size > 0` keyed-reconcile path. NOTE the runtime template is mirrored into emitted chunks via `compiler/src/codegen/runtime-chunks.ts` — verify the fix reaches the emitted runtime (rebuild/recompile a repro and grep the emitted `_scrml_reconcile_list`).

**Shared-helper alert:** `_scrml_reconcile_list` backs EVERY `<each>`. The fix MUST NOT regress: normal keyed reconcile (add/remove/reorder mid-list), `<each>` WITHOUT an `<empty>`, first-render bulk-create, and the non-empty→empty path (fallback returns).

## SPEC authority (Rule 4)
- §17.7 `<each>` (iteration) + §17.7.4 `<empty>` sub-element (rendered when collection empty / `.length===0`; `@.` not in scope inside `<empty>`).

---

# PHASE 3 — EMPIRICAL / BROWSER VERIFICATION (MANDATORY — this is a runtime-DOM bug; unit tests on codegen will NOT catch it)

The regression test MUST be a **browser test** (`compiler/tests/browser/`, happy-dom) that compiles the repro, drives the transition sequence, and asserts `ol.list` innerHTML at each step:
1. initial (`@items=[]`) → fallback present (`EMPTY-FALLBACK`, no `<li>`).
2. after 1× add → `<li>item 1</li>` present, **fallback GONE**.
3. after 2× add → two `<li>`s, **no fallback**.
4. after clear → fallback present again, no `<li>`.
5. after add again (empty→non-empty 2nd cycle) → `<li>`, **no fallback** (verify it works repeatedly, not just first time).

Report the exact innerHTML asserted at each step.

# S215 ADVERSARIAL GATE (MANDATORY — `_scrml_reconcile_list` is shared by every `<each>`; enumerate blast radius)

Construct + run browser/compile checks for the adjacent shapes; confirm none regress:
- `<each>` WITHOUT `<empty>` — first render + add/remove still correct.
- normal keyed reconcile: non-empty→non-empty with `key=@.id` (struct items) — add, remove-from-middle, reorder; NO item loss / duplication / fallback artifacts.
- `key=__index__` vs inferred/`key=@.id` forms.
- repeated empty↔non-empty cycles (≥3 round-trips).
- nested `<each>` (a `_scrml_reconcile_list` inside another) — the clear must be scoped to the right mount.
Then run `/code-review` (high) on the diff (or a self-adversarial enumeration). Land only if clean.

---

# WITHIN-NODE PARITY + FULL SUITE (S198 — MANDATORY)

A runtime-template change is unlikely to shift within-node fixture ASTs, but VERIFY: run the FULL `bun run test` (not just the pre-commit subset — the parity canary + browser/lsp live only in the full suite). If any within-node fixture goes OVER-BUDGET (`[within-node] OVER-BUDGET <relpath>: {...}`), rebaseline that allowlist entry's per-class values to the printed `raw` IN-PLACE (preserve key order). Report final pass/skip/fail.

# COMMIT DISCIPLINE (crash-recovery — commit per unit, don't batch)
- After each edit: `git -C "$WORKTREE_ROOT" diff` → `add` → commit immediately (WIP commits expected). Code + coupled test in ONE commit.
- Update `docs/changes/6nz-bug-ai-each-empty-fallback-teardown-2026-06-24/progress.md` after each step (append-only).
- Before DONE: `git -C "$WORKTREE_ROOT" status --short` clean. "work in worktree, no commits" is NOT acceptable.

# FINAL REPORT
- WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED
- Root cause (confirmed/corrected) + the fix in 2-3 sentences
- Phase-3 browser-test results (innerHTML at each transition step)
- S215 adversarial results (the transition matrix + review outcome)
- Within-node: touched? Full-suite final counts.
- Maps feedback · deferred items

If you hit a wall after a genuine survey, request a deep-dive from PA rather than guessing.
