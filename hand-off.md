# scrml — Session 211 (OPEN)

**Date:** 2026-06-20. **Profile:** A — FULL ("read pa.md and start session", no signal → default A). **Boot:** cold (fresh PA, no warm vPA → no baton). Rotated S210-CLOSE → `handOffs/hand-off-215.md`.

> **Thinned (S205).** Mechanical state → `bun scripts/state.ts` + `handOffs/digest.md` · `handOffs/delta-log.md` [S211 1] · `handOffs/deputy-state.md`. This carries the IRREDUCIBLE + in-flight.

## Boot state
- **git sync:** scrml + scrml-support both **0/0** with origin @ HEAD `0a605d3e`. Tree clean except `?? docs/graph/` (deputy-owned, untracked). Hooks = config B (`.git/hooks`: pre-commit + post-commit + pre-push) — leave.
- **Digest CURRENT** (stamp `4a67f5bb` @ HEAD `0a605d3e`). Board **HIGH 0 · MED 9 · LOW 17 · Nominal 8.** Tests **17,487 / 68 skip / 0 fail** (subset) @ v0.7.0.
- **Inbox:** empty (mine). [scrml-support has 2 giti→support msgs — not this PA's.]
- **DEPUTY IDLE** — `deputy-maint == main` (not ticking), **maps 51 behind** (watermark `5c68e87e`). Not monitoring. User may boot a fresh deputy (`read vpa.md and boot`) to monitor W3 + catch maps up; else this PA carries the in-flight cold.

## ⚠️ IN-FLIGHT — A2 W3 (typer), agent `a80f17c2cb0c3c4bc`
- Worktree `agent-a80f17c2cb0c3c4bc`, branch tip **`56d01723`** (4 WIP commits). **Last commit ~2 min before boot → agent likely STILL RUNNING** (final suite / R26 / report phase) OR just stopped. Worktree clean.
- **Scope COMPLETE-in-commits:** `checkApiDeclarations` typer pass (type-system.ts +346) · all 3 W3 codes `E-API-{ENDPOINT-UNKNOWN,REQ-SHAPE-MISMATCH,PATH-PARAM-UNBOUND}` in src + tests (5-6 refs each) + §34 SPEC rows · `api-decl-typer.test.js` (+311, 16 tests) · `<request api=>` recognition.
- **NOT confirmed-done:** `progress.md` has NO W3-DONE section (only W2-era) · no full-suite/R26 evidence · no final agent report. **DO NOT LAND until completion verified.**
- **Land via S67 file-delta** when confirmed done: S83 verify tip == reported; clobber-check `type-system.ts`/`ast-builder.js`/`SPEC.md` vs main base; SKIP agent's stale-base files (`hand-off.md`/`delta-log.md`/`digest.md`/`master-list.md`); gap-reconcile §60.9; full suite; coherence-gated push. NO codegen (W4); §60 banner stays Nominal. BRIEF: `docs/changes/api-primitive-a2-2026-06-20/BRIEF-W3.md`.

## TO FIRE (user fires sPAs) — disjoint from W3
- **ss11** (doc-currency-corpus, fattest) — examples canonical-form + the `<each>` LIGHT-EDIT tier; eligible items 1/3/5/7/8 (4/6 marketing Rule-1-gated, 2 user-owned).
- **ss7** (meta-reflect-l22) — 2 items (`reflect()`/`^{}` meta-eval variant-shape + happy-dom mount-hang).
- Avoid while W3 in-flight: ss5/ss6/ss12 (type-system.ts) · ss4 (ast-builder.js) — collide with W3.

## READY (not yet fired)
- **A2 W4 (codegen)** — AFTER W3 lands; then W5 (tests + example + B-docs; flips §60 Nominal banner).
- **bug-20 `promote --engine`** (ruling B) — ready LOW: span-rewrite mirroring `--match`/`--each`, reusing `W-MATCH-RULE-INERT` + `W-ENGINE-INITIAL-MISSING`; NO new lint. Amend SPEC §56.6 to drop the dropped `W-MATCH-TRANSITIONS-ACCRUING` ref.

## OPEN — needs USER
- **bug-1 sub-arc 2** (safelist/@apply) — §26.5-deferred; PA lean: stay deferred (the `lint.tailwind-unrecognized-class=off` escape hatch covers it).
- **Sibling rewrites** — giti/6nz/flogence PAs execute idiomatic rewrites in their own instances (directives in their inboxes). flogence corpus-feed candidate parked.
- **stdlib Phase 3** (§40.4 fail/!{}/bun-import ruling owed) · **flogence raw-route** (dpa-002 or fold into A2 philosophy) · SSR-of-external-data structural gap (carried with A2).
- **S209 carried escalations:** ss5-item3 (`g-channel-server-keyword-auto-migrate`) · ss9 §20.5 SPEC examples · ss10 item7/8 · ss6 b17 cases 1-3 · §58 build-story re-bucket · §20.5+despace residual.
- **Other:** giti/6nz pa.md modernization LOCAL+UNPUSHED in siblings (giti `72fda7c` / 6nz `e6fc5e8`). 6nz AA (bare-tail-match lint-fire regression) open. AF lint impl pending (`g-input-state-markup-nonreactive-lint`).

## Maps
51 behind (deputy debt). **Do NOT refresh until W3 lands** (W3 changes type-system/ast-builder/SPEC). Refresh post-W3 (fresh deputy or `project-mapper`). Maps are WARN-only in `state.ts --check`.

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · digest-first (S203) · S88 isolation · S99/S126 path-discipline · S136 BRIEF.md · S138 R26 verify-before-claim · S147 coherence · S164 bg-commit-race · S205 merge-before-push gate · S119 explicit-pathspec · wrap 8-step · S206 flogence + co-location · S208 sPA role · S209 cPA monitor-not-launch + §2.1 deref-vs-mark · S210 idiomatic-audit-kit + scrml-PA-audits-sibling-PAs-rewrite.

## Tags
#session-211 #open #profile-a #cold-boot #w3-in-flight #deputy-idle #maps-51-behind #board-high-0
