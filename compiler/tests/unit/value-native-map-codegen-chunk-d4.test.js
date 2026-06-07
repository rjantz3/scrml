/**
 * D4 — value-native map runtime-chunk detection (§59).
 *
 * `fileHasMapUsage` drives the `'map'` chunk gate in
 * emit-client.ts:detectRuntimeChunks. A false negative tree-shakes the
 * `_scrml_map_*` helpers and crashes a map-using build at runtime.
 */

import { describe, test, expect } from "bun:test";
import { fileHasMapUsage } from "../../src/codegen/reactive-deps.ts";

describe("fileHasMapUsage — 'map' chunk gate", () => {
  test("true for a declared [KeyT: ValT] map cell", () => {
    const fileAST = {
      nodes: [{ kind: "state-decl", name: "fareByLane", typeAnnotation: "[string: Money]" }],
    };
    expect(fileHasMapUsage(fileAST)).toBe(true);
  });

  test("true for a cell with a map-lit RHS", () => {
    const fileAST = {
      nodes: [{ kind: "state-decl", name: "m", initExpr: { kind: "map-lit", entries: [] } }],
    };
    expect(fileHasMapUsage(fileAST)).toBe(true);
  });

  test("true for a standalone map-lit nested in an expr field", () => {
    const fileAST = {
      nodes: [
        {
          kind: "logic",
          body: [
            {
              kind: "expr-stmt",
              exprNode: {
                kind: "call",
                callee: { kind: "ident", name: "use" },
                args: [{ kind: "map-lit", entries: [] }],
              },
            },
          ],
        },
      ],
    };
    expect(fileHasMapUsage(fileAST)).toBe(true);
  });

  test("false for a file with no maps (array + scalar only)", () => {
    const fileAST = {
      nodes: [
        { kind: "state-decl", name: "items", initExpr: { kind: "array", elements: [] } },
        { kind: "state-decl", name: "count", typeAnnotation: "number" },
      ],
    };
    expect(fileHasMapUsage(fileAST)).toBe(false);
  });

  test("false / safe on null / empty fileAST", () => {
    expect(fileHasMapUsage(null)).toBe(false);
    expect(fileHasMapUsage({})).toBe(false);
  });
});
