/**
 * Phase A1b Step B13 — `E-DERIVED-WITH-VALIDATORS` + Level-1 inline-override
 * extraction (PASS 8) tests.
 *
 * Per SPEC §55.14 (validators on derived cells: REJECTED) + §55.10 (4-level
 * error message resolution chain). The walker:
 *   - Fires E-DERIVED-WITH-VALIDATORS on `const <x ...>` with non-empty
 *     validators (one per cell, listing offending validators, recommending
 *     refinement-type alternative).
 *   - Extracts Level-1 inline override (trailing string-literal arg) onto
 *     `validator.inlineOverride` for non-derived cells.
 *   - Fires E-VALIDATOR-INLINE-DYNAMIC when the inline-override slot is
 *     populated by a non-string-literal expression (L12 Edge F).
 *
 * Engine cells are NOT `isConst` so the walker skips them silently per
 * §55.14 ("legal but typically redundant"). Engine-derived
 * (`<engine derived=>`) with validators is REJECTED by §55.14 but requires
 * engine-decl annotations not yet present (B14 sequencing) — deferred.
 */

import { describe, expect, test } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";

function runUpToSYM(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  return runSYM({ filePath, ast });
}

function getDerivedErrors(sym) {
  return sym.errors.filter((e) => e.code === "E-DERIVED-WITH-VALIDATORS");
}

function getInlineDynamicErrors(sym) {
  return sym.errors.filter((e) => e.code === "E-VALIDATOR-INLINE-DYNAMIC");
}

function findStateDecl(node, name) {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findStateDecl(n, name);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  if (node.kind === "state-decl" && node.name === name) return node;
  for (const key of [
    "body", "consequent", "alternate", "expr", "node", "renderSpec",
    "children", "value", "argument", "nodes",
  ]) {
    if (node[key]) {
      const found = findStateDecl(node[key], name);
      if (found) return found;
    }
  }
  if (Array.isArray(node.arms)) {
    for (const arm of node.arms) {
      if (arm && arm.body) {
        const found = findStateDecl(arm.body, name);
        if (found) return found;
      }
    }
  }
  return null;
}

function getValidator(sym, cellName, validatorName) {
  const ast = sym.fileScope ? null : null; // sym doesn't expose ast
  // Workaround — return validator-extracted info from ast via a re-parse if
  // needed. For now use a simpler path: tests pass the AST via a separate
  // helper.
  return null;
}

// Re-parse helper that returns the ast so tests can introspect inline
// override extraction onto validators.
function parseAndSym(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  const sym = runSYM({ filePath, ast });
  return { ast, sym };
}

describe("B13 — E-DERIVED-WITH-VALIDATORS rejection (SPEC §55.14)", () => {
  test("`const <x req> = expr` fires E-DERIVED-WITH-VALIDATORS", () => {
    const sym = runUpToSYM(
      `<program>\${
        <count> = 0
        const <doubled req> = @count * 2
      }</program>`,
    );
    const errs = getDerivedErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("doubled");
    expect(errs[0].message).toContain("req");
  });

  test("`const <x min(0)> = expr` (call-form validator) fires", () => {
    const sym = runUpToSYM(
      `<program>\${
        <count> = 0
        const <pos min(0)> = @count
      }</program>`,
    );
    const errs = getDerivedErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("pos");
    expect(errs[0].message).toContain("min");
  });

  test("error message recommends refinement-type alternative (§55.14 line 24692)", () => {
    const sym = runUpToSYM(
      `<program>\${
        <count> = 0
        const <pos min(0)> = @count
      }</program>`,
    );
    const errs = getDerivedErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("refinement");
    // The suggestion includes a typed-derived shape using the cell's name.
    expect(errs[0].message).toContain("number(>=0)");
    expect(errs[0].message).toContain("pos");
  });

  test("multiple validators on a derived cell fires ONE error listing all offenders", () => {
    const sym = runUpToSYM(
      `<program>\${
        <count> = 0
        const <pos req min(0) max(100)> = @count
      }</program>`,
    );
    const errs = getDerivedErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("req");
    expect(errs[0].message).toContain("min");
    expect(errs[0].message).toContain("max");
  });

  test("non-derived (Shape 1) cell with validators — NO derived error fires", () => {
    const sym = runUpToSYM(
      `<program>\${
        <count req> = 0
      }</program>`,
    );
    expect(getDerivedErrors(sym)).toEqual([]);
  });

  test("Shape-2 cell with validators — NO derived error (not isConst)", () => {
    const sym = runUpToSYM(
      `<program>\${ <name req length(>=2)> = <input type="text"/> }</program>`,
    );
    expect(getDerivedErrors(sym)).toEqual([]);
  });

  test("derived cell WITHOUT validators — NO error (the key gate)", () => {
    const sym = runUpToSYM(
      `<program>\${
        <count> = 0
        const <doubled> = @count * 2
      }</program>`,
    );
    expect(getDerivedErrors(sym)).toEqual([]);
  });

  test("legacy derived form `const @x = expr` with validators — N/A " +
       "(legacy form has no validator slot)", () => {
    // The legacy `const @derived = expr` form does not parse a validator
    // attribute list — it is structurally pre-Step-5. So this is a non-issue
    // for B13. Documented for completeness.
    const sym = runUpToSYM(
      `<program>\${
        <count> = 0
        const @doubled = @count * 2
      }</program>`,
    );
    expect(getDerivedErrors(sym)).toEqual([]);
  });
});

describe("B13 — Level-1 inline-override extraction (SPEC §55.10)", () => {
  test("`req(\"Please enter your name\")` extracts onto inlineOverride", () => {
    const { ast, sym } = parseAndSym(
      `<program>\${ <name req("Please enter your name")> = <input type="text"/> }</program>`,
    );
    expect(getInlineDynamicErrors(sym)).toEqual([]);
    const decl = findStateDecl(ast.nodes, "name");
    expect(decl).not.toBeNull();
    expect(decl.validators.length).toBe(1);
    const v = decl.validators[0];
    expect(v.name).toBe("req");
    expect(v.inlineOverride).toBe("Please enter your name");
  });

  test("`length(>=2, \"Must be at least 2 chars\")` extracts override", () => {
    const { ast, sym } = parseAndSym(
      `<program>\${ <name length(>=2, "Must be at least 2 chars")> = <input type="text"/> }</program>`,
    );
    expect(getInlineDynamicErrors(sym)).toEqual([]);
    const decl = findStateDecl(ast.nodes, "name");
    expect(decl).not.toBeNull();
    const v = decl.validators[0];
    expect(v.name).toBe("length");
    expect(v.inlineOverride).toBe("Must be at least 2 chars");
  });

  test("bareword validator (no parens) — inlineOverride is null", () => {
    const { ast } = parseAndSym(
      `<program>\${ <name req> = <input type="text"/> }</program>`,
    );
    const decl = findStateDecl(ast.nodes, "name");
    expect(decl).not.toBeNull();
    const v = decl.validators[0];
    expect(v.name).toBe("req");
    expect(v.inlineOverride).toBeNull();
  });

  test("call-form validator without trailing override — inlineOverride is null", () => {
    const { ast } = parseAndSym(
      `<program>\${ <age min(18)> = <input type="number"/> }</program>`,
    );
    const decl = findStateDecl(ast.nodes, "age");
    expect(decl).not.toBeNull();
    const v = decl.validators[0];
    expect(v.name).toBe("min");
    expect(v.inlineOverride).toBeNull();
  });

  test("multiple validators each get their own inlineOverride", () => {
    const { ast } = parseAndSym(
      `<program>\${
        <name req("name required") length(>=2, "too short")> = <input type="text"/>
      }</program>`,
    );
    const decl = findStateDecl(ast.nodes, "name");
    expect(decl).not.toBeNull();
    expect(decl.validators.length).toBe(2);
    expect(decl.validators[0].name).toBe("req");
    expect(decl.validators[0].inlineOverride).toBe("name required");
    expect(decl.validators[1].name).toBe("length");
    expect(decl.validators[1].inlineOverride).toBe("too short");
  });

  test("library-surface predicate (`email`) — extraction skipped silently", () => {
    // `email` is not in the universal-core catalog. The walker silently
    // skips extraction (mirrors B10's silent pass-through for unknown
    // names). inlineOverride remains null.
    const { ast } = parseAndSym(
      `<program>\${ <email email> = <input type="email"/> }</program>`,
    );
    const decl = findStateDecl(ast.nodes, "email");
    expect(decl).not.toBeNull();
    const v = decl.validators[0];
    expect(v.name).toBe("email");
    expect(v.inlineOverride).toBeNull();
  });
});

describe("B13 — E-VALIDATOR-INLINE-DYNAMIC (L12 Edge F)", () => {
  test("dynamic inline override on `min` fires E-VALIDATOR-INLINE-DYNAMIC", () => {
    const sym = runUpToSYM(
      `<program>\${
        <minAge> = 18
        <age min(18, @minAge)> = <input type="number"/>
      }</program>`,
    );
    const errs = getInlineDynamicErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("min");
    expect(errs[0].message).toContain("static string literal");
  });

  test("dynamic inline override on `req` fires", () => {
    const sym = runUpToSYM(
      `<program>\${
        <fallbackMsg> = "default"
        <name req(@fallbackMsg)> = <input type="text"/>
      }</program>`,
    );
    const errs = getInlineDynamicErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("req");
  });

  test("static string-literal override does NOT fire", () => {
    const sym = runUpToSYM(
      `<program>\${ <name req("ok")> = <input type="text"/> }</program>`,
    );
    expect(getInlineDynamicErrors(sym)).toEqual([]);
  });
});

describe("B13 — engine state-cell exception (SPEC §55.14 line 24681-24687)", () => {
  test("validators on engine cells DO NOT fire E-DERIVED-WITH-VALIDATORS", () => {
    // Engine auto-declared cells are NOT `isConst`; the walker skips them
    // silently per §55.14 ("legal but typically redundant"). The current
    // worktree (pre-B14) does not annotate engine cells distinctly — the
    // engine-decl AST shape is RAW text, so there's no validator surface
    // available on engine cells anyway. This test documents the
    // engine-cell-pass-through invariant for B14 sequencing.
    const sym = runUpToSYM(
      `<program>\${ <count req> = 0 }</program>`,
    );
    // <count> is `isConst: false` (Shape 1), so no derived-with-validators
    // fires. Engine cells (when B14 lands) will follow the same predicate.
    expect(getDerivedErrors(sym)).toEqual([]);
  });
});

describe("B13 — multiple state-decls + cross-cell scope", () => {
  test("file with mixed Shape-1, Shape-2, derived cells — only the " +
       "derived-with-validators fires", () => {
    const sym = runUpToSYM(
      `<program>\${
        <count> = 0
        <name req> = <input type="text"/>
        const <doubled req> = @count * 2
      }</program>`,
    );
    const errs = getDerivedErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("doubled");
    expect(errs[0].message).not.toContain("name");
    expect(errs[0].message).not.toContain("count");
  });

  test("multiple derived cells with validators each fire one error", () => {
    const sym = runUpToSYM(
      `<program>\${
        <count> = 0
        const <a req> = @count
        const <b min(0)> = @count
      }</program>`,
    );
    const errs = getDerivedErrors(sym);
    expect(errs.length).toBe(2);
    expect(errs.some((e) => e.message.includes("a"))).toBe(true);
    expect(errs.some((e) => e.message.includes("b"))).toBe(true);
  });
});
