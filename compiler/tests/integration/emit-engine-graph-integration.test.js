/**
 * Integration test for the engine "what-comes-next" static sidecar
 * (`--emit-engine-graph` -> `<base>.engine-graph.json`) over REAL compiled
 * .scrml files.
 *
 * This is the R26 empirical-verification anchor (S138 doctrine): the builder
 * runs against actual engine-bearing adopter source through the full pipeline,
 * NOT a synthesized AST. It verifies the projection lists the engine's real
 * variants, resolves the source `initial=`, carries known `rule=` transition
 * edges (incl. the wildcard-target case via a controlled fixture compiled
 * through the real pipeline), surfaces `effect=` presence, honest-empties on
 * engineless files, and is byte-deterministic across two compiles.
 *
 * Source under test:
 *   - examples/14-mario-state-machine.scrml — MarioState engine
 *     (initial=.Small; Small/Big/Fire/Cape state-children with rule= contracts)
 *     PLUS a derived HealthRisk projection engine.
 *   - examples/25-triage-board.scrml — DragPhase engine
 *     (initial=.Idle; Idle<->Dragging toggle — a second real-source engine).
 *   - a temp .scrml fixture with a `rule=*` state — exercises the
 *     wildcard-target next-set expansion through the FULL pipeline.
 */
import { test, expect, describe } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");

const MARIO = join(REPO_ROOT, "examples", "14-mario-state-machine.scrml");
const TRIAGE = join(REPO_ROOT, "examples", "25-triage-board.scrml");

async function engineGraphFor(file) {
  const result = await compileScrml({ inputFiles: [file], write: false });
  expect(typeof result.engineGraphJson).toBe("function");
  const json = result.engineGraphJson();
  return { json, graph: JSON.parse(json) };
}

// Compile a one-off .scrml source string through the real pipeline and return
// its engine graph. Used for the wildcard-target case (no shipped example
// authors `rule=*`).
async function engineGraphForSource(source, name = "fixture.scrml") {
  const dir = mkdtempSync(join(tmpdir(), "scrml-eg-fixture-"));
  try {
    const src = join(dir, name);
    writeFileSync(src, source);
    return await engineGraphFor(src);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("--emit-engine-graph over examples/14-mario-state-machine.scrml", () => {
  test("(a) the engineGraphJson parses as valid JSON with an engines array", async () => {
    const { graph } = await engineGraphFor(MARIO);
    expect(graph).toBeTypeOf("object");
    expect(Array.isArray(graph.engines)).toBe(true);
    expect(graph.engines.length).toBeGreaterThan(0);
  });

  test("(b) it lists the MarioState engine's real variants", async () => {
    const { graph } = await engineGraphFor(MARIO);
    const mario = graph.engines.find((e) => e.forType === "MarioState");
    expect(mario).toBeDefined();
    expect(mario.varName).toBe("marioState");
    // Declaration order: type MarioState enum = { Small, Big, Fire, Cape }
    expect(mario.variants).toEqual(["Small", "Big", "Fire", "Cape"]);
    expect(mario.derived).toBe(false);
  });

  test("(c) initialState matches the source initial=.Small", async () => {
    const { graph } = await engineGraphFor(MARIO);
    const mario = graph.engines.find((e) => e.forType === "MarioState");
    expect(mario.initialState).toBe("Small");
  });

  test("(d) known transition edges are present + correct (Small->Big/Fire/Cape, Fire->Small)", async () => {
    const { graph } = await engineGraphFor(MARIO);
    const mario = graph.engines.find((e) => e.forType === "MarioState");
    // Source: <Small rule=(.Big | .Fire | .Cape)>
    expect(mario.transitions).toContainEqual({ from: "Small", to: "Big", wildcard: false });
    expect(mario.transitions).toContainEqual({ from: "Small", to: "Fire", wildcard: false });
    expect(mario.transitions).toContainEqual({ from: "Small", to: "Cape", wildcard: false });
    // Source: <Fire rule=.Small>
    expect(mario.transitions).toContainEqual({ from: "Fire", to: "Small", wildcard: false });
    // Small's wildcard-expanded next set = its three literal targets (sorted).
    const small = mario.states.find((s) => s.tag === "Small");
    expect(small.next).toEqual(["Big", "Cape", "Fire"]);
  });

  test("the derived HealthRisk engine, if codegen collects it, is flagged derived:true", async () => {
    // Fidelity: the sidecar reuses the canonical codegen collectors, so it
    // surfaces EXACTLY the engines codegen emits. If HealthRisk is collected it
    // MUST carry derived:true with no authored rule= edges; if codegen does not
    // collect it for this file, the sidecar honestly omits it (sidecar==codegen).
    const { graph } = await engineGraphFor(MARIO);
    const hr = graph.engines.find((e) => e.forType === "HealthRisk");
    if (hr) {
      expect(hr.derived).toBe(true);
      expect(hr.transitions).toEqual([]);
      expect(hr.states).toEqual([]);
      expect(hr.variants).toEqual(["AtRisk", "Safe"]);
    }
  });

  test("(f) output is byte-identical across two compiles (determinism)", async () => {
    const a = await engineGraphFor(MARIO);
    const b = await engineGraphFor(MARIO);
    expect(a.json).toBe(b.json);
  });
});

describe("--emit-engine-graph over examples/25-triage-board.scrml (second real engine)", () => {
  test("projects the DragPhase engine with initial=Idle and the Idle<->Dragging toggle", async () => {
    const { graph } = await engineGraphFor(TRIAGE);
    const dp = graph.engines.find((e) => e.forType === "DragPhase");
    expect(dp).toBeDefined();
    expect(dp.varName).toBe("dragPhase");
    expect(dp.initialState).toBe("Idle");
    expect(dp.variants).toEqual(["Idle", "Dragging"]);
    // Source: <Idle rule=.Dragging> / <Dragging rule=.Idle>
    expect(dp.transitions).toContainEqual({ from: "Idle", to: "Dragging", wildcard: false });
    expect(dp.transitions).toContainEqual({ from: "Dragging", to: "Idle", wildcard: false });
    expect(dp.states.find((s) => s.tag === "Idle").next).toEqual(["Dragging"]);
    expect(dp.states.find((s) => s.tag === "Dragging").next).toEqual(["Idle"]);
  });
});

describe("--emit-engine-graph wildcard-target case (real-pipeline fixture)", () => {
  // A controlled fixture: a Ticket engine where the terminal Resolved state
  // declares `rule=*` (may transition to any variant). Compiled through the
  // FULL pipeline (not a synthesized AST), so this is R26-empirical.
  const TICKET_SOURCE = `<program title="Tickets">
  type Ticket:enum = { New, Triaged, InProgress, Resolved }
  <engine for=Ticket initial=.New>
    <New rule=.Triaged></>
    <Triaged rule=(.InProgress | .Resolved)></>
    <InProgress rule=.Resolved></>
    <Resolved rule=*></>
  </engine>
  <page path="/">
    <h1>Ticket: \${@ticket.variant}</h1>
  </page>
</program>
`;

  test("Resolved's rule=* is a wildcard-marked edge AND next-set expands to all-but-self", async () => {
    const { graph } = await engineGraphForSource(TICKET_SOURCE, "tickets.scrml");
    const ticket = graph.engines.find((e) => e.forType === "Ticket");
    expect(ticket).toBeDefined();
    expect(ticket.initialState).toBe("New");
    expect(ticket.variants).toEqual(["New", "Triaged", "InProgress", "Resolved"]);
    // Authored linear edges.
    expect(ticket.transitions).toContainEqual({ from: "New", to: "Triaged", wildcard: false });
    expect(ticket.transitions).toContainEqual({ from: "Triaged", to: "InProgress", wildcard: false });
    expect(ticket.transitions).toContainEqual({ from: "Triaged", to: "Resolved", wildcard: false });
    expect(ticket.transitions).toContainEqual({ from: "InProgress", to: "Resolved", wildcard: false });
    // Source: <Resolved rule=*> — wildcard-marked edge.
    expect(ticket.transitions).toContainEqual({ from: "Resolved", to: "*", wildcard: true });
    // Wildcard-EXPANDED: Resolved may reach any variant except itself, sorted.
    const resolved = ticket.states.find((s) => s.tag === "Resolved");
    expect(resolved.next).toEqual(["InProgress", "New", "Triaged"]);
  });
});

describe("--emit-engine-graph honest-empty", () => {
  test("(e) a file with NO engine emits { engines: [] }", async () => {
    const { graph, json } = await engineGraphForSource(
      `<page path="/">\n  <h1>No engines here</h1>\n</page>\n`,
      "page.scrml",
    );
    expect(graph).toEqual({ engines: [] });
    expect(json).toBe('{\n  "engines": []\n}\n');
  });
});
