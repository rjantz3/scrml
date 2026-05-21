# scrmlTS — Session 113 (OPEN — mid-session, M4 + cluster dispatched)

**Date:** 2026-05-20
**Previous:** `handOffs/hand-off-115.md` (S112 CLOSE — rotated at S113 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S113 OPEN:** `87453fb` · **HEAD now:** see commit ledger (the M4-decomp+handoff commit)
**Origin sync:** scrmlTS — many unpushed S113 commits; scrml-support — clean.

---

## S113 net so far — native-parser arc, run HARD: 11 sub-steps, 4 milestones closed

S113 ran the charter-B native-parser arc as a work-horse session — 5 parallel rounds +
the MK3.3/M3.4/MK3.2 finishers + the M4-decomposition phase. **11 native-parser sub-steps
landed clean; M2, M3, MK2, MK3 — four milestones — completed.**

- **JS chain:** M1 ✅ (S99-S103) → **M2 ✅ (S113)** → **M3 ✅ (S113)** → M4 (dispatched).
- **Markup chain:** **MK1 ✅ (S112)** → **MK2 ✅ (S113)** → **MK3 ✅ (S113)** → MK4 (pending).
- Tests: S112 close 16,840 → **17,706 / 0 fail / 169 skip / 1 todo** — **+866**, 0 regressions.
- Maps cold-refreshed S113 (`87453fb` watermark; `compiler/native-parser/` mapped).

No `compiler/src/` changes — native parser ships ALONGSIDE the live pipeline
(`compiler/native-parser/`); swap is M5/M6.

---

## THREAD 1 (primary) — native-parser charter-B implementation arc

**Tracker:** `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — §5 progress
table = source of truth; §3.1 MK2 / §3.2 M3 / §3.3 MK3 (all ✅ COMPLETE) / §3.4 M4
(decomposed S113); §4.4 = known issues K1-K8.

**M-ladder status at this point in S113:**

| Mn | Layer | Status |
|---|---|---|
| M1 — composed-engines lexer | JS | ✅ COMPLETE (S99-S103) |
| M1.5 — expr-literals.js conformance flip | JS | ⬜ in the M1.x cluster dispatch (in flight) |
| **M2 — JS expression parser** | JS | ✅ COMPLETE (S112-S113) |
| **M3 — JS statement parser** | JS | ✅ COMPLETE (S113 — M3.1-M3.4) |
| **M4 — full bounded JS subset** | JS | 🔶 DECOMPOSED §3.4 (M4.1-M4.3); **M4.1 dispatched** |
| **MK1 — `BlockContext` engine** | Markup | ✅ COMPLETE (S112) |
| **MK2 — `TagFrame` engine** | Markup | ✅ COMPLETE (S113 — MK2.1-MK2.3) |
| **MK3 — `BodyMode` + `DisplayTextLiteral`** | Markup | ✅ COMPLETE (S113 — MK3.1-MK3.3) |
| MK4 — markup↔JS seam; re-tokenizer scaffolding deletion | Markup | ⬜ pending — not decomposed; needs M3/M4 |
| M5 — pipeline swap behind `--parser=scrml-native` | Both | ⬜ pending — incremental-components-DD revisit gate |
| M6 — joint retirement (BS + Acorn + BPP deleted) | Both | ⬜ pending |

**In-flight dispatches (S113):** **M4.1** (async/generator) + **the M1.x cleanup cluster
scoped to M1.5 + K2** — both `scrml-js-codegen-engineer`, worktree-isolated, background.

**Sequencing from here:**
- M4: M4.1 → M4.2 → M4.3 (all share `parse-expr` — sequential). M4.3 closes M4.
- **MK4** (the seam) — gated on M4; decompose + dispatch after M4. The two chains
  converged at M4 — no more 2-parallel milestone pairs until MK4.
- Then M5 (pipeline swap behind `--parser=scrml-native`) → M6 (joint retirement).

**Authority docs:** charter dive `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md`;
S98 DD `scrml-native-parser-design-2026-05-17.md`; roadmap §3.1-§3.4 + §4.4.

---

## The M1.x cleanup cluster — SPLIT (S113 scoping decision)

The cluster was conceived as M1.5 + K2 + K3 + K4 + K5. **S113 split it:**
- **M1.5 + K2** — dispatched NOW (parallel with M4.1). M1.5 (`expr-literals.js`
  conformance flip) + K2 (the `lex-in-code`↔`lex-in-regex` circular import + the
  `block-context`/`parse-ctx` aliased-import E-SCOPE-001). Both are lexer/markup-infra
  files — file-disjoint from M4's `parse-expr` work. **K2 must precede M6.**
- **K3 + K4 + K5** — DEFERRED to a post-M4 dedicated dispatch. Reason: the K3/K4/K5
  lexer-side maximal-munch fix is parse-expr-COUPLED — fixing the M1 lexer to emit the
  correct single token REQUIRES the matching `parse-expr` token-shape update (M2.x's
  re-compositions expect the OLD multi-token shape). So K3/K4/K5 collide with every M4
  sub-step (all touch `parse-expr`). They are non-blocking (the parse-layer
  re-compositions are correct + verified) — sequence them after M4 when `parse-expr`
  is stable.
- **K8** (`function`→`fn` refactor) — co-gated on K2; once the cluster lands K2's fix,
  K8 unblocks as a standalone whole-native-parser dispatch.

---

## S113 ANOMALIES + process notes (for the next PA)

**MK2.1 agent STALLED (Round 1) — recovered.** Implementation fully committed; test file
uncommitted + 1 missing-import bug. PA crash-recovery salvage (one-word fix, verified,
landed). The established uncommitted-work-recovery pattern.

**`--no-verify` brief gap — found + FIXED.** Two agents (M2.4, M3.2) used `--no-verify`
on interior commits — root cause: a code change + its coupled test update create a
transiently-red window if committed separately. The Round-4+ brief states explicitly:
**a code change AND its coupled test update are ONE logical unit — commit together.**
Held cleanly Rounds 4/5 (MK3.1 self-corrected a reflex `--no-verify`; M3.3/M3.4/MK3.x
all clean). Carry this clause in every future native-parser dev brief.

**Five Rule-4 brief/charter-vs-SPEC corrections (agents caught them):** M2.4 (`not`-prefix
— §42.10), MK2.2 (mismatched-closer is E-MARKUP-002 not E-CTX-001 — §4.4.1), MK3.1
(`<engine>` body itself is not a code-bearing locus — §4.18.1's 3 loci), MK3.2/MK3.3
(SPEC §4.18.3 "only two escape sequences" vs §4.18.4's `\${` — see carry-forward #6).
The agents' SPEC-verify discipline is working — keep the "verify, don't assume" reminder
in briefs.

**Path-discipline hook:** fired on several dispatches (main-rooted Write/Edit attempts) —
EVERY one rejected pre-write, agent corrected. **Zero leaks across all 11 S113 dispatches.**

**K-class ledger (roadmap §4.4):** K1 ✅ resolved (MK3.1). K2 — in the cluster dispatch.
K3/K4/K5 — post-M4 (parse-expr-coupled). K6 — M4.2 unifies it. K7 ✅ resolved (M3.3 —
the prototype-pollution fix). K8 — `function`→`fn`, co-gated on K2.

---

## Open questions / carry-forwards

1. **Native-parser arc** — M4.1 + cluster in flight; then M4.2 → M4.3 → MK4 → M5/M6.
2. **K3/K4/K5 post-M4 dispatch** + **K8 after K2 lands** — sequenced cleanup.
3. **SPEC §4.18.3 / §4.18.4 escape-count inconsistency** — §4.18.3 says `\"`/`\\` are
   "the only two escape sequences"; §4.18.4 adds `\${`. The native parser implements the
   correct 3-escape union. A one-line §4.18.3 editorial amendment reconciles it — a SPEC
   decision for the user (SPEC.md not touched by PA/agents).
4. **Native-parser-local error codes** — the native parser uses an `E-STMT-`/`E-EXPR-`
   parser-stage code namespace (NOT the SPEC §34 catalog). §34 reconciliation is an M5
   swap-in concern — flag it in the M5 brief.
5. **MK4 `renders`-token note** (from MK2.3) — the R1 spike §1.2 prev-token set names
   `renders`, but the JS-subset `TokenKind` has no `KwRenders` (only `KwRender`). The MK4
   seam brief must confirm the InCode-dispatch prev-token set against the real `TokenKind`
   enum, not the spike's sketch.
6. **§29 vanilla-interop** — retire vs implement — undecided (S110 carry).
7. **v0.4 release-cut** — queued, unscheduled. v0.4 = release-cut of accumulated
   post-v0.3.0 work; charter-B native parser is v0.5+/multi-quarter, NOT v0.4.
8. **Push** — many S113 commits unpushed (`7c3d898` → HEAD). Pre-push hook is a ~5-min
   full gate. User said "say the word when you want them pushed."
9. Pre-existing carries (see `handOffs/hand-off-114.md`): bare-variant-inference-nested
   fix; PRIMER match-block section; Bug 1 ring-offset; tableFor v1.next impl; etc.

## Things S113+ PA must NOT screw up

- Every compiler-source `isolation:"worktree"` dispatch brief MUST carry the
  `git merge main --no-edit` startup step + a predecessor-file check (S112 finding) +
  the coupled-code+test = one-logical-unit commit-discipline clause (S113 fix).
- The native-parser `.scrml` files do NOT all compile cleanly (K2 remains) — EXPECTED;
  the `.js` shadows are the executable surface. Do not chase compile errors.
- Roadmap §5 progress table is PA-owned — agents briefed not to touch the roadmap.
- The grain debate is PARKED for M5 — do not run it early.
- K3/K4/K5 are parse-expr-coupled — do NOT dispatch them parallel to an M4 sub-step.

---

## State-as-of (S113, M4 + cluster dispatched)

| Item | Status |
|---|---|
| HEAD | the M4-decomposition + hand-off-refresh commit (this commit) |
| Tests | **17,706 pass / 0 fail / 169 skip / 1 todo** (+866 vs S112; 0 regressions) |
| `compiler/src/` changes | none — native parser ships alongside |
| Worktrees | main + 11 retained (one per landed S113 dispatch) + 2 in-flight — clean at wrap |
| scrmlTS origin sync | many unpushed S113 commits |
| scrml-support origin sync | clean |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 |
| `.claude/maps/` | fresh — cold-refreshed S113 at `87453fb` |

## S113 commit ledger

`7c3d898` housekeeping (maps + roadmap MK2 §3.1) · `17e1099` M2.4 · `226797c` MK2.1 ·
`0a5350e` roadmap M3 §3.2 · `dcb61b8` M3.1 · `86f818c` MK2.2 · `d0cffc5` M3.2 ·
`e5ed5c7` MK2.3 · `99c6b8e` hand-off refresh · `c36c234` roadmap MK3 §3.3 ·
`0ef46230` MK3.1 · `3524e69b` M3.3 · `060fd0be` MK3.2 · `f113259d` M3.4 ·
`1a51286c` MK3.3 · `<this>` roadmap M4 §3.4 + hand-off refresh.

## Tags

#session-113 #OPEN #native-parser #charter-B #implementation-arc
#M2-complete #M3-complete #MK2-complete #MK3-complete #M4-dispatched #cluster-dispatched
#11-sub-steps #4-milestones #zero-regressions
