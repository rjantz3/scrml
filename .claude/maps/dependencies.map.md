# dependencies.map.md
# project: scrmlts
# updated: 2026-05-10T19:30:00Z  commit: f182f44

## Runtime Dependencies (root package.json)
vscode-languageserver@^9.0.1                — LSP protocol server framework (for lsp/ server)
vscode-languageserver-textdocument@^1.0.11  — text document utilities for LSP

## Runtime Dependencies (compiler/package.json)
acorn@^8.16.0   — JavaScript parser used by ast-builder and expression-parser for ExprNode production
astring@^1.9.0  — JavaScript AST-to-string code generator (used in codegen rewrite paths)

## Dev Dependencies (root package.json)
@happy-dom/global-registrator@^20.8.9  — DOM environment registration for browser-environment tests
happy-dom@^20.8.9                      — lightweight DOM implementation for test environment
marked@^14.1.3                         — markdown renderer (used by docs/build.ts)
puppeteer@^24.40.0                     — headless browser for browser integration tests

## Dev Dependencies (compiler/package.json)
@happy-dom/global-registrator@^20.8.9  — DOM environment for compiler browser tests

## Runtime (engine)
bun >=1.3.13  — required runtime; used for bun:test, Bun.file, Bun.serve, Bun.build

## Internal Module Graph

```
cli.js
  → commands/compile.js, commands/dev.js, commands/build.js,
    commands/serve.js, commands/migrate.js, commands/init.js, commands/promote.js

api.js  (programmatic API entry — orchestrates pipeline)
  → block-splitter.js (Stage 2 BS)
  → ast-builder.js (Stage 3 TAB)
  → name-resolver.ts (Stage 3.05 NR)
  → module-resolver.js (Stage 3.1 MOD)
  → component-expander.ts (Stage 3.2 CE)
  → validators/post-ce-invariant.ts, validators/attribute-interpolation.ts,
    validators/attribute-allowlist.ts (Stage 3.3 UVB)
  → protect-analyzer.ts (Stage 4 PA)
  → route-inference.ts (Stage 5 RI)
  → monotonicity-analyzer.ts
  → idempotency-store-resolver.ts
  → type-system.ts (Stage 6 TS)
  → meta-checker.ts, meta-eval.ts (Stage 6.5 META)
  → dependency-graph.ts (Stage 7 DG)
  → batch-planner.ts (Stage 7.5)
  → code-generator.js → codegen/index.ts (Stage 8 CG)
  → lint-ghost-patterns.js, lint-i-match-promotable.js (pre-Stage-2 lint)
  → gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js (post-TAB diagnostics)
  → codegen/compat/parser-workarounds.js (setBPPOverrides — BPP shim)

codegen/index.ts  (runCG)
  → codegen/analyze.ts → codegen/collect.ts, codegen/usage-analyzer.ts
  → codegen/emit-html.ts → codegen/binding-registry.ts
  → codegen/emit-css.ts
  → codegen/emit-server.ts
  → codegen/emit-client.ts (or emit-client.js — hybrid JS/TS)
  → codegen/emit-library.ts
  → codegen/emit-machines.ts
  → codegen/emit-variant-guard.ts  [NEW S78]
  → codegen/emit-engine.ts
  → codegen/emit-channel.ts
  → codegen/emit-event-wiring.ts
  → codegen/emit-reactive-wiring.ts
  → codegen/emit-expressions.ts (emit-expr.ts)
  → codegen/emit-control-flow.ts
  → codegen/emit-functions.ts
  → codegen/emit-predicates.ts
  → codegen/emit-bindings.ts
  → codegen/emit-sync.ts
  → codegen/emit-test.ts
  → codegen/emit-machine-property-tests.ts
  → codegen/emit-worker.ts
  → codegen/emit-synth-surface.ts
  → codegen/emit-validators.ts
  → codegen/emit-parse-variant.ts
  → codegen/emit-logic.ts
  → codegen/emit-messages.ts
  → codegen/emit-lift.js
  → codegen/ir.ts, codegen/errors.ts, codegen/context.ts
  → codegen/source-map.ts, codegen/type-encoding.ts
  → codegen/var-counter.ts, codegen/utils.ts
  → codegen/reactive-deps.ts, codegen/scheduling.ts
  → codegen/rewrite.ts
  → codegen/runtime-chunks.ts
  → codegen/db-driver.ts
  → codegen/parse-after-duration.ts

lsp/server.js → lsp/handlers.js, lsp/workspace.js, lsp/l4.js
```

## Tags
#scrmlts #map #dependencies #pipeline #bun #acorn

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
