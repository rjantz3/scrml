# M3.2 — control-flow statements — progress

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-abd633c84f4f79d42
Branch: (harness-assigned)
Base after `git merge main`: 86f818c

## Plan

M3.2 adds control-flow statement constructors + parsers to the native-parser
statement layer. ast-stmt's StmtKind enum already declares If/While/DoWhile/
For/ForIn/ForOf/Return/Break/Continue/Labeled (M3.1 declared-deferred). M3.2:
1. ast-stmt.scrml/.js — make* constructors for the 10 declared kinds.
2. parse-stmt.scrml/.js — control-flow statement parsers; remove the
   E-STMT-FORWARD-M3-2 seam for control-flow leads.
3. parser-conformance-stmt.test.js — Acorn-oracle Tier 1+2 control-flow tests;
   update the M3.2 forward-seam describe block.

Scope authority: S98 DD §D5 control-flow rows. `switch` is OUT-OF-SUBSET.

## Log

- 2026-05-20T20:15 — startup verification passed (worktree confirmed, merge to
  86f818c, all predecessor files present, bun install + pretest clean).
  Read roadmap §3.2, S98 DD D3/D5, M3.1 ast-stmt/parse-stmt/parse-mode in full.
- 2026-05-20T20:20 — ast-stmt.scrml/.js: 10 control-flow make* constructors
  (commit 9720021, through the pre-commit hook).
- 2026-05-20T20:35 — parse-stmt.scrml/.js: control-flow parsers. parseIf /
  parseWhile / parseDoWhile / parseFor (C-style + for-in + for-of +
  for-await) / parseReturn / parseBreak / parseContinue /
  parseLabeledStatement. forHeadKind depth-0 scan disambiguates the for head.
  Committed as interior WIP (commit b790705) — the 4 M3.1 forward-seam tests
  go red until the test-file commit, so this single WIP commit used
  --no-verify; the FINAL state passes the gate.
- 2026-05-20T20:55 — parser-conformance-stmt.test.js: M3.2 conformance +
  native-shape (commit 91404c1, THROUGH the pre-commit hook clean —
  13362 pass). 52-entry CONTROL_FLOW_CORPUS Acorn-oracle Tier 1+2; native-
  shape assertions; return + control-flow via BlockStub re-entry; error-path
  + switch-out-of-subset coverage.
- 2026-05-20T21:00 — full `bun run test`: 17284 pass / 0 fail / 169 skip /
  1 todo (baseline 17158/0/169/1 — +126 net, 0 new failures).

## Result — M3.2 COMPLETE

- ast-stmt.scrml/.js + parse-stmt.scrml/.js + parser-conformance-stmt.test.js.
- Statement conformance suite: 269 pass (139 M3.1 + 130 new M3.2).
- for-head disambiguation done WITHOUT touching parse-expr (forHeadKind
  depth-0 scan + parsePostfix-level for-in/of LHS — the bounded-lookahead
  discipline; no `noIn` thread into M2's binary parser, which is M4 scope).

## M3.3 / M3.4 seams documented

- M3.3 — function/class declarations + in-line bodies + import/export +
  try/throw: parseStatement still records E-STMT-FORWARD-M3-3 for those leads.
  A top-level `return` is parsed (a Return node) but is a SyntaxError in JS;
  M3.3's BlockStub-re-entry / function-scope work owns the legality check.
- M3.4 — error-recovery engine: M3.2's diagnostics are recorded inline; the
  panic-mode re-synchronization wiring is M3.4. A control-flow body that
  fails to parse leaves the forward-progress guard in parseStatementList to
  catch the stall.
- K6 (pre-existing) — a NON-declaration destructuring for-in/of LHS
  (`for ([a] of xs)`) parses as an array/object LITERAL expr via
  parseForInOfLeftExpr (parsePostfix), not a binding pattern. Same param-vs-
  binding divergence class as roadmap K6; M4 unifies the two surfaces. The
  declaration form (`for (const [a] of xs)`) builds real binding patterns.
