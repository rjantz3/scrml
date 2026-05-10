/**
 * A9 Ext 5 — Static monotonicity classifier (SPEC §19.9.6, S76 dispatch).
 *
 * Tests the per-statement classification rules (a)-(f) + the function-level
 * verdict aggregation + the .idempotent() modifier override.
 */

import { describe, test, expect } from "bun:test";
import { classifyFunctionMonotonicityForTest } from "../../src/monotonicity-analyzer.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function span(start) {
  return { file: "/test/app.scrml", start, end: start + 10, line: 1, col: 1 };
}

/** Build a state-decl node with an inline SQL init via `sqlNode` sibling. */
function makeStateDeclWithSql(name, query) {
  return {
    kind: "state-decl",
    name,
    init: "?{...}",
    sqlNode: { kind: "sql", query, chainedCalls: [], span: span(0) },
    span: span(0),
  };
}

/** Build a bare-expr wrapping a SQL node. */
function makeBareSql(query) {
  return {
    kind: "bare-expr",
    exprNode: { kind: "sql", query, chainedCalls: [] },
    span: span(0),
  };
}

/** Build a bare-expr that's a `<machine>.advance(...)` call. */
function makeAdvanceCall() {
  return {
    kind: "bare-expr",
    exprNode: {
      kind: "call",
      callee: {
        kind: "member",
        object: { kind: "ident", name: "marioMachine" },
        property: { name: "advance" },
      },
      args: [{ kind: "literal", value: ".Fire" }],
    },
    span: span(0),
  };
}

/** Build a function-decl with given body + optional .idempotent() modifier. */
function makeFn(body, opts = {}) {
  return {
    kind: "function-decl",
    name: opts.name ?? "testFn",
    params: opts.params ?? [],
    body,
    fnKind: "function",
    isServer: true,
    canFail: false,
    span: span(0),
    ...(opts.idempotentModifier ? { idempotentModifier: true } : {}),
  };
}

/** Build a CPSSplit object covering all body indices as server-stmts. */
function makeCpsSplit(bodyLen, returnVarName = null) {
  const indices = [];
  for (let i = 0; i < bodyLen; i++) indices.push(i);
  return {
    serverStmtIndices: indices,
    clientStmtIndices: [],
    returnVarName,
  };
}

// ---------------------------------------------------------------------------
// §19.9.6 (a) — SELECT-only / read-only
// ---------------------------------------------------------------------------

describe("§19.9.6 (a) — SELECT batches are monotone", () => {
  test("SELECT-only batch → monotone", () => {
    const fn = makeFn([makeStateDeclWithSql("rows", "SELECT * FROM users WHERE id = 5")]);
    const cps = makeCpsSplit(1, "rows");
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });

  test("SELECT with ORDER BY → monotone", () => {
    const fn = makeFn([makeBareSql("SELECT id, name FROM users ORDER BY name LIMIT 10")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });

  test("SELECT mentioning NOW() → non-monotone (non-determinism)", () => {
    const fn = makeFn([makeBareSql("SELECT NOW() as ts")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });
});

// ---------------------------------------------------------------------------
// §19.9.6 (b) — INSERT
// ---------------------------------------------------------------------------

describe("§19.9.6 (b) — INSERT batches", () => {
  test("INSERT without RETURNING → monotone", () => {
    const fn = makeFn([makeBareSql("INSERT INTO log (event) VALUES ('start')")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });

  test("INSERT with RETURNING id → non-monotone (auto-increment readback)", () => {
    const fn = makeFn([makeBareSql("INSERT INTO log (event) VALUES ('start') RETURNING id")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });

  test("INSERT with NOW() → non-monotone (non-determinism)", () => {
    const fn = makeFn([makeBareSql("INSERT INTO log (event, ts) VALUES ('x', NOW())")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });

  test("INSERT ON CONFLICT → non-monotone (UPDATE behavior)", () => {
    const fn = makeFn([makeBareSql("INSERT INTO profiles (id, name) VALUES (1, 'a') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });
});

// ---------------------------------------------------------------------------
// §19.9.6 (c) — UPDATE
// ---------------------------------------------------------------------------

describe("§19.9.6 (c) — UPDATE batches", () => {
  test("UPDATE assignment-only-of-literals → monotone", () => {
    const fn = makeFn([makeBareSql("UPDATE orders SET status = 'approved' WHERE id = 5")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });

  test("UPDATE col = col + 1 → non-monotone (self-reference)", () => {
    const fn = makeFn([makeBareSql("UPDATE counters SET val = val + 1 WHERE id = 1")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });

  test("UPDATE col = other_col → non-monotone (cross-col reference)", () => {
    const fn = makeFn([makeBareSql("UPDATE accounts SET balance = previous_balance WHERE id = 1")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });

  test("UPDATE with subquery → non-monotone (paren-bail)", () => {
    const fn = makeFn([makeBareSql("UPDATE orders SET status = (SELECT 'approved') WHERE id = 5")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });
});

// ---------------------------------------------------------------------------
// §19.9.6 (d) — DELETE
// ---------------------------------------------------------------------------

describe("§19.9.6 (d) — DELETE batches", () => {
  test("DELETE → monotone", () => {
    const fn = makeFn([makeBareSql("DELETE FROM cache WHERE expires_at < 1234567890")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });

  test("DELETE WHERE NOW() > expires → non-monotone", () => {
    const fn = makeFn([makeBareSql("DELETE FROM cache WHERE expires_at < NOW()")]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });
});

// ---------------------------------------------------------------------------
// §19.9.6 (f) — Machine-intrinsic
// ---------------------------------------------------------------------------

describe("§19.9.6 (f) — `<machine>.advance()` is machine-intrinsic", () => {
  test("single .advance() call → machine-intrinsic", () => {
    const fn = makeFn([makeAdvanceCall()]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("machine-intrinsic");
  });

  test("multi-statement batch ending in .advance() → not machine-intrinsic (only single-stmt)", () => {
    const fn = makeFn([
      makeBareSql("UPDATE log SET event = 'transition'"),
      makeAdvanceCall(),
    ]);
    const cps = makeCpsSplit(2);
    // Multi-stmt batch — even if all individual stmts are monotone, the
    // batch is "monotone" not "machine-intrinsic" (the latter is only for
    // single-stmt-bound-by-advance shape).
    const verdict = classifyFunctionMonotonicityForTest(fn, cps);
    // first stmt is UPDATE assignment-only-of-literals → monotone;
    // second stmt is non-SQL bare-expr (advance) → non-monotone
    // (classifier doesn't recognize advance as monotone in multi-stmt context).
    // So verdict = "non-monotone".
    expect(verdict).toBe("non-monotone");
  });
});

// ---------------------------------------------------------------------------
// §19.9.7 — `.idempotent()` modifier override
// ---------------------------------------------------------------------------

describe("§19.9.7 — .idempotent() modifier override", () => {
  test("non-monotone batch + .idempotent() → monotone (developer assertion)", () => {
    const fn = makeFn(
      [makeBareSql("INSERT INTO orders (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET total = EXCLUDED.total")],
      { idempotentModifier: true }
    );
    const cps = makeCpsSplit(1);
    // Without modifier this would be "non-monotone"; with modifier it's
    // overridden to "monotone".
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });

  test("monotone batch + .idempotent() → monotone (no-op)", () => {
    const fn = makeFn(
      [makeBareSql("SELECT * FROM users")],
      { idempotentModifier: true }
    );
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });
});

// ---------------------------------------------------------------------------
// Mixed batches + conservative defaults
// ---------------------------------------------------------------------------

describe("Mixed batches + conservative defaults", () => {
  test("SELECT + INSERT → monotone (both monotone)", () => {
    const fn = makeFn([
      makeBareSql("SELECT * FROM users"),
      makeBareSql("INSERT INTO log (event) VALUES ('seen')"),
    ]);
    const cps = makeCpsSplit(2);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });

  test("SELECT + UPDATE-non-monotone → non-monotone (mixed)", () => {
    const fn = makeFn([
      makeBareSql("SELECT * FROM counters"),
      makeBareSql("UPDATE counters SET val = val + 1"),
    ]);
    const cps = makeCpsSplit(2);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });

  test("Empty server-stmt batch → monotone (vacuous)", () => {
    const fn = makeFn([]);
    const cps = makeCpsSplit(0);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("monotone");
  });

  test("Unknown statement shape → non-monotone (conservative)", () => {
    // A bare-expr with no recognized SQL or .advance() shape — should
    // default to non-monotone.
    const fn = makeFn([
      { kind: "bare-expr", exprNode: { kind: "call", callee: { kind: "ident", name: "scrmlEmail" }, args: [] }, span: span(0) },
    ]);
    const cps = makeCpsSplit(1);
    expect(classifyFunctionMonotonicityForTest(fn, cps)).toBe("non-monotone");
  });
});
