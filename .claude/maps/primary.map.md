# primary.map.md
# project: scrmlts
# updated: 2026-05-12T21:42:04Z  commit: f1555b4

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 20-module stdlib
Size:       ~1,800+ source files total; compiler/src ≈ 110,000+ LOC; codegen subdir ≈ 32,000+ LOC;
            SPEC.md 26,942 lines; SPEC-INDEX.md 308 lines;
            PIPELINE.md 2,758 lines;
            samples/compilation-tests: ~795 .scrml total;
            Tests: 554 files — **11,153 pass / 85 skip / 1 todo / 0 FAIL** (S87 close)

## Key Facts (S87 CLOSE — 2026-05-12 — HISTORIC 37-commit session)

**Current shipped version: v0.2.6 (`efbd1e8`)**
All seven semver tags live on origin: v0.2.0 `022ee02` + v0.2.1 `d72c074` + v0.2.2 `98e872d` + v0.2.3 `d512266` + v0.2.4 `28cd2ac` + v0.2.5 `2c687b5` + v0.2.6 `efbd1e8`.
HEAD `15850d0` is NOT tagged — v0.3.0 cut path well-cleared; awaiting LIFT-template bug fixes + Wave 4 adopter content.

**2 v0.3.0 BLOCKERS CLOSED in S87:**
- **Insight 30 (channel-architecture)** — PURE-CHANNEL-FILE dispensation (Option b ratified 47/44/44); `<channel>` at file-top in module files is canonical. SPEC §38.1 + walker pre-check in `validators/ast-walk.ts`. E-CHANNEL-INSIDE-PROGRAM RETIRED; E-CHANNEL-OUTSIDE-PROGRAM is the new enforcement code.
- **Bug 3a (SQL emission)** — `emit-server.ts` now hoists `import { SQL } from "bun"; const _scrml_sql = new SQL(...)` declarations. Closes latent `ReferenceError: _scrml_sql is not defined` in all server outputs using SQL.

**Major compiler bugs CLOSED in S87 (37 commits, zero regressions):**
- Bug 1: 14-mario codegen+runtime (4 sub-fixes: payload binding / `::` rewrite / engine-routing / derived_get tracks)
- Bug 2a: component-expander if-chain branches + VP-2 ast-walk backstop
- Bug 2c: bind:value mangle in expanded component bodies (normalizeTokenizedRaw regex 1-line fix)
- Bug 3a: SQL `_scrml_sql` declaration emission (v0.3.0 blocker closed)
- Bug 4: walkMarkupContext extension (1 actual false-fire, not 4 as briefed)
- Bug 4.5: dependency-graph call-ref args tracking
- Bug 1.5: reactive-deps engine-var markup-binding
- Bug 1.6+1.7: match-arm bundle (1.6 already fixed; 1.7 inline-arm engine-write routing was the gap)
- Bug 5: method-chain callback preservation (`.filter(cb)` no longer strips callback)
- Bug 6: lift codegen silent data-loss (`<li>` for-loop bodies inside `<ul>` lift contexts were DROPPED)
- Bug 6.5: match-arm inline-markup arm payload
- Bug 6.5.1: named-binding parser (`.V(field: local)` now correctly binds `local`)
- BS comment-skip: block-splitter now suppresses `<!-- -->` HTML comments

**Design outcomes S87:**
- **Option (d) engine self-write synthesis** — runtime NO-OP + W-ENGINE-SELF-WRITE-DETECTED info lint + SPEC §51.0.F.1. 14-mario AC delta 1/8→8/8.
- **Insight 30 ratified** — channel-architecture OQ closed via dispensation (same synthesis-pattern as §40.8.1 Option C + Option d).
- **Synthesis-pattern as design-methodology signal** — frequency-3 in S86-S87.

**stdlib Phase 1 SHIPPED:** 173× `===`/`!==` → `==`/`!=` sweep across 20 modules. +28 guard tests.
**emit-expr Option A SHIPPED:** comprehensive engine-routing all expression contexts.
**Wave 3 fixture-sweep COMPLETE:** trucking-dispatch 24/36 pages migrated; 12 remaining are genuine spec violations awaiting LIFT fixes.
**migrate.js Wave 3.5 BUNDLE:** 4 unwrap-path bug families closed (container-aware + scope-safe + comment-safe).

**5 LIFT-template codegen bug families SURFACED (HIGH-PRIORITY for v0.3.0 cut):**
- LIFT-1 (CATASTROPHIC): parens-attr in lift template elides parent element + duplicates inner text
- LIFT-2/3/4 BUNDLE: bind:/if=/onkeydown inside lift template fall back to literal `setAttribute`
- LIFT-5 (probable runtime breakage): if-inside-for reconciler-factory `_scrml_lift_target` ambient gap
Anchor tests in: `lift-li-text-template.test.js` (§B.*) + `todomvc-fixture-edit-mode.test.js` (§B.1-4)
Root module: `compiler/src/codegen/emit-lift.js`. Recommended: 3-dispatch decomposition for S88.

## Map Index

| Map                      | Status  | Contents                                                                |
|--------------------------|---------|-------------------------------------------------------------------------|
| structure.map.md         | present | directory layout, entry points, S87 new files (100 lines)              |
| dependencies.map.md      | present | 5 root+compiler runtime + 5 dev packages; internal pipeline graph (107 lines) |
| schema.map.md            | present | ~80 AST node kinds; ChannelDeclNode [S87]; DB scope collection; IR; CompileContext (226 lines) |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags (53 lines)       |
| build.map.md             | present | 11 npm scripts + e2e scripts [S85]; pre-commit hook; CLI subcommands (95 lines) |
| error.map.md             | present | CGError + 9 runtime error classes; W-ENGINE-SELF-WRITE-DETECTED [S87]; LIFT-1..5 open families; channel codes (136 lines) |
| test.map.md              | present | bun:test, 554 files, 11,153 pass; S87 new test files; LIFT anchor tests; e2e Playwright (193 lines) |
| domain.map.md            | present | 38+ domain concepts; v0.3.0 blocker status; LIFT open families; Insight 30; Option (d) (116 lines) |
| events.map.md            | present | no compiler EventEmitter; channel placement rules [S87]; WebSocket pub/sub in compiled output (55 lines) |
| api.map.md               | absent  | not applicable — compiler tool, not web API                             |
| state.map.md             | absent  | not applicable — compiler, not a frontend app                           |
| auth.map.md              | absent  | not applicable — auth lives in stdlib/auth and user .scrml programs     |
| style.map.md             | absent  | not detected                                                            |
| i18n.map.md              | absent  | not detected                                                            |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose    |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no migrations dir |
| jobs.map.md              | absent  | stdlib/cron exists but compiler itself does not run jobs                 |

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

**LIFT-template bug fix** (LIFT-1..5 — highest priority S88 target):
1. `error.map.md` — read the LIFT bug family table; confirm which LIFT-N is in scope
2. `structure.map.md` — root module is `compiler/src/codegen/emit-lift.js`
3. `test.map.md` — broken-output anchor tests in `lift-li-text-template.test.js` §B.* and `todomvc-fixture-edit-mode.test.js` §B.*; these tests assert CURRENT BROKEN OUTPUT and MUST be upgraded when the bug is fixed

**New language feature implementation** (new AST kind / new error code / new SPEC section):
1. `domain.map.md` — confirm the feature lives in an existing pipeline stage OR identify the boundary
2. `schema.map.md` — register the new AST node kind shape (canonical home: `compiler/src/types/ast.ts`)
3. `error.map.md` — register the new error code if any
4. `test.map.md` — locate the right test directory and conformance hooks

**Refactor / cleanup / rename** (mechanical or semi-mechanical sweep):
1. `structure.map.md` — full file inventory
2. `dependencies.map.md` — internal pipeline graph (catches cross-stage callers)
3. `schema.map.md` — if a node kind is being renamed

**Test authoring** (unit / integration / conformance / browser):
1. `test.map.md` — runner, fixtures, current test counts, per-directory conventions
2. `error.map.md` — if writing conformance tests for an error code

**Spec amendment** (SPEC.md edit / new normative statement / SPEC-INDEX refresh):
1. `domain.map.md` — confirm spec text matches the code reality being amended
2. `error.map.md` — if the amendment adds / renames / deletes an error code
3. `non-compliance.report.md` — check if the amendment closes any flagged drift

**Migrate / promote command work:**
1. `structure.map.md` — confirm file path: `compiler/src/commands/migrate.js` (~1,940 LOC post-S87)
2. `domain.map.md` — read "migrate --program-shape" and "BS comment-skip" concept entries
3. `test.map.md` — migrate test files: `scrml-migrate.test.js`, `migrate-program-shape.test.js`, `migrate-program-shape-wave-3.5-bundle.test.js`

**Channel architecture work:**
1. `domain.map.md` — read "Channel placement (v0.3)" + "PURE-CHANNEL-FILE" concept entries
2. `events.map.md` — Channel Placement Rules section
3. `error.map.md` — E-CHANNEL-OUTSIDE-PROGRAM + E-CHANNEL-INSIDE-PAGE entries

**Audit / diagnostic** (read-only — no code change):
1. `non-compliance.report.md` — first stop for hygiene findings PA can act on
2. `domain.map.md` — for behavioral / pipeline-stage analysis
3. `dependencies.map.md` — for cross-cutting impact analysis

**Don't know which** (e.g., open-ended task brief):
1. Read `primary.map.md` (this file) in full
2. Read the **Task-Shape Routing** section above and self-classify
3. If classification is genuinely unclear, surface to PA before consuming further context

## Use feedback loop

When this map's content was load-bearing for a dispatch outcome, the agent's final report should
note **"map content consulted: [list of map files]; load-bearing finding: [one sentence]"**. When
the map content was NOT useful, report **"maps consulted but not load-bearing"** so PA can diagnose.
3-5 consecutive "not load-bearing" reports on the same task shape trigger a map-design review.

## Key Facts

- **Entry points:** CLI is `compiler/bin/scrml.js`; programmatic API is `compiler/src/api.js`; LSP server is `lsp/server.js --stdio`. Pipeline: BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → CG (12+ stages per PIPELINE.md).

- **Phase A10 SHIPPED (S78):** Engine state-child body render. `compiler/src/codegen/emit-variant-guard.ts` (830 LOC). Dispatcher swaps innerHTML on variant change; arm wire functions re-attach reactive wiring.

- **v0.3.0 BLOCKERS (as of S87 close):** LIFT-1 (catastrophic) + LIFT-2/3/4 bundle + LIFT-5 (ambient state gap) — all in `compiler/src/codegen/emit-lift.js`. Plus Wave 4 adopter content. Two major blockers CLOSED S87 (Insight 30 channel-architecture + Bug 3a SQL emission).

- **AST authority:** `compiler/src/types/ast.ts` (1,828 LOC). All nodes carry `id: number` and `span: Span`. `kind: "state-decl"` (was "reactive-decl" pre-S59). `ChannelDeclNode` interface added S86/S87 for P3.A annotations.

- **Database:** Bun.SQL only. Schemas declared per-file via `<schema>` (§39); `_scrml_sql` declarations now hoisted by emit-server.ts (Bug 3a fix, S87). Schema diffing via `compiler/src/schema-differ.js`.

- **Self-host:** `compiler/dist/self-host/*.js` and `compiler/self-host/dist/tab.js` are gitignored. Rebuild gate: `scripts/rebuild-self-host-dist.ts` exits 1 on any non-warning error (S81). Source-side null/undefined sweep deferred to v0.3.0+.

- **Pre-commit hook:** `scripts/git-hooks/pre-commit` — runs `bun test unit + integration + conformance --bail`. Fired on every S87 commit (37 commits, zero regressions).

- **E2E (Playwright):** `e2e/` suite with `playwright.config.ts` (3-browser). 5 spec files: 02-counter, 03-contact-book, 05-multi-step-form, 14-mario (AC delta 1/8→8/8 post-Bug-1+1.6+1.7 fixes), todomvc. Added S85; WebKit needs `libavif13` on host for full launch.

- **Stdlib Phase 1 SHIPPED S87:** 173× `===`/`!==` → `==`/`!=` across 20 modules. Phase 3 (throw migration / try-catch / bun:/node: imports) deferred.

## Tags
#scrmlts #map #primary #compiler #s87 #v0.3 #lift-bugs-open #insight-30-ratified #option-d-synthesis #wave-3-complete #bug-3a-closed #bug-5-closed #bun #pipeline #stdlib-phase1 #37-commits

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
