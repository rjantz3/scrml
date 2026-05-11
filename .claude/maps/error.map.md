# error.map.md
# project: scrmlts
# updated: 2026-05-10T19:30:00Z  commit: f182f44

## Error Code System

Errors are structured `CGError` instances (compiler/src/codegen/errors.ts). Runtime errors extend `_ScrmlError` (runtime-template.js). Codes follow the pattern `E-DOMAIN-NNN` or `W-DOMAIN-NNN` (warnings). Authoritative catalog: SPEC.md §34.

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
| E-COMPONENT-* | 010–035 | Component expansion/definition |
| E-CONTRACT-* | 001–004 | Pipeline contract violations |
| E-CTRL-* | 001–005, 011 | Control flow errors |
| E-CTX-* | 001–003 | Context violations |
| E-DEPRECATED-* | 001 | Deprecated syntax use |
| E-DG-* | 001, 002 | Dependency graph (Stage 7) |
| E-ENGINE-* | 001, 003, 004, 005, 010, 013 | Engine declaration/transition; E-ENGINE-001-RT is the runtime guard |
| E-ERROR-* | 008 | Error handling surface |
| E-EXPORT-* | (see SPEC §34) | Export violations |
| E-IMPORT-* | 007 | Import violations |
| E-LIFECYCLE-* | 015 | Lifecycle event errors |
| E-LIFT-* | 001 | Concurrent lift detection (DG) |
| E-LOOP-* | 005, 006, 007 | Loop/for-expression errors |
| E-META-EVAL-* | 002 | Meta-eval errors |
| E-MONOTONE-* | (see SPEC §34) | Monotonicity analyzer |
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

## Tags
#scrmlts #map #error #diagnostics #runtime-errors #error-codes

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [domain.map.md](./domain.map.md)
