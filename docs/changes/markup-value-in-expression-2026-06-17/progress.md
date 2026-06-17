# markup-value-in-expression-2026-06-17 — progress

Bug: g-markup-value-ternary-fnreturn-codegen (HIGH). Markup-as-first-class-value
(Pillar 1, SPEC §1.4/§7.4, PRIMER §6.4/§6.6.17) fails to codegen in 3 forms.

## 2026-06-17 — Phase 0 findings (verified empirically)

Repro dir: /tmp/mv-repro/{a-inline,b-derived,c-fnreturn,d-control}.scrml
All 3 forms reproduce E-CODEGEN-INVALID-JS; control (d) compiles + renders.

LAYER DIAGNOSIS (different per form):

(b) DERIVED TERNARY `const <badge> = @n > 0 ? <span>pos</span> : <span>neg</span>`
  - ROOT: block-splitter (block-splitter.js). At top level it gobbles the decl
    via scanShape12DeclEnd(); the expression-RHS branch (line ~1474) returns -1
    (markup not at RHS-head), so legacy per-char accumulation runs and STOPS at
    the first `<span` markup-opener -> the ternary arms are split into SEPARATE
    top-level markup blocks. ast-builder sees only text `const <badge> = @n > 0 ?`
    -> initExpr = escape-hatch raw `@n > 0 ?` (arms DROPPED).
  - FIX LAYER: block-splitter scanShape12DeclEnd expression-RHS branch must scan
    the FULL RHS (balancing markup elements within ternary arms) so the whole
    decl stays one text block, then emit-logic's derived-ternary path lowers the
    markup arms to node-producing exprs.

(c) FN-RETURN `fn label(n:int)->markup { return <span>${n}</span> }`
  - ROOT: ast-builder `return` parser (line ~6966) has hooks for SQL/match but
    NOT markup. `return <span>...` falls to collectExpr -> markup parsed as a
    JS expr -> acorn escape-hatch raw `< span >` (mangled) + orphaned `${n}`.
  - FIX LAYER: add a markup hook to the `return` parser mirroring `lift`'s inline
    markup parse (line ~6749): `<`+IDENT/KEYWORD -> parseLiftTag -> store
    markupNode on return-stmt; emit-logic return-stmt renders via
    emitCreateElementFromMarkup.

(a) INLINE TERNARY `<div>${ @n>0 ? <span>pos</span> : <span>neg</span> }</div>`
  - ROOT: markup stays inside the interpolation (block-splitter keeps the whole
    `<div>${...}</div>` as one markup block). Emit path: reactive-display wiring
    emits `el.textContent = _scrml_reactive_get("n") > 0 ? < span > pos < / span >`
    -- markup arms emitted RAW (rewriteExpr string-path preserves raw text but
    never lowers markup to nodes). Same expression-with-markup family as (b).
  - FIX LAYER: emit layer (interpolation lowering) — markup in expression
    position must lower to a node-producing expression (markup factory / inline
    createElement), routed through emitCreateElementFromMarkup.

CONTROL (d) `const <x> = <span>${@n}</span>`: bare-markup RHS -> renderSpec.element
  -> _scrml_markup_factory_x_2() via emitCreateElementFromMarkup. WORKS. The
  factory pattern is the lowering target for all three broken forms.

## Next
- [ ] Fix (c) fn-return markup hook (parse + emit) — smallest, self-contained.
- [ ] Fix (b) block-splitter RHS scan so markup-in-expr stays one block; emit lowering.
- [ ] Fix (a) interpolation emit lowering for markup in ternary arms.
- [ ] R26 verify all 3 + control; full suite; regression test.

## 2026-06-17 — RE-DISPATCH: forms (a)+(b) finished

Base main 268a27c5 (has form (c) primitive emitMarkupValueExpr + the salvage diff).

- Applied SALVAGE-form-ab-uncommitted.diff CLEANLY (git apply --check passed, no
  --3way needed): block-splitter.js scanShape12DeclEnd full-RHS markup scan +
  ast-builder.js sawTernaryAtRoot guard + parseExprWithMarkupValues +
  safeParseExprToNode markup-first dispatch.
- FIX 1 (declaration): added `let _inMarkupValueParse = false;` at the TOP of
  parseLogicBody (line ~2859, right after `let i = 0;`) — the re-entry guard the
  salvaged code referenced but never declared. Chose declare-not-strip: the guard
  IS needed (parseExprWithMarkupValues re-enters safeParseExprToNode on the
  placeholder skeleton; without the guard the skeleton's `__scrml_mv_N__` idents
  are markup-free so no infinite loop, but the guard is the documented contract
  and matches the `_tildeActive` closure-flag pattern already in the function).
- FIX 2 (emit integration): added MarkupValueExpr interface to types/ast.ts
  ExprNode union + `case "markup-value"` to emit-expr.ts emitExpr dispatch →
  `emitMarkupValueExpr(node.node)` (form-(c) primitive). This was the never-written
  EMIT layer.

R26 (all four, exit 0 / node --check PASS / real createElement / no raw `< span >`):
  (a) `<div>${ @n>0 ? <span>pos</span> : <span>neg</span> }</div>` — both arms emit
      IIFE-wrapped createElement markup-value in the ternary. PASS.
  (b) `const <badge> = @n>0 ? <span>pos</span> : <span>neg</span>` — derived factory
      `() => ternary-of-markup-value-IIFEs`; display wiring identical to control (d). PASS.
  (c) fn-return markup — regression, STILL passes (unchanged). PASS.
  (d) control bare-markup derived — STILL passes. PASS.

Regression test g-markup-value-in-expression.test.js: un-skipped (a)/(b), added
createTextNode pos+neg assertions (proves no dropped alternate arm). 4 pass / 0 fail.

NOTE (out of scope, pre-existing): forms (a)/(c)/(d) all emit `el.textContent =
<DOM node>` in the shared reactive-display wiring + a free-standing dead top-level
statement. Both artifacts are present in the ALREADY-LANDED form (c) and the
brief-designated control (d) — NOT introduced here. textContent-of-a-node coercion
is a display-wiring concern affecting all markup-valued interpolations equally;
form (b)'s derived-cell path is the clean shape. Surfaced for PA, not fixed here.

## 2026-06-17 — REGRESSION caught + fixed (full-suite gate)

The salvaged block-splitter markup-gobble was TOO BROAD: it diverted from the
legacy path on ANY markup in the expression RHS — including a SIBLING markup
element after a complete primary value. The stress-ghost-pattern-coverage harness
(35/0 at base) regressed to 31/4 with the raw salvage:
  - `<x> = 1<div>${@x === 1 ? …}</div>`  (=== strict-equality fixture)
  - `<x> = null<div>${@x}</div>`          (null-literal fixture)
  - `<x> = true<div class:active=@x>x</div>`  (class: directive regression-guard)
  - `<name> = ""<input bind:value=@name />` (bind:value regression-guard)
All four are SINGLE-LINE `<program>…</program>` files where the RHS value (1 /
null / true / "") completes and the following `<div>`/`<input>` is a SEPARATE
top-level element. Gobbling swallowed `</program>` into the decl text → E-CTX-003.

FIX (commit 7cadacab): at a top-level (bd===0 ad===0) markup opener, inspect the
nearest preceding non-ws char. Value-terminator (alphanumeric / _ / ) ] } /
quote) ⇒ RHS value already complete ⇒ sibling element ⇒ return -1 (legacy path).
Only gobble when the markup is in operand position (RHS head or after an operator
like ? : ( , = & |) — a genuine ternary arm. Verified:
  - stress-ghost-pattern-coverage: 35/0 restored.
  - markup-value (a)/(b)/(c)/(d): 4/0; R26 re-confirmed both ternary forms lower
    (createElement span + textNode pos/neg, node --check PASS, exit 0).
  - TodoMVC benchmark client.js: BYTE-IDENTICAL base-vs-mine (zero effect on
    existing non-markup-value code).

Pre-commit gate (unit+integration+conformance): 17137 pass / 0 fail / 90 skip.
Full `bun run test`: 24395 pass / 2 fail — both fails are the TodoMVC
dist-presence browser assertions (environmental: benchmarks/todomvc/dist not
built by pretest; pass 39/0 once compiled). within-node canary: NO OVER-BUDGET
line (corpus aggregate printed, no re-baseline needed).

Salvage applied CLEANLY (git apply --check passed; no --3way / no hand-reapply).
