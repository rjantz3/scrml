# scrmlTS — Session 116 (CARRYOVER — quick, not a full wrap)

**Date:** 2026-05-21
**Previous:** `handOffs/hand-off-118.md` (S115 CLOSE — rotated at S116 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S116 OPEN:** `ca1001de` (S115 wrap) · **HEAD at S116 carryover:** this commit
**This was a SHORT session** — user asked for a quick carryover, NOT a full 8-step wrap. master-list / CHANGELOG / full test run / inbox-outbox / meta-docs were intentionally skipped.

---

## S116 net outcome

A short session: session-start checklist, 2 orphaned deep-dives landed, M5-swap brief drafted, the build-story debate fired + judged, vendoring debate experts staged for next session.

- **scrmlTS:** 1 carryover commit (this one). **scrml-support:** 2 commits (`3a4889a` deep-dives, `3282c9c` debate record).
- **No test run this session** — no compiler source touched. Baseline stands at S115 CLOSE: 18,102 pass / 0 fail / 169 skip / 1 todo / 738 files.
- **No release tag.** v0.4.0 stands (S114).

---

## What landed S116

1. **2 orphaned S115 deep-dives committed to scrml-support** (`3a4889a`) — `code-import-story-and-vendoring-2026-05-21.md` + `compiler-story-living-compiler-2026-05-21.md`. S115 THREAD 3 authored them but the S115 wrap never `git add`-ed them. Frontmatter normalized to the S115 doc-currency convention (`status: current` + `last-reviewed:`; compiler-story had non-enum `status: active`, code-import had none).

2. **M5-swap brief DRAFTED** — `docs/changes/m5-v0.5-compressed-ladder/BRIEF-M5-SWAP.md`. The v0.6 milestone. NOT dispatched — awaiting user review. See THREAD 1 below.

3. **Build-story debate FIRED + JUDGED** — see THREAD 2. Debate record at `scrml-support/docs/debates/debate-build-story-artifact-2026-05-21.md` (`3282c9c`); design insight in `~/.claude/design-insights.md`.

4. **Vendoring-debate experts STAGED** — `nix-expert` / `roc-expert` / `go-module-vendoring-expert` copied from `~/.claude/agents-store/` → `~/.claude/agents/`. They load next session. See THREAD 3.

---

## THREAD 1 — M5-swap brief (DRAFTED, awaiting user review)

`docs/changes/m5-v0.5-compressed-ladder/BRIEF-M5-SWAP.md` — the v0.6 milestone (re-entered M5 = the actual `--parser=scrml-native` pipeline swap). 4 phases, agent `scrml-js-codegen-engineer`, worktree:

- **Phase 0** — bridge-divergence re-survey + **STOP gate**: verify F1/F7/F8 + v0.5 units actually closed the M5-ast-bridge-scoping divergence; STOP/escalate to PA if residual swap work exceeds ~14h (the DD #27 premise is 6-12h).
- **Phase 1** — SPEC §34 reconciliation, **PLAN-first + STOP gate**: the native parser fires **~66 codes not in §34** (`E-EXPR-*` ~32 + `E-STMT-*` ~34 — verified by grep this session; `E-ASYNC-NOT-IN-SCRML`/`E-AWAIT-NOT-IN-SCRML`/`E-UNQUOTED-DISPLAY-TEXT` already in §34). Agent produces a per-code classification + family-level recommendation, STOPs for PA ratification before writing 66 catalog rows.
- **Phase 2** — the pipeline swap (`nativeParseFile` → FileAST adapter in api.js; PRECG-onward unchanged).
- **Phase 3** — dual-pipeline canary + conformance gate + `.scrml`-predicate guard.

**Open items for the user before dispatch:**
- **Phase 1 split?** §34 reconciliation could be a parallel `general-purpose` SPEC-text dispatch. Kept in-brief because SCOPE-v0.6 mandates the M5-swap brief *include* it AND the codes must land in §34 *with* the swap (same version). User's call whether to split.
- **Maps refresh required before dispatch** — `.claude/maps/` watermark `092fa90a`, HEAD ~21 commits ahead. The brief has `<PA-FILLS-SHA>` / `<PA-FILLS-DATE>` / `<PA-FILLS-ABSOLUTE-WORKTREE-PATH>` placeholders to fill at dispatch time.

Seam facts gathered this session (in the brief): api.js Stage 2 (BS) + Stage 3 (TAB) produce `tabResults` = `{filePath, ast: FileAST, errors}`; Stage 3.004 (PRECG — F5/F6 passes) onward consume `tabResult.ast` pipeline-agnostically. The swap replaces the BS+TAB loop for the native path; PRECG-onward is untouched. The `parser` option is already threaded into `compileScrml` (api.js ~481; the `parser==="scrml-native"` branch ~1835 currently only emits `I-PARSER-NATIVE-SHADOW`).

## THREAD 2 — build-story debate (RUN + JUDGED S116)

Fired the build-story-artifact debate (S115 carry-forward — panel was fully loaded). Challenge: flat name+hash lockfile (A) vs content-addressed Merkle closure (B) — is the build story a *record* or a *proof* of the four components?

**Scores:** simplicity-defender (A) **48.5** / unison-expert (B) 47.5 / security-expert (B) 45.5 — 1-point spread; "the panel traded rather than split."

**Convergence finding:** all three agree the four components form a **DAG, not a peer set**, and all three concede A's flat artifact **cannot self-detect an incoherent arrangement** (e.g. compiler bumped, stdlib still pinned at the hash from the old compiler — every hash valid, the relationship wrong). The narrow split is **where the coherence check lives** — out-of-band in the resolver (A) vs in-band inside the artifact's hash (B). A wins ergonomics/DX/clarity; B fits scrml's own §47 content-addressing philosophy.

**OPEN DECISION (carry-forward):** the A-vs-B artifact-shape ratification is NOT resolved by the debate — it is a PA/user call. Key input: security-expert's unrebutted point that a *secure* flat-A (compiler in the gated hash, component hashes computed over inputs, topology tool-enforced) "has already become B internally" — so the real question is explicit-inspectable-DAG (B) vs undocumented-build-tool-invariant (secure-A). Debate record: `scrml-support/docs/debates/debate-build-story-artifact-2026-05-21.md`.

## THREAD 3 — debate roster

- **Build-story debate** — RUN this session (panel `simplicity-defender`/`security-expert`/`unison-expert` was already loaded).
- **Vendoring debate** — experts (`nix-expert`/`roc-expert`/`go-module-vendoring-expert`) existed forged in `~/.claude/agents-store/` but weren't loaded. **Staged this session into `~/.claude/agents/`** — they load next session. Panel per the code-import DD: `security-expert` + `nix-expert` + `go-module-vendoring-expert` (capabilities load-bearing) vs ... + `roc-expert` synthesis voice. (Note: S115 hand-off said "vendoring needs experts forged" — WRONG, they were already forged; only staging was needed.)
- **§29 debate** — vanilla-interop retire-vs-implement. **Panel still UNDEFINED** — needs a design decision (who argues retire vs implement) before it can run.
- `~/.claude/agent-registry.md` index does not yet reflect the staged agents — run `/registry update` next session if the index matters (not blocking; agents load from the dir regardless).

---

## Open questions / carry-forwards — surface at S117 OPEN

1. **M5-swap brief — user review pending.** Then: maps refresh → fill brief placeholders → dispatch. Decide the Phase-1-split question.
2. **Build-story artifact A-vs-B — open PA/user ratification** (THREAD 2). Debate informs, doesn't settle.
3. **§29 debate panel — undefined.** Needs a who-argues-what decision.
4. **README synthesis paragraphs HELD till post-debate.** The build-story + code-import one-paragraph syntheses live in the 2 DDs (`compiler-story...:558`, `code-import...:347`) — NOT in the README. Held because both are partly nominal (build-story determinism gap; `vendor:` designed-not-built) and front-run the (now partly-run) debates. Post-ratification they can land with the S115 nominal/asterisk convention applied. The build-story debate is now run — its paragraph is closer to landable once A-vs-B is ratified.
5. **The `.scrml`-correctness gate is an M6 precondition** (S115 carry-forward) — F1/F7/F8 each shipped a malformed `.scrml` predicate (`is not not` is not scrml — presence is `is some`). Native-parser `.scrml` tier is not test-run. Memory `feedback_native_parser_scrml_predicate_drift.md`.
6. **Living Compiler retraction** — draft committed (`docs/articles/living-compiler-retraction-devto-2026-05-21.md`); pending Bryan's stamp + publish (user action).
7. **scrml.dev article canonicalization** — port surviving dev.to articles to canonical `.scrml` pages. Not started.
8. **ADR + gauntlet-report follow-on sweep** — S115 currency sweep flagged same write-once risk; not audited.
9. **Ext 3 + Ext 2 briefs** — the rest of the full-body-split family; not authored.
10. **Pre-existing (S114):** generator (`yield`/`function*`) policy; tableFor v1.next impl; PRIMER match-block section; MK4 lazy-require ESM cycle.
11. **claude.md restructure question (S116)** — user asked if moving wrap/handoff/pa-reqs into CLAUDE.md speeds session-change. PA answer: NO — CLAUDE.md is injected every turn (not read-once), so it'd be per-turn overhead not a one-time cost; also pollutes other projects / the public repo and reverses the S96 audience decision. Recommended against. Logged in case the user wants to revisit.

## Push state — PENDING (surface at S117 OPEN)

- **scrmlTS:** this carryover commit — unpushed.
- **scrml-support:** 2 commits ahead of origin — `3a4889a` (deep-dives) + `3282c9c` (debate record) — unpushed.
- Single-machine (S100) so non-blocking; surface for user push authorization. User said "not a full wrap" — push (wrap step 7) was intentionally not done.

## State-as-of-carryover

| Item | Status |
|---|---|
| HEAD | this S116 carryover commit |
| Tests | 18,102 pass / 0 fail / 169 skip / 1 todo (S115 CLOSE — not re-run; no compiler source touched S116) |
| Worktrees | main only |
| scrmlTS origin sync | 1 commit ahead — unpushed |
| scrml-support origin sync | 2 commits ahead — unpushed |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.4.0 (v0.4.0 tag stands — S114) |
| `.claude/maps/` | watermark `092fa90a`; ~21 commits behind — refresh before any S117 dev dispatch |
| Debate experts loaded next session | + nix-expert, roc-expert, go-module-vendoring-expert (staged S116) |
| Background agents | none |

## Session-start checklist for S117 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
3. Read `compiler/SPEC-INDEX.md` IN FULL.
4. Read `master-list.md` §0 IN FULL.
5. Read this `hand-off.md` (S116 carryover) — rotate to `handOffs/hand-off-119.md` at S117 OPEN.
6. Read recent contentful user-voice — NOTE: S116 produced no user-voice append (short session, no new durable directives beyond what's captured here; the claude.md-restructure Q is logged in carry-forward #11).
7. Sync hygiene: `git fetch` scrmlTS + scrml-support — BOTH have unpushed S116 commits (see Push state).
8. Maps refresh — watermark `092fa90a`, HEAD ahead. Refresh before any dev dispatch.
9. Report: caught up + next priority (= M5-swap brief review/dispatch + the build-story A-vs-B ratification).

---

## Tags
#session-116 #CARRYOVER #m5-swap-brief-drafted #build-story-debate-run
#build-story-A-vs-B-open #vendoring-experts-staged #push-pending
