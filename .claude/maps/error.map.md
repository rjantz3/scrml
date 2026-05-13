# error.map.md
# project: scrmlts
# updated: 2026-05-12T21:42:04Z  commit: f1555b4

## Error Code System

Errors are structured `CGError` instances (compiler/src/codegen/errors.ts). Runtime errors extend `_ScrmlError` (runtime-template.js). Codes follow the pattern `E-DOMAIN-NNN` or `W-DOMAIN-NNN` (warnings) or `I-DOMAIN-NNN` (info). Authoritative catalog: SPEC.md §34.

## CGError Type  [compiler/src/codegen/errors.ts:11]

```typescript
class CGError {
  code: string
  message: string
  span: CGSpan | object
  severity: 'error' | 'warning'  // default: 'error'
}
```

## Runtime Error Classes  [compiler/src/runtime-template.js:1249+]

All extend `_ScrmlError extends Error`.

| Class | When thrown |
|-------|-------------|
| _ScrmlError | Base class; never thrown directly |
| NetworkError | HTTP/network failures from server functions |
| ValidationError | Validator predicate failures |
| SQLError | Database query failures |
| AuthError | Authentication/authorization failures |
| TimeoutError | `<onTimeout>` and `<onIdle>` expiry |
| ParseError | Response parsing failures |
| NotFoundError | 404-equivalent resource absence |
| ConflictError | 409-equivalent resource conflict |

## Compiler Error Code Families (source-confirmed)

| Family | Example Codes | Domain |
|--------|--------------|--------|
| E-ATTR-* | 001, 002, 010, 011, 013 | Attribute validation (UVB/VP) |
| E-AUTH-* | 002, 003, 004, 005 | Auth configuration errors |
| E-BATCH-* | 001, 002 | Batch planner (Stage 7.5) |
| E-BPP-* | 001 | Body pre-parser (compat shim) |
| E-BS-* | 000 | Block splitter (Stage 2) |
| E-CG-* | 001, 002, 003, 006, 010, 014, 015 | Codegen (Stage 8); includes SQL-to-client leak (E-CG-006) |
| E-CHANNEL-* | 001, 004, 005, 007, 008 | Channel declaration/usage |
| E-CHANNEL-OUTSIDE-PROGRAM | §38.1 | **NEW S87 Insight 30** — `<channel>` sits outside `<program>` in a file that also has a `<program>`; module-file dispensation for PURE-CHANNEL-FILE shape (replaces retired E-CHANNEL-INSIDE-PROGRAM) |
| E-CHANNEL-INSIDE-PAGE | §38.1 | **NEW S87** — `<channel>` inside `<page>`; channels must live directly inside `<program>` |
| E-CHANNEL-INSIDE-PROGRAM | §38.1 | **RETIRED S87 v0.3** — the pre-v0.3 "channel inside program" violation; direction REVERSED |
| E-COMPONENT-* | 010–035 | Component expansion/definition |
| E-CONTRACT-* | 001–004 | Pipeline contract violations |
| E-CTRL-* | 001–005, 011 | Control flow errors |
| E-CTX-* | 001–003 | Context violations |
| E-DEPRECATED-* | 001 | Deprecated syntax use |
| E-DG-* | 001, 002 | Dependency graph (Stage 7) |
| E-ENGINE-* | 001, 003, 004, 005, 010, 013 | Engine declaration/transition; E-ENGINE-001-RT is the runtime guard |
| E-ENGINE-INVALID-TRANSITION | §51.0.F, §51.0.G | Direct write violating rule= contract; **v0.3 Option-d carve-out:** self-writes are NO-OPS, not violations — see §51.0.F.1 |
| E-ERROR-* | 008 | Error handling surface |
| E-EXPORT-* | (see SPEC §34) | Export violations |
| E-IMPORT-* | 007 | Import violations |
| E-LIFECYCLE-* | 015 | Lifecycle event errors |
| E-LIFT-* | 001 | Concurrent lift detection (DG) |
| E-LOOP-* | 005, 006, 007 | Loop/for-expression errors |
| E-META-EVAL-* | 002 | Meta-eval errors |
| E-MONOTONE-* | (see SPEC §34) | Monotonicity analyzer |
| E-PAGE-INVALID-ATTR | §4.15 | **NEW S86** — `<page>` attribute outside allowed set |
| E-PAGE-ROUTE-ATTR-FORBIDDEN | §4.15 | **NEW S86** — `route=` specifically forbidden on `<page>` |
| E-PARSE-* | (see SPEC §34) | Parse-time errors |
| E-PARSEVARIANT-* | 001 | Variant parsing failures |
| E-REPLAY-* | 001-RT | Runtime: replay index errors |
| E-SQL-* | (see SPEC §34) | SQL validation errors |
| E-SYNTAX-* | 042, 043, 044, 050 | Syntax violations |
| E-TAILWIND-* | 001 | Tailwind class validation |
| E-TEST-* | 001–006 | Test block violations (§19.13) |
| E-TILDE-* | 001, 002 | Tilde-decl must-use violations |
| E-TIMEOUT-* | 001, 002 | Timeout configuration errors |
| E-TYPE-* | 001, 004, 006, 020–081 | Type system errors (Stage 6 TS) |
| E-USE-* | 001, 002, 005 | Usage analysis errors |
| E-WHITESPACE-* | 001 | Whitespace violations |
| W-CG-* | 001 | Codegen warnings (SQL/server-context suppressed from client) |
| W-ENGINE-SELF-WRITE-DETECTED | §51.0.F.1 | **NEW S87 Option (d) synthesis** — info-level lint: engine self-write (`@var = .CurrentVariant` or `.advance(.CurrentVariant)`) detected; self-write is a runtime NO-OP per §51.0.F.1. Two fire-sites: PASS 16 (inside-state-child) at `symbol-table.ts:7259`; PASS 12.B `walkEngineSelfWriteOutside` at `symbol-table.ts:5567`. Joins `W-PROGRAM-SPA-INFERRED` / `I-MATCH-PROMOTABLE` / `D-BATCH-001` family. |
| W-PROGRAM-REDUNDANT-LOGIC | §4.14 | **NEW S86** — `<program>`/`<page>` body wraps top-level decls in redundant `${...}` block (only fires when content is all-decls) |
| W-PROGRAM-SPA-INFERRED | (see SPEC §34) | SPA inferred from program attributes |
| W-DEAD-FUNCTION | (see SPEC §34) | Function never called from markup or server surface |

## LIFT-template Codegen Bug Families (OPEN — HIGH-PRIORITY for v0.3.0)

These 5 bug families were SURFACED in S87 (anchor tests in lift-li-text-template.test.js + todomvc-fixture-edit-mode.test.js) but NOT YET FIXED. They block canonical TodoMVC edit-mode and "per-item interactive markup inside for/lift" patterns.

| ID | Description | Anchor test |
|----|-------------|-------------|
| LIFT-1 (CATASTROPHIC) | `class:NAME=(parens-expr)` inside lift template ELIDES parent element + duplicates inner text | todomvc-fixture-edit-mode.test.js §B.1 |
| LIFT-2/3/4 BUNDLE | `bind:value=@var` / `if=@expr` / `onkeydown=fn()` inside lift template fall back to literal `setAttribute` — no reactive wiring | todomvc-fixture-edit-mode.test.js §B.2/3/4 |
| LIFT-5 | `if (cond) { lift <li>... }` inside `for (let item of @items)` — reconciler-factory `_scrml_lift_target` ambient state gap; probable runtime breakage | progress.md in v0.3-todomvc-e2e-reverify |

Root module: `compiler/src/codegen/emit-lift.js`. Recommended 3-dispatch decomposition for S88.

## Error Handling Patterns

| Pattern | Where used |
|---------|------------|
| `errors.push(new CGError(...))` | Accumulated during pipeline stages; surfaced at CLI output |
| `throw new Error("E-ENGINE-001-RT: ...")` | Runtime guard in compiled output — illegal state transition |
| `throw new Error("E-REPLAY-001-RT: ...")` | Runtime guard in compiled output — replay index out of bounds |
| `try/catch` in pipeline orchestration | api.js wraps each stage; errors collected, not re-thrown |
| `!{}` error-effect blocks | Compiled user error handlers (pattern-matched on error type) |

## Global Error Boundaries

| Name | File | Scope |
|------|------|-------|
| CGError accumulator | codegen/index.ts → api.js | Per-file compilation errors; returned to caller |
| _scrml_error_boundary | runtime-template.js | Per-server-function HTTP handler; catches and serializes errors |
| `!{}` arm dispatch | emit-html.ts + emit-event-wiring.ts | User-authored match-on-error reactive blocks |

## Diagnostic Walkers (Post-TAB)

| File | What it checks |
|------|----------------|
| compiler/src/gauntlet-phase1-checks.js (~416 LOC) | Post-TAB diagnostics for Stage 1 issues |
| compiler/src/gauntlet-phase3-eq-checks.js (~810 LOC) | Post-TAB equality and Phase 3 semantic checks |
| compiler/src/lint-ghost-patterns.js (~492 LOC) | Pre-Stage-2 lint for ghost/phantom patterns |
| compiler/src/lint-i-match-promotable.js | Lint for promotable i-match patterns |
| compiler/src/validators/ast-walk.ts | **NEW S87** — shared read-only walker; channel placement pre-check for §38.1 (E-CHANNEL-OUTSIDE-PROGRAM) |
| compiler/src/symbol-table.ts PASS 12.B | `walkEngineSelfWriteOutside` — fires W-ENGINE-SELF-WRITE-DETECTED for outside-state-child self-writes |
| compiler/src/symbol-table.ts PASS 16 | Inside-state-child W-ENGINE-SELF-WRITE-DETECTED fire-site #10 |

## Tags
#scrmlts #map #error #diagnostics #runtime-errors #error-codes #s87 #lift-bugs #engine-self-write #channel-dispensation

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [domain.map.md](./domain.map.md)
