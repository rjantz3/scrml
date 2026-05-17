/**
 * emit-html: `<page>` tag transparency (mpa-shell-clean-urls Sub 2).
 *
 * The `<page>` element (SPEC §40.8 v0.3 program shape) is a per-route
 * attribute container — it carries `db=`/`auth=`/`csrf=`/`ratelimit=`
 * for the inferred route but is NOT a DOM element. Prior to
 * mpa-shell-clean-urls the emit-html walker left the literal `<page>`
 * tag in output HTML, which the browser ignored but cluttered the
 * rendered DOM with a phantom element.
 *
 * Post-fix: emit-html emits `<page>`'s children transparently — the
 * same shape as the unnamed `<program>` strip applied above. This unit
 * test pins the contract independent of the integration smoke at
 * mpa-shell-clean-urls.test.js §2 (Sub 2 composition).
 */

import { describe, test, expect } from "bun:test";
import { generateHtml } from "../../src/codegen/emit-html.js";

function span(start = 0) {
  return { file: "/test/page.scrml", start, end: start + 4, line: 1, col: 1 };
}

function makeMarkupNode(tag, attrs = [], children = []) {
  return {
    kind: "markup",
    tag,
    attributes: attrs,
    children,
    selfClosing: false,
    span: span(),
  };
}

function makeTextNode(value) {
  return { kind: "text", value, span: span() };
}

describe("emit-html: <page> tag transparency", () => {
  test("<page> wrapper does NOT appear in emitted HTML", () => {
    // <page><article>...</article></page>
    const pageNode = makeMarkupNode("page", [], [
      makeMarkupNode("article", [], [makeTextNode("inner")]),
    ]);
    const html = generateHtml([pageNode], [], false, null);
    expect(html).not.toContain("<page>");
    expect(html).not.toContain("</page>");
  });

  test("<page> children DO appear in emitted HTML", () => {
    // Sanity: the inner content must still emit. Transparency means
    // children emit; the wrapper is the only thing dropped.
    const pageNode = makeMarkupNode("page", [], [
      makeMarkupNode("article", [], [makeTextNode("MY_PAGE_BODY")]),
    ]);
    const html = generateHtml([pageNode], [], false, null);
    expect(html).toContain("<article>");
    expect(html).toContain("MY_PAGE_BODY");
    expect(html).toContain("</article>");
  });

  test("<page> with no attributes emits no opener/closer at all", () => {
    // Regression: an empty-attrs `<page>` was previously emitting
    // `<page></page>` around its children. Verify the strip is total.
    const pageNode = makeMarkupNode("page", [], [
      makeMarkupNode("p", [], [makeTextNode("solo")]),
    ]);
    const html = generateHtml([pageNode], [], false, null);
    // Use a strict count assertion in addition to substring negation.
    expect(html.match(/<\/?page\b/g)).toBeNull();
  });

  test("nested <page> inside markup emits children only", () => {
    // <div><page><p>x</p></page></div> → <div><p>x</p></div>
    const innerPage = makeMarkupNode("page", [], [
      makeMarkupNode("p", [], [makeTextNode("inner-p")]),
    ]);
    const div = makeMarkupNode("div", [], [innerPage]);
    const html = generateHtml([div], [], false, null);
    expect(html).not.toContain("<page>");
    expect(html).toContain("<div>");
    expect(html).toContain("<p>");
    expect(html).toContain("inner-p");
  });

  test("multiple top-level <page> nodes each emit their children only", () => {
    // Multi-page file with two <page> siblings (legal in entry-file
    // `<program>` body per §40.8 — though rare). Both wrappers drop.
    const pageA = makeMarkupNode("page", [], [
      makeMarkupNode("p", [], [makeTextNode("AAA")]),
    ]);
    const pageB = makeMarkupNode("page", [], [
      makeMarkupNode("p", [], [makeTextNode("BBB")]),
    ]);
    const html = generateHtml([pageA, pageB], [], false, null);
    expect(html).not.toContain("<page>");
    expect(html).toContain("AAA");
    expect(html).toContain("BBB");
  });
});
