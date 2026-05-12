/**
 * db-fixture.ts — DB-isolation fixture for tests that hit examples/contacts.db.
 *
 * Wave 3 Dispatch 2 (S86, 2026-05-12). Per Wave 3 scoping §A2 recommended
 * approach: truncate tables before each test.
 *
 * Implementation note — Playwright runs under Node, not Bun, so we can't
 * import `bun:sqlite` directly inside this fixture. Instead we shell out to
 * `bun -e '...'` via `child_process.spawnSync` to run a small SQLite delete
 * against the on-disk file. Bun is already on PATH (the webServer config in
 * `playwright.config.ts` invokes `bun run ...` to boot the dev server), so
 * this call adds no new dependency.
 *
 * SQLite handles the concurrent file handle fine: the dev server has its own
 * connection open for reads/writes; the fixture's spawned bun process opens
 * a fresh connection, runs DELETE, and exits.
 *
 * The fixture exposes `cleanContactsDb` as an auto-applied fixture: every test
 * that uses `test` from this module gets a freshly truncated `contacts` table
 * before the test body runs.
 */

import { test as base, expect } from "./dev-server-fixture";
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// __dirname here is `<repo-root>/e2e/fixtures` — climb two levels.
const CONTACTS_DB_PATH = resolve(__dirname, "..", "..", "examples", "contacts.db");

interface DbFixtures {
  cleanContactsDb: void;
}

function truncateContacts(): void {
  // Bun is on PATH because the Playwright webServer already invokes `bun run`.
  // Use `bun -e` to run a tiny in-process truncate without adding a JS file.
  const script = [
    'import { Database } from "bun:sqlite";',
    `const db = new Database(${JSON.stringify(CONTACTS_DB_PATH)});`,
    'try { db.run("DELETE FROM contacts"); } finally { db.close(); }',
  ].join(" ");
  const result = spawnSync("bun", ["-e", script], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `db-fixture: failed to truncate contacts table.\n` +
      `  stdout: ${result.stdout}\n` +
      `  stderr: ${result.stderr}\n` +
      `  status: ${result.status}`,
    );
  }
}

export const test = base.extend<DbFixtures>({
  cleanContactsDb: [
    async ({}, use) => {
      truncateContacts();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
