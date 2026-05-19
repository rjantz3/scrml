/**
 * match-block-parser-phase1.test.js — Phase 1 parser: `<match>` block-form
 * produces a structured `kind: "match-block"` AST node.
 *
 * S107 authoring per docs/changes/match-block-form-scoping/SCOPING.md.
 *
 * Phase 1 scope: AST-level recognition. `<match for=Type [on=expr]> ... </>`
 * blocks were misclassified by block-splitter's classifyOpenerForCompoundScan
 * pre-S107 and captured as opaque `html-fragment` text — no AST structure, no
 * downstream validation possible. Phase 1 fixes:
 *
 *   - block-splitter.js — adds `"match"` to COMPOUND_LIFT_EXEMPT_TAGS so BS
 *     produces a `type=markup name=match` block via the regular markup-opener
 *     path
 *   - ast-builder.js — `case "markup":` intercepts `block.name === "match"`
 *     and returns a `kind: "match-block"` AST node with `forType` + `onExprRaw`
 *     + `armsRaw` (raw arm body text; Phase 2 will add the dedicated arm-parser)
 *
 * Phase 2 update: arm-children body forms are now BS-agnostic — the match
 * body is captured as a single raw text run (STRUCTURAL_RAW_BODY_ELEMENTS
 * gate at block-splitter.js) which the match-statechild-parser re-tokenizes
 * at SYM time. Bare-body, self-closing, and `:`-shorthand all coexist
 * without BS-level shape conflicts.
 *
 * Phase 2 baseline: match-block closer is `</match>` (explicit). The `</>`
 * unambiguous-closer form is NOT yet supported because depth-tracking is
 * needed to disambiguate it from arm-children `</>` closers (each
 * `<Variant>...</>` bare-body arm uses `</>` as its closer; the OUTERMOST
 * `</>` would be the match closer, but `:`-shorthand arms have no closer,
 * breaking naive depth-tracking). Phase 5 may add `</>` support via the
 * match-statechild-parser informing BS of arm-shape boundaries.
 *
 * Coverage:
 *   §1  AST shape — basic `<match for=Phase on=@phase>` produces match-block
 *   §2  Field extraction — forType, onExprRaw, armsRaw all populated
 *   §3  Multiple arms with bare-body shape — armsRaw contains all arm text
 *   §4  Missing `on=` — onExprRaw is null (SYM PASS Phase 2 will fire E-MATCH-ON-REQUIRED)
 *   §5  Match WITHOUT children (degenerate) — armsRaw empty string, still valid AST
 *   §6  Regression — `<engine>` block still produces engine-decl AST (no overlap)
 *   §7  Regression — non-match markup tag still produces regular markup AST
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(src) {
  const bs = splitBlocks("/tmp/test.scrml", src);
  const tab = buildAST(bs, null);
  return { bs, tab };
}

function findFirst(nodes, kind) {
  for (const n of nodes) {
    if (n && n.kind === kind) return n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// §1: Basic recognition — `<match for=Phase on=@phase>` produces match-block
// ---------------------------------------------------------------------------

describe("§1: match-block AST node emitted for `<match for=Type on=expr>`", () => {
  test("simple match block produces kind:match-block at top-level", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>
        <p>Idle</p>
    </>
    <Done>
        <p>Done</p>
    </>
</match>
`;
    const { tab } = parse(src);
    expect(tab.errors.length).toBe(0);
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(matchBlock).not.toBeNull();
    expect(matchBlock.kind).toBe("match-block");
  });
});

// ---------------------------------------------------------------------------
// §2: Field extraction
// ---------------------------------------------------------------------------

describe("§2: match-block fields — forType + onExprRaw + armsRaw", () => {
  test("forType matches the for= attribute value", () => {
    const src = `\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle><p>Idle</p></>
    <Done><p>Done</p></>
</match>
`;
    const { tab } = parse(src);
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(matchBlock.forType).toBe("Phase");
  });

  test("onExprRaw matches the on= attribute value verbatim", () => {
    const src = `\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle><p>Idle</p></>
    <Done><p>Done</p></>
</match>
`;
    const { tab } = parse(src);
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(matchBlock.onExprRaw).toBe("@phase");
  });

  test("armsRaw is a non-empty string containing arm-child text", () => {
    const src = `\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle><p>Idle</p></>
    <Done><p>Done</p></>
</match>
`;
    const { tab } = parse(src);
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(typeof matchBlock.armsRaw).toBe("string");
    expect(matchBlock.armsRaw.length).toBeGreaterThan(0);
    expect(matchBlock.armsRaw).toContain("Idle");
    expect(matchBlock.armsRaw).toContain("Done");
  });
});

// ---------------------------------------------------------------------------
// §3: Multi-arm block — armsRaw captures all arm text
// ---------------------------------------------------------------------------

describe("§3: Multi-arm match block — armsRaw captures all arms", () => {
  test("3-arm block has all three variants in armsRaw", () => {
    const src = `\${ type Phase:enum = { Idle, Loading, Done } @phase = .Idle }
<match for=Phase on=@phase>
    <Idle><p>Idle</p></>
    <Loading><p>Loading</p></>
    <Done><p>Done</p></>
</match>

`;
    const { tab } = parse(src);
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(matchBlock.armsRaw).toContain("Idle");
    expect(matchBlock.armsRaw).toContain("Loading");
    expect(matchBlock.armsRaw).toContain("Done");
  });
});

// ---------------------------------------------------------------------------
// §4: Missing on= → onExprRaw is null
// ---------------------------------------------------------------------------

describe("§4: missing on= attribute — onExprRaw is null (SYM Phase 2 will fire E-MATCH-ON-REQUIRED)", () => {
  test("match block without on= produces onExprRaw === null", () => {
    const src = `\${ type Phase:enum = { Idle, Done } }
<match for=Phase>
    <Idle><p>Idle</p></>
    <Done><p>Done</p></>
</match>
`;
    const { tab } = parse(src);
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(matchBlock).not.toBeNull();
    expect(matchBlock.onExprRaw).toBeNull();
    expect(matchBlock.forType).toBe("Phase");
  });
});

// ---------------------------------------------------------------------------
// §5: Degenerate match — no arm-children (SYM Phase 2 will fire E-MATCH-NOT-EXHAUSTIVE)
// ---------------------------------------------------------------------------

describe("§5: degenerate match — no arms (SYM Phase 2 will fire E-MATCH-NOT-EXHAUSTIVE)", () => {
  test("empty match block still produces match-block AST node", () => {
    const src = `\${ type Phase:enum = { Idle, Done } @phase = .Idle }
<match for=Phase on=@phase>
</match>
`;
    const { tab } = parse(src);
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(matchBlock).not.toBeNull();
    expect(matchBlock.forType).toBe("Phase");
    expect(matchBlock.onExprRaw).toBe("@phase");
    // armsRaw may be empty or whitespace — Phase 2's parser will treat as zero arms.
  });
});

// ---------------------------------------------------------------------------
// §6: Regression — `<engine>` still produces engine-decl (no overlap with match)
// ---------------------------------------------------------------------------

describe("§6: regression — `<engine>` still produces engine-decl (Phase 1 doesn't disturb engine path)", () => {
  test("engine block produces kind:engine-decl, NOT match-block", () => {
    const src = `\${ type AppMode:enum = { Title, Playing } }
<engine for=AppMode initial=.Title>
  <Title rule=.Playing></>
  <Playing rule=.Title></>
</>
`;
    const { tab } = parse(src);
    const engineDecl = findFirst(tab.ast.nodes, "engine-decl");
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(engineDecl).not.toBeNull();
    expect(matchBlock).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §7: Regression — non-match markup tag (`<div>`) still produces regular markup
// ---------------------------------------------------------------------------

describe("§7: regression — non-match markup unchanged", () => {
  test("`<div>` markup produces kind:markup (not match-block)", () => {
    const src = `<div>
    <p>hello</p>
</div>
`;
    const { tab } = parse(src);
    const matchBlock = findFirst(tab.ast.nodes, "match-block");
    expect(matchBlock).toBeNull();
    // Find the div somewhere in the tree (top-level OR inside wrapper)
    let foundDiv = false;
    function walk(n) {
      if (!n || typeof n !== "object") return;
      if (n.kind === "markup" && n.tag === "div") foundDiv = true;
      for (const c of (n.children || n.body || [])) walk(c);
    }
    for (const n of tab.ast.nodes) walk(n);
    expect(foundDiv).toBe(true);
  });
});
