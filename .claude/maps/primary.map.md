# primary.map.md
# project: scrmlTS
# updated: 2026-05-07T00:10:00Z  commit: 7334fb0

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed `.js` + `.ts`; Bun runtime).
Framework:  Custom compiler — scrml language compiler.
Runtime:    Bun >= 1.3.13 (no Node.js dependency for compiler core; `node --check` used only as a syntax linter for emitted output).
Type:       Compiler + CLI tool + LSP server + 17-module stdlib.
Size:       ~24,739 LOC compiler / ~14,135 LOC codegen across 39 modules.
            ast-builder.js 9,306 LOC; type-system.ts 8,969 LOC; expression-parser.ts 2,722 LOC; tokenizer.ts 1,344 LOC; types/ast.ts 1,641 LOC.
            SPEC.md 24,911 lines (89 sections through §56); PIPELINE.md 2,380 lines (v0.7.0).
            LSP split: server.js 235 + handlers.js 2,113 + workspace.js 440 + l4.js ~600.
            Tests: 447 files, S65 baseline 9,019 pass / 44 skip / 1 todo / 0 fail.

## Map Index
| Map                      | Status  | Contents                                                                                       |
|--------------------------|---------|------------------------------------------------------------------------------------------------|
| structure.map.md         | present | directory layout, 6 entry points, full top-level inventory                                     |
| dependencies.map.md      | present | 2 runtime + 3 dev packages, full internal pipeline graph (BS→TAB→MOD→CE→VP-1→NR/SYM→PA→RI→TS→META→DG→BP→CG) |
| schema.map.md            | present | ~80 AST node kinds; ExprNode kinds; SQLChainedCall; ChannelDeclNode; reactive-decl→state-decl rename note |
| config.map.md            | present | 11 SCRML_*/PORT env vars; bunfig.toml; package.json; .gitignore; no CI/Docker                  |
| build.map.md             | present | 8 npm scripts, 7 CLI subcommands (incl. S65 promote stub), self-host build path                |
| error.map.md             | present | ~233 E-codes + ~42 W-codes; spec §34 anchor; recent S58-S65 additions enumerated               |
| test.map.md              | present | bun test, 447 files, 9,019 pass, 7 categories (unit/integration/conformance/browser/lsp/self-host/commands) |
| domain.map.md            | present | full pipeline + key spec sections + 22 architectural locks + phase status + codegen surfaces   |
| events.map.md            | present | `<channel>` (§38) + SSE (§37); no compiler-internal EventEmitter                               |
| non-compliance.report.md | present | 8 non-compliant + 5 uncertain; docs/changes/ batch entry; deep-dives still mis-located         |
| api.map.md               | absent  | not applicable (compiler, not web API; user programs declare their own routes via §12 / §40)   |
| state.map.md             | absent  | not applicable (compiler, not frontend app)                                                    |
| auth.map.md              | absent  | not applicable (compiler tool; auth lives in stdlib/auth + user programs)                      |
| style.map.md             | absent  | not detected                                                                                   |
| i18n.map.md              | absent  | not detected                                                                                   |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose                           |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no global migrations dir               |
| jobs.map.md              | absent  | stdlib/cron exists but project itself does not run jobs                                        |

## File Routing
types / interfaces / AST node kinds        -> schema.map.md
environment variables / config keys        -> config.map.md
test patterns / fixtures / runner          -> test.map.md
build commands / CLI subcommands           -> build.map.md
directory layout / entry points            -> structure.map.md
external packages / internal pipeline      -> dependencies.map.md
business rules / pipeline / spec sections  -> domain.map.md
error codes / warning codes / diagnostics  -> error.map.md
`<channel>` / SSE / runtime event wiring   -> events.map.md
docs hygiene / superseded artefacts        -> non-compliance.report.md

## Key Facts

- **Entry points:** Installed CLI is `compiler/bin/scrml.js` (`bin: scrml`); programmatic API is `compiler/src/api.js` running the canonical pipeline `BS → TAB → MOD → CE → VP-1/W-1 → NR/SYM → PA → RI → TS → META → DG → BP → CG`. LSP entry is `lsp/server.js --stdio`.

- **Active migration:** scrml v0.2.0 piecemeal rewrite is in flight. Stage 0a/0b/0b+ done; Phase A1a (lex+parse) COMPLETE at S61; Phase A1b (resolve+type) IN FLIGHT — B1 (S63 `9d2fa45`), B2 (S64 `0dee2f7`, E-NAME-COLLIDES-STATE), B3+B5 (S65) landed; B4, B6-B22 pending. Phase A1c (codegen+runtime) ratified, not started. 22 architectural locks (L1-L22; L22 type-as-argument added S65) + 20 moves (M7+M21 dropped) per master-list.md §0.

- **S65 wrap (commit 7334fb0):** parseVariant SHIPPED (L22 family member #1: stdlib enum + SPEC §41.13 + §53.14 + emit-parse-variant.ts 219 LOC); A+ verdict #1+#2+#3 carry-forward fully closed (E-SWITCH-FORBIDDEN + W-LIFECYCLE-CANDIDATE); ast-builder grammar fixes (export function decl swallow, export *, renamed re-exports); api.js cross-file enum chase; promotion ergonomics Tier A landed (CLI stub `commands/promote.js` + SPEC §56 + docs/articles/tier-ladder-promotion + primer); Tier B in flight in worktree `agent-a35e9695d1b010931`. Net +78 tests, 0 regressions.

- **AST contract:** `compiler/src/types/ast.ts` (1,641 LOC) is the canonical AST. ~80 `kind` discriminators. Note Phase A1a Step 3 (S59) renamed `kind: "reactive-decl"` → `kind: "state-decl"` — many older docs still reference the old name.

- **Codegen architecture:** `compiler/src/codegen/` has 39 modules including specialised emitters: `emit-client.ts` (1,112), `emit-control-flow.ts` (1,253), `emit-logic.ts` (1,895), `emit-reactive-wiring.ts` (1,002), `emit-html.ts` (915), `emit-server.ts` (905), `rewrite.ts` (1,861, mangler), `emit-machines.ts` (719), `emit-event-wiring.ts` (696), `emit-lift.js` (1,405), plus S40 additions `db-driver.ts` (151, Bun.SQL URI classification with E-SQL-005) and S65 additions `emit-parse-variant.ts` (219).

- **Database:** Bun.SQL only (no Prisma/Drizzle/TypeORM). Schemas declared per-file via `<schema>` (§39); reconciliation by `compiler/src/schema-differ.js`; multi-DB adaptation via `?{}` (§44); URI classification by `codegen/db-driver.ts`.

- **Open carry-forward bug:** ComponentDefNode classifier at `ast-builder.js:3634` still classifies any uppercase-named `const/let` as component-def regardless of RHS (S29-flagged through S65). `tab.test.js:649-654` encodes the bug as policy. Not on critical path.

- **Test runner:** Bun test, root `compiler/tests/`, timeout 10s. 7 categories (unit ~307, integration ~31, conformance 81, browser 11, lsp 10, self-host 4, commands 3). 447 total files. Two persistent self-host smoke failures historically deferred per user.

## Tags
#scrmlTS #map #primary #compiler #s65 #s66-refresh #parseVariant #a-plus-verdict #v0next #L22 #piecemeal-migration

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
- [SPEC.md](../../compiler/SPEC.md)
- [PIPELINE.md](../../compiler/PIPELINE.md)
