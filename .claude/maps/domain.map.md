# domain.map.md
# project: scrmlts
# updated: 2026-05-23T00:00:00-06:00  commit: 136678e5

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
Build Story        — SPEC §58 (S118). An explicit, committed, content-addressed
                     record of *what "the compiler" is* for a build — a Merkle
                     closure. Spec-ahead: NO compiler implementation exists yet.
scrml:compiler     — KNOWN-DEFERRED stdlib family (SPEC §41.17, S121 Wave 8 Unit F).
                     Umbrella + 13 per-stage thunk shims for
                     bs/tab/mod/ce/bpp/pa/ri/ts/mc/me/dg/cg/expr at
                     compiler/runtime/stdlib/compiler/<stage>.js. Every export
                     throws at call time with W-STDLIB-COMPILER-DEFERRED attribution.

## Pipeline Stages — orchestrated by `compileScrml` in compiler/src/api.js
The full chain (api.js stage labels in brackets):

  Auto-gather pre-pass — expand inputFiles to transitive .scrml import closure (§21.7)
  Ghost-lint pre-pass  — lintGhostPatterns + Tailwind class lints (non-fatal).
                         S121 Wave 11-T: context-aware brace counters in
                         lint-ghost-patterns.js — factored helpers
                         buildSkipRanges / mergeSkipRanges / findMatchingClose +
                         broadened skipIf coverage; 26 W-LINT false-positives closed.
  Stage 2  [BS]        — Block Splitter; .scrml → Block[]            (block-splitter.js)
  Stage 3  [TAB]       — Typed AST Builder; Block[] → FileAST        (ast-builder.js + tokenizer.ts).
                         C2 — when `--parser=scrml-native` is set the `_buildAST`
                         override routes the per-file parse through the native
                         parser's `nativeParseFile` (parse-file.js) INSTEAD.
  Stage 3.004 [PRECG]  — computePGOFlags + computeProgramConfig; mutates FileAST
                         with has* flags + authConfig + middlewareConfig
  Stage 3.005 [GCP1]   — Gauntlet Phase 1 checks (§21/§41/§7.6)
  Stage 3.006 [GCP3]   — Gauntlet Phase 3 equality checks (§45)
  Stage 3.007 [LINT-TRY-CATCH] — W-TRY-CATCH-IN-SCRML-SOURCE guard
  Stage 3.008 [LINT-ASYNC-USER-SOURCE] — I-ASYNC-USER-SOURCE info lint
  Stage 3.1  [MOD]     — Module Resolution; importGraph + exportRegistry  (module-resolver.js)
  Stage 3.105 [STDLIB-EXPORT-SEED] — seed exportRegistry from stdlib .scrml
  Stage 3.05 [NR]      — Name Resolution (shadow mode in P1)         (name-resolver.ts)
  Stage 3.06 [SYM]     — Symbol Table; state-cell scope tree         (symbol-table.ts)
  Stage 3.2  [CE]      — Component Expander; expands component markup (component-expander.ts)
  Stage 3.3  [VP-2/VP-3/VP-1] — Post-CE validators (invariant / attr-interp / allowlist)
  Stage 4  [PA]        — Protect Analyzer; db-block analysis         (protect-analyzer.ts)
  Stage 5  [RI]        — Route Inference; RouteMap                   (route-inference.ts).
                         S121 Wave 10-P: `walkBodyForTriggers` now collects callees
                         from `EXPR_NODE_CALLEE_FIELDS` (object-shape ExprNode fields,
                         not just string-shape) — closed 20 W-DEAD-FUNCTION false-positives.
  Stage 5.5 [MC]       — Monotonicity Classifier (§19.9.6) + E-CPS-* (monotonicity-analyzer.ts)
  Stage 6  [TS]        — Type System; cross-file type registry       (type-system.ts).
                         S121 Wave 11-S: import-decl scope-chain binding uses
                         `spec.local` (the alias, not the imported name) at L5502 —
                         5 typed-as-alias TS lookups now register correctly.
  Stage 6.4 [LINT]     — I-MATCH-PROMOTABLE info lint                (lint-i-match-promotable.js)
  Stage 6.5 [MC]/[ME]  — Meta Check + Meta Eval                      (meta-checker.ts / meta-eval.ts)
  Stage 7  [DG]        — Dependency Graph (post-meta AST)            (dependency-graph.ts)
  Stage 7.5 [BP]       — Batch Planner (§8.9-§8.11)                  (batch-planner.ts)
  Stage 7.55 [AG]      — Auth Graph derivation (§40)                 (auth-graph.ts)
  Stage 7.6 [RS]       — Reachability Solver; per-EP per-role ChunkPlans (reachability-solver.ts)
  Stage 8  [CG]        — Code Generator; emits server/client/HTML/CSS (code-generator.js → codegen/index.ts)
  Stdlib bundling      — copy runtime shims into <out>/_scrml/*.js.
                         S121 Bug 8: 13 new top-level shims (cron / format / fs /
                         http / oauth / path / process / redis / regex / router /
                         test / time / compiler) + W-STDLIB-SHIM-MISSING catalog
                         row; the scrml:compiler family bypasses SHIM-MISSING and
                         surfaces W-STDLIB-COMPILER-DEFERRED instead (Wave 8-F).
  Output write loop    — F-COMPILE-001 Option A preserved source tree; per-route chunk writes

## The M5 Pipeline-Swap Seam (C2 — routed)
- Live front-end: BS (block-splitter.js) + TAB (ast-builder.js + tokenizer.ts) + BPP
  + Acorn-driven `parseExprToNode`. Output: `TABOutput { filePath, ast: FileAST, errors }`.
- `--parser=scrml-native` (C2, S119) ROUTES the per-file TAB stage through the native
  parser's `nativeParseFile` (parse-file.js) instead of the live `buildAST`. The flag
  is strictly OPT-IN (`parser` defaults to `null`); every other caller runs the
  untouched live BS+TAB path. api.js also emits one I-PARSER-NATIVE-SHADOW info
  diagnostic per native-routed compile (api.js:1857). BS still runs (its `bsResults`
  feed the GCP1 raw-block-tree check); the native path simply re-parses from source.
- `nativeParseFile` returns the SAME `{ filePath, ast: FileAST, errors }` shape, so
  every downstream stage (PRECG / GCP1 / GCP3 / NR / RI / AG / CG) runs unchanged.
- The native parser produces SEPARATE catalogs (Token[], Stmt[] 20 kinds, Expr 40
  ExprKinds, Block[]). The bridge layer + C1 assembler compose them into the FileAST:
    - translate-stmt.js (R1)  — native Stmt[] → live LogicStatement[].
    - translate-expr.js (A2)  — native Expr → live ExprNode.
    - collect-hoisted.js (A3) — native Block[] → imports/exports/typeDecls/components/
      machineDecls/channelDecls/hasProgramRoot; SYNTHESIZES declaration node shapes.
      Exports isEngineBlock + synthEngineDecl.
    - parse-file.js (C1)      — `nativeParseFile` — composes parseMarkupTrace + the
      three bridges into the live FileAST; 12 per-BlockKind synth* builders as of
      S121 P5-7 (synthMatchBlockNode added for `match-block` ASTNode parity); one
      shared `idGen`.
- Stage 3.004 (PRECG) was relocated S115 out of TAB precisely so a swapped-in native
  parser does not have to learn codegen-optimizer caches: computePGOFlags +
  computeProgramConfig run pipeline-agnostically against the top-level node stream.
- Dual-pipeline canary (compiler/tests/parser-conformance/dual-pipeline-canary.js) —
  the C2 proof instrument: runs LIVE and NATIVE on a source, structurally diffs the
  two FileASTs along the top-level + RECURSIVE node-kind sequences + 6 hoist counts +
  hasProgramRoot + diagnostic streams. `classifyDivergence` tags
  EXACT / DIFF-top-seq / DIFF-deep-seq / DEFERRAL-* / LIVE-DEGENERATE / LIVE-PHANTOM
  (S121 Wave 6-B) / LIVE-HOIST-MISCLASSIFY (S121 Wave 9-H). Wave 8-G lowered the
  LIVE-DEGENERATE ratio guard 3.0x → 1.5x with 14 added tests.
- M5 swap scope docs: compiler/native-parser/M5-ast-bridge-scoping.md (divergence
  inventory + cost estimate), M5-divergence-ledger.md (clean-parse coverage),
  M5-SWAP-residual-decomposition.md (re-scoped residual unit decomposition).
- C2 gap-ledger docs:
    docs/changes/m5-c2-gap-ledger/investigation-2026-05-22.md — dual-pipeline-canary
      divergence sizing (261/1000 corpus files diverge; two dominant classes).
    docs/changes/m5-c2-gap-ledger/phase4-triage-2026-05-22.md — Phase 4 triage.
    docs/changes/m5-c2-gap-ledger/phase5-triage-2026-05-22.md — Phase 5 triage of
      the 51-gap residual post-P4; roots the 9 P5 fix units (S120); gap closed 51→15.
    docs/changes/m5-c2-gap-ledger/phase5-retriage-s121-2026-05-22.md — S121 Phase 5
      re-triage; residual 16 against current source after S120 wrap.
    docs/changes/m5-c2-gap-ledger/p5-14-deferral-2026-05-22.md — P5-14 deferral memo.
    docs/changes/m5-c2-gap-ledger/gap-neb-survey-s121-2026-05-22.md — GAP-NEB survey.
    docs/changes/m5-c2-gap-ledger/w-dead-function-survey-s121-2026-05-22.md — Wave 10-P
      RI-walker false-positive survey; 20/20 W-DEAD-FUNCTION fires were FP, fixed in Wave 10-P.
    docs/changes/m5-c2-gap-ledger/post-w10-p-residual-survey-s121-2026-05-22.md — final
      S121 residual survey: 51 fires (NOT 76 as initially counted), 3 real bugs,
      42 compiler-FP, 6 spec-correct.

## v0.7 M5-swap progress (S117-S121)
- R1 (S117) — statement-catalog bridge landed.
- R4 (S117) — SPEC §34.1 native-parser parse-diagnostics catalog seeded (66 codes).
- A2 (S118) — expression-catalog bridge landed.
- F4 (S118) — SpanTable retired (zero-consumer dead structure).
- B1-B7 (S118) — native-parser scrml-extension + core-keyword productions: B1 `?`
  propagate, B2 `!{}` guarded-expr, B3 `~`-decl, B4 `lin`, B5 `type`, B6
  `fn`/`server`/`pure` modifiers, B7 `throw`/`try` forbidden-vocab rejection.
  §34.1 grew 66→79 diagnostic codes.
- A3 (S119) — declaration/hoist synthesis landed; `typeDecls`/`components`/
  `machineDecls` synthesized by collect-hoisted.
- C1 (S119) — `nativeParseFile` FileAST assembler landed (parse-file.js).
- C2 (S119) — native-parser ROUTING swap: `--parser=scrml-native` routes the TAB
  stage through `nativeParseFile`; dual-pipeline canary landed; §34.1 +2 info codes
  (`I-NATIVE-BLOCK-DROPPED` / `I-NATIVE-BLOCK-UNMAPPED`) → 81 codes.
- M5 gap-ledger Phase 4 (S119) — synthStateNode (P1), segmentation fixes + engine-in-nodes
  (P3), HTML void-element support (tag-frame VOID_ELEMENTS), recursive-diff canary
  axis, no-space `<db>`/`<schema>` state recognition. Gap: 261→51.
- M5 gap-ledger Phase 5 (S120) — 9 fix units (P5-1..P5-13) closed the 51-gap residual
  down to 15. P5-9 introduced `CONTEXTUAL_KEYWORDS`; P5-12 hardened opener-scan;
  P5-13 fixed brace-in-string skip.
- S121 (Waves 4-11) — gap-ledger / corpus-sweep / lint hardening:
    Wave 5 (P5-12b, P5-14 v2): `isStateTagBoundaryAfterLt` tightened;
      `closeTagFrame { allowMismatchPop }` + slice-mode flag.
    Wave 6 (P5-A, B): admit `_` as tag-name-start per SPEC §4.1;
      LIVE-PHANTOM canary class — credit native correctness when live admits malformed
      `< Ident>` state opener.
    Wave 7 (C, E): typed-decl `:type` annotation consume; scrml:compiler shim
      resolution survey memo (Option (d) recommended).
    Wave 8 (F, G): scrml:compiler deferral hardening — 13 thunks + §41.17 NEW +
      W-STDLIB-COMPILER-DEFERRED row; lower LIVE-DEGENERATE ratio guard 3.0x → 1.5x.
    Wave 9 (H, I, J): LIVE-HOIST-MISCLASSIFY canary class; 36-site `is not not` →
      `is some` migration; P5-7 match-block FileAST synthesis (the HEAVY unit;
      closes the final parser-side residual).
    Wave 10 (K, L, M, N, P): in-mirror `fn`→`function` (parse-markup.scrml 8 sites);
      4 sibling body-parsers `fn`→`function`; display-text-literal.scrml
      `===`→`==` / `null`→`is not`; doc-comment realignment; RI walker
      walkBodyForTriggers extended for EXPR_NODE_CALLEE_FIELDS.
    Wave 11 (R, S, T, Q): display-text-literal.scrml final 2 `null`→`not` sites;
      type-system import-decl scope-chain `spec.local` fix; lint context-aware
      brace counters (26 W-LINT FP closed); post-W10-P residual survey memo.

## Native Parser Charter (charter B, S111)
Replaces the WHOLE front-end — block-splitter, Acorn layer, BPP, statechild
re-tokenizers. M-ladder: M1 (lexer, COMPLETE) → M2 (expr) → M3 (stmt) →
M4 (full JS subset) → MK1-MK4 (markup) → M5 (pipeline swap behind
`--parser=scrml-native` — C1/C2 landed S119) → M6 (joint retirement; BS+Acorn+BPP
deleted). Composed-engines architecture: every state-shape construct points to an
`<engine>` (Pillar 5b discipline). .scrml files carry canonical SHAPE; 1:1 .js
shadow files carry the executable surface (M4+ swap-in concession).

## Business Invariants
- scrml SOURCE has no exceptions / no try-catch (§19.1) — values-not-exceptions.
  The native parser's B7 production REJECTS `throw`/`try` with E-THROW-NOT-IN-SCRML /
  E-TRY-NOT-IN-SCRML; translate-stmt.js treats `Throw`/`Try` as forbidden-vocab kinds.
- `null` and `undefined` do not exist in scrml; both map to `not`. `""` / `0` /
  `false` / `[]` / `{}` are DEFINED values, not absence (memory S89, absolute).
- No async/await in scrml SOURCE (memory: standing rule); body-split is the async
  shape, not user-visible async; `!{}` is the call-site error handler, distinct
  from body-split and from try/catch (memory: error-model distinction).
- Production builds are bit-identical with testMode disabled (§19.12.7 0-byte cost).
- The native parser is NOT a port and NOT the v1.0 self-host; Acorn is the
  conformance ORACLE, never the design template.
- Native FileAST id discipline: `nativeParseFile` threads ONE `idGen` `{ next }`
  counter through every synthesizer + collectHoisted + every translateStmtList call —
  globally-unique node ids in the file (the live ast-builder discipline).
- §58 Build Story: given the same `(source, buildStory)` pair, any party can
  reconstruct the exact compiler and produce a bit-identical artifact. SPEC-AHEAD —
  no implementation exists; §58.12 enumerates the unproven `*` guarantees.

## Aggregates / Key Modules
api.js               — pipeline orchestrator; `compileScrml`
codegen/index.ts     — Stage 8 sub-pipeline; `runCG` → ~55 emit-* modules
reachability-solver.ts — Stage 7.6; delegates to reachability/component-1..5
native-parser/lex.js — composed-engines lexer entry; 7 LexMode dispatchers
native-parser/parse-stmt.js / parse-expr.js / parse-markup.js — the three parsers
native-parser/{translate-stmt,translate-expr,collect-hoisted}.js — native→live bridge
native-parser/parse-file.js — `nativeParseFile` — the C1 FileAST assembler
                              (synthMatchBlockNode added S121 P5-7)
lint-ghost-patterns.js — ghost-pattern lint walker; context-aware brace counters
                         (S121 Wave 11-T factored helpers)
route-inference.ts (walkBodyForTriggers) — Stage 5 trigger/callee walker;
                         EXPR_NODE_CALLEE_FIELDS extension (S121 Wave 10-P)
type-system.ts (TS scope-chain) — Stage 6; import-decl `spec.local` binding
                         (S121 Wave 11-S)

## Tags
#scrmlts #map #domain #pipeline #native-parser #m5-swap #compiler #build-story #s121

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [schema.map.md](./schema.map.md)
