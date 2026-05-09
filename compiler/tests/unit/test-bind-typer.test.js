/**
 * `test-bind` Typer Support — Unit Tests (Phase A8 / A6-3)
 *
 * Tests SYM PASS 18 (`walkAnnotateTestBindKinds` /
 * `annotateTestBindsInBlock` in `compiler/src/symbol-table.ts`),
 * which consumes A6-2's parser annotations on `TestBindDecl`:
 *   - `identifier: string`
 *   - `expression: string`
 *   - `line: number`
 * and populates:
 *   - `bindKind: "handler" | "return-stub"` (NEW A6-3)
 * + fires E-TEST-005 on LHS-resolution failure.
 *
 * Coverage:
 *   §1  Positive — handler form (function literal RHS) annotation
 *   §2  Positive — return-stub form (literal/value RHS) annotation
 *   §3  Positive — handler form (identifier-bound to function RHS)
 *   §4  Positive — independent annotations across two `~{}` blocks
 *   §5  Negative — LHS unknown → E-TEST-005
 *   §6  Negative — LHS resolves to non-server local fn → E-TEST-005
 *   §7  Edge — RHS is single-arg arrow without parens (`x => …`) → handler
 *   §8  Edge — RHS is empty array `[]` → return-stub (per worked example)
 *   §9  Edge — RHS is `function (x) { … }` expression → handler
 *   §10 Regression — A6-2 parser-level diagnostics still fire correctly
 *   §11 Default — `bindKind` always present after PASS 18
 *
 * Source-of-truth: SPEC §19.12.6 (declaration grammar + RHS-shape rule),
 * §19.12.7 (dispatch contract), §47.5 (encoded-name surface — codegen
 * concern, not A6-3), §34 row E-TEST-005.
 */

import { describe, expect, test } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runUpToSYM(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast, errors: tabErrors } = buildAST(bs);
  const sym = runSYM({ filePath, ast });
  return { ast, sym, tabErrors };
}

function findTestNode(ast) {
  for (const n of ast.nodes ?? []) {
    if (n && n.kind === "test") return n;
  }
  return null;
}

function findAllTestNodes(ast) {
  return (ast.nodes ?? []).filter((n) => n && n.kind === "test");
}

function eTest005s(sym) {
  return sym.errors.filter((e) => e.code === "E-TEST-005");
}

// ---------------------------------------------------------------------------
// §1 — Positive: handler form (function literal RHS)
// ---------------------------------------------------------------------------

describe("test-bind typer §1: handler form (function literal RHS)", () => {
  test("arrow function `(id) => {…}` RHS → bindKind: 'handler'", () => {
    const src = `
\${
  server fn fetchUser(id) { id }
}
~{
  test-bind fetchUser = (id) => { id, name: "Alice" }
  test "case" { assert true }
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode).toBeTruthy();
    expect(testNode.testGroup.testBinds).toHaveLength(1);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("handler");
  });

  test("zero-arg arrow `() => 42` RHS → bindKind: 'handler'", () => {
    const src = `
\${
  server fn nullary() { 42 }
}
~{
  test-bind nullary = () => 42
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("handler");
  });

  test("multi-arg arrow `(a, b) => a + b` RHS → bindKind: 'handler'", () => {
    const src = `
\${
  server fn addTwo(a, b) { a + b }
}
~{
  test-bind addTwo = (a, b) => a + b
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("handler");
  });
});

// ---------------------------------------------------------------------------
// §2 — Positive: return-stub form (literal / value RHS)
// ---------------------------------------------------------------------------

describe("test-bind typer §2: return-stub form (literal RHS)", () => {
  test("number literal RHS → bindKind: 'return-stub'", () => {
    const src = `
\${
  server fn count() { 0 }
}
~{
  test-bind count = 42
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("return-stub");
  });

  test("string literal RHS → bindKind: 'return-stub'", () => {
    const src = `
\${
  server fn getName() { "x" }
}
~{
  test-bind getName = "Alice"
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("return-stub");
  });

  test("object literal RHS → bindKind: 'return-stub'", () => {
    const src = `
\${
  server fn fetchUser(id) { id }
}
~{
  test-bind fetchUser = { id: 1, name: "Alice" }
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("return-stub");
  });
});

// ---------------------------------------------------------------------------
// §3 — Positive: handler form (identifier-bound to function RHS)
// ---------------------------------------------------------------------------

describe("test-bind typer §3: handler form (identifier-bound to function)", () => {
  test("RHS identifier resolves to a same-file function-decl → 'handler'", () => {
    const src = `
\${
  server fn fetchUser(id) { id }
  fn mockFetchUser(id) { { id, name: "Bob" } }
}
~{
  test-bind fetchUser = mockFetchUser
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("handler");
  });

  test("RHS identifier with no scope match → 'return-stub' (defensive)", () => {
    // When the RHS identifier doesn't resolve, A6-3 falls through to
    // return-stub — the dispatch will simply ignore call-site args and
    // return the (undefined-at-runtime) value. A6-4 codegen may add
    // its own diagnostic; A6-3 stays out of that lane.
    const src = `
\${
  server fn fetchUser(id) { id }
}
~{
  test-bind fetchUser = bareUnboundIdent
}
`;
    const { ast } = runUpToSYM(src);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("return-stub");
  });
});

// ---------------------------------------------------------------------------
// §4 — Positive: independent annotations across `~{}` blocks
// ---------------------------------------------------------------------------

describe("test-bind typer §4: scope-local independence", () => {
  test("same LHS in two ~{} blocks gets independent bindKind annotations", () => {
    const src = `
\${
  server fn fetchUser(id) { id }
}
~{
  test-bind fetchUser = (id) => { id, name: "block A" }
}
~{
  test-bind fetchUser = { id: 0, name: "block B" }
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testBlocks = findAllTestNodes(ast);
    expect(testBlocks).toHaveLength(2);
    expect(testBlocks[0].testGroup.testBinds[0].bindKind).toBe("handler");
    expect(testBlocks[1].testGroup.testBinds[0].bindKind).toBe("return-stub");
  });

  test("multiple test-binds in the same ~{} get independent annotations", () => {
    const src = `
\${
  server fn fetchUser(id) { id }
  server fn fetchPosts() { [] }
}
~{
  test-bind fetchUser  = (id) => { id, name: "Alice" }
  test-bind fetchPosts = []
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds).toHaveLength(2);
    const userBind = testNode.testGroup.testBinds.find((b) => b.identifier === "fetchUser");
    const postsBind = testNode.testGroup.testBinds.find((b) => b.identifier === "fetchPosts");
    expect(userBind.bindKind).toBe("handler");
    expect(postsBind.bindKind).toBe("return-stub");
  });
});

// ---------------------------------------------------------------------------
// §5 — Negative: LHS unknown → E-TEST-005
// ---------------------------------------------------------------------------

describe("test-bind typer §5: LHS unknown fires E-TEST-005", () => {
  test("LHS that doesn't match any same-file fn or import fires E-TEST-005", () => {
    const src = `
~{
  test-bind nonExistent = () => 42
}
`;
    const { sym } = runUpToSYM(src);
    const errs = eTest005s(sym);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    const lhs = errs.find((e) => e.message.includes("`test-bind nonExistent`"));
    expect(lhs).toBeTruthy();
    expect(lhs.message).toContain("does not resolve to a server function");
    expect(lhs.severity).toBe("error");
  });

  test("error message references SPEC §19.12.6", () => {
    const src = `~{ test-bind unknownFn = 1 }`;
    const { sym } = runUpToSYM(src);
    const errs = eTest005s(sym);
    expect(errs[0].message).toContain("§19.12.6");
  });
});

// ---------------------------------------------------------------------------
// §6 — Negative: LHS resolves to non-server local fn → E-TEST-005
// ---------------------------------------------------------------------------

describe("test-bind typer §6: non-server local fn fires E-TEST-005", () => {
  test("LHS resolving to a regular `fn` (no server modifier) fires E-TEST-005", () => {
    const src = `
\${
  fn pureUser(id) { id }
}
~{
  test-bind pureUser = (id) => { id, name: "x" }
}
`;
    const { sym } = runUpToSYM(src);
    const errs = eTest005s(sym);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    const e = errs.find((e) => e.message.includes("`test-bind pureUser`"));
    expect(e).toBeTruthy();
    expect(e.message).toContain("declared without the `server` modifier");
    expect(e.severity).toBe("error");
  });

  test("LHS resolving to a regular `function` fires E-TEST-005", () => {
    const src = `
\${
  function regular(id) { return id; }
}
~{
  test-bind regular = 0
}
`;
    const { sym } = runUpToSYM(src);
    const errs = eTest005s(sym);
    const e = errs.find((e) => e.message.includes("`test-bind regular`"));
    expect(e).toBeTruthy();
  });

  test("LHS resolving to a server fn does NOT fire E-TEST-005", () => {
    const src = `
\${
  server fn properServerFn(id) { id }
}
~{
  test-bind properServerFn = (id) => id
}
`;
    const { sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §7 — Edge: arrow without parens — `x => x` → handler
// ---------------------------------------------------------------------------

describe("test-bind typer §7: paren-less arrow → handler", () => {
  test("`x => x * 2` parses as handler", () => {
    const src = `
\${
  server fn doubleIt(x) { x * 2 }
}
~{
  test-bind doubleIt = x => x * 2
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("handler");
  });
});

// ---------------------------------------------------------------------------
// §8 — Edge: empty-array RHS (worked-example shape) → return-stub
// ---------------------------------------------------------------------------

describe("test-bind typer §8: empty-array RHS (worked example)", () => {
  test("`test-bind fetchPosts = []` → return-stub (per SPEC §19.12.8)", () => {
    const src = `
\${
  server fn fetchPosts() { [] }
}
~{
  test-bind fetchPosts = []
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("return-stub");
  });
});

// ---------------------------------------------------------------------------
// §9 — Edge: `function` expression RHS → handler
// ---------------------------------------------------------------------------

describe("test-bind typer §9: function expression RHS", () => {
  test("`function (x) { return x }` RHS → handler", () => {
    const src = `
\${
  server fn echoer(x) { x }
}
~{
  test-bind echoer = function (x) { return x; }
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("handler");
  });

  test("named function expression `function fn(x) { … }` RHS → handler", () => {
    const src = `
\${
  server fn echoer(x) { x }
}
~{
  test-bind echoer = function named(x) { return x; }
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds[0].bindKind).toBe("handler");
  });
});

// ---------------------------------------------------------------------------
// §10 — Regression: A6-2 parser-level diagnostics still fire
// ---------------------------------------------------------------------------

describe("test-bind typer §10: A6-2 parser-level diagnostics regression", () => {
  test("duplicate identifier still fires E-TEST-005 (A6-2 parser-level)", () => {
    const src = `
\${
  server fn fetchUser(id) { id }
}
~{
  test-bind fetchUser = 1
  test-bind fetchUser = 2
}
`;
    const { tabErrors } = runUpToSYM(src);
    // The parser-level (A6-2) E-TEST-005 fires from TAB; we verify it's
    // still present via the tabErrors path.
    const dup = tabErrors.find((e) => e.code === "E-TEST-005" && /duplicate/i.test(e.message));
    expect(dup).toBeTruthy();
  });

  test("malformed test-bind (missing RHS) still fires E-TEST-005 (A6-2 parser-level)", () => {
    const src = `
\${
  server fn fetchUser(id) { id }
}
~{
  test-bind fetchUser =
}
`;
    const { tabErrors } = runUpToSYM(src);
    const malformed = tabErrors.find(
      (e) => e.code === "E-TEST-005" && /right-hand-side/i.test(e.message),
    );
    expect(malformed).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// §11 — Default: bindKind always present after PASS 18
// ---------------------------------------------------------------------------

describe("test-bind typer §11: bindKind is always present after PASS 18", () => {
  test("every TestBindDecl has `bindKind` field after runSYM", () => {
    const src = `
\${
  server fn fetchUser(id) { id }
  server fn fetchPosts() { [] }
  server fn count() { 0 }
}
~{
  test-bind fetchUser  = (id) => id
  test-bind fetchPosts = []
  test-bind count      = 99
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds).toHaveLength(3);
    for (const bind of testNode.testGroup.testBinds) {
      expect(bind.bindKind).toBeDefined();
      expect(["handler", "return-stub"]).toContain(bind.bindKind);
    }
  });

  test("test-block with no testBinds is a no-op (no errors fired)", () => {
    const src = `
~{
  test "case" { assert true }
}
`;
    const { ast, sym } = runUpToSYM(src);
    expect(eTest005s(sym)).toHaveLength(0);
    const testNode = findTestNode(ast);
    expect(testNode.testGroup.testBinds).toHaveLength(0);
  });
});
