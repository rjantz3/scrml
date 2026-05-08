# non-compliance.report.md
# project: scrmlTS
# generated: 2026-05-07T20:31:48Z
# scan mode: INCREMENTAL_UPDATE (S67 close — commit a4eed93)

## Summary

Total docs scanned: ~85 (top-3-depth `*.md` excluding `.git/`, `node_modules/`, `handOffs/`, `.claude/`, `dist/`, `build/`, `target/`)
Compliant:          ~65
Non-compliant:      9
Uncertain:          6

This S67 refresh adds the 16 new audit docs, 3 new docs/changes dispatch dirs (B7, B8, B9 — now SHIPPED), the SCOPE-SUPPLEMENT, docs/changelog.md state, and hand-off-67 as new items to assess. Items carried forward from the S66 report are marked.

## Non-compliant docs

### docs/articles/lsp-and-giti-advantages-draft-2026-04-25.md
**Reason:** name-heuristic (`-draft-` in filename) + superseded (CARRY-FORWARD from S66 report)
**Detail:** Published version exists at `docs/articles/lsp-and-giti-advantages-devto-2026-04-28.md`. Draft also references `BPP` as a live pipeline stage; PIPELINE.md v0.7.0 removed BPP.
**Suggested disposition:** deref to `scrml-support/archive/articles/` or delete.

### docs/articles/npm-myth-draft-2026-04-25.md
**Reason:** name-heuristic (`-draft-` in filename) + superseded (CARRY-FORWARD from S66 report)
**Detail:** Published version exists at `docs/articles/npm-myth-devto-2026-04-28.md`.
**Suggested disposition:** deref to `scrml-support/archive/articles/` or delete.

### docs/changes/ — completed dispatch dirs (CARRY-FORWARD + S67 additions)
**Reason:** location + completed-work-as-current
**Detail:** Per the S66 curation report `docs/curation/2026-05-05-changes-dir-disposition.md`. Dirs that describe completed-and-merged work belong in `scrml-support/archive/dispatches/`. At S67 close the following are SHIPPED/LANDED/CLOSED and accumulate in-tree:
- All `phase-a1a-step-*` dirs (20 sub-steps — COMPLETE at S61)
- `phase-4d-completion-sweep/` (DONE)
- `stage-0c.a-overload-deletion/` (LANDED S64)
- `parsevariant-impl/` (SHIPPED S65)
- `a-plus-verdict-execution/` (CLOSED S65)
- `ast-builder-grammar-fixes/` (LANDED S65)
- `api-js-stdlib-enum-reexport/` (LANDED S65)
- `phase-a1b-step-b1-symbol-table-extension/` (LANDED S63)
- `phase-a1b-step-b2-name-collides-state/` (LANDED S64)
- `phase-a1b-step-b3-name-resolution/` (LANDED S65)
- `phase-a1b-step-b5-cell-classifier/` (LANDED S65)
- `phase-a1b-step-b4-import-pinned-cycles/` (SHIPPED S66)
- `phase-a1b-step-b6-render-by-tag/` (SHIPPED S66)
- **NEW S67:** `phase-a1b-step-b7-derived-dep-tracking/` (SHIPPED S67 a4eed93)
- **NEW S67:** `phase-a1b-step-b8-l21-walker/` (SHIPPED S67 a4eed93)
- **NEW S67:** `phase-a1b-step-b9-validator-arg-exprnode/` (SHIPPED S67 a4eed93)
Compliant (still active): `phase-a1b-resolve-type/`, `phase-a1c-codegen/`, `promotion-ergonomics/` (Tier C still pending), `v0next-inventory/`, `v0next-spec-impact/`, `v0next-audit/`, `predicate-gaps-deep-dive-prep/`, `reactive-derived-decl-divergence/`.
**Suggested disposition:** Run the PA's pending disposition (per curation matrix). Move all SHIPPED/LANDED/CLOSED dirs to `scrml-support/archive/dispatches/`.

### docs/deep-dives/boundary-security-indirect-refs-2026-04-24.md
**Reason:** location (deep-dive belongs in scrml-support per project-mapper rules) (CARRY-FORWARD)
**Detail:** Three deep-dive files remain in `docs/deep-dives/`. Project-mapper rules: "Deep-dives, debates, ADRs (they belong in scrml-support)."
**Suggested disposition:** deref to `scrml-support/docs/deep-dives/`.

### docs/deep-dives/boundary-security-progress.md
**Reason:** location (same as above) (CARRY-FORWARD)
**Suggested disposition:** deref to `scrml-support/docs/deep-dives/`.

### docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md
**Reason:** location (same as above) (CARRY-FORWARD)
**Suggested disposition:** deref to `scrml-support/docs/deep-dives/`.

### benchmarks/fullstack-react/CLAUDE.md
**Reason:** name-heuristic + location (CARRY-FORWARD)
**Detail:** `CLAUDE.md` files are agent-instruction files; content is boilerplate ("Default to using Bun instead of Node.js."). Anomalous inside a benchmark subdir.
**Suggested disposition:** delete.

### docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md
**Reason:** content-heuristic — self-declares "SUPERSEDED" in header; describes aspirational Phase A1-A4 / B1-B4 structure that predates master-list.md §0 live dashboard.
**Detail:** First line: "**Status:** DRAFT (S57, 2026-05-04) — **SUPERSEDED by `master-list.md` §0 live dashboard + `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md`. Read for historical context only.**" Doc explicitly self-identifies as superseded. Live state is in master-list.md. A7/A8 ratified at S67 were added to master-list, not here.
**Suggested disposition:** deref to `scrml-support/archive/dispatches/v0next-spec-impact/` alongside the other Stage 0b artefacts.

### docs/changes/reactive-derived-decl-divergence/ADR.md
**Reason:** location — ADR files belong in scrml-support per project-mapper rules ("Deep-dives, debates, ADRs (they belong in scrml-support)").
**Detail:** ADR on reactive vs derived decl divergence. Decision is locked (S59 rename to `kind: "state-decl"` SHIPPED). ADR is historical rationale, not current truth.
**Suggested disposition:** deref to `scrml-support/docs/adrs/` or `scrml-support/archive/`.

## Uncertain docs (needs human review)

### docs/audits/scope-c-stage-1-2026-04-25.md
**Reason:** age — dated 2026-04-25 (CARRY-FORWARD from S66 report)
**What to check:** Confirm whether scope-c stage-1 is still the active audit baseline or superseded. If superseded, deref to scrml-support/archive/.

### docs/audits/scope-c-stage-1-sample-classification.md
**Reason:** age — companion to above (CARRY-FORWARD)
**What to check:** Same as above.

### docs/audits/kickstarter-v0-verification-matrix.md
**Reason:** age — references kickstarter-v0; v2 article exists (CARRY-FORWARD)
**What to check:** Has v0 been retired? If so, deref. If matrix still drives a verification gate, mark current and update header.

### docs/recon/* (8 files, all dated 2026-04-29)
**Reason:** age + location (CARRY-FORWARD)
**What to check:** Each file: was the recon target completed? If yes, deref to scrml-support/archive/recon/. Files: audit-remaining-phantoms, audit-spec-only-rows, compiler-dot-api-decision, lin-approach-b-verification, phase2-completion-status, phase2c-test-impact, tailwind-arbitrary-values-and-variants, tutorial-pass2-edit-list.

### docs/experiments/* (5 files, all dated 2026-04-25)
**Reason:** age + location (CARRY-FORWARD)
**What to check:** clueless-agent-* runs and SYNTHESIS/VALIDATION docs are research artefacts. If the kickstarter-v0 → v2 transition closed these out, they belong in scrml-support/docs/experiments/.

### docs/changes/v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md
**Reason:** uncertain — describes ratified but not-yet-dispatched scope (A7, A8); may be current planning or may become superseded once master-list reflects the full detail.
**What to check:** Confirm whether master-list.md §0 now captures all A7/A8 detail from this supplement. If yes and the supplement is fully reflected in master-list, it becomes a dispatch-artefact candidate for scrml-support/archive/. If it contains detail master-list omits (item timelines, OQ links, debate synthesis), keep in-tree until A7/A8 dispatch briefs absorb it.

## Compliant S67 additions

- `docs/audits/a1b-b7-rule4-audit-2026-05-07.md` through `a1b-b10-rule4-audit-2026-05-07.md` — Rule-4 pre-dispatch audits for B7/B8/B9/B10; work SHIPPED; audit docs serve as post-hoc record. Compliant (historical audits of shipped work, explicitly dated, tied to landed commits).
- `docs/audits/a1b-b11-rule4-audit-2026-05-07.md` through `a1b-b17-rule4-audit-2026-05-07.md` — Rule-4 pre-dispatch audits for B11-B17 (Wave 4), dated 2026-05-07; work NOT YET dispatched. Compliant as forward-audit records (current planning docs explicitly tied to spec sections via Rule 4 methodology).
- `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` — Wave 5 bundled audit. Compliant same reason.
- `docs/audits/a1c-roadmap-rule4-audit-2026-05-07.md` — A1c roadmap Rule-4 audit. Compliant.
- `docs/audits/item-c-temporal-engine-rule-migration-rule4-audit-2026-05-07.md` — Item C temporal surface migration audit. Compliant.
- `docs/changes/phase-a1b-step-b7-derived-dep-tracking/SURVEY.md` + `progress.md` — SHIPPED dispatch artefact. Same disposal recommendation as other completed dispatch dirs above, but strictly compliant until disposed.
- `docs/changes/phase-a1b-step-b8-l21-walker/SURVEY.md` + `progress.md` — same.
- `docs/changes/phase-a1b-step-b9-validator-arg-exprnode/SURVEY.md` + `progress.md` — same.
- `docs/changelog.md` — confirmed current at S67 (first entry dated 2026-05-07, full S67 session narrative). Compliant.
- `hand-off.md` (current session S68 open state) — compliant.
- `handOffs/hand-off-67.md`, `handOffs/hand-off-67-mid.md` — historical hand-offs; in `handOffs/` which is excluded from non-compliance scanning scope.
- `handOffs/incoming/read/*.md` — incoming hand-offs already read; excluded from scope.
- `compiler/SPEC.md` — authoritative; §6.11 footnote + Primer §7/§8 corrections landed S67.
- `docs/PA-SCRML-PRIMER.md` — corrected §7 + §8 at S67. Compliant.
- `master-list.md` — current at S67 (A7 + A8 ratified sections added). Compliant.
- `pa.md` — current at S67 (Rule 4 + dispatch-landing standing rule added). Compliant.

## What changed since S66 baseline report

- **New non-compliant:** `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` (self-declared superseded) + `docs/changes/reactive-derived-decl-divergence/ADR.md` (ADR location rule) — both newly flagged at S67.
- **New to completed-dispatch batch:** B7, B8, B9 dispatch dirs (SHIPPED S67) added to the `docs/changes/` batch entry.
- **Closed:** `docs/changelog.md` uncertainty — confirmed current at S67.
- **Persistent:** all 5 CARRY-FORWARD items from S66 report unchanged.
- **New compliant:** 16 audit docs added; all dated 2026-05-07; all tied to spec sections; all compliant.
- **New uncertain:** SCOPE-SUPPLEMENT-2026-05-07.md.

## Tags
#non-compliance #project-mapper #cleanup #scrmlTS #s67-refresh #docs-changes-batch #rule4-audits

## Links
- [primary.map.md](./primary.map.md)
- [docs/curation/2026-05-05-changes-dir-disposition.md](../../docs/curation/2026-05-05-changes-dir-disposition.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support pa.md](../../../scrml-support/pa.md)
