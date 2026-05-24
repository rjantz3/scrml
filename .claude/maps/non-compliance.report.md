# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-24T00:00:00Z
# scan mode: INCREMENTAL_UPDATE (delta scan 73dd816c → dc073b94)

## Summary

Total docs scanned (delta + carry-forward): ~297 `.md` files (excluding node_modules, .git, .jj, .claude, archive, handOffs, dist/build/target).
Compliant: ~17 (core spec, READMEs, reference docs, in-flight + completed progress artifacts).
Non-compliant: 5 categories (unchanged from prior scan — no new category surfaced at HEAD).
Uncertain: 3 (unchanged).

SPEC.md modification watermark: 2026-05-23 (current; unchanged across this delta — the 7 commits touched no SPEC.md section). The M6.5.b.1/b.2 + MCP-V0.A/B work introduced NO new §34/§34.1 diagnostic codes and NO spec sections.

## Delta Scan (7 commits: 73dd816c → dc073b94)

Docs changed in this delta and their disposition:
- MODIFIED `docs/changelog.md` — current changelog; compliant.
- MODIFIED `docs/changes/m65-path-b-adapter-scoping/progress.md` — active SCOPING progress artifact; compliant placement (docs/changes/** aggregate).
- NEW `docs/changes/mcp-v0-devtools-scoping/progress.md` — in-flight progress artifact for MCP V0; compliant.
- MODIFIED `hand-off.md`, `master-list.md`, NEW `handOffs/hand-off-127.md` — project orchestration; handOffs/ is explicitly out-of-scope (not scanned for compliance); hand-off.md + master-list.md are in-scope orchestration, compliant.

**Compliance-status SHIFT worth flagging:** the prior report stated "MCP V0 SCOPING correctly self-identifies as planning-only." That is now PARTIALLY STALE in framing: MCP V0 is no longer planning-only. As of S125, Sub-unit A (`compiler/src/codegen/mcp-descriptors.ts` + api.js wiring) and Sub-unit B (`compiler/runtime/stdlib/mcp.js`) are IMPLEMENTED. The `docs/changes/mcp-v0-devtools-scoping/SCOPING.md` doc itself remains a valid forward-looking scoping reference for the still-pending Sub-units C/D — it is NOT non-compliant (it scopes work that is genuinely future: the 11-tool surface + MCP server boot). No action needed; recorded so a future scan does not re-flag SCOPING.md as "describes unimplemented features" when ~40% of it is now landed.

No newly-flagged stale-claim docs in this delta. The new source surfaces (`mcp-descriptors.ts`, `mcp.js`, the M6.5.b.1/b.2 parser changes) are all backed by code grep-verifiable against the maps and have tests (Sub-unit B + M6.5.b.1/b.2) or pending tests (Sub-unit A — the next dispatch).

## Non-compliant docs (carried forward — unchanged at HEAD)

### docs/changes/** (~232+ files across ~122+ directories)
**Reason:** location + name-heuristic (combo)
**Detail:** Every directory under `docs/changes/` is a per-dispatch artifact set (BRIEF.md, SCOPE.md, progress.md for completed or in-flight work). This delta added/modified: mcp-v0-devtools-scoping (progress), m65-path-b-adapter-scoping (progress). All fall into the same aggregate class as prior scans. The standing curation matrix at `docs/curation/2026-05-05-changes-dir-disposition.md` dispositions these to `scrml-support/archive/dispatches/`. Newly-completable arcs (MCP-V0.B, M6.5.b.1) are eligible for post-session deref once their parent milestone closes; m65-path-b-adapter-scoping + mcp-v0-devtools-scoping remain actively-in-flight (M6.5.b.2 PARTIAL; MCP Sub-units C/D pending) and should stay.
**Suggested disposition:** deref completed-arc dirs to scrml-support/archive/dispatches/; keep actively-in-flight dirs. Batched deref after M6.8 + MCP-V0 close is cleaner than per-dir handling.

### docs/website/roadmap-from-v0.3-2026-05-14.md
**Reason:** content-heuristic + name-heuristic
**Detail:** `status: draft`; adopter-facing roadmap describing aspirational direction from v0.3. Package.json is now v0.6.0. Predates current state by 3 minor versions.
**Suggested disposition:** deref to scrml-support/docs/.

### docs/website/v0.2.0-announce-2026-05-05.md  and  docs/website/v0.3.0-announce-2026-05-14.md
**Reason:** location + currency
**Detail:** Version-announcement copy for superseded releases.
**Suggested disposition:** deref both to scrml-support/docs/ (or archive v0.2.0).

### docs/audits/** (11 audit docs)
**Reason:** location
**Detail:** articles-currency-table, article-truthfulness-audit, compiler-forgotten-surface, null-audit, undefined-audit, wave-3-7-corpus-ouroboros, self-host-spec-conformance, happy-dom-perf-regression, scrml-dev-content-spec-fidelity, scrml-support-currency-sweep, scope-c-findings-tracker. Point-in-time investigation artifacts that belong in scrml-support per the "audits live in scrml-support" rule.
**Suggested disposition:** deref to scrml-support/docs/ (or scrml-support/archive/). scope-c-findings-tracker.md may still be live — see Uncertain.

### docs/curation/2026-05-05-changes-dir-disposition.md
**Reason:** location + currency
**Detail:** Curation matrix (S61) for the docs/changes/ deref. Snapshot count ("103 dirs total") is stale — docs/changes/ is now ~122+ dirs / 232+ .md files.
**Suggested disposition:** deref to scrml-support/docs/ once the docs/changes/ deref is executed; or update count and keep as standing checklist.

## Uncertain docs (needs human review — carried forward)

### docs/known-gaps.md
**Reason:** This doc explicitly catalogs spec-vs-implementation drift — by construction it describes things the compiler does NOT yet do. Looks non-compliant under grep cross-check but is the intentionally-maintained drift ledger.
**What to check:** Confirm whether known-gaps.md should stay as a project-repo reference (current-state-honest) or move to scrml-support. Recommendation: KEEP — it is the opposite of aspirational-pretending-to-be-current.

### docs/pinned-discussions/w-program-001-warning-scope.md
**Reason:** "pinned discussion" is debate-shaped, which the scope rule says belongs in scrml-support. But "pinned" suggests an intentionally-retained active design note.
**What to check:** Determine if the W-PROGRAM-001 scope question is resolved. If resolved, deref to scrml-support/docs/. If still open, keep.

### docs/external-js.md  and  docs/lin.md
**Reason:** Reference-shaped docs (external-js integration; `lin` token feature) but not cross-checked at scan time.
**What to check:** Grep identifiers each cites against compiler/src. Both features resolve in source (`LinDeclNode` in ast.ts; `LinDecl` StmtKind in native parser; api.js handles .js imports) — recommend KEEP pending quick grep confirmation.

## Notes on compliant / in-scope docs (NOT flagged)

- `compiler/SPEC.md`, `SPEC-INDEX.md`, `PIPELINE.md` — authoritative spec; mapped.
- `README.md`, `DESIGN.md`, `docs/tutorial.md`, `docs/changelog.md`, `scrmlFormula.md` — current reference.
- `docs/PA-SCRML-PRIMER.md` — adopter-side primer; in-scope.
- `compiler/native-parser/README.md`, `M5-ast-bridge-scoping.md`, `M5-divergence-ledger.md`, `M5-SWAP-residual-decomposition.md` — current native-parser reference; in-scope.
- `compiler/native-parser/M6.6-CONTRACT-DERIVATION.md` (540L) — current cookbook for M6.6.b.4..b.6; in-scope.
- `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — current roadmap; updated M6.7 STOP; in-scope.
- `docs/changes/mcp-v0-devtools-scoping/SCOPING.md` — forward-looking scoping for still-pending MCP Sub-units C/D; ~40% now landed (A+B); remains a valid forward reference — in-scope.
- `docs/changes/m65-path-b-adapter-scoping/SCOPING.md` — active scoping for the M6.5.b adapter arc (b.2 PARTIAL); in-scope.
- `compiler/src/codegen/README.md`, `compiler/tests/.../REGISTRY.md`, `compiler/tests/commands/migrate-program-shape-fixtures/README.md` — module-local reference; in-scope.
- `hand-off.md`, `master-list.md`, `pa.md` — project orchestration; in-scope.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #mcp-v0 #s125

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
