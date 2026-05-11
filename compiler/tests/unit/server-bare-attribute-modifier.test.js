/**
 * S83 Bug 1 — V5-strict bare-attribute `server` modifier on state-decl
 *
 * Tests for the V5-strict canonical form `<users server> = []` parsed by
 * the AST builder (TAB stage). This is the V5-strict structural-form
 * counterpart to the legacy `server @users = []` keyword-prefix path
 * (covered by state-authority-parsing.test.js).
 *
 * The bug: `scanStructuralDeclLookahead` (ast-builder.js) only recognised
 * the IDENT-shaped `pinned` bareword modifier. `server` tokenises as
 * KEYWORD (tokenizer.ts:55), so the V5-strict `<users server>` form
 * hit the KEYWORD-falls-through path and `return null`-ed — the entire
 * structural decl declined and fell back to html-fragment text capture.
 * Symbol-table registered zero state cells; the typer then fired false
 * E-SCOPE-001 on every `@var` reference downstream.
 *
 * Fix: KEYWORD `server` bareword branch parallel to IDENT `pinned`
 * branch; thread `server` through scan return shapes; map
 * `scan.server → node.isServer` mirroring the legacy keyword-prefix path
 * (ast-builder.js:4079) so type-system (type-system.ts:4578+) reads
 * `isServer` identically.
 *
 * SPEC anchors:
 * - §6.13 line 5087/5098 — E-DEBOUNCED-WITH-SERVER uses `<x server>` notation
 * - §34 row E-DEBOUNCED-WITH-SERVER (line 14659)
 * - §52.4.1 — legacy `server @x` form (preserved)
 * - primer §4 line 100 — `<x server>` cells as canonical surface
 *
 * §1  AST: `<users server> = []` → state-decl with isServer:true, name:'users', structuralForm:true
 * §2  AST: bareword `server` survives sibling decl — `<users server> = []` followed by `<name> = ""` produces BOTH state-decls (regression — pre-fix, the entire block fell to html-fragment)
 * §3  AST: non-server structural decl `<users> = []` has NO isServer field (default state preserved)
 * §4  AST: shape-1 `<count server> = 0` produces isServer:true plain state-decl
 * §5  AST: regression — legacy `server @x = init` still parses with isServer:true (no regression on existing path)
 * §6  AST: typed `<users server>: User[] = []` carries isServer:true + typeAnnotation
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers (parallel to state-authority-parsing.test.js)
// ---------------------------------------------------------------------------

function parseSource(source, filePath = "/test/app.scrml") {
  const bsResult = splitBlocks(filePath, source);
  const tabResult = buildAST(bsResult);
  return tabResult;
}

function parseLogicBlock(logicSource) {
  const source = `<div>${logicSource}</div>`;
  const { ast } = parseSource(source);
  const divNode = ast.nodes.find(n => n.kind === "markup" && n.tag === "div");
  if (!divNode) return [];
  const logicChild = divNode.children.find(n => n.kind === "logic");
  if (!logicChild) return [];
  return logicChild.body || [];
}

// ---------------------------------------------------------------------------
// §1 — `<users server> = []` → state-decl isServer:true, name:'users'
// ---------------------------------------------------------------------------

describe("s83-b1 §1: <users server> = [] → state-decl isServer:true", () => {
  test("produces a state-decl node (NOT html-fragment)", () => {
    const nodes = parseLogicBlock(`\${ <users server> = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl");
    expect(decl).toBeDefined();
    // Pre-fix this would have been an html-fragment swallowing the
    // entire block as raw text.
    const frag = nodes.find(n => n.kind === "html-fragment");
    expect(frag).toBeUndefined();
  });

  test("state-decl has isServer:true", () => {
    const nodes = parseLogicBlock(`\${ <users server> = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl");
    expect(decl).toBeDefined();
    expect(decl.isServer).toBe(true);
  });

  test("state-decl name is 'users' (not 'server'); structuralForm:true; shape:'plain'", () => {
    const nodes = parseLogicBlock(`\${ <users server> = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.isServer === true);
    expect(decl).toBeDefined();
    expect(decl.name).toBe("users");
    expect(decl.structuralForm).toBe(true);
    expect(decl.shape).toBe("plain");
  });

  test("state-decl init contains '[]'", () => {
    const nodes = parseLogicBlock(`\${ <users server> = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.isServer === true);
    expect(decl).toBeDefined();
    expect(decl.init).toMatch(/\[\s*\]/);
  });
});

// ---------------------------------------------------------------------------
// §2 — Sibling decl regression: bareword `server` no longer swallows downstream
// ---------------------------------------------------------------------------

describe("s83-b1 §2: <users server> = [] followed by <name> = \"\" → BOTH state-decls registered (regression)", () => {
  test("two state-decls produced in the logic block", () => {
    const nodes = parseLogicBlock(`\${
      <users server> = []
      <name> = ""
    }`);
    const decls = nodes.filter(n => n.kind === "state-decl");
    expect(decls.length).toBe(2);
  });

  test("first decl is 'users' with isServer:true", () => {
    const nodes = parseLogicBlock(`\${
      <users server> = []
      <name> = ""
    }`);
    const decls = nodes.filter(n => n.kind === "state-decl");
    const usersDecl = decls.find(d => d.name === "users");
    expect(usersDecl).toBeDefined();
    expect(usersDecl.isServer).toBe(true);
  });

  test("second decl is 'name' WITHOUT isServer (client-local default)", () => {
    const nodes = parseLogicBlock(`\${
      <users server> = []
      <name> = ""
    }`);
    const decls = nodes.filter(n => n.kind === "state-decl");
    const nameDecl = decls.find(d => d.name === "name");
    expect(nameDecl).toBeDefined();
    // Pre-fix, this decl never existed — the whole block fell to html-fragment.
    expect(nameDecl.isServer).toBeUndefined();
  });

  test("NO html-fragment swallow (pre-fix failure mode)", () => {
    const nodes = parseLogicBlock(`\${
      <users server> = []
      <name> = ""
    }`);
    const frags = nodes.filter(n => n.kind === "html-fragment");
    expect(frags.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 — Plain structural decl WITHOUT `server` has no isServer field
// ---------------------------------------------------------------------------

describe("s83-b1 §3: <users> = [] (no server) → state-decl WITHOUT isServer", () => {
  test("regular V5-strict decl produces state-decl", () => {
    const nodes = parseLogicBlock(`\${ <users> = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.name === "users");
    expect(decl).toBeDefined();
  });

  test("isServer field is absent (client-local default)", () => {
    const nodes = parseLogicBlock(`\${ <users> = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.name === "users");
    expect(decl).toBeDefined();
    expect(decl.isServer).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §4 — Shape 1 plain reactive cell with `server` modifier
// ---------------------------------------------------------------------------

describe("s83-b1 §4: <count server> = 0 → Shape 1 plain isServer:true", () => {
  test("produces state-decl with isServer:true and shape:'plain'", () => {
    const nodes = parseLogicBlock(`\${ <count server> = 0 }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.name === "count");
    expect(decl).toBeDefined();
    expect(decl.isServer).toBe(true);
    expect(decl.shape).toBe("plain");
    expect(decl.structuralForm).toBe(true);
  });

  test("init contains '0'", () => {
    const nodes = parseLogicBlock(`\${ <count server> = 0 }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.isServer === true);
    expect(decl).toBeDefined();
    expect(decl.init).toContain("0");
  });
});

// ---------------------------------------------------------------------------
// §5 — Regression: legacy `server @x = init` keyword-prefix path unchanged
// ---------------------------------------------------------------------------

describe("s83-b1 §5: legacy `server @users = []` still parses with isServer:true (no regression)", () => {
  test("legacy keyword-prefix form produces isServer:true state-decl", () => {
    const nodes = parseLogicBlock(`\${ server @users = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.name === "users");
    expect(decl).toBeDefined();
    expect(decl.isServer).toBe(true);
  });

  test("legacy form has structuralForm:false (it's the @-form path, not V5-strict)", () => {
    const nodes = parseLogicBlock(`\${ server @users = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.name === "users");
    expect(decl).toBeDefined();
    // The keyword-prefix path (ast-builder.js:4062-4087) sets
    // structuralForm:false because it consumes the @-form, not the
    // structural <NAME> form.
    expect(decl.structuralForm).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §6 — Typed V5-strict: `<users server>: User[] = []`
// ---------------------------------------------------------------------------

describe("s83-b1 §6: <users server>: User[] = [] → typed Shape 1 isServer:true + typeAnnotation", () => {
  test("typed-decl with server modifier produces isServer:true", () => {
    const nodes = parseLogicBlock(`\${ <users server>: User[] = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.name === "users");
    expect(decl).toBeDefined();
    expect(decl.isServer).toBe(true);
  });

  test("typeAnnotation is captured ('User[]')", () => {
    const nodes = parseLogicBlock(`\${ <users server>: User[] = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.name === "users");
    expect(decl).toBeDefined();
    // collectTypeAnnotation captures the type expression text. Be lenient
    // on whitespace and exact format — assert the type substring is
    // present somewhere in the annotation.
    expect(decl.typeAnnotation).toBeDefined();
    const annStr = typeof decl.typeAnnotation === "string"
      ? decl.typeAnnotation
      : JSON.stringify(decl.typeAnnotation);
    expect(annStr).toContain("User");
  });

  test("structuralForm:true on typed V5-strict decl", () => {
    const nodes = parseLogicBlock(`\${ <users server>: User[] = [] }`);
    const decl = nodes.find(n => n.kind === "state-decl" && n.name === "users");
    expect(decl).toBeDefined();
    expect(decl.structuralForm).toBe(true);
  });
});
