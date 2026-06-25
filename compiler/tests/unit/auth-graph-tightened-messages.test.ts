/**
 * auth-graph — message-text contract tests for the S94 tightening.
 *
 * Pins the user-facing prose of `I-AUTH-REDIRECT-UNRESOLVED` and
 * `W-AUTH-LOGIN-MISSING` so future edits don't accidentally drop the
 * copy-pasteable fix path. The S93 hand-off + S94 roadmap flagged the
 * pre-S94 messages as too generic — neither directly named the
 * `scrml generate auth` command + the exact scaffold output path
 * (`pages/login.scrml`) that resolves the diagnostic. This file
 * locks the tightened contract in place.
 *
 * Sister files:
 *  - auth-graph-login-missing.test.ts (behavioral fire/no-fire)
 *  - auth-graph-redirect-crossref.test.ts (cross-ref redirect resolution)
 */

import { describe, test, expect } from "bun:test";
import { runAuthGraph } from "../../src/auth-graph.ts";
import type { RouteMap, PageRoute } from "../../src/route-inference.ts";
import type {
  FileAST,
  MarkupNode,
  ASTNode,
  Span,
  AttrNode,
  AuthConfig,
} from "../../src/types/ast.ts";

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

function file(
  filePath: string,
  nodes: ASTNode[],
  authConfig: AuthConfig | null = null,
): FileAST {
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    channelDecls: undefined,
    spans: {},
    hasProgramRoot: nodes.some(n => n && (n as MarkupNode).tag === "program"),
    authConfig,
    middlewareConfig: null,
  };
}

const REQUIRED_AUTH_DEFAULT: AuthConfig = {
  auth: "required",
  loginRedirect: "/login",
  csrf: "off",
  sessionExpiry: "1h",
};

const REQUIRED_AUTH_SIGNIN: AuthConfig = {
  auth: "required",
  loginRedirect: "/signin",
  csrf: "off",
  sessionExpiry: "1h",
};

function routeMapWithPages(urlPatterns: string[]): RouteMap {
  const pages = new Map<string, PageRoute>();
  for (const urlPattern of urlPatterns) {
    pages.set(`/abs/route-for${urlPattern}.scrml`, {
      filePath: `/abs/route-for${urlPattern}.scrml`,
      urlPattern,
      params: [],
      layoutFilePath: null,
      isCatchAll: false,
    });
  }
  return {
    functions: new Map(),
    pages,
    authMiddleware: new Map(),
  };
}

// ---------------------------------------------------------------------------
// §1 — W-AUTH-LOGIN-MISSING contract
// ---------------------------------------------------------------------------

describe("§1 W-AUTH-LOGIN-MISSING tightened message contract", () => {
  test("message names `scrml generate auth` AND the scaffold path `pages/login.scrml`", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/app.scrml", [program], REQUIRED_AUTH_DEFAULT);
    const rm = routeMapWithPages(["/"]);

    const { errors } = runAuthGraph([f], rm);
    const warn = errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING");
    expect(warn).toHaveLength(1);
    const msg = warn[0]!.message;

    // The command — copy-pasteable.
    expect(msg).toContain("`scrml generate auth`");
    // The exact output path — adopter can `ls` / `cat` it after run.
    expect(msg).toContain("`pages/login.scrml`");
    // The unresolved redirect target.
    expect(msg).toContain('"/login"');
    // The runtime consequence.
    expect(msg).toContain("302 to a 404");
    // The SPEC anchor.
    expect(msg).toContain("SPEC §40.1.1");
    // The manual-author secondary path is preserved.
    expect(msg).toContain("author one at the redirect path manually");
  });

  test("message leads with the actionable command (not the manual-author alternative)", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/app.scrml", [program], REQUIRED_AUTH_DEFAULT);
    const rm = routeMapWithPages(["/"]);

    const { errors } = runAuthGraph([f], rm);
    const warn = errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING")[0]!;

    // The `scrml generate auth` command should appear BEFORE the
    // "author one at the redirect path manually" alternative, so adopters
    // see the actionable resolution first.
    const cmdIdx = warn.message.indexOf("`scrml generate auth`");
    const manualIdx = warn.message.indexOf("author one");
    expect(cmdIdx).toBeGreaterThan(-1);
    expect(manualIdx).toBeGreaterThan(-1);
    expect(cmdIdx).toBeLessThan(manualIdx);
  });
});

// ---------------------------------------------------------------------------
// §2 — I-AUTH-REDIRECT-UNRESOLVED contract
// ---------------------------------------------------------------------------

describe("§2 I-AUTH-REDIRECT-UNRESOLVED tightened message contract", () => {
  test("message for default `/login` target names `scrml generate auth` + the scaffold path", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/app.scrml", [program], REQUIRED_AUTH_DEFAULT);
    const rm = routeMapWithPages(["/home"]);

    const { errors } = runAuthGraph([f], rm);
    const info = errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED");
    expect(info).toHaveLength(1);
    const msg = info[0]!.message;

    expect(msg).toContain('"/login"');
    expect(msg).toContain("`scrml generate auth`");
    expect(msg).toContain("`pages/login.scrml`");
    expect(msg).toContain("SPEC §40.1.1");
  });

  test("message for non-default redirect names `--target=./pages/<redirect>.scrml`", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/app.scrml", [program], REQUIRED_AUTH_SIGNIN);
    const rm = routeMapWithPages(["/home"]);

    const { errors } = runAuthGraph([f], rm);
    const info = errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED");
    expect(info).toHaveLength(1);
    const msg = info[0]!.message;

    expect(msg).toContain('"/signin"');
    expect(msg).toContain("`scrml generate auth --target=./pages/signin.scrml`");
    // Default-target language should NOT appear for non-default redirects.
    expect(msg).not.toContain("`pages/login.scrml`");
  });

  test("tightened message drops internal `OQ-A2-E` disposition jargon", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/app.scrml", [program], REQUIRED_AUTH_DEFAULT);
    const rm = routeMapWithPages(["/home"]);

    const { errors } = runAuthGraph([f], rm);
    const info = errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")[0]!;
    // Internal jargon — should be gone (was: "per OQ-A2-E — no entry-point synthesis").
    expect(info.message).not.toContain("OQ-A2-E");
    expect(info.message).not.toContain("entry-point synthesis");
  });
});

// ---------------------------------------------------------------------------
// §3 — adopter-authored login page resolves both diagnostics
// ---------------------------------------------------------------------------

describe("§3 login page authored at redirect path resolves diagnostics", () => {
  test("RouteMap contains the /login page → neither I-AUTH-REDIRECT-UNRESOLVED nor W-AUTH-LOGIN-MISSING fires", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/app.scrml", [program], REQUIRED_AUTH_DEFAULT);
    const rm = routeMapWithPages(["/login", "/"]);

    const { errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING")).toHaveLength(0);
  });

  test("non-default /signin redirect resolves when RouteMap contains /signin", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/app.scrml", [program], REQUIRED_AUTH_SIGNIN);
    const rm = routeMapWithPages(["/signin", "/home"]);

    const { errors } = runAuthGraph([f], rm);

    expect(errors.filter(e => e.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
    expect(errors.filter(e => e.code === "W-AUTH-LOGIN-MISSING")).toHaveLength(0);
  });
});
