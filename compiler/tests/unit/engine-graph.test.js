/**
 * Unit tests for the engine "what-comes-next" static sidecar builder
 * (engine-graph.ts).
 *
 * The builder projects the engine state-machine metadata the compiler already
 * resolves (`_record.engineMeta` on each engine-decl) into a deterministic,
 * pretty-printed graph JSON written by `--emit-engine-graph`. These tests feed
 * synthetic engine-decl nodes (same shape `emit-engine.ts` consumes) and assert
 * the projection shape, wildcard handling, initial-state resolution, lifecycle
 * flags, honest-empty behavior, and byte-deterministic output.
 *
 * The integration test (compiler/tests/integration/emit-engine-graph-integration.test.js)
 * exercises the same builder over a real compiled .scrml file.
 */
import { test, expect, describe } from "bun:test";
import {
  buildEngineGraph,
  buildEngineGraphForFile,
  buildEngineGraphJson,
  serializeEngineGraph,
} from "../../src/engine-graph.ts";

// Build a minimal engineMeta-bearing engine-decl node (mirrors the helper in
// engine-c12-transition-table.test.js so discovery via collectC12/collectC14
// finds it). `fileAST` wraps decls in a `machineDecls` array — the canonical
// pre-collected list `collectC12EngineDecls` prefers.
function engineDecl(varName, variants, stateChildren, opts = {}) {
  return {
    kind: "engine-decl",
    _record: {
      engineMeta: {
        varName,
        forType: opts.forType ?? "S",
        variants,
        initialVariant: opts.initialVariant ?? null,
        derivedExpr: opts.derivedExpr ?? null,
        openerEffect: opts.openerEffect ?? null,
        stateChildren,
      },
    },
  };
}

function single(tag, target, extra = {}) {
  return { tag, rule: { kind: "single", target }, ...extra };
}
function multi(tag, targets, extra = {}) {
  return { tag, rule: { kind: "multi", targets }, ...extra };
}
function wildcard(tag, extra = {}) {
  return { tag, rule: { kind: "wildcard" }, ...extra };
}
function absent(tag, extra = {}) {
  return { tag, rule: { kind: "absent" }, ...extra };
}

// Wrap decls into a fileAST the collectors recognize.
function fileAST(...decls) {
  return { machineDecls: decls, nodes: [] };
}

describe("buildEngineGraphForFile — basic projection", () => {
  test("projects a simple linear engine with correct shape", () => {
    const ast = fileAST(
      engineDecl(
        "trafficLight",
        ["Red", "Green", "Yellow"],
        [single("Red", "Green"), single("Green", "Yellow"), single("Yellow", "Red")],
        { forType: "TrafficLight", initialVariant: "Red" },
      ),
    );
    const graph = buildEngineGraphForFile(ast);
    expect(graph.engines).toHaveLength(1);
    const e = graph.engines[0];
    expect(e.varName).toBe("trafficLight");
    expect(e.forType).toBe("TrafficLight");
    expect(e.initialState).toBe("Red");
    expect(e.derived).toBe(false);
    expect(e.variants).toEqual(["Red", "Green", "Yellow"]);
    expect(e.hasOpenerEffect).toBe(false);
  });

  test("flat transitions list is sorted (from, then to) deterministically", () => {
    const ast = fileAST(
      engineDecl(
        "s",
        ["A", "B", "C"],
        [multi("A", ["C", "B"]), single("B", "C")],
        { initialVariant: "A" },
      ),
    );
    const e = buildEngineGraphForFile(ast).engines[0];
    expect(e.transitions).toEqual([
      { from: "A", to: "B", wildcard: false },
      { from: "A", to: "C", wildcard: false },
      { from: "B", to: "C", wildcard: false },
    ]);
  });

  test("states are sorted by tag, each next-set sorted + de-duplicated", () => {
    const ast = fileAST(
      engineDecl(
        "s",
        ["A", "B", "C"],
        [multi("A", ["C", "B"]), single("C", "A"), single("B", "A")],
        { initialVariant: "A" },
      ),
    );
    const e = buildEngineGraphForFile(ast).engines[0];
    expect(e.states.map((s) => s.tag)).toEqual(["A", "B", "C"]);
    const a = e.states.find((s) => s.tag === "A");
    expect(a.next).toEqual(["B", "C"]);
  });
});

describe("buildEngineGraphForFile — initial-state resolution (§51.0.E)", () => {
  test("uses initial= when present", () => {
    const ast = fileAST(engineDecl("s", ["A", "B"], [single("A", "B")], { initialVariant: "B" }));
    expect(buildEngineGraphForFile(ast).engines[0].initialState).toBe("B");
  });

  test("falls back to first variant when initial= omitted", () => {
    const ast = fileAST(engineDecl("s", ["A", "B"], [single("A", "B")], { initialVariant: null }));
    expect(buildEngineGraphForFile(ast).engines[0].initialState).toBe("A");
  });

  test("null when no variants, no initial=, no state-children (derived engine)", () => {
    // A non-derived engine with zero state-children is filtered out by
    // isC12EngineDecl (engines need a non-empty stateChildren array), so it
    // never reaches the projection. The honest "no resolvable initial" case is
    // a DERIVED engine (zero state-children by construction) declaring neither
    // initial= nor variants.
    const ast = fileAST(
      engineDecl("s", [], [], {
        initialVariant: null,
        derivedExpr: { kind: "legacy-source-var", varName: "up" },
      }),
    );
    expect(buildEngineGraphForFile(ast).engines[0].initialState).toBe(null);
  });
});

describe("buildEngineGraphForFile — wildcard handling", () => {
  test("target-wildcard (rule=*) marks the edge wildcard and expands next to all-but-self", () => {
    const ast = fileAST(
      engineDecl("s", ["A", "B", "C"], [wildcard("A"), single("B", "A")], { initialVariant: "A" }),
    );
    const e = buildEngineGraphForFile(ast).engines[0];
    // The A:* edge is wildcard-marked in the flat list.
    expect(e.transitions).toContainEqual({ from: "A", to: "*", wildcard: true });
    // next for A is wildcard-EXPANDED to every variant except A itself.
    const a = e.states.find((s) => s.tag === "A");
    expect(a.next).toEqual(["B", "C"]);
  });

  test("inherited *:To wildcard edge appears in concrete states' next sets", () => {
    // A wildcard-SOURCE edge (`*:Dead`) is authored as a state-child whose tag
    // is the literal "*" token; every concrete state inherits the To target.
    const ast = fileAST(
      engineDecl(
        "s",
        ["A", "B", "Dead"],
        [single("A", "B"), single("*", "Dead")],
        { initialVariant: "A" },
      ),
    );
    const e = buildEngineGraphForFile(ast).engines[0];
    expect(e.transitions).toContainEqual({ from: "*", to: "Dead", wildcard: true });
    const a = e.states.find((s) => s.tag === "A");
    // A reaches its literal target B AND inherits the any-source -> Dead edge.
    expect(a.next).toEqual(["B", "Dead"]);
  });

  test("absent rule (terminal state) contributes no outbound edges", () => {
    const ast = fileAST(
      engineDecl("s", ["A", "B"], [single("A", "B"), absent("B")], { initialVariant: "A" }),
    );
    const e = buildEngineGraphForFile(ast).engines[0];
    const b = e.states.find((s) => s.tag === "B");
    expect(b.next).toEqual([]);
  });
});

describe("buildEngineGraphForFile — lifecycle + effect flags", () => {
  test("hasEffect reflects state-child effectRaw presence", () => {
    const ast = fileAST(
      engineDecl(
        "s",
        ["A", "B"],
        [single("A", "B", { effectRaw: "log(\"go\")" }), single("B", "A")],
        { initialVariant: "A" },
      ),
    );
    const e = buildEngineGraphForFile(ast).engines[0];
    expect(e.states.find((s) => s.tag === "A").hasEffect).toBe(true);
    expect(e.states.find((s) => s.tag === "B").hasEffect).toBe(false);
  });

  test("lifecycle flags reflect onTransition / onTimeout / internalRule / history", () => {
    const ast = fileAST(
      engineDecl(
        "s",
        ["A", "B"],
        [
          single("A", "B", {
            onTransitionElements: [{ to: "B" }],
            onTimeoutElements: [{ after: "1s", to: "B" }],
            internalRule: { kind: "single", target: "B" },
            historyAttr: true,
          }),
          single("B", "A"),
        ],
        { initialVariant: "A" },
      ),
    );
    const e = buildEngineGraphForFile(ast).engines[0];
    const a = e.states.find((s) => s.tag === "A");
    expect(a.lifecycle).toEqual({
      onTransition: true,
      onTimeout: true,
      internalRule: true,
      history: true,
    });
    const b = e.states.find((s) => s.tag === "B");
    expect(b.lifecycle).toEqual({
      onTransition: false,
      onTimeout: false,
      internalRule: false,
      history: false,
    });
  });

  test("hasOpenerEffect reflects engine opener effect= (§51.0.H Form 3)", () => {
    const withEffect = fileAST(
      engineDecl("s", ["A"], [absent("A")], { initialVariant: "A", openerEffect: "boot()" }),
    );
    expect(buildEngineGraphForFile(withEffect).engines[0].hasOpenerEffect).toBe(true);
    const without = fileAST(engineDecl("s", ["A"], [absent("A")], { initialVariant: "A" }));
    expect(buildEngineGraphForFile(without).engines[0].hasOpenerEffect).toBe(false);
  });
});

describe("buildEngineGraphForFile — derived engines (§51.0.J)", () => {
  test("derived engine is flagged derived:true and projects variants + initial", () => {
    const ast = fileAST(
      engineDecl("healthRisk", ["AtRisk", "Safe"], [], {
        forType: "HealthRisk",
        initialVariant: "AtRisk",
        derivedExpr: { kind: "legacy-source-var", varName: "marioState" },
      }),
    );
    const graph = buildEngineGraphForFile(ast);
    expect(graph.engines).toHaveLength(1);
    const e = graph.engines[0];
    expect(e.derived).toBe(true);
    expect(e.variants).toEqual(["AtRisk", "Safe"]);
    expect(e.initialState).toBe("AtRisk");
    // Derived engines carry no authored state-child rule= edges.
    expect(e.transitions).toEqual([]);
    expect(e.states).toEqual([]);
  });

  test("non-derived engines emit before derived engines (stable order)", () => {
    const ast = fileAST(
      engineDecl("primary", ["A", "B"], [single("A", "B")], { initialVariant: "A" }),
      engineDecl("proj", ["X", "Y"], [], {
        derivedExpr: { kind: "legacy-source-var", varName: "primary" },
      }),
    );
    const names = buildEngineGraphForFile(ast).engines.map((e) => e.varName);
    expect(names).toEqual(["primary", "proj"]);
  });
});

describe("buildEngineGraph / buildEngineGraphJson — multi-file + serialization", () => {
  test("honest-empty for a file with no engines", () => {
    const graph = buildEngineGraphForFile({ machineDecls: [], nodes: [] });
    expect(graph).toEqual({ engines: [] });
    expect(JSON.parse(buildEngineGraphJson({ machineDecls: [], nodes: [] }))).toEqual({ engines: [] });
  });

  test("buildEngineGraph concatenates engines across files in file order", () => {
    const f1 = fileAST(engineDecl("a", ["A"], [absent("A")], { initialVariant: "A" }));
    const f2 = fileAST(engineDecl("b", ["B"], [absent("B")], { initialVariant: "B" }));
    const graph = buildEngineGraph([f1, f2]);
    expect(graph.engines.map((e) => e.varName)).toEqual(["a", "b"]);
  });

  test("serializeEngineGraph is pretty-printed with a trailing newline", () => {
    const json = serializeEngineGraph({ engines: [] });
    expect(json).toBe('{\n  "engines": []\n}\n');
  });

  test("output is byte-deterministic across two builds of the same input", () => {
    const make = () =>
      fileAST(
        engineDecl(
          "s",
          ["A", "B", "C"],
          [multi("A", ["C", "B"]), single("B", "C"), single("C", "A")],
          { initialVariant: "A" },
        ),
      );
    const j1 = buildEngineGraphJson([make()]);
    const j2 = buildEngineGraphJson([make()]);
    expect(j1).toBe(j2);
  });
});
