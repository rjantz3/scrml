// S105 A4 — §48.6.4 pinned-fn forward-ref enforcement
//
// SPEC §48.6.4 (S98) says forward reference to a `pinned fn` declaration
// SHALL fire `E-STATE-PINNED-FORWARD-REF`. Parser-recognition landed
// S105 `dc3c460` (FunctionDeclNode `isPinned?: boolean` flag set on all 6
// form variants). This test suite verifies the semantic-enforcement half
// (SYM PASS 19 — `walkPinnedFnForwardRefCheck` at compiler/src/symbol-table.ts
// + the new diagnostic at `runSYM`).
//
// Test layout:
//   §A4.1.x — positive: forward refs fire E-STATE-PINNED-FORWARD-REF
//   §A4.2.x — negative: backward refs DO NOT fire (declaration order honored)
//   §A4.3.x — negative: calls to non-pinned `fn` DO NOT fire (hoisting works)
//   §A4.4.x — composition with prefix modifiers (async/pure/server)
//   §A4.5.x — diagnostic shape (message, code, severity)

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runSYM } from "../../src/symbol-table.ts";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

function buildSym(source) {
  const { ast } = parse(source);
  return runSYM({ filePath: "test.scrml", ast });
}

function pinnedFwdRefErrors(sym) {
  return sym.errors.filter(e => e.code === "E-STATE-PINNED-FORWARD-REF");
}

describe("§A4.1 — forward ref to pinned fn fires E-STATE-PINNED-FORWARD-REF", () => {
  test("§A4.1.1 — call to pinned fn before its decl fires (caller wraps callee)", () => {
    const src = `<program>\${
      fn caller() { return later() }
      pinned fn later() { return 42 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[0].message).toMatch(/pinned fn.*later/);
  });

  test("§A4.1.2 — call to pinned fn in top-level logic body before its decl fires", () => {
    const src = `<program>\${
      let result = computeValue()
      pinned fn computeValue() { return 7 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[0].message).toMatch(/computeValue/);
  });

  test("§A4.1.3 — call to pinned fn nested in expression fires", () => {
    const src = `<program>\${
      let x = 1 + helper() + 2
      pinned fn helper() { return 5 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[0].message).toMatch(/helper/);
  });
});

describe("§A4.2 — backward refs to pinned fn DO NOT fire", () => {
  test("§A4.2.1 — call AFTER the pinned-fn decl is legal", () => {
    const src = `<program>\${
      pinned fn helper() { return 1 }
      let x = helper()
    }</program>`;
    const sym = buildSym(src);
    expect(pinnedFwdRefErrors(sym)).toEqual([]);
  });

  test("§A4.2.2 — call from another fn declared AFTER the pinned fn is legal", () => {
    const src = `<program>\${
      pinned fn helper() { return 1 }
      fn caller() { return helper() }
    }</program>`;
    const sym = buildSym(src);
    expect(pinnedFwdRefErrors(sym)).toEqual([]);
  });
});

describe("§A4.3 — calls to non-pinned `fn` DO NOT fire (hoisting works)", () => {
  test("§A4.3.1 — forward call to plain `fn` (no pinned) is legal — hoisting per §48.6.4", () => {
    const src = `<program>\${
      fn caller() { return later() }
      fn later() { return 42 }
    }</program>`;
    const sym = buildSym(src);
    expect(pinnedFwdRefErrors(sym)).toEqual([]);
  });

  test("§A4.3.2 — forward call to plain `fn` from top-level logic body is legal", () => {
    const src = `<program>\${
      let x = later()
      fn later() { return 7 }
    }</program>`;
    const sym = buildSym(src);
    expect(pinnedFwdRefErrors(sym)).toEqual([]);
  });
});

describe("§A4.4 — composition with prefix modifiers", () => {
  test("§A4.4.1 — pinned pure fn forward ref fires", () => {
    const src = `<program>\${
      fn caller() { return double(5) }
      pinned pure fn double(x) { return x * 2 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[0].message).toMatch(/double/);
  });

  test("§A4.4.2 — pinned server fn forward ref fires", () => {
    const src = `<program>\${
      fn caller() { return handler() }
      pinned server fn handler() { return 42 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[0].message).toMatch(/handler/);
  });
});

describe("§A4.5 — diagnostic shape", () => {
  test("§A4.5.1 — error code is E-STATE-PINNED-FORWARD-REF", () => {
    const src = `<program>\${
      fn caller() { return later() }
      pinned fn later() { return 1 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[0].code).toBe("E-STATE-PINNED-FORWARD-REF");
  });

  test("§A4.5.2 — severity is error", () => {
    const src = `<program>\${
      fn caller() { return later() }
      pinned fn later() { return 1 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs[0].severity).toBe("error");
  });

  test("§A4.5.3 — message references the pinned modifier + §48.6.4 spec section", () => {
    const src = `<program>\${
      fn caller() { return later() }
      pinned fn later() { return 1 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs[0].message).toContain("pinned");
    expect(errs[0].message).toContain("§48.6.4");
  });

  test("§A4.5.4 — message suggests both fixes (move call after decl OR remove pinned)", () => {
    const src = `<program>\${
      fn caller() { return later() }
      pinned fn later() { return 1 }
    }</program>`;
    const sym = buildSym(src);
    const errs = pinnedFwdRefErrors(sym);
    expect(errs[0].message).toMatch(/Move the call after/);
    expect(errs[0].message).toMatch(/remove the.*pinned/);
  });
});

describe("§A4.6 — zero-pinned-fn files have zero overhead (regression baseline)", () => {
  test("§A4.6.1 — file with no pinned fn produces zero E-STATE-PINNED-FORWARD-REF errors", () => {
    const src = `<program>\${
      fn a() { return b() }
      fn b() { return c() }
      fn c() { return 1 }
    }</program>`;
    const sym = buildSym(src);
    expect(pinnedFwdRefErrors(sym)).toEqual([]);
  });
});
