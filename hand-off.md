# scrmlTS — Session 105 (OPEN)

**Date:** 2026-05-19
**Previous:** `handOffs/hand-off-107.md` (S104 CLOSE — rotated this session-open)
**Machine:** single-machine (per S100 directive)
**HEAD at S105 OPEN:** `07b1b22` (S104 wrap commit — hand-off + master-list + changelog)
**Origin sync at OPEN:** scrmlTS 0/0; scrml-support 0/0 (5 untracked files surfaced; carry-forward — see §"Anomalies surfaced at session-open" below)

---

## Session-start checklist (status)

| # | Item | Status |
|---|---|---|
| 1 | Read `pa.md` → `../scrml-support/pa-scrmlTS.md` IN FULL | ✅ done |
| 2 | Read `docs/PA-SCRML-PRIMER.md` IN FULL | ✅ done (899 lines) |
| 3 | Read `compiler/SPEC-INDEX.md` IN FULL | ✅ done (348 lines) |
| 4 | Read `master-list.md` §0 LIVE DASHBOARD IN FULL | ✅ done (lines 1–373 surveyed; §0 dashboard + L22 + open Qs + A7 deferral status all loaded) |
| 5 | Read `hand-off.md` (rotated this open to `handOffs/hand-off-107.md`) | ✅ done |
| 6 | Read last ~10 contentful user-voice entries | ✅ done (S98/S99/S100/S102/S103 + sentinel of S95/S96 + S94) |
| 7 | Sync hygiene fetch+ahead/behind | ✅ scrmlTS 0/0; scrml-support 0/0 (5 untracked predate this session — see anomalies) |
| 8 | Inbox check `handOffs/incoming/*.md` | ✅ empty (68 in `read/`) |
| 9 | Worktree state `git worktree list` | ✅ main only |
| 10 | Path-discipline hook + pre-push hook installed | ✅ **RESOLVED S105 OPEN** — configuration A installed (`git config core.hooksPath scripts/git-hooks`); pre-commit + pre-push active. No post-commit (informational; was machine-local-only on the prior setup). |
| 11 | Self-host bootstrap dist state | 🟡 partial-broken state persists from S102 (gitignored; tab.js + bs.js + others at May 11 11:20; expression-parser.js + tokenizer.js at Apr 19 16:14) |
| 12 | Maps currency check + REFRESH | ⏸️ deferred to user disposition — watermark `84c736e` is 26 commits behind HEAD `07b1b22` |
| 13 | Report caught-up + next priority | ⏳ this hand-off + chat reply |

---

## Anomalies surfaced at session-open

### A1 — Commit gate hook RESOLVED at S105 OPEN (configuration A installed)

**Initial state at session-open:** `core.hooksPath` was set to `/home/bryan/scrmlMaster/scrmlTS/.git/hooks` (absolute path; clone default). That dir contained ONLY `.sample` files (13 default Git samples; ZERO active hooks). The S104 hand-off CLOSE table reported "Path-discipline hook: active" and "Pre-push hook: source-controlled + local-rich; clean each push" — that state had NOT propagated to this clone. The previous local-rich setup (with `post-commit` informational re-run) lived on the other machine; only `pre-commit` + `pre-push` are source-controlled.

**Resolution (user direction: configuration A):**

```
git config core.hooksPath scripts/git-hooks
```

Result verified: `core.hooksPath = scripts/git-hooks`; `pre-commit` (794 bytes) + `pre-push` (2674 bytes) both executable + active.

**What runs now on every commit:** `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail` + main-branch informational warning.

**What runs now on every push:** full `bun test compiler/tests/` + TodoMVC gauntlet quick check (`compile + node --check` on emitted JS) + README scrml gate ONLY on `refs/tags/v*` pushes (S101).

**What does NOT run anymore (vs the other machine's prior local-rich setup):** the `post-commit` informational full-suite re-run after compiler changes. That hook was never source-controlled. If desired later, hand-recreate by dropping a `post-commit` file directly into `.git/hooks/` (Git checks BOTH `core.hooksPath` AND `.git/hooks/` for some hook types — actually no, with `core.hooksPath` set Git only checks the configured path; would need to place `post-commit` at `scripts/git-hooks/post-commit` instead, which would also source-control it).

**Operational implication going forward:** commit + push paths are gated again. The pa.md S88 `--no-verify` rule applies — no bypass on commit or push without explicit user authorization.

### A2 — Maps watermark stale (26 commits behind HEAD)

**Watermark in `.claude/maps/primary.map.md`:** commit `84c736e` (2026-05-18T18:37). **HEAD:** `07b1b22`. Delta includes S104's schemaFor surface (`compiler/src/codegen/emit-schema-for.ts` NEW + `compiler/src/type-system.ts` +569L schemaFor section + stdlib reorg). Hand-off S104 CLOSE listed this as item 12 of session-start: "Maps currency check + REFRESH — REFRESH BEFORE any scrml-source-shape dispatch."

**Disposition:** ⏸️ deferred to user. Do NOT auto-refresh on session-open without confirmation. Maps refresh is project-mapper incremental dispatch; non-trivial; may surface non-compliance items needing PA-direct triage.

### A3 — scrml-support untracked files (5 files, S99-batch carry-forward)

Verified via `git -C ../scrml-support status --short`:

```
?? tools/
?? voice/articles/2026-05-09-devto-openers-tier1.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-POST.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-slow-burn.md
?? voice/articles/2026-05-09-devto-reply-modularity.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-slow-burn.md
?? voice/articles/2026-05-09-server-keyword-deprecation.md
```

These predate S105 (dated 2026-05-09; S79-era voice work). Not load-bearing for S105 unless surfaced. Voice-author work is marketing-shaped per Rule 1 — DEFER unless user raises.

### A4 — Self-host bootstrap dist state (S102 carry, unaddressed S103/S104)

`compiler/dist/self-host/` contains 12 .js files. Two mtimes: most files May 11 09:40 OR 11:20 (S78-S79 era); `expression-parser.js` + `tokenizer.js` at Apr 19 16:14 (pre-S58 era). Per S102 carry-forward: PA-run `rebuild-self-host-dist.ts` overwrote May-11 working dist with newly-compiled broken-import-path versions; the broken state is local-only (gitignored). S104 hand-off carry-forward §"State-as-of-CLOSE" line 105: "Self-host bootstrap: unchanged from S103 (partial dist state)." Pre-commit subset skips self-host parity, so this does not gate commits.

**Disposition for S105:** carry-forward; investigation OR `rm -rf compiler/dist/self-host/` to let bootstrap test SKIP cleanly is a candidate, but defer to user direction.

---

## What S104 left for S105 (carry-forward inventory)

### High-priority substantive (compiler / L22)

| Track | Item | Cost |
|---|---|---|
| **L22 family** | **tableFor impl dispatch** OR **variantNames impl dispatch** — each must pass §53.14.4 4-gate walk first | tableFor ~15-25h / variantNames ~4-8h |
| Runtime-perf Phase 3.B | B2 (same-keys fast-path; ~2-3h PA-direct) + B4 (count-derived dep precision; ~3-5h agent dispatch); B3 conditional; B1 deferred. **Pending 5-OQ ratification.** | ~5-8h aggregate (B2+B4) |
| Native parser | M2 expression parser (~2-4 sessions per DD §D7; M1.2 in flight) | ~2-4 sessions |
| Native parser | §48.6.4 `pinned fn` parser-recognition impl (SPEC landed S98) | ~2-4h |
| Self-host bootstrap | Investigate broken-import-path regen state (S102 carry) | ~2-4h |

### Medium (ratified-stragglers — queued behind schemaFor; NOW UNBLOCKED)

| Track | Item | Cost |
|---|---|---|
| formFor follow-on | `disabled=!@cell` reactive-attr wiring fix | ~2-4h |
| formFor v1.next | per-type renderer registry `data.registerRenderer` (OQ-FF-1 verdict) | ~3-5h |
| formFor v1.next | `@label("...")` type-field annotation (OQ-FF-7 verdict) | ~3-5h |
| formFor v1.next | auto-recurse into nested struct fields (OQ-FF-11 verdict) | ~5-8h |
| formFor follow-on | L2 label-store consultation IN expander | ~3-5h |
| PGO Phase 3 followup | `hasEqualityExpr` flag (Option-2 sibling pattern) | ~1-2h |
| PGO Phase 3 followup | Markup/for-stmt double-walk fold in `detectRuntimeChunks` | ~2-3h |
| Phase 3 detector extensions | `in` / `.includes()` / deep-path-key (broader predicate shapes) | ~3-5h each |
| Pre-existing equality runtime-chunk detector bug | Worked around with inline stub at Phase 3 Candidate A landing | ~2-3h |

### Light (cleanup / orthogonal)

- **Maps incremental refresh** (S105 session-start) — 26 commits behind watermark (A2 above)
- 4 NEW stale-header non-compliance items (pgo × 3 + formFor-scoping) — flip-in-place to CLOSED vs deref pending ratification (PA lean: flip-in-place)
- Puppeteer dep cleanup (Q-PW-PORT-OPEN-1 ratified DEFER; ~30min after 1-2 release cycles of clean Playwright runs)
- LEGACY `_scrml_subscribers` retirement (v0.4+ proposal; Q-RT3-SR-OPEN-3 ratified DEFER post-impl)

### Marketing-shaped (per pa.md Rule 1 — DEFER unless raised)

- formFor + schemaFor sample app + scrml.dev refresh + README compile-gate block
- v0.3.3 / v0.4 announce content
- 561× select-row Chrome recovery narrative — LinkedIn / X snippets
- L22 family completion narrative (3 of 6 shipped)

### Out-of-Q queue (kept tracked, not active)

- serialize STASHED — revival triggers in `docs/changes/serialize-scoping/SCOPING.md`
- tableFor + variantNames natural next L22 candidates (gated on 4-gate walk)
- Bug-4 dot-path render-by-tag — user heads-up coding pre-pipeline filter still active

---

## Carry-forwards (across-session standing rules — unchanged from S104)

All S96-S104 durable PA-memory rules + pa.md Rules 1-5 + standing protocols intact. No new rules introduced this session-open.

---

## Tests at S105 OPEN

Not re-run at session-open. **S104 CLOSE baseline (HEAD `8a6cd85` pre-wrap):**
- Pre-commit subset: 12,872 pass / 88 skip / 1 todo / 0 fail / 670 files / 43,337 expect
- Full `bun run test`: 15,709 pass / 169 skip / 0 fail + TodoMVC gauntlet quick check PASS

Session-open does not re-run; first dispatch / commit will reset the gate verification once the hook situation (A1) is resolved.

---

## Open questions to surface immediately to user

1. ~~Hook gate (A1)~~ ✅ RESOLVED — configuration A installed.
2. **Maps refresh (A2)** — refresh now (~5-15min project-mapper incremental) before any dispatch, OR defer to first-dispatch-need?
3. **Self-host dist state (A4)** — investigate the broken-import-path regen (~2-4h) OR `rm -rf compiler/dist/self-host/` to let bootstrap test skip cleanly?
4. **S105 priority direction:**
   - **L22 next member** (tableFor heavier; variantNames smaller) — gated on §53.14.4 4-gate walk
   - **Runtime-perf Phase 3.B** — B2+B4 chip-aways; needs 5-OQ ratification first
   - **Medium-tier stragglers** (formFor follow-ons, PGO Phase 3 followups)
   - **Native parser M2** — expression parser; ~2-4 sessions
   - **Pinned-fn parser-recognition** (§48.6.4; ~2-4h)
   - Or other PA-direct priority the user wants

---

## Tags

#session-105 #OPEN #hook-gate-configA-installed #maps-stale-26-commits #self-host-bootstrap-broken #post-S104-schemaFor-shipped #L22-3-of-6-shipped #single-machine
