/**
 * A9 Ext 5 — Codegen emission integration tests (D4 territory).
 *
 * Verifies that when a CPS-eligible function is classified non-monotone:
 *   - Client wrapper emits `Idempotency-Key` header on the fetch call
 *   - Server stub emits dedup middleware (`_scrml_idempotency_lookup` /
 *     `_scrml_idempotency_store` calls)
 *   - Server module's prelude includes the inlined runtime helpers
 *
 * And when classified monotone or machine-intrinsic:
 *   - Client wrapper does NOT emit Idempotency-Key header
 *   - Server stub does NOT emit dedup middleware
 *   - Server module's prelude does NOT include the runtime helpers
 */

import { describe, test, expect } from "bun:test";
import { runCG } from "../../src/code-generator.js";

function span(start, file = "/test/app.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeFileAST(filePath, nodes, opts = {}) {
  return {
    filePath,
    nodes,
    imports: opts.imports ?? [],
    exports: opts.exports ?? [],
    components: opts.components ?? [],
    typeDecls: opts.typeDecls ?? [],
    nodeTypes: opts.nodeTypes ?? new Map(),
    componentShapes: opts.componentShapes ?? new Map(),
    scopeChain: opts.scopeChain ?? null,
  };
}

function makeRouteMap(entries = []) {
  const functions = new Map();
  for (const e of entries) {
    functions.set(e.functionNodeId, e);
  }
  return { functions };
}

function makeDepGraph() { return { nodes: new Map(), edges: [] }; }
function makeProtectAnalysis() { return { views: new Map() }; }

function runCGForFile(nodes, routeMap = makeRouteMap()) {
  const ast = makeFileAST("/test/app.scrml", nodes);
  return runCG({
    files: [ast],
    routeMap,
    depGraph: makeDepGraph(),
    protectAnalysis: makeProtectAnalysis(),
    embedRuntime: true,
  });
}

/** Build a server CPS-split function with classifier verdict. */
function makeCpsHandlerWithVerdict(fnName, monotonicity, returnVarName = "rows") {
  const fnSpan = span(100);
  const stateDecl = {
    kind: "state-decl",
    name: returnVarName,
    init: "?{`SELECT * FROM users`}.get()",
    sqlNode: { kind: "sql", query: "SELECT * FROM users", chainedCalls: [], span: span(110) },
    span: span(110),
  };
  const fnNode = {
    kind: "function-decl",
    name: fnName,
    params: [],
    body: [stateDecl],
    fnKind: "function",
    isServer: true,
    span: fnSpan,
  };
  const cpsSplit = {
    serverStmtIndices: [0],
    clientStmtIndices: [],
    returnVarName,
  };
  if (monotonicity) cpsSplit.monotonicity = monotonicity;
  const routeMap = makeRouteMap([{
    functionNodeId: "/test/app.scrml::100",
    boundary: "server",
    escalationReasons: [],
    generatedRouteName: `__ri_route_${fnName}_1`,
    serverEntrySpan: fnSpan,
    cpsSplit,
  }]);
  const result = runCGForFile([{ kind: "logic", body: [fnNode], span: span(90) }], routeMap);
  const out = result.outputs.get("/test/app.scrml") ?? {};
  return { result, serverJs: out.serverJs ?? "", clientJs: out.clientJs ?? "" };
}

// ---------------------------------------------------------------------------
// Non-monotone: emission active
// ---------------------------------------------------------------------------

describe("Non-monotone CPS — emission active", () => {
  test("client wrapper emits Idempotency-Key header", () => {
    const { clientJs } = makeCpsHandlerWithVerdict("loadUsers", "non-monotone");
    expect(clientJs).toContain("Idempotency-Key");
    expect(clientJs).toContain("crypto.randomUUID");
  });

  test("server stub emits dedup lookup", () => {
    const { serverJs } = makeCpsHandlerWithVerdict("loadUsers", "non-monotone");
    expect(serverJs).toContain("_scrml_idempotency_lookup");
    expect(serverJs).toContain("Idempotency-Key");
  });

  test("server stub emits dedup store on success", () => {
    const { serverJs } = makeCpsHandlerWithVerdict("loadUsers", "non-monotone");
    expect(serverJs).toContain("_scrml_idempotency_store");
  });

  test("server module includes inlined runtime helpers", () => {
    const { serverJs } = makeCpsHandlerWithVerdict("loadUsers", "non-monotone");
    expect(serverJs).toContain("_scrml_idempotency_ensure_table");
    expect(serverJs).toContain("CREATE TABLE IF NOT EXISTS _scrml_idempotency_keys");
    expect(serverJs).toContain("_SCRML_IDEMPOTENCY_TTL_MS");
  });
});

// ---------------------------------------------------------------------------
// Monotone: emission elided
// ---------------------------------------------------------------------------

describe("Monotone CPS — emission elided", () => {
  test("client wrapper does NOT emit Idempotency-Key header", () => {
    const { clientJs } = makeCpsHandlerWithVerdict("loadUsers", "monotone");
    expect(clientJs).not.toContain("Idempotency-Key");
  });

  test("server stub does NOT emit dedup middleware", () => {
    const { serverJs } = makeCpsHandlerWithVerdict("loadUsers", "monotone");
    expect(serverJs).not.toContain("_scrml_idempotency_lookup");
    expect(serverJs).not.toContain("_scrml_idempotency_store");
  });

  test("server module does NOT include inlined runtime helpers", () => {
    const { serverJs } = makeCpsHandlerWithVerdict("loadUsers", "monotone");
    expect(serverJs).not.toContain("_scrml_idempotency_ensure_table");
    expect(serverJs).not.toContain("CREATE TABLE IF NOT EXISTS _scrml_idempotency_keys");
  });
});

// ---------------------------------------------------------------------------
// Machine-intrinsic: emission elided
// ---------------------------------------------------------------------------

describe("Machine-intrinsic CPS — emission elided", () => {
  test("client wrapper does NOT emit Idempotency-Key header", () => {
    const { clientJs } = makeCpsHandlerWithVerdict("transition", "machine-intrinsic");
    expect(clientJs).not.toContain("Idempotency-Key");
  });

  test("server stub does NOT emit dedup middleware", () => {
    const { serverJs } = makeCpsHandlerWithVerdict("transition", "machine-intrinsic");
    expect(serverJs).not.toContain("_scrml_idempotency_lookup");
  });
});

// ---------------------------------------------------------------------------
// Undefined verdict (Stage 5.5 hasn't run): emission elided (back-compat)
// ---------------------------------------------------------------------------

describe("Undefined verdict — back-compat (treat as elided)", () => {
  test("no monotonicity field on cpsSplit → no Idempotency-Key", () => {
    const { clientJs } = makeCpsHandlerWithVerdict("loadUsers", undefined);
    expect(clientJs).not.toContain("Idempotency-Key");
  });

  test("no monotonicity field on cpsSplit → no dedup middleware", () => {
    const { serverJs } = makeCpsHandlerWithVerdict("loadUsers", undefined);
    expect(serverJs).not.toContain("_scrml_idempotency_lookup");
  });
});
