/**
 * Kickstarter v2 §3 smoke tests — Phase A1a Step 11
 *
 * Smoke-tests the canonical scrml example corpus from
 * `docs/articles/llm-kickstarter-v2-2026-05-04.md` §3 (V5-strict access model)
 * + §3.1 (the three RHS shapes), exercising:
 *
 *   - Shape 1 plain reactive cell                       (`<count> = 0`)
 *   - Shape 2 decl-coupled-with-render-spec             (`<userName req length(>=2)> = <input/>`)
 *   - Shape 3 derived (`const <derived> = expr`)        (numeric, string, markup-typed)
 *   - `default=` attribute (Step 6)                     (`<startTime default=null> = ...`)
 *   - V5-strict access cluster (decl + read + write)    (`@count = @count + 1` in fns)
 *   - Render-by-tag use site                            (`<userName/>` in markup)
 *   - Compound field-write inside fns                   (`@formRes.error = msg`)
 *
 * **Step 11 is verification + tests only — no source changes.** All positive
 * tests assert the AST shape contract from Steps 4-10. Every positive test
 * also fires the `assertNoHtmlFragmentMatching` anti-test guard (the
 * deceptive-success pattern from PARSER-AUDIT §C.1 / §G.1).
 *
 * **Two MAJOR divergences detected during Step 11 survey** (see progress.md):
 *
 *   §K11.X-DIVERGENCE-1 — Variant C compound `<formRes><name>=""<email>=""</>`
 *     parses as `html-fragment` text today. Step 2 progress.md lines 93-98
 *     + 223-228 deferred compound-block recognition to Step 11, but the BRIEF
 *     for Step 11 (drafted earlier) said "verification only — no source
 *     changes expected." The actual recognizer extension lives in a follow-up
 *     step PA owns. This file MEMORIALIZES today's broken behavior via an
 *     anti-test with a TODO marker — when the recognizer lands, this test
 *     MUST be inverted (positive shape assertion) and the TODO removed.
 *
 *   §K11.X-DIVERGENCE-2 — Multi-decl using newlines as separators (sibling
 *     state-decls) is NOT recognized today: `<a>=0\n<b>=1` parses as a single
 *     state-decl `a` with `init = "0\n< b > = 1"`. Semicolons work; newlines
 *     don't. The kickstarter v2 §3 corpus uses newlines extensively. This
 *     file MEMORIALIZES today's broken behavior via an anti-test; when fixed,
 *     it MUST be inverted.
 *
 * **Render-by-tag (BRIEF §1.2) WORKS today.** Parser produces a markup AST
 * node tagged with the cell name. The actual render-spec EXPANSION (rewriting
 * `<userName/>` → `<input bind:value=...>`) is A1c work — out of scope here.
 *
 * **Spec authority:**
 *   §6.1 / §6.2 / §6.3 / §6.4   — V5-strict, RHS shapes, compound, render-by-tag
 *   §AST-CONTRACTS-AND-DECOMPOSITION §1.1 / §1.2 — state-decl + render-spec
 *   §kickstarter-v2 §3 / §3.1   — canonical example corpus
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

/** Walk an AST recursively and collect every node with `kind === target`. */
function findKind(ast, target) {
  const out = [];
  const seen = new WeakSet();
  function walk(n) {
    if (!n || typeof n !== "object" || seen.has(n)) return;
    seen.add(n);
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.kind === target) out.push(n);
    for (const k of Object.keys(n)) {
      if (k === "span" || k === "parent" || k === "block") continue;
      walk(n[k]);
    }
  }
  walk(ast);
  return out;
}

/**
 * Anti-test helper: assert no html-fragment node's `content` matches the
 * given regex. Catches the deceptive-success pattern where `<count>=0`
 * compiles clean but parses as raw text.
 */
function assertNoHtmlFragmentMatching(ast, regex) {
  const fragments = findKind(ast, "html-fragment");
  for (const f of fragments) {
    expect(f.content || "").not.toMatch(regex);
  }
}

// =============================================================================
// §K11.1 — V5-strict access model cluster (kickstarter v2 §3 lines 145-164)
// =============================================================================
//
// Distilled cluster: `<count> = 0` declaration + `inc`/`clear` functions
// reading and writing `@count`. The kickstarter source uses newline-only
// separators between functions, which works (decl-then-fn separation works);
// what does NOT work is sibling state-decl-then-state-decl with newline
// separator (see §K11.X-DIVERGENCE-2 below).
//
// We exercise the working semicolon-separated form here for ALL three
// statements + an extra `function describe()` body that includes a `let count`
// local (which today does NOT trigger E-NAME-COLLIDES-STATE — A1b territory).
// The function name `reset` from the kickstarter source is paraphrased to
// `clear` to dodge E-RESERVED-IDENTIFIER (the kickstarter intentionally
// shows that error firing; we test parser-shape, not error firing).
// =============================================================================

describe("Kickstarter v2 §3 K11.1 — V5-strict access cluster", () => {
  test("§K11.1: <count>=0 + 3 functions all parse to correct shapes (semicolon-separated)", () => {
    const src = `<program>\${ <count> = 0; function inc() { @count = @count + 1 }; function clear() { @count = 0 }; function describe() { let count = "five" } }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);

    const stateDecls = findKind(ast, "state-decl");
    const fns = findKind(ast, "function-decl");
    const lets = findKind(ast, "let-decl");

    // The structural <count>=0 outer decl + the two inner @-form re-assigns
    // (`@count = @count + 1` and `@count = 0`) are all ALSO captured as
    // state-decl nodes in inc()/clear() body — because the legacy @-form
    // recognition produces state-decl too (Step 2 progress confirmed this).
    // So we expect: 1 outer (struct) + 2 inner (legacy @-form) = 3 state-decls.
    expect(stateDecls.length).toBe(3);
    const outer = stateDecls.find((d) => d.structuralForm === true);
    expect(outer).toBeDefined();
    expect(outer.name).toBe("count");
    expect(outer.shape).toBe("plain");
    expect(outer.isConst).toBe(false);

    // Three function declarations: inc, clear, describe
    expect(fns.length).toBe(3);
    const fnNames = fns.map((f) => f.name).sort();
    expect(fnNames).toEqual(["clear", "describe", "inc"]);

    // describe() has `let count = "five"` — the local. A1b will fire
    // E-NAME-COLLIDES-STATE here later; for parser-shape we just check
    // the let-decl exists.
    const localCount = lets.find((l) => l.name === "count");
    expect(localCount).toBeDefined();
    expect(localCount.init).toContain("five");

    // Anti-test: the entire source must NOT collapse to html-fragment
    assertNoHtmlFragmentMatching(ast, /<\s*count\s*>/);
  });
});

// =============================================================================
// §K11.2 — Three RHS shapes triplet (kickstarter v2 §3.1 lines 203-220)
// =============================================================================
//
// kickstarter v2 §3.1 shows the three RHS shapes side-by-side. We split into
// per-shape single-decl probes (because newline-separated multi-decl breaks
// today, see §K11.X-DIVERGENCE-2). The per-shape single-decl form IS the
// minimal smoke that confirms each kickstarter §3.1 example shape is parseable.
// =============================================================================

describe("Kickstarter v2 §3.1 K11.2 — three RHS shapes", () => {
  // Shape 1 — plain reactive cells. Each is a separate single-decl block.
  test("§K11.2a Shape 1 plain numeric: <count> = 0", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    expect(decls[0].name).toBe("count");
    expect(decls[0].shape).toBe("plain");
    expect(decls[0].structuralForm).toBe(true);
    expect(decls[0].isConst).toBe(false);
    assertNoHtmlFragmentMatching(ast, /<\s*count\s*>/);
  });

  test("§K11.2b Shape 1 plain string: <name> = \"\"", () => {
    const src = `<program>\${ <name> = "" }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    expect(decls[0].name).toBe("name");
    expect(decls[0].shape).toBe("plain");
    assertNoHtmlFragmentMatching(ast, /<\s*name\s*>/);
  });

  test("§K11.2c Shape 1 plain array: <items> = []", () => {
    const src = `<program>\${ <items> = [] }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    expect(decls[0].name).toBe("items");
    expect(decls[0].shape).toBe("plain");
    assertNoHtmlFragmentMatching(ast, /<\s*items\s*>/);
  });

  // Shape 2 — decl-coupled-with-render-spec
  test("§K11.2d Shape 2: <userName req length(>=2)> = <input type=\"text\"/>", () => {
    const src = `<program>\${ <userName req length(>=2)> = <input type="text"/> }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    const d = decls[0];
    expect(d.name).toBe("userName");
    expect(d.shape).toBe("decl-with-spec");
    expect(d.structuralForm).toBe(true);
    expect(d.isConst).toBe(false);
    expect(d.initExpr).toBeNull();
    expect(d.renderSpec).toBeDefined();
    expect(d.renderSpec.kind).toBe("render-spec");
    expect(d.renderSpec.element.kind).toBe("markup");
    expect(d.renderSpec.element.tag).toBe("input");
    // Validators: req (bareword) + length(>=2) (call-form)
    expect(Array.isArray(d.validators)).toBe(true);
    expect(d.validators.length).toBe(2);
    const reqV = d.validators.find((v) => v.name === "req");
    const lenV = d.validators.find((v) => v.name === "length");
    expect(reqV).toBeDefined();
    expect(reqV.args).toBeNull();
    expect(lenV).toBeDefined();
    expect(Array.isArray(lenV.args)).toBe(true);
    expect(lenV.args.length).toBe(1);
    expect(lenV.args[0]).toContain(">=");
    expect(lenV.args[0]).toContain("2");
    assertNoHtmlFragmentMatching(ast, /<\s*userName/);
  });

  test("§K11.2e Shape 2 checkbox: <agree req> = <input type=\"checkbox\"/>", () => {
    const src = `<program>\${ <agree req> = <input type="checkbox"/> }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    const d = decls[0];
    expect(d.name).toBe("agree");
    expect(d.shape).toBe("decl-with-spec");
    expect(d.validators.length).toBe(1);
    expect(d.validators[0].name).toBe("req");
    expect(d.renderSpec.element.tag).toBe("input");
    assertNoHtmlFragmentMatching(ast, /<\s*agree/);
  });

  // Shape 3 — derived (read-only)
  test("§K11.2f Shape 3 numeric derived: const <doubled> = @count * 2", () => {
    const src = `<program>\${ <count> = 0; const <doubled> = @count * 2 }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(2);
    const doubled = decls.find((d) => d.name === "doubled");
    expect(doubled).toBeDefined();
    expect(doubled.shape).toBe("derived");
    expect(doubled.structuralForm).toBe(true);
    expect(doubled.isConst).toBe(true);
    expect(doubled.init).toContain("@count");
    assertNoHtmlFragmentMatching(ast, /<\s*doubled\s*>/);
  });

  test("§K11.2g Shape 3 string derived: const <greeting> = \"Hello, \" + @userName", () => {
    const src = `<program>\${ <userName> = ""; const <greeting> = "Hello, " + @userName }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(2);
    const greeting = decls.find((d) => d.name === "greeting");
    expect(greeting).toBeDefined();
    expect(greeting.shape).toBe("derived");
    expect(greeting.isConst).toBe(true);
    expect(greeting.init).toContain("Hello");
    expect(greeting.init).toContain("@userName");
    assertNoHtmlFragmentMatching(ast, /<\s*greeting\s*>/);
  });

  test("§K11.2h Shape 3 markup-typed derived: const <badge> = <span class=\"badge\">${@userName}</span>", () => {
    const src = `<program>\${ <userName> = <input type="text"/>; const <badge> = <span class="badge">\${@userName}</span> }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(2);
    const badge = decls.find((d) => d.name === "badge");
    expect(badge).toBeDefined();
    // Markup-typed derived: parser routes it to shape:"decl-with-spec" today
    // (renderSpec wraps the markup). This is consistent with how Step 5's
    // Shape 2 routes any markup-RHS form. The semantic distinction between
    // "Shape 2 decl-coupled-with-render-spec" (bindable input markup) and
    // "Shape 3 markup-typed derived" (display markup) is A1b's job — A1b
    // checks for `isConst` to discriminate. Today both share the same kind.
    expect(["decl-with-spec", "derived"]).toContain(badge.shape);
    expect(badge.isConst).toBe(true);
    expect(badge.structuralForm).toBe(true);
    assertNoHtmlFragmentMatching(ast, /<\s*badge\s*>/);
  });
});

// =============================================================================
// §K11.2i — Plain JS const vs reactive derived (kickstarter v2 §3.1 lines 234-237)
// =============================================================================
//
// Kickstarter v2 §3.1 explicitly contrasts the two forms side-by-side:
//   const items = [{name: "apple"}]                // plain JS const, bare-name
//   const <filteredItems> = items.filter(...)      // reactive derived cell, @-access
//
// Single-decl-per-block is needed (newline-separation between siblings broken,
// §K11.X-DIVERGENCE-2). Semicolon mode is the canonical working form.
// =============================================================================

describe("Kickstarter v2 §3.1 K11.2i — plain JS const vs reactive derived", () => {
  test("§K11.2i-a: `const items = [...]` produces const-decl (NOT state-decl)", () => {
    const src = `<program>\${ const items = [{name: "apple"}, {name: "banana"}] }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const stateDecls = findKind(ast, "state-decl");
    const constDecls = findKind(ast, "const-decl");
    expect(stateDecls.length).toBe(0);
    expect(constDecls.length).toBe(1);
    expect(constDecls[0].name).toBe("items");
    // Plain const: shape field NOT set (it's not a state-decl)
    expect(constDecls[0].shape).toBeUndefined();
  });

  test("§K11.2i-b: const items + const <filteredItems> coexist as different kinds", () => {
    const src = `<program>\${ const items = [1,2,3]; const <filteredItems> = items.filter(x => x > 1) }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const stateDecls = findKind(ast, "state-decl");
    const constDecls = findKind(ast, "const-decl");
    // Plain const → const-decl
    expect(constDecls.length).toBe(1);
    expect(constDecls[0].name).toBe("items");
    // Reactive derived → state-decl shape:"derived" isConst:true
    expect(stateDecls.length).toBe(1);
    const filtered = stateDecls[0];
    expect(filtered.name).toBe("filteredItems");
    expect(filtered.shape).toBe("derived");
    expect(filtered.structuralForm).toBe(true);
    expect(filtered.isConst).toBe(true);
    // init is whitespace-normalized post-tokenizer (`a.b` → `a . b`)
    expect(filtered.init.replace(/\s+/g, "")).toContain("items.filter");
    assertNoHtmlFragmentMatching(ast, /<\s*filteredItems\s*>/);
  });
});

// =============================================================================
// §K11.3 — `default=` attribute (kickstarter v2 §3.1 lines 242-244 + Step 6)
// =============================================================================

describe("Kickstarter v2 §3.1 K11.3 — default= attribute", () => {
  test("§K11.3a <startTime default=null> = 0 carries defaultExpr", () => {
    const src = `<program>\${ <startTime default=null> = 0 }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    const d = decls[0];
    expect(d.name).toBe("startTime");
    expect(d.shape).toBe("plain");
    expect(d.structuralForm).toBe(true);
    // Step 6 contract: defaultExpr field on the decl
    expect(d.defaultExpr).toBeDefined();
    expect(d.defaultExpr).not.toBeNull();
    assertNoHtmlFragmentMatching(ast, /<\s*startTime/);
  });

  test("§K11.3b <retries default=0> = 0 carries defaultExpr", () => {
    const src = `<program>\${ <retries default=0> = 0 }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    expect(decls[0].name).toBe("retries");
    expect(decls[0].defaultExpr).toBeDefined();
    assertNoHtmlFragmentMatching(ast, /<\s*retries/);
  });
});

// =============================================================================
// §K11.4 — Render-by-tag use site (BRIEF §1.2 + SPEC §6.4)
// =============================================================================
//
// **WORKS today.** `<userName/>` in markup parses to a markup AST node with
// tag matching the cell name. The render-spec EXPANSION (`<userName/>` →
// `<input bind:value=@userName ...>`) is A1c work — out of scope here.
// =============================================================================

describe("Kickstarter v2 BRIEF §1.2 K11.4 — render-by-tag use site", () => {
  test("§K11.4a <userName/> in markup produces markup node with tag=userName", () => {
    const src = `<program>\${ <userName req length(>=2)> = <input type="text"/> }<form><userName/></form></program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    // Decl side: the Shape 2 cell is recognized
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    expect(decls[0].name).toBe("userName");
    expect(decls[0].shape).toBe("decl-with-spec");
    // Use side: a markup node with tag="userName" appears inside <form>
    const markups = findKind(ast, "markup");
    const userNameUseSite = markups.filter((m) => m.tag === "userName");
    // One markup tag (from <userName/> use site) + the <input> in renderSpec
    // also has tag='input'. We just confirm at least one userName-tagged
    // markup node exists (the use-site one).
    expect(userNameUseSite.length).toBeGreaterThanOrEqual(1);
    // Confirm a <form> wraps it (use-site context)
    const forms = markups.filter((m) => m.tag === "form");
    expect(forms.length).toBe(1);
    assertNoHtmlFragmentMatching(ast, /<\s*userName/);
  });

  test("§K11.4b bare <userName/> in markup produces markup node (no decl needed)", () => {
    // Render-by-tag at parse level doesn't require the decl to exist;
    // A1b/A1c will validate. Step 11 only confirms parse-shape.
    const src = `<program><userName/></program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const markups = findKind(ast, "markup");
    const userNameMarkup = markups.find((m) => m.tag === "userName");
    expect(userNameMarkup).toBeDefined();
    expect(userNameMarkup.kind).toBe("markup");
  });
});

// =============================================================================
// §K11.5 — Compound field-write inside fn (kickstarter v2 §3 lines 184-187)
// =============================================================================
//
// `@formRes.error = msg` inside a function body parses correctly because
// it's the "MemberAssignment" shape (Step 10's `reactive-nested-assign`
// specialization). Doesn't depend on the Variant C compound parent being
// recognized — the @-form access is what the parser sees.
// =============================================================================

describe("Kickstarter v2 §3 K11.5 — compound field-write", () => {
  test("§K11.5: function setError(msg) { @formRes.error = msg } parses cleanly", () => {
    const src = `<program>\${ function setError(msg) { @formRes.error = msg } }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const fns = findKind(ast, "function-decl");
    expect(fns.length).toBe(1);
    expect(fns[0].name).toBe("setError");
    // Body should contain the @formRes.error assignment — Step 10 confirmed
    // this lowers to `kind: "reactive-nested-assign"`.
    const nestedAssigns = findKind(ast, "reactive-nested-assign");
    expect(nestedAssigns.length).toBe(1);
    expect(nestedAssigns[0].target).toBe("formRes");
    expect(Array.isArray(nestedAssigns[0].path)).toBe(true);
    expect(nestedAssigns[0].path).toEqual(["error"]);
  });
});

// =============================================================================
// §K11.X-DIVERGENCE-1 — Variant C compound NOT recognized today (DEFERRED)
// =============================================================================
//
// The flagship kickstarter v2 §3 example `<formRes><name>=""<email>=""</>` is
// a Variant C compound declaration. Today's parser does NOT recognize this
// form — it falls through to html-fragment per Step 2 progress.md lines
// 93-98 + 223-228 ("Variant C compound block opener `>` followed by `<sib>`
// is DEFERRED to Step 11").
//
// This anti-test memorializes today's broken behavior. **TODO[step-11.0a]:**
// when the recognizer extension lands (a follow-up PA-owned step), this test
// MUST be inverted to assert the positive shape:
//
//   - state-decl parent (formRes), shape:"plain", initExpr:null, structuralForm:true
//   - children: [state-decl(name), state-decl(email), state-decl(error)] — each
//     with shape:"plain", structuralForm:true, isConst:false
// =============================================================================

describe("Kickstarter v2 §3 K11.X-DIVERGENCE-1 — Variant C compound (DEFERRED)", () => {
  test("§K11.X-D1: TODO[step-11.0a] — `<formRes><name>=\"\" </>` currently parses as html-fragment (deceptive-success)", () => {
    const src = `<program>\${ <formRes><name>="" <email>="" <error>="" </> }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    const fragments = findKind(ast, "html-fragment");
    // TODAY: zero state-decl produced; the entire compound collapses to html-fragment
    expect(decls.length).toBe(0);
    expect(fragments.length).toBeGreaterThanOrEqual(1);
    const compoundFragment = fragments.find((f) =>
      (f.content || "").includes("formRes")
    );
    expect(compoundFragment).toBeDefined();
    // Per BRIEF + AST-CONTRACTS §1.1: when fixed, compound parent should be
    //   state-decl(name="formRes", shape:"plain", initExpr:null, children:[
    //     state-decl(name="name", shape:"plain", init:"\"\""),
    //     state-decl(name="email", shape:"plain", init:"\"\""),
    //     state-decl(name="error", shape:"plain", init:"\"\""),
    //   ])
    // Once the recognizer extension lands, INVERT this test (assert
    // decls.length === 4 with the parent + 3 children shape).
  });

  test("§K11.X-D1b: TODO[step-11.0a] — multi-line compound `<formRes>\\n  <name>=\"\"\\n</>` also parses as html-fragment", () => {
    const src = `<program>\${
      <formRes>
        <name> = ""
      </>
    }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(0);
    const fragments = findKind(ast, "html-fragment");
    expect(fragments.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// §K11.X-DIVERGENCE-2 — Multi-decl with newline-only separator NOT recognized
// =============================================================================
//
// `<a>=0\n<b>=1` produces ONE state-decl `a` with `init = "0\n< b > = 1"` —
// the second decl gets eaten into the first's init. Semicolon-separated
// works, but the kickstarter v2 §3 corpus uses newline-only separation
// extensively. The `parseOneStatement` recognizer does NOT treat newlines
// as statement boundaries when scanning the RHS of a state-decl init.
//
// **TODO[step-11.0b]:** introduce newline-as-statement-separator support
// inside `tryParseStructuralDecl` RHS-collection logic. When fixed, this
// test MUST be inverted to assert two distinct state-decls.
// =============================================================================

describe("Kickstarter v2 K11.X-DIVERGENCE-2 — multi-decl newline separator (DEFERRED)", () => {
  test("§K11.X-D2: TODO[step-11.0b] — `<a>=0\\n<b>=1` (newline-only) eats sibling decl into init", () => {
    const src = `<program>\${
      <a> = 0
      <b> = 1
    }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    // TODAY: only ONE state-decl recognized; sibling eaten as raw text in init
    expect(decls.length).toBe(1);
    expect(decls[0].name).toBe("a");
    expect(decls[0].init).toContain("< b > = 1"); // SIC — second decl as raw text
    // When fixed, INVERT to assert decls.length === 2 with names ['a','b'].
  });

  test("§K11.X-D2b: working baseline — semicolon separator DOES work today", () => {
    const src = `<program>\${ <a> = 0; <b> = 1 }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(2);
    const names = decls.map((d) => d.name).sort();
    expect(names).toEqual(["a", "b"]);
    // This test is the working sibling — it confirms the failing newline test
    // above isn't a recognizer bug, it's a separator-detection gap.
  });

  test("§K11.X-D2c: working baseline — newline DOES separate decl-from-fn (legacy)", () => {
    const src = `<program>\${
      <count> = 0
      function inc() { @count = @count + 1 }
    }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    const fns = findKind(ast, "function-decl");
    // The legacy newline-as-separator handling between a state-decl and a
    // function-decl works because `function` is a keyword-anchored statement
    // start. The gap is specifically state-decl-then-state-decl.
    expect(fns.length).toBe(1);
    expect(fns[0].name).toBe("inc");
    // outer state-decl should be present and clean (no eaten sibling)
    const outer = decls.find((d) => d.structuralForm === true);
    expect(outer).toBeDefined();
    expect(outer.name).toBe("count");
    expect(outer.init).toBe("0");
  });
});

// =============================================================================
// §K11.X-DIVERGENCE-3 — Tier 3 typed compound positional NOT recognized
// =============================================================================
//
// `<userInfo>: UserInfo = ("alice", 30, true)` (kickstarter v2 §3 line 191) is
// a Tier 3 predefined-shape compound with positional sugar. Today's parser
// does NOT recognize the `>:` typed form — falls through to html-fragment.
// Even simpler `<count>: number = 0` falls through.
//
// **TODO[step-11.0c]:** introduce typed-decl recognizer (`>` followed by `:`).
// =============================================================================

describe("Kickstarter v2 §3 K11.X-DIVERGENCE-3 — typed compound + typed Shape 1 (DEFERRED)", () => {
  test("§K11.X-D3a: TODO[step-11.0c] — `<count>: number = 0` (typed Shape 1) → html-fragment today", () => {
    const src = `<program>\${ <count>: number = 0 }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(0);
    const fragments = findKind(ast, "html-fragment");
    expect(fragments.length).toBeGreaterThanOrEqual(1);
    const tyFragment = fragments.find((f) =>
      (f.content || "").includes(": number")
    );
    expect(tyFragment).toBeDefined();
  });

  test("§K11.X-D3b: TODO[step-11.0c] — `<userInfo>: UserInfo = (...)` (Tier 3 positional) → html-fragment", () => {
    const src = `<program>\${ <userInfo>: UserInfo = ("alice", 30, true) }</program>`;
    const { ast, errors } = parse(src);
    expect(errors.length).toBe(0);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(0);
    const fragments = findKind(ast, "html-fragment");
    expect(fragments.length).toBeGreaterThanOrEqual(1);
  });
});
