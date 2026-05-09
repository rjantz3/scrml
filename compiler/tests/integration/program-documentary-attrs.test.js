/**
 * §40.7 — Documentary Attributes for `<program>`.
 *
 * Tests the five optional attributes that compile to standard HTML head tags:
 *   - title=        → <title>...</title>
 *   - description=  → <meta name="description" content="...">
 *   - version=      → <meta name="application-version" content="...">
 *   - author=       → <meta name="author" content="...">
 *   - license=      → <meta name="license" content="...">
 *
 * Spec: SPEC.md §40.7 (Phase A1a, 2026-05-05)
 * Warning: W-PROGRAM-TITLE-NESTED — documentary attr on a nested <program>
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "program-doc-attrs-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(rel, src) {
  const abs = join(TMP, rel);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, src);
  return abs;
}

function compile(rel, src) {
  const file = fx(rel, src);
  const result = compileScrml({
    inputFiles: [file],
    outputDir: join(TMP, `${rel}-out`),
    write: false,
    log: () => {},
  });
  return { result, file };
}

function htmlOf(result, file) {
  const out = result.outputs?.get(file);
  return out?.html ?? "";
}

describe("§40.7 — `<program>` documentary attributes", () => {
  test("1. title= → <title>...</title>", () => {
    const { result, file } = compile(
      "1.scrml",
      `<program title="Foo"><div>x</div></program>\n`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    expect(html).toContain("<title>Foo</title>");
    // Default basename <title>1</title> SHOULD be suppressed when
    // documentary title= is present.
    expect(html).not.toContain("<title>1</title>");
  });

  test("2. description= → <meta name=\"description\">", () => {
    const { result, file } = compile(
      "2.scrml",
      `<program description="A short description."><div>x</div></program>\n`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    expect(html).toContain('<meta name="description" content="A short description.">');
  });

  test("3. version=, author=, license= each emit correct <meta>", () => {
    const { result, file } = compile(
      "3.scrml",
      `<program version="0.1.0" author="Bryan MacLee" license="MIT"><div>x</div></program>\n`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    expect(html).toContain('<meta name="application-version" content="0.1.0">');
    expect(html).toContain('<meta name="author" content="Bryan MacLee">');
    expect(html).toContain('<meta name="license" content="MIT">');
  });

  test("4. all five attrs together emit in fixed order", () => {
    const { result, file } = compile(
      "4.scrml",
      `<program title="Counter"
         description="Counter app."
         version="0.1.0"
         author="Bryan"
         license="MIT">
<div>x</div>
</program>
`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    // Per §40.7 fixed order: title → description → application-version → author → license
    const idxTitle = html.indexOf("<title>Counter</title>");
    const idxDesc = html.indexOf('name="description"');
    const idxVer = html.indexOf('name="application-version"');
    const idxAuth = html.indexOf('name="author"');
    const idxLic = html.indexOf('name="license"');
    expect(idxTitle).toBeGreaterThan(-1);
    expect(idxDesc).toBeGreaterThan(idxTitle);
    expect(idxVer).toBeGreaterThan(idxDesc);
    expect(idxAuth).toBeGreaterThan(idxVer);
    expect(idxLic).toBeGreaterThan(idxAuth);
  });

  test("5. author-written <title> overrides documentary title= and default basename", () => {
    const { result, file } = compile(
      "5.scrml",
      `<program title="Documentary">
<title>AuthorWritten</title>
<div>x</div>
</program>
`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    // The author <title> appears in body (in source order). The compiler
    // emits NO <title> in <head> for this case.
    expect(html).toContain("<title>AuthorWritten</title>");
    expect(html).not.toContain("<title>Documentary</title>");
    expect(html).not.toContain("<title>5</title>");
  });

  test("6. no documentary attrs → default basename <title>, no <meta name=description>", () => {
    const { result, file } = compile(
      "6.scrml",
      `<program><div>x</div></program>\n`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    // Default basename title still emits.
    expect(html).toContain("<title>6</title>");
    // No documentary <meta> tags injected.
    expect(html).not.toContain('name="description"');
    expect(html).not.toContain('name="application-version"');
    expect(html).not.toContain('name="author"');
    expect(html).not.toContain('name="license"');
  });

  test("7. HTML-escaping of attribute values (& < >)", () => {
    // scrml attribute values are stored as raw strings — the parser does NOT
    // decode HTML entities. To test escape behavior, use literal characters
    // in source. The emitter applies escapeHtmlAttr (& → &amp;, < → &lt;,
    // > → &gt;, " → &quot;) on emission.
    const { result, file } = compile(
      "7.scrml",
      `<program title="A & B" author="x < y" license="z > w"><div>x</div></program>\n`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    // Source `&` → emitted `&amp;` ; source `<` → `&lt;` ; source `>` → `&gt;`
    expect(html).toContain("<title>A &amp; B</title>");
    expect(html).toContain('content="x &lt; y"');
    expect(html).toContain('content="z &gt; w"');
  });

  test("8. W-PROGRAM-TITLE-NESTED on nested <program title=...>", () => {
    const { result } = compile(
      "8.scrml",
      `<program title="Outer">
<program name="worker" title="InnerOops">
${"$"}{ when message.type == "ping" { } }
</program>
<div>x</div>
</program>
`,
    );
    // No errors.
    expect(result.errors ?? []).toEqual([]);
    // The warning IS present in result.warnings.
    const warnings = (result.warnings ?? []).filter(e => e.code === "W-PROGRAM-TITLE-NESTED");
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0].message).toContain("title=");
    expect(warnings[0].message).toContain("§40.7");
  });

  test("9. nested <program name=worker> WITHOUT documentary attrs → no warning", () => {
    const { result } = compile(
      "9.scrml",
      `<program title="Outer">
<program name="worker">
${"$"}{ when message.type == "ping" { } }
</program>
<div>x</div>
</program>
`,
    );
    const warnings = (result.warnings ?? []).filter(e => e.code === "W-PROGRAM-TITLE-NESTED");
    expect(warnings.length).toBe(0);
  });

  test("10. empty-string title= treated as absent → default basename emits", () => {
    const { result, file } = compile(
      "10.scrml",
      `<program title=""><div>x</div></program>\n`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    // Default basename <title>10</title> falls back when title= is empty.
    expect(html).toContain("<title>10</title>");
  });

  test("11. each documentary attr on nested <program> emits its own warning", () => {
    const { result } = compile(
      "11.scrml",
      `<program title="Outer">
<program name="worker" description="bad" version="1.0" author="x" license="MIT">
${"$"}{ when message.type == "ping" { } }
</program>
<div>x</div>
</program>
`,
    );
    const warnings = (result.warnings ?? []).filter(e => e.code === "W-PROGRAM-TITLE-NESTED");
    // 4 documentary attrs on nested = 4 warnings (one per offending attr).
    expect(warnings.length).toBe(4);
    const names = warnings.map(w => {
      const m = w.message.match(/`(\w+)=`/);
      return m ? m[1] : "";
    }).sort();
    expect(names).toEqual(["author", "description", "license", "version"]);
  });

  test("12. nested <program> documentary attrs do NOT emit head HTML", () => {
    const { result, file } = compile(
      "12.scrml",
      `<program title="Outer" description="OuterDesc">
<program name="worker" title="InnerNo" description="InnerNoDesc">
${"$"}{ when message.type == "ping" { } }
</program>
<div>x</div>
</program>
`,
    );
    const html = htmlOf(result, file);
    // Outer documentary attrs DO appear in head.
    expect(html).toContain("<title>Outer</title>");
    expect(html).toContain('content="OuterDesc"');
    // Inner documentary attrs DO NOT appear in head.
    expect(html).not.toContain("InnerNo");
    expect(html).not.toContain("InnerNoDesc");
  });

  test("13. non-string-literal value (variable-ref) silently ignored — no diagnostic, no head emission", () => {
    // §40.7 bullet 1, second sentence: "A non-string-literal value (e.g., a
    // `${...}` expression, an `@variable` reference) is silently ignored —
    // these are static document metadata, not reactive content."
    //
    // The `@name` form binds a state cell as the attribute value (kind:
    // "variable-ref"), which is the canonical "non-string-literal" case for
    // the spec. The codegen's getDocAttr() filter requires `kind ===
    // "string-literal"`, so the variable-ref form falls through to the
    // default-basename <title> path.
    const { result, file } = compile(
      "13.scrml",
      `${"$"}{ <name> = "Foo" }
<program title=@name><div>x</div></program>
`,
    );
    // Silently ignored = no error, no warning fires for the documentary attr.
    expect(result.errors ?? []).toEqual([]);
    const docWarnings = (result.warnings ?? []).filter(
      (w) => w.code === "W-PROGRAM-TITLE-NESTED",
    );
    expect(docWarnings.length).toBe(0);
    // No documentary <title> emitted from the @-bound value; default basename
    // <title>13</title> falls back instead.
    const html = htmlOf(result, file);
    expect(html).toContain("<title>13</title>");
    expect(html).not.toContain("<title>Foo</title>");
    // Documentary <meta> tags also absent (none of the other 4 attrs given).
    expect(html).not.toContain('name="description"');
    expect(html).not.toContain('name="application-version"');
  });

  test("14. documentary description= stacks with author-written <meta name=\"description\">", () => {
    // §40.7 bullet 4: "description=, version=, author=, license= SHALL emit
    // <meta> tags unconditionally — these stack with author-written <meta>
    // tags rather than overriding."
    //
    // The compiler's documentary <meta> goes into <head>; the author's raw
    // <meta> markup survives codegen as part of the document body (browsers
    // hoist orphan <meta> at parse time). Both must coexist in the emitted
    // HTML; neither suppresses the other.
    const { result, file } = compile(
      "14.scrml",
      `<program description="DocDesc" version="0.1.0">
<meta name="description" content="AuthDesc">
<div>x</div>
</program>
`,
    );
    expect(result.errors ?? []).toEqual([]);
    const html = htmlOf(result, file);
    // Documentary description (compiler-emitted) — present.
    expect(html).toContain('<meta name="description" content="DocDesc">');
    // Documentary version still emits unconditionally.
    expect(html).toContain('<meta name="application-version" content="0.1.0">');
    // Author's raw <meta name="description"> — also survives in output.
    // (Match either DocDesc-then-AuthDesc or just substring presence; we
    // just need to confirm the documentary one did NOT suppress author's.)
    expect(html).toContain("AuthDesc");
  });
});
