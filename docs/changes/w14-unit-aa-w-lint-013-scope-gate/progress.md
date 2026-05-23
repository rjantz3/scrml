# Progress: w14-unit-aa-w-lint-013-scope-gate

- Start — worktree agent-a6a9d39bfc326dc18, pwd /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a6a9d39bfc326dc18
- Maps: primary.map.md + structure.map.md + domain.map.md consulted; no Task-Shape Routing block in maps; routed to lint-ghost-patterns.js
- Load-bearing map finding: structure.map.md:14 + :20 ("compiler/src/ ... plus lints"; "validators/ ... lint-async-user-source") + domain.map.md:30 ("Ghost-lint pre-pass — lintGhostPatterns + Tailwind class lints") confirmed lint sits at compiler/src/lint-ghost-patterns.js (pre-Stage-2)
- Bug confirmed: bare `@counter = 5` at <program> body fires W-LINT-013 falsely (1 fire on 4-line repro)
- Pre-fix corpus: 119 W-LINT-013 false fires across 15 sample files (gauntlet-r10-bun-admin: 35, recipe-book: 12, quiz-app: 11, contact-directory: 11, api-dashboard: 11, blog-cms: 10, ...)

- Fix: added `buildTagOpenerRanges(source, skipMerged)` helper — walks `<TagName ... >` openers honoring string-attribute values via skipMerged. ANDed W-LINT-013 `skipIf` with `!inRange(offset, tagOpenerRanges)`; preserved existing logic / tilde / function / comment guards. Walker now passes `tagOpenerRanges` as 8th skipIf arg.

- 6228b0d6 — WIP start (pwd echo)
- 418f20b9 — source fix in lint-ghost-patterns.js (+90 / -14)
- 4eb744c7 — 3 regression tests in tests/unit/lint-ghost-patterns.test.js

- Post-fix corpus: 0 W-LINT-013 fires (119 → 0, 100% FP elimination)
- Tests: 13822 pass / 92 skip / 0 fail / 0 regressions (full unit+integration+conformance --bail)
- Pretest: 13 test samples compiled cleanly

DONE.
