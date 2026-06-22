# ss16 — PongAI cluster C5/C4/C3 progress

Worktree: .claude/worktrees/agent-a58f1b208605f9779
Base: 1ce8de34

## 2026-06-22 startup
- F4 verified: worktree path ok, branch worktree-agent-a58f1b208605f9779, base 1ce8de34, clean.
- Symlinked node_modules, compiler/node_modules, samples/compilation-tests/dist.
- Created .repro-ss16/{c5,c4,c3}.scrml (scratch, not committed).
- Repro confirmed:
  - C5: E-TYPE-063 `.Easy` not a variant of `Mode` (should type against Difficulty). FAILS.
  - C4: compiles clean, no lint on `@phase == Phase.Serving` (payload-variant ctor → always-false).
  - C3: `function render` def emits `_scrml_render_1()`, call emits `_scrml_render()` → mismatch. compiles clean.
- Next: ITEM 1 (C5) — type-system.ts variant ctor-arg typing.

## 2026-06-22 ITEM 1 — C5 DONE
- Added `inferBareVariantsAtVariantCtorArgs(exprNode, contextType, typeRegistry, span, errors)` in type-system.ts (after `inferBareVariantsAtCallArgs`). Recognizes variant-ctor callee (bare `.OnePlayer` via contextType, qualified `Mode.OnePlayer`/`Mode::OnePlayer` via typeRegistry), sources param types from `VariantDef.payload` (declared order), dispatches each arg to flat walker with the payload-field type, stamps `_bareVariantInferredAtBinaryExpr` so the LHS-driven flat walker skips the arg.
- Wired at state-decl (before struct-nav), let/const-decl (after call-args), bare-expr, if/while-cond, return-stmt (before flat return-type walker).
- Updated stale code comment (positions 3/4 no longer deferred).
- SPEC §14.10: added normative statement for ctor-arg position-3.
- Tests: 5 new cases in bare-variant-nested-context-inference.test.js (C5.1-C5.5). All 22 pass.
- Repro: c5.scrml compiles clean; .Nope typo → E-TYPE-063 against Difficulty (not Mode); qualified + dblcolon clean; match-payload unaffected.
- Full gate green WITH changes: 17579 pass / 0 fail / 968 files. (First run hit a cold-cache 28s hook timeout one-off on validate-emit-gate; warm reruns + base full-gate both clean → env flake, not regression.)
- C5 committed: 75bcf670.
- Next: ITEM 2 (C4).

## 2026-06-22 ITEM 2 — C4 DONE
- Added `checkEqPayloadVariantOperands(exprNode, typeRegistry, span, errors)` in type-system.ts (after `inferBareVariantsAtComparisonSites`). Detects `==`/`!=` BinaryExpr where an operand is a member `Enum.Variant`/`Enum::Variant` resolving to a PAYLOAD-bearing VariantDef (payload != null, size > 0). Fires warning-level `W-EQ-PAYLOAD-VARIANT` (non-fatal → result.warnings via W- prefix + severity:warning). WeakSet dedup; message steers to `is .Variant`/`match`; "ALWAYS false" for `==`, "ALWAYS true" for `!=`.
- Wired at all 5 comparison-site positions (let/const-decl, state-decl, bare-expr, if/while-cond, return) right after `inferBareVariantsAtComparisonSites`.
- emit-expr.ts:1047 `==`→`_scrml_structural_eq` UNCHANGED (per §45.4).
- SPEC: §45.7 row + §45.8 normative statement + §34 catalog row. Confirmed no W-EQ-PAYLOAD-VARIANT collision.
- Note: E-EQ-001/003/W-EQ-001 are emitted by gauntlet-phase3-eq-checks.js (NOT type-system.ts) and only for map keys — no existing `==` operand type-check; C4 is genuinely new. Lint homed in type-system.ts per brief scope.
- Tests: new file eq-payload-variant-lint-ss16-c4.test.js (C4.1-C4.6, cross-stream partition assert). 6 pass.
- Repro: c4.scrml compiles (non-fatal) + W-EQ-PAYLOAD-VARIANT; unit-variant `==` and `is .Serving` → 0 lints.
- C4 committed: 0cf70072.
- Next: ITEM 3 (C3).

## 2026-06-22 ITEM 3 — C3 DONE (mirror log-shadowing)
- emit-expr.ts: added `_renderShadowedInFile` flag + `setRenderShadowedInFile(on)` (mirror log). Guarded the render hijack at ~1726: `userDeclaredRender = _renderShadowedInFile || ctx.declaredNames?.has("render")`; when shadowed, fall through to the generic call path (callee="render" → fnNameMap post-pass rewrites to `_scrml_render_1`, matching the def).
- log-loc.ts: generalized `fileDeclaresLog` → shared `fileDeclaresFn(fileAST, name)`; `fileDeclaresLog`/`fileDeclaresRender` are thin wrappers.
- codegen/index.ts: imported fileDeclaresRender + setRenderShadowedInFile; wired `setRenderShadowedInFile(fileDeclaresRender(fileAST))` at BOTH file-loop sites (587-area + 760-area).
- type-system.ts: added `checkRenderShadowing` (mirror checkLogShadowing) firing info-level W-RENDER-SHADOWED at the `function render` decl; called next to checkLogShadowing (18850-area).
- SPEC: new §20.3a (render() builtin shadowing prose, mirror §20.6.7) + §34 catalog row for W-RENDER-SHADOWED. Noted `reset` is the hard-reserved client identifier, render is NOT reserved.
- Tests: new file render-shadowing-ss16-c3.test.js (3 tests — def/call match + valid JS, W-RENDER-SHADOWED cross-stream, builtin-unchanged-without-shadow). 3 pass. log-builtin tests still 35 pass (refactor safe).
- Repro: c3.scrml — def `_scrml_render_1()` + call `_scrml_render_1()` MATCH; node --check clean; W-RENDER-SHADOWED info fires. Without user render → `_scrml_render(` builtin preserved.
- Scope: stayed within type-system.ts / emit-expr.ts / log-loc.ts / codegen/index.ts / SPEC.md / tests (no emit-functions.ts / expression-parser.ts touch needed).
