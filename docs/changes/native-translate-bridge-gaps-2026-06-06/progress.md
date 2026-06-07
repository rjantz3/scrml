# native-translate-bridge-gaps-2026-06-06 — progress

worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a748ebb3394fff5f6
base: df08f282 (ff-only main, confirmed)

## FIX A — DEEPSET / ARRAY-MUTATION node-synth (translate-stmt.js) — DONE
- Added `tryReactiveWrite` recognizer + helpers (atCellRootName,
  collectMemberPathSegments, makeReactiveNestedAssignNode,
  makeReactiveArrayMutationNode, REACTIVE_ARRAY_MUTATIONS) in translate-stmt.js.
- Wired into ExprStmt arm before makeBareExpr fallthrough.
- Gate is STRICT @-cell root; non-cell `obj.x=y` stays in-place (parity LIVE).
- Multi-arg mutation -> serializeNativeArgList raw (mirrors LIVE escape-hatch
  multi-arg lowering); single-arg -> translated argsExpr.
- copyWithin EXCLUDED (matches LIVE recognizer at ast-builder.js:5635).
- VERIFIED: native client.js byte-matches default LIVE for dotted/nested/
  computed-index/literal-index/string-index deep-sets + single/multi/@cell-arg/
  arg-less mutations + non-cell negative case.
- New test: native-reactive-write-deepset-mutation.test.js (12 pass).
- Named test deepset-write-loss-position.test.js: 15/16 under native flip; the
  1 failing row uses a multi-line STRUCTURAL-COMPOUND decl `<x><prop></>` which
  fails native parse (E-CTX-001 at stage TAB) — a PRE-EXISTING native
  structural-compound parse gap, unrelated to FIX A (parse stage precedes
  translate-stmt). Default-pipeline run: 16/16 green.

## FIX B — destructured-param structuring (translate-stmt.js) — DONE
- New `translateParam` (replaces flat `paramName` in `translateParams`):
  ObjectPat/ArrayPat -> structured `{ name: <DestructurePattern> }` (was lossy
  "{...}"/"[...]" placeholder); plain ident stays STRING. AssignmentPattern
  wrapping a pattern -> `{ name, defaultValue }`.
- defaultValue preservation: extended `serializeNativeExprToText` with an
  ExprKind.Object case so `function f({a,b} = {a:0,b:0})` round-trips its
  default into the signature (closes the §G.3 default-for-pattern case).
- NO type-system change — binder (type-system.ts:5945) already walks the
  structured pattern once native emits the right shape.
- VERIFIED: native signatures byte-match default for shorthand/rename/array/
  nested/object-rest/array-rest/mixed/fn-form; E-SCOPE-001 gone.
- Proven load-bearing: pre-fix native fired E-SCOPE-001 on `name`/`a` (stash
  probe); named test ast-builder-parseparamlist-destructure under flip
  14->18 (FIX B alone) -> 19/19 (with defaultValue). gauntlet-s19 21-fail
  count IDENTICAL pre/post FIX B (no regression; the 21 are pre-existing
  native diagnostic-coverage gaps, out of scope).
- New test: native-destructured-param-structuring.test.js (9 pass).

## FIX C — typeAnnotation thread on var-decl (translate-stmt.js) — DONE
- `makeVarDeclNode` now copies `declarator.typeAnnotation` onto the
  const-decl/let-decl node (parseVarDeclarator already captures it; mirror
  makeStateDeclNode). Emitted only when non-empty (undefined-is-falsy parity).
- VERIFIED: `const bad: Post = { role: .Viewer }` native now fires
  E-CONTRACT-001 (was E-VARIANT-AMBIGUOUS); in-subset clean; scalar/enum typed
  const+let decls byte-identical native vs default (no regression).
- New test: native-vardecl-type-annotation-thread.test.js (3 pass).
- NOTE on named test enum-subset-enforcement-reach-da-b4: 7 fails under flip
  are SEPARATE native gaps — deliverable (b) struct-CONSTRUCTOR `Post { ... }`
  (no `:Type`, a different native path) + deliverable (a) fn-RETURN-type subset
  annotation (`-> Role oneOf(...)`, a fn-decl path). NOT the var-decl
  typeAnnotation path FIX C closes; pre/post-FIX-C count identical (9/7); the
  named test has NO dedicated `const x: Subset = {...}` case, so FIX C's
  improvement is captured in the new dedicated test instead. Out of scope.

## SUMMARY
- 3 fixes, all in compiler/native-parser/translate-stmt.js (NO parse-*.js, NO
  emit-logic.ts, NO type-system.ts changes). Native-only blast radius.
- 3 new test files (12+9+3 = 24 tests). .scrml mirror: NOT touched (S162/S166
  feature-stale; the FIX-A/B/C machinery is .js-side only).
