/**
 * Bug 17 regression — the Tailwind utility-class scanner descends into
 * `${ for ... lift <markup class=...> }` iteration bodies.
 *
 * Pre-fix: `scanClassesFromHtml(htmlBody)` only saw class names on STATIC
 * HTML emitted at module-init. Lift iteration bodies emit JS `setAttribute(
 * "class", "...")` calls inside `_scrml_lift(() => {...})` factories — those
 * strings never appear in the static HTML, so the scanner missed them.
 * Result: classes used ONLY inside iteration bodies got no CSS rule
 * emitted. Silent broken styling at runtime, no diagnostic.
 *
 * Post-fix: `collectClassNamesFromAst(nodes)` walks the source AST and
 * collects class names from every markup node reachable through lift /
 * for-stmt / if-stmt / match-stmt / etc. bodies, merging with the HTML
 * scan results before `getAllUsedCSS`.
 *
 * Per SPEC §26.1: "the compiler scans the source for class names and
 * emits a CSS rule for each Tailwind utility class it finds." Markup
 * position is irrelevant to that rule.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "bug-17-tailwind-lift-"));
});

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

function compileSource(name, source) {
  const filePath = join(TMP, `${name}.scrml`);
  writeFileSync(filePath, source);
  const outDir = join(TMP, `${name}.dist`);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: outDir,
    write: true,
    log: () => {},
  });
  const errors = (result.errors || []).filter(
    e => e.severity == null || e.severity === "error",
  );
  let css = "";
  try {
    css = readFileSync(join(outDir, `${name}.css`), "utf8");
  } catch {
    // file missing — leave css empty so assertions surface a clear failure
  }
  return { errors, css };
}

describe("Bug 17: Tailwind scanner descends into lift iteration bodies", () => {
  test("classes inside ${ for ... lift <markup class=...> } emit CSS rules", () => {
    const src = `<program title="Bug 17 Repro">
    const items = ["alpha", "beta", "gamma"]

    <div class="flex gap-4 p-4">
        \${ for (let it of items) {
            lift <section class="flex-1 bg-white rounded-lg p-3 shadow-sm">
                <header class="font-semibold mb-2 text-gray-700">\${it}</>
                <p class="bg-gray-100 rounded p-2 mb-2">\${it}</>
            </>
        } }
    </>
</program>
`;
    const { errors, css } = compileSource("repro", src);
    expect(errors).toEqual([]);

    // Outer-div classes (baseline — these worked pre-fix too)
    expect(css).toMatch(/\.flex\s*\{/);
    expect(css).toMatch(/\.gap-4\s*\{/);
    expect(css).toMatch(/\.p-4\s*\{/);

    // Inner-lift classes — the bug-17 fix. All 11 must appear.
    expect(css).toMatch(/\.flex-1\s*\{/);
    expect(css).toMatch(/\.bg-white\s*\{/);
    expect(css).toMatch(/\.rounded-lg\s*\{/);
    expect(css).toMatch(/\.p-3\s*\{/);
    expect(css).toMatch(/\.shadow-sm\s*\{/);
    expect(css).toMatch(/\.font-semibold\s*\{/);
    expect(css).toMatch(/\.mb-2\s*\{/);
    expect(css).toMatch(/\.text-gray-700\s*\{/);
    expect(css).toMatch(/\.bg-gray-100\s*\{/);
    expect(css).toMatch(/\.rounded\s*\{/);
    expect(css).toMatch(/\.p-2\s*\{/);
  });

  test("nested lift inside lift body — classes at every depth emit CSS", () => {
    const src = `<program title="nested-lift">
    const rows = [{ name: "a", items: [1, 2] }]

    <ul class="space-y-2">
        \${ for (let row of rows) {
            lift <li class="text-blue-500 underline">
                <span class="font-bold">\${row.name}</>
                <ol class="ml-4">
                    \${ for (let it of row.items) {
                        lift <li class="text-green-500">\${it}</>
                    } }
                </>
            </>
        } }
    </>
</program>
`;
    const { errors, css } = compileSource("nested", src);
    expect(errors).toEqual([]);
    // .space-y-2 emits as ".space-y-2 > :not([hidden]) ~ :not([hidden]) { ... }"
    // — match the selector start rather than insisting on the bare form.
    expect(css).toMatch(/\.space-y-2[\s>]/);
    expect(css).toMatch(/\.text-blue-500\s*\{/);
    expect(css).toMatch(/\.underline\s*\{/);
    expect(css).toMatch(/\.font-bold\s*\{/);
    expect(css).toMatch(/\.ml-4\s*\{/);
    expect(css).toMatch(/\.text-green-500\s*\{/);
  });

  test("conditional lift inside ${ if (...) { lift ... } } — classes scanned", () => {
    const src = `<program title="cond-lift">
    const showBadge = true

    <div class="p-4">
        \${ if (showBadge) {
            lift <span class="bg-yellow-500 text-black px-2">badge</>
        } }
    </>
</program>
`;
    const { errors, css } = compileSource("cond", src);
    expect(errors).toEqual([]);
    // Outer (static) — baseline regression guard
    expect(css).toMatch(/\.p-4\s*\{/);
    // Inner (lift body inside if-stmt) — bug-17 fix path
    expect(css).toMatch(/\.bg-yellow-500\s*\{/);
    expect(css).toMatch(/\.text-black\s*\{/);
    expect(css).toMatch(/\.px-2\s*\{/);
  });

  test("class:NAME=cond inside lift template — NAME emits CSS too", () => {
    // Note: class:NAME inside lift currently has a pre-existing tokenizer
    // boundary issue with hyphenated/numeric NAMEs (`class:bg-blue-500=...`
    // tokenizes as separate attrs). Using single-token Tailwind utility
    // names (no hyphens / no numerics) for now — those exercise the Bug 17
    // fix path correctly. The hyphenated-name tokenizer issue is a separate
    // bug (out of Bug 17 scope; surfaced as a deferred follow-up).
    const src = `<program title="class-directive-in-lift">
    <items>: number[] = [1, 2, 3]
    <active>: boolean = false

    <ul>\${
        for (let item of @items) {
            lift <li class="px-3 py-2" class:underline=@active>Item \${item}</>
        }
    }</>
</program>
`;
    const { errors, css } = compileSource("class-directive", src);
    expect(errors).toEqual([]);
    expect(css).toMatch(/\.px-3\s*\{/);
    expect(css).toMatch(/\.py-2\s*\{/);
    // The NAME portion of class:NAME — at runtime this class is added via
    // classList.toggle when the predicate is truthy. SPEC §26.1 says
    // emit CSS for every class name "found in source" — the source
    // explicitly mentions `underline` so we MUST emit its CSS rule.
    expect(css).toMatch(/\.underline\s*\{/);
  });
});

describe("Bug 17: regression guards — pre-fix working paths still work", () => {
  test("top-level static markup with Tailwind classes (Mario-shape) still works", () => {
    // Verifies the HTML-scan path is unchanged. Pre-fix worked; must keep working.
    const src = `<program title="top-level-static">
    <div class="flex items-center gap-2 p-4 bg-white rounded shadow">
        <span class="font-bold text-lg">Hello</>
        <span class="text-gray-500">World</>
    </>
</program>
`;
    const { errors, css } = compileSource("toplevel", src);
    expect(errors).toEqual([]);
    expect(css).toMatch(/\.flex\s*\{/);
    expect(css).toMatch(/\.items-center\s*\{/);
    expect(css).toMatch(/\.gap-2\s*\{/);
    expect(css).toMatch(/\.p-4\s*\{/);
    expect(css).toMatch(/\.bg-white\s*\{/);
    expect(css).toMatch(/\.rounded\s*\{/);
    expect(css).toMatch(/\.shadow\s*\{/);
    expect(css).toMatch(/\.font-bold\s*\{/);
    expect(css).toMatch(/\.text-lg\s*\{/);
    expect(css).toMatch(/\.text-gray-500\s*\{/);
  });

  test("mixed static + lift-internal — both paths emit CSS in the same file", () => {
    const src = `<program title="mixed">
    const items = ["a", "b"]

    <header class="bg-slate-900 text-white p-4">
        <h1 class="text-2xl">Mixed</>
    </>

    <main class="p-6">
        \${ for (let it of items) {
            lift <article class="bg-gray-50 rounded-md p-3 mb-2">
                <p class="text-sm text-gray-600">\${it}</>
            </>
        } }
    </>
</program>
`;
    const { errors, css } = compileSource("mixed", src);
    expect(errors).toEqual([]);

    // Static-path classes
    expect(css).toMatch(/\.bg-slate-900\s*\{/);
    expect(css).toMatch(/\.text-white\s*\{/);
    expect(css).toMatch(/\.p-4\s*\{/);
    expect(css).toMatch(/\.text-2xl\s*\{/);
    expect(css).toMatch(/\.p-6\s*\{/);

    // Lift-path classes — newly correct under Bug 17 fix
    expect(css).toMatch(/\.bg-gray-50\s*\{/);
    expect(css).toMatch(/\.rounded-md\s*\{/);
    expect(css).toMatch(/\.p-3\s*\{/);
    expect(css).toMatch(/\.mb-2\s*\{/);
    expect(css).toMatch(/\.text-sm\s*\{/);
    expect(css).toMatch(/\.text-gray-600\s*\{/);
  });

  test("file with no markup emits no Tailwind CSS (no false-positive collection)", () => {
    const src = `<program title="logic-only">
    const x = 1
    const y = 2
</program>
`;
    const { errors, css } = compileSource("logic-only", src);
    expect(errors).toEqual([]);
    // No markup → no class names anywhere. CSS file may not even exist or
    // be empty — the contract is "no spurious Tailwind rules".
    expect(css).not.toMatch(/\.flex\s*\{/);
    expect(css).not.toMatch(/\.p-4\s*\{/);
  });
});
