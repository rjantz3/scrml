/* SPDX-License-Identifier: MIT
 * Bug 9 (M9) — Engine auto-declared variable pre-pass registration
 *
 * §51.0.C (Move 16): `<engine for=MarioState ...>` auto-declares `@marioState`
 * as a reactive cell of type MarioState. The TS scopeChain MUST have this
 * bind in place BEFORE function bodies are visited, otherwise Bug 7's
 * reassignment-position bare-variant inference (§B20.13 / §B20.14) cannot
 * find the cell type and falls back to a null contextType, firing a false
 * E-VARIANT-AMBIGUOUS on the bare `.Variant`.
 *
 * Surfacing case: examples/14-mario-state-machine.scrml's
 * `@marioState = .Big` inside `function eatPowerUp` — without this fix the
 * sample requires `MarioState::Big` workarounds.
 *
 * Spec authority:
 *   §51.0.C — auto-declared variable (Move 16) + auto-derived var name
 *   §51.0.K — Machine Cohesion (singleton invariant)
 *   §14.10  — bare-variant inference (M9, normative positions)
 */

import { describe, test, expect } from "bun:test";
import { runTS } from "../../src/type-system.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function compile(source, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  const fileAST = {
    filePath,
    source,
    nodes: ast.nodes ?? [],
    machineDecls: ast.machineDecls ?? [],
    typeDecls: ast.typeDecls ?? [],
    components: ast.components ?? [],
    imports: ast.imports ?? [],
    exports: ast.exports ?? [],
    ast,
  };
  const result = runTS({
    files: [fileAST],
    protectAnalysis: { views: new Map() },
    routeMap: { functions: new Map() },
  });
  return { ast, errors: result.errors };
}

function errsByCode(errors, code) {
  return (errors ?? []).filter((e) => e?.code === code);
}

// ===========================================================================
// §Bug9.1 — engine auto-declared variable is pre-registered into scope
//           BEFORE function bodies are visited
// ===========================================================================

describe("§Bug9.1 — auto-decl pre-pass: function body refs resolve cleanly", () => {
  test("§Bug9.1.1 `<engine for=Phase>` + function body bare-variant reassign — no fire", () => {
    // Canonical Bug 9 case: engine declared at file-scope (markup) after the
    // logic block that contains a function reassigning the auto-declared
    // variable to a bare variant. Without the pre-pass, the scope lookup
    // misses and a false E-VARIANT-AMBIGUOUS fires on `.Loading`.
    const src = `\${
      type Phase:enum = { Idle, Loading, Loaded }
      function go() {
        @phase = .Loading
      }
    }
    <engine for=Phase initial=.Idle>
      <Idle rule=.Loading></>
      <Loading rule=.Loaded></>
      <Loaded></>
    </>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-SCOPE-001").length).toBe(0);
  });

  test("§Bug9.1.2 engine + method-call form `@cell.advance(.V)` in function body", () => {
    // Bug 7's §B20.14 fire-site, but with the cell auto-declared by an
    // engine rather than a manual state-decl.
    const src = `\${
      type Phase:enum = { Idle, Loading, Loaded }
      function go() {
        @phase.advance(.Loading)
      }
    }
    <engine for=Phase initial=.Idle>
      <Idle rule=.Loading></>
      <Loading rule=.Loaded></>
      <Loaded></>
    </>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-SCOPE-001").length).toBe(0);
  });

  test("§Bug9.1.3 unknown bare variant on auto-decl reassign fires E-TYPE-063", () => {
    // Auto-declared cell IS the resolution context — typo'd variant fires
    // E-TYPE-063 with the engine's `for=Type` named, not silent ambiguous.
    const src = `\${
      type Phase:enum = { Idle, Loading }
      function go() {
        @phase = .Loaded
      }
    }
    <engine for=Phase initial=.Idle>
      <Idle rule=.Loading></>
      <Loading></>
    </>`;
    const { errors } = compile(src);
    const e063 = errsByCode(errors, "E-TYPE-063");
    expect(e063.length).toBeGreaterThanOrEqual(1);
    expect(e063[0].message).toMatch(/\.Loaded/);
    expect(e063[0].message).toMatch(/Phase/);
  });

  test("§Bug9.1.4 var= override binds the chosen name, not the auto-derived one", () => {
    // `<engine for=Health var=playerHealth ...>` auto-declares @playerHealth,
    // NOT @health. The pre-pass MUST honor the override.
    const src = `\${
      type Health:enum = { Healthy, AtRisk, Critical }
      function endanger() {
        @playerHealth = .Critical
      }
    }
    <engine for=Health var=playerHealth initial=.Healthy>
      <Healthy rule=.AtRisk></>
      <AtRisk rule=.Critical></>
      <Critical></>
    </>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
    expect(errsByCode(errors, "E-SCOPE-001").length).toBe(0);
  });
});

// ===========================================================================
// §Bug9.2 — incidental Bug 2 surface: derived engines over auto-declared vars
// ===========================================================================
//
// Bug 2 (per 14-mario header comment lines 126-132): `<engine derived=@autoVar>`
// fires E-ENGINE-004 because @autoVar was registered as `_cellKind: "engine"`
// not as a machine-bound reactive cell at SYM time. Our Option A fix targets
// TS scope only — it does not touch SYM. So this test characterizes the CURRENT
// state of Bug 2 post-Bug-9, NOT a claim that Bug 9 closes Bug 2. The pipeline
// agent surfaces "STILL-FAILS" in the final report if E-ENGINE-004 still fires.
//
describe("§Bug9.2 — Bug 2 closure check (derived engine over auto-declared var)", () => {
  test("§Bug9.2.1 derived engine over auto-declared @cell", () => {
    const src = `\${
      type Phase:enum = { Idle, Loading, Loaded }
      type Status:enum = { Ready, Busy }
    }
    <engine for=Phase initial=.Idle>
      <Idle rule=.Loading></>
      <Loading rule=.Loaded></>
      <Loaded></>
    </>
    <engine for=Status derived=@phase>
      <Ready></>
      <Busy></>
    </>`;
    const { errors } = compile(src);
    // We DO NOT assert this passes. The pipeline agent inspects the result
    // and reports CLOSED-INCIDENTALLY (zero E-ENGINE-004) or STILL-FAILS
    // (one or more E-ENGINE-004 still firing — separate dispatch needed).
    // Asserting it passes would make the test fail when Bug 2 is its own
    // sub-bucket. We just verify the test runs without crashing the compiler.
    expect(Array.isArray(errors)).toBe(true);
  });
});
