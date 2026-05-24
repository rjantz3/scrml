# M6.5 path-b — within-node AST adapter SCOPING progress

Dispatch: S125 survey-only diagnostic agent
Worktree: `.claude/worktrees/agent-a9b1c45720e36604d`
Base SHA after merge main: `404fc619` (the M6.7 STOP commit — the revert that triggered this dispatch)

## Timeline

- **Step 0 — startup.** Verified pwd, worktree root, status clean. Merged main forward (already at 404fc619 post-merge, no new commits). bun install OK. Created `docs/changes/m65-path-b-adapter-scoping/`.
- **Step 1 — required-reading.** Read M6.7 STOP doc + M5-divergence-ledger + M5-ast-bridge-scoping + M6 cutover plan §M6.5 + api.js routing site (line 844) + parse-file.js + b.2 walker test. Key prior context: M5 ledger was about getting native → FileAST shape at all (catalog-rename); the F-units F1-F9 closed BLOCK-PAYLOAD divergence + statement-catalog (A1 translate-stmt) + hoist gap (A3 collect-hoisted). M6.7 STOP confirmed that even with those closed, WITHIN-NODE field-level divergences remained that the canary's top-kind / hoist-count / deep-seq-kind metrics never measured.
- **Step 2 — empirical diff runner.** Built `scratch/m65-ast-diff.js` (a parallel dual-pipeline walker that classifies divergences by class: KIND-NAME / FIELD-SHAPE / MISSING-FIELD / EXTRA-FIELD / COUNT-LENGTH / SPAN-COORD) plus `scratch/m65-dump.js` (raw-JSON dual-dump). Ran on the 3 brief-cited fixtures + 5 isolated reproducer fixtures (sql top-level, sql-in-logic, const-derived, import, match, engine).
- **Step 3 — empirical catalog complete.** Findings: 01-hello (clean both) → 53 divergences. 14-mario (live-clean, native 43 errors) → 781 divergences inc 33 KIND-NAME. 22-multifile (live-clean, native-clean!) → 186 divergences inc 1 KIND-NAME + COUNT-LENGTH=2 (the hoist gap). Each isolated reproducer pinned ONE divergence class. M6.7 STOP example (`bare-expr+sql-ref` envelope) CONFIRMED reproduced on sql-in-logic fixture; root cause is `emitStringFromTree({kind:"sql-ref"})` returns `"?{ /* sql */ }"` which fails the `SQL_SIGIL_PATTERN = /\?\{` /` regex.
- **Step 4 — drafting SCOPING.md.** Done. 477-line deliverable at `docs/changes/m65-path-b-adapter-scoping/SCOPING.md`. Empirical catalog (7 divergence classes), per-class adapter sizing, 7-unit decomposition (M6.5.b.0 — M6.5.b.7), 5 named PA decisions, 29-54h re-estimate vs plan's 30-60h. Pre-commit gate cleanly passed (14135 tests).
- **Step 5 — closure.** SCOPING.md committed `d2cb042a`. WORKTREE clean. Final report follows.

## Final summary

**WORKTREE_PATH:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a9b1c45720e36604d`
**FINAL_SHA:** `d2cb042a`
**BRANCH:** `worktree-agent-a9b1c45720e36604d`

**Divergence classes:** 7 (A bodyChildren, B sql-ref envelope, C hoist-gap, D match-arm separator, E structural-decl LHS, F shape-formatting, G span-coord).

**Sub-unit decomposition:** 8 dispatchable units (.b.0 canary, .b.1-.b.6 parallel-eligible class fixes, .b.7 closure). DAG: .b.0 gates all; .b.1-.b.6 file-disjoint parallel; .b.7 verifies. Class A folded to M6.6 closure (not M6.5.b).

**Re-estimate:** 29-54h (excluding folded Class A) vs plan's 30-60h — slight depth-of-survey shrink (~10%). Within the M6.5 path-b budget; no v0.8 deferral trigger.

**PA decisions surfaced (5):**
1. Adapter site = api.js boundary for ADAPT classes; FIX-NATIVE bypasses adapter entirely.
2. FIX-NATIVE recommended for Classes B/C/D/E (4 of 5 loud classes are native parser GAPS/BUGS, not shape differences).
3. Within-node parity canary extension required FIRST (M6.5.b.0).
4. M6.7 re-flip MUST gate on full `bun run test` clean under native parser, not just canary.
5. Class A (engine bodyChildren) folds to M6.6 closure dispatch, not M6.5.b.

---

# M6.5.b.1 — FIX-NATIVE match-arm newline separator (S125+)

Dispatch: M6.5.b.1
Worktree: `.claude/worktrees/agent-a8bb97501fe5a8629`
Base SHA after merge main: HEAD `5b1afb9d` (post the M6.5.b.0 + M6.6.b.3 + M6.7 STOP landings)

## Step 0 — startup
- `pwd` = worktree root; `git rev-parse --show-toplevel` matches.
- `git merge main --no-edit` absorbed live HEAD; tree clean post-merge.
- `bun install`, `bun run pretest` clean.
- Baseline within-node canary: 1004 pass / 0 fail / 133054 total divergences across 1000 files.

## Step 1 — Bug site located
- `compiler/native-parser/parse-expr.js:2546-2557` — `parseMatchExpr` arm-list loop:
  only `TokenKind.Comma` is consumed between arms. No semicolon support, no newline support.
- `parseMatchArm:2569-2605` consumes the body via `parseAssignmentExpr` (concise form)
  or `parseBlockStub` (block form). When body finishes on line N, next arm pattern
  starts on line N+1 — ASI-style newline-between-arms is the canonical scrml form.

## Step 2 — SPEC normative reference
- §18.2 grammar `match-expr ::= 'match' expression '{' match-arm+ '}'` —
  `match-arm+` with NO inter-arm separator token in the production.
- §18.0.1 + §17 worked examples all use newline-separated arms.
- The native parser already documented "newline- or comma-separated in practice" in
  comment on line 2552 — only the comma branch was implemented.

