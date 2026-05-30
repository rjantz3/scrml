/**
 * auth-graph — A-3.5b content-not-gated security lint (GITI-027 part A).
 *
 * Exercises `flagContentNotGated` (called from `runAuthGraph`) — the
 * `W-AUTH-CONTENT-NOT-GATED` warning that surfaces the footgun that
 * `<auth role="X">` gates only JS mount/behaviour (and only under
 * --emit-per-route), NOT served HTML content. The gated markup ships
 * verbatim in the HTML payload to all viewers regardless of role.
 *
 * Acceptance (GITI-027 part A):
 *   - Fires (warning, non-fatal) whenever an `<auth role="X">` site exists.
 *   - Silent when no `<auth role>` site exists (no false positive).
 *   - The message is honest in BOTH modes (does NOT claim --emit-per-route
 *     fixes the content leak) and directs to server-side enforcement.
 *
 * In-memory FileAST fixtures (mirrors auth-graph-site-enumerator.test.ts) —
 * no `.scrml` compilation needed; the enumerator consumes the post-TAB shape.
 */

import { describe, test, expect } from "bun:test";
import { runAuthGraph } from "../../src/auth-graph.ts";
import type {
  FileAST,
  MarkupNode,
  ChannelDeclNode,
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

function channel(
  attrs: AttrNode[] = [],
  children: ASTNode[] = [],
): ChannelDeclNode {
  return markup("channel", attrs, children) as ChannelDeclNode;
}

interface FileOpts {
  authConfig?: AuthConfig | null;
  channelDecls?: ChannelDeclNode[];
}

function file(filePath: string, nodes: ASTNode[], opts: FileOpts = {}): FileAST {
  return {
    filePath,
    nodes,
    imports: [],
    exports: [],
    components: [],
    typeDecls: [],
    channelDecls: opts.channelDecls,
    spans: {},
    hasProgramRoot: nodes.some((n) => n && (n as MarkupNode).tag === "program"),
    authConfig: opts.authConfig ?? null,
    middlewareConfig: null,
  };
}

const REQUIRED_AUTH: AuthConfig = {
  auth: "required",
  loginRedirect: "/login",
  csrf: "off",
  sessionExpiry: "1h",
};

const CODE = "W-AUTH-CONTENT-NOT-GATED";

function contentLints(errors: { code: string }[]): { code: string }[] {
  return errors.filter((e) => e.code === CODE);
}

// ---------------------------------------------------------------------------
// Fires WITH <auth role>
// ---------------------------------------------------------------------------

describe("W-AUTH-CONTENT-NOT-GATED — fires for <auth role> sites", () => {
  test("one <auth role=\"Owner\"> site → one W-AUTH-CONTENT-NOT-GATED warning (GITI-027 repro shape)", () => {
    // Mirrors the GITI-027 sidecar: a public <p> + an <auth role="Owner">
    // wrapping owner-only markup.
    const authBlock = markup("auth", [attr("role", "Owner")], [
      markup("button", [], []),
      markup("p", [attr("class", "secret")], []),
    ]);
    const program = markup("program", [], [
      markup("p", [], []),
      authBlock,
    ]);
    const f = file("/abs/repro.scrml", [program]);

    const { errors } = runAuthGraph([f], null);

    const lints = contentLints(errors);
    expect(lints).toHaveLength(1);
    const lint = lints[0]! as {
      code: string;
      severity: string;
      message: string;
      span: Span;
      filePath: string;
    };
    expect(lint.severity).toBe("warning");
    expect(lint.filePath).toBe("/abs/repro.scrml");
    expect(lint.message).toContain("Owner");
  });

  test("message is honest: does NOT claim --emit-per-route fixes the content leak", () => {
    const authBlock = markup("auth", [attr("role", "Admin")], []);
    const program = markup("program", [], [authBlock]);
    const f = file("/abs/honest.scrml", [program]);

    const { errors } = runAuthGraph([f], null);

    const lint = contentLints(errors)[0]! as { message: string };
    // Honest message contract: names the content leak, mentions BOTH the
    // mode caveat AND that per-route does not withhold content, and points
    // to server-side enforcement. Must NOT over-promise that a flag fixes it.
    expect(lint.message).toContain("NOT served HTML content");
    expect(lint.message).toContain("--emit-per-route");
    expect(lint.message).toContain("does NOT withhold HTML content");
    expect(lint.message).toContain("server-side");
    expect(lint.message).toContain("content secrecy");
    // Negative: it must never tell the adopter that --emit-per-route is the fix.
    expect(lint.message).not.toMatch(/--emit-per-route\s+(fixes|resolves|withholds)/i);
  });

  test("multiple <auth role> sites → one warning per site (anchored per gate)", () => {
    const a1 = markup("auth", [attr("role", "Owner")], []);
    const a2 = markup("auth", [attr("role", "Admin")], []);
    const program = markup("program", [], [a1, a2]);
    const f = file("/abs/multi.scrml", [program]);

    const { errors } = runAuthGraph([f], null);

    expect(contentLints(errors)).toHaveLength(2);
  });

  test("aggregates across files", () => {
    const fA = file("/abs/a.scrml", [
      markup("program", [], [markup("auth", [attr("role", "Owner")], [])]),
    ]);
    const fB = file("/abs/b.scrml", [
      markup("page", [], [markup("auth", [attr("role", "Editor")], [])]),
    ]);

    const { errors } = runAuthGraph([fA, fB], null);

    expect(contentLints(errors)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Silent WITHOUT <auth role> — no false positives
// ---------------------------------------------------------------------------

describe("W-AUTH-CONTENT-NOT-GATED — silent without <auth role>", () => {
  test("plain program, no auth surface → no content lint", () => {
    const program = markup("program", [], [markup("h1"), markup("p")]);
    const f = file("/abs/plain.scrml", [program]);

    const { errors } = runAuthGraph([f], null);

    expect(contentLints(errors)).toHaveLength(0);
  });

  test("<program auth=\"required\"> (request-boundary gate, no <auth role>) → no content lint", () => {
    const program = markup("program", [attr("auth", "required")]);
    const f = file("/abs/proga.scrml", [program], { authConfig: REQUIRED_AUTH });

    const { errors } = runAuthGraph([f], null);

    // program-auth is a request-boundary gate, not a content-subtree gate.
    expect(contentLints(errors)).toHaveLength(0);
  });

  test("<page auth=\"required\"> (no <auth role>) → no content lint", () => {
    const page = markup("page", [attr("auth", "required")]);
    const program = markup("program", [], [page]);
    const f = file("/abs/pagea.scrml", [program]);

    const { errors } = runAuthGraph([f], null);

    expect(contentLints(errors)).toHaveLength(0);
  });

  test("<channel auth=\"required\"> (no <auth role>) → no content lint", () => {
    const ch = channel([attr("name", "presence"), attr("auth", "required")]);
    const program = markup("program", [attr("auth", "required")], [ch]);
    const f = file("/abs/cha.scrml", [program], {
      authConfig: REQUIRED_AUTH,
      channelDecls: [ch],
    });

    const { errors } = runAuthGraph([f], null);

    expect(contentLints(errors)).toHaveLength(0);
  });

  test("bare <auth> with no role= and no check= → no content lint (malformed-gate path is E-AUTH-GRAPH-004's concern)", () => {
    const authBlock = markup("auth", [], []);
    const program = markup("program", [], [authBlock]);
    const f = file("/abs/bare.scrml", [program]);

    const { errors } = runAuthGraph([f], null);

    // No role= → no content-secrecy footgun signal from THIS lint.
    expect(contentLints(errors)).toHaveLength(0);
  });

  test("check-only <auth check=\"isOwner\"> with no role= → no content lint", () => {
    const authBlock = markup("auth", [attr("check", "isOwner")], []);
    const program = markup("program", [], [authBlock]);
    const f = file("/abs/checkonly.scrml", [program]);

    const { errors } = runAuthGraph([f], null);

    // The content-not-gated lint targets `role=`-bearing gates specifically.
    expect(contentLints(errors)).toHaveLength(0);
  });
});
