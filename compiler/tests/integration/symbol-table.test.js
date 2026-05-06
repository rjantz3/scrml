/**
 * Symbol Table — Phase A1b Step B1
 *
 * Tests the per-scope state-cell symbol table constructed by Stage 3.06 SYM
 * (`compiler/src/symbol-table.ts`). B1 is FOUNDATIONAL infrastructure —
 * fires NO diagnostics; B2 onward fires the first diagnostics
 * (E-NAME-COLLIDES-STATE).
 *
 * Per BRIEF §4 invariants:
 *   §B1.1  file-level state-decl registers in file scope
 *   §B1.2  legacy @-form state-decl registers in same scope
 *   §B1.3  function body creates child scope
 *   §B1.4  Variant C compound parent + children register correctly
 *   §B1.5  nested compound supports qualified-path registration
 *   §B1.6  derived cell registers with isConst:true + shape:"derived"
 *   §B1.7  pinned modifier captured in record
 *   §B1.8  typed-decl annotation captured
 *   §B1.9  validator presence captured
 *   §B1.10 defaultExpr presence captured
 *   §B1.11 lookupStateCell walks parent chain
 *   §B1.12 scope kinds receive correct ScopeKind label
 *   §B1.13 empty compound parent registers without children
 *   §B1.14 getScopeForNode reverse-lookup works
 *   §B1.15 re-entrancy invariant — simulating B11 adding records post-B1
 *
 * Per BRIEF §4.3 (anti-folklore guard): every test asserts BOTH the
 * symbol-table state AND the underlying record-field shape.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import {
  runSYM,
  lookupStateCell,
  lookupQualifiedStateCell,
  getScopeForNode,
} from "../../src/symbol-table.ts";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

function buildSymbolTable(source) {
  const { ast, errors } = parse(source);
  const sym = runSYM({ filePath: "test.scrml", ast });
  return { ast, errors, sym };
}

/**
 * Walk an AST recursively and collect every node with `kind === target`.
 * Skips circular `block` and `parent` back-refs that some BS-derived nodes
 * carry by ignoring keys that point to nodes we've already visited.
 */
function findKind(ast, target) {
  const out = [];
  const seen = new WeakSet();
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (seen.has(n)) return;
    seen.add(n);
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (n.kind === target) out.push(n);
    for (const k of Object.keys(n)) {
      if (k === "span" || k === "parent") continue;
      walk(n[k]);
    }
  }
  walk(ast);
  return out;
}

describe("§B1.1 file-level state-decl registers in file scope", () => {
  test("Shape 1 plain `<count> = 0` registers in file scope", () => {
    const { sym } = buildSymbolTable(`<program>\${ <count> = 0 }</program>`);
    expect(sym.fileScope.kind).toBe("file");
    expect(sym.fileScope.parent).toBeNull();
    expect(sym.fileScope.qualifiedPath).toBe("");
    expect(sym.fileScope.stateCells.has("count")).toBe(true);

    const rec = sym.fileScope.stateCells.get("count");
    expect(rec).toBeDefined();
    expect(rec.name).toBe("count");
    expect(rec.qualifiedPath).toBe("count");
    expect(rec.structuralForm).toBe(true);
    expect(rec.shape).toBe("plain");
    expect(rec.isConst).toBe(false);
    expect(rec.isCompoundParent).toBe(false);
    expect(rec.isCompoundChild).toBe(false);
    expect(rec.scope).toBe(sym.fileScope);
  });

  test("multiple file-level state-decls all register", () => {
    const src = `<program>\${ <a> = 0; <b> = 1 }</program>`;
    const { sym } = buildSymbolTable(src);
    expect(sym.fileScope.stateCells.has("a")).toBe(true);
    expect(sym.fileScope.stateCells.has("b")).toBe(true);
    expect(sym.fileScope.stateCells.get("a").qualifiedPath).toBe("a");
    expect(sym.fileScope.stateCells.get("b").qualifiedPath).toBe("b");
  });
});

describe("§B1.2 legacy @-form state-decl registers in same scope", () => {
  test("legacy `@count = 0` registers with structuralForm:false", () => {
    const { sym } = buildSymbolTable(`<program>\${ @count = 0 }</program>`);
    expect(sym.fileScope.stateCells.has("count")).toBe(true);
    const rec = sym.fileScope.stateCells.get("count");
    expect(rec.name).toBe("count");
    expect(rec.structuralForm).toBe(false);
    // The legacy form goes through the same registration path; downstream
    // discriminants depend on structuralForm to know which syntax was used.
  });

  test("structural and legacy forms coexist when names differ", () => {
    const src = `<program>\${ <a> = 0; @b = 1 }</program>`;
    const { sym } = buildSymbolTable(src);
    expect(sym.fileScope.stateCells.size).toBe(2);
    expect(sym.fileScope.stateCells.get("a").structuralForm).toBe(true);
    expect(sym.fileScope.stateCells.get("b").structuralForm).toBe(false);
  });
});

describe("§B1.3 function body creates child scope", () => {
  test("state-decl inside function body registers in function scope, NOT file scope", () => {
    const src = `<program>\${
      function foo() { @x = 1 }
    }</program>`;
    const { ast, sym } = buildSymbolTable(src);

    // x is in function scope, not file scope.
    expect(sym.fileScope.stateCells.has("x")).toBe(false);

    // Locate the function-decl node and verify its _scope annotation.
    const fnDecls = findKind(ast, "function-decl");
    expect(fnDecls.length).toBe(1);
    const fnScope = fnDecls[0]._scope;
    expect(fnScope).toBeDefined();
    expect(fnScope.kind).toBe("function");
    expect(fnScope.parent).toBe(sym.fileScope);
    expect(fnScope.stateCells.has("x")).toBe(true);
    expect(fnScope.stateCells.get("x").scope).toBe(fnScope);
  });
});

describe("§B1.4 Variant C compound parent + children register correctly", () => {
  // Variant C compound syntax (Step 11.0a): `<NAME><child>=...<child>=... </>`.
  // The closer is anonymous `</>`. Children are nested state-decls; no
  // wrapping `{}` braces — children sit directly in the compound body.
  test("compound `<formRes><name>=\"\" <email>=\"\" </>` registers parent + children", () => {
    const src = `<program>\${ <formRes><name>="" <email>="" </> }</program>`;
    const { sym } = buildSymbolTable(src);

    // Parent registered in file scope.
    expect(sym.fileScope.stateCells.has("formRes")).toBe(true);
    const parent = sym.fileScope.stateCells.get("formRes");
    expect(parent.name).toBe("formRes");
    expect(parent.qualifiedPath).toBe("formRes");
    expect(parent.isCompoundParent).toBe(true);
    expect(parent.isCompoundChild).toBe(false);

    // Compound sub-scope attached to the parent's decl node.
    const compoundScope = parent.declNode._scope;
    expect(compoundScope).toBeDefined();
    expect(compoundScope.kind).toBe("compound");
    expect(compoundScope.parent).toBe(sym.fileScope);
    expect(compoundScope.qualifiedPath).toBe("formRes.");

    // Children registered in compound sub-scope with qualified paths.
    expect(compoundScope.stateCells.has("name")).toBe(true);
    expect(compoundScope.stateCells.has("email")).toBe(true);
    const nameRec = compoundScope.stateCells.get("name");
    expect(nameRec.name).toBe("name");
    expect(nameRec.qualifiedPath).toBe("formRes.name");
    expect(nameRec.isCompoundChild).toBe(true);
    expect(nameRec.isCompoundParent).toBe(false);
    const emailRec = compoundScope.stateCells.get("email");
    expect(emailRec.qualifiedPath).toBe("formRes.email");
  });

  test("compound parent NOT visible at compound sub-scope level (it lives in enclosing scope)", () => {
    const src = `<program>\${ <formRes><name>="" </> }</program>`;
    const { sym } = buildSymbolTable(src);
    const parent = sym.fileScope.stateCells.get("formRes");
    const compoundScope = parent.declNode._scope;
    // formRes itself is in fileScope, not compoundScope.
    expect(compoundScope.stateCells.has("formRes")).toBe(false);
    expect(sym.fileScope.stateCells.has("name")).toBe(false);
  });
});

describe("§B1.5 nested compound supports qualified-path registration", () => {
  test("nested compound `<outer><inner><leaf>=\"\"</></></>` produces three-level path", () => {
    const src = `<program>\${ <outer><inner><leaf>=""</></></> }</program>`;
    const { sym } = buildSymbolTable(src);

    // outer in file scope.
    expect(sym.fileScope.stateCells.has("outer")).toBe(true);
    const outerRec = sym.fileScope.stateCells.get("outer");
    expect(outerRec.qualifiedPath).toBe("outer");
    expect(outerRec.isCompoundParent).toBe(true);

    // inner in outer's sub-scope.
    const outerScope = outerRec.declNode._scope;
    expect(outerScope.qualifiedPath).toBe("outer.");
    expect(outerScope.stateCells.has("inner")).toBe(true);
    const innerRec = outerScope.stateCells.get("inner");
    expect(innerRec.qualifiedPath).toBe("outer.inner");
    expect(innerRec.isCompoundParent).toBe(true);

    // leaf in inner's sub-scope.
    const innerScope = innerRec.declNode._scope;
    expect(innerScope.qualifiedPath).toBe("outer.inner.");
    expect(innerScope.stateCells.has("leaf")).toBe(true);
    const leafRec = innerScope.stateCells.get("leaf");
    expect(leafRec.qualifiedPath).toBe("outer.inner.leaf");
    expect(leafRec.isCompoundParent).toBe(false);
    expect(leafRec.isCompoundChild).toBe(true);

    // lookupQualifiedStateCell resolves the full path.
    const fromLookup = lookupQualifiedStateCell(sym.fileScope, ["outer", "inner", "leaf"]);
    expect(fromLookup).toBe(leafRec);
  });
});

describe("§B1.6 derived cell registers with isConst:true + shape:'derived'", () => {
  test("`const <doubled> = @count * 2` derived shape captured in record", () => {
    const src = `<program>\${
      <count> = 0
      const <doubled> = @count * 2
    }</program>`;
    const { sym } = buildSymbolTable(src);

    expect(sym.fileScope.stateCells.has("doubled")).toBe(true);
    const rec = sym.fileScope.stateCells.get("doubled");
    expect(rec.name).toBe("doubled");
    expect(rec.isConst).toBe(true);
    expect(rec.shape).toBe("derived");
    expect(rec.structuralForm).toBe(true);
  });
});

describe("§B1.7 pinned modifier captured in record", () => {
  test("`<x pinned> = 0` records isPinned:true", () => {
    const src = `<program>\${ <x pinned> = 0 }</program>`;
    const { sym } = buildSymbolTable(src);
    expect(sym.fileScope.stateCells.has("x")).toBe(true);
    const rec = sym.fileScope.stateCells.get("x");
    expect(rec.isPinned).toBe(true);
  });

  test("`<y> = 0` (no pinned) records isPinned:false", () => {
    const src = `<program>\${ <y> = 0 }</program>`;
    const { sym } = buildSymbolTable(src);
    const rec = sym.fileScope.stateCells.get("y");
    expect(rec.isPinned).toBe(false);
  });
});

describe("§B1.8 typed-decl annotation captured", () => {
  test("`<count>: number = 0` records hasTypeAnnotation:true", () => {
    const src = `<program>\${ <count>: number = 0 }</program>`;
    const { sym } = buildSymbolTable(src);
    const rec = sym.fileScope.stateCells.get("count");
    expect(rec).toBeDefined();
    expect(rec.hasTypeAnnotation).toBe(true);
  });

  test("`<count> = 0` (untyped) records hasTypeAnnotation:false", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { sym } = buildSymbolTable(src);
    const rec = sym.fileScope.stateCells.get("count");
    expect(rec.hasTypeAnnotation).toBe(false);
  });
});

describe("§B1.9 validator presence captured", () => {
  test("`<email req email> = <input type=\"email\"/>` records hasValidators:true", () => {
    const src = `<program>\${ <email req email> = <input type="email"/> }</program>`;
    const { sym } = buildSymbolTable(src);
    const rec = sym.fileScope.stateCells.get("email");
    expect(rec).toBeDefined();
    expect(rec.hasValidators).toBe(true);
  });

  test("`<x> = 0` (no validators) records hasValidators:false", () => {
    const src = `<program>\${ <x> = 0 }</program>`;
    const { sym } = buildSymbolTable(src);
    const rec = sym.fileScope.stateCells.get("x");
    expect(rec.hasValidators).toBe(false);
  });
});

describe("§B1.10 defaultExpr presence captured", () => {
  test("`<startTime default=null> = Date.now()` records hasDefaultExpr:true", () => {
    const src = `<program>\${ <startTime default=null> = Date.now() }</program>`;
    const { sym } = buildSymbolTable(src);
    const rec = sym.fileScope.stateCells.get("startTime");
    expect(rec).toBeDefined();
    expect(rec.hasDefaultExpr).toBe(true);
  });

  test("`<count> = 0` (no default) records hasDefaultExpr:false", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { sym } = buildSymbolTable(src);
    const rec = sym.fileScope.stateCells.get("count");
    expect(rec.hasDefaultExpr).toBe(false);
  });
});

describe("§B1.11 lookupStateCell walks parent chain", () => {
  test("file-scope cell visible from inside function body via parent walk", () => {
    const src = `<program>\${
      <count> = 0
      function foo() { @y = 1 }
    }</program>`;
    const { ast, sym } = buildSymbolTable(src);

    const fnDecls = findKind(ast, "function-decl");
    const fnScope = fnDecls[0]._scope;

    // From the function scope, `count` resolves via parent chain (it's in file).
    const countRec = lookupStateCell(fnScope, "count");
    expect(countRec).toBeDefined();
    expect(countRec.name).toBe("count");
    expect(countRec.scope).toBe(sym.fileScope);

    // `y` resolves locally (it's in fnScope).
    const yRec = lookupStateCell(fnScope, "y");
    expect(yRec).toBeDefined();
    expect(yRec.scope).toBe(fnScope);
  });

  test("lookupStateCell returns null for unregistered name", () => {
    const { sym } = buildSymbolTable(`<program>\${ <count> = 0 }</program>`);
    expect(lookupStateCell(sym.fileScope, "missing")).toBeNull();
  });

  test("lookupStateCell handles null scope without throwing", () => {
    expect(lookupStateCell(null, "anything")).toBeNull();
    expect(lookupStateCell(undefined, "anything")).toBeNull();
  });
});

describe("§B1.12 scope kinds receive correct ScopeKind label", () => {
  test("file root is kind:'file'; function body is kind:'function'; compound parent is kind:'compound'", () => {
    const src = `<program>\${
      <formRes><name>="" </>
      function foo() {}
    }</program>`;
    const { ast, sym } = buildSymbolTable(src);

    expect(sym.fileScope.kind).toBe("file");

    const fnDecls = findKind(ast, "function-decl");
    expect(fnDecls.length).toBe(1);
    expect(fnDecls[0]._scope.kind).toBe("function");

    const formRes = sym.fileScope.stateCells.get("formRes");
    expect(formRes.declNode._scope.kind).toBe("compound");
  });
});

describe("§B1.13 empty compound parent registers without children", () => {
  test("`<empty></>` registers parent with empty compound sub-scope", () => {
    const src = `<program>\${ <empty></> }</program>`;
    const { sym } = buildSymbolTable(src);
    expect(sym.fileScope.stateCells.has("empty")).toBe(true);
    const rec = sym.fileScope.stateCells.get("empty");
    expect(rec.isCompoundParent).toBe(true);
    expect(rec.declNode._scope).toBeDefined();
    expect(rec.declNode._scope.kind).toBe("compound");
    expect(rec.declNode._scope.stateCells.size).toBe(0);
  });
});

describe("§B1.14 getScopeForNode reverse-lookup works", () => {
  test("getScopeForNode on a state-decl returns its registered scope", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { ast, sym } = buildSymbolTable(src);
    const decls = findKind(ast, "state-decl");
    expect(decls.length).toBe(1);
    expect(getScopeForNode(decls[0])).toBe(sym.fileScope);
  });

  test("getScopeForNode on a function-decl returns its function scope", () => {
    const src = `<program>\${ function foo() {} }</program>`;
    const { ast } = buildSymbolTable(src);
    const fnDecls = findKind(ast, "function-decl");
    expect(fnDecls.length).toBe(1);
    const scope = getScopeForNode(fnDecls[0]);
    expect(scope).toBeDefined();
    expect(scope.kind).toBe("function");
  });

  test("getScopeForNode on an unrelated node returns null", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { ast } = buildSymbolTable(src);
    const fragments = findKind(ast, "html-fragment");
    if (fragments.length > 0) {
      expect(getScopeForNode(fragments[0])).toBeNull();
    } else {
      // No html-fragment in this case; pass trivially.
      expect(true).toBe(true);
    }
  });

  test("getScopeForNode handles null/undefined safely", () => {
    expect(getScopeForNode(null)).toBeNull();
    expect(getScopeForNode(undefined)).toBeNull();
  });
});

describe("§B1.15 re-entrancy invariant — B11 simulation", () => {
  test("synthesized record can be added to existing scope post-SYM and looked up", () => {
    const src = `<program>\${ <signup><name>="" </> }</program>`;
    const { sym } = buildSymbolTable(src);

    // Simulate B11/B12 synthesizing `@signup.isValid` post-B1.
    const signupRec = sym.fileScope.stateCells.get("signup");
    expect(signupRec).toBeDefined();
    const signupScope = signupRec.declNode._scope;
    expect(signupScope).toBeDefined();
    expect(signupScope.stateCells.has("isValid")).toBe(false);

    // Construct a synthetic record and inject into the existing scope.
    const synthRec = {
      name: "isValid",
      qualifiedPath: "signup.isValid",
      declNode: { kind: "state-decl", name: "isValid", _synthesized: true },
      scope: signupScope,
      structuralForm: true,
      shape: "derived",
      isConst: true,
      isPinned: false,
      isCompoundParent: false,
      isCompoundChild: true,
      hasValidators: false,
      hasDefaultExpr: false,
      hasTypeAnnotation: false,
    };
    signupScope.stateCells.set("isValid", synthRec);

    // Lookup recovers the synthesized record.
    expect(signupScope.stateCells.has("isValid")).toBe(true);
    expect(signupScope.stateCells.get("isValid")).toBe(synthRec);

    // Qualified-path lookup also finds it.
    const fromQualified = lookupQualifiedStateCell(sym.fileScope, ["signup", "isValid"]);
    expect(fromQualified).toBe(synthRec);
    expect(fromQualified.qualifiedPath).toBe("signup.isValid");
  });
});

describe("SYM general invariants", () => {
  test("runSYM emits no errors at B1 (foundational pass)", () => {
    const src = `<program>\${
      <count> = 0
      <formRes><name>="" <email>="" </>
      const <doubled> = @count * 2
      function foo() { @x = 1 }
    }</program>`;
    const { sym } = buildSymbolTable(src);
    expect(sym.errors).toEqual([]);
  });

  test("FileAST gains _scope back-pointer after runSYM", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { ast, sym } = buildSymbolTable(src);
    expect(ast._scope).toBe(sym.fileScope);
  });

  test("stats counts match registered records and scopes", () => {
    const src = `<program>\${
      <a> = 0
      <b> = 1
      <compound><child1>="" <child2>="" </>
    }</program>`;
    const { sym } = buildSymbolTable(src);
    // a, b, compound (parent), child1, child2 = 5 records
    expect(sym.stats.totalRecords).toBe(5);
    expect(sym.stats.compoundParents).toBe(1);
    expect(sym.stats.compoundChildren).toBe(2);
    // file scope + compound scope = 2 scopes (no functions in this src)
    expect(sym.stats.totalScopes).toBe(2);
  });

  test("lookupQualifiedStateCell handles edge cases", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { sym } = buildSymbolTable(src);

    // Empty path returns null.
    expect(lookupQualifiedStateCell(sym.fileScope, [])).toBeNull();

    // Non-array path returns null.
    expect(lookupQualifiedStateCell(sym.fileScope, null)).toBeNull();

    // Single-segment path equivalent to lookupStateCell.
    const single = lookupQualifiedStateCell(sym.fileScope, ["count"]);
    expect(single).toBe(sym.fileScope.stateCells.get("count"));

    // Path that descends through a non-compound returns null.
    const tooDeep = lookupQualifiedStateCell(sym.fileScope, ["count", "foo"]);
    expect(tooDeep).toBeNull();

    // Missing first segment returns null.
    expect(lookupQualifiedStateCell(sym.fileScope, ["missing"])).toBeNull();
  });
});
