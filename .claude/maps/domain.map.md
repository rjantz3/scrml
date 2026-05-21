# domain.map.md
# project: scrmlts
# updated: 2026-05-21T15:00:00Z  commit: 67a17dc5

The domain is the scrml COMPILER pipeline. scrml is a single-file, full-stack
reactive web language; the compiler splits server from client, wires reactivity,
routes HTTP, and emits HTML/CSS/JS. Normative authority: compiler/SPEC.md (57
sections) + compiler/PIPELINE.md. Per pa.md Rule 4, SPEC.md is normative.

## Core Concepts
FileAST            — typed AST for one .scrml file; the central data structure
                     (compiler/src/types/ast.ts:1487). Output of TAB.
Pipeline stage     — a discrete transform; each has its own diagnostic class and
                     an optional `selfHostModules` override slot.
selfHostModules    — optional overrides letting compiled-scrml modules replace
                     JS pipeline stages (splitBlocks / buildAST / runPA / runRI /
                     resolveModules / runTS / runMetaChecker / runDG / runCG / bpp).
Native parser      — the in-progress scrml-native composed-engines front-end
                     (compiler/native-parser/); replaces BS + Acorn + BPP + the
                     statechild re-tokenizers per charter B (S111).

## Pipeline Stages — orchestrated by `compileScrml` in compiler/src/api.js
The full chain (api.js stage labels in brackets):

  Auto-gather pre-pass — expand inputFiles to transitive .scrml import closure (§21.7)
  Ghost-lint pre-pass  — lintGhostPatterns + Tailwind class lints (non-fatal)
  Stage 2  [BS]        — Block Splitter; .scrml → Block[]            (block-splitter.js)
  Stage 3  [TAB]       — Typed AST Builder; Block[] → FileAST        (ast-builder.js + tokenizer.ts)
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
  Stage 5  [RI]        — Route Inference; RouteMap                   (route-inference.ts)
  Stage 5.5 [MC]       — Monotonicity Classifier (§19.9.6) + E-CPS-* (monotonicity-analyzer.ts)
  Stage 6  [TS]        — Type System; cross-file type registry       (type-system.ts)
  Stage 6.4 [LINT]     — I-MATCH-PROMOTABLE info lint                (lint-i-match-promotable.js)
  Stage 6.5 [MC]/[ME]  — Meta Check + Meta Eval                      (meta-checker.ts / meta-eval.ts)
  Stage 7  [DG]        — Dependency Graph (post-meta AST)            (dependency-graph.ts)
  Stage 7.5 [BP]       — Batch Planner (§8.9-§8.11)                  (batch-planner.ts)
  Stage 7.55 [AG]      — Auth Graph derivation (§40)                 (auth-graph.ts)
  Stage 7.6 [RS]       — Reachability Solver; per-EP per-role ChunkPlans (reachability-solver.ts)
  Stage 8  [CG]        — Code Generator; emits server/client/HTML/CSS (code-generator.js → codegen/index.ts)
  Stdlib bundling      — copy runtime shims into <out>/_scrml/*.js
  Output write loop    — F-COMPILE-001 Option A preserved source tree; per-route chunk writes

## The M5 Pipeline-Swap Seam (load-bearing for the next dispatch)
- Live front-end: BS (block-splitter.js, ~2055 LOC) + TAB (ast-builder.js,
  ~12880 LOC + tokenizer.ts ~1607 LOC) + BPP + Acorn-driven `parseExprToNode`.
  Output: `TABOutput { filePath, ast: FileAST, errors }`.
- `--parser=scrml-native` at HEAD is OBSERVABILITY-ONLY: api.js:1835 emits a
  single I-PARSER-NATIVE-SHADOW info diagnostic and changes NO pipeline behavior.
  The native parser is NOT routed downstream.
- The native parser today produces SEPARATE catalogs that do NOT form a FileAST:
  lex.js → Token[]; parse-stmt.js parseProgram → Stmt[] (20 StmtKinds);
  parse-expr.js → Expr (37 ExprKinds); parse-markup.js parseMarkup → flat
  BlockNode[] (11 BlockKinds). No imports/exports/components/typeDecls/spans/
  has*-flags/authConfig/middlewareConfig.
- M5 swap scope is documented at compiler/native-parser/M5-ast-bridge-scoping.md
  (the divergence inventory + cost estimate) and M5-divergence-ledger.md (what
  the native parser parses cleanly today). The bridge to make a real swap
  possible was cost-deferred at M5.1 close (estimated 70h+ / 80-120h).
- Stage 3.004 (PRECG) was relocated S115 out of TAB precisely so a swapped-in
  native parser does not have to learn codegen-optimizer caches: computePGOFlags
  + computeProgramConfig run pipeline-agnostically against the top-level node
  stream, whatever produced it.

## Native Parser Charter (charter B, S111)
Replaces the WHOLE front-end — block-splitter, Acorn layer, BPP, statechild
re-tokenizers. M-ladder: M1 (lexer, COMPLETE) → M2 (expr, in flight) →
M3 (stmt) → M4 (full JS subset) → MK1-MK4 (markup) → M5 (pipeline swap behind
`--parser=scrml-native`) → M6 (joint retirement; BS+Acorn+BPP deleted).
Composed-engines architecture: every state-shape construct points to an
`<engine>` (Pillar 5b discipline). .scrml files carry canonical SHAPE; 1:1 .js
shadow files carry the executable surface (M4+ swap-in concession).

## Business Invariants
- scrml SOURCE has no exceptions / no try-catch (§19.1) — values-not-exceptions.
- `null` and `undefined` do not exist in scrml; both map to `not`. `""` / `0` /
  `false` / `[]` / `{}` are DEFINED values, not absence (memory S89, absolute).
- Production builds are bit-identical with testMode disabled (§19.12.7 0-byte cost).
- The native parser is NOT a port and NOT the v1.0 self-host; Acorn is the
  conformance ORACLE, never the design template.

## Aggregates / Key Modules
api.js               — pipeline orchestrator; `compileScrml`
codegen/index.ts     — Stage 8 sub-pipeline; `runCG` → ~55 emit-* modules
reachability-solver.ts — Stage 7.6; delegates to reachability/component-1..5
native-parser/lex.js — composed-engines lexer entry; 7 LexMode dispatchers

## Tags
#scrmlts #map #domain #pipeline #native-parser #m5-swap #compiler

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [structure.map.md](./structure.map.md)
