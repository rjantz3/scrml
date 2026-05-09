# A8 / A6-3 — `test-bind` typer support — Progress Log

**Session:** S75. Date: 2026-05-09.
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a9fb2dccbea4e271b`
**Branch:** `main` (worktree-as-scratch per S67).
**Starting commit:** `82ae75b` (A6-2 SHIP).

---

## Phase 0 — Survey ✅ COMPLETE

- Read SPEC §19.12.6 (line 11358), §19.12.7 (line 11385), §47.5 (line 18124),
  §34 (lines 14420-14425, 14448).
- Re-read A6-2 SURVEY + progress.md.
- Mapped IR shape: `TestBindDecl` at `codegen/ir.ts:171`, `TestGroup` at
  `codegen/ir.ts:186`.
- Mapped typer entry points:
  - SYM (`symbol-table.ts`) PASSes 1–17 — A6-3 will be PASS 18.
  - TS (`type-system.ts`) `processFile` / `annotateNodes` — surveyed and
    rejected as A6-3 home (FunctionType opaque, no signature-assignability
    infra; SYM has the typer-diagnostic precedent — PASSes 16, 17).
- Identified server-fn lookup mechanism: `function-decl.isServer` (set by
  TAB at `ast-builder.js:5604+`).
- Verified §47-encoded LHS lookup is a CODEGEN concern (A6-4), not A6-3.
  A6-3 stamps source-level identifiers; codegen derives encoded keys at
  emission time.
- Documented OQ-A6-3-signature-strict + OQ-A6-3-cross-file-server-fn.

**Survey written:** `docs/changes/phase-a8-step-a6-3-test-bind-typer/SURVEY.md`.

**Baseline tests verified:** 10,701 / 69 / 1 / 3.

---

## Phase 1 — IR + walker ✅ COMPLETE (commit `559d511`)

### IR (`compiler/src/codegen/ir.ts`)
- Added `bindKind?: "handler" | "return-stub"` to `TestBindDecl`. Optional
  with documented A6-4 codegen consumer + default-to-return-stub fallback.

### SYM PASS 18 (`compiler/src/symbol-table.ts`)
- Added `discriminateTestBindRhs(rhsSource, sameFileFns, fileScope)` — pure
  function applying the three-rule heuristic (arrow / function-expr literal,
  ident-bound to function, otherwise return-stub).
- Added `collectSameFileFunctionDecls(nodes, out, visited)` — top-down
  recursion building a name → fnNode map.
- Added `annotateTestBindsInBlock(testNode, fnDecls, fileScope, errors,
  filePath)` — exported per the PASS 17 / PASS 16 precedent for synthesized-
  AST tests.
- Added `walkAnnotateTestBindKinds(...)` — PASS-17-shaped recursive walker.
- Wired into `runSYM` after PASS 17 — runs LAST, engine-orthogonal.

### Diagnostics
- E-TEST-005 reused (no new code) for two LHS-resolution failure modes:
  - LHS doesn't match same-file `function-decl` AND no file-scope import
    binding with that local name.
  - LHS matches a same-file `function-decl` with `isServer !== true`.
- Cross-file imported server-fn LHS: silently accepted (annotation defaults
  to return-stub) per documented A6-3 deferral.

## Phase 2 — Tests ✅ COMPLETE (commit `5fbd9f7`)

Created `compiler/tests/unit/test-bind-typer.test.js`:
- §1 handler form (function literal RHS) — 3 tests
- §2 return-stub form (literal RHS) — 3 tests
- §3 handler form (ident-bound function RHS) — 2 tests
- §4 scope-local independence — 2 tests
- §5 LHS unknown → E-TEST-005 — 2 tests
- §6 non-server local fn → E-TEST-005 — 3 tests
- §7 paren-less arrow → handler — 1 test
- §8 empty-array RHS → return-stub — 1 test
- §9 function-expr RHS → handler — 2 tests
- §10 regression A6-2 parser diagnostics — 2 tests
- §11 bindKind always present — 2 tests

**Total: 23 tests, all passing.**

## Final test count

10,725 pass / 69 skip / 1 todo / 3 fail. Delta: +23 tests, 0 regressions.
The 3 pre-existing fails are unchanged self-host parity issues
(F-BUILD-002, Bootstrap L3, tokenizer parity) — not introduced by A6-3.

## Deferred for A6-4 (codegen)

- Read `bind.bindKind` per `~{}` block to choose dispatch shape:
  - `"handler"` → invoke binding with original args.
  - `"return-stub"` → ignore args, return value.
- Compute §47-encoded server-fn keys for the dispatch table.
- Emit `output.testMode`-gated dispatch hooks at every server-fn call site.
- E-TEST-006 fail-fast emission per §19.12.7.
- Production-binary 0-byte cost (DCE when testMode disabled).

## Deferred (A6-3 OQs surfaced)

- **OQ-A6-3-signature-strict** (SURVEY §2.4) — strict structural-signature
  assignability check requires TS-side function-signature analysis that
  doesn't exist (FunctionType opaque). A6-3 ships syntactic + scope-lookup
  heuristic.
- **OQ-A6-3-cross-file-server-fn** (SURVEY §2.3) — cross-file imported
  server-fn LHS cannot be distinguished from regular function imports
  (export-registry lacks `isServer`). A6-3 silently accepts; future
  enhancement: enrich `module-resolver.js` to propagate `isServer`.

## Self-host parity

NONE in A6-3. The new `bindKind` field is a codegen-side annotation — the
self-hosted scrml AST builder doesn't run SYM PASS 18, and codegen (A6-4)
will default to `"return-stub"` if `bindKind` is undefined. Self-host
parity for the new IR field is A6-4's concern (or a documented later
step).

## Spec amendments

NONE. SPEC §19.12.6 / .7 / .8 were sufficient. Two OQs surfaced as
documented deferrals; neither blocks ship.

## Drift surfaced (not fixed in A6-3)

A6-2's note re: `compiler/src/codegen/errors.ts` lines 30-48 stale comment-
only documentation for E-TEST-001..005 with meanings that diverge from
SPEC §34 — A6-3 does not touch the comment block; PA cleanup item.
