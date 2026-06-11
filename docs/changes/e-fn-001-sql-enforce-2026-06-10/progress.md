# Progress — e-fn-001-sql-enforce-2026-06-10

## Startup (2026-06-10)
- WORKTREE_ROOT verified: starts with .claude/worktrees/agent-, toplevel matches, tree clean.
- bun install OK. bun run pretest OK (13 samples).
- Baseline `bun test compiler/tests/`: 23757 pass / 220 skip / 1 todo / 0 fail (a prior interactive run showed 2 flaky fails from /tmp promotion+ddl tests; deterministic separated-stream run = 0 fail). Recording 0 deterministic fails as baseline.

## Next
- Phase 0 survey: confirm E-FN-001 silent on fn+?{}, E-FN-003/004 fire, pin mechanism.

## Phase 0 — survey COMPLETE (mechanism PINNED; brief hypothesis CORRECTED)
- CONFIRMED bug: `export fn loadIds() -> int[] { return ?{...}.all() }` compiles CLEAN, no E-FN-001.
- CONFIRMED narrow scope: E-FN-003 (state mutation) + E-FN-004 (Date.now) both FIRE in a `fn`.
- MECHANISM (corrects brief's RI-escalation hypothesis):
  - The gate `n.fnKind === "fn"` at type-system.ts:7571 DOES run; debug shows fnKind="fn", checkFnBodyProhibitions IS invoked for loadIds. RI does NOT mutate fnKind.
  - REAL cause: `return ?{...}.all()` parses the SQL into `return-stmt.sqlNode` (structured), and `return-stmt.expr` is "" (raw text stripped). The walker's three E-FN-001 detectors all MISS this shape:
    (1) AST check fires only on `stmt.kind === "sql"` (a top-level SQL statement) — here SQL is NESTED as return-stmt.sqlNode.
    (2) The structured-sqlNode check at :17407 covers ONLY `let-decl`/`const-decl` (not return-stmt).
    (3) The text-heuristic `/\?\{/.test(nodeText(stmt))` misses because nodeText returns expr="" (empty).
  - PROOF: `let rows = ?{...}.all()` in a `fn` DOES fire E-FN-001 (handled by the let/const sqlNode branch). Only the `return ?{...}` shape evades.
- Fix B symptom CONFIRMED: `export function loadTickets() { return ?{}.all() }` wrongly gets I-FN-PROMOTABLE. SAME root cause — the lint's probe re-runs checkFnBodyProhibitions, which also misses return-stmt+sqlNode, so sink stays empty. Fix A (return-stmt sqlNode → E-FN-001) ALSO fixes the probe path for SQL. Fix B's routeMap skip is belt-and-suspenders for NON-SQL inferred-server triggers (Bun.*/file-IO) the purity walker never checks.

## Next
- Phase 1 Fix A: add return-stmt+sqlNode detection to checkFnBodyProhibitions E-FN-001.

## Phase 1 — Fix A LANDED (8fb91a9f)
- type-system.ts `checkFnBodyProhibitions`: broadened the structured-sqlNode E-FN-001 check from kind-gated (`let-decl`/`const-decl`) to KIND-AGNOSTIC — fires on ANY statement carrying `sqlNode.kind === "sql"`. Covers `return ?{}.all()` (the uncovered shape), `let x = ?{}`, `const x = ?{}`, and any future sqlNode-stamping statement.
- Verified: fn+return-?{} → E-FN-001 (was silent); fn+let-?{} → E-FN-001 (no regression); CONTROL function+return-?{} → clean (correctly server-escalated, no E-FN-001), AND I-FN-PROMOTABLE no longer fires on it (probe now sees the E-FN-001).

## Phase 2 — Fix B LANDED (c2bf110a)
- lint-i-fn-promotable.js: `runIFnPromotable` + `isStructurallyEligible` gained an `inferredServerKeys` Set<`filePath::span.start`> param; skip a candidate if its key is in the RI server-boundary set (subsumes both body-content escalation AND explicit `server` keyword). Key shape mirrors route-inference `makeFunctionNodeId`.
- api.js Stage 6.4b: builds the set from `riResult.routeMap.functions` (boundary === "server") and threads it in.
- Verified key alignment empirically (RI key `func_sql.scrml::177 [server-only-resource]` == lint candidate key, isServer=false confirming the keyword-vs-inference blind spot).
- Load-bearing proof Fix B ≠ redundant-with-A: (B3) `function readLines` importing `scrml:fs` (RI server-only-resource escalation, NOT an E-FN purity violation) is now suppressed — the probe-only path (Fix A) could NOT catch this since fs-import is not an E-FN code.
- (B2) genuinely-pure `function double(n) { return n*2 }` STILL gets I-FN-PROMOTABLE (no over-suppression).

## Next
- Phase 3 SPEC (§48.3.1 note + §56.9.1 skip-list), Phase 4 unit tests, Phase 5 empirical.

## Phase 3 — SPEC LANDED (bde59d64)
- §48.3.1: added normative note "E-FN-001 fires regardless of route-inference server-escalation" + named the three sqlNode-attaching placements (`let`/`const`/`return`); cross-ref §33.3.
- §56.9.1: added the inferred-server skip-list bullet (RI body-content escalation, structural counterpart to the E-FN-001 probe; the non-SQL-only case).
- §34 I-FN-PROMOTABLE catalog row: skip-list sentence extended with inferred-server.
- SPEC-INDEX regenerated via scripts/regen-spec-index.ts (12 §48+ range rows updated; range-only diff, no semantic change).

## Phase 4 — TESTS LANDED (6ace14f9)
- NEW compiler/tests/unit/fn-sql-return-enforce.test.js — 7 e2e (compileScrml/real-parser) cases: A1 fn+return-?{}→E-FN-001; A2 fn+let-?{}→E-FN-001 (no regress); A3 control function+return-?{}→no E-FN-001; A4 fn+state-mutation→E-FN-003 (no regress); B1 function+SQL→no I-FN-PROMOTABLE; B2 function+scrml:fs→no I-FN-PROMOTABLE (Fix-B-only); B3 pure function→I-FN-PROMOTABLE still fires (no over-suppress). 7 pass / 0 fail.

## Phase 5 — EMPIRICAL (mandatory; all 3 PASS)
- (1) `export fn loadIds() -> int[] { return ?{`SELECT id FROM users`}.all() }` → `error [E-FN-001]: ... fn loadIds body contains a ?{} SQL access ...` / FAILED — 1 error.
- (2) `export function loadTickets()/loadIds() -> int[] { return ?{...}.all() }` → `Compiled 1 file` (clean), NO E-FN-001, NO I-FN-PROMOTABLE.
- (3) `export function double(n: int) -> int { return n * 2 }` → `lint [I-FN-PROMOTABLE]: ... function double body meets the fn body constraints ...` / Compiled (still fires, no over-suppression).
