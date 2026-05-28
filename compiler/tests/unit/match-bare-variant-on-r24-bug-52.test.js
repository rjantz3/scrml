/**
 * match-bare-variant-on-r24-bug-52.test.js — Bug 52 regression guard:
 * `<match for=Type on=.BareVariant>` codegen MUST lower the bare-variant
 * `.High` form to its runtime string-tag representation `"High"`.
 *
 * S138 surface — surfaced by R24-BUG-4 R26 verification on dev-3-svelte
 * source line 209 (`<match for=Priority on=.High>`). Pre-fix: the bare
 * `.High` fell through `resolveOnExpr`'s recognition cases to the
 * "complex expression" fall-through and was emitted verbatim as
 * `__scrml_match_match_NN_dispatch(.High)` — syntactically invalid JS
 * (`.High` is scrml source syntax, not runtime JS; `node --check` fails).
 *
 * Fix: `compiler/src/codegen/emit-match.ts:resolveOnExpr` adds a 5th
 * branch detecting `.Variant` shape (matching `^\.[A-Z][A-Za-z0-9_$]*$`)
 * and lowering to `JSON.stringify(name)` — mirrors the canonical
 * bare-variant lowering at `compiler/src/codegen/emit-expr.ts:emitIdent`
 * lines 291-303 (unit variants store as bare string tags at runtime).
 *
 * The dispatch helper's `_tag` extraction handles the string form
 * directly: `_tag = (typeof _v === "object" ...) ? _v.variant : _v` →
 * for the string `"High"`, `_tag = _v = "High"` matches the
 * `_tag === "High"` dispatch branch.
 *
 * NB: constant `on=.Variant` is a shape-degenerate case (always
 * dispatches to one branch) — adopters typically wouldn't write this
 * deliberately, but the form is syntactically legal per SPEC §18.0.1
 * and the compiler must produce valid output. dev-3-svelte's R24 source
 * was likely intended to be `on=@selectedPriority` (reactive cell ref).
 *
 * Coverage:
 *   §1  Bare-variant `on=.High` — lowers to `"High"` string accessor
 *   §2  Bare-variant `on=.Variant` — emitted JS passes `node --check`
 *   §3  Bare-variant via `${...}` wrap (`on=${.High}`) — same lowering path
 *   §4  Bare-variant with single-letter variant `on=.A` — lowers correctly
 *   §5  Bare-variant with mixed-case variant `on=.MyVariant` — lowers correctly
 *   §6  Regression — `@cellRef` still works (Shape A subscribe)
 *   §7  Regression — `Priority.High` qualified form still works
 *   §8  Regression — `${complex}` expression still works (Shape B effect)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { emitMatchBodyRenderForFile } from "../../src/codegen/emit-match.ts";

function parse(src) {
  const bs = splitBlocks("/tmp/test.scrml", src);
  const tab = buildAST(bs, null);
  return tab.ast;
}

function makeCtx(fileAST) {
  return {
    fileAST,
    errors: [],
    csrfEnabled: false,
    registry: {
      logicBindings: [],
      eventBindings: [],
      pushArmContext: () => {},
      popArmContext: () => {},
      addLogicBinding(b) { this.logicBindings.push(b); },
      addEventBinding(b) { this.eventBindings.push(b); },
    },
    derivedNames: new Set(),
    encodingCtx: null,
  };
}

// ---------------------------------------------------------------------------
// §1: Bare-variant `on=.High` lowers to JSON-stringified tag in dispatch call
// ---------------------------------------------------------------------------

describe("§1: bare-variant `on=.High` lowers to string tag", () => {
  test("dispatcher receives `\"High\"` (string), NOT `.High` (raw scrml)", () => {
    const src = `\${
    type Priority:enum = { High, Med, Low }
}
<match for=Priority on=.High>
    <High> : "high"
    <Med> : "med"
    <Low> : "low"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const dispatcherJs = out.dispatchers.join("\n");
    // POST-FIX: dispatcher invocation uses the JSON-stringified tag.
    expect(dispatcherJs).toContain(`_dispatch("High")`);
    // PRE-FIX symptom (regression guard): no literal `.High` reaching the
    // dispatch call.
    expect(dispatcherJs).not.toMatch(/_dispatch\(\.High\)/);
  });
});

// ---------------------------------------------------------------------------
// §2: Emitted JS is syntactically valid (node --check semantic)
// ---------------------------------------------------------------------------

describe("§2: emitted dispatcher passes JS syntax check", () => {
  test("the dispatcher invocation parses as valid JS", () => {
    const src = `\${
    type Priority:enum = { High, Med, Low }
}
<match for=Priority on=.High>
    <High> : "high"
    <Med> : "med"
    <Low> : "low"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const dispatcherJs = out.dispatchers.join("\n");
    // Synthesize a callable shape around the dispatcher snippet to check
    // for JS syntax validity. The dispatcher uses `_scrml_effect` which we
    // stub to a no-op. If `dispatch(.High)` had leaked, `new Function`
    // would throw a SyntaxError.
    const wrapped = `
      var _scrml_effect = function () {};
      var __scrml_match_match_6_dispatch = function () {};
      ${dispatcherJs}
    `;
    expect(() => new Function(wrapped)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §3: Bare-variant inside `${...}` wrap — same lowering
// ---------------------------------------------------------------------------

describe("§3: bare-variant inside `${.Variant}` wrap", () => {
  test("`on=${.Med}` still lowers correctly via the inner-expr path", () => {
    const src = `\${
    type Priority:enum = { High, Med, Low }
}
<match for=Priority on=\${.Med}>
    <High> : "high"
    <Med> : "med"
    <Low> : "low"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const dispatcherJs = out.dispatchers.join("\n");
    expect(dispatcherJs).toContain(`_dispatch("Med")`);
    expect(dispatcherJs).not.toMatch(/_dispatch\(\.Med\)/);
  });
});

// ---------------------------------------------------------------------------
// §4: Single-letter variant — `on=.A`
// ---------------------------------------------------------------------------

describe("§4: single-letter bare-variant `on=.A`", () => {
  test("`on=.A` lowers to `\"A\"`", () => {
    const src = `\${
    type Shape:enum = { A, B, C }
}
<match for=Shape on=.A>
    <A> : "a"
    <B> : "b"
    <C> : "c"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const dispatcherJs = out.dispatchers.join("\n");
    expect(dispatcherJs).toContain(`_dispatch("A")`);
  });
});

// ---------------------------------------------------------------------------
// §5: Mixed-case multi-char variant — `on=.MyVariant`
// ---------------------------------------------------------------------------

describe("§5: mixed-case multi-char bare-variant `on=.MyVariant`", () => {
  test("`on=.MyVariant` lowers to `\"MyVariant\"`", () => {
    const src = `\${
    type X:enum = { MyVariant, Other }
}
<match for=X on=.MyVariant>
    <MyVariant> : "mv"
    <Other> : "ot"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const dispatcherJs = out.dispatchers.join("\n");
    expect(dispatcherJs).toContain(`_dispatch("MyVariant")`);
  });
});

// ---------------------------------------------------------------------------
// §6: Regression — `@cellRef` still works (Shape A subscribe)
// ---------------------------------------------------------------------------

describe("§6: regression — `on=@cellRef` still uses _scrml_reactive_get", () => {
  test("`on=@phase` registers reactive subscribe + `_scrml_reactive_get` accessor", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle> : "idle"
    <Done> : "done"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const dispatcherJs = out.dispatchers.join("\n");
    // Shape A: dispatcher should reference _scrml_reactive_get("phase")
    expect(dispatcherJs).toContain(`_scrml_reactive_get("phase")`);
    // No bare-variant lowering should occur (this is a cell ref, not a variant)
    expect(dispatcherJs).not.toMatch(/_dispatch\("phase"\)/);
  });
});

// ---------------------------------------------------------------------------
// §7: Regression — `Priority.High` qualified form still works
// ---------------------------------------------------------------------------

describe("§7: regression — `on=Priority.High` qualified form (fall-through path)", () => {
  test("qualified `Priority.High` passes through verbatim (Shape B effect mode)", () => {
    const src = `\${
    type Priority:enum = { High, Med, Low }
}
<match for=Priority on=Priority.High>
    <High> : "h"
    <Med> : "m"
    <Low> : "l"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const dispatcherJs = out.dispatchers.join("\n");
    // Qualified form falls through to Shape B; dispatcher receives the
    // unmodified `Priority.High` expression (which resolves to "High" at
    // runtime via emitEnumVariantObjects's `Object.freeze({ High: "High", ... })`).
    expect(dispatcherJs).toContain(`_dispatch(Priority.High)`);
    // NOT lowered to a string literal at codegen (that's the runtime
    // enum-object's job, not the bare-variant regex's).
    expect(dispatcherJs).not.toMatch(/_dispatch\("High"\)/);
  });
});

// ---------------------------------------------------------------------------
// §8: Regression — `${complex}` expression still works (Shape B effect)
// ---------------------------------------------------------------------------

describe("§8: regression — complex `${expr}` still Shape B", () => {
  test("`on=${someFn()}` falls through to Shape B effect-mode emission", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    function pick() { return .Idle }
}
<match for=Phase on=\${pick()}>
    <Idle> : "i"
    <Done> : "d"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const dispatcherJs = out.dispatchers.join("\n");
    // Complex expression preserved as-is — no bare-variant misfire,
    // no reactive-subscribe misfire.
    expect(dispatcherJs).toMatch(/_dispatch\(pick\(\)\)/);
  });
});
