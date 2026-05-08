# error.map.md
# project: scrmlTS
# updated: 2026-05-07T20:30:00Z  commit: a4eed93

## Error Code System

The compiler does NOT define error codes as JS classes — it uses a flat string-code-based diagnostic system. Codes are emitted as part of diagnostic objects shaped roughly as `{ code: "E-XYZ-NNN" | "W-XYZ-NNN", message, span, ... }`.

A grep over `compiler/src/**` for `E-[A-Z][A-Z0-9-]+` yields **~233 unique error codes** and **~42 unique warning codes**. The full normative catalog lives in **SPEC §34 (Error Codes)** plus per-section error subsections (e.g. §49.9, §53.11, §51.x, §55.11). For any specific code's authoritative semantics, grep SPEC.md first.

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
E-DERIVED-*        — derived-cell errors:
                     `E-DERIVED-VALUE-MUTATE` — in-place mutation of derived cell; locked at S59 (L21). SYM PASS 6 (B8). Fires on array-mutating methods (§6.5.1), property assignment, compound-assignment, delete on derived cell.
                     `E-DERIVED-CIRCULAR-DEP` — circular dependency in derived-cell DAG (§6.6.10, §31.5). DG stage B7. Blocks codegen.
E-IMPORT-*         — import/module errors; includes S66 code:
                     `E-IMPORT-PINNED-INVALID` — `pinned` modifier on non-engine import (B4).
E-NAME-*           — name resolution errors; **E-NAME-COLLIDES-STATE** introduced S64 (Phase A1b/B2).
E-SQL-*            — SQL-context errors (e.g. `E-SQL-005` — URI/dialect mismatch from `db-driver.ts` S40).
E-SQL-001          — SQL bracket-matched failure.
E-STATE-*          — state-machine purity / transition errors; includes S66 code:
                     `E-STATE-PINNED-FORWARD-REF` — forward reference to `pinned` state cell or import binding (B4).
                     `E-STATE-TRANSITION-ILLEGAL` (S33), `E-STATE-TERMINAL-MUTATION` (S33).
E-SWITCH-FORBIDDEN — A+ verdict #1 lint (S65) — switch statement forbidden in pure contexts.
E-SYNTHESIZED-WRITE — assignment to auto-synthesized validity surface property (§6.11, §55.7); deferred to B11.
E-TYPE-031         — validator arg type mismatch family (§55.1 line 24295). SYM PASS 7 (B10). Four shapes:
                     (1) bareword-only predicate given arg; (2) predicate given too many args; (3) predicate given wrong arg type (relational vs expr); (4) arity mismatch (required arg count). Fired by `walkValidatorTypeCheck` in symbol-table.ts.
E-VALIDATOR-CIRCULAR-DEP — circular dependency in validator-dep graph (§55.11, §31.4, §34). DG stage B10 Phase 3. "Validator-dep graph is a DAG; cycles are forbidden" (§55.11).
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
W-DERIVED-001                      — derived-cell warning (§6.6.11 — derived with no `@variable` refs, never re-evaluates).
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

## Info Diagnostic Codes (S66 — not errors, not warnings)

I-MATCH-PROMOTABLE — info-level lint (§56). Three shapes:
  - `exhaustive` — all variants covered; `bun scrml promote --match` can auto-lift.
  - `near-miss`  — partial coverage; add missing arms first, then promote.
  - `compound`   — compound condition branches; needs manual restructuring.
  Emitted by `runIMatchPromotable` in `lint-i-match-promotable.js` (post-TS pass in api.js).
  Pairs with `bun scrml promote --match`.

## Error Handling Patterns

- Diagnostic objects collected per-pass and surfaced from `api.js` as `result.diagnostics` (no exceptions for user-facing errors).
- `throw new Error(...)` is reserved for compiler-internal invariant violations / programmer errors.
- VP-1 (validator-1) post-CE: `compiler/src/validators/post-ce-invariant.ts` enforces post-component-expansion shape invariants.
- W-1 lint pass: `compiler/src/lint-ghost-patterns.js` (ghost-pattern detection).
- Gauntlet phase checks: `gauntlet-phase1-checks.js` + `gauntlet-phase3-eq-checks.js`.
- I-MATCH-PROMOTABLE lint: `lint-i-match-promotable.js` (post-TS, info-only).
- LSP surfaces same diagnostic shape as `Diagnostic` objects to the editor.

## Global Error Boundaries
None — the compiler is a pure pipeline that returns diagnostics to the caller. The CLI prints diagnostics and exits non-zero on `severity === "error"`.

## Recent Error-Code Activity (S40 → S67)

- **S58–S59 (Stage 0b+ L21 lock):** E-DERIVED-VALUE-MUTATE concept locked (committed later in B8).
- **S64 (Phase A1b B2):** E-NAME-COLLIDES-STATE landed (commit `0dee2f7`) — first lock-firing step in A1b. Two-pass design within `symbol-table.ts`.
- **S64 (Stage 0c.A):** function-overload deletion + E-FUNCTION-OVERLOAD removed.
- **S65 (A+ verdict):** E-SWITCH-FORBIDDEN + W-LIFECYCLE-CANDIDATE tightening landed (commit `b661c0b`).
- **S65 (Tier A):** I-MATCH-PROMOTABLE info diagnostic introduced (§56).
- **S40 (Phase 2 Bun.SQL):** E-SQL-005 (URI/dialect mismatch) added in `db-driver.ts`.
- **S66 (A1b B4):** E-IMPORT-PINNED-INVALID + E-STATE-PINNED-FORWARD-REF landed (symbol-table.ts).
- **S66 (A1b B6):** E-CELL-NO-RENDER-SPEC + E-CELL-RENDER-SPEC-NOT-BINDABLE fired by render-by-tag classifier in symbol-table.ts PASS 5.
- **S67 (A1b B8):** E-DERIVED-VALUE-MUTATE SHIPPED in SYM PASS 6 (`symbol-table.ts`). Three forms: method-call, property-assignment/compound-assign, delete. Backed by `derived-mutation-ops.ts` (ARRAY_MUTATING_METHODS + COMPOUND_ASSIGNMENT_OPS + isDerivedMutatingAssignOp). Tests at `compiler/tests/unit/derived-value-mutate.test.js` (474 LOC).
- **S67 (A1b B7 via DG):** E-DERIVED-CIRCULAR-DEP SHIPPED in `dependency-graph.ts`. Covers 1-cycle (self-ref) and multi-node cycles via DFS. Blocks codegen per §6.6.10. Tests at `compiler/tests/unit/derived-circular-dep.test.js` (450 LOC).
- **S67 (A1b B10 Phase 2):** E-TYPE-031 family SHIPPED in SYM PASS 7 (`walkValidatorTypeCheck` in symbol-table.ts). Fires on arg-kind mismatches against UNIVERSAL_CORE_PREDICATES in `validator-catalog.ts`. Tests at `compiler/tests/unit/validator-type-check.test.js` (251 LOC).
- **S67 (A1b B10 Phase 3 via DG):** E-VALIDATOR-CIRCULAR-DEP SHIPPED in `dependency-graph.ts`. Covers 1-cycle and multi-node cycles in the validator-dep subgraph. Tests at `compiler/tests/unit/validator-circular-dep.test.js` (242 LOC).

## Open Follow-Ups
- **E-SYNTHESIZED-WRITE (§55.7, §6.11):** deferred to B11 (depends on B11/B12's synth-cell registry). Symbol-table stub comment at symbol-table.ts:2578.
- **GITI-006 (low-priority, S34→S67 carry-forward):** markup `${@var.path}` emits a module-top bare read that throws on async-initialized reactives.
- **ComponentDefNode classifier bug (S29-flagged, still present at S67):** `ast-builder.js:3634` classifies any uppercase-named `const/let` as component-def regardless of RHS. Fix requires flipping `tab.test.js:649-654` and updating self-host modules. Still present at S67.

## Tags
#scrmlTS #map #error #diagnostics #spec-section-34 #l21 #s65 #s66 #s67 #a-plus-verdict #i-match-promotable #b4 #b6 #b7 #b8 #b9 #b10 #e-derived-circular-dep #e-validator-circular-dep #e-type-031 #e-derived-value-mutate

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [SPEC.md §34](../../compiler/SPEC.md)
- [master-list.md](../../master-list.md)
