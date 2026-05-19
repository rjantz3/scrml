# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-18T18:37:27-06:00
# scan mode: INCREMENTAL_UPDATE (S103 / v0.3.3 era — commit 84c736e)
# prior baseline: 2026-05-18 @ dae8ff1 (S101 / v0.3.1 era)

## Summary

Total docs scanned: ~175 (prior ~165 + ~10 new docs from S102-S103 wave: pgo-scoping, pgo-phase-2-scoping, pgo-phase-3-scoping, formFor-scoping, formFor-impl/progress.md, runtime-perf-scoping, benchmark-perf-baseline.ts as reference, perf-baseline.json, pre-push hook, benchmarks/RESULTS.md)
Compliant: ~163
Non-compliant: 8 (4 carried from S101 + 4 new stale SCOPING headers from S102)
Uncertain: 2 (reduced from 3 — v0.3-approach-a-impl SCOPING now classified as fully superseded)

---

## Non-compliant docs

### docs/articles/llm-kickstarter-v0-2026-04-25.md
**Reason:** content-heuristic — doc self-identifies as RETRACTED/SUPERSEDED
**Detail:** Header states "Status: RETRACTED / SUPERSEDED — archived 2026-05-13 (S89 Wave 4.A D-3)." Body is a stub.
**Suggested disposition:** deref to archive/ or delete (stub; no informational content remaining)

### docs/changes/undefined-eradication-self-host/SUPERSEDED-CLOSURE.md
**Reason:** content-heuristic — doc self-identifies as CLOSED-AS-NO-OP / SUPERSEDED
**Detail:** Header states "Status: CLOSED-AS-NO-OP (work already complete on main at dispatch time)" — historical artifact only.
**Suggested disposition:** deref to scrml-support/archive/ or delete

### docs/changes/wave-4-adopter-content/SCOPING.md
**Reason:** content-heuristic — describes future/aspirational work that is now CLOSED
**Detail:** Status "SCOPED — awaits PA dispatch sequencing" from S88. Wave 4 adopter content CLOSED at S89. The work described is done; this SCOPING no longer describes current state.
**Suggested disposition:** Archive to scrml-support/archive/ or note as closed in-file header

### docs/changes/promotion-ergonomics/TIER-C-SCOPE.md
**Reason:** content-heuristic + grep-mismatch — describes future planned work not yet implemented
**Detail:** Status "SCOPED — queued, not yet dispatched" from S66. `W-MATCH-TRANSITIONS-ACCRUING` found ONLY in promote.js error console message (not a fire-site). `--engine` flag not found in compiler/src. Original filing age is now ~S66 relative to S103 HEAD.
**Suggested disposition:** Verify if deferred indefinitely; if so, deref to scrml-support/archive/

### docs/changes/pgo-scoping/SCOPING.md
**Reason:** content-heuristic — status header "SCOPE OPEN" but PGO Phases 1+2+3 ALL SHIPPED at S102
**Detail:** Header `status: SCOPE OPEN — Phase 1 LOW-FRICTION ITEMS dispatch-ready...` describes work that is now fully complete. PGO P1.1-P1.4 timing instrumentation CLOSED; Phase 2 data-driven profiling CLOSED; Phase 3 all three optimizations CLOSED at S102 (commits `efdcf88` P3.A, `8ff11f4` P3.C, `b1d3595` P3.B, `857bf63` P3.B-followup). v0.3.3 tag cut at `5815cf6`.
**Suggested disposition:** Update status field in-file to "SCOPE CLOSED — Phases 1+2+3 SHIPPED S102 (v0.3.3 `5815cf6`)" or archive to scrml-support/archive/

### docs/changes/pgo-phase-2-scoping/SCOPING.md
**Reason:** content-heuristic — status header "SCOPE OPEN" but Phase 2 SHIPPED at S102
**Detail:** Header `status: SCOPE OPEN — Phase 2.1 dispatch-ready...` describes work completed at S102 (commit `c565055` Phase 2.1, `c79ef54` Phase 2.2). Phase 2 findings (S94 hypothesis REFUTED; actual hot path post-fn-name-mangle 58% + detect-runtime-chunks 33%) are historical data now superseded by Phase 3 implementation.
**Suggested disposition:** Update status to "SCOPE CLOSED — Phase 2.1+2.2 SHIPPED S102" or archive

### docs/changes/pgo-phase-3-scoping/SCOPING.md
**Reason:** content-heuristic — status header "SCOPE OPEN" but all three P3 optimizations SHIPPED at S102
**Detail:** Header `status: SCOPE OPEN — three optimizations dispatch-ready...` describes P3.A + P3.B + P3.C work that all shipped at S102 plus P3.B-followup hasResetExpr at `857bf63`. Trucking-dispatch result 2326ms → ~880ms = −62% reduction confirmed.
**Suggested disposition:** Update status to "SCOPE CLOSED — P3.A + P3.B + P3.B-followup + P3.C ALL SHIPPED S102 (v0.3.3)" or archive

### docs/changes/formFor-scoping/SCOPING.md
**Reason:** content-heuristic — status header "SCOPE OPEN" but formFor SPEC + impl SHIPPED at S102
**Detail:** Header `status: SCOPE OPEN — gate 1+2 pass; gate 3 written; gate 4 (deep-dive) RECOMMENDED FIRE...` and footer "SCOPING status: OPEN. Pending user disposition on Q-FF-OPEN-1 (deep-dive authorize)..." — all gates cleared, deep-dive fired, OQ-FF-1 debate verdict (slot-style 51.5/60) + OQ-FF-2 debate verdict (52/60) obtained, SPEC §41.14 landed, impl shipped at `e7f5241`. The "SHIPPED" note at line 418 confirms final state but the top-level status field was not updated.
**Suggested disposition:** Update top-level status and SCOPING status to "SCOPE CLOSED — formFor SPEC §41.14 + impl SHIPPED S102 (`e7f5241`)" or archive

---

## Uncertain docs (needs human review)

### docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md
**Reason:** content-heuristic — status "SCOPE PREPARED — awaits convener authorization to fire deep-dive (when corpus signal warrants)"; trigger conditions may still be unmet.
**What to check:** Has the deep-dive been authorized? If trigger conditions remain unmet, deref to scrml-support/archive/ if no active dispatch planned.

### docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md
**Reason:** content-heuristic — top-level status line reads "Status: DRAFT — awaits PA + user OQ disposition before any A-4.* sub-phase dispatches." A-4 is FULLY CLOSED at S91 (A-4.1..A-4.7 all committed). The SCOPING body contains historical OQ dispositions and is now a post-hoc record.
**What to check:** Update status to CLOSED in-file header, or confirm PA has already noted it as a historical record to preserve.

---

## S102-S103 Changes vs S101 Baseline

**New compliant docs added S102-S103:**
- docs/changes/formFor-impl/progress.md — session-state doc; excluded per invocation scope rule ✓
- docs/changes/pgo-phase-3-scoping/SCOPING.md — see non-compliant above (stale status header)
- docs/changes/pgo-phase-2-scoping/SCOPING.md — see non-compliant above (stale status header)
- docs/changes/pgo-scoping/SCOPING.md — see non-compliant above (stale status header)
- docs/changes/formFor-scoping/SCOPING.md — see non-compliant above (stale status header)
- docs/changes/runtime-perf-scoping/SCOPING.md — COMPLIANT: status "SCOPE OPEN — Phase 1 dispatch-ready" is accurate; Phase 1 not yet shipped; active SCOPING ✓
- benchmarks/perf-baseline.json — data artifact (not a doc); not scanned
- scripts/benchmark-perf-baseline.ts, scripts/perf-regression-check.ts — scripts, not docs; out of scope
- SPEC-INDEX.md — updated S102 (§41.14 formFor +~638L entry); authoritative spec index, compliant ✓
- compiler/SPEC.md — updated S102 (§41.14 formFor landed); authoritative spec, compliant ✓
- docs/changelog.md — updated S102 close addendum + S103 entry; current, compliant ✓
- master-list.md — updated S102/S103 close addenda + v0.3.3; current, compliant ✓
- README.md — updated S102 (surgical staleness removal `7de63a6`); current, compliant ✓

**S101 uncertain item resolved (now non-compliant):**
- docs/changes/v0.3-approach-a-impl/SCOPING.md (was "uncertain") — reclassified as non-compliant: A-1 through A-5 ALL CLOSED at S92 (v0.3.0 STABLE). The SCOPING is fully superseded. See below.

### docs/changes/v0.3-approach-a-impl/SCOPING.md
**Reason:** content-heuristic — describes "Approach A impl" as future work; A-1 through A-5 ALL CLOSED at S92 (v0.3.0 STABLE).
**Detail:** Parent scoping written pre-A-5. All sub-waves closed: A-2 Reachability Solver S91, A-3 AuthGraph S91, A-4 Per-Route Splitter S91, A-5 Integration Tests S92. The body contains historical OQ dispositions and is now purely a post-hoc record.
**Suggested disposition:** Update status to CLOSED or archive to scrml-support/archive/

---

## Compliant (no action needed)

The following categories were scanned and found compliant:
- compiler/SPEC.md, compiler/SPEC-INDEX.md, compiler/PIPELINE.md (v0.7.2) — authoritative specs, current
- compiler/native-parser/README.md — M1.4 + M1.5 template-mode status consistent with code
- docs/articles/* (15 articles) — devto content; articles-currency-table + VERIFIED.md confirm status
- docs/audits/* — dated audit snapshots, compliant as historical records
- docs/changes/runtime-perf-scoping/SCOPING.md — active SCOPING (Phase 1 not yet shipped) ✓
- docs/changes/§13.2-*, §36-*, a1-closeout, a2-1, a2-2, a2-reachability-solver-scoping, a-2-8-* — closed dispatch records
- docs/changes/a3-auth-graph-scoping/ — A-3 all sub-phases closed S91
- docs/changes/a-4-2-* through a-4-7-* — A-4 sub-phase dispatch records (all closed S91)
- docs/changes/a-5-1-* through a-5-5-* — A-5 sub-phase dispatch records (all closed S92)
- docs/changes/m-7c-d-12-runtime-sentinel-scoping/ — M-7C-D-12 completed S90
- docs/changes/03-contact-book-auth-redirect-SCOPING/ + 03-contact-book-auth-redirect/ — closed dispatch record
- docs/changes/null-eradication-*, undefined-eradication-*, stdlib-phase-1-5-null-sweep — closed dispatch records
- docs/changes/wave-4-*, v0next-inventory/ — closed or current inventory
- docs/changelog.md, docs/PA-SCRML-PRIMER.md, docs/tutorial.md, docs/lin.md, docs/external-js.md — reference docs, compliant
- docs/website/v0.3.0-announce-2026-05-14.md, docs/website/roadmap-from-v0.3-2026-05-14.md — release announcements, compliant
- docs/pinned-discussions/w-program-001-warning-scope.md — pinned decision record, compliant
- DESIGN.md, README.md, scrmlFormula.md, pa.md, master-list.md — live project documents, compliant
- examples/, e2e/, samples/, benchmarks/, lsp/, editors/, scripts/ READMEs — operational docs, compliant
- compiler/src/codegen/README.md, compiler/tests/ READMEs — test fixtures docs, compliant
- docs/changes/m1-1-native-lexer-skeleton/, m1-2-strings-and-templates/ — closed dispatch records, match code ✓
- docs/changes/combined-lint-additions-s98/ — S98 lint dispatch records, match code ✓
- docs/changes/s100-tailwind-engine-extension/ — §26.6 typography dispatch, matches tailwind-classes.js ✓
- docs/changes/mpa-entity-decoding-fix/ — $& injection fix dispatch, matches codegen/index.ts ✓
- docs/changes/heads-up-s95-bugs/ — S95 bug catalog and progress; closed items match code ✓
- docs/changes/perf-characterization/ — S94 perf characterization baseline; historical data ✓
- benchmarks/RESULTS.md — benchmark results record, compliant ✓

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s103 #v0.3.3 #pgo-scoping-stale #formFor-scoping-stale

## Links
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [primary.map.md](./primary.map.md)
