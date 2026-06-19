/**
 * g-pure-module-server-emit-missing (HIGH, S207/S208) — server-import tree-shaking.
 *
 * The bug (flogence-reported, independently reproduced):
 *   An SPA imports a PURE-helper module (types + pure fns, NO server content) and
 *   uses its exports CLIENT-side only. Codegen emits the module's `.client.js` but
 *   NOT a `.server.js` (the `.server.js` emission is gated on the module having its
 *   own server content). YET the consumer's `app.server.js` emitted
 *   `import { ... } from "./<mod>.server.js"` UNCONDITIONALLY → a dangling import of
 *   a file that is never emitted → the server bundle throws `Cannot find module` at
 *   RUNTIME. GREEN compile, `node --check` passes (a missing FILE, not a syntax
 *   error) — the "compiled-green ≠ actually works" class.
 *
 * The fix (emit-server.ts, Option 2 — tree-shake):
 *   Defer local-`.scrml` server-import specifiers; after the full server body is
 *   assembled, keep a specifier only if its local name is referenced in the emitted
 *   server body, and drop an import line entirely when every specifier is unused
 *   (the bug case). Soundness over minimality — a standalone occurrence keeps the
 *   import. Option 1 (emit a `.server.js` for the pure module) was rejected: it
 *   still link-errors on erased TYPE imports.
 *
 * Tests:
 *   §1. Client-only-used pure module → the dangling `.server.js` import is PRUNED
 *       from the consumer's server bundle, and no `.server.js` is emitted for it.
 *   §2. No over-pruning — a module that DOES emit a `.server.js` keeps the specifier
 *       used server-side and drops the one used only client-side.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;
beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "g-pure-module-server-emit-"));
});
afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(absPath, source) {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, source);
  return absPath;
}

// A PURE-helper module: a single exported pure function, NO server content
// (no `?{}`, no server fn) → codegen emits NO `.server.js` for it.
const PURE_MODULE = `\${
  export function entryLine(msg) {
    return "[" + msg + "]"
  }
}
`;

// ---------------------------------------------------------------------------
// §1. Client-only-used pure module → dangling .server.js import is pruned
// ---------------------------------------------------------------------------
describe("g-pure-module-server-emit §1: client-only pure import is tree-shaken from the server bundle", () => {
  test("server.js does NOT import the (never-emitted) pure-module .server.js", () => {
    const dir = join(TMP, "s1");
    // The consumer has its OWN server function (forces server.js emission) that
    // does NOT use the pure import; the pure import is used CLIENT-side only.
    const CONSUMER = `<program>
\${
  import { entryLine } from './log.scrml'
  server function loadCount() {
    return 7
  }
}
h1 "g-pure-module regression"
p \${entryLine("client")}

</program>
`;
    const pagePath = fx(join(dir, "src/page.scrml"), CONSUMER);
    fx(join(dir, "src/log.scrml"), PURE_MODULE);

    const outDir = join(dir, "out");
    compileScrml({ inputFiles: [pagePath], outputDir: outDir, write: true, log: () => {} });

    const serverPath = join(outDir, "page.server.js");
    expect(existsSync(serverPath)).toBe(true);

    const server = readFileSync(serverPath, "utf8");
    // THE BUG: pre-fix this matched `from "./log.server.js"`. Post-fix the dead
    // import is pruned (entryLine is unused server-side).
    expect(server).not.toMatch(/from\s+["']\.\/log\.server\.js["']/);
    // And never the raw .scrml extension either.
    expect(server).not.toMatch(/from\s+["']\.\/log\.scrml["']/);

    // The pure module emits a .client.js but NOT a .server.js.
    expect(existsSync(join(outDir, "log.client.js"))).toBe(true);
    expect(existsSync(join(outDir, "log.server.js"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §2. No over-pruning — server-used specifier kept, client-only specifier dropped
// ---------------------------------------------------------------------------
describe("g-pure-module-server-emit §2: a server-content module keeps the used specifier, prunes the unused", () => {
  test("the server-referenced import survives; the client-only one is pruned", () => {
    const dir = join(TMP, "s2");
    // This module has server content (a `?{}` SQL fn) → its .server.js IS emitted.
    const SERVER_MODULE = `\${
  export function serverHelper() {
    return ?{ select 1 as n }
  }
  export function pureHelper(x) {
    return x + 1
  }
}
`;
    const CONSUMER = `<program db="sqlite::memory:">
\${
  import { serverHelper, pureHelper } from './helpers.scrml'
  server function run() {
    return serverHelper()
  }
}
p \${pureHelper(3)}

</program>
`;
    const pagePath = fx(join(dir, "src/page.scrml"), CONSUMER);
    fx(join(dir, "src/helpers.scrml"), SERVER_MODULE);

    const outDir = join(dir, "out");
    compileScrml({ inputFiles: [pagePath], outputDir: outDir, write: true, log: () => {} });

    const serverPath = join(outDir, "page.server.js");
    expect(existsSync(serverPath)).toBe(true);
    const server = readFileSync(serverPath, "utf8");

    // The helpers module emits a .server.js (it has a server fn) AND the consumer
    // uses serverHelper server-side → the import is KEPT (no over-pruning).
    const importLine = server.split("\n").find((l) => /from\s+["']\.\/helpers\.server\.js["']/.test(l));
    expect(importLine).toBeDefined();
    expect(importLine).toMatch(/serverHelper/);
    // pureHelper is used only client-side → pruned from the server import.
    expect(importLine).not.toMatch(/pureHelper/);
  });
});
