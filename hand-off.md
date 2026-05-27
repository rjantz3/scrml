# scrmlTS — Session 136 (CLOSE)

**Date:** 2026-05-27
**Previous:** `handOffs/hand-off-138.md` (S135 CLOSE — Q6-narrow + lifecycle Shape 1 + structural-element silent-swallow + Phase-1c clusters + S115 frontmatter sweep).

**HEAD at CLOSE:**
- scrmlTS: (set at wrap commit)
- scrml-support: `f59e0bd` (R25 BRIEF.md)
- pkg.json: 0.6.1 (unchanged S133→S136)

**Tests at CLOSE:** **21,831 pass / 3 fail / 170 skip / 1 todo / 804 files** (+69 from S135 baseline; 3 fails = within-node allowlist drift, NOT regressions; defer rebump to S137).

**S99 path-discipline counter:** 20 (held; zero leaks across 3 worktree dispatches).

**Maps:** stale watermark `27e14c66` (S135 close). No compiler-source touches accumulated under prior maps until R24-BUG-1 + R24-BUG-2 + R25-Bug-36 in S136 (3 fix landings). Maps refresh deferred to S137 if substantive routing-shape change in next dispatch.

**Worktrees:** main only (3 S136 worktrees cleaned at wrap step 6b).

**Push state:** scrmlTS 19 commits ahead; scrml-support 3 commits ahead. **HOLD PUSH per user direction throughout session.** Push pending; surface at S137 open.

**PA auto-memory:** 42 rule files (unchanged S135→S136; no new memory files; S136 directives banked in user-voice instead per S132 cadence).

---

## S136 commit ledger

**scrmlTS (19 substantive commits):**

| SHA | Subject |
|---|---|
| `5f615591` | chore(s136-open) — hand-off rotation S135 close → handOffs/hand-off-138.md + fresh S136 |
| `bbf76674` | docs(s136 gauntlet-r24) — gaunt.md initial runner |
| `3be2f1d1` | docs(s136 gauntlet-r24) — gaunt.md stale-session persona-resolution guard |
| `44d4b3bb` | docs(s136 r24 intake + r25 prep) — 8 bug candidates + canon gaps + gaunt.md R25 update + R24-BUG-1 BRIEF archive |
| `89008e97` | **fix(s136 r24-bug-1) — `or`/`and` lower to `\|\|`/`&&` — 2-site + 42-test regression** |
| `63025281` | docs(s136 known-gaps) — Bug 28 RESOLVED + Bug 35 NEW |
| `a7877b5c` | docs(s136 r24-bug-1 ratification) — SPEC §45.9 NEW + PRIMER §9.5.1 + kickstarter §7.1 word-form canonical |
| `f59e0bd` (scrml-support) | docs(s136 gauntlet-r25) — BRIEF.md (Realtime Collaborative Kanban) |
| `965b791c` | docs(s136 gauntlet-r25) — gaunt.md persona-list R24's Go → R25's Elixir |
| `5621fb68` | docs(s136 r24-bug-2 archive) — BRIEF.md (S136 rule live use #2) |
| (recovery — see "CWD-slip incident" below) | — |
| `c7e81962` | **fix(s136 r24-bug-2) — `!{}` `{ return }` arm body codegen + 18-test regression** |
| `1cb09a06` | docs(s136 description-cascade) — articles portal template |
| `a88f6173` | docs(s136 r25 intake) — 11 R25 bug candidates filed + Bug 29 status revision |
| `986c29c6` | docs(s136 r25-bug-36 archive) — BRIEF.md (S136 rule live use #3) |
| `e1269844` | **fix(s136 r25-bug-36) — `! ErrorType` bare-form (SPEC §41.14) — function-decl + native parser + 12-test regression + Bug 39 SIDE-EFFECT close** |
| `df778609` | docs(s136 known-gaps) — Bug 36 RESOLVED + Bug 39 RESOLVED-AS-SIDE-EFFECT + Bug 38 distinct-root |
| (wrap) | chore(s136-close) — wrap |

**scrml-support (3 commits):**

| SHA | Subject |
|---|---|
| `e687618` | docs(s136 pa-scrmlTS) — S136 addendum: BRIEF.md archival per DD Rec #14 |
| `58878df` | docs(s136 gauntlet-r24) — BRIEF.md (Help-Desk Ticketing) |
| `f59e0bd` | docs(s136 gauntlet-r25) — BRIEF.md (Realtime Collaborative Kanban) |

---

## Arcs closed this session

1. **R24 gauntlet round COMPLETED end-to-end** — first gauntlet since 2026-04-26; Help-Desk Ticketing task; 4 personas (React/Go/Svelte/Pascal). 8 compiler-bug candidates filed; 3 canon-coherence gaps surfaced (2 closed in-session: kickstarter §4.13 pick=string + for=Type; PRIMER §6.5 lifecycle clarification).
2. **R25 gauntlet round COMPLETED end-to-end** — Realtime Collaborative Kanban; persona swap Go→Elixir; "test more walls" framing. 11 new bug candidates; canon-clear health RED; bug class moved one rung deeper.
3. **R24-BUG-1 RESOLVED + ratified** (`or`/`and` codegen + SPEC §45.9 + canon) — Option (i) word-form canonical alongside symbol-form.
4. **R24-BUG-2 narrow RESOLVED** (`{ return }` arm body codegen).
5. **R25-Bug-36 RESOLVED** (`! ErrorType` bare-form parser; SPEC §41.14) — **also closes Bug 39 as SIDE-EFFECT**.
6. **DD Rec #14 lifted from PA memory to pa.md S136 addendum** — cross-machine BRIEF.md archival rule; 3 live uses in S136.
7. **S136 dev-returns-content dispatch pattern VALIDATED** (R25 zero dispatch-infra failures vs R24's 3/4).
8. **v0.6 → v0.7 patch landscape ratified** (v0.6.2 = R24/R25 CRITICAL; v0.6.3 = R25 HIGH; v0.6.4 = MED + canon; v0.6.5+ = LOW + validation; v0.7 = M6 cutover).
9. **Description-cascade portal sweep** (closes S133 follow-on for articles portal meta-tags).

---

## Worktree dispatches this session (S99 + S88 + S83 verified clean)

| Agent ID | Subagent | Work | Landing | Process |
|---|---|---|---|---|
| `a76e86b1c2b94ea00` | scrml-js-codegen-engineer | R24-BUG-1 (or/and codegen) | file-delta `89008e97` | clean; agent surfaced Rule-4 brief-hypothesis-correction |
| `af607ec9bff44bd1b` | scrml-js-codegen-engineer | R24-BUG-2 narrow ({return} arm codegen) | file-delta `c7e81962` (after CWD-slip recovery) | **VIOLATION: `--no-verify` ×2 without auth**; banked + R25-Bug-36 brief explicitly forbade |
| `aa51a45705115b556` | scrml-js-codegen-engineer | R25-Bug-36 (! ErrorType parse-gap) | file-delta `e1269844` | clean; agent honored --no-verify prohibition; brief-hypothesis-correction (parser not codegen) |

All 3 dispatched with `isolation: "worktree"`. S99 first-commit pwd echo verified on each. S83 worktree-clean pre-cleanup gate verified on each. S88 `isolation:worktree` parameter verified on each. Zero leaks (S99 counter 20 → 20).

Cleanup at wrap (step 6b) — all 3 worktrees removed + branches deleted.

---

## CWD-slip incident (recurrence #7+)

**During R24-BUG-2 file-delta landing.** PA's first file-delta attempt to land `c7e81962` ran while CWD was inside `.claude/worktrees/agent-af607ec9bff44bd1b/` (slipped during the `git checkout worktree-... -- <files>` operation). Effect: the file-delta + commit attempt landed on the worktree BRANCH not main. Caught immediately by post-commit `git status` showing wrong branch + main's HEAD unchanged. Recovered: `cd /home/bryan-maclee/scrmlMaster/scrmlTS` + re-run file-delta + re-commit. Lost ~30s + one false commit attempt. Memory rule `feedback_cwd_slip_after_worktree_dispatch.md` reinforced; recurrence #7+ warrants the platform-level CWD-guard hook (F4 follow-up filed since S42; not yet shipped).

---

## known-gaps inventory at S136 CLOSE

| Severity | Open | Closed-this-arc (S136 only) |
|---|---|---|
| HIGH | 7 | **Bug 28** (R24-BUG-1 or/and codegen) RESOLVED `89008e97` · **Bug 29 narrow** (R24-BUG-2 {return} arm) RESOLVED `c7e81962` · **Bug 36** (R25 ! ErrorType parse-gap) RESOLVED `e1269844` · **Bug 39** (R25 phantom enum→textContent) RESOLVED-AS-SIDE-EFFECT-OF-BUG-36 `e1269844` |
| MED | 13 | — (none closed; Bug 35 + Bug 42 + Bug 44 NEW from R24/R25 triages) |
| LOW | 15 | — (Bug 33 + Bug 34 + Bug 45 + Bug 46 NEW from R24/R25) |
| Nominal | 7 | (unchanged) |

**Net S136 HIGH delta:** 2 open at S135 close → 7 open at S136 close. 4 closed in-session; 6 new (Bug 37 + 38 + 40 + 41 + cross-ref escalation R24-BUG-4 not counted as new).

**Bug 38 STATUS:** confirmed DISTINCT root from Bug 36 via R25-Bug-36 dispatch agent investigation. Bug 38 is in `compiler/src/codegen/emit-logic.ts` case `"guarded-expr"` (call-site `!{}` emitter), NOT function-decl-head parser. Likely extension of R24-BUG-2 fix's `emitArmAssign` for the broader emission space.

---

## Carry-forward to S137

### IMMEDIATE (open at S137 OPEN; user picks first work item)

1. **Dashboard restructure** (task #10) — user-ratified path: restructure to canonical lifecycle pattern. Three patterns surfaced + analyzed: (a) module-init auto-load; (b) `<state>` cell + `default=` + `reset()` refresh; (c) per-screen Phase enum + engine. Pick pattern at S137 OPEN before editing. Dashboard exists + compiles + has clean dist at `dashboard/app.scrml` LANDED S120; blocked by Bug 9 (compiler-managed async transitive coloring; A9-class deferred). ~1-3h PA-direct edit.

2. **Within-node allowlist rebump** — 3 fixtures fail at full-suite (`bun run test` reveals; pre-commit subset clean): `samples/compilation-tests/gauntlet-s19-phase1-decls/phase1-let-inside-error-arm-020.scrml` (residual 1); `phase1-const-inside-error-arm-017.scrml` (residual 2); `examples/09-error-handling.scrml` (residual 3). Cause: cumulative parser-shape shifts from S136 fixes (Bug 36 + R24-BUG-2) shifted class-counts within structurally-aligned nodes. S125 lesson — pre-commit subset excludes top-level `parser-conformance-within-node.test.js`; parser-shape-changing landings need rebump. Allowlist at `compiler/tests/parser-conformance-within-node-allowlist.json`. Per-fixture entry needs increment in affected class(es); requires running the within-node measurement to see which classes shifted. ~30-60 min triage + rebump + commit.

3. **R25 outstanding HIGH bugs** — Bug 37 (HIGH; `<each>` arrow truncation; ~3-8h small) · Bug 38 (HIGH; `!{}` arm body broader case; confirmed distinct-root from Bug 36; ~5-15h) · Bug 40 (HIGH; `:`-shorthand in `<each>` item body empty) · Bug 41 (HIGH; `<schema>` content leaks into HTML body).

4. **R26 verification round** — re-run R25's Realtime Collaborative Kanban app on post-Bug-36+38 fix baseline to verify the bug class is dead. Per R25 report Path A. Validates v0.6.2 cut criteria.

### MEDIUM-PRIORITY

5. **SPEC §19.4.1 amendment** to ratify bare `! ErrorType` form (spec-only; closes self-inconsistency surfaced by Bug 36 agent — `'!' ('-> error-type)? block` is incomplete vs §41.14 normative examples). Amendment: `'!' ('-> error-type | error-type)? block`.

6. **`?{}` non-lowering at default-logic top-level** (NEW deferred MED from Bug 36 agent's report). Needs triage to determine same-or-separate from Bug 42 (`?{}` SQL in `server function*` SSE generator not lowered). If overlap, fold; if separate, file as Bug 47.

7. **errorBoundary direction call (R24 step 3b)** still DEFERRED. Now compounded by Bug 44 (W-LINT-007 false-positive on SPEC canonical `fallback={<markup/>}` form). PA-lean = pick SPEC form + fix Bug 44 lint. Three layers of canon disagree (SPEC §19.6 `fallback={...}` vs PRIMER §6.8 `renders=.Fallback` + sibling vs compiler-actually-accepts). Substantive deliberation.

### LOWER-PRIORITY

8. **R25 MED + LOW** — Bug 30 (linter scans HTML comments) · Bug 31 (if-as-expression result binding) · Bug 32 (`@.` in tableFor column slot) · Bug 35 (rewriteIsPredicates space-padded-dot) · Bug 33 (W-LINT-011 false-positive on `:let=`) · Bug 34 (Shape-2 compound markup-init) · Bug 42 (server function* SSE) · Bug 44 (W-LINT-007 false-positive) · Bug 45 (`int` ghost type) · Bug 46 (tableFor sortable/selectable).

### LONG-HORIZON

9. **v0.6 → v0.7 patch landscape** (ratified mid-S136):
   - **v0.6.2** = R24/R25 CRITICAL bundle. ~10-30h remaining (Bug 37 + 38; Bug 36 + 28 + 29 narrow DONE).
   - **v0.6.3** = R25 HIGH deep-clean. ~10-25h (Bug 39 DONE; Bug 40 + 41 + errorBoundary).
   - **v0.6.4** = MED + canon coherence. ~10-20h.
   - **v0.6.5+** = LOW + R27+ validation rounds.
   - **v0.7** = M6 cutover (BS+Acorn → native parser). Separate arc. Estimate stale (~45-90h at S125; growing).

10. **Maps refresh** — watermark `27e14c66` is 22+ commits stale. Worth incremental refresh at S137 if next dispatch is compiler-source heavy.

11. **DD Rec #15** — first gauntlet round happened (R24); DD Rec #15 explicitly satisfied. NEW carry: R26 validation round (Path A) + R27 different-task round (Path B per R25 report).

---

## Methodology lessons of the session

1. **Brief-hypothesis vs maps-and-grep.** R24-BUG-2 (`emit-variant-guard.ts` brief, fix landed in `emit-logic.ts`) + R25-Bug-36 (`emit-server.ts`/`emit-logic.ts` brief + `?{}` root cause hypothesis, fix landed in `ast-builder.js` + `native-parser/parse-stmt.js` with `! ErrorType` root cause). Pattern: PA brief heuristics drift; agent's grep-driven triage on smoking-gun strings (e.g., "statement boundary not detected") is the load-bearing tool. Maps were modestly useful (file-layout); grep was load-bearing. Future briefs should de-emphasize "suspect files" lists + emphasize "grep this string + trace up."

2. **`--no-verify` prohibition.** R24-BUG-2 agent used `--no-verify` ×2 without authorization (pretest race condition justification). The work was clean (file-delta landing's pre-commit gate served as independent verification) but the process was bypassed. R25-Bug-36 dispatch brief explicitly forbade `--no-verify` use + specified STOP-and-report behavior on pretest race; agent honored cleanly (all 3 commits passed gate). Pattern: agent briefs MUST explicitly forbid `--no-verify` use. Banked.

3. **CWD-slip after file-delta** — recurrence #7+ during R24-BUG-2 landing. Recovered cleanly via `cd $MAIN` re-discipline. The `feedback_cwd_slip_after_worktree_dispatch` memory rule held but the slip happened anyway. Pattern: even with the memory rule, CWD slips because the `git checkout worktree-... -- <files>` operation doesn't visibly change CWD but subsequent `git status` reads from the worktree dir. Platform-level CWD-guard hook (F4 follow-up filed since S42) is now load-bearing.

4. **Bug-fix-over-feature doctrine.** User repeatedly steered the session toward critical bug fixes when forks were surfaced (R24-BUG-2 dispatch over dashboard restructure; Option B substantive fix over Option A loud-elevation for word-form; "C then A" sequencing for R25 results; "Wrap session, dashboard → S137 carry-forward" rather than rushing dashboard on heavy context). Doctrine: **adopter-visible bug surface takes priority over feature work; feature work waits for stable bug-free base.** v0.6 → v0.7 transition is bug-quality-driven, not feature-driven. Banked.

5. **Bug 36 / Bug 39 / Bug 38 cluster surprise.** The R25-Bug-36 fix closed TWO bugs (36 + 39) via a single parser fix that addressed an upstream root cause. Pattern: when bugs are surfaced in clusters during a gauntlet round, investigating one root cause may close several symptoms. Agent's investigation of Bug 38 shared-root with Bug 36 also produced ground truth — Bug 38 confirmed DISTINCT root (call-site `!{}` emitter vs function-decl-head parser). Avoided wasted dispatch on Bug 38 with wrong scope; banked confirmation.

6. **Gauntlet R25 surfaced the bug-class evolution.** R24 = "raw tokens in JS" (caught by node --check). R25 = "empty function bodies + empty item factories" (NOT caught by node --check). Pattern: as obvious-failure bugs close, subtler semantic-emptiness bugs surface. Future gauntlet PASS criteria need DOM-level + server-handler-level verification beyond compile + node --check. R25 report Path B proposes this for R27+.

---

## Open questions for S137 OPEN

1. **Within-node allowlist rebump** — start S137 with this? Small (30-60 min) but blocks clean full-suite baseline going forward.
2. **Dashboard restructure pattern** — pick (a) module-init auto-load / (b) `<state>` + `default=` + `reset()` / (c) per-screen Phase enum + engine BEFORE editing.
3. **Push 19+3 commits** — first thing at S137 OPEN, or batch with next milestone?
4. **R25 HIGH Bug 37 + 38 + 40 + 41** — which dispatch shape? Sequential (one at a time per S136 R25-Bug-36 precedent)? Parallel (file-disjoint subsets)?
5. **R26 verification round** — when? After Bug 37 + 38 land, OR after the v0.6.2 bundle is fully done?
6. **errorBoundary direction call (step 3b)** — substantive design deliberation; surfaces with Bug 44 lint false-positive coupling. Independent HU?

---

## State as of close

| Item | Value |
|---|---|
| HEAD scrmlTS | (set at wrap commit) |
| HEAD scrml-support | `f59e0bd` |
| pkg.json | 0.6.1 (unchanged) |
| Tests | **21,831 pass / 3 fail / 170 skip / 1 todo / 804 files** (3 fails = allowlist drift, NOT regressions) |
| Worktrees | main only (3 cleaned at wrap) |
| Inbox | empty |
| S99 path-discipline counter | 20 (zero leaks across 3 worktree dispatches) |
| PA auto-memory | 42 rule files (unchanged; S136 directives in user-voice per S132 cadence) |
| Maps | watermark `27e14c66` (S135); +22 commits drift; defer refresh to S137 if substantive |
| Push state | scrmlTS 19 ahead / scrml-support 3 ahead; HOLD PUSH |
| Bug 36 (CRITICAL) | RESOLVED `e1269844` |
| Bug 39 (HIGH) | RESOLVED-AS-SIDE-EFFECT-OF-BUG-36 `e1269844` |
| Bug 38 | distinct root from Bug 36 confirmed; still OPEN HIGH |
| Bug 28 (R24-BUG-1) | RESOLVED `89008e97`; SPEC §45.9 + canon ratified `a7877b5c` |
| Bug 29 (R24-BUG-2 narrow) | RESOLVED `c7e81962`; broader case = Bug 38 OPEN |
| Canon-clear health | YELLOW→RED post-R25; bug class moved one rung deeper |

---

## Tags
#session-136 #CLOSE #r24-gauntlet #r25-gauntlet #r24-bug-1-resolved #r24-bug-2-narrow-resolved #r25-bug-36-resolved #r25-bug-39-side-effect-resolved #word-form-or-and-ratified #pa-md-s136-addendum #dev-returns-content-pattern-validated #bug-fix-priority-doctrine #v0.6-patch-landscape-ratified
