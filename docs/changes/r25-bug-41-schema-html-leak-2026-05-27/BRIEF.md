# R25-Bug-41 — `<schema>` block content leaks into HTML body as raw visible text

You are dispatched to fix known-gaps Bug 41 (gauntlet R25 finding; HIGH severity; dev-2-elixir confirmed).

Change-id: `r25-bug-41-schema-html-leak-2026-05-27`

The PA archives this brief to `docs/changes/r25-bug-41-schema-html-leak-2026-05-27/BRIEF.md` per pa.md S136 addendum.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path: provided by the harness (run `pwd` to learn it).

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If the path is under any other repo, STOP and report — this is the S90 CWD-routing failure mode. Save the output as your WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit node_modules from main.
5. Run `bun run pretest` via Bash. Without it the full-suite has ~130 ECONNREFUSED failures.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Startup-merge of main (S112 banked rule)

The worktree base is the session-start commit, not live HEAD. Mid-session dispatches branch stale. Before any fix work:

```
git -C "$WORKTREE_ROOT" merge main
```

Current main HEAD: `933d1ad3` (R25-Bug-38 landing, S137). This includes the R25-Bug-38 fix to `emit-logic.ts` — your work should NOT touch emit-logic.ts (different subsystem).

## Echo-pwd-in-first-commit (S99 discipline aid — leak counter is at 20; this would be incident #21)

Your FIRST commit message MUST include the verbatim output of `pwd` from your startup verification, e.g.: `WIP(r25-bug-41): start at $(pwd)`. PA verifies on landing that the recorded `pwd` starts with the `.claude/worktrees/agent-` segment.

## Path discipline (enforce on EVERY edit call)

**S126 mitigation in force — apply file edits via BASH (`perl`/`python`/`sed -i`/`cp`/heredoc), NOT the Edit/Write tools, on worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment.** Rationale: S126 incidents #12-#13 were Edit/Bash filesystem-divergence — the Edit tool wrote to PRIMARY MAIN while Bash/git saw the worktree. Bash writes go where `pwd`/`git` resolve.

- Echo the target absolute path before each write.
- Re-verify via `git diff` / `grep` after each write.
- **NEVER `cd` into the main repo from this worktree.** Use `git -C "$WORKTREE_ROOT"` and worktree-absolute paths exclusively.

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full (~100 lines). The §"Task-Shape Routing" section names the additional maps. This task is a **compiler-source bug fix** (codegen subsystem; HTML emitter).

Map currency: maps reflect HEAD `27e14c66` as of `2026-05-27T04:14:32Z` (S135 watermark). Current main is at `933d1ad3` — 24+ commits ahead. No post-map landings touched HTML emitter directly — the maps SHOULD route correctly to `compiler/src/codegen/emit-html.ts` if it's listed in Key Codegen Modules; verify.

Feedback in final report:
- "Maps consulted: [list]; load-bearing finding: <one sentence>"
- OR "Maps consulted but not load-bearing — [optional]"

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md`
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — ghost-pattern mitigation; reread before each major edit
3. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — canonical scrml shape (for test fixtures)
4. **SPEC.md §11 (schema declarations) + §39 (schema + migrations)** — read for "what `<schema>` content SHOULD do at HTML emit time" (the negative spec — `<schema>` produces DDL/migration artifacts, NOT HTML content)

# THE BUG

## Symptom (R25 dev-2-elixir confirmed)

dev-2-elixir's compiled HTML output contains the RAW TEXT content of the `<schema>` block as VISIBLE body content. The schema block's DDL-shaped contents (e.g. `cards { id text primary key, ... } activity_log { ... }`) are rendered as plain prose into the HTML.

Expected: `<schema>` blocks emit ONLY to server-side DDL / migration artifacts. The HTML render-tree skips `<schema>` content entirely — neither the `<schema>` opener/closer nor its body text should appear in HTML.

Cross-references:
- `docs/known-gaps.md` Bug 41 entry (lines 253-262)
- `scrml-support/docs/gauntlets/gauntlet-r25-report.md` Bug 41 entry
- SPEC §11 schema declarations
- SPEC §39 schema + migrations
- `gauntlet-r25/dist/dev-2-elixir.html` (the reproducer artifact — may live under R25 gauntlet dispatch dir if retained; if not, construct minimal reproducer)

## Locus hypothesis (verify, don't trust)

PA brief HYPOTHESIS: the HTML emitter (`compiler/src/codegen/emit-html.ts`) traverses the render-tree without excluding `<schema>` (and possibly other structural elements that should be invisible to HTML). The structural-element registry lives at `compiler/src/html-elements.js` and `compiler/src/codegen/emit-variant-guard.ts` (search results from PA pre-recon). The fix is likely a render-tree exclusion list.

**Suggested fix scope per known-gaps:** "HTML emitter — exclude `<schema>` (and probably `<channel>`, `<auth>`, etc. — full structural-element registry exclusion) from render-tree traversal."

**Important — scope this fix narrowly:**
1. **Bug 41 is specifically about `<schema>`.** Close THAT. If the structural-element registry already enumerates server-side-only elements (`<channel>`, `<auth>`, `<errors>`, `<onTransition>`, `<onTimeout>`, `<onIdle>`, `<engine>`, `<match>`, `<schema>`, etc.), the cleanest fix is a single exclusion list keyed by element name.
2. **Verify which other structural elements are ALREADY excluded.** Probably `<engine>` and `<match>` (block-form) are excluded — they don't appear in HTML output today. If they're handled via a different code path (e.g., custom emit handlers in `emit-html.ts`), `<schema>` may simply lack its custom handler. The cleanest fix MIGHT be exclusion-by-default-list, MIGHT be add-`<schema>`-to-existing-handler. Grep + trace to find out.
3. **DO NOT speculatively exclude elements you can't verify also have the same bug.** If after investigation `<channel>` and `<auth>` are ALSO leaking, fix them; if they aren't, file as deferred. Don't pre-emptively change behavior of elements whose current behavior you haven't verified.

**S136 methodology lesson:** brief-hypothesis suspect-file lists drift. **Grep-driven triage is load-bearing.** Apply: grep for `"schema"` in `compiler/src/codegen/emit-html.ts` first. If absent, trace the render-tree walker to find where unknown/unhandled elements are emitted as text. Trust your grep over my hypothesis.

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. **Construct a minimal reproducer** — a tiny `.scrml` file with a `<program>` containing a `<schema>` block and some normal HTML body. Compile it. Inspect the emitted HTML (`<output-name>.html`). Confirm the schema text leaks.
   - Example shape (use real canonical scrml per PRIMER + kickstarter v2):
     ```scrml
     <program title="repro">

         <schema>
             <db cards>
                 id text primary key
                 title text not null
             </>
         </schema>

         <page>
             <h1>Hello</h1>
         </page>

     </program>
     ```
   - You may need adjustments to the schema syntax based on the SPEC §11 / current PRIMER form — verify SPEC text first.

2. **Trace the HTML emitter** — grep `emit-html.ts` and friends for how it handles structural elements. Find where `<schema>` traversal goes wrong (does it fall through to a default "emit as text" branch? Is the exclusion list incomplete?).

3. **Verify behavior of sibling structural elements**:
   - Does `<engine>` leak HTML? (Probably not — verify via test or grep.)
   - Does `<channel>`?
   - Does `<auth>`?
   - Does `<errors>` (top-level, not call-site)?
   - This determines whether your fix is "add `<schema>` to existing exclusion list" or "exclusion list itself is missing for this whole class."

4. **Report your root-cause hypothesis** in `docs/changes/r25-bug-41-schema-html-leak-2026-05-27/progress.md` BEFORE writing fix code. Surface any disagreement with the brief.

## Phase 1 — fix

Apply the minimal fix that closes Bug 41:
- If exclusion list exists and just needs `<schema>` added: do that.
- If exclusion list is missing entirely: add it, with `<schema>` and any other elements you verified are leaking the same way.
- If `<schema>` traversal goes through a custom emit handler that's incomplete: fix the handler.

Don't speculate-expand the fix to cover elements whose behavior you didn't verify.

## Phase 2 — regression tests

Write a regression test file at `compiler/tests/unit/schema-html-leak-r25-bug-41.test.js` (NEW). Required test sites:

1. **Minimal repro** — `<program>` + `<schema>` + `<page>`; assert emitted HTML does NOT contain schema text content
2. **`<schema>` with multiple table definitions** — broader R25 dev-2-elixir shape
3. **`<schema>` content includes literal column names that ARE valid HTML body text if leaked** (e.g., `title text not null` — `title` is a plausible word that might pass "leak detection" if your test only checks for unique strings). Use multiple distinct DDL identifiers that wouldn't appear in normal HTML body.
4. **Positive control** — `<page>` body text IS in the HTML (regression-guard the fix doesn't accidentally exclude `<page>` content)
5. **If you discover and fix `<channel>` / `<auth>` / etc. leaks** — one test per
6. **`<schema>` AFTER `<page>` in source order** — verifies the exclusion is structural, not positional
7. **`<schema>` INSIDE a `<program>` that has multiple `<page>`s** — exclusion holds across page boundaries

Aim for 6-10 tests minimum.

## Phase 3 — verify

1. `node --check` on emitted HTML's accompanying JS for the reproducer: must parse clean.
2. The reproducer's emitted HTML must NOT contain schema text content (grep on DDL identifiers like `primary key` / column names).
3. Full suite: `bun run test` must pass with NO regressions on existing tests + your new tests passing. Baseline at PA HEAD `933d1ad3`: **21,852 pass / 0 fail / 170 skip / 1 todo / 804 files**.
4. **The within-node parser-conformance allowlist** at `compiler/tests/parser-conformance-within-node-allowlist.json` was rebumped at `050e20e8` (S137); if your `<schema>` fix causes any structural-AST shape change (which it shouldn't — HTML emit is downstream of parse), surface it. Likely no impact.

# COMMIT DISCIPLINE (S83 two-sided rule + S113 coupled-code-test)

Coupled code + test = ONE commit per `feedback_coupled_code_test_commit.md`. WIP commits for crash-recovery are fine before then.

After every edit: `git diff <file>` to verify; `git add <file>`; commit IMMEDIATELY.

Before reporting "DONE": `git status` MUST be clean. `git log --oneline | head -5` should show your commits.

# `--no-verify` PROHIBITION (S136 absolute rule)

**ABSOLUTE: you SHALL NOT use `--no-verify` on any commit.** If pre-commit fails:
- Pretest race: STOP, wait 30s, re-run. If STILL fails, STOP-and-report.
- Test regression: STOP, investigate, do NOT bypass.
- Environmental (missing dist/node_modules): re-run `bun install` + `bun run pretest`.

R24-BUG-2 agent was the banked violation; R25-Bug-36 + R25-Bug-38 agents honored the prohibition cleanly. You follow that example.

# REPORTING

1. **WORKTREE_PATH** (literal `pwd` from startup)
2. **BRANCH** (`git rev-parse --abbrev-ref HEAD`)
3. **FINAL_SHA**
4. **FILES_TOUCHED**
5. **TEST_DELTA** (baseline vs final counts)
6. **ROOT-CAUSE FINDING** (1-2 paragraphs)
7. **REPRODUCER VERIFICATION** (BEFORE/AFTER emitted HTML shape; grep on DDL identifiers)
8. **MAPS CONSULTED + load-bearing finding**
9. **SIBLING-STRUCTURAL-ELEMENT FINDINGS** (which other elements you verified clean vs leaky; what you fixed vs deferred)
10. **DEFERRED ITEMS**
11. **PROCESS VIOLATIONS** (declare honestly)

# OUT OF SCOPE

- Bug 37 (`<each in=...>` arrow truncation) — separate next dispatch
- Bug 40 (`:`-shorthand inside `<each>`) — separate next dispatch
- Bug 38 (`!{}` arm body — RESOLVED at `933d1ad3` in main; don't re-touch emit-logic.ts)
- Bug 31 / R24-BUG-5 — separate bug, deferred
- SPEC changes — this is a codegen-only fix
- Any refactor beyond what the fix requires

# IF YOU GET STUCK

If after 60-90 minutes you can't pin the root cause, STOP and produce a partial report. Surface the trace to PA.

WIP commit each meaningful step. Append to `progress.md`. If you crash, commits + progress.md are how the next agent picks up.

GO.
