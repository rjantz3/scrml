# dependencies.map.md
# project: scrmlts
# updated: 2026-05-14T16:19:26-06:00  commit: 13154ba

## Runtime Dependencies (root package.json)
vscode-languageserver@^9.0.1                — LSP protocol server framework (for lsp/ server)
vscode-languageserver-textdocument@^1.0.11  — text document utilities for LSP

## Runtime Dependencies (compiler/package.json)
acorn@^8.16.0   — JavaScript parser; used by ast-builder and expression-parser for ExprNode production
astring@^1.9.0  — JavaScript AST-to-string code generator (used in codegen rewrite paths)

## Dev Dependencies (root package.json)
@happy-dom/global-registrator@^20.8.9  — DOM environment registration for browser-environment tests
@playwright/test@^1.49.0               — Playwright e2e test framework (3-browser: Chromium/Firefox/WebKit)
happy-dom@^20.8.9                      — lightweight DOM implementation for test environment
marked@^14.1.3                         — markdown renderer (used by docs/build.ts)
puppeteer@^24.40.0                     — headless browser for browser integration tests

## Dev Dependencies (compiler/package.json)
@happy-dom/global-registrator@^20.8.9  — DOM environment for compiler browser tests

## Runtime (engine)
bun >=1.3.13  — required runtime; used for bun:test, Bun.file, Bun.serve, Bun.build

## Package Version
scrmlts@0.3.0  — v0.3.0 STABLE (package.json updated at v0.3.0 cut)

## Internal Module Graph

```
cli.js
  → commands/compile.js, commands/dev.js, commands/build.js,
    commands/serve.js, commands/migrate.js, commands/init.js,
    commands/promote.js, commands/generate.js

api.js  (programmatic API entry — orchestrates pipeline)
  → block-splitter.js (Stage 2 BS)
  → ast-builder.js (Stage 3 TAB)
  → validators/lint-try-catch.ts (Stage 3.007 LINT-TRY-CATCH)
  → validators/lint-async-user-source.ts
  → name-resolver.ts (Stage 3.05 NR)
  → module-resolver.js (Stage 3.1 MOD)
  → component-expander.ts (Stage 3.2 CE)
  → validators/post-ce-invariant.ts, validators/attribute-interpolation.ts,
    validators/attribute-allowlist.ts, validators/ast-walk.ts (Stage 3.3 UVB)
  → protect-analyzer.ts (Stage 4 PA)
  → route-inference.ts (Stage 5 RI)
  → monotonicity-analyzer.ts
  → idempotency-store-resolver.ts
  → type-system.ts (Stage 6 TS)
  → meta-checker.ts, meta-eval.ts (Stage 6.5 META)
  → dependency-graph.ts (Stage 7 DG)
  → batch-planner.ts (Stage 7.5 BP)
  → auth-graph.ts (Stage 7.55 — runAuthGraph)         [WIRED S91 A-3.5]
  → reachability-solver.ts (Stage 7.6 RS)             [S89 A-2.1 → S91 A-2.7 + A-2.8 FULLY CLOSED]
  → code-generator.js → codegen/index.ts (Stage 8 CG)
  → lint-ghost-patterns.js, lint-i-match-promotable.js (pre-Stage-2 lint)
  → gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js (post-TAB diagnostics)
  → codegen/compat/parser-workarounds.js (setBPPOverrides — BPP shim)
  → symbol-table.ts

auth-graph.ts (runAuthGraph — A-3.1 + A-3.2 + A-3.3 + A-3.4 + A-3.5)
  → src/types/auth-graph.ts                            — type surface
  → src/types/ast.ts                                   — FileAST, ASTNode
  → src/codegen/constant-folder.ts                     — partiallyEvaluateExpr for gate-expr folding
  → [WIRED into api.js pipeline at S91 close — A-3.5]

reachability-solver.ts (Stage 7.6 — orchestrator)     [S91 A-2.7 + A-2.8 FULLY CLOSED]
  → src/types/reachability.ts                          — type surface
  → src/reachability/entry-points.ts                   — A-2.2 entry-point detection
  → src/reachability/component-1.ts                    — A-2.2 Component 1
  → src/reachability/component-2.ts                    — A-2.3 reactive_dep_closure
  → src/reachability/component-3.ts                    — A-2.4 server_fn_reachable_within
  → src/reachability/component-4.ts                    — A-2.5 auth_gated_boundaries_visible_to
  → src/reachability/component-5.ts                    — A-2.6 vendor_units_used_by
  → src/reachability/outer-fixpoint.ts                 — A-2.7 outer fixed-point + E-CLOSURE-001
  → src/reachability/gate-classifier.ts                — A-3.3 per-gate classifier
  → src/types/auth-graph.ts (via RSInput.authGraph)

codegen/index.ts  (runCG)
  → codegen/analyze.ts → codegen/collect.ts, codegen/usage-analyzer.ts
  → codegen/emit-html.ts → codegen/binding-registry.ts [augmentHtmlForChunks + hasInternalLinks Q-OPEN-6]
  → codegen/emit-css.ts
  → codegen/emit-server.ts                             [wire-format integration]
  → codegen/emit-client.ts
  → codegen/emit-library.ts
  → codegen/emit-machines.ts
  → codegen/emit-variant-guard.ts, codegen/emit-engine.ts
  → codegen/emit-channel.ts, codegen/emit-event-wiring.ts
  → codegen/emit-reactive-wiring.ts, codegen/emit-expr.ts
  → codegen/emit-control-flow.ts, codegen/emit-functions.ts
  → codegen/emit-predicates.ts, codegen/emit-bindings.ts
  → codegen/emit-sync.ts, codegen/emit-test.ts
  → codegen/emit-machine-property-tests.ts, codegen/emit-worker.ts
  → codegen/emit-synth-surface.ts, codegen/emit-validators.ts
  → codegen/emit-parse-variant.ts, codegen/emit-logic.ts
  → codegen/emit-messages.ts
  → codegen/wire-format.ts                             — §57 wire format helpers
  → codegen/lint-undefined-interpolation.ts            — W-CG-UNDEFINED-INTERPOLATION
  → codegen/route-splitter.ts                          — A-4 per-route splitter [getCompilerIdentity Q-OPEN-4; chunkSizeBudgetBytes Q-OPEN-5; hasInternalLinks Q-OPEN-6 NEW S92]
  → codegen/atom-emitter.ts                            — A-4.2 per-id atom helpers
  → codegen/fnv1a-hash.ts                              — FNV-1a shared primitive
  → codegen/runtime-chunks.ts                          — prefetch/mount/vendor-ref chunks
  → codegen/ir.ts, codegen/errors.ts, codegen/context.ts
  → codegen/source-map.ts, codegen/type-encoding.ts   [re-exports fnv1aHash from fnv1a-hash.ts]
  → codegen/var-counter.ts, codegen/utils.ts
  → codegen/reactive-deps.ts, codegen/scheduling.ts
  → codegen/rewrite.ts, codegen/db-driver.ts, codegen/parse-after-duration.ts
  → codegen/constant-folder.ts, codegen/emit-lift.js

compiler/runtime/stdlib/  (hand-written JS shims — copied to dist/_scrml/ at compile time)
  host.js    — safeCall/safeCallAsync/HostError (scrml:host primitive)
  auth.js    — session/JWT auth helpers
  crypto.js  — hashing helpers
  store.js   — KV store helpers

lsp/server.js → lsp/handlers.js, lsp/workspace.js, lsp/l4.js
```

## Tags
#scrmlts #map #dependencies #pipeline #bun #acorn #s92 #v0.3.0 #approach-a #approach-a2 #approach-a3 #approach-a4 #approach-a5 #reachability #auth-graph #route-splitter #fnv1a-hash #q-open-4 #q-open-5 #q-open-6

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
