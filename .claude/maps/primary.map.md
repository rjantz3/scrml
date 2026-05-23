# primary.map.md
# project: scrmlts
# updated: 2026-05-23T09:52:00-06:00  commit: c2d93544

## Project Fingerprint
Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3196 git-tracked files
Watermark:  HEAD c2d93544 (2026-05-23) — package.json v0.6.0 — S122 wrap

## Map Index
| Map                  | Status  | Contents                                            |
|----------------------|---------|-----------------------------------------------------|
| structure.map.md     | present | directory layout, entry points, native-parser, stdlib |
| dependencies.map.md  | present | 2 root + 2 compiler runtime deps, stdlib shim layout |
| schema.map.md        | present | FileAST / ASTNode / native catalogs / match-block   |
| config.map.md        | present | 2 env vars, compiler option flags                   |
| build.map.md         | present | bun scripts, CLI subcommands, git hooks             |
| error.map.md         | present | 11 stage classes, §34.1 81-code catalog + W-STDLIB-* + I-FN-PROMOTABLE |
| test.map.md          | present | bun test, 740 test files, 19,907 pass, parser-conformance + canary |
| domain.map.md        | present | 25-stage pipeline, M5 swap seam, M6 Wave 1, S121/S122 progress |
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
pipeline stages / native parser / M5/M6 → domain.map.md
native-parser layout / assembler / stdlib shim layout → structure.map.md
compiler option flags / env vars       → config.map.md
build commands / CLI / git hooks       → build.map.md
test layout / parser-conformance / canary classes → test.map.md
external packages / module graph / shim catalog → dependencies.map.md
diagnostic classes / error codes / W-STDLIB-* / I-FN-PROMOTABLE → error.map.md

## Task-Shape Routing (agents — read this section first)

This is a compiler project. Task shapes below reflect what S121+S122 actually saw —
native-parser fixes dominate, with M6 consumer migrations (meta-eval, emit-match,
component-expander), lint-walker, type-system, and stdlib-shim authoring as
significant secondary classes.

**Native-parser bug fix** (e.g., gap-ledger residual, dual-pipeline canary
divergence, parse-X handling, FileAST synthesis, R4-continuation translateExpr
wiring):
1. `structure.map.md` (Native-Parser Layout section) — module ownership + mirror discipline
2. `schema.map.md` — FileAST contract + native catalogs + bridge layer
3. `domain.map.md` (M5 swap section + M6 Wave 1 progression) — recent fix patterns
4. `test.map.md` — parser-conformance + dual-pipeline-canary harness

**M6 consumer migration** (e.g., legacy `splitBlocks` / `buildAST` / `parseExprToNode`
call-sites swapping to `nativeParseFile`; emit-match, meta-eval, component-expander,
parser-workarounds; STOP-then-bridge pattern when native exposes a gap):
1. `domain.map.md` (M6 Wave 1 status + Aggregates table) — what's landed vs STOPped
2. `structure.map.md` (Native-Parser Layout — BRIDGE row + parse-file.js)
3. `schema.map.md` — FileAST + native catalogs the consumer touches
4. `test.map.md` — m6-* test files + parser-conformance regression gates

**Lint-walker change** (e.g., W-LINT false-positive, new ghost-pattern, walker
context-awareness, new info-lint like I-FN-PROMOTABLE):
1. `domain.map.md` (Ghost-lint pre-pass + Stage 5/6 walker entries) — what the walker does
2. `structure.map.md` — module locations (`lint-ghost-patterns.js`, `lint-i-fn-promotable.js`, `route-inference.ts`)
3. `error.map.md` — W-* / I-* code families
4. `test.map.md` — regression-test pattern for walker changes

**Type-system change** (e.g., scope-chain binding, import alias, TS L5502-shape,
tilde-decl reassignment, BB compound-assign+postfix):
1. `domain.map.md` (Stage 6 [TS] + Wave 11/12 Unit entries) — TS scope-chain rules
2. `schema.map.md` — type/AST shape the binding consumes
3. `error.map.md` — TSError + E-TYPE family

**Codegen change** (Stage 8 [CG], emit-* modules, e.g., paren-wrap thunk emit,
postfix-reactive lowering):
1. `structure.map.md` (codegen/ subdir) — emit module locations
2. `schema.map.md` (Codegen I/O Types CgInput / CgOutput) — contract
3. `domain.map.md` (Stage 8 [CG] entry) — what runCG does
4. `dependencies.map.md` (codegen → emit-* graph)

**Stdlib-shim authoring** (e.g., new scrml:NAME bundling, W-STDLIB-* surface):
1. `dependencies.map.md` (Stdlib runtime shim layout) — shim file convention + catalog rows
2. `structure.map.md` (compiler/runtime/) — directory layout (top-level vs subdir)
3. `error.map.md` — W-STDLIB-SHIM-MISSING + W-STDLIB-COMPILER-DEFERRED
4. `domain.map.md` (Stdlib bundling stage) — bundleStdlibForRun contract

**Spec amendment** (e.g., SPEC.md §X.Y update, §34 catalog row, §41.17/§56.9-style
new section):
1. `domain.map.md` (Core Concepts + Business Invariants) — surrounding context
2. `error.map.md` — if the amendment touches a code family
3. `schema.map.md` — if the amendment touches a node shape
4. `structure.map.md` (Compiler Spec / Pipeline References) — SPEC anchor location

**Test authoring** (e.g., parser-conformance, dual-pipeline-canary, regression for
a fix, m6-* migration tests):
1. `test.map.md` — runner + fixture + pattern + parser-conformance suite layout
2. `domain.map.md` — what the test exercises (Stage X / native swap / M6 consumer / etc.)
3. `schema.map.md` if asserting on AST shapes; `error.map.md` if asserting on codes

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
- M5-swap C2 IS LANDED (S119): `--parser=scrml-native` ROUTES the per-file TAB
  stage through the native parser's `nativeParseFile` (compiler/native-parser/
  parse-file.js) instead of the live `buildAST`. api.js:729-736 is the `_buildAST`
  override; api.js:1857 emits I-PARSER-NATIVE-SHADOW. Strictly opt-in — `parser`
  defaults to `null`; every other caller runs the untouched live BS+TAB path.
- M6 Wave 1 (S122) — consumer-side `splitBlocks`/`buildAST` retirements began:
  M6.1 meta-eval migrated to nativeParseFile (`52c6ec5a`); M6.3 emit-match per-arm
  bare-body re-parse migrated (`11e47dc0`); M6.2 component-expander STOPped on
  MarkupValue bridge gap → M6.2a `translateMarkupValueToLiveNode` LANDED (`9d64ff4c`);
  M6.4 STOPped on native-side P2-Form1 synthesis → M6.4a synthesis LANDED (`30327bd1`,
  closes 1+2 E-COMPONENT-035 fires); M6.5 path-a parser-workarounds proven no-op
  under native (`d982b7fb`); M6.6 adapter approach STOPped (`32af3da8`) → path-b
  contract derivation surveyed (`dfae2dab`) + M6.6.b.1 in-opener colon-shorthand
  IMPL LANDED (`f2d296c5`, + 540L `M6.6-CONTRACT-DERIVATION.md` cookbook). M6.2b /
  M6.6.b.2-b.6 / M6.7 / M6.8 pending. R4-continuation: U1 bare-expr/return/throw
  (`2d2fe5bb`) + U2 for-stmt iterExpr+cStyleParts (`56bd0861`) wired translateExpr
  at 2 of ~5 sites; U3/U4/U5 remaining.
- `nativeParseFile` (C1, parse-file.js, 1037 LOC) is the FileAST assembler — the
  drop-in analogue of `buildAST`. It composes `parseMarkupTrace` + the three bridges
  (translate-stmt R1, translate-expr A2, collect-hoisted A3) into the live `FileAST`
  shape, with 12 per-BlockKind synthesizers (S121 P5-7 added `synthMatchBlockNode`
  for `match-block` ASTNode parity) and one shared `idGen`. Native-parser canary
  strict-pass remains 998/1000 unchanged through S122.
- S122 host-side fixes landed with regression tests:
  Wave 12 Unit U (tilde-decl reassignment vs declaration — `d90598a2` ast-builder +
  type-system); Unit W (aliased imports use `spec.local` across module-resolver +
  name-resolver + api 3 sites — `447d3fbf`/`eb2275da`/`dd28a6a1`/`cbfefef2`);
  Unit X (parse-markup.scrml @-sigil cleanup, 9→0 E-NAME-COLLIDES-STATE — `bb1f0b9c`);
  Wave 13 Unit Y (RI Trigger 1/2 EXPR_NODE field-scan extension — `d8278c64`); Unit Z
  (E-NAME-COLLIDES-STATE did-you-mean hint — `bf7a6bb6`); Wave 14 Unit AA
  (W-LINT-013 markup-attribute opener scope-gate, Vue `@click` FP closed — `90ec1a9b`);
  Unit BB (postfix @x++/@x-- emit correct setter form — `ccb39c94`) + BB-followup
  (restore emitUnary postfix-reactive lowering after DD landing — `972a5c07`);
  Unit DD (GITI-014 zero-arg arrow returning object-literal paren-wrap at 5 thunk
  emit sites in emit-logic.ts — `18b90f12`); Unit EE (NEW lint
  `compiler/src/lint-i-fn-promotable.js` + SPEC §56.9 + §34 row + Stage 6.4b in
  api.js — `a2eb9096`).
- The central data structure is `FileAST` (compiler/src/types/ast.ts:1487). The
  native catalogs (Stmt[], Expr, Block[]) are PascalCase ESTree-shaped; the live
  FileAST uses lowercase scrml kinds — the bridge does the N×M structural translation.
- scrml SOURCE has no exceptions, no `null`/`undefined`, and no async/await
  (memory: standing rules); `!{}` is the call-site error handler, distinct from
  body-split and from try/catch. The COMPILER has 11 per-stage host-side
  diagnostic classes plus a runtime `_ScrmlError` hierarchy embedded into emitted
  apps. §34.1 catalogs 81 native-parser diagnostics — 79 hard `E-` parse errors
  + 2 info-level `I-NATIVE-BLOCK-*` FileAST-assembler codes (non-fatal). §34
  added `I-FN-PROMOTABLE` row in S122 Unit EE (info-level lint, sibling to
  `I-MATCH-PROMOTABLE`).
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs
  unit+integration+conformance, never bypass `--no-verify` without authorization.
- SPEC.md is normative per pa.md Rule 4 (58 sections; §34.1 is the native-parser
  diagnostic catalog; §41.17 is the scrml:compiler deferral section; §56.9 NEW
  S122 is the `I-FN-PROMOTABLE` sibling promotion lint; §58 is the Build Story,
  spec-ahead-of-implementation). PA-SCRML-PRIMER got NEW §6.2 Match block-form
  (Tier 1) subsection in S122 (primer reference, not normative spec).
- `dashboard/app.scrml` (S120) is the scrml examples verification dashboard — a
  single .scrml app under `dashboard/`; unrelated to the compiler pipeline.

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #m6-wave1 #pipeline #s122 #stdlib-shims

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
