/**
 * Phase A1b Step B17 — components-vs-engines residual fire-site tests
 * (PASS 11 — `walkRejectEnginesInComponentDefChildren`).
 *
 * Per SPEC §51.0.K (Move 20) + §34 catalog row E-COMPONENT-ENGINE-SCOPE.
 *
 * Phase 0 finding (see `docs/changes/phase-a1b-step-b17-ontransition-component-engine/SURVEY.md`):
 *   B17's audit §2 fire-set was:
 *     1. `<onTransition>` placement + form validation (engine state-children)
 *     2. `effect=` placement + single-target invariant
 *     3. `<onTransition>`/`effect=` forbidden inside `<match>` arms
 *     4. E-COMPONENT-ENGINE-SCOPE residual (engine inside component body)
 *     5. Engine mount tag inside component body
 *
 *   ALL items DEFERRED end-to-end — the underlying AST surfaces are not
 *   parsed today. Specifically: engine-decls live only as children of
 *   markup containers (`<program>`, top-level), and ast-builder.js
 *   line 9149-9151 enforces "engine-decl nodes are children of markup
 *   (program), not logic" — they never appear inside a logic-block
 *   body, and so never get vacuumed into a `component-def.defChildren`
 *   array (which collects logic-body siblings only — line 8647-8663).
 *
 * **What B17 SHIPS:** PASS 11 walker — defensive scaffolding that fires
 * `E-COMPONENT-ENGINE-SCOPE` if/when an `engine-decl` appears in a
 * `component-def.defChildren` array. The walker is exercised here via
 * SYNTHESIZED AST construction, since the parser pipeline cannot
 * produce that shape today. When a future precondition step (component-
 * body markup parser, or relaxation of the engine-only-in-markup
 * placement rule) makes the shape reachable end-to-end, the walker is
 * already correct and the deferred .skip tests can activate.
 *
 * Coverage areas:
 *   §B17.1 — synthesized AST: engine-decl in defChildren → fires diagnostic
 *   §B17.2 — synthesized AST: no engine in defChildren → no fire
 *   §B17.3 — synthesized AST: multiple engines → fire per engine
 *   §B17.4 — synthesized AST: engine `var=` name surfaced in message
 *   §B17.5 — synthesized AST: engine without var/governedType → falls back gracefully
 *   §B17.6 — synthesized AST: nested component-def inside another's defChildren
 *   §B17.7 — DEFERRED end-to-end test stubs (.skip with rationale)
 */

import { describe, expect, test } from "bun:test";
import { runSYM } from "../../src/symbol-table.ts";

/**
 * Build a minimal FileAST shape carrying the synthesized component-def +
 * engine-decl arrangement. We bypass the parser pipeline because the
 * parser does not produce this shape today (Phase 0 finding).
 */
function makeFileAST({ components = [], extraNodes = [] } = {}) {
  return {
    filePath: "test.scrml",
    nodes: extraNodes.length > 0 ? [...components, ...extraNodes] : [...components],
    imports: [],
    exports: [],
    components,
    typeDecls: [],
    spans: {},
    hasProgramRoot: false,
    authConfig: null,
    middlewareConfig: null,
    machineDecls: [],
  };
}

function makeEngineDecl({
  governedType = "MarioState",
  varName = "marioState",
  initialVariant = "Small",
  span = { file: "test.scrml", start: 100, end: 150, line: 5, col: 1 },
} = {}) {
  return {
    id: 100,
    kind: "engine-decl",
    engineName: varName,
    governedType,
    rulesRaw: ".Small => .Big",
    sourceVar: null,
    varName,
    varNameOverride: null,
    initialVariant,
    pinned: false,
    isExported: false,
    legacyMachineKeyword: false,
    span,
  };
}

function makeComponentDef({ name = "Card", defChildren = [] } = {}) {
  return {
    id: 50,
    kind: "component-def",
    name,
    raw: `<div>${name}</div>`,
    defChildren,
    span: { file: "test.scrml", start: 0, end: 30, line: 1, col: 1 },
  };
}

function getComponentEngineScopeErrors(symResult) {
  return symResult.errors.filter((e) => e.code === "E-COMPONENT-ENGINE-SCOPE");
}

// ---------------------------------------------------------------------------
// §B17 — synthesized-AST coverage of PASS 11 walker
// ---------------------------------------------------------------------------

describe("B17 — PASS 11 fires E-COMPONENT-ENGINE-SCOPE on engine-decl in component-def.defChildren (synthesized AST)", () => {
  test("§B17.1 single engine in defChildren → one fire", () => {
    const engine = makeEngineDecl();
    const card = makeComponentDef({ name: "Card", defChildren: [engine] });
    const ast = makeFileAST({ components: [card] });
    const sym = runSYM({ filePath: ast.filePath, ast });
    const errs = getComponentEngineScopeErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].code).toBe("E-COMPONENT-ENGINE-SCOPE");
    expect(errs[0].severity).toBe("error");
    expect(errs[0].message).toContain("Card");
    expect(errs[0].message).toContain("MarioState");
    expect(errs[0].message).toContain("marioState");
    // Span is the engine's span, not the component's.
    expect(errs[0].span.start).toBe(engine.span.start);
  });

  test("§B17.2 component-def with NO engine in defChildren → no fire", () => {
    const card = makeComponentDef({
      name: "Card",
      defChildren: [
        // Bare-expr / non-engine sibling — should not trip the walker.
        { id: 200, kind: "css-inline", body: "color:red;", span: { file: "test.scrml", start: 0, end: 10, line: 1, col: 1 } },
      ],
    });
    const ast = makeFileAST({ components: [card] });
    const sym = runSYM({ filePath: ast.filePath, ast });
    expect(getComponentEngineScopeErrors(sym).length).toBe(0);
  });

  test("§B17.3 multiple engines in one component's defChildren → one fire per engine", () => {
    const engineA = makeEngineDecl({ governedType: "MarioState", varName: "marioState",
      span: { file: "test.scrml", start: 100, end: 150, line: 5, col: 1 } });
    const engineB = makeEngineDecl({ governedType: "Health", varName: "health",
      span: { file: "test.scrml", start: 200, end: 250, line: 8, col: 1 } });
    const card = makeComponentDef({ name: "Card", defChildren: [engineA, engineB] });
    const ast = makeFileAST({ components: [card] });
    const sym = runSYM({ filePath: ast.filePath, ast });
    const errs = getComponentEngineScopeErrors(sym);
    expect(errs.length).toBe(2);
    const messages = errs.map((e) => e.message).join("\n");
    expect(messages).toContain("MarioState");
    expect(messages).toContain("Health");
    // Both spans recovered.
    const starts = errs.map((e) => e.span.start).sort((a, b) => a - b);
    expect(starts).toEqual([engineA.span.start, engineB.span.start]);
  });

  test("§B17.4 multiple component-defs each carrying their own engine → one fire per (component, engine) pair", () => {
    const engineA = makeEngineDecl({ governedType: "MarioState", varName: "marioState",
      span: { file: "test.scrml", start: 100, end: 150, line: 5, col: 1 } });
    const engineB = makeEngineDecl({ governedType: "Health", varName: "playerHealth",
      span: { file: "test.scrml", start: 300, end: 350, line: 12, col: 1 } });
    const card1 = makeComponentDef({ name: "Card1", defChildren: [engineA] });
    const card2 = makeComponentDef({ name: "Card2", defChildren: [engineB] });
    const ast = makeFileAST({ components: [card1, card2] });
    const sym = runSYM({ filePath: ast.filePath, ast });
    const errs = getComponentEngineScopeErrors(sym);
    expect(errs.length).toBe(2);
    const messages = errs.map((e) => e.message).join("\n");
    expect(messages).toContain("Card1");
    expect(messages).toContain("Card2");
    expect(messages).toContain("marioState");
    expect(messages).toContain("playerHealth");
  });

  test("§B17.5 engine `var=` override surfaces in the diagnostic message", () => {
    const engine = makeEngineDecl({ governedType: "Health", varName: "playerHealth" });
    const card = makeComponentDef({ name: "PlayerCard", defChildren: [engine] });
    const ast = makeFileAST({ components: [card] });
    const sym = runSYM({ filePath: ast.filePath, ast });
    const errs = getComponentEngineScopeErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("playerHealth");
    expect(errs[0].message).toContain("Health");
    expect(errs[0].message).toContain("PlayerCard");
  });

  test("§B17.6 engine-decl missing varName + governedType → graceful fallback", () => {
    // Defensive: malformed AST shouldn't crash the walker.
    const engine = makeEngineDecl();
    delete engine.varName;
    delete engine.governedType;
    const card = makeComponentDef({ name: "Card", defChildren: [engine] });
    const ast = makeFileAST({ components: [card] });
    const sym = runSYM({ filePath: ast.filePath, ast });
    const errs = getComponentEngineScopeErrors(sym);
    expect(errs.length).toBe(1);
    // Message uses the generic placeholder when neither var nor type is set.
    expect(errs[0].message).toContain("`<engine ...>`");
    expect(errs[0].message).toContain("Card");
  });

  test("§B17.7 nested component-def inside another's defChildren — engine in NESTED → one fire (not double)", () => {
    // A nested component-def inside the outer's defChildren is itself walked
    // — its defChildren are inspected too. An engine in the NESTED only
    // fires once (against the nested component's name).
    const innerEngine = makeEngineDecl({ governedType: "MarioState", varName: "marioState" });
    const innerCard = makeComponentDef({ name: "InnerCard", defChildren: [innerEngine] });
    const outerCard = makeComponentDef({ name: "OuterCard", defChildren: [innerCard] });
    const ast = makeFileAST({ components: [outerCard] });
    const sym = runSYM({ filePath: ast.filePath, ast });
    const errs = getComponentEngineScopeErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("InnerCard");
    // OuterCard should NOT also be named — the engine isn't directly in
    // OuterCard's defChildren.
    expect(errs[0].message).not.toContain("OuterCard");
  });

  test("§B17.8 component-def in ast.nodes but missing from ast.components → still walked via tree recursion", () => {
    // The walker recurses through node.body / node.children / arms, so a
    // component-def reachable via the tree (but not collected into
    // ast.components) is still inspected.
    const engine = makeEngineDecl();
    const orphanedCard = makeComponentDef({ name: "OrphanedCard", defChildren: [engine] });
    const ast = makeFileAST({
      components: [], // intentionally empty
      extraNodes: [orphanedCard],
    });
    const sym = runSYM({ filePath: ast.filePath, ast });
    const errs = getComponentEngineScopeErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("OrphanedCard");
  });

  test("§B17.9 component-def reachable via a parent body[] array → still walked", () => {
    // Synthesize a "container" node whose .body holds the component-def.
    // walkRejectEnginesInComponentDefChildren descends into node.body, so
    // the component's defChildren are still inspected.
    const engine = makeEngineDecl();
    const card = makeComponentDef({ name: "ChildCard", defChildren: [engine] });
    const container = {
      id: 1000,
      kind: "logic",
      body: [card],
      span: { file: "test.scrml", start: 0, end: 200, line: 1, col: 1 },
    };
    const ast = makeFileAST({ components: [], extraNodes: [container] });
    const sym = runSYM({ filePath: ast.filePath, ast });
    const errs = getComponentEngineScopeErrors(sym);
    expect(errs.length).toBe(1);
    expect(errs[0].message).toContain("ChildCard");
  });
});

// ---------------------------------------------------------------------------
// §B17.deferred — DEFERRED end-to-end cases (preconditions not met)
// ---------------------------------------------------------------------------

describe("B17 — DEFERRED end-to-end cases (preconditions not met)", () => {
  test.skip("[deferred] end-to-end: engine-decl in component-def.defChildren via parser", () => {
    // Phase 0 finding: ast-builder line 9149-9151 enforces engine-decl
    // nodes are children of markup (program), not logic. Logic bodies
    // (`${...}`) are where defChildren consumption happens. Engines
    // therefore never end up in defChildren via the current parser.
    //
    // Activates when:
    //   (a) component-body markup parser lands and synthesizes
    //       walkable component bodies as AST children (not raw strings); OR
    //   (b) the bare-form engine inside a logic body is lifted into an
    //       engine-decl AST node.
    //
    // Expected: same diagnostic shape as the synthesized §B17.1 case.
    expect(true).toBe(true);
  });

  test.skip("[deferred] end-to-end: engine-decl inside the `raw` markup body of a component-def", () => {
    // Blocker: component-def stores body as `component-def.raw: string`.
    // The engine inside `<button>...<engine>...</></button>` is not a
    // walkable AST node. Activating this case requires a component-body
    // markup parser pass.
    expect(true).toBe(true);
  });

  test.skip("[deferred] end-to-end: engine mount tag `<EngineName/>` inside a component body", () => {
    // Blocker: same as above — component body markup not parsed. Once the
    // parser lands, walking the body markup tree finds self-closing
    // PascalCase tags whose binding's source export is an engine and the
    // enclosing context is a component body.
    expect(true).toBe(true);
  });

  test.skip("[deferred] `effect=` on multi-target rule= → E-ENGINE-EFFECT-AMBIGUOUS", () => {
    // Blocker: engine state-children (`<Small rule=.Big effect=...>`) are
    // not parsed. `engine-decl.rulesRaw` holds the body as a string and
    // `parseMachineRules()` consumes it under the legacy `.From => .To`
    // arrow grammar. The §51.0.F state-child syntax has no implementation.
    // Cross-ref B15 audit §1.1 (spec-vs-primer reconciliation gate).
    expect(true).toBe(true);
  });

  test.skip("[deferred] `<onTransition to=.Variant>` placement validation", () => {
    // Blocker: `<onTransition>` is registered in spec §4.15
    // structural-elements registry but is not tokenized as a structural
    // element by the block-splitter or ast-builder. No AST node kind
    // corresponds to the element.
    expect(true).toBe(true);
  });

  test.skip("[deferred] `<onTransition>` direction attributes (to= / from=) — required + variant validation", () => {
    // Blocker: same as above.
    expect(true).toBe(true);
  });

  test.skip("[deferred] `<onTransition>` inside a `<match>` arm → E-MATCH-ONTRANSITION-FORBIDDEN", () => {
    // Blocker: block-form `<match for=Type on=expr>` is also not parsed.
    // ast-builder produces `match-arm-block` / `match-arm-inline` AST
    // nodes only for JS-style match expressions.
    expect(true).toBe(true);
  });

  test.skip("[deferred] `effect=` inside a `<match>` arm → E-MATCH-EFFECT-FORBIDDEN", () => {
    // Blocker: same as above.
    expect(true).toBe(true);
  });
});
