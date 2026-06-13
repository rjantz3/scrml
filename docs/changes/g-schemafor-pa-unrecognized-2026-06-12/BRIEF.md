# BRIEF — g-schemafor-pa-unrecognized (MED) — protect-analyzer false E-PA-002 on canonical §41.15 Form-B schemaFor

change-id: `g-schemafor-pa-unrecognized-2026-06-12`
dispatched: S189 (2026-06-12) · agent: scrml-js-codegen-engineer · isolation: worktree

## MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). The
§"Task-Shape Routing" section tells you which additional maps to consult — your task shape is
**compiler-source bug fix** (protect-analyzer stage + possibly schemaFor codegen). Follow that routing
(expect: primary.map + error.map + structure.map).

Map currency: maps reflect HEAD **1ad740b4** as of 2026-06-12. HEAD is now `0ee4b43a` — the 2 commits
since the maps watermark are the S188 wrap (docs) + a corpus-migration/test-rebaseline (NO compiler
source). So map content is **current-truth for code**. Verify any specific claim via grep/Read against
current source regardless.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one
sentence>" or "Maps consulted but not load-bearing — [which you expected to help]."

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had path-discipline leaks; do not be the next)

Your worktree path is whatever `pwd` returns at startup. BEFORE any other tool call:

1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing
   failure). Save it as `WORKTREE_ROOT`.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `bun install` (worktrees don't inherit node_modules; the pre-commit `bun test` fails with "cannot find
   package 'acorn'" otherwise).
5. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests).

**Path discipline (S99/S126 — interim mitigation IN FORCE):**
- Apply ALL file edits via **Bash** (`perl`/`python3`/`cp`/heredoc) on **worktree-absolute paths** that
  include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools. Echo the target path
  before each write; re-verify via `git diff`/`grep` after.
- NEVER `cd` into the main repo (or anywhere). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`,
  and worktree-absolute paths exclusively. (S126 incident #14 leaked a `bun add` into MAIN via `cd`.)
- Your FIRST commit message MUST include the verbatim `pwd` output, e.g. `WIP(g-schemafor): start at $(pwd)`.

## THE BUG (empirically confirmed at HEAD 0ee4b43a — verify-before-claim)

The canonical §41.15 Form-B `schemaFor` usage — `<schema> ${ schemaFor(StructType) } </>` ("define a
struct → get the SQL schema without writing DDL", the SHIPPED L22 flagship-adjacent member, S104) — fires
a FALSE `E-PA-002` ("Database file `…` does not exist and no CREATE TABLE statement was found … for table
`drivers`") whenever the db file does NOT pre-exist (the common dev / first-run case).

**Isolated:** a LITERAL `<schema> drivers { … } </>` block with the identical no-db-file setup compiles
CLEAN — the protect-analyzer recognizes a literal `<schema>` table-block as a table-definition source
(satisfying E-PA-002) but does NOT recognize a `schemaFor`-generated one.

**Root (stage-ordering):** the protect-analyzer (`compiler/src/protect-analyzer.ts`, an EARLY pipeline
stage) scans for table-definition sources (via `parseSchemaBlock` from `schema-differ.js`, + `?{}` CREATE
TABLE harvest) BEFORE the L22 `schemaFor` codegen expansion (`compiler/src/codegen/emit-schema-for.ts`,
codegen stage). At PA time the `<schema>` body is still the unexpanded `${ schemaFor(Driver) }`
interpolation, so PA sees no `drivers` table-block → E-PA-002. Table NAME is not the issue — `schemaFor`
pluralizes per §41.15.2 (`Driver`→`drivers`), matching `<db tables="drivers">`.

### Exact reproducer (create in your worktree; canonical Form-B shape — schema is a DIRECT child of `<program>`, NOT inside `<db>`):

```scrml
<program>
  ${
    import { schemaFor } from 'scrml:data'
    type Driver:struct = {
      id: integer,
      email: string,
      name: string req length(>=2),
      age: number min(18) max(120)
    }
  }
  <db src="t.db" tables="drivers"/>
  <schema>
    ${ schemaFor(Driver) }
  </>
  <p>schema generated</p>
</program>
```

Compile with `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <file> --output-dir <tmp>` (ensure
`t.db` does NOT exist) → currently fails with E-PA-002. The literal control (same setup, a literal
`drivers { id: integer primary key  name: text }` body) compiles clean — confirms it's schemaFor-specific.

## SPEC AUTHORITY (Rule 4 — verify against the spec text, don't trust this brief)

- §41.15 — `schemaFor(StructType)` API; Form-B function-call form `${ schemaFor(Users) }` interpolated
  inside `<schema>` (OQ-SCH-1 verdict). The struct's fields lower to a `<schema>` table-declaration fragment.
- §41.15.2 — table-name derivation (pluralization `Driver`→`drivers`).
- §39.3 — `<schema>` placement (direct child of `<program>`).
- protect-analyzer E-PA-002 contract (`compiler/src/protect-analyzer.ts` header, ~lines 36-48): src= file
  missing AND one or more `tables=` names have no CREATE TABLE source.

## FIX DIRECTION (Rule 3 — the right answer; survey-authorized to correct)

**Recommended (localized, PA-side):** teach the protect-analyzer to recognize a `${ schemaFor(StructType) }`
interpolation inside a `<schema>` block as a **table-definition source** for the pluralized table name —
resolve the struct + its §41.15.2 table name at PA time (you do NOT need the full DDL string; you need the
table NAME to be recognized as "defined" so E-PA-002 doesn't false-fire). There is likely a table-name
helper in `emit-schema-for.ts` you can reuse for the §41.15.2 pluralization.

**Alternative (heavier, only if the PA-side recognition proves wrong):** run the table-source-discovery
AFTER schemaFor expansion. This is a stage-ordering change with broader blast radius — prefer the localized
PA-recognition fix; escalate (STOP + report) if the survey shows it's structurally infeasible.

**Depth-of-survey discount applies (PRIMER §12):** survey the actual protect-analyzer table-source-harvest
path before estimating — existing infra (`parseSchemaBlock`, the struct/type registry available at PA stage)
likely covers most of this; the real fix may be a localized extension.

Do NOT regress the literal `<schema>` path, the `?{}` CREATE-TABLE path, or the genuine E-PA-002 fire (a real
missing table with no source SHALL still error). Resolve the struct robustly — if the struct can't be
resolved at PA stage (forward-ref / unresolved import), fall through to the existing behavior (don't crash).

## COMMIT DISCIPLINE (S83 two-sided — load-bearing)

- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`;
  commit IMMEDIATELY. Don't batch. WIP commits expected. Code + its coupled test = ONE commit
  (feedback_coupled_code_test_commit).
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean. "work in worktree, no commits" is
  NOT an acceptable terminal report.
- Update `docs/changes/g-schemafor-pa-unrecognized-2026-06-12/progress.md` (worktree-absolute) after each
  step — append-only, timestamped.

## PHASE 3 — EMPIRICAL VERIFICATION (mandatory; DO NOT mark DONE without this passing)

1. Recompile the reproducer above (no `t.db`) → E-PA-002 GONE, exit 0.
2. The literal-`<schema>` control (same no-db setup) → STILL clean (no regression).
3. A genuine missing-table case (`<db src="x.db" tables="ghosts"/>` with NO schema/CREATE TABLE for
   `ghosts`, no x.db) → STILL fires E-PA-002 (don't over-suppress).
4. Compile the canonical §41.15 worked example if one exists in `samples/`/`examples/`.
5. Add a regression test (unit or integration) asserting schemaFor Form-B + missing-db compiles clean AND
   the genuine-missing-table case still errors. Run the relevant test dir green.
6. Full pre-commit subset green (`bun test compiler/tests/{unit,integration,conformance} --bail` — the
   pre-commit hook runs this; it must pass for your commits to land).

## REPORT BACK
WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, the fix locus you chose + why (PA-recognition vs stage-reorder),
the Phase-3 empirical results (exit codes + E-PA-002 presence/absence per case), test delta, any deferrals,
and the MAPS feedback line.
