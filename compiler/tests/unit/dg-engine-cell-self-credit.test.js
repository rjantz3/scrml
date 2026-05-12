/**
 * dg-engine-cell-self-credit.test.js — Stage 7 DG E-DG-002 false-fire on
 * engine auto-declared cells (§51.0.C).
 *
 * Regression for S85 bug surfaced by trucking-dispatch hos.scrml:
 *
 *   <engine for=DriverStatus initial=.OffDuty>
 *     <OffDuty rule=(.OnDuty | .SleeperBerth)></>
 *     <OnDuty  rule=(.OffDuty | .Driving)></>
 *     ...
 *   </>
 *
 * `@driverStatus` (auto-declared per §51.0.C) was never explicitly read
 * outside the engine body — but the engine block itself IS the structural
 * reader of its own cell per §51.0.D ("the engine's declaration position
 * IS its rendered output position"). Pre-fix DG markup-sweep did not
 * visit `engine-decl` nodes for self-consumption, so the engine cell saw
 * zero readers and E-DG-002 false-fired.
 *
 * Fix: `sweepNodeForAtRefs` calls `creditReader(engineMeta.varName)` on
 * `engine-decl` AST nodes — analogous to v0.2.4 Bug 3 (§51.9 projected
 * var redirect credits BOTH the projected var and the source).
 *
 * Coverage:
 *   T1  Non-derived engine: <engine for=T initial=.V> with state-children
 *       and rule= transitions — NO E-DG-002 on `@t` even when nothing else
 *       reads it.
 *   T2  Engine with `var=otherName` override — the OVERRIDDEN name is the
 *       one credited, not the auto-derived name.
 *   T3  Multiple engines in one file — each credits its own cell only.
 *   T4  Engine cell that IS read in markup ALSO has no E-DG-002 (sanity:
 *       the self-credit must compose with regular reader credit).
 *   T5  Non-engine cell that nothing reads STILL fires E-DG-002 (the fix
 *       MUST NOT mask truly-unused user-declared cells — §6 V5-strict).
 *
 * Spec authority: SPEC §51.0.C (auto-declared variable), §51.0.D (decl
 *   IS mount position — engine body renders at decl site), §31.5 (DG
 *   normative), §34 (E-DG-002 catalog).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { compileScrml } from "../../src/api.js";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/dg-engine-cell-self-credit");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

beforeAll(() => { mkdirSync(FIXTURE_DIR, { recursive: true }); });
afterAll(() => { rmSync(FIXTURE_DIR, { recursive: true, force: true }); });

function compileSource(source, filename = "test.scrml") {
  const filePath = resolve(join(FIXTURE_DIR, filename));
  writeFileSync(filePath, source);
  const result = compileScrml({ inputFiles: [filePath], outputDir: FIXTURE_OUTPUT, write: true });
  const fatalErrors = result.errors || [];
  const warnings = result.warnings || [];
  const allDiagnostics = [...fatalErrors, ...warnings];
  return { errors: allDiagnostics, warnings, fatalErrors };
}

function edg002For(diagnostics, varName) {
  return diagnostics.find((e) =>
    e.code === "E-DG-002" && new RegExp("`@" + varName + "`").test(e.message)
  );
}

describe("§51.0.D engine block — self-credits its auto-declared cell as reader", () => {
  test("T1: non-derived engine — no E-DG-002 on the auto-declared cell", () => {
    // Mirror of the trucking-dispatch hos.scrml shape — engine with
    // state-children + rule= transitions, no explicit @driverStatus read.
    const source = [
      "${",
      "  type DriverStatus:enum = { OffDuty, OnDuty, Driving, SleeperBerth }",
      "}",
      "",
      "<engine for=DriverStatus initial=.OffDuty>",
      "  <OffDuty      rule=(.OnDuty | .SleeperBerth)></>",
      "  <OnDuty       rule=(.OffDuty | .Driving)></>",
      "  <Driving      rule=(.OffDuty | .OnDuty)></>",
      "  <SleeperBerth rule=(.OnDuty | .OffDuty)></>",
      "</>",
      "",
      "<program>",
      "  <p>Driver dashboard</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t1-non-derived-engine.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "driverStatus")).toBeUndefined();
  });

  test("T2: engine with var= override — OVERRIDDEN name is the one credited", () => {
    const source = [
      "${",
      "  type Health:enum = { Healthy, AtRisk, Critical }",
      "}",
      "",
      "<engine for=Health var=playerHealth initial=.Healthy>",
      "  <Healthy rule=.AtRisk></>",
      "  <AtRisk  rule=(.Healthy | .Critical)></>",
      "  <Critical rule=.AtRisk></>",
      "</>",
      "",
      "<program>",
      "  <p>Game</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t2-var-override.scrml");
    expect(fatalErrors).toEqual([]);
    // The overridden name `playerHealth` is the actual cell name; auto-derived
    // `health` would never be registered.
    expect(edg002For(errors, "playerHealth")).toBeUndefined();
    expect(edg002For(errors, "health")).toBeUndefined();
  });

  test("T3: multiple engines in one file — each credits its own cell", () => {
    const source = [
      "${",
      "  type DriverStatus:enum = { OffDuty, OnDuty }",
      "  type LoadPhase:enum = { Empty, Loading, Loaded }",
      "}",
      "",
      "<engine for=DriverStatus initial=.OffDuty>",
      "  <OffDuty rule=.OnDuty></>",
      "  <OnDuty  rule=.OffDuty></>",
      "</>",
      "",
      "<engine for=LoadPhase initial=.Empty>",
      "  <Empty   rule=.Loading></>",
      "  <Loading rule=.Loaded></>",
      "  <Loaded  rule=.Empty></>",
      "</>",
      "",
      "<program>",
      "  <p>Two engines</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t3-multiple-engines.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "driverStatus")).toBeUndefined();
    expect(edg002For(errors, "loadPhase")).toBeUndefined();
  });

  test("T4: engine cell ALSO read in markup — self-credit composes with markup credit", () => {
    const source = [
      "${",
      "  type DriverStatus:enum = { OffDuty, OnDuty }",
      "}",
      "",
      "<engine for=DriverStatus initial=.OffDuty>",
      "  <OffDuty rule=.OnDuty></>",
      "  <OnDuty  rule=.OffDuty></>",
      "</>",
      "",
      "<program>",
      "  <p>Status: ${@driverStatus}</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t4-also-read.scrml");
    expect(fatalErrors).toEqual([]);
    expect(edg002For(errors, "driverStatus")).toBeUndefined();
  });

  test("T5: NEGATIVE — unused NON-engine cell STILL fires E-DG-002", () => {
    // The fix must NOT mask truly-unused user-declared cells. A plain
    // `<cell>` declaration that nothing reads must continue to fire
    // E-DG-002 — that's the substantive case.
    const source = [
      "${",
      "  type DriverStatus:enum = { OffDuty, OnDuty }",
      "  <unusedCell> = \"nothing reads this\"",
      "}",
      "",
      "<engine for=DriverStatus initial=.OffDuty>",
      "  <OffDuty rule=.OnDuty></>",
      "  <OnDuty  rule=.OffDuty></>",
      "</>",
      "",
      "<program>",
      "  <p>Driver dashboard</>",
      "</>",
      "",
    ].join("\n");
    const { fatalErrors, errors } = compileSource(source, "t5-unused-non-engine.scrml");
    expect(fatalErrors).toEqual([]);
    // Substantive case: user-declared cell with zero readers — warning MUST fire.
    expect(edg002For(errors, "unusedCell")).toBeDefined();
    // Engine cell still no-false-fire.
    expect(edg002For(errors, "driverStatus")).toBeUndefined();
  });
});
