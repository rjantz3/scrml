/**
 * Playwright config — scrml e2e harness.
 *
 * Wave 3 Dispatch 1 (S86, 2026-05-12). Reference:
 *   scrml-support/docs/deep-dives/wave-3-playwright-benchmarks-scoping-2026-05-12.md
 *
 * Two dev servers run in parallel:
 *   - port 3100: `scrml dev` over examples/*.scrml  (critical-path apps 02-05, 14)
 *   - port 3101: `scrml dev` over benchmarks/todomvc/app.scrml  (TodoMVC benchmark)
 *
 * baseURL is 3100 (examples). TodoMVC tests will set their own base via
 * `page.goto('http://localhost:3101/...')` in Dispatch 2/3.
 *
 * Hot-reload SSE: every served HTML gets a `<script>` block opening
 * `EventSource("/_scrml/live-reload")`. Tests should not be affected, but
 * WebKit compatibility with the SSE keep-alive is genuinely untested
 * (Dispatch 1 caveat — see e2e/README.md for fallback plan if WebKit fails).
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // Run files in parallel within each project.
  fullyParallel: true,
  // CI gets two retries to swallow transient flake; local devs see real failures.
  retries: process.env.CI ? 2 : 0,
  // Default to a single worker on CI for deterministic logs; local uses default.
  workers: process.env.CI ? 1 : undefined,
  // Fail the build on test.only left in source.
  forbidOnly: !!process.env.CI,
  // Reporters: list for terminal, HTML for the saved report dir.
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",

  use: {
    baseURL: "http://localhost:3100",
    // Capture a Playwright trace ONLY when a retry kicks in — keeps local
    // runs fast, gives full debug context on flakes.
    trace: "on-first-retry",
    // Screenshot only on failure to keep test-results/ small.
    screenshot: "only-on-failure",
    // Test action timeout (per-action assertion + click + fill timeout).
    actionTimeout: 10_000,
    // Navigation timeout for page.goto / page.reload.
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // ---------------------------------------------------------------------
  // Web servers — two parallel `scrml dev` instances.
  //
  // Both use `cwd: ".."` so the working directory is the repo root,
  // letting `scrml dev` resolve `examples/` and `benchmarks/todomvc/`
  // relative paths without ambiguity.
  //
  // `reuseExistingServer: !CI` lets a developer keep a server running
  // across test invocations; on CI we always boot fresh.
  // ---------------------------------------------------------------------
  webServer: [
    {
      // Wave 3 Dispatch 2: compile the WHOLE `examples/` directory so that
      // 03-contact-book, 05-multi-step-form, and 14-mario-state-machine
      // produce `examples/dist/*.html` files alongside 02-counter. D1 served
      // only 02-counter; D2 needs the rest. Compilation takes ~6-10 s for
      // the full examples set on a cold compiler.
      command: "bun run compiler/src/cli.js dev examples/ --port 3100 -o examples/dist",
      url: "http://localhost:3100/02-counter.html",
      cwd: "..",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "bun run compiler/src/cli.js dev benchmarks/todomvc/app.scrml --port 3101 -o benchmarks/todomvc/dist",
      url: "http://localhost:3101/",
      cwd: "..",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
