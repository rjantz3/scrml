# scrmlTS — Session 106 (OPEN)

**Date:** 2026-05-19
**Previous:** `handOffs/hand-off-108.md` (S105 CLOSE — rotated at S106 open)
**Machine:** single-machine (per S100 directive)
**HEAD at S106 OPEN:** `d8427f2` (chore S105-close-FINAL wrap)
**Origin sync at OPEN:** scrmlTS 0/0; scrml-support 0/0 (untracked voice articles + tools/ — user's territory)

---

## Session-open status (caught up)

S105 CLOSE state read end-to-end. Multi-track close confirmed: tableFor L22 #4 SHIPPED end-to-end (SPEC §41.16 + impl + 84 tests + 1452L deep-dive); §48.6.4 pinned-fn closed end-to-end (parser-recognition + semantic enforcement, 30 tests); §41.14 formFor follow-on closed (B1 reactive Boolean attr wiring); G1 bug-18 isolation closed; README runtime benchmarks refresh. **+132 pass / +30 files / +954 expect / 0 fail / 0 regressions** vs S104.

L22 family roster: parseVariant ✓ S65 · formFor ✓ S102-S103 · schemaFor ✓ S104 · serialize ✗ STASHED S103 · **tableFor ✓ S105** · variantNames / reflective planned.

Tests pre-commit subset 12,998 / 92 / 1 / 0 fail / 675 files. Full pre-push 15,841 / 173 / 1 / 0 fail / 708 files / 46,663 expect.

---

## S106 OPEN anomalies surfaced to user

### A1 — Hook gate effectively MISSING (same anomaly as S105 OPEN, may not have persisted)

`git config --get core.hooksPath` returns `/home/bryan/scrmlMaster/scrmlTS/.git/hooks` (absolute path); `.git/hooks/` contains ONLY `.sample` files (no real `pre-commit` / `pre-push`); `scripts/git-hooks/pre-commit` + `pre-push` exist (source-controlled baseline intact). Net: commit gate is NOT firing — `git commit` will not run the test suite.

S105 OPEN fix (`git config core.hooksPath scripts/git-hooks`, configuration A per pa.md S88) was apparently NOT persisted, or was re-overwritten between S105 close (~earlier today) and S106 open. The S105 CLOSE hand-off explicitly reported "active (Configuration A installed S105 OPEN)" — that's now incorrect.

**Pending user disposition:** restore configuration A (`git config core.hooksPath scripts/git-hooks`)? Same fix S105 OPEN used.

### A2 — Maps watermark 34 commits behind HEAD

`primary.map.md` watermark `84c736e` (S103 2026-05-18). HEAD `d8427f2`. `git log 84c736e..HEAD --oneline | wc -l` = 34 commits. Includes major surface: §41.16 tableFor SPEC + 13 `E-TABLEFOR-*` codes + tableFor impl (14 files / +3890 LOC) + B1 reactive Boolean attr wiring (emit-html.ts dispatch) + A4 §48.6.4 SYM PASS 19 + bug-18 fix + REACTIVE_BOOL_ATTRS export.

**REQUIRED before any dev-agent / scrml-writer / pipeline dispatch this session.** Per pa.md S82 maps-discipline protocol.

---

## Mid-tier carry-forward inventory (from S105 CLOSE)

Surfaced to user at session-start. User to direct next priority.

### Substantive

| Track | Item | Cost |
|---|---|---|
| formFor v1.next | B2 per-type renderer registry `data.registerRenderer` (OQ-FF-1 v1.next carry) | ~3-5h |
| formFor v1.next | B3 `@label("...")` type-field annotation (OQ-FF-7 v1.next carry) | ~3-5h |
| formFor v1.next | B4 auto-recurse into nested struct fields (OQ-FF-11 v1.next carry) | ~5-8h |
| formFor follow-on | B5 L2 label-store consultation IN expander | ~3-5h |
| PGO Phase 3 followup | C1 `hasEqualityExpr` flag (Option-2 sibling pattern) | ~1-2h |
| PGO Phase 3 followup | C2 Markup/for-stmt double-walk fold in `detectRuntimeChunks` | ~2-3h |
| Phase 3 detector ext | C3 `in` / `.includes()` / deep-path-key | ~3-5h each |
| Pre-existing detector bug | C4 equality runtime-chunk detector inline-stub cleanup | ~2-3h |
| Runtime-perf Phase 3.B | D2 B2 same-keys-in-same-order fast-path (PA-direct; OQs ratified S105) | ~2-3h |
| Runtime-perf Phase 3.B | D3 B4 count-derived dep precision (agent-dispatched; OQs ratified S105) | ~3-5h |
| Native parser | M2 expression parser (~2-4 sessions per DD §D7; M1.2 in flight) | ~2-4 sessions |
| Self-host bootstrap | broken-import-path investigation (S102 carry; ongoing) | ~2-4h |

### tableFor v1.next follow-ups (7 newly-surfaced S105 from A2 impl)

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

Structural cleanup of browser-test effect-leak pattern. Options: (a) afterEach happy-dom re-register per browser-test file, (b) refactor browser-test helpers to not retain effect refs via closure, (c) standardize on GlobalRegistrator reset as sibling-test convention.

### Light (cleanup)

- **Maps incremental refresh (S106 session-start REQUIRED — see A2 above)**
- OQ-TF-11 sub-debate (if user contests MEDIUM verdict on row binding `:let` vs implicit `@row`)
- Puppeteer dep cleanup (Q-PW-PORT-OPEN-1 ratified DEFER)
- LEGACY `_scrml_subscribers` retirement (v0.4+; Q-RT3-SR-OPEN-3 ratified DEFER post-impl)
- 4 NEW stale-header non-compliance items from S104 (pgo × 3 + formFor-scoping)

### Marketing-shaped (per pa.md Rule 1 — DEFER unless raised)

- formFor + schemaFor + tableFor combined sample app + scrml.dev refresh + README compile-gate block
- L22 family 4-of-6-shipped narrative + tableFor admin-UI-lift adoption pitch
- v0.3.3 announcement / v0.4 announce content (pkg.json currently 0.3.0; new tag would bump per S94 versioning rule)

---

## Tags

#session-106 #OPEN #hook-gate-anomaly-recurrence #maps-34-behind #mid-tier-carry-forward #L22-4-of-6
