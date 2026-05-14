/**
 * @module reachability/component-5
 *
 * Component 5 — `vendor_units_used_by(C_set)` per SPEC §40.9.6.
 *
 * S90 wave A-2.6 — given the component set `C_set` produced by
 * Component 1 (initially-rendered markup AST ids per §40.9.2), compute
 * the set of §41 vendor units that the components reference. Output:
 * `Set<VendorUnitId>` (string ids — the bare vendor-unit name, e.g.
 * `cm6` for `import { ... } from 'vendor:cm6'`).
 *
 * **Opacity rule (§40.9.6 normative):** each vendor unit is treated as
 * an opaque atom for splitting. The vendor unit's internal module
 * graph is NOT subdivided by the closure analysis (the bridge author
 * owns the unit's internal complexity; the unit is the contract).
 * Component 5 admits the unit as a whole — by `VendorUnitId` — and
 * leaves per-unit chunking to A-4 (Per-Route Artifact Splitter).
 *
 * **Algorithmic shape (v0.3 file-level capability model):**
 *
 *   In v0.3 the `vendor:NAME` import/use surface is FILE-LEVEL — a
 *   file's logic block may declare `import { x } from 'vendor:cm6'`
 *   (ImportDeclNode) or `use vendor:cm6 { x }` (UseDeclNode); the
 *   declaration's capability is available to every component in that
 *   file. The "per-component vendor-reference set" of §40.9.6 is
 *   therefore the same as the per-file vendor-reference set for every
 *   component declared in the file.
 *
 *   Phase 1 — per-file vendor-unit catalog.
 *     Scan each `FileAST.imports` for sources of shape `vendor:NAME`;
 *     also walk per-file logic blocks for `UseDeclNode` rows with
 *     `source: "vendor:NAME"`. Index by file path.
 *
 *   Phase 2 — per-component → enclosing-file resolution.
 *     For each component AST id in `C_set`, look up the file that
 *     declared the markup node (the entry-point's source file plus
 *     any cross-file `<component>` bodies expanded into the entry
 *     point's markup tree). Union the per-file vendor-unit sets.
 *
 *   This v0.3 model is conservative: a vendor-unit imported by a file
 *   but referenced by no component in that file is still admitted to
 *   any entry-point whose closure includes a component from that file.
 *   Tree-shaking at the per-import granularity (A-2.6.c) is OPTIONAL
 *   in v0.3 per SCOPING §A-2.6.c — DEFERRED here; the unit-level admit
 *   is the contract Component 5 ships.
 *
 * **Cross-file reach:** Component 1's `InitiallyRenderedComponents`
 * carries AST ids; Component-Expander Stage 3.2 (CE) inlines
 * cross-file component bodies into the consumer file's AST before the
 * DG / RS pipeline runs. Each AST id therefore belongs to exactly one
 * source file — the file whose `<program>` body owns the expanded
 * markup. Vendor-unit attribution flows from THAT file (the consumer),
 * not from the file where the component was originally authored.
 *
 *   Rationale: in v0.3 the vendor-unit capability is a file-level
 *   declaration that the codegen layer wires into the file's emitted
 *   JS. If component A is authored in `lib/Btn.scrml` and used in
 *   `pages/index.scrml`, the consumer's vendor declarations are what
 *   the runtime resolves. The author's separate vendor declarations
 *   only matter if they were ALSO consumed at the author site (a
 *   distinct concern not in Component 5's scope).
 *
 *   For tests + future cross-file refinement, this module exposes
 *   `buildPerFileVendorUnitCatalog(files)` and
 *   `vendorUnitsUsedByComponents(perFileCatalog, componentSetById,
 *   componentToFile)` so consumers can inject custom attribution.
 *
 * **Determinism:** vendor-unit ids are admitted in file-iteration
 * order then per-file import-declaration order. The output Set's
 * insertion order is therefore stable across runs; the A-2.8
 * canonical-key-ordering serializer sorts further for the JSON wire
 * format.
 *
 * **Pure:** does not mutate inputs. Returns fresh Maps / Sets.
 *
 * Cross-references:
 *   - SPEC.md §40.9.6 — normative semantics + opacity rule.
 *   - SPEC.md §41 — Import System (vendor units, the §40.9.6 split-unit set).
 *   - SPEC.md §41.6 — Vendoring Model.
 *   - SPEC.md §41.9 — Tree-Shaking Behavior (composes with §40.9.6).
 *   - docs/changes/a2-reachability-solver-scoping/SCOPING.md §A-2.6 —
 *     sub-task decomposition + tree-shake disposition (A-2.6.c deferred).
 *   - compiler/src/module-resolver.js — vendor: specifier parsing +
 *     project-root resolution.
 *   - ./component-1.ts — input producer (Component 1).
 */

import type {
  ASTNode,
  FileAST,
  ImportDeclNode,
  LogicNode,
  MarkupNode,
  UseDeclNode,
} from "../types/ast.ts";
import type {
  EntryPointId,
  NodeId,
  VendorUnitId,
} from "../types/reachability.ts";

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Per-entry-point vendor-unit closure.
 *
 * Keyed by `EntryPointId`; values are sets of bare vendor-unit names
 * (without the `vendor:` prefix). The Set semantics dedupe shared
 * units across components.
 */
export type VendorUnitsUsed = Map<EntryPointId, Set<VendorUnitId>>;

/**
 * Per-file vendor-unit declaration catalog.
 *
 * Keys are `FileAST.filePath` strings; values are sets of bare
 * vendor-unit names declared via `import { ... } from 'vendor:NAME'`
 * (ImportDeclNode) or `use vendor:NAME { ... }` (UseDeclNode) in the
 * file's logic blocks. Used internally + exposed for tests +
 * downstream attribution refinement.
 */
export type PerFileVendorUnitCatalog = Map<string, Set<VendorUnitId>>;

/**
 * Per-component → enclosing-file index.
 *
 * Keys are markup AST node ids (Component 1's output payload — string
 * or number depending on source); values are the absolute file paths
 * of the enclosing `FileAST.filePath`. Built by walking each file's
 * top-level AST nodes recursively and stamping every markup-id with
 * the owning file.
 *
 * The id-type coercion (string OR number) is preserved by storing
 * BOTH the raw id and its `String(...)` form as keys when they
 * differ. Consumers may look up either form.
 */
export type ComponentToFile = Map<NodeId, string>;

// ---------------------------------------------------------------------------
// Public API — top-level Component 5 driver
// ---------------------------------------------------------------------------

/**
 * Compute Component 5's output for the full compile unit.
 *
 * For each entry point's component set (Component 1's output), unions
 * the vendor-unit declarations of every file whose AST contributed a
 * component to the set.
 *
 * **Empty-input degradation:** if `initiallyRendered` has zero entry
 * points, returns an empty Map. If a file has no vendor imports, the
 * per-file catalog entry is absent and contributes nothing.
 *
 * **Pure:** does not mutate inputs.
 *
 * @param initiallyRendered Output of Component 1 — per-entry-point
 *   set of markup AST ids.
 * @param files Compile-unit `FileAST` set. Used to build BOTH the
 *   per-file vendor catalog AND the per-component file index.
 */
export function computeVendorUnitsUsed(
  initiallyRendered: Map<EntryPointId, Set<NodeId>>,
  files: FileAST[],
): VendorUnitsUsed {
  const out: VendorUnitsUsed = new Map();

  // Phase 1 — build the per-file vendor-unit catalog.
  const perFileCatalog = buildPerFileVendorUnitCatalog(files);

  // Build the per-component → file index. AST ids are unique within
  // a single compile unit (id-generator is per-compile-unit
  // monotonic) so a single Map covers every file.
  const componentToFile = buildComponentToFileIndex(files);

  // Phase 2 — per-entry-point union of contributing files' vendor sets.
  for (const [ep, componentSet] of initiallyRendered) {
    const vendorSet = vendorUnitsUsedByComponents(
      perFileCatalog,
      componentSet,
      componentToFile,
    );
    out.set(ep, vendorSet);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Phase 1 — per-file vendor-unit catalog
// ---------------------------------------------------------------------------

/**
 * Build a per-file vendor-unit catalog from a `FileAST[]`.
 *
 * Sources scanned:
 *
 *   1. `FileAST.imports` — `ImportDeclNode` rows whose `source` field
 *      starts with `"vendor:"`. The bare unit name is `source.slice(7)`.
 *
 *   2. Each file's logic blocks (LogicNode children of top-level
 *      markup, and `LogicNode` nodes at the file root) — `UseDeclNode`
 *      rows whose `source` starts with `"vendor:"`. Same name
 *      extraction.
 *
 * Files with zero vendor declarations contribute no map entry (the
 * caller can rely on `catalog.get(filePath) ?? new Set()`).
 *
 * **Determinism:** import order within a file is preserved by the Set
 * insertion semantics — the first declaration's order wins, duplicates
 * are dropped.
 */
export function buildPerFileVendorUnitCatalog(
  files: FileAST[],
): PerFileVendorUnitCatalog {
  const out: PerFileVendorUnitCatalog = new Map();

  for (const file of files) {
    const vendorUnits = new Set<VendorUnitId>();

    // 1. File-level imports (the canonical hoisted location per
    //    `FileAST.imports` — see ast.ts:1398).
    if (Array.isArray(file.imports)) {
      for (const imp of file.imports) {
        const id = extractVendorUnitId(imp);
        if (id !== null) vendorUnits.add(id);
      }
    }

    // 2. Logic-block-scoped use-decls. `use vendor:NAME { ... }` may
    //    appear in any logic block. We walk the file's top-level
    //    AST and pick up the LogicNode children's `imports` (which
    //    aggregate the local use-decls) AND each logic node's `body`
    //    for inline use-decl statements.
    walkLogicBlocks(file, (logic) => {
      // The LogicNode.imports field is documented as carrying
      // import-decl hoists; use-decl statements appear in
      // LogicNode.body as ASTNode statements.
      if (Array.isArray(logic.imports)) {
        for (const imp of logic.imports) {
          const id = extractVendorUnitId(imp);
          if (id !== null) vendorUnits.add(id);
        }
      }
      if (Array.isArray(logic.body)) {
        for (const stmt of logic.body) {
          if (!stmt || typeof stmt !== "object") continue;
          if ((stmt as { kind?: string }).kind === "use-decl") {
            const id = extractVendorUnitId(stmt as UseDeclNode);
            if (id !== null) vendorUnits.add(id);
          }
          if ((stmt as { kind?: string }).kind === "import-decl") {
            const id = extractVendorUnitId(stmt as ImportDeclNode);
            if (id !== null) vendorUnits.add(id);
          }
        }
      }
    });

    if (vendorUnits.size > 0) {
      out.set(file.filePath, vendorUnits);
    }
  }

  return out;
}

/**
 * Extract the bare vendor-unit name from an `ImportDeclNode` or
 * `UseDeclNode`.
 *
 * Returns the substring after `"vendor:"` when `source` matches the
 * vendor prefix. Returns null for any other source shape (relative,
 * stdlib, absent, malformed).
 *
 * Mirrors `module-resolver.js:69` — the canonical vendor-prefix
 * classifier.
 */
function extractVendorUnitId(
  decl: ImportDeclNode | UseDeclNode | null | undefined,
): VendorUnitId | null {
  if (!decl) return null;
  const src = decl.source;
  if (typeof src !== "string") return null;
  if (!src.startsWith("vendor:")) return null;
  const name = src.slice("vendor:".length);
  if (name.length === 0) return null;
  return name;
}

/**
 * Walk every `LogicNode` in a file, invoking `cb` for each.
 *
 * LogicNodes may appear:
 *   - At the top level of `FileAST.nodes` (rare; e.g. a fragment
 *     file with leading logic).
 *   - As children of any markup node (e.g. `<program>` body holding
 *     a `${ ... }` block, or `<channel>` / `<state>` bodies).
 *
 * This walker is recursive through the markup tree. Engine
 * state-children also contain logic; the recursion follows
 * `MarkupNode.children` uniformly.
 */
function walkLogicBlocks(file: FileAST, cb: (logic: LogicNode) => void): void {
  const nodes = getTopLevelNodes(file);
  for (const n of nodes) {
    walkNodeForLogic(n, cb);
  }
}

function walkNodeForLogic(node: ASTNode, cb: (logic: LogicNode) => void): void {
  if (!node || typeof node !== "object") return;
  if ((node as { kind?: string }).kind === "logic") {
    cb(node as LogicNode);
    return; // logic-blocks don't carry nested logic-blocks of their own.
  }
  if (node.kind === "markup") {
    const m = node as MarkupNode;
    for (const child of m.children) walkNodeForLogic(child, cb);
  }
}

// ---------------------------------------------------------------------------
// Per-component → file index
// ---------------------------------------------------------------------------

/**
 * Build a `Map<NodeId, filePath>` index for every markup AST id in
 * the compile unit.
 *
 * Walks each `FileAST` top-level nodes recursively; for every markup
 * node encountered, stamps `node.id → file.filePath` into the index.
 * The `MarkupNode.id` type is `number`, but Component 1 carries it
 * as `NodeId = string | number` — we register BOTH forms (raw +
 * stringified) to tolerate either lookup style. This is a small
 * memory cost (≤2× the marker count) for an O(1) lookup on either id
 * representation.
 *
 * Logic / state / SQL / engine / channel non-markup nodes are not
 * registered — Component 1's payload is exclusively markup ids.
 *
 * **First-wins** on the rare cross-file id collision (shouldn't
 * happen — the id generator is monotonic per compile unit — but the
 * walker is robust to test scenarios that bypass the generator).
 */
export function buildComponentToFileIndex(files: FileAST[]): ComponentToFile {
  const out: ComponentToFile = new Map();

  for (const file of files) {
    const nodes = getTopLevelNodes(file);
    for (const n of nodes) {
      indexMarkupIds(n, file.filePath, out);
    }
  }

  return out;
}

function indexMarkupIds(
  node: ASTNode,
  filePath: string,
  index: ComponentToFile,
): void {
  if (!node || typeof node !== "object") return;
  if (node.kind !== "markup") {
    // Some non-markup nodes (e.g. LogicNode) contain markup-bearing
    // children inside their bodies; in well-formed v0.3 ASTs the
    // initially-rendered surface lives under markup-rooted subtrees
    // only, so we don't traverse non-markup statement bodies here.
    return;
  }
  const m = node as MarkupNode;
  if (!index.has(m.id)) {
    index.set(m.id, filePath);
    // Register the stringified form too — Component 1 emits raw ids
    // (numbers from the AST builder), but downstream consumers /
    // serializers may stringify. NodeId = string | number per
    // types/reachability.ts:61.
    const sId: NodeId = String(m.id);
    if (!index.has(sId)) {
      index.set(sId, filePath);
    }
  }
  for (const child of m.children) {
    indexMarkupIds(child, filePath, index);
  }
}

// ---------------------------------------------------------------------------
// Phase 2 — per-entry-point vendor-unit union
// ---------------------------------------------------------------------------

/**
 * For a single entry point's component set, return the set of vendor
 * units used by that set.
 *
 * Each component AST id is resolved to its enclosing file via
 * `componentToFile`; the file's vendor-unit set (from
 * `perFileCatalog`) is unioned into the output. Components whose
 * file lookup fails (synthetic / unregistered) contribute nothing.
 *
 * Exported so future cross-file attribution refinements (e.g.
 * per-component vendor-reference tagging at A-1.6+) can call this
 * with a custom componentToFile + perFileCatalog without re-running
 * the Phase 1 / index builders.
 */
export function vendorUnitsUsedByComponents(
  perFileCatalog: PerFileVendorUnitCatalog,
  componentSet: Set<NodeId>,
  componentToFile: ComponentToFile,
): Set<VendorUnitId> {
  const out = new Set<VendorUnitId>();

  for (const astId of componentSet) {
    // Try raw id first, then string-coerced. The index registers
    // both when they differ; consumers that pass numbers vs strings
    // both succeed.
    const filePath =
      componentToFile.get(astId) ?? componentToFile.get(String(astId));
    if (!filePath) continue;
    const vendorUnits = perFileCatalog.get(filePath);
    if (!vendorUnits) continue;
    for (const unit of vendorUnits) {
      out.add(unit);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Internals — FileAST helpers (mirrors entry-points.ts / component-1.ts)
// ---------------------------------------------------------------------------

/**
 * Resolve a file's top-level AST node list.
 *
 * Mirrors the helper in `./entry-points.ts` + `./component-1.ts` —
 * `FileAST` may expose nodes either as a top-level `.nodes` property
 * OR nested under `.ast.nodes` depending on which pipeline stage
 * produced the value.
 */
function getTopLevelNodes(file: FileAST): ASTNode[] {
  if (Array.isArray((file as { nodes?: ASTNode[] }).nodes)) {
    return (file as { nodes: ASTNode[] }).nodes;
  }
  const ast = (file as unknown as { ast?: { nodes?: ASTNode[] } }).ast;
  if (ast && Array.isArray(ast.nodes)) return ast.nodes;
  return [];
}
