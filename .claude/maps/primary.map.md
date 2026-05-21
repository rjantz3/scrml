# primary.map.md
# project: scrmlts
# updated: 2026-05-21T15:00:00Z  commit: 67a17dc5

## Project Fingerprint
Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3119 git-tracked files
Watermark:  HEAD 67a17dc5 (2026-05-21)

## Map Index
| Map                  | Status  | Contents                                       |
|----------------------|---------|------------------------------------------------|
| structure.map.md     | present | directory layout, entry points                 |
| dependencies.map.md  | present | 2 root + 2 compiler runtime deps, module graph  |
| schema.map.md        | present | FileAST / ASTNode / LogicStatement / Cg* types  |
| config.map.md        | present | 2 env vars, compiler option flags               |
| build.map.md         | present | bun scripts, CLI subcommands, git hooks         |
| error.map.md         | present | 12 stage diagnostic classes, ~30 code families  |
| test.map.md          | present | bun test, 738 test files, parser-conformance    |
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
types / interfaces / AST shapes        → schema.map.md
pipeline stages / native parser / M5   → domain.map.md
compiler option flags / env vars       → config.map.md
build commands / CLI / git hooks       → build.map.md
test layout / parser-conformance       → test.map.md
directory layout / entry points        → structure.map.md
external packages / module graph       → dependencies.map.md
diagnostic classes / error codes       → error.map.md

## Key Facts
- `compileScrml(options)` in compiler/src/api.js is the pipeline orchestrator —
  a 25-stage chain BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG.
- The M5 swap target is the BS+TAB seam in api.js. The native parser
  (compiler/native-parser/) replaces BS + Acorn + BPP; at HEAD `--parser=scrml-native`
  is observability-only (api.js:1835, I-PARSER-NATIVE-SHADOW). The downstream
  bridge was cost-deferred — see native-parser/M5-ast-bridge-scoping.md.
- Stage 3.004 (PRECG) was relocated out of TAB at S115 so any front-end can feed
  the back-end: computePGOFlags + computeProgramConfig run pipeline-agnostically.
- The central data structure is `FileAST` (compiler/src/types/ast.ts:1487);
  native-parser output does NOT yet conform to it (separate Expr/Stmt/Block
  catalogs) — that mismatch is the M5-FULL bridge work.
- scrml SOURCE has no exceptions and no `null`/`undefined` (memory S89); the
  COMPILER has 12 per-stage host-side diagnostic classes plus a runtime
  `_ScrmlError` hierarchy embedded into emitted apps.
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs
  unit+integration+conformance, never bypass `--no-verify` without authorization.
- SPEC.md (57 sections) is normative per pa.md Rule 4; §34 is the error catalog.

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
