# error.map.md
# project: scrmlts
# updated: 2026-05-21T15:00:00Z  commit: 67a17dc5

scrml's own language error model is values-not-exceptions (SPEC §19.1 — no
try/catch, no exceptions in scrml SOURCE). The entries below are the COMPILER's
own (host-side, JavaScript/TypeScript) diagnostic infrastructure.

## Per-Stage Diagnostic Classes
Each pipeline stage carries its own diagnostic class; all share a common shape
({ code, message, span/severity }) collected uniformly by `collectErrors` in api.js.

BSError       — compiler/src/block-splitter.js:59 — Stage 2 (Block Splitter); extends native Error; stores span as `bsSpan` (lifted to `span` by api.js)
TABError      — compiler/src/ast-builder.js:1232 — Stage 3 (Typed AST Builder); extends native Error
ModuleError   — compiler/src/module-resolver.js:33 — Stage 3.1 (module resolution)
GauntletError — compiler/src/gauntlet-phase1-checks.js:44 — Gauntlet Phase 1 checks
PAError       — compiler/src/protect-analyzer.ts:126 — Stage 4 (Protect Analyzer)
RIError       — compiler/src/route-inference.ts:326 — Stage 5 (Route Inference)
TSError       — compiler/src/type-system.ts:516 — Stage 6 (Type System)
MetaError     — compiler/src/meta-checker.ts:67 — Stage 6.5 (Meta Checker)
MetaEvalError — compiler/src/meta-eval.ts:49 — Stage 6.5 (Meta Eval)
DGError       — compiler/src/dependency-graph.ts:233 — Stage 7 (Dependency Graph)
CGError       — compiler/src/codegen/errors.ts:11 — Stage 8 (Code Generator); { code, message, span, severity }

## Runtime Error Classes (emitted INTO user output)
compiler/src/runtime-template.js — scrml runtime error hierarchy embedded in
generated apps, all extending `_ScrmlError`:
NetworkError [2028] | ValidationError [2036] | SQLError [2044] | AuthError [2052] |
TimeoutError [2060] | ParseError [2068] | NotFoundError [2076] | ConflictError [2084]

## Error Handling Patterns
- collectErrors(stageName, errors, filePath?) — api.js:598 — normalizes every
  stage's diagnostics, stamps filePath, lifts BSError `bsSpan`→`span`, pushes to
  `allErrors`.
- Diagnostic-stream partition — api.js:1874 — `isNonFatal(e)` routes
  W-*/I- prefixed or severity warning/info to `result.warnings`; everything else
  to `result.errors` (CLI exits 1 on a non-empty errors array).
- Per-stage try/catch in api.js wraps BS and the TS-promote capture hook only
  (2 catch sites); pipeline stages otherwise return diagnostics as values.

## Error Code Families (count of code-prefix references in compiler/src)
Spec-catalogued codes (SPEC §34 is normative). Highest-volume families:
E-ENGINE (269) | E-TYPE (159) | E-DERIVED (106) | E-LIN (75) | E-FN (74) |
E-COMPONENT (71) | E-IMPORT (68) | E-META (64) | E-SCOPE (54) | E-CG (54) |
E-TABLEFOR (53) | E-STATE (51) | E-SYNTAX (50) | E-CHANNEL (50) | E-AUTH (47) |
E-CLOSURE (46) | E-PA (45) | E-MATCH (44) | E-CPS (40) | E-ATTR (40) |
E-FORMFOR (37) | E-VARIANT (35) | E-TEST (35) | E-CONTRACT (35) | E-EQ (33) | …
Warnings: W-CG (57) | W-LINT (55) | W-AUTH (54). Info: I-PARSER-NATIVE-SHADOW,
I-MATCH-PROMOTABLE, I-ASYNC-USER-SOURCE, I-AUTH-REDIRECT-UNRESOLVED.

## Global Error Boundaries
No host-side global error boundary — the compiler is a batch process; fatal
errors surface via `result.errors` and a non-zero CLI exit. Generated apps
embed `_ScrmlError`-based runtime handling per SPEC §19.

## Unhandled Error Risks
- api.js BS-stage catch (api.js:697) swallows non-BSError throws into a generic
  E-BS-000 with no span — a native-parser crash under M5 routing would land here
  without source attribution unless the swap brief adds a typed catch.
- Lint pre-passes silently swallow unreadable-file errors (api.js:674) — by
  design; BS reports the real read error.

## Tags
#scrmlts #map #error #diagnostics #pipeline

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
