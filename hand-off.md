# scrmlTS — Session 159 (OPEN)

**Date:** 2026-06-03
**Previous:** `handOffs/hand-off-163.md` (= S158 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-164.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"; no signal → default A). Full session-start executed: pa.md + PRIMER + SPEC-INDEX + master-list §0 + hand-off + user-voice S154-S158 tail + git sync + inbox. Awaiting user direction.

---

## State at OPEN (caught up)

### Sync / repo state
- **scrmlTS:** clean, HEAD `97fe2199` (S158 wrap), `origin/main` **0/0** (synced). v0.7.0 (pkg.json).
- **scrml-support:** clean, **0/0** (synced).
- **Inbox:** EMPTY (`handOffs/incoming/`).
- **Worktrees:** main only (S158 cleaned at each landing).
- **Hooks:** config B (pre-commit + post-commit + pre-push). S100 path-discipline hook installed + holding.
- **Tests at S158 close:** `bun run test` **22,846 pass / 0 fail / 220 skip / 1 todo** (897 files). Not re-run this OPEN.

### known-gaps §0 at OPEN
- **HIGH 0. MED 10.** (S158 resolved Bug 72 / Bug 60 / Bug 64 / R28-1c.) No new gaps filed.

### Maps
- **STALE** — reflect `57edc794`; S157's 6 fixes + S158's 3 (Bug 72/60/64) landed after. **Refresh before the next compiler-source dispatch** — esp. emit-each / emit-lift / emit-control-flow (Bug 72 + Bug 64) + emit-html / dependency-graph (Bug 60) + runtime-template.js (Bug 64).

---

## OPEN QUESTIONS TO SURFACE IMMEDIATELY (carried from S158 CLOSE)

1. **PARKED — Profile-A design session for the S154 (a)/(b)/(c) rulings (spec+codegen still pending — NOT touched S155-S158):**
   - **(a) `:`-shorthand renders on non-void HTML; void rejects.** RATIFIED S154; **no open sub-Qs — ready to spec** (§4.14 line 997 + new void-reject §34 code) + codegen.
   - **(b) `:` inside-opener canonical everywhere.** RATIFIED S154; **2 unruled micro-grammar sub-Qs** (no-space `:@thing`; self-close `/>` + `:`-shorthand vs E-CLOSER-001).
   - **(c) no-RHS typed-decl → canonical empty else `not`.** RATIFIED S154; **3 impl sub-Qs** (exact empty table incl. enum→`not`; `not`-init lifecycle §42/§14.12; E-DECL-NEEDS-INITIALIZER fate).
2. **Bug 64 sibling-gap #2 (live-keyed event handlers)** — the next clean codegen item; same `_scrml_resolve_item` plumbing (per-item handlers still close over the create-time item). NOT filed; surface as a candidate.
3. **DD candidate (S155, parked) — UNANSWERED across S155/S156/S157/S158:** self-tree-shaking compiler build-story (§58+§47+self-host). Is "the whole dependency code issue" = the `bun link` full-toolchain friction?
4. **scrml-site notice** sent S158 wrap (Bug 64 = their report RESOLVED + each/lift codegen output-shape changed → their `[]`-clear workaround removable). Watch for their reply.
5. **Maps refresh** overdue (see above).

## CARRY-FORWARD (backlog)
- Bug backlog (MED 10): Bug 1 Tailwind residuals · V-kill READ-side · MCP V0 deferrals · Generator policy · L19 multi-statement-handler · A5 freeze-extension (adoption-watch) · R28-1d (bare-`<program>` drops `<each>`, needs-confirm) · R28-4/R28-8 · C4/C6 lifecycle · Bug 14 MCP-partial · prior LOW tail.
- #2f native-parser each/match structural promotion (M5-swap precondition; within-node allowlist bumps document the live-vs-native divergence).
- S154 carry: body-split/CPS debt · #5 lint FPs · #6 cross-file client imports · #7 MCP flip · per= per-instance engines (needs DD) · 6NZ caps stray.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter (S152). Profile A/B (S156). `full wrap` / 88% floor (S139). Working-style: largest ratified target, autonomous, park-on-input, surface only on real failure / needed design ruling.
- Dispatch discipline ALL held: S88 explicit isolation · F4 startup-verify · S112 merge-startup (worktrees branch from session-start commit, not live HEAD — `git merge main` step + explicit-pathspec file-delta) · S99/S126 Bash-edit + no-`cd` · S136 BRIEF.md archival · S138 R26/dual-verify (both directions) · S147 branch-leak coherence + additive-diff. `--no-verify` forbidden.
- **Phase-0-survey-STOP gate** (S158 pattern) — for meaty/perf-sensitive/architecturally-uncertain fixes, brief the agent to survey + STOP-and-report before the heavy edit; PA reviews + greenlights or escalates the design call to the user.
- Canonical dev-agent `scrml-js-codegen-engineer` (loads on this machine). **SendMessage agent-resume is NOT available in this environment** — a Phase-0-STOPped agent is continued via a FRESH dispatch carrying the analysis.

## DONE this session (S159)
- (session-start only so far)

## Tags
#session-159 #OPEN #profile-a-full-start
