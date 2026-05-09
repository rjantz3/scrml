# Phase A1c — Step C13 (re-scoped): `.advance()` + direct-write rule= validation hook

**Phase:** A1c. Wave 4 sequential — C12 SHIPPED (commit `5c910a3`); C14 next, C15 after that.
**Estimate:** 3-4h focused (re-scoped from SCOPE row 231's 4-5h estimate; `<onTransition>` firing dropped from this step — see "Re-scope rationale" below).
**Dispatched:** 2026-05-08 (S74).
**Authority chain:** SPEC §51.0.F (rule= contract — direct write enforcement) + §51.0.G (`.advance(.X)` semantics + "asserted advance failed" loud-failure framing). SCOPE-AND-DECOMPOSITION row C13 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:231`) — **the row's `<onTransition>` portion is RE-SCOPED OUT this dispatch** per Rule 4 audit (SCOPE row didn't list the parser precondition gap; SPEC §51.0.H is structurally blocked on `<onTransition>` parsing not yet shipped).

## Re-scope rationale (SURFACE TO PA — do not silently re-scope further)

S74 PA's pre-dispatch audit found:
- `engine-statechild-parser.ts:43` — `<onTransition>` and `effect=` parsing explicitly deferred to B17.
- `symbol-table.ts:5128-5139` (B17 SHIPPED block) — B17 explicitly DEFERS `<onTransition>` placement + direction attributes ("element not tokenized") AND `effect=` placement + form validation ("engine state-children not parsed").
- B17 only shipped E-COMPONENT-ENGINE-SCOPE; it did NOT add the structural parsing the engine-statechild-parser comment claimed.
- C13's `<onTransition>` hook firing emission therefore has no structured `engineMeta.stateChildren[].onTransitionElements[]` array to consume.

Per pa.md Rule 3 (right answer beats easy answer) + Rule 4 (spec is normative, derived planning docs are not), the user ratified: re-scope C13 to `.advance()` + direct-write hook ONLY. `<onTransition>` element firing becomes a separate sub-step (call it C13b or a new A1b parser step + follow-on emission) once the parser elevates `<onTransition>` from raw-text to walkable AST.

**The `effect=` attribute is also a survey question for this dispatch.** §51.0.H Form 1 says `effect=${ ... }` is a logic-context expression on a state-child opener. If the parser already extracts `effect=` attribute values into `engineMeta.stateChildren[].effectExpr` (or similar field), C13 CAN ship `effect=` emission alongside `.advance()` since `effect=` is structurally just a single-target hook tied to the rule= target. **If `effect=` is NOT parsed: defer it to the same sub-step that lands `<onTransition>`.** Survey to confirm.

## Goal (one paragraph)

Layer the rule= contract enforcement on top of C12's substrate. After C13 lands:
1. Direct writes to an engine variable (`@marioState = .Big`) are validated at runtime against the from-state's transition table; illegal writes throw `E-ENGINE-INVALID-TRANSITION`.
2. `.advance(.X)` method invocations on engine variables (`@marioState.advance(.Big)`) are intercepted at codegen time and emit the same validation logic, with the "asserted advance failed" loud-failure framing per §51.0.G.
3. (IF `effect=` is parsed per SURVEY) `effect=${ ... }` on single-target state-children fires when leaving that from-state toward the rule= target.

C13 reuses C12's substrate verbatim: the transition table at `engineTransitionTableName(varName)` is the single validation source; the discovery walker `collectC12EngineDecls(fileAST)` (or a widened sibling) finds the in-scope engines.

## What's already in place (depth-of-survey signal)

**C12's outputs (from `compiler/src/codegen/emit-engine.ts`, shipped `5c910a3`):**

- `engineTransitionTableName(varName: string): string` — returns `__scrml_engine_<varName>_transitions`.
- `collectC12EngineDecls(fileAST: any): EngineDeclLike[]` — discovery walker, filters out derived engines + engineMeta-less nodes.
- `resolveEngineInitialVariant(meta): string | null` — initial-state resolver with W-ENGINE-INITIAL-MISSING fallback.
- `isC12EngineDecl(node): boolean` — gating predicate.
- The transition table for an in-scope engine is `Object.freeze({...})` keyed by from-variant; entries are `["X"]` / `["A","B"]` / `"*"` / `[]` (terminal).
- The variant cell uses standard reactive substrate; read via `_scrml_reactive_get(varName)`, write via `_scrml_reactive_set(varName, value)`.

**Existing legacy `<machine>` write-hook plumbing (the precedent C13 mirrors or extends):**

- `compiler/src/codegen/emit-reactive-wiring.ts:212` — `buildMachineBindingsMap(fileAST)` walks `state-decl` nodes carrying `node.machineBinding` annotation. Returns `Map<string, {engineName, tableName, rules, auditTarget}>`.
- `compiler/src/codegen/emit-logic.ts:540` — `_emitReactiveSet` consults `opts.machineBindings.get(node.name)` and wraps the assignment with `emitTransitionGuard` instead of bare `_scrml_reactive_set`.
- `compiler/src/codegen/emit-machines.ts` — `emitTransitionGuard`, `classifyTransition`, `buildBindingPreludeStmts` are the legacy-machine emission helpers. Survey: are they shape-compatible with the new engine table format (`["X"]` / `"*"` / `[]`) or do they expect the legacy `TransitionRule[]` shape?

**The seam C13 must add (per C12 SURVEY recommendation):**

> "C13 will need to (a) define a write-hook seam (parallel to today's `machineBindings` map, or extend it), (b) emit `E-ENGINE-INVALID-TRANSITION` runtime throw on illegal direct writes, (c) emit `.advance()` method that uses the same table, (d) emit `<onTransition>` hook firing." — (d) is OUT for re-scoped C13.

The recommended approach (extend vs fork): SURVEY DECISION. Two viable shapes:
1. **EXTEND `buildMachineBindingsMap`** — widen its walker to also visit `engine-decl` nodes, register an entry keyed on `engineMeta.varName` with the C12 table-name accessor + a marker that it's an `<engine>`-form (vs legacy machine-form), and adapt `emitTransitionGuard` to dispatch on shape.
2. **FORK as `buildEngineBindingsMap`** — sibling map, sibling guard emitter (`emitEngineTransitionGuard` in `emit-engine.ts`), wired into `emit-logic.ts` via a separate option key. Cleaner separation; doubles the wiring surface.

Lean per C12 SURVEY architecture-fit: **EXTEND** if shape-adaptation is small (single dispatch point per write site, parameterized on table-format), **FORK** if the legacy machine guard's logic is too entangled with its `TransitionRule[]` shape. Survey decides.

**`.advance()` codegen — where it lives:**

- `@marioState.advance(.Big)` is a MemberExpr at the AST level: `Member(IdentExpr("marioState"), "advance")` then a CallExpr with one argument. Survey: where does the expression emitter dispatch CallExpr? Likely `compiler/src/codegen/emit-expr.ts` or `emit-functions.ts` — find the dispatch point. C13 needs to detect "this is `.advance` on an engine variable" and emit a runtime helper call (e.g., `_scrml_engine_advance(varName, target, "marioState")`) instead of a property-access call (which would fail because the cell is a bare string with no `.advance` method).
- The "engine variable" detection requires either: (a) a per-file set of engine variable names (computed from `collectC12EngineDecls(fileAST)`), passed through emit-context; OR (b) a runtime dispatch (`if cell has .advance method` check) — but that's wrong because the cell is a bare string.
- Lean: compile-time set of engine variable names, passed as `engineVarNames: Set<string>` through the codegen context. The expression emitter's MemberExpr `.advance` dispatch arm checks membership + emits the runtime helper call.

**The runtime helper:**

- NEW `_scrml_engine_advance(varName, target, tableConst)` — runtime helper that:
  - Reads current variant via `_scrml_reactive_get(varName)`.
  - Looks up legal targets: `tableConst[currentVariant]`.
  - If `legal === "*"` OR `legal.includes(target)`: `_scrml_reactive_set(varName, target)`.
  - Else: throw a new `Error` with the "asserted advance failed" message per §51.0.G.
- For direct-write enforcement, the same lookup logic runs but the throw message is the plain `E-ENGINE-INVALID-TRANSITION` (without the asserted-advance framing).
- Both should funnel through ONE shared internal helper (`_scrml_engine_check_transition`) to keep the table-lookup code DRY.

**Runtime chunk:** likely NEW `engine` chunk (#18) gated on `usage.engines === true` per the existing chunk pattern. Survey: align chunk boundary marker with C7/C10 pattern.

**Test count baseline:** 10,349 / 60 / 1 / 0 (S74 post-C12 close).

## Scope (in / out)

**IN scope (C13 re-scoped):**

1. **Direct-write rule= validation hook** — wire C12's transition table into the cell-write path. On illegal write (`@marioState = .Cape` from `.Small`), throw `E-ENGINE-INVALID-TRANSITION` at runtime (per §51.0.F + §34 line 14376 runtime severity).
2. **`.advance(.X)` method emission** — detect MemberExpr `.advance` rooted at an engine variable; emit a runtime helper call. On illegal target, throw with the "asserted advance failed" framing per §51.0.G.
3. **`.tryAdvance` is OUT — explicitly rejected per §51.0.G.** If the agent encounters `.tryAdvance` calls during testing, it's user error / out-of-spec; do not implement.
4. **Runtime helpers** — `_scrml_engine_check_transition(currentVariant, target, tableConst)` (returns boolean); `_scrml_engine_advance(varName, target, tableConst)` (does the throw-on-failure direct write); the direct-write hook uses the same check + a throw with the non-asserted-framing message.
5. **Runtime chunk #18 `engine`** — gated on `usage.engines`. Add chunk boundary marker, register in `RUNTIME_CHUNK_ORDER`, wire detection in emit-client.ts.
6. **Compile-time variant-tag extraction for direct writes** — when the RHS of a direct write is a literal variant access (`.Big`), the compile-time check is OUT of C13 scope (that requires control-flow context tracking inside state-child bodies — likely later step). C13's enforcement is RUNTIME ONLY. Document that `<Small rule=.Big>: <button onclick=${@marioState = .Cape}/>` does NOT compile-error today; the runtime throws when the click handler fires.
7. **Tests** — `compiler/tests/unit/c13-advance-write-hook.test.js`. Cover at minimum:
   - Direct write to engine variable, legal target → succeeds, cell value updates.
   - Direct write, illegal target → throws E-ENGINE-INVALID-TRANSITION (runtime).
   - Direct write, wildcard rule= → any target accepted.
   - Direct write, terminal state (no rule=) → any non-terminal target throws.
   - `.advance()`, legal target → succeeds.
   - `.advance()`, illegal target → throws "asserted advance failed".
   - `.advance()`, wildcard → succeeds.
   - Multiple engines in one file — independent tables, independent enforcement.
   - Legacy `<machine>` write path NOT regressed (smoke).
   - Non-engine variables — direct writes use the bare reactive substrate (no engine-hook overhead, validated by code inspection or expected-output assertion).

**OUT of scope (deferred):**

- **`<onTransition>` hook firing** — STRUCTURALLY BLOCKED per Re-scope rationale. Future C13b or new A1b parser-extension step.
- **`effect=` attribute emission** — IF parser doesn't yet capture `effect=` into engineMeta (likely doesn't per §51.0.H + B17 deferred list), this is also blocked. SURVEY confirms; if blocked, document and defer.
- **Compile-time rule= validation when from-state is statically known inside state-child bodies** — needs context-tracking; later step.
- **Body rendering** — still deferred; C12 emits a marker comment.
- **`derived=expr` engines** — C14.
- **Cross-file engine import + `<EngineName/>` mount** — C15.
- **Nested engines / `internal:rule=` / `<onTimeout>` / `history`** — Wave 4 follow-on / separate spec amendments.

## Spec verification (pa.md Rule 4)

Spec sections to read (verbatim) BEFORE writing emission code:

- **§51.0.F** (lines ~20379-20427) — three rule= forms; direct-write enforcement (Move 12) — rule= IS a CONTRACT on writes; runtime enforcement when from-state is dynamic; `E-ENGINE-INVALID-TRANSITION` runtime severity.
- **§51.0.G** (lines ~20429-20455) — `.advance(.X)` semantics; same rule= validation as direct write; throws on invalid with "asserted advance failed" framing; `.tryAdvance` explicitly OUT.
- **§34** rows for `E-ENGINE-INVALID-TRANSITION` (line ~14376) — runtime severity.

If any derived doc (this brief, SCOPE, prior dispatch, etc.) contradicts the SPEC text on validation semantics or error-throw shape, the SPEC WINS. Quote the spec line in SURVEY before writing a contradicting test or emission.

## Dispatch protocol

S67 worktree-as-scratch / file-delta landing.

## Authorized decisions

- **File locus (lean):** EXTEND `compiler/src/codegen/emit-engine.ts` for `.advance()` emitter + helper + `_scrml_engine_*` helpers. The write-hook seam either extends `emit-reactive-wiring.ts:buildMachineBindingsMap` OR forks a new `buildEngineBindingsMap` next to it — SURVEY DECIDES. The engine-variable detection set + helper-call emission inside the expression emitter likely lives in `emit-expr.ts` (or `emit-functions.ts` — find the actual CallExpr dispatch).
- **Runtime locus:** ADD new helpers to `compiler/src/runtime-template.js`. Add new chunk #18 `engine` to `runtime-chunks.ts` with a chunk-boundary marker (follow C7/C10 pattern); update `RUNTIME_CHUNK_ORDER`. Wire detection in `emit-client.ts:detectRuntimeChunks` keyed on `usage.engines`.
- **Test file:** `compiler/tests/unit/c13-advance-write-hook.test.js`.
- **Naming convention:** `_scrml_engine_check_transition` (internal shared check), `_scrml_engine_advance` (.advance() runtime). Direct-write inlines the check + throw, OR uses `_scrml_engine_advance` with a "no asserted-framing" flag — SURVEY DECIDES (DRY vs message clarity).

## Sibling-dispatch awareness

**No siblings — Wave 4 is strict sequential.** C13 owns the engine codegen surface entirely for this dispatch. C14/C15 dispatch AFTER C13 lands. C23 (PIPELINE prose) is held until Wave 4 closes.

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — **READ BEFORE WRITING ANY CODE** and **REREAD before each subtask**. State machine `.advance()` / `dispatch()` patterns have heavy XState `send()` / Redux `dispatch()` / Elm `update` training-data bias. The scrml shape is `@marioState.advance(.Big)` (method on the cell), NOT `service.send({type: 'GROW'})` event-object dispatch.

`docs/articles/llm-kickstarter-v1-2026-04-25.md` — **READ IN FULL** before generating any scrml code (test fixtures). The kickstarter has the canonical `.advance` examples.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-engine.ts` | Extend with `.advance()` emitter + write-hook helpers + maybe shared check helper |
| `compiler/src/codegen/emit-reactive-wiring.ts` (likely) | EITHER extend `buildMachineBindingsMap` OR add sibling `buildEngineBindingsMap` |
| `compiler/src/codegen/emit-logic.ts` (likely) | Wire engine-variable detection into `_emitReactiveSet` direct-write path |
| `compiler/src/codegen/emit-expr.ts` or `emit-functions.ts` (one of) | `.advance()` MemberExpr+CallExpr dispatch arm |
| `compiler/src/runtime-template.js` | Add `_scrml_engine_check_transition` + `_scrml_engine_advance` runtime helpers |
| `compiler/src/codegen/runtime-chunks.ts` | NEW chunk `engine` (#18) + boundary marker + RUNTIME_CHUNK_ORDER entry |
| `compiler/src/codegen/emit-client.ts` (likely) | Wire `engine` chunk detection keyed on `usage.engines` |
| `compiler/tests/unit/c13-advance-write-hook.test.js` (NEW) | Unit tests per §scope IN item 7 |
| `compiler/tests/runtime-tree-shaking.test.js` (likely) | Update expectations for chunk #18 addition |
| `docs/changes/phase-a1c-step-c13-advance-write-hook/{progress,SURVEY}.md` | Crash-recovery + survey output (REQUIRED) |

## Definition of Done

- All §scope IN items shipped (direct-write hook + `.advance()` emission + runtime helpers + new chunk + tests).
- 0 regressions vs baseline (10,349 / 60 / 1 / 0 at S74 post-C12 close).
- Spec re-verified against §51.0.F + §51.0.G in SPEC.md text directly.
- Legacy `<machine>` direct-write enforcement NOT regressed (the legacy machine table format must continue to work via the existing `emit-machines.ts:emitTransitionGuard` path).
- C14 unblocked — final report names what C14 needs from C13's output (helper names for derived-engine reuse decisions, chunk membership for `<engine derived=>` if it shares the chunk).
- SURVEY.md documents:
  - Write-hook seam decision (extend `buildMachineBindingsMap` vs fork `buildEngineBindingsMap`) with reasoning.
  - `.advance()` dispatch decision (which file, which AST shape detection).
  - `effect=` attribute parsing status (parsed in engineMeta? Y/N) + ship/defer decision.
  - Helper-DRY decision (separate `_scrml_engine_check_transition` vs single `_scrml_engine_advance` with framing flag).
  - Verdict shape: SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: **<ABSOLUTE-WORKTREE-PATH-PROVIDED-BY-HARNESS>**

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the output as your WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules`.
5. Run `bun run pretest` via Bash. Populates `samples/compilation-tests/dist/`.
6. Run `bun run test` (chained, NOT `bun test` directly) via Bash. Confirm 10,349 / 60 / 1 / 0 baseline.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: paths under WORKTREE_ROOT are safe (absolute or relative).
- For Write/Edit: **ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.** Do NOT use relative paths or paths starting with the main repo root.

If you find yourself about to write to a path starting with the main repo root, STOP. Re-derive from WORKTREE_ROOT.

## Crash-recovery protocol

Commit after each meaningful change — don't batch. Update `$WORKTREE_ROOT/docs/changes/phase-a1c-step-c13-advance-write-hook/progress.md` after each step (timestamped append-only lines).

## Final report format

- WORKTREE_PATH (absolute)
- FINAL_SHA (your branch tip)
- FILES_TOUCHED (list — for PA's `git diff main..<branch> -- <files>` review)
- VERDICT (SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER)
- TESTS at end: pass / skip / todo / fail counts
- DEFERRED-ITEMS: anything punted to C14 / C13b / PA-decision
- SURVEY summary (one paragraph)
- C14 HANDOFF: what C14 will need (helper names, chunk membership for derived engines)
