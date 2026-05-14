/**
 * lit-not-canonical-discriminator — S90 M-7C-D-12 Track 1 (D-12.1f).
 *
 * Verifies the §42 absence canon migration: parser sites manufacture ONLY
 * `LitExpr { litType: "not" }`. The deprecated `"null"` / `"undefined"`
 * litType variants are RETAINED in the union but no parser site emits them.
 * The `raw` field carries source-token provenance:
 *
 *   - User-source `null`      → litType:"not", raw:"null"
 *   - User-source `undefined` → IdentExpr (acorn parses as Identifier)
 *   - scrml canonical `not`   → litType:"not", raw:"not"
 *   - Synthetic absence       → litType:"not", raw:"not"
 *   - Array-hole              → litType:"not", raw:"not"
 *   - Empty placeholder       → litType:"not", raw:""
 *
 * The gauntlet-phase3 detector reads `raw` to discriminate user-source
 * forbidden tokens (E-SYNTAX-042) from canonical/synthetic absence.
 *
 * Coordinated with D-12.1c (detector migration) — both land together.
 */

import { describe, test, expect } from "bun:test";
import { parseExprToNode } from "../../src/expression-parser.ts";

const FILE = "<test>";

describe("D-12.1b — parser sites manufacture canonical litType:'not'", () => {

  test("scrml canonical `not` keyword → litType:'not', raw:'not'", () => {
    const node = parseExprToNode("not", FILE, 0);
    expect(node.kind).toBe("lit");
    expect(node.litType).toBe("not");
    expect(node.raw).toBe("not");
    expect(node.value).toBe(null);
  });

  test("user-source `null` literal → litType:'not', raw:'null' (forbidden-source signal)", () => {
    const node = parseExprToNode("null", FILE, 0);
    expect(node.kind).toBe("lit");
    expect(node.litType).toBe("not");
    expect(node.raw).toBe("null");
    expect(node.value).toBe(null);
  });

  test("user-source `undefined` → IdentExpr (acorn parses as Identifier, not Literal)", () => {
    const node = parseExprToNode("undefined", FILE, 0);
    expect(node.kind).toBe("ident");
    expect(node.name).toBe("undefined");
  });

  test("`x is not` RHS synthesis → litType:'not', raw:'not' (not a forbidden source token)", () => {
    const node = parseExprToNode("x is not", FILE, 0);
    expect(node.kind).toBe("binary");
    expect(node.op).toBe("is-not");
    expect(node.right.kind).toBe("lit");
    expect(node.right.litType).toBe("not");
    expect(node.right.raw).toBe("not");
  });

  test("`x is some` RHS synthesis → litType:'not', raw:'not'", () => {
    const node = parseExprToNode("x is some", FILE, 0);
    expect(node.kind).toBe("binary");
    expect(node.op).toBe("is-some");
    expect(node.right.kind).toBe("lit");
    expect(node.right.litType).toBe("not");
    expect(node.right.raw).toBe("not");
  });

  test("`x is not not` RHS synthesis → litType:'not', raw:'not'", () => {
    const node = parseExprToNode("x is not not", FILE, 0);
    expect(node.kind).toBe("binary");
    expect(node.op).toBe("is-not-not");
    expect(node.right.kind).toBe("lit");
    expect(node.right.litType).toBe("not");
    expect(node.right.raw).toBe("not");
  });

  test("array hole `[1,,3]` → litType:'not', raw:'not' (semantic JS null per §42.5)", () => {
    const node = parseExprToNode("[1,,3]", FILE, 0);
    expect(node.kind).toBe("array");
    expect(node.elements.length).toBe(3);
    expect(node.elements[1].kind).toBe("lit");
    expect(node.elements[1].litType).toBe("not");
    expect(node.elements[1].raw).toBe("not");
  });

  test("empty expression placeholder → litType:'not', raw:''", () => {
    const node = parseExprToNode("", FILE, 0);
    expect(node.kind).toBe("lit");
    expect(node.litType).toBe("not");
    expect(node.raw).toBe("");
  });

  test("user-source `null` inside object property value → litType:'not', raw:'null'", () => {
    const node = parseExprToNode("{ field: null }", FILE, 0);
    expect(node.kind).toBe("object");
    const prop = node.props[0];
    expect(prop.kind).toBe("prop");
    expect(prop.value.kind).toBe("lit");
    expect(prop.value.litType).toBe("not");
    expect(prop.value.raw).toBe("null");
  });

  test("user-source `null` inside array literal → litType:'not', raw:'null'", () => {
    const node = parseExprToNode("[1, null, 3]", FILE, 0);
    expect(node.kind).toBe("array");
    expect(node.elements[1].kind).toBe("lit");
    expect(node.elements[1].litType).toBe("not");
    expect(node.elements[1].raw).toBe("null");
  });

  test("no parser site manufactures the deprecated litType:'null' variant", () => {
    // Sweep a representative set of expressions; none should produce
    // litType: "null" anywhere in the AST.
    const samples = [
      "not",
      "null",  // user-source — still emits litType:"not" (with raw:"null")
      "x is not",
      "x is some",
      "x is not not",
      "[1,,3]",
      "{ k: null }",
      "[1, null]",
      "f(null)",
      "x ?? null",
    ];
    for (const expr of samples) {
      const node = parseExprToNode(expr, FILE, 0);
      walkExprNode(node, (n) => {
        if (n.kind === "lit") {
          expect(n.litType).not.toBe("null");
          expect(n.litType).not.toBe("undefined");
        }
      });
    }
  });

});

// Minimal walker for the union of ExprNode shapes used in this test.
function walkExprNode(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (key === "span" || key === "value") continue;
    if (Array.isArray(child)) {
      for (const item of child) walkExprNode(item, visit);
    } else if (child && typeof child === "object") {
      walkExprNode(child, visit);
    }
  }
}
