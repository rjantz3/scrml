# error.map.md
# project: scrmlts
# updated: 2026-05-23T09:52:00-06:00  commit: c2d93544

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

## Native-Parser Parse Diagnostics (SPEC §34.1)
SPEC §34.1 catalogs the diagnostics emitted by the native parser
(compiler/native-parser/) — the recursive-descent front-end that replaces the
legacy block-splitter + Acorn pipeline at the M5 swap. As of HEAD this catalog
holds 81 codes: 79 hard `E-` errors + 2 info-level `I-NATIVE-BLOCK-*` codes
(S117 R4 seeded 66; S118 B-waves appended 13; S119 C2 appended 2 info codes;
S121 added no new §34.1 codes; **S122 added no new §34.1 codes** — the new
S122 W-/I-* code (`I-FN-PROMOTABLE`) lives in §34 + §56.9, not §34.1).
B-wave error codes (S118):
  E-STMT-LIN-NAME / E-STMT-LIN-INIT          — B4, `lin` declaration grammar
  E-STMT-TYPE-NAME / E-STMT-TYPE-KIND / E-STMT-TYPE-UNCLOSED — B5, `type` declaration
  E-STMT-FN-KEYWORD / E-STMT-FN-NAME / E-STMT-FN-ERROR       — B6, `fn`/`server`/`pure`
  E-STMT-TILDE-NAME / E-STMT-TILDE-INIT      — B3, `~` tilde-declaration
  E-EXPR-GUARDED-UNCLOSED                    — B2, `!{}` guarded-expression
  E-THROW-NOT-IN-SCRML / E-TRY-NOT-IN-SCRML  — B7, forbidden-vocabulary rejection
B1 (`?` propagate) added a production but no new code — a malformed ternary still
surfaces E-EXPR-TERNARY-COLON.
FileAST-assembler info codes (S119 C2 — emitted by `nativeParseFile`,
compiler/native-parser/parse-file.js):
  I-NATIVE-BLOCK-DROPPED   — a native BlockKind with no live ASTNode (`Test` /
                             `ForeignCode`) was dropped from `FileAST.nodes`.
  I-NATIVE-BLOCK-UNMAPPED  — a BlockKind not in the BlockKind→ASTNode map was
                             encountered and dropped (forward-compat guard).
Both are info-level (`severity:"info"`) — non-fatal, partition into `result.warnings`.
§34.1 is the surviving home of the parse-diagnostic family once M6 deletes the
legacy pipeline.

## Stdlib-Shim Warnings (SPEC §34 — S121 Bug 8 + Wave 8-F)
W-STDLIB-SHIM-MISSING       — SPEC §34 (S121 Bug 8 close) — emitted by api.js's
                              `bundleStdlibForRun` when an adopter
                              `import { ... } from "scrml:NAME"` references a
                              stdlib module with no runtime shim at
                              `compiler/runtime/stdlib/<name>.js`. The literal
                              `scrml:NAME` survives the import-rewrite (per
                              `rewriteStdlibImports`'s loud-failure-preserved
                              contract) and the emitted JS will fail at runtime
                              when Node's resolver rejects the `scrml:` scheme —
                              surfaced at compile time as this warning so the gap
                              is visible before deploy. Exception: the
                              `scrml:compiler*` family is reclassified to
                              W-STDLIB-COMPILER-DEFERRED per §41.17.
W-STDLIB-COMPILER-DEFERRED  — SPEC §34 + §41.17 NEW (S121 Wave 8-F close) —
                              emitted by `bundleStdlibForRun` for any name
                              matching `name === "compiler" || name.startsWith("compiler/")`.
                              Fires whether the thunk shim is on disk or not —
                              the deferral is a property of the family surface.
                              Each per-stage thunk also throws at call time with
                              attribution naming the importing module, this catalog
                              row, and the survey memo
                              `docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md`.

## Promotion / Info Lints (SPEC §34 + §56)
I-MATCH-PROMOTABLE          — SPEC §34 + §56.2 — Stage 6.4 info lint emitted by
                              `compiler/src/lint-i-match-promotable.js`; surfaces
                              promotable plain-match→match-block opportunities.
I-FN-PROMOTABLE             — SPEC §34 + §56.9 NEW (S122 Unit EE close) — Stage 6.4b
                              info lint emitted by NEW
                              `compiler/src/lint-i-fn-promotable.js`; sibling to
                              `I-MATCH-PROMOTABLE`. Surfaces `function`-keyword
                              declarations whose body satisfies the §48.3 fn-body
                              prohibitions (no `?{}` SQL, no DOM mutation, no
                              outer-scope mutation incl. no `@`-cell writes, no
                              non-deterministic calls, no `async`/`await`, no `lift`
                              past the fn boundary) — eligible for one-keyword rename
                              to `fn` (≡ `pure function` per §48.11). Structurally
                              skipped for `async`/`server`/generator/failable/`handle()`
                              functions (§56.9.1 skip-list). Informational only;
                              declarations pre-S122 continue to compile cleanly.
                              Consumed via `allLintDiagnostics` channel post-TS as
                              Stage 6.4b in `compiler/src/api.js` (L1556).

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
- Native-parser modules record errors as VALUES — `recordError(ctx, code, message,
  span)` in parse-stmt.js / parse-expr.js appends to a context error array; no throws.
  `nativeParseFile` folds `ctx.diagnostics` (the markup-run parse-error stream) plus
  any synthesis-side `I-NATIVE-BLOCK-*` info diagnostics into its result `errors` array.
- scrml:compiler thunk shims throw at call time with a multi-line attribution —
  loud-failure-with-attribution, not silent breakage (Wave 8-F).
- Info-lint pattern: `lint-i-match-promotable.js` and `lint-i-fn-promotable.js`
  (NEW S122) both walk the post-TS AST, build `{ code, message, span, severity:"info" }`
  diagnostics, return as an array, and merge into `allLintDiagnostics` for the
  diagnostic-stream partition to route into `result.warnings`.

## Error Code Families (host-side, count of code-prefix references in compiler/src)
Spec-catalogued codes (SPEC §34 is normative). Highest-volume families:
E-TYPE (159) | E-ENGINE (118) | E-LIN (75) | E-FN (74) | E-DERIVED (106) |
E-COMPONENT (71) | E-IMPORT (68) | E-META (64) | E-SCOPE (54) | E-CG (54) |
E-TABLEFOR (53) | E-STATE (51) | E-SYNTAX (50) | E-CHANNEL (50) | E-AUTH (47) |
E-CLOSURE (46) | E-PA (45) | E-MATCH (44) | E-CPS (40) | E-ATTR (40) | …
E-NAME-COLLIDES-STATE (§34) — S122 Unit Z added did-you-mean hint on let-decl collisions.
Warnings: W-CG | W-LINT | W-AUTH | W-STORY (§58 — W-STORY-ON-TOP-LEVEL) |
  W-STDLIB-SHIM-MISSING (S121) | W-STDLIB-COMPILER-DEFERRED (S121) |
  W-DEAD-FUNCTION (S121 Wave 10-P walker FP-class — surfaced by route-inference;
  S122 Wave 13 Unit Y extended the walker to Trigger 1/2 EXPR_NODE field-scan,
  sister fix to W10-P) |
  W-LINT-013 (S122 Wave 14 Unit AA scope-gated — now fires only inside markup-attribute
  opener position; Vue `@click` false-positive closed).
Info: I-PARSER-NATIVE-SHADOW, I-NATIVE-BLOCK-DROPPED, I-NATIVE-BLOCK-UNMAPPED,
I-MATCH-PROMOTABLE, **I-FN-PROMOTABLE** (S122 Unit EE NEW), I-ASYNC-USER-SOURCE,
I-AUTH-REDIRECT-UNRESOLVED.

## Global Error Boundaries
No host-side global error boundary — the compiler is a batch process; fatal
errors surface via `result.errors` and a non-zero CLI exit. Generated apps
embed `_ScrmlError`-based runtime handling per SPEC §19.

## Unhandled Error Risks
- api.js BS-stage catch (api.js:697) swallows non-BSError throws into a generic
  E-BS-000 with no span. The C2 native path runs `nativeParseFile` at the TAB
  stage (api.js:744, inside `stage("TAB", ...)`) — a native-parser crash under
  `--parser=scrml-native` lands in the TAB stage wrapper, not the BS catch.
- Lint pre-passes silently swallow unreadable-file errors (api.js:674) — by
  design; BS reports the real read error.
- M6 Wave 1 consumer migrations (meta-eval Unit M6.1; emit-match Unit M6.3): the
  new `nativeParseFile` call-sites participate in the TAB-stage wrapper's
  error-as-value contract; per-arm bare-body re-parse errors (M6.3) surface via
  the consumer's own diagnostic channel.

## Tags
#scrmlts #map #error #diagnostics #pipeline #native-parser #stdlib-shims #i-fn-promotable

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
