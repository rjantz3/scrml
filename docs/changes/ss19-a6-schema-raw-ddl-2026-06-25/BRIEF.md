# Dispatch BRIEF — ss19 A6: #6b g-schema-block-raw-ddl-silent-noop (MED, PA-found)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **opus** · **change-id:** ss19-a6-schema-raw-ddl-2026-06-25 · land-on `spa/ss19` · base `23601835`.

A raw `CREATE TABLE … (…)` inside a `<schema>` block is NOT recognized → the pre-analyzer harvests zero tables → `E-PA-002` fires ("no CREATE TABLE statement was found") even though the author DID supply DDL (just in `<schema>` instead of a `?{}` block).

[STARTUP-VERIFICATION + PATH-DISCIPLINE — standard block: pwd must start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`; `git rev-parse --show-toplevel`==WORKTREE_ROOT, remote scrml.git; `git status` clean; `bun install`; `bun run pretest`. Edits via Bash on worktree-absolute paths, NEVER `cd` into main, never Edit/Write tool, never `--no-verify`. One logical fix = one commit, coupled code+test.]

## Confirmed (sPA R26)
A `<program>` with `<schema> CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT); </schema>` + `<db src="m.db" tables="items">` (m.db absent) → `E-PA-002: ... no CREATE TABLE statement was found in any ?{} block for table items`. The declarative `<schema>` form (`items { id: integer primary key … }`) IS parsed (via `parseSchemaBlock`); the RAW `CREATE TABLE` form inside `<schema>` is not.

## Locus + fix
`compiler/src/protect-analyzer.ts` — `parseSchemaBlock`/`generateCreateTable` imported from `schema-differ.js` (L65) handle the DECLARATIVE `<schema>` form; the CREATE-TABLE harvester (regex L387-393, walk L399+) collects DDL from `?{}` SQL nodes ONLY. A raw `CREATE TABLE` inside a `<schema>` block reaches NEITHER path.

Two acceptable fixes (pick the cohesive one — verify against how `<schema>` content is represented in the AST first):
- **(preferred)** route the `<schema>` block's raw text through the existing CREATE-TABLE harvester (so raw DDL in `<schema>` feeds the shadow-DB the same as `?{}` DDL), OR
- **(fallback)** if conflating raw-DDL and declarative `<schema>` is messy, emit a CLEAR diagnostic for the unrecognized `<schema>` form ("`<schema>` expects the declarative `table { col: type }` form; raw `CREATE TABLE` belongs in a `?{}` block" — or similar) INSTEAD of falling through to the misleading E-PA-002.

Do NOT change the declarative `<schema>` path or the `?{}` harvester behavior. Don't introduce a SQL-injection or shadow-DB-construction regression (E-PA-003 path).

## Verify (R26 + adversarial)
1. The raw-DDL `<schema>` repro → either compiles clean (tables recognized, no E-PA-002) OR errors with the NEW clear diagnostic — not the misleading E-PA-002.
2. **Adversarial:** declarative `<schema>` (`items { id: integer primary key }`) still works (no regression); `?{}`-block CREATE TABLE still works; a genuinely-missing-DDL case still E-PA-002s.
3. Regression test near the existing protect-analyzer / schema-differ tests (grep `E-PA-002` / `parseSchemaBlock` in compiler/tests/). Full `bun run test` GREEN, 0 regressions (report baseline + after).

## Scope / report
ONLY #6b (schema raw-DDL recognition/diagnostic). **Flag any shared baseline your change shifts** (S211 parallel-landing reconcile). Report: commit SHA · red→green · repro before/after · adversarial results · which fix path you chose + why · git status clean + agent branch + tip SHA.
