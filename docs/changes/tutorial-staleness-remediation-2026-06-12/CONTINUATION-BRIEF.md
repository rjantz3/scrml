# CONTINUATION-BRIEF.md — tutorial-staleness-remediation (S187 crash-recovery)

> **S136 archival of the verbatim continuation dispatch prompt.**
> Agent: `scrml-js-codegen-engineer` (internal id `a867a96979f7c725d`), isolation:worktree, model opus, run_in_background.
> Dispatched 2026-06-12 by the S187 recovery PA after the S186 session crashed mid-Group-B.
> Predecessor's recovered work is on branch `worktree-agent-adef19e06cca3374b` (commits: start `0286c91c` → Group A `c4e5f734` → Group B `f87fc116`). The continuation agent FF-merges that branch at startup, then completes the REMAINING items (B7–B13, C14–C17, D18–D19, E20–E21 + final verification).

---

# Finish docs/tutorial.md remediation — CONTINUATION after a crash (change-id `tutorial-staleness-remediation-2026-06-12`)

DOCS-only remediation (docs/tutorial.md + docs/tutorial-snippets/*). NO compiler-source changes.

## CRASH-RECOVERY CONTEXT
A predecessor agent began executing the S186 tutorial-staleness audit, made 2 WIP commits, then the session crashed. Its work was salvaged onto branch `worktree-agent-adef19e06cca3374b` (3 commits: start → Group A → Group B). The continuation FF-merges that branch at startup to inherit the recovered work, then completes the REMAINING items.

**ALREADY DONE (on the recovered branch — verify, do not redo):**
- Group A (A1–A4) — snippet fixes: 02b `<schema>` inside `<program>` (E-SCHEMA-003 cleared); glossary `rule=(.A|.B)`; dropped file-top `${...}` wrappers from 03/04a/04b/05/06 + §3.3 inline; `<engine>` placement aligned in 04b + glossary. All 11 snippets PASS `verify-tutorial.sh`.
- B5 (arm-arrows `=>`/`->` → `:>`) and B6 (§7 `not`-as-negation → `!`) — done in PROSE + snippets. Verify 100% complete; do not assume incomplete.

**REMAINING:** items B7–B13, C14–C17, D18–D19, E20–E21 + final verification. B7, B8 are HIGH and NOT yet done.

## THE PLAN
Read `docs/audits/tutorial-staleness-audit-2026-06-12.md` IN FULL — authoritative remediation spec (VERDICT, 26 findings, Remediation plan A–E items 1–21, Verified-clean do-NOT-touch list). SPEC normative (Rule 4).

## MAPS
Read `.claude/maps/primary.map.md`. Maps reflect HEAD `a4726dd3`; current main `538fe2d2` only adds docs/known-gaps since — current for this task.

## STARTUP VERIFICATION + PATH DISCIPLINE (before any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP — S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean.
3. INHERIT RECOVERED WORK: `git merge --ff-only worktree-agent-adef19e06cca3374b`; confirm `git rev-parse --short HEAD` → `f87fc116`. If not a clean FF, STOP.
4. `bun install`. 5. `bun run pretest`. 6. baseline `verify-tutorial.sh` → expect 11 pass / 0 fail (else STOP).
- ALL edits via Bash (perl/python3/heredoc) on WORKTREE_ROOT-absolute paths (S126). NEVER `cd` into main; `git -C "$WORKTREE_ROOT"`, absolute paths only.
- Commit incrementally per group (B-tail/C/D/E). Rewrite progress.md first (A+B done; doing B7–E), append per group. WIP commits expected.

## LOAD-BEARING GUARDRAILS (do-NOT-touch)
1. Arm-arrow migration is CONTEXT-SENSITIVE — ONLY match-arm + `!{}`-handler-arm. MUST NOT touch: fn-return `->` (lines 967, 746); JS arrow-glyph `=>`; §51.9 projection-rule `=>` (Mario lines 562–569, glossary 1057). All Verified-clean.
2. `not` = absence value (KEEP all absence usages); `!` = negation (B6 already flipped). Compiler under-enforces E-TYPE-045 (gap `g-not-negation-unenforced`) — teach SPEC-correct `!` regardless (§42.10).
3. Verified-clean: projection `=>`, fn-return `->`, `if=`/`else-if=`/`else` chain, schema DDL field syntax (only placement moved), `row is some`, `const user = fetchUser()` replacement, line-1088 auto-await anti-pattern cell (adversary-refuted — do NOT reword; the SEPARATE line-791 §6 prose IS B11).
4. `<each>` binder is SPACE form `as x`, NEVER `as=x` (`as=x` FAILS E-SCOPE-001). Keep Tier-0 `for`/`lift`; ADD `<each>` as Tier-1.

## REMAINING ITEMS (audit numbering)
- B7 (HIGH) `scrml init` scaffold prose — line 26 + 19–24 → `src/app.scrml` + `.gitignore`, no package.json/bunfig.toml, `scrml dev src/app.scrml`.
- B8 (HIGH) block-form `<match>` SHIPPED — line-487 Note + 04a header + §5.6 (686–688) + §5 markup-dispatch (612–636). Block-form `<match for=Type on=expr>` canonical Tier-1 UI dispatch (§18.0.1); JS-style `match {arm :> value}` is value-return. Compile-verify a block-form repro.
- B9 `<onTransition>` directional model — line 542 + glossary 1056 → directional one-attr-per-element `to=`/`from=`; E-ONTRANSITION-NO-TARGET (§51.0.H 25282–25289).
- B10 `server function` → `function` — line 849 + 07-channel-chat line 8; recompile 07 → W-DEPRECATED-SERVER-MODIFIER clears.
- B11 §6 line-791 auto-await prose — compiler-managed body-split/CPS (§19.9.3/§19.9.8); unawaited cross-program call is compile ERROR E-PROG-004 (§40.4), not Info lint. Pairs with D19.
- B12 `.get()` returns `not` not `null` — line 213.
- B13 `is some`/`is not` framing — line 215; no null/undefined definitions.
- C14 line 9 version → v0.7.0. C15 lines 641/1032/1112 "v0.3" → v0.7.0. C16 line 1026 "26,000" → "32,000" (wc -l SPEC.md to confirm). C17 verify-tutorial.sh line 3 "v0.2.4" → "v0.7.0".
- D18 line 831 §7 → §42. D19 line 791 §13.1 → §19.9.8.
- E20 add `<each in=@coll as x>` (markup-extensions §1 line 68, §3.2, §8, §10, glossary 1050); keep for/lift Tier-0; space binder. Compile-verify repro.
- E21 add block-form `<match>` to glossary (line 1053).

## COMPILE-VERIFY EVERY SNIPPET EDIT (mandatory)
`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <snippet> --output-dir /tmp/tut-rem/<name>`. Target lint/error clears, no new error. W-PROGRAM-SPA-INFERRED + W-TAILWIND-UNRECOGNIZED-CLASS are expected noise.

## FINAL VERIFICATION
1. `verify-tutorial.sh` → all 11 PASS. 2. Residual-staleness re-grep (target 0): arm-context `=>`/`->` outside do-not-touch; `not` as prefix-negation; `server function`; v0.2.6/v0.3.0-alpha/v0.3 labels; "26,000"; `<schema>` at file root; "future release" block-match claim; `<each` count > 0. 3. Confirm Verified-clean untouched (projection `=>` 562–569/1057, fn-return `->` 967/746, if=/else-if= chain).

## OUT OF SCOPE
Compiler-source change (gap `g-not-negation-unenforced` separate); channel-reconnect plumbing + onserver-cell-read design Q; editorializing beyond the audit plan.

## FINAL REPORT
WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED; FF-merge landed f87fc116 + baseline 11/11; per-group done + compile-verify; B5/B6 completeness re-grep; verify-tutorial.sh result; residual re-grep counts; Verified-clean untouched confirmation; any STOP; maps feedback line.
