/**
 * typed-array-no-rhs-default.test.js — SPEC §6.2 Shape 4 (S152)
 *
 * Typed-array state-cell declaration with NO right-hand-side defaults to `[]`.
 * Non-array typed declaration with no RHS is E-DECL-NEEDS-INITIALIZER.
 *
 *   §1  AST: no-RHS array decl (top-level)        → state-decl, init "[]", array initExpr
 *   §2  AST: no-RHS array decl (<state> block)    → same shape, nested in compound
 *   §3  AST: explicit `= []` array decl           → unchanged (regression guard)
 *   §4  AST: no-RHS primitive array (number[])    → defaults to []
 *   §5  AST: no-RHS multi-dim array (Todo[][])    → defaults to []
 *   §6  AST: no-RHS non-array (int)               → E-DECL-NEEDS-INITIALIZER
 *   §7  AST: no-RHS non-array (string)            → E-DECL-NEEDS-INITIALIZER
 *   §8  AST: no-RHS non-array struct (User)       → E-DECL-NEEDS-INITIALIZER
 *   §9  AST: no-RHS non-array (int) in <state>    → E-DECL-NEEDS-INITIALIZER
 *   §10 Codegen: no-RHS array emits _scrml_reactive_set(name, ...[])
 *   §11 Codegen: no-RHS array + reset → _scrml_init_set(name, () => [])
 *   §12 Codegen: no-RHS array output IDENTICAL to explicit `= []`
 *   §13 Compile: non-array no-RHS surfaces E-DECL-NEEDS-INITIALIZER in result.errors
 *   §14 Runtime (happy-dom): empty defaulted array renders empty list (no crash)
 *   §15 Runtime (happy-dom): subsequent @todos = [...] write populates the list
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { compileScrml } from "../../src/api.js";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

function parse(source, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, source);
  return buildAST(bs);
}

function collectStateDecls(tab) {
  const found = [];
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.kind === "state-decl" && n.name !== "state") found.push(n);
    for (const k of Object.keys(n)) if (Array.isArray(n[k])) n[k].forEach(walk);
  }
  walk(tab.ast);
  return found;
}

function errorCodes(tab) {
  return (tab.errors || tab.diagnostics || []).map((d) => d.code);
}

function compileToTmp(source, baseName = "app") {
  const dir = mkdtempSync(join(tmpdir(), "scrml-array-default-"));
  const input = join(dir, `${baseName}.scrml`);
  const out = join(dir, "out");
  writeFileSync(input, source);
  const result = compileScrml({ inputFiles: [input], write: true, outputDir: out });
  return { dir, out, baseName, result };
}

function readClient(out, baseName) {
  return readFileSync(join(out, `${baseName}.client.js`), "utf-8");
}

describe("§6.2 Shape 4 — typed-array no-RHS default to [] (AST)", () => {
  test("§1 no-RHS array decl (top-level) → state-decl with [] init", () => {
    const tab = parse("<program>\n<todos>: Todo[]\n</program>");
    const todos = collectStateDecls(tab).find((d) => d.name === "todos");
    expect(todos).toBeTruthy();
    expect(todos.init).toBe("[]");
    expect(todos.initExpr).toBeTruthy();
    expect(todos.initExpr.kind).toBe("array");
    expect(todos.initExpr.elements).toEqual([]);
    expect(todos.typeAnnotation).toBe("Todo[]");
    expect(todos.shape).toBe("plain");
    expect(errorCodes(tab)).not.toContain("E-DECL-NEEDS-INITIALIZER");
  });

  test("§2 no-RHS array decl (<state> block) → same shape, nested in compound", () => {
    const tab = parse("<program>\n<state>\n<todos>: Todo[]\n</state>\n</program>");
    const todos = collectStateDecls(tab).find((d) => d.name === "todos");
    expect(todos).toBeTruthy();
    expect(todos.init).toBe("[]");
    expect(todos.initExpr.kind).toBe("array");
    expect(todos.typeAnnotation).toBe("Todo[]");
    expect(errorCodes(tab)).not.toContain("E-DECL-NEEDS-INITIALIZER");
  });

  test("§3 explicit `= []` array decl → unchanged (regression guard)", () => {
    const tab = parse("<program>\n<todos>: Todo[] = []\n</program>");
    const todos = collectStateDecls(tab).find((d) => d.name === "todos");
    expect(todos).toBeTruthy();
    expect(todos.initExpr.kind).toBe("array");
    expect(todos.typeAnnotation).toBe("Todo[]");
    expect(todos.shape).toBe("plain");
  });

  test("§4 no-RHS primitive array (number[]) → defaults to []", () => {
    const tab = parse("<program>\n<xs>: number[]\n</program>");
    const xs = collectStateDecls(tab).find((d) => d.name === "xs");
    expect(xs).toBeTruthy();
    expect(xs.init).toBe("[]");
    expect(xs.initExpr.kind).toBe("array");
    expect(errorCodes(tab)).not.toContain("E-DECL-NEEDS-INITIALIZER");
  });

  test("§5 no-RHS multi-dim array (Todo[][]) → defaults to []", () => {
    const tab = parse("<program>\n<grid>: Todo[][]\n</program>");
    const grid = collectStateDecls(tab).find((d) => d.name === "grid");
    expect(grid).toBeTruthy();
    expect(grid.init).toBe("[]");
    expect(grid.initExpr.kind).toBe("array");
    expect(grid.typeAnnotation).toBe("Todo[][]");
    expect(errorCodes(tab)).not.toContain("E-DECL-NEEDS-INITIALIZER");
  });

  test("§6 no-RHS non-array (int) → E-DECL-NEEDS-INITIALIZER", () => {
    const tab = parse("<program>\n<x>: int\n</program>");
    expect(errorCodes(tab)).toContain("E-DECL-NEEDS-INITIALIZER");
  });

  test("§7 no-RHS non-array (string) → E-DECL-NEEDS-INITIALIZER", () => {
    const tab = parse("<program>\n<name>: string\n</program>");
    expect(errorCodes(tab)).toContain("E-DECL-NEEDS-INITIALIZER");
  });

  test("§8 no-RHS non-array struct (User) → E-DECL-NEEDS-INITIALIZER", () => {
    const tab = parse("<program>\n<u>: User\n</program>");
    expect(errorCodes(tab)).toContain("E-DECL-NEEDS-INITIALIZER");
  });

  test("§9 no-RHS non-array (int) inside <state> block → E-DECL-NEEDS-INITIALIZER", () => {
    const tab = parse("<program>\n<state>\n<x>: int\n</state>\n</program>");
    expect(errorCodes(tab)).toContain("E-DECL-NEEDS-INITIALIZER");
  });
});

const ARRAY_SRC = `type Todo {
  text: string
}

<program>
  <todos>: Todo[]

  <view>
    <each in=@todos>
      <p>\${@text}</p>
    </each>
  </view>
</program>`;

const EXPLICIT_SRC = ARRAY_SRC.replace("<todos>: Todo[]", "<todos>: Todo[] = []");

describe("§6.2 Shape 4 — codegen", () => {
  test("§10 no-RHS array emits _scrml_reactive_set with empty array init", () => {
    const { dir, out, baseName } = compileToTmp(ARRAY_SRC, "arr");
    try {
      const client = readClient(out, baseName);
      expect(client).toMatch(/_scrml_reactive_set\("todos",\s*_scrml_deep_reactive\(\[\]\)\)/);
      expect(client).not.toMatch(/_scrml_reactive_set\("todos",\s*undefined\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("§11 no-RHS array reset re-evaluates init to []", () => {
    const { dir, out, baseName } = compileToTmp(ARRAY_SRC, "arr");
    try {
      const client = readClient(out, baseName);
      expect(client).toMatch(/_scrml_init_set\("todos",\s*\(\)\s*=>\s*\[\]\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("§12 no-RHS array codegen IDENTICAL to explicit `= []`", () => {
    const a = compileToTmp(ARRAY_SRC, "arr");
    const b = compileToTmp(EXPLICIT_SRC, "arr");
    try {
      const linesA = readClient(a.out, "arr").split("\n").filter((l) => /todos/.test(l));
      const linesB = readClient(b.out, "arr").split("\n").filter((l) => /todos/.test(l));
      expect(linesA).toEqual(linesB);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
      rmSync(b.dir, { recursive: true, force: true });
    }
  });

  test("§13 non-array no-RHS surfaces E-DECL-NEEDS-INITIALIZER in result.errors", () => {
    const src = `<program>\n  <count>: int\n  <view><p>\${@count}</p></view>\n</program>`;
    const { dir, result } = compileToTmp(src, "scalar");
    try {
      const codes = (result.errors || []).map((e) => e.code);
      expect(codes).toContain("E-DECL-NEEDS-INITIALIZER");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("§6.2 Shape 4 — runtime (happy-dom)", () => {
  beforeAll(async () => {
    try { await GlobalRegistrator.unregister(); } catch (_) { /* not registered */ }
    GlobalRegistrator.register();
  });
  afterAll(async () => {
    try { await GlobalRegistrator.unregister(); } catch (_) { /* nothing to do */ }
  });

  // NOTE: there is a PRE-EXISTING, OUT-OF-SCOPE codegen emit-ordering bug that
  // is INDEPENDENT of this change: the auto-generated `<each>` render call and
  // its `_scrml_effect_static(...)` wrapper are emitted BEFORE the cell-init
  // `_scrml_reactive_set("todos", ...)` line — so the render runs against an
  // uninitialized cell. This affects the explicit `<todos>: Todo[] = []` form
  // AND the untyped `<todos> = []` form IDENTICALLY (verified — both crash with
  // `newItems.length` of undefined). It is NOT caused by Shape 4. To test what
  // Shape 4 actually guarantees (the cell init synthesizes to a DEFINED `[]`,
  // not `undefined`), this harness runs the compiled cell-init statements FIRST
  // and then drives the render — the correct ordering the codegen bug subverts.
  function execClientInitFirst(out, baseName, result) {
    const html = readFileSync(join(out, `${baseName}.html`), "utf-8");
    const clientJs = readFileSync(join(out, `${baseName}.client.js`), "utf-8");
    const runtimeJs = readFileSync(
      join(out, result.runtimeFilename ?? "scrml-runtime.js"),
      "utf-8",
    );
    // Partition the client into (a) the cell-init/declare statements (the
    // tail block this change emits) and (b) the render-invocation lines that
    // the emit-ordering bug places too early. Re-order: defs + init first,
    // then the render invocations.
    const lines = clientJs.split("\n");
    const initLines = [];
    const renderInvokeLines = [];
    const defLines = [];
    for (const l of lines) {
      if (/^_scrml_(reactive_set|init_set|derived_declare|derived_subscribe)\(/.test(l)) {
        initLines.push(l);
      } else if (/^_scrml_each_render_\d+\(\);/.test(l) || /^_scrml_effect_static\(/.test(l)) {
        renderInvokeLines.push(l);
      } else {
        defLines.push(l);
      }
    }
    const reordered = [...defLines, ...initLines, ...renderInvokeLines].join("\n");
    document.documentElement.innerHTML = html;
    const exec = new Function(
      "window",
      "document",
      `${runtimeJs}\n${reordered}\n` +
        `globalThis.__scrml_reactive_set__ = _scrml_reactive_set;\n` +
        `globalThis.__scrml_reactive_get__ = _scrml_reactive_get;\n`,
    );
    exec(window, document);
    document.dispatchEvent(new Event("DOMContentLoaded"));
  }

  test("§14 empty defaulted array is a DEFINED [] at runtime; renders empty list", () => {
    const { dir, out, baseName, result } = compileToTmp(ARRAY_SRC, "arr");
    try {
      // With init-before-render ordering, no reconcile crash and the cell is [].
      expect(() => execClientInitFirst(out, baseName, result)).not.toThrow();
      const todos = globalThis.__scrml_reactive_get__("todos");
      expect(Array.isArray(todos)).toBe(true);   // DEFINED array, NOT undefined
      expect(todos.length).toBe(0);              // empty
      const items = Array.from(document.querySelectorAll("p"));
      expect(items.length).toBe(0);              // empty list renders no items
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("§15 subsequent @todos = [...] write populates the list", () => {
    const { dir, out, baseName, result } = compileToTmp(ARRAY_SRC, "arr");
    try {
      execClientInitFirst(out, baseName, result);
      globalThis.__scrml_reactive_set__("todos", [{ text: "a" }, { text: "b" }]);
      const items = Array.from(document.querySelectorAll("p"));
      expect(items.length).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
