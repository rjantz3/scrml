# BRIEF — Land two reviewer-passed spec amendments into SPEC.md (S154)

You are landing TWO reviewer-PASSED spec-amendment drafts into `compiler/SPEC.md` + `compiler/SPEC-INDEX.md`. This is SPEC-TEXT work — **do NOT touch any compiler source (`.ts`/`.js`)**; the implementation is a separate later dispatch. The design + the exact landing content are SETTLED (both drafts passed the language-design-reviewer with changes already applied). Your job is faithful transcription, not design.

## CRITICAL — startup verification + path discipline (do BEFORE anything else)

1. `pwd` via Bash. It MUST start with `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it's under any other repo (esp. scrml-support), STOP + report (S90 wrong-repo allocation). Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT. `git status --short` clean.
3. `bun install` (worktrees don't inherit node_modules — the pre-commit hook's `bun test` needs acorn etc.).
4. `bun run pretest` (populates samples/compilation-tests/dist/ for the test suite).
5. This brief lives at a MAIN path (read-only): you're reading it now — that's fine. ALL YOUR WRITES go to WORKTREE_ROOT.

**Path-discipline (S99/S126 — there have been MANY leaks; do NOT be the next):** apply ALL file edits via **Bash** (python/perl/heredoc) on **worktree-absolute paths** that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools (they have leaked to MAIN while git saw the worktree). Echo the target path before each write; `git diff`/`grep` to verify after. **NEVER `cd` into the main repo** or anywhere — use worktree-absolute paths + `git -C "$WORKTREE_ROOT"` exclusively. Your first commit message MUST include the verbatim `pwd` output (e.g. `WIP(spec-landing): start at $(pwd)`).

## The two drafts to land (READ BOTH IN FULL — they are your source of truth)

1. `/home/bryan/scrmlMaster/scrml-support/archive/spec-drafts/event-payload-transition-primitive-S154-DRAFT.md` (rev 2, reviewer-passed)
2. `/home/bryan/scrmlMaster/scrml-support/archive/spec-drafts/enum-subset-refinement-S154-DRAFT.md` (rev 2, reviewer-passed)

Each draft's **§8 "Landing checklist"** enumerates EXACTLY what to add/amend and where. Apply both checklists. The draft body is written spec-normative-ready — transcribe it into SPEC.md house style (match the surrounding section's prose/heading conventions; the drafts use `§`-prefixed headings + the existing `| code | severity | fires when |` §34 table format).

## What lands (from the §8 checklists — summary; the drafts are authoritative)

**Amendment 1 — event-payload-transition (#14):**
- NEW **§51.0.S** "Event-payload transitions / engine message dispatch" — insert AFTER the §51.0.R subsection (`<onIdle>`, currently ~L25429) and BEFORE the §51.1 legacy-`<machine>` content. Body = the #14 draft's §2 (accepts= attr, the `(state × message)` arm form, exhaustiveness, no-op semantics, scope §5).
- **§51.0.G amendment** (currently ~L24556) — add the `.advance` argument-resolution rule (#14 draft §2.5 B1 block: literal bare-variant resolved against BOTH the `for=` state enum and `accepts=` message enum; one match→dispatch that plane; both→E-VARIANT-AMBIGUOUS; neither→E-ENGINE-MSG-UNKNOWN; non-literal union-typed arg FORBIDDEN→E-VARIANT-AMBIGUOUS). THE load-bearing addition.
- **§51.0.B opener-attribute table** (currently ~L23985) — add the `accepts=` row.
- **§51.0.R** — one cross-ref note: a handled message resets the idle watchdog (#14 draft §3 / §7.1).
- **§14.10** (currently ~L7889) — a cross-ref NOTE only (the `.advance` two-enum resolution lives in §51.0.G; §14.10 mechanism unchanged).

**Amendment 2 — enum-subset refinement ((d)-A):**
- NEW **§53.15** "Enum-variant subset refinement" — insert AFTER §53.14 (type-as-argument family) and BEFORE §54. Body = the (d)-A draft §1 (syntax + decidability + §53.4 three-zone + widen-free/narrow-checked flow + no-range-per-RPP02).
- **§18.8.1 amendment** — `V` = the subset's variant set when the matched value's declared type is a subset refinement; SF-1 dispositions (concrete dead arm = NEW `E-MATCH-SUBSET-DEAD-ARM`; vacuous else = REUSE existing `W-MATCH-001`); name the nested-match / derived-cell / bound-value edge cases; intra-arm value-narrowing is NOT introduced (scrml has no general flow-narrowing).
- **§18.0.1 amendment** — block-form `<match for=>` exhaustiveness narrows identically.
- **§18.6** — one-line note: `W-MATCH-001` fires on a vacuous else over a subset-refined type.
- **§41.15.6 amendment** — schemaFor emits the SUBSET CHECK (not all-variants) for a subset-refined enum field; nullable-subset composition.
- **§53.9.2 caller/callee table** — add an enum-subset widen/narrow row.
- **§55** — a confirmation note only (`.OneOfFailed(set)` payload = the subset; no normative change).

**§34 (Error Codes, currently ~L16152) — add the NEW codes; do NOT duplicate existing ones:**
- #14: `E-ENGINE-ACCEPTS-NOT-ENUM`, `E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE`, `E-ENGINE-MSG-UNKNOWN`, `E-ENGINE-MSG-WITHOUT-ACCEPTS`.
- (d)-A: `E-MATCH-SUBSET-DEAD-ARM`.
- REUSED (add NO new row; the drafts note these): `E-VARIANT-AMBIGUOUS`, `E-ENGINE-INVALID-TRANSITION`, `E-CONTRACT-001`/`-RT`, `W-MATCH-001`.
- **Collision-check:** before adding, `grep -nE "E-ENGINE-ACCEPTS-NOT-ENUM|E-ENGINE-MSG-|E-MATCH-SUBSET-DEAD-ARM" "$WORKTREE_ROOT/compiler/SPEC.md"` — confirm ZERO pre-existing. (There are 159 existing `E-ENGINE-` references; your 4 new ones must be genuinely new names.)

## After the SPEC.md edits
- Run `bun run scripts/regen-spec-index.ts` (from WORKTREE_ROOT via `bun --cwd "$WORKTREE_ROOT"` or worktree-absolute) to regenerate SPEC-INDEX.md line ranges. Confirm it ran clean + the new sections appear.
- The pre-commit hook runs `bun test` (unit+integration+conformance) on each commit — SPEC-text changes shouldn't break tests; if a test fails, investigate (do NOT `--no-verify`).

## OUT OF SCOPE (do NOT do)
- NO compiler source edits (`.ts`/`.js`). NO implementation of the features. NO new tests (conformance tests for the new normative statements are a SEPARATE follow-on dispatch).
- The drafts' §7 "open sub-questions" are RESOLVED in the draft text — land the resolved form; do NOT re-open them.

## Commit discipline + report
- Commit incrementally (per amendment, or per section) via `git -C "$WORKTREE_ROOT"`. First commit message includes the verbatim `pwd`.
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status --short` MUST be clean (everything committed).
- Report: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED (expect: compiler/SPEC.md + compiler/SPEC-INDEX.md only), the new §34 codes added, confirmation regen-spec-index ran clean, and any deferred items / ambiguities you hit.

## Maps (S82 discipline)
Read `$WORKTREE_ROOT/.claude/maps/primary.map.md` (just refreshed to HEAD c665714c) for navigation if you need to locate sections; its Task-Shape Routing covers spec/codegen shapes. Report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."
