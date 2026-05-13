/**
 * reachability/entry-points — Entry-point enumeration tests.
 *
 * S89 wave A-2.2.a — exercises `enumerateEntryPoints` against
 * synthesized FileAST inputs covering SPA + multi-page shapes,
 * skip-on-module, and explicit `<page path=>` extraction.
 */

import { describe, test, expect } from "bun:test";
import { enumerateEntryPoints } from "../../src/reachability/entry-points.ts";
import type { FileAST, MarkupNode, ASTNode, Span, AttrNode } from "../../src/types/ast.ts";

const SPAN: Span = { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };

let nextId = 1;
function nid(): number {
  return nextId++;
}

function attr(name: string, valueStr: string | null): AttrNode {
  if (valueStr === null) {
    return { name, value: { kind: "absent" }, span: SPAN };
  }
  return {
    name,
    value: { kind: "string-literal", value: valueStr, span: SPAN },
    span: SPAN,
  };
}

function markup(tag: string, attrs: AttrNode[] = [], children: ASTNode[] = []): MarkupNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "markup",
    tag,
    attrs,
    children,
    selfClosing: false,
    closerForm: `</${tag}>`,
    isComponent: false,
  };
}

function file(filePath: string, nodes: ASTNode[]): FileAST {
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    spans: {},
    hasProgramRoot: nodes.some(n => n && (n as MarkupNode).tag === "program"),
    authConfig: null,
    middlewareConfig: null,
  };
}

// ---------------------------------------------------------------------------
// §1 — SPA shape
// ---------------------------------------------------------------------------

describe("§1 SPA entry-point enumeration", () => {
  test("file with <program> + no <page> children → one spa-program entry", () => {
    const program = markup("program", [], [markup("div")]);
    const f = file("/abs/spa.scrml", [program]);
    const eps = enumerateEntryPoints([f]);
    expect(eps).toHaveLength(1);
    expect(eps[0].shape).toBe("spa-program");
    expect(eps[0].filePath).toBe("/abs/spa.scrml");
    expect(eps[0].routePath).toBeNull();
    expect(eps[0].rootNodeId).toBe(program.id);
    expect(eps[0].id).toBe("/abs/spa.scrml#program");
  });
});

// ---------------------------------------------------------------------------
// §2 — Multi-page-in-entry-file shape
// ---------------------------------------------------------------------------

describe("§2 multi-page entry-point enumeration", () => {
  test("<program> with two <page> children → two page entry points", () => {
    const page1 = markup("page", [attr("path", "/dash")]);
    const page2 = markup("page", [attr("path", "/loads")]);
    const program = markup("program", [], [page1, page2]);
    const f = file("/abs/multi.scrml", [program]);
    const eps = enumerateEntryPoints([f]);
    expect(eps).toHaveLength(2);
    expect(eps[0].shape).toBe("page");
    expect(eps[0].routePath).toBe("/dash");
    expect(eps[0].rootNodeId).toBe(page1.id);
    expect(eps[1].routePath).toBe("/loads");
    expect(eps[1].rootNodeId).toBe(page2.id);
  });

  test("page without path= → routePath null, positional id", () => {
    const page = markup("page", []);
    const program = markup("program", [], [page]);
    const f = file("/abs/p.scrml", [program]);
    const eps = enumerateEntryPoints([f]);
    expect(eps).toHaveLength(1);
    expect(eps[0].routePath).toBeNull();
    expect(eps[0].id).toBe("/abs/p.scrml#page-0");
  });

  test("path-keyed ids are stable across positions", () => {
    const page = markup("page", [attr("path", "/admin")]);
    const program = markup("program", [], [markup("page", [attr("path", "/dash")]), page]);
    const f = file("/abs/x.scrml", [program]);
    const eps = enumerateEntryPoints([f]);
    expect(eps[1].id).toBe("/abs/x.scrml#page@/admin");
  });
});

// ---------------------------------------------------------------------------
// §3 — Skip non-entry files
// ---------------------------------------------------------------------------

describe("§3 files without <program> root are skipped", () => {
  test("module file (no program) → zero entry points", () => {
    const f = file("/abs/module.scrml", [markup("channel", [attr("name", "ch")])]);
    expect(enumerateEntryPoints([f])).toEqual([]);
  });

  test("empty file → zero entry points", () => {
    const f = file("/abs/empty.scrml", []);
    expect(enumerateEntryPoints([f])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §4 — Multi-file aggregation
// ---------------------------------------------------------------------------

describe("§4 enumerates across the compile unit", () => {
  test("two files (one SPA, one multi-page) → all entries collected", () => {
    const spaProg = markup("program", [], []);
    const fA = file("/abs/a.scrml", [spaProg]);

    const page = markup("page", [attr("path", "/x")]);
    const multiProg = markup("program", [], [page]);
    const fB = file("/abs/b.scrml", [multiProg]);

    const eps = enumerateEntryPoints([fA, fB]);
    expect(eps).toHaveLength(2);
    expect(eps[0].shape).toBe("spa-program");
    expect(eps[1].shape).toBe("page");
  });

  test("file-iteration order is preserved (determinism)", () => {
    const eps = enumerateEntryPoints([
      file("/abs/z.scrml", [markup("program", [], [])]),
      file("/abs/a.scrml", [markup("program", [], [])]),
    ]);
    expect(eps[0].filePath).toBe("/abs/z.scrml");
    expect(eps[1].filePath).toBe("/abs/a.scrml");
  });
});

// ---------------------------------------------------------------------------
// §5 — Nesting / direct-child semantics
// ---------------------------------------------------------------------------

describe("§5 <page> must be a direct child of <program>", () => {
  test("<page> nested inside a <div> is NOT enumerated as a page entry", () => {
    // Stray nested <page> — should be ignored by the enumerator.
    const nestedPage = markup("page", [attr("path", "/nested")]);
    const div = markup("div", [], [nestedPage]);
    const program = markup("program", [], [div]);
    const f = file("/abs/n.scrml", [program]);
    const eps = enumerateEntryPoints([f]);
    // Zero direct <page> children + non-empty body → falls back to SPA shape.
    expect(eps).toHaveLength(1);
    expect(eps[0].shape).toBe("spa-program");
  });
});

// ---------------------------------------------------------------------------
// §6 — OQ-A2-E confirmation
// ---------------------------------------------------------------------------

describe("§6 no synthesis on auth-redirect (OQ-A2-E disposition)", () => {
  test("a <program auth=required> with a single <page> emits exactly one entry", () => {
    // Per §40.9.9 paragraph "For viewer Anonymous": the auth redirect's
    // login route is its own <page> entry point — enumerated independently,
    // NOT synthesized here. We confirm by asserting cardinality.
    const page = markup("page", [attr("path", "/dash")]);
    const program = markup("program", [attr("auth", "required")], [page]);
    const f = file("/abs/redir.scrml", [program]);
    const eps = enumerateEntryPoints([f]);
    expect(eps).toHaveLength(1);
    expect(eps[0].routePath).toBe("/dash");
  });
});
