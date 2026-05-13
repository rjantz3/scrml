# Progress — Wave 7.B corpus null-eradication (sweep null → not in scrml-syntax position)

## 2026-05-13 — start

- Worktree verified clean, bun install OK, pretest OK
- Maps consulted: primary.map.md (Task-Shape Routing — Refactor / cleanup / rename branch)
- Beginning systematic file-by-file scan

## 2026-05-13 — complete

5 commits landed, all pre-commit gates passed (11,170 / 0 fail across 561 files).

Per-file summary:
- 31ddb07 primer: 1 site migrated (line 90 default=null → default=not)
- f928741 kickstarter v1: 2 sites (login return null + ternary : null)
- f6f4d3d kickstarter v2: 3 sites (§3 default= + §10 login pair)
- e402abb samples: 1 site (sql-conditional-where-001 onclick=getPosts(null) → not)
- 63718d7 examples: 23 sites across 5 trucking-dispatch files

Total scrml-syntax migrated: 30 sites
SQL-mirror not null (schema constraints): all left intact
Prose / JS-host / TS-AST internals null references: all left intact
Negative test (phase3-eq-null-forbidden-020.scrml): intentionally left intact
