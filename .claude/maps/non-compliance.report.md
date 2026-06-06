# non-compliance.report.md
# project: scrmlts
# generated: 2026-06-06T08:10:00Z
# scan mode: INCREMENTAL_UPDATE (watermark e947c924 → 9d12d980, S166 native-parser re-triage roots)
# prior scans: INCREMENTAL_UPDATE at e947c924 (S164-late + S165); 97fe2199 (S157-S158); 57edc794 (S154-S156); c665714c (S153); FULL_COLD_START at 948d3f2f (2026-05-30)

## Summary

Total docs scanned (incremental delta — new/modified docs e947c924 → 9d12d980, excl. handOffs/): 5 new + 2 modified
Compliant (new docs): 5
Non-compliant (new findings): 0
Uncertain / locus-drift flags (new findings): 0
Carried uncertain (Bug 69 / NON-GAP tension + spec-consolidation TBD): 2 (unchanged)
Carried locus-drift flags (F2 parse-sql-body pointer + B2 superseded BRIEF): 2 (unchanged — still in-flight family records)

The S166 delta is exactly two source landings (`76059024` bare-`function` failable, `9d12d980`
cross-file `${...}`-export raw-slice) plus their dispatch archives and a re-triage map. Every key
identifier in the new docs grep-resolves in current source — they are COMPLIANT historical dispatch
records, same class as the S164-S165 archives. No new aspirational/draft/proposal docs entered the repo.

## New Docs S166 — Compliant (identifiers verified against current source)

- `docs/changes/native-bare-function-failable-2026-06-05/` (BRIEF.md + progress.md) — `parseFunctionDecl` (parse-stmt.js:1695, consumes trailing `!` + error-type), `makeFunctionDecl` 7th-arg `{canFail,errorType}` (ast-stmt.js — `canFail` ×3 present), `E-STMT-FN-ERROR-TYPE` (parse-stmt.js ×2). LANDED `76059024`. BANKED items (native empty `fail X::V(arg)` envelope, native `renders ${id}` interpolation break) are explicitly flagged STOP-IF-DIVERGENT in the BRIEF — not claimed-landed.
- `docs/changes/native-cross-file-export-2026-06-05/` (BRIEF.md + progress.md) — `synthExportDecl` (collect-hoisted.js ×6), `bodyStart` (parse-markup.js ×36, collect-hoisted.js ×20, within-node-classifier.ts ×1 STRIP_KEYS). LANDED `9d12d980`. ROOT-1 (exported-inner-decl reaching codegen) is documented as agent-reverted + deferred, not claimed-landed.
- `docs/changes/native-swap-retriage-s166/TRIAGE.md` — the S166 re-triage map; ROOT-1/ROOT-2 decomposition present; the next-pick family signatures it carries point at the same loci the maps now record. COMPLIANT triage record.

New test coverage all grep-resolves (COMPLIANT):
- `compiler/tests/integration/m6.4a-native-p2-form1.test.js` §B — emitted-output regression for the cross-file `${...}`-export raw-slice fix (`<Badge/>` expands; E-COMPONENT-020/035 GONE).

## Cross-cutting note for the fix-dispatch agent (LOCUS-RELIABILITY) — UNCHANGED, REINFORCED BY S166

`docs/changes/native-swap-triage-s164/TRIAGE.md` records a LOCUS-RELIABILITY NOTE: the triage's pointed
loci have been wrong before (F2 → pointed parse-sql-body.js, fix was translate-stmt.js; lift-closetag →
pointed parse-expr span, fix was lex-in-code.js). **S166 adds a fresh data point in the OTHER direction:**
the cross-file export ROOT-2 fix turned out to be the SAME off-by-opener class as M6.7-C1
`synthComponentDef` — a pattern-match to a PRIOR fix was the reliable signal, while ROOT-1's emit-fix
"worked" locally yet surfaced a 58-fixture within-node divergence (the byte-diff caught it, not the locus
reasoning). The reliable signal remains the EMPIRICAL SYMPTOM (default exit-0 vs `--parser=scrml-native`
fail/miscompile + the byte-diff), NOT the locus pointer. The maps propagate this: re-run the flip harness
to re-rank before picking, and treat any locus pointer (BRIEF/triage) as a hypothesis to verify in Phase 0.
This matches the global memory lesson (cookbook/SCOPING/triage claims may be empirically wrong;
cross-reference an empirical probe before encoding into a dispatch brief).

## Carried Locus-Drift Flags (READ BEFORE THE NEXT NATIVE-PARSER FIX DISPATCH) — unchanged

### docs/changes/native-sql-body-server-fn-f2-2026-06-04/BRIEF.md — STALE LOCUS POINTER (in-flight family)
**Reason:** locus-drift — the BRIEF names `parse-sql-body.js` as where native drops the `?{}` SQL body in
`server function` bodies. The S164 TRIAGE CORRECTED this: the real loci are `translate-stmt.js` (chained
form — F2a, LANDED `7e54f321`) and `translate-expr.js translateSql`. `parse-sql-body.js` is UNTOUCHED
since 2026-05-21 (not changed in this delta either). F2 status at S166: F2a chained-form CLOSED; F2-generator
`server function*` SQL addressed by S165 server-fn-star lift (`26a24b71`). Remaining F2 OPEN sub-roots:
top-level server-fn `?{}` body-drop + assign-RHS `@x = ?{}.all()` (state-decl-routed, E-RI-002).
**Suggested disposition:** KEEP (in-flight family record); a fix-dispatch agent targeting F2 MUST read the
TRIAGE's corrected decomposition + re-run the flip harness, NOT trust this BRIEF's parse-sql-body.js pointer.

### docs/changes/native-engine-message-arm-b2-2026-06-04/BRIEF.md — SUPERSEDED (earlier framing of LANDED work)
**Reason:** an earlier standalone B2-only framing rolled into the combined `native-f1narrow-b2-msgarm-2026-06-04`
dispatch (carries progress.md + landed `7cbad5dd`). Its identifiers all resolve; it accurately describes work
that LANDED. Its "flag B2 as THE NEXT DISPATCH" line is now stale (B2 CLOSED S164) — internal-to-BRIEF
historical context, not a live map.
**Suggested disposition:** KEEP as historical dispatch record; no action. Map prose is accurate (B2 LANDED/CLOSED).

## Modified Docs in Delta — Compliant

- `docs/changelog.md`, `hand-off.md`, `master-list.md`, `handOffs/hand-off-170.md` — session-tracking docs; S166 entries match the two landed commits (`76059024`, `9d12d980`). `handOffs/` is out-of-scope per scope rules (historical hand-offs) — noted, not mapped.
- `.claude/maps/{primary,structure,domain,test}.map.md` — refreshed THIS pass to 9d12d980 (the subject of this report).

## Uncertain Docs — Carried (unchanged)

### hand-off.md (Bug 69 / NON-GAP tension)
**Reason:** Map-level inconsistency between two authoritative documents (carried since S156).
**Detail:** user said "fold Bug 69 in too" (tableFor §41.16.6 subset reach) at S156; the S156 CLOSE DONE
block classified Bug 69 as "NON-GAP (display-subset-irrelevant for v1.0)." Maps written consistent with the
DONE block (batch 5 not scheduled).
**What to check:** Confirm with user whether (d)-A batch 5 (Bug 69 / tableFor subset reach in
`emit-table-for.ts` `_processTableForNode`) runs, or Bug 69 is retired NON-GAP.

### docs/heads-up/spec-consolidation-2026-05-25.md — UNCERTAIN (carried)
**Reason:** frontmatter `status: in-progress`; Phase 2 amendment TBD landings (§6.10, §52.4, §55) not executed.
**What to check:** whether the open TBD landings are scheduled or deferred-indefinitely.

## Prior FULL_COLD_START Non-compliant (at 948d3f2f — unchanged; dispositions still pending PA action)

- compiler/native-parser/M5-SWAP-residual-decomposition.md — content-heuristic + spec-draft (`status: superseded`) → deref to scrml-support/archive/
- compiler/native-parser/M5-ast-bridge-scoping.md / M5-divergence-ledger.md — UNCERTAIN: the S153 "does NOT promote each/match" precondition these docs encode is CLOSED (S162). These M5 docs predate every S162-S166 native landing and describe a stale bridge contract. NOTE S166: the cross-file `${...}`-export raw-slice fix touched the same hoist/bridge surface (`synthExportDecl` raw-slice anchoring) these docs describe — another reason to verify/refresh-or-deref before trusting their bridge-contract prose.
- compiler/native-parser/M6.6-CONTRACT-DERIVATION.md — verify M6.6.b.1 contract is current (predates S163-S166 substrate + parity-closer landings)
- docs/changes/v0next-inventory/{SCOPE-MAP,SCOPE-SUPPLEMENT,ARTICLE-TRUTHFULNESS-AUDIT} — content-heuristic + location → deref to scrml-support/archive/
- docs/audits/* (articles-currency-table, wave-3-7-corpus-ouroboros, scrml-support-currency-sweep, self-host-spec-conformance, scrml-dev-content-spec-fidelity, spec-consolidation-inventory, spec-corroboration-canons-pipeline, spec-feature-canon-coverage) — location (belong in scrml-support/docs or /archive)
- docs/changes/{match-block-form-scoping,serialize-scoping,v0.3.x-spa-tree-shake,schemaFor-impl,tilde-codegen,tilde-gaps-567,v0.3-approach-a-spec}/SCOPING/SURVEY — planning/closed arcs → verify-or-deref

(Full per-doc dispositions retained from the 948d3f2f FULL_COLD_START scan — see git history of this file.)

## Infra Note — map header-commit drift

### .claude/maps/{dependencies,config,build,error,schema}.map.md — HEADER STALE (content current-but-unverified)
The S166 delta touched ONLY native-parser `.js` (parse-stmt.js, collect-hoisted.js, parse-markup.js) +
native-parser-canary `within-node-classifier.ts` (STRIP_KEYS) + one integration test. It added NO new
PERSISTENT error codes to the catalog (the new native `E-STMT-FN-ERROR-TYPE` string fires only on a
malformed `! ->` in the native parse path; E-COMPONENT-020/035 now CORRECTLY no-longer-mis-fires on
`${...}`-wrapped cross-file exports under native — both are behavior corrections, not catalog additions),
NO new live `ast.ts` AST shapes (the failable `{canFail,errorType}` rides the pre-existing B6 `makeFunctionDecl`
modifiers shape; `bodyStart` is a native-internal raw-slice coordinate stripped before within-node compare,
no live analogue), NO manifest/config/build changes. So error/schema/dependencies/config/build CONTENT
is accurate; their headers were intentionally NOT re-stamped (a header stamp implies content was re-verified
at that commit). error.map.md remains at 452a212b (S163-era); primary/structure/domain/test content-refreshed
to 9d12d980 this pass.
**Suggested disposition:** at the next FULL_COLD_START, re-stamp all map headers to a single watermark.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s166 #native-parser-swap #bare-function-failable #cross-file-export-bodystart #locus-drift #f2-sql #b2-message-arm

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [domain.map.md](./domain.map.md)
- [test.map.md](./test.map.md)
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
