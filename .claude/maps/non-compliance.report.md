# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-19T12:00:00-06:00
# scan mode: INCREMENTAL_UPDATE (S105 / post-v0.3.3 era — commit d8427f2)
# prior baseline: 2026-05-18 @ 84c736e (S103 / v0.3.3 era)

## Summary

Total docs scanned: ~185 (prior ~175 + ~10 new docs from S104-S105 wave: schemaFor-scoping + schemaFor design deep-dive at scrml-support; runtime-perf-phase-3-partial-update-and-swap SCOPING; runtime-perf-phase-3-select-row SCOPING; tableFor-scoping + tableFor design deep-dive at scrml-support; phase-3.B Q-OPEN ratifications)
Compliant: ~180
Non-compliant: 2 (both fixed at this refresh — runtime-perf SCOPING status flip + §48.6.4 SPEC text)
Uncertain: 1 (predicate-gaps-deep-dive-prep — unchanged from S103)

---

## Non-compliant docs (fixed in this refresh)

### docs/changes/runtime-perf-scoping/SCOPING.md — FIXED

**Reason:** content-heuristic — top-level status was "SCOPE OPEN — Phase 1 (instrumentation + vanilla-JS baseline + re-measurement) dispatch-ready; Phase 2 + 3 sequenced after data lands" but Phase 1 (Playwright bench port) SHIPPED S103 (`129fcbe`); Phase 2 attribution + Phase 3 select-row chip-away ALSO SHIPPED S103 (`91fcc72` Candidate A + `47d3bb8` `!=` extension; -98% wall; 561× Chrome recovery).

**Disposition (S105 this refresh):** Status field updated to "SCOPE CLOSED — Phase 1 SHIPPED S103 `129fcbe`; Phase 2 attribution + Phase 3 select-row chip-away SHIPPED S103 (`91fcc72` + `47d3bb8`; -98% wall; 561× Chrome). Phase 3.B partial-update + swap-rows scoped at sibling SCOPING `docs/changes/runtime-perf-phase-3-partial-update-and-swap/`; Q-RT3B-OPEN-1..5 ratified S105."

### compiler/SPEC.md §48.6.4 — FIXED

**Reason:** content-heuristic — three sentences in §48.6.4 (line 4974 cross-ref + line 20490 Implementation status paragraph + line 20594 normative bullet) all said "parser recognition of `pinned fn` is implementation-pending" — but parser recognition SHIPPED at `dc3c460` (S105) AND SYM PASS 19 forward-ref enforcement SHIPPED at `7910162` (S105).

**Disposition (S105 this refresh):**
- Line 4974: "parser-recognition implementation-pending" → "parser recognition + symbol-table forward-ref enforcement SHIPPED S105 — commits `dc3c460` + `7910162`"
- Line 20490: "Implementation status (2026-05-17):" paragraph rewritten to document SHIPPED state with both commit SHAs + AST field name + SYM PASS 19 + 30 unit tests
- Line 20594: "Added 2026-05-17 (S98)" + "implementation-pending" → "Added 2026-05-17 (S98); SHIPPED 2026-05-19 (S105)" + "Parser recognition + symbol-table forward-ref enforcement SHIPPED S105 (commits `dc3c460` parser + `7910162` symbol-table). 30 unit tests."

---

## Uncertain docs (unchanged from S103)

### docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md

**Reason:** content-heuristic — status "SCOPE PREPARED — awaits convener authorization to fire deep-dive (when corpus signal warrants)"; trigger conditions may still be unmet.

**What to check:** Has the deep-dive been authorized? If trigger conditions remain unmet, deref to scrml-support/archive/ if no active dispatch planned.

---

## S104-S105 Changes vs S103 Baseline

**New compliant docs added S104-S105:**
- docs/changes/schemaFor-scoping/SCOPING.md — closed S104 with SCOPE-CLOSED footer (schemaFor SHIPPED `8a6cd85`) ✓
- docs/changes/tableFor-scoping/SCOPING.md — closed S105 with SCOPE-CLOSED footer (tableFor SHIPPED `1fdeef8`) ✓
- docs/changes/runtime-perf-phase-3-select-row/SCOPING.md — closed S103 (Phase 3 select-row chip-away SHIPPED `91fcc72`+`47d3bb8`) ✓
- docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md — active S104; Q-RT3B-OPEN-1..5 ratified S105 inside; SCOPE OPEN — B2/B4 unblocked for S106 dispatch ✓
- SPEC-INDEX.md — updated S104 + S105 (§41.15 schemaFor + §41.16 tableFor + Quick Lookup entries); authoritative spec index, compliant ✓
- compiler/SPEC.md — updated S104 (§41.15 schemaFor +~170L + 8 E-SCHEMAFOR-* rows) + S105 (§41.16 tableFor +~210L + 13 E-TABLEFOR-* rows + §53.14.3 row flip + §53.14.5 list extension); authoritative spec, compliant after this refresh's §48.6.4 fix ✓
- docs/changelog.md — updated S104 + S105 entries; current, compliant ✓
- master-list.md — updated S104 + S105 close addenda; current, compliant ✓
- README.md — updated S105 (`75ae8c5` runtime benchmarks refresh + dangling sixth-variant fix + match-tier-ladder context); current, compliant ✓

**S104 deref pass (5 items moved to scrml-support/archive/):**
- docs/articles/llm-kickstarter-v0-2026-04-25.md — DELETED (was non-compliant S103; archive copy at scrml-support/archive/articles-skipped/ from S79 sweep) ✓
- docs/changes/undefined-eradication-self-host/SUPERSEDED-CLOSURE.md — DEREFFED to scrml-support/archive/changes/ ✓
- docs/changes/wave-4-adopter-content/SCOPING.md — DEREFFED ✓
- docs/changes/promotion-ergonomics/TIER-C-SCOPE.md — DEREFFED ✓
- docs/changes/v0.3-approach-a-impl/SCOPING.md — DEREFFED ✓

**S103 non-compliant items now compliant (status updated):**
- docs/changes/pgo-scoping/SCOPING.md — status flipped to "SCOPE CLOSED" S104 carry ✓
- docs/changes/pgo-phase-2-scoping/SCOPING.md — status flipped to "SCOPE CLOSED" S104 carry ✓
- docs/changes/pgo-phase-3-scoping/SCOPING.md — status flipped to "SCOPE CLOSED" S104 carry ✓
- docs/changes/formFor-scoping/SCOPING.md — status flipped to "SCOPE CLOSED" S104 carry ✓
- docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md — status flipped to "CLOSED" S104 carry ✓

---

## Compliant (no action needed)

The following categories were scanned and found compliant:
- compiler/SPEC.md (post-S105 §48.6.4 fix), compiler/SPEC-INDEX.md, compiler/PIPELINE.md (v0.7.2) — authoritative specs, current
- compiler/native-parser/README.md — M1.4 + M1.5 template-mode status consistent with code
- docs/articles/* (15 articles) — devto content; articles-currency-table + VERIFIED.md confirm status
- docs/audits/* — dated audit snapshots, compliant as historical records
- docs/changes/runtime-perf-scoping/SCOPING.md (post-S105 status flip) — closed SCOPING ✓
- docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md — active SCOPING (B2/B4 unblocked for S106) ✓
- docs/changes/§13.2-*, §36-*, a1-closeout, a2-1, a2-2, a2-reachability-solver-scoping, a-2-8-* — closed dispatch records
- docs/changes/a3-auth-graph-scoping/ — A-3 all sub-phases closed S91
- docs/changes/a-4-2-* through a-4-7-* — A-4 sub-phase dispatch records (all closed S91)
- docs/changes/a-5-1-* through a-5-5-* — A-5 sub-phase dispatch records (all closed S92)
- docs/changes/m-7c-d-12-runtime-sentinel-scoping/ — M-7C-D-12 completed S90
- docs/changes/03-contact-book-auth-redirect-SCOPING/ + 03-contact-book-auth-redirect/ — closed dispatch record
- docs/changes/null-eradication-*, undefined-eradication-* (post-derefs S104), stdlib-phase-1-5-null-sweep — closed dispatch records
- docs/changes/wave-4-*, v0next-inventory/ — closed or current inventory (post-S104 derefs)
- docs/changelog.md, docs/PA-SCRML-PRIMER.md, docs/tutorial.md, docs/lin.md, docs/external-js.md — reference docs, compliant
- docs/website/v0.3.0-announce-2026-05-14.md, docs/website/roadmap-from-v0.3-2026-05-14.md — release announcements, compliant
- docs/pinned-discussions/w-program-001-warning-scope.md — pinned decision record, compliant
- DESIGN.md, README.md (post-S105 refresh), scrmlFormula.md, pa.md, master-list.md — live project documents, compliant
- examples/, e2e/, samples/, benchmarks/, lsp/, editors/, scripts/ READMEs — operational docs, compliant
- compiler/src/codegen/README.md, compiler/tests/ READMEs — test fixtures docs, compliant
- docs/changes/m1-1-native-lexer-skeleton/, m1-2-strings-and-templates/, m1-3-comments/, m1-4-regex/, m1-5-template-mode/ — closed dispatch records, match code ✓
- docs/changes/combined-lint-additions-s98/ — S98 lint dispatch records, match code ✓
- docs/changes/s100-tailwind-engine-extension/ — §26.6 typography dispatch, matches tailwind-classes.js ✓
- docs/changes/mpa-entity-decoding-fix/ — $& injection fix dispatch, matches codegen/index.ts ✓
- docs/changes/heads-up-s95-bugs/ — S95 bug catalog and progress; closed items match code ✓
- docs/changes/perf-characterization/ — S94 perf characterization baseline; historical data ✓
- benchmarks/RESULTS.md — benchmark results record (S103 Playwright update + S105 README refresh), compliant ✓

## Note on INDEX.md staleness

`.claude/maps/INDEX.md` is stale (still shows S88 close at `9b98118`; test count 11,912). It's a navigation-alias stub that defers to `primary.map.md` for substantive content; not load-bearing for any agent dispatch. Carry-forward: refresh in a future maps sweep if Quick Map List ever grows divergent.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s105 #v0.3.3 #runtime-perf-scoping-FIXED #spec-48-6-4-FIXED #pinned-fn-shipped #tablefor-SHIPPED #schemafor-SHIPPED

## Links
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [primary.map.md](./primary.map.md)
