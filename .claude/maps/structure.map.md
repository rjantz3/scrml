# structure.map.md
# project: scrmlts
# updated: 2026-05-23T09:52:00-06:00  commit: c2d93544

## Entry Points
compiler/bin/scrml.js — CLI executable shim; re-exports src/cli.js so `bun run scrml` / `npx scrml` / direct invocation all work.
compiler/src/cli.js — subcommand router; dispatches compile / dev / build / migrate / promote / generate / init / serve; falls through to compile when arg 0 is a .scrml file or directory.
compiler/src/api.js — programmatic compiler API; `compileScrml(options)` runs the full BS→TAB→PRECG→…→CG pipeline; the M5 native-parser swap seam. As of C2 (S119), `--parser=scrml-native` ROUTES the per-file TAB stage through `nativeParseFile` (api.js:729-736). S122 Wave 12 Unit W: api.js threads `spec.local` (alias) through aliased-import handling.
compiler/native-parser/parse-file.js — `nativeParseFile(filePath, source)` — the C1 FileAST assembler; the native-parser analogue of `buildAST`. Returns `{ filePath, ast: FileAST, errors }`. S121 P5-7 added inline `match-block` ASTNode synthesis; 1037 LOC as of S122.
lsp/server.js — Language Server Protocol entry; `bun run lsp`.
docs/build.ts — docs-site builder; `bun run docs:build`.

## Directory Ownership
compiler/src/                  — JS+TS compiler pipeline stages (BS, TAB, CE, PA, RI, MC, TS, META, DG, BP, AG, RS, CG) plus lints and validators. S122 NEW: `lint-i-fn-promotable.js` (Unit EE I-FN-PROMOTABLE info lint, sibling to I-MATCH-PROMOTABLE).
compiler/src/codegen/          — Stage 8 code generation; ~55 emit-* modules + index.ts (runCG), route-splitter, IR, source-map. S122 Wave 14: emit-expr.ts postfix-reactive lowering restored (BB-followup); emit-logic.ts paren-wraps 5 thunk emit sites (Unit DD GITI-014); emit-match.ts migrated to nativeParseFile for per-arm bare-body re-parse (M6.3 Wave 1).
compiler/src/codegen/compat/   — parser-workaround shims (BPP overrides via parser-workarounds.js); S122 M6.5 path-a documentation + regression gate prove the helpers are no-op under the native upstream pre-M6.8 deletion.
compiler/src/commands/         — CLI subcommand implementations (compile.js, dev.js, build.js, migrate.js, promote.js, generate.js, init.js, serve.js).
compiler/src/reachability/     — Stage 7.6 Reachability Solver components (component-1..5, entry-points, gate-classifier, outer-fixpoint).
compiler/src/types/            — shared TypeScript type declarations (ast.ts, auth-graph.ts, reachability.ts).
compiler/src/validators/       — post-CE / lint validators (attribute-allowlist, attribute-interpolation, post-ce-invariant, lint-try-catch, lint-async-user-source, ast-walk).
compiler/native-parser/        — the scrml-native composed-engines front-end. M1 (lexer) complete; expr/stmt/markup parsers + the native→live FileAST bridge + the `nativeParseFile` assembler all landed. `--parser=scrml-native` ROUTES the TAB stage through it (C2, S119). M6 Wave 1 (S122) began consumer-side retirement of the legacy front-end. .scrml canonical sources + 1:1 .js shadow files. 37 .js modules. See "Native-Parser Layout" below.
compiler/native-parser/dist/   — compiled native-parser artifacts (client.js + html); generated.
compiler/self-host/            — from-scratch scrml self-host compiler sources (.scrml) + JS bridge; separate post-v1.0 effort.
compiler/runtime/              — hand-written ES-module runtime shims; runtime/stdlib/*.js bundled into emitted output as _scrml/*.js; idempotency.js.
compiler/runtime/stdlib/       — 18 top-level shim .js files (auth/crypto/data/host/store + S121 Bug 8: cron/format/fs/http/oauth/path/process/redis/regex/router/test/time/compiler) + 5 oauth/ providers (discord/github/google/microsoft/pkce) + the scrml:compiler family per-stage dir (compiler/{bs,tab,mod,ce,bpp,pa,ri,ts,mc,me,dg,cg,expr}.js — 13 deferred-thunk siblings, Wave 8 Unit F).
compiler/tests/                — 740 .test.js files: unit (517), integration (77), conformance (105) + browser, commands, lsp, self-host, fixtures, helpers, parser-conformance. 19,907 pass / 0 fail / 175 skip / 1 todo as of S122 wrap.
compiler/bin/                  — CLI executable shim.
compiler/dist/                 — compiled compiler artifacts; generated.
stdlib/                        — scrml standard library .scrml sources (auth, crypto, data, host, store, etc.).
lsp/                           — Language Server Protocol implementation.
editors/                       — editor integrations / syntax files.
examples/                      — numbered example .scrml apps + multifile dirs (22-multifile, 23-trucking-dispatch).
samples/                       — ad-hoc sample apps + gauntlet repro sets; samples/compilation-tests/ holds ~318 test-case dirs (count only — not enumerated).
benchmarks/                    — perf + LLM-efficiency + framework-comparison benchmarks.
e2e/                           — Playwright end-to-end tests + configs.
docs/                          — articles, audits, changes (per-dispatch BRIEF/SCOPING/progress files; 111 dirs / 209 .md as of S122), website, tutorial, PA-SCRML-PRIMER (NEW §6.2 Match block-form Tier 1 added S122), changelog.
scripts/                       — build/maintenance scripts (compile-test-samples, regen-spec-index, rebuild-*-dist, git-hooks).
dashboard/                     — scrml examples verification dashboard (v1, S120); dashboard/app.scrml is the single .scrml app; dashboard/dist is generated output.
handOffs/                      — historical session hand-off docs (out of scope).

## Native-Parser Layout
Front-end flow: lex → parse-stmt/parse-expr → parse-markup → bridge layer → nativeParseFile → live FileAST.

  Lexing      — lex.js + lex-mode.js + 7 lex-in-* dispatchers (code, single/double-string,
                template, line/block-comment, regex); token.js + token-cursor.js + cursor.js.
                P5-9 (S120): `CONTEXTUAL_KEYWORDS` added to token.js — `type` lexes as
                `Ident` with a `ctxKw:"type"` payload; parse-stmt.js reads that field at
                statement position to decide whether the `type` keyword reading applies.
  Statements  — parse-stmt.js (3335L), ast-stmt.js (StmtKind: 20 variants), parse-ctx.js,
                parse-mode.js, parse-seam.js, block-context.js, body-mode.js.
                P5-3 (S120): `^{}` meta-block at statement position + `type:kind` decl ordering.
                P5-9 (S120): `type` as contextual keyword — `export type ...` fixed.
                P5-11 (S120): V5-strict structural state-decl `<NAME ...> = expr` recognition
                inside `${}` logic-escape bodies.
  Expressions — parse-expr.js, ast-expr.js (ExprKind: 40 variants). S122 Wave 7-C continuation
                — typed-decl `:type` annotation consume.
  Markup      — parse-markup.js (S122 Unit X: @-sigil cleanup, 9→0 E-NAME-COLLIDES-STATE),
                tag-frame.js (TagKind calc + VOID_ELEMENTS void-element set + isVoidElementName,
                S119 HTML void-element support; S122 M6.6.b.1 IMPL: in-opener colon-shorthand
                recognition for EngineStateChildEntry contract derivation),
                display-text-literal.js (S121 Wave 11-R / 10-M: `null`→`not`, `===`→`==`
                migration in the .scrml mirror), parse-css-body.js, parse-sql-body.js,
                parse-state-body.js (shapeStateBlock + STATE_FORM_KEYWORDS `{db,schema}`
                + isStateBlock — S119 no-space `<db>`/`<schema>` recognition),
                parse-error-body.js, delegation-frame.js.
                P5-1..P5-13, P5-14 v2, Wave 5-12b, Wave 6-A landings unchanged (see S121 notes).
  BRIDGE      — translate-stmt.js (R1 — native Stmt[] → live LogicStatement[]; 1448L as of S122
                R4-U1 + R4-U2 wired translateExpr at bare-expr/return-stmt/throw-stmt sites
                and at for-stmt iterExpr + cStyleParts slots — 2 of ~5 R4-continuation units
                landed; R4-U3/U4/U5 remaining),
                translate-expr.js (A2 — native Expr → live ExprNode; module complete since
                S118 but integration wired progressively through R4-Ux units),
                translate-stmt-bridge.test.js (NEW S122 — regression gate for R4-Ux landings),
                collect-hoisted.js (A3 — native Block[] → imports/exports/typeDecls/
                components/machineDecls/channelDecls/hasProgramRoot; also exports
                isEngineBlock + synthEngineDecl; S122 M6.4a Wave 1: P2-Form1 synthesis +
                cross-file Export/Import shape — closes 1+2 E-COMPONENT-035 fires).
                NEW S122 Wave 1: `translateMarkupValueToLiveNode` bridge (M6.2a) — closes
                the lift-expr.expr.node consumer gap that blocked M6.2 component-expander.
  ASSEMBLER   — parse-file.js — `nativeParseFile(filePath, source)` (C1, S119; 1037L).
                Composes parseMarkupTrace + the three bridges into the live `FileAST`
                shape. 12 per-BlockKind synthesizers as of S121:
                  synthMarkupNode / synthStateNode / synthEngineNode / synthTextNode /
                  synthCommentNode / synthSqlNode / synthCssNode / synthMetaNode /
                  synthErrorEffectNode / synthLogicNode + drop path
                  + **synthMatchBlockNode** (S121 P5-7, Wave 9-J) — recognized via
                    `isMatchBlock(block)` (Markup tag-name `match`); routed BEFORE
                    `isStateBlock` so `<engine for=Phase>` stays in engine-decl.
                    FileAST shape: `{ kind: "match-block", forType, onExprRaw, armsRaw,
                    bodyChildren, span }` — mirrors live ast-builder.js L10518-L10698.
                One shared `idGen`.
                Now imported by `meta-eval.ts` and `codegen/emit-match.ts` (M6.1 + M6.3,
                S122 Wave 1).
  Support     — span.js, bracket-stack.js, error-recovery.js, char-classify.js.
  Docs        — native-parser/README.md (current reference), M5-ast-bridge-scoping.md,
                M5-divergence-ledger.md, M5-SWAP-residual-decomposition.md.
                NEW S122: **M6.6-CONTRACT-DERIVATION.md** (540L) — cookbook for
                M6.6.b.2..b.6 consumer migrations once the M6.6.b.1 IMPL seam is in
                place; documents `EngineStateChildEntry` contract derivation path-b.

## .scrml Mirror Discipline
Native-parser .js files are PRIMARY (executable surface); .scrml mirrors carry canonical
SHAPE per the Pillar 5b discipline. S121 invested heavily in mirror cohesion:
  - Wave 9-I: 36 sites migrated `is not not` → `is some` across .scrml mirrors.
  - Wave 10-K: parse-markup.scrml `fn` → `function` (8 in-file E-FN-003 sites).
  - Wave 10-L: 4 sibling body-parsers `fn` → `function` (full mirror set E-FN-003-clean).
  - Wave 10-M / 11-R: display-text-literal.scrml `===`→`==`, `!==`→`!=`, `null`/`undef`
    → `is not`/`is some` (+2 final sites `null`→`not`).
  - Wave 10-N: doc-comment realignment in 5 .scrml mirrors after K+L `fn`→`function`.
S122 mirror touches:
  - Unit U: tag-frame.scrml tilde-decl reassignment fix (sibling to ast-builder/type-system).
  - Unit X: parse-markup.scrml @-sigil cleanup (9→0 E-NAME-COLLIDES-STATE in the mirror).

## Parser-Conformance Suite (compiler/tests/parser-conformance/)
  dual-pipeline-canary.js — the C2 proof instrument: runs LIVE (splitBlocks→buildAST)
                AND NATIVE (nativeParseFile) on a source, structurally diffs the two
                FileASTs along the top-level AND recursive node-kind sequences + 6 hoist
                counts + hasProgramRoot + the diagnostic streams. `classifyDivergence`
                tags EXACT / DIFF-top-seq / DIFF-deep-seq / DEFERRAL-* / LIVE-DEGENERATE /
                **LIVE-PHANTOM** (S121 Wave 6-B — credits native when live admits malformed
                state opener) / **LIVE-HOIST-MISCLASSIFY** (S121 Wave 9-H — credits native
                when only the hoist counts differ). Wave 8-G lowered the LIVE-DEGENERATE
                ratio guard 3.0x → 1.5x. Strict-pass remains 998/1000 through S122.
  corpus-enumerator.js, parsers.js (Acorn-oracle adapter), tier-diff.js, bench/, markup-bench/.

## Compiler Spec / Pipeline References
compiler/SPEC.md         — normative scrml language spec (58 sections; §34.1 is the native-parser diagnostic catalog — 81 codes stable through S122; §34 adds W-STDLIB-SHIM-MISSING + W-STDLIB-COMPILER-DEFERRED (S121) + I-FN-PROMOTABLE (S122 Unit EE); §41.17 scrml:compiler family deferral; §56.9 NEW S122 — I-FN-PROMOTABLE sibling promotion lint).
compiler/SPEC-INDEX.md   — navigation map into SPEC.md (section anchors).
compiler/PIPELINE.md     — pipeline-stage reference.
docs/PA-SCRML-PRIMER.md  — adopter-side primer; NEW §6.2 Match block-form (Tier 1) subsection added S122 (Wave 12 close + S121 P5-7 catchup; primer reference, not normative spec).

## Ignored / Generated Paths
node_modules, dist, compiler/dist, compiler/native-parser/dist, build, target, .git, .jj, .claude, vendor, *.db (SQLite test DBs), examples/dist, samples/dist, dashboard/dist

## Monorepo Note
package.json declares a Bun workspace `["compiler"]`. compiler/package.json is the
sub-package manifest (acorn + astring). Single map set covers the whole repo.

## Tags
#scrmlts #map #structure #compiler #native-parser #pipeline #m5-swap #m6-wave1 #stdlib-shims

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [dependencies.map.md](./dependencies.map.md)
