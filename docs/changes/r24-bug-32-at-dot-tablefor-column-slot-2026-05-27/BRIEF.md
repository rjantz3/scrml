# R24-Bug-32 — `@.` iteration sigil not lowered inside `<tableFor>` column slot body (R24-BUG-6)

You are dispatched to fix known-gaps Bug 32 (R24 finding, filed as R24-BUG-6; MED severity; dev-1-react overseer-confirmed; Bug 31 dispatch agent surfaced a related class observation about `<each>` body — investigate if same root).

Change-id: `r24-bug-32-at-dot-tablefor-column-slot-2026-05-27`

PA archives this brief to `docs/changes/r24-bug-32-at-dot-tablefor-column-slot-2026-05-27/BRIEF.md` per pa.md S136 addendum.

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

Current main HEAD: `7f936234` (post Bug 31 RESOLVED). Includes everything S136 + S137 (R25 HIGH cluster + Bug 35/42/30/43/44/31 + SPEC §19.4.1 + pa.md S138 + S139).

**Critical post-map landings affecting this dispatch:**
- Bug 31 `8f4f4ce3` modified `ast-builder.js` for JS ASI on `return` — your fix may also touch `ast-builder.js` OR `@.` lowering pass; read Bug 31's diff
- Bug 40 `50d38095` modified `<each>` block-splitter + ast-builder + `emit-each.ts` for `:`-shorthand recognition — `<each>` is sibling territory
- Bug 42 `480aded4` modified `ast-builder.js` BARE_DECL_RE + synthetic-logic-block child-population + yield-stmt handlers — adjacent ast-builder territory

Read:
```
git -C "$WORKTREE_ROOT" log --stat 8f4f4ce3 50d38095 480aded4 -- compiler/src/ast-builder.js compiler/src/codegen/emit-each.ts
```

## Echo-pwd-in-first-commit (S99 — counter is 20)

First commit: `WIP(r24-bug-32): start at $(pwd)`.

## Path discipline

**S126: all compiler-source edits via BASH** (perl/python/sed/heredoc), NOT Edit/Write. Echo target path before each write; verify via `git diff`. **NEVER `cd` into the main repo.** Use `git -C "$WORKTREE_ROOT"` + worktree-absolute paths exclusively.

Last 3 dispatches (Bug 31 + Bug 44) had ONE S126 deviation each (Edit tool during debug iteration). Banked-as-honest-declaration. Try to use perl scripts for ALL compiler-source edits this dispatch.

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. This is a **codegen single-file or small-multi-file fix** in the `@.` iteration-scope lowering pass.

Map watermark `27e14c66` (S135); main `7f936234` (~50 commits ahead). PA pre-recon: `emit-table-for.ts` (S105 shipped) is the tableFor codegen; `@.` lowering happens somewhere — possibly in expression-parser or a codegen pass that walks template-children.

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>".

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md`
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
3. `docs/articles/llm-kickstarter-v2-2026-05-04.md`
4. **SPEC §17.7 (`<each>` iteration / `@.` semantics)** — `@.` is the iteration value sigil; lowers to the iteration-bound variable
5. **SPEC §41.16 (`tableFor`) + §41.16.3 (column slot grammar)** — what column slot syntax SHOULD support
6. **`compiler/src/codegen/emit-table-for.ts`** — the tableFor codegen (S105 shipped). Where does `@.` get lowered in column slot context?
7. **`compiler/src/codegen/emit-each.ts`** — sibling: how does `<each>` lower `@.`? Same mechanism, or different?
8. `docs/known-gaps.md` Bug 32 entry — full context

# THE BUG

## Symptom (R24 dev-1-react overseer-confirmed)

A `<column field="status" :let={(row) => <span>${@.status}...}/>` inside a `<tableFor for=T rows=@cell>` block emits `@ . status` UNLOWERED into the client JS — the iteration-scope binding doesn't reach into the L22 column slot. Surfaced as orphan `@` token (literal `@` character left in emitted JS = SyntaxError).

dev-1-react example:
- `tableFor` column slot uses `${@.field}` to access the per-row binding
- Emitted JS contains literal `@` token in the column slot's render shape

## Related observation from Bug 31 agent (CHECK FOR SAME ROOT)

Bug 31 dispatch agent reported a pre-existing line-438 SyntaxError in dev-1-react.client.js at landing — specifically `String((@ . status) ?? "")` — `${@.status}` orphan-sigil rendering inside an `<each>` body. SAME ORPHAN-`@` PATTERN. They flagged it as: "DIFFERENT bug; out of scope. R24 surfacing might want a separate filing."

**INVESTIGATION HYPOTHESIS:** Bug 32 and the Bug 31 agent's deferred `<each>` finding may share the SAME root cause — the `@.` lowering pass doesn't recognize CERTAIN iteration loci. Possible scenarios:
- (a) Same root: `@.` lowering missing both `<tableFor>` column slot AND `<each>` body in some specific configuration (e.g., nested inside another markup element, inside an interpolation, etc.)
- (b) Different roots: column-slot context-handover is different from `<each>` body context-handover

VERIFY BY EMPIRICAL PROBE — compile both shapes and see which loci hit the bug.

## Reproducer

Minimal:
```scrml
<program title="repro">

    <state>
        type Item:struct = { id: string, name: string, status: string }
        <items>: Item[] = []
    </state>

    <page>
        <tableFor for=Item rows=@items pick=["name", "status"]>
            <column field="status" :let={(row) =>
                <span class="badge">${@.status}</span>
            }/>
        </tableFor>
    </page>

</program>
```

(Adjust state-decl + tableFor shape if PRIMER/SPEC has drifted; the goal is the `:let={...}` column-slot binding.)

Compile + inspect emitted client.js. Confirm:
- Literal `@` token in the emitted JS (or `@ . status` with spaces)
- `node --check` FAILS on that JS

## Locus hypothesis

PA HYPOTHESIS: the `@.` lowering pass recognizes `<each>` body as an iteration locus (Bug 40-era + `<each>` codegen at `emit-each.ts`) but NOT `<tableFor>` column slot context. The column slot is a L22 component-style slot mechanism; per-row binding goes through a different path than `<each>`'s direct emit.

**Alternative hypotheses:**
- The `@.` is lowered at parse time (expression-parser) which is iteration-loci-context-blind by design
- The fix is in `emit-table-for.ts` adding `@.` lowering for column slot body
- The fix is in a shared `@.` rewriter that needs `<tableFor>` column-slot context added to its scope-aware sites

**S137 brief-hypothesis-vs-grep track record: 4 correct (Bug 35 + Bug 30 + Bug 44 + Bug 31 wrong but caught early) / 7 wrong-direction.** Bug 32 is codegen + iteration-scope semantics — broader surface; hypothesis confidence MODERATE.

**Investigation order:**
1. Build minimal reproducer. Compile + inspect emitted client.js. Confirm literal `@` orphan token.
2. Compare to `<each in=@items><span>${@.field}</span></each>` (canonical iteration form which `<tableFor>` should mirror). Does that work? If yes, the `@.` lowering pass IS reaching `<each>` body. Find where.
3. Empirically test the Bug 31 deferred `<each>` shape — does THAT case fire too, or was that a specific composition (`<each>` body inside another locus)?
4. Trace where `@.` gets lowered (grep for `@\.` or `@\\.` token handling).
5. Identify the gap: does `<tableFor>` column slot template just need to flow through the same iteration-binding-aware pass `<each>` does?
6. Report root-cause in `docs/changes/r24-bug-32-at-dot-tablefor-column-slot-2026-05-27/progress.md` BEFORE writing fix.

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. Build minimal reproducer (above).
2. Compile + confirm symptom. node --check confirms SyntaxError.
3. Compare to working `<each>` shape (sanity-check the `@.` lowering reaches `<each>` body normally).
4. Empirical probe: does Bug 31 agent's deferred `<each>` line-438 shape ALSO reproduce on a minimal? If yes, file as related/same root.
5. Trace `@.` lowering pass. Find where the column-slot context gets missed.
6. Report root-cause in `progress.md` BEFORE writing fix.

## Phase 1 — fix

Apply minimal fix that lowers `@.` correctly inside `<tableFor>` column slot. Compose with:
- `<each>` body iteration (must STILL work)
- `<tableFor>` other column-slot use cases
- nested `<each>` inside `<tableFor>` column slot (if such composition is meaningful)
- Bug 40 `:`-shorthand body composition (`<each><li : @.name></each>` already works post-Bug-40)
- Bug 31 `return` ASI fix (different concern; unchanged)

**If empirical probe shows the Bug 31 agent's deferred `<each>` line-438 IS same root** — extend the fix to cover both loci; close as a class.

## Phase 2 — regression tests

NEW: `compiler/tests/unit/r24-bug-32-at-dot-tablefor-column-slot.test.js`. Required test sites:

1. **Minimal repro** — `<tableFor for=T rows=@items><column field=status :let={(row) => <span>${@.status}</span>}/></tableFor>` — emitted JS has `@.` properly lowered (no orphan `@`)
2. **Multi-column** — multiple `<column :let={...}>` slots, each with `@.`
3. **Direct `:let={row => ...}` access** — does `${row.field}` work alongside `${@.field}`? (`@.` is the SIGIL; `row` is the named binding)
4. **`<each>` regression-guard** — `<each in=@items><span>${@.field}</span></each>` STILL works
5. **`<each>` `:`-shorthand regression-guard** — `<each in=@items><li : @.name></each>` STILL works (Bug 40)
6. **Nested `<each>` inside `<tableFor>` column slot** — if structurally legal
7. **Non-iteration locus** — bare `${@.field}` OUTSIDE any iteration scope errors appropriately (E-SYNTAX-064 per PRIMER §6.3 / SPEC §17.7.3)
8. **node --check** on emitted JS — each parses clean
9. **If same root as Bug 31 deferred** — `<each>` `${@.status}`-in-some-specific-context test

Aim for 10-15 tests.

## Phase 3 — verify (R26 EMPIRICAL DOCTRINE per S138)

1. `node --check` on emitted JS for reproducer: parse clean.
2. **EMPIRICAL R26 verification on R24 dev-1-react** (the original source — Bug 31 left the line-438 issue unresolved; verify your fix handles BOTH the column-slot Bug 32 site AND the line-438 `<each>` site IF same root):
   ```
   bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile \
     /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-1-react.scrml \
     --output-dir /tmp/r26-bug32-verify/dev-1-react > /tmp/r26-bug32-verify/dev-1-react.log 2>&1
   echo "dev-1: node --check: $(node --check /tmp/r26-bug32-verify/dev-1-react/dev-1-react.client.js 2>&1 | head -1)"
   echo "dev-1: orphan '@ .' or '@\\s' tokens: $(grep -cE '\\b@\\s+\\.' /tmp/r26-bug32-verify/dev-1-react/dev-1-react.client.js)"
   ```
   **Expected after fix:**
   - `node --check` exits 0 (no SyntaxError) — IF Bug 31 + Bug 32 are the only failure sites in dev-1
   - Orphan `@` tokens drop to 0 OR drop to a defensible number (the specific Bug 32 surface = 0)
3. Full suite: `bun run test` must pass. Baseline at HEAD `7f936234`: ~15,066 pass / 0 fail / 88 skip / 1 todo (subset).

# COMMIT DISCIPLINE (S83 + S113)

Coupled code + test = ONE commit per S113. WIP commits OK for crash-recovery.

# `--no-verify` PROHIBITION (S136 absolute)

NEVER. Session precedent: 10 of 11 dispatches clean.

# REPORTING

1. WORKTREE_PATH (literal `pwd`)
2. BRANCH
3. FINAL_SHA
4. FILES_TOUCHED
5. TEST_DELTA
6. ROOT-CAUSE FINDING (1-2 paragraphs)
7. REPRODUCER VERIFICATION (BEFORE/AFTER for orphan `@` tokens in emitted JS)
8. SAME-ROOT-AS-BUG-31-DEFERRED-OBSERVATION? (did your fix close BOTH the column-slot AND the `<each>` body line-438 site? IF yes, banked as a class-level close)
9. R26 EMPIRICAL on R24 dev-1-react
10. MAPS CONSULTED + load-bearing finding
11. DEFERRED ITEMS
12. PROCESS VIOLATIONS

# OUT OF SCOPE

- All previously closed bugs — don't touch their fix sites
- SPEC changes — codegen-only fix
- Refactor beyond what fix requires
- Bug 31's dormant label-loop bug (already filed deferred separately)

# IF YOU GET STUCK

After 60-90 min: STOP, report partial. WIP commit each step. Append progress.md.

GO.
