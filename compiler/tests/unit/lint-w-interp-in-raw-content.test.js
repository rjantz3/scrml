/**
 * W-INTERP-IN-RAW-CONTENT — info-level lint (SPEC §4.17, change-id
 * g-interp-in-raw-content, sPA ss11 item 1).
 *
 * Tests both the lint module directly (`runWInterpInRawContent` over a synthetic
 * block-split AST) and the end-to-end diagnostic-stream partition (the lint lands
 * in `result.warnings` — never `result.errors` — and CLI exit stays 0).
 *
 * The lint fires when a scrml-significant token (`${...}` interpolation, an
 * uppercase `<TagName>` opener, or one of the brace sigils `?{` `#{` `!{` `^{`
 * `_{`) appears inside a raw-content `<pre>` / `<code>` body. Per §4.17 that body
 * is a single raw text run, so the token ships LITERALLY — the lint restores the
 * missing signal and steers to a non-raw wrapper.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { runWInterpInRawContent } from "../../src/lint-w-interp-in-raw-content.js";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ---------------------------------------------------------------------------
// §A  runWInterpInRawContent — direct over a synthetic block-split AST
// ---------------------------------------------------------------------------

/**
 * Build a single BS-result with one markup node named `name` (case preserved)
 * whose sole child is a text run carrying `body`. The lint's raw-content gate
 * is a pre-NR syntactic check: a PascalCase (uppercase-first) `name` is a
 * component ref and is NOT raw-content, mirroring the block-splitter's routing.
 */
function bsResultWith(name, body) {
  return {
    filePath: "/x.scrml",
    blocks: [
      {
        type: "markup",
        name,
        span: { line: 7, col: 3 },
        children: [
          {
            type: "text",
            raw: body,
            span: { line: 7, col: 8 },
            children: [],
          },
        ],
      },
    ],
  };
}

describe("runWInterpInRawContent — direct", () => {
  test("fires on `${...}` interpolation inside <pre>", () => {
    const diags = runWInterpInRawContent([bsResultWith("pre", "${board}")]);
    expect(diags.length).toBe(1);
    expect(diags[0].code).toBe("W-INTERP-IN-RAW-CONTENT");
    // 6nz B1 (2026-06-24) — promoted info -> warning (silent rendering break).
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("${...}");
    expect(diags[0].message).toContain("<pre>");
    expect(diags[0].message).toContain("whitespace-pre");
  });

  test("fires on `${...}` interpolation inside <code>", () => {
    const diags = runWInterpInRawContent([bsResultWith("code", "value = ${x}")]);
    expect(diags.length).toBe(1);
    expect(diags[0].message).toContain("<code>");
  });

  test("fires on an uppercase `<TagName>` component-ref opener", () => {
    const diags = runWInterpInRawContent([bsResultWith("pre", "example <Foo>")]);
    expect(diags.length).toBe(1);
    expect(diags[0].message).toContain("component-reference");
  });

  test("fires on each inert brace sigil (?{ #{ !{ ^{ _{)", () => {
    for (const sigil of ["?{", "#{", "!{", "^{", "_{"]) {
      const diags = runWInterpInRawContent([bsResultWith("pre", `the ${sigil} opener`)]);
      expect(diags.length).toBe(1);
      expect(diags[0].message).toContain(sigil);
    }
  });

  test("does NOT fire on uppercase-first `<PRE>` / `<CODE>` (BS routes them as components, not raw-content)", () => {
    // Empirically, the block-splitter gates raw-content on `!isComp`
    // (uppercase-first => component). `<PRE>` / `<CODE>` therefore parse their
    // body as a `logic` child, NOT a raw `text` run — they are NOT §4.17
    // raw-content nodes, so the lint correctly does not fire.
    expect(runWInterpInRawContent([bsResultWith("PRE", "${x}")]).length).toBe(0);
    expect(runWInterpInRawContent([bsResultWith("CODE", "${x}")]).length).toBe(0);
  });

  // --- negatives (conservative — false positives are worse than misses) ---

  test("does NOT fire on a bare `<` followed by lowercase (real HTML)", () => {
    expect(runWInterpInRawContent([bsResultWith("pre", "plain text 2 < 3")]).length).toBe(0);
    expect(runWInterpInRawContent([bsResultWith("pre", "tag: <button>")]).length).toBe(0);
  });

  test("does NOT fire on a lone `$` not followed by `{`", () => {
    expect(runWInterpInRawContent([bsResultWith("pre", "price is $5 today")]).length).toBe(0);
  });

  test("does NOT fire on `${` with no closing `}` (defensive — not a real interp)", () => {
    expect(runWInterpInRawContent([bsResultWith("pre", "literal ${ no close")]).length).toBe(0);
  });

  test("does NOT fire on a sigil char NOT followed by `{`", () => {
    expect(runWInterpInRawContent([bsResultWith("pre", "is it ok? yes # hash _ underscore")]).length).toBe(0);
  });

  test("does NOT fire on a plain raw body with no tokens", () => {
    expect(runWInterpInRawContent([bsResultWith("code", "const x = 42; return x;")]).length).toBe(0);
  });

  test("does NOT fire on a PascalCase component ref named Pre/Code", () => {
    // `<Pre>` / `<Code>` are component refs (uppercase-first), NOT raw-content —
    // the block-splitter never routes them to the §4.17 raw-content branch.
    expect(runWInterpInRawContent([bsResultWith("Pre", "${x}")]).length).toBe(0);
    expect(runWInterpInRawContent([bsResultWith("Code", "${x}")]).length).toBe(0);
  });

  test("does NOT fire on non-raw elements (e.g. <div>)", () => {
    expect(runWInterpInRawContent([bsResultWith("div", "${x}")]).length).toBe(0);
  });

  test("safe on empty / null / malformed input", () => {
    expect(runWInterpInRawContent(null).length).toBe(0);
    expect(runWInterpInRawContent([]).length).toBe(0);
    expect(runWInterpInRawContent([{ filePath: "/x", blocks: null }]).length).toBe(0);
    expect(runWInterpInRawContent([{}]).length).toBe(0);
  });

  test("reports the markup node span (line/col of the <pre>/<code>)", () => {
    const diags = runWInterpInRawContent([bsResultWith("pre", "${x}")]);
    expect(diags[0].line).toBe(7);
    expect(diags[0].column).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// §B  end-to-end partition — lint lands in result.warnings, never result.errors
// ---------------------------------------------------------------------------

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "raw-interp-lint-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

function compile(src) {
  const fp = join(TMP, "r.scrml");
  writeFileSync(fp, src);
  return compileScrml({ inputFiles: [fp], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}

/** Cross-stream count of the code across BOTH diagnostic streams. */
function warnHits(res) {
  return (res.warnings || []).filter(d => d.code === "W-INTERP-IN-RAW-CONTENT");
}
function errHits(res) {
  return (res.errors || []).filter(d => d.code === "W-INTERP-IN-RAW-CONTENT");
}
function fatalErrors(res) {
  return (res.errors || []).filter(e => e.severity == null || e.severity === "error");
}

describe("W-INTERP-IN-RAW-CONTENT — end-to-end partition", () => {
  test("`<pre>${board}</pre>` fires exactly one W-INTERP in result.warnings (exit 0)", () => {
    const res = compile("<program><pre>${board}</pre></program>");
    // Cross-stream: in warnings, NEVER in errors (S93/diagnostic-partition rule).
    expect(warnHits(res).length).toBe(1);
    expect(errHits(res).length).toBe(0);
    expect(warnHits(res)[0].severity).toBe("warning"); // 6nz B1: promoted to warning
    expect(fatalErrors(res).length).toBe(0); // warning-level keeps CLI exit 0
  });

  test("`<code>${x}</code>` fires exactly one W-INTERP in result.warnings (exit 0)", () => {
    const res = compile("<program><code>${x}</code></program>");
    expect(warnHits(res).length).toBe(1);
    expect(errHits(res).length).toBe(0);
    expect(warnHits(res)[0].severity).toBe("warning");
    expect(fatalErrors(res).length).toBe(0);
  });

  test("`<pre>plain text 2 < 3</pre>` fires NOTHING (no false positive on bare `<`)", () => {
    const res = compile("<program><pre>plain text 2 < 3</pre></program>");
    expect(warnHits(res).length).toBe(0);
    expect(errHits(res).length).toBe(0);
  });

  test("`<div>${@board}</div>` is unaffected (non-raw — interpolation live, no lint)", () => {
    // A non-raw element: `${...}` is genuinely interpolated, so NO W-INTERP.
    const res = compile("<program>\n  <board> = \"X\"\n  <div>${@board}</div>\n</program>");
    expect(warnHits(res).length).toBe(0);
    expect(errHits(res).length).toBe(0);
  });

  test("a `?{` brace sigil inside <pre> surfaces the warning lint (never an error)", () => {
    const res = compile("<program><pre>The ?{ opener}</pre></program>");
    expect(warnHits(res).length).toBe(1);
    expect(errHits(res).length).toBe(0);
  });
});
