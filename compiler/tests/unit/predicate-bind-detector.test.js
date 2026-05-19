/**
 * predicate-bind-detector.test.js
 *
 * S103 Phase 3 select-row chip-away — coverage for the predicate-shape
 * detector in compiler/src/codegen/predicate-bind-detector.js.
 *
 * Per OQ-RT3-SR-OPEN-2 ratified STRICTEST scope (S103):
 *   - equality operator only (==)
 *   - one side: single @CELL ref (no dotted-path tail)
 *   - other side: literal (string/number/boolean/null) OR closure-captured
 *     non-reactive identifier or dotted-path
 *   - reject any other shape; LEGACY fallback
 *
 * The brief mandates ≥10 accept + ≥10 reject cases. Each case asserts:
 *   - matched: true/false as expected
 *   - on matched: cellName + valueExprJS shape correct
 */

import { describe, test, expect } from "bun:test";
import { detectPredicateShapeBind } from "../../src/codegen/predicate-bind-detector.js";

describe("predicate-bind-detector — accept cases", () => {
  test("cell == string literal (double-quoted)", () => {
    const r = detectPredicateShapeBind('@editingId == "row-5"');
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe('"row-5"');
  });

  test("cell == string literal (single-quoted)", () => {
    const r = detectPredicateShapeBind("@editingId == 'row-5'");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("'row-5'");
  });

  test("string literal == cell (symmetric)", () => {
    const r = detectPredicateShapeBind('"row-5" == @editingId');
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe('"row-5"');
  });

  test("cell == number literal", () => {
    const r = detectPredicateShapeBind("@editingId == 5");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("5");
  });

  test("cell == number literal (float)", () => {
    const r = detectPredicateShapeBind("@temp == 98.6");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("temp");
    expect(r.valueExprJS).toBe("98.6");
  });

  test("boolean literal == cell", () => {
    const r = detectPredicateShapeBind("false == @done");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("done");
    expect(r.valueExprJS).toBe("false");
  });

  test("cell == true", () => {
    const r = detectPredicateShapeBind("@active == true");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("active");
    expect(r.valueExprJS).toBe("true");
  });

  test("cell == null (JS null reaches detector if pre-rewritten)", () => {
    const r = detectPredicateShapeBind("@editingId == null");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("null");
  });

  test("cell == not (scrml absence; lowered to JS null as valueKey)", () => {
    const r = detectPredicateShapeBind("@editingId == not");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("null");
  });

  test("cell == closure-captured identifier", () => {
    const r = detectPredicateShapeBind("@editingId == item");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("item");
  });

  test("cell == closure-captured dotted path", () => {
    const r = detectPredicateShapeBind("@editingId == todo.id");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("todo.id");
  });

  test("closure-captured dotted path == cell (symmetric)", () => {
    const r = detectPredicateShapeBind("todo.id == @editingId");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("todo.id");
  });

  test("paren-wrapped accept", () => {
    const r = detectPredicateShapeBind("(@editingId == todo.id)");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("todo.id");
  });

  test("deep closure-captured path (row.entry.id)", () => {
    const r = detectPredicateShapeBind("@selected == row.entry.id");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("selected");
    expect(r.valueExprJS).toBe("row.entry.id");
  });

  test("negative number literal", () => {
    const r = detectPredicateShapeBind("@offset == -1");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("offset");
    expect(r.valueExprJS).toBe("-1");
  });

  // S103 follow-on — `!=` accepted same shape as `==`. Runtime dispatch is
  // identical (value-indexed subscribers fire on transitions to/from valueKey
  // regardless of predicate polarity; the bind function recomputes its own
  // truthiness internally). Closes TodoMVC's `if=@editingId != todo.id` half
  // of the select-row hot path.

  test("not-equal with cell + literal string", () => {
    const r = detectPredicateShapeBind('@editingId != "row-5"');
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe('"row-5"');
  });

  test("not-equal with cell + closure-captured dotted path (TodoMVC pattern)", () => {
    const r = detectPredicateShapeBind("@editingId != todo.id");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("todo.id");
  });

  test("not-equal symmetric (literal on LHS)", () => {
    const r = detectPredicateShapeBind("5 != @count");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("count");
    expect(r.valueExprJS).toBe("5");
  });

  test("not-equal with paren wrap", () => {
    const r = detectPredicateShapeBind("(@editingId != todo.id)");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("editingId");
    expect(r.valueExprJS).toBe("todo.id");
  });

  test("not-equal with bool literal", () => {
    const r = detectPredicateShapeBind("@done != true");
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("done");
    expect(r.valueExprJS).toBe("true");
  });

  test("not-equal rejects reactive-on-both-sides", () => {
    const r = detectPredicateShapeBind("@a != @b");
    expect(r.matched).toBe(false);
  });
});

describe("predicate-bind-detector — reject cases", () => {
  test("strict-equal (===) operator", () => {
    const r = detectPredicateShapeBind("@editingId === 5");
    expect(r.matched).toBe(false);
  });

  test("strict-not-equal (!==) operator", () => {
    const r = detectPredicateShapeBind("@editingId !== 5");
    expect(r.matched).toBe(false);
  });

  test("'in' operator", () => {
    const r = detectPredicateShapeBind("@a in arr");
    expect(r.matched).toBe(false);
  });

  test("Array.includes call", () => {
    const r = detectPredicateShapeBind("arr.includes(@a)");
    expect(r.matched).toBe(false);
  });

  test("arithmetic LHS (@a + 1 == @b)", () => {
    const r = detectPredicateShapeBind("@a + 1 == @b");
    expect(r.matched).toBe(false);
  });

  test("call RHS (@a == fn())", () => {
    const r = detectPredicateShapeBind("@a == fn()");
    expect(r.matched).toBe(false);
  });

  test("both reactive (@a == @b)", () => {
    const r = detectPredicateShapeBind("@a == @b");
    expect(r.matched).toBe(false);
  });

  test("both reactive with dotted (@todo.id == @editingId)", () => {
    const r = detectPredicateShapeBind("@todo.id == @editingId");
    expect(r.matched).toBe(false);
  });

  test("reactive with dotted tail (@cell.field == 5)", () => {
    const r = detectPredicateShapeBind("@cell.field == 5");
    // The @-side isn't a single cell ref (has dotted tail); reject — the
    // narrowing key would need deep-path tracking, not in scope.
    expect(r.matched).toBe(false);
  });

  test("no equality (just a cell ref)", () => {
    const r = detectPredicateShapeBind("@editingId");
    expect(r.matched).toBe(false);
  });

  test("compound expression (no equality)", () => {
    const r = detectPredicateShapeBind("@editingId && other");
    expect(r.matched).toBe(false);
  });

  test("multiple == operators (a == b == c)", () => {
    const r = detectPredicateShapeBind("@a == 5 == @b");
    expect(r.matched).toBe(false);
  });

  test("optional chaining RHS", () => {
    const r = detectPredicateShapeBind("@a == todo?.id");
    expect(r.matched).toBe(false);
  });

  test("index access RHS (rejected — not statically a primitive)", () => {
    const r = detectPredicateShapeBind("@a == arr[0]");
    expect(r.matched).toBe(false);
  });

  test("template literal RHS (could interpolate)", () => {
    const r = detectPredicateShapeBind("@a == `row-${i}`");
    expect(r.matched).toBe(false);
  });

  test("empty expression", () => {
    const r = detectPredicateShapeBind("");
    expect(r.matched).toBe(false);
  });

  test("non-string input", () => {
    const r = detectPredicateShapeBind(null);
    expect(r.matched).toBe(false);
  });
});

describe("predicate-bind-detector — edge case sanity", () => {
  test("== inside a string literal is not split", () => {
    // The detector should NOT split inside a quoted string. So `@a == "x==y"`
    // is still accepted as cell == string-literal.
    const r = detectPredicateShapeBind('@a == "x==y"');
    expect(r.matched).toBe(true);
    expect(r.cellName).toBe("a");
    expect(r.valueExprJS).toBe('"x==y"');
  });

  test("== inside paren-group is not the top-level split point", () => {
    // (5 == 6) == @a — the top-level == is the second one; LHS is "(5 == 6)"
    // which is NOT a literal, NOT a cell-ref, NOT a closure expr — reject.
    const r = detectPredicateShapeBind("(5 == 6) == @a");
    expect(r.matched).toBe(false);
  });

  test("reserved keyword RHS rejected", () => {
    const r = detectPredicateShapeBind("@a == this");
    expect(r.matched).toBe(false);
  });

  test("typeof RHS rejected", () => {
    const r = detectPredicateShapeBind("@a == typeof x");
    expect(r.matched).toBe(false);
  });
});
