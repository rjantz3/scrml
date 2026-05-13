/**
 * @module reachability/entry-points
 *
 * Entry-point enumeration for the Stage 7.6 Reachability Solver.
 *
 * S89 wave A-2.2.a — enumerates `ReachabilityEntryPoint[]` from the
 * compile unit's `FileAST[]` per the v0.3 program shape (SPEC §40.8):
 *
 *   - One entry point per `<page>` declaration (multi-page apps).
 *   - One entry point per entry-file `<program>` body whose body has
 *     ZERO `<page>` children (SPA shape, §40.8.1).
 *
 * **OQ-A2-E disposition (S89, "no synthesis on auth-redirect"):**
 * the enumerator does NOT create a synthetic entry point for the
 * auth-redirect destination. Per §40.9.9 paragraph "For viewer
 * Anonymous":
 *
 *   "the auth redirect to a login route is the analysis's output for
 *    that viewer. The login route is a separate entry point with its
 *    own playable surface."
 *
 * The login route is itself a `<page>` declaration somewhere in the
 * compile unit — Component 1 enumerates it independently. No synthesis.
 *
 * Cross-references:
 *   - SPEC.md §40.8 — v0.3 program shape (the source of truth for
 *     entry-point shapes).
 *   - SPEC.md §40.9.2 — Component 1 normative dependency on enumeration.
 *   - SPEC.md §40.9.9 — Worked example covering SPA, multi-page,
 *     viewer-anonymous redirect.
 *   - compiler/src/route-inference.ts `RouteMap` — alternative source
 *     for filesystem-derived page routes; this enumerator reads BOTH
 *     RouteMap (for url patterns) and the AST (for inline `<page>` decls
 *     in a multi-page entry-file program).
 */

import type {
  ASTNode,
  FileAST,
  MarkupNode,
} from "../types/ast.ts";
import type {
  EntryPointId,
  NodeId,
  ReachabilityEntryPoint,
} from "../types/reachability.ts";

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Enumerate entry points from a `FileAST[]`.
 *
 * Algorithm:
 *
 *   1. For each file:
 *      a. Find the root `<program>` markup node, if any.
 *      b. If `<program>` is absent → skip the file (modules, pure-channel
 *         files, fragment files).
 *      c. Find the immediate `<page>` children of the `<program>` body.
 *         If non-empty: emit one ReachabilityEntryPoint per `<page>` child
 *         (multi-page-in-entry-file shape).
 *         If empty: emit one ReachabilityEntryPoint for the `<program>`
 *         body itself (SPA shape per §40.8.1).
 *   2. The `routePath` for `<page>` entry points is derived from the
 *      `path=` attribute when present; otherwise null (the consumer can
 *      cross-reference RouteMap for filesystem-derived URLs).
 *
 * **Determinism:** entry points are emitted in file-iteration order;
 * within a file, `<page>` children are emitted in source order. The
 * caller MAY rely on this order for stable downstream output.
 *
 * **Pure:** does not mutate any input. Returns a fresh array each call.
 */
export function enumerateEntryPoints(files: FileAST[]): ReachabilityEntryPoint[] {
  const out: ReachabilityEntryPoint[] = [];

  for (const file of files) {
    const nodes = getTopLevelNodes(file);
    const programNode = findRootProgram(nodes);
    if (!programNode) continue;

    const pageChildren = directPageChildren(programNode);

    if (pageChildren.length === 0) {
      // SPA shape — the program body itself IS the entry point.
      out.push({
        id: spaEntryId(file.filePath),
        filePath: file.filePath,
        routePath: null,
        shape: "spa-program",
        rootNodeId: programNode.id,
      });
      continue;
    }

    // Multi-page shape — one entry point per `<page>` child.
    let pageIndex = 0;
    for (const page of pageChildren) {
      const routePath = extractPathAttr(page);
      out.push({
        id: pageEntryId(file.filePath, pageIndex, routePath),
        filePath: file.filePath,
        routePath,
        shape: "page",
        rootNodeId: page.id,
      });
      pageIndex++;
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Walk helpers
// ---------------------------------------------------------------------------

/**
 * Find the first top-level `<program>` markup node in a file's node list.
 *
 * Mirrors the ast-builder convention (`compiler/src/ast-builder.js`
 * lines 10479-10492) — the canonical home of `hasProgramRoot`.
 */
function findRootProgram(nodes: ASTNode[] | undefined): MarkupNode | null {
  if (!Array.isArray(nodes)) return null;
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    if (n.kind === "markup" && (n as MarkupNode).tag === "program") {
      return n as MarkupNode;
    }
  }
  return null;
}

/**
 * Resolve a file's top-level AST node list.
 *
 * Per the in-house convention (mirroring `compiler/src/api.js` lines
 * 945 + 1024), files may expose nodes either as a top-level `.nodes`
 * property OR nested under `.ast.nodes`. This helper bridges both.
 */
function getTopLevelNodes(file: FileAST): ASTNode[] {
  // Direct .nodes form (the canonical type-surface shape).
  if (Array.isArray((file as { nodes?: ASTNode[] }).nodes)) {
    return (file as { nodes: ASTNode[] }).nodes;
  }
  // Nested .ast.nodes form (some pipeline stages emit this).
  const ast = (file as unknown as { ast?: { nodes?: ASTNode[] } }).ast;
  if (ast && Array.isArray(ast.nodes)) return ast.nodes;
  return [];
}

/**
 * Find immediate `<page>` children of a `<program>` body.
 *
 * Only direct children — `<page>` nested inside another markup element
 * is not a top-level page declaration per §40.8.
 */
function directPageChildren(program: MarkupNode): MarkupNode[] {
  const out: MarkupNode[] = [];
  for (const child of program.children) {
    if (!child || typeof child !== "object") continue;
    if (child.kind === "markup" && (child as MarkupNode).tag === "page") {
      out.push(child as MarkupNode);
    }
  }
  return out;
}

/**
 * Extract a `path=` attribute string from a `<page>` markup node.
 *
 * Returns the raw path string (e.g. `/loads`) when present as a string
 * literal; returns null for absent / non-string-literal forms (the
 * filesystem-derived URL is the fallback, computed by RI).
 */
function extractPathAttr(page: MarkupNode): string | null {
  for (const attr of page.attrs) {
    if (attr.name !== "path") continue;
    if (attr.value.kind === "string-literal") return attr.value.value;
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// ID construction
// ---------------------------------------------------------------------------

/**
 * Stable, deterministic id for an SPA-shape entry point.
 *
 * Format: `<filePath>#program` — file + `#program` discriminator so a
 * file that simultaneously declares a SPA program AND emits `<page>`
 * children in a sibling file does not collide.
 */
function spaEntryId(filePath: string): EntryPointId {
  return `${filePath}#program`;
}

/**
 * Stable id for a `<page>` entry point.
 *
 * When `path=` is present, encode it directly (deterministic across
 * runs). When absent, fall back to `#page-<index>` (positional).
 */
function pageEntryId(filePath: string, index: number, routePath: string | null): EntryPointId {
  if (routePath !== null) return `${filePath}#page@${routePath}`;
  return `${filePath}#page-${index}`;
}

// ---------------------------------------------------------------------------
// Re-exports (NodeId convenience)
// ---------------------------------------------------------------------------

/**
 * The DG / AST node id type — re-exported here so callers can keep
 * imports localized to the reachability/ module.
 */
export type { NodeId };
