# domain.map.md
# project: scrmlTS
# updated: 2026-05-07T20:30:00Z  commit: a4eed93

## Core Concepts

scrml                          — single-file, full-stack reactive web language. One `.scrml` file → emitted server JS + client JS + HTML + CSS.
The compiler                  — Bun-runtime program that lowers `.scrml` → plain HTML/CSS/JS through a fixed multi-stage pipeline (PIPELINE.md is authoritative).
Pipeline (current shipped)    — BS → TAB → MOD → CE → VP-1/W-1 → NR/SYM → PA → RI → TS → META (MC+ME) → DG → BP → CG. (PIPELINE.md v0.7.0 = engineering target for v0.next.)
Pipeline (v0.next target)     — adds NR (3.05) routing for engines/match/errors/onTransition, validity-surface synthesis at TS, derived-cell + validator dependency edges at DG, render-by-tag expansion at CG.
SPEC                          — `compiler/SPEC.md` (24,913 lines, §56 through §56.8 subsections). Authoritative language spec; every code lookup roots here. §6.11 footnote corrected S67 (canonical type-shape per §55.5–§55.7 supersedes stub).
PIPELINE                      — `compiler/PIPELINE.md` (2,380 lines, v0.7.0). Authoritative stage contracts.
Self-host                     — `compiler/self-host/*.scrml` mirrors of every pass (BS/TAB/PA/RI/TS/DG/CG/BPP/AST/MC/MOD); built into `compiler/self-host/dist/` and conformance-tested. NOT updated in S66 or S67 (documented deferral; post-v1.0.0 per user decision).

## Stage Contracts (one-line each — full text in PIPELINE.md)

BS  Block Splitter           — splits `.scrml` source into top-level blocks; emits raw block list.
TAB Tag-and-Body parser      — turns blocks into `FileAST` (~80 ASTNode kinds in `types/ast.ts`).
MOD Module Resolver          — builds import graph, validates names against exports, produces compilation order + export registry.
CE  Component Expander       — expands component references in markup using same-file + cross-file registries.
VP-1 / W-1                   — validator pass 1: post-CE invariants + attribute allowlist + attribute interpolation; lint pass 1: ghost patterns.
NR  Name Resolver            — resolves identifiers; (v0.next: also routes engine/match/errors/onTransition structural elements + auto-declares engine variables).
SYM Symbol Table             — builds symbol tables with 7 passes (B1–B10):
                               **PASS 1** (B1+B4) — scope build + state-decl registration + import-binding registration (`importBindings` map).
                               **PASS 2** (B2) — E-NAME-COLLIDES-STATE local-decl collision walker.
                               **PASS 3** (B3) — `@name` resolution walker, pinned-forward-ref check (E-STATE-PINNED-FORWARD-REF, E-IMPORT-PINNED-INVALID).
                               **PASS 4** (B5) — cell classifier (`_cellKind`, `_isBindable`).
                               **PASS 5** (B6) — render-by-tag classifier (E-CELL-NO-RENDER-SPEC, E-CELL-RENDER-SPEC-NOT-BINDABLE).
                               **PASS 6** (B8) — L21 walker E-DERIVED-VALUE-MUTATE (backed by `derived-mutation-ops.ts`).
                               **PASS 7** (B10) — validator type-check walker E-TYPE-031 family (backed by `validator-catalog.ts`).
PA  Protect Analyzer         — analyses `protect=` and access boundaries.
RI  Route Inference          — infers routes from file paths + `<program>` config.
TS  Type System              — type checks (large); validates render-spec shapes, refinement types, fn purity, etc. Now exposes `typeRegistry` and `stateTypeRegistry` on typed-AST for downstream lint.
META = MC + ME               — Meta Checker + Meta Eval. MC validates phase separation + reflect() calls; ME evaluates compile-time `^{}` and splices results.
DG  Dependency Graph         — reactive dependency graph; cycle detection; **S67**: derived-cell dep DAG + E-DERIVED-CIRCULAR-DEP (B7); validator-dep graph + E-VALIDATOR-CIRCULAR-DEP (B10 Phase 3). Both subgraphs use DFS; cycles block codegen.
BP  Batch Planner            — plans batched DOM updates; emits batch plan.
CG  Code Generator           — `compiler/src/codegen/index.ts`; orchestrates 39 emit-* modules to produce server JS, client JS, HTML, CSS, and runtime chunks.

## Post-TS Lint Passes (api.js, non-fatal)

Stage 6.4 I-MATCH-PROMOTABLE — `lint-i-match-promotable.js`: runs post-TS; walks typed-AST for if-else chains over enum-typed state cells that are mechanically promotable to `<match>`. Emits info-level diagnostics in three shapes: `exhaustive`, `near-miss`, `compound`. Feeds `allLintDiagnostics`. Paired with `bun scrml promote --match` (S66 Tier B). Needs `stateTypeRegistry` + typed-AST; non-blocking.

## Key Spec Sections (high-traffic, read these first)

§4 Block Grammar              — tags, states, closer forms.
§5 Attribute Quoting          — incl. §5.4.1 render-spec / render-by-tag.
§6 V5-Strict Reactivity       — `@x` access model; §6.11 auto-synthesized validity surface (footnote corrected S67: canonical types at §55.5–§55.7).
§10 The `lift` Keyword        — server→client value lifting.
§13 Async Model.
§14 Type System.
§15-§16 Components + Slots.
§17 Control Flow              — including S64 §17.5 deletion of function-overload (Stage 0c.A).
§18 Pattern Matching          — match block-form (v0.next).
§19 Error Handling.
§22 Metaprogramming           — `^{}` blocks.
§28 Compiler Settings.
§30 Compile-Time `bun.eval()`.
§31 Dependency constraints    — §31.4 cross-field validator deps; §31.5 derived-cell dep rules.
§32 The `~` Pipeline Accumulator.
§33 The `pure` Keyword.
§34 Error Codes.
§35 Linear Types — `lin`.
§37 SSE Generators            — `server function*`.
§38 WebSocket Channels        — `<channel>`.
§39 `<schema>` + Migrations.
§41 `use` and `import` System — incl. §41.13 `parseVariant` (S65 SHIPPED stdlib enum, also §53.14).
§44 `?{}` Multi-DB Adaptation.
§47 Output Name Encoding.
§48 The `fn` Keyword          — pure functions.
§51 `<machine>` State Type    — §51.5 validation elision (S28); §51.11/§51.14 audit + replay (S27).
§52 State Authority Decls.
§53 Inline Type Predicates    — incl. §53.14 type-as-argument primitives (S65).
§54 Nested Substates          — §54.6 fn purity in transitions (S33).
§55 Validators + Auto Validity Surface — §55.1 (14 universal-core predicates; catalog at `validator-catalog.ts`); §55.7 (E-SYNTHESIZED-WRITE, deferred to B11); §55.9 (ValidationError enum tags); §55.10 (inline message override); §55.11 (cross-field deps + E-VALIDATOR-CIRCULAR-DEP).
§56 Promotion Ergonomics      — `I-MATCH-PROMOTABLE` + `bun scrml promote` (S65 Tier A + S66 Tier B SHIPPED).
  §56.1 Motivation; §56.2 fire conditions; §56.3 three message shapes; §56.4 compound advisory;
  §56.5 CLI (--match LIVE, --engine deferred Tier C); §56.6 --engine mode; §56.7 tooling integration;
  §56.8 cross-references.

## Architecture Locks (v0.2.0 migration)

22 architectural locks (L1-L22) ratified at S58 close + extended at S65 (L22 type-as-argument). 20 moves (M1-M20, M7+M21 dropped). Migration is **piecemeal** (S59 decision) — acorn STAYS as pre-processor extension, not greenfield rewrite. AST extension target: `kind: "state-decl"` (was `"reactive-decl"` before S59 rename).

L21 lock                     — E-DERIVED-VALUE-MUTATE (S59/S67; PASS 6 in symbol-table.ts).
L22 lock                     — type-as-argument language primitive (S65; debate-05 verdict + Path A architectural commit).

## Phase Status (master-list.md §0 is canonical — read it for live state)

Stage 0a IMPACT-ASSESSMENT     — DONE.
Stage 0b SPEC + PIPELINE rewrite — DONE (D1-D4).
Stage 0b+ L21 lock              — DONE.
Phase A1a (lex+parse)           — COMPLETE at S61.
Phase A1b (resolve+type)        — IN FLIGHT.
  B1 (S63) SHIPPED · B2 (S64) SHIPPED · B3+B5 (S65) SHIPPED · B4+B6 (S66) SHIPPED ·
  **B7 (S67) SHIPPED** — derived-cell dep DAG + E-DERIVED-CIRCULAR-DEP in DG ·
  **B8 (S67) SHIPPED** — L21 walker E-DERIVED-VALUE-MUTATE (SYM PASS 6 + derived-mutation-ops.ts) ·
  **B9 (S67) SHIPPED** — validator-arg ExprNode + RelationalPredicateNode AST kind + validator-arg-parser.ts ·
  **B10 (S67) SHIPPED** — Phase 1: predicate signature catalog (validator-catalog.ts, 14 predicates); Phase 2: SYM PASS 7 E-TYPE-031 walker; Phase 3: E-VALIDATOR-CIRCULAR-DEP in DG.
  B11-B22 pending.
Phase A1c (codegen+runtime)     — RATIFIED S60; 24 steps C0-C23 in 6 waves; not yet started.
Stage 0c.A (function-overload deletion) — LANDED S64 commit `6507475`.
Stage 0c.B-D                    — REMOVED (no code existed to delete; S64 forgotten-surface audit).
Stage 0c.E (SPEC §17.5 amendment) — LANDED S64 commit `8bda55f`.
Stage 0c.F (audit-doc updates)  — LANDED scrml-support `fec630f`.
parseVariant (L22 family)       — SHIPPED S65 (stdlib enum + SPEC §41.13 + §53.14 + emit-parse-variant.ts).
A+ verdict #1+#2+#3 carry-forward — CLOSED S65 (E-SWITCH-FORBIDDEN + W-LIFECYCLE-CANDIDATE).
Promotion ergonomics Tier A     — LANDED S65 (CLI stub + spec + docs).
Promotion ergonomics Tier B     — SHIPPED S66 (`--match` rewrite live in `commands/promote.js` + `lint-i-match-promotable.js` + expression-parser bare-dot fix).
Promotion ergonomics Tier C     — `--engine` deferred (W-MATCH-TRANSITIONS-ACCRUING lint, `<match>`→`<engine>` rewrite).
**A7 (S67 RATIFIED)**           — DD-Harel hierarchy (`<engine>` nesting per OQ-Harel-8 resolution; Machine Cohesion sharpened) + history attribute (tree-shakeable synth cell) + `internal:rule` prefix + `parallel` attribute sugar + Item C temporal surface migration (`<onTimeout>` element on `<engine>`) + computed-delay relaxation + Item G B-shakeable timeouts (event-timeout watchdog + named multi-timer). ~50-80h. Pending dispatch.
**A8 (S67 RATIFIED)**           — test-bind (effects-as-data middle path, Insight 22): `test-bind <serverFnName> = <handler>` declaration in `~{}` blocks; compile-time conditional at §47 server-fn call site; production binary unchanged. ~6-12h. Pending dispatch.
Self-host deferred              — S66+S67 confirmed self-host NOT updated (post-v1.0.0 per user decision).

## S67 Key Changes (commit a4eed93 — S67 close)

- **A1b B7 SHIPPED (DG):** Derived-cell dep DAG built in `dependency-graph.ts` (2,041 LOC) using the derived-cell 'reads' subgraph. E-DERIVED-CIRCULAR-DEP fires on 1-cycles and multi-node cycles (DFS). Blocks codegen per §6.6.10.
- **A1b B8 SHIPPED (SYM PASS 6):** L21 walker `walkDerivedMutationCheck` in `symbol-table.ts`. Three mutation forms: method-call (`push`/`pop`/etc on derived cell), property-assignment/compound-assign (`@derived.foo = x`, `+=`, etc.), delete (`delete @derived.foo`). Backed by `derived-mutation-ops.ts` (new standalone module: ARRAY_MUTATING_METHODS, COMPOUND_ASSIGNMENT_OPS, isDerivedMutatingAssignOp, isArrayMutatingMethod).
- **A1b B9 SHIPPED (AST + parser):** `RelationalPredicateNode` new AST kind + `ValidatorArg` union type in `types/ast.ts`. `validator-arg-parser.ts` (268 LOC): `parseValidatorArg` entry point + `forEachIdentInValidatorArg`/`forEachIdentInValidators`/`decorateValidatorsWithExprNodes` helpers.
- **A1b B10 SHIPPED (3 phases):**
  - Phase 1: `validator-catalog.ts` (289 LOC) — UNIVERSAL_CORE_PREDICATES readonly array of 14 PredicateSignature entries per §55.1.
  - Phase 2: SYM PASS 7 `walkValidatorTypeCheck` in `symbol-table.ts` — fires E-TYPE-031 on arg-kind mismatches against catalog.
  - Phase 3: E-VALIDATOR-CIRCULAR-DEP in `dependency-graph.ts` — validator-dep subgraph cycle detection per §55.11.
- **SPEC §6.11 footnote (S67):** Type-shape table in stub predates §55.9 `ValidationError` enum (L12). Footnote added: canonical types at §55.5–§55.7 supersede stub. Parallel to §6.6.8 (S59) + §6.6.10 (S66) correction footnotes.
- **SPEC Primer §7 correction (S67):** `<engine>` example corrected to canonical §51.0.F syntax.
- **Primer §8 correction (S67):** 14 predicates listed (NOT 18); email/url/numeric/integer are stdlib `scrml:data` predicate-builders, not universal-core.
- **master-list + IMPLEMENTATION-ROADMAP (S67):** Phase A7 (engine+temporal extensions) + Phase A8 (test-bind) ratified at S67 with cost estimates and open questions.
- **pa.md additions (S67):** Rule 4 (spec is normative; derived planning docs are not) + dispatch-landing standing rule (worktree-as-scratch / file-delta, supersedes cherry-pick pattern).
- **Test count at S67 close:** 8,470 pre-commit subset / 9,241 full suite. +222 net from S66 close (B7+22, B8+39/+8skip, B9+validator tests, B10+26).
- **New test files (S67):** `derived-circular-dep.test.js` (450 LOC), `derived-value-mutate.test.js` (474 LOC), `validator-arg-parsing.test.js` (385 LOC), `validator-catalog.test.js` (227 LOC), `validator-circular-dep.test.js` (242 LOC), `validator-type-check.test.js` (251 LOC).
- **New audit docs (S67):** 16 files in `docs/audits/` — `a1b-b7` through `a1b-b18-b22-wave5`, `item-c-temporal-engine-rule-migration`, `a1c-roadmap`.

## S66 Key Changes (commit e557e30)

- **A1b B4 SHIPPED:** `symbol-table.ts` import-binding registration (PASS 1.b). E-IMPORT-PINNED-INVALID + E-STATE-PINNED-FORWARD-REF.
- **A1b B6 SHIPPED:** `symbol-table.ts` PASS 5 render-by-tag classifier. E-CELL-NO-RENDER-SPEC + E-CELL-RENDER-SPEC-NOT-BINDABLE.
- **expression-parser.ts bare-dot fix:** `.Variant` parseable as primary expression via preprocessor substitution.
- **lint-i-match-promotable.js:** Full predicate matrix (`is` + `==`). `findPromotableChains()` exported.
- **commands/promote.js:** `--match` LIVE — span-based AST→AST rewrite + sanity-check parse.
- **api.js:** `__SCRML_PROMOTE_TS_CAPTURE__` hook wired; Stage 6.4 `runIMatchPromotable` invocation.
- **docs/build.ts:** New Bun script renders scrml.dev from `docs/articles/*-devto-*.md` via `marked`.

## Codegen Surfaces (compiler/src/codegen/, ~14,135 LOC across 39 modules)

emit-client.ts    (1,112)   — client bundle entry; mangler interaction.
emit-control-flow.ts (1,253) — if/else/for/while/match lowering.
emit-logic.ts     (1,895)   — `<logic>` block lowering.
emit-reactive-wiring.ts (1,002) — V5-strict reactive subscription wiring.
emit-html.ts      (915)     — HTML rendering + render-by-tag.
emit-server.ts    (905)     — server bundle entry.
rewrite.ts        (1,861)   — mangler + identifier rewrite.
emit-machines.ts  (719)     — `<machine>` lowering.
emit-event-wiring.ts (696)  — DOM event wiring (incl. S34 GITI-005 `${serverFn()}` markup fix).
type-encoding.ts  (670)     — type encoding for compiled output.
emit-expr.ts      (582)     — expression lowering.
emit-machine-property-tests.ts (579) — property-test machinery for state machines.
emit-bindings.ts  (506)     — bind:value et al.
emit-predicates.ts (496)    — refinement-type predicates.
reactive-deps.ts  (492)     — reactive-dep collection.
collect.ts        (482)     — codegen-side collector.
emit-library.ts   (447)     — library-mode emit.
emit-channel.ts   (421)     — `<channel>` lowering.
scheduling.ts     (303)     — flush scheduling.
emit-functions.ts (282)     — function emission.
source-map.ts     (220)     — source-map generation.
emit-parse-variant.ts (219) — parseVariant codegen (S65 SHIPPED).
emit-css.ts       (210)     — CSS emission.
emit-sync.ts      (197)     — sync wiring.
ir.ts             (193)     — codegen IR.
emit-test.ts      (185)     — test-mode emit.
runtime-chunks.ts (177)     — runtime chunk packager.
binding-registry.ts (167)   — binding registry.
db-driver.ts      (151)     — Bun.SQL URI classifier (S40 Phase 2; E-SQL-005).
analyze.ts        (124)     — codegen analyse.
context.ts        (101)     — codegen context.
emit-worker.ts    (74)      — `<worker>` lowering.
errors.ts         (48)      — codegen-local error helpers.
utils.ts          (37)      — utils.
var-counter.ts    (25)      — fresh-var counter.
emit-lift.js      (1,405)   — `lift` keyword lowering (incl. S40 lift+sql/return+sql/state-decl+sql triad fix).
index.ts          (759)     — codegen orchestrator.
README.md         —         — codegen overview.
compat/parser-workarounds.js — BPP-replacement compat shims.

## LSP

lsp/server.js     (235)     — entry; --stdio.
lsp/handlers.js   (2,113)   — L1 (diagnostics/hover/definition) + L2 (workspace) + L3 (completions: component-prop, import, sql).
lsp/workspace.js  (440)     — workspace state.
lsp/l4.js         (~600)    — L4 code actions + signature help.

## Stdlib (`stdlib/<name>/index.scrml` + extras; 17 modules)

auth, compiler, cron, crypto, data, format, fs, http, oauth (with discord/github/google/microsoft + pkce), path, process, redis, regex, router, store (with kv), test, time.

Hand-written ES module shims for the runtime live at `compiler/runtime/stdlib/{auth,crypto,store}.js` and are copied verbatim to `dist/_scrml/<name>.js` so emitted JS resolves `import "scrml:<name>"` rewrites. Note: stdlib `.scrml` sources contain `server {}` blocks the standard pipeline does not yet lower at TS time (M16 deeper bring-up).

## Open Bugs / Carry-forwards

- **ComponentDefNode classifier (S29-flagged, still present at S67):** `ast-builder.js:3634` classifies any uppercase-named `const/let` as component-def regardless of RHS. Fix surface narrow but `tab.test.js:649-654` encodes the bug as policy and self-host modules carry mirror logic. Not on critical path; deferred for v0.next.
- **GITI-006 (low):** markup `${@var.path}` emits a module-top bare read that throws on async-initialized reactives.
- **E-SYNTHESIZED-WRITE (§55.7, §6.11):** deferred to B11 (depends on B11/B12 synth-cell registry).
- **Two persistent self-host smoke failures** — deferred per user; self-host is post-v1.0.0.

## Tags
#scrmlTS #map #domain #pipeline #stdlib #codegen #lsp #spec #v0next #s65 #s66 #s67 #parseVariant #a-plus-verdict #b4 #b6 #b7 #b8 #b9 #b10 #promote-tier-b #bare-dot-fix #derived-circular-dep #validator-circular-dep #validator-catalog #derived-mutation-ops #a7-ratified #a8-ratified

## Links
- [primary.map.md](./primary.map.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
- [structure.map.md](./structure.map.md)
- [SPEC.md](../../compiler/SPEC.md)
- [PIPELINE.md](../../compiler/PIPELINE.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
