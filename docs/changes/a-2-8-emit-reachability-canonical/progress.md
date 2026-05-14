# A-2.8 — `--emit-reachability` canonical JSON + determinism tests

## Progress log

### 2026-05-14T (session open)
- Worktree base was `ff9be0e` (S90 close); fast-forward merged main `470b128` (post-A-2.7 + post-A-3.5 wire).
- `bun install` + `bun run pretest` PASS.
- Maps consulted: primary, domain, schema, error. Load-bearing — schema.map confirmed `ReachabilityRecord` shape is closures + diagnostics ONLY (no fixpoint metadata at HEAD: orchestrator drops `fp.iterations`/`fp.terminated`). The brief's "post-A-2.7 fields" speculation does NOT apply at current HEAD.
- SPEC §40.9.8 + PIPELINE Stage 7.6 lines 2391-2396 confirm determinism mandate verbatim.
- Reference patterns: `serializeBatchPlan` (compiler/src/batch-planner.ts:748) — uses `localeCompare` for ordering + canonical key emission.

### Step 1 — Sub-task 1: harden serializeReachabilityRecord — DONE

- `compiler/src/reachability-solver.ts` lines 419-690 rewritten:
  - Module-level comment block documents §40.9.8 anchor + canonical-ordering rules + bit-identical invariant.
  - `canonicalIdComparator` — stratified comparator. Stratification: number (class 0, numeric compare) < string (class 1, codepoint compare) < other (class 2, canonical-stringify compare).
  - `compareStrings` — codepoint compare via `<`/`>` (NOT `localeCompare` — ICU-version-dependent).
  - `canonicalStringify` — recursive canonical-key JSON form for class-2 values (forward-compat for structured NodeId forms).
  - `compareDiagnostics` — sorts by (code, severity, entryPoint ?? "", role ?? "", message). Empty string = absent-field sentinel.
  - Diagnostic emission preserves fixed key order (code → severity → entryPoint? → role? → message); optional fields appear only when present.
  - Top-level + ChunkPlan + ChunkContents emission uses fixed key order via object-literal construction (ES2015 string-key order preservation).
- Existing `reachability-solver-scaffold.test.js` (6 tests) + `reachability-solver-outer-fixpoint.test.js` (?) + `auth-graph-spec-40-9-9-worked-example.test.js` (?) all PASS — 42 + 6 = 48 tests in regression confirmation.

### Step 2 — Sub-task 2: determinism tests — DONE

- Created `compiler/tests/unit/reachability-record-determinism.test.js`.
- 21 tests covering §1-§11 organized in 11 describe blocks (brief asked for ~10-15).
- Coverage:
  - §1 Two-run synthetic bit-identicality (2 tests)
  - §2 Ten-run pipeline bit-identicality
  - §3 Mixed-shape Set sort stability (4 tests — numeric, string-composite, mixed-strata, insertion-order)
  - §4 Diagnostic canonical sort (3 tests — out-of-order insertion, identical-content reordered, optional-field-minimality)
  - §5 §40.9.9 worked-example × 5 replay
  - §6 CLI two-dir spawn diff
  - §7 Empty-record + role-reversed-Map canonical shape (2 tests)
  - §8 Empty-string absent-sentinel ordering
  - §9 NodeId type stratification (numeric class < string class) (2 tests)
  - §10 Map-vs-object key-order independence
  - §11 ChunkContents / ChunkPlan / top-level fixed key order (3 string-position assertions)
- All 21 tests PASS.
- Initial run had 1 failure — CLI flag `--out` (didn't exist) → fixed to `-o`. No serializer bug.

### Step 3 — Sub-task 3: PIPELINE.md polish — DONE

- `compiler/PIPELINE.md` Stage 7.6 Determinism bullet (line 2393) extended with the A-2.8 hardening note: stratified comparator, codepoint string compare, diagnostic canonical ordering, fixed key sequences; references the test anchor.
- `compiler/PIPELINE.md` Stage 7.6 CLI exposure bullet (line 2398) updated — removed the "Implementation deferred" caveat; A-2.1 (CLI flag wiring) + A-2.8 (canonical serializer) now together provide a complete CLI surface.
- `.claude/maps/domain.map.md` Task-Shape Routing: split the `--emit-reachability` row out of the wire-format row; new row points at the A-2.8 implementation + test anchor.
- `.claude/maps/domain.map.md` v0.3.0 Status: added S91 CLOSED entries for A-2.7, A-3.5, A-2.8; removed corresponding pending entries.

### Final gate

- `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail` → 11596 pass / 88 skip / 1 todo / 0 fail (591 files). Baseline pre-A-2.8 was 11575 pass; the +21 delta matches the new determinism suite.
- No `--no-verify` used on any commit.




