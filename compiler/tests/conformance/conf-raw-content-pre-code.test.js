/**
 * CONF-RAW-CONTENT | SPEC §4.17 (S101 amendment)
 *
 * Raw-content elements `<pre>` and `<code>`:
 *   - Inside their body, scrml tokens (`${...}`, `<TagName>`, `?{...}`,
 *     `#{...}`, `!{...}`, `^{...}`, `_{...}`) are NOT recognized and pass
 *     through as literal text.
 *   - HTML entity-escaping of `<` / `>` / `&` for visible display remains
 *     author responsibility — parallel to plain-HTML rules.
 *   - Recognition resumes at the matching close tag (case-insensitive on
 *     the element name).
 *   - Unterminated raw-content opener emits E-CTX-001 + closerForm "inferred".
 *   - Outside `<pre>` and `<code>`, the same tokens are parsed normally.
 *
 * Closes the Bug-#2 friction class surfaced at S100 close
 * (errors.scrml:82 — `disabled=${!@signup.isValid}` parsed as live
 * interpolation inside a syntax-display `<pre><code>` block).
 */
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";

function bodyTextOf(blocks, ancestorNames) {
  // Walk down ancestorNames in order through the children chain;
  // return the first text-typed child of the final ancestor.
  let current = blocks;
  for (const name of ancestorNames) {
    const next = (Array.isArray(current) ? current : current.children ?? []).find(
      (b) => b.type === "markup" && b.name?.toLowerCase() === name.toLowerCase(),
    );
    if (!next) return null;
    current = next;
  }
  return current.children?.find((c) => c.type === "text")?.raw ?? null;
}

describe("CONF §4.17 — raw-content elements `<pre>` and `<code>`", () => {
  test("${...} inside <pre><code> becomes text, not a logic context", () => {
    const src = `<page><pre><code>disabled=\${!@signup.isValid}</code></pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const text = bodyTextOf(blocks[0], ["pre"]);
    expect(text).toBe("<code>disabled=${!@signup.isValid}</code>");
    // CRITICAL: no logic-block child was emitted under the pre.
    const pre = blocks[0].children.find((c) => c.name === "pre");
    expect(pre.children.some((c) => c.type === "logic")).toBe(false);
    expect(pre.children.some((c) => c.type === "brace")).toBe(false);
  });

  test("<TagName/> inside <pre> becomes text, not a markup child", () => {
    const src = `<page><pre>raw <FooBar/> text</pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const text = bodyTextOf(blocks[0], ["pre"]);
    expect(text).toBe("raw <FooBar/> text");
    const pre = blocks[0].children.find((c) => c.name === "pre");
    // The <FooBar/> is NOT a nested markup child.
    expect(pre.children.filter((c) => c.type === "markup")).toEqual([]);
  });

  test("brace contexts (?{}, #{}, !{}, ^{}, _{}) inside <pre> become text", () => {
    const src = `<page><pre>?{select 1} #{color: red} !{handle()} ^{meta} _{wasm}</pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const text = bodyTextOf(blocks[0], ["pre"]);
    expect(text).toContain("?{select 1}");
    expect(text).toContain("#{color: red}");
    expect(text).toContain("!{handle()}");
    expect(text).toContain("^{meta}");
    expect(text).toContain("_{wasm}");
    const pre = blocks[0].children.find((c) => c.name === "pre");
    expect(pre.children.some((c) => c.type === "sql")).toBe(false);
    expect(pre.children.some((c) => c.type === "css")).toBe(false);
  });

  test("nested <code> inside <pre> is part of the raw text (matched by outer </pre>)", () => {
    const src = `<page><pre>before <code>x</code> after</pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const text = bodyTextOf(blocks[0], ["pre"]);
    expect(text).toBe("before <code>x</code> after");
    const pre = blocks[0].children.find((c) => c.name === "pre");
    expect(pre.children.filter((c) => c.name === "code")).toEqual([]);
  });

  test("<code> standalone (not inside <pre>) is also raw-content", () => {
    const src = `<page>text before <code>\${@count}</code> text after</>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const code = blocks[0].children.find((c) => c.name === "code");
    expect(code).toBeDefined();
    const codeText = code.children.find((c) => c.type === "text")?.raw;
    expect(codeText).toBe("${@count}");
    // No logic-block child under code.
    expect(code.children.some((c) => c.type === "logic")).toBe(false);
  });

  test("${...} OUTSIDE pre/code still parses as a logic block (regression guard)", () => {
    const src = `<page>\${@count}</>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const page = blocks[0];
    expect(page.children.some((c) => c.type === "logic")).toBe(true);
  });

  test("<TagName/> OUTSIDE pre/code still emits a markup child (regression guard)", () => {
    const src = `<page><MyComponent/></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const page = blocks[0];
    expect(page.children.some((c) => c.name === "MyComponent")).toBe(true);
  });

  test("<pre class=\"x\">…</pre> — attributes on opener still parse", () => {
    const src = `<page><pre class="big">hi</pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const pre = blocks[0].children.find((c) => c.name === "pre");
    expect(pre).toBeDefined();
    expect(pre.raw).toContain(`class="big"`);
    const text = bodyTextOf(blocks[0], ["pre"]);
    expect(text).toBe("hi");
  });

  test("<pre></pre> — empty body emits markup with no text child", () => {
    const src = `<page><pre></pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const pre = blocks[0].children.find((c) => c.name === "pre");
    expect(pre).toBeDefined();
    expect(pre.children).toEqual([]);
    expect(pre.closerForm).toBe("explicit");
  });

  test("case-insensitive close-tag match: <pre>…</PRE>", () => {
    // Opener `<pre>` is lowercase (a non-component name, so raw-content
    // applies). Close tag `</PRE>` differs in case; the raw-content
    // scanner matches close-tag names case-insensitively.
    // Note: an UPPERCASE opener `<PRE>` is a COMPONENT reference per
    // scrml's component-name rule (first char uppercase → component),
    // not the HTML `<pre>` element — that's a different routing path.
    const src = `<page><pre>x</PRE></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const pre = blocks[0].children.find((c) => c.name === "pre");
    expect(pre).toBeDefined();
    expect(pre.closerForm).toBe("explicit");
    expect(pre.children.find((c) => c.type === "text")?.raw).toBe("x");
  });

  test("uppercase-first <Pre> is a COMPONENT reference, NOT raw-content", () => {
    // Regression guard for the S101 first-pass bug — `<Pre>` lowercases to
    // `pre` but is a component reference (first char uppercase). The
    // raw-content branch is gated on `!isComp` so component refs take the
    // normal markup path. The wrapper-export form depends on this.
    const src = `<page><Pre><span>nested markup</span></Pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const Pre = blocks[0].children.find((c) => c.name === "Pre");
    expect(Pre).toBeDefined();
    expect(Pre.isComponent).toBe(true);
    // Inside a component, the inner <span> IS a real markup child, not text.
    expect(Pre.children.some((c) => c.name === "span")).toBe(true);
  });

  test("unterminated <pre> emits E-CTX-001 and recovers with closerForm 'inferred'", () => {
    // Use a top-level <pre> so the outer page wrapper doesn't get swallowed
    // into the raw-text capture (in which case `</page>` would be part of
    // the pre's body, and the page itself would never close).
    const src = `<pre>unterminated`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors.some((e) => e.code === "E-CTX-001")).toBe(true);
    const pre = blocks.find((b) => b.name === "pre");
    expect(pre).toBeDefined();
    expect(pre.closerForm).toBe("inferred");
    expect(pre.children.find((c) => c.type === "text")?.raw).toBe("unterminated");
  });

  test("self-closing <pre/> takes the void/self-closing path, not raw-content", () => {
    const src = `<page><pre/></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const pre = blocks[0].children.find((c) => c.name === "pre");
    expect(pre).toBeDefined();
    expect(pre.closerForm).toBe("self-closing");
    expect(pre.children).toEqual([]);
  });

  test("HTML entity references inside <pre> pass through verbatim", () => {
    const src = `<page><pre>&lt;button&gt; &amp; &quot;x&quot;</pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const text = bodyTextOf(blocks[0], ["pre"]);
    // The block splitter does NOT decode entities; they pass through for
    // the browser to decode at render time. Parallel to plain-HTML behavior.
    expect(text).toBe("&lt;button&gt; &amp; &quot;x&quot;");
  });

  test("// line comment inside <pre> is preserved verbatim (suppression OFF in raw-content)", () => {
    const src = `<page><pre>// not a scrml comment</pre></>`;
    const { errors, blocks } = splitBlocks("t.scrml", src);
    expect(errors).toEqual([]);
    const text = bodyTextOf(blocks[0], ["pre"]);
    expect(text).toBe("// not a scrml comment");
  });
});
