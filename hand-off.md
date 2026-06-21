# scrml — Session 210 (CLOSE / wrapped)

**Date:** 2026-06-20. **S210 wrapped** (full 8-step). **Profile:** A — FULL (ran end-to-end across a `/clear` continuation; never rotated mid-S210). **Next session rotates this → `handOffs/hand-off-<N>.md` + fresh.**

> **Thinned hand-off (S205).** Mechanical state → `bun scripts/state.ts` + digest · `delta-log.md` [S210 1-33] · `deputy-state.md`. This carries the IRREDUCIBLE + the in-flight/ready intake.

## ⚠️ DEPUTY IS IDLE — needs a fresh boot to monitor the in-flight
`deputy-maint == main` (not ticking); **maps 49 commits behind HEAD** (watermark `5c68e87e`), digest was stale (PA-regen'd at wrap). The deputy fell behind — it is NOT currently monitoring. **To have the deputy monitor W3 + the 2 fired sPAs in the gap (user "deputy can monitor in between"), boot a fresh deputy** (`read vpa.md and boot`). Otherwise the next PA picks up the in-flight cold (safe — the delta-log + this hand-off carry it).

## Close state
- scrml + scrml-support **pushed, 0/0** at wrap (HEAD will advance with the wrap-finalize commit). Board **HIGH 0 · MED 9 · LOW 17 · Nominal 8.** Tests **17,487 / 68 skip / 0 fail** (subset) @ v0.7.0.
- **Maps 49 behind** (deputy debt) — do NOT refresh until W3 lands (W3 changes type-system/ast-builder/SPEC); refresh post-W3 (fresh deputy or project-mapper). Maps are WARN-only in `state.ts --check`.
- Worktrees: main · `../scrml-deputy-maint` (deputy, idle) · **the W3 agent worktree (`agent-a80f17c2cb0c3c4bc`, IN FLIGHT — do NOT clean).**

## ⚠️ IN-FLIGHT TO LAND (next PA — S67 file-delta)
- **A2 W3 (typer)** — agent **`a80f17c2cb0c3c4bc`**, isolation:worktree. Resolves api-decl endpoint types + `ENDPOINT-UNKNOWN`/`REQ-SHAPE-MISMATCH`/`PATH-PARAM-UNBOUND` + `<request api=>` recognition + §12.2 client-only confirm + §34 +3 rows; NO codegen; §60 banner stays Nominal. **Land via S67 file-delta** (S83 verify tip==reported, clobber-safe base-check on type-system.ts/ast-builder.js/SPEC.md, no leak; gap-reconcile §60.9; full suite; coherence-gated push). BRIEF at `docs/changes/api-primitive-a2-2026-06-20/BRIEF-W3.md`. delta-log [33].

## ⚠️ TO FIRE (user fires sPAs) — the recommended pair (disjoint from W3 + each other)
- **`ss11`** (doc-currency-corpus) — the fattest list; **this is the scrml-own corpus/LIGHT-EDIT sweep** (item b1 = examples canonical-form + the `<each>` LIGHT-EDIT tier the audit confirmed owed). Eligible items 1/3/5/7/8 (items 4/6 marketing Rule-1-gated, item 2 user-owned). Docs/corpus surface — disjoint from W3.
- **`ss7`** (meta-reflect-l22) — 2 items (`reflect()`/`^{}` meta-eval variant-shape + happy-dom mount-hang); meta-checker.ts/render-harness.js — disjoint from W3 + ss11.
- (Avoid while W3 in flight: ss5/ss6/ss12 [type-system.ts], ss4 [ast-builder.js] — collide with W3.)

## READY dispatches (not yet fired)
- **A2 W4 (codegen)** — AFTER W3 lands: emit the typed fetch callable + parseVariant wiring + the `<request api=>` runtime integration; then W5 (tests + example + B-docs guide). Flips the §60 Nominal banner at the end (W5).
- **bug-20 `promote --engine`** (ruling B ratified) — a ready LOW dispatch: the `--engine` span-rewrite (mirrors `--match`/`--each`) reusing `W-MATCH-RULE-INERT` + `W-ENGINE-INITIAL-MISSING`; NO new lint (W-MATCH-TRANSITIONS-ACCRUING dropped). promote.js. Amend SPEC §56.6 to drop the W-MATCH-TRANSITIONS-ACCRUING ref when it lands.

## OPEN — needs USER
- **bug-1 sub-arc 2 (safelist/@apply)** — the SOLE open remainder of bug-1; §26.5-deferred, no ruled direction. PA lean: stay deferred (the `lint.tailwind-unrecognized-class=off` escape hatch covers the pain). (User ruled B, left A open.)
- **Sibling rewrites** — giti/6nz/flogence PAs execute their idiomatic rewrites in their own instances (per-repo scope; directives in their inboxes). flogence corpus-feed candidate (its idioms → scrml G1/G2/G5 teaching examples) is a parked idea.
- **stdlib Phase 3** (§40.4 ruling) · **flogence raw-route** (dpa-002 or fold into A2) — carried design escalations.

## OPEN escalations carried (S209)
- ss5 item3 `g-channel-server-keyword-auto-migrate` (Enhanced-A, DEFERRED S189) · ss9 §20.5 SPEC examples · ss10 item7/item8 · ss6 b17 cases 1-3 · §58 build-story re-bucket · §20.5+despace residual (ss11 items, partly Rule-1 gated).

## OTHER carry
- giti/6nz pa.md modernization committed LOCAL+UNPUSHED in siblings (giti `72fda7c` / 6nz `e6fc5e8`).
- AA (6nz bare-tail-match) stays open (lint-fire regression). AF lint impl pending (g-input-state-markup-nonreactive-lint).

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · digest-first (S203) · S88 isolation · S99/S126 path-discipline · S136 BRIEF.md · S138 R26 verify-before-claim · S147 coherence · S164 bg-commit-race · S205 merge-before-push gate · S119 explicit-pathspec · wrap 8-step · S206 flogence + co-location · S208 sPA role · S209 cPA monitor-not-launch + §2.1 deref-vs-mark · S210 idiomatic-audit-kit + scrml-PA-audits-sibling-PAs-rewrite.

## Tags
#session-210 #close #wrapped #profile-a #board-high-0 #a2-w0-w3 #w3-in-flight #ss11-ss7-to-fire #bug-20-ready #sibling-idiomatic-audits-done #deputy-idle-needs-boot #maps-49-behind
