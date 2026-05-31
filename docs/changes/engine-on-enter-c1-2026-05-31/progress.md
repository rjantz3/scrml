# Engine on-enter C1 arc — progress

Change-id: engine-on-enter-c1-2026-05-31
Ratification: Insight 33 (S144) "ratify C1" + S148 edge-case rulings (this session).
Base: HEAD 09f74bee (+ maps commit 189143a2).

## Edge-case rulings (S148, user-ratified via AskUserQuestion)
1. errorBoundary over a boot-effect throw → NOT caught (render-context only). Boot effects
   route typed `!` failures through their own `!{}` into the engine's error variant
   (errors-as-states); a non-`!` host throw → §19.6.8 loud-log backstop, NOT a fallback.
2. `effect=` on a `derived=` engine opener → FORBID, new code E-ENGINE-EFFECT-ON-DERIVED
   (no init→initial edge; variable read-only).
3. onIdle ordering → variant cell inits → `<onIdle>` arms (module-init = first event, full
   duration) → opener effect fires. Effect's init→initial edge does NOT reset the watchdog;
   cross-variant writes inside it reset normally per §51.0.R.
   (history-restore ordering MOOT for C1: C1 is boot-only, history is re-entry.)

## Phase 1 — SPEC normative core (PA-direct) — DONE (PA-direct)
- [x] §51.0.H Form 3 (opener effect=, boot-only Elm init) + amended Skipped note
- [x] §51.0.B opener attribute table + syntax line (+effect=)
- [x] §51.0.E (no change needed — covered by B+H)
- [x] §51.0.J E-ENGINE-EFFECT-ON-DERIVED rule row
- [x] §51.0.R ordering note (arm-then-fire; effect edge does not reset)
- [x] §51.0.F.1 self-write-vs-self-target trichotomy graft
- [x] §34 catalog: E-ENGINE-EFFECT-ON-DERIVED row
- [x] SPEC-INDEX regen + S148 header/cell notes
- [x] README Stage-3 flagship: self-target -> opener effect=
- [x] PRIMER §7 engines: opener effect= concept

## Phase 2 — compiler source (dispatched, isolation:worktree, scrml-js-codegen-engineer)
- [x] parser: effect= on engine opener (openerEffect field — committed 2e1e47c6)
- [x] SYM/typer: E-ENGINE-EFFECT-ON-DERIVED (both derived forms); openerEffect on EngineMetadata (229c7db0). .initial.rule write-check DEFERRED (B15 raw-text precedent; .skip test).
- [x] codegen: fire once at module-init, after onIdle arm; boot-only IIFE; cross-variant write → _scrml_engine_direct_set (14ee3f4a + Step-A type fix 22ec66a9)
- [x] tests: parser + SYM + codegen unit suite (74f69303, 14 pass/1 skip) + happy-dom acceptance (7f56d4b2, 6 pass)

## Phase 3 — land + verify
- [x] R26 empirical verify (codegen fix, S138) — see "R26 results" below. known-gaps/design-insight/deep-dive status: PA-side same-landing.

## Phase 2 — survey notes (scrml-js-codegen-engineer, 2026-05-31)
- WORKTREE base was stale (09f74bee); `git merge main` fast-forwarded to 8056ff5d (SPEC core present, grep=4). bun install + pretest OK.
- Parser site CONFIRMED: ast-builder.js ~L11984 opener-attr capture region; `_findOpenerEnd` (L11920) is brace+string-aware so the opener header includes the full `effect=${...}` value. AST construction site L12159 (engine-decl return). Adding `openerEffect: string | null`.
- T1 brace-extraction template: engine-statechild-parser.ts L1798-1820 (effectRaw scan). Mirror BUT add string-skip (the state-child scanner does NOT skip `}` inside strings; opener effect body may contain `"}"`).
- EngineMetadata: symbol-table.ts L326; populate at makeEngineRecord L5059.
- E-ENGINE-EFFECT-ON-DERIVED: MUST fire for ANY non-null derivedExpr (legacy-source-var `derived=@x` AND inline-match). walkDerivedEngineDeclRejections L6601 early-returns for legacy-source-var (L6632); so the effect-on-derived check goes BEFORE that skip.
- Codegen module-init path: emit-engine.ts `emitEngineVariantCellInit` L1041 (cell init) + `emitEngineInitialArmsForFile` L1102 (onIdle arm, called AFTER emitReactiveWiring in emit-client.ts L1339). Boot effect fires AFTER onIdle arm → new emitter after engineInitArmLines. Lowering via `rewriteHookExprText` L3078.
- WRITE-VALIDATION DECISION: DEFER (mirrors B15 raw-text deferral, symbol-table.ts L5474-5484 — state-child body write-validation already deferred for the SAME raw-text reason). `.skip` test captures intent.

## R26 empirical results (FINISH dispatch, scrml-js-codegen-engineer, 2026-05-31)
Reproducer: /tmp/r26-c1-verify/flagship.scrml (README Stage-3 engine, program-wrapped, standalone).
- (a) boot effect's `loadTasks()` call appears at module-init (client.js L127, inside the
  `(function () { ... })()` opener-effect IIFE) — NOT inside any `_scrml_engine_phase_wire_*` /
  `_scrml_engine_phase_render_*` per-arm handler. Cross-variant write lowered to
  `_scrml_engine_direct_set("phase", ..., __scrml_engine_phase_transitions)`.
- (b) `node --check` exit 0 on the emitted flagship.client.js.
- (c) derived+opener-effect reproducer (/tmp/r26-c1-verify/derived.scrml) FAILS with exit 1 +
  `E-ENGINE-EFFECT-ON-DERIVED` (not a silent accept) — both `derived=@src` legacy-source-var and
  inline-match forms covered (SYM unit tests).

## Step-A codegen-API verification (inherited codegen was authored but never run)
The prior agent's `require("../block-splitter.js").runBlockSplitter` /
`require("../ast-builder.js").buildAST` / `require("./emit-logic.ts").emitLogicBody` API usage was
CORRECT — a faithful copy of the proven `_emitNestedGuardedArmBody` re-parse path in emit-logic.ts.
ONE fix: the opts param was annotated `import("./emit-logic.ts").EmitLogicOptsLike`, a type that
does not exist. Real type is `EmitLogicOpts` (was un-exported). Exported it + fixed the reference
(commit 22ec66a9). Bun strips types so this never crashed at runtime; the codegen otherwise
verified correct end-to-end.
