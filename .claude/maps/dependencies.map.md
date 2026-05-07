# dependencies.map.md
# project: scrmlTS
# updated: 2026-05-06T23:50:00Z  commit: 7334fb0

## Runtime Dependencies (root + compiler workspace)
vscode-languageserver@^9.0.1                 — LSP protocol implementation; consumed by `lsp/server.js` + `handlers.js`.
vscode-languageserver-textdocument@^1.0.11   — LSP TextDocument abstraction; used by `lsp/workspace.js`.

(Note: the entire compiler is intentionally near-zero-dep — Bun stdlib + acorn-as-pre-processor pattern. acorn is bundled by Bun runtime, not declared.)

## Dev / Build Dependencies
@happy-dom/global-registrator@^20.8.9   — DOM polyfill registrator for `compiler/tests/browser/*.test.js`.
happy-dom@^20.8.9                       — Browser-test DOM implementation.
puppeteer@^24.40.0                      — Headless browser for `browser-todomvc.test.js`, `todomvc-e2e.test.js`.

## Engines / Runtime
bun >= 1.3.13                            — declared in `package.json > engines`. Project does NOT support Node.

## Internal Module Graph (high-level — read api.js for canonical chain)

cli.js → commands/{compile,build,dev,serve,init,migrate,promote}.js
commands/compile.js → api.js
api.js → block-splitter.js (BS) → ast-builder.js (TAB) → module-resolver.js (MOD) → component-expander.ts (CE)
       → validators/{post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts} (VP-1)
       → name-resolver.ts (NR) + symbol-table.ts (SYM)
       → protect-analyzer.ts (PA) → route-inference.ts (RI)
       → type-system.ts (TS) → meta-checker.ts (MC) → meta-eval.ts (ME)
       → dependency-graph.ts (DG) → batch-planner.ts (BP) → code-generator.js (CG)
       → codegen/index.ts → emit-{client,server,logic,html,css,bindings,event-wiring,reactive-wiring,
                                 control-flow,expr,functions,channel,machines,machine-property-tests,
                                 parse-variant,predicates,sync,test,worker,library,lift}.{ts,js}
       → rewrite.ts (mangler) + analyze.ts + collect.ts + reactive-deps.ts + scheduling.ts + ir.ts
       → runtime-template.js + runtime-chunks.ts + db-driver.ts + type-encoding.ts + source-map.ts

ast-builder.js → expression-parser.ts → tokenizer.ts → types/ast.ts (Span, *Node, ASTNode, ExprNode kinds)
ast-builder.js → block-splitter.js → body-pre-parser.ts → tokenizer.ts
ast-builder.js → html-elements.js + tailwind-classes.js + attribute-registry.js

api.js → lint-ghost-patterns.js + gauntlet-phase1-checks.js + gauntlet-phase3-eq-checks.js (lint passes)
api.js → schema-differ.js (SQL schema reconciliation) + chart-utils.js (charting helpers)

LSP: lsp/server.js → lsp/handlers.js (L1+L2+L3) → lsp/workspace.js + lsp/l4.js (L4 code actions + signature help)
LSP shares: api.js (compile-on-hover) + tokenizer.ts + ast-builder.js + type-system.ts

stdlib runtime bridge: api.js → STDLIB_RUNTIME_DIR (compiler/runtime/stdlib/{auth,crypto,store}.js) — copied verbatim into `dist/_scrml/<name>.js` so emitted JS resolves `import "scrml:<name>"` rewrites.

## Self-host
compiler/self-host/{ast,bpp,bs,cg,dg,meta-checker,module-resolver,pa,ri,tab,ts}.scrml → mirror passes; built by compiler/scripts/build-self-host.js → compiler/self-host/dist/.
compiler/self-host/cg-parts/ → split codegen pieces (section-assembly.js etc.).

## Tags
#scrmlTS #map #dependencies #compiler #internal-graph #lsp #self-host #s65

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [domain.map.md](./domain.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
