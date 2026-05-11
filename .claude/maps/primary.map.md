# primary.map.md
# project: scrmlts
# updated: 2026-05-10T19:30:00Z  commit: f182f44

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 17-module stdlib
Size:       ~1,708 source files total; compiler/src: ~60k LOC across ~60 modules;
            SPEC.md ~24,382 lines; PIPELINE.md v0.7.1 (2026-05-09);
            Tests: 530 files, S78 close: 11,051 pass / 77 skip / 1 todo / 0 fail

## Map Index

| Map                      | Status  | Contents                                                                |
|--------------------------|---------|-------------------------------------------------------------------------|
| structure.map.md         | present | directory layout, 4 entry points, Phase A10 new files noted (63 lines)  |
| dependencies.map.md      | present | 2 root runtime + 2 compiler runtime + 4 dev packages; internal pipeline graph (100 lines) |
| schema.map.md            | present | ~80 AST node kinds (ast.ts); IR, CompileContext, BindingRegistry, VariantGuardOutput (195 lines) |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags (53 lines)        |
| build.map.md             | present | 8 npm scripts; pre-commit hook; no CI/CD; no Docker (78 lines)          |
| error.map.md             | present | CGError + 9 runtime error classes; ~35 E-code families; diagnostic walkers (111 lines) |
| test.map.md              | present | bun:test, 530 files, 11,051 pass; unit/integration/conformance breakdown (131 lines) |
| domain.map.md            | present | 36 domain concepts; 12-stage pipeline; Phase A10 engine/variant-guard (83 lines) |
| events.map.md            | present | no compiler-internal EventEmitter; WebSocket pub/sub in compiled output (44 lines) |
| api.map.md               | absent  | not applicable — compiler tool, not web API                              |
| state.map.md             | absent  | not applicable — compiler, not a frontend app                            |
| auth.map.md              | absent  | not applicable — auth lives in stdlib/auth and user .scrml programs      |
| style.map.md             | absent  | not detected                                                             |
| i18n.map.md              | absent  | not detected                                                             |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose     |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no migrations dir |
| jobs.map.md              | absent  | stdlib/cron exists but compiler itself does not run jobs                  |

## File Routing

types / interfaces / AST node kinds           → schema.map.md
environment variables / config keys           → config.map.md
test patterns / fixtures / runner             → test.map.md
build commands / CLI subcommands / hooks      → build.map.md
directory layout / entry points               → structure.map.md
external packages / internal pipeline graph   → dependencies.map.md
business rules / pipeline stages / spec       → domain.map.md
error codes / warning codes / diagnostics     → error.map.md
channel / SSE / runtime event wiring          → events.map.md
docs hygiene / superseded artifacts           → non-compliance.report.md

## Key Facts

- **Entry points:** CLI is `compiler/bin/scrml.js`; programmatic API is `compiler/src/api.js`; LSP server is `lsp/server.js --stdio`. Pipeline: BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → CG (12+ stages per PIPELINE.md v0.7.1).

- **Phase A10 SHIPPED (S78, 2026-05-10):** Engine state-child body render. New `compiler/src/codegen/emit-variant-guard.ts` (830 LOC) — variant-source-agnostic API `emitVariantGuardedRender(variantExprAccessor, arms, ctx, opts)`. Dispatcher swaps innerHTML on variant change; arm wire functions re-attach reactive wiring (`${@cell}` + non-delegable events) via per-arm dispose handles. Arm-tagged EventBindings (engineArm field) excluded from global DOMContentLoaded emission.

- **S77 codegen SHIPPED (2026-05-10):** `<onTimeout>` engine temporal surface (SPEC §51.12 A5-4), computed-delay form (A5-5/A5-5b), `<onIdle>` engine-wide watchdog (A5-6 Feature 2). All ride the §51.12 runtime backbone.

- **Test surface S78 close:** 11,051 pass / 77 skip / 1 todo / 0 fail. +7 binding-registry §7 unit tests (Phase A10); +30 conformance tests (13 codes backfill); ~12 sample compilation fixtures in compilation-tests/dist/ (via pretest).

- **AST authority:** `compiler/src/types/ast.ts` (1,793 LOC) — canonical. All node kinds carry `id: number` and `span: Span`. `kind: "state-decl"` (was "reactive-decl" pre-S59). `ValidatorArg = ExprNode | RelationalPredicateNode`. `ReactiveDeclNode.shape: "plain"|"decl-with-spec"|"derived"`.

- **Database:** Bun.SQL only. Schemas declared per-file via `<schema>` (§39); schema diffing via `compiler/src/schema-differ.js`; DB driver resolution via `codegen/db-driver.ts`.

- **Self-host:** `compiler/dist/self-host/*.js` and `compiler/self-host/dist/tab.js` are gitignored. Each machine builds locally via `scripts/rebuild-self-host-dist.ts` and `scripts/rebuild-tab-dist.ts`.

- **Pre-commit hook (installed S78):** `scripts/git-hooks/pre-commit` — runs `bun test unit + integration + conformance --bail`. Activated per machine: `git config core.hooksPath scripts/git-hooks`.

## Tags
#scrmlts #map #primary #compiler #s77 #s78 #phase-a10 #emit-variant-guard #engine-statechild #bun #pipeline #v0next

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [events.map.md](./events.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
