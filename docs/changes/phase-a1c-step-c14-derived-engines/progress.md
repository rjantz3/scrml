# A1c Step C14 — derived engines (`derived=expr` emission, L20)

Append-only progress log per pa.md crash-recovery protocol.

## 2026-05-09T00:00 — boot

- WORKTREE: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a55d0a47e86679461`
- Branch: `worktree-agent-a55d0a47e86679461`
- BASELINE post-`bun run test`: **10,308 / 60 / 1 / 0** (BRIEF said 10,389; off by 81 — accept 10,308 as the actual S74 baseline; 0 fail intact).
- Spec re-read: §51.0.J (lines 20607-20642), §34 rows 14457-14461 (E-DERIVED-ENGINE-* family).
- Pre-coding reading complete: BRIEFING-ANTI-PATTERNS, kickstarter, PRIMER §7, C12+C13 SURVEY HANDOFF.

## 2026-05-09T00:05 — survey complete

Four decisions documented in SURVEY.md:

1. **Walker decision** — sibling fn `collectC14DerivedEngineDecls`. C12's `collectC12EngineDecls` is essentially identical except for the `derivedExpr` filter direction. Forking by polarity (== null vs != null) keeps each gating predicate self-documenting without a parameterized "mode" arg complicating the call site.

2. **B16 annotation status** — `engineMeta.derivedExpr` today carries ONLY the legacy single-source-var form `{ kind: "legacy-source-var", varName: <upstream> }` (parser only recognizes `derived=@varname`; the §51.0.J `derived=match @x {...}` rich form is NOT yet structurally parsed — confirmed in `ast-builder.js:8593` regex + `dependency-graph.ts:1131-1138` block comment). C14 emits for the legacy-source-var shape; rich-expr emission lands when ast-builder/B16 widen `derivedExpr` to a parsed ExprNode.

3. **Initial-value-undefined throw locus** — INSIDE the closure. The closure must run once at engine-init time; if the result is `undefined` (no matching arm — for legacy-source-var, this happens when the upstream cell's variant has no projection), the closure throws `E-DERIVED-ENGINE-INITIAL-UNDEFINED`. Inline keeps locality; no new helper buys clarity given the projection logic itself is the one place to detect it.

4. **Chunk-trigger decision** — Confirmed `usage-analyzer.ts:430-456` already sets `usage.derivedEngines = true` when `derivedExpr != null`. BUT `emit-client.ts:detectFromNode` triggers `engine` chunk on `engine-decl` and DOES NOT trigger `derived` chunk for derived engines. C14 must extend `emit-client.ts` so derived engines also pull in the `derived` chunk (the runtime helpers `_scrml_derived_declare`/`_scrml_derived_subscribe`/`_scrml_derived_get`).

VERDICT: SHIP — narrow C14 scope, minimal new code, no new runtime helpers needed (REUSE `_scrml_derived_declare`/`_scrml_derived_subscribe`/`_scrml_derived_get`).

## 2026-05-09T00:30 — emission code committed

- BASELINE confirmed AFTER rebase onto main (which had C12+C13): **10,389 / 60 / 1 / 0**.
- `compiler/src/codegen/emit-engine.ts` extended with C14 section:
  - `isC14DerivedEngineDecl` (excludes legacy `<machine>` keyword via `legacyMachineKeyword !== true`)
  - `collectC14DerivedEngineDecls` (sibling to C12's walker)
  - `collectDerivedEngineDeps` (handles legacy single-source-var; future-ready for rich-expr form)
  - `buildDerivedEngineClosureBody` (identity projection + inline E-DERIVED-ENGINE-INITIAL-UNDEFINED throw)
  - `emitDerivedEngineSubstrate` (per-decl shape: declare + subscribe + forced get)
  - `emitDerivedEngineSubstrateForFile` (orchestration + mount-marker)
- `compiler/src/codegen/emit-client.ts` extended:
  - Import added for `emitDerivedEngineSubstrateForFile`.
  - `engine-decl` chunk-detection arm now adds `derived` chunk when `engineMeta.derivedExpr != null` AND `legacyMachineKeyword !== true`.
  - Call site added for `emitDerivedEngineSubstrateForFile` (after the C12 engine substrate section).
- TEST after emission code: **10,389 / 60 / 1 / 0** (no regression).

## 2026-05-09T00:35 — issue caught + fixed: legacy <machine> regression

- First test run after wiring revealed: `derived-machines.test.js` test "happy-dom: writing @order updates ${@ui} text content" REGRESSED (1 fail).
- ROOT CAUSE: my `isC14DerivedEngineDecl` predicate gated only on `meta.derivedExpr != null` — but legacy `<machine name=UI for=UIMode derived=@order>` ALSO ends up with `derivedExpr = { kind: "legacy-source-var", varName: "order" }`. The C14 emission ran for legacy machines and double-registered the projection cell, with the C14 forced-init read firing before `_scrml_reactive_set("order", ...)` had run.
- FIX: gate predicate ALSO on `legacyMachineKeyword !== true` (the field is set by `ast-builder.js:8740` for `<machine>` keyword decls). Also gated the chunk-detection on the same flag.
- TEST after fix: **10,389 / 60 / 1 / 0** (back to baseline).

## 2026-05-09T00:40 — C14 unit tests landed

- New file: `compiler/tests/unit/c14-derived-engines.test.js` — 37 tests covering all SURVEY decisions + E2E + runtime cascading + initial-undefined throw + B16-rejection no-regression.
- TEST after tests added: **10,426 / 60 / 1 / 0** (+37, 0 regression).
- All 37 C14 tests pass.

## 2026-05-09T00:45 — SHIP

VERDICT: **SHIP**. All four SURVEY decisions implemented as documented. Baseline preserved. C14 emission for the LEGACY single-source-var form is end-to-end verified. Rich-expr form (`derived=match @x {...}`) deferred — parser blocker, future parser-extension step lands the parsing + B16 widening + this emitter's body/dep logic widening simultaneously.

DEFERRED to follow-on:
- `<onTransition>`/`effect=` firing on derived state-children — same parser blocker as C13 (B17 didn't land that surface).
- Rich `derived=match @x {...}` form — parser blocker (ast-builder.js only matches `derived=@varname`).
- Body rendering — still-deferred follow-on (state-child bodies are RAW TEXT today).
- Cross-file derived-engine import — C15.

C15 HANDOFF:
- C15's cross-file engine import discrimination needs to know derived-vs-non-derived at the IMPORT SITE. The discriminator is `engineMeta.derivedExpr != null`. If C15 builds an import-site dispatch on the export's record, it can branch on this flag.
- C15's chunk membership for cross-file mount: a mounted derived engine pulls in the SAME `derived` chunk as a same-file derived engine. The mount-site emission should add `derived` to `usedRuntimeChunks` when the imported engine is derived.
- C14 exports `collectC14DerivedEngineDecls`, `isC14DerivedEngineDecl`, `emitDerivedEngineSubstrate{,ForFile}` — C15 can reuse the discrimination predicate at the import-site dispatch.
