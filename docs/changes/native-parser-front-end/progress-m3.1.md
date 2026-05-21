# M3.1 progress — JS statement-parser substrate + declarations + block/expr stmts + BlockStub re-entry

Per-agent progress file (parallel MK2.2 dispatch may run; do NOT share `progress.md`).
Append-only, timestamped.

## 2026-05-20T19:40 — startup + research complete

- Startup verification PASS: worktree `agent-a53f848ea92ca91f0`,
  fast-forward merge main -> `0a5350e`, all 8 predecessor files present
  (`parse-expr` / `parse-mode` / `ast-expr` / `cursor` `.scrml`+`.js`),
  `bun install` + `bun run pretest` clean.
- Maps read: primary / structure / dependencies / schema / domain.
- Roadmap read: §0 (overview + §0.4 the two ParseContext things + §0.5
  discipline), §1 (M2 predecessor), §3.2 (the M3.1 row — AUTHORITATIVE scope).
- Authority chain read: S98 DD D3 (AST node catalog incl. the `Stmt` enum
  sketch), D5 (MUST-PARSE statement list — the subset authority), D7 M3 gating.
- All native-parser predecessor `.js` + `.scrml` read in full: `ast-expr`,
  `parse-expr` (entry points + `parseBlockStub` + `parseParam` + `parsePrimary`),
  `parse-mode`, `cursor`, `token-cursor`, `token`. Conformance test
  `parser-conformance-expr.test.js` read for the harness pattern.

### Key findings

- The native-parser has NO `Stmt` AST yet — only `Expr` (ast-expr). M3.1
  creates `ast-stmt.scrml`/.js from scratch, mirroring `ast-expr`'s structure
  (frozen `StmtKind` enum + `make*` constructors + spec-cited comments).
- `BlockStub` (ast-expr.js:252) carries `{ kind, tokens, tokenStart, tokenEnd,
  span }`. `tokens` is `cursor.tokens.slice(tokenStart, tokenEnd)` — the body
  token slice, half-open, NOT including the closing `}` and NOT including a
  trailing EOF token. `parseBlockStub` (parse-expr.js:1162) is the single
  capture site; arrow bodies, function-expr bodies, AND match-arm block bodies
  (parse-expr.js:1879) all funnel through it. M3.1 re-entry is therefore
  uniform: one `parseBlockStubBody(stub)` re-parses any BlockStub.
- Re-entry detail: the token-cursor's `advance` clamps at `tokens.length - 1`
  and `atEnd` only fires on an EOF-kinded token. A BlockStub slice has no EOF,
  so re-entry MUST append a synthetic `makeEof` to the slice before
  cursoring — same shape `parseExpr` relies on for a full lex stream.
- M2.3 parses destructuring PARAMS as a stand-in (`parseParamTarget` ->
  `parsePrimary` yields an Object/Array LITERAL node, a documented M4-deferred
  ESTree-divergence). M3.1's variable-declaration destructuring per D5
  (`collectBindingIdentifiers` walks these) needs REAL binding patterns —
  M3.1 builds `ObjectPattern` / `ArrayPattern` / `AssignmentPattern` /
  `RestElement` for vardecl targets. Documented as the M3.1 binding-pattern
  surface (params remain literal stand-ins until M4 unifies — surfaced to PA).

### Scope (roadmap §3.2 M3.1 row)

- `ast-stmt.scrml`/.js — `Stmt` enum + node constructors.
- `parse-stmt.scrml`/.js — the statement-list parser.
- `parse-mode.scrml`/.js — add statement-context `ParseMode` variants.
- Parse: `let`/`const`/`var` (+ object/array destructuring), expression
  statements, block `{}`, empty `;`.
- `BlockStub` re-entry mechanism.
- `parser-conformance-stmt.test.js` — new Acorn-oracle harness, Tier 1+2.

### M3.2/M3.3/M3.4 seams (NOT in M3.1)

- Control-flow (`if`/`while`/`for`/`return`/`break`/`continue`/labels) -> M3.2.
- Functions/classes + in-line bodies + `import`/`export` + `try`/`throw` -> M3.3.
- Error-recovery engine integration + full conformance -> M3.4.

## 2026-05-20T20:25 — implementation complete

All four logical units landed + committed:

1. `ast-stmt.scrml`/.js — Stmt AST catalog. Frozen StmtKind enum (20
   variants — M3.1 emits Block/ExprStmt/Empty/VarDecl; control-flow +
   declaration + module + try/throw declared for catalog completeness,
   constructors deferred M3.2/M3.3). VarDeclKind + the binding-pattern
   catalog (BindingIdent / ObjectPattern / ArrayPattern / AssignmentPattern
   / RestElement + property/element forms). Commented canonical `type
   Stmt:enum` for the M5 swap-in.
2. `parse-mode.scrml`/.js — `.InBlock` statement-context ParseMode variant
   (a `{}` block statement, distinct from `.InObjectLiteral`). Both the
   `<engine>` declaration + the live LEGAL_TRANSITIONS table updated.
3. `parse-stmt.scrml`/.js — the statement parser. parseProgram /
   parseStmt / parseStatementList trampoline / parseStatement dispatch;
   parseBlock / parseVarDecl + binding-pattern parsers / parseExprStatement
   / parseEmptyStatement; ASI via token `.span.line`; parseBlockStubBody +
   reenterBlockStubs (the BlockStub re-entry mechanism — appends a
   synthetic EOF to the captured slice). Shares one ctx with parse-expr.
4. `parser-conformance-stmt.test.js` — 143 tests / 0 fail; Acorn-oracle
   Tier 1+2 over a 56-entry corpus + native-shape + ASI + BlockStub
   re-entry + forward-seam + error-path describe blocks.

### K-class issue surfaced — K6 (binding-pattern / param-pattern divergence)

M2.3's `parseParamTarget` (parse-expr.js) parses a function-PARAM
destructuring pattern as a STAND-IN — `parsePrimary` yields an
ast-expr Object/Array LITERAL node (a documented M4-deferred
ESTree-divergence; parse-expr.js:1233-1237). M3.1's variable-declaration
destructuring builds REAL binding patterns (ast-stmt's BindingKind
catalog — ObjectPattern / ArrayPattern with the left-of-`=` shape, the
ESTree ObjectPattern/ArrayPattern split). So at HEAD the native parser
has TWO destructuring surfaces: literal stand-ins for params, real
binding patterns for vardecl targets. Non-blocking for M3.x; M4 (full
bounded JS subset) should unify — `parseParamTarget` should call
`parseBinding` (ast-stmt) once a function param IS a declaration target.
Reported to PA for a roadmap §4.4 K-class entry.

### M3.2 / M3.3 forward-seam contract (for the next dispatch)

- M3.2 wires the control-flow leads currently recording
  `E-STMT-FORWARD-M3-2` in `parseStatement` (parse-stmt.js — the `KwIf` /
  `KwElse` / `KwFor` / `KwWhile` / `KwDoWhile` / `KwReturn` / `KwBreak` /
  `KwContinue` branch). Replace that `recordError` + `return null` with the
  real dispatch. The Stmt enum already declares If/While/DoWhile/For/ForIn/
  ForOf/Return/Break/Continue/Labeled — add their `make*` constructors to
  ast-stmt.
- M3.3 wires the `KwFunction` / `KwClass` / `KwImport` / `KwExport` /
  `KwTry` / `KwThrow` branch (currently `E-STMT-FORWARD-M3-3`). Function/
  class bodies parse IN-LINE via `parseStatementList` — the BPP
  subsumption; the BlockStub re-entry M3.1 built is the bridge for the
  expression-position function/arrow bodies M2 already stubbed.
- `parseBlockStubBody` / `reenterBlockStubs` are the stable M2→M3 seam —
  M3.2/M3.3 do not need to change them.
