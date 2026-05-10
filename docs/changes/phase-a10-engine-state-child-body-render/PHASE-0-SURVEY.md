# Phase A10 — Phase 0 Capability Survey

**Authored:** S78 — 2026-05-10
**Status:** **COMPLETE** — gates Phase 1+2 dispatch.
**Architecture:** Option C-prime (factored variant-guard helper) — confirmed feasible by survey; **cost estimate REVISED DOWN significantly** from SCOPE doc estimate.
**Survey deliverables (P0.1-P0.5):** all complete.

---

## §0 Headline finding — cost is much lower than the SCOPE doc estimated

The SCOPE doc estimated **~10-17h** for Option C / C-prime, with a parser-side concern that re-parsing `bodyRaw` substrings would be a "parser-architecture change" per C12 SURVEY's framing. **That concern is incorrect for the current architecture.** The block-splitter ALREADY recursively descends into engine bodies and produces walkable child blocks. The ast-builder then THROWS THESE AWAY by re-serializing them into `rulesRaw: string`. Engine-statechild-parser runs as a secondary pass on the re-serialized string.

**The fix is "stop throwing the children away."** Not new infrastructure.

**Revised total estimate: ~6-10h** (SCOPE doc revised from ~10-17h). Saved time comes mostly from Phase 1 (parser) collapsing from "build new infrastructure" to "preserve children that already exist."

---

## §1 Phase 0.1 — engine-statechild-parser.ts findings

**File:** 1341 LOC. Custom parser for engine state-child structural extraction (running on `engine-decl.rulesRaw: string` as a secondary pass).

**Key locations:**
- Line 1075 — `parseEngineStateChildren(rulesRaw)` is the entry point. Returns `EngineStateChildEntry[]`.
- Line 1249 — body extraction: `const bodyRaw = rulesRaw.slice(bodyStart, bodyEnd);`. Each state-child's body is extracted as a substring of the engine's `rulesRaw`.
- Lines 1256-1320 — structural element extraction with skip-region tracking: `innerEngines`, `onTransitionElements`, `onTimeoutElements` extracted with `skipRegions` to avoid double-counting.
- Lines 1322-1336 — entry construction: `out.push({ tag, rule, bodyRaw, isColonShorthand, rawOffset, historyAttr, internalRule, onTimeoutElements, innerEngines, effectRaw, onTransitionElements })`.

**Finding:** the parser already isolates `bodyRaw` cleanly + already has skip-region machinery to subtract structural-element regions. Adding a `bodyAST: ASTNode[]` field to `EngineStateChildEntry` is structurally clean — the data flow already separates concerns.

**Feasibility for Option C-prime:** ✅ HIGH. Parser-side integration point exists. Subtracting skip-regions from `bodyRaw` to get the renderable substring is straightforward.

---

## §2 Phase 0.2 — ast-builder.js markup parsing findings (most-impactful finding)

**File:** 10,071 LOC. Walks block-splitter output, building AST nodes per block.

**Key location for body-render:** lines 9098-9117. Engine-decl construction.

```js
// CURRENT CODE (ast-builder.js:9098-9103):
let rulesRaw = "";
if (block.children && block.children.length > 0) {
  for (const child of block.children) {
    if (child.raw) rulesRaw += child.raw;
  }
}
```

**Critical finding:** the block-splitter has ALREADY produced walkable children for the engine's body content. The ast-builder reads `block.children` (already-typed walkable blocks: state, markup, logic, text, etc.) and concatenates their `raw` field back into a string. The walkable structure is then thrown away.

**Block-splitter behavior** (`block-splitter.js:1138-1228`): generic markup tag handling via `pushTagContext("markup", tagName, ...)`. No special case for `<engine>` or `<machine>`. Engine bodies are recursively descended exactly like any other markup block.

**The fix:** preserve `block.children` walked through `buildBlock` to produce proper AST nodes. Attach to `engine-decl` as a new `bodyChildren: ASTNode[]` field alongside `rulesRaw` (kept for legacy compat + state-child-parser secondary pass).

**LOC estimate:** ~30-50 LOC change in `ast-builder.js` engine-decl construction site.

**No re-invocation of block-splitter required.** No span-relative-vs-absolute conversion glue. No parser-architecture change.

**Feasibility for Option C-prime:** ✅ TRIVIAL. The walkable children already exist; we just stop discarding them.

---

## §3 Phase 0.3 — A1b PASSes affected

**Walker inventory** (PASSes 1-17, ~current as of S78):

| PASS | Walker | Touches engine-decl today | Needs body-subtree descent? |
|---|---|---|---|
| 1 | state-decl + scope registration | YES (engine var via PASS 10.A) | **YES** — body may reference `@cells`; scope chain extension needed (engine var + payload bindings as locals at body scope) |
| 2 | local-decl collision (B2) | NO | **YES** — body locals could shadow state cells |
| 3 | `@name` resolution (B3) | NO | **YES** — load-bearing; every `@cell` ref in body must resolve. Without this, `<button onclick=load()>` doesn't know what `load` refers to |
| 4 | cell classifier (B5) | NO | NO — body declares no cells (engine state-children are not cell decl sites) |
| 5 | render-by-tag (B6) | NO | **YES** — `<derivedName/>` use in state-child body must resolve |
| 6 | L21 derived-mutation (B8) | NO | **YES** — body code might mutate const-derived cells |
| 7 | derived-dep-tracking (B7) | NO | NO — operates on derived state-decl RHS, not on bodies |
| 8 | compound-rollup synth (B11) | NO | NO |
| 9 | derived-with-validators (B13) | NO | NO |
| 10.A | engine cell registration (B14) | YES | NO change (already runs at engine-decl site, not body) |
| 10.B | cross-file engine mount (M18) | YES | NO change |
| 11 | state-child + rule= typer (B15) | YES | **possibly** — B18 multi-statement-handler check on event handlers in state-child bodies (currently fires on markup nodes via PASS 11; body subtree descent might surface it more cleanly) |
| 12 | derived-engine rejections (B16) | YES | NO change |
| 13 | E-COMPONENT-ENGINE-SCOPE (B17) | YES | **YES** — currently has known deferral for residual fire-sites (per audit §2 brief items 1-5+7); body-walk would close some of those |
| 14 | reset target (B22) | NO | **YES** — body code might call `reset(@cell)` |
| 15 | channel placement (B19) | NO | NO |
| 16 | A7 hierarchy + temporal (A5-3) | YES | NO change (already walks structural elements, not body markup) |
| 17 | `<onTransition>` + `effect=` (B17.3) | YES | NO change |

**Affected passes:** 1, 2, 3, 5, 6, 13, 14 (and possibly 11). Each needs a small recursion-branch addition to descend into `engine-decl.bodyChildren`.

**LOC estimate per walker:** ~5-15 LOC each (add a recursion branch). Total: ~50-100 LOC across all affected walkers.

**Per PASS 16 line 6513:** *"SURVEY §3.3 — no walking inside engine-decl from PASS 16."* — this confirms the current explicit-no-descent rule for typer walkers; the body-render dispatch reverses it for the affected walkers.

---

## §4 Phase 0.4 — Downstream emitter findings

**Files inventoried:**
- `emit-html.ts` (1394 LOC) — `generateHtml(nodes, ctx)` at line 275. Recursive `emitNode` walker at line 317. **Accepts arbitrary node arrays**; descends into `node.children` per kind dispatch. Body-render arm subtrees can be passed in directly.
- `emit-reactive-wiring.ts` (1033 LOC) — `emitReactiveWiring(ctx)` at line 250 walks `ctx.fileAST` to find reactive `${...}` interpolations + lifecycle nodes.
- `emit-event-wiring.ts` (825 LOC) — `emitEventWiring(ctx, fnNameMap)` at line 215 walks file AST to wire event handlers.

**Finding:** all three emitters are file-AST-walk-driven. They depend on the file AST structure to reach event handlers / reactive interpolations. **For body-render to work:**

1. The variant-guard helper invokes `generateHtml(armBody, ctx)` per arm body — this works today; arm body is a node array.
2. The reactive-wiring + event-wiring walks need to descend into `engine-decl.bodyChildren` so they reach event handlers + interpolations inside arm bodies.

**LOC estimate:** ~10-20 LOC each per emitter to add the recursion branch into engine-decl.bodyChildren. Total: ~30-60 LOC across emitters.

**No emitter-context changes needed.** The existing `ctx` shape carries everything (`fileAST`, `errors`, `csrfEnabled`, `registry`, fn-body registry, scope handle).

---

## §5 Phase 0.5 — Legacy machine body codegen findings

**File:** `emit-machines.ts` (784 LOC). Inventoried entry points: `emitTransitionTable`, `emitProjectionFunction`, `emitDerivedDeclaration`, `buildBindingPreludeStmts`, `classifyTransition`, `emitTransitionGuard`.

**Finding: no Option D.** Legacy `<machine>` was always rules-only (`.From => .To`, `.From => guard ? .To : .Other`); the body grammar is transition-rule text, not markup. The legacy form **never had body-render**. There is nothing to reuse from legacy machine codegen.

**Implication:** Option D is eliminated. The only path forward is Option C-prime as ratified.

---

## §6 Revised cost estimate

| Phase | Original SCOPE estimate | Revised post-Phase-0 | Notes |
|---|---|---|---|
| Phase 1 — Parser integration | 3-5h | **1-2h** | "Stop discarding children" + add `bodyChildren` field. Smaller than SCOPE assumed. |
| Phase 2 — Typer integration | 2-4h | **1.5-3h** | Add recursion-branch in 7 walkers (~50-100 LOC total). Slightly smaller than SCOPE assumed because no scope-injection-glue is needed (engine var registers via PASS 1; payload bindings extend scope via per-body sub-scope). |
| Phase 3 — Codegen | 3-5h | **2-4h** | Factored variant-guard helper + engine consumer + recursion branches in 3 emitters. Shape clear. |
| Phase 4 — Tests | 2-3h | **1.5-2.5h** | ~15-25 unit tests; ~5-8 integration tests. No surprises expected. |
| Phase 5 — Docs | 30min | 30min | Unchanged. |
| **Total** | **~10-17h** | **~6.5-12h** | **~35-30% savings** vs SCOPE estimate. |

---

## §7 Implementation refinements (vs SCOPE doc)

### §7.1 The parser change is in ast-builder.js, NOT engine-statechild-parser.ts

Original SCOPE: "Phase 1 — Parser integration: extend `engine-statechild-parser.ts` to invoke the markup parser on each state-child's `bodyRaw` substring."

**Revised:** the change lives in `ast-builder.js:9098-9117` (engine-decl construction). engine-statechild-parser.ts continues to operate as today on `rulesRaw` for structural extraction; its behavior is **unchanged**. The new `bodyChildren` field is populated independently from the existing `rulesRaw` field by the ast-builder.

### §7.2 No scope-injection glue at parser level

Original SCOPE: "scope-context injection (engine variable in scope, payload bindings as locals)" suggested as parser-stage work.

**Revised:** scope work happens at A1b PASS 1 time, not at parser time. The engine variable registers via PASS 10.A (already runs). Payload bindings (`<Error msg>` introducing `msg`) extend a per-state-child sub-scope at PASS 1 time when the body subtree is walked.

### §7.3 The variant-guard helper architecture

Confirmed feasible per Phase 0.4 finding that `generateHtml(nodes, ctx)` accepts arbitrary node arrays. Helper signature finalized:

```typescript
// compiler/src/codegen/emit-variant-guard.ts (NEW)
export function emitVariantGuardedRender(
  variantExprAccessor: () => string,            // engine: () => `_scrml_reactive_get(${JSON.stringify(varName)})`; match: () => emitted on= expr
  arms: Array<{
    tag: string;                                 // variant tag (e.g., "Idle", "Error")
    payloadBindings: string[];                   // payload binding names from opener (e.g., ["msg"] for `<Error msg>`)
    body: ASTNode[];                             // walkable body subtree
  }>,
  ctx: CompileContext,
): {
  dispatcherJs: string;                          // top-level dispatcher
  renderFunctionsJs: string;                     // per-arm render functions
};
```

Tree-shake: helper returns `{dispatcherJs: "", renderFunctionsJs: ""}` when ALL `arms[].body` are empty. Engine consumer maps `engineMeta.stateChildren` → `arms[]`; future match-block-form consumer will map its own arm structure → `arms[]`.

### §7.4 What stays in engine-statechild-parser.ts

Unchanged — engine-statechild-parser.ts continues to handle:
- `rule=` attribute parsing
- `<onTimeout>` structural extraction
- `<onTransition>` structural extraction
- `<onIdle>` structural extraction
- `history` / `internal:rule` / `effect=` attributes
- nested `<engine>` declarations
- legacy arrow-rules detection + skip

These are NOT body-render concerns. The body-render path is orthogonal — it walks `bodyChildren` (the new walkable AST attached to engine-decl) for rendering, while the existing structural extractions continue as the secondary string-based pass.

---

## §8 Risk register (post-Phase-0)

**R1 — Block-splitter children might not match expected AST shape.** The block-splitter's children of an engine block are typed-blocks (`{type, name, raw, children}`-shaped) that ast-builder normally walks via `buildBlock`. The conversion is well-tested for program/component bodies. Engine bodies should follow the same pattern but haven't been exercised — first dispatch may surface edge cases. **Mitigation:** Phase 1 includes regression sweep against existing 10961-pass baseline.

**R2 — Tree-shake invariant interaction with `<onTimeout>` / `<onTransition>` siblings.** The state-child bodies contain structural elements (`<onTimeout>`, `<onTransition>`, nested `<engine>`) that aren't rendered markup but ARE part of `block.children`. Need to filter these out at the body-render emission boundary. **Mitigation:** the engine-statechild-parser already tracks skip-regions for these elements; reuse that machinery to filter `bodyChildren` at emission time.

**R3 — Span tracking.** Once `bodyChildren` is preserved with their original spans (from block-splitter), error messages should point to the right location. **Mitigation:** the block-splitter already produces correct spans for child blocks; ast-builder's `buildBlock` carries spans through. No new span-translation required.

**R4 — Self-host parity.** Self-hosted parser (`compiler/self-host/`) might need analogous changes once it catches up. **Mitigation:** out of scope for this dispatch (self-host is parallel); flag in roadmap.

**R5 — Test fixture coverage gap.** No existing fixture asserts that engine state-child bodies render correctly at runtime (per SCOPE §0). **Mitigation:** Phase 4 explicitly adds integration tests that compile + run engines with bodies + assert correct DOM updates.

---

## §9 Verdict — proceed to Phase 1+2 dispatch

Survey closes ALL feasibility questions:
- ✅ Parser path identified (ast-builder.js:9098-9117 — preserve children)
- ✅ A1b walker impact catalogued (7 walkers, small recursion branches each)
- ✅ Emitter readiness confirmed (generateHtml + reactive + event wiring all accept body subtrees)
- ✅ Option D eliminated (no legacy mechanism to reuse)
- ✅ Cost estimate revised (~6.5-12h, down from ~10-17h)

**Architecture is C-prime as ratified.** No revision to the architectural commitment from the SCOPE doc — just refinement of the implementation locus + reduction in cost.

**Next step:** Phase 1+2 dispatch — `scrml-dev-pipeline` worktree dispatch with paste-in of SCOPE-AND-DECOMPOSITION.md + this PHASE-0-SURVEY.md + the F4 worktree-discipline block. Sub-step boundary: Phase 1 lands AST shape change + parser integration; Phase 2 lands walker recursion extensions. Could be one bundle or split.

**Phase 3+4 dispatch:** depends on Phase 1+2 landing. Codegen (variant-guard helper + engine consumer + emitter recursion) + tests.

**Authorization checkpoints unchanged.** PA needs user go-ahead on Phase 1+2 dispatch + Phase 3+4 dispatch separately.

---

## §10 Tags

#phase-a10 #phase-0-survey-complete #c-prime-confirmed-feasible #cost-revised-down #ready-for-phase-1-2-dispatch
