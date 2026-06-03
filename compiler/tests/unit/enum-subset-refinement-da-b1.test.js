/**
 * (d)-A batch 1 — Enum-variant subset refinement: type-system foundation.
 *
 * Per SPEC §53.15 (entirety) — enum-subset refinement landed normative S154.
 * Batch 1 owns: recognition + subset materialization + three-zone enforcement
 * + widen-free/narrow-checked flow + range-form rejection. Match exhaustiveness
 * (§18.8.1/§18.0.1) is batch 2; schemaFor subset CHECK (§41.15.6) + validator
 * `.OneOfFailed(set)` (§55.1) is batch 3.
 *
 * Cross-refs:
 *   §53.15.1 — syntax + decidability + NO-range-form
 *   §53.15.2 — three-zone enforcement (static / boundary / trusted)
 *   §53.15.3 — refinement-flow (widen free / narrow checked); T-PRED-3/4
 *   §53.15.5 — error codes (E-CONTRACT-001 / -RT REUSE)
 *   §53.9.2  — caller/callee constraint matching (enum-subset widen/narrow rows)
 *
 * Coverage areas:
 *   §1  recognition + materialization (oneOf + notIn-complement) on resolved type
 *   §2  static zone — `.V ∈ subset` → OK no check; `.V ∉ subset` → E-CONTRACT-001
 *   §3  static zone — bare-variant init → zone=static (no runtime check)
 *   §4  boundary zone — full-enum value narrowed to subset → zone=boundary
 *   §5  widen-free — subset value into full-enum param (no spurious narrow error)
 *   §6  predicateImplies — subset ⊆ subset widen; superset → narrow
 *   §7  range-form rejection (§53.15.1 RPP02) → E-CONTRACT-002
 *   §8  malformed / empty subset list → E-CONTRACT-002
 *   §9  notIn complement membership (excluded variant fires; included clean)
 *   §10 typo variant in subset position → E-TYPE-063 (not E-CONTRACT-001)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compile(source, filePath = "/test/enum-subset-da-b1.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast, errors: astErrors } = buildAST(bs);
  const res = runTS({ files: [ast] });
  const all = [...(bs.errors || []), ...(astErrors || []), ...(res.errors || [])];
  return { ast: res.files[0], errors: all };
}

function errorsByCode(errors, code) {
  return (errors || []).filter((e) => e.code === code);
}

/** Collect every node carrying a `predicateCheck`, keyed by node.name. */
function collectPredicateChecks(ast) {
  const out = new Map();
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.predicateCheck && typeof n.name === "string") out.set(n.name, n.predicateCheck);
    for (const key of ["body", "children", "nodes", "arms"]) {
      const arr = n[key];
      if (Array.isArray(arr)) for (const c of arr) walk(c);
    }
    if (n.consequent) walk(n.consequent);
    if (n.alternate) walk(n.alternate);
  }
  walk(ast);
  return out;
}

const ROLE = `type Role:enum = { Admin, Editor, Viewer }`;

// ---------------------------------------------------------------------------
// §1 — recognition + materialization
// ---------------------------------------------------------------------------

describe("§1 recognition + materialization (§53.15.1)", () => {
  test("oneOf subset cell decl resolves + materializes subsetVariants", () => {
    const source = `${ROLE}\n<currentRole>: Role oneOf([.Admin, .Editor]) = .Admin`;
    const { ast, errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
    expect(errorsByCode(errors, "E-CONTRACT-002")).toHaveLength(0);
    const pc = collectPredicateChecks(ast).get("currentRole");
    expect(pc).toBeDefined();
    expect(pc.predicate.kind).toBe("variant-set");
    expect(pc.predicate.variantMode).toBe("oneOf");
    expect([...pc.predicate.variants].sort()).toEqual(["Admin", "Editor"]);
  });

  test("notIn materializes as the complement (base \\ excluded)", () => {
    const source = `${ROLE}\n<r>: Role notIn([.Viewer]) = .Admin`;
    const { ast, errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
    const pc = collectPredicateChecks(ast).get("r");
    expect(pc.predicate.variantMode).toBe("notIn");
    // notIn([.Viewer]) over {Admin,Editor,Viewer} → {Admin,Editor}
    expect([...pc.predicate.variants].sort()).toEqual(["Admin", "Editor"]);
  });
});

// ---------------------------------------------------------------------------
// §2 — static zone E-CONTRACT-001 (out-of-subset literal)
// ---------------------------------------------------------------------------

describe("§2 static zone — out-of-subset literal (§53.15.2 / §53.15.5)", () => {
  test("`.Viewer` assigned to `oneOf([.Admin, .Editor])` → E-CONTRACT-001", () => {
    const source = `${ROLE}\n<bad>: Role oneOf([.Admin, .Editor]) = .Viewer`;
    const { errors } = compile(source);
    const fires = errorsByCode(errors, "E-CONTRACT-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    // Message names the excluded variant + the subset (§53.15.5).
    expect(fires[0].message).toContain(".Viewer");
    expect(fires[0].message).toContain(".Admin");
    expect(fires[0].message).toContain(".Editor");
  });

  test("`.Admin` assigned to `oneOf([.Admin, .Editor])` → no error", () => {
    const source = `${ROLE}\n<ok>: Role oneOf([.Admin, .Editor]) = .Admin`;
    const { errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §3 — static zone classification (bare-variant init → no runtime check)
// ---------------------------------------------------------------------------

describe("§3 static zone classification (§53.15.2)", () => {
  test("bare-variant init → zone=static", () => {
    const source = `${ROLE}\n<ok>: Role oneOf([.Admin, .Editor]) = .Admin`;
    const { ast } = compile(source);
    const pc = collectPredicateChecks(ast).get("ok");
    expect(pc.zone).toBe("static");
  });
});

// ---------------------------------------------------------------------------
// §4 — boundary zone (full-enum value narrowed to subset)
// ---------------------------------------------------------------------------

describe("§4 boundary zone — narrow into subset (§53.15.2)", () => {
  test("unconstrained source narrowed to subset → zone=boundary", () => {
    const source = `${ROLE}\n\${\nlet r: Role oneOf([.Admin, .Editor]) = bareValue\n}`;
    const { ast } = compile(source);
    const pc = collectPredicateChecks(ast).get("r");
    expect(pc).toBeDefined();
    expect(pc.zone).toBe("boundary");
  });
});

// ---------------------------------------------------------------------------
// §5 — widen-free (subset value → full-enum param) — no spurious narrow error
// ---------------------------------------------------------------------------

describe("§5 widen-free — subset into full-enum param (§53.15.3 / §53.9.2)", () => {
  test("subset cell passed to a `fn handle(r: Role)` param compiles clean", () => {
    const source = `${ROLE}
fn handle(r: Role) { return r }
<currentRole>: Role oneOf([.Admin, .Editor]) = .Admin
\${ handle(@currentRole) }`;
    const { errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
    expect(errorsByCode(errors, "E-CONTRACT-001-RT")).toHaveLength(0);
    expect(errorsByCode(errors, "E-CONTRACT-002")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §6 — predicateImplies (subset ⊆ subset widen; superset → narrow)
//
// Exercised via the trusted-zone elision path: a subset-typed cell flowing
// into a wider-or-equal subset is `trusted` (no check); into a narrower subset
// it is `boundary` (membership check). The scope-chain upgrade only fires for
// `let`-bound idents inside a `${ }` logic block.
// ---------------------------------------------------------------------------

describe("§6 predicateImplies — subset widen/narrow (T-PRED-4 / §53.9.2)", () => {
  test("subset value → wider subset → zone=trusted (widen-free)", () => {
    const source = `${ROLE}
\${
let a: Role oneOf([.Admin]) = .Admin
let b: Role oneOf([.Admin, .Editor]) = a
}`;
    const { ast } = compile(source);
    const pc = collectPredicateChecks(ast).get("b");
    expect(pc).toBeDefined();
    expect(pc.zone).toBe("trusted");
  });

  test("subset value → narrower subset → zone=boundary (narrow-checked)", () => {
    const source = `${ROLE}
\${
let a: Role oneOf([.Admin, .Editor]) = .Admin
let b: Role oneOf([.Admin]) = a
}`;
    const { ast } = compile(source);
    const pc = collectPredicateChecks(ast).get("b");
    expect(pc).toBeDefined();
    expect(pc.zone).toBe("boundary");
  });
});

// ---------------------------------------------------------------------------
// §7 — range-form rejection (§53.15.1 — RPP02 hazard)
// ---------------------------------------------------------------------------

describe("§7 range-form rejection (§53.15.1)", () => {
  test("`oneOf([.Admin .. .Viewer])` on a cell → E-CONTRACT-002", () => {
    const source = `${ROLE}\n<r>: Role oneOf([.Admin .. .Viewer]) = .Admin`;
    const { errors } = compile(source);
    const fires = errorsByCode(errors, "E-CONTRACT-002");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message.toLowerCase()).toContain("range");
  });

  test("`oneOf(.Admin .. .Viewer)` (bare, no brackets) → E-CONTRACT-002", () => {
    const source = `${ROLE}\n<r>: Role oneOf(.Admin .. .Viewer) = .Admin`;
    const { errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-002").length).toBeGreaterThanOrEqual(1);
  });

  test("range form on a struct field → E-CONTRACT-002 at type-decl", () => {
    const source = `${ROLE}\ntype Post:struct = { role: Role oneOf(.Admin .. .Viewer) }`;
    const { errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-002").length).toBeGreaterThanOrEqual(1);
  });

  test("range form on a fn param → E-CONTRACT-002", () => {
    const source = `${ROLE}
fn promote(r: Role oneOf(.Admin .. .Viewer)) { return r }
\${ promote(.Admin) }`;
    const { errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-002").length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §8 — malformed / empty subset list
// ---------------------------------------------------------------------------

describe("§8 malformed / empty subset (§53.15.1)", () => {
  test("`oneOf([])` empty list → E-CONTRACT-002", () => {
    const source = `${ROLE}\n<r>: Role oneOf([]) = .Admin`;
    const { errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-002").length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// §9 — notIn complement membership
// ---------------------------------------------------------------------------

describe("§9 notIn complement membership (§53.15.1)", () => {
  test("`.Editor` valid under `notIn([.Viewer])` → no error", () => {
    const source = `${ROLE}\n<r>: Role notIn([.Viewer]) = .Editor`;
    const { errors } = compile(source);
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
  });

  test("`.Viewer` violates `notIn([.Viewer])` → E-CONTRACT-001", () => {
    const source = `${ROLE}\n<r>: Role notIn([.Viewer]) = .Viewer`;
    const { errors } = compile(source);
    const fires = errorsByCode(errors, "E-CONTRACT-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toContain(".Viewer");
  });
});

// ---------------------------------------------------------------------------
// §10 — typo variant in subset position → E-TYPE-063 (NOT E-CONTRACT-001)
// ---------------------------------------------------------------------------

describe("§10 typo variant in subset position (§42 / §53.15.2)", () => {
  test("`.Bogus` (not a Role variant) → E-TYPE-063, not E-CONTRACT-001", () => {
    const source = `${ROLE}\n<r>: Role oneOf([.Admin, .Editor]) = .Bogus`;
    const { errors } = compile(source);
    expect(errorsByCode(errors, "E-TYPE-063").length).toBeGreaterThanOrEqual(1);
    // A genuine typo is an existence error, NOT a subset-membership error.
    expect(errorsByCode(errors, "E-CONTRACT-001")).toHaveLength(0);
  });
});
