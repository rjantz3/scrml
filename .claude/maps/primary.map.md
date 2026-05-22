# primary.map.md
# project: scrmlts
# updated: 2026-05-21T21:30:00Z  commit: 26e82466

## Project Fingerprint
Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3143 git-tracked files
Watermark:  HEAD 26e82466 (2026-05-21) — package.json v0.6.0

## Map Index
| Map                  | Status  | Contents                                       |
|----------------------|---------|------------------------------------------------|
| structure.map.md     | present | directory layout, entry points, native-parser  |
| dependencies.map.md  | present | 2 root + 2 compiler runtime deps, module graph  |
| schema.map.md        | present | FileAST / ASTNode / native catalogs / bridge    |
| config.map.md        | present | 2 env vars, compiler option flags               |
| build.map.md         | present | bun scripts, CLI subcommands, git hooks         |
| error.map.md         | present | 11 stage classes, §34.1 79-code native catalog  |
| test.map.md          | present | bun test, 728 test files, parser-conformance    |
| domain.map.md        | present | 25-stage pipeline, M5 swap seam, native parser  |
| api.map.md           | absent  | no HTTP API surface (compiler, not a server)    |
| state.map.md         | absent  | no app state store (compiler)                   |
| events.map.md        | absent  | no event bus                                    |
| auth.map.md          | absent  | auth is a scrml LANGUAGE feature, not app infra |
| migrations.map.md    | absent  | no DB migration tooling (test *.db throwaway)   |
| jobs.map.md          | absent  | no job/queue scheduler                          |
| infra.map.md         | absent  | no Docker / CI / IaC                            |
| style.map.md         | absent  | no design-token system                          |
| i18n.map.md          | absent  | no i18n                                         |

## File Routing
types / AST shapes / native catalogs   → schema.map.md
pipeline stages / native parser / M5   → domain.map.md
native-parser layout / bridge modules  → structure.map.md
compiler option flags / env vars       → config.map.md
build commands / CLI / git hooks       → build.map.md
test layout / parser-conformance       → test.map.md
external packages / module graph       → dependencies.map.md
diagnostic classes / error codes       → error.map.md

## Key Facts
- `compileScrml(options)` in compiler/src/api.js is the pipeline orchestrator —
  a 25-stage chain BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG.
- The M5 swap target is the BS+TAB seam in api.js. The native parser
  (compiler/native-parser/) replaces BS + Acorn + BPP; at HEAD `--parser=scrml-native`
  is still observability-only (api.js:1835, I-PARSER-NATIVE-SHADOW).
- S118/S119 landed the native→live FileAST BRIDGE layer: translate-stmt.js (R1 —
  native Stmt[] → live LogicStatement[]), translate-expr.js (A2 — native Expr →
  live ExprNode), collect-hoisted.js (A3 — native Block[] → imports/exports/
  typeDecls/components/machineDecls/channelDecls/hasProgramRoot, with declaration-
  node synthesis). These are pure exit-shapers; `parseProgram`/`parseExpression`/
  `parseMarkup` stay pure. The NEXT dispatch (C1) composes them into a
  `nativeParseFile` FileAST assembler and wires it into the api.js seam.
- S118 also landed native-parser productions B1-B7 (`?`, `!{}`, `~`-decl, `lin`,
  `type`, `fn`/`server`/`pure`, `throw`/`try` rejection); native StmtKind is 20
  variants, ExprKind 40. F4 retired the zero-consumer SpanTable.
- The central data structure is `FileAST` (compiler/src/types/ast.ts:1487). The
  native catalogs (Stmt[], Expr, Block[]) are PascalCase ESTree-shaped; the live
  FileAST uses lowercase scrml kinds — the bridge does the N×M structural translation.
- scrml SOURCE has no exceptions and no `null`/`undefined` (memory S89); the
  COMPILER has 11 per-stage host-side diagnostic classes plus a runtime
  `_ScrmlError` hierarchy embedded into emitted apps. §34.1 catalogs 79
  native-parser parse diagnostics (66 seeded S117, +13 in S118 B-waves).
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs
  unit+integration+conformance, never bypass `--no-verify` without authorization.
- SPEC.md is normative per pa.md Rule 4 (58 sections; §58 Build Story added S118,
  spec-ahead-of-implementation; §34 is the error catalog).

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #pipeline

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
