# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-28T00:00:00Z
# scan mode: FULL_COLD_START

## Summary

Total docs scanned: ~356 (all .md files in-tree excluding node_modules, .git, archive, handOffs, dist, samples/compilation-tests, benchmarks/todomvc-*/fullstack-react)
Compliant: ~340
Non-compliant: 2
Uncertain: 7

---

## Non-compliant docs

### docs/heads-up/iteration-design-2026-05-25.md
**Reason:** content-heuristic
**Detail:** Front-matter `status: in-progress` with `findings-closed: 0` out of 8. The HU was opened at S130 (2026-05-25) for iteration design findings resolution. At HEAD (1fed5588, 2026-05-28) iteration features including `<each>` and `W-EACH-PROMOTABLE` / `W-EACH-KEY-001` ARE landed in compiler source (lints shipped in api.js stages 6.4c/6.4d). The HU may be stale — findings may now be resolved or partially resolved by landed code. The `findings-closed: 0` claim in particular may not reflect current state.
**Suggested disposition:** PA or human review; verify each finding against current SPEC + source; update front-matter to reflect landed state or deref to scrml-support if the HU work is complete.

### docs/heads-up/lifecycle-annotation-extension-2026-05-25.md
**Reason:** content-heuristic
**Detail:** Front-matter `status: in-progress` with `phase: HU resolutions per finding`. Opened S129. At HEAD, lifecycle tracker changes including Shape 1 tracker (Bug 19 RESOLVED S134), Q6-narrow (§6.8.3 LANDED S135), and related arc work are all shipped. The HU may be stale — findings may all be closed now.
**Suggested disposition:** PA or human review; verify findings against current SPEC + source; update status or deref to scrml-support.

---

## Uncertain docs (needs human review)

### docs/heads-up/spec-consolidation-2026-05-25.md
**Reason:** `status: in-progress` from S129 (2026-05-25). Spec consolidation work (S129 arc) may or may not have completed. Cannot determine closed/open state from filename or header alone.
**What to check:** grep known-gaps + master-list §0.6 for "spec-consolidation" completion signal; update status or deref.

### compiler/native-parser/M5-SWAP-residual-decomposition.md
**Reason:** describes a decomposition plan for M5-swap; M5 landed but M6.6 arc is still in progress. Some residual items may be complete; others may still be open. The doc is a planning artifact co-located with active code.
**What to check:** verify each line-item in the residual decomposition against the landed M6.6 arc commits; strike completed items or add resolved-sha markers.

### compiler/native-parser/M5-divergence-ledger.md
**Reason:** a divergence ledger for the M5 arc. M5 has shipped but M6 (Acorn removal) has not. Content may be partially stale — divergences resolved by M5 landing may still show as open.
**What to check:** review each tracked divergence against current native-parser state; mark resolved items.

### compiler/native-parser/M5-ast-bridge-scoping.md
**Reason:** scoping doc for M5 AST bridge work. Content may be stale if bridge work has shipped or been superseded by M6.6 arc direction.
**What to check:** verify the scoping is still an active work item or deref to scrml-support if the bridge design is settled.

### docs/audits/scope-c-findings-tracker.md
**Reason:** opened S42 (2026-04-25). Long-running findings tracker. Scope C work is substantially complete at HEAD; individual findings may be stale (closed by subsequent sessions) or remain genuinely open.
**What to check:** audit each finding entry against known-gaps.md and master-list §0.6 close history; retire closed entries or confirm genuinely open ones.

### docs/curation/2026-05-05-changes-dir-disposition.md
**Reason:** a curation/disposition doc dated 2026-05-05. Some changes-dir entries may have been actioned since then; the doc may describe a past-state disposition.
**What to check:** verify each named item against current `docs/changes/` directory state; if all items actioned, deref to scrml-support.

### docs/changes/m6.4-disposition.md
**Reason:** disposition doc for M6.4. M6.4 work has shipped per changelog (M6.6 arc is the current native-parser work). This doc may be a closed planning artifact with no current live status.
**What to check:** if M6.4 is fully shipped with no open items, deref to scrml-support/archive.

---

## Current-Truth Assessment of Key Docs

These docs were specifically checked per the invocation brief and are COMPLIANT:

| Doc | Status | Notes |
|---|---|---|
| `compiler/SPEC.md` | COMPLIANT | 30,604 lines; last substantive update S132 (§29 Nominal reframe); §34.1 native-parser codes all in-tree at `native-parser/parse-stmt.js` + `parse-expr.js`; §19.9.9 multi-batch CPS matches `cps-batch-planner.ts`; §6.8.3 reset×lifecycle matches `type-system.ts` Q6-narrow |
| `compiler/SPEC-INDEX.md` | COMPLIANT | Last regenerated S90 M-7C-D-12; section count 58+appendices; line anchors approximate per header warning |
| `compiler/PIPELINE.md` | COMPLIANT | v0.7.2 (2026-05-18); all stages present match api.js pipeline; Stage 6.7 VSS composite narrative accurate |
| `docs/PA-SCRML-PRIMER.md` | COMPLIANT | Last updated 2026-05-23 (S122); all referenced functions/features verify in source; "if primer disagrees with SPEC, SPEC is authoritative" safety clause present |
| `docs/known-gaps.md` | COMPLIANT | Updated 2026-05-28 (v0.6.6 / S139); Bug 51 FULLY RESOLVED marked correctly (all 3 sub-bugs); HIGH=0; MED=5; LOW=12; Nominal=7 |
| `docs/changelog.md` | COMPLIANT | Current baseline v0.6.6 (2026-05-28); v0.6.3–v0.6.6 blocks all present; test counts match |
| `master-list.md` | COMPLIANT | §0 dashboard reflects S138/S139 state; v0.2.0 migration phases accurately marked; §0.6 surfaced-divergences current |
| `hand-off.md` | COMPLIANT — not audited in detail | Per-session hand-off doc; current-truth scope not applicable |
| `gaunt.md` | COMPLIANT — not audited in detail | Gauntlet reference; assumed current |

## Tags
#non-compliance #project-mapper #cleanup #scrmlts

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
