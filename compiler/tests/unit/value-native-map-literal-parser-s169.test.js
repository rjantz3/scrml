/* SPDX-License-Identifier: MIT
 *
 * Unit — §59 Value-Native Maps, D2a LEGACY (Acorn) map-literal parser
 * (S169, map-build phase-c).
 *
 * D2a parses the value-native map literal `[:]` / `[k: v, …]` on the LEGACY
 * (Acorn) pipeline ONLY (the native `parseArrayLiteral` branch is D2b). The
 * map-vs-array distinction for reads/writes is at the typer (D1). The net-new
 * work here is the map LITERAL:
 *
 *   Unit 1 — MapLitExpr / MapEntry AST node + ExprNode union arm.
 *   Unit 2 — preprocessMapLiterals: a string/template-aware balanced scanner
 *            (modeled on preprocessMatchExprs) that rewrites a recognized map
 *            literal to a placeholder call __scrml_map_lit__(<diagJSON>, k, v, …).
 *            §59.3 disambiguation: MAP iff [:] OR a depth-1 entry-colon that is
 *            NOT a ternary alternative-colon.
 *   Unit 3 — esTreeToExprNode unmask: __scrml_map_lit__ -> MapLitExpr (each
 *            key/value source slice re-parsed via parseExprToNode).
 *   Unit 4 — E-MAP-LITERAL-MALFORMED (§59.3/§59.11): missing key/value, trailing
 *            colon, no-colon entry, stray/trailing comma.
 *   Unit 5 — W-MAP-STRUCT-KEY-LITERAL (struct/enum key literal — parse-accepted,
 *            codegen-deferred, §59.3 M-cut) + W-MAP-DUPLICATE-LITERAL-KEY
 *            (depth-1 dup keys, last-wins). Info → result.warnings.
 *
 * Two assertion levels:
 *   (a) parseExprToNode — the structured MapLitExpr node shape directly.
 *   (b) splitBlocks → buildAST — the diagnostics surfaced into the errors
 *       stream (E-* fatal; W-* auto-partition into result.warnings via the
 *       W-/I- prefix rule at api.js).
 *
 * R26 does NOT apply: there is no end-to-end map compile until D4 (codegen has
 * no map-literal lowering yet). Parser-unit + 0-regression are the gate.
 *
 * Spec authority: §59.3 (literals + disambiguation), §59.11 (E-MAP-LITERAL-
 * MALFORMED, W-MAP-STRUCT-KEY-LITERAL, W-MAP-DUPLICATE-LITERAL-KEY), §34.
 */

import { describe, expect, test } from "bun:test";
import { parseExprToNode } from "../../src/expression-parser.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function parseExpr(src) {
  return parseExprToNode(src, "map-d2.scrml", 0);
}

// Wrap a bare RHS expression in a minimal `${...}` logic body so the legacy
// ast-builder safeParseExpr wrapper (which surfaces map-literal diagnostics)
// runs over it. `asIs` keeps the typer permissive for the literal value.
function diagCodes(rhsExpr) {
  const src = `<program>\n\${\n  <data>: asIs = ${rhsExpr}\n}\n</program>\n`;
  const bs = splitBlocks("map-d2.scrml", src);
  const { errors } = buildAST(bs);
  return (errors || [])
    .map((e) => e.code)
    .filter((c) => c && (c.startsWith("E-MAP") || c.startsWith("W-MAP")));
}

// ---------------------------------------------------------------------------
// Unit 2/3 — recognition + node shape
// ---------------------------------------------------------------------------

describe("§59.3 D2a — map-literal recognition (legacy/Acorn)", () => {
  test("[:] -> empty MapLitExpr (zero entries)", () => {
    const n = parseExpr("[:]");
    expect(n.kind).toBe("map-lit");
    expect(n.entries).toHaveLength(0);
    expect(n.diagnostics ?? []).toHaveLength(0);
  });

  test('["DAL": 4500, "HOU": 5] -> MapLitExpr with 2 entries, clean', () => {
    const n = parseExpr('["DAL": 4500, "HOU": 5]');
    expect(n.kind).toBe("map-lit");
    expect(n.entries).toHaveLength(2);
    // Keys round-trip to string literals; values to number literals.
    expect(n.entries[0].key.kind).toBe("lit");
    expect(n.entries[0].key.value).toBe("DAL");
    expect(n.entries[0].value.kind).toBe("lit");
    expect(n.entries[0].value.value).toBe(4500);
    expect(n.entries[1].key.value).toBe("HOU");
    expect(n.entries[1].value.value).toBe(5);
    expect(n.diagnostics ?? []).toHaveLength(0);
  });

  test("[1: x] -> primitive-key (number) MapLitExpr, clean", () => {
    const n = parseExpr("[1: x]");
    expect(n.kind).toBe("map-lit");
    expect(n.entries).toHaveLength(1);
    expect(n.entries[0].key.value).toBe(1);
    expect(n.diagnostics ?? []).toHaveLength(0);
  });

  test("reactive @cell key/value round-trips through the pipeline", () => {
    const n = parseExpr("[@k: @v]");
    expect(n.kind).toBe("map-lit");
    expect(n.entries).toHaveLength(1);
    expect(n.entries[0].key.kind).toBe("ident");
    expect(n.entries[0].key.name).toBe("@k");
    expect(n.entries[0].value.name).toBe("@v");
  });

  test('string-interior colon ["a:b": 7] is not an entry-colon', () => {
    const n = parseExpr('["a:b": 7]');
    expect(n.kind).toBe("map-lit");
    expect(n.entries).toHaveLength(1);
    expect(n.entries[0].key.value).toBe("a:b");
    expect(n.entries[0].value.value).toBe(7);
  });

  test("nested-map value [string: [int: x]] round-trips to a nested map-lit", () => {
    const n = parseExpr('["a": [1: x]]');
    expect(n.kind).toBe("map-lit");
    expect(n.entries).toHaveLength(1);
    expect(n.entries[0].value.kind).toBe("map-lit");
    expect(n.entries[0].value.entries).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// arrays + ternary-colon EXCLUSION stay ARRAY (the §59.3 negative cases)
// ---------------------------------------------------------------------------

describe("§59.3 D2a — array / ternary-colon stay ARRAY", () => {
  test("[1, 2, 3] -> ArrayExpr (no depth-1 entry-colon)", () => {
    const n = parseExpr("[1, 2, 3]");
    expect(n.kind).toBe("array");
    expect(n.elements).toHaveLength(3);
  });

  test("[] -> empty ArrayExpr (NOT empty map)", () => {
    const n = parseExpr("[]");
    expect(n.kind).toBe("array");
    expect(n.elements).toHaveLength(0);
  });

  test("[@cond ? a : b] -> ArrayExpr (ternary alternative-colon excluded)", () => {
    const n = parseExpr("[@cond ? a : b]");
    expect(n.kind).toBe("array");
    expect(n.elements).toHaveLength(1);
    expect(n.elements[0].kind).toBe("ternary");
  });

  test("[a, @cond ? x : y, b] -> ArrayExpr (ternary mid-array still array)", () => {
    const n = parseExpr("[a, @cond ? x : y, b]");
    expect(n.kind).toBe("array");
    expect(n.elements).toHaveLength(3);
  });

  test("bracket index @arr[0] is unaffected (no depth-1 entry-colon)", () => {
    const n = parseExpr("@arr[0]");
    expect(n.kind).toBe("index");
  });
});

// ---------------------------------------------------------------------------
// Unit 4 — E-MAP-LITERAL-MALFORMED
// ---------------------------------------------------------------------------

describe("§59.3/§59.11 D2a — E-MAP-LITERAL-MALFORMED (parse-accepted, diagnosed)", () => {
  test('["k":] (trailing colon / missing value) -> E-MAP-LITERAL-MALFORMED', () => {
    const n = parseExpr('["k":]');
    expect(n.kind).toBe("map-lit");
    expect((n.diagnostics ?? []).map((d) => d.code)).toContain("E-MAP-LITERAL-MALFORMED");
    expect(diagCodes('["k":]')).toContain("E-MAP-LITERAL-MALFORMED");
  });

  test("[:5] (missing key) -> E-MAP-LITERAL-MALFORMED", () => {
    const n = parseExpr("[:5]");
    expect(n.kind).toBe("map-lit");
    expect((n.diagnostics ?? []).map((d) => d.code)).toContain("E-MAP-LITERAL-MALFORMED");
    expect(diagCodes("[:5]")).toContain("E-MAP-LITERAL-MALFORMED");
  });

  test('["a":1,"b"] (entry with no colon / count error) -> E-MAP-LITERAL-MALFORMED', () => {
    const n = parseExpr('["a":1,"b"]');
    expect(n.kind).toBe("map-lit");
    expect((n.diagnostics ?? []).map((d) => d.code)).toContain("E-MAP-LITERAL-MALFORMED");
    // The one well-formed entry still parses.
    expect(n.entries).toHaveLength(1);
    expect(diagCodes('["a":1,"b"]')).toContain("E-MAP-LITERAL-MALFORMED");
  });

  test('["a": 1, ] (trailing comma / empty entry) -> E-MAP-LITERAL-MALFORMED', () => {
    const n = parseExpr('["a": 1, ]');
    expect(n.kind).toBe("map-lit");
    expect((n.diagnostics ?? []).map((d) => d.code)).toContain("E-MAP-LITERAL-MALFORMED");
  });
});

// ---------------------------------------------------------------------------
// Unit 5 — W-MAP-STRUCT-KEY-LITERAL + W-MAP-DUPLICATE-LITERAL-KEY (Info)
// ---------------------------------------------------------------------------

describe("§59.3/§59.11 D2a — Info-level W-MAP-* notices", () => {
  test("[ {a:1}: {b:2} ] parse-accepts + W-MAP-STRUCT-KEY-LITERAL", () => {
    const n = parseExpr("[ {a:1}: {b:2} ]");
    expect(n.kind).toBe("map-lit");
    expect(n.entries).toHaveLength(1);
    // The depth-1 colon is the entry-colon; a:1 / b:2 are depth-2 (inside {}).
    expect(n.entries[0].key.kind).toBe("object");
    expect(n.entries[0].value.kind).toBe("object");
    expect((n.diagnostics ?? []).map((d) => d.code)).toContain("W-MAP-STRUCT-KEY-LITERAL");
    // Info → result.warnings (W- prefix). NOT a fatal E-* error.
    const codes = diagCodes("[ {a:1}: {b:2} ]");
    expect(codes).toContain("W-MAP-STRUCT-KEY-LITERAL");
    expect(codes).not.toContain("E-MAP-LITERAL-MALFORMED");
  });

  test("enum-variant key (.Variant) -> W-MAP-STRUCT-KEY-LITERAL", () => {
    const n = parseExpr("[.Mushroom: 1]");
    expect(n.kind).toBe("map-lit");
    expect((n.diagnostics ?? []).map((d) => d.code)).toContain("W-MAP-STRUCT-KEY-LITERAL");
  });

  test('["DAL": 3, "DAL": 5] last-wins + W-MAP-DUPLICATE-LITERAL-KEY', () => {
    const n = parseExpr('["DAL": 3, "DAL": 5]');
    expect(n.kind).toBe("map-lit");
    // Both entries are kept by the parser (runtime/codegen applies last-wins).
    expect(n.entries).toHaveLength(2);
    expect(n.entries[0].value.value).toBe(3);
    expect(n.entries[1].value.value).toBe(5);
    expect((n.diagnostics ?? []).map((d) => d.code)).toContain("W-MAP-DUPLICATE-LITERAL-KEY");
    const codes = diagCodes('["DAL": 3, "DAL": 5]');
    expect(codes).toContain("W-MAP-DUPLICATE-LITERAL-KEY");
    expect(codes).not.toContain("E-MAP-LITERAL-MALFORMED");
  });

  test("distinct primitive keys produce NO W-MAP-DUPLICATE-LITERAL-KEY", () => {
    const n = parseExpr('["DAL": 3, "HOU": 5]');
    expect((n.diagnostics ?? []).map((d) => d.code)).not.toContain("W-MAP-DUPLICATE-LITERAL-KEY");
  });
});

// ---------------------------------------------------------------------------
// clean literals emit NO diagnostics (no false-positive into the errors stream)
// ---------------------------------------------------------------------------

describe("§59.3 D2a — clean literals + arrays surface no map diagnostics", () => {
  test.each([
    ["[:]", "empty map"],
    ['["DAL": 4500, "HOU": 5]', "clean primitive-key map"],
    ["[1, 2, 3]", "plain array"],
    ["[]", "empty array"],
    ["[@cond ? a : b]", "ternary-in-array"],
  ])("%s (%s) -> no E-MAP/W-MAP diagnostics", (expr) => {
    expect(diagCodes(expr)).toHaveLength(0);
  });
});
