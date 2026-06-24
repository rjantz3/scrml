# GITI-032 — ternary-returning-markup dropped inside <match> arm body

## 2026-06-24T16:38:29Z — startup + root cause
- Startup verified: pwd=/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a315ec6b89316e208, HEAD=ca12a295, clean, bun install + pretest OK.
- Reproduced all three PA repros: single-loud + multi-silent -> E-CODEGEN-INVALID-JS (`? : ""` dropped consequent); toplevel-control compiles fine.
- ROOT CAUSE (corrected locus): NOT emit-match.ts. The match arm bare-body re-parse routes through nativeParseFile.
  The native parser DOES recognize markup-in-expression (ExprKind.MarkupValue), but translate-expr.js:298-299 translates it to
  `makeEscapeHatch("MarkupValue", "", span)` — EMPTY raw, DROPPING the markup body. So the live ternary's consequent becomes
  an empty escape-hatch -> emit-expr emits nothing -> `cond ? : ""`.
- The top-level path works because ast-builder's parseExprWithMarkupValues builds a proper {kind:"markup-value", node} ExprNode
  that emit-expr.ts case "markup-value" lowers via emitMarkupValueExpr.
- FIX: translate-expr.js MarkupValue case -> build a live {kind:"markup-value", span, node} via translate-stmt.js
  translateMarkupValueToLiveNode (the M6.2a bridge already used by lift-expr markup). Lazy-require to avoid the cycle;
  module-local high-offset counter for the embedded markup node id (id not load-bearing for codegen; within-node strips it).

## Next
- Apply fix; recompile repros; node --check; adversarial edge repros; full suite.

## 2026-06-24T17:17:06Z — match fix landed + engine + each blast-radius
- COMMITTED 44ad89a8: translate-expr MarkupValue -> live markup-value ExprNode (lazy-require translateMarkupValueToLiveNode + module-local id counter); emit-variant-guard arm-body display el.textContent -> _scrml_render_value (node-aware parity w/ top-level S201). Coupled tests: NEW giti-032 regression + translate-expr-bridge (MarkupValue now markup-value not escape-hatch) + g-shorthand-interp assertions. Blocking gate 17705/0.
- COMMITTED 9cc57ab2: within-node allowlist rebaseline for ghost-058 (EXTRA-FIELD 3, MISSING-FIELD 4, +KIND-NAME 1). The 3 transient TodoMVC fails were dist-not-built (env gap, resolved on re-run).
- ENGINE shared-helper: the <engine> state-child bare body does NOT use emit-match's nativeParseFile re-parse; it uses structural match.children. The STRUCTURAL parser (ast-builder parseLogicBody) lowered the markup-bearing ${...} to a raw html-fragment (isHtmlFragment fired on tokenizer-spaced `< / p >`), so the arm rendered EMPTY. FIX: parseLogicBody default branches (both sites) now gate — looksLikeNestedMarkupValueExpr + exprNodeHasMarkupValue(parsed) -> bare-expr (markup-value lowering) instead of html-fragment. Engine arm now wires _scrml_render_value + IIFE. Match/toplevel unaffected (match re-parses; toplevel already bare-expr).
- EACH blast-radius: markup-value in an <each> per-item interpolation. PRE-FIX: silent drop (compiled clean, "empty logic interpolation skipped", markup never rendered). My ast-builder gate handed the each path a markup-value exprNode -> emit-each raw String(< span >...) -> LOUD E-CODEGEN-INVALID-JS (a regression vs clean-compile). The each per-item path needs iter-var (@.) scope threaded into the markup-value DOM-build = a SEPARATE follow-on. FIX (non-regressing): emit-each defers markup-value-bearing per-item interpolation with a skip marker (preserves prior clean-compile + non-render). DEFERRED ITEM surfaced.
- Adversarial (all compile + node --check OK, markup content present): alt-only markup, both-branches markup, nested ternary markup, && short-circuit markup (top + arm). each-markup compiles clean (deferred skip).

## Next
- Run full gate; commit ast-builder + emit-each + test; final report.
