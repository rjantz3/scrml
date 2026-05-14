/**
 * Reachability Solver — Component 5 conformance suite.
 *
 * S90 wave A-2.6 — exercises `vendor_units_used_by` per SPEC §40.9.6
 * via the full `runReachabilitySolver` entry point AND directly via
 * the exported helpers (`buildPerFileVendorUnitCatalog`,
 * `vendorUnitsUsedByComponents`).
 *
 * Each test constructs synthetic FileASTs (bypassing BS/TAB) so the
 * vendor-unit-collection path is exercised in isolation. The depGraph
 * is null/empty in most tests — Component 2's reactive-dep walk does
 * not contribute to vendor-unit attribution; vendor detection is
 * driven entirely by Component 1's component set + per-file
 * import/use declarations.
 *
 * Coverage (per SCOPING §A-2.6 tests-gating list):
 *   §1  `use vendor:X` (UseDeclNode) referenced by initial-render
 *       component → admitted.
 *   §2  `import { ... } from 'vendor:X'` (ImportDeclNode) referenced
 *       by initial-render component → admitted.
 *   §3  Multiple components share a vendor unit → admitted once
 *       (Set semantics).
 *   §4  Unreferenced vendor unit (declared in a file with NO
 *       component in the entry-point's initial render) → NOT admitted.
 *   §5  Vendor unit referenced only at N≥2 (component not in initial
 *       render) → NOT admitted at N=0 (current scope; A-2.7 fixpoint
 *       will extend to N≥1 tiers).
 *   §6  Multiple vendor units in one file → all admitted.
 *   §7  Opacity rule: vendor unit's internal graph is NOT subdivided
 *       — the VendorUnitId is admitted as a whole atom regardless of
 *       what's imported from it (a `{ Editor }` vs `{ Editor, Doc }`
 *       import shape produces the same unit-level result).
 *   §8  No vendor imports → empty vendorUnitNames set across all
 *       entry points.
 */

import { describe, test, expect } from "bun:test";
import { runReachabilitySolver } from "../../src/reachability-solver.ts";
import {
  buildPerFileVendorUnitCatalog,
  buildComponentToFileIndex,
  vendorUnitsUsedByComponents,
} from "../../src/reachability/component-5.ts";
import type {
  ASTNode,
  AttrNode,
  FileAST,
  ImportDeclNode,
  MarkupNode,
  Span,
  UseDeclNode,
} from "../../src/types/ast.ts";

// ---------------------------------------------------------------------------
// Synthetic AST builders (mirrors reachability-solver-component-1.test.ts)
// ---------------------------------------------------------------------------

const SPAN: Span = { file: "t.scrml", start: 0, end: 0, line: 1, col: 1 };

let nextId = 1;
function nid(): number { return nextId++; }

function markup(
  tag: string,
  attrs: AttrNode[] = [],
  children: ASTNode[] = [],
): MarkupNode {
  return {
    id: nid(), span: SPAN, kind: "markup", tag, attrs, children,
    selfClosing: false, closerForm: `</${tag}>`, isComponent: false,
  };
}

function file(
  filePath: string,
  nodes: ASTNode[],
  imports: ImportDeclNode[] = [],
): FileAST {
  return {
    filePath, nodes, imports, exports: [], components: [], typeDecls: [],
    spans: {},
    hasProgramRoot: nodes.some(n => n && (n as MarkupNode).tag === "program"),
    authConfig: null, middlewareConfig: null,
  };
}

function vendorImport(name: string, names: string[] = []): ImportDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "import-decl",
    raw: `import { ${names.join(", ")} } from 'vendor:${name}'`,
    names,
    source: `vendor:${name}`,
    isDefault: false,
  };
}

function vendorUse(name: string, names: string[] = []): UseDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "use-decl",
    raw: `use vendor:${name} { ${names.join(", ")} }`,
    names,
    source: `vendor:${name}`,
  };
}

function relativeImport(path: string, names: string[] = []): ImportDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "import-decl",
    raw: `import { ${names.join(", ")} } from '${path}'`,
    names,
    source: path,
    isDefault: false,
  };
}

function runOne(files: FileAST[]) {
  return runReachabilitySolver({ depGraph: null, files });
}

function firstPlan(record: ReturnType<typeof runOne>["record"]) {
  const [, rps] = record.closures.entries().next().value;
  return rps.byRole.get("_anonymous")!;
}

// ---------------------------------------------------------------------------
// §1 — `use vendor:X` referenced by initial-render component
// ---------------------------------------------------------------------------

describe("§1 use vendor:X referenced by initial-render component", () => {
  test("vendor:cm6 declared via use-decl in logic block → admitted", () => {
    // Synthesize a file where the program body contains a logic block
    // with `use vendor:cm6 { Editor }`, and a sibling markup tree
    // (the initial-render component). The use-decl is wired both as
    // a top-level FileAST.imports entry (canonical hoisted form) and
    // via a LogicNode body (alternative source the catalog walker
    // also picks up). We pick the LogicNode-body form here to
    // exercise the walker's secondary scan path.
    const compM = markup("h1");
    const logicBody: ASTNode = vendorUse("cm6", ["Editor"]) as unknown as ASTNode;
    const logicNode = {
      id: nid(),
      span: SPAN,
      kind: "logic" as const,
      body: [logicBody as any],
      imports: [],
      exports: [],
      typeDecls: [],
      components: [],
    } as unknown as ASTNode;
    const program = markup("program", [], [logicNode, compM]);
    const f = file("/abs/t1.scrml", [program]);

    const { record, errors } = runOne([f]);
    expect(errors).toEqual([]);
    const plan = firstPlan(record);
    expect(plan.initialChunk.vendorUnitNames.has("cm6")).toBe(true);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §2 — `import { ... } from 'vendor:X'` referenced by initial-render
// ---------------------------------------------------------------------------

describe("§2 vendor: import referenced by initial-render component", () => {
  test("file-level vendor import → admitted", () => {
    const compM = markup("div");
    const program = markup("program", [], [compM]);
    const f = file(
      "/abs/t2.scrml",
      [program],
      [vendorImport("stripe", ["Stripe"])],
    );

    const plan = firstPlan(runOne([f]).record);
    expect(plan.initialChunk.vendorUnitNames.has("stripe")).toBe(true);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §3 — Multiple components share a vendor unit
// ---------------------------------------------------------------------------

describe("§3 multiple components share a vendor unit (dedup)", () => {
  test("two sibling markup nodes in same file → cm6 admitted once", () => {
    const a = markup("h1");
    const b = markup("p");
    const program = markup("program", [], [a, b]);
    const f = file(
      "/abs/t3.scrml",
      [program],
      [vendorImport("cm6", ["Editor"])],
    );

    const plan = firstPlan(runOne([f]).record);
    expect(plan.initialChunk.vendorUnitNames.has("cm6")).toBe(true);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §4 — Unreferenced vendor unit (no component in entry-point's initial render)
// ---------------------------------------------------------------------------

describe("§4 unreferenced vendor unit → NOT admitted", () => {
  test("vendor decl in file with no entry-point component → empty", () => {
    // File A: vendor decl + a top-level fragment (no <program>; not an
    // entry point). The vendor unit lives in file A's catalog but no
    // component in file B's entry point belongs to file A.
    const fragmentA = markup("section");
    const fileA = file(
      "/abs/lib.scrml",
      [fragmentA],
      [vendorImport("cm6", ["Editor"])],
    );

    const compB = markup("h1");
    const program = markup("program", [], [compB]);
    const fileB = file("/abs/main.scrml", [program]);

    const plan = firstPlan(runOne([fileA, fileB]).record);
    expect(plan.initialChunk.vendorUnitNames.has("cm6")).toBe(false);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(0);
  });

  test("vendor decl declared but no component admitted from file → empty", () => {
    // Single file with a vendor import but the program body is empty
    // (no children) — Component 1 admits zero components; Component 5
    // therefore admits zero vendor units.
    const program = markup("program", [], []);
    const f = file(
      "/abs/empty.scrml",
      [program],
      [vendorImport("cm6", ["Editor"])],
    );

    const plan = firstPlan(runOne([f]).record);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5 — Vendor unit referenced only at N≥2 (component not in initial render)
// ---------------------------------------------------------------------------

describe("§5 vendor unit referenced only at N≥2", () => {
  test("vendor decl in a file whose components are not in N=0 set → NOT admitted", () => {
    // Conservative model at A-2.6: vendor admission is driven by the
    // initially-rendered component set (Component 1). A vendor unit
    // referenced only by a component that lives in a separate file
    // (i.e. reachable only via the interaction graph at N≥1 / N≥2)
    // is not admitted to the entry-point's initial chunk. A-2.4 +
    // A-2.7 will extend admission to prefetch tiers once the
    // interaction-graph projection lands; today the floor is
    // initial-render only.
    //
    // Setup: file A has a <program> with a <button> component (the
    // initial render); file B is a separate module file with a
    // vendor:cm6 import + a non-program markup body (B's components
    // are not reachable via Component 1 in this synthetic test). The
    // entry point from file A admits only A's vendor units (zero).
    const compA = markup("button");
    const programA = markup("program", [], [compA]);
    const fileA = file("/abs/a.scrml", [programA]);

    const offlineCompB = markup("editor");
    const fileB = file(
      "/abs/b.scrml",
      [offlineCompB],
      [vendorImport("cm6", ["Editor"])],
    );

    const plan = firstPlan(runOne([fileA, fileB]).record);
    expect(plan.initialChunk.vendorUnitNames.has("cm6")).toBe(false);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §6 — Multiple vendor units in one file → all admitted
// ---------------------------------------------------------------------------

describe("§6 multiple vendor units in one file", () => {
  test("file declares three vendor imports → all three admitted when a component lives in that file", () => {
    const compM = markup("section");
    const program = markup("program", [], [compM]);
    const f = file(
      "/abs/multi.scrml",
      [program],
      [
        vendorImport("cm6", ["Editor"]),
        vendorImport("stripe", ["Stripe"]),
        vendorImport("d3", ["select"]),
        relativeImport("./helpers.scrml", ["helper"]), // not a vendor — ignored
      ],
    );

    const plan = firstPlan(runOne([f]).record);
    expect(plan.initialChunk.vendorUnitNames.has("cm6")).toBe(true);
    expect(plan.initialChunk.vendorUnitNames.has("stripe")).toBe(true);
    expect(plan.initialChunk.vendorUnitNames.has("d3")).toBe(true);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// §7 — Opacity rule: unit admitted as a whole regardless of named imports
// ---------------------------------------------------------------------------

describe("§7 opacity rule — unit admitted as a whole atom", () => {
  test("two files import different members from same vendor unit → unit admitted once per entry point", () => {
    // SPEC §40.9.6: vendor unit's internal module graph is NOT
    // subdivided. Whether the file imports `{ Editor }` or
    // `{ Editor, Doc }`, the VendorUnitId admitted is the same
    // (`cm6`). This test wires the SAME entry-point file with two
    // different ways of asking for cm6 — both produce a single
    // VendorUnitId in the closure.
    const compM = markup("article");
    const program = markup("program", [], [compM]);
    const f = file(
      "/abs/opa.scrml",
      [program],
      [
        vendorImport("cm6", ["Editor"]),
        vendorImport("cm6", ["Doc"]), // same unit, different named import
      ],
    );

    const plan = firstPlan(runOne([f]).record);
    expect(plan.initialChunk.vendorUnitNames.has("cm6")).toBe(true);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §8 — No vendor imports → empty vendorUnitNames set
// ---------------------------------------------------------------------------

describe("§8 no vendor imports anywhere", () => {
  test("file with only relative/stdlib imports → vendorUnitNames empty", () => {
    const compM = markup("nav");
    const program = markup("program", [], [compM]);
    const f = file(
      "/abs/clean.scrml",
      [program],
      [
        relativeImport("./shared.scrml", ["helper"]),
        // No vendor imports — should produce empty vendor set.
      ],
    );

    const plan = firstPlan(runOne([f]).record);
    expect(plan.initialChunk.vendorUnitNames.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §9 — Direct helper API surfaces (regression-guard for downstream consumers)
// ---------------------------------------------------------------------------

describe("§9 direct helper API surfaces", () => {
  test("buildPerFileVendorUnitCatalog: file-level imports indexed by file path", () => {
    const f1 = file(
      "/abs/f1.scrml",
      [markup("program", [], [markup("div")])],
      [vendorImport("cm6", ["Editor"])],
    );
    const f2 = file(
      "/abs/f2.scrml",
      [markup("program", [], [markup("span")])],
      [vendorImport("stripe", ["Stripe"]), vendorImport("d3", ["select"])],
    );
    const f3 = file(
      "/abs/f3.scrml",
      [markup("program", [], [markup("p")])],
      [relativeImport("./helper.scrml", ["x"])], // not vendor — no entry
    );

    const catalog = buildPerFileVendorUnitCatalog([f1, f2, f3]);
    expect(catalog.get("/abs/f1.scrml")?.has("cm6")).toBe(true);
    expect(catalog.get("/abs/f2.scrml")?.size).toBe(2);
    expect(catalog.get("/abs/f3.scrml")).toBeUndefined();
  });

  test("buildComponentToFileIndex: markup ids map to enclosing file", () => {
    const nodeA = markup("h1");
    const nodeB = markup("p");
    const programA = markup("program", [], [nodeA]);
    const programB = markup("program", [], [nodeB]);
    const fileA = file("/abs/a.scrml", [programA]);
    const fileB = file("/abs/b.scrml", [programB]);

    const index = buildComponentToFileIndex([fileA, fileB]);
    expect(index.get(nodeA.id)).toBe("/abs/a.scrml");
    expect(index.get(nodeB.id)).toBe("/abs/b.scrml");
    expect(index.get(programA.id)).toBe("/abs/a.scrml"); // the program node itself is registered
    expect(index.get(programB.id)).toBe("/abs/b.scrml");
  });

  test("vendorUnitsUsedByComponents: explicit catalog + component set → expected unit set", () => {
    const catalog = new Map<string, Set<string>>([
      ["/abs/a.scrml", new Set(["cm6", "stripe"])],
      ["/abs/b.scrml", new Set(["d3"])],
      ["/abs/c.scrml", new Set(["zod"])],
    ]);
    const componentToFile = new Map<string | number, string>([
      [1, "/abs/a.scrml"],
      [2, "/abs/a.scrml"],
      [3, "/abs/b.scrml"],
      // id 4 → no file mapping → ignored
    ]);
    const result = vendorUnitsUsedByComponents(
      catalog,
      new Set([1, 2, 3, 4]),
      componentToFile,
    );
    expect(result.has("cm6")).toBe(true);
    expect(result.has("stripe")).toBe(true);
    expect(result.has("d3")).toBe(true);
    expect(result.has("zod")).toBe(false); // c.scrml not referenced
    expect(result.size).toBe(3);
  });
});
