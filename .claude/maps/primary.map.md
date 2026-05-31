# primary.map.md
# project: scrmlts
# updated: 2026-05-31T05:32:43-06:00  commit: 09f74bee

## Project Fingerprint
Language:   TypeScript / JavaScript (mixed; Bun runtime)
Framework:  Custom compiler pipeline (no web framework)
Runtime:    Bun >=1.3.13
Type:       CLI compiler + language toolchain (single-file full-stack web language compiler)
Size:       ~1400 source files (852 test + 140 compiler/src + 30 native-parser + stdlib + lsp)
Version:    v0.7.0

## Map Index

| Map                  | Status  | Contents                                                      |
|----------------------|---------|---------------------------------------------------------------|
| structure.map.md     | present | directory layout, entry points, 12-stage pipeline overview + S147 source changes |
| dependencies.map.md  | present | 9 packages (3 runtime root + 2 compiler + 4 devDeps), internal graph (migrate.js → ast-builder.js added) |
| schema.map.md        | present | ~45 AST node types + armArrow field (S147), IR shapes, CGError, PA types, type-system internals |
| config.map.md        | present | 4 env vars, 3 config files                                    |
| build.map.md         | present | 12 npm scripts, maintenance scripts, pre-commit hook          |
| error.map.md         | present | 374 error codes (E-/W-/I-); W-MATCH-ARROW-LEGACY new (S147); E-PA-002 + E-DG-002 fix notes |
| test.map.md          | present | bun:test, 852 test files across 8 categories                  |
| domain.map.md        | present | 12-stage pipeline, 22 domain concepts, business invariants + arm-separator invariant |
| api.map.md           | absent  | no HTTP route handlers in compiler source                     |
| state.map.md         | absent  | no client state management (compiler is a pure function)      |
| events.map.md        | absent  | no EventEmitter/pubsub detected in compiler source            |
| auth.map.md          | absent  | auth is a COMPILED FEATURE (auth-graph.ts), not compiler auth |
| style.map.md         | absent  | no design tokens or CSS framework in compiler source          |
| i18n.map.md          | absent  | no i18n detected                                              |
| infra.map.md         | absent  | no Dockerfile, CI workflows, or IaC detected                  |
| migrations.map.md    | absent  | no database migrations (runtime DBs are user-app concerns)    |
| jobs.map.md          | absent  | no job scheduler in compiler source                           |

## File Routing

| Query | Map |
|-------|-----|
| types / interfaces / AST node shapes | schema.map.md |
| error codes / CGError / diagnostic stream | error.map.md |
| environment variables / config keys | config.map.md |
| test patterns / fixtures / conformance | test.map.md |
| build commands / pre-commit hook | build.map.md |
| directory layout / entry points / pipeline stages | structure.map.md |
| external packages (acorn, astring, MCP SDK, vscode-languageserver) | dependencies.map.md |
| domain concepts (BS/TAB/NR/MOD/CE/PA/RI/TS/META/DG/CG stages) | domain.map.md |
| business invariants (null-not-in-scrml, auth-content-not-gated, arm-separator, etc.) | domain.map.md |

## Key Facts
- Entry point: `compiler/src/cli.js` → subcommand router; public API in `compiler/src/api.js` → `compileScrml()`
- Pipeline: 12 ordered stages BS → TAB → NR → MOD → CE → PA → RI → TS → META → VSS → DG → CG; stage contracts at `compiler/PIPELINE.md` v0.7.2
- Spec: `compiler/SPEC.md` (30,704 lines, 58 sections + appendices); normative per pa.md Rule 4
- Error surface: CGError with `severity: 'error'|'warning'|'info'`; W-*/I-* → result.warnings (non-fatal); all else → result.errors (fatal, CLI exit 1)
- Match arm separator: `:>` is canonical (SPEC §18.2 / §34, S147); `=>` / `->` are deprecated aliases that still parse; W-MATCH-ARROW-LEGACY fires at each deprecated-glyph arm; `bun scrml migrate --fix` (AST-driven) rewrites them
- arm-arrow migration: `rewriteMatchArmArrows()` in `commands/migrate.js` drives the live BS+TAB front-end and rewrites ONLY at recorded arm-span offsets — never touches lambda arrows or `fn`-return arrows
- E-PA-002 fix (R28-4): `extractCreateTableStatements` in `protect-analyzer.ts` now cycle-safe depth-first walk over all child-bearing fields; CREATE TABLE in `?{}` under fn-decl bodies or `${}` logic blocks is now found
- E-DG-002 fix (R28-1d): two false-positive classes closed in `dependency-graph.ts` — lambda-body `@var` reads (SB1) and `<match on=@cell>` block-form headers (SB2) now credited to `reactiveVarReaders`
- errorBoundary: `compiler/src/codegen/emit-error-boundary.ts` (+320L, §19.6); typed `!`-error path + host-JS try/catch backstop
- SSE wiring: GITI-025+026 landed in `emit-client.ts` / `emit-server.ts` — server param-bind via `route.query`, reactive `@cell=gen()` per-event callback, named-event `addEventListener`
- Security warning: W-AUTH-CONTENT-NOT-GATED (GITI-027A) — `<auth role="X">` gates JS-mount only, NOT served HTML; fires from `auth-graph.ts:627`
- Type system: `type-system.ts` is 15994 lines; the largest single source file; handles TS/engine typing, linear type enforcement, validity-surface synthesis
- Native parser: `compiler/native-parser/` has paired `.js` + `.scrml` bootstrap; activated via `--parser=scrml-native`; M5-swap to replace BS+TAB not yet complete
- null/undefined: BOTH do not exist in scrml (`W-ABSENCE-IN-SCRML-SOURCE`); `""` / `0` / `false` ARE defined values (not absence)
- Test count: 852 test files; pre-commit hook runs full suite before every commit; --no-verify is prohibited

## Tags
#scrmlts #map #primary #compiler #bun #v0.7.0

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
