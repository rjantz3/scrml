/**
 * Tailwind Phase 1 Coverage — S100
 *
 * Tests for the utility families added in S100 Phase 1 to close
 * adopter-visible drift surfaced by the docs/website build-out (S99):
 *
 *   1a. Font families:        font-{sans,serif,mono}
 *   1b. List utilities:       list-{disc,decimal,none,square,inside,outside}
 *   1c. Space reverse:        space-{x,y}-reverse (basic space-{x,y}-N existed)
 *   1d. Border-collapse:      border-{collapse,separate}, table-{auto,fixed}
 *   1e. Auto margin:          mx-auto / my-auto / m-auto / mt-auto / etc.
 *       (Already shipped pre-S100 in registerSpacing(); covered here for parity.)
 *
 * Negative cases ensure the engine does NOT invent rules for out-of-scale
 * inputs (e.g. `space-y-9999`, `list-checkmark`).
 */

import { describe, test, expect } from "bun:test";
import { getTailwindCSS } from "../../src/tailwind-classes.js";

// ---------------------------------------------------------------------------
// 1a. Font families
// ---------------------------------------------------------------------------

describe("Phase 1a — font families", () => {
  test("font-sans emits ui-sans-serif stack", () => {
    const css = getTailwindCSS("font-sans");
    expect(css).toContain(".font-sans");
    expect(css).toContain("font-family:");
    expect(css).toContain("ui-sans-serif");
    expect(css).toContain("system-ui");
    expect(css).toContain("sans-serif");
  });

  test("font-serif emits ui-serif stack", () => {
    const css = getTailwindCSS("font-serif");
    expect(css).toContain(".font-serif");
    expect(css).toContain("font-family:");
    expect(css).toContain("ui-serif");
    expect(css).toContain("Georgia");
    expect(css).toContain("serif");
  });

  test("font-mono emits ui-monospace stack", () => {
    const css = getTailwindCSS("font-mono");
    expect(css).toContain(".font-mono");
    expect(css).toContain("font-family:");
    expect(css).toContain("ui-monospace");
    expect(css).toContain("Menlo");
    expect(css).toContain("monospace");
  });

  test("font-bold (existing weight) still resolves — no regression from family addition", () => {
    const css = getTailwindCSS("font-bold");
    expect(css).toContain("font-weight: 700");
  });

  test("font-unknown returns null", () => {
    expect(getTailwindCSS("font-unknown")).toBeNull();
  });

  test("font-sans + responsive prefix composes via existing variant pipeline", () => {
    const css = getTailwindCSS("md:font-mono");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("font-family:");
    expect(css).toContain("ui-monospace");
  });
});

// ---------------------------------------------------------------------------
// 1b. List utilities
// ---------------------------------------------------------------------------

describe("Phase 1b — list utilities", () => {
  test("list-disc emits list-style-type: disc", () => {
    expect(getTailwindCSS("list-disc")).toBe(".list-disc { list-style-type: disc }");
  });

  test("list-decimal emits list-style-type: decimal", () => {
    expect(getTailwindCSS("list-decimal")).toBe(".list-decimal { list-style-type: decimal }");
  });

  test("list-none emits list-style-type: none", () => {
    expect(getTailwindCSS("list-none")).toBe(".list-none { list-style-type: none }");
  });

  test("list-square emits list-style-type: square", () => {
    expect(getTailwindCSS("list-square")).toBe(".list-square { list-style-type: square }");
  });

  test("list-inside emits list-style-position: inside", () => {
    expect(getTailwindCSS("list-inside")).toBe(".list-inside { list-style-position: inside }");
  });

  test("list-outside emits list-style-position: outside", () => {
    expect(getTailwindCSS("list-outside")).toBe(".list-outside { list-style-position: outside }");
  });

  test("unknown list style returns null", () => {
    expect(getTailwindCSS("list-checkmark")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 1c. Space-{x,y}-N + reverse
// ---------------------------------------------------------------------------

describe("Phase 1c — space utilities", () => {
  test("space-y-4 emits adjacent-sibling margin-top rule", () => {
    const css = getTailwindCSS("space-y-4");
    expect(css).toContain(".space-y-4");
    expect(css).toContain("> :not([hidden]) ~ :not([hidden])");
    expect(css).toContain("margin-top: 1rem");
  });

  test("space-x-2 emits adjacent-sibling margin-left rule", () => {
    const css = getTailwindCSS("space-x-2");
    expect(css).toContain(".space-x-2");
    expect(css).toContain("> :not([hidden]) ~ :not([hidden])");
    expect(css).toContain("margin-left: 0.5rem");
  });

  test("space-y-0 emits 0px margin-top", () => {
    const css = getTailwindCSS("space-y-0");
    expect(css).toContain("margin-top: 0px");
  });

  test("space-y-px emits 1px margin-top", () => {
    const css = getTailwindCSS("space-y-px");
    expect(css).toContain("margin-top: 1px");
  });

  test("space-y-reverse sets --tw-space-y-reverse custom property", () => {
    const css = getTailwindCSS("space-y-reverse");
    expect(css).toContain(".space-y-reverse");
    expect(css).toContain("> :not([hidden]) ~ :not([hidden])");
    expect(css).toContain("--tw-space-y-reverse: 1");
  });

  test("space-x-reverse sets --tw-space-x-reverse custom property", () => {
    const css = getTailwindCSS("space-x-reverse");
    expect(css).toContain(".space-x-reverse");
    expect(css).toContain("> :not([hidden]) ~ :not([hidden])");
    expect(css).toContain("--tw-space-x-reverse: 1");
  });

  test("space-y-9999 (out of scale) returns null — engine does not invent", () => {
    expect(getTailwindCSS("space-y-9999")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 1d. Border-collapse + table layout
// ---------------------------------------------------------------------------

describe("Phase 1d — border-collapse + table layout", () => {
  test("border-collapse emits border-collapse: collapse", () => {
    expect(getTailwindCSS("border-collapse")).toBe(".border-collapse { border-collapse: collapse }");
  });

  test("border-separate emits border-collapse: separate", () => {
    expect(getTailwindCSS("border-separate")).toBe(".border-separate { border-collapse: separate }");
  });

  test("table-auto emits table-layout: auto", () => {
    expect(getTailwindCSS("table-auto")).toBe(".table-auto { table-layout: auto }");
  });

  test("table-fixed emits table-layout: fixed", () => {
    expect(getTailwindCSS("table-fixed")).toBe(".table-fixed { table-layout: fixed }");
  });

  test("table (display) still resolves — no regression from table-auto/fixed", () => {
    const css = getTailwindCSS("table");
    expect(css).toContain("display: table");
  });

  test("border (default border-width) still resolves — no regression from border-collapse", () => {
    const css = getTailwindCSS("border");
    expect(css).toContain("border-width: 1px");
  });
});

// ---------------------------------------------------------------------------
// 1e. Auto margin (already shipped pre-S100; covered for adopter-facing parity)
// ---------------------------------------------------------------------------

describe("Phase 1e — auto margin (regression coverage)", () => {
  test("mx-auto emits left+right auto", () => {
    const css = getTailwindCSS("mx-auto");
    expect(css).toContain("margin-left: auto");
    expect(css).toContain("margin-right: auto");
  });

  test("my-auto emits top+bottom auto", () => {
    const css = getTailwindCSS("my-auto");
    expect(css).toContain("margin-top: auto");
    expect(css).toContain("margin-bottom: auto");
  });

  test("m-auto emits shorthand auto", () => {
    const css = getTailwindCSS("m-auto");
    expect(css).toContain("margin: auto");
  });

  test("mt-auto emits margin-top: auto", () => {
    expect(getTailwindCSS("mt-auto")).toContain("margin-top: auto");
  });

  test("mr-auto emits margin-right: auto", () => {
    expect(getTailwindCSS("mr-auto")).toContain("margin-right: auto");
  });

  test("mb-auto emits margin-bottom: auto", () => {
    expect(getTailwindCSS("mb-auto")).toContain("margin-bottom: auto");
  });

  test("ml-auto emits margin-left: auto", () => {
    expect(getTailwindCSS("ml-auto")).toContain("margin-left: auto");
  });
});
