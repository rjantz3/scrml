# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-24T00:00:00Z
# scan mode: INCREMENTAL_UPDATE (delta scan 16042a30 → 3a909c1d)

## Summary

Total docs scanned (delta + carry-forward): ~302 `.md` files (excluding node_modules, .git, .jj, .claude, archive, handOffs, dist/build/target).
Compliant: ~17 categories (core spec, READMEs, reference docs, in-flight + completed progress artifacts).
Non-compliant: 5 categories (unchanged from prior scan — no new category surfaced at HEAD).
Uncertain: 3 (unchanged).

SPEC.md modification watermark: 2026-05-23 (commit 9c06053f; unchanged across this delta — the 7 commits touched no SPEC.md section). The S126/S127 codegen-correctness wave (Bug W / GITI-017/018/019 / 6nz-S) and MCP-V0.A-tests / MCP-V0.C work introduced NO new §34/§34.1 diagnostic codes and NO spec sections.

## Delta Scan (7 commits: 16042a30 → 3a909c1d)

Docs changed in this delta — all are per-dispatch progress artifacts under `docs/changes/**` (aggregate non-compliant class, already dispositioned; placement is correct for in-flight work):
- NEW `docs/changes/6nz-s/progress.md` — in-flight progress; compliant placement.
- NEW `docs/changes/giti-018/progress.md` — in-flight progress; compliant placement.
- NEW `docs/changes/mcp-v0-a-tests/progress.md` — in-flight progress; compliant placement.
- NEW `docs/changes/mcp-v0-c-stdlib/progress.md` — in-flight progress; compliant placement.
- MODIFIED `docs/changes/mcp-v0-devtools-scoping/progress.md` — in-flight MCP V0 umbrella progress; compliant.

No SPEC / README / reference doc was touched in this delta. No newly-flagged stale-claim docs. The new source surfaces (`code-segments.ts`, the `emit-binary` precedence printer, the full `mcp.js` 11-tool surface + boot, `stdlib/mcp/index.scrml`, the `@modelcontextprotocol/sdk` dep) are all grep-verifiable against the maps and are test-backed (mcp-descriptors-* x5 + mcp-server-tools + bug-w + giti-019 + not-return-statement-glue).

**Compliance-status SHIFT worth flagging (updated):** the prior report noted MCP V0 was "~40% landed (A+B)" and that SCOPING.md remained a valid forward reference. At HEAD, **MCP V0 Sub-unit C is ALSO landed** (the 11-tool surface + `startMcpServer`/`shutdownMcpServer` stdio boot in `compiler/runtime/stdlib/mcp.js`), and Sub-unit A is now fully TESTED with the A↔B contract fix applied. `docs/changes/mcp-v0-devtools-scoping/SCOPING.md` remains in-scope/compliant: it still scopes the genuinely-pending Sub-units D (`<program mcp>` opt-in wiring) and E. Recorded so a future scan does not re-flag it as aspirational when ~70% is now landed (A+B+C). The 11 LOCKED tool names are a public-API contract — any doc enumerating them should match `TOOL_NAMES` in `mcp.js` exactly.

## Non-compliant docs (carried forward — unchanged at HEAD)

### docs/changes/** (~237+ files across ~126+ directories)
**Reason:** location + name-heuristic (combo)
**Detail:** Every directory under `docs/changes/` is a per-dispatch artifact set (BRIEF.md, SCOPE.md, progress.md for completed or in-flight work). This delta added 4 NEW dirs (6nz-s, giti-018, mcp-v0-a-tests, mcp-v0-c-stdlib) + modified mcp-v0-devtools-scoping. All fall into the same aggregate class as prior scans. The standing curation matrix at `docs/curation/2026-05-05-changes-dir-disposition.md` dispositions these to `scrml-support/archive/dispatches/`. Newly-COMPLETED arcs eligible for post-session deref: 6nz-s, giti-018, mcp-v0-a-tests, mcp-v0-c-stdlib (the bugs/sub-units they track are LANDED at HEAD). m65-path-b-adapter-scoping (M6.5.b.2 PARTIAL) and mcp-v0-devtools-scoping (Sub-units D/E pending) remain actively-in-flight — keep.
**Suggested disposition:** deref completed-arc dirs (incl. the 4 new ones) to scrml-support/archive/dispatches/; keep actively-in-flight dirs. Batched deref after M6.8 + MCP-V0 full close is cleaner than per-dir handling.

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
**Detail:** Curation matrix (S61) for the docs/changes/ deref. Snapshot count ("103 dirs total") is stale — docs/changes/ is now ~126+ dirs / 237+ .md files.
**Suggested disposition:** deref to scrml-support/docs/ once the docs/changes/ deref is executed; or update count and keep as standing checklist.

## Uncertain docs (needs human review — carried forward)

### docs/known-gaps.md
**Reason:** This doc explicitly catalogs spec-vs-implementation drift — by construction it describes things the compiler does NOT yet do. Looks non-compliant under grep cross-check but is the intentionally-maintained drift ledger.
**What to check:** Confirm whether known-gaps.md should stay as a project-repo reference (current-state-honest) or move to scrml-support. Recommendation: KEEP — it is the opposite of aspirational-pretending-to-be-current.

### docs/pinned-discussions/w-program-001-warning-scope.md
**Reason:** "pinned discussion" is debate-shaped, which the scope rule says belongs in scrml-support. But "pinned" suggests an intentionally-retained active design note.
**What to check:** Determine if the W-PROGRAM-001 scope question is resolved. If resolved, deref to scrml-support/docs/. If still open, keep.

### docs/external-js.md  and  docs/lin.md
**Reason:** Reference-shaped docs (external-js integration; `lin` token feature) but not cross-checked at this scan.
**What to check:** Grep identifiers each cites against compiler/src. Both features resolve in source (`LinDeclNode` in ast.ts; `LinDecl` StmtKind in native parser; api.js handles .js imports) — recommend KEEP pending quick grep confirmation.

## Notes on compliant / in-scope docs (NOT flagged)

- `compiler/SPEC.md`, `SPEC-INDEX.md`, `PIPELINE.md` — authoritative spec; mapped. Unchanged this delta.
- `README.md`, `DESIGN.md`, `docs/tutorial.md`, `docs/changelog.md`, `scrmlFormula.md` — current reference.
- `docs/PA-SCRML-PRIMER.md` — adopter-side primer; in-scope.
- `compiler/native-parser/README.md`, `M5-ast-bridge-scoping.md`, `M5-divergence-ledger.md`, `M5-SWAP-residual-decomposition.md`, `M6.6-CONTRACT-DERIVATION.md` — current native-parser reference; in-scope (native-parser unchanged this delta).
- `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — current roadmap; M6.7 STOP; in-scope.
- `docs/changes/mcp-v0-devtools-scoping/SCOPING.md` — forward-looking scoping for still-pending MCP Sub-units D/E; ~70% now landed (A+B+C); remains a valid forward reference — in-scope.
- `docs/changes/m65-path-b-adapter-scoping/SCOPING.md` — active scoping for the M6.5.b adapter arc (b.2 PARTIAL); in-scope.
- `compiler/src/codegen/README.md`, `compiler/tests/.../REGISTRY.md` — module-local reference; in-scope.
- `hand-off.md`, `master-list.md`, `pa.md` — project orchestration; in-scope.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #mcp-v0 #mcp-server #s127

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
