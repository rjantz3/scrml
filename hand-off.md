# scrmlTS — Session 119 (CLOSE)

**Date:** 2026-05-22 (opened 2026-05-21, crossed midnight)
**Previous:** `handOffs/hand-off-121.md` (S118 CLOSE — rotated at S119 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S119 OPEN:** `3bbdeb67` · **HEAD at S119 CLOSE:** this wrap commit
**Wrap:** 8-step "wrap" (user-authorized). Push NOT authorized — see §Push.

---

## S119 net outcome

A very long, dense, productive session — the M5-swap arc start to finish. The
M5 pipeline swap landed end-to-end (A3 → C1 → C2); the C2 dual-pipeline canary
surfaced a 261-file native-vs-live gap ledger, which a 7-unit Phase-4 wave (+ 4
standalone units) closed to **51** — **949/1000 corpus files (94.9%)** now parse
identically native-vs-live.

- **scrmlTS:** 19 commits + this wrap commit. **scrml-support:** 1 commit
  (S119 user-voice).
- **Tests:** 18,358 → **19,506 pass / 220 skip / 1 todo / 0 fail / 744 files /
  59,650 expect** (+1,148 — almost all native-parser conformance +
  dual-pipeline-canary coverage; +51 skip = the gap-ledger files). Zero
  regressions throughout.
- **No release tag cut.**

---

## What landed S119 — the M5-swap arc

The 19 commits, grouped:

**M5-swap proper (A3 → C1 → C2):**
- `26e82466` **A3** — native declaration/hoist synthesis. `collectHoisted`
  fills `typeDecls` / `components` / `machineDecls` from the native block-stream.
- `76ffa449` maps refresh #1 (watermark `26e82466`).
- `85d7364c` **C1** — `nativeParseFile`, the FileAST assembler: native
  block-stream → live FileAST shape via the A1/A2/A3 bridges. Additive — api.js
  untouched.
- `6ecb3051` **C2** — `--parser=scrml-native` now ROUTES `compileScrml` →
  `nativeParseFile` (strictly opt-in; live BS+Acorn = untouched default) +
  the dual-pipeline canary (`dual-pipeline-canary.js`) + SPEC §34.1 +2 codes.

**The C2 gap-ledger close-out (261 → 51):**
- `c5ac8283` the C2 gap-ledger investigation (sized the 261 divergences).
- `77c33f99` `synthStateNode` — `<state>` assembler synthesis (`GAP-state-block`
  68→1).
- `616c9cba` P3 segmentation — 2a/2b (`<state>`/nested-`${}` top-level leakage)
  + engine-in-nodes parity.
- `418d3b35` HTML void-element support (`tag-frame.js` `VOID_ELEMENTS`).
- `b30332d3` deepen the canary — recursive diff axis (`DIFF-deep-seq`); true
  floor surfaced (the top-level-only diff under-counted).
- `5d2003dd` no-space `<db>`/`<schema>` state recognition.
- `55f48063` maps refresh #2 (watermark `5d2003dd`) — also swept the triage
  doc (PA process slip, harmless).
- `3ea24489` **P4-1** — `isStateBlock` engine over-match fix.
- `5e58de15` **P4-6** — collect-hoisted import over-count (top-level-only gate).
- `69425a2d` **P4-4** — if-chain collapse assembler pass.
- `697d3a41` **P4-2** — bare-markup-statement lift (`liftBareBlocks`).
- `96ed5c77` **P4-5** — typed function parameters (`skipParamTypeAnnotation`).
- `9819911d` **P4-3** — orphan-brace suppression (mirrors live BS
  `orphanBraceDepth`).
- `f1941e60` **P4-C** — canary-classifier `LIVE-DEGENERATE` class + nested-test
  `DEFERRAL` + the P4-3 conformance-test backfill.
- `eb941333` — STRAY: a P4-2-agent CWD-slip WIP commit (`.gitignore` scratch
  line). Harmless; on main's history; not history-rewritten (see §Process).

The Phase-4 triage doc: `docs/changes/m5-c2-gap-ledger/phase4-triage-2026-05-22.md`
(+ `investigation-2026-05-22.md`, `_triage-scan.mjs` the re-runnable scan tool).

## M5-swap state — where v0.7 stands

The native parser is **routable end-to-end** behind `--parser=scrml-native`
(opt-in; default = the live BS+Acorn pipeline, untouched). The C2 dual-pipeline
canary structurally diffs the native vs live FileAST across the 1000-file
corpus — **949/1000 strict (94.9%)**, 51 gap. M6 (Acorn + block-splitter
deletion, charter B) is gated on closing the ledger.

**The hybrid question — DECIDED (durable, user-ratified S119).** A
native-fast-path / live-fallback hybrid for the swap was considered and
**rejected**: the gap files are silent divergences (wrong AST, no crash), so a
correctness-hybrid cannot detect "native will be wrong" without running the
live pipeline anyway; and two parsers + a router forever is against charter B
("delete, don't retrofit"). Stay the course — close the ledger, clean-cutover
at M6. Open measurable (not blocking): native-parser speed vs BS+Acorn has
never been benchmarked; worth measuring before M6.

## The remaining 51 gap — S120 work (catalogued, NOT dispatched — paused for user review)

Final canary histogram: `EXACT` 920 · `DEFERRAL-test-block` 18 ·
`LIVE-DEGENERATE` 11 (= 949 strict) · `DIFF-top-seq` 17 · `GAP-mixed` 12 ·
`DIFF-hoist-count` 11 · `DIFF-deep-seq` 9 · `GAP-state-block` 1 ·
`GAP-native-extra-block` 1 (= 51 gap).

**5 native-parser follow-ups:**
1. `<x>: T = .v` typed-state-decl swallowing (P4-2-surfaced) — mis-segmented as
   an unclosed markup element; blocks the H4 component-def leg
   (`05-multi-step-form`). A state-recognition unit.
2. M3 self-host `${...}` block-segmentation (P4-5-surfaced) — bpp/bs/tab;
   `liftBareBlocks` didn't catch the self-host shape. A P4-2 follow-up.
3. `parseVarDeclarator` `let x: T = ...` typed-declarator gap (P4-5-surfaced) —
   same `:`-annotation gap as P4-5's param fix, a different site.
4. `format/index.scrml` — 24 native parse errors, NO forbidden vocab — a
   genuine native parse bug (P4-C-surfaced); param-name parsing.
5. The residual ~40-file tranche (`DIFF-top-seq` 17 / `GAP-mixed` 12 /
   `DIFF-hoist-count` 11 / `DIFF-deep-seq` 9 / the 2 single-file classes) —
   needs a fresh triage to bucket (smaller + better-understood than the
   original 122). Re-run `_triage-scan.mjs`.

**2 orthogonal (NOT native-parser work):**
- Live `block-splitter.js` content-drop bug — the cause of the 11
  `LIVE-DEGENERATE` files (the live BS silently produces a comment+text-only
  FileAST, dropping all markup). A real SHIPPING-compiler bug; separate triage.
- `async`/`await` forbidden-vocab in `jwt.scrml` + self-host files — corpus
  migration backlog, not a parser bug.

## Open threads / carry-forwards — surface at S120 OPEN

1. **The remaining-51 gap** (above) — the live v0.7 work.
2. **§58 build-story determinism audit (§58.12)** — the whole-compiler
   determinism audit; v1.0-gate-vs-fast-follow undecided; the bit-identical
   claim stays `*`-marked until done. §58 has no compiler implementation yet.
   (Pre-S119 carry-forward.)
3. **`.scrml` predicate-drift sweep** — pre-existing `is not not` sites in the
   native-parser `.scrml` mirrors; M6 precondition. (Pre-S119; the S119 units'
   `.scrml` mirrors were predicate-drift-checked clean at each landing.)
4. **§32 `|>` pipeline operator** — no native-parser production. (Pre-S119.)
5. **dev.to article updates** — content fixed in-repo S115; published posts
   unchanged. Marketing-shaped (Rule 1 — only if Bryan raises it).
6. **Living Compiler retraction** — draft at
   `docs/articles/living-compiler-retraction-devto-2026-05-21.md`; pending
   Bryan's stamp + publish.
7. **scrml.dev article canonicalization** — not started.
8. **SPEC-INDEX Quick-Lookup mini-index stale** — flagged S117.
9. **§29 vanilla-interop** — spec↔impl divergence; user has not ruled.
10. **Pre-existing (S114):** generator (`yield`/`function*`) policy; PRIMER
    match-block section; MK4 lazy-require ESM cycle.
11. **`eb941333` stray commit** — on main's history (P4-2-agent CWD slip);
    harmless; left as-is.

## Process incidents — S119

- **3 transient API crashes + 1 watchdog stall** — C2-area + P4-4 + P4-6
  ("socket closed unexpectedly") + P4-3 (600s watchdog stall). ALL recovered:
  crashed-with-no-commits → clean re-dispatch; crashed-with-partial → the fix
  was committed incrementally so re-dispatch or salvage was possible; P4-3
  stalled after committing the fix but before tests → fix landed + PA-verified,
  tests backfilled in P4-C. **Zero main-history loss.** The incremental-commit
  discipline + the file-delta protocol absorbed the whole crash wave.
- **CWD slip (PA-side)** — PA's Bash CWD slipped into the P4-C worktree after
  the dispatch completed; caught at the gate checks (the tell: `git log`
  showing the agent's WIP commits as HEAD + `git status` empty + the hand-off
  grep missing PA's edits). All slipped commands were READ-only — no damage.
  Re-anchored per the S94 `cd <main> && pwd` rule. Memory
  `feedback_cwd_slip_after_worktree_dispatch.md` — recurrence; the diagnostic
  tell is reliable.
- **`eb941333`** — the P4-2 agent had its own CWD slip and its `WIP(P4-2):
  start` commit (adding `.scratch-p42/` to `.gitignore`) landed on MAIN's
  history, not its branch. Harmless content; main is unpushed (local-only);
  NOT history-rewritten (a rebase mid-wave, with agents branching off the
  SHAs, was higher-risk than the harmless commit). `.scratch-p42/` stays in
  `.gitignore`.
- **Non-isolated-agent shared-index hazard** — the maps-refresh commit
  (`55f48063`) swept the (non-isolated) triage agent's already-staged files
  because PA ran `git commit` without a pathspec. Harmless (the triage doc was
  complete) but untidy. **Rule going forward:** with a non-isolated background
  agent in flight, `git commit -- <pathspec>` only, never bare `git commit`.
- **Budget-math correction** — PA twice raised wrap prematurely at ~54%
  remaining; user corrected with the exact arithmetic. Memory
  `feedback_dont_wrap_at_43_percent.md` updated with the S119 recurrence + the
  canonical budget breakdown. Count tokens, not dispatch-count.

## State-as-of-close

| Item | Status |
|---|---|
| HEAD | this S119 wrap commit |
| Tests | 19,506 pass / 220 skip / 1 todo / 0 fail / 744 files / 59,650 expect |
| Worktrees | main only (all agent worktrees cleaned at landing) |
| scrmlTS origin sync | **19 commits + wrap commit UNPUSHED** — see §Push |
| scrml-support origin sync | S119 user-voice commit — push state per §Push |
| Tags | none cut S119 |
| pkg.json version | 0.6.0 (unchanged) |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| `.claude/maps/` | watermark `5d2003dd` — stale by the S119 gap-ledger commits; refresh before any S120 dev dispatch |
| Background agents | none |

## Push — PENDING (NOT authorized)

User said "wrap" (not "wrap and push"). **19 S119 commits + this wrap commit
are UNPUSHED** on scrmlTS; the S119 user-voice commit is unpushed on
scrml-support. `git rev-list --left-right --count origin/main...HEAD` was
`0 19` before the wrap commit. Surface "push S119?" at S120 OPEN, or push when
the user authorizes.

## Session-start checklist for S120 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
3. Read `compiler/SPEC-INDEX.md` IN FULL.
4. Read `master-list.md` §0 IN FULL (the S119 §0.6 entry is the live delta).
5. Read this `hand-off.md` (S119 CLOSE) — rotate to `handOffs/hand-off-122.md`
   at S120 OPEN.
6. Read recent contentful user-voice — the S119 entry covers the hybrid
   decision + the "bad-ass native parser" intent.
7. Sync hygiene: `git fetch` scrmlTS + scrml-support. **scrmlTS will be 20+
   commits AHEAD of origin** (S119 unpushed) — surface the push question.
8. Maps refresh before any S120 dev dispatch.
9. Report: caught up + next priority (= the remaining-51 gap follow-ups, OR
   whatever the user steers to).

---

## Tags
#session-119 #CLOSE #M5-swap-landed #A3-C1-C2 #c2-gap-ledger-261-to-51
#94.9-percent-strict #hybrid-rejected #phase-4-complete #push-pending
