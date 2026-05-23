# primary.map.md
# project: scrmlts
# updated: 2026-05-23T00:00:00-06:00  commit: 136678e5

## Project Fingerprint
Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3196 git-tracked files
Watermark:  HEAD 136678e5 (2026-05-23) — package.json v0.6.0 — S121 wrap

## Map Index
| Map                  | Status  | Contents                                            |
|----------------------|---------|-----------------------------------------------------|
| structure.map.md     | present | directory layout, entry points, native-parser, stdlib |
| dependencies.map.md  | present | 2 root + 2 compiler runtime deps, stdlib shim layout |
| schema.map.md        | present | FileAST / ASTNode / native catalogs / match-block   |
| config.map.md        | present | 2 env vars, compiler option flags                   |
| build.map.md         | present | bun scripts, CLI subcommands, git hooks             |
| error.map.md         | present | 11 stage classes, §34.1 81-code catalog + W-STDLIB-* |
| test.map.md          | present | bun test, 732 test files, parser-conformance + canary |
| domain.map.md        | present | 25-stage pipeline, M5 swap seam, S121 progress       |
| api.map.md           | absent  | no HTTP API surface (compiler, not a server)        |
| state.map.md         | absent  | no app state store (compiler)                       |
| events.map.md        | absent  | no event bus                                        |
| auth.map.md          | absent  | auth is a scrml LANGUAGE feature, not app infra     |
| migrations.map.md    | absent  | no DB migration tooling (test *.db throwaway)       |
| jobs.map.md          | absent  | no job/queue scheduler                              |
| infra.map.md         | absent  | no Docker / CI / IaC                                |
| style.map.md         | absent  | no design-token system                              |
| i18n.map.md          | absent  | no i18n                                             |

## File Routing
types / AST shapes / native catalogs   → schema.map.md
pipeline stages / native parser / M5   → domain.map.md
native-parser layout / assembler / stdlib shim layout → structure.map.md
compiler option flags / env vars       → config.map.md
build commands / CLI / git hooks       → build.map.md
test layout / parser-conformance / canary classes → test.map.md
external packages / module graph / shim catalog → dependencies.map.md
diagnostic classes / error codes / W-STDLIB-* → error.map.md

## Task-Shape Routing (agents — read this section first)

This is a compiler project. Task shapes below reflect what S121 actually saw —
native-parser fixes dominate, with lint-walker, type-system, and stdlib-shim
authoring as significant secondary classes.

**Native-parser bug fix** (e.g., gap-ledger residual, dual-pipeline canary
divergence, parse-X handling, FileAST synthesis):
1. `structure.map.md` (Native-Parser Layout section) — module ownership + mirror discipline
2. `schema.map.md` — FileAST contract + native catalogs + bridge layer
3. `domain.map.md` (M5 swap section + S121 wave progression) — recent fix patterns
4. `test.map.md` — parser-conformance + dual-pipeline-canary harness

**Lint-walker change** (e.g., W-LINT false-positive, new ghost-pattern, walker
context-awareness):
1. `domain.map.md` (Ghost-lint pre-pass + Stage 5/6 walker entries) — what the walker does
2. `structure.map.md` — module locations (`lint-ghost-patterns.js`, `route-inference.ts`)
3. `error.map.md` — W-* code families
4. `test.map.md` — regression-test pattern for walker changes

**Type-system change** (e.g., scope-chain binding, import alias, TS L5502-shape):
1. `domain.map.md` (Stage 6 [TS] + Wave 11-S Memory) — TS scope-chain rules
2. `schema.map.md` — type/AST shape the binding consumes
3. `error.map.md` — TSError + E-TYPE family

**Stdlib-shim authoring** (e.g., new scrml:NAME bundling, W-STDLIB-* surface):
1. `dependencies.map.md` (Stdlib runtime shim layout) — shim file convention + catalog rows
2. `structure.map.md` (compiler/runtime/) — directory layout (top-level vs subdir)
3. `error.map.md` — W-STDLIB-SHIM-MISSING + W-STDLIB-COMPILER-DEFERRED
4. `domain.map.md` (Stdlib bundling stage) — bundleStdlibForRun contract

**Spec amendment** (e.g., SPEC.md §X.Y update, §34 catalog row, §41.17-style new section):
1. `domain.map.md` (Core Concepts + Business Invariants) — surrounding context
2. `error.map.md` — if the amendment touches a code family
3. `schema.map.md` — if the amendment touches a node shape
4. `structure.map.md` (Compiler Spec / Pipeline References) — SPEC anchor location

**Test authoring** (e.g., parser-conformance, dual-pipeline-canary, regression for
a fix):
1. `test.map.md` — runner + fixture + pattern + parser-conformance suite layout
2. `domain.map.md` — what the test exercises (Stage X / native swap / etc.)
3. `schema.map.md` if asserting on AST shapes; `error.map.md` if asserting on codes

**Codegen change** (Stage 8 [CG], emit-* modules):
1. `structure.map.md` (codegen/ subdir) — emit module locations
2. `schema.map.md` (Codegen I/O Types CgInput / CgOutput) — contract
3. `domain.map.md` (Stage 8 [CG] entry) — what runCG does
4. `dependencies.map.md` (codegen → emit-* graph)

**Don't know which** (e.g., open-ended task brief from user):
1. Read `primary.map.md` (this file) in full
2. Read the **Task-Shape Routing** section above and self-classify
3. If the classification is genuinely unclear, surface to PA before consuming further context

## Use feedback loop

When this map's content was load-bearing for a dispatch outcome, the agent's final
report should note **"map content consulted: [list of map files]; load-bearing
finding: [one sentence]"**. When the map content was NOT useful, report **"maps
consulted but not load-bearing"** so PA can diagnose whether the wrong maps were
named in the brief OR the map content is at the wrong granularity (PA-side fix).
3-5 consecutive "not load-bearing" reports on the same task shape trigger a
map-design review.

## Key Facts
- `compileScrml(options)` in compiler/src/api.js is the pipeline orchestrator —
  a 25-stage chain BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG.
- M5-swap C2 IS LANDED (S119): `--parser=scrml-native` now ROUTES the per-file TAB
  stage through the native parser's `nativeParseFile` (compiler/native-parser/
  parse-file.js) instead of the live `buildAST`. api.js:729-736 is the `_buildAST`
  override; api.js:1857 emits I-PARSER-NATIVE-SHADOW. Strictly opt-in — `parser`
  defaults to `null`; every other caller runs the untouched live BS+TAB path.
- `nativeParseFile` (C1, parse-file.js, 1023 LOC) is the FileAST assembler — the
  drop-in analogue of `buildAST`. It composes `parseMarkupTrace` + the three bridges
  (translate-stmt R1, translate-expr A2, collect-hoisted A3) into the live `FileAST`
  shape, with 12 per-BlockKind synthesizers (S121 P5-7 added `synthMatchBlockNode`
  for `match-block` ASTNode parity) and one shared `idGen`. `authConfig`/
  `middlewareConfig` set to `null` — PRECG (Stage 3.004) derives them downstream.
- M5 C2 gap-ledger Phase 5 progression: S120 closed 51→15 (P5-1..P5-13). S121
  closed the heavy match-block synthesis (P5-7 / Wave 9-J), tightened the state-tag
  boundary (P5-12b / Wave 5), admitted `_` as tag-name-start (Wave 6-A), and stood
  up two new dual-pipeline canary classes (LIVE-PHANTOM Wave 6-B / LIVE-HOIST-MISCLASSIFY
  Wave 9-H) plus relaxed the LIVE-DEGENERATE ratio guard 3.0x→1.5x (Wave 8-G).
- Three host-side lint/walker fixes landed S121 with regression tests:
  Wave 10-P route-inference walkBodyForTriggers extended for EXPR_NODE_CALLEE_FIELDS
  (20 W-DEAD-FUNCTION FPs closed); Wave 11-S type-system import-decl scope-chain
  uses `spec.local` (alias, not imported name); Wave 11-T lint-ghost-patterns
  context-aware brace counters via factored helpers buildSkipRanges /
  mergeSkipRanges / findMatchingClose (26 W-LINT FPs closed).
- scrml:compiler stdlib family is KNOWN-DEFERRED (SPEC §41.17 NEW, S121 Wave 8-F) —
  13 per-stage thunk shims at compiler/runtime/stdlib/compiler/<stage>.js + the
  umbrella compiler.js; every export throws at call time with W-STDLIB-COMPILER-DEFERRED
  attribution. The umbrella W-STDLIB-SHIM-MISSING warning was added in S121 Bug 8
  to cover the 13 new top-level shims (cron/format/fs/http/oauth/path/process/redis/
  regex/router/test/time/compiler).
- The central data structure is `FileAST` (compiler/src/types/ast.ts:1487). The
  native catalogs (Stmt[], Expr, Block[]) are PascalCase ESTree-shaped; the live
  FileAST uses lowercase scrml kinds — the bridge does the N×M structural translation.
- scrml SOURCE has no exceptions, no `null`/`undefined`, and no async/await
  (memory: standing rules); `!{}` is the call-site error handler, distinct from
  body-split and from try/catch. The COMPILER has 11 per-stage host-side
  diagnostic classes plus a runtime `_ScrmlError` hierarchy embedded into emitted
  apps. §34.1 catalogs 81 native-parser diagnostics — 79 hard `E-` parse errors
  + 2 info-level `I-NATIVE-BLOCK-*` FileAST-assembler codes (non-fatal).
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs
  unit+integration+conformance, never bypass `--no-verify` without authorization.
- SPEC.md is normative per pa.md Rule 4 (58 sections; §34.1 is the native-parser
  diagnostic catalog; §41.17 NEW S121 is the scrml:compiler deferral section;
  §58 is the Build Story, spec-ahead-of-implementation).
- `dashboard/app.scrml` (S120) is the scrml examples verification dashboard — a
  single .scrml app under `dashboard/`; unrelated to the compiler pipeline. S121
  surfaced Bug #9 (client-side codegen non-async body calls async fetch helper
  without await) via dashboard runtime; no source change yet, filed corpus-sweep.

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #pipeline #s121 #stdlib-shims

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
