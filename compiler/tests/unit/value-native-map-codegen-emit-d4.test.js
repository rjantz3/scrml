/**
 * D4 — value-native map codegen emission (§59.3/§59.6/§59.7/§59.8).
 *
 * Tests `emitExpr` lowering of map literals, bracket-reads, the `.size` member,
 * and the method surface to the `_scrml_map_*` runtime. All emitted JS is
 * `new Function`-checked for syntactic validity.
 */

import { describe, test, expect } from "bun:test";
import { emitExpr } from "../../src/codegen/emit-expr.ts";

// A minimal client-mode EmitExprContext. `mapVarNames` is passed per-test.
function ctx(mapVarNames) {
  return {
    mode: "client",
    mapVarNames: mapVarNames ? new Set(mapVarNames) : null,
  };
}

// Assert the emitted string is a syntactically valid JS expression.
function assertValidJs(jsExpr) {
  expect(() => new Function(`return (${jsExpr});`)).not.toThrow();
}

// Build a LitExpr — emitLit emits `node.raw`, so raw must be the JS source.
const litStr = (s) => ({ kind: "lit", litType: "string", raw: JSON.stringify(s), value: s });
const litNum = (n) => ({ kind: "lit", litType: "number", raw: String(n), value: n });
const atIdent = (name) => ({ kind: "ident", name: `@${name}` });

// ---------------------------------------------------------------------------
// §A  map-literal lowering — _scrml_map_from_entries
// ---------------------------------------------------------------------------

describe("emitMapLit — map literal lowering", () => {
  test("empty map [:] lowers to _scrml_map_from_entries([], false)", () => {
    const node = { kind: "map-lit", entries: [] };
    const js = emitExpr(node, ctx());
    expect(js).toBe("_scrml_map_from_entries([], false)");
    assertValidJs(js);
  });

  test("primitive-key literal lowers to a [k, v] pairs array", () => {
    const node = {
      kind: "map-lit",
      entries: [
        { key: litStr("DAL"), value: litNum(3) },
        { key: litStr("HOU"), value: litNum(5) },
      ],
    };
    const js = emitExpr(node, ctx());
    expect(js).toBe('_scrml_map_from_entries([["DAL", 3], ["HOU", 5]], false)');
    assertValidJs(js);
  });
});

// ---------------------------------------------------------------------------
// §B  bracket-read lowering — @m[k] -> _scrml_map_get
// ---------------------------------------------------------------------------

describe("emitIndex — @m[k] map read lowering", () => {
  test("@m[k] on a known map lowers to _scrml_map_get", () => {
    const node = { kind: "index", object: atIdent("fareByLane"), index: litStr("DAL") };
    const js = emitExpr(node, ctx(["fareByLane"]));
    expect(js).toContain("_scrml_map_get(");
    expect(js).toContain('"DAL"');
    assertValidJs(js);
  });

  test("@arr[i] on a NON-map cell stays a bracket access", () => {
    const node = { kind: "index", object: atIdent("items"), index: litNum(0) };
    const js = emitExpr(node, ctx(["fareByLane"])); // items not a map
    expect(js).not.toContain("_scrml_map_get");
    assertValidJs(js);
  });

  test("nested @outer[a][b] on a map root lowers to nested _scrml_map_get", () => {
    const inner = { kind: "index", object: atIdent("outer"), index: litStr("a") };
    const node = { kind: "index", object: inner, index: litStr("b") };
    const js = emitExpr(node, ctx(["outer"]));
    // Two nested map-gets: _scrml_map_get(_scrml_map_get(outer, "a"), "b")
    expect(js.match(/_scrml_map_get\(/g)?.length).toBe(2);
    assertValidJs(js);
  });
});

// ---------------------------------------------------------------------------
// §C  method lowering — @m.<method>(...) -> _scrml_map_<method>
// ---------------------------------------------------------------------------

function methodCall(varName, method, args) {
  return {
    kind: "call",
    callee: { kind: "member", object: atIdent(varName), property: method },
    args,
  };
}

describe("emitCall — @m.<method>(...) map method lowering", () => {
  const cases = [
    ["insert", [litStr("DAL"), litNum(4500)], "_scrml_map_insert"],
    ["remove", [litStr("DAL")], "_scrml_map_remove"],
    ["has", [litStr("DAL")], "_scrml_map_has"],
    ["get", [litStr("DAL")], "_scrml_map_get"],
    ["getOr", [litStr("DAL"), litNum(0)], "_scrml_map_get_or"],
    ["insertAll", [atIdent("more")], "_scrml_map_insert_all"],
    ["keys", [], "_scrml_map_keys"],
    ["values", [], "_scrml_map_values"],
    ["entries", [], "_scrml_map_entries"],
    ["sorted", [], "_scrml_map_sorted"],
  ];

  for (const [method, args, helper] of cases) {
    test(`@m.${method}(...) lowers to ${helper}`, () => {
      const node = methodCall("fareByLane", method, args);
      const js = emitExpr(node, ctx(["fareByLane"]));
      expect(js).toContain(`${helper}(`);
      assertValidJs(js);
    });
  }

  test("@m.update(k, fn) lowers to _scrml_map_update with the lambda intact", () => {
    const lambda = {
      kind: "lambda",
      params: [{ name: "f" }],
      body: { kind: "expr", value: litNum(1) },
    };
    const node = methodCall("fareByLane", "update", [litStr("DAL"), lambda]);
    const js = emitExpr(node, ctx(["fareByLane"]));
    expect(js).toContain("_scrml_map_update(");
    assertValidJs(js);
  });

  test("@m.sortedBy(fn) lowers to _scrml_map_sorted_by", () => {
    const lambda = {
      kind: "lambda",
      params: [{ name: "a" }, { name: "b" }],
      body: { kind: "expr", value: litNum(0) },
    };
    const node = methodCall("fareByLane", "sortedBy", [lambda]);
    const js = emitExpr(node, ctx(["fareByLane"]));
    expect(js).toContain("_scrml_map_sorted_by(");
    assertValidJs(js);
  });

  test("a method call on a NON-map cell is NOT intercepted", () => {
    const node = methodCall("list", "insert", [litNum(0), litNum(1)]);
    const js = emitExpr(node, ctx(["fareByLane"])); // list not a map
    expect(js).not.toContain("_scrml_map_insert");
    assertValidJs(js);
  });
});

// ---------------------------------------------------------------------------
// §D  .size member lowering — @m.size -> _scrml_map_size
// ---------------------------------------------------------------------------

describe("emitMember — @m.size map member lowering", () => {
  test("@m.size on a known map lowers to _scrml_map_size", () => {
    const node = { kind: "member", object: atIdent("fareByLane"), property: "size" };
    const js = emitExpr(node, ctx(["fareByLane"]));
    expect(js).toContain("_scrml_map_size(");
    assertValidJs(js);
  });

  test("@arr.length on a map cell is NOT rewritten to _scrml_map_size", () => {
    const node = { kind: "member", object: atIdent("fareByLane"), property: "length" };
    const js = emitExpr(node, ctx(["fareByLane"]));
    expect(js).not.toContain("_scrml_map_size");
    assertValidJs(js);
  });
});
