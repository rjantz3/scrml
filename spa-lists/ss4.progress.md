# sPA ss4 — progress log (append-only)

Branch `spa/ss4` · worktree `../scrml-spa-ss4` · base `origin/main` e8a5491f (S209).
Note: list built S208 (2026-06-19); S208 same-day front-end work may have closed several
items — each verified empirically (R26 reproduce-first) before any dispatch.

## 2026-06-20 (S209) — boot
- Worktree + branch `spa/ss4` created from origin/main e8a5491f. node_modules + compilation-tests/dist symlinked from main (S209 ss9 dist-gap lesson).
- coreFiles + footprints read targeted.

## item 1 — bug-75 colon-shorthand legacy placement → RESOLVED (NOT-REPRODUCED)
- R26 e2e repro `/tmp/bug75-repro.scrml`: engine with after-`>` `:`-shorthand state-children (`<Small rule=.Big> : "small"`).
- `bun run compiler/src/cli.js compile` → EXIT 0, emits info `W-COLON-SHORTHAND-LEGACY-PLACEMENT` per state-child. NO E-STRUCTURAL-ELEMENT-MISPLACED.
- Root: fixed by S208 `tryConsumeAfterCloseColonShorthand` (block-splitter.js:1320, call sites 2948/3254) + symbol-table.ts warning emit (6419/11811). Landed 2026-06-18, after list build.
- Disposition: **dropped — resolved pre-list, verified NOT-REPRODUCED.** No code change.

## item 2 — comment-span opacity → FIXED (engine locus only; match NOT affected)
- R26 repro battery: engine state-child scan breaks when a comment BEFORE/BETWEEN state-children contains an ODD quote/apostrophe/backtick (`<!-- " -->`). `</Variant>`/`<tag>` mentions, balanced quotes, and after-placement are fine. Minimal trigger = odd quote in comment. Block-splitter probe (`splitBlocks`) shows BS captures engine body + children INTACT → bug is downstream in `engine-statechild-parser.ts`, not BS.
- Match parser: NOT affected at any comment position (BS raw-capture + arm-closer scan handle `<!--`). briefSeed's "match-arm scanner" claim is empirically wrong (R4 catch).
- Root cause TWO loci in `engine-statechild-parser.ts`:
  1. `skipCommentOrString` (1337) recognized `//` `/* */` `"` `'` backtick but NOT `<!-- -->` → comment-interior quote opened a phantom string.
  2. `parseEngineStateChildren` (2090 loop): when a `<!--` began exactly at `lt`, `next==='!'` made the loop step INTO the comment at `lt+1`, past the `<` skipCommentOrString needs.
- Fix: (1) add `<!-- -->` branch to `skipCommentOrString` (`computeCommentRegions` inherits it); (2) skip a skippable span starting AT `lt` in `parseEngineStateChildren`.
- Test: NEW `compiler/tests/unit/engine-statechild-comment-opacity.test.js` (7 cases, all pass). Regression: engine+colon-shorthand suite 201 pass / 0 fail.
- Disposition: **landed-on-branch `38edeb0a`** (full pre-commit + post-commit browser gate green).

## item 3 — native-parser corpus GAP-LEDGER → VERIFIED healthy by-design (no fix)
- Ran `parser-conformance-corpus.test.js`: 991/1008 strict-pass (98.3%), 17 gap-ledger skips, 0 fail. Class histogram: EXACT 956, DEFERRAL-test-block 21, LIVE-DEGENERATE 13, DIFF-deep-seq 8, DIFF-hoist-count 6, DIFF-top-seq 2, GAP-state-block 1, LIVE-HOIST-MISCLASSIFY 1.
- `classifyDivergence` re-partitions strict-vs-gap EVERY run → no stale `.skip` by construction; the self-flip mechanism is working as designed. strict-pass 98.3% >> the 50% floor gate.
- No isolated bug. Closing the 17 residual gap classes = item-6 native-parser fix work (out of sPA-bounded scope here).
- Disposition: **dropped — verified healthy by-design.** No code change.

## item 4 — byte-identical lexer gap → PARTIALLY CLOSED (5 dispositions flipped)
- Empirical probe: temporarily flipped all `M1.2-*` bench dispositions to `full` → 5 PASS the byte-identical gate, 3 FAIL. (M1.3 comment-aware + M1.5 template/regex normalizers have landed.)
- FLIPPED to `full` (now under the strict byte-identical gate): decl-destructure, expr-async-await, expr-yield-generator, stmt-import-export, stmt-try-catch.
- RESIDUAL genuine gaps (kept skipped, documented at the skip site): decl-class (class-body token shape), expr-optional-chain (`?.` split), expr-template-literal (template token shape) → native-lexer (lex.js/token.js) work in item 6.
- Legitimate strict-TIGHTENING (more byte-identical coverage), matches the test file's own documented "flip as the class closes" intent. Lexer test 113 pass / 0 fail.
- Disposition: **landed-on-branch `044c9d43`** (items 3+4 batched; full gate green).

## item 5 — phase-a2-structural-elements → VERIFIED shipped; PA currency edit queued
- Verified all 5 A2 structural elements ship + compile: `<engine>` (+A7 extensions landed, master-list line 37) · `<match>` block · `<channel>` · `<errors>` (combined-003 compiles; 17 test files) · `<onTransition>` (engine-modern-002 compiles; 33 test files). Native parser Charter B is the live front-end (roadmap banner). Conformance corpus 991/1008 strict.
- master-list.md row A2 currently reads `⏸️ pending A1` (stale since S58). NOT edited on-branch — master-list.md is PA-owned durable state + most-frequently-edited doc (stale-base file-delta clobber hazard). Handing the PA the exact row replacement to apply at re-integration:
  - FROM: `| A2 — Structural elements | \`<engine>\`, \`<match>\` block, \`<channel>\`, \`<errors>\`, \`<onTransition>\` | 25-40h | ⏸️ pending A1 | |`
  - TO:   `| A2 — Structural elements | \`<engine>\`, \`<match>\` block, \`<channel>\`, \`<errors>\`, \`<onTransition>\` | 25-40h | ✅ SHIPPED (A1c waves + A7; live front-end = native-parser Charter B) — S58 row currency-corrected S209/ss4 | all 5 elements compile + heavy test coverage (errors 17 / onTransition 33 files); conformance corpus 991/1008 strict |`
- Disposition: **verified — PA currency edit queued** (no on-branch code/doc change).

## item 7 — derived-value-compound-mutate → BLOCKER (a) LANDED · BLOCKER (b) DISPATCHED
- Walker (`derived-mutation-ops.ts`) already correct. Both blockers are front-end.
- **Blocker (a) — shift compound-assigns (`<<=`/`>>=`/`>>>=`):** R26 repro `@x <<= 1` → `E-CODEGEN-INVALID-JS` (`_scrml_reactive_get("x") << = 1`). TWO root loci:
  1. `tokenizer.ts` MULTI_OPS (1515) listed `<<`/`>>`/`>>>` but NOT `<<=`/`>>=`/`>>>=` → longest-match lexed `<<` + `=`; joinWithNewlines reassembled `<< =` → broke rewriteReactiveAssign's contiguous-op regex. Added the 3 ops (longest-first, before the bare shifts).
  2. `ast-builder.js` COMPOUND_OPS (3605) was only `+= -= *= /= %= ++ --` → a newline-separated 2nd `@x <op>= n` for ANY other compound op didn't trigger the collectExpr statement boundary → statements MERGED + SILENTLY DROPPED (console.warn only). Empirically confirmed silent-data-loss for ALL 10 missing ops (`**= &= |= ^= &&= ||= ??= <<= >>= >>>=`), not just the shift trio. Completed COMPOUND_OPS to the full 15-op set (mirrors derived-mutation-ops COMPOUND_ASSIGNMENT_OPS) — fixes shift (named scope) + the 7 latent ops (same root, R2 don't-ship-smaller-surface).
  - **Safety note:** the tokenizer fix ALONE would turn `<<=` from a hard error into silent data loss — the two fixes are ONE coupled unit; both land together.
  - Verified: all 11 ops emit all statements; emitted JS semantically correct (`<<`/`>>`/`>>>`) + `node --check` valid; `@copy.a <<=/>>=/>>>= 1` fires E-DERIVED-VALUE-MUTATE. §B8.2b un-skipped (3 shift tests active; 15 ops). derived-value-mutate 42 pass / 5 skip / 0 fail. Touched-surface regression: parse-shapes + reactive-assign + tokenizer + ast-builder all green.
- **Blocker (b) — in-compound `const <derived>` + multi-segment receivers (§B8.3/§B8.6):** R26 confirmed STILL blocked — `@form.derivedField.a = 2` (derivedField = const child of compound `<form>`) compiles clean (no diagnostic) because the parser doesn't register `form.derivedField` as a const-derived child in the cell registry. Distinct from §S11A.8 (const PARENT, correctly declined); per §6.6.16 individual fields MAY be const. Genuine ast-builder + symbol-table parser feature; walker already descends compound scope. DISPATCHED to scrml-js-codegen-engineer (5 skipped tests = acceptance criteria).
- Disposition: **(a) landed-on-branch `e6a915c5` · (b) LANDED (SHA below)**. BRIEF archived `docs/changes/ss4-item7b-compound-const-derived-2026-06-20/BRIEF.md`.
- **Blocker (b) landing:** agent `worktree-agent-a4e244bf6be547466` tip `65a52043` (merged spa/ss4 → blocker (a) in history). Fix: `ast-builder.js` parseLogicBody compound child-loop now dispatches a `const`+`<` opener into `tryParseStructuralDecl(constTok, true, {inCompoundBody:true})` → child state-decl `isConst:true`/`shape:"derived"` (+35 lines). Walker UNCHANGED (already descends compound `_scope`). §6.6.16-grounded; §S11A.8 invariant (no const PARENT) preserved. §B8.3 (4) + §B8.6 (1) un-skipped + pass.
- **Landing discipline:** verified PA-wrap commits (e8a5491f→41422726, S209 close) did NOT touch ast-builder.js/derived-value-mutate.test.js/symbol-table.ts; agent-vs-spa/ss4 diff = blocker-b-only (+35 / +13-6); S67 file-delta of the 2 files (symbol-table untouched). R26 on spa/ss4: §B8.3 repro fires E-DERIVED-VALUE-MUTATE; derived-value-mutate+parse-shapes 161 pass / 0 fail.
- **NOTE (context shift):** PA WRAPPED S209 mid-session (origin/main e8a5491f→41422726; `28de9c81` "ss4/ss13/DD-verdict to next PA"). spa/ss4 stays based on e8a5491f (merge-base intact, clean linear). The **next PA** re-integrates spa/ss4 onto origin/main 41422726.

## item 6 — native-parser-front-end M2-M6 → PARKED (escalate to PA)
- BIG design-gated multi-milestone arc. Two park reasons: (1) the actual Phase-A default-flip is a STANDING USER DECISION (~v0.8) per the roadmap banner — not sPA-rulable; (2) footprint (`native-parser/*` = the whole parser) is unbounded for one sPA session — exceeds ss4 shared ingestion (contract: park + flag PA, don't bulk-run).
- Current state (roadmap S170): native parser BUILT (M1-M4 + MK1-MK4); flip-failures 1,150 (S161) → ~508 (S170 W2), 0 true regressions; #2f each/match/colon-shorthand DONE (S162). Remaining flip-failure buckets: MISSING-FIELD emit-shape ~296 (dominant) · engine-statechild ~116 · FIELD-SHAPE-other ~21 · each-match residual ~11 · legacy-stage-probe ~14-18 — each a substantial per-milestone native-parser dispatch the PA should sequence.
- Authority: `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md` + `m6-joint-retirement-cutover-plan-2026-05-23.md`.
- Disposition: **PARKED — escalated to PA.**

---

# sPA ss4 — S211 run (S210-rebuilt 3-item list)

Branch `spa/ss4` re-created from local main `3d311fc9` (ahead of origin/main `8dba968e`).
node_modules + compiler/node_modules + compilation-tests/dist symlinked from main.
Note: main advanced 3d311fc9→8569f774 concurrently during this run (PA/deputy ticks 154/155/163
+ match-arm codegen fix 93e02b35 + deputy-maint merge). All 3 ss4-touched files verified disjoint
from that advance → PA re-integration merge will be clean.

## item 1 — g-block-match-in-lift-misparsed-as-components → PARKED (user ruling)
- R26 reproduced on HEAD 3d311fc9: block `<match>` inside `${ for (let r of @rows) { lift <li><match for=Status on=r.st><Open>…</Open><Closed>…</Closed></match></li> } }` fails with `E-COMPONENT-035` on `Open`+`Closed` (arms fall to the uppercase-tag→component path). SAME block `<match>` inside `<each>` compiles clean.
- Root: the `lift`-body re-parse (`liftBareDeclarations`) does NOT route `<match>` through the S107 match-block recognition that the `<each>` body path uses.
- Fix-shape fork (brief-seed reserved "PA picks"): (a) support block-`<match>` in `${…lift}` (parity with `<each>`) vs (b) targeted diagnostic 'use `<each>`'. Language-capability ruling → sPA escalates, does not decide.
- **User ruling (S211): PARK — escalate to PA/dPA.** No code change. Surfaced in the re-integration message.

## item 2 — native-parser-lexer-3-residuals → LANDED 3cd58aa4
- Dispatched scrml-js-codegen-engineer (worktree-agent-adbf6a5d306b8f9cd, d46da4b0).
- FINDING (contradicts S209/S210 framing): the 3 residuals (decl-class, expr-optional-chain, expr-template-literal) were **comparator-side fidelity gaps, NOT native-lexer bugs**. The native token stream already matched Acorn modulo documented intentional scrml-extension divergences.
  - decl-class: `constructor` member name resolved to Object.prototype.constructor in the plain-object lookup tables (prototype pollution); added a `lookup()` own-property guard mirroring token.js makeIdentOrKeyword.
  - expr-optional-chain: `?.fn?.()` — `fn` is a scrml HARD keyword (KwFn); added NATIVE_SCRML_KEYWORDS (verified == token.js:207-233) as an intentional divergence table.
  - expr-template-literal: generalized the closing-backtick fold (was empty-trailer-only) + frames-stack for nested templates.
- sPA verify (R26/R4): NATIVE_SCRML_KEYWORDS matched token.js exactly; `compareFull` assertion logic UNCHANGED (no gate-loosening); re-ran lexer conformance on spa/ss4 → 110 pass / 0 fail. Full gate (agent) 17535/0.
- Only `compiler/tests/parser-conformance-lexer.test.js` changed (native-parser source untouched). S67 file-delta.
- Disposition: **landed-on-branch `3cd58aa4`.**

## item 3 — g-block-analysis-fn-span-overshoot → LANDED 05df4c48
- R26 reproduced: every local fn-decl inside a `${…}` logic body had span.end = END of the NEXT token; block-analysis endLine landed on the next fn's opener (all 11 adjacent pairs in messages.scrml shared a boundary line).
- Root: `parseRecursiveBody()` consumes the closing `}`, then function-decl nodes used `span: spanOf(startTok, peek())` (peek() = token after `}`). Fix = `peek(-1)` (the consumed `}`).
- Dispatched scrml-js-codegen-engineer (worktree-agent-a487f5b55264d6938, b98290cf). **Brief line-number correction (agent catch):** the brief named the 2 NESTED handler sites (~7870/8120); the messages.scrml repro fns are TOP-LEVEL, parsed by the MAIN-LOOP sites (~10817/11035). Agent verified empirically + fixed ALL 4 function-decl sites (R3). Export-form site (precomputed span) + ~40 non-fn decl sites left untouched (scope guard).
- sPA verify: ast-builder.js delta = exactly the 4 `peek(-1)` lines; all 3 ss4 files disjoint from main's concurrent advance (clean file-delta). +3 non-vacuous regression tests (real BS+AST path). Full gate (agent) 17538/0; no locked expectations corrected.
- SYSTEMIC FINDING (out of scope, flagged for PA): the same overshoot affects ~40 other logic-body decl sites (let/const/state/lin/bare-expr); only fns surface because block-analysis projects only named blocks.
- Disposition: **landed-on-branch `05df4c48`.**
