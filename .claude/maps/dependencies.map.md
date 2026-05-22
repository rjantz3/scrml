# dependencies.map.md
# project: scrmlts
# updated: 2026-05-21T21:30:00Z  commit: 26e82466

## Runtime Dependencies (root package.json)
vscode-languageserver@^9.0.1 — LSP server framework for lsp/server.js
vscode-languageserver-textdocument@^1.0.11 — text-document model for the LSP

## Runtime Dependencies (compiler/package.json)
acorn@^8.16.0 — JS expression/statement parser; drives the live TAB-stage `parseExprToNode` (ESTree nodes); native-parser conformance ORACLE
astring@^1.9.0 — ESTree → JS source generator; used by codegen to print expressions

## Dev / Build Dependencies (root)
@happy-dom/global-registrator@^20.8.9 — registers happy-dom globals for browser-mode unit tests
happy-dom@^20.8.9 — DOM implementation for non-Playwright browser tests
@playwright/test@^1.49.0 — e2e test runner (e2e/)
puppeteer@^24.40.0 — headless browser automation (benchmarks / browser tests)
marked@^14.1.3 — markdown renderer for docs:build

## Runtime / Toolchain
Bun >=1.3.13 — required engine; test runner (`bun test`), bundler, package manager (bun.lock).
No npm/pnpm lockfile; bun.lock is canonical. package.json version: 0.6.0.

## Internal Module Graph (pipeline orchestration)
api.js → block-splitter.js, ast-builder.js, compute-pgo-flags.ts, compute-program-config.ts,
         component-expander.ts, protect-analyzer.ts, route-inference.ts, monotonicity-analyzer.ts,
         idempotency-store-resolver.ts, type-system.ts, meta-checker.ts, meta-eval.ts,
         dependency-graph.ts, batch-planner.ts, reachability-solver.ts, auth-graph.ts,
         code-generator.js, module-resolver.js, name-resolver.ts, symbol-table.ts
api.js → validators/{post-ce-invariant, attribute-interpolation, attribute-allowlist, lint-try-catch, lint-async-user-source}.ts
api.js → lint-ghost-patterns.js, lint-i-match-promotable.js, tailwind-classes.js,
         gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js
code-generator.js → codegen/index.ts (runCG) → codegen/emit-*.ts (~55 emitters)
codegen/index.ts → codegen/route-splitter.ts, codegen/ir.ts, codegen/source-map.ts, codegen/runtime-chunks.ts
reachability-solver.ts → reachability/{component-1..5, entry-points, gate-classifier, outer-fixpoint}.ts
cli.js → commands/{compile, dev, build, migrate, promote, generate, init, serve}.js → api.js
commands/build.js, commands/dev.js → api.js findOutputFiles

## Native-parser Internal Module Graph
lex.js → lex-mode.js, lex-in-{code,single-string,double-string,template,line-comment,block-comment,regex}.js,
         char-classify.js
parse-expr.js → ast-expr.js, token.js, token-cursor.js, parse-ctx.js, parse-mode.js
parse-stmt.js → ast-stmt.js, ast-expr.js, parse-expr.js, token.js, parse-ctx.js, block-context.js, body-mode.js
parse-markup.js → tag-frame.js, body-mode.js, display-text-literal.js, parse-seam.js,
         parse-css-body.js, parse-sql-body.js, parse-state-body.js, parse-error-body.js, delegation-frame.js
translate-stmt.js → ast-stmt.js, translate-expr.js (rides expression children through the expr bridge)
translate-expr.js → ast-expr.js
collect-hoisted.js → ast-stmt.js (reads StmtKind to classify Block-stream Stmt nodes)

## Native-parser → live-pipeline bridge (C1 dispatch seam)
The native parser produces SEPARATE catalogs (Token[], Stmt[], Expr, Block[]) that do
NOT form a `FileAST`. The S118/S119 bridge layer is now landed:
  - translate-stmt.js  `translateStmtList(nativeBody, idGen)` — R1; native Stmt[] →
    live LogicStatement[] (PascalCase ESTree-shape → lowercase scrml kinds; N×M structural).
  - translate-expr.js  `translateExpr(nativeExpr)` / `translateExprList(...)` — A2;
    native Expr (40 ExprKinds) → live ExprNode (20 lowercase kinds).
  - collect-hoisted.js `collectHoisted(blocks, idGen, source)` / `hasProgramRoot(blocks)` —
    A3; native Block[] → { imports, exports, typeDecls, components, machineDecls,
    channelDecls, hasProgramRoot }. Synthesizes EngineDeclNode/ComponentDefNode/
    TypeDeclNode from native Markup/VarDecl/TypeDecl shapes.
These three are OPTIONAL exit-shapers — `parseProgram`/`parseExpression`/`parseMarkup`
stay pure. The C1 dispatch composes them into `nativeParseFile` and wires it into
api.js's BS+TAB seam. At HEAD `--parser=scrml-native` is still observability-only
(api.js:1835, I-PARSER-NATIVE-SHADOW) — the bridge exists but is NOT yet routed.

## Tags
#scrmlts #map #dependencies #bun #acorn #native-parser #m5-swap #bridge

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [build.map.md](./build.map.md)
