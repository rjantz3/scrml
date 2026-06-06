---
title: scrml Language-Inspiration Audit
date: 2026-06-06
status: current
mirror-of: "scrml-support/docs/language-inspiration-audit-2026-06-06.md (canonical/maintained — scrml-support @4d1b22e). This is the public scrmlTS snapshot; currency passes happen on the canonical copy. Corpus paths below (`docs/deep-dives/`, `docs/debates/`, `design-insights.md`) are scrml-support-relative."
scope: Synthesized from scrml design corpus — deep-dives (`docs/deep-dives/`), debates (`docs/debates/`), and `design-insights.md`. Credit where credit is due.
revision: v3 — **currency-corrected pass (2026-06-06).** v2 was corpus-synthesized and conflated "ratified/designed" with "shipped." This pass re-grounds every flagged attribution against the LIVE truth — `compiler/SPEC.md` (normative), `docs/PA-SCRML-PRIMER.md` (current canon), and `compiler/src` (implementation) — and adds an orthogonal STATUS scheme separating shipped influences from ratified-but-unbuilt and Nominal/spec-ahead ones. 26+ claims reworded in place; lineage credits PRESERVED, only currency framing corrected. See `/tmp/scrml-audit-corrections-changelog.md` for the per-claim old→new diff. v2 baseline below preserved. v2 — completeness pass. Added uncredited decisions (markup control-flow directives, keyed reconciliation, auto-await, CPS server-to-state boundary, state-authority declarations, file-based routing, reactive-CSS/Tailwind) and under-credited languages/frameworks (Go, HTMX, XState/SCXML/Harel, Next.js, SvelteKit, Nuxt, SolidStart, Remix, Phoenix-LiveView-as-state-authority). Existing correct entries preserved.
---

## KIND legend

| KIND | Meaning |
|------|---------|
| **borrowed** | scrml deliberately took the idea (port or near-port) from the named language. |
| **convergent** | scrml arrived at the same shape independently; the language is parallel evidence, not the source. |
| **rejected** | The language's approach was weighed and deliberately NOT taken. |
| **prior-art-compared** | The language was surveyed as a comparison/data point; it informed but did not dictate the decision. |

## STATUS legend (v3 — orthogonal to KIND)

Currency status of the scrml feature each attribution credits, as of 2026-06-06. An attribution carries BOTH a KIND tag and (where corrected) a STATUS tag — e.g. `[borrowed] · [ratified-design]`. Untagged attributions are shipped unless context says otherwise.

| STATUS | Meaning |
|--------|---------|
| **[shipped]** | In SPEC + implemented in `compiler/src` today. |
| **[ratified-design]** | Ratified by debate/disposition but NOT yet in SPEC and NOT implemented. |
| **[nominal-spec-ahead]** | In SPEC as a Nominal / spec-ahead-of-implementation section; NOT implemented. |
| **[renamed]** | The feature shipped, but the audit names an old glyph/keyword; the current canonical form is given. |
| **[changed]** | The feature shipped, but the audit names an old/legacy surface shape; the current canonical surface is given. |
| **[closed/deleted]** | The audit describes an absence or a feature that has since been closed, deleted, or retired. |

---

## 1. Executive Summary

scrml's design is most heavily shaped by a small cluster of typed-functional and systems languages. **Roc** is the single deepest influence — it is scrml's declared data-model lineage (structural value-equality as the sole `==`, function-equality banned at compile time, acyclic immutable values, content-addressed dependencies). **Rust** anchors the type/annotation surface and the typestate/lifecycle and engine-transition model, plus the exhaustive-match failable-error posture and the type-level state-authority pole. **SPARK** (with **Ada**) is the load-bearing prior art for the entire three-zone refinement-type enforcement architecture and scalar/enum-subset constraints. **Erlang** (and its sibling **Elixir**) grounds the state-machine engine, supervision/worker lifecycle, and the `<channel>` real-time primitive — and Phoenix **LiveView** is additionally the named idiomatic anchor for scrml's instance-level state-authority declaration (the variable, not the type, is the locus of authority). **Elm** contributed RemoteData superposition and view-layer exhaustiveness, and — newly surfaced in this pass — is the named "gold standard" for scrml's CPS server-to-state-transition boundary (server returns data via a command, the client transitions state, the server never mutates client `@state`); the same boundary draws on **Next.js** server actions, **Remix**, and **SvelteKit**. **Svelte/Vue/SolidJS** supplied the reactivity and scoped-CSS machinery; **Vue** specifically anchors the markup control-flow directive model (`if=@cond` IS Vue's `v-if` "at the right level of abstraction") and the reactive-CSS-variable bridge (`v-bind()`), while **Svelte** anchors the syntax-enforced co-located keyed reconciliation and **Tailwind** anchors the compiler-embedded tree-shaken utility-class layer. The **SvelteKit/Next.js** file-based routing convention (`[param]` dynamic segments, `[...slug]` catch-all) is the prior art behind scrml's SHIPPED filesystem-inferred routing (`pages/`/`routes/` directory + `[param]`/`[...slug]` → URL, `index.scrml` → `/`, `_layout.scrml` wrappers; SPEC §40 / §47.9.2 path-preserve emission — NOT §20.4, which is route-PARAMETER access). With **Nuxt**, **SolidStart**, and **Remix** as corroborating prior art and Rails `routes.rb` as the config-based contrast. (Caveat: scrml ships *no* per-file route override — `route=` on `<page>` is forbidden, `E-PAGE-ROUTE-ATTR-FORBIDDEN` — so the Remix-style "Approach C hybrid" the v2 text credited did NOT ship; see the Remix entry.) **Go** sits on the error-handling and stdlib axes — scrml "behaves like Rust while the server body reads like Go," and Go's `default`-arm non-exhaustiveness is the deliberate contrast NOT taken; Go's stdlib is the "gold standard for batteries-included." **Clojure/Swift** shaped the value-native map and code-vs-text body model — **but the value-native `map` type is NOT shipped: it was debate-ratified at S167 and its implementation began at S168; SPEC §6.2 still says scrml has "no anonymous record/map annotation type" — so every map credit below is `[ratified-design]`, in-flight, not present-tense.** **Unison/Nix/Lean** seeded the content-addressed build story — **also not shipped: SPEC §58 "Build Story" is an explicit Nominal/spec-ahead section (its banner reads "No build-story implementation exists in the compiler as of S118"), so those credits are `[nominal-spec-ahead]`. (Distinguish: §47 per-chunk FNV-1a content-addressing IS shipped — a different surface from the §58 SHA-256 build-story closure.)** The engine lineage additionally absorbs **Harel statecharts** (the hierarchy origin), **SCXML** (direct structural precedent), and **XState** (the JS-config-shape analog). The compiler-managed **auto-await** model (the developer never writes `async`/`await`/`Promise`; the compiler inserts `await` and parallelizes with `Promise.all`) is a shipped named differentiator, surveyed against React 19's `use()`/Suspense; the "colorless / function-color" gloss is the auditor's framing, not a documented scrml-design influence (see Appendix Gap 3). Rounding out, **HTMX** is the surveyed-and-rejected hypermedia/server-rendered pole that nonetheless shaped the load-bearing "make the server path trivially easy" constraint, and **React** functions almost entirely as the named anti-pattern ("don't recreate React").

**Currency note (v3):** the heaviest SHIPPED influences are Roc (value semantics — `==`, function-equality ban, immutability), Rust (annotation surface, typestate `(A to B)` lifecycles, the `<engine>` model), SPARK/Ada (three-zone refinement enforcement, scalar/enum-subset constraints), Erlang/Elixir (the `<engine>`/`<channel>`/worker-lifecycle cluster — and Erlang's event-payload-on-transition primitive, which LANDED at S154 as §51.0.S, closing the prior "scrml's absence is the outlier" gap), Elm (RemoteData superposition §13.5, view-layer exhaustiveness, the CPS server-to-state boundary), and the file-based routing model (shipped as filesystem-inferred `pages/` + `[param]`/`[...slug]` routing, §40/§47.9.2 — not the §20.4 the v2 text cited; §20.4 is route-PARAMETER access). The map type and the build story are the two largest NOT-YET-SHIPPED influences and are tagged accordingly throughout.

**Post-pass update (§59 landed):** this currency pass grepped SPEC moments before SPEC §59 "Value-Native Maps" landed (scrmlTS `4c8063b6`, S168). The map family below is tagged `[ratified-design]` with a "SPEC §6.2 / not-yet-in-SPEC" framing — that framing is now **superseded**: the map type IS in SPEC, as **§59 (Nominal / spec-ahead)**, so the map credits are more precisely **`[nominal-spec-ahead]` (SPEC §59)**, exactly like the build-story §58. Either reading is the same substance — the map is **specified, NOT implemented**; the phase-c build (type-system → parser → runtime → codegen) flips the §59 Nominal banner. (§6.2's "no anonymous record/map annotation type" describes the *shipped* type system; §59 adds the map type spec-ahead of it.)

---

## 2. By Language

Ordered by influence weight: load-bearing borrows first, then notable, then a short "also surveyed" tail.

### Roc — the declared data-model lineage

scrml's value semantics ARE the Roc model; the equality-operator debate selected it 53/60 and the data-model axiom names Roc as "scrml's declared model."

- Structural value-equality as the sole `==` (no identity comparison) — near-verbatim Roc port. **[borrowed]** — `SPEC.md §45.1` + `scrml-data-model-value-vs-object-2026-06-05.md`
- Function values not comparable for equality (E-EQ-003), compile-time ban (undecidable / halting problem). **[borrowed]** — `scrml-data-model-value-vs-object-2026-06-05.md` + `SPEC.md:21469`
- Method-native map WRITE/REMOVE surface (Gleam/Roc `.insert/.remove/.update`), the grafted-hybrid winner of the map-surface debate. **[borrowed] · [ratified-design]** — the value-native `map` type was DEBATE-RATIFIED S167 (`map-surface-bracket-vs-method-2026-06-06.md`); SPEC §6.2 (~line 2162) still says "no anonymous record/map annotation type"; implementation began S168 (the cycles-prereq map-arc). NOT shipped. — `map-surface-bracket-vs-method-2026-06-06.md`
- Content-addressed, registry-free dependency/import model (BLAKE3-hash-in-URL, content-not-name) — closest direct prior art for scrml's import-host story. **[borrowed] · [nominal-spec-ahead]** — NOT shipped as an import surface: SPEC §21 is a conventional JS module import system (`import { x } from './f.scrml'`); the content-addressed dependency model lives in the §58 Build Story (Nominal) + the living-compiler bridge deep-dive, not in the shipped import system. The hash-in-URL dependency surface is a design target, not a present-tense feature. — `living-compiler-bridge-architecture-2026-04-26.md §2.2`
- Acyclic immutable value-data model (cycles effectively unconstructable). **[prior-art-compared]** — `scrml-data-model-value-vs-object-2026-06-05.md`
- Hide-the-host FFI boundary (META `^{}` / INTERP `${}` sit at the Elm/Roc hide pole). **[prior-art-compared]** — `js-host-boundary-2026-06-06.md`
- Value-native map key constraint (structural-hash keys — the Roc/Gleam point). **[prior-art-compared] · [ratified-design]** — part of the S167-ratified value-native `map` design; not yet in SPEC (§6.2 "no anonymous record/map annotation type"), not implemented. — `js-host-boundary-2026-06-06.md`
- Immutable-by-default with explicit opt-in mutation at the escape site (const deep-freeze). **[prior-art-compared] · [shipped]** — `const-deep-freeze-2026-05-26.md §4.1`
- `parseVariant` typed-boundary primitive — Roc's first-class `Decode` ability (compiler-driven from the type, not hand-rolled). **[prior-art-compared]** — `debate-05-position-roc-expert-2026-05-06.md`

### Rust — the type/annotation, typestate, engine-transition, and type-level-authority anchor

Rust supplies scrml's annotation surface and the "type system IS the documentation / if it compiles the invariant holds" engine philosophy.

- Failable error model: `!{}` handler requires exhaustive match on declared error variants; errors-as-values, no runtime exceptions ("behaves like Rust" while the body reads like Go). **[borrowed]** — `debate-error-handling-2026-04-08.md:337-339`
- Type lifecycles `(A to B)` on struct fields / state-cells — Rust typestate (`File<Closed> -> File<Open>`) is the closest model. **[borrowed] · [renamed]** — the canonical glyph is the contextual keyword `to` (`(A to B)`, SPEC §14.12.2); the `->` form the v2 audit named is LEGACY/deprecated (surfaces `W-LIFECYCLE-LEGACY-ARROW`, §14.12.5). Shipped (per-access tracking landed S135). — `refinement-types-2026-04-05.md` / `lifecycle-annotation-extension-and-flagship-scope-2026-05-25.md`
- Engine transitions via `rule=` on co-located state-children: type-as-single-source-of-truth for legal moves; effects-fire-on-transition via `effect=` / `<onTransition>` (mapped to Rust's `Drop`). **[borrowed] · [changed]** — the `transitions {}` block the v2 audit named is the LEGACY type-level / `<machine>` form (§51.2); the canonical `<engine>` (§51.0) declares transitions via `rule=` (target-only forms: `rule=.Next` / `rule=(.A \| .B)` / `rule=*`) on co-located state-children, with `effect=` / `<onTransition>` for effects. `<machine>` is the deprecated alias (`W-DEPRECATED-001`); a `transitions{}`-style event-arrow `rule=` on `<engine>` is `E-ENGINE-RULE-LEGACY-SYNTAX`. (Note: enum-type `transitions {}` blocks per §14.4/§13.5 still exist as the default-graph declaration on an `:enum` type — distinct from the engine surface.) Shipped. — `debate-state-dynamics-2026-04-08.md:135-139,485`
- Type-annotation syntax (`param: Type`, `-> Ret`, `Type[]`, `T?`, `@var:Type`, `.variants`) — "Rust-aligned"; Rust dev-personas wrote it naturally. **[borrowed]** — `radical-doubt-final-synthesis-2026-04-08.md:37`
- Lifecycle-annotation carve-out (field/value-progression kept distinct from enum variant-graphs) — makes an informal Rust convention explicit. **[borrowed]** — `lifecycle-annotation-extension-and-flagship-scope-2026-05-25.md:501,531`
- Type-level state authority (structured state types carry authority; `< Card authority="server" table="cards">` — a `CardDraft` is structurally incapable of server persistence, the newtype pattern) — the Approach-B pole of the state-authority debate, adopted for STRUCTURED state in the A/B hybrid. **[borrowed]** (for structured state) — `debate-state-authority-2026-04-08.md` / `state-authority-declarations-2026-04-08.md`
- `use` keyword for importing language capabilities (vs `import` for files) — "universally understood and well-liked." **[borrowed]** — `import-system-2026-03-30.md:361`
- Foreign-code embedding delimiter — level-marked raw delimiters (`r##"..."##`); `#` marker rejected partly for collision with Rust's `#[attribute]`. **[prior-art-compared]** — `foreign-code-sigil-2026-04-03.md`
- Polyglot WASM call-char registry — `r{}` = Rust default mapping. **[prior-art-compared]** — `call-char-registry-2026-04-03.md`
- Rust `Result<T,E>` is the universal-pattern data point in the CPS prior-art table (fallible op returns, caller handles via `match`/`?`). **[prior-art-compared]** — `cps-state-machine-server-transitions-2026-04-06.md`

### SPARK / Ada — the refinement-type enforcement architecture

SPARK is the closest prior art and won the contracts debate; Ada is the 40-year production model for scalar and enum-subset constraints.

- Three-zone enforcement model: static proof / boundary runtime check / trusted interior — every element has a direct SPARK analog. **[borrowed]** — `contracts-debate-2026-04-08.md`
- Function-boundary contract = SPARK `Pre`-condition semantics (visible in the signature, enforced at the call site), NOT Ada's invisible `Constraint_Error`. **[borrowed]** — `contracts-debate-2026-04-08.md`
- Static elision of machine-transition guards (SPEC §51.5 SPARK-hybrid: a statically-proven transition emits no runtime guard, mirroring GNATprove). **[borrowed]** — `machine-guard-static-elision-2026-04-19.md` / `radical-doubt-machine-contract-unification-2026-04-08.md`
- Scalar refinement types `number(>0 && <10000)` modeled on Ada subtype range constraints (`subtype Age is Integer range 1..150`). **[borrowed]** — `contracts-debate-2026-04-08.md` / `contracts-mutable-data-2026-04-08.md`
- Enum-subset refinement (`oneOf([.Admin,.Editor])`) with match-exhaustiveness narrowing + widen-free/narrow-checked flow — Ada subtype-of-enum model verbatim. **[borrowed]** — `enum-subset-refinement-exhaustiveness-2026-06-02.md`
- `const` deep-freeze enforcement via the existing three-zone mechanism (freeze cost paid only at boundary crossings) rather than a parallel cell modifier. **[borrowed]** — `design-insights.md` (2026-05-26)
- Enumerated `oneOf([...])` chosen over Ada's `range` form — sidesteps the SPARK RPP02 union-evolution hazard. **[rejected]** (the range form) — `enum-subset-refinement-exhaustiveness-2026-06-02.md`
- Cross-field constraints (`start_date < end_date`) NOT expressible as a scalar subtype — learned from Ada's documented record-invariant gap; motivates a second mechanism. **[prior-art-compared]** — `contracts-debate-2026-04-08.md`

### Erlang — the state-machine / supervision / isolation grounding

`gen_statem` is the canonical "telecom-grade / 30-year production" anchor for the machine/engine feature set.

- State-machine engine (transitions, guards, state-enter actions, state/event timeouts) grounded in `gen_statem`. **[prior-art-compared]** — `state-dynamics-design-2026-04-08.md` / `machine-cluster-expressiveness-2026-04-17.md`
- Supervised worker restart semantics (`restart="always" max-restarts=5 within=60`) + terminate/cleanup hook (Erlang `terminate/2`). **[borrowed]** — `worker-lifecycle-hooks-2026-04-03.md` / `nested-program-semantics-2026-04-03.md`
- Event-payload-on-transition primitive (events carry typed payload, "payload as fn args") — `gen_statem` motivated it, and scrml NOW HAS it. **[prior-art-compared] · [closed/deleted]** (the absence) — the v2 framing ("scrml's absence was the outlier") is no longer true: the primitive LANDED S154 as SPEC §51.0.S engine message dispatch (`accepts=MsgType` opener attr + `(state × message)` arms + `.advance(arg)` plane-resolution §51.0.G.1 + 5 new §34 codes: E-ENGINE-ACCEPTS-NOT-ENUM, E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE, E-ENGINE-MSG-UNKNOWN, E-ENGINE-MSG-WITHOUT-ACCEPTS, E-MATCH-SUBSET-DEAD-ARM). Shipped. — `machine-cluster-expressiveness-2026-04-17.md` / `event-payload-transition-primitive-2026-06-02.md`
- No parallel-region keyword on machines — `gen_statem` ships zero; coexisting processes ARE the pattern (matches §51.4). **[rejected]** (the parallel keyword) — `parallel-attribute-disposition-2026-05-08.md`
- Nested `<program>`/worker shared-nothing isolation with message passing. **[prior-art-compared]** — `nested-program-semantics-2026-04-03.md`
- Hot-code-reload / current-old two-version coexistence — analog for multi-version declaration coexistence. **[prior-art-compared]** — `superposition-as-language-pillar-2026-04-26.md`

### Elixir — capability-import, channels, batteries-included stdlib, instance-level state authority

- `use` keyword for injecting language capabilities (`use GenServer`/`__using__/1`) — closest prior art to "importing capabilities that extend what a file can do." **[borrowed]** — `import-system-2026-03-30.md`
- `<channel>` real-time bidirectional primitive (topic-based pub/sub, join/leave lifecycle) — Phoenix Channels is "the model for scrml's `<channel>`." **[borrowed] · [shipped]** — `<channel>` is shipped (SPEC §38), but the current shape DIVERGED from earlier drafts: at the D3 rewrite (S58/Insight 30, 2026-05-04) `<channel>` became a CHILD of the entry-file `<program>` (sibling of `<page>`), the `@shared` modifier was REMOVED (the old `E-CHANNEL-002` is retired → `E-CHANNEL-SHARED-MODIFIER`), and channel cells are V5-strict. — `websocket-server-push-2026-04-10.md` / `channel-architecture-v0.3-2026-05-12.md`
- Instance-level state authority — Phoenix LiveView's distinction between persistent socket assigns (server-owned, always synced) and ephemeral form state, coexisting in the same assigns map, is the named idiomatic anchor: "the variable is the locus of authority." Approach A WON the state-authority debate (49.5/60) and is adopted for PRIMITIVE reactive vars (`server @loading`, `@editingId`) in the A/B hybrid. **[borrowed]** (for primitive state) — `debate-state-authority-2026-04-08.md` / `state-authority-declarations-2026-04-08.md`
- Distinct mount/dismount lifecycle keywords (NOT a unified `when`) — LiveView's distinct callbacks, one of three independently-converging perspectives. **[convergent]** — `debate-lifecycle-syntax-2026-04-08.md`
- Comprehensive batteries-included web stdlib philosophy (Phoenix/Ecto/LiveView) — "closest philosophical match to scrml's vision"; Approach B in the stdlib dive is "the Go/Phoenix model." **[prior-art-compared]** — `stdlib-design-2026-03-30.md`
- Railway-oriented `with`-chain error model — evaluated, NOT adopted; scrml favors enforcement over narrative clarity. **[rejected]** — `debate-error-handling-2026-04-08.md`
- Detached-machine model (gen_statem callback module separate from data) — argued but lost to Rust type-co-located on paradigm fit; extensibility insight acknowledged. **[rejected]** (as primary) — `debate-state-dynamics-2026-04-08.md`
- Per-role SSR content stripping = server-render-time gating (LiveView). **[prior-art-compared]** — `giti-027b-per-role-ssr-content-stripping-2026-05-30.md`
- Ecto eager preloading as SQL N+1 batching prior art (no compile-time detection — scrml improves on it). **[prior-art-compared]** — `sql-batching-2026-04-14.md`
- `->` "one true arrow" match operator considered, rejected (breaks `fn -> U`). **[rejected]** — `debate-match-arm-syntax-2026-04-14.md`

### Elm — view-layer exhaustiveness + RemoteData superposition + the CPS server-to-state architecture

- Error-exhaustiveness extended to the markup/view layer — a new error variant is a compile error if any `<errorBoundary>`/`renders` lacks a path; "the Elm guarantee applied to markup." **[borrowed]** — `debate-error-handling-2026-04-08.md`
- RemoteData four-state superposition — direct ancestor of the §13.5 async-loading enum pattern and the "impossible state" lesson. **[borrowed] · [shipped]** — shipped as the §13.5.2 canonical pattern, but the SHIPPED scrml variant names are `NotAsked / Loading / Ready(users) / Failed(message)` (Elm's `Failure/Success` map to scrml's `Failed/Ready`); it is a documented `:enum` idiom with a `transitions {}` block, not a built-in `RemoteData<T,E>` generic type (scrml has no generics). — `superposition-as-language-pillar-2026-04-26.md`
- CPS server-to-state-transition boundary — The Elm Architecture (`update : (Model, Cmd Msg)`; server work goes out as a `Cmd`, results come back as a `Msg`, and the server NEVER touches the `Model` directly) is named the "Gold standard" for scrml's rule that server functions RETURN data and the client transitions `@state` — the server may NOT mutate client `@state`. This is the boundary that eliminated Approach A (CPS-splitting-in-conditionals) and Approach C (enum-exemption). **[borrowed]** — `cps-state-machine-server-transitions-2026-04-06.md` (prior-art table L404, L411)
- Hide-the-host FFI boundary (ports/flags/custom-elements, adopter never writes raw host) — anchors the hide pole META/INTERP sit at. **[borrowed]** — `js-host-boundary-2026-06-06.md`
- Explicit-text quoted-text model (`text "..."`, no bare text) — the camp the quoted-text proposal joins; "central prior-art datum." **[prior-art-compared]** — `quoted-text-model-friction-and-prior-art-2026-05-20.md`
- `Set = Dict t ()` derive-from-map trick. **[prior-art-compared]** — `js-host-boundary-2026-06-06.md`
- Curated-registry trade-off ("highest quality, smallest ecosystem") data point. **[prior-art-compared]** — `dependency-model-no-npm-2026-03-30.md`
- Async-loading RemoteData-enum pattern (Approach C in the async dive is "Elm-Inspired"). **[prior-art-compared]** — `async-loading-pattern-2026-04-10.md`
- Iteration has no language-level structural primitive in Elm (`List.map (\item -> ...)`) — surveyed as the functional-first outlier within the `<each>` design surface. **[prior-art-compared]** — `iteration-design-surface-2026-05-25.md`
- Map key constraint NOT primitives-only (scrml allows structural struct/enum keys). **[rejected]** — `js-host-boundary-2026-06-06.md`
- Typestate machine-transitions: Elm deliberately does NOT have them (trusts exhaustive case over Msg) — argument-against. **[rejected]** — `machine-cluster-expressiveness-2026-04-17.md`

### Go — Result-narrative error body, batteries-included stdlib, deliberate non-exhaustive contrast

Go is a full participant in the error-handling debate (Rust / Go / Elm) and the stdlib dive's batteries-included anchor; it is the "happy-path narrative" half of scrml's error model.

- Server-function body "reads like Go" — `?`-style propagation, linear happy path — paired with a Rust-exhaustive `!{}` handler at the call site. The deliberate split (Go narrative + Rust enforcement) is the recorded design insight. **[borrowed]** (the body narrative) — `debate-error-handling-2026-04-08.md:337-339`
- Go's `default` catch-all / non-exhaustive `switch` — explicitly the contrast NOT taken; scrml's `!{}` is exhaustive (compile error on a missing variant), specifically NOT Go's `default`-arm "new errors arrive silently." **[rejected]** (the non-exhaustiveness) — `debate-error-handling-2026-04-08.md:337,168`
- Go stdlib — "Gold standard for 'batteries included'"; ~150 packages, `net/http` alone eliminating Express/Koa/Fastify; the data point motivating scrml's comprehensive web-stdlib direction. The stdlib dive's Approach B is named "the Go/Phoenix model." **[prior-art-compared]** — `stdlib-design-2026-03-30.md:695,772`
- Go unused-imports-are-compile-errors / dead-code-eliminated-by-linker discipline — the cleanliness data point. **[prior-art-compared]** — `stdlib-design-2026-03-30.md:695`
- Go `net/http` explicit handler registration (`http.HandleFunc`) — the per-handler explicit-routing data point (scales poorly; every Go web framework adds its own router), contrasted against file-based routing. **[prior-art-compared]** — `routing-system.md`
- Compiler-managed async is contrasted against Go's explicit asynchrony in the framework-gaps strength table (scrml "no async/await in user code" vs "every other framework requires explicit async management"). **[prior-art-compared]** — `framework-gaps-tiered-runtime-2026-04-06.md:288`

### Svelte — derived reactivity, scoped CSS, direct-DOM, syntax-enforced keyed iteration

- Derived reactive values (`const @x = expr`) — Svelte 5 `$derived` (compile-time dep analysis + `.by()` escape) is "the closest model" to chosen Approach A. **[convergent]** — `derived-reactive-values-2026-03-30.md`
- Scoped CSS — Svelte hash-based class scoping (`svelte-xyz123`, `:global()`, `:where()`) was the surveyed "closest prior art." **[prior-art-compared] · [changed]** — scoped CSS is shipped, but the SHIPPED form DIVERGED from the Svelte hash-class model: scrml compiles constructor-level `#{}` to **native CSS `@scope`** (`@scope ([data-scrml="Name"]) to ([data-scrml]) { … }`, SPEC §9 / §24.6) with class names NEVER mangled (1:1 human-readable output, implicit donut scope). The Svelte hash-scoping informed the decision but is not the shipped mechanism; tag adjusted from v2's [borrowed]. — `css-scoping-2026-04-02.md`
- Keyed reconciliation / stable per-row identity — Svelte's `{#each tasks as task (task.id)}` puts the key in the block declaration co-located with the loop ("syntax-enforced; cannot be forgotten or misplaced"); it is the cited model behind scrml's §17.4b `key` clause (and the candidate `<each ... key=>` surface). scrml already performs keyed reconciliation, preserving DOM nodes by key. **[prior-art-compared]** — `debate-control-flow-2026-04-08.md` / `iteration-design-surface-2026-05-25.md §17.4b` / `fine-grained-reactivity-2026-04-05.md:127`
- Markup control-flow block syntax (`{#if}/{:else}/{/if}`, `{#each}...{:else}`) — surveyed in the control-flow debate; Svelte's unified `{#each}...{:else}` empty-state arm is the recorded design insight (the empty arm belongs to the loop), seeding scrml's `for { lift } else { lift }` empty-block. **[prior-art-compared]** — `debate-control-flow-2026-04-08.md`
- Reject compiler-inferred derivedness — Svelte 4 `$:` abandoned in 5 as "a design mistake" → precedent for rejecting Approach D. **[rejected]** — `derived-reactive-values-2026-03-30.md`
- Compiler-held direct DOM references (no querySelector) — Approach C "Svelte Model," perf gold standard. **[prior-art-compared]** — `event-delegation-2026-03-30.md`
- Named-slot / snippet composition surveyed (`let:item` flagged as feeling ported). **[prior-art-compared]** — `component-slots-design-2026-04-02.md`
- Markup-side event-to-state assignment ergonomics validates bare-write; but Svelte has no engine self-description, so scrml goes beyond. **[convergent]** — `event-payload-transition-primitive-2026-06-02.md`

### Vue — fine-grained reactivity engine, markup control-flow directives, reactive-CSS bridge

scrml's `if=@cond` on an element IS the Vue `v-if` pattern — "not accidentally Vue-like — it's Vue-like because that's the right level of abstraction for HTML-primary development."

- Fine-grained reactivity (Proxy-wrapped state, property-level track/trigger, array-method interception) — Vue 3 `reactive()` is the primary recommended mechanism; the hybrid ports it. **[borrowed]** — `fine-grained-reactivity-2026-04-05.md`
- Markup control-flow directives (`if=@cond` / `else=` / `for=` / `key=`) — the Vue `v-if`/`v-for`/`:key` directive model: directives augment HTML, they don't replace it; the template reads as HTML. scrml's existing `if=@condition` is named the Vue pattern, and the additive `else=`/`for=`/`key=` markers are the Vue-convention extension. **[borrowed]** (as convention) — `debate-control-flow-2026-04-08.md`
- Reactive CSS / CSS-variable bridge — `@var` inside `#{}` compiles to `var(--scrml-varName)` + `setProperty()` + a reactive subscribe; Vue's `v-bind()` "for reactive CSS" is the named prior-art row (SS24). Distinct from the hash-scoping credit above. **[prior-art-compared]** — `css-scoping-2026-04-02.md:43-71,404`
- Lookup-based tag resolution (no required PascalCase) — Vue 3 SFC demonstrates case-as-recommendation. **[convergent]** — `state-as-primary-unification-2026-04-30.md`
- Scoped CSS (`data-v-hash`, `:deep()`/`:slotted()`/`:global()`) surveyed alongside Svelte. **[prior-art-compared]** — `css-scoping-2026-04-02.md`
- Keeping the `@` value-access sigil — Vue 3's removed Reactivity Transform (`$ref`, dropped in 3.4+) is the cautionary tale validating a visible marker. **[prior-art-compared]** — `debate-01-dd5-at-var-survival-2026-05-03.md`
- Computed/derived (`computed()` lazy dirty-flag) surveyed as a debate voice. **[prior-art-compared]** — `derived-reactive-values-2026-03-30.md`
- `@event`/`$emit()` component communication rejected — `@` is already scrml's reactive sigil. **[rejected]** — `callback-props-2026-03-30.md`

### Clojure — code-default bodies + identity/value split

- Quoted-text model — homoiconic "bare = code, quote the data exception" (`'sym`/`"str"`); clojure-expert won the debate. **[borrowed]** — `quoted-text-model-friction-and-prior-art-2026-05-20.md §2.3` / `design-insights.md`
- Reactive cell (identity) vs value (value) split — Clojure atoms vs immutable structurally-shared values; scrml independently arrived at the same split. **[convergent]** — `scrml-data-model-value-vs-object-2026-06-05.md`
- `const` deep-freeze as immutability-as-type-property ("a Clojure-ish move"). **[convergent]** — `const-deep-freeze-2026-05-26.md §4.3`
- Value-native map surface referee — `dissoc`-vs-`assoc-nil` distinction killed the `=not`-removes conflation (distinct `.remove` verb). **[prior-art-compared] · [ratified-design]** — informed the S167-ratified map design; the map type is not yet in SPEC (§6.2 "no anonymous record/map annotation type") and not implemented (impl began S168). — `map-surface-bracket-vs-method-2026-06-06.md`

### Swift — value-native map bracket-read + optional sugar

- Value-native map bracket-READ surface (`@m[k] -> ValT | not`, `[:]` empty literal, `not` = `Optional.none`) — bracket-READ quartet ratified as the design's strength. **[borrowed] · [ratified-design]** — DEBATE-RATIFIED S167; not yet in SPEC (§6.2 "no anonymous record/map annotation type"), not implemented (impl began S168). — `map-surface-bracket-vs-method-2026-06-06.md`
- Bracket-native WRITE (`@m[k]=v`, `dict[k]=nil`-removes) — the as-originally-proposed write surface, deliberately NOT taken in the ratified design (Swift expert rated the write a SEV-HIGH wart); replaced by method-write. **[rejected] · [ratified-design]** — the rejection is part of the S167-ratified (not-yet-shipped) map design; the whole map type awaits SPEC + implementation (impl began S168). — `map-surface-bracket-vs-method-2026-06-06.md`
- `T?` optional sugar + `->` return arrow; `Card[]?` precedence chosen to match Swift. **[borrowed]** — `type-annotation-syntax-2026-04-08.md`
- Foreign-code / raw-text sigil — SE-0200 extended string delimiters (`#"..."#`). **[borrowed]** — `foreign-code-sigil-2026-04-03.md`
- Engine state-child payload variants — associated-value enums validate the CONSUME side (already shipped). **[convergent]** — `event-payload-transition-primitive-2026-06-02.md`
- Copy-on-write value-type cost model. **[prior-art-compared]** — `const-deep-freeze-2026-05-26.md`
- Compile-time exclusivity enforcement → linear-resource discontinuous scoping. **[prior-art-compared]** — `lin-discontinuous-scoping-2026-04-13.md`

### Gleam — typed host-escape + method-native map write

- Typed, bounded, declared host-escape FFI (`@external`: typed-per-fn, named, non-ambient, companion-file, the only door) — the exact profile `extern`/`import:host` already match; the fit-verdict favorite. **[convergent]** — `js-host-boundary-2026-06-06.md`
- Method-native map WRITE/REMOVE/ITERATE surface (48/60 position whose write-side graft won); Gleam expert independently converged on bracket-read + method-write. **[borrowed] · [ratified-design]** — DEBATE-RATIFIED S167; the value-native `map` type is not yet in SPEC (§6.2 "no anonymous record/map annotation type") and not implemented (impl began S168). — `map-surface-bracket-vs-method-2026-06-06.md`
- Value-native map key constraint (Roc/Gleam structural-hash point; Set-as-thin-wrapper trick). **[prior-art-compared] · [ratified-design]** — part of the S167-ratified, not-yet-shipped map design. — `js-host-boundary-2026-06-06.md`
- State-as-primary uniform-tag model (Lustre: every element is a function returning `Element`). **[prior-art-compared]** — `state-as-primary-unification-2026-04-30.md`

### SolidJS — compiler-driven event delegation + reference-identity keying + control-flow elements

- Compiler-driven event delegation (document-level dispatch, O(1)) — "most relevant prior art for a compiler-driven delegation system"; seeds Approach E. **[borrowed] · [shipped]** — the compiler emits document-level `document.addEventListener` dispatch for delegable events with a per-element `addEventListener` fallback for non-delegable ones (`compiler/src/codegen/emit-variant-guard.ts`, `emit-synth-surface.ts`). NB the audit's `delegateEvents()`/`__click` are Solid's API names (the prior art), not scrml's emitted shape. — `event-delegation-2026-03-30.md`
- Reference-identity keying — Solid's `<For each={tasks}>` tracks by reference identity (no `:key` attribute required); the node moves because the reference is its identity. Surveyed as the zero-key keyed-reconciliation pole alongside Svelte's explicit key. **[prior-art-compared]** — `debate-control-flow-2026-04-08.md` / `iteration-design-surface-2026-05-25.md`
- Control-flow elements (`<Show>`, `<For>`) — "control flow should look like markup because it IS markup"; the precedent (alongside scrml's existing compiler-known `<timer>`/`<poll>`/`<request>`/`<errorBoundary>`) for the structural-iteration `<each>` candidate. `<For>`'s render-prop body is the prior art for the `:`-shorthand single-expression form. **[prior-art-compared]** — `debate-control-flow-2026-04-08.md` / `iteration-design-surface-2026-05-25.md`
- Explicit-signals fine-grained reactivity (Solid model) — surveyed Approach B, rejected as "incompatible with scrml's current architecture." **[rejected]** — `fine-grained-reactivity-2026-04-05.md`
- `@var` access-marker survival — `count()` invocation-marker (with Marko) industrial validation for keeping `@`. **[prior-art-compared]** — `debate-01-dd5-at-var-survival-2026-05-03.md`
- `createMemo`/`createEffect((prev)=>)` — derived-value voice + prev-value transition comparison. **[prior-art-compared]** — `derived-reactive-values-2026-03-30.md` / `state-dynamics-design-2026-04-08.md`
- `createResource` (`.loading`/`.error`/`.latest`) — surveyed async-loading prior art (known stuck-loading issues). **[prior-art-compared]** — `async-loading-pattern-2026-04-10.md`

### Haskell — superposition lineage + the refinement academic pole

- Laziness/deferred-computation (thunk + WHNF) as the runtime layer's lineage — `?{}` queries and RemoteData are thunks; scrml makes collapse explicit. **[convergent]** — `superposition-as-language-pillar-2026-04-26.md`
- `T | not` = `Maybe T`, and the unifying "superposition" framing across Maybe/Either/IO — but monads-as-explicit-types ceremony deliberately avoided (the compiler-managed auto-await elides it). **[convergent]** — `superposition-as-language-pillar-2026-04-26.md`
- Liquid Haskell `{v:Int | v>0}` SMT-checked refinement — the academic pole explicitly NOT taken (36/60 in the contracts debate, lost to SPARK; "no SMT, just constant folding and flow analysis"). **[rejected]** — `refinement-types-2026-04-05.md` / `contracts-debate-2026-04-08.md`
- LiquidHaskell general refinement subtyping — rejected as overkill for decidable enum-membership. **[rejected]** — `enum-subset-refinement-exhaustiveness-2026-06-02.md`
- Standalone overload deletion — Wadler & Blott 1989 typeclass discipline; name-collision-as-overload is the anti-pattern Haskell escaped, used to justify deleting scrml's accidental overload. **[rejected] · [closed/deleted]** (the anti-pattern) — the v2 "is deleting it" framing is stale: state-type-discriminated function-overloading WAS DELETED at S64 (debate-02 verdict, 5 deprecate / 1 soft / 0 retain; §17.5(a); impl surface `emit-overloads.ts` + registry + tests removed at Stage 0c.A). Component-overloading (§17.5(b)) was DOC-ONLY and never implemented, CLOSED WITHOUT RESOLUTION (debate-03). Past tense — done. — `debate-02-state-type-overload-deletion-2026-05-06.md`
- Elm-in-Haskell / Roc-in-Rust counter-evidence — scrml's own lineage did NOT self-host in its value-pure language; informs the two-layer-exemption ruling. **[prior-art-compared]** — `two-layer-exemption-2026-06-06.md`
- GHC LANGUAGE-pragma proliferation (→ GHC2021/2024 consolidation) — cautionary lesson against fine-grained tier rungs. **[prior-art-compared]** — `tier-ladder-rungs-stability-2026-05-06.md`

### TypeScript — the JS-developer baseline scrml surpasses

- Type-annotation syntax (`x: Type`, `T[]`, `T | U`, `[]`-binds-tighter precedence) chosen to match TS (largest user base). **[borrowed]** — `type-annotation-syntax-2026-04-08.md`
- Predicate/refinement system (§53) positioned to SURPASS TS+Zod runtime-parse ("Zod can't fail your build. This can."). **[rejected]** (TS+Zod as the model) — `debate-05-position-scrml-dev-typescript-2026-05-06.md` / `predicate-system-zod-replacement-2026-05-06.md`
- Branded types (`number & {__brand}`) compared as zero-enforcement / `as`-bypassable — the gap scrml fills. **[prior-art-compared]** — `refinement-types-2026-04-05.md`
- `schemaFor` — Drizzle's object-literal → SQL DDL ("the type IS the schema") closest precedent. **[prior-art-compared]** — `schemaFor-design-2026-05-19.md`
- `formFor` — RHF+Zod (~80% share) is dominant but rejected as a derivation model (fields not auto-rendered); scrml derives fields. **[prior-art-compared]** — `formFor-design-2026-05-18.md`

### React — the named anti-pattern (with a few surveyed primitives)

React is almost entirely a "do NOT do this" reference; the standing constraint is "don't recreate React."

- Whole-language identity constraint — every feature must feel scrml-native, not a React port. **[rejected]** — `derived-reactive-values-2026-03-30.md` / `component-slots-design-2026-04-02.md` / `callback-props-2026-03-30.md`
- Component-vs-HTML PascalCase discriminator (inherited from React/JSX) — rejected for registry/lookup resolution; "scrml's first drift." **[rejected]** — `state-as-primary-unification-2026-04-30.md`
- Callback-props communication (`onSubmit`/`onClose`) — explicitly rejected; scrml chose shared-state-mutation. **[rejected]** — `callback-props-2026-03-30.md`
- Root-container event delegation (React 17+) — rejected; requires a full runtime scrml doesn't want. **[rejected]** — `event-delegation-2026-03-30.md`
- Free-text-default markup with `${}` interpolation — JSX `{ expr }` is the status quo scrml mirrors. **[prior-art-compared]** — `quoted-text-model-friction-and-prior-art-2026-05-20.md`
- Auto-await / loading-state surveyed against React 19 — `<Suspense fallback>` + the `use()` hook (read promises) + `useActionState` (`[state, formAction, isPending]`) + `useTransition` (automatic `isPending`) are the named "industry standard" prior art for async-loading boundaries that scrml's compiler-managed async aims to eliminate the boilerplate of. **[prior-art-compared]** — `async-loading-pattern-2026-04-10.md` / `framework-gaps-tiered-runtime-2026-04-06.md`
- React Server Components / Server Actions — server actions return data, `useActionState` captures it client-side, the client transitions state — a corroborating CPS prior-art row ("server returns, client transitions"). **[prior-art-compared]** — `cps-state-machine-server-transitions-2026-04-06.md`
- `@var` reactive-cell sigil — the convention adopters carry from React `useState` (the JS-framework sigil that "infected" the language). **[borrowed]** — `debate-01-dd5-at-var-survival-2026-05-03.md` / `dd5-state-primitive-2026-05-03.md`

### Redux — discriminated-union dispatch + normalized graphs

- Engine message dispatch — `dispatch({type,payload})` + reducer `switch` discriminated union; per-engine surface heeds the "incomplete-union antipattern" caution. **[prior-art-compared]** — `event-payload-transition-primitive-2026-06-02.md`
- Graphs as normalized ID-indexed data (`{byId, allIds}`) — multiply-canonized precedent for escaping pointer cycles. **[prior-art-compared]** — `scrml-data-model-value-vs-object-2026-06-05.md` / `nested-reactive-updates.md`
- Engine declaration position — singleton-store Model B (`createStore` once + `useSelector`). **[prior-art-compared]** — `dd7-engine-declaration-position-2026-05-03.md`
- Redux Toolkit / Immer exist only because nested reactive assignment was never solved at the language level — scrml solves it in-compiler. **[prior-art-compared]** — `nested-reactive-updates.md`

### HTMX — the surveyed-and-rejected hypermedia / server-rendered pole

HTMX is a recurring named debate participant (control-flow, state-authority, CPS, async-loading). Its server-rendered/hypermedia philosophy is rejected as a primary architecture for a client-side reactive language, but its "loyal opposition" ask is load-bearing: the architecture should make the server path trivially easy.

- Hypermedia control-flow model (server owns all control flow; the client renders received HTML; `hx-get`/`hx-post`/`hx-swap`/`hx-target`) — surveyed in the control-flow debate, lowest score (39/50), structurally mismatched to a client-side reactive language; but its "ask which conditionals could be server-rendered first" is recorded. **[rejected / prior-art-compared]** — `debate-control-flow-2026-04-08.md`
- Server-always state authority — the third pole of the state-authority debate; "forms are the state container, in-flight user input is not reactive state." This insight is adopted as a third state category: form-data needs NO authority declaration (the compiler treats form fields as ephemeral). **[prior-art-compared]** (the forms-as-state-container insight kept; the server-always pole rejected as primary) — `debate-state-authority-2026-04-08.md`
- HTML-fragment swap as the CPS boundary — "the server IS the state"; a prior-art row reinforcing "no production framework lets server code mutate client state." **[prior-art-compared]** — `cps-state-machine-server-transitions-2026-04-06.md`
- `hx-boost`/server-rendered navigation — surveyed and rejected as scrml's routing model (every click = server request, no SPA behavior). **[rejected]** — `routing-system.md`
- The load-bearing constraint extracted from HTMX across all four debates: "make the server path trivially easy" so developers reach for client-side conditionals only when latency forces it. **[prior-art-compared]** — `debate-control-flow-2026-04-08.md:402,410`

### XState / SCXML / Harel statecharts — the structural-state-children lineage

The engine state-children model (structural transitions as scrml-shaped tags + attributes) draws its prior art from the statechart tradition; the dd6 §13 prior-art table is the source.

- Harel statecharts (1987) — the origin of hierarchical / nested state (a macro-state contains its own nested sub-machine); the hierarchy primitive behind scrml's nested-engines future direction (§12). Mainstream PLs never absorbed it cleanly; under scrml's structural state-children it maps naturally ("engines compose the same way HTML elements compose"). **[prior-art-compared]** — `dd6-engine-state-children-2026-05-03.md §12-13`
- SCXML (W3C) — `<state id="...">` with `<transition target="..."/>` children — named the "DIRECT precedent for structural state-children"; SCXML has the structural shape, scrml adds the UI integration. **[prior-art-compared]** — `dd6-engine-state-children-2026-05-03.md §13`
- XState v5 — `createMachine({ states: { Pending: { on: { ASSIGN: 'Confirmed' } } } })` — the state-as-key pattern is "the JS-config-shape analog of v0.next's structural state-children"; XState's integration is decoupled from UI, scrml integrates UI directly. (Robot, the FSM library, is the same JS-config-shape data point.) **[prior-art-compared]** — `dd6-engine-state-children-2026-05-03.md §13`

### Next.js — server actions + file-based routing

- File-based routing (App Router): `app/` dir with `page.tsx`, `[param]` dynamic segments, `[...slug]` catch-all — the prior art behind scrml's SHIPPED filesystem-inferred routing. **[borrowed] (as convention) · [shipped]** — scrml shipped the dynamic-segment + catch-all convention (`pages/`/`routes/` dir, `[param].scrml` → `:id`, `[...slug].scrml` → catch-all, `index.scrml` → `/`, `_layout.scrml` wrappers; `compiler/src/route-inference.ts` `buildPageRouteTree`). SPEC home is §40 / §47.9.2 (URL is filesystem-inferred, path-preserve emission) — NOT §20.4 (which is route-PARAMETER access, the `route` object). Next.js's `layout.tsx`/`loading.tsx`/`error.tsx` companion-file convention was SURVEYED (routing-system.md Approach A) but only `_layout.scrml` shipped; there are no `loading.scrml`/`error.scrml` route files. — `routing-system.md` (Approach A, surveyed)
- Server actions — return data; `useActionState`/`useState` captures the result client-side, `useTransition` handles pending state — a CPS prior-art row ("server returns, client transitions"), and the async-loading `useActionState` `isPending` precedent. **[prior-art-compared]** — `cps-state-machine-server-transitions-2026-04-06.md` / `async-loading-pattern-2026-04-10.md`
- Compiler-inferred server/client split is contrasted favorably against Next.js's explicit `"use server"`/`"use client"` directives. **[prior-art-compared]** — `framework-gaps-tiered-runtime-2026-04-06.md:280`

### SvelteKit — file-based routing + form actions

- File-based routing: `routes/` dir with `+page.svelte`/`+layout.svelte`/`+page.server.ts`, `[param]` dynamic segments — prior art for scrml's SHIPPED filesystem-inferred routing; the `+`-prefix convention is "elegant but non-obvious." (scrml-dev-svelte advocated for a `+`-prefixed `+layout.scrml` over `_layout.scrml` in the routing debate; scrml SHIPPED the `_layout.scrml` form.) **[borrowed] (as convention) · [shipped]** — scrml's shipped routing lives at SPEC §40 / §47.9.2 (filesystem-inferred, NOT §20.4). — `routing-system.md` (Approach A, surveyed)
- Form actions return `{ form }`, `use:enhance` patches the response, loaders auto-revalidate — a CPS prior-art row (server returns data, UI re-renders; progressive enhancement built in). **[prior-art-compared]** — `cps-state-machine-server-transitions-2026-04-06.md`
- Server/client split markers cited as consistent with instance-level state authority (Approach A). **[prior-art-compared]** — `debate-state-authority-2026-04-08.md`

### Remix — hybrid file-based routing + loader/action revalidation

- Hybrid file-based routing (React Router v7): file-based primary with a `routes.ts`-style config escape hatch — SURVEYED as routing-system.md Approach C (file-based default + `<route>` overrides). **[prior-art-compared] · [closed/deleted]** (the Approach-C hybrid) — **CORRECTION:** the v2 claim "scrml shipped BOTH file-based routing AND a `<program route=>` attribute [page-route override]" is WRONG. scrml ships PURE filesystem-inferred routing with NO per-file route override: `route=` on `<page>` is actively FORBIDDEN (`E-PAGE-ROUTE-ATTR-FORBIDDEN`, SPEC §4.15/§40). The nested-program `route=` attribute (§4.12.2) is an UNRELATED surface — it declares a nested `<program>` as a SERVER ENDPOINT, not a page-route override. So the Approach-C hybrid was surveyed but NOT taken; Remix corroborates file-based routing only. — `routing-system.md` (Approach C, surveyed-not-taken)
- Actions run server-side and return data; loaders auto-revalidate; UI re-renders — the "gold-standard alongside Elm" CPS prior-art row ("no manual state management for the common case"). **[prior-art-compared]** — `cps-state-machine-server-transitions-2026-04-06.md`
- Loader/action server/client markers cited as consistent with instance-level state authority. **[prior-art-compared]** — `debate-state-authority-2026-04-08.md` / `state-authority-declarations-2026-04-08.md`

### Nuxt / SolidStart — corroborating file-based routing

- Nuxt (Vue): `pages/` dir with `index.vue`/`[id].vue`, `layouts/` directory — "simpler than Next.js app router"; corroborating prior art for file-based routing. **[prior-art-compared]** — `routing-system.md`
- SolidStart: `routes/` dir with `index.tsx`/`[id].tsx`, file-based with optional config override — the cleanest minimal-friction precedent for the SHIPPED file-based model. **[prior-art-compared]** — note the "config-override hybrid" it modeled (Approach C) was NOT taken (see Remix entry); scrml ships file-based with no per-file override. — `routing-system.md`

### Tailwind CSS — compiler-embedded tree-shaken utility classes

- Utility-class model (SS25) — Tailwind utilities are compiler-embedded, tree-shaken, and globally scoped; the component scoping system SHALL NOT hash Tailwind class names. The CG index scans HTML output for class names and appends matched Tailwind CSS. The "dominant approach" data point; works for utility styling but does not handle custom/dynamic styles (so it composes with `#{}` rather than replacing it). **[borrowed]** (the utility-class model, as a complementary layer) — `css-scoping-2026-04-02.md:53,63,409`

### Unison — content-addressed identity for the build artifact

- Content-addressing for the self-host build artifact / multi-version coexistence ("names are pointers, AST is identity") — top-scored design insight; the edge carries the hash, not the name. **[borrowed] · [nominal-spec-ahead]** — this is the §58 Build Story closure (SHA-256 Merkle), which is an explicit Nominal/spec-ahead section: its banner reads "No build-story implementation exists in the compiler as of S118." The Approach-B Merkle closure was DESIGN-ratified S117, not built. (Distinct surface: §47's per-chunk FNV-1a-32 payload-dedup hash IS shipped — that's the artifact payload hash, not the build-story trust closure.) — `superposition-as-language-pillar-2026-04-26.md` / `debate-build-story-artifact-2026-05-21.md`
- AST-canonical storage for `.scrml` files — considered and REJECTED (breaks grep + AI/LLM ingestion); scrml stays source-canonical. **[rejected]** — `file-storage-model-source-vs-ast-canonical-2026-04-26.md`
- Build-story Merkle closure adopted-as-design, but Unison's no-files/pure-database strong form explicitly does NOT transfer (scrml specs an inspectable `build-story.lock` sidecar). **[prior-art-compared] · [nominal-spec-ahead]** — §58 (incl. the §58.5.1–§58.5.4 closure model + `build-story.lock` format) is Nominal/spec-ahead; the closure model and encoding are normatively specified, but the compiler implementation of resolution/generation/verification is not built. — `debate-build-story-artifact-2026-05-21.md`

### Nix — content-addressed reproducible build

- Living-compiler build story — content-addressed reproducible store; "exactly the Nix tradeoff," Nix-derivation-hash + Cargo-lockfile hybrid. **[borrowed] · [nominal-spec-ahead]** — this is the §58 Build Story (Nominal/spec-ahead; "No build-story implementation exists in the compiler as of S118"); DESIGN-ratified S117, not built. — `living-compiler-recoverability-and-comp-time-shape-2026-04-26.md`
- Per-program build identifier — centralized lock (`flake.lock`), inline `narHash` is a known anti-pattern → central table won. **[rejected]** (inline hashes) — `per-program-build-identifier-2026-05-21.md`
- Code-import / vendoring — content-addressed sandboxed derivations as the gold-standard for capability-restricted build steps. **[prior-art-compared]** — `code-import-story-and-vendoring-2026-05-21.md`
- Dependency model (no-npm) — content-addressed hashed dependencies (steep learning curve noted). **[prior-art-compared]** — `dependency-model-no-npm-2026-03-30.md`

### Also surveyed (minor / prior-art-compared tail)

- **Angular** — `@for (item of items; track item.id) { ... } @empty { ... }` with MANDATORY track (heavier than scrml's `W-KEY-001` lint), `@empty` block companion — cited as the move aligning Angular with structural-first idioms (iteration prior art). Angular Router's module-config guards/resolvers surveyed in routing (verbose). `_ngcontent-hash` attribute scoping + `::ng-deep` surveyed in CSS. **[prior-art-compared]** — `iteration-design-surface`, `routing-system`, `css-scoping`
- **Kotlin** — `T?` nullable sugar ("most celebrated nullable syntax") **[borrowed]**; `when`-arm `=>` rejected for `:>` **[rejected]**; implicit `it` rejected for templates (and for the `<each>` implicit-binding Approach C, "widely criticized for nested-lambda readability") **[rejected]**; value-class `init { require(...) }` construction-time predicate **[prior-art-compared]**. — `type-annotation-syntax`, `debate-match-arm-syntax`, `iteration-design-surface`, `contracts-mutable-data`
- **PureScript** — `foreign import` "lean-hide middle" FFI pole; Pursuit hosted docs/type-search; Ord-typeclass map keying NOT taken (scrml has no generics) **[rejected]**. — `js-host-boundary`, `living-compiler-bridge-architecture`
- **ReScript** — `external` + `@val`/`@module` interop pole; `Belt.Map` (value-native) vs `Js.Dict` (host-leak) split informs the value-native-map decision. **[prior-art-compared]** — `js-host-boundary`
- **Koka** — row-polymorphic effect types (research-grade) for machine-transition typing; algebraic-effect handlers for `lin` discontinuous scoping. **[prior-art-compared]** — `machine-cluster-expressiveness`, `lin-discontinuous-scoping`
- **Idris** — dependent types (`Vect (S n) a`) as refinement prior art, research-only, not adopted **[rejected]**; elaborator-reflection determinism point. — `refinement-types`, `meta-system-capability-frontier`
- **Zig** — `comptime`-as-extension (most similar to `^{}` meta) **[convergent] · [shipped]**; spec-enumerates-its-CAN'Ts model; the Zig-comptime-purity-fence contrast now applies to scrml's **compiler-internal** evaluator (the `^{}` constant-folding pass is bounded by §22 determinism constraints — "no `Date.now()`, no `bun.eval()` of non-deterministic shape, no I/O", §40.9.8) **[prior-art-compared] · [closed/deleted]** (the user-facing surface) — the v2 "scrml's `bun.eval` sits on the non-deterministic side" framing named a USER surface that no longer exists: the user-facing `${ bun.eval() }` surface RETIRED at S130 (Approach C, §22.12 / §30 retirement note). scrml's compile-time eval is `^{}` meta with the closed `META_BUILTINS` set; `bun.eval()` is a COMPILER-INTERNAL mechanism only (§30.1) — not an adopter surface; `test "name" {}` inline tests; `z{}` call-char; "no hidden control flow" argument for explicit setters. — `import-system`, `meta-system-capability-frontier`, `inline-testing-perfection`, `nested-reactive-updates`
- **Crystal** — multiple-dispatch rejected (Ruby-compat only, no force in scrml) **[rejected]**; `case/when` + `if` tier-ladder coexistence; no-AST-mutation cluster. — `state-type-overload-deprecation`, `tier-ladder-rungs-stability`, `meta-system-capability-frontier`
- **Nim** — string-vs-AST `emit()` macro evolution; postfix type position; per-function `importc` pragma granularity. **[prior-art-compared]** — `jai-comptime-vs-scrml-meta`, `type-annotation-syntax`, `call-char-registry`
- **Pony** — six uniform reference capabilities (consume-based) in the WIDE lifecycle-position cluster. **[prior-art-compared]** — `lifecycle-annotation-extension-and-flagship-scope`
- **Qwik** — resumability/app-splitting benchmark; scrml converges on zero-JS output but auto-derives splits from the reactive/auth graph instead of dev `$` annotation; `useResource$` surveyed as async-loading prior art. **[convergent]** — `smart-app-splitting-feel-of-performance`, `framework-gaps-tiered-runtime`, `async-loading-pattern`
- **Marko** — filesystem-based tag resolution (no PascalCase); `<let/count>` access-marker tradition; `<for|item, index| of=array>` structural-iteration tag-parameter prior art. **[prior-art-compared]** — `state-as-primary-unification`, `debate-01-dd5-at-var-survival`, `iteration-design-surface`
- **OCaml** — typed-AST traversal for unused-variable/`lin` enforcement (string-scanning rejected in the literature) **[borrowed]**; polymorphic `compare` throws on functions AND cycles (scrml lifts only functions to compile time) **[convergent]**; `[%%foo]` extension-node weak support for bareword sigil; PPX in the custom-syntax cluster. — `lin-enforcement-ast-wiring`, `scrml-data-model-value-vs-object`, `import-host-grammar-shape`, `meta-system-capability-frontier`
- **F#** — Feliz whole-language explicit-text (second shipped Camp-A precedent beyond Elm); type providers; DU + `match`/`function` shorthand. **[prior-art-compared]** — `quoted-text-model-design-space`, `meta-system-capability-frontier`, `tier-ladder-rungs-stability`
- **Scala** — implicits/givens + `import` named as the confusing pattern to AVOID (each scrml import keyword gets one role) **[rejected]**; `=>` match-arm precedent (rejected for `:>`). — `import-system`, `debate-match-arm-syntax`
- **Lean** — Lean 4 macros/elaboration in the "strong" meta cluster; Lake content-addressed build cache "closest fit" / "most direct precedent" for the build story. **[prior-art-compared]** (meta cluster: shipped `^{}`; build-cache precedent: feeds the [nominal-spec-ahead] §58 Build Story) — `meta-system-capability-frontier`, `living-compiler-recoverability-and-comp-time-shape`
- **HEEx (Phoenix LiveView templates)** — `:for`/`:key` attribute-on-element iteration (hybrid structural-element + directive) — the Approach-E `each=` attribute prior art in the iteration surface; "cleanest of the LiveView template surfaces." **[prior-art-compared]** — `iteration-design-surface`
- **Lit** — `${repeat(items, keyFn, fn)}` directive-shaped iteration with keyFn; `<li ${repeat(...)}>` closer to the attribute form. **[prior-art-compared]** — `iteration-design-surface`
- **Astro / Imba / Vento** — JS-native `{items.map}` (Astro, static-first), significant-whitespace `for item in items` (Imba), mustache `{{ for }}` (Vento) — the iteration-surface breadth survey. **[prior-art-compared]** — `iteration-design-surface`
- **PHP (traditional)** — file = URL was "the original file-based routing," but with no layouts/guards/params; "every framework replaced it." The historical-floor data point for routing. **[prior-art-compared]** — `routing-system`
- **CSS Modules / Angular ViewEncapsulation / Shadow DOM / native CSS `@scope`** — the CSS-scoping prior-art survey: build-time class mangling (CSS Modules), `_ngcontent` attribute scoping (Angular), browser-native shadow tree + `::part()` (Shadow DOM), native `@scope` at-rule (baseline Dec 2025, no framework uses it as primary yet). **[prior-art-compared]** — `css-scoping`
- **styled-components / CSS-in-JS** — the reactive-style tradition (CSS custom properties driven by component state) that the reactive-CSS-variable bridge sits within; not individually scored but the lineage context for SS24's `var(--scrml-*)` + `setProperty` model. **[prior-art-compared]** — `css-scoping`
- **Datomic / XTDB** — E-A-V datoms for normalized-ID graphs; "DB as a value" mental model for queryable shape history. **[prior-art-compared]** — `scrml-data-model-value-vs-object`, `living-compiler-recoverability-and-comp-time-shape`
- **Knockout** — `ko.computed()` as the historical ancestor of derived values (eager-eval perf pitfall noted). **[prior-art-compared]** — `derived-reactive-values`
- **Robot (FSM library)** — JS-config `createMachine({ initial, states })` — the second JS-config-shape statechart data point alongside XState. **[prior-art-compared]** — `dd6-engine-state-children`
- **Agda** — no genuine attribution; the sole corpus hit was a false-positive substring match (`DragData`). Recorded for honesty. — `drag-and-drop.md` (false positive)

---

## 3. By Decision

| scrml decision | Inspiring language(s) | KIND |
|----------------|----------------------|------|
| Structural value-equality / single `==` | Roc (port); OCaml (convergent on cycle handling) | borrowed |
| No-null absence — the `not` value | Swift (`Optional.none` mapping); Haskell (`T \| not` = `Maybe T`) | borrowed / convergent |
| Engines as state machines + match/engine/discriminated-union dispatch trio | Erlang `gen_statem` (anchor); Rust (type-co-located transitions); Haskell (deleted standalone overload) | prior-art-compared / borrowed |
| Engine structural state-children (transitions-as-tags) | Harel statecharts (hierarchy origin); SCXML/W3C (direct structural precedent); XState v5 / Robot (JS-config-shape analog) | prior-art-compared |
| Markup control-flow directives (`if=@cond` / `else=` / `for=` / `key=`) | Vue `v-if`/`v-for`/`:key` (the directive convention, "right level of abstraction"); Svelte `{#if}...{:else}` empty-arm + SolidJS `<Show>`/`<For>` compared; HTMX hypermedia rejected | borrowed (convention) / prior-art-compared / rejected |
| Keyed reconciliation / stable per-row identity (`key` clause §17.4b) | Svelte co-located `(task.id)` block key (syntax-enforced); SolidJS reference-identity-as-key compared | prior-art-compared |
| Auto-await / compiler-managed async **[shipped]** (no `async`/`await`/`Promise` in source; compiler inserts `await` + `Promise.all`. "Colorless" is the auditor's gloss, NOT corpus-attested — see Appendix Gap 3) | React 19 `use()`/Suspense/`useActionState` surveyed as the boilerplate to eliminate; Haskell monad-ceremony deliberately elided | prior-art-compared (named differentiator) |
| CPS server-to-state-transition boundary (server returns, client transitions; server may NOT mutate client `@state`) | Elm Architecture (`Cmd Msg`; server never touches Model — "gold standard"); Next.js server actions / Remix / SvelteKit form actions; HTMX/RSC compared; CPS-splitting-in-conditionals + enum-exemption rejected | borrowed (Elm) / prior-art-compared |
| State-authority declarations (server-authoritative vs client-local `@var`) | Phoenix LiveView instance-level (the variable is the locus — Approach A, won) for primitives; Rust type-level (Approach B) for structured types; HTMX server-always third pole; forms-as-ephemeral kept | borrowed (hybrid) / prior-art-compared |
| Filesystem-inferred routing (`pages/`/`routes/` dir + `[param]`/`[...slug]` + `_layout.scrml`; SPEC §40 / §47.9.2 — NOT §20.4, which is route-PARAMETER access) **[shipped]** | Next.js App Router + SvelteKit `+page`/`+layout` (`[param]`/`[...slug]` dynamic+catch-all segments — the shipped prior art); Nuxt + SolidStart corroborate; Rails `routes.rb` config-based contrast. (Next.js `loading.tsx`/`error.tsx` files and the Remix "Approach C hybrid with `<program route=>` override" were SURVEYED but did NOT ship — scrml ships no per-file route override; `route=` on `<page>` is `E-PAGE-ROUTE-ATTR-FORBIDDEN`.) | borrowed (convention) / prior-art-compared |
| Reactive CSS / CSS-variable bridge (SS24) + Tailwind (SS25) | CSS custom properties + Vue `v-bind()` reactive-CSS (the `var(--scrml-*)` + `setProperty` + subscribe model); styled-components/CSS-in-JS reactive-style tradition; Tailwind compiler-embedded tree-shaken utility model | prior-art-compared / borrowed (Tailwind utility layer) |
| V5-strict `@`-sigil value access | React/Vue/Solid `useState`/signals convention; Vue `$ref` removal + Solid/Marko kept-marker validation | borrowed (convention) / prior-art-compared |
| `:>` match-arm arrow | Rust/Scala/Kotlin/Swift/C# `=>` rejected; Elixir `->` rejected (both lose to JS `=>`-is-a-lambda) | rejected |
| Bracket-read value-native maps **[ratified-design — NOT shipped]** (debate-ratified S167; SPEC §6.2 still "no anonymous record/map annotation type"; impl began S168) | Swift subscript-read + `[:]` + `not` (READ borrowed); Roc/Gleam structural-hash keys; Gleam/Roc method-WRITE graft | borrowed |
| `lin` linear types | OCaml typed-AST enforcement (borrowed); Koka effect handlers, Swift exclusivity, Pony ref-capabilities (compared) | borrowed |
| SQL `?{}` block | Haskell thunks/laziness (runtime-deferral lineage); Ecto preloading (N+1 batching compared) | convergent / prior-art-compared |
| Failable error model (`!` + brace handler) | Rust (exhaustive match, errors-as-values); Go (server body "reads like Go," `?`-propagation; Go `default` non-exhaustiveness rejected); Elm (view-layer exhaustiveness); Elixir `with`-chains rejected | borrowed |
| Web stdlib breadth (batteries-included) | Go stdlib ("gold standard," `net/http`); Elixir/Phoenix ("Go/Phoenix model"); Python stdlib cautionary ("batteries corroded") | prior-art-compared |
| Markup-as-a-value | Gleam/Lustre (every tag returns `Element`); Clojure code-default body; Elm/F# explicit-text camp; React/JSX free-text mirror | prior-art-compared / borrowed |
| Type-as-argument family (`parseVariant`/`formFor`/`schemaFor`/`tableFor`) | Roc `Decode` ability (`parseVariant`); Drizzle TS (`schemaFor`); RHF+Zod rejected as derivation model (`formFor`) | prior-art-compared |
| Content-addressed build-story **[nominal-spec-ahead — NOT implemented]** (SPEC §58, Nominal; "No build-story implementation exists in the compiler as of S118"; Approach-B Merkle design-ratified S117. NB §47 per-chunk FNV-1a content-addressing IS shipped — a different surface) | Unison (names-are-pointers identity); Nix (content-addressed derivations); Lean Lake; Erlang/Datomic version-coexistence | borrowed |
| COW / acyclic value-data | Roc (acyclic immutable values); Swift CoW cost model; Clojure identity/value split; Redux/Datomic normalized graphs | borrowed (Roc) / convergent (Clojure) |
| Refinement-type predicates / SPARK zones | SPARK (three-zone, `Pre`-contracts, static elision); Ada (scalar/enum-subset subtypes); Liquid Haskell SMT pole rejected; TS branded types compared | borrowed |

---

## 4. Convergent / Independent

Where scrml arrived at the shape on its own — the language is parallel evidence, not the source.

- **Clojure identity-vs-value split** — the data-model dive notes scrml *already* made the reactive-cell (identity) vs value (value) split; Clojure atoms-vs-values is parallel confirmation. (`scrml-data-model-value-vs-object`)
- **Clojure immutability-as-type-property** — the `const` deep-freeze refinement-predicate is described as "a Clojure-ish move," reached via scrml's own type machinery. (`const-deep-freeze`)
- **Haskell laziness / superposition** — `?{}` queries and RemoteData behave as thunks, but scrml makes collapse explicit (force-on-use/site-resolve) rather than pervasively implicit; the structural insight transfers, the surface does not. (`superposition-as-language-pillar`)
- **Haskell `T | not` = `Maybe T`** — same monadic shape, but scrml deliberately avoids monads-as-explicit-types ceremony (the compiler-managed auto-await elides the boilerplate). (`superposition-as-language-pillar`)
- **OCaml structural-compare-throws-on-functions-and-cycles** — scrml independently lands at the function-equality ban but lifts it to compile time (E-EQ-003) and leaves cycles to a defensive runtime guard. (`scrml-data-model-value-vs-object`)
- **Gleam typed host-escape** — `extern`/`import:host` already match `@external`'s exact profile; the fit-verdict is "the mechanism scrml already owns," not an adoption. (`js-host-boundary`)
- **Zig `comptime`-as-extension** — scrml's `^{}` meta converged on the same comptime-IS-the-extension shape with no separate language-extension import. (`import-system`)
- **Svelte `$derived`** — "the closest model" to the independently-chosen Approach A derived-value design; Svelte's bare-write event ergonomics validate scrml's, but scrml's engine self-description goes beyond Svelte. (`derived-reactive-values`, `event-payload-transition-primitive`)
- **Vue lookup-based tag resolution** — Vue 3 SFC demonstrates case-as-recommendation in a JSX-shaped framework, confirming scrml's casing-irrelevant choice. (`state-as-primary-unification`)
- **Elixir/Svelte/Rust lifecycle-keyword convergence** — three independent experts (LiveView distinct callbacks, Svelte compile-time reactivity, Rust Drop-cleanup) named the same one-shot-vs-ongoing boundary. (`debate-lifecycle-syntax`)
- **Qwik resumability** — scrml converges on the zero-JS/lazy-load *output* but differentiates by auto-deriving splits from the whole-stack reactive/auth graph rather than dev `$` annotation. (`smart-app-splitting-feel-of-performance`)
- **Gleam/Clojure independent map-surface convergence** — both opponents in the map debate independently arrived at the same bracket-read + method-write hybrid that won. **[ratified-design]** — the winning hybrid was DEBATE-RATIFIED S167; the value-native `map` type is NOT in SPEC (§6.2 "no anonymous record/map annotation type") and NOT implemented (impl began S168). (`map-surface-bracket-vs-method`)
- **Keyed reconciliation already shipped** — scrml's runtime already does keyed reconciliation (preserving DOM nodes by key) on every list write; the Svelte/Solid prior art validates the model scrml already had, with the open improvement being property-level dirty tracking. (`fine-grained-reactivity:127`)

---

## 5. Rejected-After-Considering

Where a language's approach was weighed and deliberately not taken, with the reason.

| Language | What was rejected | Reason |
|----------|-------------------|--------|
| **React** | The whole framework as a model (PascalCase tag discriminator, callback props, root-container delegation) | "Don't recreate React" — must feel scrml-native; PascalCase is "scrml's first drift"; callbacks chosen against in favor of shared-state mutation; delegation needs a runtime scrml refuses. |
| **HTMX** | Hypermedia / server-rendered control flow as the primary architecture; server-always state authority; `hx-boost` navigation | scrml is a client-side reactive language; the network round-trip per state change is an architectural ceiling (control-flow debate 39/50). BUT the "make the server path trivially easy" ask and the "forms-as-ephemeral-state-container" insight are kept. |
| **Go** | `default`-arm non-exhaustive `switch` | scrml's `!{}` is exhaustive (compile error on a missing variant), NOT Go's "new errors arrive silently in the `default` arm." Go's narrative-clarity body shape IS kept. |
| **Liquid Haskell** | SMT-checked `{v:T | predicate}` refinement | Lost contracts debate 36/60 to SPARK; slow compilation, web-developer-inappropriate learning curve. scrml uses constant-folding + flow analysis instead. |
| **Idris** | Dependent types (`Vect (S n) a`) for refinement | Research-only; no web language uses them; compile-time-only. |
| **SolidJS** | Explicit-signals fine-grained reactivity | "Very high" migration cost; signal-pairs incompatible with scrml's string-keyed `@var` architecture. |
| **Svelte 4** | `$:` compiler-inferred derivedness | Svelte abandoned it in 5 as "a design mistake"; violates scrml's no-hidden-control-flow principle. |
| **Elixir** | Railway-oriented `with`-chain errors; detached-machine model; `->` arrow | Less enforcement than even Go (favored enforcement); type-co-located won on paradigm fit; `->` breaks `fn -> U` syntax. |
| **Vue** | `@event`/`$emit()` component communication; `$ref` Reactivity Transform | `@` is already the reactive sigil (parse ambiguity); Vue itself removed `$ref` for cognitive load. |
| **Crystal** | Multiple dispatch (parameter-type discriminator) | Kept only for Ruby compatibility — "no force in scrml." |
| **Haskell** | Standalone name-collision overloading **[closed/deleted]** | The 1989 typeclass-discipline anti-pattern; scrml shipped it by accident and DELETED it (S64, debate-02 verdict, §17.5(a); impl removed at Stage 0c.A). Past tense — the v2 "is deleting it" was stale. |
| **Swift** | Bracket-native map WRITE (`@m[k]=v`, `=nil`-removes) **[ratified-design]** | The Swift expert rated the write itself a SEV-HIGH wart; replaced by method-native write/remove. NB the whole value-native `map` type (read + write) is RATIFIED-not-shipped (S167; SPEC §6.2 "no anonymous record/map annotation type"; impl began S168) — this rejection is part of an in-flight design. |
| **Unison** | AST-canonical `.scrml` file storage | Binary storage breaks grep + AI/LLM agent ingestion; scrml stays source-canonical. |
| **Nix** | Inline `narHash` toolchain hashes | Community treats inline as an anti-pattern; centralized lock table won. |
| **PureScript** | Ord-typeclass map keying | scrml has no generics; structural-hash chosen instead. |
| **Elm** | Dict primitives-only keys; no typestate machine-transitions; CPS-splitting-in-conditionals (Approach A) | scrml allows structural struct/enum keys; scrml IS adding transition-typed machines Elm trusts exhaustive-case to cover; no framework does CPS splitting in conditionals. (Elm's CPS *boundary* itself is the borrowed gold standard — only the splitting-in-conditionals variant is rejected.) |
| **Kotlin** | `when`-arm `=>`; implicit `it` binding (incl. `<each>` implicit `@it` Approach C) | JS `=>`-is-a-lambda argues against; `it`/`@it` criticized in Kotlin's own community at nested depth; no template language uses implicit iteration binding. |
| **Scala** | implicits/givens + `import` capability-blurring | Scala community found it confusing; each scrml import keyword gets one clear role. |
| **TypeScript + Zod** | Runtime-parse validation as the model | "Zod can't fail your build. This can." — scrml's §53 refinements are compile errors, surpassing the pattern. |
| **Zig** | Pure-comptime determinism boundary **[closed/deleted]** (user-facing `bun.eval`) | The v2 framing named a USER surface that no longer exists: the user-facing `${ bun.eval() }` surface RETIRED at S130 (Approach C, §22.12 / §30). The contrast now applies to scrml's COMPILER-INTERNAL evaluator (`^{}` constant-folding bounded by §22 determinism constraints — no `Date.now()`, no `bun.eval()` of non-deterministic shape, no I/O); user-facing compile-time eval is `^{}` meta with the closed `META_BUILTINS` set. |
| **Rails** | Config-based `routes.rb` routing | "Too much magic"-free but more boilerplate; file-based convention won for eliminating boilerplate. (The `routes.scrml` manifest the Rails-dev floated as a concession did NOT ship — scrml's shipped routing is pure filesystem-inference, §40/§47.9.2, no manifest file.) |

---

## Appendix: Gap-claim verification notes (v2 pass)

Each completeness-critic gap was checked against its named source before integration. All ten gaps verified against the corpus, with one partial qualification:

- **Gaps 1, 2, 4, 5, 6, 7, 8, 9, 10 — fully verified.** Markup control-flow directives (Vue `v-if` named "right level of abstraction," control-flow debate); keyed reconciliation (§17.4b key clause + Svelte syntax-enforced co-located key + Solid reference-identity + `fine-grained-reactivity:127` "already keyed reconciliation"); CPS server-to-state boundary (Elm "Gold standard" prior-art table L404/L411, server NEVER touches Model); state-authority declarations (Phoenix LiveView instance-level Approach A won 49.5, Rust type-level B, HTMX server-always third pole); file-based routing (Approach A literally "File-Based Routing (SvelteKit/Next.js Convention)," `[param]`/`[...]`/layout-loading-error, Nuxt/SolidStart/Remix corroborate, Rails routes.rb contrast) — **v3 currency correction:** the corpus survey was verified, but the routing-system.md doc is a SURVEY of approaches, not a shipped spec; what actually SHIPPED is filesystem-inferred routing at SPEC §40/§47.9.2 (`pages/`+`[param]`+`[...slug]`+`_layout.scrml`), NOT the §20.4 the v2 text cited (§20.4 is route-PARAMETER access), and NOT the Approach-C `<program route=>` page-override hybrid (which was surveyed-not-taken; `route=` on `<page>` is forbidden). `loading`/`error` route-files were surveyed but did not ship; reactive CSS / CSS-variable bridge + Tailwind (SS24 `var(--scrml-*)`+`setProperty`+subscribe + Vue `v-bind()` row + SS25 compiler-embedded tree-shaken); Go (full error-handling participant, "body reads like Go" + `default` rejected; stdlib "gold standard" + "Go/Phoenix model"); HTMX (named participant in 4 debates, "make the server path trivially easy"); XState/SCXML/Harel (dd6 §13 prior-art table verbatim).
- **Gap 3 (auto-await / colorless-async) — DECISION verified; one lineage sub-claim NOT verified.** The compiler-managed async DECISION is confirmed as a named differentiator (`framework-gaps-tiered-runtime:288` strength table; SS13 "the developer SHALL NOT write async/await/Promise"). The named sources survey React 19 (`use()`/Suspense/`useActionState`/`useTransition`), Svelte, SolidJS, Qwik, HTMX, and Elm. However, the critic's proposed lineage of a "direct-style/colorless tradition (Go goroutines, effect handlers)" does NOT appear anywhere in the named source docs (or the wider deep-dive/debate corpus, or `design-insights.md`) — the terms "colorless," "direct-style," "goroutine," and "effect handler" return zero relevant corpus hits. That specific framing was therefore NOT credited; the decision is attributed only to what the source supports: React's `use()`/Suspense as the surveyed prior-art-compared pattern, with the Haskell-entry note that auto-await elides the monad ceremony. The "function color" framing is recognizable industry vocabulary but is the auditor's gloss, not a documented scrml-design influence.
