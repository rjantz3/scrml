# native-exprtext-backfill-walker-2026-06-06 — progress

WORKTREE: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a5da85fc3d2746f88
BASE: df08f282 (== main, ff-only confirmed)

- [step 0] Startup verified: pwd=worktree, toplevel==worktree, status clean, HEAD df08f282, bun install OK, bun run pretest OK. Maps read (primary.map.md). Template read (attrvalue-exprnode-walker.ts).
- [step 1] ROOT confirmed: native makeBareExpr (translate-stmt.js:457) sets expr:"" + exprNode. type-system.ts has TWO statementText: 15993 (already reads exprNode/initExpr via emitStringFromTree) and 17108 (inner to checkLifecycleBindingAccess @16920 — reads ONLY node.value/expr/text/raw/init/condition; ZERO exprNode). Field-pairings native leaves empty: exprNode->expr, initExpr->init, condExpr->condition.
- [step 2] Wrote compiler/src/native-walker/exprtext-backfill-walker.ts (mirror of attrvalue-exprnode-walker.ts). Backfills 3 string fields from structured siblings via emitStringFromTree; never overwrites non-empty; only touches nodes WITH a sibling.
- [step 3] Wired backfillNativeExprText into api.js native branch right after populateNativeAttrValueExprNodes (import + call). DEFAULT pipeline untouched.

- [step 4] SELF-VERIFICATION (temp default-flip applied: `parser !== "legacy"`):
  - Baseline (default pipeline, no flip): 33/33 pass on both target test files.
  - WITHOUT walker (flip on): 14 pass / 19 fail.
  - WITH walker (flip on): 20 pass / 13 fail. NET +6 fixtures recovered.
  - VERIFIED: the walker makes the READ/return TEXT visible to the regex-over-text passes.
    Test 1 (pre-transition read fires E-TYPE-001) PASSES under native — the core CASE-1 win.
    return-stmt `.Viewer` text now backfilled (was empty); function-decl structure matches live.
  - RESIDUAL 13 failures are PARSER-STRUCTURAL divergences, NOT text-visibility (out of CASE-1 scope):
    * Test 5/12/16/17 (write-then-read): native parses `@phase = X` as `bare-expr`/assign;
      live parses it as a 2nd `state-decl`. Lifecycle write-classification (classifyWriteAgainstSpec
      @type-system.ts:17363) is keyed on node KIND `state-decl` (17338) / `reactive-nested-assign`
      (17381). `processStatementText` has NO whole-cell-assignment write-classifier. Group P/T (native
      should emit state-decl/reactive-assign for `@cell = X`) OR a separate type-system change.
    * Test 8/10 (qualified-enum discrim): `if (@phase is .Draft)` discrim scope not advanced under
      native (qualified-annotation `(Article.Draft to Article.Published)` -> binding spec / discrim
      detection divergence). Group P/T.
    * enum-subset (a) fn-return: native FunctionDecl DROPS the `-> Role oneOf([...])` return-type
      subset annotation (banked S166 prereq "native FunctionDecl return-type-annotation drop").
      My walker DID backfill `return-stmt.expr=".Viewer"`; the annotation side is the gap. Group P/T.
    * enum-subset (b) struct-constructor: CASE-3 (struct-constructor grammar) — DEFERRED per brief.

- [step 5] INERTNESS VERIFICATION (the critical owed item; flip on, walker on vs off):
  - Harness: compiled ALL 297 samples/compilation-tests/*.scrml under NATIVE, captured
    outputs Map (clientJs/serverJs/libraryJs/html/css/testJs/machineTestJs), diffed byte-for-byte
    with vs without the walker call.
  - RESULT: 295/297 fixtures byte-IDENTICAL. 2 fixtures changed clientJs:
    lin-001-basic-linear.scrml + lin-002-double-use.scrml.
  - The change is a NET-POSITIVE FIX, not a perturbation:
    * `lin token = fetchToken()` -> native lin-decl had `init: ""` + `initExpr`(call).
    * lin-decl codegen (emit-logic.ts:3263-3266) reads the STRING `node.init`; when empty it
      emits the BROKEN `const token;` (invalid JS — const w/o initializer). It is an UN-migrated
      consumer (does NOT prefer initExpr for the initializer presence-gate).
    * WITHOUT walker: emitted JS is INVALID (acorn: "Unexpected token (12:11)" on `const token;`).
    * WITH walker: backfilled `.init` -> correct `const token = _scrml_fetchToken_2();` -> VALID JS.
  - VERDICT: populating .expr/.init/.condition is INERT-OR-BETTER for codegen. There is NO case
    where the walker turns a previously-correct emit into a different/wrong one; it only fixes a
    latent native lin-decl miscompile incidentally. The brief premise "codegen prefers exprNode"
    holds for all paths EXCEPT lin-decl's init-presence gate (now also satisfied). No walker
    narrowing needed.

- [step 6] FINAL VERIFICATION (default pipeline, flip reverted, walker wire-in retained):
  - api.js git diff vs main = walker import + call ONLY (NO default-flip scaffold). Confirmed.
  - within-node + canary: 1081 pass / 0 fail (0 PARSE-FAILURE; baseline histogram unchanged).
  - parser-conformance suite: 4334 pass / 0 fail / 1 skip.
  - pre-commit gate (unit+integration+conformance): 16172 pass / 0 fail / 89 skip / 1 todo.
  - full `bun run test`: 23366 pass / 0 fail / 220 skip / 1 todo (vs df08f282 baseline 23338/0 —
    +28 net pass from the 11 new walker tests + downstream; 0 NEW fails). Default branch unbroken.
  - NUL check: 0 NUL bytes in both new files (UTF-8 text confirmed).
  - STATUS clean; branch tip == HEAD; divergence main...HEAD = 0/2 (no leak).
- DONE. CASE-1 walker landed. CASE-2 (typeAnnotation one-liner, Group T) + CASE-3 (struct-constructor
  grammar) + the residual write-recognition/discrim/return-type-drop parser divergences are Group P/T.
