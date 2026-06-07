/**
 * D4 — value-native map codegen collector (§59).
 *
 * Tests for `collectMapVarNames` + `isMapTypeAnnotation` (reactive-deps.ts) —
 * the name-set that lets emit-expr.ts intercept `@m[k]` reads, `@m.<method>(…)`
 * calls and `@m.size` and lower them to the `_scrml_map_*` runtime.
 *
 * A cell is a map iff (a) its state-decl `[KeyT: ValT]` annotation resolves to a
 * map type, OR (b) its initializer RHS is a `map-lit` expr (incl. `[:]` empty).
 */

import { describe, test, expect } from "bun:test";
import { collectMapVarNames, isMapTypeAnnotation } from "../../src/codegen/reactive-deps.ts";

// ---------------------------------------------------------------------------
// §A  isMapTypeAnnotation — the [KeyT: ValT] recognizer (mirrors the typer)
// ---------------------------------------------------------------------------

describe("isMapTypeAnnotation — [KeyT: ValT] recognition", () => {
  test("recognizes a primitive-key map type", () => {
    expect(isMapTypeAnnotation("[string: Money]")).toBe(true);
    expect(isMapTypeAnnotation("[int: User]")).toBe(true);
  });

  test("recognizes a struct-key map type", () => {
    expect(isMapTypeAnnotation("[Route: Money]")).toBe(true);
  });

  test("recognizes a nested-map value type", () => {
    expect(isMapTypeAnnotation("[string: [int: Money]]")).toBe(true);
  });

  test("strips a trailing @ordered affix", () => {
    expect(isMapTypeAnnotation("[string: Money]@ordered")).toBe(true);
  });

  test("rejects an array type (no depth-1 entry colon)", () => {
    expect(isMapTypeAnnotation("Money[]")).toBe(false);
    expect(isMapTypeAnnotation("string[]")).toBe(false);
  });

  test("rejects a plain scalar / struct type", () => {
    expect(isMapTypeAnnotation("number")).toBe(false);
    expect(isMapTypeAnnotation("User")).toBe(false);
  });

  test("rejects empty / undefined annotation", () => {
    expect(isMapTypeAnnotation("")).toBe(false);
    expect(isMapTypeAnnotation(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §B  collectMapVarNames — name-set collection from AST
// ---------------------------------------------------------------------------

describe("collectMapVarNames — map cell collection", () => {
  test("collects a typed [KeyT: ValT] state-decl", () => {
    const fileAST = {
      nodes: [
        { kind: "state-decl", name: "fareByLane", typeAnnotation: "[string: Money]" },
        { kind: "state-decl", name: "count", typeAnnotation: "number" },
      ],
    };
    const result = collectMapVarNames(fileAST);
    expect(result.has("fareByLane")).toBe(true);
    expect(result.has("count")).toBe(false);
  });

  test("collects an @ordered map state-decl", () => {
    const fileAST = {
      nodes: [
        { kind: "state-decl", name: "ranked", typeAnnotation: "[string: Money]@ordered" },
      ],
    };
    expect(collectMapVarNames(fileAST).has("ranked")).toBe(true);
  });

  test("collects a cell whose RHS is a map-lit (no annotation)", () => {
    const fileAST = {
      nodes: [
        { kind: "state-decl", name: "m", initExpr: { kind: "map-lit", entries: [] } },
        {
          kind: "state-decl",
          name: "prices",
          initExpr: {
            kind: "map-lit",
            entries: [{ key: { kind: "lit", value: "DAL" }, value: { kind: "lit", value: 3 } }],
          },
        },
      ],
    };
    const result = collectMapVarNames(fileAST);
    expect(result.has("m")).toBe(true);
    expect(result.has("prices")).toBe(true);
  });

  test("does NOT collect an array-literal cell", () => {
    const fileAST = {
      nodes: [
        { kind: "state-decl", name: "items", initExpr: { kind: "array", elements: [] } },
      ],
    };
    expect(collectMapVarNames(fileAST).has("items")).toBe(false);
  });

  test("collects a let/const cell with a map-lit RHS", () => {
    const fileAST = {
      nodes: [
        { kind: "let-decl", name: "local", initExpr: { kind: "map-lit", entries: [] } },
        { kind: "const-decl", name: "derived", initExpr: { kind: "map-lit", entries: [] } },
      ],
    };
    const result = collectMapVarNames(fileAST);
    expect(result.has("local")).toBe(true);
    expect(result.has("derived")).toBe(true);
  });

  test("finds map cells nested inside a logic block", () => {
    const fileAST = {
      nodes: [
        {
          kind: "logic",
          body: [
            { kind: "state-decl", name: "nestedMap", typeAnnotation: "[int: User]" },
          ],
        },
      ],
    };
    expect(collectMapVarNames(fileAST).has("nestedMap")).toBe(true);
  });

  test("returns an empty set for a fileAST with no maps", () => {
    const fileAST = {
      nodes: [{ kind: "state-decl", name: "count", typeAnnotation: "number" }],
    };
    expect(collectMapVarNames(fileAST).size).toBe(0);
  });

  test("tolerates an empty / malformed fileAST", () => {
    expect(collectMapVarNames({}).size).toBe(0);
  });
});
