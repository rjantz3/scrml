# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-14T16:19:26-06:00
# scan mode: INCREMENTAL_UPDATE (S92 / v0.3.0 STABLE — commit 13154ba)
# prior baseline: 2026-05-14 @ b28f493 (S91 close)

## Summary

Total docs scanned: ~147 (prior 137 + ~10 new docs from S92 wave: A-5 dispatch records, v0.3.0-announce, changelog update)
Compliant: ~141
Non-compliant: 4 (same 4 carried unchanged from S91)
Uncertain: 3 (same 3 carried from S91; A-4 SCOPING status line still "DRAFT" — not yet updated in-file)

---

## Non-compliant docs (unchanged from S91)

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
**Reason:** parent scoping for "Approach A impl" — A-1 through A-5 ALL CLOSED at S92 (v0.3.0 STABLE). This SCOPING may now be fully superseded.
**What to check:** Confirm whether this is still authoritative for any remaining work. If all sub-waves closed, note in-file as CLOSED or deref to archive.

### docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md
**Reason:** content-heuristic — top-level status line reads "Status: DRAFT — awaits PA + user OQ disposition before any A-4.* sub-phase dispatches." A-4 is FULLY CLOSED at S91 (A-4.1..A-4.7 all committed). The SCOPING body contains historical OQ dispositions and is now a post-hoc record.
**What to check:** Update status to CLOSED in-file header, or confirm PA has already noted it as a historical record to preserve.

---

## S92 Changes vs S91 Baseline

**New docs added S92 — all compliant:**
- docs/website/v0.3.0-announce-2026-05-14.md — v0.3.0 release announcement, compliant ✓
- docs/changelog.md updated — release notes for v0.3.0, compliant ✓
- docs/changes/a-5-*/ dispatch records (A-5.1..A-5.5) — closed dispatch records, implementations match code ✓
- examples/README.md, DESIGN.md, README.md updated — adopter-facing content, compliant ✓
- master-list.md updated — current project state, compliant ✓

**No new non-compliant docs at S92.** The 4 non-compliant docs carried from S91 are unchanged. Uncertain count unchanged at 3 (v0.3-approach-a-impl/SCOPING.md now more clearly superseded with A-5 closed — human review still warranted before deref).

---

## Compliant (no action needed)

The following categories were scanned and found compliant:
- compiler/SPEC.md, compiler/SPEC-INDEX.md, compiler/PIPELINE.md — authoritative specs, current
- docs/articles/* (15 articles) — devto content; articles-currency-table + VERIFIED.md confirm status
- docs/audits/* — dated audit snapshots, compliant as historical records
- docs/changes/§13.2-*, §36-*, a1-closeout, a2-1, a2-2, a2-reachability-solver-scoping, a-2-8-* — closed dispatch records
- docs/changes/a3-auth-graph-scoping/ — A-3 all sub-phases closed S91
- docs/changes/a-4-2-* through a-4-7-* — A-4 sub-phase dispatch records (all closed S91)
- docs/changes/a-5-1-* through a-5-5-* — A-5 sub-phase dispatch records (all closed S92)
- docs/changes/m-7c-d-12-runtime-sentinel-scoping/ — M-7C-D-12 completed S90
- docs/changes/03-contact-book-auth-redirect-SCOPING/ + 03-contact-book-auth-redirect/ — closed dispatch record
- docs/changes/null-eradication-*, undefined-eradication-*, stdlib-phase-1-5-null-sweep — closed dispatch records
- docs/changes/wave-4-*, v0next-inventory/ — closed or current inventory
- docs/changelog.md, docs/PA-SCRML-PRIMER.md, docs/tutorial.md, docs/lin.md, docs/external-js.md — reference docs, compliant
- docs/website/v0.3.0-announce-2026-05-14.md — release announcement, compliant
- docs/pinned-discussions/w-program-001-warning-scope.md — pinned decision record, compliant
- DESIGN.md, README.md, scrmlFormula.md, pa.md, master-list.md, hand-off.md — live project documents, compliant
- examples/, e2e/, samples/, benchmarks/, lsp/, editors/, scripts/ READMEs — operational docs, compliant
- compiler/src/codegen/README.md, compiler/tests/ READMEs — test fixtures docs, compliant

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s92 #v0.3.0

## Links
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [primary.map.md](./primary.map.md)
