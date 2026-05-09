# C13 progress (re-scoped: `.advance()` + direct-write hook ONLY)

**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a847ccdc7ea56ebb9`
**Branch:** `worktree-agent-a847ccdc7ea56ebb9`
**Baseline (post-C12):** 10349 / 60 / 1 / 0

- 2026-05-08 — startup verification: rebased onto main (5c910a3 = C12 SHIP); `bun install`; `bun run pretest`; `bun run test` confirmed 10349 / 60 / 1 / 0.
- 2026-05-08 — read brief, kickstarter, anti-patterns, Mario example, C12 SURVEY, C12 emit-engine.ts.
- 2026-05-08 — surveyed legacy plumbing: `buildMachineBindingsMap` (engine + table-name + rules + auditTarget map keyed on cell name); `_emitReactiveSet` consults map + dispatches to `emitTransitionGuard`; `bare-expr` interception in `emit-logic.ts:649` for direct `@var = expr` writes. Confirmed `emit-machines.ts:emitTransitionGuard` is shape-coupled to `TransitionRule[]` (`from`/`to`/`guard`/`label`/`effectBody`/`afterMs`/bindings). The C12 transition-table format `["X"]` / `"*"` / `[]` per from-variant is structurally distinct.
- 2026-05-08 — confirmed `effect=` parsing status: `engine-statechild-parser.ts:43` says "`effect=`, `<onTransition>` belong to B17"; `symbol-table.ts:5130` confirms B17 SHIPPED only E-COMPONENT-ENGINE-SCOPE and explicitly DEFERS `effect=` placement + form validation. EngineStateChildEntry has no `effectExpr` field. **`effect=` not parsed → defer** alongside `<onTransition>`.
- 2026-05-08 — confirmed `usage.engines` already exists in `usage-analyzer.ts:432`. New chunk #18 `engine` will key on this signal.
- 2026-05-08 — added 3 runtime helpers in `runtime-template.js`: `_scrml_engine_check_transition` (predicate), `_scrml_engine_advance` ("asserted advance failed" framing), `_scrml_engine_direct_set` ("illegal direct write" framing). Registered new chunk #18 `engine` in `runtime-chunks.ts` (RUNTIME_CHUNK_ORDER + CHUNK_MARKERS). Wired detection in `emit-client.ts:detectFromNode` on `engine-decl` AST nodes.
- 2026-05-08 — added codegen helpers in `emit-engine.ts`: `EngineBindingInfo` interface, `buildEngineBindingsMap`, `emitEngineWriteGuard`, `collectEngineVarNames`, `emitEngineAdvanceCall`. Per SURVEY q1 decision: FORK from machineBindings (sibling map, not extension).
- 2026-05-08 — wired `engineBindings` + `engineVarNames` through `EmitLogicOpts` (emit-logic.ts), `EmitExprContext` (emit-expr.ts), `_makeExprCtx`. Extended `_emitReactiveSet` to dispatch engine-bound writes through `emitEngineWriteGuard`. Added `.advance` arm in `emitCall` (emit-expr.ts) per SURVEY q2 decision. Extended `bare-expr` interception with engineBindings arm.
- 2026-05-08 — wired through `emit-functions.ts` (fn body emission via `scheduleStatements` and shortcut emission) + `scheduling.ts` `scheduleStatements` signature.
- 2026-05-08 — extended `isInit` discriminator in emit-logic.ts (lines 1164 + 1205) to include `engineBindings` so engine-var reassignments inside fn bodies route through the hook (per legacy machine pattern).
- 2026-05-08 — fixed `c10-error-message-resolution.test.js` + `runtime-tree-shaking.test.js` chunk-count assertions (17 → 18).
- 2026-05-08 — created `c13-advance-write-hook.test.js` with 40 tests across 14 sections (§C13.0-§C13.14). All pass; full suite 10389/60/1/0 (no regressions vs 10349 baseline + 40 new).
- 2026-05-08 — VERDICT: SHIP. Final SHA: 77bd14d.

