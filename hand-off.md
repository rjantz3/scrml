# scrmlTS — Session 102 (CLOSE)

**Date:** 2026-05-18
**Previous:** `handOffs/hand-off-104.md` (S101 CLOSE — rotated at S102 open)
**Machine:** single-machine
**HEAD at S102 CLOSE:** `08d05b3` (self-host stripIds fix; --no-verify per S88, surface as process violation) + this wrap commit landing on top
**Origin sync at CLOSE:** scrmlTS 0/0 (4 commits pushed mid-session via --no-verify per user authorization); scrml-support 0/0 (2 commits pushed: user-voice S100 + Bug-4 pre-population)
**v0.3.3 tag CUT mid-session:** `5815cf6` PGO Phase 3 wave + §41.14 formFor SPEC (tag pushed)

---

## S102 net outcome — 25-commit session across 3 macro-tracks

S102 was a heavyweight 25-commit session spanning three macro-tracks that ran in parallel and serialized at the right join-points:

1. **PGO Phase 3 wave** — landed −62% trucking-dispatch pipeline reduction (2326ms → ~880ms median). 4 commits across the wave + 2 SCOPING docs.
2. **formFor (FLAGSHIP L22 family member)** — SCOPING → deep-dive → 2 debates → SPEC §41.14 (8 error codes) → impl dispatch (11 files / +2733 LOC / +58 tests). Six commits across the arc.
3. **Runtime-perf SCOPING** — authored at session end per user direction "start that scope when current dispatches drain"; 3-phase ladder mirroring PGO methodology; Phase 1 includes vanilla-JS baseline.

**v0.3.3 PATCH TAG cut + pushed mid-session.** Tag `v0.3.3` carries PGO Phase 3 wave (P3.A + P3.B + P3.C) + §41.14 formFor SPEC entry (status: spec'd; impl pending in v0.3.x main; v0.4 anchor).

## Tests at S102 CLOSE

- **Pre-commit subset** (unit + integration + conformance): **12,718 pass / 88 skip / 1 todo / 1 fail / 663 files / 43,030 expect** (+58 from S101 baseline 12,660)
- The 1 fail (`self-compilation: compiled module shape > compiled modules export resolveModules and runMetaChecker`) is **locally-introduced this session** by PA running `rebuild-self-host-dist.ts` which overwrote the May-11 working dist files. Pre-existing self-host bootstrap brokenness (S78-documented at "Bootstrap L3 host-compiler library-mode meta-block strip bug corrupting compiler/dist/self-host/ast.js") aggravated by the rebuild. Dist files gitignored → broken state is local-only; nothing propagated to origin.
- formFor canonical example compiles end-to-end with full `<form>` element, PE-default `action=/api/__ri_route_persistSignup_1`, CSRF auto-injection, per-field render with shape-dispatched inputs (text/checkbox), title-case labels, error-rendering anchors, submit button.

## S102 commit ledger (this session — scrmlTS)

| # | Commit | Track | What |
|---|---|---|---|
| 1 | `2363428` | formFor | SCOPING — L22 family-discipline gate-walk + 10 OQs |
| 2 | `b6a15f3` | PGO | SCOPING — 3-phase ladder grounded in S94 perf data |
| 3 | `139bbc5` | PGO | P1.5 --debug-perf CLI flag plumbing |
| 4 | `bdb7d50` | PGO | P1.4 baseline benchmark capture + regression-check tooling |
| 5 | `aea0707` | docs | README BM over-removal (REVERTED) |
| 6 | `30a24f8` | docs | revert of #5 |
| 7 | `7de63a6` | docs | README stale-warning surgical removal (the actual fix) |
| 8 | `f7ff521` | PGO | P1.1 CG sub-stage timing (revealed S94 hypothesis to be REFUTED) |
| 9 | `94aef6e` | PGO | P1.2 RS component timing (amended; stage() helper widened) |
| 10 | `fb49ced` | PGO | P1.3 DG sub-step timing + quartile growth tracking |
| 11 | `3ac04a0` | PGO | Phase 2 SCOPING — emit-client deep-dive structure |
| 12 | `bcb48c9` | M1.5 | M1.5 native-parser template-mode tracking (expr-literals → full disposition) |
| 13 | `c79ef54` | PGO | P2.2 DG markup-sweep per-call-site characterization |
| 14 | `c565055` | PGO | P2.1 emit-client sub-decomposition (S94 hypothesis REFUTED) |
| 15 | `0c16f58` | formFor | SPEC §41.14 formFor API entry + 8 error codes + §53.14.3/.5/.INDEX |
| 16 | `6478639` | PGO | Phase 3 SCOPING + §3 candidate-ranking refresh |
| 17 | `efdcf88` | PGO | P3.A fnNameMap regex collapse (−44% pipeline) |
| 18 | `8ff11f4` | PGO | P3.C owner-stack for findOwningRenderDGNode (−99.7%) |
| 19 | `b1d3595` | PGO | P3.B fused detect-runtime-chunks probe (−72% pipeline cumulative) |
| 20 | `5815cf6` | RELEASE | **v0.3.3 release** (pkg.json bump + tag) |
| 21 | `857bf63` | PGO | P3.B-followup hasResetExpr flag (−71% on detect-runtime-chunks residual) |
| 22 | `e7f5241` | formFor | impl landing — 11 files / +2733 LOC / +58 tests / 8 error codes verified |
| 23 | `216b245` | runtime-perf | SCOPING — close TodoMVC 0/10 suffering gap |
| 24 | `08d05b3` | self-host | stripIds fix for hasResetExpr + _p3aExport fields (--no-verify per S88) |
| 25 | (this commit) | WRAP | S102 CLOSE — wrap step 1+2+3 (hand-off + master-list + changelog) |

**scrml-support S102 ledger:** `020f255` user-voice S100 directive (completing prior-session-uncommitted append) · `02e575a` Bug-4 dot-path QUEUED stub pre-population. Both pushed.

## PGO Phase 3 — Final state

**Trucking-dispatch pipeline cost reduction (warm median of 5 runs, --debug-perf off):**

| Stage | Baseline (perf-baseline.json `139bbc52`) | Post-Phase-3 + follow-up | Reduction |
|---|---|---|---|
| **Total pipeline** | **2326ms** | **~880ms** | **−62.2%** |
| post-fn-name-mangle | 545ms | ~108ms | −80% |
| detect-runtime-chunks | 305ms | ~33ms | −89% |
| findOwningRenderDGNode | 31ms | 0.08ms | −99.7% |
| emit-client (parent) | 1215ms | ~376ms | −69% |

Below S94 baseline of 1170ms by ~290ms despite all Approach A closure-analysis work landing since v0.3.0.

**S94 hypothesis REFUTED.** S94 anticipated `emit-bindings` + `emit-reactive-wiring` as the hot path; actual measurement showed `post-fn-name-mangle` (58%) + `detect-runtime-chunks` (33%) = 90.7% of emit-client. emit-bindings + emit-reactive-wiring combined were 2.6%.

**Byte-identical output verified** across all four PGO Phase 3 landings (P3.A `diff -r` 113 files on trucking-dispatch dist; P3.B SHA256 on 8 corpora; P3.C SHA256 reachability JSON on 3 corpora; P3.B-followup `diff -r` 3 corpora). Zero behavior change.

**Two follow-ups deferred (anticipated for future PGO pass):**
- (a) `hasEqualityExpr` flag — sibling Option-2 pattern; smaller expected savings (most files have `==` so equality activates early in current behaviour)
- (b) Markup/for-stmt double-walk in `detectRuntimeChunks` (lines 568-570 + 587) — clean Option-1-style fold of duplicated traversal; ~10-15ms additional savings expected

## formFor (FLAGSHIP) — Final state

**SCOPING + deep-dive + 2 debates + SPEC + impl all landed in S102.**

- **SCOPING** `2363428` — L22 family-discipline gate-walk; 10 OQs catalogued; gates 1-3 PASS, gate 4 FIRES.
- **Deep-dive** at `scrml-support/docs/deep-dives/formFor-design-2026-05-18.md` — 10 OQs deliberated, 7 closed HIGH/MED-HIGH, 3 surfaced for debate, 2 newly-surfaced OQs (nested-struct + read-only).
- **OQ-FF-1 debate verdict** — slot-style customization wins 51.5/60 (vue-template-directives) vs function-valued-attr 31/60 (react-hook-form) vs v1-without 43.5/60 (simplicity-defender). Slot-style is Pillar-5-compliant; function-valued-attr is a per-primitive mini-DSL violation. Registry layer (`data.registerRenderer`) deferred v1.next as additive.
- **OQ-FF-2 debate verdict** — explicit-attr + slot + progressive-enhancement default wins 52/60 (composed paradigm) vs explicit-attr-bare 49.5/60 (react-server-actions) vs magic-naming 30/60 (rails-simple-form). Magic-naming rejected for Pillar-5 (new dispatch primitive) + refactor-fragility + multiple-handlers-of-same-struct.
- **OQ-FF-7 (label-derivation) debate SKIPPED** per S102 user direction "skip the debate and author the spec". Deep-dive MED-HIGH verdict adopted directly (4-level chain: slot > registerLabels > `@label` reserved > title-case default). Methodology rule filed: MED-HIGH or higher closes in deep-dive.
- **SPEC §41.14** `0c16f58` — 11 normative subsections + 8 error codes + §53.14.3/.5/.INDEX companions.
- **Impl** `e7f5241` — 11 files / +2733 LOC / 58 new tests / 8 error codes confirmed firing. Approach A source-level AST expansion per §41.14.10 Pillar-5 invariant. End-to-end verified.

**§53.14.3 family-roster status:** "spec'd S102 (§41.14); impl pending (FLAGSHIP)" — will flip to "shipped S102" after the follow-on dispatches land:

| formFor follow-on | Cost | Scope |
|---|---|---|
| stdlib export | ~5-8h | Export `formFor` + `registerLabels` from `stdlib/data/` |
| Sample + example app | ~3-5h | Flagship demo for scrml.dev |
| scrml.dev refresh + README compile-gate block | ~3-5h | Marketing + adopter surface |
| Comprehensive conformance corpus | ~3-5h | Beyond happy-path + per-error-code |
| `disabled=!@cell` reactive-attr wiring fix | ~2-4h | Pre-existing compiler-wide gap surfaced by formFor default submit button; workaround = slot="submit" override |
| v1.next: per-type renderer registry (`data.registerRenderer`) | ~3-5h | Per OQ-FF-1 verdict |
| v1.next: `@label("...")` type-field annotation | ~3-5h | Per OQ-FF-7 verdict |
| v1.next: auto-recurse into nested struct fields | ~5-8h | Per OQ-FF-11 verdict |

## Runtime-perf SCOPING

**Authority:** removed-from-README TodoMVC runtime benchmark table flagged scrml losing 0/10 ops vs React 19 / Svelte 5 / Vue 3 at v0.3.0 STABLE refresh. Per S102 user direction "start that scope when current dispatches drain" + "include vanilla JS baseline in phase 1".

**3-phase ladder mirroring PGO methodology:**

- **Phase 1 — measure first** (dispatch-ready):
  - P1.A vanilla-JS TodoMVC baseline + runner extension to 5 subprocesses (zero-framework hand-rolled DOM mutation; per-row cost floor reference; per S102 user direction)
  - P1.B scrml runtime per-op instrumentation (wrap `_scrml_reactive_get` / `_scrml_reactive_set` / `_scrml_reconcile_list` / `notifySubscribers` / DOM-write / effect-scheduling under `globalThis.__SCRML_DEBUG_PERF` flag)
  - P1.C PA-direct re-measurement at v0.3.3 HEAD with vanilla baseline + instrumentation; write to `benchmarks/RESULTS.md` (NOT README — README data was deliberately pulled S102 per user direction; methodology learning that re-publish requires fresh data)
- **Phase 2 — attribute** (data-driven). Hypothesized worst ops: Partial update / Select row / Swap rows. Hypotheses: subscription-set traversal cost / classList-toggle re-render scope / list-diff cost. All REFUTABLE from P1.B data.
- **Phase 3 — optimizations** (data-driven). Anticipated candidates: signal-style direct subscription on hot paths (Solid.js precedent) / batched reconciliation at microtask boundary (Vue 3 precedent) / for-loop key-based diff for `_scrml_reconcile_list` (React/Svelte precedent) / static-region elision (Svelte 5 precedent) / per-row reactive scope (Solid.js precedent).

**4 open questions pending user disposition before Phase 1 dispatch:**
1. Authorize Phase 1 (P1.A + P1.B parallel)?
2. Playwright real-Chrome path if happy-dom masks the profile?
3. Vanilla-JS style (raw DOM API per js-framework-benchmark canonical, recommended) vs pseudo-vanilla with helpers?
4. Scope (existing 8 ops only, or add scrml-strength differentiating ops)?

## Self-host bootstrap state — process violation surfaced

**PA ran `rebuild-self-host-dist.ts` mid-session** to investigate the 48-test ast-builder self-host parity failures. The rebuild overwrote the May-11 working dist files with newly-compiled versions. Newly-compiled versions have a broken import path (`../../../stdlib/compiler/expression-parser.js` doesn't exist locally — possibly `expression-parser.scrml` was intended; possibly a generator bug in `compiler/scripts/build-self-host.js`).

**State at CLOSE:**
- All dist files at `compiler/dist/self-host/*.js` are dated May 18 17:47 (today)
- All gitignored — broken state is LOCAL ONLY
- Pre-existing scrml-source brokenness in `compiler/self-host/ast.scrml` (102 errors per S78 "Bootstrap L3" entry) compounds the issue — ast.scrml won't compile, so the bootstrap chain can't fully regenerate
- 1 fail in pre-commit subset: `self-compilation: compiled module shape > compiled modules export resolveModules and runMetaChecker` — directly caused by the broken import path

**User authorized `--no-verify` push** per S88 protocol (process violation visibility). The 4-commit wave (P3.B-followup + formFor + runtime-perf SCOPING + stripIds fix) landed at origin cleanly. The self-host issue does NOT propagate (dist files gitignored).

**Carry-forward to S103:** investigate `compiler/scripts/build-self-host.js` generator vs `compiler/self-host/meta-checker.scrml` source for the broken-import-path origin. May require fixing `compiler/self-host/ast.scrml`'s 102 pre-existing errors first.

## Carry-forwards for S103 (load-bearing across sessions — substantial list)

| Track | Item | Cost | Notes |
|---|---|---|---|
| Self-host bootstrap | Investigate broken import-path in regenerated dist | ~2-4h | meta-checker.js imports `../../../stdlib/compiler/expression-parser.js` which doesn't exist; pre-existing per S78 + aggravated S102 |
| formFor follow-on | stdlib export `formFor` + `registerLabels` | ~5-8h | Sequenced after impl landing; needed before scrml.dev refresh |
| formFor follow-on | Sample + example app (flagship demo for scrml.dev) | ~3-5h | |
| formFor follow-on | scrml.dev refresh + README compile-gate block | ~3-5h | |
| formFor follow-on | `disabled=!@cell` reactive-attr wiring fix | ~2-4h | Pre-existing compiler-wide gap; surfaced by formFor default submit button |
| formFor follow-on | Comprehensive conformance corpus | ~3-5h | Beyond happy-path + per-error-code |
| Runtime-perf | Phase 1 dispatch (P1.A + P1.B parallel) | ~9-18h | 4 open questions pending |
| PGO Phase 3 followup | `hasEqualityExpr` flag (Option-2 sibling pattern) | ~1-2h | Smaller savings; pursue only after measuring residual |
| PGO Phase 3 followup | Markup/for-stmt double-walk fold | ~2-3h | Clean Option-1-style fold |
| Native parser | M2 expression parser | ~2-4 sessions | M1 lexer ladder complete S101 + S102 (M1.5) |
| Native parser | §48.6.4 `pinned fn` parser-recognition impl | ~2-4h | SPEC landed S98; impl pending |
| Bug-4 | Dot-path render-by-tag (heads-up coding gate) | full pipeline post-signal | User heads-up coding sessions are the pre-pipeline filter |

## Carry-forwards (across-session standing rules — unchanged)

- pa.md Rules 1-5 (no marketing / full-production fidelity / right > easy / SPEC normative / shoot straight)
- All S96-S102 PA-memory rules unchanged. **S102 NEW:** README staleness paradox methodology (the warning above the data has its own staleness clock; refresh-or-remove inline staleness warnings when refreshing the data itself).
- S43 cross-machine (dormant per S100)
- S83 commit discipline two-sided rule
- S88 `isolation:"worktree"` mandatory + `--no-verify` requires explicit auth
- S91 CWD-routing rule (`git -C` doesn't change shell CWD; verify pwd before Agent dispatches after sibling-repo cd)
- S95 communication norms (shoot straight, no preambles, push back when warranted)
- S96 SPEC-at-session-start
- S98 Pillar 5b (Reach discipline)
- S99 path-discipline addendum + voice-author reuse-over-reinvent + context-budget operational datum
- S100 PreToolUse hook (path-discipline closed at platform level)
- S101 v0.3.x patch arc pattern (bump-commit-tag-push paired; README gate as release-tag gate)
- S101 standing rule — corpus-ouroboros pre-dispatch sanity check (`git log --grep=<feature>` BEFORE authoring SCOPING)

## Things S103 PA must NOT screw up

In addition to S101 + earlier carry-forwards:

- **Don't run `rebuild-self-host-dist.ts` until the broken-import-path bug is fixed.** Once that's run, the May-11 working dist files are lost. The repair path needs to fix the generator OR fix `compiler/self-host/meta-checker.scrml` source so the regenerated dist files have correct imports.
- **PGO Phase 3 byte-identity is a hard invariant.** Any future runtime optimization (Phase 3 follow-ups OR runtime-perf Phase 3) MUST verify byte-identical output OR explicitly document the bundle-shape change in the commit message.
- **formFor §41.14.10 Pillar-5 invariant.** Any future formFor impl changes MUST preserve "emitted output is standard scrml, readable as if hand-authored" — if you find yourself adding emit-form-for-specific markup shapes that don't appear elsewhere in scrml, STOP and re-examine.
- **OQ-FF-7-skip precedent is for HIGH or MED-HIGH confidence verdicts only.** Future L22 family member SPEC authoring: read the deep-dive's verdict-confidence column; only skip the debate for HIGH/MED-HIGH. MEDIUM or LOWER requires debate.
- **README BM table has its own staleness clock from any inline warning above it.** When refreshing benchmark data, ALSO refresh / remove the inline staleness warning. Otherwise the warning becomes the misleading thing.

## Session-start checklist for S103 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL (Pillar 5b applies; S98 ratification)
3. Read `compiler/SPEC-INDEX.md` IN FULL (S102 §41.14 + S101 §4.17 + S98 §51.0.B.1 cumulative changes)
4. Read `master-list.md` §0 LIVE DASHBOARD IN FULL — NOTE the S102 CLOSE addendum at the top; **NOTE the local self-host bootstrap brokenness in 1-fail state** documented there
5. Read this `hand-off.md` (S102 CLOSE) — will be rotated to `handOffs/hand-off-105.md` at S103 open
6. Read last ~10 contentful user-voice entries from `../scrml-support/user-voice-scrmlTS.md` (S102 entries: README staleness paradox + formFor SPEC path + runtime-perf vanilla-JS direction)
7. Session-start sync hygiene: `git fetch origin && git rev-list --left-right --count origin/main...HEAD` should be 0/0
8. Inbox check — `handOffs/incoming/*.md` should be empty (verified S102 CLOSE)
9. Verify worktrees: `git worktree list` shows main only (cleaned at S102 close; 10 landed worktrees removed)
10. Verify path-discipline hook + pre-push hook installed
11. **Self-host bootstrap state check** — `ls -la compiler/dist/self-host/`; if all files dated May 18 17:47, the broken-import state from S102 is still present. Decide whether to investigate the build-self-host.js generator OR delete the files and let `bun test compiler/tests/integration/self-compilation.test.js` SKIP cleanly. Either way, surface to user.
12. Report: caught up + next priority

## Tags

#session-102 #CLOSE #v0.3.3-cut #pgo-phase-3-wave #-62-percent-pipeline #s94-hypothesis-refuted #formFor-spec-shipped #formFor-impl-shipped #runtime-perf-scoping-shipped #M1.5-landed #25-commits #pre-commit-12718 #self-host-bootstrap-process-violation #--no-verify-authorized-S88 #pushed-to-origin
