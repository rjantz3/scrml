/**
 * g-markup-value-in-expression.test.js — regression gate for
 * g-markup-value-ternary-fnreturn-codegen (markup-as-first-class-value, Pillar 1,
 * in expression position).
 *
 * The gap has three documented forms (PRIMER §6.4/§6.6.17, kickstarter §6.4):
 *   (a) inline ternary    `${ cond ? <a/> : <b/> }`
 *   (b) derived-cell ternary `const <x> = cond ? <a/> : <b/>`
 *   (c) fn-return markup  `fn f() -> markup { return <m/> }`
 * All three emitted E-CODEGEN-INVALID-JS (markup dropped at parse, or raw `< span >`),
 * while the plain markup-typed derived control (`const <x> = <span>${@n}</span>`)
 * compiled fine.
 *
 * STATUS: ALL FORMS LANDED. Form (c) `return <markup>` routes through the
 * `emitMarkupValueExpr` IIFE primitive (emit-lift.js). Forms (a)/(b) (the ternary
 * forms) reuse that SAME primitive: the salvaged parse layers (block-splitter
 * full-RHS scan + ast-builder `sawTernaryAtRoot` guard + `parseExprWithMarkupValues`)
 * recover each ternary markup arm to a `markup-value` ExprNode leaf, and emit-expr's
 * `case "markup-value"` lowers it via `emitMarkupValueExpr` — a real createElement-built
 * DOM node. None of the four forms emit E-CODEGEN-INVALID-JS / dropped arms / raw `< span >`.
 */
import { describe, test, expect } from "bun:test";
import { resolve } from "path";
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "fs";
import { compileScrml } from "../../src/api.js";

function compileToClient(source, suffix) {
  const uniq = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const name = `${suffix}-${uniq}`;
  const tmpDir = resolve("/tmp", `scrml-${name}`);
  const tmpInput = resolve(tmpDir, `${name}.scrml`);
  const outDir = resolve(tmpDir, "out");
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(tmpInput, source);
  try {
    const result = compileScrml({ inputFiles: [tmpInput], write: true, outputDir: outDir });
    const clientPath = resolve(outDir, `${name}.client.js`);
    const clientJs = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
    return { errors: result.errors ?? [], clientJs };
  } finally {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe("g-markup-value-ternary-fnreturn-codegen", () => {
  test("(c) fn returning markup → real createElement factory, not raw `< span >`", () => {
    const src = `\${ fn label(n: int) -> markup { return <span>\${n}</span> } }
<n> = 0
<div>\${ label(@n) }</div>`;
    const { errors, clientJs } = compileToClient(src, "mv-fnret");
    expect(errors.filter(e => e.code === "E-CODEGEN-INVALID-JS")).toHaveLength(0);
    expect(clientJs).toContain('createElement("span")');
    expect(clientJs).not.toMatch(/<\s+span\s+>/);
  });

  test("control (d) — plain markup-typed derived cell still compiles", () => {
    const src = `<n> = 0
const <x> = <span>\${@n}</span>
<div>\${@x}</div>`;
    const { errors, clientJs } = compileToClient(src, "mv-plain");
    expect(errors.filter(e => e.code === "E-CODEGEN-INVALID-JS")).toHaveLength(0);
    expect(clientJs).toContain('createElement("span")');
  });

  // Forms (a) inline-ternary + (b) derived-ternary — LANDED (markup-value-in-expression-
  // 2026-06-17). The salvaged parse layers (block-splitter full-RHS scan + ast-builder
  // sawTernaryAtRoot guard + parseExprWithMarkupValues) recover each ternary markup arm
  // to a `markup-value` ExprNode leaf; emit-expr's `case "markup-value"` lowers it via
  // the form-(c) `emitMarkupValueExpr` IIFE primitive (a real createElement-built DOM
  // node) — so the arms are no longer dropped/raw `< span >`.
  test("(a) inline ternary markup arms lower → real createElement, no dropped arm", () => {
    const src = `<n> = 0
<div>\${ @n > 0 ? <span>pos</span> : <span>neg</span> }</div>`;
    const { errors, clientJs } = compileToClient(src, "mv-inline");
    expect(errors.filter(e => e.code === "E-CODEGEN-INVALID-JS")).toHaveLength(0);
    // Both ternary arms survive as real markup-value IIFEs (not a dropped alternate
    // arm `> 0 ?)` and not a raw mangled `< span >`).
    expect(clientJs).toContain('createElement("span")');
    expect(clientJs).toContain('document.createTextNode("pos")');
    expect(clientJs).toContain('document.createTextNode("neg")');
    expect(clientJs).not.toMatch(/<\s+span\s+>/);
  });

  test("(b) derived-cell ternary markup arms lower → real createElement, no dropped arm", () => {
    const src = `<n> = 0
const <badge> = @n > 0 ? <span>pos</span> : <span>neg</span>
<div>\${@badge}</div>`;
    const { errors, clientJs } = compileToClient(src, "mv-derived");
    expect(errors.filter(e => e.code === "E-CODEGEN-INVALID-JS")).toHaveLength(0);
    // The derived cell factory evaluates a ternary of markup-value IIFEs — both arms
    // present, real DOM-node lowering, no raw `< span >`.
    expect(clientJs).toContain('createElement("span")');
    expect(clientJs).toContain('document.createTextNode("pos")');
    expect(clientJs).toContain('document.createTextNode("neg")');
    expect(clientJs).not.toMatch(/<\s+span\s+>/);
  });
});
