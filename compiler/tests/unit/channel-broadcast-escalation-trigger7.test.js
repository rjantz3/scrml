/**
 * §12.2 Trigger 7b (server-keyword-eliminate D2; AMENDED RULING A, S189,
 * change-id `channel-cell-write-client-side-A-2026-06-12`) — broadcast() /
 * disconnect() escalation ONLY.
 *
 * RULING A: channel state is CLIENT-HELD (§38.4 — no server-authoritative cell
 * store). A channel-CELL WRITE is therefore a CLIENT-side sync-emitting
 * operation (the `syncShared` effect distributes it via the `__sync` wire path,
 * §38.7), NOT a server-placement signal. The former Trigger 7a (channel-cell
 * write → server) is DROPPED. Only `broadcast(...)` / `disconnect()` (§38.6
 * server hub ops) remain server-placement signals (Trigger 7b).
 *
 * A standalone `function` DECLARATION lexically inside a `<channel>` body
 * escalates WITHOUT the deprecated `server` keyword ONLY when its body calls
 * `broadcast(...)` / `disconnect()`. A pure channel-cell-write publisher stays
 * CLIENT (it does what an onclient:* cell-write handler already does, §38.10).
 *
 * Test map:
 *   §1  POSITIVE — a pure channel-cell-write publisher STAYS CLIENT (RULING A).
 *   §2  POSITIVE — keyword-less channel publisher calling broadcast() escalates server.
 *   §3  GUARD    — a channel-scope READ-ONLY function does NOT escalate via Trigger 7.
 *   §4  GUARD    — a non-channel function (outside any <channel> scope) is unaffected.
 *   §5  PARITY   — a channel publisher WITH the `server` keyword still escalates (via
 *                  explicit-annotation, NOT channel-broadcast — the cell write no longer
 *                  contributes a channel-broadcast reason).
 *   §6  GUARD    — an onclient: attribute handler is unaffected by Trigger 7.
 */

import { describe, test, expect } from "bun:test";
import { runRI } from "../../src/route-inference.js";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parseFileAST(source, filePath = "/test/chan.scrml") {
  const bs = splitBlocks(filePath, source);
  const tab = buildAST(bs);
  const ast = tab.ast;
  return {
    filePath,
    nodes: ast.nodes ?? [],
    ast,
    imports: ast.imports ?? [],
    exports: ast.exports ?? [],
    components: ast.components ?? [],
    typeDecls: ast.typeDecls ?? [],
    spans: ast.spans ?? new Map(),
  };
}

function runRIClean(fileAST) {
  return runRI({ files: [fileAST], protectAnalysis: { views: new Map() } });
}

/** Find the route-map entry for a function by NAME (matches functionNodeId suffix). */
function routeForFn(routeMap, fnName, fileAST) {
  for (const [, route] of routeMap.functions) {
    // functionNodeId = "{filePath}::{span.start}". Resolve by scanning the AST
    // for the function-decl with this name and matching its span.start.
    let target = null;
    function visit(nodes) {
      for (const n of nodes ?? []) {
        if (!n || typeof n !== "object") continue;
        if (n.kind === "function-decl" && n.name === fnName) { target = n; return; }
        if (Array.isArray(n.children)) visit(n.children);
        if (n.kind === "logic" && Array.isArray(n.body)) visit(n.body);
      }
    }
    visit(fileAST.nodes);
    if (target) {
      const id = `${fileAST.filePath}::${target.span.start}`;
      return routeMap.functions.get(id);
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// §1 — POSITIVE: keyword-less channel publisher writing a channel cell escalates
// ---------------------------------------------------------------------------

describe("Trigger 7 §1 — pure channel-cell write STAYS CLIENT (RULING A)", () => {
  test("function (no `server`) writing a channel cell does NOT escalate", () => {
    const source = `<program>
  <channel name="chat" topic="lobby">
    <count> = 0

    \${ function bump() {
      @count = @count + 1
    } }
  </>
</program>`;
    const fileAST = parseFileAST(source);
    const { routeMap } = runRIClean(fileAST);
    const route = routeForFn(routeMap, "bump", fileAST);
    expect(route).toBeDefined();
    // RULING A: a channel-cell write is a client-side sync-emitting operation
    // (§38.4 client-held + §38.7 syncShared), not a server-placement signal.
    expect(route.escalationReasons.some(r => r.kind === "channel-broadcast")).toBe(false);
    expect(route.boundary).not.toBe("server");
  });
});

// ---------------------------------------------------------------------------
// §2 — POSITIVE: keyword-less channel publisher calling broadcast() escalates
// ---------------------------------------------------------------------------

describe("Trigger 7 §2 — keyword-less broadcast() call escalates server", () => {
  test("function (no `server`) calling broadcast() gets boundary:server", () => {
    const source = `<program>
  <channel name="chat" topic="lobby">
    <count> = 0

    \${ function announce(text) {
      broadcast({ type: "msg", body: text })
    } }
  </>
</program>`;
    const fileAST = parseFileAST(source);
    const { routeMap } = runRIClean(fileAST);
    const route = routeForFn(routeMap, "announce", fileAST);
    expect(route).toBeDefined();
    expect(route.boundary).toBe("server");
    expect(route.escalationReasons.some(r => r.kind === "channel-broadcast")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §3 — GUARD: a channel-scope READ-ONLY function does NOT escalate via Trigger 7
// ---------------------------------------------------------------------------

describe("Trigger 7 §3 — channel-scope read-only function does NOT escalate", () => {
  test("function reading (not writing) a channel cell stays client", () => {
    const source = `<program>
  <channel name="chat" topic="lobby">
    <count> = 0

    \${ function readCount() {
      const c = @count
      return c
    } }
  </>
</program>`;
    const fileAST = parseFileAST(source);
    const { routeMap } = runRIClean(fileAST);
    const route = routeForFn(routeMap, "readCount", fileAST);
    expect(route).toBeDefined();
    // No write, no broadcast/disconnect → Trigger 7 must NOT fire.
    expect(route.escalationReasons.some(r => r.kind === "channel-broadcast")).toBe(false);
    // With no other trigger, the read-only fn stays client (a bare @-read is
    // not itself a server trigger).
    expect(route.boundary).not.toBe("server");
  });
});

// ---------------------------------------------------------------------------
// §4 — GUARD: a non-channel function is unaffected by Trigger 7
// ---------------------------------------------------------------------------

describe("Trigger 7 §4 — non-channel function unaffected", () => {
  test("function outside any <channel> scope writing a plain cell does not escalate via Trigger 7", () => {
    const source = `<program>
  <count> = 0

  \${ function bumpOutside() {
    @count = @count + 1
  } }
</program>`;
    const fileAST = parseFileAST(source);
    const { routeMap } = runRIClean(fileAST);
    const route = routeForFn(routeMap, "bumpOutside", fileAST);
    expect(route).toBeDefined();
    expect(route.escalationReasons.some(r => r.kind === "channel-broadcast")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §5 — PARITY: a channel publisher WITH the `server` keyword still escalates
// ---------------------------------------------------------------------------

describe("Trigger 7 §5 — keyword-bearing channel publisher still escalates (via annotation)", () => {
  test("server function writing a channel cell still gets boundary:server", () => {
    const source = `<program>
  <channel name="chat" topic="lobby">
    <count> = 0

    \${ server function bumpServer() {
      @count = @count + 1
    } }
  </>
</program>`;
    const fileAST = parseFileAST(source);
    const { routeMap } = runRIClean(fileAST);
    const route = routeForFn(routeMap, "bumpServer", fileAST);
    expect(route).toBeDefined();
    expect(route.boundary).toBe("server");
    // RULING A: the cell write no longer contributes a channel-broadcast reason.
    // The keyword (explicit-annotation, §12.2 Trigger 4) still escalates on its
    // own — a deliberate `server function` is honored even when client-held would
    // otherwise be the default.
    expect(route.escalationReasons.some(r => r.kind === "channel-broadcast")).toBe(false);
    expect(route.escalationReasons.some(r => r.kind === "explicit-annotation")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6 — GUARD: an onclient: attribute handler is unaffected by Trigger 7
// ---------------------------------------------------------------------------

describe("Trigger 7 §6 — onclient: attribute handler unaffected", () => {
  test("an onclient: handler function that only reads a channel cell stays client", () => {
    // The onclient:open attribute references `onOpen`; `onOpen` reads (does not
    // write) the channel cell, so Trigger 7 must NOT escalate it. The attribute
    // itself is a string, not a function-decl — collectChannelFunctionMap only
    // walks function-decl nodes, so the attribute path is never an escalation site.
    const source = `<program>
  <channel name="chat" topic="lobby" onclient:open="onOpen()">
    <count> = 0

    \${ function onOpen() {
      const c = @count
      return c
    } }
  </>
</program>`;
    const fileAST = parseFileAST(source);
    const { routeMap } = runRIClean(fileAST);
    const route = routeForFn(routeMap, "onOpen", fileAST);
    expect(route).toBeDefined();
    expect(route.escalationReasons.some(r => r.kind === "channel-broadcast")).toBe(false);
    expect(route.boundary).not.toBe("server");
  });
});

// ---------------------------------------------------------------------------
// §7 — POSITIVE: a publisher that writes a channel cell AND calls broadcast()
//      still escalates (via broadcast — Trigger 7b), RULING A.
// ---------------------------------------------------------------------------

describe("Trigger 7 §7 — broadcast()-bearing publisher escalates even when it also writes a cell", () => {
  test("function writing a channel cell AND calling broadcast() gets boundary:server", () => {
    const source = `<program>
  <channel name="chat" topic="lobby">
    <count> = 0

    \${ function bumpAndAnnounce(text) {
      @count = @count + 1
      broadcast({ type: "msg", body: text })
    } }
  </>
</program>`;
    const fileAST = parseFileAST(source);
    const { routeMap } = runRIClean(fileAST);
    const route = routeForFn(routeMap, "bumpAndAnnounce", fileAST);
    expect(route).toBeDefined();
    // The cell write alone would NOT escalate (RULING A); broadcast() does.
    expect(route.boundary).toBe("server");
    expect(route.escalationReasons.some(r => r.kind === "channel-broadcast")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §7 — RULING A Part 2: E-CHANNEL-SERVER-CELL-READ — a SERVER-context channel
// function that READS a channel cell is rejected (channel cells are client-held,
// §38.4; the read has no server-side value). change-id
// `channel-cell-write-client-side-A-2026-06-12`.
// ---------------------------------------------------------------------------

function errorsOf(fileAST) {
  return runRIClean(fileAST).errors ?? [];
}
function hasServerCellRead(errs) {
  return errs.some(e => (e.code || "").includes("E-CHANNEL-SERVER-CELL-READ"));
}

describe("Trigger 7 §7 — E-CHANNEL-SERVER-CELL-READ (RULING A Part 2)", () => {
  test("onserver:* handler reading a channel cell FIRES", () => {
    const source = `<program>
  <channel name="board" topic="lobby" onserver:message=handleUpdate(msg)>
    <updates> = []
    \${ function handleUpdate(msg) { @updates = [...@updates, msg] } }
  </>
</program>`;
    expect(hasServerCellRead(errorsOf(parseFileAST(source)))).toBe(true);
  });

  test("broadcast()-escalated publisher reading a channel cell FIRES", () => {
    const source = `<program>
  <channel name="board" topic="lobby">
    <items> = []
    \${ function pub(x) { @items = [...@items, x]
        broadcast({ t: "n" }) } }
  </>
</program>`;
    expect(hasServerCellRead(errorsOf(parseFileAST(source)))).toBe(true);
  });

  test("pure channel-cell-write publisher (client under A) does NOT fire", () => {
    const source = `<program>
  <channel name="chat" topic="lobby">
    <messages> = []
    \${ function postMessage(a, b) { @messages = [...@messages, { a, b }] } }
  </>
</program>`;
    expect(hasServerCellRead(errorsOf(parseFileAST(source)))).toBe(false);
  });

  test("broadcast()-escalated publisher with NO cell read does NOT fire", () => {
    const source = `<program>
  <channel name="board" topic="lobby">
    <items> = []
    \${ function ping(x) { broadcast({ t: "ping", x }) } }
  </>
</program>`;
    expect(hasServerCellRead(errorsOf(parseFileAST(source)))).toBe(false);
  });
});
