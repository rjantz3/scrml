# sPA ss20 — re-integration (each-codegen-followon)

**From:** sPA ss20 · **To:** PA · **Date:** 2026-06-25 1408
**List:** `spa-lists/ss20-each-codegen-followon.md` · **Branch:** `spa/ss20` · **Tip SHA:** `04228356`
**Base:** `bb1f2592` (local main at sPA boot — contains the ss17 landing `72b52b6d`). spa/ss20 = base + 5 commits, clean linear history.

## End state: ALL 6 items closed (5 source landings + 1 footprint-miss guard). NONE parked.

| # | Item | Tier | Landed SHA | Disposition |
|---|---|---|---|---|
| 1 | g-if-guard-inner-effect-not-gated | HIGH | `04228356` | FIXED |
| 2 | g-compound-bind-value-not-two-way | HIGH | `1f03f5fe` | FIXED |
| 3 | g-each-mount-form-submit-no-preventdefault | MED | `a41d3227` | FIXED |
| 4+5 | emit-lift markup-text interp (+nested-literal) | MED+LOW | `61f7b2b2` | FIXED (item 5 closed by item-4 fix) |
| 6 | g-each-match-body-class-literal-not-extracted | MED | `acc6ef0a` | **FOOTPRINT MISS** — guard-only landed; real fix self-host/B4-deferred |

Per-item BRIEF.md archived under `docs/changes/ss20-*-2026-06-25/`.

## Per-item detail

**Item 1 (HIGH, the core fix)** — `if=(@x is some)` display-toggle ran its inner `${@x.field}` effect unconditionally on mount with x===null → TypeError aborting the whole DOMContentLoaded handler. Shape-(a) early-return gate; extracted `computeDisplayToggleCondition` so the gate predicate is BYTE-IDENTICAL to the toggle (lockstep, no re-lowering). Touched `emit-html.ts` (ifGuardStack), `emit-event-wiring.ts` (shared helper + gate), `binding-registry.ts` (ifGuard field) + 9-case browser test. RED 4/9→GREEN 9/9. `show=` + clean-subtree paths untouched.

**Item 2 (HIGH)** — compound `bind:value=@form.field` deep-set the DERIVED parent (clobbered by recompute). Source field cells DO exist as flat dotted keys (`loginForm.email`); retargeted read/write to the source leaf via `collectCompoundLeafTargets` (same parent/leaf sets emit-logic uses). Touched `emit-bindings.ts` + `emit-variant-guard.ts` (per-arm binds) + browser test. RED 1/5→GREEN 6/0. Was NOT parked — pure codegen.

**Item 3 (MED)** — `<form onsubmit>` inside `<each>` dropped the auto-`event.preventDefault()`. Mirrored emit-event-wiring's submit-only prefix as the FIRST listener statement (before the Bug-73 live-key prelude). `emit-each.ts` + browser test. Coexists with ss17's `buildEachExprHandlerBody` (cherry-pick 3-way merge preserved ss17).

**Items 4+5 (MED+LOW)** — `emitCreateElementFromMarkup` rendered un-split `${...}` text children literally for non-each callers. Now lowers reactively, **gated `!currentLiftReconcileCtx()`** so the each path (ss17) is byte-identical (no double-lowering). Item 5 (nested ternary `${@cell}`) closed by the single item-4 fix. `emit-lift.js` + browser test. *Empirical footprint correction:* the brief's match-arm/S201 shapes already render; the live reproducer is the top-level emit-expr markup-value salvage ternary.

**Item 6 (MED) — FOOTPRINT MISS.** The named TS locus `collectClassNamesFromAst` ALREADY walks each/match bodies correctly (since S212 `d0339df0` + Bug-17 `3b48e4df`). Agent reproduced the flogence-exact shape + all adversarial edges → every class emits rules; no RED on the TS compiler. **The real flogence #3 "squashed bubbles" root cause is the SELF-HOST collector** `compiler/self-host/cg-parts/section-assembly.js ~L2113-2118` (`scanClassesFromHtml`-only, never AST-walks each/match bodies). Self-host = B4-deferred/forbidden sPA scope → NOT touched. Landed only a flogence-anchored regression guard (8 tests, no source change) locking the TS collector↔each-block contract.

## NEW deferred findings (PA decides follow-ons)
1. **`<errors>` anchor DOM not reactively clearing** (item 2) — `_scrml_reactive_subscribe` on a DERIVED cell never fires (derived recompute fans out only effects via `_scrml_trigger`). Item-2 primary symptom fixed; this `<errors>`-emitter/runtime gap is separate.
2. **`<tableFor>` single-column slot renders literal `${@row.name}`** (item 4+5) — same bug class on the EACH path (brief-excluded). MASKED by a weak assertion `js.toContain("row.name")` at `compiler/tests/unit/r28-bug-2-tablefor-column-row-access.test.js:207` (passes on the literal substring). Candidate follow-on + strengthen that test to value-assert.
3. **Self-host class collector** (item 6) — `section-assembly.js ~L2113-2118` never calls `collectClassNamesFromAst`; the actual flogence #3 root cause. Self-host/B4-deferred.
4. **if-chain branches (`if=`/`else-if=`/`else`) in display-mode** (item 1) — same latent null-interp gap if a chain branch carries reactive interpolation over a null cell. Separate if-chain node kind, brief-excluded.

## Verification
- Each of the 5 landings passed the full pre-commit blocking gate on the INTEGRATED branch (~17.7k unit/integration/conformance, 0 fail each).
- Integrated browser check on spa/ss20: the 4 new render-fix browser tests pass together (31/0); each+lift+markup browser regression sweep **193 pass / 0 fail across 29 files** → ss17 (Bug-72/73, nested-each, per-item) intact, no double-lowering.
- Branch coherence: tip == `04228356`, base+5 linear, tree clean.

## Re-integration notes for the PA
- **Landing mechanism was cherry-pick, NOT file-delta.** The `isolation:worktree` harness branched all 5 agents from `26ffea4e` (origin/main, PRE-ss17) despite the brief's stated base — the S112 base-staleness class (my brief omitted a `git merge main` startup step; 2 of 5 agents self-corrected via FF-merge). A wholesale file-delta of any ss17-touched file would have clobbered ss17. If you re-derive any landing, **cherry-pick (3-way merge), not `git checkout <branch> -- <file>`.**
- **Main advanced under the sPA** to `d800b79f` (s220 "Nominal currency-verify"). Divergence `d800b79f...spa/ss20` = `1 5`. d800b79f touches NONE of spa/ss20's files → clean merge.
- **Main carries your uncommitted endpoint-primitive WIP** (`docs/changes/endpoint-primitive-2026-06-25/`, emit-server.ts, ast-builder.js, block-splitter.js, type-system.ts, SPEC*, endpoint-* tests). NONE overlap spa/ss20's surface (emit-html/event-wiring/bindings/variant-guard/each/lift/collect-class-names + tests). I did NOT touch any of it. My only main-tree edits: `spa-lists/ss20-each-codegen-followon.md` (item statuses) + `spa-lists/ss20.progress.md`.
- **Auth-leak (checked, resolved):** item-1 agent saw `auth-graph.ts`/`generate.js`/4 auth tests transiently modified in its worktree (unrelated `pages/auth/login→pages/login`); restored to HEAD, its commit verified = exactly its 4 files. Main working tree re-checked: NO auth/generate leak. No action needed.
- **Process: scratchpad commit-message race** — sibling parallel agents share the session scratchpad; item-6's `commitmsg.txt` was clobbered by item-3's (item-6 self-recovered via amend). sPA landings unaffected (own-authored messages + clean cherry-picks). New memory `feedback_parallel_dispatch_shared_scratchpad_race`.
- **Cleanup (PA-owned):** 5 redundant agent worktree branches remain (all cherry-picked): `worktree-agent-{a11b257ef2e6184c2 (item1), ab2acf68f12bcebe7 (item2), a3db8b1f4374f37ce (item3), a36315fb95818d7c9 (item4+5), a1c556a75511d82d3 (item6)}` + the sPA worktree `../scrml-spa-ss20`. Safe to prune after you merge `spa/ss20`.

— sPA ss20, standing down.
