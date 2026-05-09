# Phase A1c Step C13 — `.advance()` + direct-write rule= hook — SURVEY

**Date:** 2026-05-08 (S74)
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a847ccdc7ea56ebb9`
**Branch:** `worktree-agent-a847ccdc7ea56ebb9`
**Re-scope:** `<onTransition>` element firing dropped (B17 didn't ship the parsing); `effect=` attribute deferred (same blocker). C13 ships ONLY: direct-write rule= hook + `.advance()` emission + new `engine` runtime chunk.

## Pre-survey: SPEC re-read (pa.md Rule 4)

Read SPEC §51.0.F (lines 20379-20427) + §51.0.G (lines 20429-20455) + §34 row for `E-ENGINE-INVALID-TRANSITION` (line 14376) verbatim. Load-bearing claims:

- **§51.0.F** — `rule=` is a CONTRACT on writes. Three forms (single / multi / wildcard). Direct write to engine variable is intercepted and validated against from-state's `rule=`. Compile-time + runtime enforcement. **Runtime severity for invalid: `E-ENGINE-INVALID-TRANSITION`.** Compile-time validation when from-state is statically known is OUT for C13 per BRIEF Item 6.
- **§51.0.G** — `.advance(.X)` API. Same rule= validation as direct write. On invalid: throws "asserted advance failed" tag (same E-ENGINE-INVALID-TRANSITION family). `.tryAdvance` is OUT (silent failures hide bugs).
- **§34 line 14376** — runtime severity confirmed.

The runtime throw shape per the spec text:
- Direct write — generic `E-ENGINE-INVALID-TRANSITION` framing.
- `.advance()` — same family but with the assertion-style framing in the runtime error message.

## Survey question 1 — Write-hook seam decision

**Question:** EXTEND `buildMachineBindingsMap` in `emit-reactive-wiring.ts` vs FORK a sibling `buildEngineBindingsMap`?

**Findings:**
- `buildMachineBindingsMap` (`emit-reactive-wiring.ts:212`) walks `state-decl` AST nodes carrying `node.machineBinding` annotation. The map shape is `Map<cellName, {engineName, tableName, rules, auditTarget}>` where `rules: TransitionRule[]` (the legacy flat list of `{from, to, guard, label, effectBody, afterMs, ...}`).
- `_emitReactiveSet` (`emit-logic.ts:540`) consults the map and dispatches to `emitTransitionGuard(encodedName, valueExpr, tableName, engineName, rules, auditTarget)`. The `rules` parameter is heavily used inside `emitTransitionGuard` for: §51.5.1 compile-time elision (`classifyTransition` walks rules), guard rules (`r.guard`), effect bodies (`r.effectBody`), audit labels (`r.label`), temporal afterMs, payload bindings.
- The new C12 engine table format is fundamentally different: keyed by from-variant name; entries are `["X"]` / `["A","B"]` / `"*"` / `[]`. There is no equivalent to `TransitionRule[]` — there are no guards, no effect bodies, no labels, no payload bindings (those are §51.0.H+ surface, unparsed today).
- Adapting `emitTransitionGuard` to dispatch on shape would require either a tagged-union `rules` parameter or a code-path bifurcation inside the existing function. Both balloon the surface.
- The two surfaces' AST sources also differ: legacy walks `state-decl.machineBinding` annotations; new walks `engine-decl._record.engineMeta` directly. Mixing them forces the bindings map to carry a discriminator field.

**Decision: FORK as `buildEngineBindingsMap`** — sibling map, sibling guard emitter (lives in `emit-engine.ts` as `emitEngineWriteGuard`), wired into `emit-logic.ts` via a new `engineBindings` opts key parallel to `machineBindings`.

**Reasoning:**
1. The `TransitionRule[]` data model in `emitTransitionGuard` is heavily entangled with legacy machine surface (effects, guards, labels, audit, temporal, bindings) — none of which the new `<engine>` form parses today.
2. C13 needs ONE clean dispatch site (`if engineBindings.get(name) → emitEngineWriteGuard`); the legacy path remains a no-op extension on `<machine>`.
3. Mirrors C12's "fork emit-engine.ts" decision (per C12 SURVEY question 1) — same justification: clean foundation, minimal blast radius, legacy surface preserved verbatim, no regression risk.
4. The "fork now, refactor later if convergence proves out" path matches scrml's general architecture pattern (see `emit-validators.ts` / `emit-messages.ts` / `emit-parse-variant.ts` siblings). Future convergence with `<machine>` is left open (the surface deprecates per §51.0.L; convergence isn't a permanent need).

The new map shape: `Map<varName, {forType, tableName}>`. The `tableName` is `engineTransitionTableName(varName)` from C12. No `rules` field needed — the runtime helper takes the table reference and reads it directly. No `auditTarget` (engines don't have audit logging today).

## Survey question 2 — `.advance()` dispatch decision

**Question:** Which file emits the MemberExpr `.advance` arm? How does engine-variable detection thread through codegen context?

**Findings:**
- `emit-expr.ts:446` `emitCall` is the CallExpr dispatch entry point. The function checks `node.callee.kind === "ident"` for special call shapes (`replay`, `navigate`, `render`, `parseVariant`).
- The `@marioState.advance(.Big)` AST shape is: `CallExpr { callee: MemberExpr { object: IdentExpr("@marioState"), property: "advance" }, args: [<.Big variant ref>] }`. Per the spec example at line 20434 + the kickstarter §1, the `.advance` call uses the `@`-sigil ON the engine variable.
- `emitMember` at `emit-expr.ts:433` would emit `_scrml_reactive_get("marioState").advance` — calling that as a function would fail (the cell value is a bare string variant tag, no `.advance` method).
- Engine variable detection: per C12, `collectC12EngineDecls(fileAST)` returns the in-scope engines; their `engineMeta.varName` strings are the canonical engine variable names. C13 pre-computes `Set<string>` of these names.
- Threading: the `EmitExprContext` interface in `emit-expr.ts:47-58` is the natural carrier. Add `engineVarNames?: Set<string> | null` field. Populated by emit-reactive-wiring's `_makeExprCtx` (or wherever the ctx is constructed); plumbed through every emit call.

**Decision:**
- **File:** Add the `.advance` interception arm in **`emit-expr.ts:emitCall`**. The shape is: `if callee.kind === "member" && callee.property === "advance" && callee.object.kind === "ident" && callee.object.name.startsWith("@") && engineVarNames.has(callee.object.name.slice(1)) && args.length === 1 → emit _scrml_engine_advance(varName, target, tableConst)`.
- **Engine-variable detection:** add `engineVarNames?: Set<string> | null` to `EmitExprContext`. Compute once per file in `emit-reactive-wiring.ts` via `collectC12EngineDecls(fileAST).map(d => d._record.engineMeta.varName)`. Plumb through `EmitLogicOpts` → `_makeExprCtx`. Wire next to existing `derivedNames` plumbing.
- **Helper-call argument shape:** `_scrml_engine_advance("marioState", <targetExpr>, __scrml_engine_marioState_transitions)`. Three args: var name (string literal), target expr (already-emitted JS for the variant arg), table-const reference (compile-time-baked identifier). Emitting the table-const as a direct identifier (not a string lookup) means tree-shaking / module-init order is automatic.

**Argument extraction note:** `args[0]` is the `.Big` variant reference. Per `emit-expr.ts:emitIdent`, `.Big` parses as IdentExpr `name: ".Big"` then is rewritten to `"Big"` (bare-string variant) by the existing variant-ref pipeline. The runtime helper expects the bare string; the standard `emitExpr` on `args[0]` produces it correctly (for unit variants — payload variants on `.advance(.X)` would be a separate question, but `.advance` per §51.0.G takes only the variant tag, not a payload).

## Survey question 3 — `effect=` parsing status

**Question:** Does `engineMeta.stateChildren[].effectExpr` (or similar) carry the parsed `effect=` value?

**Findings:**
- `engine-statechild-parser.ts:43` — explicit comment: "Parse `effect=`, `<onTransition>` — those belong to B17."
- `symbol-table.ts:5130` (B17 SHIPPED block) — explicit deferral: "`effect=` placement + form validation (engine state-children not parsed)".
- `EngineStateChildEntry` (`symbol-table.ts:213-222` + mirrored in `emit-engine.ts:77-87`) has fields `tag`, `rule`, `bodyRaw`, `isColonShorthand`, `rawOffset`, `historyAttr`, `internalRule`, `onTimeoutElements`, `innerEngines`. **No `effectExpr` field exists.**
- Manual grep for `effectExpr` in `compiler/src/`: ZERO hits.

**Decision: DEFER `effect=` emission.** Same blocker as `<onTransition>` firing — the parser hasn't elevated the attribute into structured AST. Document in BRIEF DEFERRED-ITEMS for PA's audit trail. The follow-on dispatch (call it C13b or a new A1b parser-extension step) lands `effect=` parsing, `<onTransition>` parsing, AND their codegen emission together.

## Survey question 4 — Helper-DRY decision

**Question:** Separate `_scrml_engine_check_transition` (boolean) + `_scrml_engine_advance` (throw-on-failure) vs single `_scrml_engine_advance` with framing flag?

**Trade-offs considered:**
- **Single helper with framing flag:** one function, one runtime cost, but the API is `_scrml_engine_advance(varName, target, table, framing)` — caller pollutes every call site with a framing-string literal. Conditional-throw inside a single function requires either a callback for message construction or a string-template branch.
- **Three helpers (DRY internal check):**
  - `_scrml_engine_check_transition(currentVariant, target, tableConst)` — pure boolean predicate. Reused by both throw paths.
  - `_scrml_engine_advance(varName, target, tableConst)` — for `.advance()`. Reads cell, checks, throws WITH "asserted advance failed" framing on failure, else writes.
  - `_scrml_engine_direct_set(varName, target, tableConst)` — for direct writes. Reads cell, checks, throws WITH plain `E-ENGINE-INVALID-TRANSITION` framing on failure, else writes.
- **Two helpers (advance + direct, both inline the check):** acceptable but loses the pure-predicate accessor that future C14 derived-engine work or `.tryAdvance`-equivalent (none planned per spec) might want.

**Decision: Three helpers with the shared internal `_scrml_engine_check_transition` predicate.**

**Reasoning:**
1. The predicate is small and unambiguously reusable — the same lookup logic (`legal === "*"` OR `legal.includes(target)`) is the only thing both throw paths share.
2. Two distinct surface helpers (`_scrml_engine_advance` for `.advance()`, `_scrml_engine_direct_set` for direct writes) each carry their own framing message in their function body. No flag parameter, no string interpolation at the call site. Codegen emits a single `_scrml_engine_advance(...)` or `_scrml_engine_direct_set(...)` call — clean.
3. Message clarity: each helper's throw site is the one place to read or change that message. Easier to maintain. Easier to grep.
4. Marginal runtime cost: extra function call per write — negligible. The check is O(1) (object lookup + array.includes on a small array).
5. C14 derived-engine reuse: C14 may need to consult the predicate (e.g., to validate a derived projection result). Having the bare predicate exported avoids C14 having to re-implement the check or call the throwing variant in a try/catch.

Helper signatures (final):
```
function _scrml_engine_check_transition(currentVariant, target, tableConst) -> boolean
function _scrml_engine_advance(varName, target, tableConst) -> void  // .advance() — "asserted advance failed" framing
function _scrml_engine_direct_set(varName, target, tableConst) -> void  // direct write — plain E-ENGINE-INVALID-TRANSITION
```

## Decisions summary

| Question | Decision | Reasoning |
|---|---|---|
| Write-hook seam | FORK as `buildEngineBindingsMap` + `emitEngineWriteGuard` | Legacy `TransitionRule[]` shape too entangled with machine-only features; new format is structurally simpler |
| `.advance()` dispatch | `emit-expr.ts:emitCall` + `engineVarNames: Set<string>` on `EmitExprContext` | Natural CallExpr dispatch site; compile-time set avoids runtime detection cost |
| `effect=` parsing | NOT PARSED → defer to `<onTransition>` follow-on | `engine-statechild-parser.ts:43` + `symbol-table.ts:5130` confirm B17 deferred; no `effectExpr` field exists |
| Helper-DRY | Three helpers with shared internal predicate | Message-clarity wins; predicate reusable for C14 derived-engine work |

## Verdict

**SHIP** — narrow C13 scope: direct-write hook + `.advance()` emission + 3 runtime helpers + new `engine` runtime chunk #18. `<onTransition>` firing + `effect=` emission deferred to a follow-on step that includes the parser extension. Compile-time validation of literal direct writes inside state-child bodies remains OUT (C13 ships RUNTIME enforcement only per BRIEF item 6).
