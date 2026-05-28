# R25-Bug-42 progress — CLOSED

## Phase 0 diagnosis

### Root cause (THREE coupled bugs surfaced under one symptom)

**Brief hypothesis was wrong.** Brief said "server function* misclassified as client context — fix server-context classification." Empirical investigation found three distinct root causes upstream of the alleged classification:

**(a) `BARE_DECL_RE` regex gate at ast-builder.js:392 — `function*` / `fn*` missed the lift.**
- Pre-fix regex: `(server\s+(?:fn|function)\s|...|fn\s+\w|function\s+\w|...)`
- The `\s` after function/fn rejected the `*` of `function*`/`fn*` at top-level.
- `server function* watchActivity()` at `<program>` direct-child position was NOT lifted into a synthetic `${...}` logic block — it stayed as raw markup-text, never parsed as `function-decl`, no server.js handler synthesized.

**(b) Synthetic-logic-block child blocks empty at liftBareDeclarations:1248.**
- When BARE_DECL_RE matched (e.g. `server function getX()` — non-generator), the lift created `{type: "logic", raw: "${" + textRaw + "}", children: []}`.
- BS layer NEVER splits `?{...}` SQL blocks out of TOP-LEVEL text in `<program>` body (BS's brace-context push only fires inside markup/state/${} frames).
- So `?{...}` inside the synthesized logic block stayed as inline raw text. tokenizeLogic then emitted PUNCT `?` + PUNCT `{` + ... rather than a BLOCK_REF of type "sql".
- Downstream parseOneStatement → return-stmt handler (line ~5500) checks for `next.kind === "BLOCK_REF"` — saw PUNCT instead, fell through to collectExpr → safeParseExprToNode → escape-hatch → emit dumped raw tokens.

**(c) `yield` keyword had no parser handler + emit-control-flow.ts emitWhileStmt dropped boundary.**
- `yield ?{...}.all()` fell through to bare-expr; collectExpr halted at the BLOCK_REF; `yield` became a standalone bare-expr, `?{...}.all()` became a sibling SQL statement. Codegen: `yield;` + `await _scrml_sql\`...\`;` — generator emitted undefined per event, SQL value discarded.
- Even with a yield handler added, emit-control-flow.ts emitWhileStmt called `emitLogicBody(body, {declaredNames, insideFunctionBody})` — dropping `opts.boundary` on the loop boundary. Inside SSE generator `while(true)` body, the boundary fell back to undefined → client-mode `case "yield-stmt"` sqlNode arm emitted the defensive `yield null; // SQL — client cannot evaluate _scrml_sql` shape.
- Additionally `_makeExprCtx` (emit-logic.ts:486) hardcoded `mode: "client"` — `?{...${@cell}}` interpolation rewrote `@cell` via the client `_scrml_reactive_get` helper rather than the server `_scrml_body["cell"]` form.

## Phase 1 fix — landed commit `0637d2bd`

`compiler/src/ast-builder.js` (+70 / −3):
1. BARE_DECL_RE updated to admit `function*` / `fn*` via `[*\s]` character class.
2. `buildBlock` `case "logic"` adds synthetic-logic child recovery: when `block._synthetic === true` AND `children.length === 0` AND bodyRaw contains `[\$?#!\^~](?:=*\{)`, re-run `splitBlocks` on `"${" + bodyRaw + "}"`, take the inner logic's children, shift spans by `block.span.start`, and use them for `tokenizeLogic` + `parseLogicBody`.

## Phase 2 fix — landed commit `8dea77c6`

`compiler/src/ast-builder.js` (+115 / −0): yield-stmt parser handlers in BOTH parseOneStatement (line ~5546, mirrors return-stmt at ~5500) AND parseLogicBody main loop (line ~9279, mirrors return-stmt at ~9249). Each detects trailing SQL BLOCK_REF, consumes .method() chain, attaches structured sqlNode.

`compiler/src/codegen/emit-logic.ts` (+39 / −1): new `case "yield-stmt"` mirroring `case "return-stmt"` sqlNode branch — server-boundary recurses into `case "sql"`, client-boundary emits defensive `yield null;` + diagnostic comment (Layer 2 fail-safe). `_makeExprCtx` now honors `opts.boundary` for server-mode @cell rewriting.

`compiler/src/codegen/emit-control-flow.ts` (+15 / −8): emitWhileStmt + emitDoWhileStmt accept `opts.boundary` and thread to `emitLogicBody` and `EmitExprContext.mode`. Call sites in emit-logic.ts updated to pass `opts.boundary`.

## Phase 2.5 regression tests — landed commit `3eec0f29`

`compiler/tests/unit/server-fn-star-sql-r25-bug-42.test.js` — 12 tests, 29 expect() calls. All pass. Covers: minimal SSE repro, non-generator regression-guard, `${}`-wrap regression-guard, bound-param `${@cursor}`, multi-yield, .run/.get/.all chain shapes, mixed-yield, structure sanity (no `?{}`), bare yield, raw-PUNCT-leak guard, client.js `_scrml_sql` isolation, defensive client yield-null guard.

## Phase 3 verification

### Test suite

`bun test compiler/tests/{unit,integration,conformance} --bail`:
- BEFORE: 14895 pass / 0 fail / 87 skip / 1 todo
- AFTER:  14907 pass / 0 fail / 88 skip / 1 todo (+12 new from Bug 42 suite, +1 skip in browser baseline TBD)

ZERO regressions across the full pre-commit gate.

### R26 empirical verification (R25 dev gauntlet sources)

```
=== dev-1-react ===
  E-CG-006 count: 0     [was non-zero pre-fix]
  raw '? {' tokens: 1   [false-positive — ternary `?` matches; no SQL leak]
  _scrml_sql calls: 8   [SQL now lowered correctly]
=== dev-2-elixir ===
  E-CG-006 count: 0     [was non-zero pre-fix]
  raw '? {' tokens: 0   [CLEAN]
  _scrml_sql calls: 9   [SQL lowered]
=== dev-4-pascal ===
  E-CG-006 count: 0     [was non-zero pre-fix]
  raw '? {' tokens: 0   [CLEAN]
  _scrml_sql calls: 10  [SQL lowered]
```

`node --check` on all three server.js outputs: PASS (clean syntax).

dev-1 residual `? {` at line 100 is `? {...c, status: toStatus}` — a JS ternary expression inside a broadcast call, NOT a SQL block. False-positive in the metric, not an actual bug.

## Out-of-scope findings surfaced

- **SSE `@cell` server-side resolution semantics** — `_scrml_body["cursor"]` emission inside SSE generator is the correct server-mode form per current codegen, BUT GET SSE handlers don't have `_scrml_body` declared (only POST handlers do). For SSE specifically `@cell` should likely resolve to `route.query[...]` or a per-engine state binding per SPEC §37.7. Brief says SPEC changes out-of-scope; the post-fix codegen is consistent with non-SSE server-fn rewrite behavior; treat as separate SSE-codegen concern.
- **`function*` / `fn*` admitted but no comprehensive `function*` test coverage outside the SSE surface** — bare client `function*` is admitted per SPEC §13 generator carve-out (S114), but the defensive client-boundary yield-null guard is only minimally exercised by test 12. Sufficient for Bug 42; comprehensive generator coverage is a separate spec exercise.

## Cross-refs

- SPEC §13 `?{}` query expressions
- SPEC §37 SSE `server function*`
- SPEC §40.8 default-logic mode (`<program>` body bare-decl auto-lift)
- docs/known-gaps.md Bug 42 entry
- S136/S137 grep-driven-triage methodology (brief-hypothesis vs empirical) — Bug 42 follows the precedent: brief said "classification miss," empirical found three distinct upstream root causes.

## Commits

- `d98ec78a` WIP — Phase 0 findings
- `0637d2bd` Phase 1 — BARE_DECL_RE + synthetic-logic child recovery
- `8dea77c6` Phase 2 — yield-stmt parser + emit case + while/do-while boundary propagation + _makeExprCtx boundary-aware
- `3eec0f29` Phase 2.5 — 12 regression tests
