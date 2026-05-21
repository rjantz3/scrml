# scrmlTS — Session 115 (CLOSE)

**Date:** 2026-05-21
**Previous:** `handOffs/hand-off-117.md` (S114 CLOSE — rotated at S115 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S115 OPEN:** `092fa90a` (S114 wrap) · **HEAD at S115 CLOSE:** `6d28607d` (M1.6) + this wrap
**Origin sync at CLOSE:** scrmlTS — wrap+push · scrml-support — wrap+push.

---

## S115 net outcome — an enormous session

S115 ran as a work-horse session: the M5/M6 compressed-MD-ladder opened end-to-end (v0.5 cut COMPLETE + v0.6 bridge units F1/F7/F8 landed), the Ext 1 multi-batch CPS body-split shipped COMPLETE (M1.1-M1.6), two compiler-concept deep-dives produced the build-story articulation, the published "Living Compiler" article was retracted, all 12 dev.to articles were audited + fixed, and the scrml-support corpus got a currency sweep + a ratified doc-currency convention.

- **20 substantive commits on scrmlTS + this wrap; 3 on scrml-support.**
- **Tests:** S115 OPEN 17,842 → **S115 CLOSE 18,102 pass / 0 fail / 169 skip / 1 todo / 738 files** (+260; zero regressions).
- **No release tag this session** — v0.4.0 stands (S114). v0.5/v0.6 cuts are the compressed-MD-ladder; tagging happens when M5-swap/M6 land.

---

## S115 commit ledger (20 substantive + wrap)

| Commit | What |
|---|---|
| `ea97993e` | S115 open — v0.5 scope-lock (DD #27 ratified) + 3 briefs + maps refresh `092fa90a` |
| `3c21c885` | **F3** — native-parser collectHoisted analogue (v0.5) |
| `85645a93` | **F5+F6** — PGO flags + program config → downstream PRECG passes (v0.5) |
| `65157654` | **F2** — estreeType→nativeKind retire (v0.5) |
| `e6d2ae59` | v0.6 SCOPE + F1 brief |
| `849f7f7c` | **M1.1** — CPSSplit type lift to multi-batch (Ext 1) |
| `a915ad19` | **F1** — native-parser attribute tokenizer (v0.6) |
| `69cc1c69` | **M1.2** — body-DG builder (Ext 1) |
| `cf761400` | F7 brief |
| `9f1b4daa` | **M1.3** — multi-batch CPS planner (Ext 1) |
| `0c84e407` | F8 brief |
| `8dc35f5f` | Living Compiler retraction DRAFT |
| `80d5dc13` | dev.to article truthfulness audit |
| `73d0ec4f` | scrml-support corpus currency sweep |
| `74873482` | **M1.4** — per-batch monotonicity classifier lift (Ext 1) |
| `053d944c` | **M1.5** — multi-stub emit + client-wrapper multi-await (Ext 1) |
| `68a805ac` | **F7** — native-parser state/SQL/CSS sub-parsers (v0.6) |
| `200737e1` | **F8** — native-parser meta + error-effect payloads (v0.6) |
| `e72e41c8` | dev.to article truthfulness fix pass (11 articles) |
| `6d28607d` | **M1.6** — SPEC §19.9.9 multi-batch CPS ratification — **Ext 1 COMPLETE** |

scrml-support: `7e897ce` (user-voice S115 — DD #27) · `f287559` (doc-currency convention + 3 STALE-AND-CITED markings) · this wrap's user-voice S115-CLOSE append.

---

## THREAD 1 (COMPLETE S115) — M5/M6 compressed MD ladder, v0.5 cut + v0.6 bridge

DD #27 (`scrml-support/docs/deep-dives/m5-m6-scope-revision-2026-05-21.md`) ratified S115 — compressed MD ladder, all 4 pivots as recommended. SCOPE docs: `docs/changes/m5-v0.5-compressed-ladder/SCOPE.md` (v0.5) + `SCOPE-v0.6.md`.

**v0.5 cut — COMPLETE:** F2 (estreeType→nativeKind retire, dual-mode codegen kind-tests), F3 (native-parser collectHoisted analogue), F5+F6 (PGO has* flags + authConfig/middlewareConfig relocated to a downstream PRECG stage in api.js). F4 (SpanTable) + F9 (switch scanner) — retirements realized at M6, no v0.5 work.

**v0.6 bridge units — F1/F7/F8 ALL LANDED:** F1 (native attribute tokenizer — `tag-frame`/`parse-markup`), F7 (state/SQL/CSS native sub-parsers — `parse-state-body`/`parse-sql-body`/`parse-css-body`), F8 (meta + error-effect payloads — `parse-error-body` + downstream dual-mode `isMetaKind`/`isErrorEffectKind`).

**M5-swap — HELD for S116 (the v0.6 milestone).** F1+F7+F8 done → M5-swap is unblocked: the native parser swaps in behind `--parser=scrml-native` past M5-LIGHT. Held per PA rec — it deserves a deliberately-authored brief, NOT a rushed one. **S116 OPENS with: author the M5-swap brief + dispatch.** The brief MUST include the SPEC §34 reconciliation for the native-parser `E-STMT-*`/`E-EXPR-*` codes (per SCOPE-v0.6 + the S115 maps non-compliance #5).

**M6** — joint retirement (BS + Acorn + BPP + ast-builder + statechild re-tokenizers + buildSpanTable + findForbiddenSwitchInRaw). After M5-swap + soak.

## THREAD 2 (COMPLETE S115) — Ext 1 multi-batch CPS body-split

EXT-1-IMPL-BRIEF.md — 6-sub-step chain, all 6 LANDED end-to-end:
- **M1.1** `849f7f7c` — CPSSplit interface→class + CPSBatch + back-compat getter.
- **M1.2** `69cc1c69` — body-DG builder (NEW `body-dg-builder.ts`, statement-grain, 5 edge kinds).
- **M1.3** `9f1b4daa` — multi-batch planner (NEW `cps-batch-planner.ts`); machine-crossing has no false-positive surface.
- **M1.4** `74873482` — per-batch monotonicity lift.
- **M1.5** `053d944c` — multi-stub emit + client-wrapper multi-await; added `CPSSplit.topoOrder`.
- **M1.6** `6d28607d` — SPEC §19.9.9 ratification + §34 +2 (`E-CPS-MULTIBATCH-REORDER`, `E-CPS-MULTIBATCH-MACHINE-CROSSING`).

Ext 3 + Ext 2 (the rest of the full-body-split family) — briefs NOT authored; queued. Ext 3 depends on Ext 1 M1.1/M1.2/M1.4; Ext 2 depends on Ext 1 + Ext 3.

## THREAD 3 (COMPLETE S115) — compiler-concepts deep-dives + the build-story articulation

Two `scrml-deep-dive` DDs landed in `scrml-support/docs/deep-dives/`:
- `code-import-story-and-vendoring-2026-05-21.md` — incl. a general adopter-facing vendoring design (Approach A: content-addressed `vendor:` units + capability manifests); §29 researched both-branches (no pre-decision). One-paragraph synthesis delivered.
- `compiler-story-living-compiler-2026-05-21.md` — the build-story model. One-paragraph synthesis delivered. Determinism gap finding: the pure-function claim is "sound as target, not currently true" (§47 excludes the compiler from the hash — S92).

**Naming ratified S115:** "build story" is the term ("scrml's compiler has a story"). "living compiler" DITCHED as the brand. **The nominal/asterisk convention** ratified — docs describing design carry a "Nominal" banner; `*` marks design-not-yet-actual clauses; footnotes state the gap never the plan.

**3 debates RECOMMENDED, NONE RUN** (queued for user's call): (1) build-story artifact — flat lockfile vs Merkle closure (simplicity-defender / security-expert / unison-expert — all loaded); (2) §29 disposition; (3) vendoring capability-manifest. §29 + vendoring debates need 1-2 experts forged.

## THREAD 4 (COMPLETE S115) — article truthfulness + the Living Compiler retraction

- **Living Compiler retraction** — `docs/articles/living-compiler-retraction-devto-2026-05-21.md`. DRAFT, "written by Claude, rubber-stamped by Bryan." **PENDING Bryan's stamp + publish — PA does NOT publish.** Retracts the metric-graduated transformation-registry mechanism (determinism + supply-chain + Approach C). Includes a correction banner for the original dev.to post.
- **dev.to article audit** `80d5dc13` — `docs/audits/article-truthfulness-audit-2026-05-21.md`. 12 articles classified.
- **dev.to fix pass** `e72e41c8` — 11 articles corrected (8-article Living-Compiler link-scrub, de-versioned banners, per-article annotations). `mutability-contracts` was reclassified REWRITE→FIX after SPEC-verification rejected 3 of the 5 REWRITE-justifying claims.

## THREAD 5 (COMPLETE S115) — scrml-support corpus currency sweep

- Sweep `73d0ec4f` — `docs/audits/scrml-support-currency-sweep-2026-05-21.md`. 3 STALE-AND-CITED found.
- Convention + markings `f287559` (scrml-support) — the doc-currency convention ratified into `pa-scrmlTS.md` (the `status:` enum + `last-reviewed:` + `superseded-by:` + the same-landing discipline); 3 STALE-AND-CITED docs marked (S43 living-compiler trio → `partially-superseded`; `server-keyword-inference-disposition` → `superseded`; `design-insights.md` Insight 25 → banner).

---

## Open questions / carry-forwards — surface at S116 OPEN

1. **M5-swap is the S116 opening move** — author the brief (incl. SPEC §34 native-parser-code reconciliation) + dispatch. The v0.6 milestone.
2. **The `.scrml`-correctness gate is an M6 precondition.** F1/F7/F8 EACH shipped a malformed predicate in the `.scrml` canonical mirror (`is not not` is not scrml — presence is `is some`; PA caught + fixed all 3 at landing). The native-parser `.scrml` tier is NOT test-run — only the `.js` shadows run. M6 self-host makes the `.scrml` files the running compiler → the `.scrml` tier needs a real compile-check gate BEFORE M6. PA memory `feedback_native_parser_scrml_predicate_drift.md` saved.
3. **Living Compiler retraction — pending Bryan's stamp + publish.** The draft is committed; publishing is a user action.
4. **scrml.dev canonicalization** — the article follow-on: port the surviving dev.to articles to canonical `.scrml` pages on scrml.dev, dev.to carries references. ~5 already have `.scrml` versions under `docs/website/pages/articles/`; the rest need porting. NOT started.
5. **3 debates queued** — build-story artifact / §29 / vendoring capability-manifest. User's call whether/when to run; §29 + vendoring need experts forged.
6. **ADR + gauntlet-report follow-on sweep** — the S115 currency sweep flagged these as carrying the same write-once risk; not audited. Follow-on if wanted.
7. **Ext 3 + Ext 2 briefs** — not authored; the rest of the full-body-split family, queued.
8. **Pre-existing carry-forwards (from S114):** generator (`yield`/`function*`) policy; tableFor v1.next impl; PRIMER match-block section; the MK4 lazy-require ESM cycle.

---

## Things S116 PA must NOT screw up

- **M5-swap brief must include the SPEC §34 native-parser-code reconciliation.** Don't dispatch M5-swap without it.
- **Native-parser dispatches: grep the `.scrml` files for `is not not` at every landing** (always a bug → `is some`). The `.scrml` tier is unverified. Memory `feedback_native_parser_scrml_predicate_drift.md`.
- **The Living Compiler retraction is a DRAFT.** Do not treat it as published. Bryan stamps + publishes.
- **DD #27's compressed MD ladder is the M5/M6 path** — v0.5 done, v0.6 = F1/F7/F8 (done) + M5-swap + M6.
- **Ext 1 is COMPLETE.** Ext 3 / Ext 2 are the remaining full-body-split family — separate, briefs unauthored.
- **The doc-currency convention is now a pa.md standing rule** — when landing a superseding deep-dive/insight, mark the old doc IN THE SAME LANDING.

---

## State-as-of-CLOSE

| Item | Status |
|---|---|
| HEAD | `6d28607d` (M1.6) + this wrap commit |
| Tests | **18,102 pass / 0 fail / 169 skip / 1 todo / 738 files** (S115 CLOSE; +260 over S114) |
| v0.5 cut | COMPLETE (F2/F3/F5/F6) |
| Ext 1 | COMPLETE end-to-end (M1.1-M1.6) |
| v0.6 | F1/F7/F8 landed; M5-swap held for S116; M6 after |
| Worktrees | main only (all 13 S115 agent worktrees cleaned at this wrap) |
| scrmlTS origin sync | pushed through this wrap |
| scrml-support origin sync | pushed through this wrap |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.4.0 (v0.4.0 tag stands — S114) |
| `.claude/maps/` | watermark `092fa90a` (S115 OPEN refresh); ~20 commits behind — refresh at S116 before any dev dispatch |
| Background agents at wrap | none |

---

## Session-start checklist for S116 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL — note the NEW "Doc-currency convention" standing rule (S115).
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
3. Read `compiler/SPEC-INDEX.md` IN FULL — note §19.9.9 NEW (multi-batch CPS, S115) + §34 +2 CPS codes.
4. Read `master-list.md` §0 IN FULL.
5. Read this `hand-off.md` (S115 CLOSE) — rotate to `handOffs/hand-off-<N>.md` at S116 OPEN.
6. Read the most-recent ~10 contentful user-voice entries — S115 has a large multi-part entry (DD #27 + the build-story naming + nominal convention + retraction + article-audit + doc-currency convention).
7. Sync hygiene: `git fetch` scrmlTS + scrml-support (both pushed through this wrap).
8. Maps refresh — watermark `092fa90a`, HEAD ~20 ahead. Refresh before any S116 dev dispatch.
9. Report: caught up + next priority (= author the M5-swap brief + dispatch).

---

## Tags
#session-115 #CLOSE #v0.5-complete #ext-1-complete #v0.6-bridge-F1-F7-F8
#m5-swap-held #build-story #living-compiler-retracted #doc-currency-convention
#article-audit #scrml-support-sweep #20-landings #pushed
