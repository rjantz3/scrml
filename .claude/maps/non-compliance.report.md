# non-compliance.report.md
# project: scrmlts
# generated: 2026-06-02T03:40:05-06:00
# scan mode: INCREMENTAL_UPDATE (watermark efcd5536 → c665714c, S153 each-in-dynamic-context sweep)
# prior scan: INCREMENTAL_UPDATE at 4e1f9492 (S148-S152); FULL_COLD_START at 948d3f2f (2026-05-30)

## Summary

Total docs scanned (incremental delta — new/modified docs efcd5536 → HEAD): 7 new/modified
Compliant (new docs): 6
Non-compliant (new findings): 0
Uncertain (new findings): 0
New infra finding: 1 (map header-commit drift — see below)
Prior-scan findings: unchanged (see prior entries below; none re-checked this incremental pass)

## New Docs Added S153 — Incremental Findings

### docs/changes/each-in-block-form-match-2026-06-01/{BRIEF.md, progress.md, repro-*.scrml} — COMPLIANT
Dispatch archive for the `<each>`-in-block-form-`<match>`-arm fix (3429b385). Backticked symbols
(`collectEachBlocks`, `emitEachBodyRenderForFile`, `emitVariantGuardedRender`, `emitEachMountHtml`)
all grep-resolve in current source. Historical dispatch record; matches landed code.

### docs/changes/colon-shorthand-in-engine-arm-2026-06-01/{BRIEF.md, progress.md, repro-*.scrml} — COMPLIANT
Dispatch archive for the `:`-shorthand-child engine-arm parser fix (c89c1cb1). Describes
`isColonShorthandOpener` wired into the 3 closer-finders in engine-statechild-parser.ts — confirmed
present. Historical dispatch record.

### docs/changes/each-in-enclosing-scope-2026-06-01/{BRIEF.md, progress.md, anchor-*.scrml, repro-*.scrml} — COMPLIANT
Dispatch archive for the `<each>`-over-enclosing-scope fix (e6870f25, nested-each + component-each).
Backticked symbols (`emitEachReconcileLines` referenced via `collectEachBlocks`/`emitEachBodyRenderForFile`,
`rewriteContextualSigil`, `_scrml_effect_static`) grep-resolve. Anchor .scrml files are regression
anchors (each-in-errorBoundary / under-`if=`). Historical dispatch record.

### handOffs/hand-off-157.md — COMPLIANT (out-of-scope location, correctly placed)
The S152 CLOSE rotation archive. Lives under `handOffs/` (excluded historical hand-off dir), so it
is out-of-scope for mapping, not non-compliant. Correctly rotated.

### docs/changelog.md — COMPLIANT
S153 section added; describes shipped behavior matching the 4 landed commits + maps refresh.
Forward-correction noted in-doc (the S152 #1 "covers block-form match" claim was aspirational).
Honest, current.

### hand-off.md + master-list.md — COMPLIANT
Current working hand-off + master-list (in-scope current-truth docs). Updated to S153 CLOSE state.

## New Infra Finding (S153) — map header-commit drift

### .claude/maps/{dependencies,schema,config,build}.map.md — HEADER STALE (content current-but-unverified)
**Reason:** infra / header-heuristic
**Detail:** These four maps carry header `commit:` hashes older than the maps that WERE refreshed:
- `schema.map.md` → `09f74bee` (2026-05-31)
- `config.map.md` → `948d3f2f` (2026-05-30)
- `build.map.md` → `948d3f2f` (2026-05-30)
- `dependencies.map.md` → `4e1f9492` (S148-S152 pass)
The S153 source changes (emit-each / emit-match / emit-client / component-expander /
engine-statechild-parser) did NOT touch dependencies, schema, config, or build inputs (no manifest,
no `.d.ts`/types/, no `.env`, no scripts/Dockerfile/CI changes in efcd5536 → HEAD), so per the
incremental-update routing table their CONTENT is NOT regenerated and remains accurate. Their header
hashes were deliberately NOT bumped to HEAD to avoid falsely asserting a fresh re-verification.
**Suggested disposition:** No action required for the S153 dispatch (content is current). At the next
FULL_COLD_START, re-stamp all map headers to a single watermark. If PA prefers uniform headers now,
a content-free header bump on these four is safe — but a stamped-but-unverified map is exactly the
"stale map misleads" risk the cartographer guards against, so leaving the honest older hashes is the
conservative call.

## Prior Incremental Findings (S148-S152, at 4e1f9492 — unchanged, not re-checked this pass)

### docs/heads-up/spec-consolidation-2026-05-25.md — UNCERTAIN (carried)
**Reason:** Frontmatter `status: in-progress`; Phase 2 amendment TBD landings (§6.10, §52.4, §55)
not yet executed.
**What to check:** Whether the open TBD landings are scheduled or deferred-indefinitely.

(All other S148-S152 dispatch archives under docs/changes/ were classed COMPLIANT in the prior scan.)

## Prior FULL_COLD_START Findings (at 948d3f2f — unchanged, retained for reference)

### Non-compliant
- compiler/native-parser/M5-SWAP-residual-decomposition.md — content-heuristic + spec-draft (`status: superseded`) → deref to scrml-support/archive/
- docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md — content-heuristic + location → deref to scrml-support/archive/
- docs/changes/v0next-inventory/SCOPE-SUPPLEMENT-2026-05-07.md — content-heuristic + location → deref to scrml-support/archive/
- docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md — location (superseded by 2026-05-21 audit) → deref to scrml-support/archive/
- docs/audits/articles-currency-table-2026-05-13.md — location → deref to scrml-support/archive/ or docs/
- docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md — location → deref to scrml-support/archive/
- docs/audits/scrml-support-currency-sweep-2026-05-21.md — location (cross-repo audit in wrong repo) → deref to scrml-support/docs/
- docs/audits/self-host-spec-conformance-2026-05-11.md — location (self-host post-v1.0) → deref to scrml-support/archive/
- docs/changes/match-block-form-scoping/SCOPING.md — gap partially/fully closed → update or deref
- docs/changes/serialize-scoping/SCOPING.md — `status: STASHED S103` planning-debt → deref to scrml-support/archive/
- docs/changes/v0.3.x-spa-tree-shake/SCOPING.md — planned/deferred arc → uncertain, needs human review
- docs/audits/scrml-dev-content-spec-fidelity-2026-05-19.md — location (website content audit) → deref to scrml-support/docs/

### Uncertain (from prior FULL_COLD_START scan)
- compiler/native-parser/M5-ast-bridge-scoping.md — active but M5-swap incomplete; verify bridge contract (NOTE: S153 re-confirmed the native parser does NOT promote each/match — a hard M5-swap precondition; this doc's bridge contract should capture that)
- compiler/native-parser/M5-divergence-ledger.md — M6.6.b.x landings may have closed entries (NOTE: S153 each/match-no-structural-promotion is a NEW divergence-ledger candidate)
- compiler/native-parser/M6.6-CONTRACT-DERIVATION.md — verify M6.6.b.1 contract is current
- docs/changes/schemaFor-impl/SCOPE-AND-DECOMPOSITION.md — schemaFor shipped; verify sub-items closed
- docs/changes/tilde-codegen/SURVEY.md + ROUND-TRIP-SURVEY.md + FOLLOWUPS.md — tilde shipped; verify open items
- docs/changes/tilde-gaps-567/SURVEY.md — verify gap items against current type-system.ts
- docs/audits/spec-consolidation-inventory-2026-05-24.md — Phase 1a companion to in-progress HU
- docs/audits/spec-corroboration-canons-pipeline-2026-05-24.md — Phase 1b companion
- docs/audits/spec-feature-canon-coverage-2026-05-25.md — verify post-2026-05-25 closures
- docs/changes/v0.3-approach-a-spec/SCOPING.md — v0.3 shipped; verify all items landed
- docs/changes/a3-auth-graph-scoping/SCOPING.md — auth-graph.ts live; verify items landed
- docs/changes/runtime-perf-scoping/SCOPING.md — P3.B PGO landed; other arcs unknown
- docs/changes/tableFor-scoping/SCOPING.md — tableFor shipped; verify landed
- docs/changes/schemaFor-scoping/SCOPING.md — schemaFor shipped; verify landed
- docs/audits/null-audit-compiler-src-2026-05-13.md + undefined-audit-compiler-src-2026-05-13.md — historical sweep; deref if clean
- docs/pinned-discussions/w-program-001-warning-scope.md — verify W-PROGRAM-001 disposition
- docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md — historical; deref if no open items
- docs/website/roadmap-from-v0.3-2026-05-14.md — now at v0.7.0; verify stale vs current roadmap items

---

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #each-in-dynamic-context #header-drift #s153

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
