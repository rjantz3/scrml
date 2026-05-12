---
title: "v0.3 Wave 3 — fixture migration sweep (program-shape corpus-wide)"
date: 2026-05-12
session: S86
status: DRAFT — awaits #13 safety-harness fix landing + user authorization
scope-authority:
  - scrml-support/docs/deep-dives/program-as-container-implementation-plan-2026-05-12.md Phase 2 Wave 3
  - scrml-support/docs/deep-dives/page-helper-element-design-2026-05-12.md Phase 2.2
  - compiler/SPEC.md §40.8 / §40.8.1 / §4.15 / §38.1 (v0.3 normative spec)
predecessors:
  - Wave 1 LANDED `2b7c4df` (S85) — SPEC anchor + walker inversion
  - Wave 2 (a) LANDED `885eaa9` (S86) — `bun scrml migrate --program-shape` extension
  - Wave 2 (b) LANDED `41a4706` (S86) — TAB extension
  - BS-layer extension LANDED `2314c8c` (S86) — bare `<x>=0` auto-lift
  - §40.8.1 OQ CLOSED `3f2504e` (S86) — Option C filesystem inference + W-PROGRAM-SPA-INFERRED
  - Approach A spec anchor LANDED `d3deed2` (S86)
  - Migrate safety-harness cross-file-import fix — IN FLIGHT (Task #13)
walltime-band: 15-25h walltime (one comprehensive sweep) OR 6-12h × 3 sub-dispatches in parallel
fires-as: ONE dispatch via general-purpose, opus, worktree-isolated — OR split per §3 decomposition
tags: [v0.3, wave-3, fixture-sweep, program-shape, migrate-tool-driven, s86]
---

# v0.3 Wave 3 — fixture migration sweep

The canonical sweep using `bun scrml migrate --program-shape` (built in Wave 2 item (a)) to bring the in-tree corpus into v0.3 program-shape. Runs after the safety-harness cross-file-import fix lands (Task #13). The migrate tool does the mechanical work; the dispatch verifies + re-classifies intentionally-failing fixtures + spot-checks each migrated example still compiles + runs.

---

## 0. Why now

- v0.3 Wave 1 walker is LIVE: `walkChannelPlacement` fires `E-CHANNEL-OUTSIDE-PROGRAM` on any file-top `<channel>`. Pre-v0.3 fixtures with file-top channels (15-channel-chat, 08-chat, trucking-dispatch/channels/*) fail at SYM under current compiler.
- v0.3 Wave 2 migrate tool is LIVE: 5-bucket classification + per-bucket rewrite + `--dry-run --report` mode.
- Wave 2 item (a) surfaced a safety-harness limitation: 20/36 trucking files fail the cross-file-import safety gate even when the rewrite is semantically correct. **Task #13 in flight fixes this — Wave 3 sweep dispatches AFTER #13 lands.**
- Trucking-dispatch reconnaissance at S86 (`--dry-run --report`):  36 files scanned; 4 would change auto-clean; 12 unchanged; 20 fail safety-harness (will pass once #13 lands).
- Wave 3 unblocks v0.3.0 cut (along with Wave 4 adopter content). v0.3.0 tag waits for fixture corpus + adopter content to be v0.3-shape clean.

---

## 1. Corpus inventory (ground-truth count at S86)

| Locus | .scrml files | Disposition |
|---|---|---|
| `examples/*.scrml` (top-level 01-21, etc.) | 22 | **IN SCOPE** — user-facing canonical examples. Per page-helper Phase 0.5: single-page apps keep `<program>` only (no `<page>` needed). |
| `examples/22-multifile/` | 3 | **IN SCOPE** — entry + 2 modules. Already mostly v0.3-shape per Reading R1. |
| `examples/23-trucking-dispatch/` | 36 | **IN SCOPE** — multi-page app; 20 pages need `<program>` → `<page>` rewrite; modules already bare; `schema.scrml` + `seeds.scrml` keep `<program db=>` per §39.12.0 workaround. |
| `examples/` other | ~0 | (count: 60 total examples — 22 top-level + 3 multifile + 36 trucking = 61; check residue) |
| `benchmarks/todomvc/` | 2 | **IN SCOPE** — TodoMVC source + benchmark; spot-check shape. |
| `benchmarks/todomvc-react/`, `-svelte/`, `-vue/` | 0 | (comparator apps; not scrml) |
| `samples/*.scrml` (top-level) | 30 | **IN SCOPE (selective)** — mixed; most are narrow-focus snippets; many won't need rewrite. |
| `samples/compilation-tests/**` | 795 | **MOSTLY OUT OF SCOPE** — intentional-fail fixtures; default-excluded by migrate CLI. **Selective inclusion** only for cases where v0.3 walker behavior has shifted (e.g., gauntlet-s20-channels which used to exercise E-CHANNEL-INSIDE-PROGRAM; that code retired). |
| `samples/gauntlet-*/` | ~42 | **MOSTLY OUT OF SCOPE** — same as compilation-tests. |
| `compiler/self-host/*.scrml` | 11 | **OUT OF SCOPE** — defer per pa.md S81 (self-host is orthogonal to v0.2.0 / v0.3.0; post-v1.0.0 work). |
| `compiler/tests/**/*.scrml` | 17 | **IN SCOPE (selective)** — includes the 5 migrate-program-shape-fixtures from Wave 2 item (a); spot-check shape consistency. |
| `stdlib/**/*.scrml` | 44 | **IN SCOPE (light)** — stdlib modules are import-only; should classify as `module` bucket and need ZERO rewrites. Verify. |
| **TOTAL .scrml in repo** | **1031** | (Per S86 ground-truth find) |

**Realistic edit count** (post-#13 safety-harness fix):
- ~22 examples top-level — UNWRAP `${...}` inside `<program>` if any (most already clean)
- ~3 multifile — entry file rewrite if needed
- ~20 trucking pages — `<program>` → `<page>` rewrite
- ~0-50 samples/* — selective
- ~5-10 gauntlet-s20-channels re-classification (delete / invert / archive)
- ~0 self-host (deferred)
- ~0-5 compiler/tests/ selective
- ~0 stdlib (verify; expect 0 changes)

**Total realistic edits:** ~50-120 files actually changing (much less than the implementation-plan dive's 933 estimate which counted all scanned files, not files-that-change).

---

## 2. Scope — what this dispatch does

### 2.1 Run migrate tool corpus-wide

```bash
# Step 1 — reconnaissance pass (no changes; produces structured report)
bun scrml migrate --program-shape --dry-run --report \
  examples/ benchmarks/todomvc/ stdlib/ compiler/tests/ samples/

# Step 2 — selective rewrite pass (after reviewing the report)
bun scrml migrate --program-shape \
  examples/ benchmarks/todomvc/

# Step 3 — handle compiler/tests/ + samples/ selectively (per report findings)
# bun scrml migrate --program-shape compiler/tests/<specific-subset>/
# bun scrml migrate --program-shape samples/<specific-subset>/
```

Use the existing CLI flags; do not modify the migrate tool itself (Wave 2 item (a) is the canonical implementation).

### 2.2 Re-classify intentionally-failing fixtures

`samples/compilation-tests/gauntlet-s20-channels/` (and similar) had fixtures that intentionally fired `E-CHANNEL-INSIDE-PROGRAM`. That code is RETIRED in v0.3 (replaced by `E-CHANNEL-OUTSIDE-PROGRAM` with reversed direction). Three dispositions per fixture:

| Action | When |
|---|---|
| **Invert** | Fixture still exercises a channel-placement error, but the direction reversed. Update fixture + expected error. |
| **Delete** | Fixture only exercised the retired code; no v0.3 equivalent. |
| **Archive** | Fixture has historical value; move to `samples/archive/` (or scrml-support archive). |

Brief assumes ≤15 such fixtures; surface count + per-fixture disposition in final report.

### 2.3 Verify migrated corpus compiles + runs

For each migrated EXAMPLE (the user-facing 22 + multifile + trucking):

1. Run `bun scrml compile <example>` — must produce 0 errors / warnings ≤ tolerated set (W-PROGRAM-SPA-INFERRED is OK on single-page; W-PROGRAM-REDUNDANT-LOGIC ≤ 0 expected after migration).
2. For trucking-dispatch specifically: compile the whole tree; trucking should compile error-free.
3. Spot-check rendered output for select examples (02-counter, 14-mario, 15-channel-chat post-migration, trucking-dispatch dispatch/board).

### 2.4 Verify `bun run test` stays green

Migration touches fixture content but compiler source is unchanged. Test count delta should reflect:
- Re-classified gauntlet-s20-channels fixtures (+/- tests as fixtures invert/delete)
- 18 self-host parity tests STILL `.skip`'d (defer; not part of this dispatch)
- 5 deferred A8-wave .skips STILL `.skip`'d (defer; A8 codegen is separate wave)

Expected test count delta: ±10. Zero net regressions.

### 2.5 Update master-list §0 phase tracker

Mark Wave 3 (fixture sweep) ✅ in the v0.3 phase tracker. Update §0.6 (Surfaced divergences) with any items surfaced during the sweep.

---

## 3. Decomposition options

### Option A — Single comprehensive dispatch (recommended)

ONE dispatch via `general-purpose` (opus, worktree). 15-25h walltime. Agent runs the reconnaissance pass, then makes per-corpus disposition decisions per §2, then executes. Single PA landing commit.

Pros: cohesive view of corpus state; agent can spot cross-corpus patterns; single landing simplifies forensics.

Cons: long-running dispatch; if agent hits a roadblock mid-corpus, partial-landing-state risk.

### Option B — 3 sub-dispatches in parallel (fallback)

- D3.A — examples + benchmarks (~6-10h)
- D3.B — gauntlet-s20-channels re-classification + samples selective (~4-8h)
- D3.C — compiler/tests + stdlib audit (~2-4h)

File-disjoint (different corpus dirs). Can fire in parallel. Three landing commits.

Pros: each sub-dispatch is bounded; parallel walltime.

Cons: PA orchestration cost; intermediate states; 3 worktree allocations.

**PA-lean: Option A.** Single dispatch's coherence outweighs the parallelism gain — the corpus naturally has cross-corpus patterns (e.g., gauntlet-s20-channels treatment may inform samples/* treatment; trucking-dispatch migration informs multi-file edge cases for compiler/tests/).

---

## 4. Pre-flight checklist (Task #13 dependency)

This dispatch fires AFTER Task #13 lands. Pre-flight:

1. **Verify #13 landed** — check `git log --oneline | grep "safety-harness\|sanityCheckParse"`.
2. **Verify trucking reconnaissance passes post-#13** — `bun scrml migrate --program-shape --dry-run --report examples/23-trucking-dispatch/` should show ≤ 2 files failing (down from 20). If still failing > 5: #13 didn't fully close; halt + re-dispatch #13 with sharper scope.
3. **Verify Wave 2 still green** — `bun run test` baseline at HEAD (post-#13).
4. **Verify pre-commit hook installed** in worktree (per-machine setup; brief addendum).

---

## 5. Risk surface

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| #13 fix is incomplete; trucking still fails > 5 files | LOW | dispatch can't proceed | Pre-flight check + halt-and-redispatch |
| gauntlet-s20-channels has > 15 fixtures needing per-file disposition | LOW | walltime slips +2-4h | bounded by ~42 gauntlet fixtures total; even worst-case is manageable |
| samples/* unexpected migration breakage | MEDIUM | partial-landing state risk | dispatch uses `--dry-run --report` first; surface report to PA before executing rewrites |
| Trucking-dispatch post-migration still fires errors | LOW | dispatch surfaces real bugs | the load-detail.client.js:285 lift-`<li>` codegen bug is KNOWN (S86 scrml-dev fix surfaced); separate fix; document as deferred-item |
| `<page>` placement walker fires unexpected errors on migrated route files | MEDIUM | rework needed | Wave 2 item (b) tested this; should be solid |
| Stdlib accidentally classified as `route` or `entry` | LOW | wrong rewrite shape | classifyFile's heuristics should route stdlib to `module` bucket; verify in reconnaissance pass |
| Self-host accidentally migrated | MEDIUM | violates pa.md S81 | dispatch brief explicitly excludes `compiler/self-host/`; CLI exclusion via `--exclude=compiler/self-host` |

---

## 6. Out of scope

- Compiler source changes (`compiler/src/**`). Migrate tool from Wave 2 (a) does the work; no compiler modifications.
- Self-host migration (`compiler/self-host/*.scrml`). Per pa.md S81 — deferred to post-v1.0.0.
- Wave 4 adopter content (articles / tutorials / kickstarter rewrites).
- A8 codegen implementation (separate wave; 5 .skip'd tests stay skipped).
- W-PROGRAM-REDUNDANT-LOGIC escalation to E-* (v0.4 work).
- New SPEC.md edits (spec is fixed at HEAD; sweep is impl-side).
- Test authoring beyond what's needed for re-classified gauntlet fixtures.
- Adopter migration tooling beyond the existing `bun scrml migrate --program-shape` (already shipped).
- `load-detail.client.js:285` lift-`<li>` codegen bug (separate small dispatch).
- Trucking-dispatch reference app NEW features.

---

## 7. PA action requested (BEFORE firing)

- **AUTHORIZE the dispatch** after Task #13 lands + pre-flight checks pass.
- **Approve Option A** (single comprehensive dispatch) OR specify Option B (3 sub-dispatches).
- **Confirm exclusion list:** `compiler/self-host/` (deferred), `samples/compilation-tests/` (default), `compiler/tests/browser/` (default). Plus any user-specified additions.
- **Approve disposition discretion for re-classified gauntlet fixtures:** PA-recommended default is "invert if reasonable, delete if no v0.3 equivalent, archive only for historical-value fixtures."
- **Approve scope of post-migration verification:** brief mandates compile-clean on examples/ + spot-check render on 5-10 examples. PA-recommended: keep tight; full e2e is Wave 3 D2's job (already in flight).

---

## 8. PA acceptance criteria (post-dispatch landing)

1. Every fixture in §1's IN-SCOPE buckets either:
   - migrated to v0.3 shape (rewrite applied) OR
   - left unchanged (classification = module / schema-anchor OR already v0.3 shape) OR
   - re-classified (intentionally-failing fixture inverted / deleted / archived)
2. Trucking-dispatch compiles error-free.
3. `bun run test` stays green; test count delta within ±10 (modulo re-classified gauntlet count).
4. `master-list.md §0` phase tracker updated.
5. Forensic report at `docs/changes/v0.3-wave-3-fixture-sweep/progress.md`.
6. Final report enumerates per-corpus migration outcomes + any surprises.

---

## 9. Cross-references

- Wave 1 commit: `2b7c4df` (SPEC anchor + walker inversion).
- Wave 2 item (a) commit: `885eaa9` (migrate `--program-shape`).
- Wave 2 item (b) commit: `41a4706` (TAB extension).
- BS-layer extension commit: `2314c8c`.
- §40.8.1 OQ closure commit: `3f2504e`.
- Approach A spec anchor commit: `d3deed2`.
- Implementation plan dive: `scrml-support/docs/deep-dives/program-as-container-implementation-plan-2026-05-12.md` Phase 2.2 Wave 3 + Phase 3.3 test corpus invariants.
- Page-helper dive: `scrml-support/docs/deep-dives/page-helper-element-design-2026-05-12.md` Phase 2.2 (migration edit count delta).
- Trucking reconnaissance: see S86 hand-off Phase 11.
- Task #13 (safety-harness fix): `docs/changes/migrate-safety-harness-import-fix/progress.md` (when it lands).

---

## Tags

#v0.3 #wave-3 #fixture-sweep #migrate-tool-driven #scoping #pre-dispatch #s86 #post-task-13 #option-a-single-dispatch #self-host-deferred #gauntlet-s20-channels-reclassification
