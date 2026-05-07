/**
 * Phase A1b Step B5 — cell classifier.
 *
 * Tests the PASS 4 walker added to Stage 3.06 SYM
 * (`compiler/src/symbol-table.ts`). For every registered `state-decl` AST
 * node, B5 stamps a non-enumerable `_cellKind` discriminant + `_isBindable`
 * boolean. Four cell kinds:
 *
 *   - `"plain"`           — Shape 1 (`<count> = 0`) or non-markup Shape 3
 *                           (`const <doubled> = @count * 2`).
 *   - `"bindable"`        — Shape 2 with `renderSpec.element.tag` ∈
 *                           {input, textarea, select} (canonical bindable
 *                           tag set per `codegen/emit-html.ts`).
 *   - `"markup-typed"`    — Shape 3 markup-RHS derived
 *                           (`const <badge> = <span>...</span>`) or any
 *                           non-bindable markup-RHS Shape 2 form.
 *   - `"compound-parent"` — Variant C compound parent (has `children[]`).
 *                           Compound children classify recursively as
 *                           standalone state-decls.
 *
 * Per A1b SCOPE-AND-DECOMPOSITION §4.6 line 230: B5 fires NO diagnostics —
 * it RECORDS classification on the AST. B6 (render-by-tag) and B7
 * (derived-cell DAG) consume the annotation.
 *
 * Test §B5.1  — Shape 1 plain: `<count> = 0` → "plain", _isBindable false
 * Test §B5.2  — Shape 2 input: `<userName req length(>=2)> = <input type="text"/>` → "bindable"
 * Test §B5.3  — Shape 2 checkbox: `<agree req> = <input type="checkbox"/>` → "bindable"
 * Test §B5.4  — Shape 2 textarea: `<bio> = <textarea/>` → "bindable"
 * Test §B5.5  — Shape 2 select: `<role> = <select>...</select>` → "bindable"
 * Test §B5.6  — Shape 3 markup-typed derived: `const <badge> = <span>...</span>` → "markup-typed"
 * Test §B5.7  — Shape 3 plain derived: `const <doubled> = @count * 2` → "plain"
 * Test §B5.8  — Variant C compound parent: `<formRes><name>="" <email>="" </>` → "compound-parent"
 *               with children classified recursively as plain.
 * Test §B5.9  — Round-trip read assertion via getCellKind / isCellBindable.
 * Test §B5.10 — No diagnostics fired (B5 RECORDS, doesn't FIRE).
 * Test §B5.11 — Mixed file: every state-decl gets a classified _cellKind annotation.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import {
  runSYM,
  getCellKind,
  isCellBindable,
} from "../../src/symbol-table.ts";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

function buildAndClassify(source) {
  const { ast, errors } = parse(source);
  const sym = runSYM({ filePath: "test.scrml", ast });
  return { ast, errors, sym };
}

/**
 * Walk the AST and collect every `state-decl` node with its classifier
 * annotations. Recurses into compound `children[]` so nested decls show up.
 */
function collectStateDecls(ast) {
  const found = [];
  const seen = new WeakSet();
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (seen.has(n)) return;
    seen.add(n);
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.kind === "state-decl") {
      found.push({
        name: n.name,
        cellKind: n._cellKind,
        isBindable: n._isBindable,
        node: n,
      });
      if (Array.isArray(n.children)) {
        n.children.forEach(walk);
      }
      return;
    }
    if (Array.isArray(n.children)) n.children.forEach(walk);
    if (Array.isArray(n.body)) n.body.forEach(walk);
    if (Array.isArray(n.consequent)) n.consequent.forEach(walk);
    if (Array.isArray(n.alternate)) n.alternate.forEach(walk);
    if (Array.isArray(n.arms)) n.arms.forEach((arm) => arm && Array.isArray(arm.body) && arm.body.forEach(walk));
    if (Array.isArray(n.nodes)) n.nodes.forEach(walk);
  }
  walk(ast);
  return found;
}

// ---------------------------------------------------------------------------
// §B5.1 — Shape 1 plain: <count> = 0
// ---------------------------------------------------------------------------

describe("§B5.1 Shape 1 plain — `<count> = 0` classifies as plain", () => {
  test("plain cellKind, _isBindable false", () => {
    const src = `<program>\${ <count> = 0 }<p>\${@count}</p></program>`;
    const { ast, sym } = buildAndClassify(src);
    expect(sym.errors.length).toBe(0);

    const decls = collectStateDecls(ast);
    const count = decls.find((d) => d.name === "count");
    expect(count).toBeDefined();
    expect(count.cellKind).toBe("plain");
    expect(count.isBindable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §B5.2 — Shape 2 input (text): bindable
// ---------------------------------------------------------------------------

describe("§B5.2 Shape 2 input(text) — bindable", () => {
  test("`<userName req length(>=2)> = <input type=\"text\"/>` classifies as bindable", () => {
    const src = `<program>\${ <userName req length(>=2)> = <input type="text"/> }</program>`;
    const { ast, sym } = buildAndClassify(src);
    expect(sym.errors.length).toBe(0);

    const decls = collectStateDecls(ast);
    const userName = decls.find((d) => d.name === "userName");
    expect(userName).toBeDefined();
    expect(userName.cellKind).toBe("bindable");
    expect(userName.isBindable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §B5.3 — Shape 2 input (checkbox): bindable
// ---------------------------------------------------------------------------

describe("§B5.3 Shape 2 input(checkbox) — bindable", () => {
  test("`<agree req> = <input type=\"checkbox\"/>` classifies as bindable", () => {
    const src = `<program>\${ <agree req> = <input type="checkbox"/> }</program>`;
    const { ast, sym } = buildAndClassify(src);
    expect(sym.errors.length).toBe(0);

    const decls = collectStateDecls(ast);
    const agree = decls.find((d) => d.name === "agree");
    expect(agree).toBeDefined();
    expect(agree.cellKind).toBe("bindable");
    expect(agree.isBindable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §B5.4 — Shape 2 textarea: bindable
// ---------------------------------------------------------------------------

describe("§B5.4 Shape 2 textarea — bindable", () => {
  test("`<bio> = <textarea/>` classifies as bindable", () => {
    const src = `<program>\${ <bio> = <textarea/> }</program>`;
    const { ast, sym } = buildAndClassify(src);
    expect(sym.errors.length).toBe(0);

    const decls = collectStateDecls(ast);
    const bio = decls.find((d) => d.name === "bio");
    expect(bio).toBeDefined();
    expect(bio.cellKind).toBe("bindable");
    expect(bio.isBindable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §B5.5 — Shape 2 select: bindable
// ---------------------------------------------------------------------------

describe("§B5.5 Shape 2 select — bindable", () => {
  test("`<role> = <select><option/></select>` classifies as bindable", () => {
    const src = `<program>\${ <role> = <select><option value="a"/><option value="b"/></select> }</program>`;
    const { ast, sym } = buildAndClassify(src);
    expect(sym.errors.length).toBe(0);

    const decls = collectStateDecls(ast);
    const role = decls.find((d) => d.name === "role");
    expect(role).toBeDefined();
    expect(role.cellKind).toBe("bindable");
    expect(role.isBindable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §B5.6 — Shape 3 markup-typed derived
// ---------------------------------------------------------------------------

describe("§B5.6 Shape 3 markup-typed derived — markup-typed", () => {
  test("`const <badge> = <span class=\"badge\">${@userName}</span>` classifies as markup-typed", () => {
    const src = `<program>\${ <userName> = <input type="text"/>; const <badge> = <span class="badge">\${@userName}</span> }</program>`;
    const { ast, sym } = buildAndClassify(src);
    expect(sym.errors.length).toBe(0);

    const decls = collectStateDecls(ast);
    const badge = decls.find((d) => d.name === "badge");
    expect(badge).toBeDefined();
    // const + renderSpec present → markup-typed (the discriminator A1a Step
    // 5 deferred to A1b per kickstarter-v2 smoke test §K11.2h).
    expect(badge.cellKind).toBe("markup-typed");
    expect(badge.isBindable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §B5.7 — Shape 3 plain derived (non-markup expression RHS)
// ---------------------------------------------------------------------------

describe("§B5.7 Shape 3 plain derived — plain", () => {
  test("`const <doubled> = @count * 2` classifies as plain", () => {
    const src = `<program>\${ <count> = 0; const <doubled> = @count * 2 }</program>`;
    const { ast, sym } = buildAndClassify(src);
    expect(sym.errors.length).toBe(0);

    const decls = collectStateDecls(ast);
    const doubled = decls.find((d) => d.name === "doubled");
    expect(doubled).toBeDefined();
    // No renderSpec on a non-markup derived → plain. B6 will fire
    // E-CELL-NO-RENDER-SPEC if `<doubled/>` appears in markup.
    expect(doubled.cellKind).toBe("plain");
    expect(doubled.isBindable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §B5.8 — Variant C compound parent + recursive children classification
// ---------------------------------------------------------------------------

describe("§B5.8 Variant C compound — compound-parent + recursive children", () => {
  test("`<formRes><name>=\"\" <email>=\"\" </>` parent + children classify", () => {
    const src = `<program>\${ <formRes><name>="" <email>="" </> }</program>`;
    const { ast, sym } = buildAndClassify(src);
    expect(sym.errors.length).toBe(0);

    const decls = collectStateDecls(ast);
    const parent = decls.find((d) => d.name === "formRes");
    expect(parent).toBeDefined();
    expect(parent.cellKind).toBe("compound-parent");
    expect(parent.isBindable).toBe(false);

    // Children classify as standalone state-decls in the compound sub-scope.
    const name = decls.find((d) => d.name === "name");
    const email = decls.find((d) => d.name === "email");
    expect(name).toBeDefined();
    expect(email).toBeDefined();
    expect(name.cellKind).toBe("plain");
    expect(email.cellKind).toBe("plain");
    expect(name.isBindable).toBe(false);
    expect(email.isBindable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §B5.9 — Round-trip read assertion via getCellKind / isCellBindable
// ---------------------------------------------------------------------------

describe("§B5.9 Public read API — getCellKind / isCellBindable round-trip", () => {
  test("getCellKind matches direct _cellKind read; isCellBindable matches _isBindable", () => {
    const src = `<program>\${ <count> = 0; <userName> = <input type="text"/> }</program>`;
    const { ast } = buildAndClassify(src);

    const decls = collectStateDecls(ast);
    const count = decls.find((d) => d.name === "count");
    const userName = decls.find((d) => d.name === "userName");

    expect(getCellKind(count.node)).toBe("plain");
    expect(getCellKind(userName.node)).toBe("bindable");
    expect(isCellBindable(count.node)).toBe(false);
    expect(isCellBindable(userName.node)).toBe(true);

    // Helper return-shape contract: undefined inputs → undefined.
    expect(getCellKind(null)).toBeUndefined();
    expect(getCellKind(undefined)).toBeUndefined();
    expect(isCellBindable(null)).toBeUndefined();
    expect(isCellBindable(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §B5.10 — B5 fires NO diagnostics
// ---------------------------------------------------------------------------

describe("§B5.10 No diagnostics — B5 RECORDS, doesn't FIRE", () => {
  test("Mixed-shape file classifies cleanly with zero SYM errors", () => {
    const src = `<program>\${ <count> = 0; <userName> = <input type="text"/>; const <doubled> = @count * 2; const <badge> = <span>\${@userName}</span>; <formRes><name>="" <email>="" </> }</program>`;
    const { sym } = buildAndClassify(src);
    // SYM.errors should be empty modulo B2 (E-NAME-COLLIDES-STATE) — no
    // shadowing in this fixture, so total must be zero.
    expect(sym.errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §B5.11 — Round-trip annotation coverage
// ---------------------------------------------------------------------------

describe("§B5.11 Coverage — every registered state-decl carries a _cellKind", () => {
  test("Mixed-shape file: every state-decl has a non-undefined _cellKind", () => {
    const src = `<program>\${ <count> = 0; <userName> = <input type="text"/>; const <doubled> = @count * 2; const <badge> = <span>\${@userName}</span>; <formRes><name>="" <email>="" </> }</program>`;
    const { ast } = buildAndClassify(src);

    const decls = collectStateDecls(ast);
    expect(decls.length).toBeGreaterThanOrEqual(7); // count, userName, doubled, badge, formRes, name, email
    for (const d of decls) {
      expect(d.cellKind).toBeDefined();
      expect(["plain", "bindable", "markup-typed", "compound-parent"]).toContain(d.cellKind);
      expect(typeof d.isBindable).toBe("boolean");
      // Invariant: isBindable iff cellKind === "bindable".
      expect(d.isBindable).toBe(d.cellKind === "bindable");
    }
  });
});
