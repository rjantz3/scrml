# SURVEY — B17.4 codegen for `<onTransition>` + `effect=` hook firing

**Dispatched:** 2026-05-09 (S74). CLOSER of the B17.x family.
**Worktree:** `.claude/worktrees/agent-a6723e29e8aab3a28`
**Authority:** SPEC §51.0.H (lines 20537-20586) + §51.0.J (line 20640) + B17.2/B17.3 SURVEYs.
PA Rule 4: SPEC wins.
**Baseline confirmed:** 10,512 / 65 / 1 / 0 (post-merge of main `40813f4` into worktree).

## Q1-Q4 ratified at dispatch (recorded for traceability)

- **Q1 RATIFIED: (a) compile-time-baked switch.** Per-engine
  `__scrml_engine_<varName>_fire_hooks(fromVariant, toVariant)` function with
  hard-coded if-arms. Matches scrml's compile-time-analysis identity.
- **Q2 RATIFIED: SPLIT timing.** `if=expr` evaluates BEFORE write; body fires
  AFTER write. Old-state context for the gate; observers read new value.
- **Q3 RATIFIED: (a) compile-time-generated runtime boolean.** Per-`once`
  module-scope `let __scrml_engine_<varName>_once_<idx> = false;`.
- **Q4 RATIFIED: reuse `emitLogicBody` / expression-rewrite pipeline.** Engine
  bodies are RAW TEXT today (per B17.2 SURVEY). The reusable surface is
  `emitExprField(null, raw, ctx)` in `emit-expr.ts:173` (the same path
  `emit-machines.ts:466` already uses for legacy-machine `effectBody`). It
  routes raw text through `rewriteExprWithDerived` → `rewriteExpr` so all the
  reactive-cell rewrites land identically.

## Three additional decisions (this dispatch)

### Decision 5 — Initial-state firing decision: NO

**SPEC observation.** §51.0.H (lines 20537-20586) describes hooks as firing
"when LEAVING" a state (line 20573-20575) or "on incoming transitions FROM"
(line 20569). "Initial state" is not a transition: the engine is constructed
already in the initial variant; nothing transitioned. The kickstarter Mario
example shows hook calls fired only by `eatPowerUp()` / `getHurt()` /
`restart()`, never by engine-init.

**Decision.** Hooks fire ONLY on transitions performed via `_scrml_engine_advance`
(`.advance(.X)`) or `_scrml_engine_direct_set` (`@var = .X`) or, for derived
engines, on a recomputation that changes the variant value. Engine
construction (the C12 `_scrml_reactive_set` initial-variant write) does NOT
fire hooks. Documented in code comments and in tests.

### Decision 6 — Derived-engine hook integration path

**Survey of C14's substrate** (`runtime-template.js:420-484` + `emit-engine.ts:798-830`):

- `_scrml_derived_declare(varName, fn)` registers a closure; marks dirty for
  initial pull.
- `_scrml_derived_subscribe(varName, upstream)` registers a dirty-propagation
  edge. When the upstream is written, `_scrml_propagate_dirty` flips the
  derived's dirty flag.
- `_scrml_derived_get(name)` is LAZY — re-evaluates only when dirty AND read.
- There is **no built-in "value-changed" callback** in the derived substrate.

**Decision.** Hook firing for derived engines is **emitted INSIDE the closure
body itself**. C14's `buildDerivedEngineClosureBody` returns the raw closure
body; B17.4 wraps it with old-vs-new comparison logic:

```js
_scrml_derived_declare("healthMachine", () => {
  const __scrml_old = _scrml_derived_cache["healthMachine"];
  const __scrml_new = (() => {
    const __scrml_derived_v = _scrml_reactive_get("marioState");
    if (__scrml_derived_v === undefined) { throw ... }
    return __scrml_derived_v;
  })();
  if (__scrml_old !== undefined && __scrml_old !== __scrml_new) {
    __scrml_engine_healthMachine_fire_hooks(__scrml_old, __scrml_new);
  }
  return __scrml_new;
});
```

The `__scrml_old !== undefined` guard ensures the initial evaluation does NOT
fire hooks (Decision 5). The closure is invoked lazily by `_scrml_derived_get`
on first read after a dirty flag flip — the hook fires exactly once per
upstream-driven transition (the dirty flag is cleared before re-eval per
§6.6.4 reentrance protection at line 452-453).

**Cache access:** `_scrml_derived_cache` is a module-scope const populated by
`_scrml_derived_get`. The closure can read `_scrml_derived_cache[name]` to
compare against the previously-cached value.

### Decision 7 — File-locus: EXTEND `emit-engine.ts`

**Survey.** `emit-engine.ts` is already 1,190 LOC and has natural per-step
section dividers (C12 / C13 / C14 / C15 banner blocks). Adding a B17.4 section
fits the established pattern. A NEW `emit-engine-hooks.ts` would split the
emission of the per-engine substrate — the hook-firing function shares the
`engineMeta.varName`-based naming scheme + the `engineMeta.stateChildren[]`
walk path with C12 / C13 / C14. Splitting requires duplicating those imports.

**Decision.** EXTEND `emit-engine.ts` with a B17.4 section banner block.
Estimated +250 LOC. Final file size ~1,440 LOC — comparable to similar codegen
modules in the project (`emit-logic.ts` is 2,446 LOC).

## Spec verification (PA Rule 4)

Quoted SPEC §51.0.H normative form (lines 20573-20575):

> Default semantics — `effect=` and `<onTransition to=X>` placed in the FROM
> state-child fire when LEAVING that state. To-side semantics achieved via
> `<onTransition from=X>` placed in the TARGET state-child. Single concept;
> bidirectional via from/to.

Quoted §51.0.H attribute table (lines 20566-20571):

| Attribute | Meaning |
|---|---|
| `to=.Variant` | Target — fires when leaving this from-state TOWARD `.Variant`. |
| `from=.Variant` | Source — placed in TARGET state-child to fire on incoming transitions FROM `.Variant`. |
| `once` | Bare attribute — handler runs at most ONCE for the engine's lifetime, then is dropped. |
| `if=expr` | Conditional gating — handler fires only when `expr` evaluates true at transition time. |

Quoted §51.0.H co-existence (lines 20580-20583):

> a single state-child MAY have BOTH an `effect=` attribute (for the common
> single-target case) and additional `<onTransition>` children (for less
> common targets). When this combination appears: `effect=` fires for its
> own target; each `<onTransition>` fires for its declared `to=`. No conflict.

Quoted §51.0.J (line 20640):

> `<onTransition>` and `effect=` on state-children | LEGAL — fire on derived
> state changes (the value changed; transition is real, just initiated by
> source-cell update, not user code).

## Anti-pattern guard (BRIEFING-ANTI-PATTERNS reread)

The scrml hook surface is COMPILE-TIME-BAKED dispatch. Forbidden reflexes:

- ❌ XState `entry`/`exit`/`always`/`actions` array → ✅ per-engine hook-firing
  function with hard-coded if-arms.
- ❌ Redux middleware chain / Elm `Cmd` effect dispatch queue → ✅ direct
  inline body emission per arm.
- ❌ Runtime hook registry / event-object factory → ✅ NO event objects, no
  `from`/`to` payload arg synthesis. The hook body sees only what
  `emitLogicBody` / `rewriteExpr` give it from raw scrml source.
- ❌ React `useEffect` deps array → ✅ once-flag is a module-scope `let`
  flipped on first fire.

## Implementation plan (8 sub-steps, each commits independently)

1. **Hook-firing function emitter** (`emitEngineHookFiringFunction`) — synthesize
   the per-engine `__scrml_engine_<varName>_fire_hooks(from, to)` function;
   skip when no hooks. Walk `stateChildren[].effectRaw` + `[].onTransitionElements`.
2. **Once-flag declarations** — generate per-`once`-attribute module-scope
   `let __scrml_engine_<varName>_once_<idx> = false;` declarations.
3. **`if=expr` rewrite** — strip outer parens / `${...}` wrapper from
   `ifExprRaw`, run through `rewriteExpr`. Per Q2 split timing — emit BEFORE
   the body block (gate is pre-write context).
4. **Body emission** — raw text → `rewriteExprWithDerived` via `emitExprField`.
   Wrap in `{ ... }` block.
5. **Wire into write paths** — extend `emitEngineWriteGuard` (direct-write)
   and `emitEngineAdvanceCall` (`.advance()`) to capture old variant + emit
   the hook-firing call AFTER the runtime helper. Per Q1 ratification — the
   call is COMPILE-TIME-EMITTED (no runtime check), tree-shaken naturally
   when no hook-firing function exists.
6. **Wire into derived engines** — extend `buildDerivedEngineClosureBody` to
   wrap with old-vs-new comparison + hook-firing call (Decision 6).
7. **Top-level orchestration** — `emitEngineSubstrate` (and derived sibling)
   appends hook-firing function + once-flag declarations after the transition
   table emission.
8. **Tests** — `compiler/tests/unit/b17-4-codegen-ontransition-effect.test.js`.
   Cover all BRIEF §scope-IN item 10 sub-bullets.

## Verdict shape pre-committed

If all §scope-IN items shipped + 0 regressions vs baseline + tests pass +
spec semantics verified per Decisions 1-7: **SHIP**.

If derived-engine integration discovers a closure-cache access foot-gun mid-
encoding (e.g., `_scrml_derived_cache` is private/closed-over): **REFINEMENT**
with the alternative (e.g., wrap `_scrml_derived_get` in runtime).

If a sibling or wide-step parser blocker surfaces unexpectedly: **SCOPE-CHANGE**
with the deferral noted.

## Final verdict: SHIP

All §scope-IN items 1-10 landed. 41 new B17.4 tests pass. Final test counts:
**10,553 pass / 65 skip / 1 todo / 0 fail** (10,512 baseline + 41 new
B17.4 tests). 0 regressions vs baseline. 0 path-discipline leaks.

Implementation insight: `_scrml_derived_cache` is a module-scope `const`
declared in the `derived` runtime chunk (line 87 of `runtime-template.js`),
accessible from anywhere in the page-shared lex env — no foot-gun. The
closure-wrap reads it directly.

Body-text normalisation surfaced one parser-shape inconsistency: `effect=`
captures stripped (`engine-statechild-parser.ts:1129`), `<onTransition>`
body captures preserved (line 622). Resolved with `unwrapBodyRawDollarBraces`
called only on the `to`/`from` arms (effect arm goes straight to `rewriteExpr`).

Function-name mangler post-pass (line 765 of `emit-client.ts`) applies to
the entire concatenated `clientCode` string, so user-fn references inside
hook bodies get rewritten transparently. No special handling needed.
