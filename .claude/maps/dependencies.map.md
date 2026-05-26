# dependencies.map.md
# project: scrmlts
# updated: 2026-05-26T00:00:00Z  commit: c2d3f7ae

## Runtime Dependencies (root package.json)

`@modelcontextprotocol/sdk@1.29.0` — MCP TypeScript SDK (MCP-V0.C); supplies `McpServer` (`@modelcontextprotocol/sdk/server/mcp.js`) + `StdioServerTransport` (`@modelcontextprotocol/sdk/server/stdio.js`). Imported LAZILY (dynamic `import()`) only inside `startMcpServer()` in `compiler/runtime/stdlib/mcp.js`; the B-helpers / tool resolvers do not require it to be present. `zod` is resolved at the same boot site (peer of the SDK; not a direct package.json entry).
`vscode-languageserver@^9.0.1` — LSP server framework for lsp/server.js
`vscode-languageserver-textdocument@^1.0.11` — text-document model for the LSP

## Runtime Dependencies (compiler/package.json)

`acorn@^8.16.0` — JS expression/statement parser; drives live TAB-stage `parseExprToNode` (ESTree nodes); native-parser conformance ORACLE
`astring@^1.9.0` — ESTree → JS source generator; used by codegen to print expressions

## Dev / Build Dependencies (root)

`@happy-dom/global-registrator@^20.8.9` — registers happy-dom globals for browser-mode unit tests
`happy-dom@^20.8.9` — DOM implementation for non-Playwright browser tests
`@playwright/test@^1.49.0` — e2e test runner (e2e/)
`puppeteer@^24.40.0` — headless browser automation (benchmarks / browser tests)
`marked@^14.1.3` — markdown renderer for docs:build

(No dependency adds/removes since the prior watermark — `package.json` v0.6.0 unchanged.)

## Runtime / Toolchain

Bun >=1.3.13 — required engine; test runner (`bun test`), bundler, package manager (bun.lock). No npm/pnpm lockfile. package.json version: 0.6.0.

## Internal Module Graph (pipeline orchestration)

```
api.js → block-splitter.js, ast-builder.js, compute-pgo-flags.ts, compute-program-config.ts,
         component-expander.ts, protect-analyzer.ts, route-inference.ts, monotonicity-analyzer.ts,
         idempotency-store-resolver.ts, type-system.ts, meta-checker.ts, meta-eval.ts,
         dependency-graph.ts, batch-planner.ts, reachability-solver.ts, auth-graph.ts,
         code-generator.js, module-resolver.js, name-resolver.ts, symbol-table.ts
api.js → lint-w-each-promotable.js (runWEachPromotable), lint-w-each-key.js (runWEachKey)  — NEW S131, W-EACH info-lints
api.js → lint-ghost-patterns.js, lint-i-match-promotable.js, lint-i-fn-promotable.js,
         tailwind-classes.js, gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js
api.js → codegen/mcp-descriptors.ts (buildMcpDescriptors) — MCP-V0.A sidecar emission in output write loop
api.js → rewriteStdlibImports — GITI-018: rewrites ALL `scrml:` import specifiers in --mode library
api.js → native-parser/parse-file.js (nativeParseFile) — C2 routing behind --parser=scrml-native
api.js → mcpAutoActivated/mcpMode surface (api.js:622) — set when <program mcp> present (MCP-V0.D); auto-flips emitPerRoute:true
api.js → validators/{post-ce-invariant, attribute-interpolation, attribute-allowlist,
         lint-try-catch, lint-async-user-source}.ts
code-generator.js → codegen/index.ts (runCG) → codegen/emit-*.ts (~56 emitters)
codegen/index.ts → codegen/route-splitter.ts, codegen/ir.ts, codegen/source-map.ts,
                   codegen/runtime-chunks.ts
codegen/emit-html.ts → codegen/emit-each.ts (lazy require — emitEachMountHtml; each-block mount slot)  — NEW S131
codegen/emit-client.ts → codegen/emit-each.ts (emitEachBodyRenderForFile; per-item body render)  — NEW S131
codegen/emit-each.ts → codegen/context.ts (CompileContext type only — leaf-ish; no project value imports)
codegen/emit-expr.ts → codegen/rewrite.js, codegen/emit-parse-variant.ts, codegen/emit-control-flow.ts
codegen/rewrite.ts → codegen/code-segments.ts (rewriteCodeSegments + regexAllowedAfter; rewrite.ts RE-EXPORTS both)
expression-parser.ts → codegen/code-segments.ts (shared fence for preprocessForAcorn `not`-lowering — leaf placement avoids the rewrite.ts ↔ expression-parser.ts cycle)
codegen/mcp-descriptors.ts → (no module imports; LOCAL mirrors of emit-engine/emit-channel/
                   emit-synth-surface walk shapes to avoid circular import into the emit chain)
type-system.ts → (lifecycle-annotation registry built inline — buildLifecycleFieldRegistry +
                  extractLifecycleFields + checkLifecycleFieldAccess; no new module import; fires E-TYPE-001 + E-TYPE-LIFECYCLE-* + W-LIFECYCLE-LEGACY-ARROW)
commands/build.js → (MCP-V0.D: reads result.mcpAutoActivated/mcpMode; injects scrml:mcp boot import into _server.js with dev-only NODE_ENV gate)
reachability-solver.ts → reachability/{component-1..5, entry-points, gate-classifier, outer-fixpoint}.ts
cli.js → commands/{compile, dev, build, migrate, promote, generate, init, serve}.js → api.js
symbol-table.ts → engine-statechild-parser.ts (legacy fallback, parseRuleAttrValue only)
symbol-table.ts → native-walker/engine-statechild-walker.ts (M6.6.b.2 primary path)
native-walker/engine-statechild-walker.ts → engine-statechild-parser.ts (parseRuleAttrValue)
native-walker/engine-statechild-walker.ts → native-parser/collect-hoisted.js (isEngineBlock)
```

## Native-parser Internal Module Graph

```
lex.js → lex-mode.js, lex-in-{code,single-string,double-string,template,
          line-comment,block-comment,regex}.js, char-classify.js
parse-expr.js → ast-expr.js, token.js, token-cursor.js, parse-ctx.js, parse-mode.js
                (M6.7-D1 null/undefined primary; M6.7-D3 `:>` match-arm; M6.7-D6 string-literal import specifier)
parse-stmt.js → ast-stmt.js, ast-expr.js, parse-expr.js, token.js, parse-ctx.js,
                block-context.js, body-mode.js
                (M6.5.b.2 structuralStateDeclLeadFollows; M6.7-D2 server/pure on `function`;
                 M6.7-D7 `given` guard; M6.7-D8a-i `-> ReturnType` annotation)
parse-markup.js → tag-frame.js, body-mode.js, display-text-literal.js, parse-seam.js,
                  parse-css-body.js, parse-sql-body.js, parse-state-body.js, parse-error-body.js,
                  delegation-frame.js
parse-file.js → parse-markup.js, collect-hoisted.js, translate-stmt.js, parse-state-body.js
                (M6.5.b.4 bare ?{} → kind:"sql"; M6.5.b.5/b.6 native→live FileAST shape + span.file)
translate-stmt.js → ast-stmt.js, translate-expr.js  (M6.5.b.2 makeStateDeclNode StateDecl arm; D-class translations)
translate-expr.js → ast-expr.js
collect-hoisted.js → ast-stmt.js
```
**(Native-parser sources CHANGED substantially this delta — S127-S129 M6.5.b.2.1/b.3/b.4/b.5/b.6 + M6.7 C/D-class: parse-stmt.js +412, parse-expr.js +230, parse-file.js +243, translate-stmt.js +112.)**

## Stdlib Runtime Shim Layout (compiler/runtime/stdlib/)

Top-level (19): auth, compiler (umbrella), cron, crypto, data, format, fs, host, http, mcp, oauth, path, process, redis, regex, router, store, test, time.
- `mcp.js` (MCP-V0.B/C/D — `scrml:mcp` runtime READ helpers + the full 11-tool MCP surface + `startMcpServer`/`shutdownMcpServer` boot over stdio). NOT in the default stdlib bundling allowlist — bundles only when an adopter opts in via `<program mcp>` (MCP-V0.D LANDED — build.js injects the boot import). mcp.js external imports: `node:fs` (readFileSync, watch), `node:path` (join), `node:url` (fileURLToPath) — eager Node built-ins — PLUS lazy dynamic `import()` of `@modelcontextprotocol/sdk` + `zod` at `startMcpServer()` boot only.
Subdirectories:
- `oauth/` — discord, github, google, microsoft, pkce (5 providers).
- `compiler/` — 13 per-stage thunks (bs, tab, mod, ce, bpp, pa, ri, ts, mc, me, dg, cg, expr) — each throws at call time with W-STDLIB-COMPILER-DEFERRED attribution.

`stdlib/mcp/index.scrml` (source stub) exports `startMcpServer`/`shutdownMcpServer`; compiler-internal — adopters opt in via `<program mcp>`, not a direct import; bundled from `compiler/runtime/stdlib/mcp.js`.

## Tags
#scrmlts #map #dependencies #bun #acorn #native-parser #m5-swap #m6-7-dclass #stdlib-shims #native-walker #mcp-v0 #mcp-descriptors #mcp-sdk #emit-each #iteration #lifecycle #code-segments #s131

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [build.map.md](./build.map.md)
