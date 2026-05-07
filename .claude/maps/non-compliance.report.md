# non-compliance.report.md
# project: scrmlTS
# generated: 2026-05-07T00:05:00Z
# scan mode: FULL_COLD_START (S66 PA-driven map-staleness diagnosis refresh from S40 baseline)

## Summary

Total docs scanned: ~75 (top-3-depth `*.md` excluding ignored paths)
Compliant:          ~62
Non-compliant:      8
Uncertain:          5

This refresh focuses on S40 → S65 drift. The largest cleanup candidate, `docs/changes/`, is already explicitly tracked in `docs/curation/2026-05-05-changes-dir-disposition.md` (PA-curated 36 directories pending disposition); items there are listed below as a single batch entry rather than enumerated.

## Non-compliant docs

### docs/articles/lsp-and-giti-advantages-draft-2026-04-25.md
**Reason:** name-heuristic (`-draft-` in filename) + superseded
**Detail:** A published version exists at `docs/articles/lsp-and-giti-advantages-devto-2026-04-28.md` (3 days later). The draft is dev artefact, not current truth. Article also references `BPP` as a live pipeline stage; PIPELINE.md v0.6.0 (2026-04-02) removed BPP — content is stale.
**Suggested disposition:** deref to `scrml-support/archive/articles/` or delete.

### docs/articles/npm-myth-draft-2026-04-25.md
**Reason:** name-heuristic (`-draft-` in filename) + superseded
**Detail:** A published version exists at `docs/articles/npm-myth-devto-2026-04-28.md`.
**Suggested disposition:** deref to `scrml-support/archive/articles/` or delete.

### docs/changes/ (36 subdirectories — batch entry per docs/curation/2026-05-05-changes-dir-disposition.md)
**Reason:** location + completed-work-as-current
**Detail:** Per the curation report itself: "Dirs that describe completed-and-merged work belong in `scrml-support/archive/dispatches/`." 36 subdirs present at S65 close; explicit examples of completed-and-merged work include `phase-4d-completion-sweep/`, `phase-a1a-step-*` (subdirectories for each of the 20 A1a sub-steps that all landed at S61), `stage-0c.a-overload-deletion/` (LANDED S64), `parsevariant-impl/` (SHIPPED S65), `a-plus-verdict-execution/` (CLOSED S65), `ast-builder-grammar-fixes/` (LANDED S65), `api-js-stdlib-enum-reexport/` (LANDED S65), `phase-a1b-step-b1-symbol-table-extension/` (LANDED S63), `phase-a1b-step-b2-name-collides-state/` (LANDED S64), `phase-a1b-step-b3-name-resolution/` (LANDED S65), `phase-a1b-step-b5-cell-classifier/` (LANDED S65). Active dispatches (e.g. `promotion-ergonomics/` for Tier B in flight) are compliant and should remain.
**Suggested disposition:** Run the PA's pending disposition (per curation matrix). Move LANDED/SHIPPED/CLOSED dirs to `scrml-support/archive/dispatches/`; keep only active in-flight dirs in-tree.

### docs/deep-dives/boundary-security-indirect-refs-2026-04-24.md
**Reason:** location (deep-dive belongs in scrml-support per global rules)
**Detail:** Per `~/.claude/CLAUDE.md`: "Completed deep-dives: `docs/deep-dives/`" — but project-mapper rules in this prompt say "Deep-dives, debates, ADRs (they belong in scrml-support)". Cross-reference: scrml-support is the home for completed deep-dives per the project-mapper scope contract. Three files present.
**Suggested disposition:** deref to `scrml-support/docs/deep-dives/`.

### docs/deep-dives/boundary-security-progress.md
**Reason:** location (same as above)
**Detail:** Progress-tracker for the boundary-security deep-dive.
**Suggested disposition:** deref to `scrml-support/docs/deep-dives/` alongside the parent file.

### docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md
**Reason:** location (same as above)
**Detail:** Deep-dive scoping doc for LSP enhancement work; LSP L1-L4 has since landed (S40-era). Even if still relevant as research, it belongs in scrml-support.
**Suggested disposition:** deref to `scrml-support/docs/deep-dives/`.

### docs/changelog.md
**Reason:** uncertain — may be stale
**Detail:** Not opened during this scan; master-list.md notes "Historical session-by-session detail lives in `docs/changelog.md`". If it's been updated through S65 it's compliant; if it stops at S40 or earlier it's drift.
**Suggested disposition:** human spot-check; bring forward to S65 close if behind, otherwise mark current.

### benchmarks/fullstack-react/CLAUDE.md
**Reason:** name-heuristic + location
**Detail:** Already flagged in S40-era primary.map.md as "out of place". A `CLAUDE.md` inside a benchmark subdir is anomalous — `CLAUDE.md` files are agent-instruction files; this directory should not require its own. Content is "Default to using Bun instead of Node.js." — boilerplate.
**Suggested disposition:** delete (or move to repo root if intentional, but the existing pattern is `~/.claude/CLAUDE.md` for global rules).

## Uncertain docs (needs human review)

### docs/audits/scope-c-stage-1-2026-04-25.md
**Reason:** age — dated 2026-04-25 (≥30 days older than current SPEC.md mtime 2026-05-06)
**What to check:** Confirm whether scope-c stage-1 is still the active audit baseline or whether stage-2/3 has superseded it. If superseded, deref to scrml-support/archive/.

### docs/audits/scope-c-stage-1-sample-classification.md
**Reason:** age — companion to above
**What to check:** Same as above.

### docs/audits/kickstarter-v0-verification-matrix.md
**Reason:** age — references kickstarter-v0; v2 article exists at `docs/articles/llm-kickstarter-v2-2026-05-04.md`
**What to check:** Has v0 been retired? If so, deref. If matrix still drives a verification gate, mark current and update header.

### docs/recon/* (8 files, all dated 2026-04-29)
**Reason:** age + location — recon notes typically belong in scrml-support after the work they recon for completes
**What to check:** Each file: was the recon target completed? If yes, deref to scrml-support/archive/recon/. Specific files: audit-remaining-phantoms, audit-spec-only-rows, compiler-dot-api-decision, lin-approach-b-verification, phase2-completion-status, phase2c-test-impact, tailwind-arbitrary-values-and-variants, tutorial-pass2-edit-list.

### docs/experiments/* (5 files, all dated 2026-04-25)
**Reason:** age + location
**What to check:** clueless-agent-* runs and SYNTHESIS / VALIDATION docs are research artefacts. If the kickstarter-v0 → v2 transition closed these out, they belong in scrml-support/docs/experiments/.

## Compliant (worth listing for confidence)

- `compiler/SPEC.md` (24,911 lines, mtime 2026-05-06) — authoritative.
- `compiler/PIPELINE.md` (2,380 lines, v0.7.0 dated 2026-05-04) — authoritative.
- `compiler/SPEC-INDEX.md` — auto-generated index.
- `master-list.md` (S65 timestamp) — current.
- `pa.md`, `hand-off.md`, `README.md`, `DESIGN.md`, `scrmlFormula.md` — current.
- `docs/tutorial.md`, `docs/lin.md`, `docs/external-js.md`, `docs/PA-SCRML-PRIMER.md` — current reference docs.
- `docs/articles/*-devto-*.md` (publish-named articles, S58-S65 dates) — published artefacts; current.
- `docs/articles/llm-kickstarter-v{0,1,2}-*.md` — explicit version progression; v2 (2026-05-04) is current; v0/v1 are intentional historical record.
- `docs/articles/teej_baiting_tweet.md` — social/marketing artefact.
- `docs/audits/compiler-forgotten-surface-2026-05-06.md` — current (S64-era audit).
- `docs/audits/scope-c-findings-tracker.md` — open tracker.
- `docs/curation/2026-05-05-changes-dir-disposition.md` — current curation work.
- `docs/pinned-discussions/w-program-001-warning-scope.md` — pinned.
- `docs/website/v0.2.0-announce-2026-05-05.md` — current website-bound copy.
- `docs/articles/why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md` — pairs with §17.5 amendment landed S64.
- `docs/articles/x-snippet-zod-calibration-2026-05-06.md` — current.
- `docs/articles/tier-ladder-promotion-devto-2026-05-04.md` — pairs with §56 promotion-ergonomics Tier A landing.
- `examples/README.md`, `examples/VERIFIED.md`, `examples/23-trucking-dispatch/{README,FRICTION}.md` — current.
- `editors/neovim/README.md` — current editor docs.
- `scripts/git-hooks/README.md` — current.
- `benchmarks/RESULTS.md`, `benchmarks/sql-batching/RESULTS.md`, `benchmarks/fullstack-react/README.md`, `benchmarks/todomvc-{react,svelte}/README.md` — bench artefacts (stable).

## What changed since S40 baseline non-compliance report

- **Closed:** master-list.md staleness (was 12 sessions stale; now S65 current).
- **Closed:** SEO-LAUNCH.md (now `.gitignore`d explicitly; no longer a tracked-file concern).
- **New:** `docs/changes/` 36-subdir batch (post-S40 work accumulation).
- **New:** `docs/articles/*-draft-*` files (drafts that should follow their published counterparts to archive).
- **Persistent:** deep-dives still in `docs/deep-dives/` (3 files).
- **Persistent:** `benchmarks/fullstack-react/CLAUDE.md` still out of place.

## Tags
#non-compliance #project-mapper #cleanup #scrmlTS #s66-refresh #docs-changes-batch

## Links
- [primary.map.md](./primary.map.md)
- [docs/curation/2026-05-05-changes-dir-disposition.md](../../docs/curation/2026-05-05-changes-dir-disposition.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support pa.md](../../../scrml-support/pa.md)
