# scrml — Session 209 (OPEN)

**Date:** 2026-06-19. **Previous:** `handOffs/hand-off-213.md` (S208 CLOSE). **Next pickup:** rotate THIS → `handOffs/hand-off-214.md` at OPEN. **Profile:** A — FULL ("read pa.md and start session" → default A). **Deputy:** LIVE (cron `39fed15c`, tick 82; `deputy-maint` FF'd to main HEAD `d0c5a96a` at boot — ^main == 0).

> **Thinned hand-off (S205).** Mechanical state lives in `bun scripts/state.ts` + `handOffs/digest.md` (board/counts/version/maps) · `handOffs/delta-log.md` (the fine-grained stream) · `handOffs/deputy-state.md` (deputy + F3). This hand-off carries the IRREDUCIBLE only.

## Boot state (S209 open)
- digest **current** (stamp `fb7ac8ff`; sources unchanged @ HEAD `d0c5a96a`) → volatile board trusted from digest.
- Board **HIGH 0** · MED 9 · LOW 23 · Nominal 8. Tests **17248 pass / 90 skip / 0 fail** (pre-commit subset) @ v0.7.0.
- scrml + scrml-support **0/0** with origin. Inbox empty. Maps watermark `9afc746e` (5 derived-commits behind HEAD — benign; deputy-owned).
- No in-flight dispatches (F3 watch-list empty per deputy-state).
- Untracked `docs/graph/` (gitignored/deputy-owned flograph output — leave alone).

## ⏭️ OPEN THREADS (carried from S208 — the irreducible)

### 1. ⭐ The sPA workflow is BUILT but UNTESTED — first live run is the proof
Contract (`scrml-support/spa-scrml.md`), boot pointer (`scrml/spa.md`), 14-list registry (`spa-lists/INDEX.md` + ss1–ss14) all committed. **No sPA session has run.** First live test = the USER launches `read spa.md ss<N>` in a fresh instance. Watch: worktree-provisioning (`../scrml-spa-ss<N>` + node_modules symlink), vPA-sourcing-supplement reachability, re-integration handoff (sPA → PA inbox → PA merges `spa/ssN`). **ss1 (`server-emit-route-inference`) is the natural first launch** — top item is the `g-route-mis-inference` fix (filed S208, repro'd, well-scoped).

### 2. dock-for-codebase-health (flogence DD-candidate)
User S208 Q: can the `#dock` track threading/spaghettification + dead/orphaned code? **YES** — a SEMANTIC layer atop the compiler's structural call-graph: dead-via-dead-reason (currency-sweep inv2b on code; catches live-but-purposeless code `W-DEAD-FUNCTION` can't) + bipartite concern-coupling metrics. Partially-designed; gated on dock coverage (0%). Not yet written as a DD — capture if the user pulls the thread.

### 3. Bucket-B design-track (routes to PA/dPA, not sPA)
flogence-block-lease-dock (12), each-inline Approach-A (4), vpa/dpa-process (5), markup-lease D-vs-G debate (2), codegen-IR refactor, maps-vs-flogence Q, deputy-context-economics measure. **Bucket A** (14 sPA lists) is the execution backlog.

### Design thread (carry — not ratified)
**Maps-vs-flogence (S207 Q):** do project-mapper structural maps earn their keep once flogence works? PA read: they become obsolete (compiler-emit + flograph subsume them drift-free); don't retire until proven (S82). Bucket B.

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · digest-first (S203) · S88 isolation · S99/S126 path-discipline · S136 BRIEF.md · S138 R26 verify-before-claim · S147 coherence · S164 bg-commit-race · S205 merge-before-push gate + wrap-thinning · deputy + step-3c · wrap 8-step (thinned) · S206 flogence-dev-model + co-location axiom · S208 sPA role (`spa-scrml.md`).

## Tags
#session-209 #open #profile-a #board-high-0 #spa-untested-first-run #dock-codebase-health-dd-candidate #bucket-b-design-track
