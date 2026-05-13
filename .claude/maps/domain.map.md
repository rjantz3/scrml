# domain.map.md
# project: scrmlts
# updated: 2026-05-12T21:42:04Z  commit: f1555b4

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
| Engine self-write (§51.0.F.1) | **NEW S87 Option (d):** assigning `@var = .CurrentVariant` where `.CurrentVariant` is the currently-active state is a runtime NO-OP (no `<onTransition>`, no history capture, no timer rearm). Compile-time info lint `W-ENGINE-SELF-WRITE-DETECTED` fires when statically detectable. Synthesized from Insight 30 / §40.8.1 precedent. |
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
| Channel placement (v0.3) | **S87 Insight 30 direction:** channels inside `<program>` are canonical; a `<channel>` at file-top in a MODULE FILE (PURE-CHANNEL-FILE shape — no `<program>` present) is also canonical via engine-parity dispensation. `E-CHANNEL-OUTSIDE-PROGRAM` fires only when a `<channel>` sits outside `<program>` in a file that ALSO contains `<program>`. |
| PURE-CHANNEL-FILE | **NEW S87** — a .scrml file containing one or more `<channel>` declarations at file top and NO `<program>` element. Canonical placement per §38.12.6; does NOT fire `E-CHANNEL-OUTSIDE-PROGRAM`. Enables cross-file channel imports. |
| Validator | Predicate attached to a state cell (`req`, `length(>=2)`, `pattern(/.../)`); synthesizes validity surface properties (@x.isValid, @x.errors, @x.touched, @x.submitted) |
| Batch Planner | Stage 7.5; coalesces SQL calls within a logic block into batched queries to reduce round-trips |
| Protect Analyzer | Stage 4 PA; identifies protected fields requiring write guards |
| Route Inference | Stage 5 RI; infers HTTP method + path for server functions and channels from AST shape |
| Dependency Graph | Stage 7 DG; builds reactive cell dependency graph; detects cycles; annotates hasLift. **S87 Bug 4.5:** call-ref args now tracked in dependency.graph.ts |
| Binding Registry | Contract between HTML emit (analysis) and JS emit (client-side wiring); holds EventBinding + LogicBinding records |
| TAB | Typed AST Builder (Stage 3); produces the AST from block-split source; ExprNode population |
| NR | Name Resolver (Stage 3.05); stamps resolvedKind/resolvedCategory on MarkupNodes; routes engine/channel/component calls |
| MOD | Module Resolver (Stage 3.1); builds import graph, detects circular imports, produces export registry |
| CE | Component Expander (Stage 3.2); expands component call sites using same-file and cross-file registries |
| UVB | Unified Validation Block (Stage 3.3); runs VP-1 (attribute allowlists, interpolation, post-CE invariant). **S87:** ast-walk.ts shared walker added for channel-placement pre-check |
| TS | Type System (Stage 6); type-checks the full AST; produces type registry, validator-arg deps, synthesized validity cells |
| META | Meta Checker + Eval (Stage 6.5); validates phase separation + reflect() calls; evaluates ^{} blocks |
| Lint passes | Pre-Stage-2: lint-ghost-patterns.js; post-TAB: gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js |
| SCRML_RUNTIME | The compiled runtime JS embedded or linked in client output; contains reactivity core, error classes, effect scheduling, CSS transitions |
| Self-host | Compiler compiled with itself; dist artifacts in compiler/dist/self-host/ (gitignored); rebuilt locally |
| Tier system | Tier 1 (basic reactive): if/for/match; Tier 2 (engines): state machines; Tier 3 (positional sugar): compound state shorthand |
| §51 backbone | Runtime §51.12 backbone — the scheduler/dispatcher underpinning engine temporal surface (onTimeout, onIdle) |
| Adopter override surface | `<program>` attributes that override compiler-emitted defaults: `idempotency-store` / `idempotency-ttl` (S79); `batch-in-list-cap` (S79); `cors-max-age` (S81 F.1); `channel-reconnect` (S81 F.2). All raw strings on MiddlewareConfig; parsed at codegen time by per-field helpers; silent fallback to default on null/malformed. |
| Strict self-host rebuild gate | `scripts/rebuild-self-host-dist.ts` exits 1 on any host-compiler non-warning error (S81 ship). Source-side null/undefined sweep deferred to v0.3.0+. |
| Channel auth gate | `<channel auth=>` attribute (S80 rename from `<channel protect=>`). Accepts `"required"`/`"optional"`/`"none"` per §52.13. |
| Program-as-container (v0.3) | **S85/S86** `<program>` acts as the canonical container for `<page>` declarations. `<page>` recognized as default-logic body container; TAB extended with `isPageRoot`. |
| migrate --program-shape | **NEW S85 Wave 2** — `bun scrml migrate --program-shape` classifies files into 5 buckets and auto-rewrites pre-v0.3 structure to v0.3 `<program>/<page>` container. Option β safety-harness: transactional in-place rewrite + verify + restore. Wave 3.5 (S87): 4 bug families closed (container-aware + scope-safe + comment-safe unwrap). |
| BS comment-skip | **NEW S87** — Block-splitter now suppresses `<!-- -->` HTML comments at ALL context levels (§4.7 extension). Previously the BS "SHALL NOT handle" clause erroneously blocked comment-aware parsing. |
| _scrml_sql declaration (Bug 3a) | **FIXED S87** — `emit-server.ts` now scans compiled server output for `_scrml_sql` / `_scrml_sql_<n>` token references and emits top-of-file `import { SQL } from "bun"; const _scrml_sql = new SQL(...)` declarations. Closes latent `ReferenceError: _scrml_sql is not defined` in all compiled server-function outputs that use SQL. |
| Method-chain callback preservation (Bug 5) | **FIXED S87** — `emit-expr.ts`: `.filter(cb).<member>` no longer strips the callback argument. `_scrml_reactive_get(...)` wrapper now wraps the entire method-chain result, not the intermediate `.filter()` call. |
| Synthesis-pattern methodology | When a binary OQ has real costs both sides, surface a synthesis option capturing both load-bearing benefits without their costs. Frequency-3 in S86-S87: §40.8.1 Option C + Insight 30 Option b + Option d engine self-write. |
| Stdlib Phase 1 | **SHIPPED S87** — 173× `===`/`!==` → `==`/`!=` mechanical sweep across 20 stdlib modules. Guards: +28 tests in stdlib-canonical-form-cleanup.test.js. Phase 3 (throw migration / try-catch / bun:/node: imports) deferred. |
| Option A emit-expr engine-routing | **SHIPPED S87** — comprehensive engine-routing across ALL expression contexts in emit-expr.ts: ternary / lambda / compound / call-args / nested. Disjoint from Bug 1.7 string-rewrite layer. |

## v0.3.0 Status (as of S87 close)

**2 BLOCKERS CLOSED S87:**
- Channel-architecture OQ (Insight 30 Option b — PURE-CHANNEL-FILE dispensation) ✓
- SQL emission gap (Bug 3a — `_scrml_sql` declaration hoisting) ✓

**Remaining v0.3.0 blockers (open):**
- LIFT-1 (catastrophic: parens-attr elides parent element in lift template)
- LIFT-2/3/4 bundle (lift-attr literal-setAttribute fallback for bind:/if=/onkeydown)
- LIFT-5 (if-inside-for reconciler-factory ambient state gap)
- Wave 4 adopter content (examples + tutorial updates)

**Wave 3 fixture-sweep status:** COMPLETE (S87 — trucking-dispatch 24 of 36 pages migrated; 12 remaining are genuine E-CHANNEL-OUTSIDE-PROGRAM spec violations needing LIFT fixes first).

## Business Invariants

- No SQL execution calls (\_scrml\_sql\_exec, \_scrml\_db) may appear in client JS output (E-CG-006)
- No server-environment access (process.env, Bun.env) may appear in client JS output
- Engine transitions must match a declared rule= arm or throw E-ENGINE-001-RT at runtime
- **Exception (§51.0.F.1 Option-d):** engine self-writes (target = current variant) are runtime NO-OPs — no E-ENGINE-INVALID-TRANSITION; compiler emits W-ENGINE-SELF-WRITE-DETECTED info lint
- Lin-declared variables must be consumed exactly once; unconsumed or double-consumed raises E-LIN-* at compile time
- Tilde-declared variables must be used; E-TILDE-001 on drop
- Batch Planner excludes .nobatch() SQL nodes from all coalescing candidate sets (§8.9.1)
- Arm-tagged event bindings (engineArm set) are excluded from global DOMContentLoaded emission; wired per-arm by emit-variant-guard.ts
- `csrf=` accepts the canonical value-set `"auto" | "off"` only per §52.13 (S80 narrowing). The legacy `csrf="on"` was retired at S80.
- `null` / `undefined` are NOT valid scrml tokens in any context (SPEC §42, E-SYNTAX-042). The only non-presence value is `not`.
- `===` / `!==` are NOT valid in scrml source (E-EQ-004). Canonical forms: `==` / `!=`.

## Domain Events (Compiler Pipeline)

| Event | When | Where |
|-------|------|-------|
| CompileContext populated | After analysis, before emission | codegen/index.ts |
| BindingRegistry seal | After HTML emit, before client JS emit | codegen/index.ts |
| `pushArmContext / popArmContext` | Around each engine state-child body emit | emit-variant-guard.ts [Phase A10] |
| `drainMachineCodegenErrors` | After all machine emission, before CG output | codegen/emit-machines.ts |
| `detectRuntimeChunks` | Before runtime assembly | emit-client.ts |
| channel placement pre-check | UVB Stage 3.3, before codegen | validators/ast-walk.ts [S87] |

## Aggregates

| Aggregate | File | Owns |
|-----------|------|------|
| FileAST | compiler/src/types/ast.ts | All ASTNodes for one .scrml file |
| CompileContext | compiler/src/codegen/context.ts | BindingRegistry, FileAnalysis, EncodingContext, error list |
| BindingRegistry | compiler/src/codegen/binding-registry.ts | EventBinding[], LogicBinding[] |
| FileAnalysis | compiler/src/codegen/analyze.ts | Pre-computed AST slices (fnNodes, markupNodes, topLevelLogic, etc.) |

## Tags
#scrmlts #map #domain #concepts #pipeline #engine #reactive #s87 #v0.3 #insight-30 #lift-bugs #bug-3a #option-d

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
