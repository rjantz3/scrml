/**
 * lit-not-detector-coordination — S90 M-7C-D-12 Track 1 (D-12.1c coord with D-12.1b).
 *
 * The PARSER (D-12.1b) manufactures `LitExpr { litType: "not", raw: "null" }`
 * for user-source `null` tokens. The DETECTOR (D-12.1c) must read the `raw`
 * field to fire E-SYNTAX-042. This test exercises the end-to-end path
 * through the gauntlet-phase3 walker directly to verify the contract.
 *
 * Coverage:
 *   1. New canonical shape (litType:"not", raw:"null"/"undefined")
 *      → fires E-SYNTAX-042.
 *   2. Legacy deprecated shape (litType:"null"/"undefined") still recognized
 *      (defensive — pre-S90 AST snapshots).
 *   3. Canonical scrml absence (litType:"not", raw:"not") does NOT fire.
 *   4. Synthetic absence operands (`x is not` / `is some` / `is not not`)
 *      do NOT trigger spurious E-SYNTAX-042.
 */

import { describe, test, expect } from "bun:test";
import { runGauntletPhase3EqChecks } from "../../src/gauntlet-phase3-eq-checks.js";

const FILE = "<coord-test>";
const span = (start = 0, end = 0) => ({ file: FILE, start, end, line: 1, col: 1 });

function makeAST(stmts) {
  // Wrap statements in a minimal FileAST shape recognized by the walker.
  return {
    filePath: FILE,
    nodes: [
      {
        kind: "logic",
        span: span(),
        body: stmts,
        imports: [],
        exports: [],
        typeDecls: [],
        components: [],
      },
    ],
  };
}

function letDecl(name, initExpr) {
  return { kind: "let-decl", name, initExpr, span: span() };
}

function lit(litType, raw, value = null) {
  return { kind: "lit", litType, raw, value, span: span() };
}

function ident(name) {
  return { kind: "ident", name, span: span() };
}

function bin(op, left, right) {
  return { kind: "binary", op, left, right, span: span() };
}

function getCodes(errors) {
  return errors.map(e => e.code).sort();
}

describe("D-12.1c — detector recognizes new canonical litType:'not' + raw discriminator", () => {

  // ---- New canonical shape ----

  test("`let x = lit{ litType:'not', raw:'null' }` (user-source null) → E-SYNTAX-042", () => {
    const ast = makeAST([letDecl("x", lit("not", "null"))]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).toContain("E-SYNTAX-042");
  });

  test("`let x = lit{ litType:'not', raw:'undefined' }` (user-source undefined) → E-SYNTAX-042", () => {
    const ast = makeAST([letDecl("x", lit("not", "undefined"))]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).toContain("E-SYNTAX-042");
  });

  // ---- Legacy deprecated shape (defensive backwards-compat) ----

  test("legacy lit{ litType:'null' } (pre-S90 AST) still fires E-SYNTAX-042", () => {
    const ast = makeAST([letDecl("x", lit("null", "null"))]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).toContain("E-SYNTAX-042");
  });

  test("legacy lit{ litType:'undefined' } (pre-S90 AST) still fires E-SYNTAX-042", () => {
    const ast = makeAST([letDecl("x", lit("undefined", "undefined"))]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).toContain("E-SYNTAX-042");
  });

  // ---- Canonical scrml absence (NOT forbidden) ----

  test("`let x = lit{ litType:'not', raw:'not' }` (scrml `not` keyword) does NOT fire E-SYNTAX-042", () => {
    const ast = makeAST([letDecl("x", lit("not", "not"))]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).not.toContain("E-SYNTAX-042");
  });

  test("empty-expression placeholder `lit{ litType:'not', raw:'' }` does NOT fire", () => {
    const ast = makeAST([letDecl("x", lit("not", ""))]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).not.toContain("E-SYNTAX-042");
  });

  // ---- Synthetic absence operands (suppression: is-not, is-some, is-not-not) ----

  test("synthetic `is-not` RHS (raw:'not') does NOT fire E-SYNTAX-042 even at binary op position", () => {
    // x is not — parser synthesizes binary{ op:"is-not", left:ident(x), right:lit{ litType:"not", raw:"not" } }
    const ast = makeAST([
      letDecl("y", bin("is-not", ident("x"), lit("not", "not"))),
    ]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).not.toContain("E-SYNTAX-042");
  });

  test("synthetic `is-some` RHS (raw:'not') does NOT fire E-SYNTAX-042", () => {
    const ast = makeAST([
      letDecl("y", bin("is-some", ident("x"), lit("not", "not"))),
    ]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).not.toContain("E-SYNTAX-042");
  });

  test("synthetic `is-not-not` RHS (raw:'not') does NOT fire E-SYNTAX-042", () => {
    const ast = makeAST([
      letDecl("y", bin("is-not-not", ident("x"), lit("not", "not"))),
    ]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).not.toContain("E-SYNTAX-042");
  });

  // ---- Identifier-path detection still works ----

  test("bare `undefined` identifier in value position → E-SYNTAX-042", () => {
    const ast = makeAST([letDecl("x", ident("undefined"))]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).toContain("E-SYNTAX-042");
  });

  test("bare `null` identifier in value position → E-SYNTAX-042", () => {
    const ast = makeAST([letDecl("x", ident("null"))]);
    const errors = runGauntletPhase3EqChecks({ ast, filePath: FILE });
    expect(getCodes(errors)).toContain("E-SYNTAX-042");
  });

});
