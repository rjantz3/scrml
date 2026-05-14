/**
 * auth-graph — A-3.3 Per-gate classifier tests.
 *
 * S90 wave A-3.3 — exercises `classifyGates` (invoked from `runAuthGraph`)
 * against synthesized FileAST inputs covering the OQ-A3-A (d) ratified
 * full-interpolation grammar:
 *
 *   §1 — Binary auth gates (`program-auth` / `page-auth` / `channel-auth`):
 *        always closed-form. `required` excludes the anonymous floor;
 *        `optional` admits all variants.
 *
 *   §2 — `<auth role="X">` single-variant literal: closed-form,
 *        `gated_for_role = {X}` when X is in the role enum.
 *
 *   §3 — `<auth role="X,Y">` comma-OR literal: closed-form,
 *        `gated_for_role = {X, Y}`.
 *
 *   §4 — `<auth role="!X">` negation: closed-form,
 *        `gated_for_role = (all variants) \ {X}`.
 *
 *   §5 — `<auth role=publicRoles>` const-ref: looks up the const-folding
 *        env. Closed-form when the binding resolves to a string constant.
 *
 *   §6 — `<auth role={publicRoles}>` reactive cell-ref: runtime-fallback.
 *        Cells declared via `<x> = ...` (NOT `const <x> = ...`) are
 *        mutable; cannot statically classify per role.
 *
 *   §7 — `<auth role=${expr}>` interpolation: closed-form when the
 *        expression folds to a string constant; otherwise runtime-fallback.
 *
 *   §8 — `<auth check="hasPermission">` server-fn check form:
 *        always runtime-fallback per SPEC §40.9.5 line 17724.
 *
 *   §9 — Variant-not-in-enum (`<auth role="ghost">` where Ghost is not
 *        a declared variant): fires E-AUTH-GRAPH-003; classification is
 *        runtime-fallback per §40.9.2 worst-case-union admission.
 *
 *   §10 — W-AUTH-PAGE-INFERRED info-lint emission per OQ-A3-C (b) S90:
 *         fires for `<page>` lacking explicit `auth=` under a
 *         `<program auth="required">` enclosing scope.
 *
 * Tests build FileAST fixtures in-memory (mirroring the A-3.1/A-3.2
 * pattern) — no `.scrml` fixture compilation needed; the classifier
 * consumes the post-TAB shape directly.
 */

import { describe, test, expect } from "bun:test";
import { runAuthGraph } from "../../src/auth-graph.ts";
import type {
  FileAST,
  MarkupNode,
  ASTNode,
  Span,
  AttrNode,
  AttrValue,
  TypeDeclNode,
  LogicNode,
  ChannelDeclNode,
  ConstDeclNode,
  ReactiveDeclNode,
  ExprNode,
  AuthConfig,
} from "../../src/types/ast.ts";

const SPAN: Span = { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };

let nextId = 1;
function nid(): number {
  return nextId++;
}

/** String-literal attribute (most common shape). */
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

/** Variable-ref attribute (`role=publicRoles` shape). */
function attrVarRef(
  name: string,
  refName: string,
  exprNode?: ExprNode,
): AttrNode {
  const value: AttrValue = {
    kind: "variable-ref",
    name: refName,
    exprNode,
    span: SPAN,
  };
  return { name, value, span: SPAN };
}

/** Expression-form attribute (`role=${expr}` shape). */
function attrExpr(
  name: string,
  raw: string,
  exprNode: ExprNode,
  refs: string[] = [],
): AttrNode {
  const value: AttrValue = {
    kind: "expr",
    raw,
    refs,
    exprNode,
    span: SPAN,
  };
  return { name, value, span: SPAN };
}

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

function channel(attrs: AttrNode[], children: ASTNode[] = []): ChannelDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "markup",
    tag: "channel",
    attrs,
    children,
    selfClosing: false,
    closerForm: `</channel>`,
    isComponent: false,
  } as unknown as ChannelDeclNode;
}

function enumDecl(name: string, variantsRaw: string): TypeDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "type-decl",
    name,
    typeKind: "enum",
    raw: variantsRaw,
  };
}

function logicNode(
  typeDecls: TypeDeclNode[] = [],
  body: ASTNode[] = [],
): LogicNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "logic",
    body: body as never,
    imports: [],
    exports: [],
    typeDecls,
    components: [],
  };
}

function constDecl(name: string, initExpr: ExprNode): ConstDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "const-decl",
    name,
    initExpr,
  };
}

/** Plain reactive cell (`<x> = expr`): mutable. */
function cellDecl(name: string, initExpr: ExprNode): ReactiveDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "state-decl",
    name,
    initExpr,
    isConst: false,
    structuralForm: true,
    shape: "plain",
  };
}

/** Const-derived cell (`const <x> = expr`): immutable. */
function constCellDecl(name: string, initExpr: ExprNode): ReactiveDeclNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "state-decl",
    name,
    initExpr,
    isConst: true,
    structuralForm: true,
    shape: "derived",
  };
}

/** Convenience: literal ExprNode builder. */
function litExpr(value: string | number | boolean): ExprNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "lit",
    litType: typeof value === "string" ? "string" : typeof value === "number" ? "number" : "bool",
    value,
    raw: typeof value === "string" ? `"${value}"` : String(value),
  } as unknown as ExprNode;
}

/** Identifier ExprNode builder. */
function identExpr(name: string): ExprNode {
  return {
    id: nid(),
    span: SPAN,
    kind: "ident",
    name,
  } as unknown as ExprNode;
}

interface FileOpts {
  typeDecls?: TypeDeclNode[];
  hasProgramRoot?: boolean;
  authConfig?: AuthConfig | null;
  channelDecls?: ChannelDeclNode[];
}

function file(
  filePath: string,
  nodes: ASTNode[],
  opts: FileOpts = {},
): FileAST {
  const hasProgramRoot =
    opts.hasProgramRoot
      ?? nodes.some(n => n && (n as MarkupNode).tag === "program");
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: opts.typeDecls ?? [],
    spans: {},
    hasProgramRoot,
    authConfig: opts.authConfig ?? null,
    middlewareConfig: null,
    channelDecls: opts.channelDecls,
  };
}

const REQUIRED_AUTH: AuthConfig = {
  auth: "required",
  loginRedirect: "/login",
  csrf: "on",
  sessionExpiry: "1h",
};

const OPTIONAL_AUTH: AuthConfig = {
  auth: "optional",
  loginRedirect: "/login",
  csrf: "on",
  sessionExpiry: "1h",
};

const USER_ROLE_ENUM = (): TypeDeclNode =>
  enumDecl("UserRole", "{ Anonymous, User, Admin, Dispatcher }");

// ---------------------------------------------------------------------------
// §1 — Binary auth gates (program / page / channel)
// ---------------------------------------------------------------------------

describe("§1 binary auth gates — program/page/channel auth", () => {
  test("`<program auth=\"required\">` with role enum → closed-form, gated_for_role excludes Anonymous", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const program = markup("program", [attr("auth", "required")], [
      logicNode([userRoleEnum]),
    ]);
    const f = file("/abs/req.scrml", [program], {
      authConfig: REQUIRED_AUTH,
      typeDecls: [userRoleEnum],
    });

    const { graph } = runAuthGraph([f], null);

    expect(graph.gates.size).toBe(1);
    const gate = graph.gates.get(program.id)!;
    expect(gate.classification).not.toBeNull();
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      const variants = [...gate.classification!.gated_for_role].sort();
      // Required excludes Anonymous; all other variants pass.
      expect(variants).toEqual(["Admin", "Dispatcher", "User"]);
    }
  });

  test("`<program auth=\"optional\">` with role enum → closed-form, gated_for_role = ALL variants", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const program = markup("program", [attr("auth", "optional")], [
      logicNode([userRoleEnum]),
    ]);
    const f = file("/abs/opt.scrml", [program], {
      authConfig: OPTIONAL_AUTH,
      typeDecls: [userRoleEnum],
    });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(program.id)!;
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      const variants = [...gate.classification!.gated_for_role].sort();
      // Optional admits everyone, including Anonymous.
      expect(variants).toEqual(["Admin", "Anonymous", "Dispatcher", "User"]);
    }
  });

  test("`<page auth=\"required\">` with role enum → closed-form, excludes Anonymous variant", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const page = markup("page", [
      attr("route", "/dashboard"),
      attr("auth", "required"),
    ]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/p.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(page.id)!;
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      expect(gate.classification!.gated_for_role.has("Anonymous")).toBe(false);
      expect(gate.classification!.gated_for_role.has("Admin")).toBe(true);
    }
  });

  test("`<channel auth=\"required\">` → binary closed-form per OQ-A3-D S90", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const ch = channel([
      attr("name", "presence"),
      attr("auth", "required"),
    ]);
    const program = markup("program", [], [logicNode([userRoleEnum]), ch]);
    const f = file("/abs/ws.scrml", [program], {
      typeDecls: [userRoleEnum],
      channelDecls: [ch],
    });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(ch.id)!;
    expect(gate.siteKind).toBe("channel-auth");
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      expect(gate.classification!.gated_for_role.has("Anonymous")).toBe(false);
      expect(gate.classification!.gated_for_role.has("Admin")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// §2 — `<auth role="X">` single-variant literal
// ---------------------------------------------------------------------------

describe("§2 single-variant literal — `<auth role=\"X\">`", () => {
  test("`role=\"Admin\"` → closed-form, gated_for_role = {Admin}", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", [attr("role", "Admin")]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/admin.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      expect([...gate.classification!.gated_for_role]).toEqual(["Admin"]);
    }
  });
});

// ---------------------------------------------------------------------------
// §3 — `<auth role="X,Y">` comma-OR literal
// ---------------------------------------------------------------------------

describe("§3 comma-OR literal — `<auth role=\"Admin,Dispatcher\">`", () => {
  test("`role=\"Admin,Dispatcher\"` → closed-form, gated_for_role = {Admin, Dispatcher}", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", [attr("role", "Admin,Dispatcher")]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/multi.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      const variants = [...gate.classification!.gated_for_role].sort();
      expect(variants).toEqual(["Admin", "Dispatcher"]);
    }
  });

  test("whitespace-tolerant: `role=\" Admin , Dispatcher \"` → same result as Admin,Dispatcher", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", [attr("role", " Admin , Dispatcher ")]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/ws.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      const variants = [...gate.classification!.gated_for_role].sort();
      expect(variants).toEqual(["Admin", "Dispatcher"]);
    }
  });
});

// ---------------------------------------------------------------------------
// §4 — `<auth role="!X">` negation
// ---------------------------------------------------------------------------

describe("§4 negation — `<auth role=\"!Anonymous\">`", () => {
  test("`role=\"!Anonymous\"` → closed-form, all variants except Anonymous", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", [attr("role", "!Anonymous")]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/auth-any.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      const variants = [...gate.classification!.gated_for_role].sort();
      // All variants minus Anonymous.
      expect(variants).toEqual(["Admin", "Dispatcher", "User"]);
      expect(gate.classification!.gated_for_role.has("Anonymous")).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// §5 — `<auth role=publicRoles>` const-ref (variable-ref to constant decl)
// ---------------------------------------------------------------------------

describe("§5 const-ref — `<auth role=publicRoles>` resolving to constant", () => {
  test("const decl `const publicRoles = \"Admin,Dispatcher\"` → folds via env, closed-form", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const publicRolesDecl = constDecl("publicRoles", litExpr("Admin,Dispatcher"));
    const authBlock = markup("auth", [
      attrVarRef("role", "publicRoles", identExpr("publicRoles")),
    ]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [
      logicNode([userRoleEnum], [publicRolesDecl as unknown as ASTNode]),
      page,
    ]);
    const f = file("/abs/const-ref.scrml", [program], {
      typeDecls: [userRoleEnum],
    });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification).not.toBeNull();
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      const variants = [...gate.classification!.gated_for_role].sort();
      expect(variants).toEqual(["Admin", "Dispatcher"]);
    }
  });

  test("const-derived cell `const <publicRoles> = \"Admin\"` → folds via env, closed-form", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const publicRolesCell = constCellDecl("publicRoles", litExpr("Admin"));
    const authBlock = markup("auth", [
      attrVarRef("role", "publicRoles", identExpr("publicRoles")),
    ]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [
      logicNode([userRoleEnum], [publicRolesCell as unknown as ASTNode]),
      page,
    ]);
    const f = file("/abs/derived.scrml", [program], {
      typeDecls: [userRoleEnum],
    });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      expect([...gate.classification!.gated_for_role]).toEqual(["Admin"]);
    }
  });
});

// ---------------------------------------------------------------------------
// §6 — `<auth role=publicRoles>` reactive cell → runtime-fallback
// ---------------------------------------------------------------------------

describe("§6 reactive cell-ref — `<auth role=publicRoles>` where publicRoles is mutable", () => {
  test("plain reactive cell `<publicRoles> = \"Admin\"` → runtime-fallback (cell is mutable)", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    // NB: `cellDecl` produces a state-decl with isConst=false → reactive.
    const publicRolesCell = cellDecl("publicRoles", litExpr("Admin"));
    const authBlock = markup("auth", [
      attrVarRef("role", "publicRoles", identExpr("publicRoles")),
    ]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [
      logicNode([userRoleEnum], [publicRolesCell as unknown as ASTNode]),
      page,
    ]);
    const f = file("/abs/cell.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification).not.toBeNull();
    expect(gate.classification!.closed_form).toBe(false);
    if (gate.classification!.closed_form === false) {
      // gateExpr should be preserved for downstream A-4 runtime emission.
      expect(gate.classification!.gate_expr).not.toBeNull();
    }
  });

  test("reactive `@cell` form ref (e.g. legacy `role=@currentRole`) → runtime-fallback", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", [
      attrVarRef("role", "@currentRole", identExpr("@currentRole")),
    ]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/at.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(false);
  });

  test("unknown identifier (not in const env, not reactive) → runtime-fallback", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", [
      attrVarRef("role", "undefinedSymbol", identExpr("undefinedSymbol")),
    ]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/unk.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §7 — `<auth role=${expr}>` interpolation
// ---------------------------------------------------------------------------

describe("§7 interpolation — `<auth role=${expr}>`", () => {
  test("`${\"Admin\"}` (literal expr) → closed-form via constant-folder, gated_for_role = {Admin}", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", [
      attrExpr("role", "\"Admin\"", litExpr("Admin")),
    ]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/expr-lit.scrml", [program], {
      typeDecls: [userRoleEnum],
    });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(true);
    if (gate.classification!.closed_form === true) {
      expect([...gate.classification!.gated_for_role]).toEqual(["Admin"]);
    }
  });

  test("`${a || b}` where a, b unknown identifiers → runtime-fallback", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    // Build `a || b` ExprNode.
    const orExpr: ExprNode = {
      id: nid(),
      span: SPAN,
      kind: "binary",
      op: "||",
      left: identExpr("a"),
      right: identExpr("b"),
    } as unknown as ExprNode;

    const authBlock = markup("auth", [
      attrExpr("role", "a || b", orExpr, ["a", "b"]),
    ]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/expr-runtime.scrml", [program], {
      typeDecls: [userRoleEnum],
    });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(false);
    if (gate.classification!.closed_form === false) {
      // gate_expr is preserved for A-4 runtime emission.
      expect(gate.classification!.gate_expr).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// §8 — `<auth check=fnName>` server-fn check form
// ---------------------------------------------------------------------------

describe("§8 server-fn check — `<auth check=\"hasPermission\">`", () => {
  test("`<auth check=\"hasPermission\">` → runtime-fallback per SPEC §40.9.5", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", [
      attr("check", "hasPermission"),
      attr("redirect", "/forbidden"),
    ]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/chk.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph } = runAuthGraph([f], null);

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.check).toBe("hasPermission");
    expect(gate.classification!.closed_form).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §9 — Variant-not-in-enum → E-AUTH-GRAPH-003
// ---------------------------------------------------------------------------

describe("§9 variant-not-in-enum — `<auth role=\"Ghost\">`", () => {
  test("`role=\"Ghost\"` against UserRole{Anonymous,User,Admin} → fires E-AUTH-GRAPH-003 + runtime-fallback", () => {
    const userRoleEnum = enumDecl("UserRole", "{ Anonymous, User, Admin }");
    const authBlock = markup("auth", [attr("role", "Ghost")]);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/ghost.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph, errors } = runAuthGraph([f], null);

    // A-3.2 first emits E-AUTH-GRAPH-002 because Ghost is not a variant
    // (so the gate's (b)-rule reference doesn't find an owning enum) —
    // but in this fixture UserRole IS declared at program scope, so (c)
    // resolves to UserRole. With roleEnum=UserRole, A-3.3 detects
    // Ghost ∉ variants → fires E-AUTH-GRAPH-003.
    const e003 = errors.find(e => e.code === "E-AUTH-GRAPH-003");
    expect(e003).toBeDefined();
    expect(e003!.message).toContain("Ghost");
    expect(e003!.message).toContain("UserRole");

    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification!.closed_form).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// §10 — W-AUTH-PAGE-INFERRED info-lint (OQ-A3-C (b) S90)
// ---------------------------------------------------------------------------

describe("§10 W-AUTH-PAGE-INFERRED — page without explicit auth= under <program auth=\"required\">", () => {
  test("`<page>` (no auth=) under `<program auth=\"required\">` → fires W-AUTH-PAGE-INFERRED info-lint", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const page = markup("page", [attr("route", "/inbox")]);
    const program = markup("program", [attr("auth", "required")], [
      logicNode([userRoleEnum]),
      page,
    ]);
    const f = file("/abs/inferred.scrml", [program], {
      authConfig: REQUIRED_AUTH,
      typeDecls: [userRoleEnum],
    });

    const { graph, errors } = runAuthGraph([f], null);

    const lint = errors.find(e => e.code === "W-AUTH-PAGE-INFERRED");
    expect(lint).toBeDefined();
    expect(lint!.severity).toBe("info");
    expect(lint!.filePath).toBe("/abs/inferred.scrml");

    // The <page> itself doesn't show up as a page-auth gate (no explicit auth=).
    expect([...graph.gates.values()].find(g => g.nodeId === page.id)).toBeUndefined();
    // The program-auth gate IS present.
    expect(graph.gates.get(program.id)).toBeDefined();
  });

  test("`<page auth=\"required\">` explicit → no W-AUTH-PAGE-INFERRED lint (page is correctly captured)", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const page = markup("page", [
      attr("route", "/explicit"),
      attr("auth", "required"),
    ]);
    const program = markup("program", [attr("auth", "required")], [
      logicNode([userRoleEnum]),
      page,
    ]);
    const f = file("/abs/explicit.scrml", [program], {
      authConfig: REQUIRED_AUTH,
      typeDecls: [userRoleEnum],
    });

    const { errors } = runAuthGraph([f], null);

    const lint = errors.find(e => e.code === "W-AUTH-PAGE-INFERRED");
    expect(lint).toBeUndefined();
  });

  test("`<page>` (no auth=) under `<program auth=\"optional\">` → no W-AUTH-PAGE-INFERRED lint (only fires under required)", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const page = markup("page", [attr("route", "/opt")]);
    const program = markup("program", [attr("auth", "optional")], [
      logicNode([userRoleEnum]),
      page,
    ]);
    const f = file("/abs/opt-page.scrml", [program], {
      authConfig: OPTIONAL_AUTH,
      typeDecls: [userRoleEnum],
    });

    const { errors } = runAuthGraph([f], null);

    const lint = errors.find(e => e.code === "W-AUTH-PAGE-INFERRED");
    expect(lint).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §11 — Malformed <auth> block → E-AUTH-GRAPH-004
// ---------------------------------------------------------------------------

describe("§11 malformed auth-role-block — no role= AND no check=", () => {
  test("`<auth>` with neither role nor check → fires E-AUTH-GRAPH-004 + runtime-fallback classification", () => {
    const userRoleEnum = USER_ROLE_ENUM();
    const authBlock = markup("auth", []);
    const page = markup("page", [], [authBlock]);
    const program = markup("program", [], [logicNode([userRoleEnum]), page]);
    const f = file("/abs/bad.scrml", [program], { typeDecls: [userRoleEnum] });

    const { graph, errors } = runAuthGraph([f], null);

    const e004 = errors.find(e => e.code === "E-AUTH-GRAPH-004");
    expect(e004).toBeDefined();
    expect(e004!.filePath).toBe("/abs/bad.scrml");

    // Gate is still enumerated by A-3.1; classification is null
    // (malformed gates cannot be classified).
    const gate = graph.gates.get(authBlock.id)!;
    expect(gate.classification).toBeNull();
  });
});
