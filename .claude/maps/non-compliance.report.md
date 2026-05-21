# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-21T15:00:00Z
# scan mode: FULL_COLD_START

## Summary

Total docs scanned: ~95 `.md` files (excluding node_modules, .git, .jj, .claude,
  archive, handOffs, dist/build/target). docs/changes/ counted in aggregate.
Compliant (mapped or out-of-scope reference): ~14
Non-compliant: 5 categories (1 large aggregate + 4 named)
Uncertain: 3

SPEC.md modification watermark: 2026-05-21 13:21 (current). Docs older than this
that describe non-trivial aspirational state are flagged below.

## Non-compliant docs

### docs/changes/** (166 files across ~80+ directories)
**Reason:** location + name-heuristic (combo)
**Detail:** Every directory under `docs/changes/` is a per-dispatch artifact set
— `BRIEF.md`, `SCOPING.md`, `progress.md` for completed or in-flight work
(a-4-2-initial-chunk-emission, formFor-impl, §13.2-impl-phase-A..E, etc.). These
are historical dispatch records, not current reference docs. The repo itself
already acknowledges this: `docs/curation/2026-05-05-changes-dir-disposition.md`
is a standing curation matrix that dispositions these dirs to
`scrml-support/archive/dispatches/`.
**Suggested disposition:** deref completed-arc dirs to scrml-support/archive/dispatches/;
keep only actively-in-flight dirs (per the curation matrix). The native-parser
M5/MK dirs (e.g. native-parser-front-end/IMPLEMENTATION-ROADMAP.md) are
in-flight and should stay until M6 closes.

### docs/website/roadmap-from-v0.3-2026-05-14.md
**Reason:** content-heuristic + name-heuristic
**Detail:** Front-matter `status: draft`; adopter-facing roadmap describing where
the compiler is "going" from v0.3 — aspirational by definition. Predates the
current SPEC by 7 days.
**Suggested disposition:** deref to scrml-support/docs/ (roadmap/planning content
belongs in support, not the project repo per the "current truth only" principle).

### docs/website/v0.2.0-announce-2026-05-05.md  and  docs/website/v0.3.0-announce-2026-05-14.md
**Reason:** location + currency
**Detail:** Version-announcement marketing copy. Not reference docs for dev
agents; describe release-moment nominal state, not current code. v0.2.0-announce
is for a superseded release (package.json is at 0.4.0).
**Suggested disposition:** deref both to scrml-support/docs/ (or archive the
v0.2.0 one). Not load-bearing for any dev-agent navigation.

### docs/audits/** (12 audit docs)
**Reason:** location
**Detail:** article-truthfulness-audit, compiler-forgotten-surface, null-audit,
undefined-audit, corpus-ouroboros, self-host-spec-conformance, etc. Audit
reports are point-in-time investigation artifacts — they belong in scrml-support
per the "deep-dives / audits live in scrml-support" rule. Several are dated 30+
days before the current SPEC (compiler-forgotten-surface 2026-05-06,
articles-currency-table 2026-05-13).
**Suggested disposition:** deref to scrml-support/docs/ (or scrml-support/archive/).
scope-c-findings-tracker.md may still be live — see Uncertain below.

### docs/curation/2026-05-05-changes-dir-disposition.md
**Reason:** location + currency
**Detail:** A curation matrix (S61) for the docs/changes/ deref. Its own snapshot
("103 dirs total") is stale — docs/changes/ now has ~166 tracked files. It is a
process artifact, not a reference doc.
**Suggested disposition:** deref to scrml-support/docs/ once the docs/changes/
deref above is executed; or update the count and keep as the standing checklist.

## Uncertain docs (needs human review)

### docs/known-gaps.md
**Reason:** This doc EXPLICITLY catalogs spec-vs-implementation drift — by
construction it describes things the compiler does NOT do ("spec'd = SPEC
normative + compiler does nothing"). That makes it look non-compliant under the
grep cross-check, but it is also the canonical, intentionally-maintained drift
ledger (last updated S109). It is genuinely useful to a dev agent.
**What to check:** Confirm with the user whether known-gaps.md should stay as a
project-repo reference (it is current-state-honest) or move to scrml-support. It
is NOT aspirational-pretending-to-be-current; it is the opposite. Recommend KEEP.

### docs/pinned-discussions/w-program-001-warning-scope.md
**Reason:** "pinned discussion" — a discussion/debate-shaped doc, which the scope
rule says belongs in scrml-support. But "pinned" suggests it is an
intentionally-retained active design note.
**What to check:** Determine if the W-PROGRAM-001 scope question is resolved. If
resolved, deref to scrml-support/docs/. If still open, it is a live design note
— keep.

### docs/external-js.md  and  docs/lin.md
**Reason:** Reference-shaped docs (external-js integration; the `lin` token
feature) but not obviously cross-checked against current code. Could be current
reference or could be stale feature notes.
**What to check:** Grep the identifiers each cites against compiler/src. If the
features (`lin-decl`, external-js import handling) resolve in source — they do
appear in ast.ts as `LinDeclNode` and api.js handles .js imports — keep as
current reference. Recommend KEEP pending a quick grep confirmation.

## Notes on compliant / in-scope docs (NOT flagged)
- compiler/SPEC.md, SPEC-INDEX.md, PIPELINE.md — authoritative spec; mapped.
- README.md, DESIGN.md, docs/tutorial.md, docs/changelog.md, scrmlFormula.md,
  docs/PA-SCRML-PRIMER.md — current reference; in-scope.
- compiler/native-parser/README.md, M5-ast-bridge-scoping.md,
  M5-divergence-ledger.md — current native-parser reference; LOAD-BEARING for the
  M5 dispatch; in-scope (the M5 docs describe current state + scoped future work
  honestly, not aspirational-as-current).
- compiler/src/codegen/README.md, compiler/tests/.../REGISTRY.md — current
  module-local reference; in-scope.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
