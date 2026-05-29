# domain.map.md
# project: scrmlts
# updated: 2026-05-28T00:00:00Z  commit: 1fed5588

The domain is the scrml COMPILER pipeline. scrml is a single-file, full-stack reactive web language. The compiler converts `.scrml` source into `*.server.js` + `*.client.js` + `*.html` + `*.css` outputs that run on Bun.

## Core Concepts

`scrml source file (.scrml)` — single-file app; markup, logic, SQL, CSS, and server code interleaved; no build step for adopters
`Block Splitter (BS)` — stage 2; `block-splitter.js`; parses source into typed blocks by context sigils (`${}`, `?{}`, `#{}`, `^{}`, `_{}`, `~{}`)
`TAB (AST Builder)` — stage 3; `ast-builder.js`; builds typed FileAST from block-stream; driven by `tokenizer.ts`
`Native Parser` — `compiler/native-parser/`; M5 replacement arc for BS+TAB+BPP; composed-engines design; ships behind `--parser=scrml-native`; M6 will remove BS+Acorn entirely
`Component Expander (CE)` — stage 3.2; `component-expander.ts`; expands component references using same-file + cross-file registries
`Module Resolver (MOD)` — stage 3.1; `module-resolver.js`; builds import graph, detects circular imports, produces export registry
`Name Resolver (NR)` — stage 3.05; `name-resolver.ts`; resolves variable references; auto-declares engine variables; categorizes structural elements
`Symbol Table (SYM)` — stage 3.06; `symbol-table.ts` (~10,445 lines); multi-pass validation walker; 16+ PASS sub-walkers; enforces type system invariants
`Protect Analyzer (PA)` — stage 4; `protect-analyzer.ts`; derives `protect=` / `authority=` classification
`Route Inference (RI)` — stage 5; `route-inference.ts`; infers server routes, function signatures, route map; populates `functionName` in routeMap (Bug 9 L1 fix)
`Type System (TS)` — stage 6; `type-system.ts` (~15,656 lines); struct/enum inference, lifecycle tracker (Shape 1 + struct fields), L22 type-as-argument recognition
`Meta Checker + Eval (META)` — stage 6.5; `meta-checker.ts` + `meta-eval.ts`; validates `^{}` phase separation; fires E-META-001 for JS-host globals in BOTH compile-time AND runtime `^{}` blocks (Bug 17 fix)
`Dependency Graph (DG)` — stage 7; `dependency-graph.ts`; builds reactive dependency edges; consumed by BP + CG
`Batch Planner (BP)` — stage 7.5; `batch-planner.ts` + `body-dg-builder.ts` + `cps-batch-planner.ts`; plans SQL batch grouping; CPS multi-batch planner per §19.9.9
`Auth Graph (AG)` — stage 7.55; `auth-graph.ts`; derives per-gate auth classification
`Reachability Solver (RS)` — stage 7.6; `reachability-solver.ts`; per-route dead-code + auth access analysis
`Code Generator (CG)` — stage 8; `code-generator.js` + `codegen/emit-*.ts`; emits server.js + client.js + HTML + CSS from FileIR
`V5-strict access model` — SPEC §6 normative; every reactive cell is declared with `<x> = RHS` form; `@x` read-syntax; no implicit mutation; the canonical design pillar
`state-decl` — AST node kind `"reactive-decl"`; the fundamental reactive cell declaration; V5-strict shape
`render-spec` — how a reactive cell renders (bind-flavour dispatch by type per SPEC §5.4.1 / §6.4)
`engine` — `<engine>` state machine declaration (SPEC §51); composed state + transitions + state-children
`CPS (compiler-managed async)` — the body-split model (SPEC §19.9.3/§19.9.9); multi-batch CPS planner reorders and statically rejects cross-batch deps; Bug 9 L1+L2 + Bug 55 + Bug 56 all in this area
`L22 type-as-argument` — language primitive for `parseVariant` / `formFor` / `schemaFor` / `tableFor`; recognized by TS stage, emitted by `emit-parse-variant.ts` / `emit-form-for.ts` / `emit-schema-for.ts` / `emit-table-for.ts`
`not` — unified absence value (SPEC §42); replaces `null` and `undefined` entirely in scrml source; `""` / `0` / `false` / `[]` / `{}` are DEFINED values (not absence)

## Business Invariants

- `null` and `undefined` do NOT exist in scrml source; both map to `not` (W-ABSENCE-IN-SCRML-SOURCE lint enforces)
- No `async`/`await` in scrml source; compiler-managed async (CPS) handles all async (E-ASYNC-NOT-IN-SCRML enforces)
- No `try`/`catch`/`throw` in scrml source; error model is values-not-exceptions via `!{}` / `?` / `fail`
- `fn` = pure function (any return type); `function` = general JS function; `server` / `pure` modifiers gate side-effects
- Reactive cell mutations ONLY via `@cell = newValue`, `@cell.field = v`, `@arr.push(v)` etc. (E-DERIVED-VALUE-MUTATE L21 enforces)
- Engine state-machine is a file-scope singleton (Machine Cohesion SPEC §51.0.K)
- SPEC.md is normative per pa.md Rule 4; compiler source must match SPEC (not the other way)

## Domain Events

`onTransition` — `<onTransition>` structural element in engine state-children; fires on state change (SPEC §51.0.H)
`onTimeout` — `<onTimeout>` structural element; fires after computed delay in engine state (SPEC §51.0.M)
`onIdle` — `<onIdle>` structural element (§51.0.R)

## Compiler Pipeline Stage Order

| Stage | ID | Source file |
|---|---|---|
| Ghost lint (pre-BS) | LINT | lint-ghost-patterns.js |
| Block Splitter | BS | block-splitter.js |
| AST Builder | TAB | ast-builder.js (or native-parser/parse-file.js) |
| PRECG/GCP1/GCP3 | precg passes | gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js |
| Lint-try-catch | LINT-TRY-CATCH | validators/lint-try-catch.ts |
| Lint-async | LINT-ASYNC-USER-SOURCE | validators/lint-async-user-source.ts |
| Module Resolver | MOD | module-resolver.js |
| Name Resolver | NR | name-resolver.ts |
| Symbol Table | SYM | symbol-table.ts |
| Component Expander | CE | component-expander.ts |
| Post-CE validators | VP-1/2/3 | validators/*.ts |
| Protect Analyzer | PA | protect-analyzer.ts |
| Route Inference | RI | route-inference.ts |
| Monotonicity | MC | monotonicity-analyzer.ts |
| Type System | TS | type-system.ts |
| Info lints (I-MATCH/I-FN/W-EACH) | stage 6.4+ | lint-i-*.js, lint-w-*.js |
| Meta Checker + Eval | META / ME | meta-checker.ts, meta-eval.ts |
| Dependency Graph | DG | dependency-graph.ts |
| Batch Planner | BP | batch-planner.ts + cps-batch-planner.ts + body-dg-builder.ts |
| Auth Graph | AG | auth-graph.ts |
| Reachability Solver | RS | reachability-solver.ts |
| Code Generator | CG | code-generator.js + codegen/emit-*.ts |

## Tags
#scrmlts #map #domain #compiler #pipeline #scrml-language #cps #reactive

## Links
- [primary.map.md](./primary.map.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
