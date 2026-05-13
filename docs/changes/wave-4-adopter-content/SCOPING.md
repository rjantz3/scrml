# Wave 4 — adopter content SCOPING

**Status:** SCOPED — awaits PA dispatch sequencing.
**Authority:** S89 dispatch (user verbatim "1 all" authorizing marketing-shaped Wave-4 work per pa.md Rule 1; ratified S88 as v0.3.0 cut blocker per "Wave 4 adopter content is a v0.3.0 cut blocker").
**HEAD at scoping:** `9b98118` (S88 close).
**Author:** PA-dispatched scoping agent (agent-a2b1335015efaa968).
**Date:** 2026-05-13.
**Pre-flight reads consulted:** primary.map.md / non-compliance.report.md / docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md (S89) / docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md (S57) / docs/articles/llm-kickstarter-v1-2026-04-25.md / docs/tutorial.md (1076 LOC) / docs/tutorial-snippets/ (11 snippets + verify-tutorial.sh) / docs/website/v0.2.0-announce-2026-05-05.md / master-list §0 (C1/C2/C3 tracks lines 79-81) / hand-off.md / docs/changelog.md.

---

## §0 Headline (load-bearing finding — Rule 4 currency check)

**Wave 4 is significantly further advanced than the hand-off-88 framing implies.** Three derived planning documents (hand-off.md §"next-priority candidate list" #11; master-list §0 C1/C2/C3 rows; primary.map.md "Wave 4 remaining") describe Wave 4 as ⏸️ pending. The codebase + changelog disagree:

- **Tutorial:** `docs/tutorial.md` is **1076 LOC and was rewritten S84** at commit `15336b9` ("C1 tutorial rewrite to v0.2.4 canonical (Wave 2 #2)"). 11 canonical snippets exist under `docs/tutorial-snippets/` with a `verify-tutorial.sh` harness that compile-checks each. The tutorial covers v0.2.4-canonical surface end-to-end: §0 setup, §1 program shape, §2 counter + derived + persistence + styling, §3 lists+components+iteration, §4 Tier-0/1/2 ladder, §5 forms+auto-synth validity surface, §6 failable functions, §7 `not` keyword, §8 channels, §9-§10 summary + glossary + anti-patterns table.
- **Articles:** `docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md` (S57) classified 15 articles. Changelog S84 entry `W2-3` (commit `2646cdd` + follow-ons `eaf718f` + `32ecf1c`) marks **5 articles publishable** post-edit: tier-ladder-promotion (with status banner), realtime-and-workers, mutability-contracts (with status banner), server-boundary-disappears, components-are-states (with status banner). The S89 corpus-ouroboros audit (Wave 3.7) re-confirms: 50 of 77 corpus files clean; article forbidden-idiom matches are in legitimate "before scrml" TS contrast blocks (NOT drift).
- **scrml.dev:** `docs/website/v0.2.0-announce-2026-05-05.md` exists as a 211-LOC draft. Changelog S85 records **substantive refresh of scrml.dev landing page in 3 commits** (`28c075b` + `fd3edf9` + `a574353`): replaced `<Card>` framing with state-cells-are-primitive + UI-is-state-machine + validators-auto-synthesize + errors-as-states sections + "No npm escape hatch" section.

**Implication:** the 8-20h hand-off-88 estimate was sized for cold-start adopter-content work; the actual remaining work is currency-update + verification, not initial authoring. Re-baseline below in §7.

**Per pa.md Rule 4** — derived planning docs are NOT normative; SPEC + code reality is. This SCOPING reflects code reality.

---

## §1 Wave 4 scope summary

Per hand-off-88 §"Latent items / follow-ons" line 87 + master-list §0 C1/C2/C3 tracks, Wave 4 covers three content surfaces:

1. **Tutorials update** — zero-to-running tutorial that compiles against v0.2.0+v0.3.0 surface.
2. **scrml.dev refresh** — public-facing landing-page + announce content reflecting current shipped truth (v0.2.6 baseline; v0.3.0 in flight per Approach A + Wave 4 + §36 + Phase 3a).
3. **Articles triage** — classify the 17 docs/articles/ files (master-list says 15; actual count is 17 incl. drafts + tweet snippet) as ACCURATE / NEEDS-EDIT / RETRACT / DO-NOT-PUBLISH for the v0.2.0+v0.3.0 surface.

Two sub-tracks added during scoping (per primary.map.md §"v0.3.0 remaining blocker" + S89 audit findings):

4. **Wave 3.7 migration backlog landing** — the 10-item §4 backlog from `docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md` (mechanical `== null` → `is not` sweep in 4 trucking-dispatch components + 1 file-top `#{}` in mario example + kickstarter v1/v2 `login()` rewrites + primer `default=null` coordinated SPEC update). Adopter-content adjacent because most landings touch corpus files.
5. **README + master-list/hand-off currency** — README.md at HEAD reads "v0.2.0" but shipped baseline is v0.2.6; v0.3.0 is the next tag. The header banner needs a v0.3.0-in-flight callout. Low-effort, cut-blocker-adjacent.

---

## §2 Tutorial sub-tasks

### T-1 — Tutorial verification pass against current binary

**Scope:** Run `bash docs/tutorial-snippets/verify-tutorial.sh` against HEAD `9b98118`. The script compile-checks all 11 snippets. If any snippet fails, classify the failure as (a) compiler regression post-S84 (escalate to bug fix); (b) tutorial-prose-vs-snippet drift (fix in tutorial.md); (c) snippet-vs-spec drift (fix in snippet + update prose).
**Acceptance:**
- Verify-script exits 0 (all 11 snippets compile clean).
- Manual smoke pass: each snippet produces emitted dist artifacts (HTML/JS/CSS as relevant).
- Per pa.md Rule 2 full-production fidelity: every line of every snippet matches what the compiler does at HEAD (NOT aspirational SPEC text).
**Estimated hours:** 0.5-1.0h (verify-script is the speed-of-execution).
**Dependencies:** none — HEAD `9b98118` is stable; verify-script is the prior-art driver.
**Files touched:** none expected if green; otherwise `docs/tutorial-snippets/<file>` + `docs/tutorial.md` (per-section).
**Recommended dispatch shape:** IMPL — direct dispatch with bash-shell access, low complexity.

### T-2 — Tutorial currency-check against v0.3.0 surface

**Scope:** Identify what's changed in the language surface since S84 (commit `15336b9`) that the tutorial doesn't currently teach. Inventory candidates from changelog scan:
- S85+S86: `<program>` / `<page>` helper element split (R2 one-program-per-app); channel placement reversal (channels are siblings of `<program>`, NOT inside); BS-layer extension recognizing V5-strict state-decl inside `<page>` bodies; `<program spa>` filesystem-inference + W-PROGRAM-SPA-INFERRED lint; `<onIdle>` engine event-timeout watchdog; debounce/throttle as `reactivity` field (`<x debounced=Nms>`); `<onTimeout name=IDENT>` + `cancelTimer("X")`.
- S87+S88: BS-layer `<!-- -->` comment skip (§4.7); mixed positional+named binding (§18.7 forbidden); `bun:`/`node:` protocol pass-through (§41.4); `scrml:host` stdlib + `safeCall`/`safeCallAsync`/`HostError` (Phase 3a); Approach A A-1 markup-read DG edges (compiler-internal — not adopter-visible).
- Tutorial §8 (Channels): worth confirming the channel-as-sibling-of-`<program>` story is told canonically.
- Tutorial §4 (Engines): worth confirming hierarchy/`<onIdle>`/`<onTimeout>`/`history` are at least mentioned.
**Acceptance:**
- Markdown delta list (additions, edits, deletions per tutorial section).
- Confirmation that tutorial DOES NOT teach v0.1.0 idioms (`@var = 0` decl shape; `<machine>` keyword) anywhere outside the explicit "older articles may say X — trust this doc" callout in the prose.
- Per pa.md Rule 2: every new section is verified against compiler reality first.
**Estimated hours:** 1.5-3.0h (delta inventory + write).
**Dependencies:** T-1 (verifies the existing tutorial actually compiles before any additions land).
**Files touched:** `docs/tutorial.md` (additive sections); possibly `docs/tutorial-snippets/<new-snippet>.scrml` if a new code example is introduced; `docs/tutorial-snippets/verify-tutorial.sh` SNIPPETS array if new snippet added.
**Recommended dispatch shape:** IMPL — single dispatch; tutorial is one file, edits are surgical.

### T-3 — Tutorial smoke-walk by an external reader proxy

**Scope:** Per pa.md Rule 2 (full-production fidelity) — simulate a first-time adopter walking from §0 (setup) to a running app. Confirm the `scrml init` flow at compiler/src/commands/init.js produces a scaffold consistent with what the tutorial assumes. Verify each "compile this file" step in the prose works. Check that the §1 hello-world program actually compiles + runs in the dev server.
**Acceptance:**
- A clean checkout in `/tmp` runs `bun link` + `scrml init test-app` + `cd test-app` + `scrml dev` + browser-loads OK.
- Tutorial §0 setup instructions match the actual `init` scaffold contents.
- Mismatches surfaced as either tutorial edits (if init is canonical) or init-scaffold edits (if tutorial is canonical) — Rule 4 contention point if disagreement is structural.
**Estimated hours:** 1.0-2.0h.
**Dependencies:** T-1 (snippets compile-clean first).
**Files touched:** `docs/tutorial.md` (§0); possibly `compiler/src/commands/init.js` if init scaffold is the corrigend; `templates/init/*.scrml` (if scaffold templates exist) — verify location.
**Recommended dispatch shape:** IMPL — but flag as containing a possible compiler-source edit so the dispatched agent has appropriate permissions / can escalate to a compiler-bug-fix sub-dispatch if needed.

### T-4 — Tutorial cross-link audit

**Scope:** Tutorial currently links to SPEC + primer + kickstarter at various points. Confirm cross-links resolve to extant section anchors (SPEC has been amended S88: §4.7 BS-comment-skip + §18.7 mixed-binding + §41.4 protocol prefixes; SPEC-INDEX.md regen S86 shifted ~58 line-ranges). Confirm `master-list.md` link in the tutorial (if any) is current. Confirm `docs/PA-SCRML-PRIMER.md` cross-refs (S88 §13.5 staleness fix landed).
**Acceptance:** Every link in tutorial.md resolves to an existing anchor at HEAD. Broken or stale links replaced.
**Estimated hours:** 0.5-1.0h.
**Dependencies:** none.
**Files touched:** `docs/tutorial.md`.
**Recommended dispatch shape:** IMPL — can bundle with T-2 or T-4 if the tutorial dispatch is a single agent.

**T-track total estimate:** 3.5-7.0h.
**T-track aggregation recommendation:** **T-1 + T-2 + T-4 as ONE dispatch** (single tutorial agent owning the verify + currency + crosslink pass); T-3 as a SEPARATE dispatch (touches init scaffold + needs `scrml dev` walltime).

---

## §3 scrml.dev refresh sub-tasks

### A-1 — scrml.dev landing-page currency audit

**Scope:** The `docs/website/v0.2.0-announce-2026-05-05.md` artifact is dated 2026-05-05 (S57-era); changelog S85 records substantive refresh in 3 commits (`28c075b` + `fd3edf9` + `a574353`). However, the artifact file at HEAD `9b98118` still has frontmatter `status: draft` + `revision: 2 (A1a-COMPLETE milestone)`. Investigate the discrepancy: either the S85 refresh landed somewhere other than `docs/website/v0.2.0-announce-2026-05-05.md` (e.g., scrml-support repo, or directly published off-repo), OR the artifact at HEAD is stale relative to what was published.
**Acceptance:**
- Find the live scrml.dev source-of-truth (if it lives outside scrmlTS repo, document where).
- Reconcile artifact ↔ live state.
- Decide whether `docs/website/v0.2.0-announce-2026-05-05.md` should be promoted to canonical, archived as superseded, or updated.
**Estimated hours:** 0.5-1.0h.
**Dependencies:** none.
**Files touched:** investigation-only; possibly `docs/website/v0.2.0-announce-2026-05-05.md` (frontmatter update or archival).
**Recommended dispatch shape:** SCOPING — single investigative dispatch that returns a finding + recommendation. May convert to IMPL on result.

### A-2 — scrml.dev v0.3.0-in-flight banner + content surface refresh

**Scope:** Whatever the live scrml.dev surface is, it currently describes v0.2.0 in flight. Reality at HEAD `9b98118`: v0.2.6 is shipped baseline; v0.3.0 is in flight with Approach A + Wave 4 + §36 + Phase 3a outstanding. The site needs:
- A header banner: "v0.2.6 is the current stable. v0.3.0 cut path is in flight — see live status."
- Update the "What's shipped" section to v0.2.6 (NOT v0.1.0 as the existing announce says).
- Update "In flight" to v0.3.0 surface (Approach A reachability solver / §36 live-input retention / Phase 3a stdlib migration / scrml:host primitive).
- Cross-references to `master-list.md` (live dashboard) and `docs/changelog.md`.
**Acceptance:**
- Landing-page content describes v0.2.6 + v0.3.0-in-flight (NOT v0.1.0 + v0.2.0-in-flight).
- All callouts about "articles using v0.2.0 syntax describe the spec target, not the current compiler" are inverted: v0.2.0 is now CURRENT; v0.3.0 cut path is what readers should treat as "in flight."
- Per pa.md Rule 2: every claim verified against shipped state.
**Estimated hours:** 1.5-3.0h.
**Dependencies:** A-1 (need to know where the canonical surface lives before editing).
**Files touched:** TBD per A-1 finding (likely `docs/website/<file>.md` + possibly an off-repo scrml.dev source repo).
**Recommended dispatch shape:** IMPL — direct dispatch.

### A-3 — scrml.dev feature-list + flagship-demo description

**Scope:** Per changelog S85 the landing-page added "state-cells-are-primitive + UI-is-state-machine + validators-auto-synthesize + errors-as-states sections" + "No npm escape hatch" section. Confirm these sections are present + still load-bearing at HEAD. Add (or confirm) a flagship demo callout — likely the trucking-dispatch reference app (per primary.map.md: "trucking-dispatch reference app error-free" since v0.2.6). Per master-list §0 row 79 ("L22 family vs A1c sequencing"): `formFor` was framed as "the scrml.dev flagship demo" — confirm `formFor` is or is not actually a current shipped feature (changelog/master-list reads: `parseVariant` is shipped per S65 `f963a75`; `formFor` is not yet).
**Acceptance:**
- Flagship-demo description matches an actually-shipped capability.
- No L22 future-features claimed as shipped.
- Feature list is canon-aligned (no `<machine>` references, no `@var = 0` decl forms, no `@shared` modifier — these are all v0.1.0 idioms).
**Estimated hours:** 1.0-2.0h.
**Dependencies:** A-1 (canonical-surface locus) + A-2 (banner + version-state).
**Files touched:** TBD per A-1 finding.
**Recommended dispatch shape:** IMPL — can fold into A-2 if same surface.

### A-4 — scrml.dev quick-start link verification

**Scope:** Confirm "Quick start" / "Get started" links on scrml.dev point to:
- The repo `README.md` § Quick start (currently lines 39-60).
- The tutorial at `docs/tutorial.md` (post-T-track).
- The kickstarter v1 (for LLM-dispatched agents) — note v1 is for HUMAN onboarding to v0.2.x; v2 is INTERNAL-only per S57 ARTICLE-TRUTHFULNESS-AUDIT.
**Acceptance:** Links resolve. README quick-start instructions match the actual `scrml init` + `bun link` + `scrml dev` flow that T-3 will have verified.
**Estimated hours:** 0.25-0.5h.
**Dependencies:** A-1 + T-3.
**Files touched:** scrml.dev source (TBD); possibly `README.md` if a link target needs updating.
**Recommended dispatch shape:** IMPL — small enough to fold into A-2/A-3 dispatch.

**A-track total estimate:** 3.25-6.5h.
**A-track aggregation recommendation:** **A-1 as a STANDALONE investigative dispatch FIRST**, then **A-2 + A-3 + A-4 as ONE consolidated dispatch** after A-1 returns the canonical-surface locus.

---

## §4 Articles triage sub-tasks

### D-1 — Articles inventory + currency reconciliation

**Scope:** Reconcile three audit/triage layers:
1. S57 ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md — 15-article truthfulness classification.
2. S84 changelog `W2-3` (`2646cdd` + `eaf718f` + `32ecf1c`) — 5 articles edited + published per user-decision queue.
3. S89 corpus-ouroboros audit (`docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md`) — 50 of 77 corpus files clean; forbidden idioms in articles are all in legitimate "before scrml" TS contrast blocks.

Plus actual `docs/articles/` count = **17 files** (S57 audit said 15; difference is `scrml-debate-amends-zod-claim-devto-2026-05-06.md`, `why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md`, `x-snippet-zod-calibration-2026-05-06.md`, `teej_baiting_tweet.md` — added post-S57; minus any superseded).

Build a unified currency table: per article, `current classification at HEAD 9b98118` (ACCURATE / NEEDS-EDIT / RETRACT / DO-NOT-PUBLISH / SUPERSEDED / INTERNAL-ONLY) + `delta since S84 edits` + `S89 audit status`.
**Acceptance:**
- Single table covering all 17 articles + 3 kickstarter shapes (v0/v1/v2) + 4 known-internal items (drafts + tweet + snippet).
- Per article: HEAD-9b98118 classification + reason + (if edit-needed) line-references.
- Cross-reference to S89 audit's §4 migration backlog where overlapping.
**Estimated hours:** 1.5-3.0h.
**Dependencies:** none — all source audits exist at HEAD.
**Files touched:** **new** file `docs/audits/articles-currency-2026-05-13.md` (or similar — confirm location convention per non-compliance.report.md).
**Recommended dispatch shape:** SCOPING / AUDIT — investigative dispatch only, no article edits yet.

### D-2 — Articles edit pass (NEEDS-EDIT items)

**Scope:** Apply edits to articles classified NEEDS-EDIT in D-1. Per S57 + S84 + S89, the likely set is:
- **kickstarter v1 + v2** — `login()` example uses `return null` / `: null` (S89 audit §4 M-8 + M-10). Two viable fixes per audit: (a) mechanical `null` → `not`; (b) structural rewrite to failable-fn `!{}` form. Audit recommends (b) per Rule 3.
- **primer (`docs/PA-SCRML-PRIMER.md`)** — line 90 `<startTime default=null>` (S89 audit §4 M-7). Requires coordinated SPEC §6.4 edit FIRST (S89 audit §5 D-4 borderline; surface to user disposition).
- **kickstarter v2** — line 243 `default=null` (S89 audit §4 M-9). Same SPEC dependency as primer.
- **realtime-and-workers-devto** — `<channel protect=>` → `<channel auth=>` line 200 (KNOWN-DRIFT per pa.md Rule 1; immutable-once-published; NO ACTION unless re-published).
- **mutability-contracts-devto** — `(null -> T)` lifecycle syntax (S89 audit §5 D-2 borderline; needs upstream SPEC ratification on whether to migrate to `(not -> T)` first).
- The 5 articles already shipped per S84 `W2-3` (tier-ladder-promotion, realtime-and-workers, mutability-contracts, server-boundary-disappears, components-are-states) — re-verify their edits hold against v0.3.0 surface, NOT v0.2.0.
**Acceptance:**
- Each NEEDS-EDIT article either (a) edited + flagged ready-to-publish, OR (b) borderline-deferred to §5 D-2 with explicit user-disposition request, OR (c) immutable-published-no-action per Rule 1.
- Kickstarter v1 + v2 `login()` example rewritten per Rule 3 (structural failable-fn shape).
**Estimated hours:** 1.5-3.0h (kickstarter `login()` rewrites ~30-60min each per audit §6 sizing; mechanical null sweeps ~5min each; primer `default=null` 5min IF SPEC.md is co-updated, 15min if not).
**Dependencies:** D-1 (currency table is the input list).
**Files touched:** `docs/articles/llm-kickstarter-v1-2026-04-25.md`, `docs/articles/llm-kickstarter-v2-2026-05-04.md`, `docs/PA-SCRML-PRIMER.md`, possibly `compiler/SPEC.md` (§6.4 — if user authorizes coordinated edit; otherwise blocking on user disposition per D-4 borderline).
**Recommended dispatch shape:** IMPL — single dispatch covering kickstarter v1 + v2 + primer (if SPEC dep resolved); separate dispatch if SPEC dep stays open.

### D-3 — Articles retraction-or-publish decision queue

**Scope:** For articles classified DO-NOT-PUBLISH or SUPERSEDED in D-1, decide disposition. Likely candidates:
- `tier-ladder-promotion-devto-2026-05-04.md` — S57 audit said DO-NOT-PUBLISH until A2 lands. A1c Wave 4 (engine codegen) shipped S77; A1c IS complete. S84 changelog says this article is now publishable with status banner. Confirm at HEAD; un-block if so.
- `llm-kickstarter-v0-2026-04-25.md` — already non-compliance carry-forward; archive to `scrml-support/archive/articles/` per S89 audit §5 D-1.
- `*-draft-*.md` (lsp-and-giti-advantages-draft + npm-myth-draft) — superseded by devto versions. Archive.
- `teej_baiting_tweet.md` + `x-snippet-zod-calibration-2026-05-06.md` — tweet draft + snippet draft; internal-only by name. Confirm disposition (archive or keep as ad-hoc draft).
**Acceptance:** Each non-publishable article gets either an archival commit OR a status banner OR explicit pa.md Rule 1 immutable-no-action note.
**Estimated hours:** 0.5-1.5h (mostly file moves + small banner edits).
**Dependencies:** D-1.
**Files touched:** `docs/articles/<file>` (move/edit); possibly `scrml-support/archive/articles-skipped/` (per existing convention from S82 batch K).
**Recommended dispatch shape:** IMPL — small dispatch.

### D-4 — Borderline-disposition surface to user

**Scope:** Surface the S89 audit §5 borderline items + the S57 SPEC §6.4 `default=null` upstream question to user for explicit disposition BEFORE locking the D-2 article edits. Items needing user input:
- **SPEC §6.4** — `<startTime default=null>` canonical SPEC text. Per S81 directive ("null in no context"), does the migration include SPEC.md edit, or stop at the corpus?
- **mutability-contracts `(null -> T)` lifecycle syntax** — is this normative scrml lifecycle surface (in which case `null` token needs to become `not` token per S81), or article-only metaphor (in which case it stays)?
- **kickstarter `login()` mechanical-vs-structural** — Rule 3 recommends structural; audit §6 estimates ~30-60min/article for structural vs ~5min/article for mechanical. User's call which.
- **D-2 (S89 audit §5)** — `mutability-contracts-devto-2026-04-29.md` is PUBLISHED; pa.md Rule 1 makes it immutable unless explicitly authorized for re-publish. User decision: leave as known-drift, or authorize re-publish?
- **D-6 (S89 audit §5)** — `console.log` ad-hoc debugging in `examples/12-snippets-slots.scrml:46`. Forbidden-idiom or acceptable?
**Acceptance:** SCOPING document captures user decisions on each borderline; D-2 + D-3 dispatch downstream can run with no remaining ambiguity.
**Estimated hours:** 0.5-1.0h (waiting on user reply is async; PA-side authoring is light).
**Dependencies:** D-1 (must have currency table to surface to user).
**Files touched:** `docs/changes/wave-4-adopter-content/USER-DISPOSITION.md` (new); user reply captures back into the same dir.
**Recommended dispatch shape:** PA-hands-on — this is a user-facing decision queue, NOT an agent task.

**D-track total estimate:** 4.0-8.5h (agent time) + ~0.5h user-disposition wait.
**D-track aggregation recommendation:** **D-1 as a STANDALONE audit dispatch**; then **D-4 user-disposition surface (PA-hands-on)**; then **D-2 + D-3 as ONE coordinated dispatch** once user dispositions are in. Sequential.

---

## §5 Wave 3.7 migration backlog landing

### W-1 — Trucking-dispatch components null-literal sweep

**Scope:** Per S89 audit §4 M-1..M-5: mechanical sweep across 4 trucking-dispatch component files + 1 model file.
- `examples/23-trucking-dispatch/components/driver-card.scrml` lines 31, 58, 61, 67, 75, 81 (6 sites).
- `examples/23-trucking-dispatch/components/load-card.scrml` lines 17, 26, 59, 73 (4 sites).
- `examples/23-trucking-dispatch/components/customer-card.scrml` lines 39, 44, 46, 52 (4 sites).
- `examples/23-trucking-dispatch/components/invoice-card.scrml` lines 15, 16, 35, 52, 53, 54, 71, 77, 83 (9 sites).
- `examples/23-trucking-dispatch/models/auth.scrml` lines 51, 60 (2 returns) + 48, 72 (2 JSDoc comments).

Transform rules per audit:
- `cdlExpires == null` → `cdlExpires is not`
- `driver.current_location != null` → `driver.current_location is some`
- `return null` → `return not`
- JSDoc comment "or null" → "or `not`"

**Acceptance:** All 25 sites updated; trucking-dispatch compiles clean (per primary.map.md "trucking-dispatch reference app error-free since v0.2.6"); pre-commit hook green.
**Estimated hours:** 0.5-0.75h (mechanical).
**Dependencies:** none.
**Files touched:** 5 files listed.
**Recommended dispatch shape:** IMPL — single dispatch, mechanical, may even fit as a PA-hands-on bash sed pass with verification.

### W-2 — Mario state-machine file-top `#{}` removal

**Scope:** Per S89 audit §4 M-6: `examples/14-mario-state-machine.scrml` lines 17 (comment promoting `#{}`) + 19-21 (the `#{}` block itself). Two viable fixes per audit: (a) delete the `#{}` block + line 17 comment; demonstrate body styling via inline Tailwind on root container; (b) move font-family + bg-color rule to inline `class="..."` on root `<div>`. Audit recommends (a).
**Acceptance:** Example 14 has no file-top `#{}` block; visual demo via inline classes; mario example still compiles + runs (smoke-check via `scrml compile`).
**Estimated hours:** 0.25-0.5h.
**Dependencies:** none.
**Files touched:** `examples/14-mario-state-machine.scrml`.
**Recommended dispatch shape:** IMPL — small dispatch; can bundle with W-1.

### W-3 — Primer + kickstarter v1+v2 coordinated SPEC edit

**Scope:** S89 audit §4 M-7 (primer line 90) + M-9 (kickstarter v2 line 243) + S89 §5 D-4 (SPEC.md §6.4 lines 4832, 4834). Per audit, `default=null` is canonical SPEC text; if the corpus migration stops at the corpus, primer + kickstarter MUST stay with `null` (Rule 4 spec is normative). If user authorizes SPEC.md edit, then primer + kickstarter migrate to `default=not` in coordinated commit.

**Blocking decision lives in D-4 user-disposition surface.** This W-3 sub-task only fires AFTER D-4 returns user disposition on SPEC.md §6.4.

**Acceptance:** Either (a) SPEC §6.4 + primer + kickstarter v2 all updated to `default=not` in one commit, with `compiler/SPEC-INDEX.md` regenerated (~58-line range shift potential); OR (b) no-action confirmed + filed as known-stated-intent-vs-spec divergence under Rule 4 carry-forward.
**Estimated hours:** 0.5-1.5h IF SPEC edit authorized (incl. SPEC-INDEX regen + verifying no downstream compiler/test breakage; `default=null` parser handling needs to keep accepting `null` per backward-compat OR fail-loud per S81 directive — itself a smaller OQ).
**Dependencies:** D-4.
**Files touched (case authorized):** `compiler/SPEC.md`, `compiler/SPEC-INDEX.md`, `docs/PA-SCRML-PRIMER.md`, `docs/articles/llm-kickstarter-v2-2026-05-04.md`.
**Recommended dispatch shape:** IMPL — but flag SPEC.md as PA-authorization-only (per pa.md SPEC edit protocol).

**W-track total estimate:** 1.25-2.75h (sweep + mario + primer coordinated edit).
**W-track aggregation recommendation:** **W-1 + W-2 as ONE dispatch** (mechanical, file-disjoint from W-3); **W-3 dispatched separately after D-4**.

---

## §6 README + currency cross-cutting

### R-1 — README v0.3.0-in-flight banner

**Scope:** `README.md` lines 11-37 describe v0.2.0 as the current shipped tag. Reality at HEAD: v0.2.6 is shipped (`efbd1e8`); v0.3.0 is in flight. Banner needs amending.

Specifically:
- Line 11: `## scrml v0.2.0 — this README describes v0.2.0` → `## scrml v0.2.6 (stable) / v0.3.0 (in flight)`
- Line 13: "this README describes scrml **v0.2.0**, the current language as the compiler implements it" → "this README describes scrml **v0.2.6**, the current shipped stable. v0.3.0 cut path is in flight (Approach A reachability solver, §36 live-input retention, Phase 3a stdlib migration)."
- Lines 28-32 (semver cadence): update to reflect v0.2.x → v0.2.6 progression + v0.3.0 cut target.
- Lines 34-37 (find articles using pre-v0.2.0): keep — still load-bearing as readers may encounter v0.1.x material.

**Acceptance:** README banner accurately reflects v0.2.6-shipped + v0.3.0-in-flight + Wave 4 + Phase 3a + Approach A as the active fronts.
**Estimated hours:** 0.5-1.0h.
**Dependencies:** none — verified at HEAD.
**Files touched:** `README.md`.
**Recommended dispatch shape:** IMPL — can fold into A-2 (scrml.dev refresh) if the scrml.dev source-of-truth is README-mirrored.

### R-2 — Master-list + hand-off currency reconcile

**Scope:** Per pa.md Rule 4, master-list + hand-off are derived planning docs. Confirm:
- Master-list §0 C1/C2/C3 rows updated to reflect S84 W2-3 + S85 scrml.dev refresh + S89 corpus-ouroboros audit landings.
- Hand-off §"Next-priority candidate list" line 87 (Wave 4 adopter content) updated with re-baselined estimate per §7 below.
- Primary.map.md "v0.3.0 remaining blocker" updated to reflect Wave 4 sub-tasks decomposed in THIS scoping.
**Acceptance:** Three derived docs all reflect Wave 4 actual state.
**Estimated hours:** 0.25-0.75h (small surgical edits).
**Dependencies:** Wave 4 dispatches in flight or just completed.
**Files touched:** `master-list.md`, `hand-off.md`, `.claude/maps/primary.map.md`.
**Recommended dispatch shape:** PA-hands-on — these are PA-authority docs.

**R-track total estimate:** 0.75-1.75h.

---

## §7 Total estimate + re-baseline

| Track | Sub-tasks | Estimated hours |
|---|---|---|
| §2 Tutorial (T-1..T-4) | 4 | 3.5-7.0h |
| §3 scrml.dev (A-1..A-4) | 4 | 3.25-6.5h |
| §4 Articles (D-1..D-4) | 4 | 4.0-8.5h |
| §5 Wave 3.7 migration (W-1..W-3) | 3 | 1.25-2.75h |
| §6 README + currency (R-1..R-2) | 2 | 0.75-1.75h |
| **Wave 4 total** | **17** | **12.75-26.5h** |

### Re-baseline vs hand-off-88 "~8-20h aggregate"

Per pa.md Rule 4 currency check (§0 above): the hand-off-88 estimate sized Wave 4 as cold-start adopter-content authoring. Reality at HEAD: tutorial exists (S84 rewrite) + scrml.dev refresh substantively landed (S85) + 5 articles already publishable (S84). The 12.75-26.5h band reflects **currency-update + verification + Wave 3.7 migration landing**, which is similar in shape but slightly broader than hand-off-88's "8-20h aggregate."

**Net delta from hand-off-88:** +4.75h-6.5h on the high band; the low band of ~12.75h is within the original 8-20h envelope. **No re-baseline alarm.**

**Discount candidates:**
- T-1 + T-3 may collapse if no tutorial regressions surface (-1h to -1.5h).
- A-1 may find scrml.dev lives off-repo with PA already maintaining it — in which case A-2/A-3/A-4 become "ratify the off-repo state" (-1h to -2h).
- W-3 collapses to 0h if user opts no-SPEC-edit (-0.5h to -1.5h).
- Best case: ~9.75h. Worst case: ~26.5h.

**Recommended baseline:** **~14-22h** in master-list / hand-off currency update (R-2 sub-task). Range tracks the original 8-20h aggregate hand-off-88 framing with +20% margin for the Wave 3.7 migration backlog the S89 audit surfaced.

---

## §8 Sequencing recommendation

Parallel-execution-friendly:

```
Wave 4.A (kickoff, all parallel)
├─ T-1 + T-2 + T-4 dispatch → tutorial currency
├─ A-1 dispatch → scrml.dev surface-locus investigation
├─ D-1 dispatch → articles currency table
└─ W-1 + W-2 dispatch → trucking-dispatch + mario migration

Wave 4.B (after A.1 returns)
├─ A-2 + A-3 + A-4 → scrml.dev refresh
└─ D-4 PA-hands-on user-disposition surface

Wave 4.C (after D-4 user disposition returns)
├─ D-2 + D-3 → articles edit + retract/archive
└─ W-3 → primer + kickstarter coordinated SPEC edit (if authorized)

Wave 4.D (post-landing)
├─ T-3 → tutorial smoke-walk (init scaffold + dev-server fidelity)
└─ R-1 + R-2 → README + currency reconcile

```

**Critical path:** T-track → R-2 (tutorial must verify-clean before currency-update fixes the master-list row). Other tracks (A/D/W) are parallel-safe.

**Hard sequencing constraints:**
1. **D-1 BEFORE D-2/D-3** — currency table is the input list.
2. **D-4 BEFORE D-2 borderline edits + W-3** — user disposition gate.
3. **A-1 BEFORE A-2/A-3/A-4** — surface-locus gate.
4. **T-1 BEFORE T-2** — verify before extend.
5. **T-3 IS NOT a blocker for T-1/T-2/T-4** — separate dispatch (compiler-source-adjacent).

Per pa.md S82 maps-discipline + S88 file-delta-vs-cherry-pick + S88 stated-intent-vs-corpus: each dispatch must:
- read `.claude/maps/primary.map.md` first (per §"Task-Shape Routing" — Audit / diagnostic for D-1; new language feature N/A here; spec amendment for W-3).
- set `isolation: "worktree"` (S88 amendment).
- commit incrementally + write progress.md per S82.
- per S89 process violation memory rule (`feedback_land_before_cleanup.md`): file-delta + commit per-dispatch BEFORE worktree cleanup.

---

## §9 Cross-cutting concerns

### §9.1 Wave 3.7 §5 deferred items overlap

Six items in S89 audit §5 (D-1..D-6) overlap with Wave 4:
- D-1 (v0 kickstarter superseded) — folds into **D-3** (article retraction queue).
- D-2 (mutability-contracts lifecycle syntax) — surface in **D-4** (user disposition).
- D-3 (realtime-and-workers `<channel protect=>` known-drift) — already in non-compliance.report; **no action**.
- D-4 (SPEC.md §6.4 `default=null` upstream) — surface in **D-4** (user disposition) → **W-3** (coordinated edit if authorized).
- D-5 (TS "before scrml" contrast blocks NOT drift) — clarified in audit, **no action**.
- D-6 (`console.log` in example 12) — surface in **D-4** (user disposition) for forbidden-idiom rule decision.

All Wave 3.7 §5 deferrals are absorbed into Wave 4 sub-tasks. No standalone Wave 3.7 dispatch needed.

### §9.2 Kickstarter v1 vs v2 disposition

S89 audit §3.3 #1 flagged kickstarter v1 + v2 `login()` example as the "most consequential corpus-ouroboros vector" (both versions show `return null` as canonical scrml code, not as a "before" anti-pattern). Per Rule 3, the right answer is structural rewrite to failable-fn `!{}` form, not mechanical null → not. **Folded into D-2 with explicit Rule 3 framing.**

S57 ARTICLE-TRUTHFULNESS-AUDIT classifies both kickstarter v1 + v2 as INTERNAL-only (not for public). S84 hasn't changed this classification. Both remain INTERNAL LLM agent-brief documents per `pa.md S82 dispatch protocol`.

### §9.3 Article truthfulness ↔ current compiler (pa.md Rule 2)

Per pa.md Rule 2 (full-production-language fidelity), every code example in every article — published or internal — must compile against HEAD `9b98118`. The S89 audit confirmed: legitimately TS "before scrml" blocks DO NOT need to compile; scrml-fenced blocks DO. Sub-task **D-1** confirms which scrml-fenced examples compile clean by re-applying the verify-script discipline of `docs/tutorial-snippets/verify-tutorial.sh` to article-extracted examples (out of strict audit scope; flagged for **future** automated article-snippet-compile-check tool, NOT a Wave 4 sub-task).

### §9.4 LLM-kickstarter v0/v1/v2 publishing posture

Per S57 audit + S84 changelog + S89 audit:
- v0 — SUPERSEDED, archive (D-3 sub-task).
- v1 — INTERNAL, describes v0.1.0 / v0.2.x baseline idioms; LLM agent-brief only.
- v2 — INTERNAL, describes v0.next / v0.3.0 surface; LLM agent-brief only.

S57 §4 explicitly states "Kickstarter v0/v1/v2 — internal docs; never publish externally." This remains S89 stance. **No Wave 4 sub-task changes this** — v1 + v2 keep their INTERNAL classification but get edits per D-2 (Rule 2 fidelity + Rule 3 right-answer-beats-easy-answer).

---

## §10 Cut-blocker tractability against v0.3.0 walltime

Per master-list §0 line 11 ("Realistic cut timeline ~3-6 months walltime (~340-690h aggregate)"), the v0.3.0 walltime stack is dominated by Approach A (~260-560h for waves A-2..A-5 implementation) + §36 keyboard+mouse impl (~12-25h) + remaining Phase 3a async (small) + Wave 4 (re-baselined ~12.75-26.5h here) + small spec polish.

**Wave 4 share of total walltime:** **~2-8%** of the 340-690h aggregate. Wave 4 is NOT the critical path.

**Tractability assessment:** **ON TRACK.** Wave 4 sub-tasks are:
- Bounded (single dispatch + verify cycles, file-disjoint across tracks).
- Parallel-execution-friendly (4 tracks can fan out simultaneously after the gate-tasks return).
- Discount-eligible (multiple sub-tasks may collapse to 0h on Rule-4 currency findings).

**No re-baseline alarm.** Wave 4 fits the original 8-20h hand-off-88 framing within +20-30% margin once the Wave 3.7 backlog is folded in.

### Specific concerns to surface

1. **A-1 scrml.dev surface-locus** — if the canonical surface lives OUTSIDE scrmlTS repo (e.g., a separate `scrml.dev` static-site repo), PA needs to confirm where edits land. Repo `docs/website/` may NOT be the canonical source.
2. **W-3 SPEC §6.4 user-disposition** — could expand to a coordinated SPEC + parser + test edit; if SPEC §6.4's `default=null` migration to `default=not` requires parser amendment, sub-task size jumps from 0.5-1.5h to 4-8h. Surface in D-4.
3. **D-2 published-article re-publish authorizations** — Rule 1 immutability means pa.md authorization is needed per article. Surface in D-4 with explicit re-publish-OR-leave decisions.
4. **R-2 derived-docs currency** — master-list § 0 C1/C2/C3 rows are STALE per the §0 Rule 4 finding above; fixing them is a Wave 4 close-out item, NOT a hand-off-89-open item.

---

## §11 Dispatch shape recommendation summary

| Sub-task | Hours | Dispatch type | Aggregation |
|---|---|---|---|
| **T-1 + T-2 + T-4** | 2.5-5.0h | IMPL | one tutorial agent |
| T-3 | 1.0-2.0h | IMPL (compiler-adjacent) | standalone |
| **A-1** | 0.5-1.0h | SCOPING (investigative) | standalone, FIRST |
| **A-2 + A-3 + A-4** | 2.75-5.5h | IMPL | one scrml.dev agent, after A-1 |
| **D-1** | 1.5-3.0h | SCOPING (audit) | standalone, FIRST |
| D-4 | 0.5-1.0h | PA-hands-on | gating user disposition |
| **D-2 + D-3** | 2.0-4.5h | IMPL | one articles agent, after D-1 + D-4 |
| **W-1 + W-2** | 0.75-1.25h | IMPL | one migration agent, parallel-safe |
| W-3 | 0.5-1.5h | IMPL (SPEC-touching) | standalone, after D-4 |
| R-1 | 0.5-1.0h | IMPL | folds into A-2 or standalone |
| R-2 | 0.25-0.75h | PA-hands-on | post-landing close-out |

**Recommended dispatch count:** **6 agent dispatches + 2 PA-hands-on tasks** total.

Wave 4.A (4 parallel dispatches): tutorial / scrml.dev-locus-investigation / articles-currency / Wave 3.7 migration.
Wave 4.B (2 dispatches after A.1 + D.1 + D.4 land): scrml.dev refresh + articles edits.
Wave 4.C (1 dispatch after D.4): primer/kickstarter coordinated edit (W-3).
Wave 4.D (PA-hands-on): T-3 smoke walk + R-2 currency reconcile.

---

## §12 Acceptance for Wave 4 close-out

Wave 4 is CLOSED when:
1. Tutorial verifies green at HEAD (T-1) + reflects v0.3.0 surface accurately (T-2) + smoke-walks end-to-end (T-3) + has resolving cross-links (T-4).
2. scrml.dev landing-page reflects v0.2.6-stable + v0.3.0-in-flight (A-2 + A-3) with quick-start links resolving (A-4).
3. All 17 articles have a currency classification (D-1) + edited-or-archived per disposition (D-2 + D-3).
4. S89 audit §4 migration backlog landed (W-1 + W-2; W-3 if authorized).
5. README banner updated to v0.2.6-stable (R-1).
6. Master-list §0 + hand-off + primary.map.md reflect Wave 4 done (R-2).

**Cut-criterion alignment:** Wave 4 close → unblocks v0.3.0 tag (per primary.map.md "v0.3.0 remaining blocker: Wave 4 adopter content" + hand-off "Wave 4 adopter content as cut blocker").

---

## §13 Tags + cross-refs

#wave-4 #adopter-content #scoping #s89 #v0.3.0-cut-blocker #tutorial #scrml.dev #articles-triage #migration-backlog

Pre-flight reads:
- `.claude/maps/primary.map.md`
- `.claude/maps/non-compliance.report.md`
- `docs/audits/wave-3-7-corpus-ouroboros-2026-05-13.md`
- `docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md`
- `docs/articles/llm-kickstarter-v1-2026-04-25.md`
- `docs/tutorial.md`
- `docs/tutorial-snippets/`
- `docs/website/v0.2.0-announce-2026-05-05.md`
- `master-list.md` §0 C1/C2/C3
- `hand-off.md`
- `README.md`
- `docs/changelog.md` (S84 W2-3 + S85 scrml.dev refresh + S88 close entries)
