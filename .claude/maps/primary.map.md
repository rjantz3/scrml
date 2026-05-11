# primary.map.md
# project: scrmlts
# updated: 2026-05-11T17:00:00Z  commit: b6c8e1c

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 17-module stdlib
Size:       ~1,710 source files total; compiler/src: ~60k LOC across ~60 modules;
            SPEC.md 26,286 lines; SPEC-INDEX.md 306 lines;
            PIPELINE.md v0.7.1 (2026-05-09);
            Tests: 535 files, S81 close: 11,163 pass / 77 skip / 1 todo / 0 fail

## Key Facts (S81 close — adopter-override surface + Phase A10 closure)

**S81 SHIPPED (2026-05-11):**
- F.1 `<program cors-max-age=N>` — Access-Control-Max-Age override (default 86400s) per §39.2.1 amendment. `parseCorsMaxAge` helper in `emit-server.ts`.
- F.2 `<program channel-reconnect=N>` — project-level WS reconnect cadence (default 2000ms) per §38.3.1 NEW subsection. `parseChannelReconnect` helper in `emit-channel.ts`. Per-channel `<channel reconnect=>` still wins.
- A10-followon: TS body-walk re-enabled on engine-decl + payload-binding scope injection. Engine-arm bodies now type-checked; typos like `${mssg}` inside `<Error msg>` fire E-SCOPE-001.
- Strict self-host rebuild gate: `scripts/rebuild-self-host-dist.ts` now exits 1 on host-compiler errors (closes pre-S81 silent leak). Source-side null/undefined sweep DEFERRED per `docs/audits/self-host-spec-conformance-2026-05-11.md`.
- SPEC-INDEX regen: new `scripts/regen-spec-index.ts` (TS, idempotent, line-range refresh preserving summaries). 62 rows refreshed.

**S80 SHIPPED (2026-05-11):**
- Auth/protect/csrf attribute-host codification. **E-MW-001 RETIRED**. `<channel protect=>` → `<channel auth=>`. `<program protect=>` shorthand retired. csrf= collapsed to `"auto"|"off"` per §52.13 (W-ATTR-002 on invalid literals).
- Library-mode meta-block strip FIX (paren-aware regex in `emit-library.ts`).
- A5-7 canonical samples engine-005…engine-008 landed.

**S79 SHIPPED:**
- 5 hardcoded-threshold injection points: `MAX_RUNS`, `EncodingContext.seqCap`, serve-client timeouts, `<program idempotency-ttl=>`, `<program batch-in-list-cap=>`.
- A5-6 Feature 1: named `<onTimeout name=>` + `cancelTimer()` builtin.
- Debounce/throttle Approach B: clean-cut deletion of `reactive-debounced-decl` AST kind in favor of canonical `<x debounced=Nms>` attribute per §6.13.

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

## Task-Shape Routing (agents — read this section first)

**Compiler-source bug fix** (parser / typer / codegen / runtime emit / boundary inference):
1. `domain.map.md` — locate the pipeline stage that owns the symptom (12-stage pipeline + Phase A10 surface)
2. `structure.map.md` — confirm the file path under `compiler/src/`
3. `error.map.md` — if symptom is a diagnostic, locate the fire-site
4. `schema.map.md` — if the bug touches AST shape

**New language feature implementation** (new AST kind / new error code / new SPEC section):
1. `domain.map.md` — confirm the feature lives in an existing pipeline stage OR identify the boundary
2. `schema.map.md` — register the new AST node kind shape (canonical home: `compiler/src/types/ast.ts`)
3. `error.map.md` — register the new error code if any
4. `test.map.md` — locate the right test directory and conformance hooks

**Refactor / cleanup / rename** (mechanical or semi-mechanical sweep):
1. `structure.map.md` — full file inventory
2. `dependencies.map.md` — internal pipeline graph (catches cross-stage callers)
3. `schema.map.md` — if a node kind is being renamed (e.g., the `reactive-decl` → `state-decl` rename at S59 Step 3 touched ~514 sites)

**Test authoring** (unit / integration / conformance / browser):
1. `test.map.md` — runner, fixtures, current test counts, per-directory conventions
2. `error.map.md` — if writing conformance tests for an error code

**Spec amendment** (SPEC.md edit / new normative statement / SPEC-INDEX refresh):
1. `domain.map.md` — confirm spec text matches the code reality being amended
2. `error.map.md` — if the amendment adds / renames / deletes an error code
3. `non-compliance.report.md` — check if the amendment closes any flagged drift

**Audit / diagnostic** (read-only — no code change; observation only):
1. `non-compliance.report.md` — first stop for hygiene findings PA can act on
2. `domain.map.md` — for behavioral / pipeline-stage analysis
3. `dependencies.map.md` — for cross-cutting impact analysis

**Don't know which** (e.g., open-ended task brief from user):
1. Read `primary.map.md` (this file) in full
2. Read the **Task-Shape Routing** section above and self-classify
3. If the classification is genuinely unclear, surface to PA before consuming further context

## Use feedback loop

When this map's content was load-bearing for a dispatch outcome, the agent's final report should
note **"map content consulted: [list of map files]; load-bearing finding: [one sentence]"**. When
the map content was NOT useful, report **"maps consulted but not load-bearing"** so PA can
diagnose whether the wrong maps were named in the brief OR the map content is at the wrong
granularity (PA-side fix). 3-5 consecutive "not load-bearing" reports on the same task shape
trigger a map-design review.

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
