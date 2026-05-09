# scrmlTS — Session 72 (CLOSE — Position B server-keyword DEPRECATION ratified · A9 phase opened · 8 commits · cross-machine switch)

**Date opened:** 2026-05-08
**Date closed:** 2026-05-08
**Previous:** `handOffs/hand-off-71.md` (S71 close — C1 Phase 0 SURVEY landed, cross-machine reconciliation)
**This file:** rotates to `handOffs/hand-off-72.md` at S73 open
**Tests at S72 close:** **9,854 pass / 64 skip / 1 todo / 3 fail** (full suite, 478 files, 34,235 expect calls). Net delta vs S71 baseline: **+120 pass.** 3 pre-existing self-host parity fails preserved (out of v0.2.0 scope per S66).

**Cross-machine switch IN PROGRESS at close.** User moving to other computer. Per pa.md cross-machine-sync-hygiene protocol: both repos clean at origin, all work pushed, machine-switch handoff complete.

---

## TL;DR — what S72 did

**Substantial design + implementation session.** Eight commits on scrmlTS main (3 ship-cycles + 4 deep-dive landings + 2 ratifying-debate insights + master-list amendments). Four deep-dives + two ratifying debates in scrml-support. Two methodology-grade verdict reversals (Insight 25 HYBRID → Insight 26 DEPRECATE; parallel-attribute KEEP → CLOSE). One protocol retirement (master-only-push). Six PA-predicted leans flipped under anti-sycophancy convener-stance.

| Commit | Topic |
|---|---|
| `0d5a144` | feat(c1): SHIP — shape-aware cell emitter (A1c Wave 1, step 1 of 4) |
| `f5b620a` | feat(parallel-close): SHIP — strike §51.0.P parallel attribute |
| `33ac96e` | feat(c2): SHIP — derived-cell reactive computation emission (A1c Wave 1, step 2 of 4) |
| `ea0ee5b` | feat(server-deprecate-1): SHIP — Batch 1 preconditions for Position B |
| `479ec1a` | docs(s72): ratify A9 phase + integration constraints + §0.4 deferral records |
| `3996d57` | feat(server-deprecate-2): SHIP — Batch 2 spec amendments + stdlib cleanup + §8.4 paragraph |
| `dc98313` | feat(a9-ext4): SHIP — S4 failure-mode preservation wiring |
| (this wrap) | wrap(s72): close — comprehensive |

**scrml-support pushes:** `c275b31` (S48 voice rebase) → `5a114a6` (5 deep-dives + Insight 26 + voice) → `c2bddbf` (body-split residual+integration design dive) → `ff166bf` (Insight 27 SQL composition).

---

## State as of S72 close

| Field | Value |
|---|---|
| scrmlTS HEAD | (this wrap commit) |
| scrmlTS origin sync | TBD post-wrap-push |
| scrml-support HEAD | `ff166bf` |
| scrml-support origin sync | 0/0 ✓ |
| Tests at close | **9,854 / 64 / 1 / 3** (full); pre-commit subset uses pretest chain |
| Inbox | empty (`handOffs/incoming/` clean; prior S71 needs-push moved to read/ + S72 needs-push renamed SUPERSEDED per push-protocol-retirement) |
| Outbox-pending | none |
| Active dispatches | none (Ext 4 SHIPPED; Ext 5 queued pending A1c C17 spec edit) |
| Worktree branches retained | `worktree-agent-acba92b63c3e3950a` (C1) / `worktree-agent-a789e3894f0fa1b2d` (parallel-close) / `worktree-agent-a78ec5d0aa429cf8c` (C2 SURVEY) / `worktree-agent-a630ed616115e0f3c` (C2 impl) / `worktree-agent-a130438a3e4fefa63` (server-deprecate-1) / `worktree-agent-aed4eeafff5ce2a94` (server-deprecate-2) / `worktree-agent-a7d0d371cdfdaf640` (A9 Ext 4) — all retained for forensic per S67 protocol |

---

## Open questions to surface immediately at S73 open

1. **Cross-machine pickup.** S73 PA is likely on the other machine. **MANDATORY at S-open:** `git fetch origin && git pull --rebase origin main` for BOTH scrmlTS and scrml-support. Verify at HEAD: scrmlTS = (this wrap commit) + scrml-support = `ff166bf`. Do NOT trust prior session counts uncritically; re-run `bun run test` and confirm `9,854 / 64 / 1 / 3`.

2. **A9 Ext 5 dispatch — pending A1c C17 spec-edit ordering.** Per master-list integration constraint: A9 Ext 5's `<program>` attribute additions (`scrmlconfig`-composable idempotency-key storage backend per §4.12 + §17.6 db= driver resolution shape) MUST land AFTER A1c C17's spec edit to avoid `<program>` attribute surface collision. So sequencing is: **A1c C3+C4 → C5/C6/... → C17 → A9 Ext 5**.

3. **A1c next steps.** C3 (render-spec expansion at `<x/>` use site) is the canonical next codegen step per A1c SCOPE row. Builds on C2's markup-typed factory body emission. ~4-5h cycle.

4. **A8 (test-bind, Insight 22) — pending A9 Ext 4 (just SHIPPED).** Per master-list integration constraint: A8 dispatches AFTER A9 Ext 4 so test-bound stubs inherit auto-`!` semantics. **Now unblocked.**

5. **Cycle-2 prereqs for E-CPS-NEEDS-FAILABLE promotion** (currently W- only):
   - **Markup-context `<errorBoundary>` suppression** — Ext 4 cycle-1 fires W-CPS-NEEDS-FAILABLE on calls inside `<errorBoundary>` markup wrappers (TS stage doesn't have call-site provenance threading to detect markup context). Adopters resolve via warning resolution-message #1. Cycle-2 MUST add markup-context detection before promoting W → E.
   - **Strict caller-context propagation refinement.** Cycle-1 D2 over-escalates conservatively (every CPS-eligible function implicitly `!`-typed). Cycle-2 can refine to design-dive's strict "called only from `!`-typed callers" rule.

6. **F4 path-discipline failure-mode — 3rd recurrence this session.** C2 + Batch 2 + Ext 4 all had agents leak Edit calls to main during dispatch; PA caught + reverted each time. Worth elevating to PreToolUse hook mitigation per pa.md F4 follow-up. **Backlog priority.**

7. **Cross-machine drift potential.** scrml-support is at `ff166bf` post-S72 push. scrmlTS at (wrap commit). If S73 picks up on the other machine without fetching first, work may be lost. **Sync-check protocol mandatory at S-open.**

---

## Things S73 PA must NOT screw up (S70+S71+S72 cumulative)

S70+S71 standing list (items 113-137) carries forward verbatim. S72 NEW additions:

138. **Position B server-keyword DEPRECATION fully ratified + spec-formalized + stdlib-cleaned + Ext 4 wiring shipped.** Insight 26 (design-insights.md tail) overturned Insight 25 HYBRID via 6-0 unanimous re-vote under E1 (stdlib audit) + E2 (vacuum-vs-call-graph reframe) + E3 (do-we-already-have-it) + E4 (Insight-21 mirror under new evidence). Three substantial structural arguments held HYBRID up; all three weakened or invalidated under new evidence. S73 PA must NOT re-litigate the keyword question without genuinely-new evidence.

139. **§51.0.P parallel attribute STRUCK 2026-05-08.** Spec section retired with intentional gap §51.0.O → §51.0.Q. Methodology-driven retroactive correction of S68 bundled ratification. Synonym-test failure conceded by spec text + SCXML semantic audit found scrml ALREADY HAS the structural semantics. S73 PA must NOT reintroduce as "naming sugar"; if SCXML-style parallel-region semantics ever wanted, they're an UPGRADE (Position C) per the parallel-disposition deep-dive — and per S72 user direction "scxml would be a dsl here. unacceptable" they're a Pillar-5 violation barring extraordinary load-bearing reason.

140. **A9 phase = body-split min-viable (Ext 4 ✓ + Ext 5 pending).** v0.2.0 deliverable (~76h total). Min-viable is backwards-compatible (auto-`!`-wrap on every CPS stub; CALM/Stripe replay safety). Full body-split (Ext 1 multi-batch + Ext 3 conditional-tier + Ext 2 loop-aware, ~94h additional) DEFERRED to v0.next+1 separate cycle. Cross-function body-split (~200-400h, Links territory) DEFERRED to v0.3.0+. S73 PA must NOT casually expand A9 scope; per S72 ratification + integration analysis.

141. **scrml is ALREADY a body-splitting language at function granularity** (per soundness deep-dive 2026-05-08). `analyzeCPSEligibility` + `cpsSplit` in production. 6 of 8 soundness predicates (S1-S8) already MET. The remaining gaps are S4 (just shipped via Ext 4) + S5 (Ext 5 next). Reactive-cell model is structurally CALM-monotonic. **This is load-bearing project identity — S73 PA must internalize: the user's "compiler is already mostly ready" intuition is rigorous, not aspirational.**

142. **scrmlconfig per-app idempotency-key storage = existing `<program>` attribute mechanism** per §4.12 + §17.6 db= driver resolution shape. Q1 RESOLVED at S72 (user verbatim: "scrmlconfig"). Zero new infrastructure for A9 Ext 5; reuses existing pattern. S73 PA must NOT design new config-file system.

143. **SQL composition Insight 27 status quo (A holds 5/5 unanimous).** No new SQL surface added in v0.2.0. Fragment-reuse uses call-graph extraction (server function returning result, not fragment-as-value). If gauntlet ≥3 adopters report fragment-reuse pain, re-trigger D-narrow deep-dive scoped only to fragment-reuse, not bundled with conditional-WHERE. The 2026-03-30 friction-data trigger genuinely has not fired; debate ratified that honestly under convener-stance permission for "no change."

144. **Master-only-push protocol RETIRED 2026-05-08.** PA pushes directly to origin when authorized (per-session or per-action). `feedback_push_protocol.md` rewritten; MEMORY.md index updated. needs:push inbox messages reserved for genuine cross-repo coordination only (rare). Cross-machine sync hygiene from pa.md still applies.

145. **F4 path-discipline failure-mode — 3 incidents this session, all PA-recovered.** PreToolUse hook mitigation overdue. Worth elevating from "deferred follow-up" to scheduled work in next planning cycle.

146. **Anti-sycophancy convener stance is operational.** Six PA-predicted leans flipped this session under methodology-stack discipline (parallel-attribute, Insight 25→26 keyword, Ext 4 missed-option-4 reorder, SQL composition lean B, plus parallel + the multi-batch CPS reflex). Pattern: when PA's confidence is high, the structurally correct answer is often the SIMPLER one (compose existing mechanisms). **Apply the discipline going forward — PA's reflex toward complexity is itself a signal of training-corpus pattern-matching, NOT structural impossibility.**

147. **§47 in SPEC.md is "Output Name Encoding"**, NOT server functions. The actually-correct locus for server-function-related amendments is §19.9 Server Function Errors. Multiple S72 dispatches cited "§47" out of habit; agents correctly rerouted. S73 PA must use the right section reference.

148. **W-CPS-NEEDS-FAILABLE fires today on `<errorBoundary>` markup-wrapped CPS calls** because cycle-1 doesn't yet detect markup-context provenance. Adopters resolve via warning resolution-message #1 ("Wrap the call site in `<errorBoundary>`"). Cycle-2 prereq before E-CPS-NEEDS-FAILABLE can ship.

149. **Six worktree branches retained in `.claude/worktrees/`** for forensic per S67. NOT cleanup priority; the branches are crash-recovery anchors. Disposition can wait.

150. **scrml-support has 7 numbered Insights** (21 — fn() MINIMIZE; 22 — server-mount; 23 — DD-Harel S67 hierarchy; 24 — NPM escape hatch; 25 — server-keyword HYBRID OVERTURNED by 26; 26 — Position B DEPRECATE; 27 — SQL composition status quo). Pro-X-voting-against-X frequency now at 6+ (debate-03 roc, debate-04 crystal, debate-05 simplicity-defender, debate-25 roc/haskell/react, debate-26 roc-RE-flip, debate-27 cs-phd/elixir/typescript triple-flip + rails self-reject). Methodology-grade settled signal.

---

## File modification inventory (S72)

**scrmlTS commits (8):**

| Commit | Files |
|---|---|
| `0d5a144` (C1) | compiler/src/codegen/{emit-logic.ts, runtime-template.js}, compiler/tests/unit/c1-shape-aware-cell-emit.test.js (NEW), bun.lock, docs/changes/phase-a1c-step-c1.../progress.md |
| `f5b620a` (parallel-close) | compiler/SPEC.md, compiler/SPEC-INDEX.md, compiler/src/ast-builder.js, compiler/src/symbol-table.ts, compiler/src/codegen/usage-analyzer.ts, compiler/tests/unit/{a5-2-parser-support, a5-3-typer-walker, engine-binding-b14, usage-analyzer, parallel-close-regression}.test.js, docs/PA-SCRML-PRIMER.md, master-list.md, docs/changes/parallel-close-2026-05-08/* |
| `33ac96e` (C2) | compiler/src/codegen/{emit-lift.js, emit-logic.ts, emit-reactive-wiring.ts}, compiler/tests/unit/{c1-shape-aware-cell-emit, c2-derived-reactive-computation}.test.js, docs/changes/phase-a1c-step-c2.../* |
| `ea0ee5b` (server Batch 1) | compiler/src/route-inference.ts, compiler/tests/lsp/{completions, document-symbols}.test.js, compiler/tests/unit/route-inference.test.js, docs/changes/server-keyword-deprecation-batch-1-2026-05-08/* |
| `479ec1a` (master-list amend) | master-list.md (A9 row + sequencing constraints + §0.4 entries) |
| `3996d57` (server Batch 2) | compiler/SPEC.md, compiler/tests/unit/{spec-server-deprecate-batch-2, stdlib-server-block-cleanup}.test.js, 11 stdlib/* files (decorative `server { }` strip + safeCompare → fn), docs/changes/server-keyword-deprecation-batch-2-2026-05-08/* |
| `dc98313` (A9 Ext 4) | compiler/SPEC.md, compiler/src/codegen/{emit-functions.ts, emit-server.ts}, compiler/src/type-system.ts, compiler/tests/unit/a9-ext4-cps-failable-wiring.test.js, docs/changes/a9-ext4-s4-wiring-2026-05-08/* |
| (this wrap) | hand-off.md, master-list.md, docs/changelog.md, handOffs/hand-off-71.md (rotated from S71-close) |

**scrml-support commits (4 net pushes):**

- design-insights.md: Insight 26 + Insight 27 appended (tail; was 1534 lines, now 1729)
- user-voice-scrmlTS.md: 13 S72 entries appended (server-keyword reframe iterations + SCXML-as-DSL + track-record + LLM-bound + body-split re-tier + S4 verdict + migration-deferral + push-protocol-retirement + scrmlconfig + SQL debate auth)
- docs/deep-dives/{parallel-attribute-disposition, server-keyword-inference-disposition, stdlib-empty-body-audit, soundness-analysis-for-body-split, body-split-soundness-design, body-split-integration-and-residual-design}-2026-05-08.md (6 NEW deep-dives)

---

## Master inbox state at close

`/home/bryan/scrmlMaster/handOffs/incoming/`:
- `2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` — UNREAD legacy from S30s era
- `2026-05-08-S72-scrmlTS-to-master-needs-push-SUPERSEDED.md` — RENAMED at master-push-protocol-retirement
- `read/` — contains historical processed messages including the S71 needs-push superseded by retirement

No active pending master notices. Master-PA push-protocol obsolete; PA-direct push is the standing pattern.

---

## Tags

#session-72 #position-b-ratified #insight-26 #insight-27 #a9-phase-opened #a9-ext4-shipped #parallel-close #c1-c2-shipped #server-keyword-deprecation #sql-composition-status-quo #body-split-soundness-design #4-deep-dives-landed #2-ratifying-debates #master-only-push-retired #f4-recurrent #cross-machine-switch
