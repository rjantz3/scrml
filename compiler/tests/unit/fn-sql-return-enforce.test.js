/**
 * E-FN-001 on `?{}` SQL in a `fn` body — return-position enforcement +
 * I-FN-PROMOTABLE inferred-server skip.
 *
 * change-id: e-fn-001-sql-enforce-2026-06-10 (gap g-fn-sql-unenforced, MED)
 *
 * Two coupled regressions for the same keyword-vs-inference blind spot,
 * surfaced by S179 dog-fooding (PA-verified):
 *
 * FIX A (E-FN-001 enforcement). §48.3.1 says `?{}` SQL inside a `fn` body
 * SHALL be a compile error. Pre-fix, `export fn f() -> R[] { return ?{...}.all() }`
 * compiled CLEAN. Mechanism (PINNED, not the brief's RI-escalation hypothesis):
 * `return ?{...}.all()` parses the SQL into a STRUCTURED `return-stmt.sqlNode`
 * with `expr === ""` (raw text stripped). The walker `checkFnBodyProhibitions`
 * (type-system.ts) detected a `sqlNode` ONLY on `let-decl`/`const-decl`, and its
 * `/\?\{/` text-heuristic saw an empty string — so the return-position SQL
 * evaded all three E-FN-001 detectors. (E-FN-003/E-FN-004 fire because their
 * triggers do not produce this stripped-text shape.) Fix: the structured-sqlNode
 * E-FN-001 check is now KIND-AGNOSTIC — it fires on ANY statement carrying a
 * `sqlNode.kind === "sql"`, covering `let`/`const`/`return` (and any future
 * sqlNode-stamping shape). The `fn` keyword is a declaration-site purity
 * contract, so E-FN-001 fires REGARDLESS of route-inference server-escalation
 * (SPEC §48.3.1 + §33.3).
 *
 * FIX B (I-FN-PROMOTABLE skip). `lint-i-fn-promotable.js` skipped a candidate
 * only when `node.isServer` is true — the DEPRECATED `server` KEYWORD flag, NOT
 * route inference's body-content escalation. So a keyword-free `function` with a
 * server trigger (e.g. `?{}` SQL, or a `scrml:fs` import) had `isServer === false`
 * and was wrongly recommended for promotion to `fn` (a promotion that, post-Fix-A,
 * would error E-FN-001). Fix: the lint now also skips any function route inference
 * escalated to the SERVER boundary (consults `riResult.routeMap.functions`,
 * threaded in via api.js Stage 6.4b). This catches the non-SQL inferred-server
 * cases that the E-FN-001 probe alone cannot (a `scrml:fs` import is a server
 * trigger but NOT an `fn`-body prohibition).
 *
 * Tests use the END-TO-END `compileScrml` path (real parser) so the
 * `return-stmt.sqlNode` stamping is exercised, not a synthetic AST (R26 / S137:
 * synthetic-AST tests miss upstream parser-shape bugs — and the bug here IS a
 * parser-shape gap).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { Database } from "bun:sqlite";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;
let DB_PATH;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "fn-sql-return-enforce-"));
  DB_PATH = join(TMP, "real.db");
  // Real sqlite db so the SQL fixtures pass PA (E-PA-002).
  const db = new Database(DB_PATH);
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
  db.close();
});

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

function compile(name, source) {
  const filePath = join(TMP, `${name}.scrml`);
  writeFileSync(filePath, source);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: join(TMP, `${name}.dist`),
    write: false,
    log: () => {},
  });
  return result;
}

// Cross-stream helpers — E-FN-001 is a fatal error (result.errors);
// I-FN-PROMOTABLE is an info-level lint (result.lintDiagnostics).
function errorCodes(result) {
  return (result.errors ?? []).map((e) => e.code);
}
function fnPromotableDiags(result) {
  return (result.lintDiagnostics ?? []).filter((d) => d.code === "I-FN-PROMOTABLE");
}

// A `<program>` + `<schema>` + `<db>` wrapper so a `?{}` SELECT validates.
function sqlProgram(declBlock, dbPath) {
  return `<program db="${dbPath}">
<schema>
  table users {
    id: integer primary key
    name: string
  }
</>
<db src="${dbPath}" tables="users">
\${
${declBlock}
}
</db>
<page>
  <main>
    <button onClick={() => { let u = loadIds() }}>Load</button>
  </main>
</page>
</program>`;
}

// ---------------------------------------------------------------------------
// Fix A — E-FN-001 fires on `?{}` SQL in a `fn` body (return position)
// ---------------------------------------------------------------------------

describe("Fix A — E-FN-001 on `?{}` SQL inside a `fn` body", () => {
  test("`export fn` + `return ?{...}.all()` fires E-FN-001 (the regressed shape)", () => {
    const src = sqlProgram(
      `  export fn loadIds() -> int[] {\n    return ?{\`SELECT id FROM users\`}.all()\n  }`,
      DB_PATH,
    );
    const result = compile("a1_fn_return_sql", src);
    expect(errorCodes(result)).toContain("E-FN-001");
  });

  test("`fn` + `let x = ?{...}.all()` still fires E-FN-001 (no regression on the let/const path)", () => {
    const src = sqlProgram(
      `  export fn loadIds() -> int[] {\n    let rows = ?{\`SELECT id FROM users\`}.all()\n    return rows\n  }`,
      DB_PATH,
    );
    const result = compile("a2_fn_let_sql", src);
    expect(errorCodes(result)).toContain("E-FN-001");
  });

  test("CONTROL: `function` + `return ?{...}.all()` does NOT fire E-FN-001 (correctly escalates server)", () => {
    const src = sqlProgram(
      `  export function loadIds() -> int[] {\n    return ?{\`SELECT id FROM users\`}.all()\n  }`,
      DB_PATH,
    );
    const result = compile("a3_function_return_sql", src);
    expect(errorCodes(result)).not.toContain("E-FN-001");
  });

  test("no-regression: `fn` + reactive-state mutation still fires E-FN-003 (the working path is untouched)", () => {
    const src = `<program>
<page>
\${
  @count = 0
  export fn bump() -> int {
    @count = @count + 1
    return @count
  }
}
  <main>
    <button onClick={() => { let r = bump() }}>Go</button>
  </main>
</page>
</program>`;
    const result = compile("a4_fn_state_mutation", src);
    expect(errorCodes(result)).toContain("E-FN-003");
    expect(errorCodes(result)).not.toContain("E-FN-001");
  });
});

// ---------------------------------------------------------------------------
// Fix B — I-FN-PROMOTABLE skips inferred-server functions
// ---------------------------------------------------------------------------

describe("Fix B — I-FN-PROMOTABLE skips inferred-server (body-content-escalated) functions", () => {
  test("`function` + `return ?{...}.all()` (inferred-server via SQL) does NOT get I-FN-PROMOTABLE", () => {
    const src = sqlProgram(
      `  export function loadIds() -> int[] {\n    return ?{\`SELECT id FROM users\`}.all()\n  }`,
      DB_PATH,
    );
    const result = compile("b1_function_sql_no_promote", src);
    expect(fnPromotableDiags(result).length).toBe(0);
  });

  test("`function` importing `scrml:fs` (inferred-server, NON-SQL trigger) does NOT get I-FN-PROMOTABLE", () => {
    // This is the Fix-B-only case: a `scrml:fs` import is a server trigger
    // (server-only-resource) but NOT an `fn`-body prohibition — the E-FN-001
    // probe (Fix A) cannot catch it; only the routeMap consult (Fix B) does.
    const src = `\${
  import { readFileSync } from "scrml:fs"

  export function readLines(path) -> asIs {
    return readFileSync(path, "utf8")
  }
}`;
    const result = compile("b2_function_fs_no_promote", src);
    expect(fnPromotableDiags(result).length).toBe(0);
  });

  test("no over-suppression: a genuinely-pure `function` STILL gets I-FN-PROMOTABLE", () => {
    const src = `\${
  export function double(n: int) -> int {
    return n * 2
  }
}`;
    const result = compile("b3_function_pure_promote", src);
    const diags = fnPromotableDiags(result);
    expect(diags.length).toBe(1);
    expect(diags[0].message).toContain("double");
  });
});
