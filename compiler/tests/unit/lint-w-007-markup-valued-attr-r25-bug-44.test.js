/**
 * lint-ghost-patterns — W-LINT-007 markup-valued braced attribute exemption (R25 Bug 44)
 *
 * Regression tests for r25-bug-44-w-lint-007-fallback-markup-2026-05-27.
 *
 * Bug surface (R25 dev-3-svelte + dev-4-pascal + overseer-4 confirmed):
 *   W-LINT-007 — the JSX `<Comp prop={val}>` ghost — fired on the canonical
 *   SPEC §19.6.2 `<errorBoundary fallback={<markup/>}>` shape. The lint
 *   regex matched the opening `fallback={` without inspecting the value
 *   side; the value-side `<div>...` is markup-as-value per §1.4 and not
 *   the JSX scalar shape the lint targets.
 *
 * Fix scope — Option (b) markup-valued attribute exemption (broader than
 * errorBoundary-only) per the dispatch brief PA-lean:
 *   New helper `isMarkupValuedBracedAttr(source, braceOffset)` peeks the
 *   first non-whitespace character after the `{` and returns true if it
 *   is `<` followed by a tag-name letter — the canonical scrml markup-as-
 *   value shape per §1.4. The W-LINT-007 skipIf consults the helper via
 *   newly threaded `source` + `matchEnd` positional args (positions 9 +
 *   10 of the skipIf signature; the prior 8-arg signature stays backward
 *   compatible because all earlier patterns ignore the new positions).
 *
 * Confirmed canonical shapes that MUST NOT fire (per SPEC §19.6.2):
 *   `<errorBoundary fallback={<div>...</div>}>`
 *   `<errorBoundary fallback={<Fallback msg=@err.msg/>}>`
 *   `<errorBoundary fallback={<MyComp/>}>` (component-tag value)
 *
 * Forward-looking shapes that MUST NOT fire (markup-as-value pillar):
 *   `<MyComp slot={<div/>}>` — component prop with markup value
 *
 * Negative controls that MUST STILL fire (W-LINT-007's purpose):
 *   `<Comp prop={value}>`           — JSX scalar variable
 *   `<button onClick={(e) => 1}>`   — JSX arrow expression
 *   `<Comp prop={fn()}>`            — JSX call expression
 *   `<Comp prop={a + b}>`           — JSX binary expression
 *   `<Comp prop={true}>`            — JSX boolean literal
 *
 * Bug 30 regression-guard (composes with R24 Bug 30 HTML-comment skip):
 *   `<!-- <errorBoundary fallback={<F/>}> -->` STILL silent (comment skip
 *   takes precedence; the markup-valued check is one of multiple gates).
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lint(source) {
  return lintGhostPatterns(source, "test.scrml");
}

function countCode(diags, code) {
  return diags.filter(d => d.code === code).length;
}

// ---------------------------------------------------------------------------
// §1 SPEC §19.6.2 canonical errorBoundary form — MUST NOT fire
// ---------------------------------------------------------------------------

describe("§1 SPEC §19.6.2 canonical errorBoundary `fallback={<markup/>}` does NOT fire W-LINT-007", () => {
  test("Minimal repro — `<errorBoundary fallback={<div>...</div>}>`", () => {
    const source = `<program title="repro">
    <page>
        <errorBoundary fallback={<div>Something went wrong</div>}>
            <h1>Hello</h1>
        </errorBoundary>
    </page>
</program>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("Self-closing markup value — `fallback={<Fallback/>}`", () => {
    const source = `<errorBoundary fallback={<Fallback/>}>
    <Inner/>
</errorBoundary>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("Markup value with nested attributes — `fallback={<Fallback msg=@err.msg/>}`", () => {
    const source = `<errorBoundary fallback={<Fallback msg=@err.msg/>}>
    <Inner/>
</errorBoundary>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("Component-tag markup value — `fallback={<MyComp/>}`", () => {
    const source = `<errorBoundary fallback={<MyComp/>}>
    <Inner/>
</errorBoundary>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("Multi-line markup value", () => {
    const source = `<errorBoundary fallback={<div class="error">
    <h2>Error</h2>
    <p>Something went wrong.</p>
</div>}>
    <Inner/>
</errorBoundary>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("Whitespace between `{` and `<` — `fallback={ <div/> }`", () => {
    const source = `<errorBoundary fallback={ <div/> }>
    <Inner/>
</errorBoundary>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("Newline between `{` and `<` — `fallback={\\n<div/>\\n}`", () => {
    const source = `<errorBoundary fallback={
    <div/>
}>
    <Inner/>
</errorBoundary>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2 Forward-looking — option-(b) general markup-valued attr exemption
// ---------------------------------------------------------------------------

describe("§2 forward-looking markup-valued attrs on any element do NOT fire W-LINT-007", () => {
  test("Component prop with markup value — `<MyComp slot={<div/>}>`", () => {
    const source = `<MyComp slot={<div/>}>
    content
</MyComp>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("HTML element with markup-valued braced attribute (lowercase tag value)", () => {
    const source = `<section header={<h1>Welcome</h1>}>
    body
</section>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("Multiple markup-valued attrs on one element", () => {
    const source = `<Layout header={<h1>Top</h1>} footer={<footer>Bottom</footer>}>
    body
</Layout>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 Negative controls — scalar braced values STILL fire W-LINT-007
// ---------------------------------------------------------------------------

describe("§3 scalar braced values STILL fire W-LINT-007 (lint's original purpose)", () => {
  test("Variable reference — `<Comp prop={value}>`", () => {
    const source = `<page>
    <Comp prop={value}>content</Comp>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });

  test("Arrow expression — `<button onClick={(e) => fn()}>`", () => {
    const source = `<page>
    <button onClick={(e) => fn()}>click</button>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });

  test("Function call — `<Comp prop={fn()}>`", () => {
    const source = `<page>
    <Comp prop={fn()}>content</Comp>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });

  test("Binary expression — `<Comp prop={a + b}>`", () => {
    const source = `<page>
    <Comp prop={a + b}>content</Comp>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });

  test("Boolean literal — `<Comp prop={true}>`", () => {
    const source = `<page>
    <Comp prop={true}>content</Comp>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });

  test("Number literal — `<Comp prop={42}>`", () => {
    const source = `<page>
    <Comp prop={42}>content</Comp>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });

  test("Negation — `<Comp prop={!flag}>`", () => {
    const source = `<page>
    <Comp prop={!flag}>content</Comp>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §4 Mixed — only markup-valued slot exempted; sibling scalar still fires
// ---------------------------------------------------------------------------

describe("§4 mixed markup-valued + scalar attrs on same element", () => {
  test("Adjacent scalar attr STILL fires — `<Comp a={1} b={<m/>}>`", () => {
    const source = `<page>
    <Comp a={1} b={<m/>}>content</Comp>
</page>`;
    const diags = lint(source);
    // `a={1}` is scalar — fires. `b={<m/>}` is markup-valued — does not.
    expect(countCode(diags, "W-LINT-007")).toBe(1);
  });

  test("`<errorBoundary fallback={<F/>} other={scalar}>` — only `other` fires", () => {
    const source = `<page>
    <errorBoundary fallback={<F/>} other={scalar}>
        <Inner/>
    </errorBoundary>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(1);
  });

  test("Sibling string-valued attribute (no braces) — neither side fires", () => {
    const source = `<page>
    <errorBoundary fallback={<F/>} class="boundary">
        <Inner/>
    </errorBoundary>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5 Bug 30 regression-guard — HTML comment skip composes
// ---------------------------------------------------------------------------

describe("§5 Bug 30 HTML-comment skip still suppresses W-LINT-007", () => {
  test("`<!-- <errorBoundary fallback={<F/>}> -->` does NOT fire (comment skip)", () => {
    const source = `<page>
    <!-- <errorBoundary fallback={<F/>}> -->
    <h1>OK</h1>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("`<!-- <Comp prop={scalar}> -->` does NOT fire (comment skip; scalar would otherwise fire)", () => {
    const source = `<page>
    <!-- <Comp prop={scalar}> -->
    <h1>OK</h1>
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §6 Composes with other skipIf gates — markup-valued INSIDE ${} still skipped
// ---------------------------------------------------------------------------

describe("§6 markup-valued attr inside ${} logic block — skipped by logicRanges (pre-existing) AND by markup-value rule (defense-in-depth)", () => {
  test("Inside `${...}` — both skips align; no fire", () => {
    const source = `<page>
    \${
        const boundary = <errorBoundary fallback={<F/>}><Inner/></errorBoundary>;
    }
</page>`;
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });
});
