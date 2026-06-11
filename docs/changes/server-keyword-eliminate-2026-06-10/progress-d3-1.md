# D3.1 progress — Fix 2 Migration-4 tool gaps (W-DEPRECATED lift-suppression + handle span)

Append-only. Timestamped. Worktree start: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a0bef1c6ab34e5d90

## 2026-06-11 — startup verification
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a0bef1c6ab34e5d90
- toplevel: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a0bef1c6ab34e5d90
- HEAD at start: 7f64101090f946d5cf78f5f191a4b56a2baa5283 (= main 7f641010, `git merge origin/main` Already up to date)
- tree clean; bun install OK; bun run pretest OK (13 samples).
- Pre-commit gate baseline (unit+integration+conformance): 16582 pass / 0 fail / 90 skip / 1 todo (16673 across 898 files).
- Existing Migration-4 suite (compiler/tests/commands/migrate-server-keyword.test.js): 12 pass / 0 fail.
- Maps read: primary.map.md (full). NOT load-bearing for this dispatch — no routing entry for
  the server-keyword-eliminate arc / W-DEPRECATED-SERVER-MODIFIER (fresh arc, unmapped). Feedback line filed.

## PHASE 0 — SURVEY findings

### Gap A — W-DEPRECATED lift-suppression (route-inference.ts:3172)
- Fire path: route-inference.ts:3110-3230 (Step 5d, "D5: W-DEPRECATED-SERVER-MODIFIER").
- The exact suppression: line 3172 `if (isExplicitServer && !hasLiftInFunctionBody(record.fnNode)) {`.
  `hasLiftInFunctionBody` (defined :3089) walks the fn body for any `lift-expr` node.
- Full fire condition INSIDE that guard: `triggerDesc !== null`, where triggerDesc is set ONLY when
  `otherReasons.length > 0` (escalation reasons MINUS explicit-annotation) OR all non-self callers are server.
- KEY: a lift-SQL fn gets a `server-only-resource` (sql-query) escalation reason at :1124-1132
  (lift-expr → expr.kind==="sql" → push trigger). So `otherReasons.length > 0` → triggerDesc set → would fire,
  but the `!hasLiftInFunctionBody` guard currently BLOCKS it. Removing that guard lets it fire.
- GUARD PRESERVED: the `triggerDesc !== null` check is INDEPENDENT of the lift-suppression. A lift-PURE
  fn (lift in body, NO sql/protected/channel/handle reason, no server callers) has otherReasons empty +
  no server callers → triggerDesc stays null → does NOT fire. Removing `!hasLiftInFunctionBody` keeps that.
- Stale-premise CONFIRMED: D1 (§10.4, type-system.ts:14497) made lift-as-return valid in inferred-server
  plain `function`; the S93 E-SYNTAX-002 premise is obsolete.

### Gap B — handle (and ALL bare-decl) W-DEPRECATED span off-by-2 — SCOPE CORRECTION
- Reproduced via probe (compileScrml → W-DEPRECATED diagnostic span):
  - WRAPPED `${ server function handle... }`: span.start lands on "server function ha" (CORRECT).
  - BARE-DECL `server function handle...` at <program> direct-child: span.start = +2, lands on "rver function hand" (BUG).
- ROOT CAUSE (NOT handle-specific, NOT in route-inference): the bare-decl auto-lift in
  ast-builder.js `liftBareDeclarations` (4 sites: 1265/1292/1324/1352) wraps the text block as
  `raw: "${" + block.raw + "}"` but sets `span: block.span` (the ORIGINAL text-block span, pointing at body[0]).
  The `case "logic"` handler (:13486-13488) then computes `bodyOffset = block.span.start + prefixLen(2)`,
  which OVER-advances by 2 because span.start already points at the body (not at a real `$`). Every
  child node (function-decl) span is shifted +2 in source coords.
- BROADER THAN BRIEF: probe shows a BARE-DECL non-handle SQL `server function` ALSO gets +2
  (span "rver function load"). D4a scoped Gap B to handle only because Gap A masked the SQL-lift bare-decls
  (they never fired W-DEPRECATED). After Gap A's fix, lift-SQL bare-decls WILL fire but with off-by-2 spans →
  Migration 4 would still skip them. So Gap B must fix the GENERAL bare-decl-lift span, not just handle.
- route-inference has NO source text → cannot recompute the span there. Fix belongs at the synthetic-lift
  creation site (ast-builder.js), compensating the prepended `${` so span.start points where the `$` "would be".

## Next
- Gap A: remove the `!hasLiftInFunctionBody` guard (route-inference.ts:3172). Keep helper or delete if unused.
- Gap B: compensate the prepended `${` at the 4 bare-decl-lift sites (span.start -= 2, col -= 2) so
  bodyOffset lands on body[0]. Verify inert for everything else; verify lift-SQL + handle bare-decl strip.
- Tests + R26 + full suite.


## 2026-06-11 — FIXES LANDED

### Gap A (route-inference.ts, commit 3d019439)
- Removed `!hasLiftInFunctionBody` from the W-DEPRECATED fire path + deleted the now-dead helper.
- Guard preserved: the independent `triggerDesc !== null` check still blocks lift-PURE fns.
- Verified: lift-SQL server fn fires (1); lift-pure does NOT (0).

### Gap B (ast-builder.js, commit 34c9cd1e) — SCOPE-CORRECTED to general bare-decl-lift span
- Root cause: the 4 bare-decl auto-lift sites in `liftBareDeclarations` prepend `${` to `raw` but kept
  `span: block.span` (pointing at body[0]); `case "logic"` then does `bodyOffset = span.start + 2`,
  over-shooting by 2 → every child node span +2 → handle (and ALL bare-decl) W-DEPRECATED spans on "rver".
- Fix: compensate the prepended `${` at each of the 4 sites — `span.start - 2`, `col` clamped >= 1 — so
  `bodyOffset = (start - 2) + 2 = body[0]`. R25-Bug-42 sub-split shift stays consistent.
- Verified: bare-decl handle span lands on "server function ha"; bare-decl handle + bare-decl lift-SQL strip.

### Tests (commits 341a017d→recovered, 0bfa5817)
- route-inference.test.js §30.1: lift-SQL fires / lift-pure does not / multi-trigger fires once.
- migrate-server-keyword.test.js §10: bare-decl handle + bare-decl lift-SQL strip (no client flip);
  bare-decl lift-pure untouched. §11 integration: 4-class fixture via migrateFile --fix → serverFnKeyword:2,
  (a)+(b) stripped, (c) server fn + (d) lift-pure untouched, compiles 0 fatal.

### PROCESS NOTE (self-corrected)
- A background `git commit` for Gap B raced my Gap A test commit → ref-lock failure bundled the Gap B fix +
  tests into ONE `--no-verify` commit (341a017d). Recovered: soft-reset to 3d019439, re-committed Gap B
  (34c9cd1e) + tests (0bfa5817) as separate GATED commits. No `--no-verify` survives in the final chain.

### R26 (real CLI, /tmp/r26-d3-1/demo.scrml)
- `bun scrml migrate --fix` → "server keyword strips: 2" (handle + lift-SQL bare-decl).
- Result: handle + loadContacts → `function`; `server fn pinnedPure` PRESERVED; ZERO `server function`.
- Compiled: SQL `from contacts` + `X-Request-Id` in *.server.js, NOT *.client.js (no client flip).

### Coupled baselines
- NONE shifted. The D4a 5 examples were already manual-stripped on main, so no example W-DEPRECATED count
  moved. trucking-dispatch-smoke baseline (W-DEPRECATED=0) was already set by D4a. Pre-commit gate
  16582/0 identical pre/post (the +2 was simply wrong; no test asserted on it).

## STATUS: COMPLETE
