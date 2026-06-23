/**
 * Issue #1 (parent repo bryanmaclee/scrmlTS) — a server function calling
 * another server function fails at runtime: "<callee> is not defined".
 *
 * REPRO (from the issue):
 *   function nextOrder() {
 *     const row = ?{`SELECT COALESCE(MAX(ord),0)+1 AS n FROM items`}.get()
 *     return row.n
 *   }
 *   function addItem(name) {
 *     const ord = nextOrder()      // <-- "nextOrder is not defined" at runtime
 *     ?{`INSERT INTO items (ord, name) VALUES (${ord}, ${name})`}.run()
 *   }
 *
 * ROOT CAUSE. Each server fn is emitted ONLY as a Request->Response route
 * handler (`_scrml_handler_<name>` + `export const __ri_route_<name>`). The
 * handler is NOT a plain callable, so a sibling fn's body-level `nextOrder()`
 * referenced an undefined symbol.
 *
 * FIX. emit-server.ts now emits a plain in-process peer callable
 * `async function <name>(<params>) { <body> }` for every "simple" server fn
 * that another server fn actually calls, and the call site lowers to
 * `await <name>(...)` (emit-expr.ts serverFnNames path) so the async peer's
 * result is awaited.
 *
 * This file asserts BOTH the emit-shape (always) and the live round-trip
 * (guarded against the happy-dom global pollution that other test dirs install
 * — same rationale as sql-server-fn-runtime.test.js).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { resolve, dirname, join } from "path";
import { writeFileSync, rmSync, existsSync, mkdirSync, readFileSync } from "fs";
import { Database } from "bun:sqlite";
import { compileScrml } from "../../src/api.js";

const testDir = dirname(new URL(import.meta.url).pathname);
const TMP_ROOT = resolve(testDir, "_tmp_server_fn_calls");

let tmpCounter = 0;

beforeAll(() => {
  if (!existsSync(TMP_ROOT)) mkdirSync(TMP_ROOT, { recursive: true });
});

afterAll(() => {
  if (existsSync(TMP_ROOT)) rmSync(TMP_ROOT, { recursive: true, force: true });
});

function compileToFiles(scrmlSource, testName, seedFiles = {}) {
  const tag = `${testName}-${++tmpCounter}`;
  const tmpDir = resolve(TMP_ROOT, tag);
  const tmpInput = resolve(tmpDir, `${tag}.scrml`);
  const outDir = resolve(tmpDir, "dist");
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(tmpInput, scrmlSource);

  for (const [fileName, stmts] of Object.entries(seedFiles)) {
    const dbPath = resolve(tmpDir, fileName);
    const db = new Database(dbPath, { create: true });
    for (const stmt of stmts) db.exec(stmt);
    db.close();
  }

  const result = compileScrml({ inputFiles: [tmpInput], write: true, outputDir: outDir });
  return {
    errors: result.errors ?? [],
    serverJsPath: join(outDir, `${tag}.server.js`),
    tmpDir,
  };
}

const REPRO_SRC = `
<program>

<db src="./items.db" tables="items">

  \${
    server function nextOrder() {
      const row = ?{\`SELECT COALESCE(MAX(ord),0)+1 AS n FROM items\`}.get()
      return row.n
    }

    server function addItem(name) {
      const ord = nextOrder()
      ?{\`INSERT INTO items (ord, name) VALUES (\${ord}, \${name})\`}.run()
      return ord
    }
  }

  <div>Items</div>

</>

</program>
`;

const SEED = {
  "items.db": [
    "CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, ord INTEGER, name TEXT NOT NULL)",
  ],
};

describe("Issue #1 — server fn calling another server fn", () => {
  test("emit-shape: callee resolves to an awaited in-process peer callable", () => {
    const { errors, serverJsPath } = compileToFiles(REPRO_SRC, "shape", SEED);
    expect(errors.filter((e) => !e.code?.startsWith("W-"))).toEqual([]);
    expect(existsSync(serverJsPath)).toBe(true);

    const js = readFileSync(serverJsPath, "utf-8");

    // The call site inside addItem must be awaited (the peer is async), NOT a
    // bare `nextOrder()` (the pre-fix shape that referenced an undefined symbol).
    expect(js).toContain("const ord = await nextOrder();");

    // A plain module-scope peer callable for the callee must be emitted.
    expect(js).toMatch(/async function nextOrder\(\) \{/);

    // The route handler + route export are ADDITIVE — they must still exist.
    expect(js).toContain("async function _scrml_handler_nextOrder_1(");
    expect(js).toContain("async function _scrml_handler_addItem_2(");
    expect(js).toMatch(/export const __ri_route_addItem_2 = \{/);

    // The non-composed fn (addItem — nothing calls it in-process) must NOT get a
    // spurious peer callable; the emission stays surgical.
    expect(js).not.toMatch(/async function addItem\(/);
  });

  test("runtime: addItem invokes nextOrder in-process without ReferenceError", async () => {
    // happy-dom-polluted globals strip the CSRF headers (see
    // sql-server-fn-runtime.test.js for the full rationale). Skip the live
    // round-trip in that case — the emit-shape test above is the guard there.
    if (typeof globalThis.document !== "undefined") return;

    const { errors, serverJsPath, tmpDir } = compileToFiles(REPRO_SRC, "runtime", SEED);
    expect(errors.filter((e) => !e.code?.startsWith("W-"))).toEqual([]);

    // Point the emitted Bun.SQL handle at the absolute seeded DB path.
    const absDbPath = resolve(tmpDir, "items.db");
    const patched = readFileSync(serverJsPath, "utf-8").replace(
      'const _scrml_sql = new SQL("sqlite:./items.db");',
      `const _scrml_sql = new SQL(${JSON.stringify("sqlite:" + absDbPath)});`,
    );
    writeFileSync(serverJsPath, patched);

    const mod = await import(`file://${serverJsPath}?v=${Date.now()}-${Math.random()}`);
    const addRoute = Object.values(mod).find(
      (v) => v && typeof v === "object" && typeof v.path === "string" && v.path.includes("addItem"),
    );
    expect(addRoute).toBeDefined();

    const TOKEN = "issue1-csrf-token";
    const mkReq = (body) =>
      new Request(`http://localhost${addRoute.path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": TOKEN,
          "Cookie": `scrml_csrf=${TOKEN}`,
        },
        body: JSON.stringify(body),
      });

    // Each addItem call internally calls nextOrder(); the returned ord proves
    // the peer executed (1, then 2 as the table fills).
    const r1 = await addRoute.handler(mkReq({ name: "alpha" }));
    expect(r1.status).toBe(200);
    expect(await r1.json()).toBe(1);

    const r2 = await addRoute.handler(mkReq({ name: "beta" }));
    expect(r2.status).toBe(200);
    expect(await r2.json()).toBe(2);

    const verify = new Database(absDbPath);
    const rows = verify.query("SELECT ord, name FROM items ORDER BY id").all();
    verify.close();
    expect(rows).toEqual([
      { ord: 1, name: "alpha" },
      { ord: 2, name: "beta" },
    ]);
  });
});
