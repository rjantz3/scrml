/**
 * mcp-descriptors-engines.test.js — MCP-V0.A extractor unit test (engines.json)
 *
 * Sub-unit A test follow-on (the MCP-V0.A-tests dispatch). Drives the REAL
 * emit path — `compileScrml({ write: true, emitPerRoute: true })` — on a small
 * `.scrml` fixture, reads the emitted `engines.json` sidecar from disk, and
 * asserts the descriptor JSON shape per SCOPING §3 Sub-unit A + the runtime
 * contract `scrml:mcp` (mcp.js) consumes (incl. the cellKey field B reads).
 *
 * Engine fixture authoring note: engines must parse as `engine-decl` nodes —
 * the canonical form is a top-level (or in-program) `<engine for=Type ...>`
 * with `</>`-body state-children. Payload variants per §51.0.B.1.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  makeSidecarTmpRoot,
  cleanupSidecarTmpRoot,
  compileAndReadSidecars,
} from "../helpers/mcp-sidecar-compile.js";

let TMP;
beforeAll(() => { TMP = makeSidecarTmpRoot("engines"); });
afterAll(() => { cleanupSidecarTmpRoot(TMP); });

const compile = (src) => compileAndReadSidecars(src, TMP);

// ---------------------------------------------------------------------------
// Fixture — two engines: a payload-bearing LoadPhase + a simple Health.
// (≥2 engines, one with a payload variant per §51.0.B.1.)
// ---------------------------------------------------------------------------

const ENGINE_FIXTURE = `type LoadPhase:enum = { Idle, Loading, Loaded(rows: int), Failed(message: string) }
type Health:enum = { Healthy, AtRisk, Critical }

<engine for=LoadPhase initial=.Idle>
  <Idle rule=.Loading></>
  <Loading rule=(.Loaded | .Failed)></>
  <Loaded(rows) rule=.Idle>\${rows}</>
  <Failed(msg) rule=.Idle>\${msg}</>
</>

<engine for=Health initial=.Healthy>
  <Healthy rule=.AtRisk></>
  <AtRisk rule=(.Critical | .Healthy)></>
  <Critical rule=.AtRisk></>
</>
`;

describe("MCP-V0.A engines.json extractor", () => {
  test("compiles clean + emits engines.json as a JSON array of two engines", () => {
    const { fatal, engines } = compile(ENGINE_FIXTURE);
    expect(fatal).toEqual([]);
    expect(Array.isArray(engines)).toBe(true);
    expect(engines).toHaveLength(2);
  });

  test("each engine descriptor carries name, cellKey, type, variants, rules, kind", () => {
    const { engines } = compile(ENGINE_FIXTURE);
    const load = engines.find((e) => e.name === "loadPhase");
    expect(load).toBeDefined();
    expect(load.cellKey).toBe("loadPhase"); // identity encoding in dev mode
    expect(load.type).toBe("LoadPhase");
    expect(load.kind).toBe("primary");
    expect(Array.isArray(load.variants)).toBe(true);
    expect(typeof load.rules).toBe("object");
  });

  test("variant payload fields (§51.0.B.1) surface with name + type", () => {
    const { engines } = compile(ENGINE_FIXTURE);
    const load = engines.find((e) => e.name === "loadPhase");
    const byTag = Object.fromEntries(load.variants.map((v) => [v.tag, v]));
    // Unit variants carry empty field lists.
    expect(byTag.Idle.fields).toEqual([]);
    expect(byTag.Loading.fields).toEqual([]);
    // Payload variants carry typed fields.
    expect(byTag.Loaded.fields).toEqual([{ name: "rows", type: "int" }]);
    expect(byTag.Failed.fields).toEqual([{ name: "message", type: "string" }]);
  });

  test("rules map encodes single / multi transitions per §51.0", () => {
    const { engines } = compile(ENGINE_FIXTURE);
    const load = engines.find((e) => e.name === "loadPhase");
    expect(load.rules.Idle).toEqual(["Loading"]); // single
    expect(load.rules.Loading).toEqual(["Loaded", "Failed"]); // multi
    expect(load.rules.Loaded).toEqual(["Idle"]);
    expect(load.rules.Failed).toEqual(["Idle"]);
  });

  test("the second engine (Health) is independently surfaced", () => {
    const { engines } = compile(ENGINE_FIXTURE);
    const health = engines.find((e) => e.name === "health");
    expect(health).toBeDefined();
    expect(health.type).toBe("Health");
    expect(health.cellKey).toBe("health");
    expect(health.kind).toBe("primary");
    expect(health.rules.AtRisk).toEqual(["Critical", "Healthy"]);
  });
});
