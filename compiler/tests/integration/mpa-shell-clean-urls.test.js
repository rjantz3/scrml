/**
 * mpa-shell-clean-urls (2026-05-17): SPEC §40.8.1 multi-page-app shell
 * composition + clean-URL emit shape.
 *
 * Covers three loci of the v0.3.x patch arc:
 *   §1 — Sub 1 emit shape: `pages/` is stripped from dist paths so route
 *        URLs (filesystem-inferred per §47.9.2 — `pages/X.scrml` → `/X`)
 *        align with dist files (`dist/X.html`).
 *   §2 — Sub 2 shell composition: per-page HTMLs inline the entry file's
 *        shell, substituting page content into the FIRST `<main>` slot.
 *        Per-page HTML loads the entry's `app.client.js` + `app.css`
 *        alongside its own client.js + css.
 *   §3 — Sub 3 dev-server resolution: nested per-page HTMLs at
 *        `dist/X/index.html` resolve from URL `/X` via the
 *        directory-index lookup ladder.
 *   §4 — End-to-end: minimal MPA fixture compiles, every route serves
 *        composed shell + content with cross-link integrity.
 *
 * Pre-fix shape (S99 baseline):
 *   - dist preserved `pages/` (e.g. `dist/pages/X/index.html`)
 *   - per-page HTMLs were standalone (no shell chrome, raw `<page>` tag
 *     left in output)
 *   - dev server only handled flat `/foo` → `dist/foo.html`
 *
 * Post-fix shape:
 *   - `pages/X/index.scrml` → `dist/X/index.html`
 *   - `pages/X.scrml` → `dist/X.html`
 *   - each per-page HTML has shell `<header>` + composed `<main>` +
 *     `<footer>` plus per-page CSS and shell CSS (relative paths
 *     correct for nested dist dirs)
 *   - dev server resolves `/X` to `dist/X.html` OR `dist/X/index.html`
 *
 * Scope:
 *   - Behavioral assertions on EMITTED HTML (file contents + paths) —
 *     no dev-server HTTP runtime in these tests.
 *   - Dev-server URL routing covered by the existing dev-server test
 *     suite + adopter smoke (out of scope here).
 *
 * Cross-refs:
 *   - SPEC §40.8 / §40.8.1 — multi-page-app shape + filesystem inference
 *   - SPEC §47.9.2 — output path encoding (route URL inference)
 *   - compile-output-tree.test.js — F-COMPILE-001 paired test (path
 *     preservation + collision); these new tests EXTEND with shell +
 *     `pages/` strip behavior.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdtempSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "mpa-shell-clean-urls-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

/** Write a scrml fixture and return its absolute path. */
function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

/**
 * Minimal MPA fixture builder. Returns absolute paths for every file
 * written and the dist directory. The fixture shape:
 *   <root>/app.scrml            — entry file with `<header>`/`<main>`/`<footer>` shell
 *   <root>/pages/index.scrml     — home page (composed at `/`)
 *   <root>/pages/about.scrml     — flat page (composed at `/about`)
 *   <root>/pages/reference/index.scrml — nested page (composed at `/reference`)
 */
function buildMinimalMpa(caseId) {
  const ROOT = join(TMP, caseId);
  mkdirSync(ROOT, { recursive: true });
  // Tailwind utility classes (`flex`, `text-lg`, etc.) on shell + page
  // elements force CSS emission so the `<link rel="stylesheet">` tags
  // in tests' assertions have something to point at. Bug R-MPA-CSS-01
  // alternative: an empty CSS file is NOT emitted today, so a fixture
  // with no styled elements gets no CSS link — assertions on
  // `href="*.css"` need real classes here.
  const app = fx(
    `${caseId}/app.scrml`,
    `<program>
<header class="site-header flex">
<h1>SHELL_HEADER</h1>
</header>
<main class="content flex-1">
</main>
<footer class="site-footer text-sm">
<p>SHELL_FOOTER</p>
</footer>
</program>
`,
  );
  const home = fx(
    `${caseId}/pages/index.scrml`,
    `<page>
<article class="bg-white">
<p>HOME_CONTENT</p>
</article>
</page>
`,
  );
  const about = fx(
    `${caseId}/pages/about.scrml`,
    `<page>
<article class="bg-white">
<p>ABOUT_CONTENT</p>
</article>
</page>
`,
  );
  const refIdx = fx(
    `${caseId}/pages/reference/index.scrml`,
    `<page>
<article class="bg-white">
<p>REFERENCE_INDEX_CONTENT</p>
</article>
</page>
`,
  );
  return { ROOT, app, home, about, refIdx, outDir: join(ROOT, "dist") };
}

// ---------------------------------------------------------------------------
// §1 — Sub 1: `pages/` stripped from dist paths
// ---------------------------------------------------------------------------

describe("mpa-shell-clean-urls §1: Sub 1 — pages/ stripped from dist paths", () => {
  test("pages/index.scrml → dist/index.html (not dist/pages/index.html)", () => {
    const f = buildMinimalMpa("case-1a");
    const result = compileScrml({
      inputFiles: [f.app, f.home],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    expect(existsSync(join(f.outDir, "index.html"))).toBe(true);
    expect(existsSync(join(f.outDir, "pages/index.html"))).toBe(false);
  });

  test("pages/about.scrml → dist/about.html (flat page, pages/ stripped)", () => {
    const f = buildMinimalMpa("case-1b");
    const result = compileScrml({
      inputFiles: [f.app, f.about],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    expect(existsSync(join(f.outDir, "about.html"))).toBe(true);
    expect(existsSync(join(f.outDir, "pages/about.html"))).toBe(false);
  });

  test("pages/reference/index.scrml → dist/reference/index.html (nested, pages/ stripped)", () => {
    const f = buildMinimalMpa("case-1c");
    const result = compileScrml({
      inputFiles: [f.app, f.refIdx],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    expect(existsSync(join(f.outDir, "reference/index.html"))).toBe(true);
    expect(existsSync(join(f.outDir, "pages/reference/index.html"))).toBe(
      false,
    );
  });

  test("app.scrml entry file still emits dist/app.html (Sub 4 disposition)", () => {
    const f = buildMinimalMpa("case-1d");
    const result = compileScrml({
      inputFiles: [f.app, f.home],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // Entry file's standalone shell HTML — adopter-facing inspection
    // affordance per Sub 4 option (i).
    expect(existsSync(join(f.outDir, "app.html"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2 — Sub 2: per-page shell composition
// ---------------------------------------------------------------------------

describe("mpa-shell-clean-urls §2: Sub 2 — per-page shell composition", () => {
  test("home page HTML wraps shell around HOME_CONTENT", () => {
    const f = buildMinimalMpa("case-2a");
    const result = compileScrml({
      inputFiles: [f.app, f.home],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const homeHtml = readFileSync(join(f.outDir, "index.html"), "utf8");
    // Shell header + footer wrap the page body.
    expect(homeHtml).toContain("SHELL_HEADER");
    expect(homeHtml).toContain("SHELL_FOOTER");
    expect(homeHtml).toContain("HOME_CONTENT");

    // Header MUST appear BEFORE the page's content (sanity).
    const headerIdx = homeHtml.indexOf("SHELL_HEADER");
    const contentIdx = homeHtml.indexOf("HOME_CONTENT");
    const footerIdx = homeHtml.indexOf("SHELL_FOOTER");
    expect(headerIdx).toBeGreaterThan(0);
    expect(contentIdx).toBeGreaterThan(headerIdx);
    expect(footerIdx).toBeGreaterThan(contentIdx);
  });

  test("page body sits inside <main> slot (not outside)", () => {
    const f = buildMinimalMpa("case-2b");
    const result = compileScrml({
      inputFiles: [f.app, f.home],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const homeHtml = readFileSync(join(f.outDir, "index.html"), "utf8");
    // Extract the <main>...</main> block and assert HOME_CONTENT is inside.
    const mainMatch = homeHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    expect(mainMatch).not.toBeNull();
    expect(mainMatch[1]).toContain("HOME_CONTENT");
  });

  test("literal <page> tag does NOT appear in composed HTML", () => {
    const f = buildMinimalMpa("case-2c");
    const result = compileScrml({
      inputFiles: [f.app, f.home],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const homeHtml = readFileSync(join(f.outDir, "index.html"), "utf8");
    // The `<page>` element (§40.8 per-route attribute container) emits
    // its children transparently — no literal `<page>` opener/closer.
    expect(homeHtml).not.toContain("<page>");
    expect(homeHtml).not.toContain("</page>");
  });

  test("nested page loads app.client.js + app.css via ../ relative path", () => {
    const f = buildMinimalMpa("case-2d");
    const result = compileScrml({
      inputFiles: [f.app, f.refIdx],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const nestedHtml = readFileSync(
      join(f.outDir, "reference/index.html"),
      "utf8",
    );
    // nested page is at dist/reference/index.html; app.client.js is at
    // dist/app.client.js. Relative href: ../app.client.js.
    expect(nestedHtml).toContain(`<script src="../app.client.js">`);
    // App-level CSS (Tailwind utilities used by shell chrome) must also
    // load via the relative path.
    expect(nestedHtml).toContain(`href="../app.css"`);
  });

  test("flat page loads app.client.js + app.css via same-dir path", () => {
    const f = buildMinimalMpa("case-2e");
    const result = compileScrml({
      inputFiles: [f.app, f.about],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const flatHtml = readFileSync(join(f.outDir, "about.html"), "utf8");
    // dist/about.html and dist/app.client.js are in the same dir.
    expect(flatHtml).toContain(`<script src="app.client.js">`);
    expect(flatHtml).toContain(`href="app.css"`);
  });

  test("per-page client.js + css still load alongside shell artifacts", () => {
    const f = buildMinimalMpa("case-2f");
    const result = compileScrml({
      inputFiles: [f.app, f.home],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const homeHtml = readFileSync(join(f.outDir, "index.html"), "utf8");
    // Page's own assets — adjacent to the page HTML.
    expect(homeHtml).toContain(`<script src="index.client.js">`);
    expect(homeHtml).toContain(`href="index.css"`);
  });

  test("runtime script appears exactly once per per-page HTML", () => {
    const f = buildMinimalMpa("case-2g");
    const result = compileScrml({
      inputFiles: [f.app, f.home],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const homeHtml = readFileSync(join(f.outDir, "index.html"), "utf8");
    // The shared runtime script is loaded ONCE. Pre-fix the script
    // appeared twice (once from the shell body extraction, once from
    // the per-page re-emit). Regression guard for the script-strip fix.
    const runtimeMatches = homeHtml.match(/scrml-runtime\.[a-z0-9]+\.js/g);
    expect(runtimeMatches).not.toBeNull();
    // De-dupe to be tolerant of single vs multiple distinct hashes
    // (always 1 hash in a single compile; this counts occurrences).
    expect(runtimeMatches.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §3 — Sub 3: dev-server resolution model (file-shape assertions)
// ---------------------------------------------------------------------------

describe("mpa-shell-clean-urls §3: Sub 3 — dist tree matches URL paths", () => {
  test("URL `/about` resolves to dist/about.html (flat page)", () => {
    const f = buildMinimalMpa("case-3a");
    const result = compileScrml({
      inputFiles: [f.app, f.about],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // The dev server's path-strip resolution: /about → dist/about.html.
    // We assert the file exists at the canonical clean-URL path.
    expect(existsSync(join(f.outDir, "about.html"))).toBe(true);
  });

  test("URL `/reference` resolves to dist/reference/index.html (nested)", () => {
    const f = buildMinimalMpa("case-3b");
    const result = compileScrml({
      inputFiles: [f.app, f.refIdx],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // Dev server's directory-index resolution: /reference →
    // dist/reference/index.html.
    expect(existsSync(join(f.outDir, "reference/index.html"))).toBe(true);
  });

  test("URL `/` resolves to dist/index.html (home page)", () => {
    const f = buildMinimalMpa("case-3c");
    const result = compileScrml({
      inputFiles: [f.app, f.home],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // pages/index.scrml takes precedence over the entry's shell-only
    // app.html for the home route per §47.9.2 worked example.
    expect(existsSync(join(f.outDir, "index.html"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §4 — End-to-end: full MPA compose
// ---------------------------------------------------------------------------

describe("mpa-shell-clean-urls §4: end-to-end MPA composition", () => {
  test("home + flat + nested pages all compose with shell, no errors", () => {
    const f = buildMinimalMpa("case-4");
    const result = compileScrml({
      inputFiles: [f.app, f.home, f.about, f.refIdx],
      outputDir: f.outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // Every page composes — assert shell + content for each.
    const homeHtml = readFileSync(join(f.outDir, "index.html"), "utf8");
    expect(homeHtml).toContain("SHELL_HEADER");
    expect(homeHtml).toContain("HOME_CONTENT");
    expect(homeHtml).toContain("SHELL_FOOTER");

    const aboutHtml = readFileSync(join(f.outDir, "about.html"), "utf8");
    expect(aboutHtml).toContain("SHELL_HEADER");
    expect(aboutHtml).toContain("ABOUT_CONTENT");
    expect(aboutHtml).toContain("SHELL_FOOTER");

    const refHtml = readFileSync(
      join(f.outDir, "reference/index.html"),
      "utf8",
    );
    expect(refHtml).toContain("SHELL_HEADER");
    expect(refHtml).toContain("REFERENCE_INDEX_CONTENT");
    expect(refHtml).toContain("SHELL_FOOTER");

    // app.html itself remains the shell-only template (Sub 4 (i)).
    const appHtml = readFileSync(join(f.outDir, "app.html"), "utf8");
    expect(appHtml).toContain("SHELL_HEADER");
    expect(appHtml).toContain("SHELL_FOOTER");
    // app.html's <main> is the empty slot — no page content from any
    // pages/X.scrml composes into it (the entry file emits standalone).
    const appMain = appHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    expect(appMain).not.toBeNull();
    expect(appMain[1]).not.toContain("HOME_CONTENT");
    expect(appMain[1]).not.toContain("ABOUT_CONTENT");
    expect(appMain[1]).not.toContain("REFERENCE_INDEX_CONTENT");
  });

  test("composition is a no-op when entry has no <main> slot", () => {
    // Entry file with no `<main>` — composition is skipped; per-page
    // HTML emits standalone (matching pre-fix behavior). This guards
    // against breaking single-file or chromeless app shapes.
    const ROOT = join(TMP, "case-4-no-main");
    mkdirSync(ROOT, { recursive: true });
    const app = fx(
      "case-4-no-main/app.scrml",
      `<program>
<h1>NO_MAIN_SHELL</h1>
</program>
`,
    );
    const page = fx(
      "case-4-no-main/pages/lonely.scrml",
      `<page>
<p>LONELY_CONTENT</p>
</page>
`,
    );
    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app, page],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const lonelyHtml = readFileSync(join(outDir, "lonely.html"), "utf8");
    // No shell composition — the page stands alone (no header from
    // entry leaks in; no `<main>` was found to substitute).
    expect(lonelyHtml).toContain("LONELY_CONTENT");
    expect(lonelyHtml).not.toContain("NO_MAIN_SHELL");
  });

  test("composition is a no-op when only the page file is compiled (no entry)", () => {
    // Single-file invocation on a page file — no entry available, so
    // composition is skipped. The page emits as a standalone HTML.
    const ROOT = join(TMP, "case-4-solo-page");
    mkdirSync(ROOT, { recursive: true });
    const page = fx(
      "case-4-solo-page/pages/solo.scrml",
      `<page>
<p>SOLO_CONTENT</p>
</page>
`,
    );
    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [page],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // Solo invocation lands flat (single-file rule). The `pages/` strip
    // is irrelevant because pathFor's input has no `pages/` segment in
    // the relative dir computed against a single-file outputBaseDir.
    expect(existsSync(join(outDir, "solo.html"))).toBe(true);
    const soloHtml = readFileSync(join(outDir, "solo.html"), "utf8");
    expect(soloHtml).toContain("SOLO_CONTENT");
    // No shell content because there's no entry to extract from.
    expect(soloHtml).not.toContain("SHELL_HEADER");
  });
});
