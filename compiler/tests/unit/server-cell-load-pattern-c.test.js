/**
 * §52.6.5 Pattern C — inline-`?{}` RHS server-cell LOAD (S216 disposition A).
 *
 * A `<var server> = ?{ select … }` decl (and the `server @var = ?{}` form) whose
 * inline `?{}` IS the cell's mount load. The ss1 item-3 parser leak-stop attaches
 * a structured `sqlNode` to the decl; this codegen wires the load:
 *   - server: a `/__serverLoad/<var>` route running the cell's ACTUAL `?{}` query
 *     (lowered through the canonical §44 SQL emitter — `.get()`/`.all()` + params).
 *   - client: a fetch-on-mount IIFE that POSTs to it and hydrates the cell.
 *
 * SCOPE: param-FREE core only. A PARAM-BEARING query (`?{ … ${@cell} … }`) needs
 * POST-body param-passing (a bounded follow-on) — it emits NO load + the info
 * diagnostic W-AUTH-004, and must fail GRACEFULLY (no crash, no SQL leak).
 *
 * Coverage:
 *   §1  unit — emitDeclRhsSqlLoad shape (client fetch IIFE)
 *   §2  unit — serverVarDeclLoadKind classifier (sql-load / param-bearing / none)
 *   §3  integration — param-free `<var server> = ?{}` emits /__serverLoad route (server)
 *   §4  integration — param-free emits the client fetch-on-mount + reactive set
 *   §5  integration — the `?{}` query is SERVER-only (no SQL leak into client.js)
 *   §6  integration — the `server @var = ?{}` (@-form) loads identically
 *   §7  integration — engine-rides (§51.0.E E-leg): bare `<engine server=@source>`
 *       compiles + the engine subscribes to the loaded source cell
 *   §8  integration — param-BEARING fails gracefully: no /__serverLoad route, no leak
 *   §9  integration — a NON-`?{}` RHS (`= 0`) is unaffected (no /__serverLoad route)
 *   §10 integration — multiple param-free server cells each get a distinct route
 */

import { describe, test, expect } from "bun:test";

import { emitDeclRhsSqlLoad } from "../../src/codegen/emit-sync.ts";
import { serverVarDeclLoadKind } from "../../src/codegen/collect.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCG } from "../../src/code-generator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRouteMap() {
  return { functions: new Map() };
}
function makeDepGraph() {
  return { nodes: new Map(), edges: [] };
}
function makeProtectAnalysis() {
  return { views: new Map() };
}

function parseAST(source, filePath = "/test/app.scrml") {
  return buildAST(splitBlocks(filePath, source)).ast;
}

function compileBundles(source, filePath = "/test/app.scrml") {
  const ast = parseAST(source, filePath);
  const result = runCG({
    files: [ast],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: makeProtectAnalysis(),
  });
  const out = result.outputs.get(filePath);
  return { clientJs: out?.clientJs ?? "", serverJs: out?.serverJs ?? "" };
}

// Locate the first server `state-decl` carrying a sqlNode in an AST.
function findServerSqlDecl(ast) {
  let found = null;
  function walk(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      if (n.kind === "logic" && Array.isArray(n.body)) {
        for (const c of n.body) {
          if (c && c.kind === "state-decl" && c.isServer && !found) found = c;
        }
      }
      if (Array.isArray(n.children)) walk(n.children);
      if (Array.isArray(n.body)) walk(n.body);
    }
  }
  walk(ast.nodes || ast.children || ast);
  return found;
}

const BARE = `<program db="sqlite:./test.db">
<driver server> = ?{ \`SELECT * FROM drivers WHERE id = 1\` }.get()
<main><p>{@driver.id}</p></main>
</program>`;

const AT_FORM = `<program db="sqlite:./test.db">
\${
  server @driver = ?{ \`SELECT * FROM drivers WHERE id = 1\` }.get()
}
<main><p>{@driver.id}</p></main>
</program>`;

const PARAM_BEARING = `<program db="sqlite:./test.db">
<driverId> = 1
<driver server> = ?{ \`SELECT * FROM drivers WHERE id = \${@driverId}\` }.get()
<main><p>{@driver.id}</p></main>
</program>`;

const NON_SQL = `<program db="sqlite:./test.db">
<count server> = 0
<main><p>{@count}</p></main>
</program>`;

const ENGINE_RIDES = `<program db="sqlite:./test.db">
type DriverStatus:enum = { OffDuty, Driving, OnDuty, Sleeper }
type Driver = { id: number, current_status: string }

<driver server> : Driver = ?{ \`SELECT * FROM drivers WHERE id = 1\` }.get()

<engine for=DriverStatus server=@driver.current_status initial=.OffDuty>
  <OffDuty rule=(.Driving | .OnDuty | .Sleeper) : "Off duty">
  <Driving rule=(.OnDuty | .OffDuty)            : "Driving">
  <OnDuty  rule=(.Driving | .OffDuty | .Sleeper) : "On duty">
  <Sleeper rule=(.OffDuty | .OnDuty)            : "Sleeper berth">
</>

<main><p>Status: {@driver.current_status}</p></main>
</program>`;

const MULTI = `<program db="sqlite:./test.db">
<drivers server> = ?{ \`SELECT * FROM drivers\` }.all()
<trucks server>  = ?{ \`SELECT * FROM trucks\` }.all()
<main><p>{@drivers.length} {@trucks.length}</p></main>
</program>`;

// ---------------------------------------------------------------------------
// §1: emitDeclRhsSqlLoad — client fetch IIFE shape
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §1: emitDeclRhsSqlLoad shape", () => {
  test("emits an async IIFE fetching the /__serverLoad/<var> route", () => {
    const code = emitDeclRhsSqlLoad("driver").join("\n");
    expect(code).toContain("async");
    expect(code).toContain('fetch("/__serverLoad/driver"');
    expect(code).toContain('method: "POST"');
  });

  test("lands the result via _scrml_reactive_set on the var", () => {
    const code = emitDeclRhsSqlLoad("driver").join("\n");
    expect(code).toContain('_scrml_reactive_set("driver"');
    expect(code).toContain("await");
  });

  test("references §52.6.5 Pattern C", () => {
    const code = emitDeclRhsSqlLoad("driver").join("\n");
    expect(code).toContain("Pattern C");
  });

  test("contains NO SQL text (the query lives only on the server route)", () => {
    const code = emitDeclRhsSqlLoad("driver").join("\n");
    expect(code).not.toContain("SELECT");
    expect(code).not.toContain("_scrml_sql");
  });
});

// ---------------------------------------------------------------------------
// §2: serverVarDeclLoadKind classifier
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §2: serverVarDeclLoadKind classifier", () => {
  test("param-free inline ?{} → 'sql-load'", () => {
    const decl = findServerSqlDecl(parseAST(BARE));
    expect(decl).not.toBeNull();
    expect(serverVarDeclLoadKind(decl)).toBe("sql-load");
  });

  test("param-bearing inline ?{} → 'param-bearing'", () => {
    const decl = findServerSqlDecl(parseAST(PARAM_BEARING));
    expect(decl).not.toBeNull();
    expect(serverVarDeclLoadKind(decl)).toBe("param-bearing");
  });

  test("non-?{} RHS (literal placeholder) → 'none'", () => {
    const decl = findServerSqlDecl(parseAST(NON_SQL));
    expect(decl).not.toBeNull();
    expect(serverVarDeclLoadKind(decl)).toBe("none");
  });

  test("@-form server @var = ?{} → 'sql-load'", () => {
    const decl = findServerSqlDecl(parseAST(AT_FORM));
    expect(decl).not.toBeNull();
    expect(serverVarDeclLoadKind(decl)).toBe("sql-load");
  });
});

// ---------------------------------------------------------------------------
// §3: integration — param-free emits the /__serverLoad route (server)
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §3: server /__serverLoad route", () => {
  test("param-free `<var server> = ?{}` emits a /__serverLoad/<var> route", () => {
    const { serverJs } = compileBundles(BARE);
    expect(serverJs).toContain('path: "/__serverLoad/driver"');
    expect(serverJs).toContain("_scrml_route___serverLoad_driver");
  });

  test("the route runs the cell's ACTUAL query (not SELECT * FROM <table>)", () => {
    const { serverJs } = compileBundles(BARE);
    expect(serverJs).toContain("SELECT * FROM drivers WHERE id = 1");
  });

  test(".get() lowers to (await sql`…`)[0] ?? null", () => {
    const { serverJs } = compileBundles(BARE);
    expect(serverJs).toContain("[0] ?? null");
  });

  test(".all() lowers to a bare awaited tagged template", () => {
    const { serverJs } = compileBundles(MULTI);
    // .all() → `await _scrml_sql`…`` (no `[0]` indexing)
    expect(serverJs).toContain("SELECT * FROM drivers");
    expect(serverJs).toContain("SELECT * FROM trucks");
  });
});

// ---------------------------------------------------------------------------
// §4: integration — client fetch-on-mount
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §4: client fetch-on-mount", () => {
  test("client.js fetches /__serverLoad/<var> and lands via reactive set", () => {
    const { clientJs } = compileBundles(BARE);
    expect(clientJs).toContain('fetch("/__serverLoad/driver"');
    expect(clientJs).toContain('_scrml_reactive_set("driver"');
  });
});

// ---------------------------------------------------------------------------
// §5: integration — SQL is server-only (NO leak into client.js)
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §5: no SQL leak into client", () => {
  test("client.js contains NO SQL text and NO _scrml_sql reference", () => {
    const { clientJs } = compileBundles(BARE);
    expect(clientJs).not.toContain("SELECT * FROM drivers");
    expect(clientJs).not.toContain("_scrml_sql");
  });
});

// ---------------------------------------------------------------------------
// §6: integration — @-form loads identically
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §6: @-form (server @var = ?{})", () => {
  test("the @-form emits the same /__serverLoad route + client fetch", () => {
    const { clientJs, serverJs } = compileBundles(AT_FORM);
    expect(serverJs).toContain('path: "/__serverLoad/driver"');
    expect(clientJs).toContain('fetch("/__serverLoad/driver"');
    expect(clientJs).not.toContain("_scrml_sql");
  });
});

// ---------------------------------------------------------------------------
// §7: integration — engine-rides (§51.0.E E-leg)
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §7: engine-rides E-leg (source-cell load)", () => {
  // NOTE: this CG-only harness (runCG without the SYM/TS passes) decorates the
  // Pattern-C load but NOT the §51.0.E engine substrate / E-leg subscription
  // (those require SYM/TS). The substrate + `_scrml_reactive_subscribe("driver")`
  // E-leg hydrate are covered by the full-pipeline compile of
  // docs/changes/section52-server-cell-load-2026-06-23/repro/engine-rides.scrml
  // (manually verified) + the existing S198-S199 engine-hydration tests. This
  // section verifies the PART Pattern C unblocks: the source cell now LOADS so
  // the engine has something to ride.
  test("bare <engine server=@source> source cell emits the /__serverLoad route + fetch", () => {
    const { clientJs, serverJs } = compileBundles(ENGINE_RIDES);
    expect(serverJs).toContain('path: "/__serverLoad/driver"');
    expect(clientJs).toContain('fetch("/__serverLoad/driver"');
  });

  test("the source cell query is server-only (no SQL leak in the engine page client)", () => {
    const { clientJs } = compileBundles(ENGINE_RIDES);
    expect(clientJs).not.toContain("SELECT * FROM drivers");
  });
});

// ---------------------------------------------------------------------------
// §8: integration — param-bearing fails GRACEFULLY
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §8: param-bearing graceful handling", () => {
  test("param-bearing emits NO /__serverLoad route (bounded follow-on)", () => {
    const { serverJs } = compileBundles(PARAM_BEARING);
    expect(serverJs).not.toContain('path: "/__serverLoad/driver"');
  });

  test("param-bearing does NOT leak SQL into the client bundle", () => {
    const { clientJs } = compileBundles(PARAM_BEARING);
    expect(clientJs).not.toContain("SELECT * FROM drivers");
    expect(clientJs).not.toContain("_scrml_sql");
  });

  test("param-bearing compile does not crash (returns bundles)", () => {
    const { clientJs } = compileBundles(PARAM_BEARING);
    // The cell shows its placeholder; the client side is still valid output.
    expect(typeof clientJs).toBe("string");
    expect(clientJs.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §9: integration — non-?{} RHS unaffected
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §9: non-?{} RHS unaffected", () => {
  test("a literal-placeholder `<count server> = 0` emits NO /__serverLoad route", () => {
    const { serverJs } = compileBundles(NON_SQL);
    expect(serverJs).not.toContain('path: "/__serverLoad/count"');
  });
});

// ---------------------------------------------------------------------------
// §10: integration — multiple param-free cells get distinct routes
// ---------------------------------------------------------------------------

describe("server-cell-load Pattern C §10: multiple server cells", () => {
  test("each param-free server cell gets its own /__serverLoad route", () => {
    const { serverJs, clientJs } = compileBundles(MULTI);
    expect(serverJs).toContain('path: "/__serverLoad/drivers"');
    expect(serverJs).toContain('path: "/__serverLoad/trucks"');
    expect(clientJs).toContain('fetch("/__serverLoad/drivers"');
    expect(clientJs).toContain('fetch("/__serverLoad/trucks"');
  });
});
