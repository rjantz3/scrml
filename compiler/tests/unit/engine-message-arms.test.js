/* SPDX-License-Identifier: MIT
 * §51.0.S (S154 — #14 event-payload-transition, PARSER batch 1 of 3) —
 * parser RECOGNITION coverage for the engine message-dispatch primitive.
 *
 * Companion to:
 *   - SPEC §51.0.S (normative landed S154 at ce78f9d8)
 *   - SPEC §51.0.B (the `accepts=MsgType` opener-attribute row)
 *   - SPEC §51.0.S.6 (the end-to-end worked example — the primary fixture)
 *
 * Scope (batch 1 — RECOGNITION → AST ONLY):
 *   Surface A — `accepts=MsgType` engine-OPENER attribute → engine-decl
 *               AST `acceptsType: string | null`.
 *   Surface B — `(state × message)` arms `| .Variant(binding) :> body` inside
 *               engine state-child bodies → `parseMessageArms` +
 *               `EngineStateChildEntry.messageArms`.
 *
 * Explicitly OUT OF SCOPE here (batch 2/3): the 4 new §34 codes, `.advance`
 * two-plane resolution, exhaustiveness, codegen dispatch. These tests assert
 * ONLY that the parser recognizes the shapes and stamps them on the AST — they
 * do NOT assert any error code fires (the no-`accepts=` arm case must PARSE
 * cleanly here; its error is a batch-2 typer concern).
 */

import { describe, expect, test } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import {
  parseMessageArms,
  parseEngineStateChildren,
} from "../../src/engine-statechild-parser.ts";

function buildEngineDecl(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const tab = buildAST(bs, null);
  const eng = tab.ast.nodes.find((n) => n && n.kind === "engine-decl");
  return { eng, errors: tab.errors };
}

// The SPEC §51.0.S.6 worked example — the canonical fixture for this batch.
const SPEC_S6_ENGINE = `type DragPhase:enum = { Idle, Dragging(id: number) }
type DragMsg:enum   = { Start(id: number), Drop(col: string), End }

<engine for=DragPhase initial=.Idle accepts=DragMsg>
  <Idle rule=.Dragging>
    | .Start(id) :> .Dragging(id)
  </>
  <Dragging(id) rule=.Idle>
    | .Drop(col) :> { @tasks = taskMovedTo(@tasks, id, col); .Idle }
    | .End       :> .Idle
  </>
</>`;

// ---------------------------------------------------------------------------
// Surface A — `accepts=MsgType` engine-opener attribute
// ---------------------------------------------------------------------------

describe("§51.0.S Surface A — accepts=MsgType opener attribute", () => {
  test("captures the bare enum-type identifier onto engine-decl.acceptsType", () => {
    const { eng } = buildEngineDecl(SPEC_S6_ENGINE);
    expect(eng).toBeTruthy();
    expect(eng.acceptsType).toBe("DragMsg");
  });

  test("acceptsType is null when accepts= is absent (existing engines unchanged)", () => {
    const src = `type Size:enum = { Small, Big }
<engine for=Size initial=.Small>
  <Small rule=.Big/>
  <Big rule=.Small/>
</>`;
    const { eng } = buildEngineDecl(src);
    expect(eng).toBeTruthy();
    expect(eng.acceptsType).toBe(null);
  });

  test("accepts= does not disturb for= / initial= / var= capture", () => {
    const src = `type Mode:enum = { Nav, Edit }
type Cmd:enum = { Toggle }
<engine for=Mode initial=.Nav var=mode accepts=Cmd>
  <Nav rule=.Edit/>
  <Edit rule=.Nav/>
</>`;
    const { eng } = buildEngineDecl(src);
    expect(eng.governedType).toBe("Mode");
    expect(eng.initialVariant).toBe("Nav");
    expect(eng.varNameOverride).toBe("mode");
    expect(eng.acceptsType).toBe("Cmd");
  });

  test("the §51.0.S.6 worked example builds with zero TAB errors", () => {
    const { errors } = buildEngineDecl(SPEC_S6_ENGINE);
    expect(errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Surface B — parseMessageArms: the (state × message) arm grammar
// ---------------------------------------------------------------------------

describe("§51.0.S Surface B — parseMessageArms arm grammar", () => {
  test("single bare-target arm with positional payload binding (.Start(id))", () => {
    const { arms } = parseMessageArms("\n    | .Start(id) :> .Dragging(id)\n  ");
    expect(arms).toHaveLength(1);
    expect(arms[0].variantName).toBe("Start");
    expect(arms[0].isWildcard).toBe(false);
    expect(arms[0].payloadBindingsRaw).toBe("id");
    expect(arms[0].payloadBindings).toEqual([{ kind: "positional", name: "id" }]);
    expect(arms[0].armArrow).toBe(":>");
    expect(arms[0].bodyRaw).toBe(".Dragging(id)");
    expect(arms[0].isBlockBody).toBe(false);
  });

  test("block-body arm captures braces verbatim + isBlockBody true (.Drop(col))", () => {
    const { arms } = parseMessageArms(
      "\n    | .Drop(col) :> { @tasks = taskMovedTo(@tasks, id, col); .Idle }\n  ",
    );
    expect(arms).toHaveLength(1);
    expect(arms[0].variantName).toBe("Drop");
    expect(arms[0].payloadBindings).toEqual([{ kind: "positional", name: "col" }]);
    expect(arms[0].isBlockBody).toBe(true);
    expect(arms[0].bodyRaw).toBe("{ @tasks = taskMovedTo(@tasks, id, col); .Idle }");
  });

  test("unit-variant arm has empty bindings (.End)", () => {
    const { arms } = parseMessageArms("| .End :> .Idle");
    expect(arms).toHaveLength(1);
    expect(arms[0].variantName).toBe("End");
    expect(arms[0].payloadBindingsRaw).toBe("");
    expect(arms[0].payloadBindings).toEqual([]);
    expect(arms[0].bodyRaw).toBe(".Idle");
  });

  test("two arms in one body parse in source order", () => {
    const { arms } = parseMessageArms(
      "\n    | .Drop(col) :> { @tasks = taskMovedTo(@tasks, id, col); .Idle }\n    | .End       :> .Idle\n  ",
    );
    expect(arms).toHaveLength(2);
    expect(arms.map((a) => a.variantName)).toEqual(["Drop", "End"]);
    expect(arms[0].isBlockBody).toBe(true);
    expect(arms[1].isBlockBody).toBe(false);
  });

  test("wildcard arm `| _ :> ...` recognized (isWildcard true) — §51.0.S.2.4", () => {
    const { arms } = parseMessageArms("| _ :> @phase");
    expect(arms).toHaveLength(1);
    expect(arms[0].variantName).toBe("_");
    expect(arms[0].isWildcard).toBe(true);
    expect(arms[0].bodyRaw).toBe("@phase");
  });

  test("qualified pattern MsgType.Variant extracts the leaf variant name", () => {
    const { arms } = parseMessageArms("| DragMsg.Drop(col) :> .Idle");
    expect(arms).toHaveLength(1);
    expect(arms[0].variantName).toBe("Drop");
    expect(arms[0].payloadBindings).toEqual([{ kind: "positional", name: "col" }]);
  });

  test("deprecated arm arrows =>/-> are recognized + recorded (S147)", () => {
    expect(parseMessageArms("| .Start(id) => .Dragging(id)").arms[0].armArrow).toBe("=>");
    expect(parseMessageArms("| .Start(id) -> .Dragging(id)").arms[0].armArrow).toBe("->");
  });
});

// ---------------------------------------------------------------------------
// Surface B — render-body coexistence + body-separation rule
// ---------------------------------------------------------------------------

describe("§51.0.S Surface B — arm region / render body separation", () => {
  test("a body with NO leading | is pure render body (zero arms)", () => {
    const r = parseMessageArms("    <p>just render</p>  ");
    expect(r.arms).toHaveLength(0);
    expect(r.renderBodyStart).toBe(0);
  });

  test("empty body → zero arms", () => {
    expect(parseMessageArms("").arms).toHaveLength(0);
  });

  test("leading arms + trailing render body coexist; renderBodyStart points at render", () => {
    // §51.0.S.3 implied shape: a state reacts to .Tick AND renders game UI.
    const body =
      "\n    | .Tick :> { @score = @score + 1; .Playing }\n" +
      "    | _    :> @phase\n" +
      "    <span>Score: ${@score}</span>\n  ";
    const r = parseMessageArms(body);
    expect(r.arms).toHaveLength(2);
    expect(r.arms.map((a) => a.variantName)).toEqual(["Tick", "_"]);
    expect(r.arms[0].isBlockBody).toBe(true);
    expect(r.arms[1].isWildcard).toBe(true);
    // The render body begins at the first non-arm content.
    expect(body.slice(r.renderBodyStart)).toBe("<span>Score: ${@score}</span>\n  ");
  });
});

// ---------------------------------------------------------------------------
// Surface B — through parseEngineStateChildren (the real consumer path)
// ---------------------------------------------------------------------------

describe("§51.0.S Surface B — messageArms via parseEngineStateChildren", () => {
  test("the §51.0.S.6 worked example: arms attach to the right state-children", () => {
    const { eng } = buildEngineDecl(SPEC_S6_ENGINE);
    const scs = parseEngineStateChildren(eng.rulesRaw);
    const byTag = Object.fromEntries(scs.map((s) => [s.tag, s]));

    expect(byTag.Idle.messageArms).toHaveLength(1);
    expect(byTag.Idle.messageArms[0].variantName).toBe("Start");
    expect(byTag.Idle.messageArms[0].bodyRaw).toBe(".Dragging(id)");

    expect(byTag.Dragging.messageArms).toHaveLength(2);
    expect(byTag.Dragging.messageArms.map((a) => a.variantName)).toEqual(["Drop", "End"]);
    expect(byTag.Dragging.messageArms[0].isBlockBody).toBe(true);
    expect(byTag.Dragging.messageArms[1].isBlockBody).toBe(false);
  });

  test("a state-child with no arms has messageArms === [] (additive, unchanged)", () => {
    const src = `type Size:enum = { Small, Big }
<engine for=Size initial=.Small>
  <Small rule=.Big>grow()</>
  <Big rule=.Small/>
</>`;
    const { eng } = buildEngineDecl(src);
    const scs = parseEngineStateChildren(eng.rulesRaw);
    for (const sc of scs) {
      expect(sc.messageArms).toEqual([]);
    }
  });

  test(":-shorthand and self-close state-children never collect arms", () => {
    // Fed as a raw engine body (the `parseEngineStateChildren` input contract)
    // so the assertion targets the parser's body-form guard directly: only the
    // bare-body form can host arms; `:`-shorthand bodies are single-expression
    // render bodies and self-close has no body. A stray leading `|` inside a
    // `:`-shorthand line must NOT be mis-collected as an arm.
    const rulesRaw = `<Idle rule=.Done> : "waiting"
<Done rule=.Idle/>`;
    const scs = parseEngineStateChildren(rulesRaw);
    expect(scs.length).toBeGreaterThanOrEqual(2);
    for (const sc of scs) {
      expect(sc.messageArms).toEqual([]);
      // confirm the form discriminants the guard keys on
      expect(sc.isColonShorthand || sc.bodyRaw === "").toBe(true);
    }
  });

  test("arms WITHOUT accepts= still PARSE (no error at parse layer) — batch-2 typer concern", () => {
    // §51.0.S: E-ENGINE-MSG-WITHOUT-ACCEPTS is a typer (batch 2) check; the
    // parser captures the arms unconditionally and must NOT error here.
    const src = `type Phase:enum = { Idle, Active }
type Msg:enum = { Go }
<engine for=Phase initial=.Idle>
  <Idle rule=.Active>
    | .Go :> .Active
  </>
  <Active rule=.Idle/>
</>`;
    const { eng, errors } = buildEngineDecl(src);
    expect(eng.acceptsType).toBe(null); // no accepts= declared
    const scs = parseEngineStateChildren(eng.rulesRaw);
    const idle = scs.find((s) => s.tag === "Idle");
    expect(idle.messageArms).toHaveLength(1);
    expect(idle.messageArms[0].variantName).toBe("Go");
    // The parse layer raises NO error for the missing accepts=.
    expect(errors.length).toBe(0);
  });
});
