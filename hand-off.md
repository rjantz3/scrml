# scrmlTS — Session 113 (OPEN — mid-session, post-Round-3)

**Date:** 2026-05-20
**Previous:** `handOffs/hand-off-115.md` (S112 CLOSE — rotated at S113 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S113 OPEN:** `87453fb` · **HEAD now:** `e5ed5c7`
**Origin sync:** scrmlTS — 8 unpushed S113 commits; scrml-support — clean.

---

## S113 net so far — native-parser arc, three parallel rounds, 6 sub-steps landed

S113 ran the charter-B native-parser arc as a work-horse session — three rounds of
two parallel `scrml-js-codegen-engineer` dispatches each, all 6 landed clean.

- **M2 ladder COMPLETE** — M2.1-M2.4 (M2.4 landed S113).
- **MK2 ladder COMPLETE** — MK2.1 + MK2.2 + MK2.3 (all S113). MK2 the milestone is DONE.
- **M3 — 2 of 4** — M3.1 + M3.2 landed; M3.3 + M3.4 pending.
- Maps cold-refreshed S113 (`87453fb` watermark; `compiler/native-parser/` mapped).
- M3 decomposed (§3.2 — M3.1-M3.4); MK2 was decomposed S113 too (§3.1).
- Tests: S112 close 16,840 → **17,335 / 0 fail / 169 skip / 1 todo** — **+495**, 0 regressions.

No `compiler/src/` changes — native parser ships ALONGSIDE the live pipeline
(`compiler/native-parser/`); swap is M5/M6.

---

## THREAD 1 (primary) — native-parser charter-B implementation arc

**Tracker:** `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — §5 progress
table = source of truth; §3.1 = MK2 decomposition (now COMPLETE); §3.2 = M3 decomposition;
§4.4 = known issues K1-K6.

**M-ladder status at this point in S113:**

| Mn | Layer | Status |
|---|---|---|
| M1 — composed-engines lexer | JS | ✅ COMPLETE (S99-S103) |
| M1.5 — expr-literals.js conformance flip | JS | ⬜ pending — minor polish |
| **M2 — JS expression parser** | JS | ✅ COMPLETE — M2.1-M2.3 (S112) + M2.4 (S113) |
| **M3 — JS statement parser** | JS | 🔶 §3.2 decomposed; **M3.1 + M3.2 landed**; M3.3 + M3.4 pending |
| M4 — full bounded JS subset | JS | ⬜ pending — not decomposed |
| **MK1 — `BlockContext` engine** | Markup | ✅ COMPLETE (S112) |
| **MK2 — `TagFrame` engine** | Markup | ✅ **COMPLETE** S113 — MK2.1 + MK2.2 + MK2.3 |
| MK3 — `BodyMode` + `DisplayTextLiteral` (§4.18) | Markup | ⬜ pending — not decomposed; resolves K1 |
| MK4 — markup↔JS seam; re-tokenizer scaffolding deletion | Markup | ⬜ pending — not decomposed |
| M5 — pipeline swap behind `--parser=scrml-native` | Both | ⬜ pending — incremental-components-DD revisit gate |
| M6 — joint retirement (BS + Acorn + BPP deleted) | Both | ⬜ pending |

**Next round (Round 4):** **MK3 + M3.3** — the clean disjoint parallel pair (MK3 markup,
M3.3 JS). **M3.3 is dispatch-ready** (decomposed §3.2). **MK3 is a milestone — needs a
per-sub-step decomposition first** (PA authors §3.3, same as MK2/M3 were decomposed; from
charter Q1.D/Q1.E + S98 D7). After Round 4: M3.4 (sequential after M3.3 — shares
`parse-stmt`); MK4 (the seam — needs M3/M4); then M5/M6.

**No dispatches currently in flight** — Round 3 fully landed. Clean stopping point.

**Authority docs:** charter dive `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md`;
S98 DD `scrml-native-parser-design-2026-05-17.md`; roadmap §3.1/§3.2/§4.4.

---

## S113 ANOMALIES + process notes (for the next PA)

**MK2.1 agent STALLED (Round 1) — recovered.** Stalled at the 600s watchdog with its
implementation fully committed (5 WIP commits) but the test file uncommitted + 1 bug
(`advance` used in 2 test helpers, never imported — 18 identical `ReferenceError`s).
PA crash-recovery salvage: one-word import fix, verified 145/18→163/0, committed to the
worktree branch, landed via file-delta. The established uncommitted-work-recovery pattern.

**`--no-verify` on interior WIP commits — TWO agents (M2.4, M3.2).** Both used `--no-verify`
on interior commits despite the Round-2 brief forbidding it. Substantively harmless under
the file-delta protocol (interior commits never reach main; PA landing commits + the
agents' final worktree commits all pass the full gate). **Root cause = a real brief gap:**
when a code change makes existing tests red until they are updated (forward-seam tests,
superseded-behavior tests), the agent is in a bind — the suite is transiently red between
the code commit and the test commit. **The fix for the Round-4 brief:** state explicitly
that a code change AND its coupled test update are ONE logical unit — commit them
together (then the hook passes, no red window, no `--no-verify` needed). Round-2/3 briefs
said "commit per logical unit" but did not name the coupled-change case.

**`pwd`-echo-in-first-commit skipped — M3.2 + MK2.3.** The S99 echo-pwd discipline aid
(first commit message carries the verbatim `pwd`) was not honored by 2 of the 6 agents.
Non-substantive — PA verified each worktree via the reported WORKTREE_PATH + the
agent-id↔worktree-dir match + the file-delta diff being scoped exactly to expected files
+ main staying clean. Zero leaks all session. The aid is redundant with those checks;
either tighten the brief wording or accept the other checks as sufficient.

**Path-discipline hook:** fired on M3.1 (3×) — all main-rooted Write attempts rejected
pre-write, agent corrected. Zero leaks across all 6 dispatches. The platform fix works.

**Two Rule-4 brief corrections (agents caught MY brief errors against the SPEC):**
- M2.4: brief said `not` has a "prefix form" — SPEC §42.10 / E-TYPE-045: prefix `not` is
  a compile error, `!` is negation. Roadmap §1 corrected.
- MK2.2: brief said mismatched `</name>` fires E-CTX-001 (echoed from charter dive Q1.F)
  — SPEC §4.4.1 / §34: it is **E-MARKUP-002**. Roadmap §3.1 corrected. (The charter dive
  Q1.F still has the stale E-CTX-001 — a completed deep-dive, not corrected; the live
  truth is roadmap §3.1 + the MK2.2 code.)

**K5 + K6 logged (roadmap §4.4):** K5 — M1 lexer gaps (`#`/`~`/`::`; M2.4 re-composes at
the parse layer). K6 — binding-pattern vs param-pattern divergence (M2.3 param
destructuring = literal stand-ins; M3.1 vardecl destructuring = real binding patterns;
M4 unifies). Neither blocks M3.x/MK3.x.

**MK4 forward-note (from MK2.3):** the R1 seam spike §1.2 names `renders` as a
markup-value-position keyword, but the JS-subset `TokenKind` enum has no `KwRenders` (only
`KwRender`). The MK4 seam brief must confirm the InCode-dispatch consumer's prev-token set
against the actual `TokenKind` enum, not the spike's sketch list. Non-blocking.

---

## Open questions / carry-forwards

1. **Native-parser arc** — Round 4 = MK3 (decompose first) + M3.3. Then M3.4; MK4; M5/M6.
2. **M1.x cleanup cluster** (M1.5 + K2 + K3 + K4 + K5 + K6) — one dispatch; K2 must
   precede M6. Queued.
3. **§29 vanilla-interop** — retire vs implement — undecided (S110 carry).
4. **v0.4 release-cut** — queued, unscheduled. v0.4 = release-cut of accumulated
   post-v0.3.0 work; charter-B native parser is v0.5+/multi-quarter, NOT v0.4.
5. **`docs/changes/` regrowth** — flagged S111 (~91 dirs); deref hygiene carry-forward.
6. **Push** — 8 S113 commits unpushed (`7c3d898` → `e5ed5c7`). Pre-push hook is a
   ~5-min full gate. User said "say the word when you want them pushed."
7. Pre-existing carries (see `handOffs/hand-off-114.md`): bare-variant-inference-nested
   fix; PRIMER match-block section; Bug 1 ring-offset; tableFor v1.next impl; etc.

## Things S113+ PA must NOT screw up

- Every compiler-source `isolation:"worktree"` dispatch brief MUST carry the
  `git merge main --no-edit` startup step + a predecessor-file check (S112 finding).
- Round-4 brief MUST add the coupled-code+test = one-logical-unit instruction (above).
- The native-parser `.scrml` files do NOT compile cleanly (K1 + K2) — EXPECTED; the
  `.js` shadows are the executable surface. Do not chase compile errors.
- Roadmap §5 progress table is PA-owned — agents are briefed not to touch the roadmap;
  PA flips the rows at landing.
- The grain debate is PARKED for M5 — do not run it early.

---

## State-as-of (S113 post-Round-3)

| Item | Status |
|---|---|
| HEAD | `e5ed5c7` + this hand-off-refresh commit |
| Tests | **17,335 pass / 0 fail / 169 skip / 1 todo** (+495 vs S112; 0 regressions) |
| `compiler/src/` changes | none — native parser ships alongside |
| Worktrees | main + 6 retained (one per landed dispatch) — clean at wrap |
| scrmlTS origin sync | 8 unpushed S113 commits |
| scrml-support origin sync | clean |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 |
| `.claude/maps/` | fresh — cold-refreshed S113 at `87453fb` |

## S113 commit ledger

| Commit | What |
|---|---|
| `7c3d898` | chore(s113-open) — maps cold-refresh + roadmap MK2 §3.1 decomposition + hand-off rotation |
| `17e1099` | feat M2.4 — JS expression parser scrml-extension forms (M2 ladder complete) |
| `226797c` | feat MK2.1 — TagFrame engine + opener recognition + TagKind |
| `0a5350e` | chore(s113) — roadmap M3 §3.2 decomposition + hand-off refresh |
| `dcb61b8` | feat M3.1 — JS statement parser substrate |
| `86f818c` | feat MK2.2 — closer forms + tag-tree pairing + mismatch recovery |
| `d0cffc5` | feat M3.2 — JS control-flow statements |
| `e5ed5c7` | feat MK2.3 — TagKind classification + P4/P5 — MK2 milestone complete |
| `<this>` | chore(s113) — hand-off refresh (post-Round-3) |

## Tags

#session-113 #OPEN #native-parser #charter-B #implementation-arc #M2-complete
#MK2-complete #M3-half #three-rounds #6-sub-steps #zero-regressions
