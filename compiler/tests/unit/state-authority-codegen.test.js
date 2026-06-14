/**
 * State Authority — Codegen (§52.6)
 *
 * Tests for compiler-generated READ-authority sync infrastructure for
 * server-authoritative reactive variables (`<var server>`).
 *
 * §52 is a READ-authority + reactive-wiring layer (Q1=C / Q2=WF, ratified
 * 2026-06-14). The compiler generates the READ path (initial load + SSR +
 * E-AUTH); the WRITE is the developer's own `?{}` server fn (§52.6.2 / §52.6.6).
 * There is NO `_scrml_server_sync_<var>` stub and NO optimistic subscriber.
 *
 * Coverage:
 *   §1  Tier 2: initial load emitted for `<var server> = loadFn()` (function call init)
 *   §2  Tier 2: no initial load emitted for literal init (W-AUTH-001 case)
 *   §3  Tier 2: NO optimistic subscriber + NO `_scrml_server_sync_` (retracted)
 *   §5  Tier 2: no sync for regular @var (non-server reactive decl)
 *   §6  Integration: full pipeline compiles `server @var` without errors
 *   §7  Integration: client JS contains the READ (load) path, NOT a write stub
 *   §8  Integration: client JS does NOT contain sync infrastructure for plain @var
 *   §9  Tier 1: authority="server" + table= does not crash the compiler (scaffold)
 *
 * Tests §1–§3 test the emit-sync.ts functions directly (unit).
 * Tests §6–§9 test via the full compile pipeline (integration path through runCG).
 *
 * NOTE on CG output shape: runCG returns { outputs: Map<filePath, { clientJs, serverJs, html, css }> }
 */

import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// Direct imports from emit-sync.ts emitters (unit tests §1–§3)
//
// Q1=C: emitServerSyncStub and emitOptimisticUpdate are DELETED. The module
// exports only the READ-path emitters.
// ---------------------------------------------------------------------------

import * as emitSync from "../../src/codegen/emit-sync.ts";
import { emitInitialLoad } from "../../src/codegen/emit-sync.ts";

// ---------------------------------------------------------------------------
// Full-pipeline imports (integration tests §6–§9)
// ---------------------------------------------------------------------------

import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCG } from "../../src/code-generator.js";

// ---------------------------------------------------------------------------
// Helpers (full pipeline)
// ---------------------------------------------------------------------------

function makeRouteMap(entries = []) {
  const functions = new Map();
  for (const e of entries) {
    functions.set(e.functionNodeId, e);
  }
  return { functions };
}

function makeDepGraph(nodes = [], edges = []) {
  const nodeMap = new Map();
  for (const n of nodes) {
    nodeMap.set(n.nodeId, n);
  }
  return { nodes: nodeMap, edges };
}

function makeProtectAnalysis(views = new Map()) {
  return { views };
}

/**
 * Parse + build AST from scrml source string.
 */
function parseAST(source, filePath = "/test/app.scrml") {
  const bsResult = splitBlocks(filePath, source);
  const tabResult = buildAST(bsResult);
  return tabResult.ast;
}

/**
 * Compile a scrml source string through the full CG pipeline and return the
 * client JS output string.
 *
 * CG output shape: { outputs: Map<filePath, { clientJs, serverJs, html, css }> }
 */
function compileClientJs(source, filePath = "/test/app.scrml") {
  const ast = parseAST(source, filePath);
  const result = runCG({
    files: [ast],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: makeProtectAnalysis(),
  });
  const out = result.outputs.get(filePath);
  return out?.clientJs ?? "";
}

/**
 * Compile a scrml source string and return the server JS output string.
 */
function compileServerJs(source, filePath = "/test/app.scrml") {
  const ast = parseAST(source, filePath);
  const result = runCG({
    files: [ast],
    routeMap: makeRouteMap(),
    depGraph: makeDepGraph(),
    protectAnalysis: makeProtectAnalysis(),
  });
  const out = result.outputs.get(filePath);
  return out?.serverJs ?? "";
}

// ---------------------------------------------------------------------------
// §1: Tier 2 — initial load emitted for function-call init
// ---------------------------------------------------------------------------

describe("state-authority-codegen §1: emitInitialLoad — function-call init emits async IIFE", () => {
  test("returns non-empty lines when initExpr contains a function call", () => {
    const lines = emitInitialLoad("cards", "loadCards()");
    expect(lines.length).toBeGreaterThan(0);
  });

  test("output contains async IIFE pattern", () => {
    const lines = emitInitialLoad("cards", "loadCards()");
    const code = lines.join("\n");
    expect(code).toContain("async");
    expect(code).toContain("()");
    expect(code).toContain("await");
    expect(code).toContain("loadCards()");
  });

  test("output contains _scrml_reactive_set call with varName", () => {
    const lines = emitInitialLoad("cards", "loadCards()");
    const code = lines.join("\n");
    expect(code).toContain('_scrml_reactive_set("cards"');
  });

  test("output references the §52.6.1 spec annotation", () => {
    const lines = emitInitialLoad("cards", "loadCards()");
    const code = lines.join("\n");
    expect(code).toContain("§52.6.1");
  });

  test("varName is interpolated correctly — count", () => {
    const lines = emitInitialLoad("count", "fetchCount()");
    const code = lines.join("\n");
    expect(code).toContain("count");
    expect(code).toContain("fetchCount()");
    expect(code).toContain('_scrml_reactive_set("count"');
  });
});

// ---------------------------------------------------------------------------
// §2: Tier 2 — no initial load for literal init (W-AUTH-001 case)
// ---------------------------------------------------------------------------

describe("state-authority-codegen §2: emitInitialLoad — literal init returns empty lines", () => {
  test("returns empty array when initExpr has no function call (literal '0')", () => {
    const lines = emitInitialLoad("count", "0");
    expect(lines).toHaveLength(0);
  });

  test("returns empty array when initExpr is '[]' (no function call)", () => {
    const lines = emitInitialLoad("cards", "[ ]");
    expect(lines).toHaveLength(0);
  });

  test("returns empty array when initExpr is empty string", () => {
    const lines = emitInitialLoad("x", "");
    expect(lines).toHaveLength(0);
  });

  test("returns empty array when initExpr is 'not' (§52.4.3 placeholder)", () => {
    const lines = emitInitialLoad("userProfile", "not");
    expect(lines).toHaveLength(0);
  });

  test("returns non-empty when initExpr has parentheses (function call detection)", () => {
    const lines = emitInitialLoad("data", "getData()");
    expect(lines.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §3: Tier 2 — auto-persist RETRACTED (Q1=C). No optimistic subscriber,
//     no server-sync stub. The emit-sync module must NOT export the deleted
//     emitters, and the emitted client JS must carry no `_scrml_server_sync_`.
// ---------------------------------------------------------------------------

describe("state-authority-codegen §3: auto-persist retracted (Q1=C) — no stub, no subscriber", () => {
  test("emit-sync.ts does NOT export emitOptimisticUpdate", () => {
    expect(emitSync.emitOptimisticUpdate).toBeUndefined();
  });

  test("emit-sync.ts does NOT export emitServerSyncStub", () => {
    expect(emitSync.emitServerSyncStub).toBeUndefined();
  });

  test("emit-sync.ts still exports the READ-path emitters", () => {
    expect(typeof emitSync.emitInitialLoad).toBe("function");
    expect(typeof emitSync.emitUnifiedMountHydrate).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// §5: No sync for regular @var (non-server reactive decl)
// ---------------------------------------------------------------------------

describe("state-authority-codegen §5: emitInitialLoad — no sync for empty/non-function init", () => {
  test("plain @var produces no initial load (literal init, non-server path)", () => {
    // emitReactiveWiring only calls emit-sync functions for nodes with
    // isServer: true; even then, a literal init yields no load IIFE.
    const lines = emitInitialLoad("editingId", "not");
    expect(lines).toHaveLength(0);
  });

  test("a callable init still produces the load IIFE (the only emitted sync)", () => {
    const lines = emitInitialLoad("editingId", "load()");
    expect(lines.length).toBeGreaterThan(0);
    const code = lines.join("\n");
    // No write-path artefacts ever appear, even from the load emitter.
    expect(code).not.toContain("_scrml_server_sync_");
    expect(code).not.toContain("_scrml_prev_");
    expect(code).not.toContain("_scrml_reactive_subscribe");
  });
});

// ---------------------------------------------------------------------------
// §6: Integration — full pipeline compiles `server @var` without errors
// ---------------------------------------------------------------------------

describe("state-authority-codegen §6: full pipeline — server @var compiles without CG errors", () => {
  test("server @cards = loadCards() compiles without errors", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const ast = parseAST(source);
    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
    });
    const cgErrors = result.errors.filter(e => e.severity !== "warning");
    expect(cgErrors).toHaveLength(0);
  });

  test("server @count = 0 compiles without CG errors (W-AUTH-001 emitted by TS, not CG)", () => {
    const source = `<program>
\${ server @count = 0 }
</>`;
    const ast = parseAST(source);
    const result = runCG({
      files: [ast],
      routeMap: makeRouteMap(),
      depGraph: makeDepGraph(),
      protectAnalysis: makeProtectAnalysis(),
    });
    // CG-level errors should be empty (W-AUTH-001 is a TS-stage warning)
    const cgErrors = result.errors.filter(e => e.severity !== "warning");
    expect(cgErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §7: Integration — client JS contains the READ (load) path only.
//
// Under Q1=C the client JS carries the initial-load IIFE (the READ path) but
// NEVER a `_scrml_server_sync_` stub or an optimistic subscriber (the WRITE is
// the dev's `?{}` server fn).
//
// NOTE: The scrml tokenizer spaces the interior of function calls:
//   `loadCards()` in source → `loadCards ( )` in the emitted AST init string.
// clientJs assertions for function names use toContain("loadCards") not
// toContain("loadCards()") to avoid the spacing issue.
// ---------------------------------------------------------------------------

describe("state-authority-codegen §7: client JS contains the READ path, no write stub", () => {
  test("server @cards = loadCards() → client JS does NOT contain a server-sync stub", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_server_sync_cards");
    expect(clientJs).not.toContain("server sync stub");
  });

  test("server @cards = loadCards() → client JS does NOT contain an optimistic subscriber", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_prev_cards");
    expect(clientJs).not.toContain("_scrml_rollback_cards");
  });

  test("server @cards = loadCards() → client JS contains async initial load IIFE", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const clientJs = compileClientJs(source);
    // The IIFE sets cards from loadCards() on mount
    expect(clientJs).toContain("async");
    expect(clientJs).toContain("loadCards");
    expect(clientJs).toContain('_scrml_reactive_set("cards"');
  });

  test("server @cards = loadCards() → client JS contains §52.6 section annotation", () => {
    const source = `<program>
\${ server @cards = loadCards() }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).toContain("§52.6");
  });

  test("server @count = 0 (literal init) → client JS contains NO sync artefacts at all", () => {
    // Literal init: no initial load IIFE; and no stub/subscriber under Q1=C.
    const source = `<program>
\${ server @count = 0 }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_server_sync_count");
    expect(clientJs).not.toContain("_scrml_prev_count");
  });

  test("server @count = 0 (literal init) → client JS does NOT contain async initial load for count", () => {
    // No function call in init → emitInitialLoad returns [] → no IIFE
    const source = `<program>
\${ server @count = 0 }
</>`;
    const clientJs = compileClientJs(source);
    // The IIFE pattern sets the reactive var via await; with no function call, no IIFE is emitted
    const hasCountIife = clientJs.includes('_scrml_reactive_set("count", await');
    expect(hasCountIife).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §8: Integration — client JS does NOT contain sync infrastructure for plain @var
// ---------------------------------------------------------------------------

describe("state-authority-codegen §8: client JS does NOT contain sync for plain @var", () => {
  test("plain @editingId = null → no _scrml_server_sync_ in client JS", () => {
    const source = `<program>
\${ @editingId = null }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_server_sync_editingId");
  });

  test("plain @editingId = null → no _scrml_prev_ tracking var in client JS", () => {
    const source = `<program>
\${ @editingId = null }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_prev_editingId");
  });

  test("plain @cards = [] → no write-path artefacts for cards", () => {
    const source = `<program>
\${ @cards = [] }
</>`;
    const clientJs = compileClientJs(source);
    expect(clientJs).not.toContain("_scrml_server_sync_cards");
    expect(clientJs).not.toContain("_scrml_prev_cards");
  });

  test("mixed: server @cards and plain @editingId → cards gets the load path; neither gets a write stub", () => {
    const source = `<program>
\${ server @cards = loadCards() }
\${ @editingId = null }
</>`;
    const clientJs = compileClientJs(source);
    // cards gets the READ (load) path
    expect(clientJs).toContain('_scrml_reactive_set("cards"');
    // no write-path artefacts for either var
    expect(clientJs).not.toContain("_scrml_server_sync_cards");
    expect(clientJs).not.toContain("_scrml_prev_cards");
    expect(clientJs).not.toContain("_scrml_server_sync_editingId");
    expect(clientJs).not.toContain("_scrml_prev_editingId");
  });
});

// ---------------------------------------------------------------------------
// §9: Tier 1 — authority="server" + table= (scaffold: no crash, no SELECT yet)
//
// Tier 1 auto-SELECT (read-authority) is a committed follow-on. These tests
// verify:
//   a) The compiler does not crash on Tier 1 declarations
//   b) No erroneous output is produced
//   c) This test file defines the contract for when Tier 1 lands
//
// When Tier 1 SELECT generation lands, the "does NOT contain" assertion below
// should be flipped to verify the generated SELECT query.
// ---------------------------------------------------------------------------

describe("state-authority-codegen §9: Tier 1 authority='server' — no crash (scaffold)", () => {
  test("state type with authority='server' + table= compiles without crashing", () => {
    // The type system accepts the declaration. CG should not crash.
    // Tier 1 SELECT is a follow-on; this just verifies no fatal errors.
    const source = `<program db="sqlite:./test.db">
\${
  < Card authority="server" table="cards">
    id: number
    title: string
  </>
}
</>`;
    let didThrow = false;
    try {
      const ast = parseAST(source);
      runCG({
        files: [ast],
        routeMap: makeRouteMap(),
        depGraph: makeDepGraph(),
        protectAnalysis: makeProtectAnalysis(),
      });
    } catch (_e) {
      didThrow = true;
    }
    expect(didThrow).toBe(false);
  });

  test("Tier 1 scaffold: server JS does not yet contain auto-SELECT for state type (pre-implementation contract)", () => {
    // This test documents the current state: Tier 1 SELECT is NOT yet generated.
    // When Tier 1 read-authority lands, update this assertion to
    // expect(serverJs).toContain("SELECT * FROM cards").
    const source = `<program db="sqlite:./test.db">
\${
  < Card authority="server" table="cards">
    id: number
    title: string
  </>
}
</>`;
    const serverJs = compileServerJs(source);
    // Tier 1 SELECT not yet implemented — confirm no phantom SELECT is emitted
    expect(serverJs).not.toContain("SELECT * FROM cards WHERE");
  });
});
