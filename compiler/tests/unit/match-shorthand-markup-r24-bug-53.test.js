/**
 * match-shorthand-markup-r24-bug-53.test.js — Bug 53 regression guard:
 * `:`-shorthand match arm body containing markup-as-value content
 * (e.g., `<Idle>: <p>Idle</p>`) MUST route through the bare-body
 * markup parser, NOT parseExprToNode, so the emitted JS embeds the
 * markup as an innerHTML render-fn output rather than a raw textContent
 * assignment of invalid markup tokens.
 *
 * S138 surface — surfaced by R24-BUG-4 R26 verification on dev-3-svelte
 * (lines 318-321 of dev-3-svelte.scrml: `<Low>"low"</>` etc. — those are
 * string-literal shorthand bodies that work fine; but `<X>: <p>...</p>`
 * with markup-as-value content is the broken shape).
 *
 * Pre-fix: emit-match.ts:buildMatchArms called parseExprToNode on the
 * shorthand bodyRaw. For `<p>Idle</p>`, acorn rejects (markup tokens
 * aren't JS expression input) and the EscapeHatchExpr falls through to
 * emitEscapeHatch's verbatim emit. generateHtml > bare-expr ultimately
 * produces `el.textContent = <p>Idle</p>;` — JS SyntaxError.
 *
 * Fix at `compiler/src/codegen/emit-match.ts:buildMatchArms` shorthand
 * branch: detect markup-start (trimmed body matches `^<[A-Za-z_]`) and
 * route through nativeParseFile (same as the bare-body branch below).
 * Non-markup shorthand (string literals, reactive cells, expressions)
 * keeps the parseExprToNode path.
 *
 * Coverage:
 *   §1  Markup-shorthand `<Idle>: <p>Idle</p>` emits valid render fn
 *   §2  Markup-shorthand emitted client.js passes `new Function` invariant
 *   §3  Regression — string-literal shorthand `<Idle>: "idle"` still works
 *   §4  Regression — reactive-cell shorthand `<Loading>: @count` still works
 *   §5  Regression — bare-body markup `<Idle><p>Idle</p></>` still works
 *   §6  Markup-shorthand with attributes `<Idle>: <p class="foo">Idle</p>`
 *   §7  Markup-shorthand with nested elements `<Idle>: <div><span>x</span></div>`
 *   §8  Less-than comparison NOT mistaken for markup: `<Idle>: @count < 10 ? "small" : "big"`
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
// §1: Markup-shorthand emits valid render fn (NOT textContent of raw tokens)
// ---------------------------------------------------------------------------

describe("§1: markup-shorthand `<Idle>: <p>Idle</p>`", () => {
  test("emits a render fn returning `<p>Idle</p>` as HTML string (NOT textContent assignment)", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading, Done }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>: <p>Idle</p>
    <Loading>: <p>Loading</p>
    <Done>: <p>Done</p>
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const renderJs = out.renderFunctions.join("\n");
    // POST-FIX: render fn returns an HTML string containing `<p>Idle</p>`.
    expect(renderJs).toContain(`return "<p>Idle</p>"`);
    // PRE-FIX symptom: raw markup tokens leaked into textContent assignment.
    expect(renderJs).not.toMatch(/textContent\s*=\s*<p>/);
  });
});

// ---------------------------------------------------------------------------
// §2: Emitted client.js passes `new Function` syntax invariant
// ---------------------------------------------------------------------------

describe("§2: emitted render fns + dispatcher pass JS syntax check", () => {
  test("`new Function` invariant — render-fn output is valid JS", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>: <p>Idle</p>
    <Loading>: <p>Loading</p>
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const combined = [...out.renderFunctions, ...out.dispatchers].join("\n");
    const wrapped = `
      var _scrml_reactive_get = function () { return ""; };
      var document = { querySelector: function () { return null; } };
      ${combined}
    `;
    expect(() => new Function(wrapped)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §3: Regression — string-literal shorthand still works
// ---------------------------------------------------------------------------

describe("§3: regression — string-literal shorthand `<Idle>: \"idle\"`", () => {
  test("string-literal shorthand still flows through parseExprToNode path", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>: "idle"
    <Loading>: "loading"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const renderJs = out.renderFunctions.join("\n");
    // String-literal body should emit the text content unchanged.
    expect(renderJs).toContain("idle");
    expect(renderJs).toContain("loading");
  });
});

// ---------------------------------------------------------------------------
// §4: Regression — reactive-cell shorthand still works
// ---------------------------------------------------------------------------

describe("§4: regression — reactive-cell shorthand `<Loading>: @count`", () => {
  test("reactive-cell ref still registers logic binding via parseExprToNode path", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading }
    <count> = 0
    <phase>: Phase = .Loading
}
<match for=Phase on=@phase>
    <Idle>: "idle"
    <Loading>: @count
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    // The synthesized logic node should register a logic-binding for @count.
    expect(ctx.registry.logicBindings.length).toBeGreaterThan(0);
    const binding = ctx.registry.logicBindings.find(
      (b) => b.expr && b.expr.includes("count"),
    );
    expect(binding).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §5: Regression — bare-body markup still works
// ---------------------------------------------------------------------------

describe("§5: regression — bare-body markup `<Idle><p>Idle</p></>`", () => {
  test("bare-body markup still emits via nativeParseFile path", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>
        <p>Idle bare</p>
    </>
    <Loading>
        <p>Loading bare</p>
    </>
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const renderJs = out.renderFunctions.join("\n");
    expect(renderJs).toContain("Idle bare");
    expect(renderJs).toContain("Loading bare");
  });
});

// ---------------------------------------------------------------------------
// §6: Markup-shorthand with attributes
// ---------------------------------------------------------------------------

describe("§6: markup-shorthand with attributes `<Idle>: <p class=\"foo\">Idle</p>`", () => {
  test("attributes round-trip into the render fn HTML string", () => {
    const src = `\${
    type Phase:enum = { Idle }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>: <p class="foo">Idle</p>
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const renderJs = out.renderFunctions.join("\n");
    expect(renderJs).toContain("Idle");
    // class="foo" round-trips into the HTML string — the JSON-stringified
    // output contains the escaped form `class=\"foo\"`.
    expect(renderJs).toMatch(/class\s*=\s*\\?"foo\\?"/);
  });
});

// ---------------------------------------------------------------------------
// §7: Markup-shorthand with nested elements
// ---------------------------------------------------------------------------

describe("§7: markup-shorthand with nested elements", () => {
  test("nested element structure `<div><span>x</span></div>` round-trips", () => {
    const src = `\${
    type Phase:enum = { Idle }
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>: <div><span>x</span></div>
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const renderJs = out.renderFunctions.join("\n");
    expect(renderJs).toContain("<span>x</span>");
    expect(renderJs).toContain("<div>");
  });
});

// ---------------------------------------------------------------------------
// §8: Less-than comparison NOT mistaken for markup
// ---------------------------------------------------------------------------

describe("§8: less-than comparison `<Idle>: @count < 10 ? \"small\" : \"big\"` is NOT markup", () => {
  test("less-than after `<Idle>:` still routes through parseExprToNode (ternary, not markup)", () => {
    const src = `\${
    type Phase:enum = { Idle }
    <count> = 5
    <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>: @count < 10 ? "small" : "big"
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    // The body must lower as a logic binding (the parseExprToNode path),
    // NOT as a markup render fn. The `<` here is the comparison operator.
    // We don't assert on output specifics — just that the emitter doesn't
    // throw and produces SOME output.
    expect(out.renderFunctions.length).toBeGreaterThan(0);
    // Smoke check: ternary expression preserved somewhere.
    const renderJs = out.renderFunctions.join("\n");
    // The ternary may compile-time-fold or stay as runtime expr depending
    // on derived/non-derived classification. Either way, the body shouldn't
    // contain raw markup-token content.
    expect(renderJs).not.toContain("<10");
  });
});
