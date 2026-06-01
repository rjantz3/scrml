# scrmlTS — Session 149 (OPEN)

**Date:** 2026-05-31
**Previous:** `handOffs/hand-off-152.md` (S148 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-153.md` at S150 OPEN.

---

## 🟢 S149 OPEN — session-start state

- **HEAD scrmlTS:** `25e89cbb` (S148 wrap commit). Clean. origin **0/0**.
- **scrml-support:** clean, origin **0/0**.
- **Cross-machine sync:** both repos fetched + verified `0 0` (behind/ahead) at OPEN. No staleness.
- **Inbox:** EMPTY (`handOffs/incoming/` — no `.md` files).
- **Git hooks:** configuration B (local-rich) — `core.hooksPath` UNSET, git resolves the default `.git/hooks/` which contains `pre-commit` + `post-commit` + `pre-push`. Commit + push gates ACTIVE. No action needed.
- **Tests (carried from S148 close):** full suite **22,376 pass / 0 fail / 220 skip / 1 todo**; within-node parity **1005/0**. Not re-run at OPEN.
- **known-gaps §0 (carried):** HIGH **0** · MED **13** · LOW **14** · Nominal **8**.
- **Worktrees:** main only. None to clean.
- **Maps:** `.claude/maps/` content-watermark **`09f74bee`** (S147 wrap; refreshed by S148 commit `189143a2`). The S148 incremental refresh `189143a2` ran EARLY in S148 and captured only the S147 compiler-source set — it did NOT capture S148's OWN later compiler-source landings. **Maps are STALE for the full S148 compiler-source set:** `e41c95d4` (C1 impl — `ast-builder.js` / `symbol-table.ts` / `emit-engine.ts` / `emit-client.ts` / `emit-logic.ts`) + `a0f61a20` (given-`:>` compiler — `ast-builder.js` / `type-system.ts` / `migrate.js`). Non-compiler HEAD-ahead commits (`07bc712c` examples corpus sweep · `5b24c46f`/`8d2d699b` SPEC.md · `25e89cbb` wrap docs) don't affect map currency. **Refresh (incremental) before any compiler-source dispatch touching those files, OR brief the agent to treat map content as starting-hypothesis-to-verify.**
- **`full wrap` directive:** NOT active.

## Session-start checklist — DONE
1. ✅ Read pa.md (`scrmlTS/pa.md` thin S96 pointer → `../scrml-support/pa-scrmlTS.md`) IN FULL (1068L).
2. ✅ Read `docs/PA-SCRML-PRIMER.md` (canon snapshot — §1 framing, pillars incl. 5b reach-discipline, V5-strict, 3 RHS shapes, error model `fail`/`!{}`, no async/await, match block-form, `<each>`, one-shot-lift idioms, lifecycle `(A to B)`).
3. ✅ Read `compiler/SPEC-INDEX.md` IN FULL (385L) — section map + S148 amendment notes (§51.0.H Form 3 opener `effect=`, §18.2 match-`:>`).
4. ✅ Read `master-list.md` §0 LIVE DASHBOARD (via S148 close hand-off carry-forward).
5. ✅ Read `hand-off.md` (S148 CLOSE) → rotated to `hand-off-152.md`.
6. ✅ user-voice current through S148 (read via S148 close hand-off + verified last header = Session 148).
7. ✅ Rotated hand-off; created this fresh file.
8. ✅ Cross-machine sync hygiene (fetch + ahead/behind both repos — `0 0`).
9. ✅ Inbox check (empty).
10. ⏳ Prompt user re: incremental map refresh (stale for given-`:>` compiler files) — surfaced in OPEN report.
11. ⏳ Report: caught up + next priority — in OPEN report.

### ⚠️ Session-open anomaly (recovered, no damage)
PA initially MISREAD `scrmlTS/pa.md` as CR-corrupted and spent ~1 turn-cluster on a false "file destroyed" forensic + a bogus reconstruction draft (the Write was CANCELLED by an errored parallel Bash call — nothing junk landed). Root cause: the first clean Read showed the real 1300-byte S96 pointer; PA talked itself out of believing it. Compounded by intermittent tool-output buffering (results flushed several turns late). Corrected: pa.md is the deliberate S96 thin pointer → real directives at `../scrml-support/pa-scrmlTS.md`. Banked to PA memory. NO repo state touched.

## Durable working-style directive in force (S147 user-voice)
> "pick the largest target that is high priority and that is fully ratified and go go go, if my input is needed, park the progress and move on to what you can"

When given an open "what's next" mandate: pick the LARGEST target that is BOTH high-priority AND fully-ratified-FOR-IMPLEMENTATION (distinguish from ratified-as-direction-but-gated, e.g. D-runtime/027B which is gated). Drive autonomously; PARK genuine input-needed walls and move on rather than blocking. Pairs with Rule 3 (largest-RIGHT-target, not lowest-touch).

## ⭐ S149 FIRST ACTION (per S148 close) — run the F1+F2 provenance-architecture debate

The self-demonstrating scrml.dev strategic arc. Experts FORGED + ready in `~/.claude/agents/`:
- `source-map-provenance-expert` (argues real/standard/complete provenance + F2-A1 Source-Map-v3)
- `in-browser-compilation-expert` (argues in-browser-live + F1-C2)

**Brief = `scrml-support/docs/deep-dives/scrml-self-demo-website-2026-05-31.md`** (378L, on origin).

**Debate framing:** F1 (C1 pre-computed-static vs C2 in-browser-live) COUPLED with F2 (A1 Source-Map-v3 vs A2 custom-bidirectional JS+HTML+CSS). Consider adding `simplicity-defender` (does three-column-everything over-reach?).

**⚠️ CAVEAT:** the deep-dive's sub-agent (`Task`) dispatch was DENIED by the runtime — `@debate-curator` (spawns expert sub-agents) may hit the same. Be ready to PA-ORCHESTRATE (dispatch each expert via `Agent` directly + run `debate-judge`). Per `feedback_no_greek_chars_in_options` keep option labels ASCII.

**Then (c) no-regrets builds (greenlit S148):** (1) fix the source-map stub — thread real spans into JS Source Map v3 at the emit point (~40 `emit-*.ts`); minimal JS-v3 version is fork-independent, HTML/CSS scope is F2-dependent (→ needs maps refresh, touches codegen). (2) expose engine transition-graph as queryable data (compiler-side, fork-independent — `__scrml_transitions_*` already shipped).

## Carry-forward backlog → S149

**3 S148 findings → known-gaps detail (per pa.md don't-soft-classify):**
- **Source-map stub (NEW MED, the deep-dive crux):** §47.5 promises source maps; compiler emits structurally-valid-but-EMPTY v3 — `compiler/src/codegen/index.ts` ~L938/949 `addMapping(i,0,0)` → every output line maps to source 0:0. A dev opening devtools sees every error at line 0. Real gap, not doc gap. (= the (c) no-regrets fix above.)
- **`derived=match` arms not covered by match-`:>` tooling (triage):** held as raw matchBody string; NOT flagged by W-MATCH-ARROW-LEGACY nor rewritten by `migrate --fix`; 3 SPEC §51.0.J lines left `=>`. Should derived=match participate in the `:>` deprecation? If yes, extend lint+migrate, then flip.
- **`migrate.js` Migration-2 comment over-reach (tool bug):** `<machine>`→`<engine>` regex rewrites inside COMMENT/string context (corrupted a hos.scrml comment). Add comment/string skip.

**Open MEDs (13):**
- **C4** — object-literal lifecycle E-TYPE-001 (flagship; carried R27→S148).
- **C6** — formFor bind in engine state-child scope.
- **R28-8** — design call: bare-variant inference into object-literal fields (extend §14.10 vs canon-fix kickstarter §4.8). **NEEDS DESIGN DECISION.**
- **`:`-shorthand-state-body fragility** (S145) — `:`-shorthand engine hits `E-STRUCTURAL-ELEMENT-MISPLACED` block-splitter fragility. User ratified KEEP → BUG TO FIX (not retire). Mandatory-whitespace-after-`:` is a noted ergonomic wart (not changing now).
- **Bug 60** — render-by-tag nested-compound (deferred S140).
- **source-map stub** (S148 NEW, above).
- ...(+ remaining carried MEDs — reconcile against master-list §0 known-gaps at first wrap).

**match-`:>` tail REMAINING (deprecation-window — both forms valid; non-urgent):**
- In-match given doc fixes (PRIMER §6.5 ~L612, kickstarter L297 — `given u =>` arms INSIDE match → `:>`; supported now).
- Standalone-given doc sites (PRIMER ~601/875, kickstarter 1086/1113) — flip to `:>` (compiler landed `a0f61a20`, so safe now).
- `migrate --fix` re-run for given-guards on examples after the compiler landing (any standalone-given corpus uses).
- Corpus mass-migration (~300+ `.scrml`: `->` ~300 + arm-`=>`) — tool ready + byte-identical-verified, but bundles `<machine>`→`<engine>` baseline migration (+ the comment-over-reach bug above); decide full-sweep vs ride-window. Large blast radius. **NEEDS-INPUT.**

**Ratified arcs awaiting implementation (gated / direction — NOT "go-now" per S147 selection rule):**
1. **D-runtime arc (027B)** — server-render-time role-gating runtime; framework-owned dynamic-target gate. Start WHEN HIGH-LEVERAGE; Nominal/spec-ahead. Deep-dive `giti-027b-per-role-ssr-content-stripping-2026-05-30.md`. §58 build-target is the A/D bridge.
2. **tier-rung re-deep-dive** (carried S144) — re-evaluate intermediate-rung / Tier 0→1 jump-pain on pure DX merits; corpus-zero discounted (Rule 2); re-test on post-R24-R28 gauntlets. Probably its own session.

**Hygiene / housekeeping:**
- **12 non-compliance deref-to-scrml-support candidates** (S146 map refresh; `.claude/maps/non-compliance.report.md`) — stale v0next planning/audit docs.
- **within-node allowlist staleness** (~40 stale-high entries; carried).
- **Map refresh** — incremental needed for ast-builder.js / type-system.ts / migrate.js (given-`:>` landing) before related compiler-source dispatch.
- **native parser** M2.4 + MK2 (charter B multi-quarter arc) · brace-less-`continue`/`break` label fix.
- **fresh gauntlet R29** (vs v0.7.0+ baseline).
- **Tiny follow-up (1-liner):** SPEC §34 E-PA-002 row summary stale ("invalid protect= syntax" — actually shadow-DB-can't-build).

## pa.md directives in force
- **S136** BRIEF.md archival (per `isolation:worktree` dispatch) · **S138** R26 bidirectional empirical-verification doctrine · **S139** `full wrap` discriminator (not active) · **S146** `feedback_show_visual_work_before_push` (serve UI in browser before push) · **S147** branch-leak coherence addendum (verify `git rev-list --left-right origin/main…HEAD` AHEAD==PA-authored AND branch-tip==FINAL_SHA on every dispatch landing, not just `git status`).
- Standing: `--no-verify` prohibition (extends pre-push) · S126 Bash-edit + no-`cd`-into-main · S99 path-discipline · S88 explicit `isolation:worktree` · S90 CWD gate · S83 commit-discipline + verify-git-state-not-narrative · S94 bump-on-tag · S67 file-delta landing.
- Rules: R1 no-marketing-unless-user-raised · R2 not-a-toy · R3 right-beats-easy · R4 SPEC-normative · R5 shoot-straight.

## Tags
#session-149 #OPEN #caught-up #first-action-F1-F2-debate #carry-forward-source-map-stub #carry-forward-match-colon-tail #carry-forward-027B-D #known-gaps-HIGH-0
