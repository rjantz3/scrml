/* SPDX-License-Identifier: MIT
 *
 * Unit — #14 event-payload-transition (Approach E), SYM/TYPER batch (S155).
 *
 * Direct SYM-pass tests for the per-state message-arm validation (PASS 11):
 *   - E-ENGINE-ACCEPTS-NOT-ENUM       (§51.0.S.2.2)
 *   - E-ENGINE-MSG-WITHOUT-ACCEPTS    (§51.0.S.2.3)
 *   - E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE (§51.0.S.2.4 — mirror of E-MATCH-NOT-EXHAUSTIVE)
 *   - W-MATCH-ARROW-LEGACY            (§18.2 / §51.0.S.2.3, info-level)
 *
 * These run `splitBlocks → buildAST → runSYM` directly (the live pipeline path
 * that populates `messageArms` via `parseEngineStateChildren`). At the SYM
 * layer every diagnostic — including the info-level W-MATCH-ARROW-LEGACY —
 * lands in `sym.errors` with its `severity` field set; the result.warnings /
 * result.errors PARTITION happens downstream at the api.js boundary (covered
 * by the conformance test conf-engine-message-dispatch-s155). So here we read
 * `sym.errors` and filter on `code` / `severity`.
 *
 * The `.advance` two-plane resolution (§51.0.G.1, E-ENGINE-MSG-UNKNOWN +
 * E-VARIANT-AMBIGUOUS reuse) is a type-system-pass concern (not SYM) and is
 * covered through the full pipeline in the conformance file.
 */

import { describe, expect, test } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";

function symOf(source, filePath = "msg-dispatch.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  return runSYM({ filePath, ast });
}
function diagsOf(sym, code) {
  return sym.errors.filter((e) => e.code === code);
}
function findEngineMeta(ast) {
  let meta = null;
  (function walk(nodes) {
    if (!nodes) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      if (n.kind === "engine-decl" && n._record && n._record.engineMeta) { meta = n._record.engineMeta; return; }
      if (n.children) walk(n.children);
      if (n.body) walk(n.body);
    }
  })(ast.nodes || []);
  return meta;
}

const WORKED = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
    | .Drop(col) :> .Idle
    | .End       :> .Idle
  </>
  <Dragging(id) rule=.Idle>
    | .Drop(col) :> { @tasks = taskMovedTo(@tasks, id, col); .Idle }
    | .Start(id) :> .Dragging(id)
    | .End       :> .Idle
  </>
</>
`;

// ---------------------------------------------------------------------------
// engineMeta wiring — acceptsType raw capture + messageVariants resolution
// ---------------------------------------------------------------------------

describe("engineMeta: accepts= raw capture + message-variant resolution", () => {
  test("acceptsType captured verbatim; messageVariants resolved from typeDecls", () => {
    const bs = splitBlocks("x.scrml", WORKED);
    const { ast } = buildAST(bs);
    runSYM({ filePath: "x.scrml", ast });
    const meta = findEngineMeta(ast);
    expect(meta).not.toBeNull();
    expect(meta.acceptsType).toBe("DragMsg");
    expect([...meta.messageVariants].sort()).toEqual(["Drop", "End", "Start"]);
  });

  test("accepts-less engine: acceptsType null, messageVariants empty", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }

<engine for=DragPhase initial=.Idle>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>
`;
    const bs = splitBlocks("y.scrml", src);
    const { ast } = buildAST(bs);
    runSYM({ filePath: "y.scrml", ast });
    const meta = findEngineMeta(ast);
    expect(meta.acceptsType ?? null).toBeNull();
    expect(meta.messageVariants).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// E-ENGINE-ACCEPTS-NOT-ENUM (§51.0.S.2.2)
// ---------------------------------------------------------------------------

describe("E-ENGINE-ACCEPTS-NOT-ENUM (§51.0.S.2.2)", () => {
  test("accepts= naming a struct fires", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type SomeStruct:struct = { x: number }

<engine for=DragPhase initial=.Idle accepts=SomeStruct>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(symOf(src), "E-ENGINE-ACCEPTS-NOT-ENUM").length).toBe(1);
  });

  test("accepts= naming an unknown type fires", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }

<engine for=DragPhase initial=.Idle accepts=NotAnEnum>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(symOf(src), "E-ENGINE-ACCEPTS-NOT-ENUM").length).toBe(1);
  });

  test("accepts= naming a valid :enum does NOT fire", () => {
    expect(diagsOf(symOf(WORKED), "E-ENGINE-ACCEPTS-NOT-ENUM").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// E-ENGINE-MSG-WITHOUT-ACCEPTS (§51.0.S.2.3)
// ---------------------------------------------------------------------------

describe("E-ENGINE-MSG-WITHOUT-ACCEPTS (§51.0.S.2.3)", () => {
  test("message-arms present, no accepts= → fires", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
  </>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(symOf(src), "E-ENGINE-MSG-WITHOUT-ACCEPTS").length).toBeGreaterThanOrEqual(1);
  });

  test("no arms, no accepts= → does NOT fire (ignores messages)", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }

<engine for=DragPhase initial=.Idle>
  <Idle rule=.Dragging></>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(symOf(src), "E-ENGINE-MSG-WITHOUT-ACCEPTS").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE (§51.0.S.2.4)
// ---------------------------------------------------------------------------

describe("E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE (§51.0.S.2.4)", () => {
  test("partial coverage, no wildcard → fires per under-covered state", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
  </>
  <Dragging(id) rule=.Idle>
    | .End :> .Idle
  </>
</>
`;
    expect(diagsOf(symOf(src), "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE").length).toBe(2);
  });

  test("partial coverage WITH `| _ :>` wildcard → does NOT fire", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
    | _          :> @dragPhase
  </>
  <Dragging(id) rule=.Idle>
    | _ :> @dragPhase
  </>
</>
`;
    expect(diagsOf(symOf(src), "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE").length).toBe(0);
  });

  test("full coverage → does NOT fire", () => {
    expect(diagsOf(symOf(WORKED), "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE").length).toBe(0);
  });

  test("a state with ZERO arms → does NOT fire (opts out)", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
    | .Drop(col) :> .Idle
    | .End       :> .Idle
  </>
  <Dragging(id) rule=.Idle></>
</>
`;
    expect(diagsOf(symOf(src), "E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// W-MATCH-ARROW-LEGACY (info)
// ---------------------------------------------------------------------------

describe("W-MATCH-ARROW-LEGACY on message arms (§18.2 / §51.0.S.2.3)", () => {
  test("`| .V => body` arm fires W-MATCH-ARROW-LEGACY at info severity", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) => .Dragging(id)
    | .Drop(col) :> .Idle
    | .End       :> .Idle
  </>
  <Dragging(id) rule=.Idle>
    | _ :> @dragPhase
  </>
</>
`;
    const hits = diagsOf(symOf(src), "W-MATCH-ARROW-LEGACY");
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("info");
  });

  test("`| .V -> body` arm also fires W-MATCH-ARROW-LEGACY", () => {
    const src = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) -> .Dragging(id)
    | .Drop(col) -> .Idle
    | .End       -> .Idle
  </>
  <Dragging(id) rule=.Idle>
    | _ :> @dragPhase
  </>
</>
`;
    const hits = diagsOf(symOf(src), "W-MATCH-ARROW-LEGACY");
    expect(hits.length).toBe(3);
    for (const h of hits) expect(h.severity).toBe("info");
  });

  test("canonical `:>` arms do NOT fire W-MATCH-ARROW-LEGACY", () => {
    expect(diagsOf(symOf(WORKED), "W-MATCH-ARROW-LEGACY").length).toBe(0);
  });
});
