/**
 * Phase A1b Step B4 — Import binding registration + source-position
 * `pinned` forward-ref check + best-effort E-IMPORT-PINNED-INVALID.
 *
 * SPEC anchors:
 *   §6.9.3, §6.10.2, §6.10.5, §7.6.1 — E-STATE-PINNED-FORWARD-REF
 *     (source-position rule: read of a pinned cell BEFORE its decl-span end
 *     is the error; including read inside the cell's own initializer)
 *   §21.8.1 — pinned imports inherit same-file pinned semantics; pinned on
 *     a non-cell-non-engine import is E-IMPORT-PINNED-INVALID
 *   §34 — error catalog rows
 *
 * Per the re-scoped dispatch (S66 Phase 0 STOP findings):
 *   - Algorithm is a SOURCE-POSITION forward-ref rule, NOT cycle/SCC detection.
 *   - E-IMPORT-PINNED-INVALID fires only on definitively-not-cell-not-engine
 *     kinds (function/fn/type/channel). const/let imports are accepted with
 *     a documented B14 deferral (engine vs. arbitrary-const distinction is
 *     not knowable today).
 *
 * Test layout:
 *
 *   §B4.1.x — Phase 1 (registration only). Verifies import specifiers land
 *             in the file scope's importBindings map with correct shape.
 *   §B4.2.x — Phase 2: E-STATE-PINNED-FORWARD-REF source-position check.
 *   §B4.3.x — Phase 3: E-IMPORT-PINNED-INVALID best-effort fire.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import {
  runSYM,
  runSYMBatch,
  lookupImportBinding,
} from "../../src/symbol-table.ts";

function parse(source) {
  const bs = splitBlocks("test.scrml", source);
  return buildAST(bs);
}

function buildSym(source) {
  const { ast, errors } = parse(source);
  const sym = runSYM({ filePath: "test.scrml", ast });
  return { ast, errors, sym };
}

function symErrorsByCode(sym, code) {
  return sym.errors.filter((e) => e.code === code);
}

// ===========================================================================
// §B4.1 — Phase 1: Import binding registration
// ===========================================================================

describe("§B4.1.1 named-import without pinned registers in file scope", () => {
  test("import { foo } from './m.scrml' — single binding, pinned:false", () => {
    const src = `<program>\${ import { foo } from './m.scrml' }</program>`;
    const { sym } = buildSym(src);
    expect(sym.fileScope.kind).toBe("file");
    expect(sym.fileScope.importBindings.size).toBe(1);
    const rec = sym.fileScope.importBindings.get("foo");
    expect(rec).toBeDefined();
    expect(rec.localName).toBe("foo");
    expect(rec.exportedName).toBe("foo");
    expect(rec.sourcePath).toBe("./m.scrml");
    expect(rec.pinned).toBe(false);
    expect(rec.declNode).toBeDefined();
    expect(rec.declNode.kind).toBe("import-decl");
  });
});

describe("§B4.1.2 named-import with pinned registers pinned:true", () => {
  test("import { foo pinned } from './m.scrml' — pinned:true", () => {
    const src = `<program>\${ import { foo pinned } from './m.scrml' }</program>`;
    const { sym } = buildSym(src);
    const rec = sym.fileScope.importBindings.get("foo");
    expect(rec).toBeDefined();
    expect(rec.pinned).toBe(true);
    expect(rec.exportedName).toBe("foo");
  });
});

describe("§B4.1.3 alias + pinned registers under LOCAL name", () => {
  test("import { foo as bar pinned } registers under 'bar' with exportedName:'foo'", () => {
    const src = `<program>\${ import { foo as bar pinned } from './m.scrml' }</program>`;
    const { sym } = buildSym(src);
    expect(sym.fileScope.importBindings.has("foo")).toBe(false);
    const rec = sym.fileScope.importBindings.get("bar");
    expect(rec).toBeDefined();
    expect(rec.localName).toBe("bar");
    expect(rec.exportedName).toBe("foo");
    expect(rec.pinned).toBe(true);
  });
});

describe("§B4.1.4 multi-specifier mixed pinned flags", () => {
  test("import { a pinned, b, c pinned } — three records, mixed flags", () => {
    const src = `<program>\${ import { a pinned, b, c pinned } from './m.scrml' }</program>`;
    const { sym } = buildSym(src);
    expect(sym.fileScope.importBindings.size).toBe(3);
    expect(sym.fileScope.importBindings.get("a").pinned).toBe(true);
    expect(sym.fileScope.importBindings.get("b").pinned).toBe(false);
    expect(sym.fileScope.importBindings.get("c").pinned).toBe(true);
  });
});

describe("§B4.1.5 default import registers single binding, pinned:false", () => {
  test("import foo from './m.scrml' — single binding under default name", () => {
    const src = `<program>\${ import foo from './m.scrml' }</program>`;
    const { sym } = buildSym(src);
    expect(sym.fileScope.importBindings.size).toBe(1);
    const rec = sym.fileScope.importBindings.get("foo");
    expect(rec).toBeDefined();
    expect(rec.pinned).toBe(false);
    expect(rec.exportedName).toBe("foo");
    expect(rec.sourcePath).toBe("./m.scrml");
  });
});

describe("§B4.1.6 lookupImportBinding helper", () => {
  test("lookupImportBinding returns null for unregistered name", () => {
    const src = `<program>\${ import { foo } from './m.scrml' }</program>`;
    const { sym } = buildSym(src);
    expect(lookupImportBinding(sym.fileScope, "foo")).not.toBeNull();
    expect(lookupImportBinding(sym.fileScope, "nope")).toBeNull();
    expect(lookupImportBinding(null, "foo")).toBeNull();
  });
});

describe("§B4.1.7 stats.totalImportBindings reflects registration count", () => {
  test("3 specifiers + 0 default → totalImportBindings === 3", () => {
    const src = `<program>\${ import { a, b, c } from './m.scrml' }</program>`;
    const { sym } = buildSym(src);
    expect(sym.stats.totalImportBindings).toBe(3);
  });
});

describe("§B4.1.8 no-imports file has empty registry", () => {
  test("totalImportBindings === 0 when no imports present", () => {
    const src = `<program>\${ <count> = 0 }</program>`;
    const { sym } = buildSym(src);
    expect(sym.stats.totalImportBindings).toBe(0);
    expect(sym.fileScope.importBindings.size).toBe(0);
  });
});
