# progress — g-attr-if-fn-call-misroute (S191)

- 2026-06-13: startup verify PASS (worktree, clean, bun install, pretest, merged main to ed4b49af). Base SHA ed4b49af.
- 2026-06-13: read SCOPE doc + primary.map (Task-Shape Routing → compiler-source bug fix / codegen).
- 2026-06-13: analyzed emit-html.ts. expr branch (1707-1723) is the mirror. call-ref branch (1761) unconditionally addEventBinding.
- 2026-06-13: R26 PRE-FIX reproducer confirmed bug: `if=isVisible()` -> `addEventListener("if", ...)`, NO mount/unmount controller (always renders). `if=(isVisible())` -> correct mount/unmount `_scrml_effect`.
- 2026-06-13: KEY FINDING — fn-name rename `isVisible`->`_scrml_isVisible_5` is a WHOLE-BUFFER post-process (emit-client.ts:1775 `post-fn-name-mangle`, code-segment-fenced regex). So a raw condExpr string `isVisible()` is auto-mangled. condExprNode synthesis NOT needed; raw-string path mirrors paren form exactly. emitExprField(undefined, condRaw, ctx) -> rewriteExprWithDerived handles @x args; post-mangle handles fn name.
- 2026-06-13: NEXT — apply the if/show guard to the call-ref branch (raw-string condExpr, refs extracted from @-args).

- 2026-06-13: FIX APPLIED (emit-html.ts call-ref branch) + 12 unit tests (attr-if-fn-call-conditional.test.js). Committed e1cf7f02 (pre-commit hook PASS).
- 2026-06-13: R26 PHASE-3 PASS on post-fix baseline. `if=isVisible()` -> `_scrml_effect(function(){ el.style.display = (_scrml_isVisible_5()) ? "" : "none"; })`; `addEventListener("if"` ABSENT; node --check exit 0. Paren control `if=(isVisible())` still emits mount/unmount controller.
- 2026-06-13: NEW TESTS 12/12 pass (isolated). Pre-commit gate subset (unit+integration+conformance): 16885 pass / 90 skip / 0 fail / exit 0.
- 2026-06-13: NOTE bare-call if= lands on the DISPLAY-TOGGLE logic-binding path (same as if=@var fallback / non-clean subtree), not the clean-subtree mount/unmount path. Both are valid reactive conditionals. The clean-subtree mount/unmount path (templateId/markerId) is gated on isMountToggle, which the call-ref logic binding does not set — acceptable parity with if=@var fallback.
- 2026-06-13: else-if=fn() assessment — else-if/if/else are STRIPPED from chain-branch elements (emit-html.ts:195) before the per-attr loop, so else-if=fn() never reaches the call-ref branch. Confirmed out of scope; no expansion needed.
- 2026-06-13: FOLLOW-UP (not addressed, pre-existing for expr form too): an impure `function` used in a condition re-runs its side effects every reactive tick. Candidate for a future lint, not this fix.
