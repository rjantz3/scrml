---
title: "v0.3 Wave 3.6 — trucking-dispatch re-migration (post-§38.1 dispensation)"
session: S87/S88-followup
status: DONE
---

# Progress log

Append-only. Timestamped lines: what was done, what's next, blockers.

## 2026-05-12 — dispatch start + bootstrap

- Worktree verified: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4bdea1ed2d7e6a98`. Tree clean.
- Worktree HEAD started at `7a00b1b` (S86 wrap), but brief expects S87 HEAD (`72c6548`). Performed fast-forward merge of `main` into worktree branch (S86 was direct ancestor of main; safe FF). Now at HEAD `72c6548`.
- `bun install` OK (117 packages, 242ms).
- `bun run pretest` OK (12 compilation-test samples compiled clean).
- Required reads consumed: BRIEFING-ANTI-PATTERNS, llm-kickstarter-v1, PA-SCRML-PRIMER §9 (channels), Insight 30, SPEC §38.1 + §34 E-CHANNEL-OUTSIDE-PROGRAM row.
- Maps consulted: primary.map.md (full), structure.map.md.
- Verified Insight 30 walker LANDED on main: `7a77513` (walker pre-check) + `6be98ad` (SPEC §38.1 dispensation prose + walker landing combined).
- Next: pre-flight reconnaissance — `bun scrml migrate --program-shape --dry-run --report examples/23-trucking-dispatch/`.

## 2026-05-12 — pre-flight reconnaissance (dry-run --report)

- Invoked `bun compiler/bin/scrml.js migrate --program-shape --dry-run --report examples/23-trucking-dispatch/`.
- Summary: **36 files scanned · 12 would change · 24 unchanged**.
- Of the 36 files: 20 are `[route]` (under `pages/`), 15 `[module]` (channels/components/models/schema/seeds), 1 `[schema-anchor]` (`app.scrml`).
- Of 20 routes: **12 REWRITE** (file-top `<program>`), 7 NOOP (already `<page>` shape from S87 Phase 1), 1 SKIP (`driver/hos.scrml`, file-top `<engine>` — not a route shape).
- 15 modules ADVISORY (no `<program>` opener — module files; left alone by migrate).
- 1 schema-anchor ADVISORY (`app.scrml` uses `<program db=>` v0.3 workaround per §39.12.0; left alone).

### 12 page files queued for REWRITE
- customer: home, invoices, load-detail, loads, quote (5)
- dispatch: billing, board, load-detail, load-new (4)
- driver: home, load-detail, messages (3)

These exactly match the 12 trucking pages Phase 2 BLOCKED on in S87 due to cross-file channel cascade. Hypothesis: under §38.1 dispensation walker (commit `7a77513`), safety-harness should now accept these. Pre-migration count: **12 file-top `<program>` pages**.

- Stderr from dry-run: one BS-layer "statement boundary not detected" warning in `driver/home.scrml` near offset 18071 — pre-existing artifact, not migration-related (note for later investigation; not a blocker since dry-run still completed).
- Next: run actual `migrate --program-shape` (no dry-run); commit per batch.

## 2026-05-12 — migration executed

- Invoked `bun compiler/bin/scrml.js migrate --program-shape examples/23-trucking-dispatch/`. **All 12 REWRITE files migrated successfully.** Summary line: `36 files scanned · 12 changed · 24 unchanged`. Channel-architecture dispensation walker absorbed the cross-file cascade as Insight 30 predicted.
- Diff shape: each rewrite is the minimal `<program ...>` → `<page ...>` swap (opener + closer), preserving all attributes (db=, auth=, protect=).
- Files migrated (12):
  - pages/customer/{home,invoices,load-detail,loads,quote}.scrml (5)
  - pages/dispatch/{billing,board,load-detail,load-new}.scrml (4)
  - pages/driver/{home,load-detail,messages}.scrml (3)
- Commit `a723477` — pre-commit hook PASSED (10945 pass / 85 skip / 1 todo / 0 fail / 543 files in 24.37s). NO `--no-verify` used.
- Manual fixes required: ZERO. Acceptance criterion 2 satisfied vacuously — no remaining safety-harness failures after migration.
- Next: per-page compile-clean validation.

## 2026-05-12 — compile-clean validation

- Compiled each of the 20 trucking page files individually via `bun compiler/bin/scrml.js compile <file>`:
  - pages/auth/{login, register} — PASS (0 errors)
  - pages/customer/{home, invoices, load-detail, loads, profile, quote} — PASS (0 errors)
  - pages/dispatch/{billing, board, customers, drivers, load-detail, load-new} — PASS (0 errors)
  - pages/driver/{home, hos, load-detail, load-log, messages, profile} — PASS (0 errors)
- **All 20 page files compile error-free.** (Warnings present — W-PROGRAM-001 multiple-fire from cross-file imports + W-AUTH-001 + 1 W-ATTR-001 + 1 W-PROGRAM-REDUNDANT-LOGIC; all informational.)
- Whole-corpus compile `bun compiler/bin/scrml.js compile examples/23-trucking-dispatch/` → 36 files / 0 errors / 102 warnings in 1.5-1.9s.
- **Surfaced quirk (NOT a blocker):** stand-alone compile of `examples/23-trucking-dispatch/app.scrml` (the entry file with `<schema>`) emits E-CG-006 due to single-file scoping that loses cross-file context for `_scrml_sql` references. Whole-directory compile resolves this. Reproduces on baseline `72c6548` BEFORE my changes — pre-existing, NOT introduced by Wave 3.6.

## 2026-05-12 — full test suite + regression check

- Ran `bun test` from worktree root (3 runs total).
- Result: **11,685–11,686 pass / 114 skip / 1 todo / 1 fail / 572 files** (~25s per run).
- The 1 failing test: `Bug 3a §1 — basic <db src=> server-fn round-trip with real SQLite > compiled server.js declares _scrml_sql and a server-fn returns SQL data`.
- Investigation: when run in isolation (`bun test compiler/tests/integration/sql-server-fn-runtime.test.js`) the file passes 5/5 consistently. The failure only appears under full-suite parallel execution. Cross-checked against baseline `72c6548` (pre-Wave-3.6 HEAD): SAME 1 failure on the SAME test under full-suite execution.
- Conclusion: **pre-existing test flake, NOT introduced by Wave 3.6.** Test suite delta = 0. Surface for separate investigation (likely temp-dir contention or parallel-worker race in Bug 3a's runtime SQLite scaffolding).

## 2026-05-12 — bookkeeping + close

- `master-list.md` Wave 3 status updated: PARTIAL → COMPLETE (addendum at file top per pa.md S86 convention).
- Idiomatic-examples styling rule per S86 ratification (no file-top `#{}` in canonical examples) — N/A for this dispatch (only `<program>`/`</program>` openers/closers were rewritten by the migrate tool; no CSS or styling additions made).
- DISPATCH OUTCOME: **DONE.**

### Files-touched summary

- 12 fixture migrations: `examples/23-trucking-dispatch/pages/**/*.scrml` (the 12 listed above).
- 1 progress log: `docs/changes/v0.3-wave-3.6-trucking-remigration/progress.md` (this file).
- 1 master-list addendum at top: `master-list.md`.

### Commits landed

1. `60ffe02` — WIP(wave-3.6): bootstrap progress log + worktree FF to S87 HEAD
2. `a723477` — feat(wave-3.6): migrate 12 trucking pages — `<program>` → `<page>` (v0.3 SPEC §40.8)
3. (pending) — closing commit: master-list addendum + final progress log entries

### Acceptance criteria audit

| # | Criterion | Status |
|---|---|---|
| 1 | Migrate corpus-wide on trucking | DONE (12 files migrated, 0 manual) |
| 2 | Manual fixes for remaining safety-harness failures | N/A (zero remaining post-migration) |
| 3 | Compile-clean validation on `pages/**/*.scrml` | DONE (20/20 PASS) |
| 4 | Update master-list Wave 3 phase tracker → COMPLETE | DONE |
| 5 | Update progress.md with pre-recon counts / post-migration counts / manual-fix list / spot-check results | DONE |
| 6 | Idiomatic-examples styling rule applied to touched fixtures | N/A (no styling-eligible edits made) |

### Surfaced findings (for PA triage)

1. **Pre-existing test flake:** `Bug 3a §1` `sql-server-fn-runtime.test.js` fails under full-suite parallel execution but passes in isolation. Reproduces on baseline `72c6548` — predates Wave 3.6. Likely temp-dir contention in Bug 3a's SQLite runtime scaffolding.
2. **`<page db=>` emits W-ATTR-001:** the migrate tool preserved the `db=` attribute on the rewrite from `<program db=>` → `<page db=>`, but the runtime attribute-allowlist for `<page>` does not currently recognize `db=`. S85 master-list lists the page-helper attribute set as `{db, auth, csrf, ratelimit}` so this is likely an attribute-registry stale-list bug rather than a spec change. Surface for follow-up: either (a) extend `<page>` attribute-registry recognition for `db=`, or (b) adjust migrate tool to elide `db=` from `<page>` rewrites since it's redundant when entry's `<program db=>` covers it. Compile-clean is unaffected — this is a warning, not an error.
3. **app.scrml stand-alone E-CG-006:** single-file compile of the entry hits E-CG-006 on `_scrml_sql` reference; whole-dir compile resolves it. Pre-existing scoping limitation. NOT a Wave 3.6 issue.
4. **BS-layer "statement boundary not detected" warning at `driver/home.scrml` offset 18071:** pre-existing parser artifact; surfaces in dry-run + actual migrate stderr. Unrelated to Wave 3.6 migration logic.

### Open questions for PA

- **Unresolved S87 stash:** `git stash list` shows `stash@{0}: WIP on changes/p2-wrapper: ed629f7 WIP(p2-wrapper): ast-builder desugaring — body-root absorbs outer attrs`. Pre-existing, not mine; touched it briefly when investigating E-CG-006 (accidentally tried to pop while diagnosing — recovered cleanly via `git checkout HEAD -- compiler/src/ast-builder.js`). Stash preserved untouched. Surface for PA awareness — left for the original branch owner to decide disposition.
- Whether the `<page db=>` W-ATTR-001 should be addressed as part of Wave 3.6 close-out or queued separately (ratified attribute set has `db=` per S85 but registry/walker may not yet know).


