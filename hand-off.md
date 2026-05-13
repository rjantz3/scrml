# scrmlTS — Session 87 (CLOSE — HISTORIC session: 37 commits, 17+ dispatches, 2 v0.3.0 blockers closed)

**Date:** 2026-05-12 (S87)
**Previous:** `handOffs/hand-off-86.md` (S86 close — landmark 15-commit)
**This file:** rotates to `handOffs/hand-off-87.md` at S88 open

**Tests at S87 CLOSE:** **11,153 / 85 skip / 1 todo / 0 fail / 554 files** at HEAD `15850d0` (full unit + integration + conformance via `bun test`). Pre-commit hook firing on every PA-authored commit. Note: total file count diverges from S86's 563 because S87 dispatches restructured several test directories + added many new test files; net comparison via test-count is approximate. Cumulative S86→S87 delta: +N tests across 37 commits with ZERO regressions across the entire session.

**Semver state:** unchanged — v0.2.6 `efbd1e8` is still the shipped baseline. v0.3.0 tag waits for v0.3.0 cut decision. The major v0.3.0 BLOCKERS closed in S87: channel-architecture OQ + SQL emission gap.

**Cross-machine sync:** scrmlTS 37 commits ahead of origin/main (PUSH PENDING — surfaced for S88 PA authorization or in-session). scrml-support already-pushed (Insight 30 appended live S87).

**Worktree state:** 26 retained from 17+ S87 dispatches (cleanup pending wrap; DRY-RUN-FIRST per S87 memory rule).

---

## S87 — what happened (full session ledger)

### Phase 1 — Session-open + Batch 1 dispatch fired

User said "whatever we can in parallel". PA fired 3 background dispatches: D3b benchmarks re-dispatch + promote.js Option β safety-harness follow-up + Wave 3 v0.3 fixture-sweep.

### Phase 2 — PA worktree-sweep CATASTROPHIC mistake + recovery

Mid-session PA wrote a bash worktree-cleanup loop intended to preserve 4 must-not-touch worktrees (3 active dispatches + 1 D3a preserved). **Bash skip-loop scoping was subtly broken; ALL 29 worktrees swept including the 4.** Exact pa.md S83 "upsetting mistake" precedent shape.

**Recovery executed immediately:** PA captured deletion-log SHAs from git output, restored all 4 branches via `git update-ref refs/heads/<branch> <SHA>`. Agents' harness auto-recreated worktrees from restored branch tips. **All 3 active dispatches finished end-to-end; ZERO work-lost.** D3b agent verbatim: *"the S83 'commit early and often' rule saved this dispatch."*

**Memory rule saved:** `~/.claude/projects/-home-bryan-maclee-scrmlMaster-scrmlTS/memory/feedback_pa_bash_cleanup_dry_run.md` — PA-side bash cleanup loops MUST execute a dry-run pass listing each target before any removal. Two-sided gate shape (mirrors pa.md S83 commit-discipline rule).

### Phase 3 — Batch 1 lands: D3b + promote.js + Wave 3 PARTIAL

- **`5762069` D3b benchmarks** — indirect-eval bench-scrml.js fix + TodoMVC `.filter(cb).length` fixture dodge + runtime-results.json regen + RESULTS.md refresh. **5th LATENT COMPILER BUG SURFACED:** `.filter(cb).<member>` strips inner callback (filed as Bug 5).
- **`9d6c8e4` promote.js Option β** — port migrate.js safety-harness Option β fix. +7 tests / 11593→11600 / 0 regressions.
- **`54803f6` Wave 3 fixture-sweep PARTIAL** — Phase 1 (16 examples auto-migrated) + Phase 3 (5 channel inverts) LANDED; **Phase 2 BLOCKED on SPEC §38.1 line 16061 channel-architecture OPEN QUESTION.** Agent correctly reverted per Rule 4. 12 trucking page files remain pre-Phase-2 state. 6 Wave 3.5 follow-ups surfaced.

### Phase 4 — Channel-architecture deep-dive + debate (in-session resolution)

- **scrml-deep-dive completed** in S87 session → `scrml-support/docs/deep-dives/channel-architecture-v0.3-2026-05-12.md` (737 lines). 5 options surfaced; 3 viable: (a.2) @-cell import binding / (b) module-file dispensation / (d) mounted-alias dotted access. PA lean argued = Option (b) with 7 numbered arguments. Debate framing recommended.
- **debate-curator completed in 3 minutes** (vs 6-12h band): Option (b) module-file dispensation WINS 47/44/44 across 6-dimension rubric. Phoenix + Svelte ideologically-distinct experts converged on (b); simplicity-defender critique answered by engine-parity argument; React (d) loses idiomaticity.
- **User RATIFIED Option (b).** Insight 30 appended to `scrml-support/design-insights.md`.
- **`6be98ad` SPEC §38.1 + walker pre-check** — implementation in 12min vs 3-8h band. 5 §B19.11 tests landed. **All 4 trucking-dispatch channel files compile silent post-fix.** v0.3.0 channel-architecture OQ CLOSED.

### Phase 5 — happy-dom perf-regression diagnostic + Batch 2 SCOPING

- **`eb89ab7` happy-dom perf diagnostic** — read-only analysis. Established regression window is wider than D3b's framing (~1402 commits Apr 5 → May 12). scrml 5.8× absolute slowdown vs React's 1.9×; scrml worst-regressed but competitive ranking intact (still beats React 9.2×). NOT v0.3.0 blocker. Top suspects: try/catch in `_scrml_trigger` (686ffcd) + derived-dirty-tracking (1e6da95) + C1 shape-aware cell emitter (0d5a144). Recommends post-v0.3.0 6-12h bisect-and-profile dispatch.
- **`de181c2` + `674d1dc` Batch 2 Trio A SCOPING + dispatch briefs** — 210-line SCOPING + 3 ready-to-fire dispatch briefs (Bug 1 14-mario / Bug 4 TodoMVC / Bug 6 load-detail).

### Phase 6 — Batch 2 Trio A (4 D2-surfaced bugs)

- **`d8ea41c` Bug 1 (14-mario)** — 4 fixes (payload binding A / EnumType::Variant B `::` rewrite / engine-routing C / derived_get tracks D). +8 tests. e2e: 18/24 across Chromium+Firefox+WebKit; AC6/AC7 fail on out-of-scope fixture bug → engine self-loop semantics.
- **`cee4469` Bug 4 (TodoMVC dep-graph)** — walkMarkupContext extension. +7 tests. **METHODOLOGY:** brief over-claimed 4 false-fires; only 1 actual false-fire. 3 of 4 W-DEAD-FUNCTION are GENUINE (TodoMVC fixture incompleteness). Form-submit failure is downstream of Bug 5.
- **`d402047` Bug 6 (load-detail lift)** — silent-data-loss bug: `<li>` for-loop bodies inside `<ul>` lift contexts were COMPLETELY DROPPED in generated JS. Fix wires structured-markup path to existing emitForStmtWithContainer. Brief's "load-detail.client.js:285" canonical reference was stale-dist; agent pivoted to 16-remote-data minimal repro.

### Phase 7 — Engine self-loop language-design DEBATE

User pushed back on PA's YAGNI dismissal of Option (d) synthesis. PA reversed; user ratified Option (d).

- **`dd91318` + `0d1514c` + `788ff3a` + `7589c6a` Option (d) D1 + D2A + D2B + D3** — runtime no-op self-write + W-ENGINE-SELF-WRITE-DETECTED info lint (inside + outside state-child) + SPEC §51.0.F.1 amendment + §34 catalog row. +14 tests. 14-mario compile produces 4 info lints; NO E-ENGINE-INVALID-TRANSITION errors. **Same synthesis-pattern as Insight 30 / §40.8.1 OQ closure.**

### Phase 8 — Bug 3a (NEW v0.3.0 blocker) + Bug 5 + multi-bug landings

- **`279bfc8` Bug 5 (.filter callback strip)** — emit-expr.ts callback preservation. Bug 1 fix-B coexists. Reverted D3b TodoMVC workaround (implicit via worktree base). +15 tests. Closes Bug 4 form-submit downstream.
- **`72c6548` Bug 3a (SQL emission v0.3.0 BLOCKER)** — every `<db>`-using example previously emitted `_scrml_sql` reference WITHOUT declaring it. Fix: emit-server.ts plumbs `_dbScope` annotation → top-of-file `import { SQL } from "bun"; const _scrml_sql = new SQL("sqlite:...")`. **Real e2e integration test** (compile + import + invoke + verify SQL) closes the latent-bug class. 6 adopter examples verified before/after. +21 tests.

### Phase 9 — Latent-bug trio (Bug 4.5 + Bug 1.5 + BS comment-skip)

- **`ec0845f` 3 file-disjoint landings:**
  - Bug 4.5: dependency-graph.ts call-ref attr args (sister of Bug 4 fix). +8 tests.
  - Bug 1.5: codegen/reactive-deps.ts engine-var markup-binding (engine cells now reactively wire in `${@engineVar}` markup). +10 tests. Surfaced 2 NEW bugs (Bug 1.6 + Bug 1.7 match-arm).
  - BS comment-skip: block-splitter.js `<!-- -->` skip. +10 tests. **Brief over-claimed: `// <program>` was already handled correctly; only `<!-- -->` needed fix.** SPEC §4.7 amendment NEEDED.

### Phase 10 — Bug 6.5 (REDUNDANT) + Bug 2c + Wave 3.6 trucking

- **`a72ccd2` Bug 6.5** — Bug 1 fix-A already covered the same code path. Tests-only landing as regression-guards. **S87 file-delta-base-check memory rule prevented double-landing.**
- **`99085e0` + `bbd8df6` + `e891ee0` + `dba4f98` Bug 2c** — bind:value mangle in expanded component bodies. Single-line root cause: normalizeTokenizedRaw didn't collapse `:` separator whitespace. Fix: 1-line regex symmetric to existing Step 4 hyphen handling. Generalizes across ALL colon-separator directive prefixes.
- **`c422bca` + `7eac3ad` + `beb25dd` Wave 3.6 trucking re-migration** — 12 trucking pages migrated `<program>` → `<page>`. ZERO manual fixes — channel-dispensation walker absorbed cross-file cascade as Insight 30 predicted. **Wave 3 v0.3 fixture-sweep flips PARTIAL → COMPLETE.**

### Phase 11 — Match-arm trio (Bug 1.6+1.7 + Bug 6.5.1 + migrate.js Wave 3.5)

- **`28146e0` + `8c8e55a` Bug 6.5.1** — ast-builder.js named-binding parser fix (`.V(field: local)` → emit `const local = subject.data.field`). **Bug 6.5.1's `child.binding` raw-text approach SUPERSEDES Bug 1 fix-A's `payloadBindings.join(", ")` approach.** +12 tests.
- **`61f4e4b` migrate.js Wave 3.5 BUNDLE** — 4 bug families closed: container-aware (E-CTX inside `<db>` 5×) + scope-safe (E-SCOPE-001 4×) + comment-safe (E-TYPE-026 1×) + bonus E-LIN-001. +17 tests.
- **`8f03715` + `6bdf34b` + `8666d45` Bug 1.6+1.7 bundle** — Bug 1.6 was already fixed by `matchArmInlineToMatchArm` regex; tests added as forward-looking guards. **Bug 1.7 inline-arm engine-write routing was the actual gap.** +10 tests. **14-mario AC delta: 1/8 → 8/8 Chromium + Firefox.**

### Phase 12 — Strategic compiler trio (emit-expr Option A + stdlib + TodoMVC)

- **`f2dbb75` stdlib Phase 1** — 173× `===`/`!==` → `==`/`!=` mechanical sweep across 20 stdlib modules. +28 regression-guard tests. Phase 3 surfaces deferred (throw migration / try/catch SPEC question / bun:/node: imports SPEC amendment).
- **`c0a835e` + `2addfc7` emit-expr Option A** — comprehensive engine-routing across ALL expression contexts (ternary / lambda / compound / call-args / nested). +9 tests. Bug 1.7 + Option A handle disjoint paths (string-rewrite layer vs ExprNode-emission layer); both complementary.
- **`15850d0` TodoMVC re-verify PARTIAL** — Bug 5 verified at compile level; canonical `.filter` restored; +7 anchor tests. Edit-mode markup NOT added — STOP-rule on **5 NEW lift-template codegen bug families surfaced (LIFT-1 catastrophic + LIFT-2/3/4 bundle + LIFT-5 ambient).** **HIGH-PRIORITY: blocks broader "per-item interactive markup inside for/lift" pattern (most common shape in TodoMVC-style apps).**

---

## S87 commit ledger (chronological, 37 PA-authored commits)

| # | Commit | Description |
|---|---|---|
| 1 | `5762069` | D3b benchmarks — indirect-eval + TodoMVC fixture dodge + 5th latent bug surfaced |
| 2 | `9d6c8e4` | promote.js Option β safety-harness port |
| 3 | `eb89ab7` | happy-dom perf-regression diagnostic + hand-off rotation |
| 4 | `de181c2` | Batch 2 Trio A SCOPING |
| 5 | `54803f6` | Wave 3 v0.3 fixture-sweep PARTIAL |
| 6 | `621a29e` | Bookkeeping bundle (mid-session) |
| 7 | `674d1dc` | Batch 2 Trio A dispatch briefs |
| 8 | `6be98ad` | SPEC §38.1 + walker pre-check (Insight 30 implementation) |
| 9 | `cee4469` | Bug 4 walkMarkupContext extension |
| 10 | `d402047` | Bug 6 lift codegen — silent-data-loss closed |
| 11 | `d8ea41c` | Bug 1 14-mario codegen+runtime — 4 fixes |
| 12 | `547566a` | Bug 2a component-expander if-chain recursion |
| 13 | `279bfc8` | Bug 5 method-chain callback preservation + Bug 3 diagnostic (Bug 3a surfaced) |
| 14 | `dd91318` | Option (d) D1 — runtime no-op self-write |
| 15 | `0d1514c` | Option (d) D2A — inside-state-child W-ENGINE-SELF-WRITE-DETECTED |
| 16 | `788ff3a` | Option (d) D2B — outside-state-child walker + 14 tests |
| 17 | `7589c6a` | Option (d) D3 — SPEC §51.0.F.1 + §34 catalog row |
| 18 | `72c6548` | Bug 3a SQL emission — v0.3.0 BLOCKER closed |
| 19 | `ec0845f` | Bug 4.5 + Bug 1.5 + BS comment-skip — 3 file-disjoint landings |
| 20 | `a72ccd2` | Bug 6.5 regression-guards (already-fixed by Bug 1 fix-A) |
| 21 | `99085e0` | Bug 2c WIP repro fixtures |
| 22 | `bbd8df6` | Bug 2c CE normalizeTokenizedRaw colon spacing fix |
| 23 | `e891ee0` | Bug 2c bind:value HTML serialization regression suite |
| 24 | `dba4f98` | Bug 2c final progress log |
| 25 | `c422bca` | Wave 3.6 WIP bootstrap |
| 26 | `7eac3ad` | Wave 3.6 migrate 12 trucking pages `<program>` → `<page>` |
| 27 | `beb25dd` | Wave 3.6 wrap — Wave 3 PARTIAL → COMPLETE |
| 28 | `28146e0` | Bug 6.5.1 named-binding parser gap fix |
| 29 | `8c8e55a` | Bug 6.5.1 unit tests |
| 30 | `61f4e4b` | Wave 3.5 migrate.js BUNDLE — 4 unwrap-path bugs closed |
| 31 | `8f03715` | Bug 1.7 inline-arm match-arm engine-write routing |
| 32 | `6bdf34b` | Bug 1.6+1.7 match-arm codegen +10 tests |
| 33 | `8666d45` | Bug 1.6+1.7 progress log — 14-mario 8/8 |
| 34 | `f2dbb75` | stdlib Phase 1 — 173× canonical-form sweep across 20 modules |
| 35 | `c0a835e` | emit-expr Option A — comprehensive engine-routing |
| 36 | `2addfc7` | emit-expr Option A test suite +9 |
| 37 | `15850d0` | TodoMVC re-verify + 7 anchor tests + 5 LIFT bug families surfaced |

---

## State-as-of-S87-CLOSE tables

### Tests at HEAD `15850d0`

11,153 / 85 skip / 1 todo / 0 fail / 554 files (full unit + integration + conformance via `bun test`). Pre-commit hook firing on every commit. Zero regressions across all 37 landings.

### Semver tag history (unchanged S87)

| Tag | Commit | Scope |
|---|---|---|
| v0.2.0 | `022ee02` | First semver baseline (S83) |
| v0.2.1 | `d72c074` | Wave 4A bundle (S83) |
| v0.2.2 | `98e872d` | Wave 4B.1 bundle (S83) |
| v0.2.3 | `d512266` | Bug 2 (S84) |
| v0.2.4 | `28cd2ac` | Wave 1 + 1.5 robust-v0.2 bundle (S84) |
| v0.2.5 | `2c687b5` | Wave 2.5 (S85) |
| v0.2.6 | `efbd1e8` | F-COMPONENT-001 family closure (S85) |
| (untagged) | `15850d0` | S87 close — 37 commits S86→S87; v0.3.0 cut path well-cleared |

### v0.3.0 cut path status (post-S87)

- ✅ **Channel-architecture OQ CLOSED** (Insight 30 — Option b module-file dispensation; SPEC §38.1 + walker pre-check landed; trucking-dispatch verified clean)
- ✅ **SQL emission BLOCKER CLOSED** (Bug 3a — emit-server `_scrml_sql` declaration; real e2e integration test added)
- ✅ **Wave 3 v0.3 fixture-sweep COMPLETE** (Wave 3.6 closed PARTIAL → COMPLETE)
- ✅ **5 of 6 D2-surfaced bug families closed** (14-mario / TodoMVC / load-detail / 03-contact-book diagnostic / 05-multi-step) + 5th `.filter(cb).<member>`
- ✅ **Engine self-loop semantics ratified Option (d)** — runtime + lint + SPEC §51.0.F.1
- 🟡 **5 LIFT-template codegen bug families surfaced (NEW)** — block canonical TodoMVC edit-mode + broader "per-item interactive markup inside for/lift" pattern. **HIGHER-PRIORITY than typical bugs.**
- 🟡 **stdlib Phase 3** deferred — throw migration / try/catch SPEC question / bun:/node: imports SPEC amendment
- 🟡 **happy-dom perf bisect** deferred to post-v0.3.0
- 🟡 **Closure-analysis compiler implementation** deferred (300-640h band per Insight 29)

### Insights ratified S87

- **Insight 30** (S87) — v0.3 cross-file channel access — Option (b) module-file dispensation. `scrml-support/design-insights.md`.
- **Option (d) engine self-write semantics** — synthesis-pattern (idempotent runtime + W-ENGINE-SELF-WRITE-DETECTED info lint + SPEC §51.0.F.1). Same shape as Insight 30 / §40.8.1 OQ closure.
- **Methodology pattern: synthesis option** consistently winning in deep-dives + debates. Captured in design-insights.

### Memory rules saved S87

- `feedback_pa_bash_cleanup_dry_run.md` — PA-side bash cleanup loops MUST dry-run first.
- `feedback_pa_file_delta_base_check.md` — PA file-delta must verify agent base SHA against current main; cherry-pick if main touched same file since base.

### Worktree state at S87 close

**26 worktrees retained** from 17+ S87 dispatches. All work landed in main via file-delta or cherry-pick. **DRY-RUN-FIRST cleanup pending** at wrap (per S87 memory rule).

Pre-commit hook: `core.hooksPath = scripts/git-hooks` verified holding throughout session.

### Cross-machine sync state at S87 close

- **scrmlTS:** 37 commits ahead of origin/main. **PUSH PENDING — surfaced for S88 PA authorization OR in-session.**
- **scrml-support:** 0/0 — already-pushed S87 (Insight 30 appended live).

---

## Latent bugs filed S87 (for S88+ triage)

Tracked in PA task list; counts:

| Family | Tasks | Notes |
|---|---|---|
| Bug 1.6 | #29 | match-arm payload-binding (.Mushroom(n) bare n) — closed S87 (was already fixed by matchArmInlineToMatchArm) |
| Bug 1.7 | #30 | match-arm direct-write bypasses engine guard — closed S87 |
| Bug 4.5 | #17 | call-ref attr args read-detection — closed S87 |
| Bug 6.5 | #18 | match-arm payload binding for inline-markup arms — closed S87 (regression-guard tests only; was already fixed) |
| Bug 6.5.1 | #31 | named-binding parser gap (.V(field: local)) — closed S87 |
| Bug 1.5 | #19 | engine-var markup-binding codegen gap — closed S87 |
| **LIFT-1** | #36 | parens-attr in lift template elides parent element (CATASTROPHIC) |
| **LIFT-2/3/4 BUNDLE** | #37 | emit-lift attr-emitter parity bundle (literal-setAttribute fallback) |
| **LIFT-5** | #38 | if-inside-for reconciler-factory `_scrml_lift_target` ambient |
| **function(x){body}** | #39 | callback body emission gap (S88 follow-on to Bug 5) |
| **stdlib Phase 1.5** | (newly surfaced) | E-SYNTAX-042 null/undefined sweep (~50+ sites; same shape as Phase 1) |
| **stdlib Phase 3a/b/c** | (deferred) | throw migration / try/catch SPEC question / bun:/node: imports SPEC amendment |
| **SPEC §4.7 amendment** | (deferred) | BS-comment-skip normative softening (per BS-layer comment-skip dispatch) |
| **SPEC §40.4 amendment** | (newly surfaced) | bun:/node: in isLegalImportSpecifier() |
| **SPEC §18.7 mixed-binding** | (newly surfaced) | clarify positional+named mixed shape |

---

## Open at S87 close (top-priority for S88)

1. **PUSH PENDING** — 37 S87 commits to origin/main. Surface for S88 PA authorization first thing.
2. **5 LIFT-template codegen bug families** — high-priority for v0.3.0 cut readiness. Recommended 3-dispatch decomposition: (a) LIFT-2/3/4 bundle (shared root); (b) LIFT-1 (orthogonal — parens parser); (c) LIFT-5 (orthogonal — ambient state).
3. **Wave 3.7 fixture sweep on remaining content** — kickstarter / primer / articles / 5 publishable articles need an audit for any v0.3 program-shape carry-overs (pa.md S86 corpus-ouroboros warning).
4. **stdlib Phase 1.5 / 3a / 3b / 3c** — null/undefined sweep + throw migration + try/catch SPEC question + bun:/node: imports SPEC amendment.
5. **SPEC amendments queued** — §4.7 BS-comment-skip + §40.4 bun:/node: + §18.7 mixed-binding clarification.
6. **happy-dom perf bisect** (deferred post-v0.3.0).
7. **Chrome benchmark rerun** (deferred — D3b surfaced).
8. **W-AUTH-RUNTIME-FALLBACK emission impl** (gated on closure-analysis compiler impl 300-640h band).
9. **Wave 4 adopter content** — tutorials + scrml.dev refresh + articles triage.
10. **v0.3.0 tag decision** — gated on LIFT bugs + Wave 4 adopter content.

---

## Things S88 PA must NOT screw up (S87 additions to standing list)

- **DO honor pa.md S87 file-delta-base-check rule.** Multiple S87 worktrees were branched from `7a00b1b` (S86 wrap); when landing, verify agent's base SHA against current main + cherry-pick if main touched the same file since base. Memory rule at `feedback_pa_file_delta_base_check.md`.
- **DO honor pa.md S87 bash-cleanup-dry-run rule.** Any worktree/branch/file removal loop must dry-run first. Memory rule at `feedback_pa_bash_cleanup_dry_run.md`.
- **DO note the synthesis-pattern is consistently winning** in design debates (Insight 30 + Option (d) + §40.8.1 OQ closure). When PA frames a binary OQ with real costs both sides, always look for a synthesis option.
- **DO note Bug 6.5.1's `child.binding` raw-text approach SUPERSEDES Bug 1 fix-A's `payloadBindings.join(", ")` approach.** When dispatching match-arm-related work, use the raw-binding field, not payloadBindings.join.
- **DO note Bug 1.7 + emit-expr Option A handle disjoint paths.** Bug 1.7 = string-rewrite layer (rewriteExpr / rewriteBlockBody for inline-arm results without ExprNode); Option A = ExprNode-emission layer (emit-expr.ts:emitAssign). Both complementary by codegen-stage stratification.
- **DO note 5 LIFT-template bugs are HIGH-PRIORITY** despite being filed as latent. They block the broader "per-item interactive markup inside for/lift" pattern.
- **DO note brief over-claiming pattern surfaced multiple times S87** (Bug 4 / Bug 6.5 / BS comment-skip / Bug 1.6). Future briefs claiming a symptom count or claim should be cross-checked against AST/dist before encoding into the brief. Per pa.md Rule 4 (SPEC normative; derived docs are NOT) — this rule extends to BRIEF-derived claims; verify against current truth before encoding.
- **DO note `--no-verify` was avoided across all PA-side commits S87.** Pre-commit hook ran on every commit. Wave 3 agent had used `--no-verify` 4 times (acknowledged + impact contained); no other agent did.

### Rules permanently load-bearing (from session-open hand-off — unchanged)

- Rule 1 — no marketing/article/tweet work unless user brings it up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999% of the time
- Rule 4 — spec is normative; derived planning docs are NOT (S87 extension: BRIEF-derived claims also need cross-check against current truth before encoding)
- S86 ratifications — idiomatic-examples styling rule + corpus-ouroboros warning + BS-layer over SPEC retreat

---

## Tags

#session-87 #close #LANDMARK-37-COMMITS #v0.3.0-blockers-CLEARED #insight-30 #option-d-synthesis #channel-architecture #bug-3a-sql-emission #wave-3-COMPLETE #14-mario-8-of-8 #pa-worktree-sweep-mistake-recovered-zero-loss #file-delta-base-check-memory-rule-saved #bash-cleanup-dry-run-memory-rule-saved #5-LIFT-template-bugs-surfaced-high-priority #stdlib-phase-1-173-occurrences-cleaned #emit-expr-option-a-comprehensive-engine-routing #brief-overclaim-pattern-surfaced-multiple-times
