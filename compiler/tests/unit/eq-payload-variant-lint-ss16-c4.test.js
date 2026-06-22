/* SPDX-License-Identifier: MIT
 * ss16 C4 — `==`/`!=` against a payload-variant CONSTRUCTOR lint (§45).
 *
 * `@phase == Phase.Serving` where `Phase:enum = { Idle, Serving(angle: int) }`
 * references the `Serving` CONSTRUCTOR (a function, not a value). `==` lowers to
 * `_scrml_structural_eq(@phase, Phase.Serving)` (§45.4 — correct, NOT changed),
 * comparing the cell value against the ctor function → ALWAYS FALSE, silently.
 * Before C4 this compiled clean with NO diagnostic. C4 adds a warning-level lint
 * `W-EQ-PAYLOAD-VARIANT` that steers to `is .Variant` / `match`.
 *
 * UNIT variants compare fine (string tag) — they MUST NOT fire. `@phase is
 * .Serving` (the steer target) MUST NOT fire.
 *
 * Diagnostic-stream partition (S93): W- prefix + severity:warning → routes to
 * `result.warnings` (non-fatal). The cross-stream assertion mirrors the
 * memory-note `feedback_diagnostic_stream_partition.md` — assert on the
 * combined runTS errors filtered to {code AND severity}, NOT a naive
 * `result.errors.filter(code)` (which silently passes since runTS returns a
 * single mixed list — the api.js partition is what splits errors/warnings).
 *
 * Spec authority:
 *   §45.5 — `==` vs `is`.
 *   §45.7 — W-EQ-PAYLOAD-VARIANT error-code row.
 *   §45.8 — normative statement.
 *   §34   — global catalog row.
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

// Cross-stream helper: the diagnostic is a WARNING (W- prefix + severity
// "warning"). It is fatal-stream-clean: it must NEVER be an error-severity
// diagnostic. This mirrors the api.js partition (`isNonFatal`).
function payloadVariantLints(errors) {
  return (errors ?? []).filter((e) => e?.code === "W-EQ-PAYLOAD-VARIANT");
}
function fatalErrors(errors) {
  return (errors ?? []).filter(
    (e) =>
      !(
        e?.code?.startsWith("W-") ||
        e?.code?.startsWith("I-") ||
        e?.severity === "warning" ||
        e?.severity === "info"
      ),
  );
}

describe("ss16 C4 — W-EQ-PAYLOAD-VARIANT lint", () => {
  test("C4.1 `@phase == Phase.Serving` (payload variant) fires W-EQ-PAYLOAD-VARIANT (warning, non-fatal)", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Serving(angle: int) }
      <phase>: Phase = .Idle
      <stuck> = @phase == Phase.Serving
    }</program>`;
    const { errors } = compile(src);
    const lints = payloadVariantLints(errors);
    expect(lints.length).toBe(1);
    expect(lints[0].severity).toBe("warning");
    expect(lints[0].message).toContain("Phase.Serving");
    expect(lints[0].message).toContain("is .Serving");
    expect(lints[0].message).toContain("ALWAYS false");
    // Cross-stream: NOT a fatal-stream diagnostic.
    expect(fatalErrors(errors).some((e) => e.code === "W-EQ-PAYLOAD-VARIANT")).toBe(false);
  });

  test("C4.2 `!=` against a payload variant fires (message: ALWAYS true)", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Serving(angle: int) }
      <phase>: Phase = .Idle
      <stuck> = @phase != Phase.Serving
    }</program>`;
    const { errors } = compile(src);
    const lints = payloadVariantLints(errors);
    expect(lints.length).toBe(1);
    expect(lints[0].message).toContain("ALWAYS true");
  });

  test("C4.3 UNIT-variant `==` (`@phase == Phase.Idle`) does NOT fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Serving(angle: int) }
      <phase>: Phase = .Idle
      <stuck> = @phase == Phase.Idle
    }</program>`;
    const { errors } = compile(src);
    expect(payloadVariantLints(errors).length).toBe(0);
  });

  test("C4.4 `@phase is .Serving` (the steer target) does NOT fire", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Serving(angle: int) }
      <phase>: Phase = .Idle
      <stuck> = @phase is .Serving
    }</program>`;
    const { errors } = compile(src);
    expect(payloadVariantLints(errors).length).toBe(0);
  });

  test("C4.5 double-colon qualified `@phase == Phase::Serving` fires (same member shape)", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Serving(angle: int) }
      <phase>: Phase = .Idle
      <stuck> = @phase == Phase::Serving
    }</program>`;
    const { errors } = compile(src);
    expect(payloadVariantLints(errors).length).toBe(1);
  });

  test("C4.6 payload-variant on the LEFT (`Phase.Serving == @phase`) also fires", () => {
    const src = `<program>\${
      type Phase:enum = { Idle, Serving(angle: int) }
      <phase>: Phase = .Idle
      <stuck> = Phase.Serving == @phase
    }</program>`;
    const { errors } = compile(src);
    expect(payloadVariantLints(errors).length).toBe(1);
  });
});
