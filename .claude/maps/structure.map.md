# structure.map.md
# project: scrmlts
# updated: 2026-05-23T00:00:00-06:00  commit: 136678e5

## Entry Points
compiler/bin/scrml.js — CLI executable shim; re-exports src/cli.js so `bun run scrml` / `npx scrml` / direct invocation all work.
compiler/src/cli.js — subcommand router; dispatches compile / dev / build / migrate / promote / generate / init / serve; falls through to compile when arg 0 is a .scrml file or directory.
compiler/src/api.js — programmatic compiler API; `compileScrml(options)` runs the full BS→TAB→PRECG→…→CG pipeline; the M5 native-parser swap seam. As of C2 (S119), `--parser=scrml-native` ROUTES the per-file TAB stage through `nativeParseFile` (api.js:729-736).
compiler/native-parser/parse-file.js — `nativeParseFile(filePath, source)` — the C1 FileAST assembler; the native-parser analogue of `buildAST`. Returns `{ filePath, ast: FileAST, errors }`. S121 P5-7 added inline `match-block` ASTNode synthesis.
lsp/server.js — Language Server Protocol entry; `bun run lsp`.
docs/build.ts — docs-site builder; `bun run docs:build`.

## Directory Ownership
compiler/src/                  — JS+TS compiler pipeline stages (BS, TAB, CE, PA, RI, MC, TS, META, DG, BP, AG, RS, CG) plus lints and validators.
compiler/src/codegen/          — Stage 8 code generation; ~55 emit-* modules + index.ts (runCG), route-splitter, IR, source-map.
compiler/src/codegen/compat/   — parser-workaround shims (BPP overrides via parser-workarounds.js).
compiler/src/commands/         — CLI subcommand implementations (compile.js, dev.js, build.js, migrate.js, promote.js, generate.js, init.js, serve.js).
compiler/src/reachability/     — Stage 7.6 Reachability Solver components (component-1..5, entry-points, gate-classifier, outer-fixpoint).
compiler/src/types/            — shared TypeScript type declarations (ast.ts, auth-graph.ts, reachability.ts).
compiler/src/validators/       — post-CE / lint validators (attribute-allowlist, attribute-interpolation, post-ce-invariant, lint-try-catch, lint-async-user-source, ast-walk).
compiler/native-parser/        — the scrml-native composed-engines front-end. M1 (lexer) complete; expr/stmt/markup parsers + the native→live FileAST bridge + the `nativeParseFile` assembler all landed. `--parser=scrml-native` ROUTES the TAB stage through it (C2, S119). .scrml canonical sources + 1:1 .js shadow files. 37 .js modules. See "Native-Parser Layout" below.
compiler/native-parser/dist/   — compiled native-parser artifacts (client.js + html); generated.
compiler/self-host/            — from-scratch scrml self-host compiler sources (.scrml) + JS bridge; separate post-v1.0 effort.
compiler/runtime/              — hand-written ES-module runtime shims; runtime/stdlib/*.js bundled into emitted output as _scrml/*.js; idempotency.js.
compiler/runtime/stdlib/       — 18 top-level shim .js files (auth/crypto/data/host/store + S121 Bug 8: cron/format/fs/http/oauth/path/process/redis/regex/router/test/time/compiler) + 5 oauth/ providers (discord/github/google/microsoft/pkce) + the scrml:compiler family per-stage dir (compiler/{bs,tab,mod,ce,bpp,pa,ri,ts,mc,me,dg,cg,expr}.js — 13 deferred-thunk siblings, Wave 8 Unit F).
compiler/tests/                — 732 .test.js files: unit, integration, conformance, parser-conformance, browser, commands, lsp, self-host, fixtures, helpers.
compiler/bin/                  — CLI executable shim.
compiler/dist/                 — compiled compiler artifacts; generated.
stdlib/                        — scrml standard library .scrml sources (auth, crypto, data, host, store, etc.).
lsp/                           — Language Server Protocol implementation.
editors/                       — editor integrations / syntax files.
examples/                      — numbered example .scrml apps + multifile dirs (22-multifile, 23-trucking-dispatch).
samples/                       — ad-hoc sample apps + gauntlet repro sets; samples/compilation-tests/ holds ~318 test-case dirs (count only — not enumerated).
benchmarks/                    — perf + LLM-efficiency + framework-comparison benchmarks.
e2e/                           — Playwright end-to-end tests + configs.
docs/                          — articles, audits, changes (per-dispatch BRIEF/SCOPING/progress files), website, tutorial, PA-SCRML-PRIMER, changelog.
scripts/                       — build/maintenance scripts (compile-test-samples, regen-spec-index, rebuild-*-dist, git-hooks).
dashboard/                     — scrml examples verification dashboard (v1, S120); dashboard/app.scrml is the single .scrml app; dashboard/dist is generated output. Bug #9 (S121): client-side codegen non-async body calls async fetch helper without await — filed corpus-sweep, no source change yet.
handOffs/                      — historical session hand-off docs (out of scope).

## Native-Parser Layout
Front-end flow: lex → parse-stmt/parse-expr → parse-markup → bridge layer → nativeParseFile → live FileAST.

  Lexing      — lex.js + lex-mode.js + 7 lex-in-* dispatchers (code, single/double-string,
                template, line/block-comment, regex); token.js + token-cursor.js + cursor.js.
                P5-9 (S120): `CONTEXTUAL_KEYWORDS` added to token.js — `type` lexes as
                `Ident` with a `ctxKw:"type"` payload; parse-stmt.js reads that field at
                statement position to decide whether the `type` keyword reading applies.
  Statements  — parse-stmt.js (3335L; +192L S121 P5-7 match-block synthesis support),
                ast-stmt.js (StmtKind: 20 variants), parse-ctx.js, parse-mode.js,
                parse-seam.js, block-context.js, body-mode.js.
                P5-3 (S120): `^{}` meta-block at statement position + `type:kind` decl ordering.
                P5-9 (S120): `type` as contextual keyword — `export type ...` fixed.
                P5-11 (S120): V5-strict structural state-decl `<NAME ...> = expr` recognition
                inside `${}` logic-escape bodies.
  Expressions — parse-expr.js, ast-expr.js (ExprKind: 40 variants).
  Markup      — parse-markup.js, tag-frame.js (TagKind calc + VOID_ELEMENTS void-element
                set + isVoidElementName, S119 HTML void-element support),
                display-text-literal.js (S121 Wave 11-R / 10-M: `null`→`not`, `===`→`==`
                migration in the .scrml mirror), parse-css-body.js, parse-sql-body.js,
                parse-state-body.js (shapeStateBlock + STATE_FORM_KEYWORDS `{db,schema}`
                + isStateBlock — S119 no-space `<db>`/`<schema>` recognition),
                parse-error-body.js, delegation-frame.js.
                P5-1 (S120): state-decl openers suppressed in the markup trampoline.
                P5-2 (S120): bare-markup export + `const Name = <markup>` pairing forms.
                P5-4 (S120): `<style>` rejection + stray anonymous-closer suppression.
                P5-8 (S120): empty-paren discrimination in `parseTypedAttrTokens`.
                P5-12 (S120): tag-frame opener-scan aborts on unbalanced closer.
                P5-12b (S121 Wave 5): `isStateTagBoundaryAfterLt` tightened — require
                  post-ident terminator before classifying `<Ident` as a state tag.
                P5-13 (S120): brace-in-string skip in `${}` body-extent scanner.
                P5-14 v2 (S121 Wave 5): `closeTagFrame { allowMismatchPop }` + slice-mode flag.
                Wave 6-A (S121): admit `_` as tag-name-start per SPEC §4.1 (`isTagNameStart`
                  in tag-frame.js now accepts `[A-Za-z_]`); 1:1 .scrml mirror updated.
                Wave 7-C (S121): typed-decl `:type` annotation consume (parse-expr.js).
  BRIDGE      — translate-stmt.js (R1 — native Stmt[] → live LogicStatement[]),
                translate-expr.js (A2 — native Expr → live ExprNode),
                collect-hoisted.js (A3 — native Block[] → imports/exports/typeDecls/
                components/machineDecls/channelDecls/hasProgramRoot; also exports
                isEngineBlock + synthEngineDecl).
  ASSEMBLER   — parse-file.js — `nativeParseFile(filePath, source)` (C1, S119; 1023L).
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
  Support     — span.js, bracket-stack.js, error-recovery.js, char-classify.js.
  Docs        — native-parser/README.md (current reference), M5-ast-bridge-scoping.md,
                M5-divergence-ledger.md, M5-SWAP-residual-decomposition.md.

## .scrml Mirror Discipline
Native-parser .js files are PRIMARY (executable surface); .scrml mirrors carry canonical
SHAPE per the Pillar 5b discipline. S121 invested heavily in mirror cohesion:
  - Wave 9-I: 36 sites migrated `is not not` → `is some` across .scrml mirrors.
  - Wave 10-K: parse-markup.scrml `fn` → `function` (8 in-file E-FN-003 sites).
  - Wave 10-L: 4 sibling body-parsers `fn` → `function` (full mirror set E-FN-003-clean).
  - Wave 10-M / 11-R: display-text-literal.scrml `===`→`==`, `!==`→`!=`, `null`/`undef`
    → `is not`/`is some` (+2 final sites `null`→`not`).
  - Wave 10-N: doc-comment realignment in 5 .scrml mirrors after K+L `fn`→`function`.

## Parser-Conformance Suite (compiler/tests/parser-conformance/)
  dual-pipeline-canary.js — the C2 proof instrument: runs LIVE (splitBlocks→buildAST)
                AND NATIVE (nativeParseFile) on a source, structurally diffs the two
                FileASTs along the top-level AND recursive node-kind sequences + 6 hoist
                counts + hasProgramRoot + the diagnostic streams. `classifyDivergence`
                tags EXACT / DIFF-top-seq / DIFF-deep-seq / DEFERRAL-* / LIVE-DEGENERATE /
                **LIVE-PHANTOM** (S121 Wave 6-B — credits native when live admits malformed
                state opener) / **LIVE-HOIST-MISCLASSIFY** (S121 Wave 9-H — credits native
                when only the hoist counts differ). Wave 8-G lowered the LIVE-DEGENERATE
                ratio guard 3.0x → 1.5x (+14 tests).
  corpus-enumerator.js, parsers.js (Acorn-oracle adapter), tier-diff.js, bench/, markup-bench/.

## Compiler Spec / Pipeline References
compiler/SPEC.md         — normative scrml language spec (58 sections; §34.1 is the native-parser diagnostic catalog — 81 codes as of S119; S121: §34 +2 W-STDLIB-SHIM-MISSING + W-STDLIB-COMPILER-DEFERRED; §41.17 NEW for scrml:compiler family deferral).
compiler/SPEC-INDEX.md   — navigation map into SPEC.md (section anchors).
compiler/PIPELINE.md     — pipeline-stage reference.

## Ignored / Generated Paths
node_modules, dist, compiler/dist, compiler/native-parser/dist, build, target, .git, .jj, .claude, vendor, *.db (SQLite test DBs), examples/dist, samples/dist, dashboard/dist

## Monorepo Note
package.json declares a Bun workspace `["compiler"]`. compiler/package.json is the
sub-package manifest (acorn + astring). Single map set covers the whole repo.

## Tags
#scrmlts #map #structure #compiler #native-parser #pipeline #m5-swap #stdlib-shims

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [dependencies.map.md](./dependencies.map.md)
