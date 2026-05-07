# domain.map.md
# project: scrmlTS
# updated: 2026-05-06T23:50:00Z  commit: 7334fb0

## Core Concepts

scrml                          — single-file, full-stack reactive web language. One `.scrml` file → emitted server JS + client JS + HTML + CSS.
The compiler                  — Bun-runtime program that lowers `.scrml` → plain HTML/CSS/JS through a fixed multi-stage pipeline (PIPELINE.md is authoritative).
Pipeline (current shipped)    — BS → TAB → MOD → CE → VP-1/W-1 → NR/SYM → PA → RI → TS → META (MC+ME) → DG → BP → CG. (PIPELINE.md v0.7.0 = engineering target for v0.next.)
Pipeline (v0.next target)     — adds NR (3.05) routing for engines/match/errors/onTransition, validity-surface synthesis at TS, derived-cell + validator dependency edges at DG, render-by-tag expansion at CG.
SPEC                          — `compiler/SPEC.md` (24,911 lines, 89 sections through §56). Authoritative language spec; every code lookup roots here.
PIPELINE                      — `compiler/PIPELINE.md` (2,380 lines, v0.7.0). Authoritative stage contracts.
Self-host                     — `compiler/self-host/*.scrml` mirrors of every pass (BS/TAB/PA/RI/TS/DG/CG/BPP/AST/MC/MOD); built into `compiler/self-host/dist/` and conformance-tested.

## Stage Contracts (one-line each — full text in PIPELINE.md)

BS  Block Splitter           — splits `.scrml` source into top-level blocks; emits raw block list.
TAB Tag-and-Body parser      — turns blocks into `FileAST` (~80 ASTNode kinds in `types/ast.ts`).
MOD Module Resolver          — builds import graph, validates names against exports, produces compilation order + export registry.
CE  Component Expander       — expands component references in markup using same-file + cross-file registries.
VP-1 / W-1                   — validator pass 1: post-CE invariants + attribute allowlist + attribute interpolation; lint pass 1: ghost patterns.
NR  Name Resolver            — resolves identifiers; (v0.next: also routes engine/match/errors/onTransition structural elements + auto-declares engine variables).
SYM Symbol Table             — builds symbol tables; **S63 B1 extension** for state-decl `_scope` annotations; **S64 B2** adds collision detection (E-NAME-COLLIDES-STATE).
PA  Protect Analyzer         — analyses `protect=` and access boundaries.
RI  Route Inference          — infers routes from file paths + `<program>` config.
TS  Type System              — type checks (8,969 LOC); validates render-spec shapes, refinement types, fn purity, etc.
META = MC + ME               — Meta Checker + Meta Eval. MC validates phase separation + reflect() calls; ME evaluates compile-time `^{}` and splices results.
DG  Dependency Graph         — reactive dependency graph; cycle detection; (v0.next: validator + derived-cell edges).
BP  Batch Planner            — plans batched DOM updates; emits batch plan.
CG  Code Generator           — `compiler/src/codegen/index.ts`; orchestrates 39 emit-* modules to produce server JS, client JS, HTML, CSS, and runtime chunks.

## Key Spec Sections (high-traffic, read these first)

§4 Block Grammar              — tags, states, closer forms.
§5 Attribute Quoting          — incl. §5.4.1 render-spec / render-by-tag.
§6 V5-Strict Reactivity       — `@x` access model.
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
§55 Validators + Auto Validity Surface.
§56 Promotion Ergonomics      — `I-MATCH-PROMOTABLE` + `bun scrml promote` (S65 Tier A; Tier B in flight).

## Architecture Locks (v0.2.0 migration)

22 architectural locks (L1-L22) ratified at S58 close + extended at S65 (L22 type-as-argument). 20 moves (M1-M20, M7+M21 dropped). Migration is **piecemeal** (S59 decision) — acorn STAYS as pre-processor extension, not greenfield rewrite. AST extension target: `kind: "state-decl"` (was `"reactive-decl"` before S59 rename).

L21 lock                     — E-DERIVED-VALUE-MUTATE (S59 commit `1217b41`).
L22 lock                     — type-as-argument language primitive (S65; debate-05 verdict + Path A architectural commit).

## Phase Status (master-list.md §0 is canonical — read it for live state)

Stage 0a IMPACT-ASSESSMENT     — DONE.
Stage 0b SPEC + PIPELINE rewrite — DONE (D1-D4).
Stage 0b+ L21 lock              — DONE.
Phase A1a (lex+parse)           — COMPLETE at S61.
Phase A1b (resolve+type)        — IN FLIGHT. B1 (S63), B2 (S64), B3+B5 (S65) landed; B4, B6-B22 pending.
Phase A1c (codegen+runtime)     — RATIFIED S60; 24 steps C0-C23 in 6 waves; not yet started.
Stage 0c.A (function-overload deletion) — LANDED S64 commit `6507475`.
Stage 0c.B-D                    — REMOVED (no code existed to delete; S64 forgotten-surface audit).
Stage 0c.E (SPEC §17.5 amendment) — LANDED S64 commit `8bda55f`.
Stage 0c.F (audit-doc updates)  — LANDED scrml-support `fec630f`.
parseVariant (L22 family)       — SHIPPED S65 (stdlib enum + SPEC §41.13 + §53.14 + emit-parse-variant.ts).
A+ verdict #1+#2+#3 carry-forward — CLOSED S65 (E-SWITCH-FORBIDDEN + W-LIFECYCLE-CANDIDATE).
Promotion ergonomics Tier A     — LANDED S65 (CLI stub + spec + docs); Tier B in flight in worktree `agent-a35e9695d1b010931`.

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

- **ComponentDefNode classifier (S29-flagged, still present at S65):** `ast-builder.js:3634` classifies any uppercase-named `const/let` as component-def regardless of RHS. Fix surface narrow but `tab.test.js:649-654` encodes the bug as policy and self-host modules carry mirror logic. Not on critical path; deferred for v0.next.
- **GITI-006 (low):** markup `${@var.path}` emits a module-top bare read that throws on async-initialized reactives.
- **Two persistent self-host smoke failures** — deferred per user since pre-S40.

## Tags
#scrmlTS #map #domain #pipeline #stdlib #codegen #lsp #spec #v0next #s65 #parseVariant #a-plus-verdict

## Links
- [primary.map.md](./primary.map.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
- [structure.map.md](./structure.map.md)
- [SPEC.md](../../compiler/SPEC.md)
- [PIPELINE.md](../../compiler/PIPELINE.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
