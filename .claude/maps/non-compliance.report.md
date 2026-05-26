# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-26T00:00:00Z
# scan mode: INCREMENTAL_UPDATE (delta scan 3a909c1d → c2d3f7ae; 62 commits)

## Summary

Total docs scanned (delta + carry-forward): ~337 `.md` files (excluding node_modules, .git, .jj, .claude, archive, handOffs, dist/build/target).
Compliant: core spec, READMEs, reference docs, in-flight + completed progress artifacts, the NEW adopter MCP guide.
Non-compliant: 6 categories (5 carried forward + 1 new: 3 spec-consolidation audits).
Uncertain: 3 (carried forward, unchanged).

SPEC.md modification watermark: **2026-05-25 (commit ea7c44d5)** — CHANGED this delta. SPEC.md grew +1795 lines across the grammar-lockdown sweep (S129-S131): V-kill cluster, §39 schema placement, §55.5 validity, §51.0.B lifecycle, **§17.7 NEW (iteration), §3.4 NEW (`@.` sigil), §56.10 (`promote --each` CLI spec), §14.3/§14.12 (lifecycle extension)**. PIPELINE.md +24. SPEC-INDEX regenerated.

## Delta Scan (62 commits: 3a909c1d → c2d3f7ae)

### NEW source surfaces — all grep-verified + test-backed (COMPLIANT)
- `codegen/emit-each.ts` (618L) + `lint-w-each-key.js` + `lint-w-each-promotable.js` — iteration; tests `unit/each-block.test.js`.
- `type-system.ts` lifecycle registry (+1622) — E-TYPE-001 / E-TYPE-LIFECYCLE-* / W-LIFECYCLE-LEGACY-ARROW; tests `type-system-lifecycle*.test.js` + 3 integration pipelines.
- `compute-program-config.ts` McpConfig + `commands/build.js` boot injection (MCP-V0.D); tests `integration/mcp-program-attr.test.js` + `mcp-v0-e2e.test.js` (V0.E close).
- native-parser parse-stmt/parse-expr/parse-file/translate-stmt (M6.5.b.2.1/b.3/b.4/b.5/b.6 + M6.7 C/D-class); tests `m65-b*` + `m67-c*`/`m67-d*`.
- `~snapshot` orphan-sigil fix (rewrite.ts/emit-expr.ts/emit-logic.ts, Bug 15); test `integration/tilde-snapshot-codegen-fix.test.js`.

### NEW docs this delta
- `docs/adopter/mcp-setup.md` — **COMPLIANT, in-scope**. Accurately describes the LANDED `<program mcp>` opt-in (S130), enumerates the 11 tools matching `TOOL_NAMES` in `mcp.js`, correctly documents `W-ATTR-002` on unknown attribute values + the dev-only NODE_ENV gate. Current adopter reference — KEEP. (Watch: the 11-tool list is a public contract; any future drift must re-sync to `TOOL_NAMES`.)
- `docs/heads-up/iteration-design-2026-05-25.md`, `docs/heads-up/lifecycle-annotation-extension-2026-05-25.md` — ratification running-logs; both arcs are now LANDED at HEAD (iteration Landings 1+2, lifecycle Landings 1+2+2.5). These are now COMPLETED-arc heads-up logs → deref-eligible.
- `docs/heads-up/spec-consolidation-2026-05-25.md` — spec-consolidation thread; partially in-flight (Phase 1 audits landed; consolidation ongoing). KEEP for now.
- 13 NEW `docs/changes/` dirs (iteration-dd / iteration-landing-1 / iteration-landing-2 / lifecycle-dd / lifecycle-landing-1 / lifecycle-landing-2 / lifecycle-landing-2-5 / m65-path-b-adapter-scoping / m67-phase-a-flag-flip / mcp-v0-d-2026-05-25 / phase2-cluster-a / phase2-cluster-B-code / snapshot-codegen-fix). Same aggregate per-dispatch class as prior scans.

## Non-compliant docs

### docs/audits/spec-consolidation-inventory-2026-05-24.md, spec-corroboration-canons-pipeline-2026-05-24.md, spec-feature-canon-coverage-2026-05-25.md  (NEW this delta)
**Reason:** location
**Detail:** Three new point-in-time SPEC-consolidation/corroboration audit artifacts (S129 phase-1a/1b/1c). Front-matter confirms `status: complete-phase-1a`, `session: 129`, finding-counts — investigation snapshots, not standing reference. Same class as the existing `docs/audits/**`.
**Suggested disposition:** deref to scrml-support/docs/ (or scrml-support/archive/) per the standing "audits live in scrml-support" rule. The findings these capture feed the in-flight spec-consolidation thread — confirm consolidation has consumed them before deref.

### docs/audits/** (11 carried-forward audit docs)
**Reason:** location
**Detail:** articles-currency-table, article-truthfulness-audit, compiler-forgotten-surface, null-audit, undefined-audit, wave-3-7-corpus-ouroboros, self-host-spec-conformance, happy-dom-perf-regression, scrml-dev-content-spec-fidelity, scrml-support-currency-sweep, scope-c-findings-tracker. Point-in-time investigation artifacts.
**Suggested disposition:** deref to scrml-support/docs/ (or scrml-support/archive/). scope-c-findings-tracker.md may still be live — see Uncertain.

### docs/changes/** (~242 files across 133 directories)
**Reason:** location + name-heuristic (combo)
**Detail:** Every directory under `docs/changes/` is a per-dispatch artifact set (BRIEF/SCOPING/progress). This delta added 13 NEW dirs. Standing curation matrix `docs/curation/2026-05-05-changes-dir-disposition.md` dispositions these to `scrml-support/archive/dispatches/`. Newly-COMPLETED arcs eligible for post-session deref: iteration-dd, iteration-landing-1, iteration-landing-2, lifecycle-dd, lifecycle-landing-1, lifecycle-landing-2, lifecycle-landing-2-5, mcp-v0-d, snapshot-codegen-fix, phase2-cluster-a, phase2-cluster-B-code, m67-phase-a-flag-flip (the work they track is LANDED at HEAD). `m65-path-b-adapter-scoping` (M6.5.b.2 PARTIAL) and `mcp-v0-devtools-scoping` remain referenceable but the MCP arc is now A-E COMPLETE — mcp-v0-devtools-scoping is itself deref-eligible.
**Suggested disposition:** batched deref of completed-arc dirs to scrml-support/archive/dispatches/ after a stable checkpoint; keep `m65-path-b-adapter-scoping`. The curation matrix count ("103 dirs total") is now stale (133 dirs / 242 .md).

### docs/website/roadmap-from-v0.3-2026-05-14.md
**Reason:** content-heuristic + name-heuristic
**Detail:** `status: draft`; adopter-facing roadmap from v0.3. Package.json is now v0.6.0 — predates current state by 3 minor versions.
**Suggested disposition:** deref to scrml-support/docs/.

### docs/website/v0.2.0-announce-2026-05-05.md  and  docs/website/v0.3.0-announce-2026-05-14.md
**Reason:** location + currency
**Detail:** Version-announcement copy for superseded releases.
**Suggested disposition:** deref both to scrml-support/docs/ (or archive v0.2.0).

### docs/curation/2026-05-05-changes-dir-disposition.md
**Reason:** location + currency
**Detail:** Curation matrix (S61) for the docs/changes/ deref. Snapshot count ("103 dirs total") is stale — docs/changes/ is now 133 dirs / 242 .md.
**Suggested disposition:** deref to scrml-support/docs/ once the docs/changes/ deref is executed; or update count and keep as standing checklist.

## Uncertain docs (needs human review — carried forward)

### docs/known-gaps.md
**Reason:** This doc explicitly catalogs spec-vs-implementation drift — by construction it describes things the compiler does NOT yet do. Looks non-compliant under grep cross-check but is the intentionally-maintained drift ledger. Refreshed S131 (commit 3ae76826) — actively current (Lifecycle Landing 1 rotated to §7 closed; ~snapshot Bug 15 closed).
**What to check:** Confirm it should stay as a project-repo reference. Recommendation: KEEP — it is the opposite of aspirational-pretending-to-be-current.

### docs/pinned-discussions/w-program-001-warning-scope.md
**Reason:** "pinned discussion" is debate-shaped (belongs in scrml-support) but "pinned" suggests an intentionally-retained active design note.
**What to check:** Determine if the W-PROGRAM-001 scope question is resolved. If resolved, deref to scrml-support/docs/. If still open, keep.

### docs/external-js.md  and  docs/lin.md
**Reason:** Reference-shaped docs (external-js integration; `lin` token feature) not re-cross-checked at this scan.
**What to check:** Both features resolve in source (`LinDeclNode` in ast.ts; `LinDecl` StmtKind in native parser; api.js handles .js imports) — recommend KEEP pending quick grep confirmation.

## Notes on compliant / in-scope docs (NOT flagged)

- `compiler/SPEC.md` (30477L, mod 2026-05-25), `SPEC-INDEX.md` (regen S131), `PIPELINE.md` — authoritative spec; mapped. §17.7 + §3.4 + §14.3/§14.12 + §56.10 reflect LANDED features (iteration codegen + lifecycle), EXCEPT §56.10 `promote --each` is SPEC-AHEAD (the CLI is Landing 3, PENDING — the SPEC and the CLI help both flag it "impl pending"; this is honest spec-ahead, not stale).
- `docs/adopter/mcp-setup.md` — NEW; current adopter reference for the LANDED `<program mcp>`. In-scope.
- `README.md`, `DESIGN.md`, `docs/tutorial.md`, `docs/changelog.md`, `scrmlFormula.md` — current reference (README hero updated S130 to `<each>`/`@.`/`<empty>` + NOMINAL gating framing).
- `docs/PA-SCRML-PRIMER.md` — adopter-side primer; in-scope.
- `compiler/native-parser/README.md`, `M5-*.md`, `M6.6-CONTRACT-DERIVATION.md` — current native-parser reference; in-scope (native-parser CHANGED this delta — verify the README reflects the M6.5/M6.7 D-class additions on next read).
- `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — current roadmap; M6.7 STOP.
- `docs/changes/mcp-v0-devtools-scoping/SCOPING.md` — MCP V0 is now A-E COMPLETE; this scoping doc has been fully consumed → deref-eligible (no longer a forward reference).
- `hand-off.md`, `master-list.md`, `pa.md` — project orchestration; in-scope.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #iteration #lifecycle #mcp-v0 #spec-consolidation #s131

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
