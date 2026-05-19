# scrmlTS — Session 105 (CLOSE — real)

**Date:** 2026-05-19
**Previous:** `handOffs/hand-off-107.md` (S104 CLOSE — rotated at S105 open)
**Machine:** single-machine (per S100 directive)
**HEAD at S105 CLOSE (pre-wrap):** `75ae8c5` (docs: README refresh)
**HEAD at S105 CLOSE (post-wrap):** `<wrap-sha>` (this hand-off + master-list + changelog wrap commit)
**Origin sync at CLOSE:** scrmlTS 0/0 (post-wrap push); scrml-support 0/0 (pushed `67fe2b8` earlier mid-session)

---

## S105 net outcome — substantial single-arc session; multi-track close

Session-open hand-off opened S105 as a SCOPING + dispatch session for tableFor (L22 family member #4). User then steered the foreground to mid-tier stragglers + parallel agent dispatches. Net result: **L22 family advances from 3-of-6 to 4-of-6 SHIPPED**, **§48.6.4 pinned-fn story closes end-to-end** (parser-recognition + semantic enforcement), **§41.14 formFor follow-on closes** (B1 reactive-bool-attr wiring), **G1 pre-existing test-isolation failure closes**, and the **README runtime benchmarks refresh** to current Chrome data.

Tracks landed (in order):

1. **§48.6.4 pinned-fn parser-recognition impl** (`dc3c460`, PA-direct ~30min) — AST `isPinned?: boolean` flag + recognition at both fn-decl sites + 16 unit tests. Parser-only; semantic enforcement was deferred.

2. **tableFor SCOPING + hook gate restoration** (`f9efb04`) — PA-direct 4-gate walk PASS (Gates 1-3 STRONG; Gate 4 deep-dive REQUIRED). Hook gate restoration (Configuration A — `git config core.hooksPath scripts/git-hooks`) closed the anomaly that `.git/hooks/` was empty of non-sample files despite S104 hand-off reporting hooks active.

3. **tableFor deep-dive landed via `scrml-deep-dive` agent in background** (`67fe2b8` in scrml-support) — agent burned ~20min (vs ~6-10h estimate); Write tool denied so deliverable returned as final assistant message; PA wrote 1452L to scrml-support. 12 OQs resolved (3 HIGH / 7 MED-HIGH / 1 MEDIUM / 1 debate-mandatory). OQ-TF-1 synthesis-mode verdict Form A markup-element 53/60 (19-pt margin) RATIFIED per user direction "no debate needed on tablefor. that's a go." in lieu of live debate-curator.

4. **SPEC §41.16 tableFor authorship** (`a834e38`, PA-direct ~1.5h) — 210L mirroring §41.14 + §41.15 structure + 13 `E-TABLEFOR-*` codes in §34 + §53.14.3 row flip + §53.14.5 recognition list extension + SPEC-INDEX +11 Quick Lookup entries.

5. **G1 bug-18 §5 happy-dom env reset** (`5a7441b`, PA-direct ~30min) — closed the pre-existing test-isolation failure that was blocking pre-push. Root cause discovered via `[G1-DIAG]` instrumentation: runtime IIFE effect leak across closures (browser-components.test.js's runtime IIFE writes effects to closure-held DOM refs; effects persist across tests + re-fire when bug-18 §5 sets body.innerHTML; OLD effects find compile-counter-collision selectors + overwrite bug-18's content). Fix: GlobalRegistrator.unregister + register at top of bug-18 §5. **v0.4 follow-up filed: structural cleanup of browser-test effect-leak pattern.**

6. **B1 reactive Boolean attr wiring** (`4956a02`, PA-direct ~1h) — closed §41.14 formFor follow-on (`disabled=!@<cellName>.isValid` was silently dropping). Added `REACTIVE_BOOL_ATTRS = new Set(["disabled", "readonly", "required"])` to emit-html.ts dispatch; runtime `_scrml_effect` toggles attribute presence via setAttribute/removeAttribute. 13 unit tests + emit-form-for.ts comment block updated.

7. **A4 §48.6.4 pinned-fn forward-ref enforcement** (`7910162`, PA-direct ~1h) — closed the §48.6.4 story's semantic-enforcement half. NEW SYM PASS 19 walks every CallExpr in every ExprNode payload; fires `E-STATE-PINNED-FORWARD-REF` when readPos < declSpan.start. **Important distinction vs B4 cell-pinned-forward-ref**: A4 uses `declSpan.start` (not `.end` like B4) because fn semantics admit self-recursion AND fn-decl spans overlap with next statement (ast-builder's `spanOf(startTok, peek())` uses peek's end as anchor). 14 unit tests.

8. **A2 tableFor impl SHIPPED end-to-end** (`1fdeef8`, agent-dispatched ~11-15h walltime in background) — `scrml-dev-pipeline` agent worktree `agent-a5f9cbbc7c37b9e65` with 12 incremental commits → S67 file-delta land into main. 14 files / +3890 / -39 / 84 new tests (68 unit + 16 integration). 3 documented SPEC deviations + 7 v1.next follow-ups. OQ-TF-13 helper extraction DEFERRED. examples/07-admin-dashboard.scrml rewritten to use tableFor (30L→7L for the table block; canonical forfeit-cost evidence CLOSED).

9. **README runtime-benchmark refresh + prose fixes** (`75ae8c5`, PA-direct ~30min, S105 side-quest) — runtime perf table refreshed from `benchmarks/RESULTS.md` re-measurement S103 (2026-05-19) post-Phase-3-Candidate-A; dangling "sixth variant" prose fix at line 121; `<match>` tied back to Tier ladder in "Engines are the centerpiece" prose.

10. **Phase 3.B Q-RT3B-OPEN-1..5 RATIFIED** per user "D1 leans ratified" — B2/B4 unblocked for S106.

## Tests at S105 CLOSE

- **Pre-commit subset** (unit + integration + conformance): **12,998 pass / 92 skip / 1 todo / 0 fail / 675 files / 44,248 expect**
- **Full `bun test compiler/tests/`**: **15,841 pass / 173 skip / 1 todo / 0 fail / 708 files / 46,663 expect**
- Delta vs S104 close (full suite 15,709): **+132 pass / +30 files / +954 expect / 0 fail / 0 regressions**
- New tests by track: 16 pinned-fn-parser + 14 pinned-fn-forward-ref + 13 reactive-bool-attrs + 68 tableFor-unit + 16 tableFor-integration + 3 test-fixups + 1 bug-18-now-passes (was failing) = 131 (matches +132 with the 1 incidental)

## S105 commit ledger

| # | Commit | Repo | What |
|---|---|---|---|
| 1 | `f9efb04` | scrmlTS | chore(s105-open) hand-off rotation + tableFor SCOPING + hook gate restored |
| 2 | `dc3c460` | scrmlTS | feat(s105) §48.6.4 pinned-fn parser-recognition impl (16 tests) |
| 3 | `76f2d22` | scrmlTS | chore(s105-close-MIS-CHECKPOINT) wrap [mid-session misfire; kept as snapshot — superseded by THIS wrap] |
| 4 | `a834e38` | scrmlTS | spec(s105) §41.16 tableFor SPEC + 13 `E-TABLEFOR-*` codes |
| 5 | `5a7441b` | scrmlTS | fix(test) bug-18 §5 happy-dom env reset (G1 close) |
| 6 | `4956a02` | scrmlTS | fix(codegen) reactive Boolean attr wiring (B1 close; 13 tests) |
| 7 | `7910162` | scrmlTS | feat(sym) §48.6.4 pinned-fn forward-ref enforcement (A4 close; 14 tests) |
| 8 | `1fdeef8` | scrmlTS | feat(s105) tableFor impl SHIPPED end-to-end (84 tests; agent-dispatched + file-delta) |
| 9 | `75ae8c5` | scrmlTS | docs(readme) refresh runtime benches + dangling sixth-variant fix + match-tier-ladder context |
| 10 | `<wrap-sha>` | scrmlTS | chore(s105-close-FINAL) wrap — hand-off + master-list + changelog actual close state |
| (mid-session) | `67fe2b8` | scrml-support | docs(deep-dives) tableFor design — L22 family member #4 (1452L) |

Both repos pushed at close.

## L22 family — current state at S105 CLOSE

| Member | Status |
|---|---|
| parseVariant | ✓ shipped S65 (§41.13) |
| formFor | ✓ shipped S102-S103 (§41.14) |
| schemaFor | ✓ shipped S104 (§41.15) |
| serialize | ✗ STASHED S103 — Gate 2 synonym-risk; revival triggers documented |
| **tableFor** | **✓ SHIPPED S105 (THIS SESSION) — §41.16 + impl + stdlib re-export + TableSort + 84 tests + sample + walkthrough + 07-admin-dashboard rewrite** |
| variantNames / reflective | planned (smaller primitive ~4-8h; natural next L22 candidate) |

**Discipline-health datum at S105 close:** 3 debate-05 rejections + 1 STASHED vs **4** advancements — §53.14.4 filter empirically working.

## §48.6.4 pinned fn — current state at S105 CLOSE

**End-to-end shipped this session:**

- **Parser-recognition** (`dc3c460`): AST `isPinned?: boolean` field; 6 form variants supported; 16 unit tests.
- **Semantic enforcement** (`7910162`): NEW SYM PASS 19 + E-STATE-PINNED-FORWARD-REF firing; 14 unit tests.
- Total surface: 30 unit tests; integration with existing B4 cell-pinned + import-pinned diagnostic family.

The §48.6.4 story is **closed for v0.3.x**. Adopters writing `pinned fn name() { ... }` get clean parses + correct opt-out-of-hoisting semantics + forward-ref errors at the call site + diagnostic messages that suggest both fixes (move call after decl OR remove pinned).

## State-as-of-CLOSE

| Item | Status |
|---|---|
| Tests pre-commit subset | 12,998 / 92 / 1 / 0 fail / 675 files |
| Tests full pre-push gate | 15,841 / 173 / 1 / 0 fail / 708 files / 46,663 expect |
| Test delta from S104 | +132 pass / +30 files / 0 fail / 0 regressions |
| Worktree list | main only (agent-a5f9cbbc7c37b9e65 cleaned at this wrap) |
| Origin sync (scrmlTS) | post-wrap push: 0/0 |
| Origin sync (scrml-support) | 0/0 (`67fe2b8` pushed mid-session) |
| Inbox `handOffs/incoming/` | empty (68 in `read/`) |
| Path-discipline hook | active (Configuration A installed S105 OPEN; pre-commit + pre-push source-controlled baseline) |
| Post-commit hook | NOT INSTALLED (not source-controlled; can hand-recreate if desired) |
| Self-host bootstrap | unchanged (S102 broken-import-path persists; gitignored; pre-commit subset doesn't run self-host parity) |
| Maps watermark | `84c736e` (S103) — **33+ commits behind HEAD** including §41.16 + tableFor impl + B1 + A4 + bug-18 fix + README refresh. **S106 session-start MUST refresh BEFORE any dev-agent dispatch.** |
| scrml-support untracked | 5 voice articles + tools/ (S99 carry; not load-bearing) |

## Carry-forwards for S106 (mid-tier still partially open)

User direction at S105 mid-session ("pa and i can start tighting the mid-way stuff") + the mid-tier list I surfaced — most actionable items closed THIS session (A4 §48.6.4, B1 formFor disabled, G1 bug-18). Remaining:

### Substantive (mid-tier surface)

| Track | Item | Cost |
|---|---|---|
| formFor v1.next | B2 per-type renderer registry `data.registerRenderer` (OQ-FF-1 v1.next carry) | ~3-5h |
| formFor v1.next | B3 `@label("...")` type-field annotation (OQ-FF-7 v1.next carry) | ~3-5h |
| formFor v1.next | B4 auto-recurse into nested struct fields (OQ-FF-11 v1.next carry) | ~5-8h |
| formFor follow-on | B5 L2 label-store consultation IN expander | ~3-5h |
| PGO Phase 3 followup | C1 `hasEqualityExpr` flag (Option-2 sibling pattern) | ~1-2h |
| PGO Phase 3 followup | C2 Markup/for-stmt double-walk fold in `detectRuntimeChunks` | ~2-3h |
| Phase 3 detector ext | C3 `in` / `.includes()` / deep-path-key (broader predicate shapes) | ~3-5h each |
| Pre-existing detector bug | C4 equality runtime-chunk detector inline-stub cleanup | ~2-3h |
| Runtime-perf Phase 3.B | D2 B2 same-keys-in-same-order fast-path (PA-direct; OQs ratified S105) | ~2-3h |
| Runtime-perf Phase 3.B | D3 B4 count-derived dep precision (agent-dispatched; OQs ratified S105) | ~3-5h |
| Native parser | M2 expression parser (~2-4 sessions per DD §D7; M1.2 in flight) | ~2-4 sessions |
| Self-host bootstrap | broken-import-path investigation (S102 carry; ongoing) | ~2-4h |

### tableFor v1.next follow-ups (7 newly-surfaced from A2 impl)

| # | Item | Cost |
|---|---|---|
| 1 | OQ-TF-13 `validateTypeArgument` shared helper extraction (refactor formFor + schemaFor + tableFor + parseVariant callers) | ~1-2h |
| 2 | §41.16.7 sort-state cell as explicit state-decl (currently inline writes) | small |
| 3 | §41.16.8 `E-TABLEFOR-SELECTABLE-CELL-WRONG-TYPE` strict-mode fire-site (currently deferred to downstream type-checker) | small |
| 4 | OQ-TF-7 positional/computed `<column>` slots (for non-struct columns like Delete buttons) | medium |
| 5 | §17.4a for/else codegen (pre-existing gap; affects all `<empty>` slot text emission) | medium |
| 6 | `date`/`timestamp` BUILTIN_TYPE entries (affects formFor + schemaFor + tableFor all three) | small |
| 7 | Inline event handler shape with non-`event` arrow param (rewriter wraps `(evt) =>` as `function(event)` and leaves inner `evt` references stale) | small |

### v1.0+ follow-up filed at G1

- Structural cleanup of browser-test effect-leak pattern. Options: (a) afterEach happy-dom re-register per browser-test file, (b) refactor browser-test helpers to not retain effect refs via closure, (c) standardize on GlobalRegistrator reset as sibling-test convention.

### Light (cleanup)

- **Maps incremental refresh (S106 session-start REQUIRED)** — 33+ commits behind watermark including §41.16 + tableFor impl + B1 + A4 + bug-18 fix
- OQ-TF-11 sub-debate (if user contests MEDIUM verdict on row binding `:let` vs implicit `@row`)
- Puppeteer dep cleanup (Q-PW-PORT-OPEN-1 ratified DEFER)
- LEGACY `_scrml_subscribers` retirement (v0.4+; Q-RT3-SR-OPEN-3 ratified DEFER post-impl)
- 4 NEW stale-header non-compliance items from S104 (pgo × 3 + formFor-scoping)

### Marketing-shaped (per pa.md Rule 1 — DEFER unless raised)

- formFor + schemaFor + tableFor combined sample app + scrml.dev refresh + README compile-gate block
- L22 family 4-of-6-shipped narrative + tableFor admin-UI-lift adoption pitch
- v0.3.3 announcement / v0.4 announce content (note: pkg.json currently at 0.3.0; new tag would bump per S94 versioning rule)

## Things S106 PA must NOT screw up

In addition to S96-S104 carry-forwards:

- **Maps refresh BEFORE any dev-agent dispatch.** 33+ commits behind watermark including tableFor impl + §41.16 + B1 + A4 surfaces. PA should invoke project-mapper incremental at session-start.
- **No new design-axiom ratifications surfaced this session** — the synthesis-mode-debate variant of S103 surface-form-DEBATED rule (introduced S105 via tableFor OQ-TF-1) IS a methodology refinement worth tracking but not yet a durable PA-memory rule. If it surfaces again on a future surface-form OQ, formalize.
- **Phase 3.B B2/B4 unblocked but not yet started** — B2 ~2-3h PA-direct; B4 ~3-5h agent-dispatched. OQs ratified S105. Per the Q-RT3B-OPEN-2 verdict.
- **tableFor 3 SPEC deviations are documented in `1fdeef8` commit message + `docs/changes/tableFor-impl/PROGRESS.md`** — sort-state cell synth implicit (functionally equivalent); SELECTABLE-CELL-WRONG-TYPE fire-site deferred (works via downstream type-check); `<empty>` slot codegen depends on pre-existing §17.4a for/else gap. None are blockers for adopter use.
- **§48.6.4 story IS closed; A4 follow-on is none.** Don't queue more pinned-fn work unless adopter friction surfaces.

## Session-start checklist for S106 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL (Pillar 5b applies)
3. Read `compiler/SPEC-INDEX.md` IN FULL — §41.16 tableFor SPEC + 13 `E-TABLEFOR-*` rows + §53.14.3 row flip + §53.14.5 list extension landed S105
4. Read `master-list.md` §0 LIVE DASHBOARD IN FULL — **note S105 CLOSE addendum at top + §0.1 L22 row flip for tableFor (SHIPPED)**
5. Read this `hand-off.md` (S105 CLOSE) — will be rotated to `handOffs/hand-off-108.md` at S106 open
6. Read last ~10 contentful user-voice entries — no new entries this session
7. Sync hygiene: `git fetch origin && git rev-list --left-right --count origin/main...HEAD` should be 0/0
8. Inbox check — `handOffs/incoming/*.md` empty
9. Verify worktrees: `git worktree list` shows main only
10. Verify hook gate: `git config --get core.hooksPath` should be `scripts/git-hooks` (Configuration A installed S105 OPEN)
11. Self-host bootstrap state check — `ls -la compiler/dist/self-host/`; partial-broken state persists from S102; decide whether to investigate OR delete to skip cleanly
12. **Maps currency check + REFRESH** — `head -3 .claude/maps/primary.map.md` will show `84c736e` watermark; HEAD is now `<wrap-sha>` (33+ commits ahead including major tableFor surface). **REFRESH BEFORE any scrml-source-shape dispatch.**
13. **Surface remaining mid-tier list** to user; ask which item to start with. Most actionable items closed S105 (A4, B1, G1); remaining are formFor v1.next + PGO Phase 3 followups + Phase 3.B B2/B4 + native parser M2 + 7 tableFor v1.next follow-ups + self-host investigation.
14. Report: caught up + next priority

## Tags

#session-105 #CLOSE #tableFor-SHIPPED-end-to-end #L22-family-4-of-6 #§48.6.4-closed-end-to-end #B1-reactive-bool-attr #G1-bug-18-isolation-closed #README-runtime-benches-refresh #Form-A-markup-element-ratified #synthesis-mode-debate-precedent #hook-gate-config-A #worktree-cleaned #pre-commit-12998 #full-suite-15841 #+132-from-S104 #multi-track-close
