/**
 * D4 — W-MAP-ITERATION-ORDER info-level lint (§59.8 / §59.11).
 *
 * Tests both the lint module directly (runWMapIterationOrder over a synthetic
 * typed-AST) and the end-to-end partition (the lint lands in lintDiagnostics /
 * result.warnings — never result.errors).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { runWMapIterationOrder } from "../../src/lint-w-map-iteration-order.js";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ---------------------------------------------------------------------------
// §A  runWMapIterationOrder — direct over a synthetic typed-AST
// ---------------------------------------------------------------------------

function fileWith(eachInExpr, anno) {
  return {
    filePath: "/x.scrml",
    ast: {
      nodes: [
        { kind: "state-decl", name: "fareByLane", typeAnnotation: anno ?? "[string: number]" },
        {
          kind: "each-block",
          iterShape: "in",
          inExprRaw: eachInExpr,
          span: { line: 5, col: 3 },
          templateChildren: [],
        },
      ],
    },
  };
}

describe("runWMapIterationOrder — direct", () => {
  test("fires on <each in=@m.entries()> for an unordered map", () => {
    const diags = runWMapIterationOrder([fileWith("@fareByLane.entries()")]);
    expect(diags.length).toBe(1);
    expect(diags[0].code).toBe("W-MAP-ITERATION-ORDER");
    expect(diags[0].severity).toBe("info");
    expect(diags[0].message).toContain(".sorted()");
    expect(diags[0].message).toContain("@ordered");
  });

  test("fires on .keys() and .values() too", () => {
    expect(runWMapIterationOrder([fileWith("@fareByLane.keys()")]).length).toBe(1);
    expect(runWMapIterationOrder([fileWith("@fareByLane.values()")]).length).toBe(1);
  });

  test("does NOT fire when .sorted() stabilizes the iterable", () => {
    expect(runWMapIterationOrder([fileWith("@fareByLane.entries().sorted()")]).length).toBe(0);
  });

  test("does NOT fire when .sortedBy(fn) stabilizes the iterable", () => {
    expect(runWMapIterationOrder([fileWith("@fareByLane.entries().sortedBy(cmp)")]).length).toBe(0);
  });

  test("does NOT fire on an @ordered map (opted into order)", () => {
    expect(runWMapIterationOrder([fileWith("@fareByLane.entries()", "[string: number]@ordered")]).length).toBe(0);
  });

  test("does NOT fire when the iterated cell is not a map", () => {
    const file = {
      filePath: "/x.scrml",
      ast: {
        nodes: [
          { kind: "state-decl", name: "items", initExpr: { kind: "array", elements: [] } },
          { kind: "each-block", iterShape: "in", inExprRaw: "@items", span: { line: 1, col: 1 }, templateChildren: [] },
        ],
      },
    };
    expect(runWMapIterationOrder([file]).length).toBe(0);
  });

  test("safe on empty / null input", () => {
    expect(runWMapIterationOrder(null).length).toBe(0);
    expect(runWMapIterationOrder([]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §B  end-to-end partition — lint lands in lintDiagnostics, never errors
// ---------------------------------------------------------------------------

let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "map-iter-lint-")); });
afterAll(() => { if (TMP) rmSync(TMP, { recursive: true, force: true }); });

function compile(src) {
  const fp = join(TMP, "m.scrml");
  writeFileSync(fp, src);
  return compileScrml({ inputFiles: [fp], outputDir: join(TMP, "dist"), write: true, log: () => {} });
}

describe("W-MAP-ITERATION-ORDER — end-to-end partition", () => {
  test("unordered map iteration surfaces the info lint (never an error)", () => {
    const src = `<ul>
    \${
        <m>: [string: number] = [:]
    }
    <each in=@m.entries() as e>
        <li>\${e.key}: \${e.value}</li>
    </each>
</ul>`;
    const res = compile(src);
    const fatal = (res.errors || []).filter(e => e.severity == null || e.severity === "error");
    const mapErrCodes = fatal.filter(e => (e.code || "").startsWith("W-MAP-ITERATION-ORDER"));
    expect(mapErrCodes).toEqual([]); // NEVER in errors
    const lintHit = (res.lintDiagnostics || []).some(d => d.code === "W-MAP-ITERATION-ORDER");
    expect(lintHit).toBe(true);
  });

  test(".sorted() iteration does NOT surface the lint", () => {
    const src = `<ul>
    \${
        <m>: [string: number] = [:]
    }
    <each in=@m.entries().sorted() as e>
        <li>\${e.key}: \${e.value}</li>
    </each>
</ul>`;
    const res = compile(src);
    const lintHit = (res.lintDiagnostics || []).some(d => d.code === "W-MAP-ITERATION-ORDER");
    expect(lintHit).toBe(false);
  });
});
