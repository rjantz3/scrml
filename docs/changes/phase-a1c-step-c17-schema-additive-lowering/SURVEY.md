# C17 — Phase 0 Survey

**Step:** A1c Wave 5a — C17 Schema additive shared-core lowering (§39, L4)
**Session:** S75, 2026-05-09
**Source-of-truth verified:** SPEC.md §39.1–§39.5.9 (lines 16260–16487) — spec text reviewed in full.

---

## §1 — Spec verification (per pa.md Rule 4)

`compiler/SPEC.md` §39.5.7 + §39.5.8 are the normative source. Key normative excerpts (verbatim from SPEC.md, no paraphrase):

- §39.5.7 (line 16395): "Schema column constraints accept the **shared validator core vocabulary** (`req`, `length`, `pattern`, `min`, `max`, `gt`/`lt`/`gte`/`lte`, `eq`/`neq`, `oneOf`/`notIn`) as ADDITIVE forms alongside the SQL-mirror native constraints (`not null`, `unique`, `references`, `default`, `primary key`)."
- §39.5.7 (line 16399): "The SQL-mirror native vocabulary remains the canonical source-level form for the schema locus. The shared-core vocabulary is purely additive — not a replacement, not a synonym map, not a bilingual schema."
- §39.5.7 (line 16399): "Both forms are legal; mixed forms (one column SQL-mirror, another column shared-core) are legal."
- §39.5.8 lowering table (line 16428–16438) — verbatim per-predicate emission.
- §39.5.8 (line 16445): "The shared-core `req` predicate on a schema column SHALL lower to `NOT NULL` plus, for `text`/`blob` columns, an additional `CHECK (col != '')`."
- §39.5.8 (line 16447): "The SQL strings sent to the database are PRESERVED. Vocabulary unification touches only scrml source-level words ... `?{}` SQL-passthrough blocks (§8) are unaffected."
- Worked example (line 16452–16464) gives exact lowered SQLite output for a mixed-vocabulary schema.

**Spec verification: SCOPE row C17 (line 240) matches §39.5.8 exactly.** No drift, no spec amendments needed.

## §2 — 13 shared-core predicates and per-predicate lowering

Per §39.5.8 lowering table:

| # | Predicate | Lowered SQL | Driver-dependent? | Cell-type-dependent? |
|---|---|---|---|---|
| 1 | `req` | `NOT NULL` + (text/blob only) `CHECK (col != '')` | No | Yes (text/blob get the empty-string check; integer/real/boolean/timestamp do NOT) |
| 2 | `length(>=N)` etc. | `CHECK (length(col) <op> N)` | No (length() is portable across SQLite/Postgres/MySQL) | Cell must be string-or-array (or blob → bytes) per spec. We just emit `length(col)`. |
| 3 | `pattern(/re/)` | SQLite/MySQL: `CHECK (col REGEXP 're')`; Postgres: `CHECK (col ~ 're')` | YES | Cell-type is string |
| 4 | `min(n)` | `CHECK (col >= n)` | No | Cell-type is number; n is numeric literal |
| 5 | `max(n)` | `CHECK (col <= n)` | No | Same as min |
| 6 | `gt(n)` | `CHECK (col > n)` | No | Orderable |
| 7 | `lt(n)` | `CHECK (col < n)` | No | Orderable |
| 8 | `gte(n)` | `CHECK (col >= n)` | No | Orderable |
| 9 | `lte(n)` | `CHECK (col <= n)` | No | Orderable |
| 10 | `eq(n)` | `CHECK (col = n)` | No | Equatable |
| 11 | `neq(n)` | `CHECK (col != n)` | No | Equatable |
| 12 | `oneOf([v1,v2,...])` | `CHECK (col IN (v1,v2,...))` | No | Equatable |
| 13 | `notIn([v1,v2,...])` | `CHECK (col NOT IN (v1,v2,...))` | No | Equatable |

`is some` is the 14th universal-core predicate but §39.5.7 explicitly enumerates the 13 above for schema. `is some` is not listed for schema lowering — schema-locus has no notion of "EXISTS" beyond NOT NULL semantics handled by `req`. This survey treats `is some` as out-of-scope for C17.

`length(>=N)` covers all 6 relational forms (`>=`, `>`, `<=`, `<`, `==`, `!=`) per §39.5.8 line 16432 — these are 6 sub-cases of one predicate; total emit rules are still 13 + variants.

## §3 — Implementation surface map

### Owns lowering today

- **`compiler/src/schema-differ.js` (~273 LOC)** — sole production consumer of `<schema>` AST text. Today's surface:
  - `parseSchemaBlock(text)` — regex-parses table/column declarations into `{ tables: [{ name, columns: [{name,type,primaryKey,notNull,unique,default,references,renameFrom}] }] }`.
  - `generateCreateTable(table)` — emits `CREATE TABLE` SQL string, joining column-level constraint clauses.
  - `generateAddColumn(table,col)` — emits `ALTER TABLE ADD COLUMN`.
  - `generate12StepRebuild(...)` — full table rebuild for SQLite limitations.
  - Currently recognizes ONLY: `primary key`, `not null`, `unique`, `default(...)`, `references table(col)`, `rename from id`.
  - Does NOT recognize any shared-core predicate. Adding shared-core support requires extending both parser (recognize predicate tokens) and emitter (lower them to CHECK / NOT NULL clauses).

### Does NOT own schema lowering

- `compiler/src/ast-builder.js` — only normalizes block.type for lifecycle keywords (`schema` is in `_STATE_FORM_LIFECYCLE`); doesn't dive into the body.
- `compiler/src/codegen/db-driver.ts` — drives `<program db="...">` URI parsing → `{driver: "sqlite"|"postgres"|"mysql", connectionString}`. This is the driver-detection layer C17 will plug into.
- `compiler/src/validator-catalog.ts` — predicate signature catalog. Reusable for cross-locus predicate-name validation; does NOT contain lowering rules (it's intentionally lowering-free, just metadata).

### Production call site for schema-differ

`grep -rn "schema-differ"` shows ONLY the unit test (`compiler/tests/unit/schema-differ.test.js`) imports it. The migration command (`compiler/src/commands/migrate.js`) is for SOURCE rewriting (whitespace + machine→engine), not DB schema migration. The `scrml migrate` CLI implied by §39.8 ("scrml migrate CLI") is not yet wired — schema-differ is a primitive that future infrastructure (CLI + dev-mode auto-reload) will call. **C17 extends the primitive; downstream consumers come later.**

## §4 — Driver matrix audit

Per S60 Q7 ratification (SCOPE-AND-DECOMPOSITION line 422): Postgres + SQLite + MySQL ONLY. `compiler/src/codegen/db-driver.ts` line 27 confirms `DbDriver = "sqlite" | "postgres" | "mysql"`.

Per-predicate driver dispatch needed:

- **Pattern only:** `pattern(re)` — SQLite/MySQL use `REGEXP`, Postgres uses `~`. Per §39.5.8 line 16433.
- **Everything else is driver-uniform** for the predicates in scope:
  - `length()` is SQL standard (works in all three);
  - `IN`/`NOT IN`/`>=`/`<=`/`>`/`<`/`=`/`!=` are SQL standard;
  - `NOT NULL`/`CHECK` are SQL standard.

**Note on SQLite `REGEXP`:** SQLite ships `REGEXP` as a syntactic operator that delegates to a user-defined function. Bun's bundled SQLite registers `REGEXP` by default. C17 emits `REGEXP` for SQLite per spec; the runtime cost of registration is downstream of C17. (Per spec §39.5.8 the lowering form is determined; runtime registration is outside C17 scope.)

**MySQL note:** MySQL 8.0+ supports `REGEXP` (and the synonym `RLIKE`). C17 emits `REGEXP`.

## §5 — Reuse opportunities with `validator-catalog.ts` (B10)

- `lookupPredicate(name)` returns a `PredicateSignature | undefined` — useful to confirm "this token is a universal-core predicate" before parsing it as a constraint.
- `isUniversalCorePredicate(name)` is the convenience wrapper.
- `UNIVERSAL_CORE_PREDICATES` is the iterable of 14 predicate signatures (we use 13 for schema; `is some` is out per §3 above).

Catalog is TS, schema-differ is JS. **Reuse strategy:** `validator-catalog.ts` re-exports JSON data structures cleanly (Bun runs both; tests import either). schema-differ.js can `import { isUniversalCorePredicate } from "./validator-catalog.ts"` if helpful — but in practice C17 uses a hard-coded subset (the 13 schema-locus predicates) since some (`length`'s relational-arg form, `pattern`'s regex-literal form, `oneOf`'s array-literal form) require predicate-specific arg-parsing that the catalog's metadata alone can't drive. The catalog is consulted for validation ("is this name a known predicate?"), not for emission ("emit the right SQL form").

## §6 — Test corpus survey

Existing schema test: `compiler/tests/unit/schema-differ.test.js` — 7 describe blocks, ~10 tests, all on SQL-mirror only (no shared-core). C17 extends this file with new describe blocks for §39.5.7/§39.5.8.

No `<schema>` integration test exercises shared-core today. Sample files (`examples/17-schema-migrations.scrml`) use only SQL-mirror — these become regression tests once C17 lands; the emission for these SHALL be byte-identical to today.

## §7 — Cross-locus L4 alignment

L4 (cross-locus predicate vocabulary unification) already implemented at:
- State-cell validators (§55.2) — A1b B10 catalog landed S67.
- Refinement types (§53) — A1b B21 (separate scope, deferred).

C17 is the schema-locus implementation of L4. Cross-locus alignment check: same predicate name MUST mean the same thing across loci. C17 enforces this by reusing the validator-catalog source-of-truth (consult `lookupPredicate(name)` to confirm the name is a universal-core predicate).

**Cross-locus test:** A single test that puts the same predicate (e.g., `length(>=2)`) on a state-cell, a refinement type slot, AND a schema column SHOULD all emit different layers (validator JS, refinement runtime check, SQL CHECK clause) using the same source-level word. C17 adds this cross-locus regression test scoped to what's available today (state-cell already lands B10; schema lands here; refinement is B21 / future).

## §8 — Inviolable property: `?{}` passthrough is unchanged

Per §39.5.8 line 16447 ("the SQL strings sent to the database are PRESERVED"): C17 does not touch `?{}` block emission AT ALL. The whole pipeline for `?{}` is in `compiler/src/codegen/emit-control-flow.ts` and stmt-level SQL emission — completely orthogonal to schema-differ.js. C17 ships a regression test confirming a sample with `?{}` emits unchanged SQL.

## §9 — Estimated revised scope

Per dispatch brief: 4-6h focused. After survey:

- Phase 1 — Extend `parseColumns()` in schema-differ.js to recognize the 13 shared-core predicate forms (regex extension, ~80 LOC).
- Phase 2 — Extend `generateCreateTable()` and `generateAddColumn()` to emit the lowered constraint SQL per predicate kind (~80 LOC).
- Phase 3 — Driver-aware pattern emission (parameter threading; ~30 LOC).
- Phase 4 — Tests: ~40-50 new test cases (per-predicate × per-cell-type combos + driver matrix + mixed-form regression + `?{}` regression + cross-locus).

**No spec amendments.** No scope expansion. Delivers in budget.

## §10 — Open questions surfaced

1. **`is some` schema lowering** — §39.5.7 enumerates 13 predicates explicitly, omitting `is some`. SCOPE row C17 says "13 shared-core predicates." The 14th (`is some`) is out of scope for C17. **Confirmed: not implementing `is some` lowering.** If user needs `is some` on a schema column, that's a future spec amendment.
2. **`length()` on `blob` columns** — §39.5.8 says "For `blob` columns, it returns byte count." This is SQL-portable (length() returns octet length on bytea/blob in all three drivers when applied to a binary column). C17 emits `length(col)` regardless; cell-type-dispatch is not needed for length().
3. **`pattern()` regex literal form in source** — Spec says `pattern(/re/)`. The schema-differ regex-parser must extract `/re/` and emit `'re'` (SQL string-literal). Slashes are stripped; SQL escaping of single-quotes inside the regex is handled. (Conservative behavior: forbid embedded single-quotes for v0.next; emit a parse error if found.)
4. **Cross-field predicate args (`gte(@startDate)`)** — §39.5.8 line 16436 says cross-field args reference only same-table columns. **For C17 v0.next, scope is: literal-arg only.** Cross-field schema args (e.g., `endDate gte(@startDate)`) are deferred to future work (the syntax `@cell` inside schema is not yet parsed). C17 emits CHECK with literal arg only; surface a TODO if cross-field is encountered.

## §11 — Implementation plan summary

1. Extend `parseColumns()` in `compiler/src/schema-differ.js`:
   - Add a tokenizer pass that recognizes the 13 shared-core predicates (`req`, `length(...)`, `pattern(...)`, `min(n)`, `max(n)`, `gt(n)`, `lt(n)`, `gte(n)`, `lte(n)`, `eq(n)`, `neq(n)`, `oneOf([...])`, `notIn([...])`) and produces a `sharedCorePredicates` array on each column.
   - Preserve existing SQL-mirror parse paths unchanged.

2. Extend `generateCreateTable()` (and `generateAddColumn()`) to emit the lowered constraint SQL for each shared-core predicate per §39.5.8.

3. Thread driver context (`"sqlite" | "postgres" | "mysql"`) through `diffSchema()` (default `"sqlite"`) so `pattern()` lowering picks the right operator.

4. Tests in `compiler/tests/unit/schema-differ.test.js` covering:
   - Each predicate × representative cell type × representative driver
   - Mixed SQL-mirror + shared-core on same column
   - Worked-example from §39.5.8 (line 16452–16478) verbatim regression
   - `?{}` passthrough — sample with both schema + ?{} parses unchanged
   - Cross-locus (state-cell uses `length(>=2)`, schema uses `length(>=2)` — both reference the SAME predicate name)

## §12 — Load-bearing-question answer

> Is this work the schema-differ.js's responsibility, a new module, or split?

**schema-differ.js's responsibility, single module.** Rationale:

- Schema-differ already owns the ENTIRE column-parse → DDL-emit pipeline.
- The spec's "lowering" is purely about which DDL clauses get emitted; it's an additive emission rule, not a structural pipeline change.
- A new module would create artificial separation between SQL-mirror parsing and shared-core parsing that has no operational meaning (both read the same column declaration text).
- The total LOC delta after survey is ~190; staying in one file matches existing module shape (~273 → ~460).

A future split could happen if schema-differ exceeds ~600 LOC or if multiple emission targets emerge. C17 doesn't trigger that; survey strongly recommends single-module extension.
