# primary.map.md
# project: scrmlts
# updated: 2026-05-11T20:35:00Z  commit: 28cd2ac (v0.2.4 — Wave 1 + Wave 1.5 robust-v0.2 bundle)

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 17-module stdlib
Size:       ~1,710 source files total; compiler/src ≈ 99,603 LOC; codegen subdir ≈ 30,891 LOC;
            SPEC.md 26,286 lines; SPEC-INDEX.md 306 lines;
            PIPELINE.md v0.7.1 (2026-05-09);
            samples/compilation-tests: 795 .scrml total (287 top-level);
            Tests: 554 files, v0.2.4 close: ~11,500 pass / 77 skip / 1 todo / 0 fail

## Key Facts (S84 close — v0.2.4 robust-v0.2 bundle)

**v0.2.4 SHIPPED (2026-05-11 — Wave 1 + Wave 1.5, 12 commits since v0.2.3):**

Wave 1 (compiler-correctness, B1-surfaced gaps):
- **Bug 1** `not <expr>` operator-form lowers to `!<expr>` (§45.7). Disambiguates from §42 value-form. New `not <operand>` rewrites in `compiler/src/codegen/rewrite.ts:715-737` (_rewriteNotSegment) + `compiler/src/expression-parser.ts:768-792` (preprocessForAcorn).
- **Bug 2** Match pipe-alternation in `rewriteMatchExpr` + `emit-control-flow.ts` + `preprocessForAcorn` lookbehind. `InlineMatchArm.tests?: string[]`; `MatchArm.tests[]` mirror in block-form match; `parseInlineMatchArm` / `parseMatchArm` alternation regex tried BEFORE single-variant.
- **Bug 3** E-DG-002 false-fire on derived-engine projected vars. `compiler/src/dependency-graph.ts:1743-1761` `creditReader` credits BOTH original AND redirect target.
- **Bug 4** Typed state-decl registration. `compiler/src/ast-builder.js:2846` `collectTypeAnnotation` tracks paren + brace + bracket depths cohesively (was: paren-only). NOTE: bug brief incorrectly named `symbol-table.ts` — actual fix landed in `ast-builder.js`; depth-of-survey-discount #8.
- **Bug 5** Bare-variant inference at binary-expression positions (==, !=, is, is-not). `compiler/src/type-system.ts:6613` new helper `inferBareVariantsAtComparisonSites`.
- **Bug 6** `.advance(.Variant.history)` test-hardening. `engine-a7-history.test.js` + `engine-event-handler-writes.test.js`. Codegen was already correct since S83 Wave 2.4 Bug #2 keystone ("Approach B 8th positional `isHistoryRestore` arg"); test-coverage gap closed.

Wave 1.5 (secondary-surface follow-ons surfaced by Wave 1):
- **Bug 6.5** `_makeExprCtx` missing `enginesWithHistory` forward → function-body `.advance(.X.history)` null-padded history-map. Fix at `compiler/src/codegen/emit-logic.ts:134` (interface) + `:460-468` (forward).
- **Bug 4.5 + Bug 5 follow-on** Bare-variant inference extensions: (a) thread LHS enum through nested struct literals in array-typed initializers; (b) wire inference into if/while cond, return-stmt, call-arg. New helpers `inferBareVariantsWithStructNav` (`type-system.ts:6382`), `inferBareVariantsAtCallArgs` (`:6859`), `fnSignatures` map (`:3682`), `enclosingFnReturnTypeStack` (`:3666`). +bar-form enum parser parity in `meta-checker.ts`.
- **Bug 1.1** Lift attr-value join preserves word-boundary whitespace (was: `not t.completed` → `nott.completed`). New helper `_joinPreservingWordBoundary` at `compiler/src/ast-builder.js:1675` + call-site swap in `_parseLiftAttrValue` (~line 2783).
- **Bug 1.2** SQL-ref placeholder + const/let SQL init. `tryConsumeSqlInit` hooks at 9 call-sites in `ast-builder.js:3100` (4 new for let/const-decl: lines 4120, 4209, 4239, 4265, 4358, 4377, 6172, 6201, 6302). Emitter guard for `sql-ref:-1` in `emit-expr.ts`. 5 downstream consumer updates (emit-logic.ts, emit-control-flow.ts, route-inference.ts, meta-checker.ts, type-system.ts).
- **Bug 1.3** GITI-001 IIFE wrap context-aware (statement vs expression context). `compiler/src/codegen/emit-client.ts:892-905`. No more `(async () => ...)();)` malformed-syntax shape.
- **Bug 14** test-channel-audit. 1 Class B fix at `compiler/tests/unit/gauntlet-s19/phase3-wrapup.test.js` (`compileWholeScrml` now surfaces `result.warnings`). 77 skipped tests audit (all valid deferrals; test-hygiene grade A+).

**Forward signal — Insight 29 ratified (perf-feel debate, 2026-05-11):**
- Approach A (whole-stack closure analysis) = **v0.3.0 spec-amendment target**.
- Approach B (telemetry-augmented PGO) = **deferred to v2** extension (per llvm-pgo-expert flip).
- Approach D (RSC + per-route + streaming + bridges) = rejected as v1 default.
- Insight 29 at `scrml-support/design-insights.md`.

**Reference function-level landmarks (Bug 4 gap closure):**
- `compiler/src/symbol-table.ts` — `walk` at `:1192`, `registerStateDecl` at `:882`, B1-B22 doc-header at lines 1-100. SYM passes: PASS 10.A/10.B B14, PASS 11 B15, PASS 12 B16, PASS 13 B17, PASS 14 B22, PASS 15 B19, PASS 16 A5-3.
- `compiler/src/ast-builder.js` — `collectTypeAnnotation` at `:2846`, `_joinPreservingWordBoundary` at `:1675`, `tryConsumeSqlInit` at `:3100` (9 call sites).
- `compiler/src/type-system.ts` — `inferBareVariantsAtComparisonSites` at `:6613`, `inferBareVariantsWithStructNav` at `:6382`, `inferBareVariantsAtCallArgs` at `:6859`, `fnSignatures` map at `:3682`, `enclosingFnReturnTypeStack` at `:3666`.
- `compiler/src/codegen/emit-logic.ts` — `_makeExprCtx` at `:460` (forwards `enginesWithHistory` post-Bug-6.5).

**Carry-forward — pre-v0.2.4 historical milestones (S77-S81):**
- **Phase A10 SHIPPED S78** — Engine state-child body render. `emit-variant-guard.ts` (830 LOC).
- **S77 codegen** — `<onTimeout>` (A5-4), computed-delay (A5-5/A5-5b), `<onIdle>` (A5-6 Feature 2).
- **S79** — A5-6 Feature 1 (named `<onTimeout name=>`); debounce/throttle Approach B (`reactive-debounced-decl` retired).
- **S80** — Auth attribute-host codification (E-MW-001 RETIRED); `<channel auth=>` replaces `protect=`.
- **S81** — `<program cors-max-age=>`, `<program channel-reconnect=>`; SPEC-INDEX regen script.

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
#scrmlts #map #primary #compiler #s84 #v0.2.4 #wave-1 #wave-1.5 #robust-v0.2 #insight-29-ratified #bun #pipeline #v0next #symbol-table-landmarks-added #depth-of-survey-discount-8

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
