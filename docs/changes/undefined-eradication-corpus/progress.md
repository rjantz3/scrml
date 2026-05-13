# undefined-eradication-corpus progress

## 2026-05-13T00:00:00Z — start
- Verified worktree root + clean status + bun install + pretest (samples compile clean).
- Read primary.map.md.
- Beginning per-file grep classification sweep.

## 2026-05-13 — rebase
- Worktree base predated the S89 null-corpus landings on main (5 commits ahead).
- Pre-commit hook failed on baseline (`self-host-smoke.test.js` — `not is not defined`).
  Fix landed in main's `84f7fe9` (s89-null-self-host-C).
- Rebased onto main cleanly; baseline tests now 11,323 pass / 0 fail.

## 2026-05-13 — kickstarter v2 (commit f626256)
- Migrated 3 scrml-prose sites:
  - §4.4 derived-engine bullet (line 482)
  - §6.1 `req` row (line 526)
  - §6.1 `is some` row (line 527)
- Pre-commit: 11,323 pass / 0 fail.

## 2026-05-13 — primer (commit 0783311)
- Migrated 2 scrml-prose sites:
  - §8 universal-core predicate vocab (line 276)
  - §9.4 `is some` row (line 360)
- Left 8 TS-host internals references intact (B3/B14 AST field rows, B22 prose).

## 2026-05-13 — samples (commit 3647d0a)
- Migrated 1 site:
  - gauntlet-r10-solid-spreadsheet.scrml line 236: `v == undefined || v is not` → `v is not`
- 4 sample leaves correctly preserved (JS-host comments + negative test fixture).

## 2026-05-13 — DONE
- Articles other than kickstarter v2: zero scrml-syntax hits found.
- Examples *.scrml: zero scrml-syntax hits found.
- Final exhaustive re-grep confirms all remaining `undefined` mentions are
  TS-host compiler-internals prose, JS-host browser-semantic prose, or
  English "spec-undefined" usage.

