# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-12T21:42:04Z
# scan mode: INCREMENTAL_UPDATE (S87 close — commit f1555b4)
# prior baseline: 2026-05-11T17:00:00Z @ b6c8e1c (S81 INCREMENTAL_UPDATE)

## Summary

Total docs scanned: ~430 (delta from S81 baseline; ~100 new docs across S82-S87 dispatch dirs + articles + audits)
Carry-forward non-compliant items: 18 (14 from S78 cold-start + 4 from S79-S81 increment)
NEW non-compliant since S81: 6 items
Uncertain (carry-forwards): 8
NEW uncertain: 2

---

## NEW non-compliant items (S82–S87)

### docs/changes/v0.3-batch-2-trio-a/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — all three bugs in Trio A are now SHIPPED/CLOSED:
- Bug 1 (14-mario codegen+runtime) — closed S87 commits `d8ea41c` + `8f03715` + `6bdf34b` + `8666d45`
- Bug 4 (walkMarkupContext extension) — closed S87 commit `cee4469`
- Bug 6 (lift codegen silent-data-loss) — closed S87 commit `d402047`
**Suggested disposition:** archive `docs/changes/v0.3-batch-2-trio-a/` to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-batch-2-trio-b/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — all three bugs in Trio B are SHIPPED/CLOSED:
- Bug 2a (component-expander if-chain branches) — closed S87 commit `547566a`
- Bug 3a (SQL emission) — closed S87 commit `72c6548`
- Bug 5 (method-chain callback preservation) — closed S87 commit `279bfc8`
**Suggested disposition:** archive `docs/changes/v0.3-batch-2-trio-b/` to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-bs-layer-comment-skip/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — BS comment-skip SHIPPED S87 commit `ec0845f`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-bug-1.5-engine-var-markup/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Bug 1.5 reactive-deps engine-var markup-binding fix SHIPPED S87 `ec0845f`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-bug-1.6-1.7-match-arm-bundle/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Bugs 1.6+1.7 match-arm bundle SHIPPED S87 `8f03715` + `6bdf34b` + `8666d45`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-bug-2c-bind-value-mangle/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Bug 2c bind:value mangle SHIPPED S87 `bbd8df6` + `beb25dd`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-bug-3a-sql-emission/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Bug 3a SQL emission SHIPPED S87 `72c6548`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-bug-4.5-call-ref-args/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Bug 4.5 call-ref-args SHIPPED S87 `ec0845f`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-bug-6.5-inline-markup-arm-payload/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Bug 6.5 inline-markup arm payload SHIPPED S87 `a72ccd2`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-bug-6.5.1-named-binding-parser/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Bug 6.5.1 named-binding parser SHIPPED S87 `28146e0` + `8c8e55a`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-channel-dispensation-spec-walker/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Channel dispensation + spec walker SHIPPED S87 `6be98ad`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-emit-expr-option-a-comprehensive-engine-routing/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Option A emit-expr comprehensive engine-routing SHIPPED S87 `c0a835e` + `2addfc7`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-engine-self-write-option-d/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Option (d) engine self-write synthesis SHIPPED S87 `dd91318` + `0d1514c` + `788ff3a` + `7589c6a`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-stdlib-cleanup/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — stdlib Phase 1 canonical-form sweep SHIPPED S87 `f2dbb75`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-wave-3.5-migrate-bundle/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Wave 3.5 migrate bundle SHIPPED S87 `61f4e4b`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-wave-3.6-trucking-remigration/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Wave 3.6 trucking re-migration SHIPPED S87 `7eac3ad` + `beb25dd`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v03-wave-1/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — v0.3 Wave 1 (program-as-container + <page> + channel-placement direction) SHIPPED S85.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-wave-2/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Wave 2 item (a) migrate --program-shape + item (b) TAB extension SHIPPED S85.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/v0.3-wave-3-fixture-sweep/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Wave 3 fixture-sweep flipped PARTIAL → COMPLETE S87 `7eac3ad`. Main SCOPING.md still describes what-to-do framing; now historical.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/w-program-spa-inferred-impl/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — W-PROGRAM-SPA-INFERRED implementation SHIPPED; dispatch is historical.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/wave-3-d2/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Wave 3 D2 Playwright dispatch closed S87 (4 critical-path Playwright tests + 4 latent compiler-bug families filed). Historical.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/wave-3-d3/ (SHIPPED/CLOSED dispatch dir)
**Reason:** content-heuristic — D3a crashed (pre-commit hook crash); D3b benchmarks refreshed + TodoMVC fix landed. D3a is preserved-for-recovery but recovery is complete (all 4 must-not-touch branches recovered). Now historical.
**Detail:** Includes D3a-CRASH-DIAGNOSIS.md which is research artifact, not current truth.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/migrate-safety-harness-import-fix/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — migrate.js Option β safety-harness transactional fix SHIPPED S86.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/promote-safety-harness-import-fix/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — promote.js safety-harness port SHIPPED S87 `9d6c8e4`.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/changes/scrml-dev-codegen-divergence/ (SHIPPED or uncertain)
**Reason:** content-heuristic — progress.md references ongoing scrml-dev codegen divergence analysis. Status uncertain — may be open.
**Suggested disposition:** review master-list.md for OQ status; if closed, archive.

### docs/changes/playwright-e2e-dispatch-1/ (SHIPPED dispatch dir)
**Reason:** content-heuristic — Playwright e2e suite dispatch 1 (02-counter.spec.ts 5 ACs passing Chromium+Firefox) SHIPPED S85.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/audits/happy-dom-perf-regression-s87-2026-05-12.md
**Reason:** content-heuristic — analysis doc explicitly states "NOT a v0.3.0 blocker; recommends post-v0.3.0 6-12h bisect-and-profile dispatch." Describes aspirational future work, not current truth.
**Suggested disposition:** move to `scrml-support/archive/audits/` after post-v0.3.0 scheduling decision is made, OR keep in `docs/audits/` as a known-issue register. PA decides.

---

## NEW uncertain items (S82–S87)

### docs/changes/v0.3-todomvc-e2e-reverify/progress.md
**Reason:** dispatch landed PARTIAL — Bug 5 verified at compile level; edit-mode markup NOT landed due to 5 LIFT-template bugs surfaced. Progress.md explicitly calls out "Final status — PARTIAL" with 5 open ACs.
**What to check:** Are the 5 open ACs (edit-mode markup, e2e execution, W-DEAD-FUNCTION closure) tracked in master-list.md as v0.3.0 cut items? The dispatch dir is NOT archived yet because the LIFT-template bugs are the blockers for the next dispatch. Keep until LIFT-1..5 are closed.

### docs/changes/v0.3-approach-a-spec/
**Reason:** content-heuristic — SCOPING.md and progress.md describe Approach A (whole-stack closure analysis) which was filed as a v0.4.0 item per Insight 29 (not v0.3.0). If this work is paused/deferred, docs describe aspirational future state.
**What to check:** Is v0.3-approach-a-spec still an active spec-drafting dispatch, or has it been superseded by Insight 29 (Approach A → v0.4.0) + Insight 30 (channel architecture closed)? If deferred, archive.

---

## Carry-forwards from S81 baseline (UNCHANGED items)

### docs/changes/a5-7-tests-samples/INVENTORY.md
**Reason:** content-heuristic — A5-7 sub-phase fully SHIPPED S80. Post-hoc inventory.
**Suggested disposition:** archive parent dir to `scrml-support/archive/dispatches/`.

### docs/changes/debounce-throttle-approach-b/progress.md
**Reason:** content-heuristic — Approach B SHIPPED S79.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/audits/hardcoded-thresholds-2026-05-10.md
**Reason:** S78 audit; Buckets A+B+C all SHIPPED; F.1/F.2 SHIPPED S81.
**Suggested disposition:** move to `scrml-support/archive/audits/`.

### docs/audits/hardcoded-thresholds-followup-2026-05-11.md
**Reason:** drove S81 F.1/F.2; both SHIPPED.
**Suggested disposition:** move to `scrml-support/archive/audits/`.

### docs/articles/realtime-and-workers-as-syntax-devto-2026-04-29.md:200
**Reason:** line reads `<channel protect=>` which was renamed to `<channel auth=>` at S80.
**Status:** KNOWN-DRIFT per pa.md Rule 1 (published articles are immutable). No action needed unless re-published.

---

## Carry-forwards from S78 cold-start baseline (UNCHANGED)

All 14 items from the S78 FULL_COLD_START report remain as-flagged. Summary:

**Non-compliant (archived pending):**
- docs/articles/lsp-and-giti-advantages-draft-2026-04-25.md — name-heuristic `-draft-`; published version exists
- docs/articles/npm-myth-draft-2026-04-25.md — name-heuristic `-draft-`; published version exists
- docs/deep-dives/ (3 files) — location; belong in scrml-support
- benchmarks/fullstack-react/CLAUDE.md — anomalous agent-instruction file in benchmark subdir
- docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md — self-declares "SUPERSEDED"
- docs/changes/reactive-derived-decl-divergence/ADR.md — location; ADR belongs in scrml-support
- docs/audits/a1b-b11-rule4-audit through a1b-b17-rule4-audit (7 files) — historical records
- docs/changes/ SHIPPED dispatch directories (large batch — A1a, A1b, A1c, A7, A8, A9, A10, server-keyword-deprecation; see prior report for full list)
- docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md — historical record

**Uncertain (S78 carry-forwards):**
- docs/audits/spec-conformance-2026-05-10.md and test-conformance-2026-05-10.md — age; may be ongoing
- docs/audits/scope-c-stage-1-2026-04-25.md and scope-c-stage-1-sample-classification.md — age; may be superseded
- docs/audits/kickstarter-v0-verification-matrix.md — references kickstarter-v0; v2 exists
- docs/recon/* (8 files) — age + location
- docs/experiments/* (5 files) — age + location
- docs/changes/v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md — A7 fully SHIPPED; uncertain if content absorbed
- docs/audits/self-host-spec-conformance-2026-05-11.md — self-declares deferred; rebuild-script gated (S81)

---

## Compliant (current — do not flag)

- `compiler/SPEC.md` — authoritative (26,942 lines; §51.0.F.1 + §38.1 updated S87). Compliant.
- `compiler/SPEC-INDEX.md` — generated artifact (308 lines). Compliant.
- `compiler/PIPELINE.md` — 2,758 lines. Compliant.
- `compiler/src/codegen/README.md` — codegen module overview. Compliant.
- `compiler/tests/conformance/s32-fn-state-machine/REGISTRY.md` — conformance registry. Compliant.
- `master-list.md` — current through S87. Compliant.
- `hand-off.md` — current S87 CLOSE. Compliant.
- `docs/changelog.md` — current through S87 close. Compliant.
- `docs/PA-SCRML-PRIMER.md` — compliant.
- `docs/audits/scope-c-findings-tracker.md` — active tracking. Compliant.
- `docs/audits/compiler-forgotten-surface-2026-05-06.md` — historical. Compliant.
- `docs/changes/v0.3-todomvc-e2e-reverify/` — PARTIAL dispatch; active (LIFT bugs are v0.3.0 blocker). Compliant.
- All `docs/articles/*-devto-*.md` (published articles) — compliant.
- All `docs/tutorial-snippets/*.scrml` — current. Compliant.
- `docs/tutorial.md` — compliant.
- `docs/changes/predicate-gaps-deep-dive-prep/` — pending work; compliant.
- `docs/changes/promotion-ergonomics/` — pending; compliant.
- `docs/changes/v0next-audit/` + `docs/changes/v0next-inventory/` (excluding SCOPE-SUPPLEMENT) — compliant.
- `benchmarks/RESULTS.md` — updated S87; compliant.
- All `docs/changes/*/progress.md` for active dispatches — compliant.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s87 #wave-3-complete #lift-bugs-surfaced #dispatch-archival

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support pa.md](../../../scrml-support/pa.md)
