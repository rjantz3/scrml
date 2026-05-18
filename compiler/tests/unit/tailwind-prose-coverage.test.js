/**
 * Tailwind Prose Coverage — S100 Phase 2 / SPEC §26.6
 *
 * Tests for the typography plugin port: the `prose` utility family.
 *
 *   §1 Bare `prose` emits base + comprehensive nested-element rules
 *   §2 Color variants (slate/gray/zinc/neutral/stone) override tones
 *   §3 Size variants (sm/base/lg/xl/2xl) override font-size + line-height
 *   §4 `not-prose` opt-out marker + :where()-:not() suffix presence
 *   §5 Composition: prose + prose-{color} + prose-{size} stacks cleanly
 *   §6 Variant prefixing: md:prose-lg, dark:prose, hover:prose-slate (sane shapes)
 */

import { describe, test, expect } from "bun:test";
import { getTailwindCSS, getAllUsedCSS } from "../../src/tailwind-classes.js";

// ---------------------------------------------------------------------------
// §1 Bare prose
// ---------------------------------------------------------------------------

describe("§1 Bare prose", () => {
  test("emits container rule with color, max-width, line-height", () => {
    const css = getTailwindCSS("prose");
    expect(css).not.toBeNull();
    expect(css).toContain(".prose { color: #374151");
    expect(css).toContain("max-width: 65ch");
    expect(css).toContain("line-height: 1.75");
    expect(css).toContain("font-size: 1rem");
  });

  test("emits paragraph rule with not-prose opt-out suffix", () => {
    const css = getTailwindCSS("prose");
    expect(css).toContain(".prose :where(p):not(:where([class~=\"not-prose\"] *))");
    expect(css).toContain("margin-top: 1.25em");
  });

  test("emits heading rules (h1..h4)", () => {
    const css = getTailwindCSS("prose");
    expect(css).toContain(".prose :where(h1)");
    expect(css).toContain(".prose :where(h2)");
    expect(css).toContain(".prose :where(h3)");
    expect(css).toContain(".prose :where(h4)");
    // h1 default-size for base prose
    expect(css).toContain("font-size: 2.25em");
  });

  test("emits link styling", () => {
    const css = getTailwindCSS("prose");
    expect(css).toContain(".prose :where(a)");
    expect(css).toContain("text-decoration: underline");
  });

  test("emits blockquote styling with border-left + italic", () => {
    const css = getTailwindCSS("prose");
    expect(css).toContain(".prose :where(blockquote)");
    expect(css).toContain("font-style: italic");
    expect(css).toContain("border-left-width: 0.25rem");
  });

  test("emits code (inline) + pre (block) with monospace + backtick ::before/::after", () => {
    const css = getTailwindCSS("prose");
    expect(css).toContain(".prose :where(code)");
    expect(css).toContain(".prose :where(pre)");
    expect(css).toContain("ui-monospace");
    // Inline code wraps content in backticks via ::before/::after
    expect(css).toContain(".prose :where(code::before)");
    expect(css).toContain("content: \"`\"");
  });

  test("emits table rules — table, thead, thead th, tbody tr, tbody td, tfoot", () => {
    const css = getTailwindCSS("prose");
    expect(css).toContain(".prose :where(table)");
    expect(css).toContain(".prose :where(thead)");
    expect(css).toContain(".prose :where(thead th)");
    expect(css).toContain(".prose :where(tbody tr)");
    expect(css).toContain(".prose :where(tbody td)");
    expect(css).toContain(".prose :where(tfoot)");
  });

  test("emits list rules — ul, ol, li, and ol[type=...] variants", () => {
    const css = getTailwindCSS("prose");
    expect(css).toContain(".prose :where(ul)");
    expect(css).toContain(".prose :where(ol)");
    expect(css).toContain(".prose :where(li)");
    expect(css).toContain(".prose :where(ol[type=\"A\"])");
    expect(css).toContain(".prose :where(ol[type=\"1\"])");
    expect(css).toContain("list-style-type: upper-alpha");
  });

  test("emits hr + figure + figcaption + img + kbd", () => {
    const css = getTailwindCSS("prose");
    expect(css).toContain(".prose :where(hr)");
    expect(css).toContain(".prose :where(figure)");
    expect(css).toContain(".prose :where(figcaption)");
    expect(css).toContain(".prose :where(img)");
    expect(css).toContain(".prose :where(kbd)");
  });
});

// ---------------------------------------------------------------------------
// §2 Color variants
// ---------------------------------------------------------------------------

describe("§2 Color variants", () => {
  test("prose-slate emits container color override using slate-700", () => {
    const css = getTailwindCSS("prose-slate");
    expect(css).not.toBeNull();
    expect(css).toContain(".prose-slate { color: #334155 }"); // slate-700
  });

  test("prose-slate overrides headings to slate-900", () => {
    const css = getTailwindCSS("prose-slate");
    expect(css).toContain(".prose-slate :where(h1)");
    expect(css).toContain("color: #0f172a"); // slate-900
  });

  test("prose-slate overrides pre to slate-200/-800", () => {
    const css = getTailwindCSS("prose-slate");
    expect(css).toContain(".prose-slate :where(pre)");
    expect(css).toContain("color: #e2e8f0"); // slate-200
    expect(css).toContain("background-color: #1e293b"); // slate-800
  });

  test("prose-gray, prose-zinc, prose-neutral, prose-stone all resolve", () => {
    for (const variant of ["prose-gray", "prose-zinc", "prose-neutral", "prose-stone"]) {
      const css = getTailwindCSS(variant);
      expect(css).not.toBeNull();
      expect(css).toContain(`.${variant} `);
    }
  });

  test("prose-gray uses gray-700 / gray-900 shades", () => {
    const css = getTailwindCSS("prose-gray");
    expect(css).toContain(".prose-gray { color: #374151 }"); // gray-700
    expect(css).toContain("color: #111827"); // gray-900 used for headings/links
  });

  test("unknown color variant returns null (no invented rules)", () => {
    expect(getTailwindCSS("prose-azure")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §3 Size variants
// ---------------------------------------------------------------------------

describe("§3 Size variants", () => {
  test("prose-lg overrides container font-size + line-height", () => {
    const css = getTailwindCSS("prose-lg");
    expect(css).not.toBeNull();
    expect(css).toContain(".prose-lg { font-size: 1.125rem");
    expect(css).toContain("line-height: 1.7777778");
  });

  test("prose-lg scales h1 to 2.6666667em", () => {
    const css = getTailwindCSS("prose-lg");
    expect(css).toContain(".prose-lg :where(h1)");
    expect(css).toContain("font-size: 2.6666667em");
  });

  test("prose-sm shrinks container to 0.875rem + tighter line-height", () => {
    const css = getTailwindCSS("prose-sm");
    expect(css).toContain(".prose-sm { font-size: 0.875rem");
    expect(css).toContain("line-height: 1.7142857");
  });

  test("prose-xl, prose-2xl, prose-base all resolve", () => {
    for (const variant of ["prose-xl", "prose-2xl", "prose-base"]) {
      const css = getTailwindCSS(variant);
      expect(css).not.toBeNull();
      expect(css).toContain(`.${variant} `);
    }
  });

  test("prose-base uses default 1rem/1.75 (same as bare prose container)", () => {
    const css = getTailwindCSS("prose-base");
    expect(css).toContain(".prose-base { font-size: 1rem");
    expect(css).toContain("line-height: 1.75");
  });

  test("unknown size variant returns null", () => {
    expect(getTailwindCSS("prose-3xl")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §4 not-prose opt-out
// ---------------------------------------------------------------------------

describe("§4 not-prose opt-out", () => {
  test("not-prose itself emits empty declaration block", () => {
    const css = getTailwindCSS("not-prose");
    expect(css).toBe(".not-prose { }");
  });

  test("every prose nested rule carries :not(:where([class~=\"not-prose\"] *)) suffix", () => {
    const css = getTailwindCSS("prose");
    // Count nested rules — i.e., lines starting with `.prose :where(`.
    const nestedRuleLines = css.split("\n").filter(line => line.includes(":where("));
    expect(nestedRuleLines.length).toBeGreaterThan(20);
    for (const line of nestedRuleLines) {
      expect(line).toContain(":not(:where([class~=\"not-prose\"] *))");
    }
  });

  test("prose-slate nested rules also carry opt-out suffix", () => {
    const css = getTailwindCSS("prose-slate");
    const nestedRuleLines = css.split("\n").filter(line => line.includes(":where("));
    expect(nestedRuleLines.length).toBeGreaterThan(5);
    for (const line of nestedRuleLines) {
      expect(line).toContain(":not(:where([class~=\"not-prose\"] *))");
    }
  });

  test("prose-lg nested rules also carry opt-out suffix", () => {
    const css = getTailwindCSS("prose-lg");
    const nestedRuleLines = css.split("\n").filter(line => line.includes(":where("));
    expect(nestedRuleLines.length).toBeGreaterThan(3);
    for (const line of nestedRuleLines) {
      expect(line).toContain(":not(:where([class~=\"not-prose\"] *))");
    }
  });
});

// ---------------------------------------------------------------------------
// §5 Composition via getAllUsedCSS
// ---------------------------------------------------------------------------

describe("§5 Composition via getAllUsedCSS", () => {
  test("prose + prose-slate + prose-lg stacks all three rule sets", () => {
    const css = getAllUsedCSS(["prose", "prose-slate", "prose-lg"]);
    // Base prose container
    expect(css).toContain(".prose { color: #374151");
    // Slate override container
    expect(css).toContain(".prose-slate { color: #334155");
    // Large size container
    expect(css).toContain(".prose-lg { font-size: 1.125rem");
    // All three contribute h1 rules
    expect(css).toContain(".prose :where(h1)");
    expect(css).toContain(".prose-slate :where(h1)");
    expect(css).toContain(".prose-lg :where(h1)");
  });

  test("prose + not-prose in same class set — opt-out present but neutral", () => {
    const css = getAllUsedCSS(["prose", "not-prose"]);
    expect(css).toContain(".prose ");
    expect(css).toContain(".not-prose { }");
  });
});

// ---------------------------------------------------------------------------
// §6 Variant prefixing
// ---------------------------------------------------------------------------

describe("§6 Variant prefixing", () => {
  test("md:prose-lg wraps the whole multi-rule block in @media", () => {
    const css = getTailwindCSS("md:prose-lg");
    expect(css).not.toBeNull();
    expect(css).toMatch(/^@media \(min-width: 768px\) \{/);
    expect(css).toMatch(/\}$/);
    // Class selector should be the escaped variant-prefixed form everywhere.
    expect(css).toContain(".md\\:prose-lg");
    // The un-prefixed `.prose-lg` should NOT appear as a standalone selector
    // (the rewriter substitutes all occurrences).
    const standalonePropose = css.split(".prose-lg").length - 1;
    expect(standalonePropose).toBe(0);
  });

  test("md:prose wraps base + nested rules in @media (min-width: 768px)", () => {
    const css = getTailwindCSS("md:prose");
    expect(css).toMatch(/^@media \(min-width: 768px\) \{/);
    expect(css).toContain(".md\\:prose :where(p)");
    expect(css).toContain(".md\\:prose :where(h1)");
  });

  test("dark:prose wraps in @media (prefers-color-scheme: dark)", () => {
    const css = getTailwindCSS("dark:prose");
    expect(css).toMatch(/^@media \(prefers-color-scheme: dark\) \{/);
    expect(css).toContain(".dark\\:prose");
  });

  test("lg:prose-slate wraps prose-slate rules in @media (min-width: 1024px)", () => {
    const css = getTailwindCSS("lg:prose-slate");
    expect(css).toMatch(/^@media \(min-width: 1024px\) \{/);
    expect(css).toContain(".lg\\:prose-slate");
    // No bare `.prose-slate` should leak through.
    const standalone = css.split(".prose-slate").length - 1;
    expect(standalone).toBe(0);
  });
});
