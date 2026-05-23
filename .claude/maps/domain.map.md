# domain.map.md
# project: scrmlts
# updated: 2026-05-23T09:52:00-06:00  commit: c2d93544

The domain is the scrml COMPILER pipeline. scrml is a single-file, full-stack
reactive web language; the compiler splits server from client, wires reactivity,
routes HTTP, and emits HTML/CSS/JS. Normative authority: compiler/SPEC.md (58
sections) + compiler/PIPELINE.md. Per pa.md Rule 4, SPEC.md is normative.

## Core Concepts
FileAST            — typed AST for one .scrml file; the central data structure
                     (compiler/src/types/ast.ts:1487). Output of TAB.
Pipeline stage     — a discrete transform; each has its own diagnostic class and
                     an optional `selfHostModules` override slot.
selfHostModules    — optional overrides letting compiled-scrml modules replace
                     JS pipeline stages (splitBlocks / buildAST / runPA / runRI /
                     resolveModules / runTS / runMetaChecker / runDG / runCG / bpp).
Native parser      — the scrml-native composed-engines front-end
                     (compiler/native-parser/); replaces BS + Acorn + BPP + the
                     statechild re-tokenizers per charter B (S111). As of C2
                     (S119) it is ROUTED at the TAB seam behind `--parser=scrml-native`.
                     M6 Wave 1 (S122) began consumer-side retirement of legacy
                     `splitBlocks` / `parseExprToNode` call-sites.
Build Story        — SPEC §58 (S118). An explicit, committed, content-addressed
                     record of *what "the compiler" is* for a build — a Merkle
                     closure. Spec-ahead: NO compiler implementation exists yet.
scrml:compiler     — KNOWN-DEFERRED stdlib family (SPEC §41.17, S121 Wave 8 Unit F).
                     Umbrella + 13 per-stage thunk shims at
                     compiler/runtime/stdlib/compiler/<stage>.js; every export
                     throws at call time with W-STDLIB-COMPILER-DEFERRED attribution.

## Pipeline Stages — orchestrated by `compileScrml` in compiler/src/api.js
The full chain (api.js stage labels in brackets):

  Auto-gather pre-pass — expand inputFiles to transitive .scrml import closure (§21.7)
  Ghost-lint pre-pass  — lintGhostPatterns + Tailwind class lints (non-fatal).
                         S121 W11-T context-aware brace counters. S122 Unit AA
                         W-LINT-013 markup-attribute opener scope-gate (Vue `@click` FP).
  Stage 2  [BS]        — Block Splitter; .scrml → Block[]            (block-splitter.js)
  Stage 3  [TAB]       — Typed AST Builder; Block[] → FileAST        (ast-builder.js + tokenizer.ts).
                         C2: `--parser=scrml-native` routes per-file parse through
                         `nativeParseFile` (parse-file.js) instead of `buildAST`.
                         S122 Unit U tilde-decl reassignment vs declaration close.
  Stage 3.004 [PRECG]  — computePGOFlags + computeProgramConfig
  Stage 3.005 [GCP1]   — Gauntlet Phase 1 checks (§21/§41/§7.6)
  Stage 3.006 [GCP3]   — Gauntlet Phase 3 equality checks (§45)
  Stage 3.007 [LINT-TRY-CATCH] — W-TRY-CATCH-IN-SCRML-SOURCE guard
  Stage 3.008 [LINT-ASYNC-USER-SOURCE] — I-ASYNC-USER-SOURCE info lint
  Stage 3.1  [MOD]     — Module Resolution; importGraph + exportRegistry  (module-resolver.js).
                         S122 Unit W specifiers[] plumbing for aliased imports.
  Stage 3.105 [STDLIB-EXPORT-SEED] — seed exportRegistry from stdlib .scrml
  Stage 3.05 [NR]      — Name Resolution                              (name-resolver.ts).
                         S122 Unit W aliased component imports use `spec.local`.
  Stage 3.06 [SYM]     — Symbol Table; state-cell scope tree         (symbol-table.ts)
  Stage 3.2  [CE]      — Component Expander; expands component markup (component-expander.ts).
                         M6.2 STOPped on MarkupValue gap → M6.2a bridge LANDED;
                         M6.2b retry PENDING.
  Stage 3.3  [VP-2/VP-3/VP-1] — Post-CE validators (invariant / attr-interp / allowlist)
  Stage 4  [PA]        — Protect Analyzer                            (protect-analyzer.ts)
  Stage 5  [RI]        — Route Inference; RouteMap                   (route-inference.ts).
                         S121 W10-P `walkBodyForTriggers` EXPR_NODE_CALLEE_FIELDS
                         (20 W-DEAD-FUNCTION FP closed). S122 W13 Unit Y extended
                         to Trigger 1/2 EXPR_NODE field-scan.
  Stage 5.5 [MC]       — Monotonicity Classifier (§19.9.6) + E-CPS-* (monotonicity-analyzer.ts)
  Stage 6  [TS]        — Type System; cross-file type registry       (type-system.ts).
                         S121 W11-S import-decl scope-chain `spec.local` (L5502).
                         S122 Unit U tilde-decl; Unit W aliased type imports `spec.local`.
  Stage 6.4 [LINT]     — I-MATCH-PROMOTABLE info lint                (lint-i-match-promotable.js)
  Stage 6.4b [LINT]    — **I-FN-PROMOTABLE info lint (NEW S122 Unit EE)** —
                         `lint-i-fn-promotable.js`. Sibling to I-MATCH-PROMOTABLE;
                         surfaces `function` declarations whose body satisfies the
                         §48.3 fn-body prohibitions (no `?{}`, no DOM mutation, no
                         outer-scope mutation incl. `@`-cell writes, no async/await,
                         no `lift`) as eligible for one-keyword rename to `fn` (≡
                         `pure function` per §48.11). Structurally skipped for
                         async/server/generator/failable/handle() (§56.9.1).
                         Informational only; wired at api.js:1556.
  Stage 6.5 [MC]/[ME]  — Meta Check + Meta Eval                      (meta-checker.ts / meta-eval.ts).
                         S122 M6.1 meta-eval migrated `splitBlocks` → `nativeParseFile`.
  Stage 7  [DG]        — Dependency Graph (post-meta AST)            (dependency-graph.ts)
  Stage 7.5 [BP]       — Batch Planner (§8.9-§8.11)                  (batch-planner.ts)
  Stage 7.55 [AG]      — Auth Graph derivation (§40)                 (auth-graph.ts)
  Stage 7.6 [RS]       — Reachability Solver                         (reachability-solver.ts)
  Stage 8  [CG]        — Code Generator; emits server/client/HTML/CSS (code-generator.js → codegen/index.ts).
                         S122 M6.3 emit-match migrated `splitBlocks` → `nativeParseFile`
                         for per-arm bare-body re-parse. S122 Unit DD emit-logic.ts
                         paren-wraps 5 thunk emit sites (GITI-014 zero-arg arrow
                         returning object literal). S122 Unit BB / BB-followup emit-expr.ts
                         postfix-reactive lowering restore + correct setter form for
                         @x++/@x--. M6.5 path-a `codegen/compat/parser-workarounds.js`
                         proven no-op under native (pre-M6.8 deletion regression gate).
  Stdlib bundling      — copy runtime shims into <out>/_scrml/*.js (S121 Bug 8: 13 new
                         top-level shims; W-STDLIB-SHIM-MISSING + W-STDLIB-COMPILER-DEFERRED).
  Output write loop    — F-COMPILE-001 Option A preserved source tree; per-route chunk writes

## The M5 Pipeline-Swap Seam (C2 — routed)
- Live front-end: BS (block-splitter.js) + TAB (ast-builder.js + tokenizer.ts) + BPP
  + Acorn-driven `parseExprToNode`. Output: `TABOutput { filePath, ast: FileAST, errors }`.
- `--parser=scrml-native` (C2, S119) ROUTES the per-file TAB stage through the native
  parser's `nativeParseFile` (parse-file.js) instead of the live `buildAST`. The flag
  is strictly OPT-IN (`parser` defaults to `null`); every other caller runs the
  untouched live BS+TAB path. api.js emits one I-PARSER-NATIVE-SHADOW per native-routed
  compile (api.js:1857). BS still runs (its `bsResults` feed the GCP1 raw-block-tree
  check); the native path simply re-parses from source.
- `nativeParseFile` returns the SAME `{ filePath, ast: FileAST, errors }` shape, so
  every downstream stage (PRECG / GCP1 / GCP3 / NR / RI / AG / CG) runs unchanged.
- The native parser produces SEPARATE catalogs (Token[], Stmt[] 20 kinds, Expr 40
  ExprKinds, Block[]). Bridge layer + C1 assembler compose them into the FileAST:
    - translate-stmt.js (R1) — native Stmt[] → live LogicStatement[]. S122 R4-U1+U2
      wired translateExpr at bare-expr/return-stmt/throw-stmt + for-stmt iterExpr +
      cStyleParts (2 of ~5 R4-continuation sites; U3/U4/U5 PENDING).
    - translate-expr.js (A2) — native Expr → live ExprNode. Module complete S118;
      integration wired progressively through R4-Ux units (above).
    - collect-hoisted.js (A3) — native Block[] → imports/exports/typeDecls/components/
      machineDecls/channelDecls/hasProgramRoot; SYNTHESIZES declaration node shapes;
      exports isEngineBlock + synthEngineDecl. S122 M6.4a P2-Form1 synthesis +
      cross-file Export/Import shape (closes 1+2 E-COMPONENT-035 fires).
    - **translateMarkupValueToLiveNode** (M6.2a, NEW S122) — bridge for
      lift-expr.expr.node consumers; clears M6.2 component-expander block.
    - parse-file.js (C1) — `nativeParseFile` composes parseMarkupTrace + the three
      bridges into the live FileAST; 12 per-BlockKind synth* builders (S121 P5-7
      added `synthMatchBlockNode` for `match-block` ASTNode parity); one shared `idGen`.
      1037L as of S122. Now imported by `meta-eval.ts` and `codegen/emit-match.ts`
      (M6.1 + M6.3, S122 Wave 1).
- Dual-pipeline canary strict-pass remains 998/1000 through S122 unchanged.
- C2 gap-ledger docs (S121, unchanged through S122): `docs/changes/m5-c2-gap-ledger/`
  (investigation, phase4-triage, phase5-triage, phase5-retriage-s121, p5-14-deferral,
  gap-neb-survey-s121, w-dead-function-survey-s121, post-w10-p-residual-survey-s121).

## v0.7 M5-swap progression (S117-S121 — current truth summary)
S117 R1 + R4 (statement-catalog bridge + §34.1 seed 66 codes); S118 A2 module + F4
SpanTable retirement + B1-B7 (`?` propagate / `!{}` guarded-expr / `~`-decl / `lin` /
`type` / `fn`/`server`/`pure` / `throw`/`try` forbidden-vocab) grew §34.1 66→79;
S119 A3 declaration/hoist synthesis + C1 `nativeParseFile` assembler + C2 ROUTING
swap + dual-pipeline canary + §34.1 +2 info codes → 81; S119-S120 gap-ledger Phase 4
(261→51) and Phase 5 P5-1..P5-13 (51→15); S121 Waves 4-11 closed final parser-side
residual (P5-7 match-block synthesis), added scrml:compiler family deferral
(§41.17), 2 new canary classes (LIVE-PHANTOM, LIVE-HOIST-MISCLASSIFY), 26 W-LINT
+ 20 W-DEAD-FUNCTION FP closures.

## v0.8 M6 Wave 1 (S122 — current status)
Tests 13,773 → 19,907 / 0 fail across S122 marathon (~10h). Native-parser canary
strict-pass remains 998/1000 unchanged. M6 Wave 1 LANDED (per the M6 ladder):
  - M6.1 LANDED — meta-eval.ts migrated splitBlocks → nativeParseFile
  - M6.2 STOPped → M6.2a `translateMarkupValueToLiveNode` bridge LANDED;
    M6.2b component-expander retry PENDING
  - M6.3 LANDED — emit-match.ts per-arm bare-body re-parse → nativeParseFile
  - M6.4 STOPped → M6.4a P2-Form1 + cross-file Export/Import shape LANDED
    (closes 1+2 E-COMPONENT-035)
  - M6.5 PROVEN NO-OP — codegen/compat/parser-workarounds.js helpers no-op under
    native (pre-M6.8 deletion regression gate)
  - M6.6 STOPped (adapter infeasible — 12-of-12 fields + nested sub-types) →
    M6.6.b.1 SURVEY + IMPL LANDED (in-opener colon-shorthand recognition +
    540L `M6.6-CONTRACT-DERIVATION.md` cookbook for M6.6.b.2..b.6)
  - PENDING: M6.2b, M6.6.b.2..b.6, M6.7 (PA/MOD migrations), M6.8 (legacy
    front-end deletion of BS+Acorn+BPP)

R4-continuation (translateExpr wiring at the R1 ride-through sites):
  - R4-U1 LANDED — bare-expr/return-stmt/throw-stmt sites
  - R4-U2 LANDED — for-stmt iterExpr + cStyleParts slots
  - PENDING: R4-U3 / R4-U4 / R4-U5 (3 sites remaining)

S122 host-side fix landings (regression-test gated):
  Wave 12 Unit U (tilde-decl reassignment, E-MU-001 close in ast-builder +
    type-system); Unit W (aliased imports use `spec.local` across module-resolver +
    name-resolver + api 3 sites); Unit X (parse-markup.scrml @-sigil cleanup,
    9→0 E-NAME-COLLIDES-STATE).
  Wave 13 Unit Y (walker extended to Trigger 1/2 EXPR_NODE field-scan, sister
    to S121 W10-P); Unit Z (E-NAME-COLLIDES-STATE did-you-mean hint).
  Wave 14 Unit AA (W-LINT-013 markup-attribute opener scope-gate, Vue `@click` FP);
    Unit BB / BB-followup (postfix @x++/@x-- setter form + emitUnary postfix-reactive
    lowering restore); Unit DD (GITI-014 paren-wrap at 5 thunk emit sites).
  Unit EE (NEW I-FN-PROMOTABLE info lint + SPEC §56.9 + §34 row + Stage 6.4b wire).

Process docs: 25 new files across 10 new `docs/changes/` dirs (m66-b1-impl,
m66-b1-native-contract-survey, m66-engine-statechild-adapter, r4-* x3, w12-/w14-* x4,
unit-u-tilde-decl-mu-001) plus continuations in existing dirs (i-fn-promotable,
m6-2-component-expander, m6-3-emit-match-native, m6.1-meta-eval-native-migration,
m6.2a-markupvalue-bridge, m6.4a). Process artifacts, not live-truth.

## Native Parser Charter (charter B, S111)
Replaces the WHOLE front-end — block-splitter, Acorn layer, BPP, statechild
re-tokenizers. M-ladder: M1 (lexer, COMPLETE) → M2 (expr) → M3 (stmt) → M4
(full JS subset) → MK1-MK4 (markup) → M5 (pipeline swap behind `--parser=scrml-native`;
C1/C2 landed S119) → **M6 (joint retirement; consumer migration BEGAN S122;
M6.1/M6.3/M6.4a/M6.6.b.1 landed; M6.8 joint deletion of BS+Acorn+BPP pending
M6.2b/M6.6.b.2..b.6/M6.7 closures)**. Composed-engines architecture: every
state-shape construct points to an `<engine>` (Pillar 5b discipline). .scrml files
carry canonical SHAPE; 1:1 .js shadow files carry the executable surface (M4+
swap-in concession).

## Business Invariants
- scrml SOURCE has no exceptions / no try-catch (§19.1) — values-not-exceptions.
  Native parser B7 REJECTS `throw`/`try` with E-THROW-NOT-IN-SCRML / E-TRY-NOT-IN-SCRML;
  translate-stmt.js treats `Throw`/`Try` as forbidden-vocab kinds.
- `null` and `undefined` do not exist in scrml; both map to `not`. `""` / `0` /
  `false` / `[]` / `{}` are DEFINED values, not absence (memory S89, absolute).
- No async/await in scrml SOURCE (memory: standing rule); body-split is the async
  shape, not user-visible async; `!{}` is the call-site error handler, distinct
  from body-split and from try/catch (memory: error-model distinction).
- Production builds are bit-identical with testMode disabled (§19.12.7 0-byte cost).
- The native parser is NOT a port and NOT the v1.0 self-host; Acorn is the
  conformance ORACLE, never the design template.
- Native FileAST id discipline: `nativeParseFile` threads ONE `idGen` `{ next }`
  through every synthesizer + collectHoisted + every translateStmtList call.
- §58 Build Story: given the same `(source, buildStory)` pair, any party can
  reconstruct the exact compiler and produce a bit-identical artifact. SPEC-AHEAD.
- **M6 consumer-migration pattern**: every legacy `splitBlocks` / `parseExprToNode`
  call-site retires to `nativeParseFile`; if native exposes a synthesis or contract
  gap, STOP and ship the bridge first (M6.2→M6.2a, M6.4→M6.4a, M6.6→M6.6.b.1
  cookbook). Adapter approaches are infeasible when more than ~3 contract fields
  diverge (S122 M6.6 STOP finding).

## Aggregates / Key Modules
api.js               — pipeline orchestrator; `compileScrml`; S122 Unit EE wires
                       Stage 6.4b I-FN-PROMOTABLE; Unit W threads `spec.local`.
codegen/index.ts     — Stage 8 sub-pipeline; `runCG` → ~55 emit-* modules
codegen/emit-match.ts — Stage 8; S122 M6.3 per-arm bare-body re-parse → nativeParseFile
codegen/emit-logic.ts — Stage 8; S122 Unit DD paren-wraps 5 thunk emit sites
codegen/emit-expr.ts  — Stage 8; S122 Unit BB / BB-followup postfix-reactive lowering
codegen/compat/parser-workarounds.js — S122 M6.5 path-a no-op proof + regression gate
reachability-solver.ts — Stage 7.6; delegates to reachability/component-1..5
meta-eval.ts         — Stage 6.5; S122 M6.1 splitBlocks → nativeParseFile
native-parser/lex.js — composed-engines lexer entry; 7 LexMode dispatchers
native-parser/parse-stmt.js / parse-expr.js / parse-markup.js — three parsers;
                       S122 Unit X parse-markup @-sigil cleanup; M6.6.b.1 in-opener
                       colon-shorthand recognition
native-parser/{translate-stmt,translate-expr,collect-hoisted}.js — native→live bridge;
                       S122 R4-U1+U2 wired translateExpr (2 of ~5 sites); M6.4a
                       collect-hoisted P2-Form1 synthesis + cross-file Export/Import
native-parser/translateMarkupValueToLiveNode — NEW S122 M6.2a bridge
native-parser/parse-file.js — `nativeParseFile` C1 FileAST assembler (1037L; S121
                       P5-7 synthMatchBlockNode)
native-parser/M6.6-CONTRACT-DERIVATION.md — NEW S122 540L cookbook for M6.6.b.2..b.6
lint-i-fn-promotable.js — NEW S122 Unit EE sibling to lint-i-match-promotable.js
lint-ghost-patterns.js — S121 W11-T factored helpers; S122 Unit AA W-LINT-013 scope-gate
route-inference.ts (walkBodyForTriggers) — S121 W10-P EXPR_NODE_CALLEE_FIELDS +
                       S122 W13 Unit Y Trigger 1/2 EXPR_NODE field-scan
type-system.ts       — S121 W11-S import-decl `spec.local`; S122 Unit U tilde-decl
                       + Unit W aliased type imports
ast-builder.js       — Stage 3 live TAB; S122 Unit U + Wave 12 plumbing
module-resolver.js   — Stage 3.1; S122 Unit W specifiers[] plumbing
name-resolver.ts     — Stage 3.05; S122 Unit W aliased component imports `spec.local`
symbol-table.ts      — Stage 3.06; S122 diagnostics threading

## Tags
#scrmlts #map #domain #pipeline #native-parser #m5-swap #m6-wave1 #compiler #build-story #s122

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [schema.map.md](./schema.map.md)
