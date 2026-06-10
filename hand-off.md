# scrmlTS — Session 177 (OPEN)

**Date:** 2026-06-09
**Previous:** `handOffs/hand-off-181.md` (= S176 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-182.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"). `/effort` → **ultracode**.

## Session-start state (verified at OPEN)
- **HEAD:** `0aa54fc2` wrap(s176). scrmlTS **0/0 vs origin** (S176 wrap commit pushed). scrml-support **0/0**. Both clean.
- **Inbox:** empty.
- **Hooks:** config B (pre-commit + post-commit + pre-push all installed).
- **State (`bun scripts/state.ts`):** v0.7.0 · gaps **HIGH 0 · MED 10 · LOW 22 · Nominal 9** (118 @gap tokens) · pre-commit subset **16,478 / 89 skip / 0 fail** · SPEC.md 32,161 lines · 955 test files · 877 samples · 64 examples.
- **Maps:** watermark `35172d78`, 1 commit behind HEAD (the S176 docs-only wrap commit — WARN-only per wrap-6d). No source drift.

## CARRY-FORWARD QUEUE (from S176 CLOSE — all need user direction)
- **DD1 Fork 1 last follow-on:** `g-stdlib-clientinline-shim-import` (MED) — client-inliner strips cross-shim imports; blocks data.js Math de-leak. Real fix is in the inliner. + micro-finding: http/index.scrml still leaks `Math.pow`/`Math.max` (server-bundled → de-leakable; small follow-on, not yet a filed gap).
- **DD1 remaining forks (close the DD):** Fork 2 (global-reactive-store — ratify-the-omission 2A+2B) · Fork 5 (escape door — 5A keep `import:host` platform-only). Both ratify-the-omission (deliberation, no build); close DD1 + unblock the "hide the host" stance ruling (Fork 1 precondition now shipped). DD: `scrml-support/docs/deep-dives/js-host-boundary-foundation-2026-06-07.md` (`in-progress`; Forks 3+4+1 done).
- **`E-ROUTE` arg-direction hole** (S174, filed-separate from 4A): server-fn ARG-direction recurses into struct fields un-gated (return-side already `E-ROUTE-003`-gated). Separate `E-ROUTE` amendment; do NOT bundle.
- **Hook-hardening:** close the path-discipline hook's Bash-write blind spot (intercept Bash main-absolute writes; settings/hook task). Memory `feedback_path_discipline_hook_bash_blindspot`.
- **Typed-SQL LOW tails:** `g-sql-row-protect-leak` · `g-route-arg-fn` · `g-server-keyword-drift` (scrub deprecated `server` from canon — Insight 26 still pervades spec/primer/kickstarter/corpus).
- **Native-parser swap Wave 3** (strategic #1; design-gated; DEFER to M6). TRIAGE: `docs/changes/native-swap-retriage-s166/`.
- **Carry-forward design queue:** L19 multi-statement-handler relaxation; generators policy; DD3 Fork-4 wrap-gate→pre-commit promotion.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter. Profile A/B. `full wrap`/88% floor. wrap = 8 steps (6b worktree-cleanup / 6c maps-refresh / 6d state-doc regen+currency-gate).
- Dispatch: S88 isolation · F4 startup-verify · S90 CWD-routing · S99/S126 Bash-edit+no-`cd` (+ S176 hook-Bash-blindspot — self-enforce worktree-absolute prefix on Bash writes) · S136 BRIEF.md · S138 R26+independent-verify · S147 branch-leak coherence · S164 bg-commit-race.
- Memory: `feedback_sweep_all_mentions_newest_first` · `feedback_path_discipline_hook_bash_blindspot` · `feedback_no_batch_ratify_foundational_axioms` · `feedback_limit_primitives_not_godify` · `feedback_verify_before_claim` · `feedback_signal_ruling_scope` · `feedback_show_code_to_reason_about`.

## 🟢 S177 — BUG-TAIL session (R26-triage → 6 fixes + registry currency pass)

User picked the **bug-tail** thread ("3"). Method: R26 reverse-direction triage workflow (18 gaps, `wf_487ef351-f5a`) → classify REPRODUCES / NOT-REPRODUCED on HEAD → 6 fixable bugs (user: "All 6 reproducing bugs") + 6 stale-open closes + 6 defer re-confirms.

### LANDED + COMMITTED `b1931f02` (no push — user "commit, no push")
- **6-fix combined dispatch** (`scrml-js-codegen-engineer`, isolation:worktree, branch `worktree-agent-a19a4331e945385f6`, FINAL_SHA `fabd1a0c`, BRIEF.md archived). File-delta'd into main (S147/S99 dual-verify CLEAN — local main 0/0, no leak). **All 6 PA-INDEPENDENT-R26-verified** + pre-commit subset **16,512/0** + full suite (agent) **23,714/0**:
  1. `bug-74` → `<span :@thing/>` fires **E-CLOSER-001** (new `isGenuineShorthandBodyNotDirective` guard; `:let.../>` directive preserved). block-splitter.js. +5.
  2. `bug-4` → `looksLikeCloser` refined: fires at EOF / before-new-opener, NOT before a close tag. **Rule-4 call: corrected 2 LOCKED tests** that locked the over-fire (SPEC §4 L13832 verified; CONF-015 EOF preserved). block-splitter.js. +7.
  3. `bug-48` → parenDepth+bracketDepth ported to 3 ast-builder opener-finders + 2 on=-loops **+ a SECOND locus the brief missed** (emit-match.ts `resolveOnExpr` verbatim fall-through → now lowered via parseExprToNode+emitExpr). +4.
  4. `r28-7b` → schemaFor `[asIs,not]` predicated-base recovery (leading-primitive fallback). type-system.ts. +5.
  5. `s169-map-inline-insert` → inline map-assign routed through emitExprField→emitAssign (emits `_scrml_map_insert`). emit-event-wiring.ts. +4.
  6. `r27-c6` (MED) → **ROOT DIFFERED from brief**: formFor never EXPANDED (walkAndExpandFormForNodes didn't recurse engine `bodyChildren`); +1 line in type-system.ts. +4.
- **NEW gap filed:** `g-formfor-in-match-arm` (MED, gate-caught-loud) — formFor in a `<match>` arm fails E-CODEGEN-INVALID-JS; PRE-EXISTING, now reachable post-r27-c6. Sibling codegen fix.
- **Registry currency:** 6 stale-open closes (r27-c4 S151 · bug-45 S141 · bug-26 S139 · bug-34 · bug-27 not-a-bug · r27-c8 resolved-by-gate) + 6 defer re-confirms (bug-21/bug-12-vkill/bug-22/bug-75[WONTFIX-candidate]/g-component-001-coverage/r28-2b). **Count MED 10→9 · LOW 22→12 (11 net cleared).** `state.ts --check` PASS.

### Landing — COMMITTED `b1931f02` "fix(s177): bug-tail 6-fix batch + registry currency pass"
15 fix files + known-gaps re-marks + BRIEF.md + master-list (recent-sessions regen) + hand-off + hand-off-181. Pre-commit gate PASS. Coherence **0 behind / 1 ahead of origin (PUSH-PENDING)**. Agent worktree CLEANED (worktree list = main only). All 6 fixes re-marked RESOLVED; `g-formfor-in-match-arm` filed; `state.ts --check` PASS.

## 🟢 S177 (cont) — g-formfor full-class fix VERIFIED + STAGED (pending commit auth)

**Agent branch `worktree-agent-abf96c71b4dfbc640` FINAL_SHA `c42f74bb`; file-delta'd into main (staged), NOT committed.** S147/S99 dual-verify CLEAN (local main 0/1 = bug-tail only). **PA-independent RENDER-verified all 4 slices** (not just compile — the canary lesson): formFor-match (empty+valid) → `<form data-scrml-formfor>`; component-engine + component-match → `<span class="badge">`; tableFor (sibling, also fixed); r27-c6 formFor-in-engine still renders; over-trigger (nested engine/match in arm) benign (identical pre/post). Agent's 13 happy-dom tests = real DOM `querySelector` assertions, 0 fail. Pre-commit subset 16,512/0; within-node 1008/0; full suite 23,727/0. Rule-4 scope-correction (the agent's, sound): match arms store bodies as raw `armsRaw` → needed a NEW walkable `match-block.armBodyChildren` (ast-builder) + emit-match consume + within-node STRIP_KEYS, not just walker recursion. g-formfor-in-match-arm RE-MARKED resolved → **MED 9→8**. Files staged: ast-builder.js · emit-match.ts · component-expander.ts · within-node-classifier.ts · type-system.ts · browser test · BRIEF.md · progress.md · known-gaps · hand-off.

User picked "g-formfor" → PA investigation found it's NOT one MED bug but a **silent-non-render CLASS**: the markup-expansion walkers (formFor `walkAndSplice` type-system.ts + component `walkAndExpand` component-expander.ts) recurse `.children`/`.body` but NOT engine `.bodyChildren` or match `.arms`. **3 broken slices** (PA-verified raw-tag-in-output): formFor-in-match-arm · component-in-engine-state-child · component-in-match-arm. [formFor-in-engine WORKS — r27-c6, render-verified.] Silent-wrong-output (valid JS, raw tag browser-ignores). User ruled **"Dispatch the full-class fix."**
- **Dispatched** (`scrml-js-codegen-engineer`, isolation:worktree, BRIEF archived at `docs/changes/formfor-component-expand-in-arms-s177-2026-06-09/BRIEF.md`): extend both walkers to recurse `.bodyChildren`+`.arms`, sweep tableFor/siblings, **mandatory happy-dom RENDER tests** (the class hid behind compile-only tests = the canary lesson).
- **known-gaps.md `g-formfor-in-match-arm` BROADENED** (uncommitted in main; rides the fix landing) to the 3-slice class.
- **ON LANDING:** S147 branch-leak + S99 dual-verify → **independent RENDER-verify each slice** (NOT just compile — the form/component must appear in the DOM) → file-delta → re-mark g-formfor RESOLVED + regen → commit. Then this + the broadened-gap edit + post-commit hand-off edits all land together.

## Open questions to surface immediately
1. **PUSH-PENDING** — `b1931f02` is on LOCAL main (1 ahead of origin), NOT pushed (user "commit, no push"). The g-formfor fix will add a 2nd unpushed commit. Push when authorized — pre-push gate = full suite + TodoMVC (~5min). scrml-support clean (0/0), no cross-repo notices sent this session.
2. **bug-75 — RULED keep-open** (user S177: a deprecated form should compile-with-warning during its window, not hard-fail; real bug). known-gaps updated; no longer an open question.
3. **Stray stash** `stash@{0}` — "WIP on worktree-wf_fcf9da39" = a 1-line `compiler/src/api.js` change from S170 (orphaned; its worktree is gone). LEFT in place (not dropped — paranoia principle). Next session may `git stash show -p stash@{0}` + drop if confirmed dead.
4. **g-formfor-in-match-arm (MED, NEW)** — formFor in a `<match>` arm fails E-CODEGEN-INVALID-JS (gate-caught loud; pre-existing, reachable post-r27-c6). Sibling codegen fix in the match-arm emit path; candidate for a future bug pass.

## Tags
#session-177 #profile-a-full-start #open
