# primary.map.md
# project: scrmlTS
# updated: 2026-05-07T20:31:48Z  commit: a4eed93

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed `.js` + `.ts`; Bun runtime).
Framework:  Custom compiler — scrml language compiler.
Runtime:    Bun >= 1.3.13 (no Node.js dependency for compiler core; `node --check` used only as a syntax linter for emitted output).
Type:       Compiler + CLI tool + LSP server + 17-module stdlib.
Size:       ~24,739 LOC compiler / ~14,135 LOC codegen across 39 modules.
            SPEC.md 24,913 lines (§56 through §56.8); PIPELINE.md 2,380 lines (v0.7.0).
            Tests: 457 files, S67 close 9,241 pass / 54 skip / 1 todo / 0 fail (8,470 pre-commit subset).

## Map Index
| Map                      | Status  | Contents                                                                                                          |
|--------------------------|---------|-------------------------------------------------------------------------------------------------------------------|
| structure.map.md         | present | directory layout, 6 entry points, full top-level inventory                                                        |
| dependencies.map.md      | present | 2 runtime + 3 dev packages, full internal pipeline graph (BS→TAB→MOD→CE→VP-1→NR/SYM→PA→RI→TS→META→DG→BP→CG)     |
| schema.map.md            | present | ~80 AST node kinds; SYM types (B1-B10); B9 RelationalPredicateNode + ValidatorArg; validator-catalog types (B10)  |
| config.map.md            | present | 11 SCRML_*/PORT env vars; bunfig.toml; package.json; .gitignore; no CI/Docker                                     |
| build.map.md             | present | 8 npm scripts, 7 CLI subcommands (promote --match SHIPPED S66), docs/build.ts, S67 test count updated             |
| error.map.md             | present | ~233 E-codes + ~42 W-codes + I-MATCH-PROMOTABLE; S67 B7/B8/B9/B10 codes enumerated                               |
| test.map.md              | present | bun test, 457 files, 9,241 pass, 7 categories; 6 new S67 unit test files enumerated                              |
| domain.map.md            | present | full pipeline + key spec sections + 22 locks + phase status + S67 B7-B10 changes + A7/A8 ratified                |
| events.map.md            | present | `<channel>` (§38) + SSE (§37); no compiler-internal EventEmitter                                                 |
| non-compliance.report.md | present | S67 refresh: 16 new audit docs assessed; new docs/changes B7/B8/B9 dirs noted; IMPLEMENTATION-ROADMAP flagged    |
| api.map.md               | absent  | not applicable (compiler, not web API; user programs declare their own routes via §12 / §40)                      |
| state.map.md             | absent  | not applicable (compiler, not frontend app)                                                                       |
| auth.map.md              | absent  | not applicable (compiler tool; auth lives in stdlib/auth + user programs)                                         |
| style.map.md             | absent  | not detected                                                                                                      |
| i18n.map.md              | absent  | not detected                                                                                                      |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose                                             |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no global migrations dir                                  |
| jobs.map.md              | absent  | stdlib/cron exists but project itself does not run jobs                                                           |

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

- **Entry points:** Installed CLI is `compiler/bin/scrml.js` (`bin: scrml`); programmatic API is `compiler/src/api.js` running the canonical pipeline `BS → TAB → MOD → CE → VP-1/W-1 → NR/SYM → PA → RI → TS → META → DG → BP → CG`. LSP entry is `lsp/server.js --stdio`. Docs site builder is `docs/build.ts` (Bun, uses `marked`).

- **Active migration:** scrml v0.2.0 piecemeal rewrite in flight. Phase A1b (resolve+type) — B1 (S63), B2 (S64), B3+B5 (S65), B4+B6 (S66), **B7+B8+B9+B10 (S67) SHIPPED**. B11-B22 pending. Phase A1c (codegen+runtime) ratified (24 steps C0-C23, not started). 22 architectural locks (L1-L22; L22 type-as-argument S65) + 20 moves (M7+M21 dropped). Phase A7 (engine+temporal extensions) + Phase A8 (test-bind) ratified at S67; pending dispatch.

- **S67 wrap (commit a4eed93):** A1b Wave-3 partial ship. B7 — derived-cell dep DAG + E-DERIVED-CIRCULAR-DEP in `dependency-graph.ts` (DFS; blocks codegen per §6.6.10). B8 — L21 walker `walkDerivedMutationCheck` in `symbol-table.ts` (SYM PASS 6), backed by `derived-mutation-ops.ts` (ARRAY_MUTATING_METHODS + COMPOUND_ASSIGNMENT_OPS). B9 — `RelationalPredicateNode` AST kind + `ValidatorArg` union in `types/ast.ts`; `validator-arg-parser.ts` (268 LOC). B10 Phase 1 — `validator-catalog.ts` (289 LOC), UNIVERSAL_CORE_PREDICATES 14 entries per §55.1. B10 Phase 2 — SYM PASS 7 E-TYPE-031 (`walkValidatorTypeCheck`). B10 Phase 3 — E-VALIDATOR-CIRCULAR-DEP in `dependency-graph.ts`. SPEC §6.11 footnote corrected (canonical types at §55.5–§55.7). Primer §7 corrected (canonical §51.0.F `<engine>` syntax). Primer §8 corrected (14 predicates, not 18). master-list + IMPLEMENTATION-ROADMAP extended with A7 + A8. pa.md Rule 4 + dispatch-landing standing rule added. Test count: 9,241 full / 8,470 subset (+222 from S66). 6 new unit test files, 16 new audit docs.

- **AST contract:** `compiler/src/types/ast.ts` (1,641 LOC) is the canonical AST. ~80 `kind` discriminators + B9 adds `RelationalPredicateNode` (sibling of ExprNode, not in ExprNode union). `ValidatorArg = ExprNode | RelationalPredicateNode`. SYM stage annotates AST with `_scope`, `_record`, `_resolvedStateCell`, `_cellKind`, `_isBindable` (non-enumerable). Phase A1a Step 3 (S59) renamed `kind: "reactive-decl"` → `kind: "state-decl"`.

- **Codegen architecture:** `compiler/src/codegen/` has 39 modules. Key large modules: `emit-logic.ts` (1,895), `rewrite.ts` (1,861), `emit-lift.js` (1,405), `emit-control-flow.ts` (1,253), `emit-client.ts` (1,112), `emit-reactive-wiring.ts` (1,002), `emit-server.ts` (905), `emit-html.ts` (915), `emit-machines.ts` (719), `index.ts` (759). S40 addition: `db-driver.ts` (151). S65 addition: `emit-parse-variant.ts` (219).

- **Database:** Bun.SQL only. Schemas declared per-file via `<schema>` (§39); reconciliation by `compiler/src/schema-differ.js`; multi-DB adaptation via `?{}` (§44); URI classification by `codegen/db-driver.ts`.

- **Open carry-forward bug:** ComponentDefNode classifier at `ast-builder.js:3634` still classifies any uppercase-named `const/let` as component-def regardless of RHS (S29-flagged through S67). `tab.test.js:649-654` encodes the bug as policy. Not on critical path.

- **Test runner:** Bun test, root `compiler/tests/`, timeout 10s. 7 categories (unit ~307, integration ~31, conformance 81, browser 11, lsp 10, self-host 4, commands 3). 457 total files. Two persistent self-host smoke failures historically deferred per user.

## Tags
#scrmlTS #map #primary #compiler #s65 #s66 #s67 #s67-refresh #parseVariant #a-plus-verdict #v0next #L22 #piecemeal-migration #b4 #b6 #b7 #b8 #b9 #b10 #promote-tier-b #bare-dot-fix #derived-circular-dep #validator-circular-dep #validator-catalog #a7-ratified #a8-ratified

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
