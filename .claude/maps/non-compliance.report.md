# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-23T09:52:00-06:00
# scan mode: INCREMENTAL_UPDATE (re-scan keyed on 136678e5..c2d93544)

## Summary

Total docs scanned: ~110 `.md` files at the project-repo level (excluding node_modules,
  .git, .jj, .claude, archive, handOffs, dist/build/target). docs/changes/ counted
  in aggregate (now 111 dirs / 209 .md files — +30 dirs / +25 files since the prior
  scan, all S122 dispatch process artifacts).
Compliant (mapped or out-of-scope reference): ~15
Non-compliant: 5 categories (1 large aggregate + 4 named) — UNCHANGED from prior scan.
Uncertain: 3 — UNCHANGED.

SPEC.md modification watermark: 2026-05-23 (current). §56.9 NEW S122 — I-FN-PROMOTABLE
sibling promotion lint section landed; §34 catalog row added in parallel. No prior
spec sections invalidated by this addition (sibling pattern, not amendment).

The 136678e5→c2d93544 range (30 commits, S122 marathon ~10h) added/modified:
  - **NEW top-level reference doc**: `compiler/native-parser/M6.6-CONTRACT-DERIVATION.md`
    (540L cookbook for M6.6.b.2..b.6 consumer migrations) — current-dated, located
    correctly alongside the rest of native-parser/*.md references, describes the
    LIVE M6.6.b.1 IMPL seam. IN-SCOPE / COMPLIANT.
  - **Modified current-truth docs**: README.md (drop redundant `server` keyword from
    first-example loadContacts), compiler/SPEC.md (+§56.9 I-FN-PROMOTABLE + §34 row +
    cross-refs at §48 / §56), docs/PA-SCRML-PRIMER.md (+§6.2 Match block-form Tier 1
    subsection — Wave 12 close + S121 P5-7 catchup), docs/changelog.md (S122 entry),
    hand-off.md + master-list.md (PA wrap artifacts).
  - **NEW process docs under docs/changes/**: 25 new files across 10 new dirs
    (m66-b1-impl, m66-b1-native-contract-survey, m66-engine-statechild-adapter,
    r4-expression-catalog-continuation-survey, r4-u1-wire-translate-expr-ride-throughs,
    r4-u2-for-stmt-iter-cstyle, unit-u-tilde-decl-mu-001, w12-unit-y-ri-trigger-expr-node,
    w14-unit-aa-w-lint-013-scope-gate, w14-unit-bb) plus continuations in existing
    dirs (i-fn-promotable, m6-2-component-expander, m6-3-emit-match-native,
    m6.1-meta-eval-native-migration, m6.2a-markupvalue-bridge, m6.4a). All fall into
    the existing `docs/changes/**` aggregate category (dispatch planning + progress
    artifacts, current-dated, correctly located). NO new non-compliance class.

No newly-flagged stale-claim docs found in this delta. Specifically:
  - Confirmed no docs still claim "translate-stmt-bridge unwired" / "translateExpr
    unwired" — only the LIVE survey memo
    `docs/changes/r4-expression-catalog-continuation-survey/progress.md` describes
    the pre-R4-U1 state, and that's current-correct as a progress artifact bracketing
    R4-U1/R4-U2 landings.
  - Confirmed no docs claim "M6 Wave 1 not started" — all M6.x progress docs are
    current-dated and reference the actual landings (`52c6ec5a`, `11e47dc0`, etc.).
  - Confirmed no docs cite tests <19k as current state — `docs/changelog.md` mentions
    the 13,773 → 19,907 transition as documented S122 history, which is correct.

The categories below are UNCHANGED from the prior scan; counts refreshed where relevant.

## Non-compliant docs

### docs/changes/** (209 files across ~111 directories)
**Reason:** location + name-heuristic (combo)
**Detail:** Every directory under `docs/changes/` is a per-dispatch artifact set
— `BRIEF.md`, `SCOPE.md`, `progress.md` for completed or in-flight work. S122
added ~25 new files across 10 new dirs (M6 Wave 1, R4-Ux, W12-W14 Unit dirs).
The repo already acknowledges this whole class: `docs/curation/2026-05-05-changes-dir-disposition.md`
is a standing curation matrix dispositioning these dirs to
`scrml-support/archive/dispatches/`. The `m5-c2-gap-ledger/`, `m6.*` dirs,
`r4-*` dirs, and `w12-/w14-*` dirs are LIVE in-flight arcs — keep until their
work lands. Broader M5/M6 dispatch dirs stay until M6 closes (post-M6.8 deletion).
**Suggested disposition:** deref completed-arc dirs to scrml-support/archive/dispatches/;
keep only actively-in-flight dirs (per the curation matrix). At this scale (209
files), a batched deref after M6.8 close is cleaner than per-dir handling.

### docs/website/roadmap-from-v0.3-2026-05-14.md
**Reason:** content-heuristic + name-heuristic
**Detail:** Front-matter `status: draft`; adopter-facing roadmap describing where
the compiler is "going" from v0.3 — aspirational by definition. Predates the
current SPEC; package.json is now v0.6.0.
**Suggested disposition:** deref to scrml-support/docs/ (roadmap/planning content
belongs in support, not the project repo per the "current truth only" principle).

### docs/website/v0.2.0-announce-2026-05-05.md  and  docs/website/v0.3.0-announce-2026-05-14.md
**Reason:** location + currency
**Detail:** Version-announcement marketing copy. Not reference docs for dev
agents; describe release-moment nominal state, not current code. Both are for
superseded releases (package.json is at 0.6.0).
**Suggested disposition:** deref both to scrml-support/docs/ (or archive the
v0.2.0 one). Not load-bearing for any dev-agent navigation.

### docs/audits/** (11 audit docs)
**Reason:** location
**Detail:** article-truthfulness-audit, compiler-forgotten-surface, null-audit,
undefined-audit, wave-3-7-corpus-ouroboros, self-host-spec-conformance,
articles-currency-table, happy-dom-perf-regression, scrml-dev-content-spec-
fidelity, scrml-support-currency-sweep, scope-c-findings-tracker. Audit reports
are point-in-time investigation artifacts — they belong in scrml-support per the
"deep-dives / audits live in scrml-support" rule. Several are dated 30+ days
before the current SPEC (compiler-forgotten-surface 2026-05-06).
**Suggested disposition:** deref to scrml-support/docs/ (or scrml-support/archive/).
scope-c-findings-tracker.md may still be live — see Uncertain below.

### docs/curation/2026-05-05-changes-dir-disposition.md
**Reason:** location + currency
**Detail:** A curation matrix (S61) for the docs/changes/ deref. Its own snapshot
("103 dirs total") is now stale by even more — docs/changes/ now has 209 tracked
files / 111 dirs (was 181 / 80+ at prior scan; was 103 at original authoring).
It is a process artifact, not a reference doc.
**Suggested disposition:** deref to scrml-support/docs/ once the docs/changes/
deref above is executed; or update the count and keep as the standing checklist.

## Uncertain docs (needs human review)

### docs/known-gaps.md
**Reason:** This doc EXPLICITLY catalogs spec-vs-implementation drift — by
construction it describes things the compiler does NOT do. That makes it look
non-compliant under the grep cross-check, but it is also the canonical,
intentionally-maintained drift ledger. It is genuinely useful to a dev agent.
**What to check:** Confirm with the user whether known-gaps.md should stay as a
project-repo reference (it is current-state-honest) or move to scrml-support.
Recommend KEEP — it is the opposite of aspirational-pretending-to-be-current.

### docs/pinned-discussions/w-program-001-warning-scope.md
**Reason:** "pinned discussion" — a discussion/debate-shaped doc, which the scope
rule says belongs in scrml-support. But "pinned" suggests it is an
intentionally-retained active design note.
**What to check:** Determine if the W-PROGRAM-001 scope question is resolved. If
resolved, deref to scrml-support/docs/. If still open, keep.

### docs/external-js.md  and  docs/lin.md
**Reason:** Reference-shaped docs (external-js integration; the `lin` token
feature) but not obviously cross-checked against current code.
**What to check:** Grep the identifiers each cites against compiler/src. Both
features resolve in source (`LinDeclNode` in ast.ts; `LinDecl` StmtKind in the
native parser as of B4; api.js handles .js imports) — recommend KEEP as current
reference pending a quick grep confirmation.

## Notes on compliant / in-scope docs (NOT flagged)
- compiler/SPEC.md, SPEC-INDEX.md, PIPELINE.md — authoritative spec; mapped.
  §34.1 holds 81 codes (C2 +2 info codes, stable through S122). §34 catalog grew
  S121 (W-STDLIB-*) and S122 (I-FN-PROMOTABLE). §41.17 scrml:compiler family deferral.
  §56.9 NEW S122 — I-FN-PROMOTABLE sibling promotion lint (Unit EE).
  §58 Build Story is spec-ahead but explicitly self-labels as a "Nominal section"
  with a §58.12 gap enumeration — honest spec-ahead, NOT non-compliant.
- README.md — restructured S120 (Carson Gross review + honest-hero fix); S122
  edit dropped redundant `server` keyword from the first-example `loadContacts`;
  still a current reference doc.
- docs/PA-SCRML-PRIMER.md — NEW §6.2 Match block-form (Tier 1) subsection added
  S122 (Wave 12 close + S121 P5-7 catchup); primer reference, in-scope.
- DESIGN.md, docs/tutorial.md, docs/changelog.md, scrmlFormula.md — current reference;
  in-scope.
- compiler/native-parser/README.md, M5-ast-bridge-scoping.md,
  M5-divergence-ledger.md, M5-SWAP-residual-decomposition.md — current
  native-parser reference; LOAD-BEARING for the M5-swap gap-ledger work; in-scope.
- **compiler/native-parser/M6.6-CONTRACT-DERIVATION.md** (NEW S122, 540L) — current
  reference cookbook for the live M6.6.b.1 IMPL seam + the M6.6.b.2..b.6 consumer
  migration path; located correctly alongside the M5-*.md siblings; IN-SCOPE.
- compiler/src/codegen/README.md, compiler/tests/.../REGISTRY.md — current
  module-local reference; in-scope.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
