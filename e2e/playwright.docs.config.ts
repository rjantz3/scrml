/**
 * Playwright docs-website config — isolated from the main examples + TodoMVC harness.
 *
 * S100 (2026-05-17). The main playwright.config.ts boots two webServers
 * (examples/ on 3100 + benchmarks/todomvc/ on 3101) plus a third for
 * docs/website/ on 3102. When ANY webServer fails its URL probe within
 * the configured timeout, the whole harness aborts.
 *
 * The docs-website e2e suite is structurally independent of the others —
 * it tests the static docs site, not running scrml apps. To prevent
 * pre-existing breakage in examples/ (e.g. trucking-dispatch broken
 * imports) from blocking the docs-website regression tests, this config
 * runs ONLY the docs server + ONLY the docs-website spec.
 *
 * Run: `bun run compiler/src/cli.js compile docs/website/` once, then
 * `bun run e2e:docs` (or `bunx playwright test --config=e2e/playwright.docs.config.ts`).
 *
 * Sibling: `e2e/playwright.config.ts` is the main multi-app harness.
 * Keep both in sync if you change shared `use` settings; copy isn't ideal
 * but the alternative is conditional webServer registration which the
 * Playwright config schema doesn't cleanly support.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // Only run the docs spec; the main config covers the rest.
  testMatch: "docs-website.spec.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report-docs", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report-docs", open: "never" }]],
  outputDir: "test-results-docs",

  use: {
    baseURL: "http://localhost:3102",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  // Single web server — docs/website only.
  webServer: {
    command: "bun run compiler/src/cli.js dev docs/website/ --port 3102 -o docs/website/dist",
    url: "http://localhost:3102/",
    cwd: "..",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
