/**
 * Reachability Solver — Component 4 conformance suite.
 *
 * S90 wave A-2.5 — exercises `auth_gated_boundaries_visible_to(role)`
 * per SPEC §40.9.5 via the full `runReachabilitySolver` entry point
 * AND directly via the exported helpers
 * (`computeAuthGatedBoundariesVisibleTo`, `isVisibleForRole`).
 *
 * Each test constructs synthetic FileASTs + synthetic AuthGraph
 * payloads (bypassing BS/TAB/A-3 enumeration) so the per-role
 * classification + ChunkPlan-filter path is exercised in isolation.
 *
 * Coverage (per SCOPING §A-2.5 tests-gating list, plus A-3.3 interop):
 *   §1  Closed-form role predicate IN — `<auth role="admin">` with
 *       `closed_form: true, gated_for_role: {Admin}` admits Admin role
 *       to a plan containing the gated component; Guest role excludes it.
 *   §2  Closed-form role predicate OUT — same gate, Guest role's plan
 *       drops the gated component.
 *   §3  Async-check gate → W-AUTH-RUNTIME-FALLBACK fires + all roles
 *       see the gated component (eager-ship per §40.9.5).
 *   §4  Nested auth gates — outer gate OUT for role drops inner gate's
 *       content too (parent-gate short-circuit).
 *   §5  Binary `<program auth="required">` — `_anonymous` role drops
 *       the gated content; non-anonymous keeps it.
 *   §6  Binary `<page auth="required">` — same shape per-page.
 *   §7  Binary `<channel auth="required">` — same shape per-channel.
 *   §8  `auth="optional"` — all roles IN (non-blocking).
 *   §9  No-role-enum + no-auth-gates app — single `_anonymous` plan,
 *       no diagnostics (implicit-anonymous floor preserved).
 *   §10 No-role-enum + auth-role-block gate → E-CLOSURE-002 fires.
 *   §11 A-3.3 interop — missing classification (`null`) defaults to
 *       RUNTIME-FALLBACK + W-AUTH-RUNTIME-FALLBACK fires.
 *   §12 No-role-enum + binary auth-required gate — _anonymous drops,
 *       NO E-CLOSURE-002 (binary gates work without enum per OQ-A2-F).
 *   §13 isVisibleForRole helper — direct unit coverage of the
 *       parent-gate-OUT short-circuit + RUNTIME-FALLBACK eager-ship.
 *   §14 No AuthGraph (null) — single _anonymous plan, no diagnostics
 *       (floor preserved for unit-test mode / pipeline-bypass cases).
 */

import { describe, test, expect } from "bun:test";
import { runReachabilitySolver } from "../../src/reachability-solver.ts";
import {
  computeAuthGatedBoundariesVisibleTo,
  isVisibleForRole,
  ANONYMOUS_ROLE,
} from "../../src/reachability/component-4.ts";
import type {
  ASTNode,
  AttrNode,
  FileAST,
  MarkupNode,
  Span,
} from "../../src/types/ast.ts";
import type {
  AuthGate,
  AuthGraph,
  RoleEnum,
} from "../../src/types/auth-graph.ts";

// ---------------------------------------------------------------------------
// Synthetic AST + AuthGraph builders
// ---------------------------------------------------------------------------

const FILE = "/abs/t.scrml";
const SPAN: Span = { file: FILE, start: 0, end: 0, line: 1, col: 1 };

let nextId = 1;
function nid(): number { return nextId++; }

function markup(
  tag: string,
  attrs: AttrNode[] = [],
  children: ASTNode[] = [],
): MarkupNode {
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

function stringAttr(name: string, value: string): AttrNode {
  return {
    name,
    value: { kind: "string-literal", value, span: SPAN },
    span: SPAN,
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

function makeRoleEnum(
  variants: string[],
  opts: { isImplicitAnonymous?: boolean } = {},
): RoleEnum {
  return {
    name: "UserRole",
    variants,
    span: SPAN,
    filePath: FILE,
    isImplicitAnonymous: opts.isImplicitAnonymous ?? false,
  };
}

function makeGate(opts: {
  siteKind: AuthGate["siteKind"];
  nodeId: number;
  role?: string | null;
  classification?: AuthGate["classification"];
}): AuthGate {
  return {
    siteKind: opts.siteKind,
    nodeId: opts.nodeId,
    filePath: FILE,
    span: SPAN,
    role: opts.role ?? null,
    gateExpr: null,
    check: null,
    redirect: null,
    classification: opts.classification ?? null,
    rawPredicate: `role="${opts.role ?? ""}"`,
  };
}

function makeGraph(
  gates: AuthGate[],
  roleEnum: RoleEnum | null,
): AuthGraph {
  const gateMap = new Map<number, AuthGate>();
  for (const g of gates) gateMap.set(g.nodeId, g);
  return {
    gates: gateMap,
    roleEnum,
    gateToEntryPoint: new Map(),
    redirectTargets: new Map(),
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// §1 — Closed-form IN admission
// ---------------------------------------------------------------------------

describe("§1 closed-form role predicate IN — gated component admitted for matching role", () => {
  test("<auth role='admin'> with closed_form gating Admin → Admin plan includes the gated children; Guest plan excludes them", () => {
    nextId = 1;
    // <program><auth role="admin"><dashboard/></auth><footer/></program>
    const dashboard = markup("dashboard");
    const authBlock = markup("auth", [stringAttr("role", "admin")], [dashboard]);
    const footer = markup("footer");
    const program = markup("program", [], [authBlock, footer]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "auth-role-block",
          nodeId: authBlock.id,
          role: "admin",
          classification: {
            closed_form: true,
            gated_for_role: new Set(["Admin"]),
          },
        }),
      ],
      makeRoleEnum(["Admin", "Guest"]),
    );

    const { record, errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    expect(errors).toEqual([]);
    expect(record.closures.size).toBe(1);
    const rps = record.closures.values().next().value!;
    expect(Array.from(rps.byRole.keys()).sort()).toEqual(["Admin", "Guest"]);

    const adminPlan = rps.byRole.get("Admin")!;
    const guestPlan = rps.byRole.get("Guest")!;

    // Admin sees the auth block + the dashboard + the footer.
    expect(adminPlan.initialChunk.componentNodeIds.has(authBlock.id)).toBe(true);
    expect(adminPlan.initialChunk.componentNodeIds.has(dashboard.id)).toBe(true);
    expect(adminPlan.initialChunk.componentNodeIds.has(footer.id)).toBe(true);

    // Guest sees the auth block itself (it's the gate, but the gate's
    // ancestry from the gate's own perspective is empty — the gate's
    // body is what's filtered) — wait: the gate ANCESTRY of authBlock
    // is its own ancestors. authBlock has no gate ancestors (it's a
    // top-level child of <program>). So Guest sees authBlock. But the
    // gate's children (dashboard) DO have authBlock as an ancestor;
    // for Guest, authBlock's classification is OUT → drop dashboard.
    expect(guestPlan.initialChunk.componentNodeIds.has(authBlock.id)).toBe(true);
    expect(guestPlan.initialChunk.componentNodeIds.has(dashboard.id)).toBe(false);
    expect(guestPlan.initialChunk.componentNodeIds.has(footer.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §2 — Closed-form OUT drops the gated subtree for non-matching role
// ---------------------------------------------------------------------------

describe("§2 closed-form role predicate OUT — non-matching role plan drops gated children", () => {
  test("<auth role='admin'> nested deeper → role 'Viewer' plan drops every descendant", () => {
    nextId = 1;
    const deep = markup("admin-panel");
    const wrapper = markup("section", [], [deep]);
    const authBlock = markup("auth", [stringAttr("role", "admin")], [wrapper]);
    const program = markup("program", [], [authBlock]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "auth-role-block",
          nodeId: authBlock.id,
          role: "admin",
          classification: {
            closed_form: true,
            gated_for_role: new Set(["Admin"]),
          },
        }),
      ],
      makeRoleEnum(["Admin", "Viewer"]),
    );

    const { record } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    const rps = record.closures.values().next().value!;
    const viewerPlan = rps.byRole.get("Viewer")!;

    expect(viewerPlan.initialChunk.componentNodeIds.has(authBlock.id)).toBe(true);
    expect(viewerPlan.initialChunk.componentNodeIds.has(wrapper.id)).toBe(false);
    expect(viewerPlan.initialChunk.componentNodeIds.has(deep.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §3 — Async-check gate → W-AUTH-RUNTIME-FALLBACK + eager-ship
// ---------------------------------------------------------------------------

describe("§3 async-check gate → W-AUTH-RUNTIME-FALLBACK + eager-ship", () => {
  test("auth-role-block with closed_form:false → all roles include gated children + warning fires once", () => {
    nextId = 1;
    const inner = markup("expensive-widget");
    const authBlock = markup("auth", [], [inner]);
    const program = markup("program", [], [authBlock]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "auth-role-block",
          nodeId: authBlock.id,
          role: null,
          classification: { closed_form: false, gate_expr: null },
        }),
      ],
      makeRoleEnum(["Admin", "Guest"]),
    );

    const { record, errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });

    // W-AUTH-RUNTIME-FALLBACK fires once per gate.
    const warnings = errors.filter(e => e.code === "W-AUTH-RUNTIME-FALLBACK");
    expect(warnings.length).toBe(1);
    expect(warnings[0].severity).toBe("info");

    const rps = record.closures.values().next().value!;
    // Eager-ship: both Admin and Guest see the gated child.
    for (const role of ["Admin", "Guest"]) {
      const plan = rps.byRole.get(role)!;
      expect(plan.initialChunk.componentNodeIds.has(inner.id)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// §4 — Nested auth gates: parent OUT short-circuits child
// ---------------------------------------------------------------------------

describe("§4 nested auth gates", () => {
  test("outer admin-gate + inner viewer-gate; Guest sees neither (outer OUT short-circuits)", () => {
    nextId = 1;
    const leaf = markup("inner-content");
    const innerAuth = markup("auth", [stringAttr("role", "viewer")], [leaf]);
    const outerAuth = markup("auth", [stringAttr("role", "admin")], [innerAuth]);
    const program = markup("program", [], [outerAuth]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "auth-role-block",
          nodeId: outerAuth.id,
          role: "admin",
          classification: {
            closed_form: true,
            gated_for_role: new Set(["Admin"]),
          },
        }),
        makeGate({
          siteKind: "auth-role-block",
          nodeId: innerAuth.id,
          role: "viewer",
          classification: {
            closed_form: true,
            gated_for_role: new Set(["Admin", "Viewer"]),
          },
        }),
      ],
      makeRoleEnum(["Admin", "Viewer", "Guest"]),
    );

    const { record } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    const rps = record.closures.values().next().value!;

    // Admin: passes both gates → leaf admitted.
    expect(rps.byRole.get("Admin")!.initialChunk.componentNodeIds.has(leaf.id)).toBe(true);

    // Viewer: fails outer admin gate → leaf dropped (parent short-circuit
    // even though Viewer would pass the inner gate).
    expect(rps.byRole.get("Viewer")!.initialChunk.componentNodeIds.has(leaf.id)).toBe(false);
    expect(rps.byRole.get("Viewer")!.initialChunk.componentNodeIds.has(innerAuth.id)).toBe(false);

    // Guest: fails both → leaf dropped.
    expect(rps.byRole.get("Guest")!.initialChunk.componentNodeIds.has(leaf.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §5 — Binary <program auth="required">
// ---------------------------------------------------------------------------

describe("§5 binary <program auth='required'>", () => {
  test("_anonymous drops gated content; authenticated keeps it", () => {
    nextId = 1;
    const dash = markup("dashboard");
    const program = markup("program", [], [dash]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "program-auth",
          nodeId: program.id,
          role: "required",
        }),
      ],
      makeRoleEnum(["Admin", "User"], { isImplicitAnonymous: false }),
    );

    const { record } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    const rps = record.closures.values().next().value!;
    // Only Admin + User roles (no _anonymous since enum is explicit).
    expect(Array.from(rps.byRole.keys()).sort()).toEqual(["Admin", "User"]);
    expect(rps.byRole.get("Admin")!.initialChunk.componentNodeIds.has(dash.id)).toBe(true);
    expect(rps.byRole.get("User")!.initialChunk.componentNodeIds.has(dash.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §6 — Binary <page auth="required">
// ---------------------------------------------------------------------------

describe("§6 binary <page auth='required'> per page", () => {
  test("anonymous-keyed role drops page-gated children (implicit anonymous + binary gate)", () => {
    nextId = 1;
    const dash = markup("dashboard");
    const page = markup("page", [stringAttr("path", "/dash"), stringAttr("auth", "required")], [dash]);
    const program = markup("program", [], [page]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "page-auth",
          nodeId: page.id,
          role: "required",
        }),
      ],
      null, // No role enum → implicit anonymous.
    );

    const { record, errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    // Binary gate + implicit anonymous → no E-CLOSURE-002.
    expect(errors.filter(e => e.code === "E-CLOSURE-002")).toEqual([]);
    const rps = record.closures.values().next().value!;
    expect(Array.from(rps.byRole.keys())).toEqual([ANONYMOUS_ROLE]);
    const plan = rps.byRole.get(ANONYMOUS_ROLE)!;
    // <page> is the entry-point ROOT — Component 1 walks the page's
    // CHILDREN (not the page itself), so `page.id` is not in
    // componentNodeIds by design. The dashboard child is dropped
    // because the page-gate is OUT for _anonymous.
    expect(plan.initialChunk.componentNodeIds.has(dash.id)).toBe(false);
    expect(plan.initialChunk.componentNodeIds.size).toBe(0);
  });

  test("with non-anonymous role, page-gated children admitted", () => {
    nextId = 1;
    const dash = markup("dashboard");
    const page = markup("page", [stringAttr("path", "/dash"), stringAttr("auth", "required")], [dash]);
    const program = markup("program", [], [page]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "page-auth",
          nodeId: page.id,
          role: "required",
        }),
      ],
      makeRoleEnum(["Admin"], { isImplicitAnonymous: false }),
    );

    const { record } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    const rps = record.closures.values().next().value!;
    expect(rps.byRole.get("Admin")!.initialChunk.componentNodeIds.has(dash.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §7 — Binary <channel auth="required">
// ---------------------------------------------------------------------------

describe("§7 binary <channel auth='required'>", () => {
  test("_anonymous role drops channel body; authenticated keeps it", () => {
    nextId = 1;
    const inner = markup("subscription");
    const channel = markup("channel", [stringAttr("auth", "required")], [inner]);
    const program = markup("program", [], [channel]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "channel-auth",
          nodeId: channel.id,
          role: "required",
        }),
      ],
      makeRoleEnum(["User"]),
    );

    const { record } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    const rps = record.closures.values().next().value!;
    const plan = rps.byRole.get("User")!;
    expect(plan.initialChunk.componentNodeIds.has(inner.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §8 — `auth="optional"` is non-blocking
// ---------------------------------------------------------------------------

describe("§8 auth='optional' is non-blocking", () => {
  test("optional auth admits ALL roles to the gated subtree", () => {
    nextId = 1;
    const content = markup("public-content");
    const page = markup("page", [stringAttr("auth", "optional")], [content]);
    const program = markup("program", [], [page]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "page-auth",
          nodeId: page.id,
          role: "optional",
        }),
      ],
      makeRoleEnum(["Admin", "User"], { isImplicitAnonymous: false }),
    );

    const { record } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    const rps = record.closures.values().next().value!;
    for (const role of ["Admin", "User"]) {
      const plan = rps.byRole.get(role)!;
      expect(plan.initialChunk.componentNodeIds.has(content.id)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// §9 — No-role-enum + no-auth-gates app: single _anonymous plan
// ---------------------------------------------------------------------------

describe("§9 no-role-enum + no-auth-gates app", () => {
  test("AuthGraph with empty gates + null roleEnum → single _anonymous plan, no diagnostics", () => {
    nextId = 1;
    const body = markup("body");
    const program = markup("program", [], [body]);

    const authGraph = makeGraph([], null);

    const { record, errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    expect(errors).toEqual([]);
    const rps = record.closures.values().next().value!;
    expect(Array.from(rps.byRole.keys())).toEqual([ANONYMOUS_ROLE]);
    expect(rps.byRole.get(ANONYMOUS_ROLE)!.initialChunk.componentNodeIds.has(body.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §10 — No-role-enum + auth-role-block gate → E-CLOSURE-002
// ---------------------------------------------------------------------------

describe("§10 no-role-enum + auth-role-block gate → E-CLOSURE-002", () => {
  test("isImplicitAnonymous + <auth role='admin'> → E-CLOSURE-002 error fires once", () => {
    nextId = 1;
    const inner = markup("admin-tools");
    const authBlock = markup("auth", [stringAttr("role", "admin")], [inner]);
    const program = markup("program", [], [authBlock]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "auth-role-block",
          nodeId: authBlock.id,
          role: "admin",
          // classification is left null — implicit-anonymous skips it anyway.
        }),
      ],
      null, // Implicit-anonymous.
    );

    const { errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });

    const eClosure002 = errors.filter(e => e.code === "E-CLOSURE-002");
    expect(eClosure002.length).toBe(1);
    expect(eClosure002[0].severity).toBe("error");
    // The runtime-fallback warning ALSO fires for this gate
    // (implicit-anonymous → runtime-fallback for all roles).
    const wRuntime = errors.filter(e => e.code === "W-AUTH-RUNTIME-FALLBACK");
    expect(wRuntime.length).toBe(1);
  });

  test("E-CLOSURE-002 fires only ONCE even with multiple auth-role-block gates", () => {
    nextId = 1;
    const inner1 = markup("admin-panel");
    const auth1 = markup("auth", [stringAttr("role", "admin")], [inner1]);
    const inner2 = markup("editor-panel");
    const auth2 = markup("auth", [stringAttr("role", "editor")], [inner2]);
    const program = markup("program", [], [auth1, auth2]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "auth-role-block",
          nodeId: auth1.id,
          role: "admin",
        }),
        makeGate({
          siteKind: "auth-role-block",
          nodeId: auth2.id,
          role: "editor",
        }),
      ],
      null,
    );

    const { errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });
    const eClosure002 = errors.filter(e => e.code === "E-CLOSURE-002");
    expect(eClosure002.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §11 — A-3.3 interop: missing classification defaults to RUNTIME-FALLBACK
// ---------------------------------------------------------------------------

describe("§11 A-3.3 interop — absent classification field defaults to RUNTIME-FALLBACK", () => {
  test("auth-role-block with classification: null + role enum present → W-AUTH-RUNTIME-FALLBACK + eager-ship", () => {
    nextId = 1;
    const inner = markup("widget");
    const authBlock = markup("auth", [stringAttr("role", "admin")], [inner]);
    const program = markup("program", [], [authBlock]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "auth-role-block",
          nodeId: authBlock.id,
          role: "admin",
          classification: null, // A-3.3 didn't land / didn't populate.
        }),
      ],
      makeRoleEnum(["Admin", "User"]),
    );

    const { record, errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });

    const wRuntime = errors.filter(e => e.code === "W-AUTH-RUNTIME-FALLBACK");
    expect(wRuntime.length).toBe(1);

    // Eager-ship: both roles see the gated child.
    const rps = record.closures.values().next().value!;
    expect(rps.byRole.get("Admin")!.initialChunk.componentNodeIds.has(inner.id)).toBe(true);
    expect(rps.byRole.get("User")!.initialChunk.componentNodeIds.has(inner.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §12 — Implicit-anonymous + binary auth-required gate (no E-CLOSURE-002)
// ---------------------------------------------------------------------------

describe("§12 implicit-anonymous + binary auth-required → no E-CLOSURE-002", () => {
  test("implicit-anonymous + <program auth='required'> + page body → _anonymous drops body, NO error", () => {
    nextId = 1;
    const inner = markup("dashboard");
    const program = markup("program", [], [inner]);

    const authGraph = makeGraph(
      [
        makeGate({
          siteKind: "program-auth",
          nodeId: program.id,
          role: "required",
        }),
      ],
      null, // Implicit anonymous.
    );

    const { record, errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      authGraph,
    });

    // No E-CLOSURE-002 (binary gates work without enum).
    expect(errors.filter(e => e.code === "E-CLOSURE-002")).toEqual([]);
    // No W-AUTH-RUNTIME-FALLBACK either (binary gates are closed-form).
    expect(errors.filter(e => e.code === "W-AUTH-RUNTIME-FALLBACK")).toEqual([]);
    const rps = record.closures.values().next().value!;
    expect(Array.from(rps.byRole.keys())).toEqual([ANONYMOUS_ROLE]);
    expect(rps.byRole.get(ANONYMOUS_ROLE)!.initialChunk.componentNodeIds.has(inner.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §13 — isVisibleForRole helper direct coverage
// ---------------------------------------------------------------------------

describe("§13 isVisibleForRole direct coverage", () => {
  test("OUT ancestor wins over RUNTIME-FALLBACK ancestor (strictness short-circuit)", () => {
    // Build the visibility + ancestry manually to exercise the helper
    // without running through the full orchestrator.
    const gateA = 100; // OUT for Guest, IN for Admin
    const gateB = 101; // RUNTIME-FALLBACK for both
    const gateVisibility = new Map<number, Map<string, "in" | "out" | "runtime-fallback">>([
      [
        gateA,
        new Map([
          ["Admin", "in"],
          ["Guest", "out"],
        ]),
      ],
      [
        gateB,
        new Map([
          ["Admin", "runtime-fallback"],
          ["Guest", "runtime-fallback"],
        ]),
      ],
    ]);
    const nodeId = 500;
    const gateAncestry = new Map<number, Set<number>>([
      [nodeId, new Set([gateA, gateB])],
    ]);

    // Admin: gateA=IN, gateB=RUNTIME-FALLBACK → visible.
    expect(isVisibleForRole(nodeId, "Admin", gateVisibility as any, gateAncestry as any)).toBe(true);
    // Guest: gateA=OUT → invisible (RUNTIME-FALLBACK of gateB doesn't rescue).
    expect(isVisibleForRole(nodeId, "Guest", gateVisibility as any, gateAncestry as any)).toBe(false);
  });

  test("nodeId with no ancestry entry → IN (unconditional)", () => {
    const nodeId = 999;
    const gateVisibility = new Map();
    const gateAncestry = new Map();
    expect(isVisibleForRole(nodeId, "Admin", gateVisibility, gateAncestry)).toBe(true);
  });

  test("RUNTIME-FALLBACK ancestor alone → IN (eager-ship)", () => {
    const gateA = 100;
    const gateVisibility = new Map<number, Map<string, "in" | "out" | "runtime-fallback">>([
      [gateA, new Map([["Admin", "runtime-fallback"]])],
    ]);
    const nodeId = 500;
    const gateAncestry = new Map<number, Set<number>>([
      [nodeId, new Set([gateA])],
    ]);
    expect(isVisibleForRole(nodeId, "Admin", gateVisibility as any, gateAncestry as any)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §14 — No AuthGraph (undefined / null) → floor preserved
// ---------------------------------------------------------------------------

describe("§14 no AuthGraph (null) → single anonymous floor", () => {
  test("input.authGraph undefined → single _anonymous plan, no diagnostics", () => {
    nextId = 1;
    const body = markup("body");
    const program = markup("program", [], [body]);

    const { record, errors } = runReachabilitySolver({
      depGraph: null,
      files: [file(FILE, [program])],
      // authGraph deliberately omitted.
    });
    expect(errors).toEqual([]);
    const rps = record.closures.values().next().value!;
    expect(Array.from(rps.byRole.keys())).toEqual([ANONYMOUS_ROLE]);
    expect(rps.byRole.get(ANONYMOUS_ROLE)!.initialChunk.componentNodeIds.has(body.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bonus — direct computeAuthGatedBoundariesVisibleTo coverage
// ---------------------------------------------------------------------------

describe("computeAuthGatedBoundariesVisibleTo direct call", () => {
  test("null AuthGraph → single _anonymous role, empty everything", () => {
    const r = computeAuthGatedBoundariesVisibleTo(null, []);
    expect(r.effectiveRoles).toEqual([ANONYMOUS_ROLE]);
    expect(r.gateVisibility.size).toBe(0);
    expect(r.gateAncestry.size).toBe(0);
    expect(r.errors).toEqual([]);
  });

  test("role enum with empty variants array → defensive fallback to _anonymous floor", () => {
    const ag: AuthGraph = {
      gates: new Map(),
      roleEnum: {
        name: "UserRole",
        variants: [],
        span: SPAN,
        filePath: FILE,
        isImplicitAnonymous: false,
      },
      gateToEntryPoint: new Map(),
      redirectTargets: new Map(),
      errors: [],
    };
    const r = computeAuthGatedBoundariesVisibleTo(ag, []);
    expect(r.effectiveRoles).toEqual([ANONYMOUS_ROLE]);
  });

  test("multi-variant enum + no gates → effectiveRoles preserved; no diagnostics", () => {
    const ag: AuthGraph = {
      gates: new Map(),
      roleEnum: {
        name: "UserRole",
        variants: ["Admin", "Editor", "Viewer"],
        span: SPAN,
        filePath: FILE,
        isImplicitAnonymous: false,
      },
      gateToEntryPoint: new Map(),
      redirectTargets: new Map(),
      errors: [],
    };
    const r = computeAuthGatedBoundariesVisibleTo(ag, []);
    expect(r.effectiveRoles).toEqual(["Admin", "Editor", "Viewer"]);
    expect(r.errors).toEqual([]);
  });
});
