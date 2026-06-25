# scrml — Session 220 (OPEN)

**Date:** 2026-06-25. **Profile:** A — FULL. **Boot:** "read pa.md and start session" (explicit first-message → BOOT GATE pass). Prior: S219 CLOSE @ `26ffea4e` (pushed; deputy ELIMINATED, flogence digest-boot wired).

## 🚨 BOOT FINDING — flogence digest-boot is BROKEN on first real use (the S219 experiment)
`bun ../flogence/scripts/digest.ts scrml --fresh` → **`SQLITE_CANTOPEN`**. Root: `digest.ts:19` sets `dbPath = "./flogence.db"` (CWD-relative → resolves against scrml's cwd), but `--fresh`'s bridge (`digest.ts:23`) writes the db with `cwd = flogence/` → the db lives at `flogence/flogence.db`, the digest opens `scrml/flogence.db` → mismatch. **One-line fix (flogence repo):** anchor `dbPath = import.meta.dir + "/../flogence.db"` (NOT cwd-relative), matching where the bridge writes. flogence is a private sibling repo with its OWN PA — surfaced to user; do NOT PA-edit a sibling without direction.
- **Fallback used (per the experiment's own terms — "digest is an optimization, never a dependency"):** read `hand-off.md` (S219 CLOSE) + the delta-log S219 tail [65]–[74] for volatile state. NOT a full 64k delta-log re-read.
- **MEASUREMENT (flogence's ask):** the digest realized **0** ctx savings this session (it errored). Once fixed, it would replace the delta-log re-read slice only (~the recent-deltas portion), NOT the irreducible pa.md/PRIMER/SPEC-INDEX/codebase expert load. Report stands: experiment blocked on a path bug, not yet measured.

## ⏸️ OPEN — S220 (priority order, carried from S219)
0. **ss17 + ss18 IN-FLIGHT (running as separate instances, NO re-integration pings yet).** Worktrees: `scrml-spa-ss17` (spa/ss17 @ `9ee717a4` — booted, scoped 3 each-codegen MED gaps, **dispatched** a combined-fix dev-agent `a70743c2`; 1 scope-commit, behind main 2/ahead 1; clean tree) · `scrml-spa-ss18` (spa/ss18 @ `45182694` — just authored `BRIEF-W2.md` untracked, 0 code commits; the `<endpoint>` W2-W5). **DO NOT touch their worktrees while live.** First action when a ping lands: S67-land + **reconcile BY HAND** (ss17 touches `emit-html.ts`/each-codegen; ss18 touches `SPEC.md` §34/§61 + parser/typer/codegen) — NOT blind file-delta (parallel-collision rule; also vs just-landed AF-lint §34 row + §61).
1. **`<endpoint>` build** — W1 SPEC §61 LANDED (`a78ea133`, Nominal). ss18 IS W2-W5. On W4/W5 land: flip §61 Nominal banner + run flogence `fsp-wire-smoke` conformance. Deferred `raw` server-fn gated on a witnessed untypeable case.
2. **AF complete** ✅ (lint `W-INPUT-STATE-MARKUP-NONREACTIVE` landed `45182694`). Deferred: attribute-position interps + indirect reads (file LOW if friction); D @cell-bridge sugar deferred-until-witnessed.
3. **handle() re-examination** — banked dpa-012 (global-middleware raw escape's fit with the new `<endpoint>`/`raw` surfaces). Fire when `<endpoint>` settles.
4. **Drive the rest of the board** (primary-goal): MED ~15 / LOW ~15 + the **Nominal features** (8-9 spec-ahead: Build-Story §58 · import:host §21.3.1 · quoted-text §4.18-fire · WASM-sigils · sidecar-processes · gating-runtime §40.9.5 · engine-opener-effect §51.0.H). Recent deferred MED gaps to slot: g-each-peritem-markup-value-ternary (ss17) · g-nested-interp-in-markup-value-literal · g-named-machine-arrow-no-statedecl-silent-empty · g-colon-shorthand-markup-misparse · g-inlined-component-root-class-interp-raw · g-each-inline-component-prop-member-unsubstituted (HIGH? — verify) · nested-`<each>`-outer-reuse (Bug-72).
5. **dpa follow-ons** (banked): dpa-006/007/008/009/010/011/012 + `_{}` standalone/library-mode-db (OQ-F1).

## 🔧 MAPS OWED (PA-at-wrap now — deputy gone)
Maps were 12-behind at S218, deferred through the S219 deputy-elimination transition. **Run `project-mapper` incremental this session** (watermark trails HEAD; the S219 surface = §61 SPEC + AF-lint + `_{}` + GITI-032 + 6nz-B fixes). Commit with explicit pathspec (non-isolated agent shares main index).

## Board @ S219 close (current truth)
**HIGH 0 · MED ~15 · LOW ~15 · Nom 8-9** · v0.7.0. Suite **25073/0/213**. scrml + scrml-support both **0/0 with origin** (S219 pushed clean). No `deputy-maint` branch (retired). 4 retained worktrees: 2 sPA (ss17/ss18, LIVE — keep) + 2 locked dev-agent worktrees under `.claude/worktrees/` (likely ss17's dispatched `a70743c2` + a stale one — triage when ss17 lands, do NOT sweep live ones).

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · **S219 PRIMARY-GOAL** (finish-the-project / orchestrate-don't-grind / default-GO / blocking-Q-only-pause / recovery=4th-irreducible) · **S219 DEPUTY-ELIMINATED → flogence digest-boot** (broken, see above; maintenance = PA-at-wrap; S205 merge-before-push gate RETIRED — push = plain S147 0/0 check) · S88/S99/S126 path-discipline · S136 BRIEF archival · S138 R26 · S147 coherence · S215 adversarial-verify + random-sample-10× · S217 per-user profile (bryan) · wrap 8-step (full PA-maintenance, no deputy-shrink).

## Tags
#session-220 #open #boot #flogence-digest-broken #ss17-ss18-in-flight #endpoint-w2-w5 #maps-owed #pa-primary-goal
