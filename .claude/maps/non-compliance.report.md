# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-11T17:00:00Z
# scan mode: INCREMENTAL_UPDATE (S81 close — commit b6c8e1c)
# prior baseline: 2026-05-10T19:30:00Z @ f182f44 (S78 FULL_COLD_START)

## Summary

Total docs scanned: ~330 (incremental delta from S78 baseline; ~3 new docs in docs/audits/)
Carry-forward non-compliant items: 14 (unchanged disposition from S78 baseline)
NEW non-compliant since S78: 4 items + 1 known-drift register + 1 uncertain
Uncertain (S78 carry-forwards): 7, plus 1 NEW

## NEW non-compliant items (S79-S81)

### docs/changes/a5-7-tests-samples/INVENTORY.md
**Reason:** content-heuristic — A5-7 sub-phase fully SHIPPED S80 (engine-005…engine-008 landed). Doc explicitly marks F1/F1a/F1b/F2/F3/F3a as "Codegen landed S77/S79" and ships sample family at S80. Now post-hoc inventory.
**Suggested disposition:** archive parent dir `docs/changes/a5-7-tests-samples/` to `scrml-support/archive/dispatches/`.

### docs/changes/debounce-throttle-approach-b/progress.md
**Reason:** content-heuristic — Approach B SHIPPED S79 (clean-cut deletion of `reactive-debounced-decl` AST kind + canonical `<x debounced=Nms>` per §6.13). All 4 OQs closed in-dispatch. Dispatch dir is historical.
**Suggested disposition:** archive to `scrml-support/archive/dispatches/`.

### docs/audits/hardcoded-thresholds-2026-05-10.md
**Reason:** content-heuristic — S78 audit; Buckets A+B+C all SHIPPED S79; §7 caveat addressed by 2026-05-11 follow-up which drove S81 F.1/F.2 ship. No remaining open work.
**Suggested disposition:** move to `scrml-support/archive/audits/` once master-list.md confirms zero open follow-on items.

### docs/audits/hardcoded-thresholds-followup-2026-05-11.md
**Reason:** content-heuristic — drove S81 F.1/F.2; both SHIPPED at `ab980c0`. Now post-hoc.
**Suggested disposition:** move to `scrml-support/archive/audits/` after S81 wrap dispatch sequence completes.

### Known-drift register (do NOT touch per pa.md Rule 1)

**`docs/articles/realtime-and-workers-as-syntax-devto-2026-04-29.md:200`** — line reads `<channel protect=>` which was renamed to `<channel auth=>` at S80. Per pa.md Rule 1 (no marketing-shaped work unless Bryan brings it up) AND because published dev.to articles are immutable historical records, **this is flagged as known-drift, NOT a violation to fix.** If a future re-publish happens (separate Bryan-raised thread), update at that time.

Other `protect=` references in articles/tutorial verified to be on the persisting hosts (`<db protect=>` / `<Type protect=>`) — STILL CURRENT, not stale.

## Uncertain (NEW since S78)

### docs/audits/self-host-spec-conformance-2026-05-11.md
**Reason:** explicitly self-declares "filed for future scope; NOT current-cycle work" with S81 user direction quoted. By the project-mapper rule this is the "aspirational / planning" class that should live in scrml-support. BUT: the rebuild script HAS been gated (S81 ship), so the audit-as-driver function is complete; only the source-side sweep is deferred.
**Suggested disposition:** keep in `docs/audits/` until the source-side sweep is either scheduled or formally declined; if declined → archive to `scrml-support/archive/audits/`. Lower priority than dispatch-dir archival.

## Carry-forwards from S78 baseline (UNCHANGED)

All 14 items + 7 uncertain in the prior FULL_COLD_START report remain as flagged. No movement detected since S78 close. Original findings preserved below for reference.

---

## Non-compliant docs (S78 cold-start baseline — preserved verbatim)

### docs/articles/lsp-and-giti-advantages-draft-2026-04-25.md
**Reason:** name-heuristic (`-draft-` in filename); superseded (CARRY-FORWARD)
**Detail:** Published version at `docs/articles/lsp-and-giti-advantages-devto-2026-04-28.md`. Draft also references `BPP` as a live pipeline stage; PIPELINE.md v0.6.0+ removed BPP.
**Suggested disposition:** deref to `scrml-support/archive/articles/` or delete.

### docs/articles/npm-myth-draft-2026-04-25.md
**Reason:** name-heuristic (`-draft-` in filename); superseded (CARRY-FORWARD)
**Detail:** Published version at `docs/articles/npm-myth-devto-2026-04-28.md`.
**Suggested disposition:** deref to `scrml-support/archive/articles/` or delete.

### docs/deep-dives/ (3 files)
**Reason:** location — deep-dives belong in scrml-support per project-mapper rules (CARRY-FORWARD)
**Files:**
- docs/deep-dives/boundary-security-indirect-refs-2026-04-24.md
- docs/deep-dives/boundary-security-progress.md
- docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md
**Suggested disposition:** deref to `scrml-support/docs/deep-dives/`.

### benchmarks/fullstack-react/CLAUDE.md
**Reason:** name-heuristic + location (CARRY-FORWARD)
**Detail:** CLAUDE.md is an agent-instruction file; anomalous inside a benchmark subdir.
**Suggested disposition:** delete.

### docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md
**Reason:** content-heuristic — self-declares "SUPERSEDED" in header (CARRY-FORWARD)
**Detail:** Doc explicitly states superseded by master-list.md §0 live dashboard. A7/A8 ratified S67, A5-1 LANDED S68, A1b COMPLETE S69, A1c+A7+A10 now shipped at S78. None reflected here.
**Suggested disposition:** deref to `scrml-support/archive/dispatches/v0next-spec-impact/`.

### docs/changes/reactive-derived-decl-divergence/ADR.md
**Reason:** location — ADR files belong in scrml-support (CARRY-FORWARD)
**Detail:** ADR on reactive vs derived decl divergence. Decision is locked and COMPLETE (S59 rename to `kind: "state-decl"` SHIPPED). Historical rationale, not current truth.
**Suggested disposition:** deref to `scrml-support/docs/adrs/`.

### docs/audits/a1b-b11-rule4-audit through a1b-b17-rule4-audit (7 files, all 2026-05-07)
**Reason:** content-heuristic — all work SHIPPED (S68); audits are now post-hoc historical records (CARRY-FORWARD from S69 report upgrade)
**Detail:** B11-B17 all SHIPPED S68. At S69 close these were upgraded from "forward-audit records" (compliant) to "historical records" (non-compliant). Status unchanged at S78.
**Suggested disposition:** Move to `scrml-support/archive/dispatches/` alongside B11-B17 dispatch dirs, OR keep as historical records in `docs/audits/`. Lower priority than dispatch dirs.

### docs/changes/ — SHIPPED dispatch directories (large batch)
**Reason:** location + completed-work-as-current (CARRY-FORWARD + S70-S78 additions)
**Detail:** All of the following SHIPPED/LANDED/CLOSED dispatch dirs should move to `scrml-support/archive/dispatches/`. Categories:

**A1a (all COMPLETE at S61):** All phase-a1a-step-* dirs (20 sub-steps), phase-4d-completion-sweep/, phase-a1a-lex-parse/

**Pre-S67 A1b (LANDED S63-S66):** stage-0c.a-overload-deletion/, parsevariant-impl/, a-plus-verdict-execution/, ast-builder-grammar-fixes/, api-js-stdlib-enum-reexport/, phase-a1b-step-b1-* through phase-a1b-step-b6-*

**S67 A1b (SHIPPED S67):** phase-a1b-step-b7-*, phase-a1b-step-b8-*, phase-a1b-step-b9-*

**S68 A1b (SHIPPED S68):** phase-a1b-step-b11-* through phase-a1b-step-b17-* (7 steps)

**S69 A1b (SHIPPED S69):** phase-a1b-step-b18-* through phase-a1b-step-b22-* (5 steps)

**S70-S74 A1c (SHIPPED S70-S74):** phase-a1c-step-c0-* through phase-a1c-step-c9-*, plus phase-a1c-step-b17-4-codegen-ontransition-effect, phase-b14-pass10b-pathshape-fix, phase-ts-state-child-rule-recognition

**S75-S78 A1c (SHIPPED S75-S78):** phase-a1c-step-c10-* through phase-a1c-step-c23-*, plus parallel-close-2026-05-08, a9-ext4-s4-wiring-2026-05-08

**S77 A7 (SHIPPED S77):** phase-a7-step-a5-2-*, phase-a7-step-a5-3-*, phase-a7-step-a5-4-5-*, phase-a7-step-a5-5b-*, phase-a7-step-a5-6-item-g-*

**S77 A8 (SHIPPED S77):** phase-a8-step-a6-1-* through phase-a8-step-a6-4-*, phase-a9-ext5-idempotency-storage/

**S78 A10 (SHIPPED S78):** phase-a10-engine-state-child-body-render/ — NEWLY shipped, now ready for archiving

**S78 server-keyword-deprecation (SHIPPED S78):** server-keyword-deprecation-batch-1-2026-05-08/, server-keyword-deprecation-batch-2-2026-05-08/

**Suggested disposition:** Run the PA's pending disposition (per curation matrix). Move all SHIPPED/LANDED/CLOSED dirs to `scrml-support/archive/dispatches/`.

### docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md
**Reason:** content-heuristic — B18-B22 all SHIPPED S69; audit is now post-hoc historical record (upgraded from compliant-historical at S69)
**Detail:** Same disposal path as B11-B17 audit batch above.
**Suggested disposition:** Move to scrml-support/archive/ alongside B18-B22 dispatch dirs.

## Uncertain docs (needs human review)

### docs/audits/spec-conformance-2026-05-10.md and test-conformance-2026-05-10.md
**Reason:** uncertain — very recently created (2026-05-10 same date as S78); could be ongoing audit artifacts or historical records
**What to check:** Is either of these still actively driving work, or are they point-in-time snapshots? If the latter, deref to scrml-support/archive/audits/ after master-list is updated with their conclusions.

### docs/audits/hardcoded-thresholds-2026-05-10.md
**Reason:** uncertain — new at S78; references 12 hardcoded threshold findings with 2 refactor-priority items
**What to check:** Are the 2 refactor-priority items tracked in master-list.md? If yes and they have open OQs/tickets, audit is a current planning doc (keep). If findings are captured elsewhere, deref to scrml-support/archive/.

### docs/audits/scope-c-stage-1-2026-04-25.md and scope-c-stage-1-sample-classification.md
**Reason:** age — dated 2026-04-25 (CARRY-FORWARD)
**What to check:** Is scope-c stage-1 still the active audit baseline, or superseded by A1b COMPLETE (S69) + A1c SHIPPED (S70-S78)? If superseded, deref to scrml-support/archive/.

### docs/audits/kickstarter-v0-verification-matrix.md
**Reason:** age — references kickstarter-v0; v2 exists (CARRY-FORWARD)
**What to check:** Has kickstarter-v0 been fully retired? If yes, deref. If matrix drives a live verification gate, mark current and update header.

### docs/recon/* (8 files, all 2026-04-29)
**Reason:** age + location (CARRY-FORWARD)
**What to check:** For each: was the recon target completed? Files: audit-remaining-phantoms, audit-spec-only-rows, compiler-dot-api-decision, lin-approach-b-verification, phase2-completion-status, phase2c-test-impact, tailwind-arbitrary-values-and-variants, tutorial-pass2-edit-list. If completed, deref to scrml-support/archive/recon/.

### docs/experiments/* (5 files, all 2026-04-25)
**Reason:** age + location (CARRY-FORWARD)
**What to check:** clueless-agent-* runs and SYNTHESIS/VALIDATION docs are research artefacts. If kickstarter-v0→v2 transition closed them, move to scrml-support/docs/experiments/.

### docs/changes/v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md
**Reason:** uncertain — describes A7/A8 scope now ratified and partly dispatched (CARRY-FORWARD)
**What to check:** A7 fully SHIPPED S77. Does master-list.md §A7 sub-steps capture all detail from this supplement? If yes, this is a dispatch artefact. If it has timelines/OQ-links not in master-list, keep until A7 follow-on dispatch briefs absorb it.

## Compliant (current, do not flag)

- `compiler/SPEC.md` — authoritative; PIPELINE.md v0.7.1 (2026-05-09). Compliant.
- `compiler/SPEC-INDEX.md` — generated artifact (`bash scripts/update-spec-index.sh`); stale is expected, not a doc-hygiene violation. Note: needs regeneration after D4 + A5-1.
- `compiler/PIPELINE.md` — v0.7.1 current. Compliant.
- `compiler/src/codegen/README.md` — codegen module overview. Compliant.
- `compiler/tests/conformance/s32-fn-state-machine/REGISTRY.md` — conformance registry. Compliant.
- `master-list.md` — current at S78 close. Compliant.
- `pa.md` — current at S78. Compliant.
- `docs/changelog.md` — current through S78. Compliant.
- `docs/PA-SCRML-PRIMER.md` — updated through A5-1. Compliant.
- `DESIGN.md`, `README.md` — project overview docs. Compliant.
- `docs/audits/scope-c-findings-tracker.md` — active tracking. Compliant.
- `docs/audits/a1c-roadmap-rule4-audit-2026-05-07.md` — A1c roadmap audit; A1c SHIPPED. Now historical. Lower priority.
- `docs/audits/item-c-temporal-engine-rule-migration-rule4-audit-2026-05-07.md` — A7 temporal surface audit; A7 SHIPPED S77. Historical record.
- `docs/audits/compiler-forgotten-surface-2026-05-06.md` — S64 historical. Compliant.
- `docs/changes/phase-a1b-resolve-type/` — status uncertain (may still be pending). Flagged as uncertain, not non-compliant.
- `docs/changes/predicate-gaps-deep-dive-prep/` — pending dispatch work; compliant.
- `docs/changes/promotion-ergonomics/` — Tier C pending; compliant.
- `docs/changes/v0next-audit/` — ongoing audit work; compliant.
- `docs/changes/v0next-inventory/` (excluding SCOPE-SUPPLEMENT — see uncertain) — compliant.
- `docs/articles/*-devto-*.md` (all published articles) — compliant.
- `docs/pinned-discussions/w-program-001-warning-scope.md` — compliant.
- `docs/curation/2026-05-05-changes-dir-disposition.md` — active curation doc. Compliant.
- `docs/changes/phase-a10-engine-state-child-body-render/{PHASE-0-SURVEY,SCOPE-AND-DECOMPOSITION,progress}.md` — SHIPPED S78; now ready for archiving (added to SHIPPED batch above).
- All `docs/changes/*/progress.md` files for SHIPPED dispatches — historical; move with parent dir.

## What changed since S69 baseline report

**New SHIPPED phases (S70-S78):**
- A1c codegen C0-C23 (all SHIPPED S70-S78, ~24 steps)
- A7 §51 temporal surface A5-2 through A5-6 (SHIPPED S77)
- A8 test-bind A6-1 through A6-4 (SHIPPED S77)
- A9 ext5 idempotency storage (SHIPPED)
- Phase A10 engine state-child body render (SHIPPED S78)
- server-keyword-deprecation batch-1 and batch-2 (SHIPPED S78)
- parallel-close, a9-ext4-s4-wiring (SHIPPED S78)

**New S78 audits:** test-conformance-2026-05-10.md, spec-conformance-2026-05-10.md, hardcoded-thresholds-2026-05-10.md — added to uncertain (too recent to classify).

**Carry-forwards unchanged:** article drafts, deep-dives location, CLAUDE.md, IMPLEMENTATION-ROADMAP, ADR, recon/*, experiments/*, kickstarter-v0-matrix, SCOPE-SUPPLEMENT.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s78 #phase-a10 #a1c-shipped #a7-shipped #a8-shipped

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support pa.md](../../../scrml-support/pa.md)
