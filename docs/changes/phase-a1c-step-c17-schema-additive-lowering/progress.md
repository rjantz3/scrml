# C17 Progress

**Step:** A1c Wave 5a — Schema additive shared-core lowering (§39, L4)
**Started:** S75 2026-05-09

## Phase 0 — Survey [DONE]
- [x] Read SPEC §39 in full (lines 16260–16487, all of §39.1–§39.5.9)
- [x] Read schema-differ.js (273 LOC)
- [x] Map shared-core predicates to lowering rules (13 in scope; `is some` out-of-spec for schema)
- [x] Audit driver matrix (sqlite/postgres/mysql per S60 Q7; only `pattern` is driver-divergent)
- [x] Reuse strategy with validator-catalog.ts (B10) — consult for name validation, hard-code emission
- [x] Test corpus survey — extending `compiler/tests/unit/schema-differ.test.js`
- [x] SURVEY.md written

## Phase 1 — Parse extension [DONE]
- [x] Extend `parseColumns()` to recognize 13 shared-core predicate tokens
- [x] Preserve all SQL-mirror parse paths unchanged
- [x] Helper `parseSharedCorePredicates()` with paren/bracket-aware arg extraction
- [x] `findMatchingParen()` helper; `SCHEMA_LOCUS_PREDICATES` Set gate

## Phase 2 — Lowering emit [DONE]
- [x] Extend `generateCreateTable()` to emit lowered CHECK / NOT NULL clauses per §39.5.8
- [x] Extend `generateAddColumn()` to handle shared-core in ADD COLUMN context
- [x] `lowerSharedCoreToChecks()` per §39.5.8 lowering table
- [x] cell-type-aware `req` lowering: NOT NULL + CHECK(col != '') for text/blob; NOT NULL only for integer/real/boolean/timestamp
- [x] `lowerLengthArg()`, `stripPatternLiteral()`, `stripArrayLiteral()`, `escapeSqlString()` helpers
- [x] No-duplicate-NOT-NULL guard when both `not null` (SQL-mirror) and `req` (shared-core) present

## Phase 3 — Driver dispatch [DONE]
- [x] Thread driver context through `diffSchema()`, `generateCreateTable()`, `generateAddColumn()`, `generate12StepRebuild()`
- [x] Emit `~` for Postgres / `REGEXP` for SQLite/MySQL on `pattern()` lowering
- [x] Default driver = "sqlite" preserves existing behavior

## Phase 4 — Tests [DONE]
- [x] Per-predicate parser tests (§8 — 10 tests)
- [x] Per-predicate emission tests including all length() relops (§9 — 16 tests)
- [x] pattern() driver matrix (§10 — 5 tests)
- [x] Mixed SQL-mirror + shared-core regression (§11 — 4 tests)
- [x] §39.5.8 worked-example verbatim regression (§11 — included)
- [x] `?{}` passthrough unchanged regression (§12 — 2 tests)
- [x] Cross-locus L4 alignment vs validator-catalog.ts (§13 — 2 tests)
- [x] SQL-mirror-only emission unchanged (§14 — 2 tests)
- [x] ADD COLUMN with shared-core req (§15 — 2 tests)

## Closeout [DONE]
- [x] Final regression check — full suite 10595/69/1/3 (baseline +44, 3 pre-existing fails unchanged)
- [x] schema-differ.test.js: 15 → 59 (+44)
- [x] No spec amendments
- [x] No `?{}` passthrough touched

## Files touched
- `compiler/src/schema-differ.js` — +362 LOC (parser + emitter + helpers)
- `compiler/tests/unit/schema-differ.test.js` — +623 LOC (8 new describe blocks)
- `docs/changes/phase-a1c-step-c17-schema-additive-lowering/SURVEY.md`
- `docs/changes/phase-a1c-step-c17-schema-additive-lowering/progress.md`

## Deferred items
- `is some` schema lowering — explicitly NOT in §39.5.7 enumeration. Documented out-of-scope.
- Cross-field shared-core args (e.g., `gte(@startDate)`) — requires `@cell` syntax inside schema; spec §39.5.8 line 16436 mentions this but C17 v0.next handles literal-arg only. Future work.
- Schema-differ rebuild detection on CHECK-constraint diff — `PRAGMA table_info` doesn't expose CHECK text, so adding a CHECK to an existing column doesn't surface a structural diff. Acceptable for v0.next; future work would query `sqlite_master.sql` for full DDL comparison.
