# scrml — Session 210 (OPEN)

**Date:** 2026-06-20. **This session:** S210 (resumed across a `/clear` mid-session — NOT rotated; same OPEN S210). **Prev:** S209-CLOSE → `handOffs/hand-off-214.md`. **Profile:** A — FULL. **Deputy:** **ACTIVE** (`deputy-maint` ticking — at `45b9d049`, advancing through the session) → `^main` >0 → **merge-before-push gate (S205) at every push.**

> **Thinned hand-off (S205).** Mechanical state → `bun scripts/state.ts` + digest · `delta-log.md` [S210 1-20] · `deputy-state.md`. This carries the IRREDUCIBLE + the OPEN intake.

## Boot/current state
- scrml + scrml-support **0/0 with origin** as of the last push (`c1c96ca1`); **ss3 + gap-reconcile committed locally on top, UNPUSHED** (HEAD past `2eea9d4e`).
- Board **HIGH 1 · MED 11 · LOW 16 · Nominal 8** (the HIGH = `g-paren-binary-group-dropped-before-method`, flogence, filed this turn). Tests **17,384 / 68 skip / 0 fail** (subset) @ v0.7.0.
- Maps behind HEAD — **deputy-owned + deputy active → left to deputy.**
- `docs/graph/` (flograph projection) keeps getting staged **directly into main's index** (S119 hazard — a flograph/deputy tool, NOT via deputy-maint) → kept out of every PA commit via explicit pathspec. **Watch:** worth checking why the deputy/flograph writes main's index.
- **Worktrees:** main · `../scrml-deputy-maint` (deputy, KEEP). (ss3 integrated + 6b-cleaned; stale `agent-a4e244bf…` already gone.)

## ✅ S210 — DONE
- **3 HIGH bugs RESOLVED:** AD+regex (`14fb0230`) · AE engine-`name=` dual-table (`faa213c5`).
- **sPA ss4** (`f65b1de9`) + **ss13** (`c3e9d16e`) + **ss3** (`2eea9d4e`, 3/3: g-attr-bare-compound-is-op, bug-18/GITI-015, @.-sigil expr-parser) integrated. **sPA lists REBUILT** (fattening rule).
- **dpa-001 A2 RATIFIED** + **A2 build SCOPED** (`docs/changes/api-primitive-a2-2026-06-20/`) + **A2 W0 DD landed** (`scrml-support/docs/deep-dives/api-primitive-decl-site-epistemics-2026-06-20.md`).
- **6nz 1624 reply** sent (AB closed @ `2ebd107a`; AA open; X/Y/Z/AC current). **giti GITI-015** + **flogence paren-bug** acks sent. Bookkeeping done (user-voice/changelog/state/inbox).

## ⚠️ OPEN — needs the USER / next action
1. **A2 W0 — the A-vs-B ruling (Q1).** DD verdict: **C eliminated**; live fork = **A (element-name `<api>` alone)** vs **B (required `unverified` token)** — both decl-site-only, both ride existing honesty (§53.4 SPARK + parseVariant). Turns on ONE question: the user's reading of "type-system-visible" (visible-in-the-value's-type → C-only; visible-as-a-required-decl-construct → B-over-A). Settles A-vs-B with NO debate. F2/F3/F4 collapse (F3 = **new top-level §60**, not §6.7.x). **Ruling → then W1 SPEC §60 Nominal authoring.** delta-log [20].
2. **6nz AF — §36 ruling.** §36.6 is decisive: input-state reads set up NO reactive subscriptions, *intentional* → AF (`${<#cursor>.x}` render-once) is **BY-DESIGN.** PA lean: (a) confirm by-design + clarify the §36.1 "like `<poll>`" overclaim + add a `W-INPUT-STATE-MARKUP-NONREACTIVE` lint, vs (b) reverse §36.6 [not recommended — SPEC amendment + perf + reverses ratified gaming-canvas debate]. Reply to 6nz owed once ruled. delta-log [17].
3. **NEXT sPA — PA rec: re-fire `ss3`** (refreshed list = the NEW **expression-serializer paren/span cluster**: `g-paren-binary-group-dropped-before-method` HIGH + `g-isop-call-tail-lhs-paren-miscompile` MED — both ss3's expr-serializer ingestion; one fix may cover ≥2 + the resolved `g-literal-arg-expr-serializer-wrong-span` sibling). **Alternate:** `ss2` (engine-codegen — the poss-HIGH `g-derived-engine-autoderive-crash`, PA-repro pending). The ss3 list needs a PA refresh (mark 1-3 landed, add the cluster) before firing — offered, not yet done.
4. **flogence raw-route (serve-side)** — fold into A2 philosophy or bank as **dpa-002**.
5. **stdlib Phase 3** — needs a §40.4 `fail`/`!{}`/bun-import ruling.
6. **AA lint-fire regression** — `W-MATCH-VALUE-UNUSED` (S144, `emit-functions.ts:1021`) no longer fires on the v0.7.0 bare-tail-`match` repro. Not yet board-filed; investigation-worthy.

## OPEN escalations carried (S209)
- ss5 item3 `g-channel-server-keyword-auto-migrate` (Enhanced-A, DEFERRED S189) · ss9 §20.5 SPEC examples (migrate vs carve-out) · ss10 item7 render-gap-ingestion + item8 L2/L3 oracle-strategy · ss6 b17 cases 1-3 (gated on `g-component-body-markup-parser-absent`) · §58 build-story re-bucket · §20.5+despace residual (ss11 items 4-8, partly Rule-1 marketing-gated).

## OTHER carry
- **giti/6nz pa.md modernization** committed LOCAL+UNPUSHED in siblings (giti `72fda7c` / 6nz `e6fc5e8`) — push from their instances.
- ss3 residuals not board-filed: #2 dead each-sigil band-aid in `expr-node-corpus-invariant.test.js` (test-hygiene) · #3 native-parser `@.` structuring not verified.
- item6 **native-parser M2-M6** PARKED→escalate (~v0.8 default-flip).

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · digest-first (S203) · S88 isolation · S99/S126 path-discipline · S136 BRIEF.md · S138 R26 verify-before-claim (both directions) · S147 coherence · S164 bg-commit-race · **S205 merge-before-push gate** · S119 explicit-pathspec (deputy active) · wrap 8-step · S206 flogence + co-location · S208 sPA role · S209 cPA monitor-not-launch + §2.1 deref-vs-mark.

## Tags
#session-210 #open #profile-a #board-high-1 #ss3-integrated #paren-span-cluster #a2-w0-dd-landed #a2-A-vs-B-Q1 #AF-ruling-owed #next-ss-ss3-or-ss2 #deputy-active #push-pending
