# scrmlTS — Session 84 (CLOSE — v0.2.4 tagged + Wave 2 landed + v0.3 program-shape dive ratified)

**Date:** 2026-05-11 (S84 single-day session; 5th session of the 2026-05-11 cluster after S80/S81/S82/S83)
**Previous:** `handOffs/hand-off-83.md` (S83 close — triple-semver-tag release)
**This file:** rotates to `handOffs/hand-off-84.md` at S85 open

**Tests at S84 CLOSE:** **11,512 pass / 77 skip / 1 todo / 0 fail / 554 files** (`bun run test` final at HEAD `1d2f1cf`)
**Cumulative S83→S84 delta:** **+55 pass / +9 files / 0 regressions / 0 silent failures** since v0.2.3 baseline `d512266`

**Semver state at S84 close:**
- v0.2.0 `022ee02` — baseline
- v0.2.1 `d72c074` — Wave 4A (Bug 5+6+7)
- v0.2.2 `98e872d` — Wave 4B.1 (Bug 9+1+3+4+8)
- v0.2.3 `d512266` — Bug 2 (derived-engine over auto-declared)
- **v0.2.4 `28cd2ac` ← CUT THIS SESSION** — Wave 1 + Wave 1.5 robust-v0.2 bundle (12 PA-authored commits since v0.2.3)
- HEAD `1d2f1cf` (post-Wave-2; **not yet tagged v0.2.5** — pending user authorization)
- All v0.2.x tags pushed to origin

**Cross-machine sync at S84 close:**
- scrmlTS: 0/0 vs origin/main at v0.2.4 push moment; Wave 2 commits + this-session-close commits pending push (see §"Pending push" below).
- scrml-support: 0/0 vs origin/main at empirical-study + Insight 29 push moment; v0.3 plan + dive doc + user-voice S84 append pending push.

---

## S84 — what happened (summary by phase)

S84 opened with "let's only look at what is left to get to v0.2 robustness." It closed with v0.2.4 cut + pushed + Wave 2 adopter content/spec polish landed + the v0.3 program-shape architectural dive complete + ratified for next-session spec-amendment kickoff. **Largest single session of the project to date.**

### Phase 1 — Bug 2 close + perf-feel Phase 0 empirical study (Wave 0 / parallel)

User: *"study and bug 2 same time."*

- **Bug 2** (derived-engine over auto-declared engine var) — closed via parallel dispatch. `compiler/src/type-system.ts` extension of `reactiveBindings` to include non-derived auto-declared engine variables via the same pattern as Bug 9's scopeChain pre-bind. §51.9.7 transitive-projection rejection preserved. 14-mario reverted to canonical `<engine for=HealthRisk derived=@marioState>` form. **+9 tests / 0 regressions.** Tagged **v0.2.3** at `d512266`.
- **Perf-feel Phase 0 empirical study** (scrml-deep-dive dispatch) — measured reactive-graph static-resolvability across 33 files / 501 reactive-graph reads/writes. **Verdict: 99-100% statically resolvable** (gate threshold was 70%). Runtime-only catalog functionally empty. Two side findings: (a) DG doesn't emit `reads` edges for markup-context reactive reads (v0.3.0 Stage-7 extension), (b) `examples/06-kanban-board.scrml` SYM PASS 1 typed-decl registration gap (5 unresolved `@cards` reads). Output at `scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md`.

### Phase 2 — Perf-feel debate (Insight 29 ratified)

User authorization triggered debate-curator. Synthesis-mode dispatch (debate-curator's toolset lacks Agent — same pattern as Insights 21/25/26/27/28). Verdict:

- **M1 → Approach A ratifies.** Whole-stack reactive-graph closure analysis is the **v0.3.0 spec-amendment target** (later shifted to v0.4 per the program-shape dive sequencing reframing — see Phase 6).
- **M2 → Approach B deferred to v2.** Telemetry-augmented PGO; llvm-pgo-expert flipped from A+B to A-alone-for-v1 (strongest flip-vote signal in the debate).
- **Approach D rejected as v1 default;** documented as "eject button."
- Scores A 119 / A+B 107 / D 103 of 168. Pro-X-voting-against-X frequency now at **8+**.
- Insight 29 persisted at `scrml-support/design-insights.md` line 1825+.

### Phase 3 — v0.2 robustness punch-list framing + Wave 1

User: *"I want to make sure that we are done with v0.2 before we get too far ahead of ourselves... whats left for getting v0.2 to a state of robustness?"*

PA produced tiered punch list (Tier 1 compiler-correctness / Tier 2 adopter content + spec polish / Tier 3 deferred). User authorized "everything, smartly, parallel where safe" + later "and the skip-surface audit."

**Wave 1 — 7 parallel compiler-correctness dispatches** (all landed; cumulative +75 tests / 0 regressions):

| # | Surface | Commit |
|---|---|---|
| 1 | `not <expr>` codegen → `!` (§45.7 operator form) | `16e88a6` |
| 2 | Match pipe-alternation in `rewriteMatchExpr` + `emit-control-flow.ts` + `preprocessForAcorn` lookbehind | `3c727bc` |
| 3 | E-DG-002 false-fire on derived-engine projected vars (`creditReader` credit) | `b6d6711` |
| 4 | SYM/TAB typed-decl registration (`collectTypeAnnotation` depth tracking — depth-of-survey #8) | `917a576` |
| 5 | Bare-variant inference at binary-expr positions (==, !=, is, is-not) | `2c5a23a` |
| 6 | `.advance(.X.history)` test-hardening (codegen was correct since S83 W2.4 Bug #2 keystone) | `e27d4c8` |
| 13 | Skip-surface audit | no commits (77/77 valid deferrals; A+ test hygiene) |

### Phase 4 — Wave 1.5 (6 follow-ons surfaced by Wave 1)

User: *"wave 1.5 before wave 2"* + later additions *"add the test-channel-audit and the map refresh"* + *"actually, hold the map refresh until pre wave 2."*

| # | Surface | Commit |
|---|---|---|
| W1.5-1 | Bug 6.5 — `_makeExprCtx` `enginesWithHistory` forward (function-body `.advance(.X.history)` history-map slot) | `b0055ac` |
| W1.5-2 | Bug 4.5 + Bug 5 follow-on — bare-variant inference: nested struct + control-flow positions | `6af9fba` |
| W1.5-3 | Bug 1 anomaly #1 — tokenizer/lift attr-value whitespace (`_joinPreservingWordBoundary`) | `c18800d` |
| W1.5-4 | Bug 1 anomaly #2 — SQL-ref placeholder + const/let SQL init (7 source files threaded) | `28cd2ac` |
| W1.5-5 | Bug 1 anomaly #3 — Lift+async malformed syntax (GITI-001 IIFE wrap context-aware) | `ea7ed70` |
| W1.5-6 | test-channel-audit — silent non-assertion sweep | `e7ff91d` |

**v0.2.4 cut at `28cd2ac`** with comprehensive tag message + push (both repos 0/0 at moment of tag).

### Phase 5 — Pre-Wave-2 map refresh (project-mapper)

`project-mapper` agent dispatched. Sandbox-blocked Write tool for `.claude/maps/*` — same pattern as Insight 29 + the empirical study. Agent gathered findings inline; **PA-side patched `primary.map.md`** with v0.2.4 fingerprint + Wave 1+1.5 file:line landmarks + Bug 4's flagged SYM PASS 1 / symbol-table.ts / ast-builder.js / type-system.ts landmark gap closed + Insight 29 forward signal. Map currently at HEAD `28cd2ac` + Wave 2 landings. **`.claude/maps/` is gitignored** — local-only artifact; refresh per machine.

Non-compliance items flagged for wrap (see §"Non-compliance carry-forward" below).

### Phase 6 — Wave 2 (5 parallel; 4 landings + 1 no-op)

User: *"auth."*

| # | Surface | Commit |
|---|---|---|
| W2-1 | Trucking-dispatch app v0.2.4 canonical rewrite (24 files in `examples/23-trucking-dispatch/`) | `1d2f1cf` |
| W2-2 | C1 tutorial rewrite (zero-to-running on v0.2.4) — 48 files / 1060-line tutorial + 11 snippets + counter.db + verify-tutorial.sh | `15336b9` |
| W2-3 | C2 articles triage + rewrites — 10 articles + per-article triage tables (5 articles now publishable per user-decision queue) | `2646cdd` |
| W2-4 | PIPELINE.md prose-pass | ✅ **no-op** (already shipped at S75/C23 per IMPLEMENTATION-ROADMAP §8.6 #2 closure — scope-blindness-is-structural rule operating correctly) |
| W2-5 | SPEC §34 catalog drift cleanup (388 → 484 unique codes; 93 new rows + 2 NEW drift findings D-BATCH-001 + E-SYNTAX-DURATION not in S78 audit) | `d72cbb3` |

**Plus an article fix-up follow-on** for `why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md` (not in W2-3's audit-15 scope):
- Sweep commit `eaf718f` (4× `< Type>` spacing fixes + `===` → `==` + `enum` → `type:enum` + `initial=.Idle` + `!check` → `not check` + `throw new Error` → `fail .Variant`)
- Option-1 engine-block rewrite `32ecf1c` (replaced legacy `<machine>` pipe-grammar pseudo-engine with v0.2.4-canonical `Actor:enum` + match-arm dispatch function; prose around example aligned)

### Phase 7 — v0.3 program-shape dive (the big architectural surface)

User direction across multiple turns. Key verbatims captured in user-voice S84 entry.

**Direction ratified:**
- **(a) `<program>` is the program-scoped container.** Everything semantically program-scoped lives inside `<program>`.
- **(b) Inside `<program>`, default mode is logic.** Direct text children of `<program>` parse as logic-block content. `${}` block-form RETIRED inside `<program>` body (interpolation `${expr}` survives).

**Plan written at `scrml-support/docs/deep-dives/program-as-container-and-logic-default-shape-2026-05-11.md`** with Phase 0 sweep + Phase 1 dive + Phase 2 disposition + 6 Q-verdicts framework.

**Dive fired + completed** (scrml-deep-dive dispatch; Write-blocked, PA-side persisted). **Result at `scrml-support/docs/deep-dives/program-as-container-shape-DIVE-2026-05-11.md`.**

**Dive verdict highlights:**
- **Empirical compiler-pipeline impact: 40-110h LOW BAND.** Compiler `ast-builder.js:690` (`isProgramRoot`) + `TOPLEVEL_STATE_DECL_RE` ALREADY half-implements the proposal — V5-strict `<x> = init` declarations are already lifted as direct text children of `<program>`. The change extends the lift to cover `function`/`fn`/`type`/etc.
- **Sequencing: v0.3.0 = program-shape standalone; Insight 29 Approach A slides to v0.4.0.** Per user's Q8.1 sequencing reframing ("if impl ends up simple enough, we may make that 0.3 and push other advances up the numbers").
- **Surprise: the corpus is already internally inconsistent.** 6 of 22 examples (02, 05, 06, 08, 13, 17) have logic INSIDE `<program>`; 14-mario + 15-channel-chat have it OUTSIDE.
- **Migration scope mostly mechanical** via extended `bun scrml migrate --program-shape`.

**6 Q-verdicts pending S85 ratification:**
1. Q1-channels-inside (reverse E-CHANNEL-INSIDE-PROGRAM) — PA-lean YES
2. Q1-styles-outside (`#{}` stays file-top) — PA-lean YES
3. Q2-one-program-per-file canonical — PA-lean YES
4. Q3-let/const bare locals at program-top lift — PA-lean YES
5. Q3-declaration-shape list (full enumeration in dive) — PA-lean YES
6. Q5-deprecation cycle (W-PROGRAM-REDUNDANT-LOGIC v0.3 → E-* v0.4) — PA-lean YES

### Phase 8 — Wrap (this turn)

This file + master-list + changelog + user-voice + final commits + push. See §"Operational state" below.

---

## State-as-of-close tables

### Semver tag history

| Tag | Commit | Scope |
|---|---|---|
| v0.2.0 | `022ee02` | First semver baseline (S83) |
| v0.2.1 | `d72c074` | Wave 4A bundle (S83 — Bug 5 + 6 + 7) |
| v0.2.2 | `98e872d` | Wave 4B.1 bundle (S83 — Bug 9 + 1 + 3 + 4 + 8) |
| v0.2.3 | `d512266` | Bug 2 (S84 — derived-engine over auto-declared) |
| **v0.2.4** | **`28cd2ac`** | **Wave 1 + Wave 1.5 robust-v0.2 bundle (S84 — 12 commits since v0.2.3)** |
| (untagged) | `1d2f1cf` | Wave 2 commits land HERE; v0.2.5 tag candidate pending user authorization |

### v0.2.5 trajectory (Wave 3 + remaining items)

| Item | Est | Source |
|---|---|---|
| **Wave 3: Playwright e2e infra** (5 critical-path tests: TodoMVC + 02 + 03 + 05 + 14-mario) | ~10-15h | Ratified S84 |
| **Wave 3: Benchmarks refresh** (TodoMVC vs React/Svelte/Vue at v0.2.x) — paired with Playwright dev-server-bootstrap | ~5-10h | Ratified S84 |
| **W2-1 anomaly A1** — `<expr.member> is some/is not` parser issue in ternary-cond inside `${}` markup interpolation (10+ sites) | ~3-5h | W2-1 finding |
| **W2-1 anomaly A2** — Cross-file channel mount E-RI-002 skip-path doesn't propagate (`perFileChannelCellMap` file-local; cross-file `<Channel/>` mount fires false) | ~4-8h | W2-1 finding |
| **W2-1 anomaly A3** — `server function` modifier vs E-CG-006 inconsistency (caller-context-propagation doesn't escalate cross-file-imported server fns) | ~2-4h | W2-1 finding |
| **W2-1 anomaly A4** — F-COMPONENT-001 cross-file component-with-nested-PascalCase E-COMPONENT-035 (kickstarter §3 known limitation) | ~4-8h | W2-1 finding |
| **B2 subdirs curate** (509 files in 12 gauntlet-s* dirs — mostly intentionally-failing regression corpus) | ~10-20h | S83 deferral |

### v0.3.0 spec-amendment cluster (post-S85 ratification)

| Item | Est | Source |
|---|---|---|
| **a. `bun scrml migrate --program-shape` extension** (~50-80h subset of impact) | ~50-80h | Dive verdict |
| **b. TAB extension** for new declaration shapes inside `<program>` body | ~30-50h | Dive verdict |
| **c. SPEC.md amendments** per §Q7 (~390 lines added across 14 sections) | included in compiler impact | Dive verdict |
| **d. E-CHANNEL-* reversal + W-PROGRAM-REDUNDANT-LOGIC addition** (~40 LOC + tests) | included | Dive verdict |
| **e. Mechanical fixture migration sweep** (~800 file edits via migrate command) | included | Dive verdict |
| **TOTAL v0.3.0 band:** ~40-110h calibrated | | |

### Tests at close (full suite via `bun run test`)

- **11,512 pass / 77 skip / 1 todo / 0 fail across 554 files** (5,432 LOC compiler / 30,891 LOC codegen / 99,603 LOC scrml total)
- Wave 1 + 1.5: +75 tests cumulative (Bug 1 +26, Bug 2 +18, Bug 3 +5, Bug 4 +9, Bug 5 +16, Bug 6 +1; Bug 6.5 +3, Bug 4.5/5fo +17, Bug 1.1 +2, Bug 1.2 +13, Bug 1.3 +5)
- Wave 2: 0 test deltas (docs/content-only changes)
- Article fix-ups: 0 test deltas

### Cumulative S83→S84 file deltas

- 6 new compiler-test files (Wave 1 + 1.5): not-operator-lowering, match-pipe-alternation-codegen, dg-projected-var-reader-credit, sym-typed-state-decl-registration, bare-variant-binary-expr-inference, bare-variant-nested-context-inference, tokenizer-event-handler-attr-whitespace, const-let-sql-init
- 1 new sample (Wave 1): match-pipe-alternation.scrml
- 48 files in tutorial rewrite (W2-2 — tutorial.md + snippets)
- 10 articles edited (W2-3) + 2 article follow-ons (`why-scrml-has-to-deprecate`)
- 24 trucking-dispatch files (W2-1)
- 1 SPEC.md edit (W2-5 §34)
- 2 new scrml-support docs (v0.3 plan + dive)
- 1 new memory file (`project_self_host_orthogonal.md`)
- `primary.map.md` updated locally (gitignored)

### `.claude/agents/` state at close

11 project agents + 5 debate panelists (carried from S83). No staging changes this session.

---

## Operational state at close

### Working tree at S84 close — what's pending commit

scrmlTS:
- `M hand-off.md` (this file — to commit)
- `?? handOffs/hand-off-83.md` (S83-close rotation — to commit; created at S84 open)
- `M .claude/maps/primary.map.md` (gitignored but tracked-anomaly — see Non-compliance below)
- `M master-list.md` (will be touched in wrap)
- `M docs/changelog.md` (will be touched in wrap)

scrml-support:
- `?? docs/deep-dives/program-as-container-and-logic-default-shape-2026-05-11.md` (v0.3 plan — to commit)
- `?? docs/deep-dives/program-as-container-shape-DIVE-2026-05-11.md` (v0.3 dive — to commit)
- `M user-voice-scrmlTS.md` (S84 entry appended — to commit)
- 5 private article drafts (DON'T TOUCH per pa.md Rule 1)
- `?? tools/`, `?? .claude/worktrees/` (operational; leave)

### Pending push (BOTH repos)

User authorized: tag v0.2.4 + push (done at `28cd2ac`); commit + push scrml-support (Insight 29 + empirical study landed earlier). NOT explicitly authorized: push the post-v0.2.4 Wave 2 + program-shape + S84 wrap commits. Surface for explicit ratification at S85 open if not pushed during this wrap.

### Worktree state at close — CLEAN

`git worktree list` shows ONLY the main checkouts for both repos. All 13 scrmlTS worktrees + 1 scrml-support worktree from this session cleaned per pa.md wrap §6b.

---

## Open questions to surface immediately at S85 open

1. **6 Q-verdicts from v0.3 program-shape dive need user ratification** (Q1-channels-inside, Q1-styles-outside, Q2-one-program-per-file, Q3-let/const lift, Q3-declaration-shape list, Q5-deprecation cycle). PA-lean YES on all 6. Once ratified → dispatch v0.3.0 spec-amendment cluster (the 5-item plan in dive doc §"Recommended PA next action").
2. **v0.2.5 tag decision** at `1d2f1cf`. Wave 2 closed but tag-or-not-tag is user's call. Semver cadence per S83 was per-wave-bundle; Wave 2 = v0.2.5 candidate. Wave 3 (Playwright + benchmarks) would be its own bundle = v0.2.6 or v0.3.0 depending on dive-ratification timing.
3. **W2-1 anomaly fixes (A1-A4)** queued for v0.2.x followon — Wave 2.5 dispatch candidates. Real adopter-blocker bugs:
   - A1 (10+ sites): `<expr.member> is some/is not` in ternary-cond inside `${}` interpolation fires E-SCOPE-001
   - A2 (12 sites, 10 files): cross-file channel mount E-RI-002 skip-path doesn't propagate
   - A3 (1 site, app.scrml): `server function` modifier vs E-CG-006 caller-context inconsistency
   - A4 (1 site, board.scrml): F-COMPONENT-001 cross-file component-with-nested-PascalCase
4. **Wave 3 ready for dispatch** (Playwright e2e + benchmarks paired; ~30-50h band). Sequenced AFTER any Wave 2.5 anomaly fixes so benchmarks/e2e run against a fixed compiler.
5. **5 articles publishable** per W2-3 triage (user-decision queue per pa.md Rule 1 — no PA-volunteered publication):
   - tier-ladder-promotion (with status banner)
   - realtime-and-workers (ACCURATE)
   - mutability-contracts (with status banner)
   - server-boundary-disappears (ACCURATE)
   - components-are-states (with status banner)
6. **Non-compliance items for PA wrap action** (filed for this wrap; revisit at S85 open if not closed):
   - master-list §0 last-updated line; Bug 2 status carry-forward (now closed at v0.2.3)
   - docs/changelog.md S84 entry
   - PA-SCRML-PRIMER.md §12 stale references: test count `~7,800-8,800` → ~11,512; SPEC/PIPELINE size figures
   - "Follow-up prose pass deferred" line in primer §12 (PIPELINE prose pass already shipped at S75/C23 — drop the bullet)
   - `docs/changes/fix-lift-async-iife-paren/` possible archival candidate (W1.5-5 dispatch dir)
   - `.claude/maps/primary.map.md` gitignored-but-tracked anomaly (file is in git index despite being in .gitignore)
   - Stale primer references touched at S82+S84 — verify all caught
7. **Memory files updated this session**: `project_self_host_orthogonal.md` (NEW). Cross-link in MEMORY.md index. No deletions.
8. **Cross-machine sync state**:
   - scrmlTS: 0/0 vs origin at v0.2.4 cut moment; Wave 2 + wrap commits pending push (this wrap).
   - scrml-support: 0/0 vs origin at Insight 29 + empirical study push moment; v0.3 plan/dive + user-voice S84 pending push (this wrap).

---

## Things S85 PA must NOT screw up (carry-forward from prior sessions + S84 additions)

S77-S83 lists carry forward verbatim. **S84 additions:**

- **DO NOT re-debate v0.3 program-shape direction.** User ratified (a)+(b) at S84. Dive Phase 1 already worked out implications. S85's job is Q-verdict ratification + spec-amendment kickoff, NOT re-deliberation.
- **DO read the v0.3 dive result FIRST** at S85 open before any v0.3 work. `scrml-support/docs/deep-dives/program-as-container-shape-DIVE-2026-05-11.md`. The 6 Q-verdicts + impact band + sequencing decision live there.
- **DO read `project_self_host_orthogonal.md` memory** before any v0.4 or self-host-shaped discussion. Self-host is post-v1.0; does NOT gate any v0.3/v0.4 work. PA has stumbled on this multiple times historically.
- **DO note `.claude/maps/primary.map.md` reflects v0.2.4 + Wave 2 close locally** (gitignored). Per-machine refresh required on each clone via `project-mapper`.
- **DO surface the W2-1 anomalies A1-A4 explicitly** if user asks "what's left in v0.2.x." They're queued; small but real adopter-blockers.
- **DON'T fire Wave 3 (Playwright + benchmarks) before Wave 2.5 anomaly fixes land**, OR before user authorization. The benchmark numbers should run against a fixed compiler.
- **DON'T touch the 5 untracked private article drafts in scrml-support working tree** (per pa.md Rule 1).
- **DON'T treat W2-4's no-op finding (PIPELINE prose pass already shipped) as a one-off.** Same `feedback_scope_blindness.md` pattern as Bug 6 Option B's Phase-0 finding earlier in this session. When dispatch-brief mentions deferred-work-from-roadmap, agent MUST verify against current state — not implement on derived-doc citations.
- **DON'T forget v0.2.5 tag decision** is pending at S85. Wave 2 has cumulative content/spec polish worth a tag if user authorizes.
- **DON'T let agent-worktree-isolation violations slide silently** — pa.md F4 path-discipline hardening candidate filed; this session had 4 distinct violation patterns (W1.5-1 CWD drift, W1.5-5 direct-commit-to-main, W1.5-2 debug-WIP-in-main, W2-1 WIP-in-main). PA-side commit-discipline gate caught them all but the friction adds up.
- **DON'T re-derive the Q8.1 sequencing decision.** Empirical band landed LOW (40-110h); v0.3.0 = program-shape standalone is settled per the dive's verdict.

---

## Cross-machine sync state at S84 close (will update after wrap commits + push)

Pending wrap commits + push:
- **scrmlTS**: hand-off.md + handOffs/hand-off-83.md (rotation) + master-list.md + docs/changelog.md + .claude/maps/primary.map.md (forced if untrack-and-readd dance not done)
- **scrml-support**: 2 v0.3 docs + user-voice-scrmlTS.md

After push: both repos 0/0 vs origin at S84 close.

---

## Tags

#session-84 #close #v0.2.4-tag #wave-1-closed #wave-1-5-closed #wave-2-closed #wave-3-ratified #v0.3-program-shape-dive-complete #insight-29-ratified #insight-29-approach-a-slides-to-v0.4 #q8.1-low-band-standalone-v0.3 #self-host-orthogonal-memory #depth-of-survey-discount-10-occurrences #pro-x-voting-against-x-frequency-8 #scope-blindness-pattern-correctly-applied #pa-md-f4-hardening-candidates #zero-regressions #empirical-impact-40-110h #six-q-verdicts-pending-s85
