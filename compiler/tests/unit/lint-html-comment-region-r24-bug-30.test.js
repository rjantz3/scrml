/**
 * lint-ghost-patterns — HTML/Markup Comment Region Skip (R24 Bug 30)
 *
 * Regression tests for r24-bug-30-linter-html-comment-2026-05-27.
 *
 * Bug surface (R24 dev-2 + dev-3 + dev-4 + R25 dev-3 confirmed): the lint pass
 * walked source text without HTML-comment region awareness, so every R24 dev
 * friction-report `<!-- ... -->` block (containing anti-pattern words like
 * `<style>`, `interface`, `{#if}`, `prop={val}` for COMPARISON purposes)
 * tripped multiple W-LINT-* codes. dev-3-svelte alone had 10 W-LINT fires;
 * all 10 were inside the `<!-- FRICTION REPORT -->` block. The "workaround"
 * adopters reached for (rewriting their own code) was a response to false
 * signal.
 *
 * Fix (per SPEC §4.7 S87/S88 amendment + SPEC §27 doctrine that comments are
 * opaque):
 *   1. `buildSkipRanges()` now recognizes `<!-- ... -->` spans (HTML 5 non-
 *      nesting semantics — first `-->` closes) and adds them to
 *      `commentRanges`. Every W-LINT pattern whose skipIf already checked
 *      `commentRanges` (W-LINT-001 / 007 / 011 / 016 / 017 / 018 / 019 / 020 /
 *      021 / 022 / 023 / 024 / W-LIFECYCLE-CANDIDATE) gains HTML-comment
 *      awareness automatically.
 *   2. The eight patterns that previously checked ONLY `logicRanges` —
 *      W-LINT-003 / 004 / 005 / 006 / 008 / 012 / 014 / 015 — are extended
 *      to also skip on `commentRanges`. SPEC §27 + §4.7 are categorical:
 *      comments do not carry code, regardless of comment shape.
 *
 * Coverage:
 *   §1 Minimal repro — single-line `<!-- ... -->` with W-LINT-trigger text
 *   §2 Multi-line `<!-- ... -->` (R24 friction-report shape)
 *   §3 Adjacent comments — middle text outside comments still fires
 *   §4 Empty comment `<!-- -->` does not crash
 *   §5 Unterminated `<!--` runs to EOF
 *   §6 Inner `<!--` does NOT nest — first `-->` closes
 *   §7 Per-code regression — W-LINT-001 (`<style>`)
 *   §8 Per-code regression — W-LINT-003 (className=)
 *   §9 Per-code regression — W-LINT-005 (value={...})
 *  §10 Per-code regression — W-LINT-007 (prop={val})
 *  §11 Per-code regression — W-LINT-011 (`:attr=`)
 *  §12 Per-code regression — W-LINT-014 (Svelte {#if})
 *  §13 Per-code regression — W-LINT-022 (interface / type X = {)
 *  §14 Negative control — outside-comment ghost still fires
 *  §15 R24 friction-report exact shape — composite assertion
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lint(source) {
  return lintGhostPatterns(source, "test.scrml");
}

function countCode(diags, code) {
  return diags.filter(d => d.code === code).length;
}

function anyW(diags) {
  return diags.filter(d => d.code.startsWith("W-LINT-")).length;
}

// ---------------------------------------------------------------------------
// §1 Minimal repro
// ---------------------------------------------------------------------------

describe("§1 minimal repro — single-line HTML comment", () => {
  test("single-line `<!-- <style> -->` triggers NO W-LINT-001", () => {
    const source = [
      "<program>",
      "<page>",
      "<!-- React uses <style> blocks -->",
      "<p>hi</p>",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-001")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2 Multi-line comment — R24 friction-report shape
// ---------------------------------------------------------------------------

describe("§2 multi-line HTML comment block", () => {
  test("multi-line `<!-- ... -->` containing 6 ghost shapes triggers ZERO W-LINT-* fires", () => {
    const source = [
      "<program>",
      "<page>",
      "<!--",
      "  FRICTION REPORT",
      "  --------------",
      "  React uses <style> blocks for CSS.",
      "  React uses className={foo} for dynamic classes.",
      "  React uses value={@state} for input binding.",
      "  Svelte uses {#if @cond} ... {/if} for conditionals.",
      "  Vue uses :class for dynamic class binding.",
      "  TypeScript uses interface User { name: string }.",
      "-->",
      "<p>hi</p>",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(anyW(diags)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 Adjacent comments — middle text outside is still scanned
// ---------------------------------------------------------------------------

describe("§3 adjacent comments — text between still scanned", () => {
  test("`<!-- A --> <style> <!-- B -->` fires W-LINT-001 on the middle <style>", () => {
    const source = [
      "<program>",
      "<page>",
      "<!-- A --> <style> <!-- B -->",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-001")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §4 Empty comment
// ---------------------------------------------------------------------------

describe("§4 empty comment", () => {
  test("`<!-- -->` does not crash and emits no W-LINT", () => {
    const source = [
      "<program>",
      "<page>",
      "<!-- -->",
      "<p>hi</p>",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(anyW(diags)).toBe(0);
  });

  test("`<!---->` (zero-content) does not crash and emits no W-LINT", () => {
    const source = [
      "<program>",
      "<page>",
      "<!---->",
      "<p>hi</p>",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(anyW(diags)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5 Unterminated comment — runs to EOF
// ---------------------------------------------------------------------------

describe("§5 unterminated comment", () => {
  test("`<!--` with no closing `-->` runs to EOF and silences downstream W-LINT", () => {
    const source = [
      "<program>",
      "<page>",
      "<!--",
      "  React uses <style> blocks",
      "  className={foo}",
      "  no closer below",
    ].join("\n");
    const diags = lint(source);
    expect(anyW(diags)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §6 Non-nesting — first `-->` closes
// ---------------------------------------------------------------------------

describe("§6 HTML comment non-nesting", () => {
  test("inner `<!--` does NOT open a nested level; first `-->` closes", () => {
    // After the FIRST `-->`, `<style>` is no longer in a comment region and
    // SHOULD fire W-LINT-001. The inner `<!--` is raw content within the
    // outer comment.
    const source = [
      "<program>",
      "<page>",
      "<!-- outer text with inner <!-- pseudo-open --> <style>",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-001")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §7-§13 per-code regression
// ---------------------------------------------------------------------------

describe("§7 W-LINT-001 (<style>) — inside `<!-- -->` does not fire", () => {
  test("commented `<style>` does not fire W-LINT-001", () => {
    const source = "<program><page><!-- <style>...</style> -->\n<p>x</p></page></program>";
    expect(countCode(lint(source), "W-LINT-001")).toBe(0);
  });
});

describe("§8 W-LINT-003 (className=) — inside `<!-- -->` does not fire", () => {
  test("commented `className=` does not fire W-LINT-003", () => {
    const source = "<program><page><!-- className={foo} is React -->\n<p>x</p></page></program>";
    expect(countCode(lint(source), "W-LINT-003")).toBe(0);
  });
});

describe("§9 W-LINT-005 (value={...}) — inside `<!-- -->` does not fire", () => {
  test("commented `value={...}` does not fire W-LINT-005", () => {
    const source = "<program><page><!-- value={@state} is React -->\n<p>x</p></page></program>";
    expect(countCode(lint(source), "W-LINT-005")).toBe(0);
  });
});

describe("§10 W-LINT-007 (prop={val}) — inside `<!-- -->` does not fire", () => {
  test("commented `<Comp prop={val}>` does not fire W-LINT-007", () => {
    const source = "<program><page><!-- <Foo prop={val}> is JSX -->\n<p>x</p></page></program>";
    expect(countCode(lint(source), "W-LINT-007")).toBe(0);
  });
});

describe("§11 W-LINT-011 (`:attr=`) — inside `<!-- -->` does not fire", () => {
  test("commented Vue `:class=` does not fire W-LINT-011", () => {
    const source = "<program><page><!-- Vue uses :class=\"x\" -->\n<p>x</p></page></program>";
    expect(countCode(lint(source), "W-LINT-011")).toBe(0);
  });
});

describe("§12 W-LINT-014 (Svelte {#if}) — inside `<!-- -->` does not fire", () => {
  test("commented `{#if @cond}` does not fire W-LINT-014", () => {
    const source = "<program><page><!-- Svelte uses {#if @cond}...{/if} -->\n<p>x</p></page></program>";
    expect(countCode(lint(source), "W-LINT-014")).toBe(0);
  });
});

describe("§13 W-LINT-022 (interface / untagged type) — inside `<!-- -->` does not fire", () => {
  test("commented `interface User { name: string }` does not fire W-LINT-022", () => {
    const source = "<program><page><!-- TS: interface User { name: string } -->\n<p>x</p></page></program>";
    expect(countCode(lint(source), "W-LINT-022")).toBe(0);
  });

  test("commented `type X = { ... }` (untagged) does not fire W-LINT-022", () => {
    const source = "<program><page><!-- TS: type Box = { width: number } -->\n<p>x</p></page></program>";
    expect(countCode(lint(source), "W-LINT-022")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §14 Negative control — outside-comment ghost still fires
// ---------------------------------------------------------------------------

describe("§14 negative control — outside-comment ghosts still fire", () => {
  test("`<style>` OUTSIDE any `<!-- -->` still fires W-LINT-001", () => {
    const source = [
      "<program>",
      "<page>",
      "<style>.x { color: red; }</style>",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-001")).toBe(1);
  });

  test("Svelte `{#if @cond}` OUTSIDE any `<!-- -->` still fires W-LINT-014", () => {
    const source = [
      "<program>",
      "<page>",
      "{#if @loggedIn}<span>hi</span>{/if}",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    // Pattern matches both `{#if ...}` opener and `{/if}` closer — pre-existing
    // shape. The point of this assertion is that comment-skip did NOT silence
    // it; ≥1 fire is the signal.
    expect(countCode(diags, "W-LINT-014")).toBeGreaterThanOrEqual(1);
  });

  test("`interface User { ... }` OUTSIDE any `<!-- -->` still fires W-LINT-022", () => {
    const source = [
      "<program>",
      "interface User { name: string }",
      "<page><p>x</p></page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-022")).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §15 R24 friction-report shape — composite assertion
// ---------------------------------------------------------------------------

describe("§15 R24 friction-report exact shape — composite", () => {
  test("R24 friction-report-shaped <!-- ... --> fires zero W-LINT, code outside still scanned", () => {
    const source = [
      "<program title=\"r24-repro\">",
      "<page>",
      "<h1>Hello</h1>",
      "<!-- FRICTION REPORT -->",
      "<!--",
      "  React's `.map()` is ergonomic but produces W-LINT-014 here.",
      "  Vue's `{#if}` block style is unfamiliar.",
      "  React uses `===` for strict equality.",
      "  React has `<style>` blocks for CSS.",
      "  React has `className={foo}` attribute.",
      "  We use `interface User { name: string }` in TS.",
      "  value={@state} is React JSX.",
      "-->",
      "<p>hi</p>",
      "</page>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    // Zero W-LINT-* inside the comment region
    expect(anyW(diags)).toBe(0);
  });
});
