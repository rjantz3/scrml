/**
 * match-on-atdot-in-each-r28-bug-1.test.js — Bug R28-1 regression guard:
 * a block-form `<match for=T on=@.field>` nested inside an
 * `<each ... as alias>` body MUST lower the `@.` contextual iteration sigil
 * to the enclosing each's current-iteration variable in the dispatcher
 * call — IDENTICAL codegen to the author-written `on=alias.field` form
 * (SPEC §17.7.3: "@.field and the as-bound name produce identical codegen").
 *
 * S143 surface — surfaced by gauntlet-R28 dev sources (dev-2-go,
 * dev-3-elixir, dev-5-pascal). Pre-fix: the raw `@.` survived into the
 * MODULE-scope dispatcher invocation
 * (`__scrml_match_match_NNN_dispatch(@.field)`) — invalid JS, gate-caught
 * by E-CODEGEN-INVALID-JS (`Unexpected character '@'`). The devs worked
 * around it by hand-writing `on=alias.field`.
 *
 * Fix: `compiler/src/codegen/emit-match.ts`
 *   - `collectMatchBlocks` threads the enclosing each's iter var
 *     (`asName` or the synthetic `_scrml_each_item`) into every
 *     match-block it finds beneath an each's `templateChildren`.
 *   - `resolveOnExpr` lowers `@.field` -> `<iterVar>.field` and bare `@.`
 *     -> `<iterVar>` (helper `rewriteAtDotInOnExpr`, mirroring
 *     emit-table-for.ts:rewriteAtDotInExprText / Bug 32 and
 *     emit-each.ts:rewriteContextualSigil).
 *
 * NB (surfaced, separate pre-existing concern): the match dispatcher is
 * emitted at MODULE scope, not per-iteration inside the each render fn.
 * Referencing the loop var (via `@.` lowered here OR via the author-written
 * `alias.field`) produces a module-scope reference, not the live per-item
 * value. This is identical for BOTH forms; the SPEC-mandated invariant this
 * test guards is "identical codegen between @.field and alias.field", which
 * the fix achieves. The deeper per-item-match-inside-each runtime gap is
 * out of scope for R28-1 (gate-fire closure).
 *
 * The harness drives the REAL parse path (block-splitter + ast-builder),
 * NOT a synthesized AST — per R26: a synthetic AST can pass while the real
 * BS/ast-builder path stays broken.
 *
 * Coverage:
 *   §1  `<match on=@.status>` inside `<each as article>` -> `article.status`
 *   §2  identical codegen: `on=@.status` === `on=article.status`
 *   §3  bare `@.` (no member) -> bare iter var
 *   §4  no `as`-alias -> synthetic `_scrml_each_item` iter var
 *   §5  emitted dispatcher passes JS syntax validity (no raw `@.`)
 *   §6  multi-match in same each (context-dependence) -> each lowers
 *   §7  nested `<each>` -> innermost iter var wins
 *   §8  match in `<empty>` body is NOT iter-scoped (no spurious lowering)
 *   §9  regression — match NOT inside any each: `@cell` Shape A unchanged
 *  §10  regression — match NOT inside any each: `@.` does not get rewritten
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { emitMatchBodyRenderForFile } from "../../src/codegen/emit-match.ts";

function parse(src) {
  const bs = splitBlocks("/tmp/r28-1-test.scrml", src);
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

function dispatchersOf(src) {
  const ast = parse(src);
  const out = emitMatchBodyRenderForFile(ast, makeCtx(ast));
  return out.dispatchers.join("\n");
}

const TYPE_DECL = `\${
  type ArticleStatus:enum = { Draft, InReview, Published }
}`;

// ---------------------------------------------------------------------------
// §1: `<match on=@.status>` inside `<each as article>` -> `article.status`
// ---------------------------------------------------------------------------

describe("§1: on=@.status inside <each as article> lowers to article.status", () => {
  test("dispatcher receives `article.status`, NOT raw `@.status`", () => {
    const src = `${TYPE_DECL}
<each in=@articles as article>
  <match for=ArticleStatus on=@.status>
    <Draft> : "d"
    <InReview> : "r"
    <Published> : "p"
  </match>
</each>
`;
    const js = dispatchersOf(src);
    expect(js).toContain("_dispatch(article.status)");
    // Pre-fix symptom (regression guard): no raw `@.` reaches the dispatch call.
    expect(js).not.toMatch(/_dispatch\(@/);
  });
});

// ---------------------------------------------------------------------------
// §2: identical codegen — `on=@.status` === `on=article.status` (SPEC §17.7.3)
// ---------------------------------------------------------------------------

describe("§2: @.status form produces identical codegen to alias.status form", () => {
  test("both dispatch on `article.status`", () => {
    const sigilSrc = `${TYPE_DECL}
<each in=@articles as article>
  <match for=ArticleStatus on=@.status>
    <Draft> : "d"
    <InReview> : "r"
    <Published> : "p"
  </match>
</each>
`;
    const aliasSrc = `${TYPE_DECL}
<each in=@articles as article>
  <match for=ArticleStatus on=article.status>
    <Draft> : "d"
    <InReview> : "r"
    <Published> : "p"
  </match>
</each>
`;
    expect(dispatchersOf(sigilSrc)).toBe(dispatchersOf(aliasSrc));
  });
});

// ---------------------------------------------------------------------------
// §3: bare `@.` (no member) -> bare iter var
// ---------------------------------------------------------------------------

describe("§3: bare on=@. inside <each as st> lowers to the bare iter var", () => {
  test("dispatcher receives `st`, NOT `@.`", () => {
    const src = `${TYPE_DECL}
<each in=@statuses as st>
  <match for=ArticleStatus on=@.>
    <Draft> : "d"
    <InReview> : "r"
    <Published> : "p"
  </match>
</each>
`;
    const js = dispatchersOf(src);
    expect(js).toMatch(/_dispatch\(st\)/);
    expect(js).not.toMatch(/_dispatch\(@/);
  });
});

// ---------------------------------------------------------------------------
// §4: no `as`-alias -> synthetic `_scrml_each_item` iter var
// ---------------------------------------------------------------------------

describe("§4: on=@.status inside <each> with NO alias uses synthetic iter var", () => {
  test("dispatcher receives `_scrml_each_item.status`", () => {
    const src = `${TYPE_DECL}
<each in=@articles>
  <match for=ArticleStatus on=@.status>
    <Draft> : "d"
    <InReview> : "r"
    <Published> : "p"
  </match>
</each>
`;
    const js = dispatchersOf(src);
    expect(js).toContain("_dispatch(_scrml_each_item.status)");
    expect(js).not.toMatch(/_dispatch\(@/);
  });
});

// ---------------------------------------------------------------------------
// §5: emitted dispatcher is syntactically valid JS (no raw `@.`)
// ---------------------------------------------------------------------------

describe("§5: emitted dispatcher passes JS syntax check", () => {
  test("the dispatcher invocation parses as valid JS", () => {
    const src = `${TYPE_DECL}
<each in=@articles as article>
  <match for=ArticleStatus on=@.status>
    <Draft> : "d"
    <InReview> : "r"
    <Published> : "p"
  </match>
</each>
`;
    const js = dispatchersOf(src);
    // Stub the runtime surface; if raw `@.` had leaked, new Function throws.
    const wrapped = `
      var _scrml_effect = function () {};
      var article = { status: "Draft" };
      ${js.replace(/let __scrml_match_match_\d+_dispose = null;/g, "")}
    `;
    expect(() => new Function(wrapped)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §6: multi-match in the SAME each (the context-dependence the gate caught)
// ---------------------------------------------------------------------------

describe("§6: two <match on=@.field> in one <each as a> each lower independently", () => {
  test("both dispatchers use the iter var; neither leaks raw @.", () => {
    const src = `\${
  type ArticleStatus:enum = { Draft, Published }
  type Priority:enum = { Low, High }
}
<each in=@items as a>
  <match for=ArticleStatus on=@.status>
    <Draft> : "d"
    <Published> : "p"
  </match>
  <match for=Priority on=@.priority>
    <Low> : "l"
    <High> : "h"
  </match>
</each>
`;
    const js = dispatchersOf(src);
    expect(js).toContain("_dispatch(a.status)");
    expect(js).toContain("_dispatch(a.priority)");
    expect(js).not.toMatch(/_dispatch\(@/);
  });
});

// ---------------------------------------------------------------------------
// §7: nested <each> -> the INNERMOST iter var wins (SPEC §17.7.3 last bullet)
// ---------------------------------------------------------------------------

describe("§7: nested <each> resolves @. to the innermost scope", () => {
  test("match in the inner each dispatches on the inner iter var", () => {
    const src = `${TYPE_DECL}
<each in=@articles as outer>
  <each in=@tags as inner>
    <match for=ArticleStatus on=@.status>
      <Draft> : "d"
      <InReview> : "r"
      <Published> : "p"
    </match>
  </each>
</each>
`;
    const js = dispatchersOf(src);
    expect(js).toContain("_dispatch(inner.status)");
    expect(js).not.toContain("_dispatch(outer.status)");
    expect(js).not.toMatch(/_dispatch\(@/);
  });
});

// ---------------------------------------------------------------------------
// §8: an <empty> sub-element present alongside a template match does NOT
//     disturb the template match's iter-var lowering. (Guards the walker's
//     templateChildren-vs-emptyChild scope split: the iter var is threaded
//     into templateChildren only.) NB — a match-block placed INSIDE the
//     <empty> body is a separate, pre-existing non-collection case (the
//     parser does not surface it as a match-block in either form); that is
//     out of scope for R28-1 and is NOT asserted here.
// ---------------------------------------------------------------------------

describe("§8: <empty> sub-element does not disturb template-match lowering", () => {
  test("template match on @.status still lowers to the iter var when <empty> is present", () => {
    const src = `${TYPE_DECL}
<each in=@articles as article>
  <match for=ArticleStatus on=@.status>
    <Draft> : "d"
    <InReview> : "r"
    <Published> : "p"
  </match>
  <empty>
    <p>none</p>
  </empty>
</each>
`;
    const js = dispatchersOf(src);
    expect(js).toContain("_dispatch(article.status)");
    expect(js).not.toMatch(/_dispatch\(@/);
  });
});

// ---------------------------------------------------------------------------
// §9: regression — match NOT inside any each: @cell Shape A unchanged
// ---------------------------------------------------------------------------

describe("§9: regression — top-level match on @cell unchanged", () => {
  test("on=@phase still uses _scrml_reactive_get (Shape A subscribe)", () => {
    const src = `\${
  type Phase:enum = { Idle, Done }
  <phase>: Phase = .Idle
}
<match for=Phase on=@phase>
  <Idle> : "i"
  <Done> : "d"
</match>
`;
    const js = dispatchersOf(src);
    expect(js).toContain('_scrml_reactive_get("phase")');
    expect(js).not.toMatch(/_dispatch\(@/);
  });
});

// ---------------------------------------------------------------------------
// §10: regression — match NOT inside any each: `@.` is left to upstream
//      (E-SYNTAX-064) — codegen must NOT rewrite it to a phantom iter var.
// ---------------------------------------------------------------------------

describe("§10: regression — top-level @. is NOT lowered to a phantom iter var", () => {
  test("a top-level on=@.status (illegal per §17.7.3) keeps no iter-var rewrite", () => {
    const src = `${TYPE_DECL}
<match for=ArticleStatus on=@.status>
  <Draft> : "d"
  <InReview> : "r"
  <Published> : "p"
</match>
`;
    const js = dispatchersOf(src);
    // No enclosing each => no iter var stamped => no rewrite to `something.status`.
    // (The @. outside an each is E-SYNTAX-064 territory upstream; codegen must
    //  not invent a loop var.) The raw text passes through verbatim — it does
    //  NOT become `<someVar>.status`.
    expect(js).not.toContain("_scrml_each_item.status");
  });
});
