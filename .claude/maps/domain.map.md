# domain.map.md
# project: scrmlts
# updated: 2026-05-11T17:00:00Z  commit: b6c8e1c

## Core Concepts

| Concept | Definition |
|---------|------------|
| scrml | Single-file, full-stack reactive web language: one .scrml file contains markup, CSS, logic, server functions, SQL, and state — the compiler splits it into HTML + client JS + server JS |
| Pipeline | 12 ordered stages (BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → CG) producing HTML, server JS, client JS, and optional CSS per compiled file |
| Reactive cell (@var) | Mutable reactive variable declared with `@name = expr` or `<name> = expr` (structural form); all subscriptions update on set |
| Derived cell | Const-derived reactive variable (`const <name> = expr`); recomputed when deps change; shape:"derived" in AST |
| State-decl (Shape 1/2/3) | Shape 1: plain cell with initExpr; Shape 2: render-spec (bound input element); Shape 3: derived expression |
| Engine | State machine over a reactive cell (`<engine>` tag); governs legal transitions via rule= attributes; variant-guarded markup rendering via emit-variant-guard.ts |
| State child | AST node inside an `<engine>` body representing a named variant (`<Idle>`, `<Showing>`, etc.); body is walkable AST (Phase A10, S78) |
| Variant-guarded render | Per-variant conditional HTML rendering dispatched by `emitVariantGuardedRender()`; dispatcher swaps innerHTML on variant change; arm wire functions re-attach reactive wiring |
| Match block | Pattern-match expression (`match expr { .A => ..., .B => ... }`); also match-as-expression and match-block-form (v0.next) |
| Logic block (${ }) | Imperative code block in a .scrml file; contains let/const/reactive decls, function defs, SQL blocks, control flow |
| Meta block (^{ }) | Compile-time code execution block; evaluated at CG Stage 8; `meta.emit()` inserts HTML at the block's DOM position |
| Error-effect block (!{ }) | Pattern-matched error handler; arms match on error type (NetworkError, ValidationError, etc.) |
| SQL block (?{ }) | Inline SQL query with chained method (`.all()`, `.get()`, `.run()`); compiled to server-only prepared statement |
| Tilde-decl (~name) | Must-use variable; compiler tracks consumption; E-TILDE-001 if dropped |
| Lin-decl (lin name) | Immutable linear-type variable; must be consumed exactly once (§35.2) |
| Server function | `server function name(params)` — compiled to an HTTP route handler on the server; called from client via auto-generated fetch |
| Component | Reusable markup definition (`const Comp = <element...>`); expanded at Stage 3.2 CE |
| Channel | Real-time pub/sub topic (`<channel>` tag or file-level channel decl); WebSocket/SSE backed |
| Validator | Predicate attached to a state cell (`req`, `length(>=2)`, `pattern(/.../)`); synthesizes validity surface properties (@x.isValid, @x.errors, @x.touched, @x.submitted) |
| Batch Planner | Stage 7.5; coalesces SQL calls within a logic block into batched queries to reduce round-trips |
| Protect Analyzer | Stage 4 PA; identifies protected fields requiring write guards |
| Route Inference | Stage 5 RI; infers HTTP method + path for server functions and channels from AST shape |
| Dependency Graph | Stage 7 DG; builds reactive cell dependency graph; detects cycles; annotates hasLift |
| Binding Registry | Contract between HTML emit (analysis) and JS emit (client-side wiring); holds EventBinding + LogicBinding records |
| TAB | Typed AST Builder (Stage 3); produces the AST from block-split source; ExprNode population |
| NR | Name Resolver (Stage 3.05); stamps resolvedKind/resolvedCategory on MarkupNodes; routes engine/channel/component calls |
| MOD | Module Resolver (Stage 3.1); builds import graph, detects circular imports, produces export registry |
| CE | Component Expander (Stage 3.2); expands component call sites using same-file and cross-file registries |
| UVB | Unified Validation Block (Stage 3.3); runs VP-1 (attribute allowlists, interpolation, post-CE invariant) |
| TS | Type System (Stage 6); type-checks the full AST; produces type registry, validator-arg deps, synthesized validity cells |
| META | Meta Checker + Eval (Stage 6.5); validates phase separation + reflect() calls; evaluates ^{} blocks |
| Lint passes | Pre-Stage-2: lint-ghost-patterns.js; post-TAB: gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js |
| SCRML_RUNTIME | The compiled runtime JS embedded or linked in client output; contains reactivity core, error classes, effect scheduling, CSS transitions |
| Self-host | Compiler compiled with itself; dist artifacts in compiler/dist/self-host/ (gitignored); rebuilt locally |
| Tier system | Tier 1 (basic reactive): if/for/match; Tier 2 (engines): state machines; Tier 3 (positional sugar): compound state shorthand |
| §51 backbone | Runtime §51.12 backbone — the scheduler/dispatcher underpinning engine temporal surface (onTimeout, onIdle) |
| Adopter override surface | `<program>` attributes that override compiler-emitted defaults: `idempotency-store` / `idempotency-ttl` (S79); `batch-in-list-cap` (S79); `cors-max-age` (S81 F.1); `channel-reconnect` (S81 F.2). All raw strings on MiddlewareConfig; parsed at codegen time by per-field helpers; silent fallback to default on null/malformed. Same shape pattern across all five — establishes the canonical "compiler-emitted middleware default" override locus. |
| Strict self-host rebuild gate | `scripts/rebuild-self-host-dist.ts` exits 1 on any host-compiler non-warning error (S81 ship). Prior behavior silently wrote `libraryJs` even with errors, letting SPEC §42 violations (null/undefined → not), E-EQ-004 (===/!==), E-ERROR-007 (try/catch) accumulate undetected. Source-side null/undefined sweep deferred to v0.3.0+ per `docs/audits/self-host-spec-conformance-2026-05-11.md`. |
| Channel auth gate | `<channel auth=>` attribute (S80 rename from `<channel protect=>`). Accepts `"required"`/`"optional"`/`"none"` per §52.13. WS upgrade gate; injects `_scrml_auth_check(req)` before `server.upgrade()` when `auth="required"`. Field-level `protect=` remains on `<db>` and `<Type>` declarations. |

## Business Invariants

- No SQL execution calls (\_scrml\_sql\_exec, \_scrml\_db) may appear in client JS output (E-CG-006)
- No server-environment access (process.env, Bun.env) may appear in client JS output
- Engine transitions must match a declared rule= arm or throw E-ENGINE-001-RT at runtime
- Lin-declared variables must be consumed exactly once; unconsumed or double-consumed raises E-LIN-* at compile time
- Tilde-declared variables must be used; E-TILDE-001 on drop
- Batch Planner excludes .nobatch() SQL nodes from all coalescing candidate sets (§8.9.1)
- Arm-tagged event bindings (engineArm set) are excluded from global DOMContentLoaded emission; wired per-arm by emit-variant-guard.ts
- `csrf=` accepts the canonical value-set `"auto" | "off"` only per §52.13 (S80 narrowing). Invalid literals fire W-ATTR-002. The legacy `csrf="on"` value was retired alongside E-MW-001 at S80.
- `null` / `undefined` are NOT valid scrml tokens in any context (SPEC §42, E-SYNTAX-042). Library mode inclusive (S81 user-voice directive). The only non-presence value is `not`; the only absence checks are `is not` / `is some`.

## Domain Events (Compiler Pipeline)

| Event | When | Where |
|-------|------|-------|
| CompileContext populated | After analysis, before emission | codegen/index.ts |
| BindingRegistry seal | After HTML emit, before client JS emit | codegen/index.ts |
| `pushArmContext / popArmContext` | Around each engine state-child body emit | emit-variant-guard.ts [Phase A10] |
| `drainMachineCodegenErrors` | After all machine emission, before CG output | codegen/emit-machines.ts |
| `detectRuntimeChunks` | Before runtime assembly | emit-client.ts |

## Aggregates

| Aggregate | File | Owns |
|-----------|------|------|
| FileAST | compiler/src/types/ast.ts | All ASTNodes for one .scrml file |
| CompileContext | compiler/src/codegen/context.ts | BindingRegistry, FileAnalysis, EncodingContext, error list |
| BindingRegistry | compiler/src/codegen/binding-registry.ts | EventBinding[], LogicBinding[] |
| FileAnalysis | compiler/src/codegen/analyze.ts | Pre-computed AST slices (fnNodes, markupNodes, topLevelLogic, etc.) |

## Tags
#scrmlts #map #domain #concepts #pipeline #engine #reactive

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
