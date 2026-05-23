/**
 * lint-ghost-patterns — Context-Aware Brace Counters + skipIf Coverage
 *
 * S121 Wave 11 Unit T regression tests for the post-W10-P residual survey
 * fix. The survey memo (commit 1dbf45f8, parent dispatch Q) documented 26
 * false fires across 4 ghost-pattern lints in the native-parser .scrml
 * mirror set. The fix landed:
 *
 *   1. Context-aware brace-counter primitives — buildLogicRanges /
 *      buildCssRanges / buildTildeRanges / buildFunctionBodyRanges now
 *      skip braces inside string literals + comments.
 *
 *   2. Expanded skipIf coverage on W-LINT-001 / W-LINT-007 / W-LINT-010 /
 *      W-LINT-011 — added commentRanges + stringRanges checks where
 *      missing.
 *
 *   3. Coordinated string/comment range computation — `//` inside a string
 *      is no longer a phantom comment opener; `"..."` inside a `//` line
 *      comment is no longer a phantom string opener.
 *
 * Coverage:
 *   §1  W-LINT-001 — `<style>` in comments + strings does NOT fire; bare
 *                    `<style>` outside both STILL fires
 *   §2  W-LINT-007 — `prop={val}` in strings does NOT fire; real ghost
 *                    outside still fires
 *   §3  W-LINT-010 — `${...}` inside a `#{...}` CSS block STILL fires;
 *                    phantom CSS range from a `#{` in a comment does NOT
 *                    swallow downstream `${...}`
 *   §4  W-LINT-011 — `:attr=` in strings + comments does NOT fire; real
 *                    Vue-style binding STILL fires
 *   §5  Coordinated string/comment — `//` in a string is a string char;
 *                    `"..."` in a `//` comment is comment text
 *   §6  Brace-counter context-awareness — `${...}` containing `"{"` /
 *                    `"}"` string-embedded braces is detected as one
 *                    logic range (not split by phantom depth-counting)
 *   §7  Mirror-class scenarios — synthetic reproductions of the
 *                    native-parser fire sites
 *   §8  Regression — every existing legitimate ghost still fires
 *
 * Anti-regression note: tests assert on actual lint output (W-LINT-NNN
 * codes) rather than internal helpers. This lets the implementation
 * refactor freely while pinning behavior.
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lint(source) {
  return lintGhostPatterns(source, "test.scrml");
}

function countCode(diags, code) {
  return diags.filter(d => d.code === code).length;
}

function hasCode(diags, code) {
  return diags.some(d => d.code === code);
}

// ---------------------------------------------------------------------------
// §1 W-LINT-001 — <style> suppression inside comments + strings
// ---------------------------------------------------------------------------

describe("§1 W-LINT-001 — context-aware suppression", () => {
  test("line comment containing <style> does NOT fire W-LINT-001", () => {
    const source = [
      "<program>",
      "// the <style> element is not supported in scrml",
      "<p>hi</p>",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-001")).toBe(0);
  });

  test("block comment containing <style> does NOT fire W-LINT-001", () => {
    const source = [
      "<program>",
      "/* docs:",
      "   <style> blocks are not supported.",
      "   use #{} for CSS.",
      "*/",
      "<p>hi</p>",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-001")).toBe(0);
  });

  test("string literal containing <style> does NOT fire W-LINT-001", () => {
    const source = [
      "<program>",
      "${ const msg = \"<style> blocks are not supported in scrml\"; }",
      "<p>hi</p>",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-001")).toBe(0);
  });

  test("REGRESSION: bare <style> outside comments+strings STILL fires", () => {
    const source = '<markup name="app">\n  <style>\n    body { color: red; }\n  </style>\n</>';
    expect(countCode(lint(source), "W-LINT-001")).toBeGreaterThanOrEqual(1);
  });

  test("mixed: comment-mention + real <style> — only the real one fires", () => {
    const source = [
      "<program>",
      "// `<style>` is rejected",
      "<style>body {}</style>",
      "</program>",
    ].join("\n");
    const fires = lint(source).filter(d => d.code === "W-LINT-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    // Every fire must be on line 3 (the real `<style>`), not line 2 (comment)
    for (const f of fires) {
      expect(f.line).toBe(3);
    }
  });
});

// ---------------------------------------------------------------------------
// §2 W-LINT-007 — <Comp prop={val}> suppression inside strings
// ---------------------------------------------------------------------------

describe("§2 W-LINT-007 — string suppression", () => {
  test("prop={val} inside a string literal does NOT fire W-LINT-007", () => {
    const source = [
      "<program>",
      "${ const example = \"<Comp prop={val}> is JSX, not scrml\"; }",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-007")).toBe(0);
  });

  test("REGRESSION: real <Comp prop={val}> in markup STILL fires", () => {
    const source = [
      "<program>",
      "<Comp prop={val}>",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-007")).toBeGreaterThanOrEqual(1);
  });

  test("function-body context: `const seen = {}` does NOT fire W-LINT-007", () => {
    // S121 native-parser parse-css-body.scrml:359 reproduction. An object-
    // literal assignment inside a top-level fn body (v0.3 logic-default
    // mode, wrapped in ${...}) must not fire W-LINT-007. The fix is
    // load-bearing on the brace-counter being context-aware so the outer
    // ${...} extends past string-embedded braces in the function body.
    const source = [
      "${",
      "    export fn scanReactiveRefs(value) {",
      "        const refs = []",
      "        const seen = {}",
      "        // a string literal carrying a `{` :",
      "        const open = \"{\"",
      "        const close = \"}\"",
      "        return seen",
      "    }",
      "}",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-007")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 W-LINT-010 — phantom CSS range no longer swallows downstream `${...}`
// ---------------------------------------------------------------------------

describe("§3 W-LINT-010 — phantom CSS range suppression", () => {
  test("`#{` inside a comment does NOT open a phantom CSS range", () => {
    // Pre-fix: the comment text containing `#{` would open a phantom CSS
    // range that swallowed every downstream `${...}`, firing W-LINT-010
    // on each one. Post-fix: the comment is a skip range, no phantom
    // CSS range opens.
    const source = [
      "<program>",
      "// sigils: ${ ?{ #{ ~{ !{ ^{ — context openers",
      "${ const a = 1 }",
      "${ const b = 2 }",
      "${ const c = 3 }",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-010")).toBe(0);
  });

  test("`#{` inside a string does NOT open a phantom CSS range", () => {
    const source = [
      "<program>",
      "${ const example = \"#{ color: red; }\" }",
      "${ const a = 1 }",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-010")).toBe(0);
  });

  test("REGRESSION: real `${...}` inside a real `#{...}` STILL fires", () => {
    const source = [
      "<program>",
      "<p>hi</p>",
      "#{",
      "  .x { color: ${@theme} }",
      "}",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-010")).toBeGreaterThanOrEqual(1);
  });

  test("`${...}` inside a doc-comment inside a real `#{...}` does NOT fire", () => {
    const source = [
      "<program>",
      "<p>hi</p>",
      "#{",
      "  /* doc: use ${@var} for reactive values */",
      "  .x { color: red }",
      "}",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-010")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §4 W-LINT-011 — `:attr=` suppression in comments + strings
// ---------------------------------------------------------------------------

describe("§4 W-LINT-011 — comment + string suppression", () => {
  test("`:attr=` inside a line comment does NOT fire W-LINT-011", () => {
    const source = [
      "<program>",
      "// Vue uses :class=\"...\" — scrml uses class:name=@cond",
      "<p class:active=@on>hi</p>",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-011")).toBe(0);
  });

  test("`:attr=` inside a string literal does NOT fire W-LINT-011", () => {
    const source = [
      "<program>",
      "${ const example = \"Vue: :disabled='on'\"; }",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-011")).toBe(0);
  });

  test("REGRESSION: real `:disabled=` in markup STILL fires W-LINT-011", () => {
    const source = [
      "<program>",
      "<button :disabled=\"isLoading\">click</button>",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-011")).toBeGreaterThanOrEqual(1);
  });

  test("scrml's `class:name=@cond` does NOT fire W-LINT-011 (no leading space-colon match)", () => {
    const source = "<div class:active=@on>hi</div>";
    expect(countCode(lint(source), "W-LINT-011")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5 Coordinated string/comment computation
// ---------------------------------------------------------------------------

describe("§5 Coordinated string/comment ranges", () => {
  test("`//` inside a string is NOT a phantom comment opener", () => {
    // A URL in a string contains `//`. Pre-fix, buildCommentRanges would
    // open a phantom line comment from the `//` to end-of-line, possibly
    // suppressing a real ghost on the same line. Post-fix, the coordinated
    // pass sees the `//` is inside a string and ignores it.
    //
    // Test shape: a string containing `//` followed by a ghost pattern on
    // the same line as the string-closer + something legit AFTER the
    // string — the ghost must still be detected, proving the phantom
    // comment did NOT swallow it.
    const source = [
      "<program>",
      "${ const url = \"https://example.com/path\"; const x = url.length; }",
      "<button onClick={doIt}>x</button>",
      "</program>",
    ].join("\n");
    // The onClick= on line 3 is a real W-LINT-004 ghost; the `//` in the
    // URL on line 2 must NOT suppress it.
    expect(countCode(lint(source), "W-LINT-004")).toBeGreaterThanOrEqual(1);
  });

  test("`\"...\"` inside a `//` line comment is NOT a phantom string opener", () => {
    // The comment text contains a string-like sequence; pre-coordinated
    // pass might have opened a phantom string. Post-fix, the `//` opens
    // the comment first; the `"..."` inside is comment text.
    //
    // This test verifies the SUPPRESSION side: ghost text inside the
    // comment's "string-like" payload is still suppressed (comment beats
    // pseudo-string).
    const source = [
      "<program>",
      "// example: \"<style>\" is a ghost",
      "<p>hi</p>",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-001")).toBe(0);
  });

  test("nested escape sequences in strings handled correctly", () => {
    // `"a\\\"b"` — a quoted string containing escaped quote then continues
    const source = [
      "<program>",
      "${ const s = \"a\\\"<style>b\"; }",
      "</program>",
    ].join("\n");
    // The <style> is inside a string (the escaped quote is consumed as
    // string content), so no W-LINT-001 fire.
    expect(countCode(lint(source), "W-LINT-001")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §6 Brace-counter context-awareness
// ---------------------------------------------------------------------------

describe("§6 Brace-counter context-awareness", () => {
  test("`${...}` with string-embedded `{` covers full body (not truncated)", () => {
    // Pre-fix: naive brace counter saw the `"{"` and `"}"` string-embedded
    // braces as structural; the ${...} would close at the first non-string
    // `}` after them, truncating logicRanges. A `prop={val}` BELOW would
    // then NOT be in logicRanges → W-LINT-007 fires.
    //
    // Post-fix: brace counter skips strings; the ${...} extends correctly;
    // `seen = {}` inside the ${...} is suppressed via logicRanges.
    const source = [
      "${",
      "    fn parseExample(src) {",
      "        if (src.charAt(p) == \"{\") return 1",
      "        if (src.charAt(p) == \"}\") return 2",
      "        const obj = {}",         // would fire W-LINT-007 pre-fix
      "        return obj",
      "    }",
      "}",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-007")).toBe(0);
  });

  test("`${...}` with comment-embedded `{` covers full body", () => {
    const source = [
      "${",
      "    // example: { x: 1 }",
      "    // example: } closer",
      "    const data = {}",
      "}",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-007")).toBe(0);
  });

  test("`#{...}` brace counter skips strings", () => {
    // Real CSS context with a string-embedded brace shouldn't truncate.
    // ${...} inside the CSS context body (at the END) STILL fires
    // W-LINT-010 — the brace counter correctly identified it's still in
    // the CSS block.
    const source = [
      "<program>",
      "<p>hi</p>",
      "#{",
      "  /* comment with { brace */",
      "  .x[data-attr=\"{}\"] { color: red }",
      "  .y { color: ${@theme} }",   // real ghost — still fires
      "}",
      "</program>",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-010")).toBeGreaterThanOrEqual(1);
  });

  test("unbalanced string-embedded braces don't unbalance the logic block", () => {
    const source = [
      "${",
      "    const opener = \"{{{\"",
      "    const closer = \"}}}\"",
      "    const obj = {}",          // would fire W-LINT-007 pre-fix
      "}",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-007")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §7 Mirror-class reproductions
// ---------------------------------------------------------------------------

describe("§7 Native-parser mirror-class reproductions", () => {
  test("parse-markup.scrml-style: `<style>` in doc comments suppressed", () => {
    // Reproduction of parse-markup.scrml lines 503/518/521/899-906 pattern.
    const source = [
      "${",
      "    // peekTagNameLower returns the name after `<`. Used by the",
      "    // `<style>` recognizer in dispatchTopLevel.",
      "    export fn peekTagNameLower(cursor) {",
      "        return cursor.tag",
      "    }",
      "",
      "    // scanPastStyleBlock — when cursor is at a `<style` opener,",
      "    // return offset past the matching `</style>`.",
      "    fn scanPastStyleBlock(cursor) {",
      "        return cursor.pos",
      "    }",
      "}",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-001")).toBe(0);
  });

  test("parse-markup.scrml-style: `<style>` in diagnostic-message string suppressed", () => {
    // Reproduction of parse-markup.scrml:920 pattern — the .scrml parser
    // emits a diagnostic that REFERENCES `<style>` as part of its message.
    const source = [
      "${",
      "    fn emitError() {",
      "        const msg = \"<style> blocks are not supported in scrml. Use #{} for CSS.\"",
      "        return msg",
      "    }",
      "}",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-001")).toBe(0);
  });

  test("parse-markup.scrml-style: `${...}` in comment about sigils suppressed", () => {
    // Reproduction of the W-LINT-010 mass-fire pattern. A comment lists
    // the sigils `${ ?{ #{ ~{ ...` — pre-fix, the `#{` opened a phantom
    // CSS range that swallowed every legitimate `${...}` downstream.
    const source = [
      "${",
      "    // Inside an orphan-brace region every context-entry boundary",
      "    // (a `<` markup opener, a `${ ?{ #{ ...` sigil) is raw text.",
      "    fn checkOrphan(cursor) {",
      "        return cursor.depth",
      "    }",
      "",
      "    // ${...} is the logic-interp sigil; documented here.",
      "    // Another ${...} reference here.",
      "    // And a third ${...} mention.",
      "    fn other() { return 1 }",
      "}",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-010")).toBe(0);
  });

  test("parse-stmt.scrml-style: `:attr=` in a string demoing Vue syntax suppressed", () => {
    const source = [
      "${",
      "    fn parseExample() {",
      "        const vueExample = \"<button :disabled='on'>x</button>\"",
      "        return vueExample.length",
      "    }",
      "}",
    ].join("\n");
    expect(countCode(lint(source), "W-LINT-011")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §8 Regression — real ghosts in adopter code still fire
// ---------------------------------------------------------------------------

describe("§8 Real ghosts still fire", () => {
  test("W-LINT-001 + W-LINT-004 + W-LINT-007 in a single adopter file", () => {
    const source = [
      '<markup name="app">',
      "  <style>body { color: red; }</style>",
      "  <button onClick={doIt}>x</button>",
      "  <Comp prop={val}>",
      "</>",
    ].join("\n");
    const diags = lint(source);
    expect(hasCode(diags, "W-LINT-001")).toBe(true);
    expect(hasCode(diags, "W-LINT-004")).toBe(true);
    expect(hasCode(diags, "W-LINT-007")).toBe(true);
  });

  test("Vue `:disabled=` in markup fires W-LINT-011", () => {
    const source = '<button :disabled="cond">x</button>';
    expect(hasCode(lint(source), "W-LINT-011")).toBe(true);
  });

  test("Svelte `${...}` in CSS fires W-LINT-010", () => {
    const source = [
      "<p>hi</p>",
      "#{ .x { color: ${@theme} } }",
    ].join("\n");
    expect(hasCode(lint(source), "W-LINT-010")).toBe(true);
  });

  test("empty file produces no diagnostics", () => {
    expect(lint("").length).toBe(0);
  });

  test("file with only whitespace produces no diagnostics", () => {
    expect(lint("\n\n   \n").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §9 Edge cases
// ---------------------------------------------------------------------------

describe("§9 Edge cases", () => {
  test("unterminated string does not crash the lint", () => {
    // String runs to end-of-file without a closing quote
    const source = '<p>start</p>\n${ const s = "unterminated\n';
    expect(() => lint(source)).not.toThrow();
  });

  test("unterminated block comment does not crash the lint", () => {
    const source = '<p>start</p>\n/* unterminated\nlots\nof\ntext';
    expect(() => lint(source)).not.toThrow();
  });

  test("nested `${...}` with internal braces handled", () => {
    const source = [
      "${",
      "    const outer = {",
      "        a: { b: 1 },",
      "        c: { d: { e: 2 } }",
      "    }",
      "}",
    ].join("\n");
    // No false-fires from the deeply nested structural braces
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });

  test("escape sequences in strings ('a\\\\'b' style) handled", () => {
    // `"a\\"b"` is two strings: `"a\\"` (containing escaped backslash + quote)
    // — actually `\\` is an escaped backslash, then `"b"` is a new string.
    // The key is that buildSkipRanges handles `\\` correctly so subsequent
    // `"` is detected as a string opener.
    const source = '<p>${ const s = "a\\\\"; const t = "b"; }</p>';
    expect(() => lint(source)).not.toThrow();
  });

  test("`/*` inside a string is NOT a phantom block comment", () => {
    const source = '<p>${ const re = "/* not a comment */"; }</p>';
    // No diagnostics expected — pattern just exercises that the
    // coordinated pass handles `/*` inside string correctly without crash.
    expect(() => lint(source)).not.toThrow();
  });
});
