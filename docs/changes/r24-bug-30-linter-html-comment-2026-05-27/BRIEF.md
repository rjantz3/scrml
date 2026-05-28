# R24-Bug-30 — Linter scans content inside `<!-- -->` HTML comment blocks

You are dispatched to fix known-gaps Bug 30 (R24 finding; MED severity; dev-2 + dev-3 + dev-4 overseers confirmed; R25 confirmed cross-ref via Bug 43).

Change-id: `r24-bug-30-linter-html-comment-2026-05-27`

PA archives this brief to `docs/changes/r24-bug-30-linter-html-comment-2026-05-27/BRIEF.md` per pa.md S136 addendum.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (before ANY other tool call)

1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP (S90 CWD-routing).
2. `git rev-parse --show-toplevel` — must equal WORKTREE_ROOT.
3. `git status --short` — clean.
4. `bun install`.
5. `bun run pretest`.

STOP on any failure.

## Startup-merge of main (S112)

```
git -C "$WORKTREE_ROOT" merge main
```

Current main HEAD: `022cce77` (post Bug 35 known-gaps refresh). Includes all R25 HIGH cluster + Bug 42 + Bug 35 + SPEC §19.4.1 amendment + pa.md S138 addendum.

## Echo-pwd-in-first-commit (S99 — counter is 20)

First commit: `WIP(r24-bug-30): start at $(pwd)`.

## Path discipline

**S126: all compiler-source edits via BASH** (perl/python/sed/heredoc), NOT Edit/Write. Echo target path before each write; verify via `git diff`. **NEVER `cd` into the main repo.** Use `git -C "$WORKTREE_ROOT"` + worktree-absolute paths exclusively. Hook is in place (S100) and will block leaks but rule still applies.

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. This is a **lint pass single-file fix** in the lint subsystem.

Map watermark `27e14c66` (S135); main `022cce77` (~40 commits ahead). Relevant lint pass files (PA pre-recon):
- `compiler/src/lint-ghost-patterns.js` (the W-LINT-* family that fires on R24's symptom — most likely fix locus)
- Sibling files: `lint-i-match-promotable.js`, `lint-w-each-promotable.js`, `lint-i-fn-promotable.js`, `lint-w-each-key.js`

The W-LINT codes that R24 confirmed firing inside `<!-- -->`: W-LINT-001 / W-LINT-005 / W-LINT-007 / W-LINT-011 / W-LINT-014 / W-LINT-022. All likely live in `lint-ghost-patterns.js`.

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>".

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md`
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
3. **`compiler/src/lint-ghost-patterns.js`** — the lint pass file. Locate the text-walking function(s) that emit the W-LINT-* codes. Read how it currently iterates source text.
4. **SPEC §27** — HTML comment content is opaque to all stages.
5. `docs/known-gaps.md` Bug 30 entry + Bug 43 R25 cross-ref evidence.

# THE BUG

## Symptom (R24 dev-2 + dev-3 + dev-4 confirmed; R25 Bug 43 cross-ref)

The lint pass fires `W-LINT-001` / `W-LINT-005` / `W-LINT-007` / `W-LINT-011` / `W-LINT-014` / `W-LINT-022` on text appearing inside HTML comment blocks (`<!-- ... -->`). Every R24 dev's friction-report `<!-- FRICTION REPORT -->` comment block (containing anti-pattern words like `===`, `<style>`, `.map()`, `{#if}` for COMPARISON purposes) tripped multiple lints.

R25 dev-3 + overseer-3 confirmed: dev-3-svelte's friction report had 14 W-TAILWIND-UNRECOGNIZED-CLASS / W-LINT-007 / W-LINT-004 / W-LINT-014 fires all on text inside `<!-- FRICTION REPORT -->` comment block; dev's "remove class attributes" workaround was a response to false signal.

## Reproducer

Minimal:
```scrml
<program title="repro">
    <page>
        <h1>Hello</h1>
        <!--
            FRICTION REPORT
            ----------------
            React's `.map()` is ergonomic but produces W-LINT-014 here.
            Vue's `{#if}` block style is unfamiliar.
            React uses `===` for strict equality.
        -->
    </page>
</program>
```

Compile + check stderr/diagnostics. Pre-fix expect: multiple W-LINT codes fire on the comment-internal text.

## Locus hypothesis

PA HYPOTHESIS: `compiler/src/lint-ghost-patterns.js` walks source text without HTML-comment region awareness. Fix: strip or skip `<!-- ... -->` regions before/during the lint scan.

**S137 brief-hypothesis-vs-grep track record: 1 correct (Bug 35) / 6 wrong-direction.** Trust your grep + reproducer + trace. The Bug 30 hypothesis is more concrete than most (the lint pass file is identified, the codes are listed), so confidence is higher; but VERIFY by reading the actual code path.

**Investigation order:**
1. Grep `W-LINT-` codes in `compiler/src/`. Confirm fire-sites live in `lint-ghost-patterns.js` (or surface where else they live).
2. Read how `lint-ghost-patterns.js` iterates source — does it walk raw source text? Does it operate on tokenized output? Does it walk the AST?
3. If raw-text walker: add a pre-pass that strips `<!-- ... -->` regions before scanning. Or extend the walker with HTML-comment-region awareness.
4. If AST-walker: HTML comments should be in a comment node; check whether the walker visits comment nodes when it shouldn't.

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. Build the minimal reproducer (above shape). Compile. Confirm symptom (W-LINT-* codes fire on comment-internal text).
2. Trace which lint pass file owns each firing code (W-LINT-001 / 005 / 007 / 011 / 014 / 022).
3. Identify the scanning approach (raw text / tokens / AST).
4. Report root-cause in `docs/changes/r24-bug-30-linter-html-comment-2026-05-27/progress.md` BEFORE writing the fix.

## Phase 1 — fix

Apply the minimal fix that makes HTML-comment regions opaque to the lint scanner. Surgical approach options:
- **(a)** Add a pre-pass that strips `<!-- ... -->` regions from the source string before lint scanning. Simple; risks span-offset drift if other diagnostics reference the stripped positions.
- **(b)** Extend the lint walker with HTML-comment-region tracking (skip-over).
- **(c)** Operate on a per-statement basis where the AST has already excluded comments.

Pick based on what the actual code shape supports. Compose with:
- Existing lint behavior on non-comment text (regression-guard).
- Nested comments — `<!-- outer <!-- inner --> still outer? -->` — HTML doesn't nest, so `<!-- ... -->` is matched on first closing `-->`. Match HTML's behavior.
- Multi-line comments (the R24 friction report shape).
- Empty comments `<!-- -->`.
- Adjacent comments `<!-- A --> text <!-- B -->`.

## Phase 2 — regression tests

NEW: `compiler/tests/unit/lint-html-comment-region-r24-bug-30.test.js`. Required test sites:

1. **Minimal repro** — single-line comment with W-LINT-trigger text inside; assert lint does NOT fire
2. **Multi-line comment** (the R24 friction-report shape)
3. **Adjacent comments** — `<!-- A --> @x === 1 <!-- B -->` — the middle `===` SHOULD fire (it's NOT in a comment); regression-guard
4. **Empty comment** `<!-- -->` — no crash
5. **Comment with `<!--` interior but no closing `-->` until later** — match HTML behavior (first `-->` closes)
6. **W-LINT-001 in comment** — specific code
7. **W-LINT-005 in comment** — specific code
8. **W-LINT-007 in comment** — specific code (this is the SPEC §19.6 errorBoundary false-positive that R25 dev-3 also triggered)
9. **W-LINT-011 / 014 / 022 in comment** — coverage
10. **Negative control — outside-comment lint still fires** — `@x === 1` outside any comment still triggers the appropriate lint

Aim for 10-15 tests.

## Phase 3 — verify

1. The minimal reproducer compiles with NO W-LINT-* on comment-internal text.
2. Outside-comment lints STILL fire correctly (regression-guard).
3. Full suite: `bun run test` must pass. Baseline at HEAD `022cce77`: ~15,012 pass / 0 fail / 88 skip / 1 todo (subset).
4. **EMPIRICAL R26 verification** (per S138 doctrine — though Bug 30 is MED + lint-only, the symptom is adopter-visible warnings; worth verifying):
   ```
   for dev in dev-2-go dev-3-svelte dev-4-pascal; do
     # R24 sources at scrml-support/docs/gauntlets/gauntlet-r24/$dev.scrml
     bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile \
       /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/$dev.scrml \
       --output-dir /tmp/r26-bug30-verify/$dev > /tmp/r26-bug30-verify/$dev.log 2>&1
     echo "$dev: W-LINT count inside comments: $(grep -c 'FRICTION REPORT' /tmp/r26-bug30-verify/$dev.log)"
   done
   ```
   **Expected after fix:**
   - Pre-fix R24 logs had W-LINT-007 / W-LINT-014 firing on `<!-- FRICTION REPORT -->` text
   - Post-fix should show those specific fires gone (the comment-internal lints)
   - Lints OUTSIDE comments unchanged

# COMMIT DISCIPLINE (S83 + S113)

Coupled code + test = ONE commit per S113. WIP commits OK for crash-recovery.

# `--no-verify` PROHIBITION (S136 absolute)

NEVER. Session precedent: 7 of 8 dispatches clean (Bug 37 had self-corrected violation; Bug 35 dispatch crashed before any --no-verify could be attempted).

# REPORTING

1. WORKTREE_PATH (literal `pwd`)
2. BRANCH
3. FINAL_SHA
4. FILES_TOUCHED
5. TEST_DELTA
6. ROOT-CAUSE FINDING (1-2 paragraphs)
7. REPRODUCER VERIFICATION (BEFORE/AFTER lint fire counts)
8. R26 EMPIRICAL on R24 dev sources (per Phase 3 doctrine)
9. MAPS CONSULTED + load-bearing finding
10. DEFERRED ITEMS
11. PROCESS VIOLATIONS

# OUT OF SCOPE

- All other MED bugs (31/32/44) — separate dispatches
- Bug 28/29/35/36/37/38/39/40/41/42/49 — RESOLVED, don't touch their files
- SPEC changes — lint-pass only
- Refactor beyond what fix requires

# IF YOU GET STUCK

After 60-90 min: STOP, report partial. WIP commit each step. Append progress.md.

GO.
