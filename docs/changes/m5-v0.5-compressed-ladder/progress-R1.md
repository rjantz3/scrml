# progress-R1 — M5-swap Unit R1: statement-catalog bridge

Append-only, timestamped. Crash-recovery checkpoint per global rules.

---

## 2026-05-21 — startup + survey

- Startup verification PASSED. WORKTREE_ROOT =
  `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a16ec4bdcf7f66c2b`.
  `git merge main --no-edit` → HEAD `46a2a558` (dispatch params confirm this is
  newer than the brief's stated `ca0e40ce`; docs/maps-only commits since — OK).
- Baseline: first `bun run test` post-install showed 2 fail (brief-documented
  transient dist/timing flake); re-run clean → **18,102 pass / 0 fail / 169 skip
  / 1 todo**. Matches expectation.
- Read: brief R1, primary/domain/schema maps, M5-SWAP-residual-decomposition.md,
  M5-divergence-ledger.md, M5-ast-bridge-scoping.md, ast.ts LogicStatement union
  + node interfaces, ast-stmt.js (native catalog), ast-expr.js ExprKind catalog,
  parse-stmt.js parseStatement/parseProgram/parseThrow/parseTry, emit-logic.ts
  dispatch table, ast-builder.js runtime shapes for while/do-while/break/
  continue/return/throw, collect-hoisted.js (pattern template).

### Survey findings

- Native `Stmt[]` catalog: 20 PascalCase kinds (ast-stmt.js StmtKind).
- Live `LogicStatement`: ~40-kind lowercase union (ast.ts:1358).
- `emit-logic.ts` dispatches lowercase kinds incl. runtime-only kinds NOT in the
  TS union: `do-while-stmt`, `break-stmt`, `continue-stmt` (live ast-builder.js
  produces these at L5153/5174/5193 + L8731/8751/8769).
- **scrml-only LogicStatement kinds are modelled by the native parser as Expr
  kinds, not Stmt kinds**: `Lift`/`Fail`/`Tilde`/`Match`/`NotValue` are
  ExprKind members (ast-expr.js). A native `lift foo` at statement position is
  `ExprStmt{ expression: Lift{...} }`. Translation must UN-WRAP these.
- **No native production for `propagate-expr` and `guarded-expr`**:
  - `propagate-expr` (`?` propagation operator) — no native `Question`-postfix
    production; `Question` token is ternary-only.
  - `guarded-expr` (`!{...}` statement-level error handler) — the native parser
    models `!{...}` as a block-stream `ErrorEffect` BlockKind
    (parse-error-body.js), NOT a statement-level guard postfix.
  Per brief soft-escalation: scrml-only LogicStatement kinds with no native
  production = native-parser feature gap, a separate unit. SURFACED, not
  absorbed.
- **Throw/Try**: native parser produces `Throw`/`Try` Stmt nodes but fires NO
  forbidden-vocabulary diagnostic at the keyword lead (only structural
  E-STMT-THROW-NO-ARGUMENT / E-STMT-TRY-NO-HANDLER). The LIVE pipeline produces
  `throw-stmt`/`try-stmt` AST nodes too — for diagnostic recovery — alongside a
  hard `E-ERROR-006`/`E-ERROR-007`. Decision: MAP `Throw`→`throw-stmt`,
  `Try`→`try-stmt` (matches live pipeline's AST shape); SURFACE the missing
  forbidden-vocab diagnostic as a native-parser gap (belongs to R4 §34 recon or
  a sibling unit), do not absorb.

### Design decision — translation locus

A native-parser exit-shaping module: `compiler/native-parser/translate-stmt.js`
(+ `.scrml` canonical shadow), sibling to `collect-hoisted.{js,scrml}`.
Rationale: (1) M6-aligned — the front-end exits with the live `LogicStatement`
catalog. (2) Mirrors the established `collect-hoisted` pure-fold pattern.
(3) Keeps R3 (FileAST assembler) thin — R3 calls `translateStmtList(body)`.
`parseProgram` stays pure (still emits native `Stmt[]`); `translate-stmt` is an
optional exit shaper R3 invokes.

## 2026-05-21 — implementation complete

- `compiler/native-parser/translate-stmt.js` — the bridge module.
  `translateStmtList(nativeBody, idGen)` — pure flat-map, native `Stmt[]` ->
  live `LogicStatement[]`. All 20 native StmtKinds covered. Live-node
  constructors mirror live ast-builder.js runtime shapes; expression children
  ride through verbatim (R1 = statement catalog only).
- `compiler/native-parser/translate-stmt.scrml` — canonical Pillar 5b shadow
  (declarative skeleton, mirrors collect-hoisted.scrml convention).
- `compiler/tests/unit/translate-stmt-bridge.test.js` — 71 tests: per-kind
  (§1-§5), destructuring (§6), id/span discipline (§7), defensive folds (§8),
  14-source corpus diff (§9). All pass.
- Pre-commit gate: 13,532 pass / 0 fail. Full `bun run test`: 18,173 pass / 0
  fail / 169 skip / 1 todo / 739 files = baseline 18,102 + 71 new, +1 file.
  Zero regressions.

### Per-kind map coverage (20/20 native StmtKinds mapped)

  Empty -> (dropped) · Block -> (flattened) · ExprStmt -> bare-expr (OR
  lift-expr/fail-expr on Lift/Fail un-wrap) · VarDecl -> let-decl/const-decl
  (one per declarator) · If -> if-stmt · While -> while-stmt · DoWhile ->
  do-while-stmt · For -> for-stmt(cStyleParts) · ForIn/ForOf -> for-stmt ·
  Return -> return-stmt · Break -> break-stmt · Continue -> continue-stmt ·
  Labeled -> loop with `label` stamped · FunctionDecl -> function-decl ·
  ClassDecl -> bare-expr (no live class kind) · Import -> import-decl ·
  Export -> export-decl · Throw -> throw-stmt · Try -> try-stmt.

### Gaps SURFACED to PA (not absorbed — per soft-escalation clause)

1. `propagate-expr` (`?` operator) + `guarded-expr` (`!{}` statement-level
   handler) — scrml-only LogicStatement kinds, NO native production. The `?`
   is ternary-only in the native parser; `!{}` is a block-stream `ErrorEffect`
   BlockKind, not a statement postfix. Native-parser FEATURE gap → separate
   unit.
2. `tilde-decl` + `lin-decl` — the native JS-subset parser has no `~` / `lin`
   declaration-kind signal; bare `name = expr` → bare-expr (no promotion).
   Parser-feature gap → separate unit.
3. `Throw`/`Try` — translated faithfully (live pipeline produces throw-stmt/
   try-stmt for diagnostic recovery). BUT the native parser fires NO
   forbidden-vocab diagnostic (no E-ERROR-006/E-ERROR-007 counterpart) at the
   keyword lead. Native-parser diagnostic gap → Unit R4 (§34) scope.
4. `function-decl` — native parser is JS-subset; no `fn`/`server`/`pure`/`!`
   recognition. Translation defaults fnKind="function", isServer=false,
   canFail=false. Parser-feature gap.
5. EXPRESSION layer: `emit-expr.ts` dispatches LOWERCASE expr kinds
   (`ident`/`binary`/`call`); `ast-expr.js` produces PascalCase
   (`Ident`/`Binary`/`Call`). DD #27's F2-RETIRE premise ("downstream codegen
   walks the native ExprNode catalog already") is INCOMPLETE — the expression
   catalog also needs reconciliation. Separate unit; NOT R1.

R1 STATUS: complete. Self-contained importable unit; R3 wires it.
