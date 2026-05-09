# Phase A1c — Step B17.4: codegen for `<onTransition>` + `effect=` hook firing

**Phase:** A1c codegen sub-step (third in the B17.x family). B17.2 lands the parser annotations; B17.3 lands the typer diagnostics; B17.4 lands the codegen that emits hook-firing per §51.0.H. Closes the engine-hook-firing surface that's been deferred since C12 / C13 / C14.
**Estimate:** 5-8h focused (largest of the B17.x family — multiple sub-deliverables: per-engine hook-firing function emission + C13 helper integration + `once` lifecycle + `if=expr` evaluation + body emission for both `effect=` and `<onTransition>` shapes).
**Dispatched:** 2026-05-09 (S74). Preconditions LANDED: B17.2 (`fd70150`), C15 (`43c8747`), B17.3 (`40813f4`).
**Authority chain:** SPEC §51.0.H (`effect=` Form 1 + `<onTransition>` Form 2 — full normative semantics for hook firing). C12 + C13 + C14 SURVEY HANDOFFs (this work was explicitly DEFERRED in each per the parser blocker now being addressed by B17.2/B17.3). PA Rule 4: SPEC §51.0.H wins.

## Re-scope notice — RATIFIED at S74 dispatch time

All 4 design questions ratified to recommended leans:

**Q1 RATIFIED: (a) Compile-time-baked switch.** Per-engine `__scrml_engine_<varName>_fire_hooks(fromVariant, toVariant)` function with hard-coded if-arms per declared hook. Matches scrml's compile-time analysis identity.

**Q2 RATIFIED: SPLIT timing.** `if=expr` evaluates BEFORE cell write (consistent old-state context for the gating predicate); body fires AFTER cell write completes (observers read new value, aligns with spec "when LEAVING" semantics for side-effect observables).

**Q3 RATIFIED: (a) Compile-time-generated runtime boolean.** Per `<onTransition once>` emit module-scope `let __scrml_engine_<varName>_once_<idx> = false;` + check + flip in the hook-fire arm. Tree-shakeable per once-attribute presence.

**Q4 RATIFIED: Reuse existing emitLogicBody pipeline.** Bodies are logic-context expressions/statements. Use `emitLogicBody` / `emitLogicNode` / `emitFnShortcutBody` from emit-logic.ts. No reinvention. Survey confirms reuse path during implementation.

## Goal (one paragraph)

Emit the runtime substrate that fires `effect=${...}` and `<onTransition ...>${...}</>` hooks per §51.0.H during engine transitions. After B17.4 lands, every transition triggered via direct write (`@marioState = .Big`) or `.advance(.Big)` (both intercepted by C13's helpers) fires the appropriate hooks: `effect=` for single-target rules, `<onTransition to=>` for outgoing handlers in the FROM-state, `<onTransition from=>` for incoming handlers in the TARGET-state. `once` handlers fire at most once per engine lifetime; `if=expr` handlers fire only when the expression evaluates true at transition time. Multiple hooks per transition fire in source order. Production runtime cost is per-engine (a single emitted function); tree-shaken when `usage.engines` is false; per-`once` flag tree-shaken when the attribute is absent.

## What's already in place (depth-of-survey signal)

**B17.2 outputs (consumed):**
- `engineMeta.stateChildren[].effectRaw: string | null` — single-target effect body raw text
- `engineMeta.stateChildren[].onTransitionElements: OnTransitionEntry[]` — list of `<onTransition>` elements per state-child

**B17.3 outputs (validated):**
- E-ENGINE-EFFECT-AMBIGUOUS already fired for invalid `effect=` + multi-target combos (B17.4 trusts; doesn't re-validate).
- Variant validation done — `to=`/`from=` always reference valid variants of engine's `for=Type`.
- `<onTransition to=.X>` placement static-checked against rule= contract — B17.4 trusts the to= is a legal target from the FROM state.

**C13 outputs (integration point):**
- `_scrml_engine_advance(varName, target, tableConst)` — surface helper; throws "asserted advance failed" on illegal target.
- `_scrml_engine_direct_set(varName, target, tableConst)` — direct-write hook helper; throws plain E-ENGINE-INVALID-TRANSITION.
- `_scrml_engine_check_transition(currentVariant, target, tableConst)` — internal predicate.
- All three live in chunk #18 `engine`. **B17.4 must wire hook firing INTO these helpers** — they currently call `_scrml_reactive_set` directly; must extend to call the per-engine hook-firing function before/after the set.

**C14 outputs (interaction):**
- Derived engines via `_scrml_derived_declare`. Per §51.0.J line 20560, `<onTransition>` and `effect=` on derived engine state-children are LEGAL and fire on derived state changes.
- The "transition" for a derived engine is the recomputation result changing the variant cell value. Hook firing must hook into this recomputation path too — survey: where does the derived cell's value change propagate? Likely a subscriber on the derived cell.

**C15 outputs (interaction):**
- Cross-file engine mount. `<onTransition>` on a cross-file engine's state-children belongs to the EXPORTER file; the hook-firing function is emitted in the exporter's compiled JS. Importer files don't need new hook-firing emission for cross-file mounts.

**Existing logic-context body emission infrastructure:**
- `compiler/src/codegen/emit-logic.ts` — `emitLogicBody`, `emitLogicNode`, `emitFnShortcutBody` for arbitrary logic-context bodies.
- `compiler/src/codegen/emit-expr.ts` — `emitExpr` for expressions (for `if=expr` evaluation).
- `compiler/src/codegen/rewrite.ts` — `rewriteExpr`, `rewriteServerExpr` for cell-name rewriting in expressions.

## Scope (in / out)

**IN scope (B17.4 — assumes Q1=a, Q2=a, Q3=a, Q4=reuse-existing per ratification leans):**

1. **Per-engine hook-firing function emission** — for each in-scope engine (non-derived AND derived) with at least one `effectRaw != null` OR at least one non-empty `onTransitionElements[]` across its state-children, emit:
   ```js
   function __scrml_engine_<varName>_fire_hooks(fromVariant, toVariant) {
     // ... compile-time-baked dispatch arms per state-child + per onTransitionEntry ...
     if (fromVariant === "Small" && toVariant === "Big") {
       // effect= body for <Small> state-child
       // (rewritten via emitLogicBody)
     }
     if (fromVariant === "Big" && toVariant === "Fire") {
       if (true /* once-flag check, generated only when once is true */) {
         // <onTransition to=.Fire> body
       }
     }
     // ... etc per declared hooks ...
   }
   ```
   Function lives at module-scope; emitted alongside C12's transition table + C13's variant cell.

2. **`effect=` arm emission** — for each state-child with `effectRaw != null`:
   - Generate one if-arm: `if (fromVariant === "<thisStateChildTag>" && toVariant === "<rule.target>") { /* effectBody */ }`
   - Body emission via existing logic-context body machinery.
   - B17.3 has already guaranteed `rule=` is single-target (E-ENGINE-EFFECT-AMBIGUOUS fires otherwise); B17.4 trusts.

3. **`<onTransition to=.X>` arm emission (FROM-side)** — for each `onTransitionEntry` in state-child's `onTransitionElements[]` where `entry.to != null`:
   - Generate if-arm: `if (fromVariant === "<thisStateChildTag>" && toVariant === "<entry.to>") { /* gating + once + body */ }`

4. **`<onTransition from=.X>` arm emission (TARGET-side)** — for each `onTransitionEntry` where `entry.from != null`:
   - Generate if-arm: `if (fromVariant === "<entry.from>" && toVariant === "<thisStateChildTag>") { /* gating + once + body */ }`
   - Note: this entry lives on the TARGET state-child but the predicate is on the source variant.

5. **`if=expr` gating** — when `entry.ifExprRaw != null`:
   - Wrap the body in `if (<rewritten-ifExprRaw>) { ... body ... }`.
   - Expression rewritten via `rewriteExpr` (cell-name rewriting for `@cell` reads).
   - Evaluation happens BEFORE body fires (Q2 split: gating pre-write, body post-write — TIMING DECISION below).

6. **`once` lifecycle (compile-time-generated runtime boolean per Q3=a)**:
   - For each `onTransitionEntry` with `once === true`, emit one module-scope `let __scrml_engine_<varName>_once_<index> = false;` declaration (where `<index>` is a per-engine unique ordinal).
   - In the corresponding hook arm: `if (!__scrml_engine_<varName>_once_<index>) { __scrml_engine_<varName>_once_<index> = true; /* body fires */ }`.
   - Tree-shaken when no `<onTransition>` in the engine has `once`.

7. **Hook firing wired into C13's helpers** — extend `_scrml_engine_advance` and `_scrml_engine_direct_set` (in `runtime-template.js`):
   - **Existing flow:** validate target via `_scrml_engine_check_transition`; if valid, call `_scrml_reactive_set(varName, target)`; if invalid, throw.
   - **New flow:** validate target; if valid, capture `oldVariant = _scrml_reactive_get(varName)`; call `_scrml_reactive_set(varName, target)`; **call `__scrml_engine_<varName>_fire_hooks(oldVariant, target)`** if the engine has hooks.
   - Per Q2 lean: hook-firing AFTER cell write. Emit conditionally (only when the engine has hooks — runtime check via `typeof __scrml_engine_<varName>_fire_hooks === "function"`).
   - Survey: alternative is to compile-time-emit the hook-firing call directly at the C13 helper invocation site (no runtime check). Decide based on which keeps emit-engine.ts cleaner.

8. **Derived-engine hook firing wired into C14's reactive substrate** — per C14 SURVEY, derived engine's variant changes via `_scrml_derived_declare` recomputation. B17.4 must hook the recomputation-completion to call the hook-firing function with `(oldDerivedVariant, newDerivedVariant)`. Survey: how does the C2 derived substrate signal value-change-after-recompute? Is there a subscriber-callback hook?

9. **Co-existence handling per §51.0.H lines 20500-20503** — a state-child MAY have BOTH `effect=` (single-target) AND `<onTransition>` children (other targets). Both fire when their respective conditions match. No conflict — each emits its own arm.

10. **Tests:** `compiler/tests/unit/b17-4-codegen-ontransition-effect.test.js`. Cover at minimum:
    - `effect=` alone fires on legal transition; doesn't fire on illegal; doesn't double-fire.
    - `<onTransition to=.X>` fires when transitioning to .X; doesn't fire on other transitions.
    - `<onTransition from=.X>` fires when transitioning from .X to this state-child; doesn't fire on other source states.
    - `<onTransition to=.X once>` fires once; subsequent transitions don't re-fire (verified via repeated transition + side-effect counter).
    - `<onTransition to=.X if=(@flag)>` — fires when @flag truthy; skipped when falsy.
    - `<onTransition to=.X if=(...) once>` — both gating; once-flag flips ONLY when both gates pass and body fires.
    - Multi-effect: state-child with `effect=` AND `<onTransition>` children — all fire correctly per spec line 20500-20503.
    - Direct write triggers hook firing (`@marioState = .Big` → fires `<Small>`'s effect= or onTransitions).
    - `.advance()` triggers hook firing (`@marioState.advance(.Big)` → same).
    - Derived-engine recomputation triggers hook firing (assumes C14 substrate hooks correctly; integration test).
    - Tree-shake verification: engines without hooks → no hook-firing function emitted; engines without `once` → no once-flags emitted.
    - Multiple engines in one file: independent hook-firing functions, no collision.
    - Cross-file (C15) engine: hook-firing function lives in exporter's compiled JS; importer compiled JS doesn't duplicate.
    - Negative regression-guard: B17.3 fired E-ENGINE-EFFECT-AMBIGUOUS still fires (B17.4 doesn't paper over).

**OUT of scope (deferred):**

- **State-child body rendering** — still deferred. B17.4 emits hook firing but does NOT render state-child markup bodies (`<Small : "🧍">`'s text content). Wide body-parse step territory.
- **Inside-component-body cases** — B17.2 doesn't parse; B17.4 doesn't see.
- **Inside-`<match>`-arm cases** — B17.2 doesn't parse; B17.4 doesn't see.
- **`<onTransition>` body type-checking** — typer concern; B17.3 territory or general typer machinery.
- **Hook firing on engine init (initial state)** — current scope: hooks fire on TRANSITIONS, not on initial-state-set. SPEC §51.0.H is silent on initial-state firing; convention is "transitions only" (entering initial state isn't a transition). Survey to confirm.

## Spec verification (pa.md Rule 4)

Spec sections to read (verbatim) BEFORE writing emission:

- **§51.0.H** (lines ~20457-20507) — full normative for `effect=` + `<onTransition>`. Specifically: Form 1 + Form 2 grammar, attributes table (to/from/once/if=), default semantics ("when LEAVING"), TARGET-state placement via `from=`, `<onEnter>`/`<onLeave>` skipped intentionally, co-existence rules at lines 20500-20503.
- **§51.0.F** (lines ~20379-20427) — rule= contract is the validation source for `to=` placement (B17.3 enforced; B17.4 trusts).
- **§51.0.J** (lines ~20528-20567) — derived engines; line 20560 confirms `<onTransition>`/`effect=` LEGAL on derived state-children. B17.4 must support derived-engine hook firing.

If derived planning docs contradict spec on firing semantics, **SPEC WINS.** Quote in SURVEY.

## Dispatch protocol

S67 worktree-as-scratch / file-delta landing.

## Authorized decisions

- **File locus:** EXTEND `compiler/src/codegen/emit-engine.ts` with hook-firing function emission. EXTEND `compiler/src/runtime-template.js` to wire `_scrml_engine_advance` + `_scrml_engine_direct_set` to call hook-firing. Possibly NEW `compiler/src/codegen/emit-engine-hooks.ts` if size justifies separation (survey decides).
- **Runtime locus:** No new chunks expected — `_scrml_engine_advance` + `_scrml_engine_direct_set` already in chunk #18 `engine`; extending those is in-place. The per-engine hook-firing function is emitted into the file's compiled output (not chunk-shared).
- **Test file:** `compiler/tests/unit/b17-4-codegen-ontransition-effect.test.js`.
- **Naming convention:** `__scrml_engine_<varName>_fire_hooks` for per-engine hook-firing function. `__scrml_engine_<varName>_once_<index>` for compile-time-generated once-flags. Mirror C13's `_scrml_engine_*` naming family.

## Sibling-dispatch awareness

**B17.2 + B17.3 are preconditions.** B17.4 cannot dispatch until both have landed. C15 (cross-file engine mount) interaction surface is read-only for B17.4 (cross-file mounts don't add new hook-firing emission; importer just imports the exporter's compiled JS).

When B17.4 dispatches, file-disjoint check:
- If C15 has landed (expected): no concurrent dispatch needed; B17.4 standalone.
- If A8 / other A1c steps in flight concurrently: file-disjoint as long as those don't touch `compiler/src/codegen/emit-engine.ts` or `runtime-template.js`. Survey at dispatch-write time.

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — REREAD before each subtask. State-machine hook firing has heavy XState `entry`/`exit`/`always`/`actions` array training-data bias + Redux middleware patterns + Elm `Cmd` effect emission. The scrml shape is `effect=${...}` (attribute, single-target) OR `<onTransition to=.Variant once if=expr>${...}</>` (element, multi-target/conditional). The hook firing is COMPILE-TIME-BAKED dispatch (no runtime hook registry, no `actions: [...]` arrays, no event-object factories). Test fixtures must use canonical scrml shape.

`docs/articles/llm-kickstarter-v1-2026-04-25.md` — `<onTransition>` examples (search `onTransition`). The Mario state-machine canonical example is the load-bearing reference.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-engine.ts` | Extend with per-engine hook-firing function emission + `effect=`/`<onTransition>` arm builders + once-flag emission |
| `compiler/src/codegen/emit-engine-hooks.ts` (POSSIBLE NEW) | If size justifies separation from emit-engine.ts |
| `compiler/src/runtime-template.js` | Extend `_scrml_engine_advance` + `_scrml_engine_direct_set` to call per-engine hook-firing function (post-write) |
| `compiler/src/codegen/runtime-chunks.ts` (possible) | If chunk #18 boundary marker shifts |
| `compiler/src/codegen/usage-analyzer.ts` (possible) | If `onTransitionHooks` flag chunk-trigger needs widening |
| `compiler/tests/unit/b17-4-codegen-ontransition-effect.test.js` (NEW) | Unit tests per §scope IN item 10 |
| `compiler/tests/runtime-tree-shaking.test.js` (likely) | Update tree-shake expectations for new emission |
| `docs/changes/phase-a1c-step-b17-4-codegen-ontransition-effect/{progress,SURVEY}.md` | Crash-recovery + survey output (REQUIRED) |

**Negative inventory (MUST NOT touch):**
- `compiler/src/engine-statechild-parser.ts` — B17.2's territory.
- `compiler/src/symbol-table.ts` PASS 17 — B17.3's territory.
- `compiler/SPEC.md` — no spec changes.

## Definition of Done

- All §scope IN items shipped.
- 0 regressions vs baseline (10,512 / 65 / 1 / 0 — post-B17.3 close).
- Spec re-verified against §51.0.H text directly per pa.md Rule 4.
- Co-existence per spec lines 20500-20503 verified (state-child with both `effect=` and `<onTransition>` children works).
- Tree-shake verification: engines without hooks emit no hook-firing function.
- C12 (substrate), C13 (advance/write-hook), C14 (derived) NOT regressed.
- Legacy `<machine>` keyword path NOT regressed.
- B17.3 typer diagnostics still fire correctly (E-ENGINE-EFFECT-AMBIGUOUS, etc.).
- SURVEY.md documents:
  - Q1 hook-firing dispatch shape ratification (a vs b vs c).
  - Q2 timing ratification (after-write body, with pre-write `if=` gating split).
  - Q3 once-lifecycle ratification (compile-time boolean vs runtime Set).
  - Q4 body emission reuse path confirmation.
  - Initial-state firing decision (does entering initial state fire any hooks? Lean NO).
  - Derived-engine hook integration path (where in C14's substrate does the hook hook in?).
  - File-locus decision (extend emit-engine.ts vs NEW emit-engine-hooks.ts).
  - Verdict shape: SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER.
- Final report: B17.x family CLOSED summary (B17 + B17.2 + B17.3 + B17.4 fully shipped). What's left of §51.0.H surface: nothing; spec-complete except deferrals already documented (inside-component, inside-match-arm, body-rendering wide step).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: **<ABSOLUTE-WORKTREE-PATH-PROVIDED-BY-HARNESS>**

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save as WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules`.
5. Run `bun run pretest` via Bash.
6. Run `bun run test` (chained) via Bash. Confirm 10,512 / 65 / 1 / 0 baseline (post-B17.3).

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: paths under WORKTREE_ROOT are safe.
- For Write/Edit: **ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.** Do NOT touch `engine-statechild-parser.ts` (B17.2's territory) or `symbol-table.ts` PASS 17 (B17.3's territory).

If you find yourself about to write to a path starting with the main repo root, STOP. Re-derive from WORKTREE_ROOT.

## Crash-recovery protocol

Commit after each meaningful change. Update `$WORKTREE_ROOT/docs/changes/phase-a1c-step-b17-4-codegen-ontransition-effect/progress.md` after each step.

## Final report format

- WORKTREE_PATH (absolute)
- FINAL_SHA (your branch tip)
- FILES_TOUCHED (list — for PA's diff review)
- VERDICT (SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER)
- TESTS at end: pass / skip / todo / fail
- DEFERRED-ITEMS: anything punted to follow-on / PA-decision
- SURVEY summary (one paragraph) — seven decisions documented (Q1-Q4 + initial-state firing + derived-engine hook integration + file-locus)
- B17.x FAMILY CLOSE SUMMARY: total tests added across B17 + B17.2 + B17.3 + B17.4; deferral catalog after this dispatch (what's still parser-blocked); confirmation that §51.0.H surface is spec-complete from compiler perspective
