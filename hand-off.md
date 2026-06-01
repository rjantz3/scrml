# scrmlTS — Session 149 (CLOSE)

**Date:** 2026-05-31
**Previous:** `handOffs/hand-off-153.md` (S149 OPEN / S148-carry).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-154.md` at S150 OPEN.

---

## 🏁 S149 CLOSE

- **HEAD scrmlTS:** `fe705c09` — **div 0/2, UNPUSHED** (push-pending; see Open questions).
  - `efae995b` engine-graph sidecar · `1108d45a` source-map B2+B1 · `8765462a` engine-graph CLI-flag fix · `fe705c09` tier-rung Approach-A ratification (§17.0.1 + SPEC-INDEX).
  - (NOTE: `efae995b` + `1108d45a` were PUSHED earlier this session at 0/0; then 2 more commits landed → now 0/2 again. The push covered the first two; flag-fix + A-ratification are the unpushed pair.)
- **scrml-support:** div 0/0 with origin, but **DD artifact `docs/deep-dives/tier-ladder-intermediate-rung-2026-05-31.md` is UNTRACKED** — commit at wrap-finalize (see below).
- **Tests:** full `bun run test` **22,448 pass / 0 fail** / 861 files (S148 baseline was 22,376; +72 from source-map + engine-graph suites). within-node: part of the suite, green.
- **known-gaps §0 (needs the wrap edit — see TODO below):** HIGH 0 · MED 14 (+source-map-attr-relative-span if filed; or keep as carry) · LOW 14 · Nominal 7.
- **Worktrees:** main only. **Inbox:** empty.

### FOUR ARCS THIS SESSION
1. **F1+F2 provenance debate** (S148-carried first action) — 3 experts + judge. **F2 settled 3-0 by convergence** (standards-hybrid: Source Map v3 + names for JS, CSS maps, data-scrml-span for HTML). **F1 = C1-static launch + C2a fast-follow** (user call). Design insight banked to `~/.claude/design-insights.md`.
2. **Source-map real provenance SHIPPED** (`1108d45a`, B2+B1 as one reviewed unit) — killed the `addMapping(i,0,0)` lying stub; real Source Map v3 + names + use-site spans. The S148 deep-dive crux, closed.
3. **Engine-graph sidecar SHIPPED** (`efae995b` + flag-fix `8765462a`) — `--emit-engine-graph` → `.engine-graph.json`, the C1 "what-comes-next" feed.
4. **Tier-rung DD → ratified Approach A** (`fe705c09`) — SPEC §17.0.1: existing lints ARE the advisory rung; no fourth tier.
Plus: **C1 self-demo website spike** (live-edit viewer, local /tmp, not committed).

---

## ⭐ S150 FIRST ACTIONS (priority order)

1. **FINISH THE S149 WRAP** (if not completed before session close):
   - `git -C ../scrml-support add docs/deep-dives/tier-ladder-intermediate-rung-2026-05-31.md && commit` (DD artifact — UNTRACKED at this hand-off write).
   - known-gaps §0 header update for S149 (source-map provenance RESOLVED the S148 source-map-stub MED; engine-graph shipped; NEW carry: srcmap-attr-relative-span — see task below).
   - master-list §0 S149 CLOSE addendum.
   - **PUSH** scrmlTS (0/2) + scrml-support (1 after DD commit) — **user authorized commit this session but push was a SEPARATE gate; confirm before pushing.**

2. **SOURCE-MAP ATTR-EXPR RELATIVE-SPAN FIX (located, not fixed — task #3).** The B1 use-site work has a **6-hit / 3-name residual** (gameOver×2, healthRisk×3, lives×1): `if=`/`show=` markup-attribute-expr + interpolation reads record FRAGMENT-RELATIVE span offsets (`@gameOver`→`start=1`/`2`, `healthRisk`→`13`) instead of absolute file offsets → map to comment line 0. **ROOT CAUSE LOCATED:** `compiler/src/codegen/emit-event-wiring.ts:1243` — `parseExprToNode(branch.condition.raw, "<if-chain-branch>", 0)` passes base-offset `0`; the condition is re-parsed in its own coordinate system. **FIX:** thread the attribute value's ABSOLUTE base offset instead of `0` (same shape likely covers the interpolation-read path). **DO PA-DIRECT** — two background agents tasked with this died on the socket-death pattern (see below); it's a located, bounded edit; PA has commit auth. Acceptance: all 6 line-0 hits resolve to real use lines + zero line-0 source-kind mappings (re-emit C1 mario artifacts + decode the map). BRIEF + correction archived `docs/changes/srcmap-attr-expr-relative-span-2026-05-31/BRIEF.md`.

3. **C1 self-demo website — build into the repo.** The spike (`/tmp/c1-demo/viewer.html` + `/tmp/c1-serve.js`) proved: editable scrml → server-side recompile → live app + folded output + engine boxes, hover-linked via real `.js.map`. Layout: live+boxes left 60%, editable source+output right 40%, fixed-height live pane. Next: build it into `docs/website/` properly (decide: keep the harness chrome plain-JS, or rebuild as a scrml app per the dogfood thesis). Per S146, serve in browser for user before any push. (The spike is the C1 increment of the F1=C1-static launch.)

## ⚠️ BACKGROUND-AGENT INSTABILITY THIS SESSION (watch at S150)
**Three background-agent deaths, two with identical signature** (socket closed / stream watchdog no-recover, ~10-68 min stall, zero commits):
- srcmap-attr-fix agent (`af748054`) — stalled ~68min at startup, 0 work; stopped + worktree removed (nothing lost).
- tier-rung DD agent (`ad4d1077`) — "no progress 600s, watchdog did not recover"; 0 artifact; PA ran the DD directly instead.
Both salvage-checked clean (0 commits, 0 diffs, no leak). **Lesson:** when background dispatch is dying, PA-direct the work (research + bounded edits) rather than re-dispatching into a flaky channel. The engine-graph + finish-agent dispatches earlier in the session DID complete — so it's intermittent, not total. Verify dispatch health before relying on it at S150.

## 🟢 S149 OPEN — session-start state (for the record)
- Opened from S148 CLOSE (`25e89cbb`), clean, 0/0. PA mis-read `scrmlTS/pa.md` as corrupted at open (it's the deliberate S96 pointer → `../scrml-support/pa-scrmlTS.md`); recovered, banked to memory `reference_pa_md_is_s96_pointer`. Tool-output buffered late several times this session — not corruption.

## Carry-forward backlog → S150

**From S149 (NEW):**
- **srcmap attr-expr relative-span fix** (task #3 above; located at emit-event-wiring.ts:1243; PA-direct).
- **C1 website build-into-repo** (task above; the F1=C1-static launch increment).
- **engine-graph multi-file write-loop bug** (banked in `8765462a` commit body): `engineGraphJson()` builds an all-files graph; the compile.js write loop writes that same JSON to EVERY per-file `<base>.engine-graph.json` → multi-file compile gives each file the whole-project graph. Single-file correct. Reachability shares the identical pre-existing loop shape. LOW; sidecar multi-file scoping fix.
- **C2a playground** (F1 fast-follow, ratified): the spike proves local live-edit is free; deployed-static needs the WASM/self-host path. Gated behind a CLI-conformance corpus (kill divergence risk). Next milestone after C1-static.
- **Phase 2 provenance** (F2 standards-hybrid, ratified but unbuilt): CSS source maps + HTML `data-scrml-span` correlation. Deferred until C1 needs them.

**S148-carried (still open):**
- **3 S148 findings:** source-map stub → **RESOLVED this session** (the B2+B1 arc). `derived=match` arms not covered by match-`:>` tooling (triage). `migrate.js` Migration-2 `<machine>`→`<engine>` rewrites inside comment/string context (tool bug — add comment/string skip; confirmed reproducible S149).
- **Open MEDs:** C4 object-literal lifecycle E-TYPE-001 · C6 formFor-in-engine · R28-8 bare-variant-into-object-literal (design call) · `:`-shorthand-state-body fragility (S145) · Bug 60 render-by-tag nested-compound.
- **Ratified-but-gated arcs:** D-runtime arc (027B) · **Tier-2 ceiling primitive** (the event-payload-transition primitive — the tier-rung DD found THIS is where the real case-analysis friction lives; the highest-leverage language arc surfaced this session) · native-parser M6 joint-retirement (complete front-end, shadow-only, parity-green 1005/0 — the flip to default is the v0.next-ish decision; see below).
- **Hygiene:** 12 non-compliance deref candidates · within-node allowlist staleness · maps refresh (watermark `09f74bee`, now stale for S149 source-map + engine-graph codegen landings — refresh before next compiler-source dispatch).

## NATIVE-PARSER STATUS (corrected S149 — the S148 hand-off one-liner was stale)
The S148/earlier hand-offs carried "native parser M2.4 + MK2" — **STALE S103-era language.** Actual: the native parser is a **COMPLETE front-end** (charter B, ~37,300 LOC, 38 modules w/ .scrml mirrors). M1-M4 (JS chain) + MK1-MK4 (markup chain) done; K-ledger closed 12/12 at S114. It runs as an **opt-in shadow** via `--parser=scrml-native` (M5.1); the DEFAULT is still the legacy live path (block-splitter + Acorn + BPP). Parity canaries green (within-node 1005/0, allowlist-baselined). The remaining arc is **M6 joint-retirement** (delete the legacy front-end behind a soak-gated flag-flip) — dormant since ~S128; S143-S149 were all fixes/features/website. It sits complete-and-shadowing, waiting on a decision to drive M6 + flip to default.

## pa.md directives in force
- Commit auth GRANTED this session (verified PA-reviewed compiler work); **push is a SEPARATE gate — not yet given for the 0/2.** S136 BRIEF.md archival · S138 R26 doctrine · S147 branch-leak coherence · S126 Bash-edit + no-cd-into-main · S83 commit-discipline + verify-git-state · S67 file-delta · S146 show-visual-work-before-push (honored: C1 viewer served before any website push).
- Rules: R1 no-marketing · R2 not-a-toy · R3 right-beats-easy · R4 SPEC-normative (fired this session — caught the §17.0.1-doesn't-exist miss at ratification) · R5 shoot-straight.

## Tags
#session-149 #CLOSE #source-map-provenance #engine-graph #tier-rung-ratified-A #C1-spike #carry-srcmap-attr-fix #carry-C1-build #carry-tier2-ceiling-primitive #push-pending #background-agent-instability #known-gaps-HIGH-0
