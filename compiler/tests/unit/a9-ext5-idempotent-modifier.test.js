/**
 * A9 Ext 5 — `.idempotent()` function modifier parser tests (SPEC §19.9.7).
 *
 * D1 territory: ast-builder.js extension recognizing `.idempotent()` as a
 * function-decl modifier suffix (alongside `!`/`-> ErrorType`/`route=`/
 * `method=`/return-type-annotation).
 */

import { describe, test, expect } from "bun:test";
import { runTAB } from "../../src/ast-builder.js";
import { splitBlocks } from "../../src/block-splitter.js";

function tab(source) {
  const bs = splitBlocks("/test/app.scrml", source);
  return runTAB(bs);
}

function findFunctionDecl(nodes, name) {
  for (const n of nodes ?? []) {
    if (!n || typeof n !== "object") continue;
    if (n.kind === "function-decl" && n.name === name) return n;
    if (n.kind === "logic" && Array.isArray(n.body)) {
      const found = findFunctionDecl(n.body, name);
      if (found) return found;
    }
    if (Array.isArray(n.children)) {
      const found = findFunctionDecl(n.children, name);
      if (found) return found;
    }
  }
  return null;
}

describe(".idempotent() modifier — recognized at function-decl site", () => {
  test("function with .idempotent() sets idempotentModifier: true", () => {
    const source = `<program>\${
      function upsertUser(id, email).idempotent() {
        log(id)
      }
    }</program>`;
    const result = tab(source);
    const fn = findFunctionDecl(result.ast.nodes, "upsertUser");
    expect(fn).toBeTruthy();
    expect(fn.idempotentModifier).toBe(true);
  });

  test("function WITHOUT .idempotent() has no idempotentModifier field", () => {
    const source = `<program>\${
      function regularFn(id) {
        log(id)
      }
    }</program>`;
    const result = tab(source);
    const fn = findFunctionDecl(result.ast.nodes, "regularFn");
    expect(fn).toBeTruthy();
    expect(fn.idempotentModifier).toBeUndefined();
  });

  test("function with `!` modifier AND .idempotent() — both set", () => {
    const source = `<program>\${
      function failableUpsert(id)! -> Err.idempotent() {
        log(id)
      }
    }</program>`;
    const result = tab(source);
    const fn = findFunctionDecl(result.ast.nodes, "failableUpsert");
    expect(fn).toBeTruthy();
    expect(fn.canFail).toBe(true);
    expect(fn.errorType).toBe("Err");
    expect(fn.idempotentModifier).toBe(true);
  });

  test("server function with .idempotent() — both flags propagated", () => {
    const source = `<program>\${
      server function syncProfile(id, email).idempotent() {
        log(id)
      }
    }</program>`;
    const result = tab(source);
    const fn = findFunctionDecl(result.ast.nodes, "syncProfile");
    expect(fn).toBeTruthy();
    expect(fn.isServer).toBe(true);
    expect(fn.idempotentModifier).toBe(true);
  });

  test("function with .idempotent() then route= attr — modifier still set", () => {
    const source = `<program>\${
      server function endpoint(id).idempotent() route="/api/x" {
        log(id)
      }
    }</program>`;
    const result = tab(source);
    const fn = findFunctionDecl(result.ast.nodes, "endpoint");
    expect(fn).toBeTruthy();
    expect(fn.idempotentModifier).toBe(true);
    expect(fn.route).toBe("/api/x");
  });
});

describe(".idempotent() modifier — fn shorthand site", () => {
  test("fn with .idempotent() — modifier flag set on fn-kind decl", () => {
    const source = `<program>\${
      fn helper(x).idempotent() {
        return x
      }
    }</program>`;
    const result = tab(source);
    const fn = findFunctionDecl(result.ast.nodes, "helper");
    expect(fn).toBeTruthy();
    expect(fn.fnKind).toBe("fn");
    expect(fn.idempotentModifier).toBe(true);
  });
});
