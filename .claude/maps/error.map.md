# error.map.md
# project: scrmlTS
# updated: 2026-05-06T23:50:00Z  commit: 7334fb0

## Error Code System

The compiler does NOT define error codes as JS classes — it uses a flat string-code-based diagnostic system. Codes are emitted as part of diagnostic objects shaped roughly as `{ code: "E-XYZ-NNN" | "W-XYZ-NNN", message, span, ... }`.

A grep over `compiler/src/**` for `E-[A-Z][A-Z0-9-]+` yields **~233 unique error codes** and **~42 unique warning codes**. The full normative catalog lives in **SPEC §34 (Error Codes)** plus per-section error subsections (e.g. §49.9, §53.11, §51.x). For any specific code's authoritative semantics, grep SPEC.md first.

## Custom Error Types (JS-level)
The compiler throws plain `Error` instances with the diagnostic code embedded in the message; very few custom `class ... extends Error` exist. No structured exception hierarchy.

## Error Code Families (representative — not exhaustive)

E-ATTR-*           — attribute validation (allowlist, interpolation, boolean/typed).
E-AUTH-*           — auth-related compile errors.
E-BATCH-*          — batch-planner violations.
E-BPP-*            — body-pre-parser failures (legacy; some shifted to TAB after S58 reorg).
E-BS-*             — block-splitter failures.
E-CG-*             — codegen failures.
E-CELL-*           — render-spec / cell shape errors (`E-CELL-NO-RENDER-SPEC`, `E-CELL-RENDER-SPEC-NOT-BINDABLE`).
E-DERIVED-*        — derived-cell errors; **E-DERIVED-VALUE-MUTATE** locked at S59 (Stage 0b+ L21 lock).
E-NAME-*           — name resolution errors; **E-NAME-COLLIDES-STATE** introduced S64 (Phase A1b/B2 first lock-firing step).
E-SQL-*            — SQL-context errors (e.g. `E-SQL-005` — URI/dialect mismatch from `db-driver.ts` S40).
E-SQL-001          — SQL bracket-matched failure.
E-STATE-*          — state-machine purity / transition errors; `E-STATE-TRANSITION-ILLEGAL` (S33), `E-STATE-TERMINAL-MUTATION` (S33).
E-SWITCH-FORBIDDEN — A+ verdict #1 lint (S65) — switch statement forbidden in pure contexts.
E-CANDIDATE        — generic candidate diagnostic.

## Warning Code Families

W-ASSIGN-001                       — assignment lint.
W-ATTR-001 / W-ATTR-002            — attribute lints.
W-AUTH-001                         — auth lint.
W-BATCH-001                        — batch-planner lint.
W-CASE-001                         — case lint.
W-CG-001                           — codegen lint.
W-COMPONENT-001                    — component lint.
W-DEPLOY-001                       — deployment hint.
W-DEPRECATED-001 / W-DEPRECATED    — deprecation warnings.
W-DERIVED-001                      — derived-cell warning.
W-EQ-001                           — equality lint (gauntlet-phase3-eq-checks.js).
W-LIFECYCLE-002 / W-LIFECYCLE-007  — lifecycle warnings.
W-LIFECYCLE-CANDIDATE              — A+ verdict #2 lint (S65) — lifecycle-candidate flag tightening.
W-LINT-001 … W-LINT-015            — generic lint catalog (15 slots populated; W-LINT-NNN is template).
W-MATCH-001 / W-MATCH-003          — match-expression lints.
W-MATCH-TRANSITIONS-ACCRUING       — state-machine match warning.
W-PROGRAM-001 / W-PROGRAM-TITLE-NESTED — `<program>` block lints.
W-PURE-REDUNDANT                   — pure annotation lint (§48).
W-SCHEMA-002                       — schema lint.
W-TAILWIND-001                     — Tailwind utility-class lint.
W-WHITESPACE-001                   — whitespace lint.

## Error Handling Patterns

- Diagnostic objects collected per-pass and surfaced from `api.js` as `result.diagnostics` (no exceptions for user-facing errors).
- `throw new Error(...)` is reserved for compiler-internal invariant violations / programmer errors.
- VP-1 (validator-1) post-CE: `compiler/src/validators/post-ce-invariant.ts` enforces post-component-expansion shape invariants.
- W-1 lint pass: `compiler/src/lint-ghost-patterns.js` (ghost-pattern detection).
- Gauntlet phase checks: `gauntlet-phase1-checks.js` + `gauntlet-phase3-eq-checks.js`.
- LSP surfaces same diagnostic shape as `Diagnostic` objects to the editor.

## Global Error Boundaries
None — the compiler is a pure pipeline that returns diagnostics to the caller. The CLI prints diagnostics and exits non-zero on `severity === "error"`.

## Recent Error-Code Activity (S40 → S65)
- **S58–S59 (Stage 0b+ L21 lock):** E-DERIVED-VALUE-MUTATE landed (commit `1217b41`).
- **S64 (Phase A1b B2):** E-NAME-COLLIDES-STATE landed (commit `0dee2f7`) — first lock-firing step in A1b. Two-pass design within `symbol-table.ts`.
- **S64 (Stage 0c.A):** function-overload deletion + E-FUNCTION-OVERLOAD removed.
- **S65 (A+ verdict):** E-SWITCH-FORBIDDEN + W-LIFECYCLE-CANDIDATE tightening landed (commit `b661c0b`).
- **S40 (Phase 2 Bun.SQL):** E-SQL-005 (URI/dialect mismatch) added in `db-driver.ts`.

## Open Follow-Ups
- **GITI-006 (low-priority, S34→S65 carry-forward):** markup `${@var.path}` emits a module-top bare read that throws on async-initialized reactives.
- ComponentDefNode classifier bug at `ast-builder.js:3634` (S29-flagged): classifies any uppercase-named `const/let` as component-def regardless of RHS. Fix requires flipping `tab.test.js:649-654` and updating self-host modules. Still present at S65.

## Tags
#scrmlTS #map #error #diagnostics #spec-section-34 #l21 #s65 #a-plus-verdict

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [SPEC.md §34](../../compiler/SPEC.md)
- [master-list.md](../../master-list.md)
