# Phase A1c Step C14 — derived engines (`derived=expr` emission, L20) — SURVEY

**Date:** 2026-05-09 (S74)
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a55d0a47e86679461`
**Branch:** `worktree-agent-a55d0a47e86679461`

## Pre-survey: spec re-verified (pa.md Rule 4)

Read SPEC §51.0.J (lines 20607-20642) verbatim. Salient load-bearing claims for C14 emission:

- **§51.0.J line 20611-20612** — "A derived engine computes its current value from a reactive expression instead of being driven by direct writes. The engine remains a singleton state machine — but its state is FUNCTION of an upstream source rather than authored."
- **§51.0.J table line 20640** — "Initial-value undefined: If `derived=expr` returns no value when the source is in its `initial=` state — `E-DERIVED-ENGINE-INITIAL-UNDEFINED` (§34)."
- **§51.0.J table line 20638** — "Direct writes to the auto-declared variable | REJECTED — `E-DERIVED-ENGINE-NO-WRITE` (§34). The variable is read-only."
- **§51.0.J table line 20639** — "`<onTransition>` and `effect=` on state-children | LEGAL — fire on derived state changes (the value changed; transition is real, just initiated by source-cell update, not user code)."
- **§34 line 14460** — `E-DERIVED-ENGINE-INITIAL-UNDEFINED` is severity **Error**, fired at runtime when projection yields no value for the source's initial state.

§34 catalog rows confirmed:
- 14457 E-DERIVED-ENGINE-NO-RULES — Error (A1b/B16 enforces)
- 14458 E-DERIVED-ENGINE-NO-INITIAL — Error (A1b/B16 enforces)
- 14459 E-DERIVED-ENGINE-NO-WRITE — Error (A1b/B16 enforces)
- **14460 E-DERIVED-ENGINE-INITIAL-UNDEFINED — Error (C14 emits)**
- 14461 E-DERIVED-ENGINE-CIRCULAR — Error (A1b cycle-detection)

## Survey question 1 — Walker decision

**Question:** sibling `collectC14DerivedEngineDecls` vs parameterized C12 fn (`mode: "non-derived" | "derived" | "all"`)?

**Findings:**
- C12's `collectC12EngineDecls(fileAST)` walks markup containers + filters via `isC12EngineDecl` which gates on `meta.derivedExpr == null` (line 138 of `emit-engine.ts`). The walker logic (preferring `fileAST.machineDecls` then falling back to a manual walk) is identical to what C14 needs.
- Parameterizing means a `mode` arg threaded through `isC12EngineDecl` (or duplicated logic) — the call sites lose self-documenting names.
- Forking gives two clearly-named predicates: `isC12EngineDecl(node)` for non-derived, `isC14DerivedEngineDecl(node)` for derived. Each call site reads as exactly what it does; no new mode discrimination at the call.
- The walker shells share 95% of code — minor duplication is low cost vs the clarity gain.

**Decision: SIBLING fn `collectC14DerivedEngineDecls` + sibling predicate `isC14DerivedEngineDecl`.**

Reasoning:
1. Self-documenting call sites trump DRY for a 20-line predicate-and-walker.
2. C12's existing `isC12EngineDecl` filter direction (`meta.derivedExpr == null`) needs no change — C14 does the inverse (`meta.derivedExpr != null`).
3. `collectC14DerivedEngineDecls` becomes the public discovery API for any future C-step that wants the derived-engine list (cross-file mount in C15, e.g.).

## Survey question 2 — B16 annotation status (what `derivedExpr` carries)

**Question:** does `engineMeta.derivedExpr` carry a parsed AST + dependency set, or just expression text? Any pre-recorded dependency-set we can consume directly for `_scrml_derived_subscribe` calls?

**Findings:**
- `compiler/src/symbol-table.ts:3753` — `derivedExpr` is built ONLY for the `engineDecl.sourceVar != null` case as `{ kind: "legacy-source-var", varName: engineDecl.sourceVar }`. **Nothing else populates it today.**
- `ast-builder.js:8593` — only one regex captures `derived=`: `header.match(new RegExp("\\bderived\\s*=\\s*@(IDENT)\\b"))`. The §51.0.J rich form `derived=match @marioState {...}` does NOT match this pattern; would NOT set `sourceVar`; would NOT cause `derivedExpr` to be non-null. **The §51.0.J rich form is NOT YET PARSED.**
- `dependency-graph.ts:1131-1138` — explicit block comment confirms: "Note: B14's `derivedExpr` today carries the LEGACY single-source form (`{ kind: "legacy-source-var", varName: <upstream> }`) when `derived=@varname` is parsed (ast-builder.js line 8449). The §51.0.J rich `derived=match @x { ... }` form is NOT yet structurally parsed; when ast-builder learns it, B16's collector reads the parsed expression and uses `forEachIdentInExprNode` to enumerate ALL upstream cell reads."
- `derived-engine-rejections.test.js:18-22` — test-file block-comment also confirms the legacy-only situation.
- `dependency-graph.ts:1156-1166` — DG records the dependency edge AS the single upstream `derivedExpr.varName` for legacy-source-var.

**Decision: C14 emits for the LEGACY single-source-var form ONLY; the rich-expr form is NOT YET PARSED so it can never reach codegen.**

The emission shape for legacy:
- The closure body computes the projection from a single upstream cell. With NO authored projection rules (B16 fires `E-DERIVED-ENGINE-NO-RULES` if any are present), the legacy form's projection is **the identity projection** — engine variant = upstream cell value (cast/coerced into the engine's variant set). When the upstream value is not a member of the engine's variant set, the projection is undefined → `E-DERIVED-ENGINE-INITIAL-UNDEFINED`.
- Single dependency: `_scrml_derived_subscribe(varName, upstreamVarName)` — exactly one call.
- The pre-recorded dependency set IS `[derivedExpr.varName]` for legacy-source-var (no AST walking needed today).

When the rich form lands (future ast-builder + B16 widening), the closure body becomes the rewritten match expression, the dependency-set comes from `forEachIdentInExprNode` over the parsed ExprNode, and `_scrml_derived_subscribe` is called once per discovered upstream cell. The C14 emitter shell stays the same; only the body-and-deps inputs change.

## Survey question 3 — Initial-value-undefined throw locus

**Question:** inline inside the closure (lean) vs wrapper helper `_scrml_engine_derived_init_check` (clarity)?

**Findings:**
- The runtime check is essentially: "after computing the projection, if the result is `undefined` AND we are in initial-eval phase, throw E-DERIVED-ENGINE-INITIAL-UNDEFINED."
- Putting it in a helper requires:
  - One new runtime function added to chunk `engine` (or a new chunk).
  - Helper signature: `_scrml_engine_derived_init_check(value, varName)` → throws if value === undefined, else returns value.
  - Caller wraps the closure: `() => _scrml_engine_derived_init_check(<projection>, "varName")`.
- Inline approach:
  - The closure itself does: `() => { const v = <projection>; if (v === undefined) throw new Error("E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT: derived engine '<varName>' yielded no value..."); return v; }`.
  - No new runtime helper; locality of the check.
- The check fires on EVERY re-evaluation, not just initial. But the spec only treats the INITIAL undefined case as an error (subsequent undefined-yields would mean the projection has no fallback for the new source value — same shape: `E-DERIVED-ENGINE-INITIAL-UNDEFINED` is the closest catalog row; the runtime fires the same code in all undefined cases). This matches behavior of similar throw-on-undefined patterns elsewhere.

**Decision: INLINE inside the closure (lean).**

Reasoning:
1. No new runtime helper needed — `derived` chunk + `engine` chunk already cover the substrate.
2. The throw site is right next to the projection logic — easy to read, easy to maintain.
3. The error message can include the varName + the upstream value at throw time for diagnostic clarity (the closure knows both).
4. Future rich-expr form: same pattern — the closure body has `match`-arm logic; the inline check at the end catches no-arm-matched cases.
5. Aligns with C13's three-helper finding (helpers added only when reuse buys clarity; this throw is one site, not reused).

## Survey question 4 — Chunk-trigger decision

**Question:** does `usage.engines && usage.derivedEngines` trigger the `derived` chunk? Extend `usage-analyzer.ts` chunk-detection if needed?

**Findings:**
- `usage-analyzer.ts:430-456` — `walkUsage` sets `usage.derivedEngines = true` when `engineMeta.derivedExpr != null`. **The flag is set correctly.**
- `usage-analyzer.ts` IS the usage tracker but does NOT decide chunk membership — that's `emit-client.ts:detectRuntimeChunks` (different mechanism).
- `emit-client.ts:detectFromNode` (around line 314-322) — for `engine-decl`: only adds `engine` chunk. Does NOT add `derived` chunk.
- The `derived` chunk contains `_scrml_derived_declare`, `_scrml_derived_subscribe`, `_scrml_derived_get`, `_scrml_derived_fns`, `_scrml_derived_dirty`, `_scrml_derived_cache`, `_scrml_derived_downstreams`, `_scrml_propagate_dirty`, `flush`. **All of these are needed** by C14's emission.

**Decision: EXTEND `emit-client.ts:detectFromNode` engine-decl branch to add `derived` chunk when `engineMeta.derivedExpr != null`.**

The tightest gate is the AST-level check (matches C14's emission gate exactly). Tree-shaking remains correct: when no derived engines exist, `derived` is not pulled in by the engine arm.

(Note: `derived` chunk is also pulled in by other means — derived state cells (Shape 3 const), validators, synth surface, compound-parent emission. C14's branch ADDS to the set but doesn't remove existing triggers.)

## Decisions summary

| Question | Decision | Reasoning |
|---|---|---|
| Walker | Sibling `collectC14DerivedEngineDecls` + `isC14DerivedEngineDecl` | Self-documenting call sites; ~20 lines of duplication for clarity |
| B16 annotation | LEGACY single-source-var only — `{ kind: "legacy-source-var", varName }` | Rich `derived=match @x {...}` form NOT YET PARSED (ast-builder.js:8593 only matches `derived=@varname`); deps come from `derivedExpr.varName` directly |
| Initial-undefined throw | INLINE inside the closure | No new runtime helper; locality of check; varName + upstream value available for diagnostic |
| Chunk-trigger | Extend `emit-client.ts:detectFromNode` engine-decl arm to add `derived` chunk when `engineMeta.derivedExpr != null` | The tightest possible gate; tree-shaking preserved |

## Re-scope — `<onTransition>` / `effect=` on derived state-children

Per BRIEF Re-scope notice + §51.0.J line 20639: `<onTransition>` and `effect=` on derived-engine state-children are LEGAL semantically. **STRUCTURALLY BLOCKED** (parser blocker C13 also hit): `engine-statechild-parser.ts:43` defers `<onTransition>`/`effect=` parsing to B17, B17 only shipped E-COMPONENT-ENGINE-SCOPE. C14 EXCLUDES `<onTransition>`/`effect=` firing on derived state-children — defer alongside C13.

## Verdict

**SHIP** — narrow C14 scope: derived-engine variant cell emission via `_scrml_derived_declare` + one `_scrml_derived_subscribe` per upstream + inline `E-DERIVED-ENGINE-INITIAL-UNDEFINED` throw in the closure. No new runtime helpers. Rich-expr form deferred (parser blocker).
