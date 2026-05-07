# A+ verdict #1+#2 — STATUS

[2026-05-06 start] - Survey complete. Findings:
  - E-SWITCH-FORBIDDEN does not exist today; switch is silently parsed in ast-builder.js (sites: 4379, 6753).
  - W-LIFECYCLE-CANDIDATE lint not yet implemented (only documented). lint-ghost-patterns.js is the right home.
  - No quickfix infrastructure exists; enriched-message-text approach.
  - Predicate chosen: single-word + initial-uppercase + alphanumeric (^[A-Z][A-Za-z0-9]*$).

[2026-05-06] - Implementation:
  - ast-builder.js: hard-error `E-SWITCH-FORBIDDEN` at both parseOneStatement parse-sites with
    enriched did-you-mean message naming both `<match for=Type>` block form and
    `match expr { .Variant -> ... }` JS-style value-return form.
  - lint-ghost-patterns.js Pattern 16: `W-LIFECYCLE-CANDIDATE` regex
    `<state>[: Type] = "PascalCase"` with skip-in-${} / //-comment / ~{}-test
    fallthroughs. Predicate: `^[A-Z][A-Za-z0-9]*$`.
  - stdlib/compiler/meta-checker.scrml: converted two internal `switch (type.kind)`
    blocks to if-else over `kind` strings (carry-cost of the verdict — required
    once switch is hard-error).
  - samples/.../phase2-switch-statement-071.expected.json: `expectedCodes` updated
    from `["UNKNOWN"]` to `["E-SWITCH-FORBIDDEN"]`.
  - compiler/tests/unit/a-plus-verdict.test.js (NEW): 15 cases covering both
    parse-sites for switch + 12 W-LIFECYCLE-CANDIDATE positive/negative cases.

## Verdict

GREEN.

S64 debate-04 A+ verdict carry-forward fully closed (#1 + #2; #3 doc-only landed in S65 commit 814983d).

## Concurrency note

Three other dispatches ran in parallel mutating the same tree
(`ast-builder-grammar-fixes`, `cell-classifier`, `promotion-ergonomics`). My
ast-builder.js, lint-ghost-patterns.js, stdlib, and test-file edits were
overwritten TWICE during this dispatch by parallel destructive operations
(`git reset HEAD` + working-tree clobber). Caught and reapplied each time.

Recommendation: future multi-dispatch coordination should serialize edits to
ast-builder.js and lint-ghost-patterns.js, OR use worktree isolation when more
than one dispatch needs to touch them. The dispatch-43 hand-off note says this
dispatch runs without worktree isolation — future similar dispatches should
reconsider.
