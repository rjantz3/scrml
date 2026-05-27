# scrmlTS — Session 135 (CLOSE)

**Date:** 2026-05-26
**Previous:** `handOffs/hand-off-137.md` (S134 CLOSE — const-deep-freeze full arc + Q6 SPEC + B-prereq + Bug 17 + Iter L3 + Lifecycle L3 + README rewrite).

**HEAD at CLOSE:**
- scrmlTS: (set after final wrap commit; will push)
- scrml-support: `1977539` (S115 normalization; will push)
- pkg.json: 0.6.1 (unchanged S133→S135)

**Tests at CLOSE:** **21,762 pass / 0 fail / 170 skip / 1 todo / 801 files** (+61 from S134 baseline 21,701; zero regressions).

**S99 path-discipline counter:** 20 (held throughout S135; zero leaks across 3 worktree dispatches: Q6-narrow / B-prereq follow-ups / structural-in-logic-body).

**Maps:** refreshed at wrap to current HEAD (was watermark `3a660c7c` mid-S135).

**Worktrees:** main only (3 S135 worktrees cleaned via wrap step 6b).

**PA auto-memory:** 42 rule files (added `feedback_archive_dispatch_brief_md.md` for DD Rec #14 operationalization).

---

## S135 commit ledger (21 substantive commits)

**scrmlTS (19 commits):**

| SHA | Subject |
|---|---|
| `2ffe4f6a` | feat — Q6-narrow `reset(@cell)` × lifecycle (§6.8.3 impl-deferred bullet CLOSED) |
| `513fd9ca` | docs — SPEC §6.8.3 status flip + known-gaps Bug 21+22 |
| `8a0079a7` | docs — README L5 "A complete compiler for the web" positioning switch |
| `a7167b6b` | fix — Fix #1 `findTopLevelArrow` whitespace tolerance |
| `fefecb1b` | fix — Fix #3 qualified-enum stripping + diagnostic preLabel + TRANSITION_CALL_RE `@` tolerance |
| `a5feca4b` | test — 17 source-form lifecycle tests |
| `1f6cc614` | docs — lifecycle-followups progress.md |
| `93496a50` | docs — known-gaps Bug 23/24/25 + Landings table |
| `c82fe500` | docs — Phase-1c cluster N (7 footnotes) |
| `ddd4dbc2` | docs — Phase-1c cluster M (module/type-system 4-gap) |
| `b2fd54e8` | docs — Phase-1c clusters K + J (temporal + error-handling) |
| `9583af0d` | WIP — structural-in-logic startup |
| `ab0d13a3` | fix — structural-in-logic-body + 19 tests (silent-swallow CLOSED) |
| `e914de46` | docs — SPEC §34 row update |
| `564bd05d` | docs — structural-in-logic progress.md |
| `f481d316` | docs — known-gaps Bug 26+27 + §0 inventory |
| `bfadb283` | docs — Phase-1c cluster H (flagship `^{}` + L22 + refinement) |
| `f6c98ed8` | docs — Phase-1c clusters I + L (self-host idiom + compute-isolation) |
| (wrap)   | chore — S135 close (this commit; maps refresh + hand-off + master-list §0.6 + CHANGELOG + known-gaps) |

**scrml-support (2 commits):**

| SHA | Subject |
|---|---|
| `2718a0e` | docs — S115 frontmatter backfill (57 truly-missing DDs) |
| `1977539` | docs — S115 frontmatter normalization (119 non-enum DDs) |

**PA auto-memory (non-git):**
- `feedback_archive_dispatch_brief_md.md` — NEW (DD Rec #14 operationalization)

---

## Arcs closed this session

1. **Lifecycle reset × lifecycle (§6.8.3 impl-deferred bullet CLOSED)** — Q6-narrow reset-awareness via Option α additive `RESET_CALL_RE`; both Tracker 1 (cell-value Shape 1) + Tracker 2 (struct-typed Shape 1 field) implement. 25 tests.
2. **Lifecycle Shape 1 source-form variant-progression** — `findTopLevelArrow` whitespace tolerance + `parseLifecycleReturnAnnotation` qualified-enum stripping + `TRANSITION_CALL_RE` `@` tolerance. Source-form path works end-to-end. 17 tests.
3. **Structural-element silent-swallow class CLOSED** — E-STRUCTURAL-ELEMENT-MISPLACED fires for 9 structural elements in `${...}` body (was silent html-fragment fallback). Subsumes both S133 C-deferred carry-forwards. 19 tests.
4. **README L5 positioning cascade** — final site in the S133 "A complete compiler for the web" cascade closed.
5. **S115 frontmatter on 192 DDs (DD Rec #7 fully closed)** — 57 backfill + 119 normalization; 100% S115-enum-conformant.
6. **Phase-1c canon coverage — ALL 26 F-XXX gaps closed** across 7 clusters (N/M/K/J/H/I/L); cluster O deferred per HU-6.
7. **DD Rec #14 — BRIEF.md archival rule operationalized** as PA auto-memory; applies S136+.

---

## Worktree dispatches this session (S99 + S88 + S83 verified clean)

| Agent ID | Subagent | Work | Landing |
|---|---|---|---|
| `a4e2d60c93cd06bd2` | scrml-js-codegen-engineer | Q6-narrow reset(@cell) × lifecycle | file-delta `2ffe4f6a` |
| `acd9cb4de49606d54` | scrml-js-codegen-engineer | B-prereq orthogonal #1 + #3 (source-form fixes) | cherry-pick 4 commits |
| `a15f9bf0d9cccb189` | scrml-js-codegen-engineer | C-deferred (a) structural-in-logic-body | cherry-pick 4 commits |

All 3 dispatched with `isolation: "worktree"`. S99 first-commit pwd echo verified on each. S83 worktree-clean pre-cleanup gate verified on each. Zero leaks (S99 counter 20 → 20).

Cleanup at wrap (step 6b) — all 3 worktrees removed + branches deleted.

---

## Carry-forward to S136

### Standing watches (no action unless trigger)

- **A5 refinement-type freeze extension** — ≥2 adopter reports of JS-host boundary mutation re-opens
- **§29 vanilla-interop** — Nominal/spec-ahead per S131 Q-W3-4 + S132 reaffirmed; ≥2 friction reports re-trigger
- **B3 P3** — 8 missing stdlib builders; ≥2 friction reports re-trigger
- **A4 alias-tracking** — Phase 1 simplification limitation (cross-file alias tracking deferred); extend if friction surfaces

### 7 LOW deferred items filed S135

- Bug 21 (Q6-narrow deep multi-level reset uses fieldPath[0])
- Bug 22 (Q6-narrow cross-cell `default=@otherCell` classification heuristic)
- Bug 23 (W-LIFECYCLE-LEGACY-ARROW Shape 1 emission gap)
- Bug 24 (qualified-form discrim regex tolerance — `is Article.Draft` unmatched)
- Bug 25 (`transition()` deeper-expression regex tolerance)
- Bug 26 (`${...}` inside `function` body E-SCOPE-001)
- Bug 27 (`tryParseStructuralDecl` extra-lookahead cleanup)

All LOW; canonical scrml usage unblocked; extend on real adopter friction.

### Phase-1c cluster O (deferred per HU-6)

- F-036 `_{}` foreign code
- F-041 input states `<keyboard>`/`<mouse>`/`<gamepad>`

Both sliver-empty; `status: deferred` until empirical adopter signal.

### Other queued work

- **DD Rec #15** — gauntlet round (no gauntlets since 2026-04-26; ~month-long gap)
- **Description cascade — 8 articles** carrying "Introducing scrml: a single-file, full-stack reactive web language" link references; PA lean LEAVE per artifact fidelity (link text matches dev.to article title; changing it creates mismatch)
- **Pa.md amendment** — formalize DD Rec #14 BRIEF.md archival rule cross-session (memory file is per-machine; pa.md is cross-machine)
- **Phase 2 amendment items** still queued from HU-3/HU-4/HU-5 ratifications (small SPEC edits)
- **Description cascade — `docs/index.html` L67 "What is scrml?" prose** — PA lean LEAVE per descriptive-narrative-not-stale-positioning judgment; user can override

---

## Methodology lessons of the session

1. **`feedback_cookbook_vs_empirical` reinforced 4th consecutive session.** The structural-in-logic agent's empirical Phase 0 caught the brief's kill-list error on `<match>` in-flight (PA had bundled it with the other 9 structurals; empirical probe + promote-safety-harness surfaced 3 false-positives; `<match>` correctly identified as markup-as-value per §1.4 + §18.0.1; kill-list collapsed 10 → 9). Phase-0 STOPs continue to be the load-bearing dev-agent discipline.
2. **`feedback_file_delta_vs_cherry_pick` exercised twice** — both B-prereq follow-ups + structural-in-logic landings required cherry-pick because Q6-narrow added 355L to type-system.ts post-base; file-delta would clobber. Cherry-pick auto-merges additive changes cleanly. Confirmed the memory rule's "when sibling landings touched same file since agent base, cherry-pick" applies here.
3. **`feedback_coupled_code_test_commit`** honored on all 3 dispatches — impl + tests landed as one logical unit (avoiding transiently-red pre-commit gate windows).
4. **CWD-slip detected + reset on Q6-narrow landing** (S94 class) — Bash CWD slipped into the agent's worktree after task-notification reception; reset to scrmlTS via explicit `cd` before subsequent operations. Memory rule held.
5. **Phase-1c clear in one session.** All 26 F-XXX audit gaps from the S129 inverse-coverage audit closed across 7 actionable clusters in S135 — closes the entire Phase-1c canon-coverage queue HU-6 ratified S131. Single-session scope was substantive but bounded; sequential momentum from cluster N (footnotes; smallest) to cluster L (~500 SPEC-line silence; largest) worked.

---

## Open questions for S136 OPEN

1. **DD Rec #15 gauntlet round** — operationalize when? The Phase-1c canon-coverage clear S135 means the canon NOW reflects the post-S130 SPEC landings; a gauntlet round would empirically test whether adopter dev agents reading the refreshed canon actually write correct scrml. Likely substantive (~3-8h).
2. **Pa.md amendment for DD Rec #14** — formalize across-session? Memory file is single-machine; pa.md is cross-machine carrier.
3. **Description cascade 8 articles** — leave per PA lean (artifact fidelity) or sweep?

---

## State as of close

| Item | Value |
|---|---|
| HEAD scrmlTS | (set after wrap commit) |
| HEAD scrml-support | `1977539` |
| pkg.json | 0.6.1 |
| Tests | **21,762 pass / 0 fail / 170 skip / 1 todo / 801 files** (+61 from S134) |
| Worktrees | main only (3 cleaned at wrap) |
| Inbox | empty (one stale `dist/` from 2026-04-22 pre-S43; not actionable) |
| S99 path-discipline counter | 20 (zero leaks across 3 worktree dispatches) |
| PA auto-memory | 42 rule files |
| Maps | refreshed at wrap to current HEAD |

---

## Tags
#session-135 #CLOSE #phase-1c-complete #lifecycle-arc-end-to-end #structural-in-logic-closed #s115-frontmatter-sweep #dd-rec-14-banked #readme-positioning-cascade-closed
