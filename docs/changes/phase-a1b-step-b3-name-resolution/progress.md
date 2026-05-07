# Phase A1b Step B3 — Progress

**Branch:** `main` (no isolation, per S64 hand-off note 43).
**Parent baseline:** `cf69028`. Test counts: **8959 / 44 / 1 / 0 / 9004 / 442**.
**Working tree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/`.

Append-only timestamped log.

---

## Timeline

- [00:00] Startup verification: pwd OK, git status clean, HEAD `cf69028`. `bun install` no-op. `bun run pretest` populated dist.
- [00:01] Baseline `bun test`: **8959 / 44 / 1 / 0 / 9004 / 442**.
- [00:05] Required reading: A1b SCOPE-AND-DECOMPOSITION (B3 lines 180, 228, 259); B1 BRIEF + progress; B2 progress; symbol-table.ts (full); IdentExpr def (`types/ast.ts:1271-1276` — `@` preserved verbatim in `name`); `forEachIdentInExprNode` (`expression-parser.ts:2163-2300+`); type-system.ts §2a (`E-SCOPE-001`); parseVariant Phase 2 annotation convention (`(call as Record).parseVariantEnum = ...` at `type-system.ts:7746`); DG sweep (`dependency-graph.ts:1458-1618`).
- [00:30] Survey note written: `SURVEY-NOTE.md`.

## Survey conclusions

See `SURVEY-NOTE.md` in full. Key findings:

1. **Surface much smaller than 4-6h estimate.** B3 is a localized PASS 3 in
   symbol-table.ts that walks ExprNode payloads + uses `forEachIdentInExprNode`
   + calls B1's `lookupStateCell`. Estimated ~2-3h.
2. **No new error code.** Per A1b plan line 228, B3 uses "existing infra" for
   resolution-fail. B3 RECORDS (annotation), does not FIRE.
3. **Negative case = `_resolvedStateCell: null` annotation** on `@`-prefixed
   IdentExprs that fail lookup. Downstream B-steps can detect.
4. **Annotation field: `_resolvedStateCell`** (Object.defineProperty, non-enumerable, mirrors B1's `_record`/`_scope` cycle-safety convention).

## Implementation phase

### Chunk 1 — `4f7405e` PASS 3 wired

- Extended `compiler/src/symbol-table.ts`:
  - Imported `IdentExpr` type + `forEachIdentInExprNode` helper.
  - Added `ResolvedAtNameAnnotated` interface documenting the `_resolvedStateCell` field shape (record | null | undefined).
  - Added PASS 3 walker `walkResolveAtNames` parallel to PASS 2's `walkLocalDeclsForCollisions`. Walks every ExprNode payload field (B3_EXPR_FIELDS list mirrors type-system.ts:7732 + dependency-graph.ts:227). For each `@`-prefixed IdentExpr, calls `lookupStateCell(currentScope, name.slice(1))` and stamps `_resolvedStateCell` via `Object.defineProperty(enumerable: false)` (cycle-safe; mirrors B1's `_record` non-enumerable choice).
  - Wired PASS 3 invocation into `runSYM` after PASS 2.
  - Added public helper `getResolvedStateCell(ident)` returning record | null | undefined (the contract for B5+, B7, B22 readers).
  - Updated docblock with Step B3 LANDED notes + step list.

- Test impact: zero regressions. Full suite **8959 / 44 / 1 / 0 / 9004 / 442** unchanged.
- Pre-commit clean. Post-commit gauntlet (TodoMVC) clean.

### Chunk 2 — `a6b78d4` unit tests

- Added `compiler/tests/unit/at-name-resolution.test.js` with 11 tests:
  - §B3.1 happy path — `@count` in markup interpolation
  - §B3.2 happy path — `@count + 1` in arithmetic expr
  - §B3.3 happy path — `@items.length` member access (base resolves; `.length` is a static prop)
  - §B3.4 compound nav — `@formRes.name` resolves to compound parent (base cell)
  - §B3.5 compound nav with method — `@formRes.name.toUpperCase()` resolves base cell
  - §B3.6 failure — `@undeclared` annotates `null` (no error fired)
  - §B3.7 discrimination — bare `count` (no `@`) is NOT B3-annotated
  - §B3.8 function-scoped — `@x` inside its declaring fn resolves with `scope.kind === "function"`
  - §B3.9 parent-chain — file-level cell visible from inner fn body
  - §B3.10 B5-shaped read — every `@`-ident has `_resolvedStateCell !== undefined` (the round-trip contract for downstream B-steps)
  - §B3.11 helper return-shape — `getResolvedStateCell` returns record | null | undefined per documented contract

- **Test counts:** 8970 / 44 / 1 / 0 / 9015 / 443 — net +11 tests, +1 file vs baseline. Zero regressions.
- Anti-folklore guard satisfied: every test asserts BOTH presence AND record-field shape (or null vs undefined distinction).
- Pre-commit clean. Post-commit gauntlet clean.

## B3 verdict

**GREEN.**

- Surface: ~2h (depth-of-survey discount #8 candidate; revised down from 4-6h estimate)
- Implementation: PASS 3 walker in `compiler/src/symbol-table.ts`; ~140 net lines.
- Tests: 11 new tests landed; 0 regressions.
- ExprNode annotation field name: **`_resolvedStateCell`** (non-enumerable Object.defineProperty per B1 convention).
- Public read API: **`getResolvedStateCell(ident: IdentExpr)`** returning `StateCellRecord | null | undefined`.
- No new error code (per A1b plan §4.6 line 228 — resolution-fail = existing infra). Future tightening dispatch may convert null-marker into a fired diagnostic; out of B3 scope.
- Compound nav: BASE cell only at B3 (matches plan wording "resolves to state cell"). Leaf-level resolution available via `lookupQualifiedStateCell` at consumer time.

## Final test counts

**8970 / 44 / 1 / 0 / 9015 / 443** (pass / skip / todo / fail / total / files)

## Commits

- `8e91c8c` WIP(a1b-step-b3): scaffold survey note + progress.md
- `4f7405e` WIP(a1b-step-b3): PASS 3 @name resolution + getResolvedStateCell helper
- `a6b78d4` test(a1b-step-b3): @name resolution unit tests (§B3.1-§B3.11)

