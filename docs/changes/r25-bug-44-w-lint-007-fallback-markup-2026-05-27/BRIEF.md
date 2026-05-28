# R25-Bug-44 — W-LINT-007 false-positive on `fallback={<markup/>}` (SPEC §19.6 canonical errorBoundary shape)

You are dispatched to fix known-gaps Bug 44 (R25 finding; MED severity; dev-3 + dev-4 + overseer-4 confirmed).

Change-id: `r25-bug-44-w-lint-007-fallback-markup-2026-05-27`

PA archives this brief to `docs/changes/r25-bug-44-w-lint-007-fallback-markup-2026-05-27/BRIEF.md` per pa.md S136 addendum.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (before ANY other tool call)

1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. STOP if otherwise.
2. `git rev-parse --show-toplevel` — must equal WORKTREE_ROOT.
3. `git status --short` — clean.
4. `bun install`.
5. `bun run pretest`.

STOP on any failure.

## Startup-merge of main (S112)

```
git -C "$WORKTREE_ROOT" merge main
```

Current main HEAD: `2efa2b06` (post Bug 30 RESOLVED + R26 verification). Bug 30 fix just landed at `5199a435` and touched the SAME file you will edit (`compiler/src/lint-ghost-patterns.js`). Read the Bug 30 diff before changing — your fix MUST compose with the `buildSkipRanges` HTML comment recognition + the 8 patterns extended to `commentRanges`:

```
git -C "$WORKTREE_ROOT" show 5199a435 -- compiler/src/lint-ghost-patterns.js | head -100
```

## Echo-pwd-in-first-commit (S99 — counter is 20)

First commit: `WIP(r25-bug-44): start at $(pwd)`.

## Path discipline

**S126: all compiler-source edits via BASH** (perl/python/sed/heredoc), NOT Edit/Write. Echo target path before each write; verify via `git diff`. **NEVER `cd` into the main repo.** Use `git -C "$WORKTREE_ROOT"` + worktree-absolute paths exclusively.

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. This is a **lint pass single-file narrowing** — same file as Bug 30 just touched.

Map watermark `27e14c66` (S135); main `2efa2b06` (~42 commits ahead). Bug 30 (`5199a435`, S137) modified `compiler/src/lint-ghost-patterns.js` `buildSkipRanges` + 8 W-LINT pattern skipIf extensions. Read its diff first.

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>".

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md`
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
3. **`compiler/src/lint-ghost-patterns.js`** — the fix locus. Read W-LINT-007's pattern definition + skipIf. Read what Bug 30 just changed.
4. **SPEC §19.6 `<errorBoundary>`** — what canonical form looks like
5. **SPEC §19.6.2** — specifies `<errorBoundary fallback={<markup/>}>` as canonical (braces required for markup-valued attribute)
6. `docs/known-gaps.md` Bug 44 entry — full context including the R24 step-3b coupling note (which is OUT OF SCOPE here)

# THE BUG

## Symptom (R25 dev-3-svelte + dev-4-pascal + overseer-4 confirmed)

W-LINT-007 ghost-pattern lint fires on `<errorBoundary fallback={<markup/>}>` with message: "scrml uses `<Comp prop=val>`" — treating it as a JSX `{val}` braces-in-attribute pattern.

But SPEC §19.6.2 specifies `fallback={<markup/>}` as the CANONICAL errorBoundary form (braces required for markup-valued attribute). **The only-working `<errorBoundary>` shape is lint-flagged as an anti-pattern.** Adopters either ignore the lint OR find another (broken) form. Bug 44 closes the false-positive.

## Reproducer

```scrml
<errorBoundary fallback={<div>Something went wrong</div>}>
    <Inner/>
</errorBoundary>
```

Pre-fix: W-LINT-007 fires on the `fallback={<div>...</div>}` attribute.

## Locus hypothesis

PA HYPOTHESIS: W-LINT-007 pattern (currently in `lint-ghost-patterns.js`) needs a narrow exception for the SPEC-canonical `<errorBoundary fallback={...}>` shape (and possibly other SPEC-canonical markup-valued attributes).

**Suggested fix shape:**

Option (a) — **Element-specific exception:** add a skipIf condition: when the surrounding element opener is `<errorBoundary` AND the attribute name is `fallback`, AND the value is `{<...>}` (markup-valued), W-LINT-007 does NOT fire.

Option (b) — **Markup-valued attribute exception:** more general — if the value inside `{...}` parses as markup (starts with `<` followed by lowercase or capital identifier), W-LINT-007 does NOT fire. Covers `fallback={<markup/>}` but also `prop={<Comp/>}` etc.

Option (c) — **Targeted registry:** maintain a small registry of SPEC-canonical `<Element attr={markup}>` shapes; W-LINT-007 checks the registry.

**PA lean: option (b)** — markup-valued braced attributes are the canonical scrml form for passing markup as a value (per L1 markup-as-first-class-value pillar). W-LINT-007 should fire on `{val}` for SCALAR values (per its original purpose: catching JSX `{cond}` braces) but NOT on `{<markup/>}` shapes. Verify with SPEC + the actual pattern code.

**S137 brief-hypothesis-vs-grep track record: 2 correct (Bug 35 + Bug 30) / 6 wrong-direction.** Hypothesis confidence is moderate here — verify via the actual W-LINT-007 pattern definition + a few SPEC examples.

**Investigation order:**
1. Grep `W-LINT-007` in `compiler/src/lint-ghost-patterns.js`. Read the pattern definition + the current skipIf.
2. Check SPEC §19.6 + §19.6.2 for the canonical errorBoundary shape. Are there other SPEC-canonical sites that use markup-valued braced attributes?
3. Look at PRIMER §6 / SPEC §5 for how markup-valued attribute attribute syntax is supposed to be lint-classified.
4. Decide between option (a) / (b) / (c) based on what SPEC's broader markup-valued-attribute surface looks like. If `{<markup/>}` is canonical EVERYWHERE (not just errorBoundary), option (b) is the right scope. If it's specifically errorBoundary today, option (a) is surgical.

# OUT OF SCOPE — IMPORTANT

The R24 step-3b errorBoundary direction call is a **substantive design deliberation** about which form is canonical:
- SPEC §19.6 form: `<errorBoundary fallback={<markup/>}>`
- PRIMER §6.8 form: `<errorBoundary renders=.Fallback>` + sibling `<errorBoundary.Fallback>...</></>`
- Compiler-actually-accepts: SPEC form (per R25 dev observation)

**Three canon layers disagree.** This is a DESIGN-DELIBERATION concern that Bug 44 fix does NOT need to resolve. Your fix scope is:

**Surgical W-LINT-007 narrowing to NOT false-positive on SPEC-canonical markup-valued braced attributes (specifically `fallback={<markup/>}` on `<errorBoundary>`, possibly extended to all `Element attr={<markup/>}` shapes).**

The broader canon-disagreement / direction call stays a separate substantive deliberation. DO NOT attempt to resolve PRIMER vs SPEC vs compiler in this dispatch.

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. Construct minimal reproducer:
   ```scrml
   <program title="repro">
       <page>
           <errorBoundary fallback={<div>Something went wrong</div>}>
               <h1>Hello</h1>
           </errorBoundary>
       </page>
   </program>
   ```
   Compile + check stderr/lints. Confirm W-LINT-007 fires.

2. Read W-LINT-007 pattern definition in `compiler/src/lint-ghost-patterns.js`. Read its skipIf chain (post-Bug-30 it should already skip on commentRanges).

3. Determine: does W-LINT-007 see the inside of `{...}` as a markup expression OR a scalar value? The fix shape depends on this.

4. Report root-cause hypothesis in `docs/changes/r25-bug-44-w-lint-007-fallback-markup-2026-05-27/progress.md` BEFORE writing fix code. Pick option (a) / (b) / (c) based on findings.

## Phase 1 — fix

Apply minimal narrowing. Compose with:
- Bug 30's HTML-comment skip (preserved — your change extends Bug 30, doesn't break it).
- W-LINT-007's original purpose: catch JSX `{scalarVal}` braced-attribute patterns. The SCALAR case MUST still fire — that's the ghost-pattern detection.
- Other SPEC-canonical markup-valued braced attributes (if option (b)) — be defensive about what's actually canonical vs adopter assumption.

## Phase 2 — regression tests

NEW: `compiler/tests/unit/lint-w-007-markup-valued-attr-r25-bug-44.test.js`. Required test sites:

1. **Minimal repro** — `<errorBoundary fallback={<div>...</div>}>` does NOT fire W-LINT-007
2. **errorBoundary with nested markup** — `<errorBoundary fallback={<Fallback msg=@err.msg/>}>` does NOT fire
3. **Negative control — scalar braced value** — `<Comp prop={value}>` STILL fires W-LINT-007 (its original purpose)
4. **Negative control — scalar braced expression** — `<button onClick={(e) => @x = 1}>` STILL fires (arrow value, not markup)
5. **Component prop with markup value** — `<MyComp slot={<div/>}>` — TBD based on PA decision; document the choice
6. **Multiple errorBoundary props** — `<errorBoundary fallback={<F/>} onCatch={handler}>` — `fallback` exempted; `onCatch` IF it's still a scalar continues to fire (or use canonical bare-form per SPEC)
7. **HTML comment regression-guard** — `<!-- <errorBoundary fallback={<F/>}> -->` does NOT fire (Bug 30 path STILL holds)
8. **Adjacent attribute** — `<errorBoundary fallback={<F/>} class="boundary">` — only `fallback` exempted; other normal attrs unaffected

Aim for 10-15 tests.

## Phase 3 — verify

1. Minimal reproducer compiles with NO W-LINT-007 on the `fallback={<markup/>}` attribute.
2. Bug 30 regression-guard: HTML-comment skip still works.
3. Full suite: `bun run test` must pass. Baseline at HEAD `2efa2b06`: ~15,031 pass / 0 fail / 88 skip / 1 todo (subset).
4. **EMPIRICAL R26 verification** (per S138 doctrine — lint false-positive is adopter-visible):
   ```
   for dev in dev-3-svelte dev-4-pascal; do
     # R25 sources at scrml-support/docs/gauntlets/gauntlet-r25/
     bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile \
       /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/$dev.scrml \
       --output-dir /tmp/r26-bug44-verify/$dev > /tmp/r26-bug44-verify/$dev.log 2>&1
     echo "$dev: W-LINT-007 on fallback={...}: $(grep -E 'W-LINT-007.*fallback' /tmp/r26-bug44-verify/$dev.log | wc -l)"
     # Note: R24 sources at gauntlet-r24/ are also candidates if any use errorBoundary
   done
   ```
   **Expected after fix:** W-LINT-007 fires on `fallback={...}` shape drop to 0; other W-LINT-007 fires on TRUE scalar braced values preserved.

# COMMIT DISCIPLINE (S83 + S113)

Coupled code + test = ONE commit per S113. WIP commits OK for crash-recovery.

# `--no-verify` PROHIBITION (S136 absolute)

NEVER. Session precedent: 8 of 9 dispatches clean (Bug 37 had self-corrected violation; Bug 35 crashed before any --no-verify).

# REPORTING

1. WORKTREE_PATH (literal `pwd`)
2. BRANCH
3. FINAL_SHA
4. FILES_TOUCHED
5. TEST_DELTA
6. ROOT-CAUSE FINDING (1-2 paragraphs)
7. REPRODUCER VERIFICATION (BEFORE/AFTER W-LINT-007 fire count on canonical shape)
8. R26 EMPIRICAL on R25 dev sources (dev-3 + dev-4)
9. SCOPE DECISION — option (a) / (b) / (c); rationale
10. MAPS CONSULTED + load-bearing finding
11. DEFERRED ITEMS (specifically: errorBoundary direction call R24 step-3b is OUT OF SCOPE; surface as ongoing-deferred)
12. PROCESS VIOLATIONS

# OUT OF SCOPE (RESTATED)

- errorBoundary direction call (R24 step-3b) — separate substantive design deliberation
- Bug 30 / Bug 35 / Bug 42 — RESOLVED, don't touch their fix sites
- Bug 31 / Bug 32 — separate MED dispatches
- SPEC changes — lint pass only
- Refactor beyond what fix requires
- PRIMER §6.8 `renders=.Fallback` form (which errors at attribute parse per R25 observation) — NOT touching that surface

# IF YOU GET STUCK

After 60-90 min: STOP, report partial. WIP commit each step. Append progress.md.

GO.
