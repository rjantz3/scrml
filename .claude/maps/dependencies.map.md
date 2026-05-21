# dependencies.map.md
# project: scrmlts
# updated: 2026-05-21T15:00:00Z  commit: 67a17dc5

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
No npm/pnpm lockfile; bun.lock is canonical.

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
native-parser/lex.js → lex-in-{code,single-string,double-string,template,line-comment,block-comment,regex}.js
native-parser/parse-expr.js → ast-expr.js, parse-ctx.js, token-cursor.js, parse-mode.js
native-parser/parse-stmt.js → ast-stmt.js, parse-expr.js, block-context.js
native-parser/parse-markup.js → tag-frame.js, body-mode.js, display-text-literal.js, parse-seam.js

## Native-parser ↔ live-pipeline relationship
native-parser/ is the in-progress replacement front-end. At HEAD it is NOT wired into
api.js's live pipeline — `--parser=scrml-native` only emits the I-PARSER-NATIVE-SHADOW
info diagnostic (api.js:1835). The M5 swap dispatch routes native-parser output through
the api.js BS+TAB seam. See M5-ast-bridge-scoping.md.

## Tags
#scrmlts #map #dependencies #bun #acorn #native-parser

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [build.map.md](./build.map.md)
