/**
 * Phase A10 Phase 1 — engine-decl.bodyChildren walkable AST.
 *
 * Authored S78 2026-05-10.
 * SCOPE doc: docs/changes/phase-a10-engine-state-child-body-render/SCOPE-AND-DECOMPOSITION.md
 * SURVEY doc: docs/changes/phase-a10-engine-state-child-body-render/PHASE-0-SURVEY.md
 *
 * Per SCOPE §3.4 (Option C-prime, ratified S78), Phase 1 elevates engine
 * state-child bodies from `rulesRaw: string` to walkable `bodyChildren:
 * ASTNode[]`. The block-splitter already produces typed walkable children;
 * pre-A10 ast-builder discarded them. This test suite asserts the new
 * field is populated correctly across the canonical body shapes.
 *
 * Coverage:
 *   §1 Empty engine body — bodyChildren is undefined or [].
 *   §2 Simple state-children — bodyChildren contains one entry per child;
 *      nested markup (button) reachable as descendant.
 *   §3 Body with `${...}` interpolation — logic node reachable.
 *   §4 Body with text content — text node reachable.
 *   §5 <onTimeout> / <onTransition> siblings — appear as children.
 *   §6 rulesRaw unchanged — engine-statechild-parser secondary pass produces
 *      same EngineStateChildEntry[] as pre-A10.
 */

import { describe, expect, test } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { parseEngineStateChildren } from "../../src/engine-statechild-parser.ts";

function buildAst(source, filePath = "test.scrml") {
  const bs = splitBlocks(filePath, source);
  return buildAST(bs).ast;
}

function findEngineDecl(ast) {
  function walk(nodes) {
    if (!nodes) return null;
    for (const n of nodes) {
      if (!n) continue;
      if (n.kind === "engine-decl") return n;
      if (n.children) {
        const found = walk(n.children);
        if (found) return found;
      }
      if (n.body) {
        const found = walk(n.body);
        if (found) return found;
      }
    }
    return null;
  }
  let found = walk(ast.nodes || []);
  if (!found && Array.isArray(ast.machineDecls)) {
    for (const m of ast.machineDecls) {
      if (m && m.kind === "engine-decl") { found = m; break; }
    }
  }
  return found;
}

function findDescendantByKind(node, kind, predicate = () => true) {
  if (!node) return null;
  if (node.kind === kind && predicate(node)) return node;
  for (const k of ["children", "body", "bodyChildren", "consequent", "alternate"]) {
    const v = node[k];
    if (Array.isArray(v)) {
      for (const c of v) {
        const found = findDescendantByKind(c, kind, predicate);
        if (found) return found;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// §1 — Empty engine body
// ---------------------------------------------------------------------------
describe("Phase A10 §1 — empty engine body", () => {
  test("empty engine body produces undefined or [] bodyChildren", () => {
    // Self-closing `<engine for=Phase initial=.Idle/>` — no children at all.
    const src = `
type Phase:enum = { Idle, Loading }
<engine for=Phase initial=.Idle/>
`;
    const ast = buildAst(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    // bodyChildren should be either undefined (zero-child branch never ran)
    // or an empty array.
    if (engine.bodyChildren !== undefined) {
      expect(Array.isArray(engine.bodyChildren)).toBe(true);
      expect(engine.bodyChildren.length).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// §2 — Simple state-children with markup body
// ---------------------------------------------------------------------------
describe("Phase A10 §2 — simple state-children with markup body", () => {
  test("button inside Idle state-child is reachable via bodyChildren", () => {
    const src = `
type Phase:enum = { Idle, Loading }
function load() {}
<engine for=Phase initial=.Idle>
  <Idle rule=.Loading>
    <button onclick=load()>Load</button>
  </>
  <Loading></>
</>
`;
    const ast = buildAst(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    expect(Array.isArray(engine.bodyChildren)).toBe(true);
    expect(engine.bodyChildren.length).toBeGreaterThan(0);

    // The button must be reachable somewhere in the bodyChildren tree.
    // Markup AST nodes use `tag` for the element name (NOT `name`).
    const button = findDescendantByKind(engine, "markup", (n) => n.tag === "button");
    expect(button).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §3 — Body with ${...} interpolation
// ---------------------------------------------------------------------------
describe("Phase A10 §3 — body with ${...} interpolation", () => {
  test("logic node from ${...} is reachable in bodyChildren", () => {
    const src = `
type Phase:enum = { Error(msg: string), Idle }
<engine for=Phase initial=.Idle>
  <Idle></>
  <Error msg>
    <div>\${msg}</div>
  </>
</>
`;
    const ast = buildAst(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    expect(Array.isArray(engine.bodyChildren)).toBe(true);

    // Find a logic node anywhere in the engine body (the ${msg} interpolation).
    const logic = findDescendantByKind(engine, "logic");
    expect(logic).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §4 — Body with text content
// ---------------------------------------------------------------------------
describe("Phase A10 §4 — body with text content", () => {
  test("text node reachable from bodyChildren", () => {
    const src = `
type Phase:enum = { Loading, Idle }
<engine for=Phase initial=.Idle>
  <Idle rule=.Loading></>
  <Loading>
    Loading...
  </>
</>
`;
    const ast = buildAst(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    expect(Array.isArray(engine.bodyChildren)).toBe(true);

    // Text "Loading..." should be reachable as a text node descendant.
    const text = findDescendantByKind(engine, "text", (n) => /Loading/.test(n.value || ""));
    expect(text).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §5 — <onTimeout> / <onTransition> siblings appear in bodyChildren
// ---------------------------------------------------------------------------
describe("Phase A10 §5 — structural-element siblings in bodyChildren", () => {
  test("<onTimeout/> appears as a child node when present in engine body", () => {
    const src = `
type Phase:enum = { Idle, Loading }
<engine for=Phase initial=.Idle>
  <Idle rule=.Loading>
    <onTimeout after=30s to=.Loading/>
  </>
  <Loading></>
</>
`;
    const ast = buildAst(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    expect(Array.isArray(engine.bodyChildren)).toBe(true);

    // <onTimeout/> recognized as either a markup OR state node depending on
    // block-splitter classification — both are acceptable structurally; the
    // key invariant is the node IS present somewhere as a descendant.
    // Markup uses `tag`; state uses `stateType`.
    const onTimeoutMarkup = findDescendantByKind(
      engine,
      "markup",
      (n) => n.tag === "onTimeout",
    );
    const onTimeoutState = findDescendantByKind(
      engine,
      "state",
      (n) => n.stateType === "onTimeout",
    );
    expect(onTimeoutMarkup !== null || onTimeoutState !== null).toBe(true);
  });

  test("<onTransition/> appears in bodyChildren when present", () => {
    const src = `
type Phase:enum = { Idle, Loading }
<engine for=Phase initial=.Idle>
  <Idle rule=.Loading>
    <onTransition to=.Loading>
      \${ /* analytics */ }
    </>
  </>
  <Loading></>
</>
`;
    const ast = buildAst(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    expect(Array.isArray(engine.bodyChildren)).toBe(true);

    const onTransition = findDescendantByKind(
      engine,
      "markup",
      (n) => n.tag === "onTransition",
    ) || findDescendantByKind(
      engine,
      "state",
      (n) => n.stateType === "onTransition",
    );
    expect(onTransition).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §6 — rulesRaw unchanged; engine-statechild-parser produces same output
// ---------------------------------------------------------------------------
describe("Phase A10 §6 — rulesRaw + engine-statechild-parser regression", () => {
  test("rulesRaw still populated; parseEngineStateChildren produces entries", () => {
    const src = `
type Phase:enum = { Idle, Loading, Done }
<engine for=Phase initial=.Idle>
  <Idle rule=.Loading></>
  <Loading rule=.Done></>
  <Done></>
</>
`;
    const ast = buildAst(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    // rulesRaw should still be populated with the body text content.
    expect(typeof engine.rulesRaw).toBe("string");
    expect(engine.rulesRaw.length).toBeGreaterThan(0);

    // Run the secondary structural parser — same as SYM PASS 11 does.
    const entries = parseEngineStateChildren(engine.rulesRaw);
    expect(Array.isArray(entries)).toBe(true);
    // Should find at least the three state-children we declared.
    const tags = entries.map((e) => e.tag);
    expect(tags).toContain("Idle");
    expect(tags).toContain("Loading");
    expect(tags).toContain("Done");
  });

  test("bodyChildren is ADDITIVE — non-A10 fields unchanged on engine-decl", () => {
    const src = `
type Phase:enum = { Idle }
<engine for=Phase initial=.Idle>
  <Idle></>
</>
`;
    const ast = buildAst(src);
    const engine = findEngineDecl(ast);
    expect(engine).not.toBeNull();
    // Sanity-check that pre-A10 fields are still all present + correct.
    expect(engine.kind).toBe("engine-decl");
    expect(engine.governedType).toBe("Phase");
    expect(engine.varName).toBe("phase");
    expect(engine.initialVariant).toBe("Idle");
    expect(typeof engine.rulesRaw).toBe("string");
    expect(engine.pinned).toBe(false);
    expect(engine.legacyMachineKeyword).toBe(false);
    // bodyChildren is the new field.
    expect(Array.isArray(engine.bodyChildren)).toBe(true);
  });
});
