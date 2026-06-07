/* SPDX-License-Identifier: MIT
 *
 * Unit — §59 Value-Native Maps, D2b NATIVE map-literal parser
 * (S169, map-build phase-c).
 *
 * D2b is the native-parser (`compiler/native-parser/`) sibling of D2a's legacy
 * (Acorn-path) map literal. The native parser is shadow-only
 * (`--parser=scrml-native`) but is the canonical-enforcer; the within-node
 * parity test compares native vs default output byte-for-byte. D2a landed the
 * map literal on the LEGACY/Acorn path; D2b lands the SAME shape on NATIVE so
 * the two paths agree (the within-node gate).
 *
 * The net-new native work:
 *   Unit 2 — `MapLit` ExprKind + `makeMapLit`/`makeMapEntry` (ast-expr.js).
 *   Unit 1 — `parseArrayLiteral` §59.3 fork (parse-expr.js): the empty `[:]`
 *            peek + a depth-1 entry-colon token scan (`findMapEntryColonOffset`,
 *            ternary-excluded) that switches to `parseMapLiteralBody`. §59.3
 *            disambiguation: MAP iff `[:]` OR a depth-1 entry-colon that is NOT
 *            a ternary alternative-colon.
 *   Unit 3 — `translate-expr.js` arm: native `MapLit` -> live `map-lit`
 *            ExprNode (D2a's shape: `{ kind:"map-lit", span, entries:[{key,
 *            value}], diagnostics? }`) so downstream (typer/D4-codegen) is
 *            identical to the legacy path.
 *   Unit 4 — §59.3 parse-time diagnostics on the native MapLit's `diagnostics`
 *            field, mirroring D2a: E-MAP-LITERAL-MALFORMED (missing key/value,
 *            no-colon entry, stray/trailing comma), W-MAP-STRUCT-KEY-LITERAL
 *            (struct/enum key — parse-accepted, codegen-deferred §59.3 M-cut),
 *            W-MAP-DUPLICATE-LITERAL-KEY (depth-1 dup keys, last-wins).
 *
 * DRIVER: source -> `lex` -> `parseExpr` (the M2 expression entry) -> the native
 * `Expr`; then `translateExpr` -> the live `map-lit` ExprNode. This mirrors the
 * native expression-unit drivers (m67-d3-match-arm-parse.test.js).
 *
 * R26 does NOT apply at the parser-unit level: the end-to-end map COMPILE rides
 * the legacy path (codegen D4); the native within-node parity sample
 * (map-001-fare-by-lane.scrml) is the byte-for-byte gate. Parser-unit +
 * 0-regression are the gate here.
 *
 * Spec authority: §59.3 (literals + disambiguation), §59.11 (the three codes),
 * §34. Parity reference: value-native-map-literal-parser-s169.test.js (D2a).
 */

import { describe, expect, test } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { parseExpr } from "../../native-parser/parse-expr.js";
import { ExprKind } from "../../native-parser/ast-expr.js";
import { translateExpr } from "../../native-parser/translate-expr.js";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// nativeAst — source -> the native `Expr` (PascalCase catalog) + parse errors.
function nativeAst(src) {
  return parseExpr(lex(src));
}

// liveExpr — source -> the live (lowercase) `ExprNode` after the bridge.
function liveExpr(src) {
  return translateExpr(nativeAst(src).ast);
}

// mapDiagCodes — the §59.* diagnostic CODES attached to the native MapLit's
// `diagnostics` field (these ride through translateMapLit verbatim onto the
// live `map-lit` node — the same surface D2a's MapLitExpr.diagnostics uses).
function mapDiagCodes(src) {
  const live = liveExpr(src);
  return (live.diagnostics || [])
    .map((d) => d.code)
    .filter((c) => c && (c.startsWith("E-MAP") || c.startsWith("W-MAP")));
}

// ---------------------------------------------------------------------------
// Unit 1/2/3 — recognition + node shape (native -> live map-lit)
// ---------------------------------------------------------------------------

describe("§59.3 D2b — native map-literal recognition", () => {
  test("[:] -> empty MapLit native node (zero entries)", () => {
    const ast = nativeAst("[:]").ast;
    expect(ast.kind).toBe(ExprKind.MapLit);
    expect(ast.entries).toHaveLength(0);
    expect(ast.diagnostics ?? []).toHaveLength(0);
  });

  test("[:] -> empty live map-lit (zero entries), no parse errors", () => {
    const { ast, errors } = nativeAst("[:]");
    const live = translateExpr(ast);
    expect(live.kind).toBe("map-lit");
    expect(live.entries).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  test('["DAL": 4500, "HOU": 5] -> live map-lit with 2 entries, clean', () => {
    const live = liveExpr('["DAL": 4500, "HOU": 5]');
    expect(live.kind).toBe("map-lit");
    expect(live.entries).toHaveLength(2);
    // Keys translate to string `lit`s; values to number `lit`s. The native
    // bridge round-trips each entry child through translateExpr.
    expect(live.entries[0].key.kind).toBe("lit");
    expect(live.entries[0].key.value).toBe("DAL");
    expect(live.entries[0].value.kind).toBe("lit");
    expect(live.entries[0].value.value).toBe(4500);
    expect(live.entries[1].key.value).toBe("HOU");
    expect(live.entries[1].value.value).toBe(5);
    expect(live.diagnostics ?? []).toHaveLength(0);
  });

  test("[1: x] -> primitive-key (number) live map-lit, clean", () => {
    const live = liveExpr("[1: x]");
    expect(live.kind).toBe("map-lit");
    expect(live.entries).toHaveLength(1);
    expect(live.entries[0].key.kind).toBe("lit");
    expect(live.entries[0].key.value).toBe(1);
    expect(live.entries[0].value.kind).toBe("ident");
    expect(live.entries[0].value.name).toBe("x");
    expect(live.diagnostics ?? []).toHaveLength(0);
  });

  test("a value expression inside an entry is fully parsed (nested call)", () => {
    const live = liveExpr('["a": f(1, 2)]');
    expect(live.kind).toBe("map-lit");
    expect(live.entries).toHaveLength(1);
    expect(live.entries[0].value.kind).toBe("call");
    expect(live.entries[0].value.args).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Unit 1 — the ARRAY path stays an array (no false-positive map detection)
// ---------------------------------------------------------------------------

describe("§59.3 D2b — array literals are NOT maps", () => {
  test("[1, 2, 3] -> live array (not a map)", () => {
    const live = liveExpr("[1, 2, 3]");
    expect(live.kind).toBe("array");
    expect(live.elements).toHaveLength(3);
  });

  test("[] empty array -> live array (distinct from [:] empty map)", () => {
    const live = liveExpr("[]");
    expect(live.kind).toBe("array");
    expect(live.elements).toHaveLength(0);
  });

  test("obj[key] index access -> live index (not a map)", () => {
    const live = liveExpr("obj[key]");
    expect(live.kind).toBe("index");
  });

  test("a bracketed ternary [ @cond ? a : b ] -> array (ternary alt-colon excluded)", () => {
    const live = liveExpr("[ @cond ? a : b ]");
    expect(live.kind).toBe("array");
    expect(live.elements).toHaveLength(1);
    expect(live.elements[0].kind).toBe("ternary");
  });

  test("a ternary KEY [ @c ? a : b : 9 ] -> map-lit (the entry-colon is AFTER the ternary)", () => {
    // The §59.3 ternary exclusion skips the ternary's alt-colon (matched `?`),
    // then finds the genuine depth-1 entry-colon — so this IS a map whose key
    // is the whole ternary `@c ? a : b`.
    const live = liveExpr("[ @c ? a : b : 9 ]");
    expect(live.kind).toBe("map-lit");
    expect(live.entries).toHaveLength(1);
    expect(live.entries[0].key.kind).toBe("ternary");
    expect(live.entries[0].value.value).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// Unit 4 — diagnostics (E-MAP-LITERAL-MALFORMED + the two info notices)
// ---------------------------------------------------------------------------

describe("§59.3 D2b — E-MAP-LITERAL-MALFORMED", () => {
  test("an entry with no `key: value` colon ([ \"a\": 1, \"b\" ])", () => {
    expect(mapDiagCodes('["a": 1, "b"]')).toContain("E-MAP-LITERAL-MALFORMED");
  });

  test("a trailing colon / missing value ([ \"k\": ])", () => {
    expect(mapDiagCodes('["k":]')).toContain("E-MAP-LITERAL-MALFORMED");
  });

  test("a trailing comma ([ \"a\": 1, ])", () => {
    expect(mapDiagCodes('["a": 1,]')).toContain("E-MAP-LITERAL-MALFORMED");
  });

  test("a clean literal carries NO E-MAP-LITERAL-MALFORMED", () => {
    expect(mapDiagCodes('["a": 1, "b": 2]')).not.toContain("E-MAP-LITERAL-MALFORMED");
  });
});

describe("§59.3 D2b — W-MAP info notices", () => {
  test("a struct/enum-key literal -> W-MAP-STRUCT-KEY-LITERAL (.Variant key)", () => {
    expect(mapDiagCodes("[.Active: 1]")).toContain("W-MAP-STRUCT-KEY-LITERAL");
  });

  test("a struct-literal key -> W-MAP-STRUCT-KEY-LITERAL ({ … } key)", () => {
    expect(mapDiagCodes('[{ id: 1 }: "v"]')).toContain("W-MAP-STRUCT-KEY-LITERAL");
  });

  test("a primitive (string) key does NOT trigger W-MAP-STRUCT-KEY-LITERAL", () => {
    expect(mapDiagCodes('["a": 1]')).not.toContain("W-MAP-STRUCT-KEY-LITERAL");
  });

  test("a duplicate depth-1 key -> W-MAP-DUPLICATE-LITERAL-KEY (last-wins)", () => {
    const codes = mapDiagCodes('["a": 1, "a": 2]');
    expect(codes).toContain("W-MAP-DUPLICATE-LITERAL-KEY");
    // Last-wins: both entries are kept (a downstream pass applies the rule).
    const live = liveExpr('["a": 1, "a": 2]');
    expect(live.entries).toHaveLength(2);
  });

  test("distinct keys carry NO W-MAP-DUPLICATE-LITERAL-KEY", () => {
    expect(mapDiagCodes('["a": 1, "b": 2]')).not.toContain("W-MAP-DUPLICATE-LITERAL-KEY");
  });
});

// ---------------------------------------------------------------------------
// Unit 3 — bridge shape parity: the native map-lit matches D2a's structure
// ---------------------------------------------------------------------------

describe("§59.3 D2b — bridge produces the D2a live shape", () => {
  test("the live node is `{ kind:'map-lit', span, entries:[{key,value}] }`", () => {
    const live = liveExpr('["a": 1]');
    expect(live.kind).toBe("map-lit");
    expect(live.span).toBeDefined();
    expect(typeof live.span.start).toBe("number");
    expect(Array.isArray(live.entries)).toBe(true);
    expect(live.entries[0]).toHaveProperty("key");
    expect(live.entries[0]).toHaveProperty("value");
  });

  test("diagnostics ride onto the live node (same surface as D2a)", () => {
    const live = liveExpr('["a": 1, "a": 2]');
    expect(Array.isArray(live.diagnostics)).toBe(true);
    expect(live.diagnostics.some((d) => d.code === "W-MAP-DUPLICATE-LITERAL-KEY")).toBe(true);
  });

  test("a clean literal omits the diagnostics field entirely", () => {
    const live = liveExpr('["a": 1]');
    expect(live.diagnostics).toBeUndefined();
  });
});
