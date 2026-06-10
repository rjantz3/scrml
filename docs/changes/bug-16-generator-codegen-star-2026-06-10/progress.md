# bug-16-generator-codegen-star-2026-06-10 — progress

2026-06-10T18:41:00Z — START at /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ac41cf752717f04cb
- Startup verification passed: pwd under agent worktree, toplevel matches, tree clean, bun install + pretest done.
- HEAD at 7c41cad2 (one docs-only wrap commit ahead of map watermark c48c4f71 — no source drift).

2026-06-10T18:41:00Z — Phase 0 survey-confirm
- emit-functions.ts:952 emits `${asyncPrefix}function ${generatedName}(...)` — NO generator-star branch. Confirmed.
- isGenerator referenced NOWHERE in emit-functions.ts (grep empty). Confirms star-drop.
- emit-library.ts:428-430 reference pattern: `const generatorStar = stmt.isGenerator ? "*" : ""; ... function${generatorStar} ${name}(...)`. Confirmed.
- ast.ts:836 `isGenerator?: boolean` on function-decl node. Confirmed.
- fnNodes source: ctx.analysis?.fnNodes ?? collectFunctions(ctx.fileAST) (emit-functions.ts:433).
- Pre-fix reproducer compile: BOTH fail E-CODEGEN-INVALID-JS "keyword 'yield' is reserved"; reproducer B emitted `function _scrml_counts_2()` (no star) — confirms client emitter drops star.

NEXT: verify isGenerator reaches the emit site (collectFunctions / analysis.fnNodes preserve the flag), then add generatorStar branch at emit-functions.ts:952.

2026-06-10 — Phase 1 fix committed (ae792041)
- emit-functions.ts:960: added `const generatorStar = (fnNode as {isGenerator?:boolean}).isGenerator ? "*" : "";` and changed push to `function${generatorStar} ${generatedName}(...)`. Mirrors emit-library.ts:428.
- python3 literal-replace used (perl \Q\E tripped on backticks/${}); diff verified.
- Pre-fix R26: both reproducers FAILED E-CODEGEN-INVALID-JS. Post-fix: both compile clean.
- R26 emitted-JS: s178-gen `function* _scrml_fibonacci_2()` node --check exit 0; s178-gen2 `function* _scrml_counts_2()` node --check exit 0.

2026-06-10 — object-literal generator-method shape (`{ *method() {} }`)
- DEFERRED. emit-expr.ts emitProp (525) handles only prop/shorthand/spread — NO object-literal METHOD kind at all (generator or plain). Separate, larger emit path; NO current reproducer; SPEC §13.6 normative claim lists file-scope/${}-logic/fn-expression/SSE positions but NOT object-literal-method (only §19.9.8's PARSE-preservation note mentions it). Per brief: note as deferral, do not expand scope.

2026-06-10 — Phase 2 test (cab500a6)
- compiler/tests/unit/bug16-generator-client-emit-star.test.js: 12 tests, 0 fail (§1 minimal / §2 Fibonacci / §3 plain-fn regression guard). Uses compileScrml + clientJs + new Function() syntax gate (== node --check property). Committed through pre-commit hook (NO --no-verify).

2026-06-10 — ANOMALY surfaced (out of scope, NOT introduced)
- Reproducer B (`const <nums> = [...counts()]`) emits the spread RHS as `[...counts()]` using the USER-source name, NOT the generated `_scrml_counts_2`. Would be a runtime ReferenceError. SEPARATE name-resolution gap in the derived-decl spread-RHS path (fnNameMap not applied to that expr). NOT the star-drop bug; NOT introduced by this fix. Reproducer A's for...of consumer DOES resolve correctly (`_scrml_fibonacci_2()`). node --check / E-CODEGEN gates both pass (syntax-valid; ReferenceError is runtime). Surfacing as deferral.
