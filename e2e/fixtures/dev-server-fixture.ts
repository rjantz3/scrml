/**
 * Dev-server fixture — shared Playwright fixtures for scrml e2e tests.
 *
 * The Playwright config's `webServer` array boots both dev servers
 * (examples/ on :3100, benchmarks/todomvc/ on :3101). This fixture file
 * exposes per-test helpers on top of that.
 *
 * Exports:
 *   - `test` — re-export of the base Playwright test with custom fixtures.
 *   - `expect` — re-export of the base expect.
 *   - URLs:
 *       EXAMPLES_BASE_URL    — http://localhost:3100
 *       TODOMVC_BASE_URL     — http://localhost:3101
 *
 * Custom fixtures:
 *   - `examplesUrl(path)`   — build a URL on the examples server.
 *   - `todomvcUrl(path)`    — build a URL on the TodoMVC server.
 *
 * Future Dispatch 2/3 additions (todo):
 *   - `freshDb`             — drop and recreate sqlite for tests that hit ?{} SQL.
 *   - `seedFixture(name)`   — pre-load DB rows for contact-book / kanban tests.
 *
 * Wave 3 Dispatch 1 — keep small; Dispatch 2 will extend.
 */

import { test as base, expect } from "@playwright/test";

export const EXAMPLES_BASE_URL = "http://localhost:3100";
export const TODOMVC_BASE_URL = "http://localhost:3101";

type UrlBuilder = (path: string) => string;

interface ScrmlFixtures {
  examplesUrl: UrlBuilder;
  todomvcUrl: UrlBuilder;
}

const joinUrl = (base: string, path: string): string => {
  if (!path) return base;
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
};

export const test = base.extend<ScrmlFixtures>({
  examplesUrl: async ({}, use) => {
    await use((path: string) => joinUrl(EXAMPLES_BASE_URL, path));
  },
  todomvcUrl: async ({}, use) => {
    await use((path: string) => joinUrl(TODOMVC_BASE_URL, path));
  },
});

export { expect };
