# dependencies.map.md
# project: scrmlts
# updated: 2026-05-28T00:00:00Z  commit: 1fed5588

## Runtime Dependencies (root package.json — v0.6.6)

`@modelcontextprotocol/sdk@1.29.0` — MCP server SDK; used for the `scrml:compiler` MCP bridge (stdlib/compiler/)
`vscode-languageserver@^9.0.1` — LSP server protocol library; used in lsp/server.js
`vscode-languageserver-textdocument@^1.0.11` — LSP text document helper; used in lsp/

## Dev / Build Dependencies (root package.json)

`@happy-dom/global-registrator@^20.8.9` — DOM simulation for browser-facing unit tests; used in compiler/tests/browser/
`@playwright/test@^1.49.0` — end-to-end test runner; used in e2e/
`happy-dom@^20.8.9` — browser environment simulation
`marked@^14.1.3` — markdown parser; used in docs/build.ts for site generation
`puppeteer@^24.40.0` — headless Chromium; used in benchmark runners

## Compiler Sub-Package Dependencies (compiler/package.json — v0.2.0)

`acorn@^8.16.0` — JavaScript parser (SPEC §22.12 — Acorn = conformance oracle ONLY; scrml-native parser at compiler/native-parser/ is the replacement arc; M6 will remove Acorn)
`astring@^1.9.0` — JavaScript AST-to-string emitter; used in codegen expression emission

## Internal Module Graph (key import relationships)

`compiler/src/api.js` → all pipeline stages (BS, TAB, CE, NR, SYM, PA, RI, MC, ME, TS, DG, BP, AG, RS, CG) + all linters
`compiler/src/codegen/*.ts` → `compiler/src/types/ast.ts`, `./ir.ts`, `./context.ts`, `./errors.ts`, `./scheduling.ts`
`compiler/src/type-system.ts` → `./codegen/context.ts`, `./types/ast.ts`, `./symbol-table.ts`
`compiler/src/route-inference.ts` → `./types/ast.ts`, `./codegen/scheduling.ts`
`compiler/src/batch-planner.ts` → `./body-dg-builder.ts`, `./cps-batch-planner.ts`
`compiler/src/cps-batch-planner.ts` → `./scheduling.ts` (Bug 55 fix: isStatementShapeStmt guard), `./body-dg-builder.ts` (Bug 56 fix: body-DG reads folded in)
`compiler/src/auth-graph.ts` → `./types/auth-graph.ts`, `./route-inference.ts`
`compiler/src/symbol-table.ts` → `./types/ast.ts`
`compiler/native-parser/parse-file.js` → `./lex.js`, `./parse-stmt.js`, `./parse-expr.js`, `./parse-markup.js`, `./translate-stmt.js`, `./translate-expr.js`
`compiler/self-host/*.scrml` → compiled by scrmlTS pipeline; not yet live in production path

## Tags
#scrmlts #map #dependencies #bun #acorn #mcp #lsp

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
