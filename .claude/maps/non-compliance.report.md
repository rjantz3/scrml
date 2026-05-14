# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-14
# scan mode: FULL_COLD_START (S91 close — commit b28f493)
# prior baseline: 2026-05-14T00:37:04Z @ ff9be0e (S90 close)

## Summary

Total docs scanned: 137 (excluding node_modules, .git, .claude, handOffs/, dist/, build/)
Compliant: 131
Non-compliant: 4 (same 3 carried from S90 + 0 new violations added at S91)
Uncertain: 3 (same 2 carried from S90 + 1 new: a-4-per-route-artifact-splitter-SCOPING/SCOPING.md)

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
**Detail:** Status "SCOPED — queued, not yet dispatched" from S66. `W-MATCH-TRANSITIONS-ACCRUING` found ONLY in promote.js error console message (not a fire-site). `--engine` flag not found in compiler/src. Nearly a year old relative to current HEAD.
**Suggested disposition:** Verify if deferred indefinitely; if so, deref to scrml-support/archive/

---

## Uncertain docs (needs human review)

### docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md
**Reason:** content-heuristic — status "SCOPE PREPARED — awaits convener authorization to fire deep-dive (when corpus signal warrants)"; trigger conditions may still be unmet.
**What to check:** Has the deep-dive been authorized? If trigger conditions remain unmet, deref to scrml-support/archive/ if no active dispatch planned.

### docs/changes/v0.3-approach-a-impl/SCOPING.md
**Reason:** parent scoping for "Approach A impl" — may be superseded now that A-1 CLOSED (S89), A-2 FULLY CLOSED (S91), A-3 FULLY CLOSED (S91), A-4 FULLY CLOSED (S91).
**What to check:** Is this SCOPING still the living authority for A-5, or has authority fully transferred to the sub-wave SCOPING docs? If superseded, note in-file or deref.

### docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md
**Reason:** content-heuristic — top-level status line reads "Status: DRAFT — awaits PA + user OQ disposition before any A-4.* sub-phase dispatches." A-4 is FULLY CLOSED at S91 (A-4.1..A-4.7 all committed). The SCOPING body contains historical OQ dispositions and is now a post-hoc record.
**What to check:** Update status to CLOSED in-file header, or confirm PA has already noted it as a historical record to preserve (active dispatch docs are not required to be pruned — but the "DRAFT" status is misleading).

---

## S91 Changes vs S90 Baseline

**New docs added S91 — all compliant:**
- docs/changes/a-4-2-initial-chunk-emission/BRIEF.md + progress.md — A-4.2 dispatch record; implementation matches code ✓
- docs/changes/a-4-3-tier-1-idle-prefetch/BRIEF.md + progress.md — A-4.3 dispatch record ✓
- docs/changes/a-4-4-tier-2-hover-prefetch/BRIEF.md + progress.md — A-4.4 dispatch record ✓
- docs/changes/a-4-5-tier-n-on-demand/BRIEF.md + progress.md — A-4.5 dispatch record ✓
- docs/changes/a-4-6-content-addressing/BRIEF.md + progress.md — A-4.6 dispatch record ✓
- docs/changes/a-4-7-per-route-html-augmentation/BRIEF.md + progress.md — A-4.7 dispatch record ✓
- docs/changes/03-contact-book-auth-redirect-SCOPING/SCOPING.md + progress.md — 03-contact-book bug dispatch record ✓
- docs/changes/a-2-8-emit-reachability-canonical/BRIEF.md + progress.md — A-2.8 dispatch record ✓

**No new non-compliant docs at S91.** The 4 non-compliant docs carried from S90 are unchanged. One new uncertain added (a-4-per-route-artifact-splitter-SCOPING status line).

---

## Compliant (no action needed)

The following categories were scanned and found compliant:
- compiler/SPEC.md, compiler/SPEC-INDEX.md, compiler/PIPELINE.md — authoritative specs, current
- docs/articles/* (15 articles) — devto content; articles-currency-table + VERIFIED.md confirm status
- docs/audits/* (null-audit, undefined-audit, articles-currency-table, happy-dom-perf, self-host-spec-conformance, scope-c-findings-tracker, wave-3-7-corpus-ouroboros) — dated audit snapshots, compliant as historical records
- docs/changes/§13.2-*, §36-*, a1-closeout, a2-1, a2-2, a2-reachability-solver-scoping, a-2-8-* — closed dispatch records
- docs/changes/a3-auth-graph-scoping/ — A-3 all sub-phases closed S91; SCOPING + progress match code
- docs/changes/a-4-2-* through a-4-7-* — A-4 sub-phase dispatch records (all closed S91); implementations match source
- docs/changes/a-4-per-route-artifact-splitter-SCOPING/progress.md — progress log compliant (SCOPING.md itself flagged as uncertain above)
- docs/changes/m-7c-d-12-runtime-sentinel-scoping/ — M-7C-D-12 implementation completed S90; closed dispatch record
- docs/changes/03-contact-book-auth-redirect-SCOPING/ + 03-contact-book-auth-redirect/ — closed dispatch record
- docs/changes/null-eradication-*, undefined-eradication-*, stdlib-phase-1-5-null-sweep — closed dispatch records
- docs/changes/w-try-catch-lint, fix-lift-async-iife-paren, phase-3a-async-jwt, todomvc-edit-mode-landing — closed dispatch records
- docs/changes/wave-4-t-track, wave-4-d-track, wave-4-adopter-content-scoping — Wave 4 execution records
- docs/changes/wave-3-7-audit, wave-3-7-backlog-migration, v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md
- docs/changelog.md, docs/PA-SCRML-PRIMER.md, docs/tutorial.md, docs/lin.md, docs/external-js.md — reference docs, compliant
- docs/pinned-discussions/w-program-001-warning-scope.md — pinned decision record, compliant
- docs/curation/2026-05-05-changes-dir-disposition.md — curation record, compliant
- docs/website/v0.2.0-announce-2026-05-05.md — historic announcement stub, compliant
- DESIGN.md, README.md, scrmlFormula.md, pa.md, master-list.md, hand-off.md — live project documents, compliant
- examples/, e2e/, samples/, benchmarks/, lsp/, editors/, scripts/ READMEs — operational docs, compliant
- compiler/src/codegen/README.md, compiler/tests/ READMEs — test fixtures docs, compliant

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s91

## Links
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [primary.map.md](./primary.map.md)
