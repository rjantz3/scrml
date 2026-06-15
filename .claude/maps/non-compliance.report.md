# non-compliance.report.md
# project: scrmlts
# generated: 2026-06-14  (S194 incremental — maps watermark 0cafe665 → a78272e5)
# scan mode: INCREMENTAL_UPDATE (§52 server-authority arc: fdcd7fcc + fff841ca + a78272e5)
# prior scan: INCREMENTAL_UPDATE at 9d12d980 (S166); see "Prior S166 Report (carried)" below

## Summary (S194 delta)

Scope of this scan: docs touching §52 server-authority / server-sync semantics, which the S194 arc
changed (auto-persist + compiler-generated optimistic-update + auto-rollback were RETRACTED, Q1=C/Q2=WF;
§52 is now a READ-authority layer — the persist write is the developer's own `?{}` server fn).

New non-compliant (S194-induced, content now contradicts current SPEC/source): 2
New uncertain: 0
Compliant (retraction-aware session/spec docs — verified): hand-off.md, master-list.md,
  docs/changelog.md, docs/known-gaps.md, examples/08-chat.scrml, examples/README.md, compiler/SPEC.md,
  compiler/SPEC-INDEX.md, docs/changes/g1-server-sync-codegen-2026-06-14/*

The discriminating fact: the CURRENT SPEC still mandates the compiler generate READ-authority
infrastructure (initial-load `SELECT *` on mount + SSR pre-render + E-AUTH boundary checks) — so doc
claims about initial-load / SSR remain spec-compliant (SSR-not-yet-wired is an impl-vs-spec gap surfaced
by W-AUTH-002, not a doc contradiction). What the S194 retraction KILLED is the compiler-generated
**optimistic-update path + auto-rollback + auto-persist route** (SPEC §52.6.2/.3/.4 retracted; §52.6.6
"the write is the dev's `?{}`"; SPEC.md:29065 "Why no auto-rollback"; SPEC.md:29317 "Auto-persist route /
auto-rollback | No"). Docs that still describe those three as compiler-GENERATED are now non-compliant.

## Non-compliant docs (S194-induced)

### docs/articles/components-are-states-devto-2026-04-29.md
**Reason:** spec-mismatch (content drifted under the S194 SPEC change)
**Detail:** Lines 139 + 175 claim that for a `authority="server"` state type the compiler "generates the
optimistic-update path, generates the rollback" (line 139) and "A type with `authority="server"` gets the
optimistic insert, reconcile, and rollback generated (§52)" (line 175). Post-S194 this is FALSE: the
compiler-generated optimistic-update + auto-rollback machinery was DELETED (`emitOptimisticUpdate` +
`emitServerSyncStub` removed from emit-sync.ts) and SPEC §52.6.2/.3/.4 retracted the claim — the write
(incl. any optimistic insert/reconcile/rollback) is now the developer's own `?{}` server fn. The article's
OWN embedded truthfulness annotation (line 239) justified the claim with "the claim follows the spec, which
is the article-level source of truth" — that justification is now void because the spec it followed has
been amended. The same line's "generates the initial-load query" + "pre-renders the list in SSR (§52.3)"
claims REMAIN spec-compliant (read-authority infra is still compiler-generated; SSR-not-yet-implemented is
a tracked impl gap, W-AUTH-002, not a spec contradiction).
**Suggested disposition:** update to match current §52 — replace the "generates the optimistic-update path /
rollback" wording with "generates the read-authority infrastructure (initial-load + SSR pre-render + E-AUTH
boundary checks); the persist write is the developer's own `?{}` server fn." Keep the initial-load/SSR claims.
Update the line-239 annotation. (Article is an unpublished `docs/articles/` draft dated 2026-04-29 — verify
against the dev-to-publish checklist before any publish.)

### docs/heads-up/spec-consolidation-2026-05-25.md
**Reason:** spec-mismatch (content drifted under the S194 SPEC change) + carried-uncertain (frontmatter
`status: in-progress`, §52.4 amendment was an open TBD)
**Detail:** Lines 297 + 332 + 370 describe §52.4 as: the compiler "synthesizes fetch-on-mount, optimistic
update on writes, rollback on server-error" (297), "§52.4.1 retains the semantic description of the `server`
attribute (fetch-on-mount, optimistic update, rollback, SSR pre-render)" (332), and an "optimistic update
only (server is trusted)" option (370). The "optimistic update on writes" + "rollback on server-error" as
compiler-SYNTHESIZED behavior contradicts the S194 retraction (the synthesis is gone; the write is the
dev's `?{}`). The "fetch-on-mount" + "SSR pre-render" portions remain compliant. NOTE: this doc was ALSO
already carried as UNCERTAIN in the S166 report (its §52.4 amendment was a TBD landing) — the S194 arc
effectively SETTLED the direction of that §52 TBD (auto-sync retracted), so this doc's §52 prose should now
be reconciled to the resolved outcome rather than left pending.
**Suggested disposition:** update §52 prose to the resolved S194 model (read-authority only; dev owns the
`?{}` write) OR deref to scrml-support/docs if the heads-up is a historical consolidation artifact. Resolves
the carried S166 uncertain flag in the same edit.

## Carried Uncertain (S166 — still open, unchanged by S194)

### hand-off.md (Bug 69 / NON-GAP tension)
**Reason:** Map-level inconsistency between two authoritative documents (carried since S156).
**Detail:** user said "fold Bug 69 in too" (tableFor §41.16.6 subset reach) at S156; the S156 CLOSE DONE
block classified Bug 69 as "NON-GAP (display-subset-irrelevant for v1.0)." Maps written consistent with the
DONE block (batch 5 not scheduled).
**What to check:** Confirm with user whether (d)-A batch 5 (Bug 69 / tableFor subset reach in
`emit-table-for.ts` `_processTableForNode`) runs, or Bug 69 is retired NON-GAP.

## Map header-currency note (S194 incremental)

This pass re-stamped ONLY the maps the §52 arc touched — `primary.map.md`, `structure.map.md`,
`error.map.md` → a78272e5. `domain.map.md` (7f2092cf) + `test.map.md` (7f2092cf) were NOT re-stamped:
both have ZERO §52/server-authority references (the §52 arc added no domain concept row and the new tests
live under the g1-server-sync change dir, not yet enumerated in test.map.md), so their content does not
contradict the §52 change — header left at its prior watermark per the "stamp implies re-verified" rule.
`dependencies/config/build/schema.map.md` are unaffected by §52 (no manifest/config/type-shape change).
At the next FULL_COLD_START, re-stamp all map headers to a single watermark and enumerate the S194 tests
(emit-sync / server-authority-load / __serverLoad-route canaries) in test.map.md.

---

## Prior S166 Report (carried — read before the next native-parser fix dispatch)

> The sections below are the prior INCREMENTAL_UPDATE report (watermark e947c924 → 9d12d980, S166).
> Their carried locus-drift flags + FULL_COLD_START dispositions remain LIVE and unprocessed.

### Carried Locus-Drift Flags (READ BEFORE THE NEXT NATIVE-PARSER FIX DISPATCH) — unchanged

#### docs/changes/native-sql-body-server-fn-f2-2026-06-04/BRIEF.md — STALE LOCUS POINTER (in-flight family)
**Reason:** locus-drift — the BRIEF names `parse-sql-body.js` as where native drops the `?{}` SQL body in
`server function` bodies. The S164 TRIAGE CORRECTED this: the real loci are `translate-stmt.js` (chained
form — F2a, LANDED `7e54f321`) and `translate-expr.js translateSql`. `parse-sql-body.js` is UNTOUCHED
since 2026-05-21. F2 status at S166: F2a chained-form CLOSED; F2-generator `server function*` SQL addressed
by S165 server-fn-star lift (`26a24b71`). Remaining F2 OPEN sub-roots: top-level server-fn `?{}` body-drop +
assign-RHS `@x = ?{}.all()` (state-decl-routed, E-RI-002).
**Suggested disposition:** KEEP (in-flight family record); a fix-dispatch agent targeting F2 MUST read the
TRIAGE's corrected decomposition + re-run the flip harness, NOT trust this BRIEF's parse-sql-body.js pointer.

#### docs/changes/native-engine-message-arm-b2-2026-06-04/BRIEF.md — SUPERSEDED (earlier framing of LANDED work)
**Reason:** an earlier standalone B2-only framing rolled into the combined `native-f1narrow-b2-msgarm-2026-06-04`
dispatch (carries progress.md + landed `7cbad5dd`). Its identifiers all resolve; it accurately describes work
that LANDED. Its "flag B2 as THE NEXT DISPATCH" line is now stale (B2 CLOSED S164) — internal-to-BRIEF
historical context, not a live map.
**Suggested disposition:** KEEP as historical dispatch record; no action.

### Prior FULL_COLD_START Non-compliant (at 948d3f2f — unchanged; dispositions still pending PA action)

- compiler/native-parser/M5-SWAP-residual-decomposition.md — content-heuristic + spec-draft (`status: superseded`) → deref to scrml-support/archive/
- compiler/native-parser/M5-ast-bridge-scoping.md / M5-divergence-ledger.md — UNCERTAIN: the S153 "does NOT promote each/match" precondition these docs encode is CLOSED (S162). These M5 docs predate every S162-S166 native landing and describe a stale bridge contract.
- compiler/native-parser/M6.6-CONTRACT-DERIVATION.md — verify M6.6.b.1 contract is current (predates S163-S166 substrate + parity-closer landings)
- docs/changes/v0next-inventory/{SCOPE-MAP,SCOPE-SUPPLEMENT,ARTICLE-TRUTHFULNESS-AUDIT} — content-heuristic + location → deref to scrml-support/archive/
- docs/audits/* (articles-currency-table, wave-3-7-corpus-ouroboros, scrml-support-currency-sweep, self-host-spec-conformance, scrml-dev-content-spec-fidelity, spec-consolidation-inventory, spec-corroboration-canons-pipeline, spec-feature-canon-coverage) — location (belong in scrml-support/docs or /archive)
- docs/changes/{match-block-form-scoping,serialize-scoping,v0.3.x-spa-tree-shake,schemaFor-impl,tilde-codegen,tilde-gaps-567,v0.3-approach-a-spec}/SCOPING/SURVEY — planning/closed arcs → verify-or-deref

(Full per-doc dispositions retained from the 948d3f2f FULL_COLD_START scan — see git history of this file.)

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s194 #server-authority #section-52 #auto-persist-retracted #optimistic-update-retracted #auto-rollback-retracted #spec-mismatch #devto-article-drift #spec-consolidation-drift #read-authority-only #w-auth-002-ssr-residual #s166 #locus-drift #f2-sql #b2-message-arm

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [error.map.md](./error.map.md)
- [domain.map.md](./domain.map.md)
- [test.map.md](./test.map.md)
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
