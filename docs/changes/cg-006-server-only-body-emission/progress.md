# cg-006 server-only body emission — progress log

## 2026-05-14 Phase 0 scoping complete

- Reproduced E-CG-006 firing on examples/23-trucking-dispatch/app.scrml (offending line: `_scrml_getCurrentUser_8` body contains `_scrml_sql\`SELECT ...\``).
- Built minimal reproducer at /tmp/scrml-cg006-debug/test.scrml: function with body `return ?{...}.get()` inside `<db>` block at file scope. No caller. Result: W-DEAD-FUNCTION fires (correct) AND function body lands in client.js (BUG — should never).

## Root cause analysis

Three independent failures combine:

1. **route-inference.ts `walkBodyForTriggers`** — does NOT explicitly handle `return-stmt` shape. When AST builder produces `return ?{...}.method()`, it constructs `kind: "return-stmt"` with `expr: ""` and `sqlNode: <sql>` (ast-builder.js:4755-4773). visitNode (route-inference.ts:601-799) has explicit handlers for `sql` (lines 605-612), `bare-expr`, `let-decl`/`const-decl`/`tilde-decl`, `state-decl`, `function-decl`. NO explicit `return-stmt` handler. The generic "recurse into array fields" fallback (lines 789-798) does NOT see `sqlNode` (it's an object, not an array). Result: no server-only-resource trigger added → function never gets `route.boundary === "server"`.

2. **emit-logic.ts case "return-stmt"** (lines 1944-1995) — when `node.sqlNode && node.sqlNode.kind === "sql"`, unconditionally recurses into `emitLogicNode(node.sqlNode, opts)` and emits the result as `return <sql>;` — regardless of `opts.boundary`. Compare to the parallel let-decl path (line 1333) which DOES gate on `opts.boundary === "server"`, and to state-decl (line 1807) which also gates on `opts.boundary === "server"`. Inconsistent.

3. **collect.ts `isServerOnlyNode`** (lines 405-438) — does NOT detect `return-stmt` with structured `sqlNode`. Checks for SQL_SIGIL_PATTERN in `expr` (which is `""` because the AST builder stores SQL only on `sqlNode`). Mirror of the let-decl/state-decl issue. So even Step 3 of emit-functions.ts (client-boundary body emission) doesn't filter the return-stmt out.

## Fix plan

- **Layer 1 (primary): route-inference** — add explicit `return-stmt` handler in visitNode that detects `sqlNode` and pushes a `server-only-resource` trigger. Also `throw-stmt` for symmetry. Also `lift-expr` (rare but possible: `lift ?{...}` in a function body).
- **Layer 2 (defense-in-depth): emit-logic case "return-stmt"** — gate sqlNode emission on `opts.boundary === "server"`. On client boundary, emit a defensive `return null; /* SQL — client cannot evaluate _scrml_sql (E-CG-006) */` comment.
- **Layer 3 (defense-in-depth): collect.ts isServerOnlyNode** — add `return-stmt`/`throw-stmt`/`lift-expr` with `sqlNode` to the server-only detection.

This still preserves E-CG-006 as the final guard — never weakened.

## 2026-05-14 Phase 1 — fix Layer 1 (RI walkBodyForTriggers) COMPLETED

Commit c24023b — route-inference.ts:782-861. Added explicit return-stmt /
throw-stmt / lift-expr handlers in visitNode. Detects sqlNode attachment +
walks expr/exprNode string for SQL/Bun/env() patterns + namespace refs +
protected-field access + callees.

Verified on /tmp/scrml-cg006-debug/test.scrml: getUser now classified
server-bound; client.js emits fetch stub; server.js carries SQL body.

## 2026-05-14 Phase 1 — fix Layer 2 (emit-logic case "return-stmt") COMPLETED

Commit c32b7a5 — emit-logic.ts:1970-2000. Gates sqlNode emission on
opts.boundary === "server". Server-side: emits SQL expression wrapped as
return statement (existing behavior). Client-side: emits defensive
`return null; // SQL — client cannot evaluate _scrml_sql (E-CG-006); …`
comment so JS parses + diagnostic visible at inspection. Mirrors the
let-decl path at line ~1333 + state-decl path at line ~1807.

## 2026-05-14 Phase 1 — fix Layer 3 (collect.ts isServerOnlyNode) COMPLETED

Commit 73277ea — collect.ts:438-471. Added return-stmt / throw-stmt /
lift-expr branches to isServerOnlyNode. Defense-in-depth for client-
emission filters in scheduling.ts, emit-functions.ts, emit-library.ts,
emit-reactive-wiring.ts.

NOTE: state-decl with sqlNode is INTENTIONALLY NOT included — top-level
`@x = ?{...}` is legitimately handled by emit-logic.ts case "state-decl"
line ~1844 as a client-boundary stub (`// SQL-init for @<name>` comment).
Treating it as server-only suppresses that defensive emission and emits
W-CG-001 instead (caught by failing test reactive-decl-sql-chained-call
§11). Recipe respects existing client-side stub semantics for state-decl
while closing the return-stmt path.

## 2026-05-14 Phase 2 — integration regression test COMPLETED

Commit 3b973b5 — compiler/tests/integration/cg-006-server-only-body-leak-regression.test.js
+ 3 tests, all PASS:
  1. `return ?{...}.get()` in <db> body — reproduces the trucking-dispatch
     getCurrentUser shape. Asserts no E-CG-006, no _scrml_sql leak in
     client.js, fetch stub emitted, SQL body on server.
  2. `return ?{...}.all()` (list shape) — parallel `.all()` chain coverage.
  3. E-CG-006 fail-safe sanity — asserts SQL_LEAK_PATTERNS still wired in
     emit-client.ts (the guard caught a real bug; never weaken).

## 2026-05-14 Phase 3 — 23-trucking-dispatch verify COMPLETED

`bun compiler/src/cli.js compile examples/23-trucking-dispatch/app.scrml`
no longer fires E-CG-006. The pre-existing I-AUTH-REDIRECT-UNRESOLVED for
/login is preserved as-is (per brief: separate pre-existing issue).

`grep _scrml_sql examples/23-trucking-dispatch/dist/app.client.js` → empty.

## 2026-05-14 Phase 4 — SPEC consistency review COMPLETED, no amendment needed

SPEC §12.2 Trigger 1 already states: "The function accesses a resource not
accessible from the client (e.g., a file-system-only database via Bun
SQLite)." SPEC §12.5.2 even shows the exact `return ?{...}.get()` pattern
as canonical server-function shape. The spec is correct; the compiler was
buggy in not detecting return-stmt's sqlNode as a Trigger-1 resource access.
This is a compiler implementation fix, not a normative behavior change.

## Pre-commit gate verification

`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail`
→ 11936 pass / 88 skip / 1 todo / 0 fail (12025 across 608 files)

`bun test` (full suite):
→ 12697 pass / 117 skip / 1 todo / 0 fail (12815 across 639 files)
  (S92 baseline 12694 → S93 12697 = +3 from new regression test)

## Final status

FIX COMPLETE — all 4 phases closed. 3 layered fixes committed (RI + emit-
logic + collect), 1 integration test (3 cases), trucking-dispatch verified
clean of E-CG-006, SPEC review confirms no amendment needed.

